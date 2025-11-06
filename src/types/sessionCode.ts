/**
 * Session Code Types
 * 
 * Type definitions for the session code system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Session code format: XXXX-YYY
 * - Event code: 4 alphanumeric characters
 * - Galaxy code: 3 alphanumeric characters
 */
export interface SessionCode {
  /** 4-character event code (e.g., "C725", "MSFT") */
  eventCode: string;
  
  /** 3-character galaxy code (e.g., "ADA", "MLK") */
  galaxyCode: string;
  
  /** Full code in XXXX-YYY format */
  fullCode: string;
  
  /** Associated session ID */
  sessionId: string;
  
  /** When the code was reserved */
  reservedAt: Timestamp;
  
  /** When the code expires (24 hours after last activity) */
  expiresAt: Timestamp;
  
  /** Whether this is a custom admin-set code */
  isCustom: boolean;
  
  /** Whether the code is currently active */
  isActive: boolean;
  
  /** If replaced, the new code that replaced this one */
  replacedBy?: string;
  
  /** When the code was replaced */
  replacedAt?: Timestamp;
  
  /** When the code was expired */
  expiredAt?: Timestamp;
}

/**
 * Options for generating a session code
 */
export interface CodeGenerationOptions {
  /** Custom event code (4 characters) */
  eventCode?: string;
  
  /** Custom galaxy code (3 characters) */
  galaxyCode?: string;
  
  /** Whether this is a custom admin-generated code */
  isCustom?: boolean;
}

/**
 * Session code lookup result
 */
export interface CodeLookupResult {
  /** Whether the lookup was successful */
  success: boolean;
  
  /** The session ID if found */
  sessionId: string | null;
  
  /** Time taken for the lookup in milliseconds */
  lookupTime: number;
  
  /** Error message if lookup failed */
  error: string | null;
  
  /** Additional metadata about the code */
  metadata?: {
    isExpired: boolean;
    isCustom: boolean;
    expiresAt: Date;
  };
}

/**
 * Code validation result
 */
export interface CodeValidationResult {
  /** Whether the code format is valid */
  isValid: boolean;
  
  /** Parsed event code if valid */
  eventCode?: string;
  
  /** Parsed galaxy code if valid */
  galaxyCode?: string;
  
  /** Validation error if invalid */
  error?: string;
}

/**
 * Session code statistics
 */
export interface CodeStatistics {
  /** Total number of codes in the system */
  totalCodes: number;
  
  /** Number of currently active codes */
  activeCodes: number;
  
  /** Number of expired codes */
  expiredCodes: number;
  
  /** Number of custom admin-set codes */
  customCodes: number;
  
  /** Average lookup time in milliseconds */
  averageLookupTime: number;
  
  /** Additional performance metrics */
  performance?: {
    cacheHitRate: number;
    p95LookupTime: number;
    p99LookupTime: number;
  };
}

/**
 * Admin action for code management
 */
export interface CodeAdminAction {
  /** Type of action performed */
  action: 'customCodeSet' | 'codeExpired' | 'codeReserved';
  
  /** Admin user ID who performed the action */
  adminId: string;
  
  /** Affected session ID */
  sessionId: string;
  
  /** Previous code if applicable */
  oldCode?: string;
  
  /** New code if applicable */
  newCode?: string;
  
  /** When the action was performed */
  timestamp: Timestamp;
  
  /** Additional notes or reason */
  notes?: string;
}

/**
 * Code format examples for UI display
 */
export interface CodeExample {
  /** Example code */
  code: string;
  
  /** Description of the code usage */
  description: string;
  
  /** Category of the example */
  category: 'corporate' | 'standard' | 'themed';
}

/**
 * Session with code information
 */
export interface SessionWithCode {
  /** Session ID */
  id: string;
  
  /** Session code */
  code: string;
  
  /** When the code was reserved */
  codeReservedAt: Timestamp;
  
  /** Other session properties */
  [key: string]: any;
}