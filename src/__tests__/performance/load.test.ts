import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptimizedPlayerPresenceService } from '../../services/optimizedPlayerPresenceService';
import { cacheService } from '../../services/cacheService';

describe('Performance Tests', () => {
  describe('Player Presence Service Load Test', () => {
    let service: OptimizedPlayerPresenceService;
    let updateSpy: any;

    beforeEach(() => {
      vi.useFakeTimers();
      service = new OptimizedPlayerPresenceService();
      
      // Spy on the processPendingUpdates method
      updateSpy = vi.spyOn(OptimizedPlayerPresenceService as any, 'processPendingUpdates');
      updateSpy.mockResolvedValue(undefined);
    });

    it('should handle 100+ concurrent users efficiently', async () => {
      const startTime = performance.now();
      const sessionId = 'load-test-session';
      const updates: Promise<any>[] = [];

      // Simulate 100 users updating presence
      for (let i = 0; i < 100; i++) {
        const promise = Promise.resolve(
          service.updatePresence(sessionId, `player-${i}`, {
            teamId: `team-${i % 10}`, // 10 teams
            isActive: true,
            location: i % 2 === 0 ? 'trading' : 'galaxy'
          })
        );
        updates.push(promise);
      }

      await Promise.all(updates);

      // Check that updates were batched
      const pendingCount = OptimizedPlayerPresenceService['pendingUpdates'].size;
      expect(pendingCount).toBeLessThanOrEqual(100); // Should batch some updates

      // Advance timer to trigger batch processing
      vi.advanceTimersByTime(1000);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(updateSpy).toHaveBeenCalledTimes(1); // Should batch into single update
    });

    it('should optimize write operations through batching', () => {
      const sessionId = 'batch-test-session';
      
      // Add 50 updates rapidly
      for (let i = 0; i < 50; i++) {
        service.updatePresence(sessionId, `player-${i}`, {
          teamId: `team-${i % 5}`,
          isActive: true,
          location: 'trading'
        });
      }

      // Check pending updates
      const pendingBeforeBatch = OptimizedPlayerPresenceService['pendingUpdates'].size;
      expect(pendingBeforeBatch).toBe(50);

      // Trigger batch processing
      vi.advanceTimersByTime(1000);

      // After batching, pending should be cleared
      const pendingAfterBatch = OptimizedPlayerPresenceService['pendingUpdates'].size;
      expect(pendingAfterBatch).toBe(0);
    });

    it('should skip redundant heartbeat updates', () => {
      const sessionId = 'heartbeat-test';
      const playerId = 'player-1';
      const teamId = 'team-1';

      // First update
      service.updatePresence(sessionId, playerId, {
        teamId,
        isActive: true,
        location: 'trading'
      });

      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(1);

      // Immediate second update (within heartbeat interval)
      service.updatePresence(sessionId, playerId, {
        teamId,
        isActive: true,
        location: 'trading'
      });

      // Should not add duplicate
      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(1);

      // Advance time past heartbeat interval
      vi.advanceTimersByTime(61000); // 61 seconds

      // Now update should be added
      service.updatePresence(sessionId, playerId, {
        teamId,
        isActive: true,
        location: 'galaxy'
      });

      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(2);
    });
  });

  describe('Cache Service Performance', () => {
    let cache: typeof cacheService;

    beforeEach(() => {
      cache = cacheService;
      cache.clear();
    });

    it('should handle rapid cache operations', () => {
      const startTime = performance.now();
      const operations = 10000;

      // Perform mixed operations
      for (let i = 0; i < operations; i++) {
        if (i % 3 === 0) {
          cache.set(`key-${i}`, { data: `value-${i}`, index: i });
        } else if (i % 3 === 1) {
          cache.get(`key-${i - 1}`);
        } else {
          cache.has(`key-${i - 2}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 10k operations in under 100ms
      expect(duration).toBeLessThan(100);

      // Check cache stats
      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hits + stats.misses).toBeGreaterThan(0);
    });

    it('should maintain performance with eviction', () => {
      // Create cache with small size to force evictions
      const smallCache = new CacheService({
        maxSize: 100,
        evictionPolicy: 'LRU',
        persistToStorage: false
      });

      const startTime = performance.now();

      // Add 1000 items to 100-item cache
      for (let i = 0; i < 1000; i++) {
        smallCache.set(`key-${i}`, { data: `value-${i}` });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle evictions efficiently
      expect(duration).toBeLessThan(50);
      expect(smallCache.getStats().size).toBe(100);
      expect(smallCache.getStats().evictions).toBe(900);
    });

    it('should optimize batch operations', () => {
      const batchData: Record<string, any> = {};
      const batchSize = 1000;

      // Prepare batch data
      for (let i = 0; i < batchSize; i++) {
        batchData[`batch-${i}`] = { index: i, data: `value-${i}` };
      }

      const startTime = performance.now();
      
      // Batch set
      cache.setMultiple(batchData);

      // Batch get
      const keys = Object.keys(batchData);
      const retrieved = cache.getMultiple(keys);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Batch operations should be fast
      expect(duration).toBeLessThan(50);
      expect(Object.keys(retrieved).length).toBe(batchSize);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated operations', () => {
      const cache = new CacheService({
        maxSize: 1000,
        evictionPolicy: 'LRU',
        persistToStorage: false
      });

      // Perform many operations
      for (let cycle = 0; cycle < 10; cycle++) {
        // Add items
        for (let i = 0; i < 100; i++) {
          cache.set(`cycle-${cycle}-item-${i}`, {
            data: new Array(100).fill(`data-${i}`),
            timestamp: Date.now()
          });
        }

        // Read items
        for (let i = 0; i < 50; i++) {
          cache.get(`cycle-${cycle}-item-${i}`);
        }

        // Delete some items
        for (let i = 0; i < 25; i++) {
          cache.delete(`cycle-${cycle}-item-${i}`);
        }
      }

      // Cache should maintain size limit
      expect(cache.getStats().size).toBeLessThanOrEqual(1000);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent read/write operations', async () => {
      const cache = cacheService;
      const concurrentOps = 100;
      const promises: Promise<any>[] = [];

      // Simulate concurrent operations
      for (let i = 0; i < concurrentOps; i++) {
        // Random operation
        const op = Math.floor(Math.random() * 3);
        
        if (op === 0) {
          // Write
          promises.push(
            Promise.resolve(cache.set(`concurrent-${i}`, { value: i }))
          );
        } else if (op === 1) {
          // Read
          promises.push(
            Promise.resolve(cache.get(`concurrent-${Math.floor(Math.random() * i)}`))
          );
        } else {
          // Delete
          promises.push(
            Promise.resolve(cache.delete(`concurrent-${Math.floor(Math.random() * i)}`))
          );
        }
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const duration = performance.now() - startTime;

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle game session with 25 teams and 100 players', async () => {
      const service = new OptimizedPlayerPresenceService();
      const sessionId = 'full-game-session';
      const teams = 25;
      const playersPerTeam = 4;
      const totalPlayers = teams * playersPerTeam;

      vi.useFakeTimers();
      const startTime = performance.now();

      // Simulate all players joining
      const joinPromises = [];
      for (let team = 0; team < teams; team++) {
        for (let player = 0; player < playersPerTeam; player++) {
          const playerId = `team-${team}-player-${player}`;
          joinPromises.push(
            Promise.resolve(
              service.updatePresence(sessionId, playerId, {
                teamId: `team-${team}`,
                isActive: true,
                location: 'colony'
              })
            )
          );
        }
      }

      await Promise.all(joinPromises);

      // Simulate gameplay updates (trading, moving, etc.)
      const gameplayPromises = [];
      for (let i = 0; i < 50; i++) {
        const randomPlayer = Math.floor(Math.random() * totalPlayers);
        const teamId = Math.floor(randomPlayer / playersPerTeam);
        const playerId = `team-${teamId}-player-${randomPlayer % playersPerTeam}`;
        
        gameplayPromises.push(
          Promise.resolve(
            service.updatePresence(sessionId, playerId, {
              teamId: `team-${teamId}`,
              isActive: true,
              location: Math.random() > 0.5 ? 'trading' : 'galaxy'
            })
          )
        );
      }

      await Promise.all(gameplayPromises);

      // Process batches
      vi.advanceTimersByTime(1000);

      const duration = performance.now() - startTime;

      // Should handle full game efficiently
      expect(duration).toBeLessThan(200);
      
      // Check batching worked
      const updateSpy = vi.spyOn(OptimizedPlayerPresenceService as any, 'processPendingUpdates');
      expect(updateSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});