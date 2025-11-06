import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Eye, MessageSquare, Settings, FileText, TrendingUp } from 'lucide-react';
import type { GalaxyConfiguration } from '../../../types';
import { facilitatorSettingsService, type FacilitatorDashboardSettings } from '../../../services/facilitatorSettingsService';
import { Switch } from '../../ui/Switch';

interface FacilitatorConfigProps {
  configuration: Partial<GalaxyConfiguration>;
  onUpdate: (config: Partial<GalaxyConfiguration>) => void;
}

const permissionOptions = [
  {
    id: 'view_all',
    name: 'View All Data',
    icon: Eye,
    description: 'See all teams, trades, and resources',
  },
  {
    id: 'manage_trades',
    name: 'Manage Trades',
    icon: TrendingUp,
    description: 'Approve, reject, or modify trades',
  },
  {
    id: 'send_messages',
    name: 'Send Messages',
    icon: MessageSquare,
    description: 'Broadcast messages to teams',
  },
  {
    id: 'modify_resources',
    name: 'Modify Resources',
    icon: Settings,
    description: 'Adjust team resources and values',
  },
  {
    id: 'export_data',
    name: 'Export Data',
    icon: FileText,
    description: 'Download game data and reports',
  },
  {
    id: 'control_timing',
    name: 'Control Timing',
    icon: Shield,
    description: 'Start, pause, and advance rounds',
  },
];

