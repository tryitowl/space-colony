import React, { useRef, useMemo } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import type { ColonyType } from '../../types/game';
import { cn } from '../../utils/cn';

interface Colony3DProps {
  colonyType: ColonyType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rotation?: boolean;
  glow?: boolean;
  particles?: boolean;
  onClick?: () => void;
  className?: string;
  health?: number;
  status?: 'active' | 'inactive' | 'critical' | 'trading';
}

/**
 * Colony3D - Advanced 3D representation of space colonies
 * 
 * Features:
 * - 3D rotating planets/stations with unique visuals per colony type
 * - Dynamic particle effects
 * - Glassmorphism layers
 * - Health-based visual changes
 * - Status animations
 */
export const Colony3D: React.FC<Colony3DProps> = ({
  colonyType,
  size = 'md',
  rotation = true,
  glow = true,
  particles = true,
  onClick,
  className,
  health = 100,
  status = 'active',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring animation for mouse tracking
  const springConfig = { damping: 25, stiffness: 300 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  // Size configurations
  const sizeConfig = {
    sm: { container: 120, planet: 60, ring: 80, particles: 100 },
    md: { container: 180, planet: 90, ring: 120, particles: 150 },
    lg: { container: 240, planet: 120, ring: 160, particles: 200 },
    xl: { container: 320, planet: 160, ring: 210, particles: 250 },
  };

  const sizes = sizeConfig[size];

  // Colony configurations with unique visuals
  const colonyVisuals = useMemo(() => ({
    mining: {
      primaryColor: '#ff6b35',
      secondaryColor: '#ff8c42',
      texture: 'radial-gradient(circle at 30% 30%, #8b4513 0%, #654321 25%, #3e2723 50%, #1a0e0a 100%)',
      atmosphere: 'radial-gradient(circle at center, rgba(255, 107, 53, 0.3) 0%, transparent 70%)',
      ringColor: 'rgba(255, 107, 53, 0.5)',
      particleColor: '#ff6b35',
      structures: [
        { type: 'drill', angle: 0, size: 20 },
        { type: 'drill', angle: 120, size: 15 },
        { type: 'drill', angle: 240, size: 18 },
      ],
    },
    agricultural: {
      primaryColor: '#4ecdc4',
      secondaryColor: '#44a3a0',
      texture: 'radial-gradient(circle at 40% 40%, #228b22 0%, #3cb371 30%, #2e8b57 60%, #006400 100%)',
      atmosphere: 'radial-gradient(circle at center, rgba(78, 205, 196, 0.4) 0%, transparent 70%)',
      ringColor: 'rgba(78, 205, 196, 0.4)',
      particleColor: '#4ecdc4',
      structures: [
        { type: 'dome', angle: 45, size: 25 },
        { type: 'dome', angle: 165, size: 20 },
        { type: 'dome', angle: 285, size: 22 },
      ],
    },
    research: {
      primaryColor: '#6c5ce7',
      secondaryColor: '#5f4dd8',
      texture: 'radial-gradient(circle at 35% 35%, #4a148c 0%, #6a1b9a 30%, #7b1fa2 60%, #311b92 100%)',
      atmosphere: 'radial-gradient(circle at center, rgba(108, 92, 231, 0.5) 0%, transparent 70%)',
      ringColor: 'rgba(108, 92, 231, 0.6)',
      particleColor: '#6c5ce7',
      structures: [
        { type: 'lab', angle: 30, size: 20 },
        { type: 'antenna', angle: 150, size: 30 },
        { type: 'lab', angle: 270, size: 18 },
      ],
    },
    trade_hub: {
      primaryColor: '#00d4ff',
      secondaryColor: '#00b8e6',
      texture: 'radial-gradient(circle at 45% 45%, #001f3f 0%, #003366 30%, #004080 60%, #001a33 100%)',
      atmosphere: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.4) 0%, transparent 70%)',
      ringColor: 'rgba(0, 212, 255, 0.5)',
      particleColor: '#00d4ff',
      structures: [
        { type: 'dock', angle: 0, size: 35 },
        { type: 'dock', angle: 90, size: 30 },
        { type: 'dock', angle: 180, size: 32 },
        { type: 'dock', angle: 270, size: 28 },
      ],
    },
    military: {
      primaryColor: '#ff4757',
      secondaryColor: '#ff3838',
      texture: 'radial-gradient(circle at 40% 40%, #4b0000 0%, #8b0000 30%, #a52a2a 60%, #2d0000 100%)',
      atmosphere: 'radial-gradient(circle at center, rgba(255, 71, 87, 0.3) 0%, transparent 70%)',
      ringColor: 'rgba(255, 71, 87, 0.4)',
      particleColor: '#ff4757',
      structures: [
        { type: 'turret', angle: 60, size: 20 },
        { type: 'turret', angle: 180, size: 22 },
        { type: 'shield', angle: 300, size: 40 },
      ],
    },
    manufacturing: {
      primaryColor: '#ffa726',
      secondaryColor: '#ff9800',
      texture: 'radial-gradient(circle at 38% 38%, #3e2723 0%, #5d4037 30%, #6d4c41 60%, #3e2723 100%)',
      atmosphere: 'radial-gradient(circle at center, rgba(255, 167, 38, 0.4) 0%, transparent 70%)',
      ringColor: 'rgba(255, 167, 38, 0.5)',
      particleColor: '#ffa726',
      structures: [
        { type: 'factory', angle: 90, size: 30 },
        { type: 'factory', angle: 210, size: 25 },
        { type: 'pipe', angle: 330, size: 20 },
      ],
    },
  }), []);

  const visual = colonyVisuals[colonyType];

  // Handle mouse movement for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rotation || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Generate particle positions
  const particleElements = useMemo(() => {
    if (!particles) return null;
    
    return Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const radius = sizes.particles / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const delay = i * 0.1;
      
      return (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            backgroundColor: visual.particleColor,
            boxShadow: `0 0 6px ${visual.particleColor}`,
          }}
          animate={{
            x: [x * 0.8, x * 1.2, x * 0.8],
            y: [y * 0.8, y * 1.2, y * 0.8],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
        />
      );
    });
  }, [particles, sizes.particles, visual.particleColor]);

  // Generate structure elements
  const structureElements = useMemo(() => {
    return visual.structures.map((structure, i) => {
      const radian = (structure.angle * Math.PI) / 180;
      const x = Math.cos(radian) * (sizes.planet / 2 + 5);
      const y = Math.sin(radian) * (sizes.planet / 2 + 5);
      
      return (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            width: structure.size,
            height: structure.size,
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle, ${visual.primaryColor} 0%, transparent 70%)`,
              boxShadow: `0 0 10px ${visual.primaryColor}`,
            }}
          />
        </motion.div>
      );
    });
  }, [visual.structures, visual.primaryColor, sizes.planet]);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative cursor-pointer select-none',
        className
      )}
      style={{
        width: sizes.container,
        height: sizes.container,
        perspective: '1000px',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Background glow */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${visual.primaryColor}20 0%, transparent 50%)`,
            filter: 'blur(20px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Particle system */}
      <div className="absolute inset-0">
        {particleElements}
      </div>

      {/* Main planet container */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Orbital ring */}
        {(status === 'trading' || status === 'active') && (
          <motion.div
            className="absolute rounded-full border-2"
            style={{
              width: sizes.ring,
              height: sizes.ring,
              borderColor: visual.ringColor,
              transform: 'rotateX(70deg)',
            }}
            animate={{
              rotateZ: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Planet */}
        <motion.div
          className="relative rounded-full overflow-hidden"
          style={{
            width: sizes.planet,
            height: sizes.planet,
            background: visual.texture,
            boxShadow: `
              inset -10px -10px 20px rgba(0, 0, 0, 0.5),
              0 0 30px ${visual.primaryColor}40,
              0 0 60px ${visual.primaryColor}20
            `,
          }}
          animate={rotation ? {
            rotateY: 360,
          } : undefined}
          transition={rotation ? {
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          } : undefined}
        >
          {/* Atmosphere */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: visual.atmosphere,
              opacity: health / 100,
            }}
          />

          {/* Surface details */}
          <div className="absolute inset-0">
            {structureElements}
          </div>

          {/* Health indicator overlay */}
          {health < 100 && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, transparent ${health}%, rgba(255, 0, 0, 0.3) 100%)`,
              }}
            />
          )}
        </motion.div>

        {/* Status effects */}
        {status === 'critical' && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-500"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

Colony3D.displayName = 'Colony3D';

export default Colony3D;