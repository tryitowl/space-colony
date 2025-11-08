/**
 * Flexible Session Service
 * 
 * Extends the standard SessionService to handle multi-galaxy sessions
 * with enhanced session management and galaxy-specific operations
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { SessionService } from './sessionService';
import FlexibleGameService from './flexibleGameService';
import { galaxyService } from './galaxyService';
import { sessionGalaxyService } from './sessionGalaxyService';
import type {
  GameSession,
  Colony,
  GameState,
  Player
} from '../types';
import type {
  Galaxy,
  GalaxyConfiguration,
  SessionCodeMapping,
  EnhancedColony
} from '../types/galaxy.types';

interface FlexibleSessionData extends GameSession {
  galaxyConfiguration: GalaxyConfiguration;
  galaxies: Galaxy[];
  sessionCodeMapping: SessionCodeMapping;
  totalTeams: number;
  totalPlayers: number;
  galaxyMetrics: Record<string, {
    activeTeams: number;
    totalPlayers: number;
    averageResources: Record<string, number>;
    tradeActivity: number;
  }>;
}

export default class FlexibleSessionService extends SessionService {
  /**
   * Get all flexible sessions for an event
   */
  static async getFlexibleSessionsForEvent(eventId: string): Promise<FlexibleSessionData[]> {
    try {
      const sessionsQuery = query(
        collection(firestore, 'sessions'),
        where('eventId', '==', eventId),
        where('galaxyConfiguration', '!=', null),
        orderBy('roundStartTime', 'desc')
      );

      const sessionDocs = await getDocs(sessionsQuery);
      const sessions: FlexibleSessionData[] = [];

      for (const sessionDoc of sessionDocs.docs) {
        const sessionData = sessionDoc.data() as FlexibleSessionData;
        
        // Load galaxies if not included
        if (!sessionData.galaxies) {
          sessionData.galaxies = await galaxyService.getSessionGalaxies(sessionData.id);
        }

        // Calculate galaxy metrics
        sessionData.galaxyMetrics = await this.calculateGalaxyMetrics(sessionData);

        sessions.push(sessionData);
      }

      return sessions;
    } catch (error) {
      console.error('Error fetching flexible sessions:', error);
      return [];
    }
  }

  /**
   * Get detailed flexible session with all galaxy data
   */
  static async getDetailedFlexibleSession(sessionId: string): Promise<FlexibleSessionData | null> {
    try {
      const session = await FlexibleGameService.getFlexibleSession(sessionId);
      if (!session) return null;

      // Enhance with detailed galaxy data
      const detailedSession = session as FlexibleSessionData;
      
      // Load galaxy statistics
      detailedSession.galaxyMetrics = await this.calculateGalaxyMetrics(detailedSession);

      // Load session code mapping if not present
      if (!detailedSession.sessionCodeMapping) {
        const mapping = await sessionGalaxyService.getSessionCodeMapping(sessionId);
        if (mapping) {
          detailedSession.sessionCodeMapping = mapping;
        }
      }

      return detailedSession;
    } catch (error) {
      console.error('Error fetching detailed flexible session:', error);
      return null;
    }
  }

  /**
   * Calculate metrics for each galaxy in the session
   */
  private static async calculateGalaxyMetrics(session: FlexibleSessionData): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};

    if (!session.galaxies) return metrics;

    for (const galaxy of session.galaxies) {
      const galaxyTeams = session.teams.filter(team => team.galaxyId === galaxy.id);
      const activeTeams = galaxyTeams.filter(team => !team.eliminationStatus.isEliminated);
      const totalPlayers = galaxyTeams.reduce((sum, team) => sum + team.players.length, 0);

      // Calculate average resources
      const averageResources: Record<string, number> = {};
      if (activeTeams.length > 0) {
        const resourceKeys = ['water', 'food', 'oxygen', 'energy', 'minerals', 'electronics'];
        resourceKeys.forEach(resource => {
          const total = activeTeams.reduce((sum, team) => {
            const val = team.resources[resource as keyof typeof team.resources];
            const numVal = typeof val === 'number' ? val : 0;
            return sum + numVal;
          }, 0);
          averageResources[resource] = Math.round(total / activeTeams.length);
        });
      }

      // Get trade activity (would need to query trades collection)
      const tradeActivity = await this.getGalaxyTradeActivity(session.id, galaxy.id);

      metrics[galaxy.id] = {
        activeTeams: activeTeams.length,
        totalPlayers,
        averageResources,
        tradeActivity
      };
    }

    return metrics;
  }

  /**
   * Get trade activity for a galaxy
   */
  private static async getGalaxyTradeActivity(sessionId: string, galaxyId: string): Promise<number> {
    try {
      // Query trades involving teams from this galaxy
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('galaxyId', '==', galaxyId)
      );

      const tradeDocs = await getDocs(tradesQuery);
      return tradeDocs.size;
    } catch (error) {
      console.error('Error fetching trade activity:', error);
      return 0;
    }
  }

  /**
   * Subscribe to flexible session updates with real-time galaxy data
   */
  static subscribeToFlexibleSessionWithRealtime(
    sessionId: string,
    callback: (sessionData: FlexibleSessionData, realtimeData: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    let sessionData: FlexibleSessionData | null = null;
    let realtimeData: any = null;

    const updateCallback = () => {
      if (sessionData && realtimeData) {
        callback(sessionData, realtimeData);
      }
    };

    // Subscribe to session updates
    const sessionUnsubscribe = FlexibleGameService.subscribeToFlexibleSession(
      sessionId,
      async (session) => {
        sessionData = session as FlexibleSessionData;
        
        // Calculate galaxy metrics
        sessionData.galaxyMetrics = await this.calculateGalaxyMetrics(sessionData);
        
        updateCallback();
      },
      undefined,
      onError
    );

    // Subscribe to real-time updates
    const realtimeRef = ref(realtimeDb, `sessions/${sessionId}/live`);
    const realtimeUnsubscribe = onValue(realtimeRef, (snapshot) => {
      if (snapshot.exists()) {
        realtimeData = snapshot.val();
        updateCallback();
      }
    });

    // Return cleanup function
    return () => {
      sessionUnsubscribe();
      off(realtimeRef);
    };
  }

  /**
   * Update session configuration
   */
  static async updateFlexibleSessionConfiguration(
    sessionId: string,
    updates: Partial<GalaxyConfiguration>
  ): Promise<void> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedConfig = {
      ...session.galaxyConfiguration,
      ...updates
    };

    await updateDoc(doc(firestore, 'sessions', sessionId), {
      galaxyConfiguration: updatedConfig,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Add player to specific team with galaxy context
   */
  static async addPlayerToFlexibleSession(
    sessionId: string,
    teamId: string,
    playerData: {
      name: string;
      role?: string;
      preferences?: Record<string, any>;
    }
  ): Promise<{
    playerId: string;
    teamId: string;
    galaxyId: string;
    gameCode: string;
  }> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const team = session.teams.find(t => t.id === teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const playerId = `${teamId}_player_${Date.now()}`;
    const player: Player = {
      id: playerId,
      name: playerData.name,
      gameCode: 'TEMP',
      isOnline: true,
      lastSeen: Date.now(),
      joinedAt: Date.now(),
      role: (playerData.role as any) || 'player'
    };

    // Add player to team
    team.players.push(player);

    // Update session
    await updateDoc(doc(firestore, 'sessions', sessionId), {
      teams: session.teams,
      totalPlayers: session.totalPlayers + 1,
      updatedAt: Timestamp.now()
    });

    return {
      playerId,
      teamId,
      galaxyId: team.galaxyId!,
      gameCode: team.gameCode
    };
  }

  /**
   * Remove player from flexible session
   */
  static async removePlayerFromFlexibleSession(
    sessionId: string,
    teamId: string,
    playerId: string
  ): Promise<void> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const teamIndex = session.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error('Team not found');
    }

    const playerIndex = session.teams[teamIndex].players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    // Remove player
    session.teams[teamIndex].players.splice(playerIndex, 1);

    // Update session
    await updateDoc(doc(firestore, 'sessions', sessionId), {
      teams: session.teams,
      totalPlayers: Math.max(0, session.totalPlayers - 1),
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Get player distribution across galaxies
   */
  static async getPlayerDistribution(sessionId: string): Promise<{
    byGalaxy: Record<string, { teamCount: number; playerCount: number; teams: any[] }>;
    total: { teamCount: number; playerCount: number };
  }> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      return { byGalaxy: {}, total: { teamCount: 0, playerCount: 0 } };
    }

    const byGalaxy: Record<string, any> = {};
    let totalTeams = 0;
    let totalPlayers = 0;

    // Group teams by galaxy
    session.galaxies?.forEach(galaxy => {
      const galaxyTeams = session.teams.filter(team => team.galaxyId === galaxy.id);
      const galaxyPlayerCount = galaxyTeams.reduce((sum, team) => sum + team.players.length, 0);

      byGalaxy[galaxy.id] = {
        teamCount: galaxyTeams.length,
        playerCount: galaxyPlayerCount,
        teams: galaxyTeams.map(team => ({
          id: team.id,
          name: team.name,
          type: team.type,
          playerCount: team.players.length,
          gameCode: team.gameCode,
          isEliminated: team.eliminationStatus.isEliminated
        }))
      };

      totalTeams += galaxyTeams.length;
      totalPlayers += galaxyPlayerCount;
    });

    return {
      byGalaxy,
      total: { teamCount: totalTeams, playerCount: totalPlayers }
    };
  }

  /**
   * Get session performance metrics
   */
  static async getSessionPerformanceMetrics(sessionId: string): Promise<{
    sessionDuration: number;
    averageRoundDuration: number;
    totalTrades: number;
    averageTradesPerTeam: number;
    eliminationRate: number;
    resourceEfficiency: number;
    crossGalaxyActivity: number;
  }> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const sessionDuration = Date.now() - session.roundStartTime;
    const averageRoundDuration = sessionDuration / Math.max(session.currentRound, 1);

    // Get trades data
    const tradesQuery = query(collection(firestore, 'sessions', sessionId, 'trades'));
    const tradeDocs = await getDocs(tradesQuery);
    const totalTrades = tradeDocs.size;
    const averageTradesPerTeam = totalTrades / session.teams.length;

    // Calculate elimination rate
    const eliminatedTeams = session.teams.filter(team => team.eliminationStatus.isEliminated).length;
    const eliminationRate = eliminatedTeams / session.teams.length;

    // Calculate resource efficiency (simplified metric)
    const totalResources = session.teams.reduce((sum, team) => {
      return sum + Object.values(team.resources).reduce((teamSum, resource) => {
        return teamSum + (typeof resource === 'number' ? resource : 0);
      }, 0);
    }, 0);
    const resourceEfficiency = totalResources / session.teams.length;

    // Calculate cross-galaxy activity
    const crossGalaxyTrades = tradeDocs.docs.filter(doc => {
      const trade = doc.data();
      return trade.isCrossGalaxy;
    }).length;
    const crossGalaxyActivity = crossGalaxyTrades / Math.max(totalTrades, 1);

    return {
      sessionDuration,
      averageRoundDuration,
      totalTrades,
      averageTradesPerTeam,
      eliminationRate,
      resourceEfficiency,
      crossGalaxyActivity
    };
  }

  /**
   * Export session data for analysis
   */
  static async exportFlexibleSessionData(
    sessionId: string,
    includeRealTimeData: boolean = false
  ): Promise<{
    session: FlexibleSessionData;
    trades: any[];
    realTimeData?: any;
    analytics: any;
  }> {
    const session = await this.getDetailedFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get all trades
    const tradesQuery = query(collection(firestore, 'sessions', sessionId, 'trades'));
    const tradeDocs = await getDocs(tradesQuery);
    const trades = tradeDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get real-time data if requested
    let realTimeData;
    if (includeRealTimeData) {
      try {
        const realtimeSnapshot = await new Promise((resolve, reject) => {
          const dbRef = ref(realtimeDb, `sessions/${sessionId}/live`);
          onValue(dbRef, resolve, reject, { onlyOnce: true });
        });
        realTimeData = (realtimeSnapshot as any).val();
      } catch (error) {
        console.warn('Could not fetch real-time data:', error);
      }
    }

    // Generate analytics
    const analytics = await this.getSessionPerformanceMetrics(sessionId);

    return {
      session,
      trades,
      realTimeData,
      analytics
    };
  }

  /**
   * Clone session with modifications
   */
  static async cloneFlexibleSession(
    originalSessionId: string,
    newSessionName: string,
    modifications?: {
      galaxyConfiguration?: Partial<GalaxyConfiguration>;
      teamAdjustments?: Record<string, Partial<Colony>>;
      gameSettings?: Record<string, any>;
    }
  ): Promise<string> {
    const originalSession = await FlexibleGameService.getFlexibleSession(originalSessionId);
    if (!originalSession) {
      throw new Error('Original session not found');
    }

    // Apply modifications
    let galaxyConfiguration = originalSession.galaxyConfiguration;
    if (modifications?.galaxyConfiguration) {
      galaxyConfiguration = {
        ...galaxyConfiguration,
        ...modifications.galaxyConfiguration
      };
    }

    // Create new session
    const newSessionId = await FlexibleGameService.createFlexibleSession(
      originalSession.eventId,
      newSessionName,
      galaxyConfiguration,
      originalSession.aiConfigs
    );

    // Apply team adjustments if specified
    if (modifications?.teamAdjustments) {
      const newSession = await FlexibleGameService.getFlexibleSession(newSessionId);
      if (newSession) {
        const batch = writeBatch(firestore);
        
        newSession.teams.forEach(team => {
          const adjustments = modifications.teamAdjustments![team.id];
          if (adjustments) {
            Object.assign(team, adjustments);
          }
        });

        batch.update(doc(firestore, 'sessions', newSessionId), {
          teams: newSession.teams
        });

        await batch.commit();
      }
    }

    return newSessionId;
  }

  /**
   * Archive completed session
   */
  static async archiveFlexibleSession(
    sessionId: string,
    archiveData?: {
      finalResults: any;
      facilitatorNotes: string;
      lessons: string[];
    }
  ): Promise<void> {
    const exportedData = await this.exportFlexibleSessionData(sessionId, true);
    
    // Create archive document
    const archiveDoc = {
      ...exportedData,
      archiveData,
      archivedAt: Timestamp.now(),
      archiveVersion: '1.0'
    };

    // Save to archives collection
    await setDoc(doc(firestore, 'archives', sessionId), archiveDoc);

    // Mark original session as archived
    await updateDoc(doc(firestore, 'sessions', sessionId), {
      gameState: 'archived' as GameState,
      archivedAt: Timestamp.now()
    });
  }
}