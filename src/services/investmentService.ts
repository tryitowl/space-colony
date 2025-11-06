import { 
  doc, 
  getDoc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  ColonyType, 
  GameSession,
  Investments
} from '../types';
import type {
  InvestmentAllocation,
  InvestmentValidation,
  InvestmentEffects,
  InvestmentOption
} from '../types/investment.types';
import {
  INVESTMENT_OPTIONS,
  INVESTMENT_BUDGET,
  COLONY_PRODUCTION_UPGRADES,
  EMERGENCY_CONVERSION_RATE
} from '../types/investment.types';

export class InvestmentService {
  /**
   * Validate an investment allocation
   */
  static validateInvestment(allocation: InvestmentAllocation): InvestmentValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Calculate total cost
    let totalCost = 0;
    totalCost += allocation.scouts * INVESTMENT_OPTIONS.scouts.costPerLevel;
    totalCost += allocation.productionUpgrades * INVESTMENT_OPTIONS.productionUpgrades.costPerLevel;
    totalCost += allocation.researchLabs * INVESTMENT_OPTIONS.researchLabs.costPerLevel;
    totalCost += allocation.communicationArray * INVESTMENT_OPTIONS.communicationArray.costPerLevel;
    totalCost += allocation.emergencyReserves * INVESTMENT_OPTIONS.emergencyReserves.costPerLevel;

    const remainingCredits = INVESTMENT_BUDGET - totalCost;

    // Check budget
    if (totalCost > INVESTMENT_BUDGET) {
      errors.push(`Total cost (${totalCost}) exceeds budget (${INVESTMENT_BUDGET})`);
    }

    // Check level limits
    if (allocation.scouts > INVESTMENT_OPTIONS.scouts.maxLevel) {
      errors.push(`Scout levels (${allocation.scouts}) exceed maximum (${INVESTMENT_OPTIONS.scouts.maxLevel})`);
    }
    if (allocation.productionUpgrades > INVESTMENT_OPTIONS.productionUpgrades.maxLevel) {
      errors.push(`Production upgrade levels (${allocation.productionUpgrades}) exceed maximum (${INVESTMENT_OPTIONS.productionUpgrades.maxLevel})`);
    }
    if (allocation.researchLabs > INVESTMENT_OPTIONS.researchLabs.maxLevel) {
      errors.push(`Research lab levels (${allocation.researchLabs}) exceed maximum (${INVESTMENT_OPTIONS.researchLabs.maxLevel})`);
    }
    if (allocation.communicationArray > INVESTMENT_OPTIONS.communicationArray.maxLevel) {
      errors.push(`Communication array levels (${allocation.communicationArray}) exceed maximum (${INVESTMENT_OPTIONS.communicationArray.maxLevel})`);
    }

    // Check negative values
    Object.entries(allocation).forEach(([key, value]) => {
      if (value < 0) {
        errors.push(`${key} cannot be negative`);
      }
    });

    // Generate warnings for suboptimal choices
    if (allocation.scouts > 0 && allocation.communicationArray === 0) {
      warnings.push('Consider investing in Communication Array to multiply scout intel generation');
    }

    if (allocation.emergencyReserves > 200) {
      warnings.push('Large emergency reserves have low returns (10%). Consider other investments.');
    }

    if (totalCost < INVESTMENT_BUDGET * 0.8) {
      warnings.push('You have significant unused budget. Consider maximizing your investments.');
    }

