import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Timer } from '../ui/Timer';
import { Badge } from '../ui/Badge';
import { HUDFrame } from '../ui/HUDFrame';
import { 
  Play, 
  Pause, 
  SkipForward, 
  AlertCircle,
  Clock,
  Users,
  Zap
} from 'lucide-react';

export const GameControlPanel: React.FC = () => {
  const { 
    state: { session, gameEngine, timerState, loading, error },
    startGame,
    pauseGame,
    resumeGame,
    advancePhase
  } = useGame();

  if (!session || !gameEngine) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" />
          <p>No active session</p>
        </div>
      </Card>
    );
  }

  const isGameActive = gameEngine.isActive && !gameEngine.isPaused;
  const canStart = gameEngine.currentPhase === 'setup' && !loading;
  const canPause = isGameActive && !loading;
  const canResume = gameEngine.isPaused && !loading;
  const canAdvance = gameEngine.currentPhase !== 'completed' && !loading;

  const phaseConfig = {
    setup: { name: 'Setup', icon: '🎮', color: 'bg-gray-500' },
    instructions: { name: 'Instructions', icon: '📋', color: 'bg-blue-500' },
    investments: { name: 'Investments', icon: '💰', color: 'bg-yellow-500' },
    round_1_trading: { name: 'Round 1 Trading', icon: '🔄', color: 'bg-green-500' },
    round_1_strategy: { name: 'Round 1 Strategy', icon: '🎯', color: 'bg-purple-500' },
    round_2_trading: { name: 'Round 2 Trading', icon: '🔄', color: 'bg-green-500' },
    round_2_strategy: { name: 'Round 2 Strategy', icon: '🎯', color: 'bg-purple-500' },
    milestone_break: { name: 'Milestone Break', icon: '🏆', color: 'bg-amber-500' },
    round_3_trading: { name: 'Round 3 Trading', icon: '👽', color: 'bg-green-500' },
    round_3_strategy: { name: 'Round 3 Strategy', icon: '🎯', color: 'bg-purple-500' },
    round_4_trading: { name: 'Round 4 Trading', icon: '🔄', color: 'bg-green-500' },
    round_4_strategy: { name: 'Round 4 Strategy', icon: '🎯', color: 'bg-purple-500' },
    round_5_trading: { name: 'Round 5 Trading', icon: '⚡', color: 'bg-red-500' },
    completed: { name: 'Game Complete', icon: '🎉', color: 'bg-gold-500' }
  };

  const currentPhaseInfo = phaseConfig[gameEngine.currentPhase as keyof typeof phaseConfig];

  const handleStartGame = async () => {
    try {
      await startGame();
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const handlePauseGame = async () => {
    try {
      await pauseGame();
    } catch (err) {
      console.error('Failed to pause game:', err);
    }
  };

  const handleResumeGame = async () => {
    try {
      await resumeGame();
    } catch (err) {
      console.error('Failed to resume game:', err);
    }
  };

  const handleAdvancePhase = async () => {
    if (window.confirm('Are you sure you want to manually advance to the next phase?')) {
      try {
        await advancePhase();
      } catch (err) {
        console.error('Failed to advance phase:', err);
      }
    }
  };

  return (
    <HUDFrame color="cyan">
      <div className="space-y-6">
        {/* Panel Title */}
        <div className="text-center border-b border-cyan-400/20 pb-3">
          <h2 className="text-xl font-bold text-cyan-400">Game Control Panel</h2>
        </div>
        {/* Current Phase Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-3xl">{currentPhaseInfo.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-cyan-400">
                {currentPhaseInfo.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="primary" className={currentPhaseInfo.color}>
                  Round {gameEngine.currentRound}
                </Badge>
                <Badge variant={gameEngine.gameStatus === 'active' ? 'success' : 'secondary'}>
                  {gameEngine.gameStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Timer Display */}
          {timerState && timerState.isRunning && (
            <div className="mt-4">
              <Timer
                endTime={new Date(timerState.phaseEndTime)}
                urgent={timerState.timeRemaining < 60000}
                variant={timerState.timeRemaining < 60000 ? 'danger' : 'warning'}
              />
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {canStart && (
            <Button
              onClick={handleStartGame}
              variant="primary"
              size="lg"
              className="col-span-2"
              disabled={loading}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          )}

          {canPause && (
            <Button
              onClick={handlePauseGame}
              variant="secondary"
              disabled={loading}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}

          {canResume && (
            <Button
              onClick={handleResumeGame}
              variant="primary"
              disabled={loading}
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}

          {canAdvance && (
            <Button
              onClick={handleAdvancePhase}
              variant="primary"
              disabled={loading}
              className={canPause || canResume ? '' : 'col-span-2'}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Next Phase
            </Button>
          )}
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-slate-800/50 p-3 text-center">
            <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-sm text-gray-400">Teams</div>
            <div className="text-lg font-bold">{session.teams.length}</div>
          </Card>
          
          <Card className="bg-slate-800/50 p-3 text-center">
            <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-sm text-gray-400">Status</div>
            <div className="text-lg font-bold">
              {gameEngine.isPaused ? 'Paused' : 'Active'}
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 p-3 text-center">
            <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-sm text-gray-400">Phase</div>
            <div className="text-lg font-bold">
              {gameEngine.currentRound > 0 ? `${gameEngine.currentRound}/5` : 'Pre'}
            </div>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Debug Info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-slate-900/50 p-3">
            <div className="text-xs font-mono text-gray-500">
              <div>Session: {session.id}</div>
              <div>Phase Start: {new Date(gameEngine.phaseStartTime).toLocaleTimeString()}</div>
              <div>Phase End: {new Date(gameEngine.phaseEndTime).toLocaleTimeString()}</div>
              <div>Time Remaining: {Math.floor((timerState?.timeRemaining || 0) / 1000)}s</div>
            </div>
          </Card>
        )}
      </div>
    </HUDFrame>
  );
};