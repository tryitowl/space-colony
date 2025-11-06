/**
 * AI Personality Service
 * 
 * Implements sophisticated personality generation and behavior patterns for AI colonies.
 * Each AI colony has a unique personality that drives its trading behavior, decision-making,
 * and interactions with other colonies.
 */

import type {
  AIPersonalityType,
  AIStrategyParameters,
  AIDifficulty,
  AIMemory,
  AITradeHistory
} from '../types/ai.types';
import type {
  Colony,
  ColonyType,
  Resources,
  TradeOffer,
  GameSession
} from '../types';
import { DEFAULT_PERSONALITY_PARAMS } from '../types/ai.types';

/**
 * Personality traits that define AI behavior
 */
export interface PersonalityTraits {
  // Core behavioral traits (0-1 scale)
  aggressiveness: number;      // How actively the AI pursues trades
  risktaking: number;          // Willingness to make risky trades
  cooperativeness: number;     // Preference for win-win vs zero-sum trades
  adaptability: number;        // How quickly AI adjusts strategy
  patience: number;            // Willingness to wait for better opportunities
  greed: number;              // Desire to maximize personal gain
  trustingness: number;       // Initial trust level for other colonies
  
  // Trading style traits
  negotiationStyle: 'hardball' | 'fair' | 'generous' | 'opportunistic';
  preferredTradeSize: 'small' | 'medium' | 'large' | 'variable';
  decisionSpeed: 'impulsive' | 'thoughtful' | 'deliberate' | 'analytical';
  
  // Social preferences
  socialPreference: 'loner' | 'selective' | 'social' | 'networker';
  grudgeHolding: 'forgiving' | 'balanced' | 'vengeful';
  reciprocity: 'selfish' | 'conditional' | 'generous';
  
  // Resource management style
  resourceStrategy: 'hoarder' | 'balanced' | 'trader' | 'gambler';
  specialization: 'generalist' | 'specialist' | 'adaptive';
  
  // Unique behavioral quirks
  quirks: PersonalityQuirk[];
}

/**
 * Unique personality quirks that add flavor to AI behavior
 */
export interface PersonalityQuirk {
  id: string;
  name: string;
  description: string;
  effect: (params: AIStrategyParameters) => AIStrategyParameters;
  triggerCondition?: (colony: Colony, gameState: GameSession) => boolean;
}

/**
 * Personality profile combining type, traits, and memory
 */
export interface PersonalityProfile {
  id: string;
  type: AIPersonalityType;
  traits: PersonalityTraits;
  preferences: TradingPreferences;
  emotionalState: EmotionalState;
  relationships: Map<string, RelationshipStatus>;
  behaviorHistory: BehaviorHistory;
}

/**
 * Trading preferences derived from personality
 */
export interface TradingPreferences {
  preferredResources: Array<keyof Resources>;
  avoidedResources: Array<keyof Resources>;
  preferredPartnerTypes: ColonyType[];
  avoidedPartnerTypes: ColonyType[];
  idealTradeBalance: number; // -1 (give more) to 1 (receive more)
  minimumTrustLevel: number;
  maximumTradesPerRound: number;
}

/**
 * Emotional state affecting decision-making
 */
export interface EmotionalState {
  mood: 'confident' | 'neutral' | 'anxious' | 'desperate';
  stress: number; // 0-1, affects decision quality
  satisfaction: number; // 0-1, recent trade success
  frustration: number; // 0-1, recent failures
  lastMoodChange: number; // timestamp
}

/**
 * Relationship tracking with other colonies
 */
export interface RelationshipStatus {
  colonyId: string;
  trust: number; // -1 to 1
  respect: number; // 0 to 1
  familiarity: number; // 0 to 1
  lastInteraction: number;
  tradeCount: number;
  successfulTrades: number;
  grudges: string[]; // Reasons for negative feelings
  favors: string[]; // Reasons for positive feelings
}

/**
 * Behavior history for pattern consistency
 */
export interface BehaviorHistory {
  averageTradeSize: number;
  averageResponseTime: number;
  acceptanceRate: number;
  initiationRate: number;
  preferredTradingTimes: number[]; // Hours of day
  consistencyScore: number; // How predictable the AI is
}

/**
 * Main AI Personality Service
 */
export class AIPersonalityService {
  private personalities: Map<string, PersonalityProfile> = new Map();
  private quirks: PersonalityQuirk[] = [];
  
  constructor() {
    this.initializeQuirks();
  }

