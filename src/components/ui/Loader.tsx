import React from 'react';
import type { LoaderProps } from '../../types/ui';
import { cn } from '../../utils/cn';

/**
 * Loader - Space-themed loading animations component
 * 
 * Features:
 * - Multiple variants (spinner, dots, pulse, orbit, warp)
 * - Different sizes (sm, md, lg, xl)
 * - Custom colors
 * - Optional loading text
 * - Space-themed animations
 * - Accessible with ARIA labels
 */
const Loader: React.FC<LoaderProps> = ({
  variant = 'spinner',
  size = 'md',
  color,
  text,
  className,
  testId,
}) => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-3',
  ];

  // Size variations
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Color classes
  const colorClass = color ? `text-[${color}]` : 'text-accent-primary';

  // Spinner component
  const SpinnerLoader = () => (
    <svg
      className={cn('animate-spin', sizeClasses[size], colorClass)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Dots loader component
  const DotsLoader = () => {
    const dotSize = {
      sm: 'w-1 h-1',
      md: 'w-2 h-2',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    };

    return (
      <div className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn(
              dotSize[size],
              'rounded-full animate-bounce-subtle',
              colorClass,
              'bg-current'
            )}
            style={{
              animationDelay: `${index * 0.15}s`,
            }}
          />
        ))}
      </div>
    );
  };

  // Pulse loader component
  const PulseLoader = () => (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-full border-2 border-current animate-pulse-glow',
        colorClass
      )}
    />
  );

  // Orbit loader component
  const OrbitLoader = () => {
    const orbitSize = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-20 h-20',
    };

    const planetSize = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    };

    return (
      <div className={cn('relative', orbitSize[size])}>
        {/* Central star */}
        <div className={cn('absolute inset-0 flex items-center justify-center')}>
          <div className={cn('w-1 h-1 rounded-full bg-current animate-pulse', colorClass)} />
        </div>
        
        {/* Orbiting planets */}
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="absolute inset-0 animate-spin-slow"
            style={{
              animationDelay: `${index * 0.8}s`,
              animationDuration: `${3 + index * 0.5}s`,
            }}
          >
            <div className={cn(planetSize[size], 'rounded-full bg-current opacity-60', colorClass)} />
          </div>
        ))}
      </div>
    );
  };

  // Warp loader component
  const WarpLoader = () => {
    const lineHeight = {
      sm: 'h-0.5',
      md: 'h-1',
      lg: 'h-1.5',
      xl: 'h-2',
    };

    const lineWidth = {
      sm: 'w-8',
      md: 'w-12',
      lg: 'w-16',
      xl: 'w-20',
    };

    return (
      <div className="flex flex-col gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              lineHeight[size],
              lineWidth[size],
              'bg-current rounded-full animate-shimmer opacity-60',
              colorClass
            )}
            style={{
              animationDelay: `${index * 0.1}s`,
              transform: `scaleX(${1 - index * 0.15})`,
            }}
          />
        ))}
      </div>
    );
  };

  // Render appropriate loader variant
  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return <SpinnerLoader />;
      case 'dots':
        return <DotsLoader />;
      case 'pulse':
        return <PulseLoader />;
      case 'orbit':
        return <OrbitLoader />;
      case 'warp':
        return <WarpLoader />;
      default:
        return <SpinnerLoader />;
    }
  };

  return (
    <div
      className={cn(baseClasses, className)}
      role="status"
      aria-label={text || 'Loading'}
      data-testid={testId}
    >
      {renderLoader()}
      
      {text && (
        <span className={cn('font-space text-text-secondary', textSizeClasses[size])}>
          {text}
        </span>
      )}
      
      {/* Screen reader text */}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

Loader.displayName = 'Loader';

export { Loader };
export type { LoaderProps };