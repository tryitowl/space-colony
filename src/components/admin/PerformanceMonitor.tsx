import React, { useState, useEffect } from 'react';
import { useCacheStats } from '../../hooks/useCache';
import { cacheService, sessionCache, teamCache, tradeCache } from '../../services/cacheService';
import { GlassPanel } from '../ui/GlassPanel';
import { CircularGauge } from '../ui/CircularGauge';
import { DataVisualization } from '../ui/DataVisualization';
import HUDFrame from '../ui/HUDFrame';
import { Button } from '../ui/Button';
import { Activity, Database, Zap, TrendingUp, RefreshCw } from 'lucide-react';

interface PerformanceMetrics {
  firestoreReads: number;
  firestoreWrites: number;
  realtimeDbReads: number;
  realtimeDbWrites: number;
  cacheHitRate: number;
  avgResponseTime: number;
  activeConnections: number;
  memoryUsage: number;
}

export const PerformanceMonitor: React.FC = () => {
  const cacheStats = useCacheStats();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    firestoreReads: 0,
    firestoreWrites: 0,
    realtimeDbReads: 0,
    realtimeDbWrites: 0,
    cacheHitRate: 0,
    avgResponseTime: 0,
    activeConnections: 0,
    memoryUsage: 0
  });
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  // Simulate metrics updates (in production, these would come from monitoring service)
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        firestoreReads: prev.firestoreReads + Math.floor(Math.random() * 10),
        firestoreWrites: prev.firestoreWrites + Math.floor(Math.random() * 3),
        realtimeDbReads: prev.realtimeDbReads + Math.floor(Math.random() * 20),
        realtimeDbWrites: prev.realtimeDbWrites + Math.floor(Math.random() * 5),
        cacheHitRate: cacheStats.hitRate,
        avgResponseTime: 50 + Math.random() * 100,
        activeConnections: 20 + Math.floor(Math.random() * 30),
        memoryUsage: 40 + Math.random() * 20
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [cacheStats.hitRate]);

  const clearAllCaches = () => {
    if (confirm('Clear all caches? This will force fresh data loads.')) {
      cacheService.clear();
      sessionCache.clear();
      teamCache.clear();
      tradeCache.clear();
    }
  };

  const getCacheSizes = () => {
    return [
      { label: 'General', value: cacheService.getStats().size },
      { label: 'Sessions', value: sessionCache.getStats().size },
      { label: 'Teams', value: teamCache.getStats().size },
      { label: 'Trades', value: tradeCache.getStats().size }
    ];
  };

  const getOperationCosts = () => {
    const readCost = 0.00004; // $0.04 per 100k reads
    const writeCost = 0.00012; // $0.12 per 100k writes
    
    return {
      firestoreReadCost: (metrics.firestoreReads * readCost).toFixed(4),
      firestoreWriteCost: (metrics.firestoreWrites * writeCost).toFixed(4),
      totalCost: ((metrics.firestoreReads * readCost) + (metrics.firestoreWrites * writeCost)).toFixed(4)
    };
  };

  const costs = getOperationCosts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-primary to-purple-secondary">
              Performance Monitor
            </h2>
            <p className="text-text-secondary mt-1">
              Real-time system performance and optimization metrics
            </p>
          </div>
          <div className="flex space-x-2">
            {(['1h', '24h', '7d'] as const).map(range => (
              <Button
                key={range}
                onClick={() => setTimeRange(range)}
                variant={timeRange === range ? 'primary' : 'glass'}
                size="sm"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HUDFrame variant="panel" color="cyan" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-cyan-primary" />
            <span className="text-xs text-text-secondary">Response Time</span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-cyan-primary">
            {metrics.avgResponseTime.toFixed(0)}ms
          </div>
          <div className="text-xs text-success-green mt-1">↓ 15% from avg</div>
        </HUDFrame>

        <HUDFrame variant="panel" color="purple" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-purple-secondary" />
            <span className="text-xs text-text-secondary">Cache Hit Rate</span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-purple-secondary">
            {(cacheStats.hitRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {cacheStats.hits} hits / {cacheStats.hits + cacheStats.misses} total
          </div>
        </HUDFrame>

        <HUDFrame variant="panel" color="amber" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-warning-orange" />
            <span className="text-xs text-text-secondary">Active Users</span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-warning-orange">
            {metrics.activeConnections}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {Math.floor(metrics.activeConnections / 4)} active teams
          </div>
        </HUDFrame>

        <HUDFrame variant="panel" color="green" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-success-green" />
            <span className="text-xs text-text-secondary">Est. Cost</span>
          </div>
          <div className="text-2xl font-orbitron font-bold text-success-green">
            ${costs.totalCost}
          </div>
          <div className="text-xs text-text-secondary mt-1">Last {timeRange}</div>
        </HUDFrame>
      </div>

      {/* Performance Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="p-6">
          <h3 className="text-xl font-orbitron font-bold text-cyan-primary mb-4">
            System Resources
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <CircularGauge
              value={metrics.memoryUsage}
              maxValue={100}
              label="Memory Usage"
              unit="%"
              variant={metrics.memoryUsage > 80 ? 'danger' : metrics.memoryUsage > 60 ? 'warning' : 'success'}
            />
            <CircularGauge
              value={metrics.activeConnections}
              maxValue={100}
              label="Connections"
              variant="primary"
            />
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-xl font-orbitron font-bold text-purple-secondary mb-4">
            Cache Performance
          </h3>
          <DataVisualization
            title="Cache Distribution"
            data={getCacheSizes()}
            maxValue={100}
            variant="secondary"
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={clearAllCaches}
              variant="danger"
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear All Caches
            </Button>
          </div>
        </GlassPanel>
      </div>

      {/* Database Operations */}
      <GlassPanel className="p-6">
        <h3 className="text-xl font-orbitron font-bold text-cyan-primary mb-4">
          Database Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-3">Firestore</h4>
            <DataVisualization
              title="Operations"
              data={[
                { label: 'Reads', value: metrics.firestoreReads },
                { label: 'Writes', value: metrics.firestoreWrites }
              ]}
              variant="primary"
              horizontal
            />
            <div className="mt-2 text-sm text-text-secondary">
              Cost: ${costs.firestoreReadCost} (reads) + ${costs.firestoreWriteCost} (writes)
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-3">Realtime Database</h4>
            <DataVisualization
              title="Operations"
              data={[
                { label: 'Reads', value: metrics.realtimeDbReads },
                { label: 'Writes', value: metrics.realtimeDbWrites }
              ]}
              variant="secondary"
              horizontal
            />
            <div className="mt-2 text-sm text-text-secondary">
              Bandwidth: ~{((metrics.realtimeDbReads + metrics.realtimeDbWrites) * 0.5).toFixed(1)}KB
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Optimization Recommendations */}
      <HUDFrame variant="panel" color="amber" className="p-6">
        <h3 className="text-xl font-orbitron font-bold text-warning-orange mb-4">
          Optimization Recommendations
        </h3>
        <div className="space-y-3">
          {cacheStats.hitRate < 0.7 && (
            <div className="flex items-start space-x-3">
              <span className="text-warning-orange">•</span>
              <div>
                <p className="text-sm">Low cache hit rate detected ({(cacheStats.hitRate * 100).toFixed(1)}%)</p>
                <p className="text-xs text-text-secondary mt-1">
                  Consider increasing cache TTL or pre-fetching frequently accessed data
                </p>
              </div>
            </div>
          )}
          
          {metrics.firestoreWrites > 100 && (
            <div className="flex items-start space-x-3">
              <span className="text-warning-orange">•</span>
              <div>
                <p className="text-sm">High Firestore write rate ({metrics.firestoreWrites} writes)</p>
                <p className="text-xs text-text-secondary mt-1">
                  Consider batching writes or using Realtime Database for high-frequency updates
                </p>
              </div>
            </div>
          )}
          
          {metrics.avgResponseTime > 100 && (
            <div className="flex items-start space-x-3">
              <span className="text-warning-orange">•</span>
              <div>
                <p className="text-sm">Response time above target ({metrics.avgResponseTime.toFixed(0)}ms)</p>
                <p className="text-xs text-text-secondary mt-1">
                  Review slow queries and consider adding database indexes
                </p>
              </div>
            </div>
          )}
        </div>
      </HUDFrame>
    </div>
  );
};

export default PerformanceMonitor;