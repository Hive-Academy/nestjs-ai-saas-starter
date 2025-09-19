import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { ConfidenceEvaluatorService, ApprovalPattern, ConfidenceFactor } from './confidence-evaluator.service';
import type { IConfidenceStorageService } from '../interfaces/confidence-storage.interface';
import type { WorkflowState } from '@hive-academy/langgraph-core';

// Mock storage service for testing
class MockConfidenceStorageService implements IConfidenceStorageService {
  private patterns = new Map<string, ApprovalPattern>();
  private history = new Map<string, ConfidenceFactor[]>();

  async storeApprovalPattern(pattern: ApprovalPattern): Promise<void> {
    this.patterns.set(pattern.nodeId, pattern);
  }

  async getApprovalPattern(patternId: string): Promise<ApprovalPattern | null> {
    return this.patterns.get(patternId) || null;
  }

  async getApprovalPatternsByExecution(): Promise<ApprovalPattern[]> {
    return Array.from(this.patterns.values());
  }

  async getAllApprovalPatterns(): Promise<ApprovalPattern[]> {
    return Array.from(this.patterns.values());
  }

  async updateApprovalPattern(patternId: string, updates: Partial<ApprovalPattern>): Promise<void> {
    const existing = this.patterns.get(patternId);
    if (existing) {
      this.patterns.set(patternId, { ...existing, ...updates });
    }
  }

  async deleteApprovalPattern(patternId: string): Promise<boolean> {
    return this.patterns.delete(patternId);
  }

  async storeConfidenceHistory(executionId: string, factors: ConfidenceFactor[]): Promise<void> {
    this.history.set(executionId, factors);
  }

  async getConfidenceHistory(executionId: string): Promise<ConfidenceFactor[]> {
    return this.history.get(executionId) || [];
  }

