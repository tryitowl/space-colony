/**
 * Configuration Validation Service
 * 
 * Comprehensive validation for galaxy configurations ensuring game balance,
 * performance, and compatibility before game creation.
 */

import type {
  Galaxy,
  GalaxyConfiguration,
  SpecialRule,
  VictoryCondition,
  EnhancedColony,
  TeamAssignment,
  CrossGalaxyTradeRules
} from '../types/galaxy.types';
import type {
  ColonyType,
  Resources
} from '../types/base.types';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationErrorCode,
  GalaxyConstraints,
  GalaxyBalanceMetrics,
  TeamCapability,
  ResourceBalanceValidation,
  TeamCompositionValidation,
  RuleCompatibility,
  VictoryConditionValidation,
  ValidationContext,
  ValidatedGalaxyConfiguration,
  ValidationMessage,
  ValidatorOptions,
  ValidationReport,
  DEFAULT_GALAXY_CONSTRAINTS
} from '../types/validation.types';
import { COLONY_STARTING_RESOURCES } from '../types';
import { sessionCodeService } from './sessionCodeService';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  maxTotalTeams: 100,
  maxTotalPlayers: 500,
  maxGalaxies: 10,
  warningTeamsPerGalaxy: 15,
  criticalTeamsPerGalaxy: 20
};

// Balance thresholds
const BALANCE_THRESHOLDS = {
  minTradeBalance: 0.3, // Minimum acceptable trade balance score
  maxResourceImbalance: 2.0, // Maximum ratio between highest and lowest production
  minSurvivalProbability: 0.7, // Minimum probability all teams can survive
  criticalResourceThreshold: 0.2 // Percentage of teams that may face resource shortage
};

/**
 * Main Configuration Validation Service
 */
export class ConfigurationValidationService {
  private validationCache: Map<string, ValidationResult> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Main validation entry point
   */
  async validate(
    configuration: GalaxyConfiguration,
    options: ValidatorOptions = {
      strictMode: false,
      autoFix: false,
      checkBalance: true,
      checkAI: true
    }
  ): Promise<ValidationResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(configuration);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic structure validation
    this.validateBasicStructure(configuration, errors, warnings);

    // Team and player count validation
    await this.validateTeamCounts(configuration, errors, warnings);

    // AI configuration validation
    if (options.checkAI) {
      this.validateAIConfiguration(configuration, errors, warnings);
    }

    // Resource balance validation
    if (options.checkBalance) {
      await this.validateResourceBalance(configuration, errors, warnings);
    }

    // Special rules compatibility
    this.validateSpecialRules(configuration, errors, warnings);

    // Victory conditions validation
    this.validateVictoryConditions(configuration, errors, warnings);

    // Performance validation
    this.validatePerformance(configuration, errors, warnings);

    // Session code availability
    await this.validateSessionCodes(configuration, errors, warnings);

    // Apply auto-fixes if requested
    if (options.autoFix && errors.length > 0) {
      this.applyAutoFixes(configuration, errors);
    }

    // Check strictMode
    const valid = options.strictMode 
      ? errors.length === 0 && warnings.length === 0
      : errors.length === 0;

    const result: ValidationResult = { valid, errors, warnings };

    // Cache the result
    this.cacheResult(cacheKey, result);

