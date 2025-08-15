import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import {
  createMockWorkflowState,
  mockLogger,
  resetAllMocks,
  TEST_TIMEOUT,
} from '../test-utils';

import { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import type { WorkflowState } from '../interfaces/workflow.interface';
import { ApprovalRiskLevel } from '../decorators/approval.decorator';

describe('ConfidenceEvaluatorService', () => {
  let service: ConfidenceEvaluatorService;
  let module: TestingModule;


  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ConfidenceEvaluatorService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);
    resetAllMocks();
  });

  afterEach(async () => {
    resetAllMocks();
    await module.close();
  });

  describe('Confidence Evaluation', () => {
    it('should use existing confidence when available', async () => {
      const state = createMockWorkflowState({ confidence: 0.85 });
      
      const confidence = await service.evaluateConfidence(state);
      
      expect(confidence).toBe(0.85);
    });

    it('should calculate confidence from metadata factors', async () => {
      const state = createMockWorkflowState({
        confidence: undefined,
        metadata: {
          complexity: 0.7,
          reliability: 0.8,
          userFeedback: 0.9,
          testCoverage: 0.85
        }
      });
      
      const confidence = await service.evaluateConfidence(state);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      
      // Should be average of available factors
      const expectedConfidence = (0.7 + 0.8 + 0.9 + 0.85) / 4;
      expect(confidence).toBeCloseTo(expectedConfidence, 2);
    });

    it('should return default confidence when no factors available', async () => {
      const state = createMockWorkflowState({
        confidence: undefined,
        metadata: {}
      });
      
      const confidence = await service.evaluateConfidence(state);
      
      expect(confidence).toBe(0.5); // Default confidence
    });

    it('should handle non-numeric metadata gracefully', async () => {
      const state = createMockWorkflowState({
        confidence: undefined,
        metadata: {
          complexity: 'high', // Non-numeric
          reliability: 0.8,
          invalidFactor: null,
          undefinedFactor: undefined
        }
      });
      
      const confidence = await service.evaluateConfidence(state);
      
      // Should only use valid numeric factors
      expect(confidence).toBe(0.8);
    });

    it('should clamp confidence values to valid range', async () => {
      const state1 = createMockWorkflowState({ confidence: 1.5 }); // Above 1
      const state2 = createMockWorkflowState({ confidence: -0.2 }); // Below 0
      
      const confidence1 = await service.evaluateConfidence(state1);
      const confidence2 = await service.evaluateConfidence(state2);
      
      expect(confidence1).toBe(1.0);
      expect(confidence2).toBe(0.0);
    });
  });

  describe('Confidence Factors Analysis', () => {
    it('should extract and return confidence factors', async () => {
      const state = createMockWorkflowState({
        metadata: {
          complexity: 0.7,
          reliability: 0.8,
          userFeedback: 0.9,
          nonConfidenceFactor: 'ignore this',
          testCoverage: 0.85
        }
      });
      
      const factors = await service.getConfidenceFactors(state);
      
      expect(factors).toEqual({
        complexity: 0.7,
        reliability: 0.8,
        userFeedback: 0.9,
        testCoverage: 0.85
      });
      
      expect(factors.nonConfidenceFactor).toBeUndefined();
    });

    it('should return empty object when no factors available', async () => {
      const state = createMockWorkflowState({ metadata: {} });
      
      const factors = await service.getConfidenceFactors(state);
      
      expect(factors).toEqual({});
    });

    it('should filter out invalid factor values', async () => {
      const state = createMockWorkflowState({
        metadata: {
          complexity: 0.7,
          reliability: 'invalid',
          userFeedback: null,
          testCoverage: undefined,
          validFactor: 0.9
        }
      });
      
      const factors = await service.getConfidenceFactors(state);
      
      expect(factors).toEqual({
        complexity: 0.7,
        validFactor: 0.9
      });
    });
  });

  describe('Risk Assessment', () => {
    it('should perform basic risk assessment', async () => {
      const state = createMockWorkflowState({
        confidence: 0.3, // Low confidence
        metadata: {
          complexity: 0.9, // High complexity
          impact: 0.8     // High impact
        }
      });
      
      const riskAssessment = await service.assessRisk(state, {
        factors: ['complexity', 'impact']
      });
      
      expect(riskAssessment.level).toBe(ApprovalRiskLevel.HIGH);
      expect(riskAssessment.factors).toEqual(['complexity', 'impact']);
      expect(riskAssessment.score).toBeGreaterThan(0);
      expect(riskAssessment.score).toBeLessThanOrEqual(1);
    });

    it('should use custom risk evaluator when provided', async () => {
      const state = createMockWorkflowState();
      
      const customEvaluator = jest.fn().mockReturnValue({
        level: ApprovalRiskLevel.CRITICAL,
        factors: ['custom-factor-1', 'custom-factor-2'],
        score: 0.95
      });
      
      const riskAssessment = await service.assessRisk(state, {
        factors: ['standard-factor'],
        customEvaluator
      });
      
      expect(customEvaluator).toHaveBeenCalledWith(state);
      expect(riskAssessment.level).toBe(ApprovalRiskLevel.CRITICAL);
      expect(riskAssessment.factors).toEqual(['custom-factor-1', 'custom-factor-2']);
      expect(riskAssessment.score).toBe(0.95);
    });

    it('should calculate risk based on confidence and complexity', async () => {
      const highRiskState = createMockWorkflowState({
        confidence: 0.2, // Low confidence
        metadata: {
          complexity: 0.9, // High complexity
          impact: 0.8
        }
      });
      
      const lowRiskState = createMockWorkflowState({
        confidence: 0.9, // High confidence
        metadata: {
          complexity: 0.3, // Low complexity
          impact: 0.4
        }
      });
      
      const highRisk = await service.assessRisk(highRiskState, {
        factors: ['complexity', 'impact']
      });
      
      const lowRisk = await service.assessRisk(lowRiskState, {
        factors: ['complexity', 'impact']
      });
      
      expect(highRisk.score).toBeGreaterThan(lowRisk.score);
      
      // High risk scenario should have higher risk level
      const riskLevels = {
        [ApprovalRiskLevel.LOW]: 1,
        [ApprovalRiskLevel.MEDIUM]: 2,
        [ApprovalRiskLevel.HIGH]: 3,
        [ApprovalRiskLevel.CRITICAL]: 4
      };
      
      expect(riskLevels[highRisk.level]).toBeGreaterThanOrEqual(riskLevels[lowRisk.level]);
    });

    it('should handle missing risk factors gracefully', async () => {
      const state = createMockWorkflowState({
        confidence: 0.5,
        metadata: {}
      });
      
      const riskAssessment = await service.assessRisk(state, {
        factors: ['nonExistentFactor']
      });
      
      expect(riskAssessment.level).toBeDefined();
      expect(riskAssessment.score).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.factors).toEqual(['nonExistentFactor']);
    });

    it('should determine risk levels correctly', async () => {
      const testCases = [
        { score: 0.9, expectedLevel: ApprovalRiskLevel.CRITICAL },
        { score: 0.75, expectedLevel: ApprovalRiskLevel.HIGH },
        { score: 0.5, expectedLevel: ApprovalRiskLevel.MEDIUM },
        { score: 0.2, expectedLevel: ApprovalRiskLevel.LOW }
      ];
      
      for (const testCase of testCases) {
        const state = createMockWorkflowState({
          confidence: 1 - testCase.score, // Inverse relationship
          metadata: {
            riskFactor: testCase.score
          }
        });
        
        const riskAssessment = await service.assessRisk(state, {
          factors: ['riskFactor']
        });
        
        expect(riskAssessment.level).toBe(testCase.expectedLevel);
      }
    });

    it('should include detailed risk information', async () => {
      const state = createMockWorkflowState({
        confidence: 0.4,
        metadata: {
          complexity: 0.8,
          impact: 0.7,
          reversibility: 0.3,
          dataSize: 1000000,
          userCount: 50000
        }
      });
      
      const riskAssessment = await service.assessRisk(state, {
        factors: ['complexity', 'impact', 'reversibility']
      });
      
      expect(riskAssessment.details).toBeDefined();
      expect(riskAssessment.details?.confidenceScore).toBe(0.4);
      expect(riskAssessment.details?.factorScores).toEqual({
        complexity: 0.8,
        impact: 0.7,
        reversibility: 0.3
      });
      expect(riskAssessment.details?.calculationMethod).toBe('weighted_average');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large metadata objects efficiently', async () => {
      const largeMetadata: Record<string, number> = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`factor${i}`] = Math.random();
      }
      
      const state = createMockWorkflowState({
        metadata: largeMetadata
      });
      
      const startTime = Date.now();
      const confidence = await service.evaluateConfidence(state);
      const factors = await service.getConfidenceFactors(state);
      const riskAssessment = await service.assessRisk(state, {
        factors: ['factor1', 'factor2', 'factor3']
      });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(Object.keys(factors).length).toBe(1000);
      expect(riskAssessment).toBeDefined();
    });

    it('should handle concurrent confidence evaluations', async () => {
      const states = Array.from({ length: 10 }, (_, i) => 
        createMockWorkflowState({
          executionId: `concurrent-${i}`,
          confidence: Math.random(),
          metadata: {
            complexity: Math.random(),
            reliability: Math.random()
          }
        })
      );
      
      const promises = states.map(state => 
        Promise.all([
          service.evaluateConfidence(state),
          service.getConfidenceFactors(state),
          service.assessRisk(state, { factors: ['complexity', 'reliability'] })
        ])
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(10);
      results.forEach(([confidence, factors, risk]) => {
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
        expect(factors).toBeDefined();
        expect(risk).toBeDefined();
      });
    });

    it('should handle extreme confidence values', async () => {
      const extremeStates = [
        createMockWorkflowState({ confidence: Number.MAX_VALUE }),
        createMockWorkflowState({ confidence: Number.MIN_VALUE }),
        createMockWorkflowState({ confidence: Infinity }),
        createMockWorkflowState({ confidence: -Infinity }),
        createMockWorkflowState({ confidence: NaN })
      ];
      
      for (const state of extremeStates) {
        const confidence = await service.evaluateConfidence(state);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
        expect(Number.isNaN(confidence)).toBe(false);
        expect(Number.isFinite(confidence)).toBe(true);
      }
    });

    it('should handle null and undefined states gracefully', async () => {
      const confidence1 = await service.evaluateConfidence(null as any);
      const confidence2 = await service.evaluateConfidence(undefined as any);
      
      expect(confidence1).toBe(0.5); // Default
      expect(confidence2).toBe(0.5); // Default
      
      const factors1 = await service.getConfidenceFactors(null as any);
      const factors2 = await service.getConfidenceFactors(undefined as any);
      
      expect(factors1).toEqual({});
      expect(factors2).toEqual({});
    });

    it('should provide consistent results for identical inputs', async () => {
      const state = createMockWorkflowState({
        confidence: 0.75,
        metadata: {
          complexity: 0.6,
          reliability: 0.8,
          impact: 0.7
        }
      });
      
      // Run evaluation multiple times
      const results = await Promise.all(
        Array.from({ length: 5 }, () => Promise.all([
          service.evaluateConfidence(state),
          service.getConfidenceFactors(state),
          service.assessRisk(state, { factors: ['complexity', 'reliability', 'impact'] })
        ]))
      );
      
      // All results should be identical
      const [firstConfidence, firstFactors, firstRisk] = results[0];
      
      results.slice(1).forEach(([confidence, factors, risk]) => {
        expect(confidence).toBe(firstConfidence);
        expect(factors).toEqual(firstFactors);
        expect(risk.level).toBe(firstRisk.level);
        expect(risk.score).toBeCloseTo(firstRisk.score, 5);
      });
    });
  });

  describe('Configuration and Customization', () => {
    it('should allow configuration of confidence calculation method', () => {
      // Test internal configuration (would be expanded based on actual implementation)
      expect(service.getValidConfidenceFactors).toBeDefined();
      expect(service.calculateWeightedConfidence).toBeDefined();
      expect(service.determineRiskLevel).toBeDefined();
    });

    it('should support different confidence factor weights', async () => {
      const state = createMockWorkflowState({
        metadata: {
          complexity: 0.8,
          reliability: 0.6,
          testCoverage: 0.9
        }
      });
      
      // In a real implementation, this might involve configuration
      const confidence = await service.evaluateConfidence(state);
      
      // Verify confidence is calculated (exact value depends on implementation)
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle custom risk assessment strategies', async () => {
      const state = createMockWorkflowState();
      
      const strategies = [
        (state: WorkflowState) => ({ level: ApprovalRiskLevel.LOW, factors: ['custom'], score: 0.1 }),
        (state: WorkflowState) => ({ level: ApprovalRiskLevel.MEDIUM, factors: ['custom'], score: 0.5 }),
        (state: WorkflowState) => ({ level: ApprovalRiskLevel.HIGH, factors: ['custom'], score: 0.8 }),
        (state: WorkflowState) => ({ level: ApprovalRiskLevel.CRITICAL, factors: ['custom'], score: 0.95 })
      ];
      
      for (const customEvaluator of strategies) {
        const risk = await service.assessRisk(state, { 
          factors: [], 
          customEvaluator 
        });
        
        expect(risk.level).toBe(customEvaluator(state).level);
        expect(risk.score).toBe(customEvaluator(state).score);
      }
    });
  });
});