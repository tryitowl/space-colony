import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { 
  AlienContactEvent, 
  AlienCivilization, 
  AlienResourceOffer, 
  AlienTrade,
  Resources,
  Colony,
  GameSession
} from '../types/game';

interface AlienTradingConfig {
  sessionId: string;
  round: number;
  duration: number; // How long alien contact remains active
  enabledCivilizations: string[];
}

export class AlienTradingService {
  private static instances: Map<string, AlienTradingService> = new Map();
  private config: AlienTradingConfig;
  private activeEvent: AlienContactEvent | null = null;

  private constructor(config: AlienTradingConfig) {
    this.config = config;
  }

  static getInstance(sessionId: string, config?: Partial<AlienTradingConfig>): AlienTradingService {
    if (!AlienTradingService.instances.has(sessionId)) {
      if (!config) {
        throw new Error(`AlienTradingService instance for session ${sessionId} not found`);
      }
      
      const fullConfig: AlienTradingConfig = {
        sessionId,
        round: 3,
        duration: 10 * 60 * 1000, // 10 minutes default
        enabledCivilizations: ['zephyrians', 'crystalline_collective', 'void_walkers'],
        ...config
      };

      AlienTradingService.instances.set(sessionId, new AlienTradingService(fullConfig));
    }
    
    return AlienTradingService.instances.get(sessionId)!;
  }

  /**
   * Initiate alien contact event for Round 3
   */
  async initiateAlienContact(): Promise<AlienContactEvent> {
    try {
      // Select random alien civilization
      const civilization = this.selectAlienCivilization();
      
      // Generate resource offers based on civilization
      const availableResources = this.generateResourceOffers(civilization);
      
      // Create alien contact event
      const alienEvent: AlienContactEvent = {
        id: `alien_contact_${this.config.sessionId}_${Date.now()}`,
        sessionId: this.config.sessionId,
        round: this.config.round,
        timestamp: Date.now(),
        alienCivilization: civilization,
        availableResources,
        duration: this.config.duration,
        isActive: true
      };

      // Store event in Firestore
      await addDoc(collection(firestore, 'alienEvents'), alienEvent);
      
      // Update session with alien contact flag
      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        alienContactActive: true,
        alienContactId: alienEvent.id,
        updatedAt: serverTimestamp()
      });

      this.activeEvent = alienEvent;
      
      // Auto-deactivate after duration
      setTimeout(() => {
        this.deactivateAlienContact().catch(console.error);
      }, this.config.duration);

