import { 
  doc,
  getDoc,
  collection,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  Colony, 
  TradeOffer, 
  Resources, 
  ColonyType,
  GameSession 
} from '../types';
import type { 
  AIColonyConfig, 
  AIColonyState, 
  AIDecision, 
  AIEvaluation,
  AIMemory,
  TradeEvaluation,
  AIStrategy,
  AIDifficulty
} from '../types/ai.types';
import { RESOURCE_CONSUMPTION } from '../types';
import { TradingService } from './tradingService';
import { AIStrategyService } from './aiStrategyService';
import { aiPersonalityService, PersonalityProfile } from './aiPersonalityService';
import { aiBehaviorPatternService } from './aiBehaviorPatternService';

export class AIColonyService {
  private static instances: Map<string, AIColonyService> = new Map();
  private aiStates: Map<string, AIColonyState> = new Map();
  private unsubscribers: (() => void)[] = [];
  private decisionTimers: Map<string, NodeJS.Timeout> = new Map();
  private strategyService: AIStrategyService;
  private personalityProfiles: Map<string, PersonalityProfile> = new Map();
  private crossGalaxyMemory: Map<string, any> = new Map();

  private constructor(
    private sessionId: string,
    private aiConfigs: AIColonyConfig[],
    strategyService?: AIStrategyService
  ) {
    // Accept strategy service as dependency or create new instance
    this.strategyService = strategyService || new AIStrategyService();
  }

