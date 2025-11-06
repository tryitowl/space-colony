/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary theme colors from PRD 2
        'space-black': '#0a0a0f',
        'space-blue': '#1a1a2e',
        'space-blue-40': '#1a1a2e40',
        'cyan-primary': '#00d4ff',
        'purple-secondary': '#6c5ce7',
        'success-green': '#00ff88',
        'warning-orange': '#ff9500',
        'danger-red': '#ff4757',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        
        // Colony type colors
        'colony-mining': '#FCD34D',
        'colony-agricultural': '#34D399',
        'colony-research': '#60A5FA',
        'colony-trade': '#A78BFA',
        'colony-military': '#EF4444',
        'colony-manufacturing': '#F97316',
        
        // HUD-style colors
        'hud-cyan': '#00d4ff',
        'hud-blue': '#3a86ff',
        'hud-amber': '#ff9500',
        'hud-red': '#ff4757',
        'hud-green': '#00ff88',
        'hud-purple': '#6c5ce7',
        'hud-indigo': '#4b6cb7',
        'hud-dark': '#0a0a0f',
        'hud-dark-blue': '#1a1a2e',
        'hud-grid': '#1a1a2e80',
        'hud-glow-cyan': 'rgba(0, 212, 255, 0.6)',
        'hud-glow-amber': 'rgba(255, 149, 0, 0.6)',
        'hud-glow-blue': 'rgba(58, 134, 255, 0.6)',
        
        // Legacy neon colors (keeping for backwards compatibility)
        'neon-green': '#22D3EE',
        'neon-pink': '#F472B6',
        'neon-orange': '#FB923C',
        
        // Status colors for UI components
        'status-success': '#00ff88',
        'status-warning': '#ff9500',
        'status-danger': '#ff4757',
        'status-info': '#00d4ff',
        
        // Additional theme colors
        'accent-primary': '#00d4ff',
        'accent-secondary': '#6c5ce7',
        'panel-bg': 'rgba(26, 26, 46, 0.4)',
        'panel-border': 'rgba(255, 255, 255, 0.1)',
        
        // Alias colors for consistency
        'space-cyan': '#00d4ff',
        'space-purple': '#6c5ce7',
        'space-green': '#00ff88',
        'space-gold': '#FCD34D',
        'space-danger': '#ff4757',
        'space-text-primary': '#ffffff',
        'space-text-secondary': '#a0a0a0',
        'space-panel-bg': 'rgba(26, 26, 46, 0.4)',
      },
      fontFamily: {
        'space': ['Orbitron', 'monospace'],
        'orbitron': ['Orbitron', 'monospace'], // Alias for consistency
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'monospace'],
        'hud': ['Rajdhani', 'Orbitron', 'monospace'], // Technical HUD font
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      animation: {
        'pulse-neon': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'countdown': 'countdown 1s linear infinite',
        'trade-success': 'trade-success 0.6s ease-out',
        'trade-reject': 'trade-reject 0.4s ease-out',
        'particle-float': 'particle-float 6s ease-in-out infinite',
        'colony-rotate': 'colony-rotate 20s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
        // HUD-specific animations
        'hud-scan': 'hud-scan 3s ease-in-out infinite',
        'hud-pulse': 'hud-pulse 2s ease-in-out infinite',
        'hud-blink': 'hud-blink 1s ease-in-out infinite',
        'hud-glitch': 'hud-glitch 0.5s ease-in-out',
        'hud-rotate': 'hud-rotate 10s linear infinite',
        'hud-data-flow': 'hud-data-flow 15s linear infinite',
        // New animations for advanced UI
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        countdown: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'trade-success': {
          '0%': { transform: 'scale(1)', backgroundColor: 'transparent' },
          '50%': { transform: 'scale(1.05)', backgroundColor: '#00ff88' },
          '100%': { transform: 'scale(1)', backgroundColor: 'transparent' },
        },
        'trade-reject': {
          '0%': { transform: 'scale(1)', backgroundColor: 'transparent' },
          '50%': { transform: 'scale(1.05)', backgroundColor: '#ff4757' },
          '100%': { transform: 'scale(1)', backgroundColor: 'transparent' },
        },
        'particle-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'colony-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'glow-pulse': {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor' },
        },
        // HUD-specific keyframes
        'hud-scan': {
          '0%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        'hud-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'hud-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.7' },
        },
        'hud-glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'hud-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'hud-data-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
            transform: 'scale(1)',
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.8)',
            transform: 'scale(1.02)',
          },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        'xs': '475px',
        'tall': { 'raw': '(min-height: 800px)' },
        'landscape': { 'raw': '(orientation: landscape)' },
      },
      backdropBlur: {
        'glassmorphism': '10px',
        'hud': '5px',
        'glass': '20px',
        'glass-light': '10px',
        'glass-heavy': '30px',
      },
      backgroundOpacity: {
        '20': '0.2',
        '40': '0.4',
      },
      boxShadow: {
        'hud-glow': '0 0 15px',
        'hud-glow-sm': '0 0 5px',
        'hud-glow-lg': '0 0 25px',
        'hud-inner': 'inset 0 0 10px',
        'neon': '0 0 20px rgba(0, 212, 255, 0.5)',
        'neon-strong': '0 0 40px rgba(0, 212, 255, 0.8)',
        'hud-cyan': '0 0 20px rgba(0, 212, 255, 0.5)',
        'hud-blue': '0 0 20px rgba(58, 134, 255, 0.5)',
        'hud-amber': '0 0 20px rgba(255, 149, 0, 0.5)',
        'hud-red': '0 0 20px rgba(255, 71, 87, 0.5)',
        'hud-green': '0 0 20px rgba(0, 255, 136, 0.5)',
        'hud-purple': '0 0 20px rgba(108, 92, 231, 0.5)',
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
      },
      backgroundImage: {
        'hud-grid': 'linear-gradient(to right, #1a1a2e20 1px, transparent 1px), linear-gradient(to bottom, #1a1a2e20 1px, transparent 1px)',
        'hud-gradient': 'linear-gradient(to right, #00d4ff, #3a86ff)',
        'hud-radial': 'radial-gradient(circle, #1a1a2e 0%, #0a0a0f 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cosmic-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #2d1b69 50%, #1a1a2e 75%, #0a0a0f 100%)',
      },
      backgroundSize: {
        'hud-grid-sm': '10px 10px',
        'hud-grid-md': '20px 20px',
        'hud-grid-lg': '40px 40px',
      },
    },
  },
  safelist: [
    // Safelist for dynamic classes used in HUD components
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'grid-cols-6',
    {
      pattern: /bg-(hud|cyan|purple|warning|success|danger)-(primary|secondary|green|red|orange|blue|amber)/,
    },
    {
      pattern: /border-(hud|cyan|purple|warning|success|danger)-(primary|secondary|green|red|orange|blue|amber)/,
    },
    {
      pattern: /text-(hud|cyan|purple|warning|success|danger)-(primary|secondary|green|red|orange|blue|amber)/,
    },
    {
      pattern: /shadow-(hud|cyan|purple|warning|success|danger)-(primary|secondary|green|red|orange|blue|amber)/,
    },
  ],
  plugins: [],
}