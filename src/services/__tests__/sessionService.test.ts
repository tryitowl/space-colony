import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionService } from '../sessionService';
import { sessionCodeService } from '../sessionCodeService';
import { sessionGalaxyService } from '../sessionGalaxyService';
import { galaxyService } from '../galaxyService';
import type { GameSession, GameState } from '../../types/base.types';
import type { Galaxy } from '../../types/galaxy.types';

// Import Firebase functions we'll mock
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';

// Mock Firebase
vi.mock('../../firebase/config', () => ({
  db: {},
  firestore: {},
  realtimeDb: {},
  rtdb: {}
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
    now: vi.fn(() => ({ toDate: () => new Date() }))
  },
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  arrayUnion: vi.fn((...args) => args),
  arrayRemove: vi.fn((...args) => args)
}));

// Mock other services
vi.mock('../sessionCodeService', () => ({
  sessionCodeService: {
    generateSessionCode: vi.fn(),
    lookupSessionByCode: vi.fn()
  }
}));

vi.mock('../sessionGalaxyService', () => ({
  sessionGalaxyService: {
    initializeMultiGalaxySession: vi.fn(),
    getSessionGalaxyConfiguration: vi.fn(),
    getSessionCodeMapping: vi.fn(),
    migrateToMultiGalaxy: vi.fn(),
    updateSessionGalaxyConfiguration: vi.fn(),
    getMultiGalaxyStatistics: vi.fn()
  }
}));

