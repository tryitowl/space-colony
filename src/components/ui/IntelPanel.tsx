import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HUDFrame } from './HUDFrame';
import { Button } from './Button';
import type { IntelItem } from '../../types/game';

type IntelType = 'all' | 'market_intel' | 'survey_report' | 'crisis_warning' | 'discovery' | 'competitive' | 'prediction' | 'alien' | 'strategy' | 'alliance' | 'endgame' | 'urgent';
type IntelSort = 'newest' | 'oldest' | 'value_high' | 'value_low' | 'source' | 'expiring';

interface IntelPanelProps {
  intelItems: IntelItem[];
  variant?: 'grid' | 'list' | 'ticker';
  showValue?: boolean;
  showFilters?: boolean;
  showExpirationIndicators?: boolean;
  onSelectIntel?: (intel: IntelItem) => void;
  onTradeIntel?: (intel: IntelItem) => void;
  maxHeight?: number;
  className?: string;
  currentRound?: number;
}

/**
 * IntelPanel - Advanced intel display with multiple view modes
 * 
 * Features:
 * - Grid, list, and ticker display modes
 * - Advanced filtering and sorting
 * - Value indicators and rarity highlighting
 * - Expiration tracking and indicators
 * - Smooth animations and transitions
 * - Interactive intel selection and trading
 * - Real-time updates
 */
