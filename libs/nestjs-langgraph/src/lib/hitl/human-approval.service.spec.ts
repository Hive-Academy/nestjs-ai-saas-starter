import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

import {
  createMockWorkflowState,
  mockLogger,
  mockEventEmitter,
  resetAllMocks,
  TEST_TIMEOUT,
} from '../test-utils';

import { HumanApprovalService, ApprovalWorkflowState } from './human-approval.service';
import { ApprovalChainService } from './approval-chain.service';
import { FeedbackProcessorService } from './feedback-processor.service';
import { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import { ApprovalRiskLevel, RequiresApprovalOptions } from '../decorators/approval.decorator';
import { WorkflowState } from '../interfaces/workflow.interface';
import { HITL_EVENTS } from './constants';

describe('HumanApprovalService', () => {
  let service: HumanApprovalService;
  let eventEmitter: EventEmitter2;
  let approvalChainService: ApprovalChainService;
  let feedbackProcessor: FeedbackProcessorService;
  let confidenceEvaluator: ConfidenceEvaluatorService;
  let module: TestingModule;


  beforeEach(async () => {
    const mockApprovalChainService = {
      initiateApproval: jest.fn().mockResolvedValue({
        id: 'chain-request-id',
        currentLevel: {
          approvers: [{ id: 'approver-1' }, { id: 'approver-2' }]
        }
      }),
      getApprovalRequest: jest.fn(),
      processApproval: jest.fn().mockResolvedValue({}),
    };

    const mockFeedbackProcessor = {
      submitFeedback: jest.fn().mockResolvedValue({}),
    };

    const mockConfidenceEvaluator = {
      evaluateConfidence: jest.fn().mockResolvedValue(0.75),
      getConfidenceFactors: jest.fn().mockResolvedValue({
        complexity: 0.8,
        reliability: 0.7,
        userInput: 0.75
      }),
      assessRisk: jest.fn().mockResolvedValue({
        level: ApprovalRiskLevel.MEDIUM,
        factors: ['complexity', 'impact'],
        score: 0.6
      }),
    };

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        HumanApprovalService,
        {
          provide: ApprovalChainService,
          useValue: mockApprovalChainService,
        },
        {
          provide: FeedbackProcessorService,
          useValue: mockFeedbackProcessor,
        },
        {
          provide: ConfidenceEvaluatorService,
          useValue: mockConfidenceEvaluator,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<HumanApprovalService>(HumanApprovalService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    resetAllMocks();
    approvalChainService = module.get<ApprovalChainService>(ApprovalChainService);
    feedbackProcessor = module.get<FeedbackProcessorService>(FeedbackProcessorService);
    confidenceEvaluator = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);

    await module.init();
  });

  afterEach(async () => {
    resetAllMocks();
    await module.close();
  });

  describe('Approval Request Creation', () => {
    it('should create approval request with correct configuration', async () => {
      const executionId = 'test-exec-001';
      const nodeId = 'critical-operation';
      const message = 'Approve critical database operation';
      const state = createMockWorkflowState({ executionId });

      const options: RequiresApprovalOptions = {
        confidenceThreshold: 0.8,
        riskThreshold: ApprovalRiskLevel.MEDIUM,
        timeoutMs: 60000,
        onTimeout: 'escalate',
      };

      const request = await service.requestApproval(executionId, nodeId, message, state, options);

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.executionId).toBe(executionId);
      expect(request.nodeId).toBe(nodeId);
      expect(request.message).toBe(message);
      expect(request.confidence.threshold).toBe(0.8);
      expect(request.timeout.duration).toBe(60000);
      expect(request.timeout.strategy).toBe('escalate');
      expect(request.workflowState).toBe(ApprovalWorkflowState.IN_PROGRESS);
    });

    it('should evaluate confidence and risk during request creation', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        riskAssessment: {
          enabled: true,
          factors: ['complexity', 'impact']
        }
      };

      const request = await service.requestApproval('test-exec', 'test-node', 'test message', state, options);

      expect(confidenceEvaluator.evaluateConfidence).toHaveBeenCalledWith(state);
      expect(confidenceEvaluator.getConfidenceFactors).toHaveBeenCalledWith(state);
      expect(confidenceEvaluator.assessRisk).toHaveBeenCalledWith(state, {
        factors: ['complexity', 'impact'],
        customEvaluator: undefined
      });

      expect(request.riskAssessment).toBeDefined();
      expect(request.riskAssessment?.level).toBe(ApprovalRiskLevel.MEDIUM);
      expect(request.confidence.factors).toBeDefined();
    });

    it('should setup timeout handler for approval request', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        timeoutMs: 1000, // 1 second for fast test
        onTimeout: 'reject'
      };

      const request = await service.requestApproval('timeout-test', 'timeout-node', 'timeout test', state, options);

      expect(service['timeoutHandlers'].has(request.id)).toBe(true);

      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 1200));

      const updatedRequest = service.getApprovalRequest(request.id);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.TIMEOUT);
    });

    it('should emit approval requested event', async () => {
      const state = createMockWorkflowState();
      const eventSpy = jest.fn();
      
      eventEmitter.on(HITL_EVENTS.APPROVAL_REQUESTED, eventSpy);

      await service.requestApproval('event-test', 'event-node', 'event test', state);

      expect(eventSpy).toHaveBeenCalled();
      const eventData = eventSpy.mock.calls[0][0];
      expect(eventData.request).toBeDefined();
      expect(eventData.request.executionId).toBe('event-test');
    });

    it('should integrate with approval chain when configured', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        chainId: 'test-approval-chain',
        escalationStrategy: 'chain' as any
      };

      const request = await service.requestApproval('chain-test', 'chain-node', 'chain test', state, options);

      expect(approvalChainService.initiateApproval).toHaveBeenCalledWith(
        'chain-test',
        'test-approval-chain',
        expect.objectContaining({
          nodeId: 'chain-node',
          message: 'chain test'
        })
      );

      expect(request.approvers).toEqual(['approver-1', 'approver-2']);
    });
  });

  describe('Approval Response Processing', () => {
    let testRequest: any;

    beforeEach(async () => {
      const state = createMockWorkflowState();
      testRequest = await service.requestApproval('response-test', 'response-node', 'response test', state);
    });

    it('should process approval successfully', async () => {
      const response = {
        requestId: testRequest.id,
        decision: 'approved' as const,
        approver: { id: 'test-user', name: 'Test User', role: 'developer' },
        message: 'Looks good to proceed',
        timestamp: new Date(),
      };

      const result = await service.processApprovalResponse(testRequest.id, response);

      expect(result.success).toBe(true);
      expect(result.nextState).toBeDefined();
      expect(result.nextState?.approvalReceived).toBe(true);
      expect(result.nextState?.humanFeedback?.approved).toBe(true);

      const updatedRequest = service.getApprovalRequest(testRequest.id);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.APPROVED);
      expect(updatedRequest?.timestamps.responded).toBeDefined();
    });

    it('should process rejection correctly', async () => {
      const response = {
        requestId: testRequest.id,
        decision: 'rejected' as const,
        approver: { id: 'test-user', name: 'Test User', role: 'developer' },
        message: 'Too risky, needs more review',
        timestamp: new Date(),
      };

      const result = await service.processApprovalResponse(testRequest.id, response);

      expect(result.success).toBe(true);
      expect(result.nextState?.approvalReceived).toBe(false);
      expect(result.nextState?.humanFeedback?.approved).toBe(false);
      expect(result.nextState?.rejectionReason).toBe('Too risky, needs more review');

      const updatedRequest = service.getApprovalRequest(testRequest.id);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.REJECTED);
    });

    it('should handle escalation', async () => {
      const escalationSpy = jest.fn();
      eventEmitter.on(HITL_EVENTS.APPROVAL_ESCALATED, escalationSpy);

      const response = {
        requestId: testRequest.id,
        decision: 'escalated' as const,
        approver: { id: 'junior-dev', name: 'Junior Developer', role: 'developer' },
        message: 'Escalating to senior team',
        timestamp: new Date(),
      };

      const result = await service.processApprovalResponse(testRequest.id, response);

      expect(result.success).toBe(true);
      expect(result.nextState?.waitingForApproval).toBe(true);

      expect(escalationSpy).toHaveBeenCalled();
      const escalationEvent = escalationSpy.mock.calls[0][0];
      expect(escalationEvent.escalatedBy).toEqual(response.approver);
    });

    it('should handle retry requests', async () => {
      const response = {
        requestId: testRequest.id,
        decision: 'retry' as const,
        approver: { id: 'test-user', name: 'Test User', role: 'developer' },
        message: 'Please provide more information',
        timestamp: new Date(),
      };

      const result = await service.processApprovalResponse(testRequest.id, response);

      expect(result.success).toBe(true);
      expect(result.nextState?.waitingForApproval).toBe(true);

      const updatedRequest = service.getApprovalRequest(testRequest.id);
      expect(updatedRequest?.retry.count).toBe(1);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.IN_PROGRESS);
    });

    it('should handle modification requests', async () => {
      const modifications = {
        parameter1: 'new value',
        parameter2: 100
      };

      const response = {
        requestId: testRequest.id,
        decision: 'modify' as const,
        approver: { id: 'test-user', name: 'Test User', role: 'developer' },
        message: 'Please adjust these parameters',
        modifications,
        timestamp: new Date(),
      };

      const result = await service.processApprovalResponse(testRequest.id, response);

      expect(result.success).toBe(true);
      expect(result.nextState?.humanFeedback?.status).toBe('needs_revision');
      expect(result.nextState?.metadata?.humanModifications).toEqual(modifications);

      expect(feedbackProcessor.submitFeedback).toHaveBeenCalledWith(
        testRequest.executionId,
        'modification',
        expect.objectContaining({
          modifications
        }),
        response.approver
      );
    });

    it('should handle non-existent approval requests', async () => {
      const response = {
        requestId: 'non-existent-id',
        decision: 'approved' as const,
        approver: { id: 'test-user', name: 'Test User', role: 'developer' },
        timestamp: new Date(),
      };

      const result = await service.processApprovalResponse('non-existent-id', response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject responses to completed requests', async () => {
      // First approve the request
      await service.processApprovalResponse(testRequest.id, {
        requestId: testRequest.id,
        decision: 'approved' as const,
        approver: { id: 'first-user', name: 'First User', role: 'developer' },
        timestamp: new Date(),
      });

      // Try to respond again
      const result = await service.processApprovalResponse(testRequest.id, {
        requestId: testRequest.id,
        decision: 'rejected' as const,
        approver: { id: 'second-user', name: 'Second User', role: 'developer' },
        timestamp: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in progress');
    });
  });

  describe('Timeout Handling', () => {
    it('should auto-approve on timeout when configured', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        timeoutMs: 500,
        onTimeout: 'approve'
      };

      const request = await service.requestApproval('timeout-approve', 'timeout-node', 'timeout test', state, options);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 700));

      const updatedRequest = service.getApprovalRequest(request.id);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.APPROVED);
    });

    it('should auto-reject on timeout when configured', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        timeoutMs: 500,
        onTimeout: 'reject'
      };

      const request = await service.requestApproval('timeout-reject', 'timeout-node', 'timeout test', state, options);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 700));

      const updatedRequest = service.getApprovalRequest(request.id);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.REJECTED);
    });

    it('should escalate on timeout when configured', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        timeoutMs: 500,
        onTimeout: 'escalate',
        chainId: 'test-chain'
      };

      const request = await service.requestApproval('timeout-escalate', 'timeout-node', 'timeout test', state, options);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 700));

      const updatedRequest = service.getApprovalRequest(request.id);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.ESCALATED);
    });

    it('should retry on timeout when configured', async () => {
      const state = createMockWorkflowState();
      const options: RequiresApprovalOptions = {
        timeoutMs: 500,
        onTimeout: 'retry'
      };

      const request = await service.requestApproval('timeout-retry', 'timeout-node', 'timeout test', state, options);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 700));

      const updatedRequest = service.getApprovalRequest(request.id);
      expect(updatedRequest?.retry.count).toBe(1);
      expect(updatedRequest?.workflowState).toBe(ApprovalWorkflowState.IN_PROGRESS);
    });

    it('should handle max retries exceeded', async () => {
      const state = createMockWorkflowState();
      const request = await service.requestApproval('max-retry-test', 'retry-node', 'retry test', state, {
        timeoutMs: 300,
        onTimeout: 'retry'
      });

      // Manually set retry count to max
      const retrievedRequest = service.getApprovalRequest(request.id);
      if (retrievedRequest) {
        retrievedRequest.retry.count = retrievedRequest.retry.maxAttempts;
      }

      // Trigger timeout
      await service['handleTimeout'](request.id);

      const finalRequest = service.getApprovalRequest(request.id);
      expect(finalRequest?.workflowState).toBe(ApprovalWorkflowState.REJECTED);
    });

    it('should emit timeout events', async () => {
      const timeoutSpy = jest.fn();
      eventEmitter.on(HITL_EVENTS.APPROVAL_TIMEOUT, timeoutSpy);

      const state = createMockWorkflowState();
      const request = await service.requestApproval('timeout-event', 'timeout-node', 'timeout test', state, {
        timeoutMs: 300,
        onTimeout: 'reject'
      });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(timeoutSpy).toHaveBeenCalled();
      const timeoutEvent = timeoutSpy.mock.calls[0][0];
      expect(timeoutEvent.requestId).toBe(request.id);
      expect(timeoutEvent.strategy).toBe('reject');
    });
  });

  describe('Streaming Integration', () => {
    it('should register and manage stream connections', () => {
      const mockConnection = { send: jest.fn(), close: jest.fn() };
      const executionId = 'stream-test';

      service.registerStreamConnection(executionId, mockConnection);
      expect(service['streamConnections'].has(executionId)).toBe(true);

      service.unregisterStreamConnection(executionId);
      expect(service['streamConnections'].has(executionId)).toBe(false);
    });

    it('should stream approval requests to connected clients', async () => {
      const mockConnection = { send: jest.fn(), close: jest.fn() };
      const executionId = 'stream-approval-test';

      service.registerStreamConnection(executionId, mockConnection);

      const state = createMockWorkflowState({ executionId });
      await service.requestApproval(executionId, 'stream-node', 'stream test', state);

      expect(mockConnection.send).toHaveBeenCalled();
      
      const sentData = JSON.parse(mockConnection.send.mock.calls[0][0]);
      expect(sentData.type).toBe('approval_requested');
      expect(sentData.data.message).toBe('stream test');
    });

    it('should stream approval updates to connected clients', async () => {
      const mockConnection = { send: jest.fn(), close: jest.fn() };
      const executionId = 'stream-update-test';

      service.registerStreamConnection(executionId, mockConnection);

      const state = createMockWorkflowState({ executionId });
      const request = await service.requestApproval(executionId, 'update-node', 'update test', state);

      // Clear previous calls
      mockConnection.send.mockClear();

      // Process approval response
      await service.processApprovalResponse(request.id, {
        requestId: request.id,
        decision: 'approved' as const,
        approver: { id: 'test-user', name: 'Test User', role: 'developer' },
        timestamp: new Date(),
      });

      expect(mockConnection.send).toHaveBeenCalled();
      
      const sentData = JSON.parse(mockConnection.send.mock.calls[0][0]);
      expect(sentData.type).toBe('approval_updated');
      expect(sentData.data.decision).toBe('approved');
    });

    it('should handle streaming errors gracefully', async () => {
      const mockConnection = { 
        send: jest.fn().mockImplementation(() => {
          throw new Error('WebSocket send failed');
        }),
        close: jest.fn() 
      };

      service.registerStreamConnection('error-stream-test', mockConnection);

      const state = createMockWorkflowState({ executionId: 'error-stream-test' });
      
      // Should not throw despite streaming error
      await expect(
        service.requestApproval('error-stream-test', 'error-node', 'error test', state)
      ).resolves.toBeDefined();
    });
  });

  describe('Approval Management', () => {
    it('should retrieve pending approvals', async () => {
      const state = createMockWorkflowState();

      // Create multiple approval requests
      await service.requestApproval('pending-1', 'node-1', 'test 1', state);
      await service.requestApproval('pending-2', 'node-2', 'test 2', state);
      
      const pendingApprovals = service.getPendingApprovals();
      expect(pendingApprovals.length).toBe(2);
      expect(pendingApprovals.every(a => a.workflowState === ApprovalWorkflowState.IN_PROGRESS)).toBe(true);
    });

    it('should retrieve approvals for specific execution', async () => {
      const state1 = createMockWorkflowState({ executionId: 'exec-1' });
      const state2 = createMockWorkflowState({ executionId: 'exec-2' });

      await service.requestApproval('exec-1', 'node-1', 'test 1', state1);
      await service.requestApproval('exec-1', 'node-2', 'test 2', state1);
      await service.requestApproval('exec-2', 'node-1', 'test 3', state2);

      const exec1Approvals = service.getApprovalsForExecution('exec-1');
      expect(exec1Approvals.length).toBe(2);
      expect(exec1Approvals.every(a => a.executionId === 'exec-1')).toBe(true);

      const exec2Approvals = service.getApprovalsForExecution('exec-2');
      expect(exec2Approvals.length).toBe(1);
      expect(exec2Approvals[0].executionId).toBe('exec-2');
    });

    it('should cancel approval requests', async () => {
      const state = createMockWorkflowState();
      const request = await service.requestApproval('cancel-test', 'cancel-node', 'cancel test', state);

      const cancelled = await service.cancelApproval(request.id);
      expect(cancelled).toBe(true);

      const cancelledRequest = service.getApprovalRequest(request.id);
      expect(cancelledRequest?.workflowState).toBe(ApprovalWorkflowState.CANCELLED);
    });

    it('should handle cancellation of non-existent requests', async () => {
      const cancelled = await service.cancelApproval('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('Statistics and Analytics', () => {
    beforeEach(async () => {
      const state = createMockWorkflowState();
      
      // Create various approval requests for statistics
      const request1 = await service.requestApproval('stats-1', 'node-1', 'test 1', state);
      const request2 = await service.requestApproval('stats-2', 'node-2', 'test 2', state);
      const request3 = await service.requestApproval('stats-3', 'node-3', 'test 3', state);

      // Process some approvals
      await service.processApprovalResponse(request1.id, {
        requestId: request1.id,
        decision: 'approved',
        approver: { id: 'user1', name: 'User 1', role: 'developer' },
        timestamp: new Date(),
      });

      await service.processApprovalResponse(request2.id, {
        requestId: request2.id,
        decision: 'rejected',
        approver: { id: 'user2', name: 'User 2', role: 'developer' },
        timestamp: new Date(),
      });

      // Leave request3 pending
    });

    it('should provide approval workflow statistics', () => {
      const stats = service.getApprovalStats();

      expect(stats.total).toBe(3);
      expect(stats.byState[ApprovalWorkflowState.APPROVED]).toBe(1);
      expect(stats.byState[ApprovalWorkflowState.REJECTED]).toBe(1);
      expect(stats.byState[ApprovalWorkflowState.IN_PROGRESS]).toBe(1);
      expect(stats.approvalRate).toBeCloseTo(1/3);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should calculate response time metrics', () => {
      const stats = service.getApprovalStats();
      
      // Should have response times for processed approvals
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should handle empty statistics gracefully', () => {
      // Create new service instance with no requests
      const emptyService = new HumanApprovalService(
        eventEmitter,
        approvalChainService,
        feedbackProcessor,
        confidenceEvaluator
      );

      const stats = emptyService.getApprovalStats();

      expect(stats.total).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.approvalRate).toBe(0);
      expect(stats.timeoutRate).toBe(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up timeout handlers on destruction', async () => {
      const state = createMockWorkflowState();
      
      // Create approval requests with timeouts
      await service.requestApproval('cleanup-1', 'node-1', 'test 1', state, { timeoutMs: 60000 });
      await service.requestApproval('cleanup-2', 'node-2', 'test 2', state, { timeoutMs: 60000 });

      expect(service['timeoutHandlers'].size).toBe(2);

      await service.onModuleDestroy();

      expect(service['timeoutHandlers'].size).toBe(0);
      expect(service['approvalRequests'].size).toBe(0);
      expect(service['streamConnections'].size).toBe(0);
    });

    it('should handle concurrent approval processing', async () => {
      const state = createMockWorkflowState();
      const requests = [];

      // Create multiple approval requests
      for (let i = 0; i < 5; i++) {
        const request = await service.requestApproval(`concurrent-${i}`, `node-${i}`, `test ${i}`, state);
        requests.push(request);
      }

      // Process approvals concurrently
      const responses = requests.map((request, index) => ({
        requestId: request.id,
        decision: index % 2 === 0 ? 'approved' as const : 'rejected' as const,
        approver: { id: `user-${index}`, name: `User ${index}`, role: 'developer' },
        timestamp: new Date(),
      }));

      const results = await Promise.all(
        responses.map(response => service.processApprovalResponse(response.requestId, response))
      );

      expect(results.every(result => result.success)).toBe(true);
      
      const stats = service.getApprovalStats();
      expect(stats.total).toBe(5);
    });
  });
});