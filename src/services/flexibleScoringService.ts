/**
 * Flexible Scoring Service
 * 
 * Extends the standard scoring system to support multi-galaxy scoring
 * with galaxy-specific rules and cross-galaxy comparisons
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { ScoringService } from './scoringService';
import FlexibleGameService from './flexibleGameService';
import { galaxyService } from './galaxyService';
import type { Colony, Resources } from '../types';
import type { Galaxy, SpecialRule } from '../types/galaxy.types';

interface GalaxyScoreConfig {
  resourceWeights: Record<string, number>;
  bonusMultipliers: {
    survivalBonus: number;
    tradingBonus: number;
    investmentBonus: number;
    diplomacyBonus: number;
    specialRuleBonus: number;
  };
  penaltyFactors: {
    eliminationPenalty: number;
    resourceWastePenalty: number;
    inactivityPenalty: number;
  };
}

interface TeamScore {
  teamId: string;
  teamName: string;
  galaxyId: string;
  baseScore: number;
  bonusPoints: number;
  penalties: number;
  finalScore: number;
  rank: number;
  galaxyRank: number;
  breakdown: {
    resourceValue: number;
    survivalBonus: number;
    tradingBonus: number;
    investmentBonus: number;
    diplomacyBonus: number;
    specialRuleBonus: number;
    eliminationPenalty: number;
    resourceWastePenalty: number;
    inactivityPenalty: number;
  };
}

interface GalaxyLeaderboard {
  galaxyId: string;
  galaxyName: string;
  teams: TeamScore[];
  averageScore: number;
  totalParticipants: number;
  activePlayers: number;
}

interface CrossGalaxyLeaderboard {
  overallRankings: TeamScore[];
  galaxyRankings: GalaxyLeaderboard[];
  statistics: {
    totalTeams: number;
    totalGalaxies: number;
    highestScore: number;
    averageScore: number;
    competitiveBalance: number; // measure of how balanced the galaxies are
  };
}

export default class FlexibleScoringService extends ScoringService {
  /**
   * Calculate comprehensive score for a team in a galaxy
   */
  static async calculateFlexibleTeamScore(
    sessionId: string,
    teamId: string
  ): Promise<TeamScore> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const team = session.teams.find(t => t.id === teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const galaxy = await galaxyService.getGalaxy(team.galaxyId!);
    if (!galaxy) {
      throw new Error('Galaxy not found');
    }

    const scoreConfig = this.getGalaxyScoreConfig(galaxy);
    
    // Calculate base resource value
    const resourceValue = this.calculateResourceValue(team.resources, scoreConfig.resourceWeights);
    
    // Calculate bonuses
    const survivalBonus = this.calculateSurvivalBonus(team, scoreConfig, session.currentRound);
    const tradingBonus = await this.calculateTradingBonus(sessionId, teamId, scoreConfig);
    const investmentBonus = this.calculateInvestmentBonus(team, scoreConfig);
    const diplomacyBonus = await this.calculateDiplomacyBonus(sessionId, teamId, scoreConfig);
    const specialRuleBonus = this.calculateSpecialRuleBonus(team, galaxy, scoreConfig);
    
    // Calculate penalties
    const eliminationPenalty = this.calculateEliminationPenalty(team, scoreConfig);
    const resourceWastePenalty = this.calculateResourceWastePenalty(team, scoreConfig);
    const inactivityPenalty = await this.calculateInactivityPenalty(sessionId, teamId, scoreConfig);
    
    // Calculate final scores
    const baseScore = resourceValue;
    const bonusPoints = survivalBonus + tradingBonus + investmentBonus + diplomacyBonus + specialRuleBonus;
    const penalties = eliminationPenalty + resourceWastePenalty + inactivityPenalty;
    const finalScore = Math.max(0, baseScore + bonusPoints - penalties);

    return {
      teamId,
      teamName: team.name,
      galaxyId: team.galaxyId!,
      baseScore,
      bonusPoints,
      penalties,
      finalScore,
      rank: 0, // Will be set when generating leaderboards
      galaxyRank: 0, // Will be set when generating leaderboards
      breakdown: {
        resourceValue,
        survivalBonus,
        tradingBonus,
        investmentBonus,
        diplomacyBonus,
        specialRuleBonus,
        eliminationPenalty,
        resourceWastePenalty,
        inactivityPenalty
      }
    };
  }

  /**
   * Generate cross-galaxy leaderboard
   */
  static async generateCrossGalaxyLeaderboard(sessionId: string): Promise<CrossGalaxyLeaderboard> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate scores for all teams
    const teamScores: TeamScore[] = [];
    for (const team of session.teams) {
      const score = await this.calculateFlexibleTeamScore(sessionId, team.id);
      teamScores.push(score);
    }

    // Sort teams by final score for overall rankings
    const overallRankings = [...teamScores].sort((a, b) => b.finalScore - a.finalScore);
    overallRankings.forEach((team, index) => {
      team.rank = index + 1;
    });

    // Group by galaxy and create galaxy leaderboards
    const galaxyRankings: GalaxyLeaderboard[] = [];
    const galaxyGroups = this.groupBy(teamScores, 'galaxyId');

    for (const [galaxyId, galaxyTeams] of Object.entries(galaxyGroups)) {
      const galaxy = await galaxyService.getGalaxy(galaxyId);
      if (!galaxy) continue;

      // Sort teams within galaxy
      const sortedGalaxyTeams = galaxyTeams.sort((a, b) => b.finalScore - a.finalScore);
      sortedGalaxyTeams.forEach((team, index) => {
        team.galaxyRank = index + 1;
      });

      const averageScore = galaxyTeams.reduce((sum, team) => sum + team.finalScore, 0) / galaxyTeams.length;
      const activePlayers = session.teams
        .filter(t => t.galaxyId === galaxyId && !t.eliminationStatus.isEliminated)
        .reduce((sum, team) => sum + team.players.length, 0);

      galaxyRankings.push({
        galaxyId,
        galaxyName: galaxy.name,
        teams: sortedGalaxyTeams,
        averageScore,
        totalParticipants: galaxyTeams.length,
        activePlayers
      });
    }

    // Calculate statistics
    const statistics = this.calculateLeaderboardStatistics(overallRankings, galaxyRankings);

    // Save leaderboard to database
    await this.saveLeaderboard(sessionId, {
      overallRankings,
      galaxyRankings,
      statistics
    });

    return {
      overallRankings,
      galaxyRankings,
      statistics
    };
  }

  /**
   * Get galaxy-specific score configuration
   */
  private static getGalaxyScoreConfig(galaxy: Galaxy): GalaxyScoreConfig {
    const defaultConfig: GalaxyScoreConfig = {
      resourceWeights: {
        oxygen: 3,
        food: 3,
        water: 3,
        energy: 2.5,
        minerals: 1.5,
        electronics: 2,
        medicine: 2.5,
        luxuryGoods: 1,
        rareMinerals: 3,
        credits: 0.01
      },
      bonusMultipliers: {
        survivalBonus: 100,
        tradingBonus: 50,
        investmentBonus: 75,
        diplomacyBonus: 40,
        specialRuleBonus: 25
      },
      penaltyFactors: {
        eliminationPenalty: 500,
        resourceWastePenalty: 10,
        inactivityPenalty: 25
      }
    };

    // Apply galaxy-specific modifications from special rules
    if (galaxy.specialRules) {
      galaxy.specialRules.forEach(rule => {
        this.applySpecialRuleToScoring(rule, defaultConfig);
      });
    }

    return defaultConfig;
  }

  /**
   * Apply special rule modifications to scoring configuration
   */
  private static applySpecialRuleToScoring(rule: SpecialRule, config: GalaxyScoreConfig): void {
    switch (rule.type) {
      case 'resource_value_modifier':
        if (typeof rule.value === 'object') {
          Object.assign(config.resourceWeights, rule.value);
        }
        break;
      case 'survival_bonus_multiplier':
        if (typeof rule.value === 'number') {
          config.bonusMultipliers.survivalBonus *= rule.value;
        }
        break;
      case 'trading_bonus_multiplier':
        if (typeof rule.value === 'number') {
          config.bonusMultipliers.tradingBonus *= rule.value;
        }
        break;
      case 'elimination_penalty_modifier':
        if (typeof rule.value === 'number') {
          config.penaltyFactors.eliminationPenalty *= rule.value;
        }
        break;
    }
  }

  /**
   * Calculate resource value with galaxy-specific weights
   */
  private static calculateResourceValue(resources: Resources, weights: Record<string, number>): number {
    let totalValue = 0;

    Object.entries(resources).forEach(([resource, amount]) => {
      if (typeof amount === 'number') {
        const weight = weights[resource] || 1;
        totalValue += amount * weight;
      }
    });

    return Math.round(totalValue);
  }

  /**
   * Calculate survival bonus
   */
  private static calculateSurvivalBonus(
    team: Colony,
    config: GalaxyScoreConfig,
    currentRound: number
  ): number {
    if (team.eliminationStatus.isEliminated) return 0;
    
    const roundsActive = currentRound - (team.eliminationStatus.roundsInCritical || 0);
    return roundsActive * config.bonusMultipliers.survivalBonus;
  }

  /**
   * Calculate trading bonus
   */
  private static async calculateTradingBonus(
    sessionId: string,
    teamId: string,
    config: GalaxyScoreConfig
  ): Promise<number> {
    try {
      // Query successful trades involving this team
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('status', 'in', ['accepted', 'completed'])
      );

      const tradeDocs = await getDocs(tradesQuery);
      const teamTrades = tradeDocs.docs.filter(doc => {
        const trade = doc.data();
        return trade.initiatorId === teamId || trade.targetId === teamId;
      });

      return teamTrades.length * config.bonusMultipliers.tradingBonus;
    } catch (error) {
      console.error('Error calculating trading bonus:', error);
      return 0;
    }
  }

  /**
   * Calculate investment bonus
   */
  private static calculateInvestmentBonus(team: Colony, config: GalaxyScoreConfig): number {
    const totalInvestments = Object.values(team.investments).reduce((sum, val) => sum + val, 0);
    return totalInvestments * config.bonusMultipliers.investmentBonus;
  }

  /**
   * Calculate diplomacy bonus based on trade relationships
   */
  private static async calculateDiplomacyBonus(
    sessionId: string,
    teamId: string,
    config: GalaxyScoreConfig
  ): Promise<number> {
    try {
      // Get unique trading partners
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('status', 'in', ['accepted', 'completed'])
      );

      const tradeDocs = await getDocs(tradesQuery);
      const tradingPartners = new Set<string>();

      tradeDocs.docs.forEach(doc => {
        const trade = doc.data();
        if (trade.initiatorId === teamId) {
          tradingPartners.add(trade.targetId);
        } else if (trade.targetId === teamId) {
          tradingPartners.add(trade.initiatorId);
        }
      });

      return tradingPartners.size * config.bonusMultipliers.diplomacyBonus;
    } catch (error) {
      console.error('Error calculating diplomacy bonus:', error);
      return 0;
    }
  }

  /**
   * Calculate special rule bonus
   */
  private static calculateSpecialRuleBonus(
    team: Colony,
    galaxy: Galaxy,
    config: GalaxyScoreConfig
  ): number {
    let bonus = 0;

    if (galaxy.specialRules) {
      galaxy.specialRules.forEach(rule => {
        // Check if team meets special rule conditions
        if (this.teamMeetsSpecialRuleCondition(team, rule)) {
          bonus += config.bonusMultipliers.specialRuleBonus;
        }
      });
    }

    return bonus;
  }

  /**
   * Check if team meets special rule condition
   */
  private static teamMeetsSpecialRuleCondition(team: Colony, rule: SpecialRule): boolean {
    switch (rule.type) {
      case 'type_bonus':
        return typeof rule.value === 'string' && team.type === rule.value;
      case 'resource_threshold':
        if (typeof rule.value === 'object') {
          const threshold = rule.value as Record<string, number>;
          return Object.entries(threshold).every(([resource, amount]) => {
            return (team.resources[resource as keyof Resources] as number) >= amount;
          });
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Calculate elimination penalty
   */
  private static calculateEliminationPenalty(team: Colony, config: GalaxyScoreConfig): number {
    return team.eliminationStatus.isEliminated ? config.penaltyFactors.eliminationPenalty : 0;
  }

  /**
   * Calculate resource waste penalty
   */
  private static calculateResourceWastePenalty(team: Colony, config: GalaxyScoreConfig): number {
    // Penalty for having excessive resources without trading/investing
    const excessThreshold = 100;
    let penalty = 0;

    Object.values(team.resources).forEach(amount => {
      if (typeof amount === 'number' && amount > excessThreshold) {
        penalty += (amount - excessThreshold) * 0.1;
      }
    });

    return penalty * config.penaltyFactors.resourceWastePenalty;
  }

  /**
   * Calculate inactivity penalty
   */
  private static async calculateInactivityPenalty(
    sessionId: string,
    teamId: string,
    config: GalaxyScoreConfig
  ): Promise<number> {
    try {
      // Check recent activity (trades, investments, etc.)
      const recentThreshold = Date.now() - (30 * 60 * 1000); // 30 minutes
      
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('timestamp', '>=', recentThreshold)
      );

      const tradeDocs = await getDocs(tradesQuery);
      const hasRecentActivity = tradeDocs.docs.some(doc => {
        const trade = doc.data();
        return trade.initiatorId === teamId || trade.targetId === teamId;
      });

      return hasRecentActivity ? 0 : config.penaltyFactors.inactivityPenalty;
    } catch (error) {
      console.error('Error calculating inactivity penalty:', error);
      return 0;
    }
  }

  /**
   * Calculate leaderboard statistics
   */
  private static calculateLeaderboardStatistics(
    overallRankings: TeamScore[],
    galaxyRankings: GalaxyLeaderboard[]
  ): CrossGalaxyLeaderboard['statistics'] {
    const totalTeams = overallRankings.length;
    const totalGalaxies = galaxyRankings.length;
    const highestScore = overallRankings[0]?.finalScore || 0;
    const averageScore = overallRankings.reduce((sum, team) => sum + team.finalScore, 0) / totalTeams;

    // Calculate competitive balance (coefficient of variation)
    const galaxyAverages = galaxyRankings.map(g => g.averageScore);
    const galaxyAverage = galaxyAverages.reduce((sum, avg) => sum + avg, 0) / galaxyAverages.length;
    const variance = galaxyAverages.reduce((sum, avg) => sum + Math.pow(avg - galaxyAverage, 2), 0) / galaxyAverages.length;
    const competitiveBalance = Math.max(0, 1 - (Math.sqrt(variance) / galaxyAverage));

    return {
      totalTeams,
      totalGalaxies,
      highestScore,
      averageScore,
      competitiveBalance
    };
  }

  /**
   * Save leaderboard to database
   */
  private static async saveLeaderboard(
    sessionId: string,
    leaderboard: CrossGalaxyLeaderboard
  ): Promise<void> {
    await setDoc(doc(firestore, 'leaderboards', sessionId), {
      ...leaderboard,
      updatedAt: Date.now(),
      version: '1.0'
    });
  }

  /**
   * Get historical leaderboard
   */
  static async getHistoricalLeaderboard(sessionId: string): Promise<CrossGalaxyLeaderboard | null> {
    try {
      const leaderboardDoc = await getDoc(doc(firestore, 'leaderboards', sessionId));
      if (!leaderboardDoc.exists()) return null;
      
      return leaderboardDoc.data() as CrossGalaxyLeaderboard;
    } catch (error) {
      console.error('Error fetching historical leaderboard:', error);
      return null;
    }
  }

  /**
   * Compare team performance across sessions
   */
  static async compareTeamPerformance(
    teamName: string,
    sessionIds: string[]
  ): Promise<{
    teamName: string;
    sessions: Array<{
      sessionId: string;
      score: number;
      rank: number;
      galaxyRank: number;
      totalTeams: number;
    }>;
    averageScore: number;
    averageRank: number;
  }> {
    const sessions: any[] = [];
    let totalScore = 0;
    let totalRank = 0;

    for (const sessionId of sessionIds) {
      const leaderboard = await this.getHistoricalLeaderboard(sessionId);
      if (!leaderboard) continue;

      const teamScore = leaderboard.overallRankings.find(t => t.teamName === teamName);
      if (teamScore) {
        sessions.push({
          sessionId,
          score: teamScore.finalScore,
          rank: teamScore.rank,
          galaxyRank: teamScore.galaxyRank,
          totalTeams: leaderboard.statistics.totalTeams
        });

        totalScore += teamScore.finalScore;
        totalRank += teamScore.rank;
      }
    }

    const averageScore = sessions.length > 0 ? totalScore / sessions.length : 0;
    const averageRank = sessions.length > 0 ? totalRank / sessions.length : 0;

    return {
      teamName,
      sessions,
      averageScore,
      averageRank
    };
  }

  /**
   * Utility function to group array by property
   */
  private static groupBy<T>(array: T[], property: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = String(item[property]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}