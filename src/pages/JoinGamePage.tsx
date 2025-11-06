import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SessionCodeInput } from '../components/join/SessionCodeInput';
import { PlayerDataCollection } from '../components/join/PlayerDataCollection';
import { TeamSelector } from '../components/join/TeamSelector';
import { sessionLookupService } from '../services/sessionLookupService';
import { GameService } from '../services/GameService';
import type { 
  SessionLookupResult, 
  PlayerData, 
  AvailableTeam 
} from '../services/sessionLookupService';

type JoinStep = 'session-code' | 'player-data' | 'team-selection';

// Enhanced HUD Panel Component
const HUDPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  color?: 'cyan' | 'purple' | 'green' | 'red' | 'amber';
  animated?: boolean;
}> = ({ children, className = '', color = 'cyan', animated = false }) => {
  const colorMap = {
    cyan: '#00d4ff',
    purple: '#6c5ce7',
    green: '#00ff88',
    red: '#ff4757',
    amber: '#ff9500'
  };

  return (
    <motion.div
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: 'rgba(10, 10, 15, 0.9)',
        border: `1px solid ${colorMap[color]}`,
        borderRadius: '12px',
        padding: '2rem',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Top gradient line */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, ${colorMap[color]}, #ff9500)`
        }}
      />
      
      {/* Corner indicators */}
      <div 
        className="absolute w-3 h-3 border-2"
        style={{
          top: '8px',
          left: '8px',
          borderColor: '#ff9500',
          borderRight: 'none',
          borderBottom: 'none'
        }}
      />
      <div 
        className="absolute w-3 h-3 border-2"
        style={{
          bottom: '8px',
          right: '8px',
          borderColor: '#ff9500',
          borderLeft: 'none',
          borderTop: 'none'
        }}
      />
      
      {/* Scanning line animation */}
      {animated && (
        <motion.div
          className="absolute top-0 left-0 w-full h-0.5 opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorMap[color]}, transparent)`
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
      
      {children}
    </motion.div>
  );
};

