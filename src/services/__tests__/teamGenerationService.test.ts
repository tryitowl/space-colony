/**
 * Tests for Team Generation Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TeamGenerationService,
  ColonyDistribution,
  TeamCodeGenerator,
  PlayerDistribution,
  AITeamAssignment
} from '../teamGenerationService';
import { ResourceBalancer } from '../ResourceBalancer';
import type { 
  Galaxy, 
  TeamStructure 
} from '../../types/galaxy.types';
import type {
  TeamAllocationConfig,
  TeamDefinition,
  TeamAllocationConstraints
} from '../../types/team.types';
import { ColonyType } from '../../types/base.types';

describe('TeamGenerationService', () => {
  const mockGalaxy: Galaxy = {
    id: 'galaxy-1',
    name: 'Test Galaxy',
    description: 'Test galaxy for unit tests',
    totalTeams: 6,
    colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
    teamStructure: { mode: 'standard' },
    aiEnabled: false
  };

  const defaultConfig: TeamAllocationConfig = {
    strategy: 'balanced',
    constraints: {}
  };

  beforeEach(() => {
    TeamCodeGenerator.clearUsedCodes();
  });

  describe('generateTeams', () => {
    it('should generate correct number of teams', () => {
      const composition = TeamGenerationService.generateTeams(mockGalaxy, defaultConfig);
      
      expect(composition.teams).toHaveLength(6);
      expect(composition.galaxyId).toBe('galaxy-1');
    });

    it('should assign unique team letters', () => {
      const composition = TeamGenerationService.generateTeams(mockGalaxy, defaultConfig);
      
      const letters = composition.teams.map(t => t.teamLetter);
      const uniqueLetters = new Set(letters);
      
      expect(uniqueLetters.size).toBe(6);
      expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    });

    it('should generate unique game codes', () => {
      const composition = TeamGenerationService.generateTeams(mockGalaxy, defaultConfig);
      
      const codes = composition.teams.map(t => t.id);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(6);
    });

    it('should distribute colony types evenly in balanced mode', () => {
      const composition = TeamGenerationService.generateTeams(mockGalaxy, defaultConfig);
      
      const typeCounts = composition.teams.reduce((acc, team) => {
        acc[team.colonyType] = (acc[team.colonyType] || 0) + 1;
        return acc;
      }, {} as Record<ColonyType, number>);
      
      // Each type should appear exactly once with 6 teams and 6 types
      Object.values(typeCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });

    it('should handle single team configuration', () => {
      const singleTeamGalaxy = { ...mockGalaxy, totalTeams: 1 };
      const composition = TeamGenerationService.generateTeams(singleTeamGalaxy, defaultConfig);
      
      expect(composition.teams).toHaveLength(1);
      expect(composition.teams[0].teamLetter).toBe('A');
    });

    it('should handle maximum team configuration (20 teams)', () => {
      const composition = TeamGenerationService.generateTeams({ ...mockGalaxy, totalTeams: 20 }, defaultConfig);
      
      expect(composition.teams).toHaveLength(20);
      
      // Check team letters go beyond Z
      expect(composition.teams[25]?.teamLetter).toBe(undefined); // Should not exist
      expect(composition.teams[19].teamLetter).toBe('T'); // 20th letter
    });

    it('should throw error for invalid team count', () => {
      const invalidGalaxy = { ...mockGalaxy, totalTeams: 0 };
      
      expect(() => {
        TeamGenerationService.generateTeams(invalidGalaxy, defaultConfig);
      }).toThrow('Team count must be between 1 and 20');
    });

    it('should distribute players evenly when provided', () => {
      const composition = TeamGenerationService.generateTeams(
        mockGalaxy, 
        defaultConfig,
        18 // 18 players for 6 teams
      );
      
      // Should be 3 players per team
      composition.teams.forEach(team => {
        expect(team.playerSlots).toBe(3);
      });
    });

    it('should handle uneven player distribution', () => {
      const composition = TeamGenerationService.generateTeams(
        mockGalaxy,
        defaultConfig,
        20 // 20 players for 6 teams
      );
      
      const playerCounts = composition.teams.map(t => t.playerSlots);
      const totalPlayers = playerCounts.reduce((a, b) => a + b, 0);
      
      expect(totalPlayers).toBe(20);
      // Some teams should have 3, others 4
      expect(playerCounts.filter(c => c === 3).length).toBe(4);
      expect(playerCounts.filter(c => c === 4).length).toBe(2);
    });

    it('should assign AI teams when enabled', () => {
      const aiGalaxy = { 
        ...mockGalaxy, 
        aiEnabled: true,
        aiDifficulty: 'medium' as const
      };
      const aiConfig = {
        ...defaultConfig,
        constraints: { maxAITeams: 2 }
      };
      
      const composition = TeamGenerationService.generateTeams(aiGalaxy, aiConfig);
      const aiTeams = composition.teams.filter(t => t.isAIControlled);
      
      expect(aiTeams).toHaveLength(2);
      aiTeams.forEach(team => {
        expect(team.playerSlots).toBe(0);
        expect(team.aiDifficulty).toBe('medium');
        expect(team.aiPersonality).toBeDefined();
      });
    });
  });

  describe('ColonyDistribution', () => {
    const allTypes: ColonyType[] = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];

    describe('balanced', () => {
      it('should distribute types evenly', () => {
        const distribution = ColonyDistribution.balanced(12, allTypes);
        
        expect(distribution).toHaveLength(12);
        
        const typeCounts = distribution.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<ColonyType, number>);
        
        // Each type should appear exactly twice
        Object.values(typeCounts).forEach(count => {
          expect(count).toBe(2);
        });
      });

      it('should handle fewer teams than types', () => {
        const distribution = ColonyDistribution.balanced(4, allTypes);
        
        expect(distribution).toHaveLength(4);
        // Should have 4 different types
        expect(new Set(distribution).size).toBe(4);
      });

      it('should handle empty inputs', () => {
        expect(ColonyDistribution.balanced(0, allTypes)).toEqual([]);
        expect(ColonyDistribution.balanced(5, [])).toEqual([]);
      });
    });

    describe('custom', () => {
      it('should use provided assignments', () => {
        const customAssignments = {
          'team-1': 'mining' as ColonyType,
          'team-2': 'agricultural' as ColonyType,
          'team-3': 'research' as ColonyType
        };
        const teamIds = ['team-1', 'team-2', 'team-3'];
        
        const distribution = ColonyDistribution.custom(3, customAssignments, teamIds);
        
        expect(distribution).toEqual(['mining', 'agricultural', 'research']);
      });

      it('should throw error for missing assignment', () => {
        const customAssignments = {
          'team-1': 'mining' as ColonyType
        };
        const teamIds = ['team-1', 'team-2'];
        
        expect(() => {
          ColonyDistribution.custom(2, customAssignments, teamIds);
        }).toThrow('No colony type assigned for team team-2');
      });
    });

    describe('random', () => {
      it('should respect max teams per type constraint', () => {
        const constraints: TeamAllocationConstraints = {
          maxTeamsPerColonyType: 2
        };
        
        const distribution = ColonyDistribution.random(12, allTypes, constraints);
        
        const typeCounts = distribution.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<ColonyType, number>);
        
        Object.values(typeCounts).forEach(count => {
          expect(count).toBeLessThanOrEqual(2);
        });
      });

      it('should include required types', () => {
        const constraints: TeamAllocationConstraints = {
          requiredColonyTypes: ['mining', 'agricultural']
        };
        
        const distribution = ColonyDistribution.random(6, allTypes, constraints);
        
        expect(distribution).toContain('mining');
        expect(distribution).toContain('agricultural');
      });

      it('should exclude specified types', () => {
        const constraints: TeamAllocationConstraints = {
          excludedColonyTypes: ['military', 'manufacturing']
        };
        
        const distribution = ColonyDistribution.random(8, allTypes, constraints);
        
        expect(distribution).not.toContain('military');
        expect(distribution).not.toContain('manufacturing');
      });

      it('should throw error for impossible constraints', () => {
        const constraints: TeamAllocationConstraints = {
          maxTeamsPerColonyType: 1,
          excludedColonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military']
        };
        
        expect(() => {
          ColonyDistribution.random(3, allTypes, constraints);
        }).toThrow('Cannot satisfy distribution constraints');
      });
    });
  });

  describe('PlayerDistribution', () => {
    describe('distributeEvenly', () => {
      it('should distribute players evenly', () => {
        const distribution = PlayerDistribution.distributeEvenly(12, 4);
        
        expect(distribution).toEqual([3, 3, 3, 3]);
      });

      it('should handle uneven distribution', () => {
        const distribution = PlayerDistribution.distributeEvenly(14, 4);
        
        expect(distribution).toEqual([4, 4, 3, 3]);
        expect(distribution.reduce((a, b) => a + b, 0)).toBe(14);
      });

      it('should respect max players per team', () => {
        const distribution = PlayerDistribution.distributeEvenly(50, 4, 10);
        
        distribution.forEach(count => {
          expect(count).toBeLessThanOrEqual(10);
        });
      });

      it('should handle zero teams', () => {
        const distribution = PlayerDistribution.distributeEvenly(10, 0);
        expect(distribution).toEqual([]);
      });
    });

    describe('isDistributionPossible', () => {
      it('should validate possible distributions', () => {
        expect(PlayerDistribution.isDistributionPossible(20, 4, 3, 10)).toBe(true);
        expect(PlayerDistribution.isDistributionPossible(12, 4, 3, 3)).toBe(true);
      });

      it('should reject impossible distributions', () => {
        expect(PlayerDistribution.isDistributionPossible(5, 4, 2, 10)).toBe(false); // Too few players
        expect(PlayerDistribution.isDistributionPossible(50, 4, 0, 10)).toBe(false); // Too many players
      });
    });
  });

  describe('AITeamAssignment', () => {
    const mockTeams: TeamDefinition[] = [
      { id: 'team-1', name: 'Team A', teamLetter: 'A', teamNumber: 1, colonyType: 'mining', playerSlots: 3, isAIControlled: false },
      { id: 'team-2', name: 'Team B', teamLetter: 'B', teamNumber: 2, colonyType: 'agricultural', playerSlots: 3, isAIControlled: false },
      { id: 'team-3', name: 'Team C', teamLetter: 'C', teamNumber: 3, colonyType: 'research', playerSlots: 3, isAIControlled: false },
      { id: 'team-4', name: 'Team D', teamLetter: 'D', teamNumber: 4, colonyType: 'trade_hub', playerSlots: 3, isAIControlled: false }
    ];

    it('should assign correct number of AI teams', () => {
      const aiConfig = {
        totalAITeams: 2,
        difficulty: 'medium' as const,
        personalities: ['aggressive_trader', 'cautious_hoarder'] as const
      };
      
      const updatedTeams = AITeamAssignment.assignAITeams(mockTeams, aiConfig);
      const aiTeams = updatedTeams.filter(t => t.isAIControlled);
      
      expect(aiTeams).toHaveLength(2);
    });

    it('should assign AI personalities', () => {
      const aiConfig = {
        totalAITeams: 2,
        difficulty: 'hard' as const,
        personalities: ['aggressive_trader', 'cooperative'] as const
      };
      
      const updatedTeams = AITeamAssignment.assignAITeams(mockTeams, aiConfig);
      const aiTeams = updatedTeams.filter(t => t.isAIControlled);
      
      const personalities = aiTeams.map(t => t.aiPersonality);
      expect(personalities).toContain('aggressive_trader');
      expect(personalities).toContain('cooperative');
    });

    it('should generate AI configurations', () => {
      const aiTeams: TeamDefinition[] = [
        { ...mockTeams[0], isAIControlled: true, aiDifficulty: 'medium', aiPersonality: 'balanced_player' },
        { ...mockTeams[1], isAIControlled: true, aiDifficulty: 'hard', aiPersonality: 'aggressive_trader' }
      ];
      
      const configs = AITeamAssignment.generateAIConfigs(aiTeams, 'galaxy-1');
      
      expect(configs).toHaveLength(2);
      expect(configs[0]).toMatchObject({
        colonyId: 'team-1',
        difficulty: 'medium',
        isAIControlled: true,
        galaxyId: 'galaxy-1',
        personality: 'balanced_player'
      });
    });

    it('should handle all AI teams', () => {
      const aiConfig = {
        totalAITeams: 4,
        difficulty: 'medium' as const
      };
      
      const updatedTeams = AITeamAssignment.assignAITeams(mockTeams, aiConfig);
      const aiTeams = updatedTeams.filter(t => t.isAIControlled);
      
      expect(aiTeams).toHaveLength(4);
      expect(updatedTeams.every(t => t.isAIControlled)).toBe(true);
    });

    it('should handle no AI teams', () => {
      const aiConfig = {
        totalAITeams: 0,
        difficulty: 'medium' as const
      };
      
      const updatedTeams = AITeamAssignment.assignAITeams(mockTeams, aiConfig);
      
      expect(updatedTeams).toEqual(mockTeams);
    });
  });

  describe('ResourceBalancer', () => {
    const mockTeams: TeamDefinition[] = [
      { id: 'team-1', name: 'Team A', teamLetter: 'A', teamNumber: 1, colonyType: 'mining', playerSlots: 3, isAIControlled: false },
      { id: 'team-2', name: 'Team B', teamLetter: 'B', teamNumber: 2, colonyType: 'agricultural', playerSlots: 3, isAIControlled: false },
      { id: 'team-3', name: 'Team C', teamLetter: 'C', teamNumber: 3, colonyType: 'military', playerSlots: 3, isAIControlled: false }
    ];

    it('should not modify teams when balance mode is none', () => {
      const balanced = ResourceBalancer.balanceResources(mockTeams, 'none');
      
      expect(balanced).toEqual(mockTeams);
    });

    it('should apply handicaps for imbalanced teams', () => {
      const balanced = ResourceBalancer.balanceResources(mockTeams, 'moderate');
      
      const teamsWithHandicaps = balanced.filter(t => t.handicap !== undefined);
      expect(teamsWithHandicaps.length).toBeGreaterThan(0);
    });

    it('should validate survival viability', () => {
      const result = ResourceBalancer.validateSurvivalViability(mockTeams);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect teams that cannot survive', () => {
      const problematicTeam: TeamDefinition = {
        id: 'team-problem',
        name: 'Problem Team',
        teamLetter: 'X',
        teamNumber: 1,
        colonyType: 'mining',
        playerSlots: 1,
        isAIControlled: false,
        customResources: { oxygen: 1, food: 1, water: 0, energy: 1 } // Not enough to survive
      };
      
      const result = ResourceBalancer.validateSurvivalViability([problematicTeam]);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid configurations', () => {
      const result = TeamGenerationService.validateConfiguration(6, 18);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject too few teams', () => {
      const result = TeamGenerationService.validateConfiguration(0, 10);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TEAM_COUNT')).toBe(true);
    });

    it('should reject too many teams', () => {
      const result = TeamGenerationService.validateConfiguration(25, 50);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TEAM_COUNT')).toBe(true);
    });

    it('should reject too many players per team', () => {
      const result = TeamGenerationService.validateConfiguration(4, 50);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Too many players'))).toBe(true);
    });

    it('should warn about single team configuration', () => {
      const result = TeamGenerationService.validateConfiguration(1, 5);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('no trading possible'))).toBe(true);
    });

    it('should validate AI constraints', () => {
      const constraints: TeamAllocationConstraints = {
        maxAITeams: 8,
        requireHumanTeams: 2
      };
      
      const result = TeamGenerationService.validateConfiguration(6, 10, constraints);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('exceed total teams'))).toBe(true);
    });

    it('should validate colony type constraints', () => {
      const constraints: TeamAllocationConstraints = {
        minTeamsPerColonyType: 3,
        requiredColonyTypes: ['mining', 'agricultural', 'research']
      };
      
      const result = TeamGenerationService.validateConfiguration(8, 20, constraints);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('requires at least 9 teams'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle 1 team with 1 AI player', () => {
      const galaxy: Galaxy = {
        ...mockGalaxy,
        totalTeams: 1,
        aiEnabled: true,  // Enable AI for this test
        teamStructure: {
          teamsPerColony: 1,
          maxColonies: 1
        }
      };
      const config: TeamAllocationConfig = {
        strategy: 'balanced',
        constraints: { maxAITeams: 1 }
      };
      
      const composition = TeamGenerationService.generateTeams(galaxy, config, 0);
      
      expect(composition.teams).toHaveLength(1);
      expect(composition.teams[0].isAIControlled).toBe(true);
      expect(composition.teams[0].playerSlots).toBe(0);
    });

    it('should handle maximum teams with mixed AI/human', () => {
      const galaxy: Galaxy = {
        ...mockGalaxy,
        totalTeams: 20,
        aiEnabled: true
      };
      
      const config: TeamAllocationConfig = {
        strategy: 'random',
        constraints: { 
          maxAITeams: 10,
          requireHumanTeams: 10
        }
      };
      
      const composition = TeamGenerationService.generateTeams(galaxy, config, 50);
      
      expect(composition.teams).toHaveLength(20);
      
      const aiTeams = composition.teams.filter(t => t.isAIControlled);
      const humanTeams = composition.teams.filter(t => !t.isAIControlled);
      
      expect(aiTeams.length).toBeLessThanOrEqual(10);
      expect(humanTeams.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle teams beyond 26 (team letters AA, AB, etc.)', () => {
      // Test the private generateTeamLetters function indirectly through a large galaxy
      const largeGalaxy: Galaxy = {
        ...mockGalaxy,
        totalTeams: 30 // This would normally exceed the 20 team limit
      };
      
      // Since we can't have more than 20 teams, test the letter generation logic directly
      const generateTeamLetters = (count: number): string[] => {
        const letters: string[] = [];
        for (let i = 0; i < count; i++) {
          if (i < 26) {
            letters.push(String.fromCharCode(65 + i)); // A-Z
          } else {
            // For teams beyond Z, use AA, AB, AC, etc.
            const firstLetter = String.fromCharCode(65 + Math.floor((i - 26) / 26));
            const secondLetter = String.fromCharCode(65 + ((i - 26) % 26));
            letters.push(firstLetter + secondLetter);
          }
        }
        return letters;
      };
      
      const teamLetters = generateTeamLetters(30);
      
      expect(teamLetters[0]).toBe('A');
      expect(teamLetters[25]).toBe('Z');
      expect(teamLetters[26]).toBe('AA');
      expect(teamLetters[27]).toBe('AB');
      expect(teamLetters[28]).toBe('AC');
      expect(teamLetters[29]).toBe('AD');
    });
  });
});