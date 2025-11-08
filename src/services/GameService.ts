import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { AuthService } from './authService';
import type { 
  GameSession, 
  Colony, 
  ColonyType, 
  Resources,
  GameEvent,
  GameState 
} from '../types';
import { COLONY_STARTING_RESOURCES } from '../types';

// Define types for real-time data structure
interface RealtimeData {
  availableTeams: Record<string, string>;
  activeTrades: Record<string, unknown>;
  roundTimer: {
    current: number;
    remaining: number;
    phase: string;
  };
  notifications: Record<string, unknown>;
}

export class GameService {
  // Create a new game event
  static async createEvent(
    eventName: string, 
    organizationName: string,
    eventType: 'team-building' | 'leadership' | 'skills-training' | 'other',
    totalParticipants: number,
    eventDescription?: string,
    eventDate?: string
  ): Promise<string> {
    // Ensure user is authenticated and get the actual user ID
    const user = await AuthService.ensureAuthenticated();
    
    // Validate input parameters
    if (!eventName || !organizationName) {
      throw new Error('Event name and organization name are required');
    }
    
    if (totalParticipants < 1 || totalParticipants > 500) {
      throw new Error('Total participants must be between 1 and 500');
    }
    
    const eventId = `event_${Date.now()}`;
    const eventData: GameEvent = {
      id: eventId,
      name: eventName,
      organizationName,
      eventType,
      totalParticipants,
      eventDescription,
      eventDate,
      createdBy: user.uid,
      createdAt: Date.now(),
      status: 'active'
    } as any;

    await setDoc(doc(firestore, 'events', eventId), eventData);
    return eventId;
  }

  // Create a new game session within an event
  static async createSession(
    _eventId: string, 
    sessionName: string, 
    _createdBy: string = 'admin_user'
  ): Promise<string> {
    return this.createSessionWithAI(_eventId, sessionName, _createdBy, []);
  }

  // Create a new game session with AI configuration
  static async createSessionWithAI(
    _eventId: string, 
    sessionName: string, 
    _createdBy: string = 'admin_user',
    aiConfigs: import('../types/ai.types').AIColonyConfig[] = []
  ): Promise<string> {
    // Ensure user is authenticated and get the actual user ID
    const user = await AuthService.ensureAuthenticated();
    
    const sessionId = `session_${Date.now()}`;
    
    // Create 12 teams (6 colony types × 2 teams each)
    const teams = this.generateTeams(sessionId, sessionId);
    
    const sessionData: GameSession = {
      id: sessionId,
      eventId: _eventId,
      name: sessionName,
      facilitatorId: user.uid, // Use authenticated user's ID
      teams,
      currentRound: 0,
      roundStartTime: 0,
      gameState: 'setup',
      settings: {
        roundDurations: {
          instructions: 5 * 60 * 1000, // 5 minutes
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
        },
        enableAlienContact: true,
        customIntel: []
      },
      ...(aiConfigs.length > 0 && { aiConfigs })
    };

    // Save session to Firestore
    await setDoc(doc(firestore, 'sessions', sessionId), sessionData);

    // Initialize real-time data
    await this.initializeRealtimeData(sessionId);

    return sessionId;
  }

  // Generate 12 teams with proper colony distribution
  private static generateTeams(_eventId: string, sessionId: string): Colony[] {
    const colonyTypes: ColonyType[] = [
      'mining', 'agricultural', 'research', 
      'trade_hub', 'military', 'manufacturing'
    ];
    
    const teams: Colony[] = [];
    const teamLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    colonyTypes.forEach((colonyType, index) => {
      const teamLetter = teamLetters[index];
      
      // Create two teams for each colony type
      [1, 2].forEach(teamNumber => {
        const teamId = `${sessionId}_${teamLetter}${teamNumber}`;
        // Create simple 6-character game codes: AA01, AA02, BB01, BB02, etc.
        const gameCode = `${teamLetter}${teamLetter}${teamNumber.toString().padStart(2, '0')}`;
        
        const team: Colony = {
          id: teamId,
          type: colonyType,
          name: `${this.getColonyDisplayName(colonyType)} ${teamLetter}${teamNumber}`,
          teamLetter,
          teamNumber,
          players: [],
          resources: { ...COLONY_STARTING_RESOURCES[colonyType] },
          investments: {
            scouts: 0,
            productionUpgrades: 0,
            researchLabs: 0,
            communicationArray: 0,
            emergencyReserves: 0
          },
          tradingStatus: 'available',
          gameCode,
          eliminationStatus: {
            isEliminated: false,
            roundsInCritical: 0,
            criticalResources: []
          }
        };

        teams.push(team);
      });
    });

    return teams;
  }

