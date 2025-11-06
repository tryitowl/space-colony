# Type System Documentation

This directory contains the comprehensive type system for the Space Colony Exchange game with flexible galaxy configuration support.

## Core Type Files

### `index.ts`
- Core game types (Colony, Resources, Player, etc.)
- Base game mechanics types
- Re-exports all other type modules

### `galaxy.types.ts`
- Galaxy configuration types
- Multi-galaxy support
- Team structure definitions
- Victory conditions
- Cross-galaxy trading rules

### `ai.types.ts`
- AI player configuration
- AI personalities and strategies
- Galaxy-specific AI settings
- AI decision-making types
- Performance metrics

### `validation.types.ts`
- Configuration validation types
- Validation rules and constraints
- Balance metrics
- Error and warning types
- Validation context

### `config.types.ts`
- Configuration utilities
- Presets and templates
- Dynamic configuration
- Feature flags
- Configuration builders

### `team.types.ts`
- Team composition types
- Team allocation strategies
- Alliance system
- Matchmaking
- Team performance tracking

### `guards.types.ts`
- Type guards for runtime validation
- Utility types (DeepPartial, RequiredFields, etc.)
- Type predicates
- Safe casting utilities

### `investment.types.ts`
- Investment system types
- Resource production modifiers
- Investment strategies

## Key Type Patterns

### 1. Flexible Galaxy Configuration
```typescript
const galaxyConfig: GalaxyConfiguration = {
  galaxies: [
    {
      id: 'galaxy-1',
      name: 'Alpha Centauri',
      totalTeams: 6,
      colonyTypes: ['mining', 'agricultural', 'research'],
      teamStructure: { mode: 'balanced' },
      aiEnabled: true,
      aiDifficulty: 'medium'
    }
  ],
  crossGalaxyTrading: true,
  globalEvents: true,
  sharedMarketIntel: false,
  competitionMode: 'galaxy',
  victoryConditions: [...]
};
```

### 2. Validated Configuration
```typescript
// Use validation types to ensure configuration is valid
const validator = new GalaxyConfigValidator();
const result: ValidationResult = validator.validate(config);

if (result.valid) {
  const validated: ValidatedGalaxyConfiguration = config as ValidatedGalaxyConfiguration;
  // Safe to use
}
```

### 3. Type Guards
```typescript
// Runtime type checking
if (isGalaxy(unknownObject)) {
  // TypeScript knows this is a Galaxy
  console.log(unknownObject.totalTeams);
}

// Safe casting with fallback
const difficulty = safeCast(value, isAIDifficulty, 'medium');
```

### 4. AI Configuration
```typescript
const aiConfig: AIColonyConfig = {
  colonyId: 'colony-1',
  difficulty: 'hard',
  isAIControlled: true,
  personality: 'aggressive_trader',
  galaxyId: 'galaxy-1',
  adaptiveStrategy: true,
  cooperationBias: 0.3
};
```

### 5. Team Composition
```typescript
const teamComp: TeamComposition = {
  galaxyId: 'galaxy-1',
  teams: [
    {
      id: 'team-1',
      name: 'Team Alpha',
      teamLetter: 'A',
      teamNumber: 1,
      colonyType: 'mining',
      playerSlots: 4,
      isAIControlled: false
    }
  ],
  balanceScore: 0.85,
  viabilityScore: 0.92,
  diversityScore: 0.75
};
```

## Type Safety Best Practices

1. **Always use type guards for external data**
   ```typescript
   const data = await fetchGalaxyConfig();
   if (!isGalaxyConfiguration(data)) {
     throw new Error('Invalid configuration');
   }
   ```

2. **Prefer specific types over unions**
   ```typescript
   // Good
   function processColony(colony: EnhancedColony) { ... }
   
   // Avoid
   function processColony(colony: Colony | EnhancedColony) { ... }
   ```

3. **Use utility types for transformations**
   ```typescript
   // Make all fields optional for updates
   type PartialGalaxy = DeepPartial<Galaxy>;
   
   // Require specific fields
   type RequiredGalaxy = RequiredFields<Galaxy, 'id' | 'name'>;
   ```

4. **Validate at boundaries**
   - API responses
   - User input
   - Firebase data
   - Configuration files

5. **Use const assertions for literals**
   ```typescript
   const COLONY_TYPES = ['mining', 'agricultural'] as const;
   type ColonyType = typeof COLONY_TYPES[number];
   ```

## Migration Guide

When updating from single-galaxy to multi-galaxy:

1. Update `Colony` to `EnhancedColony` with galaxy support
2. Add `GalaxyConfiguration` to `GameSession`
3. Update AI configs with galaxy-specific settings
4. Use validation types to ensure configuration correctness
5. Update team assignments with galaxy IDs

## Type Versioning

Current type version: 2.0.0

Breaking changes from 1.x:
- Colony now requires galaxyId
- AI configuration expanded with personalities
- Team structure supports multiple allocation modes
- Victory conditions are now functional types