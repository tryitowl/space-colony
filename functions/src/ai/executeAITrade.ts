import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import type { GameSession, AIColonyConfig, TradeOffer, Resources, Colony } from '../types';

interface ExecuteAITradeRequest {
  sessionId: string;
  tradeId: string;
  aiColonyId: string;
  action: 'accept' | 'reject' | 'counter';
  counterOffer?: {
    offerResources: Record<string, number>;
    requestResources: Record<string, number>;
  };
}

interface ExecuteAITradeResponse {
  success: boolean;
  message: string;
  tradeId?: string;
}

/**
 * Firebase Function to execute AI trading decisions
 * This ensures all AI trades are validated server-side
 */
export const executeAITrade = onCall<ExecuteAITradeRequest, Promise<ExecuteAITradeResponse>>(
  { region: 'us-central1' },
  async (request) => {
    const { sessionId, tradeId, aiColonyId, action, counterOffer } = request.data;

    if (!sessionId || !tradeId || !aiColonyId || !action) {
      throw new HttpsError('invalid-argument', 'Missing required parameters');
    }

    const db = getFirestore();

    try {
      // Get session data
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', 'Session not found');
      }

      const sessionData = sessionDoc.data();
      
      // Verify AI is configured for this session
      if (!sessionData?.aiConfigs || sessionData.aiConfigs.length === 0) {
        throw new HttpsError('failed-precondition', 'No AI configuration found for session');
      }

      // Verify this colony is AI-controlled
      const aiConfig = sessionData.aiConfigs.find((config: AIColonyConfig) => config.colonyId === aiColonyId);
      if (!aiConfig || !aiConfig.isAIControlled) {
        throw new HttpsError('permission-denied', 'Colony is not AI-controlled');
      }

      // Get trade data
      const tradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(tradeId);
      const tradeDoc = await tradeRef.get();

      if (!tradeDoc.exists) {
        throw new HttpsError('not-found', 'Trade not found');
      }

      const tradeData = tradeDoc.data();

      // Verify the AI colony is the target of this trade
      if (tradeData?.targetId !== aiColonyId) {
        throw new HttpsError('permission-denied', 'AI colony is not the target of this trade');
      }

      // Verify trade is still pending
      if (tradeData?.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'Trade is no longer pending');
      }

      let result: ExecuteAITradeResponse;

      switch (action) {
        case 'accept':
          result = await acceptTrade(db, sessionId, tradeId, aiColonyId, tradeData);
          break;
        case 'reject':
          result = await rejectTrade(db, sessionId, tradeId);
          break;
        case 'counter':
          if (!counterOffer) {
            throw new HttpsError('invalid-argument', 'Counter offer required for counter action');
          }
          result = await createCounterOffer(db, sessionId, tradeId, aiColonyId, tradeData, counterOffer);
          break;
        default:
          throw new HttpsError('invalid-argument', 'Invalid action');
      }

      // Log AI trade action for analytics
      await logAITradeAction(db, sessionId, aiColonyId, action, tradeId, result.success);

      return result;

    } catch (error) {
      logger.error('Error executing AI trade:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Failed to execute AI trade');
    }
  }
);

/**
 * Accept a trade on behalf of AI colony
 */
async function acceptTrade(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  tradeId: string,
  aiColonyId: string,
  tradeData: TradeOffer
): Promise<ExecuteAITradeResponse> {
  const batch = db.batch();

  try {
    // Update trade status
    const tradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(tradeId);
    batch.update(tradeRef, {
      status: 'accepted',
      acceptedAt: FieldValue.serverTimestamp(),
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
    const initiatorColony = sessionData.teams.find((team: Colony) => team.id === tradeData.initiatorId);
    const targetColony = sessionData.teams.find((team: Colony) => team.id === tradeData.targetId);

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
    const updatedTeams = sessionData.teams.map((team: Colony) => {
      if (team.id === tradeData.initiatorId) {
        return updateColonyResources(team, tradeData.requestResources, tradeData.offerResources);
      } else if (team.id === tradeData.targetId) {
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

  } catch (error) {
    logger.error('Error accepting trade:', error);
    return {
      success: false,
      message: 'Failed to accept trade'
    };
  }
}

/**
 * Reject a trade on behalf of AI colony
 */
async function rejectTrade(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  tradeId: string
): Promise<ExecuteAITradeResponse> {
  try {
    const tradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(tradeId);
    await tradeRef.update({
      status: 'rejected',
      rejectedAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Trade rejected successfully'
    };

  } catch (error) {
    logger.error('Error rejecting trade:', error);
    return {
      success: false,
      message: 'Failed to reject trade'
    };
  }
}

/**
 * Create counter offer on behalf of AI colony
 */
async function createCounterOffer(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  originalTradeId: string,
  aiColonyId: string,
  originalTradeData: TradeOffer,
  counterOffer: { offerResources: Partial<Resources>; requestResources: Partial<Resources> }
): Promise<ExecuteAITradeResponse> {
  const batch = db.batch();

  try {
    // Reject original trade
    const originalTradeRef = db.collection('sessions').doc(sessionId).collection('trades').doc(originalTradeId);
    batch.update(originalTradeRef, {
      status: 'rejected',
      rejectedAt: FieldValue.serverTimestamp(),
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
      timestamp: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      negotiationHistory: [{
        playerId: aiColonyId,
        action: 'counter_offer',
        resources: {
          offer: counterOffer.offerResources,
          request: counterOffer.requestResources
        },
        timestamp: FieldValue.serverTimestamp()
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

  } catch (error) {
    logger.error('Error creating counter offer:', error);
    return {
      success: false,
      message: 'Failed to create counter offer'
    };
  }
}

/**
 * Validate that a colony has the required resources
 */
function validateResourceAvailability(colony: Colony, requestedResources: Partial<Resources>): boolean {
  for (const [resource, amount] of Object.entries(requestedResources)) {
    if (typeof amount !== 'number') continue;
    
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
function updateColonyResources(colony: Colony, gained: Partial<Resources>, lost: Partial<Resources>): Colony {
  const updatedResources = { ...colony.resources };

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

  return {
    ...colony,
    resources: updatedResources
  };
}

/**
 * Log AI trade action for analytics
 */
async function logAITradeAction(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  aiColonyId: string,
  action: string,
  tradeId: string,
  success: boolean
): Promise<void> {
  try {
    const logRef = db.collection('aiTradeLogs').doc();
    await logRef.set({
      sessionId,
      aiColonyId,
      action,
      tradeId,
      success,
      timestamp: FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.warn('Failed to log AI trade action:', error);
    // Don't throw - logging failure shouldn't fail the trade
  }
}