import { vi } from 'vitest';
import type { Session, Team, Trade, GameEvent } from '@/types/game';
import { createSession, createTeam, createTrade, createGameEvent } from '../utils/factories';

// Mock gameEngineService
export const mockGameEngineService = {
  startSession: vi.fn().mockResolvedValue(undefined),
  endSession: vi.fn().mockResolvedValue(undefined),
  startRound: vi.fn().mockResolvedValue(undefined),
  endRound: vi.fn().mockResolvedValue(undefined),
  processRoundEnd: vi.fn().mockResolvedValue(undefined),
  consumeResources: vi.fn().mockResolvedValue(undefined),
  checkEliminations: vi.fn().mockResolvedValue([]),
  generateRandomEvent: vi.fn().mockReturnValue(createGameEvent()),
  applyEventEffects: vi.fn().mockResolvedValue(undefined),
  calculateRoundScore: vi.fn().mockReturnValue(1000),
  subscribeToSession: vi.fn().mockReturnValue(() => {}),
  subscribeToTeams: vi.fn().mockReturnValue(() => {}),
  reset: () => {
    mockGameEngineService.startSession.mockClear();
    mockGameEngineService.endSession.mockClear();
    mockGameEngineService.startRound.mockClear();
    mockGameEngineService.endRound.mockClear();
    mockGameEngineService.processRoundEnd.mockClear();
    mockGameEngineService.consumeResources.mockClear();
    mockGameEngineService.checkEliminations.mockClear();
    mockGameEngineService.generateRandomEvent.mockClear();
    mockGameEngineService.applyEventEffects.mockClear();
    mockGameEngineService.calculateRoundScore.mockClear();
    mockGameEngineService.subscribeToSession.mockClear();
    mockGameEngineService.subscribeToTeams.mockClear();
  },
};

// Mock tradingService
export const mockTradingService = {
  createTrade: vi.fn().mockResolvedValue('new-trade-id'),
  updateTradeOffer: vi.fn().mockResolvedValue(undefined),
  acceptTrade: vi.fn().mockResolvedValue(undefined),
  rejectTrade: vi.fn().mockResolvedValue(undefined),
  cancelTrade: vi.fn().mockResolvedValue(undefined),
  executeTrade: vi.fn().mockResolvedValue(undefined),
  getActiveTrades: vi.fn().mockResolvedValue([]),
  getTradeHistory: vi.fn().mockResolvedValue([]),
  subscribeToTrades: vi.fn().mockReturnValue(() => {}),
  subscribeToTrade: vi.fn().mockReturnValue(() => {}),
  validateTrade: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  reset: () => {
    mockTradingService.createTrade.mockClear();
    mockTradingService.updateTradeOffer.mockClear();
    mockTradingService.acceptTrade.mockClear();
    mockTradingService.rejectTrade.mockClear();
    mockTradingService.cancelTrade.mockClear();
    mockTradingService.executeTrade.mockClear();
    mockTradingService.getActiveTrades.mockClear();
    mockTradingService.getTradeHistory.mockClear();
    mockTradingService.subscribeToTrades.mockClear();
    mockTradingService.subscribeToTrade.mockClear();
    mockTradingService.validateTrade.mockClear();
  },
};

// Mock resourceManagementService
export const mockResourceManagementService = {
  initializeTeamResources: vi.fn().mockReturnValue({}),
  consumeResources: vi.fn().mockReturnValue({ success: true, criticalResources: [] }),
  transferResources: vi.fn().mockReturnValue({ success: true }),
  validateResourceAvailability: vi.fn().mockReturnValue(true),
  checkCriticalResources: vi.fn().mockReturnValue([]),
  calculateResourceBalance: vi.fn().mockReturnValue({}),
  applyResourceEffect: vi.fn().mockReturnValue({}),
  reset: () => {
    mockResourceManagementService.initializeTeamResources.mockClear();
    mockResourceManagementService.consumeResources.mockClear();
    mockResourceManagementService.transferResources.mockClear();
    mockResourceManagementService.validateResourceAvailability.mockClear();
    mockResourceManagementService.checkCriticalResources.mockClear();
    mockResourceManagementService.calculateResourceBalance.mockClear();
    mockResourceManagementService.applyResourceEffect.mockClear();
  },
};

// Mock scoringService
export const mockScoringService = {
  calculateTeamScore: vi.fn().mockReturnValue(1000),
  calculateResourceScore: vi.fn().mockReturnValue(500),
  calculateTradeScore: vi.fn().mockReturnValue(300),
  calculateSurvivalScore: vi.fn().mockReturnValue(200),
  calculateAchievementScore: vi.fn().mockReturnValue(100),
  updateLeaderboard: vi.fn().mockResolvedValue(undefined),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  subscribeToLeaderboard: vi.fn().mockReturnValue(() => {}),
  reset: () => {
    mockScoringService.calculateTeamScore.mockClear();
    mockScoringService.calculateResourceScore.mockClear();
    mockScoringService.calculateTradeScore.mockClear();
    mockScoringService.calculateSurvivalScore.mockClear();
    mockScoringService.calculateAchievementScore.mockClear();
    mockScoringService.updateLeaderboard.mockClear();
    mockScoringService.getLeaderboard.mockClear();
    mockScoringService.subscribeToLeaderboard.mockClear();
  },
};

// Mock audioAlerts
export const mockAudioAlerts = {
  playTradeAlert: vi.fn(),
  playWarningAlert: vi.fn(),
  playCriticalAlert: vi.fn(),
  playSuccessAlert: vi.fn(),
  playRoundStartAlert: vi.fn(),
  playRoundEndAlert: vi.fn(),
  playEventAlert: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  reset: () => {
    mockAudioAlerts.playTradeAlert.mockClear();
    mockAudioAlerts.playWarningAlert.mockClear();
    mockAudioAlerts.playCriticalAlert.mockClear();
    mockAudioAlerts.playSuccessAlert.mockClear();
    mockAudioAlerts.playRoundStartAlert.mockClear();
    mockAudioAlerts.playRoundEndAlert.mockClear();
    mockAudioAlerts.playEventAlert.mockClear();
    mockAudioAlerts.setVolume.mockClear();
    mockAudioAlerts.mute.mockClear();
    mockAudioAlerts.unmute.mockClear();
  },
};

// Mock all services
export const mockAllServices = () => {
  vi.mock('@/services/gameEngineService', () => ({
    gameEngineService: mockGameEngineService,
  }));

  vi.mock('@/services/tradingService', () => ({
    tradingService: mockTradingService,
  }));

  vi.mock('@/services/resourceManagementService', () => ({
    resourceManagementService: mockResourceManagementService,
  }));

  vi.mock('@/services/scoringService', () => ({
    scoringService: mockScoringService,
  }));

  vi.mock('@/utils/audioAlerts', () => ({
    audioAlerts: mockAudioAlerts,
  }));
};

// Reset all mocks
export const resetAllMocks = () => {
  mockGameEngineService.reset();
  mockTradingService.reset();
  mockResourceManagementService.reset();
  mockScoringService.reset();
  mockAudioAlerts.reset();
};