import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ParallaxBackgroundProps {
  variant?: 'space' | 'nebula' | 'asteroid' | 'warp';
  particleCount?: number;
  enableParallax?: boolean;
  enableInteraction?: boolean;
  className?: string;
}

/**
 * ParallaxBackground - Advanced space-themed parallax background
 * 
 * Features:
 * - Multiple space variants (nebula, asteroid field, warp)
 * - Parallax scrolling effects
 * - Interactive mouse tracking
 * - Performance-optimized with canvas
 * - Dynamic particle systems
 */
export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({
  variant = 'space',
  particleCount = 100,
  enableParallax = true,
  enableInteraction = true,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<any[]>([]);

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, -100]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);
  const y3 = useTransform(scrollY, [0, 1000], [0, -300]);

  // Initialize canvas and particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Initialize particles based on variant
    const initializeParticles = () => {
      const particles: any[] = [];

      switch (variant) {
        case 'nebula':
          // Nebula clouds
          for (let i = 0; i < 5; i++) {
            particles.push({
              type: 'cloud',
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              size: 200 + Math.random() * 300,
              color: `hsla(${280 + Math.random() * 60}, 70%, 50%, 0.1)`,
              speedX: (Math.random() - 0.5) * 0.1,
              speedY: (Math.random() - 0.5) * 0.1,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.001,
            });
          }
          break;

        case 'asteroid':
          // Asteroid field
          for (let i = 0; i < particleCount / 2; i++) {
            particles.push({
              type: 'asteroid',
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              size: 5 + Math.random() * 20,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.02,
              speedX: (Math.random() - 0.5) * 0.5,
              speedY: Math.random() * 0.2 + 0.1,
              depth: Math.random(),
            });
          }
          break;

        case 'warp':
          // Warp lines
          for (let i = 0; i < particleCount * 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * Math.max(canvas.width, canvas.height);
            particles.push({
              type: 'warpLine',
              startX: canvas.width / 2 + Math.cos(angle) * distance,
              startY: canvas.height / 2 + Math.sin(angle) * distance,
              endX: canvas.width / 2,
              endY: canvas.height / 2,
              speed: 2 + Math.random() * 5,
              opacity: Math.random() * 0.5 + 0.5,
              progress: Math.random(),
            });
          }
          break;

        default:
          // Default space particles
          for (let i = 0; i < particleCount; i++) {
            particles.push({
              type: 'star',
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              size: Math.random() * 3,
              twinkle: Math.random() * Math.PI * 2,
              twinkleSpeed: 0.02 + Math.random() * 0.02,
              speedX: (Math.random() - 0.5) * 0.2,
              speedY: (Math.random() - 0.5) * 0.2,
              depth: Math.random(),
              color: Math.random() > 0.8 ? 
                `hsl(${Math.random() * 60 + 180}, 100%, 80%)` : 
                'white',
            });
          }
      }

      particlesRef.current = particles;
    };

    initializeParticles();

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (!enableInteraction) return;
      mousePosition.current = {
        x: e.clientX - canvas.width / 2,
        y: e.clientY - canvas.height / 2,
      };
    };

    if (enableInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
      );
      
      switch (variant) {
        case 'nebula':
          gradient.addColorStop(0, '#1a0033');
          gradient.addColorStop(0.5, '#330066');
          gradient.addColorStop(1, '#000011');
          break;
        case 'warp':
          gradient.addColorStop(0, '#000033');
          gradient.addColorStop(0.5, '#000066');
          gradient.addColorStop(1, '#000000');
          break;
        default:
          gradient.addColorStop(0, '#0a0a0f');
          gradient.addColorStop(0.5, '#1a1a2e');
          gradient.addColorStop(1, '#0a0a0f');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        if (particle.type === 'star' || particle.type === 'asteroid') {
          const parallaxFactorX = enableParallax ? (1 - particle.depth) * 0.1 : 0;
          const parallaxFactorY = enableParallax ? (1 - particle.depth) * 0.1 : 0;
          
          particle.x += particle.speedX + (mousePosition.current.x * parallaxFactorX * 0.01);
          particle.y += particle.speedY + (mousePosition.current.y * parallaxFactorY * 0.01);

          // Wrap around edges
          if (particle.x < -50) particle.x = canvas.width + 50;
          if (particle.x > canvas.width + 50) particle.x = -50;
          if (particle.y < -50) particle.y = canvas.height + 50;
          if (particle.y > canvas.height + 50) particle.y = -50;
        }

        // Draw based on type
        switch (particle.type) {
          case 'star':
            particle.twinkle += particle.twinkleSpeed;
            const opacity = 0.5 + 0.5 * Math.sin(particle.twinkle);
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = opacity * particle.depth;
            ctx.fill();
            
            // Glow effect
            const glowGradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, particle.size * 3
            );
            glowGradient.addColorStop(0, particle.color);
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.globalAlpha = opacity * particle.depth * 0.3;
            ctx.fillRect(
              particle.x - particle.size * 3,
              particle.y - particle.size * 3,
              particle.size * 6,
              particle.size * 6
            );
            break;

          case 'cloud':
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.rotation += particle.rotationSpeed;
            
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            const cloudGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
            cloudGradient.addColorStop(0, particle.color);
            cloudGradient.addColorStop(0.5, particle.color.replace('0.1', '0.05'));
            cloudGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = cloudGradient;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(-particle.size, -particle.size, particle.size * 2, particle.size * 2);
            ctx.restore();
            break;

          case 'asteroid':
            particle.rotation += particle.rotationSpeed;
            
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.globalAlpha = 0.8 * particle.depth;
            
            // Draw irregular asteroid shape
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const radius = particle.size * (0.7 + Math.random() * 0.3);
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = `hsl(30, 20%, ${30 + particle.depth * 20}%)`;
            ctx.fill();
            ctx.strokeStyle = `hsl(30, 20%, ${20 + particle.depth * 10}%)`;
            ctx.stroke();
            ctx.restore();
            break;

          case 'warpLine':
            particle.progress += particle.speed * 0.01;
            if (particle.progress > 1) {
              particle.progress = 0;
              const angle = Math.random() * Math.PI * 2;
              const distance = Math.random() * Math.max(canvas.width, canvas.height);
              particle.startX = canvas.width / 2 + Math.cos(angle) * distance;
              particle.startY = canvas.height / 2 + Math.sin(angle) * distance;
            }
            
            const lineX = particle.startX + (particle.endX - particle.startX) * particle.progress;
            const lineY = particle.startY + (particle.endY - particle.startY) * particle.progress;
            
            ctx.beginPath();
            ctx.moveTo(lineX, lineY);
            ctx.lineTo(
              lineX + (particle.endX - particle.startX) * 0.1,
              lineY + (particle.endY - particle.startY) * 0.1
            );
            
            const lineGradient = ctx.createLinearGradient(
              lineX, lineY,
              lineX + (particle.endX - particle.startX) * 0.1,
              lineY + (particle.endY - particle.startY) * 0.1
            );
            lineGradient.addColorStop(0, 'transparent');
            lineGradient.addColorStop(0.5, `rgba(0, 212, 255, ${particle.opacity})`);
            lineGradient.addColorStop(1, 'transparent');
            
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1 - particle.progress;
            ctx.stroke();
            break;
        }
        
        ctx.globalAlpha = 1;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (enableInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [variant, particleCount, enableParallax, enableInteraction]);

  return (
    <div className={cn('fixed inset-0 -z-10', className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Parallax layers for additional depth */}
      {enableParallax && (
        <>
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{ y: y1 }}
          >
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          </motion.div>
          
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ y: y2 }}
          >
            <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl" />
          </motion.div>
          
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{ y: y3 }}
          >
            <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
          </motion.div>
        </>
      )}
    </div>
  );
};

ParallaxBackground.displayName = 'ParallaxBackground';

export default ParallaxBackground;