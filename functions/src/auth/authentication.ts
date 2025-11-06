import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { TeamPlayer } from '../types';

export interface AuthContext {
  uid?: string;
  teamId?: string;
  sessionId?: string;
  eventId?: string;
  role?: 'player' | 'facilitator' | 'admin';
}

export async function verifyAuth(
  context: functions.https.CallableContext
): Promise<AuthContext> {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  
  return {
    uid: context.auth.uid
  };
}

export async function verifyTeamMembership(
  uid: string,
  teamId: string,
  sessionId: string,
  eventId: string
): Promise<boolean> {
  const db = admin.firestore();
  
  const teamDoc = await db.doc(
    `events/${eventId}/sessions/${sessionId}/teams/${teamId}`
  ).get();
  
  if (!teamDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Team not found'
    );
  }
  
  const teamData = teamDoc.data()!;
  const isTeamMember = teamData.players.some((player: TeamPlayer) => player.id === uid);
  
  if (!isTeamMember) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User is not a member of this team'
    );
  }
  
  return true;
}

export async function verifyFacilitatorRole(
  uid: string,
  eventId: string
): Promise<boolean> {
  const db = admin.firestore();
  
  const eventDoc = await db.doc(`events/${eventId}`).get();
  
  if (!eventDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Event not found'
    );
  }
  
  const eventData = eventDoc.data()!;
  const isFacilitator = eventData.facilitators?.includes(uid);
  
  if (!isFacilitator) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User is not a facilitator for this event'
    );
  }
  
  return true;
}