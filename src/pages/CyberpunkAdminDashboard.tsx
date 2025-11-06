import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabNavigation, type Tab } from '../components/admin/TabNavigation';
import { ToastManager } from '../components/ui/Toast';
import {
  EventCreationTab,
  EnhancedEventCreationTab,
  SystemMonitorTab,
  TemplatesDocsTab,
  SessionsActivityTab,
  GalaxyConfigurationTab
} from '../components/admin/tabs';

interface SystemStats {
  activeEvents: number;
  participants: number;
  uptime: number;
  totalEvents: number;
  cpuUsage: number;
  memoryUsage: number;
  networkStatus: 'STABLE' | 'WARNING' | 'CRITICAL';
  securityStatus: 'SECURE' | 'ALERT';
}

interface ActivityItem {
  time: string;
  text: string;
  type: 'CREATE' | 'SUCCESS' | 'WARNING' | 'JOIN' | 'BACKUP' | 'ERROR';
}

// Loading skeleton component
const LoadingSkeleton: React.FC<{ height?: string; width?: string }> = ({ 
  height = '20px', 
  width = '100%' 
}) => (
  <motion.div
    className="rounded"
    style={{
      height,
      width,
      background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 212, 255, 0.2) 50%, rgba(0, 212, 255, 0.1) 100%)',
    }}
    animate={{
      backgroundPosition: ['0% 0%', '100% 0%'],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// HUD Panel Component with enhanced styling and optimized animations
const HUDPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  code?: string;
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  error?: string | null;
  delay?: number;
}> = ({ children, className = '', title, code, size = 'medium', loading = false, error = null, delay = 0 }) => {
  // Define minimum heights based on panel size
  const minHeights = {
    small: '180px',
    medium: '250px',
    large: '400px'
  };

  // Memoize the scanning line animation to prevent re-renders
  const scanningLine = useMemo(() => (
    <motion.div
      className="absolute top-0 left-0 w-full h-0.5 opacity-70 pointer-events-none will-change-transform"
      style={{
        background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        ease: 'linear',
        repeatDelay: 1 // Add delay between animations to reduce CPU usage
      }}
    />
  ), []);

  return (
    <motion.section
      className={`hud-panel relative overflow-hidden transition-all duration-300 p-4 md:p-6 lg:p-8 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: 'spring',
        stiffness: 100,
        damping: 15
      }}
      style={{
        background: 'rgba(10, 10, 15, 0.9)',
        border: '1px solid #00d4ff',
        borderRadius: '12px',
        minHeight: minHeights[size],
        maxHeight: 'calc(100vh - 300px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top gradient line */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, #00d4ff, #ff9500)'
        }}
      />
      
      {/* Corner indicators */}
      <div className="corner-indicators">
        <div 
          className="absolute w-3 h-3 border-2 border-orange-500"
          style={{
            top: '8px',
            left: '8px',
            borderRight: 'none',
            borderBottom: 'none'
          }}
        />
        <div 
          className="absolute w-3 h-3 border-2 border-orange-500"
          style={{
            bottom: '8px',
            right: '8px',
            borderLeft: 'none',
            borderTop: 'none'
          }}
        />
      </div>
      
      {/* Optimized scanning line animation */}
      {scanningLine}
      
      {/* Header */}
      {title && (
        <div 
          className="flex justify-between items-center mb-4 md:mb-6 pb-2"
          style={{
            borderBottom: '1px solid rgba(0, 212, 255, 0.3)'
          }}
        >
          <h3 
            className="text-sm md:text-base lg:text-lg font-semibold text-white uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, monospace' }}
          >
            {title}
          </h3>
          {code && (
            <span 
              className="text-xs md:text-sm opacity-80"
              style={{ 
                fontFamily: 'SF Mono, monospace',
                color: '#ff9500'
              }}
            >
              {code}
            </span>
          )}
        </div>
      )}
      
      {/* Content wrapper with proper overflow handling and internal padding */}
      <div 
        className="flex-1 overflow-auto"
        style={{ 
          padding: '1.5rem',
          scrollbarWidth: 'thin',
          scrollbarColor: '#00d4ff rgba(0, 212, 255, 0.1)'
        }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <LoadingSkeleton height="32px" width="60%" />
              <LoadingSkeleton height="24px" width="80%" />
              <LoadingSkeleton height="24px" width="70%" />
              <LoadingSkeleton height="120px" />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: 2,
                  repeatType: 'reverse'
                }}
                className="text-6xl mb-4"
              >
                ⚠️
              </motion.div>
              <p className="text-red-500 text-center" style={{ fontFamily: 'Orbitron, monospace' }}>
                {error}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

// Pulsing status indicator
const StatusIndicator: React.FC<{ status?: 'active' | 'warning' | 'critical' }> = ({ status = 'active' }) => {
  const colors = {
    active: '#00ff88',
    warning: '#ff9500',
    critical: '#ff4757'
  };

  return (
    <motion.div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: colors[status] }}
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
  );
};

interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export const CyberpunkAdminDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [activeTab, setActiveTab] = useState('event-creation');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [systemStats] = useState<SystemStats>({
    activeEvents: 12,
    participants: 247,
    uptime: 98,
    totalEvents: 156,
    cpuUsage: 23,
    memoryUsage: 67,
    networkStatus: 'STABLE',
    securityStatus: 'SECURE'
  });
  
  const [activities, setActivities] = useState<ActivityItem[]>([
    { time: '15:23', text: 'New event "Q2 Strategy Session" created', type: 'CREATE' },
    { time: '15:19', text: 'TechCorp Leadership session completed successfully', type: 'SUCCESS' },
    { time: '15:15', text: 'Connection issue detected in session GLB-2024-03', type: 'WARNING' },
    { time: '15:12', text: '48 participants joined Innovation Labs session', type: 'JOIN' },
    { time: '15:08', text: 'System backup completed successfully', type: 'BACKUP' }
  ]);
  
  // Template handling
  const [selectedTemplate, setSelectedTemplate] = useState({ name: '', duration: '' });

  // Active sessions mock data
  const [activeSessions] = useState([
    { id: 'session_1', name: 'TechCorp Leadership', participants: 24, round: '3/5', status: 'active' as const, gameState: 'trading' },
    { id: 'session_2', name: 'StartupXYZ Onboarding', participants: 12, round: '2/5', status: 'warning' as const, gameState: 'strategy' },
    { id: 'session_3', name: 'Global Corp Training', participants: 48, round: '4/5', status: 'active' as const, gameState: 'trading' },
    { id: 'session_4', name: 'Innovation Labs', participants: 18, round: '1/5', status: 'critical' as const, gameState: 'instructions' }
  ]);

  // Update time every 100ms for a smoother digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  // Tab configuration
  const tabs: Tab[] = [
    { id: 'event-creation', label: 'Event Creation', icon: '🚀' },
    { id: 'galaxy-configuration', label: 'Galaxy Config', icon: '🌌' },
    { id: 'enhanced-creation', label: 'Galaxy Events', icon: '🌌' },
    { id: 'system-monitor', label: 'System Monitor', icon: '📊' },
    { id: 'templates-docs', label: 'Templates & Docs', icon: '📚' },
    { id: 'sessions-activity', label: 'Sessions & Activity', icon: '🎮' }
  ];

  const handleActivityUpdate = (newActivity: ActivityItem) => {
    setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
  };

  const handleTemplateSelect = (name: string, duration: string) => {
    setSelectedTemplate({ name, duration });
    // Switch to event creation tab when template is selected
    setActiveTab('event-creation');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type,
      duration: 5000
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div 
      className="relative min-h-screen overflow-x-hidden"
      style={{ 
        background: '#0a0a0f',
        fontFamily: 'Inter, sans-serif',
        padding: '10vh 10vw' // 10% padding on all sides
      }}
    >
      {/* Custom scrollbar styles */}
      <style>{`
        /* WebKit browsers custom scrollbar */
        .hud-panel ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .hud-panel ::-webkit-scrollbar-track {
          background: rgba(0, 212, 255, 0.1);
          border-radius: 4px;
        }
        .hud-panel ::-webkit-scrollbar-thumb {
          background: #00d4ff;
          border-radius: 4px;
        }
        .hud-panel ::-webkit-scrollbar-thumb:hover {
          background: #ff9500;
        }
        
        /* Custom range input styles */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          background: transparent;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
          transition: all 0.2s;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
          transition: all 0.2s;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #ff9500;
          box-shadow: 0 0 15px rgba(255, 149, 0, 0.7);
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          background: #ff9500;
          box-shadow: 0 0 15px rgba(255, 149, 0, 0.7);
        }
      `}</style>
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

      {/* Header */}
      <header 
        className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4"
        style={{
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #00d4ff'
        }}
      >
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div 
            className="text-lg sm:text-xl lg:text-2xl font-bold"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: '#00d4ff',
              textShadow: '0 0 10px #00d4ff'
            }}
          >
            <span className="hidden sm:inline">SPACE COLONY EXCHANGE</span>
            <span className="sm:hidden">SCE</span>
          </div>
          
          {/* Mobile Menu Button */}
          <motion.button
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-md"
            style={{
              border: '1px solid #00d4ff',
              background: 'rgba(0, 212, 255, 0.1)',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)'
            }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.95 }}
            whileHover={{ 
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
              borderColor: '#00ff88'
            }}
          >
            <motion.div
              animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6 flex flex-col justify-center items-center gap-1"
            >
              <span className="block w-5 h-0.5 bg-cyan-400 shadow-glow"></span>
              <span className="block w-5 h-0.5 bg-cyan-400 shadow-glow"></span>
              <span className="block w-5 h-0.5 bg-cyan-400 shadow-glow"></span>
            </motion.div>
            <span 
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#00d4ff',
                textShadow: '0 0 5px #00d4ff'
              }}
            >
              Menu
            </span>
          </motion.button>
          
          {/* Desktop Status */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIndicator />
              <span 
                className="text-sm"
                style={{ 
                  fontFamily: 'Orbitron, monospace',
                  color: '#00ff88'
                }}
              >
                SYSTEM ONLINE
              </span>
            </div>
            <div 
              className="text-base"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#a0a0a0'
              }}
            >
              {currentTime}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(10, 10, 15, 0.98)' }}
          >
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="text-xl font-bold"
                  style={{ 
                    fontFamily: 'Orbitron, monospace',
                    color: '#00d4ff'
                  }}
                >
                  Navigation
                </h2>
                <motion.button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md"
                  style={{
                    border: '1px solid #ff4757',
                    background: 'rgba(255, 71, 87, 0.1)'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl" style={{ color: '#ff4757' }}>×</span>
                </motion.button>
              </div>
              
              {/* Mobile Tab List */}
              <div className="space-y-4">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full p-4 rounded-lg text-left flex items-center gap-3 transition-all ${
                      activeTab === tab.id ? 'bg-cyan-900/30' : 'bg-gray-900/50'
                    }`}
                    style={{
                      border: activeTab === tab.id ? '1px solid #00d4ff' : '1px solid transparent',
                      fontFamily: 'Orbitron, monospace'
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-2xl">{tab.icon}</span>
                    <span className={activeTab === tab.id ? 'text-cyan-400' : 'text-gray-400'}>
                      {tab.label}
                    </span>
                  </motion.button>
                ))}
              </div>
              
              {/* Mobile Status Info */}
              <div className="mt-8 p-4 rounded-lg" style={{
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid #00d4ff'
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusIndicator />
                  <span 
                    className="text-sm"
                    style={{ 
                      fontFamily: 'Orbitron, monospace',
                      color: '#00ff88'
                    }}
                  >
                    SYSTEM ONLINE
                  </span>
                </div>
                <div 
                  className="text-lg"
                  style={{ 
                    fontFamily: 'Orbitron, monospace',
                    color: '#a0a0a0'
                  }}
                >
                  {currentTime}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 overflow-hidden" style={{ maxHeight: 'calc(100vh - 100px)' }}>
        {/* Desktop Tab Navigation */}
        <div className="hidden lg:block relative z-10">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        
        {/* Mobile Tab Indicator */}
        <div className="lg:hidden mb-4">
          <div 
            className="p-3 rounded-lg flex items-center justify-between"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid #00d4ff'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{tabs.find(t => t.id === activeTab)?.icon}</span>
              <span 
                className="text-sm font-semibold"
                style={{ 
                  fontFamily: 'Orbitron, monospace',
                  color: '#00d4ff'
                }}
              >
                {tabs.find(t => t.id === activeTab)?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content with smooth transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ 
              duration: 0.3,
              type: 'spring',
              stiffness: 200,
              damping: 20
            }}
          >
            <HUDPanel 
              title={tabs.find(tab => tab.id === activeTab)?.label || ''} 
              code={activeTab.toUpperCase().replace('-', '/')}
              size="large"
              className="overflow-hidden"
              delay={0.1}
            >
              {/* Event Creation Tab */}
              {activeTab === 'event-creation' && (
                <EventCreationTab 
                  onActivityUpdate={handleActivityUpdate}
                  selectedTemplate={selectedTemplate}
                  onShowToast={showToast}
                  onTabChange={setActiveTab}
                  onEventCreated={(eventId) => {
                    setSelectedEventId(eventId);
                    // Automatically switch to Galaxy Configuration tab
                    setActiveTab('galaxy-configuration');
                  }}
                />
              )}

              {/* Galaxy Configuration Tab */}
              {activeTab === 'galaxy-configuration' && (
                <GalaxyConfigurationTab eventId={selectedEventId} />
              )}

              {/* Enhanced Galaxy Event Creation Tab */}
              {activeTab === 'enhanced-creation' && (
                <EnhancedEventCreationTab 
                  onActivityUpdate={handleActivityUpdate}
                  selectedTemplate={selectedTemplate}
                  onShowToast={showToast}
                  onTabChange={setActiveTab}
                />
              )}

              {/* System Monitor Tab */}
              {activeTab === 'system-monitor' && (
                <SystemMonitorTab
                  systemStats={systemStats}
                  currentTime={currentTime}
                />
              )}

              {/* Templates & Docs Tab */}
              {activeTab === 'templates-docs' && (
                <TemplatesDocsTab
                  onTemplateSelect={handleTemplateSelect}
                />
              )}

              {/* Sessions & Activity Tab */}
              {activeTab === 'sessions-activity' && (
                <SessionsActivityTab
                  activities={activities}
                  activeSessions={activeSessions}
                />
              )}
            </HUDPanel>
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Toast Notifications */}
      <ToastManager toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}