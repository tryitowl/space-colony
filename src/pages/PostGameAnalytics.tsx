import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HUDFrame } from '../components/ui/HUDFrame';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { DataVisualization } from '../components/ui/DataVisualization';
import { Leaderboard } from '../components/ui/Leaderboard';
import { ParallaxBackground } from '../components/ui/ParallaxBackground';
import { cn } from '../utils/cn';
import type { 
  GameSession, 
  Colony, 
  TradeOffer, 
  Resources 
} from '../types/game';

interface AnalyticsData {
  sessionData: GameSession;
  teamPerformance: TeamPerformanceMetrics[];
  tradingAnalytics: TradingAnalytics;
  resourceFlow: ResourceFlowData;
  timelineEvents: TimelineEvent[];
  insights: GameplayInsight[];
}

interface TeamPerformanceMetrics {
  teamId: string;
  teamName: string;
  colonyType: string;
  finalScore: number;
  resourceScore: number;
  tradingScore: number;
  survivalRounds: number;
  totalTrades: number;
  avgTradeValue: number;
  mostTradedResource: string;
  specialAchievements: Achievement[];
  efficiency: {
    resourceUtilization: number;
    tradingEfficiency: number;
    strategicDecisions: number;
  };
}

interface TradingAnalytics {
  totalTrades: number;
  totalValue: number;
  avgTradeTime: number;
  mostActiveRound: number;
  topTradingPairs: TradingPair[];
  resourcePopularity: ResourcePopularity[];
  marketVolatility: number;
}

interface TradingPair {
  team1: string;
  team2: string;
  tradeCount: number;
  totalValue: number;
}

interface ResourcePopularity {
  resource: string;
  timesTraded: number;
  avgValue: number;
  priceVolatility: number;
}

interface ResourceFlowData {
  rounds: number[];
  resourceTrends: {
    [resource: string]: number[];
  };
  criticalMoments: CriticalMoment[];
}

interface CriticalMoment {
  round: number;
  timestamp: number;
  type: 'elimination_risk' | 'major_trade' | 'resource_shortage' | 'market_event';
  description: string;
  teamsAffected: string[];
}

interface TimelineEvent {
  timestamp: number;
  round: number;
  type: 'trade' | 'elimination' | 'crisis' | 'milestone';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  teamsInvolved: string[];
}

interface GameplayInsight {
  category: 'strategy' | 'trading' | 'resource_management' | 'team_dynamics';
  title: string;
  description: string;
  evidence: string[];
  recommendations: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  icon: string;
}

