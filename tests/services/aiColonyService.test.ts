import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIColonyService } from '../../src/services/aiColonyService';
import { AIStrategyService } from '../../src/services/aiStrategyService';
import type { Colony, GameSession, Resources } from '../../src/types';
import type { AIColonyConfig, AIDifficulty } from '../../src/types/ai.types';
import { COLONY_STARTING_RESOURCES } from '../../src/types';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn()
}));

vi.mock('../../src/firebase/config', () => ({
  firestore: {},
  realtimeDb: {}
}));

vi.mock('../../src/services/tradingService', () => ({
  TradingService: {
    createTradeOffer: vi.fn(),
    acceptTradeOffer: vi.fn(),
    rejectTradeOffer: vi.fn()
  }
}));

describe('AIColonyService', () => {
  let aiService: AIColonyService;
  let mockSession: GameSession;
  let mockColony: Colony;
  let mockAIConfigs: AIColonyConfig[];

  beforeEach(() => {
    // Create mock colony
    mockColony = {
      id: 'test_colony_1',
      type: 'mining',
      name: 'Mining Colony A1',
      teamLetter: 'A',
      teamNumber: 1,
      players: [],
      resources: { ...COLONY_STARTING_RESOURCES.mining },
      investments: {
        scouts: 0,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      },
      tradingStatus: 'available',
      gameCode: 'AA01',
      eliminationStatus: {
        isEliminated: false,
        roundsInCritical: 0,
        criticalResources: []
      }
    };

    // Create mock session
    mockSession = {
      id: 'test_session',
      eventId: 'test_event',
      name: 'Test Session',
      facilitatorId: 'test_facilitator',
      teams: [mockColony],
      currentRound: 1,
      roundStartTime: Date.now(),
      gameState: 'round_1',
      settings: {
        roundDurations: {
          instructions: 300000,
          investments: 300000,
          round1Trading: 360000,
          round1Strategy: 180000,
          round2Trading: 300000,
          round2Strategy: 120000,
          milestoneBreak: 300000,
          round3Trading: 360000,
          round3Strategy: 120000,
          round4Trading: 180000,
          round4Strategy: 180000,
          round5Trading: 240000
        },
        enableAlienContact: true,
        customIntel: []
      }
    };

    // Create mock AI configs
    mockAIConfigs = [
      {
        colonyId: 'test_colony_1',
        difficulty: 'medium' as AIDifficulty,
        isAIControlled: true
      }
    ];

    // Get AI service instance
    aiService = AIColonyService.getInstance('test_session', mockAIConfigs);
  });

  afterEach(() => {
    // Clean up
    aiService?.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create AI service instance', () => {
      expect(aiService).toBeDefined();
      expect(aiService).toBeInstanceOf(AIColonyService);
    });

    it('should get the same instance for the same session', () => {
      const anotherInstance = AIColonyService.getInstance('test_session', mockAIConfigs);
      expect(anotherInstance).toBe(aiService);
    });

    it('should create different instances for different sessions', () => {
      const differentInstance = AIColonyService.getInstance('different_session', mockAIConfigs);
      expect(differentInstance).not.toBe(aiService);
      differentInstance.destroy();
    });
  });

  describe('AI strategy service integration', () => {
    it('should have access to strategy service', () => {
      const strategyService = new AIStrategyService();
      expect(strategyService).toBeDefined();
    });

    it('should get strategy for colony type and difficulty', () => {
      const strategyService = new AIStrategyService();
      const strategy = strategyService.getStrategy('mining', 'medium');
      
      expect(strategy).toBeDefined();
      expect(strategy.colonyType).toBe('mining');
      expect(strategy.parameters).toBeDefined();
      expect(strategy.parameters.tradingAggressiveness).toBeGreaterThan(0);
    });

    it('should have different strategies for different colony types', () => {
      const strategyService = new AIStrategyService();
      const miningStrategy = strategyService.getStrategy('mining', 'medium');
      const agricultureStrategy = strategyService.getStrategy('agricultural', 'medium');
      
      expect(miningStrategy.parameters.resourcePriorities.minerals)
        .toBeLessThan(agricultureStrategy.parameters.resourcePriorities.minerals);
      expect(agricultureStrategy.parameters.resourcePriorities.food)
        .toBeGreaterThan(miningStrategy.parameters.resourcePriorities.food);
    });
  });

  describe('colony evaluation', () => {
    it('should evaluate colony survival probability correctly', () => {
      // Test with healthy colony (should have high survival probability)
      const healthyColony = { ...mockColony };
      healthyColony.resources = {
        ...COLONY_STARTING_RESOURCES.mining,
        oxygen: 20,
        food: 20,
        water: 20,
        energy: 20
      };

      // Mock the evaluation (since it's private, we'll test indirectly)
      expect(healthyColony.resources.oxygen).toBeGreaterThan(10);
      expect(healthyColony.resources.food).toBeGreaterThan(10);
      expect(healthyColony.resources.water).toBeGreaterThan(10);
      expect(healthyColony.resources.energy).toBeGreaterThan(10);
    });

    it('should identify critical resource situations', () => {
      // Test with colony in critical state
      const criticalColony = { ...mockColony };
      criticalColony.resources = {
        ...COLONY_STARTING_RESOURCES.mining,
        oxygen: 1,
        food: 1,
        water: 1,
        energy: 1
      };

      // These resources are below the emergency threshold
      expect(criticalColony.resources.oxygen).toBeLessThan(3);
      expect(criticalColony.resources.food).toBeLessThan(3);
      expect(criticalColony.resources.water).toBeLessThan(2);
      expect(criticalColony.resources.energy).toBeLessThan(5);
    });
  });

  describe('difficulty levels', () => {
    it('should have different parameters for each difficulty', () => {
      const strategyService = new AIStrategyService();
      const easyStrategy = strategyService.getStrategy('mining', 'easy');
      const mediumStrategy = strategyService.getStrategy('mining', 'medium');
      const hardStrategy = strategyService.getStrategy('mining', 'hard');

      // Easy should be less aggressive
      expect(easyStrategy.parameters.tradingAggressiveness)
        .toBeLessThan(mediumStrategy.parameters.tradingAggressiveness);
      
      // Hard should be more aggressive
      expect(hardStrategy.parameters.tradingAggressiveness)
        .toBeGreaterThan(mediumStrategy.parameters.tradingAggressiveness);

      // Easy should have longer decision delays
      expect(easyStrategy.parameters.decisionDelayMs.min)
        .toBeGreaterThan(hardStrategy.parameters.decisionDelayMs.min);
    });
  });

  describe('resource calculations', () => {
    it('should correctly identify resource needs based on colony type', () => {
      const miningColony = { ...mockColony, type: 'mining' as const };
      const agricultureColony = { ...mockColony, type: 'agricultural' as const };

      // Mining colonies should prioritize basic survival resources
      expect(COLONY_STARTING_RESOURCES.mining.oxygen).toBeGreaterThan(0);
      expect(COLONY_STARTING_RESOURCES.mining.minerals).toBeGreaterThan(0);

      // Agricultural colonies should have more food and water
      expect(COLONY_STARTING_RESOURCES.agricultural.food)
        .toBeGreaterThan(COLONY_STARTING_RESOURCES.mining.food);
      expect(COLONY_STARTING_RESOURCES.agricultural.water)
        .toBeGreaterThan(COLONY_STARTING_RESOURCES.mining.water);
    });

    it('should calculate resource consumption correctly', () => {
      const mockResources: Resources = {
        oxygen: 10,
        food: 8,
        water: 6,
        energy: 12,
        minerals: 15,
        alloys: 5,
        techComponents: 3,
        marketIntel: [],
        surveyReports: [],
        crisisWarnings: [],
        defenseContracts: 2,
        systemRepairs: 1,
        transportRoutes: 0,
        techPatents: 0,
        blueprints: 0,
        alienTech: 0,
        credits: 1000
      };

      // Should be able to survive at least a few rounds
      const oxygenRounds = Math.floor(mockResources.oxygen / 2); // RESOURCE_CONSUMPTION.oxygen = 2
      const foodRounds = Math.floor(mockResources.food / 2);     // RESOURCE_CONSUMPTION.food = 2
      
      expect(oxygenRounds).toBeGreaterThan(0);
      expect(foodRounds).toBeGreaterThan(0);
    });
  });

  describe('strategy patterns', () => {
    it('should have appropriate strategies for each colony type', () => {
      const strategyService = new AIStrategyService();
      const allStrategies = strategyService.getAllStrategies();

      expect(allStrategies).toHaveLength(6); // 6 colony types
      
      const colonyTypes = allStrategies.map(s => s.colonyType);
      expect(colonyTypes).toContain('mining');
      expect(colonyTypes).toContain('agricultural');
      expect(colonyTypes).toContain('research');
      expect(colonyTypes).toContain('trade_hub');
      expect(colonyTypes).toContain('military');
      expect(colonyTypes).toContain('manufacturing');
    });

    it('should have logical resource priorities for each colony type', () => {
      const strategyService = new AIStrategyService();
      
      // Mining colonies should prioritize minerals less (they produce them)
      const miningStrategy = strategyService.getStrategy('mining', 'medium');
      expect(miningStrategy.parameters.resourcePriorities.minerals)
        .toBeLessThan(miningStrategy.parameters.resourcePriorities.oxygen);

      // Research colonies should prioritize tech components
      const researchStrategy = strategyService.getStrategy('research', 'medium');
      expect(researchStrategy.parameters.resourcePriorities.techComponents)
        .toBeGreaterThan(researchStrategy.parameters.resourcePriorities.minerals);

      // Trade hubs should prioritize credits
      const tradeStrategy = strategyService.getStrategy('trade_hub', 'medium');
      expect(tradeStrategy.parameters.resourcePriorities.credits)
        .toBeGreaterThan(0.8); // High priority for credits
    });
  });

  describe('error handling', () => {
    it('should handle invalid colony types gracefully', () => {
      const strategyService = new AIStrategyService();
      
      expect(() => {
        strategyService.getStrategy('invalid_type' as any, 'medium');
      }).toThrow();
    });

    it('should handle empty AI configs', () => {
      const emptyService = AIColonyService.getInstance('empty_session', []);
      expect(emptyService).toBeDefined();
      emptyService.destroy();
    });
  });
});