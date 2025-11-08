import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { firestore as db, realtimeDb as rtdb } from '../firebase/config';
import { notificationService } from './notificationService';
import type { Colony } from '../types';

export interface GalaxyState {
  galaxyId: string;
  isPaused: boolean;
  pausedAt?: number;
  pausedBy?: string;
  resumedAt?: number;
  tradingEnabled: boolean;
  messagesEnabled: boolean;
  aiEnabled: boolean;
  lastStateChange: number;
}

export interface GlobalAnnouncement {
  id: string;
  message: string;
  priority: 'info' | 'warning' | 'critical';
  sentBy: string;
  sentAt: number;
  expiresAt?: number;
  targetGalaxies: string[]; // 'all' or specific galaxy IDs
  targetTeams?: string[]; // Optional specific team IDs
  persistent: boolean; // Should survive page refresh
}

class GalaxyStateService {
  private static instance: GalaxyStateService;
  private stateListeners: Map<string, () => void> = new Map();
  private galaxyStates: Map<string, GalaxyState> = new Map();

  private constructor() {}

  static getInstance(): GalaxyStateService {
    if (!this.instance) {
      this.instance = new GalaxyStateService();
    }
    return this.instance;
  }

  /**
   * Initialize galaxy state for a session
   */
  async initializeGalaxyState(sessionId: string, galaxyId: string): Promise<void> {
    try {
      const stateRef = doc(db, 'galaxyStates', `${sessionId}_${galaxyId}`);
      const stateDoc = await getDoc(stateRef);

      if (!stateDoc.exists()) {
        const initialState: GalaxyState = {
          galaxyId,
          isPaused: false,
          tradingEnabled: true,
          messagesEnabled: true,
          aiEnabled: true,
          lastStateChange: Date.now()
        };

        await setDoc(stateRef, initialState);
        this.galaxyStates.set(galaxyId, initialState);
      } else {
        this.galaxyStates.set(galaxyId, stateDoc.data() as GalaxyState);
      }

      // Set up real-time listener
      this.setupStateListener(sessionId, galaxyId);
    } catch (error) {
      console.error('Error initializing galaxy state:', error);
      throw error;
    }
  }

  /**
   * Pause a galaxy
   */
  async pauseGalaxy(sessionId: string, galaxyId: string, pausedBy: string): Promise<void> {
    try {
      const stateUpdate: Partial<GalaxyState> = {
        isPaused: true,
        pausedAt: Date.now(),
        pausedBy,
        tradingEnabled: false,
        lastStateChange: Date.now()
      };

      // Update Firestore
      await updateDoc(doc(db, 'galaxyStates', `${sessionId}_${galaxyId}`), stateUpdate);

      // Update real-time database for immediate effect
      await set(ref(rtdb, `sessions/${sessionId}/galaxies/${galaxyId}/state`), {
        isPaused: true,
        tradingEnabled: false,
        timestamp: Date.now()
      });

      // Notify all teams in the galaxy
      await this.notifyGalaxyTeams(
        sessionId,
        galaxyId,
        'Galaxy Paused',
        'All trading and activities in this galaxy have been temporarily paused.',
        'warning'
      );
    } catch (error) {
      console.error('Error pausing galaxy:', error);
      throw error;
    }
  }

  /**
   * Resume a galaxy
   */
  async resumeGalaxy(sessionId: string, galaxyId: string): Promise<void> {
    try {
      const stateUpdate: Partial<GalaxyState> = {
        isPaused: false,
        resumedAt: Date.now(),
        tradingEnabled: true,
        lastStateChange: Date.now()
      };

      // Update Firestore
      await updateDoc(doc(db, 'galaxyStates', `${sessionId}_${galaxyId}`), stateUpdate);

      // Update real-time database
      await set(ref(rtdb, `sessions/${sessionId}/galaxies/${galaxyId}/state`), {
        isPaused: false,
        tradingEnabled: true,
        timestamp: Date.now()
      });

      // Notify all teams
      await this.notifyGalaxyTeams(
        sessionId,
        galaxyId,
        'Galaxy Resumed',
        'Trading and activities have resumed in this galaxy.',
        'success'
      );
    } catch (error) {
      console.error('Error resuming galaxy:', error);
      throw error;
    }
  }

  /**
   * Send global announcement
   */
  async sendGlobalAnnouncement(
    sessionId: string,
    message: string,
    options: {
      priority?: 'info' | 'warning' | 'critical';
      targetGalaxies?: string[] | 'all';
      targetTeams?: string[];
      expiresInMinutes?: number;
      persistent?: boolean;
      sentBy: string;
    }
  ): Promise<void> {
    try {
      const announcement: GlobalAnnouncement = {
        id: `announcement_${Date.now()}`,
        message,
        priority: options.priority || 'info',
        sentBy: options.sentBy,
        sentAt: Date.now(),
        expiresAt: options.expiresInMinutes 
          ? Date.now() + (options.expiresInMinutes * 60 * 1000)
          : undefined,
        targetGalaxies: options.targetGalaxies === 'all' ? ['all'] : (options.targetGalaxies || ['all']),
        targetTeams: options.targetTeams,
        persistent: options.persistent || false
      };

      // Store announcement in Firestore
      await setDoc(
        doc(db, 'announcements', announcement.id),
        announcement
      );

      // Send real-time notification
      if (announcement.targetGalaxies.includes('all') || announcement.targetGalaxies.length > 0) {
        await this.broadcastAnnouncement(sessionId, announcement);
      }

      // Store in announcement history
      await this.storeAnnouncementHistory(sessionId, announcement);
    } catch (error) {
      console.error('Error sending global announcement:', error);
      throw error;
    }
  }