  /**
   * Generate a unique personality profile for an AI colony
   */
  generatePersonality(
    colonyId: string,
    colonyType: ColonyType,
    personalityType: AIPersonalityType,
    difficulty: AIDifficulty,
_galaxyContext?: { totalTeams: number; galaxyTheme?: string }
  ): PersonalityProfile {
    // Start with base personality parameters
    DEFAULT_PERSONALITY_PARAMS[personalityType];
    
    // Generate personality traits with variation
    const traits = this.generatePersonalityTraits(personalityType, difficulty);
    
    // Add personality quirks (1-3 random quirks)
    const selectedQuirks = this.selectQuirks(personalityType, colonyType);
    traits.quirks = selectedQuirks;
    
    // Generate trading preferences based on traits
    const preferences = this.generateTradingPreferences(traits, colonyType);
    
    // Initialize emotional state
    const emotionalState = this.initializeEmotionalState(traits);
    
    // Create personality profile
    const profile: PersonalityProfile = {
      id: `${colonyId}_personality`,
      type: personalityType,
      traits,
      preferences,
      emotionalState,
      relationships: new Map(),
      behaviorHistory: {
        averageTradeSize: 0,
        averageResponseTime: 0,
        acceptanceRate: 0.5,
        initiationRate: 0.5,
        preferredTradingTimes: this.generatePreferredTimes(traits),
        consistencyScore: 0.7 + (traits.adaptability * 0.3)
      }
    };
    
    // Store personality
    this.personalities.set(colonyId, profile);
    
    return profile;
  }

  /**
   * Generate personality traits with controlled randomness
   */
  private generatePersonalityTraits(
    personalityType: AIPersonalityType,
    difficulty: AIDifficulty
  ): PersonalityTraits {
    // Base trait values for each personality type
    const baseTraits = this.getBaseTraits(personalityType);
    
    // Apply difficulty modifiers
    const difficultyModifiers = this.getDifficultyModifiers(difficulty);
    
    // Add random variation (±15% for most traits)
    const traits: PersonalityTraits = {
      aggressiveness: this.varyTrait(baseTraits.aggressiveness * difficultyModifiers.aggression),
      risktaking: this.varyTrait(baseTraits.risktaking * difficultyModifiers.risk),
      cooperativeness: this.varyTrait(baseTraits.cooperativeness),
      adaptability: this.varyTrait(baseTraits.adaptability * difficultyModifiers.learning),
      patience: this.varyTrait(baseTraits.patience),
      greed: this.varyTrait(baseTraits.greed),
      trustingness: this.varyTrait(baseTraits.trustingness),
      
      negotiationStyle: baseTraits.negotiationStyle,
      preferredTradeSize: baseTraits.preferredTradeSize,
      decisionSpeed: this.adjustDecisionSpeed(baseTraits.decisionSpeed, difficulty),
      
      socialPreference: baseTraits.socialPreference,
      grudgeHolding: baseTraits.grudgeHolding,
      reciprocity: baseTraits.reciprocity,
      
      resourceStrategy: baseTraits.resourceStrategy,
      specialization: baseTraits.specialization,
      
      quirks: [] // Will be populated separately
    };
    
    return traits;
  }

