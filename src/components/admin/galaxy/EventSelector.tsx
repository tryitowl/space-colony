import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Building2, ChevronDown, Check } from 'lucide-react';
import { eventService } from '../../../services/eventService';
import type { Event } from '../../../types';

interface EventSelectorProps {
  onEventSelect: (event: Event | null) => void;
  selectedEvent: Event | null;
}

const EventSelector: React.FC<EventSelectorProps> = ({ onEventSelect, selectedEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const activeEvents = await eventService.getActiveEvents();
      setEvents(activeEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventSelect = (event: Event) => {
    onEventSelect(event);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Select Event</h3>
        <p className="text-gray-400">
          Choose an existing event to configure galaxy settings for. Only active events are shown.
        </p>
      </div>

      {/* Event Dropdown */}
      <div className="relative">
        <motion.button
          className="w-full px-6 py-4 bg-gray-800 border border-cyan-900/50 rounded-lg text-left hover:border-cyan-500/50 transition-all"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {selectedEvent ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Calendar className="w-6 h-6 text-cyan-400" />
                <div>
                  <h4 className="font-medium text-white">{selectedEvent.name}</h4>
                  <p className="text-sm text-gray-400">
                    {selectedEvent.organization} • {new Date(selectedEvent.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Select an event...</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          )}
        </motion.button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 w-full mt-2 bg-gray-900 border border-cyan-900/50 rounded-lg shadow-xl overflow-hidden"
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-400">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No active events found</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <motion.button
                    key={event.id}
                    className={`w-full px-4 py-3 text-left hover:bg-cyan-900/20 transition-colors ${
                      selectedEvent?.id === event.id ? 'bg-cyan-900/30' : ''
                    }`}
                    onClick={() => handleEventSelect(event)}
                    whileHover={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-cyan-400" />
                        <div>
                          <h5 className="font-medium text-white">{event.name}</h5>
                          <p className="text-sm text-gray-400">
                            {event.organization} • {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {selectedEvent?.id === event.id && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Event Details */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 border border-cyan-900/30 rounded-lg p-6 space-y-4"
        >
          <h4 className="text-lg font-medium text-cyan-400">Event Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-gray-400">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">Organization</span>
              </div>
              <p className="text-white font-medium">{selectedEvent.organization}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-gray-400">
                <Users className="w-4 h-4" />
                <span className="text-sm">Total Participants</span>
              </div>
              <p className="text-white font-medium">{selectedEvent.participantCount || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Event Date</span>
              </div>
              <p className="text-white font-medium">
                {new Date(selectedEvent.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          {selectedEvent.description && (
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-300">{selectedEvent.description}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default EventSelector;