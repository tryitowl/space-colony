import type { Colony, Resources } from '../types/game';

/**
 * Utility functions for calculating colony scores for the leaderboard
 */

// Define the scoring weights for different resource types
const RESOURCE_WEIGHTS: Partial<Record<keyof Resources, number>> = {
  oxygen: 1,
  food: 1,
  water: 1,
  energy: 1.5,
  minerals: 2,
  alloys: 3,
  techComponents: 4,
  defenseContracts: 3,
  systemRepairs: 3.5,
  techPatents: 5,
  credits: 0.1,  // Credits are worth less in scoring
};

// Define bonus points for achievements
const ACHIEVEMENT_BONUSES = {
  TRADE_COMPLETED: 50,     // Points for each completed trade
  INTEL_ACQUIRED: 30,      // Points for each intel piece
  HIGH_TECH: 100,          // Bonus for having >20 tech
  RESOURCE_BALANCE: 200,   // Bonus for having no critical resource below threshold
  CRISIS_SURVIVAL: 100,    // Bonus for recovering from critical status
};

/**
 * Calculate the base resource score for a team/colony
 * 
 * @param resources The resource collection to score
 * @returns The calculated resource score
 */
export function calculateResourceScore(resources: Resources): number {
  let score = 0;
  
  // Sum the weighted values of each resource
  Object.entries(resources).forEach(([resource, amount]) => {
    const resourceKey = resource as keyof Resources;
    const weight = RESOURCE_WEIGHTS[resourceKey] || 1;
    if (typeof amount === 'number') {
      score += amount * weight;
    }
  });
  
  return Math.round(score);
}

/**
 * Calculate achievement bonuses based on team history and status
 * 
 * @param team The team to calculate bonuses for
 * @returns The calculated bonus points
 */
export function calculateAchievementBonuses(team: Colony): number {
  let bonusPoints = 0;
  
  // Intel bonuses
  bonusPoints += team.resources.marketIntel.length * ACHIEVEMENT_BONUSES.INTEL_ACQUIRED;
  bonusPoints += team.resources.surveyReports.length * ACHIEVEMENT_BONUSES.INTEL_ACQUIRED;
  bonusPoints += team.resources.crisisWarnings.length * ACHIEVEMENT_BONUSES.INTEL_ACQUIRED;
  
  // High tech bonus
  if (team.resources.techPatents > 20) {
    bonusPoints += ACHIEVEMENT_BONUSES.HIGH_TECH;
  }
  
  // Resource balance bonus (no critical resources below threshold)
  const criticalResourcesOk = ['oxygen', 'food', 'water', 'energy'].every(
    resource => (team.resources[resource as keyof Resources] as number) >= 5
  );
  
  if (criticalResourcesOk) {
    bonusPoints += ACHIEVEMENT_BONUSES.RESOURCE_BALANCE;
  }
  
  // Crisis recovery bonus (if previously in critical mode but no longer)
  if (team.eliminationStatus.roundsInCritical > 0 && !team.eliminationStatus.isEliminated) {
    bonusPoints += ACHIEVEMENT_BONUSES.CRISIS_SURVIVAL;
  }
  
  return bonusPoints;
}

/**
 * Calculate the total score for a team
 * 
 * @param team The team to score
 * @returns The total calculated score
 */
export function calculateTeamScore(team: Colony): number {
  if (!team || team.eliminationStatus.isEliminated) {
    return 0;
  }
  
  const resourceScore = calculateResourceScore(team.resources);
  const bonusScore = calculateAchievementBonuses(team);
  
  return resourceScore + bonusScore;
}

/**
 * Format a score for display with appropriate suffix (K, M)
 * 
 * @param score The numeric score to format
 * @returns Formatted score as a string
 */
export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toLocaleString();
}

/**
 * Get a rank indicator emoji based on position
 * 
 * @param rank The ranking position
 * @returns An appropriate emoji or formatted rank
 */
export function getRankIndicator(rank: number): string {
  switch(rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `${rank}`;
  }
}
