import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  animated = true,
  showPercentage = false,
  className
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    default: 'bg-space-cyan',
    success: 'bg-space-success',
    warning: 'bg-space-warning',
    danger: 'bg-space-danger'
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'w-full bg-space-black/30 rounded-full overflow-hidden border border-white/10',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-500 rounded-full',
            variantClasses[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-white mix-blend-difference">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};