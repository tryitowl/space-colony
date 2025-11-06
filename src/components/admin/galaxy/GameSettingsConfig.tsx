import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, TrendingUp, Shield, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import type { GalaxyConfiguration } from '../../../types';

interface GameSettingsConfigProps {
  configuration: Partial<GalaxyConfiguration>;
  onUpdate: (config: Partial<GalaxyConfiguration>) => void;
}

const victoryConditionOptions = [
  {
    id: 'survival',
    name: 'Survival',
    icon: Shield,
    description: 'Maintain colony population above critical thresholds',
  },
  {
    id: 'economic',
    name: 'Economic',
    icon: TrendingUp,
    description: 'Achieve highest total resource value',
  },
  {
    id: 'diplomatic',
    name: 'Diplomatic',
    icon: ArrowRightLeft,
    description: 'Complete most successful trades with other colonies',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Zap,
    description: 'Define custom victory conditions for this session',
  },
];

const GameSettingsConfig: React.FC<GameSettingsConfigProps> = ({ configuration, onUpdate }) => {
  const selectedConditions = configuration.victoryConditions || [];
  const tradingRules = configuration.tradingRules || {
    crossGalaxyTrading: false,
    tradeRestrictions: [],
  };
  const specialRules = configuration.specialRules || {
    resourceDecay: false,
    marketVolatility: 'normal',
  };

  const toggleVictoryCondition = (conditionId: string) => {
    const updated = selectedConditions.includes(conditionId)
      ? selectedConditions.filter((id) => id !== conditionId)
      : [...selectedConditions, conditionId];
    
    onUpdate({
      ...configuration,
      victoryConditions: updated,
    });
  };

  const updateTradingRules = (updates: Partial<typeof tradingRules>) => {
    onUpdate({
      ...configuration,
      tradingRules: { ...tradingRules, ...updates },
    });
  };

  const updateSpecialRules = (updates: Partial<typeof specialRules>) => {
    onUpdate({
      ...configuration,
      specialRules: { ...specialRules, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Game Settings</h3>
        <p className="text-gray-400">
          Configure victory conditions, trading rules, and special game mechanics.
        </p>
      </div>

      {/* Victory Conditions */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Victory Conditions</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {victoryConditionOptions.map((condition) => (
            <motion.button
              key={condition.id}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedConditions.includes(condition.id)
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => toggleVictoryCondition(condition.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start space-x-3">
                <condition.icon
                  className={`w-6 h-6 mt-1 ${
                    selectedConditions.includes(condition.id)
                      ? 'text-cyan-400'
                      : 'text-gray-400'
                  }`}
                />
                <div className="flex-1">
                  <h5
                    className={`font-medium ${
                      selectedConditions.includes(condition.id) ? 'text-cyan-400' : 'text-white'
                    }`}
                  >
                    {condition.name}
                  </h5>
                  <p className="text-sm text-gray-400 mt-1">{condition.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Trading Rules */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Trading Rules</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-white">Cross-Galaxy Trading</h5>
              <p className="text-sm text-gray-400 mt-1">
                Allow teams to trade resources between different galaxies
              </p>
            </div>
            <motion.button
              className={`relative w-14 h-8 rounded-full transition-colors ${
                tradingRules.crossGalaxyTrading ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
              onClick={() =>
                updateTradingRules({ crossGalaxyTrading: !tradingRules.crossGalaxyTrading })
              }
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"
                animate={{ x: tradingRules.crossGalaxyTrading ? 22 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
            </motion.button>
          </div>

          <div>
            <h5 className="font-medium text-white mb-3">Trade Restrictions</h5>
            <div className="space-y-2">
              {['No trades in first round', 'Limited trades per round', 'Resource-specific restrictions'].map(
                (restriction) => (
                  <label key={restriction} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tradingRules.tradeRestrictions?.includes(restriction) || false}
                      onChange={(e) => {
                        const restrictions = e.target.checked
                          ? [...(tradingRules.tradeRestrictions || []), restriction]
                          : (tradingRules.tradeRestrictions || []).filter((r) => r !== restriction);
                        updateTradingRules({ tradeRestrictions: restrictions });
                      }}
                      className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-gray-300">{restriction}</span>
                  </label>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Special Rules */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Special Rules</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-white">Resource Decay</h5>
              <p className="text-sm text-gray-400 mt-1">
                Resources decrease in value over time if not traded
              </p>
            </div>
            <motion.button
              className={`relative w-14 h-8 rounded-full transition-colors ${
                specialRules.resourceDecay ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
              onClick={() => updateSpecialRules({ resourceDecay: !specialRules.resourceDecay })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"
                animate={{ x: specialRules.resourceDecay ? 22 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
            </motion.button>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <h5 className="font-medium text-white">Market Volatility</h5>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              How dramatically market events affect resource values
            </p>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'normal', 'high'].map((level) => (
                <motion.button
                  key={level}
                  className={`px-4 py-2 rounded-lg capitalize transition-all ${
                    specialRules.marketVolatility === level
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => updateSpecialRules({ marketVolatility: level as any })}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {level}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-medium text-white mb-3">Additional Special Rules</h5>
            <textarea
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Enter any additional special rules or modifications..."
              value={specialRules.additionalRules || ''}
              onChange={(e) => updateSpecialRules({ additionalRules: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Victory Condition Warning */}
      {selectedConditions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Please select at least one victory condition</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameSettingsConfig;