/**
 * React hooks for cache integration
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/cacheService';

interface UseCacheOptions {
  ttl?: number;
  dependencies?: any[];
  invalidateOn?: string[];
}

/**
 * Generic cache hook
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = cacheService.get<T>(key);
        if (cached !== null) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const result = await fetcher();
      
      // Update cache
      cacheService.set(key, result, options.ttl);
      
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, options.ttl]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, ...(options.dependencies || [])]);

  // Invalidation listener
  useEffect(() => {
    if (options.invalidateOn && options.invalidateOn.length > 0) {
      const handleInvalidation = (event: CustomEvent) => {
        if (options.invalidateOn!.includes(event.detail.type)) {
          fetchData(true);
        }
      };

      window.addEventListener('cache-invalidate', handleInvalidation as any);
      return () => window.removeEventListener('cache-invalidate', handleInvalidation as any);
    }
  }, [options.invalidateOn, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  
  const invalidate = useCallback(() => {
    cacheService.delete(key);
    fetchData(true);
  }, [key, fetchData]);

  return { data, loading, error, refetch, invalidate };
}

/**
 * Session-specific cache hook
 */
export function useSessionCache<T>(
  sessionId: string,
  fetcher: () => Promise<T>
): ReturnType<typeof useCache> {
  return useCache(
    `session_${sessionId}`,
    fetcher,
    {
      ttl: 10 * 60 * 1000, // 10 minutes
      dependencies: [sessionId],
      invalidateOn: ['session-updated', 'round-advanced']
    }
  );
}

/**
 * Team-specific cache hook
 */
export function useTeamCache<T>(
  teamId: string,
  fetcher: () => Promise<T>
): ReturnType<typeof useCache> {
  return useCache(
    `team_${teamId}`,
    fetcher,
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      dependencies: [teamId],
      invalidateOn: ['team-updated', 'resources-changed', 'trade-completed']
    }
  );
}

/**
 * Trade list cache hook
 */
export function useTradeCache<T>(
  sessionId: string,
  fetcher: () => Promise<T>
): ReturnType<typeof useCache> {
  return useCache(
    `trades_${sessionId}`,
    fetcher,
    {
      ttl: 2 * 60 * 1000, // 2 minutes
      dependencies: [sessionId],
      invalidateOn: ['trade-created', 'trade-updated', 'trade-expired']
    }
  );
}

/**
 * Cache invalidation helper
 */
export function invalidateCache(type: string, data?: any): void {
  const event = new CustomEvent('cache-invalidate', {
    detail: { type, data }
  });
  window.dispatchEvent(event);
}

/**
 * Batch cache operations hook
 */
export function useBatchCache<T extends { id: string }>(
  prefix: string,
  ids: string[],
  fetcher: (id: string) => Promise<T>,
  options: UseCacheOptions = {}
): {
  data: Map<string, T>;
  loading: Map<string, boolean>;
  errors: Map<string, Error>;
  refetchAll: () => Promise<void>;
  refetchOne: (id: string) => Promise<void>;
} {
  const [data, setData] = useState<Map<string, T>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const fetchOne = useCallback(async (id: string, forceRefresh = false) => {
    const key = `${prefix}_${id}`;
    
    setLoading(prev => new Map(prev).set(id, true));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = cacheService.get<T>(key);
        if (cached !== null) {
          setData(prev => new Map(prev).set(id, cached));
          setLoading(prev => new Map(prev).set(id, false));
          return;
        }
      }

      // Fetch fresh data
      const result = await fetcher(id);
      
      // Update cache
      cacheService.set(key, result, options.ttl);
      
      setData(prev => new Map(prev).set(id, result));
    } catch (err) {
      setErrors(prev => new Map(prev).set(id, err as Error));
    } finally {
      setLoading(prev => new Map(prev).set(id, false));
    }
  }, [prefix, fetcher, options.ttl]);

  // Fetch all on mount or when IDs change
  useEffect(() => {
    ids.forEach(id => fetchOne(id));
  }, [ids.join(','), fetchOne]);

  const refetchAll = useCallback(async () => {
    await Promise.all(ids.map(id => fetchOne(id, true)));
  }, [ids, fetchOne]);

  const refetchOne = useCallback((id: string) => fetchOne(id, true), [fetchOne]);

  return { data, loading, errors, refetchAll, refetchOne };
}

/**
 * Cache statistics hook
 */
export function useCacheStats() {
  const [stats, setStats] = useState(cacheService.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cacheService.getStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return stats;
}

/**
 * Cache prefetch hook for preloading data
 */
export function usePrefetch() {
  const prefetch = useCallback(async <T,>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ) => {
    // Check if already cached
    const cached = cacheService.get(key);
    if (cached !== null) return;

    try {
      const data = await fetcher();
      cacheService.set(key, data, ttl);
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }, []);

  return prefetch;
}