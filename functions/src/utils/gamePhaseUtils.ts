/**
 * Shared game phase utilities
 */

export type GamePhase = 
  | 'setup' 
  | 'instructions' 
  | 'investment' 
  | 'round_1' 
  | 'round_2' 
  | 'milestone' 
  | 'round_3' 
  | 'round_4' 
  | 'round_5' 
  | 'completed';

// Unified phase order - includes both 'setup' and 'instructions' for compatibility
const PHASE_ORDER: GamePhase[] = [
  'setup',        // Used in some flows
  'instructions', // Used in other flows
  'investment', 
  'round_1', 
  'round_2', 
  'milestone', 
  'round_3', 
  'round_4', 
  'round_5', 
  'completed'
];

/**
 * Get the next phase in the game sequence
 * @param currentPhase The current game phase
 * @returns The next phase, or 'completed' if already at the end
 */
export function getNextPhase(currentPhase: string): GamePhase {
  const normalizedPhase = currentPhase === 'setup' ? 'instructions' : currentPhase;
  const currentIndex = PHASE_ORDER.indexOf(normalizedPhase as GamePhase);
  
  if (currentIndex === -1) {
    console.warn(`Unknown phase: ${currentPhase}, defaulting to instructions`);
    return 'instructions';
  }
  
  return PHASE_ORDER[Math.min(currentIndex + 1, PHASE_ORDER.length - 1)];
}

/**
 * Check if a phase is a trading round
 * @param phase The game phase to check
 * @returns True if the phase is a trading round
 */
export function isTradingRound(phase: string): boolean {
  return /^round_\d$/.test(phase);
}

/**
 * Get the round number from a phase
 * @param phase The game phase
 * @returns The round number (1-5) or null if not a round
 */
export function getRoundNumber(phase: string): number | null {
  const match = phase.match(/^round_(\d)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if the game is complete
 * @param phase The current game phase
 * @returns True if the game is completed
 */
export function isGameComplete(phase: string): boolean {
  return phase === 'completed';
}

/**
 * Get display name for a phase
 * @param phase The game phase
 * @returns Human-readable phase name
 */
export function getPhaseDisplayName(phase: string): string {
  const displayNames: Record<string, string> = {
    'setup': 'Setup',
    'instructions': 'Instructions',
    'investment': 'Investment Phase',
    'round_1': 'Round 1',
    'round_2': 'Round 2',
    'milestone': 'Milestone Event',
    'round_3': 'Round 3',
    'round_4': 'Round 4',
    'round_5': 'Round 5',
    'completed': 'Game Complete'
  };
  
  return displayNames[phase] || phase;
}