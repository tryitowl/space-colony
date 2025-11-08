import type { ColonyType, Resources } from './base.types';
import type { Colony } from './index';

// AI difficulty levels affecting decision speed and quality
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

// AI personality types for varied gameplay
export type AIPersonalityType = 
  | 'aggressive_trader' // Makes many trade offers, takes risks
  | 'cautious_hoarder' // Conserves resources, trades minimally
  | 'balanced_player' // Moderate approach to trading
  | 'opportunistic' // Waits for good deals
  | 'cooperative' // Prefers win-win trades
  | 'competitive' // Tries to get better deals
  | 'specialist'; // Focuses on specific resource types

// AI colony configuration for a game session
export interface AIColonyConfig {
  colonyId: string;
  difficulty: AIDifficulty;
  isAIControlled: boolean;
  strategyOverrides?: Partial<AIStrategyParameters>;
  // Galaxy-specific settings
  galaxyId?: string;
  personality?: AIPersonalityType;
  adaptiveStrategy?: boolean; // AI learns from other players
  cooperationBias?: number; // 0-1, tendency to cooperate with human players
}

// AI decision types
export type AIDecisionType = 
  | 'accept_trade'
  | 'reject_trade'
  | 'counter_trade'
  | 'initiate_trade'
  | 'wait'
  | 'emergency_trade';

// AI decision result
export interface AIDecision {
  type: AIDecisionType;
  tradeId?: string;
  targetColonyId?: string;
  offerResources?: Partial<Resources>;
  requestResources?: Partial<Resources>;
  confidence: number; // 0-1 confidence score
  reasoning: string[];
}

// Strategy parameters for different AI behaviors
export interface AIStrategyParameters {
  // Trading aggressiveness (0 = conservative, 1 = aggressive)
  tradingAggressiveness: number;
  
  // Resource priorities (0-1 for each resource type)
  resourcePriorities: {
    oxygen: number;
    food: number;
    water: number;
    energy: number;
    minerals: number;
    alloys: number;
    techComponents: number;
    defenseContracts: number;
    systemRepairs: number;
    transportRoutes: number;
    techPatents: number;
    blueprints: number;
    alienTech: number;
    credits: number;
  };
  
  // Trading preferences
  preferredPartners: ColonyType[];
  avoidedPartners: ColonyType[];
  
  // Decision thresholds
  minResourceBuffer: number; // Minimum resources to keep (multiplier of consumption)
  maxTradeSize: number; // Maximum % of resources to trade at once
  emergencyThreshold: number; // Resource level to trigger emergency trading
  
  // Timing parameters
  decisionDelayMs: {
    min: number;
    max: number;
  };
  
  // Behavioral traits
  riskTolerance: number; // 0 = risk averse, 1 = risk seeking
  trustFactor: number; // How much to trust other colonies
  learningRate: number; // How quickly to adapt strategies
}

// Colony-specific AI strategies
export interface AIStrategy {
  colonyType: ColonyType;
  name: string;
  description: string;
  parameters: AIStrategyParameters;
}

// AI memory for tracking interactions
export interface AIMemory {
  colonyId: string;
  tradingHistory: AITradeHistory[];
  trustScores: Record<string, number>; // Colony ID -> trust score
  lastDecisions: AIDecision[];
  resourceTrends: ResourceTrend[];
}

// Trade history for learning
export interface AITradeHistory {
  tradeId: string;
  partnerId: string;
  timestamp: number;
  offered: Partial<Resources>;
  received: Partial<Resources>;
  outcome: 'beneficial' | 'neutral' | 'detrimental';
  trustImpact: number;
}

// Resource trend tracking
export interface ResourceTrend {
  resourceType: keyof Resources;
  round: number;
  startAmount: number;
  endAmount: number;
  consumptionRate: number;
  acquisitionRate: number;
}

// AI evaluation metrics
export interface AIEvaluation {
  resourceScore: number;
  survivalProbability: number;
  tradingEfficiency: number;
  strategicPosition: number;
  overallScore: number;
}

// Trade evaluation result
export interface TradeEvaluation {
  tradeId: string;
  score: number; // -1 to 1, where negative is bad, positive is good
  acceptability: 'accept' | 'reject' | 'counter';
  reasons: string[];
  counterOffer?: {
    offerResources: Partial<Resources>;
    requestResources: Partial<Resources>;
  };
}

// AI state for each colony
export interface AIColonyState {
  colony: Colony;
  config: AIColonyConfig;
  strategy: AIStrategy;
  memory: AIMemory;
  currentEvaluation: AIEvaluation;
  isProcessing: boolean;
  lastDecisionTime: number;
  nextDecisionTime: number;
  isPaused?: boolean;
  pausedAt?: number;
}

