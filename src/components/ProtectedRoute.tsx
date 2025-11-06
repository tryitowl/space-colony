import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RoleService } from '../services/roleService';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  redirectTo = '/join' 
}) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = () => {
      const context = RoleService.getRoleContext();
      
      if (!context) {
        setIsAuthorized(false);
        return;
      }

      const hasRole = allowedRoles.includes(context.role);
      setIsAuthorized(hasRole);
    };

    checkAuthorization();
  }, [allowedRoles]);

  // Still checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-space-cyan"></div>
      </div>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return <Navigate to={redirectTo} replace />;
  }

  // Authorized
  return <>{children}</>;
};