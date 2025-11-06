import React from 'react';
import type { ReactNode } from 'react';

interface HexGridProps {
  children: ReactNode[];
  className?: string;
  gap?: number;
  columns?: number;
  highlight?: number | null;
}

interface HexCellProps {
  children: ReactNode;
  className?: string;
  isHighlighted?: boolean;
  onClick?: () => void;
}

/**
 * HexGrid - A component for creating hexagonal grid layouts
 * 
 * Features:
 * - Arranges child elements in a hexagonal grid pattern
 * - Configurable columns and gap
 * - Optional highlight for specific cells
 */
export const HexGrid: React.FC<HexGridProps> = ({
  children,
  className = '',
  gap = 4,
  columns = 3,
  highlight = null,
}) => {
  return (
    <div 
      className={`grid grid-cols-${columns} ${className}`}
      style={{ 
        gap: `${gap}px`,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <HexCell 
          isHighlighted={highlight === index}
          key={index}
        >
          {child}
        </HexCell>
      ))}
    </div>
  );
};

/**
 * HexCell - Individual hexagonal cell within the HexGrid
 */
export const HexCell: React.FC<HexCellProps> = ({
  children,
  className = '',
  isHighlighted = false,
  onClick,
}) => {
  return (
    <div 
      className={`
        relative
        aspect-square
        flex
        items-center
        justify-center
        overflow-hidden
        transition-all
        duration-300
        ${isHighlighted ? 'z-10 scale-105' : 'z-0'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Hexagonal shape with clip-path */}
      <div 
        className={`
          absolute
          inset-0
          bg-space-blue
          border
          ${isHighlighted ? 'border-cyan-primary shadow-glow shadow-cyan-primary/40' : 'border-purple-secondary/50'}
        `}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-2 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default HexGrid;
