import React, { useState } from 'react';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { ModernLayout } from '../components/ui/ModernLayout';

export const SimpleFacilitator: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [gameCodesGenerated, setGameCodesGenerated] = useState(false);

  const handleCreateTestSession = () => {
    setIsCreating(true);
    setMessage('Creating test session...');
    
    // Simulate session creation
    setTimeout(() => {
      setIsCreating(false);
      setGameCodesGenerated(true);
      setMessage('🎉 Test session created successfully!');
    }, 2000);
  };

  return (
    <ModernLayout variant="dashboard" className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl animate-pulse">🎮</div>
              <h1 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-space-purple to-space-cyan">
                FACILITATOR DASHBOARD
              </h1>
            </div>
            <p className="text-space-text-secondary">
              Create and manage Space Colony Exchange events
            </p>
          </GlassPanel>
        </div>

        {/* Quick Test Session */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              Quick Test Session
            </h2>
            
            <div className="space-y-4">
              <p className="text-space-text-secondary text-sm">
                Create a demo session with 12 teams ready for testing
              </p>
              
              <Button
                onClick={handleCreateTestSession}
                loading={isCreating}
                className="w-full"
                size="lg"
              >
                🚀 Create Test Session
              </Button>
              
              {message && (
                <div className={`mt-4 p-4 rounded-xl backdrop-blur-sm ${gameCodesGenerated ? 'bg-green-900/30 border border-green-500/40' : 'bg-blue-900/30 border border-space-cyan/40'}`}>
                  <p className={`text-sm font-medium ${gameCodesGenerated ? 'text-green-300' : 'text-space-cyan'}`}>{message}</p>
                </div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              How to Test
            </h2>
            
            <div className="space-y-3 text-sm text-space-text-secondary">
              <div className="flex items-start space-x-2">
                <span className="text-space-cyan">1.</span>
                <span>Click "Create Test Session" to generate game codes</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-space-cyan">2.</span>
                <span>Go to the homepage and click "Join Game"</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-space-cyan">3.</span>
                <span>Enter any game code (AA01, BB02, etc.)</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-space-cyan">4.</span>
                <span>Enter your name and start playing!</span>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Sample Game Codes */}
        <div className="mt-8">
          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              Sample Game Codes
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {['AA01', 'AA02', 'BB01', 'BB02', 'CC01', 'CC02', 'DD01', 'DD02', 'EE01', 'EE02', 'FF01', 'FF02'].map((code) => (
                <div key={code} className="bg-space-panel-bg p-3 rounded border border-white/20 text-center">
                  <div className="font-mono font-bold text-space-cyan">{code}</div>
                  <div className="text-xs text-space-text-secondary">Team Code</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-green-900/30 border border-green-500/40 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-green-300 font-medium">
                ✅ You can use any of these codes to test the game right now!
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>
    </ModernLayout>
  );
};