import { 
  ref as dbRef, 
  update as dbUpdate, 
  push as dbPush
} from 'firebase/database';
import { 
  doc, 
  getDoc, 
  collection,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { firestore, realtimeDb } from '../firebase/config';
import type {
  GamePhase,
  RoundResults,
  TeamScore,
  ResourceConsumption
} from '../types/gameEngine';
import { DEFAULT_RESOURCE_CONSUMPTION } from '../types/gameEngine';
import type { 
  GameSession, 
  Colony, 
  Resources
} from '../types';
import { InvestmentService } from './investmentService';

export interface RoundProgressionConfig {
  sessionId: string;
  autoAdvance: boolean;
  resourceConsumption: ResourceConsumption;
  eliminationThreshold: number;
  gracePeriod: number;
}

export interface RoundEndProcessing {
  sessionId: string;
  round: number;
  phase: GamePhase;
  teams: Colony[];
  tradesCompleted: number;
  marketEvents: string[];
}

export interface InvestmentReturns {
  scouts: { intelGenerated: number; cost: number };
  production: { resourcesGenerated: Record<string, number>; cost: number };
  research: { techPatentsGenerated: number; cost: number };
  communication: { marketIntelGenerated: number; cost: number };
  emergency: { basicResourcesGenerated: Record<string, number>; cost: number };
}

export class RoundService {
  private static instances: Map<string, RoundService> = new Map();
  private config: RoundProgressionConfig;
  private isProcessing = false;

  private constructor(config: RoundProgressionConfig) {
    this.config = config;
  }

  static getInstance(sessionId: string, config?: Partial<RoundProgressionConfig>): RoundService {
    if (!RoundService.instances.has(sessionId)) {
      const fullConfig: RoundProgressionConfig = {
        sessionId,
        autoAdvance: true,
        resourceConsumption: DEFAULT_RESOURCE_CONSUMPTION,
        eliminationThreshold: 2,
        gracePeriod: 30 * 1000, // 30 seconds
        ...config
      };

      RoundService.instances.set(sessionId, new RoundService(fullConfig));
    }

    return RoundService.instances.get(sessionId)!;
  }

  /**
   * Process the end of a trading round
   */
  async processRoundEnd(data: RoundEndProcessing): Promise<RoundResults> {
    if (this.isProcessing) {
      throw new Error('Round processing already in progress');
    }

    this.isProcessing = true;

    try {
      const startTime = Date.now();
      console.log(`Starting round ${data.round} processing for session ${data.sessionId}`);

      // Get current session data
      const sessionDoc = await getDoc(doc(firestore, 'sessions', data.sessionId));
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${data.sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      const batch = writeBatch(firestore);

      // Process each team
      const processedTeams: Array<{
        team: Colony;
        consumed: ResourceConsumption;
        generated: Record<string, number>;
        isEliminated: boolean;
        newCriticalRounds: number;
      }> = [];

      const eliminatedTeams: string[] = [];

      for (const team of data.teams) {
        const result = await this.processTeamRoundEnd(team, data.round);
        processedTeams.push(result);

        if (result.isEliminated) {
          eliminatedTeams.push(team.id);
        }

        // Update team in batch
        const teamIndex = sessionData.teams.findIndex(t => t.id === team.id);
        if (teamIndex !== -1) {
          sessionData.teams[teamIndex] = result.team;
        }
      }

      // Calculate scores
      const scores = await this.calculateScores(processedTeams.map(p => p.team), data.round);

      // Update session data
      batch.update(doc(firestore, 'sessions', data.sessionId), {
        teams: sessionData.teams,
        currentRound: data.round,
        lastProcessedRound: data.round,
        updatedAt: serverTimestamp()
      });

      // Save round results
      const roundResults: RoundResults = {
        round: data.round,
        phase: data.phase,
        startTime: data.phase === 'round_1_trading' ? sessionData.roundStartTime : startTime,
        endTime: Date.now(),
        participatingTeams: data.teams.map(t => t.id),
        eliminatedTeams,
        tradesCompleted: data.tradesCompleted,
        resourcesConsumed: this.aggregateResourceConsumption(processedTeams),
        resourcesGenerated: this.aggregateResourceGeneration(processedTeams),
        scores,
        events: []
      };

      // Store round results
      const roundResultsRef = doc(firestore, 'sessions', data.sessionId, 'rounds', `round_${data.round}`);
      batch.set(roundResultsRef, roundResults);

      // Commit all changes
      await batch.commit();

      // Update realtime database
      await this.updateRealtimeData(data.sessionId, roundResults, eliminatedTeams);

      // Send notifications
      await this.sendRoundEndNotifications(data.sessionId, roundResults);

      console.log(`Round ${data.round} processing completed in ${Date.now() - startTime}ms`);

      return roundResults;

    } catch (error) {
      console.error(`Error processing round end:`, error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual team at round end
   */
  private async processTeamRoundEnd(team: Colony, _round: number): Promise<{
    team: Colony;
    consumed: ResourceConsumption;
    generated: Record<string, number>;
    isEliminated: boolean;
    newCriticalRounds: number;
  }> {
    // Clone team to avoid mutation
    const updatedTeam: Colony = JSON.parse(JSON.stringify(team));

    // Apply resource consumption
    const consumed = this.applyResourceConsumption(updatedTeam);

    // Apply resource generation from investments
    const generated = this.applyInvestmentReturns(updatedTeam);

    // Check for critical mode and elimination
    const { isInCritical, criticalResources } = this.checkCriticalMode(updatedTeam);
    
    let newCriticalRounds = updatedTeam.eliminationStatus.roundsInCritical;
    let isEliminated = false;

    if (isInCritical) {
      newCriticalRounds++;
      updatedTeam.eliminationStatus.criticalResources = criticalResources;
      
      // Check for elimination (2 consecutive rounds in critical mode)
      if (newCriticalRounds >= this.config.eliminationThreshold) {
        isEliminated = true;
        updatedTeam.eliminationStatus.isEliminated = true;
      }
    } else {
      newCriticalRounds = 0;
      updatedTeam.eliminationStatus.criticalResources = [];
    }

    updatedTeam.eliminationStatus.roundsInCritical = newCriticalRounds;

    return {
      team: updatedTeam,
      consumed,
      generated,
      isEliminated,
      newCriticalRounds
    };
  }

  /**
   * Apply resource consumption to a team
   */
  private applyResourceConsumption(team: Colony): ResourceConsumption {
    const consumption = { ...this.config.resourceConsumption };

    // Apply consumption
    team.resources.oxygen = Math.max(0, team.resources.oxygen - consumption.oxygen);
    team.resources.food = Math.max(0, team.resources.food - consumption.food);
    team.resources.water = Math.max(0, team.resources.water - consumption.water);
    team.resources.energy = Math.max(0, team.resources.energy - consumption.energy);

    return consumption;
  }

  /**
   * Apply investment returns to generate resources
   */
  private applyInvestmentReturns(team: Colony): Record<string, number> {
    const generated: Record<string, number> = {};

    // Use the InvestmentService to calculate effects
    const effects = InvestmentService.calculateInvestmentEffects(team.investments, team.type);

    // Scout investment generates intel (handled separately by intel service)
    if (team.investments.scouts > 0) {
      // Store the intel potential for intel service to use
      generated.intel_potential = effects.intelGenerationPerRound;
    }

    // Production investment generates specialty resources based on colony type
    Object.entries(effects.specialtyResourcesPerRound).forEach(([resourceType, amount]) => {
      if (resourceType in team.resources) {
        (team.resources as any)[resourceType] += amount;
        generated[resourceType] = amount;
      }
    });

    // Research investment generates tech patents
    if (effects.techPatentsPerRound > 0) {
      team.resources.techPatents += effects.techPatentsPerRound;
      generated.techPatents = effects.techPatentsPerRound;
    }

    // Communication investment enhances intel generation (handled by intel service)
    if (team.investments.communicationArray > 0) {
      generated.communication_bonus = effects.communicationMultiplier;
    }

    // Emergency reserves are not automatically converted - they're available for manual conversion

    return generated;
  }


  /**
   * Check if team is in critical mode
   */
  private checkCriticalMode(team: Colony): { isInCritical: boolean; criticalResources: string[] } {
    const criticalResources: string[] = [];

    // Check basic resources
    if (team.resources.oxygen <= 0) criticalResources.push('oxygen');
    if (team.resources.food <= 0) criticalResources.push('food');
    if (team.resources.water <= 0) criticalResources.push('water');
    if (team.resources.energy <= 0) criticalResources.push('energy');

    return {
      isInCritical: criticalResources.length > 0,
      criticalResources
    };
  }

  /**
   * Calculate team scores
   */
  private async calculateScores(teams: Colony[], round: number): Promise<TeamScore[]> {
    const scores: TeamScore[] = [];

    for (const team of teams) {
      const score = await this.calculateTeamScore(team, round);
      scores.push(score);
    }

    // Sort by score and assign ranks
    scores.sort((a, b) => b.currentScore - a.currentScore);
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return scores;
  }

  /**
   * Calculate individual team score
   */
  private async calculateTeamScore(team: Colony, _round: number): Promise<TeamScore> {
    // Base survival score (how many rounds they could survive)
    const survivalRounds = this.calculateSurvivalRounds(team.resources);
    const survivalScore = survivalRounds * 100;

    // Resource bonus (total resource value)
    const resourceScore = this.calculateResourceValue(team.resources);

    // Trade bonus (from trading statistics if available)
    const tradeScore = this.calculateTradeScore(team);

    // Investment score
    const investmentScore = this.calculateInvestmentScore(team.investments);

    // Efficiency multiplier based on trade success rate
    const efficiencyMultiplier = this.calculateEfficiencyMultiplier(team);

    // Calculate final score
    const baseScore = survivalScore + resourceScore + tradeScore + investmentScore;
    const currentScore = Math.floor(baseScore * efficiencyMultiplier);

    return {
      teamId: team.id,
      teamName: team.name,
      colonyType: team.type,
      currentScore,
      survivalScore,
      resourceScore,
      tradeScore,
      investmentScore,
      efficiencyMultiplier,
      rank: 0, // Will be set after sorting
      trend: 'same', // Would be calculated by comparing to previous round
      roundScores: [] // Would be populated from historical data
    };
  }

  /**
   * Calculate how many rounds a team could survive
   */
  private calculateSurvivalRounds(resources: Resources): number {
    const rounds = [
      Math.floor(resources.oxygen / this.config.resourceConsumption.oxygen),
      Math.floor(resources.food / this.config.resourceConsumption.food),
      Math.floor(resources.water / this.config.resourceConsumption.water),
      Math.floor(resources.energy / this.config.resourceConsumption.energy)
    ];

    return Math.min(...rounds);
  }

  /**
   * Calculate total resource value
   */
  private calculateResourceValue(resources: Resources): number {
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

    return Math.floor(basicValue + advancedValue + specialtyValue + universalValue);
  }

  /**
   * Calculate trade score (placeholder - would use actual trading statistics)
   */
  private calculateTradeScore(_team: Colony): number {
    // This would integrate with the trading service to get actual statistics
    // For now, return a basic score
    return 0;
  }

  /**
   * Calculate investment score
   */
  private calculateInvestmentScore(investments: any): number {
    const totalInvested = 
      investments.scouts +
      investments.productionUpgrades +
      investments.researchLabs +
      investments.communicationArray +
      investments.emergencyReserves;

    // Bonus for investment diversity
    const investmentTypes = Object.values(investments).filter((v): v is number => typeof v === 'number' && v > 0).length;
    const diversityBonus = investmentTypes * 10;

    return totalInvested + diversityBonus;
  }

  /**
   * Calculate efficiency multiplier
   */
  private calculateEfficiencyMultiplier(_team: Colony): number {
    // Would be based on trading statistics and other efficiency metrics
    // For now, return a base multiplier
    return 1.0;
  }

  /**
   * Aggregate resource consumption across all teams
   */
  private aggregateResourceConsumption(processedTeams: any[]): Record<string, ResourceConsumption> {
    const aggregate: Record<string, ResourceConsumption> = {};

    processedTeams.forEach(processed => {
      aggregate[processed.team.id] = processed.consumed;
    });

    return aggregate;
  }

  /**
   * Aggregate resource generation across all teams
   */
  private aggregateResourceGeneration(processedTeams: any[]): Record<string, any> {
    const aggregate: Record<string, any> = {};

    processedTeams.forEach(processed => {
      aggregate[processed.team.id] = processed.generated;
    });

    return aggregate;
  }

  /**
   * Update realtime database with round results
   */
  private async updateRealtimeData(sessionId: string, results: RoundResults, eliminatedTeams: string[]): Promise<void> {
    const updates: Record<string, any> = {};

    // Update round results
    updates[`sessions/${sessionId}/rounds/round_${results.round}`] = {
      summary: {
        round: results.round,
        participatingTeams: results.participatingTeams.length,
        eliminatedTeams: eliminatedTeams.length,
        tradesCompleted: results.tradesCompleted,
        endTime: results.endTime
      }
    };

    // Update leaderboard
    updates[`sessions/${sessionId}/live/leaderboard`] = results.scores;

    // Update eliminated teams status
    eliminatedTeams.forEach(teamId => {
      updates[`teams/${sessionId}/${teamId}/status/tradingStatus`] = 'eliminated';
      updates[`teams/${sessionId}/${teamId}/status/eliminationRound`] = results.round;
    });

    // Add round completion event
    const eventRef = dbRef(realtimeDb, `sessions/${sessionId}/events`);
    await dbPush(eventRef, {
      type: 'round_completed',
      round: results.round,
      phase: results.phase,
      summary: `Round ${results.round} completed. ${eliminatedTeams.length} teams eliminated.`,
      timestamp: Date.now(),
      data: {
        eliminatedTeams,
        tradesCompleted: results.tradesCompleted,
        topScore: results.scores[0]?.currentScore || 0
      }
    });

    // Apply all updates
    await dbUpdate(dbRef(realtimeDb), updates);
  }

  /**
   * Send round end notifications
   */
  private async sendRoundEndNotifications(sessionId: string, results: RoundResults): Promise<void> {
    const notificationsRef = dbRef(realtimeDb, `sessions/${sessionId}/live/notifications`);

    // General round completion notification
    await dbPush(notificationsRef, {
      type: 'round_completed',
      title: `Round ${results.round} Complete`,
      message: `Resources consumed. ${results.eliminatedTeams.length} teams eliminated.`,
      priority: 'high',
      timestamp: Date.now(),
      data: {
        round: results.round,
        eliminatedCount: results.eliminatedTeams.length
      }
    });

    // Elimination notifications
    for (const teamId of results.eliminatedTeams) {
      await dbPush(notificationsRef, {
        type: 'team_eliminated',
        targetTeam: teamId,
        title: 'Team Eliminated',
        message: 'Your colony has been eliminated due to critical resource shortage.',
        priority: 'critical',
        timestamp: Date.now(),
        data: {
          round: results.round,
          teamId
        }
      });
    }

    // Leaderboard update notification
    if (results.scores.length > 0) {
      await dbPush(notificationsRef, {
        type: 'leaderboard_updated',
        title: 'Leaderboard Updated',
        message: `${results.scores[0].teamName} leads with ${results.scores[0].currentScore} points`,
        priority: 'medium',
        timestamp: Date.now(),
        data: {
          topTeam: results.scores[0]
        }
      });
    }
  }

  /**
   * Get round history for a session
   */
  async getRoundHistory(sessionId: string): Promise<RoundResults[]> {
    try {
      const roundsRef = collection(firestore, 'sessions', sessionId, 'rounds');
      const roundsSnapshot = await getDocs(roundsRef);

      const rounds: RoundResults[] = [];
      roundsSnapshot.forEach(doc => {
        rounds.push(doc.data() as RoundResults);
      });

      // Sort by round number
      rounds.sort((a, b) => a.round - b.round);

      return rounds;

    } catch (error) {
      console.error('Error fetching round history:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    RoundService.instances.delete(this.config.sessionId);
  }
}