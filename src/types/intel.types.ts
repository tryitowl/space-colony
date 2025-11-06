export interface IntelTemplate {
  type: 'market_intel' | 'survey_report' | 'crisis_warning' | 'discovery' | 
        'competitive' | 'alien' | 'prediction' | 'strategy' | 'endgame' | 'urgent';
  title: string;
  content: string;
  baseValue: number;
  applicableRounds: number[];
  exclusivity: 'exclusive' | 'shared' | 'public';
  minScoutLevel?: number;
  maxDistribution?: number;
}

export interface IntelTemplateConfig {
  templates: {
    [round: string]: IntelTemplate[];
  };
  placeholders: {
    [key: string]: string[];
  };
}

export interface IntelGenerationContext {
  sessionId: string;
  teamId: string;
  teamType: string;
  currentRound: number;
  otherTeams: Array<{
    id: string;
    name: string;
    type: string;
    resources: any;
    isEliminated: boolean;
  }>;
  sessionStats: {
    totalTrades: number;
    averageResourceValue: number;
    criticalTeams: string[];
  };
}