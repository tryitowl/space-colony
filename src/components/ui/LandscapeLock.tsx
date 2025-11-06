import React, { useEffect, useState } from 'react';
import { GlassPanel } from './GlassPanel';

export const LandscapeLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && isPortraitMode);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (isPortrait) {
    return (
      <div className="landscape-lock">
        <GlassPanel className="p-8 text-center max-w-md mx-4">
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-float">📱</div>
            <h2 className="text-2xl font-orbitron font-bold text-space-cyan mb-4">
              Rotate Your Device
            </h2>
            <p className="text-space-text-secondary mb-6">
              Space Colony Exchange is optimized for landscape orientation. 
              Please rotate your device to continue.
            </p>
          </div>
          
          <div className="flex justify-center items-center space-x-4 text-space-cyan">
            <div className="w-8 h-12 border-2 border-current rounded-lg flex items-center justify-center">
              📱
            </div>
            <div className="text-2xl animate-pulse">→</div>
            <div className="w-12 h-8 border-2 border-current rounded-lg flex items-center justify-center">
              📱
            </div>
          </div>
          
          <div className="mt-6 text-xs text-space-text-secondary">
            <p>This ensures the best trading experience with full access to all game features.</p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return <>{children}</>;
};