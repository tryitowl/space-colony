import React from 'react';
import HUDFrame from './HUDFrame';

interface DataPoint {
  label: string;
  value: number;
}

interface DataVisualizationProps {
  title: string;
  data: DataPoint[];
  maxValue?: number;
  variant?: 'primary' | 'secondary' | 'alert';
  className?: string;
  animated?: boolean;
  horizontal?: boolean;
}

/**
 * DataVisualization - A component for displaying data in a HUD-style bar chart
 * 
 * Features:
 * - Bar chart visualization with HUD styling
 * - Animated data bars
 * - Vertical or horizontal orientation
 * - Color variants
 */
export const DataVisualization: React.FC<DataVisualizationProps> = ({
  title,
  data,
  maxValue,
  variant = 'primary',
  className = '',
  animated = true,
  horizontal = false,
}) => {
  // Calculate the maximum value if not provided
  const calculatedMax = maxValue || Math.max(...data.map(item => item.value), 0);
  
  // Color mappings
  const variantColors = {
    primary: 'bg-cyan-primary',
    secondary: 'bg-purple-secondary',
    alert: 'bg-warning-orange',
  };
  
  const barColor = variantColors[variant];
  
  return (
    <HUDFrame 
      variant="panel" 
      color={variant === 'primary' ? 'cyan' : variant === 'secondary' ? 'purple' : 'amber'}
      className={`p-4 ${className}`}
      animated={false}
    >
      <div className="w-full">
        <h3 className="font-space text-sm uppercase tracking-wider mb-3 text-text-primary">
          {title}
        </h3>
        
        <div className={`space-y-3 ${horizontal ? 'space-y-0 space-x-4 flex' : ''}`}>
          {data.map((item, index) => {
            const percentage = (item.value / calculatedMax) * 100;
            
            return (
              <div 
                key={index} 
                className={`${horizontal ? 'flex flex-col items-center' : 'w-full'}`}
              >
                <div className="flex justify-between items-center mb-1 text-xs text-text-secondary">
                  <span className="font-space">{item.label}</span>
                  <span className="font-mono">{item.value}</span>
                </div>
                
                <div 
                  className={`
                    relative 
                    ${horizontal ? 'h-32 w-4' : 'h-2 w-full'} 
                    bg-space-blue-40 
                    overflow-hidden
                  `}
                >
                  <div
                    className={`
                      absolute 
                      ${horizontal ? 'bottom-0 w-full' : 'left-0 h-full'} 
                      ${barColor} 
                      ${animated ? 'transition-all duration-1000 ease-out' : ''}
                    `}
                    style={{
                      height: horizontal ? `${percentage}%` : '100%',
                      width: horizontal ? '100%' : `${percentage}%`,
                    }}
                  />
                  
                  {/* Scan lines */}
                  <div className={`
                    absolute inset-0 
                    ${horizontal ? 'bg-gradient-to-t' : 'bg-gradient-to-r'}
                    from-transparent via-white/10 to-transparent 
                    opacity-30
                  `} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </HUDFrame>
  );
};

export default DataVisualization;
