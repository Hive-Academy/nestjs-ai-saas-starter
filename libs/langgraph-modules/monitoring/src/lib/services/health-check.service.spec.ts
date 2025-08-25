import { Test, type TestingModule } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service';
import type {
  HealthCheckFunction,
  ServiceHealth,
  HealthStatus,
  HealthState,
} from '../interfaces/monitoring.interface';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthCheckService],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Health Check Registration (AC4 Verification)', () => {
    it('should register health checks successfully', async () => {
      const healthCheck: HealthCheckFunction = jest.fn().mockResolvedValue(true);
      
      await service.register('database', healthCheck);
      
      const checks = service.getRegisteredChecks();
      expect(checks).toContain('database');
    });

    it('should unregister health checks', async () => {
      const healthCheck: HealthCheckFunction = jest.fn().mockResolvedValue(true);
      
      await service.register('redis', healthCheck);
      expect(service.getRegisteredChecks()).toContain('redis');
      
      await service.unregister('redis');
      expect(service.getRegisteredChecks()).not.toContain('redis');
    });

    it('should prevent duplicate registrations', async () => {
      const healthCheck1: HealthCheckFunction = jest.fn().mockResolvedValue(true);
      const healthCheck2: HealthCheckFunction = jest.fn().mockResolvedValue(false);
      
      await service.register('duplicate-test', healthCheck1);
      await expect(service.register('duplicate-test', healthCheck2)).rejects.toThrow();
    });

    it('should auto-register default system checks', async () => {
      const checks = service.getRegisteredChecks();
      
      // Default system checks should be registered automatically
      expect(checks).toContain('memory');
      expect(checks).toContain('cpu');
      expect(checks).toContain('uptime');
    });
  });

  describe('Individual Health Check Execution', () => {
    it('should execute health checks and return status', async () => {
      const mockCheck: HealthCheckFunction = jest.fn().mockResolvedValue(true);
      await service.register('test-service', mockCheck);
      
      const result = await service.check('test-service');
      
      expect(result.state).toBe('healthy');
      expect(result.lastCheck).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      expect(mockCheck).toHaveBeenCalled();
    });

    it('should handle failing health checks', async () => {
      const failingCheck: HealthCheckFunction = jest.fn().mockResolvedValue(false);
      await service.register('failing-service', failingCheck);
      
      const result = await service.check('failing-service');
      
      expect(result.state).toBe('unhealthy');
      expect(result.error).toBeDefined();
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should handle health check exceptions', async () => {
      const errorCheck: HealthCheckFunction = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );
      await service.register('error-service', errorCheck);
      
      const result = await service.check('error-service');
      
      expect(result.state).toBe('unhealthy');
      expect(result.error).toContain('Service unavailable');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should enforce timeout protection (5s max)', async () => {
      const slowCheck: HealthCheckFunction = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 10000))
      );
      await service.register('slow-service', slowCheck);
      
      const startTime = Date.now();
      const result = await service.check('slow-service');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(6000); // Should timeout before 6 seconds
      expect(result.state).toBe('unhealthy');
      expect(result.error).toContain('timeout');
    });

    it('should return cached results within TTL (30s)', async () => {
      const expensiveCheck = jest.fn().mockResolvedValue(true);
      await service.register('cached-service', expensiveCheck);
      
      // First call
      const result1 = await service.check('cached-service');
      expect(expensiveCheck).toHaveBeenCalledTimes(1);
      
      // Second call within TTL should use cache
      const result2 = await service.check('cached-service');
      expect(expensiveCheck).toHaveBeenCalledTimes(1); // Still only called once
      
      expect(result1.lastCheck.getTime()).toBe(result2.lastCheck.getTime());
    });

    it('should refresh cache after TTL expires', async () => {
      const refreshableCheck = jest.fn().mockResolvedValue(true);
      await service.register('refresh-service', refreshableCheck);
      
      // First call
      await service.check('refresh-service');
      expect(refreshableCheck).toHaveBeenCalledTimes(1);
      
      // Simulate time passing beyond TTL (30 seconds)
      jest.advanceTimersByTime(31000);
      
      // Second call should refresh cache
      await service.check('refresh-service');
      expect(refreshableCheck).toHaveBeenCalledTimes(2);
    });
  });

  describe('System-Wide Health Assessment', () => {
    it('should aggregate health from all registered checks', async () => {
      await service.register('service-1', jest.fn().mockResolvedValue(true));
      await service.register('service-2', jest.fn().mockResolvedValue(true));
      await service.register('service-3', jest.fn().mockResolvedValue(true));
      
      const systemHealth = await service.getSystemHealth();
      
      expect(systemHealth.overall).toBe('healthy');
      expect(Object.keys(systemHealth.services)).toContain('service-1');
      expect(Object.keys(systemHealth.services)).toContain('service-2');
      expect(Object.keys(systemHealth.services)).toContain('service-3');
      expect(systemHealth.timestamp).toBeInstanceOf(Date);
      expect(systemHealth.uptime).toBeGreaterThan(0);
    });

    it('should implement intelligent health rollup (unhealthy > degraded > healthy)', async () => {
      // Test case 1: All healthy = overall healthy
      await service.register('healthy-1', jest.fn().mockResolvedValue(true));
      await service.register('healthy-2', jest.fn().mockResolvedValue(true));
      
      let systemHealth = await service.getSystemHealth();
      expect(systemHealth.overall).toBe('healthy');
      
      // Test case 2: One degraded = overall degraded
      await service.register('degraded-1', jest.fn().mockImplementation(async () => {
        // Simulate degraded service (slow but working)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }));
      
      systemHealth = await service.getSystemHealth();
      expect(systemHealth.overall).toBe('degraded');
      
      // Test case 3: One unhealthy = overall unhealthy (highest priority)
      await service.register('unhealthy-1', jest.fn().mockResolvedValue(false));
      
      systemHealth = await service.getSystemHealth();
      expect(systemHealth.overall).toBe('unhealthy');
    });

    it('should check all services concurrently for performance', async () => {
      const checkFunctions = Array.from({ length: 10 }, (_, i) => 
        jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(true), 100))
        )
      );
      
      // Register all checks
      for (let i = 0; i < checkFunctions.length; i++) {
        await service.register(`concurrent-${i}`, checkFunctions[i]);
      }
      
      const startTime = Date.now();
      await service.checkAll();
      const duration = Date.now() - startTime;
      
      // Should complete in ~100ms (concurrent) not ~1000ms (sequential)
      expect(duration).toBeLessThan(300);
      checkFunctions.forEach(fn => expect(fn).toHaveBeenCalled());
    });
  });

  describe('Health State Classification', () => {
    it('should classify healthy services correctly', async () => {
      const quickHealthyCheck = jest.fn().mockResolvedValue(true);
      await service.register('quick-healthy', quickHealthyCheck);
      
      const result = await service.check('quick-healthy');
      
      expect(result.state).toBe('healthy');
      expect(result.responseTime).toBeLessThan(1000);
      expect(result.error).toBeUndefined();
    });

    it('should classify degraded services (slow but working)', async () => {
      const slowCheck = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        return true;
      });
      await service.register('slow-service', slowCheck);
      
      const result = await service.check('slow-service');
      
      expect(result.state).toBe('degraded');
      expect(result.responseTime).toBeGreaterThan(2000);
      expect(result.error).toBeUndefined(); // No error, just slow
    });

    it('should classify unhealthy services (failed or errored)', async () => {
      const failedCheck = jest.fn().mockResolvedValue(false);
      await service.register('failed-service', failedCheck);
      
      const errorCheck = jest.fn().mockRejectedValue(new Error('Connection failed'));
      await service.register('error-service', errorCheck);
      
      const failedResult = await service.check('failed-service');
      expect(failedResult.state).toBe('unhealthy');
      
      const errorResult = await service.check('error-service');
      expect(errorResult.state).toBe('unhealthy');
    });
  });

  describe('Default System Health Checks', () => {
    it('should provide memory usage health check', async () => {
      const memoryResult = await service.check('memory');
      
      expect(memoryResult.state).toBeDefined();
      expect(memoryResult.metadata).toHaveProperty('usage');
      expect(memoryResult.metadata).toHaveProperty('free');
      expect(memoryResult.metadata).toHaveProperty('total');
    });

    it('should provide CPU usage health check', async () => {
      const cpuResult = await service.check('cpu');
      
      expect(cpuResult.state).toBeDefined();
      expect(cpuResult.metadata).toHaveProperty('loadAverage');
      expect(cpuResult.metadata).toHaveProperty('usage');
    });

    it('should provide uptime health check', async () => {
      const uptimeResult = await service.check('uptime');
      
      expect(uptimeResult.state).toBe('healthy'); // Uptime should always be healthy if running
      expect(uptimeResult.metadata).toHaveProperty('uptime');
      expect(typeof uptimeResult.metadata?.uptime).toBe('number');
    });

    it('should detect unhealthy conditions in system checks', async () => {
      // Mock high memory usage
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 2000 * 1024 * 1024, // 2GB
        heapTotal: 1800 * 1024 * 1024, // 1.8GB
        heapUsed: 1700 * 1024 * 1024, // 1.7GB (95% heap usage)
        external: 100 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024,
      });

      const memoryResult = await service.check('memory');
      
      // Should detect high memory usage as degraded or unhealthy
      expect(['degraded', 'unhealthy']).toContain(memoryResult.state);
      expect(memoryResult.metadata?.heapUsagePercent).toBeGreaterThan(90);
    });
  });

  describe('Health History and Trends', () => {
    it('should maintain health check history', async () => {
      const fluctuatingCheck = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      
      await service.register('fluctuating', fluctuatingCheck);
      
      // Execute check multiple times
      await service.check('fluctuating');
      jest.advanceTimersByTime(31000); // Bypass cache
      await service.check('fluctuating');
      jest.advanceTimersByTime(31000); // Bypass cache
      await service.check('fluctuating');
      
      const history = await service.getHealthHistory('fluctuating');
      expect(history).toHaveLength(3);
      expect(history[0].state).toBe('healthy');
      expect(history[1].state).toBe('unhealthy');
      expect(history[2].state).toBe('healthy');
    });

    it('should analyze health trends over time', async () => {
      const degradingCheck = jest.fn()
        .mockResolvedValueOnce(true)
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(true), 2000)))
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(true), 4000)))
        .mockResolvedValueOnce(false);
      
      await service.register('degrading', degradingCheck);
      
      // Execute checks with increasing response time / degradation
      for (let i = 0; i < 4; i++) {
        await service.check('degrading');
        jest.advanceTimersByTime(31000); // Bypass cache
      }
      
      const trend = await service.analyzeHealthTrend('degrading');
      expect(trend.direction).toBe('degrading');
      expect(trend.confidence).toBeGreaterThan(0.7);
      expect(trend.avgResponseTime).toBeGreaterThan(1000);
    });

    it('should provide health insights and recommendations', async () => {
      const intermittentCheck = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      
      await service.register('intermittent', intermittentCheck);
      
      // Create pattern of intermittent failures
      for (let i = 0; i < 4; i++) {
        await service.check('intermittent');
        jest.advanceTimersByTime(31000); // Bypass cache
      }
      
      const insights = await service.getHealthInsights('intermittent');
      expect(insights.pattern).toBe('intermittent');
      expect(insights.reliability).toBeLessThan(0.8);
      expect(insights.recommendations).toContain('investigate');
    });
  });

  describe('Performance and Resource Efficiency', () => {
    it('should complete health checks within performance budget', async () => {
      // Register multiple services
      const checks = Array.from({ length: 50 }, (_, i) => 
        jest.fn().mockResolvedValue(true)
      );
      
      for (let i = 0; i < checks.length; i++) {
        await service.register(`perf-test-${i}`, checks[i]);
      }
      
      const startTime = Date.now();
      const systemHealth = await service.getSystemHealth();
      const duration = Date.now() - startTime;
      
      // Should complete system health check quickly even with many services
      expect(duration).toBeLessThan(6000); // Within timeout limit
      expect(systemHealth.overall).toBeDefined();
      expect(Object.keys(systemHealth.services)).toHaveLength(50 + 3); // +3 for default checks
    });

    it('should use memory efficiently for health data', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many health checks over time
      for (let i = 0; i < 1000; i++) {
        const checkFn = jest.fn().mockResolvedValue(i % 10 !== 0); // 90% healthy
        await service.register(`memory-test-${i}`, checkFn);
        await service.check(`memory-test-${i}`);
      }
      
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;
      
      // Should use reasonable memory (< 50MB for 1000 health checks)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should cleanup old health data to prevent memory leaks', async () => {
      const testCheck = jest.fn().mockResolvedValue(true);
      await service.register('cleanup-test', testCheck);
      
      // Generate a lot of historical data
      for (let i = 0; i < 100; i++) {
        await service.check('cleanup-test');
        jest.advanceTimersByTime(31000); // Bypass cache
      }
      
      let history = await service.getHealthHistory('cleanup-test');
      expect(history.length).toBeGreaterThan(50);
      
      // Trigger cleanup of old data (older than 24 hours)
      await service.cleanupOldHealthData(new Date(Date.now() - 86400000));
      
      history = await service.getHealthHistory('cleanup-test');
      // Should have fewer entries after cleanup
      expect(history.length).toBeLessThan(50);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unregistered health check requests', async () => {
      const result = await service.check('non-existent-service');
      
      expect(result.state).toBe('unhealthy');
      expect(result.error).toContain('not registered');
    });

    it('should handle concurrent health check executions safely', async () => {
      const concurrentCheck = jest.fn().mockResolvedValue(true);
      await service.register('concurrent-safe', concurrentCheck);
      
      // Execute same health check concurrently
      const promises = Array.from({ length: 10 }, () => 
        service.check('concurrent-safe')
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed and return consistent results
      expect(results.every(r => r.state === 'healthy')).toBe(true);
      // Should only call the check function once due to caching
      expect(concurrentCheck).toHaveBeenCalledTimes(1);
    });

    it('should gracefully handle health check function exceptions', async () => {
      const buggyCheck: HealthCheckFunction = jest.fn().mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });
      
      await service.register('buggy-service', buggyCheck);
      
      const result = await service.check('buggy-service');
      
      expect(result.state).toBe('unhealthy');
      expect(result.error).toContain('TypeError');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should provide fallback health status when all checks fail', async () => {
      // Make all default system checks fail
      const mockMemoryUsage = jest.spyOn(process, 'memoryUsage');
      mockMemoryUsage.mockImplementation(() => {
        throw new Error('System unavailable');
      });

      const systemHealth = await service.getSystemHealth();
      
      // Should still provide a health status even when system checks fail
      expect(systemHealth.overall).toBe('unhealthy');
      expect(systemHealth.services).toBeDefined();
      expect(systemHealth.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Integration with Monitoring Ecosystem', () => {
    it('should export health status in standard formats', async () => {
      await service.register('export-test', jest.fn().mockResolvedValue(true));
      await service.register('failing-test', jest.fn().mockResolvedValue(false));
      
      const systemHealth = await service.getSystemHealth();
      
      // Test Prometheus format export
      const prometheusFormat = await service.exportHealthMetrics('prometheus');
      expect(prometheusFormat).toContain('health_check_status{service="export-test"} 1');
      expect(prometheusFormat).toContain('health_check_status{service="failing-test"} 0');
      
      // Test JSON format export
      const jsonFormat = await service.exportHealthMetrics('json');
      const parsedHealth = JSON.parse(jsonFormat);
      expect(parsedHealth.overall).toBe(systemHealth.overall);
      expect(parsedHealth.services).toBeDefined();
    });

    it('should support health check webhooks for external monitoring', async () => {
      const webhookConfig = {
        url: 'https://monitoring.company.com/health',
        onStateChange: true,
        includeDiagnostics: true,
      };
      
      await service.configureHealthWebhook(webhookConfig);
      
      // Register a service that will change state
      const changingCheck = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      
      await service.register('state-changing', changingCheck);
      
      // First check - healthy
      await service.check('state-changing');
      
      // Second check - unhealthy (should trigger webhook)
      jest.advanceTimersByTime(31000);
      await service.check('state-changing');
      
      // Verify webhook was called (mock implementation would verify HTTP call)
      const webhookCalls = await service.getWebhookHistory();
      expect(webhookCalls).toHaveLength(1);
      expect(webhookCalls[0].trigger).toBe('state_change');
      expect(webhookCalls[0].service).toBe('state-changing');
    });
  });
});