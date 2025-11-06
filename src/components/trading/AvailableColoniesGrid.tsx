import React, { useEffect, useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import type { Colony } from '../../types';
import { TradingService } from '../../services/tradingService';
import { cn } from '../../utils/cn';

interface AvailableColoniesGridProps {
  sessionId: string;
  currentTeamId: string;
  onSelectColony: (colony: Colony) => void;
  availableColonies: Colony[];
}

export const AvailableColoniesGrid: React.FC<AvailableColoniesGridProps> = ({
  sessionId,
  currentTeamId,
  onSelectColony,
  availableColonies
}) => {
  const [tradingStatus, setTradingStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    // Subscribe to real-time trading status
    const unsubscribe = TradingService.subscribeToTradingStatus(
      sessionId,
      setTradingStatus
    );

    return unsubscribe;
  }, [sessionId]);

  const getColonyIcon = (colonyType: string): string => {
    const icons = {
      mining: '⛏️',
      agricultural: '🌱',
      research: '🔬',
      trade_hub: '🏪',
      military: '🛡️',
      manufacturing: '🏭'
    };
    return icons[colonyType as keyof typeof icons] || '🚀';
  };

  const getStatusColor = (teamId: string): string => {
    const status = tradingStatus[teamId] || 'available';
    switch (status) {
      case 'available':
        return 'border-space-success text-space-success';
      case 'busy':
        return 'border-space-warning text-space-warning';
      case 'offline':
        return 'border-space-danger text-space-danger';
      default:
        return 'border-gray-500 text-gray-500';
    }
  };

  const getStatusText = (teamId: string): string => {
    const status = tradingStatus[teamId] || 'available';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredColonies = availableColonies.filter(colony => 
    colony.id !== currentTeamId && !colony.eliminationStatus.isEliminated
  );

  return (
    <GlassPanel className="p-6">
      <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
        Available Trading Partners
      </h2>
      
      {filteredColonies.length === 0 ? (
        <div className="text-center text-space-text-secondary py-8">
          <p>No trading partners available at the moment</p>
          <p className="text-sm mt-2">Check back soon or wait for other teams to become available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredColonies.map((colony) => {
            const isAvailable = tradingStatus[colony.id] === 'available' || !tradingStatus[colony.id];
            const statusColor = getStatusColor(colony.id);
            
            return (
              <GlassPanel
                key={colony.id}
                className={cn(
                  "p-4 transition-all duration-200 cursor-pointer hover:scale-105",
                  isAvailable 
                    ? "hover:border-space-cyan/50 hover:shadow-lg hover:shadow-space-cyan/20" 
                    : "opacity-60 cursor-not-allowed"
                )}
                onClick={() => isAvailable && onSelectColony(colony)}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {getColonyIcon(colony.type)}
                  </div>
                  
                  <h3 className="font-semibold text-white mb-1">
                    {colony.name}
                  </h3>
                  
                  <div className={cn("text-sm mb-3 font-medium", statusColor)}>
                    ● {getStatusText(colony.id)}
                  </div>

                  <div className="text-xs text-space-text-secondary mb-3">
                    <div>Players: {colony.players.filter(p => p.isOnline).length}/{colony.players.length}</div>
                    <div>Type: {colony.type.replace('_', ' ')}</div>
                  </div>

                  {/* Resource preview */}
                  <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                    <div className="flex justify-between">
                      <span>🫁</span>
                      <span>{colony.resources.oxygen}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🍎</span>
                      <span>{colony.resources.food}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>💧</span>
                      <span>{colony.resources.water}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⚡</span>
                      <span>{colony.resources.energy}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!isAvailable}
                    variant={isAvailable ? "primary" : "glass"}
                  >
                    {isAvailable ? "Initiate Trade" : "Unavailable"}
                  </Button>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-xs text-space-text-secondary">
        <p>● Available: Ready to trade</p>
        <p>● Busy: Currently in negotiation</p>
        <p>● Offline: Team disconnected</p>
      </div>
    </GlassPanel>
  );
};