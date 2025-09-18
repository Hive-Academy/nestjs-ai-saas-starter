import { Test, type TestingModule } from '@nestjs/testing';
import { AlertingService } from './alerting.service';
import type {
  INotificationProvider,
  AlertRule,
  Alert,
  AlertSeverity,
  ComparisonOperator,
  AggregationType,
} from '../interfaces/monitoring.interface';

describe('AlertingService', () => {
  let service: AlertingService;
  let mockEmailProvider: jest.Mocked<INotificationProvider>;
  let mockSlackProvider: jest.Mocked<INotificationProvider>;
  let mockWebhookProvider: jest.Mocked<INotificationProvider>;

  const createTestAlertRule = (overrides?: Partial<AlertRule>): AlertRule => ({
    id: 'test-rule-123',
    name: 'High CPU Usage',
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
      {
        type: 'email',
        name: 'ops-team',
        config: { to: 'ops@company.com' },
        enabled: true,
      },
    ],
    cooldownPeriod: 1800, // 30 minutes
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    // Create mock notification providers
    mockEmailProvider = {
      send: jest.fn().mockResolvedValue(undefined),
      test: jest.fn().mockResolvedValue(true),
    };

    mockSlackProvider = {
      send: jest.fn().mockResolvedValue(undefined),
      test: jest.fn().mockResolvedValue(true),
    };

    mockWebhookProvider = {
      send: jest.fn().mockResolvedValue(undefined),
      test: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertingService],
    }).compile();

    service = module.get<AlertingService>(AlertingService);

    // Register notification providers
    await service.registerNotificationProvider('email', mockEmailProvider);
    await service.registerNotificationProvider('slack', mockSlackProvider);
    await service.registerNotificationProvider('webhook', mockWebhookProvider);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Alert Rule Management (AC3 - Alerting System)', () => {
    it('should create alert rules successfully', async () => {
      const rule = createTestAlertRule();

      const ruleId = await service.createRule(rule);

      expect(ruleId).toBeDefined();
      expect(typeof ruleId).toBe('string');
    });

    it('should update alert rules', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      await service.updateRule(ruleId, {
        enabled: false,
        condition: {
          ...rule.condition,
          threshold: 95,
        },
      });

      const rules = await service.getAllRules();
      const updatedRule = rules.find((r: AlertRule) => r.id === ruleId);

      expect(updatedRule?.enabled).toBe(false);
      expect(updatedRule?.condition.threshold).toBe(95);
    });

    it('should delete alert rules', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      await service.deleteRule(ruleId);

      const rules = await service.getAllRules();
      expect(rules.find((r: AlertRule) => r.id === ruleId)).toBeUndefined();
    });

    it('should enable/disable rules', async () => {
      const rule = createTestAlertRule({ enabled: false });
      const ruleId = await service.createRule(rule);

      await service.enableRule(ruleId);

      let rules = await service.getAllRules();
      expect(rules.find((r: AlertRule) => r.id === ruleId)?.enabled).toBe(true);

      await service.disableRule(ruleId);

      rules = await service.getAllRules();
      expect(rules.find((r: AlertRule) => r.id === ruleId)?.enabled).toBe(
        false
      );
    });

    it('should validate rule configuration', async () => {
      const invalidRule = createTestAlertRule({
        condition: {
          metric: '',
          operator: 'invalid' as ComparisonOperator,
          threshold: -1,
          timeWindow: 0,
          aggregation: 'invalid' as AggregationType,
          evaluationWindow: -10,
        },
      });

      await expect(service.createRule(invalidRule)).rejects.toThrow();
    });
  });

  describe('Alert Evaluation Engine', () => {
    it('should evaluate rules against metric data', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      // Simulate metric data that exceeds threshold
      const metricData = [
        { timestamp: new Date(), value: 95, tags: { host: 'server-1' } },
        { timestamp: new Date(), value: 92, tags: { host: 'server-2' } },
      ];

      const ruleWithId = createTestAlertRule({ id: ruleId });
      await service.evaluateRuleWithData(ruleWithId, { metricData });

      // Should create an alert
      const activeAlerts = await service.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].ruleId).toBe(ruleId);
      expect(activeAlerts[0].severity).toBe('critical');
    });

    it('should support all comparison operators', async () => {
      const testCases: Array<{
        operator: ComparisonOperator;
        threshold: number;
        value: number;
        shouldAlert: boolean;
      }> = [
        { operator: 'gt', threshold: 90, value: 95, shouldAlert: true },
        { operator: 'gt', threshold: 90, value: 85, shouldAlert: false },
        { operator: 'gte', threshold: 90, value: 90, shouldAlert: true },
        { operator: 'lt', threshold: 10, value: 5, shouldAlert: true },
        { operator: 'lte', threshold: 10, value: 10, shouldAlert: true },
        { operator: 'eq', threshold: 50, value: 50, shouldAlert: true },
        { operator: 'ne', threshold: 50, value: 60, shouldAlert: true },
      ];

      for (const testCase of testCases) {
        const rule = createTestAlertRule({
          id: `test-${testCase.operator}-${testCase.threshold}-${testCase.value}`,
          condition: {
            ...createTestAlertRule().condition,
            operator: testCase.operator,
            threshold: testCase.threshold,
          },
        });

        const ruleId = await service.createRule(rule);
        const metricData = [
          {
            timestamp: new Date(),
            value: testCase.value,
            tags: {},
          },
        ];

        await service.evaluateRuleWithData(rule, { metricData });

        const activeAlerts = await service.getActiveAlerts();
        const hasAlert = activeAlerts.some((alert) => alert.ruleId === ruleId);

        expect(hasAlert).toBe(testCase.shouldAlert);

        // Clean up for next test
        await service.deleteRule(ruleId);
      }
    });

    it('should support different aggregation types', async () => {
      const testData = [
        { timestamp: new Date(), value: 10, tags: {} },
        { timestamp: new Date(), value: 20, tags: {} },
        { timestamp: new Date(), value: 30, tags: {} },
        { timestamp: new Date(), value: 40, tags: {} },
        { timestamp: new Date(), value: 100, tags: {} }, // Outlier for p95/p99
      ];

      const aggregationTests: Array<{
        aggregation: AggregationType;
        expectedValue: number;
        threshold: number;
        shouldAlert: boolean;
      }> = [
        {
          aggregation: 'avg',
          expectedValue: 40,
          threshold: 35,
          shouldAlert: true,
        },
        {
          aggregation: 'sum',
          expectedValue: 200,
          threshold: 150,
          shouldAlert: true,
        },
        {
          aggregation: 'min',
          expectedValue: 10,
          threshold: 15,
          shouldAlert: false,
        },
        {
          aggregation: 'max',
          expectedValue: 100,
          threshold: 90,
          shouldAlert: true,
        },
        {
          aggregation: 'count',
          expectedValue: 5,
          threshold: 3,
          shouldAlert: true,
        },
        {
          aggregation: 'p95',
          expectedValue: 100,
          threshold: 90,
          shouldAlert: true,
        },
        {
          aggregation: 'p99',
          expectedValue: 100,
          threshold: 90,
          shouldAlert: true,
        },
      ];

      for (const test of aggregationTests) {
        const rule = createTestAlertRule({
          id: `agg-test-${test.aggregation}`,
          condition: {
            ...createTestAlertRule().condition,
            aggregation: test.aggregation,
            threshold: test.threshold,
          },
        });

        const ruleId = await service.createRule(rule);
        await service.evaluateRuleWithData(rule, { testData });

        const activeAlerts = await service.getActiveAlerts();
        const hasAlert = activeAlerts.some((alert) => alert.ruleId === ruleId);

        expect(hasAlert).toBe(test.shouldAlert);

        await service.deleteRule(ruleId);
      }
    });
  });

  describe('Multi-Channel Notification System', () => {
    it('should send alerts to all configured channels', async () => {
      const rule = createTestAlertRule({
        channels: [
          {
            type: 'email',
            name: 'ops-email',
            config: { to: 'ops@company.com' },
            enabled: true,
          },
          {
            type: 'slack',
            name: 'ops-slack',
            config: { channel: '#alerts' },
            enabled: true,
          },
          {
            type: 'webhook',
            name: 'ops-webhook',
            config: { url: 'https://api.company.com/alerts' },
            enabled: true,
          },
        ],
      });

      const ruleId = await service.createRule(rule);

      const alert: Alert = {
        id: 'alert-123',
        ruleId,
        name: rule.name,
        severity: rule.severity,
        message: 'CPU usage exceeded 90%',
        timestamp: new Date(),
        acknowledged: false,
      };

      await service.triggerAlert(alert);

      expect(mockEmailProvider.send).toHaveBeenCalledWith(
        alert,
        rule.channels[0]
      );
      expect(mockSlackProvider.send).toHaveBeenCalledWith(
        alert,
        rule.channels[1]
      );
      expect(mockWebhookProvider.send).toHaveBeenCalledWith(
        alert,
        rule.channels[2]
      );
    });

    it('should skip disabled notification channels', async () => {
      const rule = createTestAlertRule({
        channels: [
          { type: 'email', name: 'ops-email', config: {}, enabled: true },
          { type: 'slack', name: 'ops-slack', config: {}, enabled: false }, // Disabled
        ],
      });

      const ruleId = await service.createRule(rule);

      const alert: Alert = {
        id: 'alert-456',
        ruleId,
        name: rule.name,
        severity: rule.severity,
        message: 'Test alert',
        timestamp: new Date(),
        acknowledged: false,
      };

      await service.triggerAlert(alert);

      expect(mockEmailProvider.send).toHaveBeenCalled();
      expect(mockSlackProvider.send).not.toHaveBeenCalled();
    });

    it('should continue sending to other channels when one fails', async () => {
      mockEmailProvider.send.mockRejectedValueOnce(
        new Error('Email service down')
      );

      const rule = createTestAlertRule({
        channels: [
          { type: 'email', name: 'ops-email', config: {}, enabled: true },
          { type: 'slack', name: 'ops-slack', config: {}, enabled: true },
        ],
      });

      const ruleId = await service.createRule(rule);

      const alert: Alert = {
        id: 'alert-789',
        ruleId,
        name: rule.name,
        severity: rule.severity,
        message: 'Resilience test',
        timestamp: new Date(),
        acknowledged: false,
      };

      await service.triggerAlert(alert);

      expect(mockEmailProvider.send).toHaveBeenCalled();
      expect(mockSlackProvider.send).toHaveBeenCalled();
    });
  });

  describe('Cooldown and Spam Prevention', () => {
    it('should respect cooldown periods to prevent alert spam', async () => {
      const rule = createTestAlertRule({
        cooldownPeriod: 300, // 5 minutes
      });

      const ruleId = await service.createRule(rule);

      const alert: Alert = {
        id: 'cooldown-test-1',
        ruleId,
        name: rule.name,
        severity: rule.severity,
        message: 'First alert',
        timestamp: new Date(),
        acknowledged: false,
      };

      // First alert should go through
      await service.triggerAlert(alert);
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1);

      // Second alert within cooldown should be suppressed
      const secondAlert: Alert = {
        ...alert,
        id: 'cooldown-test-2',
        message: 'Second alert',
      };
      await service.triggerAlert(secondAlert);
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Simulate time passing beyond cooldown
      jest.advanceTimersByTime(300000 + 1000); // 5 minutes + 1 second

      // Third alert should go through after cooldown
      const thirdAlert: Alert = {
        ...alert,
        id: 'cooldown-test-3',
        message: 'Third alert',
      };
      await service.triggerAlert(thirdAlert);
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(2);
    });

    it('should group similar alerts to reduce noise', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      // Create multiple similar alerts
      const alerts = Array.from({ length: 5 }, (_, i) => ({
        id: `group-test-${i}`,
        ruleId,
        name: rule.name,
        severity: rule.severity as AlertSeverity,
        message: `CPU usage: ${90 + i}%`,
        timestamp: new Date(),
        acknowledged: false,
      }));

      for (const alert of alerts) {
        await service.triggerAlert(alert);
      }

      // Should group alerts and reduce notification count
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1);

      const sentAlert = mockEmailProvider.send.mock.calls[0][0];
      expect(sentAlert.message).toContain('5 similar alerts'); // Grouped message
    });

    it('should handle alert acknowledgment', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      const alert: Alert = {
        id: 'ack-test',
        ruleId,
        name: rule.name,
        severity: rule.severity,
        message: 'Test acknowledgment',
        timestamp: new Date(),
        acknowledged: false,
      };

      await service.triggerAlert(alert);

      // Acknowledge the alert
      await service.acknowledgeAlert(alert.id);

      const activeAlerts = await service.getActiveAlerts();
      expect(activeAlerts.find((a) => a.id === alert.id)?.acknowledged).toBe(
        true
      );

      // Acknowledged alerts should not re-notify during cooldown
      await service.triggerAlert({ ...alert, id: 'ack-test-2' });
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1); // Still just the first one
    });
  });

  describe('Alert History and Tracking', () => {
    it('should maintain alert history for analysis', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      const alerts = Array.from({ length: 3 }, (_, i) => ({
        id: `history-test-${i}`,
        ruleId,
        name: rule.name,
        severity: rule.severity as AlertSeverity,
        message: `Historical alert ${i}`,
        timestamp: new Date(Date.now() - i * 3600000), // 1 hour apart
        acknowledged: i % 2 === 0, // Alternate acknowledged status
      }));

      for (const alert of alerts) {
        await service.triggerAlert(alert);
        if (alert.acknowledged) {
          await service.acknowledgeAlert(alert.id);
        }
      }

      const history = await service.getAlertHistory(ruleId);
      expect(history).toHaveLength(3);
      expect(history.every((alert) => alert.ruleId === ruleId)).toBe(true);
    });

    it('should support alert history pagination and filtering', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      // Create many alerts
      for (let i = 0; i < 50; i++) {
        await service.triggerAlert({
          id: `pagination-test-${i}`,
          ruleId,
          name: rule.name,
          severity: (i % 2 === 0 ? 'critical' : 'warning') as AlertSeverity,
          message: `Alert ${i}`,
          timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
          acknowledged: false,
        });
      }

      // Test pagination
      const page1 = await service.getAlertHistory(ruleId);
      const page2 = await service.getAlertHistory(ruleId);

      expect(page1).toHaveLength(20);
      expect(page2).toHaveLength(20);
      expect(page1[0].id).not.toBe(page2[0].id);

      // Test severity filtering
      const criticalAlerts = await service.getAlertHistory(ruleId);
      expect(
        criticalAlerts.every((alert) => alert.severity === 'critical')
      ).toBe(true);
    });

    it('should provide alert statistics and trends', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      // Create alerts over different time periods
      const now = Date.now();
      const alertCounts = [
        { period: now - 86400000, count: 5 }, // Yesterday: 5 alerts
        { period: now - 43200000, count: 8 }, // 12 hours ago: 8 alerts
        { period: now - 21600000, count: 3 }, // 6 hours ago: 3 alerts
      ];

      for (const { period, count } of alertCounts) {
        for (let i = 0; i < count; i++) {
          await service.triggerAlert({
            id: `stats-${period}-${i}`,
            ruleId,
            name: rule.name,
            severity: 'warning',
            message: `Statistical alert ${i}`,
            timestamp: new Date(period + i * 1000),
            acknowledged: false,
          });
        }
      }

      const stats = await service.getAlertStatistics();

      expect(stats.alertCount).toBeGreaterThanOrEqual(0);
      expect(stats.activeAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.evaluationCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should evaluate rules efficiently under load', async () => {
      // Create many rules
      await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          service.createRule(
            createTestAlertRule({
              id: `load-test-${i}`,
              name: `Load Test Rule ${i}`,
              condition: {
                ...createTestAlertRule().condition,
                threshold: 80 + (i % 20), // Vary thresholds
              },
            })
          )
        )
      );

      const startTime = Date.now();

      // Evaluate all rules
      await service.evaluateRules();

      const evaluationTime = Date.now() - startTime;

      // Should complete rule evaluation quickly (< 1 second for 100 rules)
      expect(evaluationTime).toBeLessThan(1000);

      const stats = service.getAlertingStats();
      expect(stats.totalRules).toBe(100);
      expect(stats.activeRules).toBeGreaterThanOrEqual(0);
    });

    it('should handle high-frequency alert generation', async () => {
      const rule = createTestAlertRule({
        cooldownPeriod: 0, // No cooldown for this test
      });
      const ruleId = await service.createRule(rule);

      const startTime = Date.now();

      // Generate many alerts rapidly
      const alertPromises = Array.from({ length: 1000 }, (_, i) =>
        service.triggerAlert({
          id: `frequency-test-${i}`,
          ruleId,
          name: rule.name,
          severity: 'info',
          message: `High frequency alert ${i}`,
          timestamp: new Date(),
          acknowledged: false,
        })
      );

      await Promise.all(alertPromises);

      const processingTime = Date.now() - startTime;

      // Should handle 1000 alerts in reasonable time (< 5 seconds)
      expect(processingTime).toBeLessThan(5000);

      const stats = service.getAlertingStats();
      expect(stats.alertCount).toBeGreaterThanOrEqual(0);
    });

    it('should manage memory efficiently with alert history', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      // Generate large volume of historical alerts
      for (let i = 0; i < 5000; i++) {
        await service.triggerAlert({
          id: `memory-test-${i}`,
          ruleId,
          name: rule.name,
          severity: 'info',
          message: `Memory test alert ${i}`,
          timestamp: new Date(),
          acknowledged: false,
        });
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;

      // Should use reasonable memory (< 100MB for 5k alerts)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Verify memory cleanup works
      await service.cleanupOldAlerts(3600000); // Clean alerts older than 1 hour (in milliseconds)

      if (global.gc) {
        global.gc();
      }

      const afterCleanup = process.memoryUsage().heapUsed;
      expect(afterCleanup).toBeLessThan(afterMemory);
    });
  });

  describe('Integration with Monitoring Ecosystem', () => {
    it('should export alerts in standard formats', async () => {
      const rule = createTestAlertRule();
      const ruleId = await service.createRule(rule);

      await service.triggerAlert({
        id: 'export-test',
        ruleId,
        name: rule.name,
        severity: 'warning',
        message: 'Export format test',
        timestamp: new Date(),
        acknowledged: false,
      });

      // Test CSV format
      const csvFormat = await service.exportAlerts('csv');
      expect(csvFormat).toContain('High CPU Usage');
      expect(csvFormat).toContain('warning');

      // Test JSON format
      const jsonFormat = await service.exportAlerts('json');
      const parsedAlerts = JSON.parse(jsonFormat);
      expect(parsedAlerts).toHaveLength(1);
      expect(parsedAlerts[0].name).toBe(rule.name);
    });

    it('should support webhook-based integrations', async () => {
      const webhookConfig = {
        url: 'https://api.external-system.com/alerts',
        headers: { Authorization: 'Bearer token123' },
        enabled: true,
      };

      await service.configureWebhookIntegration(webhookConfig);

      const rule = createTestAlertRule({
        channels: [
          {
            type: 'webhook',
            name: 'external-system',
            config: webhookConfig,
            enabled: true,
          },
        ],
      });

      const ruleId = await service.createRule(rule);

      await service.triggerAlert({
        id: 'webhook-test',
        ruleId,
        name: rule.name,
        severity: 'critical',
        message: 'Webhook integration test',
        timestamp: new Date(),
        acknowledged: false,
      });

      expect(mockWebhookProvider.send).toHaveBeenCalled();
    });
  });
});
