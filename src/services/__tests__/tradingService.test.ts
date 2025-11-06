import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradingService } from '../tradingService';
import { firestore } from '../../firebase/config';
import { doc, getDoc, runTransaction, getDocs, updateDoc, setDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { ref, set, onValue, off, get } from 'firebase/database';
import type { GameSession, Colony, TradeOffer } from '../../types';

// Mock Firebase
vi.mock('../../firebase/config', () => ({
  firestore: {},
  realtimeDb: {},
  db: {},
  rtdb: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  setDoc: vi.fn()
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  set: vi.fn(),
  onValue: vi.fn(),
  off: vi.fn(),
  get: vi.fn()
}));

describe('TradingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default onValue mock to prevent hanging
    vi.mocked(onValue).mockImplementation((ref, callback, options) => {
      // Immediately call the callback with an empty value
      callback({ val: () => null });
      return () => {}; // Return unsubscribe function
    });
  });

  describe('executeTrade', () => {
    beforeEach(() => {
      // Mock getDocs to return empty results by default
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
        size: 0
      } as any);
    });

    it('should handle concurrent trades atomically', async () => {
      const sessionId = 'test-session';
      const tradeId = 'test-trade';
      
      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Team 1',
            resources: { oxygen: 20, food: 15, water: 10, energy: 25 },
            players: []
          },
          {
            id: 'team2', 
            name: 'Team 2',
            resources: { oxygen: 10, food: 20, water: 15, energy: 15 },
            players: []
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const mockTrade: TradeOffer = {
        id: tradeId,
        sessionId,
        initiatorId: 'team1',
        targetId: 'team2',
        offerResources: { oxygen: 5, food: 3 },
        requestResources: { water: 4, energy: 2 },
        status: 'pending',
        timestamp: Date.now(),
        createdBy: { id: 'player1', name: 'Player 1', role: 'crew' }
      };

      // Mock Firestore transaction
      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: () => true, data: () => mockSession })
          .mockResolvedValueOnce({ exists: () => true, data: () => mockTrade }),
        update: vi.fn()
      };

      vi.mocked(runTransaction).mockImplementation(async (db, updateFunction) => {
        return updateFunction(mockTransaction);
      });

      // Execute multiple concurrent trades
      const tradePromises = [
        TradingService.acceptTradeOffer(sessionId, tradeId, 'team2'),
        TradingService.acceptTradeOffer(sessionId, tradeId, 'team2'),
        TradingService.acceptTradeOffer(sessionId, tradeId, 'team2')
      ];

      // All should complete without errors
      await Promise.all(tradePromises);

      // Verify transaction was called
      expect(runTransaction).toHaveBeenCalledTimes(3);
      
      // Verify atomic updates were attempted
      expect(mockTransaction.update).toHaveBeenCalled();
    });

    it('should rollback on insufficient resources', async () => {
      const sessionId = 'test-session';
      const tradeId = 'test-trade';
      
      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Team 1',
            resources: { oxygen: 2, food: 1, water: 10, energy: 25 }, // Insufficient
            players: []
          },
          {
            id: 'team2',
            name: 'Team 2', 
            resources: { oxygen: 10, food: 20, water: 15, energy: 15 },
            players: []
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const mockTrade: TradeOffer = {
        id: tradeId,
        sessionId,
        initiatorId: 'team1',
        targetId: 'team2',
        offerResources: { oxygen: 5, food: 3 }, // More than team1 has
        requestResources: { water: 4, energy: 2 },
        status: 'pending',
        timestamp: Date.now(),
        createdBy: { id: 'player1', name: 'Player 1', role: 'crew' }
      };

      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: () => true, data: () => mockSession })
          .mockResolvedValueOnce({ exists: () => true, data: () => mockTrade }),
        update: vi.fn()
      };

      vi.mocked(runTransaction).mockImplementation(async (db, updateFunction) => {
        return updateFunction(mockTransaction);
      });

      // Should reject with insufficient resources error
      await expect(
        TradingService.acceptTradeOffer(sessionId, tradeId, 'team2')
      ).rejects.toThrow('Insufficient resources');

      // Verify no updates were made
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it('should handle intel transfers correctly', async () => {
      const sessionId = 'test-session';
      const tradeId = 'test-trade';
      
      const mockIntel = [
        { id: 'intel1', content: 'Test intel 1', category: 'market' as const },
        { id: 'intel2', content: 'Test intel 2', category: 'technology' as const }
      ];

      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Team 1',
            resources: { 
              oxygen: 20, food: 15, water: 10, energy: 25,
              intel: mockIntel
            },
            players: []
          },
          {
            id: 'team2',
            name: 'Team 2',
            resources: { 
              oxygen: 10, food: 20, water: 15, energy: 15,
              intel: []
            },
            players: []
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const mockTrade: TradeOffer = {
        id: tradeId,
        sessionId,
        initiatorId: 'team1',
        targetId: 'team2',
        offerResources: { oxygen: 5 },
        requestResources: { water: 4 },
        offerIntel: ['intel1'],
        requestIntel: [],
        status: 'pending',
        timestamp: Date.now(),
        createdBy: { id: 'player1', name: 'Player 1', role: 'crew' }
      };

      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: () => true, data: () => mockSession })
          .mockResolvedValueOnce({ exists: () => true, data: () => mockTrade }),
        update: vi.fn()
      };

      let capturedSessionUpdate: any;
      vi.mocked(runTransaction).mockImplementation(async (db, updateFunction) => {
        const result = await updateFunction(mockTransaction);
        // Capture the session update
        capturedSessionUpdate = mockTransaction.update.mock.calls[0]?.[1];
        return result;
      });

      await TradingService.acceptTradeOffer(sessionId, tradeId, 'team2');

      // Verify intel was transferred
      expect(capturedSessionUpdate.teams[0].resources.intel).toHaveLength(1);
      expect(capturedSessionUpdate.teams[0].resources.intel[0].id).toBe('intel2');
      expect(capturedSessionUpdate.teams[1].resources.intel).toHaveLength(1);
      expect(capturedSessionUpdate.teams[1].resources.intel[0].id).toBe('intel1');
    });
  });

  describe('getAvailableTeams', () => {
    it('should filter out eliminated and critical teams', async () => {
      const sessionId = 'test-session';
      const currentTeamId = 'team1';

      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Current Team',
            resources: { oxygen: 20, food: 15, water: 10, energy: 25 },
            players: [],
            status: 'active'
          },
          {
            id: 'team2',
            name: 'Active Team',
            resources: { oxygen: 10, food: 20, water: 15, energy: 15 },
            players: [],
            status: 'active'
          },
          {
            id: 'team3',
            name: 'Eliminated Team',
            resources: { oxygen: 0, food: 0, water: 0, energy: 0 },
            players: [],
            status: 'eliminated'
          },
          {
            id: 'team4',
            name: 'Critical Team',
            resources: { oxygen: 1, food: 2, water: 1, energy: 3 }, // Below critical
            players: [],
            status: 'active'
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockSession,
        id: sessionId,
        ref: {} as any
      });

      const availableTeams = await TradingService.getAvailableTeams(sessionId, currentTeamId);

      // Should only return team2 (active and not critical)
      expect(availableTeams).toHaveLength(1);
      expect(availableTeams[0].id).toBe('team2');
    });

    it('should check real-time trading availability', async () => {
      const sessionId = 'test-session';
      const currentTeamId = 'team1';

      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Current Team',
            resources: { oxygen: 20, food: 15, water: 10, energy: 25 },
            players: [],
            status: 'active'
          },
          {
            id: 'team2',
            name: 'Available Team',
            resources: { oxygen: 10, food: 20, water: 15, energy: 15 },
            players: [],
            status: 'active'
          },
          {
            id: 'team3',
            name: 'Busy Team',
            resources: { oxygen: 15, food: 15, water: 20, energy: 20 },
            players: [],
            status: 'active'
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockSession,
        id: sessionId,
        ref: {} as any
      });

      // Mock real-time database response to show team3 is busy
      vi.mocked(onValue).mockImplementationOnce((ref, callback, options) => {
        // Return availability status
        callback({ 
          val: () => ({
            'team2': 'available',
            'team3': 'busy'
          })
        });
        return () => {}; // Return unsubscribe function
      });

      const availableTeams = await TradingService.getAvailableTeams(sessionId, currentTeamId);

      // Should return only team2 (team3 is busy)
      expect(availableTeams).toHaveLength(1);
      expect(availableTeams[0].id).toBe('team2');
    });

    it('should include AI teams when configured', async () => {
      const sessionId = 'test-session';
      const currentTeamId = 'team1';

      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Human Team',
            resources: { oxygen: 20, food: 15, water: 10, energy: 25 },
            players: [],
            status: 'active',
            isAIControlled: false
          },
          {
            id: 'team2',
            name: 'AI Team 1',
            resources: { oxygen: 15, food: 20, water: 12, energy: 18 },
            players: [],
            status: 'active',
            isAIControlled: true
          },
          {
            id: 'team3',
            name: 'AI Team 2 - Critical',
            resources: { oxygen: 2, food: 3, water: 1, energy: 4 }, // Critical
            players: [],
            status: 'active',
            isAIControlled: true
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockSession,
        id: sessionId,
        ref: {} as any
      });

      const availableTeams = await TradingService.getAvailableTeams(sessionId, currentTeamId);

      // Should return only team2 (AI team that's not critical)
      expect(availableTeams).toHaveLength(1);
      expect(availableTeams[0].id).toBe('team2');
      expect(availableTeams[0].isAIControlled).toBe(true);
    });

    it('should return empty array when all teams are unavailable', async () => {
      const sessionId = 'test-session';
      const currentTeamId = 'team1';

      const mockSession: GameSession = {
        id: sessionId,
        eventId: 'test-event',
        currentRound: 1,
        teams: [
          {
            id: 'team1',
            name: 'Current Team',
            resources: { oxygen: 20, food: 15, water: 10, energy: 25 },
            players: [],
            status: 'active'
          },
          {
            id: 'team2',
            name: 'Eliminated Team',
            resources: { oxygen: 0, food: 0, water: 0, energy: 0 },
            players: [],
            status: 'eliminated'
          }
        ] as Colony[],
        status: 'active',
        gameState: {} as any,
        config: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockSession,
        id: sessionId,
        ref: {} as any
      });

      const availableTeams = await TradingService.getAvailableTeams(sessionId, currentTeamId);

      expect(availableTeams).toHaveLength(0);
    });

    it('should handle session not found gracefully', async () => {
      const sessionId = 'non-existent';
      const currentTeamId = 'team1';

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
        id: sessionId,
        ref: {} as any
      });

      const availableTeams = await TradingService.getAvailableTeams(sessionId, currentTeamId);

      expect(availableTeams).toHaveLength(0);
    });
  });
});
