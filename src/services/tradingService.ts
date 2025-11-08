import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { AuthService } from './authService';
import type { TradeOffer, Resources, Colony, TradeNegotiation, IntelItem } from '../types';
import { RESOURCE_VALUES, CRITICAL_RESOURCE_THRESHOLDS } from '../constants/resourceValues';

export class TradingService {
  // Create a new trade offer (enhanced with intel)
  static async createTradeOffer(
    sessionId: string,
    initiatorTeamId: string,
    targetTeamId: string,
    offerResources: Partial<Resources>,
    requestResources: Partial<Resources>,
    offerIntel?: IntelItem[],
    requestIntel?: IntelItem[]
  ): Promise<string> {
    // Ensure user is authenticated
    await AuthService.ensureAuthenticated();
    
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tradeOffer: TradeOffer = {
      id: tradeId,
      initiatorId: initiatorTeamId,
      targetId: targetTeamId,
      offerResources,
      requestResources,
      offerIntel: offerIntel || [],
      requestIntel: requestIntel || [],
      status: 'pending',
      timestamp: Date.now(),
      expiresAt: Date.now() + (3 * 60 * 1000), // 3 minutes
      negotiationHistory: [{
        playerId: initiatorTeamId,
        action: 'offer',
        resources: {
          offer: offerResources,
          request: requestResources
        },
        intel: {
          offer: offerIntel || [],
          request: requestIntel || []
        },
        timestamp: Date.now()
      }]
    };

    // Save to Firestore
    await setDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId), tradeOffer);

    // Update real-time trading status
    await this.updateTradingStatus(sessionId, initiatorTeamId, 'busy');
    await this.updateTradingStatus(sessionId, targetTeamId, 'busy');

    // Set up auto-expiration
    setTimeout(async () => {
      await this.expireTradeOffer(sessionId, tradeId);
    }, 3 * 60 * 1000);

    return tradeId;
  }

  // Update trading status in real-time database
  private static async updateTradingStatus(
    sessionId: string, 
    teamId: string, 
    status: 'available' | 'busy' | 'offline'
  ) {
    try {
      const statusRef = ref(realtimeDb, `sessions/${sessionId}/live/availableTeams/${teamId}`);
      await set(statusRef, status);
    } catch (error) {
      console.warn('Realtime Database not available for trading status update:', error);
      // Continue without real-time status updates
    }
  }

  // Accept a trade offer
  static async acceptTradeOffer(
    sessionId: string,
    tradeId: string,
    acceptingTeamId: string
  ): Promise<boolean> {
    try {
      const tradeRef = doc(firestore, 'sessions', sessionId, 'trades', tradeId);
      
      // Update trade status
      await updateDoc(tradeRef, {
        status: 'accepted',
        'negotiationHistory': [...await this.getTradeHistory(sessionId, tradeId), {
          playerId: acceptingTeamId,
          action: 'accept',
          resources: {},
          timestamp: Date.now()
        }]
      });

      // Execute the trade (update resources)
      await this.executeTrade(sessionId, tradeId);
      
      return true;
    } catch (error) {
      console.error('Failed to accept trade:', error);
      return false;
    }
  }

  // Counter-offer on a trade
  static async createCounterOffer(
    sessionId: string,
    tradeId: string,
    counteringTeamId: string,
    newOfferResources: Partial<Resources>,
    newRequestResources: Partial<Resources>,
    newOfferIntel?: IntelItem[],
    newRequestIntel?: IntelItem[]
  ): Promise<boolean> {
    try {
      const tradeRef = doc(firestore, 'sessions', sessionId, 'trades', tradeId);
      const history = await this.getTradeHistory(sessionId, tradeId);
      
      // Check if we've reached the counter-offer limit (3 per team)
      const teamCounterOffers = history.filter(
        h => h.playerId === counteringTeamId && h.action === 'counter_offer'
      );
      
      if (teamCounterOffers.length >= 3) {
        throw new Error('Maximum counter-offers reached');
      }

      await updateDoc(tradeRef, {
        status: 'counter_offered',
        offerResources: newOfferResources,
        requestResources: newRequestResources,
        offerIntel: newOfferIntel || [],
        requestIntel: newRequestIntel || [],
        expiresAt: Date.now() + (3 * 60 * 1000), // Reset timer
        'negotiationHistory': [...history, {
          playerId: counteringTeamId,
          action: 'counter_offer',
          resources: {
            offer: newOfferResources,
            request: newRequestResources
          },
          intel: {
            offer: newOfferIntel || [],
            request: newRequestIntel || []
          },
          timestamp: Date.now()
        }]
      });

      return true;
    } catch (error) {
      console.error('Failed to create counter-offer:', error);
      return false;
    }
  }

  // Reject a trade offer
  static async rejectTradeOffer(
    sessionId: string,
    tradeId: string,
    rejectingTeamId: string
  ): Promise<void> {
    const tradeRef = doc(firestore, 'sessions', sessionId, 'trades', tradeId);
    const history = await this.getTradeHistory(sessionId, tradeId);
    
    await updateDoc(tradeRef, {
      status: 'rejected',
      'negotiationHistory': [...history, {
        playerId: rejectingTeamId,
        action: 'reject',
        resources: {},
        timestamp: Date.now()
      }]
    });

    // Free up both teams for new trades
    const trade = await this.getTradeOffer(sessionId, tradeId);
    if (trade) {
      await this.updateTradingStatus(sessionId, trade.initiatorId, 'available');
      await this.updateTradingStatus(sessionId, trade.targetId, 'available');
    }
  }

  // Execute a trade (update team resources)
  private static async executeTrade(sessionId: string, tradeId: string): Promise<void> {
    const trade = await this.getTradeOffer(sessionId, tradeId);
    if (!trade || trade.status !== 'accepted') {
      throw new Error('Trade not found or not in accepted state');
    }

    try {
      // Use Firestore transaction to ensure atomicity
      await runTransaction(firestore, async (transaction: import('firebase/firestore').Transaction) => {
        // Get the session document to find teams
        const sessionRef = doc(firestore, 'sessions', sessionId);
        const sessionDoc = await transaction.get(sessionRef);
        
        if (!sessionDoc.exists()) {
          throw new Error('Session not found');
        }

        const sessionData = sessionDoc.data();
        const teams = sessionData.teams || [];
        
        // Find initiator and target teams
        const initiatorTeamIndex = teams.findIndex((t: Colony) => t.id === trade.initiatorId);
        const targetTeamIndex = teams.findIndex((t: Colony) => t.id === trade.targetId);
        
        if (initiatorTeamIndex === -1 || targetTeamIndex === -1) {
          throw new Error('One or both teams not found');
        }

        const initiatorTeam = teams[initiatorTeamIndex] as Colony;
        const targetTeam = teams[targetTeamIndex] as Colony;

        // Validate resources before transfer
        const initiatorValidation = this.validateTradeResources(initiatorTeam.resources, trade.offerResources);
        const targetValidation = this.validateTradeResources(targetTeam.resources, trade.requestResources);

        if (!initiatorValidation.valid) {
          throw new Error(`Initiator lacks resources: ${initiatorValidation.missingResources.join(', ')}`);
        }
        if (!targetValidation.valid) {
          throw new Error(`Target lacks resources: ${targetValidation.missingResources.join(', ')}`);
        }

        // Validate intel ownership
        if (trade.offerIntel && trade.offerIntel.length > 0) {
          const initiatorIntel = initiatorTeam.resources.intel || [];
          const hasAllIntel = trade.offerIntel.every(offeredIntel => 
            initiatorIntel.some(teamIntel => teamIntel.id === offeredIntel.id)
          );
          if (!hasAllIntel) {
            throw new Error('Initiator does not own all offered intel');
          }
        }

        if (trade.requestIntel && trade.requestIntel.length > 0) {
          const targetIntel = targetTeam.resources.intel || [];
          const hasAllIntel = trade.requestIntel.every(requestedIntel => 
            targetIntel.some(teamIntel => teamIntel.id === requestedIntel.id)
          );
          if (!hasAllIntel) {
            throw new Error('Target does not own all requested intel');
          }
        }

        // Perform resource transfers
        // Transfer resources from initiator to target
        Object.entries(trade.offerResources).forEach(([resource, amount]) => {
          if (typeof amount === 'number' && amount > 0) {
            const key = resource as keyof Resources;
            if (typeof initiatorTeam.resources[key] === 'number' && typeof targetTeam.resources[key] === 'number') {
              (initiatorTeam.resources[key] as number) -= amount;
              (targetTeam.resources[key] as number) += amount;
            }
          }
        });

        // Transfer resources from target to initiator
        Object.entries(trade.requestResources).forEach(([resource, amount]) => {
          if (typeof amount === 'number' && amount > 0) {
            const key = resource as keyof Resources;
            if (typeof targetTeam.resources[key] === 'number' && typeof initiatorTeam.resources[key] === 'number') {
              (targetTeam.resources[key] as number) -= amount;
              (initiatorTeam.resources[key] as number) += amount;
            }
          }
        });

        // Transfer intel
        if (trade.offerIntel && trade.offerIntel.length > 0) {
          const initiatorIntel = initiatorTeam.resources.intel || [];
          const targetIntel = targetTeam.resources.intel || [];
          
          trade.offerIntel.forEach(offeredIntel => {
            // Remove from initiator
            const index = initiatorIntel.findIndex(item => item.id === offeredIntel.id);
            if (index !== -1) {
              const [transferredIntel] = initiatorIntel.splice(index, 1);
              // Update distribution count
              transferredIntel.distributionCount = (transferredIntel.distributionCount || 0) + 1;
              // Add to target
              targetIntel.push(transferredIntel);
            }
          });
          
          initiatorTeam.resources.intel = initiatorIntel;
          targetTeam.resources.intel = targetIntel;
        }

        if (trade.requestIntel && trade.requestIntel.length > 0) {
          const initiatorIntel = initiatorTeam.resources.intel || [];
          const targetIntel = targetTeam.resources.intel || [];
          
          trade.requestIntel.forEach(requestedIntel => {
            // Remove from target
            const index = targetIntel.findIndex(item => item.id === requestedIntel.id);
            if (index !== -1) {
              const [transferredIntel] = targetIntel.splice(index, 1);
              // Update distribution count
              transferredIntel.distributionCount = (transferredIntel.distributionCount || 0) + 1;
              // Add to initiator
              initiatorIntel.push(transferredIntel);
            }
          });
          
          initiatorTeam.resources.intel = initiatorIntel;
          targetTeam.resources.intel = targetIntel;
        }

        // Update teams in session
        teams[initiatorTeamIndex] = initiatorTeam;
        teams[targetTeamIndex] = targetTeam;

        // Update the session document with modified teams
        transaction.update(sessionRef, { teams });

        // Update trade status to completed
        const tradeRef = doc(firestore, 'sessions', sessionId, 'trades', tradeId);
        transaction.update(tradeRef, { 
          status: 'completed',
          completedAt: Date.now()
        });

        // Log the trade for analytics
        const analyticsRef = doc(collection(firestore, 'sessions', sessionId, 'analytics'));
        transaction.set(analyticsRef, {
          type: 'trade_completed',
          tradeId,
          initiatorId: trade.initiatorId,
          targetId: trade.targetId,
          offerResources: trade.offerResources,
          requestResources: trade.requestResources,
          offerIntel: trade.offerIntel?.length || 0,
          requestIntel: trade.requestIntel?.length || 0,
          timestamp: Date.now()
        });
      });

      // Update trading status after successful transaction
      await this.updateTradingStatus(sessionId, trade.initiatorId, 'available');
      await this.updateTradingStatus(sessionId, trade.targetId, 'available');

    } catch (error) {
      console.error('Failed to execute trade:', error);
      // Reset trading status on error
      await this.updateTradingStatus(sessionId, trade.initiatorId, 'available');
      await this.updateTradingStatus(sessionId, trade.targetId, 'available');
      throw error;
    }
  }

  // Expire a trade offer automatically
  private static async expireTradeOffer(sessionId: string, tradeId: string): Promise<void> {
    try {
      const trade = await this.getTradeOffer(sessionId, tradeId);
      
      if (trade && trade.status === 'pending') {
        await updateDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId), {
          status: 'expired'
        });

        // Free up both teams
        await this.updateTradingStatus(sessionId, trade.initiatorId, 'available');
        await this.updateTradingStatus(sessionId, trade.targetId, 'available');
      }
    } catch (error) {
      console.error('Failed to expire trade:', error);
    }
  }

  // Get available teams for trading
  static async getAvailableTeams(sessionId: string, currentTeamId: string): Promise<Colony[]> {
    try {
      // Get the session document
      const sessionRef = doc(firestore, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        console.error('Session not found');
        return [];
      }

      const sessionData = sessionSnap.data();
      const teams = sessionData.teams || [];
      
      // Filter out teams that are not available for trading
      const availableTeams = teams.filter((team: Colony) => {
        // Don't include current team
        if (team.id === currentTeamId) return false;
        
        // Don't include eliminated teams
        if (team.eliminationStatus?.isEliminated) return false;
        
        // Don't include teams in critical mode (if they have very low resources)
        const isCritical = Object.entries(CRITICAL_RESOURCE_THRESHOLDS).some(([resource, threshold]) => {
          const amount = team.resources[resource as keyof Resources];
          return typeof amount === 'number' && amount < threshold;
        });
        if (isCritical) return false;
        
        // Include AI teams if they're configured to trade
        // All other checks passed
        return true;
      });

      // Get real-time trading status from Realtime Database
      try {
        const statusRef = ref(realtimeDb, `sessions/${sessionId}/live/availableTeams`);
        const snapshot = await new Promise<any>((resolve) => {
          onValue(statusRef, (snap) => {
            resolve(snap.val());
            off(statusRef); // Clean up listener
          }, { onlyOnce: true });
        });

        if (snapshot) {
          // Filter teams based on real-time availability
          return availableTeams.filter((team: Colony) => 
            snapshot[team.id] === 'available'
          );
        }
      } catch (error) {
        console.warn('Could not get real-time status, using basic filtering:', error);
      }

      return availableTeams;
    } catch (error) {
      console.error('Failed to get available teams:', error);
      return [];
    }
  }

  // Subscribe to trade offers for a team
  static subscribeToTeamTrades(
    sessionId: string,
    teamId: string,
    callback: (trades: TradeOffer[]) => void
  ): () => void {
    const tradesQuery = query(
      collection(firestore, 'sessions', sessionId, 'trades'),
      where('targetId', '==', teamId)
    );

    const unsubscribe = onSnapshot(tradesQuery, (snapshot) => {
      const trades = snapshot.docs.map(doc => doc.data() as TradeOffer);
      callback(trades.filter(trade => 
        trade.status === 'pending' || 
        trade.status === 'counter_offered'
      ));
    });

    return unsubscribe;
  }

  // Subscribe to real-time trading status
  static subscribeToTradingStatus(
    sessionId: string,
    callback: (availableTeams: Record<string, string>) => void
  ): () => void {
    const statusRef = ref(realtimeDb, `sessions/${sessionId}/live/availableTeams`);
    
    onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });

    return () => off(statusRef);
  }

  // Get trade offer details
  private static async getTradeOffer(sessionId: string, tradeId: string): Promise<TradeOffer | null> {
    try {
      const docSnap = await getDocs(query(collection(firestore, 'sessions', sessionId, 'trades')));
      const tradeDoc = docSnap.docs.find(d => d.id === tradeId);
      return tradeDoc ? tradeDoc.data() as TradeOffer : null;
    } catch (error) {
      console.error('Failed to get trade offer:', error);
      return null;
    }
  }

  // Get trade negotiation history
  private static async getTradeHistory(sessionId: string, tradeId: string): Promise<TradeNegotiation[]> {
    const trade = await this.getTradeOffer(sessionId, tradeId);
    return trade?.negotiationHistory || [];
  }

  // Validate trade resources
  static validateTradeResources(
    teamResources: Resources,
    offerResources: Partial<Resources>
  ): { valid: boolean; missingResources: string[] } {
    const missingResources: string[] = [];
    
    Object.entries(offerResources).forEach(([resource, amount]) => {
      if (typeof amount === 'number' && amount > 0) {
        const currentAmount = teamResources[resource as keyof Resources];
        if (typeof currentAmount === 'number' && currentAmount < amount) {
          missingResources.push(resource);
        }
      }
    });

    return {
      valid: missingResources.length === 0,
      missingResources
    };
  }

  // Calculate trade value/benefit (enhanced with intel)
  static calculateTradeValue(
    offerResources: Partial<Resources>,
    requestResources: Partial<Resources>,
    offerIntel?: IntelItem[],
    requestIntel?: IntelItem[]
  ): { offerValue: number; requestValue: number; benefit: number; intelOfferValue: number; intelRequestValue: number } {
    const calculateValue = (resources: Partial<Resources>): number => {
      return Object.entries(resources).reduce((total, [resource, amount]) => {
        if (typeof amount === 'number') {
          return total + (amount * (RESOURCE_VALUES[resource] || 1));
        }
        return total;
      }, 0);
    };

    const calculateIntelValue = (intel: IntelItem[] = []): number => {
      return intel.reduce((total, item) => {
        // Intel value decreases with distribution count
        const distributionPenalty = Math.floor(item.distributionCount * 0.2);
        const adjustedValue = Math.max(10, item.value - (item.value * distributionPenalty));
        return total + adjustedValue;
      }, 0);
    };

    const offerValue = calculateValue(offerResources);
    const requestValue = calculateValue(requestResources);
    const intelOfferValue = calculateIntelValue(offerIntel);
    const intelRequestValue = calculateIntelValue(requestIntel);
    
    const totalOfferValue = offerValue + intelOfferValue;
    const totalRequestValue = requestValue + intelRequestValue;
    const benefit = totalRequestValue - totalOfferValue;

    return { 
      offerValue, 
      requestValue, 
      benefit, 
      intelOfferValue, 
      intelRequestValue 
    };
  }
}