  async getAllConfidenceHistory(): Promise<Record<string, ConfidenceFactor[]>> {
    const result: Record<string, ConfidenceFactor[]> = {};
    this.history.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  async updateConfidenceFactors(executionId: string, newFactors: ConfidenceFactor[]): Promise<void> {
    this.history.set(executionId, newFactors);
  }

  async getMLTrainingData(): Promise<any> {
    return { patterns: [], outcomes: [], features: [], labels: [] };
  }

  async storeMLPrediction(): Promise<void> {}
  async getMLPredictions(): Promise<any[]> { return []; }
  async storeConfidenceOutcome(): Promise<void> {}
  async storeFeatureVector(): Promise<void> {}
  async getConfidenceAnalytics(): Promise<any> {
    return {
      totalEvaluations: 0,
      averageConfidence: 0,
      confidenceDistribution: {},
      accuracyMetrics: { correctPredictions: 0, totalPredictions: 0, accuracy: 0 },
      factorImpact: {},
      timeRange: { startDate: new Date(), endDate: new Date() },
    };
  }
  async getPatternInsights(): Promise<any> {
    return {
      mostEffectivePatterns: [],
      riskFactorCorrelations: {},
      confidenceTrends: { improving: 0, declining: 0, stable: 0 },
      recommendedThresholds: { lowRisk: 0.3, mediumRisk: 0.6, highRisk: 0.8 },
      userBehaviorPatterns: {},
    };
  }
  async getAllActivePatterns(): Promise<ApprovalPattern[]> {
    return this.getAllApprovalPatterns();
  }
  async getAllActiveHistory(): Promise<Record<string, ConfidenceFactor[]>> {
    return this.getAllConfidenceHistory();
  }
  async cleanup(): Promise<number> { return 0; }
  async isHealthy(): Promise<boolean> { return true; }
  async getStorageStats(): Promise<any> {
    return {
      totalPatterns: this.patterns.size,
      totalHistory: this.history.size,
      totalMLData: 0,
      storageSize: 0,
    };
  }
}

describe('ConfidenceEvaluatorService - Production Implementation', () => {
  let service: ConfidenceEvaluatorService;
  let mockStorage: MockConfidenceStorageService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    mockStorage = new MockConfidenceStorageService();
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfidenceEvaluatorService,
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: 'IConfidenceStorageService',
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);
  });

  describe('Anti-Pattern Elimination Validation', () => {
    it('should NOT contain development stub comments', () => {
      const serviceString = service.constructor.toString();
      
      // Verify development stub comments are eliminated
      expect(serviceString).not.toContain('would be from database in production');
      expect(serviceString).not.toContain('in production, these would be backed by persistent storage');
    });

    it('should require storage adapter for production functionality', () => {
      expect(service).toBeDefined();
      // Service should have injected storage adapter
      expect((service as any).confidenceStorage).toBeDefined();
      expect((service as any).confidenceStorage).toBeInstanceOf(MockConfidenceStorageService);
    });

    it('should use cache-only maps for performance, not primary storage', () => {
      // Maps should be cache-only, not primary storage
      expect((service as any).patternCache).toBeDefined();
      expect((service as any).historyCache).toBeDefined();
      
      // Old map names should not exist
      expect((service as any).approvalPatterns).toBeUndefined();
      expect((service as any).confidenceHistory).toBeUndefined();
    });
  });

  describe('Production-Ready Storage Integration', () => {
    const mockState: WorkflowState = {
      executionId: 'test-execution-123',
      currentNode: 'test-node',
      confidence: 0.7,
      metadata: {},
    } as WorkflowState;

    it('should store confidence factors in adapter first, then cache', async () => {
      const storeSpy = jest.spyOn(mockStorage, 'storeConfidenceHistory');
      
      const confidence = await service.evaluateConfidence(mockState);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(storeSpy).toHaveBeenCalledWith(
        'test-execution-123',
        expect.any(Array)
      );
    });

    it('should load patterns from storage, not hardcoded defaults', async () => {
      // Pre-populate storage with a pattern
      const testPattern: ApprovalPattern = {
        nodeId: 'test-node',
        approvalRate: 0.95,
        averageConfidence: 0.85,
        commonRejectionReasons: [],
        riskFactors: [],
        successfulExecutions: 10,
        failedExecutions: 1,
        lastUpdated: new Date(),
      };
      
      await mockStorage.storeApprovalPattern(testPattern);
      
      const retrievedPattern = await service.getHistoricalPattern('test-node');
      
      expect(retrievedPattern).toEqual(testPattern);
      expect(retrievedPattern?.approvalRate).toBe(0.95);
    });

    it('should update patterns in adapter first, then cache', async () => {
      const storePatternSpy = jest.spyOn(mockStorage, 'storeApprovalPattern');
      const storeOutcomeSpy = jest.spyOn(mockStorage, 'storeConfidenceOutcome');
      
      await service.learnFromApprovalOutcome(mockState, true, 0.9, 'success');
      
      expect(storePatternSpy).toHaveBeenCalled();
      expect(storeOutcomeSpy).toHaveBeenCalledWith({
        executionId: 'test-execution-123',
        approved: true,
        actualOutcome: 'success',
        humanConfidence: 0.9,
        systemConfidence: 0.7,
        timestamp: expect.any(Date),
      });
    });

    it('should implement ML training data integration', async () => {
      const storeOutcomeSpy = jest.spyOn(mockStorage, 'storeConfidenceOutcome');
      
      await service.updateConfidenceFromFeedback('test-execution-123', 'approved', 0.8);
      
      expect(storeOutcomeSpy).toHaveBeenCalledWith({
        executionId: 'test-execution-123',
        approved: true,
        actualOutcome: 'success',
        humanConfidence: 0.8,
        systemConfidence: 0,
        timestamp: expect.any(Date),
      });
    });

    it('should provide confidence analytics from storage', async () => {
      const analytics = await service.getConfidenceAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.totalEvaluations).toBeDefined();
      expect(analytics.averageConfidence).toBeDefined();
      expect(analytics.factorImpact).toBeDefined();
    });

    it('should provide pattern insights from storage', async () => {
      const insights = await service.getPatternInsights();
      
      expect(insights).toBeDefined();
      expect(insights.mostEffectivePatterns).toBeDefined();
      expect(insights.confidenceTrends).toBeDefined();
      expect(insights.recommendedThresholds).toBeDefined();
    });
  });

  describe('Service Recovery and Initialization', () => {
    it('should recover state from persistent storage on initialization', async () => {
      // Simulate service restart - pre-populate storage
      const testPattern: ApprovalPattern = {
        nodeId: 'recovery-test',
        approvalRate: 0.88,
        averageConfidence: 0.75,
        commonRejectionReasons: ['validation failed'],
        riskFactors: ['data-risk'],
        successfulExecutions: 20,
        failedExecutions: 3,
        lastUpdated: new Date(),
      };
      
      await mockStorage.storeApprovalPattern(testPattern);
      
      const testFactors: ConfidenceFactor[] = [
        {
          name: 'test_factor',
          value: 0.8,
          weight: 0.5,
          source: 'historical',
          description: 'Test factor',
        },
      ];
      
      await mockStorage.storeConfidenceHistory('recovery-execution', testFactors);
      
      // Create new service instance to test recovery
      const newService = new ConfidenceEvaluatorService(eventEmitter, mockStorage);
      await newService.onModuleInit();
      
      // Verify recovery
      const recoveredPattern = await newService.getHistoricalPattern('recovery-test');
      expect(recoveredPattern).toEqual(testPattern);
      
      const recoveredFactors = await newService.getConfidenceFactors({
        executionId: 'recovery-execution',
      } as WorkflowState);
      expect(recoveredFactors.test_factor).toBe(0.8);
    });

    it('should fail fast if storage adapter is unhealthy', async () => {
      const unhealthyStorage = new MockConfidenceStorageService();
      jest.spyOn(unhealthyStorage, 'getAllActivePatterns').mockRejectedValue(new Error('Storage connection failed'));
      
      const failingService = new ConfidenceEvaluatorService(eventEmitter, unhealthyStorage);
      
      await expect(failingService.onModuleInit()).rejects.toThrow(
        'Cannot initialize ConfidenceEvaluatorService without persistent storage access'
      );
    });
  });

  describe('Graceful Degradation Without Storage', () => {
    let degradedService: ConfidenceEvaluatorService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConfidenceEvaluatorService,
          {
            provide: EventEmitter2,
            useValue: eventEmitter,
          },
          // No storage adapter provided
        ],
      }).compile();

      degradedService = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);
    });

    it('should run in degraded mode without storage adapter', async () => {
      await degradedService.onModuleInit();
      
      const mockState: WorkflowState = {
        executionId: 'degraded-test',
        currentNode: 'test-node',
        confidence: 0.6,
        metadata: {},
      } as WorkflowState;
      
      // Should still work in cache-only mode
      const confidence = await degradedService.evaluateConfidence(mockState);
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error when analytics requested without storage', async () => {
      await expect(degradedService.getConfidenceAnalytics()).rejects.toThrow(
        'Storage adapter required for analytics'
      );
    });
  });

  describe('Performance Validation', () => {
    it('should evaluate confidence within performance targets', async () => {
      const mockState: WorkflowState = {
        executionId: 'perf-test',
        currentNode: 'test-node',
        confidence: 0.7,
        metadata: {},
      } as WorkflowState;

      const startTime = Date.now();
      await service.evaluateConfidence(mockState);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should be under 100ms for simple evaluation
    });

    it('should cache patterns for performance optimization', async () => {
      const getPatternSpy = jest.spyOn(mockStorage, 'getApprovalPattern');
      
      // Pre-store a pattern to test caching behavior
      const testPattern: ApprovalPattern = {
        nodeId: 'cache-test',
        approvalRate: 0.9,
        averageConfidence: 0.8,
        commonRejectionReasons: [],
        riskFactors: [],
        successfulExecutions: 5,
        failedExecutions: 0,
        lastUpdated: new Date(),
      };
      await mockStorage.storeApprovalPattern(testPattern);
      
      // Reset spy after pre-storing
      getPatternSpy.mockClear();
      
      // First call - should hit storage
      const pattern1 = await service.getHistoricalPattern('cache-test');
      expect(pattern1).toBeDefined();
      expect(getPatternSpy).toHaveBeenCalledTimes(1);
      
      // Second call - should hit cache
      const pattern2 = await service.getHistoricalPattern('cache-test');
      expect(pattern2).toEqual(pattern1);
      expect(getPatternSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});