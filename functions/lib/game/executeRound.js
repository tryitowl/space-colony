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
exports.executeRound = void 0;
const admin = __importStar(require("firebase-admin"));
const generateIntel_1 = require("./generateIntel");
const RESOURCE_CONSUMPTION = {
    oxygen: 2,
    food: 2,
    water: 1,
    energy: 3
};
const INVESTMENT_RETURNS = {
    production: {
        cost_per_level: 5,
        specialty_bonus: 3
    },
    research: {
        cost_per_level: 4,
        tech_patents: 1
    },
    emergency: {
        basic_resources: 50 // 50 basic resources per 100 credits invested
    }
};
async function executeRound(data) {
    var _a;
    const { eventId, sessionId, roundNumber, forcedExecution = false } = data;
    const response = {
        success: false,
        eliminatedTeams: [],
        resourcesConsumed: {},
        resourcesGenerated: {},
        newIntelGenerated: 0,
        errors: []
    };
    try {
        const db = admin.firestore();
        const sessionRef = db.doc(`events/${eventId}/sessions/${sessionId}`);
        const teamsRef = db.collection(`events/${eventId}/sessions/${sessionId}/teams`);
        const [sessionDoc, teamsSnapshot] = await Promise.all([
            sessionRef.get(),
            teamsRef.get()
        ]);
        if (!sessionDoc.exists) {
            throw new Error('Session not found');
        }
        const sessionData = sessionDoc.data();
        const teams = teamsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Validate round execution timing
        if (!forcedExecution && sessionData.roundEndTime > Date.now()) {
            throw new Error('Round has not ended yet');
        }
        const batch = db.batch();
        const eliminatedTeams = [];
        let totalResourcesConsumed = Object.assign({}, RESOURCE_CONSUMPTION);
        let totalResourcesGenerated = {};
        // Process each team
        for (const team of teams) {
            if (team.isEliminated)
                continue;
            const teamRef = db.doc(`events/${eventId}/sessions/${sessionId}/teams/${team.id}`);
            let updatedResources = Object.assign({}, team.resources);
            let criticalModeRounds = team.criticalModeRounds || 0;
            let isEliminated = false;
            // Apply resource consumption
            let inCriticalMode = false;
            for (const [resource, consumptionAmount] of Object.entries(RESOURCE_CONSUMPTION)) {
                const consumed = consumptionAmount;
                updatedResources[resource] = Math.max(0, updatedResources[resource] - consumed);
                // Check for critical mode (any basic resource at 0)
                if (['oxygen', 'food', 'water', 'energy'].includes(resource) && updatedResources[resource] === 0) {
                    inCriticalMode = true;
                }
            }
            // Apply resource generation from investments
            const generatedResources = calculateResourceGeneration(team.investments, team.colonyType);
            for (const [resource, amount] of Object.entries(generatedResources)) {
                updatedResources[resource] = (updatedResources[resource] || 0) + amount;
            }
            // Update critical mode status
            if (inCriticalMode) {
                criticalModeRounds += 1;
            }
            else {
                criticalModeRounds = 0;
            }
            // Check for elimination (2 consecutive rounds in critical mode)
            if (criticalModeRounds >= 2) {
                isEliminated = true;
                eliminatedTeams.push(team.id);
            }
            // Update team data
            batch.update(teamRef, {
                resources: updatedResources,
                criticalModeRounds,
                isEliminated,
                eliminationRound: isEliminated ? roundNumber : null,
                lastActivity: admin.firestore.FieldValue.serverTimestamp()
            });
            // Track totals for response
            for (const [resource, amount] of Object.entries(generatedResources)) {
                totalResourcesGenerated[resource] = (totalResourcesGenerated[resource] || 0) + amount;
            }
        }
        // Generate intel for this round
        const intelResult = await (0, generateIntel_1.generateIntel)({
            eventId,
            sessionId,
            roundNumber,
            teams: teams.filter(t => !t.isEliminated)
        });
        response.newIntelGenerated = ((_a = intelResult.intelPieces) === null || _a === void 0 ? void 0 : _a.length) || 0;
        // Update session with round completion
        const nextPhase = getNextGamePhase(sessionData.currentPhase);
        const nextRoundStart = Date.now() + (5000); // 5 second buffer
        const nextRoundEnd = nextRoundStart + (sessionData.phaseConfig[nextPhase] * 1000);
        batch.update(sessionRef, {
            currentPhase: nextPhase,
            currentRound: nextPhase.includes('round') ? roundNumber + 1 : roundNumber,
            roundStartTime: nextRoundStart,
            roundEndTime: nextRoundEnd,
            [`gameState.roundHistory`]: admin.firestore.FieldValue.arrayUnion({
                round: roundNumber,
                startTime: sessionData.roundStartTime,
                endTime: Date.now(),
                tradesCompleted: 0,
                teamsEliminated: eliminatedTeams,
                marketEvents: [],
                topPerformers: [] // Calculate based on scoring
            })
        });
        // Update realtime database
        const realtimeUpdates = [];
        // Update session live data
        realtimeUpdates.push(admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
            currentPhase: nextPhase,
            roundStartTime: nextRoundStart,
            roundEndTime: nextRoundEnd,
            timeRemaining: nextRoundEnd - nextRoundStart,
            isPaused: false
        }));
        // Update team statuses
        for (const team of teams) {
            if (eliminatedTeams.includes(team.id)) {
                realtimeUpdates.push(admin.database().ref(`teams/${sessionId}/${team.id}/status`).update({
                    tradingStatus: 'eliminated',
                    lastAction: {
                        type: 'team_eliminated',
                        timestamp: Date.now()
                    }
                }));
            }
        }
        // Add round end event to stream
        realtimeUpdates.push(admin.database().ref(`events/${sessionId}/stream`).push({
            type: 'round_ended',
            summary: `Round ${roundNumber} completed. ${eliminatedTeams.length} teams eliminated.`,
            timestamp: Date.now()
        }));
        // Execute all updates
        await batch.commit();
        await Promise.all(realtimeUpdates);
        response.success = true;
        response.eliminatedTeams = eliminatedTeams;
        response.resourcesConsumed = totalResourcesConsumed;
        response.resourcesGenerated = totalResourcesGenerated;
        return response;
    }
    catch (error) {
        console.error('Error executing round:', error);
        response.errors = [error.message];
        return response;
    }
}
exports.executeRound = executeRound;
function calculateResourceGeneration(investments, colonyType) {
    const generated = {};
    // Scout investment generates intel (handled separately)
    // Production investment generates specialty resources
    if (investments.production > 0) {
        const levels = Math.floor(investments.production / INVESTMENT_RETURNS.production.cost_per_level);
        const specialtyResource = getSpecialtyResource(colonyType);
        if (specialtyResource) {
            generated[specialtyResource] = levels * INVESTMENT_RETURNS.production.specialty_bonus;
        }
    }
    // Research investment generates tech patents
    if (investments.research > 0) {
        const levels = Math.floor(investments.research / INVESTMENT_RETURNS.research.cost_per_level);
        generated.tech = levels * INVESTMENT_RETURNS.research.tech_patents;
    }
    // Communication investment generates market intel (handled in intel generation)
    // Emergency investment generates basic resources
    if (investments.emergency > 0) {
        const resourcesPerCredit = INVESTMENT_RETURNS.emergency.basic_resources / 100;
        const totalBasicGenerated = investments.emergency * resourcesPerCredit;
        // Distribute among basic resources
        const basicResources = ['oxygen', 'food', 'water', 'energy'];
        const perResource = totalBasicGenerated / basicResources.length;
        basicResources.forEach(resource => {
            generated[resource] = Math.floor(perResource);
        });
    }
    return generated;
}
function getSpecialtyResource(colonyType) {
    const specialtyMap = {
        mining: 'minerals',
        agricultural: 'food',
        research: 'tech',
        trade_hub: 'credits',
        military: 'defense',
        manufacturing: 'production'
    };
    return specialtyMap[colonyType] || null;
}
function getNextGamePhase(currentPhase) {
    const phaseOrder = [
        'setup', 'investment', 'round_1', 'round_2', 'milestone',
        'round_3', 'round_4', 'round_5', 'completed'
    ];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return phaseOrder[Math.min(currentIndex + 1, phaseOrder.length - 1)];
}
//# sourceMappingURL=executeRound.js.map