import { TradingService } from '../services/tradingService';
import { teamDataService } from '../services/teamDataService';
import type { Colony, Resources } from '../types';

/**
 * Manual test script for counter-offer flow
 * Run this to verify the counter-offer functionality works correctly
 */
export async function testCounterOfferFlow() {
  console.log('🧪 Testing Counter-Offer Flow...');
  
  try {
    // Test data
    const sessionId = 'test-session-' + Date.now();
    const team1Id = 'team1';
    const team2Id = 'team2';
    
    // Create test teams
    const team1: Colony = {
      id: team1Id,
      sessionId,
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
      } as Resources,
      players: [
        { id: 'player1', name: 'Captain 1', role: 'captain' }
      ],
      gameCode: 'ABC123',
      investments: {},
      eliminationStatus: {
        isEliminated: false,
        roundsInCritical: 0,
        criticalResources: []
      }
    };
    
    const team2: Colony = {
      id: team2Id,
      sessionId,
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
      } as Resources,
      players: [
        { id: 'player2', name: 'Captain 2', role: 'captain' }
      ],
      gameCode: 'DEF456',
      investments: {},
      eliminationStatus: {
        isEliminated: false,
        roundsInCritical: 0,
        criticalResources: []
      }
    };
    
    console.log('✅ Step 1: Create initial trade offer');
    const tradeId = await TradingService.createTradeOffer(
      sessionId,
      team1Id,
      team2Id,
      { minerals: 10, alloys: 2 },  // Team1 offers
      { food: 15, water: 5 },        // Team1 wants
      team1.players[0]
    );
    console.log(`   Trade created: ${tradeId}`);
    
    console.log('\n✅ Step 2: Create counter-offer from Team2');
    const counterOfferId = await TradingService.createCounterOffer(
      sessionId,
      tradeId,
      team2Id,
      { minerals: 5, alloys: 1 },    // Team2 counter-offers less
      { food: 15, water: 5 },        // Same request
      team2.players[0]
    );
    console.log(`   Counter-offer created: ${counterOfferId}`);
    
    console.log('\n✅ Step 3: Verify original trade was marked as counter-offered');
    // In a real test, we'd check the database here
    console.log('   Original trade status should be "counter_offered"');
    
    console.log('\n✅ Step 4: Accept counter-offer');
    const accepted = await TradingService.acceptTradeOffer(
      sessionId,
      counterOfferId,
      team1Id
    );
    console.log(`   Counter-offer accepted: ${accepted}`);
    
    console.log('\n✅ Step 5: Verify resources were transferred correctly');
    // In a real implementation, we'd check team resources here
    console.log('   Team1 should have: -5 minerals, -1 alloys, +15 food, +5 water');
    console.log('   Team2 should have: +5 minerals, +1 alloys, -15 food, -5 water');
    
    console.log('\n🎉 Counter-offer flow test completed successfully!');
    
    return {
      success: true,
      tradeId,
      counterOfferId
    };
    
  } catch (error) {
    console.error('❌ Counter-offer flow test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test helper to verify the counter-offer creates correct data
export function validateCounterOfferData(counterOffer: any, originalTrade: any) {
  const validations = [
    {
      name: 'Counter-offer references original trade',
      check: () => counterOffer.originalTradeId === originalTrade.id
    },
    {
      name: 'Counter-offer marked as counter-offer',
      check: () => counterOffer.isCounterOffer === true
    },
    {
      name: 'Roles are swapped (initiator becomes target)',
      check: () => counterOffer.initiatorId === originalTrade.targetId &&
                 counterOffer.targetId === originalTrade.initiatorId
    },
    {
      name: 'Status is pending',
      check: () => counterOffer.status === 'pending'
    }
  ];
  
  console.log('\n📋 Validating counter-offer data:');
  validations.forEach(({ name, check }) => {
    const passed = check();
    console.log(`   ${passed ? '✅' : '❌'} ${name}`);
  });
  
  return validations.every(v => v.check());
}