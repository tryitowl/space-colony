// Core game types for Space Colony Exchange

// Re-export base types
export * from './base.types';

// Import types needed for interfaces
import type { 
  ColonyType, 
  Player, 
  Resources, 
  Investments, 
  TradingStatus, 
  EliminationStatus,
  IntelItem 
} from './base.types';

// User role types
export type UserRole = 'admin' | 'facilitator' | 'player';

export interface FacilitatorAccess {
  facilitatorId: string;
  facilitatorCode: string;
  eventIds: string[];
  sessionIds: string[];
  createdAt: number;
  lastAccess: number;
}

export interface Colony {
  id: string;
  type: ColonyType;
  name: string;
  teamLetter: string; // A, B, C, D, E, F
  teamNumber: number; // 1 or 2
  players: Player[];
  resources: Resources;
  investments: Investments;
  tradingStatus: TradingStatus;
  gameCode: string;
  eliminationStatus: EliminationStatus;
  // Session/Event tracking
  sessionId?: string;
  eventId?: string;
  // Multi-galaxy support
  galaxyId?: string;
  isAIControlled?: boolean;
  aiConfig?: import('./ai.types').AIColonyConfig;
}

// ColonyType is now exported from base.types.ts

// Player interface is now exported from base.types.ts

// Resources interface is now exported from base.types.ts

// IntelItem interface is now exported from base.types.ts

// Investments interface is now exported from base.types.ts

// TradingStatus type is now exported from base.types.ts

// EliminationStatus interface is now exported from base.types.ts

export interface TradeOffer {
  id: string;
  initiatorId: string;
  targetId: string;
  offerResources: Partial<Resources>;
  requestResources: Partial<Resources>;
  offerIntel?: IntelItem[];
  requestIntel?: IntelItem[];
  status: TradeStatus;
  timestamp: number;
  expiresAt: number;
  completedAt?: number;
  negotiationHistory: TradeNegotiation[];
}

export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'counter_offered' | 'completed';

export interface TradeNegotiation {
  playerId: string;
  action: 'offer' | 'counter_offer' | 'accept' | 'reject';
  resources: {
    offer: Partial<Resources>;
    request: Partial<Resources>;
  };
  intel?: {
    offer: IntelItem[];
    request: IntelItem[];
  };
  timestamp: number;
}

export interface GameSession {
  id: string;
  eventId: string;
  name: string;
  facilitatorId: string;
  teams: Colony[];
  currentRound: number;
  roundStartTime: number;
  gameState: GameState;
  settings: GameSettings;
  code?: string;
  isActive?: boolean;
  status?: 'waiting' | 'active' | 'paused' | 'completed';
  aiConfigs?: import('./ai.types').AIColonyConfig[];
  // Multi-galaxy support
  galaxyConfiguration?: import('./galaxy.types').GalaxyConfiguration;
  sessionCodeMapping?: import('./galaxy.types').SessionCodeMapping;
}

export type GameState = 
  | 'setup' 
  | 'investments' 
  | 'round_1' 
  | 'strategy_1' 
  | 'round_2' 
  | 'strategy_2' 
  | 'milestone_break' 
  | 'round_3' 
  | 'strategy_3' 
  | 'round_4' 
  | 'strategy_4' 
  | 'round_5' 
  | 'completed';

export interface GameSettings {
  roundDurations: {
    instructions: number;
    investments: number;
    round1Trading: number;
    round1Strategy: number;
    round2Trading: number;
    round2Strategy: number;
    milestoneBreak: number;
    round3Trading: number;
    round3Strategy: number;
    round4Trading: number;
    round4Strategy: number;
    round5Trading: number;
  };
  enableAlienContact: boolean;
  customIntel: IntelItem[];
  // Multi-player support
  teamPlayerLimit?: number; // 1-9 players per team, default 4
  decisionMode?: import('./player.types').DecisionMode;
  decisionVotingTimeout?: number; // milliseconds
  enableTeamChat?: boolean;
  enableSubstitutions?: boolean;
}

/**
 * Corporate event configuration for team-building, training, or leadership development
 * Contains high-level event details and participant information
 */
export interface GameEvent {
  id: string;
  name: string;
  organizationName: string;
  /** Type of corporate event */
  eventType: 'team-building' | 'leadership' | 'skills-training' | 'other';
  /** Expected total number of participants (1-500) */
  totalParticipants: number;
  /** Optional description of the event objectives */
  eventDescription?: string;
  /** User ID of the event creator */
  createdBy: string;
  /** Timestamp when the event was created */
  createdAt: number;
  /** Current status of the event */
  status: 'active' | 'inactive';
  /** Optional event date/time - overrides derived start/end times */
  startTime?: number;
  /** Optional event end time - overrides derived end time */
  endTime?: number;
}

/**
 * Simplified Event interface for UI components
 * Used in Galaxy Configuration and event selection
 */
export interface Event {
  id: string;
  name: string;
  organization: string;
  date: string;
  description?: string;
  participantCount: number;
  code: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  createdBy: string;
}

/**
 * Individual player data collection for reporting and analytics
 * Fields are conditionally collected based on reporting configuration
 */
