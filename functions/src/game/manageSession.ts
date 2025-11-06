import * as admin from 'firebase-admin';
import { executeRound } from './executeRound';
import { getNextPhase } from '../utils/gamePhaseUtils';
import { GameSession, Resources, IntelItem } from '../types';

export interface SessionManagementRequest {
  eventId: string;
  sessionId: string;
  action: 'start' | 'pause' | 'resume' | 'next_phase' | 'end' | 'extend_time';
  data?: {
    minutes?: number;
  };
}

export interface SessionManagementResponse {
  success: boolean;
  currentPhase: string;
  timeRemaining?: number;
  message?: string;
  errors?: string[];
}

export async function manageSession(data: SessionManagementRequest): Promise<SessionManagementResponse> {
  const { eventId, sessionId, action, data: actionData } = data;
  
  try {
    const db = admin.firestore();
    const sessionRef = db.doc(`events/${eventId}/sessions/${sessionId}`);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }
    
    const sessionData = sessionDoc.data()!;
    let response: SessionManagementResponse = {
      success: false,
      currentPhase: sessionData.currentPhase
    };
    
    switch (action) {
      case 'start':
        response = await startSession(sessionRef, sessionData);
        break;
        
      case 'pause':
        response = await pauseSession(sessionRef, sessionData, sessionId);
        break;
        
      case 'resume':
        response = await resumeSession(sessionRef, sessionData, sessionId);
        break;
        
      case 'next_phase':
        response = await advancePhase(sessionRef, sessionData, eventId, sessionId);
        break;
        
      case 'extend_time':
        response = await extendPhaseTime(sessionRef, sessionData, sessionId, actionData?.minutes || 5);
        break;
        
      case 'end':
        response = await endSession(sessionRef, sessionData, eventId, sessionId);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return response;
    
  } catch (error) {
    console.error('Error managing session:', error);
    return {
      success: false,
      currentPhase: 'unknown',
      errors: [(error as Error).message]
    };
  }
}

async function startSession(sessionRef: admin.firestore.DocumentReference, sessionData: GameSession): Promise<SessionManagementResponse> {
  if (sessionData.isActive) {
    throw new Error('Session is already active');
  }
  
  const now = Date.now();
  const instructionsDuration = sessionData.phaseConfig.instructions * 1000;
  
  await sessionRef.update({
    isActive: true,
    currentPhase: 'instructions',
    roundStartTime: now,
    roundEndTime: now + instructionsDuration,
    startedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Update realtime database
  await admin.database().ref(`sessions/${sessionData.id}/live/gameState`).set({
    currentPhase: 'instructions',
    roundStartTime: now,
    roundEndTime: now + instructionsDuration,
    timeRemaining: instructionsDuration,
    isPaused: false
  });
  
  // Add event to stream
  await admin.database().ref(`events/${sessionData.id}/stream`).push({
    type: 'round_started',
    summary: 'Game session started - Instructions phase',
    timestamp: now
  });
  
  return {
    success: true,
    currentPhase: 'instructions',
    timeRemaining: instructionsDuration,
    message: 'Session started successfully'
  };
}

async function pauseSession(sessionRef: admin.firestore.DocumentReference, sessionData: GameSession, sessionId: string): Promise<SessionManagementResponse> {
  if (!sessionData.isActive) {
    throw new Error('Session is not active');
  }
  
  const now = Date.now();
  const timeRemaining = Math.max(0, sessionData.roundEndTime - now);
  
  await sessionRef.update({
    timeRemaining: timeRemaining,
    pausedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Update realtime database
  await admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
    isPaused: true,
    timeRemaining: timeRemaining
  });
  
  return {
    success: true,
    currentPhase: sessionData.currentPhase,
    timeRemaining: timeRemaining,
    message: 'Session paused'
  };
}

async function resumeSession(sessionRef: admin.firestore.DocumentReference, sessionData: GameSession, sessionId: string): Promise<SessionManagementResponse> {
  if (!sessionData.timeRemaining) {
    throw new Error('Session is not paused');
  }
  
  const now = Date.now();
  const newEndTime = now + sessionData.timeRemaining;
  
  await sessionRef.update({
    roundEndTime: newEndTime,
    timeRemaining: admin.firestore.FieldValue.delete(),
    pausedAt: admin.firestore.FieldValue.delete()
  });
  
  // Update realtime database
  await admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
    roundEndTime: newEndTime,
    isPaused: false
  });
  
  return {
    success: true,
    currentPhase: sessionData.currentPhase,
    timeRemaining: sessionData.timeRemaining,
    message: 'Session resumed'
  };
}