const FacilitatorConfig: React.FC<FacilitatorConfigProps> = ({ configuration, onUpdate }) => {
  const [dashboardSettings, setDashboardSettings] = useState<FacilitatorDashboardSettings>({
    realTimeUpdates: true,
    performanceMetrics: true,
    alertSystem: true,
    autoRefreshInterval: 5,
    soundNotifications: false,
    colorCodedAlerts: true,
    compactView: false
  });
  const [sessionId] = useState(() => `temp_session_${Date.now()}`);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await facilitatorSettingsService.loadSettings(sessionId);
      setDashboardSettings(settings.dashboard);
    };
    loadSettings();
  }, [sessionId]);
  const facilitators = configuration.facilitators || {
    count: 1,
    permissions: ['view_all', 'manage_trades', 'send_messages'],
  };

  const updateFacilitatorCount = (count: number) => {
    onUpdate({
      ...configuration,
      facilitators: {
        ...facilitators,
        count,
      },
    });
  };

  const togglePermission = (permissionId: string) => {
    const currentPermissions = facilitators.permissions || [];
    const updated = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((p) => p !== permissionId)
      : [...currentPermissions, permissionId];

    onUpdate({
      ...configuration,
      facilitators: {
        ...facilitators,
        permissions: updated,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Facilitator Configuration</h3>
        <p className="text-gray-400">
          Configure the number of facilitators and their permissions for managing the game session.
        </p>
      </div>

      {/* Number of Facilitators */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Number of Facilitators</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">
            Select how many facilitators will manage this game session.
          </p>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="10"
              value={facilitators.count}
              onChange={(e) => updateFacilitatorCount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                  ((facilitators.count - 1) / 9) * 100
                }%, #374151 ${((facilitators.count - 1) / 9) * 100}%, #374151 100%)`,
              }}
            />
            <div className="w-20 text-center">
              <span className="text-2xl font-bold text-cyan-400">{facilitators.count}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <motion.button
                key={num}
                className={`py-2 rounded-lg font-medium transition-all ${
                  facilitators.count === num
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => updateFacilitatorCount(num)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {num}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Facilitator Permissions */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-medium text-gray-300">Facilitator Permissions</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-6">
            Select which actions facilitators can perform during the game session.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissionOptions.map((permission) => (
              <motion.button
                key={permission.id}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  facilitators.permissions?.includes(permission.id)
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => togglePermission(permission.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start space-x-3">
                  <permission.icon
                    className={`w-6 h-6 mt-1 ${
                      facilitators.permissions?.includes(permission.id)
                        ? 'text-cyan-400'
                        : 'text-gray-400'
                    }`}
                  />
                  <div className="flex-1">
                    <h5
                      className={`font-medium ${
                        facilitators.permissions?.includes(permission.id)
                          ? 'text-cyan-400'
                          : 'text-white'
                      }`}
                    >
                      {permission.name}
                    </h5>
                    <p className="text-sm text-gray-400 mt-1">{permission.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Configuration */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-300">Dashboard Configuration</h4>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-white">Real-time Updates</h5>
              <p className="text-sm text-gray-400 mt-1">
                Show live updates of trades and team status
              </p>
            </div>
            <Switch
              checked={dashboardSettings.realTimeUpdates}
              onChange={async (checked) => {
                const updated = { ...dashboardSettings, realTimeUpdates: checked };
                setDashboardSettings(updated);
                await facilitatorSettingsService.updateDashboardSettings(sessionId, { realTimeUpdates: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-white">Performance Metrics</h5>
              <p className="text-sm text-gray-400 mt-1">
                Display team performance indicators and rankings
              </p>
            </div>
            <Switch
              checked={dashboardSettings.performanceMetrics}
              onChange={async (checked) => {
                const updated = { ...dashboardSettings, performanceMetrics: checked };
                setDashboardSettings(updated);
                await facilitatorSettingsService.updateDashboardSettings(sessionId, { performanceMetrics: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-white">Alert System</h5>
              <p className="text-sm text-gray-400 mt-1">
                Notify facilitators of critical game events
              </p>
            </div>
            <Switch
              checked={dashboardSettings.alertSystem}
              onChange={async (checked) => {
                const updated = { ...dashboardSettings, alertSystem: checked };
                setDashboardSettings(updated);
                await facilitatorSettingsService.updateDashboardSettings(sessionId, { alertSystem: checked });
              }}
            />
          </div>

          {/* Additional Settings */}
          <div className="pt-4 mt-4 border-t border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-medium text-white">Sound Notifications</h5>
                <p className="text-sm text-gray-400 mt-1">
                  Play sounds for important alerts
                </p>
              </div>
              <Switch
                checked={dashboardSettings.soundNotifications || false}
                onChange={async (checked) => {
                  const updated = { ...dashboardSettings, soundNotifications: checked };
                  setDashboardSettings(updated);
                  await facilitatorSettingsService.updateDashboardSettings(sessionId, { soundNotifications: checked });
                }}
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-medium text-white">Color-Coded Alerts</h5>
                <p className="text-sm text-gray-400 mt-1">
                  Use colors to indicate alert severity
                </p>
              </div>
              <Switch
                checked={dashboardSettings.colorCodedAlerts || true}
                onChange={async (checked) => {
                  const updated = { ...dashboardSettings, colorCodedAlerts: checked };
                  setDashboardSettings(updated);
                  await facilitatorSettingsService.updateDashboardSettings(sessionId, { colorCodedAlerts: checked });
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-white">Auto-Refresh Interval</h5>
                <p className="text-sm text-gray-400 mt-1">
                  Update dashboard every {dashboardSettings.autoRefreshInterval || 5} seconds
                </p>
              </div>
              <select
                value={dashboardSettings.autoRefreshInterval || 5}
                onChange={async (e) => {
                  const interval = parseInt(e.target.value);
                  const updated = { ...dashboardSettings, autoRefreshInterval: interval };
                  setDashboardSettings(updated);
                  await facilitatorSettingsService.updateDashboardSettings(sessionId, { autoRefreshInterval: interval });
                }}
                className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={3}>3 sec</option>
                <option value={5}>5 sec</option>
                <option value={10}>10 sec</option>
                <option value={30}>30 sec</option>
                <option value={60}>60 sec</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Facilitator Access Preview */}
      <div className="bg-cyan-900/20 border border-cyan-500/50 rounded-lg p-6">
        <h4 className="text-lg font-medium text-cyan-400 mb-4">Facilitator Access Codes</h4>
        <p className="text-sm text-gray-300 mb-4">
          Each facilitator will receive a unique access code to join the session:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: facilitators.count }, (_, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Facilitator {i + 1}:</span>
              <code className="ml-2 text-cyan-400 font-mono">FACI-{String(i + 1).padStart(3, '0')}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacilitatorConfig;