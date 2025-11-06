"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAITrade = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
/**
 * Firebase Function to execute AI trading decisions
 * This ensures all AI trades are validated server-side
 */
exports.executeAITrade = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const { sessionId, tradeId, aiColonyId, action, counterOffer } = request.data;
    if (!sessionId || !tradeId || !aiColonyId || !action) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required parameters');
    }
    const db = (0, firestore_1.getFirestore)();
    try {
        // Get session data
        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Session not found');
        }
        const sessionData = sessionDoc.data();
        // Verify AI is configured for this session
        if (!(sessionData === null || sessionData === void 0 ? void 0 : sessionData.aiConfigs) || sessionData.aiConfigs.length === 0) {
            throw new https_1.HttpsError('failed-precondition', 'No AI configuration found for session');
        }
        // Verify this colony is AI-controlled
        const aiConfig = sessionData.aiConfigs.find((config) => config.colonyId === aiColonyId);
        if (!aiConfig || !aiConfig.isAIControlled) {
            throw new https_1.HttpsError('permission-denied', 'Colony is not AI-controlled');
        }
        // Get trade data
        const tradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(tradeId);
        const tradeDoc = await tradeRef.get();
        if (!tradeDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Trade not found');
        }
        const tradeData = tradeDoc.data();
        // Verify the AI colony is the target of this trade
        if ((tradeData === null || tradeData === void 0 ? void 0 : tradeData.targetId) !== aiColonyId) {
            throw new https_1.HttpsError('permission-denied', 'AI colony is not the target of this trade');
        }
        // Verify trade is still pending
        if ((tradeData === null || tradeData === void 0 ? void 0 : tradeData.status) !== 'pending') {
            throw new https_1.HttpsError('failed-precondition', 'Trade is no longer pending');
        }
        let result;
        switch (action) {
            case 'accept':
                result = await acceptTrade(db, sessionId, tradeId, aiColonyId, tradeData);
                break;
            case 'reject':
                result = await rejectTrade(db, sessionId, tradeId);
                break;
            case 'counter':
                if (!counterOffer) {
                    throw new https_1.HttpsError('invalid-argument', 'Counter offer required for counter action');
                }
                result = await createCounterOffer(db, sessionId, tradeId, aiColonyId, tradeData, counterOffer);
                break;
            default:
                throw new https_1.HttpsError('invalid-argument', 'Invalid action');
        }
        // Log AI trade action for analytics
        await logAITradeAction(db, sessionId, aiColonyId, action, tradeId, result.success);
        return result;
    }
    catch (error) {
        firebase_functions_1.logger.error('Error executing AI trade:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to execute AI trade');
    }
});
/**
 * Accept a trade on behalf of AI colony
 */
