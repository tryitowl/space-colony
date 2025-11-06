import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { teamDataService } from './teamDataService';
import { realtimeService } from './realtimeService';
import type { 
  GameSession, 
  Colony, 
  Resources, 
  GameState,
  GameEventLog
} from '../types/game';

// Crisis Event Types
export interface CrisisEvent {
  id: string;
  sessionId: string;
  type: CrisisEventType;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  round: number;
  timestamp: number;
  duration: number; // How long the crisis lasts (ms)
  effects: CrisisEffect[];
  resolutionOptions: CrisisResolution[];
  isActive: boolean;
  resolvedBy?: string; // Team ID that resolved it
  resolvedAt?: number;
  affectedTeams: string[]; // Team IDs affected by this crisis
}

export type CrisisEventType = 
  | 'solar_storm'
  | 'equipment_failure' 
  | 'supply_shortage'
  | 'contamination'
  | 'system_malfunction'
  | 'asteroid_threat'
  | 'communication_blackout'
  | 'reactor_instability'
  | 'life_support_failure'
  | 'alien_interference';

export interface CrisisEffect {
  type: 'resource_drain' | 'trading_disabled' | 'production_halt' | 'communication_loss' | 'random_damage';
  duration: number;
  parameters: {
    resourceTypes?: (keyof Resources)[];
    drainRate?: number;
    affectedSystems?: string[];
    severity?: number;
  };
}

export interface CrisisResolution {
  id: string;
  title: string;
  description: string;
  requirements: Partial<Resources>;
  timeLimit: number; // How long to complete (ms)
  successEffects: CrisisReward[];
  failureEffects: CrisisPenalty[];
  teamContributionRequired: boolean; // If multiple teams need to contribute
}

export interface CrisisReward {
  type: 'resource_bonus' | 'trading_advantage' | 'immunity' | 'tech_advancement';
  parameters: {
    resources?: Partial<Resources>;
    duration?: number;
    advantage?: string;
  };
}

export interface CrisisPenalty {
  type: 'resource_loss' | 'trading_penalty' | 'system_damage' | 'elimination_risk';
  parameters: {
    resources?: Partial<Resources>;
    severity?: number;
    duration?: number;
  };
}

export interface EventSystemConfig {
  sessionId: string;
  enabledEventTypes: CrisisEventType[];
  eventFrequency: number; // Events per round
  maxConcurrentEvents: number;
  severityWeights: Record<'minor' | 'major' | 'critical', number>;
}

export class EventSystemService {
  private static instances: Map<string, EventSystemService> = new Map();
  private config: EventSystemConfig;
  private activeEvents: Map<string, CrisisEvent> = new Map();
  private eventGenerationInterval: NodeJS.Timeout | null = null;

  private constructor(config: EventSystemConfig) {
    this.config = config;
  }

  static getInstance(sessionId: string, config?: Partial<EventSystemConfig>): EventSystemService {
    if (!EventSystemService.instances.has(sessionId)) {
      if (!config) {
        throw new Error(`EventSystemService instance for session ${sessionId} not found`);
      }
      
      const fullConfig: EventSystemConfig = {
        sessionId,
        enabledEventTypes: [
          'solar_storm', 'equipment_failure', 'supply_shortage', 
          'contamination', 'system_malfunction', 'asteroid_threat'
        ],
        eventFrequency: 0.3, // 30% chance per round
        maxConcurrentEvents: 2,
        severityWeights: { minor: 0.6, major: 0.3, critical: 0.1 },
        ...config
      };

      EventSystemService.instances.set(sessionId, new EventSystemService(fullConfig));
    }
    
    return EventSystemService.instances.get(sessionId)!;
  }

  /**
   * Initialize event system for a session
   */
  async initialize(): Promise<void> {
    try {
      // Load any existing active events
      await this.loadActiveEvents();
      
      // Start event generation if not already running
      this.startEventGeneration();

    } catch (error) {
      console.error('Failed to initialize event system:', error);
      throw error;
    }
  }

