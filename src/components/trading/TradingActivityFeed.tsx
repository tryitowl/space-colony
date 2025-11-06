import React, { useEffect, useState, useRef } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import type { Colony } from '../../types';
import { TradingService } from '../../services/tradingService';
import { cn } from '../../utils/cn';

interface TradeActivity {
  id: string;
  type: 'offer_created' | 'offer_accepted' | 'offer_rejected' | 'offer_expired' | 'counter_offer';
  tradeId: string;
  initiatorName: string;
  targetName: string;
  offerSummary: string;
  requestSummary: string;
  timestamp: number;
  value: number;
  urgent?: boolean;
}

interface TradingActivityFeedProps {
  sessionId: string;
  currentTeamId: string;
  teams: Colony[];
  className?: string;
}

export const TradingActivityFeed: React.FC<TradingActivityFeedProps> = ({
  sessionId,
  currentTeamId,
  teams,
  className
}) => {
  const [activities, setActivities] = useState<TradeActivity[]>([]);
  const [filter, setFilter] = useState<'all' | 'relevant' | 'urgent'>('relevant');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to all trade activities in the session
    const unsubscribe = TradingService.subscribeToTradingStatus(
      sessionId,
      () => {
        // This would need to be enhanced to provide full trade activity data
        // For now, we'll simulate activity detection
        detectTradeActivities();
      }
    );

    // Initial load
    detectTradeActivities();

    return unsubscribe;
  }, [sessionId]);

  const detectTradeActivities = async () => {
    try {
      // In a real implementation, this would subscribe to a trade activity stream
      // For now, we'll simulate by checking recent trades
      const recentActivities = await generateMockActivities();
      
      setActivities(prev => {
        const newActivities = recentActivities.filter(
          activity => !prev.some(p => p.id === activity.id)
        );
        
        if (newActivities.length > 0) {
          setNewActivityCount(c => c + newActivities.length);
          
          // Play notification sound for relevant activities
          if (soundEnabled && newActivities.some(isRelevantActivity)) {
            playNotificationSound();
          }
        }
        
        return [...newActivities, ...prev].slice(0, 50); // Keep last 50 activities
      });
    } catch (error) {
      console.error('Failed to detect trade activities:', error);
    }
  };

  const generateMockActivities = async (): Promise<TradeActivity[]> => {
    // Mock data generator - in real implementation, this would come from real-time database
    const mockActivities: TradeActivity[] = [];
    const now = Date.now();
    
    // Generate some mock activities for demonstration
    for (let i = 0; i < 5; i++) {
      const randomTeam1 = teams[Math.floor(Math.random() * teams.length)];
      const randomTeam2 = teams[Math.floor(Math.random() * teams.length)];
      
      if (randomTeam1.id !== randomTeam2.id) {
        mockActivities.push({
          id: `activity_${now}_${i}`,
          type: ['offer_created', 'offer_accepted', 'offer_rejected', 'counter_offer'][Math.floor(Math.random() * 4)] as TradeActivity['type'],
          tradeId: `trade_${now}_${i}`,
          initiatorName: randomTeam1.name,
          targetName: randomTeam2.name,
          offerSummary: '50 minerals, 30 energy',
          requestSummary: '8 food, 5 water',
          timestamp: now - (i * 60000), // Space activities 1 minute apart
          value: Math.floor(Math.random() * 200) + 50,
          urgent: Math.random() > 0.8 // 20% chance of being urgent
        });
      }
    }
    
    return mockActivities;
  };

  const isRelevantActivity = (activity: TradeActivity): boolean => {
    return activity.initiatorName.includes(currentTeamId) || 
           activity.targetName.includes(currentTeamId) ||
           activity.urgent ||
           activity.value > 150; // High-value trades
  };

  const getFilteredActivities = (): TradeActivity[] => {
    switch (filter) {
      case 'relevant':
        return activities.filter(isRelevantActivity);
      case 'urgent':
        return activities.filter(a => a.urgent);
      case 'all':
      default:
        return activities;
    }
  };

  const playNotificationSound = () => {
    // In a real implementation, you'd use Web Audio API or HTML5 audio
    console.log('🔊 Trade notification sound');
    
    // Simple audio notification (you'd load actual sound files)
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed (user hasn't interacted yet)
      });
    }
  };

  const getActivityIcon = (type: TradeActivity['type']): string => {
    switch (type) {
      case 'offer_created': return '📤';
      case 'offer_accepted': return '✅';
      case 'offer_rejected': return '❌';
      case 'offer_expired': return '⏰';
      case 'counter_offer': return '🔄';
      default: return '📊';
    }
  };

  const getActivityColor = (type: TradeActivity['type']): string => {
    switch (type) {
      case 'offer_created': return 'text-space-cyan';
      case 'offer_accepted': return 'text-space-success';
      case 'offer_rejected': return 'text-space-danger';
      case 'offer_expired': return 'text-space-warning';
      case 'counter_offer': return 'text-space-warning';
      default: return 'text-space-text-secondary';
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  const markAsRead = () => {
    setNewActivityCount(0);
    // Scroll to top
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  };

  const filteredActivities = getFilteredActivities();

  return (
    <GlassPanel className={cn("p-4", className)}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-space-cyan font-orbitron">
            📊 Trading Activity
          </h3>
          {newActivityCount > 0 && (
            <div className="bg-space-danger text-white text-xs rounded-full px-2 py-1 font-bold animate-pulse">
              {newActivityCount}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(soundEnabled ? "text-space-success" : "text-space-text-secondary")}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </Button>
          
          {newActivityCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={markAsRead}
            >
              Mark Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4">
        {[
          { key: 'relevant', label: 'Relevant', count: activities.filter(isRelevantActivity).length },
          { key: 'urgent', label: 'Urgent', count: activities.filter(a => a.urgent).length },
          { key: 'all', label: 'All', count: activities.length }
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            variant={filter === key ? "primary" : "glass"}
            size="sm"
            onClick={() => setFilter(key as 'all' | 'relevant' | 'urgent')}
            className="text-xs"
          >
            {label} ({count})
          </Button>
        ))}
      </div>

      {/* Activity Feed */}
      <div 
        ref={feedRef}
        className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-space-cyan/50"
      >
        {filteredActivities.length === 0 ? (
          <div className="text-center text-space-text-secondary py-8">
            <p>No trading activity yet</p>
            <p className="text-sm mt-2">Activity will appear here as teams start trading</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                "p-3 bg-space-panel-bg/50 rounded-lg border border-white/10",
                "hover:border-space-cyan/30 transition-colors",
                activity.urgent && "border-space-danger/50 bg-space-danger/5"
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="text-lg">{getActivityIcon(activity.type)}</div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <div className={cn("font-medium text-sm", getActivityColor(activity.type))}>
                      {activity.type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-xs text-space-text-secondary">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                  
                  <div className="text-sm mb-2">
                    <span className="text-white font-medium">{activity.initiatorName}</span>
                    <span className="text-space-text-secondary"> → </span>
                    <span className="text-white font-medium">{activity.targetName}</span>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-space-success">Offered:</span>
                      <span className="ml-2 font-mono">{activity.offerSummary}</span>
                    </div>
                    <div>
                      <span className="text-space-warning">Requested:</span>
                      <span className="ml-2 font-mono">{activity.requestSummary}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-space-text-secondary">
                      Value: {activity.value} pts
                    </div>
                    {activity.urgent && (
                      <div className="text-xs text-space-danger font-bold animate-pulse">
                        URGENT
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live Status */}
      <div className="mt-4 flex justify-between items-center text-xs text-space-text-secondary">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-space-success rounded-full animate-pulse"></div>
          <span>Live feed active</span>
        </div>
        <div>
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Hidden audio element for notifications */}
      <audio
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
      >
        {/* In production, you'd have actual notification sound files */}
        <source src="/sounds/trade-notification.mp3" type="audio/mpeg" />
        <source src="/sounds/trade-notification.ogg" type="audio/ogg" />
      </audio>
    </GlassPanel>
  );
};