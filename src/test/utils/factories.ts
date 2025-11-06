import type { 
  Colony,
  GameSession,
  TradeOffer,
  IntelItem,
  Resources,
  Investments,
  Player,
  ColonyType,
  TradeStatus,
  GameState,
  TradingStatus,
  EliminationStatus,
  GameEvent,
  GameSettings,
} from '../../types';
import { COLONY_STARTING_RESOURCES } from '../../types';
import type { AIColonyConfig, AIDifficulty } from '../../types/ai.types';
import { mockTimestamp } from './firebase';

// Resources factory
export const createResources = (overrides: Partial<Resources> = {}): Resources => ({
  oxygen: 10, food: 10, water: 10, energy: 10,
  minerals: 5, alloys: 0, techComponents: 0,
  marketIntel: [], surveyReports: [], crisisWarnings: [],
  defenseContracts: 0, systemRepairs: 0, transportRoutes: 0,
  techPatents: 0, blueprints: 0, alienTech: 0,
  xenoBio: 0, quantumCores: 0, darkMatter: 0,
  credits: 1000,
  ...overrides,
});

// Investments factory
export const createInvestments = (overrides: Partial<Investments> = {}): Investments => ({
  scouts: 0,
  productionUpgrades: 0,
  researchLabs: 0,
  communicationArray: 0,
  emergencyReserves: 0,
  ...overrides,
});

// Player factory
export const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  name: 'Test Player',
  gameCode: 'ABC123',
  isOnline: true,
  lastSeen: Date.now(),
  ...overrides,
});

// Intel item factory
export const createIntelItem = (overrides: Partial<IntelItem> = {}): IntelItem => ({
  id: 'intel-1',
  title: 'Market Opportunity',
  content: 'Colony B is seeking water resources',
  value: 100,
  distributionCount: 1,
  roundGenerated: 1,
  source: 'scout',
  ...overrides,
});

// Colony factory
export const createColony = (overrides: Partial<Colony> = {}): Colony => ({
  id: 'colony-1',
  type: 'mining',
  name: 'Mining Colony A1',
  teamLetter: 'A',
  teamNumber: 1,
  players: [createPlayer()],
  resources: createResources(COLONY_STARTING_RESOURCES.mining),
  investments: createInvestments(),
  tradingStatus: 'available',
  gameCode: 'AA01',
  eliminationStatus: {
    isEliminated: false,
    roundsInCritical: 0,
    criticalResources: []
  },
  ...overrides,
});

// Game Session factory
export const createGameSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  eventId: 'event-1',
  name: 'Test Session',
  facilitatorId: 'facilitator-1',
  teams: [createColony()],
  currentRound: 1,
  roundStartTime: Date.now(),
  gameState: 'round_1',
  settings: {
    roundDurations: {
      instructions: 300000,
      investments: 300000,
      round1Trading: 360000,
      round1Strategy: 180000,
      round2Trading: 300000,
      round2Strategy: 120000,
      milestoneBreak: 300000,
      round3Trading: 360000,
      round3Strategy: 120000,
      round4Trading: 180000,
      round4Strategy: 180000,
      round5Trading: 240000
    },
    enableAlienContact: true,
    customIntel: []
  },
  ...overrides,
});

// Trade Offer factory
export const createTradeOffer = (overrides: Partial<TradeOffer> = {}): TradeOffer => ({
  id: 'trade-1',
  initiatorId: 'colony-1',
  targetId: 'colony-2',
  offerResources: { oxygen: 10, minerals: 5 },
  requestResources: { food: 8, water: 4 },
  offerIntel: [],
  requestIntel: [],
  status: 'pending',
  timestamp: Date.now(),
  expiresAt: Date.now() + 180000, // 3 minutes from now
  negotiationHistory: [],
  ...overrides,
});

// Game Event factory
export const createGameEvent = (overrides: Partial<GameEvent> = {}): GameEvent => ({
  id: 'event-1',
  name: 'Corporate Training Event',
  organizationName: 'Acme Corp',
  facilitatorId: 'facilitator-1',
  sessions: [createGameSession()],
  startTime: Date.now(),
  endTime: Date.now() + 3600000, // 1 hour from now
  status: 'active',
  ...overrides,
});

// AI Colony Config factory
export const createAIColonyConfig = (overrides: Partial<AIColonyConfig> = {}): AIColonyConfig => ({
  colonyId: 'colony-1',
  difficulty: 'medium',
  isAIControlled: true,
  ...overrides,
});

