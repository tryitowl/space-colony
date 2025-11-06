/**
 * Shared constants used across the application
 * This file consolidates commonly used constants to avoid duplication
 */

// Import resource values that are already centralized
export * from './resourceValues';

// Game phase constants
export const GAME_PHASES = [
  'setup',
  'instructions',
  'investment',
  'round_1',
  'round_2',
  'milestone',
  'round_3',
  'round_4',
  'round_5',
  'completed'
] as const;

export type GamePhase = typeof GAME_PHASES[number];

// Round durations (in seconds)
export const ROUND_DURATIONS = {
  investment: 300,    // 5 minutes
  round_1: 600,      // 10 minutes
  round_2: 600,      // 10 minutes
  milestone: 300,    // 5 minutes
  round_3: 600,      // 10 minutes
  round_4: 600,      // 10 minutes
  round_5: 600,      // 10 minutes
} as const;

// Team size constraints
export const TEAM_CONSTRAINTS = {
  MIN_PLAYERS: 1,
  MAX_PLAYERS: 4,
  IDEAL_PLAYERS: 3,
} as const;

// Trading constraints
export const TRADING_CONSTRAINTS = {
  MAX_ACTIVE_TRADES: 5,
  TRADE_EXPIRY_MINUTES: 5,
  MAX_COUNTER_OFFERS: 3,
  MIN_TRADE_VALUE: 1,
} as const;

// AI difficulty multipliers
export const AI_DIFFICULTY_MULTIPLIERS = {
  easy: {
    responseTime: 1.5,
    acceptanceThreshold: 0.7,
    resourceValuation: 0.9,
  },
  medium: {
    responseTime: 1.0,
    acceptanceThreshold: 0.85,
    resourceValuation: 1.0,
  },
  hard: {
    responseTime: 0.8,
    acceptanceThreshold: 0.95,
    resourceValuation: 1.1,
  },
} as const;

// Event types
export const EVENT_TYPES = {
  CRISIS: 'crisis',
  OPPORTUNITY: 'opportunity',
  MILESTONE: 'milestone',
  ALIEN_CONTACT: 'alien_contact',
  MARKET_SHIFT: 'market_shift',
} as const;

// Achievement thresholds
export const ACHIEVEMENT_THRESHOLDS = {
  SURVIVOR: {
    description: 'Complete the game without elimination',
    points: 100,
  },
  TRADER: {
    description: 'Complete 10 successful trades',
    tradesRequired: 10,
    points: 50,
  },
  DIPLOMAT: {
    description: 'Form 3 alliances',
    alliancesRequired: 3,
    points: 75,
  },
  HOARDER: {
    description: 'Accumulate 100 total resources',
    resourcesRequired: 100,
    points: 50,
  },
  CRISIS_MANAGER: {
    description: 'Survive 3 crisis events',
    crisesRequired: 3,
    points: 100,
  },
} as const;

// Firebase collection names
export const COLLECTIONS = {
  EVENTS: 'events',
  SESSIONS: 'sessions',
  TEAMS: 'teams',
  TRADES: 'trades',
  INTEL: 'intel',
  PLAYERS: 'players',
  AUDIT_LOGS: 'auditLogs',
  GAME_CONFIG: 'gameConfig',
  GALAXY_CONFIGURATIONS: 'galaxyConfigurations',
  CRISIS_EVENTS: 'crisisEvents',
  GAME_EVENTS: 'gameEvents',
  ANNOUNCEMENTS: 'announcements',
  FACILITATOR_SETTINGS: 'facilitatorSettings',
  GALAXY_STATES: 'galaxyStates',
} as const;

// Realtime database paths
export const REALTIME_PATHS = {
  SESSION_LIVE: (sessionId: string) => `sessions/${sessionId}/live`,
  ACTIVE_TRADES: (sessionId: string) => `sessions/${sessionId}/live/activeTrades`,
  PLAYER_PRESENCE: (sessionId: string) => `sessions/${sessionId}/live/playerPresence`,
  ROUND_TIMER: (sessionId: string) => `sessions/${sessionId}/live/roundTimer`,
  EVENT_STREAM: (sessionId: string) => `events/${sessionId}/stream`,
  GALAXY_STATE: (sessionId: string, galaxyId: string) => `sessions/${sessionId}/galaxies/${galaxyId}/state`,
} as const;