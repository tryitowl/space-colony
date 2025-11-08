/**
 * Flexible Game Service
 * 
 * Extends the standard GameService to support multi-galaxy game sessions
 * with dynamic team counts and flexible configurations
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { GameService } from './GameService';
import { galaxyService } from './galaxyService';
import { sessionCodeService } from './sessionCodeService';
import { configurationValidationService } from './configurationValidationService';
import { teamDataService } from './teamDataService';
import type {
  GameSession,
  Colony,
  GameState,
  Player
} from '../types';
import type {
  Galaxy,
  GalaxyConfiguration,
  EnhancedColony,
  SessionCodeMapping
} from '../types/galaxy.types';
import type { AIColonyConfig } from '../types/ai.types';
import { AuthService } from './authService';

interface FlexibleGameSession extends GameSession {
  galaxyConfiguration: GalaxyConfiguration;
  galaxies: Galaxy[];
  sessionCodeMapping: SessionCodeMapping;
  totalTeams: number;
  totalPlayers: number;
}

interface RealtimeGalaxyData {
  [galaxyId: string]: {
    availableTeams: Record<string, string>;
    activeTrades: Record<string, unknown>;
    roundTimer: {
      current: number;
      remaining: number;
      phase: string;
    };
    notifications: Record<string, unknown>;
  };
}

export class FlexibleGameService extends GameService {
  /**
   * Create a new multi-galaxy game session
   */
  static async createFlexibleSession(
    eventId: string,
    sessionName: string,
    galaxyConfiguration: GalaxyConfiguration,
    aiConfigs: AIColonyConfig[] = []
  ): Promise<string> {
    // Ensure user is authenticated
    const user = await AuthService.ensureAuthenticated();
    
    // Validate configuration
    const validationResult = await configurationValidationService.validate(galaxyConfiguration);
    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.map((e: any) => e.message).join(', ')}`);
    }

    const sessionId = `flex_session_${Date.now()}`;
    
    // Create galaxies
    const galaxies: Galaxy[] = [];
    for (let i = 0; i < (galaxyConfiguration.galaxies?.length ?? 0); i++) {
      const galaxyConfig = galaxyConfiguration.galaxies?.[i];
      if (!galaxyConfig) continue;
      const galaxy = await galaxyService.createGalaxy(sessionId, galaxyConfig, i);
      galaxies.push(galaxy);
    }

    // Generate teams for each galaxy
    const allTeams: EnhancedColony[] = [];
    const sessionCodeMapping: SessionCodeMapping = {
      sessionId,
      galaxyMappings: {}
    };

    for (const galaxy of galaxies) {
      // Generate teams using the team generation service
      const teams = await galaxyService.generateAndAssignTeams(galaxy.id, sessionId);
      allTeams.push(...teams);

      // Build code mapping
      sessionCodeMapping.galaxyMappings[galaxy.id] = {
        galaxyId: galaxy.id,
        galaxyName: galaxy.name,
        teamCodes: {}
      };

      teams.forEach(team => {
        sessionCodeMapping.galaxyMappings[galaxy.id].teamCodes[team.gameCode] = {
          teamId: team.id,
          teamName: team.name,
          colonyType: team.type
        };
      });
    }
    
    // Save teams to root collection using teamDataService
    for (const team of allTeams) {
      await teamDataService.createTeam({
        ...team,
        sessionId,
        eventId
      } as Colony);
    }

    // Apply AI configurations
    const aiTeams = allTeams.filter(team => team.isAIControlled);
    if (aiConfigs.length > 0) {
      // Map AI configs to AI teams
      aiTeams.forEach((team, index) => {
        if (index < aiConfigs.length) {
          team.aiConfig = aiConfigs[index];
        }
      });
    }

    // Create the flexible game session
    const sessionData: FlexibleGameSession = {
      id: sessionId,
      eventId,
      name: sessionName,
      facilitatorId: user.uid,
      teams: allTeams as Colony[],
      currentRound: 0,
      roundStartTime: 0,
      gameState: 'setup',
      settings: {
        roundDurations: Array.isArray(galaxyConfiguration.timing?.roundDurations)
          ? this.getDefaultRoundDurations()
          : (galaxyConfiguration.timing?.roundDurations as any || this.getDefaultRoundDurations()),
        enableAlienContact: true,
        customIntel: []
      },
      galaxyConfiguration,
      galaxies,
      sessionCodeMapping,
      totalTeams: allTeams.length,
      totalPlayers: 0 // Will be updated as players join
    };
    
    // Only add aiConfigs if there are AI teams with configs
    const validAiConfigs = aiTeams.map(team => team.aiConfig).filter(Boolean);
    if (validAiConfigs.length > 0) {
      (sessionData as any).aiConfigs = validAiConfigs;
    }

    // Save session to Firestore
    await setDoc(doc(firestore, 'sessions', sessionId), sessionData);

    // Save code mappings (only if masterCode exists)
    if (sessionCodeMapping.masterCode) {
      await sessionCodeService.saveSessionCodeMapping({
        code: sessionCodeMapping.masterCode,
        sessionId: sessionId,
        isCustom: false
      });
    }

    // Initialize real-time data for each galaxy
    await this.initializeMultiGalaxyRealtimeData(sessionId, galaxies);

    return sessionId;
  }

  /**
   * Initialize real-time data structures for multi-galaxy sessions
   */
  private static async initializeMultiGalaxyRealtimeData(
    sessionId: string,
    galaxies: Galaxy[]
  ): Promise<void> {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${sessionId}/live`);
      
      const galaxyData: RealtimeGalaxyData = {};
      
      galaxies.forEach(galaxy => {
        galaxyData[galaxy.id] = {
          availableTeams: {},
          activeTrades: {},
          roundTimer: {
            current: 0,
            remaining: 0,
            phase: 'setup'
          },
          notifications: {}
        };
      });

      const initialData = {
        galaxies: galaxyData,
        global: {
          roundTimer: {
            current: 0,
            remaining: 0,
            phase: 'setup'
          },
          leaderboard: {},
          events: []
        }
      };

      await set(sessionRef, initialData);
    } catch (error) {
      console.warn('Realtime Database not available, continuing without real-time features:', error);
    }
  }

  /**
   * Join a flexible game session using a game code
   */
  static async joinFlexibleGame(gameCode: string): Promise<{
    sessionId: string;
    teamId: string;
    playerId: string;
    galaxyId: string;
  }> {
    // Look up the game code in the session code service
    const codeInfo = await sessionCodeService.lookupCode(gameCode);

    if (!codeInfo) {
      throw new Error(`Invalid game code: ${gameCode}`);
    }

    const sessionId = codeInfo.sessionId;
    // For flexible sessions, we'll determine teamId and galaxyId from the session
    const teamId = `temp_team_${Date.now()}`;
    const galaxyId = `temp_galaxy_${Date.now()}`;
    const playerId = `${teamId}_player_${Date.now()}`;

    // Update team with new player
    await this.addPlayerToTeam(sessionId, teamId, playerId);

    return { sessionId, teamId, playerId, galaxyId };
  }

  /**
   * Get flexible session data
   */
  static async getFlexibleSession(sessionId: string): Promise<FlexibleGameSession | null> {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'sessions', sessionId));
      if (!sessionDoc.exists()) {
        return null;
      }

      const sessionData = sessionDoc.data() as FlexibleGameSession;
      
      // Load galaxies if not included
      if (!sessionData.galaxies && sessionData.galaxyConfiguration) {
        sessionData.galaxies = await galaxyService.getSessionGalaxies(sessionId);
      }
      
      // Load teams from root collection
      const teams = await teamDataService.getSessionTeams(sessionId);
      sessionData.teams = teams;

      return sessionData;
    } catch (error) {
      console.error('Error fetching flexible session:', error);
      throw new Error(`Failed to fetch session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update game state for all galaxies
   */
  static async updateFlexibleGameState(sessionId: string, newState: GameState): Promise<void> {
    const session = await this.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Update main session state
    await updateDoc(doc(firestore, 'sessions', sessionId), {
      gameState: newState,
      roundStartTime: Date.now()
    });

    // Update real-time timers for all galaxies
    if (session.galaxies) {
      for (const galaxy of session.galaxies) {
        const timerRef = ref(realtimeDb, `sessions/${sessionId}/live/galaxies/${galaxy.id}/roundTimer`);
        await set(timerRef, {
          current: Date.now(),
          remaining: this.getRoundDuration(newState, session.settings),
          phase: newState
        });
      }
    }

    // Update global timer
    const globalTimerRef = ref(realtimeDb, `sessions/${sessionId}/live/global/roundTimer`);
    await set(globalTimerRef, {
      current: Date.now(),
      remaining: this.getRoundDuration(newState, session.settings),
      phase: newState
    });
  }

  /**
   * Subscribe to flexible session updates with galaxy filtering
   */
  static subscribeToFlexibleSession(
    sessionId: string,
    callback: (session: FlexibleGameSession) => void,
    galaxyFilter?: string[],
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = onSnapshot(
      doc(firestore, 'sessions', sessionId),
      async (doc) => {
        try {
          if (doc.exists()) {
            let sessionData = doc.data() as FlexibleGameSession;
            
            // Apply galaxy filter if specified
            if (galaxyFilter && galaxyFilter.length > 0) {
              sessionData = {
                ...sessionData,
                teams: sessionData.teams.filter(team => 
                  galaxyFilter.includes(team.galaxyId || '')
                )
              };
            }
            
            callback(sessionData);
          }
        } catch (error) {
          console.error('Error processing flexible session update:', error);
          onError?.(error instanceof Error ? error : new Error('Unknown error in session subscription'));
        }
      },
      (error) => {
        console.error('Error in flexible session subscription:', error);
        onError?.(error instanceof Error ? error : new Error('Firebase subscription error'));
      }
    );

    return unsubscribe;
  }

  /**
   * Subscribe to galaxy-specific real-time updates
   */
  static subscribeToGalaxyRealtimeUpdates(
    sessionId: string,
    galaxyId: string,
    callback: (data: any) => void
  ): () => void {
    const galaxyRef = ref(realtimeDb, `sessions/${sessionId}/live/galaxies/${galaxyId}`);
    
    onValue(galaxyRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });

    return () => off(galaxyRef);
  }

  /**
   * Process round end for multi-galaxy sessions
   */
  static async processFlexibleRoundEnd(sessionId: string): Promise<void> {
    const session = await this.getFlexibleSession(sessionId);
    if (!session) return;

    const batch = writeBatch(firestore);

    // Process each team across all galaxies
    for (const team of session.teams) {
      // Apply galaxy-specific resource modifiers if any
      const galaxy = session.galaxies?.find(g => g.id === team.galaxyId);
      let consumptionMultiplier = 1;
      let productionMultiplier = 1;

      if (galaxy?.resourceModifiers) {
        consumptionMultiplier = galaxy.resourceModifiers.consumptionMultipliers?.oxygen || 1;
        productionMultiplier = galaxy.resourceModifiers.productionMultipliers?.energy || 1;
      }

      // Calculate new resource values
      const updatedResources = {
        oxygen: Math.max(0, team.resources.oxygen - (2 * consumptionMultiplier)),
        food: Math.max(0, team.resources.food - (2 * consumptionMultiplier)),
        water: Math.max(0, team.resources.water - (1 * consumptionMultiplier)),
        energy: Math.max(0, team.resources.energy - (3 * consumptionMultiplier)),
        minerals: team.resources.minerals + (team.investments.productionUpgrades * productionMultiplier)
      };

      // Update resources via teamDataService
      await teamDataService.updateTeamResources(team.id, updatedResources);

      // Check critical status
      const criticalResources = [];
      if (updatedResources.oxygen === 0) criticalResources.push('oxygen');
      if (updatedResources.food === 0) criticalResources.push('food');
      if (updatedResources.water === 0) criticalResources.push('water');
      if (updatedResources.energy === 0) criticalResources.push('energy');

      let eliminationUpdate: any = {};
      if (criticalResources.length > 0) {
        eliminationUpdate.eliminationStatus = {
          roundsInCritical: team.eliminationStatus.roundsInCritical + 1,
          criticalResources,
          isEliminated: team.eliminationStatus.isEliminated
        };
        
        // Check galaxy-specific elimination rules
        const eliminationRounds = galaxy?.specialRules?.find(r => r.type === 'elimination_rounds')?.value || 2;
        
        if (eliminationUpdate.eliminationStatus.roundsInCritical >= eliminationRounds) {
          eliminationUpdate.eliminationStatus.isEliminated = true;
        }
      } else {
        eliminationUpdate.eliminationStatus = {
          roundsInCritical: 0,
          criticalResources: [],
          isEliminated: false
        };
      }
      
      // Update team status
      await teamDataService.updateTeam(team.id, eliminationUpdate);
    }

    // Update session round count
    batch.update(doc(firestore, 'sessions', sessionId), {
      currentRound: session.currentRound + 1
    });

    await batch.commit();

    // Update galaxy statistics
    if (session.galaxies) {
      for (const galaxy of session.galaxies) {
        await galaxyService.getGalaxyStatistics(galaxy.id);
      }
    }
  }

  /**
   * Get teams for a specific galaxy
   */
  static async getGalaxyTeams(sessionId: string, galaxyId: string): Promise<Colony[]> {
    const session = await this.getFlexibleSession(sessionId);
    if (!session) return [];

    return session.teams.filter(team => team.galaxyId === galaxyId);
  }

  /**
   * Get cross-galaxy leaderboard
   */
  static async getCrossGalaxyLeaderboard(sessionId: string): Promise<{
    byGalaxy: Record<string, Colony[]>;
    overall: Colony[];
  }> {
    const session = await this.getFlexibleSession(sessionId);
    if (!session) {
      return { byGalaxy: {}, overall: [] };
    }

    // Calculate scores for each team
    const teamsWithScores = session.teams.map(team => ({
      ...team,
      score: this.calculateTeamScore(team)
    }));

    // Sort overall
    const overall = [...teamsWithScores].sort((a, b) => b.score - a.score);

    // Group and sort by galaxy
    const byGalaxy: Record<string, Colony[]> = {};
    session.galaxies?.forEach(galaxy => {
      byGalaxy[galaxy.id] = teamsWithScores
        .filter(team => team.galaxyId === galaxy.id)
        .sort((a, b) => b.score - a.score);
    });

    return { byGalaxy, overall };
  }

  /**
   * Calculate team score for leaderboard
   */
  private static calculateTeamScore(team: Colony): number {
    if (team.eliminationStatus.isEliminated) return 0;

    let score = 0;
    
    // Resource value calculation
    const resourceWeights = {
      oxygen: 3,
      food: 3,
      water: 3,
      energy: 2.5,
      minerals: 1.5,
      electronics: 2,
      medicine: 2.5,
      luxuryGoods: 1,
      rareMinerals: 3
    };

    // Only count numeric resources for scoring
    const numericResources = ['oxygen', 'food', 'water', 'energy', 'minerals', 'electronics', 'medicine', 'luxuryGoods', 'rareMinerals'];
    numericResources.forEach(resource => {
      const amount = (team.resources as any)?.[resource];
      if (typeof amount === 'number' && resource in resourceWeights) {
        score += amount * (resourceWeights as any)[resource];
      }
    });

    // Investment bonus
    const totalInvestments = Object.values(team.investments).reduce((sum, val) => sum + val, 0);
    score += totalInvestments * 10;

    return Math.round(score);
  }

  /**
   * Get default round durations
   */
  private static getDefaultRoundDurations() {
    return {
      instructions: 5 * 60 * 1000,
      investments: 5 * 60 * 1000,
      round1Trading: 6 * 60 * 1000,
      round1Strategy: 3 * 60 * 1000,
      round2Trading: 5 * 60 * 1000,
      round2Strategy: 2 * 60 * 1000,
      milestoneBreak: 5 * 60 * 1000,
      round3Trading: 6 * 60 * 1000,
      round3Strategy: 2 * 60 * 1000,
      round4Trading: 3 * 60 * 1000,
      round4Strategy: 3 * 60 * 1000,
      round5Trading: 4 * 60 * 1000,
    };
  }

  /**
   * Get round duration based on game state
   */
  private static getRoundDuration(gameState: GameState, settings: any): number {
    const durations = settings.roundDurations || this.getDefaultRoundDurations();
    
    const stateToRoundMap: Record<GameState, keyof typeof durations> = {
      'setup': 'instructions',
      'investments': 'investments',
      'round_1': 'round1Trading',
      'strategy_1': 'round1Strategy',
      'round_2': 'round2Trading',
      'strategy_2': 'round2Strategy',
      'milestone_break': 'milestoneBreak',
      'round_3': 'round3Trading',
      'strategy_3': 'round3Strategy',
      'round_4': 'round4Trading',
      'strategy_4': 'round4Strategy',
      'round_5': 'round5Trading',
      'completed': 'instructions'
    };

    return durations[stateToRoundMap[gameState]] || 5 * 60 * 1000;
  }

  /**
   * Add player to team
   */
  private static async addPlayerToTeam(
    sessionId: string,
    teamId: string,
    playerId: string
  ): Promise<void> {
    const team = await teamDataService.getTeam(teamId);
    if (!team) return;

    // Add player to team
    const newPlayer: Player = {
      id: playerId,
      name: `Player ${team.players.length + 1}`,
      gameCode: 'TEMP',
      isOnline: true,
      lastSeen: Date.now(),
      joinedAt: Date.now()
    };
    
    const updatedPlayers = [...team.players, newPlayer];
    
    // Update team via teamDataService
    await teamDataService.updateTeam(teamId, { players: updatedPlayers });
    
    // Update session player count
    const session = await getDoc(doc(firestore, 'sessions', sessionId));
    if (session.exists()) {
      await updateDoc(doc(firestore, 'sessions', sessionId), {
        totalPlayers: (session.data().totalPlayers || 0) + 1
      });
    }
  }

  /**
   * Check if session is using flexible galaxy configuration
   */
  static async isFlexibleSession(sessionId: string): Promise<boolean> {
    const sessionDoc = await getDoc(doc(firestore, 'sessions', sessionId));
    if (!sessionDoc.exists()) return false;

    const data = sessionDoc.data();
    return !!data.galaxyConfiguration && !!data.galaxies;
  }

  /**
   * Migrate standard session to flexible configuration
   */
  static async migrateToFlexibleSession(
    sessionId: string,
    galaxyConfiguration: GalaxyConfiguration
  ): Promise<void> {
    const standardSession = await this.getSession(sessionId);
    if (!standardSession) {
      throw new Error('Session not found');
    }

    // Validate new configuration
    const validationResult = await configurationValidationService.validateFullConfiguration(galaxyConfiguration);
    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.map((e: import('../types/validation.types').ValidationError) => e.message).join(', ')}`);
    }

    // Create default galaxy for existing teams
    const defaultGalaxy = await galaxyService.createGalaxy(sessionId, {
      name: 'Original Galaxy',
      description: 'Migrated from standard session',
      totalTeams: standardSession.teams.length,
      colonyTypes: Array.from(new Set(standardSession.teams.map(t => t.type))),
      teamStructure: { mode: 'custom' }
    }, 0);

    // Assign existing teams to default galaxy
    const teamAssignments = standardSession.teams.map(team => ({
      teamId: team.id,
      galaxyId: defaultGalaxy.id,
      colonyType: team.type,
      isAIControlled: team.isAIControlled || false
    }));

    await galaxyService.assignTeamsToGalaxy(defaultGalaxy.id, teamAssignments);

    // Update session with flexible configuration
    await updateDoc(doc(firestore, 'sessions', sessionId), {
      galaxyConfiguration,
      galaxies: [defaultGalaxy],
      sessionCodeMapping: {
        sessionId,
        galaxyMappings: {
          [defaultGalaxy.id]: {
            galaxyId: defaultGalaxy.id,
            galaxyName: defaultGalaxy.name,
            teamCodes: standardSession.teams.reduce((acc, team) => {
              acc[team.gameCode] = {
                teamId: team.id,
                teamName: team.name,
                colonyType: team.type
              };
              return acc;
            }, {} as Record<string, any>)
          }
        }
      }
    });
  }
}

// Export the flexible game service
export default FlexibleGameService;