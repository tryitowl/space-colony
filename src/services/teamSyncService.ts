/**
 * Team Sync Service - Manages real-time synchronization and conflict resolution
 */

import { 
  ref, 
  onValue, 
  set, 
  update,
  push,

  off,
  runTransaction
} from 'firebase/database';
import { 
  doc, 
  updateDoc, 

  onSnapshot,
  collection,
  addDoc
} from 'firebase/firestore';
import { realtimeDb, firestore } from '../firebase/config';
import type { 
  TeamSyncState,
  PendingUpdate,
  ConflictResolution,
  TeamPlayer
} from '../types/player.types';
import type { Resources, TradeOffer } from '../types';

interface SyncCallbacks {
  onSyncStateChange?: (state: TeamSyncState) => void;
  onConflict?: (resolution: ConflictResolution) => void;
  onResourceUpdate?: (resources: Partial<Resources>) => void;
  onError?: (error: Error) => void;
}

interface ResourceLock {
  playerId: string;
  lockedAt: number;
  expiresAt: number;
  resources: Partial<Resources>;
  operation: 'trade' | 'investment' | 'consumption';
}

export class TeamSyncService {
  private static instances: Map<string, TeamSyncService> = new Map();
  private sessionId: string;
  private teamId: string;
  private playerId: string;
  private callbacks: SyncCallbacks;

  private listeners: (() => void)[] = [];
  private pendingUpdates: Map<string, PendingUpdate> = new Map();
  private syncInterval?: NodeJS.Timeout;
  private resourceLocks: Map<string, ResourceLock> = new Map();

  private constructor(
    sessionId: string,
    teamId: string,
    playerId: string,
    callbacks: SyncCallbacks = {}
  ) {
    this.sessionId = sessionId;
    this.teamId = teamId;
    this.playerId = playerId;
    this.callbacks = callbacks;
  }