export const PostGameAnalytics: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'trading' | 'insights' | 'timeline'>('overview');
  const [selectedTeam, _setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadAnalyticsData(sessionId);
    }
  }, [sessionId]);

  const loadAnalyticsData = async (sessionId: string) => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from analytics service
      // For now, we'll simulate the data structure
      
      const mockData: AnalyticsData = {
        sessionData: {
          id: sessionId,
          eventId: 'event-1',
          name: 'Corporate Team Building Session',
          facilitatorId: 'facilitator-1',
          teams: [],
          currentRound: 5,
          roundStartTime: Date.now() - 3600000,
          gameState: 'completed',
          settings: {
            roundDurations: {
              instructions: 300000,
              investments: 300000,
              round1Trading: 600000,
              round1Strategy: 300000,
              round2Trading: 600000,
              round2Strategy: 300000,
              milestoneBreak: 300000,
              round3Trading: 600000,
              round3Strategy: 300000,
              round4Trading: 600000,
              round4Strategy: 300000,
              round5Trading: 600000
            },
            enableAlienContact: true,
            customIntel: []
          }
        },
        teamPerformance: generateMockTeamPerformance(),
        tradingAnalytics: generateMockTradingAnalytics(),
        resourceFlow: generateMockResourceFlow(),
        timelineEvents: generateMockTimelineEvents(),
        insights: generateMockInsights()
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockTeamPerformance = (): TeamPerformanceMetrics[] => {
    return [
      {
        teamId: 'team-a1',
        teamName: 'Alpha Mining',
        colonyType: 'mining',
        finalScore: 2847,
        resourceScore: 1200,
        tradingScore: 1247,
        survivalRounds: 5,
        totalTrades: 23,
        avgTradeValue: 145,
        mostTradedResource: 'minerals',
        specialAchievements: [
          { id: 'trade-master', title: 'Trade Master', description: 'Completed 20+ trades', rarity: 'rare', icon: '🏆' },
          { id: 'survivor', title: 'Survivor', description: 'Survived all rounds', rarity: 'common', icon: '🛡️' }
        ],
        efficiency: {
          resourceUtilization: 0.85,
          tradingEfficiency: 0.92,
          strategicDecisions: 0.78
        }
      },
      {
        teamId: 'team-b1',
        teamName: 'Beta Agricultural',
        colonyType: 'agricultural',
        finalScore: 2654,
        resourceScore: 1400,
        tradingScore: 1054,
        survivalRounds: 5,
        totalTrades: 18,
        avgTradeValue: 112,
        mostTradedResource: 'food',
        specialAchievements: [
          { id: 'life-saver', title: 'Life Saver', description: 'Provided critical life support', rarity: 'rare', icon: '💚' }
        ],
        efficiency: {
          resourceUtilization: 0.91,
          tradingEfficiency: 0.76,
          strategicDecisions: 0.83
        }
      },
      {
        teamId: 'team-c1',
        teamName: 'Gamma Research',
        colonyType: 'research',
        finalScore: 3126,
        resourceScore: 1100,
        tradingScore: 1426,
        survivalRounds: 5,
        totalTrades: 31,
        avgTradeValue: 167,
        mostTradedResource: 'techComponents',
        specialAchievements: [
          { id: 'innovator', title: 'Innovator', description: 'Highest tech advancement', rarity: 'legendary', icon: '🔬' },
          { id: 'trade-master', title: 'Trade Master', description: 'Completed 30+ trades', rarity: 'rare', icon: '🏆' }
        ],
        efficiency: {
          resourceUtilization: 0.88,
          tradingEfficiency: 0.94,
          strategicDecisions: 0.91
        }
      }
    ];
  };

  const generateMockTradingAnalytics = (): TradingAnalytics => {
    return {
      totalTrades: 87,
      totalValue: 12450,
      avgTradeTime: 142, // seconds
      mostActiveRound: 3,
      topTradingPairs: [
        { team1: 'Alpha Mining', team2: 'Gamma Research', tradeCount: 12, totalValue: 2100 },
        { team1: 'Beta Agricultural', team2: 'Alpha Mining', tradeCount: 9, totalValue: 1650 },
        { team1: 'Gamma Research', team2: 'Beta Agricultural', tradeCount: 8, totalValue: 1890 }
      ],
      resourcePopularity: [
        { resource: 'energy', timesTraded: 24, avgValue: 45, priceVolatility: 0.15 },
        { resource: 'minerals', timesTraded: 21, avgValue: 32, priceVolatility: 0.12 },
        { resource: 'food', timesTraded: 19, avgValue: 38, priceVolatility: 0.18 }
      ],
      marketVolatility: 0.23
    };
  };

  const generateMockResourceFlow = (): ResourceFlowData => {
    return {
      rounds: [1, 2, 3, 4, 5],
      resourceTrends: {
        oxygen: [100, 95, 88, 82, 78],
        food: [100, 92, 85, 79, 73],
        energy: [100, 96, 91, 87, 82],
        minerals: [100, 105, 112, 108, 115]
      },
      criticalMoments: [
        {
          round: 2,
          timestamp: Date.now() - 2400000,
          type: 'resource_shortage',
          description: 'Critical oxygen shortage across multiple teams',
          teamsAffected: ['team-a1', 'team-c1']
        },
        {
          round: 3,
          timestamp: Date.now() - 1800000,
          type: 'major_trade',
          description: 'Largest trade of the game: 500 credits worth of resources',
          teamsAffected: ['team-a1', 'team-c1']
        }
      ]
    };
  };

  const generateMockTimelineEvents = (): TimelineEvent[] => {
    return [
      {
        timestamp: Date.now() - 3600000,
        round: 1,
        type: 'trade',
        title: 'First Major Trade',
        description: 'Alpha Mining traded minerals for energy with Gamma Research',
        impact: 'medium',
        teamsInvolved: ['Alpha Mining', 'Gamma Research']
      },
      {
        timestamp: Date.now() - 2400000,
        round: 2,
        type: 'crisis',
        title: 'Solar Storm Event',
        description: 'Solar storm disrupted energy systems across the sector',
        impact: 'high',
        teamsInvolved: ['Alpha Mining', 'Beta Agricultural', 'Gamma Research']
      },
      {
        timestamp: Date.now() - 1800000,
        round: 3,
        type: 'milestone',
        title: 'Alien Contact',
        description: 'First contact with alien civilization offering advanced technology',
        impact: 'high',
        teamsInvolved: ['Gamma Research']
      }
    ];
  };

  const generateMockInsights = (): GameplayInsight[] => {
    return [
      {
        category: 'strategy',
        title: 'Research Teams Showed Superior Adaptability',
        description: 'Research colonies demonstrated the highest strategic flexibility, pivoting quickly when faced with resource shortages.',
        evidence: [
          'Gamma Research made 31 trades vs average of 20',
          'Highest efficiency rating in strategic decisions (0.91)',
          'Successfully acquired alien technology in Round 3'
        ],
        recommendations: [
          'Consider research investment for future scenarios',
          'Encourage cross-functional team communication',
          'Reward adaptive strategies in team building'
        ]
      },
      {
        category: 'trading',
        title: 'Energy Emerged as Critical Resource',
        description: 'Energy was the most traded resource, indicating it was the primary constraint for most teams.',
        evidence: [
          'Energy involved in 24 out of 87 trades (27.5%)',
          'Highest price volatility among basic resources',
          'Two teams faced near-elimination due to energy shortages'
        ],
        recommendations: [
          'Focus on energy efficiency in real operations',
          'Develop contingency plans for power disruptions',
          'Consider renewable energy investments'
        ]
      },
      {
        category: 'team_dynamics',
        title: 'Collaborative Teams Outperformed Competitive Ones',
        description: 'Teams that formed lasting partnerships achieved higher overall scores than those focused on zero-sum competition.',
        evidence: [
          'Alpha-Gamma partnership resulted in highest combined score',
          'Teams with regular trading partners had 23% higher efficiency',
          'Isolated teams showed lower resilience to crisis events'
        ],
        recommendations: [
          'Encourage cross-department collaboration',
          'Create shared incentives alongside individual goals',
          'Facilitate relationship building between teams'
        ]
      }
    ];
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <ParallaxBackground />
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 border-2 border-cyan-400 rounded-full border-dashed"
          />
          <h2 className="text-2xl font-bold text-white mb-2">
            Generating Analytics Report
          </h2>
          <p className="text-gray-400">
            Processing game data and calculating insights...
          </p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <ParallaxBackground />
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Analytics Unavailable
          </h2>
          <p className="text-gray-400 mb-6">
            Unable to load analytics data for this session.
          </p>
          <Button onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ParallaxBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Post-Game Analytics
              </h1>
              <p className="text-gray-400 mt-2">
                {analyticsData.sessionData.name} • Completed {new Date(analyticsData.sessionData.roundStartTime).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
                className="text-gray-300 border-gray-600"
              >
                Return Home
              </Button>
              <Button
                onClick={() => {/* Implement export */}}
                className="bg-gradient-to-r from-green-500 to-blue-500"
              >
                📊 Export Report
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassPanel className="p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{analyticsData.teamPerformance.length}</div>
              <div className="text-sm text-gray-400">Teams</div>
            </GlassPanel>
            <GlassPanel className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{analyticsData.tradingAnalytics.totalTrades}</div>
              <div className="text-sm text-gray-400">Total Trades</div>
            </GlassPanel>
            <GlassPanel className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{analyticsData.sessionData.currentRound}</div>
              <div className="text-sm text-gray-400">Rounds Completed</div>
            </GlassPanel>
            <GlassPanel className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(analyticsData.tradingAnalytics.avgTradeTime / 60)}m
              </div>
              <div className="text-sm text-gray-400">Avg Trade Time</div>
            </GlassPanel>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
            {(['overview', 'teams', 'trading', 'insights', 'timeline'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 capitalize",
                  activeTab === tab && "bg-cyan-500/20 text-cyan-300"
                )}
              >
                {tab}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Leaderboard */}
              <HUDFrame className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">🏆 Final Rankings</h2>
                <Leaderboard
                  teams={analyticsData.teamPerformance.map(team => ({
                    id: team.teamId,
                    name: team.teamName,
                    score: team.finalScore,
                    colonyType: team.colonyType as any,
                    isEliminated: team.survivalRounds < 5
                  }))}
                  currentTeamId={selectedTeam || ''}
                />
              </HUDFrame>

              {/* Resource Flow Chart */}
              <HUDFrame className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">📈 Resource Trends</h2>
                <DataVisualization
                  type="line"
                  data={{
                    labels: analyticsData.resourceFlow.rounds.map(r => `Round ${r}`),
                    datasets: Object.entries(analyticsData.resourceFlow.resourceTrends).map(([resource, data], index) => ({
                      label: resource.charAt(0).toUpperCase() + resource.slice(1),
                      data,
                      borderColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4],
                      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] + '20'
                    }))
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Resource Availability Over Time' }
                    },
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: 'Relative Availability (%)' } },
                      x: { title: { display: true, text: 'Game Round' } }
                    }
                  }}
                />
              </HUDFrame>

              {/* Key Insights Preview */}
              <HUDFrame className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">💡 Key Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyticsData.insights.slice(0, 2).map((insight, index) => (
                    <GlassPanel key={index} className="p-4">
                      <h3 className="font-semibold text-cyan-300 mb-2">{insight.title}</h3>
                      <p className="text-gray-300 text-sm mb-3">{insight.description}</p>
                      <div className="text-xs text-gray-400">
                        Category: <span className="text-white capitalize">{insight.category.replace('_', ' ')}</span>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </HUDFrame>
            </motion.div>
          )}

          {/* Add other tab content here - teams, trading, insights, timeline */}
          {/* For brevity, I'll include one more tab as an example */}
          
          {activeTab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {analyticsData.teamPerformance.map((team, index) => (
                  <motion.div
                    key={team.teamId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <HUDFrame className="p-6 h-full">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">{team.teamName}</h3>
                          <span className="px-3 py-1 bg-gray-800/50 rounded-full text-sm text-gray-300 capitalize">
                            {team.colonyType}
                          </span>
                        </div>

                        <div className="text-center py-4">
                          <div className={cn(
                            "text-3xl font-bold mb-2",
                            getScoreColor(team.finalScore, 3500)
                          )}>
                            {team.finalScore.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-400">Final Score</div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Resource Score:</span>
                            <span className="text-green-400 font-semibold">{team.resourceScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Trading Score:</span>
                            <span className="text-blue-400 font-semibold">{team.tradingScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Trades:</span>
                            <span className="text-white font-semibold">{team.totalTrades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg Trade Value:</span>
                            <span className="text-yellow-400 font-semibold">{team.avgTradeValue}</span>
                          </div>
                        </div>

                        {team.specialAchievements.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Achievements</h4>
                            <div className="space-y-1">
                              {team.specialAchievements.map(achievement => (
                                <div key={achievement.id} className="flex items-center space-x-2">
                                  <span className="text-lg">{achievement.icon}</span>
                                  <div>
                                    <div className={cn(
                                      "text-sm font-semibold",
                                      achievement.rarity === 'legendary' ? 'text-yellow-400' :
                                      achievement.rarity === 'rare' ? 'text-purple-400' : 'text-blue-400'
                                    )}>
                                      {achievement.title}
                                    </div>
                                    <div className="text-xs text-gray-400">{achievement.description}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-gray-600/50">
                          <h4 className="text-sm font-semibold text-gray-300 mb-2">Efficiency Metrics</h4>
                          <div className="space-y-2">
                            {Object.entries(team.efficiency).map(([metric, value]) => (
                              <div key={metric} className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 capitalize">
                                  {metric.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                                      style={{ width: `${value * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-white font-semibold">
                                    {(value * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </HUDFrame>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};