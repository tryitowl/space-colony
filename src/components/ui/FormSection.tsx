import React from 'react';
import { cn } from '../../utils/cn';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-bold font-orbitron text-white">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-space-text-secondary">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};