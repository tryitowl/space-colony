// Game-specific types that are used across the application

import type { Resources as ResourcesType, GameState as GameStateType, ColonyType as ColonyTypeBase, TradeOffer as TradeOfferType } from './index';

export type { 
  Colony,
  ColonyType,
  Player,
  Resources,
  IntelItem,
  Investments,
  TradingStatus,
  EliminationStatus,
  TradeOffer,
  TradeStatus,
  TradeNegotiation,
  GameSession,
  GameState,
  GameSettings,
  GameEvent
} from './index';

export { 
  COLONY_STARTING_RESOURCES,
  RESOURCE_CONSUMPTION 
} from './index';

// Additional game-specific types
export type ResourceType = keyof ResourcesType;

export type BasicResourceType = 'oxygen' | 'food' | 'water' | 'energy';

export type AdvancedMaterialType = 'minerals' | 'alloys' | 'techComponents';

export type InformationType = 'marketIntel' | 'surveyReports' | 'crisisWarnings';

export type ServiceType = 'defenseContracts' | 'systemRepairs' | 'transportRoutes';

export type TechnologyType = 'techPatents' | 'blueprints' | 'alienTech';

export type AlienResourceType = 'xenoBio' | 'quantumCores' | 'darkMatter' | 'alienTech';

export type UniversalType = 'credits';

export interface GamePhase {
  state: GameStateType;
  name: string;
  duration: number;
  description: string;
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  colonyType: ColonyTypeBase;
  totalScore: number;
  resourceScore: number;
  investmentScore: number;
  tradeScore: number;
  survivalBonus: number;
}

export interface RoundResult {
  round: number;
  teams: TeamScore[];
  events: GameEventLog[];
  trades: TradeOfferType[];
}

export interface GameEventLog {
  id: string;
  timestamp: number;
  type: 'trade' | 'elimination' | 'investment' | 'event' | 'system';
  message: string;
  data?: GameEventLogData;
}

export interface GameEventLogData {
  tradeId?: string;
  teamId?: string;
  amount?: number;
  resourceType?: string;
  fromTeam?: string;
  toTeam?: string;
  eventType?: string;
  round?: number;
  phase?: GamePhase;
  [key: string]: unknown;
}

// Alien Contact Event Types
export interface AlienContactEvent {
  id: string;
  sessionId: string;
  round: number;
  timestamp: number;
  alienCivilization: AlienCivilization;
  availableResources: AlienResourceOffer[];
  duration: number; // How long the alien contact window remains open
  isActive: boolean;
}

export interface AlienCivilization {
  name: string;
  description: string;
  technology: string;
  demeanor: 'peaceful' | 'cautious' | 'aggressive' | 'curious';
  preferredResources: AlienResourceType[];
  exchangeRates: Record<string, number>; // How much alien tech for human resources
}

export interface AlienResourceOffer {
  resourceType: AlienResourceType;
  quantity: number;
  cost: Partial<ResourcesType>; // What they want in return
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface AlienTrade {
  id: string;
  teamId: string;
  timestamp: number;
  offeredResources: Partial<ResourcesType>;
  receivedResources: Partial<ResourcesType>;
  alienCivilization: string;
}