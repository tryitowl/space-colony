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
exports.logSessionAudit = exports.logTradeAudit = exports.logAudit = void 0;
const admin = __importStar(require("firebase-admin"));
async function logAudit(entry) {
    try {
        const db = admin.firestore();
        await db.collection('auditLogs').add(Object.assign(Object.assign({}, entry), { timestamp: entry.timestamp || admin.firestore.FieldValue.serverTimestamp() }));
    }
    catch (error) {
        console.error('Failed to log audit entry:', error);
    }
}
exports.logAudit = logAudit;
async function logTradeAudit(sessionId, tradeId, action, details) {
    await logAudit({
        action: `trade.${action}`,
        sessionId,
        details: Object.assign({ tradeId }, details),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}
exports.logTradeAudit = logTradeAudit;
async function logSessionAudit(eventId, sessionId, action, details) {
    await logAudit({
        action: `session.${action}`,
        eventId,
        sessionId,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}
exports.logSessionAudit = logSessionAudit;
//# sourceMappingURL=audit.js.map