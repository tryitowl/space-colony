/**
 * Multi-Player Trading Service - Enhanced trading with team decision support
 */

import { TradingService } from './tradingService';
import { TeamDecisionService } from './teamDecisionService';
import { TeamSyncService } from './teamSyncService';
import { TeamChatService } from './teamChatService';
import type { 
  TradeOffer, 
  Resources, 
  IntelItem,
  GameSession
} from '../types';
import type { 
  TeamPlayer,
  TradeDecision,
  TeamDecisionConfig
} from '../types/player.types';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

export class MultiPlayerTradingService extends TradingService {
  // Store pending trade details for later creation
  private static pendingTrades = new Map<string, {
    sessionId: string;
    initiatorTeamId: string;
    targetTeamId: string;
    offerResources: Partial<Resources>;
    requestResources: Partial<Resources>;
    offerIntel?: IntelItem[];
    requestIntel?: IntelItem[];
    proposedBy: TeamPlayer;
  }>();

  /**
   * Create a trade offer with team decision support
   */
  static async createTradeOfferWithApproval(
    sessionId: string,
    initiatorTeamId: string,
    targetTeamId: string,
    offerResources: Partial<Resources>,
    requestResources: Partial<Resources>,
    proposedBy: TeamPlayer,
    offerIntel?: IntelItem[],
    requestIntel?: IntelItem[]
  ): Promise<string> {
    // Get team decision config
    const decisionService = TeamDecisionService.getInstance(sessionId, initiatorTeamId);
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if team decision is required
    if (session.settings?.decisionMode && session.settings.decisionMode !== 'any') {
      // Create temporary trade for approval
      const tempTradeId = `temp_trade_${Date.now()}`;
      const tempTrade: TradeOffer = {
        id: tempTradeId,
        initiatorId: initiatorTeamId,
        targetId: targetTeamId,
        offerResources,
        requestResources,
        offerIntel: offerIntel || [],
        requestIntel: requestIntel || [],
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + (session.settings.decisionVotingTimeout || 60000),
        negotiationHistory: []
      };

      // Store trade details for later creation
      this.pendingTrades.set(tempTradeId, {
        sessionId,
        initiatorTeamId,
        targetTeamId,
        offerResources,
        requestResources,
        offerIntel,
        requestIntel,
        proposedBy
      });

      // Create decision
      const decision = await decisionService.createTradeDecision(
        tempTrade,
        proposedBy,
        'accept' // Proposing to accept this trade creation
      );

      // If not auto-approved, wait for decision
      if (decision.status === 'voting' || decision.status === 'pending') {
        // Return temp ID and monitor for approval
        this.monitorTradeDecision(sessionId, initiatorTeamId, tempTradeId, decision);
        return tempTradeId;
      }
    }

    // Direct creation if approved or no approval needed
    const tradeId = await super.createTradeOffer(
      sessionId,
      initiatorTeamId,
      targetTeamId,
      offerResources,
      requestResources,
      offerIntel,
      requestIntel
    );

    // Log activity
    const chatService = TeamChatService.getInstance(sessionId, initiatorTeamId);
    await chatService.sendTradeMessage(
      proposedBy.id,
      proposedBy.name,
      tradeId,
      'proposed',
      targetTeamId
    );

    return tradeId;
  }

  /**
   * Accept trade with team approval
   */
  static async acceptTradeOfferWithApproval(
    sessionId: string,
    tradeId: string,
    acceptingTeamId: string,
    acceptedBy: TeamPlayer
  ): Promise<boolean> {
    const trade = await this.getTradeDetails(sessionId, tradeId);
    if (!trade) {
      throw new Error('Trade not found');
    }

    // Get team decision config
    const decisionService = TeamDecisionService.getInstance(sessionId, acceptingTeamId);
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if team decision is required
    if (session.settings?.decisionMode && session.settings.decisionMode !== 'any') {
      // Create decision
      const decision = await decisionService.createTradeDecision(
        trade,
        acceptedBy,
        'accept'
      );

      // If not auto-approved, wait for decision
      if (decision.status === 'voting' || decision.status === 'pending') {
        // Monitor for approval
        this.monitorAcceptDecision(sessionId, acceptingTeamId, tradeId, decision);
        return false; // Pending approval
      }
    }

    // Use sync service to ensure atomic update
    const syncService = TeamSyncService.getInstance(
      sessionId,
      acceptingTeamId,
      acceptedBy.id
    );

    // Validate resources before accepting
    const validation = await this.validateTradeWithSync(
      sessionId,
      acceptingTeamId,
      trade,
      syncService
    );

    if (!validation.canExecute) {
      throw new Error(`Cannot execute trade: ${validation.reason}`);
    }

    // Execute trade
    const success = await super.acceptTradeOffer(sessionId, tradeId, acceptingTeamId);

    if (success) {
      // Log activity
      const chatService = TeamChatService.getInstance(sessionId, acceptingTeamId);
      await chatService.sendTradeMessage(
        acceptedBy.id,
        acceptedBy.name,
        tradeId,
        'accepted',
        trade.initiatorId
      );

      // Update resources with sync
      await this.executeTradeWithSync(sessionId, trade, syncService);
    }

    return success;
  }

