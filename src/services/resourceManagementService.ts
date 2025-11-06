import { 
  ref as dbRef, 
  set as dbSet, 
  update as dbUpdate,
  onValue,
  off 
} from 'firebase/database';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { firestore, realtimeDb } from '../firebase/config';
import type { 
  ResourceConsumption,
  ResourceGeneration
} from '../types/gameEngine';
import {
  DEFAULT_RESOURCE_CONSUMPTION
} from '../types/gameEngine';
import type { 
  Colony, 
  Resources,
  Investments,
  ColonyType
} from '../types';

export interface ResourceManagementConfig {
  sessionId: string;
  consumption: ResourceConsumption;
  generation: ResourceGeneration;
  enableRealTimeTracking: boolean;
  autoSave: boolean;
  debug: boolean;
}

export interface ResourceTransaction {
  id: string;
  teamId: string;
  type: 'consumption' | 'generation' | 'trade' | 'investment';
  timestamp: number;
  round: number;
  resourceChanges: Partial<Resources>;
  reason: string;
  metadata?: Record<string, any>;
}

export interface ResourceAlert {
  teamId: string;
  type: 'critical' | 'warning' | 'info';
  resource: string;
  currentAmount: number;
  threshold: number;
  roundsUntilCritical: number;
  message: string;
  timestamp: number;
}

export interface InvestmentCosts {
  scouts: number;
  productionUpgrades: number;
  researchLabs: number;
  communicationArray: number;
  emergencyReserves: number;
}

export interface ResourceProjection {
  teamId: string;
  currentResources: Resources;
  projectedRounds: number[];
  criticalRound: number;
  recommendations: ResourceRecommendation[];
}

export interface ResourceRecommendation {
  type: 'trade' | 'investment' | 'conservation';
  priority: 'high' | 'medium' | 'low';
  resource: string;
  action: string;
  impact: string;
  cost?: number;
}

export class ResourceManagementService {
  private static instances: Map<string, ResourceManagementService> = new Map();
  private config: ResourceManagementConfig;
  private transactions: ResourceTransaction[] = [];
  private alerts: Map<string, ResourceAlert[]> = new Map();
  private realtimeListeners: Array<() => void> = [];

  // Investment costs (in credits)
  private static readonly INVESTMENT_COSTS: InvestmentCosts = {
    scouts: 100,
    productionUpgrades: 150,
    researchLabs: 200,
    communicationArray: 175,
    emergencyReserves: 50
  };

  private constructor(config: ResourceManagementConfig) {
    this.config = config;

    if (this.config.enableRealTimeTracking) {
      this.setupRealtimeTracking();
    }
  }

  static getInstance(sessionId: string, config?: Partial<ResourceManagementConfig>): ResourceManagementService {
    if (!ResourceManagementService.instances.has(sessionId)) {
      const fullConfig: ResourceManagementConfig = {
        sessionId,
        consumption: config?.consumption || DEFAULT_RESOURCE_CONSUMPTION,
        generation: config?.generation || {
          scouts: { intel: 1, perLevel: 1 },
          production: { specialty: 2, perLevel: 1 },
          research: { techPatents: 1, perLevel: 1 },
          communication: { marketIntel: 1, perLevel: 1 },
          emergency: { basicResources: 4, perLevel: 100 }
        },
        enableRealTimeTracking: config?.enableRealTimeTracking ?? true,
        autoSave: config?.autoSave ?? true,
        debug: config?.debug ?? false
      };

      ResourceManagementService.instances.set(sessionId, new ResourceManagementService(fullConfig));
    }

    return ResourceManagementService.instances.get(sessionId)!;
  }

  /**
   * Apply resource consumption to a team
   */
  async consumeResources(teamId: string, round: number, customConsumption?: Partial<ResourceConsumption>): Promise<Resources> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      const consumption = { ...this.config.consumption, ...customConsumption };
      const resourceChanges: Partial<Resources> = {};

