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
exports.rateLimitConfigs = exports.checkRateLimit = void 0;
const admin = __importStar(require("firebase-admin"));
const defaultConfig = {
    windowMs: 60000,
    maxRequests: 100
};
async function checkRateLimit(userId, action, config = defaultConfig) {
    const db = admin.firestore();
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const rateLimitRef = db.collection('rateLimits').doc(`${userId}_${action}`);
    try {
        const result = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(rateLimitRef);
            const data = doc.data();
            if (!data) {
                // First request
                transaction.set(rateLimitRef, {
                    requests: [now],
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
                return true;
            }
            // Filter out old requests
            const recentRequests = (data.requests || []).filter((timestamp) => timestamp > windowStart);
            if (recentRequests.length >= config.maxRequests) {
                return false; // Rate limit exceeded
            }
            // Add new request
            recentRequests.push(now);
            transaction.update(rateLimitRef, {
                requests: recentRequests,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
            return true;
        });
        return result;
    }
    catch (error) {
        console.error('Rate limit check failed:', error);
        return true; // Allow on error to prevent blocking
    }
}
exports.checkRateLimit = checkRateLimit;
exports.rateLimitConfigs = {
    trade: {
        windowMs: 60000,
        maxRequests: 10
    },
    intel: {
        windowMs: 300000,
        maxRequests: 20
    },
    investment: {
        windowMs: 600000,
        maxRequests: 5
    }
};
//# sourceMappingURL=rateLimit.js.map