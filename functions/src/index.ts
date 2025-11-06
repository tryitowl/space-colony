import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { validateTrade } from './game/validateTrade';
import { executeRound } from './game/executeRound';
import { generateIntel } from './game/generateIntel';
import { manageSession } from './game/manageSession';
import { initializeEvent, initializeSession } from './setup/initialization';
import { verifyAuth } from './auth/authentication';
import { logAudit } from './utils/audit';
import { getNextPhase } from './utils/gamePhaseUtils';
import { TradeOffer, Resources, GameSession } from './types';
// import { executeAITrade } from './ai/executeAITrade';

// Initialize Firebase Admin
admin.initializeApp();

// Authentication Functions
export const authenticate = functions.https.onCall(async (_data, context) => {
  return verifyAuth(context);
});

// Game Setup Functions
export const createEvent = functions.https.onCall(async (data, context) => {
  await verifyAuth(context);
  return initializeEvent(data);
});

export const createSession = functions.https.onCall(async (data, context) => {
  await verifyAuth(context);
  const { eventId, ...sessionData } = data;
  return initializeSession(eventId, sessionData);
});

// Core Game Functions
export const validateTradeOffer = functions.https.onCall(validateTrade);
export const processRound = functions.https.onCall(async (data, context) => {
  await verifyAuth(context);
  return executeRound(data);
});

export const createIntel = functions.https.onCall(async (data, context) => {
  await verifyAuth(context);
  return generateIntel(data);
});

export const controlSession = functions.https.onCall(async (data, context) => {
  await verifyAuth(context);
  return manageSession(data);
});

// AI Functions (to be implemented)
// export const aiTradeExecution = executeAITrade;

