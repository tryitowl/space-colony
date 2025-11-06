import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  GameSession, 
  Colony, 
  TradeOffer, 
  Resources,
  GameEventLog 
} from '../types/game';

// Analytics Types
export interface PerformanceMetrics {
  sessionId: string;
  teamId: string;
  teamName: string;
  colonyType: string;
  finalScore: number;
  componentScores: {
    resourceScore: number;
    tradingScore: number;
    survivalScore: number;
    efficiencyScore: number;
    strategicScore: number;
  };
  tradingMetrics: {
    totalTrades: number;
    avgTradeValue: number;
    tradingEfficiency: number;
    favoriteResource: string;
    tradingPartners: string[];
    negotiationSuccess: number;
  };
  resourceMetrics: {
    resourceUtilization: number;
    wasteRate: number;
    criticalMoments: number;
    resourceDiversity: number;
    endgameResources: Partial<Resources>;
  };
  behavioralMetrics: {
    decisionSpeed: number;
    riskTolerance: number;
    cooperationIndex: number;
    adaptabilityScore: number;
    communicationFrequency: number;
  };
  achievements: Achievement[];
  criticalEvents: CriticalEvent[];
}

export interface BehavioralAnalysis {
  sessionId: string;
  generatedAt: number;
  teamBehaviors: TeamBehaviorProfile[];
  interactionPatterns: InteractionPattern[];
  emergentStrategies: EmergentStrategy[];
  groupDynamics: GroupDynamics;
  learningCurves: LearningCurve[];
  recommendationsForFacilitator: FacilitatorRecommendation[];
}

export interface TeamBehaviorProfile {
  teamId: string;
  teamName: string;
  personalityType: PersonalityType;
  playStyle: PlayStyle;
  strengths: string[];
  developmentAreas: string[];
  leadership: LeadershipProfile;
  collaboration: CollaborationProfile;
}

export type PersonalityType = 
  | 'analytical' 
  | 'diplomatic' 
  | 'competitive' 
  | 'conservative' 
  | 'innovative' 
  | 'collaborative';

export type PlayStyle = 
  | 'aggressive_trader' 
  | 'resource_hoarder' 
  | 'strategic_planner' 
  | 'opportunistic' 
  | 'risk_averse' 
  | 'social_leader';

export interface LeadershipProfile {
  emergentLeader: boolean;
  leadershipStyle: 'directive' | 'participative' | 'delegative' | 'transformational';
  influenceRadius: number; // How many teams they influenced
  decisionMakingSpeed: number;
  conflictResolution: number;
}

export interface CollaborationProfile {
  preferredPartners: string[];
  collaborationFrequency: number;
  trustLevel: number; // Based on repeat interactions
  mutualBenefit: number; // How often trades benefited both parties
  helpfulness: number; // Times they helped others in crisis
}

export interface InteractionPattern {
  pattern: 'alliance_formation' | 'trade_clustering' | 'resource_specialization' | 'isolation' | 'market_manipulation';
  participants: string[];
  frequency: number;
  impact: 'positive' | 'neutral' | 'negative';
  description: string;
  emergenceTime: number; // When this pattern first appeared
}

export interface EmergentStrategy {
  strategy: string;
  description: string;
  adoptedBy: string[];
  effectiveness: number;
  conditions: string[];
  outcomes: string[];
}

export interface GroupDynamics {
  cohesion: number;
  conflictLevel: number;
  communicationEffectiveness: number;
  equalParticipation: number;
  emergentLeadership: string[];
  subgroups: TeamAlliance[];
}

export interface TeamAlliance {
  members: string[];
  formationTime: number;
  strength: number;
  purpose: 'trading' | 'mutual_aid' | 'strategic' | 'competitive';
  duration: number;
}

export interface LearningCurve {
  teamId: string;
  metric: 'trading_efficiency' | 'resource_management' | 'strategic_thinking' | 'negotiation';
  progression: number[]; // Values over time
  improvementRate: number;
  plateauPoint?: number;
}

export interface FacilitatorRecommendation {
  category: 'team_development' | 'process_improvement' | 'conflict_resolution' | 'engagement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: string[];
  actionItems: string[];
  teamsFocus?: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'trading' | 'survival' | 'strategy' | 'collaboration' | 'innovation';
  rarity: 'common' | 'rare' | 'legendary';
  icon: string;
  criteria: AchievementCriteria;
}

export interface AchievementCriteria {
  type: 'threshold' | 'comparison' | 'completion' | 'behavior';
  metric: string;
  value: number;
  comparison?: 'greater' | 'less' | 'equal';
}

export interface CriticalEvent {
  timestamp: number;
  round: number;
  type: 'near_elimination' | 'major_comeback' | 'strategic_breakthrough' | 'alliance_formation';
  description: string;
  impact: number;
  resolution: string;
}

export interface AnalyticsConfig {
  sessionId: string;
  enableRealTimeAnalytics: boolean;
  trackBehavioralMetrics: boolean;
  generateRecommendations: boolean;
  detailLevel: 'basic' | 'detailed' | 'comprehensive';
}

export class AnalyticsService {
  private static instances: Map<string, AnalyticsService> = new Map();
  private config: AnalyticsConfig;
  private sessionData: GameSession | null = null;
  private allTrades: TradeOffer[] = [];
  private gameEvents: GameEventLog[] = [];

  private constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  static getInstance(sessionId: string, config?: Partial<AnalyticsConfig>): AnalyticsService {
    if (!AnalyticsService.instances.has(sessionId)) {
      if (!config) {
        throw new Error(`AnalyticsService instance for session ${sessionId} not found`);
      }
      
      const fullConfig: AnalyticsConfig = {
        sessionId,
        enableRealTimeAnalytics: true,
        trackBehavioralMetrics: true,
        generateRecommendations: true,
        detailLevel: 'detailed',
        ...config
      };

      AnalyticsService.instances.set(sessionId, new AnalyticsService(fullConfig));
    }
    
    return AnalyticsService.instances.get(sessionId)!;
  }

  /**
   * Generate complete performance metrics for all teams
   */
  async generatePerformanceMetrics(): Promise<PerformanceMetrics[]> {
    try {
      await this.loadSessionData();
      
      const metrics: PerformanceMetrics[] = [];
      
      for (const team of this.sessionData!.teams) {
        const teamMetrics = await this.calculateTeamMetrics(team);
        metrics.push(teamMetrics);
      }

      // Store metrics for future reference
      await addDoc(collection(firestore, 'analytics'), {
        sessionId: this.config.sessionId,
        type: 'performance_metrics',
        data: metrics,
        generatedAt: serverTimestamp()
      });

      return metrics;

    } catch (error) {
      console.error('Failed to generate performance metrics:', error);
      throw error;
    }
  }

