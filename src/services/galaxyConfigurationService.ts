import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  // updateDoc,
  // deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { firestore as db } from '../firebase/config';
import type {
  Galaxy,
  GalaxyConfiguration,
  // TeamStructure,
  // ResourceModifiers,
  SpecialRule
  // VictoryCondition,
  // DEFAULT_GALAXY_CONFIGS
} from '../types/galaxy.types';
import type { ColonyType } from '../types';

/**
 * Configuration templates for different galaxy setups
 */
export interface GalaxyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'corporate' | 'tournament' | 'custom';
  configuration: GalaxyConfiguration;
  recommendedPlayers: { min: number; max: number };
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  features: string[];
}

/**
 * Service for managing galaxy configuration templates and dynamic sizing
 */
class GalaxyConfigurationService {
  private templates: Map<string, GalaxyTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default configuration templates
   */
  private initializeDefaultTemplates(): void {
    // Standard Template
    this.templates.set('standard', {
      id: 'standard',
      name: 'Standard Game',
      description: 'Classic single-galaxy setup with balanced gameplay',
      category: 'standard',
      configuration: {
        galaxies: [{
          id: 'main',
          name: 'Main Galaxy',
          code: 'MAN',
          participantCount: 6,
          gameMode: 'full_multiplayer',
          description: 'Standard 6-team configuration',
          totalTeams: 6,
          colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
          teamStructure: { mode: 'standard' },
          aiEnabled: false
        }],
        crossGalaxyTrading: false,
        globalEvents: true,
        sharedMarketIntel: true,
        competitionMode: 'individual',
        victoryConditions: ['survival']
      },
      recommendedPlayers: { min: 12, max: 36 },
      duration: 90,
      difficulty: 'beginner',
      features: ['Balanced resources', 'Simple trading', 'Clear objectives']
    });

    // Corporate Template
    this.templates.set('corporate', {
      id: 'corporate',
      name: 'Corporate Challenge',
      description: 'Multi-galaxy setup for large corporate events',
      category: 'corporate',
      configuration: {
        galaxies: [
          {
            id: 'alpha',
            name: 'Alpha Sector',
            code: 'ALP',
            participantCount: 8,
            gameMode: 'mixed_mode',
            description: 'Primary trading hub',
            totalTeams: 8,
            colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub'],
            teamStructure: { mode: 'balanced' },
            aiEnabled: true,
            aiDifficulty: 'medium'
          },
          {
            id: 'beta',
            name: 'Beta Sector',
            code: 'BET',
            participantCount: 8,
            gameMode: 'mixed_mode',
            description: 'Resource-rich frontier',
            totalTeams: 8,
            colonyTypes: ['military', 'manufacturing', 'mining', 'research'],
            teamStructure: { mode: 'balanced' },
            aiEnabled: true,
            aiDifficulty: 'medium'
          }
        ],
        crossGalaxyTrading: true,
        globalEvents: true,
        sharedMarketIntel: false,
        competitionMode: 'hybrid',
        victoryConditions: ['economic']
      },
      recommendedPlayers: { min: 24, max: 96 },
      duration: 120,
      difficulty: 'intermediate',
      features: ['Cross-galaxy trading', 'AI competitors', 'Dynamic markets', 'Team collaboration']
    });

    // Tournament Template
    this.templates.set('tournament', {
      id: 'tournament',
      name: 'Tournament Mode',
      description: 'Competitive multi-galaxy tournament setup',
      category: 'tournament',
      configuration: {
        galaxies: [
          {
            id: 'group_a',
            name: 'Group A',
            code: 'GRA',
            participantCount: 6,
            gameMode: 'full_multiplayer',
            description: 'Tournament group A',
            totalTeams: 6,
            colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
            teamStructure: { mode: 'standard' },
            aiEnabled: false,
            specialRules: [
              {
                id: 'no_cross_trading',
                name: 'Group Isolation',
                description: 'No trading outside the group',
                type: 'trade_restriction',
                config: { blockCrossGalaxy: true }
              }
            ]
          },
          {
            id: 'group_b',
            name: 'Group B',
            code: 'GRB',
            participantCount: 6,
            gameMode: 'full_multiplayer',
            description: 'Tournament group B',
            totalTeams: 6,
            colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
            teamStructure: { mode: 'standard' },
            aiEnabled: false,
            specialRules: [
              {
                id: 'no_cross_trading',
                name: 'Group Isolation',
                description: 'No trading outside the group',
                type: 'trade_restriction',
                config: { blockCrossGalaxy: true }
              }
            ]
          }
        ],
        crossGalaxyTrading: false,
        globalEvents: false,
        sharedMarketIntel: false,
        competitionMode: 'galaxy',
        victoryConditions: ['tournament']
      },
      recommendedPlayers: { min: 24, max: 72 },
      duration: 150,
      difficulty: 'advanced',
      features: ['Isolated groups', 'Tournament brackets', 'Competitive scoring', 'No AI assistance']
    });

    // Save templates to Firestore (only in non-test environment)
    if (typeof import.meta.env !== 'undefined' && import.meta.env.MODE !== 'test') {
      this.saveTemplatesToFirestore();
    }
  }

