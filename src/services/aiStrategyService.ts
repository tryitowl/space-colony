import type { 
  AIStrategy, 
  AIStrategyParameters, 
  AIDifficulty
} from '../types/ai.types';
import { DEFAULT_DIFFICULTY_PARAMS } from '../types/ai.types';
import type { ColonyType } from '../types';

export class AIStrategyService {
  private strategies: Map<ColonyType, AIStrategy>;

  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize all colony-specific strategies
   */
  private initializeStrategies(): void {
    // Mining Colony Strategy - Aggressive mineral/alloy trading
    this.strategies.set('mining', {
      colonyType: 'mining',
      name: 'Resource Extraction Focus',
      description: 'Aggressively trades minerals and alloys for survival resources',
      parameters: {
        tradingAggressiveness: 0.7,
        resourcePriorities: {
          oxygen: 0.9,
          food: 0.8,
          water: 0.8,
          energy: 0.7,
          minerals: 0.4, // Low priority - we produce these
          alloys: 0.3,
          techComponents: 0.6,
          defenseContracts: 0.5,
          systemRepairs: 0.5,
          transportRoutes: 0.6,
          techPatents: 0.5,
          blueprints: 0.6,
          alienTech: 0.7,
          credits: 0.6
        },
        preferredPartners: ['manufacturing', 'trade_hub'],
        avoidedPartners: [],
        minResourceBuffer: 2.0,
        maxTradeSize: 0.4,
        emergencyThreshold: 1.5,
        decisionDelayMs: { min: 3000, max: 8000 },
        riskTolerance: 0.6,
        trustFactor: 0.5,
        learningRate: 0.3
      }
    });

    // Agricultural Colony Strategy - Conservative food/water management
    this.strategies.set('agricultural', {
      colonyType: 'agricultural',
      name: 'Life Support Preservation',
      description: 'Maintains strong reserves of food and water, trades cautiously',
      parameters: {
        tradingAggressiveness: 0.3,
        resourcePriorities: {
          oxygen: 0.9,
          food: 1.0, // Highest priority - our specialty
          water: 1.0,
          energy: 0.7,
          minerals: 0.6,
          alloys: 0.5,
          techComponents: 0.5,
          defenseContracts: 0.6,
          systemRepairs: 0.6,
          transportRoutes: 0.5,
          techPatents: 0.4,
          blueprints: 0.4,
          alienTech: 0.6,
          credits: 0.7
        },
        preferredPartners: ['trade_hub', 'research'],
        avoidedPartners: [],
        minResourceBuffer: 3.0, // Conservative - keep large reserves
        maxTradeSize: 0.25, // Small trades only
        emergencyThreshold: 2.0,
        decisionDelayMs: { min: 5000, max: 12000 },
        riskTolerance: 0.2, // Risk averse
        trustFactor: 0.8, // High trust needed
        learningRate: 0.2
      }
    });

    // Research Colony Strategy - Seeks tech components and patents
    this.strategies.set('research', {
      colonyType: 'research',
      name: 'Technology Advancement',
      description: 'Prioritizes acquiring tech components and developing patents',
      parameters: {
        tradingAggressiveness: 0.5,
        resourcePriorities: {
          oxygen: 0.8,
          food: 0.7,
          water: 0.7,
          energy: 0.9, // High energy needs for research
          minerals: 0.5,
          alloys: 0.6,
          techComponents: 1.0, // Highest priority
          defenseContracts: 0.4,
          systemRepairs: 0.5,
          transportRoutes: 0.5,
          techPatents: 0.9,
          blueprints: 0.8,
          alienTech: 1.0, // Very interested in alien tech
          credits: 0.6
        },
        preferredPartners: ['mining', 'manufacturing', 'military'],
        avoidedPartners: [],
        minResourceBuffer: 2.0,
        maxTradeSize: 0.35,
        emergencyThreshold: 1.5,
        decisionDelayMs: { min: 4000, max: 10000 },
        riskTolerance: 0.5,
        trustFactor: 0.6,
        learningRate: 0.5 // Fast learner
      }
    });

    // Trade Hub Strategy - Balanced profit-seeking
    this.strategies.set('trade_hub', {
      colonyType: 'trade_hub',
      name: 'Market Arbitrage',
      description: 'Seeks profitable trades and maintains diverse resource portfolio',
      parameters: {
        tradingAggressiveness: 0.8, // Very active trader
        resourcePriorities: {
          oxygen: 0.8,
          food: 0.8,
          water: 0.8,
          energy: 0.8,
          minerals: 0.7,
          alloys: 0.7,
          techComponents: 0.7,
          defenseContracts: 0.6,
          systemRepairs: 0.6,
          transportRoutes: 0.8, // Important for trade
          techPatents: 0.6,
          blueprints: 0.6,
          alienTech: 0.8,
          credits: 1.0 // Highest priority - liquidity is key
        },
        preferredPartners: [], // No preferences - trades with everyone
        avoidedPartners: [],
        minResourceBuffer: 1.5, // Lower buffer - relies on trading
        maxTradeSize: 0.5, // Large trades for profit
        emergencyThreshold: 1.2,
        decisionDelayMs: { min: 2000, max: 6000 }, // Quick decisions
        riskTolerance: 0.7, // Higher risk for higher profit
        trustFactor: 0.5,
        learningRate: 0.4
      }
    });

    // Military Colony Strategy - Defense contracts focus
    this.strategies.set('military', {
      colonyType: 'military',
      name: 'Defense Supremacy',
      description: 'Maintains strong defense capabilities and strategic resources',
      parameters: {
        tradingAggressiveness: 0.4,
        resourcePriorities: {
          oxygen: 0.9,
          food: 0.7,
          water: 0.7,
          energy: 0.8,
          minerals: 0.6,
          alloys: 0.7, // Need for military equipment
          techComponents: 0.6,
          defenseContracts: 1.0, // Highest priority
          systemRepairs: 0.8, // Important for maintenance
          transportRoutes: 0.7,
          techPatents: 0.5,
          blueprints: 0.6,
          alienTech: 0.8, // Military applications
          credits: 0.6
        },
        preferredPartners: ['manufacturing', 'research'],
        avoidedPartners: [],
        minResourceBuffer: 2.5, // Strategic reserves
        maxTradeSize: 0.3,
        emergencyThreshold: 1.8,
        decisionDelayMs: { min: 4000, max: 10000 },
        riskTolerance: 0.3, // Conservative
        trustFactor: 0.4, // Low trust - military mindset
        learningRate: 0.3
      }
    });

    // Manufacturing Colony Strategy - Production efficiency
    this.strategies.set('manufacturing', {
      colonyType: 'manufacturing',
      name: 'Industrial Optimization',
      description: 'Focuses on efficient production and alloy trading',
      parameters: {
        tradingAggressiveness: 0.6,
        resourcePriorities: {
          oxygen: 0.8,
          food: 0.7,
          water: 0.9, // Critical for manufacturing
          energy: 0.9, // High energy needs
          minerals: 0.8, // Raw materials
          alloys: 0.3, // We produce these
          techComponents: 0.7,
          defenseContracts: 0.5,
          systemRepairs: 0.7, // Equipment maintenance
          transportRoutes: 0.7,
          techPatents: 0.6,
          blueprints: 0.8, // Production plans
          alienTech: 0.6,
          credits: 0.6
        },
        preferredPartners: ['mining', 'military', 'trade_hub'],
        avoidedPartners: [],
        minResourceBuffer: 2.0,
        maxTradeSize: 0.4,
        emergencyThreshold: 1.5,
        decisionDelayMs: { min: 3000, max: 9000 },
        riskTolerance: 0.5,
        trustFactor: 0.6,
        learningRate: 0.3
      }
    });
  }

