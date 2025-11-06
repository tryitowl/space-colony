import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HUDFrame } from '../ui/HUDFrame';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { 
  MarketData 
} from '../../services/marketFluctuationService';
import type { Resources } from '../../types/game';

interface MarketIndicatorsProps {
  marketData: MarketData | null;
  className?: string;
  onResourceSelect?: (resource: keyof Resources) => void;
  selectedResource?: keyof Resources;
  compact?: boolean;
}

export const MarketIndicators: React.FC<MarketIndicatorsProps> = ({
  marketData,
  className,
  onResourceSelect,
  selectedResource,
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState<'prices' | 'trends' | 'events'>('prices');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'volume'>('change');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (!marketData) {
    return (
      <HUDFrame className={cn("p-4", className)}>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            Market Data Loading
          </h3>
          <p className="text-gray-500 text-sm">
            Initializing market analysis systems...
          </p>
        </div>
      </HUDFrame>
    );
  }

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 2) return '📈';
    if (change < -2) return '📉';
    return '➡️';
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising': return '⬆️';
      case 'falling': return '⬇️';
      case 'stable': return '➡️';
    }
  };

  const getVolatilityColor = (volatility: number) => {
    if (volatility > 0.3) return 'text-red-400';
    if (volatility > 0.15) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getDemandSupplyColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
    }
  };

  const formatResourceName = (resource: string) => {
    return resource.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const sortedResources = Object.entries(marketData.resourcePrices).sort((a, b) => {
    const [nameA, priceA] = a;
    const [nameB, priceB] = b;
    
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = nameA.localeCompare(nameB);
        break;
      case 'price':
        comparison = priceA.currentPrice - priceB.currentPrice;
        break;
      case 'change':
        comparison = priceA.priceChange - priceB.priceChange;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const activeMarketEvents = marketData.marketEvents.filter(event => event.isActive);

  if (compact) {
    return (
      <GlassPanel className={cn("p-3", className)}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Market</h3>
            <div className="flex items-center space-x-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                getVolatilityColor(marketData.volatilityIndex)
              )}>
                {marketData.volatilityIndex > 0.3 ? 'High' : 
                 marketData.volatilityIndex > 0.15 ? 'Med' : 'Low'} Vol
              </span>
              {activeMarketEvents.length > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
                  {activeMarketEvents.length} Events
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {sortedResources.slice(0, 4).map(([resource, pricing]) => (
              <div 
                key={resource}
                className={cn(
                  "flex items-center justify-between p-1 rounded cursor-pointer hover:bg-white/5",
                  selectedResource === resource && "bg-cyan-400/20"
                )}
                onClick={() => onResourceSelect?.(resource as keyof Resources)}
              >
                <span className="text-gray-300 truncate">
                  {formatResourceName(resource).slice(0, 8)}
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-white">
                    {pricing.currentPrice.toFixed(0)}
                  </span>
                  <span className={getPriceChangeColor(pricing.priceChange)}>
                    {pricing.priceChange > 0 ? '+' : ''}{pricing.priceChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <HUDFrame className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            📊 Market Analysis
          </h2>
          <div className="flex items-center space-x-3">
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-semibold",
              getVolatilityColor(marketData.volatilityIndex),
              "bg-gray-800/50 border border-current/30"
            )}>
              Volatility: {(marketData.volatilityIndex * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-400">
              Round {marketData.round}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
          {(['prices', 'trends', 'events'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 capitalize",
                activeTab === tab && "bg-cyan-500/20 text-cyan-300"
              )}
            >
              {tab}
              {tab === 'events' && activeMarketEvents.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-300 rounded-full">
                  {activeMarketEvents.length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'prices' && (
              <motion.div
                key="prices"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Sort Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'change' | 'price' | 'volume')}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                    >
                      <option value="change">Price Change</option>
                      <option value="price">Current Price</option>
                      <option value="name">Name</option>
                    </select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                </div>

                {/* Price Table */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sortedResources.map(([resource, pricing], index) => (
                    <motion.div
                      key={resource}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassPanel
                        className={cn(
                          "p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                          selectedResource === resource && "border-cyan-400/50 bg-cyan-400/10"
                        )}
                        onClick={() => onResourceSelect?.(resource as keyof Resources)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-white">
                                {formatResourceName(resource)}
                              </span>
                              {getTrendIcon(pricing.trend)}
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-400">Demand:</span>
                                <span className={getDemandSupplyColor(pricing.demandLevel)}>
                                  {pricing.demandLevel}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-400">Supply:</span>
                                <span className={getDemandSupplyColor(pricing.supplyLevel)}>
                                  {pricing.supplyLevel}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-400">Vol:</span>
                                <span className={getVolatilityColor(pricing.volatility)}>
                                  {(pricing.volatility * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white mb-1">
                              {pricing.currentPrice.toFixed(1)}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={getPriceChangeColor(pricing.priceChange)}>
                                {pricing.priceChange > 0 ? '+' : ''}{pricing.priceChange.toFixed(1)}%
                              </span>
                              <span className="text-sm">
                                {getPriceChangeIcon(pricing.priceChange)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              Base: {pricing.basePrice}
                            </div>
                          </div>
                        </div>
                      </GlassPanel>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'trends' && (
              <motion.div
                key="trends"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {marketData.marketTrends.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📈</div>
                    <p className="text-gray-400">No significant market trends detected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {marketData.marketTrends.map((trend, index) => (
                      <motion.div
                        key={`${trend.resourceType}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <GlassPanel className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-white">
                              {formatResourceName(trend.resourceType)}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-bold",
                                trend.direction === 'up' ? "bg-green-500/20 text-green-300" :
                                trend.direction === 'down' ? "bg-red-500/20 text-red-300" :
                                "bg-gray-500/20 text-gray-300"
                              )}>
                                {trend.direction.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-400">
                                {trend.duration} rounds
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Strength:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-500",
                                      trend.direction === 'up' ? "bg-green-400" : "bg-red-400"
                                    )}
                                    style={{ width: `${trend.strength * 100}%` }}
                                  />
                                </div>
                                <span className="text-white">
                                  {(trend.strength * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Cause:</span>
                              <span className="text-cyan-300 capitalize">
                                {trend.cause.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </GlassPanel>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {activeMarketEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🟢</div>
                    <p className="text-gray-400">No active market events</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeMarketEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <GlassPanel className="p-4 border-yellow-400/30 bg-yellow-400/5">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-yellow-300 mb-1">
                                  🚨 {event.title}
                                </h4>
                                <p className="text-gray-300 text-sm">
                                  {event.description}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">
                                  Expires in: {Math.ceil((event.timestamp + event.duration - Date.now()) / 60000)}m
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="text-sm text-gray-400">Affected Resources:</div>
                              <div className="flex flex-wrap gap-2">
                                {event.affectedResources.map(resource => (
                                  <span 
                                    key={resource}
                                    className="px-2 py-1 bg-gray-800/50 border border-gray-600/50 rounded text-xs text-gray-300"
                                  >
                                    {formatResourceName(resource)}
                                  </span>
                                ))}
                              </div>
                              
                              <div className="text-sm text-gray-400">Price Effects:</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(event.priceMultipliers).map(([resource, multiplier]) => (
                                  <div key={resource} className="flex justify-between text-xs">
                                    <span className="text-gray-300 capitalize">
                                      {formatResourceName(resource)}:
                                    </span>
                                    <span className={cn(
                                      "font-semibold",
                                      multiplier > 1 ? "text-green-400" : "text-red-400"
                                    )}>
                                      {multiplier > 1 ? '+' : ''}{((multiplier - 1) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </GlassPanel>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </HUDFrame>
  );
};