import { performance } from 'perf_hooks';
import { vi } from 'vitest';

interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsed: number;
  renderCount: number;
}

// Track component render performance
export class ComponentPerformanceTracker {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    updateTime: 0,
    memoryUsed: 0,
    renderCount: 0,
  };
  
  private startTime: number = 0;
  private updateStartTime: number = 0;

  startRender() {
    this.startTime = performance.now();
    this.metrics.renderCount++;
  }

  endRender() {
    if (this.startTime) {
      this.metrics.renderTime += performance.now() - this.startTime;
      this.startTime = 0;
    }
  }

  startUpdate() {
    this.updateStartTime = performance.now();
  }

  endUpdate() {
    if (this.updateStartTime) {
      this.metrics.updateTime += performance.now() - this.updateStartTime;
      this.updateStartTime = 0;
    }
  }

  measureMemory() {
    if ('memory' in performance) {
      this.metrics.memoryUsed = (performance as any).memory.usedJSHeapSize;
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAverageRenderTime(): number {
    return this.metrics.renderCount > 0 
      ? this.metrics.renderTime / this.metrics.renderCount 
      : 0;
  }

  reset() {
    this.metrics = {
      renderTime: 0,
      updateTime: 0,
      memoryUsed: 0,
      renderCount: 0,
    };
    this.startTime = 0;
    this.updateStartTime = 0;
  }
}

// Measure function execution time
export const measureExecutionTime = async <T>(
  fn: () => T | Promise<T>,
  label: string = 'Function'
): Promise<{ result: T; time: number }> => {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  
  console.log(`${label} took ${time.toFixed(2)}ms`);
  
  return { result, time };
};

// Measure render performance
export const measureRenderPerformance = (
  Component: React.ComponentType,
  iterations: number = 10
) => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    // Render component (implementation depends on test framework)
    const end = performance.now();
    times.push(end - start);
  }
  
  return {
    average: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    times,
  };
};

// Memory leak detector
export class MemoryLeakDetector {
  private snapshots: number[] = [];
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 100) {
    if ('memory' in performance) {
      this.interval = setInterval(() => {
        this.snapshots.push((performance as any).memory.usedJSHeapSize);
      }, intervalMs);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  analyze(): {
    leak: boolean;
    trend: 'increasing' | 'stable' | 'decreasing';
    averageGrowth: number;
  } {
    if (this.snapshots.length < 10) {
      return { leak: false, trend: 'stable', averageGrowth: 0 };
    }

    // Calculate growth rate
    const growthRates: number[] = [];
    for (let i = 1; i < this.snapshots.length; i++) {
      growthRates.push(this.snapshots[i] - this.snapshots[i - 1]);
    }

    const averageGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const trend = averageGrowth > 1000 ? 'increasing' : 
                  averageGrowth < -1000 ? 'decreasing' : 'stable';
    
    // Consider it a leak if memory consistently grows
    const leak = trend === 'increasing' && averageGrowth > 10000;

    return { leak, trend, averageGrowth };
  }

  reset() {
    this.snapshots = [];
  }
}

// FPS counter for animations
export class FPSCounter {
  private frameCount = 0;
  private startTime = performance.now();
  private fps = 0;

  update() {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount / elapsed) * 1000);
      this.frameCount = 0;
      this.startTime = currentTime;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  reset() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.fps = 0;
  }
}

// Performance benchmarks
export const performanceBenchmarks = {
  RENDER_TIME_THRESHOLD: 16.67, // 60 FPS
  UPDATE_TIME_THRESHOLD: 100, // 100ms for updates
  MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB
  BUNDLE_SIZE_LIMIT: 500 * 1024, // 500KB
};

// Assert performance metrics
export const assertPerformance = (
  metrics: Partial<PerformanceMetrics>,
  thresholds: Partial<typeof performanceBenchmarks> = performanceBenchmarks
) => {
  if (metrics.renderTime !== undefined && thresholds.RENDER_TIME_THRESHOLD) {
    expect(metrics.renderTime).toBeLessThan(thresholds.RENDER_TIME_THRESHOLD);
  }
  
  if (metrics.updateTime !== undefined && thresholds.UPDATE_TIME_THRESHOLD) {
    expect(metrics.updateTime).toBeLessThan(thresholds.UPDATE_TIME_THRESHOLD);
  }
  
  if (metrics.memoryUsed !== undefined && thresholds.MEMORY_LIMIT) {
    expect(metrics.memoryUsed).toBeLessThan(thresholds.MEMORY_LIMIT);
  }
};

// Mock performance observer
export const mockPerformanceObserver = () => {
  const entries: PerformanceEntry[] = [];
  
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn().mockReturnValue(entries),
  }));

  return {
    addEntry: (entry: Partial<PerformanceEntry>) => {
      entries.push({
        name: entry.name || 'test',
        entryType: entry.entryType || 'measure',
        startTime: entry.startTime || 0,
        duration: entry.duration || 0,
        toJSON: () => ({}),
      } as PerformanceEntry);
    },
    clearEntries: () => {
      entries.length = 0;
    },
  };
};