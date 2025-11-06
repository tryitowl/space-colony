import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminAuthService } from '../services/adminAuthService';

// Enhanced Animated Voice Print Component - matching HTML version exactly
const VoicePrintAnimation: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div 
      className="relative flex justify-center p-8 rounded-xl border"
      style={{
        background: 'rgba(0, 212, 255, 0.05)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        marginBottom: '2rem'
      }}
    >
      {/* Scanning line effect */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)'
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
      
      <svg
        className="voice-waveform"
        width="300"
        height="80"
        viewBox="0 0 300 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left side bars */}
        {[10, 20, 30, 40, 50, 60, 70, 80].map((x, i) => {
          const baseHeight = 20 + (i * 3);
          const maxHeight = baseHeight + 15;
          return (
            <motion.rect
              key={`left-${i}`}
              x={x}
              width="3"
              rx="1.5"
              fill="#00d4ff"
              style={{ filter: 'drop-shadow(0 0 5px #00d4ff)' }}
              initial={{ height: 20, y: 30 }}
              animate={isActive ? {
                height: [baseHeight, maxHeight, baseHeight],
                y: [40 - baseHeight/2, 40 - maxHeight/2, 40 - baseHeight/2]
              } : {
                height: 20,
                y: 30
              }}
              transition={{
                duration: 1.5,
                repeat: isActive ? Infinity : 0,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          );
        })}

        {/* Center active bars */}
        <motion.rect
          x="140"
          y="10"
          width="4"
          height="60"
          rx="2"
          fill="#ff9500"
          className="waveform-bar active"
          style={{ filter: 'drop-shadow(0 0 10px #ff9500)' }}
          animate={isActive ? {
            height: [60, 75, 60],
            y: [10, 2.5, 10]
          } : {
            height: 60,
            y: 10
          }}
          transition={{
            duration: 0.7,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        <motion.rect
          x="150"
          y="5"
          width="4"
          height="70"
          rx="2"
          fill="#ff9500"
          className="waveform-bar active"
          style={{ filter: 'drop-shadow(0 0 10px #ff9500)' }}
          animate={isActive ? {
            height: [70, 78, 70],
            y: [5, 1, 5]
          } : {
            height: 70,
            y: 5
          }}
          transition={{
            duration: 0.6,
            repeat: isActive ? Infinity : 0,
            delay: 0.1,
            ease: "easeInOut"
          }}
        />

        {/* Right side bars */}
        {[210, 220, 230, 240, 250, 260, 270, 280].map((x, i) => {
          const baseHeight = 25 + (i * 2);
          const maxHeight = baseHeight + 20;
          return (
            <motion.rect
              key={`right-${i}`}
              x={x}
              width="3"
              rx="1.5"
              fill="#00d4ff"
              style={{ filter: 'drop-shadow(0 0 5px #00d4ff)' }}
              initial={{ height: 30, y: 25 }}
              animate={isActive ? {
                height: [baseHeight, maxHeight, baseHeight],
                y: [40 - baseHeight/2, 40 - maxHeight/2, 40 - baseHeight/2]
              } : {
                height: 30,
                y: 25
              }}
              transition={{
                duration: 1.4,
                repeat: isActive ? Infinity : 0,
                delay: 0.5 + (i * 0.08),
                ease: "easeInOut"
              }}
            />
          );
        })}
      </svg>
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(15px)'
        }}
        animate={isActive ? {
          opacity: [0.3, 0.7, 0.3]
        } : {
          opacity: 0.2
        }}
        transition={{
          duration: 2,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

// Loading overlay component
const LoadingOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'rgba(10, 10, 15, 0.9)' }}
      >
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <motion.div
              className="absolute inset-0 border-3 rounded-full"
              style={{
                border: '3px solid rgba(0, 212, 255, 0.3)',
                borderTopColor: '#00d4ff'
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <motion.div
            className="text-lg font-bold tracking-wider"
            style={{
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff',
              letterSpacing: '0.1em'
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            AUTHENTICATING ACCESS...
          </motion.div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const CyberpunkAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clearanceCode, setClearanceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  // const [currentTime, setCurrentTime] = useState(''); // Removed unused variable
  const navigate = useNavigate();

  // Removed unused time display effect

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsVoiceActive(true);

    try {
      const success = await AdminAuthService.adminLogin(email, password);
      
      if (success) {
        // Animate success before navigation
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        setError('ACCESS DENIED - Invalid credentials detected');
        setIsVoiceActive(false);
      }
    } catch (error) {
      setError('SYSTEM ERROR - Authentication protocol failed');
      setIsVoiceActive(false);
    } finally {
      setTimeout(() => setIsLoading(false), 1500);
    }
  };

  const fillTestCredentials = () => {
    const creds = AdminAuthService.getHardcodedCredentials();
    setEmail(creds.email);
    setPassword(creds.password);
  };

  const handleTypingEffect = () => {
    if (!email) {
      let i = 0;
      const text = 'admin@spacecolony.test';
      const type = () => {
        if (i < text.length) {
          setEmail(text.substring(0, i + 1));
          i++;
          setTimeout(type, 80);
        }
      };
      type();
    }
  };

  return (
    <div 
      className="relative min-h-screen overflow-hidden"
      style={{ 
        background: '#0a0a0f',
        padding: '10vh 10vw' // 10% padding on all sides
      }}
    >
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

      {/* Technical Grid Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0, 212, 255, 0.02), rgba(0, 212, 255, 0.02) 1px, transparent 1px, transparent 50px),
            repeating-linear-gradient(90deg, rgba(0, 212, 255, 0.02), rgba(0, 212, 255, 0.02) 1px, transparent 1px, transparent 50px)
          `
        }}
      />

      {/* HUD Corner Elements */}
      <div className="fixed top-8 left-8 w-10 h-10 border-2 border-b-0 border-r-0 opacity-40" style={{ borderColor: '#00d4ff' }} />
      <div className="fixed top-8 right-8 w-10 h-10 border-2 border-b-0 border-l-0 opacity-40" style={{ borderColor: '#00d4ff' }} />
      <div className="fixed bottom-8 left-8 w-10 h-10 border-2 border-t-0 border-r-0 opacity-40" style={{ borderColor: '#00d4ff' }} />
      <div className="fixed bottom-8 right-8 w-10 h-10 border-2 border-t-0 border-l-0 opacity-40" style={{ borderColor: '#00d4ff' }} />

      {/* Main Container */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginTop: '-4rem' }}
        >
          <h1 
            className="font-black text-white mb-4"
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 900,
              textShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
              letterSpacing: '0.2em'
            }}
          >
            ADMIN ACCESS
          </h1>
          <div 
            className="mb-2"
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: '1rem',
              color: '#a0a0a0',
              letterSpacing: '0.1em'
            }}
          >
            QUANTUM SECURITY PROTOCOL v3.7
          </div>
          <div 
            className="relative inline-block"
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: '1.2rem',
              color: '#00d4ff',
              letterSpacing: '0.15em'
            }}
          >
            {/* Decorative lines */}
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-current"
              style={{ width: '50px', left: '-70px' }}
            />
            <div 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-current"
              style={{ width: '50px', right: '-70px' }}
            />
            VOICE AUTHENTICATION SYSTEM
          </div>
        </motion.div>

        {/* Login Panel */}
        <motion.div 
          className="relative rounded-2xl overflow-hidden backdrop-blur-md"
          style={{ 
            background: 'rgba(10, 10, 15, 0.95)',
            border: '2px solid #00d4ff',
            boxShadow: '0 0 50px rgba(0, 212, 255, 0.2), inset 0 0 30px rgba(0, 212, 255, 0.05)',
            maxWidth: '500px',
            width: '100%'
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Corner Decorations */}
          <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: '#ff9500' }} />
          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: '#ff9500' }} />
          <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: '#ff9500' }} />
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: '#ff9500' }} />

          <div className="p-12">
            {/* Voice Print Animation */}
            <VoicePrintAnimation isActive={isVoiceActive || isLoading} />

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-8">
              <div>
                <label 
                  className="block mb-2"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#00d4ff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    paddingLeft: '2em'
                  }}
                >
                  ADMIN IDENTIFIER
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@spacecolony.test"
                  className="w-full px-6 py-6 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all duration-300 flex items-center"
                  style={{
                    background: 'rgba(10, 10, 15, 0.8)',
                    border: '2px solid #00d4ff',
                    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                    fontSize: '1rem'
                  }}
                  onFocus={(e) => {
                    handleTypingEffect();
                    e.target.style.borderColor = '#ff9500';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 149, 0, 0.2), 0 0 20px rgba(255, 149, 0, 0.3)';
                    e.target.style.textShadow = '0 0 5px #ff9500';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#00d4ff';
                    e.target.style.boxShadow = 'none';
                    e.target.style.textShadow = 'none';
                  }}
                  required
                />
              </div>

              <div>
                <label 
                  className="block mb-2"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#00d4ff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    paddingLeft: '2em'
                  }}
                >
                  QUANTUM PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter quantum key"
                  className="w-full px-6 py-6 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all duration-300 flex items-center"
                  style={{
                    background: 'rgba(10, 10, 15, 0.8)',
                    border: '2px solid #00d4ff',
                    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                    fontSize: '1rem'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ff9500';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 149, 0, 0.2), 0 0 20px rgba(255, 149, 0, 0.3)';
                    e.target.style.textShadow = '0 0 5px #ff9500';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#00d4ff';
                    e.target.style.boxShadow = 'none';
                    e.target.style.textShadow = 'none';
                  }}
                  required
                />
              </div>

              {/* Security Clearance */}
              <div className="text-center">
                <label 
                  className="block mb-4"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '0.9rem',
                    color: '#00d4ff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    paddingLeft: '2em'
                  }}
                >
                  SECURITY CLEARANCE
                </label>
                <input
                  type="text"
                  value={clearanceCode}
                  onChange={(e) => setClearanceCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Enter clearance code"
                  className="w-48 px-4 py-4 text-center rounded-md text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #6c5ce7',
                    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                    letterSpacing: '0.2em'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ff9500';
                    e.target.style.boxShadow = '0 0 15px rgba(108, 92, 231, 0.4)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#6c5ce7';
                    e.target.style.boxShadow = 'none';
                  }}
                  maxLength={8}
                />
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-lg border"
                    style={{
                      background: 'rgba(255, 71, 87, 0.1)',
                      borderColor: 'rgba(255, 71, 87, 0.4)'
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-red-400">⚠️</span>
                      <p 
                        className="text-sm text-red-400"
                        style={{ fontFamily: 'SF Mono, Monaco, Consolas, monospace' }}
                      >
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full relative px-8 py-6 rounded-xl overflow-hidden transition-all group"
                style={{ 
                  background: 'rgba(10, 10, 15, 0.8)',
                  border: '2px solid #00ff88',
                  color: '#00ff88',
                  fontFamily: 'Orbitron, monospace',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 10px 30px rgba(0, 255, 136, 0.4)'
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Scanning Line Animation */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #00ff88, transparent)'
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
                
                {/* Button Text */}
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  <span>🔒</span>
                  <span>{isLoading ? 'AUTHENTICATING...' : 'INITIATE ACCESS'}</span>
                </span>
              </motion.button>
            </form>

            {/* Test Credentials */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(0, 212, 255, 0.2)' }}>
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full text-center"
                style={{
                  fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                  fontSize: '0.75rem',
                  color: '#666666',
                  letterSpacing: '0.05em'
                }}
              >
                <span className="inline-flex items-center space-x-1 hover:text-blue-400 transition-colors">
                  <span>{showCredentials ? '▲' : '▼'}</span>
                  <span>TESTING PROTOCOL {showCredentials ? 'ACTIVE' : 'AVAILABLE'}</span>
                </span>
              </button>
              
              <AnimatePresence>
                {showCredentials && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 rounded-lg border"
                    style={{
                      background: 'rgba(0, 212, 255, 0.05)',
                      borderColor: 'rgba(0, 212, 255, 0.3)'
                    }}
                  >
                    <div 
                      className="rounded p-3 mb-3 border"
                      style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderColor: 'rgba(0, 212, 255, 0.2)'
                      }}
                    >
                      <div 
                        className="space-y-1"
                        style={{
                          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div className="flex justify-between">
                          <span style={{ color: '#666666' }}>ID:</span>
                          <span style={{ color: '#00d4ff' }}>admin@spacecolony.test</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: '#666666' }}>CODE:</span>
                          <span style={{ color: '#00d4ff' }}>admin123</span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      onClick={fillTestCredentials}
                      className="w-full px-4 py-2 rounded border transition-all"
                      style={{
                        background: 'rgba(0, 212, 255, 0.1)',
                        borderColor: 'rgba(0, 212, 255, 0.4)',
                        color: '#00d4ff',
                        fontFamily: 'Orbitron, monospace',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                      }}
                      whileHover={{ 
                        backgroundColor: 'rgba(0, 212, 255, 0.2)',
                        borderColor: '#00d4ff'
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      📝 AUTO-INJECT CREDENTIALS
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Indicators */}
            <div className="mt-8 flex justify-between text-xs">
              <div className="flex items-center space-x-2">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#00ff88' }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span style={{ color: '#a0a0a0', fontFamily: 'SF Mono, Monaco, Consolas, monospace' }}>
                  Quantum Secure
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#ff9500' }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <span style={{ color: '#a0a0a0', fontFamily: 'SF Mono, Monaco, Consolas, monospace' }}>
                  Neural Link
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#00d4ff' }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <span style={{ color: '#a0a0a0', fontFamily: 'SF Mono, Monaco, Consolas, monospace' }}>
                  Voice Active
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back Navigation */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg transition-all"
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: '0.875rem',
              color: '#ffffff',
              letterSpacing: '0.05em',
              background: 'rgba(255, 149, 0, 0.8)',
              border: '2px solid #ff9500'
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 10px 30px rgba(255, 149, 0, 0.3)',
              background: 'rgba(255, 149, 0, 1)'
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span>←</span>
            <span>RETURN TO MAIN INTERFACE</span>
          </motion.button>
        </motion.div>
      </div>

      {/* System Status Footer */}
      <div 
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 text-center opacity-70"
        style={{
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          fontSize: '0.625rem',
          letterSpacing: '0.1em',
          color: '#666666'
        }}
      >
        <span style={{ color: '#00d4ff' }}>SCE_ADMIN_v3.7 | </span>
        <span style={{ color: '#ff9500' }}>NEURAL_INTERFACE_ENABLED | </span>
        QUANTUM_ENCRYPTION_ACTIVE
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} />
    </div>
  );
};