/**
 * Example usage of the flexible galaxy type system
 */

import type {
  Galaxy,
  GalaxyConfiguration
} from './galaxy.types';
import type { GalaxyPreset } from './config.types';
import type {
  AIColonyConfig,
  ValidatedGalaxyConfiguration
} from './index';

import {
  isGalaxy,
  isGalaxyConfiguration,
  isEnhancedColony,
  validateGalaxyConfig,
  safeCast,
  isAIDifficulty
} from './index';

// Example 1: Creating a simple 2-galaxy configuration
export const createDualGalaxyConfig = (): GalaxyConfiguration => {
  return {
    galaxies: [
      {
        id: 'galaxy-alpha',
        name: 'Alpha Sector',
        code: 'ALP',
        participantCount: 12,
        gameMode: 'mixed_mode' as const,
        description: 'A balanced galaxy for new players',
        totalTeams: 6,
        colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
        teamStructure: { mode: 'balanced' },
        aiEnabled: true,
        aiDifficulty: 'medium'
      },
      {
        id: 'galaxy-beta',
        name: 'Beta Quadrant',
        code: 'BET',
        participantCount: 8,
        gameMode: 'full_multiplayer' as const,
        description: 'Advanced galaxy with resource scarcity',
        totalTeams: 4,
        colonyTypes: ['mining', 'agricultural', 'research', 'military'],
        teamStructure: { mode: 'balanced' },
        resourceModifiers: {
          productionMultipliers: {
            oxygen: 0.8,
            food: 0.7,
            water: 0.9
          },
          consumptionMultipliers: {
            energy: 1.2
          }
        },
        aiEnabled: true,
        aiDifficulty: 'hard'
      }
    ],
    tradingRules: {
      crossGalaxyTrading: true,
      tradeRestrictions: []
    },
    globalEvents: true,
    sharedMarketIntel: false,
    competitionMode: 'galaxy',
    victoryConditions: ['survival']
  };
};

// Example 2: Creating a tournament-style configuration
export const createTournamentConfig = (playerCount: number): GalaxyConfiguration => {
  const galaxyCount = Math.ceil(playerCount / 24); // Max 24 players per galaxy (6 teams × 4 players)
  const galaxies: Galaxy[] = [];
  
  for (let i = 0; i < galaxyCount; i++) {
    galaxies.push({
      id: `tournament-galaxy-${i + 1}`,
      name: `Tournament Galaxy ${i + 1}`,
      code: `T${String(i + 1).padStart(2, '0')}`,
      participantCount: 16,
      gameMode: 'full_multiplayer' as const,
      description: `Competitive galaxy ${i + 1} for tournament play`,
      totalTeams: 8,
      colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
      teamStructure: { mode: 'standard' },
      aiEnabled: false,
      specialRules: [
        {
          id: 'tournament-rules',
          name: 'Tournament Rules',
          description: 'Strict time limits and no AI assistance',
          type: 'gameplay_modifier'
        }
      ]
    });
  }
  
  return {
    galaxies,
    tradingRules: {
      crossGalaxyTrading: false,
      tradeRestrictions: []
    },
    globalEvents: false,
    sharedMarketIntel: false,
    competitionMode: 'individual',
    victoryConditions: ['economic']
  };
};

// Example 3: Creating an AI-supported configuration for training
export const createTrainingConfig = (): GalaxyConfiguration => {
  const config: GalaxyConfiguration = {
    galaxies: [
      {
        id: 'training-galaxy',
        name: 'Training Sector',
        code: 'TRN',
        participantCount: 6,
        gameMode: 'mixed_mode' as const,
        description: 'Beginner-friendly galaxy with guided gameplay',
        totalTeams: 3,
        colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
        teamStructure: {
          mode: 'custom',
          customAssignments: {
            'team-1': 'trade_hub', // Human player
            'team-2': 'mining',     // AI
            'team-3': 'agricultural', // AI
            'team-4': 'research',   // AI
            'team-5': 'military',   // AI
            'team-6': 'manufacturing' // AI
          }
        },
        aiEnabled: true,
        aiDifficulty: 'easy',
        resourceModifiers: {
          startingResourceMultipliers: {
            oxygen: 1.2,
            food: 1.2,
            water: 1.2,
            energy: 1.2
          }
        }
      }
    ],
    tradingRules: {
      crossGalaxyTrading: false,
      tradeRestrictions: []
    },
    globalEvents: false,
    sharedMarketIntel: true,
    competitionMode: 'individual',
    victoryConditions: ['training']
  };
  
  return config;
};

