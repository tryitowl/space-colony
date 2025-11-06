# Type Definition Cleanup Report

## Duplicate Type Definitions

The following duplicate type definitions were found between `src/types/index.ts` and `src/types/game.ts`:

| Type Name | Files | Status | Resolution |
|-----------|-------|--------|------------|
| `Team` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `Colony` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `TradeOffer` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `Trade` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `Player` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `GameSettings` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `GameEvent` | index.ts, game.ts | ⚠️ Different definitions | Export from game.ts, remove from index.ts |
| `Resources` | index.ts, game.ts (ResourceCollection) | 🔄 Different names | Consolidate or clarify relationship |

## Recommended Changes

1. **Type Consolidation**:
   - Update `index.ts` to re-export game types from `game.ts` rather than duplicating definitions
   - Use module re-export syntax: `export { Team, Colony, ... } from './game'`

2. **Handling Incompatible Types**:
   - Where types differ but serve the same purpose (like Resources/ResourceCollection), decide on one implementation and update references
   - Add deprecation comments for any types that should be phased out

3. **Export Organization**:
   - Group exports by domain (game types, UI types, etc.)
   - Add clear comments about the purpose of each type group

## Implementation Plan

1. Create a single source of truth for each type
2. Update imports across the codebase to use the correct type path
3. Add type aliases where necessary for backward compatibility
4. Verify that all components still compile after changes

## Interface Conflicts

The most significant differences are in the following interfaces:

### Team Interface
- In `game.ts`: More comprehensive with fields for resources, intel, trades
- In `index.ts`: Simpler version missing several fields

### Trade Interface
- In `game.ts`: Includes negotiation steps and trade request history
- In `index.ts`: Simpler version with basic trade details

### Resolution
These differences likely reflect the enhanced game models migrated from space-colony-exchange. We should standardize on the `game.ts` versions and update all references.
