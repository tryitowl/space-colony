import type { ColonyType } from '../types/base.types';

/**
 * Centralized ID generation utilities for consistent ID creation across the application
 * 
 * This ensures that colony IDs, team IDs, and other identifiers are generated
 * consistently regardless of whether the system is in flexible or standard mode.
 */

/**
 * Generate a colony/team ID based on galaxy, colony type, and team number
 * 
 * @param galaxyId - The galaxy ID (e.g., 'galaxy_0', 'alpha', etc.)
 * @param colonyType - The type of colony (mining, agricultural, etc.)
 * @param teamNumber - The team number (1-based)
 * @param mode - 'flexible' or 'standard' mode
 * @returns A consistent colony/team ID
 */
export function generateColonyId(
  galaxyId: string,
  colonyType: ColonyType,
  teamNumber: number,
  mode: 'flexible' | 'standard' = 'standard'
): string {
  // Always use consistent format: galaxyId_colonyType_teamNumber
  // This ensures AI configs can match teams regardless of mode
  return `${galaxyId}_${colonyType}_${teamNumber}`;
}

/**
 * Parse a colony ID to extract its components
 * 
 * @param colonyId - The colony ID to parse
 * @returns Parsed components or null if invalid format
 */
export function parseColonyId(colonyId: string): {
  galaxyId: string;
  colonyType: string;
  teamNumber: number;
} | null {
  const parts = colonyId.split('_');
  
  // Handle various formats
  if (parts.length >= 3) {
    // Format: galaxy_0_mining_1 or alpha_mining_1
    const teamNumber = parseInt(parts[parts.length - 1]);
    if (!isNaN(teamNumber)) {
      const colonyType = parts[parts.length - 2];
      const galaxyId = parts.slice(0, parts.length - 2).join('_');
      return { galaxyId, colonyType, teamNumber };
    }
  } else if (parts.length === 2) {
    // Legacy format: mining_1
    const teamNumber = parseInt(parts[1]);
    if (!isNaN(teamNumber)) {
      return {
        galaxyId: 'galaxy_0', // Default galaxy
        colonyType: parts[0],
        teamNumber
      };
    }
  }
  
  return null;
}

/**
 * Check if two colony IDs refer to the same team
 * Handles different ID formats gracefully
 * 
 * @param id1 - First colony ID
 * @param id2 - Second colony ID
 * @returns True if they refer to the same team
 */
export function isSameColony(id1: string, id2: string): boolean {
  if (id1 === id2) return true;
  
  const parsed1 = parseColonyId(id1);
  const parsed2 = parseColonyId(id2);
  
  if (!parsed1 || !parsed2) return false;
  
  return (
    parsed1.galaxyId === parsed2.galaxyId &&
    parsed1.colonyType === parsed2.colonyType &&
    parsed1.teamNumber === parsed2.teamNumber
  );
}

/**
 * Normalize a colony ID to standard format
 * 
 * @param colonyId - The colony ID to normalize
 * @returns Normalized colony ID or original if cannot parse
 */
export function normalizeColonyId(colonyId: string): string {
  const parsed = parseColonyId(colonyId);
  if (!parsed) return colonyId;
  
  return generateColonyId(
    parsed.galaxyId,
    parsed.colonyType as ColonyType,
    parsed.teamNumber
  );
}

/**
 * Generate a unique session ID
 * 
 * @param prefix - Optional prefix for the session ID
 * @returns A unique session ID
 */
export function generateSessionId(prefix: string = 'session'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a unique trade ID
 * 
 * @param initiatorId - ID of the trade initiator
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns A unique trade ID
 */
export function generateTradeId(initiatorId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `trade_${initiatorId}_${ts}_${random}`;
}

/**
 * Generate a unique player ID
 * 
 * @param teamId - The team ID the player belongs to
 * @param playerNumber - The player number within the team
 * @returns A unique player ID
 */
export function generatePlayerId(teamId: string, playerNumber: number): string {
  return `${teamId}_player_${playerNumber}`;
}

/**
 * Extract team information from various ID formats
 * Useful for matching AI configs to teams
 * 
 * @param id - Any ID that might contain team information
 * @returns Extracted team info or null
 */
export function extractTeamInfo(id: string): {
  colonyType: string;
  teamNumber?: number;
  galaxyId?: string;
} | null {
  // Try parsing as colony ID first
  const parsed = parseColonyId(id);
  if (parsed) {
    return {
      colonyType: parsed.colonyType,
      teamNumber: parsed.teamNumber,
      galaxyId: parsed.galaxyId
    };
  }
  
  // Try other patterns
  const patterns = [
    /^(mining|agricultural|research|trade_hub|military|manufacturing)_(\d+)$/,
    /^galaxy_\d+_(mining|agricultural|research|trade_hub|military|manufacturing)_(\d+)$/,
    /^([a-zA-Z]+)_(mining|agricultural|research|trade_hub|military|manufacturing)_(\d+)$/
  ];
  
  for (const pattern of patterns) {
    const match = id.match(pattern);
    if (match) {
      if (match.length === 3) {
        // Simple format: colonyType_number
        return {
          colonyType: match[1],
          teamNumber: parseInt(match[2])
        };
      } else if (match.length === 4) {
        // Galaxy format
        return {
          galaxyId: match[1],
          colonyType: match[2],
          teamNumber: parseInt(match[3])
        };
      }
    }
  }
  
  // Check if it's just a colony type
  const colonyTypes = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];
  if (colonyTypes.includes(id)) {
    return { colonyType: id };
  }
  
  return null;
}