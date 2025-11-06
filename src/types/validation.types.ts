/**
 * Validation types and utilities for galaxy configuration
 */

import type { 
  Galaxy, 
  GalaxyConfiguration,
  TeamAssignment,
  SpecialRule,
  VictoryCondition 
} from './galaxy.types';
import type { ColonyType, Resources } from './base.types';
import type { AIStrategyParameters, AIDifficulty } from './ai.types';

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error with context
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
  context?: Record<string, any>;
}

/**
 * Validation warning (non-critical issues)
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Error codes for validation
 */
export type ValidationErrorCode =
  | 'INVALID_TEAM_COUNT'
  | 'INVALID_COLONY_TYPE'
  | 'DUPLICATE_TEAM_ID'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_RESOURCE_MODIFIER'
  | 'CONFLICTING_RULES'
  | 'INVALID_AI_CONFIG'
  | 'INVALID_VICTORY_CONDITION'
  | 'RESOURCE_IMBALANCE'
  | 'INVALID_GALAXY_COUNT';

/**
 * Validation constraints for galaxy configuration
 */
export interface GalaxyConstraints {
  minTeams: number;
  maxTeams: number;
  minGalaxies: number;
  maxGalaxies: number;
  allowedColonyTypes: ColonyType[];
  requiredResourceTypes: (keyof Resources)[];
  maxResourceModifier: number;
  minResourceModifier: number;
}

/**
 * Default constraints
 */
export const DEFAULT_GALAXY_CONSTRAINTS: GalaxyConstraints = {
  minTeams: 2,
  maxTeams: 12,
  minGalaxies: 1,
  maxGalaxies: 4,
  allowedColonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
  requiredResourceTypes: ['oxygen', 'food', 'water', 'energy'],
  maxResourceModifier: 3.0,
  minResourceModifier: 0.1
};

/**
 * Galaxy balance metrics for validation
 */
export interface GalaxyBalanceMetrics {
  resourceProduction: Record<keyof Resources, number>;
  resourceConsumption: Record<keyof Resources, number>;
  teamCapabilities: Record<string, TeamCapability>;
  tradeBalance: number; // 0-1, where 1 is perfectly balanced
  survivalProbability: number; // 0-1, probability all teams can survive
}

/**
 * Team capability assessment
 */
export interface TeamCapability {
  teamId: string;
  productionCapacity: Record<keyof Resources, number>;
  consumptionRate: Record<keyof Resources, number>;
  tradePotential: number;
  survivalScore: number;
  specializations: string[];
}

/**
 * Validation rule interface
 */
export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T, context?: ValidationContext) => ValidationResult;
  priority: number;
}

/**
 * Validation context for complex validations
 */
export interface ValidationContext {
  fullConfig: GalaxyConfiguration;
  constraints: GalaxyConstraints;
  currentGalaxy?: Galaxy;
  otherGalaxies?: Galaxy[];
}

/**
 * Type for validated configuration
 */
export type ValidatedGalaxyConfiguration = GalaxyConfiguration & {
  _validated: true;
  _validationTimestamp: number;
  _balanceMetrics: GalaxyBalanceMetrics;
};

/**
 * Configuration builder with validation
 */
export interface GalaxyConfigBuilder {
  addGalaxy(galaxy: Partial<Galaxy>): ValidationResult;
  removeGalaxy(galaxyId: string): void;
  setTeamAssignment(assignment: TeamAssignment): ValidationResult;
  addSpecialRule(galaxyId: string, rule: SpecialRule): ValidationResult;
  setVictoryCondition(condition: VictoryCondition): ValidationResult;
  validate(): ValidationResult;
  build(): ValidatedGalaxyConfiguration | null;
}

/**
 * AI configuration validation
 */
export interface AIConfigValidation {
  colonyId: string;
  difficulty: AIDifficulty;
  strategyParams: Partial<AIStrategyParameters>;
  validationResult: ValidationResult;
}

/**
 * Resource balance validation
 */
export interface ResourceBalanceValidation {
  galaxyId: string;
  resourceType: keyof Resources;
  totalProduction: number;
  totalConsumption: number;
  surplus: number;
  tradingRequired: boolean;
  criticalLevel: boolean;
}

/**
 * Team composition validation
 */
export interface TeamCompositionValidation {
  galaxyId: string;
  teams: Array<{
    teamId: string;
    colonyType: ColonyType;
    isValid: boolean;
    issues: string[];
  }>;
  hasRequiredTypes: boolean;
  isBalanced: boolean;
  diversityScore: number; // 0-1
}

/**
 * Special rule compatibility
 */
export interface RuleCompatibility {
  rule1: SpecialRule;
  rule2: SpecialRule;
  compatible: boolean;
  reason?: string;
  resolution?: 'override' | 'merge' | 'reject';
}

/**
 * Victory condition validation
 */
export interface VictoryConditionValidation {
  condition: VictoryCondition;
  isAchievable: boolean;
  requiredResources: (keyof Resources)[];
  estimatedDifficulty: 'easy' | 'medium' | 'hard' | 'impossible';
  warnings: string[];
}

/**
 * Configuration template validation
 */
export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  targetPlayerCount: number;
  galaxyCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  baseConfig: Partial<GalaxyConfiguration>;
  validated: boolean;
  lastValidated?: number;
}

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Detailed validation message
 */
export interface ValidationMessage {
  severity: ValidationSeverity;
  path: string; // JSON path to the field
  message: string;
  code: string;
  suggestion?: string;
  autoFixAvailable: boolean;
  autoFix?: () => any;
}

/**
 * Configuration validator options
 */
export interface ValidatorOptions {
  strictMode: boolean; // Fail on warnings
  autoFix: boolean; // Attempt to fix issues
  checkBalance: boolean; // Check resource balance
  checkAI: boolean; // Validate AI configurations
  customRules?: ValidationRule[];
}

/**
 * Validation report for debugging
 */
export interface ValidationReport {
  timestamp: number;
  configuration: GalaxyConfiguration;
  result: ValidationResult;
  balanceMetrics?: GalaxyBalanceMetrics;
  suggestions: string[];
  autoFixesApplied: string[];
}