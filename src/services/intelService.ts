import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { firestore, realtimeDb } from '../firebase/config';
import { AuthService } from './authService';
import type { IntelItem, Colony } from '../types';

export class IntelService {
  // Pre-defined intel templates based on game round and colony types
  private static readonly INTEL_TEMPLATES = {
    round_1: [
      {
        title: "Resource Anomaly Detected",
        content: "Sensors indicate unusual energy signatures in the {colony_type} sector. May affect resource production next round.",
        value: 75,
        category: "production"
      },
      {
        title: "Trade Route Discovery",
        content: "New trade corridor discovered between {colony_a} and {colony_b} sectors. +15% efficiency for direct trades.",
        value: 85,
        category: "trade"
      },
      {
        title: "Market Fluctuation Alert",
        content: "{resource} prices are expected to increase by 20% next round due to supply chain disruptions.",
        value: 90,
        category: "market"
      }
    ],
    round_2: [
      {
        title: "System Maintenance Required",
        content: "Critical systems in {colony_type} facilities showing wear. Maintenance costs doubled next round.",
        value: 80,
        category: "warning"
      },
      {
        title: "Breakthrough Discovery",
        content: "Research teams have made a breakthrough in {tech_area}. New production methods available.",
        value: 100,
        category: "tech"
      },
      {
        title: "Supply Chain Disruption",
        content: "Transport routes to {colony_name} compromised. Resource deliveries delayed by 1 round.",
        value: 95,
        category: "logistics"
      }
    ],
    round_3: [
      {
        title: "Emergency Resource Cache",
        content: "Hidden emergency supplies discovered in sector {grid_location}. Contains {resource_list}.",
        value: 120,
        category: "discovery"
      },
      {
        title: "Competitive Intelligence",
        content: "{target_colony} is planning major investments in {investment_type}. Strategic implications significant.",
        value: 110,
        category: "competitive"
      },
      {
        title: "Crisis Prediction",
        content: "Analysis suggests 70% probability of {crisis_type} affecting {affected_colonies} in 2 rounds.",
        value: 140,
        category: "prediction"
      }
    ],
    round_4: [
      {
        title: "Alien Contact Protocol",
        content: "First contact scenarios activated. Alien technology exchange protocols now available for negotiation.",
        value: 200,
        category: "alien"
      },
      {
        title: "Final Phase Strategy",
        content: "Optimal victory conditions identified: {strategy_details}. Implementation window: next round only.",
        value: 150,
        category: "strategy"
      },
      {
        title: "Alliance Opportunity",
        content: "Multi-colony alliance forming against {threat}. Join conditions: {requirements}.",
        value: 160,
        category: "alliance"
      }
    ],
    round_5: [
      {
        title: "Victory Path Analysis",
        content: "Current leader: {leading_colony}. Catch-up strategy: {recommended_actions}.",
        value: 180,
        category: "endgame"
      },
      {
        title: "Last Chance Alert",
        content: "Final trade window detected. Colonies {colony_list} vulnerable to elimination.",
        value: 190,
        category: "urgent"
      }
    ]
  };

  // Generate intel pieces based on scout investments
  static async generateIntelForTeam(
    sessionId: string,
    teamId: string,
    scoutInvestment: number,
    currentRound: number,
    communicationArray: number = 0
  ): Promise<IntelItem[]> {
    try {
      await AuthService.ensureAuthenticated();
      
      // Calculate intel pieces generated (1-3 based on scout investment)
      const baseIntel = Math.min(3, Math.max(1, Math.floor(scoutInvestment / 2)));
      const bonusIntel = communicationArray > 0 ? 1 : 0;
      const totalIntel = baseIntel + bonusIntel;

      const generatedIntel: IntelItem[] = [];
      const roundKey = `round_${currentRound}` as keyof typeof this.INTEL_TEMPLATES;
      const templates = this.INTEL_TEMPLATES[roundKey] || this.INTEL_TEMPLATES.round_1;

      // Get session data for contextualization
      const sessionData = await this.getSessionContext(sessionId);

      for (let i = 0; i < totalIntel; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const intel = await this.contextualizeIntel(template, sessionData);
        
        const intelItem: IntelItem = {
          id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: intel.title,
          content: intel.content,
          value: intel.value + (communicationArray * 5), // Communication array bonus
          distributionCount: 0,
          roundGenerated: currentRound,
          source: 'scout'
        };

        generatedIntel.push(intelItem);
        
        // Save intel to database
        await setDoc(
          doc(firestore, 'sessions', sessionId, 'intel', intelItem.id),
          intelItem
        );
      }

      // Add intel to team's resources
      await this.addIntelToTeam(sessionId, teamId, generatedIntel);

      return generatedIntel;
    } catch (error) {
      console.error('Failed to generate intel:', error);
      return [];
    }
  }

