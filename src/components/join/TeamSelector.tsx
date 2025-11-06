import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AvailableTeam } from '../../services/sessionLookupService';

interface TeamSelectorProps {
  teams: AvailableTeam[];
  selectedTeam: AvailableTeam | null;
  onSelectTeam: (team: AvailableTeam) => void;
  onBack?: () => void;
  onJoin: () => void;
  isLoading?: boolean;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeam,
  onSelectTeam,
  onBack,
  onJoin,
  isLoading = false
}) => {
  const getColonyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      mining: '#ff9500',
      agricultural: '#00ff88',
      research: '#00d4ff',
      trade_hub: '#6c5ce7',
      military: '#ff4757',
      manufacturing: '#ff9500'
    };
    return colors[type] || '#00d4ff';
  };

  const getColonyTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      mining: '⛏️',
      agricultural: '🌱',
      research: '🔬',
      trade_hub: '💱',
      military: '⚔️',
      manufacturing: '🏭'
    };
    return icons[type] || '🚀';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 
          className="text-2xl text-purple-400 mb-2"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          SELECT YOUR COLONY
        </h2>
        <p 
          className="text-sm opacity-70"
          style={{ 
            fontFamily: 'SF Mono, monospace',
            color: '#a0a0a0'
          }}
        >
          Choose your faction in the galactic exchange
        </p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
        {teams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => team.isAvailable && onSelectTeam(team)}
            className={`p-4 transition-all duration-300 relative overflow-hidden ${
              team.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            }`}
            style={{
              background: selectedTeam?.id === team.id 
                ? 'rgba(108, 92, 231, 0.2)' 
                : 'rgba(10, 10, 15, 0.3)',
              border: selectedTeam?.id === team.id 
                ? '1px solid #6c5ce7' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px'
            }}
            onMouseEnter={(e) => {
              if (team.isAvailable && selectedTeam?.id !== team.id) {
                e.currentTarget.style.borderColor = 'rgba(108, 92, 231, 0.5)';
                e.currentTarget.style.background = 'rgba(108, 92, 231, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (team.isAvailable && selectedTeam?.id !== team.id) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.background = 'rgba(10, 10, 15, 0.3)';
              }
            }}
          >
            {/* Selection indicator */}
            {selectedTeam?.id === team.id && (
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, #6c5ce7, #ff9500)' }}
                layoutId="selection-indicator"
              />
            )}

            {/* Not available overlay */}
            {!team.isAvailable && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span 
                  className="text-red-400 font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  FULL
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getColonyTypeIcon(team.colonyType)}</span>
                  <h3 
                    className="text-lg text-white"
                    style={{ fontFamily: 'Orbitron, monospace' }}
                  >
                    {team.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getColonyTypeColor(team.colonyType) }}
                  />
                  <p 
                    className="text-sm capitalize"
                    style={{ 
                      fontFamily: 'SF Mono, monospace',
                      color: getColonyTypeColor(team.colonyType)
                    }}
                  >
                    {team.colonyType.replace('_', ' ')} Colony
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div 
                  className="text-xs opacity-70"
                  style={{ 
                    fontFamily: 'SF Mono, monospace',
                    color: '#a0a0a0'
                  }}
                >
                  CAPACITY
                </div>
                <div 
                  className="text-lg font-mono"
                  style={{ 
                    color: team.currentPlayers >= team.maxPlayers ? '#ff4757' : '#00ff88'
                  }}
                >
                  {team.currentPlayers}/{team.maxPlayers}
                </div>
                {/* Player slots visualization */}
                <div className="flex gap-1 mt-1 justify-end">
                  {Array.from({ length: team.maxPlayers }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: i < team.currentPlayers 
                          ? getColonyTypeColor(team.colonyType) 
                          : 'rgba(255, 255, 255, 0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        {onBack && (
          <motion.button
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 px-6 py-3 font-semibold rounded-md relative overflow-hidden transition-all"
            style={{
              fontFamily: 'Orbitron, monospace',
              border: '2px solid #00d4ff',
              background: 'rgba(10, 10, 15, 0.8)',
              color: '#00d4ff',
              opacity: isLoading ? 0.5 : 1
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            ← BACK
          </motion.button>
        )}

        <motion.button
          onClick={onJoin}
          disabled={!selectedTeam || isLoading}
          className="flex-1 px-6 py-3 font-semibold rounded-md relative overflow-hidden transition-all"
          style={{
            fontFamily: 'Orbitron, monospace',
            border: selectedTeam ? '2px solid #00ff88' : '2px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(10, 10, 15, 0.8)',
            color: selectedTeam ? '#00ff88' : 'rgba(255, 255, 255, 0.3)',
            opacity: (!selectedTeam || isLoading) ? 0.5 : 1
          }}
          whileHover={selectedTeam ? { y: -2 } : {}}
          whileTap={selectedTeam ? { scale: 0.98 } : {}}
        >
          {isLoading ? (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              INITIALIZING...
            </motion.span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <span>JOIN COLONY</span>
              <span className="text-xl">🚀</span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Team info */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 rounded border"
            style={{
              borderColor: getColonyTypeColor(selectedTeam.colonyType) + '33',
              background: getColonyTypeColor(selectedTeam.colonyType) + '0A'
            }}
          >
            <div 
              className="text-sm space-y-2"
              style={{ 
                fontFamily: 'SF Mono, monospace',
                color: '#a0a0a0'
              }}
            >
              <div className="font-bold text-white mb-2">
                {selectedTeam.name} Selected
              </div>
              <div>• Type: {selectedTeam.colonyType.replace('_', ' ')}</div>
              <div>• Current players: {selectedTeam.currentPlayers}</div>
              <div>• Available slots: {selectedTeam.maxPlayers - selectedTeam.currentPlayers}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(108, 92, 231, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(108, 92, 231, 0.7);
        }
      `}</style>
    </motion.div>
  );
};