      // Apply consumption
      const newResources = { ...team.resources };
      newResources.oxygen = Math.max(0, newResources.oxygen - consumption.oxygen);
      newResources.food = Math.max(0, newResources.food - consumption.food);
      newResources.water = Math.max(0, newResources.water - consumption.water);
      newResources.energy = Math.max(0, newResources.energy - consumption.energy);

      // Track changes
      resourceChanges.oxygen = -consumption.oxygen;
      resourceChanges.food = -consumption.food;
      resourceChanges.water = -consumption.water;
      resourceChanges.energy = -consumption.energy;

      // Update team resources
      await this.updateTeamResources(teamId, newResources);

      // Record transaction
      await this.recordTransaction({
        id: `consumption_${teamId}_${round}_${Date.now()}`,
        teamId,
        type: 'consumption',
        timestamp: Date.now(),
        round,
        resourceChanges,
        reason: `Round ${round} resource consumption`,
        metadata: { consumption }
      });

      // Check for alerts
      await this.checkResourceAlerts(teamId, newResources);

      this.log(`Resources consumed for team ${teamId}: ${JSON.stringify(consumption)}`);

      return newResources;

    } catch (error) {
      console.error(`Error consuming resources for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Generate resources from investments
   */
  async generateResources(teamId: string, investments: Investments, colonyType: ColonyType, round: number): Promise<Resources> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      const newResources = { ...team.resources };
      const resourceChanges: Partial<Resources> = {};

      // Scout investment - generates intel (handled by intel service)
      if (investments.scouts > 0) {
        // This is handled by the intel generation service
        this.log(`Scout investment level ${investments.scouts} for team ${teamId}`);
      }

      // Production investment - generates specialty resources
      if (investments.productionUpgrades > 0) {
        const specialtyResource = this.getSpecialtyResource(colonyType);
        if (specialtyResource && typeof newResources[specialtyResource as keyof Resources] === 'number') {
          const amount = investments.productionUpgrades * this.config.generation.production.specialty;
          (newResources as any)[specialtyResource] += amount;
          (resourceChanges as any)[specialtyResource] = amount;
        }
      }

      // Research investment - generates tech patents
      if (investments.researchLabs > 0) {
        const amount = investments.researchLabs * this.config.generation.research.techPatents;
        newResources.techPatents += amount;
        resourceChanges.techPatents = amount;
      }

      // Communication investment - enhances intel generation (handled by intel service)
      if (investments.communicationArray > 0) {
        this.log(`Communication investment level ${investments.communicationArray} for team ${teamId}`);
      }

      // Emergency reserves - generates basic resources
      if (investments.emergencyReserves > 0) {
        const returnRate = 0.1; // 10% return on investment
        const totalReturn = investments.emergencyReserves * returnRate;
        const perResource = Math.floor(totalReturn / 4);

        newResources.oxygen += perResource;
        newResources.food += perResource;
        newResources.water += perResource;
        newResources.energy += perResource;

        resourceChanges.oxygen = (resourceChanges.oxygen || 0) + perResource;
        resourceChanges.food = (resourceChanges.food || 0) + perResource;
        resourceChanges.water = (resourceChanges.water || 0) + perResource;
        resourceChanges.energy = (resourceChanges.energy || 0) + perResource;
      }

      // Update team resources
      await this.updateTeamResources(teamId, newResources);

      // Record transaction
      await this.recordTransaction({
        id: `generation_${teamId}_${round}_${Date.now()}`,
        teamId,
        type: 'generation',
        timestamp: Date.now(),
        round,
        resourceChanges,
        reason: `Round ${round} investment returns`,
        metadata: { investments, colonyType }
      });

      this.log(`Resources generated for team ${teamId}: ${JSON.stringify(resourceChanges)}`);

      return newResources;

    } catch (error) {
      console.error(`Error generating resources for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Process investment purchase
   */
  async purchaseInvestment(teamId: string, investmentType: keyof Investments, amount: number): Promise<{ success: boolean; newResources: Resources; newInvestments: Investments }> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      const cost = ResourceManagementService.INVESTMENT_COSTS[investmentType] * amount;

      // Check if team has enough credits
      if (team.resources.credits < cost) {
        throw new Error(`Insufficient credits. Need ${cost}, have ${team.resources.credits}`);
      }

      // Update resources and investments
      const newResources = { ...team.resources };
      newResources.credits -= cost;

      const newInvestments = { ...team.investments };
      newInvestments[investmentType] += amount;

      // Update team
      await this.updateTeamResources(teamId, newResources);
      await this.updateTeamInvestments(teamId, newInvestments);

      // Record transaction
      await this.recordTransaction({
        id: `investment_${teamId}_${investmentType}_${Date.now()}`,
        teamId,
        type: 'investment',
        timestamp: Date.now(),
        round: 0, // Investments typically happen before rounds
        resourceChanges: { credits: -cost },
        reason: `Purchased ${amount} ${investmentType}`,
        metadata: { investmentType, amount, cost }
      });

      this.log(`Investment purchased: ${teamId} bought ${amount} ${investmentType} for ${cost} credits`);

      return { success: true, newResources, newInvestments };

    } catch (error) {
      console.error(`Error purchasing investment for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate resource projections
   */
  calculateResourceProjection(team: Colony, rounds: number = 10): ResourceProjection {
    const projectedRounds: number[] = [];
    const currentResources = { ...team.resources };
    let criticalRound = -1;

    for (let round = 1; round <= rounds; round++) {
      // Apply consumption
      currentResources.oxygen = Math.max(0, currentResources.oxygen - this.config.consumption.oxygen);
      currentResources.food = Math.max(0, currentResources.food - this.config.consumption.food);
      currentResources.water = Math.max(0, currentResources.water - this.config.consumption.water);
      currentResources.energy = Math.max(0, currentResources.energy - this.config.consumption.energy);

      // Apply generation
      this.applyInvestmentGeneration(currentResources, team.investments, team.type);

      // Check for critical state
      const isCritical = this.isCriticalState(currentResources);
      if (isCritical && criticalRound === -1) {
        criticalRound = round;
      }

      projectedRounds.push(this.calculateSurvivalScore(currentResources));
    }

    const recommendations = this.generateRecommendations(team, criticalRound);

    return {
      teamId: team.id,
      currentResources: team.resources,
      projectedRounds,
      criticalRound,
      recommendations
    };
  }

  /**
   * Generate resource management recommendations
   */
  private generateRecommendations(team: Colony, criticalRound: number): ResourceRecommendation[] {
    const recommendations: ResourceRecommendation[] = [];

    // Check for immediate critical resources
    const criticalResources = this.getCriticalResources(team.resources);
    
    criticalResources.forEach(resource => {
      recommendations.push({
        type: 'trade',
        priority: 'high',
        resource,
        action: `Acquire ${resource} immediately`,
        impact: 'Prevents elimination',
        cost: 0
      });
    });

    // Check for low resources (warning level)
    const lowResources = this.getLowResources(team.resources);
    
    lowResources.forEach(resource => {
      recommendations.push({
        type: 'trade',
        priority: 'medium',
        resource,
        action: `Trade for ${resource} in next round`,
        impact: 'Prevents future critical state'
      });
    });

    // Investment recommendations
    if (team.resources.credits >= 200 && criticalRound > 3) {
      recommendations.push({
        type: 'investment',
        priority: 'medium',
        resource: 'emergency reserves',
        action: 'Invest in emergency reserves',
        impact: 'Provides basic resource generation',
        cost: ResourceManagementService.INVESTMENT_COSTS.emergencyReserves
      });
    }

    // Specialty resource optimization
    const specialtyResource = this.getSpecialtyResource(team.type);
    if (specialtyResource && team.resources.credits >= 150) {
      recommendations.push({
        type: 'investment',
        priority: 'low',
        resource: specialtyResource,
        action: 'Invest in production upgrades',
        impact: `Increases ${specialtyResource} generation`,
        cost: ResourceManagementService.INVESTMENT_COSTS.productionUpgrades
      });
    }

    return recommendations;
  }

  /**
   * Get resource alerts for a team
   */
  getResourceAlerts(teamId: string): ResourceAlert[] {
    return this.alerts.get(teamId) || [];
  }

  /**
   * Get resource transaction history
   */
  getTransactionHistory(teamId?: string): ResourceTransaction[] {
    if (teamId) {
      return this.transactions.filter(t => t.teamId === teamId);
    }
    return [...this.transactions];
  }

  // Private helper methods

  private async getTeam(teamId: string): Promise<Colony | null> {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) return null;

      const sessionData = sessionDoc.data();
      return sessionData.teams?.find((team: Colony) => team.id === teamId) || null;

    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      return null;
    }
  }

  private async updateTeamResources(teamId: string, resources: Resources): Promise<void> {
    try {
      // Update Firestore
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) throw new Error('Session not found');

      const sessionData = sessionDoc.data();
      const teamIndex = sessionData.teams.findIndex((team: Colony) => team.id === teamId);
      
      if (teamIndex === -1) throw new Error('Team not found');

      sessionData.teams[teamIndex].resources = resources;

      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        teams: sessionData.teams,
        updatedAt: serverTimestamp()
      });

      // Update realtime database
      if (this.config.enableRealTimeTracking) {
        await dbUpdate(dbRef(realtimeDb, `teams/${this.config.sessionId}/${teamId}/resources`), resources);
      }

    } catch (error) {
      console.error(`Error updating team resources:`, error);
      throw error;
    }
  }

  private async updateTeamInvestments(teamId: string, investments: Investments): Promise<void> {
    try {
      // Update Firestore
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) throw new Error('Session not found');

      const sessionData = sessionDoc.data();
      const teamIndex = sessionData.teams.findIndex((team: Colony) => team.id === teamId);
      
      if (teamIndex === -1) throw new Error('Team not found');

      sessionData.teams[teamIndex].investments = investments;

      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        teams: sessionData.teams,
        updatedAt: serverTimestamp()
      });

      // Update realtime database
      if (this.config.enableRealTimeTracking) {
        await dbUpdate(dbRef(realtimeDb, `teams/${this.config.sessionId}/${teamId}/investments`), investments);
      }

    } catch (error) {
      console.error(`Error updating team investments:`, error);
      throw error;
    }
  }

  private async recordTransaction(transaction: ResourceTransaction): Promise<void> {
    this.transactions.push(transaction);

    // Keep only last 100 transactions per team to prevent memory issues
    if (this.transactions.length > 1000) {
      this.transactions = this.transactions.slice(-1000);
    }

    // Save to realtime database if enabled
    if (this.config.enableRealTimeTracking && this.config.autoSave) {
      const transactionRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/transactions/${transaction.id}`);
      await dbSet(transactionRef, transaction);
    }
  }

  private async checkResourceAlerts(teamId: string, resources: Resources): Promise<void> {
    const alerts: ResourceAlert[] = [];

    // Check basic resources
    const basicResources = ['oxygen', 'food', 'water', 'energy'] as const;
    const thresholds = { oxygen: 4, food: 4, water: 2, energy: 6 }; // Warning thresholds

    basicResources.forEach(resource => {
      const amount = resources[resource];
      const threshold = thresholds[resource];
      const consumption = this.config.consumption[resource];
      const roundsUntilCritical = Math.floor(amount / consumption);

      if (amount === 0) {
        alerts.push({
          teamId,
          type: 'critical',
          resource,
          currentAmount: amount,
          threshold: 0,
          roundsUntilCritical: 0,
          message: `CRITICAL: ${resource} depleted!`,
          timestamp: Date.now()
        });
      } else if (amount <= threshold) {
        alerts.push({
          teamId,
          type: 'warning',
          resource,
          currentAmount: amount,
          threshold,
          roundsUntilCritical,
          message: `WARNING: Low ${resource} (${roundsUntilCritical} rounds remaining)`,
          timestamp: Date.now()
        });
      }
    });

    this.alerts.set(teamId, alerts);

    // Send realtime alerts
    if (this.config.enableRealTimeTracking && alerts.length > 0) {
      const alertsRef = dbRef(realtimeDb, `teams/${this.config.sessionId}/${teamId}/alerts`);
      await dbSet(alertsRef, alerts);
    }
  }

  private getSpecialtyResource(colonyType: ColonyType): string | null {
    const specialtyMap: Record<ColonyType, string> = {
      mining: 'minerals',
      agricultural: 'food',
      research: 'techComponents',
      trade_hub: 'credits',
      military: 'defenseContracts',
      manufacturing: 'alloys'
    };

    return specialtyMap[colonyType] || null;
  }

  private applyInvestmentGeneration(resources: Resources, investments: Investments, colonyType: ColonyType): void {
    // Emergency reserves generation
    if (investments.emergencyReserves > 0) {
      const returnRate = 0.1;
      const totalReturn = investments.emergencyReserves * returnRate;
      const perResource = Math.floor(totalReturn / 4);

      resources.oxygen += perResource;
      resources.food += perResource;
      resources.water += perResource;
      resources.energy += perResource;
    }

    // Production upgrades
    if (investments.productionUpgrades > 0) {
      const specialtyResource = this.getSpecialtyResource(colonyType);
      if (specialtyResource && typeof resources[specialtyResource as keyof Resources] === 'number') {
        const amount = investments.productionUpgrades * 2;
        (resources as any)[specialtyResource] += amount;
      }
    }

    // Research labs
    if (investments.researchLabs > 0) {
      resources.techPatents += investments.researchLabs;
    }
  }

  private isCriticalState(resources: Resources): boolean {
    return resources.oxygen <= 0 || resources.food <= 0 || resources.water <= 0 || resources.energy <= 0;
  }

  private getCriticalResources(resources: Resources): string[] {
    const critical: string[] = [];
    if (resources.oxygen <= 0) critical.push('oxygen');
    if (resources.food <= 0) critical.push('food');
    if (resources.water <= 0) critical.push('water');
    if (resources.energy <= 0) critical.push('energy');
    return critical;
  }

  private getLowResources(resources: Resources): string[] {
    const low: string[] = [];
    const thresholds = { oxygen: 4, food: 4, water: 2, energy: 6 };
    
    Object.entries(thresholds).forEach(([resource, threshold]) => {
      const resourceValue = resources[resource as keyof Resources];
      if (typeof resourceValue === 'number' && resourceValue <= threshold && resourceValue > 0) {
        low.push(resource);
      }
    });
    
    return low;
  }

  private calculateSurvivalScore(resources: Resources): number {
    const rounds = [
      Math.floor(resources.oxygen / this.config.consumption.oxygen),
      Math.floor(resources.food / this.config.consumption.food),
      Math.floor(resources.water / this.config.consumption.water),
      Math.floor(resources.energy / this.config.consumption.energy)
    ];

    return Math.min(...rounds);
  }

  private setupRealtimeTracking(): void {
    // Setup realtime listeners for resource changes
    const resourcesRef = dbRef(realtimeDb, `teams/${this.config.sessionId}`);
    
    onValue(resourcesRef, (snapshot) => {
      if (snapshot.exists()) {
        // Handle realtime resource updates
        this.log('Realtime resource update received');
      }
    });

    this.realtimeListeners.push(() => off(resourcesRef));
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[ResourceManagement:${this.config.sessionId}] ${message}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Remove realtime listeners
    this.realtimeListeners.forEach(unsubscribe => unsubscribe());
    this.realtimeListeners = [];

    // Clear data
    this.transactions = [];
    this.alerts.clear();

    // Remove from instances
    ResourceManagementService.instances.delete(this.config.sessionId);
  }
}