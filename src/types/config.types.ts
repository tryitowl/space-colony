/**
 * Configuration type utilities for flexible galaxy setup
 */

import type {
  Galaxy,
  GalaxyConfiguration
} from './galaxy.types';
import type { ColonyType, Resources } from './base.types';
import type { AIDifficulty, AIStrategyParameters } from './ai.types';

/**
 * Configuration preset for quick setup
 */
export interface GalaxyPreset {
  id: string;
  name: string;
  description: string;
  tags: PresetTag[];
  playerRange: { min: number; max: number };
  galaxyTemplate: Partial<Galaxy>;
  recommendedSettings: RecommendedSettings;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * Preset tags for categorization
 */
export type PresetTag = 
  | 'competitive'
  | 'cooperative'
  | 'educational'
  | 'quick-play'
  | 'extended-play'
  | 'resource-scarce'
  | 'resource-abundant'
  | 'ai-supported'
  | 'pvp-only';

/**
 * Recommended settings for a preset
 */
export interface RecommendedSettings {
  roundDurations: Partial<Record<string, number>>;
  aiDifficulty?: AIDifficulty;
  enabledFeatures: string[];
  victoryConditions: string[];
}

/**
 * Dynamic configuration based on player count
 */
export interface DynamicGalaxyConfig {
  playerCount: number;
  generateConfig: () => GalaxyConfiguration;
  constraints: ConfigConstraints;
}

/**
 * Configuration constraints
 */
export interface ConfigConstraints {
  minPlayersPerTeam: number;
  maxPlayersPerTeam: number;
  requiredColonyTypes?: ColonyType[];
  forbiddenColonyTypes?: ColonyType[];
  resourceConstraints?: ResourceConstraints;
  teamBalancing: BalancingStrategy;
}

/**
 * Resource constraints for configuration
 */
export interface ResourceConstraints {
  minStartingResources: Partial<Resources>;
  maxStartingResources: Partial<Resources>;
  requiredResourceTypes: (keyof Resources)[];
  scarcityLevel: 'abundant' | 'normal' | 'scarce' | 'critical';
}

/**
 * Team balancing strategies
 */
export type BalancingStrategy = 
  | 'strict' // All teams must have equal capabilities
  | 'flexible' // Teams can vary but must be viable
  | 'asymmetric' // Intentionally different team capabilities
  | 'custom'; // User-defined balancing

/**
 * Configuration modifier for runtime adjustments
 */
export interface ConfigModifier {
  id: string;
  name: string;
  description: string;
  apply: (config: GalaxyConfiguration) => GalaxyConfiguration;
  validate: (config: GalaxyConfiguration) => boolean;
  revertible: boolean;
}

/**
 * Team composition template
 */
export interface TeamCompositionTemplate {
  id: string;
  name: string;
  teamCount: number;
  assignments: Array<{
    teamIndex: number;
    colonyType: ColonyType;
    aiControlled?: boolean;
    aiDifficulty?: AIDifficulty;
  }>;
  balanceScore: number; // 0-1, pre-calculated balance
}

/**
 * Resource distribution configuration
 */
export interface ResourceDistribution {
  mode: 'standard' | 'custom' | 'random' | 'balanced';
  customDistribution?: Partial<Record<ColonyType, Partial<Resources>>>;
  randomSeed?: number;
  variancePercentage?: number; // For random mode
  ensureViability: boolean; // Ensure all teams can survive
}

/**
 * AI team configuration
 */
export interface AITeamConfig {
  teamId: string;
  colonyType: ColonyType;
  difficulty: AIDifficulty;
  personality: AIPersonality;
  customStrategy?: Partial<AIStrategyParameters>;
}

/**
 * AI personality types
 */
export type AIPersonality = 
  | 'aggressive_trader'
  | 'cautious_hoarder'
  | 'balanced_player'
  | 'opportunistic'
  | 'cooperative'
  | 'competitive'
  | 'specialist'; // Focuses on specific resources

/**
 * Galaxy linking configuration for multi-galaxy games
 */
export interface GalaxyLinkConfig {
  sourceGalaxyId: string;
  targetGalaxyId: string;
  linkType: GalaxyLinkType;
  restrictions?: LinkRestrictions;
}

/**
 * Types of galaxy links
 */
export type GalaxyLinkType = 
  | 'full_trade' // All resources can be traded
  | 'limited_trade' // Only specific resources
  | 'information_only' // Only intel sharing
  | 'competition' // Galaxies compete, no cooperation
  | 'alliance'; // Shared victory conditions

/**
 * Link restrictions between galaxies
 */
export interface LinkRestrictions {
  allowedResources?: (keyof Resources)[];
  tradeFrequency?: 'unlimited' | 'once_per_round' | 'limited';
  maxTradeVolume?: number;
  taxRate?: number;
  requiresAgreement?: boolean; // Both sides must agree
}

/**
 * Session configuration builder state
 */
export interface ConfigBuilderState {
  galaxies: Array<Partial<Galaxy>>;
  links: GalaxyLinkConfig[];
  globalSettings: Partial<GalaxyConfiguration>;
  teamAssignments: Map<string, ConfigTeamAssignment>;
  validationErrors: string[];
  isValid: boolean;
}

/**
 * Configuration team assignment (distinct from galaxy.types TeamAssignment)
 */
export interface ConfigTeamAssignment {
  teamId: string;
  teamName: string;
  galaxyId: string;
  colonyType: ColonyType;
  playerSlots: number;
  isAIControlled: boolean;
  aiConfig?: AITeamConfig;
}

/**
 * Configuration migration for version updates
 */
export interface ConfigMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (oldConfig: any) => GalaxyConfiguration;
  description: string;
}

/**
 * Feature flags for configuration
 */
export interface ConfigFeatureFlags {
  enableMultiGalaxy: boolean;
  enableAITeams: boolean;
  enableCrossGalaxyTrade: boolean;
  enableDynamicEvents: boolean;
  enableCustomVictoryConditions: boolean;
  enableAdvancedDiplomacy: boolean;
  enableResourceModifiers: boolean;
  enableSpecialRules: boolean;
}

/**
 * Configuration metadata
 */
export interface ConfigMetadata {
  version: string;
  createdAt: number;
  createdBy: string;
  lastModified: number;
  modifiedBy: string;
  tags: string[];
  notes: string;
  featureFlags: ConfigFeatureFlags;
}

/**
 * Complete configuration package
 */
export interface ConfigurationPackage {
  metadata: ConfigMetadata;
  configuration: GalaxyConfiguration;
  presets?: GalaxyPreset[];
  templates?: TeamCompositionTemplate[];
  modifiers?: ConfigModifier[];
  validationReport?: import('./validation.types').ValidationReport;
}