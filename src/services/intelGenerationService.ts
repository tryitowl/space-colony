import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  arrayUnion,
  writeBatch,
  serverTimestamp,
  runTransaction,
  Transaction
} from 'firebase/firestore';
import { ref, set, push } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { AuthService } from './authService';
import type { IntelItem, Colony } from '../types';
import type { IntelTemplate } from '../types/intel.types';
import { IntelTemplateLoader } from '../utils/intelTemplateLoader';

export interface IntelDistributionConfig {
  sessionId: string;
  round: number;
  teams: Colony[];
  globalEvents?: string[];
}

export class IntelGenerationService {
  private static templateLoader = IntelTemplateLoader.getInstance();
  
  // Legacy - templates now loaded from external config
  private static readonly INTEL_TEMPLATES: Record<number, IntelTemplate[]> = {
    1: [
      {
        type: 'market_intel',
        title: 'Initial Market Analysis',
        content: 'Early trade patterns show {colony_a} specializing in {resource_type} production. Recommend establishing trade routes early.',
        baseValue: 50,
        applicableRounds: [1, 2],
        exclusivity: 'shared',
        minScoutLevel: 1
      },
      {
        type: 'survey_report',
        title: 'Resource Deposit Scan',
        content: 'Geological surveys indicate rich {mineral_type} deposits in sector {grid_location}. Estimated yield: +{amount} per round.',
        baseValue: 75,
        applicableRounds: [2, 3],
        exclusivity: 'exclusive',
        minScoutLevel: 1
      },
      {
        type: 'discovery',
        title: 'Emergency Supply Cache',
        content: 'Abandoned facility discovered containing {resource_list}. Location: {coordinates}. First-come-first-served basis.',
        baseValue: 100,
        applicableRounds: [1, 2],
        exclusivity: 'exclusive',
        minScoutLevel: 2
      },
      {
        type: 'market_intel',
        title: 'Trade Route Efficiency',
        content: 'Analysis shows direct trades between {colony_type1} and {colony_type2} are 25% more efficient due to resource compatibility.',
        baseValue: 60,
        applicableRounds: [1, 2, 3],
        exclusivity: 'shared'
      }
    ],
    2: [
      {
        type: 'crisis_warning',
        title: 'System Maintenance Alert',
        content: 'Critical infrastructure in {affected_colonies} showing signs of wear. Maintenance costs will double next round unless addressed.',
        baseValue: 120,
        applicableRounds: [3],
        exclusivity: 'shared',
        minScoutLevel: 1
      },
      {
        type: 'competitive',
        title: 'Investment Intelligence',
        content: '{target_colony} has heavily invested in {investment_type}. This will impact {affected_resources} availability next round.',
        baseValue: 90,
        applicableRounds: [3, 4],
        exclusivity: 'exclusive',
        minScoutLevel: 2
      },
      {
        type: 'market_intel',
        title: 'Supply Chain Disruption',
        content: 'Transport routes to {affected_regions} compromised. {resource_type} deliveries delayed, prices expected to rise 30%.',
        baseValue: 110,
        applicableRounds: [3],
        exclusivity: 'shared'
      },
      {
        type: 'discovery',
        title: 'Technology Breakthrough',
        content: 'Research breakthrough in {tech_area} unlocks new production methods. {benefits_description}',
        baseValue: 150,
        applicableRounds: [3, 4, 5],
        exclusivity: 'exclusive',
        minScoutLevel: 3
      }
    ],
    3: [
      {
        type: 'prediction',
        title: 'Crisis Probability Analysis',
        content: 'Advanced modeling suggests 85% probability of {crisis_type} affecting {target_colonies} in round {target_round}.',
        baseValue: 140,
        applicableRounds: [4, 5],
        exclusivity: 'exclusive',
        minScoutLevel: 2
      },
      {
        type: 'alien',
        title: 'First Contact Protocols',
        content: 'Alien civilization detected. Technology exchange protocols available. They seek {requested_resources} in exchange for {offered_tech}.',
        baseValue: 200,
        applicableRounds: [3, 4, 5],
        exclusivity: 'public'
      },
      {
        type: 'competitive',
        title: 'Alliance Formation',
        content: 'Intelligence indicates {colony_list} forming strategic alliance against {threat}. Join requirements: {conditions}',
        baseValue: 160,
        applicableRounds: [4, 5],
        exclusivity: 'shared',
        minScoutLevel: 2
      },
      {
        type: 'discovery',
        title: 'Ancient Technology Cache',
        content: 'Alien artifact discovered with advanced {tech_type}. Requires {activation_cost} to activate. Benefits: {tech_benefits}',
        baseValue: 250,
        applicableRounds: [4, 5],
        exclusivity: 'exclusive',
        minScoutLevel: 3,
        maxDistribution: 1
      }
    ],
    4: [
      {
        type: 'strategy',
        title: 'Victory Path Analysis',
        content: 'Optimal victory conditions identified for {colony_type}: {strategy_details}. Implementation window: next round only.',
        baseValue: 180,
        applicableRounds: [5],
        exclusivity: 'exclusive',
        minScoutLevel: 2
      },
      {
        type: 'alien',
        title: 'Advanced Alien Technology',
        content: 'Aliens offer exclusive {alien_tech_type} technology. Exchange rate: {exchange_terms}. Limited availability.',
        baseValue: 220,
        applicableRounds: [4, 5],
        exclusivity: 'shared'
      },
      {
        type: 'competitive',
        title: 'Elimination Risk Analysis',
        content: '{vulnerable_colonies} showing critical resource shortages. Predicted elimination in {rounds_remaining} rounds unless aided.',
        baseValue: 130,
        applicableRounds: [5],
        exclusivity: 'shared',
        minScoutLevel: 1
      },
      {
        type: 'market_intel',
        title: 'Final Market Surge',
        content: 'End-game resource demand spike predicted. {resource_types} values will increase 50% in final round.',
        baseValue: 150,
        applicableRounds: [5],
        exclusivity: 'shared'
      }
    ],
    5: [
      {
        type: 'endgame',
        title: 'Victory Countdown',
        content: 'Current leader: {leading_colony} with {point_total} points. Catch-up strategy for {player_colony}: {recommendations}',
        baseValue: 200,
        applicableRounds: [5],
        exclusivity: 'exclusive',
        minScoutLevel: 1
      },
      {
        type: 'urgent',
        title: 'Last Chance Alert',
        content: 'Final trade window active. Colonies {at_risk_list} require immediate assistance to avoid elimination.',
        baseValue: 180,
        applicableRounds: [5],
        exclusivity: 'shared'
      },
      {
        type: 'alien',
        title: 'Alien Departure Warning',
        content: 'Alien fleet preparing to depart. Final opportunity for technology exchange expires in {time_remaining}.',
        baseValue: 160,
        applicableRounds: [5],
        exclusivity: 'public'
      },
      {
        type: 'discovery',
        title: 'Emergency Resource Boost',
        content: 'Hidden emergency protocols activated. All colonies gain +50% resource generation this round.',
        baseValue: 120,
        applicableRounds: [5],
        exclusivity: 'public'
      }
    ]
  };

