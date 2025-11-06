/**
 * AI Behavior Pattern Service
 * 
 * Ensures AI behavior remains consistent with personality over time while
 * allowing for realistic learning and adaptation patterns.
 */

import type {
  AIPersonalityType,
  AIDecision,
  AIMemory,
  AITradeHistory
} from '../types/ai.types';
import type {
  Colony,
  TradeOffer,
  Resources
} from '../types';
import type {
  PersonalityProfile,
  PersonalityTraits,
  EmotionalState,
  RelationshipStatus
} from './aiPersonalityService';

/**
 * Behavior pattern metrics
 */
export interface BehaviorPatterns {
  tradingFrequency: number;        // Trades per round
  averageResponseTime: number;     // Milliseconds
  riskProfile: number;            // 0-1, calculated from trade sizes
  cooperationIndex: number;       // 0-1, win-win vs zero-sum ratio
  adaptabilityScore: number;      // How much behavior changes over time
  consistencyScore: number;       // How predictable the AI is
  emotionalStability: number;     // How much emotions affect decisions
  memoryInfluence: number;        // How much past affects current decisions
}

/**
 * Behavior change event
 */
export interface BehaviorChangeEvent {
  timestamp: number;
  trigger: 'success' | 'failure' | 'stress' | 'learning' | 'relationship';
  oldPattern: Partial<BehaviorPatterns>;
  newPattern: Partial<BehaviorPatterns>;
  magnitude: number; // 0-1, how significant the change was
  personality: AIPersonalityType;
}

/**
 * Trait drift tracking
 */
export interface TraitDrift {
  trait: keyof PersonalityTraits;
  originalValue: number;
  currentValue: number;
  maxDrift: number;
  driftRate: number; // Change per positive/negative experience
  lastChange: number;
}

/**
 * Service for maintaining consistent AI behavior patterns
 */
export class AIBehaviorPatternService {
  private behaviorPatterns: Map<string, BehaviorPatterns> = new Map();
  private traitDrifts: Map<string, Map<keyof PersonalityTraits, TraitDrift>> = new Map();
  private behaviorHistory: Map<string, BehaviorChangeEvent[]> = new Map();
  private lastDecisionTimes: Map<string, number> = new Map();

  /**
   * Initialize behavior patterns for an AI colony
   */
  initializeBehaviorPatterns(
    colonyId: string,
    personality: PersonalityProfile
  ): BehaviorPatterns {
    const patterns: BehaviorPatterns = {
      tradingFrequency: this.calculateBaseTradingFrequency(personality.traits),
      averageResponseTime: this.calculateBaseResponseTime(personality.traits),
      riskProfile: personality.traits.risktaking,
      cooperationIndex: personality.traits.cooperativeness,
      adaptabilityScore: personality.traits.adaptability,
      consistencyScore: 1.0 - personality.traits.adaptability * 0.5,
      emotionalStability: 1.0 - personality.traits.aggressiveness * 0.3,
      memoryInfluence: 0.7 + personality.traits.grudgeHolding === 'vengeful' ? 0.3 : 
                      personality.traits.grudgeHolding === 'forgiving' ? -0.2 : 0
    };

    this.behaviorPatterns.set(colonyId, patterns);
    
    // Initialize trait drift tracking
    this.initializeTraitDrift(colonyId, personality.traits);
    
    return patterns;
  }

  /**
   * Get current behavior patterns for decision making
   */
  getCurrentBehaviorPatterns(colonyId: string): BehaviorPatterns | null {
    return this.behaviorPatterns.get(colonyId) || null;
  }