// Default strategy parameters by difficulty
export const DEFAULT_DIFFICULTY_PARAMS: Record<AIDifficulty, Partial<AIStrategyParameters>> = {
  easy: {
    tradingAggressiveness: 0.3,
    riskTolerance: 0.2,
    trustFactor: 0.8,
    learningRate: 0.1,
    decisionDelayMs: { min: 5000, max: 15000 },
    minResourceBuffer: 3.0,
    maxTradeSize: 0.3
  },
  medium: {
    tradingAggressiveness: 0.5,
    riskTolerance: 0.5,
    trustFactor: 0.6,
    learningRate: 0.3,
    decisionDelayMs: { min: 3000, max: 10000 },
    minResourceBuffer: 2.0,
    maxTradeSize: 0.4
  },
  hard: {
    tradingAggressiveness: 0.7,
    riskTolerance: 0.7,
    trustFactor: 0.4,
    learningRate: 0.5,
    decisionDelayMs: { min: 1000, max: 5000 },
    minResourceBuffer: 1.5,
    maxTradeSize: 0.5
  },
  adaptive: {
    tradingAggressiveness: 0.5,
    riskTolerance: 0.5,
    trustFactor: 0.5,
    learningRate: 0.7,
    decisionDelayMs: { min: 2000, max: 8000 },
    minResourceBuffer: 2.0,
    maxTradeSize: 0.4
  }
};

// Galaxy-specific AI configuration
export interface GalaxyAIConfig {
  galaxyId: string;
  enabled: boolean;
  defaultDifficulty: AIDifficulty;
  maxAITeams: number;
  aiTeamDistribution: AITeamDistribution;
  behaviorModifiers?: GalaxyAIBehaviorModifiers;
}

// AI team distribution strategies
export interface AITeamDistribution {
  mode: 'fill' | 'replace' | 'mixed'; // Fill empty slots, replace teams, or mix
  preferredColonyTypes?: ColonyType[]; // AI prefers these colony types
  personalityDistribution?: Record<AIPersonalityType, number>; // Weights for personalities
}

// Galaxy-specific behavior modifiers
export interface GalaxyAIBehaviorModifiers {
  aggressivenessMultiplier?: number; // Modify base aggressiveness
  cooperationBonus?: number; // Extra cooperation within galaxy
  crossGalaxyTradePenalty?: number; // Reluctance for cross-galaxy trades
  learningRateBonus?: number; // Faster adaptation in this galaxy
  specialRules?: AISpecialRule[]; // Galaxy-specific AI rules
}

// Special rules for AI behavior
export interface AISpecialRule {
  id: string;
  name: string;
  condition: (state: AIColonyState, galaxy: import('./galaxy.types').Galaxy) => boolean;
  effect: (decision: AIDecision) => AIDecision;
  priority: number;
}

// AI strategy presets for different galaxy types
export interface AIStrategyPreset {
  id: string;
  name: string;
  description: string;
  personality: AIPersonalityType;
  baseStrategy: Partial<AIStrategyParameters>;
  galaxyTypes: string[]; // Compatible galaxy preset IDs
}

// Cross-galaxy AI coordination
export interface CrossGalaxyAICoordination {
  enabled: boolean;
  sharedMemory: boolean; // AI teams share knowledge across galaxies
  coordinationLevel: 'none' | 'minimal' | 'moderate' | 'high';
  allianceFormation: boolean; // AI can form cross-galaxy alliances
}

// AI performance metrics for analytics
export interface AIPerformanceMetrics {
  colonyId: string;
  galaxyId: string;
  survivalRate: number;
  tradingSuccess: number;
  resourceEfficiency: number;
  adaptationScore: number;
  humanInteractionScore: number; // How well AI works with humans
  overallRating: number;
}

// Default personality parameters
export const DEFAULT_PERSONALITY_PARAMS: Record<AIPersonalityType, Partial<AIStrategyParameters>> = {
  aggressive_trader: {
    tradingAggressiveness: 0.8,
    maxTradeSize: 0.6,
    riskTolerance: 0.7,
    minResourceBuffer: 1.2
  },
  cautious_hoarder: {
    tradingAggressiveness: 0.2,
    maxTradeSize: 0.2,
    riskTolerance: 0.1,
    minResourceBuffer: 4.0
  },
  balanced_player: {
    tradingAggressiveness: 0.5,
    maxTradeSize: 0.4,
    riskTolerance: 0.5,
    minResourceBuffer: 2.0
  },
  opportunistic: {
    tradingAggressiveness: 0.4,
    maxTradeSize: 0.5,
    riskTolerance: 0.6,
    minResourceBuffer: 1.8
  },
  cooperative: {
    tradingAggressiveness: 0.6,
    maxTradeSize: 0.5,
    riskTolerance: 0.4,
    trustFactor: 0.8
  },
  competitive: {
    tradingAggressiveness: 0.7,
    maxTradeSize: 0.4,
    riskTolerance: 0.6,
    trustFactor: 0.3
  },
  specialist: {
    tradingAggressiveness: 0.5,
    maxTradeSize: 0.7, // Large trades of specific resources
    riskTolerance: 0.5,
    minResourceBuffer: 1.5
  }
};