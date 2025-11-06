import * as admin from 'firebase-admin';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100
};

export async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig = defaultConfig
): Promise<boolean> {
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
      const recentRequests = (data.requests || []).filter((timestamp: number) => timestamp > windowStart);
      
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
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow on error to prevent blocking
  }
}

export const rateLimitConfigs = {
  trade: {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  },
  intel: {
    windowMs: 300000, // 5 minutes
    maxRequests: 20
  },
  investment: {
    windowMs: 600000, // 10 minutes
    maxRequests: 5
  }
};