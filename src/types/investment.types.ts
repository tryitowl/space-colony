// Investment types for Space Colony Exchange

import type { ColonyType, Resources } from './index';

export interface InvestmentOption {
  id: InvestmentType;
  name: string;
  description: string;
  costPerLevel: number;
  maxLevel: number;
  currentLevel: number;
  returns: InvestmentReturn;
  tooltip: string;
}

export type InvestmentType = 
  | 'scouts' 
  | 'productionUpgrades' 
  | 'researchLabs' 
  | 'communicationArray' 
  | 'emergencyReserves';

export interface InvestmentReturn {
  type: 'intel' | 'resources' | 'tech_patents' | 'multiplier' | 'basic_resources';
  description: string;
  perLevel: {
    amount: number;
    resourceType?: keyof Resources;
    specialtyResource?: string;
  };
}

export interface InvestmentAllocation {
  scouts: number;
  productionUpgrades: number;
  researchLabs: number;
  communicationArray: number;
  emergencyReserves: number;
}

export interface InvestmentValidation {
  isValid: boolean;
  totalCost: number;
  remainingCredits: number;
  errors: string[];
  warnings: string[];
}

export interface InvestmentEffects {
  intelGenerationPerRound: number;
  specialtyResourcesPerRound: Record<string, number>;
  techPatentsPerRound: number;
  communicationMultiplier: number;
  emergencyResourcesAvailable: number;
}

// Colony-specific production upgrades
export const COLONY_PRODUCTION_UPGRADES: Record<ColonyType, {
  primaryResource: keyof Resources;
  secondaryResource?: keyof Resources;
  description: string;
}> = {
  mining: {
    primaryResource: 'minerals',
    secondaryResource: 'energy',
    description: 'Enhanced mining equipment generates additional minerals and energy'
  },
  agricultural: {
    primaryResource: 'food',
    secondaryResource: 'water',
    description: 'Advanced farming systems produce more food and water'
  },
  research: {
    primaryResource: 'techComponents',
    secondaryResource: 'energy',
    description: 'Upgraded labs generate tech components and require energy'
  },
  trade_hub: {
    primaryResource: 'credits',
    description: 'Enhanced trading facilities increase credit generation'
  },
  military: {
    primaryResource: 'defenseContracts',
    secondaryResource: 'energy',
    description: 'Military upgrades generate defense contracts and energy systems'
  },
  manufacturing: {
    primaryResource: 'alloys',
    secondaryResource: 'systemRepairs',
    description: 'Manufacturing improvements produce alloys and system repairs'
  }
};

// Base investment option templates
export const INVESTMENT_OPTIONS: Record<InvestmentType, Omit<InvestmentOption, 'currentLevel'>> = {
  scouts: {
    id: 'scouts',
    name: 'Scout Network',
    description: 'Deploy scouts to gather intelligence about market conditions and opportunities',
    costPerLevel: 100,
    maxLevel: 5,
    returns: {
      type: 'intel',
      description: 'Generates 1 intel piece per round per level',
      perLevel: {
        amount: 1
      }
    },
    tooltip: 'Each scout level generates 1 intel piece every round. Intel provides valuable market information for trading decisions.'
  },
  productionUpgrades: {
    id: 'productionUpgrades',
    name: 'Production Upgrades',
    description: 'Enhance your colony\'s specialized production capabilities',
    costPerLevel: 200,
    maxLevel: 3,
    returns: {
      type: 'resources',
      description: 'Generates specialty resources based on colony type',
      perLevel: {
        amount: 2
      }
    },
    tooltip: 'Upgrades generate resources specific to your colony type each round. Mining colonies get minerals, Agricultural get food/water, etc.'
  },
  researchLabs: {
    id: 'researchLabs',
    name: 'Research Labs',
    description: 'Establish advanced research facilities to develop new technologies',
    costPerLevel: 300,
    maxLevel: 2,
    returns: {
      type: 'tech_patents',
      description: 'Generates tech patents for trading',
      perLevel: {
        amount: 1,
        resourceType: 'techPatents'
      }
    },
    tooltip: 'Research labs generate valuable tech patents each round. These can be traded for high value or used for special advantages.'
  },
  communicationArray: {
    id: 'communicationArray',
    name: 'Communication Array',
    description: 'Build enhanced communication systems to amplify intelligence gathering',
    costPerLevel: 200,
    maxLevel: 2,
    returns: {
      type: 'multiplier',
      description: 'Multiplies intel generation from scouts',
      perLevel: {
        amount: 1
      }
    },
    tooltip: 'Each level multiplies your total intel generation. Level 1 doubles intel, Level 2 triples it. Combines with scout investments.'
  },
  emergencyReserves: {
    id: 'emergencyReserves',
    name: 'Emergency Reserves',
    description: 'Stockpile basic resources for critical situations',
    costPerLevel: 1,
    maxLevel: 1000,
    returns: {
      type: 'basic_resources',
      description: 'Converts to basic resources at 10% return rate',
      perLevel: {
        amount: 0.1
      }
    },
    tooltip: 'Emergency reserves convert to basic resources (oxygen, food, water, energy) at 10% efficiency. Safe but low return investment.'
  }
};

export const INVESTMENT_BUDGET = 1000; // Total credits available for investment

export const EMERGENCY_CONVERSION_RATE = 0.1; // 10% conversion rate for emergency reserves