  /**
   * Generate behavioral analysis for the session
   */
  async generateBehavioralAnalysis(): Promise<BehavioralAnalysis> {
    try {
      await this.loadSessionData();
      
      const teamBehaviors = await this.analyzeTeamBehaviors();
      const interactionPatterns = await this.identifyInteractionPatterns();
      const emergentStrategies = this.identifyEmergentStrategies(this.sessionData);
      const groupDynamics = this.analyzeGroupDynamics(this.sessionData);
      const learningCurves = this.calculateLearningCurves(this.sessionData);
      const recommendations = this.generateFacilitatorRecommendations(teamBehaviors, interactionPatterns, groupDynamics);

      const behavioralAnalysis: BehavioralAnalysis = {
        sessionId: this.config.sessionId,
        generatedAt: Date.now(),
        teamBehaviors,
        interactionPatterns,
        emergentStrategies,
        groupDynamics,
        learningCurves,
        recommendationsForFacilitator: recommendations
      };

      // Store analysis
      await addDoc(collection(firestore, 'analytics'), {
        sessionId: this.config.sessionId,
        type: 'behavioral_analysis',
        data: behavioralAnalysis,
        generatedAt: serverTimestamp()
      });

      return behavioralAnalysis;

    } catch (error) {
      console.error('Failed to generate behavioral analysis:', error);
      throw error;
    }
  }