async function advancePhase(sessionRef: admin.firestore.DocumentReference, sessionData: GameSession, eventId: string, sessionId: string): Promise<SessionManagementResponse> {
  const currentPhase = sessionData.currentPhase;
  const nextPhase = getNextPhase(currentPhase);
  
  if (nextPhase === currentPhase) {
    throw new Error('Session is already in final phase');
  }
  
  // If advancing from a round phase, execute round logic
  if (currentPhase.includes('round_')) {
    const roundNumber = parseInt(currentPhase.split('_')[1]);
    await executeRound({
      eventId,
      sessionId,
      roundNumber,
      forcedExecution: true
    });
  }
  
  const now = Date.now();
  const phaseDuration = sessionData.phaseConfig[nextPhase] * 1000;
  const newEndTime = now + phaseDuration;
  
  await sessionRef.update({
    currentPhase: nextPhase,
    currentRound: nextPhase.includes('round') ? sessionData.currentRound + 1 : sessionData.currentRound,
    roundStartTime: now,
    roundEndTime: newEndTime
  });
  
  // Update realtime database
  await admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
    currentPhase: nextPhase,
    roundStartTime: now,
    roundEndTime: newEndTime,
    timeRemaining: phaseDuration,
    isPaused: false
  });
  
  // Add phase change event
  await admin.database().ref(`events/${sessionId}/stream`).push({
    type: 'phase_change',
    summary: `Advanced to ${nextPhase}`,
    timestamp: now
  });
  
  return {
    success: true,
    currentPhase: nextPhase,
    timeRemaining: phaseDuration,
    message: `Advanced to ${nextPhase}`
  };
}

async function extendPhaseTime(sessionRef: admin.firestore.DocumentReference, sessionData: GameSession, sessionId: string, minutes: number): Promise<SessionManagementResponse> {
  const extensionMs = minutes * 60 * 1000;
  const newEndTime = sessionData.roundEndTime + extensionMs;
  
  await sessionRef.update({
    roundEndTime: newEndTime
  });
  
  // Update realtime database
  await admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
    roundEndTime: newEndTime,
    timeRemaining: newEndTime - Date.now()
  });
  
  return {
    success: true,
    currentPhase: sessionData.currentPhase,
    timeRemaining: newEndTime - Date.now(),
    message: `Extended phase by ${minutes} minutes`
  };
}

async function endSession(sessionRef: admin.firestore.DocumentReference, _sessionData: GameSession, eventId: string, sessionId: string): Promise<SessionManagementResponse> {
  // Calculate final scores
  const finalScores = await calculateFinalScores(eventId, sessionId);
  
  await sessionRef.update({
    isActive: false,
    currentPhase: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    leaderboard: finalScores
  });
  
  // Update realtime database
  await admin.database().ref(`sessions/${sessionId}/live/gameState`).update({
    currentPhase: 'completed',
    isPaused: false
  });
  
  await admin.database().ref(`leaderboards/${sessionId}`).set(finalScores);
  
  // Add completion event
  await admin.database().ref(`events/${sessionId}/stream`).push({
    type: 'session_completed',
    summary: 'Game session completed',
    timestamp: Date.now()
  });
  
  return {
    success: true,
    currentPhase: 'completed',
    message: 'Session completed successfully'
  };
}

// getNextPhase moved to utils/gamePhaseUtils.ts

interface TeamScore {
  teamId: string;
  score: number;
  rank: number;
  trend: string;
}

async function calculateFinalScores(eventId: string, sessionId: string): Promise<TeamScore[]> {
  const db = admin.firestore();
  const teamsSnapshot = await db.collection(`events/${eventId}/sessions/${sessionId}/teams`).get();
  
  const scores = [];
  
  for (const teamDoc of teamsSnapshot.docs) {
    const team = teamDoc.data();
    
    // Basic survival score (rounds survivable with current resources)
    const survivalScore = calculateSurvivalScore(team.resources);
    
    // Efficiency multipliers
    const tradeSuccessRate = team.statistics.totalTrades > 0 
      ? team.statistics.successfulTrades / team.statistics.totalTrades 
      : 0;
    
    const efficiencyMultiplier = 1 + (tradeSuccessRate * 0.2);
    
    const finalScore = Math.floor(survivalScore * efficiencyMultiplier);
    
    scores.push({
      teamId: teamDoc.id,
      score: finalScore,
      rank: 0, // Will be set after sorting
      trend: 'same'
    });
  }
  
  // Sort by score and assign ranks
  scores.sort((a, b) => b.score - a.score);
  scores.forEach((score, index) => {
    score.rank = index + 1;
  });
  
  return scores;
}

function calculateSurvivalScore(resources: Resources): number {
  // Calculate how many rounds the team could survive with current resources
  const basicResources = ['oxygen', 'food', 'water', 'energy'];
  const consumption: Record<string, number> = { oxygen: 2, food: 2, water: 1, energy: 3 };
  
  let minRounds = Infinity;
  
  for (const resource of basicResources) {
    const available = resources[resource] || 0;
    const consumedPerRound = consumption[resource];
    const roundsSurvivable = Math.floor(available / consumedPerRound);
    minRounds = Math.min(minRounds, roundsSurvivable);
  }
  
  // Base score is survival rounds * 100, plus bonus for excess resources
  const baseScore = minRounds * 100;
  const resourceBonus = Object.values(resources).reduce((sum: number, amount: number | IntelItem[] | undefined) => {
    if (typeof amount === 'number') {
      return sum + (amount || 0);
    }
    return sum;
  }, 0);
  
  return baseScore + resourceBonus;
}