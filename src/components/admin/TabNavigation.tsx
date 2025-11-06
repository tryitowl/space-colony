import React, { useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';

export interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const controls = useAnimation();

  // Enhanced tab change with ripple effect
  const handleTabClick = useCallback(async (tabId: string) => {
    // Trigger a subtle pulse animation
    await controls.start({
      scale: [1, 0.98, 1],
      transition: { duration: 0.2 }
    });
    onTabChange(tabId);
  }, [onTabChange, controls]);

  return (
    <motion.div 
      className="relative flex bg-transparent rounded-lg p-1"
      style={{
        borderBottom: '1px solid #00d4ff',
        marginBottom: '2rem'
      }}
      animate={controls}
    >
      {/* Animated underline indicator */}
      <motion.div
        className="absolute bottom-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, transparent, #ff9500, transparent)',
          width: `${100 / tabs.length}%`,
        }}
        animate={{
          x: `${activeIndex * 100}%`,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      />

      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        
        return (
          <motion.button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3
              font-semibold uppercase tracking-wider text-xs sm:text-sm
              transition-all duration-300 relative overflow-hidden min-h-[44px]
              ${isActive ? 'text-white' : 'text-gray-400'}
            `}
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: '0.875rem',
              background: isActive 
                ? 'rgba(0, 212, 255, 0.1)' 
                : 'transparent',
              borderLeft: index > 0 ? '1px solid rgba(0, 212, 255, 0.2)' : 'none',
            }}
            whileHover={{ 
              y: -2,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
            onKeyDown={(e) => {
              // Keyboard navigation support
              if (e.key === 'ArrowRight' && index < tabs.length - 1) {
                onTabChange(tabs[index + 1].id);
              } else if (e.key === 'ArrowLeft' && index > 0) {
                onTabChange(tabs[index - 1].id);
              }
            }}
            tabIndex={0}
            role="tab"
            aria-selected={isActive}
            aria-label={`${tab.label} tab`}
          >
            {/* Hover glow effect */}
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.3), transparent)',
                filter: 'blur(20px)',
              }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            {/* Tab content */}
            <span className="relative z-10 text-lg">{tab.icon}</span>
            <span className="relative z-10">{tab.label}</span>

            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ backgroundColor: '#00ff88' }}
                animate={{ 
                  opacity: [1, 0.6, 1],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}

            {/* Border glow on hover */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                border: '1px solid transparent',
                borderRadius: '0.375rem',
              }}
              whileHover={{
                borderColor: isActive ? '#ff9500' : '#00d4ff',
                boxShadow: isActive 
                  ? '0 0 20px rgba(255, 149, 0, 0.5)' 
                  : '0 0 20px rgba(0, 212, 255, 0.5)',
              }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        );
      })}
    </motion.div>
  );
};