  static getInstance(
    sessionId: string, 
    aiConfigs: AIColonyConfig[],
    strategyService?: AIStrategyService
  ): AIColonyService {
    const key = `${sessionId}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new AIColonyService(sessionId, aiConfigs, strategyService));
    }
    return this.instances.get(key)!;
  }

  /**
   * Initialize AI colonies and start monitoring
   */
  async initialize(session: GameSession): Promise<void> {
    try {
      // Initialize AI states for configured colonies
      for (const team of session.teams) {
        const aiConfig = this.aiConfigs.find(c => c.colonyId === team.id);
        if (aiConfig && aiConfig.isAIControlled) {
          await this.initializeAIColony(team, aiConfig);
        }
      }

      // Subscribe to game state changes
      this.subscribeToGameState();
      
      // Subscribe to trade offers
      this.subscribeToTradeOffers();

      console.log(`AI Colony Service initialized for session ${this.sessionId}`);
    } catch (error) {
      console.error('Error initializing AI Colony Service:', error);
      throw error;
    }
  }

  /**
   * Initialize a single AI colony
   */
  private async initializeAIColony(colony: Colony, config: AIColonyConfig): Promise<void> {
    // Load existing personality profile or generate new one
    let personalityProfile = await this.loadPersonalityProfile(colony.id);
    
    if (!personalityProfile) {
      const personalityType = config.personality || 'balanced_player';
      personalityProfile = aiPersonalityService.generatePersonality(
        colony.id,
        colony.type,
        personalityType,
        config.difficulty
      );
    } else {
      // Import existing personality into service
      aiPersonalityService.importPersonality(colony.id, personalityProfile);
    }
    
    this.personalityProfiles.set(colony.id, personalityProfile);
    
    // Initialize behavior patterns
    aiBehaviorPatternService.initializeBehaviorPatterns(colony.id, personalityProfile);
    
    // Get strategy for this colony type
    const strategy = this.strategyService.getStrategy(colony.type, config.difficulty);
    
    // Apply personality adjustments to strategy parameters
    strategy.parameters = aiPersonalityService.getPersonalityAdjustedParameters(
      colony.id,
      strategy.parameters
    );
    
    // Apply any strategy overrides from config
    if (config.strategyOverrides) {
      Object.assign(strategy.parameters, config.strategyOverrides);
    }

    // Initialize memory
    const memory: AIMemory = {
      colonyId: colony.id,
      tradingHistory: [],
      trustScores: {},
      lastDecisions: [],
      resourceTrends: []
    };

    // Load existing memory if available
    const existingMemory = await this.loadAIMemory(colony.id);
    if (existingMemory) {
      Object.assign(memory, existingMemory);
    }

    // Create initial evaluation
    const evaluation = this.evaluateColonyState(colony);

    // Create AI state
    const aiState: AIColonyState = {
      colony,
      config,
      strategy,
      memory,
      currentEvaluation: evaluation,
      isProcessing: false,
      lastDecisionTime: Date.now(),
      nextDecisionTime: Date.now() + this.getRandomDelay(strategy.parameters.decisionDelayMs)
    };

    this.aiStates.set(colony.id, aiState);

    // Schedule first decision
    this.scheduleNextDecision(colony.id);
  }

  /**
   * Subscribe to game state changes
   */
  private subscribeToGameState(): void {
    const unsubscribe = onSnapshot(
      doc(firestore, 'sessions', this.sessionId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        
        const session = snapshot.data() as GameSession;
        
        // Update AI colony states with latest data
        for (const team of session.teams) {
          const aiState = this.aiStates.get(team.id);
          if (aiState) {
            aiState.colony = team;
            aiState.currentEvaluation = this.evaluateColonyState(team);
            
            // Check for emergency situations
            if (this.isEmergencySituation(team, aiState.strategy.parameters)) {
              this.makeEmergencyDecision(team.id);
            }
          }
        }
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Subscribe to trade offers
   */
  private subscribeToTradeOffers(): void {
    const unsubscribe = onSnapshot(
      collection(firestore, 'sessions', this.sessionId, 'trades'),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const trade = { id: change.doc.id, ...change.doc.data() } as TradeOffer;
            
            // Check if any AI colony is involved
            for (const [colonyId] of Array.from(this.aiStates.entries())) {
              if (trade.targetId === colonyId && trade.status === 'pending') {
                // AI colony received a trade offer
                this.evaluateIncomingTrade(colonyId, trade);
              }
            }
          }
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Evaluate colony state and calculate scores
   */
  private evaluateColonyState(colony: Colony): AIEvaluation {
    const resources = colony.resources;
    
    // Calculate resource score (weighted by colony priorities)
    let resourceScore = 0;
    let totalWeight = 0;
    
    const strategy = this.aiStates.get(colony.id)?.strategy;
    const priorities = strategy?.parameters.resourcePriorities || this.getDefaultPriorities(colony.type);
    
    for (const [resource, amount] of Object.entries(resources)) {
      if (typeof amount === 'number' && resource in priorities) {
        const priority = priorities[resource as keyof typeof priorities];
        resourceScore += (amount / 10) * priority; // Normalize by 10
        totalWeight += priority;
      }
    }
    
    resourceScore = totalWeight > 0 ? resourceScore / totalWeight : 0;

    // Calculate survival probability
    const survivalProbability = this.calculateSurvivalProbability(colony);
    
    // Calculate trading efficiency (simplified for now)
    const tradingEfficiency = 0.5; // TODO: Calculate based on trading history
    
    // Calculate strategic position
    const strategicPosition = this.calculateStrategicPosition(colony);
    
    // Overall score
    const overallScore = (
      resourceScore * 0.3 +
      survivalProbability * 0.4 +
      tradingEfficiency * 0.1 +
      strategicPosition * 0.2
    );

    return {
      resourceScore,
      survivalProbability,
      tradingEfficiency,
      strategicPosition,
      overallScore
    };
  }

  /**
   * Calculate survival probability based on resources
   */
  private calculateSurvivalProbability(colony: Colony): number {
    const resources = colony.resources;
    const consumption = RESOURCE_CONSUMPTION;
    
    // Calculate rounds of survival for each critical resource
    const oxygenRounds = Math.floor(resources.oxygen / consumption.oxygen);
    const foodRounds = Math.floor(resources.food / consumption.food);
    const waterRounds = Math.floor(resources.water / consumption.water);
    const energyRounds = Math.floor(resources.energy / consumption.energy);
    
    const minRounds = Math.min(oxygenRounds, foodRounds, waterRounds, energyRounds);
    
    // Convert to probability (5 rounds = 100%, 0 rounds = 0%)
    return Math.min(minRounds / 5, 1);
  }

  /**
   * Calculate strategic position score
   */
  private calculateStrategicPosition(colony: Colony): number {
    let score = 0;
    
    // Credits provide flexibility
    score += Math.min(colony.resources.credits / 2000, 0.3);
    
    // Specialty resources for the colony type
    switch (colony.type) {
      case 'mining':
        score += Math.min(colony.resources.minerals / 30, 0.4);
        break;
      case 'agricultural':
        score += Math.min((colony.resources.food + colony.resources.water) / 40, 0.4);
        break;
      case 'research':
        score += Math.min(colony.resources.techComponents / 20, 0.4);
        break;
      case 'military':
        score += Math.min(colony.resources.defenseContracts / 20, 0.4);
        break;
      case 'manufacturing':
        score += Math.min(colony.resources.alloys / 20, 0.4);
        break;
      case 'trade_hub':
        // Trade hubs benefit from diverse resources
        const resourceTypes = Object.values(colony.resources).filter(v => typeof v === 'number' && v > 0).length;
        score += Math.min(resourceTypes / 10, 0.4);
        break;
    }
    
    // Intel provides strategic advantage
    const marketIntel = Array.isArray(colony.resources.marketIntel) ? colony.resources.marketIntel : [];
    const surveyReports = Array.isArray(colony.resources.surveyReports) ? colony.resources.surveyReports : [];
    const crisisWarnings = Array.isArray(colony.resources.crisisWarnings) ? colony.resources.crisisWarnings : [];
    const totalIntel = marketIntel.length + surveyReports.length + crisisWarnings.length;
    score += Math.min(totalIntel / 10, 0.3);
    
    return score;
  }

  /**
   * Check if colony is in emergency situation
   */
  private isEmergencySituation(colony: Colony, params: any): boolean {
    const resources = colony.resources;
    const consumption = RESOURCE_CONSUMPTION;
    const threshold = params.emergencyThreshold || 1.5;
    
    return (
      resources.oxygen < consumption.oxygen * threshold ||
      resources.food < consumption.food * threshold ||
      resources.water < consumption.water * threshold ||
      resources.energy < consumption.energy * threshold
    );
  }

  /**
   * Make emergency trading decision
   */
  private async makeEmergencyDecision(colonyId: string): Promise<void> {
    const aiState = this.aiStates.get(colonyId);
    if (!aiState || aiState.isProcessing) return;
    
    aiState.isProcessing = true;
    
    try {
      const decision: AIDecision = {
        type: 'emergency_trade',
        confidence: 0.9,
        reasoning: ['Critical resource shortage detected', 'Initiating emergency trade']
      };
      
      // Find what resources are critical
      const criticalNeeds = this.identifyCriticalNeeds(aiState.colony);
      
      // Find potential trading partners
      const partners = await this.findTradingPartners(aiState.colony, criticalNeeds);
      
      if (partners.length > 0) {
        // Create trade offer with first available partner
        const partner = partners[0];
        const offer = this.createEmergencyOffer(aiState.colony, partner, criticalNeeds);
        
        if (offer) {
          decision.targetColonyId = partner.id;
          decision.offerResources = offer.offer;
          decision.requestResources = offer.request;
          
          // Execute trade
          await this.executeTrade(aiState.colony, decision);
        }
      }
      
      // Update memory and personality learning
      aiState.memory.lastDecisions.push(decision);
      if (aiState.memory.lastDecisions.length > 10) {
        aiState.memory.lastDecisions.shift();
      }
      
      // Update personality based on experience
      this.updatePersonalityFromTrade(colonyId, decision);
      
    } finally {
      aiState.isProcessing = false;
    }
  }

  /**
   * Schedule next AI decision
   */
  private scheduleNextDecision(colonyId: string): void {
    const aiState = this.aiStates.get(colonyId);
    if (!aiState) return;
    
    // Clear existing timer
    const existingTimer = this.decisionTimers.get(colonyId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const delay = aiState.nextDecisionTime - Date.now();
    
    const timer = setTimeout(() => {
      this.makeRoutineDecision(colonyId);
    }, Math.max(delay, 0));
    
    this.decisionTimers.set(colonyId, timer);
  }

  /**
   * Make routine trading decision
   */
  private async makeRoutineDecision(colonyId: string): Promise<void> {
    const aiState = this.aiStates.get(colonyId);
    if (!aiState || aiState.isProcessing) return;
    
    aiState.isProcessing = true;
    
    try {
      // Evaluate current situation
      const evaluation = this.evaluateColonyState(aiState.colony);
      aiState.currentEvaluation = evaluation;
      
      // Decide on action
      const decision = await this.decideAction(aiState);
      
      // Execute decision
      if (decision.type !== 'wait') {
        await this.executeTrade(aiState.colony, decision);
      }
      
      // Update memory
      aiState.memory.lastDecisions.push(decision);
      if (aiState.memory.lastDecisions.length > 10) {
        aiState.memory.lastDecisions.shift();
      }
      
      // Schedule next decision
      aiState.lastDecisionTime = Date.now();
      aiState.nextDecisionTime = Date.now() + this.getRandomDelay(aiState.strategy.parameters.decisionDelayMs);
      
    } finally {
      aiState.isProcessing = false;
      this.scheduleNextDecision(colonyId);
    }
  }

  /**
   * Decide on trading action with galaxy awareness
   */
  private async decideAction(aiState: AIColonyState): Promise<AIDecision> {
    const { colony, strategy, currentEvaluation } = aiState;
    
    // Adjust decision based on galaxy size
    const adjustedStrategy = this.adjustStrategyForGalaxySize(strategy);
    
    // Small galaxy emergency behavior
    if (currentEvaluation.survivalProbability < 0.6) {
      // In small galaxies, be more proactive about survival
      return this.makeSmallGalaxyEmergencyDecision(aiState);
    }
    
    // Large galaxy competitive behavior
    if (currentEvaluation.overallScore > 0.6 && 
        Math.random() > (adjustedStrategy.parameters.tradingAggressiveness)) {
      // Less likely to wait in large galaxies
      const opportunities = await this.identifyTradingOpportunities(colony, adjustedStrategy);
      if (opportunities.length > 0) {
        return this.selectBestOpportunityForLargeGalaxy(opportunities);
      }
    }
    
    // Standard decision making
    if (currentEvaluation.overallScore > 0.8 && Math.random() > adjustedStrategy.parameters.tradingAggressiveness) {
      return {
        type: 'wait',
        confidence: 0.7,
        reasoning: ['Colony in good position', 'No immediate trading needs']
      };
    }
    
    // Identify trading opportunities
    const opportunities = await this.identifyTradingOpportunities(colony, adjustedStrategy);
    
    if (opportunities.length === 0) {
      return {
        type: 'wait',
        confidence: 0.5,
        reasoning: ['No suitable trading opportunities found']
      };
    }
    
    // Select best opportunity based on galaxy context
    const bestOpportunity = this.selectOpportunityByGalaxyContext(opportunities);
    
    return {
      type: 'initiate_trade',
      targetColonyId: bestOpportunity.partnerId,
      offerResources: bestOpportunity.offer,
      requestResources: bestOpportunity.request,
      confidence: bestOpportunity.confidence,
      reasoning: bestOpportunity.reasoning
    };
  }

  /**
   * Evaluate incoming trade offer
   */
  private async evaluateIncomingTrade(colonyId: string, trade: TradeOffer): Promise<void> {
    const aiState = this.aiStates.get(colonyId);
    if (!aiState || aiState.isProcessing) return;
    
    // Check personality-based partner preferences
    const partnerColony = await this.getColonyById(trade.initiatorId);
    if (partnerColony) {
      const partnerCheck = aiPersonalityService.shouldTradeWithPartner(
        colonyId,
        trade.initiatorId,
        partnerColony.type
      );
      
      if (!partnerCheck.willing) {
        // Reject trade based on personality preferences
        setTimeout(async () => {
          await this.executeTradeResponse(aiState.colony, {
            type: 'reject_trade',
            tradeId: trade.id,
            confidence: 0.8,
            reasoning: [partnerCheck.reason]
          });
        }, 1000); // Quick rejection
        return;
      }
    }
    
    // Add personality-based thinking delay
    const delay = aiPersonalityService.getDecisionDelay(colonyId, 'moderate');
    
    setTimeout(async () => {
      aiState.isProcessing = true;
      
      try {
        const evaluation = this.evaluateTrade(aiState.colony, trade, aiState.strategy);
        
        let decision: AIDecision;
        
        if (evaluation.acceptability === 'accept') {
          decision = {
            type: 'accept_trade',
            tradeId: trade.id,
            confidence: evaluation.score,
            reasoning: evaluation.reasons
          };
        } else if (evaluation.acceptability === 'counter' && evaluation.counterOffer) {
          decision = {
            type: 'counter_trade',
            tradeId: trade.id,
            offerResources: evaluation.counterOffer.offerResources,
            requestResources: evaluation.counterOffer.requestResources,
            confidence: 0.7,
            reasoning: evaluation.reasons
          };
        } else {
          decision = {
            type: 'reject_trade',
            tradeId: trade.id,
            confidence: Math.abs(evaluation.score),
            reasoning: evaluation.reasons
          };
        }
        
        // Execute decision
        await this.executeTradeResponse(aiState.colony, decision);
        
        // Update memory
        aiState.memory.lastDecisions.push(decision);
        
      } finally {
        aiState.isProcessing = false;
      }
    }, delay);
  }

  /**
   * Evaluate a trade offer
   */
  private evaluateTrade(colony: Colony, trade: TradeOffer, strategy: AIStrategy): TradeEvaluation {
    const reasons: string[] = [];
    let score = 0;
    
    // Check if we can afford to give requested resources
    const canAfford = this.canAffordTrade(colony, trade.requestResources, strategy.parameters);
    if (!canAfford) {
      reasons.push('Cannot afford requested resources');
      return {
        tradeId: trade.id,
        score: -1,
        acceptability: 'reject',
        reasons
      };
    }
    
    // Calculate value of offered vs requested resources
    const offeredValue = this.calculateResourceValue(trade.offerResources, colony, strategy);
    const requestedValue = this.calculateResourceValue(trade.requestResources, colony, strategy);
    
    const valueRatio = offeredValue / (requestedValue || 1);
    score = (valueRatio - 1) * 0.5; // Convert to -0.5 to 0.5 range
    
    // Adjust for trust
    const trustScore = colony.id in (this.aiStates.get(colony.id)?.memory.trustScores || {}) 
      ? this.aiStates.get(colony.id)!.memory.trustScores[trade.initiatorId] 
      : 0.5;
    score += (trustScore - 0.5) * 0.2;
    
    // Adjust for current needs
    const needsScore = this.evaluateNeedsAlignment(colony, trade.offerResources, strategy);
    score += needsScore * 0.3;
    
    // Determine acceptability
    let acceptability: 'accept' | 'reject' | 'counter';
    if (score > 0.2) {
      acceptability = 'accept';
      reasons.push('Trade offers good value');
    } else if (score > -0.2 && strategy.parameters.tradingAggressiveness > 0.5) {
      acceptability = 'counter';
      reasons.push('Trade has potential, making counter offer');
      
      // Generate counter offer
      const counterOffer = this.generateCounterOffer(colony, trade, strategy);
      return {
        tradeId: trade.id,
        score,
        acceptability,
        reasons,
        counterOffer
      };
    } else {
      acceptability = 'reject';
      reasons.push('Trade does not meet value requirements');
    }
    
    return {
      tradeId: trade.id,
      score,
      acceptability,
      reasons
    };
  }

  /**
   * Execute trading decision
   */
  private async executeTrade(colony: Colony, decision: AIDecision): Promise<void> {
    if (!decision.targetColonyId || !decision.offerResources || !decision.requestResources) {
      return;
    }
    
    try {
      await TradingService.createTradeOffer(
        this.sessionId,
        colony.id,
        decision.targetColonyId,
        decision.offerResources,
        decision.requestResources
      );
    } catch (error) {
      console.error('AI failed to create trade offer:', error);
    }
  }

  /**
   * Execute trade response (accept/reject/counter)
   */
  private async executeTradeResponse(colony: Colony, decision: AIDecision): Promise<void> {
    if (!decision.tradeId) return;
    
    try {
      // Use Firebase Function for server-side validation
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase/config');
      
      const executeAITradeFunction = httpsCallable(functions, 'aiTradeExecution');
      
      const requestData = {
        sessionId: this.sessionId,
        tradeId: decision.tradeId,
        aiColonyId: colony.id,
        action: decision.type === 'accept_trade' ? 'accept' : 
                decision.type === 'reject_trade' ? 'reject' : 'counter',
        counterOffer: decision.type === 'counter_trade' ? {
          offerResources: decision.offerResources || {},
          requestResources: decision.requestResources || {}
        } : undefined
      };
      
      const result = await executeAITradeFunction(requestData);
      const resultData = result.data as { success: boolean; message: string };
      
      if (!resultData.success) {
        console.error('AI trade execution failed:', resultData.message);
      } else {
        console.log('AI trade executed successfully:', resultData.message);
      }
      
    } catch (error) {
      console.error('AI failed to respond to trade:', error);
      
      // Fallback to direct service calls if function fails
      try {
        switch (decision.type) {
          case 'accept_trade':
            await TradingService.acceptTradeOffer(this.sessionId, decision.tradeId, colony.id);
            break;
            
          case 'reject_trade':
            await TradingService.rejectTradeOffer(this.sessionId, decision.tradeId, colony.id);
            break;
            
          case 'counter_trade':
            if (decision.offerResources && decision.requestResources) {
              // First reject the original offer
              await TradingService.rejectTradeOffer(this.sessionId, decision.tradeId, colony.id);
              
              // Then create a new counter offer
              // Get the original trade to find the initiator
              const tradeDoc = await getDoc(doc(firestore, 'sessions', this.sessionId, 'trades', decision.tradeId));
              if (tradeDoc.exists()) {
                const originalTrade = tradeDoc.data() as TradeOffer;
                await TradingService.createTradeOffer(
                  this.sessionId,
                  colony.id,
                  originalTrade.initiatorId,
                  decision.offerResources,
                  decision.requestResources
                );
              }
            }
            break;
        }
      } catch (fallbackError) {
        console.error('AI trade fallback also failed:', fallbackError);
      }
    }
  }

  /**
   * Helper methods
   */
  
  private getRandomDelay(delayRange: { min: number; max: number }): number {
    return delayRange.min + Math.random() * (delayRange.max - delayRange.min);
  }

  private getDefaultPriorities(colonyType: ColonyType): any {
    // Return default priorities based on colony type
    const basePriorities = {
      oxygen: 0.9,
      food: 0.9,
      water: 0.9,
      energy: 0.8,
      credits: 0.5
    };
    
    // Add colony-specific priorities
    switch (colonyType) {
      case 'mining':
        return { ...basePriorities, minerals: 0.7, alloys: 0.6 };
      case 'agricultural':
        return { ...basePriorities, food: 1.0, water: 1.0 };
      case 'research':
        return { ...basePriorities, techComponents: 0.8, techPatents: 0.7 };
      case 'military':
        return { ...basePriorities, defenseContracts: 0.8 };
      case 'manufacturing':
        return { ...basePriorities, alloys: 0.8, minerals: 0.6 };
      case 'trade_hub':
        return { ...basePriorities, credits: 0.8 };
      default:
        return basePriorities;
    }
  }

  private identifyCriticalNeeds(colony: Colony): Partial<Resources> {
    const needs: Partial<Resources> = {};
    const consumption = RESOURCE_CONSUMPTION;
    
    if (colony.resources.oxygen < consumption.oxygen * 2) {
      needs.oxygen = consumption.oxygen * 3;
    }
    if (colony.resources.food < consumption.food * 2) {
      needs.food = consumption.food * 3;
    }
    if (colony.resources.water < consumption.water * 2) {
      needs.water = consumption.water * 3;
    }
    if (colony.resources.energy < consumption.energy * 2) {
      needs.energy = consumption.energy * 3;
    }
    
    return needs;
  }

  private async findTradingPartners(colony: Colony, needs: Partial<Resources>): Promise<Colony[]> {
    // Get current session
    const sessionDoc = await getDoc(doc(firestore, 'sessions', this.sessionId));
    if (!sessionDoc.exists()) return [];
    
    const session = sessionDoc.data() as GameSession;
    const partners: Colony[] = [];
    
    // Find colonies that might have what we need
    for (const team of session.teams) {
      if (team.id === colony.id) continue;
      if (team.tradingStatus !== 'available') continue;
      
      // Check if they have surplus of what we need
      let hasNeededResources = false;
      for (const [resource, amount] of Object.entries(needs)) {
        const resourceValue = team.resources[resource as keyof Resources];
        if (typeof resourceValue === 'number' && resourceValue > (amount as number) * 2) {
          hasNeededResources = true;
          break;
        }
      }
      
      if (hasNeededResources) {
        partners.push(team);
      }
    }
    
    return partners;
  }

  private createEmergencyOffer(colony: Colony, _partner: Colony, needs: Partial<Resources>): { offer: Partial<Resources>; request: Partial<Resources> } | null {
    const offer: Partial<Resources> = {};
    const request: Partial<Resources> = {};
    
    // Request what we need
    for (const [resource, amount] of Object.entries(needs)) {
      const resourceKey = resource as keyof Resources;
      if (typeof amount === 'number' && typeof colony.resources[resourceKey] === 'number') {
        (request as any)[resourceKey] = amount;
      }
    }
    
    // Offer what we can spare or what partner might want
    if (typeof colony.resources.credits === 'number' && colony.resources.credits > 500) {
      offer.credits = Math.min(colony.resources.credits * 0.5, 1000);
    }
    
    // Offer specialty resources if we have excess
    switch (colony.type) {
      case 'mining':
        if (typeof colony.resources.minerals === 'number' && colony.resources.minerals > 10) {
          offer.minerals = Math.floor(colony.resources.minerals * 0.3);
        }
        break;
      case 'research':
        if (typeof colony.resources.techComponents === 'number' && colony.resources.techComponents > 8) {
          offer.techComponents = Math.floor(colony.resources.techComponents * 0.3);
        }
        break;
      // Add other colony types...
    }
    
    // Make sure we're offering something
    if (Object.keys(offer).length === 0) {
      return null;
    }
    
    return { offer, request };
  }

  private canAffordTrade(colony: Colony, requestedResources: Partial<Resources>, params: any): boolean {
    const minBuffer = params.minResourceBuffer || 2.0;
    const consumption = RESOURCE_CONSUMPTION;
    
    for (const [resource, amount] of Object.entries(requestedResources)) {
      if (typeof amount !== 'number') continue;
      
      const currentAmount = colony.resources[resource as keyof Resources];
      if (typeof currentAmount !== 'number') continue;
      
      // Check critical resources
      if (resource in consumption) {
        const consumptionRate = consumption[resource as keyof typeof consumption];
        const afterTrade = currentAmount - amount;
        if (afterTrade < consumptionRate * minBuffer) {
          return false;
        }
      } else {
        // Non-critical resources - just check we have enough
        if (currentAmount < amount) {
          return false;
        }
      }
    }
    
    return true;
  }

  private calculateResourceValue(resources: Partial<Resources>, colony: Colony, strategy: AIStrategy): number {
    let totalValue = 0;
    const priorities = strategy.parameters.resourcePriorities;
    
    for (const [resource, amount] of Object.entries(resources)) {
      if (typeof amount !== 'number') continue;
      
      const priority = priorities[resource as keyof typeof priorities] || 0.5;
      const scarcityMultiplier = this.getScarcityMultiplier(colony, resource as keyof Resources);
      
      totalValue += amount * priority * scarcityMultiplier;
    }
    
    return totalValue;
  }

  private getScarcityMultiplier(colony: Colony, resource: keyof Resources): number {
    const currentAmount = colony.resources[resource];
    if (typeof currentAmount !== 'number') return 1;
    
    // More scarce = higher multiplier
    if (currentAmount === 0) return 3;
    if (currentAmount < 5) return 2;
    if (currentAmount < 10) return 1.5;
    if (currentAmount > 30) return 0.5;
    
    return 1;
  }

  private evaluateNeedsAlignment(colony: Colony, offeredResources: Partial<Resources>, _strategy: AIStrategy): number {
    let alignmentScore = 0;
    let totalOffered = 0;
    
    for (const [resource, amount] of Object.entries(offeredResources)) {
      if (typeof amount !== 'number') continue;
      
      const currentAmount = colony.resources[resource as keyof Resources];
      if (typeof currentAmount !== 'number') continue;
      
      // Check if this resource is needed
      const scarcity = this.getScarcityMultiplier(colony, resource as keyof Resources);
      alignmentScore += amount * (scarcity - 1);
      totalOffered += amount;
    }
    
    return totalOffered > 0 ? alignmentScore / totalOffered : 0;
  }

  private generateCounterOffer(_colony: Colony, originalTrade: TradeOffer, _strategy: AIStrategy): { offerResources: Partial<Resources>; requestResources: Partial<Resources> } {
    // Start with a modified version of the original trade
    const counterOffer = {
      offerResources: { ...originalTrade.requestResources },
      requestResources: { ...originalTrade.offerResources }
    };
    
    // Adjust quantities based on our valuation
    for (const [resource, amount] of Object.entries(counterOffer.requestResources)) {
      if (typeof amount === 'number') {
        // Reduce requested amount by 20-30%
        (counterOffer.requestResources as any)[resource] = Math.floor(amount * (0.7 + Math.random() * 0.1));
      }
    }
    
    return counterOffer;
  }

  private async identifyTradingOpportunities(colony: Colony, strategy: AIStrategy): Promise<any[]> {
    const opportunities: any[] = [];
    
    // Get current session
    const sessionDoc = await getDoc(doc(firestore, 'sessions', this.sessionId));
    if (!sessionDoc.exists()) return opportunities;
    
    const session = sessionDoc.data() as GameSession;
    
    // Identify what we need and what we can offer
    const needs = this.identifyNeeds(colony, strategy);
    const surplus = this.identifySurplus(colony, strategy);
    
    if (Object.keys(needs).length === 0 || Object.keys(surplus).length === 0) {
      return opportunities;
    }
    
    // Check each potential partner
    for (const partner of session.teams) {
      if (partner.id === colony.id) continue;
      if (partner.tradingStatus !== 'available') continue;
      
      // Check if partner has what we need and might want what we have
      const opportunity = this.evaluatePartnerOpportunity(colony, partner, needs, surplus, strategy);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    }
    
    // Sort by confidence
    opportunities.sort((a, b) => b.confidence - a.confidence);
    
    return opportunities.slice(0, 3); // Return top 3 opportunities
  }

  private identifyNeeds(colony: Colony, strategy: AIStrategy): Partial<Resources> {
    const needs: Partial<Resources> = {};
    const priorities = strategy.parameters.resourcePriorities;
    
    for (const [resource, priority] of Object.entries(priorities)) {
      if (priority < 0.3) continue; // Skip low priority resources
      
      const currentAmount = colony.resources[resource as keyof Resources];
      if (typeof currentAmount !== 'number') continue;
      
      // Determine target amount based on resource type
      let targetAmount = 10; // Default
      if (resource in RESOURCE_CONSUMPTION) {
        targetAmount = RESOURCE_CONSUMPTION[resource as keyof typeof RESOURCE_CONSUMPTION] * 5;
      }
      
      if (currentAmount < targetAmount * 0.7) {
        (needs as any)[resource] = targetAmount - currentAmount;
      }
    }
    
    return needs;
  }

  private identifySurplus(colony: Colony, strategy: AIStrategy): Partial<Resources> {
    const surplus: Partial<Resources> = {};
    const maxTradeSize = strategy.parameters.maxTradeSize || 0.3;
    
    for (const [resource, amount] of Object.entries(colony.resources)) {
      if (typeof amount !== 'number' || amount === 0) continue;
      
      // Determine if we have surplus
      let targetReserve = 5; // Default
      if (resource in RESOURCE_CONSUMPTION) {
        targetReserve = RESOURCE_CONSUMPTION[resource as keyof typeof RESOURCE_CONSUMPTION] * strategy.parameters.minResourceBuffer;
      }
      
      if (amount > targetReserve * 1.5) {
        const surplusAmount = amount - targetReserve;
        (surplus as any)[resource] = Math.floor(surplusAmount * maxTradeSize);
      }
    }
    
    return surplus;
  }

  private evaluatePartnerOpportunity(
    _colony: Colony, 
    partner: Colony, 
    needs: Partial<Resources>, 
    surplus: Partial<Resources>,
    _strategy: AIStrategy
  ): any | null {
    // Check if partner has what we need
    const partnerCanProvide: Partial<Resources> = {};
    const weCanProvide: Partial<Resources> = {};
    
    for (const [resource, neededAmount] of Object.entries(needs)) {
      const partnerAmount = partner.resources[resource as keyof Resources];
      if (typeof partnerAmount === 'number' && partnerAmount > (neededAmount as number)) {
        (partnerCanProvide as any)[resource] = Math.min(
          neededAmount as number,
          Math.floor(partnerAmount * 0.3)
        );
      }
    }
    
    if (Object.keys(partnerCanProvide).length === 0) {
      return null;
    }
    
    // Check what we can offer that partner might want
    // This is simplified - in reality we'd analyze partner's needs
    for (const [resource, surplusAmount] of Object.entries(surplus)) {
      if (typeof surplusAmount === 'number' && surplusAmount > 0) {
        (weCanProvide as any)[resource] = surplusAmount;
      }
    }
    
    if (Object.keys(weCanProvide).length === 0) {
      return null;
    }
    
    // Calculate confidence based on how well needs align
    const confidence = Math.min(
      Object.keys(partnerCanProvide).length / Object.keys(needs).length,
      1
    ) * 0.8;
    
    return {
      partnerId: partner.id,
      offer: weCanProvide,
      request: partnerCanProvide,
      confidence,
      reasoning: [
        `Partner has ${Object.keys(partnerCanProvide).length} needed resources`,
        `We can offer ${Object.keys(weCanProvide).length} resources in exchange`
      ]
    };
  }

  private async loadAIMemory(colonyId: string): Promise<AIMemory | null> {
    try {
      const memoryDoc = await getDoc(doc(firestore, 'aiMemory', `${this.sessionId}_${colonyId}`));
      if (memoryDoc.exists()) {
        return memoryDoc.data() as AIMemory;
      }
    } catch (error) {
      console.error('Error loading AI memory:', error);
    }
    return null;
  }

  private async saveAIMemory(colonyId: string, memory: AIMemory): Promise<void> {
    try {
      await setDoc(
        doc(firestore, 'aiMemory', `${this.sessionId}_${colonyId}`),
        memory
      );
    } catch (error) {
      console.error('Error saving AI memory:', error);
    }
  }

  /**
   * Get colony by ID from current session
   */
  private async getColonyById(colonyId: string): Promise<Colony | null> {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.sessionId));
      if (!sessionDoc.exists()) return null;
      
      const session = sessionDoc.data() as GameSession;
      return session.teams.find(team => team.id === colonyId) || null;
    } catch (error) {
      console.error('Error getting colony by ID:', error);
      return null;
    }
  }

  /**
   * Save personality profile for persistence
   */
  private async savePersonalityProfile(colonyId: string, profile: PersonalityProfile): Promise<void> {
    try {
      await setDoc(
        doc(firestore, 'aiPersonalities', `${this.sessionId}_${colonyId}`),
        {
          ...profile,
          relationships: Array.from(profile.relationships.entries()).map(([id, rel]) => ({ id, ...rel }))
        }
      );
    } catch (error) {
      console.error('Error saving AI personality profile:', error);
    }
  }

  /**
   * Load personality profile from storage
   */
  private async loadPersonalityProfile(colonyId: string): Promise<PersonalityProfile | null> {
    try {
      const profileDoc = await getDoc(doc(firestore, 'aiPersonalities', `${this.sessionId}_${colonyId}`));
      if (profileDoc.exists()) {
        const data = profileDoc.data() as any;
        // Convert relationships array back to Map
        const relationships = new Map(
          (data.relationships || []).map((rel: any) => [rel.id, rel])
        );
        return {
          ...data,
          relationships
        } as PersonalityProfile;
      }
    } catch (error) {
      console.error('Error loading AI personality profile:', error);
    }
    return null;
  }

  /**
   * Update personality learning from trade decision
   */
  private updatePersonalityFromTrade(colonyId: string, decision: AIDecision): void {
    const aiState = this.aiStates.get(colonyId);
    const personalityProfile = this.personalityProfiles.get(colonyId);
    if (!aiState || !personalityProfile) return;

    // Convert decision to trade history entry for personality learning
    if (decision.type === 'accept_trade' || decision.type === 'initiate_trade') {
      const outcome: 'beneficial' | 'neutral' | 'detrimental' = 
        decision.confidence > 0.7 ? 'beneficial' : 
        decision.confidence > 0.3 ? 'neutral' : 'detrimental';

      const tradeHistory: AITradeHistory = {
        tradeId: decision.tradeId || `decision_${Date.now()}`,
        partnerId: decision.targetColonyId || '',
        timestamp: Date.now(),
        offered: decision.offerResources || {},
        received: decision.requestResources || {},
        outcome,
        trustImpact: (decision.confidence - 0.5) * 0.2
      };

      // Add to memory
      aiState.memory.tradingHistory.push(tradeHistory);
      
      // Keep only recent history
      if (aiState.memory.tradingHistory.length > 50) {
        aiState.memory.tradingHistory = aiState.memory.tradingHistory.slice(-50);
      }

      // Update personality service with new experience
      aiPersonalityService.updatePersonalityFromExperience(
        colonyId,
        aiState.memory.tradingHistory,
        1 // TODO: Get actual current round
      );

      // Update behavior patterns
      aiBehaviorPatternService.updateBehaviorFromDecision(
        colonyId,
        decision,
        outcome,
        personalityProfile
      );
    }
  }

  /**
   * Get AI personality description for UI
   */
  getAIPersonalityDescription(colonyId: string): string {
    return aiPersonalityService.getPersonalityDescription(colonyId);
  }

  /**
   * Get AI personality profile
   */
  getAIPersonalityProfile(colonyId: string): PersonalityProfile | null {
    return this.personalityProfiles.get(colonyId) || null;
  }

  /**
   * Get AI behavior analysis for monitoring/debugging
   */
  getAIBehaviorAnalysis(colonyId: string): {
    personality: string;
    currentPatterns: any;
    consistencyScore: number;
    behaviorEvolution: any;
  } | null {
    const personalityProfile = this.personalityProfiles.get(colonyId);
    const aiState = this.aiStates.get(colonyId);
    
    if (!personalityProfile || !aiState) return null;

    const patterns = aiBehaviorPatternService.getCurrentBehaviorPatterns(colonyId);
    const consistencyScore = aiBehaviorPatternService.calculateConsistencyScore(
      colonyId,
      aiState.memory.lastDecisions.slice(-10),
      personalityProfile
    );
    const behaviorEvolution = aiBehaviorPatternService.analyzeBehaviorEvolution(colonyId);

    return {
      personality: aiPersonalityService.getPersonalityDescription(colonyId),
      currentPatterns: patterns,
      consistencyScore,
      behaviorEvolution
    };
  }

  /**
   * Pause all AI decision making
   */
  pauseAll(): void {
    // Clear all decision timers
    for (const [colonyId, timer] of this.decisionTimers) {
      clearTimeout(timer);
    }
    this.decisionTimers.clear();
    
    // Mark all AI states as paused
    for (const [colonyId, state] of this.aiStates) {
      state.isPaused = true;
      state.pausedAt = Date.now();
    }
  }
  
  /**
   * Resume all AI decision making
   */
  resumeAll(): void {
    for (const [colonyId, state] of this.aiStates) {
      if (state.isPaused) {
        state.isPaused = false;
        
        // Adjust next decision time based on pause duration
        const pauseDuration = Date.now() - (state.pausedAt || 0);
        state.nextDecisionTime = (state.nextDecisionTime || Date.now()) + pauseDuration;
        
        // Reschedule decision
        this.scheduleNextDecision(colonyId);
      }
    }
  }
  
  /**
   * Force immediate decisions for all AI colonies
   */
  async forceAllDecisions(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [colonyId, state] of this.aiStates) {
      if (!state.isProcessing && state.config?.isAIControlled && !state.isPaused) {
        // Set next decision time to now
        state.nextDecisionTime = Date.now();
        
        // Trigger immediate decision
        promises.push(this.makeRoutineDecision(colonyId));
      }
    }
    
    await Promise.all(promises);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all timers
    for (const timer of Array.from(this.decisionTimers.values())) {
      clearTimeout(timer);
    }
    this.decisionTimers.clear();
    
    // Unsubscribe from all listeners
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    
    // Save AI memory and personality profiles
    for (const [colonyId, aiState] of Array.from(this.aiStates.entries())) {
      this.saveAIMemory(colonyId, aiState.memory);
      
      // Save personality profile
      const personality = this.personalityProfiles.get(colonyId);
      if (personality) {
        this.savePersonalityProfile(colonyId, personality);
      }
    }
    
    // Clear states
    this.aiStates.clear();
    this.personalityProfiles.clear();
    
    // Remove from instances
    AIColonyService.instances.delete(this.sessionId);
  }

  /**
   * Get galaxy context for a colony
   */
  private async getGalaxyContext(
    galaxyId?: string
  ): Promise<{ totalTeams: number; humanTeams: number; aiTeams: number }> {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.sessionId));
      if (!sessionDoc.exists()) {
        return { totalTeams: 6, humanTeams: 4, aiTeams: 2 }; // Default
      }
      
      const session = sessionDoc.data() as GameSession;
      
      // Filter teams by galaxy if galaxyId provided
      const relevantTeams = galaxyId 
        ? session.teams.filter(team => team.id.includes(galaxyId) || team.galaxyId === galaxyId)
        : session.teams;
      
      const aiTeams = relevantTeams.filter(team => 
        this.aiConfigs.some(config => config.colonyId === team.id)
      ).length;
      
      return {
        totalTeams: relevantTeams.length,
        humanTeams: relevantTeams.length - aiTeams,
        aiTeams
      };
    } catch (error) {
      console.error('Error getting galaxy context:', error);
      return { totalTeams: 6, humanTeams: 4, aiTeams: 2 }; // Default
    }
  }

  /**
   * Adjust strategy based on galaxy size
   */
  private adjustStrategyForGalaxySize(
    baseStrategy: AIStrategy,
    galaxyContext?: { totalTeams: number; humanTeams: number; aiTeams: number }
  ): AIStrategy {
    if (!galaxyContext) return baseStrategy;
    
    const adjustedStrategy = { ...baseStrategy };
    const params = { ...baseStrategy.parameters };
    
    if (galaxyContext.totalTeams <= 3) {
      // Small galaxy adjustments
      params.tradingAggressiveness *= 0.8;
      params.minResourceBuffer *= 1.2;
      params.trustFactor *= 1.3;
      params.emergencyThreshold *= 1.2;
    } else if (galaxyContext.totalTeams >= 10) {
      // Large galaxy adjustments
      params.tradingAggressiveness *= 1.2;
      params.minResourceBuffer *= 0.8;
      params.maxTradeSize *= 1.2;
      params.riskTolerance *= 1.3;
    }
    
    // Adjust for AI/Human ratio
    const aiRatio = galaxyContext.aiTeams / galaxyContext.totalTeams;
    if (aiRatio > 0.5) {
      // Majority AI - can be more competitive
      params.trustFactor *= 0.8;
      params.tradingAggressiveness *= 1.1;
    } else if (aiRatio < 0.2) {
      // Few AI - need to be more cooperative with humans
      params.trustFactor *= 1.2;
      params.tradingAggressiveness *= 0.9;
    }
    
    adjustedStrategy.parameters = params;
    return adjustedStrategy;
  }

  /**
   * Make emergency decision for small galaxies
   */
  private async makeSmallGalaxyEmergencyDecision(
    aiState: AIColonyState,
    galaxyContext: { totalTeams: number; humanTeams: number; aiTeams: number }
  ): Promise<AIDecision> {
    const { colony } = aiState;
    
    // In small galaxies, cooperation is key
    const criticalNeeds = this.identifyCriticalNeeds(colony);
    const allPartners = await this.findTradingPartners(colony, criticalNeeds);
    
    // Prioritize human partners in small galaxies
    const humanPartners = allPartners.filter(partner => 
      !this.aiConfigs.some(config => config.colonyId === partner.id)
    );
    
    const partners = humanPartners.length > 0 ? humanPartners : allPartners;
    
    if (partners.length > 0) {
      const partner = partners[0];
      
      // More generous offers in small galaxies
      const offer = this.createCooperativeOffer(colony, partner, criticalNeeds);
      
      if (offer) {
        return {
          type: 'initiate_trade',
          targetColonyId: partner.id,
          offerResources: offer.offer,
          requestResources: offer.request,
          confidence: 0.9,
          reasoning: [
            'Small galaxy requires cooperation',
            'Emergency trade for survival',
            `Only ${galaxyContext.totalTeams} teams in galaxy`
          ]
        };
      }
    }
    
    return {
      type: 'wait',
      confidence: 0.3,
      reasoning: ['No viable partners in small galaxy']
    };
  }

  /**
   * Select best opportunity for large galaxy
   */
  private selectBestOpportunityForLargeGalaxy(
    opportunities: any[],
    galaxyContext: { totalTeams: number; humanTeams: number; aiTeams: number }
  ): any {
    // In large galaxies, prioritize efficiency and competition
    const scoredOpportunities = opportunities.map(opp => {
      let score = opp.confidence;
      
      // Bonus for trading with weaker partners
      const partnerStrength = this.estimatePartnerStrength(opp.partnerId);
      if (partnerStrength < 0.5) {
        score *= 1.2; // Exploit weaker positions
      }
      
      // Penalty for generous offers in large galaxies
      const generosity = this.calculateOfferGenerosity(opp.offer, opp.request);
      if (generosity > 0.2) {
        score *= 0.8; // Be less generous
      }
      
      return { ...opp, adjustedScore: score };
    });
    
    // Sort by adjusted score
    scoredOpportunities.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    return scoredOpportunities[0];
  }

  /**
   * Select opportunity based on galaxy context
   */
  private selectOpportunityByGalaxyContext(
    opportunities: any[],
    galaxyContext?: { totalTeams: number; humanTeams: number; aiTeams: number }
  ): any {
    if (!galaxyContext || opportunities.length === 1) {
      return opportunities[0];
    }
    
    // Apply context-based scoring
    const scoredOpportunities = opportunities.map(opp => {
      let score = opp.confidence;
      
      // Adjust based on partner type
      const isAIPartner = this.aiConfigs.some(config => config.colonyId === opp.partnerId);
      
      if (galaxyContext.totalTeams <= 5) {
        // Small galaxy - prefer human partners
        if (!isAIPartner) score *= 1.3;
      } else if (galaxyContext.totalTeams >= 10) {
        // Large galaxy - no preference
        // But consider competition level
        if (isAIPartner && galaxyContext.aiTeams > galaxyContext.humanTeams) {
          score *= 0.9; // Slight penalty for AI-AI trades in AI-heavy galaxies
        }
      }
      
      return { ...opp, adjustedScore: score };
    });
    
    // Sort by adjusted score
    scoredOpportunities.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    return scoredOpportunities[0];
  }

  /**
   * Create cooperative offer for small galaxies
   */
  private createCooperativeOffer(
    colony: Colony,
    partner: Colony,
    needs: Partial<Resources>
  ): { offer: Partial<Resources>; request: Partial<Resources> } | null {
    const offer: Partial<Resources> = {};
    const request: Partial<Resources> = {};
    
    // Request only what's critically needed
    for (const [resource, amount] of Object.entries(needs)) {
      if (typeof amount === 'number') {
        (request as any)[resource] = Math.min(amount, 5); // Smaller requests
      }
    }
    
    // Offer more generously
    const surplusResources = this.identifySurplus(colony, this.strategyService.getStrategy(colony.type, 'medium'));
    
    for (const [resource, amount] of Object.entries(surplusResources)) {
      if (typeof amount === 'number' && amount > 0) {
        // Offer up to 50% more than usual in small galaxies
        (offer as any)[resource] = Math.floor(amount * 1.5);
      }
    }
    
    // Always include some credits if possible
    if (colony.resources.credits > 200) {
      offer.credits = Math.min(300, colony.resources.credits * 0.3);
    }
    
    return Object.keys(offer).length > 0 ? { offer, request } : null;
  }

  /**
   * Estimate partner strength (simplified)
   */
  private estimatePartnerStrength(partnerId: string): number {
    // This would analyze partner's resource levels, trading history, etc.
    // For now, return a random estimate
    return Math.random();
  }

  /**
   * Calculate offer generosity
   */
  private calculateOfferGenerosity(offer: Partial<Resources>, request: Partial<Resources>): number {
    const offerValue = this.calculateResourceValue(
      offer, 
      { resources: {} } as Colony, 
      this.strategyService.getStrategy('trade_hub', 'medium')
    );
    
    const requestValue = this.calculateResourceValue(
      request,
      { resources: {} } as Colony,
      this.strategyService.getStrategy('trade_hub', 'medium')
    );
    
    return requestValue > 0 ? (offerValue - requestValue) / requestValue : 0;
  }

  /**
   * Get cross-galaxy coordination data
   */
  getCrossGalaxyData(colonyId: string): any {
    return this.crossGalaxyMemory.get(colonyId) || null;
  }

  /**
   * Update cross-galaxy coordination data
   */
  updateCrossGalaxyData(colonyId: string, data: any): void {
    this.crossGalaxyMemory.set(colonyId, data);
  }
}