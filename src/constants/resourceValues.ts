/**
 * Centralized resource values and configurations for the Space Colony Exchange game
 */

// Base values for each resource type in credits
export const RESOURCE_VALUES: Record<string, number> = {
  // Basic survival resources
  oxygen: 10,
  food: 8,
  water: 12,
  energy: 6,
  
  // Advanced materials
  minerals: 15,
  alloys: 25,
  techComponents: 30,
  
  // Currency
  credits: 1,
  
  // Services
  defenseContracts: 20,
  systemRepairs: 18,
  transportRoutes: 22,
  
  // Technology
  techPatents: 40,
  blueprints: 35,
  alienTech: 100
};

// Resource consumption rates per round
export const RESOURCE_CONSUMPTION_RATES: Record<string, number> = {
  oxygen: 2,
  food: 2,
  water: 1,
  energy: 3
};

// Critical resource thresholds (below these values, teams are in critical mode)
export const CRITICAL_RESOURCE_THRESHOLDS: Record<string, number> = {
  oxygen: 5,
  food: 5,
  water: 5,
  energy: 5
};

// Maximum reasonable values for trade requests
export const MAX_TRADE_REQUEST_VALUES: Record<string, number> = {
  oxygen: 50,
  food: 50,
  water: 50,
  energy: 50,
  minerals: 30,
  alloys: 20,
  techComponents: 15,
  credits: 1000,
  defenseContracts: 10,
  systemRepairs: 10,
  transportRoutes: 10,
  techPatents: 5,
  blueprints: 5,
  alienTech: 2
};

// Investment costs and effects
export const INVESTMENT_COSTS = {
  infrastructure: {
    min: 5,
    max: 20,
    costPerLevel: 5
  },
  defense: {
    min: 3,
    max: 15,
    costPerLevel: 3
  },
  research: {
    min: 4,
    max: 16,
    costPerLevel: 4
  },
  exploration: {
    min: 2,
    max: 10,
    costPerLevel: 2
  }
};

// Colony type production bonuses
export const COLONY_PRODUCTION_BONUSES = {
  mining: {
    minerals: 2.0,
    alloys: 1.5
  },
  agricultural: {
    food: 2.0,
    water: 1.5
  },
  technological: {
    techComponents: 2.0,
    techPatents: 1.5
  },
  military: {
    defenseContracts: 2.0,
    systemRepairs: 1.5
  },
  commercial: {
    credits: 2.0,
    transportRoutes: 1.5
  },
  research: {
    blueprints: 2.0,
    alienTech: 1.5
  }
};

/**
 * Calculate the value of resources for trading
 */
export function calculateResourceValue(resources: Record<string, number>): number {
  return Object.entries(resources).reduce((total, [resource, amount]) => {
    if (typeof amount === 'number' && amount > 0) {
      return total + (amount * (RESOURCE_VALUES[resource] || 0));
    }
    return total;
  }, 0);
}

/**
 * Check if a team is in critical resource mode
 */
export function isTeamCritical(resources: Record<string, number>): boolean {
  return Object.entries(CRITICAL_RESOURCE_THRESHOLDS).some(([resource, threshold]) => {
    const currentAmount = resources[resource];
    return typeof currentAmount === 'number' && currentAmount < threshold;
  });
}

/**
 * Get production multiplier for a colony type and resource
 */
export function getProductionMultiplier(colonyType: string, resource: string): number {
  const bonuses = COLONY_PRODUCTION_BONUSES[colonyType as keyof typeof COLONY_PRODUCTION_BONUSES];
  if (!bonuses) return 1.0;
  
  return bonuses[resource as keyof typeof bonuses] || 1.0;
}