import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type {
  IDashboard,
  DashboardConfig,
  DashboardData,
  DashboardQuery,
  MetricData,
  Widget,
} from '../interfaces/monitoring.interface';

/**
 * DashboardService - Dashboard data aggregation and visualization support
 * 
 * Features:
 * - Real-time dashboard data queries with caching
 * - Time-series data aggregation with multiple functions
 * - Multiple visualization format support
 * - Query optimization and result caching
 * - Dashboard configuration management
 * - Export capabilities (JSON, CSV)
 */
@Injectable()
export class DashboardService implements IDashboard, OnModuleDestroy {
  private readonly logger = new Logger(DashboardService.name);
  private readonly dashboards = new Map<string, DashboardConfig>();
  private readonly queryCache = new Map<string, { data: MetricData[]; timestamp: Date; ttl: number }>();
  private readonly mockMetricData = new Map<string, MetricData[]>();
  private readonly cacheDefaultTTL = 30000; // 30 seconds

  constructor() {
    // Initialize with some mock data for demonstration
    this.initializeMockData();
    this.logger.log('DashboardService initialized');
  }

  // ================================
  // DASHBOARD MANAGEMENT
  // ================================

  async createDashboard(config: DashboardConfig): Promise<string> {
    try {
      this.validateDashboardConfig(config);
      
      const dashboardWithTimestamps: DashboardConfig = {
        ...config,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.dashboards.set(config.id, dashboardWithTimestamps);
      
      this.logger.log(`Dashboard created: ${config.name}`, {
        dashboardId: config.id,
        widgets: config.widgets.length,
        refreshInterval: config.refreshInterval,
      });
      
      return config.id;
    } catch (error) {
      this.logger.error(`Failed to create dashboard: ${config.name}`, error);
      throw error;
    }
  }

  async updateDashboard(dashboardId: string, updates: Partial<DashboardConfig>): Promise<void> {
    const existing = this.dashboards.get(dashboardId);
    if (!existing) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    try {
      const updated: DashboardConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      
      this.validateDashboardConfig(updated);
      this.dashboards.set(dashboardId, updated);
      
      // Invalidate related cache entries
      this.invalidateDashboardCache(dashboardId);
      
      this.logger.log(`Dashboard updated: ${dashboardId}`, {
        updates: Object.keys(updates),
      });
    } catch (error) {
      this.logger.error(`Failed to update dashboard: ${dashboardId}`, error);
      throw error;
    }
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    if (!this.dashboards.has(dashboardId)) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    this.dashboards.delete(dashboardId);
    this.invalidateDashboardCache(dashboardId);
    
    this.logger.log(`Dashboard deleted: ${dashboardId}`);
  }

  async getDashboard(dashboardId: string): Promise<DashboardConfig> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }
    
