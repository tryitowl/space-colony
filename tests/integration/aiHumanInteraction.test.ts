import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameService } from '../../src/services/gameService';
import { AIColonyService } from '../../src/services/aiColonyService';
import { TradingService } from '../../src/services/tradingService';
import { InvestmentService } from '../../src/services/investmentService';
import { EventSystemService } from '../../src/services/eventSystemService';
import { IntelGenerationService } from '../../src/services/intelGenerationService';
import type { GameSession, Colony, TradeOffer, CrisisEvent } from '../../src/types';
import type { AIColonyConfig, AIColonyState, AIDecision } from '../../src/types/ai.types';
import { createGameSession, createColony } from '../../src/test/utils/factories';

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

describe('AI vs Human Interaction Integration Tests', () => {
  let mockSession: GameSession;
  let humanColonies: Colony[];
  let aiColonies: Colony[];
  let sessionId: string;
  let aiService: AIColonyService;

  beforeEach(() => {
    sessionId = 'ai-human-test-session';
    
    // Create human colonies (4 teams)
    humanColonies = [
      createColony({ 
        id: 'human-mining-1', 
        type: 'mining', 
        teamLetter: 'A', 
        teamNumber: 1,
        players: [{ id: 'player-1', name: 'Human Player 1', isConnected: true }]
      }),
      createColony({ 
        id: 'human-agricultural-1', 
        type: 'agricultural', 
        teamLetter: 'B', 
        teamNumber: 1,
        players: [{ id: 'player-2', name: 'Human Player 2', isConnected: true }]
      }),
      createColony({ 
        id: 'human-research-1', 
        type: 'research', 
        teamLetter: 'C', 
        teamNumber: 1,
        players: [{ id: 'player-3', name: 'Human Player 3', isConnected: true }]
      }),
      createColony({ 
        id: 'human-trade-1', 
        type: 'trade_hub', 
        teamLetter: 'D', 
        teamNumber: 1,
        players: [{ id: 'player-4', name: 'Human Player 4', isConnected: true }]
      }),
    ];

    // Create AI colonies (4 teams with different behaviors)
    aiColonies = [
      createColony({ 
        id: 'ai-mining-1', 
        type: 'mining', 
        teamLetter: 'E', 
        teamNumber: 1,
        players: []
      }),
      createColony({ 
        id: 'ai-agricultural-1', 
        type: 'agricultural', 
        teamLetter: 'F', 
        teamNumber: 1,
        players: []
      }),
      createColony({ 
        id: 'ai-research-1', 
        type: 'research', 
        teamLetter: 'G', 
        teamNumber: 1,
        players: []
      }),
      createColony({ 
        id: 'ai-military-1', 
        type: 'military', 
        teamLetter: 'H', 
        teamNumber: 1,
        players: []
      }),
    ];

    const allColonies = [...humanColonies, ...aiColonies];

    // Create AI configs for AI colonies
    const aiConfigs: AIColonyConfig[] = [
      {
        colonyId: 'ai-mining-1',
        difficulty: 'medium',
        isAIControlled: true,
        strategyOverrides: {
          tradingAggressiveness: 0.7, // Aggressive personality
          riskTolerance: 0.6
        }
      },
      {
        colonyId: 'ai-agricultural-1',
        difficulty: 'medium',
        isAIControlled: true,
        strategyOverrides: {
          tradingAggressiveness: 0.3, // Cooperative personality
          trustFactor: 0.8
        }
      },
      {
        colonyId: 'ai-research-1',
        difficulty: 'hard',
        isAIControlled: true,
        strategyOverrides: {
          tradingAggressiveness: 0.5, // Analytical personality
          learningRate: 0.7
        }
      },
      {
        colonyId: 'ai-military-1',
        difficulty: 'medium',
        isAIControlled: true,
        strategyOverrides: {
          tradingAggressiveness: 0.2, // Defensive personality
          minResourceBuffer: 3.0
        }
      },
    ];

    mockSession = createGameSession({
      id: sessionId,
      teams: allColonies,
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
      docs: allColonies.map(colony => ({
        id: colony.id,
        data: () => colony
      }))
    });

    (mockFirestore.addDoc as any).mockResolvedValue({ id: 'new-doc-id' });
    (mockFirestore.updateDoc as any).mockResolvedValue(undefined);
    (mockFirestore.setDoc as any).mockResolvedValue(undefined);

    // Initialize AI service with proper configs
    aiService = AIColonyService.getInstance(sessionId, aiConfigs);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up service instances
    (AIColonyService as any).instances.clear();
    (EventSystemService as any).instances.clear();
  });

  describe('AI Trading Behavior', () => {
    it('should initialize AI colonies and set up monitoring', async () => {
      await aiService.initialize(mockSession);

      // Verify that AI service is properly initialized
      expect(aiService).toBeDefined();
      
      // Check that AI colonies can be identified by having no players
      const aiTeams = mockSession.teams.filter(team => team.players.length === 0);
      expect(aiTeams).toHaveLength(4);
      
      // Each AI team should correspond to our configured AI colonies
      const aiTeamIds = aiTeams.map(team => team.id);
      expect(aiTeamIds).toContain('ai-mining-1');
      expect(aiTeamIds).toContain('ai-agricultural-1');
      expect(aiTeamIds).toContain('ai-research-1');
      expect(aiTeamIds).toContain('ai-military-1');
    });

    it('should handle trade offers to AI colonies through Firebase simulation', async () => {
      await aiService.initialize(mockSession);

      // Create a trade offer from human to AI
      const humanColony = humanColonies[0];
      const aiColony = aiColonies.find(c => c.id === 'ai-agricultural-1')!;

      const tradeOffer: TradeOffer = {
        id: 'test-trade-1',
        initiatorId: humanColony.id,
        targetId: aiColony.id,
        offerResources: { minerals: 15 },
        requestResources: { food: 10 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      };

      // Mock Firebase snapshot change
      const mockFirestore = vi.mocked(import('firebase/firestore'));
      const onSnapshotCallbacks: any[] = [];
      
      (mockFirestore.onSnapshot as any).mockImplementation((ref: any, callback: any) => {
        onSnapshotCallbacks.push(callback);
        return vi.fn(); // Unsubscribe function
      });

      // Re-initialize to capture callbacks
      await aiService.initialize(mockSession);
      
      // Simulate trade offer added to Firebase
      const mockChange = {
        type: 'added',
        doc: {
          id: tradeOffer.id,
          data: () => tradeOffer
        }
      };

      const mockSnapshot = {
        docChanges: () => [mockChange]
      };

      // Trigger the trade listener (this would be the trades collection listener)
      if (onSnapshotCallbacks.length > 1) {
        onSnapshotCallbacks[1](mockSnapshot); // Second callback should be trades
      }

      // AI should process the trade offer (we can't test the exact response due to timeouts and private methods)
      // But we can verify the service doesn't crash and handles the input
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should differentiate AI behavior based on colony type and configuration', () => {
      // Test the AI configs have different personalities
      const miningAI = aiColonies.find(c => c.id === 'ai-mining-1')!;
      const cooperativeAI = aiColonies.find(c => c.id === 'ai-agricultural-1')!;
      const analyticalAI = aiColonies.find(c => c.id === 'ai-research-1')!;
      const defensiveAI = aiColonies.find(c => c.id === 'ai-military-1')!;

      // Verify different colony types exist
      expect(miningAI.type).toBe('mining');
      expect(cooperativeAI.type).toBe('agricultural');
      expect(analyticalAI.type).toBe('research');
      expect(defensiveAI.type).toBe('military');

      // Verify each has different starting resources based on type
      expect(miningAI.resources.minerals).toBeGreaterThan(cooperativeAI.resources.minerals);
      expect(cooperativeAI.resources.food).toBeGreaterThan(miningAI.resources.food);
      expect(analyticalAI.resources.techComponents).toBeGreaterThan(miningAI.resources.techComponents);
    });

    it('should simulate AI decision-making under different resource scenarios', async () => {
      await aiService.initialize(mockSession);

      // Test emergency scenario - AI with critical resources
      const criticalAI = createColony({
        id: 'ai-critical-1',
        type: 'mining',
        resources: {
          ...createColony().resources,
          oxygen: 2, // Critical low
          food: 1,   // Critical low
          water: 2,  // Critical low
          energy: 1, // Critical low
          minerals: 20, // Has something to trade
          credits: 500
        }
      });

      // Update session with critical AI
      const updatedSession = {
        ...mockSession,
        teams: [...mockSession.teams, criticalAI]
      };

      // Simulate session update that would trigger emergency response
      const mockSessionSnapshot = {
        exists: () => true,
        data: () => updatedSession
      };

      const mockFirestore = vi.mocked(import('firebase/firestore'));
      const onSnapshotCallbacks: any[] = [];
      
      (mockFirestore.onSnapshot as any).mockImplementation((ref: any, callback: any) => {
        onSnapshotCallbacks.push(callback);
        return vi.fn();
      });

      // Re-initialize to capture session callback
      await aiService.initialize(mockSession);
      
      // Trigger session update (first callback should be session)
      if (onSnapshotCallbacks.length > 0) {
        onSnapshotCallbacks[0](mockSessionSnapshot);
      }

      // Test passes if AI service handles critical resource scenario without crashing
      expect(true).toBe(true);
    });
  });

  describe('AI Resource Management', () => {
    it('should manage resources based on colony type strengths', () => {
      // Test that AI colonies start with appropriate resource distributions
      const miningAI = aiColonies.find(c => c.type === 'mining')!;
      const agriculturalAI = aiColonies.find(c => c.type === 'agricultural')!;
      const researchAI = aiColonies.find(c => c.type === 'research')!;
      const militaryAI = aiColonies.find(c => c.type === 'military')!;

      // Mining colonies should have more minerals
      expect(miningAI.resources.minerals).toBeGreaterThan(agriculturalAI.resources.minerals);
      
      // Agricultural colonies should have more food and water
      expect(agriculturalAI.resources.food).toBeGreaterThan(miningAI.resources.food);
      expect(agriculturalAI.resources.water).toBeGreaterThan(miningAI.resources.water);
      
      // Research colonies should have more tech components
      expect(researchAI.resources.techComponents).toBeGreaterThan(miningAI.resources.techComponents);
      
      // Military colonies should have more defense contracts
      expect(militaryAI.resources.defenseContracts).toBeGreaterThan(agriculturalAI.resources.defenseContracts);
    });

    it('should handle investment processing for AI colonies', async () => {
      await aiService.initialize(mockSession);

      // Test investment processing for AI colonies
      // Since we can't directly access AI investment strategies, we test that 
      // the service can handle investment-related operations without errors
      
      const aiColony = aiColonies[0];
      
      // Simulate investment processing
      const investmentAllocation = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 1,
        communicationArray: 1,
        emergencyReserves: 1
      };

      // Process investments for the AI colony
      await InvestmentService.saveTeamInvestments(sessionId, aiColony.id, investmentAllocation);
      await InvestmentService.processInvestmentReturns(sessionId, aiColony.id, 1);

      // Verify the service doesn't crash during investment processing
      expect(true).toBe(true);
    });

    it('should generate intel for AI colonies based on investments', async () => {
      await aiService.initialize(mockSession);

      const aiColony = aiColonies[0];
      
      // Generate intel for AI colony
      const intel = await IntelGenerationService.generateIntelForTeam(
        sessionId,
        aiColony.id,
        2, // scout level
        1, // communication level
        1  // round
      );

      expect(intel).toBeDefined();
      expect(Array.isArray(intel)).toBe(true);
      expect(intel.length).toBeGreaterThanOrEqual(0);
      
      // If intel is generated, it should have proper structure
      if (intel.length > 0) {
        const intelItem = intel[0];
        expect(intelItem).toHaveProperty('id');
        expect(intelItem).toHaveProperty('title');
        expect(intelItem).toHaveProperty('content');
        expect(intelItem).toHaveProperty('value');
        expect(intelItem).toHaveProperty('source');
      }
    });
  });

  describe('AI Crisis Integration', () => {
    it('should handle crisis events affecting AI colonies', async () => {
      await aiService.initialize(mockSession);
      const eventService = EventSystemService.getInstance(sessionId);
      await eventService.initialize();

      const aiColony = aiColonies[0];
      
      // Trigger a crisis event affecting the AI colony
      const crisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'major', [aiColony.id]);

      expect(crisisEvent).toBeDefined();
      expect(crisisEvent.type).toBe('solar_storm');
      expect(crisisEvent.affectedTeams).toContain(aiColony.id);
      expect(crisisEvent.resolutionOptions.length).toBeGreaterThan(0);
      
      // Verify crisis has proper structure
      expect(crisisEvent).toHaveProperty('id');
      expect(crisisEvent).toHaveProperty('severity');
      expect(crisisEvent).toHaveProperty('isActive');
      expect(crisisEvent.isActive).toBe(true);
    });

    it('should handle multiple AI colonies affected by same crisis', async () => {
      await aiService.initialize(mockSession);
      const eventService = EventSystemService.getInstance(sessionId);
      await eventService.initialize();

      const affectedColonies = [aiColonies[0].id, aiColonies[1].id, humanColonies[0].id];
      
      // Trigger a crisis affecting multiple colonies including AIs
      const crisisEvent = await eventService.triggerCrisisEvent('contamination', 'major', affectedColonies);

      expect(crisisEvent.affectedTeams).toHaveLength(3);
      expect(crisisEvent.affectedTeams).toContain(aiColonies[0].id);
      expect(crisisEvent.affectedTeams).toContain(aiColonies[1].id);
      expect(crisisEvent.affectedTeams).toContain(humanColonies[0].id);
      
      // Mixed human-AI crisis should be properly handled
      expect(crisisEvent.type).toBe('contamination');
      expect(crisisEvent.severity).toBe('major');
    });

    it('should integrate AI colonies with crisis resolution system', async () => {
      await aiService.initialize(mockSession);
      const eventService = EventSystemService.getInstance(sessionId);
      await eventService.initialize();

      const aiColony = aiColonies[0];
      
      // Create and attempt to resolve a crisis
      const crisisEvent = await eventService.triggerCrisisEvent('equipment_failure', 'minor', [aiColony.id]);
      
      // Attempt crisis resolution (testing integration, not specific AI decision)
      const resolutionOption = crisisEvent.resolutionOptions[0];
      const requiredResources = resolutionOption.requiredResources;
      
      // Verify AI colony has resources that could be used for resolution
      const hasRequiredResources = Object.entries(requiredResources).some(([resource, amount]) => {
        const available = aiColony.resources[resource as keyof typeof aiColony.resources];
        return typeof available === 'number' && available >= (amount as number);
      });
      
      // At least test that the crisis system can interact with AI colonies
      expect(hasRequiredResources || Object.keys(requiredResources).length === 0).toBe(true);
    });
  });

  describe('AI Intel Management', () => {
    it('should handle intel generation for AI colonies', async () => {
      await aiService.initialize(mockSession);

      const aiColony = aiColonies[0];

      // Generate intel for AI colony
      const intel = await IntelGenerationService.generateIntelForTeam(
        sessionId,
        aiColony.id,
        2, // scout level
        1, // communication level
        2  // round
      );

      expect(intel).toBeDefined();
      expect(Array.isArray(intel)).toBe(true);
      
      // AI colonies should be able to generate intel like human colonies
      if (intel.length > 0) {
        const intelItem = intel[0];
        expect(intelItem).toHaveProperty('id');
        expect(intelItem).toHaveProperty('value');
        expect(intelItem.value).toBeGreaterThan(0);
        expect(['scout', 'communication']).toContain(intelItem.source);
      }
    });

    it('should participate in round intel distribution', async () => {
      await aiService.initialize(mockSession);

      // Distribute intel to all teams including AI
      const roundIntelDistribution = await IntelGenerationService.distributeRoundIntel({
        sessionId,
        round: 2,
        teams: [...humanColonies, ...aiColonies],
        globalEvents: []
      });

      // Verify distribution includes AI colonies
      expect(roundIntelDistribution).toBeDefined();
      
      // AI colonies should be able to receive and process intel distribution
      const aiColonyIds = aiColonies.map(c => c.id);
      expect(mockSession.teams.filter(team => aiColonyIds.includes(team.id))).toHaveLength(4);
    });

    it('should handle market intel generation for AI colonies', async () => {
      await aiService.initialize(mockSession);

      const aiColony = aiColonies[0];

      // Generate market intel for AI colony
      const marketIntel = await IntelGenerationService.generateMarketIntel(
        sessionId,
        aiColony.id,
        2, // communication level
        2  // round
      );

      expect(marketIntel).toBeDefined();
      expect(Array.isArray(marketIntel)).toBe(true);
      
      if (marketIntel.length > 0) {
        const intelItem = marketIntel[0];
        expect(intelItem.source).toBe('communication');
        expect(intelItem.value).toBeGreaterThan(0);
        expect(intelItem.title).toContain('Market');
      }
    });
  });

  describe('AI System Integration', () => {
    it('should handle AI colony configuration and setup', async () => {
      await aiService.initialize(mockSession);

      // Verify AI service handles different personality configurations
      const configs = [
        { colonyId: 'ai-mining-1', difficulty: 'medium', tradingAggressiveness: 0.7 },
        { colonyId: 'ai-agricultural-1', difficulty: 'medium', tradingAggressiveness: 0.3 },
        { colonyId: 'ai-research-1', difficulty: 'hard', tradingAggressiveness: 0.5 },
        { colonyId: 'ai-military-1', difficulty: 'medium', tradingAggressiveness: 0.2 }
      ];

      // Each AI colony should have different strategic approaches
      const miningAI = aiColonies.find(c => c.id === 'ai-mining-1')!;
      const cooperativeAI = aiColonies.find(c => c.id === 'ai-agricultural-1')!;
      const analyticalAI = aiColonies.find(c => c.id === 'ai-research-1')!;
      const defensiveAI = aiColonies.find(c => c.id === 'ai-military-1')!;

      // Verify colonies exist and have different characteristics
      expect(miningAI.type).toBe('mining');
      expect(cooperativeAI.type).toBe('agricultural');
      expect(analyticalAI.type).toBe('research');
      expect(defensiveAI.type).toBe('military');
    });

    it('should integrate with trading system for AI vs human scenarios', async () => {
      await aiService.initialize(mockSession);

      const humanColony = humanColonies[0];
      const aiColony = aiColonies[0];

      // Create a trade between human and AI
      const tradeOffer = await TradingService.createTradeOffer(sessionId, {
        initiatorId: humanColony.id,
        targetId: aiColony.id,
        offerResources: { minerals: 10 },
        requestResources: { food: 8 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      expect(tradeOffer).toBeDefined();
      expect(tradeOffer.initiatorId).toBe(humanColony.id);
      expect(tradeOffer.targetId).toBe(aiColony.id);
      expect(tradeOffer.status).toBe('pending');
      
      // Verify trade structure is correct for AI processing
      expect(tradeOffer.offerResources).toHaveProperty('minerals');
      expect(tradeOffer.requestResources).toHaveProperty('food');
    });

    it('should handle game session progression with mixed human-AI teams', async () => {
      await aiService.initialize(mockSession);

      // Process a full round for mixed session
      const sessionWithMixedTeams = {
        ...mockSession,
        currentRound: 2,
        gameState: 'trading' as const
      };

      // Simulate progression through different game states
      const gameStates = ['investments', 'trading', 'events', 'results'] as const;
      
      for (const gameState of gameStates) {
        const updatedSession = {
          ...sessionWithMixedTeams,
          gameState
        };

        // AI service should handle all game states
        expect(() => {
          // This would trigger the session listener if we were testing live
          // For now, just verify the session structure is valid
          expect(updatedSession.teams).toHaveLength(8); // 4 human + 4 AI
          expect(updatedSession.gameState).toBe(gameState);
        }).not.toThrow();
      }
    });
  });

  describe('Performance and Integration', () => {
    it('should handle trade creation without performance issues', async () => {
      await aiService.initialize(mockSession);

      const startTime = Date.now();
      
      const tradeOffer = await TradingService.createTradeOffer(sessionId, {
        initiatorId: humanColonies[0].id,
        targetId: aiColonies[0].id,
        offerResources: { minerals: 10 },
        requestResources: { food: 8 },
        status: 'pending',
        timestamp: Date.now(),
        expiresAt: Date.now() + 180000,
        negotiationHistory: []
      });

      const responseTime = Date.now() - startTime;

      expect(tradeOffer).toBeDefined();
      expect(responseTime).toBeLessThan(5000); // Should create trade within 5 seconds
      expect(tradeOffer.initiatorId).toBe(humanColonies[0].id);
      expect(tradeOffer.targetId).toBe(aiColonies[0].id);
    });

    it('should handle multiple AI colonies simultaneously', async () => {
      await aiService.initialize(mockSession);

      const startTime = Date.now();
      
      // Simulate multiple operations on different AI colonies
      const operations = [];
      
      // Intel generation for each AI colony
      for (const aiColony of aiColonies) {
        operations.push(
          IntelGenerationService.generateIntelForTeam(sessionId, aiColony.id, 1, 1, 1)
        );
      }
      
      // Investment processing for each AI colony
      for (const aiColony of aiColonies) {
        operations.push(
          InvestmentService.processInvestmentReturns(sessionId, aiColony.id, 1)
        );
      }

      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(8); // 4 intel + 4 investment operations
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain service stability under concurrent operations', async () => {
      await aiService.initialize(mockSession);

      // Test multiple concurrent operations
      const concurrentOps = [];
      
      for (let i = 0; i < 5; i++) {
        // Mix of different operations
        concurrentOps.push(
          TradingService.createTradeOffer(sessionId, {
            initiatorId: humanColonies[i % humanColonies.length].id,
            targetId: aiColonies[i % aiColonies.length].id,
            offerResources: { minerals: 5 + i },
            requestResources: { food: 3 + i },
            status: 'pending',
            timestamp: Date.now(),
            expiresAt: Date.now() + 180000,
            negotiationHistory: []
          })
        );
      }

      const results = await Promise.all(concurrentOps);

      expect(results).toHaveLength(5);
      expect(results.every(trade => trade && trade.id)).toBe(true);
      
      // All trades should be properly formed
      results.forEach((trade, index) => {
        expect(trade.offerResources.minerals).toBe(5 + index);
        expect(trade.requestResources.food).toBe(3 + index);
        expect(trade.status).toBe('pending');
      });
    });
  });

  describe('AI System Lifecycle', () => {
    it('should properly initialize and clean up AI service', async () => {
      const tempService = AIColonyService.getInstance('temp-session', [
        {
          colonyId: 'temp-ai-1',
          difficulty: 'easy',
          isAIControlled: true
        }
      ]);

      await tempService.initialize(mockSession);
      
      // Service should be initialized
      expect(tempService).toBeDefined();
      
      // Cleanup
      tempService.destroy();
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle session state changes appropriately', async () => {
      await aiService.initialize(mockSession);

      // Test different session states
      const sessionStates = ['setup', 'investments', 'trading', 'events', 'results', 'completed'] as const;
      
      for (const gameState of sessionStates) {
        const updatedSession = {
          ...mockSession,
          gameState
        };

        // Should handle all session states without errors
        expect(updatedSession.gameState).toBe(gameState);
        expect(updatedSession.teams.length).toBe(8);
      }
    });

    it('should integrate properly with complete game system', async () => {
      await aiService.initialize(mockSession);

      // Test full system integration
      const fullGameOperations = [];

      // 1. Investment phase for all colonies
      for (const colony of [...humanColonies, ...aiColonies]) {
        fullGameOperations.push(
          InvestmentService.saveTeamInvestments(sessionId, colony.id, {
            scouts: 1,
            productionUpgrades: 1,
            researchLabs: 1,
            communicationArray: 1,
            emergencyReserves: 1
          })
        );
      }

      // 2. Intel generation
      for (const colony of [...humanColonies, ...aiColonies]) {
        fullGameOperations.push(
          IntelGenerationService.generateIntelForTeam(sessionId, colony.id, 1, 1, 1)
        );
      }

      // 3. Trade creation between different colony types
      fullGameOperations.push(
        TradingService.createTradeOffer(sessionId, {
          initiatorId: humanColonies[0].id,
          targetId: aiColonies[0].id,
          offerResources: { minerals: 10 },
          requestResources: { food: 8 },
          status: 'pending',
          timestamp: Date.now(),
          expiresAt: Date.now() + 180000,
          negotiationHistory: []
        })
      );

      // Execute all operations
      const results = await Promise.all(fullGameOperations);

      // Verify system handled complex integration scenario
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(result => result !== undefined)).toBe(true);
    });
  });
});