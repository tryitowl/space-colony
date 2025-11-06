import React, { useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import type { IntelItem } from '../../types';
import { cn } from '../../utils/cn';
import { IntelGenerationService } from '../../services/intelGenerationService';

interface IntelSelectorProps {
  availableIntel: IntelItem[];
  selectedIntel: IntelItem[];
  onIntelChange: (intel: IntelItem[]) => void;
  mode: 'offer' | 'request';
  maxSelections?: number;
  currentRound: number;
}

export const IntelSelector: React.FC<IntelSelectorProps> = ({
  availableIntel,
  selectedIntel,
  onIntelChange,
  mode,
  maxSelections = 3,
  currentRound
}) => {
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null);

  const isSelected = (intel: IntelItem): boolean => {
    return selectedIntel.some(selected => selected.id === intel.id);
  };

  const toggleIntelSelection = (intel: IntelItem) => {
    if (isSelected(intel)) {
      // Remove from selection
      const newSelection = selectedIntel.filter(selected => selected.id !== intel.id);
      onIntelChange(newSelection);
    } else {
      // Add to selection (if under limit)
      if (selectedIntel.length < maxSelections) {
        const newSelection = [...selectedIntel, intel];
        onIntelChange(newSelection);
      }
    }
  };

  const getIntelCategoryIcon = (source: string): string => {
    switch (source) {
      case 'scout':
        return '🔍';
      case 'communication':
        return '📡';
      case 'traded':
        return '🔄';
      default:
        return '📊';
    }
  };

  const getIntelValueColor = (value: number): string => {
    if (value >= 150) return 'text-space-legendary';
    if (value >= 100) return 'text-space-rare';
    if (value >= 50) return 'text-space-uncommon';
    return 'text-space-common';
  };


  const categorizedIntel = availableIntel.reduce((acc, intel) => {
    if (!acc[intel.source]) {
      acc[intel.source] = [];
    }
    acc[intel.source].push(intel);
    return acc;
  }, {} as Record<string, IntelItem[]>);

  if (availableIntel.length === 0) {
    return (
      <GlassPanel className="p-4 text-center">
        <div className="text-space-text-secondary">
          <p className="text-sm">No intel available for {mode}</p>
          <p className="text-xs mt-1">
            {mode === 'offer' ? 'Invest in scouts or communication arrays to generate intel' : 'The other team has no intel to share'}
          </p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-space-text-secondary uppercase tracking-wide">
          {mode === 'offer' ? 'Your Intel' : 'Requested Intel'}
        </h4>
        <div className="text-xs text-space-text-secondary">
          {selectedIntel.length}/{maxSelections} selected
        </div>
      </div>

      {Object.entries(categorizedIntel).map(([source, intelList]) => (
        <div key={source} className="space-y-2">
          <h5 className="text-xs font-medium text-space-text-secondary flex items-center gap-2">
            {getIntelCategoryIcon(source)}
            {source.charAt(0).toUpperCase() + source.slice(1)} Intelligence
          </h5>
          
          <div className="space-y-2">
            {intelList.map((intel) => {
              const currentValue = calculateIntelValue(intel);
              const selected = isSelected(intel);
              const canSelect = !selected && selectedIntel.length < maxSelections;
              
              return (
                <GlassPanel
                  key={intel.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all duration-200",
                    selected && "border-space-cyan bg-space-cyan/10",
                    canSelect && "hover:border-space-cyan/50",
                    !canSelect && !selected && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => canSelect || selected ? toggleIntelSelection(intel) : null}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h6 className="font-medium text-sm text-white">
                          {intel.title}
                        </h6>
                        <span className={cn("text-xs font-mono font-bold", getIntelValueColor(currentValue))}>
                          {currentValue} pts
                        </span>
                        {intel.distributionCount > 0 && (
                          <span className="text-xs px-2 py-1 bg-space-warning/20 text-space-warning rounded">
                            Shared {intel.distributionCount}x
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-space-text-secondary mb-2">
                        Round {intel.roundGenerated} • {intel.source}
                      </div>
                      
                      <div className="text-xs text-space-text-secondary">
                        {expandedIntel === intel.id ? (
                          <div className="mb-2">
                            <p>{intel.content}</p>
                            <Button
                              size="sm"
                              variant="glass"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedIntel(null);
                              }}
                              className="mt-2 text-xs"
                            >
                              Show Less
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-2">
                              {intel.content.length > 100 
                                ? `${intel.content.substring(0, 100)}...` 
                                : intel.content}
                            </span>
                            {intel.content.length > 100 && (
                              <Button
                                size="sm"
                                variant="glass"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedIntel(intel.id);
                                }}
                                className="text-xs whitespace-nowrap"
                              >
                                Read More
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center ml-3">
                      {selected && (
                        <div className="w-4 h-4 rounded-full bg-space-cyan flex items-center justify-center">
                          <span className="text-xs text-black font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </div>
      ))}

      {selectedIntel.length > 0 && (
        <div className="mt-4">
          <GlassPanel className="p-3" variant="active">
            <h5 className="text-sm font-medium text-space-cyan mb-2">
              Selected Intel ({selectedIntel.length})
            </h5>
            <div className="space-y-1">
              {selectedIntel.map((intel) => (
                <div key={intel.id} className="flex justify-between items-center text-xs">
                  <span className="text-white">{intel.title}</span>
                  <span className={cn("font-mono font-bold", getIntelValueColor(calculateIntelValue(intel)))}>
                    {calculateIntelValue(intel)} pts
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-white/20">
              <div className="flex justify-between items-center text-sm">
                <span className="text-space-text-secondary">Total Intel Value:</span>
                <span className="font-bold text-space-cyan">
                  {selectedIntel.reduce((sum, intel) => sum + calculateIntelValue(intel), 0)} pts
                </span>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      <div className="text-xs text-space-text-secondary">
        <p>💡 Intel Tips:</p>
        <ul className="mt-1 space-y-1">
          <li>• Intel value decreases each time it's shared</li>
          <li>• Higher value intel is more valuable in trades</li>
          <li>• Scout and communication intel is most valuable</li>
          <li>• Maximum {maxSelections} intel items per trade</li>
        </ul>
      </div>
    </div>
  );
};