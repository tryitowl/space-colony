import { 
  doc, 
  getDoc, 
  collection, 
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  Resources, 
  GameSession, 
  Colony
} from '../types/game';

// Market Types
export interface MarketData {
  sessionId: string;
  timestamp: number;
  round: number;
  resourcePrices: ResourcePricing;
  marketTrends: MarketTrend[];
  supplyDemand: SupplyDemandData;
  volatilityIndex: number;
  marketEvents: MarketEvent[];
}

export interface ResourcePricing {
  [resource: string]: {
    basePrice: number;
    currentPrice: number;
    priceChange: number; // Percentage change from base
    trend: 'rising' | 'falling' | 'stable';
    volatility: number; // 0-1 scale
    demandLevel: 'low' | 'medium' | 'high';
    supplyLevel: 'low' | 'medium' | 'high';
  };
}

export interface MarketTrend {
  resourceType: keyof Resources;
  direction: 'up' | 'down' | 'neutral';
  strength: number; // 0-1 scale
  duration: number; // How long trend has been active (rounds)
  cause: MarketTrendCause;
}

export type MarketTrendCause = 
  | 'high_demand' 
  | 'low_supply' 
  | 'crisis_event' 
  | 'alien_contact' 
  | 'market_speculation' 
  | 'seasonal_adjustment'
  | 'trade_embargo';

export interface SupplyDemandData {
  [resource: string]: {
    totalSupply: number;
    totalDemand: number;
    supplyChange: number;
    demandChange: number;
    equilibriumPrice: number;
  };
}

export interface MarketEvent {
  id: string;
  type: MarketEventType;
  title: string;
  description: string;
  timestamp: number;
  duration: number;
  affectedResources: (keyof Resources)[];
  priceMultipliers: Record<string, number>;
  isActive: boolean;
}

export type MarketEventType = 
  | 'resource_shortage' 
  | 'trade_boom' 
  | 'market_crash' 
  | 'new_discovery' 
  | 'trade_war' 
  | 'economic_stimulus';

export interface MarketConfig {
  sessionId: string;
  enableFluctuations: boolean;
  volatilityRange: [number, number]; // Min/max volatility
  trendStrength: number; // How strong market trends are
  eventFrequency: number; // Chance of market event per round
  priceMemory: number; // How much price history affects current price
}

export class MarketFluctuationService {
  private static instances: Map<string, MarketFluctuationService> = new Map();
  private config: MarketConfig;
  private currentMarketData: MarketData | null = null;
  private marketHistory: MarketData[] = [];
  private baseResourcePrices: Record<string, number>;

  private constructor(config: MarketConfig) {
    this.config = config;
    this.baseResourcePrices = this.initializeBasePrices();
  }

  static getInstance(sessionId: string, config?: Partial<MarketConfig>): MarketFluctuationService {
    if (!MarketFluctuationService.instances.has(sessionId)) {
      if (!config) {
        throw new Error(`MarketFluctuationService instance for session ${sessionId} not found`);
      }
      
      const fullConfig: MarketConfig = {
        sessionId,
        enableFluctuations: true,
        volatilityRange: [0.1, 0.3],
        trendStrength: 0.15,
        eventFrequency: 0.2, // 20% chance per round
        priceMemory: 0.7, // 70% weight to previous prices
        ...config
      };

      MarketFluctuationService.instances.set(sessionId, new MarketFluctuationService(fullConfig));
    }
    
    return MarketFluctuationService.instances.get(sessionId)!;
  }

  /**
   * Initialize market data for a session
   */
  async initializeMarket(round: number): Promise<MarketData> {
    try {
      const initialPricing = this.initializeResourcePricing();
      
      const marketData: MarketData = {
        sessionId: this.config.sessionId,
        timestamp: Date.now(),
        round,
        resourcePrices: initialPricing,
        marketTrends: [],
        supplyDemand: await this.calculateSupplyDemand(),
        volatilityIndex: 0.1,
        marketEvents: []
      };

      // Store initial market data
      await addDoc(collection(firestore, 'marketData'), marketData);
      
      this.currentMarketData = marketData;
      this.marketHistory.push(marketData);

      return marketData;

    } catch (error) {
      console.error('Failed to initialize market:', error);
      throw error;
    }
  }

