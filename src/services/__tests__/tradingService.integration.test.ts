import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  terminate
} from 'firebase/firestore';
import { TradingService } from '../tradingService';
import { MultiPlayerTradingService } from '../multiPlayerTradingService';
import type { GameSession, Colony, TradeOffer } from '../../types';

// Skip if not running integration tests
const SKIP_INTEGRATION = !process.env.RUN_INTEGRATION_TESTS;

describe.skipIf(SKIP_INTEGRATION)('TradingService Integration Tests', () => {
  let app: any;
  let firestore: any;
  let sessionId: string;
  let team1Id: string;
  let team2Id: string;

  beforeEach(async () => {
    // Initialize test app
    app = initializeApp({
      projectId: 'test-project',
      apiKey: 'test-key'
    }, 'test-app-' + Date.now());
    
    firestore = getFirestore(app);
    
    // Connect to emulator if running locally
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }

    // Set up test data
    sessionId = `test-session-${Date.now()}`;
    team1Id = `team1-${Date.now()}`;
    team2Id = `team2-${Date.now()}`;

    // Create test session
    const testSession: GameSession = {
      id: sessionId,
      eventId: 'test-event',
      currentRound: 1,
      teams: [
        {
          id: team1Id,
          name: 'Mining Colony',
          type: 'mining',
          resources: {
            oxygen: 20,
            food: 15,
            water: 10,
            energy: 25,
            minerals: 30,
            alloys: 10,
            tech: 5,
            alienTech: 0,
            defenseContracts: 1,
            techPatents: 0,
            intel: []
          },
          players: [
            { id: 'player1', name: 'Captain 1', role: 'captain' },
            { id: 'player2', name: 'Crew 1', role: 'crew' }
          ],
          status: 'active'
        },
        {
          id: team2Id,
          name: 'Agricultural Colony',
          type: 'agricultural',
          resources: {
            oxygen: 25,
            food: 30,
            water: 20,
            energy: 15,
            minerals: 10,
            alloys: 5,
            tech: 3,
            alienTech: 0,
            defenseContracts: 0,
            techPatents: 1,
            intel: []
          },
          players: [
            { id: 'player3', name: 'Captain 2', role: 'captain' },
            { id: 'player4', name: 'Crew 2', role: 'crew' }
          ],
          status: 'active'
        }
      ] as Colony[],
      status: 'active',
      gameState: {
        phase: 'trading',
        tradingEnabled: true,
        timeRemaining: 300000
      } as any,
      config: {
        roundDuration: 600000,
        enableAI: false
      } as any,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(firestore, 'sessions', sessionId), testSession);

    // Create teams in root collection
    for (const team of testSession.teams) {
      await setDoc(doc(firestore, 'teams', team.id), {
        ...team,
        sessionId,
        eventId: testSession.eventId
      });
    }
  });

  afterEach(async () => {
    // Clean up
    if (firestore) {
      await terminate(firestore);
    }
    if (app) {
      await deleteApp(app);
    }
  });

  describe('End-to-End Trading Flow', () => {
    it('should complete a full trade cycle', async () => {
      // Step 1: Create trade offer
      const tradeId = await TradingService.createTradeOffer(
        sessionId,
        team1Id,
        team2Id,
        { minerals: 5, alloys: 2 },
        { food: 10, water: 5 },
        { id: 'player1', name: 'Captain 1', role: 'captain' }
      );

      expect(tradeId).toBeTruthy();

      // Step 2: Verify trade was created
      const tradeDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId));
      expect(tradeDoc.exists()).toBe(true);
      
      const trade = tradeDoc.data() as TradeOffer;
      expect(trade.status).toBe('pending');
      expect(trade.offerResources).toEqual({ minerals: 5, alloys: 2 });
      expect(trade.requestResources).toEqual({ food: 10, water: 5 });

      // Step 3: Accept trade
      await TradingService.acceptTradeOffer(sessionId, tradeId, team2Id);

      // Step 4: Verify trade was executed
      const updatedTradeDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId));
      const updatedTrade = updatedTradeDoc.data() as TradeOffer;
      expect(updatedTrade.status).toBe('completed');

      // Step 5: Verify resources were transferred
      const [team1Doc, team2Doc] = await Promise.all([
        getDoc(doc(firestore, 'teams', team1Id)),
        getDoc(doc(firestore, 'teams', team2Id))
      ]);

      const team1Data = team1Doc.data() as Colony;
      const team2Data = team2Doc.data() as Colony;

      // Team 1 should have lost minerals/alloys and gained food/water
      expect(team1Data.resources.minerals).toBe(25); // 30 - 5
      expect(team1Data.resources.alloys).toBe(8);    // 10 - 2
      expect(team1Data.resources.food).toBe(25);     // 15 + 10
      expect(team1Data.resources.water).toBe(15);    // 10 + 5

      // Team 2 should have gained minerals/alloys and lost food/water
      expect(team2Data.resources.minerals).toBe(15); // 10 + 5
      expect(team2Data.resources.alloys).toBe(7);    // 5 + 2
      expect(team2Data.resources.food).toBe(20);     // 30 - 10
      expect(team2Data.resources.water).toBe(15);    // 20 - 5
    });

    it('should handle counter-offers correctly', async () => {
      // Step 1: Create initial offer
      const tradeId = await TradingService.createTradeOffer(
        sessionId,
        team1Id,
        team2Id,
        { minerals: 10 },
        { food: 20 },
        { id: 'player1', name: 'Captain 1', role: 'captain' }
      );

      // Step 2: Create counter-offer
      const counterOfferId = await TradingService.createCounterOffer(
        sessionId,
        tradeId,
        team2Id,
        { minerals: 5 },    // Less minerals
        { food: 20 },       // Same food
        { id: 'player3', name: 'Captain 2', role: 'captain' }
      );

      expect(counterOfferId).toBeTruthy();
      expect(counterOfferId).not.toBe(tradeId);

      // Step 3: Verify counter-offer details
      const counterOfferDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'trades', counterOfferId));
      const counterOffer = counterOfferDoc.data() as TradeOffer;
      
      expect(counterOffer.isCounterOffer).toBe(true);
      expect(counterOffer.originalTradeId).toBe(tradeId);
      expect(counterOffer.initiatorId).toBe(team2Id);
      expect(counterOffer.targetId).toBe(team1Id);

      // Step 4: Accept counter-offer
      await TradingService.acceptTradeOffer(sessionId, counterOfferId, team1Id);

      // Step 5: Verify original trade was rejected
      const originalTradeDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'trades', tradeId));
      expect(originalTradeDoc.data()?.status).toBe('rejected');

      // Step 6: Verify counter-offer was completed
      const completedCounterDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'trades', counterOfferId));
      expect(completedCounterDoc.data()?.status).toBe('completed');
    });

    it('should handle multi-player trade decisions', async () => {
      // Step 1: Create trade requiring team approval
      const tradeId = await MultiPlayerTradingService.createTradeOfferWithApproval(
        sessionId,
        team1Id,
        team2Id,
        { minerals: 15, tech: 2 },
        { energy: 10, defenseContracts: 1 },
        { id: 'player2', name: 'Crew 1', role: 'crew' }, // Crew member
        180000 // 3 minute timeout
      );

      // Step 2: Verify decision document was created
      const decisionsQuery = query(
        collection(firestore, 'sessions', sessionId, 'tradeDecisions'),
        where('initiatorTeamId', '==', team1Id)
      );
      const decisionsSnapshot = await getDocs(decisionsQuery);
      expect(decisionsSnapshot.size).toBe(1);

      const decisionDoc = decisionsSnapshot.docs[0];
      const decisionId = decisionDoc.id;
      const decisionData = decisionDoc.data();

      expect(decisionData.status).toBe('pending');
      expect(decisionData.requiredApprovals).toBe(2); // Both team members

      // Step 3: Add team member approvals
      await MultiPlayerTradingService.voteOnTrade(
        sessionId,
        decisionId,
        'player1',
        true
      );

      await MultiPlayerTradingService.voteOnTrade(
        sessionId,
        decisionId,
        'player2',
        true
      );

      // Step 4: Wait for trade to be created
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 5: Verify trade was created after approval
      const tradesQuery = query(
        collection(firestore, 'sessions', sessionId, 'trades'),
        where('initiatorId', '==', team1Id),
        where('targetId', '==', team2Id)
      );
      const tradesSnapshot = await getDocs(tradesQuery);
      expect(tradesSnapshot.size).toBeGreaterThan(0);
    });

    it('should prevent trading when resources are insufficient', async () => {
      // Try to offer more than available
      await expect(
        TradingService.createTradeOffer(
          sessionId,
          team1Id,
          team2Id,
          { minerals: 100 }, // Team only has 30
          { food: 5 },
          { id: 'player1', name: 'Captain 1', role: 'captain' }
        )
      ).rejects.toThrow();
    });

    it('should handle concurrent trades without race conditions', async () => {
      // Create multiple trades simultaneously
      const tradePromises = [];
      
      for (let i = 0; i < 5; i++) {
        tradePromises.push(
          TradingService.createTradeOffer(
            sessionId,
            team1Id,
            team2Id,
            { minerals: 1 },
            { food: 2 },
            { id: 'player1', name: 'Captain 1', role: 'captain' }
          )
        );
      }

      const tradeIds = await Promise.all(tradePromises);
      expect(tradeIds).toHaveLength(5);
      expect(new Set(tradeIds).size).toBe(5); // All unique

      // Accept all trades concurrently
      const acceptPromises = tradeIds.map(id => 
        TradingService.acceptTradeOffer(sessionId, id, team2Id)
      );

      await Promise.all(acceptPromises);

      // Verify final resource state is correct
      const [team1Final, team2Final] = await Promise.all([
        getDoc(doc(firestore, 'teams', team1Id)),
        getDoc(doc(firestore, 'teams', team2Id))
      ]);

      const team1Resources = team1Final.data()?.resources;
      const team2Resources = team2Final.data()?.resources;

      // Team 1: Started with 30 minerals, traded 5 (1x5)
      expect(team1Resources.minerals).toBe(25);
      // Team 1: Started with 15 food, gained 10 (2x5)  
      expect(team1Resources.food).toBe(25);

      // Team 2: Started with 10 minerals, gained 5 (1x5)
      expect(team2Resources.minerals).toBe(15);
      // Team 2: Started with 30 food, lost 10 (2x5)
      expect(team2Resources.food).toBe(20);
    });
  });
});
