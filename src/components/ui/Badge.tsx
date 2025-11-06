import React from 'react';
import type { BadgeProps } from '../../types/ui';
import { cn } from '../../utils/cn';

/**
 * Badge - HUD-style status indicator and notification badge component
 * 
 * Features:
 * - Multiple variants (primary, secondary, success, warning, danger, info)
 * - Different sizes (sm, md, lg)
 * - Pulse animation for notifications
 * - Dot-only style for minimal indicators
 * - Count display with max count
 * - HUD-style design with angular corners and glowing borders
 * - Technical font and scan line animations
 */
const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  pulse = false,
  dot = false,
  count,
  maxCount = 99,
  className,
  children,
  testId,
}) => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-hud',
    'uppercase',
    'tracking-wider',
    'border',
    'backdrop-blur-hud',
    'transition-all',
    'duration-300',
    'ease-in-out',
    'relative',
    'overflow-hidden',
  ];

  // Size variations
  const sizeClasses = {
    sm: dot ? 'w-2 h-2' : 'px-2 py-0.5 text-xs min-h-[16px] rounded-none',
    md: dot ? 'w-3 h-3' : 'px-2.5 py-1 text-xs min-h-[20px] rounded-none',
    lg: dot ? 'w-4 h-4' : 'px-3 py-1.5 text-sm min-h-[24px] rounded-none',
  };

  // Dot-specific styles
  const dotClasses = dot ? ['rounded-full', 'border-2'] : [];

  // Variant styles with HUD colors
  const variantClasses = {
    primary: [
      'bg-hud-dark/80',
      'border-hud-cyan',
      'text-hud-cyan',
      'shadow-hud-cyan/30',
      dot && 'border-hud-cyan',
    ],
    secondary: [
      'bg-hud-dark/80',
      'border-hud-blue',
      'text-hud-blue',
      'shadow-hud-blue/30',
      dot && 'border-hud-blue',
    ],
    success: [
      'bg-hud-dark/80',
      'border-hud-green',
      'text-hud-green',
      'shadow-hud-green/30',
      dot && 'border-hud-green',
    ],
    warning: [
      'bg-hud-dark/80',
      'border-hud-amber',
      'text-hud-amber',
      'shadow-hud-amber/30',
      dot && 'border-hud-amber',
    ],
    danger: [
      'bg-hud-dark/80',
      'border-hud-red',
      'text-hud-red',
      'shadow-hud-red/30',
      dot && 'border-hud-red',
    ],
    info: [
      'bg-hud-dark/80',
      'border-hud-purple',
      'text-hud-purple',
      'shadow-hud-purple/30',
      dot && 'border-hud-purple',
    ],
  };

  const pulseClass = pulse ? 'animate-hud-pulse' : '';

  // Determine display content
  const displayContent = () => {
    if (dot) return null;
    
    if (count !== undefined) {
      return count > maxCount ? `${maxCount}+` : count.toString();
    }
    
    return children;
  };

  // Don't render if no content and not a dot
  if (!dot && !children && count === undefined) {
    return null;
  }

  // Add corner accents for HUD style
  const renderCornerAccents = () => {
    if (dot) return null;
    
    const borderColor = variant === 'primary' ? 'border-hud-cyan' : 
                        variant === 'secondary' ? 'border-hud-blue' : 
                        variant === 'success' ? 'border-hud-green' : 
                        variant === 'warning' ? 'border-hud-amber' : 
                        variant === 'danger' ? 'border-hud-red' : 'border-hud-purple';
    
    return (
      <>
        <span className={`absolute top-0 left-0 w-1 h-1 border-t border-l ${borderColor}`} />
        <span className={`absolute top-0 right-0 w-1 h-1 border-t border-r ${borderColor}`} />
        <span className={`absolute bottom-0 left-0 w-1 h-1 border-b border-l ${borderColor}`} />
        <span className={`absolute bottom-0 right-0 w-1 h-1 border-b border-r ${borderColor}`} />
      </>
    );
  };

  return (
    <span
      className={cn(
        ...baseClasses,
        sizeClasses[size],
        ...dotClasses,
        ...variantClasses[variant].filter(Boolean),
        pulseClass,
        className
      )}
      data-testid={testId}
      role={count !== undefined ? 'status' : undefined}
      aria-label={count !== undefined ? `${count} notifications` : undefined}
    >
      {/* HUD-style corner accents */}
      {!dot && renderCornerAccents()}
      
      {/* Scan line animation for HUD style */}
      {!dot && pulse && (
        <span className="absolute inset-0 bg-gradient-to-b from-current/0 via-current/10 to-current/0 animate-hud-scan pointer-events-none" />
      )}
      
      {/* Content */}
      <span className="relative z-10">
        {displayContent()}
      </span>
    </span>
  );
};

Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps };