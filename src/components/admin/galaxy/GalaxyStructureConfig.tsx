import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Globe, Users, Hash, AlertCircle } from 'lucide-react';
import type { Event, GalaxyConfiguration, Galaxy } from '../../../types';

interface GalaxyStructureConfigProps {
  configuration: Partial<GalaxyConfiguration>;
  onUpdate: (config: Partial<GalaxyConfiguration>) => void;
  selectedEvent: Event;
}

const GalaxyStructureConfig: React.FC<GalaxyStructureConfigProps> = ({
  configuration,
  onUpdate,
  selectedEvent,
}) => {
  const [galaxies, setGalaxies] = useState<Galaxy[]>(
    configuration.galaxies || [
      {
        id: '1',
        name: 'Alpha Centauri',
        code: 'ALP',
        participantCount: 0,
        gameMode: 'full_multiplayer',
      },
    ]
  );

  const generateGalaxyCode = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, 'X');
  };

  const addGalaxy = () => {
    const newGalaxy: Galaxy = {
      id: Date.now().toString(),
      name: `Galaxy ${galaxies.length + 1}`,
      code: generateGalaxyCode(`Galaxy ${galaxies.length + 1}`),
      participantCount: 0,
      gameMode: 'full_multiplayer',
    };
    const updatedGalaxies = [...galaxies, newGalaxy];
    setGalaxies(updatedGalaxies);
    onUpdate({ ...configuration, galaxies: updatedGalaxies });
  };

  const updateGalaxy = (id: string, updates: Partial<Galaxy>) => {
    const updatedGalaxies = galaxies.map((galaxy) =>
      galaxy.id === id ? { ...galaxy, ...updates } : galaxy
    );
    setGalaxies(updatedGalaxies);
    onUpdate({ ...configuration, galaxies: updatedGalaxies });
  };

  const removeGalaxy = (id: string) => {
    if (galaxies.length === 1) return;
    const updatedGalaxies = galaxies.filter((galaxy) => galaxy.id !== id);
    setGalaxies(updatedGalaxies);
    onUpdate({ ...configuration, galaxies: updatedGalaxies });
  };

  const totalParticipants = galaxies.reduce((sum, galaxy) => sum + galaxy.participantCount, 0);
  const participantsRemaining = (selectedEvent.participantCount || 0) - totalParticipants;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Galaxy Structure</h3>
        <p className="text-gray-400">
          Configure the galaxy structure and distribute participants across galaxies.
        </p>
      </div>

      {/* Galaxy Type Selection */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-gray-300">Galaxy Configuration Type</label>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            className={`p-4 rounded-lg border-2 transition-all ${
              galaxies.length === 1
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                : 'border-gray-700 hover:border-gray-600 text-gray-400'
            }`}
            onClick={() => {
              setGalaxies([galaxies[0]]);
              onUpdate({ ...configuration, galaxies: [galaxies[0]] });
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Globe className="w-8 h-8 mx-auto mb-2" />
            <h4 className="font-medium">Single Galaxy</h4>
            <p className="text-sm mt-1">All participants in one galaxy</p>
          </motion.button>
          <motion.button
            className={`p-4 rounded-lg border-2 transition-all ${
              galaxies.length > 1
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                : 'border-gray-700 hover:border-gray-600 text-gray-400'
            }`}
            onClick={() => {
              if (galaxies.length === 1) addGalaxy();
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex justify-center mb-2">
              <Globe className="w-6 h-6" />
              <Globe className="w-6 h-6 -ml-2" />
              <Globe className="w-6 h-6 -ml-2" />
            </div>
            <h4 className="font-medium">Multi-Galaxy</h4>
            <p className="text-sm mt-1">Separate participant groups</p>
          </motion.button>
        </div>
      </div>

      {/* Participant Distribution */}
      <div className="bg-gray-800/50 border border-cyan-900/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total Event Participants</span>
          <span className="font-medium text-white">{selectedEvent.participantCount || 0}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Assigned to Galaxies</span>
          <span className="font-medium text-cyan-400">{totalParticipants}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Remaining</span>
          <span
            className={`font-medium ${
              participantsRemaining === 0 ? 'text-green-400' : 'text-yellow-400'
            }`}
          >
            {participantsRemaining}
          </span>
        </div>
      </div>

      {/* Galaxy List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-300">Galaxies</h4>
          <motion.button
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all"
            onClick={addGalaxy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Galaxy</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {galaxies.map((galaxy, index) => (
            <motion.div
              key={galaxy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <h5 className="text-lg font-medium text-white">Galaxy {index + 1}</h5>
                {galaxies.length > 1 && (
                  <motion.button
                    className="text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => removeGalaxy(galaxy.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Galaxy Name
                  </label>
                  <input
                    type="text"
                    value={galaxy.name}
                    onChange={(e) => updateGalaxy(galaxy.id, { name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="Enter galaxy name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4" />
                      <span>Galaxy Code</span>
                    </div>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={galaxy.code}
                      onChange={(e) =>
                        updateGalaxy(galaxy.id, {
                          code: e.target.value.toUpperCase().slice(0, 3),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white uppercase focus:border-cyan-500 focus:outline-none"
                      placeholder="XXX"
                      maxLength={3}
                    />
                    <button
                      className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      onClick={() =>
                        updateGalaxy(galaxy.id, { code: generateGalaxyCode(galaxy.name) })
                      }
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Participants</span>
                    </div>
                  </label>
                  <input
                    type="number"
                    value={galaxy.participantCount}
                    onChange={(e) =>
                      updateGalaxy(galaxy.id, {
                        participantCount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="0"
                    min="0"
                    max={selectedEvent.participantCount || 100}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Game Mode
                </label>
                <select
                  value={galaxy.gameMode}
                  onChange={(e) =>
                    updateGalaxy(galaxy.id, { gameMode: e.target.value as any })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="full_multiplayer">Full Multiplayer</option>
                  <option value="single_player">Single Player</option>
                  <option value="mixed_mode">Mixed Mode</option>
                </select>
              </div>

              {/* Player Code Format Preview */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-1">Player Code Format:</p>
                <code className="text-cyan-400 font-mono">
                  {selectedEvent.code || 'XXXX'}-{galaxy.code}
                </code>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Warning for unassigned participants */}
      {participantsRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              {participantsRemaining} participants not assigned to any galaxy
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GalaxyStructureConfig;