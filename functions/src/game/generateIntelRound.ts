import * as admin from 'firebase-admin';
import { Colony, IntelItem } from '../types';

export interface IntelGenerationRequest {
  eventId: string;
  sessionId: string;
  roundNumber: number;
  teams: Colony[];
  specificIntelType?: string;
}

export interface IntelGenerationResponse {
  success: boolean;
  intelPieces: IntelItem[];
  distributionMap: Record<string, string[]>; // intelId -> teamIds
  errors?: string[];
}

interface IntelTemplate {
  type: string;
  title: string;
  description: string;
  baseValue: number;
  applicableRounds: number[];
  exclusivity?: string;
  source?: string;
  targetTeam?: string;
  content?: string;
  maxDistribution?: number;
}

/**
 * Enhanced Intel Generation for Space Colony Exchange
 * 
 * Features:
 * - Scout investment based generation (1 intel/round/scout level)
 * - Communication array multipliers (2x for level 1, 3x for level 2)
 * - Round-specific intel templates
 * - Value degradation over time
 * - Real-time notifications
 */
export async function generateIntelRound(data: IntelGenerationRequest): Promise<IntelGenerationResponse> {
  const { eventId, sessionId, roundNumber, teams, specificIntelType } = data;
  
  const response: IntelGenerationResponse = {
    success: false,
    intelPieces: [],
    distributionMap: {}
  };
  
  try {
    const db = admin.firestore();
    const batch = db.batch();
    const intelToGenerate: IntelTemplate[] = [];
    
    // Generate round-specific public intel
    if (!specificIntelType) {
      const roundIntel = getIntelForRound(roundNumber);
      intelToGenerate.push(...roundIntel);
    }
    
    // Generate intel based on team investments using new system
    for (const team of teams) {
      if (team.eliminationStatus?.isEliminated) continue;
      
      // Scout investment intel (1 intel per round per scout level)
      const scoutLevel = team.investments?.scouts || 0;
      const communicationLevel = team.investments?.communicationArray || 0;
      
      if (scoutLevel > 0) {
        // Base intel count (1 per scout level)
        const baseIntelCount = scoutLevel;
        
        // Communication array multiplier (2x for level 1, 3x for level 2)
        const communicationMultiplier = communicationLevel === 0 ? 1 : 
                                      communicationLevel === 1 ? 2 : 3;
        
        const totalIntelCount = Math.min(baseIntelCount * communicationMultiplier, 8); // Cap at 8
        
        for (let i = 0; i < totalIntelCount; i++) {
          const scoutIntel = generateScoutIntel(roundNumber, team.type || 'mining', scoutLevel);
          if (scoutIntel) {
            intelToGenerate.push({
              ...scoutIntel,
              targetTeam: team.id,
              baseValue: scoutIntel.baseValue + (communicationLevel * 10), // Communication bonus
              exclusivity: scoutLevel >= 3 ? 'exclusive' : 'shared'
            });
          }
        }
      }
      
      // Communication-specific market intel
      if (communicationLevel > 0) {
        const marketIntel = generateMarketIntel(roundNumber);
        if (marketIntel) {
          intelToGenerate.push({
            ...marketIntel,
            targetTeam: team.id,
            baseValue: marketIntel.baseValue + (communicationLevel * 15),
            exclusivity: 'shared'
          });
        }
      }
    }
    
    // Create intel documents and distribute
    for (const intelData of intelToGenerate) {
      const intelId = db.collection('temp').doc().id; // Generate unique ID
      const intelRef = db.doc(`events/${eventId}/sessions/${sessionId}/intel/${intelId}`);
      
      const expirationTime = calculateExpirationTime(roundNumber, intelData.applicableRounds || [roundNumber + 1]);
      
      const intelPiece: IntelItem = {
        id: intelId,
        category: intelData.type === 'market_intel' ? 'market' :
                  intelData.type === 'alien' ? 'alien' :
                  intelData.type === 'crisis_warning' || intelData.type === 'urgent' ? 'crisis' :
                  intelData.type === 'discovery' ? 'technology' : 'strategy',
        title: intelData.title,
        content: intelData.description || intelData.content || '',
        reliability: 0.85 + (Math.random() * 0.15), // 85-100% reliable
        source: intelData.source || 'scout',
        timestamp: Date.now(),
        distributionCount: 0
      };
      
      batch.set(intelRef, intelPiece);
      response.intelPieces.push(intelPiece);
      
      // Update team intel lists based on intel type
      if (intelData.targetTeam) {
        const teamRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${intelData.targetTeam}`);
        
        // Categorize intel for team resources
        const intelCategory = categorizeIntel(intelData.type);
        batch.update(teamRef, {
          [`resources.${intelCategory}`]: admin.firestore.FieldValue.arrayUnion({
            id: intelId,
            title: intelData.title,
            content: intelData.description || intelData.content,
            value: intelData.baseValue,
            distributionCount: 0,
            roundGenerated: roundNumber,
            source: intelData.source || 'scout'
          })
        });
        
        response.distributionMap[intelId] = [intelData.targetTeam];
      }
    }
    
    // Generate special round events
    if (roundNumber === 3) {
      await generateAlienContactEvent(db, batch, eventId, sessionId, roundNumber, response);
    }
    
    // Execute all updates
    await batch.commit();
    
    // Update realtime database with notifications
    await sendIntelNotifications(sessionId, response.intelPieces, roundNumber);
    
    response.success = true;
    return response;
    
  } catch (error) {
    console.error('Error generating intel:', error);
    response.errors = [error instanceof Error ? error.message : 'Unknown error'];
    return response;
  }
}

function getIntelForRound(roundNumber: number): IntelTemplate[] {
  const roundIntel: Record<number, IntelTemplate[]> = {
    1: [
      {
        type: 'market_intel',
        title: 'Initial Market Survey',
        description: 'Early trade analysis reveals resource distribution patterns across colonies. Mineral-rich sectors identified in outer rim.',
        baseValue: 50,
        applicableRounds: [1, 2],
        exclusivity: 'public',
        source: 'communication'
      }
    ],
    2: [
      {
        type: 'crisis_warning',
        title: 'Solar Storm Approaching',
        description: 'Stellar analysis indicates major solar flare activity in 2 rounds. Energy costs expected to double temporarily.',
        baseValue: 80,
        applicableRounds: [3],
        exclusivity: 'public',
        source: 'communication'
      }
    ],
    3: [
      {
        type: 'discovery',
        title: 'Asteroid Belt Discovery',
        description: 'Long-range sensors detect mineral-rich asteroid field. Mining colonies may gain significant resource bonuses.',
        baseValue: 70,
        applicableRounds: [4],
        exclusivity: 'public',
        source: 'communication'
      }
    ],
    4: [
      {
        type: 'market_intel',
        title: 'Supply Chain Disruption',
        description: 'Transport network analysis shows critical bottlenecks forming. Food and basic resource prices volatile.',
        baseValue: 90,
        applicableRounds: [5],
        exclusivity: 'public',
        source: 'communication'
      }
    ],
    5: [
      {
        type: 'urgent',
        title: 'Emergency Protocols Activated',
        description: 'Final round resource distribution protocols in effect. Emergency reserves unlocked for critical colonies.',
        baseValue: 100,
        applicableRounds: [5],
        exclusivity: 'public',
        source: 'communication'
      }
    ]
  };
  
  return roundIntel[roundNumber] || [];
}

function generateScoutIntel(roundNumber: number, _colonyType: string, scoutLevel: number): IntelTemplate | null {
  const scoutIntelTemplates = [
    {
      type: 'survey_report',
      title: 'Resource Anomaly Detected',
      description: `Scout teams report unusual ${getRandomResource()} signatures in sector ${getRandomSector()}. Potential cache discovered.`,
      baseValue: 60,
      source: 'scout'
    },
    {
      type: 'competitive',
      title: 'Colony Activity Intelligence',
      description: `Surveillance indicates ${getRandomColonyType()} colony increasing ${getRandomInvestmentType()} investments. Strategic implications significant.`,
      baseValue: 75,
      source: 'scout'
    },
    {
      type: 'discovery',
      title: 'Hidden Facility Located',
      description: `Abandoned ${getRandomFacilityType()} facility discovered. Contains ${getRandomResourceList()}. Coordinates: ${getRandomCoordinates()}.`,
      baseValue: 85,
      source: 'scout'
    },
    {
      type: 'prediction',
      title: 'Trade Route Analysis',
      description: `Advanced scouting reveals optimal trade corridors between ${getRandomColonyType()} sectors. Efficiency gains possible.`,
      baseValue: 55,
      source: 'scout'
    }
  ];
  
  // Higher scout levels get better intel
  const availableTemplates = scoutIntelTemplates.filter(template => {
    if (scoutLevel >= 3) return true; // All templates available
    if (scoutLevel >= 2) return template.baseValue <= 75; // Exclude highest value
    return template.baseValue <= 60; // Only basic templates
  });
  
  const selectedTemplate = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
  
  return {
    ...selectedTemplate,
    applicableRounds: [roundNumber + 1, roundNumber + 2],
    baseValue: selectedTemplate.baseValue + (scoutLevel * 5) // Scout level bonus
  };
}

function generateMarketIntel(roundNumber: number): IntelTemplate | null {
  const marketIntelTemplates = [
    {
      type: 'market_intel',
      title: 'Price Fluctuation Forecast',
      description: `Market algorithms predict ${getRandomPercentage()}% ${getRandomDirection()} movement in ${getRandomResource()} prices next round.`,
      baseValue: 65,
      source: 'communication'
    },
    {
      type: 'market_intel',
      title: 'Demand Surge Alert',
      description: `Communication networks report high demand for ${getRandomResourceList()} from ${getRandomColonyType()} colonies. Prices rising.`,
      baseValue: 70,
      source: 'communication'
    },
    {
      type: 'market_intel',
      title: 'Trade Volume Analysis',
      description: `Network analysis shows increased trading activity between ${getRandomColonyType()} and ${getRandomColonyType()} sectors.`,
      baseValue: 60,
      source: 'communication'
    }
  ];
  
  const selectedTemplate = marketIntelTemplates[Math.floor(Math.random() * marketIntelTemplates.length)];
  
  return {
    ...selectedTemplate,
    applicableRounds: [roundNumber + 1]
  };
}

async function generateAlienContactEvent(
  db: admin.firestore.Firestore,
  batch: admin.firestore.WriteBatch,
  eventId: string,
  sessionId: string,
  roundNumber: number,
  response: IntelGenerationResponse
): Promise<void> {
  const alienIntel = {
    type: 'alien',
    title: 'First Contact Established',
    description: 'Alien civilization detected. Technology exchange protocols activated. They offer quantum crystals, alien tech, and hyperfuel for basic resources.',
    baseValue: 200,
    applicableRounds: [3, 4, 5],
    exclusivity: 'public',
    source: 'communication'
  };
  
  const intelId = db.collection('temp').doc().id;
  const intelRef = db.doc(`events/${eventId}/sessions/${sessionId}/intel/${intelId}`);
  
  batch.set(intelRef, {
    ...alienIntel,
    id: intelId,
    title: alienIntel.title,
    content: alienIntel.description,
    value: alienIntel.baseValue,
    distributionCount: 0,
    roundGenerated: roundNumber,
    source: alienIntel.source,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  const alienIntelItem: IntelItem = {
    id: intelId,
    category: 'alien',
    title: alienIntel.title,
    content: alienIntel.description,
    reliability: 1.0,
    source: 'communication',
    timestamp: Date.now(),
    distributionCount: 0
  };
  
  response.intelPieces.push(alienIntelItem);
  
  // Enable alien contact in session
  const sessionRef = db.doc(`events/${eventId}/sessions/${sessionId}`);
  batch.update(sessionRef, {
    'gameState.alienContactActive': true,
    'gameState.alienResources': {
      quantum_crystals: 15,
      alien_tech: 10,
      hyperfuel: 12
    }
  });
}

async function sendIntelNotifications(
  sessionId: string,
  intelPieces: IntelItem[],
  roundNumber: number
): Promise<void> {
  const realtimeUpdates = [];
  
  // Send team-specific notifications
  for (const intel of intelPieces) {
    if (intel.targetTeam) {
      realtimeUpdates.push(
        admin.database().ref(`sessions/${sessionId}/live/notifications/${intel.targetTeam}`).push({
          type: 'intel_received',
          message: `New intelligence received: ${intel.title}`,
          intel: [{
            id: intel.id,
            title: intel.title,
            value: intel.baseValue || intel.value
          }],
          priority: intel.baseValue >= 100 ? 'high' : 'medium',
          timestamp: Date.now()
        })
      );
    }
  }
  
  // Send round intel distribution notification
  realtimeUpdates.push(
    admin.database().ref(`sessions/${sessionId}/live/round_events/intel_distribution_${roundNumber}`).set({
      type: 'round_intel_distributed',
      message: `Round ${roundNumber} intelligence briefing distributed`,
      round: roundNumber,
      timestamp: Date.now()
    })
  );
  
  await Promise.all(realtimeUpdates);
}

// Utility functions
function categorizeIntel(type: string): string {
  if (type.includes('market')) return 'marketIntel';
  if (type.includes('crisis') || type.includes('warning')) return 'crisisWarnings';
  return 'surveyReports';
}

function calculateExpirationTime(currentRound: number, applicableRounds: number[]): string | null {
  if (applicableRounds.length === 0) return null;
  
  const lastApplicableRound = Math.max(...applicableRounds);
  const expirationTime = Date.now() + ((lastApplicableRound - currentRound + 1) * 30 * 60 * 1000); // 30 minutes per round
  
  return new Date(expirationTime).toISOString();
}

function getRandomResource(): string {
  const resources = ['minerals', 'alloys', 'tech_components', 'energy', 'food', 'water', 'oxygen'];
  return resources[Math.floor(Math.random() * resources.length)];
}

function getRandomResourceList(): string {
  const count = Math.floor(Math.random() * 3) + 2;
  const resources = ['minerals', 'alloys', 'tech_components', 'energy', 'food', 'water', 'oxygen'];
  const selected: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const resource = resources[Math.floor(Math.random() * resources.length)];
    if (!selected.includes(resource)) {
      selected.push(resource);
    }
  }
  
  return selected.join(', ');
}

function getRandomColonyType(): string {
  const types = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];
  return types[Math.floor(Math.random() * types.length)];
}

function getRandomInvestmentType(): string {
  const investments = ['scout', 'production', 'research', 'communication', 'emergency'];
  return investments[Math.floor(Math.random() * investments.length)];
}

function getRandomFacilityType(): string {
  const facilities = ['research', 'mining', 'manufacturing', 'storage', 'communication'];
  return facilities[Math.floor(Math.random() * facilities.length)];
}

function getRandomSector(): string {
  const sectors = ['Alpha-7', 'Beta-12', 'Gamma-3', 'Delta-9', 'Epsilon-15', 'Zeta-6', 'Theta-11', 'Lambda-4'];
  return sectors[Math.floor(Math.random() * sectors.length)];
}

function getRandomCoordinates(): string {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const number = Math.floor(Math.random() * 20) + 1;
  return `${letter}-${number}`;
}

function getRandomPercentage(): number {
  return Math.floor(Math.random() * 40) + 10; // 10-50%
}

function getRandomDirection(): string {
  return Math.random() > 0.5 ? 'upward' : 'downward';
}