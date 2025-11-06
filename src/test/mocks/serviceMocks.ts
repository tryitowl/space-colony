import { vi } from 'vitest';
import type { Colony, GameSession, TradeOffer, IntelItem, Resources } from '../../types';
import type { AIColonyConfig } from '../../types/ai.types';
import type { InvestmentOption, InvestmentAllocation } from '../../types/investment.types';
import { createColony, createGameSession, createTradeOffer, createIntelItem, createAIColonyConfig } from '../utils/factories';

// Mock Trading Service
export const mockTradingService = {
  createTradeOffer: vi.fn().mockResolvedValue(createTradeOffer()),
  acceptTradeOffer: vi.fn().mockResolvedValue(true),
  rejectTradeOffer: vi.fn().mockResolvedValue(true),
  createCounterOffer: vi.fn().mockResolvedValue(createTradeOffer()),
  getActiveTradesForColony: vi.fn().mockResolvedValue([]),
  getAllActiveTrades: vi.fn().mockResolvedValue([]),
  cancelTradeOffer: vi.fn().mockResolvedValue(true),
  executeTradeTransaction: vi.fn().mockResolvedValue(true),
  getTradeHistory: vi.fn().mockResolvedValue([]),
  isTradeValid: vi.fn().mockReturnValue(true),
  validateTradeResources: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
};

// Mock AI Colony Service
export const mockAIColonyService = {
  getInstance: vi.fn().mockReturnValue({
    processTradeOffer: vi.fn().mockResolvedValue('accepted'),
    generateTradeOffer: vi.fn().mockResolvedValue(createTradeOffer()),
    evaluateTrade: vi.fn().mockReturnValue({ score: 0.7, decision: 'accept' }),
    updateColonyState: vi.fn(),
    destroy: vi.fn(),
  }),
  destroyInstance: vi.fn(),
};

// Mock AI Strategy Service
export const mockAIStrategyService = {
  getStrategy: vi.fn().mockReturnValue({
    colonyType: 'mining',
    parameters: {
      tradingAggressiveness: 0.7,
      resourcePriorities: {
        oxygen: 0.9,
        food: 0.8,
        water: 0.8,
        energy: 0.7,
        minerals: 0.3,
        credits: 0.6,
      },
      decisionDelayMs: { min: 2000, max: 5000 },
      evaluationFactors: {
        survivalUrgency: 0.8,
        profitability: 0.6,
        strategicValue: 0.4,
      }
    }
  }),
  getAllStrategies: vi.fn().mockReturnValue([]),
  evaluateTradeForColony: vi.fn().mockReturnValue({ score: 0.7, factors: {} }),
};

// Mock Investment Service
export const mockInvestmentService = {
  getInvestmentOptions: vi.fn().mockReturnValue([]),
  processInvestment: vi.fn().mockResolvedValue(true),
  validateInvestmentAllocation: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  calculateInvestmentEffects: vi.fn().mockReturnValue({}),
  getInvestmentHistory: vi.fn().mockResolvedValue([]),
  resetInvestments: vi.fn().mockResolvedValue(true),
};

// Mock Intel Generation Service
export const mockIntelGenerationService = {
  generateIntelForRound: vi.fn().mockResolvedValue([createIntelItem()]),
  distributeIntel: vi.fn().mockResolvedValue(true),
  getIntelByRound: vi.fn().mockResolvedValue([]),
  calculateIntelValue: vi.fn().mockReturnValue(100),
  processScoutInvestments: vi.fn().mockResolvedValue([]),
  getCommunicationArrayBonuses: vi.fn().mockReturnValue(1.2),
};

// Mock Intel Service
export const mockIntelService = {
  getIntelForColony: vi.fn().mockResolvedValue([]),
  tradeIntel: vi.fn().mockResolvedValue(true),
  validateIntelTrade: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  calculateIntelDegrade: vi.fn().mockReturnValue(0.9),
  getIntelMarketValue: vi.fn().mockReturnValue(100),
};

