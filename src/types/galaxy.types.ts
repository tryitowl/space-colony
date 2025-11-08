import type { 
  ColonyType, 
 
  Resources, 
  Player, 
  TradingStatus, 
  EliminationStatus, 
  Investments 
} from './base.types';
import type { AIColonyConfig, AIDifficulty } from './ai.types';

/**
 * Galaxy configuration defining team structure and game rules
 */
export interface Galaxy {
  id: string;
  name: string;
  code: string; // 3-character code for the galaxy
  participantCount: number;
  gameMode: 'full_multiplayer' | 'single_player' | 'mixed_mode';
  description?: string;
  totalTeams?: number; // 2-12 teams per galaxy
  colonyTypes?: ColonyType[]; // Which colony types are available
  teamStructure?: TeamStructure;
  resourceModifiers?: ResourceModifiers;
  specialRules?: SpecialRule[];
  aiEnabled?: boolean;
  aiDifficulty?: AIDifficulty;
  teams?: any[];
}

/**
 * Team structure configuration for a galaxy
 */
export interface TeamStructure {
  mode: 'standard' | 'balanced' | 'custom';
  /** Standard mode: Each team gets one colony type */
  /** Balanced mode: Ensures resource balance across teams */
  /** Custom mode: Facilitator assigns specific types */
  customAssignments?: Record<string, ColonyType>; // teamId -> colonyType
}

/**
 * Resource modifiers for galaxy-specific gameplay
 */
export interface ResourceModifiers {
  productionMultipliers?: Partial<Record<keyof Resources, number>>;
  consumptionMultipliers?: Partial<Record<keyof Resources, number>>;
  startingResourceMultipliers?: Partial<Record<keyof Resources, number>>;
}

/**
 * Special rules that can be applied to a galaxy
 */
export interface SpecialRule {
  id: string;
  name: string;
  description: string;
  type: 'trade_restriction' | 'resource_event' | 'win_condition' | 'gameplay_modifier' | 'elimination_rounds' |
        'no_cross_galaxy_trade' | 'max_trades_per_round' | 'trading_cooldown' | 'prohibited_resources' | 'required_intel' |
        'resource_value_modifier' | 'survival_bonus_multiplier' | 'trading_bonus_multiplier' | 'elimination_penalty_modifier' |
        'type_bonus' | 'resource_threshold';
  config?: Record<string, any>;
  value?: number;
}

/**
 * Facilitator configuration for game control and management
 */
export interface FacilitatorConfiguration {
  /** Primary facilitator user ID */
  primaryFacilitatorId: string;
  /** Additional facilitator user IDs */
  additionalFacilitatorIds?: string[];
  /** Facilitator permissions */
  permissions: FacilitatorPermissions;
  /** Dashboard configuration */
  dashboardConfig: FacilitatorDashboardConfig;
  /** Game control settings */
  gameControlSettings: GameControlSettings;
}

/**
 * Facilitator permissions for different aspects of the game
 */
export interface FacilitatorPermissions {
  canModifyTeams: boolean;
  canAdvanceRounds: boolean;
  canViewAllTeams: boolean;
  canModifyResources: boolean;
  canSendMessages: boolean;
  canExportData: boolean;
  canModifyGameSettings: boolean;
  canManageEvents: boolean;
}

/**
 * Dashboard configuration for facilitator interface
 */
export interface FacilitatorDashboardConfig {
  showRealTimeMetrics: boolean;
  showTeamPerformance: boolean;
  showResourceTrading: boolean;
  showChatLogs: boolean;
  autoRefreshInterval: number; // milliseconds
  customViews?: DashboardView[];
}

/**
 * Custom dashboard view configuration
 */
export interface DashboardView {
  id: string;
  name: string;
  type: 'team-comparison' | 'resource-flow' | 'trade-analytics' | 'player-engagement' | 'custom';
  config: Record<string, any>;
  isDefault?: boolean;
}

/**
 * Game control settings for facilitator management
 */
export interface GameControlSettings {
  allowManualRoundAdvancement: boolean;
  allowResourceModification: boolean;
  allowTeamRebalancing: boolean;
  pauseOnCriticalEvents: boolean;
  autoAdvanceRounds: boolean;
  roundAdvanceMode: 'manual' | 'timer' | 'hybrid';
}

/**
 * Reporting and analytics configuration
 */
export interface ReportingConfiguration {
  /** Data collection settings */
  dataCollection: PlayerDataCollection;
  /** Export formats and scheduling */
  exportSettings: ExportSettings;
  /** Analytics and insights configuration */
  analyticsConfig: AnalyticsConfiguration;
  /** Compliance and privacy settings */
  complianceSettings: ComplianceSettings;
}

/**
 * Player data collection configuration
 */
