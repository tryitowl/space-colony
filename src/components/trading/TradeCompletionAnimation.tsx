import React, { useEffect, useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import type { TradeOffer, Resources, IntelItem } from '../../types';
import { cn } from '../../utils/cn';

interface TradeCompletionAnimationProps {
  trade: TradeOffer;
  userTeamId: string;
  onComplete: () => void;
  show: boolean;
}

export const TradeCompletionAnimation: React.FC<TradeCompletionAnimationProps> = ({
  trade,
  userTeamId,
  onComplete,
  show
}) => {
  const [animationPhase, setAnimationPhase] = useState<'appear' | 'transfer' | 'celebrate' | 'fade'>('appear');
  const [showParticles, setShowParticles] = useState(false);

  const isInitiator = trade.initiatorId === userTeamId;

  useEffect(() => {
    if (!show) return;

    const phases = [
      { phase: 'appear', duration: 500 },
      { phase: 'transfer', duration: 2000 },
      { phase: 'celebrate', duration: 1500 },
      { phase: 'fade', duration: 500 }
    ];

    let currentDelay = 0;

    phases.forEach(({ phase, duration }) => {
      setTimeout(() => {
        setAnimationPhase(phase as 'appear' | 'transfer' | 'celebrate' | 'fade');
        if (phase === 'celebrate') {
          setShowParticles(true);
        }
      }, currentDelay);
      currentDelay += duration;
    });

    // Complete animation
    setTimeout(() => {
      onComplete();
    }, currentDelay);

  }, [show, onComplete]);

  const formatResources = (resources: Partial<Resources>): string[] => {
    return Object.entries(resources)
      .filter(([, amount]) => (amount as number) > 0)
      .map(([resource, amount]) => `${amount} ${resource}`);
  };

  const formatIntel = (intel: IntelItem[]): string[] => {
    return intel.map(item => item.title);
  };

  const getResourceIcon = (resource: string): string => {
    const icons: Record<string, string> = {
      oxygen: '🫁', food: '🍎', water: '💧', energy: '⚡',
      minerals: '💎', alloys: '🔩', techComponents: '🔧',
      credits: '💰', defenseContracts: '🛡️', systemRepairs: '🔧',
      transportRoutes: '🚀', techPatents: '📋', blueprints: '📐',
      alienTech: '👽'
    };
    return icons[resource] || '📦';
  };

  if (!show) return null;

  const userOffers = isInitiator ? trade.offerResources : trade.requestResources;
  const userReceives = isInitiator ? trade.requestResources : trade.offerResources;
  const userOffersIntel = isInitiator ? trade.offerIntel : trade.requestIntel;
  const userReceivesIntel = isInitiator ? trade.requestIntel : trade.offerIntel;

  const userOffersFormatted = [
    ...formatResources(userOffers),
    ...formatIntel(userOffersIntel || [])
  ];
  const userReceivesFormatted = [
    ...formatResources(userReceives),
    ...formatIntel(userReceivesIntel || [])
  ];

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm",
      animationPhase === 'appear' && "animate-fadeIn",
      animationPhase === 'fade' && "animate-fadeOut"
    )}>
      {/* Particle Effects */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-2 h-2 bg-space-success rounded-full animate-ping",
                "opacity-75"
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      <GlassPanel className={cn(
        "max-w-4xl mx-4 p-8 text-center relative overflow-hidden",
        animationPhase === 'celebrate' && "animate-bounce"
      )}>
        {/* Success Banner */}
        <div className={cn(
          "mb-6 transform transition-all duration-1000",
          animationPhase === 'appear' && "scale-0 opacity-0",
          animationPhase !== 'appear' && "scale-100 opacity-100"
        )}>
          <div className="text-6xl mb-4 animate-pulse">🎉</div>
          <h1 className="text-3xl font-orbitron font-bold text-space-success mb-2">
            Trade Completed Successfully!
          </h1>
          <p className="text-space-text-secondary">
            {isInitiator ? 'Your trade offer was accepted' : 'You accepted a trade offer'}
          </p>
        </div>

        {/* Trade Exchange Animation */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center",
          animationPhase === 'transfer' && "animate-pulse"
        )}>
          {/* What you gave */}
          <div className={cn(
            "transform transition-all duration-2000",
            animationPhase === 'appear' && "translate-x-0 opacity-100",
            animationPhase === 'transfer' && "-translate-x-4 opacity-75",
            animationPhase === 'celebrate' && "translate-x-0 opacity-100"
          )}>
            <GlassPanel className="p-4" variant="default">
              <h3 className="text-lg font-semibold text-space-warning mb-3">
                📤 You Gave
              </h3>
              <div className="space-y-2">
                {userOffersFormatted.length === 0 ? (
                  <p className="text-space-text-secondary text-sm">Nothing</p>
                ) : (
                  userOffersFormatted.map((item, index) => (
                    <div key={index} className="flex items-center justify-center gap-2 text-sm">
                      <span>{getResourceIcon(item.split(' ')[1])}</span>
                      <span>{item}</span>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>

          {/* Exchange Arrow */}
          <div className={cn(
            "flex justify-center items-center",
            animationPhase === 'transfer' && "animate-spin"
          )}>
            <div className="text-4xl text-space-cyan">
              ⇄
            </div>
          </div>

          {/* What you received */}
          <div className={cn(
            "transform transition-all duration-2000",
            animationPhase === 'appear' && "translate-x-0 opacity-100",
            animationPhase === 'transfer' && "translate-x-4 opacity-75",
            animationPhase === 'celebrate' && "translate-x-0 opacity-100"
          )}>
            <GlassPanel className="p-4" variant="success">
              <h3 className="text-lg font-semibold text-space-success mb-3">
                📥 You Received
              </h3>
              <div className="space-y-2">
                {userReceivesFormatted.length === 0 ? (
                  <p className="text-space-text-secondary text-sm">Nothing</p>
                ) : (
                  userReceivesFormatted.map((item, index) => (
                    <div key={index} className="flex items-center justify-center gap-2 text-sm">
                      <span>{getResourceIcon(item.split(' ')[1])}</span>
                      <span>{item}</span>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>
        </div>

        {/* Trade Statistics */}
        <div className={cn(
          "transform transition-all duration-1000 delay-500",
          animationPhase === 'appear' && "scale-0 opacity-0",
          animationPhase !== 'appear' && "scale-100 opacity-100"
        )}>
          <GlassPanel className="p-4 mb-6">
            <h3 className="font-semibold mb-3 text-space-cyan">Trade Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-space-success">
                  {trade.negotiationHistory.length}
                </div>
                <div className="text-space-text-secondary">Negotiations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-space-cyan">
                  {Math.floor((trade.expiresAt - trade.timestamp) / 60000)}m
                </div>
                <div className="text-space-text-secondary">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-space-warning">
                  {(userOffersFormatted.length + userReceivesFormatted.length)}
                </div>
                <div className="text-space-text-secondary">Items Traded</div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Celebration Message */}
        {animationPhase === 'celebrate' && (
          <div className="animate-fadeIn">
            <p className="text-xl font-semibold text-space-success mb-2">
              🚀 Resources Updated Successfully!
            </p>
            <p className="text-space-text-secondary">
              Your colony's inventory has been updated with the traded items.
            </p>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            {['appear', 'transfer', 'celebrate', 'fade'].map((phase) => (
              <div
                key={phase}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  animationPhase === phase ? "bg-space-cyan scale-125" : "bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};