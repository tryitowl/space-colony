import { AIColonyService } from './aiColonyService';
import { AIStrategyService } from './aiStrategyService';
import { GameService } from './GameService';
import type { GameSession, Colony } from '../types';
import type { 
  AIColonyConfig, 
  AIDifficulty, 
  AIPersonalityType,
  GalaxyAIConfig,
  AITeamDistribution,
  GalaxyAIBehaviorModifiers,
  AISpecialRule,
  CrossGalaxyAICoordination,
  AIPerformanceMetrics
} from '../types/ai.types';
import type { Galaxy, GalaxyConfiguration } from '../types/galaxy.types';

/**
 * Enhanced AI Integration Service with Multi-Galaxy Support
 * 
 * Features:
 * - Per-galaxy AI configuration
 * - AI difficulty mixing across galaxies
 * - Dynamic AI team initialization
 * - AI behavior monitoring and control
 * - Cross-galaxy AI coordination
 */
export class AIIntegrationService {
  private static aiColonyServices: Map<string, AIColonyService> = new Map();
  private static galaxyAIConfigs: Map<string, GalaxyAIConfig> = new Map();
  private static aiPerformanceMetrics: Map<string, AIPerformanceMetrics[]> = new Map();
  private static isPaused: Map<string, boolean> = new Map();
  private static debugMode: Map<string, boolean> = new Map();

  /**
   * Initialize AI colonies for a game session with multi-galaxy support
   */
  static async initializeAIForSession(sessionId: string, galaxyConfig?: GalaxyConfiguration): Promise<void> {
    try {
      // Get session data
      const session = await GameService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check if this is a multi-galaxy session
      const isMultiGalaxy = galaxyConfig && galaxyConfig.galaxies && galaxyConfig.galaxies.length > 1;

      if (isMultiGalaxy && galaxyConfig) {
        // Initialize per-galaxy AI configurations
        await this.initializeMultiGalaxyAI(sessionId, session, galaxyConfig);
      } else {
        // Legacy single-galaxy initialization
        if (!session.aiConfigs || session.aiConfigs.length === 0) {
          console.log(`No AI configuration found for session ${sessionId}`);
          return;
        }

        console.log(`Initializing AI for session ${sessionId} with ${session.aiConfigs.length} AI colonies`);

        // Map AI configs to team IDs
        const mappedConfigs = this.mapAIConfigsToTeams(session.teams, session.aiConfigs);

        // Initialize AI Colony Service for this session with strategy service
        const strategyService = new AIStrategyService();
        const aiService = AIColonyService.getInstance(sessionId, mappedConfigs, strategyService);
        await aiService.initialize(session);

        // Store reference
        this.aiColonyServices.set(sessionId, aiService);
      }

      console.log(`AI colonies initialized for session ${sessionId}`);
    } catch (error) {
      console.error('Error initializing AI for session:', error);
      throw error;
    }
  }

  /**
   * Initialize AI for multi-galaxy sessions
   */
  private static async initializeMultiGalaxyAI(
    sessionId: string,
    session: GameSession,
    galaxyConfig: GalaxyConfiguration
  ): Promise<void> {
    const allAIConfigs: AIColonyConfig[] = [];

    // Process each galaxy
    let totalAITeams = 0;
    if (galaxyConfig.galaxies) {
      for (const galaxy of galaxyConfig.galaxies) {
        if (!galaxy.aiEnabled) continue;

        // Create galaxy-specific AI configuration
        const galaxyAIConfig: GalaxyAIConfig = {
          galaxyId: galaxy.id,
          enabled: galaxy.aiEnabled,
          defaultDifficulty: galaxy.aiDifficulty || 'medium',
          maxAITeams: Math.floor((galaxy.totalTeams || 0) * 0.5), // Default 50% AI max
          aiTeamDistribution: this.getGalaxyAIDistribution(galaxy),
          behaviorModifiers: this.getGalaxyBehaviorModifiers(galaxy)
        };

        this.galaxyAIConfigs.set(galaxy.id, galaxyAIConfig);

        // Generate AI configs for teams in this galaxy
        const galaxyTeams = session.teams.filter(team => 
          team.id.startsWith(galaxy.id) || team.galaxyId === galaxy.id
        );

        const galaxyAIConfigs = await this.generateGalaxyAIConfigs(
          galaxy,
          galaxyTeams,
          galaxyAIConfig
        );

        allAIConfigs.push(...galaxyAIConfigs);
        totalAITeams += galaxyAIConfigs.length;
      }
    }

    // Map AI configs to teams
    const mappedConfigs = this.mapAIConfigsToTeams(session.teams, allAIConfigs);

    // Initialize AI Colony Service with galaxy awareness
    const strategyService = new AIStrategyService();
    const aiService = AIColonyService.getInstance(sessionId, mappedConfigs, strategyService);
    await aiService.initialize(session);

    // Store reference
    this.aiColonyServices.set(sessionId, aiService);

    // Set up cross-galaxy coordination if enabled
    if (galaxyConfig.crossGalaxyTrading) {
      this.setupCrossGalaxyCoordination(sessionId, galaxyConfig);
    }
  }

