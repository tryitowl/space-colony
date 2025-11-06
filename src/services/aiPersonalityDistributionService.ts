/**
 * AI Personality Distribution Service
 * 
 * Manages the distribution and variety of AI personalities within galaxies
 * to ensure interesting and diverse AI behavior patterns.
 */

import type {
  AIPersonalityType,
  AIDifficulty,
  ColonyType
} from '../types/ai.types';
import type { Galaxy } from '../types/galaxy.types';

/**
 * Personality distribution configuration
 */
export interface PersonalityDistributionConfig {
  targetVariety: number; // 0-1, how much personality variety to aim for
  difficultyInfluence: number; // 0-1, how much difficulty affects distribution
  colonyTypeInfluence: number; // 0-1, how much colony type affects personality selection
  avoidDuplicates: boolean; // Whether to avoid duplicate personalities in small galaxies
}

/**
 * Personality assignment result
 */
export interface PersonalityAssignment {
  colonyId: string;
  colonyType: ColonyType;
  personality: AIPersonalityType;
  rationale: string;
}

/**
 * Service for managing AI personality distribution across galaxies
 */
export class AIPersonalityDistributionService {
  private readonly defaultConfig: PersonalityDistributionConfig = {
    targetVariety: 0.8,
    difficultyInfluence: 0.3,
    colonyTypeInfluence: 0.4,
    avoidDuplicates: true
  };

  /**
   * Distribute personalities across AI colonies in a galaxy
   */
  distributePersonalities(
    aiColonies: Array<{ id: string; type: ColonyType }>,
    difficulty: AIDifficulty,
    config: Partial<PersonalityDistributionConfig> = {}
  ): PersonalityAssignment[] {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Get personality weights based on difficulty and preferences
    const personalityWeights = this.getPersonalityWeights(difficulty, finalConfig);
    
    // Generate assignments
    const assignments: PersonalityAssignment[] = [];
    const usedPersonalities = new Set<AIPersonalityType>();
    
    // First pass: Assign personalities based on colony type preferences
    for (const colony of aiColonies) {
      const preferredPersonalities = this.getPreferredPersonalitiesForColonyType(colony.type);
      const availablePersonalities = preferredPersonalities.filter(p => 
        !finalConfig.avoidDuplicates || !usedPersonalities.has(p) || aiColonies.length > 7
      );
      
      let selectedPersonality: AIPersonalityType;
      let rationale: string;
      
      if (availablePersonalities.length > 0) {
        // Select from preferred personalities
        selectedPersonality = this.selectWeightedPersonality(
          availablePersonalities,
          personalityWeights
        );
        rationale = `Preferred for ${colony.type} colonies`;
      } else {
        // Fallback to any available personality
        const allPersonalities = Object.keys(personalityWeights) as AIPersonalityType[];
        const availableAny = allPersonalities.filter(p => 
          !finalConfig.avoidDuplicates || !usedPersonalities.has(p)
        );
        
        if (availableAny.length > 0) {
          selectedPersonality = this.selectWeightedPersonality(availableAny, personalityWeights);
          rationale = `Alternative selection for variety`;
        } else {
          // Really small galaxy or all personalities used - allow duplicates
          selectedPersonality = this.selectWeightedPersonality(allPersonalities, personalityWeights);
          rationale = `Duplicate personality (small galaxy)`;
        }
      }
      
      assignments.push({
        colonyId: colony.id,
        colonyType: colony.type,
        personality: selectedPersonality,
        rationale
      });
      
      usedPersonalities.add(selectedPersonality);
    }
    
    // Second pass: Optimize for variety if needed
    if (finalConfig.targetVariety > 0.6 && aiColonies.length >= 4) {
      this.optimizeForVariety(assignments, finalConfig);
    }
    
    return assignments;
  }

