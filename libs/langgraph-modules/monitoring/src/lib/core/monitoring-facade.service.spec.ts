import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MonitoringFacadeService } from './monitoring-facade.service';
import type {
  IMetricsCollector,
  IAlertingService,
  IHealthCheck,
  IPerformanceTracker,
  IDashboard,
  MetricTags,
  AlertRule,
  Alert,
  HealthStatus,
  ServiceHealth,
  MetricQuery,
  MetricData,
  DashboardConfig,
  DashboardData,
} from '../interfaces/monitoring.interface';

describe('MonitoringFacadeService', () => {
  let service: MonitoringFacadeService;
  let mockMetricsCollector: jest.Mocked<IMetricsCollector>;
  let mockAlertingService: jest.Mocked<IAlertingService>;
  let mockHealthCheck: jest.Mocked<IHealthCheck>;
  let mockPerformanceTracker: jest.Mocked<IPerformanceTracker>;
  let mockDashboardService: jest.Mocked<IDashboard>;

  beforeEach(async () => {
    // Create comprehensive mocks for all dependencies
    mockMetricsCollector = {
      collect: jest.fn().mockResolvedValue(undefined),
      collectBatch: jest.fn().mockResolvedValue(undefined),
      getMetric: jest.fn().mockResolvedValue(undefined),
      getMetrics: jest.fn().mockResolvedValue([]),
      flush: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };

    mockAlertingService = {
      createRule: jest.fn().mockResolvedValue('rule-123'),
      updateRule: jest.fn().mockResolvedValue(undefined),
      deleteRule: jest.fn().mockResolvedValue(undefined),
      enableRule: jest.fn().mockResolvedValue(undefined),
      disableRule: jest.fn().mockResolvedValue(undefined),
      evaluateRules: jest.fn().mockResolvedValue(undefined),
      triggerAlert: jest.fn().mockResolvedValue(undefined),
      getActiveAlerts: jest.fn().mockResolvedValue([]),
      getAlertHistory: jest.fn().mockResolvedValue([]),
    };

    mockHealthCheck = {
      register: jest.fn().mockResolvedValue(undefined),
      unregister: jest.fn().mockResolvedValue(undefined),
      check: jest.fn().mockResolvedValue({
        state: 'healthy',
        lastCheck: new Date(),
        responseTime: 50,
      } as ServiceHealth),
      checkAll: jest.fn().mockResolvedValue({
        overall: 'healthy',
        services: {},
        timestamp: new Date(),
        uptime: 3600,
      } as HealthStatus),
      getSystemHealth: jest.fn().mockResolvedValue({
        overall: 'healthy',
        services: {},
        timestamp: new Date(),
        uptime: 3600,
      } as HealthStatus),
    };

    mockPerformanceTracker = {
      trackExecution: jest.fn().mockResolvedValue(undefined),
      trackMemoryUsage: jest.fn().mockResolvedValue(undefined),
      trackResourceUtilization: jest.fn().mockResolvedValue(undefined),
      detectAnomalies: jest.fn().mockResolvedValue([]),
      getPerformanceBaseline: jest.fn().mockResolvedValue({
        metric: 'test',
        mean: 100,
        median: 95,
        p95: 150,
        p99: 200,
        standardDeviation: 25,
        sampleSize: 1000,
        lastUpdated: new Date(),
      }),
      analyzePerformanceTrend: jest.fn().mockResolvedValue({
        metric: 'test',
        timeRange: { start: new Date(), end: new Date() },
        trend: 'stable',
        changeRate: 0.02,
        confidence: 0.95,
        dataPoints: 100,
      }),
    };

    mockDashboardService = {
      createDashboard: jest.fn().mockResolvedValue('dashboard-123'),
      updateDashboard: jest.fn().mockResolvedValue(undefined),
      deleteDashboard: jest.fn().mockResolvedValue(undefined),
      getDashboard: jest.fn().mockResolvedValue({} as DashboardConfig),
      getDashboardData: jest.fn().mockResolvedValue({
        dashboardId: 'test-dashboard',
        widgets: {},
        timestamp: new Date(),
        timeRange: { start: new Date(), end: new Date() },
      } as DashboardData),
      queryMetrics: jest.fn().mockResolvedValue([]),
      exportDashboard: jest.fn().mockResolvedValue('{}'),
    };

    await Test.createTestingModule({
      providers: [
        MonitoringFacadeService,
        { provide: 'IMetricsCollector', useValue: mockMetricsCollector },
        { provide: 'IAlertingService', useValue: mockAlertingService },
        { provide: 'IHealthCheck', useValue: mockHealthCheck },
        { provide: 'IPerformanceTracker', useValue: mockPerformanceTracker },
        { provide: 'IDashboard', useValue: mockDashboardService },
      ],
    }).compile();

    service = new MonitoringFacadeService(
      mockMetricsCollector,
      mockAlertingService,
      mockHealthCheck,
      mockPerformanceTracker,
      mockDashboardService,
    );
  });

  describe('Facade Pattern Implementation', () => {
    it('should initialize with all required services', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MonitoringFacadeService);
    });

    it('should provide unified interface for all monitoring operations', () => {
      // Verify facade interface completeness
      expect(typeof service.recordMetric).toBe('function');
      expect(typeof service.recordTimer).toBe('function');
      expect(typeof service.recordCounter).toBe('function');
      expect(typeof service.recordGauge).toBe('function');
      expect(typeof service.recordHistogram).toBe('function');
      expect(typeof service.registerHealthCheck).toBe('function');
      expect(typeof service.getSystemHealth).toBe('function');
      expect(typeof service.getServiceHealth).toBe('function');
      expect(typeof service.createAlertRule).toBe('function');
      expect(typeof service.updateAlertRule).toBe('function');
      expect(typeof service.deleteAlertRule).toBe('function');
      expect(typeof service.getActiveAlerts).toBe('function');
      expect(typeof service.queryMetrics).toBe('function');
      expect(typeof service.getDashboardData).toBe('function');
      expect(typeof service.createDashboard).toBe('function');
    });
  });

  describe('Metrics Operations (AC2 Verification)', () => {
    const testTags: MetricTags = { service: 'test', version: '1.0' };

    it('should record metrics with performance tracking', async () => {
      await service.recordMetric('test.metric', 42, testTags);

      expect(mockMetricsCollector.collect).toHaveBeenCalledWith('test.metric', 42, testTags);
      expect(mockPerformanceTracker.trackExecution).toHaveBeenCalledWith(
        'metrics.collection.test.metric',
        1,
        { value: 42, tags: testTags }
      );
    });

    it('should record timer metrics with type tags', async () => {
      await service.recordTimer('test.timer', 150, testTags);

      expect(mockMetricsCollector.collect).toHaveBeenCalledWith('test.timer', 150, {
        ...testTags,
        metric_type: 'timer',
      });
    });

    it('should record counter metrics with defaults', async () => {
      await service.recordCounter('test.counter', undefined, testTags);

      expect(mockMetricsCollector.collect).toHaveBeenCalledWith('test.counter', 1, {
        ...testTags,
        metric_type: 'counter',
      });
    });

    it('should record gauge metrics with type identification', async () => {
      await service.recordGauge('test.gauge', 85.5, testTags);

      expect(mockMetricsCollector.collect).toHaveBeenCalledWith('test.gauge', 85.5, {
        ...testTags,
        metric_type: 'gauge',
      });
    });

    it('should record histogram metrics correctly', async () => {
      await service.recordHistogram('test.histogram', 234, testTags);

      expect(mockMetricsCollector.collect).toHaveBeenCalledWith('test.histogram', 234, {
        ...testTags,
        metric_type: 'histogram',
      });
    });

    it('should handle metrics collection failures gracefully', async () => {
      mockMetricsCollector.collect.mockRejectedValueOnce(new Error('Collection failed'));

      // Should not throw error - monitoring failures don't break workflows
      await expect(service.recordMetric('test.failing.metric', 100)).resolves.toBeUndefined();

      expect(mockMetricsCollector.collect).toHaveBeenCalledWith('test.failing.metric', 100, undefined);
    });
  });

  describe('Health Check Operations (AC4 Verification)', () => {
    it('should register health checks successfully', async () => {
      const healthCheckFn = jest.fn().mockResolvedValue(true);
      
      await service.registerHealthCheck('test-service', healthCheckFn);

      expect(mockHealthCheck.register).toHaveBeenCalledWith('test-service', healthCheckFn);
    });

    it('should return system health status', async () => {
      const expectedHealth: HealthStatus = {
        overall: 'healthy',
        services: {
          'test-service': {
            state: 'healthy',
            lastCheck: new Date(),
            responseTime: 45,
          },
        },
        timestamp: new Date(),
        uptime: 7200,
      };

      mockHealthCheck.getSystemHealth.mockResolvedValueOnce(expectedHealth);

      const result = await service.getSystemHealth();

      expect(result).toEqual(expectedHealth);
      expect(mockHealthCheck.getSystemHealth).toHaveBeenCalled();
    });

    it('should return service-specific health status', async () => {
      const expectedServiceHealth: ServiceHealth = {
        state: 'degraded',
        lastCheck: new Date(),
        responseTime: 150,
        error: 'Slow response',
      };

      mockHealthCheck.check.mockResolvedValueOnce(expectedServiceHealth);

      const result = await service.getServiceHealth('slow-service');

      expect(result).toEqual(expectedServiceHealth);
      expect(mockHealthCheck.check).toHaveBeenCalledWith('slow-service');
    });

    it('should provide fallback health status on failure', async () => {
      mockHealthCheck.getSystemHealth.mockRejectedValueOnce(new Error('Health check failed'));

      const result = await service.getSystemHealth();

      expect(result.overall).toBe('unhealthy');
      expect(result.services.monitoring.state).toBe('unhealthy');
      expect(result.services.monitoring.error).toBe('Health check system unavailable');
    });
  });

  describe('Alerting Operations (AC3 Verification)', () => {
    const testAlertRule: AlertRule = {
      id: 'rule-123',
      name: 'High CPU Alert',
      description: 'Alert when CPU usage exceeds 90%',
      condition: {
        metric: 'system.cpu.usage',
        operator: 'gt',
        threshold: 90,
        timeWindow: 300,
        aggregation: 'avg',
        evaluationWindow: 60,
      },
      severity: 'critical',
      channels: [
        { type: 'email', name: 'ops-team', config: {}, enabled: true },
      ],
      cooldownPeriod: 1800,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create alert rules and track metrics', async () => {
      const ruleId = await service.createAlertRule(testAlertRule);

      expect(ruleId).toBe('rule-123');
      expect(mockAlertingService.createRule).toHaveBeenCalledWith(testAlertRule);
      expect(mockMetricsCollector.collect).toHaveBeenCalledWith(
        'monitoring.alert_rules.created',
        1,
        {
          rule_name: testAlertRule.name,
          severity: testAlertRule.severity,
        }
      );
    });

    it('should update alert rules and track changes', async () => {
      const updates = { enabled: false };
      
      await service.updateAlertRule('rule-123', updates);

      expect(mockAlertingService.updateRule).toHaveBeenCalledWith('rule-123', updates);
      expect(mockMetricsCollector.collect).toHaveBeenCalledWith(
        'monitoring.alert_rules.updated',
        1,
        { rule_id: 'rule-123' }
      );
    });

    it('should delete alert rules and track deletions', async () => {
      await service.deleteAlertRule('rule-123');

      expect(mockAlertingService.deleteRule).toHaveBeenCalledWith('rule-123');
      expect(mockMetricsCollector.collect).toHaveBeenCalledWith(
        'monitoring.alert_rules.deleted',
        1,
        { rule_id: 'rule-123' }
      );
    });

    it('should retrieve active alerts', async () => {
      const testAlerts: Alert[] = [
        {
          id: 'alert-123',
          ruleId: 'rule-123',
          name: 'High CPU Alert',
          severity: 'critical',
          message: 'CPU usage at 95%',
          timestamp: new Date(),
          acknowledged: false,
        },
      ];

      mockAlertingService.getActiveAlerts.mockResolvedValueOnce(testAlerts);

      const result = await service.getActiveAlerts();

      expect(result).toEqual(testAlerts);
      expect(mockAlertingService.getActiveAlerts).toHaveBeenCalled();
    });

    it('should return empty array when alerting fails', async () => {
      mockAlertingService.getActiveAlerts.mockRejectedValueOnce(new Error('Alerting failed'));

      const result = await service.getActiveAlerts();

      expect(result).toEqual([]);
    });
  });

  describe('Query Operations (AC6 Verification)', () => {
    it('should query metrics with performance tracking', async () => {
      const testQuery: MetricQuery = {
        metric: 'system.cpu.usage',
        timeRange: {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        },
        aggregation: 'avg',
        groupBy: ['host'],
        limit: 100,
      };

      const expectedResults: MetricData[] = [
        {
          metric: 'system.cpu.usage',
          timestamp: new Date(),
          value: 85.5,
          tags: { host: 'server-01' },
        },
      ];

      mockDashboardService.queryMetrics.mockResolvedValueOnce(expectedResults);

      const result = await service.queryMetrics(testQuery);

      expect(result).toEqual(expectedResults);
      expect(mockDashboardService.queryMetrics).toHaveBeenCalledWith(testQuery);
      expect(mockMetricsCollector.collect).toHaveBeenCalledWith(
        'monitoring.query.duration',
        expect.any(Number),
        {
          metric: testQuery.metric,
          aggregation: testQuery.aggregation,
        }
      );
    });

    it('should get dashboard data successfully', async () => {
      const dashboardId = 'dashboard-123';
      const expectedData: DashboardData = {
        dashboardId,
        widgets: {
          'widget-1': [
            {
              metric: 'system.memory.usage',
              timestamp: new Date(),
              value: 75.2,
              tags: { host: 'server-01' },
            },
          ],
        },
        timestamp: new Date(),
        timeRange: {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        },
      };

      mockDashboardService.getDashboardData.mockResolvedValueOnce(expectedData);

      const result = await service.getDashboardData(dashboardId);

      expect(result).toEqual(expectedData);
      expect(mockDashboardService.getDashboardData).toHaveBeenCalledWith(dashboardId);
    });

    it('should create dashboards and track creation', async () => {
      const dashboardConfig: DashboardConfig = {
        id: 'dashboard-123',
        name: 'System Overview',
        description: 'Main system metrics dashboard',
        widgets: [],
        refreshInterval: 30,
        timeRange: {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.createDashboard(dashboardConfig);

      expect(result).toBe('dashboard-123');
      expect(mockDashboardService.createDashboard).toHaveBeenCalledWith(dashboardConfig);
      expect(mockMetricsCollector.collect).toHaveBeenCalledWith(
        'monitoring.dashboards.created',
        1,
        { dashboard_name: dashboardConfig.name }
      );
    });

    it('should provide fallback dashboard data on failure', async () => {
      mockDashboardService.getDashboardData.mockRejectedValueOnce(
        new Error('Dashboard service failed')
      );

      const result = await service.getDashboardData('failing-dashboard');

      expect(result.dashboardId).toBe('failing-dashboard');
      expect(result.widgets).toEqual({});
      expect(result.timeRange.start).toBeInstanceOf(Date);
      expect(result.timeRange.end).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should never throw errors - monitoring failures must not break workflows', async () => {
      // Make all services fail
      mockMetricsCollector.collect.mockRejectedValue(new Error('Metrics failed'));
      mockAlertingService.createRule.mockRejectedValue(new Error('Alerting failed'));
      mockHealthCheck.register.mockRejectedValue(new Error('Health check failed'));

      // All operations should complete without throwing
      await expect(service.recordMetric('test', 1)).resolves.toBeUndefined();
      await expect(service.createAlertRule({} as AlertRule)).resolves.toBeDefined();
      await expect(service.registerHealthCheck('test', jest.fn())).resolves.toBeUndefined();
    });

    it('should provide meaningful fallback values', async () => {
      mockHealthCheck.getSystemHealth.mockRejectedValue(new Error('Health failed'));
      mockAlertingService.getActiveAlerts.mockRejectedValue(new Error('Alerts failed'));
      mockDashboardService.queryMetrics.mockRejectedValue(new Error('Query failed'));

      const health = await service.getSystemHealth();
      const alerts = await service.getActiveAlerts();
      const metrics = await service.queryMetrics({} as MetricQuery);

      expect(health.overall).toBe('unhealthy');
      expect(alerts).toEqual([]);
      expect(metrics).toEqual([]);
    });

    it('should log errors for debugging without propagating them', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      mockMetricsCollector.collect.mockRejectedValueOnce(new Error('Test error'));

      await service.recordMetric('test.metric', 100);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring operation failed'),
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String),
        })
      );

      loggerSpy.mockRestore();
    });
  });

  describe('Performance Requirements (Non-Functional)', () => {
    it('should complete facade operations within performance budget', async () => {
      const startTime = Date.now();
      
      await service.recordMetric('perf.test', 123);
      await service.getSystemHealth();
      await service.getActiveAlerts();
      
      const duration = Date.now() - startTime;
      
      // Should complete well under 100ms (target <5ms overhead)
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent operations without blocking', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.recordMetric(`concurrent.test.${i}`, i)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(mockMetricsCollector.collect).toHaveBeenCalledTimes(10);
    });
  });
});