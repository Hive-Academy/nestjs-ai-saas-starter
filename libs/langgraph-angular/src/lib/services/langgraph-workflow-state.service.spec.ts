import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { LangGraphWorkflowStateService } from './langgraph-workflow-state.service';
import { LangGraphSseService } from './langgraph-sse.service';
import { LANGGRAPH_CONFIG } from '../models/config.model';
import { StreamEventType } from '../models/stream-events.model';
import type { LangGraphConfig } from '../models/config.model';

/**
 * Minimal mock of LangGraphSseService that exposes Subjects
 * so tests can push events synchronously.
 */
function createMockSseService() {
  const workflowUpdates = new Subject<Record<string, unknown>>();
  const errors = new Subject<{ message: string; timestamp: Date }>();

  return {
    workflowUpdates$: workflowUpdates.asObservable(),
    errors$: errors.asObservable(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    // helpers for tests
    _updates: workflowUpdates,
    _errors: errors,
  };
}

type MockSseService = ReturnType<typeof createMockSseService>;

describe('LangGraphWorkflowStateService', () => {
  let service: LangGraphWorkflowStateService;
  let mockSse: MockSseService;

  const baseConfig: LangGraphConfig = {
    sseBaseUrl: 'http://localhost:3000/api',
  };

  function setup(configOverrides: Partial<LangGraphConfig> = {}): void {
    mockSse = createMockSseService();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LangGraphWorkflowStateService,
        { provide: LangGraphSseService, useValue: mockSse },
        {
          provide: LANGGRAPH_CONFIG,
          useValue: { ...baseConfig, ...configOverrides },
        },
      ],
    });

    service = TestBed.inject(LangGraphWorkflowStateService);
  }

  beforeEach(() => {
    setup();
  });

  // ---------------------------------------------------------------------------
  // Helper to push a raw SSE event into the service
  // ---------------------------------------------------------------------------
  function emit(raw: Record<string, unknown>): void {
    mockSse._updates.next(raw);
  }

  function emitError(message: string): void {
    mockSse._errors.next({ message, timestamp: new Date() });
  }

  // ---------------------------------------------------------------------------
  // startExecution
  // ---------------------------------------------------------------------------
  describe('startExecution', () => {
    it('should set status to running and call sseService.connect', () => {
      service.startExecution('/api/stream/exec-1');

      expect(service.executionState().status).toBe('running');
      expect(mockSse.connect).toHaveBeenCalledWith('/api/stream/exec-1');
    });

    it('should reset state before starting a new execution', () => {
      service.startExecution('/api/stream/exec-1');
      // Emit a node_start to add agent progress
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      expect(Object.keys(service.agentProgress()).length).toBe(1);

      // Start new execution - should reset
      service.startExecution('/api/stream/exec-2');
      expect(Object.keys(service.agentProgress()).length).toBe(0);
      expect(service.executionState().status).toBe('running');
    });
  });

  // ---------------------------------------------------------------------------
  // Event processing
  // ---------------------------------------------------------------------------
  describe('event processing', () => {
    beforeEach(() => {
      service.startExecution('/api/stream/exec-test');
    });

    it('should handle workflow_start and set executionId', () => {
      emit({ type: 'workflow:start', executionId: 'exec-42' });

      expect(service.executionState().status).toBe('running');
      expect(service.executionState().executionId).toBe('exec-42');
    });

    it('should handle workflow_complete via type mapping', () => {
      emit({ type: 'workflow_complete', executionId: 'exec-42' });

      expect(service.executionState().status).toBe('completed');
      expect(service.executionState().endTime).toBeInstanceOf(Date);
    });

    it('should handle workflow:end and mark still-active agents as completed', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      expect(service.agentProgress()['agent-a'].status).toBe('executing');

      emit({ type: 'workflow:end', executionId: 'e1' });

      expect(service.executionState().status).toBe('completed');
      expect(service.agentProgress()['agent-a'].status).toBe('completed');
      expect(service.agentProgress()['agent-a'].progress).toBe(100);
    });

    it('should handle workflow_error and extract error message', () => {
      emit({
        type: 'workflow:error',
        message: 'Something broke',
        executionId: 'e1',
      });

      expect(service.executionState().status).toBe('error');
      expect(service.executionState().error).toBe('Something broke');
    });

    it('should handle workflow_error with "error" field in data', () => {
      emit({
        type: 'workflow:error',
        error: 'Bad things happened',
        executionId: 'e1',
      });

      expect(service.executionState().error).toBe('Bad things happened');
    });

    it('should handle workflow_error with no message/error field', () => {
      emit({ type: 'workflow:error', executionId: 'e1' });

      expect(service.executionState().error).toBe('Unknown workflow error');
    });

    it('should handle node_start and dynamically discover agents', () => {
      emit({ type: 'node:start', nodeId: 'researcher', executionId: 'e1' });

      const progress = service.agentProgress();
      expect(progress['researcher']).toBeDefined();
      expect(progress['researcher'].status).toBe('executing');
      expect(progress['researcher'].agentId).toBe('researcher');
      expect(progress['researcher'].agentName).toBe('researcher');
      expect(progress['researcher'].progress).toBe(0);
    });

    it('should handle node_start for existing agent and update status', () => {
      emit({ type: 'node:start', nodeId: 'researcher', executionId: 'e1' });
      emit({ type: 'node:end', nodeId: 'researcher', executionId: 'e1' });
      expect(service.agentProgress()['researcher'].status).toBe('completed');

      // Agent starts again
      emit({ type: 'node:start', nodeId: 'researcher', executionId: 'e1' });
      expect(service.agentProgress()['researcher'].status).toBe('executing');
    });

    it('should increment currentStep on node_start', () => {
      expect(service.executionState().currentStep).toBe(0);

      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      expect(service.executionState().currentStep).toBe(1);

      emit({ type: 'node:start', nodeId: 'agent-b', executionId: 'e1' });
      expect(service.executionState().currentStep).toBe(2);
    });

    it('should handle node_end and mark agent as completed', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({ type: 'node:end', nodeId: 'agent-a', executionId: 'e1' });

      expect(service.agentProgress()['agent-a'].status).toBe('completed');
      expect(service.agentProgress()['agent-a'].progress).toBe(100);
    });

    it('should handle node:complete as alias for node:end', () => {
      emit({ type: 'node:start', nodeId: 'agent-x', executionId: 'e1' });
      emit({ type: 'node:complete', nodeId: 'agent-x', executionId: 'e1' });

      expect(service.agentProgress()['agent-x'].status).toBe('completed');
    });

    it('should handle node_error and set agent status to error', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({
        type: 'node:error',
        nodeId: 'agent-a',
        message: 'Node crashed',
        executionId: 'e1',
      });

      expect(service.agentProgress()['agent-a'].status).toBe('error');
      expect(service.agentProgress()['agent-a'].currentAction).toBe(
        'Node crashed'
      );
    });

    it('should handle progress_update and update agent progress', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({
        type: 'progress',
        nodeId: 'agent-a',
        percentage: 50,
        message: 'Halfway there',
        executionId: 'e1',
      });

      expect(service.agentProgress()['agent-a'].progress).toBe(50);
      expect(service.agentProgress()['agent-a'].currentAction).toBe(
        'Halfway there'
      );
    });

    it('should handle milestone and update totalSteps', () => {
      emit({
        type: 'milestone',
        nodeId: 'agent-a',
        totalSteps: 10,
        message: 'Phase 1 complete',
        executionId: 'e1',
      });

      expect(service.executionState().totalSteps).toBe(10);
    });

    it('should handle milestone and update agent currentAction', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({
        type: 'milestone',
        nodeId: 'agent-a',
        message: 'Milestone reached!',
        executionId: 'e1',
      });

      expect(service.agentProgress()['agent-a'].currentAction).toBe(
        'Milestone reached!'
      );
    });

    it('should handle token events as stream data', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({ type: 'node:end', nodeId: 'agent-a', executionId: 'e1' });

      // Set agent to idle manually is not possible; agent goes to completed.
      // The handleStreamData only transitions idle -> thinking, so if agent
      // is already completed, it should not change status.
      const statusBefore = service.agentProgress()['agent-a'].status;
      emit({ type: 'token', nodeId: 'agent-a', executionId: 'e1' });
      expect(service.agentProgress()['agent-a'].status).toBe(statusBefore);
    });

    it('should handle error type as workflow error', () => {
      emit({
        type: 'error',
        message: 'Generic error',
        executionId: 'e1',
      });

      expect(service.executionState().status).toBe('error');
      expect(service.executionState().error).toBe('Generic error');
    });
  });

  // ---------------------------------------------------------------------------
  // HITL queue management via custom interruption_request
  // ---------------------------------------------------------------------------
  describe('HITL queue management', () => {
    beforeEach(() => {
      service.startExecution('/api/stream/exec-hitl');
    });

    it('should add approval to queue on interruption_request custom event', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-1',
        agentId: 'reviewer',
        message: 'Please review this',
        context: { data: 'test' },
        executionId: 'exec-hitl',
      });

      const queue = service.hitlQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe('approval-1');
      expect(queue[0].agentId).toBe('reviewer');
      expect(queue[0].message).toBe('Please review this');
      expect(queue[0].status).toBe('pending');
    });

    it('should pause execution when interruption_request is received', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-1',
        executionId: 'exec-hitl',
      });

      expect(service.executionState().status).toBe('paused');
    });

    it('should also detect interruption_request via "event" field', () => {
      emit({
        type: 'custom',
        event: 'interruption_request',
        approvalId: 'approval-2',
        executionId: 'exec-hitl',
      });

      expect(service.hitlQueue().length).toBe(1);
      expect(service.hitlQueue()[0].id).toBe('approval-2');
    });

    it('should resolveApproval and update status', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-1',
        executionId: 'exec-hitl',
      });

      service.resolveApproval('approval-1', 'approved', 'Looks good');

      expect(service.hitlQueue()[0].status).toBe('approved');
    });

    it('should resume execution when all approvals are resolved', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-1',
        executionId: 'exec-hitl',
      });

      expect(service.executionState().status).toBe('paused');

      service.resolveApproval('approval-1', 'approved');

      expect(service.executionState().status).toBe('running');
    });

    it('should not resume if there are still pending approvals', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-1',
        executionId: 'exec-hitl',
      });
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-2',
        executionId: 'exec-hitl',
      });

      service.resolveApproval('approval-1', 'approved');

      expect(service.executionState().status).toBe('paused');
    });

    it('should getApprovalExecutionId for existing approval', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'approval-1',
        executionId: 'exec-hitl',
      });

      expect(service.getApprovalExecutionId('approval-1')).toBe('exec-hitl');
    });

    it('should return undefined for non-existent approval', () => {
      expect(service.getApprovalExecutionId('non-existent')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // nodeIdMapper delegation
  // ---------------------------------------------------------------------------
  describe('nodeIdMapper delegation', () => {
    it('should use custom nodeIdMapper when provided', () => {
      setup({
        nodeIdMapper: (nodeId: string) => {
          const map: Record<string, string> = {
            'devbrand/analysis/github': 'github-analyzer',
          };
          return map[nodeId] ?? null;
        },
      });

      service.startExecution('/api/stream/exec-mapper');
      emit({
        type: 'node:start',
        nodeId: 'devbrand/analysis/github',
        executionId: 'e1',
      });

      const progress = service.agentProgress();
      expect(progress['github-analyzer']).toBeDefined();
      expect(progress['github-analyzer'].status).toBe('executing');
    });

    it('should fall back to raw nodeId when nodeIdMapper returns null', () => {
      setup({
        nodeIdMapper: () => null,
      });

      service.startExecution('/api/stream/exec-null');
      emit({
        type: 'node:start',
        nodeId: 'some-node',
        executionId: 'e1',
      });

      // When nodeIdMapper returns null, resolveAgentId falls back to
      // the raw nodeId via the ?? operator
      expect(service.agentProgress()['some-node']).toBeDefined();
      expect(service.agentProgress()['some-node'].status).toBe('executing');
    });

    it('should fall back to raw nodeId when no mapper is configured', () => {
      setup(); // no nodeIdMapper

      service.startExecution('/api/stream/exec-no-mapper');
      emit({
        type: 'node:start',
        nodeId: 'raw-node-id',
        executionId: 'e1',
      });

      expect(service.agentProgress()['raw-node-id']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Computed signals
  // ---------------------------------------------------------------------------
  describe('computed signals', () => {
    beforeEach(() => {
      service.startExecution('/api/stream/exec-computed');
    });

    it('isExecuting should be true when status is running', () => {
      expect(service.isExecuting()).toBe(true);
    });

    it('isExecuting should be false when status is idle', () => {
      service.reset();
      expect(service.isExecuting()).toBe(false);
    });

    it('currentAgent should return first active agent', () => {
      expect(service.currentAgent()).toBeNull();

      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      expect(service.currentAgent()).toBe('agent-a');
    });

    it('currentAgent should return null when no agents are active', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({ type: 'node:end', nodeId: 'agent-a', executionId: 'e1' });
      expect(service.currentAgent()).toBeNull();
    });

    it('workflowProgress should return 0 when no agents exist', () => {
      expect(service.workflowProgress()).toBe(0);
    });

    it('workflowProgress should calculate completion percentage', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({ type: 'node:start', nodeId: 'agent-b', executionId: 'e1' });
      expect(service.workflowProgress()).toBe(0);

      emit({ type: 'node:end', nodeId: 'agent-a', executionId: 'e1' });
      expect(service.workflowProgress()).toBe(50);

      emit({ type: 'node:end', nodeId: 'agent-b', executionId: 'e1' });
      expect(service.workflowProgress()).toBe(100);
    });

    it('hasPendingApprovals should be false when queue is empty', () => {
      expect(service.hasPendingApprovals()).toBe(false);
    });

    it('hasPendingApprovals should be true when pending approvals exist', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'a1',
        executionId: 'exec-computed',
      });

      expect(service.hasPendingApprovals()).toBe(true);
    });

    it('hasPendingApprovals should be false after all are resolved', () => {
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'a1',
        executionId: 'exec-computed',
      });

      service.resolveApproval('a1', 'approved');
      expect(service.hasPendingApprovals()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Event history
  // ---------------------------------------------------------------------------
  describe('event history', () => {
    beforeEach(() => {
      service.startExecution('/api/stream/exec-history');
    });

    it('getEventsByType should return filtered events', () => {
      emit({ type: 'node:start', nodeId: 'a', executionId: 'e1' });
      emit({ type: 'node:end', nodeId: 'a', executionId: 'e1' });
      emit({ type: 'node:start', nodeId: 'b', executionId: 'e1' });

      const nodeStartEvents = service.getEventsByType(
        StreamEventType.NODE_START
      );
      expect(nodeStartEvents.length).toBe(2);
    });

    it('getEventsByAgent should return events for mapped agent', () => {
      emit({
        type: 'node:start',
        nodeId: 'agent-a',
        executionId: 'e1',
        sequenceNumber: 1,
      });
      emit({
        type: 'node:end',
        nodeId: 'agent-a',
        executionId: 'e1',
        sequenceNumber: 2,
      });
      emit({
        type: 'node:start',
        nodeId: 'agent-b',
        executionId: 'e1',
        sequenceNumber: 3,
      });

      const agentAEvents = service.getEventsByAgent('agent-a');
      expect(agentAEvents.length).toBe(2);
    });

    it('getEventsByAgent should return empty array for unknown agent', () => {
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });

      const events = service.getEventsByAgent('non-existent');
      expect(events.length).toBe(0);
    });

    it('should store events in eventHistory$ observable', (done) => {
      emit({ type: 'node:start', nodeId: 'x', executionId: 'e1' });

      service.eventHistory$.subscribe((history) => {
        if (history.length > 0) {
          expect(history[0].type).toBe(StreamEventType.NODE_START);
          done();
        }
      });
    });
  });

  // ---------------------------------------------------------------------------
  // reset()
  // ---------------------------------------------------------------------------
  describe('reset', () => {
    it('should clear all state and disconnect SSE', () => {
      service.startExecution('/api/stream/exec-reset');
      emit({ type: 'node:start', nodeId: 'agent-a', executionId: 'e1' });
      emit({
        type: 'custom',
        kind: 'interruption_request',
        approvalId: 'a1',
        executionId: 'exec-reset',
      });

      service.reset();

      expect(service.executionState().status).toBe('idle');
      expect(service.executionState().currentStep).toBe(0);
      expect(service.executionState().error).toBeNull();
      expect(Object.keys(service.agentProgress()).length).toBe(0);
      expect(service.hitlQueue().length).toBe(0);
      expect(service.isExecuting()).toBe(false);
      expect(service.currentAgent()).toBeNull();
      expect(service.workflowProgress()).toBe(0);
      expect(service.hasPendingApprovals()).toBe(false);
      expect(mockSse.disconnect).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // SSE error handling
  // ---------------------------------------------------------------------------
  describe('SSE error handling', () => {
    it('should set status to error when SSE emits error', () => {
      service.startExecution('/api/stream/exec-err');
      emitError('Connection lost');

      expect(service.executionState().status).toBe('error');
      expect(service.executionState().error).toBe('Connection lost');
    });
  });
});
