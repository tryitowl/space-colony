import * as admin from 'firebase-admin';

export interface EventData {
  id: string;
  name: string;
  organizationId: string;
  createdAt: FirebaseFirestore.Timestamp;
  facilitators: string[];
  settings: {
    maxTeams: number;
    maxPlayersPerTeam: number;
    roundDuration: number;
    tradingEnabled: boolean;
    alienContactRound?: number;
  };
}

export interface SessionData {
  id: string;
  eventId: string;
  name: string;
  gameCode: string;
  isActive: boolean;
  currentPhase: string;
  currentRound: number;
  phaseConfig: Record<string, number>;
  createdAt: FirebaseFirestore.Timestamp;
  startedAt?: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

export async function initializeEvent(eventData: Partial<EventData>): Promise<string> {
  const db = admin.firestore();
  
  const event: Partial<EventData> = {
    ...eventData,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    settings: {
      maxTeams: 20,
      maxPlayersPerTeam: 6,
      roundDuration: 600, // 10 minutes
      tradingEnabled: true,
      alienContactRound: 3,
      ...eventData.settings
    }
  };
  
  const eventRef = await db.collection('events').add(event);
  return eventRef.id;
}

export async function initializeSession(
  eventId: string,
  sessionData: Partial<SessionData>
): Promise<string> {
  const db = admin.firestore();
  
  // Generate unique game code
  const gameCode = generateGameCode();
  
  const session: Partial<SessionData> = {
    ...sessionData,
    eventId,
    gameCode,
    isActive: false,
    currentPhase: 'setup',
    currentRound: 0,
    phaseConfig: {
      instructions: 300, // 5 minutes
      investment: 600, // 10 minutes
      round_1: 600,
      round_2: 600,
      milestone: 300, // 5 minutes
      round_3: 600,
      round_4: 600,
      round_5: 600,
      ...sessionData.phaseConfig
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp
  };
  
  const sessionRef = await db.collection(`events/${eventId}/sessions`).add(session);
  
  // Initialize realtime database structure
  await admin.database().ref(`sessions/${sessionRef.id}`).set({
    gameCode,
    live: {
      gameState: {
        currentPhase: 'setup',
        isPaused: false,
        timeRemaining: 0
      },
      notifications: {},
      leaderboard: []
    }
  });
  
  return sessionRef.id;
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}