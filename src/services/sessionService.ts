import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { firestore as db } from '../firebase/config';
import { sessionCodeService } from './sessionCodeService';
import { sessionGalaxyService } from './sessionGalaxyService';
import { galaxyService } from './galaxyService';
import { teamDataService } from './teamDataService';
import type {
  Galaxy,
  GalaxyConfiguration
} from '../types/galaxy.types';
import type {
  GameSession,
  GameState,
  Colony
} from '../types';

/**
 * Enhanced session service with galaxy support
 */
export class SessionService {
  private sessionListeners: Map<string, Unsubscribe> = new Map();

  /**
   * Create a new session (single-galaxy by default for backward compatibility)
   */
  async createSession(
    eventId: string,
    sessionName: string,
    facilitatorId: string,
    options: {
      galaxyCount?: number;
      galaxyConfigs?: Partial<Galaxy>[];
      enableCrossGalaxyTrading?: boolean;
    } = {}
  ): Promise<string> {
    const sessionId = `session_${Date.now()}`;
    
    // Create base session data
    const sessionData: GameSession = {
      id: sessionId,
      eventId,
      name: sessionName,
      facilitatorId,
      teams: [], // Teams will be populated by galaxy service
      currentRound: 0,
      roundStartTime: 0,
      gameState: 'setup' as GameState,
      settings: {
        roundDurations: {
          instructions: 5 * 60 * 1000,
          investments: 5 * 60 * 1000,
          round1Trading: 6 * 60 * 1000,
          round1Strategy: 3 * 60 * 1000,
          round2Trading: 5 * 60 * 1000,
          round2Strategy: 2 * 60 * 1000,
          milestoneBreak: 5 * 60 * 1000,
          round3Trading: 5 * 60 * 1000,
          round3Strategy: 2 * 60 * 1000,
          round4Trading: 4 * 60 * 1000,
          round4Strategy: 1 * 60 * 1000,
          round5Trading: 20 * 60 * 1000
        },
        enableAlienContact: true,
        customIntel: []
      },
      code: '', // Will be generated
      createdAt: Date.now()
    } as GameSession;

    // Store session
    await setDoc(doc(db, 'sessions', sessionId), sessionData);

    // Handle galaxy creation
    if (options.galaxyCount && options.galaxyCount > 1) {
      // Multi-galaxy session
      await this.createMultiGalaxySession(
        sessionId,
        options.galaxyConfigs || [],
        options.enableCrossGalaxyTrading || false
      );
    } else {
      // Single-galaxy session (backward compatible)
      const galaxyConfig = options.galaxyConfigs?.[0] || {};
      await this.createSingleGalaxySession(sessionId, galaxyConfig);
    }

    return sessionId;
  }