export interface PlayerDataCollection {
  /** What player data to collect */
  collectBasicInfo: boolean;
  collectContactInfo: boolean;
  collectJobInfo: boolean;
  collectPerformanceMetrics: boolean;
  collectSurveyResponses: boolean;
  collectSkillsAssessment: boolean;
  collectCorporateData: boolean;
  /** Custom data fields */
  customDataFields?: CustomDataField[];
  /** Data collection timing */
  collectPreEvent: boolean;
  collectDuringEvent: boolean;
  collectPostEvent: boolean;
}

/**
 * Custom data field configuration
 */
export interface CustomDataField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  required: boolean;
  options?: string[]; // For select/multiselect types
  validation?: FieldValidation;
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

/**
 * Export settings for reports and data
 */
export interface ExportSettings {
  /** Supported export formats */
  formats: ExportFormat[];
  /** Automatic export scheduling */
  autoExport: boolean;
  autoExportSchedule?: ExportSchedule;
  /** Export destinations */
  destinations: ExportDestination[];
  /** Data aggregation settings */
  aggregationLevel: 'individual' | 'team' | 'session' | 'event';
}

/**
 * Export format configuration
 */
export interface ExportFormat {
  type: 'csv' | 'excel' | 'json' | 'pdf' | 'dashboard';
  template?: string;
  customFields?: string[];
  includeCharts?: boolean;
  includeRawData?: boolean;
}

/**
 * Export schedule configuration
 */
export interface ExportSchedule {
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'event-end';
  timezone?: string;
  recipients?: string[];
}

/**
 * Export destination configuration
 */
