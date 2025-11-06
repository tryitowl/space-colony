import React from 'react';
import { cn } from '../../utils/cn';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  animated = true,
  className
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const statusClasses = {
    online: 'bg-space-success',
    offline: 'bg-gray-500',
    away: 'bg-space-warning',
    busy: 'bg-space-danger'
  };

  return (
    <div
      className={cn(
        'rounded-full',
        sizeClasses[size],
        statusClasses[status],
        animated && status === 'online' && 'animate-pulse',
        animated && status === 'busy' && 'animate-pulse-glow',
        className
      )}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
};