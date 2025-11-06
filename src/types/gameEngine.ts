// Game Engine types for Space Colony Exchange
// Core game mechanics, round progression, and state management

export interface GameEngineState {
  sessionId: string;
  currentRound: number;
  currentPhase: GamePhase;
  phaseStartTime: number;
  phaseEndTime: number;
  isPaused: boolean;
  isActive: boolean;
  gameStatus: GameStatus;
}

export type GamePhase = 
  | 'setup'
  | 'instructions'  
  | 'investments'
  | 'round_1_trading'
  | 'round_1_strategy'
  | 'round_2_trading'
  | 'round_2_strategy'
  | 'milestone_break'
  | 'round_3_trading'
  | 'round_3_strategy'
  | 'round_4_trading'
  | 'round_4_strategy'
  | 'round_5_trading'
  | 'completed';

export type GameStatus = 'waiting' | 'active' | 'paused' | 'completed' | 'error';

export interface PhaseConfig {
  name: string;
  duration: number; // milliseconds
  allowTrading: boolean;
  allowInvestments: boolean;
  allowStrategy: boolean;
  description: string;
}

export interface RoundProgressionConfig {
  phases: Record<GamePhase, PhaseConfig>;
  totalRounds: number;
  autoAdvance: boolean;
  warningTime: number; // milliseconds before phase ends
}

export interface ResourceConsumption {
  oxygen: number;
  food: number;
  water: number;
  energy: number;
}

export interface ResourceGeneration {
  scouts: { intel: number; perLevel: number };
  production: { specialty: number; perLevel: number };
  research: { techPatents: number; perLevel: number };
  communication: { marketIntel: number; perLevel: number };
  emergency: { basicResources: number; perLevel: number };
}

export interface EliminationRules {
  criticalRoundsThreshold: number; // rounds in critical mode before elimination
  criticalResources: Array<'oxygen' | 'food' | 'water' | 'energy'>;
  gracePeriod: number; // milliseconds of grace period
}

export interface ScoringRules {
  baseScore: {
    survival: number; // points per round survived
    resourceBonus: number; // points per resource unit
    tradeBonus: number; // points per successful trade
  };
  multipliers: {
    efficiency: number; // based on trade success rate
    strategy: number; // based on investment diversity
    cooperation: number; // based on number of trading partners
  };
  penalties: {
    criticalMode: number; // penalty per round in critical mode
    elimination: number; // penalty for being eliminated
  };
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  colonyType: string;
  currentScore: number;
  survivalScore: number;
  resourceScore: number;
  tradeScore: number;
  investmentScore: number;
  efficiencyMultiplier: number;
  rank: number;
  trend: 'up' | 'down' | 'same';
  roundScores: RoundScore[];
}

export interface RoundScore {
  round: number;
  phase: GamePhase;
  score: number;
  resourcesConsumed: ResourceConsumption;
  resourcesGenerated: Partial<ResourceGeneration>;
  tradesCompleted: number;
  isInCriticalMode: boolean;
  timestamp: number;
}

export interface GameEngineEvent {
  id: string;
  type: GameEngineEventType;
  sessionId: string;
  round: number;
  phase: GamePhase;
  timestamp: number;
  data: GameEngineEventData;
}

export type GameEngineEventType = 
  | 'round_started'
  | 'round_ended'
  | 'phase_changed'
  | 'resources_consumed'
  | 'resources_generated'
  | 'team_eliminated'
  | 'game_completed'
  | 'emergency_pause'
  | 'timer_warning'
  | 'achievement_unlocked';

export interface GameEngineEventData {
  phase?: GamePhase;
  timeRemaining?: number;
  teamsAffected?: string[];
  resourceChanges?: Record<string, number>;
  eliminatedTeams?: string[];
  scores?: TeamScore[];
  achievementId?: string;
  message?: string;
  [key: string]: unknown;
}

export interface PhaseTransition {
  fromPhase: GamePhase;
  toPhase: GamePhase;
  timestamp: number;
  automatic: boolean;
  reason: string;
  duration: number;
}

export interface TimerState {
  currentTime: number;
  phaseStartTime: number;
  phaseEndTime: number;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  warningTriggered: boolean;
}

export interface GameEngineCallbacks {
  onPhaseChange?: (transition: PhaseTransition) => void;
  onRoundStart?: (round: number, phase: GamePhase) => void;
  onRoundEnd?: (round: number, results: RoundResults) => void;
  onTimerWarning?: (timeRemaining: number) => void;
  onGameComplete?: (finalScores: TeamScore[]) => void;
  onTeamEliminated?: (teamId: string, round: number) => void;
  onResourcesConsumed?: (teamId: string, consumption: ResourceConsumption) => void;
  onError?: (error: GameEngineError) => void;
}

