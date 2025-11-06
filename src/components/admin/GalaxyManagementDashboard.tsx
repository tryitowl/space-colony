import React, { useState, useEffect } from 'react';
import { FlexibleGameService } from '../../services/flexibleGameService';
import { galaxyService } from '../../services/galaxyService';
import { galaxyStateService } from '../../services/galaxyStateService';
import { GlassPanel } from '../ui/GlassPanel';
import HUDFrame from '../ui/HUDFrame';
import { Button } from '../ui/Button';
import { StatusIndicator } from '../ui/StatusIndicator';
import { CircularGauge } from '../ui/CircularGauge';
import { DataVisualization } from '../ui/DataVisualization';
import type { Galaxy, EnhancedColony } from '../../types/galaxy.types';
import type { GlobalAnnouncement } from '../../services/galaxyStateService';

interface GalaxyManagementDashboardProps {
  sessionId: string;
  onClose?: () => void;
}

interface GalaxyStatistics {
  totalTeams: number;
  activeTeams: number;
  aiTeams: number;
  humanTeams: number;
  averageResources: Record<string, number>;
  topPerformers: string[];
  activeTrades: number;
  totalPlayers: number;
}

interface GalaxyData {
  galaxy: Galaxy;
  teams: EnhancedColony[];
  statistics: GalaxyStatistics;
}

