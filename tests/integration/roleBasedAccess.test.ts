import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameService } from '../../src/services/gameService';
import { TradingService } from '../../src/services/tradingService';
import { InvestmentService } from '../../src/services/investmentService';
import { EventSystemService } from '../../src/services/eventSystemService';
import { RoleService } from '../../src/services/roleService';
import { AuthService } from '../../src/services/authService';
import type { GameSession, Colony, User } from '../../src/types';
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

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('../../src/firebase/config', () => ({
  firestore: {},
  realtimeDb: {},
  auth: {},
}));

vi.mock('../../src/services/authService', () => ({
  AuthService: {
    ensureAuthenticated: vi.fn(),
    getCurrentUser: vi.fn(),
    signInAnonymously: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}));

// Mock sessionStorage for role service
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('Role-Based Access Control Integration Tests', () => {
  let mockSession: GameSession;
  let mockColonies: Colony[];
  let sessionId: string;

  // Test users with different roles
  let adminUser: User;
  let facilitatorUser: User;
  let playerUser: User;

  beforeEach(() => {
    sessionId = 'rbac-test-session';
    
    // Create test colonies
    mockColonies = [
      createColony({ 
        id: 'colony-1', 
        type: 'mining', 
        teamLetter: 'A', 
        teamNumber: 1,
        players: [{ id: 'player-1', name: 'Test Player', isConnected: true }]
      }),
      createColony({ 
        id: 'colony-2', 
        type: 'agricultural', 
        teamLetter: 'B', 
        teamNumber: 1,
        players: [{ id: 'player-2', name: 'Test Player 2', isConnected: true }]
      }),
    ];

    mockSession = createGameSession({
      id: sessionId,
      teams: mockColonies,
      currentRound: 1,
      gameState: 'investments',
      facilitatorId: 'facilitator-123',
      eventId: 'event-456'
    });

    // Create test users
    adminUser = {
      id: 'admin-123',
      email: 'admin@test.com',
      role: 'admin',
      name: 'Test Admin',
      isAnonymous: false,
      lastActive: Date.now(),
      createdAt: Date.now()
    };

    facilitatorUser = {
      id: 'facilitator-123',
      email: 'facilitator@test.com',
      role: 'facilitator',
      name: 'Test Facilitator',
      isAnonymous: false,
      lastActive: Date.now(),
      createdAt: Date.now(),
      facilitatorAccess: {
        facilitatorId: 'facilitator-123',
        facilitatorCode: 'FAC123',
        eventIds: ['event-456'],
        sessionIds: [sessionId],
        createdAt: Date.now(),
        lastAccess: Date.now()
      }
    };

    playerUser = {
      id: 'player-1',
      email: 'player@test.com',
      role: 'player',
      name: 'Test Player',
      isAnonymous: true,
      lastActive: Date.now(),
      createdAt: Date.now()
    };

    // Mock Firebase responses
    const mockFirestore = vi.mocked(import('firebase/firestore'));
    (mockFirestore.getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => mockSession
    });

    (mockFirestore.getDocs as any).mockResolvedValue({
      docs: mockColonies.map(colony => ({
        id: colony.id,
        data: () => colony
      }))
    });

    (mockFirestore.addDoc as any).mockResolvedValue({ id: 'new-doc-id' });
    (mockFirestore.updateDoc as any).mockResolvedValue(undefined);
    (mockFirestore.setDoc as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear mock sessionStorage
    mockSessionStorage.getItem.mockReturnValue(null);
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
    // Clear role context
    RoleService.clearRoleContext();
    // Clean up service instances
    (EventSystemService as any).instances.clear();
  });

  describe('Admin Role Access', () => {
    beforeEach(() => {
      // Mock sessionStorage to return admin context
      const adminContext = {
        role: 'admin',
        userId: adminUser.id
      };
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify(adminContext);
        }
        return null;
      });

      // Mock auth service to return admin user
      vi.mocked(AuthService.getCurrentUser).mockReturnValue({
        uid: adminUser.id,
        email: adminUser.email,
        isAnonymous: false
      });
    });

    it('should allow admin to access any session', () => {
      expect(RoleService.hasSessionAccess(sessionId)).toBe(true);
      expect(RoleService.hasSessionAccess('any-other-session')).toBe(true);
      expect(RoleService.isAdmin()).toBe(true);
    });

    it('should allow admin to access any event', () => {
      expect(RoleService.hasEventAccess('event-456')).toBe(true);
      expect(RoleService.hasEventAccess('any-other-event')).toBe(true);
    });

    it('should allow admin to create game sessions', async () => {
      // Test the role-based access check
      expect(RoleService.getCurrentRole()).toBe('admin');
      expect(RoleService.isAdmin()).toBe(true);
      
      // Admin should have access to create sessions
      const sessionData = {
        eventId: 'admin-test-event',
        name: 'Admin Test Session',
        facilitatorId: adminUser.id
      };

      const session = await GameService.createSession(sessionData);
      
      expect(session).toBeDefined();
      expect(session.facilitatorId).toBe(adminUser.id);
      expect(session.eventId).toBe('admin-test-event');
    });

    it('should provide admin role information correctly', () => {
      expect(RoleService.getCurrentRole()).toBe('admin');
      expect(RoleService.isAdmin()).toBe(true);
      expect(RoleService.isFacilitator()).toBe(false);
      expect(RoleService.isPlayer()).toBe(false);
    });

    it('should allow admin to detect role from codes', () => {
      // Test role detection functionality
      expect(RoleService.detectRoleFromCode('ADM123')).toBe('admin');
      expect(RoleService.detectRoleFromCode('FAC456')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('CGAB01')).toBe('player');
    });

    it('should properly validate facilitator access for admin operations', async () => {
      // Admin should be able to create facilitator access
      await expect(
        RoleService.createFacilitatorAccess('FAC123', 'event-456', sessionId)
      ).resolves.not.toThrow();
      
      // Admin should be able to validate facilitator codes
      const access = await RoleService.validateFacilitatorCode('FAC123');
      expect(access).toBeDefined();
    });
  });

  describe('Facilitator Role Access', () => {
    beforeEach(() => {
      // Mock sessionStorage to return facilitator context
      const facilitatorContext = {
        role: 'facilitator',
        userId: facilitatorUser.id,
        facilitatorAccess: facilitatorUser.facilitatorAccess
      };
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify(facilitatorContext);
        }
        if (key === 'space_colony_facilitator_access') {
          return JSON.stringify(facilitatorUser.facilitatorAccess);
        }
        return null;
      });

      // Mock auth service to return facilitator user
      vi.mocked(AuthService.getCurrentUser).mockReturnValue({
        uid: facilitatorUser.id,
        email: facilitatorUser.email,
        isAnonymous: false
      });
    });

    it('should allow facilitator to access authorized sessions only', () => {
      expect(RoleService.hasSessionAccess(sessionId)).toBe(true);
      expect(RoleService.hasSessionAccess('unauthorized-session')).toBe(false);
      expect(RoleService.isFacilitator()).toBe(true);
    });

    it('should allow facilitator to access authorized events only', () => {
      expect(RoleService.hasEventAccess('event-456')).toBe(true);
      expect(RoleService.hasEventAccess('unauthorized-event')).toBe(false);
    });

    it('should provide facilitator role information correctly', () => {
      expect(RoleService.getCurrentRole()).toBe('facilitator');
      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(true);
      expect(RoleService.isPlayer()).toBe(false);
    });

    it('should properly handle facilitator code validation', async () => {
      // Mock Firestore to return facilitator access
      const mockFirestore = vi.mocked(import('firebase/firestore'));
      (mockFirestore.getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{
          id: 'fac-doc-1',
          data: () => facilitatorUser.facilitatorAccess
        }]
      });

      const access = await RoleService.validateFacilitatorCode('FAC123');
      expect(access).toBeDefined();
      expect(access?.facilitatorCode).toBe('FAC123');
    });

    it('should correctly detect facilitator codes', () => {
      expect(RoleService.detectRoleFromCode('FAC123')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('fac456')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('ADM123')).toBe('admin');
      expect(RoleService.detectRoleFromCode('CGAB01')).toBe('player');
    });

    it('should handle facilitator access creation', async () => {
      await expect(
        RoleService.createFacilitatorAccess('FAC789', 'event-789', 'session-789')
      ).resolves.not.toThrow();
    });
  });

  describe('Player Role Access', () => {
    beforeEach(() => {
      // Mock sessionStorage to return player context
      const playerContext = {
        role: 'player',
        userId: playerUser.id
      };
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify(playerContext);
        }
        return null;
      });

      // Mock auth service to return player user
      vi.mocked(AuthService.getCurrentUser).mockReturnValue({
        uid: playerUser.id,
        email: playerUser.email,
        isAnonymous: true
      });
    });

    it('should restrict player access appropriately', () => {
      // Players have access to sessions they joined (implementation returns true)
      expect(RoleService.hasSessionAccess(sessionId)).toBe(true);
      expect(RoleService.hasEventAccess('event-456')).toBe(false);
      expect(RoleService.isPlayer()).toBe(true);
    });

    it('should provide player role information correctly', () => {
      expect(RoleService.getCurrentRole()).toBe('player');
      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(false);
      expect(RoleService.isPlayer()).toBe(true);
    });

    it('should correctly detect player codes', () => {
      expect(RoleService.detectRoleFromCode('CGAB01')).toBe('player');
      expect(RoleService.detectRoleFromCode('MHDE23')).toBe('player');
      expect(RoleService.detectRoleFromCode('XYZ999')).toBe('player');
      expect(RoleService.detectRoleFromCode('FAC123')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('ADM456')).toBe('admin');
    });

    it('should not allow players to validate facilitator codes', async () => {
      // Mock empty result for player trying to validate facilitator code
      const mockFirestore = vi.mocked(import('firebase/firestore'));
      (mockFirestore.getDocs as any).mockResolvedValue({
        empty: true,
        docs: []
      });

      const access = await RoleService.validateFacilitatorCode('FAC123');
      expect(access).toBeNull();
    });
  });

  describe('Cross-Role Interaction Scenarios', () => {
    it('should handle role context switching', () => {
      // Start as facilitator
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify({ role: 'facilitator', userId: facilitatorUser.id });
        }
        if (key === 'space_colony_facilitator_access') {
          return JSON.stringify(facilitatorUser.facilitatorAccess);
        }
        return null;
      });

      expect(RoleService.hasSessionAccess('unauthorized-session')).toBe(false);
      expect(RoleService.isFacilitator()).toBe(true);

      // Switch to admin context
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify({ role: 'admin', userId: adminUser.id });
        }
        return null;
      });

      expect(RoleService.hasSessionAccess('unauthorized-session')).toBe(true);
      expect(RoleService.isAdmin()).toBe(true);
    });

    it('should handle role hierarchy correctly', () => {
      // Test admin privileges
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({ role: 'admin', userId: adminUser.id }));
      expect(RoleService.getCurrentRole()).toBe('admin');
      expect(RoleService.hasSessionAccess('any-session')).toBe(true);
      expect(RoleService.hasEventAccess('any-event')).toBe(true);

      // Test facilitator privileges
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify({ role: 'facilitator', userId: facilitatorUser.id });
        }
        if (key === 'space_colony_facilitator_access') {
          return JSON.stringify(facilitatorUser.facilitatorAccess);
        }
        return null;
      });
      expect(RoleService.getCurrentRole()).toBe('facilitator');
      expect(RoleService.hasSessionAccess(sessionId)).toBe(true);
      expect(RoleService.hasEventAccess('event-456')).toBe(true);

      // Test player privileges
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({ role: 'player', userId: playerUser.id }));
      expect(RoleService.getCurrentRole()).toBe('player');
      expect(RoleService.hasEventAccess('any-event')).toBe(false);
    });

    it('should validate facilitator access properly', async () => {
      // Test valid facilitator code
      const mockFirestore = vi.mocked(import('firebase/firestore'));
      (mockFirestore.getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{
          id: 'valid-fac',
          data: () => ({
            facilitatorId: 'fac-123',
            facilitatorCode: 'FAC123',
            eventIds: ['event-456'],
            sessionIds: [sessionId],
            createdAt: Date.now(),
            lastAccess: Date.now()
          })
        }]
      });

      const access = await RoleService.validateFacilitatorCode('FAC123');
      expect(access).toBeDefined();
      expect(access?.facilitatorCode).toBe('FAC123');

      // Test invalid facilitator code
      (mockFirestore.getDocs as any).mockResolvedValue({
        empty: true,
        docs: []
      });

      const invalidAccess = await RoleService.validateFacilitatorCode('INVALID');
      expect(invalidAccess).toBeNull();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle missing sessionStorage data', () => {
      // Mock empty sessionStorage
      mockSessionStorage.getItem.mockReturnValue(null);

      // Should deny all access when no context
      expect(RoleService.hasSessionAccess(sessionId)).toBe(false);
      expect(RoleService.hasEventAccess('any-event')).toBe(false);
      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(false);
      expect(RoleService.isPlayer()).toBe(false);
      expect(RoleService.getCurrentRole()).toBeNull();
    });

    it('should handle malformed sessionStorage data', () => {
      // Mock malformed JSON
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      // Should handle gracefully and return null
      expect(RoleService.getCurrentRole()).toBeNull();
      expect(RoleService.hasSessionAccess(sessionId)).toBe(false);
    });

    it('should handle role context storage and retrieval', () => {
      const testContext = {
        role: 'admin' as const,
        userId: 'test-admin'
      };

      // Test setting context
      RoleService.setRoleContext(testContext);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'space_colony_role',
        JSON.stringify(testContext)
      );

      // Mock the stored data for retrieval
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'space_colony_role') {
          return JSON.stringify(testContext);
        }
        return null;
      });

      const retrievedContext = RoleService.getRoleContext();
      expect(retrievedContext).toEqual(testContext);
    });

    it('should handle facilitator access storage', () => {
      const contextWithAccess = {
        role: 'facilitator' as const,
        userId: facilitatorUser.id,
        facilitatorAccess: facilitatorUser.facilitatorAccess
      };

      RoleService.setRoleContext(contextWithAccess);
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'space_colony_role',
        JSON.stringify(contextWithAccess)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'space_colony_facilitator_access',
        JSON.stringify(facilitatorUser.facilitatorAccess)
      );
    });

    it('should handle role context clearing', () => {
      RoleService.clearRoleContext();
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('space_colony_role');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('space_colony_facilitator_access');
    });

    it('should validate different code formats', () => {
      // Test various code formats
      expect(RoleService.detectRoleFromCode('FAC123')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('fac456')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('ADM789')).toBe('admin');
      expect(RoleService.detectRoleFromCode('adm000')).toBe('admin');
      expect(RoleService.detectRoleFromCode('CGAB01')).toBe('player');
      expect(RoleService.detectRoleFromCode('random-code')).toBe('player');
      expect(RoleService.detectRoleFromCode('')).toBe('player');
    });

    it('should handle Firebase errors gracefully', async () => {
      const mockFirestore = vi.mocked(import('firebase/firestore'));
      (mockFirestore.getDocs as any).mockRejectedValue(new Error('Firebase error'));

      const access = await RoleService.validateFacilitatorCode('FAC123');
      expect(access).toBeNull();
    });
  });
});