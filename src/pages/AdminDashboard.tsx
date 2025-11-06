import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { ModernLayout } from '../components/ui/ModernLayout';
import { AdminAuthService } from '../services/adminAuthService';
import { GameService } from '../services/gameService';
import { RoleService } from '../services/roleService';
import { AIConfiguration } from '../components/admin/AIConfiguration';
import { GalaxyManagementDashboard } from '../components/admin/GalaxyManagementDashboard';
import type { AIColonyConfig } from '../types/ai.types';

interface CreatedSession {
  sessionId: string;
  name: string;
  eventId: string;
  facilitatorCode: string;
  teams: Array<{ gameCode: string; colonyType: string; name: string }>;
  aiConfigs?: AIColonyConfig[];
  createdAt: number;
}

export const AdminDashboard: React.FC = () => {
  const [eventName, setEventName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdSessions, setCreatedSessions] = useState<CreatedSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState<string | null>(null);
  const [aiConfigs, setAiConfigs] = useState<AIColonyConfig[]>([]);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [selectedSessionForGalaxyView, setSelectedSessionForGalaxyView] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check admin authentication
    if (!AdminAuthService.isAdmin()) {
      navigate('/admin/login');
      return;
    }
  }, [navigate]);

  const handleLogout = async () => {
    await AdminAuthService.adminLogout();
    navigate('/admin/login');
  };

  const generateFacilitatorCode = (): string => {
    // Generate a special facilitator code: FAC + random 3 digits
    return `FAC${Math.floor(100 + Math.random() * 900)}`;
  };

  const handleCreateEvent = async () => {
    if (!eventName || !organizationName) return;
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Create event with admin authentication
      const eventId = await GameService.createEvent(
        eventName,
        organizationName,
        'team-building', // Default event type
        20, // Default participants
        'Demo event created from admin dashboard'
      );
      
      // Create initial session with AI configuration
      const sessionId = await GameService.createSessionWithAI(
        eventId,
        sessionName || 'Session 1',
        'admin_user',
        aiConfigs || []
      );
      
      // Generate facilitator code
      const facilitatorCode = generateFacilitatorCode();
      
      // Create facilitator access in Firestore
      await RoleService.createFacilitatorAccess(facilitatorCode, eventId, sessionId);
      
      // Get session data to show game codes
      const sessionData = await GameService.getSession(sessionId);
      if (sessionData) {
        const newSession: CreatedSession = {
          sessionId,
          name: sessionData.name,
          eventId: sessionData.eventId,
          facilitatorCode,
          teams: sessionData.teams.map(team => ({
            gameCode: team.gameCode,
            colonyType: team.type,
            name: team.name
          })),
          aiConfigs: aiConfigs || [],
          createdAt: Date.now()
        };
        
        setCreatedSessions(prev => [newSession, ...prev]);
      }
      
      // Reset form
      setEventName('');
      setOrganizationName('');
      setSessionName('');
    } catch (error) {
      console.error('Failed to create event:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateQuickDemo = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const eventId = await GameService.createEvent(
        'Demo Event',
        'Test Organization',
        'team-building', // Default event type
        20, // Default participants
        'Quick demo event'
      );
      
      const sessionId = await GameService.createSession(
        eventId,
        'Demo Session',
        'admin_user'
      );
      
      const facilitatorCode = generateFacilitatorCode();
      
      const sessionData = await GameService.getSession(sessionId);
      if (sessionData) {
        const newSession: CreatedSession = {
          sessionId,
          name: sessionData.name,
          eventId: sessionData.eventId,
          facilitatorCode,
          teams: sessionData.teams.map(team => ({
            gameCode: team.gameCode,
            colonyType: team.type,
            name: team.name
          })),
          aiConfigs: aiConfigs || [],
          createdAt: Date.now()
        };
        
        setCreatedSessions(prev => [newSession, ...prev]);
        setShowSessionDetails(sessionId);
      }
    } catch (error) {
      console.error('Failed to create demo session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create demo session');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ModernLayout variant="dashboard" className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <GlassPanel className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-4xl animate-pulse">🛡️</div>
                  <h1 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-space-gold to-space-cyan">
                    ADMIN DASHBOARD
                  </h1>
                </div>
                <p className="text-space-text-secondary">
                  Space Colony Exchange Administration
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => navigate('/')}
                  variant="glass"
                  size="sm"
                >
                  View Game
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="danger"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Event Panel */}
          <div>
            <GlassPanel className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold font-orbitron text-space-cyan mb-2">
                  Create New Event
                </h2>
                <p className="text-sm text-space-text-secondary">
                  Set up a new corporate training session
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleCreateEvent(); }}>
                <div>
                  <label className="block text-sm font-medium text-space-text-secondary mb-2 font-orbitron">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g., Q1 Leadership Summit"
                    className="w-full px-4 py-3 bg-space-black/50 border border-white/20 rounded-xl text-white placeholder-space-text-secondary/60 focus:border-space-cyan focus:outline-none focus:ring-2 focus:ring-space-cyan/30 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-space-text-secondary mb-2 font-orbitron">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Company or organization name"
                    className="w-full px-4 py-3 bg-space-black/50 border border-white/20 rounded-xl text-white placeholder-space-text-secondary/60 focus:border-space-cyan focus:outline-none focus:ring-2 focus:ring-space-cyan/30 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-space-text-secondary mb-2 font-orbitron">
                    Session Name <span className="text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Session 1"
                    className="w-full px-4 py-3 bg-space-black/50 border border-white/20 rounded-xl text-white placeholder-space-text-secondary/60 focus:border-space-cyan focus:outline-none focus:ring-2 focus:ring-space-cyan/30 transition-all duration-300"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    onClick={() => setShowAIConfig(!showAIConfig)}
                    variant="glass"
                    size="sm"
                    className="mb-4"
                  >
                    🤖 {showAIConfig ? 'Hide' : 'Configure'} AI Players
                  </Button>
                  
                  <Button
                    type="submit"
                    loading={isCreating}
                    disabled={!eventName || !organizationName}
                    size="lg"
                    className="w-full"
                  >
                    🚀 Create Event & Session
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </div>

          {/* Quick Actions & Info */}
          <div className="space-y-6">
            {/* Quick Demo */}
            <GlassPanel className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold font-orbitron text-space-purple mb-2">
                  Quick Demo
                </h2>
                <p className="text-sm text-space-text-secondary">
                  Instantly create a test session
                </p>
              </div>
              
              <Button
                onClick={handleCreateQuickDemo}
                loading={isCreating}
                size="lg"
                variant="secondary"
                className="mb-4"
              >
                ⚡ Create Demo Session
              </Button>
              
              <div className="p-4 bg-space-black/30 rounded-lg border border-white/10">
                <p className="text-sm font-medium text-space-text-secondary mb-2">
                  Demo session includes:
                </p>
                <ul className="space-y-1.5 text-xs text-space-text-secondary/80">
                  <li className="flex items-start">
                    <span className="text-space-cyan mr-2">✓</span>
                    <span>12 teams (6 colony types × 2 teams each)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-space-cyan mr-2">✓</span>
                    <span>Unique game codes for players</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-space-cyan mr-2">✓</span>
                    <span>Facilitator access code</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-space-cyan mr-2">✓</span>
                    <span>Ready for immediate testing</span>
                  </li>
                </ul>
              </div>
            </GlassPanel>

            {/* System Status */}
            <GlassPanel className="p-6">
              <h3 className="text-lg font-bold font-orbitron text-space-gold mb-4">
                System Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-space-black/30 rounded-lg">
                  <span className="text-sm text-space-text-secondary">Firebase</span>
                  <StatusIndicator status="online" size="sm" />
                </div>
                <div className="flex items-center justify-between p-3 bg-space-black/30 rounded-lg">
                  <span className="text-sm text-space-text-secondary">Admin Mode</span>
                  <StatusIndicator status="online" size="sm" />
                </div>
                <div className="flex items-center justify-between p-3 bg-space-black/30 rounded-lg">
                  <span className="text-sm text-space-text-secondary">Sessions Active</span>
                  <span className="text-sm font-mono text-space-cyan">{createdSessions.length}</span>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>

        {/* AI Configuration Section */}
        {showAIConfig && (
          <div className="mt-6">
            <AIConfiguration
              onConfigChange={setAiConfigs}
              initialConfigs={aiConfigs}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6">
            <GlassPanel className="p-4" variant="danger">
              <div className="flex items-center space-x-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold">Error</h3>
                  <p className="text-sm">{error}</p>
                </div>
                <Button size="sm" variant="glass" onClick={() => setError(null)}>
                  ✕
                </Button>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* Active Sessions */}
        {createdSessions.length > 0 && (
          <div className="mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-space-cyan to-space-purple">
                Active Sessions
              </h2>
              <p className="text-sm text-space-text-secondary mt-1">
                {createdSessions.length} session{createdSessions.length !== 1 ? 's' : ''} created
              </p>
            </div>
            
            <div className="space-y-6">
              {createdSessions.map((session) => (
                <GlassPanel key={session.sessionId} className="p-6 relative overflow-hidden" variant="active">
                  <div className="absolute inset-0 bg-gradient-to-br from-space-cyan/5 to-transparent" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          <StatusIndicator status="online" size="md" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold font-orbitron text-white mb-1">{session.name}</h3>
                          <div className="space-y-1">
                            <p className="text-xs text-space-text-secondary font-mono">
                              ID: {session.sessionId}
                            </p>
                            <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-space-purple/20 rounded-lg border border-space-purple/30">
                              <span className="text-xs text-space-text-secondary">Facilitator:</span>
                              <span className="font-mono font-bold text-space-purple">{session.facilitatorCode}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedSessionForGalaxyView(session.sessionId)}
                        >
                          Galaxy Manager
                        </Button>
                        <Button 
                          size="sm" 
                          variant="glass"
                          onClick={() => setShowSessionDetails(
                            showSessionDetails === session.sessionId ? null : session.sessionId
                          )}
                          className="min-w-[100px]"
                        >
                          {showSessionDetails === session.sessionId ? '▲ Hide' : '▼ Show'} Details
                        </Button>
                      </div>
                    </div>

                    {/* Session Details */}
                    {showSessionDetails === session.sessionId && (
                      <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Facilitator Instructions */}
                          <div className="p-4 bg-gradient-to-br from-space-purple/10 to-transparent rounded-xl border border-space-purple/20">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">🎮</span>
                              <h4 className="font-bold text-space-purple font-orbitron">For Facilitators</h4>
                            </div>
                            <ol className="text-sm space-y-2 text-space-text-secondary">
                              <li className="flex items-start">
                                <span className="text-space-purple mr-2 font-bold">1.</span>
                                <span>Go to the homepage</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-space-purple mr-2 font-bold">2.</span>
                                <span>Click "Join Game"</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-space-purple mr-2 font-bold">3.</span>
                                <span>Enter code: <code className="font-mono text-space-purple bg-space-black/50 px-1.5 py-0.5 rounded">{session.facilitatorCode}</code></span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-space-purple mr-2 font-bold">4.</span>
                                <span>Access management tools</span>
                              </li>
                            </ol>
                          </div>

                          {/* Player Instructions */}
                          <div className="p-4 bg-gradient-to-br from-space-cyan/10 to-transparent rounded-xl border border-space-cyan/20">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">🚀</span>
                              <h4 className="font-bold text-space-cyan font-orbitron">For Players</h4>
                            </div>
                            <ol className="text-sm space-y-2 text-space-text-secondary">
                              <li className="flex items-start">
                                <span className="text-space-cyan mr-2 font-bold">1.</span>
                                <span>Go to the homepage</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-space-cyan mr-2 font-bold">2.</span>
                                <span>Click "Join Game"</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-space-cyan mr-2 font-bold">3.</span>
                                <span>Enter any team code below</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-space-cyan mr-2 font-bold">4.</span>
                                <span>Start your mission!</span>
                              </li>
                            </ol>
                          </div>
                        </div>

                        {/* Team Game Codes */}
                        <div>
                          <h4 className="font-bold text-lg mb-4 font-orbitron text-white">
                            Team Access Codes
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {session.teams.map((team) => (
                              <div 
                                key={team.gameCode}
                                className="group relative bg-gradient-to-br from-space-black/50 to-space-black/30 p-4 rounded-xl border border-white/10 hover:border-space-cyan/30 transition-all duration-300"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-space-cyan/0 to-space-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                                <div className="relative z-10">
                                  <div className="font-mono font-bold text-space-cyan text-xl mb-1">
                                    {team.gameCode}
                                  </div>
                                  <div className="text-xs text-space-text-secondary">
                                    {team.name}
                                  </div>
                                  <div className="text-xs text-space-text-secondary/70 capitalize">
                                    {team.colonyType.replace('_', ' ')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </GlassPanel>
              ))}
            </div>
          </div>
        )}

        {/* Galaxy Management Dashboard Modal */}
        {selectedSessionForGalaxyView && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-auto">
            <div className="min-h-screen p-4">
              <div className="max-w-7xl mx-auto">
                <GalaxyManagementDashboard
                  sessionId={selectedSessionForGalaxyView}
                  onClose={() => setSelectedSessionForGalaxyView(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
};