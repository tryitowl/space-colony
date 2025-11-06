import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { ResourceSelector } from './ResourceSelector';
import { IntelSelector } from './IntelSelector';
import type { Colony, Resources, IntelItem } from '../../types';
import { TradingService } from '../../services/tradingService';
import { AudioAlerts } from '../../utils/audioAlerts';
import { cn } from '../../utils/cn';

interface TradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentTeam: Colony;
  targetTeam: Colony;
  onTradeCreated?: () => void;
}

export const TradingModal: React.FC<TradingModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  currentTeam,
  targetTeam,
  onTradeCreated
}) => {
  const [offerResources, setOfferResources] = useState<Partial<Resources>>({});
  const [requestResources, setRequestResources] = useState<Partial<Resources>>({});
  const [offerIntel, setOfferIntel] = useState<IntelItem[]>([]);
  const [requestIntel, setRequestIntel] = useState<IntelItem[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [urgentPhase, setUrgentPhase] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [tradingMode, setTradingMode] = useState<'resources' | 'intel'>('resources');

  useEffect(() => {
    if (!isOpen) return;

    // Reset form when modal opens
    setOfferResources({});
    setRequestResources({});
    setOfferIntel([]);
    setRequestIntel([]);
    setTimeRemaining(180);
    setValidationErrors([]);
    setTradingMode('resources');

    // Start countdown timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        
        const newTime = prev - 1;
        
        // Update urgency phases with audio alerts
        if (newTime === 30 && urgentPhase !== 'critical') {
          setUrgentPhase('critical');
          AudioAlerts.playUrgentTimerAlert();
          console.log('🔊 URGENT: 30 seconds remaining!');
          // Visual feedback: brief screen flash
          document.body.style.animation = 'flash 0.5s ease-in-out';
          setTimeout(() => {
            document.body.style.animation = '';
          }, 500);
        } else if (newTime === 60 && urgentPhase !== 'warning') {
          setUrgentPhase('warning');
          AudioAlerts.playWarningTimerAlert();
          console.log('🔊 WARNING: 1 minute remaining!');
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateTrade = (): boolean => {
    const errors: string[] = [];

    // Check if offering anything (resources or intel)
    const hasResourceOffer = Object.values(offerResources).some(value => 
      typeof value === 'number' && value > 0
    );
    const hasIntelOffer = offerIntel.length > 0;
    const hasResourceRequest = Object.values(requestResources).some(value => 
      typeof value === 'number' && value > 0
    );
    const hasIntelRequest = requestIntel.length > 0;

    if (!hasResourceOffer && !hasIntelOffer) {
      errors.push('You must offer at least one resource or intel item');
    }

    if (!hasResourceRequest && !hasIntelRequest) {
      errors.push('You must request at least one resource or intel item');
    }

    // Validate resource availability
    const validation = TradingService.validateTradeResources(currentTeam.resources, offerResources);
    if (!validation.valid) {
      errors.push(`Insufficient resources: ${validation.missingResources.join(', ')}`);
    }

    // Validate intel availability
    const allAvailableIntel = [
      ...currentTeam.resources.marketIntel,
      ...currentTeam.resources.surveyReports,
      ...currentTeam.resources.crisisWarnings
    ];
    
    const unavailableIntel = offerIntel.filter(intel => 
      !allAvailableIntel.some(available => available.id === intel.id)
    );
    
    if (unavailableIntel.length > 0) {
      errors.push(`Intel not available: ${unavailableIntel.map(i => i.title).join(', ')}`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmitTrade = async () => {
    if (!validateTrade()) return;

    setIsSubmitting(true);
    try {
      await TradingService.createTradeOffer(
        sessionId,
        currentTeam.id,
        targetTeam.id,
        offerResources,
        requestResources,
        offerIntel,
        requestIntel
      );

      // Play success sound
      AudioAlerts.playTradeAcceptedAlert();
      onTradeCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to create trade offer:', error);
      setValidationErrors(['Failed to create trade offer. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTradeValue = () => {
    return TradingService.calculateTradeValue(offerResources, requestResources, offerIntel, requestIntel);
  };

  const tradeValue = calculateTradeValue();

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",
      urgentPhase === 'critical' && "animate-pulse"
    )}>
      <GlassPanel className={cn(
        "w-full max-w-4xl max-h-[90vh] overflow-y-auto",
        urgentPhase === 'critical' && "border-space-danger border-2 shadow-lg shadow-space-danger/30",
        urgentPhase === 'warning' && "border-space-warning border"
      )}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-orbitron font-bold text-space-cyan">
              Trade with {targetTeam.name}
            </h2>
            <div className="flex items-center space-x-4">
              {/* Enhanced Timer with Progress Bar and Visual Indicators */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "text-xl font-mono font-bold relative",
                  timeRemaining < 30 ? "text-space-danger animate-pulse" : 
                  timeRemaining < 60 ? "text-space-warning animate-pulse" : "text-space-cyan"
                )}>
                  ⏱️ {formatTime(timeRemaining)}
                  {timeRemaining < 30 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-space-danger rounded-full animate-ping" />
                  )}
                </div>
                
                {/* Circular progress ring */}
                <div className="relative w-16 h-16 mt-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                    {/* Background ring */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="rgb(255 255 255 / 0.1)"
                      strokeWidth="4"
                    />
                    {/* Progress ring */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke={timeRemaining < 30 ? "rgb(239 68 68)" : 
                            timeRemaining < 60 ? "rgb(245 158 11)" : "rgb(6 182 212)"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - timeRemaining / 180)}`}
                      className={cn(
                        "transition-all duration-1000",
                        timeRemaining < 30 && "animate-pulse"
                      )}
                    />
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={cn(
                      "text-xs font-bold text-center",
                      timeRemaining < 30 ? "text-space-danger" : 
                      timeRemaining < 60 ? "text-space-warning" : "text-space-cyan"
                    )}>
                      {timeRemaining < 30 ? "URGENT!" : 
                       timeRemaining < 60 ? "Hurry!" : ""}
                    </div>
                  </div>
                </div>
                
                {/* Linear progress bar */}
                <div className="w-32 h-2 bg-space-panel-bg rounded-full mt-2 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 rounded-full",
                      timeRemaining < 30 ? "bg-space-danger shadow-lg shadow-space-danger/50" : 
                      timeRemaining < 60 ? "bg-space-warning shadow-lg shadow-space-warning/50" : "bg-space-cyan shadow-lg shadow-space-cyan/50"
                    )}
                    style={{ width: `${(timeRemaining / 180) * 100}%` }}
                  />
                </div>
                
                {/* Status text with pulsing effect */}
                {timeRemaining < 30 && (
                  <div className="mt-2 text-xs text-space-danger font-bold animate-bounce">
                    🚨 FINAL SECONDS!
                  </div>
                )}
              </div>
              <Button variant="glass" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Trading Mode Selector */}
          <div className="mb-6">
            <div className="flex space-x-2">
              <Button
                variant={tradingMode === 'resources' ? 'primary' : 'glass'}
                onClick={() => setTradingMode('resources')}
                size="sm"
              >
                📦 Resources
              </Button>
              <Button
                variant={tradingMode === 'intel' ? 'primary' : 'glass'}
                onClick={() => setTradingMode('intel')}
                size="sm"
              >
                🔍 Intelligence
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Offer */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-space-success">
                🚀 Your Offer
              </h3>
              {tradingMode === 'resources' ? (
                <ResourceSelector
                  resources={currentTeam.resources}
                  selectedResources={offerResources}
                  onResourceChange={setOfferResources}
                  mode="offer"
                />
              ) : (
                <IntelSelector
                  availableIntel={[
                    ...currentTeam.resources.marketIntel,
                    ...currentTeam.resources.surveyReports,
                    ...currentTeam.resources.crisisWarnings
                  ]}
                  selectedIntel={offerIntel}
                  onIntelChange={setOfferIntel}
                  mode="offer"
                  currentRound={3} // Default to mid-game round
                />
              )}
            </div>

            {/* Your Request */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-space-warning">
                📥 Your Request
              </h3>
              {tradingMode === 'resources' ? (
                <ResourceSelector
                  resources={targetTeam.resources}
                  selectedResources={requestResources}
                  onResourceChange={setRequestResources}
                  mode="request"
                />
              ) : (
                <IntelSelector
                  availableIntel={[
                    ...targetTeam.resources.marketIntel,
                    ...targetTeam.resources.surveyReports,
                    ...targetTeam.resources.crisisWarnings
                  ]}
                  selectedIntel={requestIntel}
                  onIntelChange={setRequestIntel}
                  mode="request"
                  currentRound={3} // Default to mid-game round
                />
              )}
            </div>
          </div>

          {/* Trade Value Analysis */}
          <div className="mt-6">
            <GlassPanel className="p-4" variant={
              tradeValue.benefit > 0 ? 'success' : 
              tradeValue.benefit < 0 ? 'danger' : 'default'
            }>
              <h3 className="font-semibold mb-2">Trade Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-space-text-secondary">Your Offer:</span>
                  <div className="font-mono">{tradeValue.offerValue} pts (resources)</div>
                  <div className="font-mono">{tradeValue.intelOfferValue} pts (intel)</div>
                  <div className="font-mono font-bold">{tradeValue.offerValue + tradeValue.intelOfferValue} pts total</div>
                </div>
                <div>
                  <span className="text-space-text-secondary">Your Request:</span>
                  <div className="font-mono">{tradeValue.requestValue} pts (resources)</div>
                  <div className="font-mono">{tradeValue.intelRequestValue} pts (intel)</div>
                  <div className="font-mono font-bold">{tradeValue.requestValue + tradeValue.intelRequestValue} pts total</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-space-text-secondary">Net Benefit:</div>
                <div className={cn(
                  "font-mono font-bold text-lg",
                  tradeValue.benefit > 0 ? "text-space-success" :
                  tradeValue.benefit < 0 ? "text-space-danger" : "text-white"
                )}>
                  {tradeValue.benefit > 0 ? '+' : ''}{tradeValue.benefit} pts
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4">
              <GlassPanel className="p-4" variant="danger">
                <h4 className="font-semibold mb-2">⚠️ Trade Issues</h4>
                <ul className="text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </GlassPanel>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="glass" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTrade}
              loading={isSubmitting}
              disabled={validationErrors.length > 0}
              size="lg"
            >
              Send Trade Offer
            </Button>
          </div>

          {/* Trade Tips */}
          <div className="mt-6 text-xs text-space-text-secondary">
            <h4 className="font-semibold mb-2">💡 Trading Tips</h4>
            <ul className="space-y-1">
              <li>• The target colony has 3 minutes to respond</li>
              <li>• They can accept, reject, or counter-offer (max 3 counter-offers each)</li>
              <li>• Consider their colony type and likely resource needs</li>
              <li>• Basic resources (oxygen, food, water, energy) are consumed each round</li>
              <li>• Intel value decreases each time it's shared with other teams</li>
              <li>• You can trade both resources and intel in the same offer</li>
            </ul>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};