  /**
   * Get strategy for a specific colony type and difficulty
   */
  getStrategy(colonyType: ColonyType, difficulty: AIDifficulty): AIStrategy {
    const baseStrategy = this.strategies.get(colonyType);
    if (!baseStrategy) {
      throw new Error(`No strategy defined for colony type: ${colonyType}`);
    }

    // Apply difficulty modifiers
    const difficultyParams = DEFAULT_DIFFICULTY_PARAMS[difficulty];
    const modifiedStrategy: AIStrategy = {
      ...baseStrategy,
      parameters: {
        ...baseStrategy.parameters,
        ...difficultyParams
      }
    };

    // Adjust colony-specific parameters based on difficulty
    this.applyDifficultyModifiers(modifiedStrategy, difficulty);

    return modifiedStrategy;
  }

  /**
   * Apply additional difficulty-based modifications
   */
  private applyDifficultyModifiers(strategy: AIStrategy, difficulty: AIDifficulty): void {
    switch (difficulty) {
      case 'easy':
        // Easy AI makes more mistakes, slower reactions
        strategy.parameters.tradingAggressiveness *= 0.7;
        strategy.parameters.learningRate *= 0.5;
        // Increase all decision delays by 50%
        strategy.parameters.decisionDelayMs.min *= 1.5;
        strategy.parameters.decisionDelayMs.max *= 1.5;
        break;

      case 'hard':
        // Hard AI is more optimal, faster reactions
        strategy.parameters.learningRate *= 1.5;
        // Adjust priorities to be more optimal
        this.optimizePriorities(strategy.parameters.resourcePriorities);
        // Reduce decision delays by 30%
        strategy.parameters.decisionDelayMs.min *= 0.7;
        strategy.parameters.decisionDelayMs.max *= 0.7;
        break;

      case 'medium':
        // Medium is baseline - no additional modifications
        break;
    }
  }

