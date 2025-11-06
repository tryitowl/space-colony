"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIntel = void 0;
const admin = __importStar(require("firebase-admin"));
const INVESTMENT_RETURNS = {
    scout: {
        cost_per_level: 3,
        intel_pieces: 1
    },
    communication: {
        cost_per_level: 2,
        market_intel: 1
    }
};
async function generateIntel(data) {
    const { eventId, sessionId, roundNumber, teams, specificIntelType } = data;
    const response = {
        success: false,
        intelPieces: [],
        distributionMap: {},
        errors: []
    };
    try {
        const db = admin.firestore();
        const batch = db.batch();
        const intelToGenerate = [];
        // Generate round-specific intel from templates
        if (!specificIntelType) {
            const roundIntel = getIntelForRound(roundNumber);
            intelToGenerate.push(...roundIntel);
        }
        // Generate intel based on team investments
        for (const team of teams) {
            if (team.isEliminated)
                continue;
            // Scout investment intel
            if (team.investments.scout > 0) {
                const levels = Math.floor(team.investments.scout / INVESTMENT_RETURNS.scout.cost_per_level);
                const intelCount = levels * INVESTMENT_RETURNS.scout.intel_pieces;
                for (let i = 0; i < intelCount; i++) {
                    const scoutIntel = generateScoutIntel(roundNumber, team.colonyType);
                    if (scoutIntel) {
                        intelToGenerate.push(Object.assign(Object.assign({}, scoutIntel), { targetTeam: team.id }));
                    }
                }
            }
            // Communication investment intel
            if (team.investments.communication > 0) {
                const levels = Math.floor(team.investments.communication / INVESTMENT_RETURNS.communication.cost_per_level);
                const intelCount = levels * INVESTMENT_RETURNS.communication.market_intel;
                for (let i = 0; i < intelCount; i++) {
                    const marketIntel = generateMarketIntel(roundNumber);
                    if (marketIntel) {
                        intelToGenerate.push(Object.assign(Object.assign({}, marketIntel), { targetTeam: team.id }));
                    }
                }
            }
        }
        // Create intel documents and distribute
        for (const intelData of intelToGenerate) {
            const intelId = db.collection('temp').doc().id; // Generate unique ID
            const intelRef = db.doc(`events/${eventId}/sessions/${sessionId}/intel/${intelId}`);
            const intelPiece = {
                id: intelId,
                type: intelData.type,
                title: intelData.title,
                description: intelData.description,
                baseValue: intelData.baseValue,
                currentValue: intelData.baseValue,
                roundRevealed: roundNumber,
                applicableRounds: intelData.applicableRounds || [roundNumber + 1],
                teamsKnowing: intelData.targetTeam ? [intelData.targetTeam] : [],
                distributionHistory: intelData.targetTeam ? [{
                        teamId: intelData.targetTeam,
                        acquiredAt: new Date(),
                        method: 'generated'
                    }] : [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: intelData.expiresAt || null
            };
            batch.set(intelRef, intelPiece);
            response.intelPieces.push(intelPiece);
            // Update team intel lists
            if (intelData.targetTeam) {
                const teamRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${intelData.targetTeam}`);
                batch.update(teamRef, {
                    intel: admin.firestore.FieldValue.arrayUnion(intelId)
                });
                response.distributionMap[intelId] = [intelData.targetTeam];
            }
        }
        // Generate special round events
        if (roundNumber === 3) {
            // Alien Contact event
            const alienIntel = generateAlienContactIntel();
            if (alienIntel) {
                const intelId = db.collection('temp').doc().id;
                const intelRef = db.doc(`events/${eventId}/sessions/${sessionId}/intel/${intelId}`);
                batch.set(intelRef, Object.assign(Object.assign({}, alienIntel), { id: intelId, roundRevealed: roundNumber, teamsKnowing: [], distributionHistory: [], createdAt: admin.firestore.FieldValue.serverTimestamp() }));
                response.intelPieces.push(alienIntel);
                // Enable alien contact in session
                const sessionRef = db.doc(`events/${eventId}/sessions/${sessionId}`);
                batch.update(sessionRef, {
                    'gameState.alienContactActive': true,
                    'gameState.alienResources': {
                        quantum_crystals: 10,
                        alien_tech: 5,
                        hyperfuel: 8
                    }
                });
            }
        }
        // Execute all updates
        await batch.commit();
        // Update realtime database with new intel notifications
        const realtimeUpdates = [];
        for (const intel of response.intelPieces) {
            if (intel.targetTeam) {
                realtimeUpdates.push(admin.database().ref(`sessions/${sessionId}/live/notifications`).push({
                    type: 'intel_received',
                    message: `New intelligence: ${intel.title}`,
                    targetTeam: intel.targetTeam,
                    priority: 'medium',
                    expiresAt: Date.now() + (5 * 60 * 1000),
                    timestamp: Date.now()
                }));
            }
        }
        // Add intel generation event to stream
        realtimeUpdates.push(admin.database().ref(`events/${sessionId}/stream`).push({
            type: 'intel_distributed',
            summary: `${response.intelPieces.length} intelligence pieces distributed`,
            timestamp: Date.now()
        }));
        await Promise.all(realtimeUpdates);
        response.success = true;
        return response;
    }
    catch (error) {
        console.error('Error generating intel:', error);
        response.errors = [error.message];
        return response;
    }
}
exports.generateIntel = generateIntel;
function getIntelForRound(roundNumber) {
    const roundIntel = {
        1: [
            {
                type: 'market_intel',
                title: 'Resource Survey Complete',
                description: 'Initial resource surveys show mineral deposits in sectors 7-12.',
                baseValue: 30,
                applicableRounds: [2, 3]
            }
        ],
        2: [
            {
                type: 'crisis_warning',
                title: 'Solar Storm Approaching',
                description: 'Energy costs will double in Round 3 due to solar interference.',
                baseValue: 50,
                applicableRounds: [3]
            }
        ],
        3: [
            {
                type: 'resource_discovery',
                title: 'Asteroid Belt Discovered',
                description: 'Rich mineral deposits found. Mining colonies gain +2 minerals next round.',
                baseValue: 40,
                applicableRounds: [4]
            }
        ],
        4: [
            {
                type: 'market_fluctuation',
                title: 'Supply Ship Delayed',
                description: 'Food shortage expected in Round 5. Food prices will spike.',
                baseValue: 45,
                applicableRounds: [5]
            }
        ],
        5: [
            {
                type: 'crisis_event',
                title: 'Final Resource Rush',
                description: 'Emergency protocols activated. All resource generation +50% this round.',
                baseValue: 60,
                applicableRounds: [5]
            }
        ]
    };
    return roundIntel[roundNumber] || [];
}
function generateScoutIntel(roundNumber, _colonyType) {
    const scoutIntel = [
        {
            type: 'survey_report',
            title: 'Resource Deposit Located',
            description: `Scouts have discovered a ${getRandomResource()} cache in unexplored territory.`,
            baseValue: 25
        },
        {
            type: 'market_intel',
            title: 'Trade Route Information',
            description: 'Intelligence on optimal trade routes and partner preferences.',
            baseValue: 35
        },
        {
            type: 'crisis_warning',
            title: 'Early Warning System',
            description: 'Advanced notice of potential resource shortages or market changes.',
            baseValue: 40
        }
    ];
    const randomIntel = scoutIntel[Math.floor(Math.random() * scoutIntel.length)];
    return Object.assign(Object.assign({}, randomIntel), { applicableRounds: [roundNumber + 1, roundNumber + 2] });
}
function generateMarketIntel(roundNumber) {
    const marketIntel = [
        {
            type: 'market_intel',
            title: 'Price Fluctuation Alert',
            description: 'Market analysis suggests significant price changes in basic resources.',
            baseValue: 30
        },
        {
            type: 'market_intel',
            title: 'Demand Forecast',
            description: 'Predictive analysis of resource demand for the next trading period.',
            baseValue: 35
        },
        {
            type: 'market_intel',
            title: 'Supply Chain Update',
            description: 'Information about supply disruptions and alternative sources.',
            baseValue: 40
        }
    ];
    const randomIntel = marketIntel[Math.floor(Math.random() * marketIntel.length)];
    return Object.assign(Object.assign({}, randomIntel), { applicableRounds: [roundNumber + 1] });
}
function generateAlienContactIntel() {
    return {
        type: 'alien_contact',
        title: 'First Contact Established',
        description: 'Alien civilization offers unique resources in exchange for basic materials. Limited quantities available on first-come-first-served basis.',
        baseValue: 100,
        applicableRounds: [3, 4, 5]
    };
}
function getRandomResource() {
    const resources = ['minerals', 'alloys', 'tech_components', 'energy', 'food', 'water'];
    return resources[Math.floor(Math.random() * resources.length)];
}
//# sourceMappingURL=generateIntel.js.map