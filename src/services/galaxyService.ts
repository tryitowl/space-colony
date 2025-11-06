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
  deleteDoc
} from 'firebase/firestore';
import { firestore as db } from '../firebase/config';
import { teamDataService } from './teamDataService';
import { sessionCodeService } from './sessionCodeService';
import { TeamGenerationService } from './teamGenerationService';
import type {
  Galaxy,
  GalaxyConfiguration,
  TeamStructure,
  ResourceModifiers,
  SpecialRule,
  EnhancedColony,
  TeamAssignment,
  DEFAULT_GALAXY_CONFIGS,
  validateGalaxyConfig
} from '../types/galaxy.types';
import type { ColonyType } from '../types/base.types';

/**
 * Service for managing galaxies within game sessions
 */
class GalaxyService {
  /**
   * Create a new galaxy with the specified configuration
   */
  async createGalaxy(
    sessionId: string,
    galaxyConfig: Partial<Galaxy>,
    index: number = 0
  ): Promise<Galaxy> {
    const galaxyId = `${sessionId}_galaxy_${index}`;
    
    // Apply defaults from templates if available
    const templateName = galaxyConfig.name?.toLowerCase().includes('standard') ? 'standard' :
                       galaxyConfig.name?.toLowerCase().includes('small') ? 'small' :
                       galaxyConfig.name?.toLowerCase().includes('large') ? 'large' : null;
    
    const baseConfig = templateName ? DEFAULT_GALAXY_CONFIGS[templateName] : {};
    
    const galaxy: Galaxy = {
      ...baseConfig,
      id: galaxyId,
      name: galaxyConfig.name || `Galaxy ${index + 1}`,
      description: galaxyConfig.description || 'A space colony galaxy',
      totalTeams: galaxyConfig.totalTeams || 6,
      colonyTypes: galaxyConfig.colonyTypes || ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
      teamStructure: galaxyConfig.teamStructure || { mode: 'standard' },
      resourceModifiers: galaxyConfig.resourceModifiers,
      specialRules: galaxyConfig.specialRules || [],
      aiEnabled: galaxyConfig.aiEnabled || false,
      aiDifficulty: galaxyConfig.aiDifficulty,
      ...galaxyConfig,
    };

    // Validate galaxy configuration
    this.validateGalaxy(galaxy);

    // Store in Firestore
    await setDoc(doc(db, 'galaxies', galaxyId), {
      ...galaxy,
      sessionId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return galaxy;
  }

  /**
   * Create multiple galaxies for a session
   */
  async createGalaxiesForSession(
    sessionId: string,
    galaxyConfigs: Partial<Galaxy>[]
  ): Promise<Galaxy[]> {
    const batch = writeBatch(db);
    const galaxies: Galaxy[] = [];

    for (let i = 0; i < galaxyConfigs.length; i++) {
      const galaxy = await this.createGalaxy(sessionId, galaxyConfigs[i], i);
      galaxies.push(galaxy);
      
      // Add to batch
      batch.set(doc(db, 'galaxies', galaxy.id), {
        ...galaxy,
        sessionId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    await batch.commit();
    return galaxies;
  }

  /**
   * Get galaxy by ID
   */
  async getGalaxy(galaxyId: string): Promise<Galaxy | null> {
    const galaxyDoc = await getDoc(doc(db, 'galaxies', galaxyId));
    
    if (!galaxyDoc.exists()) {
      return null;
    }

    return galaxyDoc.data() as Galaxy;
  }

  /**
   * Get all galaxies for a session
   */
  async getSessionGalaxies(sessionId: string): Promise<Galaxy[]> {
    const galaxiesQuery = query(
      collection(db, 'galaxies'),
      where('sessionId', '==', sessionId)
    );

    const galaxyDocs = await getDocs(galaxiesQuery);
    return galaxyDocs.docs.map(doc => doc.data() as Galaxy);
  }

  /**
   * Update galaxy configuration
   */
  async updateGalaxy(
    galaxyId: string,
    updates: Partial<Galaxy>
  ): Promise<void> {
    // Validate updates if structure is changing
    if (updates.teamStructure || updates.colonyTypes || updates.totalTeams) {
      const existing = await this.getGalaxy(galaxyId);
      if (!existing) {
        throw new Error('Galaxy not found');
      }

      const updated = { ...existing, ...updates };
      this.validateGalaxy(updated);
    }

    await updateDoc(doc(db, 'galaxies', galaxyId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Assign teams to a galaxy
   */
  async assignTeamsToGalaxy(
    galaxyId: string,
    teamAssignments: TeamAssignment[]
  ): Promise<void> {
    const galaxy = await this.getGalaxy(galaxyId);
    if (!galaxy) {
      throw new Error('Galaxy not found');
    }

    // Validate assignments
    if (teamAssignments.length > (galaxy.totalTeams ?? 0)) {
      throw new Error(`Cannot assign ${teamAssignments.length} teams to galaxy with capacity ${galaxy.totalTeams}`);
    }

    // Validate colony types
    for (const assignment of teamAssignments) {
      if (!galaxy.colonyTypes?.includes(assignment.colonyType)) {
        throw new Error(`Colony type ${assignment.colonyType} not available in this galaxy`);
      }
    }

    // Generate game codes for each team
    const batch = writeBatch(db);
    const teamCodes: Record<string, string> = {};

    for (const assignment of teamAssignments) {
      // Generate unique code for this team
      const gameCode = await sessionCodeService.generateSessionCode(
        assignment.teamId,
        {
          galaxyCode: galaxy.name.substring(0, 3).toUpperCase()
        }
      );

      teamCodes[assignment.teamId] = gameCode;

      // Update team document
      batch.update(doc(db, 'teams', assignment.teamId), {
        galaxyId,
        colonyType: assignment.colonyType,
        gameCode,
        isAIControlled: assignment.isAIControlled,
        updatedAt: Timestamp.now()
      });
    }

    // Update galaxy with team assignments
    batch.update(doc(db, 'galaxies', galaxyId), {
      assignedTeams: teamAssignments.map(a => a.teamId),
      teamCodes,
      updatedAt: Timestamp.now()
    });

    await batch.commit();
  }

  /**
   * Generate and assign teams to a galaxy based on its configuration
   */
  async generateAndAssignTeams(
    galaxyId: string,
    sessionId: string
  ): Promise<EnhancedColony[]> {
    const galaxy = await this.getGalaxy(galaxyId);
    if (!galaxy) {
      throw new Error('Galaxy not found');
    }

    // Use team generation service to create teams
    const teams = await TeamGenerationService.generateTeamsForGalaxy(
      galaxy,
      sessionId
    );

    // Create team assignments
    const assignments: TeamAssignment[] = teams.map(team => ({
      teamId: team.id,
      galaxyId: galaxy.id,
      colonyType: team.type,
      isAIControlled: team.isAIControlled
    }));

    // Assign teams to galaxy
    await this.assignTeamsToGalaxy(galaxyId, assignments);

    return teams;
  }

  /**
   * Get teams assigned to a galaxy
   */
  async getGalaxyTeams(galaxyId: string): Promise<EnhancedColony[]> {
    const teams = await teamDataService.getGalaxyTeams(galaxyId);
    return teams as EnhancedColony[];
  }

  /**
   * Apply resource modifiers to a galaxy
   */
  async applyResourceModifiers(
    galaxyId: string,
    modifiers: ResourceModifiers
  ): Promise<void> {
    await this.updateGalaxy(galaxyId, {
      resourceModifiers: modifiers
    });

    // Apply modifiers to all teams in the galaxy
    const teams = await teamDataService.getGalaxyTeams(galaxyId);
    const batch = writeBatch(db);

    for (const team of teams) {
      // Apply production modifiers
      if (modifiers.productionMultipliers) {
        // This would integrate with the resource management service
        batch.update(doc(db, 'teams', team.id), {
          productionModifiers: modifiers.productionMultipliers,
          updatedAt: Timestamp.now()
        });
      }
    }

    await batch.commit();
  }

  /**
   * Add special rules to a galaxy
   */
  async addSpecialRule(
    galaxyId: string,
    rule: SpecialRule
  ): Promise<void> {
    const galaxy = await this.getGalaxy(galaxyId);
    if (!galaxy) {
      throw new Error('Galaxy not found');
    }

    const specialRules = [...(galaxy.specialRules || []), rule];

    await this.updateGalaxy(galaxyId, {
      specialRules
    });
  }

  /**
   * Remove special rule from a galaxy
   */
  async removeSpecialRule(
    galaxyId: string,
    ruleId: string
  ): Promise<void> {
    const galaxy = await this.getGalaxy(galaxyId);
    if (!galaxy) {
      throw new Error('Galaxy not found');
    }

    const specialRules = (galaxy.specialRules || []).filter(r => r.id !== ruleId);

    await this.updateGalaxy(galaxyId, {
      specialRules
    });
  }

  /**
   * Configure AI for a galaxy
   */
  async configureGalaxyAI(
    galaxyId: string,
    aiEnabled: boolean,
    aiDifficulty?: 'easy' | 'medium' | 'hard' | 'adaptive'
  ): Promise<void> {
    await this.updateGalaxy(galaxyId, {
      aiEnabled,
      aiDifficulty
    });

    if (aiEnabled) {
      // Configure AI teams
      const teams = await this.getGalaxyTeams(galaxyId);
      const batch = writeBatch(db);

      for (const team of teams) {
        if (team.isAIControlled) {
          batch.update(doc(db, 'teams', team.id), {
            aiConfig: {
              difficulty: aiDifficulty || 'medium',
              personality: 'adaptive',
              aggressiveness: 0.5,
              riskTolerance: 0.5,
              tradeFrequency: 0.6,
              resourcePriorities: {},
              enabled: true
            },
            updatedAt: Timestamp.now()
          });
        }
      }

      await batch.commit();
    }
  }

  /**
   * Delete a galaxy and all associated data
   */
  async deleteGalaxy(galaxyId: string): Promise<void> {
    // Get all teams in the galaxy
    const teams = await this.getGalaxyTeams(galaxyId);
    
    const batch = writeBatch(db);

    // Delete all teams
    for (const team of teams) {
      batch.delete(doc(db, 'teams', team.id));
    }

    // Delete galaxy
    batch.delete(doc(db, 'galaxies', galaxyId));

    await batch.commit();
  }

  /**
   * Validate galaxy configuration
   */
  private validateGalaxy(galaxy: Galaxy): void {
    const errors: string[] = [];

    if ((galaxy.totalTeams ?? 0) < 2 || (galaxy.totalTeams ?? 0) > 12) {
      errors.push('Total teams must be between 2 and 12');
    }

    if ((galaxy.colonyTypes?.length ?? 0) === 0) {
      errors.push('At least one colony type must be specified');
    }

    if ((galaxy.colonyTypes?.length ?? 0) > (galaxy.totalTeams ?? 0)) {
      errors.push('Cannot have more colony types than teams');
    }

    if (galaxy.teamStructure?.mode === 'custom' && !galaxy.teamStructure?.customAssignments) {
      errors.push('Custom mode requires team assignments');
    }

    if (galaxy.teamStructure?.mode === 'standard' && (galaxy.colonyTypes?.length ?? 0) !== (galaxy.totalTeams ?? 0)) {
      errors.push('Standard mode requires one colony type per team');
    }

    if (errors.length > 0) {
      throw new Error(`Galaxy validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get galaxy statistics
   */
  async getGalaxyStatistics(galaxyId: string): Promise<{
    totalTeams: number;
    activeTeams: number;
    aiTeams: number;
    humanTeams: number;
    averageResources: Record<string, number>;
    topPerformers: string[];
  }> {
    const teams = await this.getGalaxyTeams(galaxyId);
    
    const activeTeams = teams.filter(t => t.eliminationStatus.isEliminated === false);
    const aiTeams = teams.filter(t => t.isAIControlled);
    const humanTeams = teams.filter(t => !t.isAIControlled);

    // Calculate average resources
    const resourceTotals: Record<string, number> = {};
    const resourceKeys = ['water', 'food', 'oxygen', 'energy', 'minerals', 'alloys'];
    
    for (const key of resourceKeys) {
      resourceTotals[key] = activeTeams.length > 0 ? activeTeams.reduce((sum, team) => {
        const value = (team.resources as any)?.[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0) / activeTeams.length : 0;
    }

    // Get top performers (by total resources)
    const teamScores = activeTeams.map(team => ({
      id: team.id,
      score: resourceKeys.reduce((sum, key) => {
        const value = (team.resources as any)?.[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0)
    }));

    teamScores.sort((a, b) => b.score - a.score);
    const topPerformers = teamScores.slice(0, 3).map(t => t.id);

    return {
      totalTeams: teams.length,
      activeTeams: activeTeams.length,
      aiTeams: aiTeams.length,
      humanTeams: humanTeams.length,
      averageResources: resourceTotals,
      topPerformers
    };
  }
}

// Export singleton instance
export const galaxyService = new GalaxyService();

// Export types
export type { Galaxy, GalaxyConfiguration, TeamStructure, ResourceModifiers, SpecialRule };