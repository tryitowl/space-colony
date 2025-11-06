import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Rocket, AlertCircle } from 'lucide-react';
import type { GalaxyConfiguration } from '../../../types';
import { IntelItemCreator } from '../IntelItemCreator';
import type { CustomIntelTemplate } from '../IntelItemCreator';

interface SessionTimingConfigProps {
  configuration: Partial<GalaxyConfiguration>;
  onUpdate: (config: Partial<GalaxyConfiguration>) => void;
}

const SessionTimingConfig: React.FC<SessionTimingConfigProps> = ({ configuration, onUpdate }) => {
  const timing = configuration.timing || {
    roundDurations: [5, 5, 5, 5, 5],
    totalSessionTime: 25,
    customIntelItems: [],
    alienContactRound: 3,
  };

  // Convert string array to proper intel templates for backward compatibility
  const [customIntelTemplates, setCustomIntelTemplates] = useState<CustomIntelTemplate[]>(() => {
    if (Array.isArray(timing.customIntelItems) && timing.customIntelItems.length > 0) {
      // If they're strings, convert them to templates
      if (typeof timing.customIntelItems[0] === 'string') {
        return timing.customIntelItems.map((item, index) => ({
          id: `legacy_${index}`,
          title: `Custom Intel ${index + 1}`,
          content: item,
          value: 10,
          availableInRound: Math.min(index + 1, 5)
        }));
      }
      // If they're already templates, use them
      return timing.customIntelItems as any;
    }
    return [];
  });

  const updateRoundDuration = (roundIndex: number, duration: number) => {
    const newDurations = [...timing.roundDurations];
    newDurations[roundIndex] = duration;
    const totalTime = newDurations.reduce((sum, d) => sum + d, 0);
    
    onUpdate({
      ...configuration,
      timing: {
        ...timing,
        roundDurations: newDurations,
        totalSessionTime: totalTime,
      },
    });
  };

  const handleIntelTemplatesChange = (templates: CustomIntelTemplate[]) => {
    setCustomIntelTemplates(templates);
    // Store as the full template objects
    onUpdate({
      ...configuration,
      timing: {
        ...timing,
        customIntelItems: templates as any, // Will be properly typed when we update the interface
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Session & Timing Configuration</h3>
        <p className="text-gray-400">
          Configure round durations, session timing, and special events.
        </p>
      </div>

      {/* Round Durations */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Round Durations</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            {timing.roundDurations.map((duration, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-24">
                  <span className="text-gray-400">Round {index + 1}</span>
                </div>
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={duration}
                    onChange={(e) => updateRoundDuration(index, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                        ((duration - 3) / 12) * 100
                      }%, #374151 ${((duration - 3) / 12) * 100}%, #374151 100%)`,
                    }}
                  />
                  <div className="w-20 text-center">
                    <span className="text-cyan-400 font-medium">{duration}</span>
                    <span className="text-gray-400 text-sm ml-1">min</span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 mt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-300">Total Session Time</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-cyan-400">
                    {timing.totalSessionTime}
                  </span>
                  <span className="text-gray-400">minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alien Contact Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Rocket className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Alien Contact</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">
            Configure when alien traders make contact and offer special trading opportunities.
          </p>
          <div className="flex items-center space-x-4">
            <label className="text-gray-300">Alien Contact Round:</label>
            <select
              value={timing.alienContactRound}
              onChange={(e) =>
                onUpdate({
                  ...configuration,
                  timing: { ...timing, alienContactRound: parseInt(e.target.value) },
                })
              }
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value={0}>No alien contact</option>
              {timing.roundDurations.map((_, index) => (
                <option key={index} value={index + 1}>
                  Round {index + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Custom Intel Items */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <IntelItemCreator
          customIntelTemplates={customIntelTemplates}
          onChange={handleIntelTemplatesChange}
          maxRounds={timing.roundDurations.length}
        />
      </div>

      {/* Session Summary */}
      <div className="bg-cyan-900/20 border border-cyan-500/50 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-cyan-400">Session Summary</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Rounds:</span>
            <span className="ml-2 text-white font-medium">5 rounds</span>
          </div>
          <div>
            <span className="text-gray-400">Session Duration:</span>
            <span className="ml-2 text-white font-medium">{timing.totalSessionTime} minutes</span>
          </div>
          <div>
            <span className="text-gray-400">Alien Contact:</span>
            <span className="ml-2 text-white font-medium">
              {timing.alienContactRound === 0
                ? 'Disabled'
                : `Round ${timing.alienContactRound}`}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Custom Intel Items:</span>
            <span className="ml-2 text-white font-medium">
              {customIntelTemplates.length} items
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimingConfig;