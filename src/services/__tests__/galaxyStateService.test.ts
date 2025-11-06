import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { galaxyStateService } from '../galaxyStateService';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, set, onValue } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';

vi.mock('firebase/firestore');
vi.mock('firebase/database');
vi.mock('../../firebase/config', () => ({
  db: {},
  rtdb: {}
}));

describe('GalaxyStateService', () => {
  const mockGalaxyId = 'test-galaxy-123';
  const mockUserId = 'test-user-456';
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (onSnapshot as any).mockImplementation(() => mockUnsubscribe);
    (onValue as any).mockImplementation(() => mockUnsubscribe);
  });

  afterEach(() => {
    // Clean up any subscriptions
    galaxyStateService['unsubscribers'].forEach(unsub => unsub());
    galaxyStateService['unsubscribers'].clear();
  });

  describe('pauseGalaxy', () => {
    it('should pause the galaxy and update both databases', async () => {
      const mockDocRef = { id: 'mock-doc' };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      await galaxyStateService.pauseGalaxy(mockGalaxyId, mockUserId);

      // Verify Firestore update
      expect(doc).toHaveBeenCalledWith(db, 'galaxyStates', mockGalaxyId);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          galaxyId: mockGalaxyId,
          isPaused: true,
          pausedAt: expect.any(Number),
          pausedBy: mockUserId,
          tradingEnabled: false,
          messagesEnabled: false,
          aiEnabled: false
        }),
        { merge: true }
      );

      // Verify Realtime Database update
      expect(ref).toHaveBeenCalledWith(rtdb, `galaxyStates/${mockGalaxyId}`);
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isPaused: true,
          pausedAt: expect.any(Number),
          tradingEnabled: false,
          messagesEnabled: false
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');
      (doc as any).mockReturnValue({ id: 'mock-doc' });
      (setDoc as any).mockRejectedValue(mockError);

      await expect(galaxyStateService.pauseGalaxy(mockGalaxyId, mockUserId))
        .rejects.toThrow('Database error');
    });
  });

  describe('resumeGalaxy', () => {
    it('should resume the galaxy and update both databases', async () => {
      const mockDocRef = { id: 'mock-doc' };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      await galaxyStateService.resumeGalaxy(mockGalaxyId);

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          isPaused: false,
          resumedAt: expect.any(Number),
          tradingEnabled: true,
          messagesEnabled: true,
          aiEnabled: true
        }),
        { merge: true }
      );
    });
  });

  describe('subscribeToGalaxyState', () => {
    it('should set up listeners for both databases', () => {
      const mockCallback = vi.fn();
      const mockFirestoreData = {
        exists: () => true,
        data: () => ({
          galaxyId: mockGalaxyId,
          isPaused: false,
          tradingEnabled: true,
          messagesEnabled: true,
          aiEnabled: true,
          lastStateChange: Date.now()
        })
      };

      (doc as any).mockReturnValue({ id: 'mock-doc' });
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      
      // Mock Firestore listener
      (onSnapshot as any).mockImplementation((_, callback) => {
        callback(mockFirestoreData);
        return mockUnsubscribe;
      });

      const unsubscribe = galaxyStateService.subscribeToGalaxyState(
        mockGalaxyId,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          galaxyId: mockGalaxyId,
          isPaused: false,
          tradingEnabled: true
        })
      );

      expect(onSnapshot).toHaveBeenCalled();
      expect(onValue).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2); // Both listeners
    });

    it('should handle non-existent galaxy state', () => {
      const mockCallback = vi.fn();
      const mockFirestoreData = {
        exists: () => false,
        data: () => null
      };

      (doc as any).mockReturnValue({ id: 'mock-doc' });
      (onSnapshot as any).mockImplementation((_, callback) => {
        callback(mockFirestoreData);
        return mockUnsubscribe;
      });

      galaxyStateService.subscribeToGalaxyState(mockGalaxyId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          galaxyId: mockGalaxyId,
          isPaused: false,
          tradingEnabled: true,
          messagesEnabled: true,
          aiEnabled: true
        })
      );
    });
  });

  describe('sendGlobalAnnouncement', () => {
    it('should send an announcement', async () => {
      const mockDocRef = { id: 'mock-doc' };
      const mockAnnouncementData = {
        title: 'Test Announcement',
        content: 'This is a test',
        priority: 'high' as const,
        targetTeams: ['team1', 'team2']
      };

      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);

      await galaxyStateService.sendGlobalAnnouncement(
        mockGalaxyId,
        mockAnnouncementData
      );

      expect(doc).toHaveBeenCalledWith(
        db,
        'sessions',
        mockGalaxyId,
        'announcements',
        expect.any(String)
      );

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          ...mockAnnouncementData,
          timestamp: serverTimestamp(),
          read: false
        })
      );
    });

    it('should generate unique announcement IDs', async () => {
      (doc as any).mockImplementation((_, __, ___, id) => ({ id }));
      (setDoc as any).mockResolvedValue(undefined);

      await galaxyStateService.sendGlobalAnnouncement(mockGalaxyId, {
        title: 'Test 1',
        content: 'Content 1',
        priority: 'low'
      });

      await galaxyStateService.sendGlobalAnnouncement(mockGalaxyId, {
        title: 'Test 2',
        content: 'Content 2',
        priority: 'medium'
      });

      const calls = (doc as any).mock.calls;
      const id1 = calls[0][3];
      const id2 = calls[1][3];
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^announcement_/);
      expect(id2).toMatch(/^announcement_/);
    });
  });

  describe('toggleFeature', () => {
    it('should toggle individual features', async () => {
      const mockDocRef = { id: 'mock-doc' };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);
      (ref as any).mockReturnValue({ id: 'mock-ref' });
      (set as any).mockResolvedValue(undefined);

      await galaxyStateService.toggleFeature(mockGalaxyId, 'trading', false);

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          tradingEnabled: false,
          lastStateChange: expect.any(Number)
        }),
        { merge: true }
      );

      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tradingEnabled: false,
          lastUpdate: expect.any(Number)
        })
      );
    });

    it('should validate feature names', async () => {
      await expect(
        galaxyStateService.toggleFeature(mockGalaxyId, 'invalid' as any, true)
      ).rejects.toThrow();
    });
  });
});