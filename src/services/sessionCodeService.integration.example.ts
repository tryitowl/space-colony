/**
 * Session Code Service Integration Examples
 * 
 * This file demonstrates how to integrate the session code service
 * into the Space Colony Exchange application.
 */

import { sessionCodeService } from './sessionCodeService';

// Example 1: Creating a new session with auto-generated code
export async function createSessionWithCode() {
  const sessionId = 'session-' + Date.now();
  
  try {
    // Generate a new session code
    const code = await sessionCodeService.generateSessionCode(sessionId);
    console.log(`New session created with code: ${code}`);
    
    // Code format: XXXX-YYY (e.g., "C725-ADA")
    return { sessionId, code };
  } catch (error) {
    console.error('Failed to create session code:', error);
    throw error;
  }
}

// Example 2: Creating a session with custom event code
export async function createCorporateSession(companyCode: string) {
  const sessionId = 'corp-session-' + Date.now();
  
  try {
    // Use company code as event code, auto-generate galaxy code
    const code = await sessionCodeService.generateSessionCode(sessionId, {
      eventCode: companyCode, // e.g., "MSFT", "GOOGL", "AMZN"
      isCustom: true
    });
    
    console.log(`Corporate session created: ${code}`);
    return { sessionId, code };
  } catch (error) {
    console.error('Failed to create corporate session:', error);
    throw error;
  }
}

// Example 3: Player joining a session by code
export async function joinSessionByCode(playerCode: string) {
  try {
    // Validate format first
    if (!sessionCodeService.validateCodeFormat(playerCode)) {
      throw new Error('Invalid code format. Please enter a code like "C725-ADA"');
    }
    
    // Look up the session
    const sessionId = await sessionCodeService.lookupSessionByCode(playerCode);
    
    if (!sessionId) {
      throw new Error('Session not found or has expired. Please check your code.');
    }
    
    console.log(`Found session: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error('Failed to join session:', error);
    throw error;
  }
}

// Example 4: Admin setting a custom memorable code
export async function setMemorableCode(
  sessionId: string, 
  eventName: string,
  theme: string,
  adminId: string
) {
  try {
    // Create memorable codes like "NASA-MRS" for Mars mission event
    const eventCode = eventName.substring(0, 4).toUpperCase();
    const galaxyCode = theme.substring(0, 3).toUpperCase();
    const customCode = `${eventCode}-${galaxyCode}`;
    
    await sessionCodeService.setCustomCode(sessionId, customCode, adminId);
    console.log(`Custom code set: ${customCode}`);
    
    return customCode;
  } catch (error) {
    console.error('Failed to set custom code:', error);
    throw error;
  }
}

// Example 5: React hook for session code lookup
export function useSessionCodeLookup() {
  // This would be implemented as a proper React hook
  return {
    lookupCode: async (code: string) => {
      const startTime = performance.now();
      
      try {
        const sessionId = await sessionCodeService.lookupSessionByCode(code);
        const lookupTime = performance.now() - startTime;
        
        console.log(`Lookup completed in ${lookupTime.toFixed(0)}ms`);
        
        return {
          success: !!sessionId,
          sessionId,
          lookupTime,
          error: sessionId ? null : 'Invalid or expired code'
        };
      } catch (error) {
        return {
          success: false,
          sessionId: null,
          lookupTime: performance.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

// Example 6: Facilitator dashboard integration
export async function getFacilitatorDashboardData() {
  try {
    const stats = await sessionCodeService.getCodeStatistics();
    
    return {
      stats,
      insights: {
        utilizationRate: (stats.activeCodes / stats.totalCodes) * 100,
        customCodeRate: (stats.customCodes / stats.totalCodes) * 100,
        performanceStatus: stats.averageLookupTime < 100 ? 'Excellent' : 'Needs Attention'
      }
    };
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    throw error;
  }
}

// Example 7: Scheduled maintenance task
export async function performCodeMaintenance() {
  try {
    console.log('Starting code maintenance...');
    
    const expiredCount = await sessionCodeService.cleanupExpiredCodes();
    
    console.log(`Cleaned up ${expiredCount} expired codes`);
    
    return {
      success: true,
      expiredCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Code maintenance failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Example 8: Code format examples for UI
export const CODE_FORMAT_EXAMPLES = {
  corporate: [
    { code: 'MSFT-CEO', description: 'Microsoft CEO Summit' },
    { code: 'GOOGL-AI1', description: 'Google AI Conference' },
    { code: 'AMZN-AWS', description: 'Amazon AWS Training' }
  ],
  standard: [
    { code: 'C725-ADA', description: 'Standard format' },
    { code: 'X9B2-MLK', description: 'Mixed alphanumeric' },
    { code: '2024-JAN', description: 'Date-based event' }
  ],
  themed: [
    { code: 'NASA-MRS', description: 'Mars Mission' },
    { code: 'SPCE-ISS', description: 'Space Station' },
    { code: 'MOON-LND', description: 'Lunar Landing' }
  ]
};

// Example 9: Error handling helper
export function getCodeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('inappropriate content')) {
      return 'This code contains inappropriate content. Please choose a different code.';
    }
    if (error.message.includes('already in use')) {
      return 'This code is already taken. Please try another.';
    }
    if (error.message.includes('Invalid code format')) {
      return 'Please enter a code in the format XXXX-YYY (e.g., C725-ADA)';
    }
    if (error.message.includes('expired')) {
      return 'This session has expired. Please request a new code from your facilitator.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}