import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

export const CyberpunkLanding: React.FC = () => {
  const navigate = useNavigate();
  const starsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create animated stars
    const createStars = () => {
      const starsContainer = starsContainerRef.current;
      if (!starsContainer) return;

      const numStars = 80;
      const _stars: Star[] = [];

      for (let i = 0; i < numStars; i++) {
        _stars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          delay: Math.random() * 4
        });
      }

      return _stars;
    };

    createStars();
    
    // Cleanup
    return () => {
      if (starsContainerRef.current) {
        starsContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Animated Background */}
      <div 
        className="fixed inset-0 -z-20"
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(0, 255, 136, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 212, 255, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(108, 92, 231, 0.06) 0%, transparent 50%)
          `
        }}
      />

      {/* Stars Container */}
      <div ref={starsContainerRef} className="fixed inset-0 -z-10">
        {[...Array(80)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* HUD Corner Elements */}
      <div className="fixed top-5 left-5 w-8 h-8 border-2 border-t-0 border-r-0 opacity-30" style={{ borderColor: '#00d4ff' }} />
      <div className="fixed top-5 right-5 w-8 h-8 border-2 border-t-0 border-l-0 opacity-30" style={{ borderColor: '#00d4ff' }} />
      <div className="fixed bottom-5 left-5 w-8 h-8 border-2 border-b-0 border-r-0 opacity-30" style={{ borderColor: '#00d4ff' }} />
      <div className="fixed bottom-5 right-5 w-8 h-8 border-2 border-b-0 border-l-0 opacity-30" style={{ borderColor: '#00d4ff' }} />

      {/* Main Container - Adjusted for viewport */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Hero Section with Quantum Frame */}
        <motion.div 
          className="relative mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Quantum Frame Container - Responsive Size */}
          <div className="relative flex items-center justify-center" style={{ width: '500px', height: '500px' }}>
            {/* Octagonal Frame - Fixed Visibility */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 500 500"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.5))' }}
            >
              <motion.polygon
                points="150,0 350,0 500,150 500,350 350,500 150,500 0,350 0,150"
                fill="none"
                stroke="#00d4ff"
                strokeWidth="2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 1 }}
              />
            </svg>

            {/* Rotating Inner Frame - Fixed Visibility */}
            <motion.svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 500 500"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255, 149, 0, 0.4))' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6, rotate: 360 }}
              transition={{ 
                opacity: { duration: 1 },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
            >
              <polygon
                points="160,10 340,10 490,160 490,340 340,490 160,490 10,340 10,160"
                fill="none"
                stroke="#ff9500"
                strokeWidth="1"
              />
            </motion.svg>

            {/* Corner Indicators - Positioned on the frame */}
            {[
              { top: '15%', left: '15%' },
              { top: '15%', right: '15%' },
              { bottom: '15%', left: '15%' },
              { bottom: '15%', right: '15%' },
              { top: '0', left: '50%', transform: 'translateX(-50%)' },
              { bottom: '0', left: '50%', transform: 'translateX(-50%)' },
              { left: '0', top: '50%', transform: 'translateY(-50%)' },
              { right: '0', top: '50%', transform: 'translateY(-50%)' },
            ].map((style, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-sm"
                style={{ ...style, backgroundColor: '#ff9500' }}
              />
            ))}

            {/* Hero Content - Centered within frame */}
            <div className="relative z-10 text-center">
              <motion.h1 
                className="font-bold text-white leading-none"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 'clamp(4rem, 8vw, 8rem)',
                  fontWeight: 900,
                  textShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
                  letterSpacing: '0.1em',
                  marginBottom: '-0.15em'
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                SPACE
              </motion.h1>
              <motion.h2 
                className="text-[#ff9500]"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  fontWeight: 500,
                  textShadow: '0 0 20px rgba(255, 149, 0, 0.5)',
                  letterSpacing: '0.2em'
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                COLONY
              </motion.h2>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons - Increased Spacing */}
        <motion.div 
          className="flex flex-wrap justify-center gap-12 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <CyberpunkButton
            onClick={() => navigate('/join')}
            variant="primary"
          >
            Access with Game Code
          </CyberpunkButton>
          <CyberpunkButton
            onClick={() => navigate('/demo')}
            variant="default"
          >
            Watch Demo
          </CyberpunkButton>
          <CyberpunkButton
            onClick={() => navigate('/about')}
            variant="secondary"
          >
            Whom is it for?
          </CyberpunkButton>
        </motion.div>

        {/* Admin Login Section - Vertical Layout, Triple Height */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
        >
          <div 
            className="relative inline-block cursor-pointer group"
            onClick={() => navigate('/admin/login')}
          >
            {/* Security Lock Container - Fixed Width and Proper Alignment */}
            <div 
              className="relative flex flex-col items-center justify-center bg-[rgba(10,10,15,0.95)] border-2 rounded-xl transition-all group-hover:translate-y-[-2px]"
              style={{ 
                borderColor: '#00d4ff',
                boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)',
                width: '180px',
                height: '100px',
                padding: '15px'
              }}
            >
              {/* Corner Decorations */}
              <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-2 border-l-2" style={{ borderColor: '#ff9500' }} />
              <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-2 border-r-2" style={{ borderColor: '#ff9500' }} />
              
              {/* Lock Indicator - Top Right */}
              <motion.div 
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#ff9500' }}
                animate={{ 
                  opacity: [1, 0.5, 1], 
                  scale: [1, 1.2, 1] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Circular Animation Container - 50px diameter */}
              <div className="relative flex items-center justify-center" style={{ width: '50px', height: '50px', marginBottom: '10px' }}>
                {/* Rotating Circle - 50px diameter */}
                <motion.div 
                  className="absolute border rounded-full"
                  style={{ 
                    width: '50px',
                    height: '50px',
                    top: '0',
                    left: '0',
                    borderColor: '#00d4ff',
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent'
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                {/* Lock Icon - Properly centered with flex */}
                <motion.div 
                  className="flex items-center justify-center"
                  style={{ 
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    border: '2px solid #00d4ff',
                    backgroundColor: 'rgba(0,212,255,0.1)',
                    position: 'relative',
                    zIndex: 1
                  }}
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <span className="text-lg">🔒</span>
                </motion.div>
              </div>
              
              {/* Text - Below the animation */}
              <div 
                className="text-white uppercase text-center"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  lineHeight: 1
                }}
              >
                Admin Login
              </div>
            </div>

            {/* Hover Glow Effect */}
            <div 
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl"
              style={{
                background: 'radial-gradient(circle, rgba(0,212,255,0.4) 0%, transparent 70%)'
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Technical Details Footer */}
      <div 
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 text-[#a0a0a0] opacity-70 text-center"
        style={{
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          fontSize: '0.75rem'
        }}
      >
        <span style={{ color: '#00d4ff' }}>TRYITOWL_SCE_v2.1 | </span>
        QUANTUM_SECURE | NEURAL_LINK_ENABLED
      </div>
    </div>
  );
};

// Cyberpunk Button Component
interface CyberpunkButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'secondary';
}

const CyberpunkButton: React.FC<CyberpunkButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'default' 
}) => {
  const colors = {
    default: '#00d4ff',
    primary: '#00ff88',
    secondary: '#ff9500'
  };

  const color = colors[variant];

  return (
    <motion.button
      className="relative px-8 py-4 min-w-[200px] text-center bg-[rgba(10,10,15,0.9)] border-2 rounded-lg overflow-hidden transition-all group"
      style={{ 
        borderColor: color,
        color: variant === 'default' ? '#ffffff' : color,
        fontFamily: 'Orbitron, monospace',
        fontWeight: 600,
        fontSize: '1rem'
      }}
      onClick={onClick}
      whileHover={{ 
        y: -3,
        boxShadow: `0 10px 30px ${color}33`,
        borderColor: variant === 'default' ? '#ff9500' : color
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Scanning Line Animation */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`
        }}
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Hover Glow */}
      <div 
        className="absolute -inset-0.5 rounded-lg opacity-0 group-hover:opacity-30 transition-opacity -z-10"
        style={{
          background: `linear-gradient(45deg, ${color}, transparent, ${variant === 'default' ? '#ff9500' : color})`
        }}
      />
      
      {/* Text with Hover Shadow */}
      <span className="relative z-10 group-hover:drop-shadow-[0_0_10px_currentColor] transition-all">
        {children}
      </span>
    </motion.button>
  );
};