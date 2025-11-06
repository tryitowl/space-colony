/**
 * Team composition and management types
 */

import type { ColonyType, Resources } from './base.types';

import type { Galaxy } from './galaxy.types';
import type { AIPersonalityType, AIDifficulty } from './ai.types';

/**
 * Team composition for a galaxy
 */
export interface TeamComposition {
  galaxyId: string;
  teams: TeamDefinition[];
  balanceScore: number; // 0-1, how balanced the composition is
  viabilityScore: number; // 0-1, likelihood all teams can survive
  diversityScore: number; // 0-1, variety of colony types
}

/**
 * Individual team definition
 */
export interface TeamDefinition {
  id: string;
  name: string;
  teamLetter: string; // A-Z
  teamNumber: number; // 1-99
  colonyType: ColonyType;
  playerSlots: number;
  isAIControlled: boolean;
  aiPersonality?: AIPersonalityType;
  aiDifficulty?: AIDifficulty;
  customResources?: Partial<Resources>; // Override starting resources
  handicap?: TeamHandicap; // For balancing
}

/**
 * Team handicap for balancing
 */
export interface TeamHandicap {
  resourceMultiplier?: number; // Multiply starting resources
  productionBonus?: number; // Bonus to production rates
  consumptionReduction?: number; // Reduced consumption rates
  tradingAdvantage?: number; // Better trade ratios
  description: string;
}

/**
 * Team allocation strategies
 */
export type TeamAllocationStrategy = 
  | 'sequential' // Teams assigned in order
  | 'balanced' // Distribute colony types evenly
  | 'random' // Random assignment
  | 'draft' // Players choose in turns
  | 'auction' // Bid for colony types
  | 'custom'; // Manual assignment

/**
 * Team allocation configuration
 */
export interface TeamAllocationConfig {
  strategy: TeamAllocationStrategy;
  constraints?: TeamAllocationConstraints;
  preferences?: TeamPreferences[];
  fallbackStrategy?: TeamAllocationStrategy;
}

/**
 * Constraints for team allocation
 */
export interface TeamAllocationConstraints {
  maxTeamsPerColonyType?: number;
  minTeamsPerColonyType?: number;
  requiredColonyTypes?: ColonyType[];
  excludedColonyTypes?: ColonyType[];
  maxAITeams?: number;
  requireHumanTeams?: number;
}

/**
 * Team preferences for allocation
 */
export interface TeamPreferences {
  teamId: string;
  preferredColonyTypes: ColonyType[];
  avoidColonyTypes: ColonyType[];
  preferAI?: boolean;
  preferredTeammates?: string[]; // Player IDs
}

/**
 * Team performance tracking
 */
export interface TeamPerformance {
  teamId: string;
  galaxyId: string;
  survivalRounds: number;
  resourcesGained: number;
  resourcesLost: number;
  tradesCompleted: number;
  tradeSuccessRate: number;
  investmentEfficiency: number;
  overallScore: number;
  rank: number;
}

/**
 * Team alliance for cooperative play
 */
export interface TeamAlliance {
  id: string;
  name: string;
  memberTeamIds: string[];
  galaxyIds: string[]; // Can span galaxies
  type: AllianceType;
  terms: AllianceTerms;
  status: 'proposed' | 'active' | 'dissolved';
  createdAt: number;
  dissolvedAt?: number;
}

/**
 * Types of alliances
 */
export type AllianceType = 
  | 'trade' // Preferential trading
  | 'defense' // Mutual defense
  | 'research' // Shared technology
  | 'victory'; // Shared victory condition

/**
 * Alliance terms and conditions
 */
export interface AllianceTerms {
  duration: 'permanent' | 'rounds' | 'conditional';
  roundsRemaining?: number;
  conditions?: string[];
  benefits: AllianceBenefits;
  penalties: AlliancePenalties;
}

/**
 * Benefits of alliance membership
 */
export interface AllianceBenefits {
  tradeBonus?: number; // Better trade ratios
  sharedIntel?: boolean; // Share market intel
  resourceSharing?: boolean; // Emergency resource transfers
  victorySharing?: boolean; // Shared victory
  customBenefits?: string[];
}

