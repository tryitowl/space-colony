import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HUDFrame } from './HUDFrame';
import { Colony3D } from './Colony3D';
import type { ColonyType } from '../../types/game';

interface LeaderboardEntry {
  id: string;
  rank: number;
  previousRank?: number;
  name: string;
  score: number;
  scoreChange?: number;
  colonyType: ColonyType;
  teamId: string;
  eliminated?: boolean;
  isCurrentPlayer?: boolean;
}

interface AnimatedLeaderboardProps {
  entries: LeaderboardEntry[];
  variant?: 'full' | 'compact' | 'mini';
  showTrends?: boolean;
  show3DColonies?: boolean;
  highlightTop?: number;
  animateChanges?: boolean;
  className?: string;
}

/**
 * AnimatedLeaderboard - Enhanced leaderboard with animations and trends
 * 
 * Features:
 * - Smooth position transitions
 * - Score change indicators
 * - 3D colony representations
 * - Rank change animations
 * - Highlighting and effects
 */
export const AnimatedLeaderboard: React.FC<AnimatedLeaderboardProps> = ({
  entries,
  variant = 'full',
  showTrends = true,
  show3DColonies = true,
  highlightTop = 3,
  animateChanges = true,
  className,
}) => {
  const [displayEntries, setDisplayEntries] = useState(entries);
  const [animatingEntries, setAnimatingEntries] = useState<Set<string>>(new Set());

  // Update entries with animation tracking
  useEffect(() => {
    if (!animateChanges) {
      setDisplayEntries(entries);
      return;
    }

    // Find entries that changed position
    const changedEntries = new Set<string>();
    entries.forEach((entry) => {
      const oldEntry = displayEntries.find(e => e.id === entry.id);
      if (oldEntry && oldEntry.rank !== entry.rank) {
        changedEntries.add(entry.id);
      }
    });

    setAnimatingEntries(changedEntries);
    setDisplayEntries(entries);

    // Clear animations after transition
    const timer = setTimeout(() => {
      setAnimatingEntries(new Set());
    }, 1000);

    return () => clearTimeout(timer);
  }, [entries, animateChanges]);

  // Calculate rank change
  const getRankChange = (entry: LeaderboardEntry) => {
    if (!entry.previousRank || entry.previousRank === entry.rank) return null;
    const change = entry.previousRank - entry.rank;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : 'down',
    };
  };

  // Get rank color based on position
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-500';
  };

  // Get rank medal
  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  // Format score with animation
  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  // Mini variant for space-constrained layouts
  if (variant === 'mini') {
    return (
      <HUDFrame
        color="amber"
        variant="panel"
        className={cn('overflow-hidden', className)}
      >
        <div className="p-3">
          <h3 className="text-sm font-space font-bold text-amber-400 mb-2">
            Top Teams
          </h3>
          <div className="space-y-1">
            {displayEntries.slice(0, 3).map((entry) => (
              <motion.div
                key={entry.id}
                layout
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1">
                  <span>{getRankMedal(entry.rank) || entry.rank}</span>
                  <span className="truncate max-w-[100px]">{entry.name}</span>
                </div>
                <span className="font-mono font-bold">{formatScore(entry.score)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </HUDFrame>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <HUDFrame
        color="amber"
        variant="panel"
        className={cn('overflow-hidden', className)}
      >
        <div className="p-4">
          <h3 className="text-lg font-space font-bold text-amber-400 mb-3">
            Leaderboard
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {displayEntries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg',
                    'bg-white/5 backdrop-blur-sm border border-white/10',
                    entry.isCurrentPlayer && 'ring-2 ring-amber-400',
                    entry.eliminated && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('font-bold text-lg', getRankColor(entry.rank))}>
                      {getRankMedal(entry.rank) || `#${entry.rank}`}
                    </span>
                    <div>
                      <div className="font-semibold">{entry.name}</div>
                      <div className="text-xs text-gray-500">{entry.colonyType}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">
                      {formatScore(entry.score)}
                    </div>
                    {showTrends && entry.scoreChange && (
                      <div className={cn(
                        'text-xs',
                        entry.scoreChange > 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {entry.scoreChange > 0 ? '+' : ''}{entry.scoreChange}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </HUDFrame>
    );
  }

  // Full variant with all features
  return (
    <HUDFrame
      color="amber"
      variant="panel"
      className={cn('overflow-hidden', className)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-space font-bold text-amber-400">
            Galactic Leaderboard
          </h3>
          <motion.div
            className="text-sm text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Live Rankings
          </motion.div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {displayEntries.map((entry, index) => {
              const rankChange = getRankChange(entry);
              const isAnimating = animatingEntries.has(entry.id);
              
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isAnimating ? [1, 1.02, 1] : 1,
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    delay: index * 0.05,
                    scale: { duration: 0.5 },
                  }}
                  className={cn(
                    'relative p-4 rounded-xl border transition-all duration-300',
                    'bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm',
                    entry.rank <= highlightTop ? 'border-amber-400/50' : 'border-white/10',
                    entry.isCurrentPlayer && 'ring-2 ring-amber-400',
                    entry.eliminated && 'opacity-50 grayscale',
                    'hover:border-amber-400/30 hover:bg-white/15'
                  )}
                >
                  {/* Rank change indicator */}
                  {showTrends && rankChange && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'absolute -left-8 top-1/2 -translate-y-1/2',
                        rankChange.direction === 'up' ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {rankChange.direction === 'up' ? '↑' : '↓'}
                      <span className="text-xs ml-1">{rankChange.value}</span>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={cn(
                      'text-3xl font-bold font-space min-w-[60px]',
                      getRankColor(entry.rank)
                    )}>
                      {getRankMedal(entry.rank) || `#${entry.rank}`}
                    </div>

                    {/* Colony 3D */}
                    {show3DColonies && (
                      <div className="flex-shrink-0">
                        <Colony3D
                          colonyType={entry.colonyType}
                          size="sm"
                          rotation={entry.rank <= 3}
                          particles={false}
                          health={entry.eliminated ? 0 : 100}
                          status={entry.eliminated ? 'inactive' : 'active'}
                        />
                      </div>
                    )}

                    {/* Team info */}
                    <div className="flex-1">
                      <h4 className={cn(
                        'font-bold text-lg',
                        entry.isCurrentPlayer && 'text-amber-400'
                      )}>
                        {entry.name}
                        {entry.eliminated && ' (Eliminated)'}
                      </h4>
                      <div className="text-sm text-gray-400">
                        {entry.colonyType.replace('_', ' ').toUpperCase()} • Team {entry.teamId}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <motion.div
                        className="font-mono font-bold text-2xl"
                        key={entry.score}
                        initial={{ scale: 1.2, color: '#fbbf24' }}
                        animate={{ scale: 1, color: '#ffffff' }}
                        transition={{ duration: 0.3 }}
                      >
                        {formatScore(entry.score)}
                      </motion.div>
                      {showTrends && entry.scoreChange && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'text-sm font-semibold',
                            entry.scoreChange > 0 ? 'text-green-400' : 'text-red-400'
                          )}
                        >
                          {entry.scoreChange > 0 ? '+' : ''}{entry.scoreChange} pts
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Achievement badges */}
                  {entry.rank === 1 && (
                    <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                        LEADER
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

    </HUDFrame>
  );
};

AnimatedLeaderboard.displayName = 'AnimatedLeaderboard';

export default AnimatedLeaderboard;