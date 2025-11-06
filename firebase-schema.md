# Firebase Database Schema - Space Colony Exchange

## Overview
This document outlines the complete Firebase database structure for the Space Colony Exchange game, using both Firestore for persistent data and Realtime Database for live updates.

## Firestore Database Structure

### Root Collections

#### `/events/{eventId}`
**Purpose**: Top-level container for corporate events
```typescript
{
  id: string;                    // Event ID (2-character code)
  name: string;                  // "Acme Corp Team Building 2024"
  description: string;           // Event description
  organizerId: string;           // Facilitator/organizer ID
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  maxParticipants: number;       // Total across all sessions
  currentParticipants: number;   // Current registered count
  scheduledStart: Timestamp;     // When event is scheduled
  actualStart?: Timestamp;       // When event actually started
  completedAt?: Timestamp;       // When event finished
  settings: {
    allowReconnections: boolean;
    autoProgressRounds: boolean;
    enableSpectatorMode: boolean;
    customTimings?: PhaseTimings;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `/events/{eventId}/sessions/{sessionId}`
**Purpose**: Individual game sessions within an event (12 teams each)
```typescript
{
  id: string;                    // Session ID (1-character: A, B, C, D, E)
  eventId: string;               // Parent event ID
  name: string;                  // "Session A"
  currentPhase: GamePhase;       // Current game phase
  currentRound: number;          // 1-5
  roundStartTime?: Timestamp;    // When current round started
  roundEndTime?: Timestamp;      // When current round ends
  phaseConfig: PhaseTimings;     // Round duration settings
  facilitatorId?: string;        // Assigned facilitator
  isActive: boolean;             // Currently running
  gameState: {
    alienContactActive: boolean;
    alienResources?: ResourceCollection;
    marketEvents: MarketEvent[];
    crisisEvents: CrisisEvent[];
    roundHistory: RoundSummary[];
  };
  leaderboard: TeamScore[];      // Current standings
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}
```

#### `/events/{eventId}/sessions/{sessionId}/teams/{teamId}`
**Purpose**: Individual teams (12 per session)
```typescript
{
  id: string;                    // Team ID (2-character: 01-12)
  sessionId: string;             // Parent session
  colonyType: ColonyType;        // mining, agricultural, etc.
  name: string;                  // "Mining Colony Alpha"
  displayName?: string;          // Custom team name
  resources: ResourceCollection; // Current resource counts
  investments: Investment;       // Pre-round investments
  intel: string[];              // Intel piece IDs known
  tradingStatus: TradeStatus;    // available, busy, offline, eliminated
  isEliminated: boolean;
  eliminationRound?: number;
  criticalModeRounds: number;    // Consecutive rounds in critical mode
  lastActivity: Timestamp;
  statistics: {
    totalTrades: number;
    successfulTrades: number;
    resourcesTraded: ResourceCollection;
    intelShared: number;
    roundsInCritical: number;
  };
  createdAt: Timestamp;
}
```

#### `/events/{eventId}/sessions/{sessionId}/teams/{teamId}/players/{playerId}`
**Purpose**: Individual players within teams
```typescript
{
  id: string;                    // Player ID (1-character: 1-6)
  gameCode: string;             // Full game code (EVSSA01)
  name: string;                 // Player display name
  teamId: string;               // Parent team ID
  isTeamLeader: boolean;        // Can make trades
  connectionStatus: 'online' | 'offline' | 'away';
  lastSeen: Timestamp;
  sessionStartTime?: Timestamp;  // When they joined
  totalConnectedTime: number;    // Minutes connected
  createdAt: Timestamp;
}
```

#### `/events/{eventId}/sessions/{sessionId}/trades/{tradeId}`
**Purpose**: All trade offers and negotiations
```typescript
{
  id: string;                    // UUID
  sessionId: string;             // Parent session
  initiator: string;             // Initiating team ID
  target: string;                // Target team ID
  offer: TradeOffer;             // What initiator offers
  request: TradeRequest;         // What initiator wants
  status: TradeOfferStatus;      // pending, accepted, rejected, etc.
  message?: string;              // Optional message
  expiresAt: Timestamp;          // Auto-reject time
  negotiationHistory: NegotiationStep[]; // Counter-offers
  finalTerms?: FinalTradeTerms;  // Agreed terms
  executedAt?: Timestamp;        // When trade completed
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `/events/{eventId}/sessions/{sessionId}/intel/{intelId}`
**Purpose**: Intelligence pieces generated during the game
```typescript
{
  id: string;                    // UUID
  type: IntelType;               // market_intel, crisis_warning, etc.
  title: string;                 // "Asteroid Belt Discovery"
  description: string;           // Detailed intel content
  baseValue: number;             // Original value
  currentValue: number;          // Degraded value
  roundRevealed: number;         // When intel was generated
  applicableRounds: number[];    // Which rounds it affects
  teamsKnowing: string[];        // Team IDs with this intel
  distributionHistory: {
    teamId: string;
    acquiredAt: Timestamp;
    method: 'generated' | 'traded' | 'bonus';
  }[];
  createdAt: Timestamp;
  expiresAt?: Timestamp;         // If intel expires
}
```

#### `/gameConfig/{configId}`
**Purpose**: Static game configuration and templates (admin-only)
```typescript
{
  id: string;
  version: string;               // "1.0.0"
  colonyConfigs: Record<ColonyType, ResourceCollection>;
  phaseTimings: PhaseTimings;
  resourceConsumption: ResourceCollection;
  investmentOptions: InvestmentConfig[];
  intelTemplates: IntelTemplate[];
  marketEvents: MarketEventTemplate[];
  scoringRules: ScoringConfig;
  lastUpdated: Timestamp;
}
```

#### `/systemMetrics/{metricId}`
**Purpose**: System monitoring and analytics (read-only)
```typescript
{
  id: string;
  timestamp: Timestamp;
  activeEvents: number;
  activeSessions: number;
  totalPlayers: number;
  tradesPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  databaseWrites: number;
}
```

#### `/auditLogs/{logId}`
**Purpose**: Audit trail for all game actions
```typescript
{
  id: string;
  eventId: string;
  sessionId?: string;
  teamId?: string;
  playerId?: string;
  action: AuditAction;           // trade_created, resource_updated, etc.
  details: any;                  // Action-specific data
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}
```

## Realtime Database Structure

### Purpose
Handles live updates, presence, and real-time game state that needs immediate synchronization.

### Root Structure

#### `/sessions/{sessionId}/live/`
**Purpose**: Live session data requiring immediate updates
```json
{
  "gameState": {
    "currentPhase": "round_1",
    "roundStartTime": 1641234567890,
    "roundEndTime": 1641234927890,
    "timeRemaining": 360,
    "isPaused": false
  },
  "availableTeams": {
    "CGAA01": true,    // Team available for trading
    "CGAA02": false,   // Team busy
    "CGAA03": "offline" // Team offline
  },
  "activeTrades": {
    "trade-uuid-1": {
      "initiator": "CGAA01",
      "target": "CGAA02", 
      "status": "pending",
      "expiresAt": 1641234747890,
      "timeRemaining": 180
    }
  },
  "notifications": {
    "timestamp-1": {
      "type": "trade_request",
      "message": "Mining Colony Alpha wants to trade with you",
      "targetTeam": "CGAA02",
      "priority": "high",
      "expiresAt": 1641234747890
    }
  },
  "roundTimer": {
    "current": 240,      // Seconds elapsed
    "remaining": 120,    // Seconds remaining
    "total": 360,        // Total seconds for phase
    "warnings": [60, 30, 10] // Warning thresholds
  },
  "leaderboard": [
    {
      "teamId": "CGAA01",
      "score": 1250,
      "rank": 1,
      "trend": "up"
    }
  ]
}
```

#### `/teams/{sessionId}/{teamId}/status`
**Purpose**: Real-time team status updates
```json
{
  "tradingStatus": "available",
  "currentTrade": null,
  "resourcesChanged": 1641234567890,
  "playersOnline": ["CGAA011", "CGAA012"],
  "lastAction": {
    "type": "resource_update",
    "timestamp": 1641234567890
  }
}
```

#### `/players/{playerId}/presence`
**Purpose**: Player connection tracking
```json
{
  "status": "online",
  "lastSeen": 1641234567890,
  "sessionId": "CGA",
  "teamId": "CGAA01",
  "connectedAt": 1641234567890,
  "heartbeat": 1641234567890
}
```

#### `/events/{sessionId}/stream`
**Purpose**: Real-time event feed for spectators/facilitators
```json
{
  "timestamp-1": {
    "type": "trade_completed",
    "teams": ["CGAA01", "CGAA02"],
    "summary": "Mining Colony traded 5 minerals for 3 food",
    "timestamp": 1641234567890
  },
  "timestamp-2": {
    "type": "phase_change",
    "newPhase": "round_2",
    "timestamp": 1641234567890
  }
}
```

#### `/rateLimits/{playerId}`
**Purpose**: Rate limiting enforcement
```json
{
  "tradeAttempts": {
    "count": 3,
    "windowStart": 1641234567890,
    "windowSize": 60000
  },
  "resourceUpdates": {
    "count": 10,
    "windowStart": 1641234567890,
    "windowSize": 60000
  }
}
```

## Indexes Required

### Firestore Indexes
```javascript
// /events/{eventId}/sessions/{sessionId}/trades
// Composite index on: sessionId, status, createdAt
// Composite index on: initiator, status, createdAt
// Composite index on: target, status, createdAt

// /events/{eventId}/sessions/{sessionId}/intel
// Composite index on: sessionId, roundRevealed, currentValue
// Composite index on: type, applicableRounds, currentValue

// /events/{eventId}/sessions/{sessionId}/teams
// Composite index on: sessionId, tradingStatus, lastActivity
// Composite index on: sessionId, isEliminated, criticalModeRounds

// /auditLogs
// Composite index on: eventId, timestamp
// Composite index on: sessionId, action, timestamp
// Composite index on: playerId, timestamp
```

## Security Considerations

### Game Code Format
- **Format**: `[Event:2][Session:1][Team:2][Player:1]` = 6 characters total
- **Example**: `CGAA01` = Event CG, Session A, Team A0, Player 1
- **Validation**: Must match `^[A-Z]{2}[A-E][A-Z0-9]{2}[1-6]$`

### Access Patterns
1. **Players**: Can only access their session data and team-specific information
2. **Facilitators**: Can access all sessions within their assigned events
3. **System**: Cloud Functions have elevated privileges for game logic
4. **Public**: No public access to any game data

### Rate Limiting
- **Trade Attempts**: 5 per minute per player
- **Resource Updates**: 10 per minute per team
- **Intel Sharing**: 3 per minute per team
- **Connection Attempts**: 10 per minute per IP

## Performance Optimization

### Data Locality
- All session data is grouped by sessionId for efficient querying
- Real-time data is separated from historical data
- Indexes optimize common query patterns

### Caching Strategy
- Static game configuration cached at client
- Team resources cached with TTL of 5 seconds
- Intel pieces cached until round changes
- Leaderboard cached with 10-second TTL

### Cleanup Policies
- Completed sessions archived after 30 days
- Audit logs retained for 90 days
- Real-time presence data expires after 5 minutes of inactivity
- Rate limiting data expires after 1 hour