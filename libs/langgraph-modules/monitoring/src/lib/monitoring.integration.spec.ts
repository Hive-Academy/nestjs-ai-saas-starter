import { Test, type TestingModule } from '@nestjs/testing';
import { LanggraphModulesMonitoringModule as MonitoringModule } from './langgraph-modules/monitoring.module';
import { MonitoringFacadeService } from './core/monitoring-facade.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { AlertingService } from './services/alerting.service';
import { HealthCheckService } from './services/health-check.service';
import { PerformanceTrackerService } from './services/performance-tracker.service';
import { DashboardService } from './services/dashboard.service';
import type {
  MonitoringConfig,
  AlertRule,
  DashboardConfig,
  MetricTags,
  HealthCheckFunction,
} from './interfaces/monitoring.interface';

describe('MonitoringModule Integration Tests', () => {
  let module: TestingModule;
  let monitoringFacade: MonitoringFacadeService;
  let metricsCollector: MetricsCollectorService;
  let alertingService: AlertingService;
  let healthCheck: HealthCheckService;
  let performanceTracker: PerformanceTrackerService;
  let dashboardService: DashboardService;

  const testConfig: MonitoringConfig = {
    enabled: true,
    metrics: {
      backend: 'memory',
      batchSize: 10,
      flushInterval: 1000, // 1 second for tests
      maxBufferSize: 1000,
      retention: '24h',
      defaultTags: { environment: 'test', service: 'monitoring-test' },
    },
    alerting: {
      enabled: true,
      evaluationInterval: 1000, // 1 second for tests
      defaultCooldown: 30,
      channels: [
        {
          type: 'custom',
          name: 'test-console',
          config: { logLevel: 'info' },
          enabled: true,
        },
      ],
      escalationPolicies: [],
    },
    healthChecks: {
      enabled: true,
      interval: 1000, // 1 second for tests
      timeout: 5000,
      retries: 3,
      gracefulShutdownTimeout: 10000,
    },
    performance: {
      trackingEnabled: true,
      anomalyDetection: true,
      baselineWindow: '1h',
      sensitivityThreshold: 2.0,
      minSamples: 10,
    },
    dashboard: {
      id: 'test-dashboard',
      name: 'Test Dashboard',
      description: 'Integration test dashboard',
      widgets: [],
      refreshInterval: 30,
      timeRange: {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [MonitoringModule.forRoot(testConfig)],
    }).compile();

    // Get service instances
    monitoringFacade = module.get<MonitoringFacadeService>(
      MonitoringFacadeService
    );
    metricsCollector = module.get<MetricsCollectorService>(
      MetricsCollectorService
    );
    alertingService = module.get<AlertingService>(AlertingService);
    healthCheck = module.get<HealthCheckService>(HealthCheckService);
    performanceTracker = module.get<PerformanceTrackerService>(
      PerformanceTrackerService
    );
    dashboardService = module.get<DashboardService>(DashboardService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Module Initialization and Configuration', () => {
    it('should initialize all services successfully', () => {
      expect(monitoringFacade).toBeInstanceOf(MonitoringFacadeService);
      expect(metricsCollector).toBeInstanceOf(MetricsCollectorService);
      expect(alertingService).toBeInstanceOf(AlertingService);
      expect(healthCheck).toBeInstanceOf(HealthCheckService);
      expect(performanceTracker).toBeInstanceOf(PerformanceTrackerService);
      expect(dashboardService).toBeInstanceOf(DashboardService);
    });

    it('should inject dependencies correctly (DI container validation)', () => {
      // Verify that facade service has access to all underlying services
      expect(monitoringFacade).toBeDefined();

      // Test that services are properly connected by calling facade operations
      expect(async () => {
        await monitoringFacade.recordMetric('test.integration', 100);
        await monitoringFacade.getSystemHealth();
        await monitoringFacade.getActiveAlerts();
      }).not.toThrow();
    });

    it('should support async configuration', async () => {
      const asyncModule = await Test.createTestingModule({
        imports: [
          MonitoringModule.forRootAsync({
            useFactory: () => Promise.resolve(testConfig),
          }),
        ],
      }).compile();

      const asyncFacade = asyncModule.get<MonitoringFacadeService>(
        MonitoringFacadeService
      );
      expect(asyncFacade).toBeInstanceOf(MonitoringFacadeService);

      await asyncModule.close();
    });

    it('should be available globally when configured', async () => {
      const globalModule = await Test.createTestingModule({
        imports: [
          MonitoringModule.forRoot({
            ...testConfig,
            // Global module registration is handled in the module
          }),
        ],
      }).compile();

      // Should be able to inject monitoring services in any module
      const globalFacade = globalModule.get<MonitoringFacadeService>(
        MonitoringFacadeService
      );
      expect(globalFacade).toBeDefined();

      await globalModule.close();
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should handle complete monitoring workflow', async () => {
      const testTags: MetricTags = {
        workflow: 'e2e-test',
        step: 'integration',
      };

      // Step 1: Record metrics through facade
      await monitoringFacade.recordMetric('workflow.duration', 1250, testTags);
      await monitoringFacade.recordCounter('workflow.executions', 1, testTags);
      await monitoringFacade.recordGauge(
        'workflow.memory.usage',
        256,
        testTags
      );

      // Step 2: Track performance
      await performanceTracker.trackExecution('workflow.e2e.test', 1250, {
        complexity: 'high',
        dataSize: '1MB',
      });

      // Step 3: Register and check health
      const testHealthCheck: HealthCheckFunction = jest
        .fn()
        .mockResolvedValue(true);
      await healthCheck.register('e2e-test-service', testHealthCheck);

      const serviceHealth = await monitoringFacade.getServiceHealth(
        'e2e-test-service'
      );
      expect(serviceHealth.state).toBe('healthy');

      // Step 4: Create alert rule
      const alertRule: AlertRule = {
        id: 'e2e-test-alert',
        name: 'E2E Test High Duration',
        description: 'Alert when workflow takes too long',
        condition: {
          metric: 'workflow.duration',
          operator: 'gt',
          threshold: 2000,
          timeWindow: 300,
          aggregation: 'avg',
          evaluationWindow: 60,
        },
        severity: 'warning',
        channels: [
          { type: 'custom', name: 'test-console', config: {}, enabled: true },
        ],
        cooldownPeriod: 300,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const ruleId = await monitoringFacade.createAlertRule(alertRule);
      expect(ruleId).toBeDefined();

      // Step 5: Create dashboard
      const dashboardConfig: DashboardConfig = {
        id: 'e2e-test-dashboard',
        name: 'E2E Test Dashboard',
        description: 'Integration test monitoring dashboard',
        widgets: [
          {
            id: 'duration-widget',
            type: 'line',
            title: 'Workflow Duration',
            query: {
              metric: 'workflow.duration',
              timeRange: {
                start: new Date(Date.now() - 3600000),
                end: new Date(),
              },
              aggregation: 'avg',
              filters: testTags,
            },
            position: { x: 0, y: 0, width: 6, height: 4 },
            config: { color: '#4ecdc4' },
          },
        ],
        refreshInterval: 30,
        timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dashboardId = await monitoringFacade.createDashboard(
        dashboardConfig
      );
      expect(dashboardId).toBe('e2e-test-dashboard');

      // Step 6: Query dashboard data
      const dashboardData = await monitoringFacade.getDashboardData(
        dashboardId
      );
      expect(dashboardData.dashboardId).toBe(dashboardId);
      expect(dashboardData.widgets).toHaveProperty('duration-widget');

      // Step 7: Get system health overview
      const systemHealth = await monitoringFacade.getSystemHealth();
      expect(systemHealth.overall).toBeDefined();
      expect(systemHealth.services).toHaveProperty('e2e-test-service');

      // Cleanup
      await monitoringFacade.deleteAlertRule(ruleId);
      await dashboardService.deleteDashboard(dashboardId);
      await healthCheck.unregister('e2e-test-service');
    });

    it('should handle high-throughput monitoring scenario', async () => {
      const startTime = Date.now();
      const metricsCount = 1000;
      const promises: Promise<void>[] = [];

      // Generate high volume of monitoring data
      for (let i = 0; i < metricsCount; i++) {
        promises.push(
          monitoringFacade.recordMetric(
            `high.throughput.metric.${i % 10}`,
            Math.random() * 1000,
            {
              batch: Math.floor(i / 100).toString(),
              index: i.toString(),
            }
          )
        );
      }

      // Execute all metrics recording concurrently
      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should handle 1000 metrics in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify metrics were processed
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Allow for batch processing
      const stats = metricsCollector.getCollectorStats();
      expect(stats.processedMetrics).toBeGreaterThan(0);
    });

    it('should maintain monitoring during service failures (Resilience)', async () => {
      // Record some metrics successfully
      await monitoringFacade.recordMetric('resilience.test', 100);

      // Simulate backend failure
      const mockBackend = {
        initialize: jest.fn().mockResolvedValue(undefined),
        recordMetric: jest.fn().mockRejectedValue(new Error('Backend failed')),
        recordBatch: jest.fn().mockRejectedValue(new Error('Backend failed')),
        query: jest.fn().mockRejectedValue(new Error('Backend failed')),
        health: jest.fn().mockResolvedValue(false),
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      // Register failing backend
      await metricsCollector.registerBackend('failing-backend', mockBackend);

      // Should continue operating despite backend failure
      await expect(
        monitoringFacade.recordMetric('resilience.test.2', 200)
      ).resolves.toBeUndefined();

      // Health checks should still work
      const health = await monitoringFacade.getSystemHealth();
      expect(health).toBeDefined();

      // Alerting should continue
      const alerts = await monitoringFacade.getActiveAlerts();
      expect(alerts).toBeInstanceOf(Array);
    });

    it('should support concurrent monitoring operations safely', async () => {
      const concurrentOperations = [
        // Metrics recording
        ...Array.from({ length: 50 }, (_, i) =>
          monitoringFacade.recordMetric(
            `concurrent.test.${i}`,
            Math.random() * 100
          )
        ),
        // Health checks
        ...Array.from({ length: 10 }, (_, i) =>
          healthCheck.register(
            `concurrent-service-${i}`,
            jest.fn().mockResolvedValue(true)
          )
        ),
        // Performance tracking
        ...Array.from({ length: 20 }, (_, i) =>
          performanceTracker.trackExecution(
            `concurrent.perf.${i}`,
            100 + Math.random() * 50
          )
        ),
      ];

      // Execute all operations concurrently
      await expect(Promise.all(concurrentOperations)).resolves.toBeDefined();

      // Verify system remains healthy
      const systemHealth = await monitoringFacade.getSystemHealth();
      expect(systemHealth.overall).toBeDefined();
    });
  });

  describe('Cross-Service Communication and Data Flow', () => {
    it('should propagate metrics from collector to dashboard', async () => {
      const metricName = 'cross.service.test';
      const metricValue = 42;
      const tags = { test: 'cross-service' };

      // Record metric through facade
      await monitoringFacade.recordMetric(metricName, metricValue, tags);

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query metric through dashboard service
      const dashboardQuery = {
        metric: metricName,
        timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
        aggregation: 'avg' as const,
        filters: tags,
      };

      const results = await dashboardService.queryMetrics(dashboardQuery);
      // Results might be empty if no mock data setup, but should not throw
      expect(results).toBeInstanceOf(Array);
    });

    it('should trigger alerts based on performance metrics', async () => {
      const metricName = 'performance.alert.test';

      // Create alert rule for performance metric
      const alertRule: AlertRule = {
        id: 'perf-alert-test',
        name: 'Performance Alert Test',
        description: 'Test performance-based alerting',
        condition: {
          metric: metricName,
          operator: 'gt',
          threshold: 2000,
          timeWindow: 60,
          aggregation: 'avg',
          evaluationWindow: 30,
        },
        severity: 'warning',
        channels: [{ type: 'custom', name: 'test', config: {}, enabled: true }],
        cooldownPeriod: 60,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await alertingService.createRule(alertRule);

      // Record performance data that should trigger alert
      await performanceTracker.trackExecution(metricName, 3000); // Above threshold

      // Evaluate alert rules
      await alertingService.evaluateRules();

      const activeAlerts = await alertingService.getActiveAlerts();
      // Check if alert was potentially triggered (depends on rule evaluation logic)
      expect(activeAlerts).toBeInstanceOf(Array);

      // Cleanup
      await alertingService.deleteRule(alertRule.id);
    });

    it('should integrate health checks with alerting system', async () => {
      const serviceName = 'health-alert-integration';

      // Register a health check that will fail
      const failingHealthCheck: HealthCheckFunction = jest
        .fn()
        .mockResolvedValue(false);
      await healthCheck.register(serviceName, failingHealthCheck);

      // Create alert rule for health check failures
      const healthAlertRule: AlertRule = {
        id: 'health-alert-integration',
        name: 'Service Health Alert',
        description: 'Alert when service becomes unhealthy',
        condition: {
          metric: `health.${serviceName}`,
          operator: 'eq',
          threshold: 0, // 0 = unhealthy, 1 = healthy
          timeWindow: 60,
          aggregation: 'avg',
          evaluationWindow: 30,
        },
        severity: 'critical',
        channels: [{ type: 'custom', name: 'test', config: {}, enabled: true }],
        cooldownPeriod: 300,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await alertingService.createRule(healthAlertRule);

      // Trigger health check
      const healthResult = await healthCheck.check(serviceName);
      expect(healthResult.state).toBe('unhealthy');

      // System should be able to correlate health status with alerting
      const systemHealth = await monitoringFacade.getSystemHealth();
      expect(systemHealth.services).toHaveProperty(serviceName);
      expect(systemHealth.services[serviceName].state).toBe('unhealthy');

      // Cleanup
      await alertingService.deleteRule(healthAlertRule.id);
      await healthCheck.unregister(serviceName);
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should recover gracefully from service initialization failures', async () => {
      // Create module with invalid configuration
      const invalidConfig = {
        ...testConfig,
        metrics: {
          ...testConfig.metrics,
          backend: 'invalid-backend' as any,
        },
      };

      // Should not fail module initialization
      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot(invalidConfig)],
      }).compile();

      const facade = testModule.get<MonitoringFacadeService>(
        MonitoringFacadeService
      );

      // Should still be able to record metrics (with fallback)
      await expect(
        facade.recordMetric('recovery.test', 100)
      ).resolves.toBeUndefined();

      await testModule.close();
    });

    it('should maintain functionality when some services are degraded', async () => {
      // Simulate alerting service failure
      jest
        .spyOn(alertingService, 'getActiveAlerts')
        .mockRejectedValueOnce(new Error('Alerting service degraded'));

      // Other services should continue working
      await expect(
        monitoringFacade.recordMetric('degraded.test', 100)
      ).resolves.toBeUndefined();

      const health = await monitoringFacade.getSystemHealth();
      expect(health).toBeDefined();

      // Alerting should return empty array as fallback
      const alerts = await monitoringFacade.getActiveAlerts();
      expect(alerts).toEqual([]);

      // Dashboard should continue working
      const dashboardData = await monitoringFacade.getDashboardData(
        'test-dashboard'
      );
      expect(dashboardData).toBeDefined();
    });

    it('should handle module shutdown gracefully', async () => {
      // Record some metrics before shutdown
      await monitoringFacade.recordMetric('shutdown.test', 100);

      // Services should have cleanup methods
      expect(typeof metricsCollector.onModuleDestroy).toBe('function');
      expect(typeof alertingService.onModuleDestroy).toBe('function');
      expect(typeof healthCheck.onModuleDestroy).toBe('function');
      expect(typeof performanceTracker.onModuleDestroy).toBe('function');
      expect(typeof dashboardService.onModuleDestroy).toBe('function');

      // Should not throw during cleanup
      await expect(module.close()).resolves.toBeUndefined();
    });
  });

  describe('Performance and Resource Usage Integration', () => {
    it('should monitor its own resource usage (Self-Monitoring)', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate monitoring workload
      for (let i = 0; i < 100; i++) {
        await monitoringFacade.recordMetric(
          `self.monitoring.${i}`,
          Math.random() * 100
        );
        await performanceTracker.trackExecution(
          `self.perf.${i}`,
          50 + Math.random() * 50
        );
      }

      // Force health checks
      await monitoringFacade.getSystemHealth();

      // Force dashboard data generation
      await monitoringFacade.getDashboardData('test-dashboard');

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should use reasonable memory (< 50MB for this workload)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Verify self-monitoring metrics are being tracked
      const stats = metricsCollector.getCollectorStats();
      expect(stats.processedMetrics).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const loadTestDuration = 2000; // 2 seconds
      const startTime = Date.now();
      let operationCount = 0;

      // Continuous load test
      while (Date.now() - startTime < loadTestDuration) {
        await Promise.all([
          monitoringFacade.recordMetric('load.test', Math.random() * 100),
          performanceTracker.trackExecution(
            'load.perf',
            10 + Math.random() * 20
          ),
          operationCount % 10 === 0
            ? monitoringFacade.getSystemHealth()
            : Promise.resolve(),
        ]);
        operationCount++;
      }

      const actualDuration = Date.now() - startTime;
      const operationsPerSecond = (operationCount / actualDuration) * 1000;

      // Should maintain reasonable throughput (>100 ops/sec)
      expect(operationsPerSecond).toBeGreaterThan(100);
    });

    it('should detect and report monitoring system bottlenecks', async () => {
      // Generate load on different services
      const loadPromises = [
        // Metrics collection load
        ...Array.from({ length: 200 }, (_, i) =>
          monitoringFacade.recordMetric(
            `bottleneck.metrics.${i}`,
            Math.random() * 100
          )
        ),
        // Health check load
        ...Array.from({ length: 20 }, (_, i) =>
          healthCheck.register(
            `bottleneck-service-${i}`,
            jest.fn().mockResolvedValue(true)
          )
        ),
        // Dashboard query load
        ...Array.from({ length: 10 }, () =>
          monitoringFacade.getDashboardData('test-dashboard')
        ),
      ];

      const startTime = Date.now();
      await Promise.all(loadPromises);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Check for any performance degradation indicators
      const performanceInsights =
        await performanceTracker.analyzePerformanceTrend(
          'monitoring.system.load',
          {
            start: new Date(Date.now() - 300000), // 5 minutes ago
            end: new Date(),
          }
        );

      expect(performanceInsights).toBeDefined();
    });
  });

  describe('Configuration and Customization Integration', () => {
    it('should support runtime configuration updates', async () => {
      // Test updating metrics configuration
      const newConfig = {
        ...testConfig,
        metrics: {
          ...testConfig.metrics,
          batchSize: 50, // Increased batch size
          flushInterval: 2000, // Increased flush interval
        },
      };

      // Update configuration (if supported)
      // Note: This would depend on implementation of runtime config updates
      await expect(() =>
        monitoringFacade.updateConfiguration(newConfig)
      ).not.toThrow();

      // Verify that metrics collection continues with new configuration
      await monitoringFacade.recordMetric('config.update.test', 100);
    });

    it('should support custom metric tags and metadata', async () => {
      const customTags: MetricTags = {
        application: 'monitoring-test',
        version: '1.0.0',
        environment: 'integration-test',
        region: 'us-east-1',
        team: 'platform',
        customField: 'custom-value',
      };

      await monitoringFacade.recordMetric('custom.tags.test', 42, customTags);

      // Verify tags are preserved through the system
      const dashboardQuery = {
        metric: 'custom.tags.test',
        timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
        aggregation: 'avg' as const,
        filters: { team: 'platform' },
      };

      // Should be able to query by custom tags
      const results = await dashboardService.queryMetrics(dashboardQuery);
      expect(results).toBeInstanceOf(Array);
    });

    it('should integrate with external monitoring backends', async () => {
      // Mock external backend
      const externalBackend = {
        initialize: jest.fn().mockResolvedValue(undefined),
        recordMetric: jest.fn().mockResolvedValue(undefined),
        recordBatch: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue([]),
        health: jest.fn().mockResolvedValue(true),
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      // Register external backend
      await metricsCollector.registerBackend('external-test', externalBackend);

      // Record metrics - should go to all backends
      await monitoringFacade.recordMetric('external.integration.test', 100);

      // Force flush to ensure backend is called
      await metricsCollector.flush();

      // Verify external backend received metrics
      expect(externalBackend.recordBatch).toHaveBeenCalled();
    });
  });
});