  /**
   * Generate AI configurations for a specific galaxy
   */
  private static async generateGalaxyAIConfigs(
    galaxy: Galaxy,
    galaxyTeams: Colony[],
    galaxyAIConfig: GalaxyAIConfig
  ): Promise<AIColonyConfig[]> {
    const configs: AIColonyConfig[] = [];
    const distribution = galaxyAIConfig.aiTeamDistribution;

    // Determine how many AI teams to create
    const targetAITeams = Math.min(
      galaxyAIConfig.maxAITeams,
      Math.floor(galaxyTeams.length * 0.3) // Default 30% AI
    );

    // Select teams to be AI-controlled based on distribution mode
    const aiTeamIndices = this.selectAITeamIndices(
      galaxyTeams.length,
      targetAITeams,
      distribution.mode
    );

    // Assign personalities with variety
    const personalities = this.distributePersonalities(
      targetAITeams,
      distribution.personalityDistribution
    );

    // Create AI configs
    aiTeamIndices.forEach((teamIndex, aiIndex) => {
      const team = galaxyTeams[teamIndex];
      const difficulty = this.selectDifficulty(
        galaxyAIConfig.defaultDifficulty,
        galaxy.totalTeams || 0
      );

      configs.push({
        colonyId: team.id,
        difficulty,
        isAIControlled: true,
        galaxyId: galaxy.id,
        personality: personalities[aiIndex],
        adaptiveStrategy: (galaxy.totalTeams || 0) > 6, // Enable for larger galaxies
        cooperationBias: this.calculateCooperationBias(galaxy.totalTeams || 0),
        strategyOverrides: this.getStrategyOverrides(
          team.type,
          galaxy.totalTeams || 0,
          galaxyAIConfig.behaviorModifiers
        )
      });
    });

    return configs;
  }

  /**
   * Get AI team distribution settings for a galaxy
   */
  private static getGalaxyAIDistribution(galaxy: Galaxy): AITeamDistribution {
    const distribution: AITeamDistribution = {
      mode: 'mixed',
      personalityDistribution: {
        'balanced_player': 0.3,
        'aggressive_trader': 0.2,
        'cautious_hoarder': 0.15,
        'opportunistic': 0.15,
        'cooperative': 0.1,
        'competitive': 0.05,
        'specialist': 0.05
      }
    };

    // Adjust based on galaxy size
    if ((galaxy.totalTeams || 0) <= 4) {
      // Small galaxy - more balanced personalities
      distribution.personalityDistribution = {
        'balanced_player': 0.4,
        'cooperative': 0.3,
        'opportunistic': 0.2,
        'specialist': 0.1,
        'aggressive_trader': 0,
        'cautious_hoarder': 0,
        'competitive': 0
      };
    } else if ((galaxy.totalTeams || 0) >= 10) {
      // Large galaxy - more variety and competition
      distribution.personalityDistribution = {
        'aggressive_trader': 0.25,
        'competitive': 0.2,
        'balanced_player': 0.2,
        'opportunistic': 0.15,
        'specialist': 0.1,
        'cautious_hoarder': 0.05,
        'cooperative': 0.05
      };
    }

    return distribution;
  }