export const IntelPanel: React.FC<IntelPanelProps> = ({
  intelItems,
  variant = 'grid',
  showValue = true,
  showFilters = true,
  showExpirationIndicators = true,
  onSelectIntel,
  onTradeIntel,
  maxHeight = 400,
  className,
  currentRound = 1,
}) => {
  const [selectedIntel, setSelectedIntel] = useState<string | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [filterType, setFilterType] = useState<IntelType>('all');
  const [sortBy, setSortBy] = useState<IntelSort>('newest');
  const [showExpired, setShowExpired] = useState(false);

  // Filtered and sorted intel items
  const filteredAndSortedIntel = useMemo(() => {
    let filtered = [...intelItems];
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(intel => {
        // Map intel sources to types for filtering
        const intelType = getIntelType(intel);
        return intelType === filterType;
      });
    }
    
    // Apply expiration filter
    if (!showExpired) {
      filtered = filtered.filter(intel => !isIntelExpired(intel, currentRound));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.roundGenerated - a.roundGenerated;
        case 'oldest':
          return a.roundGenerated - b.roundGenerated;
        case 'value_high':
          return calculateCurrentValue(b, currentRound) - calculateCurrentValue(a, currentRound);
        case 'value_low':
          return calculateCurrentValue(a, currentRound) - calculateCurrentValue(b, currentRound);
        case 'source':
          return a.source.localeCompare(b.source);
        case 'expiring':
          const aExpiration = getExpirationPriority(a, currentRound);
          const bExpiration = getExpirationPriority(b, currentRound);
          return bExpiration - aExpiration;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [intelItems, filterType, sortBy, showExpired, currentRound]);

  // Auto-advance ticker
  useEffect(() => {
    if (variant === 'ticker' && filteredAndSortedIntel.length > 0) {
      const interval = setInterval(() => {
        setTickerIndex((prev) => (prev + 1) % filteredAndSortedIntel.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [variant, filteredAndSortedIntel.length]);

  // Utility functions
  const getIntelType = (intel: IntelItem): IntelType => {
    // Determine intel type based on title and content keywords
    const title = intel.title.toLowerCase();
    const content = intel.content.toLowerCase();
    
    if (title.includes('market') || content.includes('market') || content.includes('trade') || content.includes('price')) return 'market_intel';
    if (title.includes('survey') || content.includes('survey') || content.includes('deposit') || content.includes('resource')) return 'survey_report';
    if (title.includes('crisis') || title.includes('warning') || title.includes('alert') || content.includes('crisis')) return 'crisis_warning';
    if (title.includes('discovery') || content.includes('discovered') || content.includes('found')) return 'discovery';
    if (title.includes('competitive') || title.includes('intelligence') || content.includes('colony') && content.includes('investment')) return 'competitive';
    if (title.includes('prediction') || content.includes('probability') || content.includes('forecast')) return 'prediction';
    if (title.includes('alien') || content.includes('alien') || content.includes('contact')) return 'alien';
    if (title.includes('strategy') || title.includes('victory') || content.includes('strategy')) return 'strategy';
    if (title.includes('alliance') || content.includes('alliance') || content.includes('alliance')) return 'alliance';
    if (title.includes('endgame') || title.includes('final') || content.includes('final')) return 'endgame';
    if (title.includes('urgent') || title.includes('last chance') || content.includes('urgent')) return 'urgent';
    
    return 'survey_report'; // Default fallback
  };

  const isIntelExpired = (intel: IntelItem, currentRound: number): boolean => {
    // Intel expires after 3 rounds or if explicitly marked as expired
    const age = currentRound - intel.roundGenerated;
    return age > 3;
  };

  const calculateCurrentValue = (intel: IntelItem, currentRound: number): number => {
    const age = currentRound - intel.roundGenerated;
    const agePenalty = Math.max(0, age * 0.1); // 10% per round
    const distributionPenalty = intel.distributionCount * 0.15; // 15% per distribution
    const totalPenalty = agePenalty + distributionPenalty;
    
    return Math.max(10, Math.floor(intel.value * (1 - totalPenalty)));
  };

  const getExpirationPriority = (intel: IntelItem, currentRound: number): number => {
    const age = currentRound - intel.roundGenerated;
    return Math.max(0, 3 - age); // Higher number means more urgent
  };

  const getExpirationStatus = (intel: IntelItem, currentRound: number): 'fresh' | 'aging' | 'stale' | 'expired' => {
    const age = currentRound - intel.roundGenerated;
    if (age > 3) return 'expired';
    if (age > 2) return 'stale';
    if (age > 1) return 'aging';
    return 'fresh';
  };

  // Get intel rarity color
  const getRarityColor = (value: number) => {
    if (value >= 200) return 'text-purple-400 border-purple-400/50';
    if (value >= 150) return 'text-amber-400 border-amber-400/50';
    if (value >= 100) return 'text-cyan-400 border-cyan-400/50';
    if (value >= 50) return 'text-green-400 border-green-400/50';
    return 'text-gray-400 border-gray-400/30';
  };

  // Get source icon
  const getSourceIcon = (source: IntelItem['source']) => {
    switch (source) {
      case 'scout': return '🔍';
      case 'communication': return '📡';
      case 'traded': return '🤝';
      default: return '📄';
    }
  };

  // Get expiration status indicator
  const getExpirationIndicator = (intel: IntelItem, currentRound: number) => {
    if (!showExpirationIndicators) return null;
    
    const status = getExpirationStatus(intel, currentRound);
    const age = currentRound - intel.roundGenerated;
    
    switch (status) {
      case 'fresh':
        return <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Fresh</span>;
      case 'aging':
        return <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Aging ({age}R)</span>;
      case 'stale':
        return <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded">Stale ({age}R)</span>;
      case 'expired':
        return <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">Expired ({age}R)</span>;
      default:
        return null;
    }
  };

  // Get intel type badge
  const getIntelTypeBadge = (intel: IntelItem) => {
    const type = getIntelType(intel);
    const typeColors: Record<IntelType, string> = {
      all: 'text-gray-400',
      market_intel: 'text-blue-400',
      survey_report: 'text-green-400',
      crisis_warning: 'text-red-400',
      discovery: 'text-purple-400',
      competitive: 'text-orange-400',
      prediction: 'text-cyan-400',
      alien: 'text-pink-400',
      strategy: 'text-amber-400',
      alliance: 'text-indigo-400',
      endgame: 'text-emerald-400',
      urgent: 'text-red-500'
    };
    
    return (
      <span className={cn('text-xs uppercase font-semibold', typeColors[type])}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  const handleSelectIntel = (intel: IntelItem) => {
    setSelectedIntel(intel.id);
    onSelectIntel?.(intel);
  };

  // Render filter controls
  const renderFilterControls = () => {
    if (!showFilters) return null;

    return (
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-gray-400 block mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as IntelType)}
              className="w-full bg-black/30 border border-purple-400/30 rounded px-2 py-1 text-xs text-white"
            >
              <option value="all">All Types</option>
              <option value="market_intel">Market Intel</option>
              <option value="survey_report">Survey Reports</option>
              <option value="crisis_warning">Crisis Warnings</option>
              <option value="discovery">Discoveries</option>
              <option value="competitive">Competitive</option>
              <option value="prediction">Predictions</option>
              <option value="alien">Alien</option>
              <option value="strategy">Strategy</option>
              <option value="alliance">Alliance</option>
              <option value="endgame">Endgame</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-gray-400 block mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as IntelSort)}
              className="w-full bg-black/30 border border-purple-400/30 rounded px-2 py-1 text-xs text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="value_high">Highest Value</option>
              <option value="value_low">Lowest Value</option>
              <option value="source">By Source</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-gray-400">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="w-3 h-3"
            />
            Show Expired Intel
          </label>
          <span className="text-gray-500">
            {filteredAndSortedIntel.length} of {intelItems.length} items
          </span>
        </div>
      </div>
    );
  };

  // Ticker variant
  if (variant === 'ticker') {
    const currentIntel = filteredAndSortedIntel[tickerIndex];
    
    return (
      <HUDFrame
        color="purple"
        variant="panel"
        className={cn('overflow-hidden', className)}
      >
        <div className="p-4">
          {renderFilterControls()}
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-space font-bold text-purple-400 uppercase tracking-wider">
              Intel Feed
            </h3>
            <div className="flex gap-1">
              {filteredAndSortedIntel.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all duration-300',
                    index === tickerIndex ? 'bg-purple-400 w-4' : 'bg-purple-400/30'
                  )}
                />
              ))}
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            {currentIntel && (
              <motion.div
                key={currentIntel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="cursor-pointer"
                onClick={() => handleSelectIntel(currentIntel)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getSourceIcon(currentIntel.source)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn('font-semibold', getRarityColor(calculateCurrentValue(currentIntel, currentRound)))}>
                        {currentIntel.title}
                      </h4>
                      {getExpirationIndicator(currentIntel, currentRound)}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {getIntelTypeBadge(currentIntel)}
                      <span className="text-xs text-gray-500">Round {currentIntel.roundGenerated}</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                      {currentIntel.content}
                    </p>
                    {showValue && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Value:</span>
                          <span className={cn('text-sm font-mono font-bold', getRarityColor(calculateCurrentValue(currentIntel, currentRound)))}>
                            {calculateCurrentValue(currentIntel, currentRound)} CR
                          </span>
                          {calculateCurrentValue(currentIntel, currentRound) !== currentIntel.value && (
                            <span className="text-xs text-gray-500 line-through">
                              {currentIntel.value}
                            </span>
                          )}
                        </div>
                        {onTradeIntel && (
                          <Button
                            size="sm"
                            variant="glass"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTradeIntel(currentIntel);
                            }}
                            className="text-xs"
                          >
                            Trade
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {filteredAndSortedIntel.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No intel matches current filters</p>
            </div>
          )}
        </div>
      </HUDFrame>
    );
  }

  // Grid variant
  if (variant === 'grid') {
    return (
      <HUDFrame
        color="purple"
        variant="panel"
        className={cn('overflow-hidden', className)}
      >
        <div className="p-4">
          <h3 className="text-lg font-space font-bold text-purple-400 mb-3">
            Intelligence Reports
          </h3>
          
          {renderFilterControls()}
          
          <div 
            className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar"
            style={{ maxHeight }}
          >
            <AnimatePresence>
              {filteredAndSortedIntel.map((intel, index) => {
                const currentValue = calculateCurrentValue(intel, currentRound);
                const expirationStatus = getExpirationStatus(intel, currentRound);
                
                return (
                  <motion.div
                    key={intel.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all duration-200',
                      'bg-purple-900/20 backdrop-blur-sm',
                      getRarityColor(currentValue),
                      selectedIntel === intel.id && 'ring-2 ring-purple-400',
                      'hover:bg-purple-900/30',
                      expirationStatus === 'expired' && 'opacity-60'
                    )}
                    onClick={() => handleSelectIntel(intel)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getSourceIcon(intel.source)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">
                          {intel.title}
                        </h4>
                        <div className="flex items-center gap-1 mt-1">
                          {getIntelTypeBadge(intel)}
                          {getExpirationIndicator(intel, currentRound)}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                      {intel.content}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Round {intel.roundGenerated}</span>
                      {intel.distributionCount > 0 && (
                        <span className="text-orange-400">Shared {intel.distributionCount}x</span>
                      )}
                    </div>
                    
                    {showValue && (
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Value:</span>
                          <span className={cn('text-sm font-mono font-bold', getRarityColor(currentValue))}>
                            {currentValue}
                          </span>
                          {currentValue !== intel.value && (
                            <span className="text-xs text-gray-500 line-through">
                              {intel.value}
                            </span>
                          )}
                        </div>
                        {onTradeIntel && (
                          <Button
                            size="sm"
                            variant="glass"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTradeIntel(intel);
                            }}
                            className="text-xs px-2 py-1"
                          >
                            Trade
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {filteredAndSortedIntel.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No intel matches current filters</p>
              <p className="text-xs mt-1">Try adjusting your filter settings</p>
            </div>
          )}
        </div>
        
      </HUDFrame>
    );
  }

  // List variant
  return (
    <HUDFrame
      color="purple"
      variant="panel"
      className={cn('overflow-hidden', className)}
    >
      <div className="p-4">
        <h3 className="text-lg font-space font-bold text-purple-400 mb-3">
          Intelligence Database
        </h3>
        
        {renderFilterControls()}
        
        <div 
          className="space-y-2 overflow-y-auto custom-scrollbar"
          style={{ maxHeight }}
        >
          <AnimatePresence>
            {filteredAndSortedIntel.map((intel, index) => {
              const currentValue = calculateCurrentValue(intel, currentRound);
              const expirationStatus = getExpirationStatus(intel, currentRound);
              
              return (
                <motion.div
                  key={intel.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-all duration-200',
                    'bg-purple-900/20 backdrop-blur-sm',
                    getRarityColor(currentValue),
                    selectedIntel === intel.id && 'ring-2 ring-purple-400',
                    'hover:bg-purple-900/30',
                    expirationStatus === 'expired' && 'opacity-60'
                  )}
                  onClick={() => handleSelectIntel(intel)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-1">{getSourceIcon(intel.source)}</span>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{intel.title}</h4>
                            {getExpirationIndicator(intel, currentRound)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getIntelTypeBadge(intel)}
                            <span className="text-xs text-gray-500">Round {intel.roundGenerated}</span>
                          </div>
                        </div>
                        
                        {showValue && (
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className={cn('text-sm font-mono font-bold', getRarityColor(currentValue))}>
                                {currentValue} CR
                              </span>
                              {currentValue !== intel.value && (
                                <span className="text-xs text-gray-500 line-through">
                                  {intel.value}
                                </span>
                              )}
                            </div>
                            {onTradeIntel && (
                              <Button
                                size="sm"
                                variant="glass"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTradeIntel(intel);
                                }}
                                className="text-xs mt-1"
                              >
                                Trade
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-2">
                        {intel.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>Source: {intel.source}</span>
                          {intel.distributionCount > 0 && (
                            <span className="text-orange-400">Shared {intel.distributionCount}x</span>
                          )}
                        </div>
                        <span>Age: {currentRound - intel.roundGenerated} rounds</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {filteredAndSortedIntel.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p>No intel matches current filters</p>
            <p className="text-xs mt-1">Try adjusting your filter settings</p>
          </div>
        )}
      </div>
      
    </HUDFrame>
  );
};

IntelPanel.displayName = 'IntelPanel';

export default IntelPanel;