  private static getColonyDisplayName(colonyType: ColonyType): string {
    const names = {
      mining: 'Mining Colony',
      agricultural: 'Agricultural Colony',
      research: 'Research Station',
      trade_hub: 'Trade Hub',
      military: 'Military Outpost',
      manufacturing: 'Manufacturing Base'
    };
    return names[colonyType];
  }

  // Initialize real-time database structure for live updates
  private static async initializeRealtimeData(sessionId: string) {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${sessionId}/live`);
      
      const initialData = {
        availableTeams: {},
        activeTrades: {},
        roundTimer: {
          current: 0,
          remaining: 0,
          phase: 'setup'
        },
        notifications: {}
      };

      await set(sessionRef, initialData);
    } catch (error) {
      console.warn('Realtime Database not available, continuing without real-time features:', error);
      // Continue without real-time database - session will still be created in Firestore
    }
  }

  // Join a game session with game code (legacy method)
  static async joinGame(gameCode: string): Promise<{
    sessionId: string;
    teamId: string;
    playerId: string;
  }> {
    // For now, implement a simplified version
    // In production, you'd have a proper game code lookup system
    
    try {
      // Parse the game code (AA01, BB02, etc.)
      const teamLetter = gameCode.substring(0, 1);
      const teamNumber = parseInt(gameCode.slice(-2)) || 1;
      
      // Create test IDs for demo purposes
      const sessionId = 'test_session_' + Date.now();
      const teamId = `${sessionId}_${teamLetter}${teamNumber}`;
      const playerId = `${teamId}_player_${Date.now()}`;

      // Return the parsed IDs for routing
      return { sessionId, teamId, playerId };
    } catch (error) {
      throw new Error(`Invalid game code: ${gameCode}`);
    }
  }

  // Join a specific team in a session (new method for session code flow)
  static async joinTeam(
    sessionId: string,
    teamId: string,
    playerName: string,
    role: import('../types/player.types').TeamPlayerRole = 'member',
    playerData?: import('./sessionLookupService').PlayerData
  ): Promise<{
    teamId: string;
    playerId: string;
    role: import('../types/player.types').TeamPlayerRole;
  }> {
    // Ensure user is authenticated
    const user = await AuthService.ensureAuthenticated();
    
    try {
      // Get session data
      const sessionDoc = await getDoc(this.getSessionRef(sessionId));
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data() as GameSession;
      const teamIndex = sessionData.teams.findIndex(t => t.id === teamId);
      
      if (teamIndex === -1) {
        throw new Error('Team not found');
      }

      const team = sessionData.teams[teamIndex];
      
      // Get team player limit (default 4, can be configured up to 9)
      const teamPlayerLimit = sessionData.settings?.teamPlayerLimit || 4;
      
      // Check if team is at capacity
      if (team.players.length >= teamPlayerLimit) {
        throw new Error(`Team is at capacity (${teamPlayerLimit} players)`);
      }

      // Check if user is already in this team
      const existingPlayer = team.players.find(p => p.userId === user.uid);
      if (existingPlayer) {
        return { 
          teamId, 
          playerId: existingPlayer.id,
          role: existingPlayer.role || 'member'
        };
      }

      // Check if user is in another team in this session
      const otherTeamIndex = sessionData.teams.findIndex(t => 
        t.id !== teamId && t.players.some(p => p.userId === user.uid)
      );
      if (otherTeamIndex !== -1) {
        throw new Error('You are already in another team in this session');
      }

      // Assign role - first player becomes captain if no captain exists
      let assignedRole = role;
      const hasCaptain = team.players.some(p => p.role === 'captain');
      if (!hasCaptain && team.players.length === 0) {
        assignedRole = 'captain';
      }

      // Create new player
      const playerId = `${teamId}_player_${Date.now()}`;
      const newPlayer = {
        id: playerId,
        name: playerName,
        userId: user.uid,
        role: assignedRole,
        joinedAt: Date.now(),
        isOnline: true,
        lastSeen: Date.now(),
        gameCode: team.gameCode,
        playerData: playerData || undefined
      };

      // Add player to team
      team.players.push(newPlayer);

      // Update session
      await updateDoc(this.getSessionRef(sessionId), {
        teams: sessionData.teams
      });

      // Store player data for reporting if provided
      if (playerData) {
        await this.storePlayerData(sessionId, playerId, playerData);
      }

      // Initialize player presence (done separately to not block join)
      this.initializePlayerPresence(sessionId, teamId, playerId, user.uid, playerName, assignedRole);

      return { teamId, playerId, role: assignedRole };
    } catch (error) {
      console.error('Error joining team:', error);
      throw new Error(`Failed to join team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Store player data for reporting
  private static async storePlayerData(
    sessionId: string,
    playerId: string,
    playerData: import('./sessionLookupService').PlayerData
  ): Promise<void> {
    try {
      // Store in a separate collection for privacy and reporting
      await setDoc(doc(firestore, 'playerData', `${sessionId}_${playerId}`), {
        sessionId,
        playerId,
        ...playerData,
        collectedAt: Date.now()
      });
    } catch (error) {
      console.error('Error storing player data:', error);
      // Don't throw - this is not critical for joining
    }
  }

  // Initialize player presence and team services
  private static async initializePlayerPresence(
    sessionId: string,
    teamId: string,
    playerId: string,
    userId: string,
    playerName: string,
    role: import('../types/player.types').TeamPlayerRole
  ): Promise<void> {
    try {
      // Import services dynamically to avoid circular dependencies
      const { PlayerPresenceService } = await import('./playerPresenceService');
      const { TeamChatService } = await import('./teamChatService');
      
      // Initialize presence
      const presenceService = PlayerPresenceService.getInstance(
        sessionId,
        teamId,
        playerId,
        userId
      );
      await presenceService.initialize(playerName, role);
      
      // Log player joined
      const chatService = TeamChatService.getInstance(sessionId, teamId);
      await chatService.logPlayerJoined(playerId, playerName);
      
    } catch (error) {
      console.error('Error initializing player presence:', error);
      // Don't throw - presence is not critical for joining
    }
  }

  // Update player role
  static async updatePlayerRole(
    sessionId: string,
    teamId: string,
    playerId: string,
    newRole: import('../types/player.types').TeamPlayerRole,
    _updatedBy: string
  ): Promise<void> {
    try {
      const sessionDoc = await getDoc(this.getSessionRef(sessionId));
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data() as GameSession;
      const teamIndex = sessionData.teams.findIndex(t => t.id === teamId);
      
      if (teamIndex === -1) {
        throw new Error('Team not found');
      }

      const team = sessionData.teams[teamIndex];
      const playerIndex = team.players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found');
      }

      const oldRole = team.players[playerIndex].role || 'member';
      
      // Validate role change
      if (newRole === 'captain') {
        // Check if there's already a captain
        const currentCaptain = team.players.find(p => p.role === 'captain' && p.id !== playerId);
        if (currentCaptain) {
          // Demote current captain to member
          const captainIndex = team.players.findIndex(p => p.id === currentCaptain.id);
          team.players[captainIndex].role = 'member';
        }
      }

      // Update role
      team.players[playerIndex].role = newRole;

      // Update session
      await updateDoc(this.getSessionRef(sessionId), {
        teams: sessionData.teams
      });

      // Log role change
      const { TeamChatService } = await import('./teamChatService');
      const chatService = TeamChatService.getInstance(sessionId, teamId);
      await chatService.logRoleChange(
        playerId,
        team.players[playerIndex].name,
        oldRole,
        newRole
      );

    } catch (error) {
      console.error('Error updating player role:', error);
      throw new Error(`Failed to update player role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Remove player from team
  static async removePlayerFromTeam(
    sessionId: string,
    teamId: string,
    playerId: string,
    _removedBy?: string
  ): Promise<void> {
    try {
      const sessionDoc = await getDoc(this.getSessionRef(sessionId));
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data() as GameSession;
      const teamIndex = sessionData.teams.findIndex(t => t.id === teamId);
      
      if (teamIndex === -1) {
        throw new Error('Team not found');
      }

      const team = sessionData.teams[teamIndex];
      const playerIndex = team.players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found');
      }

      const removedPlayer = team.players[playerIndex];
      
      // Remove player
      team.players.splice(playerIndex, 1);

      // If removed player was captain and team still has players, assign new captain
      if (removedPlayer.role === 'captain' && team.players.length > 0) {
        // Assign captain to the player who has been in the team longest
        const newCaptain = team.players.reduce((oldest, player) => 
          (player.joinedAt || 0) < (oldest.joinedAt || 0) ? player : oldest
        );
        newCaptain.role = 'captain';
      }

      // Update session
      await updateDoc(this.getSessionRef(sessionId), {
        teams: sessionData.teams
      });

      // Clean up player presence
      const { PlayerPresenceService } = await import('./playerPresenceService');
      const presenceService = PlayerPresenceService.getInstance(
        sessionId,
        teamId,
        playerId,
        removedPlayer.userId || ''
      );
      await presenceService.destroy();

      // Log player left
      const { TeamChatService } = await import('./teamChatService');
      const chatService = TeamChatService.getInstance(sessionId, teamId);
      await chatService.logPlayerLeft(playerId, removedPlayer.name);

    } catch (error) {
      console.error('Error removing player from team:', error);
      throw new Error(`Failed to remove player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get session data
  static async getSession(sessionId: string): Promise<GameSession | null> {
    try {
      const doc = await getDoc(this.getSessionRef(sessionId));
      return doc.exists() ? (doc.data() as GameSession) : null;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error(`Failed to fetch session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Subscribe to session updates
  static subscribeToSession(
    sessionId: string, 
    callback: (session: GameSession) => void,
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = onSnapshot(
      this.getSessionRef(sessionId),
      (doc) => {
        try {
          if (doc.exists()) {
            callback(doc.data() as GameSession);
          }
        } catch (error) {
          console.error('Error processing session update:', error);
          onError?.(error instanceof Error ? error : new Error('Unknown error in session subscription'));
        }
      },
      (error) => {
        console.error('Error in session subscription:', error);
        onError?.(error instanceof Error ? error : new Error('Firebase subscription error'));
      }
    );

    return unsubscribe;
  }

  // Subscribe to real-time updates
  static subscribeToRealtimeUpdates(
    sessionId: string,
    callback: (data: RealtimeData) => void
  ): () => void {
    const sessionRef = ref(realtimeDb, `sessions/${sessionId}/live`);
    
    onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });

    return () => off(sessionRef);
  }

  // Update game state
  static async updateGameState(sessionId: string, newState: GameState): Promise<void> {
    await updateDoc(this.getSessionRef(sessionId), {
      gameState: newState,
      roundStartTime: Date.now()
    });

    // Update real-time timer
    const timerRef = ref(realtimeDb, `sessions/${sessionId}/live/roundTimer`);
    await set(timerRef, {
      current: Date.now(),
      remaining: 0, // Calculate based on game state
      phase: newState
    });
  }

  // Update team resources
  static async updateTeamResources(
    sessionId: string, 
    teamId: string, 
    resources: Partial<Resources>
  ): Promise<void> {
    const sessionDoc = await getDoc(this.getSessionRef(sessionId));
    if (!sessionDoc.exists()) return;

    const sessionData = sessionDoc.data() as GameSession;
    const teamIndex = sessionData.teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) return;

    // Update resources
    Object.assign(sessionData.teams[teamIndex].resources, resources);

    await updateDoc(this.getSessionRef(sessionId), {
      teams: sessionData.teams
    });
  }

  // Helper method to get session document reference
  private static getSessionRef(sessionId: string) {
    return doc(firestore, 'sessions', sessionId);
  }

  // Process round end (resource consumption, generation, etc.)
  static async processRoundEnd(sessionId: string): Promise<void> {
    const sessionDoc = await getDoc(this.getSessionRef(sessionId));
    if (!sessionDoc.exists()) return;

    const sessionData = sessionDoc.data() as GameSession;
    const batch = writeBatch(firestore);

    // Process each team
    sessionData.teams.forEach(team => {
      // Resource consumption
      team.resources.oxygen = Math.max(0, team.resources.oxygen - 2);
      team.resources.food = Math.max(0, team.resources.food - 2);
      team.resources.water = Math.max(0, team.resources.water - 1);
      team.resources.energy = Math.max(0, team.resources.energy - 3);

      // Resource generation from investments
      team.resources.minerals += team.investments.productionUpgrades;
      team.resources.energy += team.investments.emergencyReserves;

      // Check critical status
      const criticalResources = [];
      if (team.resources.oxygen === 0) criticalResources.push('oxygen');
      if (team.resources.food === 0) criticalResources.push('food');
      if (team.resources.water === 0) criticalResources.push('water');
      if (team.resources.energy === 0) criticalResources.push('energy');

      if (criticalResources.length > 0) {
        team.eliminationStatus.roundsInCritical++;
        team.eliminationStatus.criticalResources = criticalResources;
        
        // Eliminate after 2 rounds in critical
        if (team.eliminationStatus.roundsInCritical >= 2) {
          team.eliminationStatus.isEliminated = true;
        }
      } else {
        team.eliminationStatus.roundsInCritical = 0;
        team.eliminationStatus.criticalResources = [];
      }
    });

    // Update session
    batch.update(this.getSessionRef(sessionId), {
      teams: sessionData.teams,
      currentRound: sessionData.currentRound + 1
    });

    await batch.commit();
  }
}