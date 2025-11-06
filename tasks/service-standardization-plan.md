# Service Standardization Plan

## Current State

After analyzing the service files, we've identified the following inconsistencies:

1. **Service Class vs. Function Export Pattern:**
   - `adminService.ts` uses a class-based approach with a singleton export
   - `gameService.ts` uses individual function exports
   - `tradingService.ts` uses a class-based approach but requires instantiation

2. **Method Naming Patterns:**
   - `gameService.ts` - functions like `createTradeOffer`, `updateTradeStatus`, etc.
   - `adminService.ts` - class methods like `createFullGameSession`, `processRoundEnd`, etc.
   - `tradingService.ts` - class methods like `createTradeOffer`, `respondToTradeOffer`, etc.

3. **Listener/Subscription Methods:**
   - `gameService.ts` - uses both naming patterns: `subscribeToSession` and `listenToActiveTrades`
   - `tradingService.ts` - consistently uses `listenTo*` pattern (`listenToTradingPartners`, `listenToActiveTrades`)

4. **Documentation Style:**
   - `gameService.ts` - mix of inline comments and JSDoc
   - `adminService.ts` - primarily inline comments
   - `tradingService.ts` - mix of section comments and JSDoc

## Standardization Recommendations

### 1. Service Pattern
- Standardize on class-based services with singleton exports
- Example: `export class GameService { ... }; export const gameService = new GameService();`
- This aligns with modern TypeScript practices and allows for better state management

### 2. Method Naming Conventions
- Use consistent prefixes for similar operations:
  - `create*` for creation operations
  - `update*` for update operations
  - `get*` for retrieval operations
  - `subscribe*` for all real-time subscription methods (standardize on "subscribe" over "listen")
  - `validate*` for validation methods
  - `process*` for batch processing operations

### 3. Export Pattern
- Each service file should export a single instance: `export const gameService = new GameService();`
- This provides consistency and prevents multiple instances

### 4. Documentation Style
- Standardize on JSDoc for all public methods
- Use section comments for grouping related methods

## Implementation Strategy

To ensure we don't lose functionality, we'll follow these steps for each service file:

1. Create a new class-based version of the service
2. Move methods into the class, standardizing names while preserving signatures
3. Add proper JSDoc documentation
4. Export the singleton instance
5. Maintain backward compatibility with existing code by:
   - Re-exporting methods to match current usage patterns
   - Adding deprecated warnings where appropriate

## Specific Rename Patterns

### gameService.ts
- `listenToActiveTrades` → `subscribeToActiveTrades` 
- Ensure consistent naming between similar methods in gameService and tradingService

### adminService.ts
- No major changes needed as it already uses the class pattern
- Standardize JSDoc documentation

### tradingService.ts
- Already uses class pattern, but needs export standardization
- Change `listenTo*` methods to `subscribeTo*` for consistency
- Export a singleton instance rather than requiring instantiation

## Testing Strategy
- Test each service after modification to ensure all functionality is preserved
- Focus on real-time subscription methods as they're most likely to be affected
- Verify that dependent components still work correctly
