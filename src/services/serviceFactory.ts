/**
 * Service Factory
 * 
 * Factory pattern implementation for instantiating the correct services
 * based on game configuration and runtime requirements
 */

import { GameService } from './GameService';
import FlexibleGameService from './flexibleGameService';
import { TradingService } from './tradingService';
import FlexibleTradingService from './flexibleTradingService';
import { SessionService, sessionService } from './sessionService';
import FlexibleSessionService from './flexibleSessionService';
import { galaxyService } from './galaxyService';
import { sessionGalaxyService } from './sessionGalaxyService';
import { TeamGenerationService } from './teamGenerationService';
import { sessionCodeService } from './sessionCodeService';
import { configurationValidationService } from './configurationValidationService';
import { AnalyticsService } from './analyticsService';
import { ScoringService } from './scoringService';
import FlexibleScoringService from './flexibleScoringService';
import { notificationService } from './notificationService';
import FlexibleNotificationService from './flexibleNotificationService';
import { AuthService } from './authService';
import { AdminAuthService } from './adminAuthService';
import { AIColonyService } from './aiColonyService';
import { AIIntegrationService } from './aiIntegrationService';
import { AIStrategyService } from './aiStrategyService';
import { AlienTradingService } from './alienTradingService';
import { EventSystemService } from './eventSystemService';
import { GameEngineService } from './gameEngineService';
import { intelGenerationService } from './intelGenerationService';
import { InvestmentService } from './investmentService';
import { MarketFluctuationService } from './marketFluctuationService';
import { ResourceManagementService } from './resourceManagementService';
import { RoleService } from './roleService';
import { RoundService } from './roundService';
import { TradeAnalyticsService } from './tradeAnalyticsService';

/**
 * Service configuration options
 */
export interface ServiceConfig {
  isFlexibleMode: boolean;
  sessionId?: string;
  galaxyId?: string;
  enableAI?: boolean;
  enableAnalytics?: boolean;
  enableNotifications?: boolean;
}

/**
 * Service instances container
 */
export interface ServiceInstances {
  gameService: typeof GameService | typeof FlexibleGameService;
  tradingService: typeof TradingService | typeof FlexibleTradingService;
  sessionService: typeof SessionService | typeof FlexibleSessionService;
  scoringService: typeof ScoringService | typeof FlexibleScoringService;
  notificationService?: typeof notificationService | typeof FlexibleNotificationService;
  galaxyService?: typeof galaxyService;
  sessionGalaxyService?: typeof sessionGalaxyService;
  teamGenerationService?: typeof TeamGenerationService;
  sessionCodeService?: typeof sessionCodeService;
  configurationValidationService?: typeof configurationValidationService;
  analyticsService?: typeof AnalyticsService;
  authService: typeof AuthService;
  adminAuthService?: typeof AdminAuthService;
  aiServices?: {
    colonyService: typeof AIColonyService;
    integrationService: typeof AIIntegrationService;
    strategyService: typeof AIStrategyService;
  };
  gameplayServices: {
    alienTradingService: typeof AlienTradingService;
    eventSystemService: typeof EventSystemService;
    gameEngineService: typeof GameEngineService;
    intelService: typeof intelGenerationService;
    investmentService: typeof InvestmentService;
    marketFluctuationService: typeof MarketFluctuationService;
    resourceManagementService: typeof ResourceManagementService;
    roleService: typeof RoleService;
    roundService: typeof RoundService;
    tradeAnalyticsService: typeof TradeAnalyticsService;
  };
}

/**
 * Service factory class
 */
export class ServiceFactory {
  private static instances: Map<string, ServiceInstances> = new Map();
  private static defaultConfig: ServiceConfig = {
    isFlexibleMode: false,
    enableAI: true,
    enableAnalytics: true,
    enableNotifications: true
  };

  /**
   * Create or retrieve service instances based on configuration
   */
  static getServices(config?: Partial<ServiceConfig>): ServiceInstances {
    const finalConfig = { ...this.defaultConfig, ...config };
    const cacheKey = this.generateCacheKey(finalConfig);

    // Check if we already have instances for this configuration
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // Create new service instances
    const services = this.createServices(finalConfig);
    this.instances.set(cacheKey, services);

    return services;
  }

  /**
   * Create service instances based on configuration
   */
  private static createServices(config: ServiceConfig): ServiceInstances {
    const services: ServiceInstances = {
      // Core services that switch based on mode
      gameService: config.isFlexibleMode ? FlexibleGameService : GameService,
      tradingService: config.isFlexibleMode ? FlexibleTradingService : TradingService,
      sessionService: config.isFlexibleMode ? FlexibleSessionService : SessionService,
      scoringService: config.isFlexibleMode ? FlexibleScoringService : ScoringService,

      // Auth services (always included)
      authService: AuthService,

      // Gameplay services (always included)
      gameplayServices: {
        alienTradingService: AlienTradingService,
        eventSystemService: EventSystemService,
        gameEngineService: GameEngineService,
        intelService: intelGenerationService,
        investmentService: InvestmentService,
        marketFluctuationService: MarketFluctuationService,
        resourceManagementService: ResourceManagementService,
        roleService: RoleService,
        roundService: RoundService,
        tradeAnalyticsService: TradeAnalyticsService
      }
    };

    // Conditionally add flexible-only services
    if (config.isFlexibleMode) {
      services.galaxyService = galaxyService;
      services.sessionGalaxyService = sessionGalaxyService;
      services.teamGenerationService = TeamGenerationService;
      services.sessionCodeService = sessionCodeService;
      services.configurationValidationService = configurationValidationService;
    }

    // Conditionally add optional services
    if (config.enableNotifications) {
      services.notificationService = config.isFlexibleMode ? 
        FlexibleNotificationService : notificationService;
    }

    if (config.enableAnalytics) {
      services.analyticsService = AnalyticsService;
    }

    if (config.enableAI) {
      services.aiServices = {
        colonyService: AIColonyService,
        integrationService: AIIntegrationService,
        strategyService: AIStrategyService
      };
    }

    // Add admin services if user has admin role
    if (this.shouldIncludeAdminServices()) {
      services.adminAuthService = AdminAuthService;
    }

    return services;
  }

