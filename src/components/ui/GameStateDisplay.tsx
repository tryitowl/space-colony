import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { Timer } from './Timer';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';
import { GlassPanel } from './GlassPanel';
import type { GamePhase } from '../../types/gameEngine';

interface GameStateDisplayProps {
  showTimer?: boolean;
  showPhaseProgress?: boolean;
  showCurrentRound?: boolean;
  compact?: boolean;
  className?: string;
}

const PHASE_DESCRIPTIONS: Record<GamePhase, string> = {
  setup: 'Setting up game session',
  instructions: 'Game rules and colony briefing',
  investments: 'Allocate credits to colony improvements',
  round_1_trading: 'First trading round - establish relationships',
  round_1_strategy: 'Review trades and plan for Round 2',
  round_2_trading: 'Second trading round - build momentum',
  round_2_strategy: 'Quick strategy review before milestone',
  milestone_break: 'Mid-game break and leaderboard review',
  round_3_trading: 'Third trading round - alien contact possible',
  round_3_strategy: 'Adapt to new information and threats',
  round_4_trading: 'Fourth trading round - pressure mounting',
  round_4_strategy: 'Final preparations for last round',
  round_5_trading: 'Final trading round - make every trade count',
  completed: 'Game finished - calculating final scores'
};

const PHASE_COLORS: Record<GamePhase, string> = {
  setup: 'bg-gray-500',
  instructions: 'bg-blue-500',
  investments: 'bg-green-500',
  round_1_trading: 'bg-orange-500',
  round_1_strategy: 'bg-purple-500',
  round_2_trading: 'bg-orange-500',
  round_2_strategy: 'bg-purple-500',
  milestone_break: 'bg-yellow-500',
  round_3_trading: 'bg-orange-500',
  round_3_strategy: 'bg-purple-500',
  round_4_trading: 'bg-orange-500',
  round_4_strategy: 'bg-purple-500',
  round_5_trading: 'bg-red-500',
  completed: 'bg-green-600'
};

export const GameStateDisplay: React.FC<GameStateDisplayProps> = ({
  showTimer = true,
  showPhaseProgress = true,
  showCurrentRound = true,
  compact = false,
  className = ''
}) => {
  const { state } = useGame();
  const { gameEngine, timerState, session } = state;

  if (!gameEngine) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-400">
          <div className="animate-pulse">Initializing game engine...</div>
        </div>
      </GlassPanel>
    );
  }

  const formatPhaseTitle = (phase: GamePhase): string => {
    return phase
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoundNumber = (phase: GamePhase): number | null => {
    const match = phase.match(/round_(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const getPhaseProgress = (): number => {
    const totalPhases = 13; // Total number of phases
    const phaseOrder: GamePhase[] = [
      'setup', 'instructions', 'investments',
      'round_1_trading', 'round_1_strategy',
      'round_2_trading', 'round_2_strategy',
      'milestone_break',
      'round_3_trading', 'round_3_strategy',
      'round_4_trading', 'round_4_strategy',
      'round_5_trading', 'completed'
    ];
    
    const currentIndex = phaseOrder.indexOf(gameEngine.currentPhase);
    return ((currentIndex + 1) / totalPhases) * 100;
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const isGameActive = gameEngine.isActive && !gameEngine.isPaused;
  const phaseColor = PHASE_COLORS[gameEngine.currentPhase];
  const roundNumber = getRoundNumber(gameEngine.currentPhase);

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {showCurrentRound && roundNumber && (
          <Badge variant="info" className="text-xs">
            Round {roundNumber}
          </Badge>
        )}
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${phaseColor}`}></div>
          <span className="text-sm font-medium">
            {formatPhaseTitle(gameEngine.currentPhase)}
          </span>
        </div>

        {showTimer && timerState && isGameActive && (
          <Timer
            endTime={new Date(gameEngine.phaseEndTime)}
            onComplete={() => {}}
            className="text-sm"
            urgent={timerState.timeRemaining <= 60000}
          />
        )}
      </div>
    );
  }

  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Phase Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${phaseColor}`}></div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {formatPhaseTitle(gameEngine.currentPhase)}
              </h3>
              <p className="text-sm text-gray-300">
                {PHASE_DESCRIPTIONS[gameEngine.currentPhase]}
              </p>
            </div>
          </div>

          {/* Game Status */}
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isGameActive ? 'primary' : gameEngine.isPaused ? 'warning' : 'secondary'}
              className="text-xs"
            >
              {gameEngine.isPaused ? 'Paused' : isGameActive ? 'Active' : 'Waiting'}
            </Badge>
            
            {showCurrentRound && roundNumber && (
              <Badge variant="info" className="text-xs">
                Round {roundNumber} of 5
              </Badge>
            )}
          </div>
        </div>

        {/* Timer */}
        {showTimer && timerState && isGameActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Time Remaining:</span>
              <span className={`font-mono font-bold ${
                timerState.timeRemaining <= 60000 ? 'text-red-400' : 'text-white'
              }`}>
                {formatTimeRemaining(timerState.timeRemaining)}
              </span>
            </div>
            
            <ProgressBar
              value={gameEngine.phaseEndTime - timerState.timeRemaining}
              max={gameEngine.phaseEndTime - gameEngine.phaseStartTime}
              className="h-2"
              showPercentage={false}
              variant={timerState.timeRemaining <= 60000 ? 'danger' : 'default'}
            />

            {timerState.timeRemaining <= 60000 && (
              <div className="flex items-center space-x-2 text-xs text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span>Phase ending soon!</span>
              </div>
            )}
          </div>
        )}

        {/* Game Progress */}
        {showPhaseProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Game Progress:</span>
              <span className="text-white font-medium">
                {Math.round(getPhaseProgress())}%
              </span>
            </div>
            
            <ProgressBar
              value={getPhaseProgress()}
              max={100}
              className="h-2"
              showPercentage={false}
              variant="success"
            />
          </div>
        )}

        {/* Session Info */}
        {session && (
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-600">
            <span>Session: {session.name}</span>
            <span>{session.teams.length} teams</span>
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

// Helper hook for accessing game state display data
export const useGameStateDisplay = () => {
  const { state } = useGame();
  
  return {
    phase: state.gameEngine?.currentPhase,
    isActive: state.gameEngine?.isActive && !state.gameEngine?.isPaused,
    timeRemaining: state.timerState?.timeRemaining || 0,
    currentRound: state.gameEngine?.currentRound || 0,
    isPaused: state.gameEngine?.isPaused || false,
    phaseDescription: state.gameEngine?.currentPhase ? PHASE_DESCRIPTIONS[state.gameEngine.currentPhase] : '',
    isWarning: (state.timerState?.timeRemaining || 0) <= 60000
  };
};