// Colony type configurations
export const colonyTypeConfigs = {
  mining: {
    name: 'Mining Colony',
    specialization: 'minerals',
    bonusResources: { minerals: 20 },
    consumption: { oxygen: 2, food: 2, water: 1, energy: 3 },
  },
  agricultural: {
    name: 'Agricultural Colony',
    specialization: 'food',
    bonusResources: { food: 20, water: 15 },
    consumption: { oxygen: 2, food: 1, water: 2, energy: 2 },
  },
  research: {
    name: 'Research Colony',
    specialization: 'techComponents',
    bonusResources: { techComponents: 15 },
    consumption: { oxygen: 2, food: 2, water: 1, energy: 4 },
  },
  trade_hub: {
    name: 'Trade Hub',
    specialization: 'credits',
    bonusResources: { credits: 500 },
    consumption: { oxygen: 2, food: 2, water: 1, energy: 3 },
  },
  military: {
    name: 'Military Outpost',
    specialization: 'defenseContracts',
    bonusResources: { defenseContracts: 15 },
    consumption: { oxygen: 2, food: 2, water: 1, energy: 3 },
  },
  manufacturing: {
    name: 'Manufacturing Colony',
    specialization: 'alloys',
    bonusResources: { alloys: 12, minerals: 8 },
    consumption: { oxygen: 2, food: 2, water: 1, energy: 3 },
  },
};

// Helper to create a full game state
export const createGameState = (colonyCount: number = 12) => {
  const session = createGameSession();
  const colonies: Colony[] = [];
  const colonyTypes: ColonyType[] = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];
  const teamLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Create 2 colonies of each type
  let colonyIndex = 0;
  for (let typeIndex = 0; typeIndex < colonyTypes.length && colonyIndex < colonyCount; typeIndex++) {
    const colonyType = colonyTypes[typeIndex];
    for (let i = 0; i < 2 && colonyIndex < colonyCount; i++) {
      const colonyId = `colony-${colonyIndex + 1}`;
      const teamLetter = teamLetters[typeIndex];
      const teamNumber = i + 1;
      
      colonies.push(createColony({
        id: colonyId,
        type: colonyType,
        name: `${colonyTypeConfigs[colonyType].name} ${teamLetter}${teamNumber}`,
        teamLetter,
        teamNumber,
        gameCode: `${teamLetter}${teamLetter}0${teamNumber}`,
        resources: createResources(COLONY_STARTING_RESOURCES[colonyType]),
        players: [createPlayer({
          id: `player-${colonyIndex + 1}`,
          name: `Player ${colonyIndex + 1}`,
          gameCode: `${teamLetter}${teamLetter}0${teamNumber}`,
        })],
      }));
      
      colonyIndex++;
    }
  }

  return {
    session: { ...session, teams: colonies },
    colonies,
    trades: [],
    events: [],
  };
};

// Helper to create mock trade scenarios
export const createTradeScenario = () => {
  const colony1 = createColony({ 
    id: 'colony-1', 
    name: 'Mining Colony A1', 
    type: 'mining',
    teamLetter: 'A',
    teamNumber: 1
  });
  const colony2 = createColony({ 
    id: 'colony-2', 
    name: 'Agricultural Colony B1', 
    type: 'agricultural',
    teamLetter: 'B',
    teamNumber: 1
  });
  
  const pendingTrade = createTradeOffer({
    id: 'trade-1',
    initiatorId: colony1.id,
    targetId: colony2.id,
    status: 'pending',
  });

  const acceptedTrade = createTradeOffer({
    id: 'trade-2',
    status: 'accepted',
  });

  const rejectedTrade = createTradeOffer({
    id: 'trade-3',
    status: 'rejected',
  });

  return {
    colonies: [colony1, colony2],
    trades: [pendingTrade, acceptedTrade, rejectedTrade],
  };
};

// Helper to create mock investment scenarios
export const createInvestmentScenario = () => {
  const colony = createColony({
    investments: createInvestments({
      scouts: 200,
      productionUpgrades: 300,
      researchLabs: 100,
      communicationArray: 150,
      emergencyReserves: 250
    })
  });

  const intel = [
    createIntelItem({
      id: 'scout-intel-1',
      title: 'Resource Discovery',
      content: 'New mineral deposits found in Sector 7',
      source: 'scout',
      value: 150,
      roundGenerated: 1
    }),
    createIntelItem({
      id: 'comm-intel-1',
      title: 'Market Analysis',
      content: 'High demand for tech components next round',
      source: 'communication',
      value: 200,
      roundGenerated: 2
    })
  ];

  return { colony, intel };
};