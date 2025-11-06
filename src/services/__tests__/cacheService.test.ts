import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../cacheService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
    cacheService = new CacheService({
      maxSize: 5,
      defaultTTL: 60000, // 1 minute
      evictionPolicy: 'LRU',
      persistToStorage: true,
      storagePrefix: 'test_cache_'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cacheService.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cacheService.set('key1', 'value1');
      expect(cacheService.get('key1')).toBe('value1');
    });

    it('should handle complex objects', () => {
      const complexObject = {
        id: 1,
        name: 'Test',
        nested: { data: [1, 2, 3] }
      };
      cacheService.set('complex', complexObject);
      expect(cacheService.get('complex')).toEqual(complexObject);
    });

    it('should return null for non-existent keys', () => {
      expect(cacheService.get('nonexistent')).toBeNull();
    });

    it('should check if key exists', () => {
      cacheService.set('exists', 'yes');
      expect(cacheService.has('exists')).toBe(true);
      expect(cacheService.has('notexists')).toBe(false);
    });

    it('should delete keys', () => {
      cacheService.set('toDelete', 'value');
      expect(cacheService.has('toDelete')).toBe(true);
      
      cacheService.delete('toDelete');
      expect(cacheService.has('toDelete')).toBe(false);
      expect(cacheService.get('toDelete')).toBeNull();
    });

    it('should clear all entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      
      expect(cacheService.getStats().size).toBe(3);
      
      cacheService.clear();
      expect(cacheService.getStats().size).toBe(0);
      expect(cacheService.get('key1')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('expiring', 'value', 1000); // 1 second TTL
      
      expect(cacheService.get('expiring')).toBe('value');
      
      // Advance time by 500ms - should still exist
      vi.advanceTimersByTime(500);
      expect(cacheService.get('expiring')).toBe('value');
      
      // Advance time by another 600ms (total 1100ms) - should expire
      vi.advanceTimersByTime(600);
      expect(cacheService.get('expiring')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cacheService.set('default-ttl', 'value');
      
      // Advance time just before default TTL
      vi.advanceTimersByTime(59999);
      expect(cacheService.get('default-ttl')).toBe('value');
      
      // Advance past default TTL
      vi.advanceTimersByTime(2);
      expect(cacheService.get('default-ttl')).toBeNull();
    });

    it('should handle Infinity TTL', () => {
      cacheService.set('eternal', 'forever', Infinity);
      
      // Advance time significantly
      vi.advanceTimersByTime(1000000000);
      expect(cacheService.get('eternal')).toBe('forever');
    });
  });

  describe('LRU Eviction Policy', () => {
    beforeEach(() => {
      cacheService = new CacheService({
        maxSize: 3,
        evictionPolicy: 'LRU',
        persistToStorage: false
      });
    });

    it('should evict least recently used items', () => {
      cacheService.set('a', 1);
      cacheService.set('b', 2);
      cacheService.set('c', 3);
      
      // Access 'a' to make it recently used
      cacheService.get('a');
      
      // Add new item - should evict 'b' (least recently used)
      cacheService.set('d', 4);
      
      expect(cacheService.has('a')).toBe(true);
      expect(cacheService.has('b')).toBe(false);
      expect(cacheService.has('c')).toBe(true);
      expect(cacheService.has('d')).toBe(true);
    });

    it('should update LRU order on set', () => {
      cacheService.set('a', 1);
      cacheService.set('b', 2);
      cacheService.set('c', 3);
      
      // Update 'a' - makes it most recently used
      cacheService.set('a', 10);
      
      // Add new item - should evict 'b'
      cacheService.set('d', 4);
      
      expect(cacheService.has('a')).toBe(true);
      expect(cacheService.has('b')).toBe(false);
    });
  });

  describe('LFU Eviction Policy', () => {
    beforeEach(() => {
      cacheService = new CacheService({
        maxSize: 3,
        evictionPolicy: 'LFU',
        persistToStorage: false
      });
    });

    it('should evict least frequently used items', () => {
      cacheService.set('a', 1);
      cacheService.set('b', 2);
      cacheService.set('c', 3);
      
      // Access items different number of times
      cacheService.get('a'); // 2 accesses (1 set + 1 get)
      cacheService.get('a'); // 3 accesses
      cacheService.get('b'); // 2 accesses
      // 'c' has only 1 access (set)
      
      // Add new item - should evict 'c' (least frequently used)
      cacheService.set('d', 4);
      
      expect(cacheService.has('a')).toBe(true);
      expect(cacheService.has('b')).toBe(true);
      expect(cacheService.has('c')).toBe(false);
      expect(cacheService.has('d')).toBe(true);
    });

    it('should break frequency ties with recency', () => {
      cacheService.set('a', 1);
      vi.advanceTimersByTime(100);
      cacheService.set('b', 2);
      vi.advanceTimersByTime(100);
      cacheService.set('c', 3);
      
      // All have same frequency (1)
      // 'a' is oldest, should be evicted
      cacheService.set('d', 4);
      
      expect(cacheService.has('a')).toBe(false);
      expect(cacheService.has('b')).toBe(true);
      expect(cacheService.has('c')).toBe(true);
      expect(cacheService.has('d')).toBe(true);
    });
  });

  describe('FIFO Eviction Policy', () => {
    beforeEach(() => {
      cacheService = new CacheService({
        maxSize: 3,
        evictionPolicy: 'FIFO',
        persistToStorage: false
      });
    });

    it('should evict first-in items first', () => {
      cacheService.set('first', 1);
      cacheService.set('second', 2);
      cacheService.set('third', 3);
      
      // Access order shouldn't matter for FIFO
      cacheService.get('first');
      cacheService.get('first');
      cacheService.get('first');
      
      // Add new item - should evict 'first' (oldest)
      cacheService.set('fourth', 4);
      
      expect(cacheService.has('first')).toBe(false);
      expect(cacheService.has('second')).toBe(true);
      expect(cacheService.has('third')).toBe(true);
      expect(cacheService.has('fourth')).toBe(true);
    });

    it('should maintain insertion order', () => {
      cacheService.set('a', 1);
      cacheService.set('b', 2);
      cacheService.set('c', 3);
      
      // Add two more - should evict 'a' and 'b'
      cacheService.set('d', 4);
      cacheService.set('e', 5);
      
      expect(cacheService.has('a')).toBe(false);
      expect(cacheService.has('b')).toBe(false);
      expect(cacheService.has('c')).toBe(true);
      expect(cacheService.has('d')).toBe(true);
      expect(cacheService.has('e')).toBe(true);
    });
  });

  describe('Storage Persistence', () => {
    it('should persist to localStorage', () => {
      cacheService.set('persist', 'value');
      
      const storageKey = 'test_cache_persist';
      const stored = localStorage.getItem(storageKey);
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.value).toBe('value');
    });

    it('should load from localStorage on get', () => {
      const storageKey = 'test_cache_fromStorage';
      const data = {
        value: 'stored value',
        expires: Date.now() + 60000,
        accessCount: 1,
        lastAccessed: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      const value = cacheService.get('fromStorage');
      expect(value).toBe('stored value');
    });

    it('should remove from localStorage on delete', () => {
      cacheService.set('toRemove', 'value');
      const storageKey = 'test_cache_toRemove';
      
      expect(localStorage.getItem(storageKey)).not.toBeNull();
      
      cacheService.delete('toRemove');
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('should clear localStorage on clear', () => {
      cacheService.set('item1', 'value1');
      cacheService.set('item2', 'value2');
      
      expect(localStorage.length).toBeGreaterThan(0);
      
      cacheService.clear();
      
      // Check that test_cache_ prefixed items are removed
      const hasTestCacheItems = Array.from({ length: localStorage.length })
        .map((_, i) => localStorage.key(i))
        .some(key => key?.startsWith('test_cache_'));
      
      expect(hasTestCacheItems).toBe(false);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('test_cache_corrupted', 'not json');
      
      expect(cacheService.get('corrupted')).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', () => {
      const initialStats = cacheService.getStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);
      expect(initialStats.hitRate).toBe(0);
      
      // Add items
      cacheService.set('stat1', 'value1');
      cacheService.set('stat2', 'value2');
      
      // Hit
      cacheService.get('stat1');
      // Miss
      cacheService.get('nonexistent');
      
      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should calculate correct hit rate', () => {
      cacheService.set('key', 'value');
      
      // 3 hits
      cacheService.get('key');
      cacheService.get('key');
      cacheService.get('key');
      
      // 1 miss
      cacheService.get('missing');
      
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0.75); // 3/4
    });

    it('should track evictions', () => {
      const smallCache = new CacheService({
        maxSize: 2,
        evictionPolicy: 'LRU',
        persistToStorage: false
      });
      
      smallCache.set('a', 1);
      smallCache.set('b', 2);
      
      const statsBefore = smallCache.getStats();
      expect(statsBefore.evictions).toBe(0);
      
      // This should trigger eviction
      smallCache.set('c', 3);
      
      const statsAfter = smallCache.getStats();
      expect(statsAfter.evictions).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      cacheService.set('null', null);
      expect(cacheService.get('null')).toBeNull();
      expect(cacheService.has('null')).toBe(true);
    });

    it('should handle undefined values', () => {
      cacheService.set('undefined', undefined);
      expect(cacheService.get('undefined')).toBeUndefined();
      expect(cacheService.has('undefined')).toBe(true);
    });

    it('should handle empty string keys', () => {
      cacheService.set('', 'empty key');
      expect(cacheService.get('')).toBe('empty key');
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: Array(1000).fill('x'.repeat(1000))
      };
      cacheService.set('large', largeObject);
      expect(cacheService.get('large')).toEqual(largeObject);
    });

    it('should handle concurrent operations', () => {
      const operations = Array.from({ length: 100 }, (_, i) => {
        if (i % 2 === 0) {
          cacheService.set(`key${i}`, i);
        } else {
          cacheService.get(`key${i - 1}`);
        }
      });
      
      // Should not throw
      expect(() => operations).not.toThrow();
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', () => {
      cacheService.set('multi1', 'value1');
      cacheService.set('multi2', 'value2');
      cacheService.set('multi3', 'value3');
      
      const values = cacheService.getMultiple(['multi1', 'multi2', 'multi3', 'missing']);
      
      expect(values).toEqual({
        multi1: 'value1',
        multi2: 'value2',
        multi3: 'value3',
        missing: null
      });
    });

    it('should set multiple values', () => {
      cacheService.setMultiple({
        batch1: 'value1',
        batch2: 'value2',
        batch3: 'value3'
      });
      
      expect(cacheService.get('batch1')).toBe('value1');
      expect(cacheService.get('batch2')).toBe('value2');
      expect(cacheService.get('batch3')).toBe('value3');
    });

    it('should set multiple values with custom TTL', () => {
      cacheService.setMultiple(
        {
          ttl1: 'value1',
          ttl2: 'value2'
        },
        1000 // 1 second TTL
      );
      
      expect(cacheService.get('ttl1')).toBe('value1');
      expect(cacheService.get('ttl2')).toBe('value2');
      
      vi.advanceTimersByTime(1100);
      
      expect(cacheService.get('ttl1')).toBeNull();
      expect(cacheService.get('ttl2')).toBeNull();
    });
  });
});