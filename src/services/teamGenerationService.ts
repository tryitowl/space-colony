/**
 * Team Generation Service
 * 
 * Provides flexible team generation algorithms supporting 1-20 teams per galaxy
 * with various distribution strategies and validation
 */

import type {
  ColonyType
} from '../types';
import {
  COLONY_STARTING_RESOURCES,
  generateGalaxyGameCodes
} from '../types';
import { ResourceBalancer } from './ResourceBalancer';
import type {
  Galaxy,
  TeamStructure,
  EnhancedColony,
  TeamComposition,
  TeamDefinition,
  TeamAllocationConfig,
  TeamAllocationConstraints,
  AIPersonalityType,
  AIColonyConfig,
  AIDifficulty
} from '../types';
import {
  DEFAULT_PERSONALITY_PARAMS
} from '../types/ai.types';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/validation.types';

// Maximum teams per galaxy based on UI and game design constraints
const MAX_TEAMS_PER_GALAXY = 20;
const MIN_TEAMS_PER_GALAXY = 1;

/**
 * Colony type distribution algorithms
 */
export class ColonyDistribution {
  /**
   * Balanced distribution - ensures even distribution of colony types
   */
  static balanced(teamCount: number, availableTypes: ColonyType[]): ColonyType[] {
    if (teamCount === 0 || availableTypes.length === 0) {
      return [];
    }

    const distribution: ColonyType[] = [];
    let typeIndex = 0;

    for (let i = 0; i < teamCount; i++) {
      distribution.push(availableTypes[typeIndex]);
      typeIndex = (typeIndex + 1) % availableTypes.length;
    }

    // Shuffle to avoid predictable patterns while maintaining balance
    return this.shuffleArray(distribution);
  }

  /**
   * Custom distribution - uses provided type assignments
   */
  static custom(
    teamCount: number, 
    customAssignments: Record<string, ColonyType>,
    teamIds: string[]
  ): ColonyType[] {
    const distribution: ColonyType[] = [];
    
    for (let i = 0; i < teamCount; i++) {
      const teamId = teamIds[i];
      const assignedType = customAssignments[teamId];
      
      if (!assignedType) {
        throw new Error(`No colony type assigned for team ${teamId}`);
      }
      
      distribution.push(assignedType);
    }
    
    return distribution;
  }