// Example 4: Validating a configuration
export const validateConfig = (config: unknown): ValidatedGalaxyConfiguration | null => {
  // First, check if it's a valid galaxy configuration
  if (!isGalaxyConfiguration(config)) {
    console.error('Invalid configuration structure');
    return null;
  }
  
  // Run validation
  const errors = validateGalaxyConfig(config);
  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    return null;
  }
  
  // Calculate balance metrics
  const balanceMetrics = {
    resourceProduction: {},
    resourceConsumption: {},
    teamCapabilities: {},
    tradeBalance: 0.85,
    survivalProbability: 0.92
  } as any; // Simplified for example
  
  // Return validated configuration
  return {
    ...config,
    _validated: true,
    _validationTimestamp: Date.now(),
    _balanceMetrics: balanceMetrics
  } as ValidatedGalaxyConfiguration;
};

// Example 5: Creating AI team configurations
export const createAITeamConfig = (
  colonyId: string,
  galaxyId: string,
  personality: 'aggressive' | 'defensive' | 'balanced'
): AIColonyConfig => {
  const personalityMap = {
    aggressive: {
      personality: 'aggressive_trader' as const,
      difficulty: 'hard' as const,
      cooperationBias: 0.2
    },
    defensive: {
      personality: 'cautious_hoarder' as const,
      difficulty: 'medium' as const,
      cooperationBias: 0.5
    },
    balanced: {
      personality: 'balanced_player' as const,
      difficulty: 'medium' as const,
      cooperationBias: 0.6
    }
  };
  
  const config = personalityMap[personality];
  
  return {
    colonyId,
    difficulty: config.difficulty,
    isAIControlled: true,
    galaxyId,
    personality: config.personality,
    adaptiveStrategy: true,
    cooperationBias: config.cooperationBias
  };
};

// Example 6: Using type guards for safe data handling
export const processUnknownData = (data: unknown): void => {
  // Check if it's a galaxy
  if (isGalaxy(data)) {
    console.log(`Processing galaxy: ${data.name} with ${data.totalTeams} teams`);
    return;
  }
  
  // Check if it's an enhanced colony
  if (isEnhancedColony(data)) {
    console.log(`Processing colony: ${data.name} in galaxy ${data.galaxyId}`);
    if (data.isAIControlled && data.aiConfig) {
      console.log(`AI controlled with ${data.aiConfig.difficulty} difficulty`);
    }
    return;
  }
  
  // Safe cast with fallback
  const difficulty = safeCast(data, isAIDifficulty, 'medium');
  console.log(`Using difficulty: ${difficulty}`);
};

// Example 7: Creating a preset configuration
export const createPresetConfig = (): GalaxyPreset => {
  return {
    id: 'corporate-training',
    name: 'Corporate Training Session',
    description: 'Ideal for team building events with 12-24 participants',
    tags: ['educational', 'cooperative', 'ai-supported'],
    playerRange: { min: 12, max: 24 },
    galaxyTemplate: {
      name: 'Training Galaxy',
      totalTeams: 6,
      colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
      teamStructure: { mode: 'balanced' },
      aiEnabled: true,
      aiDifficulty: 'medium'
    },
    recommendedSettings: {
      roundDurations: {
        round1Trading: 600000, // 10 minutes
        round2Trading: 600000,
        round3Trading: 600000,
        round4Trading: 600000,
        round5Trading: 600000
      },
      enabledFeatures: ['crossGalaxyTrading', 'sharedMarketIntel'],
      victoryConditions: ['survival', 'economic']
    },
    difficulty: 'intermediate'
  };
};