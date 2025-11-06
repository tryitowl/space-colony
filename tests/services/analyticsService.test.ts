import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase modules first
vi.mock('firebase/firestore');
vi.mock('../../src/firebase/config');

// Import mocked functions
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';

import { AnalyticsService } from '../../src/services/analyticsService';
import type { 
  PerformanceMetrics, 
  BehavioralAnalysis, 
  AnalyticsConfig,
  TeamBehaviorProfile,
  InteractionPattern,
  GroupDynamics
} from '../../src/services/analyticsService';
import type { GameSession, Colony, TradeOffer } from '../../src/types';
import { createColony, createGameSession, createTradeOffer } from '../../src/test/utils/factories';

// Setup mocks
vi.mocked(serverTimestamp).mockReturnValue('SERVER_TIMESTAMP' as any);

describe('AnalyticsService', () => {
  let mockSession: GameSession;
  let mockColonies: Colony[];
  let mockTrades: TradeOffer[];
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    mockColonies = [
      createColony({
        id: 'colony-1',
        type: 'mining',
        name: 'Mining Alpha',
        resources: {
          ...createColony().resources,
          oxygen: 15,
          food: 8,
          water: 10,
          energy: 20,
          minerals: 25,
          credits: 1200
        }
      }),
      createColony({
        id: 'colony-2',
        type: 'agricultural',
        name: 'Agricultural Beta',
        resources: {
          ...createColony().resources,
          oxygen: 10,
          food: 30,
          water: 25,
          energy: 8,
          minerals: 5,
          credits: 800
        }
      }),
      createColony({
        id: 'colony-3',
        type: 'research',
        name: 'Research Gamma',
        resources: {
          ...createColony().resources,
          oxygen: 12,
          food: 6,
          water: 8,
          energy: 15,
          techComponents: 20,
          credits: 1500
        }
      })
    ];

    mockTrades = [
      createTradeOffer({
        id: 'trade-1',
        initiatorId: 'colony-1',
        targetId: 'colony-2',
        offerResources: { minerals: 10 },
        requestResources: { food: 8 },
        status: 'accepted',
        timestamp: Date.now() - 3600000
      }),
      createTradeOffer({
        id: 'trade-2',
        initiatorId: 'colony-2',
        targetId: 'colony-3',
        offerResources: { food: 12 },
        requestResources: { techComponents: 5 },
        status: 'accepted',
        timestamp: Date.now() - 1800000
      }),
      createTradeOffer({
        id: 'trade-3',
        initiatorId: 'colony-3',
        targetId: 'colony-1',
        offerResources: { techComponents: 8 },
        requestResources: { energy: 15 },
        status: 'rejected',
        timestamp: Date.now() - 900000
      })
    ];

    mockSession = createGameSession({
      id: 'session-1',
      teams: mockColonies,
      currentRound: 3
    });

    const config: Partial<AnalyticsConfig> = {
      enableRealTimeAnalytics: true,
      trackBehavioralMetrics: true,
      generateRecommendations: true,
      detailLevel: 'detailed'
    };

    analyticsService = AnalyticsService.getInstance('session-1', config);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear static instances for clean test isolation
    (AnalyticsService as any).instances.clear();
  });

  describe('getInstance', () => {
    it('should create a new instance with configuration', () => {
      expect(analyticsService).toBeDefined();
      expect(analyticsService).toBeInstanceOf(AnalyticsService);
    });

    it('should return the same instance for the same session', () => {
      const anotherInstance = AnalyticsService.getInstance('session-1');
      expect(anotherInstance).toBe(analyticsService);
    });

    it('should create different instances for different sessions', () => {
      const differentConfig: Partial<AnalyticsConfig> = {
        enableRealTimeAnalytics: false,
        detailLevel: 'basic'
      };
      
      const differentInstance = AnalyticsService.getInstance('session-2', differentConfig);
      expect(differentInstance).not.toBe(analyticsService);
    });

    it('should throw error when trying to get instance without config for new session', () => {
      expect(() => {
        AnalyticsService.getInstance('non-existent-session');
      }).toThrow('AnalyticsService instance for session non-existent-session not found');
    });
  });

  describe('generatePerformanceMetrics', () => {
    beforeEach(() => {
      const mockGetDoc = vi.mocked(import('firebase/firestore')).getDoc;
      const mockGetDocs = vi.mocked(import('firebase/firestore')).getDocs;
      const mockAddDoc = vi.mocked(import('firebase/firestore')).addDoc;

      // Mock session data loading
      (mockGetDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      });

      // Mock trades data loading
      (mockGetDocs as any).mockResolvedValue({
        docs: mockTrades.map(trade => ({
          data: () => trade
        }))
      });

      (mockAddDoc as any).mockResolvedValue({ id: 'analytics-1' });
    });

    it('should generate performance metrics for all teams', async () => {
      const metrics = await analyticsService.generatePerformanceMetrics();

      expect(metrics).toHaveLength(3);
      
      metrics.forEach(metric => {
        expect(metric).toMatchObject({
          sessionId: 'session-1',
          teamId: expect.any(String),
          teamName: expect.any(String),
          colonyType: expect.any(String),
          finalScore: expect.any(Number),
          componentScores: {
            resourceScore: expect.any(Number),
            tradingScore: expect.any(Number),
            survivalScore: expect.any(Number),
            efficiencyScore: expect.any(Number),
            strategicScore: expect.any(Number)
          },
          tradingMetrics: {
            totalTrades: expect.any(Number),
            avgTradeValue: expect.any(Number),
            tradingEfficiency: expect.any(Number),
            favoriteResource: expect.any(String),
            tradingPartners: expect.any(Array),
            negotiationSuccess: expect.any(Number)
          },
          resourceMetrics: {
            resourceUtilization: expect.any(Number),
            wasteRate: expect.any(Number),
            criticalMoments: expect.any(Number),
            resourceDiversity: expect.any(Number),
            endgameResources: expect.any(Object)
          },
          behavioralMetrics: {
            decisionSpeed: expect.any(Number),
            riskTolerance: expect.any(Number),
            cooperationIndex: expect.any(Number),
            adaptabilityScore: expect.any(Number),
            communicationFrequency: expect.any(Number)
          },
          achievements: expect.any(Array),
          criticalEvents: expect.any(Array)
        });
      });
    });

    it('should calculate different scores for different colony types', async () => {
      const metrics = await analyticsService.generatePerformanceMetrics();

      const miningMetrics = metrics.find(m => m.colonyType === 'mining');
      const agriculturalMetrics = metrics.find(m => m.colonyType === 'agricultural');
      const researchMetrics = metrics.find(m => m.colonyType === 'research');

      expect(miningMetrics).toBeDefined();
      expect(agriculturalMetrics).toBeDefined();
      expect(researchMetrics).toBeDefined();

      // Scores should be different for different colony types
      expect(miningMetrics!.finalScore).not.toBe(agriculturalMetrics!.finalScore);
      expect(miningMetrics!.componentScores.resourceScore)
        .not.toBe(researchMetrics!.componentScores.resourceScore);
    });

    it('should track trading metrics accurately', async () => {
      const metrics = await analyticsService.generatePerformanceMetrics();

      const colony1Metrics = metrics.find(m => m.teamId === 'colony-1');
      const colony2Metrics = metrics.find(m => m.teamId === 'colony-2');

      expect(colony1Metrics).toBeDefined();
      expect(colony2Metrics).toBeDefined();

      // Colony 1 had 2 trades (1 accepted, 1 rejected)
      expect(colony1Metrics!.tradingMetrics.totalTrades).toBeGreaterThan(0);
      
      // Colony 2 had 2 trades (both accepted)
      expect(colony2Metrics!.tradingMetrics.totalTrades).toBeGreaterThan(0);
      expect(colony2Metrics!.tradingMetrics.negotiationSuccess).toBe(1); // 100% success rate
    });

    it('should calculate resource utilization correctly', async () => {
      const metrics = await analyticsService.generatePerformanceMetrics();

      metrics.forEach(metric => {
        expect(metric.resourceMetrics.resourceUtilization).toBeGreaterThanOrEqual(0);
        expect(metric.resourceMetrics.resourceUtilization).toBeLessThanOrEqual(1);
        expect(metric.resourceMetrics.wasteRate).toBeGreaterThanOrEqual(0);
        expect(metric.resourceMetrics.resourceDiversity).toBeGreaterThanOrEqual(0);
      });
    });

    it('should save metrics to database', async () => {
      const mockAddDoc = vi.mocked(import('firebase/firestore')).addDoc;

      await analyticsService.generatePerformanceMetrics();

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sessionId: 'session-1',
          type: 'performance_metrics',
          data: expect.any(Array),
          generatedAt: 'SERVER_TIMESTAMP'
        })
      );
    });
  });

  describe('generateBehavioralAnalysis', () => {
    beforeEach(() => {
      const mockGetDoc = vi.mocked(import('firebase/firestore')).getDoc;
      const mockGetDocs = vi.mocked(import('firebase/firestore')).getDocs;
      const mockAddDoc = vi.mocked(import('firebase/firestore')).addDoc;

      (mockGetDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      });

      (mockGetDocs as any).mockResolvedValue({
        docs: mockTrades.map(trade => ({
          data: () => trade
        }))
      });

      (mockAddDoc as any).mockResolvedValue({ id: 'analytics-2' });
    });

    it('should generate comprehensive behavioral analysis', async () => {
      const analysis = await analyticsService.generateBehavioralAnalysis();

      expect(analysis).toMatchObject({
        sessionId: 'session-1',
        generatedAt: expect.any(Number),
        teamBehaviors: expect.any(Array),
        interactionPatterns: expect.any(Array),
        emergentStrategies: expect.any(Array),
        groupDynamics: expect.any(Object),
        learningCurves: expect.any(Array),
        recommendationsForFacilitator: expect.any(Array)
      });

      // Team behaviors should be analyzed for each team
      expect(analysis.teamBehaviors).toHaveLength(3);
      
      analysis.teamBehaviors.forEach(behavior => {
        expect(behavior).toMatchObject({
          teamId: expect.any(String),
          teamName: expect.any(String),
          personalityType: expect.any(String),
          playStyle: expect.any(String),
          strengths: expect.any(Array),
          developmentAreas: expect.any(Array),
          leadership: expect.any(Object),
          collaboration: expect.any(Object)
        });
      });
    });

    it('should identify personality types correctly', async () => {
      const analysis = await analyticsService.generateBehavioralAnalysis();

      const validPersonalityTypes = ['analytical', 'diplomatic', 'competitive', 'conservative', 'innovative', 'collaborative'];
      const validPlayStyles = ['aggressive_trader', 'resource_hoarder', 'strategic_planner', 'opportunistic', 'risk_averse', 'social_leader'];

      analysis.teamBehaviors.forEach(behavior => {
        expect(validPersonalityTypes).toContain(behavior.personalityType);
        expect(validPlayStyles).toContain(behavior.playStyle);
        expect(behavior.strengths).toBeInstanceOf(Array);
        expect(behavior.developmentAreas).toBeInstanceOf(Array);
      });
    });

    it('should analyze group dynamics', async () => {
      const analysis = await analyticsService.generateBehavioralAnalysis();

      expect(analysis.groupDynamics).toMatchObject({
        cohesion: expect.any(Number),
        conflictLevel: expect.any(Number),
        communicationEffectiveness: expect.any(Number),
        equalParticipation: expect.any(Number),
        emergentLeadership: expect.any(Array),
        subgroups: expect.any(Array)
      });

      // Values should be within expected ranges
      expect(analysis.groupDynamics.cohesion).toBeGreaterThanOrEqual(0);
      expect(analysis.groupDynamics.cohesion).toBeLessThanOrEqual(1);
      expect(analysis.groupDynamics.conflictLevel).toBeGreaterThanOrEqual(0);
      expect(analysis.groupDynamics.conflictLevel).toBeLessThanOrEqual(1);
    });

    it('should identify interaction patterns', async () => {
      const analysis = await analyticsService.generateBehavioralAnalysis();

      const validPatterns = ['alliance_formation', 'trade_clustering', 'resource_specialization', 'isolation', 'market_manipulation'];
      const validImpacts = ['positive', 'neutral', 'negative'];

      analysis.interactionPatterns.forEach(pattern => {
        expect(validPatterns).toContain(pattern.pattern);
        expect(validImpacts).toContain(pattern.impact);
        expect(pattern.participants).toBeInstanceOf(Array);
        expect(pattern.frequency).toBeGreaterThanOrEqual(0);
        expect(pattern.description).toBeTruthy();
      });
    });

    it('should generate facilitator recommendations', async () => {
      const analysis = await analyticsService.generateBehavioralAnalysis();

      const validCategories = ['team_development', 'process_improvement', 'conflict_resolution', 'engagement'];
      const validPriorities = ['high', 'medium', 'low'];

      expect(analysis.recommendationsForFacilitator.length).toBeGreaterThan(0);

      analysis.recommendationsForFacilitator.forEach(rec => {
        expect(validCategories).toContain(rec.category);
        expect(validPriorities).toContain(rec.priority);
        expect(rec.title).toBeTruthy();
        expect(rec.description).toBeTruthy();
        expect(rec.evidence).toBeInstanceOf(Array);
        expect(rec.actionItems).toBeInstanceOf(Array);
      });
    });

    it('should calculate learning curves', async () => {
      const analysis = await analyticsService.generateBehavioralAnalysis();

      expect(analysis.learningCurves).toHaveLength(3); // One per team

      const validMetrics = ['trading_efficiency', 'resource_management', 'strategic_thinking', 'negotiation'];

      analysis.learningCurves.forEach(curve => {
        expect(curve.teamId).toBeTruthy();
        expect(validMetrics).toContain(curve.metric);
        expect(curve.progression).toBeInstanceOf(Array);
        expect(curve.improvementRate).toBeTypeOf('number');
      });
    });

    it('should save analysis to database', async () => {
      const mockAddDoc = vi.mocked(import('firebase/firestore')).addDoc;

      await analyticsService.generateBehavioralAnalysis();

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sessionId: 'session-1',
          type: 'behavioral_analysis',
          data: expect.any(Object),
          generatedAt: 'SERVER_TIMESTAMP'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing session data gracefully', async () => {
      const mockGetDoc = vi.mocked(import('firebase/firestore')).getDoc;
      (mockGetDoc as any).mockResolvedValue({
        exists: () => false
      });

      await expect(analyticsService.generatePerformanceMetrics())
        .rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const mockGetDoc = vi.mocked(import('firebase/firestore')).getDoc;
      (mockGetDoc as any).mockRejectedValue(new Error('Database connection failed'));

      await expect(analyticsService.generatePerformanceMetrics())
        .rejects.toThrow('Database connection failed');
    });

    it('should handle partial data gracefully', async () => {
      const mockGetDoc = vi.mocked(import('firebase/firestore')).getDoc;
      const mockGetDocs = vi.mocked(import('firebase/firestore')).getDocs;

      // Session exists but trades collection is empty
      (mockGetDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      });

      (mockGetDocs as any).mockResolvedValue({
        docs: [] // No trades
      });

      const metrics = await analyticsService.generatePerformanceMetrics();
      
      // Should still generate metrics with zero trading data
      expect(metrics).toHaveLength(3);
      metrics.forEach(metric => {
        expect(metric.tradingMetrics.totalTrades).toBe(0);
        expect(metric.tradingMetrics.avgTradeValue).toBe(0);
      });
    });
  });

  describe('achievements system', () => {
    it('should identify achievements based on performance', async () => {
      const mockGetDoc = vi.mocked(import('firebase/firestore')).getDoc;
      const mockGetDocs = vi.mocked(import('firebase/firestore')).getDocs;
      const mockAddDoc = vi.mocked(import('firebase/firestore')).addDoc;

      (mockGetDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      });

      (mockGetDocs as any).mockResolvedValue({
        docs: mockTrades.map(trade => ({
          data: () => trade
        }))
      });

      (mockAddDoc as any).mockResolvedValue({ id: 'analytics-1' });

      const metrics = await analyticsService.generatePerformanceMetrics();

      metrics.forEach(metric => {
        expect(metric.achievements).toBeInstanceOf(Array);
        
        metric.achievements.forEach(achievement => {
          expect(achievement).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            category: expect.stringMatching(/^(trading|survival|strategy|collaboration|innovation)$/),
            rarity: expect.stringMatching(/^(common|rare|legendary)$/),
            icon: expect.any(String),
            criteria: expect.any(Object)
          });
        });
      });
    });
  });

  describe('real-time analytics', () => {
    it('should handle real-time configuration correctly', () => {
      const realtimeConfig: Partial<AnalyticsConfig> = {
        enableRealTimeAnalytics: true,
        trackBehavioralMetrics: true,
        detailLevel: 'comprehensive'
      };

      const realtimeService = AnalyticsService.getInstance('realtime-session', realtimeConfig);
      expect(realtimeService).toBeDefined();

      const basicConfig: Partial<AnalyticsConfig> = {
        enableRealTimeAnalytics: false,
        trackBehavioralMetrics: false,
        detailLevel: 'basic'
      };

      const basicService = AnalyticsService.getInstance('basic-session', basicConfig);
      expect(basicService).toBeDefined();
      expect(basicService).not.toBe(realtimeService);
    });
  });

  describe('configuration variations', () => {
    it('should handle different detail levels', async () => {
      const detailedConfig: Partial<AnalyticsConfig> = {
        detailLevel: 'comprehensive',
        trackBehavioralMetrics: true
      };

      const basicConfig: Partial<AnalyticsConfig> = {
        detailLevel: 'basic',
        trackBehavioralMetrics: false
      };

      const detailedService = AnalyticsService.getInstance('detailed-session', detailedConfig);
      const basicService = AnalyticsService.getInstance('basic-session', basicConfig);

      expect(detailedService).not.toBe(basicService);
    });

    it('should handle recommendation generation setting', () => {
      const withRecommendations: Partial<AnalyticsConfig> = {
        generateRecommendations: true
      };

      const withoutRecommendations: Partial<AnalyticsConfig> = {
        generateRecommendations: false
      };

      const serviceWithRecs = AnalyticsService.getInstance('recs-session', withRecommendations);
      const serviceWithoutRecs = AnalyticsService.getInstance('no-recs-session', withoutRecommendations);

      expect(serviceWithRecs).not.toBe(serviceWithoutRecs);
    });
  });
});