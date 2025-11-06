import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface TradeParticleEffectProps {
  isActive: boolean;
  fromPosition?: { x: number; y: number };
  toPosition?: { x: number; y: number };
  particleCount?: number;
  color?: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

/**
 * TradeParticleEffect - Animated particle effects for successful trades
 * 
 * Features:
 * - Dynamic particle trajectories from source to destination
 * - Customizable particle count and colors
 * - Burst and stream effects
 * - Performance optimized with Framer Motion
 */
export const TradeParticleEffect: React.FC<TradeParticleEffectProps> = ({
  isActive,
  fromPosition = { x: 0, y: 0 },
  toPosition = { x: 100, y: 100 },
  particleCount = 30,
  color = '#00d4ff',
  duration = 2,
  onComplete,
  className,
}) => {
  useEffect(() => {
    if (isActive && onComplete) {
      const timer = setTimeout(onComplete, duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete]);

  // Generate particle data
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, index) => {
      // Create varied particle paths
      const pathVariation = (Math.random() - 0.5) * 100;
      const delayVariation = Math.random() * 0.5;
      const sizeVariation = Math.random() * 4 + 2;
      
      // Calculate control points for bezier curve
      const midX = (fromPosition.x + toPosition.x) / 2 + pathVariation;
      const midY = (fromPosition.y + toPosition.y) / 2 + pathVariation;
      
      return {
        id: index,
        size: sizeVariation,
        delay: delayVariation,
        pathX: [fromPosition.x, midX, toPosition.x],
        pathY: [fromPosition.y, midY, toPosition.y],
        opacity: Math.random() * 0.5 + 0.5,
      };
    });
  }, [particleCount, fromPosition, toPosition]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className={cn('fixed inset-0 pointer-events-none z-50', className)}>
          {/* Main particle stream */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: color,
                boxShadow: `0 0 ${particle.size * 2}px ${color}, 0 0 ${particle.size * 4}px ${color}50`,
              }}
              initial={{
                x: particle.pathX[0],
                y: particle.pathY[0],
                scale: 0,
                opacity: 0,
              }}
              animate={{
                x: particle.pathX,
                y: particle.pathY,
                scale: [0, 1.5, 1, 0.5, 0],
                opacity: [0, particle.opacity, particle.opacity, 0.3, 0],
              }}
              transition={{
                duration: duration,
                delay: particle.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
                times: [0, 0.2, 0.5, 0.8, 1],
              }}
            />
          ))}

          {/* Energy trail effect */}
          <motion.svg
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.path
              d={`M ${fromPosition.x} ${fromPosition.y} Q ${(fromPosition.x + toPosition.x) / 2} ${(fromPosition.y + toPosition.y) / 2 - 50} ${toPosition.x} ${toPosition.y}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: 1, 
                opacity: [0, 0.8, 0.8, 0],
              }}
              transition={{ 
                duration: duration,
                ease: "easeInOut",
                opacity: { times: [0, 0.1, 0.9, 1] }
              }}
              style={{
                filter: `drop-shadow(0 0 10px ${color})`,
              }}
            />
          </motion.svg>

          {/* Burst effect at destination */}
          <motion.div
            className="absolute rounded-full"
            style={{
              left: toPosition.x,
              top: toPosition.y,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 3, 4],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 0.6,
              delay: duration - 0.3,
              ease: "easeOut",
            }}
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                boxShadow: `0 0 40px ${color}60`,
              }}
            />
          </motion.div>

          {/* Ripple waves at destination */}
          {[0, 1, 2].map((wave) => (
            <motion.div
              key={`wave-${wave}`}
              className="absolute rounded-full border-2"
              style={{
                left: toPosition.x,
                top: toPosition.y,
                transform: 'translate(-50%, -50%)',
                borderColor: color,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 2 + wave, 3 + wave],
                opacity: [0, 0.6 - wave * 0.2, 0],
              }}
              transition={{
                duration: 1,
                delay: duration - 0.5 + wave * 0.1,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

TradeParticleEffect.displayName = 'TradeParticleEffect';

export default TradeParticleEffect;