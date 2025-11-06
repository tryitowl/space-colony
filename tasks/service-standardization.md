# Service Standardization Reference Guide

This document establishes consistent patterns for service implementation in the Space Colony Trading Game codebase. Following these standards will improve code maintainability, reduce TypeScript errors, and make the codebase more approachable for new developers.

## Service Structure

### Preferred Pattern: Class-based Singleton Export

All services should follow a class-based implementation with a singleton export pattern:

```typescript
// 1. Define the class with all methods and properties
export class ServiceName {
  // Private properties
  private someProperty: PropertyType;
  
  // Constructor
  constructor(param1?: Type1, param2?: Type2) {
    // Initialize properties
  }
  
  // Public methods
  public doSomething(): ReturnType {
    // Implementation
  }
  
  // Private helper methods
  private helperMethod(): void {
    // Implementation
  }
}

// 2. Export a singleton instance
export const serviceName = new ServiceName();
```

#### Rationale
- Provides encapsulation of related functionality
- Allows for private helper methods and properties
- Simplifies import statements (single import for all related functionality)
- Avoids global state issues with individual function exports
- Enables dependency injection in the constructor if needed

### Instance Management

For services that require configuration or initialization:

1. **Simple services (no parameters needed):**
   ```typescript
   export const serviceName = new ServiceName();
   ```

2. **Services requiring initialization:**
   ```typescript
   export class ServiceName {
     private static instance: ServiceName | null = null;
     
     // Private constructor prevents direct instantiation
     private constructor(private param1: Type1) {}
     
     // Static initialization method
     public static initialize(param1: Type1): ServiceName {
       if (!ServiceName.instance) {
         ServiceName.instance = new ServiceName(param1);
       }
       return ServiceName.instance;
     }
     
     // Static getter for the instance
     public static getInstance(): ServiceName {
       if (!ServiceName.instance) {
         throw new Error('ServiceName not initialized. Call initialize() first.');
       }
       return ServiceName.instance;
     }
   }
   
   // Usage:
   // In initialization: ServiceName.initialize(param1);
   // In usage: ServiceName.getInstance().someMethod();
   ```

## Method Naming Conventions

### CRUD Operations

- **Create:** `createX(params): Promise<string | EntityType>`
  - Example: `createSession`, `createTeam`, `createTradeOffer`

- **Read:** `getX(id): Promise<EntityType | null>`
  - Example: `getSession`, `getTeam`, `getTradeOffer`

- **Update:** `updateX(id, params): Promise<void | EntityType>`
  - Example: `updateTeamResources`, `updateTradeStatus`

- **Delete:** `deleteX(id): Promise<void>`
  - Example: `deleteTradeOffer`, `deleteIntelPiece`

### Subscription Methods

- **Subscribe pattern:** `subscribeTo<Entity>[Filter]`
  - Example: `subscribeToSession`, `subscribeToTeamTrades`
  - Return an unsubscribe function: `() => void`
  - Accept a callback function: `(data: DataType) => void`

- **Realtime subscriptions:** Append "Realtime" for realtime database listeners
  - Example: `subscribeToTeamResourcesRealtime`

### Processing Methods

- **Process pattern:** `processX` for complex operations
  - Example: `processRoundEnd`, `processTradeCompletion`

- **Validation pattern:** `validateX` for validation operations
  - Example: `validateTrade`, `validateResourceAvailability`

### Helper Methods

- **Private helpers:** Use descriptive verbs
  - Example: `calculateBundleValue`, `ensureTradeBundle`
  - If truly internal, mark as `private`

- **Conversion helpers:** Use `convertXToY` pattern
  - Example: `convertToActiveTrade`, `convertBundleToResourceCollection`

## Parameter and Return Type Standards

### Parameter Ordering

1. Primary identifier (e.g., `id`, `sessionId`, `teamId`)
2. Required data objects
3. Optional parameters

Example:
```typescript
async createTradeOffer(
  fromTeamId: string,      // 1. Primary identifier
  toTeamId: string,        // 1. Primary identifier
  offering: TradeBundle,   // 2. Required data
  requesting: TradeBundle, // 2. Required data
  message?: string,        // 3. Optional parameter
  expiresIn?: number       // 3. Optional parameter
): Promise<string> {
  // Implementation
}
```

### Return Types

- **Creation methods:** Return the created entity's ID or the full entity
  ```typescript
  createX(...): Promise<string | EntityType>
  ```

- **Subscription methods:** Return an unsubscribe function
  ```typescript
  subscribeToX(...): () => void
  ```

- **Update/delete methods:** Return void or the updated entity
  ```typescript
  updateX(...): Promise<void | EntityType>
  ```

- **Get methods:** Return the entity or null if not found
  ```typescript
  getX(...): Promise<EntityType | null>
  ```

## Documentation Standards

### JSDoc Style

All public methods should have JSDoc comments:

```typescript
/**
 * Short description of what the method does.
 * 
 * Longer description if needed, explaining important details,
 * side effects, or conditions.
 * 
 * @param paramName Description of the parameter
 * @param anotherParam Description of another parameter
 * @returns Description of what is returned
 * @throws Conditions under which the method might throw an exception
 * @example
 * // Example usage
 * const result = service.methodName('param');
 */
public methodName(paramName: string): ReturnType {
  // Implementation
}
```

### Private Methods

Private methods should have at least a short comment:

```typescript
// Calculates the total value of resources in a trade bundle
private calculateBundleValue(bundle: TradeBundle): number {
  // Implementation
}
```

## Service-Specific Standards

### TradingService

- Use `subscribeToTeamTrades` for team-specific trade subscriptions
- Use `convertToActiveTrade` for converting TradeOffer to ActiveTrade

### GameService

- Use `subscribeToActiveTrades` for session-wide trade subscriptions
- Use `subscribeToSession` for session data subscriptions

### AdminService

- Use `createFullGameSession` for complete game setup
- Use `processRoundEnd` for end-of-round logic

## Migration Path

To standardize existing services:

1. Convert function-based services to class-based with singleton export
2. Standardize method names without changing functionality
3. Add proper JSDoc documentation to all public methods
4. Update imports in all referencing files
5. Test thoroughly before committing changes

This incremental approach minimizes the risk of breaking changes while improving the codebase structure over time.
