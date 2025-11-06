import { useState, useEffect } from 'react';
import { RoleService } from '../services/roleService';
import type { UserRole, FacilitatorAccess } from '../types';

interface RoleHookResult {
  role: UserRole | null;
  facilitatorAccess: FacilitatorAccess | null;
  isAdmin: boolean;
  isFacilitator: boolean;
  isPlayer: boolean;
  hasSessionAccess: (sessionId: string) => boolean;
  hasEventAccess: (eventId: string) => boolean;
  clearRole: () => void;
}

export const useRole = (): RoleHookResult => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [facilitatorAccess, setFacilitatorAccess] = useState<FacilitatorAccess | null>(null);

  useEffect(() => {
    const loadRole = () => {
      const context = RoleService.getRoleContext();
      
      if (context) {
        setRole(context.role);
        setFacilitatorAccess(context.facilitatorAccess || null);
      }
    };

    // Load initial role
    loadRole();

    // Listen for storage changes (in case role changes in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'space_colony_role' || e.key === 'space_colony_facilitator_access') {
        loadRole();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearRole = () => {
    RoleService.clearRoleContext();
    setRole(null);
    setFacilitatorAccess(null);
  };

  return {
    role,
    facilitatorAccess,
    isAdmin: role === 'admin',
    isFacilitator: role === 'facilitator',
    isPlayer: role === 'player',
    hasSessionAccess: (sessionId: string) => RoleService.hasSessionAccess(sessionId),
    hasEventAccess: (eventId: string) => RoleService.hasEventAccess(eventId),
    clearRole
  };
};