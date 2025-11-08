/**
 * Flexible Notification Service
 * 
 * Extends notification system to support multi-galaxy notifications
 * with galaxy-specific messaging and cross-galaxy announcements
 */

import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { ref, push } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { notificationService } from './notificationService';
import FlexibleGameService from './flexibleGameService';
import { galaxyService } from './galaxyService';
import type { Galaxy } from '../types/galaxy.types';

interface GalaxyNotification {
  id: string;
  type: 'trade' | 'round' | 'event' | 'system' | 'galaxy_specific' | 'cross_galaxy' | 'achievement';
  targetType: 'team' | 'galaxy' | 'session' | 'facilitator';
  targetId: string; // Team ID, Galaxy ID, or Session ID
  galaxyId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  expiresAt?: number;
  isRead: boolean;
  requiresAcknowledgment: boolean;
  category: string;
  tags: string[];
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: GalaxyNotification['type'];
  title: string;
  messageTemplate: string;
  priority: GalaxyNotification['priority'];
  requiresAcknowledgment: boolean;
  galaxySpecific: boolean;
  placeholders: string[];
}

export default class FlexibleNotificationService extends notificationService {
  private static templates: Map<string, NotificationTemplate> = new Map();

  /**
   * Initialize notification templates
   */
  static initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'trade_offer_received',
        name: 'Trade Offer Received',
        type: 'trade',
        title: 'New Trade Offer',
        messageTemplate: 'Team {{initiatorName}} from {{galaxyName}} wants to trade {{resources}} with your team.',
        priority: 'medium',
        requiresAcknowledgment: false,
        galaxySpecific: true,
        placeholders: ['initiatorName', 'galaxyName', 'resources']
      },
      {
        id: 'cross_galaxy_trade_alert',
        name: 'Cross Galaxy Trade Alert',
        type: 'cross_galaxy',
        title: 'Cross-Galaxy Trade Opportunity',
        messageTemplate: 'A team from {{sourceGalaxy}} is offering to trade with teams in {{targetGalaxy}}. Communication costs apply.',
        priority: 'high',
        requiresAcknowledgment: false,
        galaxySpecific: false,
        placeholders: ['sourceGalaxy', 'targetGalaxy']
      },
      {
        id: 'galaxy_event',
        name: 'Galaxy Event',
        type: 'galaxy_specific',
        title: 'Galaxy Event: {{eventName}}',
        messageTemplate: 'A special event is affecting {{galaxyName}}: {{eventDescription}}',
        priority: 'high',
        requiresAcknowledgment: true,
        galaxySpecific: true,
        placeholders: ['eventName', 'galaxyName', 'eventDescription']
      },
      {
        id: 'round_transition',
        name: 'Round Transition',
        type: 'round',
        title: 'Round {{roundNumber}} Starting',
        messageTemplate: 'Get ready! Round {{roundNumber}} begins in {{timeRemaining}}. Focus: {{roundObjective}}',
        priority: 'high',
        requiresAcknowledgment: false,
        galaxySpecific: false,
        placeholders: ['roundNumber', 'timeRemaining', 'roundObjective']
      },
      {
        id: 'resource_critical',
        name: 'Critical Resource Alert',
        type: 'system',
        title: 'Critical Resource Alert',
        messageTemplate: 'Warning: Your {{resourceType}} levels are critically low. You have {{roundsLeft}} rounds to trade or face elimination.',
        priority: 'critical',
        requiresAcknowledgment: true,
        galaxySpecific: true,
        placeholders: ['resourceType', 'roundsLeft']
      },
      {
        id: 'achievement_unlocked',
        name: 'Achievement Unlocked',
        type: 'achievement',
        title: 'Achievement Unlocked!',
        messageTemplate: 'Congratulations! Your team has earned the "{{achievementName}}" achievement for {{achievementReason}}.',
        priority: 'medium',
        requiresAcknowledgment: false,
        galaxySpecific: true,
        placeholders: ['achievementName', 'achievementReason']
      },
      {
        id: 'galaxy_leaderboard_update',
        name: 'Galaxy Leaderboard Update',
        type: 'galaxy_specific',
        title: 'Leaderboard Update',
        messageTemplate: 'The {{galaxyName}} leaderboard has been updated. Your team is currently ranked #{{rank}} out of {{totalTeams}}.',
        priority: 'low',
        requiresAcknowledgment: false,
        galaxySpecific: true,
        placeholders: ['galaxyName', 'rank', 'totalTeams']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Send notification to specific team with galaxy context
   */
  static async sendGalaxyNotification(
    sessionId: string,
    teamId: string,
    templateId: string,
    data: Record<string, any> = {},
    overrides?: Partial<GalaxyNotification>
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Notification template ${templateId} not found`);
    }

    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const team = session.teams.find(t => t.id === teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    let galaxy: Galaxy | null = null;
    if (team.galaxyId) {
      galaxy = await galaxyService.getGalaxy(team.galaxyId);
    }

    // Process message template
    const processedMessage = this.processMessageTemplate(template.messageTemplate, {
      ...data,
      teamName: team.name,
      galaxyName: galaxy?.name || 'Unknown Galaxy'
    });

    const processedTitle = this.processMessageTemplate(template.title, data);

    const notificationId = `galaxy_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: GalaxyNotification = {
      id: notificationId,
      type: template.type,
      targetType: 'team',
      targetId: teamId,
      galaxyId: team.galaxyId,
      title: processedTitle,
      message: processedMessage,
      data,
      priority: template.priority,
      timestamp: Date.now(),
      expiresAt: data.expiresAt,
      isRead: false,
      requiresAcknowledgment: template.requiresAcknowledgment,
      category: template.name,
      tags: data.tags || [],
      ...overrides
    };

    // Save to Firestore
    await setDoc(
      doc(firestore, 'sessions', sessionId, 'notifications', notificationId),
      notification
    );

    // Send to real-time database for immediate delivery
    await this.sendRealtimeNotification(sessionId, team.galaxyId!, notification);

    return notificationId;
  }

  /**
   * Send notification to entire galaxy
   */
  static async sendGalaxyWideNotification(
    sessionId: string,
    galaxyId: string,
    templateId: string,
    data: Record<string, any> = {},
    overrides?: Partial<GalaxyNotification>
  ): Promise<string[]> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const galaxy = await galaxyService.getGalaxy(galaxyId);
    if (!galaxy) {
      throw new Error('Galaxy not found');
    }

    const galaxyTeams = session.teams.filter(team => team.galaxyId === galaxyId);
    const notificationIds: string[] = [];

    const batch = writeBatch(firestore);
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Notification template ${templateId} not found`);
    }

    for (const team of galaxyTeams) {
      const notificationId = `galaxy_wide_${Date.now()}_${team.id}_${Math.random().toString(36).substr(2, 6)}`;
      
      const processedMessage = this.processMessageTemplate(template.messageTemplate, {
        ...data,
        teamName: team.name,
        galaxyName: galaxy.name
      });

      const processedTitle = this.processMessageTemplate(template.title, data);

      const notification: GalaxyNotification = {
        id: notificationId,
        type: 'galaxy_specific',
        targetType: 'team',
        targetId: team.id,
        galaxyId,
        title: processedTitle,
        message: processedMessage,
        data,
        priority: template.priority,
        timestamp: Date.now(),
        expiresAt: data.expiresAt,
        isRead: false,
        requiresAcknowledgment: template.requiresAcknowledgment,
        category: 'Galaxy Announcement',
        tags: ['galaxy-wide', ...(data.tags || [])],
        ...overrides
      };

      batch.set(
        doc(firestore, 'sessions', sessionId, 'notifications', notificationId),
        notification
      );

      notificationIds.push(notificationId);
    }

    await batch.commit();

    // Send to real-time database
    await this.sendRealtimeGalaxyNotification(sessionId, galaxyId, {
      type: 'galaxy_wide',
      title: this.processMessageTemplate(template.title, data),
      message: this.processMessageTemplate(template.messageTemplate, data),
      priority: template.priority,
      timestamp: Date.now()
    });

    return notificationIds;
  }

  /**
   * Send cross-galaxy notification
   */
  static async sendCrossGalaxyNotification(
    sessionId: string,
    templateId: string,
    data: Record<string, any> = {},
    targetGalaxies?: string[]
  ): Promise<string[]> {
    const session = await FlexibleGameService.getFlexibleSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const galaxies = targetGalaxies
      ? await Promise.all(targetGalaxies.map(id => galaxyService.getGalaxy(id)))
      : session.galaxies;

    if (!galaxies || galaxies.length === 0) {
      throw new Error('No galaxies found');
    }

    const notificationIds: string[] = [];

    for (const galaxy of galaxies) {
      if (!galaxy) continue;

      const galaxyNotificationIds = await this.sendGalaxyWideNotification(
        sessionId,
        galaxy.id,
        templateId,
        {
          ...data,
          crossGalaxy: true,
          sourceGalaxies: galaxies.map(g => g?.name).filter(Boolean)
        },
        {
          type: 'cross_galaxy',
          category: 'Cross-Galaxy Announcement',
          tags: ['cross-galaxy', ...(data.tags || [])]
        }
      );

      notificationIds.push(...galaxyNotificationIds);
    }

    return notificationIds;
  }

  /**
   * Send facilitator notification with session overview
   */
  static async sendFacilitatorNotification(
    sessionId: string,
    facilitatorId: string,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ): Promise<string> {
    const notificationId = `facilitator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: GalaxyNotification = {
      id: notificationId,
      type: 'system',
      targetType: 'facilitator',
      targetId: facilitatorId,
      title,
      message,
      data,
      priority: 'medium',
      timestamp: Date.now(),
      isRead: false,
      requiresAcknowledgment: false,
      category: 'Facilitator Alert',
      tags: ['facilitator', 'system']
    };

    await setDoc(
      doc(firestore, 'sessions', sessionId, 'notifications', notificationId),
      notification
    );

    // Send to facilitator real-time channel
    await this.sendRealtimeFacilitatorNotification(sessionId, notification);

    return notificationId;
  }

  /**
   * Get notifications for a team with galaxy context
   */
  static async getTeamNotifications(
    sessionId: string,
    teamId: string,
    options: {
      limit?: number;
      unreadOnly?: boolean;
      priority?: GalaxyNotification['priority'];
      category?: string;
    } = {}
  ): Promise<GalaxyNotification[]> {
    let notificationsQuery = query(
      collection(firestore, 'sessions', sessionId, 'notifications'),
      where('targetId', '==', teamId),
      orderBy('timestamp', 'desc')
    );

    if (options.unreadOnly) {
      notificationsQuery = query(notificationsQuery, where('isRead', '==', false));
    }

    if (options.priority) {
      notificationsQuery = query(notificationsQuery, where('priority', '==', options.priority));
    }

    if (options.category) {
      notificationsQuery = query(notificationsQuery, where('category', '==', options.category));
    }

    if (options.limit) {
      notificationsQuery = query(notificationsQuery, limit(options.limit));
    }

    const notificationDocs = await getDocs(notificationsQuery);
    return notificationDocs.docs.map(doc => doc.data() as GalaxyNotification);
  }

  /**
   * Get galaxy-wide notifications
   */
  static async getGalaxyNotifications(
    sessionId: string,
    galaxyId: string,
    options: {
      limit?: number;
      includeTeamNotifications?: boolean;
    } = {}
  ): Promise<GalaxyNotification[]> {
    let notificationsQuery = query(
      collection(firestore, 'sessions', sessionId, 'notifications'),
      where('galaxyId', '==', galaxyId),
      orderBy('timestamp', 'desc')
    );

    if (options.limit) {
      notificationsQuery = query(notificationsQuery, limit(options.limit));
    }

    const notificationDocs = await getDocs(notificationsQuery);
    let notifications = notificationDocs.docs.map(doc => doc.data() as GalaxyNotification);

    // Filter to galaxy-wide notifications unless team notifications are requested
    if (!options.includeTeamNotifications) {
      notifications = notifications.filter(n => 
        n.type === 'galaxy_specific' || 
        n.type === 'cross_galaxy' ||
        n.category === 'Galaxy Announcement'
      );
    }

    return notifications;
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(
    sessionId: string,
    notificationId: string,
    teamId: string
  ): Promise<void> {
    await updateDoc(doc(firestore, 'sessions', sessionId, 'notifications', notificationId), {
      isRead: true,
      readAt: Timestamp.now(),
      readBy: teamId
    });
  }

  /**
   * Send real-time notification to galaxy
   */
  private static async sendRealtimeNotification(
    sessionId: string,
    galaxyId: string,
    notification: GalaxyNotification
  ): Promise<void> {
    try {
      const notificationRef = ref(
        realtimeDb,
        `sessions/${sessionId}/live/galaxies/${galaxyId}/notifications`
      );
      await push(notificationRef, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.timestamp,
        requiresAcknowledgment: notification.requiresAcknowledgment,
        targetId: notification.targetId
      });
    } catch (error) {
      console.warn('Real-time notification delivery failed:', error);
    }
  }

  /**
   * Send real-time galaxy-wide notification
   */
  private static async sendRealtimeGalaxyNotification(
    sessionId: string,
    galaxyId: string,
    notification: any
  ): Promise<void> {
    try {
      const galaxyNotificationRef = ref(
        realtimeDb,
        `sessions/${sessionId}/live/galaxies/${galaxyId}/galaxy_notifications`
      );
      await push(galaxyNotificationRef, notification);
    } catch (error) {
      console.warn('Real-time galaxy notification delivery failed:', error);
    }
  }

  /**
   * Send real-time facilitator notification
   */
  private static async sendRealtimeFacilitatorNotification(
    sessionId: string,
    notification: GalaxyNotification
  ): Promise<void> {
    try {
      const facilitatorRef = ref(realtimeDb, `sessions/${sessionId}/live/facilitator/notifications`);
      await push(facilitatorRef, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.timestamp,
        data: notification.data
      });
    } catch (error) {
      console.warn('Real-time facilitator notification delivery failed:', error);
    }
  }

  /**
   * Process message template with placeholders
   */
  private static processMessageTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return processed;
  }

  /**
   * Get notification statistics for analytics
   */
  static async getNotificationStatistics(sessionId: string): Promise<{
    totalNotifications: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byGalaxy: Record<string, number>;
    acknowledgmentRate: number;
    averageResponseTime: number;
  }> {
    const notificationsQuery = query(
      collection(firestore, 'sessions', sessionId, 'notifications'),
      orderBy('timestamp', 'desc')
    );

    const notificationDocs = await getDocs(notificationsQuery);
    const notifications = notificationDocs.docs.map(doc => doc.data() as GalaxyNotification);

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byGalaxy: Record<string, number> = {};
    let acknowledgedCount = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    notifications.forEach(notification => {
      // Count by type
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      
      // Count by priority
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
      
      // Count by galaxy
      if (notification.galaxyId) {
        byGalaxy[notification.galaxyId] = (byGalaxy[notification.galaxyId] || 0) + 1;
      }

      // Check acknowledgment
      if (notification.requiresAcknowledgment && notification.isRead) {
        acknowledgedCount++;
        
        // Calculate response time if readAt is available
        if ((notification as any).readAt) {
          const responseTime = (notification as any).readAt - notification.timestamp;
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });

    const totalRequiringAcknowledgment = notifications.filter(n => n.requiresAcknowledgment).length;
    const acknowledgmentRate = totalRequiringAcknowledgment > 0 
      ? acknowledgedCount / totalRequiringAcknowledgment 
      : 0;

    const averageResponseTime = responseCount > 0 
      ? totalResponseTime / responseCount 
      : 0;

    return {
      totalNotifications: notifications.length,
      byType,
      byPriority,
      byGalaxy,
      acknowledgmentRate,
      averageResponseTime
    };
  }
}

// Initialize templates when the service is loaded
FlexibleNotificationService.initializeTemplates();