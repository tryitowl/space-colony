/**
 * Team Decision Service - Manages multi-player decision making and voting
 */

import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  TeamDecisionConfig,
  TradeDecision,
  PlayerVote,
  DecisionStatus,
  TeamPlayer
} from '../types/player.types';
import type { TradeOffer } from '../types';
import { PlayerPresenceService } from './playerPresenceService';

interface DecisionCallbacks {
  onDecisionCreated?: (decision: TradeDecision) => void;
  onVoteReceived?: (decision: TradeDecision, vote: PlayerVote) => void;
  onDecisionResolved?: (decision: TradeDecision) => void;
  onDecisionExpired?: (decision: TradeDecision) => void;
}

export class TeamDecisionService {
  private static instances: Map<string, TeamDecisionService> = new Map();
  private sessionId: string;
  private teamId: string;
  private config: TeamDecisionConfig;
  private callbacks: DecisionCallbacks;
  private listeners: (() => void)[] = [];
  private expirationTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor(
    sessionId: string,
    teamId: string,
    config: TeamDecisionConfig,
    callbacks: DecisionCallbacks = {}
  ) {
    this.sessionId = sessionId;
    this.teamId = teamId;
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Get or create instance for a team
   */
  static getInstance(
    sessionId: string,
    teamId: string,
    config?: TeamDecisionConfig,
    callbacks?: DecisionCallbacks
  ): TeamDecisionService {
    const key = `${sessionId}-${teamId}`;
    if (!this.instances.has(key)) {
      const defaultConfig: TeamDecisionConfig = {
        mode: 'consensus',
        votingTimeout: 60000, // 1 minute default
        requireQuorum: true,
        quorumPercentage: 51,
        captainOverride: true,
        autoAcceptTimeout: undefined
      };
      
      this.instances.set(
        key,
        new TeamDecisionService(sessionId, teamId, config || defaultConfig, callbacks || {})
      );
    }
    return this.instances.get(key)!;
  }

  /**
   * Initialize decision service
   */
  async initialize(): Promise<void> {
    // Monitor active decisions
    this.monitorDecisions();
    
    // Load team configuration
    await this.loadTeamConfig();
  }

  /**
   * Create a trade decision
   */
  async createTradeDecision(
    trade: TradeOffer,
    proposedBy: TeamPlayer,
    action: 'accept' | 'reject' | 'counter'
  ): Promise<TradeDecision> {
    // Check if decision already exists
    const existingDecision = await this.getActiveDecision(trade.id);
    if (existingDecision) {
      throw new Error('Decision already exists for this trade');
    }

    // Create decision based on mode
    const decision: TradeDecision = {
      tradeId: trade.id,
      teamId: this.teamId,
      proposedBy: proposedBy.id,
      proposedAt: Date.now(),
      expiresAt: Date.now() + this.config.votingTimeout,
      status: this.getInitialStatus(),
      votes: [],
      finalDecision: undefined
    };

    // If mode is 'any' or proposer is captain in captain mode, auto-approve
    if (this.config.mode === 'any' || 
        (this.config.mode === 'captain' && proposedBy.role === 'captain')) {
      decision.status = 'approved';
      decision.finalDecision = action;
      decision.decidedBy = proposedBy.id;
      decision.decidedAt = Date.now();
    } else {
      // Add proposer's vote
      decision.votes.push({
        playerId: proposedBy.id,
        vote: action === 'reject' ? 'reject' : 'accept',
        votedAt: Date.now()
      });
    }

    // Save decision
    const decisionRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'decisions',
      `${this.teamId}_${trade.id}`
    );
    
    await setDoc(decisionRef, decision);

    // Set expiration timer
    if (decision.status === 'pending' || decision.status === 'voting') {
      this.setExpirationTimer(decision);
    }

    this.callbacks.onDecisionCreated?.(decision);
    
    return decision;
  }

  /**
   * Vote on a decision
   */
  async voteOnDecision(
    tradeId: string,
    player: TeamPlayer,
    vote: 'accept' | 'reject' | 'abstain',
    comment?: string
  ): Promise<TradeDecision> {
    const decisionRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'decisions',
      `${this.teamId}_${tradeId}`
    );

    // Get current decision
    const decision = await this.getActiveDecision(tradeId);
    if (!decision) {
      throw new Error('Decision not found');
    }

    if (decision.status !== 'voting' && decision.status !== 'pending') {
      throw new Error('Decision is no longer active');
    }