export interface ExportDestination {
  type: 'email' | 'cloud-storage' | 'webhook' | 'database' | 'sftp';
  config: Record<string, any>;
  isDefault?: boolean;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfiguration {
  /** Real-time analytics */
  realTimeAnalytics: boolean;
  /** Performance benchmarking */
  enableBenchmarking: boolean;
  benchmarkDataSets?: string[];
  /** Predictive analytics */
  predictiveAnalytics: boolean;
  /** Custom analytics rules */
  customAnalytics?: AnalyticsRule[];
}

/**
 * Custom analytics rule
 */
export interface AnalyticsRule {
  id: string;
  name: string;
  type: 'performance' | 'behavior' | 'collaboration' | 'learning';
  condition: string; // JavaScript expression
  action: string; // What to do when condition is met
  enabled: boolean;
}

/**
 * Compliance and privacy settings
 */
export interface ComplianceSettings {
  /** Data privacy compliance */
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  dataRetentionPeriod: number; // days
  /** Consent management */
  requireExplicitConsent: boolean;
  consentFormUrl?: string;
  /** Data anonymization */
  anonymizeData: boolean;
  anonymizationDelay: number; // days after event
  /** Audit logging */
  enableAuditLog: boolean;
  auditLogRetention: number; // days
}

/**
 * Complete galaxy configuration for a game session
 * Contains all game-specific settings and configurations
 */
export interface GalaxyConfiguration {
  id?: string;
  eventId?: string; // Reference to the parent event
  name?: string;
  description?: string;
  galaxies?: Galaxy[];
  gameMode?: 'full_multiplayer' | 'single_player' | 'mixed_mode';
  globalEvents?: boolean;
  sharedMarketIntel?: boolean;
  competitionMode?: 'individual' | 'galaxy' | 'hybrid';
  crossGalaxyTrading?: boolean; // Direct access for backward compatibility
  victoryConditions?: string[];
  tradingRules?: {
    crossGalaxyTrading: boolean;
    tradeRestrictions: string[];
  };
  specialRules?: {
    resourceDecay: boolean;
    marketVolatility: 'low' | 'normal' | 'high';
    additionalRules?: string;
  };
  timing?: {
    roundDurations: number[];
    totalSessionTime: number;
    customIntelItems: string[];
    alienContactRound: number;
  };
  facilitators?: {
    count: number;
    permissions: string[];
  };
  reporting?: {
    collectPlayerData: boolean;
    reportTypes: string[];
    exportSchedule: 'end_of_round' | 'end_of_session' | 'manual';
    dataCollection?: string[];
  };
  /** Session references created from this configuration */
  sessionIds?: string[];
  /** Configuration metadata */
  createdBy?: string;
  createdAt?: Date;
  lastModified?: number;
  status?: 'draft' | 'active' | 'archived';
}

/**
 * Victory conditions for the game
 */
export interface VictoryCondition {
  id: string;
  name: string;
  description: string;
  type: 'survival' | 'economic' | 'technological' | 'diplomatic' | 'custom';
  evaluator: (teams: EnhancedColony[]) => string[]; // Returns winning team IDs
}

/**
 * Enhanced colony interface with AI control flags
 */
export interface EnhancedColony {
  id: string;
  type: ColonyType;
  name: string;
  teamLetter: string; // A-Z
  teamNumber: number; // 1-99
  galaxyId: string; // Which galaxy this colony belongs to
  players: Player[];
  resources: Resources;
  investments: Investments;
  tradingStatus: TradingStatus;
  gameCode: string;
  eliminationStatus: EliminationStatus;
  isAIControlled: boolean;
  aiConfig?: AIColonyConfig;
  /** Performance metrics for scoring */
  metrics?: ColonyMetrics;
}

/**
 * Colony performance metrics
 */
export interface ColonyMetrics {
  totalResourcesGained: number;
  totalResourcesLost: number;
  tradesCompleted: number;
  survivalRounds: number;
  investmentEfficiency: number;
  diplomaticScore: number; // Based on successful trades and partnerships
}

/**
 * Session code mapping for multi-galaxy games
 */
export interface SessionCodeMapping {
  sessionId: string;
  galaxyMappings: Record<string, GalaxyCodeMapping>;
  masterCode?: string; // Main session code
  createdAt?: number;
}

/**
 * Individual galaxy code mapping
 */
export interface GalaxyCodeMapping {
  galaxyId: string;
  galaxyName: string;
  teamCodes: Record<string, {
    teamId: string;
    teamName: string;
    colonyType: ColonyType;
  }>;
}

/**
 * Helper type for team assignment validation
 */
export type TeamAssignment = {
  teamId: string;
  galaxyId: string;
  colonyType: ColonyType;
  isAIControlled: boolean;
};

/**
 * Helper type for cross-galaxy trading validation
 */
export type CrossGalaxyTradeRules = {
  allowed: boolean;
  restrictions?: {
    maxDistance?: number; // Max galaxy "distance" for trading
    resourceTypes?: (keyof Resources)[]; // Only these resources can be traded
    taxRate?: number; // Percentage tax on cross-galaxy trades
  };
};

/**
 * Configuration step for the wizard interface
 */
export interface ConfigurationStep {
  id: string;
  title: string;
  icon: any;
}

/**
 * Event type for configuration
 */
/**
 * Event type for configuration
 */
export interface Event {
  id: string;
  name: string;
  organization: string;
  date: string;
  description?: string;
  participantCount?: number;
  code?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  createdBy: string;
}

/**
 * Helper type for galaxy event targeting
 */
export type GalaxyEventTarget = 
  | { type: 'all' } // Affects all galaxies
  | { type: 'specific'; galaxyIds: string[] } // Specific galaxies
  | { type: 'random'; count: number } // Random galaxies
  | { type: 'conditional'; condition: (galaxy: Galaxy) => boolean }; // Based on condition

// Note: Player, TradingStatus, EliminationStatus, Investments are imported from './index'

/**
 * Default galaxy configurations
 */
export const DEFAULT_GALAXY_CONFIGS: Record<string, Partial<Galaxy>> = {
  standard: {
    name: 'Standard Galaxy',
    description: 'Classic 6-team configuration with all colony types',
    totalTeams: 6,
    colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
    teamStructure: { mode: 'standard' },
    aiEnabled: false
  },
  small: {
    name: 'Small Galaxy',
    description: 'Compact 4-team configuration for smaller groups',
    totalTeams: 4,
    colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub'],
    teamStructure: { mode: 'balanced' },
    aiEnabled: true,
    aiDifficulty: 'medium'
  },
  large: {
    name: 'Large Galaxy',
    description: 'Extended 12-team configuration for large events',
    totalTeams: 12,
    colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
    teamStructure: { mode: 'balanced' },
    aiEnabled: true,
    aiDifficulty: 'hard'
  }
};

/**
 * Validation helper for galaxy configuration
 */
export const validateGalaxyConfig = (config: GalaxyConfiguration): string[] => {
  const errors: string[] = [];
  
  if (!config.galaxies || config.galaxies.length === 0) {
    errors.push('At least one galaxy must be configured');
  }
  
  config.galaxies?.forEach((galaxy, index) => {
    if (!galaxy.totalTeams || galaxy.totalTeams < 2 || galaxy.totalTeams > 12) {
      errors.push(`Galaxy ${index}: Total teams must be between 2 and 12`);
    }
    
    if (!galaxy.colonyTypes || galaxy.colonyTypes.length === 0) {
      errors.push(`Galaxy ${index}: At least one colony type must be specified`);
    }
    
    if (galaxy.teamStructure?.mode === 'custom' && !galaxy.teamStructure.customAssignments) {
      errors.push(`Galaxy ${index}: Custom mode requires team assignments`);
    }
  });
  
  if (config.tradingRules?.crossGalaxyTrading && config.galaxies && config.galaxies.length < 2) {
    errors.push('Cross-galaxy trading requires at least 2 galaxies');
  }

  return errors;
};

// Re-export team types for convenience
export type { TeamAllocationConfig } from './team.types';