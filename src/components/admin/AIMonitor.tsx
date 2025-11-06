import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { CircularGauge } from '../ui/CircularGauge';
import { AIIntegrationService } from '../../services/aiIntegrationService';
import type { AIPerformanceMetrics } from '../../types/ai.types';

interface AIMonitorProps {
  sessionId: string;
  onClose?: () => void;
}

export const AIMonitor: React.FC<AIMonitorProps> = ({ sessionId, onClose }) => {
  const [aiStats, setAIStats] = useState<any>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [selectedGalaxy, setSelectedGalaxy] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAIData();
    
    // Set up auto-refresh
    const interval = setInterval(loadAIData, 5000); // Refresh every 5 seconds
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId]);

  const loadAIData = async () => {
    try {
      // Get AI stats
      const stats = AIIntegrationService.getAIStats(sessionId);
      setAIStats(stats);
      
      // Get performance report
      const report = AIIntegrationService.getAIPerformanceReport(sessionId);
      setPerformanceReport(report);
      
      // Get debug info
      const debug = AIIntegrationService.getAIDebugInfo(sessionId);
      setDebugInfo(debug);
      setIsPaused(debug?.isPaused || false);
      setDebugMode(debug?.debugMode || false);
    } catch (error) {
      console.error('Error loading AI data:', error);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      AIIntegrationService.resumeAI(sessionId);
    } else {
      AIIntegrationService.pauseAI(sessionId);
    }
    setIsPaused(!isPaused);
  };

  const handleDebugToggle = () => {
    const newDebugMode = !debugMode;
    AIIntegrationService.setDebugMode(sessionId, newDebugMode);
    setDebugMode(newDebugMode);
  };

  const handleForceDecisions = () => {
    AIIntegrationService.forceAIDecisions(sessionId);
  };

  const getOverallHealthScore = (): number => {
    if (!performanceReport?.overall) return 0;
    const { avgSurvivalRate, avgTradingSuccess } = performanceReport.overall;
    return (avgSurvivalRate + avgTradingSuccess) / 2;
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <GlassPanel className="w-full max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-orbitron text-space-cyan">
            🤖 AI System Monitor
          </h2>
          <p className="text-space-text-secondary text-sm mt-1">
            Real-time AI colony performance and behavior monitoring
          </p>
        </div>
        {onClose && (
          <Button variant="glass" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* System Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-space-panel-bg/50 rounded-lg p-4 border border-white/10">
          <div className="text-xs text-space-text-secondary mb-1">System Status</div>
          <div className={`text-lg font-bold ${isPaused ? 'text-space-warning' : 'text-space-success'}`}>
            {isPaused ? 'PAUSED' : 'ACTIVE'}
          </div>
        </div>
        
        <div className="bg-space-panel-bg/50 rounded-lg p-4 border border-white/10">
          <div className="text-xs text-space-text-secondary mb-1">Total AI Colonies</div>
          <div className="text-lg font-bold text-space-purple">
            {aiStats?.totalAI || 0}
          </div>
        </div>
        
        <div className="bg-space-panel-bg/50 rounded-lg p-4 border border-white/10">
          <div className="text-xs text-space-text-secondary mb-1">Debug Mode</div>
          <div className={`text-lg font-bold ${debugMode ? 'text-space-cyan' : 'text-space-text-secondary'}`}>
            {debugMode ? 'ON' : 'OFF'}
          </div>
        </div>
        
        <div className="bg-space-panel-bg/50 rounded-lg p-4 border border-white/10">
          <div className="text-xs text-space-text-secondary mb-1">Overall Health</div>
          <div className="text-lg font-bold text-space-cyan">
            {formatPercentage(getOverallHealthScore())}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={isPaused ? 'primary' : 'danger'}
          size="sm"
          onClick={handlePauseResume}
        >
          {isPaused ? '▶ Resume AI' : '⏸ Pause AI'}
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={handleDebugToggle}
        >
          {debugMode ? '🔕 Disable Debug' : '🔔 Enable Debug'}
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={handleForceDecisions}
        >
          ⚡ Force Decisions
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={loadAIData}
        >
          🔄 Refresh
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Overall Performance */}
        <GlassPanel className="p-4">
          <h3 className="text-lg font-semibold text-space-cyan mb-4">Overall Performance</h3>
          
          {performanceReport?.overall && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-space-text-secondary">Avg Survival Rate</span>
                <span className="font-mono text-space-success">
                  {formatPercentage(performanceReport.overall.avgSurvivalRate)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-space-text-secondary">Avg Trading Success</span>
                <span className="font-mono text-space-cyan">
                  {formatPercentage(performanceReport.overall.avgTradingSuccess)}
                </span>
              </div>
              
              {performanceReport.overall.bestPerformer && (
                <div className="mt-4 p-3 bg-green-900/20 rounded border border-space-success/30">
                  <div className="text-xs text-space-success mb-1">Best Performer</div>
                  <div className="font-mono text-sm">{performanceReport.overall.bestPerformer}</div>
                </div>
              )}
              
              {performanceReport.overall.worstPerformer && (
                <div className="p-3 bg-red-900/20 rounded border border-space-danger/30">
                  <div className="text-xs text-space-danger mb-1">Needs Attention</div>
                  <div className="font-mono text-sm">{performanceReport.overall.worstPerformer}</div>
                </div>
              )}
            </div>
          )}
        </GlassPanel>

        {/* Difficulty Breakdown */}
        <GlassPanel className="p-4">
          <h3 className="text-lg font-semibold text-space-purple mb-4">AI Distribution</h3>
          
          {aiStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <CircularGauge
                    value={aiStats.aiDifficulties.easy}
                    maxValue={aiStats.totalAI || 1}
                    label="Easy"
                    variant="success"
                    size="sm"
                  />
                </div>
                <div className="text-center">
                  <CircularGauge
                    value={aiStats.aiDifficulties.medium}
                    maxValue={aiStats.totalAI || 1}
                    label="Medium"
                    variant="warning"
                    size="sm"
                  />
                </div>
                <div className="text-center">
                  <CircularGauge
                    value={aiStats.aiDifficulties.hard}
                    maxValue={aiStats.totalAI || 1}
                    label="Hard"
                    variant="danger"
                    size="sm"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-space-text-secondary">Human Teams</span>
                  <span className="font-mono">{aiStats.totalHuman}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-space-text-secondary">AI Teams</span>
                  <span className="font-mono text-space-purple">{aiStats.totalAI}</span>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Galaxy-Specific Performance */}
      {performanceReport?.byGalaxy && Object.keys(performanceReport.byGalaxy).length > 0 && (
        <GlassPanel className="p-4 mb-6">
          <h3 className="text-lg font-semibold text-space-cyan mb-4">Performance by Galaxy</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(performanceReport.byGalaxy).map(([galaxyId, metrics]) => {
              const galaxyMetrics = metrics as AIPerformanceMetrics[];
              if (galaxyMetrics.length === 0) return null;
              
              const avgSurvival = galaxyMetrics.reduce((sum, m) => sum + m.survivalRate, 0) / galaxyMetrics.length;
              const avgTrading = galaxyMetrics.reduce((sum, m) => sum + m.tradingSuccess, 0) / galaxyMetrics.length;
              
              return (
                <div
                  key={galaxyId}
                  className="bg-space-panel-bg/30 rounded-lg p-3 border border-white/10 cursor-pointer hover:border-space-cyan/50 transition-colors"
                  onClick={() => setSelectedGalaxy(galaxyId === selectedGalaxy ? null : galaxyId)}
                >
                  <div className="font-medium mb-2">{galaxyId}</div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-space-text-secondary">AI Teams</span>
                      <span>{galaxyMetrics.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-space-text-secondary">Survival</span>
                      <span className="text-space-success">{formatPercentage(avgSurvival)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-space-text-secondary">Trading</span>
                      <span className="text-space-cyan">{formatPercentage(avgTrading)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      )}

      {/* Debug Information */}
      {debugMode && debugInfo && (
        <GlassPanel className="p-4">
          <h3 className="text-lg font-semibold text-space-warning mb-4">Debug Information</h3>
          
          <div className="bg-black/50 rounded p-3 font-mono text-xs text-space-text-secondary overflow-auto max-h-96">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </GlassPanel>
      )}

      {/* Status Messages */}
      <div className="mt-6 text-center text-sm text-space-text-secondary">
        {refreshInterval && (
          <span>Auto-refreshing every 5 seconds • </span>
        )}
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </GlassPanel>
  );
};

export default AIMonitor;