/**
 * Basic Notification Service
 * 
 * Standard notification system for single-galaxy sessions
 */

import {
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { ref, push } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';

export interface BasicNotification {
  id: string;
  type: 'trade' | 'round' | 'event' | 'system' | 'achievement';
  targetType: 'team' | 'session' | 'facilitator';
  targetId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  expiresAt?: number;
  isRead: boolean;
  requiresAcknowledgment: boolean;
}

export class notificationService {
  /**
   * Send notification to a team
   */
  static async sendNotification(
    sessionId: string,
    targetId: string,
    notification: Omit<BasicNotification, 'id' | 'timestamp' | 'isRead'>
  ): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullNotification: BasicNotification = {
      ...notification,
      id: notificationId,
      timestamp: Date.now(),
      isRead: false
    };

    // Save to Firestore
    await setDoc(
      doc(firestore, 'sessions', sessionId, 'notifications', notificationId),
      fullNotification
    );

    // Send to real-time database for immediate delivery
    try {
      const realtimeRef = ref(realtimeDb, `sessions/${sessionId}/live/notifications`);
      await push(realtimeRef, {
        id: notificationId,
        targetId,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Real-time notification delivery failed:', error);
    }

    return notificationId;
  }

  /**
   * Get notifications for a target
   */
  static async getNotifications(
    sessionId: string,
    targetId: string,
    options: {
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<BasicNotification[]> {
    let notificationsQuery = query(
      collection(firestore, 'sessions', sessionId, 'notifications'),
      where('targetId', '==', targetId),
      orderBy('timestamp', 'desc')
    );

    if (options.unreadOnly) {
      notificationsQuery = query(notificationsQuery, where('isRead', '==', false));
    }

    if (options.limit) {
      notificationsQuery = query(notificationsQuery, limit(options.limit));
    }

    const notificationDocs = await getDocs(notificationsQuery);
    return notificationDocs.docs.map(doc => doc.data() as BasicNotification);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(sessionId: string, notificationId: string): Promise<void> {
    await updateDoc(
      doc(firestore, 'sessions', sessionId, 'notifications', notificationId),
      {
        isRead: true,
        readAt: Date.now()
      }
    );
  }

  /**
   * Send session-wide notification
   */
  static async sendSessionNotification(
    sessionId: string,
    notification: Omit<BasicNotification, 'id' | 'timestamp' | 'isRead' | 'targetId' | 'targetType'>
  ): Promise<string> {
    return this.sendNotification(sessionId, sessionId, {
      ...notification,
      targetType: 'session'
    });
  }
}

export default notificationService;