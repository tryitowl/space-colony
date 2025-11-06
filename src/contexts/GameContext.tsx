import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { GameSession, Colony, TradeOffer, Resources, Investments } from '../types';
import { GameService } from '../services/GameService';
import { TradingService } from '../services/tradingService';
import { GameEngineService } from '../services/gameEngineService';
import { RoundService } from '../services/roundService';
import { ResourceManagementService } from '../services/resourceManagementService';
import { ScoringService } from '../services/scoringService';
import { AIIntegrationService } from '../services/aiIntegrationService';
import type { 
  GameEngineState, 
  TimerState, 
  TeamScore
} from '../types/gameEngine';
import type { ResourceAlert } from '../services/resourceManagementService';
import type { LeaderboardEntry, Achievement, ScoreBreakdown } from '../services/scoringService';

interface GameState {
  session: GameSession | null;
  currentTeam: Colony | null;
  incomingTrades: TradeOffer[];
  tradingStatus: Record<string, string>;
  loading: boolean;
  error: string | null;
  connected: boolean;
  // Game Engine state
  gameEngine: GameEngineState | null;
  timerState: TimerState | null;
  leaderboard: LeaderboardEntry[];
  teamScore: TeamScore | null;
  resourceAlerts: ResourceAlert[];
  achievements: Achievement[];
  scoreBreakdown: ScoreBreakdown | null;
}

type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION'; payload: GameSession }
  | { type: 'SET_CURRENT_TEAM'; payload: Colony }
  | { type: 'SET_INCOMING_TRADES'; payload: TradeOffer[] }
  | { type: 'SET_TRADING_STATUS'; payload: Record<string, string> }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'UPDATE_TEAM_RESOURCES'; payload: { teamId: string; resources: Partial<Resources> } }
  // Game Engine actions
  | { type: 'SET_GAME_ENGINE_STATE'; payload: GameEngineState }
  | { type: 'SET_TIMER_STATE'; payload: TimerState }
  | { type: 'SET_LEADERBOARD'; payload: LeaderboardEntry[] }
  | { type: 'SET_TEAM_SCORE'; payload: TeamScore }
  | { type: 'SET_RESOURCE_ALERTS'; payload: ResourceAlert[] }
  | { type: 'ADD_ACHIEVEMENT'; payload: Achievement }
  | { type: 'SET_SCORE_BREAKDOWN'; payload: ScoreBreakdown };

const initialState: GameState = {
  session: null,
  currentTeam: null,
  incomingTrades: [],
  tradingStatus: {},
  loading: false,
  error: null,
  connected: false,
  // Game Engine initial state
  gameEngine: null,
  timerState: null,
  leaderboard: [],
  teamScore: null,
  resourceAlerts: [],
  achievements: [],
  scoreBreakdown: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_SESSION':
      return { ...state, session: action.payload, loading: false };
    case 'SET_CURRENT_TEAM':
      return { ...state, currentTeam: action.payload };
    case 'SET_INCOMING_TRADES':
      return { ...state, incomingTrades: action.payload };
    case 'SET_TRADING_STATUS':
      return { ...state, tradingStatus: action.payload };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'UPDATE_TEAM_RESOURCES':
      if (!state.session) return state;
      const updatedTeams = state.session.teams.map(team =>
        team.id === action.payload.teamId
          ? { ...team, resources: { ...team.resources, ...action.payload.resources } }
          : team
      );
      return {
        ...state,
        session: { ...state.session, teams: updatedTeams },
        currentTeam: state.currentTeam?.id === action.payload.teamId
          ? { ...state.currentTeam, resources: { ...state.currentTeam.resources, ...action.payload.resources } }
          : state.currentTeam
      };
    // Game Engine cases
    case 'SET_GAME_ENGINE_STATE':
      return { ...state, gameEngine: action.payload };
    case 'SET_TIMER_STATE':
      return { ...state, timerState: action.payload };
    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.payload };
    case 'SET_TEAM_SCORE':
      return { ...state, teamScore: action.payload };
    case 'SET_RESOURCE_ALERTS':
      return { ...state, resourceAlerts: action.payload };
    case 'ADD_ACHIEVEMENT':
      return { 
        ...state, 
        achievements: [...state.achievements, action.payload]
      };
    case 'SET_SCORE_BREAKDOWN':
      return { ...state, scoreBreakdown: action.payload };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  joinGame: (gameCode: string) => Promise<{ sessionId: string; teamId: string; playerId: string }>;
  createTrade: (targetTeamId: string, offer: Partial<Resources>, request: Partial<Resources>) => Promise<void>;
  acceptTrade: (tradeId: string) => Promise<void>;
  rejectTrade: (tradeId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  // Game Engine methods
  startGame: () => Promise<void>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  advancePhase: () => Promise<void>;
  purchaseInvestment: (investmentType: keyof Investments, amount: number) => Promise<void>;
  getResourceProjection: () => Promise<any>;
  getScoreBreakdown: () => Promise<ScoreBreakdown | null>;
  refreshGameState: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: React.ReactNode;
  sessionId?: string;
  teamId?: string;
}

