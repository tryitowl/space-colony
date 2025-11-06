import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionGalaxyService } from '../sessionGalaxyService';
import { galaxyService } from '../galaxyService';
import { sessionCodeService } from '../sessionCodeService';
import type { GalaxyConfiguration, CrossGalaxyTradeRules } from '../../types/galaxy.types';

// Mock Firebase
vi.mock('../../firebase/config', () => ({
  db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn()
  })),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date) => ({ toDate: () => date }))
  },
  runTransaction: vi.fn()
}));

// Mock other services
vi.mock('../galaxyService', () => ({
  galaxyService: {
    createGalaxy: vi.fn(),
    generateAndAssignTeams: vi.fn(),
    getGalaxy: vi.fn(),
    getGalaxyTeams: vi.fn(),
    getSessionGalaxies: vi.fn(),
    getGalaxyStatistics: vi.fn()
  }
}));

vi.mock('../sessionCodeService', () => ({
  sessionCodeService: {
    generateSessionCode: vi.fn()
  }
}));

describe('SessionGalaxyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeMultiGalaxySession', () => {
    it('should initialize a multi-galaxy session with proper configuration', async () => {
      const sessionId = 'session_123';
      const galaxyConfiguration: GalaxyConfiguration = {
        galaxies: [
          {
            id: 'galaxy_1',
            name: 'Alpha Galaxy',
            description: 'First galaxy',
            totalTeams: 6,
            colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
            teamStructure: { mode: 'standard' },
            aiEnabled: false
          },
          {
            id: 'galaxy_2',
            name: 'Beta Galaxy',
            description: 'Second galaxy',
            totalTeams: 4,
            colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub'],
            teamStructure: { mode: 'balanced' },
            aiEnabled: true,
            aiDifficulty: 'medium'
          }
        ],
        crossGalaxyTrading: true,
        globalEvents: true,
        sharedMarketIntel: false,
        competitionMode: 'hybrid',
        victoryConditions: []
      };

      vi.mocked(sessionCodeService.generateSessionCode)
        .mockResolvedValueOnce('MAIN-001')
        .mockResolvedValueOnce('ALPH-001')
        .mockResolvedValueOnce('BETA-001');

      vi.mocked(galaxyService.createGalaxy)
        .mockResolvedValueOnce({ ...galaxyConfiguration.galaxies[0], id: 'galaxy_1' } as any)
        .mockResolvedValueOnce({ ...galaxyConfiguration.galaxies[1], id: 'galaxy_2' } as any);

      vi.mocked(galaxyService.generateAndAssignTeams)
        .mockResolvedValueOnce([{ id: 'team_1', name: 'Team A' }] as any)
        .mockResolvedValueOnce([{ id: 'team_2', name: 'Team B' }] as any);

      const result = await sessionGalaxyService.initializeMultiGalaxySession(
        sessionId,
        galaxyConfiguration
      );

      expect(result).toMatchObject({
        sessionId,
        masterCode: 'MAIN-001',
        galaxyMappings: expect.arrayContaining([
          expect.objectContaining({
            galaxyName: 'Alpha Galaxy',
            gameCode: 'ALPH-001'
          }),
          expect.objectContaining({
            galaxyName: galaxyConfiguration.galaxies?.[1]?.name,
            gameCode: 'BETA-001'
          })
        ])
      });

      expect(galaxyService.createGalaxy).toHaveBeenCalledTimes(2);
      expect(galaxyService.generateAndAssignTeams).toHaveBeenCalledTimes(2);
    });

    it('should validate galaxy configuration', async () => {
      const sessionId = 'session_123';
      const invalidConfig: GalaxyConfiguration = {
        galaxies: [], // Empty galaxies
        crossGalaxyTrading: false,
        globalEvents: true,
        sharedMarketIntel: true,
        competitionMode: 'individual',
        victoryConditions: []
      };

      await expect(
        sessionGalaxyService.initializeMultiGalaxySession(sessionId, invalidConfig)
      ).rejects.toThrow('At least one galaxy must be configured');
    });
  });

  describe('setCrossGalaxyTrading', () => {
    it('should enable cross-galaxy trading with rules', async () => {
      const sessionId = 'session_123';
      const rules: CrossGalaxyTradeRules = {
        allowed: true,
        restrictions: {
          maxDistance: 2,
          resourceTypes: ['minerals', 'electronics'],
          taxRate: 0.1
        }
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          galaxies: [
            { id: 'galaxy_1', name: 'Galaxy 1' },
            { id: 'galaxy_2', name: 'Galaxy 2' }
          ]
        })
      } as any);

      await sessionGalaxyService.setCrossGalaxyTrading(sessionId, true, rules);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          crossGalaxyTrading: true,
          crossGalaxyTradeRules: rules
        })
      );
    });

    it('should prevent enabling cross-galaxy trading with only one galaxy', async () => {
      const sessionId = 'session_123';

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          galaxies: [{ id: 'galaxy_1', name: 'Only Galaxy' }]
        })
      } as any);

      await expect(
        sessionGalaxyService.setCrossGalaxyTrading(sessionId, true)
      ).rejects.toThrow('Cross-galaxy trading requires at least 2 galaxies');
    });
  });

  describe('validateCrossGalaxyTrade', () => {
    it('should validate cross-galaxy trade when allowed', async () => {
      const sessionId = 'session_123';
      const fromTeamId = 'team_1';
      const toTeamId = 'team_2';

      vi.mocked(getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ galaxyId: 'galaxy_1' })
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ galaxyId: 'galaxy_2' })
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ allowed: true })
        } as any);

      const result = await sessionGalaxyService.validateCrossGalaxyTrade(
        fromTeamId,
        toTeamId,
        sessionId
      );

      expect(result).toEqual({ valid: true });
    });

    it('should reject cross-galaxy trade when disabled', async () => {
      const sessionId = 'session_123';
      const fromTeamId = 'team_1';
      const toTeamId = 'team_2';

      vi.mocked(getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ galaxyId: 'galaxy_1' })
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ galaxyId: 'galaxy_2' })
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ allowed: false })
        } as any);

      const result = await sessionGalaxyService.validateCrossGalaxyTrade(
        fromTeamId,
        toTeamId,
        sessionId
      );

      expect(result).toEqual({
        valid: false,
        reason: 'Cross-galaxy trading is disabled'
      });
    });
  });

  describe('calculateCrossGalaxyLeaderboard', () => {
    it('should calculate leaderboard across galaxies', async () => {
      const sessionId = 'session_123';

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          galaxies: [
            { id: 'galaxy_1', name: 'Alpha' },
            { id: 'galaxy_2', name: 'Beta' }
          ],
          competitionMode: 'hybrid',
          victoryConditions: []
        })
      } as any);

      vi.mocked(galaxyService.getGalaxyTeams)
        .mockResolvedValueOnce([
          {
            id: 'team_1',
            name: 'Team A',
            galaxyId: 'galaxy_1',
            resources: { water: 100, food: 100, oxygen: 100, energy: 100, minerals: 100, electronics: 100 },
            eliminationStatus: { isEliminated: false },
            metrics: {
              totalResourcesGained: 200,
              totalResourcesLost: 50,
              tradesCompleted: 10,
              survivalRounds: 5,
              investmentEfficiency: 80,
              diplomaticScore: 75
            }
          }
        ] as any)
        .mockResolvedValueOnce([
          {
            id: 'team_2',
            name: 'Team B',
            galaxyId: 'galaxy_2',
            resources: { water: 80, food: 80, oxygen: 80, energy: 80, minerals: 80, electronics: 80 },
            eliminationStatus: { isEliminated: false },
            metrics: {
              totalResourcesGained: 150,
              totalResourcesLost: 30,
              tradesCompleted: 8,
              survivalRounds: 5,
              investmentEfficiency: 70,
              diplomaticScore: 60
            }
          }
        ] as any);

      const result = await sessionGalaxyService.calculateCrossGalaxyLeaderboard(sessionId);

      expect(result).toMatchObject({
        galaxyLeaderboard: expect.arrayContaining([
          expect.objectContaining({ galaxyName: 'Alpha' }),
          expect.objectContaining({ galaxyName: 'Beta' })
        ]),
        teamLeaderboard: expect.arrayContaining([
          expect.objectContaining({ teamName: 'Team A' }),
          expect.objectContaining({ teamName: 'Team B' })
        ]),
        overallWinners: expect.any(Array)
      });

      // Team A should be ranked higher due to better resources and metrics
      expect(result.teamLeaderboard[0].teamId).toBe('team_1');
    });
  });

  describe('getMultiGalaxyStatistics', () => {
    it('should aggregate statistics across all galaxies', async () => {
      const sessionId = 'session_123';

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          galaxies: [
            { id: 'galaxy_1', name: 'Alpha' },
            { id: 'galaxy_2', name: 'Beta' }
          ]
        })
      } as any);

      vi.mocked(galaxyService.getGalaxyStatistics)
        .mockResolvedValueOnce({
          totalTeams: 6,
          activeTeams: 5,
          aiTeams: 2,
          humanTeams: 4,
          averageResources: {},
          topPerformers: []
        })
        .mockResolvedValueOnce({
          totalTeams: 4,
          activeTeams: 4,
          aiTeams: 1,
          humanTeams: 3,
          averageResources: {},
          topPerformers: []
        });

      vi.mocked(getDocs).mockResolvedValueOnce({
        size: 3
      } as any);

      const result = await sessionGalaxyService.getMultiGalaxyStatistics(sessionId);

      expect(result).toMatchObject({
        totalGalaxies: 2,
        totalTeams: 10,
        activeTeams: 9,
        crossGalaxyTrades: 3,
        averageGalaxySize: 5,
        largestGalaxy: { name: 'Alpha', teams: 6 },
        smallestGalaxy: { name: 'Beta', teams: 4 }
      });
    });
  });
});