  /**
   * Get analytics summary for quick insights
   */
  async getAnalyticsSummary(): Promise<{
    topPerformers: string[];
    keyInsights: string[];
    recommendedActions: string[];
    sessionHighlights: string[];
  }> {
    try {
      const performanceMetrics = await this.generatePerformanceMetrics();
      const behavioralAnalysis = await this.generateBehavioralAnalysis();

      // Top performers
      const topPerformers = performanceMetrics
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 3)
        .map(team => team.teamName);

      // Key insights
      const keyInsights = [
        `${topPerformers[0]} demonstrated superior strategic planning`,
        `Average trading efficiency was ${this.calculateAverageMetric(performanceMetrics, 'tradingEfficiency')}%`,
        `${behavioralAnalysis.interactionPatterns.length} distinct collaboration patterns emerged`,
        `Most successful strategy: ${behavioralAnalysis.emergentStrategies[0]?.strategy || 'Resource diversification'}`
      ];

      // Recommended actions
      const recommendedActions = behavioralAnalysis.recommendationsForFacilitator
        .filter(rec => rec.priority === 'high')
        .slice(0, 3)
        .map(rec => rec.title);

      // Session highlights
      const sessionHighlights = [
        `${this.allTrades.length} total trades completed`,
        `${performanceMetrics.filter(team => team.criticalEvents.length > 0).length} teams faced critical challenges`,
        `Highest collaboration score: ${Math.max(...performanceMetrics.map(team => team.behavioralMetrics.cooperationIndex))}`,
        `Most adaptive team: ${performanceMetrics.sort((a, b) => b.behavioralMetrics.adaptabilityScore - a.behavioralMetrics.adaptabilityScore)[0].teamName}`
      ];

      return {
        topPerformers,
        keyInsights,
        recommendedActions,
        sessionHighlights
      };

    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      throw error;
    }
  }

  // Private methods

  private async loadSessionData(): Promise<void> {
    if (this.sessionData) return;

    try {
      // Load session data
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }
      this.sessionData = sessionDoc.data() as GameSession;

      // Load all trades
      const tradesQuery = query(
        collection(firestore, 'trades'),
        where('sessionId', '==', this.config.sessionId),
        orderBy('timestamp', 'asc')
      );
      const tradesSnapshot = await getDocs(tradesQuery);
      this.allTrades = tradesSnapshot.docs.map(doc => doc.data() as TradeOffer);

      // Load game events
      const eventsQuery = query(
        collection(firestore, 'gameEvents'),
        where('sessionId', '==', this.config.sessionId),
        orderBy('timestamp', 'asc')
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      this.gameEvents = eventsSnapshot.docs.map(doc => doc.data() as GameEventLog);

    } catch (error) {
      console.error('Failed to load session data:', error);
      throw error;
    }
  }

  private async calculateTeamMetrics(team: Colony): Promise<PerformanceMetrics> {
    const teamTrades = this.allTrades.filter(trade => 
      trade.initiatorId === team.id || trade.targetId === team.id
    );

    const teamEvents = this.gameEvents.filter(event => 
      event.data?.teamId === team.id
    );

    // Calculate component scores
    const resourceScore = this.calculateResourceScore(team);
    const tradingScore = this.calculateTradingScore(teamTrades);
    const survivalScore = team.eliminationStatus.isEliminated ? 0 : 1000;
    const efficiencyScore = this.calculateEfficiencyScore(team, teamTrades);
    const strategicScore = this.calculateStrategicScore(team, teamEvents);

    const finalScore = resourceScore + tradingScore + survivalScore + efficiencyScore + strategicScore;

    // Calculate trading metrics
    const tradingMetrics = this.calculateTradingMetrics(team.id, teamTrades);
    
    // Calculate resource metrics
    const resourceMetrics = this.calculateResourceMetrics(team, teamEvents);
    
    // Calculate behavioral metrics
    const behavioralMetrics = this.calculateBehavioralMetrics(team.id, teamTrades, teamEvents);
    
    // Determine achievements
    const achievements = this.determineAchievements(team, teamTrades, teamEvents);
    
    // Identify critical events
    const criticalEvents = this.identifyCriticalEvents(team.id, teamEvents);

    return {
      sessionId: this.config.sessionId,
      teamId: team.id,
      teamName: team.name,
      colonyType: team.type,
      finalScore,
      componentScores: {
        resourceScore,
        tradingScore,
        survivalScore,
        efficiencyScore,
        strategicScore
      },
      tradingMetrics,
      resourceMetrics,
      behavioralMetrics,
      achievements,
      criticalEvents
    };
  }

  private calculateResourceScore(team: Colony): number {
    // Calculate score based on final resources relative to starting resources
    const weights = {
      oxygen: 10, food: 10, water: 15, energy: 8,
      minerals: 5, alloys: 20, techComponents: 50,
      credits: 1, techPatents: 100, blueprints: 75,
      alienTech: 200, xenoBio: 300, quantumCores: 500, darkMatter: 1000
    };

    let score = 0;
    Object.entries(team.resources).forEach(([resource, amount]) => {
      if (typeof amount === 'number' && weights[resource as keyof typeof weights]) {
        score += amount * weights[resource as keyof typeof weights];
      }
    });

    return Math.min(score, 2000); // Cap at 2000 points
  }

  private calculateTradingScore(trades: TradeOffer[]): number {
    const completedTrades = trades.filter(trade => trade.status === 'accepted');
    const baseScore = completedTrades.length * 50; // 50 points per trade
    
    // Bonus for trade value and frequency
    const avgTradeValue = this.calculateAverageTradeValue(completedTrades);
    const frequencyBonus = completedTrades.length > 20 ? 200 : completedTrades.length * 10;
    const valueBonus = Math.min(avgTradeValue * 2, 300);

    return Math.min(baseScore + frequencyBonus + valueBonus, 2000);
  }

  private calculateEfficiencyScore(team: Colony, trades: TradeOffer[]): number {
    // Measure resource utilization efficiency
    const resourceUtilization = this.calculateResourceUtilization(team);
    const tradingEfficiency = this.calculateTradingEfficiency(trades);
    const wasteRate = 1 - this.calculateWasteRate(team);

    const efficiency = (resourceUtilization + tradingEfficiency + wasteRate) / 3;
    return Math.round(efficiency * 800); // Max 800 points
  }

  private calculateStrategicScore(team: Colony, events: GameEventLog[]): number {
    // Measure strategic decision making
    const investmentScore = (this as any).calculateInvestmentEffectiveness?.(team) || 0;
    const adaptabilityScore = this.calculateAdaptability(events);
    const planningScore = this.calculatePlanningEffectiveness(team, events);

    return Math.round((investmentScore + adaptabilityScore + planningScore) / 3 * 600);
  }

  private calculateTradingMetrics(teamId: string, trades: TradeOffer[]): any {
    const teamTrades = trades.filter(trade => 
      trade.initiatorId === teamId || trade.targetId === teamId
    );
    
    const completedTrades = teamTrades.filter(trade => trade.status === 'accepted');
    
    return {
      totalTrades: completedTrades.length,
      avgTradeValue: this.calculateAverageTradeValue(completedTrades),
      tradingEfficiency: this.calculateTradingEfficiency(teamTrades),
      favoriteResource: this.findMostTradedResource(completedTrades),
      tradingPartners: this.findTradingPartners(teamId, completedTrades),
      negotiationSuccess: this.calculateNegotiationSuccess(teamTrades)
    };
  }

  private calculateResourceMetrics(team: Colony, events: GameEventLog[]): any {
    return {
      resourceUtilization: this.calculateResourceUtilization(team),
      wasteRate: this.calculateWasteRate(team),
      criticalMoments: this.countCriticalMoments(events),
      resourceDiversity: this.calculateResourceDiversity(team),
      endgameResources: team.resources
    };
  }

  private calculateBehavioralMetrics(teamId: string, trades: TradeOffer[], events: GameEventLog[]): any {
    return {
      decisionSpeed: this.calculateDecisionSpeed(trades),
      riskTolerance: this.calculateRiskTolerance(trades, events),
      cooperationIndex: this.calculateCooperationIndex(teamId, trades),
      adaptabilityScore: this.calculateAdaptability(events),
      communicationFrequency: this.calculateCommunicationFrequency(trades)
    };
  }

  private async analyzeTeamBehaviors(): Promise<TeamBehaviorProfile[]> {
    const profiles: TeamBehaviorProfile[] = [];
    
    for (const team of this.sessionData!.teams) {
      const teamTrades = this.allTrades.filter(trade => 
        trade.initiatorId === team.id || trade.targetId === team.id
      );
      
      const personalityType = this.determinePersonalityType(team, teamTrades);
      const playStyle = this.determinePlayStyle(team, teamTrades);
      const leadership = this.analyzeLeadership(team.id, teamTrades);
      const collaboration = this.analyzeCollaboration(team.id, teamTrades);

      profiles.push({
        teamId: team.id,
        teamName: team.name,
        personalityType,
        playStyle,
        strengths: this.identifyStrengths(personalityType, playStyle),
        developmentAreas: this.identifyDevelopmentAreas(personalityType, playStyle),
        leadership,
        collaboration
      });
    }

    return profiles;
  }

  private async identifyInteractionPatterns(): Promise<InteractionPattern[]> {
    // Analyze trade patterns, alliance formations, etc.
    const patterns: InteractionPattern[] = [];
    
    // Identify trading clusters
    const tradingClusters = this.findTradingClusters();
    if (tradingClusters.length > 0) {
      patterns.push({
        pattern: 'trade_clustering',
        participants: tradingClusters[0].members,
        frequency: tradingClusters[0].interactions,
        impact: 'positive',
        description: 'Teams formed tight trading relationships with frequent exchanges',
        emergenceTime: tradingClusters[0].formationTime
      });
    }

    return patterns;
  }

  // Helper methods (simplified implementations)
  
  private calculateAverageTradeValue(trades: TradeOffer[]): number {
    if (trades.length === 0) return 0;
    
    const totalValue = trades.reduce((sum, trade) => {
      // Simplified value calculation
      return sum + this.estimateTradeValue(trade);
    }, 0);
    
    return totalValue / trades.length;
  }

  private estimateTradeValue(trade: TradeOffer): number {
    // Simplified trade value estimation
    const resourceValues = {
      oxygen: 8, food: 10, water: 12, energy: 6,
      minerals: 4, alloys: 25, techComponents: 50,
      credits: 1
    };

    let value = 0;
    Object.entries(trade.offerResources).forEach(([resource, amount]) => {
      if (amount && resourceValues[resource as keyof typeof resourceValues]) {
        value += amount * resourceValues[resource as keyof typeof resourceValues];
      }
    });

    return value;
  }

  private calculateAverageMetric(metrics: PerformanceMetrics[], metricPath: string): number {
    // Helper to calculate average of nested metrics
    if (metrics.length === 0) return 0;
    
    const pathParts = metricPath.split('.');
    let values: number[] = [];
    
    metrics.forEach(metric => {
      let value: any = metric;
      
      // Navigate through the nested path
      for (const part of pathParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }
      
      // If we found a number, add it to values
      if (typeof value === 'number') {
        values.push(value);
      }
    });
    
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    
    // For percentage metrics, ensure we're in the 0-100 range
    if (metricPath.includes('Efficiency') || metricPath.includes('Rate') || metricPath.includes('Index')) {
      return Math.round(average * 100);
    }
    
    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  private determinePersonalityType(team: Colony, trades: TradeOffer[]): PersonalityType {
    // Comprehensive personality determination based on multiple factors
    const metrics = {
      tradeFrequency: trades.length,
      acceptanceRate: trades.filter(t => t.status === 'accepted').length / (trades.length || 1),
      initiationRate: trades.filter(t => t.initiatorId === team.id).length / (trades.length || 1),
      avgResponseTime: this.calculateDecisionSpeed(trades),
      counterOfferRate: trades.filter(t => t.status === 'counter_offered').length / (trades.length || 1),
      resourceDiversity: this.calculateResourceDiversity(team),
      criticalIncidents: team.eliminationStatus.roundsInCritical
    };
    
    // Score each personality type
    const scores = {
      analytical: 0,
      diplomatic: 0,
      competitive: 0,
      conservative: 0,
      innovative: 0,
      collaborative: 0
    };
    
    // Analytical: Slow, careful decision making
    if (metrics.avgResponseTime > 120) scores.analytical += 3;
    if (metrics.counterOfferRate > 0.3) scores.analytical += 2;
    if (metrics.resourceDiversity > 0.7) scores.analytical += 1;
    
    // Diplomatic: High acceptance rate, balanced approach
    if (metrics.acceptanceRate > 0.7) scores.diplomatic += 3;
    if (metrics.counterOfferRate > 0.2 && metrics.counterOfferRate < 0.5) scores.diplomatic += 2;
    if (metrics.initiationRate > 0.3 && metrics.initiationRate < 0.7) scores.diplomatic += 1;
    
    // Competitive: High trade volume, quick decisions
    if (metrics.tradeFrequency > 25) scores.competitive += 3;
    if (metrics.avgResponseTime < 60) scores.competitive += 2;
    if (metrics.initiationRate > 0.7) scores.competitive += 1;
    
    // Conservative: Low activity, risk-averse
    if (metrics.tradeFrequency < 10) scores.conservative += 3;
    if (metrics.criticalIncidents === 0) scores.conservative += 2;
    if (metrics.acceptanceRate < 0.5) scores.conservative += 1;
    
    // Innovative: Unique strategies, high counter-offers
    if (metrics.counterOfferRate > 0.4) scores.innovative += 3;
    if (metrics.resourceDiversity < 0.5 || metrics.resourceDiversity > 0.9) scores.innovative += 2;
    const hasIntel = team.resources.intel && team.resources.intel.length > 0;
    if (hasIntel) scores.innovative += 1;
    
    // Collaborative: Balanced, team-oriented
    if (metrics.acceptanceRate > 0.6 && metrics.acceptanceRate < 0.8) scores.collaborative += 3;
    if (metrics.tradeFrequency > 15 && metrics.tradeFrequency < 30) scores.collaborative += 2;
    if (metrics.initiationRate > 0.4 && metrics.initiationRate < 0.6) scores.collaborative += 1;
    
    // Find highest scoring personality
    let maxScore = 0;
    let personality: PersonalityType = 'collaborative';
    
    Object.entries(scores).forEach(([type, score]) => {
      if (score > maxScore) {
        maxScore = score;
        personality = type as PersonalityType;
      }
    });
    
    return personality;
  }

  private determinePlayStyle(team: Colony, trades: TradeOffer[]): PlayStyle {
    // Comprehensive play style determination
    const metrics = {
      tradeFrequency: trades.length,
      resourceHoarding: this.calculateResourceHoarding(team),
      tradeValue: this.calculateAverageTradeValue(trades.filter(t => t.status === 'accepted')),
      riskTolerance: this.calculateRiskTolerance(trades, this.gameEvents),
      planningDepth: this.calculatePlanningDepth(team, trades),
      socialInteractions: this.calculateSocialInteractionScore(team.id, trades),
      opportunism: this.calculateOpportunismScore(team.id, trades)
    };
    
    // Score each play style
    const scores = {
      aggressive_trader: 0,
      resource_hoarder: 0,
      strategic_planner: 0,
      opportunistic: 0,
      risk_averse: 0,
      social_leader: 0
    };
    
    // Aggressive Trader: High frequency, high value trades
    if (metrics.tradeFrequency > 30) scores.aggressive_trader += 3;
    if (metrics.tradeValue > 100) scores.aggressive_trader += 2;
    if (metrics.riskTolerance > 0.7) scores.aggressive_trader += 1;
    
    // Resource Hoarder: Accumulates resources, trades less
    if (metrics.resourceHoarding > 0.8) scores.resource_hoarder += 3;
    if (metrics.tradeFrequency < 15) scores.resource_hoarder += 2;
    const totalResources = Object.values(team.resources)
      .filter(v => typeof v === 'number')
      .reduce((sum, val) => sum + (val as number), 0);
    if (totalResources > 200) scores.resource_hoarder += 1;
    
    // Strategic Planner: Balanced, long-term focus
    if (metrics.planningDepth > 0.7) scores.strategic_planner += 3;
    if (metrics.tradeFrequency > 10 && metrics.tradeFrequency < 25) scores.strategic_planner += 2;
    if (Object.keys(team.investments || {}).length > 2) scores.strategic_planner += 1;
    
    // Opportunistic: Quick to exploit situations
    if (metrics.opportunism > 0.7) scores.opportunistic += 3;
    if (metrics.riskTolerance > 0.6) scores.opportunistic += 2;
    const crisisGains = this.calculateCrisisGains(team.id);
    if (crisisGains > 0) scores.opportunistic += 1;
    
    // Risk Averse: Conservative approach
    if (metrics.riskTolerance < 0.3) scores.risk_averse += 3;
    if (team.eliminationStatus.roundsInCritical === 0) scores.risk_averse += 2;
    if (metrics.tradeValue < 50) scores.risk_averse += 1;
    
    // Social Leader: High interaction, influences others
    if (metrics.socialInteractions > 0.8) scores.social_leader += 3;
    const isLeader = this.identifyEmergentLeaders(this.sessionData!).includes(team.id);
    if (isLeader) scores.social_leader += 2;
    if (metrics.tradeFrequency > 20) scores.social_leader += 1;
    
    // Find highest scoring play style
    let maxScore = 0;
    let playStyle: PlayStyle = 'strategic_planner';
    
    Object.entries(scores).forEach(([style, score]) => {
      if (score > maxScore) {
        maxScore = score;
        playStyle = style as PlayStyle;
      }
    });
    
    return playStyle;
  }

  // More helper methods would be implemented here...
  private calculateResourceUtilization(team: Colony): number { return 0.75; }
  private calculateTradingEfficiency(trades: TradeOffer[]): number { return 0.82; }
  private calculateWasteRate(team: Colony): number { return 0.15; }
  private calculateDecisionSpeed(trades: TradeOffer[]): number { return 95; }
  private calculateRiskTolerance(trades: TradeOffer[], events: GameEventLog[]): number { return 0.65; }
  private calculateCooperationIndex(teamId: string, trades: TradeOffer[]): number { return 0.78; }
  private calculateAdaptability(events: GameEventLog[]): number { return 0.83; }
  private calculateCommunicationFrequency(trades: TradeOffer[]): number { return 0.71; }
  private calculateResourceHoarding(team: Colony): number { 
    // Calculate tendency to hoard resources vs trade them
    const totalResources = Object.values(team.resources)
      .filter(v => typeof v === 'number')
      .reduce((sum, val) => sum + (val as number), 0);
    
    const teamTrades = this.allTrades.filter(t => t.initiatorId === team.id);
    const resourcesTraded = teamTrades.reduce((sum, trade) => {
      return sum + Object.values(trade.offerResources)
        .filter(v => typeof v === 'number')
        .reduce((s, v) => s + (v as number), 0);
    }, 0);
    
    if (totalResources === 0) return 0;
    
    // Higher ratio means more hoarding
    return 1 - Math.min(1, resourcesTraded / totalResources);
  }
  
  private calculatePlanningDepth(team: Colony, trades: TradeOffer[]): number {
    // Assess strategic planning based on investment patterns and trade timing
    let score = 0;
    
    // Check for investments (indicates forward planning)
    const investmentCount = Object.keys(team.investments || {}).length;
    score += Math.min(0.3, investmentCount * 0.1);
    
    // Check for consistent trading patterns
    if (trades.length > 5) {
      const tradesByRound = new Map<number, number>();
      trades.forEach(trade => {
        const round = trade.round || 1;
        tradesByRound.set(round, (tradesByRound.get(round) || 0) + 1);
      });
      
      // Consistent trading across rounds indicates planning
      const rounds = Array.from(tradesByRound.keys()).sort();
      const consistency = rounds.length / (Math.max(...rounds) || 1);
      score += consistency * 0.4;
    }
    
    // Resource diversity indicates balanced planning
    score += this.calculateResourceDiversity(team) * 0.3;
    
    return Math.min(1, score);
  }
  
  private calculateSocialInteractionScore(teamId: string, trades: TradeOffer[]): number {
    // Measure social interaction level
    const uniquePartners = new Set<string>();
    trades.forEach(trade => {
      if (trade.initiatorId === teamId) {
        uniquePartners.add(trade.targetId);
      } else if (trade.targetId === teamId) {
        uniquePartners.add(trade.initiatorId);
      }
    });
    
    const totalTeams = this.sessionData?.teams.length || 1;
    const interactionRatio = uniquePartners.size / (totalTeams - 1);
    
    // Also consider frequency of interactions
    const interactionFrequency = trades.length / (this.sessionData?.currentRound || 5);
    
    return (interactionRatio * 0.6 + Math.min(1, interactionFrequency / 10) * 0.4);
  }
  
  private calculateOpportunismScore(teamId: string, trades: TradeOffer[]): number {
    // Measure ability to capitalize on opportunities
    let score = 0;
    
    // Quick response to trades
    const responseTimes = trades
      .filter(t => t.targetId === teamId && t.status === 'accepted')
      .map(t => this.estimateResponseTime(t));
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      score += avgResponseTime < 60 ? 0.3 : 0;
    }
    
    // Trading during crisis events
    const crisisTrades = this.identifyCrisisTrades(teamId);
    score += Math.min(0.4, crisisTrades * 0.1);
    
    // Counter-offer frequency (shows negotiation opportunism)
    const counterOffers = trades.filter(t => 
      t.targetId === teamId && t.status === 'counter_offered'
    ).length;
    score += Math.min(0.3, counterOffers * 0.05);
    
    return Math.min(1, score);
  }
  
  private calculateCrisisGains(teamId: string): number {
    // Calculate resource gains during crisis periods
    // Simplified implementation
    return 0;
  }
  
  private estimateResponseTime(trade: TradeOffer): number {
    // Estimate response time in seconds (simplified)
    return Math.random() * 180 + 30; // 30-210 seconds
  }
  
  private identifyCrisisTrades(teamId: string): number {
    // Count trades made during crisis events
    const crisisEvents = this.gameEvents.filter(e => e.type === 'crisis_event');
    let crisisTrades = 0;
    
    crisisEvents.forEach(event => {
      const eventTime = event.timestamp || 0;
      const eventEndTime = eventTime + (5 * 60 * 1000); // 5 minutes
      
      crisisTrades += this.allTrades.filter(trade => 
        (trade.initiatorId === teamId || trade.targetId === teamId) &&
        (trade.timestamp || 0) >= eventTime &&
        (trade.timestamp || 0) <= eventEndTime
      ).length;
    });
    
    return crisisTrades;
  }
  
  private findTradingClusters(): any[] { return []; }
  private determineAchievements(team: Colony, trades: TradeOffer[], events: GameEventLog[]): Achievement[] { return []; }
  private identifyCriticalEvents(teamId: string, events: GameEventLog[]): CriticalEvent[] { return []; }
  private identifyStrengths(personality: PersonalityType, playStyle: PlayStyle): string[] { return []; }
  private identifyDevelopmentAreas(personality: PersonalityType, playStyle: PlayStyle): string[] { return []; }

  /**
   * Identify emergent strategies from team behaviors and outcomes
   */
  private identifyEmergentStrategies(sessionData: GameSession | null): EmergentStrategy[] {
    if (!sessionData) return [];
    
    const strategies: EmergentStrategy[] = [];
    const teamStrategies = new Map<string, { teams: Set<string>; effectiveness: number[] }>();
    
    // Analyze trading patterns for strategies
    const teamTradingPatterns = this.analyzeTeamTradingPatterns();
    
    // Strategy 1: Early Resource Hoarding
    const hoarders = sessionData.teams.filter(team => {
      const firstRoundTrades = this.allTrades.filter(trade => 
        (trade.initiatorId === team.id || trade.targetId === team.id) && 
        trade.round && trade.round <= 2
      );
      return firstRoundTrades.length < 2;
    });
    
    if (hoarders.length > 0) {
      strategies.push({
        strategy: 'Early Resource Hoarding',
        description: 'Teams that minimized early trades to accumulate resources for later rounds',
        adoptedBy: hoarders.map(t => t.id),
        effectiveness: this.calculateStrategyEffectiveness(hoarders),
        conditions: ['Resource-rich starting position', 'Conservative risk profile'],
        outcomes: ['Better late-game negotiating position', 'Higher survival rate in crisis events']
      });
    }
    
    // Strategy 2: Specialization Trading
    const specialists = this.identifySpecializationStrategy();
    if (specialists.length > 0) {
      strategies.push({
        strategy: 'Resource Specialization',
        description: 'Teams focused on producing and trading specific resources based on colony type',
        adoptedBy: specialists,
        effectiveness: this.calculateSpecializationEffectiveness(specialists),
        conditions: ['Colony type advantages', 'Reliable trading partners'],
        outcomes: ['Efficient resource generation', 'Strong trading relationships']
      });
    }
    
    // Strategy 3: Alliance Networks
    const alliances = this.identifyAllianceNetworks();
    if (alliances.length > 0) {
      const allianceTeams = alliances.flatMap(a => a.members);
      strategies.push({
        strategy: 'Alliance Formation',
        description: 'Teams formed stable trading alliances with preferential terms',
        adoptedBy: allianceTeams,
        effectiveness: this.calculateAllianceEffectiveness(alliances),
        conditions: ['Trust building', 'Repeated interactions', 'Mutual benefit'],
        outcomes: ['Reduced transaction costs', 'Crisis support network', 'Information sharing']
      });
    }
    
    // Strategy 4: Crisis Opportunism
    const opportunists = this.identifyCrisisOpportunists();
    if (opportunists.length > 0) {
      strategies.push({
        strategy: 'Crisis Opportunism',
        description: 'Teams that leveraged crisis events to gain trading advantages',
        adoptedBy: opportunists,
        effectiveness: this.calculateOpportunismEffectiveness(opportunists),
        conditions: ['Market volatility', 'Resource stockpiles', 'Quick decision making'],
        outcomes: ['Significant resource gains', 'Market position improvement']
      });
    }
    
    // Strategy 5: Balanced Portfolio
    const balanced = sessionData.teams.filter(team => {
      const diversity = this.calculateResourceDiversity(team);
      return diversity > 0.75 && !team.eliminationStatus.isEliminated;
    });
    
    if (balanced.length > 0) {
      strategies.push({
        strategy: 'Balanced Portfolio',
        description: 'Teams maintained diverse resource portfolios to minimize risk',
        adoptedBy: balanced.map(t => t.id),
        effectiveness: this.calculateBalancedEffectiveness(balanced),
        conditions: ['Risk awareness', 'Diverse trading partners', 'Long-term planning'],
        outcomes: ['Crisis resilience', 'Flexible negotiation options', 'Steady growth']
      });
    }
    
    return strategies.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Analyze group dynamics including cohesion, leadership, and sub-groups
   */
  private analyzeGroupDynamics(sessionData: GameSession | null): GroupDynamics {
    if (!sessionData) {
      return {
        cohesion: 0,
        conflictLevel: 0,
        communicationEffectiveness: 0,
        equalParticipation: 0,
        emergentLeadership: [],
        subgroups: []
      };
    }
    
    // Calculate group cohesion based on trading frequency and distribution
    const tradingMatrix = this.buildTradingMatrix();
    const cohesion = this.calculateGroupCohesion(tradingMatrix);
    
    // Analyze conflict indicators
    const rejectedTrades = this.allTrades.filter(t => t.status === 'rejected').length;
    const totalTradeAttempts = this.allTrades.length;
    const conflictLevel = totalTradeAttempts > 0 ? (rejectedTrades / totalTradeAttempts) : 0;
    
    // Communication effectiveness based on successful negotiations
    const successfulNegotiations = this.allTrades.filter(t => 
      t.status === 'accepted' || t.status === 'counter_offered'
    ).length;
    const communicationEffectiveness = totalTradeAttempts > 0 ? 
      (successfulNegotiations / totalTradeAttempts) : 0;
    
    // Equal participation analysis
    const participationScores = sessionData.teams.map(team => {
      const teamTrades = this.allTrades.filter(t => 
        t.initiatorId === team.id || t.targetId === team.id
      );
      return teamTrades.length;
    });
    const avgParticipation = participationScores.reduce((a, b) => a + b, 0) / participationScores.length;
    const participationVariance = participationScores.reduce((sum, score) => 
      sum + Math.pow(score - avgParticipation, 2), 0
    ) / participationScores.length;
    const equalParticipation = 1 - (Math.sqrt(participationVariance) / (avgParticipation || 1));
    
    // Identify emergent leaders
    const emergentLeadership = this.identifyEmergentLeaders(sessionData);
    
    // Identify sub-groups and alliances
    const subgroups = this.identifySubgroups(tradingMatrix, sessionData);
    
    return {
      cohesion: Math.min(1, cohesion),
      conflictLevel: Math.min(1, conflictLevel),
      communicationEffectiveness: Math.min(1, communicationEffectiveness),
      equalParticipation: Math.max(0, Math.min(1, equalParticipation)),
      emergentLeadership,
      subgroups
    };
  }

  /**
   * Calculate learning curves for teams across different metrics
   */
  private calculateLearningCurves(sessionData: GameSession | null): LearningCurve[] {
    if (!sessionData || !sessionData.currentRound) return [];
    
    const curves: LearningCurve[] = [];
    const rounds = sessionData.currentRound;
    
    sessionData.teams.forEach(team => {
      // Trading efficiency learning curve
      const tradingProgression = this.calculateMetricProgression(
        team.id, 
        'trading_efficiency',
        rounds
      );
      
      if (tradingProgression.length > 1) {
        curves.push({
          teamId: team.id,
          metric: 'trading_efficiency',
          progression: tradingProgression,
          improvementRate: this.calculateImprovementRate(tradingProgression),
          plateauPoint: this.findPlateauPoint(tradingProgression)
        });
      }
      
      // Resource management learning curve
      const resourceProgression = this.calculateMetricProgression(
        team.id,
        'resource_management',
        rounds
      );
      
      if (resourceProgression.length > 1) {
        curves.push({
          teamId: team.id,
          metric: 'resource_management',
          progression: resourceProgression,
          improvementRate: this.calculateImprovementRate(resourceProgression),
          plateauPoint: this.findPlateauPoint(resourceProgression)
        });
      }
      
      // Strategic thinking curve (based on investment decisions)
      const strategicProgression = this.calculateMetricProgression(
        team.id,
        'strategic_thinking',
        rounds
      );
      
      if (strategicProgression.length > 1) {
        curves.push({
          teamId: team.id,
          metric: 'strategic_thinking',
          progression: strategicProgression,
          improvementRate: this.calculateImprovementRate(strategicProgression),
          plateauPoint: this.findPlateauPoint(strategicProgression)
        });
      }
      
      // Negotiation skills curve
      const negotiationProgression = this.calculateMetricProgression(
        team.id,
        'negotiation',
        rounds
      );
      
      if (negotiationProgression.length > 1) {
        curves.push({
          teamId: team.id,
          metric: 'negotiation',
          progression: negotiationProgression,
          improvementRate: this.calculateImprovementRate(negotiationProgression),
          plateauPoint: this.findPlateauPoint(negotiationProgression)
        });
      }
    });
    
    return curves;
  }

  /**
   * Generate facilitator recommendations based on analysis
   */
  private generateFacilitatorRecommendations(
    teamBehaviors: TeamBehaviorProfile[],
    interactionPatterns: InteractionPattern[],
    groupDynamics: GroupDynamics
  ): FacilitatorRecommendation[] {
    const recommendations: FacilitatorRecommendation[] = [];
    
    // Recommendation 1: Address low participation teams
    const lowParticipationTeams = teamBehaviors.filter(team => 
      team.collaboration.collaborationFrequency < 0.3
    );
    
    if (lowParticipationTeams.length > 0) {
      recommendations.push({
        category: 'engagement',
        priority: 'high',
        title: 'Increase engagement for isolated teams',
        description: `${lowParticipationTeams.length} team(s) showing low participation levels`,
        evidence: [
          `Teams with collaboration frequency < 30%: ${lowParticipationTeams.map(t => t.teamName).join(', ')}`,
          'These teams completed fewer trades than average',
          'Limited interaction with other colonies'
        ],
        actionItems: [
          'Facilitate introductions between isolated teams and active traders',
          'Create specific trading challenges that require collaboration',
          'Check in with team leaders about barriers to participation',
          'Consider adjusting game mechanics to incentivize broader participation'
        ],
        teamsFocus: lowParticipationTeams.map(t => t.teamId)
      });
    }
    
    // Recommendation 2: Leverage emergent leaders
    if (groupDynamics.emergentLeadership.length > 0) {
      recommendations.push({
        category: 'team_development',
        priority: 'medium',
        title: 'Leverage emergent leaders for peer learning',
        description: 'Natural leaders have emerged who can help develop other teams',
        evidence: [
          `${groupDynamics.emergentLeadership.length} teams demonstrated leadership behaviors`,
          'These teams influenced trading patterns and strategies',
          'Other teams often followed their lead in negotiations'
        ],
        actionItems: [
          'Invite leader teams to share their strategies in a brief discussion',
          'Pair struggling teams with successful ones for mentoring',
          'Recognize leadership behaviors to encourage continued engagement',
          'Use leader teams as examples in debriefing sessions'
        ],
        teamsFocus: groupDynamics.emergentLeadership
      });
    }
    
    // Recommendation 3: Address high conflict
    if (groupDynamics.conflictLevel > 0.3) {
      recommendations.push({
        category: 'conflict_resolution',
        priority: 'high',
        title: 'Address elevated conflict levels in negotiations',
        description: 'Higher than optimal rejection rates indicate negotiation friction',
        evidence: [
          `${Math.round(groupDynamics.conflictLevel * 100)}% of trade attempts were rejected`,
          'This is above the healthy range of 10-20%',
          'May indicate communication or expectation misalignment'
        ],
        actionItems: [
          'Review negotiation guidelines with all teams',
          'Emphasize win-win trading strategies',
          'Consider implementing a trade mediation system',
          'Debrief specific failed negotiations to identify patterns'
        ]
      });
    }
    
    // Recommendation 4: Improve resource distribution
    const criticalTeams = teamBehaviors.filter(team => {
      const teamData = this.sessionData?.teams.find(t => t.id === team.teamId);
      return teamData && teamData.eliminationStatus.roundsInCritical > 2;
    });
    
    if (criticalTeams.length > 0) {
      recommendations.push({
        category: 'process_improvement',
        priority: 'high',
        title: 'Review resource distribution mechanisms',
        description: 'Multiple teams spent extended time in critical state',
        evidence: [
          `${criticalTeams.length} teams were in critical state for 3+ rounds`,
          'This suggests potential imbalances in resource access',
          'May impact overall engagement and learning outcomes'
        ],
        actionItems: [
          'Analyze starting resource allocations for balance',
          'Consider implementing emergency aid mechanisms',
          'Review if certain colony types are disadvantaged',
          'Ensure all teams understand survival strategies'
        ],
        teamsFocus: criticalTeams.map(t => t.teamId)
      });
    }
    
    // Recommendation 5: Enhance strategic thinking
    const lowStrategicTeams = teamBehaviors.filter(team => 
      team.playStyle === 'opportunistic' || team.playStyle === 'risk_averse'
    );
    
    if (lowStrategicTeams.length > teamBehaviors.length * 0.4) {
      recommendations.push({
        category: 'team_development',
        priority: 'medium',
        title: 'Develop strategic planning capabilities',
        description: 'Many teams showed reactive rather than proactive strategies',
        evidence: [
          `${Math.round(lowStrategicTeams.length / teamBehaviors.length * 100)}% of teams used reactive strategies`,
          'Limited evidence of long-term planning',
          'Missed opportunities for strategic investments'
        ],
        actionItems: [
          'Introduce mid-game strategic planning session',
          'Provide frameworks for resource projection and planning',
          'Highlight successful strategic decisions in real-time',
          'Consider adding strategic planning tools to the interface'
        ]
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Helper methods for the analytics calculations
  private analyzeTeamTradingPatterns(): Map<string, any> {
    // Implementation for analyzing trading patterns
    return new Map();
  }

  private calculateStrategyEffectiveness(teams: Colony[]): number {
    // Calculate average final score for teams using this strategy
    const scores = teams.map(team => {
      const metrics = this.calculateResourceScore(team) + 
                     (team.eliminationStatus.isEliminated ? 0 : 1000);
      return metrics;
    });
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length / 1000 : 0;
  }

  private identifySpecializationStrategy(): string[] {
    // Identify teams that focused on their colony type advantages
    return this.sessionData?.teams
      .filter(team => {
        const trades = this.allTrades.filter(t => t.initiatorId === team.id);
        // Check if they primarily traded their specialty resources
        return trades.length > 10;
      })
      .map(t => t.id) || [];
  }

  private calculateSpecializationEffectiveness(teamIds: string[]): number {
    return 0.75; // Simplified
  }

  private identifyAllianceNetworks(): TeamAlliance[] {
    // Identify stable trading partnerships
    const alliances: TeamAlliance[] = [];
    // Simplified implementation
    return alliances;
  }

  private calculateAllianceEffectiveness(alliances: TeamAlliance[]): number {
    return 0.82; // Simplified
  }

  private identifyCrisisOpportunists(): string[] {
    // Identify teams that gained during crisis events
    return [];
  }

  private calculateOpportunismEffectiveness(teamIds: string[]): number {
    return 0.68; // Simplified
  }

  private calculateBalancedEffectiveness(teams: Colony[]): number {
    return 0.79; // Simplified
  }

  private calculateResourceDiversity(team: Colony): number {
    // Calculate how evenly distributed resources are
    const resources = Object.values(team.resources)
      .filter(v => typeof v === 'number' && v > 0) as number[];
    if (resources.length === 0) return 0;
    
    const total = resources.reduce((a, b) => a + b, 0);
    const avg = total / resources.length;
    const variance = resources.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / resources.length;
    
    return 1 - (Math.sqrt(variance) / (avg || 1));
  }

  private buildTradingMatrix(): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    
    this.allTrades
      .filter(t => t.status === 'accepted')
      .forEach(trade => {
        if (!matrix.has(trade.initiatorId)) {
          matrix.set(trade.initiatorId, new Map());
        }
        if (!matrix.has(trade.targetId)) {
          matrix.set(trade.targetId, new Map());
        }
        
        const initiatorMap = matrix.get(trade.initiatorId)!;
        const targetMap = matrix.get(trade.targetId)!;
        
        initiatorMap.set(trade.targetId, (initiatorMap.get(trade.targetId) || 0) + 1);
        targetMap.set(trade.initiatorId, (targetMap.get(trade.initiatorId) || 0) + 1);
      });
    
    return matrix;
  }

  private calculateGroupCohesion(tradingMatrix: Map<string, Map<string, number>>): number {
    if (tradingMatrix.size === 0) return 0;
    
    let totalConnections = 0;
    let possibleConnections = (tradingMatrix.size * (tradingMatrix.size - 1)) / 2;
    
    tradingMatrix.forEach((partners, teamId) => {
      totalConnections += partners.size;
    });
    
    // Adjust for bidirectional counting
    totalConnections = totalConnections / 2;
    
    return possibleConnections > 0 ? totalConnections / possibleConnections : 0;
  }

  private identifyEmergentLeaders(sessionData: GameSession): string[] {
    const leadershipScores = new Map<string, number>();
    
    sessionData.teams.forEach(team => {
      let score = 0;
      
      // Trading volume
      const trades = this.allTrades.filter(t => 
        t.initiatorId === team.id || t.targetId === team.id
      );
      score += trades.length * 2;
      
      // Survival and resources
      if (!team.eliminationStatus.isEliminated) score += 10;
      score += this.calculateResourceScore(team) / 100;
      
      // Crisis resolution participation
      const crisisEvents = this.gameEvents.filter(e => 
        e.type === 'crisis_resolved' && e.data?.contributingTeams?.includes(team.id)
      );
      score += crisisEvents.length * 5;
      
      leadershipScores.set(team.id, score);
    });
    
    // Return top 20% as leaders
    const sortedTeams = Array.from(leadershipScores.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const leaderCount = Math.max(1, Math.floor(sortedTeams.length * 0.2));
    return sortedTeams.slice(0, leaderCount).map(([teamId]) => teamId);
  }

  private identifySubgroups(
    tradingMatrix: Map<string, Map<string, number>>,
    sessionData: GameSession
  ): TeamAlliance[] {
    const alliances: TeamAlliance[] = [];
    const processed = new Set<string>();
    
    tradingMatrix.forEach((partners, teamId) => {
      if (processed.has(teamId)) return;
      
      // Find teams with strong mutual trading relationships
      const strongPartners = Array.from(partners.entries())
        .filter(([partnerId, count]) => count >= 3)
        .map(([partnerId]) => partnerId);
      
      if (strongPartners.length >= 1) {
        const allianceMembers = [teamId, ...strongPartners].filter(id => !processed.has(id));
        
        if (allianceMembers.length >= 2) {
          allianceMembers.forEach(id => processed.add(id));
          
          const totalTrades = allianceMembers.reduce((sum, id) => {
            const memberTrades = this.allTrades.filter(t => 
              allianceMembers.includes(t.initiatorId) && allianceMembers.includes(t.targetId)
            );
            return sum + memberTrades.length;
          }, 0);
          
          alliances.push({
            members: allianceMembers,
            formationTime: this.findAllianceFormationTime(allianceMembers),
            strength: totalTrades / (allianceMembers.length * (allianceMembers.length - 1)),
            purpose: 'trading',
            duration: sessionData.currentRound || 5
          });
        }
      }
    });
    
    return alliances;
  }

  private findAllianceFormationTime(members: string[]): number {
    const firstTrade = this.allTrades
      .filter(t => members.includes(t.initiatorId) && members.includes(t.targetId))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))[0];
    
    return firstTrade?.timestamp || Date.now();
  }

  private calculateMetricProgression(
    teamId: string,
    metric: 'trading_efficiency' | 'resource_management' | 'strategic_thinking' | 'negotiation',
    rounds: number
  ): number[] {
    const progression: number[] = [];
    
    for (let round = 1; round <= rounds; round++) {
      const roundTrades = this.allTrades.filter(t => 
        (t.initiatorId === teamId || t.targetId === teamId) &&
        t.round === round
      );
      
      let value = 0;
      switch (metric) {
        case 'trading_efficiency':
          value = this.calculateTradingEfficiency(roundTrades);
          break;
        case 'resource_management':
          value = Math.random() * 0.3 + 0.5 + (round * 0.05); // Simplified
          break;
        case 'strategic_thinking':
          value = Math.random() * 0.2 + 0.4 + (round * 0.08); // Simplified
          break;
        case 'negotiation':
          value = this.calculateNegotiationSuccess(roundTrades);
          break;
      }
      
      progression.push(Math.min(1, value));
    }
    
    return progression;
  }

  private calculateImprovementRate(progression: number[]): number {
    if (progression.length < 2) return 0;
    
    const firstHalf = progression.slice(0, Math.floor(progression.length / 2));
    const secondHalf = progression.slice(Math.floor(progression.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / firstAvg;
  }

  private findPlateauPoint(progression: number[]): number | undefined {
    if (progression.length < 3) return undefined;
    
    // Find where improvement rate drops below 5%
    for (let i = 2; i < progression.length; i++) {
      const recentAvg = (progression[i] + progression[i-1]) / 2;
      const previousAvg = (progression[i-1] + progression[i-2]) / 2;
      const improvement = (recentAvg - previousAvg) / previousAvg;
      
      if (Math.abs(improvement) < 0.05) {
        return i;
      }
    }
    
    return undefined;
  }

  private findMostTradedResource(trades: TradeOffer[]): string {
    const resourceCounts = new Map<string, number>();
    
    trades.forEach(trade => {
      Object.entries(trade.offerResources).forEach(([resource, amount]) => {
        if (amount && amount > 0) {
          resourceCounts.set(resource, (resourceCounts.get(resource) || 0) + amount);
        }
      });
    });
    
    const sorted = Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return sorted[0]?.[0] || 'none';
  }

  private findTradingPartners(teamId: string, trades: TradeOffer[]): string[] {
    const partners = new Set<string>();
    
    trades.forEach(trade => {
      if (trade.initiatorId === teamId) {
        partners.add(trade.targetId);
      } else if (trade.targetId === teamId) {
        partners.add(trade.initiatorId);
      }
    });
    
    return Array.from(partners);
  }

  private calculateNegotiationSuccess(trades: TradeOffer[]): number {
    if (trades.length === 0) return 0;
    
    const successful = trades.filter(t => 
      t.status === 'accepted' || t.status === 'completed'
    ).length;
    
    return successful / trades.length;
  }

  private countCriticalMoments(events: GameEventLog[]): number {
    return events.filter(e => 
      e.type === 'team_critical' || 
      e.type === 'near_elimination' ||
      e.data?.critical === true
    ).length;
  }

  private calculateInvestmentEffectiveness(team: Colony): number {
    // Simplified calculation based on investments
    const investmentCount = Object.keys(team.investments || {}).length;
    return Math.min(1, investmentCount * 0.2);
  }

  private calculatePlanningEffectiveness(team: Colony, events: GameEventLog[]): number {
    // Based on how well team avoided crises and maintained resources
    const crisisEvents = events.filter(e => e.type === 'crisis_event');
    const avoidedCrises = crisisEvents.filter(e => 
      !e.data?.affectedTeams?.includes(team.id)
    ).length;
    
    return crisisEvents.length > 0 ? avoidedCrises / crisisEvents.length : 0.5;
  }
  private analyzeLeadership(teamId: string, trades: TradeOffer[]): LeadershipProfile { 
    return {
      emergentLeader: false,
      leadershipStyle: 'participative',
      influenceRadius: 0,
      decisionMakingSpeed: 0,
      conflictResolution: 0
    };
  }
  private analyzeCollaboration(teamId: string, trades: TradeOffer[]): CollaborationProfile {
    return {
      preferredPartners: [],
      collaborationFrequency: 0,
      trustLevel: 0,
      mutualBenefit: 0,
      helpfulness: 0
    };
  }

  // Continue with more implementation details...

  /**
   * Cleanup resources
   */
  destroy(): void {
    AnalyticsService.instances.delete(this.config.sessionId);
  }
}