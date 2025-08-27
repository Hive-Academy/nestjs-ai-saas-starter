import { Test, type TestingModule } from '@nestjs/testing';
import { PerformanceTrackerService } from './performance-tracker.service';
import type {
  ResourceUtilization,
  TimeRange,
} from '../interfaces/monitoring.interface';

describe('PerformanceTrackerService', () => {
  let service: PerformanceTrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceTrackerService],
    }).compile();

    service = module.get<PerformanceTrackerService>(PerformanceTrackerService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Performance Execution Tracking (AC5 Verification)', () => {
    it('should track workflow execution performance', async () => {
      await service.trackExecution('workflow.process_document', 1250, {
        documentSize: '2MB',
        processingSteps: 5,
      });

      const baseline = await service.getPerformanceBaseline(
        'workflow.process_document'
      );
      expect(baseline.metric).toBe('workflow.process_document');
      expect(baseline.sampleSize).toBe(1);
      expect(baseline.mean).toBe(1250);
    });

    it('should track multiple execution samples and calculate statistics', async () => {
      const executionTimes = [
        1000, 1100, 950, 1200, 1050, 1300, 1150, 1000, 1250, 1080,
      ];

      for (const time of executionTimes) {
        await service.trackExecution('api.request_processing', time, {
          endpoint: '/api/v1/process',
        });
      }

      const baseline = await service.getPerformanceBaseline(
        'api.request_processing'
      );

      expect(baseline.sampleSize).toBe(10);
      expect(baseline.mean).toBeCloseTo(1108, 0); // Average of test data
      expect(baseline.median).toBeGreaterThan(0);
      expect(baseline.p95).toBeGreaterThan(baseline.mean);
      expect(baseline.p99).toBeGreaterThan(baseline.p95);
      expect(baseline.standardDeviation).toBeGreaterThan(0);
    });

    it('should handle concurrent performance tracking', async () => {
      const concurrentPromises = Array.from({ length: 100 }, (_, i) =>
        service.trackExecution('concurrent.test', 100 + Math.random() * 50, {
          thread: i.toString(),
        })
      );

      await Promise.all(concurrentPromises);

      const baseline = await service.getPerformanceBaseline('concurrent.test');
      expect(baseline.sampleSize).toBe(100);
      expect(baseline.mean).toBeGreaterThan(100);
      expect(baseline.mean).toBeLessThan(150);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage patterns', async () => {
      const memoryUsages = [
        50 * 1024 * 1024, // 50MB
        75 * 1024 * 1024, // 75MB
        100 * 1024 * 1024, // 100MB
        85 * 1024 * 1024, // 85MB
        60 * 1024 * 1024, // 60MB
      ];

      for (const usage of memoryUsages) {
        await service.trackMemoryUsage('workflow.memory_intensive', usage);
      }

      const baseline = await service.getPerformanceBaseline(
        'workflow.memory_intensive'
      );
      expect(baseline.sampleSize).toBe(5);
      expect(baseline.mean).toBeCloseTo(74 * 1024 * 1024, -1000000); // ~74MB
    });

    it('should detect memory leak patterns', async () => {
      // Simulate gradual memory increase (potential leak)
      const baseMemory = 50 * 1024 * 1024; // 50MB base
      for (let i = 0; i < 20; i++) {
        const leakingMemory = baseMemory + i * 5 * 1024 * 1024; // +5MB per iteration
        await service.trackMemoryUsage('potentially.leaking', leakingMemory);
      }

      const trend = await service.analyzePerformanceTrend(
        'potentially.leaking',
        {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        }
      );

      expect(trend.trend).toBe('increasing');
      expect(trend.changeRate).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    it('should track memory efficiency across different workloads', async () => {
      const workloads = [
        { name: 'small_document', memory: 10 * 1024 * 1024 }, // 10MB
        { name: 'medium_document', memory: 50 * 1024 * 1024 }, // 50MB
        { name: 'large_document', memory: 200 * 1024 * 1024 }, // 200MB
        { name: 'huge_document', memory: 800 * 1024 * 1024 }, // 800MB
      ];

      for (const workload of workloads) {
        await service.trackMemoryUsage(
          `document.processing.${workload.name}`,
          workload.memory
        );
      }

      const smallBaseline = await service.getPerformanceBaseline(
        'document.processing.small_document'
      );
      const hugeBaseline = await service.getPerformanceBaseline(
        'document.processing.huge_document'
      );

      expect(hugeBaseline.mean).toBeGreaterThan(smallBaseline.mean * 10);
    });
  });

  describe('Resource Utilization Tracking', () => {
    it('should track comprehensive resource utilization', async () => {
      const resourceData: ResourceUtilization = {
        cpu: 75.5, // 75.5% CPU
        memory: 60.2, // 60.2% Memory
        disk: 45.8, // 45.8% Disk
        network: 25.3, // 25.3% Network
      };

      await service.trackResourceUtilization('system.overall', resourceData);

      const baseline = await service.getPerformanceBaseline(
        'system.overall.cpu'
      );
      expect(baseline.mean).toBe(75.5);

      const memoryBaseline = await service.getPerformanceBaseline(
        'system.overall.memory'
      );
      expect(memoryBaseline.mean).toBe(60.2);
    });

    it('should identify resource bottlenecks', async () => {
      // Simulate high CPU, normal other resources
      const highCpuScenarios = Array.from({ length: 10 }, (_, i) => ({
        cpu: 90 + Math.random() * 8, // 90-98% CPU
        memory: 50 + Math.random() * 10, // 50-60% Memory
        disk: 30 + Math.random() * 10, // 30-40% Disk
        network: 15 + Math.random() * 5, // 15-20% Network
      }));

      for (const scenario of highCpuScenarios) {
        await service.trackResourceUtilization('bottleneck.test', scenario);
      }

      const bottleneck = await service.identifyResourceBottleneck(
        'bottleneck.test'
      );
      expect(bottleneck.resource).toBe('cpu');
      expect(bottleneck.severity).toBe('high');
      expect(bottleneck.averageUtilization).toBeGreaterThan(90);
    });

    it('should track resource efficiency over time', async () => {
      const timePoints = 24; // 24 hours of data
      const baseTime = Date.now() - 24 * 3600000; // 24 hours ago

      for (let hour = 0; hour < timePoints; hour++) {
        // Simulate daily pattern: higher CPU during business hours
        const isBusinessHours = hour >= 8 && hour <= 18;
        const cpuUsage = isBusinessHours
          ? 70 + Math.random() * 20
          : 30 + Math.random() * 20;

        await service.trackResourceUtilization(
          'daily.pattern',
          {
            cpu: cpuUsage,
            memory: 50 + Math.random() * 20,
            disk: 40 + Math.random() * 10,
            network: 20 + Math.random() * 15,
          },
          new Date(baseTime + hour * 3600000)
        );
      }

      const pattern = await service.analyzeResourcePattern(
        'daily.pattern',
        'cpu'
      );
      expect(pattern.hasPattern).toBe(true);
      expect(pattern.patternType).toBe('daily');
      expect(pattern.peakPeriods).toContainEqual(
        expect.objectContaining({
          start: expect.any(Number),
          end: expect.any(Number),
        })
      );
    });
  });

  describe('Anomaly Detection (Statistical Analysis)', () => {
    it('should detect performance anomalies using z-score analysis', async () => {
      // Establish baseline with normal performance
      const normalTimes = Array.from(
        { length: 100 },
        () => 1000 + Math.random() * 200
      ); // 1000-1200ms

      for (const time of normalTimes) {
        await service.trackExecution('anomaly.detection.test', time);
      }

      // Introduce anomalous values
      await service.trackExecution('anomaly.detection.test', 5000); // 5 seconds (anomalous)
      await service.trackExecution('anomaly.detection.test', 8000); // 8 seconds (anomalous)
      await service.trackExecution('anomaly.detection.test', 10000); // 10 seconds (anomalous)

      const anomalies = await service.detectAnomalies('anomaly.detection.test');

      expect(anomalies).toHaveLength(3);
      expect(anomalies[0].severity).toBe('high');
      expect(anomalies[0].confidence).toBeGreaterThan(0.95);
      expect(anomalies[0].deviation).toBeGreaterThan(2); // Z-score > 2
    });

    it('should classify anomaly severity levels', async () => {
      // Establish baseline
      for (let i = 0; i < 50; i++) {
        await service.trackExecution('severity.test', 100 + Math.random() * 20); // 100-120ms baseline
      }

      // Add different severity anomalies
      await service.trackExecution('severity.test', 200); // Mild anomaly
      await service.trackExecution('severity.test', 400); // Medium anomaly
      await service.trackExecution('severity.test', 1000); // High anomaly

      const anomalies = await service.detectAnomalies('severity.test');

      // Sort by severity
      const lowSeverity = anomalies.find((a) => a.actualValue === 200);
      const mediumSeverity = anomalies.find((a) => a.actualValue === 400);
      const highSeverity = anomalies.find((a) => a.actualValue === 1000);

      expect(lowSeverity?.severity).toBe('low');
      expect(mediumSeverity?.severity).toBe('medium');
      expect(highSeverity?.severity).toBe('high');
    });

    it('should provide confidence scores for anomaly detection', async () => {
      // Small dataset should have lower confidence
      for (let i = 0; i < 5; i++) {
        await service.trackExecution('confidence.small', 100);
      }
      await service.trackExecution('confidence.small', 500);

      // Large dataset should have higher confidence
      for (let i = 0; i < 1000; i++) {
        await service.trackExecution(
          'confidence.large',
          100 + Math.random() * 10
        );
      }
      await service.trackExecution('confidence.large', 500);

      const smallDatasetAnomalies = await service.detectAnomalies(
        'confidence.small'
      );
      const largeDatasetAnomalies = await service.detectAnomalies(
        'confidence.large'
      );

      expect(largeDatasetAnomalies[0].confidence).toBeGreaterThan(
        smallDatasetAnomalies[0].confidence
      );
    });

    it('should handle time-series anomaly detection', async () => {
      const now = Date.now();
      const hourly = 3600000; // 1 hour in ms

      // Create time series with anomalous spike at hour 12
      for (let hour = 0; hour < 24; hour++) {
        const value = hour === 12 ? 5000 : 1000 + Math.random() * 200; // Spike at noon
        await service.trackExecution('timeseries.test', value, {
          timestamp: new Date(now - (24 - hour) * hourly),
        });
      }

      const timeRange: TimeRange = {
        start: new Date(now - 24 * hourly),
        end: new Date(now),
      };

      const anomalies = await service.detectTimeSeriesAnomalies(
        'timeseries.test',
        timeRange
      );
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].timestamp.getHours()).toBe(12);
    });
  });

  describe('Performance Baseline Management', () => {
    it('should establish and update performance baselines', async () => {
      const metricName = 'baseline.management.test';

      // Initial baseline establishment
      const initialTimes = Array.from(
        { length: 20 },
        () => 1000 + Math.random() * 100
      );
      for (const time of initialTimes) {
        await service.trackExecution(metricName, time);
      }

      const initialBaseline = await service.getPerformanceBaseline(metricName);
      expect(initialBaseline.sampleSize).toBe(20);

      // Add more data to update baseline
      const additionalTimes = Array.from(
        { length: 30 },
        () => 1200 + Math.random() * 100
      ); // Slightly higher
      for (const time of additionalTimes) {
        await service.trackExecution(metricName, time);
      }

      const updatedBaseline = await service.getPerformanceBaseline(metricName);
      expect(updatedBaseline.sampleSize).toBe(50);
      expect(updatedBaseline.mean).toBeGreaterThan(initialBaseline.mean);
      expect(updatedBaseline.lastUpdated).toBeInstanceOf(Date);
    });

    it('should support sliding window baselines', async () => {
      const metricName = 'sliding.window.test';

      // Fill baseline with old data
      for (let i = 0; i < 100; i++) {
        await service.trackExecution(metricName, 1000, {
          timestamp: new Date(Date.now() - (100 - i) * 60000), // Spread over 100 minutes
        });
      }

      // Add recent data with different performance characteristics
      for (let i = 0; i < 20; i++) {
        await service.trackExecution(metricName, 2000, {
          timestamp: new Date(Date.now() - i * 1000), // Last 20 seconds
        });
      }

      // Get baseline with 30-minute window
      const recentBaseline = await service.getPerformanceBaseline(metricName, {
        windowSize: 30 * 60000, // 30 minutes
      });

      expect(recentBaseline.mean).toBeCloseTo(2000, -50); // Should reflect recent performance
      expect(recentBaseline.sampleSize).toBeLessThan(120); // Should exclude old data
    });

    it('should provide percentile calculations for baseline', async () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]; // Perfect distribution

      for (const value of values) {
        await service.trackExecution('percentile.test', value);
      }

      const baseline = await service.getPerformanceBaseline('percentile.test');

      expect(baseline.median).toBeCloseTo(55, 0); // 50th percentile
      expect(baseline.p95).toBeCloseTo(95, 0); // 95th percentile
      expect(baseline.p99).toBeCloseTo(99, 0); // 99th percentile
    });
  });

  describe('Trend Analysis', () => {
    it('should analyze performance trends over time', async () => {
      const metricName = 'trend.analysis.test';
      const baseTime = Date.now() - 24 * 3600000; // 24 hours ago

      // Create increasing trend over 24 hours
      for (let hour = 0; hour < 24; hour++) {
        const value = 1000 + hour * 50; // Increases by 50ms each hour
        await service.trackExecution(metricName, value, {
          timestamp: new Date(baseTime + hour * 3600000),
        });
      }

      const trend = await service.analyzePerformanceTrend(metricName, {
        start: new Date(baseTime),
        end: new Date(),
      });

      expect(trend.trend).toBe('increasing');
      expect(trend.changeRate).toBeCloseTo(50, 5); // ~50ms per hour
      expect(trend.confidence).toBeGreaterThan(0.9);
      expect(trend.dataPoints).toBe(24);
    });

    it('should identify stable performance trends', async () => {
      const metricName = 'stable.trend.test';

      // Create stable performance with minor variations
      for (let i = 0; i < 100; i++) {
        const value = 1000 + (Math.random() - 0.5) * 20; // 1000ms ± 10ms
        await service.trackExecution(metricName, value);
      }

      const trend = await service.analyzePerformanceTrend(metricName, {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      expect(trend.trend).toBe('stable');
      expect(Math.abs(trend.changeRate)).toBeLessThan(5); // Very low change rate
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    it('should detect volatile performance patterns', async () => {
      const metricName = 'volatile.trend.test';

      // Create volatile performance with random spikes
      for (let i = 0; i < 50; i++) {
        const isSpike = Math.random() < 0.1; // 10% chance of spike
        const value = isSpike
          ? 5000 + Math.random() * 2000
          : 1000 + Math.random() * 200;
        await service.trackExecution(metricName, value);
      }

      const trend = await service.analyzePerformanceTrend(metricName, {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      expect(trend.trend).toBe('volatile');
      expect(trend.confidence).toBeLessThan(0.7); // Low confidence due to volatility
    });

    it('should provide trend predictions and forecasting', async () => {
      const metricName = 'prediction.test';

      // Create linear increasing trend
      for (let i = 0; i < 48; i++) {
        // 48 hours of data
        const value = 1000 + i * 10; // Increases by 10ms per hour
        await service.trackExecution(metricName, value, {
          timestamp: new Date(Date.now() - (48 - i) * 3600000),
        });
      }

      const prediction = await service.predictPerformanceTrend(metricName, {
        forecastHours: 24,
        confidenceInterval: 0.95,
      });

      expect(prediction.expectedValue).toBeGreaterThan(1480); // Current + 24 * 10
      expect(prediction.confidenceRange.lower).toBeLessThan(
        prediction.expectedValue
      );
      expect(prediction.confidenceRange.upper).toBeGreaterThan(
        prediction.expectedValue
      );
      expect(prediction.reliability).toBeGreaterThan(0.8);
    });
  });

  describe('Performance Optimization Insights', () => {
    it('should identify performance bottlenecks and optimization opportunities', async () => {
      // Simulate different workflow steps with varying performance
      const steps = [
        { name: 'input.validation', time: 50 },
        { name: 'data.processing', time: 2000 }, // Bottleneck
        { name: 'ai.inference', time: 800 },
        { name: 'result.formatting', time: 100 },
        { name: 'output.delivery', time: 150 },
      ];

      for (const step of steps) {
        for (let i = 0; i < 20; i++) {
          await service.trackExecution(
            `workflow.${step.name}`,
            step.time + Math.random() * 50
          );
        }
      }

      const bottlenecks = await service.identifyPerformanceBottlenecks(
        'workflow'
      );
      expect(bottlenecks).toHaveLength(1);
      expect(bottlenecks[0].step).toBe('data.processing');
      expect(bottlenecks[0].impact).toBeGreaterThan(0.6); // >60% of total time

      const optimizations = await service.suggestOptimizations('workflow');
      expect(optimizations).toContainEqual(
        expect.objectContaining({
          target: 'data.processing',
          type: 'bottleneck_resolution',
          expectedImprovement: expect.any(Number),
        })
      );
    });

    it('should provide capacity planning insights', async () => {
      const metricName = 'capacity.planning.test';

      // Simulate increasing load over time
      const baseTime = Date.now() - 30 * 24 * 3600000; // 30 days ago
      for (let day = 0; day < 30; day++) {
        const dailyLoad = 100 + day * 5; // Increasing load
        for (let hour = 0; hour < 24; hour++) {
          const hourlyCalls = dailyLoad + Math.floor(Math.random() * 20);
          await service.trackExecution(metricName, hourlyCalls, {
            timestamp: new Date(baseTime + day * 24 * 3600000 + hour * 3600000),
            metadata: { load_type: 'concurrent_requests' },
          });
        }
      }

      const capacity = await service.analyzeCapacity(metricName);
      expect(capacity.currentUtilization).toBeGreaterThan(0);
      expect(capacity.projectedCapacity).toBeGreaterThan(capacity.currentPeak);
      expect(capacity.recommendedScaling).toBeDefined();
      expect(capacity.timeToCapacity).toBeGreaterThan(0);
    });

    it('should track SLA compliance and performance budgets', async () => {
      const metricName = 'sla.compliance.test';
      const slaTarget = 1000; // 1 second SLA

      // Generate performance data with some SLA violations
      const performanceData = Array.from({ length: 100 }, (_, i) => {
        const isViolation = i % 10 === 0; // 10% violations
        return isViolation
          ? slaTarget + 500 + Math.random() * 1000
          : slaTarget - 200 + Math.random() * 300;
      });

      for (const time of performanceData) {
        await service.trackExecution(metricName, time);
      }

      const slaAnalysis = await service.analyzeSLACompliance(metricName, {
        target: slaTarget,
        timeWindow: '24h',
      });

      expect(slaAnalysis.complianceRate).toBeCloseTo(0.9, 1); // ~90% compliance
      expect(slaAnalysis.violationCount).toBe(10);
      expect(slaAnalysis.averageViolationSeverity).toBeGreaterThan(0);
      expect(slaAnalysis.worstViolation).toBeGreaterThan(slaTarget);
    });
  });

  describe('Memory Management and Efficiency', () => {
    it('should manage performance data efficiently to prevent memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate large amount of performance data
      for (let i = 0; i < 10000; i++) {
        await service.trackExecution(
          'memory.efficiency.test',
          1000 + Math.random() * 500,
          {
            executionId: `exec-${i}`,
            timestamp: new Date(Date.now() - i * 1000),
          }
        );
      }

      const afterTracking = process.memoryUsage().heapUsed;
      const trackingMemory = afterTracking - initialMemory;

      // Should use reasonable memory (< 100MB for 10k data points)
      expect(trackingMemory).toBeLessThan(100 * 1024 * 1024);

      // Test automatic cleanup of old data
      await service.cleanupOldData(new Date(Date.now() - 3600000)); // Clean data older than 1 hour

      if (global.gc) {
        global.gc();
      }

      const afterCleanup = process.memoryUsage().heapUsed;
      expect(afterCleanup).toBeLessThan(afterTracking);
    });

    it('should use circular buffers for real-time metrics', async () => {
      const metricName = 'circular.buffer.test';
      const bufferSize = 1000;

      // Fill beyond buffer capacity
      for (let i = 0; i < bufferSize + 500; i++) {
        await service.trackExecution(metricName, i);
      }

      const baseline = await service.getPerformanceBaseline(metricName);

      // Should maintain only the buffer size worth of data
      expect(baseline.sampleSize).toBeLessThanOrEqual(bufferSize);

      // Most recent data should be preserved
      const recentData = await service.getRecentPerformanceData(
        metricName,
        100
      );
      expect(recentData[0].value).toBeGreaterThan(bufferSize); // Most recent values
    });

    it('should provide memory usage statistics', async () => {
      await service.trackExecution('stats.test', 1000);

      const stats = service.getPerformanceTrackerStats();

      expect(stats).toMatchObject({
        totalMetrics: expect.any(Number),
        totalDataPoints: expect.any(Number),
        memoryUsage: expect.any(Number),
        oldestDataPoint: expect.any(Date),
        newestDataPoint: expect.any(Date),
        anomaliesDetected: expect.any(Number),
        baselinesComputed: expect.any(Number),
      });

      expect(stats.totalMetrics).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Integration and Export Capabilities', () => {
    it('should export performance data in multiple formats', async () => {
      await service.trackExecution('export.test', 1250, { tag: 'test' });
      await service.trackExecution('export.test', 1100, { tag: 'test' });

      // Test JSON export
      const jsonExport = await service.exportPerformanceData(
        'export.test',
        'json'
      );
      const parsedData = JSON.parse(jsonExport);
      expect(parsedData.baseline).toBeDefined();
      expect(parsedData.dataPoints).toHaveLength(2);

      // Test CSV export
      const csvExport = await service.exportPerformanceData(
        'export.test',
        'csv'
      );
      expect(csvExport).toContain('timestamp,value,metadata');
      expect(csvExport).toContain('1250');
      expect(csvExport).toContain('1100');

      // Test Prometheus metrics export
      const prometheusExport = await service.exportPerformanceMetrics(
        'prometheus'
      );
      expect(prometheusExport).toContain(
        'performance_baseline_mean{metric="export.test"}'
      );
      expect(prometheusExport).toContain(
        'performance_baseline_p95{metric="export.test"}'
      );
    });

    it('should support performance data streaming for real-time monitoring', async () => {
      const streamEvents: any[] = [];

      // Set up performance data stream
      const stream = service.createPerformanceStream('stream.test');
      stream.on('baseline_updated', (data: any) =>
        streamEvents.push({ type: 'baseline', data })
      );
      stream.on('anomaly_detected', (data: any) =>
        streamEvents.push({ type: 'anomaly', data })
      );

      // Generate performance data
      for (let i = 0; i < 10; i++) {
        await service.trackExecution('stream.test', 1000 + Math.random() * 100);
      }

      // Add anomalous data point
      await service.trackExecution('stream.test', 5000);

      // Wait for stream processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(streamEvents.some((e) => e.type === 'baseline')).toBe(true);
      expect(streamEvents.some((e) => e.type === 'anomaly')).toBe(true);

      stream.destroy();
    });
  });
});