export const GameProvider: React.FC<GameProviderProps> = ({ 
  children, 
  sessionId, 
  teamId 
}) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Game Engine services references
  const gameEngineRef = useRef<GameEngineService | null>(null);
  const roundServiceRef = useRef<RoundService | null>(null);
  const resourceServiceRef = useRef<ResourceManagementService | null>(null);
  const scoringServiceRef = useRef<ScoringService | null>(null);

  // Initialize game session and services
  useEffect(() => {
    if (!sessionId) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    // Initialize game engine services
    const initializeGameEngine = async () => {
      try {
        // Initialize Game Engine
        gameEngineRef.current = GameEngineService.getInstance(sessionId, {
          sessionId,
          callbacks: {
            onPhaseChange: (transition) => {
              console.log('Phase changed:', transition);
              refreshGameState();
            },
            onRoundEnd: (round, results) => {
              console.log('Round ended:', round, results);
              refreshGameState();
            },
            onTimerWarning: (timeRemaining) => {
              console.log('Timer warning:', timeRemaining);
            },
            onGameComplete: (finalScores) => {
              console.log('Game completed:', finalScores);
              dispatch({ type: 'SET_LEADERBOARD', payload: finalScores as LeaderboardEntry[] });
            },
            onTeamEliminated: (teamId, round) => {
              console.log('Team eliminated:', teamId, round);
            },
            onError: (error) => {
              console.error('Game engine error:', error);
              dispatch({ type: 'SET_ERROR', payload: error.message });
            }
          }
        });

        await gameEngineRef.current.initialize();

        // Initialize other services
        roundServiceRef.current = RoundService.getInstance(sessionId);
        resourceServiceRef.current = ResourceManagementService.getInstance(sessionId, {
          sessionId,
          enableRealTimeTracking: true,
          debug: true
        });
        scoringServiceRef.current = ScoringService.getInstance(sessionId, {
          sessionId,
          enableRealTimeUpdates: true,
          calculateTrends: true,
          trackAchievements: true
        });

        console.log('Game engine services initialized');

        // Initialize AI colonies if configured
        await AIIntegrationService.initializeAIForSession(sessionId);

      } catch (error) {
        console.error('Error initializing game engine:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize game engine' });
      }
    };

    initializeGameEngine();

    const unsubscribeSession = GameService.subscribeToSession(sessionId, (sessionData) => {
      dispatch({ type: 'SET_SESSION', payload: sessionData });
      
      // Find current team
      if (teamId) {
        const currentTeam = sessionData.teams.find(t => t.id === teamId);
        if (currentTeam) {
          dispatch({ type: 'SET_CURRENT_TEAM', payload: currentTeam });
          
          // Update team-specific data
          updateTeamData(currentTeam);
        }
      }
      
      dispatch({ type: 'SET_CONNECTED', payload: true });
    });

    // Subscribe to trading status
    const unsubscribeTradingStatus = TradingService.subscribeToTradingStatus(
      sessionId,
      (statusData) => {
        dispatch({ type: 'SET_TRADING_STATUS', payload: statusData });
      }
    );

    // Subscribe to incoming trades
    let unsubscribeTrades: (() => void) | null = null;
    if (teamId) {
      unsubscribeTrades = TradingService.subscribeToTeamTrades(
        sessionId,
        teamId,
        (trades) => {
          dispatch({ type: 'SET_INCOMING_TRADES', payload: trades });
        }
      );
    }

    // Subscribe to game engine state
    let unsubscribeGameEngine: (() => void) | null = null;
    if (gameEngineRef.current) {
      unsubscribeGameEngine = gameEngineRef.current.subscribe((gameEngineState) => {
        dispatch({ type: 'SET_GAME_ENGINE_STATE', payload: gameEngineState });
        dispatch({ type: 'SET_TIMER_STATE', payload: gameEngineRef.current!.getTimerState() });
      });
    }

    return () => {
      unsubscribeSession();
      unsubscribeTradingStatus();
      if (unsubscribeTrades) {
        unsubscribeTrades();
      }
      if (unsubscribeGameEngine) {
        unsubscribeGameEngine();
      }
      
      // Cleanup services
      gameEngineRef.current?.destroy();
      roundServiceRef.current?.destroy();
      resourceServiceRef.current?.destroy();
      scoringServiceRef.current?.destroy();
      
      // Cleanup AI services
      if (sessionId) {
        AIIntegrationService.cleanupAIForSession(sessionId);
      }
    };
  }, [sessionId, teamId]);

  // Helper functions
  const updateTeamData = async (team: Colony) => {
    if (!resourceServiceRef.current || !scoringServiceRef.current) return;

    try {
      // Update resource alerts
      const alerts = resourceServiceRef.current.getResourceAlerts(team.id);
      dispatch({ type: 'SET_RESOURCE_ALERTS', payload: alerts });

      // Update team score and achievements
      const teamScore = await scoringServiceRef.current.calculateTeamScore(team, state.gameEngine?.currentRound || 0);
      dispatch({ type: 'SET_TEAM_SCORE', payload: teamScore });

      const achievements = await scoringServiceRef.current.processAchievements(team);
      achievements.forEach(achievement => {
        dispatch({ type: 'ADD_ACHIEVEMENT', payload: achievement });
      });

    } catch (error) {
      console.error('Error updating team data:', error);
    }
  };

  const refreshGameState = async () => {
    if (!sessionId || !gameEngineRef.current) return;

    try {
      // Refresh game engine state
      const gameEngineState = gameEngineRef.current.getState();
      const timerState = gameEngineRef.current.getTimerState();
      
      dispatch({ type: 'SET_GAME_ENGINE_STATE', payload: gameEngineState });
      dispatch({ type: 'SET_TIMER_STATE', payload: timerState });

      // Refresh leaderboard if scoring service is available
      if (scoringServiceRef.current && state.session) {
        const leaderboard = await scoringServiceRef.current.updateLeaderboard(state.session.teams, gameEngineState.currentRound);
        dispatch({ type: 'SET_LEADERBOARD', payload: leaderboard });
      }

    } catch (error) {
      console.error('Error refreshing game state:', error);
    }
  };

  const joinGame = async (gameCode: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const result = await GameService.joinGame(gameCode);
      
      // Navigation would be handled by the component calling this
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to join game' });
      throw error;
    }
  };

  const createTrade = async (targetTeamId: string, offer: Partial<Resources>, request: Partial<Resources>) => {
    if (!sessionId || !teamId) {
      throw new Error('Session or team not available');
    }

    try {
      await TradingService.createTradeOffer(sessionId, teamId, targetTeamId, offer, request);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create trade' });
      throw error;
    }
  };

  const acceptTrade = async (tradeId: string) => {
    if (!sessionId || !teamId) {
      throw new Error('Session or team not available');
    }

    try {
      await TradingService.acceptTradeOffer(sessionId, tradeId, teamId);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to accept trade' });
      throw error;
    }
  };

  const rejectTrade = async (tradeId: string) => {
    if (!sessionId || !teamId) {
      throw new Error('Session or team not available');
    }

    try {
      await TradingService.rejectTradeOffer(sessionId, tradeId, teamId);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to reject trade' });
      throw error;
    }
  };

  const refreshSession = async () => {
    if (!sessionId) return;

    try {
      const sessionData = await GameService.getSession(sessionId);
      if (sessionData) {
        dispatch({ type: 'SET_SESSION', payload: sessionData });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to refresh session' });
    }
  };

  // Game Engine methods
  const startGame = async () => {
    if (!gameEngineRef.current) {
      throw new Error('Game engine not initialized');
    }

    try {
      await gameEngineRef.current.startGame();
      await refreshGameState();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to start game' });
      throw error;
    }
  };

  const pauseGame = async () => {
    if (!gameEngineRef.current) {
      throw new Error('Game engine not initialized');
    }

    try {
      await gameEngineRef.current.pauseGame();
      await refreshGameState();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to pause game' });
      throw error;
    }
  };

  const resumeGame = async () => {
    if (!gameEngineRef.current) {
      throw new Error('Game engine not initialized');
    }

    try {
      await gameEngineRef.current.resumeGame();
      await refreshGameState();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to resume game' });
      throw error;
    }
  };

  const advancePhase = async () => {
    if (!gameEngineRef.current) {
      throw new Error('Game engine not initialized');
    }

    try {
      await gameEngineRef.current.advancePhase(true); // forced = true for manual advance
      await refreshGameState();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to advance phase' });
      throw error;
    }
  };

  const purchaseInvestment = async (investmentType: keyof Investments, amount: number) => {
    if (!resourceServiceRef.current || !teamId) {
      throw new Error('Resource management service not initialized or team ID missing');
    }

    try {
      await resourceServiceRef.current.purchaseInvestment(teamId, investmentType, amount);

      // Refresh session to get updated team data
      await refreshSession();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to purchase investment' });
      throw error;
    }
  };

  const getResourceProjection = async () => {
    if (!resourceServiceRef.current || !state.currentTeam) {
      throw new Error('Resource management service not initialized or no current team');
    }

    try {
      return resourceServiceRef.current.calculateResourceProjection(state.currentTeam);
    } catch (error) {
      console.error('Error getting resource projection:', error);
      return null;
    }
  };

  const getScoreBreakdown = async (): Promise<ScoreBreakdown | null> => {
    if (!scoringServiceRef.current || !teamId) {
      return null;
    }

    try {
      const breakdown = await scoringServiceRef.current.getScoreBreakdown(teamId);
      dispatch({ type: 'SET_SCORE_BREAKDOWN', payload: breakdown });
      return breakdown;
    } catch (error) {
      console.error('Error getting score breakdown:', error);
      return null;
    }
  };

  const contextValue: GameContextType = {
    state,
    joinGame,
    createTrade,
    acceptTrade,
    rejectTrade,
    refreshSession,
    // Game Engine methods
    startGame,
    pauseGame,
    resumeGame,
    advancePhase,
    purchaseInvestment,
    getResourceProjection,
    getScoreBreakdown,
    refreshGameState,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};