  /**
   * Update behavior patterns based on recent actions
   */
  updateBehaviorFromDecision(
    colonyId: string,
    decision: AIDecision,
    outcome: 'beneficial' | 'neutral' | 'detrimental',
    personality: PersonalityProfile
  ): void {
    const patterns = this.behaviorPatterns.get(colonyId);
    if (!patterns) return;

    const timestamp = Date.now();
    
    // Track decision timing
    const lastDecisionTime = this.lastDecisionTimes.get(colonyId) || timestamp;
    const responseTime = timestamp - lastDecisionTime;
    this.lastDecisionTimes.set(colonyId, timestamp);

    // Update response time pattern
    const alpha = 0.1; // Learning rate
    patterns.averageResponseTime = patterns.averageResponseTime * (1 - alpha) + responseTime * alpha;

    // Update patterns based on decision type and outcome
    this.updatePatternsFromDecision(patterns, decision, outcome, personality.traits);

    // Update trait drift
    this.updateTraitDrift(colonyId, decision, outcome, personality.traits);

    // Check for significant behavior changes
    this.detectBehaviorChanges(colonyId, patterns, personality);
  }

  /**
   * Calculate behavior consistency with personality
   */
  calculateConsistencyScore(
    colonyId: string,
    recentDecisions: AIDecision[],
    personality: PersonalityProfile
  ): number {
    if (recentDecisions.length === 0) return 1.0;

    const patterns = this.behaviorPatterns.get(colonyId);
    if (!patterns) return 0.5;

    let consistencySum = 0;
    let weightSum = 0;

    // Check each decision for consistency with personality
    recentDecisions.forEach((decision, index) => {
      const weight = Math.pow(0.9, recentDecisions.length - index - 1); // Recent decisions weighted more
      const consistency = this.evaluateDecisionConsistency(decision, personality.traits);
      
      consistencySum += consistency * weight;
      weightSum += weight;
    });

    return weightSum > 0 ? consistencySum / weightSum : 1.0;
  }

  /**
   * Get expected behavior for a given situation
   */
  getExpectedBehavior(
    colonyId: string,
    situationType: 'trade_offer' | 'trade_initiation' | 'emergency' | 'routine',
    context: {
      partner?: Colony;
      resources?: Partial<Resources>;
      urgency?: 'low' | 'medium' | 'high';
    }
  ): {
    expectedDecision: 'accept' | 'reject' | 'counter' | 'initiate' | 'wait';
    confidence: number;
    responseTimeRange: { min: number; max: number };
    reasoning: string[];
  } {
    const patterns = this.behaviorPatterns.get(colonyId);
    if (!patterns) {
      return {
        expectedDecision: 'wait',
        confidence: 0.5,
        responseTimeRange: { min: 2000, max: 5000 },
        reasoning: ['No behavior patterns available']
      };
    }

    // Determine expected decision based on patterns and situation
    let expectedDecision: 'accept' | 'reject' | 'counter' | 'initiate' | 'wait' = 'wait';
    let confidence = 0.5;
    const reasoning: string[] = [];

    switch (situationType) {
      case 'trade_offer':
        if (patterns.cooperationIndex > 0.7) {
          expectedDecision = 'accept';
          confidence = patterns.cooperationIndex;
          reasoning.push('High cooperation tendency');
        } else if (patterns.riskProfile < 0.3) {
          expectedDecision = 'reject';
          confidence = 1 - patterns.riskProfile;
          reasoning.push('Risk-averse behavior');
        } else {
          expectedDecision = 'counter';
          confidence = patterns.adaptabilityScore;
          reasoning.push('Moderate risk tolerance, likely to negotiate');
        }
        break;

      case 'trade_initiation':
        if (patterns.tradingFrequency > 0.7) {
          expectedDecision = 'initiate';
          confidence = patterns.tradingFrequency;
          reasoning.push('High trading frequency');
        } else {
          expectedDecision = 'wait';
          confidence = 1 - patterns.tradingFrequency;
          reasoning.push('Low trading frequency');
        }
        break;

      case 'emergency':
        expectedDecision = 'initiate';
        confidence = 0.9;
        reasoning.push('Emergency situation overrides normal behavior');
        break;

      case 'routine':
        if (patterns.tradingFrequency > 0.5) {
          expectedDecision = 'initiate';
          confidence = patterns.tradingFrequency;
        } else {
          expectedDecision = 'wait';
          confidence = 1 - patterns.tradingFrequency;
        }
        reasoning.push('Routine decision based on trading frequency');
        break;
    }

    // Adjust for urgency
    let responseMultiplier = 1.0;
    if (context.urgency === 'high') {
      responseMultiplier = 0.5;
      reasoning.push('High urgency reduces response time');
    } else if (context.urgency === 'low') {
      responseMultiplier = 1.5;
      reasoning.push('Low urgency increases deliberation time');
    }

    // Calculate response time range
    const baseTime = patterns.averageResponseTime;
    const responseTimeRange = {
      min: Math.max(500, baseTime * 0.7 * responseMultiplier),
      max: baseTime * 1.3 * responseMultiplier
    };

    return {
      expectedDecision,
      confidence,
      responseTimeRange,
      reasoning
    };
  }

