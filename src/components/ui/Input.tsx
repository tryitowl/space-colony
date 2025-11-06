import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  const inputClasses = cn(
    'w-full px-4 py-3',
    'bg-space-black/50 backdrop-blur-sm',
    'border border-white/20 rounded-xl',
    'text-white placeholder-space-text-secondary/60',
    'focus:border-space-cyan focus:outline-none focus:ring-2 focus:ring-space-cyan/30',
    'transition-all duration-300',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30',
    className
  );

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-space-text-secondary mb-2 font-orbitron">
          {label}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center space-x-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-xs text-space-text-secondary/70">
          {helperText}
        </p>
      )}
    </div>
  );
};