/**
 * Penalties for breaking alliance
 */
export interface AlliancePenalties {
  trustPenalty: number; // Reduced trust score
  tradePenalty?: number; // Worse trade ratios
  resourcePenalty?: Partial<Resources>; // Resource loss
  customPenalties?: string[];
}

/**
 * Team matchmaking for balanced games
 */
export interface TeamMatchmaking {
  playerCount: number;
  skillLevels?: PlayerSkillLevel[];
  preferences: MatchmakingPreferences;
  result: MatchmakingResult;
}

/**
 * Player skill levels for matchmaking
 */
export interface PlayerSkillLevel {
  playerId: string;
  skillRating: number; // ELO-style rating
  gamesPlayed: number;
  winRate: number;
  preferredColonyTypes: ColonyType[];
}

/**
 * Matchmaking preferences
 */
export interface MatchmakingPreferences {
  balanceMode: 'strict' | 'flexible' | 'none';
  allowAI: boolean;
  mixSkillLevels: boolean;
  preferredTeamSize: number;
  galaxyPreference?: string; // Preferred galaxy configuration
}

/**
 * Matchmaking result
 */
export interface MatchmakingResult {
  teams: TeamDefinition[];
  balanceScore: number;
  predictedCompetitiveness: number; // 0-1
  warnings?: string[];
}

/**
 * Team role within a colony
 */
export interface TeamRole {
  playerId: string;
  role: PlayerRole;
  permissions: RolePermissions;
  assignedAt: number;
}

/**
 * Player roles within a team
 */
export type PlayerRole = 
  | 'captain' // Team leader
  | 'trader' // Handles trades
  | 'strategist' // Plans investments
  | 'analyst'; // Monitors resources

/**
 * Role permissions
 */
export interface RolePermissions {
  canTrade: boolean;
  canInvest: boolean;
  canNegotiate: boolean;
  canFormAlliances: boolean;
  canAccessAllData: boolean;
}

/**
 * Team communication preferences
 */
export interface TeamCommunication {
  teamId: string;
  preferredChannels: CommunicationChannel[];
  language: string;
  timezone: string;
  availability: TimeSlot[];
}

/**
 * Communication channels
 */
export type CommunicationChannel = 
  | 'in-game-chat'
  | 'voice-chat'
  | 'video-call'
  | 'text-only';

/**
 * Time slot for availability
 */
export interface TimeSlot {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
}

/**
 * Team statistics for analytics
 */
export interface TeamStatistics {
  teamId: string;
  sessionId: string;
  galaxyId: string;
  metrics: {
    survivalRate: number;
    averageResources: Record<keyof Resources, number>;
    tradeVolume: number;
    tradeFrequency: number;
    cooperationIndex: number; // How cooperative the team is
    aggressionIndex: number; // How aggressive in trading
    efficiencyScore: number; // Resource management efficiency
  };
  milestones: TeamMilestone[];
}

/**
 * Team milestones and achievements
 */
export interface TeamMilestone {
  type: MilestoneType;
  achievedAt: number;
  description: string;
  reward?: Partial<Resources>;
}

/**
 * Types of milestones
 */
export type MilestoneType = 
  | 'first_trade'
  | 'survival_expert' // Survived X rounds
  | 'trade_master' // Completed X trades
  | 'resource_mogul' // Accumulated X resources
  | 'alliance_builder' // Formed X alliances
  | 'comeback_king' // Recovered from critical
  | 'perfect_round'; // No resource depletion

/**
 * Helper function to calculate team balance
 */
export function calculateTeamBalance(_teams: TeamDefinition[]): number {
  // Implementation would calculate balance based on colony types,
  // starting resources, and capabilities
  return 0; // Placeholder
}

/**
 * Helper function to validate team composition
 */
export function validateTeamComposition(
  composition: TeamComposition,
  galaxy: Galaxy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (composition.teams.length !== galaxy.totalTeams) {
    errors.push(`Team count mismatch: expected ${galaxy.totalTeams}, got ${composition.teams.length}`);
  }
  
  // Additional validation logic...
  
  return {
    valid: errors.length === 0,
    errors
  };
}