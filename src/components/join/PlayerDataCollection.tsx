import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerDataField, PlayerData } from '../../services/sessionLookupService';

interface PlayerDataCollectionProps {
  fields: PlayerDataField[];
  onSubmit: (data: PlayerData) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export const PlayerDataCollection: React.FC<PlayerDataCollectionProps> = ({
  fields,
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form data
  useEffect(() => {
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      initialData[field.id] = '';
    });
    setFormData(initialData);
  }, [fields]);

  const validateField = (field: PlayerDataField, value: any): string | null => {
    // Required field check
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    // Type-specific validation
    switch (field.type) {
      case 'text':
        if (field.validation) {
          if (field.validation.minLength && value.length < field.validation.minLength) {
            return `Must be at least ${field.validation.minLength} characters`;
          }
          if (field.validation.maxLength && value.length > field.validation.maxLength) {
            return `Must be no more than ${field.validation.maxLength} characters`;
          }
        }
        break;

      case 'email':
        if (value && field.validation?.pattern) {
          const pattern = new RegExp(field.validation.pattern);
          if (!pattern.test(value)) {
            return 'Please enter a valid email address';
          }
        }
        break;

      case 'number':
        const numValue = parseFloat(value);
        if (value && isNaN(numValue)) {
          return 'Must be a number';
        }
        if (field.validation) {
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            return `Must be at least ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            return `Must be no more than ${field.validation.max}`;
          }
        }
        break;
    }

    return null;
  };

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Validate on change if field has been touched
    if (touched[fieldId]) {
      const field = fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({
          ...prev,
          [fieldId]: error || ''
        }));
      }
    }
  };

  const handleBlur = (fieldId: string) => {
    setTouched(prev => ({ ...prev, [fieldId]: true }));
    
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const error = validateField(field, formData[fieldId]);
      setErrors(prev => ({
        ...prev,
        [fieldId]: error || ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;
    
    fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
        hasErrors = true;
      }
    });
    
    setErrors(newErrors);
    setTouched(fields.reduce((acc, field) => ({ ...acc, [field.id]: true }), {}));
    
    if (!hasErrors) {
      onSubmit(formData as PlayerData);
    }
  };

  const renderField = (field: PlayerDataField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];
    const isTouched = touched[field.id];
    const showError = error && isTouched;

    return (
      <motion.div
        key={field.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <label 
          className="block text-xs mb-2 tracking-wider uppercase"
          style={{ 
            fontFamily: 'SF Mono, monospace',
            color: showError ? '#ff4757' : '#00d4ff'
          }}
        >
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>

        {field.type === 'select' && field.options ? (
          <select
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field.id)}
            className="w-full px-4 py-3 text-white transition-all duration-300 focus:outline-none"
            style={{
              background: 'rgba(10, 10, 15, 0.5)',
              border: `2px solid ${showError ? '#ff4757' : 'rgba(0, 212, 255, 0.3)'}`,
              fontFamily: 'SF Mono, monospace',
              borderRadius: '0px'
            }}
          >
            <option value="" style={{ background: '#0a0a0f' }}>
              Select {field.label}
            </option>
            {field.options.map(option => (
              <option key={option} value={option} style={{ background: '#0a0a0f' }}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field.id)}
            placeholder={field.placeholder}
            className="w-full px-4 py-3 text-white placeholder-gray-500 transition-all duration-300 focus:outline-none"
            style={{
              background: 'rgba(10, 10, 15, 0.5)',
              border: `2px solid ${showError ? '#ff4757' : 'rgba(0, 212, 255, 0.3)'}`,
              fontFamily: 'SF Mono, monospace',
              borderRadius: '0px'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = showError ? '#ff4757' : '#00d4ff';
              e.currentTarget.style.boxShadow = `0 0 0 2px ${showError ? '#ff4757' : '#00d4ff'}33`;
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = showError ? '#ff4757' : 'rgba(0, 212, 255, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        )}

        {/* Error message */}
        <AnimatePresence>
          {showError && (
            <motion.div
              className="absolute -bottom-5 left-0 text-xs text-red-400"
              style={{ fontFamily: 'SF Mono, monospace' }}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 
          className="text-2xl text-purple-400 mb-2"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          PILOT REGISTRATION
        </h2>
        <p 
          className="text-sm opacity-70"
          style={{ 
            fontFamily: 'SF Mono, monospace',
            color: '#a0a0a0'
          }}
        >
          Complete your profile to join the mission
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map(renderField)}

        <div className="flex gap-4 pt-6">
          {onBack && (
            <motion.button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1 px-6 py-3 font-semibold rounded-md relative overflow-hidden transition-all"
              style={{
                fontFamily: 'Orbitron, monospace',
                border: '2px solid #00d4ff',
                background: 'rgba(10, 10, 15, 0.8)',
                color: '#00d4ff',
                opacity: isLoading ? 0.5 : 1
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              ← BACK
            </motion.button>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 font-semibold rounded-md relative overflow-hidden transition-all"
            style={{
              fontFamily: 'Orbitron, monospace',
              border: '2px solid #00ff88',
              background: 'rgba(10, 10, 15, 0.8)',
              color: '#00ff88',
              opacity: isLoading ? 0.5 : 1
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                PROCESSING...
              </motion.span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <span>CONTINUE</span>
                <span className="text-xl">→</span>
              </span>
            )}
          </motion.button>
        </div>
      </form>

      {/* Privacy notice */}
      <div 
        className="text-xs text-center opacity-50 mt-4"
        style={{ 
          fontFamily: 'SF Mono, monospace',
          color: '#a0a0a0'
        }}
      >
        Your data is used only for this session and reporting purposes
      </div>
    </motion.div>
  );
};