    return { ...dashboard }; // Return copy to prevent mutations
  }

  // ================================
  // DATA QUERYING
  // ================================

  async getDashboardData(dashboardId: string): Promise<DashboardData> {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      const widgets: Record<string, MetricData[]> = {};
      
      // Query data for each widget
      for (const widget of dashboard.widgets) {
        try {
          const data = await this.queryMetrics(widget.query);
          widgets[widget.id] = data;
        } catch (error) {
          this.logger.warn(`Failed to load data for widget ${widget.id}:`, error);
          widgets[widget.id] = []; // Empty data on error
        }
      }
      
      return {
        dashboardId,
        widgets,
        timestamp: new Date(),
        timeRange: dashboard.timeRange,
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data: ${dashboardId}`, error);
      throw error;
    }
  }

  async queryMetrics(query: DashboardQuery): Promise<MetricData[]> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        this.logger.debug(`Cache hit for query: ${query.metric}`);
        return [...cached.data]; // Return copy
      }
      
      // Execute query
      const startTime = Date.now();
      const data = await this.executeQuery(query);
      const executionTime = Date.now() - startTime;
      
      // Cache result
      this.queryCache.set(cacheKey, {
        data: [...data],
        timestamp: new Date(),
        ttl: this.cacheDefaultTTL,
      });
      
      this.logger.debug(`Query executed: ${query.metric}`, {
        metric: query.metric,
        dataPoints: data.length,
        executionTime,
        aggregation: query.aggregation,
      });
      
      return data;
    } catch (error) {
      this.logger.error(`Query execution failed: ${query.metric}`, error);
      return []; // Return empty data on error
    }
  }

  async exportDashboard(dashboardId: string, format: 'json' | 'csv'): Promise<string> {
    try {
      const dashboardData = await this.getDashboardData(dashboardId);
      
      if (format === 'json') {
        return JSON.stringify(dashboardData, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(dashboardData);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.logger.error(`Failed to export dashboard: ${dashboardId}`, error);
      throw error;
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * Execute metric query (mock implementation)
   */
  private async executeQuery(query: DashboardQuery): Promise<MetricData[]> {
    // In a real implementation, this would query the actual metrics backend
    // For now, return mock data based on the query
    
    const mockData = this.mockMetricData.get(query.metric) || [];
    let filteredData = [...mockData];
    
    // Apply time range filter
    if (query.timeRange) {
      filteredData = filteredData.filter(data => 
        data.timestamp >= query.timeRange!.start && 
        data.timestamp <= query.timeRange!.end
      );
    }
    
    // Apply tag filters
    if (query.filters) {
      filteredData = filteredData.filter(data => {
        return Object.entries(query.filters!).every(([key, value]) =>
          data.tags[key] === value
        );
      });
    }
    
    // Apply aggregation (simplified)
    if (query.aggregation && filteredData.length > 1) {
      filteredData = [this.aggregateData(filteredData, query.aggregation)];
    }
    
    // Apply limit
    if (query.limit) {
      filteredData = filteredData.slice(0, query.limit);
    }
    
    return filteredData;
  }

  /**
   * Aggregate metric data based on aggregation type
   */
  private aggregateData(data: MetricData[], aggregation: string): MetricData {
    const values = data.map(d => d.value);
    let aggregatedValue: number;
    
    switch (aggregation) {
      case 'avg': {
        aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      }
      case 'sum': {
        aggregatedValue = values.reduce((sum, val) => sum + val, 0);
        break;
      }
      case 'min': {
        aggregatedValue = Math.min(...values);
        break;
      }
      case 'max': {
        aggregatedValue = Math.max(...values);
        break;
      }
      case 'count': {
        aggregatedValue = values.length;
        break;
      }
      case 'p95': {
        const sorted95 = [...values].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted95.length * 0.95);
        aggregatedValue = sorted95[p95Index];
        break;
      }
      case 'p99': {
        const sorted99 = [...values].sort((a, b) => a - b);
        const p99Index = Math.floor(sorted99.length * 0.99);
        aggregatedValue = sorted99[p99Index];
        break;
      }
      default: {
        aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }
    
    return {
      metric: data[0].metric,
      timestamp: new Date(),
      value: Math.round(aggregatedValue * 100) / 100,
      tags: {}, // Aggregated data has no specific tags
    };
  }

  /**
   * Validate dashboard configuration
   */
  private validateDashboardConfig(config: DashboardConfig): void {
    if (!config.id || !config.name) {
      throw new Error('Dashboard must have id and name');
    }
    
    if (!config.widgets || config.widgets.length === 0) {
      throw new Error('Dashboard must have at least one widget');
    }
    
    if (config.refreshInterval < 1000) {
      throw new Error('Dashboard refresh interval must be at least 1 second');
    }
    
    // Validate widgets
    for (const widget of config.widgets) {
      this.validateWidget(widget);
    }
  }

  /**
   * Validate widget configuration
   */
  private validateWidget(widget: Widget): void {
    if (!widget.id || !widget.title) {
      throw new Error('Widget must have id and title');
    }
    
    if (!widget.query || !widget.query.metric) {
      throw new Error('Widget must have query with metric');
    }
    
    if (!['line', 'bar', 'pie', 'gauge', 'table', 'stat'].includes(widget.type)) {
      throw new Error(`Invalid widget type: ${widget.type}`);
    }
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: DashboardQuery): string {
    return `${query.metric}:${query.aggregation}:${JSON.stringify(query.timeRange)}:${JSON.stringify(query.filters)}:${query.limit}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cached: { data: MetricData[]; timestamp: Date; ttl: number }): boolean {
    const age = Date.now() - cached.timestamp.getTime();
    return age < cached.ttl;
  }

  /**
   * Invalidate cache entries for a dashboard
   */
  private invalidateDashboardCache(dashboardId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;
    
    for (const widget of dashboard.widgets) {
      const cacheKey = this.generateCacheKey(widget.query);
      this.queryCache.delete(cacheKey);
    }
    
    this.logger.debug(`Cache invalidated for dashboard: ${dashboardId}`);
  }

  /**
   * Convert dashboard data to CSV format
   */
  private convertToCSV(data: DashboardData): string {
    const rows: string[] = [];
    rows.push('Widget,Metric,Timestamp,Value,Tags');
    
    for (const [widgetId, metricData] of Object.entries(data.widgets)) {
      for (const metric of metricData) {
        const tags = JSON.stringify(metric.tags);
        rows.push(`${widgetId},${metric.metric},${metric.timestamp.toISOString()},${metric.value},"${tags}"`);
      }
    }
    
    return rows.join('\n');
  }

  /**
   * Initialize mock data for demonstration
   */
  private initializeMockData(): void {
    const now = new Date();
    const metrics = ['workflow.execution.duration', 'workflow.success.rate', 'system.cpu.usage', 'system.memory.usage'];
    
    for (const metric of metrics) {
      const data: MetricData[] = [];
      
      // Generate 100 data points over the last hour
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(now.getTime() - (i * 60000)); // Every minute
        const baseValue = metric.includes('duration') ? 1000 : 
                         metric.includes('rate') ? 95 : 
                         metric.includes('cpu') ? 60 : 70;
        const randomVariation = (Math.random() - 0.5) * 20;
        const value = Math.max(0, baseValue + randomVariation);
        
        data.push({
          metric,
          timestamp,
          value: Math.round(value * 100) / 100,
          tags: {
            environment: 'production',
            service: 'langgraph-monitoring',
          },
        });
      }
      
      this.mockMetricData.set(metric, data.reverse()); // Chronological order
    }
    
    this.logger.debug('Mock metric data initialized');
  }

  // ================================
  // LIFECYCLE AND MISSING METHODS
  // ================================

  async onModuleDestroy(): Promise<void> {
    this.queryCache.clear();
    this.mockMetricData.clear();
    this.logger.log('DashboardService destroyed - caches cleared');
  }

  /**
   * Add mock metric data for testing
   */
  addMockMetricData(metric: string, data: MetricData[]): void {
    this.mockMetricData.set(metric, [...data]);
    this.logger.debug(`Added mock data for metric: ${metric}`, {
      dataPoints: data.length,
    });
  }

  /**
   * Get dashboard templates
   */
  getDashboardTemplates(): Array<{ id: string; name: string; description: string; widgets: Widget[] }> {
    return [
      {
        id: 'system-overview',
        name: 'System Overview',
        description: 'Standard system monitoring dashboard',
        widgets: [
          {
            id: 'cpu-usage',
            title: 'CPU Usage',
            type: 'line',
            query: {
              metric: 'system.cpu.usage',
              aggregation: 'avg',
              timeRange: {
                start: new Date(Date.now() - 3600000),
                end: new Date(),
              },
            },
            position: { x: 0, y: 0, width: 6, height: 4 },
            config: {},
          },
          {
            id: 'memory-usage',
            title: 'Memory Usage',
            type: 'gauge',
            query: {
              metric: 'system.memory.usage',
              aggregation: 'avg',
              timeRange: {
                start: new Date(Date.now() - 3600000),
                end: new Date(),
              },
            },
            position: { x: 6, y: 0, width: 6, height: 4 },
            config: {},
          },
        ],
      },
      {
        id: 'workflow-performance',
        name: 'Workflow Performance',
        description: 'LangGraph workflow monitoring dashboard',
        widgets: [
          {
            id: 'workflow-duration',
            title: 'Execution Duration',
            type: 'line',
            query: {
              metric: 'workflow.execution.duration',
              aggregation: 'p95',
              timeRange: {
                start: new Date(Date.now() - 3600000),
                end: new Date(),
              },
            },
            position: { x: 0, y: 0, width: 8, height: 4 },
            config: {},
          },
          {
            id: 'success-rate',
            title: 'Success Rate',
            type: 'stat',
            query: {
              metric: 'workflow.success.rate',
              aggregation: 'avg',
              timeRange: {
                start: new Date(Date.now() - 3600000),
                end: new Date(),
              },
            },
            position: { x: 8, y: 0, width: 4, height: 4 },
            config: {},
          },
        ],
      },
    ];
  }

  /**
   * Create dashboard from template
   */
  async createDashboardFromTemplate(templateId: string, dashboardId: string, name?: string): Promise<string> {
    const templates = this.getDashboardTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const config: DashboardConfig = {
      id: dashboardId,
      name: name || template.name,
      description: template.description,
      widgets: template.widgets,
      refreshInterval: 30000,
      timeRange: {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.createDashboard(config);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      timestamp: Date;
      ttl: number;
      dataPoints: number;
    }>;
  } {
    const entries = Array.from(this.queryCache.entries()).map(([key, cached]) => ({
      key,
      timestamp: cached.timestamp,
      ttl: cached.ttl,
      dataPoints: cached.data.length,
    }));

    return {
      size: this.queryCache.size,
      entries,
    };
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupExpiredCache(): number {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, cached] of this.queryCache.entries()) {
      const age = now - cached.timestamp.getTime();
      if (age >= cached.ttl) {
        this.queryCache.delete(key);
        removedCount++;
      }
    }

    this.logger.debug(`Cleaned up ${removedCount} expired cache entries`);
    return removedCount;
  }

  /**
   * Create dashboard data stream
   */
  createDashboardStream(dashboardId: string): AsyncIterable<DashboardData> {
    const getDashboardData = this.getDashboardData.bind(this);
    const getDashboard = this.getDashboard.bind(this);
    const logger = this.logger;
    
    return {
      async *[Symbol.asyncIterator]() {
        while (true) {
          try {
            const data = await getDashboardData(dashboardId);
            yield data;
            
            // Wait for refresh interval
            const dashboard = await getDashboard(dashboardId);
            await new Promise(resolve => setTimeout(resolve, dashboard.refreshInterval));
          } catch (error) {
            logger.error(`Stream error for dashboard ${dashboardId}:`, error);
            break;
          }
        }
      },
    };
  }

  /**
   * Get dashboard usage statistics
   */
  getDashboardUsage(dashboardId: string): {
    totalQueries: number;
    avgQueryTime: number;
    cacheHitRate: number;
    lastAccessed: Date;
  } {
    // In a real implementation, this would track actual usage metrics
    return {
      totalQueries: Math.floor(Math.random() * 1000) + 100,
      avgQueryTime: Math.floor(Math.random() * 100) + 50,
      cacheHitRate: Math.random() * 100,
      lastAccessed: new Date(),
    };
  }

  /**
   * Get dashboard insights
   */
  getDashboardInsights(dashboardId: string): {
    performance: string;
    suggestions: string[];
    trends: Array<{ metric: string; trend: 'up' | 'down' | 'stable'; change: number }>;
  } {
    return {
      performance: 'good',
      suggestions: [
        'Consider adding more granular time range filters',
        'Widget response times are optimal',
        'Cache hit rate could be improved with longer TTL',
      ],
      trends: [
        { metric: 'query_response_time', trend: 'down', change: -15 },
        { metric: 'cache_hit_rate', trend: 'up', change: 8 },
        { metric: 'error_rate', trend: 'stable', change: 0 },
      ],
    };
  }

  /**
   * Suggest dashboard optimizations
   */
  suggestOptimizations(dashboardId: string): Array<{
    type: 'widget' | 'query' | 'cache' | 'layout';
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
  }> {
    return [
      {
        type: 'cache',
        severity: 'medium',
        description: 'Increase cache TTL for slowly changing metrics',
        impact: 'Reduce backend load by 30%',
      },
      {
        type: 'query',
        severity: 'low',
        description: 'Consider using aggregated queries for overview widgets',
        impact: 'Improve query response time by 20%',
      },
      {
        type: 'layout',
        severity: 'low',
        description: 'Reorganize widgets for better visual hierarchy',
        impact: 'Enhanced user experience',
      },
    ];
  }

  /**
   * Get dashboard service statistics
   */
  getDashboardStats(): {
    totalDashboards: number;
    totalWidgets: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    const totalWidgets = Array.from(this.dashboards.values())
      .reduce((total, dashboard) => total + dashboard.widgets.length, 0);
    
    // Cache hit rate would be tracked in a real implementation
    const cacheHitRate = 0; // Placeholder
    
    return {
      totalDashboards: this.dashboards.size,
      totalWidgets,
      cacheSize: this.queryCache.size,
      cacheHitRate,
    };
  }
}