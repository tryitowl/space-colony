/**
 * Type guards and utility types for galaxy configuration
 */

import type { 
  Galaxy, 
  GalaxyConfiguration, 
  EnhancedColony,
  SpecialRule,
  VictoryCondition,
  TeamStructure,
  SessionCodeMapping
} from './galaxy.types';
import type { 
  ColonyType, 
  Resources, 
  IntelItem 
} from './base.types';

import type { 
  AIColonyConfig, 
  AIDifficulty,
  AIDecision,
  AIDecisionType
} from './ai.types';
import type { ValidatedGalaxyConfiguration } from './validation.types';

/**
 * Type guard for Galaxy
 */
export function isGalaxy(obj: any): obj is Galaxy {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.totalTeams === 'number' &&
    Array.isArray(obj.colonyTypes) &&
    obj.colonyTypes.every((type: any) => isColonyType(type)) &&
    isTeamStructure(obj.teamStructure) &&
    typeof obj.aiEnabled === 'boolean'
  );
}

/**
 * Type guard for ColonyType
 */
export function isColonyType(value: any): value is ColonyType {
  return [
    'mining',
    'agricultural',
    'research',
    'trade_hub',
    'military',
    'manufacturing'
  ].includes(value);
}

/**
 * Type guard for TeamStructure
 */
export function isTeamStructure(obj: any): obj is TeamStructure {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ['standard', 'balanced', 'custom'].includes(obj.mode) &&
    (obj.mode !== 'custom' || typeof obj.customAssignments === 'object')
  );
}

/**
 * Type guard for EnhancedColony
 */
export function isEnhancedColony(obj: any): obj is EnhancedColony {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    isColonyType(obj.type) &&
    typeof obj.galaxyId === 'string' &&
    typeof obj.isAIControlled === 'boolean' &&
    (!obj.isAIControlled || isAIColonyConfig(obj.aiConfig))
  );
}

/**
 * Type guard for AIColonyConfig
 */
export function isAIColonyConfig(obj: any): obj is AIColonyConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.colonyId === 'string' &&
    isAIDifficulty(obj.difficulty) &&
    typeof obj.isAIControlled === 'boolean'
  );
}

/**
 * Type guard for AIDifficulty
 */
export function isAIDifficulty(value: any): value is AIDifficulty {
  return ['easy', 'medium', 'hard'].includes(value);
}

/**
 * Type guard for Resources (partial)
 */
export function isPartialResources(obj: any): obj is Partial<Resources> {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const validKeys = [
    'oxygen', 'food', 'water', 'energy',
    'minerals', 'alloys', 'techComponents',
    'marketIntel', 'surveyReports', 'crisisWarnings',
    'defenseContracts', 'systemRepairs', 'transportRoutes',
    'techPatents', 'blueprints', 'alienTech',
    'xenoBio', 'quantumCores', 'darkMatter',
    'credits'
  ];
  
  return Object.keys(obj).every(key => 
    validKeys.includes(key) &&
    (typeof obj[key] === 'number' || 
     (Array.isArray(obj[key]) && ['marketIntel', 'surveyReports', 'crisisWarnings'].includes(key)))
  );
}

/**
 * Type guard for IntelItem
 */
export function isIntelItem(obj: any): obj is IntelItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.value === 'number' &&
    typeof obj.roundGenerated === 'number'
  );
}

/**
 * Type guard for SpecialRule
 */
export function isSpecialRule(obj: any): obj is SpecialRule {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    ['trade_restriction', 'resource_event', 'win_condition', 'gameplay_modifier'].includes(obj.type) &&
    typeof obj.config === 'object'
  );
}

/**
 * Type guard for VictoryCondition
 */
export function isVictoryCondition(obj: any): obj is VictoryCondition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    ['survival', 'economic', 'technological', 'diplomatic', 'custom'].includes(obj.type) &&
    typeof obj.evaluator === 'function'
  );
}

/**
 * Type guard for GalaxyConfiguration
 */
export function isGalaxyConfiguration(obj: any): obj is GalaxyConfiguration {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray(obj.galaxies) &&
    obj.galaxies.every((g: any) => isGalaxy(g)) &&
    typeof obj.crossGalaxyTrading === 'boolean' &&
    typeof obj.globalEvents === 'boolean' &&
    typeof obj.sharedMarketIntel === 'boolean' &&
    ['individual', 'galaxy', 'hybrid'].includes(obj.competitionMode) &&
    Array.isArray(obj.victoryConditions)
  );
}

/**
 * Type guard for ValidatedGalaxyConfiguration
 */
export function isValidatedGalaxyConfiguration(obj: any): obj is ValidatedGalaxyConfiguration {
  return (
    isGalaxyConfiguration(obj) &&
    '_validated' in obj && obj._validated === true &&
    '_validationTimestamp' in obj && typeof obj._validationTimestamp === 'number' &&
    '_balanceMetrics' in obj && typeof obj._balanceMetrics === 'object'
  );
}

/**
 * Type guard for SessionCodeMapping
 */
export function isSessionCodeMapping(obj: any): obj is SessionCodeMapping {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.sessionId === 'string' &&
    typeof obj.masterCode === 'string' &&
    Array.isArray(obj.galaxyMappings) &&
    typeof obj.createdAt === 'number'
  );
}

/**
 * Type guard for AIDecision
 */
export function isAIDecision(obj: any): obj is AIDecision {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isAIDecisionType(obj.type) &&
    typeof obj.confidence === 'number' &&
    Array.isArray(obj.reasoning)
  );
}

/**
 * Type guard for AIDecisionType
 */
export function isAIDecisionType(value: any): value is AIDecisionType {
  return [
    'accept_trade',
    'reject_trade',
    'counter_trade',
    'initiate_trade',
    'wait',
    'emergency_trade'
  ].includes(value);
}

/**
 * Utility type for deep partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Utility type for required fields
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for optional fields
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for readonly deep
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? DeepReadonly<U>[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Utility type for mutable (removes readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Utility type for picking nested properties
 */
export type NestedPick<T, K extends string> = K extends `${infer P}.${infer R}`
  ? P extends keyof T
    ? { [K in P]: NestedPick<T[P], R> }
    : never
  : K extends keyof T
  ? Pick<T, K>
  : never;

/**
 * Utility type for flattening union types
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Utility type for extracting array element type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Utility type for non-nullable
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Utility type for extracting keys of specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Utility type for resource keys
 */
export type ResourceKey = KeysOfType<Resources, number>;

/**
 * Utility type for intel keys
 */
export type IntelKey = KeysOfType<Resources, IntelItem[]>;

/**
 * Type predicate for checking if a key is a resource key
 */
export function isResourceKey(key: string): key is ResourceKey {
  const resourceKeys = [
    'oxygen', 'food', 'water', 'energy',
    'minerals', 'alloys', 'techComponents',
    'defenseContracts', 'systemRepairs', 'transportRoutes',
    'techPatents', 'blueprints', 'alienTech',
    'xenoBio', 'quantumCores', 'darkMatter',
    'credits'
  ] as const;
  return resourceKeys.includes(key as any);
}

/**
 * Type predicate for checking if a key is an intel key
 */
export function isIntelKey(key: string): key is IntelKey {
  const intelKeys = ['marketIntel', 'surveyReports', 'crisisWarnings', 'intel'] as const;
  return intelKeys.includes(key as any);
}

/**
 * Helper to assert type (throws if invalid)
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage?: string
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(errorMessage || 'Type assertion failed');
  }
}

/**
 * Helper to safely cast with validation
 */
export function safeCast<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  fallback: T
): T {
  return guard(value) ? value : fallback;
}