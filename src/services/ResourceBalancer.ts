import type { TeamDefinition } from '../types';

export type BalanceMode = 'none' | 'light' | 'moderate' | 'aggressive' | 'heavy';

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  recommendations: string[];
  errors: string[];
  warnings: string[];
}

/**
 * ResourceBalancer - Handles team resource balancing and validation
 * This class provides functionality to balance resources across teams and validate survival viability
 */
export class ResourceBalancer {
  /**
   * Balance resources across teams based on the specified mode
   */
  static balanceResources(teams: TeamDefinition[], mode: BalanceMode): TeamDefinition[] {
    // For now, return teams as-is to preserve functionality
    // In a full implementation, this would adjust team resources based on the balance mode
    if (mode === 'none') {
      return teams;
    }
    
    // Calculate average resource value across teams
    const teamValues = teams.map(team => this.calculateTeamResourceValue(team));
    const avgValue = teamValues.reduce((sum, val) => sum + val, 0) / teamValues.length;
    
    // Return teams as-is for now
    // In a full implementation, this would adjust team resources based on the calculated handicaps
    return teams;
  }

  /**
   * Calculate the resource value for a team
   */
  static calculateTeamResourceValue(team: TeamDefinition): number {
    // Simple calculation based on team resources
    // This would typically sum up all resource values with appropriate weights
    const baseValue = 100; // Base team value
    
    // Add value based on colony type (different types have different starting advantages)
    const typeMultiplier = {
      'mining': 1.2,
      'agricultural': 1.1,
      'research': 1.3,
      'trade_hub': 1.15,
      'manufacturing': 1.25,
      'energy': 1.1,
      'military': 1.2
    }[team.colonyType] || 1.0;
    
    return baseValue * typeMultiplier;
  }

  /**
   * Validate survival viability of teams
   */
  static validateSurvivalViability(teams: TeamDefinition[]): ValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation checks
    if (teams.length === 0) {
      errors.push('No teams provided for validation');
      issues.push('No teams provided for validation');
      return { valid: false, issues, recommendations, errors, warnings };
    }
    
    // Check for team diversity
    const colonyTypes = new Set(teams.map(team => team.colonyType));
    if (colonyTypes.size < 2 && teams.length > 1) {
      warnings.push('Low colony type diversity may impact survival');
      issues.push('Low colony type diversity may impact survival');
      recommendations.push('Consider adding different colony types for better resource diversity');
    }
    
    // Check team balance
    if (teams.length > 6) {
      warnings.push('Large number of teams may require additional resource balancing');
      recommendations.push('Large number of teams may require additional resource balancing');
    }
    
    // Check for teams with customResources that are insufficient
    teams.forEach(team => {
      if ('customResources' in team && team.customResources) {
        const resources = team.customResources as any;
        // Check minimum viable resources (at least 1 of each critical resource)
        if (resources.oxygen < 1 || resources.water < 1 || resources.food < 1 || resources.energy < 1) {
          errors.push(`Team ${team.name} has insufficient resources for survival`);
          issues.push(`Team ${team.name} has insufficient resources for survival`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      issues,
      recommendations,
      errors,
      warnings
    };
  }
}
