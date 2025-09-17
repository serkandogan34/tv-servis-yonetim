// System Performance Monitoring and Metrics
import { SystemLogger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percent';
  timestamp: number;
  labels?: Record<string, string>;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static activeTimers: Map<string, number> = new Map();

  // Start timing an operation
  static startTimer(operationName: string, labels?: Record<string, string>): string {
    const timerId = `${operationName}_${Date.now()}_${Math.random()}`;
    this.activeTimers.set(timerId, Date.now());
    
    if (labels) {
      this.activeTimers.set(`${timerId}_labels`, labels as any);
    }
    
    return timerId;
  }

  // End timing and record metric
  static endTimer(timerId: string): number {
    const startTime = this.activeTimers.get(timerId);
    if (!startTime) {
      SystemLogger.warn('Monitoring', `Timer not found: ${timerId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    const labels = this.activeTimers.get(`${timerId}_labels`) as Record<string, string>;
    
    const operationName = timerId.split('_')[0];
    this.recordMetric({
      name: `${operationName}_duration`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      labels
    });

    // Clean up
    this.activeTimers.delete(timerId);
    if (labels) {
      this.activeTimers.delete(`${timerId}_labels`);
    }

    return duration;
  }

  // Record a custom metric
  static recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Log slow operations
    if (metric.unit === 'ms' && metric.value > 1000) {
      SystemLogger.warn('Performance', `Slow operation detected: ${metric.name}`, {
        duration: metric.value,
        labels: metric.labels
      });
    }

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  // Get metrics for a specific operation
  static getMetrics(name?: string, since?: number): PerformanceMetric[] {
    let filtered = this.metrics;
    
    if (name) {
      filtered = filtered.filter(m => m.name.includes(name));
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }
    
    return filtered;
  }

  // Get performance summary
  static getSummary(since?: number): Record<string, any> {
    const metrics = this.getMetrics(undefined, since);
    const summary: Record<string, any> = {};
    
    // Group by operation name
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics
    Object.keys(grouped).forEach(name => {
      const values = grouped[name];
      summary[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p95: this.calculatePercentile(values, 95),
        p99: this.calculatePercentile(values, 99)
      };
    });

    return summary;
  }

  private static calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // Memory usage monitoring
  static getMemoryUsage(): Record<string, number> {
    // In Cloudflare Workers, memory info is limited
    return {
      timestamp: Date.now(),
      // These would be available in Node.js environment
      heapUsed: 0,
      heapTotal: 0,
      external: 0
    };
  }

  // Database performance monitoring
  static async monitorDatabaseQuery<T>(
    queryName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const timerId = this.startTimer('db_query', { query: queryName });
    
    try {
      const result = await operation();
      const duration = this.endTimer(timerId);
      
      this.recordMetric({
        name: 'db_query_success',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        labels: { query: queryName }
      });

      return result;
    } catch (error) {
      this.endTimer(timerId);
      
      this.recordMetric({
        name: 'db_query_error',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        labels: { query: queryName, error: error.message }
      });
      
      throw error;
    }
  }

  // API endpoint monitoring
  static monitorApiEndpoint(endpoint: string) {
    return async (c: any, next: any) => {
      const timerId = this.startTimer('api_request', { endpoint });
      
      try {
        await next();
        
        const duration = this.endTimer(timerId);
        const status = c.res.status;
        
        this.recordMetric({
          name: 'api_request_success',
          value: 1,
          unit: 'count',
          timestamp: Date.now(),
          labels: { endpoint, status: status.toString() }
        });
        
      } catch (error) {
        this.endTimer(timerId);
        
        this.recordMetric({
          name: 'api_request_error',
          value: 1,
          unit: 'count',
          timestamp: Date.now(),
          labels: { endpoint, error: error.message }
        });
        
        throw error;
      }
    };
  }

  // System health check
  static async healthCheck(): Promise<Record<string, any>> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentMetrics = this.getMetrics(undefined, oneMinuteAgo);
    const summary = this.getSummary(oneMinuteAgo);
    
    const errorCount = recentMetrics.filter(m => m.name.includes('error')).length;
    const requestCount = recentMetrics.filter(m => m.name.includes('request')).length;
    
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
    
    return {
      status: errorRate < 5 ? 'healthy' : errorRate < 20 ? 'degraded' : 'unhealthy',
      timestamp: now,
      metrics: {
        errorRate: errorRate.toFixed(2),
        requestCount,
        errorCount
      },
      summary
    };
  }

  // Clear old metrics
  static cleanup(olderThan?: number) {
    const threshold = olderThan || (Date.now() - 3600000); // 1 hour ago
    this.metrics = this.metrics.filter(m => m.timestamp >= threshold);
    SystemLogger.info('Monitoring', 'Metrics cleanup completed', {
      remaining: this.metrics.length
    });
  }
}

// Middleware for automatic API monitoring
export function performanceMonitoring() {
  return async (c: any, next: any) => {
    const endpoint = `${c.req.method} ${c.req.path}`;
    const monitor = PerformanceMonitor.monitorApiEndpoint(endpoint);
    return await monitor(c, next);
  };
}