  /**
   * Manually trigger a crisis event
   */
  async triggerCrisisEvent(
    eventType: CrisisEventType, 
    severity: 'minor' | 'major' | 'critical' = 'major',
    affectedTeams?: string[]
  ): Promise<CrisisEvent> {
    try {
      // Get session data
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data() as GameSession;
      
      // Generate crisis event
      const crisisEvent = this.generateCrisisEvent(
        eventType, 
        severity, 
        sessionData.currentRound,
        affectedTeams || sessionData.teams.map(t => t.id)
      );

      // Store in Firestore
      await addDoc(collection(firestore, 'crisisEvents'), crisisEvent);
      
      // Add to active events
      this.activeEvents.set(crisisEvent.id, crisisEvent);
      
      // Apply immediate effects
      await this.applyCrisisEffects(crisisEvent);
      
      // Set auto-resolution timer
      setTimeout(() => {
        this.autoResolveCrisis(crisisEvent.id).catch(console.error);
      }, crisisEvent.duration);

      // Log event
      await this.logGameEvent({
        id: `crisis_${crisisEvent.id}`,
        timestamp: Date.now(),
        type: 'event',
        message: `Crisis Event: ${crisisEvent.title}`,
        data: {
          eventType: crisisEvent.type,
          severity: crisisEvent.severity,
          round: crisisEvent.round,
          affectedTeams: crisisEvent.affectedTeams
        }
      });

      return crisisEvent;

    } catch (error) {
      console.error('Failed to trigger crisis event:', error);
      throw error;
    }
  }

  /**
   * Attempt to resolve a crisis event
   */
  async resolveCrisis(
    eventId: string, 
    resolutionId: string, 
    teamId: string, 
    contributedResources: Partial<Resources>
  ): Promise<{ success: boolean; rewards?: CrisisReward[]; penalties?: CrisisPenalty[] }> {
    const crisisEvent = this.activeEvents.get(eventId);
    if (!crisisEvent || !crisisEvent.isActive) {
      throw new Error('Crisis event not found or not active');
    }

    try {
      const resolution = crisisEvent.resolutionOptions.find(r => r.id === resolutionId);
      if (!resolution) {
        throw new Error('Resolution option not found');
      }

      // Validate resource contribution
      const success = this.validateResolutionRequirements(resolution.requirements, contributedResources);
      
      if (success) {
        // Apply success effects
        await this.applyResolutionEffects(resolution.successEffects, teamId);
        
        // Mark crisis as resolved
        crisisEvent.isActive = false;
        crisisEvent.resolvedBy = teamId;
        crisisEvent.resolvedAt = Date.now();
        
        // Remove from active events
        this.activeEvents.delete(eventId);
        
        // Update Firestore
        await updateDoc(doc(firestore, 'crisisEvents', eventId), {
          isActive: false,
          resolvedBy: teamId,
          resolvedAt: serverTimestamp()
        });

        // Deduct contributed resources from team
        await this.deductResources(teamId, contributedResources);

        await this.logGameEvent({
          id: `crisis_resolved_${eventId}`,
          timestamp: Date.now(),
          type: 'event',
          message: `Crisis resolved by ${teamId}: ${crisisEvent.title}`,
          data: {
            eventId,
            teamId,
            resolutionId,
            contributedResources
          }
        });

        return { success: true, rewards: resolution.successEffects };
      } else {
        // Apply failure effects
        await this.applyResolutionEffects(resolution.failureEffects, teamId);
        
        await this.logGameEvent({
          id: `crisis_failed_${eventId}`,
          timestamp: Date.now(),
          type: 'event',
          message: `Failed to resolve crisis: ${crisisEvent.title}`,
          data: {
            eventId,
            teamId,
            resolutionId,
            contributedResources
          }
        });

        return { success: false, penalties: resolution.failureEffects };
      }

    } catch (error) {
      console.error('Failed to resolve crisis:', error);
      throw error;
    }
  }

  /**
   * Get all active crisis events
   */
  getActiveEvents(): CrisisEvent[] {
    return Array.from(this.activeEvents.values());
  }

