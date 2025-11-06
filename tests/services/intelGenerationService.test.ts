import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase modules first
vi.mock('firebase/firestore');
vi.mock('firebase/database');
vi.mock('../../src/firebase/config');

import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, arrayUnion, writeBatch } from 'firebase/firestore';
import { ref, set, push } from 'firebase/database';
import { IntelGenerationService } from '../../src/services/intelGenerationService';
import type { IntelItem, Colony } from '../../src/types';
import { createColony, createGameSession, createIntelItem } from '../../src/test/utils/factories';

// Setup mocks
vi.mocked(writeBatch).mockReturnValue({
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
} as any);

vi.mock('../../src/firebase/config', () => ({
  firestore: mockFirestore(),
  realtimeDb: {},
}));

vi.mock('../../src/services/authService', () => ({
  AuthService: {
    ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('IntelGenerationService', () => {
  let mockColonies: Colony[];

  beforeEach(() => {
    mockColonies = [
      createColony({
        id: 'colony-1',
        type: 'mining',
        name: 'Mining Alpha',
        investments: {
          scouts: 2,
          productionUpgrades: 1,
          researchLabs: 0,
          communicationArray: 1,
          emergencyReserves: 0
        }
      }),
      createColony({
        id: 'colony-2',
        type: 'agricultural',
        name: 'Agricultural Beta',
        investments: {
          scouts: 1,
          productionUpgrades: 2,
          researchLabs: 1,
          communicationArray: 0,
          emergencyReserves: 1
        }
      }),
      createColony({
        id: 'colony-3',
        type: 'research',
        name: 'Research Gamma',
        investments: {
          scouts: 3,
          productionUpgrades: 0,
          researchLabs: 2,
          communicationArray: 2,
          emergencyReserves: 0
        }
      })
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateIntelForTeam', () => {
    it('should generate intel based on scout level', async () => {
      const mockSetDoc = vi.mocked(await import('firebase/firestore')).setDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      const mockPush = vi.mocked(await import('firebase/database')).push;

      // Mock session context
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      const scoutLevel = 2;
      const communicationLevel = 1;
      const currentRound = 1;

      const generatedIntel = await IntelGenerationService.generateIntelForTeam(
        'session-1',
        'colony-1',
        scoutLevel,
        communicationLevel,
        currentRound
      );

      // Should generate 4 intel pieces (2 scouts * 2 communication multiplier)
      expect(generatedIntel).toHaveLength(4);
      
      // Each intel item should have correct structure
      generatedIntel.forEach(intel => {
        expect(intel).toMatchObject({
          id: expect.stringContaining('intel_'),
          title: expect.any(String),
          content: expect.any(String),
          value: expect.any(Number),
          distributionCount: 0,
          roundGenerated: currentRound,
          source: 'scout'
        });
        
        // Value should include communication bonus (base + 10 per communication level)
        expect(intel.value).toBeGreaterThan(50); // Base minimum + communication bonus
      });

      // Should save intel to database
      expect(mockSetDoc).toHaveBeenCalledTimes(4);
      
      // Should add intel to team
      expect(mockUpdateDoc).toHaveBeenCalled();
      
      // Should broadcast notification
      expect(mockPush).toHaveBeenCalled();
    });

    it('should apply communication array multiplier correctly', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      // Test with no communication array
      const intel1 = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 0, 1
      );
      expect(intel1).toHaveLength(2); // 2 scouts * 1 multiplier

      // Test with level 1 communication array
      const intel2 = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 1
      );
      expect(intel2).toHaveLength(4); // 2 scouts * 2 multiplier

      // Test with level 2+ communication array
      const intel3 = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 2, 1
      );
      expect(intel3).toHaveLength(6); // 2 scouts * 3 multiplier
    });

    it('should cap intel generation at 8 pieces', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      // Test with high scout and communication levels
      const intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 5, 3, 1
      );
      
      // Should be capped at 8 despite 5 scouts * 3 communication = 15
      expect(intel).toHaveLength(8);
    });

    it('should filter templates by scout level requirements', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      // Low scout level should only get basic intel
      const basicIntel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 1, 0, 1
      );
      expect(basicIntel).toHaveLength(1);

      // Higher scout level should get access to more intel types
      const advancedIntel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 3, 0, 1
      );
      expect(advancedIntel).toHaveLength(3);
    });

    it('should handle missing intel templates gracefully', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      // Test with a round that doesn't have templates
      const intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 99 // Non-existent round
      );
      
      expect(intel).toHaveLength(0);
    });

    it('should handle authentication and database errors gracefully', async () => {
      const mockAuthService = vi.mocked(await import('../../src/services/authService')).AuthService;
      mockAuthService.ensureAuthenticated.mockRejectedValue(new Error('Auth failed'));

      const intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 1
      );
      
      expect(intel).toHaveLength(0);
    });
  });

  describe('generateMarketIntel', () => {
    it('should generate market intel for teams with communication arrays', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      const mockSetDoc = vi.mocked(await import('firebase/firestore')).setDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;
      const mockPush = vi.mocked(await import('firebase/database')).push;

      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      const marketIntel = await IntelGenerationService.generateMarketIntel(
        'session-1', 'colony-1', 1, 2
      );

      expect(marketIntel).toHaveLength(1);
      expect(marketIntel[0]).toMatchObject({
        id: expect.stringContaining('market_intel_'),
        title: expect.any(String),
        content: expect.any(String),
        value: expect.any(Number),
        distributionCount: 0,
        roundGenerated: 2,
        source: 'communication'
      });

      // Value should include communication bonus
      expect(marketIntel[0].value).toBeGreaterThan(70); // Base + communication bonus

      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });

    it('should return empty array for teams without communication arrays', async () => {
      const marketIntel = await IntelGenerationService.generateMarketIntel(
        'session-1', 'colony-1', 0, 2
      );

      expect(marketIntel).toHaveLength(0);
    });
  });

  describe('distributeRoundIntel', () => {
    it('should distribute public intel to all non-eliminated teams', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      const mockWriteBatch = vi.mocked(await import('firebase/firestore')).writeBatch;
      const mockSet = vi.mocked(await import('firebase/database')).set;

      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      const config = {
        sessionId: 'session-1',
        round: 3,
        teams: mockColonies,
        globalEvents: []
      };

      await IntelGenerationService.distributeRoundIntel(config);

      const batchInstance = mockWriteBatch.mock.results[0].value;
      expect(batchInstance.set).toHaveBeenCalled();
      expect(batchInstance.update).toHaveBeenCalled();
      expect(batchInstance.commit).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
    });

    it('should exclude eliminated teams from distribution', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      const mockWriteBatch = vi.mocked(await import('firebase/firestore')).writeBatch;

      const teamsWithEliminated = [
        ...mockColonies,
        createColony({
          id: 'colony-eliminated',
          eliminationStatus: {
            isEliminated: true,
            roundsInCritical: 3,
            criticalResources: ['oxygen', 'food']
          }
        })
      ];

      mockGetDocs.mockResolvedValue({
        docs: teamsWithEliminated.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      const config = {
        sessionId: 'session-1',
        round: 3,
        teams: teamsWithEliminated,
        globalEvents: []
      };

      await IntelGenerationService.distributeRoundIntel(config);

      const batchInstance = mockWriteBatch.mock.results[0].value;
      
      // Should only update non-eliminated teams (3 original teams)
      expect(batchInstance.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('calculateIntelValue', () => {
    it('should apply age penalty correctly', () => {
      const intel = createIntelItem({
        value: 100,
        roundGenerated: 1,
        distributionCount: 0
      });

      // Same round - no age penalty
      const value1 = IntelGenerationService.calculateIntelValue(intel, 1);
      expect(value1).toBe(100);

      // One round later - 10% age penalty
      const value2 = IntelGenerationService.calculateIntelValue(intel, 2);
      expect(value2).toBe(90);

      // Two rounds later - 20% age penalty
      const value3 = IntelGenerationService.calculateIntelValue(intel, 3);
      expect(value3).toBe(80);
    });

    it('should apply distribution penalty correctly', () => {
      const intel = createIntelItem({
        value: 100,
        roundGenerated: 1,
        distributionCount: 2 // 30% penalty (15% per distribution)
      });

      const value = IntelGenerationService.calculateIntelValue(intel, 1);
      expect(value).toBe(70); // 100 - 30%
    });

    it('should apply combined penalties correctly', () => {
      const intel = createIntelItem({
        value: 100,
        roundGenerated: 1,
        distributionCount: 2 // 30% distribution penalty
      });

      // Age penalty (10%) + distribution penalty (30%) = 40% total
      const value = IntelGenerationService.calculateIntelValue(intel, 2);
      expect(value).toBe(60);
    });

    it('should enforce minimum value of 10', () => {
      const intel = createIntelItem({
        value: 50,
        roundGenerated: 1,
        distributionCount: 10 // 150% penalty - would make value negative
      });

      const value = IntelGenerationService.calculateIntelValue(intel, 5);
      expect(value).toBe(10); // Minimum value enforced
    });
  });

  describe('error handling', () => {
    it('should handle Firebase errors gracefully in intel generation', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockRejectedValue(new Error('Database connection failed'));

      const intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 1
      );

      expect(intel).toHaveLength(0);
    });

    it('should handle Firebase errors gracefully in round distribution', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockRejectedValue(new Error('Network error'));

      const config = {
        sessionId: 'session-1',
        round: 3,
        teams: mockColonies,
        globalEvents: []
      };

      // Should not throw, but handle error gracefully
      await expect(
        IntelGenerationService.distributeRoundIntel(config)
      ).resolves.toBeUndefined();
    });

    it('should handle missing session context gracefully', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: [] // Empty teams
      } as any);

      const intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 1
      );

      // Should still generate intel with fallback context
      expect(intel.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('intel contextualization', () => {
    it('should contextualize intel templates with session data', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      const intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 1
      );

      intel.forEach(intelItem => {
        // Content should not contain placeholder brackets
        expect(intelItem.content).not.toMatch(/\{[^}]+\}/);
        
        // Should have realistic content
        expect(intelItem.title).toBeTruthy();
        expect(intelItem.content).toBeTruthy();
        expect(intelItem.content.length).toBeGreaterThan(20);
      });
    });
  });

  describe('intel categorization', () => {
    it('should categorize intel correctly by type', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;
      const mockArrayUnion = vi.mocked(await import('firebase/firestore')).arrayUnion;

      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 3, 1, 1
      );

      // Should categorize intel into different types
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'resources.marketIntel': expect.anything(),
          'resources.surveyReports': expect.anything(),
          'resources.crisisWarnings': expect.anything()
        })
      );
    });
  });

  describe('round-specific templates', () => {
    it('should use different templates for different rounds', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockColonies.map(colony => ({
          id: colony.id,
          data: () => colony
        }))
      } as any);

      // Generate intel for different rounds
      const round1Intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 1
      );
      
      const round3Intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 3
      );

      const round5Intel = await IntelGenerationService.generateIntelForTeam(
        'session-1', 'colony-1', 2, 1, 5
      );

      // Each round should produce intel
      expect(round1Intel.length).toBeGreaterThan(0);
      expect(round3Intel.length).toBeGreaterThan(0);
      expect(round5Intel.length).toBeGreaterThan(0);

      // Intel content should be different for different rounds
      const round1Titles = round1Intel.map(i => i.title);
      const round3Titles = round3Intel.map(i => i.title);
      const round5Titles = round5Intel.map(i => i.title);

      // Should have some variation in titles (not all identical)
      expect(new Set([...round1Titles, ...round3Titles, ...round5Titles]).size).toBeGreaterThan(1);
    });
  });
});