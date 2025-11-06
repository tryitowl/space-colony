import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { ModernLayout } from '../components/ui/ModernLayout';
import { RoleService } from '../services/roleService';
import { GameEngineService } from '../services/gameEngineService';
import type { GameSession, GameEvent } from '../types';

interface SessionWithEvent extends GameSession {
  eventName?: string;
  organizationName?: string;
}

export const FacilitatorDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<SessionWithEvent[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verify facilitator access
    const context = RoleService.getRoleContext();
    
    if (!context || context.role !== 'facilitator' || !context.facilitatorAccess) {
      navigate('/join');
      return;
    }

    const { sessionIds, eventIds } = context.facilitatorAccess;
    
    // Set up listeners for assigned sessions
    const unsubscribes: (() => void)[] = [];

    // Load sessions
    sessionIds.forEach(sessionId => {
      const sessionQuery = query(
        collection(firestore, 'sessions'),
        where('id', '==', sessionId)
      );

      const unsubscribe = onSnapshot(
        sessionQuery,
        async (snapshot) => {
          if (!snapshot.empty) {
            const sessionData = snapshot.docs[0].data() as GameSession;
            
            // Try to get event info
            let eventInfo: Partial<GameEvent> = {};
            if (eventIds.includes(sessionData.eventId)) {
              try {
                const eventQuery = query(
                  collection(firestore, 'events'),
                  where('id', '==', sessionData.eventId)
                );
                const eventSnapshot = await getDocs(eventQuery);
                if (!eventSnapshot.empty) {
                  const eventData = eventSnapshot.docs[0].data() as GameEvent;
                  eventInfo = {
                    name: eventData.name,
                    organizationName: eventData.organizationName
                  };
                }
              } catch (err) {
                console.error('Error fetching event info:', err);
              }
            }

            setSessions(prev => {
              const filtered = prev.filter(s => s.id !== sessionId);
              return [...filtered, {
                ...sessionData,
                eventName: eventInfo.name,
                organizationName: eventInfo.organizationName
              }];
            });
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('Error loading session:', err);
          setError('Failed to load session data');
          setIsLoading(false);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [navigate]);

  const handleStartGame = async (sessionId: string) => {
    try {
      await (GameEngineService as any).startGame?.(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    }
  };

  const handlePauseGame = async (sessionId: string) => {
    try {
      await (GameEngineService as any).pauseRound?.(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause game');
    }
  };

  const handleResumeGame = async (sessionId: string) => {
    try {
      await (GameEngineService as any).resumeRound?.(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume game');
    }
  };

  const handleLogout = () => {
    RoleService.clearRoleContext();
    navigate('/');
  };

  const getSessionStatus = (session: GameSession): 'online' | 'busy' | 'offline' => {
    if (session.gameState === 'completed') return 'offline';
    if (session.gameState === 'setup') return 'busy';
    return 'online';
  };

  const getActiveTeamsCount = (session: GameSession): number => {
    return session.teams.filter(team => 
      team.players.some(p => p.isOnline)
    ).length;
  };

  if (isLoading) {
    return (
      <ModernLayout variant="dashboard" className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-space-purple mx-auto mb-4"></div>
          <p className="text-space-text-secondary">Loading sessions...</p>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout variant="dashboard" className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl animate-pulse">🎮</div>
              <h1 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-space-purple to-space-cyan">
                FACILITATOR DASHBOARD
              </h1>
            </div>
            <p className="text-space-text-secondary">
              Manage your assigned game sessions
            </p>
          </div>
          <Button variant="glass" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/40 rounded-xl backdrop-blur-sm text-red-300">
            {error}
          </div>
        )}

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {sessions.map((session) => (
            <GlassPanel
              key={session.id}
              className={`p-6 cursor-pointer transition-all ${
                selectedSession === session.id ? 'ring-2 ring-space-purple' : ''
              }`}
              onClick={() => setSelectedSession(session.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-orbitron font-bold text-white mb-1">
                    {session.name}
                  </h3>
                  {session.eventName && (
                    <p className="text-sm text-space-text-secondary">
                      {session.eventName}
                    </p>
                  )}
                  {session.organizationName && (
                    <p className="text-xs text-space-text-secondary">
                      {session.organizationName}
                    </p>
                  )}
                </div>
                <StatusIndicator status={getSessionStatus(session)} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded p-3">
                  <p className="text-xs text-space-text-secondary mb-1">Status</p>
                  <p className="font-medium">{session.gameState}</p>
                </div>
                <div className="bg-black/30 rounded p-3">
                  <p className="text-xs text-space-text-secondary mb-1">Active Teams</p>
                  <p className="font-medium">{getActiveTeamsCount(session)} / {session.teams.length}</p>
                </div>
              </div>

              {/* Game Controls */}
              <div className="flex gap-2">
                {session.gameState === 'setup' && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartGame(session.id);
                    }}
                  >
                    Start Game
                  </Button>
                )}
                {session.gameState !== 'setup' && session.gameState !== 'completed' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePauseGame(session.id);
                      }}
                    >
                      Pause
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResumeGame(session.id);
                      }}
                    >
                      Resume
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="glass"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/facilitator/session/${session.id}`);
                  }}
                >
                  View Details
                </Button>
              </div>
            </GlassPanel>
          ))}
        </div>

        {sessions.length === 0 && (
          <GlassPanel className="p-8 text-center">
            <p className="text-space-text-secondary mb-4">
              No sessions assigned to your facilitator code.
            </p>
            <p className="text-sm text-space-text-secondary">
              Please contact your administrator if you believe this is an error.
            </p>
          </GlassPanel>
        )}

        {/* Selected Session Details */}
        {selectedSession && (
          <GlassPanel className="p-6">
            <h3 className="text-lg font-orbitron font-bold mb-4">
              Session Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/30 rounded p-4">
                <p className="text-sm text-space-text-secondary mb-2">Total Trades</p>
                <p className="text-2xl font-bold text-space-cyan">-</p>
              </div>
              <div className="bg-black/30 rounded p-4">
                <p className="text-sm text-space-text-secondary mb-2">Active Players</p>
                <p className="text-2xl font-bold text-space-green">-</p>
              </div>
              <div className="bg-black/30 rounded p-4">
                <p className="text-sm text-space-text-secondary mb-2">Time Elapsed</p>
                <p className="text-2xl font-bold text-space-purple">-</p>
              </div>
            </div>
          </GlassPanel>
        )}
      </div>
    </ModernLayout>
  );
};