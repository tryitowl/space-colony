import type { VictoryCondition } from '../types/galaxy.types';
import type { EnhancedColony } from '../types/galaxy.types';

/**
 * Predefined victory conditions for Space Colony Exchange
 * 
 * These conditions determine how winners are determined at the end of the game.
 * Multiple conditions can be active simultaneously, creating different win scenarios.
 */

export const VICTORY_CONDITIONS: Record<string, VictoryCondition> = {
  survival: {
    id: 'survival',
    name: 'Survival Victory',
    description: 'Teams that survive all rounds without elimination win',
    type: 'survival',
    evaluator: (teams: EnhancedColony[]) => 
      teams.filter(t => !t.eliminationStatus.isEliminated).map(t => t.id)
  },
  
  economic: {
    id: 'economic',
    name: 'Economic Dominance',
    description: 'Team with the highest total resource value wins',
    type: 'economic',
    evaluator: (teams: EnhancedColony[]) => {
      const resourceValues = teams
        .filter(t => !t.eliminationStatus.isEliminated)
        .map(team => ({
          id: team.id,
          value: calculateTotalResourceValue(team.resources)
        }))
        .sort((a, b) => b.value - a.value);
      
      if (resourceValues.length === 0) return [];
      const highestValue = resourceValues[0].value;
      return resourceValues.filter(rv => rv.value === highestValue).map(rv => rv.id);
    }
  },
  
  technological: {
    id: 'technological',
    name: 'Technological Superiority',
    description: 'Team with the most advanced technology (tech components, patents, alien tech) wins',
    type: 'technological',
    evaluator: (teams: EnhancedColony[]) => {
      const techScores = teams
        .filter(t => !t.eliminationStatus.isEliminated)
        .map(team => ({
          id: team.id,
          score: (team.resources.techComponents || 0) * 3 + 
                 (team.resources.techPatents || 0) * 5 + 
                 (team.resources.alienTech || 0) * 10
        }))
        .sort((a, b) => b.score - a.score);
      
      if (techScores.length === 0) return [];
      const highestScore = techScores[0].score;
      return techScores.filter(ts => ts.score === highestScore).map(ts => ts.id);
    }
  },
  
  diplomatic: {
    id: 'diplomatic',
    name: 'Diplomatic Victory',
    description: 'Team with the most successful trades and alliances wins',
    type: 'diplomatic',
    evaluator: (teams: EnhancedColony[]) => {
      // This would need trade history data to properly evaluate
      // For now, we'll use a placeholder that counts defense contracts as diplomatic score
      const diplomaticScores = teams
        .filter(t => !t.eliminationStatus.isEliminated)
        .map(team => ({
          id: team.id,
          score: (team.resources.defenseContracts || 0) * 2 +
                 (team.resources.transportRoutes || 0)
        }))
        .sort((a, b) => b.score - a.score);
      
      if (diplomaticScores.length === 0) return [];
      const highestScore = diplomaticScores[0].score;
      return diplomaticScores.filter(ds => ds.score === highestScore).map(ds => ds.id);
    }
  },
  
  balanced: {
    id: 'balanced',
    name: 'Balanced Excellence',
    description: 'Team with the best overall performance across all metrics wins',
    type: 'custom',
    evaluator: (teams: EnhancedColony[]) => {
      const balancedScores = teams
        .filter(t => !t.eliminationStatus.isEliminated)
        .map(team => ({
          id: team.id,
          score: calculateBalancedScore(team)
        }))
        .sort((a, b) => b.score - a.score);
      
      if (balancedScores.length === 0) return [];
      const highestScore = balancedScores[0].score;
      return balancedScores.filter(bs => bs.score === highestScore).map(bs => bs.id);
    }
  },
  
  credits: {
    id: 'credits',
    name: 'Wealth Accumulation',
    description: 'Team with the most credits wins',
    type: 'economic',
    evaluator: (teams: EnhancedColony[]) => {
      const creditScores = teams
        .filter(t => !t.eliminationStatus.isEliminated)
        .map(team => ({
          id: team.id,
          credits: team.resources.credits || 0
        }))
        .sort((a, b) => b.credits - a.credits);
      
      if (creditScores.length === 0) return [];
      const highestCredits = creditScores[0].credits;
      return creditScores.filter(cs => cs.credits === highestCredits).map(cs => cs.id);
    }
  },
  
  sustainability: {
    id: 'sustainability',
    name: 'Sustainable Colony',
    description: 'Team with the best balance of basic resources (oxygen, water, food) wins',
    type: 'survival',
    evaluator: (teams: EnhancedColony[]) => {
      const sustainabilityScores = teams
        .filter(t => !t.eliminationStatus.isEliminated)
        .map(team => ({
          id: team.id,
          score: Math.min(
            team.resources.oxygen || 0,
            team.resources.water || 0,
            team.resources.food || 0
          ) * 3 // Triple the lowest resource to reward balance
        }))
        .sort((a, b) => b.score - a.score);
      
      if (sustainabilityScores.length === 0) return [];
      const highestScore = sustainabilityScores[0].score;
      return sustainabilityScores.filter(ss => ss.score === highestScore).map(ss => ss.id);
    }
  }
};