  /**
   * Create a single-galaxy session (backward compatible)
   */
  private async createSingleGalaxySession(
    sessionId: string,
    galaxyConfig: Partial<Galaxy>
  ): Promise<void> {
    // Create default galaxy
    const galaxy = await galaxyService.createGalaxy(sessionId, {
      name: 'Main Galaxy',
      totalTeams: 12,
      ...galaxyConfig
    });

    // Generate teams
    const teams = await galaxyService.generateAndAssignTeams(galaxy.id, sessionId);

    // Generate session code
    const code = await sessionCodeService.generateSessionCode(sessionId);

    // Update session with teams and code
    await updateDoc(doc(db, 'sessions', sessionId), {
      teams,
      code,
      galaxyMode: 'single',
      primaryGalaxyId: galaxy.id,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Create a multi-galaxy session
   */
  private async createMultiGalaxySession(
    sessionId: string,
    galaxyConfigs: Partial<Galaxy>[],
    enableCrossGalaxyTrading: boolean
  ): Promise<void> {
    // Prepare galaxy configuration
    const configuration: GalaxyConfiguration = {
      galaxies: galaxyConfigs.map((config, i) => ({
        id: `${sessionId}_galaxy_${i}`,
        name: config.name || `Galaxy ${i + 1}`,
        description: config.description || '',
        totalTeams: config.totalTeams || 6,
        colonyTypes: config.colonyTypes || ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
        teamStructure: config.teamStructure || { mode: 'standard' },
        aiEnabled: config.aiEnabled || false,
        aiDifficulty: config.aiDifficulty
      } as Galaxy)),
      crossGalaxyTrading: enableCrossGalaxyTrading,
      globalEvents: true,
      sharedMarketIntel: enableCrossGalaxyTrading,
      competitionMode: enableCrossGalaxyTrading ? 'hybrid' : 'galaxy',
      victoryConditions: []
    };

    // Initialize multi-galaxy session
    const codeMapping = await sessionGalaxyService.initializeMultiGalaxySession(
      sessionId,
      configuration
    );

    // Collect all teams from all galaxies
    const allTeams: Colony[] = [];
    for (const galaxyMapping of Object.values(codeMapping.galaxyMappings)) {
      const teams = await galaxyService.getGalaxyTeams(galaxyMapping.galaxyId);
      allTeams.push(...teams);
    }

    // Update session
    await updateDoc(doc(db, 'sessions', sessionId), {
      teams: allTeams,
      code: codeMapping.masterCode,
      galaxyMode: 'multi',
      galaxyCount: (configuration.galaxies || []).length,
      codeMapping,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Get session by ID with galaxy information
   */
  async getSession(sessionId: string): Promise<GameSession | null> {
    const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
    
    if (!sessionDoc.exists()) {
      return null;
    }

    const sessionData = sessionDoc.data() as GameSession;

    // Enhance with galaxy information if multi-galaxy
    if ((sessionData as any).galaxyMode === 'multi') {
      const galaxyConfig = await sessionGalaxyService.getSessionGalaxyConfiguration(sessionId);
      if (galaxyConfig) {
        sessionData.galaxyConfiguration = galaxyConfig;
      }
    }

    return sessionData;
  }

  /**
   * Get session by code (supports both master and galaxy codes)
   */
  async getSessionByCode(code: string): Promise<GameSession | null> {
    // First try direct code lookup
    const sessionId = await sessionCodeService.lookupSessionByCode(code);
    
    if (sessionId) {
      // Check if it's a galaxy-specific code
      if (sessionId.includes('_galaxy_')) {
        // Extract main session ID
        const mainSessionId = sessionId.split('_galaxy_')[0];
        return await this.getSession(mainSessionId);
      }
      return await this.getSession(sessionId);
    }

    return null;
  }

  /**
   * Update session state
   */
  async updateSessionState(
    sessionId: string,
    gameState: GameState
  ): Promise<void> {
    await updateDoc(doc(db, 'sessions', sessionId), {
      gameState,
      updatedAt: Timestamp.now()
    });

    // If transitioning to active, start the game timer
    if (gameState === 'active' as GameState) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        startTime: Date.now()
      });
    }

    // If completing, record end time
    if (gameState === 'completed') {
      await updateDoc(doc(db, 'sessions', sessionId), {
        endTime: Date.now()
      });
    }
  }

  /**
   * Add galaxy to existing session
   */
  async addGalaxyToSession(
    sessionId: string,
    galaxyConfig: Partial<Galaxy>
  ): Promise<Galaxy> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // If single-galaxy session, migrate to multi-galaxy
    if ((session as any).galaxyMode === 'single' || !(session as any).galaxyMode) {
      const codeMapping = await sessionGalaxyService.migrateToMultiGalaxy(
        sessionId,
        [galaxyConfig]
      );

      await updateDoc(doc(db, 'sessions', sessionId), {
        galaxyMode: 'multi',
        codeMapping,
        updatedAt: Timestamp.now()
      });

      return galaxyConfig as Galaxy;
    }

    // Add to existing multi-galaxy session
    const existingConfig = await sessionGalaxyService.getSessionGalaxyConfiguration(sessionId);
    if (!existingConfig) {
      throw new Error('Galaxy configuration not found');
    }

    const newGalaxyIndex = (existingConfig.galaxies || []).length;
    const galaxy = await galaxyService.createGalaxy(sessionId, galaxyConfig, newGalaxyIndex);

    // Update configuration
    if (!existingConfig.galaxies) existingConfig.galaxies = [];
    existingConfig.galaxies.push(galaxy);
    await sessionGalaxyService.updateSessionGalaxyConfiguration(sessionId, {
      galaxies: existingConfig.galaxies
    });

    // Generate teams for new galaxy
    const teams = await galaxyService.generateAndAssignTeams(galaxy.id, sessionId);

    // Update session teams
    const allTeams = [...(session.teams || []), ...teams];
    await updateDoc(doc(db, 'sessions', sessionId), {
      teams: allTeams,
      galaxyCount: (existingConfig.galaxies || []).length,
      updatedAt: Timestamp.now()
    });

    return galaxy;
  }

  /**
   * Get all teams in a session (across all galaxies)
   */
  async getSessionTeams(sessionId: string): Promise<Colony[]> {
    return teamDataService.getSessionTeams(sessionId);
  }

  /**
   * Get teams by galaxy
   */
  async getTeamsByGalaxy(sessionId: string): Promise<Map<string, Colony[]>> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const teamsByGalaxy = new Map<string, Colony[]>();

    if ((session as any).galaxyMode === 'single') {
      const teams = await teamDataService.getSessionTeams(sessionId);
      teamsByGalaxy.set((session as any).primaryGalaxyId || 'main', teams);
    } else {
      const galaxies = await galaxyService.getSessionGalaxies(sessionId);
      
      for (const galaxy of galaxies) {
        const teams = await teamDataService.getGalaxyTeams(galaxy.id);
        teamsByGalaxy.set(galaxy.id, teams);
      }
    }

    return teamsByGalaxy;
  }

  /**
   * Subscribe to session updates
   */
  subscribeToSession(
    sessionId: string,
    callback: (session: GameSession) => void
  ): () => void {
    // Clean up existing listener
    this.unsubscribeFromSession(sessionId);

    const unsubscribe = onSnapshot(
      doc(db, 'sessions', sessionId),
      async (snapshot) => {
        if (snapshot.exists()) {
          const sessionData = snapshot.data() as GameSession;
          
          // Enhance with galaxy information if needed
          if ((sessionData as any).galaxyMode === 'multi') {
            const galaxyConfig = await sessionGalaxyService.getSessionGalaxyConfiguration(sessionId);
            if (galaxyConfig) {
              sessionData.galaxyConfiguration = galaxyConfig;
            }
          }
          
          callback(sessionData);
        }
      }
    );

    this.sessionListeners.set(sessionId, unsubscribe);

    return () => this.unsubscribeFromSession(sessionId);
  }

  /**
   * Unsubscribe from session updates
   */
  private unsubscribeFromSession(sessionId: string): void {
    const unsubscribe = this.sessionListeners.get(sessionId);
    if (unsubscribe) {
      unsubscribe();
      this.sessionListeners.delete(sessionId);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(sessionId: string): Promise<{
    totalTeams: number;
    activeTeams: number;
    eliminatedTeams: number;
    totalTrades: number;
    galaxyStats?: any;
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const teams = session.teams || [];
    const activeTeams = teams.filter((t: any) => !t.eliminationStatus?.isEliminated);
    const eliminatedTeams = teams.filter((t: any) => t.eliminationStatus?.isEliminated);

    // Get trade count
    const tradesQuery = query(
      collection(db, 'trades'),
      where('sessionId', '==', sessionId)
    );
    const tradeDocs = await getDocs(tradesQuery);

    const stats: any = {
      totalTeams: teams.length,
      activeTeams: activeTeams.length,
      eliminatedTeams: eliminatedTeams.length,
      totalTrades: tradeDocs.size
    };

    // Add galaxy-specific stats if multi-galaxy
    if ((session as any).galaxyMode === 'multi') {
      stats.galaxyStats = await sessionGalaxyService.getMultiGalaxyStatistics(sessionId);
    }

    return stats;
  }

  /**
   * Delete session and all associated data
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const batch = writeBatch(db);

    // Delete all galaxies
    const galaxies = await galaxyService.getSessionGalaxies(sessionId);
    for (const galaxy of galaxies) {
      await galaxyService.deleteGalaxy(galaxy.id);
    }

    // Delete session codes
    if (session.code) {
      batch.delete(doc(db, 'sessionCodes', session.code));
    }

    // Delete galaxy configuration
    batch.delete(doc(db, 'sessionGalaxyConfigs', sessionId));

    // Delete session
    batch.delete(doc(db, 'sessions', sessionId));

    await batch.commit();

    // Clean up listeners
    this.unsubscribeFromSession(sessionId);
  }

  /**
   * Get active sessions for a facilitator
   */
  async getFacilitatorSessions(
    facilitatorId: string,
    includeCompleted: boolean = false
  ): Promise<GameSession[]> {
    let sessionsQuery = query(
      collection(db, 'sessions'),
      where('facilitatorId', '==', facilitatorId)
    );

    if (!includeCompleted) {
      sessionsQuery = query(
        collection(db, 'sessions'),
        where('facilitatorId', '==', facilitatorId),
        where('gameState', '!=', 'completed')
      );
    }

    const sessionDocs = await getDocs(sessionsQuery);
    return sessionDocs.docs.map(doc => doc.data() as GameSession);
  }
}

// Export singleton instance
export const sessionService = new SessionService();

// Export types
export type { GameSession, GameState };