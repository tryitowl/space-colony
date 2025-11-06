import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  label
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-8'
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const thumbTranslateClasses = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-5' : 'translate-x-1',
    lg: checked ? 'translate-x-6' : 'translate-x-1'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-space-text-secondary">
          {label}
        </label>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
          ${sizeClasses[size]}
          ${checked 
            ? 'bg-space-cyan' 
            : 'bg-white/20'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-opacity-80'
          }
          focus:outline-none focus:ring-2 focus:ring-space-cyan/50 focus:ring-offset-2 focus:ring-offset-space-bg
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out
            ${thumbSizeClasses[size]}
            ${thumbTranslateClasses[size]}
          `}
        />
      </button>
    </div>
  );
};