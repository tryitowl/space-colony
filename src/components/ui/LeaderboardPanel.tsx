import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { GlassPanel } from './GlassPanel';
import { Badge } from './Badge';
import { ColonyAvatar } from './ColonyAvatar';
import type {
  TeamScore,
  GameSession
} from '../../types';

interface LeaderboardPanelProps {
  maxEntries?: number;
  showTrends?: boolean;
  showScores?: boolean;
  compact?: boolean;
  className?: string;
}

const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
  switch (trend) {
    case 'up':
      return '↗️';
    case 'down':
      return '↘️';
    case 'same':
      return '→';
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'same') => {
  switch (trend) {
    case 'up':
      return 'text-green-400';
    case 'down':
      return 'text-red-400';
    case 'same':
      return 'text-gray-400';
  }
};

const getRankBadge = (rank: number, badge?: string) => {
  if (badge === 'champion') return '👑';
  if (badge === 'runner-up') return '🥈';
  if (badge === 'third-place') return '🥉';
  if (badge === 'rising-star') return '⭐';
  if (badge === 'trending-up') return '📈';
  
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `#${rank}`;
  }
};

const formatScore = (score: number): string => {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toString();
};

const formatChange = (change: number): string => {
  if (change > 0) {
    return `+${change}`;
  }
  return change.toString();
};

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  maxEntries = 10,
  showTrends = true,
  showScores = true,
  compact = false,
  className = ''
}) => {
  const { state } = useGame();
  const { leaderboard, currentTeam } = state;
  const [showEliminated, setShowEliminated] = useState(false);

  const filteredLeaderboard = leaderboard
    .filter(entry => showEliminated || !entry.isEliminated)
    .slice(0, maxEntries);

  if (leaderboard.length === 0) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-lg font-semibold mb-2">Leaderboard</div>
          <div className="text-sm">Waiting for score calculations...</div>
        </div>
      </GlassPanel>
    );
  }

  const currentTeamEntry = leaderboard.find(entry => entry.teamId === currentTeam?.id);
  const eliminatedCount = leaderboard.filter(entry => entry.isEliminated).length;

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Leaderboard</h3>
          {currentTeamEntry && (
            <Badge 
              variant={currentTeamEntry.rank <= 3 ? 'success' : 'secondary'}
              className="text-xs"
            >
              Your Rank: #{currentTeamEntry.rank}
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {filteredLeaderboard.slice(0, 3).map((entry) => (
            <div 
              key={entry.teamId}
              className={`flex items-center justify-between p-2 rounded-lg border ${
                entry.teamId === currentTeam?.id 
                  ? 'border-blue-400 bg-blue-400/10' 
                  : 'border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {getRankBadge(entry.rank, entry.badge)}
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    {entry.teamName}
                  </div>
                  {showScores && (
                    <div className="text-xs text-gray-400">
                      {formatScore(entry.currentScore)} pts
                    </div>
                  )}
                </div>
              </div>

              {showTrends && (
                <div className={`text-xs ${getTrendColor(entry.trend)}`}>
                  {getTrendIcon(entry.trend)}
                  {entry.change !== 0 && formatChange(entry.change)}
                </div>
              )}
            </div>
          ))}

          {filteredLeaderboard.length > 3 && (
            <div className="text-center text-xs text-gray-400 pt-2">
              +{filteredLeaderboard.length - 3} more teams
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          <div className="flex items-center space-x-2">
            {eliminatedCount > 0 && (
              <button
                onClick={() => setShowEliminated(!showEliminated)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {showEliminated ? 'Hide' : 'Show'} Eliminated ({eliminatedCount})
              </button>
            )}
            <Badge variant="info" className="text-xs">
              {leaderboard.length} Teams
            </Badge>
          </div>
        </div>

        {/* Current Team Position */}
        {currentTeamEntry && currentTeamEntry.rank > 3 && (
          <div className="p-3 rounded-lg border border-blue-400 bg-blue-400/10">
            <div className="text-xs text-blue-300 mb-1">Your Position</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ColonyAvatar 
                  colonyType={currentTeam?.type || 'trade_hub'} 
                  size="sm"
                />
                <div>
                  <div className="text-sm font-medium text-white">
                    {currentTeamEntry.teamName}
                  </div>
                  <div className="text-xs text-gray-300">
                    Rank #{currentTeamEntry.rank}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">
                  {formatScore(currentTeamEntry.currentScore)}
                </div>
                {showTrends && currentTeamEntry.change !== 0 && (
                  <div className={`text-xs ${getTrendColor(currentTeamEntry.trend)}`}>
                    {formatChange(currentTeamEntry.change)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Entries */}
        <div className="space-y-2">
          {filteredLeaderboard.map((entry, _index) => (
            <div 
              key={entry.teamId}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                entry.teamId === currentTeam?.id 
                  ? 'border-blue-400 bg-blue-400/10 shadow-lg' 
                  : entry.isEliminated
                  ? 'border-red-600 bg-red-600/10 opacity-60'
                  : 'border-gray-600 bg-gray-800/50 hover:bg-gray-800/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Rank */}
                  <div className="flex flex-col items-center min-w-[2rem]">
                    <div className="text-lg">
                      {getRankBadge(entry.rank, entry.badge)}
                    </div>
                    {entry.rank !== entry.previousRank && showTrends && (
                      <div className={`text-xs ${getTrendColor(entry.trend)}`}>
                        {entry.previousRank > entry.rank ? '↑' : '↓'}
                        {Math.abs(entry.rank - entry.previousRank)}
                      </div>
                    )}
                  </div>

                  {/* Team Info */}
                  <ColonyAvatar 
                    colonyType={entry.colonyType as any} 
                    size="md"
                  />
                  <div>
                    <div className="text-base font-semibold text-white">
                      {entry.teamName}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {entry.colonyType.replace('_', ' ')} Colony
                    </div>
                    {entry.isEliminated && (
                      <Badge variant="danger" className="text-xs mt-1">
                        Eliminated
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  {showScores && (
                    <div className="text-lg font-bold text-white">
                      {formatScore(entry.currentScore)}
                    </div>
                  )}
                  
                  {showTrends && entry.change !== 0 && (
                    <div className={`text-sm font-medium ${getTrendColor(entry.trend)}`}>
                      {getTrendIcon(entry.trend)} {formatChange(entry.change)}
                    </div>
                  )}

                  {entry.badge && (
                    <div className="text-xs text-yellow-400 mt-1">
                      {entry.badge.replace('-', ' ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-600">
          Updated in real-time • {showTrends ? 'Showing trends' : 'Static view'}
        </div>
      </div>
    </GlassPanel>
  );
};

// Helper hook for leaderboard data
export const useLeaderboard = () => {
  const { state } = useGame();
  
  const currentTeamRank = state.leaderboard.find(
    entry => entry.teamId === state.currentTeam?.id
  )?.rank || null;

  const topTeam = state.leaderboard[0] || null;
  const eliminatedCount = state.leaderboard.filter(entry => entry.isEliminated).length;
  const activeCount = state.leaderboard.length - eliminatedCount;

  return {
    leaderboard: state.leaderboard,
    currentTeamRank,
    topTeam,
    eliminatedCount,
    activeCount,
    totalTeams: state.leaderboard.length
  };
};