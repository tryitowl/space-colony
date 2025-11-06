import { vi, describe, it, expect, beforeEach } from 'vitest';
import { galaxyConfigurationService } from '../galaxyConfigurationService';
import type { GalaxyConfiguration } from '../../types/galaxy.types';
import { getDocs, setDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('../../firebase/config', () => ({
  db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn()
  })),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}));

describe('GalaxyConfigurationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should return all available templates', async () => {
      const mockTemplates = [
        { id: 'standard', name: 'Standard Game', category: 'standard' },
        { id: 'corporate', name: 'Corporate Challenge', category: 'corporate' }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        forEach: (callback: any) => {
          mockTemplates.forEach(template => {
            callback({ data: () => template });
          });
        }
      } as any);

      const templates = await galaxyConfigurationService.getTemplates();

      expect(templates).toHaveLength(2);
      expect(templates[0].id).toBe('standard');
      expect(templates[1].id).toBe('corporate');
    });
  });

  describe('generateDynamicConfiguration', () => {
    it('should generate configuration for small groups', () => {
      const config = galaxyConfigurationService.generateDynamicConfiguration(12, {
        preferredGalaxySize: 6,
        enableAI: false,
        difficulty: 'beginner'
      });

      expect(config.galaxies || []).toHaveLength(1);
      expect((config.galaxies || [])[0]).toMatchObject({ totalTeams: 4 });
      expect(config.crossGalaxyTrading).toBe(false);
      expect(config.competitionMode).toBe('hybrid');
    });

    it('should generate multi-galaxy configuration for large groups', () => {
      const config = galaxyConfigurationService.generateDynamicConfiguration(60, {
        preferredGalaxySize: 6,
        enableAI: true,
        aiRatio: 0.25,
        competitionMode: 'galaxy'
      });

      expect(config.galaxies.length).toBeGreaterThan(1);
      expect(config.crossGalaxyTrading).toBe(false); // Because competitionMode is 'galaxy'
      expect(config.galaxies.every(g => g.aiEnabled)).toBe(true);
    });

    it('should calculate AI teams correctly', () => {
      const config = galaxyConfigurationService.generateDynamicConfiguration(30, {
        enableAI: true,
        aiRatio: 0.3
      });

      const totalTeams = config.galaxies?.reduce((sum, g) => sum + (g.totalTeams || 0), 0) || 0;
      expect(totalTeams).toBeGreaterThanOrEqual(10);
    });

    it('should apply difficulty-based special rules', () => {
      const expertConfig = galaxyConfigurationService.generateDynamicConfiguration(24, {
        difficulty: 'expert'
      });

      const hasSpecialRules = expertConfig.galaxies?.some(g => 
        g.specialRules && g.specialRules.length > 0
      ) ?? false;
      expect(hasSpecialRules).toBe(true);
      
      // Expert difficulty should have adaptive AI
      expect(expertConfig.galaxies?.[0].aiDifficulty).toBe('adaptive');
    });
  });

  describe('calculateTeamDistribution', () => {
    it('should respect minimum human teams', () => {
      const distribution = galaxyConfigurationService.calculateTeamDistribution(10, 0.5, {
        minHumanTeams: 6
      });

      expect(distribution.humanTeams).toBeGreaterThanOrEqual(6);
      expect(distribution.aiTeams).toBeLessThanOrEqual(4);
      expect(distribution.humanTeams + distribution.aiTeams).toBe(10);
    });

    it('should respect maximum AI teams', () => {
      const distribution = galaxyConfigurationService.calculateTeamDistribution(10, 0.8, {
        maxAITeams: 3
      });

      expect(distribution.aiTeams).toBeLessThanOrEqual(3);
      expect(distribution.humanTeams).toBeGreaterThanOrEqual(7);
    });
  });

  describe('getColonyTypeDistribution', () => {
    it('should distribute colony types in standard mode', () => {
      const distribution = galaxyConfigurationService.getColonyTypeDistribution(
        6,
        'standard',
        ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing']
      );

      expect(distribution.size).toBe(6);
      distribution.forEach((count) => {
        expect(count).toBe(1);
      });
    });

    it('should balance colony types in balanced mode', () => {
      const distribution = galaxyConfigurationService.getColonyTypeDistribution(
        10,
        'balanced',
        ['mining', 'agricultural', 'research', 'trade_hub']
      );

      expect(distribution.size).toBe(4);
      
      let total = 0;
      distribution.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(3);
        total += count;
      });
      expect(total).toBe(10);
    });
  });

  describe('validateConfigurationForParticipants', () => {
    it('should validate appropriate team-to-participant ratio', () => {
      const config: GalaxyConfiguration = {
        galaxies: [{
          id: 'test',
          name: 'Test',
          description: '',
          totalTeams: 6,
          colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
          teamStructure: { mode: 'standard' },
          aiEnabled: false
        }],
        crossGalaxyTrading: false,
        globalEvents: true,
        sharedMarketIntel: true,
        competitionMode: 'individual',
        victoryConditions: []
      };

      expect(config.galaxies).toBeDefined();
      expect(config.galaxies).toHaveLength(1);

      const result = galaxyConfigurationService.validateConfigurationForParticipants(config, 18);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect too many teams for participants', () => {
      const config: GalaxyConfiguration = {
        galaxies: [{
          id: 'test',
          name: 'Test',
          description: '',
          totalTeams: 20,
          colonyTypes: ['mining', 'agricultural'],
          teamStructure: { mode: 'balanced' },
          aiEnabled: false
        }],
        crossGalaxyTrading: false,
        globalEvents: true,
        sharedMarketIntel: true,
        competitionMode: 'individual',
        victoryConditions: []
      };

      const result = galaxyConfigurationService.validateConfigurationForParticipants(config, 30);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Too many teams for participant count. Consider reducing galaxy sizes.');
    });

    it('should detect too few teams for participants', () => {
      const config: GalaxyConfiguration = {
        galaxies: [{
          id: 'test',
          name: 'Test',
          description: '',
          totalTeams: 2,
          colonyTypes: ['mining', 'agricultural'],
          teamStructure: { mode: 'standard' },
          aiEnabled: false
        }],
        crossGalaxyTrading: false,
        globalEvents: true,
        sharedMarketIntel: true,
        competitionMode: 'individual',
        victoryConditions: []
      };

      const result = galaxyConfigurationService.validateConfigurationForParticipants(config, 50);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Too few teams for participant count. Consider adding more galaxies or teams.');
    });
  });

  describe('createCustomTemplate', () => {
    it('should create a custom template with proper metadata', async () => {
      const configuration: GalaxyConfiguration = {
        galaxies: [{
          id: 'custom_1',
          name: 'Custom Galaxy',
          description: 'A custom setup',
          totalTeams: 8,
          colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub'],
          teamStructure: { mode: 'balanced' },
          aiEnabled: true,
          aiDifficulty: 'hard',
          specialRules: [{
            id: 'test_rule',
            name: 'Test Rule',
            description: 'A test rule',
            type: 'gameplay_modifier',
            config: {}
          }]
        }],
        crossGalaxyTrading: true,
        globalEvents: true,
        sharedMarketIntel: false,
        competitionMode: 'hybrid',
        victoryConditions: []
      };

      const template = await galaxyConfigurationService.createCustomTemplate(
        'My Custom Template',
        'A template for testing',
        configuration,
        {
          recommendedPlayers: { min: 16, max: 32 },
          duration: 120
        }
      );

      expect(template).toMatchObject({
        name: 'My Custom Template',
        description: 'A template for testing',
        category: 'custom',
        configuration,
        recommendedPlayers: { min: 16, max: 32 },
        duration: 120,
        features: expect.arrayContaining(['Cross-galaxy trading', 'AI opponents', 'Special rules'])
      });

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'My Custom Template',
          category: 'custom'
        })
      );
    });
  });

  describe('saveAsTemplate', () => {
    it('should save configuration as template and log the action', async () => {
      const configuration: GalaxyConfiguration = {
        galaxies: [{
          id: 'test',
          name: 'Test Galaxy',
          description: '',
          totalTeams: 6,
          colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
          teamStructure: { mode: 'standard' },
          aiEnabled: false
        }],
        crossGalaxyTrading: false,
        globalEvents: true,
        sharedMarketIntel: true,
        competitionMode: 'individual',
        victoryConditions: []
      };

      const template = await galaxyConfigurationService.saveAsTemplate(
        configuration,
        'Saved Template',
        'A saved configuration',
        'user_123'
      );

      expect(template.name).toBe('Saved Template');
      expect(template.description).toBe('A saved configuration');
      
      // Should log the action
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'created',
          createdBy: 'user_123',
          templateId: template.id
        })
      );
    });
  });
});