      return alienEvent;

    } catch (error) {
      console.error('Failed to initiate alien contact:', error);
      throw error;
    }
  }

  /**
   * Execute an alien trade
   */
  async executeAlienTrade(trade: Omit<AlienTrade, 'id' | 'timestamp'>): Promise<void> {
    if (!this.activeEvent || !this.activeEvent.isActive) {
      throw new Error('No active alien contact event');
    }

    try {
      const batch = writeBatch(firestore);
      
      // Get team document
      const sessionDoc = await getDoc(doc(firestore, 'sessions', this.config.sessionId));
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data() as GameSession;
      const team = sessionData.teams.find(t => t.id === trade.teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }

      // Validate trade resources
      this.validateAlienTrade(team, trade);

      // Update team resources
      const updatedResources = this.calculateUpdatedResources(
        team.resources, 
        trade.offeredResources, 
        trade.receivedResources
      );

      // Create trade record
      const tradeRecord: AlienTrade = {
        ...trade,
        id: `alien_trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      // Update team in session
      const updatedTeams = sessionData.teams.map(t => 
        t.id === trade.teamId 
          ? { ...t, resources: updatedResources }
          : t
      );

      // Batch updates
      batch.update(doc(firestore, 'sessions', this.config.sessionId), {
        teams: updatedTeams,
        updatedAt: serverTimestamp()
      });

      // Store trade record
      batch.set(doc(collection(firestore, 'alienTrades'), tradeRecord.id), tradeRecord);

      await batch.commit();

    } catch (error) {
      console.error('Failed to execute alien trade:', error);
      throw error;
    }
  }

  /**
   * Get active alien contact event
   */
  getActiveEvent(): AlienContactEvent | null {
    return this.activeEvent;
  }

  /**
   * Deactivate alien contact
   */
  async deactivateAlienContact(): Promise<void> {
    if (!this.activeEvent) return;

    try {
      this.activeEvent.isActive = false;
      
      await updateDoc(doc(firestore, 'sessions', this.config.sessionId), {
        alienContactActive: false,
        alienContactId: null,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Failed to deactivate alien contact:', error);
      throw error;
    }
  }

  // Private methods

  private selectAlienCivilization(): AlienCivilization {
    const civilizations: AlienCivilization[] = [
      {
        name: "The Zephyrian Collective",
        description: "A peaceful federation of gas-giant dwellers with mastery over atmospheric technologies. They seek basic life-support resources to aid their exploration fleets.",
        technology: "Atmospheric Processing & Bio-Engineering",
        demeanor: "peaceful",
        preferredResources: ["xenoBio", "alienTech"],
        exchangeRates: {
          oxygen: 0.5,
          food: 0.3,
          water: 0.4,
          energy: 0.6,
          techComponents: 2.0
        }
      },
      {
        name: "Crystalline Collective",
        description: "Silicon-based entities that exist as living crystal matrices. They value energy and minerals above all else, offering quantum technology in return.",
        technology: "Quantum Manipulation & Crystal Computing",
        demeanor: "cautious",
        preferredResources: ["quantumCores", "darkMatter"],
        exchangeRates: {
          minerals: 0.8,
          energy: 1.0,
          alloys: 1.5,
          techPatents: 3.0
        }
      },
      {
        name: "Void Walkers",
        description: "Mysterious entities from deep space who phase between dimensions. They offer rare dark matter in exchange for advanced technology and blueprints.",
        technology: "Dimensional Engineering & Dark Matter Manipulation",
        demeanor: "curious",
        preferredResources: ["darkMatter", "quantumCores"],
        exchangeRates: {
          techComponents: 2.5,
          techPatents: 4.0,
          blueprints: 3.5,
          credits: 0.01
        }
      }
    ];

    const availableCivs = civilizations.filter(civ => 
      this.config.enabledCivilizations.includes(civ.name.toLowerCase().replace(/\s+/g, '_'))
    );

    return availableCivs[Math.floor(Math.random() * availableCivs.length)] || civilizations[0];
  }

  private generateResourceOffers(civilization: AlienCivilization): AlienResourceOffer[] {
    const offers: AlienResourceOffer[] = [];

    // Generate xenoBio offers
    if (civilization.preferredResources.includes('xenoBio')) {
      offers.push({
        resourceType: 'xenoBio',
        quantity: Math.floor(Math.random() * 3) + 2, // 2-4 units
        cost: {
          oxygen: 5 + Math.floor(Math.random() * 3),
          food: 3 + Math.floor(Math.random() * 2),
          water: 2 + Math.floor(Math.random() * 2)
        },
        description: "Alien biological samples with unique properties. Essential for bio-engineering research.",
        rarity: 'rare'
      });
    }

    // Generate quantumCores offers
    if (civilization.preferredResources.includes('quantumCores')) {
      offers.push({
        resourceType: 'quantumCores',
        quantity: Math.floor(Math.random() * 2) + 1, // 1-2 units
        cost: {
          energy: 8 + Math.floor(Math.random() * 4),
          techComponents: 3 + Math.floor(Math.random() * 2),
          minerals: 10 + Math.floor(Math.random() * 5)
        },
        description: "Quantum-entangled energy cores that defy conventional physics. Enables faster-than-light communication.",
        rarity: 'legendary'
      });
    }

    // Generate darkMatter offers
    if (civilization.preferredResources.includes('darkMatter')) {
      offers.push({
        resourceType: 'darkMatter',
        quantity: 1, // Always 1 unit - extremely rare
        cost: {
          techPatents: 2 + Math.floor(Math.random() * 2),
          blueprints: 1 + Math.floor(Math.random() * 2),
          credits: 500 + Math.floor(Math.random() * 300)
        },
        description: "Stabilized dark matter in containment matrix. Theoretical applications include gravitational manipulation.",
        rarity: 'legendary'
      });
    }

    // Generate alienTech offers (always available)
    offers.push({
      resourceType: 'alienTech',
      quantity: Math.floor(Math.random() * 4) + 3, // 3-6 units
      cost: {
        techComponents: 2 + Math.floor(Math.random() * 2),
        alloys: 3 + Math.floor(Math.random() * 3),
        energy: 4 + Math.floor(Math.random() * 2)
      },
      description: "General alien technology components. Can be reverse-engineered for various applications.",
      rarity: 'common'
    });

    return offers;
  }

  private validateAlienTrade(team: Colony, trade: Omit<AlienTrade, 'id' | 'timestamp'>): void {
    // Check if team has sufficient resources
    Object.entries(trade.offeredResources).forEach(([resource, amount]) => {
      const teamAmount = team.resources[resource as keyof Resources];
      if (typeof teamAmount === 'number' && teamAmount < (amount || 0)) {
        throw new Error(`Insufficient ${resource}: need ${amount}, have ${typeof teamAmount === 'number' ? teamAmount : 0}`);
      }
    });

    // Validate that this is a valid alien trade offer
    if (!this.activeEvent) {
      throw new Error('No active alien contact event');
    }

    const validOffer = this.activeEvent.availableResources.some(offer => {
      const receivedResource = Object.keys(trade.receivedResources)[0];
      const receivedAmount = Object.values(trade.receivedResources)[0];
      
      return offer.resourceType === receivedResource && 
             offer.quantity === receivedAmount &&
             this.resourcesMatch(offer.cost, trade.offeredResources);
    });

    if (!validOffer) {
      throw new Error('Invalid alien trade offer');
    }
  }

  private resourcesMatch(expected: Partial<Resources>, actual: Partial<Resources>): boolean {
    return Object.entries(expected).every(([resource, amount]) => {
      return actual[resource as keyof Resources] === amount;
    });
  }

  private calculateUpdatedResources(
    current: Resources, 
    offered: Partial<Resources>, 
    received: Partial<Resources>
  ): Resources {
    const updated = { ...current };

    // Subtract offered resources
    Object.entries(offered).forEach(([resource, amount]) => {
      if (typeof amount === 'number' && amount > 0 && typeof (updated as any)[resource] === 'number') {
        (updated as any)[resource] = Math.max(0, (updated as any)[resource] - amount);
      }
    });

    // Add received resources
    Object.entries(received).forEach(([resource, amount]) => {
      if (amount) {
        (updated as any)[resource] = ((updated as any)[resource] || 0) + amount;
      }
    });

    return updated;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    AlienTradingService.instances.delete(this.config.sessionId);
  }
}