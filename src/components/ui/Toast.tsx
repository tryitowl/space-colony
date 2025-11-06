import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { GlassPanel } from './GlassPanel';
import { Button } from './Button';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  showCloseButton = true
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'default'; // Orange warning style handled by CSS
      case 'error':
        return 'danger';
      default:
        return 'active';
    }
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 transition-all duration-300 transform',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <GlassPanel 
        className={cn(
          'p-4 min-w-[300px] max-w-[400px]',
          type === 'warning' && 'border-space-warning shadow-space-warning/20'
        )}
        variant={getVariant()}
      >
        <div className="flex items-start space-x-3">
          <span className="text-lg flex-shrink-0">{getIcon()}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{message}</p>
          </div>
          {showCloseButton && (
            <Button
              variant="glass"
              size="sm"
              className="p-1 min-w-0 h-6 w-6"
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onClose?.(), 300);
              }}
            >
              ✕
            </Button>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

// Toast Manager Component
interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastManagerProps {
  toasts: ToastMessage[];
  onRemoveToast: (id: string) => void;
}

export const ToastManager: React.FC<ToastManagerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onRemoveToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};