  // Generate intel for a specific team based on their scout investments
  static async generateIntelForTeam(
    sessionId: string,
    teamId: string,
    scoutLevel: number,
    communicationLevel: number,
    currentRound: number
  ): Promise<IntelItem[]> {
    try {
      await AuthService.ensureAuthenticated();
      
      const generatedIntel: IntelItem[] = [];
      
      // Calculate base intel generation (1 intel per round per scout level)
      const baseIntelCount = scoutLevel;
      
      // Communication array multiplier (2x for level 1, 3x for level 2)
      const communicationMultiplier = communicationLevel === 0 ? 1 : 
                                    communicationLevel === 1 ? 2 : 3;
      
      const totalIntelCount = Math.min(baseIntelCount * communicationMultiplier, 8); // Cap at 8 intel pieces
      
      // Get available templates for current round from external config
      const availableTemplates = this.templateLoader.getTemplatesForRound(currentRound);
      
      // Filter templates based on scout level requirements
      const eligibleTemplates = availableTemplates.filter(template => 
        !template.minScoutLevel || scoutLevel >= template.minScoutLevel
      );
      
      if (eligibleTemplates.length === 0) {
        console.warn(`No eligible intel templates for round ${currentRound}, scout level ${scoutLevel}`);
        return [];
      }
      
      // Get session context for intel contextualization
      const sessionContext = await this.getSessionContext(sessionId);
      
      // Generate intel pieces
      for (let i = 0; i < totalIntelCount; i++) {
        const template = this.selectIntelTemplate(eligibleTemplates, scoutLevel, communicationLevel);
        const contextualizedIntel = await this.contextualizeIntel(template, sessionContext, teamId, currentRound);
        
        // Calculate final value with communication array bonus
        const finalValue = template.baseValue + (communicationLevel * 10);
        
        const intelItem: IntelItem = {
          id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: contextualizedIntel.title,
          content: contextualizedIntel.content,
          value: finalValue,
          distributionCount: 0,
          roundGenerated: currentRound,
          source: 'scout'
        };
        
        generatedIntel.push(intelItem);
        
        // Save intel to database
        await setDoc(
          doc(firestore, 'sessions', sessionId, 'intel', intelItem.id),
          {
            ...intelItem,
            templateType: template.type,
            exclusivity: template.exclusivity,
            applicableRounds: template.applicableRounds,
            maxDistribution: template.maxDistribution,
            createdAt: new Date().toISOString(),
            expiresAt: this.calculateExpirationTime(currentRound, template.applicableRounds)
          }
        );
      }
      
      // Add intel to team's resources
      await this.addIntelToTeam(sessionId, teamId, generatedIntel);
      
      // Send real-time notification
      await this.broadcastIntelAlert(sessionId, teamId, generatedIntel);
      
      return generatedIntel;
    } catch (error) {
      console.error('Failed to generate intel for team:', error);
      return [];
    }
  }