    // Check if player already voted
    const existingVoteIndex = decision.votes.findIndex(v => v.playerId === player.id);
    
    const playerVote: PlayerVote = {
      playerId: player.id,
      vote,
      votedAt: Date.now(),
      comment
    };

    if (existingVoteIndex >= 0) {
      // Update existing vote
      decision.votes[existingVoteIndex] = playerVote;
    } else {
      // Add new vote
      decision.votes.push(playerVote);
    }

    // Check if captain override
    if (this.config.captainOverride && player.role === 'captain') {
      decision.status = 'overridden';
      decision.finalDecision = vote === 'accept' ? 'accept' : 'reject';
      decision.decidedBy = player.id;
      decision.decidedAt = Date.now();
      decision.decisionReason = 'Captain override';
    } else {
      // Check if we have enough votes
      const result = await this.evaluateVotes(decision);
      if (result.decided) {
        decision.status = result.approved ? 'approved' : 'rejected';
        decision.finalDecision = result.approved ? 'accept' : 'reject';
        decision.decidedAt = Date.now();
        decision.decisionReason = result.reason;
      }
    }

    // Update decision
    await updateDoc(decisionRef, decision as any);

    this.callbacks.onVoteReceived?.(decision, playerVote);

    if (decision.status === 'approved' || decision.status === 'rejected' || decision.status === 'overridden') {
      this.clearExpirationTimer(decision.tradeId);
      this.callbacks.onDecisionResolved?.(decision);
    }