  /**
   * Get behavior modifiers for a galaxy
   */
  private static getGalaxyBehaviorModifiers(galaxy: Galaxy): GalaxyAIBehaviorModifiers {
    const modifiers: GalaxyAIBehaviorModifiers = {};

    // Adjust based on galaxy size
    if ((galaxy.totalTeams || 0) <= 6) {
      // Very small galaxy - increase cooperation
      modifiers.cooperationBonus = 0.3;
      modifiers.aggressivenessMultiplier = 0.7;
    } else if ((galaxy.totalTeams || 0) >= 10) {
      // Large galaxy - increase competition
      modifiers.aggressivenessMultiplier = 1.2;
      modifiers.cooperationBonus = -0.1;
    }

    // Add special rules for unique galaxy configurations
    if (galaxy.specialRules && galaxy.specialRules.length > 0) {
      // Note: generateAISpecialRules not yet implemented
      // For now, pass through the special rules as-is
      modifiers.specialRules = galaxy.specialRules as any;
    }

    return modifiers;
  }

  /**
   * Map AI configs to actual team IDs
   */
  private static mapAIConfigsToTeams(teams: Colony[], aiConfigs: AIColonyConfig[]): AIColonyConfig[] {
    const mappedConfigs: AIColonyConfig[] = [];

    for (const config of aiConfigs) {
      // Find matching team based on colony type and configuration
      const matchingTeam = this.findMatchingTeam(teams, config);
      
      if (matchingTeam) {
        mappedConfigs.push({
          ...config,
          colonyId: matchingTeam.id
        });
      }
    }

    return mappedConfigs;
  }

  /**
   * Find matching team for AI config
   */
  private static findMatchingTeam(teams: Colony[], config: AIColonyConfig): Colony | null {
    // Extract colony type and team number from config ID
    const configParts = config.colonyId.split('_');
    if (configParts.length < 2) {
      // Fallback: find first available team of the same type that doesn't have AI yet
      return teams.find(team => 
        team.type === this.extractColonyTypeFromId(config.colonyId) &&
        !this.isTeamAlreadyMapped(team, teams, config)
      ) || null;
    }

    const colonyType = configParts[0];
    const teamNumber = parseInt(configParts[1]);

    // Find exact match
    return teams.find(team => 
      team.type === colonyType && 
      team.teamNumber === teamNumber
    ) || null;
  }

  /**
   * Extract colony type from config ID
   */
  private static extractColonyTypeFromId(configId: string): string {
    // Handle various ID formats
    if (configId.includes('mining')) return 'mining';
    if (configId.includes('agricultural')) return 'agricultural';
    if (configId.includes('research')) return 'research';
    if (configId.includes('trade_hub')) return 'trade_hub';
    if (configId.includes('military')) return 'military';
    if (configId.includes('manufacturing')) return 'manufacturing';
    
    return configId.split('_')[0]; // Default fallback
  }

  /**
   * Check if team is already mapped to avoid duplicates
   */
  private static isTeamAlreadyMapped(_team: Colony, _teams: Colony[], _currentConfig: AIColonyConfig): boolean {
    // This is a simple check - in a real implementation you might want more sophisticated logic
    return false;
  }

  /**
   * Get AI service for a session
   */
  static getAIService(sessionId: string): AIColonyService | null {
    return this.aiColonyServices.get(sessionId) || null;
  }

  /**
   * Cleanup AI services for a session
   */
  static cleanupAIForSession(sessionId: string): void {
    const aiService = this.aiColonyServices.get(sessionId);
    if (aiService) {
      aiService.destroy();
      this.aiColonyServices.delete(sessionId);
      console.log(`AI services cleaned up for session ${sessionId}`);
    }
  }

  /**
   * Check if a team is AI-controlled
   */
  static isTeamAIControlled(sessionId: string, teamId: string): boolean {
    const aiService = this.aiColonyServices.get(sessionId);
    if (!aiService) return false;

    // Check if this team has AI configuration
    return aiService['aiStates']?.has(teamId) || false;
  }

