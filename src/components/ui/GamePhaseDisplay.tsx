import React from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../types/game';
import { HUDFrame } from './HUDFrame';
import { Timer } from './Timer';
import { cn } from '../../utils/cn';
import { getPhaseDisplayName } from '../../utils/gameUtils';

interface GamePhaseDisplayProps {
  currentPhase: GameState;
  currentRound: number;
  totalRounds: number;
  phaseTimeRemaining?: number;
  phaseEndTime?: Date;
  phaseDuration?: number;
  className?: string;
}

/**
 * GamePhaseDisplay - HUD-styled component that displays game phase and round information
 * 
 * Features:
 * - Visual display of current phase and round
 * - Progress bar for round advancement
 * - Optional timer for phase countdown
 * - HUD-style UI consistent with app design
 */
export const GamePhaseDisplay: React.FC<GamePhaseDisplayProps> = ({
  currentPhase,
  currentRound: _currentRound,
  totalRounds = 5,
  phaseTimeRemaining,
  phaseEndTime,
  phaseDuration,
  className
}) => {
  const isTrading = currentPhase === 'round_1' || 
                    currentPhase === 'round_2' || 
                    currentPhase === 'round_3' || 
                    currentPhase === 'round_4' || 
                    currentPhase === 'round_5';
                    
  const roundNumber = isTrading ? parseInt(currentPhase.split('_')[1]) : 0;
  const roundProgress = (roundNumber / totalRounds) * 100;
  
  // Get appropriate color scheme based on phase
  const getPhaseColorScheme = () => {
    switch (currentPhase) {
      case 'setup':
        return 'bg-blue-400/10 border-blue-400/30 text-blue-400';
      case 'investments':
        return 'bg-purple-400/10 border-purple-400/30 text-purple-400';
      case 'milestone_break':
        return 'bg-amber-400/10 border-amber-400/30 text-amber-400';
      case 'completed':
        return 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400';
      default: // trading rounds
        return 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400';
    }
  };

  // Get the phase icon
  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'setup':
        return '🚀';
      case 'investments':
        return '💰';
      case 'milestone_break':
        return '🏆';
      case 'completed':
        return '✅';
      default: // trading rounds
        return '🔄';
    }
  };
  
  return (
    <HUDFrame
      variant="card"
      animated={true}
      className={cn('relative overflow-hidden', className)}
    >
      <div className="p-4">
        {/* Phase Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center mr-3',
              getPhaseColorScheme()
            )}>
              <span className="text-lg">{getPhaseIcon()}</span>
            </div>
            <div>
              <h3 className="text-lg font-space font-bold text-text-primary">
                {getPhaseDisplayName(currentPhase)}
              </h3>
              {isTrading && (
                <p className="text-xs text-text-secondary">
                  Round {roundNumber} of {totalRounds}
                </p>
              )}
            </div>
          </div>
          
          {/* Phase Timer */}
          {(phaseTimeRemaining || phaseEndTime) && (
            <Timer
              duration={phaseDuration || 300}
              endTime={phaseEndTime ? new Date(phaseEndTime) : undefined}
              format="minimal"
              urgent={true}
              variant="danger"
              className="scale-75 origin-right"
            />
          )}
        </div>
        
        {/* Round Progress Bar */}
        {isTrading && (
          <div className="relative h-2 bg-background-tertiary rounded-full overflow-hidden mb-2">
            <motion.div 
              className="h-full bg-accent-primary"
              initial={{ width: 0 }}
              animate={{ width: `${roundProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
        
        {/* Phase Description */}
        <p className="text-sm text-text-secondary mt-2">
          {getPhaseDescription(currentPhase)}
        </p>
      </div>
      
      {/* Status Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="scanlines w-full h-full"></div>
      </div>
    </HUDFrame>
  );
};

// Helper function to get phase descriptions
function getPhaseDescription(phase: GameState): string {
  switch (phase) {
    case 'setup':
      return 'Prepare your colony and assign initial resources.';
    case 'investments':
      return 'Invest in colony improvements and prepare for trading.';
    case 'round_1':
      return 'First trading round - establish initial trade relationships.';
    case 'round_2':
      return 'Second trading round - develop your resource strategy.';
    case 'milestone_break':
      return 'Milestone event - special bonuses and challenges.';
    case 'round_3':
      return 'Third trading round - capitalize on established trade routes.';
    case 'round_4':
      return 'Fourth trading round - strategic partnerships are crucial.';
    case 'round_5':
      return 'Final trading round - maximize your colony\'s potential!';
    case 'completed':
      return 'The game has concluded. View final standings on the leaderboard.';
    default:
      return 'Waiting for next game phase...';
  }
}