  /**
   * Update market data for a new round
   */
  async updateMarketForRound(round: number): Promise<MarketData> {
    if (!this.currentMarketData) {
      return this.initializeMarket(round);
    }

    try {
      // Calculate new supply/demand based on recent trades
      const supplyDemand = await this.calculateSupplyDemand();
      
      // Generate market events
      const newMarketEvents = await this.generateMarketEvents(round);
      
      // Update trends based on supply/demand and events
      const updatedTrends = this.updateMarketTrends(supplyDemand, newMarketEvents);
      
      // Calculate new prices
      const updatedPricing = this.calculateNewPrices(
        this.currentMarketData.resourcePrices,
        supplyDemand,
        updatedTrends,
        newMarketEvents
      );
      
      // Calculate volatility index
      const volatilityIndex = this.calculateVolatilityIndex(updatedPricing);

      const newMarketData: MarketData = {
        sessionId: this.config.sessionId,
        timestamp: Date.now(),
        round,
        resourcePrices: updatedPricing,
        marketTrends: updatedTrends,
        supplyDemand,
        volatilityIndex,
        marketEvents: [...this.currentMarketData.marketEvents, ...newMarketEvents].filter(event => 
          event.isActive && (event.timestamp + event.duration) > Date.now()
        )
      };

      // Store updated market data
      await addDoc(collection(firestore, 'marketData'), newMarketData);
      
      this.currentMarketData = newMarketData;
      this.marketHistory.push(newMarketData);

      // Keep only last 10 rounds of history
      if (this.marketHistory.length > 10) {
        this.marketHistory = this.marketHistory.slice(-10);
      }

      return newMarketData;

    } catch (error) {
      console.error('Failed to update market:', error);
      throw error;
    }
  }

  /**
   * Get current market data
   */
  getCurrentMarketData(): MarketData | null {
    return this.currentMarketData;
  }

  /**
   * Get market history
   */
  getMarketHistory(): MarketData[] {
    return [...this.marketHistory];
  }

  /**
   * Get price prediction for next round
   */
  getPricePrediction(resourceType: keyof Resources): {
    predicted: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  } {
    if (!this.currentMarketData) {
      return { predicted: this.baseResourcePrices[resourceType], confidence: 0, trend: 'stable' };
    }

    const currentPrice = this.currentMarketData.resourcePrices[resourceType]?.currentPrice || this.baseResourcePrices[resourceType];
    const trend = this.currentMarketData.marketTrends.find(t => t.resourceType === resourceType);
    const supplyDemand = this.currentMarketData.supplyDemand[resourceType];

    let prediction = currentPrice;
    let confidence = 0.5;
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';

    if (trend) {
      const trendEffect = trend.strength * this.config.trendStrength;
      if (trend.direction === 'up') {
        prediction *= (1 + trendEffect);
        trendDirection = 'up';
      } else if (trend.direction === 'down') {
        prediction *= (1 - trendEffect);
        trendDirection = 'down';
      }
      confidence = Math.min(0.9, 0.5 + trend.strength * 0.4);
    }

    if (supplyDemand) {
      const demandSupplyRatio = supplyDemand.totalDemand / Math.max(1, supplyDemand.totalSupply);
      if (demandSupplyRatio > 1.2) {
        prediction *= 1.1;
        trendDirection = 'up';
      } else if (demandSupplyRatio < 0.8) {
        prediction *= 0.9;
        trendDirection = 'down';
      }
    }

    return { predicted: prediction, confidence, trend: trendDirection };
  }

  /**
   * Calculate trade value adjustment based on market conditions
   */
  calculateTradeValueAdjustment(
    resourceType: keyof Resources, 
    amount: number, 
    isSelling: boolean
  ): number {
    if (!this.currentMarketData) return 1.0;

    const resourcePrice = this.currentMarketData.resourcePrices[resourceType];
    if (!resourcePrice) return 1.0;

    const baseAdjustment = resourcePrice.currentPrice / resourcePrice.basePrice;
    
    // Apply market sentiment
    let sentimentAdjustment = 1.0;
    if (resourcePrice.trend === 'rising' && isSelling) {
      sentimentAdjustment = 1.05; // Better to sell in rising market
    } else if (resourcePrice.trend === 'falling' && !isSelling) {
      sentimentAdjustment = 1.05; // Better to buy in falling market
    }

    // Apply volatility adjustment
    const volatilityAdjustment = 1 + (resourcePrice.volatility * 0.1);

    return baseAdjustment * sentimentAdjustment * volatilityAdjustment;
  }

  // Private methods

  private initializeBasePrices(): Record<string, number> {
    return {
      // Basic Resources
      oxygen: 8,
      food: 10,
      water: 12,
      energy: 6,
      
      // Advanced Materials
      minerals: 4,
      alloys: 25,
      techComponents: 50,
      
      // Information (per item)
      marketIntel: 30,
      surveyReports: 40,
      crisisWarnings: 60,
      
      // Services
      defenseContracts: 80,
      systemRepairs: 60,
      transportRoutes: 45,
      
      // Technology
      techPatents: 150,
      blueprints: 100,
      alienTech: 200,
      
      // Alien Resources
      xenoBio: 300,
      quantumCores: 500,
      darkMatter: 1000,
      
      // Universal
      credits: 1
    };
  }

