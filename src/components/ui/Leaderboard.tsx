import React, { useState, useEffect } from 'react';
import type { LeaderboardProps } from '../../types/ui';
import { cn } from '../../utils/cn';
import { GlassPanel } from './GlassPanel';
import { ColonyAvatar } from './ColonyAvatar';
import { Badge } from './Badge';

/**
 * Leaderboard - Scrolling rank display component
 * 
 * Features:
 * - Real-time ranking updates
 * - Position change indicators (up/down arrows)
 * - Current player highlighting
 * - Team grouping display
 * - Elimination status indicators
 * - Smooth animations for rank changes
 * - Scrollable list with custom height
 * - Colony type integration
 */
const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentPlayerId,
  maxHeight = 400,
  showTeams = true,
  showRankChange = true,
  className,
  testId,
}) => {
  const [animatingEntries, setAnimatingEntries] = useState<string[]>([]);
  const [previousEntries, setPreviousEntries] = useState(entries);

  // Track rank changes for animations
  useEffect(() => {
    const changedIds = entries
      .filter((entry) => {
        const prevEntry = previousEntries.find(prev => prev.id === entry.id);
        return prevEntry && prevEntry.rank !== entry.rank;
      })
      .map(entry => entry.id);

    if (changedIds.length > 0) {
      setAnimatingEntries(changedIds);
      
      // Clear animations after duration
      const timeout = setTimeout(() => {
        setAnimatingEntries([]);
      }, 1000);

      return () => clearTimeout(timeout);
    }

    setPreviousEntries(entries);
  }, [entries, previousEntries]);

  // Get rank change indicator
  const getRankChangeIndicator = (entry: typeof entries[0]) => {
    if (!showRankChange || entry.change === undefined || entry.change === 0) {
      return null;
    }

    const isUp = entry.change > 0;
    const absChange = Math.abs(entry.change);

    return (
      <div className={cn(
        'flex items-center gap-1 text-xs font-bold',
        isUp ? 'text-status-success' : 'text-status-danger'
      )}>
        <span>{isUp ? '↗️' : '↘️'}</span>
        <span>{absChange}</span>
      </div>
    );
  };

  // Get team color for grouping
  const getTeamColor = (teamId: string) => {
    const teamColors = {
      'A': 'border-l-accent-primary',
      'B': 'border-l-accent-secondary',
      'C': 'border-l-status-success',
      'D': 'border-l-status-warning',
    };
    
    const teamLetter = teamId.charAt(0);
    return teamColors[teamLetter as keyof typeof teamColors] || 'border-l-text-secondary';
  };

  // Format score display
  const formatScore = (score: number): string => {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toLocaleString();
  };

  // Rank display with medal icons
  const getRankDisplay = (rank: number) => {
    const medals = ['🥇', '🥈', '🥉'];
    
    if (rank <= 3) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-lg">{medals[rank - 1]}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-panel-bg border border-panel-border">
        <span className="text-sm font-bold text-text-secondary">
          {rank}
        </span>
      </div>
    );
  };

  return (
    <GlassPanel
      className={cn('flex flex-col', className)}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-panel-border">
        <h3 className="font-space font-semibold text-lg text-gradient">
          Leaderboard
        </h3>
        <Badge variant="primary" size="sm">
          {entries.length} Colonies
        </Badge>
      </div>

      {/* Leaderboard list */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div className="space-y-1 p-2">
          {entries.map((entry) => {
            const isCurrentPlayer = entry.id === currentPlayerId;
            const isAnimating = animatingEntries.includes(entry.id);
            const teamColor = showTeams ? getTeamColor(entry.teamId) : '';

            return (
              <div
                key={entry.id}
                className={cn(
                  'relative flex items-center gap-3 p-3 rounded-lg transition-all duration-500',
                  'hover:bg-panel-bg-active/50',
                  isCurrentPlayer && 'bg-accent-primary/20 ring-2 ring-accent-primary/50',
                  entry.eliminated && 'opacity-50 grayscale',
                  isAnimating && 'animate-pulse-glow',
                  showTeams && 'border-l-4',
                  teamColor
                )}
              >
                {/* Rank */}
                <div className="flex-shrink-0">
                  {getRankDisplay(entry.rank)}
                </div>

                {/* Colony avatar */}
                <div className="flex-shrink-0">
                  <ColonyAvatar
                    colonyType={entry.colonyType}
                    size="sm"
                    name={entry.name}
                    status={entry.eliminated ? 'inactive' : 'active'}
                    animated={false}
                  />
                </div>

                {/* Colony info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-space font-semibold truncate',
                      isCurrentPlayer ? 'text-accent-primary' : 'text-text-primary'
                    )}>
                      {entry.name}
                    </span>
                    
                    {showTeams && (
                      <Badge variant="secondary" size="sm">
                        {entry.teamId}
                      </Badge>
                    )}
                    
                    {entry.eliminated && (
                      <Badge variant="danger" size="sm">
                        Eliminated
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-text-secondary">
                      Score: 
                    </span>
                    <span className="font-mono font-bold text-text-primary">
                      {formatScore(entry.score)}
                    </span>
                  </div>
                </div>

                {/* Rank change indicator */}
                <div className="flex-shrink-0">
                  {getRankChangeIndicator(entry)}
                </div>

                {/* Current player indicator */}
                {isCurrentPlayer && (
                  <div className="absolute -right-1 -top-1">
                    <Badge variant="primary" size="sm" pulse>
                      You
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with stats */}
      <div className="p-4 border-t border-panel-border">
        <div className="flex justify-between items-center text-sm text-text-secondary">
          <span>
            Active: {entries.filter(e => !e.eliminated).length}
          </span>
          <span>
            Eliminated: {entries.filter(e => e.eliminated).length}
          </span>
          <span>
            {currentPlayerId && (
              <>
                Your Rank: #{entries.find(e => e.id === currentPlayerId)?.rank || '?'}
              </>
            )}
          </span>
        </div>
      </div>
    </GlassPanel>
  );
};

Leaderboard.displayName = 'Leaderboard';

export { Leaderboard };
export type { LeaderboardProps };