  /**
   * Save templates to Firestore for persistence
   */
  private async saveTemplatesToFirestore(): Promise<void> {
    const batch = writeBatch(db);

    this.templates.forEach((template, id) => {
      // Create a serializable version of the template
      const serializableTemplate = {
        ...template,
        configuration: {
          ...template.configuration,
          // victoryConditions are already strings, no transformation needed
          victoryConditions: template.configuration.victoryConditions ?? []
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      batch.set(doc(db, 'galaxyTemplates', id), serializableTemplate);
    });

    await batch.commit();
  }

  /**
   * Get all available templates
   */
  async getTemplates(): Promise<GalaxyTemplate[]> {
    const templatesSnapshot = await getDocs(collection(db, 'galaxyTemplates'));
    const templates: GalaxyTemplate[] = [];

    templatesSnapshot.forEach(doc => {
      const data = doc.data() as GalaxyTemplate;

      // victoryConditions are already strings, no transformation needed

      templates.push(data);
    });

    return templates;
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<GalaxyTemplate | null> {
    const templateDoc = await getDoc(doc(db, 'galaxyTemplates', templateId));
    
    if (!templateDoc.exists()) {
      return this.templates.get(templateId) || null;
    }

    const data = templateDoc.data() as GalaxyTemplate;

    // victoryConditions are already strings, no transformation needed

    return data;
  }

  /**
   * Create custom template
   */
  async createCustomTemplate(
    name: string,
    description: string,
    configuration: GalaxyConfiguration,
    options: Partial<GalaxyTemplate> = {}
  ): Promise<GalaxyTemplate> {
    const templateId = `custom_${Date.now()}`;
    
    const template: GalaxyTemplate = {
      id: templateId,
      name,
      description,
      category: 'custom',
      configuration,
      recommendedPlayers: options.recommendedPlayers || { min: 12, max: 72 },
      duration: options.duration || 90,
      difficulty: options.difficulty || 'intermediate',
      features: options.features || [],
      ...options
    };

    // Create a serializable version of the template
    const serializableTemplate = {
      ...template,
      configuration: {
        ...template.configuration,
        // victoryConditions are already strings, no transformation needed
        victoryConditions: template.configuration.victoryConditions ?? []
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'galaxyTemplates', templateId), serializableTemplate);

    return template;
  }

  /**
   * Generate dynamic galaxy configuration based on participant count
   */
  generateDynamicConfiguration(
    participantCount: number,
    options: {
      preferredGalaxySize?: number;
      enableAI?: boolean;
      aiRatio?: number; // Percentage of AI teams (0-1)
      competitionMode?: 'individual' | 'galaxy' | 'hybrid';
      difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    } = {}
  ): GalaxyConfiguration {
    const {
      preferredGalaxySize = 6,
      enableAI = true,
      aiRatio = 0.2,
      competitionMode = 'hybrid',
      difficulty = 'intermediate'
    } = options;

    // Calculate optimal galaxy setup
    // const __teamsPerParticipant = 1; // Assuming 1 team per 3-6 participants
    const totalTeamsNeeded = Math.ceil(participantCount / 3);
    const aiTeamsCount = enableAI ? Math.floor(totalTeamsNeeded * aiRatio) : 0;
    // const __humanTeamsCount = totalTeamsNeeded - aiTeamsCount;

    // Determine number of galaxies
    const galaxyCount = Math.max(1, Math.ceil(totalTeamsNeeded / preferredGalaxySize));
    const teamsPerGalaxy = Math.ceil(totalTeamsNeeded / galaxyCount);

    // Create galaxies
    const galaxies: Galaxy[] = [];
    const colonyTypeSets = this.getColonyTypeSets(teamsPerGalaxy);

    for (let i = 0; i < galaxyCount; i++) {
      const galaxyTeams = i === galaxyCount - 1 
        ? totalTeamsNeeded - (i * teamsPerGalaxy) 
        : teamsPerGalaxy;

      galaxies.push({
        id: `galaxy_${i}`,
        name: this.getGalaxyName(i),
        description: `Galaxy ${i + 1} of ${galaxyCount}`,
        totalTeams: galaxyTeams,
        colonyTypes: colonyTypeSets[i % colonyTypeSets.length],
        teamStructure: { mode: galaxyTeams <= 6 ? 'standard' : 'balanced' },
        aiEnabled: enableAI && aiTeamsCount > 0,
        aiDifficulty: this.getAIDifficulty(difficulty),
        specialRules: this.getSpecialRules(difficulty, galaxyCount > 1)
      } as Galaxy);
    }

    // Determine victory conditions based on difficulty
    const victoryConditions = this.getVictoryConditions(difficulty, competitionMode);

    return {
      galaxies,
      crossGalaxyTrading: galaxyCount > 1 && competitionMode !== 'galaxy',
      globalEvents: true,
      sharedMarketIntel: competitionMode === 'individual',
      competitionMode,
      victoryConditions
    };
  }

  /**
   * Get colony type sets for different galaxy sizes
   */
  private getColonyTypeSets(teamCount: number): ColonyType[][] {
    const allTypes: ColonyType[] = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];
    
    if (teamCount <= 6) {
      return [allTypes.slice(0, teamCount)];
    }

    // For larger galaxies, create balanced sets
    return [
      ['mining', 'agricultural', 'research', 'trade_hub'],
      ['military', 'manufacturing', 'mining', 'research'],
      ['agricultural', 'trade_hub', 'military', 'manufacturing']
    ];
  }

  /**
   * Get galaxy name based on index
   */
  private getGalaxyName(index: number): string {
    const names = [
      'Alpha Centauri', 'Beta Quadrant', 'Gamma Sector', 'Delta Prime',
      'Epsilon Station', 'Zeta Colony', 'Eta Outpost', 'Theta System',
      'Iota Frontier', 'Kappa Territory', 'Lambda Zone', 'Mu Region'
    ];
    return names[index % names.length];
  }

  /**
   * Get AI difficulty based on game difficulty
   */
  private getAIDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' | 'adaptive' {
    switch (difficulty) {
      case 'beginner': return 'easy';
      case 'intermediate': return 'medium';
      case 'advanced': return 'hard';
      case 'expert': return 'adaptive';
      default: return 'medium';
    }
  }

  /**
   * Get special rules based on difficulty
   */
  private getSpecialRules(difficulty: string, multiGalaxy: boolean): SpecialRule[] {
    const rules: SpecialRule[] = [];

    if (difficulty === 'advanced' || difficulty === 'expert') {
      rules.push({
        id: 'resource_decay',
        name: 'Resource Decay',
        description: 'Resources decay by 5% each round',
        type: 'resource_event',
        config: { decayRate: 0.05 }
      });
    }

    if (difficulty === 'expert') {
      rules.push({
        id: 'market_volatility',
        name: 'Market Volatility',
        description: 'Trade values fluctuate by ±20%',
        type: 'gameplay_modifier',
        config: { volatility: 0.2 }
      });
    }

    if (multiGalaxy && difficulty !== 'beginner') {
      rules.push({
        id: 'galaxy_tax',
        name: 'Inter-Galaxy Tax',
        description: '10% tax on cross-galaxy trades',
        type: 'trade_restriction',
        config: { taxRate: 0.1 }
      });
    }

    return rules;
  }

  /**
   * Get victory conditions based on difficulty and mode
   */
  private getVictoryConditions(
    difficulty: string,
    _competitionMode: 'individual' | 'galaxy' | 'hybrid'
  ): string[] {
    const conditions: string[] = [];

    // Always include survival
    conditions.push('survival');

    if (difficulty !== 'beginner') {
      conditions.push('economic');
    }

    if (difficulty === 'advanced' || difficulty === 'expert') {
      conditions.push('diplomatic');
    }

    return conditions;
  }

  /**
   * Manage AI/human team ratio
   */
  calculateTeamDistribution(
    totalTeams: number,
    aiRatio: number,
    options: {
      minHumanTeams?: number;
      maxAITeams?: number;
      balanceAcrossGalaxies?: boolean;
    } = {}
  ): {
    humanTeams: number;
    aiTeams: number;
    distribution: Array<{ galaxyIndex: number; humanTeams: number; aiTeams: number }>;
  } {
    const {
      minHumanTeams = 4,
      maxAITeams = totalTeams * 0.5
      // balanceAcrossGalaxies = true
    } = options;

    let aiTeams = Math.floor(totalTeams * aiRatio);
    aiTeams = Math.min(aiTeams, maxAITeams);
    
    let humanTeams = totalTeams - aiTeams;
    if (humanTeams < minHumanTeams) {
      humanTeams = minHumanTeams;
      aiTeams = totalTeams - humanTeams;
    }

    // Distribution placeholder - would be implemented based on galaxy structure
    const distribution = [{
      galaxyIndex: 0,
      humanTeams,
      aiTeams
    }];

    return {
      humanTeams,
      aiTeams,
      distribution
    };
  }

  /**
   * Get colony type distribution for a galaxy
   */
  getColonyTypeDistribution(
    teamCount: number,
    mode: 'standard' | 'balanced' | 'custom',
    availableTypes: ColonyType[]
  ): Map<ColonyType, number> {
    const distribution = new Map<ColonyType, number>();

    if (mode === 'standard') {
      // One of each type up to team count
      const typesToUse = availableTypes.slice(0, teamCount);
      typesToUse.forEach(type => distribution.set(type, 1));
    } else if (mode === 'balanced') {
      // Distribute evenly
      const baseCount = Math.floor(teamCount / availableTypes.length);
      const remainder = teamCount % availableTypes.length;

      availableTypes.forEach((type, index) => {
        distribution.set(type, baseCount + (index < remainder ? 1 : 0));
      });
    }

    return distribution;
  }

  /**
   * Validate configuration against participant count
   */
  validateConfigurationForParticipants(
    configuration: GalaxyConfiguration,
    participantCount: number
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    const totalTeams = configuration.galaxies?.reduce((sum, g) => sum + (g.totalTeams ?? 0), 0) ?? 0;
    const teamsPerParticipant = totalTeams > 0 ? participantCount / totalTeams : 0;

    if (teamsPerParticipant < 2) {
      issues.push('Too many teams for participant count. Consider reducing galaxy sizes.');
    }

    if (teamsPerParticipant > 6) {
      issues.push('Too few teams for participant count. Consider adding more galaxies or teams.');
    }

    if (configuration.crossGalaxyTrading && (configuration.galaxies?.length ?? 0) < 2) {
      issues.push('Cross-galaxy trading requires at least 2 galaxies.');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Save configuration as a new template
   */
  async saveAsTemplate(
    configuration: GalaxyConfiguration,
    name: string,
    description: string,
    createdBy: string
  ): Promise<GalaxyTemplate> {
    const template = await this.createCustomTemplate(name, description, configuration, {
      features: this.extractFeatures(configuration),
      difficulty: this.inferDifficulty(configuration)
    });

    // Log template creation
    await setDoc(doc(collection(db, 'templateHistory')), {
      templateId: template.id,
      action: 'created',
      createdBy,
      timestamp: Timestamp.now()
    });

    return template;
  }

  /**
   * Extract features from configuration
   */
  private extractFeatures(configuration: GalaxyConfiguration): string[] {
    const features: string[] = [];

    if (configuration.crossGalaxyTrading) {
      features.push('Cross-galaxy trading');
    }

    if (configuration.globalEvents) {
      features.push('Global events');
    }

    if (configuration.galaxies?.some(g => g.aiEnabled)) {
      features.push('AI opponents');
    }

    if (configuration.galaxies?.some(g => g.specialRules && g.specialRules.length > 0)) {
      features.push('Special rules');
    }

    if ((configuration.galaxies?.length ?? 0) > 1) {
      features.push('Multi-galaxy');
    }

    return features;
  }

  /**
   * Infer difficulty from configuration
   */
  private inferDifficulty(configuration: GalaxyConfiguration): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    let complexityScore = 0;

    if (configuration.crossGalaxyTrading) complexityScore += 2;
    if ((configuration.galaxies?.length ?? 0) > 2) complexityScore += 2;
    if (configuration.galaxies?.some(g => g.specialRules && g.specialRules.length > 0)) complexityScore += 1;
    if (configuration.galaxies?.some(g => g.aiDifficulty === 'hard' || g.aiDifficulty === 'adaptive')) complexityScore += 2;
    if ((configuration.victoryConditions?.length ?? 0) > 2) complexityScore += 1;

    if (complexityScore <= 2) return 'beginner';
    if (complexityScore <= 4) return 'intermediate';
    if (complexityScore <= 6) return 'advanced';
    return 'expert';
  }

}

// Export singleton instance
export const galaxyConfigurationService = new GalaxyConfigurationService();

// Export types
