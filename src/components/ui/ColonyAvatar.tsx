import React from 'react';
import type { ColonyAvatarProps } from '../../types/ui';
import type { ColonyType } from '../../types/game';
import { cn } from '../../utils/cn';
import { Badge } from './Badge';

/**
 * ColonyAvatar - 3D-style colony representation component
 * 
 * Features:
 * - Colony type-specific styling and icons
 * - Health/status indicators
 * - Multiple sizes (sm, md, lg, xl)
 * - Status-based ring colors and animations
 * - Hover effects and click handling
 * - Colony name display
 * - Animated states for trading/activity
 */
const ColonyAvatar: React.FC<ColonyAvatarProps> = ({
  colonyType,
  size = 'md',
  name,
  health = 100,
  status = 'active',
  animated = true,
  onClick,
  className,
  testId,
}) => {
  // Colony type configurations
  const colonyConfig: Record<ColonyType, {
    icon: string;
    color: string;
    bgColor: string;
    gradientFrom: string;
    gradientTo: string;
    description: string;
  }> = {
    mining: {
      icon: '⛏️',
      color: 'text-colony-mining',
      bgColor: 'bg-colony-mining/20',
      gradientFrom: 'from-colony-mining/80',
      gradientTo: 'to-orange-600/60',
      description: 'Mining Colony',
    },
    agricultural: {
      icon: '🌱',
      color: 'text-colony-agricultural',
      bgColor: 'bg-colony-agricultural/20',
      gradientFrom: 'from-colony-agricultural/80',
      gradientTo: 'to-green-600/60',
      description: 'Agricultural Colony',
    },
    research: {
      icon: '🔬',
      color: 'text-colony-research',
      bgColor: 'bg-colony-research/20',
      gradientFrom: 'from-colony-research/80',
      gradientTo: 'to-purple-600/60',
      description: 'Research Colony',
    },
    trade_hub: {
      icon: '🚀',
      color: 'text-colony-trade',
      bgColor: 'bg-colony-trade/20',
      gradientFrom: 'from-colony-trade/80',
      gradientTo: 'to-cyan-600/60',
      description: 'Trade Hub',
    },
    military: {
      icon: '🛡️',
      color: 'text-colony-military',
      bgColor: 'bg-colony-military/20',
      gradientFrom: 'from-colony-military/80',
      gradientTo: 'to-red-600/60',
      description: 'Military Base',
    },
    manufacturing: {
      icon: '🏭',
      color: 'text-colony-manufacturing',
      bgColor: 'bg-colony-manufacturing/20',
      gradientFrom: 'from-colony-manufacturing/80',
      gradientTo: 'to-amber-600/60',
      description: 'Manufacturing Hub',
    },
  };

  const config = colonyConfig[colonyType];

  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'w-16 h-16',
      icon: 'text-2xl',
      ring: 'ring-2',
      name: 'text-xs',
    },
    md: {
      container: 'w-24 h-24',
      icon: 'text-3xl',
      ring: 'ring-4',
      name: 'text-sm',
    },
    lg: {
      container: 'w-32 h-32',
      icon: 'text-4xl',
      ring: 'ring-4',
      name: 'text-base',
    },
    xl: {
      container: 'w-40 h-40',
      icon: 'text-5xl',
      ring: 'ring-6',
      name: 'text-lg',
    },
  };

  const sizeConfig = sizeClasses[size];

  // Status configurations
  const statusConfig = {
    active: {
      ringColor: 'ring-status-success',
      animation: 'animate-pulse-glow',
      badge: null,
    },
    inactive: {
      ringColor: 'ring-text-secondary',
      animation: '',
      badge: { variant: 'secondary' as const, text: 'Offline' },
    },
    critical: {
      ringColor: 'ring-status-danger',
      animation: 'animate-pulse',
      badge: { variant: 'danger' as const, text: 'Critical' },
    },
    trading: {
      ringColor: 'ring-accent-primary',
      animation: 'animate-spin-slow',
      badge: { variant: 'primary' as const, text: 'Trading' },
    },
  };

  const statusStyling = statusConfig[status];

  // Health-based opacity
  const healthOpacity = health < 20 ? 'opacity-50' : health < 50 ? 'opacity-75' : 'opacity-100';

  // Click handler
  const handleClick = () => {
    if (onClick && status !== 'inactive') {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2',
        onClick && status !== 'inactive' && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
      data-testid={testId}
    >
      {/* Status badge */}
      {statusStyling.badge && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge
            variant={statusStyling.badge.variant}
            size="sm"
            pulse={status === 'critical'}
          >
            {statusStyling.badge.text}
          </Badge>
        </div>
      )}

      {/* Main colony avatar */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full',
          'bg-gradient-to-br backdrop-blur-glass-light border-2',
          sizeConfig.container,
          sizeConfig.ring,
          config.gradientFrom,
          config.gradientTo,
          statusStyling.ringColor,
          healthOpacity,
          animated && statusStyling.animation,
          onClick && status !== 'inactive' && 'hover:scale-110 hover:shadow-neon',
          'transition-all duration-300 ease-in-out'
        )}
      >
        {/* Background pattern */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
        
        {/* Colony icon */}
        <span className={cn(sizeConfig.icon, 'relative z-10 filter drop-shadow-lg')}>
          {config.icon}
        </span>
        
        {/* Health indicator ring */}
        {health < 100 && (
          <div className="absolute inset-0 rounded-full">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke={health < 30 ? '#ff4757' : health < 60 ? '#ff9500' : '#00ff88'}
                strokeWidth="2"
                strokeDasharray={`${health * 3.01} 301`}
                className="transition-all duration-500"
              />
            </svg>
          </div>
        )}
        
        {/* Orbital rings for active trading */}
        {status === 'trading' && (
          <>
            <div className="absolute inset-0 rounded-full border border-accent-primary/50 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-accent-secondary/30 animate-pulse" />
          </>
        )}
      </div>

      {/* Colony name and type */}
      {(name || config.description) && (
        <div className="text-center">
          {name && (
            <div className={cn('font-space font-semibold', config.color, sizeConfig.name)}>
              {name}
            </div>
          )}
          <div className={cn('text-text-secondary', sizeConfig.name === 'text-xs' ? 'text-xs' : 'text-xs')}>
            {config.description}
          </div>
        </div>
      )}
      
      {/* Health percentage (if not full) */}
      {health < 100 && (
        <div className="text-xs text-center">
          <span className={cn(
            'font-mono font-bold',
            health < 30 ? 'text-status-danger' :
            health < 60 ? 'text-status-warning' : 'text-status-success'
          )}>
            {health}% Health
          </span>
        </div>
      )}
    </div>
  );
};

ColonyAvatar.displayName = 'ColonyAvatar';

export { ColonyAvatar };
export type { ColonyAvatarProps };