  /**
   * Get crisis events history for session
   */
  async getCrisisHistory(): Promise<CrisisEvent[]> {
    try {
      const q = query(
        collection(firestore, 'crisisEvents'),
        where('sessionId', '==', this.config.sessionId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as CrisisEvent);

    } catch (error) {
      console.error('Failed to get crisis history:', error);
      return [];
    }
  }

  // Private methods

  private async loadActiveEvents(): Promise<void> {
    try {
      const q = query(
        collection(firestore, 'crisisEvents'),
        where('sessionId', '==', this.config.sessionId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const event = doc.data() as CrisisEvent;
        this.activeEvents.set(event.id, event);
      });

    } catch (error) {
      console.error('Failed to load active events:', error);
    }
  }

  private startEventGeneration(): void {
    // Generate events based on game progression
    // This would be called periodically or on round transitions
    this.eventGenerationInterval = setInterval(() => {
      this.checkForRandomEvents().catch(console.error);
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async checkForRandomEvents(): Promise<void> {
    if (this.activeEvents.size >= this.config.maxConcurrentEvents) {
      return; // Too many active events
    }

    if (Math.random() < this.config.eventFrequency) {
      const randomEventType = this.config.enabledEventTypes[
        Math.floor(Math.random() * this.config.enabledEventTypes.length)
      ];
      
      const severity = this.generateRandomSeverity();
      await this.triggerCrisisEvent(randomEventType, severity);
    }
  }

  private generateRandomSeverity(): 'minor' | 'major' | 'critical' {
    const rand = Math.random();
    const weights = this.config.severityWeights;
    
    if (rand < weights.minor) return 'minor';
    if (rand < weights.minor + weights.major) return 'major';
    return 'critical';
  }

  private generateCrisisEvent(
    type: CrisisEventType, 
    severity: 'minor' | 'major' | 'critical',
    round: number,
    affectedTeams: string[]
  ): CrisisEvent {
    const eventTemplates = this.getCrisisTemplates();
    const template = eventTemplates[type];
    
    if (!template) {
      throw new Error(`No template found for crisis type: ${type}`);
    }

    const severityMultiplier = severity === 'minor' ? 0.5 : severity === 'major' ? 1 : 2;
    
    return {
      id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.config.sessionId,
      type,
      title: template.title,
      description: template.description,
      severity,
      round,
      timestamp: Date.now(),
      duration: template.baseDuration * severityMultiplier,
      effects: template.effects.map(effect => ({
        ...effect,
        duration: effect.duration * severityMultiplier,
        parameters: {
          ...effect.parameters,
          drainRate: (effect.parameters.drainRate || 1) * severityMultiplier
        }
      })),
      resolutionOptions: template.resolutionOptions.map(option => ({
        ...option,
        requirements: this.scaleRequirements(option.requirements, severityMultiplier)
      })),
      isActive: true,
      affectedTeams
    };
  }

  private getCrisisTemplates(): Record<CrisisEventType, any> {
    return {
      solar_storm: {
        title: "Solar Storm",
        description: "A massive solar flare has disrupted communication and power systems across the sector.",
        baseDuration: 5 * 60 * 1000, // 5 minutes
        effects: [{
          type: 'resource_drain',
          duration: 3 * 60 * 1000,
          parameters: {
            resourceTypes: ['energy'],
            drainRate: 1
          }
        }],
        resolutionOptions: [{
          id: 'shield_systems',
          title: "Deploy Shield Systems",
          description: "Use energy reserves and technical components to shield against the storm.",
          requirements: { energy: 5, techComponents: 2 },
          timeLimit: 3 * 60 * 1000,
          successEffects: [{
            type: 'immunity',
            parameters: { duration: 10 * 60 * 1000 }
          }],
          failureEffects: [{
            type: 'resource_loss',
            parameters: { resources: { energy: 3 } }
          }],
          teamContributionRequired: false
        }]
      },
      equipment_failure: {
        title: "Critical Equipment Failure",
        description: "Essential life support equipment has malfunctioned and requires immediate attention.",
        baseDuration: 8 * 60 * 1000,
        effects: [{
          type: 'production_halt',
          duration: 5 * 60 * 1000,
          parameters: {
            affectedSystems: ['life_support']
          }
        }],
        resolutionOptions: [{
          id: 'emergency_repair',
          title: "Emergency Repair",
          description: "Use alloys and technical expertise to repair the damaged equipment.",
          requirements: { alloys: 3, techComponents: 1 },
          timeLimit: 5 * 60 * 1000,
          successEffects: [{
            type: 'tech_advancement',
            parameters: { advantage: 'improved_reliability' }
          }],
          failureEffects: [{
            type: 'system_damage',
            parameters: { severity: 2 }
          }],
          teamContributionRequired: false
        }]
      },
      supply_shortage: {
        title: "Critical Supply Shortage",
        description: "Trade routes have been disrupted, causing severe shortages of essential resources.",
        baseDuration: 10 * 60 * 1000,
        effects: [{
          type: 'trading_disabled',
          duration: 8 * 60 * 1000,
          parameters: {
            affectedSystems: ['trade_routes']
          }
        }],
        resolutionOptions: [{
          id: 'emergency_supplies',
          title: "Deploy Emergency Supplies",
          description: "Use emergency reserves to maintain operations until trade routes are restored.",
          requirements: { food: 4, water: 3, oxygen: 3 },
          timeLimit: 7 * 60 * 1000,
          successEffects: [{
            type: 'trading_advantage',
            parameters: { duration: 15 * 60 * 1000, advantage: 'priority_access' }
          }],
          failureEffects: [{
            type: 'resource_loss',
            parameters: { resources: { food: 2, water: 2 } }
          }],
          teamContributionRequired: true
        }]
      },
      // Add more crisis templates...
      contamination: {
        title: "Biological Contamination",
        description: "Unknown pathogens have contaminated food and water supplies.",
        baseDuration: 12 * 60 * 1000,
        effects: [{
          type: 'resource_drain',
          duration: 10 * 60 * 1000,
          parameters: {
            resourceTypes: ['food', 'water'],
            drainRate: 0.5
          }
        }],
        resolutionOptions: [{
          id: 'quarantine_protocol',
          title: "Quarantine Protocol",
          description: "Implement strict quarantine and decontamination procedures.",
          requirements: { techComponents: 2, energy: 6 },
          timeLimit: 8 * 60 * 1000,
          successEffects: [{
            type: 'resource_bonus',
            parameters: { resources: { food: 5, water: 5 } }
          }],
          failureEffects: [{
            type: 'elimination_risk',
            parameters: { severity: 1 }
          }],
          teamContributionRequired: false
        }]
      },
      system_malfunction: {
        title: "System Malfunction",
        description: "Multiple systems are experiencing cascading failures.",
        baseDuration: 6 * 60 * 1000,
        effects: [{
          type: 'random_damage',
          duration: 4 * 60 * 1000,
          parameters: { severity: 1 }
        }],
        resolutionOptions: [{
          id: 'system_reset',
          title: "Emergency System Reset",
          description: "Perform a complete system restart with backup power.",
          requirements: { energy: 8, techPatents: 1 },
          timeLimit: 4 * 60 * 1000,
          successEffects: [{
            type: 'tech_advancement',
            parameters: { advantage: 'system_efficiency' }
          }],
          failureEffects: [{
            type: 'system_damage',
            parameters: { severity: 3 }
          }],
          teamContributionRequired: false
        }]
      },
      asteroid_threat: {
        title: "Asteroid Threat",
        description: "A large asteroid is on collision course with the station.",
        baseDuration: 15 * 60 * 1000,
        effects: [{
          type: 'communication_loss',
          duration: 10 * 60 * 1000,
          parameters: { severity: 2 }
        }],
        resolutionOptions: [{
          id: 'deflection_system',
          title: "Deploy Deflection System",
          description: "Use all available energy and defense systems to deflect the asteroid.",
          requirements: { energy: 15, defenseContracts: 2, alloys: 5 },
          timeLimit: 12 * 60 * 1000,
          successEffects: [{
            type: 'resource_bonus',
            parameters: { resources: { minerals: 20, alloys: 10 } }
          }],
          failureEffects: [{
            type: 'elimination_risk',
            parameters: { severity: 3 }
          }],
          teamContributionRequired: true
        }]
      }
    };
  }

  private scaleRequirements(requirements: Partial<Resources>, multiplier: number): Partial<Resources> {
    const scaled: Partial<Resources> = {};
    Object.entries(requirements).forEach(([resource, amount]) => {
      if (amount) {
        scaled[resource as keyof Resources] = Math.ceil(amount * multiplier) as any;
      }
    });
    return scaled;
  }

  private validateResolutionRequirements(
    requirements: Partial<Resources>, 
    contributed: Partial<Resources>
  ): boolean {
    return Object.entries(requirements).every(([resource, required]) => {
      const contributedAmount = contributed[resource as keyof Resources] as number || 0;
      return contributedAmount >= (required || 0);
    });
  }

  private async applyCrisisEffects(crisisEvent: CrisisEvent): Promise<void> {
    console.log(`Applying crisis effects for: ${crisisEvent.title}`);
    
    for (const effect of crisisEvent.effects) {
      switch (effect.type) {
        case 'resource_drain':
          await this.applyResourceDrainEffect(crisisEvent, effect);
          break;
          
        case 'trading_disabled':
          await this.applyTradingDisabledEffect(crisisEvent, effect);
          break;
          
        case 'production_halt':
          await this.applyProductionHaltEffect(crisisEvent, effect);
          break;
          
        case 'communication_loss':
          await this.applyCommunicationLossEffect(crisisEvent, effect);
          break;
          
        case 'random_damage':
          await this.applyRandomDamageEffect(crisisEvent, effect);
          break;
      }
    }
    
    // Store active effects in realtime database for UI updates
    await realtimeService.updateSessionData(crisisEvent.sessionId, {
      activeCrisisEffects: {
        [crisisEvent.id]: {
          type: crisisEvent.type,
          title: crisisEvent.title,
          effects: crisisEvent.effects.map(e => e.type),
          startTime: Date.now(),
          endTime: Date.now() + crisisEvent.duration
        }
      }
    });
  }

  private async applyResolutionEffects(
    effects: (CrisisReward | CrisisPenalty)[], 
    teamId: string
  ): Promise<void> {
    console.log(`Applying resolution effects to team ${teamId}`);
    
    for (const effect of effects) {
      // Type guard to distinguish between rewards and penalties
      const isReward = 'type' in effect && (
        effect.type === 'resource_bonus' || 
        effect.type === 'trading_advantage' || 
        effect.type === 'immunity' || 
        effect.type === 'tech_advancement'
      );
      
      if (isReward) {
        await this.applyRewardEffect(effect as CrisisReward, teamId);
      } else {
        await this.applyPenaltyEffect(effect as CrisisPenalty, teamId);
      }
    }
  }

  private async deductResources(teamId: string, resources: Partial<Resources>): Promise<void> {
    console.log(`Deducting resources from team ${teamId}:`, resources);
    
    try {
      // Get current team resources
      const team = await teamDataService.getTeam(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }
      
      // Calculate new resource values
      const updatedResources: Partial<Resources> = {};
      let hasInsufficientResources = false;
      
      for (const [resource, amount] of Object.entries(resources)) {
        const currentAmount = team.resources[resource as keyof Resources] || 0;
        const deductAmount = amount || 0;
        
        if (currentAmount < deductAmount) {
          hasInsufficientResources = true;
          console.warn(`Team ${teamId} has insufficient ${resource}: ${currentAmount} < ${deductAmount}`);
        }
        
        // Deduct but don't go below 0
        updatedResources[resource as keyof Resources] = Math.max(0, currentAmount - deductAmount);
      }
      
      // Update team resources
      await teamDataService.updateTeamResources(teamId, updatedResources);
      
      // Log the deduction
      await this.logGameEvent({
        id: `resource_deduct_${teamId}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'resource',
        message: `Resources deducted from ${team.name}`,
        data: {
          teamId,
          deducted: resources,
          hadInsufficientResources: hasInsufficientResources
        }
      });
      
      // Send notification to team
      await realtimeService.sendNotification(this.sessionId, {
        type: 'resource_change',
        title: 'Resources Deducted',
        message: `Resources have been deducted for crisis resolution`,
        targetTeam: teamId,
        priority: 'medium'
      });
      
    } catch (error) {
      console.error('Error deducting resources:', error);
      throw error;
    }
  }

  private async autoResolveCrisis(eventId: string): Promise<void> {
    const crisisEvent = this.activeEvents.get(eventId);
    if (!crisisEvent || !crisisEvent.isActive) return;

    // Auto-resolve with failure effects
    crisisEvent.isActive = false;
    this.activeEvents.delete(eventId);

    await updateDoc(doc(firestore, 'crisisEvents', eventId), {
      isActive: false,
      resolvedAt: serverTimestamp()
    });
  }

  private async logGameEvent(event: GameEventLog): Promise<void> {
    try {
      await addDoc(collection(firestore, 'gameEvents'), {
        ...event,
        sessionId: this.config.sessionId
      });
    } catch (error) {
      console.error('Failed to log game event:', error);
    }
  }

  // Helper methods for specific crisis effects
  private async applyResourceDrainEffect(crisisEvent: CrisisEvent, effect: CrisisEffect): Promise<void> {
    const { resourceTypes = [], drainRate = 1 } = effect.parameters;
    
    // Apply drain to all affected teams
    for (const teamId of crisisEvent.affectedTeams) {
      const drainResources: Partial<Resources> = {};
      
      for (const resourceType of resourceTypes) {
        drainResources[resourceType] = drainRate;
      }
      
      await this.deductResources(teamId, drainResources);
    }
    
    // Schedule periodic drain if effect has duration
    if (effect.duration > 0) {
      const drainInterval = setInterval(async () => {
        // Check if crisis is still active
        const stillActive = this.activeEvents.has(crisisEvent.id);
        if (!stillActive) {
          clearInterval(drainInterval);
          return;
        }
        
        // Apply drain again
        for (const teamId of crisisEvent.affectedTeams) {
          const drainResources: Partial<Resources> = {};
          for (const resourceType of resourceTypes) {
            drainResources[resourceType] = drainRate;
          }
          await this.deductResources(teamId, drainResources);
        }
      }, 60000); // Drain every minute
      
      // Clear interval after duration
      setTimeout(() => clearInterval(drainInterval), effect.duration);
    }
  }
  
  private async applyTradingDisabledEffect(crisisEvent: CrisisEvent, effect: CrisisEffect): Promise<void> {
    // Update session state to disable trading
    await updateDoc(doc(firestore, 'sessions', crisisEvent.sessionId), {
      'gameState.tradingDisabled': true,
      'gameState.tradingDisabledReason': crisisEvent.title,
      'gameState.tradingDisabledUntil': Date.now() + effect.duration
    });
    
    // Update realtime status
    await realtimeService.updateSessionData(crisisEvent.sessionId, {
      tradingStatus: {
        enabled: false,
        reason: crisisEvent.title,
        resumeTime: Date.now() + effect.duration
      }
    });
    
    // Re-enable trading after duration
    setTimeout(async () => {
      await updateDoc(doc(firestore, 'sessions', crisisEvent.sessionId), {
        'gameState.tradingDisabled': false,
        'gameState.tradingDisabledReason': null,
        'gameState.tradingDisabledUntil': null
      });
      
      await realtimeService.updateSessionData(crisisEvent.sessionId, {
        tradingStatus: {
          enabled: true,
          reason: null,
          resumeTime: null
        }
      });
    }, effect.duration);
  }
  
  private async applyProductionHaltEffect(crisisEvent: CrisisEvent, effect: CrisisEffect): Promise<void> {
    const { affectedSystems = [] } = effect.parameters;
    
    // Update affected teams' production status
    for (const teamId of crisisEvent.affectedTeams) {
      await teamDataService.updateTeam(teamId, {
        productionHalted: true,
        haltedSystems: affectedSystems,
        productionResumeTime: Date.now() + effect.duration
      } as any);
    }
    
    // Schedule production resume
    setTimeout(async () => {
      for (const teamId of crisisEvent.affectedTeams) {
        await teamDataService.updateTeam(teamId, {
          productionHalted: false,
          haltedSystems: [],
          productionResumeTime: null
        } as any);
      }
    }, effect.duration);
  }
  
  private async applyCommunicationLossEffect(crisisEvent: CrisisEvent, effect: CrisisEffect): Promise<void> {
    // Disable team chat for affected teams
    for (const teamId of crisisEvent.affectedTeams) {
      await realtimeService.updateTeamStatus(crisisEvent.sessionId, teamId, {
        communicationEnabled: false,
        communicationResumeTime: Date.now() + effect.duration
      });
    }
    
    // Re-enable after duration
    setTimeout(async () => {
      for (const teamId of crisisEvent.affectedTeams) {
        await realtimeService.updateTeamStatus(crisisEvent.sessionId, teamId, {
          communicationEnabled: true,
          communicationResumeTime: null
        });
      }
    }, effect.duration);
  }
  
  private async applyRandomDamageEffect(crisisEvent: CrisisEvent, effect: CrisisEffect): Promise<void> {
    const { severity = 1 } = effect.parameters;
    
    for (const teamId of crisisEvent.affectedTeams) {
      // Random damage to 1-3 resource types
      const resourceTypes: (keyof Resources)[] = ['oxygen', 'food', 'water', 'energy', 'minerals', 'tech'];
      const affectedCount = Math.min(3, Math.floor(Math.random() * 3) + 1);
      const affectedResources = resourceTypes
        .sort(() => Math.random() - 0.5)
        .slice(0, affectedCount);
      
      const damageResources: Partial<Resources> = {};
      
      for (const resource of affectedResources) {
        // Damage based on severity (1-5 units per severity level)
        const damage = Math.floor(Math.random() * 5 + 1) * severity;
        damageResources[resource] = damage;
      }
      
      await this.deductResources(teamId, damageResources);
    }
  }
  
  // Helper methods for resolution effects
  private async applyRewardEffect(effect: CrisisReward, teamId: string): Promise<void> {
    switch (effect.type) {
      case 'resource_bonus':
        if (effect.parameters.resources) {
          const team = await teamDataService.getTeam(teamId);
          if (team) {
            const updatedResources: Partial<Resources> = {};
            for (const [resource, amount] of Object.entries(effect.parameters.resources)) {
              const current = team.resources[resource as keyof Resources] || 0;
              updatedResources[resource as keyof Resources] = current + (amount || 0);
            }
            await teamDataService.updateTeamResources(teamId, updatedResources);
          }
        }
        break;
        
      case 'trading_advantage':
        // Store trading advantage in team data
        await teamDataService.updateTeam(teamId, {
          tradingAdvantages: [{
            type: effect.parameters.advantage || 'general',
            expiresAt: Date.now() + (effect.parameters.duration || 300000) // Default 5 min
          }]
        } as any);
        break;
        
      case 'immunity':
        // Mark team as immune to next crisis
        await teamDataService.updateTeam(teamId, {
          crisisImmunity: {
            active: true,
            expiresAt: Date.now() + (effect.parameters.duration || 600000) // Default 10 min
          }
        } as any);
        break;
        
      case 'tech_advancement':
        // Increase tech resources significantly
        const team = await teamDataService.getTeam(teamId);
        if (team) {
          await teamDataService.updateTeamResources(teamId, {
            tech: (team.resources.tech || 0) + 10
          });
        }
        break;
    }
  }
  
  private async applyPenaltyEffect(effect: CrisisPenalty, teamId: string): Promise<void> {
    switch (effect.type) {
      case 'resource_loss':
        if (effect.parameters.resources) {
          await this.deductResources(teamId, effect.parameters.resources);
        }
        break;
        
      case 'trading_penalty':
        // Apply trading restrictions
        await teamDataService.updateTeam(teamId, {
          tradingPenalties: [{
            severity: effect.parameters.severity || 1,
            expiresAt: Date.now() + (effect.parameters.duration || 300000)
          }]
        } as any);
        break;
        
      case 'system_damage':
        // Reduce production efficiency
        await teamDataService.updateTeam(teamId, {
          systemDamage: {
            severity: effect.parameters.severity || 1,
            repairedAt: Date.now() + (effect.parameters.duration || 600000)
          }
        } as any);
        break;
        
      case 'elimination_risk':
        // Mark team as at risk
        await teamDataService.updateTeam(teamId, {
          eliminationRisk: true,
          riskLevel: effect.parameters.severity || 1
        } as any);
        break;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.eventGenerationInterval) {
      clearInterval(this.eventGenerationInterval);
    }
    EventSystemService.instances.delete(this.config.sessionId);
  }
}