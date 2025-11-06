/**
 * Services Index
 * 
 * Central export file for all services with proper organization
 * between standard and flexible implementations
 */

// Core Game Services
export { GameService } from './gameService';
export { default as FlexibleGameService } from './flexibleGameService';

// Trading Services
export { TradingService } from './tradingService';
export { default as FlexibleTradingService } from './flexibleTradingService';

// Session Management Services
export { default as SessionService } from './sessionService';
export { default as FlexibleSessionService } from './flexibleSessionService';

// Scoring Services
export { scoringService } from './scoringService';
export { default as FlexibleScoringService } from './flexibleScoringService';

// Notification Services
export { notificationService } from './notificationService';
export { default as FlexibleNotificationService } from './flexibleNotificationService';

// Galaxy and Team Management Services
export { galaxyService } from './galaxyService';
export { sessionGalaxyService } from './sessionGalaxyService';
export { TeamGenerationService, teamGenerationService } from './teamGenerationService';
export { sessionCodeService } from './sessionCodeService';
export { configurationValidationService } from './configurationValidationService';

// Authentication Services
export { AuthService } from './authService';
export { adminAuthService } from './adminAuthService';

// Analytics and Intelligence Services
export { analyticsService } from './analyticsService';
export { intelGenerationService } from './intelGenerationService';
export { IntelGenerationService } from './intelGenerationService';
// Legacy alias for backward compatibility
export { intelGenerationService as intelService } from './intelGenerationService';

// AI Services
export { aiColonyService } from './aiColonyService';
export { aiIntegrationService } from './aiIntegrationService';
export { aiStrategyService } from './aiStrategyService';

// Game Engine Services
export { gameEngineService } from './gameEngineService';
export { eventSystemService } from './eventSystemService';
export { roundService } from './roundService';
export { investmentService } from './investmentService';
export { resourceManagementService } from './resourceManagementService';
export { marketFluctuationService } from './marketFluctuationService';

// Trading and Commerce Services
export { alienTradingService } from './alienTradingService';
export { tradeAnalyticsService } from './tradeAnalyticsService';

// Utility Services
export { roleService } from './roleService';
export { analyticsExportService } from './analyticsExportService';

// Service Factory and Registry
export { 
  ServiceFactory, 
  ServiceContainer,
  registerServices,
  useServices,
  useService
} from './serviceFactory';
export { 
  ServiceRegistry, 
  ServiceLocator,
  useServiceRegistry
} from './serviceRegistry';

// Export types
export type { ServiceConfig, ServiceInstances } from './serviceFactory';

/**
 * Service Categories for easier organization
 */
export const ServiceCategories = {
  core: {
    game: 'gameService',
    trading: 'tradingService',
    session: 'sessionService',
    scoring: 'scoringService',
    notification: 'notificationService'
  },
  flexible: {
    game: 'FlexibleGameService',
    trading: 'FlexibleTradingService',
    session: 'FlexibleSessionService',
    scoring: 'FlexibleScoringService',
    notification: 'FlexibleNotificationService'
  },
  galaxy: {
    galaxy: 'galaxyService',
    sessionGalaxy: 'sessionGalaxyService',
    teamGeneration: 'teamGenerationService',
    sessionCode: 'sessionCodeService',
    configurationValidation: 'configurationValidationService'
  },
  auth: {
    auth: 'authService',
    admin: 'adminAuthService'
  },
  ai: {
    colony: 'aiColonyService',
    integration: 'aiIntegrationService',
    strategy: 'aiStrategyService'
  },
  analytics: {
    analytics: 'analyticsService',
    export: 'analyticsExportService',
    tradeAnalytics: 'tradeAnalyticsService'
  },
  gameplay: {
    engine: 'gameEngineService',
    events: 'eventSystemService',
    rounds: 'roundService',
    investments: 'investmentService',
    resources: 'resourceManagementService',
    market: 'marketFluctuationService',
    alien: 'alienTradingService'
  },
  utility: {
    role: 'roleService',
    intel: 'intelGenerationService'
  }
} as const;

/**
 * Helper function to check if a session is using flexible services
 */
export async function isFlexibleSession(sessionId: string): Promise<boolean> {
  try {
    const { FlexibleGameService } = await import('./flexibleGameService');
    return await FlexibleGameService.isFlexibleSession(sessionId);
  } catch (error) {
    console.error('Error checking session type:', error);
    return false;
  }
}

/**
 * Helper function to get the appropriate services for a session
 */
export async function getServicesForSession(sessionId: string) {
  const isFlexible = await isFlexibleSession(sessionId);
  return ServiceFactory.getServices({
    isFlexibleMode: isFlexible,
    sessionId,
    enableAI: true,
    enableAnalytics: true,
    enableNotifications: true
  });
}

/**
 * Initialize services for the application
 */
export async function initializeServices(config?: Partial<ServiceConfig>): Promise<void> {
  await ServiceLocator.initialize(config);
}

/**
 * Initialize services for a specific session
 */
export async function initializeServicesForSession(sessionId: string): Promise<void> {
  await ServiceLocator.initializeForSession(sessionId);
}