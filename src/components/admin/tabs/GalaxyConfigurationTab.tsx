import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ChevronLeft, ChevronRight, Check, AlertCircle, Gamepad2, Settings, Clock, Users, FileText } from 'lucide-react';
import HUDFrame from '../../ui/HUDFrame';
import EventSelector from '../galaxy/EventSelector';
import GalaxyStructureConfig from '../galaxy/GalaxyStructureConfig';
import GameSettingsConfig from '../galaxy/GameSettingsConfig';
import AIConfiguration from '../AIConfiguration';
import SessionTimingConfig from '../galaxy/SessionTimingConfig';
import FacilitatorConfig from '../galaxy/FacilitatorConfig';
import ReportingConfig from '../galaxy/ReportingConfig';
import ConfigurationPreview from '../galaxy/ConfigurationPreview';
import { eventService } from '../../../services/eventService';
import { sessionService } from '../../../services/sessionService';
import type { Event, GalaxyConfiguration, ConfigurationStep } from '../../../types';

const steps: ConfigurationStep[] = [
  { id: 'event', title: 'Event Selection', icon: Gamepad2 },
  { id: 'structure', title: 'Galaxy Structure', icon: Settings },
  { id: 'game', title: 'Game Settings', icon: Gamepad2 },
  { id: 'ai', title: 'AI Configuration', icon: Settings },
  { id: 'timing', title: 'Session & Timing', icon: Clock },
  { id: 'facilitator', title: 'Facilitators', icon: Users },
  { id: 'reporting', title: 'Reporting', icon: FileText },
];

interface GalaxyConfigurationTabProps {
  eventId?: string | null;
}

const GalaxyConfigurationTab: React.FC<GalaxyConfigurationTabProps> = ({ eventId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [configuration, setConfiguration] = useState<Partial<GalaxyConfiguration>>({
    galaxies: [],
    gameMode: 'full_multiplayer',
    victoryConditions: ['economic'],
    tradingRules: {
      crossGalaxyTrading: false,
      tradeRestrictions: [],
    },
    specialRules: {
      resourceDecay: false,
      marketVolatility: 'normal',
    },
    timing: {
      roundDurations: [5, 5, 5, 5, 5],
      totalSessionTime: 25,
      customIntelItems: [],
      alienContactRound: 3,
    },
    facilitators: {
      count: 1,
      permissions: ['view_all', 'manage_trades', 'send_messages'],
    },
    reporting: {
      collectPlayerData: true,
      reportTypes: ['individual', 'team'],
      exportSchedule: 'end_of_session',
    },
  });
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-load event if eventId is provided
  useEffect(() => {
    if (eventId) {
      setIsLoading(true);
      eventService.getEventById(eventId)
        .then(event => {
          if (event) {
            setSelectedEvent(event);
            // Skip to the structure configuration step
            setCurrentStep(1);
          }
        })
        .catch(error => {
          console.error('Error loading event:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [eventId]);

  // Validate current step
  const validateStep = (stepIndex: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (steps[stepIndex].id) {
      case 'event':
        if (!selectedEvent) {
          errors.event = 'Please select an event';
        }
        break;
      case 'structure':
        if (!configuration.galaxies || configuration.galaxies.length === 0) {
          errors.galaxies = 'Please configure at least one galaxy';
        }
        break;
      case 'game':
        if (!configuration.victoryConditions || configuration.victoryConditions.length === 0) {
          errors.victory = 'Please select at least one victory condition';
        }
        break;
      case 'timing':
        if (!configuration.timing?.roundDurations || configuration.timing.roundDurations.length !== 5) {
          errors.timing = 'Please configure all round durations';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!selectedEvent || !configuration) return;
    
    setIsSaving(true);
    try {
      // Generate session IDs and access codes
      await (sessionService as any).generateSessionsForConfiguration?.({
        selectedEventId: selectedEvent.id,
        configuration: configuration as GalaxyConfiguration
      });
      
      // Save configuration
      await eventService.saveGalaxyConfiguration(selectedEvent.id, {
        ...configuration,
        sessionIds,
        createdAt: new Date(),
      } as GalaxyConfiguration);
      
      // Show success message
      alert('Galaxy configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'event':
        return (
          <EventSelector
            onEventSelect={setSelectedEvent}
            selectedEvent={selectedEvent}
          />
        );
      case 'structure':
        return (
          <GalaxyStructureConfig
            configuration={configuration}
            onUpdate={setConfiguration}
            selectedEvent={selectedEvent!}
          />
        );
      case 'game':
        return (
          <GameSettingsConfig
            configuration={configuration}
            onUpdate={setConfiguration}
          />
        );
      case 'ai':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-cyan-400">AI Configuration</h3>
            <AIConfiguration />
          </div>
        );
      case 'timing':
        return (
          <SessionTimingConfig
            configuration={configuration}
            onUpdate={setConfiguration}
          />
        );
      case 'facilitator':
        return (
          <FacilitatorConfig
            configuration={configuration}
            onUpdate={setConfiguration}
          />
        );
      case 'reporting':
        return (
          <ReportingConfig
            configuration={configuration}
            onUpdate={setConfiguration}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <HUDFrame
        variant="info"
        title="Galaxy Configuration"
        status="active"
        className="bg-gray-900/50"
      >
        <div className="space-y-6">
          {/* Loading indicator for event */}
          {isLoading && eventId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-cyan-500/20 border border-cyan-500 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full"
                />
                <span className="text-cyan-400">Loading event details...</span>
              </div>
            </motion.div>
          )}
          
          {/* Success notification when event is loaded from creation */}
          {!isLoading && eventId && selectedEvent && currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/20 border border-green-500 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">Event loaded successfully!</span>
                <span className="text-sm">Configure your galaxy settings below.</span>
              </div>
            </motion.div>
          )}
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <motion.div
                  className={`flex items-center space-x-2 cursor-pointer ${
                    index <= currentStep ? 'text-cyan-400' : 'text-gray-600'
                  }`}
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      index < currentStep
                        ? 'bg-cyan-400 border-cyan-400 text-gray-900'
                        : index === currentStep
                        ? 'border-cyan-400 text-cyan-400'
                        : 'border-gray-600 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden md:inline">
                    {step.title}
                  </span>
                </motion.div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-cyan-400' : 'bg-gray-600'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Please fix the following errors:</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-red-300">
                {Object.values(validationErrors).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-[400px]"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-cyan-900/30">
            <motion.button
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 0
                  ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              onClick={handlePrevious}
              disabled={currentStep === 0}
              whileHover={currentStep > 0 ? { scale: 1.05 } : {}}
              whileTap={currentStep > 0 ? { scale: 0.95 } : {}}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </motion.button>

            <div className="flex items-center space-x-4">
              {currentStep === steps.length - 1 ? (
                <motion.button
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
                  onClick={handleSaveConfiguration}
                  disabled={!selectedEvent || isSaving}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </motion.button>
              ) : (
                <motion.button
                  className="flex items-center space-x-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-all"
                  onClick={handleNext}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </HUDFrame>

      {/* Configuration Preview */}
      {selectedEvent && (
        <ConfigurationPreview
          configuration={configuration}
          event={selectedEvent}
        />
      )}
    </div>
  );
};

export { GalaxyConfigurationTab };