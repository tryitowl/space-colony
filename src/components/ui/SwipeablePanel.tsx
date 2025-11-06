import React, { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HUDFrame } from './HUDFrame';

interface SwipeablePanelProps {
  children: ReactNode;
  panels: ReactNode[];
  onPanelChange?: (index: number) => void;
  enableSwipe?: boolean;
  showIndicators?: boolean;
  hapticFeedback?: boolean;
  className?: string;
}

/**
 * SwipeablePanel - Touch-optimized swipeable panel container
 * 
 * Features:
 * - Smooth swipe gestures between panels
 * - Haptic feedback on supported devices
 * - Visual indicators
 * - Momentum-based scrolling
 * - Keyboard navigation support
 */
export const SwipeablePanel: React.FC<SwipeablePanelProps> = ({
  children,
  panels,
  onPanelChange,
  enableSwipe = true,
  showIndicators = true,
  hapticFeedback = true,
  className,
}) => {
  const [currentPanel, setCurrentPanel] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Calculate drag constraints
  const panelWidth = 100; // percentage
  const dragElastic = 0.2;

  // Transform values for visual feedback
  const scale = useTransform(x, 
    [-panelWidth, 0, panelWidth], 
    [0.95, 1, 0.95]
  );
  
  const opacity = useTransform(x,
    [-panelWidth, 0, panelWidth],
    [0.5, 1, 0.5]
  );

  // Trigger haptic feedback
  const triggerHaptic = () => {
    if (!hapticFeedback) return;
    
    // Check if the Vibration API is supported
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short haptic pulse
    }
  };

  // Handle swipe end
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = panelWidth * 0.2; // 20% of panel width
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    let newPanel = currentPanel;

    // Determine swipe direction based on velocity and offset
    if (Math.abs(velocity) > 500) {
      // Fast swipe
      if (velocity > 0 && currentPanel > 0) {
        newPanel = currentPanel - 1;
      } else if (velocity < 0 && currentPanel < panels.length - 1) {
        newPanel = currentPanel + 1;
      }
    } else if (Math.abs(offset) > threshold) {
      // Slow swipe past threshold
      if (offset > 0 && currentPanel > 0) {
        newPanel = currentPanel - 1;
      } else if (offset < 0 && currentPanel < panels.length - 1) {
        newPanel = currentPanel + 1;
      }
    }

    // Animate to new panel
    if (newPanel !== currentPanel) {
      triggerHaptic();
      setCurrentPanel(newPanel);
      onPanelChange?.(newPanel);
    }

    // Animate back to position
    controls.start({
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    });
  };

  // Navigate to specific panel
  const goToPanel = (index: number) => {
    if (index < 0 || index >= panels.length) return;
    
    triggerHaptic();
    setCurrentPanel(index);
    onPanelChange?.(index);
    
    controls.start({
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        if (currentPanel > 0) goToPanel(currentPanel - 1);
        break;
      case 'ArrowRight':
        if (currentPanel < panels.length - 1) goToPanel(currentPanel + 1);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Swipeable panel container"
    >
      {/* Main content area */}
      <motion.div
        className="relative w-full h-full"
        drag={enableSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={dragElastic}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, scale, opacity }}
      >
        <HUDFrame color="cyan" variant="panel" className="h-full">
          {children}
        </HUDFrame>
      </motion.div>

      {/* Side panels (visible during swipe) */}
      <AnimatePresence>
        {enableSwipe && (
          <>
            {/* Previous panel preview */}
            {currentPanel > 0 && (
              <motion.div
                className="absolute left-0 top-0 w-1/4 h-full -translate-x-full"
                initial={{ x: '-100%' }}
                animate={{ 
                  x: x.get() > 0 ? `${Math.min(x.get() * 4, 100)}%` : '-100%' 
                }}
              >
                <div className="h-full opacity-50 scale-90">
                  {panels[currentPanel - 1]}
                </div>
              </motion.div>
            )}

            {/* Next panel preview */}
            {currentPanel < panels.length - 1 && (
              <motion.div
                className="absolute right-0 top-0 w-1/4 h-full translate-x-full"
                initial={{ x: '100%' }}
                animate={{ 
                  x: x.get() < 0 ? `${Math.max(x.get() * 4, -100)}%` : '100%' 
                }}
              >
                <div className="h-full opacity-50 scale-90">
                  {panels[currentPanel + 1]}
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Navigation indicators */}
      {showIndicators && panels.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {panels.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPanel(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-cyan-400',
                currentPanel === index
                  ? 'w-8 bg-cyan-400 shadow-cyan-400/50 shadow-lg'
                  : 'bg-gray-600 hover:bg-gray-500'
              )}
              aria-label={`Go to panel ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe hint animation */}
      {enableSwipe && currentPanel === 0 && (
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          initial={{ opacity: 0, x: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            x: [0, -20, -20, 0],
          }}
          transition={{
            duration: 3,
            delay: 2,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="text-sm">Swipe</span>
            <motion.div
              animate={{ x: [-5, 5, -5] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              ←
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Edge glow effects during swipe */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-cyan-400/20 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: x.get() > 20 ? 1 : 0 }}
      />
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-cyan-400/20 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: x.get() < -20 ? 1 : 0 }}
      />
    </div>
  );
};

SwipeablePanel.displayName = 'SwipeablePanel';

export default SwipeablePanel;