// Triggered Functions
export const onTradeCreated = functions.firestore
  .document('events/{eventId}/sessions/{sessionId}/trades/{tradeId}')
  .onCreate(async (snap, context) => {
    const trade = snap.data();
    const { eventId, sessionId, tradeId } = context.params;
    
    try {
      // Validate the trade
      const isValid = await validateTrade({ trade: trade as TradeOffer, eventId, sessionId });
      if (!isValid.valid) {
        // Mark trade as invalid
        await snap.ref.update({
          status: 'rejected',
          message: isValid.reason || 'Invalid trade',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      
      // Update realtime database with active trade
      const tradeData = trade as TradeOffer;
      await admin.database().ref(`sessions/${sessionId}/live/activeTrades/${tradeId}`).set({
        initiator: tradeData.initiatorId,
        target: tradeData.targetId,
        status: 'pending',
        expiresAt: tradeData.expiresAt,
        timeRemaining: Math.max(0, tradeData.expiresAt - Date.now())
      });
      
      // Send notification to target team
      await admin.database().ref(`sessions/${sessionId}/live/notifications`).push({
        type: 'trade_request',
        message: `${tradeData.initiatorId} wants to trade with you`,
        targetTeam: tradeData.targetId,
        priority: 'high',
        expiresAt: tradeData.expiresAt,
        timestamp: Date.now()
      });
      
      // Audit log
      await logAudit({
        eventId,
        sessionId,
        teamId: tradeData.initiatorId,
        action: 'trade_created',
        details: { tradeId, target: tradeData.targetId },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error processing trade creation:', error);
    }
  });

export const onTradeUpdated = functions.firestore
  .document('events/{eventId}/sessions/{sessionId}/trades/{tradeId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { eventId, sessionId, tradeId } = context.params;
    
    try {
      // Handle trade completion
      if (before.status !== 'accepted' && after.status === 'accepted') {
        // Execute the trade (to be implemented)
        const result = { success: true }; // await executeTradeTransaction(after, eventId, sessionId);
        
        if (result.success) {
          // Update realtime database
          await admin.database().ref(`sessions/${sessionId}/live/activeTrades/${tradeId}`).remove();
          
          // Add to event stream
          const afterTrade = after as TradeOffer;
          await admin.database().ref(`events/${sessionId}/stream`).push({
            type: 'trade_completed',
            teams: [afterTrade.initiatorId, afterTrade.targetId],
            summary: `Trade completed between ${afterTrade.initiatorId} and ${afterTrade.targetId}`,
            timestamp: Date.now()
          });
          
          // Audit log
          await logAudit({
            eventId,
            sessionId,
            action: 'trade_accepted',
            details: { tradeId, finalTerms: after.finalTerms },
          timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      // Handle trade rejection/expiration
      if (['rejected', 'expired', 'cancelled'].includes(after.status)) {
        await admin.database().ref(`sessions/${sessionId}/live/activeTrades/${tradeId}`).remove();
      }
      
    } catch (error) {
      console.error('Error processing trade update:', error);
    }
  });

export const onPlayerJoined = functions.firestore
  .document('events/{eventId}/sessions/{sessionId}/teams/{teamId}/players/{playerId}')
  .onCreate(async (snap, context) => {
    const player = snap.data();
    const { eventId, sessionId, teamId, playerId } = context.params;
    
    try {
      // Update player presence in realtime database
      await admin.database().ref(`players/${playerId}/presence`).set({
        status: 'online',
        lastSeen: Date.now(),
        sessionId,
        teamId,
        connectedAt: Date.now(),
        heartbeat: Date.now()
      });
      
      // Update team player count
      const teamRef = admin.database().ref(`teams/${sessionId}/${teamId}/status`);
      const teamSnapshot = await teamRef.once('value');
      const teamStatus = teamSnapshot.val() || { playersOnline: [] };
      
      teamStatus.playersOnline = [...(teamStatus.playersOnline || []), playerId];
      await teamRef.update(teamStatus);
      
      // Audit log
      await logAudit({
        eventId,
        sessionId,
        teamId,
        userId: playerId,
        action: 'player_joined',
        details: { gameCode: player.gameCode },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error processing player join:', error);
    }
  });

export const onRoundTimer = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (_context) => {
    try {
      // Get all active sessions
      const sessionsSnapshot = await admin.firestore()
        .collectionGroup('sessions')
        .where('isActive', '==', true)
        .get();
      
      const batch = admin.firestore().batch();
      const realtimeUpdates: Promise<void>[] = [];
      
      sessionsSnapshot.forEach((doc) => {
        const session = doc.data() as GameSession;
        const sessionId = doc.id;
        const roundEndTime = (session as GameSession & { roundEndTime?: number }).roundEndTime;
        
        if (roundEndTime && roundEndTime < Date.now()) {
          const currentPhase = session.gameState;
          const nextPhase = getNextPhase(currentPhase);
          const phaseDuration = session.settings?.roundDurations?.[nextPhase] || 300;
          
          // Round has ended, trigger round progression
          batch.update(doc.ref, {
            gameState: nextPhase,
            currentRound: currentPhase.includes('round') ? session.currentRound + 1 : session.currentRound,
            roundStartTime: Date.now(),
            roundEndTime: Date.now() + (phaseDuration * 1000)
          });
          
          // Update realtime database
          realtimeUpdates.push(
            admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
              currentPhase: nextPhase,
              roundStartTime: Date.now(),
              roundEndTime: Date.now() + (phaseDuration * 1000),
              isPaused: false
            })
          );
        }
      });
      
      await batch.commit();
      await Promise.all(realtimeUpdates);
      
    } catch (error) {
      console.error('Error in round timer:', error);
    }
  });

// Helper Functions
// TODO: Implement actual trade transaction logic
/* async function executeTradeTransaction(trade: any, eventId: string, sessionId: string) {
  const db = admin.firestore();
  
  try {
    return await db.runTransaction(async (transaction) => {
      // Get both teams
      const initiatorRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${trade.initiator}`);
      const targetRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${trade.target}`);
      
      const initiatorDoc = await transaction.get(initiatorRef);
      const targetDoc = await transaction.get(targetRef);
      
      if (!initiatorDoc.exists || !targetDoc.exists) {
        throw new Error('One or both teams not found');
      }
      
      const initiatorData = initiatorDoc.data()!;
      const targetData = targetDoc.data()!;
      
      // Validate resources
      const validation = validateTradeResources(initiatorData.resources, targetData.resources, trade);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
      
      // Update resources
      const updatedInitiatorResources = applyTradeToResources(
        initiatorData.resources,
        trade.finalTerms.giving,
        trade.finalTerms.receiving
      );
      
      const updatedTargetResources = applyTradeToResources(
        targetData.resources,
        trade.finalTerms.receiving,
        trade.finalTerms.giving
      );
      
      // Update both teams
      transaction.update(initiatorRef, {
        resources: updatedInitiatorResources,
        'statistics.totalTrades': admin.firestore.FieldValue.increment(1),
        'statistics.successfulTrades': admin.firestore.FieldValue.increment(1),
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
      
      transaction.update(targetRef, {
        resources: updatedTargetResources,
        'statistics.totalTrades': admin.firestore.FieldValue.increment(1),
        'statistics.successfulTrades': admin.firestore.FieldValue.increment(1),
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    });
  } catch (error) {
    console.error('Trade transaction failed:', error);
    return { success: false, error: (error as Error).message };
  }
} */

// TODO: Move these helper functions when implementing executeTradeTransaction
/*
function validateTradeResources(initiatorResources: Resources, targetResources: Resources, trade: TradeOffer) {
  // Check if initiator has enough resources to give
  for (const [resource, amount] of Object.entries(trade.offerResources)) {
    const resourceKey = resource as keyof Resources;
    const currentAmount = initiatorResources[resourceKey];
    if (typeof currentAmount === 'number' && typeof amount === 'number' && currentAmount < amount) {
      return { valid: false, reason: `Insufficient ${resource}` };
    }
  }
  
  // Check if target has enough resources to give
  for (const [resource, amount] of Object.entries(trade.requestResources)) {
    const resourceKey = resource as keyof Resources;
    const currentAmount = targetResources[resourceKey];
    if (typeof currentAmount === 'number' && typeof amount === 'number' && currentAmount < amount) {
      return { valid: false, reason: `Target has insufficient ${resource}` };
    }
  }
  
  return { valid: true };
}

function applyTradeToResources(currentResources: Resources, giving: Partial<Resources>, receiving: Partial<Resources>): Resources {
  const updatedResources = { ...currentResources };
  
  // Remove given resources
  for (const [resource, amount] of Object.entries(giving)) {
    const resourceKey = resource as keyof Resources;
    const currentAmount = updatedResources[resourceKey];
    if (typeof currentAmount === 'number' && typeof amount === 'number') {
      updatedResources[resourceKey] = Math.max(0, currentAmount - amount) as Resources[keyof Resources];
    }
  }
  
  // Add received resources
  for (const [resource, amount] of Object.entries(receiving)) {
    const resourceKey = resource as keyof Resources;
    const currentAmount = updatedResources[resourceKey];
    if (typeof currentAmount === 'number' && typeof amount === 'number') {
      updatedResources[resourceKey] = (currentAmount + amount) as Resources[keyof Resources];
    }
  }
  
  return updatedResources;
}

*/

// getNextPhase moved to utils/gamePhaseUtils.ts