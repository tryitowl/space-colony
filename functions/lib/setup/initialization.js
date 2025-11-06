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
exports.initializeSession = exports.initializeEvent = void 0;
const admin = __importStar(require("firebase-admin"));
async function initializeEvent(eventData) {
    const db = admin.firestore();
    const event = Object.assign(Object.assign({}, eventData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), settings: Object.assign({ maxTeams: 20, maxPlayersPerTeam: 6, roundDuration: 600, tradingEnabled: true, alienContactRound: 3 }, eventData.settings) });
    const eventRef = await db.collection('events').add(event);
    return eventRef.id;
}
exports.initializeEvent = initializeEvent;
async function initializeSession(eventId, sessionData) {
    const db = admin.firestore();
    // Generate unique game code
    const gameCode = generateGameCode();
    const session = Object.assign(Object.assign({}, sessionData), { eventId,
        gameCode, isActive: false, currentPhase: 'setup', currentRound: 0, phaseConfig: Object.assign({ instructions: 300, investment: 600, round_1: 600, round_2: 600, milestone: 300, round_3: 600, round_4: 600, round_5: 600 }, sessionData.phaseConfig), createdAt: admin.firestore.FieldValue.serverTimestamp() });
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
exports.initializeSession = initializeSession;
function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
//# sourceMappingURL=initialization.js.map