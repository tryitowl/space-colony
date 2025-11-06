import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { firestore } from '../../../firebase/config';
import type { GameSession } from '../../../types';

interface ActivityItem {
  time: string;
  text: string;
  type: 'CREATE' | 'SUCCESS' | 'WARNING' | 'JOIN' | 'BACKUP' | 'ERROR';
}

interface ActiveSession {
  id: string;
  name: string;
  participants: number;
  round: string;
  status: 'active' | 'warning' | 'critical';
  gameState: string;
}

interface SessionsActivityTabProps {
  activities: ActivityItem[];
  activeSessions: ActiveSession[];
}

// Activity Type Badge
const ActivityTypeBadge: React.FC<{ type: ActivityItem['type'] }> = ({ type }) => {
  const colors = {
    CREATE: 'bg-cyan-400 text-gray-900',
    SUCCESS: 'bg-green-400 text-gray-900',
    WARNING: 'bg-orange-500 text-gray-900',
    JOIN: 'bg-cyan-400 text-gray-900',
    BACKUP: 'bg-green-400 text-gray-900',
    ERROR: 'bg-red-500 text-white'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${colors[type]}`}>
      {type}
    </span>
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

export const SessionsActivityTab: React.FC<SessionsActivityTabProps> = ({ activities, activeSessions }) => {
  const [firebaseSessions, setFirebaseSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string>('ALL');

  // Subscribe to Firebase sessions
  useEffect(() => {
    const sessionsQuery = query(
      collection(firestore, 'sessions'),
      where('gameState', '!=', 'ended'),
      orderBy('gameState'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const sessions: ActiveSession[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as GameSession;
          
          // Count actual participants
          const participantCount = data.teams.reduce((total, team) => {
            return total + team.players.length;
          }, 0);

          // Determine session status based on game state and resources
          let status: 'active' | 'warning' | 'critical' = 'active';
          const criticalTeams = data.teams.filter(team => 
            team.eliminationStatus.criticalResources.length > 0
          );
          
          if (criticalTeams.length > data.teams.length / 2) {
            status = 'critical';
          } else if (criticalTeams.length > 0) {
            status = 'warning';
          }

          sessions.push({
            id: doc.id,
            name: data.name,
            participants: participantCount,
            round: data.currentRound.toString(),
            status,
            gameState: data.gameState
          });
        });

        setFirebaseSessions(sessions);
        setIsLoadingSessions(false);
      },
      (error) => {
        console.error('Error fetching sessions:', error);
        setIsLoadingSessions(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Combine props sessions with Firebase sessions
  const allSessions = [...activeSessions, ...firebaseSessions];

  // Filter activities based on selected filter
  const filteredActivities = activityFilter === 'ALL' 
    ? activities 
    : activities.filter(activity => activity.type === activityFilter);

  // Animation variants for stagger effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  const activityVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 150,
        damping: 20
      }
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Active Sessions */}
      <motion.div variants={itemVariants}>
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          Active Sessions
        </h3>
        <motion.div 
          className="space-y-4" 
          style={{ maxHeight: '600px', overflowY: 'auto' }}
          variants={containerVariants}
        >
          <AnimatePresence mode="wait">
            {isLoadingSessions ? (
              <motion.div
                key="loading"
                className="flex items-center justify-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-8 h-8 border-2 border-t-transparent border-r-transparent rounded-full"
                  style={{ borderColor: '#00d4ff' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span className="ml-3 text-sm" style={{ color: '#00d4ff' }}>Loading sessions...</span>
              </motion.div>
            ) : allSessions.length === 0 ? (
              <motion.div 
                key="empty"
                className="text-center py-12" 
                style={{ color: '#a0a0a0' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <p className="text-sm">No active sessions at the moment</p>
              </motion.div>
            ) : (
              <motion.div
                key="sessions"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-4"
              >
                {allSessions.map((session) => (
                  <motion.div
                    key={session.id}
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row justify-between sm:items-center p-3 sm:p-4 border rounded-lg transition-all gap-3"
                    style={{
                      background: 'rgba(26, 26, 46, 0.5)',
                      borderColor: 'rgba(0, 212, 255, 0.3)'
                    }}
                    whileHover={{
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ff9500';
                      e.currentTarget.style.background = 'rgba(26, 26, 46, 0.8)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 149, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                      e.currentTarget.style.background = 'rgba(26, 26, 46, 0.5)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
              <div className="flex-1">
                <h4 
                  className="text-sm sm:text-base text-white mb-1"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  {session.name}
                </h4>
                <p className="text-xs sm:text-sm" style={{ color: '#a0a0a0' }}>
                  {session.participants} participants • Round {session.round}
                </p>
                <p className="text-xs mt-1" style={{ 
                  color: '#00d4ff',
                  fontFamily: 'SF Mono, monospace'
                }}>
                  Session ID: {session.id}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-center">
                <StatusIndicator status={session.status} />
                <span className="text-xs capitalize" style={{ 
                  color: session.status === 'active' ? '#00ff88' : 
                         session.status === 'warning' ? '#ff9500' : '#ff4757'
                }}>
                  {session.status}
                </span>
                <motion.button
                  className="px-3 py-2 text-xs sm:text-sm rounded-md border transition-all ml-1 sm:ml-2 min-h-[36px] sm:min-h-[40px]"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    border: '1px solid #ff9500',
                    background: 'rgba(255, 149, 0, 0.1)',
                    color: '#ff9500'
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    window.open(`/facilitator/session/${session.id}`, '_blank');
                  }}
                >
                  View Teams & Codes
                </motion.button>
              </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Session Statistics */}
        <div className="mt-6 p-4 border rounded-lg" style={{
          background: 'rgba(0, 212, 255, 0.05)',
          borderColor: '#00d4ff'
        }}>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{
            fontFamily: 'Orbitron, monospace',
            color: '#ff9500'
          }}>
            Session Statistics
          </h4>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#00d4ff'
              }}>
                {allSessions.length}
              </div>
              <div className="text-xs uppercase" style={{ color: '#a0a0a0' }}>Active Now</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ 
                fontFamily: 'Orbitron, monospace',
                color: '#00ff88'
              }}>
                {allSessions.reduce((sum, s) => sum + s.participants, 0)}
              </div>
              <div className="text-xs uppercase" style={{ color: '#a0a0a0' }}>Total Players</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          Recent Activity
        </h3>
        <motion.div 
          className="space-y-3" 
          style={{ maxHeight: '600px', overflowY: 'auto' }}
          variants={containerVariants}
        >
          <AnimatePresence mode="popLayout">
            {filteredActivities.length === 0 ? (
              <motion.div 
                key="no-activities"
                className="text-center py-12" 
                style={{ color: '#a0a0a0' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <p className="text-sm">No activities match the selected filter</p>
              </motion.div>
            ) : (
              filteredActivities.map((activity, index) => (
                <motion.div
                  key={`${activity.time}-${index}`}
                  variants={activityVariants}
                  layout
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3"
                  style={{
                    borderBottom: '1px solid rgba(0, 212, 255, 0.2)'
                  }}
                  whileHover={{
                    backgroundColor: 'rgba(0, 212, 255, 0.05)',
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-4 w-full">
                    <motion.div 
                      className="text-xs min-w-[50px] sm:min-w-[60px]"
                      style={{ 
                        fontFamily: 'Orbitron, monospace',
                        color: '#ff9500'
                      }}
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {activity.time}
                    </motion.div>
                    <div className="flex-1 text-xs sm:text-sm" style={{ color: '#a0a0a0' }}>
                      {activity.text}
                    </div>
                    <ActivityTypeBadge type={activity.type} />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {/* Activity Filters */}
        <div className="mt-6 p-4 border rounded-lg" style={{
          background: 'rgba(108, 92, 231, 0.05)',
          borderColor: '#6c5ce7'
        }}>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{
            fontFamily: 'Orbitron, monospace',
            color: '#6c5ce7'
          }}>
            Activity Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'CREATE', 'SUCCESS', 'WARNING', 'ERROR'].map((filter) => (
              <motion.button
                key={filter}
                className="px-3 py-2 text-xs sm:text-sm rounded-md border transition-all min-h-[36px]"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  border: '1px solid #6c5ce7',
                  background: filter === activityFilter ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
                  color: '#6c5ce7'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActivityFilter(filter)}
              >
                {filter}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};