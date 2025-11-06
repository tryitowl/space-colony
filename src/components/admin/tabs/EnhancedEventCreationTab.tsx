import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalaxyConfigurationForm } from '../GalaxyConfigurationForm';
import { GameService } from '../../../services/GameService';
import { FlexibleGameService } from '../../../services/flexibleGameService';
import { galaxyConfigurationService } from '../../../services/galaxyConfigurationService';
import type { GalaxyConfiguration } from '../../../types/galaxy.types';
import { HUDFrame } from '../../ui/HUDFrame';
import { GlassPanel } from '../../ui/GlassPanel';
import { Button } from '../../ui/Button';

interface EnhancedEventCreationTabProps {
  onActivityUpdate: (activity: {
    time: string;
    text: string;
    type: 'CREATE' | 'SUCCESS' | 'WARNING' | 'JOIN' | 'BACKUP' | 'ERROR';
  }) => void;
  selectedTemplate?: { name: string; duration: string };
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onTabChange?: (tabId: string) => void;
}

interface EventFormData {
  eventName: string;
  organizationName: string;
  participantCount: number;
  duration: string;
  eventDate: string;
  eventTime: string;
  facilitatorEmail: string;
  eventType: string;
  description: string;
}

export const EnhancedEventCreationTab: React.FC<EnhancedEventCreationTabProps> = ({
  onActivityUpdate,
  selectedTemplate,
  onShowToast,
  onTabChange
}) => {
  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [eventData, setEventData] = useState<EventFormData>({
    eventName: '',
    organizationName: '',
    participantCount: 24,
    duration: '90',
    eventDate: '',
    eventTime: '',
    facilitatorEmail: '',
    eventType: 'team-building',
    description: ''
  });

  const [galaxyConfig, setGalaxyConfig] = useState<GalaxyConfiguration | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [, setConfigIssues] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSessionInfo, setCreatedSessionInfo] = useState<{
    sessionId: string;
    eventId: string;
    galaxyCodes: Array<{ galaxyName: string; code: string }>;
  } | null>(null);

  // Save/Load functionality
  const [savedConfigs, setSavedConfigs] = useState<Array<{
    id: string;
    name: string;
    timestamp: number;
    config: GalaxyConfiguration;
  }>>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');

  // Apply template if selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.name) {
      setEventData(prev => ({
        ...prev,
        eventName: selectedTemplate.name,
        duration: selectedTemplate.duration
      }));
    }
  }, [selectedTemplate]);

  // Load saved configurations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('galaxy_configs');
    if (saved) {
      setSavedConfigs(JSON.parse(saved));
    }
  }, []);

  const saveConfiguration = () => {
    if (!configName || !galaxyConfig) return;

    const newConfig = {
      id: `config_${Date.now()}`,
      name: configName,
      timestamp: Date.now(),
      config: galaxyConfig
    };

    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem('galaxy_configs', JSON.stringify(updated));
    
    setShowSaveDialog(false);
    setConfigName('');
    onShowToast?.('Configuration saved successfully!', 'success');
  };

  const loadConfiguration = (configId: string) => {
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      setGalaxyConfig(config.config);
      onShowToast?.(`Loaded configuration: ${config.name}`, 'info');
    }
  };

  const deleteConfiguration = (configId: string) => {
    const updated = savedConfigs.filter(c => c.id !== configId);
    setSavedConfigs(updated);
    localStorage.setItem('galaxy_configs', JSON.stringify(updated));
    onShowToast?.('Configuration deleted', 'info');
  };

  const validateStep1 = (): boolean => {
    if (!eventData.eventName || !eventData.organizationName) {
      onShowToast?.('Please fill in all required fields', 'warning');
      return false;
    }

    if (eventData.participantCount < 10 || eventData.participantCount > 360) {
      onShowToast?.('Participants must be between 10 and 360', 'warning');
      return false;
    }

    if (eventData.facilitatorEmail && !eventData.facilitatorEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      onShowToast?.('Please enter a valid email address', 'warning');
      return false;
    }

    return true;
  };

  const handleCreateEvent = async () => {
    if (!galaxyConfig || !isConfigValid) {
      onShowToast?.('Please complete galaxy configuration', 'warning');
      return;
    }

    setIsCreating(true);

    try {
      // Create the event
      const eventId = await GameService.createEvent(
        eventData.eventName,
        eventData.organizationName,
        (eventData.eventType as 'team-building' | 'leadership' | 'skills-training' | 'other') || 'team-building',
        eventData.participantCount || 20,
        eventData.description
      );

      // Create flexible session with galaxy configuration
      const sessionId = await FlexibleGameService.createFlexibleSession(
        eventId,
        eventData.eventName,
        galaxyConfig,
        [] // AI configs - will be added later if needed
      );
      
      // Get session code mapping for display
      const sessionData = await FlexibleGameService.getFlexibleSession(sessionId);
      const galaxyCodes: Array<{ galaxyName: string; code: string }> = [];
      
      if (sessionData && sessionData.sessionCodeMapping) {
        Object.values(sessionData.sessionCodeMapping.galaxyMappings).forEach(mapping => {
          galaxyCodes.push({
            galaxyName: mapping.galaxyName,
            code: sessionData.sessionCodeMapping.masterCode || sessionId.substring(0, 4).toUpperCase()
          });
        });
      }

      // Save configuration as template if it's custom
      if (galaxyConfig && galaxyConfig.galaxies && galaxyConfig.galaxies.length > 0 && (galaxyConfig.galaxies.length > 1 || galaxyConfig.galaxies[0].aiEnabled)) {
        await galaxyConfigurationService.saveAsTemplate(
          galaxyConfig,
          `${eventData.eventName} Config`,
          `Configuration for ${eventData.eventName}`,
          eventData.facilitatorEmail || 'admin_user'
        );
      }

      // Log activity
      const newActivity = {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        text: `Created multi-galaxy event "${eventData.eventName}" with ${galaxyConfig?.galaxies?.length || 0} galaxies`,
        type: 'CREATE' as const
      };
      onActivityUpdate(newActivity);

      // Show success
      onShowToast?.(
        `Event created successfully with ${galaxyConfig?.galaxies?.length || 0} galaxies!`,
        'success'
      );

      setCreatedSessionInfo({
        sessionId: sessionId,
        eventId,
        galaxyCodes
      });
      setShowSuccessModal(true);

      // Reset form
      setCurrentStep(1);
      setEventData({
        eventName: '',
        organizationName: '',
        participantCount: 24,
        duration: '90',
        eventDate: '',
        eventTime: '',
        facilitatorEmail: '',
        eventType: 'team-building',
        description: ''
      });
      setGalaxyConfig(null);

    } catch (error) {
      console.error('Error creating event:', error);
      
      const errorActivity = {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        text: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'ERROR' as const
      };
      onActivityUpdate(errorActivity);
      
      onShowToast?.(
        `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const inputStyle = {
    background: 'rgba(10, 10, 15, 0.8)',
    borderColor: '#00d4ff',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.9rem'
  };

  const selectStyle = {
    ...inputStyle,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2300d4ff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5rem 1.5rem',
    paddingRight: '2.5rem'
  };

  const onInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#ff9500';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 149, 0, 0.2)';
  };

  const onInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#00d4ff';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <motion.div
              className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all cursor-pointer ${
                currentStep >= step
                  ? 'border-cyan-400 bg-cyan-400/20'
                  : 'border-gray-600 bg-gray-800/50'
              }`}
              onClick={() => {
                if (step === 1 || (step === 2 && validateStep1())) {
                  setCurrentStep(step);
                }
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span
                className="font-bold"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  color: currentStep >= step ? '#00d4ff' : '#666'
                }}
              >
                {step}
              </span>
            </motion.div>
            {step < 3 && (
              <div
                className={`flex-1 h-0.5 transition-all ${
                  currentStep > step ? 'bg-cyan-400' : 'bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Basic Event Information */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HUDFrame className="p-6">
              <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
                Event Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Event Name *
                  </label>
                  <input
                    type="text"
                    value={eventData.eventName}
                    onChange={(e) => setEventData({ ...eventData, eventName: e.target.value })}
                    placeholder="e.g., Q1 Leadership Workshop"
                    className="w-full px-4 py-3 text-white placeholder-gray-500 rounded-md border transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Organization *
                  </label>
                  <input
                    type="text"
                    value={eventData.organizationName}
                    onChange={(e) => setEventData({ ...eventData, organizationName: e.target.value })}
                    placeholder="Company or Team Name"
                    className="w-full px-4 py-3 text-white placeholder-gray-500 rounded-md border transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Total Participants *
                  </label>
                  <input
                    type="number"
                    value={eventData.participantCount}
                    onChange={(e) => setEventData({ ...eventData, participantCount: parseInt(e.target.value) || 0 })}
                    min="10"
                    max="360"
                    className="w-full px-4 py-3 text-white placeholder-gray-500 rounded-md border transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                  <p className="text-xs text-gray-400 mt-1">10-360 participants supported</p>
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Event Type
                  </label>
                  <select
                    value={eventData.eventType}
                    onChange={(e) => setEventData({ ...eventData, eventType: e.target.value })}
                    className="w-full px-4 py-3 text-white rounded-md border transition-all appearance-none"
                    style={selectStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  >
                    <option value="team-building">Team Building</option>
                    <option value="leadership">Leadership Development</option>
                    <option value="onboarding">Employee Onboarding</option>
                    <option value="training">Skills Training</option>
                    <option value="tournament">Tournament</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventData.eventDate}
                    onChange={(e) => setEventData({ ...eventData, eventDate: e.target.value })}
                    className="w-full px-4 py-3 text-white rounded-md border transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={eventData.eventTime}
                    onChange={(e) => setEventData({ ...eventData, eventTime: e.target.value })}
                    className="w-full px-4 py-3 text-white rounded-md border transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Session Duration
                  </label>
                  <select
                    value={eventData.duration}
                    onChange={(e) => setEventData({ ...eventData, duration: e.target.value })}
                    className="w-full px-4 py-3 text-white rounded-md border transition-all appearance-none"
                    style={selectStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  >
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="90">90 Minutes</option>
                    <option value="120">120 Minutes</option>
                    <option value="custom">Custom Duration</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Facilitator Email
                  </label>
                  <input
                    type="email"
                    value={eventData.facilitatorEmail}
                    onChange={(e) => setEventData({ ...eventData, facilitatorEmail: e.target.value })}
                    placeholder="facilitator@company.com"
                    className="w-full px-4 py-3 text-white placeholder-gray-500 rounded-md border transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-2 text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Event Description
                  </label>
                  <textarea
                    value={eventData.description}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                    placeholder="Brief description of the event objectives and format..."
                    rows={3}
                    className="w-full px-4 py-3 text-white placeholder-gray-500 rounded-md border transition-all resize-none"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => {
                    if (validateStep1()) {
                      setCurrentStep(2);
                    }
                  }}
                  variant="primary"
                >
                  Next: Galaxy Configuration →
                </Button>
              </div>
            </HUDFrame>
          </motion.div>
        )}

        {/* Step 2: Galaxy Configuration */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HUDFrame className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
                  Galaxy Configuration
                </h3>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowSaveDialog(true)}
                    variant="secondary"
                    size="sm"
                    disabled={!galaxyConfig}
                  >
                    Save Config
                  </Button>
                  
                  {savedConfigs.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          loadConfiguration(e.target.value);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-600 text-sm"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <option value="">Load Config...</option>
                      {savedConfigs.map((config) => (
                        <option key={config.id} value={config.id}>
                          {config.name} ({new Date(config.timestamp).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <GalaxyConfigurationForm
                onConfigChange={setGalaxyConfig}
                onValidationChange={(valid, issues) => {
                  setIsConfigValid(valid);
                  setConfigIssues(issues);
                }}
                participantCount={eventData.participantCount}
              />

              <div className="flex justify-between mt-6">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="secondary"
                >
                  ← Back
                </Button>
                
                <Button
                  onClick={() => setCurrentStep(3)}
                  variant="primary"
                  disabled={!isConfigValid}
                >
                  Next: Review & Create →
                </Button>
              </div>
            </HUDFrame>
          </motion.div>
        )}

        {/* Step 3: Review and Create */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HUDFrame className="p-6">
              <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
                Review & Create Event
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Summary */}
                <GlassPanel className="p-4">
                  <h4 className="font-semibold mb-3" style={{ color: '#00ff88' }}>Event Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Name:</span>
                      <span className="text-white">{eventData.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Organization:</span>
                      <span className="text-white">{eventData.organizationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Participants:</span>
                      <span className="text-white">{eventData.participantCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Duration:</span>
                      <span className="text-white">{eventData.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Date:</span>
                      <span className="text-white">{eventData.eventDate || 'Not set'}</span>
                    </div>
                  </div>
                </GlassPanel>

                {/* Galaxy Summary */}
                <GlassPanel className="p-4">
                  <h4 className="font-semibold mb-3" style={{ color: '#ff9500' }}>Galaxy Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Galaxies:</span>
                      <span className="text-white">{galaxyConfig?.galaxies?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Total Teams:</span>
                      <span className="text-white">
                        {galaxyConfig?.galaxies?.reduce((sum, g) => sum + (g.totalTeams || 4), 0) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Cross-Galaxy Trading:</span>
                      <span className="text-white">{galaxyConfig?.crossGalaxyTrading ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#a0a0a0' }}>Competition Mode:</span>
                      <span className="text-white capitalize">{galaxyConfig?.competitionMode || 'N/A'}</span>
                    </div>
                  </div>
                </GlassPanel>
              </div>

              {/* Galaxy Details */}
              {galaxyConfig && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold" style={{ color: '#00d4ff' }}>Galaxy Details</h4>
                  {(galaxyConfig.galaxies || []).map((galaxy, _index) => (
                    <GlassPanel key={galaxy.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold" style={{ color: '#00ff88' }}>{galaxy.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span style={{ color: '#a0a0a0' }}>
                            Teams: <span className="text-white">{galaxy.totalTeams}</span>
                          </span>
                          <span style={{ color: '#a0a0a0' }}>
                            AI: <span style={{ color: '#ff9500' }}>{galaxy.aiEnabled ? 'Yes' : 'No'}</span>
                          </span>
                          <span style={{ color: '#a0a0a0' }}>
                            Types: <span className="text-white">{(galaxy.colonyTypes || []).length}</span>
                          </span>
                        </div>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="secondary"
                >
                  ← Back
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setCurrentStep(1);
                      setEventData({
                        eventName: '',
                        organizationName: '',
                        participantCount: 24,
                        duration: '90',
                        eventDate: '',
                        eventTime: '',
                        facilitatorEmail: '',
                        eventType: 'team-building',
                        description: ''
                      });
                      setGalaxyConfig(null);
                    }}
                    variant="danger"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleCreateEvent}
                    variant="primary"
                    disabled={!isConfigValid || isCreating}
                  >
                    {isCreating ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-4 h-4 border-2 border-t-transparent border-r-transparent rounded-full"
                          style={{ borderColor: '#00ff88' }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <span>Creating Event...</span>
                      </div>
                    ) : (
                      'Create Event'
                    )}
                  </Button>
                </div>
              </div>
            </HUDFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Configuration Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 p-6 rounded-lg border-2 border-cyan-400 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
                Save Configuration
              </h3>
              
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Configuration name..."
                className="w-full px-4 py-3 mb-4 text-white placeholder-gray-500 rounded-md border transition-all"
                style={inputStyle}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                autoFocus
              />
              
              <div className="flex justify-end gap-3">
                <Button onClick={() => setShowSaveDialog(false)} variant="secondary">
                  Cancel
                </Button>
                <Button onClick={saveConfiguration} variant="primary" disabled={!configName}>
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && createdSessionInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 p-8 rounded-lg border-2 border-green-500 max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(10, 10, 15, 0.95)',
                boxShadow: '0 0 40px rgba(0, 255, 136, 0.3)'
              }}
            >
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Orbitron, monospace', color: '#00ff88' }}>
                ✅ Event Created Successfully!
              </h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Event ID:
                  </label>
                  <p className="text-lg font-mono" style={{ color: '#fff' }}>
                    {createdSessionInfo.eventId}
                  </p>
                </div>
                
                {createdSessionInfo.galaxyCodes.length > 0 && (
                  <div>
                    <label className="text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                      Galaxy Access Codes:
                    </label>
                    <div className="mt-2 space-y-2">
                      {createdSessionInfo.galaxyCodes.map((galaxy, index) => (
                        <div key={index} className="flex justify-between items-center p-2 rounded bg-gray-800/50">
                          <span style={{ color: '#a0a0a0' }}>{galaxy.galaxyName}:</span>
                          <span className="font-mono text-lg" style={{ color: '#00ff88' }}>{galaxy.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                    Next Steps:
                  </label>
                  <ul className="list-disc list-inside text-sm space-y-1" style={{ color: '#a0a0a0' }}>
                    <li>Navigate to the Sessions & Activity tab to manage teams</li>
                    <li>Share the galaxy codes with participants</li>
                    <li>Monitor session progress in real-time</li>
                    <li>Use the Facilitator Dashboard during the event</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCreatedSessionInfo(null);
                    onTabChange?.('sessions-activity');
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  View Sessions & Teams →
                </Button>
                
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCreatedSessionInfo(null);
                  }}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Configurations List */}
      {savedConfigs.length > 0 && (
        <GlassPanel className="p-4 mt-6">
          <h4 className="font-semibold mb-3" style={{ color: '#00d4ff' }}>Saved Configurations</h4>
          <div className="space-y-2">
            {savedConfigs.map((config) => (
              <div key={config.id} className="flex justify-between items-center p-2 rounded bg-gray-800/50">
                <div>
                  <span className="font-semibold">{config.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(config.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => loadConfiguration(config.id)}
                    variant="secondary"
                    size="sm"
                  >
                    Load
                  </Button>
                  <Button
                    onClick={() => deleteConfiguration(config.id)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
};