export default function JoinGamePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<JoinStep>('session-code');
  const [sessionCode, setSessionCode] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Session lookup result
  const [sessionData, setSessionData] = useState<SessionLookupResult | null>(null);
  
  // Player data
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  
  // Team selection
  const [selectedTeam, setSelectedTeam] = useState<AvailableTeam | null>(null);
  
  // Join success
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Validate session code
  useEffect(() => {
    const validateCode = async () => {
      if (sessionCode.length === 0) {
        setValidationStatus('idle');
        setError('');
        return;
      }

      // Check format
      const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{3}$/.test(sessionCode);
      if (!isValidFormat && sessionCode.length >= 8) {
        setValidationStatus('invalid');
        setError('Invalid format. Use XXXX-YYY');
        return;
      }

      if (sessionCode.length < 8) {
        setValidationStatus('idle');
        return;
      }

      setValidationStatus('validating');
      setError('');

      try {
        const result = await sessionLookupService.lookupByCode(sessionCode);
        
        if (!result) {
          setValidationStatus('invalid');
          setError('Session not found. Please check your code.');
        } else if (result.status === 'expired') {
          setValidationStatus('invalid');
          setError('This session has expired.');
        } else if (result.status === 'full') {
          setValidationStatus('invalid');
          setError('This session is full.');
        } else {
          setValidationStatus('valid');
          setSessionData(result);
        }
      } catch (err) {
        setValidationStatus('invalid');
        setError(err instanceof Error ? err.message : 'Error validating code');
      }
    };

    const debounceTimer = setTimeout(validateCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [sessionCode]);

  const handleContinueFromSessionCode = () => {
    if (validationStatus === 'valid' && sessionData) {
      if (sessionData.requiresPlayerData) {
        setCurrentStep('player-data');
      } else {
        // Skip directly to team selection if no data collection needed
        setCurrentStep('team-selection');
      }
    }
  };

  const handlePlayerDataSubmit = (data: PlayerData) => {
    setPlayerData(data);
    setCurrentStep('team-selection');
  };

  const handleJoinGame = async () => {
    if (!selectedTeam || !sessionData) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Use the player's name from playerData if available, otherwise use a default
      const playerName = playerData?.name || 'Guest Player';
      
      // Join the team
      const result = await GameService.joinTeam(
        sessionData.sessionId,
        selectedTeam.id,
        playerName,
        'member',
        playerData || undefined
      );

      setJoinSuccess(true);
      
      // Navigate to game after a short delay
      setTimeout(() => {
        navigate(`/game/${sessionData.sessionId}/${result.teamId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
      setIsLoading(false);
    }
  };

  const getValidationColor = (): 'cyan' | 'green' | 'red' | 'amber' => {
    switch (validationStatus) {
      case 'valid': return 'green';
      case 'invalid': return 'red';
      case 'validating': return 'amber';
      default: return 'cyan';
    }
  };

  return (
    <div 
      className="relative min-h-screen overflow-hidden flex items-center justify-center"
      style={{ 
        background: '#0a0a0f',
        fontFamily: 'Inter, sans-serif',
        padding: '10vh 10vw' // 10% padding on all sides
      }}
    >
      {/* Animated Background */}
      <div 
        className="fixed inset-0 -z-20"
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(0, 255, 136, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 212, 255, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(108, 92, 231, 0.04) 0%, transparent 50%)
          `
        }}
      />

      {/* Grid Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0, 212, 255, 0.03), rgba(0, 212, 255, 0.03) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, rgba(0, 212, 255, 0.03), rgba(0, 212, 255, 0.03) 1px, transparent 1px, transparent 40px)
          `
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 -z-5 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Cyberpunk Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <HUDPanel color="cyan" className="inline-block px-8 py-4 mb-4">
            <motion.h1 
              className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400"
              style={{ fontFamily: 'Orbitron, monospace' }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              NEXUS ACCESS
            </motion.h1>
          </HUDPanel>
          <motion.p 
            className="text-sm tracking-wider opacity-70"
            style={{ 
              fontFamily: 'SF Mono, monospace',
              color: '#a0a0a0'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.5 }}
          >
            INITIALIZE COLONY CONNECTION PROTOCOL
          </motion.p>
        </motion.div>

        <AnimatePresence mode="wait">
          {currentStep === 'session-code' && (
            <motion.div
              key="session-entry"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.5 }}
            >
              <HUDPanel color={getValidationColor()} animated={validationStatus === 'validating'}>
                <div className="space-y-6">
                  <SessionCodeInput
                    value={sessionCode}
                    onChange={setSessionCode}
                    validationStatus={validationStatus}
                    error={error}
                    disabled={isLoading}
                  />

                  {/* Continue Button */}
                  <AnimatePresence>
                    {validationStatus === 'valid' && (
                      <motion.div 
                        className="pt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                      >
                        <motion.button
                          onClick={handleContinueFromSessionCode}
                          className="w-full px-6 py-3 font-semibold rounded-md relative overflow-hidden transition-all"
                          style={{
                            fontFamily: 'Orbitron, monospace',
                            border: '2px solid #00ff88',
                            background: 'rgba(10, 10, 15, 0.8)',
                            color: '#00ff88'
                          }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="flex items-center justify-center gap-3">
                            <span>PROCEED TO {sessionData?.requiresPlayerData ? 'REGISTRATION' : 'COLONY SELECTION'}</span>
                            <span className="text-xl">→</span>
                          </span>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </HUDPanel>
            </motion.div>
          )}

          {currentStep === 'player-data' && sessionData && (
            <HUDPanel color="purple" animated>
              <PlayerDataCollection
                fields={sessionData.playerDataFields}
                onSubmit={handlePlayerDataSubmit}
                onBack={() => setCurrentStep('session-code')}
                isLoading={isLoading}
              />
            </HUDPanel>
          )}

          {currentStep === 'team-selection' && sessionData && (
            <HUDPanel color="purple" animated>
              <TeamSelector
                teams={sessionData.availableTeams}
                selectedTeam={selectedTeam}
                onSelectTeam={setSelectedTeam}
                onBack={() => setCurrentStep(sessionData.requiresPlayerData ? 'player-data' : 'session-code')}
                onJoin={handleJoinGame}
                isLoading={isLoading}
              />
            </HUDPanel>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && currentStep === 'team-selection' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-4"
            >
              <HUDPanel color="red" className="p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-red-400 text-xl">⚠</span>
                  <p className="text-sm font-mono text-red-400">{error}</p>
                </div>
              </HUDPanel>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <button
            onClick={() => navigate('/')}
            className="text-sm hover:text-cyan-400 transition-colors inline-flex items-center gap-2 group"
            style={{ 
              fontFamily: 'SF Mono, monospace',
              color: '#a0a0a0'
            }}
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>RETURN TO NEXUS</span>
          </button>
        </motion.div>

        {/* Step indicator */}
        <motion.div 
          className="mt-8 flex justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {['session-code', 'player-data', 'team-selection'].map((step, _index) => {
            // Skip player-data step if not required
            if (step === 'player-data' && sessionData && !sessionData.requiresPlayerData) {
              return null;
            }
            
            const isActive = step === currentStep;
            const isPast = 
              (step === 'session-code' && currentStep !== 'session-code') ||
              (step === 'player-data' && currentStep === 'team-selection');
            
            return (
              <div
                key={step}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: isActive ? '#00ff88' : isPast ? '#00d4ff' : 'rgba(255, 255, 255, 0.2)'
                }}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {joinSuccess && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(10, 10, 15, 0.9)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HUDPanel color="green" animated className="p-8">
              <div className="text-center">
                <motion.div 
                  className="text-6xl mb-4"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ✓
                </motion.div>
                <h2 
                  className="text-2xl text-green-400 mb-2"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  CONNECTION ESTABLISHED
                </h2>
                <p 
                  className="text-sm opacity-70"
                  style={{ 
                    fontFamily: 'SF Mono, monospace',
                    color: '#a0a0a0'
                  }}
                >
                  Initializing colony interface...
                </p>
              </div>
            </HUDPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}