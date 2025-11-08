import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';
import { firestore as db } from '../firebase/config';
import type { Colony, TeamPlayer, Resources } from '../types';
import { logTeamOperation } from '../utils/teamOperationLogger';

/**
 * Centralized service for team data access
 * Implements standardized root collection pattern for all team operations
 */
class TeamDataService {
  private readonly TEAMS_COLLECTION = 'teams';

  /**
   * Get a single team by ID
   */
  async getTeam(teamId: string): Promise<Colony | null> {
    const startTime = Date.now();
    try {
      const teamDoc = await getDoc(doc(db, this.TEAMS_COLLECTION, teamId));
      
      await logTeamOperation({
        operation: 'query',
        teamId,
        data: { exists: teamDoc.exists(), queryTime: Date.now() - startTime },
        success: true
      });
      
      if (!teamDoc.exists()) {
        return null;
      }
      return { id: teamDoc.id, ...teamDoc.data() } as Colony;
    } catch (error) {
      console.error('Error fetching team:', error);
      
      await logTeamOperation({
        operation: 'query',
        teamId,
        data: { queryTime: Date.now() - startTime },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Get all teams for a session
   */
  async getSessionTeams(sessionId: string): Promise<Colony[]> {
    const startTime = Date.now();
    try {
      const q = query(
        collection(db, this.TEAMS_COLLECTION),
        where('sessionId', '==', sessionId)
      );
      const snapshot = await getDocs(q);
      const teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Colony));
      
      await logTeamOperation({
        operation: 'querySessionTeams',
        sessionId,
        data: { 
          teamCount: teams.length,
          queryTime: Date.now() - startTime,
          teamIds: teams.map(t => t.id)
        },
        success: true
      });
      
      return teams;
    } catch (error) {
      console.error('Error fetching session teams:', error);
      
      await logTeamOperation({
        operation: 'querySessionTeams',
        sessionId,
        data: { queryTime: Date.now() - startTime },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Get all teams for a galaxy
   */
  async getGalaxyTeams(galaxyId: string): Promise<Colony[]> {
    try {
      const q = query(
        collection(db, this.TEAMS_COLLECTION),
        where('galaxyId', '==', galaxyId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Colony));
    } catch (error) {
      console.error('Error fetching galaxy teams:', error);
      throw error;
    }
  }

  /**
   * Get teams by event ID
   */
  async getEventTeams(eventId: string): Promise<Colony[]> {
    try {
      const q = query(
        collection(db, this.TEAMS_COLLECTION),
        where('eventId', '==', eventId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Colony));
    } catch (error) {
      console.error('Error fetching event teams:', error);
      throw error;
    }
  }

  /**
   * Get available teams for trading (not eliminated, not in critical mode)
   */
  async getAvailableTeams(sessionId: string, excludeTeamId?: string): Promise<Colony[]> {
    try {
      const teams = await this.getSessionTeams(sessionId);
      return teams.filter(team => {
        if (team.id === excludeTeamId) return false;
        if (team.eliminationStatus?.isEliminated) return false;

        // Check if team is in critical mode
        const criticalResources = ['oxygen', 'food', 'water', 'energy'];
        const inCriticalMode = criticalResources.some(resource => {
          const value = team.resources[resource as keyof Resources];
          return typeof value === 'number' && value < 5;
        });

        return !inCriticalMode;
      });
    } catch (error) {
      console.error('Error fetching available teams:', error);
      throw error;
    }
  }

  /**
   * Create a new team
   */
  async createTeam(team: Omit<Colony, 'id'>): Promise<string> {
    try {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const teamData = {
        ...team,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, this.TEAMS_COLLECTION, teamId), teamData);
      
      await logTeamOperation({
        operation: 'create',
        teamId,
        sessionId: team.sessionId,
        data: { 
          teamName: team.name,
          type: team.type,
          galaxyId: team.galaxyId
        },
        success: true
      });
      
      return teamId;
    } catch (error) {
      console.error('Error creating team:', error);
      
      await logTeamOperation({
        operation: 'create',
        sessionId: team.sessionId,
        data: { teamName: team.name, type: team.type },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Update a team
   */
  async updateTeam(teamId: string, updates: Partial<Colony>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });
      
      await updateDoc(doc(db, this.TEAMS_COLLECTION, teamId), updateData);
      
      await logTeamOperation({
        operation: 'update',
        teamId,
        data: { 
          fields: Object.keys(updates),
          hasResourceUpdate: 'resources' in updates,
          hasPlayerUpdate: 'players' in updates
        },
        success: true
      });
    } catch (error) {
      console.error('Error updating team:', error);
      
      await logTeamOperation({
        operation: 'update',
        teamId,
        data: { fields: Object.keys(updates) },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Update team resources
   */
  async updateTeamResources(teamId: string, resources: Partial<Resources>): Promise<void> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const updatedResources = {
        ...team.resources,
        ...resources
      };
      
      // Calculate changes for logging
      const changes: Record<string, { from: number; to: number }> = {};
      let hasChanges = false;

      Object.entries(resources).forEach(([key, value]) => {
        const oldValue = team.resources[key as keyof Resources];
        const oldNum = typeof oldValue === 'number' ? oldValue : 0;
        const newNum = typeof value === 'number' ? value : 0;
        if (oldNum !== newNum) {
          changes[key] = { from: oldNum, to: newNum };
          hasChanges = true;
        }
      });

      // Minimize writes - only update if there are actual changes
      if (!hasChanges) {
        await logTeamOperation({
          operation: 'updateResources',
          teamId,
          sessionId: team.sessionId,
          data: { 
            resourceTypes: Object.keys(resources),
            skipped: true,
            reason: 'No changes detected'
          },
          success: true
        });
        return;
      }

      await this.updateTeam(teamId, { resources: updatedResources });
      
      await logTeamOperation({
        operation: 'updateResources',
        teamId,
        sessionId: team.sessionId,
        data: { 
          resourceTypes: Object.keys(resources),
          changes,
          totalResourceValue: Object.values(updatedResources).reduce<number>((sum, val) =>
            typeof val === 'number' ? sum + val : sum, 0
          )
        },
        success: true
      });
    } catch (error) {
      console.error('Error updating team resources:', error);
      
      await logTeamOperation({
        operation: 'updateResources',
        teamId,
        data: { resourceTypes: Object.keys(resources) },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Add player to team (optimized with arrayUnion)
   */
  async addPlayerToTeam(teamId: string, player: TeamPlayer): Promise<void> {
    try {
      // Use arrayUnion for atomic addition without fetching
      await updateDoc(doc(db, this.TEAMS_COLLECTION, teamId), {
        players: arrayUnion(player),
        updatedAt: serverTimestamp()
      });
      
      await logTeamOperation({
        operation: 'addPlayer',
        teamId,
        data: { playerId: player.id, playerName: player.name },
        success: true
      });
    } catch (error) {
      console.error('Error adding player to team:', error);
      
      await logTeamOperation({
        operation: 'addPlayer',
        teamId,
        data: { playerId: player.id },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Remove player from team (optimized)
   */
  async removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
    try {
      // First get the player object to remove
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }
      
      const playerToRemove = team.players?.find(p => p.id === playerId);
      if (!playerToRemove) {
        throw new Error('Player not found in team');
      }
      
      // Use arrayRemove for atomic removal
      await updateDoc(doc(db, this.TEAMS_COLLECTION, teamId), {
        players: arrayRemove(playerToRemove),
        updatedAt: serverTimestamp()
      });
      
      await logTeamOperation({
        operation: 'removePlayer',
        teamId,
        data: { playerId },
        success: true
      });
    } catch (error) {
      console.error('Error removing player from team:', error);
      
      await logTeamOperation({
        operation: 'removePlayer',
        teamId,
        data: { playerId },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.TEAMS_COLLECTION, teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple teams
   */
  async batchUpdateTeams(updates: Array<{ teamId: string; updates: Partial<Colony> }>): Promise<void> {
    const startTime = Date.now();
    try {
      // Filter out empty updates to minimize writes
      const validUpdates = updates.filter(({ updates }) => {
        const keys = Object.keys(updates);
        return keys.length > 0 && keys.some(key => updates[key as keyof Colony] !== undefined);
      });
      
      if (validUpdates.length === 0) {
        await logTeamOperation({
          operation: 'batchUpdate',
          data: { 
            originalCount: updates.length,
            validCount: 0,
            skipped: true,
            reason: 'No valid updates'
          },
          success: true
        });
        return;
      }
      
      const batch = writeBatch(db);
      
      validUpdates.forEach(({ teamId, updates }) => {
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp()
        };
        batch.update(doc(db, this.TEAMS_COLLECTION, teamId), updateData);
      });
      
      await batch.commit();
      
      await logTeamOperation({
        operation: 'batchUpdate',
        data: { 
          teamCount: validUpdates.length,
          teamIds: validUpdates.map(u => u.teamId),
          updateTypes: validUpdates.map(u => Object.keys(u.updates)),
          executionTime: Date.now() - startTime,
          skippedCount: updates.length - validUpdates.length
        },
        success: true
      });
    } catch (error) {
      console.error('Error batch updating teams:', error);
      
      await logTeamOperation({
        operation: 'batchUpdate',
        data: { 
          teamCount: updates.length,
          executionTime: Date.now() - startTime
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Get teams in critical mode for a session
   */
  async getCriticalTeams(sessionId: string): Promise<Colony[]> {
    try {
      const teams = await this.getSessionTeams(sessionId);
      return teams.filter(team => {
        if (team.eliminationStatus?.isEliminated) return false;

        const criticalResources = ['oxygen', 'food', 'water', 'energy'];
        return criticalResources.some(resource => {
          const value = team.resources[resource as keyof Resources];
          return typeof value === 'number' && value < 5;
        });
      });
    } catch (error) {
      console.error('Error fetching critical teams:', error);
      throw error;
    }
  }

  /**
   * Check if team has sufficient resources for a trade
   */
  async verifyTeamResources(teamId: string, requiredResources: Partial<Resources>): Promise<boolean> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        return false;
      }

      return Object.entries(requiredResources).every(([resource, amount]) => {
        const value = team.resources[resource as keyof Resources];
        const available = typeof value === 'number' ? value : 0;
        const required = typeof amount === 'number' ? amount : 0;
        return available >= required;
      });
    } catch (error) {
      console.error('Error verifying team resources:', error);
      return false;
    }
  }

  /**
   * Update team resources with transaction support for concurrent updates
   */
  async updateTeamResourcesConcurrent(
    teamId: string,
    resourceUpdates: (currentResources: Resources) => Partial<Resources>
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.TEAMS_COLLECTION, teamId);
        const teamDoc = await transaction.get(teamRef);
        
        if (!teamDoc.exists()) {
          throw new Error('Team not found');
        }
        
        const team = teamDoc.data() as Colony;
        const newResources = resourceUpdates(team.resources);
        
        transaction.update(teamRef, {
          resources: { ...team.resources, ...newResources },
          updatedAt: serverTimestamp()
        });
      });
      
      await logTeamOperation({
        operation: 'updateResources',
        teamId,
        data: { transactional: true },
        success: true
      });
    } catch (error) {
      console.error('Error in concurrent resource update:', error);
      
      await logTeamOperation({
        operation: 'updateResources',
        teamId,
        data: { transactional: true },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Batch create multiple teams efficiently
   */
  async batchCreateTeams(teams: Array<Omit<Colony, 'id'>>): Promise<string[]> {
    const startTime = Date.now();
    try {
      const batch = writeBatch(db);
      const teamIds: string[] = [];
      
      teams.forEach((team) => {
        const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        teamIds.push(teamId);
        
        const teamData = {
          ...team,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(doc(db, this.TEAMS_COLLECTION, teamId), teamData);
      });
      
      await batch.commit();
      
      await logTeamOperation({
        operation: 'create',
        data: {
          teamCount: teams.length,
          teamIds,
          executionTime: Date.now() - startTime
        },
        success: true
      });

      return teamIds;
    } catch (error) {
      console.error('Error batch creating teams:', error);

      await logTeamOperation({
        operation: 'create',
        data: { 
          teamCount: teams.length,
          executionTime: Date.now() - startTime
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Update only changed fields to minimize writes
   */
  async updateTeamDelta(teamId: string, updates: Partial<Colony>): Promise<void> {
    try {
      // Get current team state
      const currentTeam = await this.getTeam(teamId);
      if (!currentTeam) {
        throw new Error('Team not found');
      }
      
      // Calculate actual changes
      const actualUpdates: Partial<Colony> = {};
      let hasChanges = false;
      
      Object.entries(updates).forEach(([key, value]) => {
        const currentValue = currentTeam[key as keyof Colony];
        
        // Deep comparison for objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const currentObj = currentValue as any || {};
          const hasObjectChanges = Object.entries(value as any).some(
            ([k, v]) => currentObj[k] !== v
          );
          
          if (hasObjectChanges) {
            (actualUpdates as any)[key] = value;
            hasChanges = true;
          }
        } else if (currentValue !== value) {
          (actualUpdates as any)[key] = value;
          hasChanges = true;
        }
      });
      
      // Only update if there are actual changes
      if (!hasChanges) {
        await logTeamOperation({
          operation: 'update',
          teamId,
          data: {
            requestedFields: Object.keys(updates),
            skipped: true,
            reason: 'No changes detected'
          },
          success: true
        });
        return;
      }
      
      await this.updateTeam(teamId, actualUpdates);
    } catch (error) {
      console.error('Error in delta update:', error);
      throw error;
    }
  }
  
  /**
   * Get team statistics
   */
  async getTeamStatistics(teamId: string): Promise<{
    survivalRounds: number;
    totalResourceValue: number;
    criticalResourceCount: number;
    playerCount: number;
  }> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Calculate survival rounds based on consumption rates
      const consumptionRates = {
        oxygen: 2,
        food: 2,
        water: 1,
        energy: 3
      };

      let minSurvivalRounds = Infinity;
      Object.entries(consumptionRates).forEach(([resource, rate]) => {
        const resourceValue = team.resources[resource as keyof Resources];
        const available = typeof resourceValue === 'number' ? resourceValue : 0;
        const rounds = Math.floor(available / rate);
        minSurvivalRounds = Math.min(minSurvivalRounds, rounds);
      });

      // Calculate total resource value
      const resourceValues = {
        oxygen: 5,
        food: 3,
        water: 2,
        energy: 4,
        minerals: 8,
        tech: 20
      };

      const totalResourceValue = Object.entries(team.resources).reduce((total, [resource, amount]) => {
        const value = resourceValues[resource as keyof typeof resourceValues] || 1;
        return total + (amount * value);
      }, 0);

      // Count critical resources
      const criticalResourceCount = ['oxygen', 'food', 'water', 'energy'].filter(resource => {
        const value = team.resources[resource as keyof Resources];
        return typeof value === 'number' && value < 5;
      }).length;

      return {
        survivalRounds: Math.max(0, minSurvivalRounds),
        totalResourceValue,
        criticalResourceCount,
        playerCount: team.players?.length || 0
      };
    } catch (error) {
      console.error('Error calculating team statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const teamDataService = new TeamDataService();