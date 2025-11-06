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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTrade = void 0;
const admin = __importStar(require("firebase-admin"));
// import { TRADE_LIMITS } from '../utils/constants';
const rateLimit_1 = require("../utils/rateLimit");
async function validateTrade(data) {
    const { trade, eventId, sessionId, playerId } = data;
    try {
        // Basic structure validation
        if (!trade.initiator || !trade.target || !trade.offer || !trade.request) {
            return { valid: false, reason: 'Invalid trade structure' };
        }
        // Check if teams exist and are in the same session
        const db = admin.firestore();
        const initiatorRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${trade.initiator}`);
        const targetRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${trade.target}`);
        const [initiatorDoc, targetDoc] = await Promise.all([
            initiatorRef.get(),
            targetRef.get()
        ]);
        if (!initiatorDoc.exists) {
            return { valid: false, reason: 'Initiating team not found' };
        }
        if (!targetDoc.exists) {
            return { valid: false, reason: 'Target team not found' };
        }
        const initiatorData = initiatorDoc.data();
        const targetData = targetDoc.data();
        // Check if teams are eliminated
        if (initiatorData.isEliminated) {
            return { valid: false, reason: 'Initiating team is eliminated' };
        }
        if (targetData.isEliminated) {
            return { valid: false, reason: 'Target team is eliminated' };
        }
        // Check if initiating team has enough resources
        const resourceValidation = validateResourceAvailability(initiatorData.resources, trade.offer);
        if (!resourceValidation.valid) {
            return resourceValidation;
        }
        // Check intel availability
        const intelValidation = await validateIntelAvailability(initiatorData.intel, trade.offer.intel || [], sessionId);
        if (!intelValidation.valid) {
            return intelValidation;
        }
        // Check rate limiting if playerId provided
        if (playerId) {
            const rateLimitCheck = await (0, rateLimit_1.checkRateLimit)(playerId, 'trade');
            if (!rateLimitCheck) {
                return { valid: false, reason: 'Rate limit exceeded' };
            }
        }
        // Check session state - ensure it's in an active trading round
        const sessionRef = db.doc(`events/${eventId}/sessions/${sessionId}`);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            return { valid: false, reason: 'Session not found' };
        }
        const sessionData = sessionDoc.data();
        const tradingPhases = ['round_1', 'round_2', 'round_3', 'round_4', 'round_5'];
        if (!tradingPhases.includes(sessionData.currentPhase)) {
            return { valid: false, reason: 'Trading not allowed in current phase' };
        }
        // Check if round has time remaining
        if (sessionData.roundEndTime && sessionData.roundEndTime < Date.now()) {
            return { valid: false, reason: 'Round has ended' };
        }
        // Validate trade terms are reasonable (not giving away everything for nothing)
        const fairnessValidation = validateTradeFairness(trade.offer, trade.request);
        if (!fairnessValidation.valid) {
            return fairnessValidation;
        }
        return { valid: true };
    }
    catch (error) {
        console.error('Error validating trade:', error);
        return { valid: false, reason: 'Internal validation error' };
    }
}
exports.validateTrade = validateTrade;
function validateResourceAvailability(teamResources, offerResources) {
    for (const [resource, amount] of Object.entries(offerResources)) {
        if (resource === 'intel')
            continue; // Skip intel, handled separately
        const available = teamResources[resource] || 0;
        const requested = amount;
        if (available < requested) {
            return {
                valid: false,
                reason: `Insufficient ${resource}: have ${available}, need ${requested}`
            };
        }
    }
    return { valid: true };
}
async function validateIntelAvailability(teamIntel, offerIntel, sessionId) {
    if (!offerIntel || offerIntel.length === 0) {
        return { valid: true };
    }
    // Check if team actually has the intel they're offering
    for (const intelId of offerIntel) {
        if (!teamIntel.includes(intelId)) {
            return { valid: false, reason: `Team does not possess intel: ${intelId}` };
        }
    }
    // Validate intel pieces exist and are still valuable
    const db = admin.firestore();
    const intelPromises = offerIntel.map(intelId => db.doc(`events/${sessionId.substring(0, 2)}/sessions/${sessionId}/intel/${intelId}`).get());
    const intelDocs = await Promise.all(intelPromises);
    for (const doc of intelDocs) {
        if (!doc.exists) {
            return { valid: false, reason: 'Intel piece not found' };
        }
        const intel = doc.data();
        if (intel.expiresAt && intel.expiresAt < Date.now()) {
            return { valid: false, reason: 'Intel has expired' };
        }
    }
    return { valid: true };
}
function validateTradeFairness(offer, request) {
    // Calculate rough value of offer vs request
    const offerValue = calculateResourceValue(offer);
    const requestValue = calculateResourceValue(request);
    // Prevent obviously unfair trades (e.g., giving 1000 credits for 1 food)
    const ratio = offerValue > 0 ? requestValue / offerValue : 0;
    if (ratio > 10 || ratio < 0.1) {
        return {
            valid: false,
            reason: 'Trade appears extremely unbalanced',
            details: { offerValue, requestValue, ratio }
        };
    }
    return { valid: true };
}
function calculateResourceValue(resources) {
    // Basic resource values for fairness checking
    const values = {
        oxygen: 2,
        food: 2,
        water: 3,
        energy: 1,
        minerals: 4,
        alloys: 8,
        tech_components: 6,
        defense: 5,
        production: 5,
        tech: 7,
        credits: 1
    };
    let totalValue = 0;
    for (const [resource, amount] of Object.entries(resources)) {
        if (resource === 'intel') {
            // Intel has variable value, assume average of 50 per piece
            totalValue += amount.length * 50;
        }
        else {
            const unitValue = values[resource] || 1;
            totalValue += unitValue * amount;
        }
    }
    return totalValue;
}
//# sourceMappingURL=validateTrade.js.map