  /**
   * Analyze long-term behavior evolution
   */
  analyzeBehaviorEvolution(colonyId: string): {
    stabilityScore: number;
    growthAreas: string[];
    regressionAreas: string[];
    personalityDrift: Array<{
      trait: string;
      originalValue: number;
      currentValue: number;
      change: number;
    }>;
  } {
    const traitDrifts = this.traitDrifts.get(colonyId);
    const behaviorChanges = this.behaviorHistory.get(colonyId) || [];

    if (!traitDrifts) {
      return {
        stabilityScore: 1.0,
        growthAreas: [],
        regressionAreas: [],
        personalityDrift: []
      };
    }

    // Calculate stability score
    const recentChanges = behaviorChanges.filter(
      change => Date.now() - change.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    const changeMagnitude = recentChanges.reduce(
      (sum, change) => sum + change.magnitude, 0
    ) / Math.max(recentChanges.length, 1);
    
    const stabilityScore = Math.max(0, 1 - changeMagnitude);

    // Identify growth and regression areas
    const growthAreas: string[] = [];
    const regressionAreas: string[] = [];

    recentChanges.forEach(change => {
      if (change.trigger === 'success' || change.trigger === 'learning') {
        if (change.magnitude > 0.1) {
          growthAreas.push(`Improved after ${change.trigger}`);
        }
      } else if (change.trigger === 'failure' || change.trigger === 'stress') {
        if (change.magnitude > 0.1) {
          regressionAreas.push(`Declined due to ${change.trigger}`);
        }
      }
    });

    // Calculate personality drift
    const personalityDrift = Array.from(traitDrifts.entries()).map(([trait, drift]) => ({
      trait: trait as string,
      originalValue: drift.originalValue,
      currentValue: drift.currentValue,
      change: drift.currentValue - drift.originalValue
    }));

    return {
      stabilityScore,
      growthAreas,
      regressionAreas,
      personalityDrift
    };
  }

  /**
   * Private helper methods
   */

  private calculateBaseTradingFrequency(traits: PersonalityTraits): number {
    return Math.min(1.0, traits.aggressiveness * 0.6 + traits.risktaking * 0.3 + 
                    (traits.socialPreference === 'networker' ? 0.3 : 0));
  }

  private calculateBaseResponseTime(traits: PersonalityTraits): number {
    let baseTime = 3000; // 3 seconds

    switch (traits.decisionSpeed) {
      case 'impulsive':
        baseTime *= 0.5;
        break;
      case 'thoughtful':
        baseTime *= 1.0;
        break;
      case 'deliberate':
        baseTime *= 1.8;
        break;
      case 'analytical':
        baseTime *= 1.4;
        break;
    }

    // Add personality modifiers
    baseTime *= (1 + traits.patience * 0.5);
    baseTime *= (1 - traits.aggressiveness * 0.3);

    return baseTime;
  }

  private initializeTraitDrift(colonyId: string, traits: PersonalityTraits): void {
    const drifts = new Map<keyof PersonalityTraits, TraitDrift>();

    const numericTraits: (keyof PersonalityTraits)[] = [
      'aggressiveness', 'risktaking', 'cooperativeness', 'adaptability',
      'patience', 'greed', 'trustingness'
    ];

    numericTraits.forEach(trait => {
      const value = traits[trait] as number;
      drifts.set(trait, {
        trait,
        originalValue: value,
        currentValue: value,
        maxDrift: 0.3, // Maximum 30% change from original
        driftRate: 0.01, // 1% change per significant experience
        lastChange: Date.now()
      });
    });

    this.traitDrifts.set(colonyId, drifts);
  }

  private updatePatternsFromDecision(
    patterns: BehaviorPatterns,
    decision: AIDecision,
    outcome: 'beneficial' | 'neutral' | 'detrimental',
    _traits: PersonalityTraits
  ): void {
    const alpha = 0.05; // Learning rate for pattern updates

    // Update cooperation index based on decision type and outcome
    if (decision.type === 'accept_trade' && outcome === 'beneficial') {
      patterns.cooperationIndex = Math.min(1.0, patterns.cooperationIndex + alpha);
    } else if (decision.type === 'reject_trade' && outcome !== 'detrimental') {
      patterns.cooperationIndex = Math.max(0.0, patterns.cooperationIndex - alpha * 0.5);
    }

    // Update risk profile based on outcomes
    if (outcome === 'beneficial' && decision.confidence > 0.8) {
      patterns.riskProfile = Math.min(1.0, patterns.riskProfile + alpha * 0.5);
    } else if (outcome === 'detrimental') {
      patterns.riskProfile = Math.max(0.0, patterns.riskProfile - alpha);
    }

    // Update trading frequency
    if (decision.type === 'initiate_trade' || decision.type === 'accept_trade') {
      patterns.tradingFrequency = Math.min(1.0, patterns.tradingFrequency + alpha * 0.3);
    } else if (decision.type === 'wait') {
      patterns.tradingFrequency = Math.max(0.0, patterns.tradingFrequency - alpha * 0.2);
    }

    // Emotional stability decreases with bad outcomes
    if (outcome === 'detrimental') {
      patterns.emotionalStability = Math.max(0.0, patterns.emotionalStability - alpha * 2);
    } else if (outcome === 'beneficial') {
      patterns.emotionalStability = Math.min(1.0, patterns.emotionalStability + alpha * 0.5);
    }
  }

  private updateTraitDrift(
    colonyId: string,
    decision: AIDecision,
    outcome: 'beneficial' | 'neutral' | 'detrimental'
  ): void {
    const drifts = this.traitDrifts.get(colonyId);
    if (!drifts) return;

    const now = Date.now();
    const significantExperience = outcome !== 'neutral' && decision.confidence > 0.7;

    if (!significantExperience) return;

    // Update relevant traits based on experience
    const experienceValue = outcome === 'beneficial' ? 1 : -1;

    // Aggressiveness changes based on trading success
    if (decision.type === 'initiate_trade' || decision.type === 'accept_trade') {
      this.updateTraitValue(drifts, 'aggressiveness', experienceValue * 0.5);
    }

    // Risk-taking changes based on risky decision outcomes
    if (decision.confidence < 0.6) { // Risky decision
      this.updateTraitValue(drifts, 'risktaking', experienceValue);
    }

    // Cooperativeness changes based on mutual benefit
    if (decision.type === 'accept_trade' && outcome === 'beneficial') {
      this.updateTraitValue(drifts, 'cooperativeness', experienceValue * 0.3);
    }

    // Trustingness changes based on partner reliability
    if (decision.targetColonyId) {
      this.updateTraitValue(drifts, 'trustingness', experienceValue * 0.2);
    }

    // Update last change times
    drifts.forEach(drift => {
      if (drift.currentValue !== drift.originalValue) {
        drift.lastChange = now;
      }
    });
  }

  private updateTraitValue(
    drifts: Map<keyof PersonalityTraits, TraitDrift>,
    trait: keyof PersonalityTraits,
    experienceValue: number
  ): void {
    const drift = drifts.get(trait);
    if (!drift) return;

    const change = experienceValue * drift.driftRate;
    const newValue = drift.currentValue + change;

    // Enforce drift limits
    const maxValue = Math.min(1.0, drift.originalValue + drift.maxDrift);
    const minValue = Math.max(0.0, drift.originalValue - drift.maxDrift);

    drift.currentValue = Math.max(minValue, Math.min(maxValue, newValue));
  }

  private evaluateDecisionConsistency(
    decision: AIDecision,
    traits: PersonalityTraits
  ): number {
    let consistency = 1.0;

    // Check if decision aligns with aggressiveness
    if (traits.aggressiveness > 0.7 && decision.type === 'wait') {
      consistency *= 0.7;
    } else if (traits.aggressiveness < 0.3 && decision.type === 'initiate_trade') {
      consistency *= 0.8;
    }

    // Check if decision aligns with risk tolerance
    if (traits.risktaking < 0.3 && decision.confidence < 0.5) {
      consistency *= 0.6;
    } else if (traits.risktaking > 0.7 && decision.confidence < 0.7) {
      consistency *= 0.8;
    }

    // Check cooperation alignment
    if (traits.cooperativeness > 0.7 && decision.type === 'reject_trade') {
      consistency *= 0.7;
    }

    return Math.max(0, Math.min(1, consistency));
  }

  private detectBehaviorChanges(
    colonyId: string,
    patterns: BehaviorPatterns,
    personality: PersonalityProfile
  ): void {
    const history = this.behaviorHistory.get(colonyId) || [];
    
    // Get previous patterns for comparison
    const recentChanges = history.filter(
      change => Date.now() - change.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (recentChanges.length === 0) return;

    const lastChange = recentChanges[recentChanges.length - 1];
    
    // Calculate magnitude of change
    const changeMagnitude = this.calculatePatternChange(
      lastChange.newPattern as BehaviorPatterns,
      patterns
    );

    if (changeMagnitude > 0.1) { // Significant change threshold
      const changeEvent: BehaviorChangeEvent = {
        timestamp: Date.now(),
        trigger: this.determineTrigger(patterns, personality),
        oldPattern: lastChange.newPattern,
        newPattern: { ...patterns },
        magnitude: changeMagnitude,
        personality: personality.type
      };

      history.push(changeEvent);
      
      // Keep only recent history
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }
      
      this.behaviorHistory.set(colonyId, history);
    }
  }

  private calculatePatternChange(
    oldPatterns: BehaviorPatterns,
    newPatterns: BehaviorPatterns
  ): number {
    const keys: (keyof BehaviorPatterns)[] = [
      'tradingFrequency', 'riskProfile', 'cooperationIndex',
      'adaptabilityScore', 'emotionalStability'
    ];

    let totalChange = 0;
    keys.forEach(key => {
      const change = Math.abs((newPatterns[key] || 0) - (oldPatterns[key] || 0));
      totalChange += change;
    });

    return totalChange / keys.length;
  }

  private determineTrigger(
    patterns: BehaviorPatterns,
    personality: PersonalityProfile
  ): 'success' | 'failure' | 'stress' | 'learning' | 'relationship' {
    if (patterns.emotionalStability < 0.4) return 'stress';
    if (patterns.cooperationIndex > personality.traits.cooperativeness + 0.2) return 'success';
    if (patterns.riskProfile < personality.traits.risktaking - 0.2) return 'failure';
    if (patterns.adaptabilityScore > personality.traits.adaptability + 0.1) return 'learning';
    return 'relationship';
  }
}

// Export singleton instance
export const aiBehaviorPatternService = new AIBehaviorPatternService();