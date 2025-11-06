import React from 'react';
import { cn } from '../../utils/cn';

interface ModernLayoutProps {
  children: React.ReactNode;
  className?: string;
  showParticles?: boolean;
  showStars?: boolean;
  variant?: 'default' | 'dashboard' | 'game';
}

const ParticleField: React.FC<{ variant?: string }> = ({ variant = 'default' }) => {
  const particleCount = variant === 'game' ? 30 : 20;
  const particles = Array.from({ length: particleCount }, (_, i) => (
    <div
      key={i}
      className="absolute w-1 h-1 bg-space-cyan rounded-full animate-particles opacity-10"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 20}s`,
        animationDuration: `${15 + Math.random() * 10}s`,
      }}
    />
  ));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles}
    </div>
  );
};

const StarField: React.FC<{ variant?: string }> = ({ variant = 'default' }) => {
  const starCount = variant === 'game' ? 50 : 80;
  const stars = Array.from({ length: starCount }, (_, i) => (
    <div
      key={i}
      className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 4}s`,
        animationDuration: `${2 + Math.random() * 2}s`,
      }}
    />
  ));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars}
    </div>
  );
};

export const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  className,
  showParticles = true,
  showStars = true,
  variant = 'default',
}) => {
  const getBackgroundVariant = () => {
    switch (variant) {
      case 'dashboard':
        return 'bg-gradient-to-br from-space-black via-space-blue/80 to-space-purple/30';
      case 'game':
        return 'bg-gradient-to-br from-space-black via-space-blue/60 to-space-green/20';
      default:
        return 'bg-gradient-to-br from-space-black via-space-blue to-purple-900/50';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic Background */}
      <div className={cn('absolute inset-0', getBackgroundVariant())} />
      
      {/* Animated Background Elements */}
      {showStars && <StarField variant={variant} />}
      {showParticles && <ParticleField variant={variant} />}
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-space-blue/10 to-space-black/30" />
      
      {/* Grid Pattern for Dashboard */}
      {variant === 'dashboard' && (
        <div className="absolute inset-0 bg-hud-grid bg-hud-grid-lg opacity-5" />
      )}
      
      {/* Main Content */}
      <div className={cn('relative z-10 min-h-screen', className)}>
        {children}
      </div>
    </div>
  );
};