import React, { useState, useEffect } from 'react';
import type { TimerProps } from '../../types/ui';
import { cn } from '../../utils/cn';

/**
 * Timer - Countdown timer with urgency styling
 * 
 * Features:
 * - Multiple display formats (full, compact, minimal)
 * - Urgency styling based on remaining time
 * - Optional milliseconds display
 * - Completion callback
 * - Visual variants (default, warning, danger)
 * - Responsive font sizing
 * - Smooth transitions
 */
const Timer: React.FC<TimerProps> = ({
  duration,
  endTime,
  onComplete,
  urgent = false,
  showMilliseconds = false,
  format = 'full',
  variant = 'default',
  className,
  testId,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Calculate initial time remaining
  useEffect(() => {
    if (endTime) {
      const now = new Date().getTime();
      const end = endTime.getTime();
      const remaining = Math.max(0, end - now);
      setTimeRemaining(Math.ceil(remaining / 1000));
    } else {
      setTimeRemaining(duration || 0);
    }
  }, [duration, endTime]);

  // Timer countdown effect
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          if (onComplete) {
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeRemaining, onComplete]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    switch (format) {
      case 'full':
        if (hours > 0) {
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      case 'compact':
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
      
      case 'minimal':
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      
      default:
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Determine urgency level
  const getUrgencyLevel = (): 'normal' | 'warning' | 'critical' => {
    const totalDuration = endTime ? 
      Math.ceil((endTime.getTime() - new Date().getTime() + (duration || 0) * 1000) / 1000) : 
      (duration || 0);
    
    const percentage = totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;
    
    if (percentage <= 10 || timeRemaining <= 10) return 'critical';
    if (percentage <= 25 || timeRemaining <= 30) return 'warning';
    return 'normal';
  };

  const urgencyLevel = urgent ? getUrgencyLevel() : 'normal';

  // Styling based on variant and urgency
  const getTimerStyles = () => {
    const baseStyles = [
      'font-mono font-bold text-center transition-all duration-300',
    ];

    // Variant styles
    const variantStyles = {
      default: 'text-text-primary',
      warning: 'text-status-warning',
      danger: 'text-status-danger',
    };

    // Urgency styles (override variant if urgent)
    const urgencyStyles = {
      normal: urgent ? 'text-text-primary' : variantStyles[variant],
      warning: 'text-status-warning',
      critical: 'text-status-danger animate-pulse',
    };

    return [
      ...baseStyles,
      urgent ? urgencyStyles[urgencyLevel] : variantStyles[variant],
    ];
  };

  // Background styles for urgency
  const getBackgroundStyles = () => {
    if (!urgent) return '';
    
    switch (urgencyLevel) {
      case 'critical':
        return 'bg-status-danger/20 ring-2 ring-status-danger/50 animate-pulse';
      case 'warning':
        return 'bg-status-warning/20 ring-2 ring-status-warning/50';
      default:
        return 'bg-panel-bg/50';
    }
  };

  // Size styles based on format
  const getSizeStyles = () => {
    switch (format) {
      case 'full':
        return 'text-2xl sm:text-3xl lg:text-4xl';
      case 'compact':
        return 'text-lg sm:text-xl lg:text-2xl';
      case 'minimal':
        return 'text-base sm:text-lg lg:text-xl';
      default:
        return 'text-xl sm:text-2xl lg:text-3xl';
    }
  };

  // Progress bar for visual countdown
  const progressPercentage = endTime ? 
    Math.max(0, (timeRemaining / Math.ceil((endTime.getTime() - new Date().getTime() + (duration || 0) * 1000) / 1000)) * 100) :
    Math.max(0, (timeRemaining / (duration || 1)) * 100);

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center gap-2 p-4 rounded-glass',
        getBackgroundStyles(),
        className
      )}
      data-testid={testId}
      role="timer"
      aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
    >
      {/* Main timer display */}
      <div className={cn(getTimerStyles(), getSizeStyles())}>
        {formatTime(timeRemaining)}
        {showMilliseconds && timeRemaining > 0 && (
          <span className="text-sm opacity-75">
            .{Math.floor((timeRemaining % 1) * 1000).toString().padStart(3, '0')}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {urgent && (
        <div className="w-full bg-panel-border rounded-full h-1">
          <div
            className={cn(
              'h-1 rounded-full transition-all duration-1000 ease-linear',
              urgencyLevel === 'critical' ? 'bg-status-danger' :
              urgencyLevel === 'warning' ? 'bg-status-warning' : 'bg-accent-primary'
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Urgency indicator */}
      {urgent && urgencyLevel !== 'normal' && (
        <div className={cn(
          'text-xs font-space font-semibold uppercase tracking-wide',
          urgencyLevel === 'critical' ? 'text-status-danger' : 'text-status-warning'
        )}>
          {urgencyLevel === 'critical' ? 'URGENT' : 'Warning'}
        </div>
      )}

      {/* Completion indicator */}
      {timeRemaining === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-status-success/20 rounded-glass">
          <span className="text-status-success font-space font-bold text-lg">
            COMPLETE
          </span>
        </div>
      )}
    </div>
  );
};

Timer.displayName = 'Timer';

export { Timer };
export type { TimerProps };