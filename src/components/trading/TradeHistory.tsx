import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import type { TradeOffer, Resources, IntelItem } from '../../types';
import { TradingService } from '../../services/tradingService';
import { cn } from '../../utils/cn';

interface TradeHistoryProps {
  sessionId: string;
  teamId: string;
  onClose: () => void;
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({
  sessionId,
  teamId,
  onClose
}) => {
  const [completedTrades, setCompletedTrades] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<TradeOffer | null>(null);

  useEffect(() => {
    loadTradeHistory();
  }, [sessionId, teamId]);

  const loadTradeHistory = async () => {
    try {
      // In a real implementation, this would fetch from TradingService
      // For now, we'll simulate with mock data
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const mockTrades: TradeOffer[] = [
        {
          id: 'trade_1',
          initiatorId: teamId,
          targetId: 'other_team_1',
          offerResources: { oxygen: 10, food: 5 },
          requestResources: { minerals: 8, energy: 12 },
          offerIntel: [],
          requestIntel: [],
          status: 'accepted',
          timestamp: Date.now() - 1800000, // 30 minutes ago
          expiresAt: Date.now() - 1620000,
          negotiationHistory: [
            {
              playerId: teamId,
              action: 'offer',
              resources: { offer: { oxygen: 10, food: 5 }, request: { minerals: 8, energy: 12 } },
              timestamp: Date.now() - 1800000
            },
            {
              playerId: 'other_team_1',
              action: 'accept',
              resources: { offer: {}, request: {} },
              timestamp: Date.now() - 1620000
            }
          ]
        },
        {
          id: 'trade_2',
          initiatorId: 'other_team_2',
          targetId: teamId,
          offerResources: { credits: 200 },
          requestResources: { techComponents: 3 },
          offerIntel: [{
            id: 'intel_1',
            title: 'Market Analysis Report',
            content: 'Detailed market trends for next round',
            value: 85,
            distributionCount: 1,
            roundGenerated: 2,
            source: 'scout'
          }],
          requestIntel: [],
          status: 'accepted',
          timestamp: Date.now() - 3600000, // 1 hour ago
          expiresAt: Date.now() - 3420000,
          negotiationHistory: [
            {
              playerId: 'other_team_2',
              action: 'offer',
              resources: { offer: { credits: 200 }, request: { techComponents: 3 } },
              intel: {
                offer: [{
                  id: 'intel_1',
                  title: 'Market Analysis Report',
                  content: 'Detailed market trends for next round',
                  value: 85,
                  distributionCount: 1,
                  roundGenerated: 2,
                  source: 'scout'
                }],
                request: []
              },
              timestamp: Date.now() - 3600000
            },
            {
              playerId: teamId,
              action: 'accept',
              resources: { offer: {}, request: {} },
              timestamp: Date.now() - 3420000
            }
          ]
        }
      ];
      
      setCompletedTrades(mockTrades);
    } catch (error) {
      console.error('Failed to load trade history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTradeStatusIcon = (status: string): string => {
    switch (status) {
      case 'accepted': return '✅';
      case 'rejected': return '❌';
      case 'expired': return '⏰';
      default: return '❓';
    }
  };

  const getTradeStatusColor = (status: string): string => {
    switch (status) {
      case 'accepted': return 'text-space-success';
      case 'rejected': return 'text-space-danger';
      case 'expired': return 'text-space-warning';
      default: return 'text-space-text-secondary';
    }
  };

  const formatResources = (resources: Partial<Resources>): string => {
    return Object.entries(resources)
      .filter(([, amount]) => (amount as number) > 0)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(', ') || 'None';
  };

  const formatIntel = (intel: IntelItem[]): string => {
    return intel.map(item => `${item.title} (${item.value}pts)`).join(', ') || 'None';
  };

  const calculateTradeValue = (trade: TradeOffer) => {
    return TradingService.calculateTradeValue(
      trade.offerResources, 
      trade.requestResources, 
      trade.offerIntel, 
      trade.requestIntel
    );
  };

  const isInitiatedByTeam = (trade: TradeOffer): boolean => {
    return trade.initiatorId === teamId;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <GlassPanel className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-space-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-space-text-secondary">Loading trade history...</p>
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
            <h2 className="text-2xl font-orbitron font-bold text-space-cyan">
              📈 Trade History
            </h2>
            <Button variant="glass" onClick={onClose}>
              ✕
            </Button>
          </div>

          {completedTrades.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-space-text-secondary text-lg">No completed trades yet</p>
              <p className="text-space-text-secondary text-sm mt-2">
                Your trading history will appear here as you complete trades
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTrades.map((trade) => {
                const tradeValue = calculateTradeValue(trade);
                const isInitiated = isInitiatedByTeam(trade);
                const wasSuccessful = trade.status === 'accepted';
                
                return (
                  <GlassPanel
                    key={trade.id}
                    className={cn(
                      "p-4 cursor-pointer transition-all duration-200",
                      selectedTrade?.id === trade.id ? "border-space-cyan bg-space-cyan/10" : "hover:border-space-cyan/50",
                      wasSuccessful ? "border-l-4 border-l-space-success" : "border-l-4 border-l-space-danger"
                    )}
                    onClick={() => setSelectedTrade(selectedTrade?.id === trade.id ? null : trade)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getTradeStatusIcon(trade.status)}
                        </span>
                        <div>
                          <h3 className="font-bold text-white">
                            {isInitiated ? 'Outgoing Trade' : 'Incoming Trade'}
                          </h3>
                          <p className="text-sm text-space-text-secondary">
                            {isInitiated ? 'To' : 'From'}: {isInitiated ? trade.targetId : trade.initiatorId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("font-bold", getTradeStatusColor(trade.status))}>
                          {trade.status.toUpperCase()}
                        </div>
                        <div className="text-xs text-space-text-secondary">
                          {new Date(trade.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-space-success mb-1">
                          {isInitiated ? 'You Offered' : 'They Offered'}:
                        </h4>
                        <div className="text-sm text-space-text-secondary">
                          <div>Resources: {formatResources(trade.offerResources)}</div>
                          <div>Intel: {formatIntel(trade.offerIntel || [])}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-space-warning mb-1">
                          {isInitiated ? 'You Requested' : 'They Requested'}:
                        </h4>
                        <div className="text-sm text-space-text-secondary">
                          <div>Resources: {formatResources(trade.requestResources)}</div>
                          <div>Intel: {formatIntel(trade.requestIntel || [])}</div>
                        </div>
                      </div>
                    </div>

                    {/* Trade Value Summary */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-space-text-secondary">Trade Value:</span>
                      <span className={cn(
                        "font-mono font-bold",
                        tradeValue.benefit > 0 ? "text-space-success" :
                        tradeValue.benefit < 0 ? "text-space-danger" : "text-white"
                      )}>
                        {tradeValue.benefit > 0 ? '+' : ''}{tradeValue.benefit} pts
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {selectedTrade?.id === trade.id && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <h4 className="font-semibold mb-3 text-space-cyan">Negotiation Timeline</h4>
                        <div className="space-y-2">
                          {trade.negotiationHistory.map((nego, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-space-text-secondary">
                                {new Date(nego.timestamp).toLocaleTimeString()}
                              </span>
                              <span className={cn(
                                "font-medium",
                                nego.action === 'offer' ? "text-space-cyan" :
                                nego.action === 'counter_offer' ? "text-space-warning" :
                                nego.action === 'accept' ? "text-space-success" :
                                "text-space-danger"
                              )}>
                                {nego.playerId === teamId ? 'You' : 'They'} {nego.action.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <span className="text-space-text-secondary">Offer Value</span>
                            <div className="font-mono font-bold">{tradeValue.offerValue + tradeValue.intelOfferValue} pts</div>
                          </div>
                          <div className="text-center">
                            <span className="text-space-text-secondary">Request Value</span>
                            <div className="font-mono font-bold">{tradeValue.requestValue + tradeValue.intelRequestValue} pts</div>
                          </div>
                          <div className="text-center">
                            <span className="text-space-text-secondary">Duration</span>
                            <div className="font-mono font-bold">
                              {Math.floor((trade.expiresAt - trade.timestamp) / 60000)}m {Math.floor(((trade.expiresAt - trade.timestamp) % 60000) / 1000)}s
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </GlassPanel>
                );
              })}
            </div>
          )}

          {/* Trade Statistics */}
          {completedTrades.length > 0 && (
            <div className="mt-6">
              <GlassPanel className="p-4">
                <h3 className="font-semibold mb-3 text-space-cyan">Trading Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-space-success">
                      {completedTrades.filter(t => t.status === 'accepted').length}
                    </div>
                    <div className="text-space-text-secondary">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-space-danger">
                      {completedTrades.filter(t => t.status === 'rejected').length}
                    </div>
                    <div className="text-space-text-secondary">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-space-warning">
                      {completedTrades.filter(t => t.status === 'expired').length}
                    </div>
                    <div className="text-space-text-secondary">Expired</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-space-cyan">
                      {completedTrades.filter(t => isInitiatedByTeam(t)).length}
                    </div>
                    <div className="text-space-text-secondary">Initiated</div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};