import { 
  ref as dbRef, 
  set as dbSet, 
  push as dbPush,
  onValue,
  off 
} from 'firebase/database';
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { firestore, realtimeDb } from '../firebase/config';
import type { 
  TeamScore,
  RoundScore,
  ScoringRules
} from '../types/gameEngine';
import { DEFAULT_SCORING_RULES } from '../types/gameEngine';
import type { 
  Colony, 
  Resources,
  Investments
} from '../types';

export interface ScoringConfig {
  sessionId: string;
  rules: ScoringRules;
  enableRealTimeUpdates: boolean;
  calculateTrends: boolean;
  trackAchievements: boolean;
  debug: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: 'survival' | 'trading' | 'strategy' | 'cooperation' | 'efficiency';
  condition: (team: Colony, stats: TeamStatistics) => boolean;
  points: number;
  rarity: 'common' | 'rare' | 'legendary';
  icon: string;
}

export interface TeamStatistics {
  teamId: string;
  totalTrades: number;
  successfulTrades: number;
  tradeSuccessRate: number;
  uniqueTradingPartners: number;
  totalResourcesTraded: number;
  roundsSurvived: number;
  roundsInCritical: number;
  totalInvestments: number;
  investmentTypes: number;
  specialtyResourceGenerated: number;
  achievements: Achievement[];
  lastUpdated: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  teamId: string;
  teamName: string;
  colonyType: string;
  currentScore: number;
  previousScore: number;
  trend: 'up' | 'down' | 'same';
  change: number;
  badge?: string;
  isEliminated: boolean;
}

export interface ScoreBreakdown {
  teamId: string;
  totalScore: number;
  survivalScore: number;
  resourceScore: number;
  tradeScore: number;
  investmentScore: number;
  achievementScore: number;
  efficiencyMultiplier: number;
  penalties: number;
  bonuses: number;
  breakdown: Record<string, number>;
}

export class ScoringService {
  private static instances: Map<string, ScoringService> = new Map();
  private config: ScoringConfig;
  private teamStats: Map<string, TeamStatistics> = new Map();
  private achievements: Achievement[] = [];
  private leaderboard: LeaderboardEntry[] = [];
  private scoreHistory: Map<string, RoundScore[]> = new Map();
  private realtimeListeners: Array<() => void> = [];

  protected constructor(config: ScoringConfig) {
    this.config = config;

    this.initializeAchievements();

    if (this.config.enableRealTimeUpdates) {
      this.setupRealtimeUpdates();
    }
  }

  static getInstance(sessionId: string, config?: Partial<ScoringConfig>): ScoringService {
    if (!ScoringService.instances.has(sessionId)) {
      const fullConfig: ScoringConfig = {
        sessionId,
        rules: config?.rules || DEFAULT_SCORING_RULES,
        enableRealTimeUpdates: config?.enableRealTimeUpdates ?? true,
        calculateTrends: config?.calculateTrends ?? true,
        trackAchievements: config?.trackAchievements ?? true,
        debug: config?.debug ?? false
      };

      ScoringService.instances.set(sessionId, new ScoringService(fullConfig));
    }

    return ScoringService.instances.get(sessionId)!;
  }

  /**
   * Calculate comprehensive score for a team
   */
  async calculateTeamScore(team: Colony, round: number): Promise<TeamScore> {
    try {
      const stats = await this.getOrCreateTeamStatistics(team.id);
      
      // Update statistics
      await this.updateTeamStatistics(team, round);

      // Calculate score components
      const survivalScore = this.calculateSurvivalScore(team);
      const resourceScore = this.calculateResourceScore(team.resources);
      const tradeScore = this.calculateTradeScore(stats);
      const investmentScore = this.calculateInvestmentScore(team.investments);
      const achievementScore = this.calculateAchievementScore(stats.achievements);

      // Calculate multipliers
      const efficiencyMultiplier = this.calculateEfficiencyMultiplier(stats);

      // Calculate penalties
      const penalties = this.calculatePenalties(team, stats);

      // Calculate final score
      const baseScore = survivalScore + resourceScore + tradeScore + investmentScore + achievementScore;
      const adjustedScore = (baseScore * efficiencyMultiplier) - penalties;
      const currentScore = Math.max(0, Math.floor(adjustedScore));

      // Get previous score for trend calculation
      const previousScore = await this.getPreviousScore(team.id, round);
      const trend = this.calculateTrend(currentScore, previousScore);

      // Create round score record
      const roundScore: RoundScore = {
        round,
        phase: 'round_1_trading', // This would be passed in or determined from context
        score: currentScore,
        resourcesConsumed: {
          oxygen: this.config.rules.baseScore.survival,
          food: this.config.rules.baseScore.survival,
          water: this.config.rules.baseScore.survival,
          energy: this.config.rules.baseScore.survival
        },
        resourcesGenerated: {},
        tradesCompleted: stats.totalTrades,
        isInCriticalMode: this.isInCriticalMode(team),
        timestamp: Date.now()
      };

      // Store round score
      await this.storeRoundScore(team.id, roundScore);

      const teamScore: TeamScore = {
        teamId: team.id,
        teamName: team.name,
        colonyType: team.type,
        currentScore,
        survivalScore,
        resourceScore,
        tradeScore,
        investmentScore,
        efficiencyMultiplier,
        rank: 0, // Will be set when leaderboard is calculated
        trend,
        roundScores: await this.getRoundScores(team.id)
      };

      this.log(`Score calculated for ${team.name}: ${currentScore} points`);

      return teamScore;

    } catch (error) {
      console.error(`Error calculating score for team ${team.id}:`, error);
      throw error;
    }
  }