  /**
   * Get base traits for personality type
   */
  private getBaseTraits(personalityType: AIPersonalityType): PersonalityTraits {
    const traitMap: Record<AIPersonalityType, PersonalityTraits> = {
      aggressive_trader: {
        aggressiveness: 0.85,
        risktaking: 0.75,
        cooperativeness: 0.3,
        adaptability: 0.6,
        patience: 0.2,
        greed: 0.8,
        trustingness: 0.3,
        negotiationStyle: 'hardball',
        preferredTradeSize: 'large',
        decisionSpeed: 'impulsive',
        socialPreference: 'networker',
        grudgeHolding: 'vengeful',
        reciprocity: 'selfish',
        resourceStrategy: 'trader',
        specialization: 'adaptive',
        quirks: []
      },
      
      cautious_hoarder: {
        aggressiveness: 0.2,
        risktaking: 0.1,
        cooperativeness: 0.4,
        adaptability: 0.3,
        patience: 0.9,
        greed: 0.4,
        trustingness: 0.2,
        negotiationStyle: 'fair',
        preferredTradeSize: 'small',
        decisionSpeed: 'deliberate',
        socialPreference: 'loner',
        grudgeHolding: 'balanced',
        reciprocity: 'conditional',
        resourceStrategy: 'hoarder',
        specialization: 'specialist',
        quirks: []
      },
      
      balanced_player: {
        aggressiveness: 0.5,
        risktaking: 0.5,
        cooperativeness: 0.6,
        adaptability: 0.6,
        patience: 0.6,
        greed: 0.5,
        trustingness: 0.5,
        negotiationStyle: 'fair',
        preferredTradeSize: 'medium',
        decisionSpeed: 'thoughtful',
        socialPreference: 'selective',
        grudgeHolding: 'balanced',
        reciprocity: 'conditional',
        resourceStrategy: 'balanced',
        specialization: 'generalist',
        quirks: []
      },
      
      opportunistic: {
        aggressiveness: 0.4,
        risktaking: 0.6,
        cooperativeness: 0.5,
        adaptability: 0.8,
        patience: 0.7,
        greed: 0.7,
        trustingness: 0.4,
        negotiationStyle: 'opportunistic',
        preferredTradeSize: 'variable',
        decisionSpeed: 'analytical',
        socialPreference: 'selective',
        grudgeHolding: 'forgiving',
        reciprocity: 'conditional',
        resourceStrategy: 'trader',
        specialization: 'adaptive',
        quirks: []
      },
      
      cooperative: {
        aggressiveness: 0.4,
        risktaking: 0.3,
        cooperativeness: 0.85,
        adaptability: 0.5,
        patience: 0.7,
        greed: 0.3,
        trustingness: 0.7,
        negotiationStyle: 'generous',
        preferredTradeSize: 'medium',
        decisionSpeed: 'thoughtful',
        socialPreference: 'social',
        grudgeHolding: 'forgiving',
        reciprocity: 'generous',
        resourceStrategy: 'balanced',
        specialization: 'generalist',
        quirks: []
      },
      
      competitive: {
        aggressiveness: 0.7,
        risktaking: 0.6,
        cooperativeness: 0.3,
        adaptability: 0.7,
        patience: 0.4,
        greed: 0.8,
        trustingness: 0.3,
        negotiationStyle: 'hardball',
        preferredTradeSize: 'medium',
        decisionSpeed: 'impulsive',
        socialPreference: 'networker',
        grudgeHolding: 'vengeful',
        reciprocity: 'selfish',
        resourceStrategy: 'trader',
        specialization: 'specialist',
        quirks: []
      },
      
      specialist: {
        aggressiveness: 0.5,
        risktaking: 0.4,
        cooperativeness: 0.5,
        adaptability: 0.4,
        patience: 0.8,
        greed: 0.6,
        trustingness: 0.5,
        negotiationStyle: 'fair',
        preferredTradeSize: 'large',
        decisionSpeed: 'analytical',
        socialPreference: 'selective',
        grudgeHolding: 'balanced',
        reciprocity: 'conditional',
        resourceStrategy: 'balanced',
        specialization: 'specialist',
        quirks: []
      }
    };
    
    return traitMap[personalityType];
  }

