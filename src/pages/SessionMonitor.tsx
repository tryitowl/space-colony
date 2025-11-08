import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameProvider } from '../contexts/GameContext';
import { GameControlPanel } from '../components/facilitator/GameControlPanel';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { ArrowLeft, Users, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { GameService } from '../services/GameService';
import type { GameSession } from '../types';

const SessionMonitorContent: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;

      try {
        setLoading(true);
        const sessionData = await GameService.getSession(sessionId);
        if (sessionData) {
          setSession(sessionData);
        } else {
          setError('Session not found');
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Subscribe to session updates
    const unsubscribe = GameService.subscribeToSession(sessionId!, (updatedSession) => {
      setSession(updatedSession);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <GlassPanel className="p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-space-cyan"></div>
            <span className="text-space-text-secondary">Loading session data...</span>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <GlassPanel className="p-8" variant="danger">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-red-400">{error || 'Session not found'}</span>
          </div>
          <Button onClick={() => navigate('/facilitator')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </GlassPanel>
      </div>
    );
  }

  const activeTeams = session.teams.filter(team => !team.eliminationStatus.isEliminated);
  const eliminatedTeams = session.teams.filter(team => team.eliminationStatus.isEliminated);
  const criticalTeams = activeTeams.filter(team => team.eliminationStatus.criticalResources.length > 0);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/facilitator')}
                  variant="secondary"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-orbitron font-bold text-space-cyan">
                    {session.name}
                  </h1>
                  <p className="text-space-text-secondary">
                    Session Code: {session.code} • Event: {session.eventId}
                  </p>
                </div>
              </div>
              <StatusIndicator
                status={session.isActive ? 'online' : 'offline'}
                size="lg"
              />
            </div>
          </GlassPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Control Panel */}
          <div className="lg:col-span-1">
            <GameControlPanel />
          </div>

          {/* Session Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <GlassPanel className="p-4 text-center">
                <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{activeTeams.length}</div>
                <div className="text-sm text-gray-400">Active Teams</div>
              </GlassPanel>

              <GlassPanel className="p-4 text-center">
                <Activity className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{session.currentRound || 0}</div>
                <div className="text-sm text-gray-400">Current Round</div>
              </GlassPanel>

              <GlassPanel className="p-4 text-center">
                <AlertCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{criticalTeams.length}</div>
                <div className="text-sm text-gray-400">Critical Teams</div>
              </GlassPanel>

              <GlassPanel className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{eliminatedTeams.length}</div>
                <div className="text-sm text-gray-400">Eliminated</div>
              </GlassPanel>
            </div>

            {/* Teams Overview */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-bold mb-4 text-space-cyan">Teams Status</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {session.teams.map((team) => (
                  <div 
                    key={team.id}
                    className={`p-4 rounded-lg border ${
                      team.eliminationStatus.isEliminated 
                        ? 'bg-red-900/20 border-red-500/30' 
                        : team.eliminationStatus.criticalResources.length > 0
                        ? 'bg-yellow-900/20 border-yellow-500/30'
                        : 'bg-slate-800/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIndicator 
                          status={
                            team.eliminationStatus.isEliminated ? 'offline' :
                            team.eliminationStatus.criticalResources.length > 0 ? 'away' : 'online'
                          }
                        />
                        <div>
                          <div className="font-semibold">{team.name}</div>
                          <div className="text-sm text-gray-400 capitalize">
                            {team.type.replace('_', ' ')} Colony
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{team.gameCode}</Badge>
                        {team.eliminationStatus.criticalResources.length > 0 && (
                          <Badge variant="warning">
                            Critical: {team.eliminationStatus.criticalResources.join(', ')}
                          </Badge>
                        )}
                        {team.eliminationStatus.isEliminated && (
                          <Badge variant="danger">
                            Eliminated Round {team.eliminationStatus.roundsInCritical}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Resource Bars */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {(['oxygen', 'food', 'water', 'energy'] as const).map((resource) => {
                        const value = team.resources[resource];
                        const percentage = Math.min(100, (value / 20) * 100);
                        const isLow = value <= 5;
                        const isCritical = value <= 0;
                        
                        return (
                          <div key={resource} className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="capitalize">{resource}</span>
                              <span className={isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : ''}>
                                {value}
                              </span>
                            </div>
                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            {/* Game Codes Reference */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-bold mb-4 text-space-cyan">Quick Reference</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {session.teams.map((team) => (
                  <div key={team.gameCode} className="bg-slate-800/50 p-3 rounded-lg">
                    <div className="font-mono font-bold text-cyan-400">{team.gameCode}</div>
                    <div className="text-xs text-gray-400">{team.name}</div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SessionMonitor: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return <div>No session ID provided</div>;
  }

  return (
    <GameProvider sessionId={sessionId}>
      <SessionMonitorContent />
    </GameProvider>
  );
};