import React from 'react';
import { GlassPanel } from '../components/ui/GlassPanel';

export const TestFacilitator: React.FC = () => {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <GlassPanel className="p-6">
          <h1 className="text-3xl font-orbitron font-bold text-space-cyan mb-4">
            🎮 Facilitator Dashboard
          </h1>
          <p className="text-space-text-secondary">
            This is a test facilitator page to verify routing is working.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
};