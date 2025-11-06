import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HUDFrame } from './HUDFrame';

interface NewsItem {
  id: string;
  type: 'trade' | 'event' | 'intel' | 'alert' | 'achievement';
  title: string;
  content: string;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  colonyType?: string;
}

interface GalacticNewsFeedProps {
  items: NewsItem[];
  maxItems?: number;
  pauseOnHover?: boolean;
  showTimestamps?: boolean;
  variant?: 'ticker' | 'feed' | 'compact';
  className?: string;
}

/**
 * GalacticNewsFeed - Scrolling news feed with space theme
 * 
 * Features:
 * - Auto-scrolling news ticker
 * - Priority-based color coding
 * - Smooth transitions and animations
 * - Multiple display variants
 * - Real-time updates
 */
export const GalacticNewsFeed: React.FC<GalacticNewsFeedProps> = ({
  items,
  maxItems = 10,
  pauseOnHover = true,
  showTimestamps = true,
  variant = 'feed',
  className,
}) => {
  const [displayItems, setDisplayItems] = useState<NewsItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Update display items when new items arrive
  useEffect(() => {
    setDisplayItems(items.slice(0, maxItems));
  }, [items, maxItems]);

  // Get type icon
  const getTypeIcon = (type: NewsItem['type']) => {
    switch (type) {
      case 'trade': return '💫';
      case 'event': return '🌟';
      case 'intel': return '📡';
      case 'alert': return '⚠️';
      case 'achievement': return '🏆';
      default: return '📰';
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: NewsItem['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-amber-500';
      case 'medium': return 'text-cyan-400';
      case 'low': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Ticker variant with horizontal scrolling
  if (variant === 'ticker') {
    useEffect(() => {
      if (!scrollRef.current || isPaused) return;

      const scroll = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft += 1;
          
          // Reset scroll when reaching end
          if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
            scrollRef.current.scrollLeft = 0;
          }
        }
        animationRef.current = requestAnimationFrame(scroll);
      };

      animationRef.current = requestAnimationFrame(scroll);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isPaused]);

    return (
      <HUDFrame
        color="cyan"
        variant="panel"
        className={cn('overflow-hidden', className)}
      >
        <div
          onMouseEnter={() => pauseOnHover && setIsPaused(true)}
          onMouseLeave={() => pauseOnHover && setIsPaused(false)}
        >
        <div className="relative h-12 flex items-center">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-hud-dark to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-hud-dark to-transparent z-10" />
          
          <div
            ref={scrollRef}
            className="flex items-center gap-8 overflow-hidden whitespace-nowrap px-4"
            style={{ scrollBehavior: 'auto' }}
          >
            {/* Duplicate items for seamless loop */}
            {[...displayItems, ...displayItems].map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                className="flex items-center gap-2 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="text-lg">{getTypeIcon(item.type)}</span>
                <span className={cn('font-semibold', getPriorityColor(item.priority))}>
                  {item.title}:
                </span>
                <span className="text-gray-300">{item.content}</span>
              </motion.div>
            ))}
          </div>
        </div>
        </div>
      </HUDFrame>
    );
  }

  // Feed variant with vertical scrolling
  return (
    <HUDFrame
      color="cyan"
      variant="panel"
      className={cn('overflow-hidden', className)}
    >
      <div className="p-4">
        <h3 className="text-lg font-space font-bold text-cyan-400 mb-3 flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            📡
          </motion.span>
          Galactic News Feed
        </h3>
        
        <div className={cn(
          'space-y-2 overflow-y-auto custom-scrollbar',
          variant === 'compact' ? 'max-h-40' : 'max-h-64'
        )}>
          <AnimatePresence mode="popLayout">
            {displayItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10',
                  'hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-200',
                  item.priority === 'critical' && 'animate-pulse border-red-500/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-1">{getTypeIcon(item.type)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={cn(
                        'font-semibold truncate',
                        getPriorityColor(item.priority)
                      )}>
                        {item.title}
                      </h4>
                      {showTimestamps && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(item.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <p className={cn(
                      'text-sm text-gray-300',
                      variant === 'compact' ? 'truncate' : 'line-clamp-2'
                    )}>
                      {item.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
    </HUDFrame>
  );
};

GalacticNewsFeed.displayName = 'GalacticNewsFeed';

export default GalacticNewsFeed;