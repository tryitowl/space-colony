import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HUDFrame } from '../ui/HUDFrame';
import { Button } from '../ui/Button';
import { IntelSelector } from '../trading/IntelSelector';
import { IntelGenerationService } from '../../services/intelGenerationService';
import type { IntelItem, Colony } from '../../types/game';

interface IntelTradingProps {
  sessionId: string;
  currentTeam: Colony;
  targetTeam: Colony;
  onTradeComplete: (fromTeamId: string, toTeamId: string, intelIds: string[]) => Promise<boolean>;
  onClose: () => void;
  className?: string;
  currentRound: number;
}

/**
 * IntelTrading - Dedicated interface for trading intelligence between teams
 * 
 * Features:
 * - Intel-specific trading interface
 * - Real-time value calculation with degradation
 * - Trade validation and preview
 * - Batch intel trading
 * - Trade history tracking
 */
export const IntelTrading: React.FC<IntelTradingProps> = ({
  sessionId: _sessionId,
  currentTeam,
  targetTeam,
  onTradeComplete,
  onClose,
  className,
  currentRound
}) => {
  const [selectedOfferedIntel, setSelectedOfferedIntel] = useState<IntelItem[]>([]);
  const [selectedRequestedIntel, setSelectedRequestedIntel] = useState<IntelItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradePreview, setTradePreview] = useState<{
    offeredValue: number;
    requestedValue: number;
    fairness: 'fair' | 'favorable' | 'unfavorable';
  } | null>(null);

  // Get all intel items from team resources
  const getAvailableIntel = (team: Colony): IntelItem[] => {
    return [
      ...(team.resources.marketIntel || []),
      ...(team.resources.surveyReports || []),
      ...(team.resources.crisisWarnings || [])
    ].filter(intel => !isIntelExpired(intel, currentRound));
  };

  const currentTeamIntel = getAvailableIntel(currentTeam);
  const targetTeamIntel = getAvailableIntel(targetTeam);

  // Calculate trade preview when selections change
  useEffect(() => {
    if (selectedOfferedIntel.length > 0 || selectedRequestedIntel.length > 0) {
      const offeredValue = selectedOfferedIntel.reduce((sum, intel) => 
        sum + IntelGenerationService.calculateIntelValue(intel, currentRound), 0
      );
      
      const requestedValue = selectedRequestedIntel.reduce((sum, intel) => 
        sum + IntelGenerationService.calculateIntelValue(intel, currentRound), 0
      );
      
      let fairness: 'fair' | 'favorable' | 'unfavorable' = 'fair';
      const ratio = offeredValue / (requestedValue || 1);
      
      if (ratio > 1.2) fairness = 'unfavorable';
      else if (ratio < 0.8) fairness = 'favorable';
      
      setTradePreview({ offeredValue, requestedValue, fairness });
    } else {
      setTradePreview(null);
    }
  }, [selectedOfferedIntel, selectedRequestedIntel, currentRound]);

  const isIntelExpired = (intel: IntelItem, currentRound: number): boolean => {
    const age = currentRound - intel.roundGenerated;
    return age > 3;
  };

  const validateTrade = (): string | null => {
    if (selectedOfferedIntel.length === 0 && selectedRequestedIntel.length === 0) {
      return 'Please select intel to trade';
    }
    
    if (selectedOfferedIntel.length === 0) {
      return 'Please select intel to offer';
    }
    
    if (selectedRequestedIntel.length === 0) {
      return 'Please select intel to request';
    }
    
    // Check for expired intel
    const expiredOffered = selectedOfferedIntel.filter(intel => isIntelExpired(intel, currentRound));
    if (expiredOffered.length > 0) {
      return `Cannot trade expired intel: ${expiredOffered.map(i => i.title).join(', ')}`;
    }
    
    const expiredRequested = selectedRequestedIntel.filter(intel => isIntelExpired(intel, currentRound));
    if (expiredRequested.length > 0) {
      return `Cannot request expired intel: ${expiredRequested.map(i => i.title).join(', ')}`;
    }
    
    // Check for reasonable value balance
    if (tradePreview && tradePreview.fairness === 'unfavorable' && tradePreview.offeredValue > tradePreview.requestedValue * 2) {
      return 'Trade is heavily unfavorable - consider adjusting the intel selection';
    }
    
    return null;
  };

  const handleTrade = async () => {
    const validationError = validateTrade();
    if (validationError) {
      setTradeError(validationError);
      return;
    }
    
    setIsProcessing(true);
    setTradeError(null);
    
    try {
      const allIntelIds = [
        ...selectedOfferedIntel.map(i => i.id),
        ...selectedRequestedIntel.map(i => i.id)
      ];
      
      const success = await onTradeComplete(
        currentTeam.id,
        targetTeam.id,
        allIntelIds
      );
      
      if (success) {
        onClose();
      } else {
        setTradeError('Trade failed - please try again');
      }
    } catch (error) {
      console.error('Intel trade error:', error);
      setTradeError('An error occurred during the trade');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFairnessColor = (fairness: string) => {
    switch (fairness) {
      case 'favorable': return 'text-green-400';
      case 'unfavorable': return 'text-red-400';
      default: return 'text-cyan-400';
    }
  };

  const getFairnessText = (fairness: string) => {
    switch (fairness) {
      case 'favorable': return 'Favorable Trade';
      case 'unfavorable': return 'Unfavorable Trade';
      default: return 'Fair Trade';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn('fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm', className)}
    >
      <HUDFrame
        color="purple"
        variant="panel"
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-space font-bold text-purple-400 mb-1">
                Intelligence Trading
              </h2>
              <p className="text-sm text-gray-400">
                Trade intel between {currentTeam.name} and {targetTeam.name}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Your Intel (Offering) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                <span>📤</span>
                Your Intel (Offering)
              </h3>
              
              <IntelSelector
                availableIntel={currentTeamIntel}
                selectedIntel={selectedOfferedIntel}
                onIntelChange={setSelectedOfferedIntel}
                mode="offer"
                maxSelections={5}
              />
            </div>
            
            {/* Their Intel (Requesting) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                <span>📥</span>
                Their Intel (Requesting)
              </h3>
              
              <IntelSelector
                availableIntel={targetTeamIntel}
                selectedIntel={selectedRequestedIntel}
                onIntelChange={setSelectedRequestedIntel}
                mode="request"
                maxSelections={5}
              />
            </div>
          </div>
          
          {/* Trade Preview */}
          {tradePreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <HUDFrame color="cyan" variant="panel" className="p-4">
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">Trade Preview</h4>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Your Intel Value</p>
                    <p className="text-xl font-mono font-bold text-cyan-400">
                      {tradePreview.offeredValue} CR
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedOfferedIntel.length} items
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className={cn('text-lg font-bold mb-1', getFairnessColor(tradePreview.fairness))}>
                        {getFairnessText(tradePreview.fairness)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Ratio: {(tradePreview.offeredValue / (tradePreview.requestedValue || 1)).toFixed(2)}:1
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Their Intel Value</p>
                    <p className="text-xl font-mono font-bold text-amber-400">
                      {tradePreview.requestedValue} CR
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedRequestedIntel.length} items
                    </p>
                  </div>
                </div>
                
                {tradePreview.fairness === 'unfavorable' && (
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-400/30 rounded-lg">
                    <p className="text-sm text-red-400">
                      ⚠️ This trade is unfavorable to you. Consider requesting more valuable intel or offering less.
                    </p>
                  </div>
                )}
                
                {tradePreview.fairness === 'favorable' && (
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-400/30 rounded-lg">
                    <p className="text-sm text-green-400">
                      ✓ This trade is favorable to you. Good negotiation!
                    </p>
                  </div>
                )}
              </HUDFrame>
            </motion.div>
          )}
          
          {/* Error Display */}
          <AnimatePresence>
            {tradeError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-red-900/20 border border-red-400/30 rounded-lg"
              >
                <p className="text-sm text-red-400">❌ {tradeError}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              <p>💡 Intel tips:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Newer intel is more valuable</li>
                <li>• Intel value decreases when shared</li>
                <li>• Consider strategic value beyond credits</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="glass"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={handleTrade}
                disabled={isProcessing || !tradePreview || !!validateTrade()}
                className="min-w-[120px]"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing
                  </div>
                ) : (
                  'Execute Trade'
                )}
              </Button>
            </div>
          </div>
        </div>
      </HUDFrame>
    </motion.div>
  );
};

IntelTrading.displayName = 'IntelTrading';

export default IntelTrading;