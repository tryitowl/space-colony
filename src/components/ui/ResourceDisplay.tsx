import React from 'react';
import type { ResourceDisplayProps } from '../../types/ui';
import { cn } from '../../utils/cn';
import { GlassPanel } from './GlassPanel';

export const ResourceDisplay: React.FC<ResourceDisplayProps> = ({
  resource,
  showTrend = true,
  showProduction = false,
  critical = false,
  compact = false,
  onClick,
  className,
}) => {
  const { type, amount, capacity, production, consumption, trend } = resource;
  
  // Determine status based on resource levels
  const getStatus = (): 'critical' | 'low' | 'moderate' | 'good' => {
    if (critical || amount === 0) return 'critical';
    if (capacity && amount / capacity < 0.25) return 'low';
    if (capacity && amount / capacity < 0.5) return 'moderate';
    return 'good';
  };
  
  const status = getStatus();
  const getStatusColor = () => {
    switch (status) {
      case 'critical':
        return 'text-space-danger border-space-danger/50 bg-red-900/20';
      case 'low':
        return 'text-space-warning border-space-warning/50 bg-yellow-900/20';
      case 'moderate':
        return 'text-space-cyan border-space-cyan/50 bg-blue-900/20';
      case 'good':
        return 'text-space-success border-space-success/50 bg-green-900/20';
      default:
        return 'text-space-text-primary border-white/20 bg-space-panel-bg';
    }
  };

  const getTrendIcon = () => {
    if (!showTrend || !trend || trend === 'stable') return null;
    
    return (
      <div className={cn(
        'ml-2 text-xs',
        trend === 'up' ? 'text-space-success' : 'text-space-danger'
      )}>
        {trend === 'up' ? '↗' : '↘'}
      </div>
    );
  };

  const criticalPulse = status === 'critical' ? 'animate-pulse-glow' : '';
  
  // Get resource name from type
  const getResourceName = (resourceType: string): string => {
    const names: Record<string, string> = {
      oxygen: 'Oxygen',
      food: 'Food',
      water: 'Water',
      energy: 'Energy',
      minerals: 'Minerals',
      alloys: 'Alloys',
      techComponents: 'Tech Components',
      marketIntel: 'Market Intel',
      surveyReports: 'Survey Reports',
      crisisWarnings: 'Crisis Warnings',
      defenseContracts: 'Defense',
      systemRepairs: 'Repairs',
      transportRoutes: 'Transport',
      techPatents: 'Patents',
      blueprints: 'Blueprints',
      alienTech: 'Alien Tech',
      credits: 'Credits'
    };
    return names[resourceType] || resourceType;
  };

  const panelContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center flex-1">
        <div className="flex-1">
          <div className="text-xs font-medium opacity-80 uppercase tracking-wide">
            {getResourceName(type)}
          </div>
          <div className="flex items-center">
            <span className={cn(
              "font-bold font-mono",
              compact ? "text-lg" : "text-xl"
            )}>
              {amount.toLocaleString()}
            </span>
            {capacity && !compact && (
              <span className="text-sm opacity-60 ml-1">
                / {capacity.toLocaleString()}
              </span>
            )}
            {getTrendIcon()}
          </div>
          {showProduction && (production || consumption) && !compact && (
            <div className="text-xs opacity-70 mt-1">
              {production && <span className="text-green-400">+{production}/round</span>}
              {production && consumption && <span> </span>}
              {consumption && <span className="text-red-400">-{consumption}/round</span>}
            </div>
          )}
        </div>
      </div>
      
      {capacity && !compact && (
        <div className="w-16 h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              status === 'critical' ? 'bg-space-danger' :
              status === 'low' ? 'bg-space-warning' :
              status === 'moderate' ? 'bg-space-cyan' : 'bg-space-success'
            )}
            style={{
              width: `${Math.min((amount / capacity) * 100, 100)}%`
            }}
          />
        </div>
      )}
    </div>
  );

  const panelClasses = cn(
    compact ? 'p-2' : 'p-3',
    getStatusColor(),
    criticalPulse,
    onClick && 'cursor-pointer hover:brightness-110 transition-all',
    className
  );

  return (
    <GlassPanel className={panelClasses} onClick={onClick}>
      {panelContent}
      {status === 'critical' && !compact && (
        <div className="mt-2 text-xs text-space-danger font-medium">
          ⚠ CRITICAL LEVEL
        </div>
      )}
    </GlassPanel>
  );
};