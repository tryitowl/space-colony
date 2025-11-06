/**
 * Base types to avoid circular dependencies
 */

// Core colony type
export type ColonyType = 
  | 'mining' 
  | 'agricultural' 
  | 'research' 
  | 'trade_hub' 
  | 'military' 
  | 'manufacturing';

// Core resource types
export interface Resources {
  // Basic Resources
  oxygen: number;
  food: number;
  water: number;
  energy: number;
  
  // Advanced Materials
  minerals: number;
  alloys: number;
  techComponents: number;
  
  // Information
  marketIntel: IntelItem[];
  surveyReports: IntelItem[];
  crisisWarnings: IntelItem[];
  intel?: IntelItem[]; // Generic intel array for backward compatibility
  
  // Services
  defenseContracts: number;
  systemRepairs: number;
  transportRoutes: number;
  
  // Technology
  techPatents: number;
  blueprints: number;
  alienTech: number;
  
  // Alien Resources (introduced in Round 3)
  xenoBio: number;
  quantumCores: number;
  darkMatter: number;
  
  // Universal
  credits: number;
}

export interface IntelItem {
  id: string;
  title: string;
  content: string;
  value: number;
  distributionCount: number;
  roundGenerated: number;
  source: 'scout' | 'communication' | 'traded';
}

export interface Player {
  id: string;
  name: string;
  gameCode: string;
  isOnline: boolean;
  lastSeen: number;
  // Multi-player support
  userId?: string; // Firebase auth UID
  role?: import('./player.types').TeamPlayerRole;
  joinedAt?: number;
}

export interface Investments {
  scouts: number;
  productionUpgrades: number;
  researchLabs: number;
  communicationArray: number;
  emergencyReserves: number;
}

export type TradingStatus = 'available' | 'busy' | 'offline';

export interface EliminationStatus {
  isEliminated: boolean;
  roundsInCritical: number;
  criticalResources: string[];
}