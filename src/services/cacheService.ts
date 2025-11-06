/**
 * Cache Service
 * Implements multi-layer caching strategy for optimal performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in milliseconds
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  persistToStorage: boolean;
}

export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private accessOrder: string[] = []; // For LRU
  private config: CacheConfig = {
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    evictionPolicy: 'LRU',
    persistToStorage: true
  };

  private constructor() {
    // Load persisted cache on initialization
    if (this.config.persistToStorage) {
      this.loadFromStorage();
    }

    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  static getInstance(): CacheService {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Update access tracking
    entry.hits++;
    this.updateAccessOrder(key);

    return entry.data as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt,
      hits: 0
    };

    // Check if we need to evict
    if (this.memoryCache.size >= this.config.maxSize && !this.memoryCache.has(key)) {
      this.evict();
    }

    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);

    // Persist to storage if enabled
    if (this.config.persistToStorage) {
      this.persistEntry(key, entry);
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      
      if (this.config.persistToStorage) {
        localStorage.removeItem(`cache_${key}`);
      }
    }

    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.accessOrder = [];

    if (this.config.persistToStorage) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalAccess = 0;

    this.memoryCache.forEach(entry => {
      totalHits += entry.hits;
      totalAccess += entry.hits + 1; // Include initial set
    });

    return {
      size: this.memoryCache.size,
      hits: totalHits,
      misses: totalAccess - totalHits,
      evictions: 0, // Track this separately
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0
    };
  }

  /**
   * Update cache configuration
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Private methods
   */

  private updateAccessOrder(key: string): void {
    if (this.config.evictionPolicy === 'LRU') {
      // Remove from current position
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      // Add to end (most recent)
      this.accessOrder.push(key);
    }
  }

  private evict(): void {
    let keyToEvict: string | undefined;

    switch (this.config.evictionPolicy) {
      case 'LRU':
        // Least Recently Used
        keyToEvict = this.accessOrder[0];
        break;
      
      case 'LFU':
        // Least Frequently Used
        let minHits = Infinity;
        this.memoryCache.forEach((entry, key) => {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        });
        break;
      
      case 'FIFO':
        // First In First Out
        let oldestTime = Infinity;
        this.memoryCache.forEach((entry, key) => {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            keyToEvict = key;
          }
        });
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  private persistEntry(key: string, entry: CacheEntry<any>): void {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
      // If storage is full, clear old cache entries
      this.clearOldPersistedEntries();
    }
  }

  private loadFromStorage(): void {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key)!);
          const cacheKey = key.replace('cache_', '');
          
          // Only load non-expired entries
          if (entry.expiresAt > now) {
            this.memoryCache.set(cacheKey, entry);
            this.updateAccessOrder(cacheKey);
          } else {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    });
  }

  private clearOldPersistedEntries(): void {
    const entries: { key: string; timestamp: number }[] = [];
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key)!);
          entries.push({ key, timestamp: entry.timestamp });
        } catch {
          localStorage.removeItem(key);
        }
      }
    });

    // Sort by timestamp and remove oldest 25%
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.floor(entries.length * 0.25);
    
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }
}

/**
 * Specialized caches for different data types
 */

export class SessionCache extends CacheService {
  private static sessionInstance: SessionCache;

  static getInstance(): SessionCache {
    if (!this.sessionInstance) {
      this.sessionInstance = new SessionCache();
      this.sessionInstance.configure({
        maxSize: 50,
        defaultTTL: 10 * 60 * 1000, // 10 minutes
        evictionPolicy: 'LRU',
        persistToStorage: true
      });
    }
    return this.sessionInstance;
  }
}

export class TeamCache extends CacheService {
  private static teamInstance: TeamCache;

  static getInstance(): TeamCache {
    if (!this.teamInstance) {
      this.teamInstance = new TeamCache();
      this.teamInstance.configure({
        maxSize: 200,
        defaultTTL: 5 * 60 * 1000, // 5 minutes
        evictionPolicy: 'LFU',
        persistToStorage: true
      });
    }
    return this.teamInstance;
  }
}

export class TradeCache extends CacheService {
  private static tradeInstance: TradeCache;

  static getInstance(): TradeCache {
    if (!this.tradeInstance) {
      this.tradeInstance = new TradeCache();
      this.tradeInstance.configure({
        maxSize: 100,
        defaultTTL: 2 * 60 * 1000, // 2 minutes
        evictionPolicy: 'FIFO',
        persistToStorage: false // Trades are time-sensitive
      });
    }
    return this.tradeInstance;
  }
}

/**
 * Cache decorators for easy method caching
 */

export function Cacheable(options?: { ttl?: number; key?: string }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = CacheService.getInstance();

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options?.key || `${target.constructor.name}_${propertyName}_${JSON.stringify(args)}`;
      
      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache result
      cache.set(cacheKey, result, options?.ttl);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Invalidate cache decorator
 */

export function InvalidateCache(patterns: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = CacheService.getInstance();

    descriptor.value = async function (...args: any[]) {
      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Invalidate matching cache entries
      const cacheKeys = Array.from((cache as any).memoryCache.keys());
      cacheKeys.forEach(key => {
        if (patterns.some(pattern => key.includes(pattern))) {
          cache.delete(key);
        }
      });
      
      return result;
    };

    return descriptor;
  };
}

// Export singleton instances
export const cacheService = CacheService.getInstance();
export const sessionCache = SessionCache.getInstance();
export const teamCache = TeamCache.getInstance();
export const tradeCache = TradeCache.getInstance();