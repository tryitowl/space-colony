# Core Service Architecture

This document explains the flexible service architecture implementation for the Space Colony Exchange game, supporting both standard single-galaxy sessions and new multi-galaxy configurations.

## Architecture Overview

The service architecture follows these key patterns:

1. **Service Factory Pattern** - Instantiates correct services based on configuration
2. **Dependency Injection** - Clean service resolution and testing support
3. **Backward Compatibility** - Existing single-galaxy games continue to work
4. **Flexible Extensions** - New multi-galaxy features without breaking changes

## Service Types

### Core Services

These services handle fundamental game operations and have both standard and flexible implementations:

- **GameService / FlexibleGameService** - Session creation and management
- **TradingService / FlexibleTradingService** - Trade processing with galaxy rules
- **SessionService / FlexibleSessionService** - Session operations and player management
- **ScoringService / FlexibleScoringService** - Scoring with galaxy-specific rules
- **NotificationService / FlexibleNotificationService** - Notifications with galaxy context

### Galaxy Management Services

These services are specific to multi-galaxy functionality:

- **GalaxyService** - Galaxy creation, configuration, and management
- **SessionGalaxyService** - Galaxy operations within sessions
- **TeamGenerationService** - Dynamic team generation (1-20 teams per galaxy)
- **SessionCodeService** - Game code generation and lookup
- **ConfigurationValidationService** - Galaxy configuration validation

### Supporting Services

These services work with both architectures:

- **AuthService** - User authentication
- **AnalyticsService** - Game analytics and reporting
- **AI Services** - AI team management
- **Game Engine Services** - Core game mechanics

## Usage Examples

### Basic Service Usage

```typescript
import { ServiceLocator, initializeServices } from '../services';

// Initialize services for the application
await initializeServices({
  isFlexibleMode: false,
  enableAI: true,
  enableAnalytics: true
});

// Get a service
const gameService = ServiceLocator.getService('gameService');
```

### Session-Specific Services

```typescript
import { initializeServicesForSession, ServiceLocator } from '../services';

// Initialize services for a specific session (auto-detects type)
await initializeServicesForSession(sessionId);

// Services will automatically use flexible or standard implementations
const tradingService = ServiceLocator.getService('tradingService');
```

### React Component Usage

```typescript
import { useService, useServiceRegistry } from '../services';

function TradingComponent({ sessionId, teamId }) {
  const tradingService = useService('tradingService');
  const registry = useServiceRegistry();
  
  const handleTrade = async () => {
    if (registry.getConfig().isFlexibleMode) {
      // Use flexible trading features
      await tradingService.createFlexibleTradeOffer(/* ... */);
    } else {
      // Use standard trading
      await tradingService.createTradeOffer(/* ... */);
    }
  };
  
  return <button onClick={handleTrade}>Create Trade</button>;
}
```

### Creating a Multi-Galaxy Session

```typescript
import { FlexibleGameService, galaxyService } from '../services';

const galaxyConfiguration = {
  sessionName: 'Multi-Galaxy Tournament',
  galaxies: [
    {
      name: 'Alpha Galaxy',
      totalTeams: 8,
      colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub'],
      teamStructure: { mode: 'balanced' },
      aiEnabled: true
    },
    {
      name: 'Beta Galaxy', 
      totalTeams: 6,
      colonyTypes: ['military', 'manufacturing'],
      teamStructure: { mode: 'standard' },
      specialRules: [
        { type: 'no_cross_galaxy_trade', value: true }
      ]
    }
  ],
  gameSettings: {
    enableCrossGalaxyTrading: true,
    globalEvents: true
  }
};

const sessionId = await FlexibleGameService.createFlexibleSession(
  eventId,
  'Multi-Galaxy Session',
  galaxyConfiguration
);
```

### Service Factory Configuration

```typescript
import { ServiceFactory } from '../services';

// Get services for different configurations
const standardServices = ServiceFactory.getServices({
  isFlexibleMode: false,
  enableAI: false
});

const flexibleServices = ServiceFactory.getServices({
  isFlexibleMode: true,
  sessionId: 'session_123',
  galaxyId: 'galaxy_456',
  enableAI: true,
  enableAnalytics: true
});
```

## Service Factory Details

The ServiceFactory automatically selects the correct service implementations:

```typescript
interface ServiceConfig {
  isFlexibleMode: boolean;
  sessionId?: string;
  galaxyId?: string;
  enableAI?: boolean;
  enableAnalytics?: boolean;
  enableNotifications?: boolean;
}
```

