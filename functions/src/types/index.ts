// Type definitions for Cloud Functions

export interface Resources {
  oxygen: number;
  food: number;
  water: number;
  energy: number;
  minerals: number;
  alloys: number;
  electronics: number;
  medicine: number;
  luxuryGoods: number;
  rareMinerals: number;
  tech: number;
  alienTech: number;
  defenseContracts: number;
  techPatents: number;
  intel?: IntelItem[];
}

export interface IntelItem {
  id: string;
  category: 'market' | 'technology' | 'alien' | 'crisis' | 'strategy';
  title: string;
  content: string;
  reliability: number;
  source: string;
  timestamp: number;
  distributionCount: number;
}

export interface TeamPlayer {
  id: string;
  name: string;
  role: 'captain' | 'crew';
  isActive?: boolean;
  joinedAt?: number;
}

export interface Colony {
  id: string;
  name: string;
  type: 'agricultural' | 'mining' | 'technological' | 'military' | 'balanced';
  resources: Resources;
  players: TeamPlayer[];
  investments: Record<string, number>;
  eliminationStatus: {
    isEliminated: boolean;
    roundsInCritical: number;
    criticalResources: string[];
  };
  isAIControlled?: boolean;
  sessionId?: string;
  eventId?: string;
  galaxyId?: string;
  gameCode: string;
  status?: 'active' | 'eliminated';
  isEliminated?: boolean;
  criticalMode?: boolean;
}

export interface GameSession {
  id: string;
  eventId: string;
  name?: string;
  teams: Colony[];
  currentRound: number;
  gameState: GameState;
  config?: GameConfig;
  aiConfigs?: AIColonyConfig[];
  settings?: GameSettings;
  status: 'setup' | 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
  galaxyConfiguration?: {
    sectors?: number;
    specialResources?: string[];
    [key: string]: unknown;
  };
}

export interface AIColonyConfig {
  colonyId: string;
  colonyName: string;
  isAIControlled: boolean;
  personality: 'aggressive' | 'cooperative' | 'balanced' | 'defensive';
  difficulty: 'easy' | 'medium' | 'hard';
  tradingPreferences: {
    preferredResources: string[];
    avoidResources: string[];
    minTradeValue: number;
    maxTradeFrequency: number;
  };
  decisionDelay: {
    min: number;
    max: number;
  };
  behaviors: {
    acceptTradeThreshold: number;
    counterOfferProbability: number;
    initiateTradeFrequency: number;
    panicThreshold: number;
  };
}

export interface TradeOffer {
  id: string;
  sessionId: string;
  initiatorId: string;
  targetId: string;
  offerResources: Partial<Resources>;
  requestResources: Partial<Resources>;
  offerIntel?: string[];
  requestIntel?: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'counter_offered' | 'completed';
  timestamp: number;
  expiresAt: number;
  createdBy: TeamPlayer;
  isCounterOffer?: boolean;
  originalTradeId?: string;
  negotiationHistory?: TradeHistoryEntry[];
  completedAt?: number;
}

export interface TradeHistoryEntry {
  playerId: string;
  action: 'offer' | 'counter_offer' | 'accept' | 'reject';
  resources: {
    offer?: Partial<Resources>;
    request?: Partial<Resources>;
  };
  intel?: {
    offer?: string[];
    request?: string[];
  };
  timestamp: number;
}

export type GameState = 
  | 'setup'
  | 'investments' 
  | 'round_1'
  | 'strategy_1'
  | 'round_2'
  | 'strategy_2'
  | 'milestone'
  | 'round_3'
  | 'strategy_3'
  | 'round_4'
  | 'strategy_4'
  | 'round_5'
  | 'game_over';

export interface GameConfig {
  maxTeams: number;
  maxPlayersPerTeam: number;
  roundDuration: number;
  tradingEnabled: boolean;
  aiEnabled: boolean;
  eventFrequency: number;
}

export interface GameSettings {
  roundDurations: Record<string, number>;
  enableAlienContact: boolean;
  customIntel: IntelItem[];
  victoryConditions: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface CloudFunctionData<T = any> {
  data: T;
  auth?: {
    uid: string;
    token: Record<string, any>;
  };
}

export interface CloudFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper type guards
export function isColony(obj: any): obj is Colony {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    obj.resources &&
    Array.isArray(obj.players);
}

export function isGameSession(obj: any): obj is GameSession {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.eventId === 'string' &&
    Array.isArray(obj.teams) &&
    typeof obj.currentRound === 'number';
}

export function isAIColonyConfig(obj: any): obj is AIColonyConfig {
  return obj &&
    typeof obj.colonyId === 'string' &&
    typeof obj.isAIControlled === 'boolean' &&
    typeof obj.personality === 'string' &&
    typeof obj.difficulty === 'string';
}