  /**
   * Initialize personality quirks
   */
  private initializeQuirks(): void {
    this.quirks = [
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Prefers to trade early in each round',
        effect: (params) => ({
          ...params,
          decisionDelayMs: {
            min: params.decisionDelayMs.min * 0.5,
            max: params.decisionDelayMs.max * 0.7
          }
        })
      },
      
      {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'More active in later parts of rounds',
        effect: (params) => ({
          ...params,
          decisionDelayMs: {
            min: params.decisionDelayMs.min * 1.3,
            max: params.decisionDelayMs.max * 1.5
          }
        })
      },
      
      {
        id: 'credit_lover',
        name: 'Credit Lover',
        description: 'Has an unusual fondness for credits',
        effect: (params) => ({
          ...params,
          resourcePriorities: {
            ...params.resourcePriorities,
            credits: Math.min(params.resourcePriorities.credits * 1.5, 1.0)
          }
        })
      },
      
      {
        id: 'tech_enthusiast',
        name: 'Tech Enthusiast',
        description: 'Obsessed with technology resources',
        effect: (params) => ({
          ...params,
          resourcePriorities: {
            ...params.resourcePriorities,
            techComponents: Math.min(params.resourcePriorities.techComponents * 1.4, 1.0),
            techPatents: Math.min(params.resourcePriorities.techPatents * 1.4, 1.0),
            alienTech: Math.min(params.resourcePriorities.alienTech * 1.6, 1.0)
          }
        })
      },
      
      {
        id: 'paranoid',
        name: 'Paranoid',
        description: 'Deeply suspicious of other colonies',
        effect: (params) => ({
          ...params,
          trustFactor: params.trustFactor * 0.5,
          minResourceBuffer: params.minResourceBuffer * 1.3
        })
      },
      
      {
        id: 'gambler',
        name: 'Gambler',
        description: 'Takes bigger risks for bigger rewards',
        effect: (params) => ({
          ...params,
          riskTolerance: Math.min(params.riskTolerance * 1.4, 1.0),
          maxTradeSize: Math.min(params.maxTradeSize * 1.3, 0.7)
        })
      },
      
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Only accepts trades with excellent value',
        effect: (params) => ({
          ...params,
          tradingAggressiveness: params.tradingAggressiveness * 0.7,
          decisionDelayMs: {
            min: params.decisionDelayMs.min * 1.2,
            max: params.decisionDelayMs.max * 1.3
          }
        })
      },
      
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Loves to trade with many different partners',
        effect: (params) => ({
          ...params,
          tradingAggressiveness: Math.min(params.tradingAggressiveness * 1.2, 0.9),
          trustFactor: Math.min(params.trustFactor * 1.2, 0.9)
        })
      },
      
      {
        id: 'stubborn',
        name: 'Stubborn',
        description: 'Rarely changes initial decisions',
        effect: (params) => ({
          ...params,
          learningRate: params.learningRate * 0.5,
          adaptability: (params as any).adaptability || 0.5
        })
      },
      
      {
        id: 'emergency_prepper',
        name: 'Emergency Prepper',
        description: 'Always keeps extra survival resources',
        effect: (params) => ({
          ...params,
          minResourceBuffer: params.minResourceBuffer * 1.5,
          emergencyThreshold: params.emergencyThreshold * 1.3,
          resourcePriorities: {
            ...params.resourcePriorities,
            oxygen: Math.min(params.resourcePriorities.oxygen * 1.2, 1.0),
            food: Math.min(params.resourcePriorities.food * 1.2, 1.0),
            water: Math.min(params.resourcePriorities.water * 1.2, 1.0)
          }
        })
      }
    ];
  }

  /**
   * Select appropriate quirks for personality and colony type
   */
  private selectQuirks(
    personalityType: AIPersonalityType,
    colonyType: ColonyType
  ): PersonalityQuirk[] {
    const selected: PersonalityQuirk[] = [];
    const quirkCount = Math.floor(Math.random() * 3) + 1; // 1-3 quirks
    
    // Filter compatible quirks
    const compatibleQuirks = this.quirks.filter(quirk => {
      // Avoid conflicting quirks
      if (quirk.id === 'early_bird' && selected.some(q => q.id === 'night_owl')) return false;
      if (quirk.id === 'night_owl' && selected.some(q => q.id === 'early_bird')) return false;
      
      // Some quirks fit certain personalities better
      if (personalityType === 'cautious_hoarder' && quirk.id === 'gambler') return false;
      if (personalityType === 'aggressive_trader' && quirk.id === 'perfectionist') return false;
      
      // Colony type compatibility
      if (colonyType === 'research' && quirk.id === 'tech_enthusiast') return true; // Higher chance
      
      return true;
    });
    
    // Randomly select quirks
    for (let i = 0; i < quirkCount && compatibleQuirks.length > 0; i++) {
      const index = Math.floor(Math.random() * compatibleQuirks.length);
      selected.push(compatibleQuirks[index]);
      compatibleQuirks.splice(index, 1);
    }
    
    return selected;
  }

  /**
   * Generate trading preferences based on personality traits
   */
  private generateTradingPreferences(
    traits: PersonalityTraits,
    colonyType: ColonyType
  ): TradingPreferences {
    const preferences: TradingPreferences = {
      preferredResources: this.getPreferredResources(colonyType, traits),
      avoidedResources: this.getAvoidedResources(colonyType, traits),
      preferredPartnerTypes: this.getPreferredPartnerTypes(colonyType, traits),
      avoidedPartnerTypes: this.getAvoidedPartnerTypes(colonyType, traits),
      idealTradeBalance: this.calculateIdealTradeBalance(traits),
      minimumTrustLevel: 0.3 - (traits.trustingness * 0.2),
      maximumTradesPerRound: Math.floor(3 + (traits.aggressiveness * 4))
    };
    
    return preferences;
  }

  /**
   * Get preferred resources based on colony type and personality
   */
  private getPreferredResources(
    colonyType: ColonyType,
    traits: PersonalityTraits
  ): Array<keyof Resources> {
    const basePreferences: Record<ColonyType, Array<keyof Resources>> = {
      mining: ['energy', 'techComponents', 'credits'],
      agricultural: ['minerals', 'techComponents', 'credits'],
      research: ['minerals', 'alienTech', 'energy'],
      military: ['alloys', 'techComponents', 'alienTech'],
      manufacturing: ['minerals', 'energy', 'credits'],
      trade_hub: ['credits', 'alienTech', 'techPatents']
    };
    
    let preferred = [...basePreferences[colonyType]];
    
    // Modify based on traits
    if (traits.resourceStrategy === 'hoarder') {
      preferred.unshift('oxygen', 'food', 'water');
    }
    
    // Tech enthusiast quirk effect
    if (traits.quirks.some(q => q.id === 'tech_enthusiast')) {
      preferred.unshift('techComponents', 'techPatents', 'alienTech');
    }
    
    // Credit lover quirk effect
    if (traits.quirks.some(q => q.id === 'credit_lover')) {
      preferred.unshift('credits');
    }
    
    // Remove duplicates and limit to top 5
    return Array.from(new Set(preferred)).slice(0, 5);
  }

  /**
   * Get avoided resources based on personality
   */
  private getAvoidedResources(
    colonyType: ColonyType,
    traits: PersonalityTraits
  ): Array<keyof Resources> {
    const avoided: Array<keyof Resources> = [];
    
    // Specialists avoid trading their specialty
    if (traits.specialization === 'specialist') {
      switch (colonyType) {
        case 'mining':
          avoided.push('minerals', 'alloys');
          break;
        case 'agricultural':
          avoided.push('food', 'water');
          break;
        case 'research':
          avoided.push('techComponents', 'techPatents');
          break;
        case 'military':
          avoided.push('defenseContracts');
          break;
        case 'manufacturing':
          avoided.push('alloys');
          break;
      }
    }
    
    return avoided;
  }

  /**
   * Get preferred partner types
   */
  private getPreferredPartnerTypes(
    colonyType: ColonyType,
    traits: PersonalityTraits
  ): ColonyType[] {
    const naturalPartners: Record<ColonyType, ColonyType[]> = {
      mining: ['manufacturing', 'trade_hub'],
      agricultural: ['mining', 'research', 'military'],
      research: ['mining', 'military', 'trade_hub'],
      military: ['manufacturing', 'research', 'agricultural'],
      manufacturing: ['mining', 'military', 'trade_hub'],
      trade_hub: ['mining', 'agricultural', 'research', 'manufacturing', 'military']
    };
    
    let preferred = [...naturalPartners[colonyType]];
    
    // Social butterflies like everyone
    if (traits.socialPreference === 'networker') {
      const allTypes: ColonyType[] = ['mining', 'agricultural', 'research', 'military', 'manufacturing', 'trade_hub'];
      preferred = allTypes.filter(t => t !== colonyType);
    }
    
    // Loners prefer fewer partners
    if (traits.socialPreference === 'loner') {
      preferred = preferred.slice(0, 2);
    }
    
    return preferred;
  }

  /**
   * Get avoided partner types
   */
  private getAvoidedPartnerTypes(
    colonyType: ColonyType,
    traits: PersonalityTraits
  ): ColonyType[] {
    const avoided: ColonyType[] = [];
    
    // Competitive personalities avoid similar colonies
    if (traits.negotiationStyle === 'hardball') {
      avoided.push(colonyType);
    }
    
    // Paranoid quirk avoids military
    if (traits.quirks.some(q => q.id === 'paranoid')) {
      avoided.push('military');
    }
    
    return avoided;
  }

  /**
   * Calculate ideal trade balance
   */
  private calculateIdealTradeBalance(traits: PersonalityTraits): number {
    let balance = 0;
    
    // Greedy wants to receive more
    balance += traits.greed * 0.3;
    
    // Cooperative gives more
    balance -= traits.cooperativeness * 0.2;
    
    // Negotiation style affects balance
    switch (traits.negotiationStyle) {
      case 'hardball':
        balance += 0.2;
        break;
      case 'generous':
        balance -= 0.2;
        break;
      case 'opportunistic':
        balance += 0.1;
        break;
    }
    
    return Math.max(-1, Math.min(1, balance));
  }

  /**
   * Initialize emotional state
   */
  private initializeEmotionalState(_traits: PersonalityTraits): EmotionalState {
    return {
      mood: 'neutral',
      stress: 0.2 + (Math.random() * 0.2), // Start with low stress
      satisfaction: 0.5,
      frustration: 0,
      lastMoodChange: Date.now()
    };
  }

  /**
   * Update personality based on experience
   */
  updatePersonalityFromExperience(
    colonyId: string,
    tradeHistory: AITradeHistory[],
    currentRound: number
  ): void {
    const profile = this.personalities.get(colonyId);
    if (!profile) return;
    
    // Update behavior history
    this.updateBehaviorHistory(profile, tradeHistory);
    
    // Update emotional state
    this.updateEmotionalState(profile, tradeHistory);
    
    // Update relationships
    this.updateRelationships(profile, tradeHistory);
    
    // Adapt traits slightly based on success
    this.adaptTraits(profile, tradeHistory);
  }

  /**
   * Update behavior history from recent trades
   */
  private updateBehaviorHistory(
    profile: PersonalityProfile,
    tradeHistory: AITradeHistory[]
  ): void {
    if (tradeHistory.length === 0) return;
    
    const recentTrades = tradeHistory.slice(-10); // Last 10 trades
    
    // Calculate average trade size
    let totalTradeValue = 0;
    let tradeCount = 0;
    
    recentTrades.forEach(trade => {
      const offeredValue = Object.values(trade.offered).reduce((sum: number, val) =>
        sum + (typeof val === 'number' ? val : 0), 0);
      const receivedValue = Object.values(trade.received).reduce((sum: number, val) =>
        sum + (typeof val === 'number' ? val : 0), 0);

      totalTradeValue += (offeredValue + receivedValue) / 2;
      tradeCount++;
    });
    
    if (tradeCount > 0) {
      profile.behaviorHistory.averageTradeSize = totalTradeValue / tradeCount;
    }
    
    // Update acceptance rate
    const acceptedTrades = recentTrades.filter(t => t.outcome !== 'detrimental').length;
    profile.behaviorHistory.acceptanceRate = acceptedTrades / recentTrades.length;
  }

  /**
   * Update emotional state based on recent outcomes
   */
  private updateEmotionalState(
    profile: PersonalityProfile,
    tradeHistory: AITradeHistory[]
  ): void {
    const recentTrades = tradeHistory.slice(-5);
    
    // Calculate recent success rate
    const successfulTrades = recentTrades.filter(t => t.outcome === 'beneficial').length;
    const detrimentalTrades = recentTrades.filter(t => t.outcome === 'detrimental').length;
    
    // Update satisfaction
    profile.emotionalState.satisfaction = successfulTrades / Math.max(recentTrades.length, 1);
    
    // Update frustration
    profile.emotionalState.frustration = detrimentalTrades / Math.max(recentTrades.length, 1);
    
    // Update stress based on resource situation
    // This would need access to current resources - simplified here
    profile.emotionalState.stress = Math.max(0, Math.min(1, 
      profile.emotionalState.frustration * 0.5 + (1 - profile.emotionalState.satisfaction) * 0.3
    ));
    
    // Update mood
    const previousMood = profile.emotionalState.mood;
    if (profile.emotionalState.stress > 0.7) {
      profile.emotionalState.mood = 'desperate';
    } else if (profile.emotionalState.stress > 0.5) {
      profile.emotionalState.mood = 'anxious';
    } else if (profile.emotionalState.satisfaction > 0.7) {
      profile.emotionalState.mood = 'confident';
    } else {
      profile.emotionalState.mood = 'neutral';
    }
    
    if (previousMood !== profile.emotionalState.mood) {
      profile.emotionalState.lastMoodChange = Date.now();
    }
  }

  /**
   * Update relationships based on trade history
   */
  private updateRelationships(
    profile: PersonalityProfile,
    tradeHistory: AITradeHistory[]
  ): void {
    // Group trades by partner
    const tradesByPartner = new Map<string, AITradeHistory[]>();
    
    tradeHistory.forEach(trade => {
      const trades = tradesByPartner.get(trade.partnerId) || [];
      trades.push(trade);
      tradesByPartner.set(trade.partnerId, trades);
    });
    
    // Update each relationship
    tradesByPartner.forEach((trades, partnerId) => {
      let relationship = profile.relationships.get(partnerId);
      
      if (!relationship) {
        relationship = {
          colonyId: partnerId,
          trust: profile.traits.trustingness,
          respect: 0.5,
          familiarity: 0,
          lastInteraction: 0,
          tradeCount: 0,
          successfulTrades: 0,
          grudges: [],
          favors: []
        };
        profile.relationships.set(partnerId, relationship);
      }
      
      // Update relationship metrics
      relationship.tradeCount = trades.length;
      relationship.successfulTrades = trades.filter(t => t.outcome === 'beneficial').length;
      relationship.lastInteraction = Math.max(...trades.map(t => t.timestamp));
      
      // Update familiarity
      relationship.familiarity = Math.min(1, trades.length / 20);
      
      // Update trust based on outcomes
      trades.forEach(trade => {
        const trustDelta = trade.trustImpact || 0;
        relationship!.trust = Math.max(-1, Math.min(1, relationship!.trust + trustDelta));
        
        // Add grudges or favors
        if (trade.outcome === 'detrimental' && trustDelta < -0.1) {
          relationship!.grudges.push(`Bad trade on round ${new Date(trade.timestamp).toISOString()}`);
        } else if (trade.outcome === 'beneficial' && trustDelta > 0.1) {
          relationship!.favors.push(`Good trade on round ${new Date(trade.timestamp).toISOString()}`);
        }
      });
      
      // Update respect based on trade fairness
      const fairTrades = trades.filter(t => Math.abs(t.trustImpact || 0) < 0.1).length;
      relationship.respect = fairTrades / trades.length;
      
      // Apply grudge holding trait
      if (profile.traits.grudgeHolding === 'vengeful' && relationship.grudges.length > 0) {
        relationship.trust = Math.min(relationship.trust, -0.3);
      } else if (profile.traits.grudgeHolding === 'forgiving') {
        // Gradually forget old grudges
        if (relationship.grudges.length > 3) {
          relationship.grudges = relationship.grudges.slice(-3);
        }
        relationship.trust = Math.max(relationship.trust, -0.5);
      }
    });
  }

  /**
   * Adapt personality traits based on experience
   */
  private adaptTraits(
    profile: PersonalityProfile,
    tradeHistory: AITradeHistory[]
  ): void {
    if (tradeHistory.length < 10) return; // Need enough data
    
    const recentTrades = tradeHistory.slice(-20);
    const successRate = recentTrades.filter(t => t.outcome === 'beneficial').length / recentTrades.length;
    
    // Adapt based on success rate
    const adaptationRate = profile.traits.adaptability * 0.05; // Max 5% change
    
    if (successRate > 0.7) {
      // Success reinforces current behavior
      profile.traits.aggressiveness = Math.min(1, profile.traits.aggressiveness + adaptationRate);
    } else if (successRate < 0.3) {
      // Failure causes behavior change
      if (profile.traits.aggressiveness > 0.5) {
        // Too aggressive, tone it down
        profile.traits.aggressiveness = Math.max(0, profile.traits.aggressiveness - adaptationRate);
        profile.traits.patience = Math.min(1, profile.traits.patience + adaptationRate);
      } else {
        // Too passive, be more aggressive
        profile.traits.aggressiveness = Math.min(1, profile.traits.aggressiveness + adaptationRate);
      }
      
      // Increase caution after failures
      profile.traits.risktaking = Math.max(0, profile.traits.risktaking - adaptationRate);
    }
  }

  /**
   * Get personality-adjusted strategy parameters
   */
  getPersonalityAdjustedParameters(
    colonyId: string,
    baseParameters: AIStrategyParameters
  ): AIStrategyParameters {
    const profile = this.personalities.get(colonyId);
    if (!profile) return baseParameters;
    
    let adjustedParams = { ...baseParameters };
    
    // Apply trait-based adjustments
    adjustedParams.tradingAggressiveness = profile.traits.aggressiveness;
    adjustedParams.riskTolerance = profile.traits.risktaking;
    adjustedParams.trustFactor = profile.traits.trustingness;
    adjustedParams.learningRate = profile.traits.adaptability;
    
    // Apply emotional state modifiers
    if (profile.emotionalState.mood === 'desperate') {
      adjustedParams.tradingAggressiveness *= 1.3;
      adjustedParams.minResourceBuffer *= 0.7;
      adjustedParams.riskTolerance *= 1.4;
    } else if (profile.emotionalState.mood === 'anxious') {
      adjustedParams.minResourceBuffer *= 1.2;
      adjustedParams.maxTradeSize *= 0.8;
    } else if (profile.emotionalState.mood === 'confident') {
      adjustedParams.riskTolerance *= 1.2;
      adjustedParams.maxTradeSize *= 1.1;
    }
    
    // Apply quirk effects
    profile.traits.quirks.forEach(quirk => {
      adjustedParams = quirk.effect(adjustedParams);
    });
    
    // Adjust decision delays based on personality
    switch (profile.traits.decisionSpeed) {
      case 'impulsive':
        adjustedParams.decisionDelayMs.min *= 0.5;
        adjustedParams.decisionDelayMs.max *= 0.7;
        break;
      case 'deliberate':
        adjustedParams.decisionDelayMs.min *= 1.5;
        adjustedParams.decisionDelayMs.max *= 1.8;
        break;
      case 'analytical':
        adjustedParams.decisionDelayMs.min *= 1.2;
        adjustedParams.decisionDelayMs.max *= 1.5;
        break;
    }
    
    return adjustedParams;
  }

  /**
   * Check if AI should trade with a specific partner
   */
  shouldTradeWithPartner(
    colonyId: string,
    partnerId: string,
    partnerType: ColonyType
  ): { willing: boolean; reason: string } {
    const profile = this.personalities.get(colonyId);
    if (!profile) return { willing: true, reason: 'No personality profile' };
    
    // Check avoided partner types
    if (profile.preferences.avoidedPartnerTypes.includes(partnerType)) {
      return { willing: false, reason: `Avoids trading with ${partnerType} colonies` };
    }
    
    // Check relationship
    const relationship = profile.relationships.get(partnerId);
    if (relationship) {
      // Check trust level
      if (relationship.trust < profile.preferences.minimumTrustLevel) {
        return { willing: false, reason: 'Insufficient trust' };
      }
      
      // Check grudges
      if (profile.traits.grudgeHolding === 'vengeful' && relationship.grudges.length > 0) {
        return { willing: false, reason: 'Holding a grudge' };
      }
    }
    
    // Check social preferences
    if (profile.traits.socialPreference === 'loner' && 
        profile.behaviorHistory.averageTradeSize > profile.preferences.maximumTradesPerRound * 0.7) {
      return { willing: false, reason: 'Reached social interaction limit' };
    }
    
    // Preferred partners get priority
    if (profile.preferences.preferredPartnerTypes.includes(partnerType)) {
      return { willing: true, reason: 'Preferred partner type' };
    }
    
    return { willing: true, reason: 'No objections' };
  }

  /**
   * Get human-like delay for decision making
   */
  getDecisionDelay(
    colonyId: string,
    decisionComplexity: 'simple' | 'moderate' | 'complex'
  ): number {
    const profile = this.personalities.get(colonyId);
    if (!profile) return 3000; // Default 3 seconds
    
    let baseDelay = 2000; // 2 seconds base
    
    // Adjust for complexity
    switch (decisionComplexity) {
      case 'simple':
        baseDelay *= 0.7;
        break;
      case 'moderate':
        baseDelay *= 1.0;
        break;
      case 'complex':
        baseDelay *= 1.5;
        break;
    }
    
    // Adjust for personality
    switch (profile.traits.decisionSpeed) {
      case 'impulsive':
        baseDelay *= 0.5;
        break;
      case 'thoughtful':
        baseDelay *= 1.0;
        break;
      case 'deliberate':
        baseDelay *= 1.5;
        break;
      case 'analytical':
        baseDelay *= 1.3;
        break;
    }
    
    // Add stress factor
    if (profile.emotionalState.stress > 0.7) {
      baseDelay *= 0.8; // Faster decisions under stress
    }
    
    // Add randomness (±20%)
    const variation = 0.2;
    const randomFactor = 1 + (Math.random() - 0.5) * variation * 2;
    
    return Math.floor(baseDelay * randomFactor);
  }

  /**
   * Generate preferred trading times
   */
  private generatePreferredTimes(traits: PersonalityTraits): number[] {
    const times: number[] = [];
    
    if (traits.quirks.some(q => q.id === 'early_bird')) {
      times.push(0, 1, 2, 3); // Early in round
    } else if (traits.quirks.some(q => q.id === 'night_owl')) {
      times.push(7, 8, 9); // Late in round
    } else {
      // Normal distribution
      times.push(2, 3, 4, 5, 6, 7);
    }
    
    return times;
  }

  /**
   * Helper to add variation to trait values
   */
  private varyTrait(baseValue: number, variation: number = 0.15): number {
    const variance = (Math.random() - 0.5) * variation * 2;
    return Math.max(0, Math.min(1, baseValue + variance));
  }

  /**
   * Adjust decision speed based on difficulty
   */
  private adjustDecisionSpeed(
    baseSpeed: PersonalityTraits['decisionSpeed'],
    difficulty: AIDifficulty
  ): PersonalityTraits['decisionSpeed'] {
    if (difficulty === 'hard' && baseSpeed === 'deliberate') {
      return 'thoughtful'; // Faster on hard
    }
    if (difficulty === 'easy' && baseSpeed === 'impulsive') {
      return 'thoughtful'; // Slower on easy
    }
    return baseSpeed;
  }

  /**
   * Get difficulty modifiers
   */
  private getDifficultyModifiers(difficulty: AIDifficulty): {
    aggression: number;
    risk: number;
    learning: number;
  } {
    switch (difficulty) {
      case 'easy':
        return { aggression: 0.7, risk: 0.6, learning: 0.5 };
      case 'medium':
        return { aggression: 1.0, risk: 1.0, learning: 1.0 };
      case 'hard':
        return { aggression: 1.3, risk: 1.2, learning: 1.5 };
    }
  }

  /**
   * Get personality description for UI
   */
  getPersonalityDescription(colonyId: string): string {
    const profile = this.personalities.get(colonyId);
    if (!profile) return 'Unknown personality';
    
    const traits = profile.traits;
    const quirks = traits.quirks.map(q => q.name).join(', ');
    
    let description = `${profile.type.replace('_', ' ').toUpperCase()} - `;
    description += `${traits.negotiationStyle} negotiator with ${traits.socialPreference} tendencies. `;
    description += `Prefers ${traits.preferredTradeSize} trades and makes ${traits.decisionSpeed} decisions. `;
    
    if (quirks) {
      description += `Special traits: ${quirks}.`;
    }
    
    return description;
  }

  /**
   * Export personality data for persistence
   */
  exportPersonality(colonyId: string): PersonalityProfile | null {
    return this.personalities.get(colonyId) || null;
  }

  /**
   * Import personality data
   */
  importPersonality(colonyId: string, profile: PersonalityProfile): void {
    this.personalities.set(colonyId, profile);
  }
}

// Export singleton instance
export const aiPersonalityService = new AIPersonalityService();