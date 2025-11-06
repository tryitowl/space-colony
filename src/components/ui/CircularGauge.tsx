import React from 'react';

interface CircularGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  className?: string;
  animated?: boolean;
  unit?: string;
}

/**
 * CircularGauge - A circular progress/gauge component for HUD-style metrics
 * 
 * Features:
 * - Circular progress indicator with customizable colors
 * - Central value display with optional units
 * - Animated fill option
 * - Size variants
 */
export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  maxValue,
  label,
  size = 'md',
  variant = 'primary',
  showValue = true,
  className = '',
  animated = true,
  unit = '',
}) => {
  // Calculate percentage for the gauge
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  
  // Size mappings
  const sizeClasses = {
    sm: 'w-20 h-20 text-xs',
    md: 'w-32 h-32 text-sm',
    lg: 'w-40 h-40 text-base',
  };
  
  // Color mappings
  const variantColors = {
    primary: 'text-cyan-primary stroke-cyan-primary',
    secondary: 'text-purple-secondary stroke-purple-secondary',
    success: 'text-success-green stroke-success-green',
    warning: 'text-warning-orange stroke-warning-orange',
    danger: 'text-danger-red stroke-danger-red',
  };
  
  // SVG parameters
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* SVG Circular Gauge */}
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="4"
        />
        
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${variantColors[variant]} ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
          transform="rotate(-90 50 50)"
        />
        
        {/* Tick marks for gauge */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const x1 = 50 + (radius - 2) * Math.cos(angle);
          const y1 = 50 + (radius - 2) * Math.sin(angle);
          const x2 = 50 + (radius + 2) * Math.cos(angle);
          const y2 = 50 + (radius + 2) * Math.sin(angle);
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeOpacity="0.6"
              strokeWidth="1"
              className={variantColors[variant]}
            />
          );
        })}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <div className={`font-mono font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'} ${variantColors[variant]}`}>
            {Math.round(value)}
            <span className="text-xs ml-0.5 opacity-80">{unit}</span>
          </div>
        )}
        <div className="text-text-secondary font-space uppercase tracking-wider text-xs mt-1">
          {label}
        </div>
      </div>
    </div>
  );
};

export default CircularGauge;
