import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '../ui/GlassPanel';
import { Switch } from '../ui/Switch';
import { 
  VICTORY_CONDITIONS, 
  VICTORY_CONDITION_CATEGORIES,
  DEFAULT_VICTORY_CONDITIONS
} from '../../constants/victoryConditions';
import type { VictoryCondition } from '../../types/galaxy.types';

interface VictoryConditionSelectorProps {
  selectedConditions: string[];
  onChange: (conditionIds: string[]) => void;
  minConditions?: number;
  maxConditions?: number;
}

export const VictoryConditionSelector: React.FC<VictoryConditionSelectorProps> = ({
  selectedConditions,
  onChange,
  minConditions = 1,
  maxConditions = 5
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleToggleCondition = (conditionId: string) => {
    if (selectedConditions.includes(conditionId)) {
      // Remove condition if not below minimum
      if (selectedConditions.length > minConditions) {
        onChange(selectedConditions.filter(id => id !== conditionId));
      }
    } else {
      // Add condition if not above maximum
      if (selectedConditions.length < maxConditions) {
        onChange([...selectedConditions, conditionId]);
      }
    }
  };

  const getCategoryIcon = (categoryKey: string): string => {
    switch (categoryKey) {
      case 'survival': return '🛡️';
      case 'economic': return '💰';
      case 'advanced': return '🚀';
      case 'mixed': return '⚖️';
      default: return '🏆';
    }
  };

  const getConditionIcon = (type: VictoryCondition['type']): string => {
    switch (type) {
      case 'survival': return '❤️';
      case 'economic': return '💎';
      case 'technological': return '🔬';
      case 'diplomatic': return '🤝';
      case 'custom': return '⭐';
      default: return '🏅';
    }
  };

  return (
    <GlassPanel className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold font-orbitron text-space-cyan mb-2">
          Victory Conditions
        </h3>
        <p className="text-space-text-secondary text-sm">
          Select {minConditions} to {maxConditions} victory conditions. 
          Teams can win by achieving any of the selected conditions.
        </p>
        <div className="mt-2 text-sm text-space-warning">
          {selectedConditions.length} of {maxConditions} selected
          {selectedConditions.length < minConditions && (
            <span className="text-space-danger ml-2">
              (Minimum {minConditions} required)
            </span>
          )}
        </div>
      </div>

      {/* Quick presets */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-space-text-secondary mb-3">
          Quick Presets
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange(['survival'])}
            className="px-3 py-1 rounded-lg border border-space-cyan/30 hover:border-space-cyan/60 
                     bg-space-cyan/10 hover:bg-space-cyan/20 text-sm transition-all"
          >
            Classic (Survival Only)
          </button>
          <button
            onClick={() => onChange(['survival', 'economic'])}
            className="px-3 py-1 rounded-lg border border-space-purple/30 hover:border-space-purple/60 
                     bg-space-purple/10 hover:bg-space-purple/20 text-sm transition-all"
          >
            Standard (Survival + Economic)
          </button>
          <button
            onClick={() => onChange(['survival', 'economic', 'technological'])}
            className="px-3 py-1 rounded-lg border border-space-warning/30 hover:border-space-warning/60 
                     bg-space-warning/10 hover:bg-space-warning/20 text-sm transition-all"
          >
            Advanced (Multiple Paths)
          </button>
          <button
            onClick={() => onChange(Object.keys(VICTORY_CONDITIONS).slice(0, maxConditions))}
            className="px-3 py-1 rounded-lg border border-space-danger/30 hover:border-space-danger/60 
                     bg-space-danger/10 hover:bg-space-danger/20 text-sm transition-all"
          >
            All Conditions
          </button>
        </div>
      </div>

      {/* Categories with conditions */}
      <div className="space-y-3">
        {Object.entries(VICTORY_CONDITION_CATEGORIES).map(([categoryKey, category]) => (
          <motion.div
            key={categoryKey}
            className="border border-white/10 rounded-lg overflow-hidden"
            initial={false}
          >
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === categoryKey ? null : categoryKey
              )}
              className="w-full p-4 bg-space-panel-bg/30 hover:bg-space-panel-bg/50 
                       transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCategoryIcon(categoryKey)}</span>
                <div className="text-left">
                  <h4 className="font-semibold text-space-cyan">{category.name}</h4>
                  <p className="text-xs text-space-text-secondary">{category.description}</p>
                </div>
              </div>
              <motion.span
                animate={{ rotate: expandedCategory === categoryKey ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-space-text-secondary"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {expandedCategory === categoryKey && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-space-panel-bg/20 space-y-3">
                    {category.conditions.map(conditionId => {
                      const condition = VICTORY_CONDITIONS[conditionId];
                      if (!condition) return null;

                      const isSelected = selectedConditions.includes(conditionId);
                      const isDisabled = !isSelected && selectedConditions.length >= maxConditions;

                      return (
                        <div
                          key={conditionId}
                          className={`p-3 rounded-lg border transition-all ${
                            isSelected 
                              ? 'border-space-cyan bg-space-cyan/10' 
                              : isDisabled
                              ? 'border-gray-700 bg-gray-800/50 opacity-50'
                              : 'border-white/20 bg-white/5 hover:border-white/40'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getConditionIcon(condition.type)}</span>
                                <h5 className="font-semibold">{condition.name}</h5>
                                {DEFAULT_VICTORY_CONDITIONS.includes(conditionId) && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-space-cyan/20 text-space-cyan">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-space-text-secondary">
                                {condition.description}
                              </p>
                            </div>
                            <Switch
                              checked={isSelected}
                              onChange={() => handleToggleCondition(conditionId)}
                              disabled={isDisabled || (isSelected && selectedConditions.length <= minConditions)}
                              size="sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Selected conditions summary */}
      {selectedConditions.length > 0 && (
        <div className="mt-6 p-4 bg-space-cyan/10 rounded-lg border border-space-cyan/30">
          <h4 className="text-sm font-semibold text-space-cyan mb-2">
            Active Victory Conditions:
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedConditions.map(conditionId => {
              const condition = VICTORY_CONDITIONS[conditionId];
              if (!condition) return null;

              return (
                <div
                  key={conditionId}
                  className="px-3 py-1 rounded-full bg-space-cyan/20 text-sm 
                           flex items-center gap-1"
                >
                  <span>{getConditionIcon(condition.type)}</span>
                  <span>{condition.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassPanel>
  );
};

export default VictoryConditionSelector;