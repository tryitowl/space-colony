import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ResourceDisplay } from '../components/ui/ResourceDisplay';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AvailableColoniesGrid } from '../components/trading/AvailableColoniesGrid';
import { TradingModal } from '../components/trading/TradingModal';
import { TradeNotifications } from '../components/trading/TradeNotifications';
import { GameProvider, useGame } from '../contexts/GameContext';
import type { Colony } from '../types';

const DashboardContent: React.FC = () => {
  const { state } = useGame();
  const { sessionId, teamId } = useParams<{ sessionId: string; teamId: string }>();
  const navigate = useNavigate();
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [selectedTradeTarget, setSelectedTradeTarget] = useState<Colony | null>(null);
  const [showTradingGrid, setShowTradingGrid] = useState(false);

  // Redirect to investment phase if game state is 'investments'
  useEffect(() => {
    if (state.session?.gameState === 'investments' && sessionId && teamId) {
      navigate(`/investment/${sessionId}/${teamId}`);
    }
  }, [state.session?.gameState, sessionId, teamId, navigate]);

  const handleColonySelect = (colony: Colony) => {
    setSelectedTradeTarget(colony);
    setShowTradingModal(true);
    setShowTradingGrid(false);
  };

  const handleTradeCreated = () => {
    setShowTradingModal(false);
    setSelectedTradeTarget(null);
  };


  const getColonyTypeIcon = (type: string): string => {
    const icons = {
      mining: '⛏️',
      agricultural: '🌱',
      research: '🔬',
      trade_hub: '🏪',
      military: '🛡️',
      manufacturing: '🏭'
    };
    return icons[type as keyof typeof icons] || '🚀';
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassPanel className="p-8 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-lg">Loading colony data...</p>
          <p className="text-sm text-space-text-secondary mt-2">Connecting to space command...</p>
        </GlassPanel>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassPanel className="p-8 text-center max-w-md" variant="danger">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-4">Connection Error</h2>
          <p className="text-space-text-secondary mb-4">{state.error}</p>
          <Button onClick={() => window.location.reload()}>
            Reconnect
          </Button>
        </GlassPanel>
      </div>
    );
  }

  if (!state.session || !state.currentTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassPanel className="p-8 text-center" variant="danger">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold mb-4">Colony Not Found</h2>
          <p className="text-space-text-secondary">Unable to locate your colony. Please check your game code.</p>
        </GlassPanel>
      </div>
    );
  }

  const { session, currentTeam } = state;
  const survivalRounds = Math.min(
    Math.floor(currentTeam.resources.oxygen / 2),
    Math.floor(currentTeam.resources.food / 2),
    Math.floor(currentTeam.resources.water / 1),
    Math.floor(currentTeam.resources.energy / 3)
  );

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="mb-6">
        <GlassPanel className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">{getColonyTypeIcon(currentTeam.type)}</div>
              <div>
                <h1 className="text-2xl font-orbitron font-bold text-space-cyan">
                  {currentTeam.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-space-text-secondary">
                    Round {session.currentRound + 1} • {session.gameState.replace('_', ' ').toUpperCase()}
                  </span>
                  <StatusIndicator 
                    status={state.connected ? 'online' : 'offline'} 
                    size="sm"
                  />
                  <span className="text-space-text-secondary">
                    {state.connected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-space-success mb-1">
                💰 {currentTeam.resources.credits.toLocaleString()}
              </div>
              <div className="text-sm text-space-text-secondary mb-2">
                Game Code: <span className="font-mono">{currentTeam.gameCode}</span>
              </div>
              <div className={`text-sm font-medium ${
                survivalRounds < 3 ? 'text-space-danger' : 
                survivalRounds < 5 ? 'text-space-warning' : 'text-space-success'
              }`}>
                Survival: {survivalRounds} rounds
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resources Panel */}
        <div className="lg:col-span-2">
          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              Colony Resources
            </h2>
            
            {/* Critical Resources Warning */}
            {survivalRounds < 3 && (
              <div className="mb-6">
                <GlassPanel className="p-4 animate-pulse-glow" variant="danger">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-bold text-space-danger">CRITICAL RESOURCE SHORTAGE</h3>
                      <p className="text-sm">Your colony will be eliminated in {survivalRounds} round{survivalRounds !== 1 ? 's' : ''} without immediate action!</p>
                    </div>
                  </div>
                </GlassPanel>
              </div>
            )}
            
            {/* Basic Resources */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-space-text-secondary">
                Essential Life Support (Consumed Each Round)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ResourceDisplay
                  resource={{
                    type: 'oxygen',
                    amount: currentTeam.resources.oxygen,
                    capacity: Math.max(20, currentTeam.resources.oxygen)
                  }}
                  critical={currentTeam.resources.oxygen <= 0}
                />
                <ResourceDisplay
                  resource={{
                    type: 'food',
                    amount: currentTeam.resources.food,
                    capacity: Math.max(20, currentTeam.resources.food)
                  }}
                  critical={currentTeam.resources.food <= 0}
                />
                <ResourceDisplay
                  resource={{
                    type: 'water',
                    amount: currentTeam.resources.water,
                    capacity: Math.max(15, currentTeam.resources.water)
                  }}
                  critical={currentTeam.resources.water <= 0}
                />
                <ResourceDisplay
                  resource={{
                    type: 'energy',
                    amount: currentTeam.resources.energy,
                    capacity: Math.max(15, currentTeam.resources.energy)
                  }}
                  critical={currentTeam.resources.energy <= 0}
                />
              </div>
              
              <div className="mt-3 text-xs text-space-text-secondary">
                <p>💀 Consumption per round: Oxygen (-2), Food (-2), Water (-1), Energy (-3)</p>
              </div>
            </div>

            {/* Advanced Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-space-text-secondary">
                Advanced Materials & Assets
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ResourceDisplay
                  resource={{
                    type: 'minerals',
                    amount: currentTeam.resources.minerals
                  }}
                />
                <ResourceDisplay
                  resource={{
                    type: 'alloys',
                    amount: currentTeam.resources.alloys
                  }}
                />
                <ResourceDisplay
                  resource={{
                    type: 'techComponents',
                    amount: currentTeam.resources.techComponents
                  }}
                />
                <ResourceDisplay
                  resource={{
                    type: 'defenseContracts',
                    amount: currentTeam.resources.defenseContracts
                  }}
                />
                <ResourceDisplay
                  resource={{
                    type: 'techPatents',
                    amount: currentTeam.resources.techPatents
                  }}
                />
                <ResourceDisplay
                  resource={{
                    type: 'alienTech',
                    amount: currentTeam.resources.alienTech
                  }}
                />
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Trading Panel */}
          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              Space Trading Hub
            </h2>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowTradingGrid(!showTradingGrid)}
              >
                {showTradingGrid ? '🔍 Hide Partners' : '🚀 Find Trading Partners'}
              </Button>
              <Button variant="glass" className="w-full">
                📊 View Trade History
              </Button>
              {state.incomingTrades.length > 0 && (
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-space-warning animate-pulse">
                    <span className="text-lg">📥</span>
                    <span className="font-medium">
                      {state.incomingTrades.length} Incoming Trade{state.incomingTrades.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Status Panel */}
          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              Colony Status Report
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Trading Status:</span>
                <div className="flex items-center space-x-2">
                  <StatusIndicator 
                    status={
                      state.tradingStatus[currentTeam.id] === 'available' ? 'online' :
                      state.tradingStatus[currentTeam.id] === 'busy' ? 'busy' : 'offline'
                    }
                    size="sm"
                  />
                  <span className={
                    state.tradingStatus[currentTeam.id] === 'available' ? 'text-space-success' :
                    state.tradingStatus[currentTeam.id] === 'busy' ? 'text-space-warning' :
                    'text-space-danger'
                  }>
                    {(state.tradingStatus[currentTeam.id] || 'available').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Elimination Risk:</span>
                <span className={
                  currentTeam.eliminationStatus.roundsInCritical > 0 ? 'text-space-danger' : 'text-space-success'
                }>
                  {currentTeam.eliminationStatus.roundsInCritical > 0 ? 
                    `${currentTeam.eliminationStatus.roundsInCritical}/2 Rounds` : 
                    'Secure'
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Online Crew:</span>
                <span className="text-space-cyan">
                  {currentTeam.players.filter(p => p.isOnline).length} / {currentTeam.players.length}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Resource Diversity:</span>
                  <span>75%</span>
                </div>
                <ProgressBar value={75} variant="success" size="sm" />
              </div>
            </div>
          </GlassPanel>

          {/* Intel Panel */}
          <GlassPanel className="p-6">
            <h2 className="text-xl font-bold mb-4 font-orbitron text-space-cyan">
              Intelligence Network
            </h2>
            <div className="text-space-text-secondary text-sm space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🛰️</span>
                <span>Scout Network: {currentTeam.investments.scouts > 0 ? 'Active' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">📡</span>
                <span>Comms Array: {currentTeam.investments.communicationArray > 0 ? 'Online' : 'Offline'}</span>
              </div>
              <p className="mt-3 text-xs">
                Intel reports will appear here when generated from your scout investments and communication networks.
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Trade Notifications */}
      {state.incomingTrades.length > 0 && (
        <div className="mt-6">
          <TradeNotifications
            sessionId={session.id}
            teamId={currentTeam.id}
            currentTeam={currentTeam}
            onTradeAction={handleTradeCreated}
          />
        </div>
      )}

      {/* Trading Grid */}
      {showTradingGrid && session && (
        <div className="mt-6">
          <AvailableColoniesGrid
            sessionId={session.id}
            currentTeamId={currentTeam.id}
            availableColonies={session.teams}
            onSelectColony={handleColonySelect}
          />
        </div>
      )}

      {/* Trading Modal */}
      {showTradingModal && selectedTradeTarget && (
        <TradingModal
          isOpen={showTradingModal}
          onClose={() => {
            setShowTradingModal(false);
            setSelectedTradeTarget(null);
          }}
          sessionId={session.id}
          currentTeam={currentTeam}
          targetTeam={selectedTradeTarget}
          onTradeCreated={handleTradeCreated}
        />
      )}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { sessionId, teamId } = useParams<{
    sessionId: string;
    teamId: string;
  }>();

  return (
    <GameProvider sessionId={sessionId} teamId={teamId}>
      <DashboardContent />
    </GameProvider>
  );
};