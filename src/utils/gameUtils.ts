import type { Resources, ColonyType, GameState, Colony } from '../types/game';

// Resource utilities
export const getResourceName = (resourceType: keyof Resources): string => {
  const resourceNames: Record<keyof Resources, string> = {
    oxygen: 'Oxygen',
    food: 'Food',
    water: 'Water',
    energy: 'Energy',
    minerals: 'Minerals',
    alloys: 'Alloys',
    techComponents: 'Tech Components',
    defenseContracts: 'Defense',
    systemRepairs: 'Production',
    techPatents: 'Technology',
    credits: 'Credits',
    marketIntel: 'Market Intel',
    surveyReports: 'Survey Reports',
    crisisWarnings: 'Crisis Warnings',
    intel: 'Intel',
    transportRoutes: 'Transport Routes',
    blueprints: 'Blueprints',
    alienTech: 'Alien Tech',
    xenoBio: 'Xeno Biology',
    quantumCores: 'Quantum Cores',
    darkMatter: 'Dark Matter',
  };
  return resourceNames[resourceType];
};

export const getResourceIcon = (resourceType: keyof Resources): string => {
  const resourceIcons: Record<keyof Resources, string> = {
    oxygen: '🫁',
    food: '🍎',
    water: '💧',
    energy: '⚡',
    minerals: '⛏️',
    alloys: '🔩',
    techComponents: '🔧',
    defenseContracts: '🛡️',
    systemRepairs: '🏭',
    techPatents: '🧬',
    credits: '💰',
    marketIntel: '📡',
    surveyReports: '🗺️',
    crisisWarnings: '⚠️',
    intel: '📊',
    transportRoutes: '🚀',
    blueprints: '📋',
    alienTech: '👽',
    xenoBio: '🧬',
    quantumCores: '💎',
    darkMatter: '🌌',
  };
  return resourceIcons[resourceType];
};

export const getResourceColor = (resourceType: keyof Resources): string => {
  const resourceColors: Record<keyof Resources, string> = {
    oxygen: 'text-blue-400',
    food: 'text-green-400',
    water: 'text-cyan-400',
    energy: 'text-yellow-400',
    minerals: 'text-orange-400',
    alloys: 'text-gray-400',
    techComponents: 'text-purple-400',
    defenseContracts: 'text-red-400',
    systemRepairs: 'text-indigo-400',
    techPatents: 'text-pink-400',
    credits: 'text-yellow-300',
    marketIntel: 'text-blue-300',
    surveyReports: 'text-teal-300',
    crisisWarnings: 'text-orange-300',
    intel: 'text-indigo-300',
    transportRoutes: 'text-cyan-300',
    blueprints: 'text-slate-300',
    alienTech: 'text-violet-300',
    xenoBio: 'text-purple-500',
    quantumCores: 'text-blue-500',
    darkMatter: 'text-gray-900',
  };
  return resourceColors[resourceType];
};

// Colony utilities
export const getColonyName = (colonyType: ColonyType): string => {
  const colonyNames: Record<ColonyType, string> = {
    mining: 'Mining Colony',
    agricultural: 'Agricultural Colony',
    research: 'Research Station',
    trade_hub: 'Trade Hub',
    military: 'Military Outpost',
    manufacturing: 'Manufacturing Plant',
  };
  return colonyNames[colonyType];
};

export const getColonyColor = (colonyType: ColonyType): string => {
  const colonyColors: Record<ColonyType, string> = {
    mining: 'colony-mining',
    agricultural: 'colony-agricultural',
    research: 'colony-research',
    trade_hub: 'colony-trade',
    military: 'colony-military',
    manufacturing: 'colony-manufacturing',
  };
  return colonyColors[colonyType];
};

export const getColonyDescription = (colonyType: ColonyType): string => {
  const descriptions: Record<ColonyType, string> = {
    mining: 'Specializes in mineral extraction and energy production',
    agricultural: 'Focuses on food and water production for sustainability',
    research: 'Advanced technology development and research capabilities',
    trade_hub: 'Balanced resources with enhanced trading capabilities',
    military: 'Defensive systems and security operations',
    manufacturing: 'Industrial production and resource processing',
  };
  return descriptions[colonyType];
};

// Game phase utilities
export const getPhaseDisplayName = (phase: GameState): string => {
  const phaseNames: Record<GameState, string> = {
    setup: 'Setup Phase',
    investments: 'Investment Phase',
    round_1: 'Round 1',
    strategy_1: 'Strategy Break 1',
    round_2: 'Round 2',
    strategy_2: 'Strategy Break 2',
    milestone_break: 'Milestone Event',
    round_3: 'Round 3',
    strategy_3: 'Strategy Break 3',
    round_4: 'Round 4',
    strategy_4: 'Strategy Break 4',
    round_5: 'Final Round',
    completed: 'Game Complete',
  };
  return phaseNames[phase];
};

export const isPrimaryPhase = (phase: GameState): boolean => {
  return ['round_1', 'round_2', 'round_3', 'round_4', 'round_5'].includes(phase);
};

