import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  twinkle: number;
  color?: string;
  type?: 'star' | 'nebula' | 'comet';
}

interface ParticleBackgroundProps {
  variant?: 'default' | 'dense' | 'nebula' | 'comet';
  interactive?: boolean;
}

export const ParticleBackground = React.memo<ParticleBackgroundProps>(({ 
  variant = 'default',
  interactive = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particles: Particle[] = [];
      const baseCount = Math.floor((canvas.width * canvas.height) / 8000);
      const particleCount = variant === 'dense' ? baseCount * 2 : baseCount;

      for (let i = 0; i < particleCount; i++) {
        const type = variant === 'comet' && i < 5 ? 'comet' : 
                    variant === 'nebula' && i < 10 ? 'nebula' : 'star';
        
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: type === 'comet' ? Math.random() * 4 + 2 : 
                type === 'nebula' ? Math.random() * 100 + 50 :
                Math.random() * 2 + 0.5,
          speedX: type === 'comet' ? (Math.random() - 0.5) * 2 :
                  (Math.random() - 0.5) * 0.5,
          speedY: type === 'comet' ? (Math.random() - 0.5) * 2 :
                  (Math.random() - 0.5) * 0.5,
          opacity: type === 'nebula' ? 0.1 : Math.random() * 0.8 + 0.2,
          twinkle: Math.random() * Math.PI * 2,
          type,
          color: type === 'star' && Math.random() > 0.7 ? 
                 `hsl(${Math.random() * 60 + 180}, 100%, 80%)` : undefined,
        });
      }

      particlesRef.current = particles;
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
      );
      gradient.addColorStop(0, variant === 'nebula' ? '#1a0033' : '#0a0a0f');
      gradient.addColorStop(0.5, variant === 'nebula' ? '#330066' : '#1a1a2e');
      gradient.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        if (interactive && particle.type === 'star') {
          const dx = mousePosition.current.x - particle.x;
          const dy = mousePosition.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const force = (100 - distance) / 100;
            particle.speedX += (dx / distance) * force * 0.1;
            particle.speedY += (dy / distance) * force * 0.1;
          }
        }
        
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.twinkle += 0.02;

        // Add damping
        particle.speedX *= 0.99;
        particle.speedY *= 0.99;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw based on type
        if (particle.type === 'nebula') {
          // Draw nebula cloud
          const nebulaGradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          );
          nebulaGradient.addColorStop(0, `hsla(${280 + Math.sin(particle.twinkle) * 60}, 70%, 50%, ${particle.opacity})`);
          nebulaGradient.addColorStop(0.5, `hsla(${300 + Math.sin(particle.twinkle) * 40}, 60%, 40%, ${particle.opacity * 0.5})`);
          nebulaGradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = nebulaGradient;
          ctx.fillRect(
            particle.x - particle.size,
            particle.y - particle.size,
            particle.size * 2,
            particle.size * 2
          );
        } else if (particle.type === 'comet') {
          // Draw comet with tail
          const cometGradient = ctx.createLinearGradient(
            particle.x, particle.y,
            particle.x - particle.speedX * 20,
            particle.y - particle.speedY * 20
          );
          cometGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
          cometGradient.addColorStop(0.2, 'rgba(0, 212, 255, 0.8)');
          cometGradient.addColorStop(1, 'transparent');
          
          ctx.strokeStyle = cometGradient;
          ctx.lineWidth = particle.size;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(
            particle.x - particle.speedX * 20,
            particle.y - particle.speedY * 20
          );
          ctx.stroke();
          
          // Bright core
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
          ctx.fillStyle = 'white';
          ctx.fill();
        } else {
          // Draw regular star
          const twinkleOpacity = particle.opacity * (0.5 + 0.5 * Math.sin(particle.twinkle));
          
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
          
          // Outer glow
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
          );
          // Helper to add opacity to color
          const addOpacityToColor = (color: string, opacity: number) => {
            if (color.startsWith('hsl')) {
              return color.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`);
            }
            return color; // If it's already rgba or other format
          };
          
          gradient.addColorStop(0, particle.color ? particle.color : `rgba(0, 212, 255, ${twinkleOpacity * 0.8})`);
          gradient.addColorStop(0.4, particle.color ? addOpacityToColor(particle.color, 0.53) : `rgba(0, 212, 255, ${twinkleOpacity * 0.4})`);
          gradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = gradient;
          ctx.fill();

          // Inner bright core
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(255, 255, 255, ${twinkleOpacity})`;
          ctx.fill();
        }
      });
    };

    const animate = () => {
      drawParticles();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    createParticles();
    animate();

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };

    // Handle mouse movement for interactivity
    const handleMouseMove = (e: MouseEvent) => {
      if (interactive) {
        mousePosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener('resize', handleResize);
    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [variant, interactive]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{ background: 'transparent' }}
      />
      
      {/* Additional nebula effects for nebula variant */}
      {variant === 'nebula' && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(108, 92, 231, 0.2) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}
    </>
  );
});