export interface PlayerData {
  playerId: string;
  sessionId: string;
  teamId: string;
  /** Basic player information */
  name: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  location?: string;
  /** Gameplay performance metrics */
  totalResourcesTraded?: number;
  totalTradesCompleted?: number;
  roundsActive?: number;
  leadershipActions?: number;
  teamCollaborationScore?: number;
  /** Learning and development data */
  preEventSurveyResponses?: Record<string, any>;
  postEventSurveyResponses?: Record<string, any>;
  skillsAssessment?: Record<string, number>;
  improvementAreas?: string[];
  /** Corporate reporting data */
  managerEmail?: string;
  costCenter?: string;
  performanceGoals?: string[];
  developmentPlan?: string[];
  /** Timestamps */
  dataCollectedAt: number;
  consentGiven: boolean;
  consentTimestamp?: number;
}

// Export investment types
export * from './investment.types';

// Export galaxy types for multi-galaxy support
export * from './galaxy.types';

// Export AI types
export * from './ai.types';

// Export validation types
export * from './validation.types';

// Export configuration types
export * from './config.types';

// Export team composition types
export * from './team.types';

// Export player types for multi-player support
export * from './player.types';

// Export type guards and utilities
export * from './guards.types';

// Export game engine types
export * from './gameEngine';

// Starting resources for each colony type
export const COLONY_STARTING_RESOURCES: Record<ColonyType, Resources> = {
  mining: {
    oxygen: 6, food: 4, water: 3, energy: 8,
    minerals: 20, alloys: 0, techComponents: 0,
    marketIntel: [], surveyReports: [], crisisWarnings: [],
    defenseContracts: 0, systemRepairs: 0, transportRoutes: 0,
    techPatents: 0, blueprints: 0, alienTech: 0,
    xenoBio: 0, quantumCores: 0, darkMatter: 0,
    credits: 1000
  },
  agricultural: {
    oxygen: 6, food: 20, water: 15, energy: 4,
    minerals: 2, alloys: 0, techComponents: 0,
    marketIntel: [], surveyReports: [], crisisWarnings: [],
    defenseContracts: 0, systemRepairs: 0, transportRoutes: 0,
    techPatents: 0, blueprints: 0, alienTech: 0,
    xenoBio: 0, quantumCores: 0, darkMatter: 0,
    credits: 1000
  },
  research: {
    oxygen: 8, food: 4, water: 3, energy: 12,
    minerals: 0, alloys: 0, techComponents: 15,
    marketIntel: [], surveyReports: [], crisisWarnings: [],
    defenseContracts: 0, systemRepairs: 0, transportRoutes: 0,
    techPatents: 0, blueprints: 0, alienTech: 0,
    xenoBio: 0, quantumCores: 0, darkMatter: 0,
    credits: 1000
  },
  trade_hub: {
    oxygen: 8, food: 8, water: 8, energy: 8,
    minerals: 8, alloys: 0, techComponents: 0,
    marketIntel: [], surveyReports: [], crisisWarnings: [],
    defenseContracts: 0, systemRepairs: 0, transportRoutes: 0,
    techPatents: 0, blueprints: 0, alienTech: 0,
    xenoBio: 0, quantumCores: 0, darkMatter: 0,
    credits: 1500
  },
  military: {
    oxygen: 8, food: 4, water: 4, energy: 10,
    minerals: 0, alloys: 0, techComponents: 0,
    marketIntel: [], surveyReports: [], crisisWarnings: [],
    defenseContracts: 15, systemRepairs: 0, transportRoutes: 0,
    techPatents: 0, blueprints: 0, alienTech: 0,
    xenoBio: 0, quantumCores: 0, darkMatter: 0,
    credits: 1000
  },
  manufacturing: {
    oxygen: 6, food: 4, water: 0, energy: 8,
    minerals: 8, alloys: 12, techComponents: 0,
    marketIntel: [], surveyReports: [], crisisWarnings: [],
    defenseContracts: 0, systemRepairs: 0, transportRoutes: 0,
    techPatents: 0, blueprints: 0, alienTech: 0,
    xenoBio: 0, quantumCores: 0, darkMatter: 0,
    credits: 1000
  }
};

// Resource consumption per round
export const RESOURCE_CONSUMPTION = {
  oxygen: 2,
  food: 2,
  water: 1,
  energy: 3
};

// Helper types for multi-galaxy validation
export type TeamSize = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Validates team configuration for a session
 */
export const validateTeamConfiguration = (teamCount: number, galaxyCount: number): boolean => {
  if (teamCount < 2 || teamCount > 12) return false;
  if (galaxyCount < 1 || galaxyCount > 4) return false;
  if (teamCount < galaxyCount * 2) return false; // At least 2 teams per galaxy
  return true;
};

/**
 * Generates unique game codes for multi-galaxy sessions
 */
export const generateGalaxyGameCodes = (count: number): string[] => {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let i = 0; i < count; i++) {
    let code = '';
    do {
      code = '';
      for (let j = 0; j < 4; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (codes.includes(code));
    codes.push(code);
  }
  
  return codes;
};