    return decision;
  }

  /**
   * Evaluate votes to determine outcome
   */
  private async evaluateVotes(
    decision: TradeDecision
  ): Promise<{ decided: boolean; approved: boolean; reason: string }> {
    // Get active players
    const presence = await PlayerPresenceService
      .getInstance(this.sessionId, this.teamId, '', '')
      .getTeamPresence();
    
    const activePlayerCount = presence?.activePlayerCount || 1;
    const totalVotes = decision.votes.length;
    const acceptVotes = decision.votes.filter(v => v.vote === 'accept').length;
    const rejectVotes = decision.votes.filter(v => v.vote === 'reject').length;

    switch (this.config.mode) {
      case 'consensus':
        // Check quorum
        if (this.config.requireQuorum) {
          const quorumMet = (totalVotes / activePlayerCount) * 100 >= this.config.quorumPercentage;
          if (!quorumMet) {
            return { decided: false, approved: false, reason: 'Quorum not met' };
          }
        }
        
        // Majority wins
        if (acceptVotes > rejectVotes) {
          return { decided: true, approved: true, reason: 'Majority approved' };
        } else if (rejectVotes > acceptVotes) {
          return { decided: true, approved: false, reason: 'Majority rejected' };
        }
        break;

      case 'unanimous':
        // All active players must vote
        if (totalVotes < activePlayerCount) {
          return { decided: false, approved: false, reason: 'Waiting for all votes' };
        }
        
        // All must accept
        if (acceptVotes === activePlayerCount) {
          return { decided: true, approved: true, reason: 'Unanimous approval' };
        } else if (rejectVotes > 0) {
          return { decided: true, approved: false, reason: 'Not unanimous' };
        }
        break;

      case 'captain':
        // Captain's vote decides (should be handled in vote method)
        const captainVote = decision.votes.find(_v => {
          // Would need to check player role here
          return false; // Placeholder
        });
        if (captainVote) {
          return { 
            decided: true, 
            approved: captainVote.vote === 'accept', 
            reason: 'Captain decided' 
          };
        }
        break;
    }

    return { decided: false, approved: false, reason: 'Voting in progress' };
  }

  /**
   * Get initial status based on mode
   */
  private getInitialStatus(): DecisionStatus {
    switch (this.config.mode) {
      case 'any':
        return 'approved';
      case 'captain':
        return 'pending';
      default:
        return 'voting';
    }
  }

  /**
   * Monitor active decisions
   */
  private monitorDecisions(): void {
    const decisionsQuery = query(
      collection(firestore, 'sessions', this.sessionId, 'decisions'),
      where('teamId', '==', this.teamId),
      where('status', 'in', ['pending', 'voting']),
      orderBy('proposedAt', 'desc')
    );

    const unsubscribe = onSnapshot(decisionsQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const decision = change.doc.data() as TradeDecision;
        
        if (change.type === 'added' || change.type === 'modified') {
          // Reset expiration timer
          this.clearExpirationTimer(decision.tradeId);
          if (decision.status === 'pending' || decision.status === 'voting') {
            this.setExpirationTimer(decision);
          }
        }
      });
    });

    this.listeners.push(unsubscribe);
  }

  /**
   * Set expiration timer for a decision
   */
  private setExpirationTimer(decision: TradeDecision): void {
    const timeRemaining = decision.expiresAt - Date.now();
    if (timeRemaining <= 0) {
      this.expireDecision(decision);
      return;
    }

    const timer = setTimeout(() => {
      this.expireDecision(decision);
    }, timeRemaining);

    this.expirationTimers.set(decision.tradeId, timer);
  }

  /**
   * Clear expiration timer
   */
  private clearExpirationTimer(tradeId: string): void {
    const timer = this.expirationTimers.get(tradeId);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(tradeId);
    }
  }

  /**
   * Expire a decision
   */
  private async expireDecision(decision: TradeDecision): Promise<void> {
    const decisionRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'decisions',
      `${this.teamId}_${decision.tradeId}`
    );

    // Check auto-accept
    if (this.config.autoAcceptTimeout && 
        Date.now() >= decision.proposedAt + this.config.autoAcceptTimeout) {
      decision.status = 'approved';
      decision.finalDecision = 'accept';
      decision.decidedAt = Date.now();
      decision.decisionReason = 'Auto-accepted after timeout';
    } else {
      decision.status = 'expired';
      decision.decisionReason = 'Voting timeout';
    }

    await updateDoc(decisionRef, decision as any);
    
    this.clearExpirationTimer(decision.tradeId);
    this.callbacks.onDecisionExpired?.(decision);
  }

  /**
   * Get active decision for a trade
   */
  async getActiveDecision(tradeId: string): Promise<TradeDecision | null> {
    const decisionRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'decisions',
      `${this.teamId}_${tradeId}`
    );

    const snapshot = await new Promise<any>((resolve) => {
      const unsubscribe = onSnapshot(decisionRef, (doc) => {
        unsubscribe();
        resolve(doc);
      });
    });

    if (!snapshot.exists()) return null;

    const decision = snapshot.data() as TradeDecision;
    if (decision.status === 'pending' || decision.status === 'voting') {
      return decision;
    }

    return null;
  }

  /**
   * Update team configuration
   */
  async updateConfig(newConfig: Partial<TeamDecisionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to Firestore
    const configRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'teamConfigs',
      this.teamId
    );
    
    await setDoc(configRef, this.config);
  }

  /**
   * Load team configuration
   */
  private async loadTeamConfig(): Promise<void> {
    const configRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'teamConfigs',
      this.teamId
    );

    const unsubscribe = onSnapshot(configRef, (doc) => {
      if (doc.exists()) {
        this.config = doc.data() as TeamDecisionConfig;
      }
    });

    this.listeners.push(unsubscribe);
  }

  /**
   * Get decision history
   */
  async getDecisionHistory(limit: number = 50): Promise<TradeDecision[]> {
    const decisionsQuery = query(
      collection(firestore, 'sessions', this.sessionId, 'decisions'),
      where('teamId', '==', this.teamId),
      orderBy('proposedAt', 'desc')
    );

    const snapshot = await new Promise<any>((resolve) => {
      const unsubscribe = onSnapshot(decisionsQuery, (snap) => {
        unsubscribe();
        resolve(snap);
      });
    });

    const decisions: TradeDecision[] = [];
    snapshot.forEach((doc: any) => {
      decisions.push(doc.data());
    });

    return decisions.slice(0, limit);
  }

  /**
   * Cancel active decision
   */
  async cancelDecision(tradeId: string, cancelledBy: string): Promise<void> {
    const decisionRef = doc(
      firestore,
      'sessions',
      this.sessionId,
      'decisions',
      `${this.teamId}_${tradeId}`
    );

    const decision = await this.getActiveDecision(tradeId);
    if (!decision) return;

    decision.status = 'rejected';
    decision.decidedBy = cancelledBy;
    decision.decidedAt = Date.now();
    decision.decisionReason = 'Cancelled by team member';

    await updateDoc(decisionRef, decision as any);
    
    this.clearExpirationTimer(tradeId);
  }

  /**
   * Clean up service
   */
  destroy(): void {
    // Clear all timers
    this.expirationTimers.forEach(timer => clearTimeout(timer));
    this.expirationTimers.clear();

    // Remove listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];

    // Remove from instances
    const key = `${this.sessionId}-${this.teamId}`;
    TeamDecisionService.instances.delete(key);
  }
}