/**
 * Player Presence Service - Manages multi-player presence and real-time synchronization
 */

import {
  ref,
  onValue,
  onDisconnect,
  set,
  update,
  serverTimestamp,
  off,
  push
} from 'firebase/database';
import {
  doc,
  updateDoc,
  onSnapshot
  // arrayUnion,
  // arrayRemove,
  // Timestamp
} from 'firebase/firestore';
import { realtimeDb, firestore } from '../firebase/config';
import type { 
  TeamPlayer, 
  TeamPresence, 
  PlayerPresence, 
  // PlayerStatus,
  TeamPlayerRole
} from '../types/player.types';
import type { Colony } from '../types';

interface PresenceCallbacks {
  onPlayerJoin?: (player: TeamPlayer) => void;
  onPlayerLeave?: (playerId: string) => void;
  onPresenceUpdate?: (presence: TeamPresence) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export class PlayerPresenceService {
  private static instances: Map<string, PlayerPresenceService> = new Map();
  private sessionId: string;
  private teamId: string;
  private playerId: string;
  private userId: string;
  private callbacks: PresenceCallbacks;
  private presenceRef: any;
  private connectedRef: any;
  private listeners: (() => void)[] = [];
  private heartbeatInterval?: NodeJS.Timeout;

  private constructor(
    sessionId: string,
    teamId: string,
    playerId: string,
    userId: string,
    callbacks: PresenceCallbacks = {}
  ) {
    this.sessionId = sessionId;
    this.teamId = teamId;
    this.playerId = playerId;
    this.userId = userId;
    this.callbacks = callbacks;
  }

  /**
   * Get or create instance for a player
   */
  static getInstance(
    sessionId: string,
    teamId: string,
    playerId: string,
    userId: string,
    callbacks?: PresenceCallbacks
  ): PlayerPresenceService {
    const key = `${sessionId}-${teamId}-${playerId}`;
    if (!this.instances.has(key)) {
      this.instances.set(
        key,
        new PlayerPresenceService(sessionId, teamId, playerId, userId, callbacks || {})
      );
    }
    return this.instances.get(key)!;
  }

  /**
   * Initialize presence tracking
   */
  async initialize(playerName: string, role: TeamPlayerRole = 'member'): Promise<void> {
    try {
      // Create presence reference
      this.presenceRef = ref(
        realtimeDb,
        `sessions/${this.sessionId}/teams/${this.teamId}/presence/${this.playerId}`
      );

      // Monitor connection state
      this.connectedRef = ref(realtimeDb, '.info/connected');
      onValue(this.connectedRef, async (snapshot) => {
        if (snapshot.val() === true) {
          // Connected
          await this.setOnlineStatus(true, playerName, role);
          this.callbacks.onConnectionChange?.(true);
          
          // Set up disconnect handler
          onDisconnect(this.presenceRef).set({
            playerId: this.playerId,
            userId: this.userId,
            name: playerName,
            isOnline: false,
            isActive: false,
            lastActiveAt: serverTimestamp(),
            disconnectedAt: serverTimestamp()
          });
        } else {
          // Disconnected
          this.callbacks.onConnectionChange?.(false);
        }
      });

      // Monitor team presence
      this.monitorTeamPresence();

      // Start heartbeat
      this.startHeartbeat();

      // Update Firestore player status
      await this.updateFirestoreStatus(true);

    } catch (error) {
      console.error('Error initializing presence:', error);
      throw error;
    }
  }

  /**
   * Set online status
   */
  private async setOnlineStatus(
    isOnline: boolean, 
    playerName: string,
    role: TeamPlayerRole
  ): Promise<void> {
    const presence: PlayerPresence = {
      playerId: this.playerId,
      isOnline,
      isActive: isOnline,
      lastActiveAt: Date.now(),
      connectionId: push(ref(realtimeDb)).key || undefined
    };

    await set(this.presenceRef, {
      ...presence,
      userId: this.userId,
      name: playerName,
      role,
      device: this.detectDevice(),
      connectionStrength: 'strong'
    });
  }

  /**
   * Update player activity
   */
  async updateActivity(currentView?: string): Promise<void> {
    if (!this.presenceRef) return;

    await update(this.presenceRef, {
      isActive: true,
      lastActiveAt: serverTimestamp(),
      currentView
    });
  }

  /**
   * Monitor team presence
   */
  private monitorTeamPresence(): void {
    const teamPresenceRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/presence`
    );

    onValue(teamPresenceRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const presenceData = snapshot.val();
      const players: PlayerPresence[] = Object.values(presenceData);

      const teamPresence: TeamPresence = {
        teamId: this.teamId,
        onlinePlayerCount: players.filter(p => p.isOnline).length,
        activePlayerCount: players.filter(p => p.isActive).length,
        players,
        lastActivity: Math.max(...players.map(p => p.lastActiveAt || 0)),
        teamStatus: this.calculateTeamStatus(players)
      };

      this.callbacks.onPresenceUpdate?.(teamPresence);
    });

    this.listeners.push(() => off(teamPresenceRef));
  }

  /**
   * Calculate team status based on player activity
   */
  private calculateTeamStatus(players: PlayerPresence[]): 'active' | 'idle' | 'inactive' {
    const activePlayers = players.filter(p => p.isActive).length;
    const onlinePlayers = players.filter(p => p.isOnline).length;
    
    if (activePlayers > 0) return 'active';
    if (onlinePlayers > 0) return 'idle';
    return 'inactive';
  }

  /**
   * Start heartbeat to maintain presence
   */
  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateActivity();
    }, 30000);
  }

  /**
   * Update Firestore player status
   */
  private async updateFirestoreStatus(isOnline: boolean): Promise<void> {
    try {
      const sessionRef = doc(firestore, 'sessions', this.sessionId);
      const sessionSnapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(sessionRef, (doc) => {
          unsubscribe();
          resolve(doc);
        });
      });

      if (!sessionSnapshot.exists()) return;

      const sessionData = sessionSnapshot.data();
      const teams = sessionData.teams || [];
      const teamIndex = teams.findIndex((t: Colony) => t.id === this.teamId);
      
      if (teamIndex === -1) return;

      const team = teams[teamIndex];
      const playerIndex = team.players.findIndex((p: any) => p.id === this.playerId);
      
      if (playerIndex !== -1) {
        team.players[playerIndex].isOnline = isOnline;
        team.players[playerIndex].lastSeen = Date.now();
        
        await updateDoc(sessionRef, { teams });
      }
    } catch (error) {
      console.error('Error updating Firestore status:', error);
    }
  }

  /**
   * Get current team presence
   */
  async getTeamPresence(): Promise<TeamPresence | null> {
    try {
      const teamPresenceRef = ref(
        realtimeDb,
        `sessions/${this.sessionId}/teams/${this.teamId}/presence`
      );

      const snapshot = await new Promise<any>((resolve) => {
        onValue(teamPresenceRef, (snap) => resolve(snap), { onlyOnce: true });
      });

      if (!snapshot.exists()) return null;

      const presenceData = snapshot.val();
      const players: PlayerPresence[] = Object.values(presenceData);
      
      return {
        teamId: this.teamId,
        onlinePlayerCount: players.filter(p => p.isOnline).length,
        activePlayerCount: players.filter(p => p.isActive).length,
        players,
        lastActivity: Math.max(...players.map(p => p.lastActiveAt || 0)),
        teamStatus: this.calculateTeamStatus(players)
      };
    } catch (error) {
      console.error('Error getting team presence:', error);
      return null;
    }
  }

  /**
   * Detect device type
   */
  private detectDevice(): 'desktop' | 'tablet' | 'mobile' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  /**
   * Set player as inactive
   */
  async setInactive(): Promise<void> {
    if (!this.presenceRef) return;

    await update(this.presenceRef, {
      isActive: false,
      lastActiveAt: serverTimestamp()
    });
  }

  /**
   * Clean up presence tracking
   */
  async destroy(): Promise<void> {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Set offline status
    if (this.presenceRef) {
      await set(this.presenceRef, {
        playerId: this.playerId,
        userId: this.userId,
        isOnline: false,
        isActive: false,
        lastActiveAt: serverTimestamp(),
        disconnectedAt: serverTimestamp()
      });
    }

    // Update Firestore status
    await this.updateFirestoreStatus(false);

    // Remove listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];

    // Remove from instances
    const key = `${this.sessionId}-${this.teamId}-${this.playerId}`;
    PlayerPresenceService.instances.delete(key);
  }

  /**
   * Monitor specific player
   */
  monitorPlayer(targetPlayerId: string, callback: (presence: PlayerPresence | null) => void): () => void {
    const playerRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/presence/${targetPlayerId}`
    );

    onValue(playerRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    });

    return () => off(playerRef);
  }

  /**
   * Get all online players in session
   */
  async getSessionPlayers(): Promise<Map<string, PlayerPresence[]>> {
    const sessionRef = ref(realtimeDb, `sessions/${this.sessionId}/teams`);
    const snapshot = await new Promise<any>((resolve) => {
      onValue(sessionRef, (snap) => resolve(snap), { onlyOnce: true });
    });

    const result = new Map<string, PlayerPresence[]>();
    
    if (snapshot.exists()) {
      const teamsData = snapshot.val();
      for (const [teamId, teamData] of Object.entries(teamsData as any)) {
        if ((teamData as any).presence) {
          result.set(teamId, Object.values((teamData as any).presence));
        }
      }
    }

    return result;
  }
}