  // Generate market intel from communication array investments
  static async generateMarketIntel(
    sessionId: string,
    teamId: string,
    communicationLevel: number,
    currentRound: number
  ): Promise<IntelItem[]> {
    if (communicationLevel === 0) return [];

    try {
      const marketIntelTemplates = [
        {
          type: 'market_intel' as const,
          title: 'Market Trend Analysis',
          content: 'Advanced market analysis reveals {trend_direction} trend in {resource_category}. Projected {percentage}% change next round.',
          baseValue: 70,
          applicableRounds: [currentRound + 1],
          exclusivity: 'shared' as const
        },
        {
          type: 'market_intel' as const,
          title: 'Trade Volume Report',
          content: 'Communication networks report high trade activity between {colony_types}. Optimal trade timing: {time_window}.',
          baseValue: 60,
          applicableRounds: [currentRound + 1],
          exclusivity: 'shared' as const
        },
        {
          type: 'market_intel' as const,
          title: 'Resource Demand Forecast',
          content: 'Predictive algorithms indicate surge in {resource_type} demand from {demanding_colonies}. Recommended action: {action}.',
          baseValue: 80,
          applicableRounds: [currentRound + 1],
          exclusivity: 'shared' as const
        }
      ];

      const selectedTemplate = marketIntelTemplates[Math.floor(Math.random() * marketIntelTemplates.length)];
      const sessionContext = await this.getSessionContext(sessionId);
      const contextualizedIntel = await this.contextualizeIntel(selectedTemplate, sessionContext, teamId, currentRound);
      
      const intelItem: IntelItem = {
        id: `market_intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: contextualizedIntel.title,
        content: contextualizedIntel.content,
        value: selectedTemplate.baseValue + (communicationLevel * 15),
        distributionCount: 0,
        roundGenerated: currentRound,
        source: 'communication'
      };

      // Save to database
      await setDoc(
        doc(firestore, 'sessions', sessionId, 'intel', intelItem.id),
        {
          ...intelItem,
          templateType: selectedTemplate.type,
          exclusivity: 'shared',
          applicableRounds: selectedTemplate.applicableRounds,
          createdAt: new Date().toISOString(),
          expiresAt: this.calculateExpirationTime(currentRound, selectedTemplate.applicableRounds)
        }
      );

      await this.addIntelToTeam(sessionId, teamId, [intelItem]);
      await this.broadcastIntelAlert(sessionId, teamId, [intelItem]);
      
      return [intelItem];
    } catch (error) {
      console.error('Failed to generate market intel:', error);
      return [];
    }
  }

  // Distribute round-specific intel to all teams
  static async distributeRoundIntel(config: IntelDistributionConfig): Promise<void> {
    try {
      const { sessionId, round, teams } = config;
      const batch = writeBatch(firestore);
      
      // Get public intel templates for this round
      const roundTemplates = this.INTEL_TEMPLATES[round]?.filter(
        template => template.exclusivity === 'public'
      ) || [];
      
      const sessionContext = await this.getSessionContext(sessionId);
      
      for (const template of roundTemplates) {
        const contextualizedIntel = await this.contextualizeIntel(template, sessionContext, 'all', round);
        
        const intelItem: IntelItem = {
          id: `round_intel_${round}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: contextualizedIntel.title,
          content: contextualizedIntel.content,
          value: template.baseValue,
          distributionCount: teams.length, // Distributed to all teams
          roundGenerated: round,
          source: 'communication'
        };
        
        // Save intel document
        const intelDocRef = doc(firestore, 'sessions', sessionId, 'intel', intelItem.id);
        batch.set(intelDocRef, {
          ...intelItem,
          templateType: template.type,
          exclusivity: template.exclusivity,
          applicableRounds: template.applicableRounds,
          createdAt: new Date().toISOString(),
          expiresAt: this.calculateExpirationTime(round, template.applicableRounds)
        });
        
        // Add to all teams
        for (const team of teams) {
          if (!team.eliminationStatus?.isEliminated) {
            const teamRef = doc(firestore, 'sessions', sessionId, 'teams', team.id);
            batch.update(teamRef, {
              'resources.crisisWarnings': arrayUnion(intelItem)
            });
          }
        }
      }
      
      await batch.commit();
      
      // Broadcast to all teams
      await this.broadcastRoundIntelDistribution(sessionId, round);
      
    } catch (error) {
      console.error('Failed to distribute round intel:', error);
    }
  }

  // Calculate intel value with degradation
  static calculateIntelValue(intel: IntelItem, currentRound: number): number {
    const agePenalty = Math.max(0, (currentRound - intel.roundGenerated) * 0.1); // 10% per round
    const distributionPenalty = intel.distributionCount * 0.15; // 15% per distribution
    const totalPenalty = agePenalty + distributionPenalty;
    
    return Math.max(10, Math.floor(intel.value * (1 - totalPenalty)));
  }

  // Transfer intel between teams
  static async transferIntel(
    sessionId: string,
    fromTeamId: string,
    toTeamId: string,
    intelIds: string[]
  ): Promise<boolean> {
    try {
      await AuthService.ensureAuthenticated();
      
      // Use transaction to ensure atomic transfer
      await runTransaction(firestore, async (transaction: Transaction) => {
        // Get both teams
        const fromTeamRef = doc(firestore, 'sessions', sessionId, 'teams', fromTeamId);
        const toTeamRef = doc(firestore, 'sessions', sessionId, 'teams', toTeamId);
        
        const fromTeamDoc = await transaction.get(fromTeamRef);
        const toTeamDoc = await transaction.get(toTeamRef);
        
        if (!fromTeamDoc.exists() || !toTeamDoc.exists()) {
          throw new Error('One or both teams not found');
        }
        
        const fromTeam = fromTeamDoc.data() as Colony;
        const toTeam = toTeamDoc.data() as Colony;
        
        // Collect all intel from source team
        const allSourceIntel = [
          ...(fromTeam.resources.marketIntel || []),
          ...(fromTeam.resources.surveyReports || []),
          ...(fromTeam.resources.crisisWarnings || [])
        ];
        
        // Find the intel items to transfer
        const intelToTransfer: IntelItem[] = [];
        const remainingIntel: {
          marketIntel: IntelItem[];
          surveyReports: IntelItem[];
          crisisWarnings: IntelItem[];
        } = {
          marketIntel: [...(fromTeam.resources.marketIntel || [])],
          surveyReports: [...(fromTeam.resources.surveyReports || [])],
          crisisWarnings: [...(fromTeam.resources.crisisWarnings || [])]
        };
        
        // Remove intel from source team and collect for transfer
        for (const intelId of intelIds) {
          const intelItem = allSourceIntel.find(i => i.id === intelId);
          
          if (!intelItem) {
            throw new Error(`Team ${fromTeamId} does not own intel: ${intelId}`);
          }
          
          intelToTransfer.push(intelItem);
          
          // Remove from appropriate array
          if (remainingIntel.marketIntel.some(i => i.id === intelId)) {
            remainingIntel.marketIntel = remainingIntel.marketIntel.filter(i => i.id !== intelId);
          } else if (remainingIntel.surveyReports.some(i => i.id === intelId)) {
            remainingIntel.surveyReports = remainingIntel.surveyReports.filter(i => i.id !== intelId);
          } else if (remainingIntel.crisisWarnings.some(i => i.id === intelId)) {
            remainingIntel.crisisWarnings = remainingIntel.crisisWarnings.filter(i => i.id !== intelId);
          }
        }
        
        // Update distribution count for each intel item
        for (const intel of intelToTransfer) {
          const intelRef = doc(firestore, 'sessions', sessionId, 'intel', intel.id);
          const intelDoc = await transaction.get(intelRef);
          
          if (intelDoc.exists()) {
            const currentDistribution = intelDoc.data().distributionCount || 0;
            transaction.update(intelRef, {
              distributionCount: currentDistribution + 1,
              lastTransferredAt: new Date().toISOString(),
              transferHistory: arrayUnion({
                from: fromTeamId,
                to: toTeamId,
                timestamp: Date.now()
              })
            });
          }
        }
        
        // Categorize intel for destination team
        const newIntelForDestination = {
          marketIntel: intelToTransfer.filter(i => 
            i.source === 'communication' || i.title.includes('Market') || i.title.includes('Trade')
          ),
          surveyReports: intelToTransfer.filter(i => 
            i.source === 'scout' && !i.title.includes('Market') && !i.title.includes('Crisis') && !i.title.includes('Warning')
          ),
          crisisWarnings: intelToTransfer.filter(i => 
            i.title.includes('Crisis') || i.title.includes('Warning') || i.title.includes('Alert')
          )
        };
        
        // Update source team (remove intel)
        transaction.update(fromTeamRef, {
          'resources.marketIntel': remainingIntel.marketIntel,
          'resources.surveyReports': remainingIntel.surveyReports,
          'resources.crisisWarnings': remainingIntel.crisisWarnings,
          updatedAt: serverTimestamp()
        });
        
        // Update destination team (add intel)
        transaction.update(toTeamRef, {
          'resources.marketIntel': arrayUnion(...newIntelForDestination.marketIntel),
          'resources.surveyReports': arrayUnion(...newIntelForDestination.surveyReports),
          'resources.crisisWarnings': arrayUnion(...newIntelForDestination.crisisWarnings),
          updatedAt: serverTimestamp()
        });
      });
      
      // Send notifications
      await this.broadcastIntelTransfer(sessionId, fromTeamId, toTeamId, intelIds.length);
      
      return true;
    } catch (error) {
      console.error('Failed to transfer intel:', error);
      return false;
    }
  }

  // Broadcast intel transfer notification
  private static async broadcastIntelTransfer(
    sessionId: string,
    fromTeamId: string,
    toTeamId: string,
    intelCount: number
  ): Promise<void> {
    try {
      const transferData = {
        type: 'intel_transfer',
        message: `${intelCount} intelligence item${intelCount > 1 ? 's' : ''} transferred`,
        from: fromTeamId,
        to: toTeamId,
        timestamp: Date.now(),
        priority: 'medium'
      };

      // Notify both teams
      await Promise.all([
        push(
          ref(realtimeDb, `sessions/${sessionId}/live/notifications/${fromTeamId}`),
          { ...transferData, direction: 'sent' }
        ),
        push(
          ref(realtimeDb, `sessions/${sessionId}/live/notifications/${toTeamId}`),
          { ...transferData, direction: 'received' }
        )
      ]);
    } catch (error) {
      console.warn('Failed to broadcast intel transfer:', error);
    }
  }

  // Helper method to select intel template based on scout and communication levels
  private static selectIntelTemplate(
    eligibleTemplates: IntelTemplate[],
    scoutLevel: number,
    communicationLevel: number
  ): IntelTemplate {
    // Higher scout/communication levels have better chance of getting exclusive intel
    const exclusiveChance = Math.min(0.8, (scoutLevel + communicationLevel) * 0.2);
    
    if (Math.random() < exclusiveChance) {
      const exclusiveTemplates = eligibleTemplates.filter(t => t.exclusivity === 'exclusive');
      if (exclusiveTemplates.length > 0) {
        return exclusiveTemplates[Math.floor(Math.random() * exclusiveTemplates.length)];
      }
    }
    
    return eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];
  }

  // Get session context for intel contextualization
  private static async getSessionContext(sessionId: string): Promise<any> {
    try {
      const teamsQuery = query(
        collection(firestore, 'sessions', sessionId, 'teams')
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return {
        teams: teams.map(team => ({ 
          id: team.id, 
          name: team.name || 'Unknown Colony', 
          type: team.type || 'Unknown',
          resources: team.resources || {}
        })),
        colonyTypes: ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'],
        resourceTypes: ['oxygen', 'food', 'water', 'energy', 'minerals', 'alloys', 'techComponents'],
        gridLocations: ['Alpha-7', 'Beta-12', 'Gamma-3', 'Delta-9', 'Epsilon-15', 'Zeta-6'],
        techAreas: ['propulsion', 'life_support', 'communication', 'mining_tech', 'agricultural_tech', 'defense_systems']
      };
    } catch (error) {
      console.error('Failed to get session context:', error);
      return {
        teams: [],
        colonyTypes: ['mining', 'agricultural', 'research'],
        resourceTypes: ['oxygen', 'food', 'water', 'energy'],
        gridLocations: ['Alpha-7', 'Beta-12', 'Gamma-3'],
        techAreas: ['propulsion', 'life_support', 'communication']
      };
    }
  }

  // Contextualize intel template with actual session data
  private static async contextualizeIntel(
    template: IntelTemplate,
    sessionContext: any,
    targetTeamId: string,
    round: number
  ): Promise<{ title: string; content: string }> {
    let content = template.content;
    const title = template.title;
    
    // Use template loader to get placeholder values
    const placeholderKeys = content.match(/\{([^}]+)\}/g) || [];
    
    // Replace each placeholder with contextual or random values
    placeholderKeys.forEach(placeholder => {
      const key = placeholder.slice(1, -1); // Remove { and }
      
      // First try context-specific replacements
      const contextualValue = this.getContextualValue(key, sessionContext, targetTeamId, round);
      if (contextualValue) {
        content = this.templateLoader.replacePlaceholder(content, key, contextualValue);
      } else {
        // Fall back to random placeholder values from config
        const randomValue = this.templateLoader.getRandomPlaceholderValue(key);
        content = content.replace(placeholder, randomValue);
      }
    });
    
    return { title, content };
  }
  
  // Get contextual values based on actual session data
  private static getContextualValue(
    key: string,
    sessionContext: any,
    targetTeamId: string,
    round: number
  ): string | null {
    // Map of dynamic replacements based on session context
    const replacements = {
      colony_a: this.getRandomElement(sessionContext.teams)?.name || null,
      colony_b: this.getRandomElement(sessionContext.teams.filter((t: any) => t.id !== targetTeamId))?.name || null,
      target_colony: this.getRandomElement(sessionContext.teams.filter((t: any) => t.id !== targetTeamId))?.name || null,
      resource_type: this.getRandomElement(sessionContext.resourceTypes),
      grid_location: this.getRandomElement(sessionContext.gridLocations),
      amount: String(Math.floor(Math.random() * 5) + 2),
      resource_list: this.generateResourceList(sessionContext.resourceTypes),
      colony_type1: this.getRandomElement(sessionContext.colonyTypes),
      colony_type2: this.getRandomElement(sessionContext.colonyTypes),
      affected_colonies: this.generateColonyList(sessionContext.teams),
      investment_type: this.getRandomElement(['scouts', 'production', 'research', 'communication']),
      affected_resources: this.getRandomElement(sessionContext.resourceTypes),
      tech_area: this.getRandomElement(sessionContext.techAreas),
      target_round: String(round + 1),
      requested_resources: this.generateResourceList(sessionContext.resourceTypes, 2),
      colony_list: this.generateColonyList(sessionContext.teams, 3),
      leading_colony: this.getRandomElement(sessionContext.teams)?.name || null,
      point_total: String(Math.floor(Math.random() * 1000) + 500),
      recommendations: this.getRandomElement(['increase trade volume', 'invest in production', 'form alliances']),
      at_risk_list: this.generateColonyList(sessionContext.teams, 2),
      time_remaining: this.getRandomElement(['2 hours', '1 hour', '30 minutes']),
      trend_direction: this.getRandomElement(['upward', 'downward', 'volatile']),
      resource_category: this.getRandomElement(['basic_resources', 'advanced_materials', 'technology']),
      percentage: String(Math.floor(Math.random() * 40) + 10),
      colony_types: this.generateColonyTypeList(sessionContext.colonyTypes, 2),
      time_window: this.getRandomElement(['early round', 'mid round', 'late round']),
      demanding_colonies: this.generateColonyList(sessionContext.teams, 2),
      action: this.getRandomElement(['stockpile', 'increase production', 'seek trade partners'])
    } as Record<string, string | null>;
    
    // Return the contextual value if it exists
    return replacements[key] || null;
  }

  // Add intel to team's resources
  private static async addIntelToTeam(
    sessionId: string,
    teamId: string,
    intel: IntelItem[]
  ): Promise<void> {
    try {
      const teamRef = doc(firestore, 'sessions', sessionId, 'teams', teamId);
      
      // Categorize intel by type
      const marketIntel = intel.filter(i => i.source === 'communication' || i.title.includes('Market'));
      const surveyReports = intel.filter(i => i.source === 'scout' && !i.title.includes('Market') && !i.title.includes('Crisis'));
      const crisisWarnings = intel.filter(i => i.title.includes('Crisis') || i.title.includes('Warning') || i.title.includes('Alert'));
      
      // Update team document
      await updateDoc(teamRef, {
        'resources.marketIntel': arrayUnion(...marketIntel),
        'resources.surveyReports': arrayUnion(...surveyReports),
        'resources.crisisWarnings': arrayUnion(...crisisWarnings)
      });
    } catch (error) {
      console.error('Failed to add intel to team:', error);
    }
  }

  // Broadcast intel alerts
  private static async broadcastIntelAlert(
    sessionId: string,
    teamId: string,
    intel: IntelItem[]
  ): Promise<void> {
    try {
      const alertData = {
        type: 'intel_received',
        message: `${intel.length} new intelligence report${intel.length > 1 ? 's' : ''} received`,
        intel: intel.map(i => ({ id: i.id, title: i.title, value: i.value })),
        timestamp: Date.now(),
        priority: 'medium'
      };

      await push(
        ref(realtimeDb, `sessions/${sessionId}/live/notifications/${teamId}`),
        alertData
      );
    } catch (error) {
      console.warn('Failed to broadcast intel alert:', error);
    }
  }

  // Broadcast round intel distribution
  private static async broadcastRoundIntelDistribution(
    sessionId: string,
    round: number
  ): Promise<void> {
    try {
      const alertData = {
        type: 'round_intel_distributed',
        message: `Round ${round} intelligence briefing distributed to all colonies`,
        timestamp: Date.now(),
        round
      };

      await set(
        ref(realtimeDb, `sessions/${sessionId}/live/round_events/intel_distribution_${round}`),
        alertData
      );
    } catch (error) {
      console.warn('Failed to broadcast round intel distribution:', error);
    }
  }

  // Calculate expiration time for intel
  private static calculateExpirationTime(currentRound: number, applicableRounds: number[]): string | null {
    if (applicableRounds.length === 0) return null;
    
    const lastApplicableRound = Math.max(...applicableRounds);
    const expirationTime = Date.now() + ((lastApplicableRound - currentRound + 1) * 30 * 60 * 1000); // 30 minutes per round
    
    return new Date(expirationTime).toISOString();
  }

  // Utility methods for contextualization
  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static generateResourceList(resources: string[], count: number = 3): string {
    const selected = [];
    const available = [...resources];
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected.join(', ');
  }

  private static generateColonyList(teams: any[], count: number = 2): string {
    if (teams.length === 0) return 'Unknown Colonies';
    
    const selected = [];
    const available = [...teams];
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0].name);
    }
    
    return selected.join(', ');
  }

  private static generateColonyTypeList(types: string[], count: number = 2): string {
    const selected = [];
    const available = [...types];
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected.join(' and ');
  }
}

// Export a singleton instance for compatibility
export const intelGenerationService = IntelGenerationService;