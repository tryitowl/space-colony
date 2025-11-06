import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { firestore as db } from '../firebase/config';
import { galaxyService } from './galaxyService';
import { sessionCodeService } from './sessionCodeService';
import type {
  Galaxy,
  GalaxyConfiguration,
  SessionCodeMapping,
  GalaxyCodeMapping,
  CrossGalaxyTradeRules,
  GalaxyEventTarget,
  VictoryCondition,
  EnhancedColony,
} from '../types/galaxy.types';
import { validateGalaxyConfig } from '../types/galaxy.types';
import type { GameSession } from '../types';

/**
 * Service for managing session-galaxy relationships and multi-galaxy coordination
 */
class SessionGalaxyService {
  /**
   * Initialize a multi-galaxy session
   */
  async initializeMultiGalaxySession(
    sessionId: string,
    galaxyConfiguration: GalaxyConfiguration
  ): Promise<SessionCodeMapping> {
    // Validate configuration
    const validationErrors = validateGalaxyConfig(galaxyConfiguration);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid galaxy configuration: ${validationErrors.join(', ')}`);
    }

    // Generate master code for the session
    const masterCode = await sessionCodeService.generateSessionCode(sessionId);

    // Create galaxies and generate codes
    const galaxyMappings: GalaxyCodeMapping[] = [];
    const batch = writeBatch(db);

    for (let i = 0; i < (galaxyConfiguration.galaxies?.length ?? 0); i++) {
      const galaxyConfig = galaxyConfiguration.galaxies?.[i];
      if (!galaxyConfig) continue;
      
      // Create galaxy
      const galaxy = await galaxyService.createGalaxy(sessionId, galaxyConfig, i);
      
      // Generate unique code for this galaxy
      const galaxyCode = await sessionCodeService.generateSessionCode(
        `${sessionId}_galaxy_${i}`,
        {
          galaxyCode: galaxy.name.substring(0, 3).toUpperCase()
        }
      );

      // Generate teams for the galaxy
      const teams = await galaxyService.generateAndAssignTeams(galaxy.id, sessionId);

      galaxyMappings.push({
        galaxyId: galaxy.id,
        galaxyName: galaxy.name,
        gameCode: galaxyCode,
        teams: teams.map(t => t.id)
      });
    }

    // Create session code mapping
    const codeMapping: SessionCodeMapping = {
      sessionId,
      galaxyMappings,
      masterCode,
      createdAt: Date.now()
    };

    // Store configuration and mappings
    batch.set(doc(db, 'sessionGalaxyConfigs', sessionId), {
      ...galaxyConfiguration,
      codeMapping,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    await batch.commit();

    return codeMapping;
  }

  /**
   * Get galaxy configuration for a session
   */
  async getSessionGalaxyConfiguration(sessionId: string): Promise<GalaxyConfiguration | null> {
    const configDoc = await getDoc(doc(db, 'sessionGalaxyConfigs', sessionId));
    
    if (!configDoc.exists()) {
      return null;
    }

    return configDoc.data() as GalaxyConfiguration;
  }

  /**
   * Update galaxy configuration for a session
   */
  async updateSessionGalaxyConfiguration(
    sessionId: string,
    updates: Partial<GalaxyConfiguration>
  ): Promise<void> {
    // Validate updates if structure is changing
    if (updates.galaxies || updates.crossGalaxyTrading !== undefined) {
      const existing = await this.getSessionGalaxyConfiguration(sessionId);
      if (!existing) {
        throw new Error('Session galaxy configuration not found');
      }

      const updated = { ...existing, ...updates };
      const validationErrors = validateGalaxyConfig(updated);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid galaxy configuration: ${validationErrors.join(', ')}`);
      }
    }

    await updateDoc(doc(db, 'sessionGalaxyConfigs', sessionId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Get code mapping for a session
   */
  async getSessionCodeMapping(sessionId: string): Promise<SessionCodeMapping | null> {
    const configDoc = await getDoc(doc(db, 'sessionGalaxyConfigs', sessionId));
    
    if (!configDoc.exists()) {
      return null;
    }

    const data = configDoc.data();
    return data.codeMapping as SessionCodeMapping;
  }

  /**
   * Enable/disable cross-galaxy trading
   */
  async setCrossGalaxyTrading(
    sessionId: string,
    enabled: boolean,
    rules?: CrossGalaxyTradeRules
  ): Promise<void> {
    const config = await this.getSessionGalaxyConfiguration(sessionId);
    if (!config) {
      throw new Error('Session galaxy configuration not found');
    }

    if (enabled && (config.galaxies || []).length < 2) {
      throw new Error('Cross-galaxy trading requires at least 2 galaxies');
    }

    await updateDoc(doc(db, 'sessionGalaxyConfigs', sessionId), {
      crossGalaxyTrading: enabled,
      crossGalaxyTradeRules: rules,
      updatedAt: Timestamp.now()
    });

    // Update trading rules in real-time database for immediate effect
    if (rules) {
      await this.updateCrossGalaxyTradeRules(sessionId, rules);
    }
  }

  /**
   * Update cross-galaxy trade rules in real-time
   */
  private async updateCrossGalaxyTradeRules(
    sessionId: string,
    rules: CrossGalaxyTradeRules
  ): Promise<void> {
    const batch = writeBatch(db);

    // Store rules in a quickly accessible location
    batch.set(doc(db, 'crossGalaxyRules', sessionId), {
      ...rules,
      sessionId,
      updatedAt: Timestamp.now()
    });

    await batch.commit();
  }

  /**
   * Validate cross-galaxy trade
   */
  async validateCrossGalaxyTrade(
    fromTeamId: string,
    toTeamId: string,
    sessionId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Get teams
    const fromTeamDoc = await getDoc(doc(db, 'teams', fromTeamId));
    const toTeamDoc = await getDoc(doc(db, 'teams', toTeamId));

    if (!fromTeamDoc.exists() || !toTeamDoc.exists()) {
      return { valid: false, reason: 'One or both teams not found' };
    }

    const fromTeam = fromTeamDoc.data() as EnhancedColony;
    const toTeam = toTeamDoc.data() as EnhancedColony;

    // Check if teams are in different galaxies
    if (fromTeam.galaxyId === toTeam.galaxyId) {
      return { valid: true }; // Same galaxy, no cross-galaxy rules apply
    }

    // Get cross-galaxy rules
    const rulesDoc = await getDoc(doc(db, 'crossGalaxyRules', sessionId));
    if (!rulesDoc.exists()) {
      return { valid: false, reason: 'Cross-galaxy trading not configured' };
    }

    const rules = rulesDoc.data() as CrossGalaxyTradeRules;

    if (!rules.allowed) {
      return { valid: false, reason: 'Cross-galaxy trading is disabled' };
    }

    // Check restrictions
    if (rules.restrictions) {
      // Add distance calculation if needed
      // Add resource type restrictions if needed
    }

    return { valid: true };
  }

  /**
   * Apply galaxy event to specific targets
   */
  async applyGalaxyEvent(
    sessionId: string,
    eventId: string,
    target: GalaxyEventTarget,
    eventData: any
  ): Promise<string[]> {
    const config = await this.getSessionGalaxyConfiguration(sessionId);
    if (!config) {
      throw new Error('Session galaxy configuration not found');
    }

    let targetGalaxyIds: string[] = [];

    // Determine target galaxies
    switch (target.type) {
      case 'all':
        targetGalaxyIds = (config.galaxies || []).map(g => g.id);
        break;
      
      case 'specific':
        targetGalaxyIds = target.galaxyIds;
        break;
      
      case 'random':
        const shuffled = [...(config.galaxies || [])].sort(() => Math.random() - 0.5);
        targetGalaxyIds = shuffled.slice(0, target.count).map(g => g.id);
        break;
      
      case 'conditional':
        targetGalaxyIds = (config.galaxies ?? [])
          .filter(target.condition)
          .map(g => g.id);
        break;
    }

    // Apply event to each target galaxy
    const batch = writeBatch(db);

    for (const galaxyId of targetGalaxyIds) {
      batch.set(doc(collection(db, 'galaxyEvents')), {
        sessionId,
        galaxyId,
        eventId,
        eventData,
        appliedAt: Timestamp.now()
      });
    }

    await batch.commit();

    return targetGalaxyIds;
  }

  /**
   * Calculate cross-galaxy leaderboard
   */
  async calculateCrossGalaxyLeaderboard(sessionId: string): Promise<{
    galaxyLeaderboard: Array<{ galaxyId: string; galaxyName: string; score: number }>;
    teamLeaderboard: Array<{ teamId: string; teamName: string; galaxyId: string; score: number }>;
    overallWinners: string[];
  }> {
    const config = await this.getSessionGalaxyConfiguration(sessionId);
    if (!config) {
      throw new Error('Session galaxy configuration not found');
    }

    const galaxyScores: Record<string, { name: string; score: number; teams: EnhancedColony[] }> = {};
    const teamScores: Array<{ teamId: string; teamName: string; galaxyId: string; score: number }> = [];

    // Collect scores for each galaxy
    for (const galaxy of (config.galaxies || [])) {
      const teams = await galaxyService.getGalaxyTeams(galaxy.id);
      
      let galaxyTotalScore = 0;
      
      for (const team of teams) {
        const teamScore = this.calculateTeamScore(team, config.victoryConditions || []);
        teamScores.push({
          teamId: team.id,
          teamName: team.name,
          galaxyId: galaxy.id,
          score: teamScore
        });
        galaxyTotalScore += teamScore;
      }

      galaxyScores[galaxy.id] = {
        name: galaxy.name,
        score: galaxyTotalScore / teams.length, // Average score
        teams
      };
    }

    // Sort leaderboards
    const galaxyLeaderboard = Object.entries(galaxyScores)
      .map(([galaxyId, data]) => ({
        galaxyId,
        galaxyName: data.name,
        score: data.score
      }))
      .sort((a, b) => b.score - a.score);

    const teamLeaderboard = teamScores.sort((a, b) => b.score - a.score);

    // Determine overall winners based on competition mode
    let overallWinners: string[] = [];

    switch (config.competitionMode) {
      case 'individual':
        overallWinners = [teamLeaderboard[0]?.teamId].filter(Boolean);
        break;
      
      case 'galaxy':
        const winningGalaxy = galaxyLeaderboard[0];
        if (winningGalaxy) {
          overallWinners = galaxyScores[winningGalaxy.galaxyId].teams.map(t => t.id);
        }
        break;
      
      case 'hybrid':
        // Top team from each galaxy
        const topTeamsByGalaxy = new Map<string, string>();
        for (const team of teamLeaderboard) {
          if (!topTeamsByGalaxy.has(team.galaxyId)) {
            topTeamsByGalaxy.set(team.galaxyId, team.teamId);
          }
        }
        overallWinners = Array.from(topTeamsByGalaxy.values());
        break;
    }

    return {
      galaxyLeaderboard,
      teamLeaderboard,
      overallWinners
    };
  }

  /**
   * Calculate team score based on victory conditions
   */
  private calculateTeamScore(
    team: EnhancedColony,
    _victoryConditions: VictoryCondition[]
  ): number {
    let score = 0;

    // Base score from resources
    score += Object.values(team.resources).reduce((sum, val) => sum + val, 0);

    // Add metrics-based scoring
    if (team.metrics) {
      score += team.metrics.totalResourcesGained * 0.5;
      score -= team.metrics.totalResourcesLost * 0.3;
      score += team.metrics.tradesCompleted * 100;
      score += team.metrics.survivalRounds * 200;
      score += team.metrics.investmentEfficiency * 50;
      score += team.metrics.diplomaticScore * 75;
    }

    // Apply victory condition modifiers
    // This would be expanded based on specific victory conditions

    return Math.round(score);
  }

  /**
   * Enforce galaxy-specific rules
   */
  async enforceGalaxyRules(
    galaxyId: string,
    action: string,
    context: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    const galaxy = await galaxyService.getGalaxy(galaxyId);
    if (!galaxy) {
      return { allowed: false, reason: 'Galaxy not found' };
    }

    // Check special rules
    for (const rule of galaxy.specialRules || []) {
      switch (rule.type) {
        case 'trade_restriction':
          if (action === 'trade') {
            // Implement trade restriction logic
            const config = rule.config;
            if (config && config.bannedResources?.includes(context.resource)) {
              return { allowed: false, reason: `Trading ${context.resource} is restricted in this galaxy` };
            }
          }
          break;

        case 'resource_event':
          // These are handled by the event system
          break;

        case 'win_condition':
          // These are evaluated at game end
          break;

        case 'gameplay_modifier':
          if (rule.config && rule.config.affectedActions?.includes(action)) {
            // Apply modifier logic
          }
          break;
      }
    }

    return { allowed: true };
  }

  /**
   * Get session statistics across all galaxies
   */
  async getMultiGalaxyStatistics(sessionId: string): Promise<{
    totalGalaxies: number;
    totalTeams: number;
    activeTeams: number;
    crossGalaxyTrades: number;
    averageGalaxySize: number;
    largestGalaxy: { id: string; name: string; teams: number };
    smallestGalaxy: { id: string; name: string; teams: number };
  }> {
    const config = await this.getSessionGalaxyConfiguration(sessionId);
    if (!config) {
      throw new Error('Session galaxy configuration not found');
    }

    let totalTeams = 0;
    let activeTeams = 0;
    let largestGalaxy = { id: '', name: '', teams: 0 };
    let smallestGalaxy = { id: '', name: '', teams: Number.MAX_VALUE };

    for (const galaxy of (config.galaxies || [])) {
      const stats = await galaxyService.getGalaxyStatistics(galaxy.id);
      
      totalTeams += stats.totalTeams;
      activeTeams += stats.activeTeams;

      if (stats.totalTeams > largestGalaxy.teams) {
        largestGalaxy = { id: galaxy.id, name: galaxy.name, teams: stats.totalTeams };
      }

      if (stats.totalTeams < smallestGalaxy.teams) {
        smallestGalaxy = { id: galaxy.id, name: galaxy.name, teams: stats.totalTeams };
      }
    }

    // Count cross-galaxy trades
    const tradesQuery = query(
      collection(db, 'trades'),
      where('sessionId', '==', sessionId),
      where('isCrossGalaxy', '==', true)
    );
    const tradeDocs = await getDocs(tradesQuery);

    return {
      totalGalaxies: (config.galaxies || []).length,
      totalTeams,
      activeTeams,
      crossGalaxyTrades: tradeDocs.size,
      averageGalaxySize: totalTeams / ((config.galaxies || []).length || 1),
      largestGalaxy,
      smallestGalaxy: smallestGalaxy.teams === Number.MAX_VALUE ? largestGalaxy : smallestGalaxy
    };
  }

  /**
   * Migrate single-galaxy session to multi-galaxy
   */
  async migrateToMultiGalaxy(
    sessionId: string,
    additionalGalaxies: Partial<Galaxy>[]
  ): Promise<SessionCodeMapping> {
    // Get existing session data
    const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionDoc.data() as GameSession;

    // Create galaxy configuration from existing session
    const existingGalaxy: Partial<Galaxy> = {
      name: 'Original Galaxy',
      description: 'Original game galaxy',
      totalTeams: sessionData.teams.length,
      colonyTypes: Array.from(new Set(sessionData.teams.map((t: any) => t.type))),
      teamStructure: { mode: 'standard' },
      aiEnabled: sessionData.teams.some((t: any) => t.isAIControlled || false)
    };

    // Create full configuration
    const galaxyConfiguration: GalaxyConfiguration = {
      galaxies: [existingGalaxy, ...additionalGalaxies].map((g, i) => ({
        ...g,
        id: `${sessionId}_galaxy_${i}`,
        name: g.name || `Galaxy ${i + 1}`,
        description: g.description || '',
        totalTeams: g.totalTeams || 6,
        colonyTypes: g.colonyTypes || ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
        teamStructure: g.teamStructure || { mode: 'standard' },
        aiEnabled: g.aiEnabled || false
      } as Galaxy)),
      crossGalaxyTrading: true,
      globalEvents: true,
      sharedMarketIntel: true,
      competitionMode: 'hybrid',
      victoryConditions: []
    };

    // Initialize multi-galaxy session
    return await this.initializeMultiGalaxySession(sessionId, galaxyConfiguration);
  }
}

// Export singleton instance
export const sessionGalaxyService = new SessionGalaxyService();

// Export types
export type { SessionCodeMapping, GalaxyCodeMapping, CrossGalaxyTradeRules };