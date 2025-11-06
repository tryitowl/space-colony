/**
 * Team Chat Service - Manages team communication and activity logging
 */

import { 
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  TeamChatMessage,
  TeamActivityLog,
  ActivityType,
  ActivityDetails,
  MessageMetadata
} from '../types/player.types';

interface ChatCallbacks {
  onMessageReceived?: (message: TeamChatMessage) => void;
  onActivityLogged?: (activity: TeamActivityLog) => void;
  onTypingStatusChange?: (typingPlayers: string[]) => void;
}

export class TeamChatService {
  private static instances: Map<string, TeamChatService> = new Map();
  private sessionId: string;
  private teamId: string;
  private callbacks: ChatCallbacks;
  private listeners: (() => void)[] = [];
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();
  private typingPlayers: Set<string> = new Set();

  private constructor(
    sessionId: string,
    teamId: string,
    callbacks: ChatCallbacks = {}
  ) {
    this.sessionId = sessionId;
    this.teamId = teamId;
    this.callbacks = callbacks;
  }

  /**
   * Get or create instance
   */
  static getInstance(
    sessionId: string,
    teamId: string,
    callbacks?: ChatCallbacks
  ): TeamChatService {
    const key = `${sessionId}-${teamId}`;
    if (!this.instances.has(key)) {
      this.instances.set(
        key,
        new TeamChatService(sessionId, teamId, callbacks || {})
      );
    }
    return this.instances.get(key)!;
  }

  /**
   * Initialize chat service
   */
  async initialize(): Promise<void> {
    // Monitor chat messages
    this.monitorChatMessages();
    
    // Monitor activity logs
    this.monitorActivityLogs();
  }

  /**
   * Send chat message
   */
  async sendMessage(
    playerId: string,
    playerName: string,
    message: string,
    type: 'text' | 'system' | 'trade' | 'alert' = 'text',
    metadata?: MessageMetadata
  ): Promise<TeamChatMessage> {
    const chatMessage: TeamChatMessage = {
      id: '', // Will be set by Firestore
      teamId: this.teamId,
      playerId,
      playerName,
      message,
      timestamp: Date.now(),
      type,
      metadata
    };

    const docRef = await addDoc(
      collection(firestore, 'sessions', this.sessionId, 'teamChats'),
      chatMessage
    );

    chatMessage.id = docRef.id;
    
    return chatMessage;
  }

  /**
   * Send trade-related message
   */
  async sendTradeMessage(
    playerId: string,
    playerName: string,
    tradeId: string,
    action: 'proposed' | 'accepted' | 'rejected' | 'countered',
    targetTeam?: string,
    details?: string
  ): Promise<TeamChatMessage> {
    const messages = {
      proposed: `proposed a trade${targetTeam ? ` with ${targetTeam}` : ''}`,
      accepted: `accepted a trade${targetTeam ? ` from ${targetTeam}` : ''}`,
      rejected: `rejected a trade${targetTeam ? ` from ${targetTeam}` : ''}`,
      countered: `countered a trade${targetTeam ? ` with ${targetTeam}` : ''}`
    };

    const message = `${playerName} ${messages[action]}${details ? `: ${details}` : ''}`;

    return this.sendMessage(
      playerId,
      playerName,
      message,
      'trade',
      { tradeId, targetTeam }
    );
  }

  /**
   * Send system message
   */
  async sendSystemMessage(message: string): Promise<TeamChatMessage> {
    return this.sendMessage(
      'system',
      'System',
      message,
      'system'
    );
  }

  /**
   * Send alert message
   */
  async sendAlertMessage(
    message: string,
    resourceType?: string,
    amount?: number
  ): Promise<TeamChatMessage> {
    return this.sendMessage(
      'system',
      'Alert',
      message,
      'alert',
      { resourceType, amount }
    );
  }

  /**
   * Log team activity
   */
  async logActivity(
    playerId: string,
    playerName: string,
    type: ActivityType,
    details: ActivityDetails
  ): Promise<TeamActivityLog> {
    const activity: TeamActivityLog = {
      id: '', // Will be set by Firestore
      teamId: this.teamId,
      timestamp: Date.now(),
      type,
      playerId,
      playerName,
      details
    };

    const docRef = await addDoc(
      collection(firestore, 'sessions', this.sessionId, 'teamActivities'),
      activity
    );

    activity.id = docRef.id;

    // Send corresponding chat message for important activities
    if (details.importance === 'high' || details.importance === 'critical') {
      await this.sendSystemMessage(details.message);
    }

    return activity;
  }

  /**
   * Log player joined
   */
  async logPlayerJoined(playerId: string, playerName: string): Promise<void> {
    await this.logActivity(
      playerId,
      playerName,
      'player_joined',
      {
        message: `${playerName} joined the team`,
        importance: 'medium'
      }
    );
  }

  /**
   * Log player left
   */
  async logPlayerLeft(playerId: string, playerName: string): Promise<void> {
    await this.logActivity(
      playerId,
      playerName,
      'player_left',
      {
        message: `${playerName} left the team`,
        importance: 'medium'
      }
    );
  }

  /**
   * Log trade activity
   */
  async logTradeActivity(
    playerId: string,
    playerName: string,
    action: 'proposed' | 'voted' | 'completed',
    tradeDetails: any
  ): Promise<void> {
    const typeMap = {
      proposed: 'trade_proposed',
      voted: 'trade_voted',
      completed: 'trade_completed'
    };

    await this.logActivity(
      playerId,
      playerName,
      typeMap[action] as ActivityType,
      {
        message: `${playerName} ${action} trade`,
        metadata: tradeDetails,
        importance: action === 'completed' ? 'high' : 'medium'
      }
    );
  }

