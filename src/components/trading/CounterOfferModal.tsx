import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { ResourceSelector } from './ResourceSelector';
import { IntelSelector } from './IntelSelector';
import type { Colony, Resources, TradeOffer, IntelItem } from '../../types';
import { TradingService } from '../../services/tradingService';
import { cn } from '../../utils/cn';
import { MAX_TRADE_REQUEST_VALUES } from '../../constants/resourceValues';

interface CounterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentTeam: Colony;
  originalTrade: TradeOffer;
  onCounterOfferCreated?: () => void;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  currentTeam,
  originalTrade,
  onCounterOfferCreated
}) => {
  const [counterOfferResources, setCounterOfferResources] = useState<Partial<Resources>>({});
  const [counterRequestResources, setCounterRequestResources] = useState<Partial<Resources>>({});
  const [counterOfferIntel, setCounterOfferIntel] = useState<IntelItem[]>([]);
  const [counterRequestIntel, setCounterRequestIntel] = useState<IntelItem[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [tradingMode, setTradingMode] = useState<'resources' | 'intel'>('resources');

  // Calculate how many counter-offers this team has made
  const teamCounterOffers = originalTrade.negotiationHistory.filter(
    h => h.playerId === currentTeam.id && h.action === 'counter_offer'
  ).length;

  const remainingCounterOffers = 3 - teamCounterOffers;

  useEffect(() => {
    if (!isOpen) return;

    // Initialize with original trade values (reversed)
    setCounterOfferResources(originalTrade.requestResources);
    setCounterRequestResources(originalTrade.offerResources);
    setCounterOfferIntel(originalTrade.requestIntel || []);
    setCounterRequestIntel(originalTrade.offerIntel || []);
    setTimeRemaining(Math.max(0, Math.floor((originalTrade.expiresAt - Date.now()) / 1000)));
    setValidationErrors([]);
    setTradingMode('resources');

    // Start countdown timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose, originalTrade]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateCounterOffer = (): boolean => {
    const errors: string[] = [];

    if (remainingCounterOffers <= 0) {
      errors.push('Maximum counter-offers reached (3 per team)');
    }

    // Check if offering anything (resources or intel)
    const hasResourceOffer = Object.values(counterOfferResources).some(value => 
      typeof value === 'number' && value > 0
    );
    const hasIntelOffer = counterOfferIntel.length > 0;
    const hasResourceRequest = Object.values(counterRequestResources).some(value => 
      typeof value === 'number' && value > 0
    );
    const hasIntelRequest = counterRequestIntel.length > 0;

    if (!hasResourceOffer && !hasIntelOffer) {
      errors.push('You must offer at least one resource or intel item');
    }

    if (!hasResourceRequest && !hasIntelRequest) {
      errors.push('You must request at least one resource or intel item');
    }

    // Validate resource availability
    const validation = TradingService.validateTradeResources(currentTeam.resources, counterOfferResources);
    if (!validation.valid) {
      errors.push(`Insufficient resources: ${validation.missingResources.join(', ')}`);
    }

    // Validate intel availability
    const allAvailableIntel = [
      ...currentTeam.resources.marketIntel,
      ...currentTeam.resources.surveyReports,
      ...currentTeam.resources.crisisWarnings
    ];
    
    const unavailableIntel = counterOfferIntel.filter(intel => 
      !allAvailableIntel.some(available => available.id === intel.id)
    );
    
    if (unavailableIntel.length > 0) {
      errors.push(`Intel not available: ${unavailableIntel.map(i => i.title).join(', ')}`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmitCounterOffer = async () => {
    if (!validateCounterOffer()) return;

    setIsSubmitting(true);
    try {
      const success = await TradingService.createCounterOffer(
        sessionId,
        originalTrade.id,
        currentTeam.id,
        counterOfferResources,
        counterRequestResources,
        counterOfferIntel,
        counterRequestIntel
      );

      if (success) {
        onCounterOfferCreated?.();
        onClose();
      } else {
        setValidationErrors(['Failed to create counter-offer. Please try again.']);
      }
    } catch (error) {
      console.error('Failed to create counter-offer:', error);
      setValidationErrors(['Failed to create counter-offer. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCounterOfferValue = () => {
    return TradingService.calculateTradeValue(counterOfferResources, counterRequestResources, counterOfferIntel, counterRequestIntel);
  };

  const formatResources = (resources: Partial<Resources>): string => {
    return Object.entries(resources)
      .filter(([, amount]) => (amount as number) > 0)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(', ') || 'Nothing';
  };

  const formatIntel = (intel: IntelItem[]): string => {
    return intel.map(item => `${item.title} (${item.value}pts)`).join(', ') || 'None';
  };

  const counterOfferValue = calculateCounterOfferValue();
  const originalValue = TradingService.calculateTradeValue(originalTrade.offerResources, originalTrade.requestResources, originalTrade.offerIntel, originalTrade.requestIntel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-orbitron font-bold text-space-cyan">
              Counter-Offer Trade
            </h2>
            <div className="flex items-center space-x-4">
              <div className={cn(
                "text-xl font-mono font-bold",
                timeRemaining < 60 ? "text-space-danger animate-pulse" : "text-space-cyan"
              )}>
                ⏱️ {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-space-text-secondary">
                {remainingCounterOffers} counter-offers remaining
              </div>
              <Button variant="glass" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Original Trade Summary */}
          <div className="mb-6">
            <GlassPanel className="p-4" variant="default">
              <h3 className="font-semibold mb-3 text-space-text-secondary">
                📋 Original Trade Offer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-space-success">They offered:</span>
                  <div className="font-mono mt-1">
                    <div>Resources: {formatResources(originalTrade.offerResources)}</div>
                    <div>Intel: {formatIntel(originalTrade.offerIntel || [])}</div>
                  </div>
                </div>
                <div>
                  <span className="text-space-warning">They requested:</span>
                  <div className="font-mono mt-1">
                    <div>Resources: {formatResources(originalTrade.requestResources)}</div>
                    <div>Intel: {formatIntel(originalTrade.requestIntel || [])}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-space-text-secondary">
                Original trade value: {originalValue.offerValue + originalValue.intelOfferValue} pts offered, {originalValue.requestValue + originalValue.intelRequestValue} pts requested
              </div>
            </GlassPanel>
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

          {/* Counter-Offer Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Counter-Offer */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-space-success">
                🚀 Your Counter-Offer
              </h3>
              {tradingMode === 'resources' ? (
                <ResourceSelector
                  resources={currentTeam.resources}
                  selectedResources={counterOfferResources}
                  onResourceChange={setCounterOfferResources}
                  mode="offer"
                />
              ) : (
                <IntelSelector
                  availableIntel={[
                    ...currentTeam.resources.marketIntel,
                    ...currentTeam.resources.surveyReports,
                    ...currentTeam.resources.crisisWarnings
                  ]}
                  selectedIntel={counterOfferIntel}
                  onIntelChange={setCounterOfferIntel}
                  mode="offer"
                  currentRound={3} // Default to mid-game round
                />
              )}
            </div>

            {/* Your Counter-Request */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-space-warning">
                📥 Your Counter-Request
              </h3>
              {tradingMode === 'resources' ? (
                <ResourceSelector
                  resources={{
                    // Basic Resources
                    oxygen: MAX_TRADE_REQUEST_VALUES.oxygen || 50,
                    food: MAX_TRADE_REQUEST_VALUES.food || 50,
                    water: MAX_TRADE_REQUEST_VALUES.water || 50,
                    energy: MAX_TRADE_REQUEST_VALUES.energy || 50,
                    // Advanced Materials
                    minerals: MAX_TRADE_REQUEST_VALUES.minerals || 30,
                    alloys: MAX_TRADE_REQUEST_VALUES.alloys || 20,
                    techComponents: MAX_TRADE_REQUEST_VALUES.techComponents || 15,
                    // Services
                    defenseContracts: MAX_TRADE_REQUEST_VALUES.defenseContracts || 10,
                    systemRepairs: MAX_TRADE_REQUEST_VALUES.systemRepairs || 10,
                    transportRoutes: MAX_TRADE_REQUEST_VALUES.transportRoutes || 10,
                    // Technology
                    techPatents: MAX_TRADE_REQUEST_VALUES.techPatents || 5,
                    blueprints: MAX_TRADE_REQUEST_VALUES.blueprints || 5,
                    alienTech: MAX_TRADE_REQUEST_VALUES.alienTech || 2,
                    // Alien Resources
                    xenoBio: 10,
                    quantumCores: 5,
                    darkMatter: 3,
                    // Universal
                    credits: MAX_TRADE_REQUEST_VALUES.credits || 1000,
                    // Intel arrays stay empty as they're handled separately
                    marketIntel: [],
                    surveyReports: [],
                    crisisWarnings: []
                  }}
                  selectedResources={counterRequestResources}
                  onResourceChange={setCounterRequestResources}
                  mode="request"
                />
              ) : (
                <IntelSelector
                  availableIntel={[]} // For request mode, we don't know what intel they have
                  selectedIntel={counterRequestIntel}
                  onIntelChange={setCounterRequestIntel}
                  mode="request"
                  currentRound={3} // Default to mid-game round
                />
              )}
            </div>
          </div>

          {/* Trade Value Comparison */}
          <div className="mt-6">
            <GlassPanel className="p-4">
              <h3 className="font-semibold mb-3">Counter-Offer Analysis</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-space-text-secondary mb-2">Original Trade</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Resources: {originalValue.offerValue} pts</div>
                    <div>Resources: {originalValue.requestValue} pts</div>
                    <div>Intel: {originalValue.intelOfferValue} pts</div>
                    <div>Intel: {originalValue.intelRequestValue} pts</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                    <div>Total Offered: {originalValue.offerValue + originalValue.intelOfferValue} pts</div>
                    <div>Total Requested: {originalValue.requestValue + originalValue.intelRequestValue} pts</div>
                  </div>
                  <div className={cn(
                    "text-sm font-bold mt-1",
                    originalValue.benefit > 0 ? "text-space-success" :
                    originalValue.benefit < 0 ? "text-space-danger" : "text-white"
                  )}>
                    Net: {originalValue.benefit > 0 ? '+' : ''}{originalValue.benefit} pts
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-space-text-secondary mb-2">Your Counter-Offer</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Resources: {counterOfferValue.offerValue} pts</div>
                    <div>Resources: {counterOfferValue.requestValue} pts</div>
                    <div>Intel: {counterOfferValue.intelOfferValue} pts</div>
                    <div>Intel: {counterOfferValue.intelRequestValue} pts</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                    <div>Total Offering: {counterOfferValue.offerValue + counterOfferValue.intelOfferValue} pts</div>
                    <div>Total Requesting: {counterOfferValue.requestValue + counterOfferValue.intelRequestValue} pts</div>
                  </div>
                  <div className={cn(
                    "text-sm font-bold mt-1",
                    counterOfferValue.benefit > 0 ? "text-space-success" :
                    counterOfferValue.benefit < 0 ? "text-space-danger" : "text-white"
                  )}>
                    Net: {counterOfferValue.benefit > 0 ? '+' : ''}{counterOfferValue.benefit} pts
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Negotiation History */}
          {originalTrade.negotiationHistory.length > 1 && (
            <div className="mt-6">
              <GlassPanel className="p-4">
                <h3 className="font-semibold mb-3">Negotiation History</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {originalTrade.negotiationHistory.map((history, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-space-text-secondary">
                        {new Date(history.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={cn(
                        "font-medium",
                        history.action === 'offer' ? "text-space-cyan" :
                        history.action === 'counter_offer' ? "text-space-warning" :
                        history.action === 'accept' ? "text-space-success" :
                        "text-space-danger"
                      )}>
                        {history.playerId === currentTeam.id ? 'You' : 'They'} {history.action.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4">
              <GlassPanel className="p-4" variant="danger">
                <h4 className="font-semibold mb-2">⚠️ Counter-Offer Issues</h4>
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
              onClick={handleSubmitCounterOffer}
              loading={isSubmitting}
              disabled={validationErrors.length > 0 || remainingCounterOffers <= 0}
              size="lg"
            >
              Send Counter-Offer ({remainingCounterOffers} left)
            </Button>
          </div>

          {/* Counter-Offer Tips */}
          <div className="mt-6 text-xs text-space-text-secondary">
            <h4 className="font-semibold mb-2">💡 Counter-Offer Tips</h4>
            <ul className="space-y-1">
              <li>• Each team can make up to 3 counter-offers per trade</li>
              <li>• Counter-offers reset the 3-minute timer</li>
              <li>• Consider their colony type and resource needs</li>
              <li>• Make fair adjustments to improve the trade balance</li>
              <li>• The other team can accept, reject, or counter your offer</li>
            </ul>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};