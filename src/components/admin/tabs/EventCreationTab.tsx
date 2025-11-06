import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameService } from '../../../services/GameService';

interface EventCreationTabProps {
  onActivityUpdate: (activity: {
    time: string;
    text: string;
    type: 'CREATE' | 'SUCCESS' | 'WARNING' | 'JOIN' | 'BACKUP' | 'ERROR';
  }) => void;
  selectedTemplate?: { name: string; duration: string };
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onTabChange?: (tabId: string) => void;
  onEventCreated?: (eventId: string) => void;
}

export const EventCreationTab: React.FC<EventCreationTabProps> = ({ onActivityUpdate, selectedTemplate, onShowToast, onTabChange, onEventCreated }) => {
  // Form states
  const [eventName, setEventName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [participants, setParticipants] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventInfo, setCreatedEventInfo] = useState<{ eventId: string } | null>(null);

  // Handle template selection
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.name) {
      setEventName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  const handleCreateEvent = async () => {
    // Form validation
    if (!eventName || !organizationName) {
      onShowToast?.('Please fill in all required fields', 'warning');
      return;
    }
    
    if (participants && (parseInt(participants) < 1 || parseInt(participants) > 500)) {
      onShowToast?.('Participants must be between 1 and 500', 'warning');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Create the event in Firebase
      const eventId = await GameService.createEvent(
        eventName,
        organizationName,
        (eventType as 'team-building' | 'leadership' | 'skills-training' | 'other') || 'team-building',
        parseInt(participants) || 20,
        eventDescription || undefined,
        eventDate || undefined
      );
      
      // Log activity
      const newActivity = {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        text: `New event "${eventName}" created with ID: ${eventId}`,
        type: 'CREATE' as const
      };
      onActivityUpdate(newActivity);
      
      // Show success notification
      onShowToast?.(
        `Event created successfully! Proceed to Galaxy Configuration to set up game sessions.`, 
        'success'
      );
      
      // Store event info for modal
      setCreatedEventInfo({ eventId });
      setShowSuccessModal(true);
      
      // Notify parent component about the created event
      onEventCreated?.(eventId);
      
      // Reset all fields
      setEventName('');
      setOrganizationName('');
      setParticipants('');
      setEventDate('');
      setEventType('');
      setEventDescription('');
      setValidationErrors({});
      
    } catch (error) {
      console.error('Error creating event:', error);
      
      // Log error activity
      const errorActivity = {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        text: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'ERROR' as const
      };
      onActivityUpdate(errorActivity);
      
      // Show error notification
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
    paddingRight: '2.5rem',
    pointerEvents: 'auto' as const,
    zIndex: 10,
    position: 'relative' as const
  };

  const onInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#ff9500';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 149, 0, 0.2)';
  };

  const onInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#00d4ff';
    e.currentTarget.style.boxShadow = 'none';
  };

  // Validation functions
  const validateParticipants = (value: string) => {
    const num = parseInt(value);
    if (value && (isNaN(num) || num < 1 || num > 500)) {
      setValidationErrors(prev => ({ ...prev, participants: 'Must be between 1-500' }));
    } else {
      setValidationErrors(prev => {
        const { participants: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <div className="p-4" style={{ padding: '10%' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="form-group">
          <label 
            className="block mb-2 text-xs sm:text-sm uppercase tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff'
            }}
          >
            Event Name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Q1 Leadership Workshop"
            className="form-input w-full px-3 py-3 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 rounded-md border transition-all focus:outline-none min-h-[44px]"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div className="form-group">
          <label 
            className="block mb-2 text-xs sm:text-sm uppercase tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff'
            }}
          >
            Organization
          </label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Company or Team Name"
            className="form-input w-full px-3 py-3 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 rounded-md border transition-all focus:outline-none min-h-[44px]"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div className="form-group">
          <label 
            className="block mb-2 text-xs sm:text-sm uppercase tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff'
            }}
          >
            Event Type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="form-input w-full px-3 py-3 sm:px-4 sm:py-3 text-sm sm:text-base text-white rounded-md border transition-all focus:outline-none appearance-none min-h-[44px]"
            style={selectStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          >
            <option value="">Select Type</option>
            <option value="team-building">Team Building</option>
            <option value="leadership">Leadership Development</option>
            <option value="onboarding">Employee Onboarding</option>
            <option value="training">Skills Training</option>
          </select>
        </div>

        <div className="form-group">
          <label 
            className="block mb-2 text-xs sm:text-sm uppercase tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff'
            }}
          >
            Total Participants
          </label>
          <input
            type="number"
            value={participants}
            onChange={(e) => {
              setParticipants(e.target.value);
              validateParticipants(e.target.value);
            }}
            placeholder="1-500"
            min="1"
            max="500"
            className="form-input w-full px-3 py-3 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 rounded-md border transition-all focus:outline-none min-h-[44px]"
            style={{
              ...inputStyle,
              borderColor: validationErrors.participants ? '#ff4757' : inputStyle.borderColor
            }}
            onFocus={onInputFocus}
            onBlur={(e) => {
              onInputBlur(e);
              validateParticipants(e.target.value);
            }}
          />
          {validationErrors.participants && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs mt-1"
              style={{ color: '#ff4757', fontFamily: 'monospace' }}
            >
              ⚠ {validationErrors.participants}
            </motion.p>
          )}
        </div>

        <div className="form-group">
          <label 
            className="block mb-2 text-xs sm:text-sm uppercase tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff'
            }}
          >
            Event Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="form-input w-full px-3 py-3 sm:px-4 sm:py-3 text-sm sm:text-base text-white rounded-md border transition-all focus:outline-none min-h-[44px]"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div className="form-group col-span-1 lg:col-span-2">
          <label 
            className="block mb-2 text-xs sm:text-sm uppercase tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff'
            }}
          >
            Event Description
          </label>
          <textarea
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            placeholder="Brief description of the event purpose and goals..."
            rows={3}
            className="form-input w-full px-3 py-3 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 rounded-md border transition-all focus:outline-none resize-none"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        {/* Action Buttons */}
        <div className="col-span-1 lg:col-span-2 flex flex-col sm:flex-row gap-3 sm:gap-6 mt-6">
          <motion.button
            onClick={handleCreateEvent}
            disabled={!eventName || !organizationName || isCreating}
            className="btn px-4 py-3 sm:px-6 sm:py-3 min-h-[44px] font-semibold rounded-md relative overflow-hidden transition-all text-sm sm:text-base"
            style={{
              fontFamily: 'Orbitron, monospace',
              border: '2px solid #00ff88',
              background: 'rgba(10, 10, 15, 0.8)',
              color: '#00ff88'
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff9500';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#00ff88';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <motion.div
              className="absolute top-0 left-0 w-full h-0.5"
              style={{
                background: 'linear-gradient(90deg, transparent, #00ff88, transparent)'
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
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
          </motion.button>

          <motion.button
            className="btn px-4 py-3 sm:px-6 sm:py-3 min-h-[44px] font-semibold rounded-md relative overflow-hidden transition-all text-sm sm:text-base"
            style={{
              fontFamily: 'Orbitron, monospace',
              border: '2px solid #00d4ff',
              background: 'rgba(10, 10, 15, 0.8)',
              color: 'white'
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff9500';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#00d4ff';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <motion.div
              className="absolute top-0 left-0 w-full h-0.5"
              style={{
                background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)'
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Save as Template
          </motion.button>

          <motion.button
            onClick={() => {
              setEventName('');
              setOrganizationName('');
              setParticipants('');
              setEventDate('');
              setEventType('');
              setEventDescription('');
              setValidationErrors({});
            }}
            className="btn px-4 py-3 sm:px-6 sm:py-3 min-h-[44px] font-semibold rounded-md relative overflow-hidden transition-all text-sm sm:text-base"
            style={{
              fontFamily: 'Orbitron, monospace',
              border: '2px solid #ff4757',
              background: 'rgba(10, 10, 15, 0.8)',
              color: '#ff4757'
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff9500';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 71, 87, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ff4757';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <motion.div
              className="absolute top-0 left-0 w-full h-0.5"
              style={{
                background: 'linear-gradient(90deg, transparent, #ff4757, transparent)'
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Clear Form
          </motion.button>
        </div>
      </div>
      
      {/* Success Modal */}
      {showSuccessModal && createdEventInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSuccessModal(false);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 p-8 rounded-lg border-2 border-green-500 max-w-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(10, 10, 15, 0.95)',
              boxShadow: '0 0 40px rgba(0, 255, 136, 0.3)'
            }}
          >
            <h2 
              className="text-2xl font-bold mb-4"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#00ff88'
              }}
            >
              ✅ Event Created Successfully!
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                  Event ID:
                </label>
                <p className="text-lg font-mono" style={{ color: '#fff' }}>
                  {createdEventInfo.eventId}
                </p>
              </div>
              
              <div>
                <label className="text-sm uppercase tracking-wider" style={{ color: '#00d4ff' }}>
                  Next Steps:
                </label>
                <ul className="list-disc list-inside text-sm space-y-1" style={{ color: '#a0a0a0' }}>
                  <li>Navigate to Galaxy Configuration to set up game sessions</li>
                  <li>Configure teams, AI settings, and game parameters</li>
                  <li>Generate game codes for participants</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-4">
              <motion.button
                className="flex-1 px-6 py-3 font-semibold rounded-md"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  background: '#00ff88',
                  color: '#000'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedEventInfo(null);
                  onTabChange?.('galaxy-configuration');
                }}
              >
                Go to Galaxy Configuration →
              </motion.button>
              
              <motion.button
                className="px-6 py-3 font-semibold rounded-md"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  border: '2px solid #00ff88',
                  background: 'rgba(0, 255, 136, 0.1)',
                  color: '#00ff88'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedEventInfo(null);
                }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};