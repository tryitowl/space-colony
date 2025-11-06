import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionCodeService } from '../sessionCodeService';
import { getDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    set: vi.fn(),
    commit: vi.fn()
  })),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date) => ({ toDate: () => date }))
  }
}));

vi.mock('../../firebase/config', () => ({
  db: {}
}));

describe('SessionCodeService Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sessionCodeService as any).codeCache.clear();
    (sessionCodeService as any).lastCacheUpdate = 0;
  });

  describe('Lookup Performance', () => {
    it('should complete cold lookup in under 100ms', async () => {
      const code = 'PERF-TST';
      const sessionId = 'perf-session-123';
      const futureDate = new Date(Date.now() + 86400000);
      
      // Simulate realistic Firestore latency (20-50ms)
      vi.mocked(getDoc).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              exists: () => true,
              data: () => ({
                sessionId,
                isActive: true,
                expiresAt: { toDate: () => futureDate }
              })
            } as any);
          }, 30); // 30ms simulated latency
        })
      );

      const startTime = performance.now();
      const result = await sessionCodeService.lookupSessionByCode(code);
      const endTime = performance.now();
      const lookupTime = endTime - startTime;
      
      expect(result).toBe(sessionId);
      expect(lookupTime).toBeLessThan(100);
      console.log(`Cold lookup time: ${lookupTime.toFixed(2)}ms`);
    });

    it('should complete cached lookup in under 10ms', async () => {
      const code = 'CACH-TST';
      const sessionId = 'cache-session-123';
      const futureDate = new Date(Date.now() + 86400000);
      
      // First lookup to populate cache
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sessionId,
          isActive: true,
          expiresAt: { toDate: () => futureDate }
        })
      } as any);

      await sessionCodeService.lookupSessionByCode(code);
      
      // Measure cached lookup
      const startTime = performance.now();
      const result = await sessionCodeService.lookupSessionByCode(code);
      const endTime = performance.now();
      const lookupTime = endTime - startTime;
      
      expect(result).toBe(sessionId);
      expect(lookupTime).toBeLessThan(10);
      console.log(`Cached lookup time: ${lookupTime.toFixed(2)}ms`);
    });

    it('should handle 1000 concurrent lookups efficiently', async () => {
      const codes = Array.from({ length: 1000 }, (_, i) => `LOAD-${String(i).padStart(3, '0')}`);
      const futureDate = new Date(Date.now() + 86400000);
      
      vi.mocked(getDoc).mockImplementation((docRef) => 
        new Promise(resolve => {
          // Simulate varying latencies
          const delay = Math.random() * 40 + 10; // 10-50ms
          setTimeout(() => {
            resolve({
              exists: () => true,
              data: () => ({
                sessionId: `session-${docRef}`,
                isActive: true,
                expiresAt: { toDate: () => futureDate }
              })
            } as any);
          }, delay);
        })
      );

      const startTime = performance.now();
      
      // Execute all lookups concurrently
      const promises = codes.map(code => sessionCodeService.lookupSessionByCode(code));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / codes.length;
      
      expect(results).toHaveLength(1000);
      expect(avgTime).toBeLessThan(100); // Average should still be under 100ms
      console.log(`1000 concurrent lookups: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms average`);
    });
  });

  describe('Code Generation Performance', () => {
    it('should generate codes quickly even with collision retries', async () => {
      const sessionId = 'gen-session-123';
      
      // Simulate first 5 attempts having collisions
      let attempts = 0;
      vi.mocked(getDoc).mockImplementation(() => {
        attempts++;
        return Promise.resolve({
          exists: () => attempts <= 5,
          data: () => attempts <= 5 ? { isActive: true, expiresAt: { toDate: () => new Date(Date.now() + 86400000) } } : null
        } as any);
      });

      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const startTime = performance.now();
      const code = await sessionCodeService.generateSessionCode(sessionId);
      const endTime = performance.now();
      const genTime = endTime - startTime;
      
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{3}$/);
      expect(genTime).toBeLessThan(500); // Even with retries, should be fast
      console.log(`Code generation with ${attempts} attempts: ${genTime.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    it('should efficiently handle cache with 10000 entries', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      
      // Pre-populate cache with 10000 entries
      for (let i = 0; i < 10000; i++) {
        const code = `BULK-${String(i).padStart(3, '0')}`;
        (sessionCodeService as any).codeCache.set(code, {
          sessionId: `session-${i}`,
          isActive: true,
          expiresAt: { toDate: () => futureDate }
        });
      }

      // Measure lookup time with large cache
      const testCode = 'BULK-500';
      const startTime = performance.now();
      const result = await sessionCodeService.lookupSessionByCode(testCode);
      const endTime = performance.now();
      const lookupTime = endTime - startTime;
      
      expect(result).toBe('session-500');
      expect(lookupTime).toBeLessThan(5); // Map lookup should be O(1)
      console.log(`Lookup in 10k cache: ${lookupTime.toFixed(2)}ms`);
    });
  });
});