  private initializeResourcePricing(): ResourcePricing {
    const pricing: ResourcePricing = {};
    
    Object.entries(this.baseResourcePrices).forEach(([resource, basePrice]) => {
      pricing[resource] = {
        basePrice,
        currentPrice: basePrice,
        priceChange: 0,
        trend: 'stable',
        volatility: Math.random() * 0.2 + 0.1, // 0.1-0.3
        demandLevel: 'medium',
        supplyLevel: 'medium'
      };
    });

    return pricing;
  }

  private async calculateSupplyDemand(): Promise<SupplyDemandData> {
    try {
      // Get session data to analyze team resources and recent trades
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) {
        return {};
      }

      const sessionData = sessionDoc.data() as GameSession;
      const supplyDemand: SupplyDemandData = {};

      // Calculate total supply from all teams
      Object.keys(this.baseResourcePrices).forEach(resource => {
        let totalSupply = 0;
        sessionData.teams.forEach(team => {
          const resourceAmount = team.resources[resource as keyof Resources];
          if (typeof resourceAmount === 'number') {
            totalSupply += resourceAmount;
          }
        });

        // Estimate demand based on recent trade activity
        // This would need integration with trading service for accurate data
        const estimatedDemand = totalSupply * (0.8 + Math.random() * 0.4); // Rough estimate

        supplyDemand[resource] = {
          totalSupply,
          totalDemand: estimatedDemand,
          supplyChange: 0, // Would calculate from previous round
          demandChange: 0, // Would calculate from trade patterns
          equilibriumPrice: this.baseResourcePrices[resource] * (estimatedDemand / Math.max(1, totalSupply))
        };
      });

      return supplyDemand;

    } catch (error) {
      console.error('Failed to calculate supply/demand:', error);
      return {};
    }
  }

  private async generateMarketEvents(round: number): Promise<MarketEvent[]> {
    const events: MarketEvent[] = [];

    if (Math.random() < this.config.eventFrequency) {
      const eventTypes: MarketEventType[] = ['resource_shortage', 'trade_boom', 'new_discovery'];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      const event = this.createMarketEvent(randomType, round);
      events.push(event);
    }

    return events;
  }

  private createMarketEvent(type: MarketEventType, round: number): MarketEvent {
    const eventTemplates = {
      resource_shortage: {
        title: "Resource Shortage Alert",
        description: "Critical shortages detected in basic life support resources.",
        affectedResources: ['oxygen', 'food', 'water'] as (keyof Resources)[],
        priceMultipliers: { oxygen: 1.3, food: 1.25, water: 1.35 },
        duration: 2 * 60 * 1000 // 2 minutes
      },
      trade_boom: {
        title: "Trade Boom",
        description: "Increased inter-colony trade activity boosting all resource values.",
        affectedResources: ['alloys', 'techComponents', 'minerals'] as (keyof Resources)[],
        priceMultipliers: { alloys: 1.2, techComponents: 1.15, minerals: 1.1 },
        duration: 3 * 60 * 1000
      },
      new_discovery: {
        title: "Technological Breakthrough",
        description: "New manufacturing techniques reduce production costs.",
        affectedResources: ['techPatents', 'blueprints'] as (keyof Resources)[],
        priceMultipliers: { techPatents: 1.4, blueprints: 1.3 },
        duration: 5 * 60 * 1000
      },
      market_crash: {
        title: "Market Crash",
        description: "Economic downturn affecting all markets.",
        affectedResources: ['alloys', 'techComponents', 'minerals'] as (keyof Resources)[],
        priceMultipliers: { alloys: 0.8, techComponents: 0.85, minerals: 0.9 },
        duration: 3 * 60 * 1000
      },
      trade_war: {
        title: "Trade War",
        description: "Trade restrictions between colonies.",
        affectedResources: ['alloys', 'techComponents'] as (keyof Resources)[],
        priceMultipliers: { alloys: 0.7, techComponents: 0.75 },
        duration: 4 * 60 * 1000
      },
      economic_stimulus: {
        title: "Economic Stimulus",
        description: "Government stimulus boosting markets.",
        affectedResources: ['energy', 'credits'] as (keyof Resources)[],
        priceMultipliers: { energy: 1.15, credits: 1.1 },
        duration: 5 * 60 * 1000
      }
    };

    const template = eventTemplates[type] || eventTemplates.resource_shortage;
    
    return {
      id: `market_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: template.title,
      description: template.description,
      timestamp: Date.now(),
      duration: template.duration,
      affectedResources: template.affectedResources,
      priceMultipliers: template.priceMultipliers,
      isActive: true
    };
  }

  private updateMarketTrends(
    supplyDemand: SupplyDemandData, 
    marketEvents: MarketEvent[]
  ): MarketTrend[] {
    const trends: MarketTrend[] = [];

    Object.entries(supplyDemand).forEach(([resource, data]) => {
      const demandSupplyRatio = data.totalDemand / Math.max(1, data.totalSupply);
      
      let direction: 'up' | 'down' | 'neutral' = 'neutral';
      let strength = 0;
      let cause: MarketTrendCause = 'market_speculation';

      if (demandSupplyRatio > 1.2) {
        direction = 'up';
        strength = Math.min(1, (demandSupplyRatio - 1) * 2);
        cause = 'high_demand';
      } else if (demandSupplyRatio < 0.8) {
        direction = 'down';
        strength = Math.min(1, (1 - demandSupplyRatio) * 2);
        cause = 'low_supply';
      }

      // Check for market event effects
      const affectingEvent = marketEvents.find(event => 
        event.affectedResources.includes(resource as keyof Resources)
      );
      
      if (affectingEvent) {
        const multiplier = affectingEvent.priceMultipliers[resource];
        if (multiplier > 1.1) {
          direction = 'up';
          strength = Math.max(strength, (multiplier - 1) * 2);
          cause = 'crisis_event';
        } else if (multiplier < 0.9) {
          direction = 'down';
          strength = Math.max(strength, (1 - multiplier) * 2);
          cause = 'crisis_event';
        }
      }

      if (direction !== 'neutral') {
        trends.push({
          resourceType: resource as keyof Resources,
          direction,
          strength,
          duration: 1, // Would track across multiple rounds
          cause
        });
      }
    });

    return trends;
  }

  private calculateNewPrices(
    currentPricing: ResourcePricing,
    supplyDemand: SupplyDemandData,
    trends: MarketTrend[],
    marketEvents: MarketEvent[]
  ): ResourcePricing {
    const newPricing: ResourcePricing = {};

    Object.entries(currentPricing).forEach(([resource, pricing]) => {
      const trend = trends.find(t => t.resourceType === resource);
      const supplyDemandData = supplyDemand[resource];
      const marketEvent = marketEvents.find(event => 
        event.affectedResources.includes(resource as keyof Resources)
      );

      let newPrice = pricing.currentPrice;
      
      // Apply memory effect (gradual return to base price)
      const memoryEffect = 1 - this.config.priceMemory;
      newPrice = (newPrice * this.config.priceMemory) + (pricing.basePrice * memoryEffect);

      // Apply trend effects
      if (trend) {
        const trendEffect = trend.strength * this.config.trendStrength;
        if (trend.direction === 'up') {
          newPrice *= (1 + trendEffect);
        } else if (trend.direction === 'down') {
          newPrice *= (1 - trendEffect);
        }
      }

      // Apply supply/demand effects
      if (supplyDemandData) {
        const equilibriumEffect = supplyDemandData.equilibriumPrice / pricing.basePrice;
        newPrice = (newPrice * 0.8) + (pricing.basePrice * equilibriumEffect * 0.2);
      }

      // Apply market event multipliers
      if (marketEvent) {
        const multiplier = marketEvent.priceMultipliers[resource] || 1;
        newPrice *= multiplier;
      }

      // Add volatility
      const volatilityRange = this.config.volatilityRange;
      const volatility = volatilityRange[0] + Math.random() * (volatilityRange[1] - volatilityRange[0]);
      const volatilityEffect = 1 + (Math.random() - 0.5) * volatility;
      newPrice *= volatilityEffect;

      // Calculate price change
      const priceChange = ((newPrice - pricing.currentPrice) / pricing.currentPrice) * 100;

      // Determine trend
      let trendDirection: 'rising' | 'falling' | 'stable' = 'stable';
      if (Math.abs(priceChange) > 2) {
        trendDirection = priceChange > 0 ? 'rising' : 'falling';
      }

      newPricing[resource] = {
        ...pricing,
        currentPrice: Math.max(pricing.basePrice * 0.1, newPrice), // Minimum 10% of base price
        priceChange,
        trend: trendDirection,
        volatility: Math.min(1, volatility + 0.1)
      };
    });

    return newPricing;
  }

  private calculateVolatilityIndex(pricing: ResourcePricing): number {
    const volatilities = Object.values(pricing).map(p => p.volatility);
    return volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    MarketFluctuationService.instances.delete(this.config.sessionId);
  }
}