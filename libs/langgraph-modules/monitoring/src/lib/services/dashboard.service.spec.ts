import { Test, type TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import type {
  DashboardConfig,
  DashboardData,
  DashboardQuery,
  MetricData,
  Widget,
  WidgetPosition,
  TimeRange,
  AggregationType,
} from '../interfaces/monitoring.interface';

describe('DashboardService', () => {
  let service: DashboardService;

  const createTestTimeRange = (hoursAgo = 1): TimeRange => ({
    start: new Date(Date.now() - hoursAgo * 3600000),
    end: new Date(),
  });

  const createTestWidget = (overrides?: Partial<Widget>): Widget => ({
    id: 'widget-123',
    type: 'line',
    title: 'CPU Usage',
    query: {
      metric: 'system.cpu.usage',
      timeRange: createTestTimeRange(),
      aggregation: 'avg',
    },
    position: { x: 0, y: 0, width: 6, height: 4 },
    config: { color: '#ff6b6b', threshold: 80 },
    ...overrides,
  });

  const createTestDashboard = (overrides?: Partial<DashboardConfig>): DashboardConfig => ({
    id: 'dashboard-123',
    name: 'System Overview',
    description: 'Main system metrics dashboard',
    widgets: [createTestWidget()],
    refreshInterval: 30000, // 30 seconds in milliseconds
    timeRange: createTestTimeRange(24), // 24 hours
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Dashboard Management (AC6 Verification)', () => {
    it('should create dashboards successfully', async () => {
      const config = createTestDashboard();
      
      const dashboardId = await service.createDashboard(config);
      
      expect(dashboardId).toBeDefined();
      expect(typeof dashboardId).toBe('string');
      expect(dashboardId).toBe(config.id);
    });

    it('should retrieve dashboard configurations', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const retrieved = await service.getDashboard(config.id);
      
      expect(retrieved).toEqual(config);
      expect(retrieved.name).toBe(config.name);
      expect(retrieved.widgets).toHaveLength(1);
    });

    it('should update dashboard configurations', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const updates = {
        name: 'Updated Dashboard',
        description: 'Updated description',
        refreshInterval: 60000, // 60 seconds in milliseconds
      };
      
      await service.updateDashboard(config.id, updates);
      
      const updated = await service.getDashboard(config.id);
      expect(updated.name).toBe('Updated Dashboard');
      expect(updated.description).toBe('Updated description');
      expect(updated.refreshInterval).toBe(60000);
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should delete dashboards', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      await service.deleteDashboard(config.id);
      
      await expect(service.getDashboard(config.id)).rejects.toThrow('Dashboard not found');
    });

    it('should validate dashboard configuration', async () => {
      const invalidConfig = createTestDashboard({
        name: '', // Empty name
        widgets: [], // No widgets
        refreshInterval: -1, // Invalid refresh interval
      });

      await expect(service.createDashboard(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Widget Management', () => {
    it('should support all widget types', async () => {
      const widgetTypes: Array<Widget['type']> = ['line', 'bar', 'pie', 'gauge', 'table', 'stat'];
      
      const widgets = widgetTypes.map((type, index) => 
        createTestWidget({
          id: `widget-${type}`,
          type,
          title: `${type} Widget`,
          position: { x: index * 2, y: 0, width: 2, height: 2 },
        })
      );

      const config = createTestDashboard({
        widgets,
      });

      await service.createDashboard(config);
      const retrieved = await service.getDashboard(config.id);
      
      expect(retrieved.widgets).toHaveLength(widgetTypes.length);
      retrieved.widgets.forEach((widget, index) => {
        expect(widget.type).toBe(widgetTypes[index]);
      });
    });

    it('should validate widget positioning', async () => {
      const overlappingWidgets = [
        createTestWidget({ 
          id: 'widget-1', 
          position: { x: 0, y: 0, width: 4, height: 4 }
        }),
        createTestWidget({ 
          id: 'widget-2', 
          position: { x: 2, y: 2, width: 4, height: 4 } // Overlapping
        }),
      ];

      const config = createTestDashboard({
        widgets: overlappingWidgets,
      });

      await expect(service.createDashboard(config)).rejects.toThrow('Widget positions overlap');
    });

    it('should support widget configuration options', async () => {
      const configuredWidget = createTestWidget({
        config: {
          color: '#4ecdc4',
          threshold: 90,
          unit: 'percentage',
          showLegend: true,
          animate: true,
          precision: 2,
        },
      });

      const config = createTestDashboard({
        widgets: [configuredWidget],
      });

      await service.createDashboard(config);
      const retrieved = await service.getDashboard(config.id);
      
      expect(retrieved.widgets[0].config).toEqual(configuredWidget.config);
    });
  });

  describe('Real-time Data Queries (AC6 - Dashboard Data)', () => {
    beforeEach(() => {
      // Mock metric data for testing
      service.addMockMetricData([
        {
          metric: 'system.cpu.usage',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          value: 75.5,
          tags: { host: 'server-1' },
        },
        {
          metric: 'system.cpu.usage',
          timestamp: new Date(Date.now() - 240000), // 4 minutes ago
          value: 78.2,
          tags: { host: 'server-1' },
        },
        {
          metric: 'system.cpu.usage',
          timestamp: new Date(Date.now() - 180000), // 3 minutes ago
          value: 72.1,
          tags: { host: 'server-1' },
        },
        {
          metric: 'system.memory.usage',
          timestamp: new Date(),
          value: 65.3,
          tags: { host: 'server-1' },
        },
      ]);
    });

    it('should query metrics with different aggregations', async () => {
      const aggregationTests: Array<{
        aggregation: AggregationType;
        expectedBehavior: string;
      }> = [
        { aggregation: 'avg', expectedBehavior: 'average value' },
        { aggregation: 'sum', expectedBehavior: 'sum of values' },
        { aggregation: 'min', expectedBehavior: 'minimum value' },
        { aggregation: 'max', expectedBehavior: 'maximum value' },
        { aggregation: 'count', expectedBehavior: 'count of data points' },
        { aggregation: 'p95', expectedBehavior: '95th percentile' },
        { aggregation: 'p99', expectedBehavior: '99th percentile' },
      ];

      for (const test of aggregationTests) {
        const query: DashboardQuery = {
          metric: 'system.cpu.usage',
          timeRange: createTestTimeRange(),
          aggregation: test.aggregation,
        };

        const results = await service.queryMetrics(query);
        
        expect(results).toBeDefined();
        expect(results).toBeInstanceOf(Array);
        // Specific validation would depend on the aggregation type
      }
    });

    it('should support time-based grouping', async () => {
      const query: DashboardQuery = {
        metric: 'system.cpu.usage',
        timeRange: createTestTimeRange(24), // 24 hours
        aggregation: 'avg',
        groupBy: ['time_bucket(5m)'], // 5-minute buckets
      };

      const results = await service.queryMetrics(query);
      
      expect(results).toBeInstanceOf(Array);
      // Results should be grouped by time buckets
      if (results.length > 1) {
        const timeDiff = results[1].timestamp.getTime() - results[0].timestamp.getTime();
        expect(timeDiff).toBeCloseTo(300000, -30000); // ~5 minutes
      }
    });

    it('should support tag-based filtering', async () => {
      const query: DashboardQuery = {
        metric: 'system.cpu.usage',
        timeRange: createTestTimeRange(),
        aggregation: 'avg',
        filters: { host: 'server-1' },
      };

      const results = await service.queryMetrics(query);
      
      expect(results).toBeInstanceOf(Array);
      results.forEach(result => {
        expect(result.tags.host).toBe('server-1');
      });
    });

    it('should handle empty query results gracefully', async () => {
      const query: DashboardQuery = {
        metric: 'nonexistent.metric',
        timeRange: createTestTimeRange(),
        aggregation: 'avg',
      };

      const results = await service.queryMetrics(query);
      
      expect(results).toEqual([]);
    });

    it('should respect query limits', async () => {
      const query: DashboardQuery = {
        metric: 'system.cpu.usage',
        timeRange: createTestTimeRange(),
        aggregation: 'avg',
        limit: 2,
      };

      const results = await service.queryMetrics(query);
      
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Dashboard Data Aggregation', () => {
    it('should get complete dashboard data with all widgets', async () => {
      const config = createTestDashboard({
        widgets: [
          createTestWidget({
            id: 'cpu-widget',
            query: {
              metric: 'system.cpu.usage',
              timeRange: createTestTimeRange(),
              aggregation: 'avg',
            },
          }),
          createTestWidget({
            id: 'memory-widget',
            type: 'gauge',
            query: {
              metric: 'system.memory.usage',
              timeRange: createTestTimeRange(),
              aggregation: 'avg',
            },
          }),
        ],
      });

      await service.createDashboard(config);
      
      const dashboardData = await service.getDashboardData(config.id);
      
      expect(dashboardData.dashboardId).toBe(config.id);
      expect(dashboardData.widgets).toHaveProperty('cpu-widget');
      expect(dashboardData.widgets).toHaveProperty('memory-widget');
      expect(dashboardData.timestamp).toBeInstanceOf(Date);
      expect(dashboardData.timeRange).toEqual(config.timeRange);
    });

    it('should use caching for dashboard data (30s TTL)', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const queryMetricsSpy = jest.spyOn(service, 'queryMetrics');
      
      // First call
      const data1 = await service.getDashboardData(config.id);
      expect(queryMetricsSpy).toHaveBeenCalledTimes(1);
      
      // Second call within TTL should use cache
      const data2 = await service.getDashboardData(config.id);
      expect(queryMetricsSpy).toHaveBeenCalledTimes(1); // Still 1, used cache
      
      expect(data1.timestamp.getTime()).toBe(data2.timestamp.getTime());
    });

    it('should refresh cache after TTL expires', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const queryMetricsSpy = jest.spyOn(service, 'queryMetrics');
      
      // First call
      await service.getDashboardData(config.id);
      expect(queryMetricsSpy).toHaveBeenCalledTimes(1);
      
      // Simulate TTL expiration (30 seconds)
      jest.advanceTimersByTime(31000);
      
      // Second call should refresh cache
      await service.getDashboardData(config.id);
      expect(queryMetricsSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle widget query failures gracefully', async () => {
      const config = createTestDashboard({
        widgets: [
          createTestWidget({
            id: 'working-widget',
            query: {
              metric: 'system.cpu.usage',
              timeRange: createTestTimeRange(),
              aggregation: 'avg',
            },
          }),
          createTestWidget({
            id: 'failing-widget',
            query: {
              metric: 'invalid.metric',
              timeRange: createTestTimeRange(),
              aggregation: 'avg',
            },
          }),
        ],
      });

      await service.createDashboard(config);
      
      const dashboardData = await service.getDashboardData(config.id);
      
      // Should still return data for working widgets
      expect(dashboardData.widgets).toHaveProperty('working-widget');
      expect(dashboardData.widgets).toHaveProperty('failing-widget');
      // Failing widget should have empty array
      expect(dashboardData.widgets['failing-widget']).toEqual([]);
    });
  });

  describe('Export and Visualization Support', () => {
    it('should export dashboard data in JSON format', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const jsonExport = await service.exportDashboard(config.id, 'json');
      
      const parsedExport = JSON.parse(jsonExport);
      expect(parsedExport.dashboard).toEqual(config);
      expect(parsedExport.data).toBeDefined();
      expect(parsedExport.exportedAt).toBeDefined();
    });

    it('should export dashboard data in CSV format', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const csvExport = await service.exportDashboard(config.id, 'csv');
      
      expect(csvExport).toContain('widget_id,timestamp,metric,value,tags');
      expect(csvExport).toContain(config.widgets[0].id);
    });

    it('should provide dashboard templates for common use cases', async () => {
      const templates = await service.getDashboardTemplates();
      
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      
      const systemTemplate = templates.find(t => t.name === 'System Overview');
      expect(systemTemplate).toBeDefined();
      expect(systemTemplate?.widgets.length).toBeGreaterThan(0);
    });

    it('should create dashboard from template', async () => {
      const templates = await service.getDashboardTemplates();
      const template = templates[0];
      
      const dashboardId = await service.createDashboardFromTemplate(template.id, {
        name: 'My System Dashboard',
        customization: {
          refreshInterval: 60,
          tags: { environment: 'production' },
        },
      });
      
      const dashboard = await service.getDashboard(dashboardId);
      expect(dashboard.name).toBe('My System Dashboard');
      expect(dashboard.refreshInterval).toBe(60);
      expect(dashboard.widgets.length).toBe(template.widgets.length);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent dashboard requests efficiently', async () => {
      // Create multiple dashboards
      const dashboards = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          service.createDashboard(createTestDashboard({
            id: `concurrent-dashboard-${i}`,
            name: `Dashboard ${i}`,
          }))
        )
      );

      const startTime = Date.now();
      
      // Request data from all dashboards concurrently
      const dataPromises = dashboards.map(id => service.getDashboardData(id));
      const results = await Promise.all(dataPromises);
      
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      results.forEach(data => {
        expect(data).toBeDefined();
        expect(data.dashboardId).toBeDefined();
      });
    });

    it('should optimize queries for large time ranges', async () => {
      const config = createTestDashboard({
        timeRange: createTestTimeRange(24 * 7), // 1 week
        widgets: [
          createTestWidget({
            query: {
              metric: 'system.cpu.usage',
              timeRange: createTestTimeRange(24 * 7),
              aggregation: 'avg',
              groupBy: ['time_bucket(1h)'], // Hourly buckets for large range
            },
          }),
        ],
      });

      await service.createDashboard(config);
      
      const startTime = Date.now();
      const data = await service.getDashboardData(config.id);
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(data).toBeDefined();
    });

    it('should manage memory efficiently with dashboard cache', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many dashboards and request their data
      for (let i = 0; i < 50; i++) {
        const config = createTestDashboard({
          id: `memory-test-${i}`,
          widgets: Array.from({ length: 5 }, (_, j) => 
            createTestWidget({
              id: `widget-${i}-${j}`,
              query: {
                metric: `test.metric.${j}`,
                timeRange: createTestTimeRange(),
                aggregation: 'avg',
              },
            })
          ),
        });
        
        await service.createDashboard(config);
        await service.getDashboardData(config.id);
      }
      
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;
      
      // Should use reasonable memory (< 100MB for 50 dashboards with 250 widgets)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should implement automatic cache cleanup to prevent memory leaks', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      // Fill cache with data
      await service.getDashboardData(config.id);
      
      let cacheStats = service.getCacheStats();
      expect(cacheStats.entries).toBe(1);
      expect(cacheStats.memoryUsage).toBeGreaterThan(0);
      
      // Trigger cache cleanup
      await service.cleanupExpiredCache();
      
      cacheStats = service.getCacheStats();
      // Cache should still have entries if not expired
      expect(cacheStats.entries).toBe(1);
      
      // Simulate cache expiration and cleanup
      jest.advanceTimersByTime(31000); // Beyond TTL
      await service.cleanupExpiredCache();
      
      cacheStats = service.getCacheStats();
      expect(cacheStats.entries).toBe(0);
    });
  });

  describe('Real-time Updates and Streaming', () => {
    it('should support real-time dashboard updates via WebSocket', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const updates: any[] = [];
      const stream = service.createDashboardStream(config.id);
      
      stream.on('widget_update', (update) => {
        updates.push(update);
      });
      
      // Simulate new metric data
      service.addMockMetricData([
        {
          metric: 'system.cpu.usage',
          timestamp: new Date(),
          value: 85.7,
          tags: { host: 'server-1' },
        },
      ]);
      
      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].widgetId).toBe(config.widgets[0].id);
      expect(updates[0].data).toBeDefined();
      
      stream.destroy();
    });

    it('should batch real-time updates for performance', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      const batchUpdates: any[] = [];
      const stream = service.createDashboardStream(config.id, { batchSize: 5, batchInterval: 100 });
      
      stream.on('batch_update', (batch) => {
        batchUpdates.push(batch);
      });
      
      // Add multiple metric data points rapidly
      for (let i = 0; i < 10; i++) {
        service.addMockMetricData([
          {
            metric: 'system.cpu.usage',
            timestamp: new Date(),
            value: 80 + i,
            tags: { host: 'server-1' },
          },
        ]);
      }
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(batchUpdates.length).toBeGreaterThan(0);
      expect(batchUpdates[0].updates.length).toBeGreaterThan(1);
      
      stream.destroy();
    });

    it('should handle stream errors gracefully', async () => {
      const config = createTestDashboard({
        widgets: [
          createTestWidget({
            query: {
              metric: 'invalid.metric',
              timeRange: createTestTimeRange(),
              aggregation: 'avg',
            },
          }),
        ],
      });
      
      await service.createDashboard(config);
      
      const errors: any[] = [];
      const stream = service.createDashboardStream(config.id);
      
      stream.on('error', (error) => {
        errors.push(error);
      });
      
      stream.on('widget_update', (update) => {
        // Should still receive updates for valid parts
      });
      
      // Add data that will cause widget query to fail
      service.addMockMetricData([
        {
          metric: 'invalid.metric',
          timestamp: new Date(),
          value: 100,
          tags: {},
        },
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Stream should continue operating despite errors
      expect(stream.destroyed).toBe(false);
      
      stream.destroy();
    });
  });

  describe('Dashboard Analytics and Insights', () => {
    it('should track dashboard usage statistics', async () => {
      const config = createTestDashboard();
      await service.createDashboard(config);
      
      // Simulate dashboard usage
      for (let i = 0; i < 10; i++) {
        await service.getDashboardData(config.id);
      }
      
      const usage = await service.getDashboardUsage(config.id);
      
      expect(usage.views).toBe(10);
      expect(usage.lastAccessed).toBeInstanceOf(Date);
      expect(usage.averageLoadTime).toBeGreaterThan(0);
      expect(usage.mostViewedWidgets).toBeInstanceOf(Array);
    });

    it('should provide dashboard performance insights', async () => {
      const config = createTestDashboard({
        widgets: Array.from({ length: 20 }, (_, i) => 
          createTestWidget({
            id: `widget-${i}`,
            query: {
              metric: `test.metric.${i}`,
              timeRange: createTestTimeRange(),
              aggregation: 'avg',
            },
          })
        ),
      });
      
      await service.createDashboard(config);
      await service.getDashboardData(config.id);
      
      const insights = await service.getDashboardInsights(config.id);
      
      expect(insights.loadTime).toBeGreaterThan(0);
      expect(insights.widgetCount).toBe(20);
      expect(insights.optimization).toBeDefined();
      expect(insights.recommendations).toBeInstanceOf(Array);
    });

    it('should suggest dashboard optimizations', async () => {
      const config = createTestDashboard({
        refreshInterval: 1, // Too frequent
        widgets: Array.from({ length: 50 }, (_, i) => // Too many widgets
          createTestWidget({
            id: `widget-${i}`,
            query: {
              metric: `high.cardinality.metric.${i}`,
              timeRange: createTestTimeRange(24 * 30), // 30 days - large range
              aggregation: 'avg',
            },
          })
        ),
      });
      
      await service.createDashboard(config);
      
      const optimizations = await service.suggestOptimizations(config.id);
      
      expect(optimizations).toContainEqual(
        expect.objectContaining({
          type: 'refresh_interval',
          current: 1,
          suggested: expect.any(Number),
          impact: expect.any(String),
        })
      );
      
      expect(optimizations).toContainEqual(
        expect.objectContaining({
          type: 'widget_count',
          issue: 'too_many_widgets',
        })
      );
    });
  });
});