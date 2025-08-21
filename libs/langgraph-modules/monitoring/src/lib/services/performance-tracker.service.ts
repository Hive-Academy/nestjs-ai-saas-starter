import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  IPerformanceTracker,
  ResourceUtilization,
  Anomaly,
  PerformanceBaseline,
  TrendAnalysis,
  TimeRange,
} from '../interfaces/monitoring.interface';

/**
 * PerformanceTrackerService - Performance metrics analysis and anomaly detection
 * 
 * Features:
 * - Workflow execution performance tracking
 * - Statistical baseline establishment using sliding windows
 * - Anomaly detection with statistical and rule-based approaches
 * - Performance trend analysis with confidence scoring
 * - Resource utilization monitoring
 * - Capacity planning insights
 */
@Injectable()
export class PerformanceTrackerService implements IPerformanceTracker, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceTrackerService.name);
  private readonly performanceData = new Map<string, number[]>();
  private readonly resourceData = new Map<string, ResourceUtilization[]>();
  private readonly baselines = new Map<string, PerformanceBaseline>();
  private readonly anomalies = new Map<string, Anomaly[]>();
  private readonly maxDataPoints = 1000;
  private readonly baselineMinSamples = 30;
  private readonly anomalyThreshold = 2.5; // Standard deviations

  constructor() {
    this.logger.log('PerformanceTrackerService initialized');
  }

  // ================================
  // PERFORMANCE TRACKING
  // ================================

  async trackExecution(
    name: string, 
    duration: number, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Store performance data
      const data = this.performanceData.get(name) || [];
      data.push(duration);
      
      // Limit data points for memory efficiency
      if (data.length > this.maxDataPoints) {
        data.shift(); // Remove oldest data point
      }
      
      this.performanceData.set(name, data);
      
      // Update baseline if we have enough data
      if (data.length >= this.baselineMinSamples) {
        await this.updateBaseline(name, data);
      }
      
      // Check for anomalies
      if (data.length >= this.baselineMinSamples) {
        await this.checkForAnomalies(name, duration);
      }
      
      this.logger.debug(`Performance tracked: ${name} = ${duration}ms`, {
        metric: name,
        duration,
        dataPoints: data.length,
        metadata,
      });
    } catch (error) {
      this.logger.error(`Failed to track performance for ${name}:`, error);
    }
  }

  async trackMemoryUsage(name: string, usage: number): Promise<void> {
    try {
      const resourceUtil: ResourceUtilization = {
        cpu: 0, // Would be measured from system
        memory: usage,
        disk: 0, // Would be measured from system
        network: 0, // Would be measured from system
      };
      
      await this.trackResourceUtilization(name, resourceUtil);
    } catch (error) {
      this.logger.error(`Failed to track memory usage for ${name}:`, error);
    }
  }

  async trackResourceUtilization(name: string, utilization: ResourceUtilization): Promise<void> {
    try {
      const data = this.resourceData.get(name) || [];
      data.push({
        ...utilization,
      });
      
      // Limit data points
      if (data.length > this.maxDataPoints) {
        data.shift();
      }
      
      this.resourceData.set(name, data);
      
      this.logger.debug(`Resource utilization tracked: ${name}`, {
        metric: name,
        cpu: utilization.cpu,
        memory: utilization.memory,
        dataPoints: data.length,
      });
    } catch (error) {
      this.logger.error(`Failed to track resource utilization for ${name}:`, error);
    }
  }

  // ================================
  // ANOMALY DETECTION
  // ================================

  async detectAnomalies(metric: string): Promise<Anomaly[]> {
    try {
      const anomalies = this.anomalies.get(metric) || [];
      return [...anomalies]; // Return copy to prevent mutations
    } catch (error) {
      this.logger.error(`Failed to detect anomalies for ${metric}:`, error);
      return [];
    }
  }

  // ================================
  // BASELINE AND TREND ANALYSIS
  // ================================

  async getPerformanceBaseline(metric: string): Promise<PerformanceBaseline> {
    const baseline = this.baselines.get(metric);
    if (!baseline) {
      throw new Error(`No baseline found for metric: ${metric}`);
    }
    return baseline;
  }

  async analyzePerformanceTrend(metric: string, timeRange: TimeRange): Promise<TrendAnalysis> {
    try {
      const data = this.performanceData.get(metric) || [];
      
      if (data.length < 10) {
        return {
          metric,
          timeRange,
          trend: 'stable',
          changeRate: 0,
          confidence: 0,
          dataPoints: data.length,
        };
      }
      
      // Simple linear regression for trend analysis
      const trend = this.calculateTrend(data);
      
      return {
        metric,
        timeRange,
        trend: trend.direction,
        changeRate: trend.slope,
        confidence: trend.confidence,
        dataPoints: data.length,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze trend for ${metric}:`, error);
      
      // Return neutral trend on error
      return {
        metric,
        timeRange,
        trend: 'stable',
        changeRate: 0,
        confidence: 0,
        dataPoints: 0,
      };
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * Update performance baseline for a metric
   */
  private async updateBaseline(name: string, data: number[]): Promise<void> {
    try {
      const sortedData = [...data].sort((a, b) => a - b);
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Calculate percentiles
      const p95Index = Math.floor(sortedData.length * 0.95);
      const p99Index = Math.floor(sortedData.length * 0.99);
      const medianIndex = Math.floor(sortedData.length * 0.5);
      
      const baseline: PerformanceBaseline = {
        metric: name,
        mean: Math.round(mean * 100) / 100,
        median: sortedData[medianIndex],
        p95: sortedData[p95Index],
        p99: sortedData[p99Index],
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        sampleSize: data.length,
        lastUpdated: new Date(),
      };
      
      this.baselines.set(name, baseline);
      
      this.logger.debug(`Baseline updated for ${name}:`, {
        mean: baseline.mean,
        p95: baseline.p95,
        p99: baseline.p99,
        sampleSize: baseline.sampleSize,
      });
    } catch (error) {
      this.logger.error(`Failed to update baseline for ${name}:`, error);
    }
  }

  /**
   * Check for performance anomalies
   */
  private async checkForAnomalies(name: string, value: number): Promise<void> {
    try {
      const baseline = this.baselines.get(name);
      if (!baseline) {
        return; // No baseline yet
      }
      
      // Calculate z-score (number of standard deviations from mean)
      const zScore = Math.abs(value - baseline.mean) / baseline.standardDeviation;
      
      // Check if this is an anomaly
      if (zScore > this.anomalyThreshold) {
        const anomaly: Anomaly = {
          id: this.generateAnomalyId(),
          metric: name,
          timestamp: new Date(),
          actualValue: value,
          expectedValue: baseline.mean,
          deviation: zScore,
          severity: this.calculateAnomalySeverity(zScore),
          confidence: Math.min(zScore / this.anomalyThreshold, 1.0),
        };
        
        // Store anomaly
        const anomalies = this.anomalies.get(name) || [];
        anomalies.push(anomaly);
        
        // Limit anomaly history
        if (anomalies.length > 100) {
          anomalies.shift();
        }
        
        this.anomalies.set(name, anomalies);
        
        this.logger.warn(`Performance anomaly detected: ${name}`, {
          actualValue: value,
          expectedValue: baseline.mean,
          deviation: zScore,
          severity: anomaly.severity,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to check anomalies for ${name}:`, error);
    }
  }

  /**
   * Calculate trend direction and slope using linear regression
   */
  private calculateTrend(data: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    slope: number;
    confidence: number;
  } {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) * (x[i] - meanX);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Calculate correlation coefficient for confidence
    let correlation = 0;
    if (denominator !== 0) {
      const yVariance = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
      correlation = Math.abs(numerator) / Math.sqrt(denominator * yVariance);
    }
    
    // Determine trend direction
    let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    const absSlope = Math.abs(slope);
    const slopeThreshold = meanY * 0.01; // 1% of mean as threshold
    
    if (correlation < 0.3) {
      direction = 'volatile'; // Low correlation indicates high volatility
    } else if (absSlope < slopeThreshold) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    return {
      direction,
      slope: Math.round(slope * 1000) / 1000,
      confidence: Math.round(correlation * 100) / 100,
    };
  }

  /**
   * Calculate anomaly severity based on z-score
   */
  private calculateAnomalySeverity(zScore: number): 'low' | 'medium' | 'high' {
    if (zScore >= 4.0) {
      return 'high';
    } else if (zScore >= 3.0) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate unique anomaly ID
   */
  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ================================
  // LIFECYCLE AND MISSING METHODS
  // ================================

  async onModuleDestroy(): Promise<void> {
    this.performanceData.clear();
    this.resourceData.clear();
    this.baselines.clear();
    this.anomalies.clear();
    this.logger.log('PerformanceTrackerService destroyed - all data cleared');
  }

  /**
   * Identify resource bottlenecks
   */
  identifyResourceBottleneck(metric: string): {
    bottleneck: 'cpu' | 'memory' | 'disk' | 'network' | 'none';
    utilization: number;
    threshold: number;
  } {
    const resourceData = this.resourceData.get(metric) || [];
    if (resourceData.length === 0) {
      return { bottleneck: 'none', utilization: 0, threshold: 80 };
    }

    const latest = resourceData[resourceData.length - 1];
    const threshold = 80; // 80% utilization threshold

    if (latest.cpu > threshold) {
      return { bottleneck: 'cpu', utilization: latest.cpu, threshold };
    }
    if (latest.memory > threshold) {
      return { bottleneck: 'memory', utilization: latest.memory, threshold };
    }
    if (latest.disk > threshold) {
      return { bottleneck: 'disk', utilization: latest.disk, threshold };
    }
    if (latest.network > threshold) {
      return { bottleneck: 'network', utilization: latest.network, threshold };
    }

    return { bottleneck: 'none', utilization: Math.max(latest.cpu, latest.memory, latest.disk, latest.network), threshold };
  }

  /**
   * Analyze resource patterns
   */
  analyzeResourcePattern(metric: string, timeRange: TimeRange): {
    pattern: 'increasing' | 'decreasing' | 'stable' | 'cyclic' | 'volatile';
    confidence: number;
    peak_hours: number[];
    avg_utilization: { cpu: number; memory: number; disk: number; network: number };
  } {
    const resourceData = this.resourceData.get(metric) || [];
    
    if (resourceData.length < 10) {
      return {
        pattern: 'stable',
        confidence: 0,
        peak_hours: [],
        avg_utilization: { cpu: 0, memory: 0, disk: 0, network: 0 },
      };
    }

    // Calculate averages
    const avgCpu = resourceData.reduce((sum, r) => sum + r.cpu, 0) / resourceData.length;
    const avgMemory = resourceData.reduce((sum, r) => sum + r.memory, 0) / resourceData.length;
    const avgDisk = resourceData.reduce((sum, r) => sum + r.disk, 0) / resourceData.length;
    const avgNetwork = resourceData.reduce((sum, r) => sum + r.network, 0) / resourceData.length;

    // Simple pattern analysis based on variance
    const memoryValues = resourceData.map(r => r.memory);
    const memoryTrend = this.calculateTrend(memoryValues);
    
    return {
      pattern: memoryTrend.direction === 'stable' ? 'stable' : 
               memoryTrend.direction === 'volatile' ? 'volatile' : 
               memoryTrend.direction,
      confidence: memoryTrend.confidence,
      peak_hours: [9, 14, 16], // Mock peak hours
      avg_utilization: {
        cpu: Math.round(avgCpu * 100) / 100,
        memory: Math.round(avgMemory * 100) / 100,
        disk: Math.round(avgDisk * 100) / 100,
        network: Math.round(avgNetwork * 100) / 100,
      },
    };
  }

  /**
   * Detect time series anomalies
   */
  detectTimeSeriesAnomalies(metric: string, data: number[]): Anomaly[] {
    if (data.length < this.baselineMinSamples) {
      return [];
    }

    const anomalies: Anomaly[] = [];
    const baseline = this.baselines.get(metric);
    
    if (!baseline) {
      return [];
    }

    data.forEach((value, index) => {
      const zScore = Math.abs(value - baseline.mean) / baseline.standardDeviation;
      
      if (zScore > this.anomalyThreshold) {
        anomalies.push({
          id: this.generateAnomalyId(),
          metric,
          timestamp: new Date(),
          actualValue: value,
          expectedValue: baseline.mean,
          deviation: zScore,
          severity: this.calculateAnomalySeverity(zScore),
          confidence: Math.min(zScore / this.anomalyThreshold, 1.0),
        });
      }
    });

    return anomalies;
  }

  /**
   * Predict performance trend
   */
  predictPerformanceTrend(metric: string, forecastPeriods: number): {
    predictions: Array<{ time: Date; value: number; confidence: number }>;
    accuracy: number;
    trend_direction: 'improving' | 'degrading' | 'stable';
  } {
    const data = this.performanceData.get(metric) || [];
    
    if (data.length < 10) {
      return {
        predictions: [],
        accuracy: 0,
        trend_direction: 'stable',
      };
    }

    const trend = this.calculateTrend(data);
    const latestValue = data[data.length - 1];
    const predictions: Array<{ time: Date; value: number; confidence: number }> = [];

    // Simple linear extrapolation
    for (let i = 1; i <= forecastPeriods; i++) {
      const predictedValue = latestValue + (trend.slope * i);
      const confidence = Math.max(0, trend.confidence - (i * 0.1)); // Decrease confidence over time
      
      predictions.push({
        time: new Date(Date.now() + (i * 60000)), // Future minutes
        value: Math.max(0, Math.round(predictedValue * 100) / 100),
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return {
      predictions,
      accuracy: trend.confidence,
      trend_direction: trend.direction === 'increasing' ? 'degrading' : 
                      trend.direction === 'decreasing' ? 'improving' : 'stable',
    };
  }

  /**
   * Identify performance bottlenecks
   */
  identifyPerformanceBottlenecks(metric: string): Array<{
    component: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    recommendation: string;
  }> {
    const data = this.performanceData.get(metric) || [];
    const baseline = this.baselines.get(metric);
    
    if (!baseline || data.length === 0) {
      return [];
    }

    const bottlenecks: Array<{
      component: string;
      severity: 'low' | 'medium' | 'high';
      impact: string;
      recommendation: string;
    }> = [];

    const latestValue = data[data.length - 1];
    const performanceRatio = latestValue / baseline.mean;

    if (performanceRatio > 2) {
      bottlenecks.push({
        component: 'execution_time',
        severity: 'high',
        impact: `Performance is ${Math.round(performanceRatio * 100)}% of baseline`,
        recommendation: 'Review algorithm complexity and optimize critical paths',
      });
    } else if (performanceRatio > 1.5) {
      bottlenecks.push({
        component: 'processing_overhead',
        severity: 'medium',
        impact: `Performance degradation of ${Math.round((performanceRatio - 1) * 100)}%`,
        recommendation: 'Consider caching and reduce I/O operations',
      });
    }

    if (baseline.standardDeviation > baseline.mean * 0.5) {
      bottlenecks.push({
        component: 'consistency',
        severity: 'medium',
        impact: 'High performance variability detected',
        recommendation: 'Investigate causes of performance spikes',
      });
    }

    return bottlenecks;
  }

  /**
   * Suggest optimizations
   */
  suggestOptimizations(metric: string): Array<{
    type: 'algorithm' | 'caching' | 'infrastructure' | 'configuration';
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimated_improvement: string;
  }> {
    const bottlenecks = this.identifyPerformanceBottlenecks(metric);
    const resourceBottleneck = this.identifyResourceBottleneck(metric);
    
    const optimizations: Array<{
      type: 'algorithm' | 'caching' | 'infrastructure' | 'configuration';
      priority: 'low' | 'medium' | 'high';
      description: string;
      estimated_improvement: string;
    }> = [];

    if (bottlenecks.some(b => b.component === 'execution_time')) {
      optimizations.push({
        type: 'algorithm',
        priority: 'high',
        description: 'Optimize core algorithms and data structures',
        estimated_improvement: '30-50% performance gain',
      });
    }

    if (resourceBottleneck.bottleneck === 'memory') {
      optimizations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Implement memory-efficient caching strategy',
        estimated_improvement: '20-30% memory reduction',
      });
    }

    if (resourceBottleneck.bottleneck === 'cpu') {
      optimizations.push({
        type: 'infrastructure',
        priority: 'medium',
        description: 'Scale CPU resources or implement load balancing',
        estimated_improvement: '25-40% throughput increase',
      });
    }

    if (optimizations.length === 0) {
      optimizations.push({
        type: 'configuration',
        priority: 'low',
        description: 'Performance is optimal, consider fine-tuning configuration',
        estimated_improvement: '5-10% efficiency gain',
      });
    }

    return optimizations;
  }

  /**
   * Analyze capacity
   */
  analyzeCapacity(metric: string): {
    current_utilization: number;
    projected_utilization: number;
    capacity_limit: number;
    time_to_limit: string;
    recommendations: string[];
  } {
    const resourceData = this.resourceData.get(metric) || [];
    
    if (resourceData.length === 0) {
      return {
        current_utilization: 0,
        projected_utilization: 0,
        capacity_limit: 100,
        time_to_limit: 'unknown',
        recommendations: ['No resource data available for analysis'],
      };
    }

    const latest = resourceData[resourceData.length - 1];
    const currentUtilization = Math.max(latest.cpu, latest.memory, latest.disk, latest.network);
    const capacityLimit = 100; // 100% utilization limit
    
    // Simple projection based on recent trend
    const memoryValues = resourceData.slice(-10).map(r => r.memory);
    const trend = this.calculateTrend(memoryValues);
    const projectedUtilization = Math.max(0, Math.min(100, currentUtilization + (trend.slope * 10)));

    const recommendations: string[] = [];
    if (currentUtilization > 80) {
      recommendations.push('Consider scaling resources immediately');
    }
    if (projectedUtilization > 90) {
      recommendations.push('Plan for capacity expansion within the next period');
    }
    if (trend.direction === 'increasing') {
      recommendations.push('Monitor growth trend closely');
    }
    if (recommendations.length === 0) {
      recommendations.push('Capacity is adequate for current load');
    }

    return {
      current_utilization: Math.round(currentUtilization * 100) / 100,
      projected_utilization: Math.round(projectedUtilization * 100) / 100,
      capacity_limit: capacityLimit,
      time_to_limit: projectedUtilization > capacityLimit ? 'immediate' : '> 30 days',
      recommendations,
    };
  }

  /**
   * Analyze SLA compliance
   */
  analyzeSLACompliance(metric: string, slaThreshold: number): {
    compliance_rate: number;
    violations: number;
    total_measurements: number;
    worst_violation: { timestamp: Date; value: number };
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const data = this.performanceData.get(metric) || [];
    
    if (data.length === 0) {
      return {
        compliance_rate: 100,
        violations: 0,
        total_measurements: 0,
        worst_violation: { timestamp: new Date(), value: 0 },
        trend: 'stable',
      };
    }

    const violations = data.filter(value => value > slaThreshold).length;
    const complianceRate = ((data.length - violations) / data.length) * 100;
    
    const worstViolation = Math.max(...data.filter(value => value > slaThreshold));
    const worstIndex = data.findIndex(value => value === worstViolation);
    
    const trend = this.calculateTrend(data);
    const slaCompliance = trend.direction === 'decreasing' ? 'improving' : 
                         trend.direction === 'increasing' ? 'degrading' : 'stable';

    return {
      compliance_rate: Math.round(complianceRate * 100) / 100,
      violations,
      total_measurements: data.length,
      worst_violation: {
        timestamp: new Date(Date.now() - ((data.length - worstIndex) * 60000)),
        value: worstViolation || 0,
      },
      trend: slaCompliance,
    };
  }

  /**
   * Clean up old performance data
   */
  cleanupOldData(maxAge: number = 24 * 60 * 60 * 1000): number {
    // Since we don't store timestamps with individual data points in this implementation,
    // we'll just limit the data to recent entries
    let totalRemoved = 0;
    
    this.performanceData.forEach((data, metric) => {
      if (data.length > this.maxDataPoints / 2) {
        const toRemove = data.length - (this.maxDataPoints / 2);
        data.splice(0, toRemove);
        totalRemoved += toRemove;
      }
    });

    this.logger.debug(`Cleaned up ${totalRemoved} old performance data points`);
    return totalRemoved;
  }

  /**
   * Get performance tracker statistics
   */
  getPerformanceTrackerStats(): {
    trackedMetrics: number;
    totalDataPoints: number;
    baselines: number;
    anomalies: number;
    resourceMetrics: number;
  } {
    const baseStats = this.getTrackerStats();
    
    return {
      ...baseStats,
      resourceMetrics: this.resourceData.size,
    };
  }

  /**
   * Export performance data
   */
  exportPerformanceData(format: 'json' | 'csv' = 'json'): string {
    const allData = {
      performance: Object.fromEntries(this.performanceData.entries()),
      resources: Object.fromEntries(this.resourceData.entries()),
      baselines: Object.fromEntries(this.baselines.entries()),
      anomalies: Object.fromEntries(this.anomalies.entries()),
      exportedAt: new Date(),
    };

    if (format === 'json') {
      return JSON.stringify(allData, null, 2);
    } else if (format === 'csv') {
      const csvRows: string[] = [];
      csvRows.push('Metric,Type,Value,Timestamp');
      
      this.performanceData.forEach((values, metric) => {
        values.forEach(value => {
          csvRows.push(`${metric},performance,${value},${new Date().toISOString()}`);
        });
      });
      
      return csvRows.join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Export performance metrics (different signature for tests)
   */
  exportPerformanceMetrics(metric: string): {
    metric: string;
    data: number[];
    baseline?: PerformanceBaseline;
    anomalies: Anomaly[];
  } {
    return {
      metric,
      data: this.performanceData.get(metric) || [],
      baseline: this.baselines.get(metric),
      anomalies: this.anomalies.get(metric) || [],
    };
  }

  /**
   * Create performance stream
   */
  createPerformanceStream(metric: string): AsyncIterable<{ timestamp: Date; value: number }> {
    const performanceData = this.performanceData;
    
    return {
      async *[Symbol.asyncIterator]() {
        const data = performanceData.get(metric) || [];
        
        for (const value of data) {
          yield {
            timestamp: new Date(),
            value,
          };
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      },
    };
  }

  /**
   * Get performance tracker statistics
   */
  getTrackerStats(): {
    trackedMetrics: number;
    totalDataPoints: number;
    baselines: number;
    anomalies: number;
  } {
    const totalDataPoints = Array.from(this.performanceData.values())
      .reduce((total, data) => total + data.length, 0);
      
    const totalAnomalies = Array.from(this.anomalies.values())
      .reduce((total, anomalies) => total + anomalies.length, 0);
    
    return {
      trackedMetrics: this.performanceData.size,
      totalDataPoints,
      baselines: this.baselines.size,
      anomalies: totalAnomalies,
    };
  }

  /**
   * Get recent performance data for a metric
   */
  getRecentPerformanceData(metric: string, limit = 100): number[] {
    const data = this.performanceData.get(metric) || [];
    return data.slice(-limit);
  }
}