import * as admin from 'firebase-admin';

export interface AuditDetails {
  tradeId?: string;
  target?: string;
  gameCode?: string;
  finalTerms?: unknown;
  [key: string]: unknown;
}

export interface AuditEntry {
  action: string;
  userId?: string;
  teamId?: string;
  sessionId?: string;
  eventId?: string;
  details: AuditDetails;
  timestamp: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  ip?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection('auditLogs').add({
      ...entry,
      timestamp: entry.timestamp || admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

export async function logTradeAudit(
  sessionId: string,
  tradeId: string,
  action: string,
  details: AuditDetails
): Promise<void> {
  await logAudit({
    action: `trade.${action}`,
    sessionId,
    details: {
      tradeId,
      ...details
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

export async function logSessionAudit(
  eventId: string,
  sessionId: string,
  action: string,
  details: AuditDetails
): Promise<void> {
  await logAudit({
    action: `session.${action}`,
    eventId,
    sessionId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}