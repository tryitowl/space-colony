import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionCodeService } from '../sessionCodeService';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';


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

describe('SessionCodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service's internal cache
    (sessionCodeService as any).codeCache.clear();
    (sessionCodeService as any).lastCacheUpdate = 0;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('generateSessionCode', () => {
    it('should generate a valid session code with default format', async () => {
      const sessionId = 'test-session-123';
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const code = await sessionCodeService.generateSessionCode(sessionId);
      
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{3}$/);
      expect(vi.mocked(setDoc)).toHaveBeenCalled();
      expect(vi.mocked(updateDoc)).toHaveBeenCalled();
    });

    it('should accept custom event and galaxy codes', async () => {
      const sessionId = 'test-session-123';
      const customCode = 'MSFT-ADA';
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const code = await sessionCodeService.generateSessionCode(sessionId, {
        eventCode: 'MSFT',
        galaxyCode: 'ADA',
        isCustom: true
      });
      
      expect(code).toBe(customCode);
    });

    it('should reject invalid code format', async () => {
      const sessionId = 'test-session-123';
      
      await expect(
        sessionCodeService.generateSessionCode(sessionId, {
          eventCode: 'TOOLONG',
          galaxyCode: 'ADA'
        })
      ).rejects.toThrow('Invalid code format');
    });

    it('should reject codes with offensive content', async () => {
      const sessionId = 'test-session-123';
      
      await expect(
        sessionCodeService.generateSessionCode(sessionId, {
          eventCode: 'ASSX',
          galaxyCode: 'BAD'
        })
      ).rejects.toThrow('inappropriate content');
    });

    it('should handle code collisions', async () => {
      const sessionId = 'test-session-123';
      
      // First call returns exists, second doesn't
      vi.mocked(getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ isActive: true, expiresAt: { toDate: () => new Date(Date.now() + 86400000) } })
        } as any)
        .mockResolvedValueOnce({
          exists: () => false,
          data: () => null
        } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const code = await sessionCodeService.generateSessionCode(sessionId);
      
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{3}$/);
      expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateCodeFormat', () => {
    it('should validate correct code format', () => {
      expect(sessionCodeService.validateCodeFormat('C725-ADA')).toBe(true);
      expect(sessionCodeService.validateCodeFormat('MSFT-MLK')).toBe(true);
      expect(sessionCodeService.validateCodeFormat('1234-ABC')).toBe(true);
    });

    it('should reject invalid code formats', () => {
      expect(sessionCodeService.validateCodeFormat('C725ADA')).toBe(false);
      expect(sessionCodeService.validateCodeFormat('C72-ADA')).toBe(false);
      expect(sessionCodeService.validateCodeFormat('C725-AD')).toBe(false);
      expect(sessionCodeService.validateCodeFormat('c725-ada')).toBe(false);
      expect(sessionCodeService.validateCodeFormat('C725-ADA-EXTRA')).toBe(false);
    });
  });

  describe('lookupSessionByCode', () => {
    it('should return session ID for valid active code', async () => {
      const code = 'C725-ADA';
      const sessionId = 'test-session-123';
      const futureDate = new Date(Date.now() + 86400000);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sessionId,
          isActive: true,
          expiresAt: { toDate: () => futureDate }
        })
      } as any);

      const result = await sessionCodeService.lookupSessionByCode(code);
      
      expect(result).toBe(sessionId);
    });

    it('should return null for non-existent code', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as any);

      const result = await sessionCodeService.lookupSessionByCode('NONE-XXX');
      
      expect(result).toBeNull();
    });

    it('should return null for expired code', async () => {
      const code = 'C725-ADA';
      const pastDate = new Date(Date.now() - 86400000);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sessionId: 'test-session-123',
          isActive: true,
          expiresAt: { toDate: () => pastDate }
        })
      } as any);

      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const result = await sessionCodeService.lookupSessionByCode(code);
      
      expect(result).toBeNull();
      expect(vi.mocked(updateDoc)).toHaveBeenCalled();
    });

    it('should use cache for repeated lookups', async () => {
      const code = 'C725-ADA';
      const sessionId = 'test-session-123';
      const futureDate = new Date(Date.now() + 86400000);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sessionId,
          isActive: true,
          expiresAt: { toDate: () => futureDate }
        })
      } as any);

      // First lookup
      await sessionCodeService.lookupSessionByCode(code);
      
      // Second lookup should use cache
      const result = await sessionCodeService.lookupSessionByCode(code);
      
      expect(result).toBe(sessionId);
      expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should complete lookup in under 100ms', async () => {
      const code = 'C725-ADA';
      const sessionId = 'test-session-123';
      const futureDate = new Date(Date.now() + 86400000);
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sessionId,
          isActive: true,
          expiresAt: { toDate: () => futureDate }
        })
      } as any);

      const startTime = performance.now();
      await sessionCodeService.lookupSessionByCode(code);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('setCustomCode', () => {
    it('should set custom code for admin', async () => {
      const sessionId = 'test-session-123';
      const customCode = 'MSFT-CEO';
      const adminId = 'admin-123';
      
      vi.mocked(getDoc)
        .mockResolvedValueOnce({
          exists: () => false,
          data: () => null
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ code: 'OLD1-CDE' })
        } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await sessionCodeService.setCustomCode(sessionId, customCode, adminId);
      
      expect(vi.mocked(setDoc)).toHaveBeenCalled();
    });

    it('should reject if code is already in use by another session', async () => {
      const sessionId = 'test-session-123';
      const customCode = 'MSFT-CEO';
      const adminId = 'admin-123';
      
      // Mock lookup returns different session
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sessionId: 'other-session-456',
          isActive: true,
          expiresAt: { toDate: () => new Date(Date.now() + 86400000) }
        })
      } as any);

      await expect(
        sessionCodeService.setCustomCode(sessionId, customCode, adminId)
      ).rejects.toThrow('already assigned to another session');
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should clean up expired codes', async () => {
      const mockExpiredDocs = [
        { ref: { id: 'CODE1-ABC' }, data: () => ({}) },
        { ref: { id: 'CODE2-DEF' }, data: () => ({}) }
      ];

      vi.mocked(getDocs).mockResolvedValue({
        forEach: (callback: any) => mockExpiredDocs.forEach(callback),
        docs: mockExpiredDocs
      } as any);

      const count = await sessionCodeService.cleanupExpiredCodes();
      
      expect(count).toBe(2);
    });
  });

  describe('getCodeStatistics', () => {
    it('should return code statistics', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const pastDate = new Date(Date.now() - 86400000);
      
      const mockDocs = [
        { data: () => ({ isActive: true, expiresAt: { toDate: () => futureDate }, isCustom: false }) },
        { data: () => ({ isActive: true, expiresAt: { toDate: () => pastDate }, isCustom: false }) },
        { data: () => ({ isActive: false, expiresAt: { toDate: () => pastDate }, isCustom: true }) }
      ];

      vi.mocked(getDocs).mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(doc => callback(doc)),
        docs: mockDocs
      } as any);

      const stats = await sessionCodeService.getCodeStatistics();
      
      expect(stats).toEqual({
        totalCodes: 3,
        activeCodes: 1,
        expiredCodes: 2,
        customCodes: 1,
        averageLookupTime: 50
      });
    });
  });

  describe('code generation patterns', () => {
    it('should generate pronounceable galaxy codes', async () => {
      const sessionId = 'test-session-123';
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as any);

      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const codes = [];
      for (let i = 0; i < 10; i++) {
        const code = await sessionCodeService.generateSessionCode(sessionId);
        codes.push(code.split('-')[1]);
      }

      // Check that galaxy codes follow consonant-vowel-consonant pattern
      codes.forEach(galaxyCode => {
        expect(galaxyCode).toMatch(/^[BCDFGHJKLMNPQRSTVWXYZ][AEIOU][BCDFGHJKLMNPQRSTVWXYZ]$/);
      });
    });
  });
});