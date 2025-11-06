import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { GlassPanel } from './GlassPanel';
import { Badge } from './Badge';
import { Button } from './Button';
import type { ResourceAlert } from '../../services/resourceManagementService';

interface ResourceAlertsPanelProps {
  maxAlerts?: number;
  showDismissed?: boolean;
  compact?: boolean;
  className?: string;
}

const getAlertIcon = (type: ResourceAlert['type']) => {
  switch (type) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
  }
};

const getAlertColor = (type: ResourceAlert['type']) => {
  switch (type) {
    case 'critical':
      return 'border-red-500 bg-red-500/20';
    case 'warning':
      return 'border-yellow-500 bg-yellow-500/20';
    case 'info':
      return 'border-blue-500 bg-blue-500/20';
  }
};

const getAlertBadgeVariant = (type: ResourceAlert['type']) => {
  switch (type) {
    case 'critical':
      return 'danger' as const;
    case 'warning':
      return 'warning' as const;
    case 'info':
      return 'info' as const;
  }
};

const getResourceIcon = (resource: string) => {
  const icons: Record<string, string> = {
    oxygen: '🫁',
    food: '🍎',
    water: '💧',
    energy: '⚡',
    minerals: '⛏️',
    alloys: '🔩',
    techComponents: '🔬',
    credits: '💰'
  };
  return icons[resource] || '📦';
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const ResourceAlertsPanel: React.FC<ResourceAlertsPanelProps> = ({
  maxAlerts = 5,
  showDismissed = false,
  compact = false,
  className = ''
}) => {
  const { state } = useGame();
  const { resourceAlerts } = state;
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = resourceAlerts
    .filter(alert => showDismissed || !dismissedAlerts.has(`${alert.teamId}-${alert.resource}-${alert.timestamp}`))
    .slice(0, maxAlerts)
    .sort((a, b) => {
      // Sort by priority (critical > warning > info) then by timestamp
      const priorityOrder = { critical: 3, warning: 2, info: 1 };
      const priorityDiff = priorityOrder[b.type] - priorityOrder[a.type];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });

  const dismissAlert = (alert: ResourceAlert) => {
    const alertKey = `${alert.teamId}-${alert.resource}-${alert.timestamp}`;
    setDismissedAlerts(prev => new Set([...prev, alertKey]));
  };

  const criticalCount = resourceAlerts.filter(alert => alert.type === 'critical').length;
  const warningCount = resourceAlerts.filter(alert => alert.type === 'warning').length;

  if (resourceAlerts.length === 0) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-lg">✅</div>
          <div className="text-sm">No resource alerts</div>
          <div className="text-xs mt-1">All resources are stable</div>
        </div>
      </GlassPanel>
    );
  }

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Resource Alerts</h3>
          <div className="flex space-x-1">
            {criticalCount > 0 && (
              <Badge variant="danger" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {visibleAlerts.slice(0, 3).map((alert, _index) => (
            <div 
              key={`${alert.teamId}-${alert.resource}-${alert.timestamp}`}
              className={`p-2 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getAlertIcon(alert.type)}</span>
                  <span className="text-sm">{getResourceIcon(alert.resource)}</span>
                  <div className="text-xs text-white">
                    {alert.resource}: {alert.currentAmount}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {alert.roundsUntilCritical > 0 ? `${alert.roundsUntilCritical}r` : 'Now'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Resource Alerts</h2>
          <div className="flex space-x-2">
            {criticalCount > 0 && (
              <Badge variant="danger" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {warningCount} Warning
              </Badge>
            )}
            <Badge variant="info" className="text-xs">
              {resourceAlerts.length} Total
            </Badge>
          </div>
        </div>

        {/* Alert List */}
        <div className="space-y-3">
          {visibleAlerts.map((alert, _index) => (
            <div 
              key={`${alert.teamId}-${alert.resource}-${alert.timestamp}`}
              className={`p-4 rounded-lg border ${getAlertColor(alert.type)} transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Alert Icon */}
                  <div className="text-2xl">
                    {getAlertIcon(alert.type)}
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getResourceIcon(alert.resource)}</span>
                      <Badge variant={getAlertBadgeVariant(alert.type)} className="text-xs">
                        {alert.type.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-base font-semibold text-white mb-1">
                      {alert.message}
                    </div>

                    <div className="text-sm text-gray-300 space-y-1">
                      <div>
                        Current: {alert.currentAmount} / Threshold: {alert.threshold}
                      </div>
                      {alert.roundsUntilCritical > 0 ? (
                        <div>
                          Estimated {alert.roundsUntilCritical} rounds until critical
                        </div>
                      ) : (
                        <div className="text-red-400 font-medium">
                          Resource is critically low!
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-400 mt-2">
                      {formatTimeAgo(alert.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Dismiss Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => dismissAlert(alert)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              {/* Action Suggestions */}
              {alert.type === 'critical' && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <div className="text-xs text-gray-300 mb-2">
                    💡 Suggested Actions:
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>• Trade for {alert.resource} immediately</div>
                    <div>• Check investment in emergency reserves</div>
                    <div>• Consider rationing other resources</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show More/Less */}
        {resourceAlerts.length > maxAlerts && (
          <div className="text-center">
            <Button variant="secondary" size="sm" className="text-gray-400 hover:text-white">
              Show {resourceAlerts.length - maxAlerts} more alerts
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-600">
          Alerts update in real-time • Critical alerts require immediate attention
        </div>
      </div>
    </GlassPanel>
  );
};

// Helper hook for resource alerts
export const useResourceAlerts = () => {
  const { state } = useGame();
  
  const criticalAlerts = state.resourceAlerts.filter(alert => alert.type === 'critical');
  const warningAlerts = state.resourceAlerts.filter(alert => alert.type === 'warning');
  const infoAlerts = state.resourceAlerts.filter(alert => alert.type === 'info');

  const hasImmediateThreats = criticalAlerts.some(alert => alert.roundsUntilCritical === 0);
  const mostUrgentAlert = criticalAlerts.length > 0 ? criticalAlerts[0] : warningAlerts[0] || null;

  return {
    alerts: state.resourceAlerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    hasImmediateThreats,
    mostUrgentAlert,
    totalAlerts: state.resourceAlerts.length,
    hasCritical: criticalAlerts.length > 0,
    hasWarnings: warningAlerts.length > 0
  };
};