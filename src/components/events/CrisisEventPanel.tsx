import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HUDFrame } from '../ui/HUDFrame';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { ResourceDisplay } from '../ui/ResourceDisplay';
import { Timer } from '../ui/Timer';
import { cn } from '../../utils/cn';
import type { 
  CrisisEvent, 
  CrisisResolution
} from '../../services/eventSystemService';
import type { Resources } from '../../types';

interface CrisisEventPanelProps {
  crisisEvents: CrisisEvent[];
  playerResources: Resources;
  teamId: string;
  onResolveCrisis: (
    eventId: string, 
    resolutionId: string, 
    contributedResources: Partial<Resources>
  ) => void;
  className?: string;
}

interface ResolutionContribution {
  [resourceType: string]: number;
}

export const CrisisEventPanel: React.FC<CrisisEventPanelProps> = ({
  crisisEvents,
  playerResources,
  teamId,
  onResolveCrisis,
  className
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CrisisEvent | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<CrisisResolution | null>(null);
  const [contribution, setContribution] = useState<ResolutionContribution>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Auto-select first event if none selected
  useEffect(() => {
    if (crisisEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(crisisEvents[0]);
    }
  }, [crisisEvents, selectedEvent]);

  const getSeverityColor = (severity: CrisisEvent['severity']) => {
    switch (severity) {
      case 'minor': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5';
      case 'major': return 'text-orange-400 border-orange-400/30 bg-orange-400/5';
      case 'critical': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/5';
    }
  };

  const getSeverityIcon = (severity: CrisisEvent['severity']) => {
    switch (severity) {
      case 'minor': return '⚠️';
      case 'major': return '🚨';
      case 'critical': return '💥';
      default: return '❓';
    }
  };

  const handleResourceContribution = (resourceType: string, amount: number) => {
    setContribution(prev => ({
      ...prev,
      [resourceType]: Math.max(0, Math.min(amount, playerResources[resourceType as keyof Resources] as number))
    }));
  };

  const getTotalContributed = (requirements: Partial<Resources>): boolean => {
    return Object.entries(requirements).every(([resource, required]) => {
      const contributed = contribution[resource] || 0;
      return contributed >= (required || 0);
    });
  };

  const canAffordContribution = (): boolean => {
    return Object.entries(contribution).every(([resource, amount]) => {
      const available = playerResources[resource as keyof Resources] as number;
      return amount <= available;
    });
  };

  const handleConfirmResolution = () => {
    if (selectedEvent && selectedResolution && canAffordContribution()) {
      onResolveCrisis(selectedEvent.id, selectedResolution.id, contribution);
      setContribution({});
      setSelectedResolution(null);
      setShowConfirmation(false);
    }
  };

  const getTimeRemaining = (event: CrisisEvent): number => {
    return Math.max(0, (event.timestamp + event.duration) - Date.now());
  };

  if (crisisEvents.length === 0) {
    return (
      <HUDFrame className={cn("p-4", className)}>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🛡️</div>
          <h3 className="text-lg font-semibold text-green-400 mb-2">
            All Systems Nominal
          </h3>
          <p className="text-gray-400 text-sm">
            No active crisis events detected. Monitoring for potential threats...
          </p>
        </div>
      </HUDFrame>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Crisis Events List */}
      <HUDFrame className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-400">
            🚨 Crisis Events
          </h2>
          <span className="text-sm text-gray-400">
            {crisisEvents.length} active
          </span>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {crisisEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassPanel
                className={cn(
                  "p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                  getSeverityColor(event.severity),
                  selectedEvent?.id === event.id && "ring-2 ring-cyan-400/50"
                )}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getSeverityIcon(event.severity)}</span>
                      <h3 className="font-semibold text-white">{event.title}</h3>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-bold uppercase",
                        getSeverityColor(event.severity)
                      )}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>Round {event.round}</span>
                      <span>•</span>
                      <span>{event.affectedTeams.length} teams affected</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <Timer
                      endTime={event.timestamp + event.duration}
                      className="text-sm"
                      warningThreshold={60000} // 1 minute warning
                    />
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </HUDFrame>

      {/* Selected Crisis Details */}
      <AnimatePresence mode="wait">
        {selectedEvent && (
          <motion.div
            key={selectedEvent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <HUDFrame className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {selectedEvent.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {selectedEvent.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-sm font-bold uppercase mb-2",
                      getSeverityColor(selectedEvent.severity)
                    )}>
                      {selectedEvent.severity}
                    </div>
                    <Timer
                      endTime={selectedEvent.timestamp + selectedEvent.duration}
                      className="text-sm"
                      warningThreshold={60000}
                    />
                  </div>
                </div>

                {/* Effects */}
                <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-3">
                  <h4 className="text-red-300 font-semibold mb-2">Crisis Effects:</h4>
                  <div className="space-y-1">
                    {selectedEvent.effects.map((effect, index) => (
                      <div key={index} className="text-red-200 text-sm">
                        • {effect.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {effect.parameters.resourceTypes && (
                          <span className="text-red-300 ml-2">
                            ({effect.parameters.resourceTypes.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolution Options */}
                <div>
                  <h4 className="text-cyan-300 font-semibold mb-3">Resolution Options:</h4>
                  <div className="space-y-3">
                    {selectedEvent.resolutionOptions.map((resolution, index) => (
                      <motion.div
                        key={resolution.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <GlassPanel
                          className={cn(
                            "p-3 cursor-pointer transition-all duration-200",
                            "border-cyan-400/30 hover:border-cyan-400/50 hover:bg-cyan-400/5",
                            selectedResolution?.id === resolution.id && "ring-2 ring-cyan-400/50 bg-cyan-400/10"
                          )}
                          onClick={() => setSelectedResolution(resolution)}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h5 className="font-semibold text-white">{resolution.title}</h5>
                              <Timer
                                endTime={selectedEvent.timestamp + resolution.timeLimit}
                                className="text-xs text-yellow-400"
                                warningThreshold={30000}
                              />
                            </div>
                            <p className="text-gray-300 text-sm">{resolution.description}</p>
                            
                            <div className="bg-gray-800/50 rounded p-2">
                              <p className="text-yellow-300 text-xs font-semibold mb-1">
                                Required Resources:
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(resolution.requirements).map(([resource, amount]) => (
                                  <div key={resource} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-300 capitalize">
                                      {resource.replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>
                                    <span className="text-yellow-300 font-semibold ml-1">
                                      {amount}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {resolution.teamContributionRequired && (
                              <div className="bg-blue-900/20 border border-blue-400/30 rounded p-2">
                                <p className="text-blue-300 text-xs">
                                  ⚡ Requires team collaboration
                                </p>
                              </div>
                            )}
                          </div>
                        </GlassPanel>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Resource Contribution Interface */}
                {selectedResolution && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4"
                  >
                    <h4 className="text-white font-semibold mb-3">Contribute Resources</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {Object.entries(selectedResolution.requirements).map(([resource, required]) => {
                        const available = playerResources[resource as keyof Resources] as number;
                        const contributed = contribution[resource] || 0;
                        
                        return (
                          <div key={resource} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-gray-300 capitalize text-sm">
                                {resource.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <span className="text-xs text-gray-400">
                                Available: {available}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="range"
                                min="0"
                                max={Math.min(available, required || 0)}
                                value={contributed}
                                onChange={(e) => handleResourceContribution(resource, parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="text-right min-w-[60px]">
                                <div className={cn(
                                  "text-sm font-semibold",
                                  contributed >= (required || 0) ? "text-green-400" : "text-yellow-400"
                                )}>
                                  {contributed}/{required}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResourceContribution(resource, 0)}
                                className="text-xs px-2 py-1"
                              >
                                None
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResourceContribution(resource, Math.min(available, required || 0))}
                                className="text-xs px-2 py-1"
                              >
                                Max
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-600/50">
                      <div className="text-sm">
                        {getTotalContributed(selectedResolution.requirements) ? (
                          <span className="text-green-400">✓ Requirements met</span>
                        ) : (
                          <span className="text-yellow-400">⚠ Insufficient contribution</span>
                        )}
                      </div>
                      
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedResolution(null);
                            setContribution({});
                          }}
                          className="text-gray-300 border-gray-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => setShowConfirmation(true)}
                          disabled={!getTotalContributed(selectedResolution.requirements) || !canAffordContribution()}
                          className={cn(
                            "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600",
                            (!getTotalContributed(selectedResolution.requirements) || !canAffordContribution()) && 
                            "opacity-50 cursor-not-allowed"
                          )}
                        >
                          Resolve Crisis
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </HUDFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmation && selectedEvent && selectedResolution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 border border-cyan-400/50 rounded-lg p-6 max-w-md mx-4"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                Confirm Crisis Resolution
              </h3>
              <div className="space-y-3 mb-6">
                <p className="text-gray-300">
                  Attempting to resolve: <span className="text-cyan-400 font-semibold">{selectedEvent.title}</span>
                </p>
                <p className="text-gray-300">
                  Using strategy: <span className="text-green-400 font-semibold">{selectedResolution.title}</span>
                </p>
                <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3">
                  <p className="text-yellow-300 text-sm font-semibold mb-2">Resources to be consumed:</p>
                  <div className="space-y-1">
                    {Object.entries(contribution).map(([resource, amount]) => (
                      amount > 0 && (
                        <ResourceDisplay
                          key={resource}
                          type={resource as keyof Resources}
                          amount={amount}
                          className="text-sm"
                        />
                      )
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="text-gray-300 border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmResolution}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                  Execute Resolution
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};