  /**
   * Optimize resource priorities for hard difficulty
   */
  private optimizePriorities(priorities: AIStrategyParameters['resourcePriorities']): void {
    // Increase priority of critical resources
    priorities.oxygen = Math.min(priorities.oxygen * 1.1, 1.0);
    priorities.food = Math.min(priorities.food * 1.1, 1.0);
    priorities.water = Math.min(priorities.water * 1.1, 1.0);
    priorities.energy = Math.min(priorities.energy * 1.1, 1.0);

    // Slightly reduce priority of non-critical resources
    priorities.techPatents *= 0.9;
    priorities.blueprints *= 0.9;
  }

  /**
   * Get strategy description for UI
   */
  getStrategyDescription(colonyType: ColonyType): string {
    const strategy = this.strategies.get(colonyType);
    return strategy?.description || 'Unknown strategy';
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): AIStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Update strategy parameters (for dynamic adjustment)
   */
  updateStrategyParameters(
    colonyType: ColonyType, 
    updates: Partial<AIStrategyParameters>
  ): void {
    const strategy = this.strategies.get(colonyType);
    if (strategy) {
      Object.assign(strategy.parameters, updates);
    }
  }

  /**
   * Get recommended difficulty based on player experience
   */
  getRecommendedDifficulty(playerExperience: 'beginner' | 'intermediate' | 'expert'): AIDifficulty {
    switch (playerExperience) {
      case 'beginner':
        return 'easy';
      case 'intermediate':
        return 'medium';
      case 'expert':
        return 'hard';
      default:
        return 'medium';
    }
  }

  /**
   * Analyze strategy effectiveness (for debugging/tuning)
   */
  analyzeStrategyEffectiveness(
    _colonyType: ColonyType,
    outcomes: Array<{ survivalRounds: number; finalScore: number }>
  ): {
    averageSurvival: number;
    averageScore: number;
    successRate: number;
  } {
    if (outcomes.length === 0) {
      return { averageSurvival: 0, averageScore: 0, successRate: 0 };
    }

    const totalSurvival = outcomes.reduce((sum, o) => sum + o.survivalRounds, 0);
    const totalScore = outcomes.reduce((sum, o) => sum + o.finalScore, 0);
    const successCount = outcomes.filter(o => o.survivalRounds >= 5).length;

    return {
      averageSurvival: totalSurvival / outcomes.length,
      averageScore: totalScore / outcomes.length,
      successRate: successCount / outcomes.length
    };
  }

  /**
   * Get strategy adjusted for galaxy size (2-20 teams)
   */
  getGalaxySizeAdjustedStrategy(
    colonyType: ColonyType,
    difficulty: AIDifficulty,
    galaxySize: number
  ): AIStrategy {
    const baseStrategy = this.getStrategy(colonyType, difficulty);
    
    // Clone the strategy to avoid modifying the original
    const adjustedStrategy: AIStrategy = {
      ...baseStrategy,
      parameters: { ...baseStrategy.parameters }
    };

    // Apply galaxy size adjustments
    if (galaxySize <= 2) {
      // 2-team galaxy: Maximum cooperation needed
      adjustedStrategy.name += ' (Duopoly Mode)';
      adjustedStrategy.parameters.tradingAggressiveness *= 0.6;
      adjustedStrategy.parameters.minResourceBuffer *= 0.8;
      adjustedStrategy.parameters.maxTradeSize *= 1.5;
      adjustedStrategy.parameters.emergencyThreshold *= 0.8;
      adjustedStrategy.parameters.trustFactor = Math.min(0.9, adjustedStrategy.parameters.trustFactor * 1.5);
      adjustedStrategy.parameters.preferredPartners = []; // Trade with anyone
    } else if (galaxySize <= 5) {
      // Small galaxy: Cooperative with strategic competition
      adjustedStrategy.name += ' (Small Galaxy)';
      adjustedStrategy.parameters.tradingAggressiveness *= 0.8;
      adjustedStrategy.parameters.minResourceBuffer *= 1.1;
      adjustedStrategy.parameters.trustFactor *= 1.2;
    } else if (galaxySize >= 10 && galaxySize < 15) {
      // Large galaxy: More competitive
      adjustedStrategy.name += ' (Large Galaxy)';
      adjustedStrategy.parameters.tradingAggressiveness *= 1.3;
      adjustedStrategy.parameters.minResourceBuffer *= 0.9;
      adjustedStrategy.parameters.maxTradeSize *= 1.2;
      adjustedStrategy.parameters.riskTolerance *= 1.2;
    } else if (galaxySize >= 15) {
      // Very large galaxy: Highly competitive
      adjustedStrategy.name += ' (Mega Galaxy)';
      adjustedStrategy.parameters.tradingAggressiveness *= 1.5;
      adjustedStrategy.parameters.minResourceBuffer *= 0.7;
      adjustedStrategy.parameters.maxTradeSize *= 1.3;
      adjustedStrategy.parameters.riskTolerance *= 1.4;
      adjustedStrategy.parameters.trustFactor *= 0.7;
      adjustedStrategy.parameters.learningRate *= 1.3;
      
      // Faster decisions in large galaxies
      adjustedStrategy.parameters.decisionDelayMs.min *= 0.6;
      adjustedStrategy.parameters.decisionDelayMs.max *= 0.7;
    }

    // Adjust resource priorities based on scarcity in different galaxy sizes
    this.adjustResourcePrioritiesForGalaxySize(adjustedStrategy.parameters.resourcePriorities, galaxySize);

    return adjustedStrategy;
  }

