import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Check, AlertCircle, Globe, Users, Clock, Shield, FileText } from 'lucide-react';
import type { Event, GalaxyConfiguration } from '../../../types';

interface ConfigurationPreviewProps {
  configuration: Partial<GalaxyConfiguration>;
  event: Event;
}

const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({ configuration, event }) => {
  const isConfigurationComplete = () => {
    return (
      configuration.galaxies &&
      configuration.galaxies.length > 0 &&
      configuration.victoryConditions &&
      configuration.victoryConditions.length > 0 &&
      configuration.timing &&
      configuration.timing.roundDurations.length === 5
    );
  };

  const getTotalParticipants = () => {
    return configuration.galaxies?.reduce((sum, galaxy) => sum + galaxy.participantCount, 0) || 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 border border-cyan-900/30 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-cyan-400">Configuration Preview</h3>
        </div>
        {isConfigurationComplete() ? (
          <div className="flex items-center space-x-2 text-green-400">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Configuration Complete</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Configuration Incomplete</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Event Summary */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300 flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>Event Details</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Event:</span>
              <span className="ml-2 text-white">{event.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Organization:</span>
              <span className="ml-2 text-white">{event.organization}</span>
            </div>
            <div>
              <span className="text-gray-400">Date:</span>
              <span className="ml-2 text-white">
                {new Date(event.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Galaxy Configuration */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300 flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>Galaxy Structure</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Galaxies:</span>
              <span className="ml-2 text-white">{configuration.galaxies?.length || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Participants:</span>
              <span className="ml-2 text-white">
                {getTotalParticipants()} / {event.participantCount || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Game Mode:</span>
              <span className="ml-2 text-white capitalize">
                {configuration.gameMode?.replace('_', ' ') || 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Session Timing */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300 flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Session Timing</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Total Duration:</span>
              <span className="ml-2 text-white">
                {configuration.timing?.totalSessionTime || 0} minutes
              </span>
            </div>
            <div>
              <span className="text-gray-400">Rounds:</span>
              <span className="ml-2 text-white">5 rounds</span>
            </div>
            <div>
              <span className="text-gray-400">Alien Contact:</span>
              <span className="ml-2 text-white">
                {configuration.timing?.alienContactRound === 0
                  ? 'Disabled'
                  : `Round ${configuration.timing?.alienContactRound || 'Not set'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Facilitators */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300 flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Facilitators</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Count:</span>
              <span className="ml-2 text-white">{configuration.facilitators?.count || 1}</span>
            </div>
            <div>
              <span className="text-gray-400">Permissions:</span>
              <span className="ml-2 text-white">
                {configuration.facilitators?.permissions?.length || 0} active
              </span>
            </div>
          </div>
        </div>

        {/* Victory Conditions */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300 flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Victory Conditions</span>
          </h4>
          <div className="space-y-1 text-sm">
            {configuration.victoryConditions?.map((condition) => (
              <div key={condition} className="text-white capitalize">
                • {condition}
              </div>
            )) || <span className="text-gray-400">None selected</span>}
          </div>
        </div>

        {/* Reporting */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300 flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Reporting</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Data Collection:</span>
              <span className="ml-2 text-white">
                {configuration.reporting?.collectPlayerData ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Report Types:</span>
              <span className="ml-2 text-white">
                {configuration.reporting?.reportTypes?.length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Access Codes Preview */}
      {configuration.galaxies && configuration.galaxies.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="font-medium text-gray-300 mb-3">Access Code Format</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-gray-400">Player Codes:</span>
              <div className="mt-1 space-y-1">
                {configuration.galaxies.map((galaxy) => (
                  <div key={galaxy.id}>
                    <span className="text-cyan-400 font-mono">
                      {event.code || 'XXXX'}-{galaxy.code}
                    </span>
                    <span className="text-gray-400 ml-2">({galaxy.name})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-gray-400">Facilitator Codes:</span>
              <div className="mt-1">
                <span className="text-cyan-400 font-mono">
                  FACI-001 to FACI-{String(configuration.facilitators?.count || 1).padStart(3, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Actions */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex items-center space-x-3">
            <motion.button
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Export Config
            </motion.button>
            <motion.button
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Load Template
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConfigurationPreview;