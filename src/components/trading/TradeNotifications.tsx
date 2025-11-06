import React, { useEffect, useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { CounterOfferModal } from './CounterOfferModal';
import type { TradeOffer, Resources, Colony } from '../../types';
import { TradingService } from '../../services/tradingService';
import { AudioAlerts } from '../../utils/audioAlerts';
import { cn } from '../../utils/cn';

interface TradeNotificationsProps {
  sessionId: string;
  teamId: string;
  currentTeam: Colony;
  onTradeAction?: () => void;
}

export const TradeNotifications: React.FC<TradeNotificationsProps> = ({
  sessionId,
  teamId,
  currentTeam,
  onTradeAction
}) => {
  const [incomingTrades, setIncomingTrades] = useState<TradeOffer[]>([]);
  const [processingTradeId, setProcessingTradeId] = useState<string | null>(null);
  const [counterOfferModalOpen, setCounterOfferModalOpen] = useState(false);
  const [selectedTradeForCounterOffer, setSelectedTradeForCounterOffer] = useState<TradeOffer | null>(null);

  useEffect(() => {
    // Subscribe to incoming trade offers
    const unsubscribe = TradingService.subscribeToTeamTrades(
      sessionId,
      teamId,
      (trades) => {
        const previousCount = incomingTrades.length;
        setIncomingTrades(trades);
        
        // Play alert for new incoming trades
        if (trades.length > previousCount) {
          AudioAlerts.playIncomingTradeAlert();
        }
        
        // Play alert for counter-offers
        const hasNewCounterOffer = trades.some(trade => 
          trade.status === 'counter_offered' && 
          !incomingTrades.some(prev => prev.id === trade.id && prev.status === 'counter_offered')
        );
        
        if (hasNewCounterOffer) {
          AudioAlerts.playCounterOfferAlert();
        }
      }
    );

    return unsubscribe;
  }, [sessionId, teamId, incomingTrades.length]);

  const handleAcceptTrade = async (tradeId: string) => {
    setProcessingTradeId(tradeId);
    try {
      await TradingService.acceptTradeOffer(sessionId, tradeId, teamId);
      AudioAlerts.playTradeCompletedAlert();
      onTradeAction?.();
    } catch (error) {
      console.error('Failed to accept trade:', error);
    } finally {
      setProcessingTradeId(null);
    }
  };

  const handleRejectTrade = async (tradeId: string) => {
    setProcessingTradeId(tradeId);
    try {
      await TradingService.rejectTradeOffer(sessionId, tradeId, teamId);
      AudioAlerts.playTradeRejectedAlert();
      onTradeAction?.();
    } catch (error) {
      console.error('Failed to reject trade:', error);
    } finally {
      setProcessingTradeId(null);
    }
  };

  const handleCounterOffer = async (tradeId: string) => {
    const trade = incomingTrades.find(t => t.id === tradeId);
    if (trade) {
      setSelectedTradeForCounterOffer(trade);
      setCounterOfferModalOpen(true);
    }
  };

  const handleCounterOfferCreated = () => {
    setCounterOfferModalOpen(false);
    setSelectedTradeForCounterOffer(null);
    onTradeAction?.();
  };

  const formatResources = (resources: Partial<Resources>): string => {
    return Object.entries(resources)
      .filter(([, amount]) => (amount as number) > 0)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(', ') || 'Nothing';
  };

  const getTimeRemaining = (expiresAt: number): string => {
    const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (incomingTrades.length === 0) {
    return null;
  }

  // Calculate counter-offer availability for each trade
  const canCounterOffer = (trade: TradeOffer): boolean => {
    const teamCounterOffers = trade.negotiationHistory.filter(
      h => h.playerId === teamId && h.action === 'counter_offer'
    ).length;
    return teamCounterOffers < 3;
  };

  return (
    <>
      <div className="space-y-4">
        {incomingTrades.map((trade) => {
          const timeRemaining = getTimeRemaining(trade.expiresAt);
          const isExpiringSoon = (trade.expiresAt - Date.now()) < 60000; // Less than 1 minute
          const isProcessing = processingTradeId === trade.id;
          const canCounter = canCounterOffer(trade);

        return (
          <GlassPanel
            key={trade.id}
            className={cn(
              "p-4 border-l-4 animate-pulse-glow",
              isExpiringSoon ? "border-l-space-danger" : "border-l-space-cyan"
            )}
            variant={isExpiringSoon ? "danger" : "active"}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-space-cyan">
                🔔 Incoming Trade Offer
              </h3>
              <div className={cn(
                "font-mono text-sm font-bold",
                isExpiringSoon ? "text-space-danger animate-pulse" : "text-space-cyan"
              )}>
                ⏱️ {timeRemaining}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-space-success mb-2">
                  🎁 They Offer:
                </h4>
                <div className="text-sm bg-space-panel-bg p-3 rounded border">
                  {formatResources(trade.offerResources)}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-space-warning mb-2">
                  📥 They Want:
                </h4>
                <div className="text-sm bg-space-panel-bg p-3 rounded border">
                  {formatResources(trade.requestResources)}
                </div>
              </div>
            </div>

            {/* Trade History */}
            {trade.negotiationHistory.length > 1 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-space-text-secondary mb-2">
                  Negotiation History:
                </h4>
                <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                  {trade.negotiationHistory.slice(-3).map((history, index) => (
                    <div key={index} className="text-space-text-secondary">
                      {new Date(history.timestamp).toLocaleTimeString()}: {history.action}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleAcceptTrade(trade.id)}
                loading={isProcessing && processingTradeId === trade.id}
                disabled={isProcessing}
                className="flex-1 min-w-[100px]"
              >
                ✅ Accept
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCounterOffer(trade.id)}
                disabled={isProcessing || !canCounter}
                className="flex-1 min-w-[100px]"
                title={canCounter ? 'Make a counter-offer' : 'Maximum counter-offers reached'}
              >
                🔄 Counter {canCounter ? '' : '(3/3)'}
              </Button>

              <Button
                size="sm"
                variant="danger"
                onClick={() => handleRejectTrade(trade.id)}
                loading={isProcessing && processingTradeId === trade.id}
                disabled={isProcessing}
                className="flex-1 min-w-[100px]"
              >
                ❌ Reject
              </Button>
            </div>

            {isExpiringSoon && (
              <div className="mt-3 text-xs text-space-danger font-medium animate-pulse">
                ⚠️ This offer expires soon! Decide quickly.
              </div>
            )}
          </GlassPanel>
        );
      })}
      </div>

      {/* Counter-Offer Modal */}
      {selectedTradeForCounterOffer && (
        <CounterOfferModal
          isOpen={counterOfferModalOpen}
          onClose={() => setCounterOfferModalOpen(false)}
          sessionId={sessionId}
          currentTeam={currentTeam}
          originalTrade={selectedTradeForCounterOffer}
          onCounterOfferCreated={handleCounterOfferCreated}
        />
      )}
    </>
  );
};