// Mock Event System Service
export const mockEventSystemService = {
  triggerRandomEvent: vi.fn().mockResolvedValue(null),
  resolveEvent: vi.fn().mockResolvedValue(true),
  getActiveEvents: vi.fn().mockResolvedValue([]),
  calculateEventProbability: vi.fn().mockReturnValue(0.15),
  applyEventEffects: vi.fn().mockResolvedValue(true),
  checkEventConditions: vi.fn().mockReturnValue(true),
};

// Mock Analytics Service
export const mockAnalyticsService = {
  generatePostGameAnalytics: vi.fn().mockResolvedValue({
    teamPerformance: {},
    behavioralAnalysis: {},
    insights: [],
    recommendations: [],
  }),
  calculateTeamScore: vi.fn().mockReturnValue(1000),
  analyzeTradingPatterns: vi.fn().mockReturnValue({}),
  generateBehavioralProfile: vi.fn().mockReturnValue({}),
  compareTeamPerformance: vi.fn().mockReturnValue({}),
};

// Mock Analytics Export Service
export const mockAnalyticsExportService = {
  exportToCSV: vi.fn().mockResolvedValue('csv,data'),
  exportToPDF: vi.fn().mockResolvedValue(new Uint8Array()),
  generateFacilitatorReport: vi.fn().mockResolvedValue({}),
  createCustomReport: vi.fn().mockResolvedValue({}),
  exportGameData: vi.fn().mockResolvedValue({}),
};

// Mock Game Service
export const mockGameService = {
  createSession: vi.fn().mockResolvedValue(createGameSession()),
  joinSession: vi.fn().mockResolvedValue(createColony()),
  getSession: vi.fn().mockResolvedValue(createGameSession()),
  updateSession: vi.fn().mockResolvedValue(true),
  deleteSession: vi.fn().mockResolvedValue(true),
  getSessionsByEvent: vi.fn().mockResolvedValue([]),
  validateGameCode: vi.fn().mockReturnValue(true),
};

// Mock Game Engine Service
export const mockGameEngineService = {
  startRound: vi.fn().mockResolvedValue(true),
  endRound: vi.fn().mockResolvedValue(true),
  processRoundEnd: vi.fn().mockResolvedValue(true),
  applyResourceConsumption: vi.fn().mockResolvedValue(true),
  checkColonyElimination: vi.fn().mockResolvedValue([]),
  calculateRoundScores: vi.fn().mockResolvedValue({}),
  advanceGameState: vi.fn().mockResolvedValue(true),
};

// Mock Round Service
export const mockRoundService = {
  getCurrentRound: vi.fn().mockReturnValue(1),
  getRoundTimeRemaining: vi.fn().mockReturnValue(300000),
  isRoundActive: vi.fn().mockReturnValue(true),
  getRoundDuration: vi.fn().mockReturnValue(360000),
  subscribeToRoundUpdates: vi.fn().mockReturnValue(() => {}),
};

// Mock Resource Management Service
export const mockResourceManagementService = {
  updateColonyResources: vi.fn().mockResolvedValue(true),
  calculateResourceConsumption: vi.fn().mockReturnValue({}),
  validateResourceTransaction: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  getResourceHistory: vi.fn().mockResolvedValue([]),
  checkCriticalResources: vi.fn().mockReturnValue([]),
  calculateSurvivalTime: vi.fn().mockReturnValue(5),
};

// Mock Role Service
export const mockRoleService = {
  detectRoleFromCode: vi.fn().mockReturnValue('player'),
  setRoleContext: vi.fn(),
  getRoleContext: vi.fn().mockReturnValue(null),
  clearRoleContext: vi.fn(),
  hasSessionAccess: vi.fn().mockReturnValue(false),
  hasEventAccess: vi.fn().mockReturnValue(false),
  isAdmin: vi.fn().mockReturnValue(false),
  isFacilitator: vi.fn().mockReturnValue(false),
  isPlayer: vi.fn().mockReturnValue(true),
  getCurrentRole: vi.fn().mockReturnValue('player'),
};