/**
 * Calculate total resource value for economic victory
 */
function calculateTotalResourceValue(resources: any): number {
  // Basic resources (lower value)
  const basicValue = 
    (resources.oxygen || 0) * 1 +
    (resources.water || 0) * 1 +
    (resources.food || 0) * 1 +
    (resources.energy || 0) * 1.5 +
    (resources.minerals || 0) * 2;
  
  // Advanced resources (higher value)
  const advancedValue =
    (resources.alloys || 0) * 3 +
    (resources.techComponents || 0) * 4 +
    (resources.defenseContracts || 0) * 3 +
    (resources.systemRepairs || 0) * 2.5 +
    (resources.transportRoutes || 0) * 3.5;
  
  // Premium resources (highest value)
  const premiumValue =
    (resources.techPatents || 0) * 6 +
    (resources.blueprints || 0) * 5 +
    (resources.alienTech || 0) * 10 +
    (resources.credits || 0) * 0.1; // Credits have lower multiplier
  
  return basicValue + advancedValue + premiumValue;
}

/**
 * Calculate balanced score across all metrics
 */
function calculateBalancedScore(team: EnhancedColony): number {
  const resources = team.resources;
  
  // Survival score (basic resources)
  const survivalScore = Math.min(
    resources.oxygen || 0,
    resources.water || 0,
    resources.food || 0
  ) * 10;
  
  // Economic score (total value)
  const economicScore = calculateTotalResourceValue(resources) * 0.1;
  
  // Tech score
  const techScore = 
    (resources.techComponents || 0) * 3 +
    (resources.techPatents || 0) * 5 +
    (resources.alienTech || 0) * 10;
  
  // Infrastructure score
  const infrastructureScore =
    (resources.energy || 0) * 2 +
    (resources.defenseContracts || 0) * 3 +
    (resources.systemRepairs || 0) * 2 +
    (resources.transportRoutes || 0) * 3;
  
  return survivalScore + economicScore + techScore + infrastructureScore;
}

/**
 * Victory condition categories for UI grouping
 */
export const VICTORY_CONDITION_CATEGORIES = {
  survival: {
    name: 'Survival',
    description: 'Focus on staying alive and maintaining resources',
    conditions: ['survival', 'sustainability']
  },
  economic: {
    name: 'Economic',
    description: 'Focus on wealth and resource accumulation',
    conditions: ['economic', 'credits']
  },
  advanced: {
    name: 'Advanced',
    description: 'Focus on technology and diplomacy',
    conditions: ['technological', 'diplomatic']
  },
  mixed: {
    name: 'Mixed',
    description: 'Balanced approach across multiple metrics',
    conditions: ['balanced']
  }
};

/**
 * Get victory condition by ID
 */
export function getVictoryCondition(id: string): VictoryCondition | undefined {
  return VICTORY_CONDITIONS[id];
}

/**
 * Get all victory conditions as an array
 */
export function getAllVictoryConditions(): VictoryCondition[] {
  return Object.values(VICTORY_CONDITIONS);
}

/**
 * Get victory conditions by type
 */
export function getVictoryConditionsByType(type: VictoryCondition['type']): VictoryCondition[] {
  return Object.values(VICTORY_CONDITIONS).filter(vc => vc.type === type);
}

/**
 * Default victory conditions for new games
 */
export const DEFAULT_VICTORY_CONDITIONS = ['survival', 'economic'];

/**
 * Evaluate all active victory conditions and return results
 */
export function evaluateVictoryConditions(
  teams: EnhancedColony[],
  activeConditionIds: string[]
): Record<string, string[]> {
  const results: Record<string, string[]> = {};
  
  for (const conditionId of activeConditionIds) {
    const condition = VICTORY_CONDITIONS[conditionId];
    if (condition) {
      results[conditionId] = condition.evaluator(teams);
    }
  }
  
  return results;
}