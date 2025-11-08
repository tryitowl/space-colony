/**
 * Flexible Trading Service
 * 
 * Extends the standard TradingService to support multi-galaxy trading
 * with galaxy-specific rules and cross-galaxy restrictions
 */

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { TradingService } from './tradingService';
import { galaxyService } from './galaxyService';
import FlexibleGameService from './flexibleGameService';
import type {
  TradeOffer,
  Resources,
  IntelItem
} from '../types';
import type { Galaxy } from '../types/galaxy.types';
import { AuthService } from './authService';

interface GalaxyTradeRestrictions {
  allowCrossGalaxyTrade: boolean;
  maxTradesPerRound: number;
  tradingCooldown: number; // milliseconds
  resourceMultipliers?: Record<string, number>;
  prohibitedResources?: string[];
  requiredIntel?: string[];
}

interface FlexibleTradeOffer extends TradeOffer {
  galaxyId: string;
  targetGalaxyId: string;
  isCrossGalaxy: boolean;
  galaxyModifiers?: {
    resourceMultipliers: Record<string, number>;
    additionalCosts: Partial<Resources>;
  };
}

export default class FlexibleTradingService extends TradingService {
  /**
   * Create a trade offer with galaxy-aware logic
   */
  static async createFlexibleTradeOffer(
    sessionId: string,
    initiatorTeamId: string,
    targetTeamId: string,
    offerResources: Partial<Resources>,
    requestResources: Partial<Resources>,
    offerIntel?: IntelItem[],
    requestIntel?: IntelItem[]
  ): Promise<string> {
    // Ensure user is authenticated
    await AuthService.ensureAuthenticated();

    // Get session and validate it's a flexible session
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found or not a flexible session');
    }

    // Find teams and their galaxies
    const initiatorTeam = session.teams.find(t => t.id === initiatorTeamId);
    const targetTeam = session.teams.find(t => t.id === targetTeamId);

    if (!initiatorTeam || !targetTeam) {
      throw new Error('One or both teams not found');
    }

    const initiatorGalaxyId = initiatorTeam.galaxyId!;
    const targetGalaxyId = targetTeam.galaxyId!;
    const isCrossGalaxy = initiatorGalaxyId !== targetGalaxyId;

    // Get galaxy configurations
    const initiatorGalaxy = await galaxyService.getGalaxy(initiatorGalaxyId);
    const targetGalaxy = await galaxyService.getGalaxy(targetGalaxyId);

    if (!initiatorGalaxy || !targetGalaxy) {
      throw new Error('Galaxy configuration not found');
    }

    // Check trade restrictions
    await this.validateTradeRestrictions(
      initiatorGalaxy,
      targetGalaxy,
      isCrossGalaxy,
      offerResources,
      requestResources
    );

    // Apply galaxy modifiers
    const galaxyModifiers = this.calculateGalaxyModifiers(
      initiatorGalaxy,
      targetGalaxy,
      isCrossGalaxy
    );