  /**
   * Log investment made
   */
  async logInvestment(
    playerId: string,
    playerName: string,
    investmentType: string,
    amount: number
  ): Promise<void> {
    await this.logActivity(
      playerId,
      playerName,
      'investment_made',
      {
        message: `${playerName} invested ${amount} in ${investmentType}`,
        metadata: { investmentType, amount },
        importance: 'medium'
      }
    );
  }

  /**
   * Log role change
   */
  async logRoleChange(
    playerId: string,
    playerName: string,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.logActivity(
      playerId,
      playerName,
      'role_changed',
      {
        message: `${playerName}'s role changed from ${oldRole} to ${newRole}`,
        metadata: { oldRole, newRole },
        importance: 'high'
      }
    );
  }

  /**
   * Log resource critical
   */
  async logResourceCritical(
    playerId: string,
    playerName: string,
    criticalResources: string[]
  ): Promise<void> {
    await this.logActivity(
      playerId,
      playerName,
      'resource_critical',
      {
        message: `Critical resources: ${criticalResources.join(', ')}`,
        metadata: { criticalResources },
        importance: 'critical'
      }
    );
  }

  /**
   * Monitor chat messages
   */
  private monitorChatMessages(): void {
    const constraints: QueryConstraint[] = [
      where('teamId', '==', this.teamId),
      orderBy('timestamp', 'desc'),
      limit(100)
    ];

    const chatQuery = query(
      collection(firestore, 'sessions', this.sessionId, 'teamChats'),
      ...constraints
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const message = {
            ...change.doc.data(),
            id: change.doc.id
          } as TeamChatMessage;
          
          this.callbacks.onMessageReceived?.(message);
        }
      });
    });

    this.listeners.push(unsubscribe);
  }

  /**
   * Monitor activity logs
   */
  private monitorActivityLogs(): void {
    const constraints: QueryConstraint[] = [
      where('teamId', '==', this.teamId),
      orderBy('timestamp', 'desc'),
      limit(50)
    ];

    const activityQuery = query(
      collection(firestore, 'sessions', this.sessionId, 'teamActivities'),
      ...constraints
    );

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const activity = {
            ...change.doc.data(),
            id: change.doc.id
          } as TeamActivityLog;
          
          this.callbacks.onActivityLogged?.(activity);
        }
      });
    });

    this.listeners.push(unsubscribe);
  }

  /**
   * Get chat history
   */
  async getChatHistory(messageLimit: number = 100): Promise<TeamChatMessage[]> {
    const constraints: QueryConstraint[] = [
      where('teamId', '==', this.teamId),
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    ];

    const chatQuery = query(
      collection(firestore, 'sessions', this.sessionId, 'teamChats'),
      ...constraints
    );

    const snapshot = await new Promise<any>((resolve) => {
      const unsubscribe = onSnapshot(chatQuery, (snap) => {
        unsubscribe();
        resolve(snap);
      });
    });

    const messages: TeamChatMessage[] = [];
    snapshot.forEach((doc: any) => {
      messages.push({
        ...doc.data(),
        id: doc.id
      });
    });

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Get activity history
   */
  async getActivityHistory(activityLimit: number = 50): Promise<TeamActivityLog[]> {
    const constraints: QueryConstraint[] = [
      where('teamId', '==', this.teamId),
      orderBy('timestamp', 'desc'),
      limit(activityLimit)
    ];

    const activityQuery = query(
      collection(firestore, 'sessions', this.sessionId, 'teamActivities'),
      ...constraints
    );

    const snapshot = await new Promise<any>((resolve) => {
      const unsubscribe = onSnapshot(activityQuery, (snap) => {
        unsubscribe();
        resolve(snap);
      });
    });

    const activities: TeamActivityLog[] = [];
    snapshot.forEach((doc: any) => {
      activities.push({
        ...doc.data(),
        id: doc.id
      });
    });

    return activities.reverse(); // Return in chronological order
  }

  /**
   * Set typing status
   */
  setTypingStatus(playerId: string, isTyping: boolean): void {
    if (isTyping) {
      this.typingPlayers.add(playerId);
      
      // Clear existing timer
      const existingTimer = this.typingTimers.get(playerId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      // Set new timer to auto-clear after 5 seconds
      const timer = setTimeout(() => {
        this.typingPlayers.delete(playerId);
        this.typingTimers.delete(playerId);
        this.notifyTypingStatus();
      }, 5000);
      
      this.typingTimers.set(playerId, timer);
    } else {
      this.typingPlayers.delete(playerId);
      const timer = this.typingTimers.get(playerId);
      if (timer) {
        clearTimeout(timer);
        this.typingTimers.delete(playerId);
      }
    }
    
    this.notifyTypingStatus();
  }

  /**
   * Notify typing status change
   */
  private notifyTypingStatus(): void {
    this.callbacks.onTypingStatusChange?.(Array.from(this.typingPlayers));
  }

  /**
   * Search messages
   */
  async searchMessages(searchTerm: string, messageLimit: number = 50): Promise<TeamChatMessage[]> {
    // Note: This is a simple implementation. For production, consider using
    // a search service like Algolia or Elasticsearch
    const messages = await this.getChatHistory(messageLimit);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return messages.filter(msg => 
      msg.message.toLowerCase().includes(lowercaseSearch) ||
      msg.playerName.toLowerCase().includes(lowercaseSearch)
    );
  }

  /**
   * Clean up service
   */
  destroy(): void {
    // Clear typing timers
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
    this.typingPlayers.clear();

    // Remove listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];

    // Remove from instances
    const key = `${this.sessionId}-${this.teamId}`;
    TeamChatService.instances.delete(key);
  }
}