    return result;
  }

  /**
   * Validate basic configuration structure
   */
  private validateBasicStructure(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check galaxies array
    if (!config.galaxies || !Array.isArray(config.galaxies)) {
      errors.push({
        field: 'galaxies',
        message: 'Configuration must have a galaxies array',
        code: 'MISSING_REQUIRED_FIELD'
      });
      return;
    }

    if (config.galaxies.length === 0) {
      errors.push({
        field: 'galaxies',
        message: 'At least one galaxy must be configured',
        code: 'INVALID_GALAXY_COUNT',
        context: { count: 0, min: 1 }
      });
    }

    if (config.galaxies.length > PERFORMANCE_THRESHOLDS.maxGalaxies) {
      errors.push({
        field: 'galaxies',
        message: `Maximum ${PERFORMANCE_THRESHOLDS.maxGalaxies} galaxies allowed`,
        code: 'INVALID_GALAXY_COUNT',
        context: { count: config.galaxies.length, max: PERFORMANCE_THRESHOLDS.maxGalaxies }
      });
    }

    // Validate cross-galaxy trading configuration
    if (config.crossGalaxyTrading && config.galaxies.length < 2) {
      errors.push({
        field: 'crossGalaxyTrading',
        message: 'Cross-galaxy trading requires at least 2 galaxies',
        code: 'CONFLICTING_RULES',
        context: { galaxyCount: config.galaxies.length }
      });
    }

    // Check competition mode
    const validModes = ['individual', 'galaxy', 'hybrid'];
    if (!validModes.includes(config.competitionMode)) {
      errors.push({
        field: 'competitionMode',
        message: `Competition mode must be one of: ${validModes.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELD'
      });
    }

    // Victory conditions check
    if (!config.victoryConditions || config.victoryConditions.length === 0) {
      warnings.push({
        field: 'victoryConditions',
        message: 'No victory conditions specified, defaulting to survival only',
        suggestion: 'Add at least one victory condition for clearer objectives'
      });
    }
  }

  /**
   * Validate team counts across all galaxies
   */
  private async validateTeamCounts(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    let totalTeams = 0;
    let totalMaxPlayers = 0;

    config.galaxies?.forEach((galaxy, index) => {
      // Validate individual galaxy team count
      if ((galaxy.totalTeams || 0) < 2) {
        errors.push({
          field: `galaxies[${index}].totalTeams`,
          message: 'Each galaxy must have at least 2 teams',
          code: 'INVALID_TEAM_COUNT',
          context: { galaxyId: galaxy.id, teams: galaxy.totalTeams, min: 2 }
        });
      }

      if ((galaxy.totalTeams || 0) > 20) {
        errors.push({
          field: `galaxies[${index}].totalTeams`,
          message: 'Each galaxy can have maximum 20 teams',
          code: 'INVALID_TEAM_COUNT',
          context: { galaxyId: galaxy.id, teams: galaxy.totalTeams, max: 20 }
        });
      }

      // Performance warning for large galaxies
      if (galaxy.totalTeams > PERFORMANCE_THRESHOLDS.warningTeamsPerGalaxy) {
        warnings.push({
          field: `galaxies[${index}].totalTeams`,
          message: `Galaxy "${galaxy.name}" has ${galaxy.totalTeams} teams which may impact performance`,
          suggestion: 'Consider splitting into multiple smaller galaxies'
        });
      }

      // Validate colony types availability
      if (!galaxy.colonyTypes || galaxy.colonyTypes.length === 0) {
        errors.push({
          field: `galaxies[${index}].colonyTypes`,
          message: 'Each galaxy must have at least one colony type',
          code: 'INVALID_COLONY_TYPE'
        });
      }

      // Check if enough colony types for standard mode
      if (galaxy.teamStructure.mode === 'standard' && 
          galaxy.colonyTypes.length < galaxy.totalTeams) {
        errors.push({
          field: `galaxies[${index}].teamStructure`,
          message: `Standard mode requires at least ${galaxy.totalTeams} colony types`,
          code: 'INVALID_COLONY_TYPE',
          context: { 
            required: galaxy.totalTeams, 
            available: galaxy.colonyTypes.length 
          }
        });
      }

      // Validate custom assignments if in custom mode
      if (galaxy.teamStructure?.mode === 'custom') {
        if (!galaxy.teamStructure.customAssignments) {
          errors.push({
            field: `galaxies[${index}].teamStructure.customAssignments`,
            message: 'Custom mode requires team assignments',
            code: 'MISSING_REQUIRED_FIELD'
          });
        } else {
          const assignmentCount = Object.keys(galaxy.teamStructure.customAssignments).length;
          if (assignmentCount !== (galaxy.totalTeams || 0)) {
            errors.push({
              field: `galaxies[${index}].teamStructure.customAssignments`,
              message: `Custom assignments count (${assignmentCount}) must match total teams (${galaxy.totalTeams})`,
              code: 'INVALID_TEAM_COUNT'
            });
          }
        }
      }

      totalTeams += galaxy.totalTeams || 0;
      totalMaxPlayers += (galaxy.totalTeams || 0) * 9; // Max 9 players per team
    });

    // Total teams validation
    if (totalTeams > PERFORMANCE_THRESHOLDS.maxTotalTeams) {
      errors.push({
        field: 'galaxies',
        message: `Total teams across all galaxies (${totalTeams}) exceeds maximum (${PERFORMANCE_THRESHOLDS.maxTotalTeams})`,
        code: 'INVALID_TEAM_COUNT',
        context: { total: totalTeams, max: PERFORMANCE_THRESHOLDS.maxTotalTeams }
      });
    }

    // Player capacity warning
    if (totalMaxPlayers > PERFORMANCE_THRESHOLDS.maxTotalPlayers) {
      warnings.push({
        field: 'galaxies',
        message: `Configuration supports up to ${totalMaxPlayers} players which may impact performance`,
        suggestion: 'Consider reducing team counts or limiting players per team'
      });
    }
  }

  /**
   * Validate AI configuration across galaxies
   */
  private validateAIConfiguration(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    let totalAITeams = 0;
    let totalHumanTeams = 0;

    config.galaxies.forEach((galaxy, index) => {
      if (galaxy.aiEnabled) {
        // Check AI difficulty is set
        if (!galaxy.aiDifficulty) {
          errors.push({
            field: `galaxies[${index}].aiDifficulty`,
            message: 'AI difficulty must be specified when AI is enabled',
            code: 'INVALID_AI_CONFIG'
          });
        }

        // Validate difficulty value
        const validDifficulties = ['easy', 'medium', 'hard', 'adaptive'];
        if (galaxy.aiDifficulty && !validDifficulties.includes(galaxy.aiDifficulty)) {
          errors.push({
            field: `galaxies[${index}].aiDifficulty`,
            message: `Invalid AI difficulty. Must be one of: ${validDifficulties.join(', ')}`,
            code: 'INVALID_AI_CONFIG'
          });
        }

        // Estimate AI teams (this is approximate without full team data)
        const estimatedAITeams = Math.floor((galaxy.totalTeams || 0) * 0.3); // Assume 30% AI
        totalAITeams += estimatedAITeams;
        totalHumanTeams += (galaxy.totalTeams || 0) - estimatedAITeams;
      } else {
        totalHumanTeams += galaxy.totalTeams || 0;
      }
    });

    // Validate AI/human ratio
    if (totalAITeams > 0) {
      const aiRatio = totalAITeams / (totalAITeams + totalHumanTeams);
      
      if (aiRatio > 0.5) {
        warnings.push({
          field: 'galaxies',
          message: `High AI team ratio (${Math.round(aiRatio * 100)}%) may reduce player interaction`,
          suggestion: 'Consider reducing AI teams to maintain engaging gameplay'
        });
      }

      if (totalHumanTeams < 4) {
        warnings.push({
          field: 'galaxies',
          message: 'Very few human teams may limit trading opportunities',
          suggestion: 'Ensure at least 4-6 human teams for optimal gameplay'
        });
      }
    }
  }

  /**
   * Validate resource balance across galaxies
   */
  private async validateResourceBalance(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const balanceMetrics = await this.calculateBalanceMetrics(config);

    // Check overall trade balance
    if (balanceMetrics.tradeBalance < BALANCE_THRESHOLDS.minTradeBalance) {
      warnings.push({
        field: 'galaxies',
        message: `Low trade balance score (${(balanceMetrics.tradeBalance * 100).toFixed(0)}%)`,
        suggestion: 'Adjust colony type distribution to ensure better trading opportunities'
      });
    }

    // Check survival probability
    if (balanceMetrics.survivalProbability < BALANCE_THRESHOLDS.minSurvivalProbability) {
      errors.push({
        field: 'galaxies',
        message: `Low survival probability (${(balanceMetrics.survivalProbability * 100).toFixed(0)}%)`,
        code: 'RESOURCE_IMBALANCE',
        context: { probability: balanceMetrics.survivalProbability }
      });
    }

    // Check individual resource balance
    const criticalResources: string[] = ['oxygen', 'food', 'water', 'energy'];
    
    for (const resource of criticalResources) {
      const production = balanceMetrics.resourceProduction[resource as keyof Resources] || 0;
      const consumption = balanceMetrics.resourceConsumption[resource as keyof Resources] || 0;
      
      if (consumption > production * 1.5) {
        warnings.push({
          field: 'resources',
          message: `High ${resource} consumption relative to production`,
          suggestion: `Consider adding more colonies that produce ${resource}`
        });
      }
    }

    // Check team capability diversity
    const capabilities = Object.values(balanceMetrics.teamCapabilities);
    const tradePotentials = capabilities.map(c => c.tradePotential);
    const minTradePotential = Math.min(...tradePotentials);
    const maxTradePotential = Math.max(...tradePotentials);
    
    if (maxTradePotential / minTradePotential > BALANCE_THRESHOLDS.maxResourceImbalance) {
      warnings.push({
        field: 'teamBalance',
        message: 'Significant imbalance in team trading capabilities',
        suggestion: 'Review colony type assignments to ensure fair competition'
      });
    }
  }

  /**
   * Calculate balance metrics for the configuration
   */
  private async calculateBalanceMetrics(
    config: GalaxyConfiguration
  ): Promise<GalaxyBalanceMetrics> {
    const resourceProduction: Partial<Record<keyof Resources, number>> = {};
    const resourceConsumption: Partial<Record<keyof Resources, number>> = {};
    const teamCapabilities: Record<string, TeamCapability> = {};

    // Initialize resource tracking
    const resourceKeys: (keyof Resources)[] = [
      'oxygen', 'food', 'water', 'energy', 'minerals', 'alloys', 'techComponents'
    ];
    
    resourceKeys.forEach(key => {
      resourceProduction[key] = 0;
      resourceConsumption[key] = 0;
    });

    // Analyze each galaxy
    let totalTeams = 0;
    let viableTeams = 0;

    config.galaxies.forEach(galaxy => {
      const colonyTypeCounts = this.getColonyTypeDistribution(galaxy);
      
      colonyTypeCounts.forEach((count, colonyType) => {
        totalTeams += count;
        
        // Get base resources for this colony type
        const baseResources = COLONY_STARTING_RESOURCES[colonyType];
        
        // Estimate production and consumption based on colony type
        const production = this.estimateProduction(colonyType, baseResources);
        const consumption = this.estimateConsumption(colonyType);
        
        // Aggregate production/consumption
        resourceKeys.forEach(resource => {
          resourceProduction[resource]! += production[resource] * count;
          resourceConsumption[resource]! += consumption[resource] * count;
        });

        // Create team capabilities
        for (let i = 0; i < count; i++) {
          const teamId = `${galaxy.id}_${colonyType}_${i}`;
          const capability = this.calculateTeamCapability(
            teamId,
            colonyType,
            production,
            consumption
          );
          
          teamCapabilities[teamId] = capability;
          if (capability.survivalScore > 0.5) viableTeams++;
        }
      });
    });

    // Calculate trade balance
    const tradeBalance = this.calculateTradeBalance(teamCapabilities);
    
    // Calculate survival probability
    const survivalProbability = totalTeams > 0 ? viableTeams / totalTeams : 0;

    return {
      resourceProduction: resourceProduction as Record<keyof Resources, number>,
      resourceConsumption: resourceConsumption as Record<keyof Resources, number>,
      teamCapabilities,
      tradeBalance,
      survivalProbability
    };
  }

  /**
   * Get colony type distribution for a galaxy
   */
  private getColonyTypeDistribution(galaxy: Galaxy): Map<ColonyType, number> {
    const distribution = new Map<ColonyType, number>();
    
    if (galaxy.teamStructure?.mode === 'standard') {
      // One of each type
      galaxy.colonyTypes.slice(0, galaxy.totalTeams || 0).forEach(type => {
        distribution.set(type, 1);
      });
    } else if (galaxy.teamStructure?.mode === 'balanced') {
      // Even distribution
      const baseCount = Math.floor((galaxy.totalTeams || 0) / galaxy.colonyTypes.length);
      const remainder = (galaxy.totalTeams || 0) % galaxy.colonyTypes.length;
      
      galaxy.colonyTypes.forEach((type, index) => {
        distribution.set(type, baseCount + (index < remainder ? 1 : 0));
      });
    } else if (galaxy.teamStructure?.mode === 'custom' && galaxy.teamStructure.customAssignments) {
      // Count custom assignments
      Object.values(galaxy.teamStructure.customAssignments).forEach(type => {
        distribution.set(type, (distribution.get(type) || 0) + 1);
      });
    }
    
    return distribution;
  }

  /**
   * Estimate production for a colony type
   */
  private estimateProduction(
    colonyType: ColonyType,
    baseResources: Resources
  ): Partial<Record<keyof Resources, number>> {
    const production: Partial<Record<keyof Resources, number>> = {};
    
    // Production multipliers by colony type
    const productionMultipliers: Record<ColonyType, Partial<Record<keyof Resources, number>>> = {
      mining: { minerals: 3, alloys: 2, energy: 0.5 },
      agricultural: { food: 3, water: 2, oxygen: 1.5 },
      research: { techComponents: 2, techPatents: 2, blueprints: 1.5 },
      trade_hub: { credits: 3, transportRoutes: 2 },
      military: { defenseContracts: 2, systemRepairs: 1.5 },
      manufacturing: { alloys: 2.5, techComponents: 2, energy: 0.8 }
    };
    
    const multipliers = productionMultipliers[colonyType];
    
    Object.entries(multipliers).forEach(([resource, multiplier]) => {
      production[resource as keyof Resources] = 
        (baseResources[resource as keyof Resources] as number || 0) * multiplier;
    });
    
    return production;
  }

  /**
   * Estimate consumption for a colony type
   */
  private estimateConsumption(colonyType: ColonyType): Partial<Record<keyof Resources, number>> {
    // Base consumption rates
    const baseConsumption: Partial<Record<keyof Resources, number>> = {
      oxygen: 10,
      food: 8,
      water: 10,
      energy: 15
    };
    
    // Colony-specific consumption modifiers
    const consumptionModifiers: Record<ColonyType, Partial<Record<keyof Resources, number>>> = {
      mining: { energy: 2.0, water: 1.5 },
      agricultural: { energy: 1.2, water: 2.0 },
      research: { energy: 1.8, oxygen: 1.2 },
      trade_hub: { energy: 1.5, food: 1.2 },
      military: { energy: 2.5, food: 1.5 },
      manufacturing: { energy: 3.0, water: 1.8 }
    };
    
    const modifiers = consumptionModifiers[colonyType];
    const consumption: Partial<Record<keyof Resources, number>> = { ...baseConsumption };
    
    Object.entries(modifiers).forEach(([resource, modifier]) => {
      if (consumption[resource as keyof Resources]) {
        consumption[resource as keyof Resources]! *= modifier;
      }
    });
    
    return consumption;
  }

  /**
   * Calculate team capability metrics
   */
  private calculateTeamCapability(
    teamId: string,
    colonyType: ColonyType,
    production: Partial<Record<keyof Resources, number>>,
    consumption: Partial<Record<keyof Resources, number>>
  ): TeamCapability {
    // Calculate net production for critical resources
    const criticalResources: (keyof Resources)[] = ['oxygen', 'food', 'water', 'energy'];
    let survivalScore = 1.0;
    
    criticalResources.forEach(resource => {
      const prod = production[resource] || 0;
      const cons = consumption[resource] || 0;
      const ratio = cons > 0 ? prod / cons : 1;
      survivalScore *= Math.min(1, ratio);
    });
    
    // Calculate trade potential
    const surplus = Object.entries(production).reduce((sum, [resource, amount]) => {
      const cons = consumption[resource as keyof Resources] || 0;
      return sum + Math.max(0, amount - cons);
    }, 0);
    
    const deficit = Object.entries(consumption).reduce((sum, [resource, amount]) => {
      const prod = production[resource as keyof Resources] || 0;
      return sum + Math.max(0, amount - prod);
    }, 0);
    
    const tradePotential = (surplus + deficit) / 2;
    
    // Determine specializations
    const specializations: string[] = [];
    const productionEntries = Object.entries(production);
    productionEntries.sort((a, b) => b[1] - a[1]);
    specializations.push(...productionEntries.slice(0, 3).map(([resource]) => resource));
    
    return {
      teamId,
      productionCapacity: production as Record<keyof Resources, number>,
      consumptionRate: consumption as Record<keyof Resources, number>,
      tradePotential,
      survivalScore,
      specializations
    };
  }

  /**
   * Calculate overall trade balance
   */
  private calculateTradeBalance(teamCapabilities: Record<string, TeamCapability>): number {
    const teams = Object.values(teamCapabilities);
    if (teams.length === 0) return 0;
    
    // Calculate resource diversity
    const resourceNeeds = new Map<string, number>();
    const resourceSurplus = new Map<string, number>();
    
    teams.forEach(team => {
      Object.entries(team.productionCapacity).forEach(([resource, production]) => {
        const consumption = team.consumptionRate[resource as keyof Resources] || 0;
        const net = production - consumption;
        
        if (net > 0) {
          resourceSurplus.set(resource, (resourceSurplus.get(resource) || 0) + net);
        } else if (net < 0) {
          resourceNeeds.set(resource, (resourceNeeds.get(resource) || 0) + Math.abs(net));
        }
      });
    });
    
    // Calculate balance score
    let balanceScore = 0;
    let totalResources = 0;
    
    resourceNeeds.forEach((need, resource) => {
      const surplus = resourceSurplus.get(resource) || 0;
      const matchRatio = Math.min(1, surplus / need);
      balanceScore += matchRatio;
      totalResources++;
    });
    
    return totalResources > 0 ? balanceScore / totalResources : 0.5;
  }

  /**
   * Validate special rules compatibility
   */
  private validateSpecialRules(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const allRules: SpecialRule[] = [];
    
    config.galaxies.forEach((galaxy, galaxyIndex) => {
      if (galaxy.specialRules) {
        galaxy.specialRules.forEach((rule, ruleIndex) => {
          // Validate rule structure
          if (!rule.id || !rule.name || !rule.type) {
            errors.push({
              field: `galaxies[${galaxyIndex}].specialRules[${ruleIndex}]`,
              message: 'Special rule must have id, name, and type',
              code: 'MISSING_REQUIRED_FIELD'
            });
          }
          
          // Check for duplicate rule IDs
          if (allRules.some(r => r.id === rule.id)) {
            warnings.push({
              field: `galaxies[${galaxyIndex}].specialRules[${ruleIndex}]`,
              message: `Duplicate rule ID: ${rule.id}`,
              suggestion: 'Use unique IDs for each special rule'
            });
          }
          
          allRules.push(rule);
        });
      }
    });
    
    // Check rule compatibility
    for (let i = 0; i < allRules.length; i++) {
      for (let j = i + 1; j < allRules.length; j++) {
        const compatibility = this.checkRuleCompatibility(allRules[i], allRules[j]);
        
        if (!compatibility.compatible) {
          errors.push({
            field: 'specialRules',
            message: `Conflicting rules: "${allRules[i].name}" and "${allRules[j].name}" - ${compatibility.reason}`,
            code: 'CONFLICTING_RULES',
            context: { rule1: allRules[i].id, rule2: allRules[j].id }
          });
        }
      }
    }
  }

  /**
   * Check compatibility between two rules
   */
  private checkRuleCompatibility(rule1: SpecialRule, rule2: SpecialRule): RuleCompatibility {
    // Trade restriction conflicts
    if (rule1.type === 'trade_restriction' && rule2.type === 'trade_restriction') {
      const block1 = rule1.config.blockCrossGalaxy;
      const block2 = rule2.config.blockCrossGalaxy;
      
      if (block1 !== block2) {
        return {
          rule1,
          rule2,
          compatible: false,
          reason: 'Conflicting cross-galaxy trade settings',
          resolution: 'override'
        };
      }
    }
    
    // Resource event conflicts
    if (rule1.type === 'resource_event' && rule2.type === 'resource_event') {
      const decay1 = rule1.config.decayRate || 0;
      const decay2 = rule2.config.decayRate || 0;
      
      if (decay1 + decay2 > 0.15) { // Total decay > 15%
        return {
          rule1,
          rule2,
          compatible: false,
          reason: 'Combined resource decay too high',
          resolution: 'merge'
        };
      }
    }
    
    return {
      rule1,
      rule2,
      compatible: true
    };
  }

  /**
   * Validate victory conditions
   */
  private validateVictoryConditions(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!config.victoryConditions || config.victoryConditions.length === 0) {
      return; // Already handled in basic validation
    }
    
    config.victoryConditions.forEach((condition, index) => {
      // Validate condition structure
      if (!condition.id || !condition.name || !condition.type || !condition.evaluator) {
        errors.push({
          field: `victoryConditions[${index}]`,
          message: 'Victory condition must have id, name, type, and evaluator',
          code: 'INVALID_VICTORY_CONDITION'
        });
        return;
      }
      
      // Validate evaluator function
      if (typeof condition.evaluator !== 'function') {
        errors.push({
          field: `victoryConditions[${index}].evaluator`,
          message: 'Victory condition evaluator must be a function',
          code: 'INVALID_VICTORY_CONDITION'
        });
      }
      
      // Check achievability
      const validation = this.validateVictoryConditionAchievability(condition, config);
      
      if (!validation.isAchievable) {
        warnings.push({
          field: `victoryConditions[${index}]`,
          message: `Victory condition "${condition.name}" may be impossible to achieve`,
          suggestion: 'Review victory condition requirements'
        });
      }
      
      validation.warnings.forEach(warning => {
        warnings.push({
          field: `victoryConditions[${index}]`,
          message: warning
        });
      });
    });
    
    // Check for conflicting victory conditions
    if (config.victoryConditions.length > 1) {
      const hasIndividual = config.victoryConditions.some(vc => 
        vc.type === 'survival' || vc.type === 'economic'
      );
      const hasTeam = config.victoryConditions.some(vc => 
        vc.type === 'diplomatic' || vc.type === 'custom'
      );
      
      if (hasIndividual && hasTeam && config.competitionMode === 'galaxy') {
        warnings.push({
          field: 'victoryConditions',
          message: 'Mixed individual and team victory conditions with galaxy competition mode',
          suggestion: 'Consider using hybrid competition mode'
        });
      }
    }
  }

  /**
   * Validate if a victory condition is achievable
   */
  private validateVictoryConditionAchievability(
    condition: VictoryCondition,
    config: GalaxyConfiguration
  ): VictoryConditionValidation {
    const warnings: string[] = [];
    let isAchievable = true;
    const requiredResources: (keyof Resources)[] = [];
    let difficulty: 'easy' | 'medium' | 'hard' | 'impossible' = 'medium';
    
    switch (condition.type) {
      case 'survival':
        // Always achievable if resource balance is good
        isAchievable = true;
        difficulty = 'easy';
        requiredResources.push('oxygen', 'food', 'water', 'energy');
        break;
        
      case 'economic':
        // Check if there's enough resource generation
        requiredResources.push('credits', 'minerals', 'alloys');
        difficulty = 'medium';
        break;
        
      case 'technological':
        // Check if research colonies exist
        const hasResearch = config.galaxies.some(g => 
          g.colonyTypes.includes('research')
        );
        if (!hasResearch) {
          isAchievable = false;
          warnings.push('No research colonies available for technological victory');
        }
        requiredResources.push('techComponents', 'techPatents', 'blueprints');
        difficulty = 'hard';
        break;
        
      case 'diplomatic':
        // Check if there are enough teams for meaningful diplomacy
        const totalTeams = config.galaxies.reduce((sum, g) => sum + (g.totalTeams || 0), 0);
        if (totalTeams < 4) {
          warnings.push('Few teams may limit diplomatic opportunities');
        }
        difficulty = 'medium';
        break;
        
      case 'custom':
        // Can't validate custom conditions generically
        warnings.push('Custom victory condition - manual verification required');
        difficulty = 'medium';
        break;
    }
    
    return {
      condition,
      isAchievable,
      requiredResources,
      estimatedDifficulty: difficulty,
      warnings
    };
  }

  /**
   * Validate performance impact
   */
  private validatePerformance(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const totalTeams = config.galaxies.reduce((sum, g) => sum + (g.totalTeams || 0), 0);
    const totalMaxPlayers = totalTeams * 9;
    const galaxyCount = config.galaxies.length;
    
    // Calculate performance score
    let performanceScore = 0;
    
    // Team count impact
    performanceScore += (totalTeams / PERFORMANCE_THRESHOLDS.maxTotalTeams) * 40;
    
    // Player count impact
    performanceScore += (totalMaxPlayers / PERFORMANCE_THRESHOLDS.maxTotalPlayers) * 30;
    
    // Galaxy count impact
    performanceScore += (galaxyCount / PERFORMANCE_THRESHOLDS.maxGalaxies) * 20;
    
    // Cross-galaxy trading impact
    if (config.crossGalaxyTrading) {
      performanceScore += 10;
    }
    
    // Provide performance warnings
    if (performanceScore > 80) {
      errors.push({
        field: 'performance',
        message: 'Configuration may cause severe performance issues',
        code: 'RESOURCE_IMBALANCE',
        context: { score: performanceScore }
      });
    } else if (performanceScore > 60) {
      warnings.push({
        field: 'performance',
        message: 'Configuration may impact performance on lower-end devices',
        suggestion: 'Consider reducing team counts or disabling cross-galaxy features'
      });
    }
    
    // Real-time update frequency warnings
    const estimatedUpdatesPerSecond = totalTeams * 2; // Rough estimate
    if (estimatedUpdatesPerSecond > 100) {
      warnings.push({
        field: 'realtime',
        message: `High real-time update frequency (${estimatedUpdatesPerSecond}/s estimated)`,
        suggestion: 'Consider implementing update batching or throttling'
      });
    }
  }

  /**
   * Validate session code availability
   */
  private async validateSessionCodes(
    config: GalaxyConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      // Check if we can generate enough unique codes
      const requiredCodes = config.galaxies.length + 1; // +1 for master code
      
      // Simulate checking availability
      const availableCodes = await sessionCodeService.checkAvailableCodeCount();
      
      if (availableCodes < requiredCodes * 10) { // Want at least 10x buffer
        warnings.push({
          field: 'sessionCodes',
          message: 'Limited session codes available',
          suggestion: 'Consider implementing code recycling or expansion'
        });
      }
    } catch (error) {
      warnings.push({
        field: 'sessionCodes',
        message: 'Could not verify session code availability',
        suggestion: 'Ensure session code service is properly configured'
      });
    }
  }

  /**
   * Apply automatic fixes to configuration
   */
  private applyAutoFixes(
    config: GalaxyConfiguration,
    errors: ValidationError[]
  ): void {
    errors.forEach(error => {
      switch (error.code) {
        case 'INVALID_TEAM_COUNT':
          // Fix team counts that are out of range
          if (error.field.includes('totalTeams')) {
            const match = error.field.match(/galaxies\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              const galaxy = config.galaxies[index];
              if ((galaxy.totalTeams || 0) < 2) galaxy.totalTeams = 2;
              if ((galaxy.totalTeams || 0) > 20) galaxy.totalTeams = 20;
            }
          }
          break;
          
        case 'MISSING_REQUIRED_FIELD':
          // Add default values for missing fields
          if (error.field === 'victoryConditions') {
            config.victoryConditions = [{
              id: 'survival',
              name: 'Survival Victory',
              description: 'Teams that survive all rounds',
              type: 'survival',
              evaluator: (teams) => teams.filter(t => !t.eliminationStatus.isEliminated).map(t => t.id)
            }];
          }
          break;
      }
    });
  }

  /**
   * Generate cache key for configuration
   */
  private getCacheKey(config: GalaxyConfiguration): string {
    return JSON.stringify({
      galaxyCount: config.galaxies.length,
      teamCounts: config.galaxies.map(g => g.totalTeams),
      modes: config.galaxies.map(g => g.teamStructure.mode),
      crossGalaxy: config.crossGalaxyTrading,
      competition: config.competitionMode
    });
  }

  /**
   * Get validation result from cache
   */
  private getFromCache(key: string): ValidationResult | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - (cached as any)._timestamp;
    if (age > this.cacheExpiry) {
      this.validationCache.delete(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Cache validation result
   */
  private cacheResult(key: string, result: ValidationResult): void {
    (result as any)._timestamp = Date.now();
    this.validationCache.set(key, result);
    
    // Clean old cache entries
    if (this.validationCache.size > 100) {
      const entries = Array.from(this.validationCache.entries());
      entries.sort((a, b) => (a[1] as any)._timestamp - (b[1] as any)._timestamp);
      entries.slice(0, 50).forEach(([key]) => this.validationCache.delete(key));
    }
  }

  /**
   * Create a detailed validation report
   */
  async createValidationReport(
    configuration: GalaxyConfiguration,
    options: ValidatorOptions = {}
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const result = await this.validate(configuration, options);
    const balanceMetrics = await this.calculateBalanceMetrics(configuration);
    
    const suggestions: string[] = [];
    const autoFixesApplied: string[] = [];
    
    // Generate suggestions based on validation results
    if (!result.valid) {
      suggestions.push('Fix all errors before proceeding with game creation');
    }
    
    result.warnings.forEach(warning => {
      if (warning.suggestion) {
        suggestions.push(warning.suggestion);
      }
    });
    
    // Track auto-fixes if applied
    if (options.autoFix) {
      result.errors.forEach(error => {
        if (error.code === 'INVALID_TEAM_COUNT') {
          autoFixesApplied.push(`Adjusted team count for ${error.field}`);
        }
      });
    }
    
    return {
      timestamp: Date.now(),
      configuration,
      result,
      balanceMetrics,
      suggestions,
      autoFixesApplied
    };
  }

  /**
   * Validate a partial configuration (for step-by-step forms)
   */
  async validatePartial(
    partial: Partial<GalaxyConfiguration>,
    field: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate specific fields
    switch (field) {
      case 'galaxies':
        if (partial.galaxies) {
          await this.validateTeamCounts(
            { ...this.getDefaultConfig(), ...partial } as GalaxyConfiguration,
            errors,
            warnings
          );
        }
        break;
        
      case 'crossGalaxyTrading':
        if (partial.crossGalaxyTrading && partial.galaxies && partial.galaxies.length < 2) {
          errors.push({
            field: 'crossGalaxyTrading',
            message: 'Cross-galaxy trading requires at least 2 galaxies',
            code: 'CONFLICTING_RULES'
          });
        }
        break;
        
      case 'victoryConditions':
        if (partial.victoryConditions) {
          this.validateVictoryConditions(
            { ...this.getDefaultConfig(), ...partial } as GalaxyConfiguration,
            errors,
            warnings
          );
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default configuration for partial validation
   */
  private getDefaultConfig(): GalaxyConfiguration {
    return {
      galaxies: [],
      crossGalaxyTrading: false,
      globalEvents: true,
      sharedMarketIntel: true,
      competitionMode: 'individual',
      victoryConditions: []
    };
  }
}

// Export singleton instance
export const configurationValidationService = new ConfigurationValidationService();

// Export utilities
export const createResourceBalanceCalculator = (
  galaxies: Galaxy[]
): ResourceBalanceValidation[] => {
  const validations: ResourceBalanceValidation[] = [];
  const service = new ConfigurationValidationService();
  
  galaxies.forEach(galaxy => {
    const distribution = (service as any).getColonyTypeDistribution(galaxy);
    const resourceKeys: (keyof Resources)[] = [
      'oxygen', 'food', 'water', 'energy', 'minerals', 'alloys'
    ];
    
    resourceKeys.forEach(resource => {
      let totalProduction = 0;
      let totalConsumption = 0;
      
      distribution.forEach((count, colonyType) => {
        const baseResources = COLONY_STARTING_RESOURCES[colonyType];
        const production = (service as any).estimateProduction(colonyType, baseResources);
        const consumption = (service as any).estimateConsumption(colonyType);
        
        totalProduction += (production[resource] || 0) * count;
        totalConsumption += (consumption[resource] || 0) * count;
      });
      
      const surplus = totalProduction - totalConsumption;
      const tradingRequired = surplus < 0;
      const criticalLevel = totalConsumption > totalProduction * 1.5;
      
      validations.push({
        galaxyId: galaxy.id,
        resourceType: resource,
        totalProduction,
        totalConsumption,
        surplus,
        tradingRequired,
        criticalLevel
      });
    });
  });
  
  return validations;
};

export const createColonyTypeDistributionValidator = (
  galaxy: Galaxy
): TeamCompositionValidation => {
  const service = new ConfigurationValidationService();
  const distribution = (service as any).getColonyTypeDistribution(galaxy);
  
  const teams: TeamCompositionValidation['teams'] = [];
  let teamIndex = 0;
  
  distribution.forEach((count, colonyType) => {
    for (let i = 0; i < count; i++) {
      const teamId = `team_${teamIndex++}`;
      const issues: string[] = [];
      
      // Check if colony type is valid for this galaxy
      if (!galaxy.colonyTypes.includes(colonyType)) {
        issues.push(`Colony type ${colonyType} not available in this galaxy`);
      }
      
      teams.push({
        teamId,
        colonyType,
        isValid: issues.length === 0,
        issues
      });
    }
  });
  
  // Check required types
  const hasRequiredTypes = ['mining', 'agricultural'].every(type => 
    teams.some(team => team.colonyType === type)
  );
  
  // Calculate diversity score
  const uniqueTypes = new Set(teams.map(t => t.colonyType)).size;
  const diversityScore = uniqueTypes / galaxy.colonyTypes.length;
  
  // Check if balanced
  const typeCounts = new Map<ColonyType, number>();
  teams.forEach(team => {
    typeCounts.set(team.colonyType, (typeCounts.get(team.colonyType) || 0) + 1);
  });
  const counts = Array.from(typeCounts.values());
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length;
  const isBalanced = variance < 1;
  
  return {
    galaxyId: galaxy.id,
    teams,
    hasRequiredTypes,
    isBalanced,
    diversityScore
  };
};

export const createCrossGalaxyFairnessChecker = (
  config: GalaxyConfiguration
): { fair: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (!config.crossGalaxyTrading) {
    return { fair: true, issues: [] };
  }
  
  // Check team count balance
  const teamCounts = config.galaxies.map(g => g.totalTeams);
  const avgTeams = teamCounts.reduce((a, b) => a + b, 0) / teamCounts.length;
  const maxDiff = Math.max(...teamCounts.map(c => Math.abs(c - avgTeams)));
  
  if (maxDiff > avgTeams * 0.5) {
    issues.push('Significant team count imbalance between galaxies');
  }
  
  // Check resource balance
  const service = new ConfigurationValidationService();
  const balanceScores = config.galaxies.map(galaxy => {
    const distribution = (service as any).getColonyTypeDistribution(galaxy);
    // Simple balance score based on colony type diversity
    return distribution.size / galaxy.colonyTypes.length;
  });
  
  const minBalance = Math.min(...balanceScores);
  const maxBalance = Math.max(...balanceScores);
  
  if (maxBalance - minBalance > 0.3) {
    issues.push('Resource production imbalance between galaxies');
  }
  
  // Check AI distribution
  const aiEnabledCount = config.galaxies.filter(g => g.aiEnabled).length;
  if (aiEnabledCount > 0 && aiEnabledCount < config.galaxies.length) {
    issues.push('Inconsistent AI distribution across galaxies');
  }
  
  return {
    fair: issues.length === 0,
    issues
  };
};

export const createConfigurationConflictDetector = (
  config: GalaxyConfiguration
): Array<{ field: string; conflict: string; resolution: string }> => {
  const conflicts: Array<{ field: string; conflict: string; resolution: string }> = [];
  
  // Check cross-galaxy trading conflicts
  if (config.crossGalaxyTrading && config.competitionMode === 'galaxy') {
    conflicts.push({
      field: 'crossGalaxyTrading',
      conflict: 'Cross-galaxy trading enabled with galaxy competition mode',
      resolution: 'Disable cross-galaxy trading or switch to hybrid competition mode'
    });
  }
  
  // Check shared market intel conflicts
  if (config.sharedMarketIntel && !config.globalEvents) {
    conflicts.push({
      field: 'sharedMarketIntel',
      conflict: 'Shared market intel without global events',
      resolution: 'Enable global events or disable shared market intel'
    });
  }
  
  // Check special rule conflicts within galaxies
  config.galaxies.forEach((galaxy, index) => {
    if (galaxy.specialRules && galaxy.specialRules.length > 1) {
      const hasTradeRestriction = galaxy.specialRules.some(r => r.type === 'trade_restriction');
      const hasTradeBonus = galaxy.specialRules.some(r => 
        r.type === 'gameplay_modifier' && r.config.tradeBonus
      );
      
      if (hasTradeRestriction && hasTradeBonus) {
        conflicts.push({
          field: `galaxies[${index}].specialRules`,
          conflict: 'Trade restriction and trade bonus rules in same galaxy',
          resolution: 'Remove one of the conflicting trade rules'
        });
      }
    }
  });
  
  return conflicts;
};

export const createPerformanceImpactEstimator = (
  config: GalaxyConfiguration
): {
  estimatedLoad: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    teamCount: number;
    maxPlayers: number;
    realtimeUpdates: number;
    memoryUsage: number; // MB
  };
  recommendations: string[];
} => {
  const totalTeams = config.galaxies.reduce((sum, g) => sum + g.totalTeams, 0);
  const maxPlayers = totalTeams * 9;
  const realtimeUpdates = totalTeams * 2; // Updates per second estimate
  const memoryUsage = totalTeams * 2.5 + config.galaxies.length * 10; // MB estimate
  
  let load: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const recommendations: string[] = [];
  
  if (totalTeams > 50 || maxPlayers > 200 || realtimeUpdates > 100) {
    load = 'critical';
    recommendations.push('Consider splitting into multiple smaller sessions');
    recommendations.push('Implement update batching and throttling');
    recommendations.push('Use dedicated server infrastructure');
  } else if (totalTeams > 30 || maxPlayers > 120 || realtimeUpdates > 60) {
    load = 'high';
    recommendations.push('Monitor server performance closely');
    recommendations.push('Consider disabling some real-time features');
  } else if (totalTeams > 15 || maxPlayers > 60 || realtimeUpdates > 30) {
    load = 'medium';
    recommendations.push('Ensure stable network connection');
    recommendations.push('Test with expected player count before event');
  }
  
  if (config.crossGalaxyTrading && config.galaxies.length > 2) {
    recommendations.push('Cross-galaxy trading may increase server load');
  }
  
  return {
    estimatedLoad: load,
    metrics: {
      teamCount: totalTeams,
      maxPlayers,
      realtimeUpdates,
      memoryUsage
    },
    recommendations
  };
};