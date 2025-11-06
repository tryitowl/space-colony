import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '../../firebase/config';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import type { IntelItem } from '../../types/game';

interface IntelNotification {
  id: string;
  type: 'intel_received' | 'intel_expired' | 'intel_traded' | 'round_intel_distributed';
  message: string;
  intel?: Partial<IntelItem>[];
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
  round?: number;
  autoClose?: boolean;
  duration?: number; // milliseconds
}

interface IntelNotificationsProps {
  sessionId: string;
  teamId?: string;
  className?: string;
  maxNotifications?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * IntelNotifications - Real-time notifications for intel-related events
 * 
 * Features:
 * - Real-time Firebase listeners for intel notifications
 * - Different notification types with appropriate styling
 * - Auto-dismiss and manual dismiss options
 * - Priority-based ordering
 * - Smooth animations and transitions
 * - Configurable position and limits
 */
export const IntelNotifications: React.FC<IntelNotificationsProps> = ({
  sessionId,
  teamId,
  className,
  maxNotifications = 5,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<IntelNotification[]>([]);

  // Listen for intel notifications
  useEffect(() => {
    if (!sessionId) return;

    const listeners: (() => void)[] = [];

    // Listen for team-specific notifications
    if (teamId) {
      const teamNotificationRef = ref(realtimeDb, `sessions/${sessionId}/live/notifications/${teamId}`);
      
      onValue(teamNotificationRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            if (value.type?.includes('intel')) {
              addNotification({
                id: key,
                ...value,
                autoClose: value.priority !== 'high',
                duration: getPriorityDuration(value.priority)
              });
            }
          });
        }
      });
      
      listeners.push(() => off(teamNotificationRef));
    }

    // Listen for global round intel notifications
    const roundNotificationRef = ref(realtimeDb, `sessions/${sessionId}/live/round_events`);
    
    onValue(roundNotificationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (key.includes('intel_distribution') && value.type === 'round_intel_distributed') {
            addNotification({
              id: key,
              ...value,
              autoClose: true,
              duration: 8000
            });
          }
        });
      }
    });
    
    listeners.push(() => off(roundNotificationRef));

    return () => {
      listeners.forEach(cleanup => cleanup());
    };
  }, [sessionId, teamId]);

  // Auto-dismiss notifications
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    notifications.forEach(notification => {
      if (notification.autoClose && notification.duration) {
        const timer = setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.duration);
        
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications]);

  const addNotification = (notification: IntelNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }

      // Add new notification and limit total count
      const updated = [notification, ...prev].slice(0, maxNotifications);
      
      // Sort by priority and timestamp
      return updated.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.timestamp - a.timestamp;
      });
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAll = () => {
    setNotifications([]);
  };

  const getPriorityDuration = (priority: string): number => {
    switch (priority) {
      case 'high': return 12000; // 12 seconds
      case 'medium': return 8000; // 8 seconds
      case 'low': return 5000; // 5 seconds
      default: return 8000;
    }
  };

  const getNotificationIcon = (type: IntelNotification['type']): string => {
    switch (type) {
      case 'intel_received': return '📄';
      case 'intel_expired': return '⏰';
      case 'intel_traded': return '🤝';
      case 'round_intel_distributed': return '📡';
      default: return '📊';
    }
  };

  const getNotificationStyle = (priority: string) => {
    const baseStyle = 'border-l-4 bg-gradient-to-r backdrop-blur-sm';
    
    switch (priority) {
      case 'high':
        return `${baseStyle} border-red-400 from-red-900/80 to-red-800/60`;
      case 'medium':
        return `${baseStyle} border-purple-400 from-purple-900/80 to-purple-800/60`;
      case 'low':
        return `${baseStyle} border-blue-400 from-blue-900/80 to-blue-800/60`;
      default:
        return `${baseStyle} border-gray-400 from-gray-900/80 to-gray-800/60`;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50';
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={cn(getPositionClasses(), 'space-y-2 w-80', className)}>
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: position.includes('right') ? 100 : -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: position.includes('right') ? 100 : -100, scale: 0.8 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={cn(
              'p-4 rounded-lg shadow-xl',
              getNotificationStyle(notification.priority),
              'hover:shadow-2xl transition-shadow duration-200'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    notification.priority === 'high' ? 'text-red-300' :
                    notification.priority === 'medium' ? 'text-purple-300' :
                    'text-blue-300'
                  )}>
                    {notification.priority} Priority
                  </span>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => dismissNotification(notification.id)}
                    className="text-white/60 hover:text-white p-1 h-auto"
                  >
                    ×
                  </Button>
                </div>
                
                <p className="text-sm text-white font-medium mb-2">
                  {notification.message}
                </p>
                
                {notification.intel && notification.intel.length > 0 && (
                  <div className="space-y-1">
                    {notification.intel.map((intel, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 truncate">
                          {intel.title}
                        </span>
                        {intel.value && (
                          <span className="text-cyan-400 font-mono font-bold">
                            {intel.value} CR
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {notification.round && (
                  <div className="text-xs text-gray-400 mt-1">
                    Round {notification.round}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            {notification.autoClose && notification.duration && (
              <motion.div
                className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: notification.duration / 1000, ease: 'linear' }}
                />
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {notifications.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button
            size="sm"
            variant="glass"
            onClick={dismissAll}
            className="text-xs text-white/80 hover:text-white"
          >
            Dismiss All ({notifications.length})
          </Button>
        </motion.div>
      )}
    </div>
  );
};

IntelNotifications.displayName = 'IntelNotifications';

export default IntelNotifications;