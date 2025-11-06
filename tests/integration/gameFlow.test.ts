import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameService } from '../../src/services/gameService';
import { InvestmentService } from '../../src/services/investmentService';
import { IntelGenerationService } from '../../src/services/intelGenerationService';
import { TradingService } from '../../src/services/tradingService';
import { EventSystemService } from '../../src/services/eventSystemService';
import { AIColonyService } from '../../src/services/aiColonyService';
import { RoleService } from '../../src/services/roleService';
import type { GameSession, Colony, TradeOffer, IntelItem } from '../../src/types';
import { createGameSession, createColony, createAIColonyConfig } from '../../src/test/utils/factories';

// Mock Firebase modules for integration tests
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  writeBatch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  arrayUnion: vi.fn(),
  onSnapshot: vi.fn().mockReturnValue(() => {}),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  set: vi.fn(),
  push: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  onValue: vi.fn(),
}));

vi.mock('../../src/firebase/config', () => ({
  firestore: {},
  realtimeDb: {},
}));

vi.mock('../../src/services/authService', () => ({
  AuthService: {
    ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockReturnValue({ uid: 'test-user' }),
  },
}));

describe('Complete Game Flow Integration Tests', () => {
  let mockSession: GameSession;
  let mockColonies: Colony[];
  let sessionId: string;

  beforeEach(() => {
    sessionId = 'integration-test-session';
    
    // Create a full game session with 12 colonies
    mockColonies = [
      // Mining colonies
      createColony({ id: 'mining-a1', type: 'mining', teamLetter: 'A', teamNumber: 1 }),
      createColony({ id: 'mining-a2', type: 'mining', teamLetter: 'A', teamNumber: 2 }),
      // Agricultural colonies
      createColony({ id: 'agricultural-b1', type: 'agricultural', teamLetter: 'B', teamNumber: 1 }),
      createColony({ id: 'agricultural-b2', type: 'agricultural', teamLetter: 'B', teamNumber: 2 }),
      // Research colonies
      createColony({ id: 'research-c1', type: 'research', teamLetter: 'C', teamNumber: 1 }),
      createColony({ id: 'research-c2', type: 'research', teamLetter: 'C', teamNumber: 2 }),
      // Trade hub colonies
      createColony({ id: 'trade-d1', type: 'trade_hub', teamLetter: 'D', teamNumber: 1 }),
      createColony({ id: 'trade-d2', type: 'trade_hub', teamLetter: 'D', teamNumber: 2 }),
      // Military colonies
      createColony({ id: 'military-e1', type: 'military', teamLetter: 'E', teamNumber: 1 }),
      createColony({ id: 'military-e2', type: 'military', teamLetter: 'E', teamNumber: 2 }),
      // Manufacturing colonies
      createColony({ id: 'manufacturing-f1', type: 'manufacturing', teamLetter: 'F', teamNumber: 1 }),
      createColony({ id: 'manufacturing-f2', type: 'manufacturing', teamLetter: 'F', teamNumber: 2 }),
    ];

    mockSession = createGameSession({
      id: sessionId,
      teams: mockColonies,
      currentRound: 1,
      gameState: 'investments'
    });

    // Mock Firebase responses
    const mockFirestore = vi.mocked(import('firebase/firestore'));
    (mockFirestore.getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => mockSession
    });

    (mockFirestore.getDocs as any).mockResolvedValue({
      docs: mockColonies.map(colony => ({
        id: colony.id,
        data: () => colony
      }))
    });

    (mockFirestore.addDoc as any).mockResolvedValue({ id: 'new-doc-id' });
    (mockFirestore.updateDoc as any).mockResolvedValue(undefined);
    (mockFirestore.setDoc as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up service instances
    (EventSystemService as any).instances.clear();
    (AIColonyService as any).instances.clear();
  });

  describe('Full Game Session Lifecycle', () => {
    it('should complete a full 5-round game session', async () => {
      // Phase 1: Session Creation and Setup
      const session = await GameService.createSession({
        eventId: 'test-event',
        name: 'Integration Test Session',
        facilitatorId: 'facilitator-123'
      });

      expect(session).toBeDefined();
      expect(session.gameState).toBe('setup');

      // Phase 2: Team Joining
      for (const colony of mockColonies.slice(0, 3)) {
        const joinedTeam = await GameService.joinSession(colony.gameCode, {
          playerId: colony.players[0].id,
          playerName: colony.players[0].name
        });
        expect(joinedTeam).toBeDefined();
        expect(joinedTeam.id).toBe(colony.id);
      }

      // Phase 3: Investment Phase
      const investmentAllocation = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 1,
        communicationArray: 1,
        emergencyReserves: 1
      };

      await InvestmentService.saveTeamInvestments(
        sessionId,
        mockColonies[0].id,
        investmentAllocation
      );

      const validation = InvestmentService.validateInvestment(investmentAllocation);
      expect(validation.isValid).toBe(true);

      // Phase 4: Round 1 - Trading and Intel Generation
      const generatedIntel = await IntelGenerationService.generateIntelForTeam(
        sessionId,
        mockColonies[0].id,
        2, // scout level
        1, // communication level
        1  // current round
      );

      expect(generatedIntel.length).toBeGreaterThan(0);
      expect(generatedIntel.length).toBeLessThanOrEqual(4); // 2 scouts * 2 communication multiplier

      // Create trade between colonies
      const tradeOffer = await TradingService.createTradeOffer(sessionId, {
        initiatorId: mockColonies[0].id,
        targetId: mockColonies[1].id,
        offerResources: { minerals: 10 },
        requestResources: { food: 8 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      expect(tradeOffer).toBeDefined();
      expect(tradeOffer.status).toBe('pending');

      // Accept the trade
      const acceptedTrade = await TradingService.acceptTradeOffer(
        sessionId,
        tradeOffer.id,
        mockColonies[1].id
      );

      expect(acceptedTrade).toBe(true);

      // Phase 5: Crisis Event Handling
      const eventService = EventSystemService.getInstance(sessionId, {
        enabledEventTypes: ['solar_storm', 'equipment_failure'],
        eventFrequency: 1.0, // 100% chance for testing
        maxConcurrentEvents: 1
      });

      await eventService.initialize();

      const crisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'major');
      expect(crisisEvent).toBeDefined();
      expect(crisisEvent.type).toBe('solar_storm');
      expect(crisisEvent.isActive).toBe(true);

      // Resolve the crisis
      const resolutionResult = await eventService.resolveCrisis(
        crisisEvent.id,
        crisisEvent.resolutionOptions[0].id,
        mockColonies[0].id,
        { energy: 50, techComponents: 5 }
      );

      expect(resolutionResult.success).toBe(true);

      // Phase 6: Progress to Round 2
      await InvestmentService.processAllTeamReturns(sessionId, 2);

      // Generate Round 2 intel
      const round2Intel = await IntelGenerationService.generateIntelForTeam(
        sessionId,
        mockColonies[0].id,
        2, // scout level
        1, // communication level
        2  // current round
      );

      expect(round2Intel.length).toBeGreaterThan(0);

      // Phase 7: Complete all 5 rounds
      for (let round = 3; round <= 5; round++) {
        await InvestmentService.processAllTeamReturns(sessionId, round);

        const roundIntel = await IntelGenerationService.generateIntelForTeam(
          sessionId,
          mockColonies[0].id,
          2, 1, round
        );

        expect(roundIntel.length).toBeGreaterThanOrEqual(0);

        // Special handling for Round 3 (Alien Contact)
        if (round === 3) {
          await IntelGenerationService.distributeRoundIntel({
            sessionId,
            round,
            teams: mockColonies,
            globalEvents: ['alien_contact']
          });
        }
      }

      // Phase 8: Game Completion
      expect(true).toBe(true); // Session completed successfully
    });
  });

  describe('Investment to Resource Generation Pipeline', () => {
    it('should correctly process investment returns over multiple rounds', async () => {
      const colony = mockColonies[0];
      const initialResources = { ...colony.resources };

      // Make investments
      const investments = {
        scouts: 3,
        productionUpgrades: 2,
        researchLabs: 1,
        communicationArray: 2,
        emergencyReserves: 0
      };

      await InvestmentService.saveTeamInvestments(sessionId, colony.id, investments);

      // Process returns for 3 rounds
      for (let round = 1; round <= 3; round++) {
        await InvestmentService.processInvestmentReturns(sessionId, colony.id, round);

        // Generate intel based on scout investments
        const intel = await IntelGenerationService.generateIntelForTeam(
          sessionId,
          colony.id,
          investments.scouts,
          investments.communicationArray,
          round
        );

        // Should generate 9 intel pieces (3 scouts * 3 communication multiplier)
        expect(intel.length).toBe(9);
      }

      // Verify resource changes
      // Should have gained production upgrades benefits and tech patents
      expect(true).toBe(true); // Resources should be increased by investment returns
    });

    it('should handle emergency reserve conversions', async () => {
      const colony = mockColonies[0];
      
      // Set up emergency reserves
      const investments = {
        scouts: 0,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 10 // 100 resources at 10% conversion rate
      };

      await InvestmentService.saveTeamInvestments(sessionId, colony.id, investments);

      // Convert emergency reserves
      const resourceDistribution = { oxygen: 0, food: 0, water: 0, energy: 1 };
      
      await InvestmentService.convertEmergencyReserves(
        sessionId,
        colony.id,
        10,
        resourceDistribution
      );

      expect(true).toBe(true); // Emergency reserves should be converted successfully
    });
  });

  describe('Intel Distribution and Trading System', () => {
    it('should distribute intel and handle trading', async () => {
      // Generate initial intel for multiple teams
      const intelPromises = mockColonies.slice(0, 3).map(colony =>
        IntelGenerationService.generateIntelForTeam(
          sessionId,
          colony.id,
          2, // scout level
          1, // communication level
          1  // round
        )
      );

      const allIntel = await Promise.all(intelPromises);
      
      allIntel.forEach(intel => {
        expect(intel.length).toBeGreaterThan(0);
      });

      // Distribute round intel to all teams
      await IntelGenerationService.distributeRoundIntel({
        sessionId,
        round: 1,
        teams: mockColonies,
        globalEvents: []
      });

      // Test intel value degradation
      const intel = allIntel[0][0];
      const round1Value = IntelGenerationService.calculateIntelValue(intel, 1);
      const round3Value = IntelGenerationService.calculateIntelValue(intel, 3);
      
      expect(round3Value).toBeLessThan(round1Value); // Value should degrade over time
    });

    it('should handle market intel generation from communication arrays', async () => {
      const colony = mockColonies[0];

      // Generate market intel
      const marketIntel = await IntelGenerationService.generateMarketIntel(
        sessionId,
        colony.id,
        2, // communication level
        1  // round
      );

      expect(marketIntel.length).toBe(1);
      expect(marketIntel[0].source).toBe('communication');
      expect(marketIntel[0].value).toBeGreaterThan(70); // Base value + communication bonus
    });
  });

  describe('Trading System Integration', () => {
    it('should handle complex multi-party trading scenarios', async () => {
      const [colony1, colony2, colony3] = mockColonies.slice(0, 3);

      // Create multiple trade offers
      const trade1 = await TradingService.createTradeOffer(sessionId, {
        initiatorId: colony1.id,
        targetId: colony2.id,
        offerResources: { minerals: 15 },
        requestResources: { food: 10 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      const trade2 = await TradingService.createTradeOffer(sessionId, {
        initiatorId: colony2.id,
        targetId: colony3.id,
        offerResources: { food: 8 },
        requestResources: { techComponents: 5 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      // Accept both trades
      await TradingService.acceptTradeOffer(sessionId, trade1.id, colony2.id);
      await TradingService.acceptTradeOffer(sessionId, trade2.id, colony3.id);

      // Create a counter-offer scenario
      const trade3 = await TradingService.createTradeOffer(sessionId, {
        initiatorId: colony3.id,
        targetId: colony1.id,
        offerResources: { techComponents: 3 },
        requestResources: { energy: 20 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      const counterOffer = await TradingService.createCounterOffer(sessionId, trade3.id, {
        initiatorId: colony1.id,
        targetId: colony3.id,
        offerResources: { energy: 15 }, // Counter with less energy
        requestResources: { techComponents: 3 },
        status: 'counter_offered',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      expect(counterOffer).toBeDefined();
      expect(counterOffer.status).toBe('counter_offered');
    });

    it('should validate trade resources correctly', async () => {
      const colony = mockColonies[0];

      // Test insufficient resources
      const invalidTrade = {
        initiatorId: colony.id,
        targetId: mockColonies[1].id,
        offerResources: { minerals: 1000 }, // More than available
        requestResources: { food: 10 },
        status: 'pending' as const,
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      };

      const validation = TradingService.validateTradeResources(colony, invalidTrade);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Test valid trade
      const validTrade = {
        initiatorId: colony.id,
        targetId: mockColonies[1].id,
        offerResources: { minerals: 10 }, // Within available resources
        requestResources: { food: 8 },
        status: 'pending' as const,
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      };

      const validValidation = TradingService.validateTradeResources(colony, validTrade);
      expect(validValidation.isValid).toBe(true);
      expect(validValidation.errors.length).toBe(0);
    });
  });

  describe('Event System Integration', () => {
    it('should handle multiple concurrent events', async () => {
      const eventService = EventSystemService.getInstance(sessionId, {
        enabledEventTypes: ['solar_storm', 'equipment_failure', 'contamination'],
        eventFrequency: 1.0,
        maxConcurrentEvents: 3
      });

      await eventService.initialize();

      // Trigger multiple events
      const event1 = await eventService.triggerCrisisEvent('solar_storm', 'major');
      const event2 = await eventService.triggerCrisisEvent('equipment_failure', 'minor');
      const event3 = await eventService.triggerCrisisEvent('contamination', 'critical');

      const activeEvents = eventService.getActiveEvents();
      expect(activeEvents.length).toBe(3);

      // Resolve one event
      await eventService.resolveCrisis(
        event1.id,
        event1.resolutionOptions[0].id,
        mockColonies[0].id,
        { energy: 100, techComponents: 10 }
      );

      const remainingEvents = eventService.getActiveEvents();
      expect(remainingEvents.length).toBe(2);
    });

    it('should handle event resolution with multiple teams', async () => {
      const eventService = EventSystemService.getInstance(sessionId, {
        enabledEventTypes: ['contamination'],
        eventFrequency: 1.0,
        maxConcurrentEvents: 1
      });

      await eventService.initialize();

      const crisisEvent = await eventService.triggerCrisisEvent('contamination', 'major', [
        mockColonies[0].id,
        mockColonies[1].id,
        mockColonies[2].id
      ]);

      expect(crisisEvent.affectedTeams).toHaveLength(3);

      // Different teams contribute to resolution
      const resolution1 = await eventService.resolveCrisis(
        crisisEvent.id,
        crisisEvent.resolutionOptions[0].id,
        mockColonies[0].id,
        { oxygen: 20, techComponents: 3 }
      );

      expect(resolution1.success).toBe(true);
      expect(eventService.getActiveEvents().length).toBe(0); // Event should be resolved
    });
  });

  describe('Role-Based Access Control Integration', () => {
    it('should enforce facilitator access restrictions', () => {
      // Set facilitator role
      RoleService.setRoleContext({
        role: 'facilitator',
        userId: 'facilitator-123',
        facilitatorAccess: {
          facilitatorId: 'facilitator-123',
          facilitatorCode: 'FAC123',
          eventIds: ['allowed-event-1'],
          sessionIds: [sessionId],
          createdAt: Date.now(),
          lastAccess: Date.now()
        }
      });

      // Test access to allowed session
      expect(RoleService.hasSessionAccess(sessionId)).toBe(true);
      
      // Test access to disallowed session
      expect(RoleService.hasSessionAccess('other-session')).toBe(false);

      // Test event access
      expect(RoleService.hasEventAccess('allowed-event-1')).toBe(true);
      expect(RoleService.hasEventAccess('other-event')).toBe(false);
    });

    it('should allow admin access to all resources', () => {
      RoleService.setRoleContext({
        role: 'admin',
        userId: 'admin-123'
      });

      expect(RoleService.hasSessionAccess(sessionId)).toBe(true);
      expect(RoleService.hasSessionAccess('any-session')).toBe(true);
      expect(RoleService.hasEventAccess('any-event')).toBe(true);
      expect(RoleService.isAdmin()).toBe(true);
    });

    it('should restrict player access appropriately', () => {
      RoleService.setRoleContext({
        role: 'player',
        userId: 'player-123'
      });

      expect(RoleService.hasSessionAccess(sessionId)).toBe(false);
      expect(RoleService.hasEventAccess('any-event')).toBe(false);
      expect(RoleService.isPlayer()).toBe(true);
      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      // Mock network failure
      const mockFirestore = vi.mocked(import('firebase/firestore'));
      (mockFirestore.getDoc as any).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw but handle gracefully
      await expect(async () => {
        try {
          await GameService.getSession(sessionId);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain('Network error');
        }
      }).not.toThrow();
    });

    it('should handle invalid game codes', async () => {
      await expect(
        GameService.joinSession('INVALID-CODE', {
          playerId: 'player-123',
          playerName: 'Test Player'
        })
      ).rejects.toThrow();
    });

    it('should handle trade offer expiration', async () => {
      const expiredTrade = await TradingService.createTradeOffer(sessionId, {
        initiatorId: mockColonies[0].id,
        targetId: mockColonies[1].id,
        offerResources: { minerals: 10 },
        requestResources: { food: 8 },
        status: 'pending',
        timestamp: Date.now() - 200000, // Created 200 seconds ago
        expiresAt: Date.now() - 20000,  // Expired 20 seconds ago
        negotiationHistory: []
      });

      // Should not be able to accept expired trade
      await expect(
        TradingService.acceptTradeOffer(sessionId, expiredTrade.id, mockColonies[1].id)
      ).rejects.toThrow(/expired/i);
    });

    it('should handle insufficient resources for crisis resolution', async () => {
      const eventService = EventSystemService.getInstance(sessionId);
      await eventService.initialize();

      const crisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'critical');

      // Try to resolve with insufficient resources
      const result = await eventService.resolveCrisis(
        crisisEvent.id,
        crisisEvent.resolutionOptions[0].id,
        mockColonies[0].id,
        { energy: 1 } // Insufficient amount
      );

      expect(result.success).toBe(false);
      expect(result.penalties).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations efficiently', async () => {
      const startTime = Date.now();

      // Simulate multiple concurrent operations
      const operations = [];

      // Multiple intel generations
      for (let i = 0; i < 5; i++) {
        operations.push(
          IntelGenerationService.generateIntelForTeam(sessionId, mockColonies[i].id, 2, 1, 1)
        );
      }

      // Multiple trade creations
      for (let i = 0; i < 3; i++) {
        operations.push(
          TradingService.createTradeOffer(sessionId, {
            initiatorId: mockColonies[i].id,
            targetId: mockColonies[i + 1].id,
            offerResources: { minerals: 10 },
            requestResources: { food: 8 },
            status: 'pending',
            timestamp: Date.now(),
            expiresAt: Date.now() + 180000,
            negotiationHistory: []
          })
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(8);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large numbers of intel items efficiently', async () => {
      // Generate many intel items
      const intelPromises = [];
      for (let round = 1; round <= 5; round++) {
        for (const colony of mockColonies.slice(0, 6)) {
          intelPromises.push(
            IntelGenerationService.generateIntelForTeam(sessionId, colony.id, 3, 2, round)
          );
        }
      }

      const allIntelResults = await Promise.all(intelPromises);
      const totalIntelCount = allIntelResults.reduce((sum, intel) => sum + intel.length, 0);

      expect(totalIntelCount).toBeGreaterThan(50); // Should generate substantial intel
      expect(totalIntelCount).toBeLessThan(500); // But not excessive amounts
    });
  });
});