  /**
   * Random distribution with constraints
   */
  static random(
    teamCount: number,
    availableTypes: ColonyType[],
    constraints?: TeamAllocationConstraints
  ): ColonyType[] {
    if (teamCount === 0 || availableTypes.length === 0) {
      return [];
    }

    const distribution: ColonyType[] = [];
    const typeCount: Record<ColonyType, number> = {} as Record<ColonyType, number>;
    
    // Initialize type counts
    availableTypes.forEach(type => {
      typeCount[type] = 0;
    });

    // Apply required types first
    if (constraints?.requiredColonyTypes) {
      constraints.requiredColonyTypes.forEach(type => {
        if (distribution.length < teamCount && availableTypes.includes(type)) {
          distribution.push(type);
          typeCount[type]++;
        }
      });
    }

    // Fill remaining slots
    while (distribution.length < teamCount) {
      const validTypes = availableTypes.filter(type => {
        // Check max constraint
        if (constraints?.maxTeamsPerColonyType && 
            typeCount[type] >= constraints.maxTeamsPerColonyType) {
          return false;
        }
        
        // Check excluded types
        if (constraints?.excludedColonyTypes?.includes(type)) {
          return false;
        }
        
        return true;
      });

      if (validTypes.length === 0) {
        throw new Error('Cannot satisfy distribution constraints');
      }

      const randomType = validTypes[Math.floor(Math.random() * validTypes.length)];
      distribution.push(randomType);
      typeCount[randomType]++;
    }

    // Ensure minimum teams per type if specified
    if (constraints?.minTeamsPerColonyType) {
      for (const type of availableTypes) {
        while (typeCount[type] < constraints.minTeamsPerColonyType && 
               distribution.length < teamCount) {
          // Find a type that exceeds minimum and swap
          const swapIndex = distribution.findIndex((t, _idx) => 
            typeCount[t] > constraints.minTeamsPerColonyType! &&
            !constraints.requiredColonyTypes?.includes(t)
          );
          
          if (swapIndex !== -1) {
            const oldType = distribution[swapIndex];
            distribution[swapIndex] = type;
            typeCount[oldType]--;
            typeCount[type]++;
          } else {
            break; // Cannot satisfy minimum constraint
          }
        }
      }
    }

    return this.shuffleArray(distribution);
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Team code generation for any team count
 */
export class TeamCodeGenerator {
  private static usedCodes = new Set<string>();

  /**
   * Generate unique game codes for teams
   */
  static generateCodes(count: number): string[] {
    const codes = generateGalaxyGameCodes(count);
    
    // Ensure uniqueness across all generated codes
    const uniqueCodes: string[] = [];
    for (const code of codes) {
      if (!this.usedCodes.has(code)) {
        this.usedCodes.add(code);
        uniqueCodes.push(code);
      } else {
        // Generate a new code if duplicate
        let newCode: string;
        do {
          newCode = this.generateSingleCode();
        } while (this.usedCodes.has(newCode));
        
        this.usedCodes.add(newCode);
        uniqueCodes.push(newCode);
      }
    }
    
    return uniqueCodes;
  }

  private static generateSingleCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Clear used codes (for testing or new sessions)
   */
  static clearUsedCodes(): void {
    this.usedCodes.clear();
  }
}

/**
 * Player distribution logic
 */
export class PlayerDistribution {
  /**
   * Distribute players evenly across teams
   */
  static distributeEvenly(
    playerCount: number,
    teamCount: number,
    maxPlayersPerTeam: number = 10
  ): number[] {
    if (teamCount === 0) return [];
    
    const basePlayersPerTeam = Math.floor(playerCount / teamCount);
    const extraPlayers = playerCount % teamCount;
    const distribution: number[] = [];

    for (let i = 0; i < teamCount; i++) {
      let teamSize = basePlayersPerTeam;
      if (i < extraPlayers) {
        teamSize++;
      }
      
      // Apply max players constraint
      teamSize = Math.min(teamSize, maxPlayersPerTeam);
      distribution.push(teamSize);
    }

    return distribution;
  }

  /**
   * Distribute with specific team sizes
   */
  static distributeCustom(
    teamSizes: number[],
    maxPlayersPerTeam: number = 10
  ): number[] {
    return teamSizes.map(size => Math.min(size, maxPlayersPerTeam));
  }

  /**
   * Calculate if distribution is possible
   */
  static isDistributionPossible(
    playerCount: number,
    teamCount: number,
    minPlayersPerTeam: number = 0,
    maxPlayersPerTeam: number = 10
  ): boolean {
    if (teamCount === 0) return playerCount === 0;
    
    const minTotalPlayers = teamCount * minPlayersPerTeam;
    const maxTotalPlayers = teamCount * maxPlayersPerTeam;
    
    return playerCount >= minTotalPlayers && playerCount <= maxTotalPlayers;
  }
}

/**
 * AI team assignment algorithm
 */
export class AITeamAssignment {
  /**
   * Assign AI teams based on configuration
   */
  static assignAITeams(
    teams: TeamDefinition[],
    aiConfig: {
      totalAITeams: number;
      difficulty: AIDifficulty;
      personalities?: AIPersonalityType[];
      preferredTypes?: ColonyType[];
    }
  ): TeamDefinition[] {
    if (aiConfig.totalAITeams === 0) return teams;
    
    const updatedTeams = [...teams];
    const availableIndices = teams
      .map((_, _idx) => _idx)
      .filter(i => !updatedTeams[i].isAIControlled);

    // Shuffle for random assignment
    const shuffled = this.shuffleIndices(availableIndices);
    const aiTeamIndices = shuffled.slice(0, Math.min(aiConfig.totalAITeams, shuffled.length));

    // Assign AI to selected teams
    aiTeamIndices.forEach((teamIndex, aiIndex) => {
      updatedTeams[teamIndex] = {
        ...updatedTeams[teamIndex],
        isAIControlled: true,
        playerSlots: 0, // AI teams don't need player slots
        aiDifficulty: aiConfig.difficulty,
        aiPersonality: aiConfig.personalities?.[aiIndex % aiConfig.personalities.length] || 'balanced_player'
      };
    });

    return updatedTeams;
  }

  /**
   * Generate AI configurations for teams
   */
  static generateAIConfigs(
    aiTeams: TeamDefinition[],
    galaxyId: string
  ): AIColonyConfig[] {
    return aiTeams
      .filter(team => team.isAIControlled)
      .map(team => ({
        colonyId: team.id,
        difficulty: team.aiDifficulty || 'medium',
        isAIControlled: true,
        galaxyId,
        personality: team.aiPersonality || 'balanced_player',
        adaptiveStrategy: true,
        cooperationBias: this.getCooperationBias(team.aiPersonality || 'balanced_player')
      }));
  }

  private static getCooperationBias(personality: AIPersonalityType): number {
    const biases: Record<AIPersonalityType, number> = {
      'aggressive_trader': 0.3,
      'cautious_hoarder': 0.2,
      'balanced_player': 0.5,
      'opportunistic': 0.4,
      'cooperative': 0.8,
      'competitive': 0.2,
      'specialist': 0.5
    };
    return biases[personality] || 0.5;
  }

  private static shuffleIndices(indices: number[]): number[] {
    const shuffled = [...indices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Main team generation service
 */
export class TeamGenerationService {
  /**
   * Generate teams for a galaxy with flexible configuration
   */
  static generateTeams(
    galaxy: Galaxy,
    config: TeamAllocationConfig,
    playerCount: number = 0
  ): TeamComposition {
    // Validate team count
    const teamCount = galaxy.totalTeams;
    if (!teamCount || teamCount < MIN_TEAMS_PER_GALAXY || teamCount > MAX_TEAMS_PER_GALAXY) {
      throw new Error(`Team count must be between ${MIN_TEAMS_PER_GALAXY} and ${MAX_TEAMS_PER_GALAXY}`);
    }

    // Generate team IDs and letters
    const teamIds = Array.from({ length: teamCount }, (_, i) => 
      `${galaxy.id}-team-${i + 1}`
    );
    // const _gameCodes = generateGameCodes(teamCount); // Unused function
    const gameCodes = TeamCodeGenerator.generateCodes(teamCount);

    // Get colony type distribution
    const colonyTypes = this.getColonyDistribution(
      galaxy,
      config,
      teamIds
    );

    // Create team definitions
    const teams: TeamDefinition[] = teamIds.map((id, index) => ({
      id,
      name: `Team ${gameCodes[index]}`,
      teamLetter: this.getTeamLetter(index),
      teamNumber: index + 1,
      colonyType: colonyTypes[index],
      playerSlots: 0, // Will be set by player distribution
      isAIControlled: false
    }));

    // Apply player distribution if players provided
    if (playerCount > 0) {
      const playerDistribution = PlayerDistribution.distributeEvenly(
        playerCount,
        teamCount
      );
      
      teams.forEach((team, index) => {
        team.playerSlots = playerDistribution[index];
      });
    }

    // Apply AI teams if enabled
    if (galaxy.aiEnabled) {
      const aiTeamCount = config.constraints?.maxAITeams || 
        Math.floor(teamCount * 0.3); // Default 30% AI teams
      
      const updatedTeams = AITeamAssignment.assignAITeams(teams, {
        totalAITeams: aiTeamCount,
        difficulty: galaxy.aiDifficulty || 'medium',
        personalities: this.getAIPersonalities(galaxy)
      });
      
      teams.splice(0, teams.length, ...updatedTeams);
    }

    // Apply resource balancing
    const balancedTeams = ResourceBalancer.balanceResources(
      teams,
      this.getBalanceMode(galaxy.teamStructure || { mode: 'balanced' })
    );

    // Calculate composition scores
    const composition: TeamComposition = {
      galaxyId: galaxy.id,
      teams: balancedTeams,
      balanceScore: this.calculateBalanceScore(balancedTeams),
      viabilityScore: this.calculateViabilityScore(balancedTeams),
      diversityScore: this.calculateDiversityScore(balancedTeams)
    };

    return composition;
  }

  /**
   * Generate team letter (A-Z, then AA-AZ, BA-BZ, etc.)
   */
  private static getTeamLetter(index: number): string {
    if (index < 26) {
      return String.fromCharCode(65 + index); // A-Z
    } else {
      // For teams beyond Z, use AA, AB, AC, etc.
      const firstLetter = String.fromCharCode(65 + Math.floor((index - 26) / 26));
      const secondLetter = String.fromCharCode(65 + ((index - 26) % 26));
      return firstLetter + secondLetter;
    }
  }

  private static getColonyDistribution(
    galaxy: Galaxy,
    config: TeamAllocationConfig,
    teamIds: string[]
  ): ColonyType[] {
    const teamStructure = galaxy.teamStructure || { mode: 'balanced' };
    const totalTeams = galaxy.totalTeams!; // Already validated
    const colonyTypes = galaxy.colonyTypes || ['mining', 'agricultural', 'research', 'trade_hub'];
    
    switch (teamStructure.mode) {
      case 'standard':
        return ColonyDistribution.balanced(
          totalTeams,
          colonyTypes
        );
      
      case 'balanced':
        return ColonyDistribution.balanced(
          totalTeams,
          colonyTypes
        );
      
      case 'custom':
        if (!teamStructure.customAssignments) {
          throw new Error('Custom mode requires team assignments');
        }
        return ColonyDistribution.custom(
          totalTeams,
          teamStructure.customAssignments,
          teamIds
        );
      
      default:
        // Use allocation strategy
        switch (config.strategy) {
          case 'random':
            return ColonyDistribution.random(
              totalTeams,
              colonyTypes,
              config.constraints
            );
          
          default:
            return ColonyDistribution.balanced(
              totalTeams,
              colonyTypes
            );
        }
    }
  }

  private static getBalanceMode(
    teamStructure: TeamStructure
  ): 'none' | 'light' | 'moderate' | 'heavy' {
    if (teamStructure.mode === 'balanced') {
      return 'moderate';
    }
    return 'none';
  }

  private static getAIPersonalities(galaxy: Galaxy): AIPersonalityType[] {
    // Distribute AI personalities based on galaxy size
    const personalities: AIPersonalityType[] = [
      'balanced_player',
      'aggressive_trader',
      'cautious_hoarder',
      'opportunistic',
      'cooperative',
      'competitive',
      'specialist'
    ];
    
    // Repeat personalities if needed for larger galaxies
    const totalTeams = galaxy.totalTeams || 4;
    const result: AIPersonalityType[] = [];
    for (let i = 0; i < totalTeams; i++) {
      result.push(personalities[i % personalities.length]);
    }
    
    return result;
  }

  private static calculateBalanceScore(teams: TeamDefinition[]): number {
    const resourceValues = teams.map(team => 
      ResourceBalancer['calculateTeamResourceValue'](team)
    );
    
    const avg = resourceValues.reduce((a, b) => a + b, 0) / resourceValues.length;
    const variance = resourceValues.reduce((sum, val) => 
      sum + Math.pow(val - avg, 2), 0
    ) / resourceValues.length;
    
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;
    
    // Convert to 0-1 score (lower CV is better)
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private static calculateViabilityScore(teams: TeamDefinition[]): number {
    const validationResult = ResourceBalancer.validateSurvivalViability(teams);
    
    // Base score on errors and warnings
    let score = 1.0;
    score -= validationResult.errors.length * 0.2;
    score -= validationResult.warnings.length * 0.1;
    
    return Math.max(0, score);
  }

  private static calculateDiversityScore(teams: TeamDefinition[]): number {
    const uniqueTypes = new Set(teams.map(t => t.colonyType));
    const maxPossibleTypes = 6; // All colony types
    
    return uniqueTypes.size / maxPossibleTypes;
  }

  /**
   * Generate teams for a galaxy and return EnhancedColony objects
   */
  static async generateTeamsForGalaxy(
    galaxy: Galaxy,
    _sessionId: string
  ): Promise<EnhancedColony[]> {
    // Generate team composition with null safety
    const totalTeams = galaxy.totalTeams || 4;
    const teamStructure = galaxy.teamStructure || { mode: 'balanced' };
    
    const composition = TeamGenerationService.generateTeams(galaxy, {
      strategy: teamStructure.mode === 'custom' ? 'custom' : 'balanced',
      constraints: {
        maxAITeams: galaxy.aiEnabled ? Math.floor(totalTeams * 0.3) : 0,
        requireHumanTeams: Math.ceil(totalTeams * 0.7)
      }
    });

    // Convert TeamDefinition to EnhancedColony
    const enhancedTeams: EnhancedColony[] = composition.teams.map(team => {
      const gameCode = generateGalaxyGameCodes(1)[0]; // Generate unique code for each team
      
      return {
        id: team.id,
        type: team.colonyType,
        name: team.name,
        teamLetter: team.teamLetter,
        teamNumber: team.teamNumber,
        galaxyId: galaxy.id,
        players: [], // Will be populated when players join
        resources: COLONY_STARTING_RESOURCES[team.colonyType],
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
        },
        isAIControlled: team.isAIControlled,
        aiConfig: team.isAIControlled ? {
          colonyId: team.id,
          difficulty: team.aiDifficulty || galaxy.aiDifficulty || 'medium',
          isAIControlled: true,
          galaxyId: galaxy.id,
          personality: team.aiPersonality || 'balanced_player',
          adaptiveStrategy: true,
          cooperationBias: 0.5,
          ...DEFAULT_PERSONALITY_PARAMS[team.aiPersonality || 'balanced_player']
        } : undefined,
        metrics: {
          totalResourcesGained: 0,
          totalResourcesLost: 0,
          tradesCompleted: 0,
          survivalRounds: 0,
          investmentEfficiency: 0,
          diplomaticScore: 0
        }
      };
    });

    return enhancedTeams;
  }

  /**
   * Validate team configuration for impossible scenarios
   */
  static validateConfiguration(
    teamCount: number,
    playerCount: number,
    constraints?: TeamAllocationConstraints
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check team count
    if (teamCount < MIN_TEAMS_PER_GALAXY) {
      errors.push({
        field: 'teamCount',
        message: `Minimum ${MIN_TEAMS_PER_GALAXY} team required`,
        code: 'INVALID_TEAM_COUNT'
      });
    }

    if (teamCount > MAX_TEAMS_PER_GALAXY) {
      errors.push({
        field: 'teamCount',
        message: `Maximum ${MAX_TEAMS_PER_GALAXY} teams allowed`,
        code: 'INVALID_TEAM_COUNT'
      });
    }

    // Check player distribution
    if (playerCount > 0) {
      const maxPlayersPerTeam = 10;
      if (playerCount > teamCount * maxPlayersPerTeam) {
        errors.push({
          field: 'playerCount',
          message: `Too many players for ${teamCount} teams (max ${maxPlayersPerTeam} per team)`,
          code: 'INVALID_TEAM_COUNT'
        });
      }
    }

    // Check AI constraints
    if (constraints) {
      if (constraints.maxAITeams !== undefined && constraints.maxAITeams > teamCount) {
        errors.push({
          field: 'constraints.maxAITeams',
          message: 'Cannot have more AI teams than total teams',
          code: 'INVALID_AI_CONFIG'
        });
      }

      if (constraints.requireHumanTeams !== undefined && 
          constraints.requireHumanTeams > teamCount) {
        errors.push({
          field: 'constraints.requireHumanTeams',
          message: 'Cannot require more human teams than total teams',
          code: 'INVALID_TEAM_COUNT'
        });
      }

      if (constraints.maxAITeams !== undefined && 
          constraints.requireHumanTeams !== undefined &&
          constraints.maxAITeams + constraints.requireHumanTeams > teamCount) {
        errors.push({
          field: 'constraints',
          message: 'AI and human team requirements exceed total teams',
          code: 'INVALID_TEAM_COUNT'
        });
      }

      // Check colony type constraints
      if (constraints.minTeamsPerColonyType !== undefined) {
        const minRequired = (constraints.requiredColonyTypes?.length || 6) * 
          constraints.minTeamsPerColonyType;
        if (minRequired > teamCount) {
          errors.push({
            field: 'constraints.minTeamsPerColonyType',
            message: `Minimum teams per type (${constraints.minTeamsPerColonyType}) requires at least ${minRequired} teams`,
            code: 'INVALID_TEAM_COUNT'
          });
        }
      }
    }

    // Edge case warnings
    if (teamCount === 1) {
      warnings.push({
        field: 'teamCount',
        message: 'Single team configuration - no trading possible',
        suggestion: 'Consider adding AI teams or increasing team count'
      });
    }

    if (playerCount === 0 && (!constraints?.maxAITeams || constraints.maxAITeams === 0)) {
      warnings.push({
        field: 'playerCount',
        message: 'No players and no AI teams configured',
        suggestion: 'Add players or enable AI teams'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create singleton instance
export const teamGenerationService = new TeamGenerationService();

