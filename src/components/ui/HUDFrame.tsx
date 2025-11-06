import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type HUDColor = 'cyan' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'none';

export interface HUDFrameProps {
  children: ReactNode;
  className?: string;
  color?: HUDColor;
  variant?: 'default' | 'card' | 'panel' | 'status';
  animated?: boolean;
  showScanLines?: boolean;
  showCornerAccents?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  tabIndex?: number;
  role?: string;
  'data-testid'?: string;
}

/**
 * HUDFrame - A container component for HUD-style UI elements
 * 
 * Features:
 * - Hexagonal or rectangular frame with glowing borders
 * - Optional corner accents
 * - Color variants (cyan, blue, green, amber, red, purple)
 * - Style variants (default, card, panel, status)
 * - Animated option for enhanced visual effects
 * - Optional subtle scanning animation
 */
export const HUDFrame = forwardRef<HTMLDivElement, HUDFrameProps>((
  {
    children,
    className = '',
    color = 'cyan',
    variant = 'default',
    animated = false,
    showScanLines = false,
    showCornerAccents = true,
    onClick,
    tabIndex,
    role,
    'data-testid': testId,
    ...props
  },
  ref
) => {
  // Define color-specific styles
  const colorStyles: Record<string, { borderColor: string; textColor: string; glowColor: string; scanColor: string }> = {
    cyan: {
      borderColor: 'border-hud-cyan',
      textColor: 'text-hud-cyan',
      glowColor: 'shadow-hud-cyan',
      scanColor: 'from-hud-cyan/0 via-hud-cyan/10 to-hud-cyan/0',
    },
    blue: {
      borderColor: 'border-hud-blue',
      textColor: 'text-hud-blue',
      glowColor: 'shadow-hud-blue',
      scanColor: 'from-hud-blue/0 via-hud-blue/10 to-hud-blue/0',
    },
    green: {
      borderColor: 'border-hud-green',
      textColor: 'text-hud-green',
      glowColor: 'shadow-hud-green',
      scanColor: 'from-hud-green/0 via-hud-green/10 to-hud-green/0',
    },
    amber: {
      borderColor: 'border-hud-amber',
      textColor: 'text-hud-amber',
      glowColor: 'shadow-hud-amber',
      scanColor: 'from-hud-amber/0 via-hud-amber/10 to-hud-amber/0',
    },
    red: {
      borderColor: 'border-hud-red',
      textColor: 'text-hud-red',
      glowColor: 'shadow-hud-red',
      scanColor: 'from-hud-red/0 via-hud-red/10 to-hud-red/0',
    },
    purple: {
      borderColor: 'border-hud-purple',
      textColor: 'text-hud-purple',
      glowColor: 'shadow-hud-purple',
      scanColor: 'from-hud-purple/0 via-hud-purple/10 to-hud-purple/0',
    },
    none: {
      borderColor: 'border-transparent',
      textColor: 'text-gray-400',
      glowColor: '',
      scanColor: 'from-transparent via-transparent to-transparent',
    },
  };

  const styles = colorStyles[color] || colorStyles.cyan;

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'rounded-lg shadow-lg';
      case 'panel':
        return 'rounded-md border-2';
      case 'status':
        return 'rounded-full px-4 py-1';
      default:
        return '';
    }
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        'relative bg-hud-dark/80 backdrop-blur-hud',
        color !== 'none' && 'border',
        styles.borderColor,
        styles.textColor,
        getVariantStyles(),
        animated && 'animate-pulse-slow',
        className
      )}
      onClick={onClick}
      tabIndex={tabIndex}
      role={role}
      data-testid={testId}
      {...props}
    >
      {/* Corner accents */}
      {showCornerAccents && color !== 'none' && (
        <>
          <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${styles.borderColor}`} />
          <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${styles.borderColor}`} />
          <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${styles.borderColor}`} />
          <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${styles.borderColor}`} />
        </>
      )}

      {/* Scanning animation overlay */}
      {showScanLines && color !== 'none' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`
            absolute inset-0
            bg-gradient-to-b ${styles.scanColor}
            animate-hud-scan
          `} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

HUDFrame.displayName = 'HUDFrame';

export default HUDFrame;