  /**
   * Update the leaderboard with current scores
   */
  async updateLeaderboard(teams: Colony[], round: number): Promise<LeaderboardEntry[]> {
    try {
      const teamScores = await Promise.all(
        teams.map(team => this.calculateTeamScore(team, round))
      );

      // Sort by score descending
      teamScores.sort((a, b) => b.currentScore - a.currentScore);

      // Create leaderboard entries
      const previousLeaderboard = [...this.leaderboard];
      this.leaderboard = teamScores.map((teamScore, index) => {
        const previousEntry = previousLeaderboard.find(entry => entry.teamId === teamScore.teamId);
        const previousRank = previousEntry?.rank || index + 1;
        const previousScore = previousEntry?.currentScore || 0;

        const entry: LeaderboardEntry = {
          rank: index + 1,
          previousRank,
          teamId: teamScore.teamId,
          teamName: teamScore.teamName,
          colonyType: teamScore.colonyType,
          currentScore: teamScore.currentScore,
          previousScore,
          trend: teamScore.trend,
          change: teamScore.currentScore - previousScore,
          isEliminated: teams.find(t => t.id === teamScore.teamId)?.eliminationStatus.isEliminated || false
        };

        // Add badges for special positions
        if (entry.rank === 1) entry.badge = 'champion';
        else if (entry.rank === 2) entry.badge = 'runner-up';
        else if (entry.rank === 3) entry.badge = 'third-place';
        else if (entry.change > 100) entry.badge = 'rising-star';
        else if (entry.trend === 'up' && entry.rank <= 5) entry.badge = 'trending-up';

        return entry;
      });

      // Update team scores with ranks
      teamScores.forEach((teamScore, index) => {
        teamScore.rank = index + 1;
      });

      // Store leaderboard
      await this.storeLeaderboard(this.leaderboard, round);

      // Update real-time leaderboard
      if (this.config.enableRealTimeUpdates) {
        await this.updateRealtimeLeaderboard(this.leaderboard);
      }

      this.log(`Leaderboard updated for round ${round} with ${this.leaderboard.length} teams`);

      return this.leaderboard;

    } catch (error) {
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get detailed score breakdown for a team
   */
  async getScoreBreakdown(teamId: string): Promise<ScoreBreakdown> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      const stats = await this.getOrCreateTeamStatistics(teamId);

      const survivalScore = this.calculateSurvivalScore(team);
      const resourceScore = this.calculateResourceScore(team.resources);
      const tradeScore = this.calculateTradeScore(stats);
      const investmentScore = this.calculateInvestmentScore(team.investments);
      const achievementScore = this.calculateAchievementScore(stats.achievements);
      const efficiencyMultiplier = this.calculateEfficiencyMultiplier(stats);
      const penalties = this.calculatePenalties(team, stats);

      const baseScore = survivalScore + resourceScore + tradeScore + investmentScore + achievementScore;
      const totalScore = Math.max(0, Math.floor((baseScore * efficiencyMultiplier) - penalties));

      return {
        teamId,
        totalScore,
        survivalScore,
        resourceScore,
        tradeScore,
        investmentScore,
        achievementScore,
        efficiencyMultiplier,
        penalties,
        bonuses: Math.floor(baseScore * (efficiencyMultiplier - 1)),
        breakdown: {
          'Survival Rounds': survivalScore,
          'Resource Value': resourceScore,
          'Trading Success': tradeScore,
          'Investments': investmentScore,
          'Achievements': achievementScore,
          'Efficiency Bonus': Math.floor(baseScore * (efficiencyMultiplier - 1)),
          'Penalties': -penalties
        }
      };

    } catch (error) {
      console.error(`Error getting score breakdown for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Process achievements for a team
   */
  async processAchievements(team: Colony): Promise<Achievement[]> {
    try {
      const stats = await this.getOrCreateTeamStatistics(team.id);
      const newAchievements: Achievement[] = [];

      for (const achievement of this.achievements) {
        // Check if already earned
        if (stats.achievements.some(a => a.id === achievement.id)) {
          continue;
        }

        // Check if condition is met
        if (achievement.condition(team, stats)) {
          newAchievements.push(achievement);
          stats.achievements.push(achievement);

          // Send achievement notification
          if (this.config.enableRealTimeUpdates) {
            await this.sendAchievementNotification(team.id, achievement);
          }

          this.log(`Achievement unlocked: ${team.name} earned "${achievement.name}"`);
        }
      }

      // Update statistics
      await this.storeTeamStatistics(stats);

      return newAchievements;

    } catch (error) {
      console.error(`Error processing achievements for team ${team.id}:`, error);
      return [];
    }
  }

  /**
   * Get current leaderboard
   */
  getLeaderboard(): LeaderboardEntry[] {
    return [...this.leaderboard];
  }

  /**
   * Get team statistics
   */
  async getTeamStatistics(teamId: string): Promise<TeamStatistics | null> {
    return this.teamStats.get(teamId) || await this.loadTeamStatistics(teamId);
  }

  // Private methods

  private calculateSurvivalScore(team: Colony): number {
    const resources = team.resources;
    const consumption = {
      oxygen: 2, food: 2, water: 1, energy: 3 // Default consumption rates
    };

    const rounds = [
      Math.floor(resources.oxygen / consumption.oxygen),
      Math.floor(resources.food / consumption.food),
      Math.floor(resources.water / consumption.water),
      Math.floor(resources.energy / consumption.energy)
    ];

    const survivableRounds = Math.min(...rounds);
    return survivableRounds * this.config.rules.baseScore.survival;
  }

  private calculateResourceScore(resources: Resources): number {
    // Basic resources worth more
    const basicValue = 
      resources.oxygen * 5 +
      resources.food * 5 +
      resources.water * 3 +
      resources.energy * 4;

    // Advanced materials
    const advancedValue = 
      resources.minerals * 2 +
      resources.alloys * 3 +
      resources.techComponents * 4;

    // Services and tech
    const specialtyValue = 
      resources.defenseContracts * 3 +
      resources.systemRepairs * 2 +
      resources.transportRoutes * 2 +
      resources.techPatents * 5 +
      resources.blueprints * 4 +
      resources.alienTech * 10;

    // Credits and intel
    const universalValue = 
      resources.credits * 0.1 +
      (resources.marketIntel?.length || 0) * 10 +
      (resources.surveyReports?.length || 0) * 8 +
      (resources.crisisWarnings?.length || 0) * 15;

    return Math.floor((basicValue + advancedValue + specialtyValue + universalValue) * this.config.rules.baseScore.resourceBonus);
  }

  private calculateTradeScore(stats: TeamStatistics): number {
    const baseTradeScore = stats.successfulTrades * this.config.rules.baseScore.tradeBonus;
    const partnerBonus = stats.uniqueTradingPartners * 25; // Bonus for trading with different teams
    return baseTradeScore + partnerBonus;
  }

  private calculateInvestmentScore(investments: Investments): number {
    const totalInvested = Object.values(investments).reduce((sum, amount) => sum + amount, 0);
    const diversityBonus = Object.values(investments).filter(amount => amount > 0).length * 10;
    return totalInvested + diversityBonus;
  }

  private calculateAchievementScore(achievements: Achievement[]): number {
    return achievements.reduce((total, achievement) => total + achievement.points, 0);
  }

  private calculateEfficiencyMultiplier(stats: TeamStatistics): number {
    let multiplier = 1.0;

    // Trade efficiency
    if (stats.totalTrades > 0) {
      const tradeEfficiency = stats.successfulTrades / stats.totalTrades;
      multiplier += tradeEfficiency * this.config.rules.multipliers.efficiency;
    }

    // Strategy bonus (investment diversity)
    const maxInvestmentTypes = 5;
    const strategyBonus = (stats.investmentTypes / maxInvestmentTypes) * this.config.rules.multipliers.strategy;
    multiplier += strategyBonus;

    // Cooperation bonus
    const cooperationBonus = Math.min(stats.uniqueTradingPartners / 6, 1) * this.config.rules.multipliers.cooperation;
    multiplier += cooperationBonus;

    return multiplier;
  }

  private calculatePenalties(team: Colony, stats: TeamStatistics): number {
    let penalties = 0;

    // Critical mode penalty
    if (this.isInCriticalMode(team)) {
      penalties += this.config.rules.penalties.criticalMode;
    }

    // Historical critical rounds penalty
    penalties += stats.roundsInCritical * this.config.rules.penalties.criticalMode;

    // Elimination penalty
    if (team.eliminationStatus.isEliminated) {
      penalties += this.config.rules.penalties.elimination;
    }

    return penalties;
  }

  private isInCriticalMode(team: Colony): boolean {
    const resources = team.resources;
    return resources.oxygen <= 0 || resources.food <= 0 || resources.water <= 0 || resources.energy <= 0;
  }

  private calculateTrend(currentScore: number, previousScore: number): 'up' | 'down' | 'same' {
    if (currentScore > previousScore) return 'up';
    if (currentScore < previousScore) return 'down';
    return 'same';
  }

  private async getOrCreateTeamStatistics(teamId: string): Promise<TeamStatistics> {
    let stats = this.teamStats.get(teamId);
    
    if (!stats) {
      const loadedStats = await this.loadTeamStatistics(teamId);
      if (!loadedStats) {
        stats = {
          teamId,
          totalTrades: 0,
          successfulTrades: 0,
          tradeSuccessRate: 0,
          uniqueTradingPartners: 0,
          totalResourcesTraded: 0,
          roundsSurvived: 0,
          roundsInCritical: 0,
          totalInvestments: 0,
          investmentTypes: 0,
          specialtyResourceGenerated: 0,
          achievements: [],
          lastUpdated: Date.now()
        };
      } else {
        stats = loadedStats;
      }
      this.teamStats.set(teamId, stats);
    }

    return stats;
  }

  private async updateTeamStatistics(team: Colony, round: number): Promise<void> {
    const stats = await this.getOrCreateTeamStatistics(team.id);
    
    // Update basic stats
    stats.roundsSurvived = Math.max(stats.roundsSurvived, round);
    stats.totalInvestments = Object.values(team.investments).reduce((sum, amount) => sum + amount, 0);
    stats.investmentTypes = Object.values(team.investments).filter(amount => amount > 0).length;
    
    if (this.isInCriticalMode(team)) {
      stats.roundsInCritical++;
    }

    // Update trade statistics (would be integrated with trading service)
    // This is a placeholder - real implementation would get data from trading service
    
    stats.lastUpdated = Date.now();
    await this.storeTeamStatistics(stats);
  }

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

  private async getPreviousScore(teamId: string, currentRound: number): Promise<number> {
    const roundScores = await this.getRoundScores(teamId);
    const previousRoundScore = roundScores.find(score => score.round === currentRound - 1);
    return previousRoundScore?.score || 0;
  }

  private async getRoundScores(teamId: string): Promise<RoundScore[]> {
    let scores = this.scoreHistory.get(teamId);
    
    if (!scores) {
      scores = await this.loadRoundScores(teamId);
      this.scoreHistory.set(teamId, scores);
    }

    return scores;
  }

  private async storeRoundScore(teamId: string, roundScore: RoundScore): Promise<void> {
    const scores = await this.getRoundScores(teamId);
    scores.push(roundScore);
    this.scoreHistory.set(teamId, scores);

    // Store in Firestore
    const scoreRef = doc(firestore, 'sessions', this.config.sessionId, 'scores', `${teamId}_round_${roundScore.round}`);
    await setDoc(scoreRef, roundScore);
  }

  private async loadRoundScores(teamId: string): Promise<RoundScore[]> {
    try {
      const scoresRef = collection(firestore, 'sessions', this.config.sessionId, 'scores');
      const q = query(scoresRef, where('teamId', '==', teamId), orderBy('round'));
      const snapshot = await getDocs(q);

      const scores: RoundScore[] = [];
      snapshot.forEach(doc => {
        scores.push(doc.data() as RoundScore);
      });

      return scores;

    } catch (error) {
      console.error(`Error loading round scores for team ${teamId}:`, error);
      return [];
    }
  }

  private async storeTeamStatistics(stats: TeamStatistics): Promise<void> {
    this.teamStats.set(stats.teamId, stats);

    // Store in Firestore
    const statsRef = doc(firestore, 'sessions', this.config.sessionId, 'statistics', stats.teamId);
    await setDoc(statsRef, stats);
  }

  private async loadTeamStatistics(teamId: string): Promise<TeamStatistics | null> {
    try {
      const statsRef = doc(firestore, 'sessions', this.config.sessionId, 'statistics', teamId);
      const statsDoc = await getDoc(statsRef);
      
      return statsDoc.exists() ? statsDoc.data() as TeamStatistics : null;

    } catch (error) {
      console.error(`Error loading statistics for team ${teamId}:`, error);
      return null;
    }
  }

  private async storeLeaderboard(leaderboard: LeaderboardEntry[], round: number): Promise<void> {
    const leaderboardRef = doc(firestore, 'sessions', this.config.sessionId, 'leaderboards', `round_${round}`);
    await setDoc(leaderboardRef, {
      round,
      entries: leaderboard,
      timestamp: Date.now(),
      updatedAt: serverTimestamp()
    });
  }

  private async updateRealtimeLeaderboard(leaderboard: LeaderboardEntry[]): Promise<void> {
    const leaderboardRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/live/leaderboard`);
    await dbSet(leaderboardRef, {
      entries: leaderboard,
      lastUpdated: Date.now()
    });
  }

  private async sendAchievementNotification(teamId: string, achievement: Achievement): Promise<void> {
    const notificationRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/live/notifications`);
    await dbPush(notificationRef, {
      type: 'achievement_unlocked',
      targetTeam: teamId,
      title: `Achievement Unlocked!`,
      message: `You've earned "${achievement.name}" (+${achievement.points} points)`,
      priority: 'medium',
      timestamp: Date.now(),
      data: {
        achievement,
        points: achievement.points
      }
    });
  }

  private setupRealtimeUpdates(): void {
    // Setup realtime listeners for score updates
    const scoresRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/live/scores`);
    
    onValue(scoresRef, (snapshot) => {
      if (snapshot.exists()) {
        this.log('Realtime score update received');
      }
    });

    this.realtimeListeners.push(() => off(scoresRef));
  }

  private initializeAchievements(): void {
    this.achievements = [
      {
        id: 'survivor_5',
        name: 'Survivor',
        description: 'Survive 5 rounds without going critical',
        type: 'survival',
        condition: (_team, stats) => stats.roundsSurvived >= 5 && stats.roundsInCritical === 0,
        points: 100,
        rarity: 'common',
        icon: '🛡️'
      },
      {
        id: 'trader_supreme',
        name: 'Trade Master',
        description: 'Complete 10 successful trades',
        type: 'trading',
        condition: (_team, stats) => stats.successfulTrades >= 10,
        points: 150,
        rarity: 'rare',
        icon: '🤝'
      },
      {
        id: 'diplomat',
        name: 'Diplomat',
        description: 'Trade with all other colony types',
        type: 'cooperation',
        condition: (_team, stats) => stats.uniqueTradingPartners >= 5,
        points: 200,
        rarity: 'rare',
        icon: '🌟'
      },
      {
        id: 'efficiency_expert',
        name: 'Efficiency Expert',
        description: 'Maintain 90% trade success rate with 5+ trades',
        type: 'efficiency',
        condition: (_team, stats) => stats.totalTrades >= 5 && stats.tradeSuccessRate >= 0.9,
        points: 175,
        rarity: 'rare',
        icon: '⚡'
      },
      {
        id: 'resource_hoarder',
        name: 'Resource Hoarder',
        description: 'Accumulate 100+ units of any basic resource',
        type: 'strategy',
        condition: (team, _stats) => {
          return team.resources.oxygen >= 100 || team.resources.food >= 100 || 
                 team.resources.water >= 100 || team.resources.energy >= 100;
        },
        points: 125,
        rarity: 'common',
        icon: '💎'
      },
      {
        id: 'comeback_kid',
        name: 'Comeback Kid',
        description: 'Recover from critical mode and finish in top 3',
        type: 'survival',
        condition: (team, stats) => stats.roundsInCritical > 0 && !team.eliminationStatus.isEliminated,
        points: 250,
        rarity: 'legendary',
        icon: '🔥'
      }
    ];
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Scoring:${this.config.sessionId}] ${message}`);
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
    this.teamStats.clear();
    this.scoreHistory.clear();
    this.leaderboard = [];

    // Remove from instances
    ScoringService.instances.delete(this.config.sessionId);
  }
}