import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart, Download, Database, Lock } from 'lucide-react';
import type { GalaxyConfiguration } from '../../../types';
import { 
  facilitatorSettingsService, 
  type FacilitatorPrivacySettings,
  type FacilitatorExportSettings 
} from '../../../services/facilitatorSettingsService';
import { Switch } from '../../ui/Switch';

interface ReportingConfigProps {
  configuration: Partial<GalaxyConfiguration>;
  onUpdate: (config: Partial<GalaxyConfiguration>) => void;
}

const reportTypeOptions = [
  {
    id: 'individual',
    name: 'Individual Reports',
    description: 'Performance metrics for each player',
  },
  {
    id: 'team',
    name: 'Team Reports',
    description: 'Collective team performance and collaboration',
  },
  {
    id: 'event',
    name: 'Event Summary',
    description: 'Overall event statistics and outcomes',
  },
  {
    id: 'facilitator',
    name: 'Facilitator Report',
    description: 'Session management and intervention logs',
  },
];

const dataCollectionOptions = [
  {
    id: 'trading_patterns',
    name: 'Trading Patterns',
    description: 'Track negotiation strategies and trade frequencies',
  },
  {
    id: 'communication_analysis',
    name: 'Communication Analysis',
    description: 'Analyze team communication and collaboration',
  },
  {
    id: 'decision_timing',
    name: 'Decision Timing',
    description: 'Time spent on decisions and response patterns',
  },
  {
    id: 'resource_management',
    name: 'Resource Management',
    description: 'How teams prioritize and manage resources',
  },
];