export const getPhaseDescription = (phase: GameState): string => {
  const descriptions: Record<GameState, string> = {
    setup: 'Teams are joining and preparing for the game',
    investments: 'Teams are making initial investments',
    round_1: 'First trading round - get familiar with the mechanics',
    strategy_1: 'Strategic planning break after round 1',
    round_2: 'Second trading round - resource management becomes critical',
    strategy_2: 'Strategic planning break after round 2',
    milestone_break: 'Major event affecting all colonies',
    round_3: 'Advanced trading with complex resources',
    strategy_3: 'Strategic planning break after round 3',
    round_4: 'High-pressure trading with limited time',
    strategy_4: 'Strategic planning break after round 4',
    round_5: 'Final push for survival and victory',
    completed: 'All rounds complete - calculating final scores',
  };
  return descriptions[phase];
};

// Resource status utilities
export const getResourceStatus = (amount: number, resourceType: string): 'critical' | 'low' | 'moderate' | 'abundant' => {
  const basicResources = ['oxygen', 'food', 'water', 'energy'];
  
  if (basicResources.includes(resourceType)) {
    if (amount <= 0) return 'critical';
    if (amount <= 3) return 'low';
    if (amount <= 10) return 'moderate';
    return 'abundant';
  } else {
    if (amount <= 0) return 'critical';
    if (amount <= 5) return 'low';
    if (amount <= 15) return 'moderate';
    return 'abundant';
  }
};

export const getResourceStatusColor = (status: 'critical' | 'low' | 'moderate' | 'abundant'): string => {
  const statusColors = {
    critical: 'text-danger-red bg-danger-red/20 border-danger-red',
    low: 'text-warning-orange bg-warning-orange/20 border-warning-orange',
    moderate: 'text-cyan-primary bg-cyan-primary/20 border-cyan-primary',
    abundant: 'text-success-green bg-success-green/20 border-success-green',
  };
  return statusColors[status];
};

// Team utilities
export const isTeamInCriticalMode = (team: Colony): boolean => {
  const basicResources = ['oxygen', 'food', 'water', 'energy'] as const;
  return basicResources.some(resource => team.resources[resource] <= 0);
};

export const getTeamRiskLevel = (team: Colony): 'safe' | 'warning' | 'critical' | 'eliminated' => {
  if (team.eliminationStatus.isEliminated) return 'eliminated';
  
  const basicResources = ['oxygen', 'food', 'water', 'energy'] as const;
  const criticalResources = basicResources.filter(resource => team.resources[resource] <= 0);
  const lowResources = basicResources.filter(resource => team.resources[resource] <= 3 && team.resources[resource] > 0);
  
  if (criticalResources.length > 0) return 'critical';
  if (lowResources.length >= 2) return 'warning';
  if (lowResources.length >= 1) return 'warning';
  return 'safe';
};

// Time utilities  
export const formatTimeRemaining = (endTime: Date): string => {
  const now = new Date();
  const remaining = endTime.getTime() - now.getTime();
  
  if (remaining <= 0) return '00:00';
  
  const minutes = Math.floor(remaining / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getTimeRemainingColor = (endTime: Date): string => {
  const now = new Date();
  const remaining = endTime.getTime() - now.getTime();
  const totalTime = 3 * 60 * 1000; // 3 minutes in milliseconds
  
  const percentRemaining = remaining / totalTime;
  
  if (percentRemaining > 0.5) return 'text-success-green';
  if (percentRemaining > 0.25) return 'text-warning-orange';
  return 'text-danger-red';
};

// Scoring utilities
export const calculateTeamScore = (team: Colony): number => {
  // Basic scoring algorithm
  let score = 0;
  
  // Survival bonus
  if (!team.eliminationStatus.isEliminated) {
    score += 1000;
  }
  
  // Resource diversity bonus - only count numeric resources
  const numericResources = ['oxygen', 'food', 'water', 'energy', 'minerals', 'alloys', 'techComponents', 'defenseContracts', 'systemRepairs', 'transportRoutes', 'techPatents', 'blueprints', 'alienTech', 'credits'] as const;
  const nonZeroResources = numericResources.filter(type => (team.resources[type] as number) > 0);
  score += nonZeroResources.length * 50;
  
  // Total resource value
  numericResources.forEach(type => {
    const amount = team.resources[type] as number;
    score += amount * 2;
  });
  
  // Intel resources bonus
  score += team.resources.marketIntel.length * 10;
  score += team.resources.surveyReports.length * 10;
  score += team.resources.crisisWarnings.length * 15;
  
  return Math.max(0, score);
};

// Validation utilities
export const validateGameCode = (code: string): boolean => {
  // Game codes should be 6 characters, alphanumeric
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
};

export const validatePlayerName = (name: string): boolean => {
  // Player names should be 2-20 characters, letters, numbers, spaces, hyphens
  return /^[a-zA-Z0-9\s\-]{2,20}$/.test(name.trim());
};

// Resource categorization
export const getResourceCategory = (resourceType: string): 'basic' | 'advanced' | 'specialty' | 'intel' => {
  const categories: Record<string, 'basic' | 'advanced' | 'specialty' | 'intel'> = {
    oxygen: 'basic',
    food: 'basic',
    water: 'basic',
    energy: 'basic',
    minerals: 'advanced',
    alloys: 'advanced',
    tech_components: 'advanced',
    defense: 'specialty',
    production: 'specialty',
    tech: 'specialty',
    credits: 'specialty',
    intel: 'intel'
  };
  return categories[resourceType as string] || 'basic';
};

// Format utilities
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};