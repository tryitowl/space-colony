/**
 * Multi-player team support types
 */



/**
 * Extended player information for multi-player teams
 */
export interface TeamPlayer {
  id: string;
  userId: string; // Firebase auth UID
  name: string;
  teamId: string;
  role: TeamPlayerRole;
  status: PlayerStatus;
  joinedAt: number;
  lastActiveAt: number;
  permissions: PlayerPermissions;
  statistics: PlayerStatistics;
  connectionId?: string; // For presence tracking
}

/**
 * Player roles within a team
 */
export type TeamPlayerRole = 
  | 'captain'    // Team leader - can override decisions
  | 'trader'     // Handles trades and negotiations
  | 'analyst'    // Resource management and strategy
  | 'member';    // General team member

/**
 * Player status
 */
export interface PlayerStatus {
  isOnline: boolean;
  isActive: boolean; // Currently in the game interface
  lastSeen: number;
  connectionStrength: 'strong' | 'moderate' | 'weak' | 'offline';
  device: 'desktop' | 'tablet' | 'mobile';
}

/**
 * Player permissions based on role and team settings
 */
export interface PlayerPermissions {
  canInitiateTrades: boolean;
  canAcceptTrades: boolean;
  canRejectTrades: boolean;
  canMakeInvestments: boolean;
  canViewAllData: boolean;
  canManageTeam: boolean;
  canOverrideDecisions: boolean;
  canKickPlayers: boolean;
}

/**
 * Player activity statistics
 */
export interface PlayerStatistics {
  tradesInitiated: number;
  tradesCompleted: number;
  decisionsParticipated: number;
  resourcesGained: number;
  resourcesLost: number;
  activityScore: number; // 0-100
}

/**
 * Team decision-making configuration
 */
export interface TeamDecisionConfig {
  mode: DecisionMode;
  votingTimeout: number; // milliseconds
  requireQuorum: boolean;
  quorumPercentage: number; // 0-100
  captainOverride: boolean;
  autoAcceptTimeout?: number; // Auto-accept trades after timeout
}

/**
 * Decision-making modes
 */
export type DecisionMode = 
  | 'captain'    // Captain has final say
  | 'consensus'  // Majority vote required
  | 'unanimous'  // All active players must agree
  | 'any';       // Any player can make decisions

/**
 * Trade decision tracking
 */
export interface TradeDecision {
  tradeId: string;
  teamId: string;
  proposedBy: string; // Player ID who proposed action
  proposedAt: number;
  expiresAt: number;
  status: DecisionStatus;
  votes: PlayerVote[];
  finalDecision?: 'accept' | 'reject' | 'counter';
  decidedBy?: string; // Player ID who made final decision
  decidedAt?: number;
  decisionReason?: string;
}

/**
 * Decision status
 */
export type DecisionStatus = 
  | 'pending'
  | 'voting'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'overridden';

/**
 * Player vote on a decision
 */
export interface PlayerVote {
  playerId: string;
  vote: 'accept' | 'reject' | 'abstain';
  votedAt: number;
  comment?: string;
}

/**
 * Team presence information
 */
export interface TeamPresence {
  teamId: string;
  onlinePlayerCount: number;
  activePlayerCount: number;
  players: PlayerPresence[];
  lastActivity: number;
  teamStatus: 'active' | 'idle' | 'inactive';
}

/**
 * Individual player presence
 */
export interface PlayerPresence {
  playerId: string;
  isOnline: boolean;
  isActive: boolean;
  lastActiveAt: number;
  currentView?: string; // Current page/view in the app
  connectionId?: string;
}

/**
 * Team activity log entry
 */
export interface TeamActivityLog {
  id: string;
  teamId: string;
  timestamp: number;
  type: ActivityType;
  playerId: string;
  playerName: string;
  details: ActivityDetails;
}

/**
 * Types of team activities
 */
export type ActivityType = 
  | 'player_joined'
  | 'player_left'
  | 'trade_proposed'
  | 'trade_voted'
  | 'trade_completed'
  | 'investment_made'
  | 'role_changed'
  | 'decision_overridden'
  | 'resource_critical'
  | 'chat_message';

/**
 * Activity details based on type
 */
export interface ActivityDetails {
  message: string;
  metadata?: Record<string, any>;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Team chat message
 */
export interface TeamChatMessage {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'trade' | 'alert';
  metadata?: MessageMetadata;
}

/**
 * Chat message metadata
 */
export interface MessageMetadata {
  tradeId?: string;
  resourceType?: string;
  amount?: number;
  targetTeam?: string;
}

/**
 * Player substitution request
 */
export interface SubstitutionRequest {
  id: string;
  teamId: string;
  requestingPlayerId: string;
  targetPlayerId?: string; // Specific player to substitute
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: string;
}

/**
 * Team synchronization state
 */
export interface TeamSyncState {
  teamId: string;
  lastSyncTime: number;
  pendingUpdates: PendingUpdate[];
  conflictResolutions: ConflictResolution[];
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
}

/**
 * Pending update for sync
 */
export interface PendingUpdate {
  id: string;
  playerId: string;
  type: 'resource' | 'trade' | 'investment' | 'status';
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Conflict resolution record
 */
export interface ConflictResolution {
  id: string;
  conflictType: 'simultaneous_trade' | 'resource_mismatch' | 'investment_conflict';
  involvedPlayers: string[];
  resolution: 'first_wins' | 'last_wins' | 'captain_decides' | 'vote';
  resolvedAt: number;
  details: string;
}

/**
 * Helper functions for permission management
 */
export const getDefaultPermissions = (role: TeamPlayerRole): PlayerPermissions => {
  switch (role) {
    case 'captain':
      return {
        canInitiateTrades: true,
        canAcceptTrades: true,
        canRejectTrades: true,
        canMakeInvestments: true,
        canViewAllData: true,
        canManageTeam: true,
        canOverrideDecisions: true,
        canKickPlayers: true,
      };
    case 'trader':
      return {
        canInitiateTrades: true,
        canAcceptTrades: true,
        canRejectTrades: true,
        canMakeInvestments: false,
        canViewAllData: true,
        canManageTeam: false,
        canOverrideDecisions: false,
        canKickPlayers: false,
      };
    case 'analyst':
      return {
        canInitiateTrades: false,
        canAcceptTrades: false,
        canRejectTrades: false,
        canMakeInvestments: true,
        canViewAllData: true,
        canManageTeam: false,
        canOverrideDecisions: false,
        canKickPlayers: false,
      };
    case 'member':
    default:
      return {
        canInitiateTrades: false,
        canAcceptTrades: false,
        canRejectTrades: false,
        canMakeInvestments: false,
        canViewAllData: true,
        canManageTeam: false,
        canOverrideDecisions: false,
        canKickPlayers: false,
      };
  }
};

/**
 * Check if a player can perform an action
 */
export const canPlayerPerformAction = (
  player: TeamPlayer,
  action: keyof PlayerPermissions
): boolean => {
  return player.permissions[action] || false;
};