const ReportingConfig: React.FC<ReportingConfigProps> = ({ configuration, onUpdate }) => {
  const [privacySettings, setPrivacySettings] = useState<FacilitatorPrivacySettings>({
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
  });
  
  const [exportSettings, setExportSettings] = useState<FacilitatorExportSettings>({
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
  });
  
  const [sessionId] = useState(() => `temp_session_${Date.now()}`);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await facilitatorSettingsService.loadSettings(sessionId);
      setPrivacySettings(settings.privacy);
      setExportSettings(settings.export);
    };
    loadSettings();
  }, [sessionId]);
  const reporting = configuration.reporting || {
    collectPlayerData: true,
    reportTypes: ['individual', 'team'],
    exportSchedule: 'end_of_session',
    dataCollection: ['trading_patterns'],
  };

  const toggleReportType = (reportType: string) => {
    const current = reporting.reportTypes || [];
    const updated = current.includes(reportType)
      ? current.filter((t) => t !== reportType)
      : [...current, reportType];

    onUpdate({
      ...configuration,
      reporting: {
        ...reporting,
        reportTypes: updated,
      },
    });
  };

  const toggleDataCollection = (dataType: string) => {
    const current = reporting.dataCollection || [];
    const updated = current.includes(dataType)
      ? current.filter((t) => t !== dataType)
      : [...current, dataType];

    onUpdate({
      ...configuration,
      reporting: {
        ...reporting,
        dataCollection: updated,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Reporting Configuration</h3>
        <p className="text-gray-400">
          Configure data collection, reporting options, and export settings for the game session.
        </p>
      </div>

      {/* Data Collection Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Data Collection</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h5 className="font-medium text-white">Enable Player Data Collection</h5>
              <p className="text-sm text-gray-400 mt-1">
                Collect gameplay data for analysis and reporting
              </p>
            </div>
            <Switch
              checked={privacySettings.collectPlayerData}
              onChange={async (checked) => {
                const updated = { ...privacySettings, collectPlayerData: checked };
                setPrivacySettings(updated);
                await facilitatorSettingsService.updatePrivacySettings(sessionId, { collectPlayerData: checked });
                onUpdate({
                  ...configuration,
                  reporting: {
                    ...reporting,
                    collectPlayerData: checked,
                  },
                });
              }}
            />
          </div>

          {reporting.collectPlayerData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <h5 className="font-medium text-white mb-3">Data Points to Collect</h5>
              {dataCollectionOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      option.id === 'trading_patterns' ? privacySettings.allowedDataTypes.tradingPatterns :
                      option.id === 'communication_analysis' ? privacySettings.allowedDataTypes.communicationLogs :
                      option.id === 'resource_management' || option.id === 'decision_timing' ? 
                        privacySettings.allowedDataTypes.gamePerformance : false
                    }
                    onChange={async () => {
                      const dataTypeKey = 
                        option.id === 'trading_patterns' ? 'tradingPatterns' :
                        option.id === 'communication_analysis' ? 'communicationLogs' :
                        'gamePerformance';
                      
                      const updated = {
                        ...privacySettings,
                        allowedDataTypes: {
                          ...privacySettings.allowedDataTypes,
                          [dataTypeKey]: !privacySettings.allowedDataTypes[dataTypeKey as keyof typeof privacySettings.allowedDataTypes]
                        }
                      };
                      setPrivacySettings(updated);
                      await facilitatorSettingsService.updatePrivacySettings(sessionId, { 
                        allowedDataTypes: updated.allowedDataTypes 
                      });
                      toggleDataCollection(option.id);
                    }}
                    className="w-4 h-4 mt-0.5 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">{option.name}</span>
                    <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Report Types */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Report Types</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypeOptions.map((report) => (
            <motion.button
              key={report.id}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                reporting.reportTypes?.includes(report.id)
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => toggleReportType(report.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h5
                className={`font-medium mb-1 ${
                  reporting.reportTypes?.includes(report.id) ? 'text-cyan-400' : 'text-white'
                }`}
              >
                {report.name}
              </h5>
              <p className="text-sm text-gray-400">{report.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Export Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Download className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Export Settings</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Export Schedule
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: 'end_of_round', label: 'After Each Round' },
                { value: 'end_of_session', label: 'End of Session' },
                { value: 'manual', label: 'Manual Export Only' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    reporting.exportSchedule === option.value
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={async () => {
                    const scheduleFrequency = option.value as 'end_of_round' | 'end_of_session' | 'manual';
                    const updated = { 
                      ...exportSettings, 
                      scheduleEnabled: option.value !== 'manual',
                      scheduleFrequency 
                    };
                    setExportSettings(updated);
                    await facilitatorSettingsService.updateExportSettings(sessionId, {
                      scheduleEnabled: option.value !== 'manual',
                      scheduleFrequency
                    });
                    onUpdate({
                      ...configuration,
                      reporting: {
                        ...reporting,
                        exportSchedule: option.value as any,
                      },
                    });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Export Formats
            </label>
            <div className="flex flex-wrap gap-3">
              {(['pdf', 'csv', 'excel', 'json'] as const).map((format) => (
                <label key={format} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportSettings.enabledFormats[format]}
                    onChange={async (e) => {
                      const updated = {
                        ...exportSettings,
                        enabledFormats: {
                          ...exportSettings.enabledFormats,
                          [format]: e.target.checked
                        }
                      };
                      setExportSettings(updated);
                      await facilitatorSettingsService.updateExportSettings(sessionId, {
                        enabledFormats: updated.enabledFormats
                      });
                    }}
                    className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">{format.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Compliance */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Lock className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Privacy & Compliance</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacySettings.anonymizeExports}
              onChange={async (e) => {
                const updated = { ...privacySettings, anonymizeExports: e.target.checked };
                setPrivacySettings(updated);
                await facilitatorSettingsService.updatePrivacySettings(sessionId, { 
                  anonymizeExports: e.target.checked 
                });
              }}
              className="w-4 h-4 mt-0.5 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
            />
            <div>
              <span className="text-white font-medium">Anonymize Player Data</span>
              <p className="text-sm text-gray-400 mt-1">
                Remove personally identifiable information from reports
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacySettings.gdprCompliant}
              onChange={async (e) => {
                const updated = { ...privacySettings, gdprCompliant: e.target.checked };
                setPrivacySettings(updated);
                await facilitatorSettingsService.updatePrivacySettings(sessionId, { 
                  gdprCompliant: e.target.checked 
                });
              }}
              className="w-4 h-4 mt-0.5 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
            />
            <div>
              <span className="text-white font-medium">GDPR Compliant</span>
              <p className="text-sm text-gray-400 mt-1">
                Follow GDPR guidelines for data collection and retention
              </p>
            </div>
          </label>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-medium">Data Retention Period</span>
              <p className="text-sm text-gray-400 mt-1">
                Automatically delete raw data after {privacySettings.retentionDays} days
              </p>
            </div>
            <select
              value={privacySettings.retentionDays}
              onChange={async (e) => {
                const days = parseInt(e.target.value);
                const updated = { ...privacySettings, retentionDays: days };
                setPrivacySettings(updated);
                await facilitatorSettingsService.updatePrivacySettings(sessionId, { retentionDays: days });
              }}
              className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-0.5 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
            />
            <div>
              <span className="text-white font-medium">GDPR Compliance Mode</span>
              <p className="text-sm text-gray-400 mt-1">
                Enable enhanced privacy controls for EU participants
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-cyan-900/20 border border-cyan-500/50 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-cyan-400">Report Configuration Summary</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Data Collection:</span>
            <span className="ml-2 text-white font-medium">
              {reporting.collectPlayerData ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Report Types:</span>
            <span className="ml-2 text-white font-medium">
              {reporting.reportTypes?.length || 0} selected
            </span>
          </div>
          <div>
            <span className="text-gray-400">Export Schedule:</span>
            <span className="ml-2 text-white font-medium capitalize">
              {reporting.exportSchedule?.replace('_', ' ') || 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Privacy Mode:</span>
            <span className="ml-2 text-white font-medium">Anonymized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingConfig;