import { forwardRef } from 'react';
import type { CardProps, CardVariant } from '../../types/ui';
import { cn } from '../../utils/cn';
import { HUDFrame, type HUDColor } from './HUDFrame';


/**
 * Card - HUD-style card component for displaying content
 * 
 * Features:
 * - Multiple variants (primary, secondary, success, warning, danger, ghost)
 * - Optional hover effects and clickable states
 * - Header and footer sections
 * - HUD-style design with angular corners and glowing borders
 * - Animated scan lines and hover effects
 * - Responsive design
 * - Accessibility support
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'primary',
      hover = false,
      clickable = false,
      header,
      footer,
      className,
      children,
      testId,
      onClick,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'relative',
      'overflow-hidden',
    ];

    // Map variant to HUDColor
    const variantColorMap: Record<CardVariant, any> = {
      primary: 'cyan',
      secondary: 'blue',
      success: 'green',
      warning: 'amber',
      danger: 'red',
      ghost: 'none'
    } as const satisfies Record<CardVariant, HUDColor>;

    // Interactive states
    const interactiveClasses = [
      hover && 'hover:shadow-hud-glow hover:scale-[1.02]',
      clickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-space-black',
      (hover || clickable) && 'transition-all duration-300 ease-in-out',
    ].filter(Boolean);

    return (
      <HUDFrame
        color={variantColorMap[variant]}
        className={cn(
          ...baseClasses,
          ...interactiveClasses,
          className
        )}
        onClick={clickable ? onClick : undefined}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
        data-testid={testId}
        showScanLines={variant !== 'ghost'}
        showCornerAccents={variant !== 'ghost'}
        ref={ref}
        {...props}
      >
        {/* Header */}
        {header && (
          <div className="px-6 py-4 border-b border-current/30">
            {header}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-current/30">
            {footer}
          </div>
        )}
      </HUDFrame>
    );
  }
);

Card.displayName = 'Card';

export { Card };
export type { CardProps };