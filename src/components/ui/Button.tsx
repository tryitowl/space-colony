import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-space-black disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] font-orbitron tracking-wide';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-space-cyan to-space-cyan/80 text-space-black hover:from-space-cyan/90 hover:to-space-cyan/70 focus:ring-space-cyan shadow-lg shadow-space-cyan/30 hover:shadow-xl hover:shadow-space-cyan/40',
    secondary: 'bg-gradient-to-r from-space-purple to-space-purple/80 text-white hover:from-space-purple/90 hover:to-space-purple/70 focus:ring-space-purple shadow-lg shadow-space-purple/30 hover:shadow-xl hover:shadow-space-purple/40',
    danger: 'bg-gradient-to-r from-space-danger to-space-danger/80 text-white hover:from-space-danger/90 hover:to-space-danger/70 focus:ring-space-danger shadow-lg shadow-space-danger/30 hover:shadow-xl hover:shadow-space-danger/40',
    success: 'bg-gradient-to-r from-space-success to-space-success/80 text-space-black hover:from-space-success/90 hover:to-space-success/70 focus:ring-space-success shadow-lg shadow-space-success/30 hover:shadow-xl hover:shadow-space-success/40',
    glass: 'bg-space-panel-bg backdrop-blur-glass border border-white/20 text-white hover:border-space-cyan/50 hover:bg-space-panel-bg/80 hover:shadow-lg hover:shadow-space-cyan/20 focus:ring-space-cyan relative overflow-hidden',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
};