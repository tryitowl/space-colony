import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { firestore as db } from '../firebase/config';
import type { Colony, GameSession } from '../types';

export interface MigrationReport {
  totalTeamsFound: number;
  totalTeamsMigrated: number;
  teamsFromEmbedded: number;
  teamsFromSubcollections: number;
  teamsAlreadyInRoot: number;
  errors: Array<{ source: string; teamId: string; error: string }>;
  duplicates: Array<{ teamId: string; sources: string[] }>;
}

/**
 * Utility to migrate team data from various storage patterns to root collection
 */
export class TeamDataMigration {
  private report: MigrationReport = {
    totalTeamsFound: 0,
    totalTeamsMigrated: 0,
    teamsFromEmbedded: 0,
    teamsFromSubcollections: 0,
    teamsAlreadyInRoot: 0,
    errors: [],
    duplicates: []
  };

  /**
   * Run complete migration for all sessions
   */
  async migrateAllTeams(): Promise<MigrationReport> {
    console.log('Starting team data migration...');
    
    try {
      // Step 1: Get all sessions
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      console.log(`Found ${sessionsSnapshot.size} sessions to process`);

      // Step 2: Process each session
      for (const sessionDoc of sessionsSnapshot.docs) {
        await this.migrateSessionTeams(sessionDoc.id, sessionDoc.data() as GameSession);
      }

      // Step 3: Check for teams already in root collection
      await this.checkExistingRootTeams();

      console.log('Migration complete!', this.report);
      return this.report;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate teams for a specific session
   */
  async migrateSessionTeams(sessionId: string, sessionData: GameSession): Promise<void> {
    console.log(`Processing session: ${sessionId}`);
    
    const teamsMap = new Map<string, { team: Colony; sources: string[] }>();

    // Check Pattern C: Embedded teams array
    if (sessionData.teams && Array.isArray(sessionData.teams)) {
      console.log(`  Found ${sessionData.teams.length} teams in embedded array`);
      
      for (const team of sessionData.teams) {
        const teamId = team.id || `team_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (teamsMap.has(teamId)) {
          teamsMap.get(teamId)!.sources.push('embedded');
        } else {
          teamsMap.set(teamId, {
            team: {
              ...team,
              id: teamId
            },
            sources: ['embedded']
          });
          this.report.teamsFromEmbedded++;
        }
      }
    }

    // Check Pattern B: Subcollection teams
    try {
      const subcollectionSnapshot = await getDocs(
        collection(db, 'sessions', sessionId, 'teams')
      );
      
      console.log(`  Found ${subcollectionSnapshot.size} teams in subcollection`);
      
      for (const teamDoc of subcollectionSnapshot.docs) {
        const teamData = teamDoc.data() as Colony;
        const teamId = teamDoc.id;
        
        if (teamsMap.has(teamId)) {
          teamsMap.get(teamId)!.sources.push('subcollection');
        } else {
          teamsMap.set(teamId, {
            team: {
              ...teamData,
              id: teamId
            },
            sources: ['subcollection']
          });
          this.report.teamsFromSubcollections++;
        }
      }
    } catch (error) {
      console.error(`  Error reading subcollection for session ${sessionId}:`, error);
    }

    // Migrate teams to root collection
    await this.migrateTeamsToRoot(teamsMap);
  }

  /**
   * Migrate teams to root collection
   */
  private async migrateTeamsToRoot(
    teamsMap: Map<string, { team: Colony; sources: string[] }>
  ): Promise<void> {
    const batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    for (const [teamId, { team, sources }] of teamsMap) {
      this.report.totalTeamsFound++;

      // Check for duplicates
      if (sources.length > 1) {
        this.report.duplicates.push({ teamId, sources });
      }

      try {
        // Check if team already exists in root collection
        const existingDoc = await getDoc(doc(db, 'teams', teamId));
        
        if (!existingDoc.exists()) {
          // Add to batch
          const teamData = {
            ...team,
            migratedAt: serverTimestamp(),
            migrationSources: sources
          };
          
          batch.set(doc(db, 'teams', teamId), teamData);
          batchCount++;
          this.report.totalTeamsMigrated++;

          // Commit batch if it reaches max size
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            batchCount = 0;
          }
        } else {
          this.report.teamsAlreadyInRoot++;
        }
      } catch (error) {
        this.report.errors.push({
          source: sources.join(','),
          teamId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Commit remaining batch operations
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Check for teams already in root collection
   */
  private async checkExistingRootTeams(): Promise<void> {
    try {
      const rootTeamsSnapshot = await getDocs(collection(db, 'teams'));
      const existingCount = rootTeamsSnapshot.size;
      
      console.log(`Found ${existingCount} teams already in root collection`);
      
      // Update report with teams that were already correctly stored
      this.report.teamsAlreadyInRoot = Math.max(
        this.report.teamsAlreadyInRoot,
        existingCount - this.report.totalTeamsMigrated
      );
    } catch (error) {
      console.error('Error checking existing root teams:', error);
    }
  }

  /**
   * Dry run - analyze without making changes
   */
  async analyzeMigration(): Promise<MigrationReport> {
    console.log('Running migration analysis (dry run)...');
    
    const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
    let embeddedCount = 0;
    let subcollectionCount = 0;
    const duplicateTeams: Map<string, string[]> = new Map();

    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data() as GameSession;
      
      // Count embedded teams
      if (sessionData.teams && Array.isArray(sessionData.teams)) {
        embeddedCount += sessionData.teams.length;
        
        sessionData.teams.forEach(team => {
          const sources = duplicateTeams.get(team.id) || [];
          sources.push(`embedded:${sessionDoc.id}`);
          duplicateTeams.set(team.id, sources);
        });
      }

      // Count subcollection teams
      try {
        const subcollectionSnapshot = await getDocs(
          collection(db, 'sessions', sessionDoc.id, 'teams')
        );
        subcollectionCount += subcollectionSnapshot.size;
        
        subcollectionSnapshot.docs.forEach(teamDoc => {
          const sources = duplicateTeams.get(teamDoc.id) || [];
          sources.push(`subcollection:${sessionDoc.id}`);
          duplicateTeams.set(teamDoc.id, sources);
        });
      } catch (error) {
        console.error(`Error reading subcollection for session ${sessionDoc.id}:`, error);
      }
    }

    // Count root collection teams
    const rootTeamsSnapshot = await getDocs(collection(db, 'teams'));
    const rootCount = rootTeamsSnapshot.size;

    // Identify duplicates
    const duplicates = Array.from(duplicateTeams.entries())
      .filter(([_, sources]) => sources.length > 1)
      .map(([teamId, sources]) => ({ teamId, sources }));

    return {
      totalTeamsFound: embeddedCount + subcollectionCount + rootCount,
      totalTeamsMigrated: 0,
      teamsFromEmbedded: embeddedCount,
      teamsFromSubcollections: subcollectionCount,
      teamsAlreadyInRoot: rootCount,
      errors: [],
      duplicates
    };
  }

  /**
   * Clean up old team data after successful migration
   * WARNING: This permanently removes data - only run after verifying migration
   */
  async cleanupOldTeamData(): Promise<void> {
    console.log('WARNING: This will permanently remove old team data!');
    console.log('Make sure you have verified the migration was successful.');
    
    // This method would:
    // 1. Remove teams array from session documents
    // 2. Delete teams subcollections
    // Only implement if needed and after careful verification
    
    throw new Error('Cleanup not implemented - implement with caution');
  }
}

// Export utilities for use in admin functions
export const runTeamMigration = async (): Promise<MigrationReport> => {
  const migration = new TeamDataMigration();
  return migration.migrateAllTeams();
};

export const analyzeTeamMigration = async (): Promise<MigrationReport> => {
  const migration = new TeamDataMigration();
  return migration.analyzeMigration();
};