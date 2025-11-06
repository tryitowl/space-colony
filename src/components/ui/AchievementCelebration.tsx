import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HUDFrame } from './HUDFrame';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface AchievementCelebrationProps {
  achievement: Achievement | null;
  onComplete?: () => void;
  duration?: number;
  className?: string;
}

/**
 * AchievementCelebration - Animated achievement unlock celebrations
 * 
 * Features:
 * - Dramatic reveal animations
 * - Particle burst effects
 * - Rarity-based visual styles
 * - Sound effect triggers
 * - Auto-dismiss with callback
 */
export const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  achievement,
  onComplete,
  duration = 5000,
  className,
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number }>>([]);

  useEffect(() => {
    if (!achievement) return;

    // Generate particles for burst effect
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i / 20) * Math.PI * 2,
    }));
    setParticles(newParticles);

    // Auto-dismiss timer
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [achievement, duration, onComplete]);

  if (!achievement) return null;

  // Get rarity-based styling
  const getRarityStyles = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return {
          bgGradient: 'from-yellow-600/20 via-amber-500/20 to-orange-600/20',
          borderColor: 'border-yellow-500',
          glowColor: 'shadow-yellow-500/50',
          particleColor: '#fbbf24',
          textColor: 'text-yellow-400',
        };
      case 'epic':
        return {
          bgGradient: 'from-purple-600/20 via-pink-500/20 to-purple-600/20',
          borderColor: 'border-purple-500',
          glowColor: 'shadow-purple-500/50',
          particleColor: '#a855f7',
          textColor: 'text-purple-400',
        };
      case 'rare':
        return {
          bgGradient: 'from-blue-600/20 via-cyan-500/20 to-blue-600/20',
          borderColor: 'border-blue-500',
          glowColor: 'shadow-blue-500/50',
          particleColor: '#3b82f6',
          textColor: 'text-blue-400',
        };
      default:
        return {
          bgGradient: 'from-gray-600/20 via-gray-500/20 to-gray-600/20',
          borderColor: 'border-gray-500',
          glowColor: 'shadow-gray-500/50',
          particleColor: '#6b7280',
          textColor: 'text-gray-400',
        };
    }
  };

  const styles = getRarityStyles();

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center pointer-events-none',
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background overlay flash */}
        <motion.div
          className="absolute inset-0 bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.5 }}
        />

        {/* Particle burst */}
        <div className="absolute">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: styles.particleColor,
                boxShadow: `0 0 10px ${styles.particleColor}`,
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: Math.cos(particle.angle) * 300,
                y: Math.sin(particle.angle) * 300,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 1.5,
                ease: 'easeOut',
                delay: particle.id * 0.02,
              }}
            />
          ))}
        </div>

        {/* Main achievement card */}
        <motion.div
          className="relative pointer-events-auto"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
        >
          <HUDFrame
            color="none"
            className={cn(
              'relative overflow-hidden border-2',
              styles.borderColor,
              `shadow-2xl ${styles.glowColor}`
            )}
          >
            {/* Animated background */}
            <div className="absolute inset-0">
              <motion.div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-50',
                  styles.bgGradient
                )}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />
              
              {/* Scanning line effect */}
              <motion.div
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </div>

            <div className="relative p-8 min-w-[400px] text-center">
              {/* Achievement unlocked text */}
              <motion.div
                className="text-sm uppercase tracking-widest text-gray-400 mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Achievement Unlocked
              </motion.div>

              {/* Icon with effects */}
              <motion.div
                className="relative inline-block mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* Glow rings */}
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full border-2',
                    styles.borderColor
                  )}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                
                <div className="text-6xl relative z-10">
                  {achievement.icon}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                className={cn(
                  'text-2xl font-bold font-space mb-2',
                  styles.textColor
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {achievement.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                className="text-gray-300 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {achievement.description}
              </motion.p>

              {/* Points and rarity */}
              <motion.div
                className="flex items-center justify-center gap-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className={cn(
                  'px-3 py-1 rounded-full text-sm font-semibold uppercase',
                  'bg-white/10 backdrop-blur-sm border',
                  styles.borderColor,
                  styles.textColor
                )}>
                  {achievement.rarity}
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-2xl">🌟</span>
                  <span className="text-xl font-bold font-mono">
                    +{achievement.points}
                  </span>
                </div>
              </motion.div>

              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/10"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: duration / 1000,
                  ease: 'linear',
                }}
                style={{ transformOrigin: 'left' }}
              >
                <div
                  className={cn('h-full', styles.textColor)}
                  style={{ backgroundColor: styles.particleColor }}
                />
              </motion.div>
            </div>
          </HUDFrame>
        </motion.div>

        {/* Additional effects for legendary achievements */}
        {achievement.rarity === 'legendary' && (
          <>
            {/* Rotating rays */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-96 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-t from-transparent via-yellow-400/20 to-transparent"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                  }}
                />
              ))}
            </motion.div>

            {/* Sparkles */}
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                ✨
              </motion.div>
            ))}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

AchievementCelebration.displayName = 'AchievementCelebration';

export default AchievementCelebration;