import { 
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { teamDataService } from './teamDataService';
import type { TradeOffer, Colony } from '../types';

export interface TradeRelationship {
  partnerTeamId: string;
  partnerTeamName: string;
  totalTrades: number;
  successfulTrades: number;
  rejectedTrades: number;
  averageTradeValue: number;
  trustScore: number; // 0-100 based on trade success rate
  lastTradeTimestamp: number;
  favoriteResources: {
    offered: Record<string, number>;
    requested: Record<string, number>;
  };
}

export interface TradePattern {
  resourceType: string;
  avgOfferAmount: number;
  avgRequestAmount: number;
  frequency: number;
  preferredPartners: string[];
  timeOfDayPattern: number[]; // 24-hour histogram
  successRate: number;
}

export interface MarketInsight {
  resourceType: string;
  averagePrice: number; // in terms of other resources
  demandLevel: 'low' | 'medium' | 'high';
  supplyLevel: 'low' | 'medium' | 'high';
  priceDirection: 'increasing' | 'stable' | 'decreasing';
  recommendedAction: 'buy' | 'sell' | 'hold';
}

export class TradeAnalyticsService {
  // Get comprehensive trading relationship data for a team
  static async getTradeRelationships(
    sessionId: string,
    teamId: string
  ): Promise<TradeRelationship[]> {
    try {
      // Get all trades involving this team
      const [initiatedTrades, receivedTrades] = await Promise.all([
        getDocs(query(
          collection(firestore, 'sessions', sessionId, 'trades'),
          where('initiatorId', '==', teamId),
          orderBy('timestamp', 'desc')
        )),
        getDocs(query(
          collection(firestore, 'sessions', sessionId, 'trades'),
          where('targetId', '==', teamId),
          orderBy('timestamp', 'desc')
        ))
      ]);

      const allTrades = [
        ...initiatedTrades.docs.map(doc => doc.data() as TradeOffer),
        ...receivedTrades.docs.map(doc => doc.data() as TradeOffer)
      ];

      // Group by trading partner
      const relationshipMap = new Map<string, TradeRelationship>();

      for (const trade of allTrades) {
        const partnerTeamId = trade.initiatorId === teamId ? trade.targetId : trade.initiatorId;
        
        if (!relationshipMap.has(partnerTeamId)) {
          relationshipMap.set(partnerTeamId, {
            partnerTeamId,
            partnerTeamName: await this.getTeamName(sessionId, partnerTeamId),
            totalTrades: 0,
            successfulTrades: 0,
            rejectedTrades: 0,
            averageTradeValue: 0,
            trustScore: 0,
            lastTradeTimestamp: 0,
            favoriteResources: {
              offered: {},
              requested: {}
            }
          });
        }

        const relationship = relationshipMap.get(partnerTeamId)!;
        relationship.totalTrades++;
        
        if (trade.status === 'accepted') {
          relationship.successfulTrades++;
        } else if (trade.status === 'rejected') {
          relationship.rejectedTrades++;
        }

        // Update last trade timestamp
        if (trade.timestamp > relationship.lastTradeTimestamp) {
          relationship.lastTradeTimestamp = trade.timestamp;
        }

        // Track favorite resources
        this.updateFavoriteResources(relationship, trade, teamId);
      }

      // Calculate trust scores and average values
      for (const relationship of relationshipMap.values()) {
        relationship.trustScore = relationship.totalTrades > 0 
          ? Math.round((relationship.successfulTrades / relationship.totalTrades) * 100)
          : 50; // Default neutral score

        relationship.averageTradeValue = await this.calculateAverageTradeValue(
          allTrades.filter(t => 
            (t.initiatorId === teamId && t.targetId === relationship.partnerTeamId) ||
            (t.targetId === teamId && t.initiatorId === relationship.partnerTeamId)
          )
        );
      }

      return Array.from(relationshipMap.values())
        .sort((a, b) => b.totalTrades - a.totalTrades); // Sort by trade frequency

    } catch (error) {
      console.error('Failed to get trade relationships:', error);
      return [];
    }
  }

  // Analyze trading patterns for strategic insights
  static async getTradePatterns(
    sessionId: string,
    teamId: string
  ): Promise<TradePattern[]> {
    try {
      const trades = await this.getTeamTrades(sessionId, teamId);
      const resourcePatterns = new Map<string, TradePattern>();

      for (const trade of trades) {
        const resources = trade.initiatorId === teamId 
          ? Object.keys(trade.offerResources)
          : Object.keys(trade.requestResources);

        for (const resourceType of resources) {
          if (!resourcePatterns.has(resourceType)) {
            resourcePatterns.set(resourceType, {
              resourceType,
              avgOfferAmount: 0,
              avgRequestAmount: 0,
              frequency: 0,
              preferredPartners: [],
              timeOfDayPattern: new Array(24).fill(0),
              successRate: 0
            });
          }

          const pattern = resourcePatterns.get(resourceType)!;
          pattern.frequency++;

          // Update time pattern
          const hour = new Date(trade.timestamp).getHours();
          pattern.timeOfDayPattern[hour]++;

          // Track success rate
          if (trade.status === 'accepted') {
            // Update success tracking
          }
        }
      }

      return Array.from(resourcePatterns.values())
        .sort((a, b) => b.frequency - a.frequency);

    } catch (error) {
      console.error('Failed to analyze trade patterns:', error);
      return [];
    }
  }

  // Generate market insights based on all session trades
  static async getMarketInsights(sessionId: string): Promise<MarketInsight[]> {
    try {
      const allTrades = await getDocs(collection(firestore, 'sessions', sessionId, 'trades'));
      const trades = allTrades.docs.map(doc => doc.data() as TradeOffer);

      const resourceStats = new Map<string, {
        totalOffered: number;
        totalRequested: number;
        avgOfferValue: number;
        avgRequestValue: number;
        tradeCount: number;
        successCount: number;
      }>();

      // Analyze all trades
      for (const trade of trades) {
        this.updateResourceStats(resourceStats, trade.offerResources, 'offer');
        this.updateResourceStats(resourceStats, trade.requestResources, 'request');
      }

      // Generate insights
      const insights: MarketInsight[] = [];
      for (const [resourceType, stats] of resourceStats.entries()) {
        const demandRatio = stats.totalRequested / (stats.totalOffered || 1);
        const successRate = stats.successCount / stats.tradeCount;

        insights.push({
          resourceType,
          averagePrice: stats.avgRequestValue / (stats.avgOfferValue || 1),
          demandLevel: demandRatio > 1.5 ? 'high' : demandRatio > 0.8 ? 'medium' : 'low',
          supplyLevel: stats.totalOffered > stats.totalRequested * 1.2 ? 'high' : 
                      stats.totalOffered > stats.totalRequested * 0.8 ? 'medium' : 'low',
          priceDirection: this.calculatePriceDirection(trades, resourceType),
          recommendedAction: this.generateRecommendation(demandRatio, successRate)
        });
      }

      return insights.sort((a, b) => b.averagePrice - a.averagePrice);

    } catch (error) {
      console.error('Failed to generate market insights:', error);
      return [];
    }
  }

  // Get trade recommendations for a team
  static async getTradeRecommendations(
    sessionId: string,
    teamId: string,
    currentResources: any
  ): Promise<{
    urgentNeeds: string[];
    surplusResources: string[];
    recommendedPartners: string[];
    strategicOpportunities: string[];
  }> {
    try {
      const [relationships, _patterns, marketInsights] = await Promise.all([
        this.getTradeRelationships(sessionId, teamId),
        this.getTradePatterns(sessionId, teamId),
        this.getMarketInsights(sessionId)
      ]);

      // Analyze current resource situation
      const urgentNeeds: string[] = [];
      const surplusResources: string[] = [];

      for (const [resource, amount] of Object.entries(currentResources)) {
        if (typeof amount === 'number') {
          if (amount < 5) { // Low threshold
            urgentNeeds.push(resource);
          } else if (amount > 20) { // High threshold
            surplusResources.push(resource);
          }
        }
      }

      // Find best trading partners (high trust score)
      const recommendedPartners = relationships
        .filter(r => r.trustScore > 70)
        .slice(0, 3)
        .map(r => r.partnerTeamName);

      // Identify strategic opportunities
      const strategicOpportunities = marketInsights
        .filter(insight => 
          insight.recommendedAction === 'buy' && surplusResources.length > 0 ||
          insight.recommendedAction === 'sell' && urgentNeeds.includes(insight.resourceType)
        )
        .slice(0, 3)
        .map(insight => `${insight.recommendedAction.toUpperCase()} ${insight.resourceType}`);

      return {
        urgentNeeds,
        surplusResources,
        recommendedPartners,
        strategicOpportunities
      };

    } catch (error) {
      console.error('Failed to generate trade recommendations:', error);
      return {
        urgentNeeds: [],
        surplusResources: [],
        recommendedPartners: [],
        strategicOpportunities: []
      };
    }
  }

  // Helper methods
  private static async getTeamName(_sessionId: string, teamId: string): Promise<string> {
    try {
      const team = await teamDataService.getTeam(teamId);
      
      if (team) {
        return team.name;
      }
      return `Team ${teamId.slice(-4)}`;
    } catch {
      return `Team ${teamId.slice(-4)}`;
    }
  }

  private static async getTeamTrades(sessionId: string, teamId: string): Promise<TradeOffer[]> {
    const [initiatedTrades, receivedTrades] = await Promise.all([
      getDocs(query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('initiatorId', '==', teamId)
      )),
      getDocs(query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('targetId', '==', teamId)
      ))
    ]);

    return [
      ...initiatedTrades.docs.map(doc => doc.data() as TradeOffer),
      ...receivedTrades.docs.map(doc => doc.data() as TradeOffer)
    ];
  }

  private static updateFavoriteResources(
    relationship: TradeRelationship,
    trade: TradeOffer,
    teamId: string
  ): void {
    const isInitiator = trade.initiatorId === teamId;
    const offered = isInitiator ? trade.offerResources : trade.requestResources;
    const requested = isInitiator ? trade.requestResources : trade.offerResources;

    // Update offered resources count
    for (const [resource, amount] of Object.entries(offered)) {
      if (typeof amount === 'number' && amount > 0) {
        relationship.favoriteResources.offered[resource] = 
          (relationship.favoriteResources.offered[resource] || 0) + amount;
      }
    }

    // Update requested resources count
    for (const [resource, amount] of Object.entries(requested)) {
      if (typeof amount === 'number' && amount > 0) {
        relationship.favoriteResources.requested[resource] = 
          (relationship.favoriteResources.requested[resource] || 0) + amount;
      }
    }
  }

  private static async calculateAverageTradeValue(trades: TradeOffer[]): Promise<number> {
    if (trades.length === 0) return 0;

    const totalValue = trades.reduce((sum, trade) => {
      // Use simplified calculation for now
      const offerValue = Object.values(trade.offerResources).reduce((s: number, v) => {
        return typeof v === 'number' ? s + v : s;
      }, 0);
      const requestValue = Object.values(trade.requestResources).reduce((s: number, v) => {
        return typeof v === 'number' ? s + v : s;
      }, 0);
      return sum + offerValue + requestValue;
    }, 0);

    return Math.round(totalValue / trades.length);
  }

  private static updateResourceStats(
    stats: Map<string, any>,
    resources: any,
    type: 'offer' | 'request'
  ): void {
    for (const [resource, amount] of Object.entries(resources)) {
      if (typeof amount === 'number' && amount > 0) {
        if (!stats.has(resource)) {
          stats.set(resource, {
            totalOffered: 0,
            totalRequested: 0,
            avgOfferValue: 0,
            avgRequestValue: 0,
            tradeCount: 0,
            successCount: 0
          });
        }

        const stat = stats.get(resource)!;
        if (type === 'offer') {
          stat.totalOffered += amount;
        } else {
          stat.totalRequested += amount;
        }
        stat.tradeCount++;
      }
    }
  }

  private static calculatePriceDirection(trades: TradeOffer[], resourceType: string): 'increasing' | 'stable' | 'decreasing' {
    // Simplified trend analysis - in production, use more sophisticated time series analysis
    const recentTrades = trades
      .filter(t => 
        Object.keys(t.offerResources).includes(resourceType) || 
        Object.keys(t.requestResources).includes(resourceType)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    if (recentTrades.length < 3) return 'stable';

    // Simple trend detection based on trade frequency
    const oldTrades = recentTrades.slice(5);
    const newTrades = recentTrades.slice(0, 5);

    if (newTrades.length > oldTrades.length * 1.2) {
      return 'increasing';
    } else if (newTrades.length < oldTrades.length * 0.8) {
      return 'decreasing';
    }

    return 'stable';
  }

  private static generateRecommendation(
    demandRatio: number,
    successRate: number
  ): 'buy' | 'sell' | 'hold' {
    if (demandRatio > 1.5 && successRate > 0.7) {
      return 'sell'; // High demand, good success rate
    } else if (demandRatio < 0.6 && successRate > 0.7) {
      return 'buy'; // Low demand, good success rate
    }
    return 'hold';
  }
}