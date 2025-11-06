import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase modules first
vi.mock('firebase/firestore');
vi.mock('../../src/firebase/config');

import { doc, getDoc, updateDoc, collection, addDoc, writeBatch, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { EventSystemService } from '../../src/services/eventSystemService';
import type { CrisisEvent, CrisisEventType, EventSystemConfig } from '../../src/services/eventSystemService';
import type { GameSession, Colony, Resources } from '../../src/types';
import { createColony, createGameSession, createResources } from '../../src/test/utils/factories';

// Setup mocks
vi.mocked(writeBatch).mockReturnValue({
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
} as any);
vi.mocked(serverTimestamp).mockReturnValue('SERVER_TIMESTAMP' as any);

describe('EventSystemService', () => {
  let mockSession: GameSession;
  let mockColonies: Colony[];
  let eventService: EventSystemService;

  beforeEach(() => {
    mockColonies = [
      createColony({
        id: 'colony-1',
        type: 'mining',
        name: 'Mining Alpha',
        resources: createResources({ oxygen: 10, food: 8, water: 6, energy: 12 })
      }),
      createColony({
        id: 'colony-2',
        type: 'agricultural',
        name: 'Agricultural Beta',
        resources: createResources({ oxygen: 8, food: 15, water: 12, energy: 6 })
      }),
      createColony({
        id: 'colony-3',
        type: 'research',
        name: 'Research Gamma',
        resources: createResources({ oxygen: 12, food: 6, water: 4, energy: 15 })
      })
    ];

    mockSession = createGameSession({
      id: 'session-1',
      teams: mockColonies,
      currentRound: 2
    });

    const config: Partial<EventSystemConfig> = {
      enabledEventTypes: ['solar_storm', 'equipment_failure', 'supply_shortage'],
      eventFrequency: 0.5,
      maxConcurrentEvents: 2,
      severityWeights: { minor: 0.6, major: 0.3, critical: 0.1 }
    };

    eventService = EventSystemService.getInstance('session-1', config);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear static instances for clean test isolation
    (EventSystemService as any).instances.clear();
  });

  describe('getInstance', () => {
    it('should create a new instance with configuration', () => {
      expect(eventService).toBeDefined();
      expect(eventService).toBeInstanceOf(EventSystemService);
    });

    it('should return the same instance for the same session', () => {
      const anotherInstance = EventSystemService.getInstance('session-1');
      expect(anotherInstance).toBe(eventService);
    });

    it('should create different instances for different sessions', () => {
      const differentConfig: Partial<EventSystemConfig> = {
        enabledEventTypes: ['contamination', 'system_malfunction'],
        eventFrequency: 0.3
      };
      
      const differentInstance = EventSystemService.getInstance('session-2', differentConfig);
      expect(differentInstance).not.toBe(eventService);
    });

    it('should throw error when trying to get instance without config for new session', () => {
      expect(() => {
        EventSystemService.getInstance('non-existent-session');
      }).toThrow('EventSystemService instance for session non-existent-session not found');
    });
  });

  describe('triggerCrisisEvent', () => {
    it('should trigger a crisis event successfully', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      const crisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'major');

      expect(crisisEvent).toMatchObject({
        id: expect.any(String),
        sessionId: 'session-1',
        type: 'solar_storm',
        severity: 'major',
        round: mockSession.currentRound,
        isActive: true,
        affectedTeams: mockColonies.map(c => c.id)
      });

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'solar_storm',
          severity: 'major',
          isActive: true
        })
      );
    });

    it('should handle specific affected teams', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-2' } as any);

      const affectedTeams = ['colony-1', 'colony-2'];
      const crisisEvent = await eventService.triggerCrisisEvent('equipment_failure', 'critical', affectedTeams);

      expect(crisisEvent.affectedTeams).toEqual(affectedTeams);
      expect(crisisEvent.severity).toBe('critical');
      expect(crisisEvent.type).toBe('equipment_failure');
    });

    it('should throw error for non-existent session', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => false
      } as any);

      await expect(
        eventService.triggerCrisisEvent('solar_storm', 'major')
      ).rejects.toThrow('Session not found');
    });

    it('should handle different event types', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-3' } as any);

      const eventTypes: CrisisEventType[] = ['solar_storm', 'equipment_failure', 'supply_shortage', 'contamination'];

      for (const eventType of eventTypes) {
        const crisisEvent = await eventService.triggerCrisisEvent(eventType, 'minor');
        expect(crisisEvent.type).toBe(eventType);
        expect(crisisEvent.severity).toBe('minor');
      }
    });
  });

  describe('resolveCrisis', () => {
    let mockCrisisEvent: CrisisEvent;

    beforeEach(async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      // Create a mock crisis event
      mockCrisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'major');
    });

    it('should successfully resolve crisis with sufficient resources', async () => {
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;

      const contributedResources: Partial<Resources> = {
        energy: 50,
        techComponents: 5
      };

      const result = await eventService.resolveCrisis(
        mockCrisisEvent.id,
        mockCrisisEvent.resolutionOptions[0].id,
        'colony-1',
        contributedResources
      );

      expect(result.success).toBe(true);
      expect(result.rewards).toBeDefined();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: false,
          resolvedBy: 'colony-1',
          resolvedAt: 'SERVER_TIMESTAMP'
        })
      );
    });

    it('should fail to resolve crisis with insufficient resources', async () => {
      const contributedResources: Partial<Resources> = {
        energy: 1, // Insufficient amount
        techComponents: 0
      };

      const result = await eventService.resolveCrisis(
        mockCrisisEvent.id,
        mockCrisisEvent.resolutionOptions[0].id,
        'colony-1',
        contributedResources
      );

      expect(result.success).toBe(false);
      expect(result.penalties).toBeDefined();
    });

    it('should throw error for non-existent crisis', async () => {
      const contributedResources: Partial<Resources> = {
        energy: 50,
        techComponents: 5
      };

      await expect(
        eventService.resolveCrisis('non-existent', 'resolution-1', 'colony-1', contributedResources)
      ).rejects.toThrow('Crisis event not found or not active');
    });

    it('should throw error for invalid resolution option', async () => {
      const contributedResources: Partial<Resources> = {
        energy: 50,
        techComponents: 5
      };

      await expect(
        eventService.resolveCrisis(
          mockCrisisEvent.id,
          'invalid-resolution',
          'colony-1',
          contributedResources
        )
      ).rejects.toThrow('Resolution option not found');
    });

    it('should handle team contribution requirements', async () => {
      // Test multi-team contribution scenario
      const teamContributionEvent = mockCrisisEvent.resolutionOptions.find(
        res => res.teamContributionRequired
      );

      if (teamContributionEvent) {
        const contributedResources: Partial<Resources> = {
          oxygen: 20,
          food: 15,
          water: 10
        };

        const result = await eventService.resolveCrisis(
          mockCrisisEvent.id,
          teamContributionEvent.id,
          'colony-1',
          contributedResources
        );

        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      }
    });
  });

  describe('getActiveEvents', () => {
    it('should return empty array when no active events', () => {
      const activeEvents = eventService.getActiveEvents();
      expect(activeEvents).toEqual([]);
    });

    it('should return active events after triggering crisis', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      await eventService.triggerCrisisEvent('solar_storm', 'major');
      await eventService.triggerCrisisEvent('equipment_failure', 'minor');

      const activeEvents = eventService.getActiveEvents();
      expect(activeEvents).toHaveLength(2);
      expect(activeEvents[0].isActive).toBe(true);
      expect(activeEvents[1].isActive).toBe(true);
    });

    it('should not include resolved events in active list', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      const crisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'major');
      
      // Resolve the crisis
      await eventService.resolveCrisis(
        crisisEvent.id,
        crisisEvent.resolutionOptions[0].id,
        'colony-1',
        { energy: 100, techComponents: 10 }
      );

      const activeEvents = eventService.getActiveEvents();
      expect(activeEvents).toHaveLength(0);
    });
  });

  describe('getCrisisHistory', () => {
    it('should retrieve crisis history from database', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      const mockQuery = vi.mocked(await import('firebase/firestore')).query;
      const mockCollection = vi.mocked(await import('firebase/firestore')).collection;
      const mockWhere = vi.mocked(await import('firebase/firestore')).where;
      const mockOrderBy = vi.mocked(await import('firebase/firestore')).orderBy;
      const mockLimit = vi.mocked(await import('firebase/firestore')).limit;

      const mockCrisisEvents = [
        {
          id: 'crisis-1',
          type: 'solar_storm',
          severity: 'major',
          timestamp: Date.now() - 3600000,
          isActive: false,
          resolvedBy: 'colony-1'
        },
        {
          id: 'crisis-2',
          type: 'equipment_failure',
          severity: 'minor',
          timestamp: Date.now() - 1800000,
          isActive: false,
          resolvedBy: 'colony-2'
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockCrisisEvents.map(event => ({
          data: () => event
        }))
      } as any);

      const history = await eventService.getCrisisHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        id: 'crisis-1',
        type: 'solar_storm',
        severity: 'major'
      });
      expect(history[1]).toMatchObject({
        id: 'crisis-2',
        type: 'equipment_failure',
        severity: 'minor'
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('sessionId', '==', 'session-1');
      expect(mockOrderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should handle database errors gracefully', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockRejectedValue(new Error('Database connection failed'));

      const history = await eventService.getCrisisHistory();
      expect(history).toEqual([]);
    });
  });

  describe('initialize', () => {
    it('should load existing active events on initialization', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      
      const mockActiveEvents = [
        {
          id: 'active-crisis-1',
          sessionId: 'session-1',
          type: 'contamination',
          isActive: true,
          timestamp: Date.now()
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockActiveEvents.map(event => ({
          data: () => event
        }))
      } as any);

      await eventService.initialize();

      const activeEvents = eventService.getActiveEvents();
      expect(activeEvents).toHaveLength(1);
      expect(activeEvents[0].id).toBe('active-crisis-1');
    });

    it('should handle initialization errors gracefully', async () => {
      const mockGetDocs = vi.mocked(await import('firebase/firestore')).getDocs;
      mockGetDocs.mockRejectedValue(new Error('Initialization failed'));

      await expect(eventService.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('crisis event generation', () => {
    it('should generate events with appropriate severity distribution', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      const severities: Array<'minor' | 'major' | 'critical'> = [];

      // Generate multiple events to test severity distribution
      for (let i = 0; i < 10; i++) {
        const event = await eventService.triggerCrisisEvent('solar_storm');
        severities.push(event.severity);
      }

      // Should have some variety in severities
      const uniqueSeverities = new Set(severities);
      expect(uniqueSeverities.size).toBeGreaterThan(1);
    });

    it('should create events with proper resolution options', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      const crisisEvent = await eventService.triggerCrisisEvent('equipment_failure', 'major');

      expect(crisisEvent.resolutionOptions).toBeDefined();
      expect(crisisEvent.resolutionOptions.length).toBeGreaterThan(0);
      
      crisisEvent.resolutionOptions.forEach(resolution => {
        expect(resolution).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          requirements: expect.any(Object),
          timeLimit: expect.any(Number),
          successEffects: expect.any(Array),
          failureEffects: expect.any(Array),
          teamContributionRequired: expect.any(Boolean)
        });
      });
    });

    it('should create events with proper effects structure', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      const crisisEvent = await eventService.triggerCrisisEvent('contamination', 'critical');

      expect(crisisEvent.effects).toBeDefined();
      expect(Array.isArray(crisisEvent.effects)).toBe(true);
      
      if (crisisEvent.effects.length > 0) {
        crisisEvent.effects.forEach(effect => {
          expect(effect).toMatchObject({
            type: expect.stringMatching(/^(resource_drain|trading_disabled|production_halt|communication_loss|random_damage)$/),
            duration: expect.any(Number),
            parameters: expect.any(Object)
          });
        });
      }
    });
  });

  describe('error handling', () => {
    it('should handle Firebase errors gracefully in crisis triggering', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockRejectedValue(new Error('Firebase connection failed'));

      await expect(
        eventService.triggerCrisisEvent('solar_storm', 'major')
      ).rejects.toThrow('Firebase connection failed');
    });

    it('should handle Firebase errors gracefully in crisis resolution', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockAddDoc = vi.mocked(await import('firebase/firestore')).addDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;

      // Setup a valid crisis first
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'crisis-1' } as any);

      const crisisEvent = await eventService.triggerCrisisEvent('solar_storm', 'major');

      // Then simulate failure during resolution
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      await expect(
        eventService.resolveCrisis(
          crisisEvent.id,
          crisisEvent.resolutionOptions[0].id,
          'colony-1',
          { energy: 100 }
        )
      ).rejects.toThrow('Update failed');
    });
  });
});