  /**
   * Get AI stats for a session
   */
  static getAIStats(sessionId: string): {
    totalAI: number;
    totalHuman: number;
    aiDifficulties: Record<string, number>;
  } {
    const stats = {
      totalAI: 0,
      totalHuman: 0,
      aiDifficulties: { easy: 0, medium: 0, hard: 0, adaptive: 0 }
    };

    const aiService = this.aiColonyServices.get(sessionId);
    if (!aiService) return stats;

    const aiStates = aiService['aiStates'];
    if (aiStates) {
      stats.totalAI = aiStates.size;
      
      for (const aiState of aiStates.values()) {
        const difficulty = aiState.config.difficulty;
        stats.aiDifficulties[difficulty] = (stats.aiDifficulties[difficulty] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Pause AI for a session (useful for debugging or manual control)
   */
  static pauseAI(sessionId: string): void {
    const aiService = this.aiColonyServices.get(sessionId);
    if (aiService) {
      // Mark session as paused
      this.isPaused.set(sessionId, true);
      
      // Use the pauseAll method
      aiService.pauseAll();
      
      console.log(`AI paused for session ${sessionId}`);
    }
  }

  /**
   * Resume AI for a session
   */
  static resumeAI(sessionId: string): void {
    const aiService = this.aiColonyServices.get(sessionId);
    if (aiService) {
      // Mark session as not paused
      this.isPaused.set(sessionId, false);
      
      // Use the resumeAll method
      aiService.resumeAll();
      
      console.log(`AI resumed for session ${sessionId}`);
    }
  }

  /**
   * Force AI to make immediate decisions (useful for testing)
   */
  static async forceAIDecisions(sessionId: string): Promise<void> {
    const aiService = this.aiColonyServices.get(sessionId);
    if (aiService) {
      // Don't force if paused
      if (this.isPaused.get(sessionId)) {
        console.warn(`Cannot force AI decisions - session ${sessionId} is paused`);
        return;
      }
      
      // Use the forceAllDecisions method
      await aiService.forceAllDecisions();
      
      console.log(`Forced AI decisions for session ${sessionId}`);
    }
  }

  /**
   * Select which teams should be AI-controlled
   */
  private static selectAITeamIndices(
    totalTeams: number,
    targetAITeams: number,
    mode: 'fill' | 'replace' | 'mixed'
  ): number[] {
    const indices: number[] = [];
    
    switch (mode) {
      case 'fill':
        // Fill from the end (assuming humans join first)
        for (let i = totalTeams - targetAITeams; i < totalTeams; i++) {
          indices.push(i);
        }
        break;
        
      case 'replace':
        // Replace random teams
        const available = Array.from({ length: totalTeams }, (_, i) => i);
        for (let i = 0; i < targetAITeams; i++) {
          const randomIndex = Math.floor(Math.random() * available.length);
          indices.push(available.splice(randomIndex, 1)[0]);
        }
        break;
        
      case 'mixed':
      default:
        // Mixed approach - distribute evenly
        const step = Math.floor(totalTeams / targetAITeams);
        for (let i = 0; i < targetAITeams; i++) {
          indices.push(i * step + Math.floor(Math.random() * step));
        }
        break;
    }
    
    return indices;
  }

  /**
   * Distribute AI personalities based on weights
   */
  private static distributePersonalities(
    count: number,
    distribution?: Record<AIPersonalityType, number>
  ): AIPersonalityType[] {
    const defaultDistribution = {
      'balanced_player': 0.3,
      'aggressive_trader': 0.2,
      'cautious_hoarder': 0.15,
      'opportunistic': 0.15,
      'cooperative': 0.1,
      'competitive': 0.05,
      'specialist': 0.05
    };

    const weights = distribution || defaultDistribution;
    const personalities: AIPersonalityType[] = [];
    
    // Create weighted array
    const weightedPersonalities: AIPersonalityType[] = [];
    Object.entries(weights).forEach(([personality, weight]) => {
      const count = Math.round(weight * 100);
      for (let i = 0; i < count; i++) {
        weightedPersonalities.push(personality as AIPersonalityType);
      }
    });
    
    // Select personalities
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * weightedPersonalities.length);
      personalities.push(weightedPersonalities[index]);
    }
    
    return personalities;
  }

  /**
   * Select difficulty with variation
   */
  private static selectDifficulty(
    baseDifficulty: AIDifficulty,
    galaxySize: number
  ): AIDifficulty {
    // Small chance of variation from base difficulty
    const variationChance = 0.2;
    
    if (Math.random() > variationChance) {
      return baseDifficulty;
    }
    
    // Vary difficulty based on galaxy size
    if (galaxySize <= 4) {
      // Small galaxy - tend toward easier
      const options: AIDifficulty[] = ['easy', 'medium'];
      return options[Math.floor(Math.random() * options.length)];
    } else if (galaxySize >= 10) {
      // Large galaxy - tend toward harder
      const options: AIDifficulty[] = ['medium', 'hard'];
      return options[Math.floor(Math.random() * options.length)];
    }
    
    // Medium galaxy - any difficulty
    const allOptions: AIDifficulty[] = ['easy', 'medium', 'hard'];
    return allOptions[Math.floor(Math.random() * allOptions.length)];
  }

  /**
   * Calculate cooperation bias based on galaxy size
   */
  private static calculateCooperationBias(galaxySize: number): number {
    // Small galaxies need more cooperation
    if (galaxySize <= 3) return 0.7;
    if (galaxySize <= 6) return 0.5;
    if (galaxySize <= 10) return 0.3;
    return 0.2; // Large galaxies are more competitive
  }

  /**
   * Get strategy overrides based on galaxy context
   */
  private static getStrategyOverrides(
    _colonyType: string,
    galaxySize: number,
    modifiers?: GalaxyAIBehaviorModifiers
  ): Partial<import('../types/ai.types').AIStrategyParameters> | undefined {
    const overrides: Partial<import('../types/ai.types').AIStrategyParameters> = {};
    
    // Apply galaxy size adjustments
    if (galaxySize <= 3) {
      // Small galaxy - more conservative
      overrides.minResourceBuffer = 3.0;
      overrides.maxTradeSize = 0.3;
      overrides.emergencyThreshold = 2.0;
    } else if (galaxySize >= 10) {
      // Large galaxy - more aggressive
      overrides.minResourceBuffer = 1.5;
      overrides.maxTradeSize = 0.5;
      overrides.emergencyThreshold = 1.2;
    }
    
    // Apply behavior modifiers
    if (modifiers) {
      if (modifiers.aggressivenessMultiplier) {
        overrides.tradingAggressiveness = (overrides.tradingAggressiveness || 0.5) * modifiers.aggressivenessMultiplier;
      }
      if (modifiers.cooperationBonus) {
        overrides.trustFactor = (overrides.trustFactor || 0.5) + modifiers.cooperationBonus;
      }
    }
    
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  }

  /**
            return true; // Simplified for now
          },
          effect: (decision) => {
            // Modify decision based on trade restrictions
            if (decision.type === 'initiate_trade') {
              decision.confidence *= 0.8; // Reduce confidence due to restrictions
            }
            return decision;
          },
          priority: 10
        });
      }
    });
    
    return aiRules;
  }

  /**
   * Set up cross-galaxy AI coordination
   */
  private static setupCrossGalaxyCoordination(
    sessionId: string,
    _galaxyConfig: GalaxyConfiguration
  ): void {
    // Implement cross-galaxy AI coordination
    console.log(`Setting up cross-galaxy AI coordination for session ${sessionId}`);
    
    // This would set up shared memory and coordination mechanisms
    // between AI teams across different galaxies
  }

  /**
   * Get AI team names based on personality
   */
  static getAITeamName(personality: AIPersonalityType, colonyType: string, index: number): string {
    const personalityNames: Record<AIPersonalityType, string[]> = {
      'aggressive_trader': ['Profit Corps', 'Trade Sharks', 'Market Raiders', 'Credit Hunters'],
      'cautious_hoarder': ['Resource Guards', 'Supply Keepers', 'Reserve Bank', 'Stockpile Co'],
      'balanced_player': ['Unity Alliance', 'Harmony Group', 'Balance Corp', 'Stable Systems'],
      'opportunistic': ['Quick Strike', 'Chance Takers', 'Opportunity Inc', 'Swift Traders'],
      'cooperative': ['Alliance Network', 'Partner Systems', 'Unity Trade', 'Helpful Hand'],
      'competitive': ['Victory Corp', 'Win Systems', 'Top Traders', 'Elite Exchange'],
      'specialist': ['Focus Group', 'Expert Systems', 'Specialty Inc', 'Pro Traders']
    };

    const names = personalityNames[personality];
    const baseName = names[index % names.length];
    
    // Add colony type suffix
    const colonySuffix = colonyType.charAt(0).toUpperCase() + colonyType.slice(1);
    
    return `${baseName} (${colonySuffix} AI)`;
  }

  /**
   * Monitor AI performance across galaxies
   */
  static async updateAIPerformanceMetrics(
    sessionId: string,
    colonyId: string,
    metrics: Partial<AIPerformanceMetrics>
  ): Promise<void> {
    const key = `${sessionId}_${colonyId}`;
    const existing = this.aiPerformanceMetrics.get(key) || [];
    
    const newMetric: AIPerformanceMetrics = {
      colonyId,
      galaxyId: metrics.galaxyId || '',
      survivalRate: metrics.survivalRate || 0,
      tradingSuccess: metrics.tradingSuccess || 0,
      resourceEfficiency: metrics.resourceEfficiency || 0,
      adaptationScore: metrics.adaptationScore || 0,
      humanInteractionScore: metrics.humanInteractionScore || 0,
      overallRating: metrics.overallRating || 0
    };
    
    existing.push(newMetric);
    this.aiPerformanceMetrics.set(key, existing);
  }

  /**
   * Get AI performance report
   */
  static getAIPerformanceReport(sessionId: string): {
    byGalaxy: Record<string, AIPerformanceMetrics[]>;
    overall: {
      avgSurvivalRate: number;
      avgTradingSuccess: number;
      bestPerformer: string | null;
      worstPerformer: string | null;
    };
  } {
    const allMetrics: AIPerformanceMetrics[] = [];
    
    // Collect all metrics for this session
    for (const [key, metrics] of this.aiPerformanceMetrics.entries()) {
      if (key.startsWith(sessionId)) {
        allMetrics.push(...metrics);
      }
    }
    
    // Group by galaxy
    const byGalaxy: Record<string, AIPerformanceMetrics[]> = {};
    allMetrics.forEach(metric => {
      if (!byGalaxy[metric.galaxyId]) {
        byGalaxy[metric.galaxyId] = [];
      }
      byGalaxy[metric.galaxyId].push(metric);
    });
    
    // Calculate overall stats
    const avgSurvivalRate = allMetrics.reduce((sum, m) => sum + m.survivalRate, 0) / (allMetrics.length || 1);
    const avgTradingSuccess = allMetrics.reduce((sum, m) => sum + m.tradingSuccess, 0) / (allMetrics.length || 1);
    
    const sortedByRating = [...allMetrics].sort((a, b) => b.overallRating - a.overallRating);
    const bestPerformer = sortedByRating[0]?.colonyId || null;
    const worstPerformer = sortedByRating[sortedByRating.length - 1]?.colonyId || null;
    
    return {
      byGalaxy,
      overall: {
        avgSurvivalRate,
        avgTradingSuccess,
        bestPerformer,
        worstPerformer
      }
    };
  }

  /**
   * Enable/disable debug mode for AI
   */
  static setDebugMode(sessionId: string, enabled: boolean): void {
    this.debugMode.set(sessionId, enabled);
    
    const aiService = this.aiColonyServices.get(sessionId);
    if (aiService) {
      // Would enable verbose logging in AI service
      console.log(`AI debug mode ${enabled ? 'enabled' : 'disabled'} for session ${sessionId}`);
    }
  }

  /**
   * Get AI debug information
   */
  static getAIDebugInfo(sessionId: string): any {
    const aiService = this.aiColonyServices.get(sessionId);
    if (!aiService) return null;
    
    // Would return detailed AI state information
    return {
      isPaused: this.isPaused.get(sessionId) || false,
      debugMode: this.debugMode.get(sessionId) || false,
      galaxyConfigs: Array.from(this.galaxyAIConfigs.entries())
        .filter(([key]) => key.includes(sessionId))
        .map(([key, config]) => ({ galaxyId: key, config })),
      performanceMetrics: this.getAIPerformanceReport(sessionId)
    };
  }
}