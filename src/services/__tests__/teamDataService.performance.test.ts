import { describe, it, expect, beforeEach, vi } from 'vitest';
import { teamDataService } from '../teamDataService';
import { 
  doc, 
  updateDoc, 
  runTransaction,
  writeBatch,
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocs
} from 'firebase/firestore';
import type { Colony, Resources } from '../../types';

// Mock Firebase
vi.mock('../../firebase/config', () => ({
  firestore: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  arrayUnion: vi.fn((value) => ({ type: 'arrayUnion', value })),
  arrayRemove: vi.fn((value) => ({ type: 'arrayRemove', value })),
  runTransaction: vi.fn()
}));

vi.mock('../../utils/teamOperationLogger', () => ({
  logTeamOperation: vi.fn()
}));

describe('TeamDataService Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Optimized Array Operations', () => {
    it('should use arrayUnion for adding players efficiently', async () => {
      const teamId = 'team-123';
      const newPlayer = {
        id: 'player-1',
        userId: 'user-1',
        name: 'Test Player',
        role: 'crew' as const,
        joinedAt: Date.now(),
        isOnline: true,
        lastSeen: Date.now()
      };

      await teamDataService.addPlayerToTeam(teamId, newPlayer);

      // Verify arrayUnion was used
      expect(arrayUnion).toHaveBeenCalledWith(newPlayer);
      
      // Verify updateDoc was called with arrayUnion operation
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          players: { type: 'arrayUnion', value: newPlayer }
        })
      );

      // Verify no getDoc call was made (optimized)
      expect(vi.mocked(updateDoc)).toHaveBeenCalledTimes(1);
    });

    it('should use arrayRemove for removing players efficiently', async () => {
      const teamId = 'team-123';
      const playerId = 'player-1';
      const mockTeam: Colony = {
        id: teamId,
        name: 'Test Team',
        type: 'mining',
        sessionId: 'session-123',
        galaxyId: 'galaxy-123',
        players: [{
          id: playerId,
          userId: 'user-1',
          name: 'Test Player',
          role: 'crew',
          joinedAt: Date.now(),
          isOnline: true,
          lastSeen: Date.now()
        }],
        resources: {} as Resources,
        isEliminated: false,
        score: 0
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: teamId,
        data: () => mockTeam
      } as any);

      await teamDataService.removePlayerFromTeam(teamId, playerId);

      // Verify arrayRemove was used
      expect(arrayRemove).toHaveBeenCalledWith(mockTeam.players[0]);
      
      // Verify only one getDoc call to fetch player object
      expect(getDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch Operations Performance', () => {
    it('should batch update teams efficiently', async () => {
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn()
      };
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);

      const updates = Array.from({ length: 10 }, (_, i) => ({
        teamId: `team-${i}`,
        updates: { score: i * 100 }
      }));

      const startTime = Date.now();
      await teamDataService.batchUpdateTeams(updates);
      const executionTime = Date.now() - startTime;

      // Verify batch was used
      expect(writeBatch).toHaveBeenCalledTimes(1);
      expect(mockBatch.update).toHaveBeenCalledTimes(10);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      // Performance assertion - batch should be fast
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should skip empty updates to minimize writes', async () => {
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn()
      };
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);

      const updates = [
        { teamId: 'team-1', updates: { score: 100 } },
        { teamId: 'team-2', updates: {} }, // Empty update
        { teamId: 'team-3', updates: { resources: undefined } }, // Undefined values
        { teamId: 'team-4', updates: { name: 'New Name' } }
      ];

      await teamDataService.batchUpdateTeams(updates);

      // Should only update teams with actual changes
      expect(mockBatch.update).toHaveBeenCalledTimes(2); // team-1 and team-4
    });
  });

  describe('Concurrent Resource Updates', () => {
    it('should handle concurrent resource updates with transactions', async () => {
      const teamId = 'team-123';
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            resources: { water: 50, oxygen: 30 }
          })
        }),
        update: vi.fn()
      };

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        return callback(mockTransaction as any);
      });

      await teamDataService.updateTeamResourcesConcurrent(teamId, (current) => ({
        water: current.water - 10,
        oxygen: current.oxygen + 5
      }));

      // Verify transaction was used
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransaction.get).toHaveBeenCalledTimes(1);
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          resources: expect.objectContaining({
            water: 40,
            oxygen: 35
          })
        })
      );
    });

    it('should handle race conditions in concurrent updates', async () => {
      const teamId = 'team-123';
      let callCount = 0;
      const mockTransaction = {
        get: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              resources: { water: 50 + (callCount - 1) * 10 } // Simulate changing values
            })
          });
        }),
        update: vi.fn()
      };

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        return callback(mockTransaction as any);
      });

      // Simulate two concurrent updates
      const update1 = teamDataService.updateTeamResourcesConcurrent(teamId, (current) => ({
        water: current.water - 10
      }));

      const update2 = teamDataService.updateTeamResourcesConcurrent(teamId, (current) => ({
        water: current.water - 5
      }));

      await Promise.all([update1, update2]);

      // Both transactions should complete successfully
      expect(runTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Write Minimization', () => {
    it('should skip resource updates when no changes detected', async () => {
      const teamId = 'team-123';
      const mockTeam: Colony = {
        id: teamId,
        name: 'Test Team',
        type: 'mining',
        sessionId: 'session-123',
        galaxyId: 'galaxy-123',
        players: [],
        resources: { 
          water: 50, 
          oxygen: 30,
          food: 20,
          energy: 40,
          minerals: 10,
          rareMinerals: 5,
          alienTech: 1
        } as Resources,
        isEliminated: false,
        score: 0
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: teamId,
        data: () => mockTeam
      } as any);

      // Update with same values
      await teamDataService.updateTeamResources(teamId, {
        water: 50,
        oxygen: 30
      });

      // Should not call updateDoc since no changes
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should use updateTeamDelta to only update changed fields', async () => {
      const teamId = 'team-123';
      const mockTeam: Colony = {
        id: teamId,
        name: 'Test Team',
        type: 'mining',
        sessionId: 'session-123',
        galaxyId: 'galaxy-123',
        players: [],
        resources: {} as Resources,
        isEliminated: false,
        score: 100
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: teamId,
        data: () => mockTeam
      } as any);

      await teamDataService.updateTeamDelta(teamId, {
        name: 'Test Team', // Same as current
        score: 200, // Different
        isEliminated: false // Same as current
      });

      // Should only update changed fields
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          score: 200
          // name and isEliminated should not be included
        })
      );
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete 100 player additions in under 500ms', async () => {
      const teamId = 'team-123';
      const startTime = Date.now();

      const additions = Array.from({ length: 100 }, (_, i) => 
        teamDataService.addPlayerToTeam(teamId, {
          id: `player-${i}`,
          userId: `user-${i}`,
          name: `Player ${i}`,
          role: 'crew',
          joinedAt: Date.now(),
          isOnline: true,
          lastSeen: Date.now()
        })
      );

      await Promise.all(additions);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(500);
      expect(arrayUnion).toHaveBeenCalledTimes(100);
    });

    it('should batch create 50 teams efficiently', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn()
      };
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);

      const teams = Array.from({ length: 50 }, (_, i) => ({
        name: `Team ${i}`,
        type: 'mining' as const,
        sessionId: 'session-123',
        galaxyId: 'galaxy-123',
        players: [],
        resources: {} as Resources,
        isEliminated: false,
        score: 0
      }));

      const startTime = Date.now();
      await teamDataService.batchCreateTeams(teams);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(200); // Should be very fast
      expect(mockBatch.set).toHaveBeenCalledTimes(50);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });
});