  /**
   * Adjust resource priorities based on expected scarcity
   */
  private adjustResourcePrioritiesForGalaxySize(
    priorities: AIStrategyParameters['resourcePriorities'],
    galaxySize: number
  ): void {
    if (galaxySize <= 3) {
      // Small galaxy - critical resources are even more important
      priorities.oxygen = Math.min(1.0, priorities.oxygen * 1.1);
      priorities.food = Math.min(1.0, priorities.food * 1.1);
      priorities.water = Math.min(1.0, priorities.water * 1.1);
      priorities.energy = Math.min(1.0, priorities.energy * 1.1);
    } else if (galaxySize >= 15) {
      // Large galaxy - specialty resources become more valuable
      priorities.techComponents *= 1.2;
      priorities.defenseContracts *= 1.2;
      priorities.alienTech *= 1.3;
      priorities.credits *= 1.2; // More trading opportunities
    }
  }

  /**
   * Get emergency strategy for critical situations
   */
  getEmergencyStrategy(_colonyType: ColonyType, galaxySize: number): Partial<AIStrategyParameters> {
    const emergencyParams: Partial<AIStrategyParameters> = {
      tradingAggressiveness: 0.9, // Very aggressive
      minResourceBuffer: 0.5, // Accept lower buffers
      maxTradeSize: 0.7, // Large trades
      emergencyThreshold: 0.5, // Already in emergency
      riskTolerance: 0.9, // Take risks
      decisionDelayMs: { min: 500, max: 2000 } // Fast decisions
    };

    // Adjust for galaxy size
    if (galaxySize <= 3) {
      emergencyParams.trustFactor = 0.8; // Trust is crucial in small galaxies
    } else if (galaxySize >= 10) {
      emergencyParams.tradingAggressiveness = 1.0; // Maximum aggression in large galaxies
    }

    return emergencyParams;
  }

  /**
   * Get cooperation strategy for team events
   */
  getCooperativeEventStrategy(_colonyType: ColonyType): Partial<AIStrategyParameters> {
    return {
      tradingAggressiveness: 0.6,
      trustFactor: 0.8,
      preferredPartners: [], // Trade with all
      minResourceBuffer: 1.5, // Keep some reserves
      maxTradeSize: 0.4,
      riskTolerance: 0.3 // Conservative during events
    };
  }

  /**
   * Get tournament strategy for competitive play
   */
  getTournamentStrategy(colonyType: ColonyType, round: number, totalRounds: number): AIStrategy {
    const baseStrategy = this.getStrategy(colonyType, 'hard');
    const adjustedStrategy = { ...baseStrategy };
    
    // Early game - establish position
    if (round <= totalRounds * 0.3) {
      adjustedStrategy.parameters.tradingAggressiveness *= 0.8;
      adjustedStrategy.parameters.minResourceBuffer *= 1.3;
    }
    // Mid game - optimize
    else if (round <= totalRounds * 0.7) {
      adjustedStrategy.parameters.tradingAggressiveness *= 1.1;
      adjustedStrategy.parameters.maxTradeSize *= 1.2;
    }
    // End game - maximize score
    else {
      adjustedStrategy.parameters.tradingAggressiveness *= 1.4;
      adjustedStrategy.parameters.minResourceBuffer *= 0.6;
      adjustedStrategy.parameters.riskTolerance *= 1.5;
    }

    return adjustedStrategy;
  }
}