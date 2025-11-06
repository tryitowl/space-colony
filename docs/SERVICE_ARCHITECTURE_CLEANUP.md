# Service Architecture Cleanup

## Overview
This document tracks services that need to be migrated to use the ServiceFactory pattern for proper dependency injection and service management.

## Current State

### ServiceFactory Implementation ✅
The ServiceFactory is fully implemented with:
- Dynamic service selection based on game mode (standard vs flexible)
- Dependency injection container (ServiceContainer)
- Service registration helpers
- React hooks for service usage
- Caching for performance

### Services Using Direct Instantiation ❌
The following services bypass the ServiceFactory and use direct instantiation:

1. **aiIntegrationService.ts**
   - Creates `new AIColonyService()` directly
   - Should use dependency injection for AIColonyService

2. **analyticsService.ts**
   - Creates `new Analytics()` objects
   - Consider if these should be managed by factory

3. **sessionService.ts** & **sessionLookupService.ts**
   - Direct instantiation in multiple places
   - Should use factory pattern

4. **AI Personality Services**
   - aiPersonalityService.ts
   - aiPersonalityDistributionService.ts
   - aiBehaviorPatternService.ts
   - These create new personality/behavior objects

5. **Other Services**
   - sessionGalaxyService.ts
   - sessionCodeService.ts
   - gameEngineService.ts
   - analyticsExportService.ts

## Recommended Actions

### Phase 1: Update Core Services
1. **Update AIIntegrationService**
   ```typescript
   // Instead of:
   const aiColony = new AIColonyService(colonyId, colonyData, strategyService);
   
   // Use:
   const services = ServiceFactory.getServices({ enableAI: true });
   const aiColony = services.aiServices.colonyService.getInstance(colonyId, colonyData);
   ```

2. **Convert Singleton Services**
   - Many services use singleton pattern with `getInstance()`
   - These should register with ServiceContainer on first creation

### Phase 2: Create Service Interfaces
Define clear interfaces for all services to enable easier testing and swapping implementations:

```typescript
interface ISessionService {
  createSession(data: SessionData): Promise<string>;
  getSession(id: string): Promise<GameSession>;
  updateSession(id: string, data: Partial<GameSession>): Promise<void>;
}
```

### Phase 3: Update Component Usage
Replace direct imports in components:

```typescript
// Instead of:
import { sessionService } from '../services/sessionService';

// Use:
import { useService } from '../services/ServiceFactory';
const sessionService = useService('sessionService');
```

### Phase 4: Add Service Lifecycle Management
- Implement proper cleanup methods
- Add service initialization hooks
- Handle service dependencies explicitly

## Benefits of Migration

1. **Testability**: Easy to mock services for testing
2. **Flexibility**: Switch implementations based on configuration
3. **Performance**: Cached service instances
4. **Maintainability**: Clear dependency graph
5. **Consistency**: All services follow same pattern

## Migration Priority

### High Priority
1. AIIntegrationService - Core gameplay
2. SessionService - Critical for game flow
3. TradingService - Already partially migrated

### Medium Priority
1. AnalyticsService - Important but isolated
2. GameEngineService - Core but stable
3. NotificationService - User experience

### Low Priority
1. AI Personality Services - Specialized use
2. Export Services - Admin functionality
3. Utility Services - Limited scope

## Testing Strategy

1. Create interface definitions
2. Write tests against interfaces
3. Migrate service implementation
4. Verify tests still pass
5. Update component usage
6. Integration testing

## Tracking Progress

- [ ] Define service interfaces
- [ ] Update AIIntegrationService
- [ ] Update SessionService
- [ ] Update GameEngineService
- [ ] Update AnalyticsService
- [ ] Update component imports
- [ ] Add service lifecycle hooks
- [ ] Complete integration tests
- [ ] Update documentation
- [ ] Remove deprecated patterns

## Notes

- The ServiceFactory already supports both standard and flexible game modes
- ServiceContainer provides dependency injection capabilities
- React hooks (useService, useServices) simplify component integration
- Consider using TypeScript decorators for service registration in future