/**
 * Optimized Player Presence Service - Reduces Firestore writes and improves performance
 */

import { 
  ref, 
  onValue, 
  onDisconnect, 
  set, 
  update,
  serverTimestamp,
  off
} from 'firebase/database';
import { 
  doc, 
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { realtimeDb, firestore } from '../firebase/config';
import type { 
  TeamPlayer, 
  TeamPresence, 
  PlayerPresence, 
  TeamPlayerRole
} from '../types/player.types';

interface PresenceCallbacks {
  onPlayerJoin?: (player: TeamPlayer) => void;
  onPlayerLeave?: (playerId: string) => void;
  onPresenceUpdate?: (presence: TeamPresence) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

interface BatchUpdate {
  teamId: string;
  playerId: string;
  isOnline: boolean;
  lastSeen: number;
}

export class OptimizedPlayerPresenceService {
  private static instances: Map<string, OptimizedPlayerPresenceService> = new Map();
  private static batchQueue: BatchUpdate[] = [];
  private static batchTimeout?: NodeJS.Timeout;
  private static readonly BATCH_DELAY = 1000; // 1 second
  private static readonly BATCH_SIZE = 10;
  private static readonly HEARTBEAT_INTERVAL = 60000; // 60 seconds (increased from 30)
  
  private sessionId: string;
  private teamId: string;
  private playerId: string;
  private userId: string;
  private callbacks: PresenceCallbacks;
  private presenceRef: any;
  private connectedRef: any;
  private listeners: (() => void)[] = [];
  private heartbeatInterval?: NodeJS.Timeout;
  private lastActivityUpdate: number = 0;
  private readonly ACTIVITY_DEBOUNCE = 5000; // 5 seconds

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
  ): OptimizedPlayerPresenceService {
    const key = `${sessionId}-${teamId}-${playerId}`;
    if (!this.instances.has(key)) {
      this.instances.set(
        key,
        new OptimizedPlayerPresenceService(sessionId, teamId, playerId, userId, callbacks || {})
      );
    }
    return this.instances.get(key)!;
  }

  /**
   * Initialize presence tracking - Optimized to use Realtime Database only
   */
  async initialize(playerName: string, role: TeamPlayerRole = 'member'): Promise<void> {
    try {
      // Use Realtime Database for presence (much cheaper than Firestore)
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

      // Start optimized heartbeat
      this.startHeartbeat();

      // Queue Firestore update instead of immediate write
      this.queueFirestoreUpdate(true);

    } catch (error) {
      console.error('Error initializing presence:', error);
      throw error;
    }
  }

  /**
   * Queue Firestore update for batch processing
   */
  private queueFirestoreUpdate(isOnline: boolean): void {
    OptimizedPlayerPresenceService.batchQueue.push({
      teamId: this.teamId,
      playerId: this.playerId,
      isOnline,
      lastSeen: Date.now()
    });

    // Process batch if size limit reached
    if (OptimizedPlayerPresenceService.batchQueue.length >= OptimizedPlayerPresenceService.BATCH_SIZE) {
      this.processBatch();
    } else {
      // Schedule batch processing
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Schedule batch processing with debouncing
   */
  private scheduleBatchProcessing(): void {
    if (OptimizedPlayerPresenceService.batchTimeout) {
      clearTimeout(OptimizedPlayerPresenceService.batchTimeout);
    }

    OptimizedPlayerPresenceService.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, OptimizedPlayerPresenceService.BATCH_DELAY);
  }

  /**
   * Process batched Firestore updates
   */
  private async processBatch(): Promise<void> {
    if (OptimizedPlayerPresenceService.batchQueue.length === 0) return;

    const updates = [...OptimizedPlayerPresenceService.batchQueue];
    OptimizedPlayerPresenceService.batchQueue = [];

    try {
      const batch = writeBatch(firestore);
      
      // Group updates by session
      const sessionUpdates = new Map<string, BatchUpdate[]>();
      updates.forEach(update => {
        if (!sessionUpdates.has(this.sessionId)) {
          sessionUpdates.set(this.sessionId, []);
        }
        sessionUpdates.get(this.sessionId)!.push(update);
      });

      // Process each session's updates
      for (const [sessionId, sessionBatch] of sessionUpdates) {
        const sessionRef = doc(firestore, 'sessions', sessionId);
        
        // Use a more efficient update approach
        const updateData: any = {};
        sessionBatch.forEach(update => {
          // Use field paths to update specific array elements
          updateData[`presence.${update.teamId}.${update.playerId}`] = {
            isOnline: update.isOnline,
            lastSeen: update.lastSeen
          };
        });

        batch.update(sessionRef, updateData);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error processing presence batch:', error);
      // Re-queue failed updates
      OptimizedPlayerPresenceService.batchQueue.push(...updates);
    }
  }

  /**
   * Update player activity with debouncing
   */
  async updateActivity(currentView?: string): Promise<void> {
    const now = Date.now();
    
    // Debounce activity updates
    if (now - this.lastActivityUpdate < this.ACTIVITY_DEBOUNCE) {
      return;
    }

    this.lastActivityUpdate = now;

    if (!this.presenceRef) return;

    // Only update Realtime Database (not Firestore)
    await update(this.presenceRef, {
      isActive: true,
      lastActiveAt: serverTimestamp(),
      currentView
    });
  }

  /**
   * Start optimized heartbeat
   */
  private startHeartbeat(): void {
    // Increased interval to reduce writes
    this.heartbeatInterval = setInterval(() => {
      this.updateActivity();
    }, OptimizedPlayerPresenceService.HEARTBEAT_INTERVAL);
  }

  /**
   * Set online status - Realtime Database only
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
      connectionId: Date.now().toString() // Simpler connection ID
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
   * Monitor team presence with optimized listeners
   */
  private monitorTeamPresence(): void {
    const teamPresenceRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/presence`
    );

    // Use value events sparingly
    const unsubscribe = onValue(teamPresenceRef, (snapshot) => {
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
   * Calculate team status
   */
  private calculateTeamStatus(players: PlayerPresence[]): 'active' | 'idle' | 'inactive' {
    const activePlayers = players.filter(p => p.isActive).length;
    const onlinePlayers = players.filter(p => p.isOnline).length;
    
    if (activePlayers > 0) return 'active';
    if (onlinePlayers > 0) return 'idle';
    return 'inactive';
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
   * Clean up presence tracking
   */
  async destroy(): Promise<void> {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Set offline in Realtime Database only
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

    // Queue final Firestore update
    this.queueFirestoreUpdate(false);

    // Remove listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];

    // Remove from instances
    const key = `${this.sessionId}-${this.teamId}-${this.playerId}`;
    OptimizedPlayerPresenceService.instances.delete(key);
  }

  /**
   * Static method to process all pending batches before app close
   */
  static async flushAllBatches(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    const service = this.instances.values().next().value;
    if (service) {
      await service.processBatch();
    }
  }
}

// Export as default
export default OptimizedPlayerPresenceService;