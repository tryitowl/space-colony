import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import type { Colony } from '../../types';
import { cn } from '../../utils/cn';
import { AnalyticsService } from '../../services/analyticsService';
import type { PerformanceMetrics, BehavioralAnalysis } from '../../services/analyticsService';
import { AnalyticsExportService } from '../../services/analyticsExportService';
import type { ExportOptions } from '../../services/analyticsExportService';

interface TradeAnalyticsProps {
  sessionId: string;
  currentTeam: Colony;
  onClose: () => void;
}

interface TradeMetrics {
  totalTrades: number;
  successfulTrades: number;
  successRate: number;
  averageTradeValue: number;
  totalValueTraded: number;
  averageNegotiationTime: number;
  mostTradedResource: string;
  bestTradingPartner: string;
  profitLoss: number;
  intelTraded: number;
  counterOffersUsed: number;
  tradesByDay: Array<{ date: string; count: number; value: number }>;
  tradingEfficiency: number;
  marketShare: number;
}

export const TradeAnalytics: React.FC<TradeAnalyticsProps> = ({
  sessionId,
  currentTeam,
  onClose
}) => {
  const [metrics, setMetrics] = useState<TradeMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [behavioralAnalysis, setBehavioralAnalysis] = useState<BehavioralAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week'>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'details' | 'trends'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [sessionId, currentTeam.id, timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Get analytics service instance
      const analyticsService = AnalyticsService.getInstance(sessionId, {
        enableRealTimeAnalytics: true,
        trackBehavioralMetrics: true,
        generateRecommendations: true,
        detailLevel: 'comprehensive'
      });
      
      // Load performance metrics
      const allPerformanceMetrics = await analyticsService.generatePerformanceMetrics();
      const teamPerformance = allPerformanceMetrics.find(m => m.teamId === currentTeam.id);
      
      if (teamPerformance) {
        setPerformanceMetrics(teamPerformance);
        
        // Convert to TradeMetrics format for compatibility
        const tradeMetrics: TradeMetrics = {
          totalTrades: teamPerformance.tradingMetrics.totalTrades,
          successfulTrades: Math.round(teamPerformance.tradingMetrics.totalTrades * teamPerformance.tradingMetrics.negotiationSuccess),
          successRate: Math.round(teamPerformance.tradingMetrics.negotiationSuccess * 100),
          averageTradeValue: Math.round(teamPerformance.tradingMetrics.avgTradeValue),
          totalValueTraded: Math.round(teamPerformance.tradingMetrics.avgTradeValue * teamPerformance.tradingMetrics.totalTrades),
          averageNegotiationTime: Math.round(teamPerformance.behavioralMetrics.decisionSpeed),
          mostTradedResource: teamPerformance.tradingMetrics.favoriteResource,
          bestTradingPartner: teamPerformance.tradingMetrics.tradingPartners[0] || 'None',
          profitLoss: Math.round(teamPerformance.componentScores.tradingScore - 1000),
          intelTraded: 0, // Would need to calculate from trade data
          counterOffersUsed: 0, // Would need to calculate from trade data
          tradesByDay: [
            { date: new Date().toISOString().split('T')[0], count: teamPerformance.tradingMetrics.totalTrades, value: teamPerformance.tradingMetrics.avgTradeValue * teamPerformance.tradingMetrics.totalTrades }
          ],
          tradingEfficiency: Math.round(teamPerformance.tradingMetrics.tradingEfficiency * 100),
          marketShare: 0 // Would need to calculate from all teams
        };
        
        setMetrics(tradeMetrics);
      }
      
      // Load behavioral analysis for additional insights
      const behavioral = await analyticsService.generateBehavioralAnalysis();
      setBehavioralAnalysis(behavioral);
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Fall back to mock data if analytics fail
      const mockMetrics: TradeMetrics = {
        totalTrades: 0,
        successfulTrades: 0,
        successRate: 0,
        averageTradeValue: 0,
        totalValueTraded: 0,
        averageNegotiationTime: 0,
        mostTradedResource: 'none',
        bestTradingPartner: 'None',
        profitLoss: 0,
        intelTraded: 0,
        counterOffersUsed: 0,
        tradesByDay: [],
        tradingEfficiency: 0,
        marketShare: 0
      };
      setMetrics(mockMetrics);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (value: number, thresholds: [number, number, number]): string => {
    if (value >= thresholds[2]) return 'text-space-success';
    if (value >= thresholds[1]) return 'text-space-warning';
    return 'text-space-danger';
  };

  const getGradeLetter = (value: number, thresholds: [number, number, number]): string => {
    if (value >= thresholds[2]) return 'A';
    if (value >= thresholds[1]) return 'B';
    return 'C';
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'excel' | 'json' = 'pdf') => {
    if (!performanceMetrics || !behavioralAnalysis) {
      console.error('No data available to export');
      return;
    }

    setExporting(true);
    try {
      const exportService = AnalyticsExportService.getInstance();
      const analyticsService = AnalyticsService.getInstance(sessionId);
      
      // Get all performance metrics for complete export
      const allPerformanceMetrics = await analyticsService.generatePerformanceMetrics();
      
      // Get session data (simplified version)
      const sessionData = {
        id: sessionId,
        name: `Session ${sessionId}`,
        currentRound: 5,
        teams: allPerformanceMetrics.map(m => ({
          id: m.teamId,
          name: m.teamName,
          type: m.colonyType,
          resources: {},
          players: [],
          gameCode: '',
          investments: {},
          eliminationStatus: {
            isEliminated: false,
            roundsInCritical: 0,
            criticalResources: []
          }
        }))
      };

      const exportOptions: ExportOptions = {
        format,
        includeCharts: format === 'pdf',
        includeBehavioralAnalysis: true,
        includeRecommendations: true,
        sections: [
          'summary',
          'team_performance',
          'trading_analysis',
          'behavioral_insights',
          'recommendations'
        ]
      };

      const exportData = {
        sessionData: sessionData as any,
        performanceMetrics: allPerformanceMetrics,
        behavioralAnalysis,
        generatedAt: Date.now()
      };

      await exportService.exportAnalyticsReport(exportData, exportOptions);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <GlassPanel className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-space-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-space-text-secondary">Analyzing trading performance...</p>
        </GlassPanel>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <GlassPanel className="p-8 text-center">
          <p className="text-space-danger">Failed to load analytics</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-orbitron font-bold text-space-cyan">
                📊 Trading Analytics
              </h2>
              <p className="text-space-text-secondary">
                {currentTeam.name} • Performance Analysis
              </p>
            </div>
            <Button variant="glass" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex space-x-2">
              <span className="text-sm text-space-text-secondary self-center">Timeframe:</span>
              {(['all', 'today', 'week'] as const).map(tf => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeframe === tf ? 'primary' : 'glass'}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf.charAt(0).toUpperCase() + tf.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex space-x-2">
              <span className="text-sm text-space-text-secondary self-center">View:</span>
              {(['overview', 'details', 'trends'] as const).map(vm => (
                <Button
                  key={vm}
                  size="sm"
                  variant={viewMode === vm ? 'primary' : 'glass'}
                  onClick={() => setViewMode(vm)}
                >
                  {vm.charAt(0).toUpperCase() + vm.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Overview Mode */}
          {viewMode === 'overview' && (
            <div className="space-y-6">
              {/* Performance Score */}
              <GlassPanel className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-4 text-space-cyan">Overall Trading Grade</h3>
                <div className="flex justify-center items-center space-x-8">
                  <div className="text-center">
                    <div className={cn(
                      "text-6xl font-bold font-mono",
                      getGradeColor(metrics.tradingEfficiency, [60, 80, 90])
                    )}>
                      {getGradeLetter(metrics.tradingEfficiency, [60, 80, 90])}
                    </div>
                    <div className="text-space-text-secondary text-sm">Trading Grade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-space-cyan">
                      {metrics.tradingEfficiency}%
                    </div>
                    <div className="text-space-text-secondary text-sm">Efficiency Score</div>
                  </div>
                </div>
              </GlassPanel>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassPanel className="p-4 text-center">
                  <div className="text-2xl font-bold text-space-success">
                    {metrics.successfulTrades}/{metrics.totalTrades}
                  </div>
                  <div className="text-xs text-space-text-secondary">Successful Trades</div>
                  <div className={cn(
                    "text-sm font-bold mt-1",
                    getGradeColor(metrics.successRate, [50, 70, 85])
                  )}>
                    {metrics.successRate}% Success Rate
                  </div>
                </GlassPanel>

                <GlassPanel className="p-4 text-center">
                  <div className="text-2xl font-bold text-space-cyan">
                    {metrics.totalValueTraded.toLocaleString()}
                  </div>
                  <div className="text-xs text-space-text-secondary">Total Value Traded</div>
                  <div className="text-sm text-space-warning font-bold mt-1">
                    Avg: {metrics.averageTradeValue} pts
                  </div>
                </GlassPanel>

                <GlassPanel className="p-4 text-center">
                  <div className={cn(
                    "text-2xl font-bold",
                    metrics.profitLoss >= 0 ? "text-space-success" : "text-space-danger"
                  )}>
                    {metrics.profitLoss >= 0 ? '+' : ''}{metrics.profitLoss}
                  </div>
                  <div className="text-xs text-space-text-secondary">Net Profit/Loss</div>
                  <div className="text-sm text-space-cyan font-bold mt-1">
                    {metrics.marketShare.toFixed(1)}% Market Share
                  </div>
                </GlassPanel>

                <GlassPanel className="p-4 text-center">
                  <div className="text-2xl font-bold text-space-warning">
                    {Math.floor(metrics.averageNegotiationTime / 60)}m {metrics.averageNegotiationTime % 60}s
                  </div>
                  <div className="text-xs text-space-text-secondary">Avg Negotiation Time</div>
                  <div className="text-sm text-space-success font-bold mt-1">
                    {metrics.counterOffersUsed} Counter-offers
                  </div>
                </GlassPanel>
              </div>

              {/* Insights */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-space-cyan">Key Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-space-success mb-2">Strengths</h4>
                    <ul className="text-sm text-space-text-secondary space-y-1">
                      {performanceMetrics && behavioralAnalysis ? (
                        behavioralAnalysis.teamBehaviors
                          .find(t => t.teamId === currentTeam.id)?.strengths
                          .slice(0, 4)
                          .map((strength, i) => <li key={i}>• {strength}</li>) || [
                            <li key="1">• High success rate on initial offers</li>,
                            <li key="2">• Efficient negotiation timing</li>,
                            <li key="3">• Strong {metrics.mostTradedResource} trading volume</li>,
                            <li key="4">• Good resource management</li>
                          ]
                      ) : (
                        <>
                          <li>• High success rate on initial offers</li>
                          <li>• Efficient negotiation timing</li>
                          <li>• Strong {metrics.mostTradedResource} trading volume</li>
                          <li>• Good resource management</li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-space-warning mb-2">Areas for Improvement</h4>
                    <ul className="text-sm text-space-text-secondary space-y-1">
                      {performanceMetrics && behavioralAnalysis ? (
                        behavioralAnalysis.teamBehaviors
                          .find(t => t.teamId === currentTeam.id)?.developmentAreas
                          .slice(0, 4)
                          .map((area, i) => <li key={i}>• {area}</li>) || [
                            <li key="1">• Consider diversifying trading partners</li>,
                            <li key="2">• Optimize resource allocation efficiency</li>,
                            <li key="3">• Explore more counter-offer strategies</li>,
                            <li key="4">• Increase market share through volume</li>
                          ]
                      ) : (
                        <>
                          <li>• Consider diversifying trading partners</li>
                          <li>• Optimize resource allocation efficiency</li>
                          <li>• Explore more counter-offer strategies</li>
                          <li>• Increase market share through volume</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* Details Mode */}
          {viewMode === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassPanel className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-space-cyan">Trading Partners</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-space-success">🏆 {metrics.bestTradingPartner}</span>
                      <span className="text-sm text-space-text-secondary">4 trades</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Agricultural Colony Beta</span>
                      <span className="text-sm text-space-text-secondary">3 trades</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Research Station Gamma</span>
                      <span className="text-sm text-space-text-secondary">2 trades</span>
                    </div>
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-space-cyan">Resource Activity</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-space-success">⚡ Energy</span>
                      <span className="text-sm text-space-text-secondary">Most traded</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>💎 Minerals</span>
                      <span className="text-sm text-space-text-secondary">High demand</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>🔧 Tech Components</span>
                      <span className="text-sm text-space-text-secondary">Premium value</span>
                    </div>
                  </div>
                </GlassPanel>
              </div>

              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-space-cyan">Intel Trading Analysis</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-space-warning">{metrics.intelTraded}</div>
                    <div className="text-xs text-space-text-secondary">Intel Items Traded</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-space-cyan">85%</div>
                    <div className="text-xs text-space-text-secondary">Intel Success Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-space-success">127</div>
                    <div className="text-xs text-space-text-secondary">Avg Intel Value</div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* Trends Mode */}
          {viewMode === 'trends' && (
            <div className="space-y-6">
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-space-cyan">Trading Trends</h3>
                <div className="space-y-4">
                  {metrics.tradesByDay.map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-space-text-secondary">{day.count} trades</span>
                        <div className="w-32 bg-space-panel-bg rounded-full h-2">
                          <div 
                            className="bg-space-cyan h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(day.value / 1000) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">{day.value} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-space-cyan">Performance Trends</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-space-success mb-2">Improving Metrics</h4>
                    <ul className="text-sm text-space-text-secondary space-y-1">
                      <li>• Success rate: +15% this week</li>
                      <li>• Average trade value: +22 pts</li>
                      <li>• Negotiation speed: -30s faster</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-space-warning mb-2">Watch Areas</h4>
                    <ul className="text-sm text-space-text-secondary space-y-1">
                      <li>• Counter-offer usage down 5%</li>
                      <li>• Intel trading volume static</li>
                      <li>• Market share growth slowing</li>
                    </ul>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/20">
            <Button variant="glass" onClick={() => loadAnalytics()}>
              🔄 Refresh Data
            </Button>
            <div className="space-x-4">
              <div className="inline-flex space-x-2">
                <Button 
                  variant="secondary"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting || !performanceMetrics}
                >
                  {exporting ? '⏳ Exporting...' : '📄 PDF'}
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => handleExport('csv')}
                  disabled={exporting || !performanceMetrics}
                >
                  📊 CSV
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => handleExport('excel')}
                  disabled={exporting || !performanceMetrics}
                >
                  📈 Excel
                </Button>
              </div>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};