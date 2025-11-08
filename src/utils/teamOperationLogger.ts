import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase/config';

export interface TeamOperationLog {
  operation: 'create' | 'update' | 'updateResources' | 'delete' | 'query' | 
             'querySessionTeams' | 'queryGalaxyTeams' | 'addPlayer' | 'removePlayer' | 
             'batchUpdate' | 'verifyResources';
  teamId?: string;
  sessionId?: string;
  galaxyId?: string;
  data?: any;
  success: boolean;
  error?: string;
  timestamp?: any;
  performedBy?: string;
  queryTime?: number;
}

/**
 * Log team operations for monitoring and debugging
 */
export async function logTeamOperation(log: TeamOperationLog): Promise<void> {
  try {
    // Add timestamp if not provided
    if (!log.timestamp) {
      log.timestamp = serverTimestamp();
    }
    
    // Add performance metrics for queries
    if (log.operation.startsWith('query') && log.data?.queryTime) {
      console.log(`[TeamOp] ${log.operation} completed in ${log.data.queryTime}ms`);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[TeamOp]', {
        op: log.operation,
        teamId: log.teamId,
        success: log.success,
        error: log.error,
        data: log.data
      });
    }
    
    // Write to Firestore audit log
    await addDoc(collection(firestore, 'teamOperationLogs'), log);
    
    // Alert on failures
    if (!log.success && log.error) {
      console.error(`[TeamOp] Operation failed: ${log.operation}`, {
        teamId: log.teamId,
        error: log.error,
        data: log.data
      });
    }
    
    // Track critical operations
    if (log.operation === 'delete' || log.operation === 'batchUpdate') {
      console.warn(`[TeamOp] Critical operation performed: ${log.operation}`, {
        teamId: log.teamId,
        data: log.data
      });
    }
  } catch (error) {
    // Don't throw errors from logging - we don't want to break operations
    console.error('[TeamOp] Failed to log operation:', error);
  }
}

/**
 * Get team operation logs for debugging
 */
export async function getTeamOperationLogs(
  filters: {
    teamId?: string;
    sessionId?: string;
    operation?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }
): Promise<TeamOperationLog[]> {
  try {
    // This would query the logs collection with filters
    // Implementation depends on specific debugging needs
    console.log('[TeamOp] Getting logs with filters:', filters);
    return [];
  } catch (error) {
    console.error('[TeamOp] Failed to get logs:', error);
    return [];
  }
}

/**
 * Monitor team operations in real-time
 */
export function monitorTeamOperations(
  _callback: (log: TeamOperationLog) => void
): () => void {
  // This would set up a real-time listener on the logs collection
  // Useful for live monitoring dashboards
  console.log('[TeamOp] Monitoring started');
  
  return () => {
    console.log('[TeamOp] Monitoring stopped');
  };
}

/**
 * Analyze team operation patterns
 */
export async function analyzeTeamOperations(
  sessionId: string,
  _timeWindow: { start: Date; end: Date }
): Promise<{
  totalOperations: number;
  successRate: number;
  averageQueryTime: number;
  operationBreakdown: Record<string, number>;
  errorTypes: Record<string, number>;
}> {
  try {
    // This would aggregate logs for the session
    // Useful for performance monitoring and optimization
    console.log('[TeamOp] Analyzing operations for session:', sessionId);
    
    return {
      totalOperations: 0,
      successRate: 0,
      averageQueryTime: 0,
      operationBreakdown: {},
      errorTypes: {}
    };
  } catch (error) {
    console.error('[TeamOp] Failed to analyze operations:', error);
    throw error;
  }
}