/**
 * Service Registry
 * 
 * Central registry for managing all service instances and providing
 * a clean interface for dependency injection and service resolution
 */

import { ServiceFactory, ServiceConfig, ServiceInstances } from './serviceFactory';

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: ServiceInstances;
  private config: ServiceConfig;

  private constructor(config: ServiceConfig) {
    this.config = config;
    this.services = ServiceFactory.getServices(config);
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(config?: ServiceConfig): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(config || {
        isFlexibleMode: false,
        enableAI: true,
        enableAnalytics: true,
        enableNotifications: true
      });
    }
    return ServiceRegistry.instance;
  }

  /**
   * Update configuration and refresh services
   */
  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.services = ServiceFactory.getServices(this.config);
  }

  /**
   * Get all services
   */
  getServices(): ServiceInstances {
    return this.services;
  }

  /**
   * Get specific service
   */
  getService<T extends keyof ServiceInstances>(serviceName: T): ServiceInstances[T] {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service;
  }

  /**
   * Check if service is available
   */
  hasService(serviceName: keyof ServiceInstances): boolean {
    return !!this.services[serviceName];
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    ServiceRegistry.instance = null as any;
    ServiceFactory.clearCache();
  }

  /**
   * Initialize services for a specific session type
   */
  static async initializeForSession(sessionId: string): Promise<ServiceRegistry> {
    const services = await ServiceFactory.getServiceForSession(sessionId);
    const isFlexible = await services.gameService.isFlexibleSession?.(sessionId) || false;
    
    const config: ServiceConfig = {
      isFlexibleMode: isFlexible,
      sessionId,
      enableAI: true,
      enableAnalytics: true,
      enableNotifications: true
    };

    return new ServiceRegistry(config);
  }
}

/**
 * Service locator pattern for easy access to services
 */
export class ServiceLocator {
  private static registry: ServiceRegistry | null = null;

  /**
   * Set the service registry
   */
  static setRegistry(registry: ServiceRegistry): void {
    ServiceLocator.registry = registry;
  }

  /**
   * Get service from registry
   */
  static getService<T extends keyof ServiceInstances>(serviceName: T): ServiceInstances[T] {
    if (!ServiceLocator.registry) {
      throw new Error('Service registry not initialized. Call ServiceLocator.setRegistry() first.');
    }
    return ServiceLocator.registry.getService(serviceName);
  }

  /**
   * Get all services
   */
  static getServices(): ServiceInstances {
    if (!ServiceLocator.registry) {
      throw new Error('Service registry not initialized. Call ServiceLocator.setRegistry() first.');
    }
    return ServiceLocator.registry.getServices();
  }

  /**
   * Initialize services for the application
   */
  static async initialize(config?: ServiceConfig): Promise<void> {
    const registry = ServiceRegistry.getInstance(config);
    ServiceLocator.setRegistry(registry);
  }

  /**
   * Initialize services for a specific session
   */
  static async initializeForSession(sessionId: string): Promise<void> {
    const registry = await ServiceRegistry.initializeForSession(sessionId);
    ServiceLocator.setRegistry(registry);
  }
}

/**
 * React hook for accessing services
 */
export function useServiceRegistry(): ServiceRegistry {
  return ServiceRegistry.getInstance();
}

/**
 * React hook for accessing a specific service
 */
export function useService<T extends keyof ServiceInstances>(serviceName: T): ServiceInstances[T] {
  return ServiceLocator.getService(serviceName);
}

export default ServiceRegistry;