/**
 * Centralized Game Configuration
 * All game parameters externalized for easy tuning
 */

export const GameConfig = {
  // Resource Configuration
  resources: {
    // Base resource values (per unit)
    values: {
      // Survival resources
      oxygen: 3,
      food: 2,
      water: 2,
      energy: 2,
      
      // Production resources
      minerals: 4,
      alloys: 6,
      
      // Advanced resources
      tech: 8,
      alienTech: 15,
      techComponents: 5,
      
      // Special resources
      defenseContracts: 10,
      techPatents: 12,
      marketIntel: 8,
      surveyReports: 6,
      crisisWarnings: 10,
      
      // Diplomatic resources
      diplomaticFavors: 8,
      tradeAgreements: 10,
      refugeeContracts: 5
    },
    
    // Rarity multipliers for value calculation
    rarity: {
      oxygen: 1.0,
      food: 1.2,
      water: 1.1,
      energy: 1.0,
      minerals: 0.8,
      alloys: 1.5,
      tech: 2.0,
      alienTech: 3.0
    },
    
    // Critical thresholds (below = critical mode)
    criticalThresholds: {
      oxygen: 3,
      food: 3,
      water: 3,
      energy: 2
    },
    
    // Maximum trade amounts
    maxTradeAmounts: {
      oxygen: 50,
      food: 50,
      water: 50,
      energy: 30,
      minerals: 40,
      alloys: 20,
      tech: 10,
      alienTech: 2
    }
  },
  
  // Investment Configuration
  investments: {
    // Base costs for each investment type
    costs: {
      scouts: {
        minerals: 10,
        energy: 5
      },
      productionUpgrades: {
        minerals: 15,
        alloys: 5
      },
      researchLabs: {
        minerals: 10,
        tech: 3
      },
      communicationArray: {
        alloys: 8,
        tech: 2
      },
      emergencyReserves: {
        minerals: 5,
        alloys: 3
      }
    },
    
    // Investment effects
    effects: {
      scouts: {
        intelBonus: 2,
        marketInsightBonus: 1
      },
      productionUpgrades: {
        productionMultiplier: 1.25
      },
      researchLabs: {
        techGenerationBonus: 2,
        researchSpeedBonus: 1.5
      },
      communicationArray: {
        tradingRangeBonus: 2,
        negotiationBonus: 0.1
      },
      emergencyReserves: {
        survivalBonus: 5,
        crisisResistance: 0.2
      }
    }
  },
  
  // Round Configuration
  rounds: {
    // Duration in seconds for each phase
    durations: {
      instructions: 300,    // 5 minutes
      investment: 300,      // 5 minutes
      round_1: 600,        // 10 minutes
      round_2: 600,        // 10 minutes
      milestone: 300,      // 5 minutes
      round_3: 600,        // 10 minutes
      round_4: 600,        // 10 minutes
      round_5: 600,        // 10 minutes
      completed: 0         // No duration
    },
    
    // Resource consumption per round
    consumption: {
      base: {
        oxygen: 2,
        food: 2,
        water: 2,
        energy: 1
      },
      // Multipliers by round
      roundMultipliers: {
        round_1: 1.0,
        round_2: 1.1,
        round_3: 1.2,
        round_4: 1.3,
        round_5: 1.5
      }
    },
    
    // Intel generation per round
    intelGeneration: {
      baseAmount: 3,
      colonyBonus: {
        research: 2,
        military: 1,
        trading: 1
      }
    }
  },
  
  // Achievement Configuration
  achievements: {
    survivor: {
      name: 'Survivor',
      description: 'Complete the game without elimination',
      points: 100,
      icon: '🏆'
    },
    masterTrader: {
      name: 'Master Trader',
      description: 'Complete 10 successful trades',
      requirement: { trades: 10 },
      points: 50,
      icon: '💱'
    },
    diplomat: {
      name: 'Diplomat',
      description: 'Form 3 alliances',
      requirement: { alliances: 3 },
      points: 75,
      icon: '🤝'
    },
    resourceHoarder: {
      name: 'Resource Hoarder',
      description: 'Accumulate 100 total resources',
      requirement: { totalResources: 100 },
      points: 50,
      icon: '📦'
    },
    crisisManager: {
      name: 'Crisis Manager',
      description: 'Survive 3 crisis events',
      requirement: { crisesSurvived: 3 },
      points: 100,
      icon: '🚨'
    },
    techPioneer: {
      name: 'Tech Pioneer',
      description: 'Reach tech level 10',
      requirement: { techLevel: 10 },
      points: 75,
      icon: '🔬'
    },
    alienWhisperer: {
      name: 'Alien Whisperer',
      description: 'Successfully complete alien contact',
      requirement: { alienContact: true },
      points: 150,
      icon: '👽'
    }
  },
  
  // Trading Configuration
  trading: {
    // Trade evaluation thresholds
    evaluation: {
      excellentThreshold: 1.5,  // 150% value
      goodThreshold: 1.2,       // 120% value
      fairThreshold: 0.9,       // 90% value
      poorThreshold: 0.7        // 70% value
    },
    
    // Trade limits
    limits: {
      maxActiveTrades: 5,
      maxCounterOffers: 3,
      tradeExpiryMinutes: 5,
      minTradeValue: 1
    },
    
    // AI trading parameters
    ai: {
      responseDelayRange: [5000, 15000], // 5-15 seconds
      acceptanceThresholds: {
        easy: 0.7,
        medium: 0.85,
        hard: 0.95
      },
      counterOfferChance: {
        easy: 0.3,
        medium: 0.5,
        hard: 0.7
      }
    }
  },
  
  // Victory Conditions Configuration
  victory: {
    // Point values for different achievements
    scoring: {
      survivalBonus: 500,
      resourcePerUnit: 1,
      techPerLevel: 10,
      tradeCompleted: 5,
      allianceFormed: 25,
      crisisSolved: 50,
      diplomaticVictory: 200
    },
    
    // Victory condition thresholds
    conditions: {
      economic: {
        minResources: 150,
        minCredits: 100
      },
      technological: {
        minTechLevel: 15,
        minAlienTech: 3
      },
      diplomatic: {
        minAlliances: 4,
        minFavorability: 80
      },
      survival: {
        roundsRequired: 5
      }
    }
  },
  
  // Crisis Event Configuration
  crisis: {
    // Crisis types and effects
    types: {
      solarFlare: {
        name: 'Solar Flare',
        description: 'Massive solar activity disrupts electronics',
        effects: {
          energyDrain: 5,
          techDisabled: true,
          duration: 120 // seconds
        }
      },
      asteroidField: {
        name: 'Asteroid Field',
        description: 'Dense asteroid field threatens colonies',
        effects: {
          randomDamage: { min: 3, max: 8 },
          defenseRequired: 5
        }
      },
      alienIncursion: {
        name: 'Alien Incursion',
        description: 'Unknown alien forces detected',
        effects: {
          tradingDisabled: true,
          defenseRequired: 10,
          duration: 180
        }
      },
      resourceBlight: {
        name: 'Resource Blight',
        description: 'Contamination affects resource production',
        effects: {
          productionMultiplier: 0.5,
          duration: 240
        }
      }
    },
    
    // Crisis probability by round
    probability: {
      round_1: 0.1,
      round_2: 0.2,
      round_3: 0.3,
      round_4: 0.4,
      round_5: 0.5
    }
  },
  
  // UI Configuration
  ui: {
    // Animation durations (ms)
    animations: {
      cardHover: 200,
      modalOpen: 300,
      notification: 400,
      tradeComplete: 600
    },
    
    // Sound settings
    sounds: {
      enabled: true,
      volume: 0.5,
      effects: {
        tradeComplete: 'trade-success.mp3',
        notification: 'notification.mp3',
        crisis: 'alert.mp3',
        achievement: 'achievement.mp3'
      }
    },
    
    // Theme colors
    theme: {
      primary: '#0AE6E6',      // cyan
      secondary: '#B565D8',    // purple
      success: '#22D375',      // green
      warning: '#F59E0B',      // orange
      danger: '#EF4444',       // red
      background: '#020617',   // dark blue
      surface: 'rgba(30, 58, 138, 0.5)' // glass
    }
  }
};