  // Generate intel from communication array investments
  static async generateMarketIntel(
    sessionId: string,
    teamId: string,
    communicationLevel: number,
    currentRound: number
  ): Promise<IntelItem[]> {
    if (communicationLevel === 0) return [];

    // Communication array provides market trend analysis
    const marketTemplate = {
      title: "Market Analysis Report",
      content: `Round ${currentRound + 1} market predictions: {market_trends}. Recommended trades: {trade_recommendations}.`,
      value: 60 + (communicationLevel * 10),
      category: "market"
    };

    const sessionData = await this.getSessionContext(sessionId);
    const intel = await this.contextualizeIntel(marketTemplate, sessionData);
    
    const intelItem: IntelItem = {
      id: `market_intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: intel.title,
      content: intel.content,
      value: intel.value,
      distributionCount: 0,
      roundGenerated: currentRound,
      source: 'communication'
    };

    await setDoc(
      doc(firestore, 'sessions', sessionId, 'intel', intelItem.id),
      intelItem
    );

    await this.addIntelToTeam(sessionId, teamId, [intelItem]);
    
    return [intelItem];
  }

  // Trade intel between teams
  static async tradeIntel(
    sessionId: string,
    fromTeamId: string,
    toTeamId: string,
    intelIds: string[]
  ): Promise<boolean> {
    try {
      // Validate teams have the intel they're trading
      const fromTeamDoc = await getDocs(
        query(collection(firestore, 'sessions', sessionId, 'teams'), 
              where('id', '==', fromTeamId))
      );
      
      if (fromTeamDoc.empty) return false;
      
      const fromTeam = fromTeamDoc.docs[0].data() as Colony;
      
      // Check intel ownership and mark as traded
      for (const intelId of intelIds) {
        const hasIntel = [
          ...fromTeam.resources.marketIntel,
          ...fromTeam.resources.surveyReports,
          ...fromTeam.resources.crisisWarnings
        ].some(intel => intel.id === intelId);
        
        if (!hasIntel) {
          throw new Error(`Team does not own intel: ${intelId}`);
        }

        // Update intel distribution count (reduces value)
        await updateDoc(
          doc(firestore, 'sessions', sessionId, 'intel', intelId),
          {
            distributionCount: (await this.getIntelDistributionCount(sessionId, intelId)) + 1
          }
        );
      }

      // Move intel from one team to another (this would need more complex logic
      // to determine which intel category to move from/to)
      await this.transferIntel(sessionId, fromTeamId, toTeamId, intelIds);
      
      return true;
    } catch (error) {
      console.error('Failed to trade intel:', error);
      return false;
    }
  }

  // Get intel value (decreases with distribution)
  static async getIntelValue(sessionId: string, intelId: string): Promise<number> {
    const intelDoc = await getDocs(
      query(collection(firestore, 'sessions', sessionId, 'intel'),
            where('id', '==', intelId))
    );
    
    if (intelDoc.empty) return 0;
    
    const intel = intelDoc.docs[0].data() as IntelItem;
    const distributionPenalty = Math.floor(intel.distributionCount * 0.2); // 20% reduction per distribution
    
    return Math.max(10, intel.value - (intel.value * distributionPenalty));
  }

  // Add real-time intel alerts
  static async broadcastIntelAlert(
    sessionId: string,
    intelItem: IntelItem,
    recipientTeamIds?: string[]
  ): Promise<void> {
    try {
      const alertData = {
        type: 'intel_alert',
        intel: intelItem,
        timestamp: Date.now(),
        recipients: recipientTeamIds || 'all'
      };

      if (recipientTeamIds) {
        // Send to specific teams
        for (const teamId of recipientTeamIds) {
          await set(
            ref(realtimeDb, `sessions/${sessionId}/live/intel_alerts/${teamId}/${intelItem.id}`),
            alertData
          );
        }
      } else {
        // Broadcast to all teams
        await set(
          ref(realtimeDb, `sessions/${sessionId}/live/intel_broadcast/${intelItem.id}`),
          alertData
        );
      }
    } catch (error) {
      console.warn('Failed to broadcast intel alert:', error);
    }
  }

  // Helper methods
  private static async getSessionContext(sessionId: string): Promise<any> {
    // This would fetch session data to contextualize intel
    // For now, return mock data
    return {
      teams: ['Mining Alpha', 'Agricultural Beta', 'Research Gamma'],
      currentPhase: 'trading',
      resources: ['oxygen', 'food', 'water', 'energy', 'minerals']
    };
  }

  private static async contextualizeIntel(
    template: any,
    sessionData: any
  ): Promise<{ title: string; content: string; value: number }> {
    let content = template.content;
    
    // Replace placeholders with actual session data
    content = content.replace('{colony_type}', sessionData.teams[Math.floor(Math.random() * sessionData.teams.length)]);
    content = content.replace('{colony_a}', sessionData.teams[0]);
    content = content.replace('{colony_b}', sessionData.teams[1]);
    content = content.replace('{resource}', sessionData.resources[Math.floor(Math.random() * sessionData.resources.length)]);
    content = content.replace('{colony_name}', sessionData.teams[Math.floor(Math.random() * sessionData.teams.length)]);
    
    return {
      title: template.title,
      content,
      value: template.value
    };
  }

  private static async addIntelToTeam(
    sessionId: string,
    teamId: string,
    intel: IntelItem[]
  ): Promise<void> {
    // This would update the team's intel arrays
    // Implementation depends on how intel is categorized in team resources
    const teamRef = doc(firestore, 'sessions', sessionId, 'teams', teamId);
    
    // For now, add to marketIntel array (in real implementation, categorize properly)
    await updateDoc(teamRef, {
      'resources.marketIntel': intel
    });
  }

  private static async getIntelDistributionCount(
    sessionId: string,
    intelId: string
  ): Promise<number> {
    const intelDoc = await getDocs(
      query(collection(firestore, 'sessions', sessionId, 'intel'),
            where('id', '==', intelId))
    );
    
    if (intelDoc.empty) return 0;
    return (intelDoc.docs[0].data() as IntelItem).distributionCount;
  }

  private static async transferIntel(
    _sessionId: string,
    fromTeamId: string,
    toTeamId: string,
    intelIds: string[]
  ): Promise<void> {
    // Complex logic to move intel between teams
    // This would require reading both teams, removing intel from source,
    // adding to target, and updating both documents atomically
    console.log(`Transferring intel ${intelIds} from ${fromTeamId} to ${toTeamId}`);
  }
}