  /**
   * Get personality weights based on difficulty
   */
  private getPersonalityWeights(
    difficulty: AIDifficulty,
    config: PersonalityDistributionConfig
  ): Record<AIPersonalityType, number> {
    const baseWeights: Record<AIPersonalityType, number> = {
      balanced_player: 1.0,
      aggressive_trader: 0.8,
      cautious_hoarder: 0.7,
      opportunistic: 0.9,
      cooperative: 0.8,
      competitive: 0.8,
      specialist: 0.6
    };
    
    // Adjust weights based on difficulty
    const difficultyMultiplier = config.difficultyInfluence;
    
    switch (difficulty) {
      case 'easy':
        // Favor simpler personalities on easy
        baseWeights.balanced_player *= (1 + difficultyMultiplier * 0.5);
        baseWeights.cooperative *= (1 + difficultyMultiplier * 0.3);
        baseWeights.cautious_hoarder *= (1 + difficultyMultiplier * 0.2);
        baseWeights.competitive *= (1 - difficultyMultiplier * 0.3);
        baseWeights.opportunistic *= (1 - difficultyMultiplier * 0.2);
        break;
        
      case 'hard':
        // Favor more complex personalities on hard
        baseWeights.opportunistic *= (1 + difficultyMultiplier * 0.4);
        baseWeights.competitive *= (1 + difficultyMultiplier * 0.3);
        baseWeights.specialist *= (1 + difficultyMultiplier * 0.5);
        baseWeights.aggressive_trader *= (1 + difficultyMultiplier * 0.2);
        baseWeights.balanced_player *= (1 - difficultyMultiplier * 0.2);
        break;
        
      case 'medium':
        // Balanced distribution
        break;
    }
    
    return baseWeights;
  }

  /**
   * Get preferred personalities for each colony type
   */
  private getPreferredPersonalitiesForColonyType(
    colonyType: ColonyType
  ): AIPersonalityType[] {
    const preferences: Record<ColonyType, AIPersonalityType[]> = {
      mining: ['aggressive_trader', 'specialist', 'competitive'],
      agricultural: ['cautious_hoarder', 'cooperative', 'balanced_player'],
      research: ['specialist', 'opportunistic', 'balanced_player'],
      military: ['competitive', 'aggressive_trader', 'cautious_hoarder'],
      manufacturing: ['balanced_player', 'specialist', 'cooperative'],
      trade_hub: ['opportunistic', 'aggressive_trader', 'cooperative']
    };
    
    return preferences[colonyType] || ['balanced_player'];
  }

  /**
   * Select personality using weighted random selection
   */
  private selectWeightedPersonality(
    personalities: AIPersonalityType[],
    weights: Record<AIPersonalityType, number>
  ): AIPersonalityType {
    const weightedPersonalities = personalities.map(p => ({
      personality: p,
      weight: weights[p] || 0.5
    }));
    
    const totalWeight = weightedPersonalities.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { personality, weight } of weightedPersonalities) {
      random -= weight;
      if (random <= 0) {
        return personality;
      }
    }
    
