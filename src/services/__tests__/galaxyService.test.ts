import { vi, describe, it, expect, beforeEach } from 'vitest';
import { galaxyService } from '../galaxyService';
import { getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { sessionCodeService } from '../sessionCodeService';
import { TeamGenerationService } from '../teamGenerationService';
import type { Galaxy, GalaxyConfiguration } from '../../types/galaxy.types';

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
  deleteDoc: vi.fn()
}));

// Mock other services
vi.mock('../sessionCodeService', () => ({
  sessionCodeService: {
    generateSessionCode: vi.fn()
  }
}));

vi.mock('../teamGenerationService', () => ({
  TeamGenerationService: {
    generateTeamsForGalaxy: vi.fn()
  }
}));

describe('GalaxyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGalaxy', () => {
    it('should create a galaxy with default configuration', async () => {
      const sessionId = 'session_123';
      const galaxyConfig: Partial<Galaxy> = {
        name: 'Test Galaxy',
        totalTeams: 6
      };

      const result = await galaxyService.createGalaxy(sessionId, galaxyConfig);

      expect(result).toMatchObject({
        id: `${sessionId}_galaxy_0`,
        name: 'Test Galaxy',
        totalTeams: 6,
        colonyTypes: expect.arrayContaining(['mining', 'agricultural', 'research']),
        teamStructure: { mode: 'standard' },
        aiEnabled: false
      });
    });

    it('should apply template defaults when applicable', async () => {
      const sessionId = 'session_123';
      const galaxyConfig: Partial<Galaxy> = {
        name: 'Standard Galaxy'
      };

      const result = await galaxyService.createGalaxy(sessionId, galaxyConfig);

      expect(result.totalTeams).toBe(6);
      expect(result.colonyTypes).toHaveLength(6);
    });

    it('should validate galaxy configuration', async () => {
      const sessionId = 'session_123';
      const invalidConfig: Partial<Galaxy> = {
        name: 'Invalid Galaxy',
        totalTeams: 15 // Over the limit
      };

      await expect(
        galaxyService.createGalaxy(sessionId, invalidConfig)
      ).rejects.toThrow('Total teams must be between 2 and 12');
    });
  });

  describe('createGalaxiesForSession', () => {
    it('should create multiple galaxies for a session', async () => {
      const sessionId = 'session_123';
      const galaxyConfigs: Partial<Galaxy>[] = [
        { name: 'Galaxy A', totalTeams: 4 },
        { name: 'Galaxy B', totalTeams: 6 }
      ];

      const result = await galaxyService.createGalaxiesForSession(sessionId, galaxyConfigs);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Galaxy A');
      expect(result[1].name).toBe('Galaxy B');
    });
  });

  describe('assignTeamsToGalaxy', () => {
    it('should assign teams to a galaxy and generate codes', async () => {
      const galaxyId = 'galaxy_123';
      const mockGalaxy: Galaxy = {
        id: galaxyId,
        name: 'Test Galaxy',
        description: 'Test',
        totalTeams: 2,
        colonyTypes: ['mining', 'agricultural'],
        teamStructure: { mode: 'standard' },
        aiEnabled: false
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockGalaxy
      } as any);

      vi.mocked(sessionCodeService.generateSessionCode).mockResolvedValue('TEST-GAL');

      const teamAssignments = [
        {
          teamId: 'team_1',
          galaxyId: galaxyId,
          colonyType: 'mining' as const,
          isAIControlled: false
        },
        {
          teamId: 'team_2',
          galaxyId: galaxyId,
          colonyType: 'agricultural' as const,
          isAIControlled: false
        }
      ];

      await galaxyService.assignTeamsToGalaxy(galaxyId, teamAssignments);

      expect(sessionCodeService.generateSessionCode).toHaveBeenCalledTimes(2);
    });

    it('should validate colony types against galaxy configuration', async () => {
      const galaxyId = 'galaxy_123';
      const mockGalaxy: Galaxy = {
        id: galaxyId,
        name: 'Test Galaxy',
        description: 'Test',
        totalTeams: 2,
        colonyTypes: ['mining'],
        teamStructure: { mode: 'standard' },
        aiEnabled: false
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockGalaxy
      } as any);

      const invalidAssignments = [
        {
          teamId: 'team_1',
          galaxyId: galaxyId,
          colonyType: 'agricultural' as const, // Not in galaxy's colonyTypes
          isAIControlled: false
        }
      ];

      await expect(
        galaxyService.assignTeamsToGalaxy(galaxyId, invalidAssignments)
      ).rejects.toThrow('Colony type agricultural not available in this galaxy');
    });
  });

  describe('generateAndAssignTeams', () => {
    it('should generate and assign teams to a galaxy', async () => {
      const galaxyId = 'galaxy_123';
      const sessionId = 'session_123';
      const mockGalaxy: Galaxy = {
        id: galaxyId,
        name: 'Test Galaxy',
        description: 'Test',
        totalTeams: 4,
        colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub'],
        teamStructure: { mode: 'balanced' },
        aiEnabled: true,
        aiDifficulty: 'medium'
      };

      const mockTeams = [
        {
          id: 'team_1',
          type: 'mining',
          name: 'Team A',
          teamLetter: 'A',
          teamNumber: 1,
          galaxyId: galaxyId,
          players: [],
          resources: {},
          investments: {},
          tradingStatus: { isOpen: false, lastUpdated: Date.now() },
          gameCode: 'TEST-001',
          eliminationStatus: { isEliminated: false, reason: null, round: null },
          isAIControlled: false
        }
      ];

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockGalaxy
      } as any);

      vi.mocked(TeamGenerationService.generateTeamsForGalaxy).mockResolvedValueOnce(mockTeams as any);
      vi.mocked(sessionCodeService.generateSessionCode).mockResolvedValue('TEST-GAL');

      const result = await galaxyService.generateAndAssignTeams(galaxyId, sessionId);

      expect(TeamGenerationService.generateTeamsForGalaxy).toHaveBeenCalledWith(mockGalaxy, sessionId);
      expect(result).toEqual(mockTeams);
    });
  });

  describe('configureGalaxyAI', () => {
    it('should configure AI for a galaxy', async () => {
      const galaxyId = 'galaxy_123';
      const mockTeams = [
        {
          id: 'team_1',
          isAIControlled: true,
          galaxyId: galaxyId
        },
        {
          id: 'team_2',
          isAIControlled: false,
          galaxyId: galaxyId
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockTeams.map(team => ({
          data: () => team
        }))
      } as any);

      await galaxyService.configureGalaxyAI(galaxyId, true, 'hard');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aiEnabled: true,
          aiDifficulty: 'hard'
        })
      );
    });
  });

  describe('getGalaxyStatistics', () => {
    it('should calculate galaxy statistics correctly', async () => {
      const galaxyId = 'galaxy_123';
      const mockTeams = [
        {
          id: 'team_1',
          isAIControlled: true,
          eliminationStatus: { isEliminated: false },
          resources: { water: 100, food: 50, oxygen: 75, energy: 120, minerals: 30, electronics: 20 }
        },
        {
          id: 'team_2',
          isAIControlled: false,
          eliminationStatus: { isEliminated: false },
          resources: { water: 80, food: 60, oxygen: 85, energy: 100, minerals: 40, electronics: 30 }
        },
        {
          id: 'team_3',
          isAIControlled: false,
          eliminationStatus: { isEliminated: true },
          resources: { water: 0, food: 0, oxygen: 0, energy: 0, minerals: 0, electronics: 0 }
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockTeams.map(team => ({
          data: () => team
        }))
      } as any);

      const stats = await galaxyService.getGalaxyStatistics(galaxyId);

      expect(stats).toMatchObject({
        totalTeams: 3,
        activeTeams: 2,
        aiTeams: 1,
        humanTeams: 2,
        averageResources: {
          water: 90,
          food: 55,
          oxygen: 80,
          energy: 110,
          minerals: 35,
          electronics: 25
        },
        topPerformers: expect.arrayContaining(['team_1', 'team_2'])
      });
    });
  });
});