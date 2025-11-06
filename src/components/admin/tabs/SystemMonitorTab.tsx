import React from 'react';
import { motion } from 'framer-motion';

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

interface SystemMonitorTabProps {
  systemStats: SystemStats;
  currentTime: string;
}

export const SystemMonitorTab: React.FC<SystemMonitorTabProps> = ({ systemStats, currentTime }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 p-4">
      {/* System Status Overview */}
      <div className="col-span-1 order-1 lg:order-1">
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          System Status
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { value: systemStats.activeEvents, label: 'Active Events' },
            { value: systemStats.participants, label: 'Participants' },
            { value: `${systemStats.uptime}%`, label: 'Uptime' },
            { value: systemStats.totalEvents, label: 'Total Events' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-4 border rounded-lg"
              style={{
                background: 'rgba(0, 212, 255, 0.1)',
                borderColor: '#00d4ff'
              }}
            >
              <span 
                className="block text-2xl sm:text-3xl font-bold"
                style={{ 
                  fontFamily: 'Orbitron, monospace',
                  color: '#00d4ff'
                }}
              >
                {stat.value}
              </span>
              <span className="text-xs uppercase mt-1" style={{ color: '#a0a0a0' }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* System Resources */}
      <div className="col-span-1 order-2 lg:order-2">
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          Resource Monitor
        </h3>
        <div className="space-y-4">
          {[
            { icon: '🔧', label: 'CPU Usage', value: systemStats.cpuUsage, max: 100 },
            { icon: '💾', label: 'Memory', value: systemStats.memoryUsage, max: 100 }
          ].map((resource, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border rounded-lg"
              style={{
                background: 'rgba(0, 212, 255, 0.05)',
                borderColor: '#00d4ff'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{resource.icon}</span>
                  <span className="text-sm uppercase" style={{ color: '#a0a0a0' }}>
                    {resource.label}
                  </span>
                </div>
                <span 
                  className="text-lg font-semibold"
                  style={{ 
                    fontFamily: 'Orbitron, monospace',
                    color: '#00d4ff'
                  }}
                >
                  {resource.value}%
                </span>
              </div>
              {/* Progress bar */}
              <div 
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(0, 212, 255, 0.2)' }}
              >
                <motion.div
                  className="h-full"
                  style={{
                    background: resource.value > 80 
                      ? 'linear-gradient(90deg, #ff4757, #ff6b6b)'
                      : resource.value > 60 
                        ? 'linear-gradient(90deg, #ff9500, #ffa502)'
                        : 'linear-gradient(90deg, #00d4ff, #00a8ff)',
                    width: `${resource.value}%`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${resource.value}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}

          {/* Network & Security Status */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-4 border rounded-lg"
              style={{
                background: 'rgba(0, 212, 255, 0.05)',
                borderColor: '#00d4ff'
              }}
            >
              <div className="text-2xl mb-2">🌐</div>
              <div className="text-xs uppercase" style={{ color: '#a0a0a0' }}>Network</div>
              <div 
                className="text-sm font-semibold mt-1"
                style={{ 
                  fontFamily: 'Orbitron, monospace',
                  color: systemStats.networkStatus === 'STABLE' ? '#00ff88' : 
                         systemStats.networkStatus === 'WARNING' ? '#ff9500' : '#ff4757'
                }}
              >
                {systemStats.networkStatus}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center p-4 border rounded-lg"
              style={{
                background: 'rgba(0, 212, 255, 0.05)',
                borderColor: '#00d4ff'
              }}
            >
              <div className="text-2xl mb-2">🔒</div>
              <div className="text-xs uppercase" style={{ color: '#a0a0a0' }}>Security</div>
              <div 
                className="text-sm font-semibold mt-1"
                style={{ 
                  fontFamily: 'Orbitron, monospace',
                  color: systemStats.securityStatus === 'SECURE' ? '#00ff88' : '#ff4757'
                }}
              >
                {systemStats.securityStatus}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* System Time Display */}
      <div className="col-span-1 order-3 lg:order-3">
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          System Time
        </h3>
        <div 
          className="relative p-6 border rounded-lg"
          style={{
            background: 'rgba(0, 212, 255, 0.05)',
            borderColor: '#00d4ff'
          }}
        >
          {/* Background glow effect */}
          <div 
            className="absolute inset-0 rounded-lg opacity-20"
            style={{
              background: 'radial-gradient(ellipse at center, #00d4ff, transparent)',
              filter: 'blur(20px)'
            }}
          />
          
          {/* Clock container */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            {/* Time display */}
            <motion.div 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#00d4ff',
                textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
                letterSpacing: '0.15em'
              }}
              animate={{ 
                textShadow: [
                  '0 0 20px rgba(0, 212, 255, 0.5)',
                  '0 0 30px rgba(0, 212, 255, 0.8)',
                  '0 0 20px rgba(0, 212, 255, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {currentTime}
            </motion.div>
            
            {/* Date display */}
            <div 
              className="text-sm uppercase tracking-wider"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#a0a0a0',
                letterSpacing: '0.2em'
              }}
            >
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
              }).toUpperCase()}
            </div>
            
            {/* UTC label */}
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: '#00ff88' }}
              />
              <span 
                className="text-xs uppercase"
                style={{ 
                  fontFamily: 'Orbitron, monospace',
                  color: '#00ff88',
                  letterSpacing: '0.1em'
                }}
              >
                UTC TIME
              </span>
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex justify-around w-full mt-6 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: '#6c5ce7' }}>SYNC</div>
              <div className="text-lg font-bold" style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#00ff88' 
              }}>OK</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: '#6c5ce7' }}>LAG</div>
              <div className="text-lg font-bold" style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#ff9500' 
              }}>12ms</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 p-4 border rounded-lg" style={{
          background: 'rgba(0, 212, 255, 0.05)',
          borderColor: '#00d4ff'
        }}>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{
            fontFamily: 'Orbitron, monospace',
            color: '#ff9500'
          }}>
            Performance Metrics
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#a0a0a0' }}>Response Time</span>
              <span className="text-sm font-mono" style={{ color: '#00ff88' }}>124ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#a0a0a0' }}>Throughput</span>
              <span className="text-sm font-mono" style={{ color: '#00ff88' }}>1.2k req/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#a0a0a0' }}>Error Rate</span>
              <span className="text-sm font-mono" style={{ color: '#00ff88' }}>0.02%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};