  /**
   * Broadcast announcement to teams
   */
  private async broadcastAnnouncement(
    sessionId: string,
    announcement: GlobalAnnouncement
  ): Promise<void> {
    try {
      // Get all teams that should receive the announcement
      const teamsQuery = announcement.targetGalaxies.includes('all')
        ? query(collection(db, 'teams'), where('sessionId', '==', sessionId))
        : query(
            collection(db, 'teams'),
            where('sessionId', '==', sessionId),
            where('galaxyId', 'in', announcement.targetGalaxies)
          );

      const teamsSnapshot = await getDocs(teamsQuery);
      // const __batch = writeBatch(db);

      // Send notification to each team
      const notificationPromises = teamsSnapshot.docs.map(async (teamDoc) => {
        const team = teamDoc.data() as Colony;
        
        // Check if this team should receive the announcement
        if (announcement.targetTeams && !announcement.targetTeams.includes(team.id)) {
          return;
        }

        // Add to team's notification feed
        await notificationService.sendNotification(sessionId, team.id, {
          recipientId: team.id,
          recipientType: 'team',
          type: 'system',
          title: `📢 ${announcement.priority === 'critical' ? 'CRITICAL: ' : ''}Announcement`,
          message: announcement.message,
          priority: announcement.priority === 'critical' ? 'high' : 'medium',
          data: {
            announcementId: announcement.id,
            sentBy: announcement.sentBy,
            persistent: announcement.persistent
          }
        } as any);
      });

      await Promise.all(notificationPromises);

      // Update real-time database for immediate display
      await set(
        ref(rtdb, `sessions/${sessionId}/announcements/${announcement.id}`),
        {
          message: announcement.message,
          priority: announcement.priority,
          timestamp: announcement.sentAt,
          expiresAt: announcement.expiresAt
        }
      );
    } catch (error) {
      console.error('Error broadcasting announcement:', error);
      throw error;
    }
  }

  /**
   * Store announcement in history
   */
  private async storeAnnouncementHistory(
    sessionId: string,
    announcement: GlobalAnnouncement
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, 'sessions', sessionId, 'announcementHistory', announcement.id),
        announcement
      );
    } catch (error) {
      console.error('Error storing announcement history:', error);
    }
  }

  /**
   * Get announcement history for a session
   */
  async getAnnouncementHistory(sessionId: string): Promise<GlobalAnnouncement[]> {
    try {
      const historyQuery = query(
        collection(db, 'sessions', sessionId, 'announcementHistory')
      );
      const snapshot = await getDocs(historyQuery);
      
      return snapshot.docs
        .map(doc => doc.data() as GlobalAnnouncement)
        .sort((a, b) => b.sentAt - a.sentAt);
    } catch (error) {
      console.error('Error getting announcement history:', error);
      return [];
    }
  }

  /**
   * Get active announcements
   */
  async getActiveAnnouncements(_sessionId: string, galaxyId?: string): Promise<GlobalAnnouncement[]> {
    try {
      const now = Date.now();
      const announcementsQuery = query(
        collection(db, 'announcements'),
        where('sentAt', '>', now - 24 * 60 * 60 * 1000) // Last 24 hours
      );

      const snapshot = await getDocs(announcementsQuery);
      const announcements = snapshot.docs
        .map(doc => doc.data() as GlobalAnnouncement)
        .filter(a => {
          // Filter expired announcements
          if (a.expiresAt && a.expiresAt < now) return false;
          
          // Filter by galaxy if specified
          if (galaxyId && !a.targetGalaxies.includes('all') && !a.targetGalaxies.includes(galaxyId)) {
            return false;
          }
          
          return true;
        })
        .sort((a, b) => b.sentAt - a.sentAt);

      return announcements;
    } catch (error) {
      console.error('Error getting active announcements:', error);
      return [];
    }
  }

  /**
   * Notify all teams in a galaxy
   */
  private async notifyGalaxyTeams(
    sessionId: string,
    galaxyId: string,
    title: string,
    message: string,
    priority: 'info' | 'warning' | 'success'
  ): Promise<void> {
    try {
      const teamsQuery = query(
        collection(db, 'teams'),
        where('sessionId', '==', sessionId),
        where('galaxyId', '==', galaxyId)
      );

      const teamsSnapshot = await getDocs(teamsQuery);
      
      const notificationPromises = teamsSnapshot.docs.map(teamDoc => {
        const team = teamDoc.data() as Colony;
        return notificationService.sendNotification(sessionId, team.id, {
          recipientId: team.id,
          recipientType: 'team',
          type: 'system',
          title,
          message,
          priority: priority === 'warning' ? 'high' : 'medium'
        } as any);
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error notifying galaxy teams:', error);
    }
  }

  /**
   * Set up real-time listener for galaxy state
   */
  private setupStateListener(sessionId: string, galaxyId: string): void {
    const stateRef = ref(rtdb, `sessions/${sessionId}/galaxies/${galaxyId}/state`);
    
    onValue(stateRef, (snapshot) => {
      const state = snapshot.val();
      if (state) {
        this.galaxyStates.set(galaxyId, {
          ...this.galaxyStates.get(galaxyId)!,
          ...state
        });
      }
    });

    // Store listener reference for cleanup
    this.stateListeners.set(galaxyId, () => off(stateRef));
  }

  /**
   * Get current galaxy state
   */
  getGalaxyState(galaxyId: string): GalaxyState | null {
    return this.galaxyStates.get(galaxyId) || null;
  }

  /**
   * Check if galaxy is paused
   */
  isGalaxyPaused(galaxyId: string): boolean {
    const state = this.galaxyStates.get(galaxyId);
    return state?.isPaused || false;
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.stateListeners.forEach(cleanup => cleanup());
    this.stateListeners.clear();
    this.galaxyStates.clear();
  }
}

export const galaxyStateService = GalaxyStateService.getInstance();