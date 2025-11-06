import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { RoleService } from '../services/roleService';

export const FacilitatorLogin: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if facilitator access is valid
    const context = RoleService.getRoleContext();
    
    if (!context || context.role !== 'facilitator' || !context.facilitatorAccess) {
      // Redirect to join page if no valid facilitator access
      navigate('/join');
      return;
    }
    
    // Auto-redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      navigate('/facilitator/dashboard');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLogout = () => {
    RoleService.clearRoleContext();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <GlassPanel className="p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-space-purple/5 to-transparent" />
          <div className="relative z-10 text-center">
            <h1 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-space-purple to-space-cyan mb-6">
              Facilitator Access
            </h1>
            
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-space-purple/20 to-space-purple/10 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <svg 
                  className="w-12 h-12 text-space-purple" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">
                  Access granted!
                </p>
                <p className="text-sm text-space-text-secondary">
                  Redirecting to your dashboard...
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/facilitator/dashboard')}
                className="min-w-[200px]"
              >
                Go to Dashboard →
              </Button>
              
              <div className="pt-4">
                <button
                  onClick={handleLogout}
                  className="text-sm text-space-text-secondary hover:text-space-purple transition-colors font-orbitron"
                >
                  Use Different Code
                </button>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};