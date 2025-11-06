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
exports.verifyFacilitatorRole = exports.verifyTeamMembership = exports.verifyAuth = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
async function verifyAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    return {
        uid: context.auth.uid
    };
}
exports.verifyAuth = verifyAuth;
async function verifyTeamMembership(uid, teamId, sessionId, eventId) {
    const db = admin.firestore();
    const teamDoc = await db.doc(`events/${eventId}/sessions/${sessionId}/teams/${teamId}`).get();
    if (!teamDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Team not found');
    }
    const teamData = teamDoc.data();
    const isTeamMember = teamData.players.some((player) => player.uid === uid);
    if (!isTeamMember) {
        throw new functions.https.HttpsError('permission-denied', 'User is not a member of this team');
    }
    return true;
}
exports.verifyTeamMembership = verifyTeamMembership;
async function verifyFacilitatorRole(uid, eventId) {
    var _a;
    const db = admin.firestore();
    const eventDoc = await db.doc(`events/${eventId}`).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Event not found');
    }
    const eventData = eventDoc.data();
    const isFacilitator = (_a = eventData.facilitators) === null || _a === void 0 ? void 0 : _a.includes(uid);
    if (!isFacilitator) {
        throw new functions.https.HttpsError('permission-denied', 'User is not a facilitator for this event');
    }
    return true;
}
exports.verifyFacilitatorRole = verifyFacilitatorRole;
//# sourceMappingURL=authentication.js.map