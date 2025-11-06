import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (isValid: boolean) => void;
  validationStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  error?: string;
  disabled?: boolean;
}

export const SessionCodeInput: React.FC<SessionCodeInputProps> = ({
  value,
  onChange,
  onValidate,
  validationStatus,
  error,
  disabled = false
}) => {
  const [focused, setFocused] = useState(false);
  
  // Auto-format session code as user types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.toUpperCase();
    const cleaned = input.replace(/[^A-Z0-9]/g, '');
    
    // Format as XXXX-YYY
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}`;
    }
    
    onChange(formatted);
  };

  // Validate format
  useEffect(() => {
    if (onValidate) {
      const isValid = /^[A-Z0-9]{4}-[A-Z0-9]{3}$/.test(value);
      onValidate(isValid);
    }
  }, [value, onValidate]);

  const getStatusColor = () => {
    switch (validationStatus) {
      case 'valid': return '#00ff88';
      case 'invalid': return '#ff4757';
      case 'validating': return '#ff9500';
      default: return '#00d4ff';
    }
  };

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'valid': return '✓';
      case 'invalid': return '✗';
      case 'validating': return '...';
      default: return null;
    }
  };

  return (
    <div className="relative">
      <label 
        className="block text-xs mb-2 tracking-wider uppercase"
        style={{ 
          fontFamily: 'SF Mono, monospace',
          color: '#00d4ff'
        }}
      >
        Session Access Code
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="XXXX-YYY"
          disabled={disabled}
          className="w-full px-6 py-4 text-white placeholder-gray-500 text-2xl text-center tracking-widest transition-all duration-300 focus:outline-none"
          style={{
            background: 'rgba(10, 10, 15, 0.5)',
            border: `2px solid ${focused ? getStatusColor() : 'rgba(0, 212, 255, 0.3)'}`,
            fontFamily: 'SF Mono, monospace',
            borderRadius: '0px',
            opacity: disabled ? 0.5 : 1,
            boxShadow: focused ? `0 0 0 2px ${getStatusColor()}33` : 'none'
          }}
          maxLength={8}
          autoComplete="off"
          spellCheck={false}
        />
        
        {/* Animated border effect */}
        <motion.div
          className="absolute inset-0 border-2 pointer-events-none"
          style={{ 
            borderColor: getStatusColor(),
            borderRadius: '0px'
          }}
          animate={{ 
            opacity: validationStatus === 'validating' ? [0.2, 0.6, 0.2] : 0.3
          }}
          transition={{ 
            duration: 2, 
            repeat: validationStatus === 'validating' ? Infinity : 0 
          }}
        />
        
        {/* Status indicator */}
        <AnimatePresence>
          {validationStatus !== 'idle' && (
            <motion.div 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold"
              style={{ color: getStatusColor() }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {getStatusIcon()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanning line animation when validating */}
        {validationStatus === 'validating' && (
          <motion.div
            className="absolute top-0 left-0 w-full h-0.5 opacity-70"
            style={{
              background: `linear-gradient(90deg, transparent, ${getStatusColor()}, transparent)`
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
      
      {/* Format hint */}
      <div className="mt-2 flex items-center justify-between">
        <div 
          className="text-xs opacity-70"
          style={{ 
            fontFamily: 'SF Mono, monospace',
            color: '#a0a0a0'
          }}
        >
          Format: <span className="text-cyan-400">XXXX-YYY</span>
        </div>
        
        {/* Validation feedback */}
        <AnimatePresence>
          {validationStatus === 'valid' && (
            <motion.div 
              className="text-xs font-mono text-green-400"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              SESSION FOUND
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-2 text-xs text-red-400"
            style={{ fontFamily: 'SF Mono, monospace' }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info box */}
      <motion.div 
        className="mt-4 p-3 rounded border border-cyan-400/30 bg-cyan-400/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div 
          className="text-xs space-y-1"
          style={{ 
            fontFamily: 'SF Mono, monospace',
            color: '#a0a0a0'
          }}
        >
          <div>• Event Code: First 4 characters (e.g., DEMO)</div>
          <div>• Galaxy Code: Last 3 characters (e.g., 123)</div>
          <div>• Get your code from the event facilitator</div>
        </div>
      </motion.div>
    </div>
  );
};