import { notificationService } from './notificationService';
import { sessionService } from './sessionService';
import { teamDataService } from './teamDataService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Service for real-time updates
 * This is a facade that delegates to appropriate services
 */
export class RealtimeService {
  static async updateSessionData(sessionId: string, data: any): Promise<void> {
    // Update session in Firestore
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      ...data,
      updatedAt: Date.now()
    });
  }

  static async sendNotification(sessionId: string, notification: any): Promise<void> {
    // Delegate to notification service
    return notificationService.sendNotification(
      sessionId,
      notification.recipientId || sessionId,
      notification
    );
  }

  static async updateTeamStatus(sessionId: string, teamId: string, status: any): Promise<void> {
    // Update team status
    await teamDataService.updateTeam(teamId, status);
  }
}

export const realtimeService = RealtimeService;