    // Fallback to first personality
    return personalities[0];
  }

  /**
   * Optimize assignments for personality variety
   */
  private optimizeForVariety(
    assignments: PersonalityAssignment[],
    _config: PersonalityDistributionConfig
  ): void {
    const personalityCounts = new Map<AIPersonalityType, number>();
    
    // Count current distributions
    assignments.forEach(assignment => {
      const current = personalityCounts.get(assignment.personality) || 0;
      personalityCounts.set(assignment.personality, current + 1);
    });
    
    // Find over-represented personalities
    const maxAllowed = Math.ceil(assignments.length / 5); // Max 20% of any personality
    const overRepresented = Array.from(personalityCounts.entries())
      .filter(([_, count]) => count > maxAllowed)
      .map(([personality, _]) => personality);
    
    if (overRepresented.length === 0) return;
    
    // Find under-represented personalities
    const allPersonalities: AIPersonalityType[] = [
      'balanced_player', 'aggressive_trader', 'cautious_hoarder',
      'opportunistic', 'cooperative', 'competitive', 'specialist'
    ];
    
    const underRepresented = allPersonalities.filter(p => 
      (personalityCounts.get(p) || 0) < maxAllowed
    );
    
    if (underRepresented.length === 0) return;
    
    // Swap some assignments to improve variety
    const swapCount = Math.min(
      Math.floor(assignments.length * 0.3), // Max 30% swaps
      overRepresented.length * 2
    );
    
    for (let i = 0; i < swapCount; i++) {
      const overRepresentedPersonality = overRepresented[i % overRepresented.length];
      const underRepresentedPersonality = underRepresented[i % underRepresented.length];
      
      // Find assignment to swap
      const assignmentIndex = assignments.findIndex(a => 
        a.personality === overRepresentedPersonality
      );
      
      if (assignmentIndex !== -1) {
        assignments[assignmentIndex].personality = underRepresentedPersonality;
        assignments[assignmentIndex].rationale += ' (optimized for variety)';
        
        // Update counts
        const oldCount = personalityCounts.get(overRepresentedPersonality) || 0;
        personalityCounts.set(overRepresentedPersonality, oldCount - 1);
        
        const newCount = personalityCounts.get(underRepresentedPersonality) || 0;
        personalityCounts.set(underRepresentedPersonality, newCount + 1);
      }
    }
  }

  /**
   * Generate personality distribution for a specific galaxy configuration
   */
  generateForGalaxy(
    galaxy: Galaxy,
    aiColonyCount: number,
    difficulty: AIDifficulty
  ): PersonalityAssignment[] {
    // Extract AI colonies from galaxy
    const aiTeams = galaxy.teams?.filter(team => team.isAIControlled) || [];
    const aiColonies = aiTeams.slice(0, aiColonyCount).map(team => ({
      id: team.id,
      type: team.type
    }));
    
    // Determine distribution config based on galaxy size and theme
    const totalTeams = galaxy.totalTeams ?? 6;
    const config: Partial<PersonalityDistributionConfig> = {
      targetVariety: totalTeams > 8 ? 0.9 : 0.7,
      avoidDuplicates: totalTeams <= 7,
      difficultyInfluence: difficulty === 'hard' ? 0.4 : 0.2
    };
    
    return this.distributePersonalities(aiColonies, difficulty, config);
  }

  /**
   * Validate personality distribution quality
   */
  validateDistribution(assignments: PersonalityAssignment[]): {
    score: number; // 0-1, higher is better
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 1.0;
    
    if (assignments.length === 0) {
      return { score: 0, issues: ['No assignments provided'], recommendations: [] };
    }
    
    // Check personality variety
    const personalitySet = new Set(assignments.map(a => a.personality));
    const varietyRatio = personalitySet.size / Math.min(assignments.length, 7);
    
    if (varietyRatio < 0.6) {
      issues.push('Low personality variety');
      recommendations.push('Consider increasing personality diversity');
      score *= 0.8;
    }
    
    // Check for over-concentration
    const personalityCounts = new Map<AIPersonalityType, number>();
    assignments.forEach(a => {
      const count = personalityCounts.get(a.personality) || 0;
      personalityCounts.set(a.personality, count + 1);
    });
    
    const maxCount = Math.max(...Array.from(personalityCounts.values()));
    const concentrationRatio = maxCount / assignments.length;
    
    if (concentrationRatio > 0.5 && assignments.length > 4) {
      issues.push(`One personality type represents ${Math.round(concentrationRatio * 100)}% of AI colonies`);
      recommendations.push('Redistribute personalities for better balance');
      score *= 0.7;
    }
    
    // Check colony type alignment
    const misalignedCount = assignments.filter(a => {
      const preferred = this.getPreferredPersonalitiesForColonyType(a.colonyType);
      return !preferred.includes(a.personality) && !a.rationale.includes('variety');
    }).length;
    
    if (misalignedCount > assignments.length * 0.3) {
      issues.push('Many personalities don\'t match colony types well');
      recommendations.push('Align personalities better with colony specializations');
      score *= 0.9;
    }
    
    return { score, issues, recommendations };
  }

  /**
   * Get recommended personality for a specific context
   */
  getRecommendedPersonality(
    colonyType: ColonyType,
    difficulty: AIDifficulty,
    existingPersonalities: AIPersonalityType[]
  ): {
    personality: AIPersonalityType;
    confidence: number;
    reasoning: string;
  } {
    const preferred = this.getPreferredPersonalitiesForColonyType(colonyType);
    const weights = this.getPersonalityWeights(difficulty, this.defaultConfig);
    
    // Filter out existing personalities if possible
    let available = preferred.filter(p => !existingPersonalities.includes(p));
    
    if (available.length === 0) {
      available = preferred; // Allow duplicates if necessary
    }
    
    // Select best match
    const selected = this.selectWeightedPersonality(available, weights);
    
    // Calculate confidence
    const isPreferred = preferred.includes(selected);
    const isDuplicate = existingPersonalities.includes(selected);
    const baseConfidence = isPreferred ? 0.8 : 0.6;
    const finalConfidence = isDuplicate ? baseConfidence * 0.7 : baseConfidence;
    
    // Generate reasoning
    let reasoning = `${selected} is `;
    if (isPreferred) {
      reasoning += `well-suited for ${colonyType} colonies`;
    } else {
      reasoning += `a good alternative for ${colonyType} colonies`;
    }
    
    if (isDuplicate) {
      reasoning += ` (duplicate personality)`;
    }
    
    return {
      personality: selected,
      confidence: finalConfidence,
      reasoning
    };
  }
}

// Export singleton instance
export const aiPersonalityDistributionService = new AIPersonalityDistributionService();