export const GalaxyManagementDashboard: React.FC<GalaxyManagementDashboardProps> = ({
  sessionId,
  onClose
}) => {
  const [session, setSession] = useState<{ galaxies: Galaxy[]; totalTeams: number; totalPlayers: number } | null>(null);
  const [galaxyData, setGalaxyData] = useState<Record<string, GalaxyData>>({});
  const [selectedGalaxyId, setSelectedGalaxyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<Record<string, { roundTimer?: { remaining: number; phase: string }; activeTrades?: Record<string, unknown> }>>({});
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'info' | 'warning' | 'critical'>('info');
  const [announcementHistory, setAnnouncementHistory] = useState<GlobalAnnouncement[]>([]);
  const [showAnnouncementHistory, setShowAnnouncementHistory] = useState(false);
  const [isFlexibleSession, setIsFlexibleSession] = useState(false);

  // Load session and galaxy data
  useEffect(() => {
    checkSessionTypeAndLoad();
  }, [sessionId]);

  // Initialize galaxy states when session is loaded
  useEffect(() => {
    if (!session || !isFlexibleSession || !session.galaxies) return;
    
    const initializeStates = async () => {
      for (const galaxy of session.galaxies) {
        try {
          await galaxyStateService.initializeGalaxyState(sessionId, galaxy.id);
        } catch (err) {
          console.error(`Failed to initialize state for galaxy ${galaxy.id}:`, err);
        }
      }
    };
    
    initializeStates();
  }, [session, sessionId, isFlexibleSession]);

  // Subscribe to session updates
  useEffect(() => {
    if (!isFlexibleSession) return;
    
    const unsubscribe = FlexibleGameService.subscribeToFlexibleSession(
      sessionId,
      (updatedSession) => {
        setSession(updatedSession);
        updateGalaxyData(updatedSession);
      },
      undefined,
      (error) => setError(error.message)
    );

    return () => unsubscribe();
  }, [sessionId, isFlexibleSession]);

  // Subscribe to real-time updates for selected galaxy
  useEffect(() => {
    if (!selectedGalaxyId || !isFlexibleSession) return;

    const unsubscribe = FlexibleGameService.subscribeToGalaxyRealtimeUpdates(
      sessionId,
      selectedGalaxyId,
      (data) => {
        setRealtimeData((prev) => ({
          ...prev,
          [selectedGalaxyId]: data
        }));
      }
    );

    return () => unsubscribe();
  }, [sessionId, selectedGalaxyId, isFlexibleSession]);

  const checkSessionTypeAndLoad = async () => {
    try {
      setLoading(true);
      
      // Check if this is a flexible session
      const isFlexible = await FlexibleGameService.isFlexibleSession(sessionId);
      setIsFlexibleSession(isFlexible);
      
      if (!isFlexible) {
        setError('This dashboard requires a multi-galaxy session. Please create a flexible session with galaxy configuration.');
        setLoading(false);
        return;
      }
      
      await loadSessionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check session type');
      setLoading(false);
    }
  };

  const loadSessionData = async () => {
    try {
      const sessionData = await FlexibleGameService.getFlexibleSession(sessionId);
      if (!sessionData) throw new Error('Session not found');

      setSession(sessionData);
      await updateGalaxyData(sessionData);

      // Set initial selected galaxy
      if (sessionData.galaxies && sessionData.galaxies.length > 0) {
        setSelectedGalaxyId(sessionData.galaxies[0].id);
      }
      
      // Load announcement history
      const history = await galaxyStateService.getAnnouncementHistory(sessionId);
      setAnnouncementHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const updateGalaxyData = async (sessionData: { galaxies?: Galaxy[] }) => {
    if (!sessionData.galaxies) return;

    const newGalaxyData: Record<string, GalaxyData> = {};

    for (const galaxy of sessionData.galaxies) {
      const teamsData = await FlexibleGameService.getGalaxyTeams(sessionId, galaxy.id);
      const stats = await galaxyService.getGalaxyStatistics(galaxy.id);
      
      // Map teams to EnhancedColony type
      const teams: EnhancedColony[] = teamsData.map(team => ({
        ...team,
        galaxyId: team.galaxyId || galaxy.id,
        isAIControlled: team.isAIControlled || false
      }));
      
      // Calculate additional statistics
      const activeTrades = teams.reduce((count, team) => 
        count + (team.tradingStatus === 'available' ? 0 : 1), 0
      );
      const totalPlayers = teams.reduce((count, team) => 
        count + team.players.length, 0
      );

      newGalaxyData[galaxy.id] = {
        galaxy,
        teams,
        statistics: {
          ...stats,
          activeTrades,
          totalPlayers
        }
      };
    }

    setGalaxyData(newGalaxyData);
  };

  const handlePauseResumeGalaxy = async (galaxyId: string, pause: boolean) => {
    try {
      if (pause) {
        await galaxyStateService.pauseGalaxy(sessionId, galaxyId, 'Facilitator');
      } else {
        await galaxyStateService.resumeGalaxy(sessionId, galaxyId);
      }
      
      await loadSessionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update galaxy');
    }
  };

  const handleGlobalAnnouncement = async () => {
    if (!announcement.trim()) return;

    try {
      // Send announcement to all galaxies
      await galaxyStateService.sendGlobalAnnouncement(
        sessionId,
        announcement,
        {
          priority: announcementPriority,
          targetGalaxies: 'all',
          persistent: true,
          sentBy: 'Facilitator'
        }
      );
      setAnnouncement('');
      setShowBulkActions(false);
      
      // Reload announcement history
      const history = await galaxyStateService.getAnnouncementHistory(sessionId);
      setAnnouncementHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement');
    }
  };

  const exportGalaxyData = (galaxyId: string, format: 'csv' | 'pdf') => {
    const data = galaxyData[galaxyId];
    if (!data) return;

    // CSV Export
    if (format === 'csv') {
      const headers = ['Team Name', 'Colony Type', 'Status', 'Players', 'Water', 'Food', 'Oxygen', 'Energy', 'Minerals', 'Alloys'];
      const rows = data.teams.map(team => [
        team.name,
        team.type,
        team.eliminationStatus.isEliminated ? 'Eliminated' : 'Active',
        team.players.length,
        team.resources?.water || 0,
        team.resources?.food || 0,
        team.resources?.oxygen || 0,
        team.resources?.energy || 0,
        team.resources?.minerals || 0,
        team.resources?.alloys || 0
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `galaxy_${data.galaxy.name}_export.csv`;
      a.click();
    }
    
    // PDF would require a library like jsPDF
    if (format === 'pdf') {
      alert('PDF export would be implemented with a PDF library');
    }
  };

  const calculateGalaxyHealth = (data: GalaxyData): number => {
    const activeRatio = data.statistics.activeTeams / data.statistics.totalTeams;
    const playerRatio = data.statistics.totalPlayers / (data.statistics.totalTeams * 4); // Assuming 4 players per team ideal
    const resourceHealth = Object.values(data.statistics.averageResources).reduce((sum, val) => sum + val, 0) / 600; // Normalized
    
    return Math.round((activeRatio * 0.4 + playerRatio * 0.3 + resourceHealth * 0.3) * 100);
  };

  if (loading) {
    return (
      <HUDFrame variant="panel" color="cyan" className="p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-primary"></div>
          <span className="text-cyan-primary font-orbitron">Loading galaxy data...</span>
        </div>
      </HUDFrame>
    );
  }

  if (error) {
    return (
      <HUDFrame variant="panel" color="red" className="p-8">
        <div className="space-y-4">
          <div className="text-danger-red font-orbitron text-xl">Error: {error}</div>
          {!isFlexibleSession && (
            <div className="space-y-3">
              <p className="text-text-secondary text-sm">
                The Galaxy Management Dashboard requires a multi-galaxy session with flexible configuration.
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    // Here you would navigate to create a flexible session
                    alert('Navigate to create flexible session');
                  }}
                  variant="primary"
                  size="sm"
                >
                  Create Multi-Galaxy Session
                </Button>
                {onClose && (
                  <Button
                    onClick={onClose}
                    variant="glass"
                    size="sm"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </HUDFrame>
    );
  }

  const selectedGalaxy = selectedGalaxyId ? galaxyData[selectedGalaxyId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-primary to-purple-secondary">
              Galaxy Management Dashboard
            </h2>
            <p className="text-text-secondary mt-1">
              Managing {Object.keys(galaxyData).length} galaxies • {session?.totalTeams || 0} total teams • {session?.totalPlayers || 0} players
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowBulkActions(!showBulkActions)}
              variant="glass"
              size="sm"
            >
              Bulk Actions
            </Button>
            <Button
              onClick={() => setShowAnnouncementHistory(!showAnnouncementHistory)}
              variant="glass"
              size="sm"
            >
              Announcement History
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="glass"
                size="sm"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* Bulk Actions Panel */}
      {showBulkActions && (
        <GlassPanel className="p-6" variant="active">
          <h3 className="text-xl font-orbitron font-bold text-cyan-primary mb-4">
            Bulk Management Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Global Actions</h4>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    Object.keys(galaxyData).forEach(id => handlePauseResumeGalaxy(id, true));
                  }}
                  variant="danger"
                  size="sm"
                  className="w-full"
                >
                  Pause All Galaxies
                </Button>
                <Button
                  onClick={() => {
                    Object.keys(galaxyData).forEach(id => handlePauseResumeGalaxy(id, false));
                  }}
                  variant="success"
                  size="sm"
                  className="w-full"
                >
                  Resume All Galaxies
                </Button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Global Announcement</h4>
              <div className="space-y-2">
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Enter announcement message..."
                  className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white placeholder-text-secondary/60 focus:border-cyan-primary focus:outline-none"
                  rows={3}
                />
                <div className="flex space-x-2">
                  <select
                    value={announcementPriority}
                    onChange={(e) => setAnnouncementPriority(e.target.value as 'info' | 'warning' | 'critical')}
                    className="px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                  <Button
                    onClick={handleGlobalAnnouncement}
                    disabled={!announcement.trim()}
                    size="sm"
                    className="flex-1"
                    variant={announcementPriority === 'critical' ? 'danger' : announcementPriority === 'warning' ? 'glass' : 'primary'}
                  >
                    Send to All Galaxies
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Galaxy Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.values(galaxyData).map(data => {
          const health = calculateGalaxyHealth(data);
          const isSelected = data.galaxy.id === selectedGalaxyId;
          
          return (
            <HUDFrame
              key={data.galaxy.id}
              variant="panel"
              color={isSelected ? 'cyan' : 'purple'}
              className={`p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-cyan-primary' : ''}`}
              onClick={() => setSelectedGalaxyId(data.galaxy.id)}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-orbitron font-bold text-lg">{data.galaxy.name}</h3>
                    <p className="text-xs text-text-secondary">{data.galaxy.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusIndicator 
                      status={health > 70 ? 'online' : health > 40 ? 'away' : 'offline'} 
                      size="sm" 
                    />
                    {galaxyStateService.isGalaxyPaused(data.galaxy.id) && (
                      <span className="text-xs px-2 py-0.5 bg-warning-orange/20 text-warning-orange rounded-full">
                        PAUSED
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <CircularGauge
                    value={data.statistics.activeTeams}
                    maxValue={data.statistics.totalTeams}
                    label="Active Teams"
                    size="sm"
                    variant="primary"
                  />
                  <CircularGauge
                    value={health}
                    maxValue={100}
                    label="Galaxy Health"
                    size="sm"
                    variant={health > 70 ? 'success' : health > 40 ? 'warning' : 'danger'}
                    unit="%"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-mono text-cyan-primary">{data.statistics.totalPlayers}</div>
                    <div className="text-text-secondary">Players</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-purple-secondary">{data.statistics.aiTeams}</div>
                    <div className="text-text-secondary">AI Teams</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-warning-orange">{data.statistics.activeTrades}</div>
                    <div className="text-text-secondary">Trades</div>
                  </div>
                </div>
              </div>
            </HUDFrame>
          );
        })}
      </div>

      {/* Detailed Galaxy View */}
      {selectedGalaxy && (
        <div className="space-y-6">
          {/* Galaxy Controls */}
          <GlassPanel className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-orbitron font-bold">
                  {selectedGalaxy.galaxy.name} Management
                </h3>
                {galaxyStateService.isGalaxyPaused(selectedGalaxyId!) && (
                  <span className="text-sm px-3 py-1 bg-warning-orange/20 text-warning-orange rounded-full font-medium animate-pulse">
                    GALAXY PAUSED
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => exportGalaxyData(selectedGalaxyId!, 'csv')}
                  variant="glass"
                  size="sm"
                >
                  Export CSV
                </Button>
                <Button
                  onClick={() => {
                    const state = galaxyStateService.getGalaxyState(selectedGalaxyId!);
                    handlePauseResumeGalaxy(selectedGalaxyId!, !state?.isPaused);
                  }}
                  variant={galaxyStateService.isGalaxyPaused(selectedGalaxyId!) ? "success" : "danger"}
                  size="sm"
                >
                  {galaxyStateService.isGalaxyPaused(selectedGalaxyId!) ? 'Resume Galaxy' : 'Pause Galaxy'}
                </Button>
              </div>
            </div>
          </GlassPanel>

          {/* Team Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Teams List */}
            <HUDFrame variant="panel" color="cyan" className="p-4">
              <h4 className="font-orbitron font-bold text-cyan-primary mb-4">Teams & Players</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedGalaxy.teams.map(team => (
                  <div
                    key={team.id}
                    className={`p-3 rounded-lg border ${
                      team.eliminationStatus.isEliminated
                        ? 'bg-danger-red/10 border-danger-red/30'
                        : 'bg-space-blue-10 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-orbitron font-bold">{team.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-space-blue-30 rounded-full">
                            {team.type}
                          </span>
                          {team.isAIControlled && (
                            <span className="text-xs px-2 py-0.5 bg-purple-secondary/20 text-purple-secondary rounded-full">
                              AI
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          Code: {team.gameCode} • {team.players.length} players
                        </div>
                      </div>
                      <StatusIndicator
                        status={team.eliminationStatus.isEliminated ? 'offline' : 
                               team.tradingStatus === 'available' ? 'online' : 'busy'}
                        size="sm"
                      />
                    </div>
                    
                    {/* Resource bars */}
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      <div className="text-xs">
                        <div className="flex justify-between">
                          <span>O₂</span>
                          <span>{team.resources?.oxygen || 0}</span>
                        </div>
                        <div className="h-1 bg-space-blue-40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-primary"
                            style={{ width: `${((team.resources?.oxygen || 0) / 20) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs">
                        <div className="flex justify-between">
                          <span>Food</span>
                          <span>{team.resources?.food || 0}</span>
                        </div>
                        <div className="h-1 bg-space-blue-40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success-green"
                            style={{ width: `${((team.resources?.food || 0) / 20) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs">
                        <div className="flex justify-between">
                          <span>H₂O</span>
                          <span>{team.resources?.water || 0}</span>
                        </div>
                        <div className="h-1 bg-space-blue-40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-space-blue"
                            style={{ width: `${((team.resources?.water || 0) / 20) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </HUDFrame>

            {/* Statistics & Visualizations */}
            <div className="space-y-4">
              {/* Resource Distribution */}
              <DataVisualization
                title="Average Resources"
                data={Object.entries(selectedGalaxy.statistics.averageResources)
                  .filter(([key]) => ['water', 'food', 'oxygen', 'energy', 'minerals', 'alloys'].includes(key))
                  .map(([key, value]) => ({
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    value: Math.round(value)
                  }))}
                maxValue={20}
                variant="primary"
              />

              {/* Team Status Distribution */}
              <DataVisualization
                title="Team Status"
                data={[
                  { label: 'Active', value: selectedGalaxy.statistics.activeTeams },
                  { label: 'Eliminated', value: selectedGalaxy.statistics.totalTeams - selectedGalaxy.statistics.activeTeams },
                  { label: 'Trading', value: selectedGalaxy.statistics.activeTrades },
                  { label: 'AI Teams', value: selectedGalaxy.statistics.aiTeams }
                ]}
                variant="secondary"
                horizontal
              />

              {/* Real-time Activity */}
              {realtimeData[selectedGalaxyId!] && (
                <HUDFrame variant="panel" color="amber" className="p-4">
                  <h4 className="font-orbitron font-bold text-warning-orange mb-2">
                    Real-time Activity
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Round Timer</span>
                      <span className="font-mono">
                        {Math.floor((realtimeData[selectedGalaxyId!]?.roundTimer?.remaining || 0) / 1000)}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phase</span>
                      <span className="font-mono">
                        {realtimeData[selectedGalaxyId!]?.roundTimer?.phase || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Trades</span>
                      <span className="font-mono">
                        {Object.keys(realtimeData[selectedGalaxyId!]?.activeTrades || {}).length}
                      </span>
                    </div>
                  </div>
                </HUDFrame>
              )}
            </div>
          </div>

          {/* Cross-Galaxy Leaderboard */}
          <HUDFrame variant="panel" color="purple" className="p-4">
            <h4 className="font-orbitron font-bold text-purple-secondary mb-4">
              Top Performers Across All Galaxies
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {session && (
                <>
                  {Object.entries(galaxyData).map(([galaxyId, data]) => (
                    <div key={galaxyId}>
                      <h5 className="text-sm font-medium text-text-secondary mb-2">
                        {data.galaxy.name}
                      </h5>
                      <div className="space-y-1">
                        {data.statistics.topPerformers.slice(0, 3).map((teamId, index) => {
                          const team = data.teams.find(t => t.id === teamId);
                          if (!team) return null;
                          
                          return (
                            <div key={teamId} className="flex items-center space-x-2 text-xs">
                              <span className="font-mono text-purple-secondary">
                                #{index + 1}
                              </span>
                              <span>{team.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </HUDFrame>
        </div>
      )}
      
      {/* Announcement History */}
      {showAnnouncementHistory && (
        <HUDFrame variant="panel" color="amber" className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-orbitron font-bold text-warning-orange">
              Announcement History
            </h3>
            <Button
              onClick={() => setShowAnnouncementHistory(false)}
              variant="glass"
              size="sm"
            >
              Close
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {announcementHistory.length === 0 ? (
              <p className="text-text-secondary text-sm">No announcements sent yet.</p>
            ) : (
              announcementHistory.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-3 rounded-lg border ${
                    ann.priority === 'critical' ? 'bg-danger-red/10 border-danger-red/30' :
                    ann.priority === 'warning' ? 'bg-warning-orange/10 border-warning-orange/30' :
                    'bg-space-blue-10 border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ann.priority === 'critical' ? 'bg-danger-red/20 text-danger-red' :
                        ann.priority === 'warning' ? 'bg-warning-orange/20 text-warning-orange' :
                        'bg-cyan-primary/20 text-cyan-primary'
                      }`}>
                        {ann.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {new Date(ann.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      By: {ann.sentBy}
                    </span>
                  </div>
                  <p className="text-sm">{ann.message}</p>
                  {ann.expiresAt && (
                    <p className="text-xs text-text-secondary mt-1">
                      Expires: {new Date(ann.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </HUDFrame>
      )}
    </div>
  );
};

export default GalaxyManagementDashboard;