// Type definitions for configuration
export type GameConfigType = typeof GameConfig;
export type ResourceConfig = typeof GameConfig.resources;
export type InvestmentConfig = typeof GameConfig.investments;
export type RoundConfig = typeof GameConfig.rounds;
export type AchievementConfig = typeof GameConfig.achievements;
export type TradingConfig = typeof GameConfig.trading;
export type VictoryConfig = typeof GameConfig.victory;
export type CrisisConfig = typeof GameConfig.crisis;
export type UIConfig = typeof GameConfig.ui;

// Configuration validation
export function validateConfig(_config: Partial<GameConfigType>): boolean {
  // Add validation logic here
  return true;
}

// Configuration merger for runtime updates
export function mergeConfig(base: GameConfigType, updates: Partial<GameConfigType>): GameConfigType {
  return {
    ...base,
    ...updates,
    resources: { ...base.resources, ...updates.resources },
    investments: { ...base.investments, ...updates.investments },
    rounds: { ...base.rounds, ...updates.rounds },
    achievements: { ...base.achievements, ...updates.achievements },
    trading: { ...base.trading, ...updates.trading },
    victory: { ...base.victory, ...updates.victory },
    crisis: { ...base.crisis, ...updates.crisis },
    ui: { ...base.ui, ...updates.ui }
  };
}