    return {
      isValid: errors.length === 0,
      totalCost,
      remainingCredits,
      errors,
      warnings
    };
  }

  /**
   * Calculate the effects of an investment allocation
   */
  static calculateInvestmentEffects(
    allocation: InvestmentAllocation, 
    colonyType: ColonyType
  ): InvestmentEffects {
    // Base intel generation from scouts
    const baseIntelGeneration = allocation.scouts;
    
    // Apply communication array multiplier
    const communicationMultiplier = 1 + allocation.communicationArray;
    const intelGenerationPerRound = baseIntelGeneration * communicationMultiplier;

    // Calculate specialty resources from production upgrades
    const specialtyResourcesPerRound: Record<string, number> = {};
    if (allocation.productionUpgrades > 0) {
      const productionConfig = COLONY_PRODUCTION_UPGRADES[colonyType];
      const productionAmount = allocation.productionUpgrades * 2; // 2 per level

      specialtyResourcesPerRound[productionConfig.primaryResource] = productionAmount;
      if (productionConfig.secondaryResource) {
        specialtyResourcesPerRound[productionConfig.secondaryResource] = Math.floor(productionAmount / 2);
      }
    }

    // Tech patents from research labs
    const techPatentsPerRound = allocation.researchLabs;

    // Emergency resources available
    const emergencyResourcesAvailable = Math.floor(allocation.emergencyReserves * EMERGENCY_CONVERSION_RATE);

    return {
      intelGenerationPerRound,
      specialtyResourcesPerRound,
      techPatentsPerRound,
      communicationMultiplier,
      emergencyResourcesAvailable
    };
  }

  /**
   * Generate investment options for UI with current levels
   */
  static generateInvestmentOptions(currentInvestments: Investments): InvestmentOption[] {
    return Object.values(INVESTMENT_OPTIONS).map(option => ({
      ...option,
      currentLevel: currentInvestments[option.id]
    }));
  }

  /**
   * Save investment allocation to a team
   */
  static async saveTeamInvestments(
    sessionId: string,
    teamId: string,
    allocation: InvestmentAllocation
  ): Promise<void> {
    // Validate the investment first
    const validation = this.validateInvestment(allocation);
    if (!validation.isValid) {
      throw new Error(`Invalid investment: ${validation.errors.join(', ')}`);
    }

    try {
      const sessionRef = doc(firestore, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      const teamIndex = sessionData.teams.findIndex(team => team.id === teamId);
      
      if (teamIndex === -1) {
        throw new Error(`Team ${teamId} not found in session`);
      }

      // Update the team's investments
      sessionData.teams[teamIndex].investments = allocation;

      // Deduct credits from team resources
      sessionData.teams[teamIndex].resources.credits -= validation.totalCost;

      // Update the session
      await updateDoc(sessionRef, {
        teams: sessionData.teams
      });

    } catch (error) {
      console.error('Error saving team investments:', error);
      throw new Error(`Failed to save investments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process investment returns for a team each round
   */
  static async processInvestmentReturns(
    sessionId: string,
    teamId: string
  ): Promise<void> {
    try {
      const sessionRef = doc(firestore, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      const team = sessionData.teams.find(t => t.id === teamId);
      
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      // Calculate returns based on investments
      const effects = this.calculateInvestmentEffects(team.investments, team.type);
      
      // Apply production upgrades - generate specialty resources
      Object.entries(effects.specialtyResourcesPerRound).forEach(([resourceType, amount]) => {
        if (resourceType in team.resources) {
          (team.resources as any)[resourceType] += amount;
        }
      });

      // Generate tech patents from research labs
      if (effects.techPatentsPerRound > 0) {
        team.resources.techPatents += effects.techPatentsPerRound;
      }

      // Note: Intel generation and emergency reserves are handled separately
      // Intel is generated by the intel service
      // Emergency reserves are converted when needed, not automatically

      // Update the session
      const teamIndex = sessionData.teams.findIndex(t => t.id === teamId);
      if (teamIndex !== -1) {
        sessionData.teams[teamIndex] = team;
        await updateDoc(sessionRef, {
          teams: sessionData.teams
        });
      }

    } catch (error) {
      console.error('Error processing investment returns:', error);
      throw new Error(`Failed to process investment returns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process investment returns for all teams in a session
   */
  static async processAllTeamReturns(sessionId: string): Promise<void> {
    try {
      const sessionRef = doc(firestore, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      const batch = writeBatch(firestore);

      // Process each team
      sessionData.teams.forEach(team => {
        const effects = this.calculateInvestmentEffects(team.investments, team.type);
        
        // Apply production upgrades
        Object.entries(effects.specialtyResourcesPerRound).forEach(([resourceType, amount]) => {
          if (resourceType in team.resources) {
            (team.resources as any)[resourceType] += amount;
          }
        });

        // Generate tech patents
        if (effects.techPatentsPerRound > 0) {
          team.resources.techPatents += effects.techPatentsPerRound;
        }
      });

      // Update the entire session
      batch.update(sessionRef, {
        teams: sessionData.teams
      });

      await batch.commit();

    } catch (error) {
      console.error('Error processing all team returns:', error);
      throw new Error(`Failed to process all team returns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert emergency reserves to basic resources
   */
  static async convertEmergencyReserves(
    sessionId: string,
    teamId: string,
    amount: number,
    resourceDistribution: { oxygen: number; food: number; water: number; energy: number }
  ): Promise<void> {
    try {
      const sessionRef = doc(firestore, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      const team = sessionData.teams.find(t => t.id === teamId);
      
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      // Check if team has enough emergency reserves
      if (team.investments.emergencyReserves < amount) {
        throw new Error(`Insufficient emergency reserves. Have: ${team.investments.emergencyReserves}, Need: ${amount}`);
      }

      // Calculate total conversion (at 10% rate)
      const totalResourcesGenerated = Math.floor(amount * EMERGENCY_CONVERSION_RATE);
      
      // Validate distribution adds up to total
      const distributionTotal = Object.values(resourceDistribution).reduce((sum, val) => sum + val, 0);
      if (distributionTotal !== totalResourcesGenerated) {
        throw new Error(`Resource distribution (${distributionTotal}) does not match total generated (${totalResourcesGenerated})`);
      }

      // Apply the conversion
      team.resources.oxygen += resourceDistribution.oxygen;
      team.resources.food += resourceDistribution.food;
      team.resources.water += resourceDistribution.water;
      team.resources.energy += resourceDistribution.energy;

      // Reduce emergency reserves
      team.investments.emergencyReserves -= amount;

      // Update the session
      const teamIndex = sessionData.teams.findIndex(t => t.id === teamId);
      if (teamIndex !== -1) {
        sessionData.teams[teamIndex] = team;
        await updateDoc(sessionRef, {
          teams: sessionData.teams
        });
      }

    } catch (error) {
      console.error('Error converting emergency reserves:', error);
      throw new Error(`Failed to convert emergency reserves: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get investment summary for a team
   */
  static getInvestmentSummary(investments: Investments, colonyType: ColonyType): {
    totalInvested: number;
    effects: InvestmentEffects;
    breakdown: Array<{ name: string; level: number; cost: number; effect: string }>;
  } {
    const effects = this.calculateInvestmentEffects(investments, colonyType);
    
    const breakdown = [
      {
        name: 'Scout Network',
        level: investments.scouts,
        cost: investments.scouts * INVESTMENT_OPTIONS.scouts.costPerLevel,
        effect: `${investments.scouts} intel/round (x${effects.communicationMultiplier} = ${effects.intelGenerationPerRound})`
      },
      {
        name: 'Production Upgrades',
        level: investments.productionUpgrades,
        cost: investments.productionUpgrades * INVESTMENT_OPTIONS.productionUpgrades.costPerLevel,
        effect: Object.entries(effects.specialtyResourcesPerRound).map(([resource, amount]) => `${amount} ${resource}/round`).join(', ') || 'None'
      },
      {
        name: 'Research Labs',
        level: investments.researchLabs,
        cost: investments.researchLabs * INVESTMENT_OPTIONS.researchLabs.costPerLevel,
        effect: `${effects.techPatentsPerRound} tech patents/round`
      },
      {
        name: 'Communication Array',
        level: investments.communicationArray,
        cost: investments.communicationArray * INVESTMENT_OPTIONS.communicationArray.costPerLevel,
        effect: `${effects.communicationMultiplier}x intel multiplier`
      },
      {
        name: 'Emergency Reserves',
        level: investments.emergencyReserves,
        cost: investments.emergencyReserves * INVESTMENT_OPTIONS.emergencyReserves.costPerLevel,
        effect: `${effects.emergencyResourcesAvailable} basic resources available`
      }
    ];

    const totalInvested = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return {
      totalInvested,
      effects,
      breakdown
    };
  }
}