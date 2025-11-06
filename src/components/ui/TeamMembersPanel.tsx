/**
 * Team Members Panel - Shows team members, their roles, and online status
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TeamPlayer, TeamPresence } from '../../types/player.types';

interface TeamMembersPanelProps {
  players: TeamPlayer[];
  currentPlayerId: string;
  presence: TeamPresence | null;
  onRoleChange?: (playerId: string, newRole: TeamPlayer['role']) => void;
  onRemovePlayer?: (playerId: string) => void;
  canManageTeam?: boolean;
}

export const TeamMembersPanel: React.FC<TeamMembersPanelProps> = ({
  players,
  currentPlayerId,
  presence,
  onRoleChange,
  onRemovePlayer,
  canManageTeam = false
}) => {
  const getRoleIcon = (role: TeamPlayer['role']) => {
    switch (role) {
      case 'captain':
        return '👑';
      case 'trader':
        return '💱';
      case 'analyst':
        return '📊';
      default:
        return '👤';
    }
  };

  const getRoleColor = (role: TeamPlayer['role']) => {
    switch (role) {
      case 'captain':
        return 'text-yellow-400';
      case 'trader':
        return 'text-blue-400';
      case 'analyst':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusColor = (player: TeamPlayer) => {
    const playerPresence = presence?.players.find(p => p.playerId === player.id);
    
    if (playerPresence?.isActive) return 'bg-green-500';
    if (playerPresence?.isOnline) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getConnectionStrength = (player: TeamPlayer) => {
    switch (player.status.connectionStrength) {
      case 'strong':
        return '📶';
      case 'moderate':
        return '📶';
      case 'weak':
        return '📶';
      default:
        return '📵';
    }
  };

  return (
    <div className="glassmorphic-depth rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyan-300">Team Members</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {presence?.activePlayerCount || 0} active
          </span>
          <span className="text-sm text-gray-500">/</span>
          <span className="text-sm text-gray-400">
            {presence?.onlinePlayerCount || 0} online
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glassmorphic p-3 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Status indicator */}
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(player)}`} />
                    {player.status.isActive && (
                      <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStatusColor(player)} animate-ping`} />
                    )}
                  </div>

                  {/* Player info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${getRoleColor(player.role)}`}>
                        {getRoleIcon(player.role)}
                      </span>
                      <span className="font-medium">
                        {player.name}
                        {player.id === currentPlayerId && (
                          <span className="text-xs text-cyan-400 ml-1">(You)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span>{player.role}</span>
                      <span>•</span>
                      <span>{getConnectionStrength(player)}</span>
                      {player.status.device && (
                        <>
                          <span>•</span>
                          <span>{player.status.device}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canManageTeam && player.id !== currentPlayerId && (
                  <div className="flex items-center space-x-2">
                    {/* Role selector */}
                    <select
                      value={player.role}
                      onChange={(e) => onRoleChange?.(player.id, e.target.value as TeamPlayer['role'])}
                      className="glassmorphic px-2 py-1 rounded text-xs"
                    >
                      <option value="member">Member</option>
                      <option value="trader">Trader</option>
                      <option value="analyst">Analyst</option>
                      <option value="captain">Captain</option>
                    </select>

                    {/* Remove button */}
                    <button
                      onClick={() => onRemovePlayer?.(player.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Remove player"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Activity info */}
              <div className="mt-2 text-xs text-gray-500">
                {player.status.isOnline ? (
                  <span>
                    Active {player.statistics.activityScore}%
                    {player.statistics.tradesCompleted > 0 && (
                      <span> • {player.statistics.tradesCompleted} trades</span>
                    )}
                  </span>
                ) : (
                  <span>
                    Last seen {new Date(player.status.lastSeen).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Team status */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Team Status:</span>
          <span className={`font-medium ${
            presence?.teamStatus === 'active' ? 'text-green-400' :
            presence?.teamStatus === 'idle' ? 'text-yellow-400' :
            'text-gray-400'
          }`}>
            {presence?.teamStatus || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
};