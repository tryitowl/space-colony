import React from 'react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className,
  children,
  ...props
}) => {
  const selectClasses = cn(
    'w-full px-4 py-3',
    'bg-space-black/50 backdrop-blur-sm',
    'border border-white/20 rounded-xl',
    'text-white',
    'focus:border-space-cyan focus:outline-none focus:ring-2 focus:ring-space-cyan/30',
    'transition-all duration-300',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'appearance-none cursor-pointer',
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
      <div className="relative">
        <select
          className={selectClasses}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-space-cyan">
          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
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