### Service Selection Logic

1. **Core Services**: Flexible implementations when `isFlexibleMode: true`
2. **Galaxy Services**: Only included in flexible mode
3. **Optional Services**: Included based on feature flags
4. **Backward Compatibility**: Standard services work unchanged

## Dependency Injection

The architecture supports proper dependency injection for testing:

```typescript
import { ServiceContainer } from '../services';

// Register mock services for testing
ServiceContainer.register('gameService', mockGameService);
ServiceContainer.register('tradingService', mockTradingService);

// Register factories for lazy loading
ServiceContainer.registerFactory('analyticsService', () => new MockAnalyticsService());

// Resolve services
const gameService = ServiceContainer.resolve('gameService');
```

## Migration Guide

### From Standard to Flexible

Existing code using standard services continues to work:

```typescript
// This continues to work unchanged
import { GameService } from '../services';
const sessionId = await GameService.createSession(eventId, sessionName);
```

To use flexible features:

```typescript
// Use the service registry for automatic detection
import { initializeServicesForSession, ServiceLocator } from '../services';

await initializeServicesForSession(sessionId);
const gameService = ServiceLocator.getService('gameService');

// gameService will be FlexibleGameService if sessionId is flexible
```

### Component Updates

Update components to use the service registry:

```typescript
// Before
import { TradingService } from '../services/tradingService';

// After  
import { useService } from '../services';

function Component() {
  const tradingService = useService('tradingService');
  // tradingService is automatically the right implementation
}
```

## Error Handling

The architecture includes comprehensive error handling:

```typescript
try {
  const services = await ServiceFactory.getServiceForSession(sessionId);
  const result = await services.gameService.someOperation();
} catch (error) {
  if (error.message.includes('Session not found')) {
    // Handle session not found
  } else if (error.message.includes('Galaxy configuration')) {
    // Handle galaxy configuration errors
  }
}
```

## Testing

Services support comprehensive testing:

```typescript
import { ServiceRegistry, ServiceFactory } from '../services';

describe('Multi-Galaxy Trading', () => {
  beforeEach(() => {
    ServiceRegistry.reset();
    ServiceFactory.clearCache();
  });

  it('should create cross-galaxy trades', async () => {
    const registry = ServiceRegistry.getInstance({
      isFlexibleMode: true,
      enableAI: false
    });
    
    const tradingService = registry.getService('tradingService');
    // Test flexible trading functionality
  });
});
```

## Performance Considerations

- **Service Caching**: Services are cached per configuration
- **Lazy Loading**: Services load only when needed
- **Memory Management**: Proper cleanup in service lifecycle
- **Real-time Updates**: Efficient real-time data handling

## Security

- **Service Isolation**: Services can't access unauthorized data
- **Configuration Validation**: All configurations are validated
- **Authentication**: Proper auth checks in all services
- **Galaxy Boundaries**: Cross-galaxy operations respect security rules

## Monitoring and Analytics

The architecture includes built-in monitoring:

- Service usage metrics
- Performance tracking
- Error reporting
- Galaxy-specific analytics
- Cross-galaxy interaction analysis

## Best Practices

1. **Always use ServiceLocator** in components for automatic service resolution
2. **Initialize services early** in application lifecycle
3. **Handle both service types** in shared components
4. **Use proper error handling** for service operations
5. **Test with both configurations** when developing features
6. **Follow galaxy security rules** in flexible implementations

## Troubleshooting

Common issues and solutions:

### Service Not Found
```typescript
// Problem: Service not registered
ServiceLocator.getService('nonExistentService'); // Error

// Solution: Check service is included in configuration
const config = registry.getConfig();
console.log('Available services:', Object.keys(registry.getServices()));
```

### Wrong Service Type
```typescript
// Problem: Using flexible service method on standard service
standardGameService.createFlexibleSession(); // Error

// Solution: Check configuration or use registry
const isFlexible = registry.getConfig().isFlexibleMode;
if (isFlexible) {
  await gameService.createFlexibleSession();
} else {
  await gameService.createSession();
}
```

### Configuration Issues
```typescript
// Problem: Invalid galaxy configuration
await FlexibleGameService.createFlexibleSession(eventId, name, invalidConfig);

// Solution: Validate configuration first
const validation = await configurationValidationService.validateFullConfiguration(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

This architecture provides a robust foundation for both current single-galaxy games and future multi-galaxy features while maintaining clean separation of concerns and excellent testability.