// Realtime Database Types for Live Updates

export interface LiveSessionData {
  id: string;
  currentPhase: string;
  currentRound: number;
  roundStartTime?: number;
  roundEndTime?: number;
  timeRemaining?: number;
  isActive: boolean;
  participantCount: number;
}

export interface LiveTeamStatus {
  id: string;
  name: string;
  colonyType: string;
  status: 'available' | 'busy' | 'offline' | 'eliminated';
  playerCount: number;
  lastActivity: number;
  currentResources: {
    oxygen: number;
    food: number;
    water: number;
    energy: number;
    [key: string]: number;
  };
  isInCriticalMode: boolean;
}

export interface LiveTradeActivity {
  sessionId: string;
  fromTeam: string;
  toTeam: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface LivePlayerConnection {
  playerId: string;
  teamId: string;
  sessionId: string;
  status: 'online' | 'offline';
  lastSeen: number;
  gameCode: string;
}

export interface LiveGameEvents {
  sessionId: string;
  events: Array<{
    id: string;
    type: 'trade_completed' | 'round_started' | 'round_ended' | 'intel_distributed' | 'team_eliminated' | 'alien_contact';
    message: string;
    timestamp: number;
    relevantTeams?: string[];
  }>;
}

export interface LiveLeaderboard {
  sessionId: string;
  round: number;
  rankings: Array<{
    teamId: string;
    teamName: string;
    colonyType: string;
    survivalScore: number;
    efficiencyScore: number;
    totalScore: number;
    rank: number;
  }>;
  lastUpdated: number;
}

// Complete Realtime Database Structure
export interface RealtimeDatabase {
  // Live session data
  sessions: Record<string, LiveSessionData>; // sessionId -> live data
  
  // Team status updates
  teams: Record<string, Record<string, LiveTeamStatus>>; // sessionId -> teamId -> status
  
  // Player presence
  players: Record<string, LivePlayerPresence>; // playerId -> presence
  
  // Live event streams
  events: Record<string, LiveEventStream>; // sessionId -> events
  
  // Leaderboards
  leaderboards: Record<string, LiveTeamScore[]>; // sessionId -> scores
  
  // Rate limiting
  rateLimits: Record<string, LivePlayerRateLimits>; // playerId -> limits
  
  // System monitoring
  systemMetrics: {
    activeEvents: number;
    activeSessions: number;
    totalPlayers: number;
    tradesPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    databaseWrites: number;
    lastUpdated: number;
  };
}

// Helper types for real-time listeners
export interface RealtimeListenerCallbacks {
  onSessionUpdate?: (sessionId: string, data: LiveSessionData) => void;
  onTeamStatusChange?: (sessionId: string, teamId: string, status: LiveTeamStatus) => void;
  onTradeUpdate?: (sessionId: string, tradeId: string, trade: LiveTradeData) => void;
  onPlayerPresence?: (playerId: string, presence: LivePlayerPresence) => void;
  onGameEvent?: (sessionId: string, event: LiveGameEvent) => void;
  onLeaderboardUpdate?: (sessionId: string, scores: LiveTeamScore[]) => void;
  onNotification?: (notification: LiveNotification) => void;
}

// Real-time paths for Firebase Realtime Database
export const REALTIME_PATHS = {
  SESSION_LIVE: (sessionId: string) => `/sessions/${sessionId}/live`,
  TEAM_STATUS: (sessionId: string, teamId: string) => `/teams/${sessionId}/${teamId}/status`,
  PLAYER_PRESENCE: (playerId: string) => `/players/${playerId}/presence`,
  EVENT_STREAM: (sessionId: string) => `/events/${sessionId}/stream`,
  LEADERBOARD: (sessionId: string) => `/leaderboards/${sessionId}`,
  RATE_LIMITS: (playerId: string) => `/rateLimits/${playerId}`,
  SYSTEM_METRICS: () => '/systemMetrics'
} as const;

// Additional types that were missing
export interface LiveTradeData {
  id: string;
  initiatorId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'counter_offered';
  timestamp: number;
  expiresAt: number;
}

export interface LivePlayerPresence {
  playerId: string;
  isOnline: boolean;
  lastSeen: number;
  currentActivity?: string;
}

export interface LiveGameEvent {
  id: string;
  type: 'trade' | 'elimination' | 'phase_change' | 'system';
  message: string;
  timestamp: number;
  data?: LiveGameEventData;
}

export interface LiveGameEventData {
  tradeId?: string;
  teamId?: string;
  fromTeam?: string;
  toTeam?: string;
  phase?: string;
  round?: number;
  resources?: Record<string, number>;
  [key: string]: unknown;
}

export interface LiveTeamScore {
  teamId: string;
  teamName: string;
  score: number;
  rank: number;
  previousRank?: number;
}

export interface LivePlayerRateLimits {
  playerId: string;
  tradesRemaining: number;
  nextResetTime: number;
}

export interface LiveNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade';
  title: string;
  message?: string;
  timestamp: number;
  recipientId: string;
}

export interface LiveEventStream {
  events: LiveGameEvent[];
  lastUpdated: number;
}