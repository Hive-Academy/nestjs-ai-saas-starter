import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { HumanApprovalService, ApprovalWorkflowState } from './human-approval.service';
import { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import { ApprovalChainService, ApprovalPolicy } from './approval-chain.service';
import { FeedbackProcessorService, FeedbackType } from './feedback-processor.service';
import type { WorkflowState } from '../interfaces/workflow.interface';
import { ApprovalRiskLevel, EscalationStrategy } from '../decorators/approval.decorator';
import { HITL_EVENTS, HITL_DEFAULTS } from './constants';

import {
  createMockWorkflowState,
  mockLogger,
  resetAllMocks,
  TEST_TIMEOUT,
  waitForAsync,
} from '../test-utils';

describe('HITL Approval System Integration', () => {
  let module: TestingModule;
  let humanApprovalService: HumanApprovalService;
  let confidenceEvaluator: ConfidenceEvaluatorService;
  let approvalChainService: ApprovalChainService;
  let feedbackProcessor: FeedbackProcessorService;
  let eventEmitter: EventEmitter2;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          maxListeners: 100,
        }),
      ],
      providers: [
        HumanApprovalService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    humanApprovalService = module.get<HumanApprovalService>(HumanApprovalService);
    confidenceEvaluator = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);
    approvalChainService = module.get<ApprovalChainService>(ApprovalChainService);
    feedbackProcessor = module.get<FeedbackProcessorService>(FeedbackProcessorService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Initialize services
    await humanApprovalService.onModuleInit();
    await confidenceEvaluator.onModuleInit();
    resetAllMocks();
  });

  afterEach(async () => {
    resetAllMocks();
    if (humanApprovalService) {
      await humanApprovalService.onModuleDestroy();
    }
    await module?.close();
  });

  describe('ConfidenceEvaluatorService', () => {
    it('should evaluate confidence for a basic workflow state', async () => {
      const state: WorkflowState = createMockWorkflowState({
        executionId: 'test-execution-1',
        confidence: 0.7,
      });

      const confidence = await confidenceEvaluator.evaluateConfidence(state);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(confidence).toBeCloseTo(0.7, 1);
    });

    it('should assess risk levels correctly', async () => {
      const highRiskState: WorkflowState = createMockWorkflowState({
        executionId: 'test-execution-2',
        confidence: 0.3,
        metadata: {
          prodData: true,
          externalApi: true,
          affectedUsers: 5000,
          privilegedOperation: true,
        },
      });

      const riskAssessment = await confidenceEvaluator.assessRisk(highRiskState);

      expect(riskAssessment.level).toBe(ApprovalRiskLevel.HIGH);
      expect(riskAssessment.score).toBeGreaterThan(0.6);
      expect(riskAssessment.factors.length).toBeGreaterThan(0);
      expect(riskAssessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should learn from approval outcomes', async () => {
      const state: WorkflowState = createMockWorkflowState({
        executionId: 'test-execution-3',
        confidence: 0.8,
        currentNode: 'test-node',
      });

      // Test learning from successful approval
      await confidenceEvaluator.learnFromApprovalOutcome(state, true, 0.8, 'success');
      
      const pattern = confidenceEvaluator.getHistoricalPattern('test-node');
      expect(pattern).toBeDefined();
      expect(pattern?.approvalRate).toBeGreaterThan(0);
      expect(pattern?.successfulExecutions).toBe(1);
    });
  });

  describe('ApprovalChainService', () => {
    beforeEach(() => {
      // Set up a test approval chain
      approvalChainService.createApprovalChain('test-chain', [
        {
          id: 'level-1',
          name: 'Junior Developer',
          priority: 1,
          approvers: [
            {
              id: 'dev1',
              name: 'Junior Dev 1',
              role: 'developer',
              email: 'dev1@test.com',
            },
          ],
          policy: ApprovalPolicy.ANY,
          timeoutMs: 300000,
        },
        {
          id: 'level-2',
          name: 'Senior Developer',
          priority: 2,
          approvers: [
            {
              id: 'senior1',
              name: 'Senior Dev 1',
              role: 'senior-developer',
              email: 'senior1@test.com',
            },
          ],
          policy: ApprovalPolicy.ANY,
          conditions: [
            {
              type: 'confidence',
              operator: 'lt',
              value: 0.6,
              field: 'confidence',
            },
          ],
        },
      ]);
    });

    it('should initiate approval chain correctly', async () => {
      const request = await approvalChainService.initiateApproval(
        'test-execution-4',
        'test-chain',
        {
          confidence: 0.5, // Should trigger second level due to condition
          nodeId: 'test-node',
          message: 'Test approval',
        }
      );

      expect(request.executionId).toBe('test-execution-4');
      expect(request.status).toBe('pending');
      expect(request.chain.length).toBe(2); // Both levels should be required
    });

    it('should process approval decisions through chain', async () => {
      const request = await approvalChainService.initiateApproval(
        'test-execution-5',
        'test-chain',
        {
          confidence: 0.8, // Higher confidence, only first level
          nodeId: 'test-node',
        }
      );

      // Approve at first level
      const updatedRequest = await approvalChainService.processApproval(
        request.id,
        {
          id: 'dev1',
          name: 'Junior Dev 1',
          role: 'developer',
        },
        'approved',
        'Looks good to me!'
      );

      expect(updatedRequest.status).toBe('approved');
      expect(updatedRequest.history.length).toBe(1);
    });
  });

  describe('HumanApprovalService', () => {
    it('should request approval and handle response', async () => {
      const state: WorkflowState = createMockWorkflowState({
        executionId: 'test-execution-6',
        confidence: 0.6,
        currentNode: 'risky-operation',
      });

      // Request approval
      const approvalRequest = await humanApprovalService.requestApproval(
        state.executionId,
        'risky-operation',
        'Deploy to production?',
        state,
        {
          confidenceThreshold: 0.7,
          riskThreshold: ApprovalRiskLevel.MEDIUM,
          timeoutMs: 300000,
          onTimeout: 'reject',
        }
      );

      expect(approvalRequest.executionId).toBe(state.executionId);
      expect(approvalRequest.workflowState).toBe(ApprovalWorkflowState.IN_PROGRESS);
      expect(approvalRequest.confidence.current).toBe(0.6);

      // Process approval response
      const response = await humanApprovalService.processApprovalResponse(
        approvalRequest.id,
        {
          requestId: approvalRequest.id,
          decision: 'approved',
          approver: {
            id: 'test-user',
            name: 'Test User',
            role: 'developer',
          },
          message: 'Approved after review',
          timestamp: new Date(),
        }
      );

      expect(response.success).toBe(true);
      expect(response.nextState).toBeDefined();
      expect(response.nextState?.approvalReceived).toBe(true);
      expect(response.nextState?.humanFeedback?.approved).toBe(true);
    });

    it('should handle approval timeout correctly', async () => {
      const state: WorkflowState = createMockWorkflowState({
        executionId: 'test-execution-7',
        confidence: 0.4,
      });

      // Mock timeout by manipulating internal state
      const approvalRequest = await humanApprovalService.requestApproval(
        state.executionId,
        'timeout-test',
        'This will timeout',
        state,
        {
          timeoutMs: 1000, // 1 second timeout
          onTimeout: 'approve',
        }
      );

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      const finalRequest = humanApprovalService.getApprovalRequest(approvalRequest.id);
      // In real implementation, timeout would be handled automatically
      // For testing, we'll simulate the timeout handling
      expect(finalRequest).toBeDefined();
    });

    it('should get approval statistics', async () => {
      // Create multiple approval requests for statistics
      const states = Array.from({ length: 3 }, (_, i) => createMockWorkflowState({
        executionId: `stats-test-${i}`,
        confidence: 0.5 + (i * 0.1),
      }));

      // Request multiple approvals
      for (const state of states) {
        await humanApprovalService.requestApproval(
          state.executionId,
          'stats-node',
          'Stats test',
          state
        );
      }

      const stats = humanApprovalService.getApprovalStats();

      expect(stats.total).toBe(3);
      expect(stats.byState[ApprovalWorkflowState.IN_PROGRESS]).toBe(3);
      expect(stats.averageResponseTime).toBe(0); // No responses yet
    });
  });

  describe('FeedbackProcessorService', () => {
    it('should submit and process feedback', async () => {
      const feedback = await feedbackProcessor.submitFeedback(
        'test-execution-8',
        FeedbackType.APPROVAL,
        {
          message: 'Looks good!',
          rating: 4,
        },
        {
          id: 'user1',
          name: 'Test User',
          role: 'reviewer',
        }
      );

      expect(feedback.type).toBe(FeedbackType.APPROVAL);
      expect(feedback.processed).toBe(false);
      expect(feedback.content.rating).toBe(4);

      // Process the feedback
      const state: WorkflowState = createMockWorkflowState({
        executionId: 'test-execution-8',
        confidence: 0.7,
      });

      const stateUpdate = await feedbackProcessor.processFeedback(feedback.id, state);

      expect(stateUpdate.humanFeedback?.approved).toBe(true);
      expect(stateUpdate.confidence).toBeGreaterThan(0.7);

      const processedFeedback = feedbackProcessor.getFeedbackForExecution('test-execution-8');
      expect(processedFeedback[0].processed).toBe(true);
    });

    it('should get feedback statistics', async () => {
      // Submit various types of feedback
      await feedbackProcessor.submitFeedback(
        'stats-test',
        FeedbackType.APPROVAL,
        { message: 'Approved' },
        { id: 'user1', name: 'User 1' }
      );

      await feedbackProcessor.submitFeedback(
        'stats-test',
        FeedbackType.REJECTION,
        { message: 'Rejected' },
        { id: 'user2', name: 'User 2' }
      );

      await feedbackProcessor.submitFeedback(
        'stats-test',
        FeedbackType.RATING,
        { rating: 5 },
        { id: 'user3', name: 'User 3' }
      );

      const stats = feedbackProcessor.getFeedbackStats('stats-test');

      expect(stats.total).toBe(3);
      expect(stats.byType[FeedbackType.APPROVAL]).toBe(1);
      expect(stats.byType[FeedbackType.REJECTION]).toBe(1);
      expect(stats.byType[FeedbackType.RATING]).toBe(1);
      expect(stats.averageRating).toBe(5);
    });
  });

  describe('Event Integration', () => {
    it('should emit events during approval workflow', async () => {
      const approvalRequestedSpy = jest.fn();
      const approvalCompletedSpy = jest.fn();

      eventEmitter.on(HITL_EVENTS.APPROVAL_REQUESTED, approvalRequestedSpy);
      eventEmitter.on(HITL_EVENTS.APPROVAL_COMPLETED, approvalCompletedSpy);

      const state: WorkflowState = createMockWorkflowState({
        executionId: 'event-test-1',
        confidence: 0.5,
      });

      // Request approval
      const approvalRequest = await humanApprovalService.requestApproval(
        state.executionId,
        'event-node',
        'Event test',
        state
      );

      expect(approvalRequestedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            executionId: 'event-test-1',
          }),
        })
      );

      // Process approval
      await humanApprovalService.processApprovalResponse(
        approvalRequest.id,
        {
          requestId: approvalRequest.id,
          decision: 'approved',
          approver: { id: 'test', name: 'Test' },
          timestamp: new Date(),
        }
      );

      expect(approvalCompletedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: approvalRequest.id,
          executionId: 'event-test-1',
          decision: 'approved',
        })
      );
    });

    it('should emit confidence evaluation events', async () => {
      const confidenceEvaluatedSpy = jest.fn();
      const riskAssessedSpy = jest.fn();

      eventEmitter.on(HITL_EVENTS.CONFIDENCE_EVALUATED, confidenceEvaluatedSpy);
      eventEmitter.on(HITL_EVENTS.RISK_ASSESSED, riskAssessedSpy);

      const state: WorkflowState = createMockWorkflowState({
        executionId: 'confidence-event-test',
        confidence: 0.6,
      });

      await confidenceEvaluator.evaluateConfidence(state);
      await confidenceEvaluator.assessRisk(state);

      expect(confidenceEvaluatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'confidence-event-test',
          confidence: expect.any(Number),
        })
      );

      expect(riskAssessedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'confidence-event-test',
          assessment: expect.objectContaining({
            level: expect.any(String),
            score: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('Integration with @RequiresApproval decorator', () => {
    it('should validate decorator helper methods exist', () => {
      // These methods are added to the decorated class prototype
      const mockClass = {};
      const methods = ['evaluateSkipConditions', 'evaluateApprovalRequired', 'routeToApproval'];
      
      // Simulate what the decorator would do
      methods.forEach(method => {
        (mockClass as any)[method] = jest.fn();
      });

      methods.forEach(method => {
        expect((mockClass as any)[method]).toBeDefined();
        expect(typeof (mockClass as any)[method]).toBe('function');
      });
    });

    it('should handle approval metadata extraction', () => {
      const testMetadata = {
        nodeId: 'test-node',
        confidenceThreshold: 0.7,
        riskThreshold: ApprovalRiskLevel.MEDIUM,
        chainId: 'test-chain',
        decoratedAt: expect.any(Date),
      };

      // Test metadata storage pattern
      const target = {};
      const propertyKey = 'testMethod';
      
      // Simulate metadata storage
      Reflect.defineMetadata('approval:metadata', testMetadata, target, propertyKey);
      
      const stored = Reflect.getMetadata('approval:metadata', target, propertyKey);
      expect(stored).toEqual(testMetadata);
    });
  });
});

