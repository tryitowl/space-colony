import React from 'react';
import { cn } from '../../utils/cn';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'active' | 'danger' | 'success';
  blur?: boolean;
  onClick?: () => void;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  variant = 'default',
  blur = true,
  onClick,
}) => {
  const baseClasses = 'relative rounded-2xl border transition-all duration-500 overflow-hidden';
  
  const variantClasses = {
    default: 'bg-space-panel-bg border-white/10 hover:border-white/20 hover:bg-space-panel-bg/60 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30',
    active: 'bg-space-panel-bg border-space-cyan/40 shadow-xl shadow-space-cyan/25 hover:shadow-2xl hover:shadow-space-cyan/35',
    danger: 'bg-red-900/15 border-space-danger/40 shadow-xl shadow-space-danger/25 hover:shadow-2xl hover:shadow-space-danger/35',
    success: 'bg-green-900/15 border-space-success/40 shadow-xl shadow-space-success/25 hover:shadow-2xl hover:shadow-space-success/35',
  };

  const blurClass = blur ? 'backdrop-blur-glass' : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        blurClass,
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 -skew-x-12 animate-shimmer" />
      
      {children}
    </div>
  );
};