  /**
   * Reject trade with logging
   */
  static async rejectTradeOfferWithLogging(
    sessionId: string,
    tradeId: string,
    rejectingTeamId: string,
    rejectedBy: TeamPlayer
  ): Promise<void> {
    const trade = await this.getTradeDetails(sessionId, tradeId);
    
    await super.rejectTradeOffer(sessionId, tradeId, rejectingTeamId);

    // Log activity
    const chatService = TeamChatService.getInstance(sessionId, rejectingTeamId);
    await chatService.sendTradeMessage(
      rejectedBy.id,
      rejectedBy.name,
      tradeId,
      'rejected',
      trade?.initiatorId
    );
  }

  /**
   * Monitor trade decision
   */
  private static monitorTradeDecision(
    sessionId: string,
    teamId: string,
    tempTradeId: string,
    decision: TradeDecision
  ): void {
    const decisionService = TeamDecisionService.getInstance(sessionId, teamId);
    
    // Set up monitoring for decision resolution
    const checkDecision = setInterval(async () => {
      const currentDecision = await decisionService.getActiveDecision(tempTradeId);
      
      if (!currentDecision || currentDecision.status === 'approved') {
        clearInterval(checkDecision);
        
        if (currentDecision?.status === 'approved') {
          // Get stored trade details
          const pendingTrade = this.pendingTrades.get(tempTradeId);
          
          if (pendingTrade) {
            try {
              // Create actual trade
              const actualTradeId = await super.createTradeOffer(
                pendingTrade.sessionId,
                pendingTrade.initiatorTeamId,
                pendingTrade.targetTeamId,
                pendingTrade.offerResources,
                pendingTrade.requestResources,
                pendingTrade.offerIntel,
                pendingTrade.requestIntel
              );
              
              // Log activity
              const chatService = TeamChatService.getInstance(
                pendingTrade.sessionId, 
                pendingTrade.initiatorTeamId
              );
              await chatService.sendTradeMessage(
                pendingTrade.proposedBy.id,
                pendingTrade.proposedBy.name,
                actualTradeId,
                'accepted',
                pendingTrade.targetTeamId
              );
              
              console.log(`Trade approved and created: ${actualTradeId}`);
            } catch (error) {
              console.error('Failed to create approved trade:', error);
            } finally {
              // Clean up pending trade
              this.pendingTrades.delete(tempTradeId);
            }
          }
        } else {
          // Clean up on rejection
          this.pendingTrades.delete(tempTradeId);
        }
      } else if (currentDecision.status === 'rejected' || currentDecision.status === 'expired') {
        clearInterval(checkDecision);
        console.log('Trade rejected or expired');
        // Clean up pending trade
        this.pendingTrades.delete(tempTradeId);
      }
    }, 2000); // Check every 2 seconds

    // Clean up after timeout
    setTimeout(() => {
      clearInterval(checkDecision);
      // Clean up any remaining pending trade
      this.pendingTrades.delete(tempTradeId);
    }, decision.expiresAt - Date.now() + 5000);
  }

