import {
  doc,
  getDoc
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { sessionCodeService } from './sessionCodeService';
import { teamDataService } from './teamDataService';
import type { GameSession } from '../types';
import type { ReportingConfiguration } from '../types/galaxy.types';

export interface SessionLookupResult {
  sessionId: string;
  eventId: string;
  sessionName: string;
  reportingConfig?: ReportingConfiguration;
  requiresPlayerData: boolean;
  playerDataFields: PlayerDataField[];
  availableTeams: AvailableTeam[];
  status: 'active' | 'expired' | 'full';
}

export interface PlayerDataField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface AvailableTeam {
  id: string;
  name: string;
  type: string;
  colonyType: string;
  currentPlayers: number;
  maxPlayers: number;
  isAvailable: boolean;
}

export interface PlayerData {
  name: string;
  department?: string;
  email?: string;
  yearsExperience?: number;
  customFields?: Record<string, any>;
}

class SessionLookupService {
  /**
   * Look up a session by its XXXX-YYY code format
   */
  async lookupByCode(code: string): Promise<SessionLookupResult | null> {
    try {
      // Validate code format
      const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{3}$/;
      if (!codePattern.test(code.toUpperCase())) {
        throw new Error('Invalid code format. Expected format: XXXX-YYY');
      }

      // Look up session ID from code
      const sessionId = await sessionCodeService.lookupSessionByCode(code.toUpperCase());
      if (!sessionId) {
        return null;
      }

      // Get session details
      const sessionDoc = await getDoc(doc(firestore, 'sessions', sessionId));
      if (!sessionDoc.exists()) {
        return null;
      }

      const sessionData = sessionDoc.data() as GameSession;
      
      // Check if session is active
      if (sessionData.status !== 'waiting' && sessionData.status !== 'active') {
        return {
          sessionId,
          eventId: sessionData.eventId,
          sessionName: sessionData.name,
          requiresPlayerData: false,
          playerDataFields: [],
          availableTeams: [],
          status: 'expired'
        };
      }

      // Get event configuration for reporting settings
      const eventDoc = await getDoc(doc(firestore, 'events', sessionData.eventId));
      let reportingConfig: ReportingConfiguration | undefined;
      let requiresPlayerData = false;
      let playerDataFields: PlayerDataField[] = [];

      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        reportingConfig = eventData.reportingConfig;
        
        // Check if individual player data collection is enabled
        if (reportingConfig?.dataCollection?.collectBasicInfo) {
          requiresPlayerData = true;
          playerDataFields = this.getPlayerDataFields(reportingConfig);
        }
      }

      // Get available teams
      const availableTeams = await this.getAvailableTeams(sessionId, sessionData);

      // Check if session is full
      const hasAvailableTeams = availableTeams.some(team => team.isAvailable);
      
      return {
        sessionId,
        eventId: sessionData.eventId,
        sessionName: sessionData.name,
        reportingConfig,
        requiresPlayerData,
        playerDataFields,
        availableTeams,
        status: hasAvailableTeams ? 'active' : 'full'
      };
    } catch (error) {
      console.error('Error looking up session:', error);
      throw error;
    }
  }

  /**
   * Get required player data fields based on reporting configuration
   */
  private getPlayerDataFields(config: ReportingConfiguration): PlayerDataField[] {
    const fields: PlayerDataField[] = [
      {
        id: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name',
        validation: {
          minLength: 2,
          maxLength: 100
        }
      }
    ];

    if (config.dataCollection.collectJobInfo) {
      fields.push({
        id: 'department',
        label: 'Department',
        type: 'text',
        required: true,
        placeholder: 'e.g., Engineering, Sales, HR',
        validation: {
          minLength: 2,
          maxLength: 100
        }
      });

      fields.push({
        id: 'yearsExperience',
        label: 'Years of Experience',
        type: 'number',
        required: false,
        placeholder: '0',
        validation: {
          min: 0,
          max: 50
        }
      });
    }

    if (config.dataCollection.collectContactInfo) {
      fields.push({
        id: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'your.email@company.com',
        validation: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        }
      });
    }

    // Add custom fields if configured
    if (config.dataCollection.customDataFields) {
      config.dataCollection.customDataFields.forEach(field => {
        fields.push({
          id: field.id,
          label: field.name,
          type: field.type as any,
          required: field.required,
          options: field.options,
          validation: field.validation
        });
      });
    }

    return fields;
  }

  /**
   * Get available teams for a session
   */
  private async getAvailableTeams(
    sessionId: string, 
    _sessionData: GameSession
  ): Promise<AvailableTeam[]> {
    const teams: AvailableTeam[] = [];
    
    // Get teams from root collection using teamDataService
    const sessionTeams = await teamDataService.getSessionTeams(sessionId);
    
    for (const team of sessionTeams) {
      const currentPlayers = team.players?.length || 0;
      const maxPlayers = team.maxPlayers || 4;
      
      teams.push({
        id: team.id,
        name: team.name,
        type: team.type || 'standard',
        colonyType: team.colonyType,
        currentPlayers,
        maxPlayers,
        isAvailable: currentPlayers < maxPlayers && !team.isEliminated
      });
    }

    return teams.sort((a, b) => {
      // Sort by availability first, then by player count
      if (a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }
      return a.currentPlayers - b.currentPlayers;
    });
  }

  /**
   * Validate player data against field requirements
   */
  validatePlayerData(data: PlayerData, fields: PlayerDataField[]): string[] {
    const errors: string[] = [];

    fields.forEach(field => {
      const value = data[field.id as keyof PlayerData];
      
      // Check required fields
      if (field.required && !value) {
        errors.push(`${field.label} is required`);
        return;
      }

      // Skip validation if field is optional and empty
      if (!field.required && !value) {
        return;
      }

      // Type-specific validation
      switch (field.type) {
        case 'text':
          if (typeof value !== 'string') {
            errors.push(`${field.label} must be text`);
          } else if (field.validation) {
            if (field.validation.minLength && value.length < field.validation.minLength) {
              errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
            }
            if (field.validation.maxLength && value.length > field.validation.maxLength) {
              errors.push(`${field.label} must be no more than ${field.validation.maxLength} characters`);
            }
          }
          break;

        case 'email':
          if (typeof value !== 'string') {
            errors.push(`${field.label} must be an email address`);
          } else if (field.validation?.pattern) {
            const pattern = new RegExp(field.validation.pattern);
            if (!pattern.test(value)) {
              errors.push(`${field.label} must be a valid email address`);
            }
          }
          break;

        case 'number':
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          const safeNumValue = typeof numValue === 'number' ? numValue : 0;
          if (isNaN(safeNumValue)) {
            errors.push(`${field.label} must be a number`);
          } else if (field.validation) {
            if (field.validation.min !== undefined && safeNumValue < field.validation.min) {
              errors.push(`${field.label} must be at least ${field.validation.min}`);
            }
            if (field.validation.max !== undefined && safeNumValue > field.validation.max) {
              errors.push(`${field.label} must be no more than ${field.validation.max}`);
            }
          }
          break;

        case 'select':
          if (field.options && !field.options.includes(value as string)) {
            errors.push(`${field.label} must be one of the available options`);
          }
          break;
      }
    });

    return errors;
  }
}

export const sessionLookupService = new SessionLookupService();