async function acceptTrade(db, sessionId, tradeId, aiColonyId, tradeData) {
    const batch = db.batch();
    try {
        // Update trade status
        const tradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(tradeId);
        batch.update(tradeRef, {
            status: 'accepted',
            acceptedAt: firestore_1.FieldValue.serverTimestamp(),
            acceptedBy: aiColonyId
        });
        // Update colony resources
        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        const sessionData = sessionDoc.data();
        if (!sessionData) {
            throw new Error('Session data not found');
        }
        // Find the colonies involved
        const initiatorColony = sessionData.teams.find((team) => team.id === tradeData.initiatorId);
        const targetColony = sessionData.teams.find((team) => team.id === tradeData.targetId);
        if (!initiatorColony || !targetColony) {
            throw new Error('One or both colonies not found');
        }
        // Validate resources are available
        if (!validateResourceAvailability(targetColony, tradeData.requestResources)) {
            throw new Error('AI colony does not have requested resources');
        }
        if (!validateResourceAvailability(initiatorColony, tradeData.offerResources)) {
            throw new Error('Initiator colony does not have offered resources');
        }
        // Update resources for both colonies
        const updatedTeams = sessionData.teams.map((team) => {
            if (team.id === tradeData.initiatorId) {
                return updateColonyResources(team, tradeData.requestResources, tradeData.offerResources);
            }
            else if (team.id === tradeData.targetId) {
                return updateColonyResources(team, tradeData.offerResources, tradeData.requestResources);
            }
            return team;
        });
        batch.update(sessionRef, { teams: updatedTeams });
        await batch.commit();
        return {
            success: true,
            message: 'Trade accepted successfully'
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error accepting trade:', error);
        return {
            success: false,
            message: 'Failed to accept trade'
        };
    }
}
/**
 * Reject a trade on behalf of AI colony
 */
async function rejectTrade(db, sessionId, tradeId) {
    try {
        const tradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(tradeId);
        await tradeRef.update({
            status: 'rejected',
            rejectedAt: firestore_1.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'Trade rejected successfully'
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error rejecting trade:', error);
        return {
            success: false,
            message: 'Failed to reject trade'
        };
    }
}
/**
 * Create counter offer on behalf of AI colony
 */
async function createCounterOffer(db, sessionId, originalTradeId, aiColonyId, originalTradeData, counterOffer) {
    const batch = db.batch();
    try {
        // Reject original trade
        const originalTradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(originalTradeId);
        batch.update(originalTradeRef, {
            status: 'rejected',
            rejectedAt: firestore_1.FieldValue.serverTimestamp(),
            rejectionReason: 'counter_offer_made'
        });
        // Create new counter trade
        const newTradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newTradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(newTradeId);
        const counterTradeData = {
            id: newTradeId,
            initiatorId: aiColonyId,
            targetId: originalTradeData.initiatorId,
            offerResources: counterOffer.offerResources,
            requestResources: counterOffer.requestResources,
            status: 'pending',
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            negotiationHistory: [{
                    playerId: aiColonyId,
                    action: 'counter_offer',
                    resources: {
                        offer: counterOffer.offerResources,
                        request: counterOffer.requestResources
                    },
                    timestamp: firestore_1.FieldValue.serverTimestamp()
                }],
            originalTradeId: originalTradeId
        };
        batch.set(newTradeRef, counterTradeData);
        await batch.commit();
        return {
            success: true,
            message: 'Counter offer created successfully',
            tradeId: newTradeId
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error creating counter offer:', error);
        return {
            success: false,
            message: 'Failed to create counter offer'
        };
    }
}
/**
 * Validate that a colony has the required resources
 */
function validateResourceAvailability(colony, requestedResources) {
    for (const [resource, amount] of Object.entries(requestedResources)) {
        if (typeof amount !== 'number')
            continue;
        const currentAmount = colony.resources[resource];
        if (typeof currentAmount !== 'number' || currentAmount < amount) {
            return false;
        }
    }
    return true;
}
/**
 * Update colony resources after a trade
 */
function updateColonyResources(colony, gained, lost) {
    const updatedResources = Object.assign({}, colony.resources);
    // Add gained resources
    for (const [resource, amount] of Object.entries(gained)) {
        if (typeof amount === 'number') {
            updatedResources[resource] = (updatedResources[resource] || 0) + amount;
        }
    }
    // Subtract lost resources
    for (const [resource, amount] of Object.entries(lost)) {
        if (typeof amount === 'number') {
            updatedResources[resource] = Math.max(0, (updatedResources[resource] || 0) - amount);
        }
    }
    return Object.assign(Object.assign({}, colony), { resources: updatedResources });
}
/**
 * Log AI trade action for analytics
 */
async function logAITradeAction(db, sessionId, aiColonyId, action, tradeId, success) {
    try {
        const logRef = db.collection('aiTradeLogs').doc();
        await logRef.set({
            sessionId,
            aiColonyId,
            action,
            tradeId,
            success,
            timestamp: firestore_1.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        firebase_functions_1.logger.warn('Failed to log AI trade action:', error);
        // Don't throw - logging failure shouldn't fail the trade
    }
}
//# sourceMappingURL=executeAITrade.js.map