  /**
   * Monitor accept decision
   */
  private static monitorAcceptDecision(
    sessionId: string,
    teamId: string,
    tradeId: string,
    decision: TradeDecision
  ): void {
    const decisionService = TeamDecisionService.getInstance(sessionId, teamId);
    
    const checkDecision = setInterval(async () => {
      const currentDecision = await decisionService.getActiveDecision(tradeId);
      
      if (!currentDecision || currentDecision.status === 'approved') {
        clearInterval(checkDecision);
        
        if (currentDecision?.status === 'approved') {
          // Execute the actual acceptance
          await super.acceptTradeOffer(sessionId, tradeId, teamId);
        }
      } else if (currentDecision.status === 'rejected' || currentDecision.status === 'expired') {
        clearInterval(checkDecision);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(checkDecision);
    }, decision.expiresAt - Date.now() + 5000);
  }

  /**
   * Validate trade with sync service
   */
  private static async validateTradeWithSync(
    sessionId: string,
    teamId: string,
    trade: TradeOffer,
    syncService: TeamSyncService
  ): Promise<{ canExecute: boolean; reason?: string }> {
    // Get current team resources
    const session = await this.getSession(sessionId);
    if (!session) {
      return { canExecute: false, reason: 'Session not found' };
    }

    const team = session.teams.find(t => t.id === teamId);
    if (!team) {
      return { canExecute: false, reason: 'Team not found' };
    }

    // Check if we're the initiator or target
    const isInitiator = trade.initiatorId === teamId;
    const resourcesToGive = isInitiator ? trade.offerResources : trade.requestResources;

    // Validate we have enough resources
    for (const [resource, amount] of Object.entries(resourcesToGive)) {
      if (typeof amount === 'number' && amount > 0) {
        const currentAmount = (team.resources as any)[resource] || 0;
        if (currentAmount < amount) {
          return { 
            canExecute: false, 
            reason: `Insufficient ${resource}: have ${currentAmount}, need ${amount}` 
          };
        }
      }
    }

    return { canExecute: true };
  }

  /**
   * Execute trade with sync
   */
  private static async executeTradeWithSync(
    sessionId: string,
    trade: TradeOffer,
    syncService: TeamSyncService
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Calculate resource changes for initiator
    const initiatorChanges: Partial<Resources> = {};
    const targetChanges: Partial<Resources> = {};

    // Initiator gives offer, receives request
    for (const [resource, amount] of Object.entries(trade.offerResources)) {
      if (typeof amount === 'number') {
        initiatorChanges[resource as keyof Resources] = -amount as any;
        targetChanges[resource as keyof Resources] = amount as any;
      }
    }

    for (const [resource, amount] of Object.entries(trade.requestResources)) {
      if (typeof amount === 'number') {
        const key = resource as keyof Resources;
        // Only modify numeric resources
        if (key !== 'marketIntel' && key !== 'surveyReports' && key !== 'crisisWarnings' && key !== 'intel') {
          (initiatorChanges[key] as number) =
            ((initiatorChanges[key] as any) || 0) + amount;
          (targetChanges[key] as number) =
            ((targetChanges[key] as any) || 0) - amount;
        }
      }
    }

    // Update resources with sync
    await syncService.updateResources(initiatorChanges, 'trade');
    
    // Create sync service for target team if needed
    const targetSyncService = TeamSyncService.getInstance(
      sessionId,
      trade.targetId,
      'system'
    );
    await targetSyncService.updateResources(targetChanges, 'trade');
  }

  /**
   * Get trade details
   */
  private static async getTradeDetails(
    sessionId: string,
    tradeId: string
  ): Promise<TradeOffer | null> {
    try {
      const tradeDoc = await getDoc(
        doc(firestore, 'sessions', sessionId, 'trades', tradeId)
      );
      
      if (tradeDoc.exists()) {
        return tradeDoc.data() as TradeOffer;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting trade details:', error);
      return null;
    }
  }

  /**
   * Get session
   */
  private static async getSession(sessionId: string): Promise<GameSession | null> {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'sessions', sessionId));
      return sessionDoc.exists() ? sessionDoc.data() as GameSession : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get active trades for all team members
   */
  static async getTeamActiveTrades(
    sessionId: string,
    teamId: string
  ): Promise<TradeOffer[]> {
    // This would query all trades where the team is involved
    // Implementation would use Firestore queries
    return [];
  }

  /**
   * Cancel pending trade (by team captain or timeout)
   */
  static async cancelPendingTrade(
    sessionId: string,
    tradeId: string,
    teamId: string,
    cancelledBy: TeamPlayer
  ): Promise<void> {
    // Check permissions
    if (cancelledBy.role !== 'captain' && cancelledBy.role !== 'trader') {
      throw new Error('Insufficient permissions to cancel trade');
    }

    await this.rejectTradeOfferWithLogging(
      sessionId,
      tradeId,
      teamId,
      cancelledBy
    );
  }
}