    const tradeId = `flex_trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tradeOffer: FlexibleTradeOffer = {
      id: tradeId,
      initiatorId: initiatorTeamId,
      targetId: targetTeamId,
      offerResources,
      requestResources,
      offerIntel: offerIntel || [],
      requestIntel: requestIntel || [],
      status: 'pending',
      timestamp: Date.now(),
      expiresAt: Date.now() + this.getTradeTimeout(initiatorGalaxy, targetGalaxy),
      galaxyId: initiatorGalaxyId,
      targetGalaxyId: targetGalaxyId,
      isCrossGalaxy,
      galaxyModifiers,
      negotiationHistory: [{
        playerId: initiatorTeamId,
        action: 'offer',
        resources: {
          offer: offerResources,
          request: requestResources
        },
        intel: {
          offer: offerIntel || [],
          request: requestIntel || []
        },
        timestamp: Date.now()
      }]
    };

    // Save to Firestore
    await setDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId), tradeOffer);

    // Update real-time trading status for both galaxies
    await this.updateGalaxyTradingStatus(sessionId, initiatorGalaxyId, initiatorTeamId, 'busy');
    await this.updateGalaxyTradingStatus(sessionId, targetGalaxyId, targetTeamId, 'busy');

    // Set up auto-expiration
    const timeout = this.getTradeTimeout(initiatorGalaxy, targetGalaxy);
    setTimeout(async () => {
      await this.expireFlexibleTradeOffer(sessionId, tradeId);
    }, timeout);

    return tradeId;
  }

  /**
   * Validate trade restrictions based on galaxy rules
   */
  private static async validateTradeRestrictions(
    initiatorGalaxy: Galaxy,
    targetGalaxy: Galaxy,
    isCrossGalaxy: boolean,
    offerResources: Partial<Resources>,
    requestResources: Partial<Resources>
  ): Promise<void> {
    // Check cross-galaxy trade permissions
    if (isCrossGalaxy) {
      const initiatorRules = this.getGalaxyTradeRestrictions(initiatorGalaxy);
      const targetRules = this.getGalaxyTradeRestrictions(targetGalaxy);

      if (!initiatorRules.allowCrossGalaxyTrade || !targetRules.allowCrossGalaxyTrade) {
        throw new Error('Cross-galaxy trading is not allowed between these galaxies');
      }
    }

    // Check prohibited resources
    const initiatorRestrictions = this.getGalaxyTradeRestrictions(initiatorGalaxy);
    const targetRestrictions = this.getGalaxyTradeRestrictions(targetGalaxy);

    // Check offered resources
    for (const resource of Object.keys(offerResources)) {
      if (initiatorRestrictions.prohibitedResources?.includes(resource)) {
        throw new Error(`Resource ${resource} cannot be traded from ${initiatorGalaxy.name}`);
      }
    }

    // Check requested resources
    for (const resource of Object.keys(requestResources)) {
      if (targetRestrictions.prohibitedResources?.includes(resource)) {
        throw new Error(`Resource ${resource} cannot be traded from ${targetGalaxy.name}`);
      }
    }
  }

  /**
   * Calculate galaxy-specific trade modifiers
   */
  private static calculateGalaxyModifiers(
    initiatorGalaxy: Galaxy,
    targetGalaxy: Galaxy,
    isCrossGalaxy: boolean
  ): { resourceMultipliers: Record<string, number>; additionalCosts: Partial<Resources> } {
    const modifiers = {
      resourceMultipliers: {} as Record<string, number>,
      additionalCosts: {} as Partial<Resources>
    };

    // Apply resource modifiers from galaxy configurations
    if (initiatorGalaxy.resourceModifiers?.productionMultipliers) {
      Object.assign(modifiers.resourceMultipliers, initiatorGalaxy.resourceModifiers.productionMultipliers);
    }

    if (targetGalaxy.resourceModifiers?.productionMultipliers) {
      Object.assign(modifiers.resourceMultipliers, targetGalaxy.resourceModifiers.productionMultipliers);
    }

    // Apply cross-galaxy penalties
    if (isCrossGalaxy) {
      // Add energy cost for cross-galaxy communication
      modifiers.additionalCosts.energy = 5;

      // Reduce efficiency by 10% for cross-galaxy trades
      Object.keys(modifiers.resourceMultipliers).forEach(resource => {
        modifiers.resourceMultipliers[resource] *= 0.9;
      });
    }

    return modifiers;
  }

  /**
   * Get galaxy-specific trade restrictions
   */
  private static getGalaxyTradeRestrictions(galaxy: Galaxy): GalaxyTradeRestrictions {
    const defaults: GalaxyTradeRestrictions = {
      allowCrossGalaxyTrade: true,
      maxTradesPerRound: 5,
      tradingCooldown: 30000, // 30 seconds
      resourceMultipliers: {},
      prohibitedResources: [],
      requiredIntel: []
    };

    // Parse special rules
    if (galaxy.specialRules) {
      galaxy.specialRules.forEach(rule => {
        switch (rule.type) {
          case 'no_cross_galaxy_trade':
            defaults.allowCrossGalaxyTrade = false;
            break;
          case 'max_trades_per_round':
            defaults.maxTradesPerRound = rule.value as number;
            break;
          case 'trading_cooldown':
            defaults.tradingCooldown = rule.value as number;
            break;
          case 'prohibited_resources':
            if (Array.isArray(rule.config?.resources)) {
              defaults.prohibitedResources = rule.config.resources as string[];
            }
            break;
          case 'required_intel':
            if (Array.isArray(rule.config?.intel)) {
              defaults.requiredIntel = rule.config.intel as string[];
            }
            break;
        }
      });
    }

    return defaults;
  }

  /**
   * Get trade timeout based on galaxy configurations
   */
  private static getTradeTimeout(initiatorGalaxy: Galaxy, targetGalaxy: Galaxy): number {
    const baseTimeout = 3 * 60 * 1000; // 3 minutes
    
    // Check for timeout modifiers in special rules
    let timeout = baseTimeout;

    [initiatorGalaxy, targetGalaxy].forEach(galaxy => {
      const timeoutRule = galaxy.specialRules?.find(r => r.type === 'trading_cooldown');
      if (timeoutRule && typeof timeoutRule.value === 'number') {
        timeout = Math.max(timeout, timeoutRule.value);
      }
    });

    return timeout;
  }

  /**
   * Update trading status in galaxy-specific real-time database
   */
  private static async updateGalaxyTradingStatus(
    sessionId: string,
    galaxyId: string,
    teamId: string,
    status: 'available' | 'busy' | 'offline'
  ): Promise<void> {
    try {
      const statusRef = ref(realtimeDb, `sessions/${sessionId}/live/galaxies/${galaxyId}/availableTeams/${teamId}`);
      await set(statusRef, status);
    } catch (error) {
      console.warn('Realtime Database not available for galaxy trading status update:', error);
    }
  }

  /**
   * Execute flexible trade with galaxy modifiers
   */
  static async executeFlexibleTrade(sessionId: string, tradeId: string): Promise<void> {
    const trade = await this.getFlexibleTradeOffer(sessionId, tradeId);
    if (!trade || trade.status !== 'accepted') return;

    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) return;

    const initiatorTeam = session.teams.find(t => t.id === trade.initiatorId);
    const targetTeam = session.teams.find(t => t.id === trade.targetId);

    if (!initiatorTeam || !targetTeam) return;

    // Apply galaxy modifiers to the trade
    const modifiedOffer = this.applyResourceModifiers(
      trade.offerResources,
      trade.galaxyModifiers?.resourceMultipliers || {}
    );

    const modifiedRequest = this.applyResourceModifiers(
      trade.requestResources,
      trade.galaxyModifiers?.resourceMultipliers || {}
    );

    // Apply additional costs for cross-galaxy trades
    if (trade.isCrossGalaxy && trade.galaxyModifiers?.additionalCosts) {
      Object.entries(trade.galaxyModifiers.additionalCosts).forEach(([resource, cost]) => {
        if (initiatorTeam.resources[resource as keyof Resources] !== undefined) {
          (initiatorTeam.resources[resource as keyof Resources] as number) -= cost as number;
        }
        if (targetTeam.resources[resource as keyof Resources] !== undefined) {
          (targetTeam.resources[resource as keyof Resources] as number) -= cost as number;
        }
      });
    }

    // Execute the resource transfer
    Object.entries(modifiedOffer).forEach(([resource, amount]) => {
      if (typeof amount === 'number' && amount > 0) {
        (initiatorTeam.resources[resource as keyof Resources] as number) -= amount;
        (targetTeam.resources[resource as keyof Resources] as number) += amount;
      }
    });

    Object.entries(modifiedRequest).forEach(([resource, amount]) => {
      if (typeof amount === 'number' && amount > 0) {
        (targetTeam.resources[resource as keyof Resources] as number) -= amount;
        (initiatorTeam.resources[resource as keyof Resources] as number) += amount;
      }
    });

    // Update teams in session
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'sessions', sessionId), {
      teams: session.teams
    });

    // Update trade status
    batch.update(doc(firestore, 'sessions', sessionId, 'trades', tradeId), {
      status: 'completed',
      completedAt: Date.now()
    });

    await batch.commit();

    // Free up teams for new trades
    await this.updateGalaxyTradingStatus(sessionId, trade.galaxyId, trade.initiatorId, 'available');
    await this.updateGalaxyTradingStatus(sessionId, trade.targetGalaxyId, trade.targetId, 'available');
  }

  /**
   * Apply resource modifiers to trade resources
   */
  private static applyResourceModifiers(
    resources: Partial<Resources>,
    modifiers: Record<string, number>
  ): Partial<Resources> {
    const modified: Partial<Resources> = {};

    Object.entries(resources).forEach(([resource, amount]) => {
      if (typeof amount === 'number') {
        const multiplier = modifiers[resource] || 1;
        const key = resource as keyof Resources;
        // Only assign if the target property expects a number (not IntelItem[])
        if (key !== 'marketIntel' && key !== 'surveyReports' && key !== 'crisisWarnings' && key !== 'intel') {
          (modified[key] as number) = Math.floor(amount * multiplier);
        }
      }
    });

    return modified;
  }

  /**
   * Get flexible trade offer
   */
  private static async getFlexibleTradeOffer(sessionId: string, tradeId: string): Promise<FlexibleTradeOffer | null> {
    try {
      const tradeDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId));
      if (!tradeDoc.exists()) return null;
      return tradeDoc.data() as FlexibleTradeOffer;
    } catch (error) {
      console.error('Error fetching flexible trade offer:', error);
      return null;
    }
  }

  /**
   * Expire flexible trade offer
   */
  private static async expireFlexibleTradeOffer(sessionId: string, tradeId: string): Promise<void> {
    const trade = await this.getFlexibleTradeOffer(sessionId, tradeId);
    if (!trade || trade.status !== 'pending') return;

    await updateDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId), {
      status: 'expired'
    });

    // Free up teams
    await this.updateGalaxyTradingStatus(sessionId, trade.galaxyId, trade.initiatorId, 'available');
    await this.updateGalaxyTradingStatus(sessionId, trade.targetGalaxyId, trade.targetId, 'available');
  }

  /**
   * Get all trades for a specific galaxy
   */
  static async getGalaxyTrades(sessionId: string, galaxyId: string): Promise<FlexibleTradeOffer[]> {
    try {
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('galaxyId', '==', galaxyId)
      );

      const tradeDocs = await getDocs(tradesQuery);
      return tradeDocs.docs.map(doc => doc.data() as FlexibleTradeOffer);
    } catch (error) {
      console.error('Error fetching galaxy trades:', error);
      return [];
    }
  }

  /**
   * Get cross-galaxy trades
   */
  static async getCrossGalaxyTrades(sessionId: string): Promise<FlexibleTradeOffer[]> {
    try {
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('isCrossGalaxy', '==', true)
      );

      const tradeDocs = await getDocs(tradesQuery);
      return tradeDocs.docs.map(doc => doc.data() as FlexibleTradeOffer);
    } catch (error) {
      console.error('Error fetching cross-galaxy trades:', error);
      return [];
    }
  }

  /**
   * Get trade statistics by galaxy
   */
  static async getGalaxyTradeStatistics(sessionId: string, galaxyId: string): Promise<{
    totalTrades: number;
    successfulTrades: number;
    crossGalaxyTrades: number;
    averageTradeValue: number;
    mostTradedResource: string;
  }> {
    const trades = await this.getGalaxyTrades(sessionId, galaxyId);
    const crossGalaxyTrades = trades.filter(t => t.isCrossGalaxy);
    const successfulTrades = trades.filter(t => t.status === 'completed' || t.status === 'accepted');

    // Calculate average trade value
    let totalValue = 0;
    const resourceCounts: Record<string, number> = {};

    successfulTrades.forEach(trade => {
      Object.entries(trade.offerResources).forEach(([resource, amount]) => {
        if (typeof amount === 'number') {
          totalValue += amount;
          resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
        }
      });

      Object.entries(trade.requestResources).forEach(([resource, amount]) => {
        if (typeof amount === 'number') {
          totalValue += amount;
          resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
        }
      });
    });

    const averageTradeValue = successfulTrades.length > 0 ? totalValue / successfulTrades.length : 0;
    const mostTradedResource = Object.entries(resourceCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalTrades: trades.length,
      successfulTrades: successfulTrades.length,
      crossGalaxyTrades: crossGalaxyTrades.length,
      averageTradeValue,
      mostTradedResource
    };
  }

  /**
   * Check if teams can trade (galaxy restrictions)
   */
  static async canTeamsTrade(
    sessionId: string,
    initiatorTeamId: string,
    targetTeamId: string
  ): Promise<{ canTrade: boolean; reason?: string }> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      return { canTrade: false, reason: 'Session not found' };
    }

    const initiatorTeam = session.teams.find(t => t.id === initiatorTeamId);
    const targetTeam = session.teams.find(t => t.id === targetTeamId);

    if (!initiatorTeam || !targetTeam) {
      return { canTrade: false, reason: 'One or both teams not found' };
    }

    const initiatorGalaxyId = initiatorTeam.galaxyId!;
    const targetGalaxyId = targetTeam.galaxyId!;
    const isCrossGalaxy = initiatorGalaxyId !== targetGalaxyId;

    if (isCrossGalaxy) {
      const initiatorGalaxy = await galaxyService.getGalaxy(initiatorGalaxyId);
      const targetGalaxy = await galaxyService.getGalaxy(targetGalaxyId);

      if (!initiatorGalaxy || !targetGalaxy) {
        return { canTrade: false, reason: 'Galaxy configuration not found' };
      }

      const initiatorRules = this.getGalaxyTradeRestrictions(initiatorGalaxy);
      const targetRules = this.getGalaxyTradeRestrictions(targetGalaxy);

      if (!initiatorRules.allowCrossGalaxyTrade || !targetRules.allowCrossGalaxyTrade) {
        return { canTrade: false, reason: 'Cross-galaxy trading not allowed' };
      }
    }

    return { canTrade: true };
  }
}