vi.mock('../galaxyService', () => ({
  galaxyService: {
    createGalaxy: vi.fn(),
    generateAndAssignTeams: vi.fn(),
    getSessionGalaxies: vi.fn(),
    getGalaxyTeams: vi.fn(),
    deleteGalaxy: vi.fn()
  }
}));

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any subscriptions
    sessionService['sessionListeners'].clear();
  });

  describe('createSession', () => {
    it('should create a single-galaxy session by default', async () => {
      const eventId = 'event_123';
      const sessionName = 'Test Session';
      const facilitatorId = 'facilitator_123';

      const mockGalaxy: Partial<Galaxy> = {
        id: 'galaxy_123',
        name: 'Main Galaxy',
        totalTeams: 12
      };

      const mockTeams = [
        { id: 'team_1', name: 'Team A', type: 'mining' }
      ];

      vi.mocked(galaxyService.createGalaxy).mockResolvedValueOnce(mockGalaxy as Galaxy);
      vi.mocked(galaxyService.generateAndAssignTeams).mockResolvedValueOnce(mockTeams as any);
      vi.mocked(sessionCodeService.generateSessionCode).mockResolvedValueOnce('TEST-001');

      const sessionId = await sessionService.createSession(
        eventId,
        sessionName,
        facilitatorId
      );

      expect(sessionId).toMatch(/^session_\d+$/);
      expect(setDoc).toHaveBeenCalled();
      expect(galaxyService.createGalaxy).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({ name: 'Main Galaxy', totalTeams: 12 })
      );
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teams: mockTeams,
          code: 'TEST-001',
          galaxyMode: 'single',
          primaryGalaxyId: mockGalaxy.id
        })
      );
    });

    it('should create a multi-galaxy session when galaxyCount > 1', async () => {
      const eventId = 'event_123';
      const sessionName = 'Multi-Galaxy Session';
      const facilitatorId = 'facilitator_123';

      const mockCodeMapping = {
        sessionId: 'session_123',
        masterCode: 'MAIN-001',
        galaxyMappings: [
          { galaxyId: 'galaxy_1', galaxyName: 'Alpha', gameCode: 'ALPH-001', teams: ['team_1'] },
          { galaxyId: 'galaxy_2', galaxyName: 'Beta', gameCode: 'BETA-001', teams: ['team_2'] }
        ],
        createdAt: Date.now()
      };

      vi.mocked(sessionGalaxyService.initializeMultiGalaxySession).mockResolvedValueOnce(mockCodeMapping);
      vi.mocked(galaxyService.getGalaxyTeams)
        .mockResolvedValueOnce([{ id: 'team_1', name: 'Team A' }] as any)
        .mockResolvedValueOnce([{ id: 'team_2', name: 'Team B' }] as any);

      await sessionService.createSession(
        eventId,
        sessionName,
        facilitatorId,
        {
          galaxyCount: 2,
          enableCrossGalaxyTrading: true
        }
      );

      expect(sessionGalaxyService.initializeMultiGalaxySession).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          galaxyMode: 'multi',
          galaxyCount: 2,
          code: 'MAIN-001',
          codeMapping: mockCodeMapping
        })
      );
    });
  });

  describe('getSession', () => {
    it('should get session with galaxy information for multi-galaxy', async () => {
      const sessionId = 'session_123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        name: 'Test Session',
        galaxyMode: 'multi',
        teams: []
      };

      const mockGalaxyConfig = {
        galaxies: [{ id: 'galaxy_1', name: 'Alpha' }],
        crossGalaxyTrading: true
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockSession
      } as any);

      vi.mocked(sessionGalaxyService.getSessionGalaxyConfiguration).mockResolvedValueOnce(mockGalaxyConfig as any);

      const result = await sessionService.getSession(sessionId);

      expect(result).toMatchObject({
        ...mockSession,
        galaxyConfiguration: mockGalaxyConfig
      });
    });

    it('should return null for non-existent session', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false
      } as any);

      const result = await sessionService.getSession('non_existent');

      expect(result).toBeNull();
    });
  });

  describe('getSessionByCode', () => {
    it('should get session by master code', async () => {
      const code = 'TEST-001';
      const sessionId = 'session_123';

      vi.mocked(sessionCodeService.lookupSessionByCode).mockResolvedValueOnce(sessionId);
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: sessionId, name: 'Test Session' })
      } as any);

      const result = await sessionService.getSessionByCode(code);

      expect(result).toMatchObject({ id: sessionId });
    });

    it('should get session by galaxy-specific code', async () => {
      const code = 'ALPH-001';
      const galaxySessionId = 'session_123_galaxy_0';
      const mainSessionId = 'session_123';

      vi.mocked(sessionCodeService.lookupSessionByCode).mockResolvedValueOnce(galaxySessionId);
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: mainSessionId, name: 'Test Session' })
      } as any);

      const result = await sessionService.getSessionByCode(code);

      expect(result).toMatchObject({ id: mainSessionId });
    });
  });

  describe('updateSessionState', () => {
    it('should update session state and record start time when activating', async () => {
      const sessionId = 'session_123';
      const newState: GameState = 'active';

      await sessionService.updateSessionState(sessionId, newState);

      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gameState: 'active'
        })
      );
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          startTime: expect.any(Number)
        })
      );
    });

    it('should record end time when completing', async () => {
      const sessionId = 'session_123';
      const newState: GameState = 'completed';

      await sessionService.updateSessionState(sessionId, newState);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          endTime: expect.any(Number)
        })
      );
    });
  });

  describe('addGalaxyToSession', () => {
    it('should migrate single-galaxy session to multi-galaxy', async () => {
      const sessionId = 'session_123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        galaxyMode: 'single',
        teams: []
      };

      const mockCodeMapping = {
        sessionId,
        masterCode: 'MAIN-001',
        galaxyMappings: [],
        createdAt: Date.now()
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockSession
      } as any);

      vi.mocked(sessionGalaxyService.migrateToMultiGalaxy).mockResolvedValueOnce(mockCodeMapping);

      const newGalaxyConfig: Partial<Galaxy> = {
        name: 'New Galaxy',
        totalTeams: 4
      };

      await sessionService.addGalaxyToSession(sessionId, newGalaxyConfig);

      expect(sessionGalaxyService.migrateToMultiGalaxy).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          galaxyMode: 'multi',
          codeMapping: mockCodeMapping
        })
      );
    });

    it('should add galaxy to existing multi-galaxy session', async () => {
      const sessionId = 'session_123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        galaxyMode: 'multi',
        teams: [{ id: 'team_1' }] as any
      };

      const existingConfig = {
        galaxies: [{ id: 'galaxy_1', name: 'Existing Galaxy' }]
      };

      const newGalaxy = {
        id: 'galaxy_2',
        name: 'New Galaxy',
        totalTeams: 4
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockSession
      } as any);

      vi.mocked(sessionGalaxyService.getSessionGalaxyConfiguration).mockResolvedValueOnce(existingConfig as any);
      vi.mocked(galaxyService.createGalaxy).mockResolvedValueOnce(newGalaxy as any);
      vi.mocked(galaxyService.generateAndAssignTeams).mockResolvedValueOnce([{ id: 'team_2' }] as any);

      const result = await sessionService.addGalaxyToSession(sessionId, newGalaxy);

      expect(result).toMatchObject(newGalaxy);
      expect(sessionGalaxyService.updateSessionGalaxyConfiguration).toHaveBeenCalled();
    });
  });

  describe('getTeamsByGalaxy', () => {
    it('should group teams by galaxy for multi-galaxy session', async () => {
      const sessionId = 'session_123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        galaxyMode: 'multi'
      };

      const mockGalaxies = [
        { id: 'galaxy_1', name: 'Alpha' },
        { id: 'galaxy_2', name: 'Beta' }
      ];

      const mockTeamsGalaxy1 = [
        { id: 'team_1', name: 'Team A', galaxyId: 'galaxy_1' }
      ];

      const mockTeamsGalaxy2 = [
        { id: 'team_2', name: 'Team B', galaxyId: 'galaxy_2' }
      ];

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockSession
      } as any);

      vi.mocked(galaxyService.getSessionGalaxies).mockResolvedValueOnce(mockGalaxies as any);
      vi.mocked(galaxyService.getGalaxyTeams)
        .mockResolvedValueOnce(mockTeamsGalaxy1 as any)
        .mockResolvedValueOnce(mockTeamsGalaxy2 as any);

      const result = await sessionService.getTeamsByGalaxy(sessionId);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('galaxy_1')).toEqual(mockTeamsGalaxy1);
      expect(result.get('galaxy_2')).toEqual(mockTeamsGalaxy2);
    });
  });

  describe('subscribeToSession', () => {
    it('should subscribe to session updates', () => {
      const sessionId = 'session_123';
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(onSnapshot).mockReturnValueOnce(mockUnsubscribe);

      const unsubscribe = sessionService.subscribeToSession(sessionId, callback);

      expect(onSnapshot).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function)
      );

      // Clean up
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('getSessionStatistics', () => {
    it('should calculate session statistics including galaxy stats', async () => {
      const sessionId = 'session_123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        galaxyMode: 'multi',
        teams: [
          { eliminationStatus: { isEliminated: false } },
          { eliminationStatus: { isEliminated: true } },
          { eliminationStatus: { isEliminated: false } }
        ] as any
      };

      const mockGalaxyStats = {
        totalGalaxies: 2,
        totalTeams: 10,
        activeTeams: 8
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockSession
      } as any);

      vi.mocked(getDocs).mockResolvedValueOnce({
        size: 15
      } as any);

      vi.mocked(sessionGalaxyService.getMultiGalaxyStatistics).mockResolvedValueOnce(mockGalaxyStats as any);

      const result = await sessionService.getSessionStatistics(sessionId);

      expect(result).toMatchObject({
        totalTeams: 3,
        activeTeams: 2,
        eliminatedTeams: 1,
        totalTrades: 15,
        galaxyStats: mockGalaxyStats
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete session and all associated data', async () => {
      const sessionId = 'session_123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        code: 'TEST-001'
      };

      const mockGalaxies = [
        { id: 'galaxy_1' },
        { id: 'galaxy_2' }
      ];

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockSession
      } as any);

      vi.mocked(galaxyService.getSessionGalaxies).mockResolvedValueOnce(mockGalaxies as any);

      await sessionService.deleteSession(sessionId);

      expect(galaxyService.deleteGalaxy).toHaveBeenCalledTimes(2);
      expect(writeBatch).toHaveBeenCalled();
    });
  });
});