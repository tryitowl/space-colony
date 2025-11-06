import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OptimizedPlayerPresenceService } from '../optimizedPlayerPresenceService';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';

vi.mock('firebase/firestore');
vi.mock('firebase/database');
vi.mock('../../firebase/config', () => ({
  db: {},
  rtdb: {}
}));

describe('OptimizedPlayerPresenceService', () => {
  let service: OptimizedPlayerPresenceService;
  const mockSessionId = 'test-session-123';
  const mockPlayerId = 'test-player-456';
  const mockTeamId = 'test-team-789';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset static properties
    OptimizedPlayerPresenceService['pendingUpdates'].clear();
    OptimizedPlayerPresenceService['updateTimer'] = null;
    OptimizedPlayerPresenceService['lastHeartbeat'].clear();
    
    service = new OptimizedPlayerPresenceService();
  });

  afterEach(() => {
    vi.useRealTimers();
    service.cleanup();
  });

  describe('updatePresence', () => {
    it('should batch presence updates', () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockReturnValue({ id: 'mock-doc' });

      // First update - should set timer
      service.updatePresence(mockSessionId, mockPlayerId, {
        teamId: mockTeamId,
        isActive: true,
        location: 'trading'
      });

      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(1);
      expect(OptimizedPlayerPresenceService['updateTimer']).not.toBeNull();

      // Second update - should add to batch
      service.updatePresence(mockSessionId, 'player2', {
        teamId: 'team2',
        isActive: true,
        location: 'galaxy'
      });

      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(2);

      // Fast forward to trigger batch
      vi.advanceTimersByTime(1000);

      expect(writeBatch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should force batch when reaching size limit', () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockReturnValue({ id: 'mock-doc' });

      // Add updates up to batch size
      for (let i = 0; i < 10; i++) {
        service.updatePresence(mockSessionId, `player${i}`, {
          teamId: `team${i}`,
          isActive: true,
          location: 'trading'
        });
      }

      // Should not have committed yet
      expect(mockBatch.commit).not.toHaveBeenCalled();

      // Add one more to trigger immediate batch
      service.updatePresence(mockSessionId, 'player10', {
        teamId: 'team10',
        isActive: true,
        location: 'trading'
      });

      // Should commit immediately
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(1); // Only the 11th update
    });

    it('should skip updates within heartbeat interval', () => {
      const now = Date.now();
      OptimizedPlayerPresenceService['lastHeartbeat'].set(
        `${mockSessionId}_${mockPlayerId}`,
        now - 30000 // 30 seconds ago
      );

      service.updatePresence(mockSessionId, mockPlayerId, {
        teamId: mockTeamId,
        isActive: true,
        location: 'trading'
      });

      // Should not add to pending updates
      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(0);
    });

    it('should update realtime database for team presence', () => {
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      service.updatePresence(mockSessionId, mockPlayerId, {
        teamId: mockTeamId,
        isActive: true,
        location: 'trading'
      });

      expect(ref).toHaveBeenCalledWith(
        rtdb,
        `sessions/${mockSessionId}/teams/${mockTeamId}/activePlayerCount`
      );
    });
  });

  describe('removePresence', () => {
    it('should remove presence from Firestore', async () => {
      const mockDocRef = { id: 'mock-doc' };
      (doc as any).mockReturnValue(mockDocRef);
      (deleteDoc as any).mockResolvedValue(undefined);

      await service.removePresence(mockSessionId, mockPlayerId);

      expect(doc).toHaveBeenCalledWith(
        db,
        'sessions',
        mockSessionId,
        'playerPresence',
        mockPlayerId
      );
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should update realtime database team count', async () => {
      (doc as any).mockReturnValue({ id: 'mock-doc' });
      (deleteDoc as any).mockResolvedValue(undefined);
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      const presenceData = {
        playerId: mockPlayerId,
        teamId: mockTeamId,
        isActive: true
      };

      // Store in pending updates first
      OptimizedPlayerPresenceService['pendingUpdates'].set(
        `${mockSessionId}_${mockPlayerId}`,
        presenceData
      );

      await service.removePresence(mockSessionId, mockPlayerId);

      expect(ref).toHaveBeenCalledWith(
        rtdb,
        `sessions/${mockSessionId}/teams/${mockTeamId}/activePlayerCount`
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Delete failed');
      (doc as any).mockReturnValue({ id: 'mock-doc' });
      (deleteDoc as any).mockRejectedValue(mockError);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.removePresence(mockSessionId, mockPlayerId);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error removing presence:',
        mockError
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getActivePlayersForSession', () => {
    it('should get active player count from realtime database', (done) => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockImplementation((_, callback) => {
        // Simulate data from Firebase
        const snapshot = {
          val: () => ({
            team1: { activePlayerCount: 3 },
            team2: { activePlayerCount: 2 },
            team3: { activePlayerCount: 0 }
          })
        };
        callback(snapshot);
        return mockUnsubscribe;
      });

      service.getActivePlayersForSession(mockSessionId, (count) => {
        expect(count).toBe(5); // 3 + 2 + 0
        mockCallback(count);
        done();
      });

      expect(ref).toHaveBeenCalledWith(rtdb, `sessions/${mockSessionId}/teams`);
    });

    it('should handle null data', (done) => {
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockImplementation((_, callback) => {
        const snapshot = { val: () => null };
        callback(snapshot);
        return vi.fn();
      });

      service.getActivePlayersForSession(mockSessionId, (count) => {
        expect(count).toBe(0);
        done();
      });
    });
  });

  describe('getActivePlayersForTeam', () => {
    it('should get team-specific active count', (done) => {
      const mockUnsubscribe = vi.fn();
      
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockImplementation((_, callback) => {
        const snapshot = { val: () => 4 };
        callback(snapshot);
        return mockUnsubscribe;
      });

      const unsubscribe = service.getActivePlayersForTeam(
        mockSessionId,
        mockTeamId,
        (count) => {
          expect(count).toBe(4);
          done();
        }
      );

      expect(ref).toHaveBeenCalledWith(
        rtdb,
        `sessions/${mockSessionId}/teams/${mockTeamId}/activePlayerCount`
      );

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('setActivityStatus', () => {
    it('should update activity status', () => {
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      service.setActivityStatus(mockSessionId, mockPlayerId, mockTeamId, true);

      expect(ref).toHaveBeenCalledWith(
        rtdb,
        `sessions/${mockSessionId}/players/${mockPlayerId}/active`
      );
      expect(set).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('should update team count when changing status', () => {
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      // Set active
      service.setActivityStatus(mockSessionId, mockPlayerId, mockTeamId, true);
      
      // Set inactive
      service.setActivityStatus(mockSessionId, mockPlayerId, mockTeamId, false);

      const refCalls = (ref as any).mock.calls;
      const setCalls = (set as any).mock.calls;

      // Should update both player status and team count
      expect(refCalls).toContainEqual([
        rtdb,
        `sessions/${mockSessionId}/teams/${mockTeamId}/activePlayerCount`
      ]);
    });
  });

  describe('cleanup', () => {
    it('should clear all data and timers', () => {
      // Set up some data
      OptimizedPlayerPresenceService['pendingUpdates'].set('test', {});
      OptimizedPlayerPresenceService['lastHeartbeat'].set('test', Date.now());
      OptimizedPlayerPresenceService['updateTimer'] = setTimeout(() => {}, 1000);

      service.cleanup();

      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(0);
      expect(OptimizedPlayerPresenceService['lastHeartbeat'].size).toBe(0);
      expect(OptimizedPlayerPresenceService['updateTimer']).toBeNull();
    });
  });

  describe('processPendingUpdates', () => {
    it('should commit all pending updates in batches', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockReturnValue({ id: 'mock-doc' });

      // Add multiple updates
      for (let i = 0; i < 25; i++) {
        OptimizedPlayerPresenceService['pendingUpdates'].set(
          `session_player${i}`,
          {
            playerId: `player${i}`,
            teamId: `team${i % 3}`,
            isActive: true,
            location: 'trading',
            lastHeartbeat: Date.now()
          }
        );
      }

      // Process updates
      await OptimizedPlayerPresenceService['processPendingUpdates']();

      // Should create 3 batches (10 + 10 + 5)
      expect(writeBatch).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(3);
      expect(OptimizedPlayerPresenceService['pendingUpdates'].size).toBe(0);
    });

    it('should handle batch errors gracefully', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Batch failed'))
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockReturnValue({ id: 'mock-doc' });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      OptimizedPlayerPresenceService['pendingUpdates'].set('test', {
        playerId: 'test',
        teamId: 'test',
        isActive: true,
        lastHeartbeat: Date.now()
      });

      await OptimizedPlayerPresenceService['processPendingUpdates']();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing presence batch:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});