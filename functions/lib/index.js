"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRoundTimer = exports.onPlayerJoined = exports.onTradeUpdated = exports.onTradeCreated = exports.controlSession = exports.createIntel = exports.processRound = exports.validateTradeOffer = exports.createSession = exports.createEvent = exports.authenticate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const validateTrade_1 = require("./game/validateTrade");
const executeRound_1 = require("./game/executeRound");
const generateIntel_1 = require("./game/generateIntel");
const manageSession_1 = require("./game/manageSession");
const initialization_1 = require("./setup/initialization");
const authentication_1 = require("./auth/authentication");
const audit_1 = require("./utils/audit");
// import { executeAITrade } from './ai/executeAITrade';
// Initialize Firebase Admin
admin.initializeApp();
// Authentication Functions
exports.authenticate = functions.https.onCall(async (_data, context) => {
    return (0, authentication_1.verifyAuth)(context);
});
// Game Setup Functions
exports.createEvent = functions.https.onCall(async (data, context) => {
    await (0, authentication_1.verifyAuth)(context);
    return (0, initialization_1.initializeEvent)(data);
});
exports.createSession = functions.https.onCall(async (data, context) => {
    await (0, authentication_1.verifyAuth)(context);
    const { eventId } = data, sessionData = __rest(data, ["eventId"]);
    return (0, initialization_1.initializeSession)(eventId, sessionData);
});
// Core Game Functions
exports.validateTradeOffer = functions.https.onCall(validateTrade_1.validateTrade);
exports.processRound = functions.https.onCall(async (data, context) => {
    await (0, authentication_1.verifyAuth)(context);
    return (0, executeRound_1.executeRound)(data);
});
exports.createIntel = functions.https.onCall(async (data, context) => {
    await (0, authentication_1.verifyAuth)(context);
    return (0, generateIntel_1.generateIntel)(data);
});
exports.controlSession = functions.https.onCall(async (data, context) => {
    await (0, authentication_1.verifyAuth)(context);
    return (0, manageSession_1.manageSession)(data);
});
// AI Functions (to be implemented)
// export const aiTradeExecution = executeAITrade;
// Triggered Functions
exports.onTradeCreated = functions.firestore
    .document('events/{eventId}/sessions/{sessionId}/trades/{tradeId}')
    .onCreate(async (snap, context) => {
    var _a;
    const trade = snap.data();
    const { eventId, sessionId, tradeId } = context.params;
    try {
        // Validate the trade
        const isValid = await (0, validateTrade_1.validateTrade)({ trade, eventId, sessionId });
        if (!isValid.valid) {
            // Mark trade as invalid
            await snap.ref.update({
                status: 'rejected',
                message: ((_a = isValid.errors) === null || _a === void 0 ? void 0 : _a[0]) || 'Invalid trade',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }
        // Update realtime database with active trade
        await admin.database().ref(`sessions/${sessionId}/live/activeTrades/${tradeId}`).set({
            initiator: trade.initiator,
            target: trade.target,
            status: 'pending',
            expiresAt: trade.expiresAt,
            timeRemaining: Math.max(0, trade.expiresAt - Date.now())
        });
        // Send notification to target team
        await admin.database().ref(`sessions/${sessionId}/live/notifications`).push({
            type: 'trade_request',
            message: `${trade.initiator} wants to trade with you`,
            targetTeam: trade.target,
            priority: 'high',
            expiresAt: trade.expiresAt,
            timestamp: Date.now()
        });
        // Audit log
        await (0, audit_1.logAudit)({
            eventId,
            sessionId,
            teamId: trade.initiator,
            action: 'trade_created',
            details: { tradeId, target: trade.target },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error('Error processing trade creation:', error);
    }
});
exports.onTradeUpdated = functions.firestore
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
                await admin.database().ref(`events/${sessionId}/stream`).push({
                    type: 'trade_completed',
                    teams: [after.initiator, after.target],
                    summary: `Trade completed between ${after.initiator} and ${after.target}`,
                    timestamp: Date.now()
                });
                // Audit log
                await (0, audit_1.logAudit)({
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
    }
    catch (error) {
        console.error('Error processing trade update:', error);
    }
});
exports.onPlayerJoined = functions.firestore
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
        await (0, audit_1.logAudit)({
            eventId,
            sessionId,
            teamId,
            userId: playerId,
            action: 'player_joined',
            details: { gameCode: player.gameCode },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error('Error processing player join:', error);
    }
});
exports.onRoundTimer = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async (_context) => {
    try {
        // Get all active sessions
        const sessionsSnapshot = await admin.firestore()
            .collectionGroup('sessions')
            .where('isActive', '==', true)
            .get();
        const batch = admin.firestore().batch();
        const realtimeUpdates = [];
        sessionsSnapshot.forEach((doc) => {
            const session = doc.data();
            const sessionId = doc.id;
            if (session.roundEndTime && session.roundEndTime < Date.now()) {
                // Round has ended, trigger round progression
                batch.update(doc.ref, {
                    currentPhase: getNextPhase(session.currentPhase),
                    currentRound: session.currentPhase.includes('round') ? session.currentRound + 1 : session.currentRound,
                    roundStartTime: Date.now(),
                    roundEndTime: Date.now() + (session.phaseConfig[getNextPhase(session.currentPhase)] * 1000)
                });
                // Update realtime database
                realtimeUpdates.push(admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
                    currentPhase: getNextPhase(session.currentPhase),
                    roundStartTime: Date.now(),
                    roundEndTime: Date.now() + (session.phaseConfig[getNextPhase(session.currentPhase)] * 1000),
                    isPaused: false
                }));
            }
        });
        await batch.commit();
        await Promise.all(realtimeUpdates);
    }
    catch (error) {
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
    return { success: false, error: (error as any).message };
  }
} */
// TODO: Move these helper functions when implementing executeTradeTransaction
/*
function validateTradeResources(initiatorResources: any, targetResources: any, trade: any) {
  // Check if initiator has enough resources to give
  for (const [resource, amount] of Object.entries(trade.finalTerms.giving)) {
    if (initiatorResources[resource] < (amount as number)) {
      return { valid: false, reason: `Insufficient ${resource}` };
    }
  }
  
  // Check if target has enough resources to give
  for (const [resource, amount] of Object.entries(trade.finalTerms.receiving)) {
    if (targetResources[resource] < (amount as number)) {
      return { valid: false, reason: `Target has insufficient ${resource}` };
    }
  }
  
  return { valid: true };
}

function applyTradeToResources(currentResources: any, giving: any, receiving: any) {
  const updatedResources = { ...currentResources };
  
  // Remove given resources
  for (const [resource, amount] of Object.entries(giving)) {
    updatedResources[resource] = Math.max(0, updatedResources[resource] - (amount as number));
  }
  
  // Add received resources
  for (const [resource, amount] of Object.entries(receiving)) {
    updatedResources[resource] = updatedResources[resource] + (amount as number);
  }
  
  return updatedResources;
}

*/
function getNextPhase(currentPhase) {
    const phaseOrder = ['setup', 'investment', 'round_1', 'round_2', 'milestone', 'round_3', 'round_4', 'round_5', 'completed'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return phaseOrder[Math.min(currentIndex + 1, phaseOrder.length - 1)];
}
//# sourceMappingURL=index.js.map