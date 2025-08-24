import { Test, type TestingModule } from '@nestjs/testing';
import { MetricsCollectorService } from './metrics-collector.service';
import type {
  IMetricsBackend,
  Metric,
  MetricTags,
  MetricResult,
  MetricQuery,
} from '../interfaces/monitoring.interface';
import { MetricsCollectionError } from '../interfaces/monitoring.interface';

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;
  let mockBackend: jest.Mocked<IMetricsBackend>;

  beforeEach(async () => {
    mockBackend = {
      initialize: jest.fn().mockResolvedValue(undefined),
      recordMetric: jest.fn().mockResolvedValue(undefined),
      recordBatch: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      health: jest.fn().mockResolvedValue(true),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsCollectorService],
    }).compile();

    service = module.get<MetricsCollectorService>(MetricsCollectorService);
    
    // Register mock backend for testing
    await service.registerBackend('test-backend', mockBackend);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Core Functionality (AC2 - Metrics Collection)', () => {
    it('should collect metrics with automatic type inference', async () => {
      await service.collect('request.count', 1, { service: 'api' });

      // Should eventually flush to backend
      await service.flush();
      
      expect(mockBackend.recordBatch).toHaveBeenCalled();
      const batchCall = mockBackend.recordBatch.mock.calls[0][0];
      expect(batchCall).toHaveLength(1);
      expect(batchCall[0]).toMatchObject({
        name: 'request.count',
        value: 1,
        tags: { service: 'api' },
        type: 'counter', // Inferred from name pattern
      });
    });

    it('should infer metric types from naming patterns', async () => {
      const testCases = [
        { name: 'request.count', expectedType: 'counter' },
        { name: 'response.time', expectedType: 'timer' },
        { name: 'memory.usage', expectedType: 'gauge' },
        { name: 'request.duration.histogram', expectedType: 'histogram' },
        { name: 'api.latency.summary', expectedType: 'summary' },
      ];

      for (const testCase of testCases) {
        await service.collect(testCase.name, 100, { test: 'inference' });
      }

      await service.flush();

      expect(mockBackend.recordBatch).toHaveBeenCalled();
      const batch = mockBackend.recordBatch.mock.calls[0][0];
      
      testCases.forEach((testCase, index) => {
        expect(batch[index].type).toBe(testCase.expectedType);
      });
    });

    it('should handle batch collection efficiently', async () => {
      const metrics: Metric[] = Array.from({ length: 50 }, (_, i) => ({
        name: `batch.metric.${i}`,
        type: 'counter',
        value: i,
        tags: { batch: 'test', index: i.toString() },
        timestamp: new Date(),
      }));

      await service.collectBatch(metrics);
      await service.flush();

      expect(mockBackend.recordBatch).toHaveBeenCalledWith(
        expect.arrayContaining(metrics)
      );
    });

    it('should respect batch size limits for performance', async () => {
      // Collect more than the batch size (100)
      const promises = Array.from({ length: 150 }, (_, i) =>
        service.collect(`large.batch.${i}`, i)
      );

      await Promise.all(promises);
      await service.flush();

      // Should split into multiple batches
      expect(mockBackend.recordBatch).toHaveBeenCalledTimes(2);
      
      const firstBatch = mockBackend.recordBatch.mock.calls[0][0];
      const secondBatch = mockBackend.recordBatch.mock.calls[1][0];
      
      expect(firstBatch.length).toBe(100); // First batch at limit
      expect(secondBatch.length).toBe(50);  // Remaining metrics
    });

    it('should enforce buffer size limits to prevent memory issues', async () => {
      // Try to exceed max buffer size (10,000)
      const promises = Array.from({ length: 15000 }, (_, i) =>
        service.collect(`buffer.overflow.${i}`, i)
      );

      await Promise.all(promises);

      const stats = service.getCollectorStats();
      expect(stats.bufferSize).toBeLessThanOrEqual(10000);
      expect(stats.droppedMetrics).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle high throughput (10,000+ metrics/minute)', async () => {
      const startTime = Date.now();
      const numMetrics = 1000; // Test with 1k metrics
      
      const promises = Array.from({ length: numMetrics }, (_, i) =>
        service.collect(`throughput.test.${i}`, i, { batch: Math.floor(i / 100).toString() })
      );

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const metricsPerSecond = (numMetrics / duration) * 1000;
      
      // Should handle > 10,000 metrics/minute (167 per second)
      expect(metricsPerSecond).toBeGreaterThan(167);
    });

    it('should use memory efficiently with circular buffering', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Collect metrics for 5 minutes of data
      const promises = Array.from({ length: 5000 }, (_, i) =>
        service.collect(`memory.test.${i % 100}`, Math.random() * 100)
      );

      await Promise.all(promises);
      
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;
      
      // Should use less than 50MB for 5k metrics
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should automatically flush metrics at configured intervals', async () => {
      // Collect some metrics but don't manually flush
      await service.collect('auto.flush.test', 42);
      
      // Wait for automatic flush interval (slightly longer than 30s batch interval)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Mock timer to trigger flush
      jest.advanceTimersByTime(30000);
      
      expect(mockBackend.recordBatch).toHaveBeenCalled();
    });
  });

  describe('Backend Strategy Pattern', () => {
    it('should support multiple backends simultaneously', async () => {
      const secondBackend: jest.Mocked<IMetricsBackend> = {
        initialize: jest.fn().mockResolvedValue(undefined),
        recordMetric: jest.fn().mockResolvedValue(undefined),
        recordBatch: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue([]),
        health: jest.fn().mockResolvedValue(true),
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      await service.registerBackend('prometheus', secondBackend);
      
      await service.collect('multi.backend.test', 100);
      await service.flush();

      // Both backends should receive the metric
      expect(mockBackend.recordBatch).toHaveBeenCalled();
      expect(secondBackend.recordBatch).toHaveBeenCalled();
    });

    it('should continue operating when one backend fails (Circuit Breaker)', async () => {
      mockBackend.recordBatch.mockRejectedValueOnce(new Error('Backend failure'));
      
      await service.collect('circuit.breaker.test', 50);
      await service.flush();

      // Should not throw error - circuit breaker protects
      expect(service.getCollectorStats().backendErrors).toBeGreaterThan(0);
    });

    it('should query metrics from appropriate backend', async () => {
      const query: MetricQuery = {
        metric: 'test.*',
        timeRange: {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        },
        aggregation: 'avg',
      };

      const expectedResults: MetricResult[] = [
        {
          metric: 'test.metric',
          values: [
            { timestamp: new Date(), value: 75 },
          ],
          tags: { service: 'test' },
        },
      ];

      mockBackend.query.mockResolvedValueOnce(expectedResults);

      const results = await service.query(query);

      expect(results).toEqual(expectedResults);
      expect(mockBackend.query).toHaveBeenCalledWith(query);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle metric collection errors gracefully', async () => {
      // This should not throw even with invalid data
      await expect(service.collect('', NaN)).resolves.toBeUndefined();
      await expect(service.collect(null as any, 100)).resolves.toBeUndefined();
      await expect(service.collect('test', Infinity)).resolves.toBeUndefined();
    });

    it('should validate metrics before processing', async () => {
      await service.collect('invalid.metric', -1, { invalid: null as any });
      
      // Should still attempt to collect but sanitize data
      const stats = service.getCollectorStats();
      expect(stats.invalidMetrics).toBeGreaterThan(0);
    });

    it('should recover from backend failures', async () => {
      mockBackend.recordBatch.mockRejectedValue(new Error('Backend down'));
      
      // Collect metrics while backend is failing
      await service.collect('recovery.test', 100);
      await service.flush();
      
      // Backend recovers
      mockBackend.recordBatch.mockResolvedValue(undefined);
      
      await service.collect('recovery.test', 200);
      await service.flush();
      
      // Should continue operating
      const stats = service.getCollectorStats();
      expect(stats.processedMetrics).toBeGreaterThan(0);
    });

    it('should provide comprehensive error context', async () => {
      mockBackend.recordBatch.mockRejectedValueOnce(
        new MetricsCollectionError('Test error', { backend: 'test-backend' })
      );

      await service.collect('error.context.test', 42);
      await service.flush();

      const stats = service.getCollectorStats();
      expect(stats.lastError).toBeDefined();
      expect(stats.lastError).toContain('Test error');
    });
  });

  describe('Memory Management', () => {
    it('should implement cleanup on module destroy', async () => {
      await service.collect('cleanup.test', 100);
      
      await service.onModuleDestroy();

      expect(mockBackend.cleanup).toHaveBeenCalled();
    });

    it('should handle buffer overflow with oldest-first eviction', async () => {
      // Fill buffer beyond capacity
      const promises = Array.from({ length: 12000 }, (_, i) =>
        service.collect(`overflow.${i}`, i)
      );

      await Promise.all(promises);

      const stats = service.getCollectorStats();
      expect(stats.bufferSize).toBeLessThanOrEqual(10000);
      expect(stats.droppedMetrics).toBe(2000); // Dropped oldest 2000
    });

    it('should prevent memory leaks from metric retention', async () => {
      const beforeHeap = process.memoryUsage().heapUsed;
      
      // Simulate 24 hours of metrics collection
      for (let hour = 0; hour < 24; hour++) {
        const promises = Array.from({ length: 1000 }, (_, i) =>
          service.collect(`hourly.${hour}.${i}`, Math.random() * 100)
        );
        await Promise.all(promises);
        await service.flush();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const afterHeap = process.memoryUsage().heapUsed;
      const heapIncrease = afterHeap - beforeHeap;

      // Should not leak significant memory (< 100MB for 24k metrics)
      expect(heapIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Statistics and Observability', () => {
    it('should provide comprehensive collector statistics', async () => {
      await service.collect('stats.test.1', 100);
      await service.collect('stats.test.2', 200);
      await service.flush();

      const stats = service.getCollectorStats();

      expect(stats).toMatchObject({
        processedMetrics: expect.any(Number),
        failedMetrics: expect.any(Number),
        bufferSize: expect.any(Number),
        droppedMetrics: expect.any(Number),
        backendErrors: expect.any(Number),
        invalidMetrics: expect.any(Number),
        lastFlush: expect.any(Date),
        uptime: expect.any(Number),
      });

      expect(stats.processedMetrics).toBeGreaterThan(0);
      expect(stats.bufferSize).toBeGreaterThanOrEqual(0);
    });

    it('should track processing performance metrics', async () => {
      const startTime = Date.now();
      
      await service.collect('perf.tracking', 42);
      await service.flush();
      
      const stats = service.getCollectorStats();
      expect(stats.avgProcessingTime).toBeDefined();
      expect(stats.avgProcessingTime).toBeGreaterThan(0);
      expect(stats.avgProcessingTime).toBeLessThan(100); // Should be fast
    });

    it('should reset statistics when requested', async () => {
      await service.collect('reset.test', 42);
      await service.flush();

      let stats = service.getCollectorStats();
      expect(stats.processedMetrics).toBeGreaterThan(0);

      await service.reset();

      stats = service.getCollectorStats();
      expect(stats.processedMetrics).toBe(0);
      expect(stats.failedMetrics).toBe(0);
      expect(stats.bufferSize).toBe(0);
    });
  });

  describe('Integration with Monitoring Ecosystem', () => {
    it('should support Prometheus metric format export', async () => {
      await service.collect('prometheus.test.counter', 1, { job: 'test', instance: 'test-1' });
      await service.collect('prometheus.test.gauge', 85.5, { service: 'api' });

      const prometheusFormat = await service.exportMetrics('prometheus');
      
      expect(prometheusFormat).toContain('prometheus_test_counter{job="test",instance="test-1"} 1');
      expect(prometheusFormat).toContain('prometheus_test_gauge{service="api"} 85.5');
    });

    it('should handle metric name sanitization for different backends', async () => {
      await service.collect('test-metric.with/special@chars', 100);
      
      await service.flush();
      
      const batchCall = mockBackend.recordBatch.mock.calls[0][0];
      // Should sanitize metric names for backend compatibility
      expect(batchCall[0].name).toMatch(/^[a-zA-Z_:][a-zA-Z0-9_:.]*$/);
    });
  });
});