// Mock Auth Service
export const mockAuthService = {
  signInAnonymously: vi.fn().mockResolvedValue({ uid: 'test-user' }),
  signOut: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockReturnValue({ uid: 'test-user' }),
  onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
};

// Mock Admin Auth Service
export const mockAdminAuthService = {
  authenticateWithCode: vi.fn().mockResolvedValue(true),
  createAdminUser: vi.fn().mockResolvedValue({ uid: 'admin-user' }),
  validateAdminAccess: vi.fn().mockReturnValue(true),
  getCurrentAdmin: vi.fn().mockReturnValue({ uid: 'admin-user' }),
};

// Mock Market Fluctuation Service
export const mockMarketFluctuationService = {
  calculateMarketPrices: vi.fn().mockReturnValue({}),
  getMarketTrends: vi.fn().mockReturnValue({}),
  applyMarketEvent: vi.fn().mockResolvedValue(true),
  getSupplyDemandData: vi.fn().mockReturnValue({}),
  calculatePriceVolatility: vi.fn().mockReturnValue(0.15),
};

// Mock Alien Trading Service
export const mockAlienTradingService = {
  initiateAlienContact: vi.fn().mockResolvedValue(true),
  createAlienTradeOffer: vi.fn().mockResolvedValue(createTradeOffer()),
  processAlienTrade: vi.fn().mockResolvedValue(true),
  getAlienResourceValues: vi.fn().mockReturnValue({}),
  checkAlienContactConditions: vi.fn().mockReturnValue(true),
};

// Mock Scoring Service
export const mockScoringService = {
  calculateColonyScore: vi.fn().mockReturnValue(1000),
  calculateRoundScore: vi.fn().mockReturnValue(200),
  getScoreBreakdown: vi.fn().mockReturnValue({}),
  updateLeaderboard: vi.fn().mockResolvedValue(true),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  calculateFinalScores: vi.fn().mockReturnValue({}),
};

// Mock Trade Analytics Service
export const mockTradeAnalyticsService = {
  trackTradeActivity: vi.fn().mockResolvedValue(true),
  generateTradeReport: vi.fn().mockReturnValue({}),
  calculateTradeEfficiency: vi.fn().mockReturnValue(0.8),
  analyzeTradePatterns: vi.fn().mockReturnValue({}),
  getTradeMetrics: vi.fn().mockReturnValue({}),
};

// Helper to create a complete mock service registry
export const createMockServiceRegistry = () => ({
  tradingService: mockTradingService,
  aiColonyService: mockAIColonyService,
  aiStrategyService: mockAIStrategyService,
  investmentService: mockInvestmentService,
  intelGenerationService: mockIntelGenerationService,
  intelService: mockIntelService,
  eventSystemService: mockEventSystemService,
  analyticsService: mockAnalyticsService,
  analyticsExportService: mockAnalyticsExportService,
  gameService: mockGameService,
  gameEngineService: mockGameEngineService,
  roundService: mockRoundService,
  resourceManagementService: mockResourceManagementService,
  roleService: mockRoleService,
  authService: mockAuthService,
  adminAuthService: mockAdminAuthService,
  marketFluctuationService: mockMarketFluctuationService,
  alienTradingService: mockAlienTradingService,
  scoringService: mockScoringService,
  tradeAnalyticsService: mockTradeAnalyticsService,
});

// Helper to reset all mocks
export const resetAllMocks = () => {
  const registry = createMockServiceRegistry();
  Object.values(registry).forEach(service => {
    Object.values(service).forEach(method => {
      if (typeof method === 'function' && 'mockReset' in method) {
        method.mockReset();
      }
    });
  });
};