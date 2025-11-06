import { 
  ref as dbRef, 
  set as dbSet, 
  update as dbUpdate, 
  onValue, 
  off 
} from 'firebase/database';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { firestore, realtimeDb } from '../firebase/config';
import type { 
  GameEngineState, 
  GamePhase, 
  GameStatus,
  PhaseTransition,
  GameEngineConfig,
  GameEngineCallbacks,
  GameEngineEvent,
  GameEngineError,
  TimerState,
  RoundResults
} from '../types/gameEngine';
import {
  DEFAULT_PHASE_CONFIG,
  DEFAULT_RESOURCE_CONSUMPTION,
  DEFAULT_ELIMINATION_RULES,
  DEFAULT_SCORING_RULES
} from '../types/gameEngine';
import type { GameSession, Colony } from '../types';
import { RoundService, RoundEndProcessing } from './roundService';

export class GameEngineService {
  private static instances: Map<string, GameEngineService> = new Map();
  private config: GameEngineConfig;
  private state: GameEngineState;
  private timerState: TimerState;
  private callbacks: GameEngineCallbacks;
  private timerInterval: NodeJS.Timeout | null = null;
  private realtimeListeners: Array<() => void> = [];
  private isInitialized = false;

  private constructor(config: GameEngineConfig) {
    this.config = {
      ...config,
      roundProgression: config.roundProgression,
      resourceConsumption: config.resourceConsumption,
      elimination: config.elimination,
      scoring: config.scoring
    };

    this.callbacks = config.callbacks || {};
    
    this.state = {
      sessionId: config.sessionId,
      currentRound: 0,
      currentPhase: 'setup',
      phaseStartTime: 0,
      phaseEndTime: 0,
      isPaused: false,
      isActive: false,
      gameStatus: 'waiting'
    };

    this.timerState = {
      currentTime: Date.now(),
      phaseStartTime: 0,
      phaseEndTime: 0,
      timeRemaining: 0,
      isRunning: false,
      isPaused: false,
      warningTriggered: false
    };
  }

  /**
   * Get or create a GameEngineService instance for a session
   */
  static getInstance(sessionId: string, config?: Partial<GameEngineConfig>): GameEngineService {
    if (!GameEngineService.instances.has(sessionId)) {
      if (!config) {
        throw new Error(`GameEngineService instance for session ${sessionId} not found and no config provided`);
      }
      
      const fullConfig: GameEngineConfig = {
        sessionId,
        roundProgression: {
          phases: DEFAULT_PHASE_CONFIG,
          totalRounds: 5,
          autoAdvance: true,
          warningTime: 60 * 1000,
          ...(config.roundProgression || {})
        },
        resourceConsumption: { ...DEFAULT_RESOURCE_CONSUMPTION, ...(config.resourceConsumption || {}) },
        resourceGeneration: {
          scouts: { intel: 1, perLevel: 1 },
          production: { specialty: 2, perLevel: 1 },
          research: { techPatents: 1, perLevel: 1 },
          communication: { marketIntel: 1, perLevel: 1 },
          emergency: { basicResources: 4, perLevel: 100 },
          ...(config.resourceGeneration || {})
        },
        elimination: { ...DEFAULT_ELIMINATION_RULES, ...(config.elimination || {}) },
        scoring: { ...DEFAULT_SCORING_RULES, ...(config.scoring || {}) },
        callbacks: config.callbacks,
        debug: config.debug
      };

      GameEngineService.instances.set(sessionId, new GameEngineService(fullConfig));
    }
    
    return GameEngineService.instances.get(sessionId)!;
  }

  /**
   * Initialize the game engine with session data
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn(`GameEngine for session ${this.config.sessionId} already initialized`);
      return;
    }

    try {
      // Load session data from Firestore
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${this.config.sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      
      // Initialize state from session data
      this.state = {
        sessionId: this.config.sessionId,
        currentRound: sessionData.currentRound || 0,
        currentPhase: sessionData.gameState as GamePhase,
        phaseStartTime: sessionData.roundStartTime || 0,
        phaseEndTime: this.calculatePhaseEndTime(sessionData.gameState as GamePhase, sessionData.roundStartTime || 0),
        isPaused: false,
        isActive: sessionData.gameState !== 'setup' && sessionData.gameState !== 'completed',
        gameStatus: this.getGameStatus(sessionData.gameState as GamePhase)
      };

      // Initialize realtime database structure
      await this.initializeRealtimeDatabase();

      // Setup realtime listeners
      this.setupRealtimeListeners();

      // Start timer if game is active
      if (this.state.isActive) {
        this.startTimer();
      }

      this.isInitialized = true;
      this.log('GameEngine initialized successfully');

    } catch (error) {
      const gameError: GameEngineError = {
        code: 'INITIALIZATION_ERROR',
        message: `Failed to initialize game engine: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        timestamp: Date.now(),
        recoverable: false,
        details: error
      };

      this.handleError(gameError);
      throw error;
    }
  }

  /**
   * Start the game session
   */
  async startGame(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('GameEngine must be initialized before starting');
    }

