import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore as db } from '../firebase/config';

export interface FacilitatorDashboardSettings {
  realTimeUpdates: boolean;
  performanceMetrics: boolean;
  alertSystem: boolean;
  // Additional settings
  autoRefreshInterval?: number; // in seconds
  soundNotifications?: boolean;
  colorCodedAlerts?: boolean;
  compactView?: boolean;
}

export interface FacilitatorPrivacySettings {
  collectPlayerData: boolean;
  anonymizeExports: boolean;
  gdprCompliant: boolean;
  retentionDays: number;
  allowedDataTypes: {
    personalInfo: boolean;
    gamePerformance: boolean;
    tradingPatterns: boolean;
    communicationLogs: boolean;
  };
}

export interface FacilitatorExportSettings {
  enabledFormats: {
    pdf: boolean;
    csv: boolean;
    excel: boolean;
    json: boolean;
  };
  defaultFormat: 'pdf' | 'csv' | 'excel' | 'json';
  includeVisualizations: boolean;
  compressionEnabled: boolean;
  emailExports: boolean;
  scheduleEnabled: boolean;
  scheduleFrequency?: 'end_of_round' | 'end_of_session' | 'daily' | 'manual';
}

export interface FacilitatorSettings {
  sessionId: string;
  dashboard: FacilitatorDashboardSettings;
  privacy: FacilitatorPrivacySettings;
  export: FacilitatorExportSettings;
  lastUpdated: number;
}

class FacilitatorSettingsService {
  private static instance: FacilitatorSettingsService;
  private settingsCache: Map<string, FacilitatorSettings> = new Map();

  private constructor() {}

  static getInstance(): FacilitatorSettingsService {
    if (!this.instance) {
      this.instance = new FacilitatorSettingsService();
    }
    return this.instance;
  }

  /**
   * Get default facilitator settings
   */
  getDefaultSettings(sessionId: string): FacilitatorSettings {
    return {
      sessionId,
      dashboard: {
        realTimeUpdates: true,
        performanceMetrics: true,
        alertSystem: true,
        autoRefreshInterval: 5,
        soundNotifications: false,
        colorCodedAlerts: true,
        compactView: false
      },
      privacy: {
        collectPlayerData: true,
        anonymizeExports: false,
        gdprCompliant: true,
        retentionDays: 30,
        allowedDataTypes: {
          personalInfo: false,
          gamePerformance: true,
          tradingPatterns: true,
          communicationLogs: false
        }
      },
      export: {
        enabledFormats: {
          pdf: true,
          csv: true,
          excel: true,
          json: false
        },
        defaultFormat: 'pdf',
        includeVisualizations: true,
        compressionEnabled: false,
        emailExports: false,
        scheduleEnabled: false,
        scheduleFrequency: 'manual'
      },
      lastUpdated: Date.now()
    };
  }

  /**
   * Load facilitator settings for a session
   */
  async loadSettings(sessionId: string): Promise<FacilitatorSettings> {
    try {
      // Check cache first
      if (this.settingsCache.has(sessionId)) {
        return this.settingsCache.get(sessionId)!;
      }

      // Load from Firestore
      const settingsDoc = await getDoc(doc(db, 'facilitatorSettings', sessionId));
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as FacilitatorSettings;
        this.settingsCache.set(sessionId, settings);
        return settings;
      }

      // Return defaults if not found
      const defaultSettings = this.getDefaultSettings(sessionId);
      this.settingsCache.set(sessionId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Error loading facilitator settings:', error);
      return this.getDefaultSettings(sessionId);
    }
  }

  /**
   * Save facilitator settings
   */
  async saveSettings(settings: FacilitatorSettings): Promise<void> {
    try {
      const updatedSettings = {
        ...settings,
        lastUpdated: Date.now()
      };

      await setDoc(
        doc(db, 'facilitatorSettings', settings.sessionId),
        updatedSettings
      );

      // Update cache
      this.settingsCache.set(settings.sessionId, updatedSettings);
    } catch (error) {
      console.error('Error saving facilitator settings:', error);
      throw error;
    }
  }

  /**
   * Update dashboard settings
   */
  async updateDashboardSettings(
    sessionId: string,
    updates: Partial<FacilitatorDashboardSettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.loadSettings(sessionId);
      const updatedSettings = {
        ...currentSettings,
        dashboard: {
          ...currentSettings.dashboard,
          ...updates
        },
        lastUpdated: Date.now()
      };

      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating dashboard settings:', error);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    sessionId: string,
    updates: Partial<FacilitatorPrivacySettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.loadSettings(sessionId);
      const updatedSettings = {
        ...currentSettings,
        privacy: {
          ...currentSettings.privacy,
          ...updates,
          // Deep merge for allowedDataTypes
          allowedDataTypes: updates.allowedDataTypes
            ? { ...currentSettings.privacy.allowedDataTypes, ...updates.allowedDataTypes }
            : currentSettings.privacy.allowedDataTypes
        },
        lastUpdated: Date.now()
      };

      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  /**
   * Update export settings
   */
  async updateExportSettings(
    sessionId: string,
    updates: Partial<FacilitatorExportSettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.loadSettings(sessionId);
      const updatedSettings = {
        ...currentSettings,
        export: {
          ...currentSettings.export,
          ...updates,
          // Deep merge for enabledFormats
          enabledFormats: updates.enabledFormats
            ? { ...currentSettings.export.enabledFormats, ...updates.enabledFormats }
            : currentSettings.export.enabledFormats
        },
        lastUpdated: Date.now()
      };

      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating export settings:', error);
      throw error;
    }
  }

  /**
   * Apply privacy filters to data based on settings
   */
  applyPrivacyFilters<T extends Record<string, any>>(
    data: T[],
    settings: FacilitatorPrivacySettings
  ): T[] {
    if (!settings.collectPlayerData) {
      return [];
    }

    return data.map(item => {
      const filtered = { ...item };

      // Remove personal info if not allowed
      if (!settings.allowedDataTypes.personalInfo) {
        delete filtered.playerName;
        delete filtered.email;
        delete filtered.userId;
      }

      // Anonymize if required
      if (settings.anonymizeExports) {
        if ('playerName' in filtered && filtered.playerName) {
          (filtered as any).playerName = `Player ${(filtered as any).playerId?.substring(0, 8) || 'Unknown'}`;
        }
        if ('teamName' in filtered && filtered.teamName) {
          (filtered as any).teamName = `Team ${(filtered as any).teamId?.substring(0, 8) || 'Unknown'}`;
        }
      }

      // Remove communication logs if not allowed
      if (!settings.allowedDataTypes.communicationLogs) {
        delete filtered.messages;
        delete filtered.chatHistory;
      }

      return filtered;
    });
  }

  /**
   * Check if a specific export format is enabled
   */
  isExportFormatEnabled(
    sessionId: string,
    format: 'pdf' | 'csv' | 'excel' | 'json'
  ): boolean {
    const settings = this.settingsCache.get(sessionId);
    return settings?.export.enabledFormats[format] ?? true;
  }

  /**
   * Clear settings cache
   */
  clearCache(sessionId?: string): void {
    if (sessionId) {
      this.settingsCache.delete(sessionId);
    } else {
      this.settingsCache.clear();
    }
  }
}

export const facilitatorSettingsService = FacilitatorSettingsService.getInstance();