  /**
   * Check if admin services should be included
   */
  private static shouldIncludeAdminServices(): boolean {
    // This would check the current user's role
    // For now, we'll include it if the auth service indicates admin access
    try {
      const currentUser = AuthService.getCurrentUser();
      return (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'facilitator';
    } catch {
      return false;
    }
  }

  /**
   * Generate cache key for service configuration
   */
  private static generateCacheKey(config: ServiceConfig): string {
    return `${config.isFlexibleMode ? 'flex' : 'std'}_${config.sessionId || 'global'}_${config.galaxyId || 'all'}`;
  }

  /**
   * Clear cached service instances
   */
  static clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.instances.delete(cacheKey);
    } else {
      this.instances.clear();
    }
  }

  /**
   * Get service based on session type
   */
  static async getServiceForSession(sessionId: string): Promise<ServiceInstances> {
    // Check if this is a flexible session
    const isFlexible = await FlexibleGameService.isFlexibleSession(sessionId);
    
    return this.getServices({
      isFlexibleMode: isFlexible,
      sessionId
    });
  }

  /**
   * Create a service proxy that automatically selects the right implementation
   */
  static createServiceProxy<T extends keyof ServiceInstances>(
    serviceName: T
  ): ServiceInstances[T] {
    return new Proxy({} as any, {
      get: (target, prop) => {
        // Get the current configuration from context or default
        const config = this.getCurrentConfig();
        const services = this.getServices(config);
        const service = services[serviceName];
        
        if (!service) {
          throw new Error(`Service ${serviceName} not found`);
        }

        return (service as any)[prop];
      }
    });
  }

  /**
   * Get current configuration from context
   */
  private static getCurrentConfig(): Partial<ServiceConfig> {
    // This would typically read from a React context or global state
    // For now, return default config
    return this.defaultConfig;
  }

  /**
   * Update default configuration
   */
  static setDefaultConfig(config: Partial<ServiceConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    // Clear cache to force recreation with new config
    this.clearCache();
  }
}

/**
 * Dependency injection container
 */
export class ServiceContainer {
  private static services: Map<string, any> = new Map();
  private static factories: Map<string, () => any> = new Map();

  /**
   * Register a service instance
   */
  static register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Register a service factory
   */
  static registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Resolve a service by name
   */
  static resolve<T>(name: string): T {
    // Check if we have an instance
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check if we have a factory
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      const instance = factory!();
      this.services.set(name, instance);
      return instance;
    }

    throw new Error(`Service ${name} not registered`);
  }

  /**
   * Clear all registered services
   */
  static clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

/**
 * Service registration helper
 */
export function registerServices(config: ServiceConfig): void {
  const services = ServiceFactory.getServices(config);

  // Register core services
  ServiceContainer.register('gameService', services.gameService);
  ServiceContainer.register('tradingService', services.tradingService);
  ServiceContainer.register('sessionService', services.sessionService);
  ServiceContainer.register('scoringService', services.scoringService);
  ServiceContainer.register('authService', services.authService);

  // Register optional services
  if (services.notificationService) {
    ServiceContainer.register('notificationService', services.notificationService);
  }

  if (services.galaxyService) {
    ServiceContainer.register('galaxyService', services.galaxyService);
  }

  if (services.analyticsService) {
    ServiceContainer.register('analyticsService', services.analyticsService);
  }

  // Register AI services
  if (services.aiServices) {
    ServiceContainer.register('aiColonyService', services.aiServices.colonyService);
    ServiceContainer.register('aiIntegrationService', services.aiServices.integrationService);
    ServiceContainer.register('aiStrategyService', services.aiServices.strategyService);
  }

  // Register gameplay services
  Object.entries(services.gameplayServices).forEach(([name, service]) => {
    ServiceContainer.register(name, service);
  });
}

/**
 * Service hooks for React components
 */
export function useServices(config?: Partial<ServiceConfig>): ServiceInstances {
  return ServiceFactory.getServices(config);
}

export function useService<T extends keyof ServiceInstances>(
  serviceName: T,
  config?: Partial<ServiceConfig>
): ServiceInstances[T] {
  const services = ServiceFactory.getServices(config);
  return services[serviceName];
}

// Export everything
export default ServiceFactory;