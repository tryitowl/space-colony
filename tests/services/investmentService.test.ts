import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase modules first
vi.mock('firebase/firestore');
vi.mock('../../src/firebase/config');

import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { InvestmentService } from '../../src/services/investmentService';
import type { InvestmentAllocation, ColonyType, Investments } from '../../src/types';
import { INVESTMENT_BUDGET, INVESTMENT_OPTIONS, COLONY_PRODUCTION_UPGRADES, EMERGENCY_CONVERSION_RATE } from '../../src/types/investment.types';
import { createColony, createGameSession } from '../../src/test/utils/factories';

// Setup mocks
vi.mocked(writeBatch).mockReturnValue({
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
} as any);

describe('InvestmentService', () => {
  let mockInvestmentAllocation: InvestmentAllocation;
  let mockInvestments: Investments;

  beforeEach(() => {
    mockInvestmentAllocation = {
      scouts: 2,
      productionUpgrades: 3,
      researchLabs: 1,
      communicationArray: 1,
      emergencyReserves: 4
    };

    mockInvestments = {
      scouts: 0,
      productionUpgrades: 0,
      researchLabs: 0,
      communicationArray: 0,
      emergencyReserves: 0
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateInvestment', () => {
    it('should validate a correct investment allocation', () => {
      const allocation: InvestmentAllocation = {
        scouts: 2, // 200 credits
        productionUpgrades: 2, // 300 credits
        researchLabs: 1, // 200 credits
        communicationArray: 1, // 250 credits
        emergencyReserves: 1 // 50 credits
      }; // Total: 1000 credits (within budget)

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.isValid).toBe(true);
      expect(validation.totalCost).toBe(1000);
      expect(validation.remainingCredits).toBe(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject investment allocation exceeding budget', () => {
      const allocation: InvestmentAllocation = {
        scouts: 5, // 500 credits
        productionUpgrades: 5, // 750 credits
        researchLabs: 3, // 600 credits
        communicationArray: 2, // 500 credits
        emergencyReserves: 10 // 500 credits
      }; // Total: 2850 credits (exceeds 1000 budget)

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.isValid).toBe(false);
      expect(validation.totalCost).toBe(2850);
      expect(validation.errors).toContain('Total cost (2850) exceeds budget (1000)');
    });

    it('should reject negative investment values', () => {
      const allocation: InvestmentAllocation = {
        scouts: -1,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('scouts cannot be negative');
    });

    it('should reject investment levels exceeding maximum', () => {
      const allocation: InvestmentAllocation = {
        scouts: INVESTMENT_OPTIONS.scouts.maxLevel + 1,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(`Scout levels (${allocation.scouts}) exceed maximum (${INVESTMENT_OPTIONS.scouts.maxLevel})`);
    });

    it('should generate warning for scouts without communication array', () => {
      const allocation: InvestmentAllocation = {
        scouts: 2,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.warnings).toContain('Consider investing in Communication Array to multiply scout intel generation');
    });

    it('should generate warning for large emergency reserves', () => {
      const allocation: InvestmentAllocation = {
        scouts: 0,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 15 // 750 credits, more than 200
      };

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.warnings).toContain('Large emergency reserves have low returns (10%). Consider other investments.');
    });

    it('should generate warning for underutilized budget', () => {
      const allocation: InvestmentAllocation = {
        scouts: 1, // 100 credits
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      }; // Total: 100 credits (only 10% of budget)

      const validation = InvestmentService.validateInvestment(allocation);

      expect(validation.warnings).toContain('You have significant unused budget. Consider maximizing your investments.');
    });
  });

  describe('calculateInvestmentEffects', () => {
    it('should calculate correct investment effects for mining colony', () => {
      const allocation: InvestmentAllocation = {
        scouts: 3,
        productionUpgrades: 2,
        researchLabs: 1,
        communicationArray: 2,
        emergencyReserves: 5
      };

      const effects = InvestmentService.calculateInvestmentEffects(allocation, 'mining');

      expect(effects.intelGenerationPerRound).toBe(9); // 3 scouts * (1 + 2 communication)
      expect(effects.communicationMultiplier).toBe(3); // 1 + 2 communication levels
      expect(effects.techPatentsPerRound).toBe(1); // 1 research lab
      expect(effects.specialtyResourcesPerRound.minerals).toBe(4); // 2 upgrades * 2
      expect(effects.emergencyResourcesAvailable).toBe(Math.floor(5 * EMERGENCY_CONVERSION_RATE));
    });

    it('should calculate correct effects for agricultural colony', () => {
      const allocation: InvestmentAllocation = {
        scouts: 2,
        productionUpgrades: 3,
        researchLabs: 0,
        communicationArray: 1,
        emergencyReserves: 0
      };

      const effects = InvestmentService.calculateInvestmentEffects(allocation, 'agricultural');

      expect(effects.intelGenerationPerRound).toBe(4); // 2 scouts * (1 + 1 communication)
      expect(effects.specialtyResourcesPerRound.food).toBe(6); // 3 upgrades * 2
      expect(effects.specialtyResourcesPerRound.water).toBe(3); // secondary resource
      expect(effects.techPatentsPerRound).toBe(0);
    });

    it('should handle zero investments correctly', () => {
      const allocation: InvestmentAllocation = {
        scouts: 0,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const effects = InvestmentService.calculateInvestmentEffects(allocation, 'research');

      expect(effects.intelGenerationPerRound).toBe(0);
      expect(effects.communicationMultiplier).toBe(1);
      expect(effects.techPatentsPerRound).toBe(0);
      expect(Object.keys(effects.specialtyResourcesPerRound)).toHaveLength(0);
      expect(effects.emergencyResourcesAvailable).toBe(0);
    });

    it('should calculate different specialty resources by colony type', () => {
      const allocation: InvestmentAllocation = {
        scouts: 0,
        productionUpgrades: 2,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const miningEffects = InvestmentService.calculateInvestmentEffects(allocation, 'mining');
      const researchEffects = InvestmentService.calculateInvestmentEffects(allocation, 'research');
      const tradeHubEffects = InvestmentService.calculateInvestmentEffects(allocation, 'trade_hub');

      expect(miningEffects.specialtyResourcesPerRound.minerals).toBe(4);
      expect(researchEffects.specialtyResourcesPerRound.techComponents).toBe(4);
      expect(tradeHubEffects.specialtyResourcesPerRound.credits).toBe(4);
    });
  });

  describe('generateInvestmentOptions', () => {
    it('should generate investment options with current levels', () => {
      const currentInvestments: Investments = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 0,
        communicationArray: 1,
        emergencyReserves: 3
      };

      const options = InvestmentService.generateInvestmentOptions(currentInvestments);

      expect(options).toHaveLength(5);
      
      const scoutOption = options.find(opt => opt.id === 'scouts');
      expect(scoutOption?.currentLevel).toBe(2);
      expect(scoutOption?.name).toBe(INVESTMENT_OPTIONS.scouts.name);
      expect(scoutOption?.costPerLevel).toBe(INVESTMENT_OPTIONS.scouts.costPerLevel);
    });

    it('should include all investment types', () => {
      const options = InvestmentService.generateInvestmentOptions(mockInvestments);

      const expectedTypes = ['scouts', 'productionUpgrades', 'researchLabs', 'communicationArray', 'emergencyReserves'];
      const actualTypes = options.map(opt => opt.id);

      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
    });
  });

  describe('getInvestmentSummary', () => {
    it('should generate correct investment summary', () => {
      const investments: Investments = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 1,
        communicationArray: 1,
        emergencyReserves: 2
      };

      const summary = InvestmentService.getInvestmentSummary(investments, 'mining');

      expect(summary.totalInvested).toBe(650); // 200 + 150 + 200 + 250 + 100
      expect(summary.effects.intelGenerationPerRound).toBe(4); // 2 scouts * 2 multiplier
      expect(summary.breakdown).toHaveLength(5);
      
      const scoutBreakdown = summary.breakdown.find(b => b.name === 'Scout Network');
      expect(scoutBreakdown?.level).toBe(2);
      expect(scoutBreakdown?.cost).toBe(200);
      expect(scoutBreakdown?.effect).toContain('2 intel/round');
    });

    it('should handle zero investments in summary', () => {
      const summary = InvestmentService.getInvestmentSummary(mockInvestments, 'research');

      expect(summary.totalInvested).toBe(0);
      expect(summary.effects.intelGenerationPerRound).toBe(0);
      
      const productionBreakdown = summary.breakdown.find(b => b.name === 'Production Upgrades');
      expect(productionBreakdown?.effect).toBe('None');
    });
  });

  describe('saveTeamInvestments', () => {
    it('should save valid investment allocation', async () => {
      const mockSession = createGameSession({
        teams: [createColony({ id: 'team-1', resources: { ...createColony().resources, credits: 1500 } })]
      });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      const allocation: InvestmentAllocation = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 1,
        communicationArray: 1,
        emergencyReserves: 1
      }; // Total cost: 650

      await InvestmentService.saveTeamInvestments('session-1', 'team-1', allocation);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teams: expect.arrayContaining([
            expect.objectContaining({
              id: 'team-1',
              investments: allocation,
              resources: expect.objectContaining({
                credits: 850 // 1500 - 650
              })
            })
          ])
        })
      );
    });

    it('should reject invalid investment allocation', async () => {
      const invalidAllocation: InvestmentAllocation = {
        scouts: 10, // Exceeds budget
        productionUpgrades: 10,
        researchLabs: 10,
        communicationArray: 10,
        emergencyReserves: 10
      };

      await expect(
        InvestmentService.saveTeamInvestments('session-1', 'team-1', invalidAllocation)
      ).rejects.toThrow('Invalid investment');
    });

    it('should handle non-existent session', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => false
      } as any);

      await expect(
        InvestmentService.saveTeamInvestments('non-existent', 'team-1', mockInvestmentAllocation)
      ).rejects.toThrow('Session non-existent not found');
    });

    it('should handle non-existent team', async () => {
      const mockSession = createGameSession({
        teams: [createColony({ id: 'other-team' })]
      });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      await expect(
        InvestmentService.saveTeamInvestments('session-1', 'non-existent-team', mockInvestmentAllocation)
      ).rejects.toThrow('Team non-existent-team not found');
    });
  });

  describe('processInvestmentReturns', () => {
    it('should process investment returns correctly', async () => {
      const colony = createColony({
        id: 'team-1',
        type: 'mining',
        investments: {
          scouts: 2,
          productionUpgrades: 2,
          researchLabs: 1,
          communicationArray: 1,
          emergencyReserves: 0
        },
        resources: {
          ...createColony().resources,
          minerals: 10,
          techPatents: 5
        }
      });

      const mockSession = createGameSession({ teams: [colony] });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      await InvestmentService.processInvestmentReturns('session-1', 'team-1', 2);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teams: expect.arrayContaining([
            expect.objectContaining({
              id: 'team-1',
              resources: expect.objectContaining({
                minerals: 14, // 10 + 4 from production upgrades
                techPatents: 6 // 5 + 1 from research lab
              })
            })
          ])
        })
      );
    });
  });

  describe('convertEmergencyReserves', () => {
    it('should convert emergency reserves to basic resources', async () => {
      const colony = createColony({
        id: 'team-1',
        investments: {
          ...createColony().investments,
          emergencyReserves: 10
        },
        resources: {
          ...createColony().resources,
          oxygen: 5,
          food: 3,
          water: 2,
          energy: 4
        }
      });

      const mockSession = createGameSession({ teams: [colony] });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockUpdateDoc = vi.mocked(await import('firebase/firestore')).updateDoc;
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      const resourceDistribution = { oxygen: 0, food: 0, water: 0, energy: 1 }; // Total: 1 (matches 10 * 0.1)

      await InvestmentService.convertEmergencyReserves('session-1', 'team-1', 10, resourceDistribution);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teams: expect.arrayContaining([
            expect.objectContaining({
              id: 'team-1',
              investments: expect.objectContaining({
                emergencyReserves: 0 // 10 - 10
              }),
              resources: expect.objectContaining({
                oxygen: 5, // No change
                food: 3,   // No change
                water: 2,  // No change
                energy: 5  // 4 + 1
              })
            })
          ])
        })
      );
    });

    it('should reject conversion with insufficient reserves', async () => {
      const colony = createColony({
        id: 'team-1',
        investments: {
          ...createColony().investments,
          emergencyReserves: 5
        }
      });

      const mockSession = createGameSession({ teams: [colony] });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      await expect(
        InvestmentService.convertEmergencyReserves('session-1', 'team-1', 10, { oxygen: 1, food: 0, water: 0, energy: 0 })
      ).rejects.toThrow('Insufficient emergency reserves');
    });

    it('should reject conversion with invalid distribution', async () => {
      const colony = createColony({
        id: 'team-1',
        investments: {
          ...createColony().investments,
          emergencyReserves: 10
        }
      });

      const mockSession = createGameSession({ teams: [colony] });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      const invalidDistribution = { oxygen: 2, food: 0, water: 0, energy: 0 }; // Total: 2, but should be 1

      await expect(
        InvestmentService.convertEmergencyReserves('session-1', 'team-1', 10, invalidDistribution)
      ).rejects.toThrow('Resource distribution (2) does not match total generated (1)');
    });
  });

  describe('processAllTeamReturns', () => {
    it('should process returns for all teams in session', async () => {
      const teams = [
        createColony({
          id: 'team-1',
          type: 'mining',
          investments: {
            scouts: 0,
            productionUpgrades: 1,
            researchLabs: 1,
            communicationArray: 0,
            emergencyReserves: 0
          }
        }),
        createColony({
          id: 'team-2',
          type: 'agricultural',
          investments: {
            scouts: 0,
            productionUpgrades: 2,
            researchLabs: 0,
            communicationArray: 0,
            emergencyReserves: 0
          }
        })
      ];

      const mockSession = createGameSession({ teams });
      
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      const mockWriteBatch = vi.mocked(await import('firebase/firestore')).writeBatch;
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSession
      } as any);

      await InvestmentService.processAllTeamReturns('session-1', 2);

      expect(mockWriteBatch).toHaveBeenCalled();
      const batchInstance = mockWriteBatch.mock.results[0].value;
      expect(batchInstance.update).toHaveBeenCalled();
      expect(batchInstance.commit).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle Firebase errors gracefully', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockRejectedValue(new Error('Firebase connection failed'));

      await expect(
        InvestmentService.saveTeamInvestments('session-1', 'team-1', mockInvestmentAllocation)
      ).rejects.toThrow('Failed to save investments');
    });

    it('should handle processing errors gracefully', async () => {
      const mockGetDoc = vi.mocked(await import('firebase/firestore')).getDoc;
      mockGetDoc.mockRejectedValue(new Error('Network error'));

      await expect(
        InvestmentService.processInvestmentReturns('session-1', 'team-1', 1)
      ).rejects.toThrow('Failed to process investment returns');
    });
  });
});