    if (this.state.isActive) {
      throw new Error('Game is already active');
    }

    try {
      const newPhase: GamePhase = 'instructions';
      const startTime = Date.now();
      const endTime = this.calculatePhaseEndTime(newPhase, startTime);

      // Update state
      this.state = {
        ...this.state,
        currentPhase: newPhase,
        phaseStartTime: startTime,
        phaseEndTime: endTime,
        isActive: true,
        gameStatus: 'active'
      };

      // Update Firestore
      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        gameState: newPhase,
        roundStartTime: startTime,
        isActive: true,
        updatedAt: serverTimestamp()
      });

      // Update realtime database
      await this.updateRealtimeState();

      // Start timer
      this.startTimer();

      // Emit event
      const transition: PhaseTransition = {
        fromPhase: 'setup',
        toPhase: newPhase,
        timestamp: startTime,
        automatic: false,
        reason: 'Game started by facilitator',
        duration: this.config.roundProgression.phases[newPhase].duration
      };

      this.callbacks.onPhaseChange?.(transition);
      await this.emitGameEvent('round_started', {
        phase: newPhase,
        timeRemaining: endTime - startTime,
        message: 'Game session started'
      });

      this.log(`Game started - Phase: ${newPhase}`);

    } catch (error) {
      const gameError: GameEngineError = {
        code: 'START_GAME_ERROR',
        message: `Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        timestamp: Date.now(),
        recoverable: true,
        details: error
      };

      this.handleError(gameError);
      throw error;
    }
  }

  /**
   * Advance to the next phase
   */
  async advancePhase(forced = false): Promise<PhaseTransition> {
    if (!this.isInitialized) {
      throw new Error('GameEngine must be initialized');
    }

    const currentPhase = this.state.currentPhase;
    const nextPhase = this.getNextPhase(currentPhase);

    if (nextPhase === currentPhase) {
      throw new Error('Already in final phase');
    }

    try {
      // Check if we're ending a trading round
      if (this.isRoundPhase(currentPhase)) {
        await this.processRoundEnd();
      }

      const startTime = Date.now();
      const endTime = this.calculatePhaseEndTime(nextPhase, startTime);

      // Update state
      const oldRound = this.state.currentRound;
      const newRound = this.isRoundPhase(nextPhase) ? oldRound + 1 : oldRound;

      this.state = {
        ...this.state,
        currentPhase: nextPhase,
        currentRound: newRound,
        phaseStartTime: startTime,
        phaseEndTime: endTime,
        gameStatus: nextPhase === 'completed' ? 'completed' : 'active'
      };

      // Update Firestore
      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        gameState: nextPhase,
        currentRound: newRound,
        roundStartTime: startTime,
        updatedAt: serverTimestamp()
      });

      // Update realtime database
      await this.updateRealtimeState();

      // Handle phase-specific logic
      if (this.isRoundPhase(nextPhase)) {
        this.callbacks.onRoundStart?.(newRound, nextPhase);
      }

      // Create transition object
      const transition: PhaseTransition = {
        fromPhase: currentPhase,
        toPhase: nextPhase,
        timestamp: startTime,
        automatic: !forced,
        reason: forced ? 'Manually advanced by facilitator' : 'Automatic phase progression',
        duration: this.config.roundProgression.phases[nextPhase].duration
      };

      // Emit callbacks and events
      this.callbacks.onPhaseChange?.(transition);
      await this.emitGameEvent('phase_changed', {
        phase: nextPhase,
        timeRemaining: endTime - startTime,
        message: `Advanced to ${nextPhase}`
      });

      this.log(`Phase advanced: ${currentPhase} → ${nextPhase}`);

      return transition;

    } catch (error) {
      const gameError: GameEngineError = {
        code: 'PHASE_ADVANCE_ERROR',
        message: `Failed to advance phase: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        timestamp: Date.now(),
        recoverable: true,
        details: error
      };

      this.handleError(gameError);
      throw error;
    }
  }

  /**
   * Pause the game
   */
  async pauseGame(): Promise<void> {
    if (!this.state.isActive || this.state.isPaused) {
      throw new Error('Game is not active or already paused');
    }

    try {
      this.state.isPaused = true;
      this.state.gameStatus = 'paused';
      this.timerState.isPaused = true;

      // Stop timer
      this.stopTimer();

      // Update Firestore
      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        isPaused: true,
        pausedAt: serverTimestamp()
      });

      // Update realtime database
      await this.updateRealtimeState();

      await this.emitGameEvent('emergency_pause', {
        message: 'Game paused by facilitator',
        timeRemaining: this.timerState.timeRemaining
      });

      this.log('Game paused');

    } catch (error) {
      this.handleError({
        code: 'PAUSE_ERROR',
        message: `Failed to pause game: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        timestamp: Date.now(),
        recoverable: true,
        details: error
      });
      throw error;
    }
  }

  /**
   * Resume the game
   */
  async resumeGame(): Promise<void> {
    if (!this.state.isPaused) {
      throw new Error('Game is not paused');
    }

    try {
      this.state.isPaused = false;
      this.state.gameStatus = 'active';
      this.timerState.isPaused = false;

      // Recalculate end time based on remaining time
      const now = Date.now();
      this.state.phaseEndTime = now + this.timerState.timeRemaining;
      this.timerState.phaseEndTime = this.state.phaseEndTime;

      // Start timer
      this.startTimer();

      // Update Firestore
      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        isPaused: false,
        roundStartTime: now,
        pausedAt: null
      });

      // Update realtime database
      await this.updateRealtimeState();

      this.log('Game resumed');

    } catch (error) {
      this.handleError({
        code: 'RESUME_ERROR',
        message: `Failed to resume game: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        timestamp: Date.now(),
        recoverable: true,
        details: error
      });
      throw error;
    }
  }

  /**
   * Get current game state
   */
  getState(): GameEngineState {
    return { ...this.state };
  }

  /**
   * Get current timer state
   */
  getTimerState(): TimerState {
    return { ...this.timerState };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: GameEngineState) => void): () => void {
    const stateRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/live/gameEngine`);
    
    const unsubscribe = onValue(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        const realtimeState = snapshot.val() as GameEngineState;
        // Update local state
        this.state = { ...this.state, ...realtimeState };
        callback(this.state);
      }
    });

    this.realtimeListeners.push(() => off(stateRef));
    return unsubscribe;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Stop timer
    this.stopTimer();

    // Remove realtime listeners
    this.realtimeListeners.forEach(unsubscribe => unsubscribe());
    this.realtimeListeners = [];

    // Remove from instances
    GameEngineService.instances.delete(this.config.sessionId);

    this.log('GameEngine destroyed');
  }

  // Private methods

  private calculatePhaseEndTime(phase: GamePhase, startTime: number): number {
    const phaseDuration = this.config.roundProgression.phases[phase].duration;
    return startTime + phaseDuration;
  }

  private getGameStatus(phase: GamePhase): GameStatus {
    if (phase === 'setup') return 'waiting';
    if (phase === 'completed') return 'completed';
    return 'active';
  }

  private getNextPhase(currentPhase: GamePhase): GamePhase {
    const phases: GamePhase[] = [
      'setup', 'instructions', 'investments',
      'round_1_trading', 'round_1_strategy',
      'round_2_trading', 'round_2_strategy',
      'milestone_break',
      'round_3_trading', 'round_3_strategy',
      'round_4_trading', 'round_4_strategy',
      'round_5_trading', 'completed'
    ];

    const currentIndex = phases.indexOf(currentPhase);
    return phases[Math.min(currentIndex + 1, phases.length - 1)];
  }

  private isRoundPhase(phase: GamePhase): boolean {
    return phase.includes('round_') && phase.includes('trading');
  }

  private async initializeRealtimeDatabase(): Promise<void> {
    const gameEngineRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/live/gameEngine`);
    
    await dbSet(gameEngineRef, {
      ...this.state,
      timerState: this.timerState,
      lastUpdate: Date.now()
    });
  }

  private setupRealtimeListeners(): void {
    // Setup any additional realtime listeners if needed
    // Currently handled in subscribe method
  }

  private async updateRealtimeState(): Promise<void> {
    const gameEngineRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/live/gameEngine`);
    
    await dbUpdate(gameEngineRef, {
      ...this.state,
      timerState: this.timerState,
      lastUpdate: Date.now()
    });
  }

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerState = {
      ...this.timerState,
      phaseStartTime: this.state.phaseStartTime,
      phaseEndTime: this.state.phaseEndTime,
      isRunning: true,
      isPaused: false,
      warningTriggered: false
    };

    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000); // Update every second
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.timerState.isRunning = false;
  }

  private updateTimer(): void {
    const now = Date.now();
    this.timerState.currentTime = now;
    this.timerState.timeRemaining = Math.max(0, this.state.phaseEndTime - now);

    // Check for warning
    if (!this.timerState.warningTriggered && 
        this.timerState.timeRemaining <= this.config.roundProgression.warningTime &&
        this.timerState.timeRemaining > 0) {
      this.timerState.warningTriggered = true;
      this.callbacks.onTimerWarning?.(this.timerState.timeRemaining);
      this.emitGameEvent('timer_warning', {
        timeRemaining: this.timerState.timeRemaining,
        message: 'Phase ending soon'
      });
    }

    // Check for auto-advance
    if (this.config.roundProgression.autoAdvance && 
        this.timerState.timeRemaining <= 0 && 
        this.state.currentPhase !== 'completed') {
      this.advancePhase(false).catch(error => {
        this.log(`Auto-advance failed: ${error.message}`);
      });
    }

    // Update realtime database periodically (every 5 seconds)
    if (now % 5000 < 1000) {
      this.updateRealtimeState().catch(error => {
        this.log(`Failed to update realtime state: ${error.message}`);
      });
    }
  }

  private async processRoundEnd(): Promise<void> {
    try {
      this.log(`Processing round ${this.state.currentRound} end`);

      // Get session data to fetch teams
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) {
        throw new Error(`Session ${this.config.sessionId} not found`);
      }

      const sessionData = sessionDoc.data() as GameSession;
      
      // Get trade count for this round (would integrate with trading service)
      const tradesCompleted = 0; // TODO: Integrate with trading service

      // Create round end processing data
      const roundEndData: RoundEndProcessing = {
        sessionId: this.config.sessionId,
        round: this.state.currentRound,
        phase: this.state.currentPhase,
        teams: sessionData.teams,
        tradesCompleted,
        marketEvents: [] // TODO: Integrate with market events service
      };

      // Get RoundService instance and process round end
      const roundService = RoundService.getInstance(this.config.sessionId, {
        autoAdvance: this.config.roundProgression.autoAdvance,
        resourceConsumption: this.config.resourceConsumption,
        eliminationThreshold: this.config.elimination.criticalRoundsThreshold,
        gracePeriod: this.config.elimination.gracePeriod
      });

      const roundResults = await roundService.processRoundEnd(roundEndData);

      // Emit round ended event
      await this.emitGameEvent('round_ended', {
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        results: roundResults,
        message: `Round ${this.state.currentRound} ended`
      });

      // Call callbacks with actual results
      this.callbacks.onRoundEnd?.(this.state.currentRound, roundResults);

      this.log(`Round ${this.state.currentRound} processing completed`);

    } catch (error) {
      const gameError: GameEngineError = {
        code: 'ROUND_END_ERROR',
        message: `Failed to process round end: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: this.state.currentPhase,
        round: this.state.currentRound,
        timestamp: Date.now(),
        recoverable: false,
        details: error
      };

      this.handleError(gameError);
      throw error;
    }
  }

  private async emitGameEvent(type: string, data: any): Promise<void> {
    const event: GameEngineEvent = {
      id: `${this.config.sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      sessionId: this.config.sessionId,
      round: this.state.currentRound,
      phase: this.state.currentPhase,
      timestamp: Date.now(),
      data
    };

    // Store in realtime database
    const eventsRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/events`);
    await dbSet(dbRef(realtimeDb, `${eventsRef.key}/${event.id}`), event);
  }

  private handleError(error: GameEngineError): void {
    this.log(`ERROR [${error.code}]: ${error.message}`, true);
    
    this.callbacks.onError?.(error);
    
    // Store error in realtime database for monitoring
    const errorRef = dbRef(realtimeDb, `sessions/${this.config.sessionId}/errors/${Date.now()}`);
    dbSet(errorRef, error).catch(err => {
      console.error('Failed to log error to database:', err);
    });
  }

  private log(message: string, isError = false): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[GameEngine:${this.config.sessionId}] ${timestamp}: ${message}`;
    
    if (isError) {
      console.error(logMessage);
    } else if (this.config.debug) {
      console.log(logMessage);
    }
  }
}