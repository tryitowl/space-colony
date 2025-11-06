import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ModalProps } from '../../types/ui';
import { cn } from '../../utils/cn';
import { HUDFrame } from './HUDFrame';
import { Button } from './Button';

/**
 * Modal - HUD-style modal overlay component
 * 
 * Features:
 * - Multiple sizes (sm, md, lg, xl, full)
 * - Backdrop blur with HUD-style design
 * - Angular corners and glowing borders
 * - Technical font and scan line animations
 * - Close on overlay click and escape key
 * - Focus management and accessibility
 * - Smooth animations
 * - Portal rendering
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  children,
  testId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl mx-4',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the modal
    if (modalRef.current) {
      const focusableElement = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (focusableElement) {
        focusableElement.focus();
      } else {
        modalRef.current.focus();
      }
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle focus trap
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  // HUD-style close button icon
  const CloseIcon = () => (
    <svg
      className="w-5 h-5 text-hud-cyan hover:text-hud-cyan-bright hover:drop-shadow-hud-glow transition-all duration-200"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={1.5}
        d="M6 18L18 6M6 6l12 12"
      />
      {/* Add HUD-style decorative elements */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      data-testid={testId}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-hud-dark/90 backdrop-blur-hud animate-slide-in" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full animate-slide-in-up',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <HUDFrame
          color="cyan"
          className="w-full max-h-[90vh] flex flex-col"
          showScanLines={true}
          showCornerAccents={true}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 pb-4 border-b border-hud-cyan/30">
              {title && (
                <h2
                  id="modal-title"
                  className="text-xl font-hud uppercase tracking-wider text-hud-cyan"
                >
                  {title}
                </h2>
              )}
              
              {showCloseButton && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={onClose}
                  className="ml-auto -mr-2"
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </Button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-auto px-6 pb-6 font-hud">
            {children}
          </div>
        </HUDFrame>
      </div>
    </div>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
};

Modal.displayName = 'Modal';

export { Modal };
export type { ModalProps };