export interface RoundResults {
  round: number;
  phase: GamePhase;
  startTime: number;
  endTime: number;
  participatingTeams: string[];
  eliminatedTeams: string[];
  tradesCompleted: number;
  resourcesConsumed: Record<string, ResourceConsumption>;
  resourcesGenerated: Record<string, Partial<ResourceGeneration>>;
  scores: TeamScore[];
  events: GameEngineEvent[];
}

export interface GameEngineError {
  code: string;
  message: string;
  phase: GamePhase;
  round: number;
  timestamp: number;
  recoverable: boolean;
  details?: unknown;
}

export interface GameEngineConfig {
  sessionId: string;
  roundProgression: RoundProgressionConfig;
  resourceConsumption: ResourceConsumption;
  resourceGeneration: ResourceGeneration;
  elimination: EliminationRules;
  scoring: ScoringRules;
  callbacks?: GameEngineCallbacks;
  debug?: boolean;
}

// Default configurations
export const DEFAULT_PHASE_CONFIG: Record<GamePhase, PhaseConfig> = {
  setup: {
    name: 'Game Setup',
    duration: 0,
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: false,
    description: 'Setting up the game session'
  },
  instructions: {
    name: 'Instructions',
    duration: 5 * 60 * 1000, // 5 minutes
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: true,
    description: 'Game rules and colony briefing'
  },
  investments: {
    name: 'Investment Phase',
    duration: 5 * 60 * 1000, // 5 minutes
    allowTrading: false,
    allowInvestments: true,
    allowStrategy: true,
    description: 'Allocate credits to colony improvements'
  },
  round_1_trading: {
    name: 'Round 1 Trading',
    duration: 6 * 60 * 1000, // 6 minutes
    allowTrading: true,
    allowInvestments: false,
    allowStrategy: false,
    description: 'First trading round - establish relationships'
  },
  round_1_strategy: {
    name: 'Round 1 Strategy',
    duration: 3 * 60 * 1000, // 3 minutes
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: true,
    description: 'Review trades and plan for Round 2'
  },
  round_2_trading: {
    name: 'Round 2 Trading',
    duration: 5 * 60 * 1000, // 5 minutes
    allowTrading: true,
    allowInvestments: false,
    allowStrategy: false,
    description: 'Second trading round - build momentum'
  },
  round_2_strategy: {
    name: 'Round 2 Strategy',
    duration: 2 * 60 * 1000, // 2 minutes
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: true,
    description: 'Quick strategy review before milestone'
  },
  milestone_break: {
    name: 'Milestone Break',
    duration: 5 * 60 * 1000, // 5 minutes
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: true,
    description: 'Mid-game break and leaderboard review'
  },
  round_3_trading: {
    name: 'Round 3 Trading',
    duration: 6 * 60 * 1000, // 6 minutes
    allowTrading: true,
    allowInvestments: false,
    allowStrategy: false,
    description: 'Third trading round - alien contact possible'
  },
  round_3_strategy: {
    name: 'Round 3 Strategy',
    duration: 2 * 60 * 1000, // 2 minutes
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: true,
    description: 'Adapt to new information and threats'
  },
  round_4_trading: {
    name: 'Round 4 Trading',
    duration: 3 * 60 * 1000, // 3 minutes
    allowTrading: true,
    allowInvestments: false,
    allowStrategy: false,
    description: 'Fourth trading round - pressure mounting'
  },
  round_4_strategy: {
    name: 'Round 4 Strategy',
    duration: 3 * 60 * 1000, // 3 minutes
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: true,
    description: 'Final preparations for last round'
  },
  round_5_trading: {
    name: 'Round 5 Trading',
    duration: 4 * 60 * 1000, // 4 minutes
    allowTrading: true,
    allowInvestments: false,
    allowStrategy: false,
    description: 'Final trading round - make every trade count'
  },
  completed: {
    name: 'Game Complete',
    duration: 0,
    allowTrading: false,
    allowInvestments: false,
    allowStrategy: false,
    description: 'Game finished - calculating final scores'
  }
};

export const DEFAULT_RESOURCE_CONSUMPTION: ResourceConsumption = {
  oxygen: 2,
  food: 2, 
  water: 1,
  energy: 3
};

export const DEFAULT_ELIMINATION_RULES: EliminationRules = {
  criticalRoundsThreshold: 2,
  criticalResources: ['oxygen', 'food', 'water', 'energy'],
  gracePeriod: 30 * 1000 // 30 seconds
};

export const DEFAULT_SCORING_RULES: ScoringRules = {
  baseScore: {
    survival: 100, // 100 points per round survived
    resourceBonus: 1, // 1 point per resource unit
    tradeBonus: 50 // 50 points per successful trade
  },
  multipliers: {
    efficiency: 0.2, // 20% bonus for high trade success rate
    strategy: 0.1, // 10% bonus for investment diversity
    cooperation: 0.15 // 15% bonus for trading with many partners
  },
  penalties: {
    criticalMode: 25, // 25 point penalty per round in critical mode
    elimination: 200 // 200 point penalty for elimination
  }
};