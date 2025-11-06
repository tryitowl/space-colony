import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleService } from '../../src/services/roleService';
import type { UserRole, FacilitatorAccess } from '../../src/types';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('RoleService', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
  });

  describe('detectRoleFromCode', () => {
    it('should detect facilitator codes (FAC###)', () => {
      expect(RoleService.detectRoleFromCode('FAC123')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('fac456')).toBe('facilitator');
      expect(RoleService.detectRoleFromCode('FAC999')).toBe('facilitator');
    });

    it('should detect admin codes (ADM###)', () => {
      expect(RoleService.detectRoleFromCode('ADM123')).toBe('admin');
      expect(RoleService.detectRoleFromCode('adm456')).toBe('admin');
      expect(RoleService.detectRoleFromCode('ADM999')).toBe('admin');
    });

    it('should detect player codes as default', () => {
      expect(RoleService.detectRoleFromCode('CGAB01')).toBe('player');
      expect(RoleService.detectRoleFromCode('XYZA02')).toBe('player');
      expect(RoleService.detectRoleFromCode('ABC123')).toBe('player');
      expect(RoleService.detectRoleFromCode('random')).toBe('player');
    });
  });

  describe('Role Context Management', () => {
    it('should store and retrieve role context', () => {
      const context = {
        role: 'facilitator' as UserRole,
        userId: 'test-user-123'
      };

      RoleService.setRoleContext(context);
      const retrieved = RoleService.getRoleContext();

      expect(retrieved).toEqual(context);
    });

    it('should store and retrieve facilitator access', () => {
      const facilitatorAccess: FacilitatorAccess = {
        facilitatorId: 'facilitator_123',
        facilitatorCode: 'FAC123',
        eventIds: ['event_1', 'event_2'],
        sessionIds: ['session_1', 'session_2'],
        createdAt: Date.now(),
        lastAccess: Date.now()
      };

      const context = {
        role: 'facilitator' as UserRole,
        userId: 'test-user-123',
        facilitatorAccess
      };

      RoleService.setRoleContext(context);
      const retrieved = RoleService.getRoleContext();

      expect(retrieved?.facilitatorAccess).toEqual(facilitatorAccess);
    });

    it('should clear role context', () => {
      RoleService.setRoleContext({
        role: 'admin',
        userId: 'test-user-123'
      });

      RoleService.clearRoleContext();
      expect(RoleService.getRoleContext()).toBeNull();
    });
  });

  describe('Access Control', () => {
    it('should grant admin access to all sessions', () => {
      RoleService.setRoleContext({
        role: 'admin',
        userId: 'admin-user'
      });

      expect(RoleService.hasSessionAccess('any-session')).toBe(true);
      expect(RoleService.hasEventAccess('any-event')).toBe(true);
    });

    it('should grant facilitator access only to assigned sessions', () => {
      const facilitatorAccess: FacilitatorAccess = {
        facilitatorId: 'facilitator_123',
        facilitatorCode: 'FAC123',
        eventIds: ['event_1'],
        sessionIds: ['session_1', 'session_2'],
        createdAt: Date.now(),
        lastAccess: Date.now()
      };

      RoleService.setRoleContext({
        role: 'facilitator',
        userId: 'facilitator-user',
        facilitatorAccess
      });

      expect(RoleService.hasSessionAccess('session_1')).toBe(true);
      expect(RoleService.hasSessionAccess('session_2')).toBe(true);
      expect(RoleService.hasSessionAccess('session_3')).toBe(false);
      
      expect(RoleService.hasEventAccess('event_1')).toBe(true);
      expect(RoleService.hasEventAccess('event_2')).toBe(false);
    });

    it('should deny access when no role context exists', () => {
      expect(RoleService.hasSessionAccess('any-session')).toBe(false);
      expect(RoleService.hasEventAccess('any-event')).toBe(false);
    });
  });

  describe('Role Check Helpers', () => {
    it('should correctly identify admin role', () => {
      RoleService.setRoleContext({
        role: 'admin',
        userId: 'admin-user'
      });

      expect(RoleService.isAdmin()).toBe(true);
      expect(RoleService.isFacilitator()).toBe(false);
      expect(RoleService.isPlayer()).toBe(false);
    });

    it('should correctly identify facilitator role', () => {
      RoleService.setRoleContext({
        role: 'facilitator',
        userId: 'facilitator-user'
      });

      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(true);
      expect(RoleService.isPlayer()).toBe(false);
    });

    it('should correctly identify player role', () => {
      RoleService.setRoleContext({
        role: 'player',
        userId: 'player-user'
      });

      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(false);
      expect(RoleService.isPlayer()).toBe(true);
    });

    it('should return null when no role is set', () => {
      expect(RoleService.getCurrentRole()).toBeNull();
      expect(RoleService.isAdmin()).toBe(false);
      expect(RoleService.isFacilitator()).toBe(false);
      expect(RoleService.isPlayer()).toBe(false);
    });
  });
});