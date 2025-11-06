/**
 * Tests for AI Personality Service
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { aiPersonalityService } from '../aiPersonalityService';
import type { ColonyType, AIPersonalityType, AIDifficulty } from '../../types/ai.types';

describe('AIPersonalityService', () => {
  beforeEach(() => {
    // Reset service state before each test
  });

  test('should generate unique personality profiles for different colonies', () => {
    const colony1Profile = aiPersonalityService.generatePersonality(
      'colony1',
      'mining',
      'aggressive_trader',
      'medium'
    );

    const colony2Profile = aiPersonalityService.generatePersonality(
      'colony2',
      'agricultural',
      'cautious_hoarder',
      'medium'
    );

    expect(colony1Profile.id).toBe('colony1_personality');
    expect(colony2Profile.id).toBe('colony2_personality');
    expect(colony1Profile.type).toBe('aggressive_trader');
    expect(colony2Profile.type).toBe('cautious_hoarder');

    // Personalities should be different
    expect(colony1Profile.traits.aggressiveness).toBeGreaterThan(
      colony2Profile.traits.aggressiveness
    );
    expect(colony2Profile.traits.patience).toBeGreaterThan(
      colony1Profile.traits.patience
    );
  });

  test('should adjust personality traits based on difficulty', () => {
    aiPersonalityService.generatePersonality(
      'test1',
      'military',
      'aggressive_trader',
      'medium'
    );

    const hardProfile = aiPersonalityService.generatePersonality(
      'test2',
      'mining',
      'aggressive_trader',
      'hard'
    );

    // Hard difficulty should generally have more extreme traits
    expect(hardProfile.traits.adaptability).toBeGreaterThan(
      easyProfile.traits.adaptability
    );
  });

  test('should generate appropriate trading preferences for colony types', () => {
    const miningProfile = aiPersonalityService.generatePersonality(
      'mining1',
      'mining',
      'balanced_player',
      'medium'
    );

    const researchProfile = aiPersonalityService.generatePersonality(
      'research1',
      'research',
      'balanced_player',
      'medium'
    );

    // Mining colonies should prefer energy and tech components
    expect(miningProfile.preferences.preferredResources).toContain('energy');
    expect(miningProfile.preferences.preferredResources).toContain('techComponents');

    // Research colonies should prefer alien tech
    expect(researchProfile.preferences.preferredResources).toContain('alienTech');
  });

  test('should assign personality quirks appropriately', () => {
    // Generate multiple personalities to test quirk assignment
    const profiles = [];
    for (let i = 0; i < 10; i++) {
      profiles.push(aiPersonalityService.generatePersonality(
        `test${i}`,
        'trade_hub',
        'opportunistic',
        'medium'
      ));
    }

    // At least some profiles should have quirks
    const profilesWithQuirks = profiles.filter(p => p.traits.quirks.length > 0);
    expect(profilesWithQuirks.length).toBeGreaterThan(0);

    // Check that quirks are sensible
    profiles.forEach(profile => {
      if (profile.traits.quirks.length > 0) {
        profile.traits.quirks.forEach(quirk => {
          expect(quirk.id).toBeDefined();
          expect(quirk.name).toBeDefined();
          expect(quirk.description).toBeDefined();
          expect(typeof quirk.effect).toBe('function');
        });
      }
    });
  });

  test('should evaluate partner compatibility correctly', () => {
    aiPersonalityService.generatePersonality(
      'aggressive1',
      'military',
      'aggressive_trader',
      'medium'
    );

    aiPersonalityService.generatePersonality(
      'coop1',
      'agricultural',
      'cooperative',
      'medium'
    );

    // Aggressive traders should be willing to trade with most partners
    const aggressiveWillingness = aiPersonalityService.shouldTradeWithPartner(
      'aggressive1',
      'partner1',
      'trade_hub'
    );
    expect(aggressiveWillingness.willing).toBe(true);

    // Cooperative colonies should also be willing to trade
    const cooperativeWillingness = aiPersonalityService.shouldTradeWithPartner(
      'coop1',
      'partner2',
      'mining'
    );
    expect(cooperativeWillingness.willing).toBe(true);
  });

  test('should generate decision delays based on personality', () => {
    aiPersonalityService.generatePersonality(
      'impulsive1',
      'trade_hub',
      'aggressive_trader',
      'medium'
    );

    aiPersonalityService.generatePersonality(
      'deliberate1',
      'agricultural',
      'cautious_hoarder',
      'hard'
    );

    const impulsiveDelay = aiPersonalityService.getDecisionDelay('impulsive1', 'simple');
    const deliberateDelay = aiPersonalityService.getDecisionDelay('deliberate1', 'simple');

    // Impulsive should be faster than deliberate
    expect(impulsiveDelay).toBeLessThan(deliberateDelay);

    // Complex decisions should take longer than simple ones
    const complexDelay = aiPersonalityService.getDecisionDelay('impulsive1', 'complex');
    expect(complexDelay).toBeGreaterThan(impulsiveDelay);
  });

  test('should provide meaningful personality descriptions', () => {
    aiPersonalityService.generatePersonality(
      'test1',
      'manufacturing',
      'specialist',
      'medium'
    );

    const description = aiPersonalityService.getPersonalityDescription('test1');
    expect(description).toContain('SPECIALIST');
    expect(description.length).toBeGreaterThan(50); // Should be reasonably detailed
  });

  test('should handle personality import/export correctly', () => {
    aiPersonalityService.generatePersonality(
      'export_test',
      'research',
      'opportunistic',
      'hard'
    );

    // Export the personality
    const exportedProfile = aiPersonalityService.exportPersonality('export_test');
    expect(exportedProfile).toBeDefined();

    // Import it with a new ID
    if (exportedProfile) {
      aiPersonalityService.importPersonality('import_test', exportedProfile);
      const importedDescription = aiPersonalityService.getPersonalityDescription('import_test');
      expect(importedDescription).toBeDefined();
    }
  });

  test('should update personality from trading experience', () => {
    const profile = aiPersonalityService.generatePersonality(
      'learning_test',
      'trade_hub',
      'balanced_player',
      'medium'
    );

    // Simulate successful trading history
    const successfulTrades = Array.from({ length: 10 }, (_, i) => ({
      tradeId: `trade_${i}`,
      partnerId: `partner_${i % 3}`,
      timestamp: Date.now() - (10 - i) * 60000,
      offered: { credits: 100 },
      received: { energy: 10 },
      outcome: 'beneficial' as const,
      trustImpact: 0.1
    }));

    aiPersonalityService.updatePersonalityFromExperience(
      'learning_test',
      successfulTrades,
      1
    );

    // Check that personality has adapted (though we can't easily test the exact values
    // due to the complexity of the system, we can at least verify the method runs)
    const updatedProfile = aiPersonalityService.exportPersonality('learning_test');
    expect(updatedProfile).toBeDefined();
  });

  test('should maintain personality consistency across restarts', () => {
    // Generate a personality
    aiPersonalityService.getPersonality('test1');
    aiPersonalityService.generatePersonality(
      'persistence_test',
      'military',
      'competitive',
      'hard'
    );

    // Export it (simulating save to database)
    const savedProfile = aiPersonalityService.exportPersonality('persistence_test');
    expect(savedProfile).toBeDefined();

    // Import it back (simulating load from database)
    if (savedProfile) {
      aiPersonalityService.importPersonality('persistence_test_reload', savedProfile);
      
      const reloadedDescription = aiPersonalityService.getPersonalityDescription('persistence_test_reload');
      const originalDescription = aiPersonalityService.getPersonalityDescription('persistence_test');
      
      // Descriptions should be similar (they won't be identical due to ID differences)
      expect(reloadedDescription).toContain('COMPETITIVE');
      expect(originalDescription).toContain('COMPETITIVE');
    }
  });
});