  /**
   * Get or create instance
   */
  static getInstance(
    sessionId: string,
    teamId: string,
    playerId: string,
    callbacks?: SyncCallbacks
  ): TeamSyncService {
    const key = `${sessionId}-${teamId}-${playerId}`;
    if (!this.instances.has(key)) {
      this.instances.set(
        key,
        new TeamSyncService(sessionId, teamId, playerId, callbacks || {})
      );
    }
    return this.instances.get(key)!;
  }

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    try {
      // Create sync reference
      // Removed sync reference

      // Monitor sync state
      this.monitorSyncState();

      // Monitor resource locks
      this.monitorResourceLocks();

      // Start sync interval
      this.startSyncInterval();

      // Initialize sync state
      await this.updateSyncState('synced');

    } catch (error) {
      console.error('Error initializing sync:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Update resources with conflict resolution
   */
  async updateResources(
    resources: Partial<Resources>,
    operation: 'trade' | 'investment' | 'consumption'
  ): Promise<boolean> {
    try {
      // Try to acquire resource lock
      const lockId = await this.acquireResourceLock(resources, operation);
      if (!lockId) {
        // Conflict detected
        await this.handleResourceConflict(resources, operation);
        return false;
      }

      // Perform resource update
      const success = await this.performResourceUpdate(resources);

      // Release lock
      await this.releaseResourceLock(lockId);

      return success;

    } catch (error) {
      console.error('Error updating resources:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Acquire resource lock
   */
  private async acquireResourceLock(
    resources: Partial<Resources>,
    operation: string
  ): Promise<string | null> {
    const lockRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/locks/resources`
    );

    try {
      const result = await runTransaction(lockRef, (currentLock) => {
        if (currentLock && currentLock.expiresAt > Date.now()) {
          // Lock exists and hasn't expired
          if (currentLock.playerId === this.playerId) {
            // Same player, update lock
            return {
              ...currentLock,
              resources,
              operation,
              expiresAt: Date.now() + 5000 // 5 second lock
            };
          }
          // Different player has lock
          return undefined; // Abort transaction
        }

        // No lock or expired, create new
        const lockId = push(ref(realtimeDb)).key!;
        return {
          id: lockId,
          playerId: this.playerId,
          lockedAt: Date.now(),
          expiresAt: Date.now() + 5000,
          resources,
          operation
        };
      });

      if (result.committed && result.snapshot.val()) {
        const lock = result.snapshot.val();
        this.resourceLocks.set(lock.id, lock);
        return lock.id;
      }

      return null;

    } catch (error) {
      console.error('Error acquiring lock:', error);
      return null;
    }
  }

  /**
   * Release resource lock
   */
  private async releaseResourceLock(lockId: string): Promise<void> {
    const lockRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/locks/resources`
    );

    await runTransaction(lockRef, (currentLock) => {
      if (currentLock && currentLock.id === lockId) {
        return null; // Remove lock
      }
      return currentLock; // Keep current lock
    });

    this.resourceLocks.delete(lockId);
  }

  /**
   * Perform resource update
   */
  private async performResourceUpdate(resources: Partial<Resources>): Promise<boolean> {
    try {
      // Update in Firestore
      const sessionRef = doc(firestore, 'sessions', this.sessionId);
      
      // Get current session
      const sessionSnapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(sessionRef, (doc) => {
          unsubscribe();
          resolve(doc);
        });
      });

      if (!sessionSnapshot.exists()) return false;

      const sessionData = sessionSnapshot.data();
      const teams = sessionData.teams || [];
      const teamIndex = teams.findIndex((t: any) => t.id === this.teamId);
      
      if (teamIndex === -1) return false;

      // Update resources
      const currentResources = teams[teamIndex].resources;
      const updatedResources = { ...currentResources };

      // Apply updates
      Object.entries(resources).forEach(([key, value]) => {
        if (typeof value === 'number') {
          updatedResources[key] = Math.max(0, currentResources[key] + value);
        } else {
          updatedResources[key] = value;
        }
      });

      teams[teamIndex].resources = updatedResources;

      // Save update
      await updateDoc(sessionRef, { teams });

      // Notify callbacks
      this.callbacks.onResourceUpdate?.(updatedResources);

      return true;

    } catch (error) {
      console.error('Error performing resource update:', error);
      return false;
    }
  }

  /**
   * Handle resource conflict
   */
  private async handleResourceConflict(
    resources: Partial<Resources>,
    operation: string
  ): Promise<void> {
    // Create pending update
    const updateId = push(ref(realtimeDb)).key!;
    const pendingUpdate: PendingUpdate = {
      id: updateId,
      playerId: this.playerId,
      type: 'resource',
      data: { resources, operation },
      timestamp: Date.now(),
      priority: operation === 'trade' ? 'high' : 'medium'
    };

    this.pendingUpdates.set(updateId, pendingUpdate);

    // Add to sync queue
    await this.addToPendingQueue(pendingUpdate);

    // Update sync state
    await this.updateSyncState('conflict');

    // Create conflict resolution record
    const resolution: ConflictResolution = {
      id: push(ref(realtimeDb)).key!,
      conflictType: 'resource_mismatch',
      involvedPlayers: [this.playerId],
      resolution: 'first_wins',
      resolvedAt: Date.now(),
      details: `Resource update conflict during ${operation}`
    };

    await this.recordConflictResolution(resolution);
    this.callbacks.onConflict?.(resolution);
  }

  /**
   * Handle simultaneous trade attempts
   */
  async handleSimultaneousTrade(
    trade1: TradeOffer,
    trade2: TradeOffer,
    player1: TeamPlayer,
    player2: TeamPlayer
  ): Promise<ConflictResolution> {
    // Determine resolution based on rules
    let resolution: 'first_wins' | 'last_wins' | 'captain_decides' | 'vote' = 'first_wins';
    let winningTrade: TradeOffer;

    if (player1.role === 'captain') {
      resolution = 'captain_decides';
      winningTrade = trade1;
    } else if (player2.role === 'captain') {
      resolution = 'captain_decides';
      winningTrade = trade2;
    } else if (trade1.timestamp < trade2.timestamp) {
      resolution = 'first_wins';
      winningTrade = trade1;
    } else {
      resolution = 'last_wins';
      winningTrade = trade2;
    }

    const conflictResolution: ConflictResolution = {
      id: push(ref(realtimeDb)).key!,
      conflictType: 'simultaneous_trade',
      involvedPlayers: [player1.id, player2.id],
      resolution,
      resolvedAt: Date.now(),
      details: `Trade ${winningTrade.id} accepted, other rejected`
    };

    await this.recordConflictResolution(conflictResolution);
    this.callbacks.onConflict?.(conflictResolution);

    return conflictResolution;
  }

  /**
   * Monitor sync state
   */
  private monitorSyncState(): void {
    const stateRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/sync/state`
    );

    onValue(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.val() as TeamSyncState;
        this.callbacks.onSyncStateChange?.(state);
      }
    });

    this.listeners.push(() => off(stateRef));
  }

  /**
   * Monitor resource locks
   */
  private monitorResourceLocks(): void {
    const locksRef = ref(
      realtimeDb,
      `sessions/${this.sessionId}/teams/${this.teamId}/locks`
    );

    onValue(locksRef, (snapshot) => {
      if (snapshot.exists()) {
        const locks = snapshot.val();
        
        // Clear expired locks
        Object.entries(locks).forEach(([key, lock]: [string, any]) => {
          if (lock.expiresAt < Date.now()) {
            update(ref(realtimeDb, `${locksRef}/${key}`), {});
          }
        });
      }
    });

    this.listeners.push(() => off(locksRef));
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    // Process pending updates every 2 seconds
    this.syncInterval = setInterval(async () => {
      await this.processPendingUpdates();
    }, 2000);
  }

  /**
   * Process pending updates
   */
  private async processPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    // Sort by priority and timestamp
    const updates = Array.from(this.pendingUpdates.values())
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });

    // Process updates
    for (const update of updates) {
      try {
        if (update.type === 'resource') {
          const success = await this.updateResources(
            update.data.resources,
            update.data.operation
          );
          
          if (success) {
            this.pendingUpdates.delete(update.id);
            await this.removeFromPendingQueue(update.id);
          }
        }
      } catch (error) {
        console.error('Error processing update:', error);
      }
    }

    // Update sync state
    if (this.pendingUpdates.size === 0) {
      await this.updateSyncState('synced');
    }
  }

  /**
   * Update sync state
   */
  private async updateSyncState(status: 'synced' | 'syncing' | 'conflict' | 'error'): Promise<void> {
    const state: TeamSyncState = {
      teamId: this.teamId,
      lastSyncTime: Date.now(),
      pendingUpdates: Array.from(this.pendingUpdates.values()),
      conflictResolutions: [],
      syncStatus: status
    };

    await set(
      ref(realtimeDb, `sessions/${this.sessionId}/teams/${this.teamId}/sync/state`),
      state
    );
  }

  /**
   * Add to pending queue
   */
  private async addToPendingQueue(update: PendingUpdate): Promise<void> {
    await set(
      ref(
        realtimeDb,
        `sessions/${this.sessionId}/teams/${this.teamId}/sync/pending/${update.id}`
      ),
      update
    );
  }

  /**
   * Remove from pending queue
   */
  private async removeFromPendingQueue(updateId: string): Promise<void> {
    await set(
      ref(
        realtimeDb,
        `sessions/${this.sessionId}/teams/${this.teamId}/sync/pending/${updateId}`
      ),
      null
    );
  }

  /**
   * Record conflict resolution
   */
  private async recordConflictResolution(resolution: ConflictResolution): Promise<void> {
    await addDoc(
      collection(firestore, 'sessions', this.sessionId, 'conflictResolutions'),
      {
        ...resolution,
        teamId: this.teamId
      }
    );
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<TeamSyncState | null> {
    try {
      const stateRef = ref(
        realtimeDb,
        `sessions/${this.sessionId}/teams/${this.teamId}/sync/state`
      );

      const snapshot = await new Promise<any>((resolve) => {
        onValue(stateRef, (snap) => resolve(snap), { onlyOnce: true });
      });

      return snapshot.exists() ? snapshot.val() : null;

    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    await this.updateSyncState('syncing');
    await this.processPendingUpdates();
  }

  /**
   * Clean up service
   */
  destroy(): void {
    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Clear pending updates
    this.pendingUpdates.clear();

    // Remove listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];

    // Remove from instances
    const key = `${this.sessionId}-${this.teamId}-${this.playerId}`;
    TeamSyncService.instances.delete(key);
  }
}