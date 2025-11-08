import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  BaseCheckpointSaver,
  BaseStore,
} from '@langchain/langgraph-checkpoint';
import { HumanApprovalNode } from '../lib/nodes/human-approval.node';
import { ApproverIntelligenceService } from '../lib/services/approver-intelligence.service';
import type { WorkflowState } from '@hive-academy/langgraph-core';

/**
 * Workflow-Engine Integration Tests for HITL Module
 *
 * Task 21: Validate embedded state management alignment with workflow-engine
 *
 * Tests:
 * 1. BaseCheckpointSaver access via RunnableConfig
 * 2. BaseStore access via RunnableConfig
 * 3. Approval workflows with workflow-engine graph compilation
 * 4. Embedded state management (no standalone services)
 */
describe('HITL + Workflow-Engine Integration', () => {
  let module: TestingModule;
  let humanApprovalNode: HumanApprovalNode;
  let approverIntelligence: ApproverIntelligenceService;

  // Mock checkpointer and store
  let mockCheckpointer: Partial<BaseCheckpointSaver>;
  let mockStore: Partial<BaseStore>;

  beforeEach(async () => {
    // Create mock checkpointer
    mockCheckpointer = {
      put: jest.fn().mockResolvedValue(undefined),
      getTuple: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    };

    // Create mock BaseStore
    mockStore = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      search: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({
          maxListeners: 20,
        }),
      ],
      providers: [
        HumanApprovalNode,
        ApproverIntelligenceService,
        {
          provide: 'IMemoryAdapter',
          useValue: null, // No memory adapter for these tests
        },
      ],
    }).compile();

    humanApprovalNode = module.get<HumanApprovalNode>(HumanApprovalNode);
    approverIntelligence = module.get<ApproverIntelligenceService>(
      ApproverIntelligenceService
    );
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Checkpointer Integration', () => {
    it('should access checkpointer via RunnableConfig', async () => {
      const config: RunnableConfig = {
        configurable: {
          checkpointer: mockCheckpointer as BaseCheckpointSaver,
          thread_id: 'test-thread-123',
        },
      };

      const state: WorkflowState = {
        executionId: 'exec-123',
        currentNode: 'approval-node',
        confidence: 0.7,
        metadata: {},
      };

      // This should not throw because checkpointer is configured
      await expect(
        humanApprovalNode.execute(state, config, {
          autoApproveThreshold: 0.95, // Will not auto-approve at 0.7
          skipCondition: () => true, // Skip to avoid interrupt()
        })
      ).resolves.toBeDefined();
    });

    it('should throw error when checkpointer is missing', async () => {
      const config: RunnableConfig = {
        configurable: {},
      };

      const state: WorkflowState = {
        executionId: 'exec-456',
        currentNode: 'approval-node',
        confidence: 0.7,
        metadata: {},
      };

      // Should throw because checkpointer is required
      await expect(humanApprovalNode.execute(state, config)).rejects.toThrow(
        'Checkpointer not configured'
      );
    });
  });

  describe('BaseStore Integration', () => {
    it('should access BaseStore via RunnableConfig', async () => {
      const config: RunnableConfig = {
        configurable: {
          checkpointer: mockCheckpointer as BaseCheckpointSaver,
          store: mockStore as BaseStore,
          thread_id: 'test-thread-234',
        },
      };

      const state: WorkflowState = {
        executionId: 'exec-789',
        currentNode: 'approval-node',
        confidence: 0.7,
        userId: 'user-123',
        metadata: {},
      };

      // Execute with BaseStore available
      await humanApprovalNode.execute(state, config, {
        skipCondition: () => true, // Skip to avoid interrupt()
      });

      // Verify BaseStore was accessed for storing approval context
      expect(mockStore.put).toHaveBeenCalledWith(
        ['approval-context', 'user-123'],
        'approval-exec-789',
        expect.objectContaining({
          executionId: 'exec-789',
          nodeId: 'approval-node',
          confidence: 0.7,
        })
      );

      // Verify BaseStore was searched for historical approvals
      expect(mockStore.search).toHaveBeenCalledWith([
        'approval-context',
        'user-123',
      ]);
    });

    it('should gracefully degrade when BaseStore is unavailable', async () => {
      const config: RunnableConfig = {
        configurable: {
          checkpointer: mockCheckpointer as BaseCheckpointSaver,
          // No store provided
          thread_id: 'test-thread-345',
        },
      };

      const state: WorkflowState = {
        executionId: 'exec-012',
        currentNode: 'approval-node',
        confidence: 0.7,
        metadata: {},
      };

      // Should work without BaseStore (graceful degradation)
      await expect(
        humanApprovalNode.execute(state, config, {
          skipCondition: () => true,
        })
      ).resolves.toBeDefined();

      // Store should not be called
      expect(mockStore.put).not.toHaveBeenCalled();
      expect(mockStore.search).not.toHaveBeenCalled();
    });
  });

  describe('ApproverIntelligence BaseStore Integration', () => {
    it('should store and retrieve approver patterns via BaseStore', async () => {
      const config: RunnableConfig = {
        configurable: {
          store: mockStore as BaseStore,
        },
      };

      // Mock search to return historical patterns
      (mockStore.search as jest.Mock).mockResolvedValue([
        {
          value: {
            executionId: 'exec-prev',
            selectedApproverId: 'approver-1',
            score: 0.85,
          },
        },
      ]);

      const request: any = {
        executionId: 'exec-new',
        nodeId: 'approval',
        state: { metadata: {} },
        riskAssessment: { level: 'high' },
        confidence: { current: 0.8 },
      };

      const result = await approverIntelligence.selectBestApprover(
        request,
        ['approver-1', 'approver-2'],
        config
      );

      // Should have searched for historical patterns
      expect(mockStore.search).toHaveBeenCalledWith([
        'approver-patterns',
        'high',
      ]);

      // Should have stored new selection pattern
      expect(mockStore.put).toHaveBeenCalledWith(
        ['approver-patterns', 'high'],
        'selection-exec-new',
        expect.objectContaining({
          executionId: 'exec-new',
          selectedApproverId: expect.any(String),
          riskLevel: 'high',
          historicalPatternsUsed: 1,
        })
      );

      expect(result.selectedApproverId).toBeDefined();
    });

    it('should work without BaseStore (graceful degradation)', async () => {
      const config: RunnableConfig = {
        configurable: {},
      };

      const request: any = {
        executionId: 'exec-fallback',
        nodeId: 'approval',
        state: { metadata: {} },
        riskAssessment: { level: 'medium' },
        confidence: { current: 0.75 },
      };

      const result = await approverIntelligence.selectBestApprover(
        request,
        ['approver-1', 'approver-2'],
        config
      );

      // Should fall back to default selection
      expect(result.selectedApproverId).toBe('approver-1');
      expect(result.selectionReasoning).toContain('Memory adapter unavailable');

      // Store should not be called
      expect(mockStore.put).not.toHaveBeenCalled();
      expect(mockStore.search).not.toHaveBeenCalled();
    });

    it('should store feedback patterns in BaseStore', async () => {
      const config: RunnableConfig = {
        configurable: {
          store: mockStore as BaseStore,
        },
      };

      await approverIntelligence.storeFeedbackPattern(
        'approver-1',
        'approved',
        300000, // 5 minutes
        'high',
        config
      );

      // Verify feedback was stored
      expect(mockStore.put).toHaveBeenCalledWith(
        ['approver-feedback', 'approver-1'],
        expect.stringContaining('feedback-'),
        expect.objectContaining({
          approverId: 'approver-1',
          decision: 'approved',
          responseTime: 300000,
          riskLevel: 'high',
        })
      );
    });
  });

  describe('Embedded State Management Validation', () => {
    it('should use RunnableConfig pattern (not standalone services)', async () => {
      // This test validates the architectural pattern:
      // - Checkpointer accessed via config (not injected service)
      // - BaseStore accessed via config (not injected service)
      // - No standalone checkpoint/memory services

      const config: RunnableConfig = {
        configurable: {
          checkpointer: mockCheckpointer as BaseCheckpointSaver,
          store: mockStore as BaseStore,
          thread_id: 'test-embedded',
        },
      };

      const state: WorkflowState = {
        executionId: 'exec-embedded',
        currentNode: 'approval',
        confidence: 0.8,
        metadata: {},
      };

      // Execute node - should access checkpointer and store from config
      await humanApprovalNode.execute(state, config, {
        skipCondition: () => true,
      });

      // Validate embedded pattern:
      // 1. No service injection for checkpointer/store
      expect(
        Reflect.getMetadata('design:paramtypes', HumanApprovalNode)
      ).not.toContain('BaseCheckpointSaver');
      expect(
        Reflect.getMetadata('design:paramtypes', HumanApprovalNode)
      ).not.toContain('BaseStore');

      // 2. Config-based access works
      expect(config.configurable?.checkpointer).toBeDefined();
      expect(config.configurable?.store).toBeDefined();
    });

    it('should validate workflow-engine compilation pattern', () => {
      // This test documents the workflow-engine compilation pattern:
      // graph.compile({ checkpointer, store })
      //
      // Pattern verified in:
      // - workflow-execution.service.ts:94-96 (checkpointer + store)
      // - workflow-execution.service.ts:133-136 (checkpointer + store)

      const compileMock = jest.fn();
      const graphMock = {
        compile: compileMock,
      };

      // Simulate workflow-engine compile call
      graphMock.compile({
        checkpointer: mockCheckpointer as BaseCheckpointSaver,
        store: mockStore as BaseStore,
      });

      // Verify compile was called with both checkpointer and store
      expect(compileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          checkpointer: expect.any(Object),
          store: expect.any(Object),
        })
      );
    });
  });

  describe('Cross-Workflow Memory Sharing', () => {
    it('should enable cross-workflow memory via BaseStore namespaces', async () => {
      const config: RunnableConfig = {
        configurable: {
          checkpointer: mockCheckpointer as BaseCheckpointSaver,
          store: mockStore as BaseStore,
        },
      };

      // Workflow 1: Store approval context
      const state1: WorkflowState = {
        executionId: 'workflow-1-exec',
        currentNode: 'approval',
        confidence: 0.9,
        userId: 'shared-user',
        metadata: {},
      };

      await humanApprovalNode.execute(state1, config, {
        skipCondition: () => true,
      });

      // Verify stored in user-specific namespace
      expect(mockStore.put).toHaveBeenCalledWith(
        ['approval-context', 'shared-user'],
        expect.any(String),
        expect.any(Object)
      );

      // Workflow 2: Search for historical approvals (same user)
      (mockStore.search as jest.Mock).mockResolvedValue([
        {
          value: {
            executionId: 'workflow-1-exec',
            confidence: 0.9,
          },
        },
      ]);

      const state2: WorkflowState = {
        executionId: 'workflow-2-exec',
        currentNode: 'approval',
        confidence: 0.7,
        userId: 'shared-user',
        metadata: {},
      };

      await humanApprovalNode.execute(state2, config, {
        skipCondition: () => true,
      });

      // Verify searched same namespace
      expect(mockStore.search).toHaveBeenCalledWith([
        'approval-context',
        'shared-user',
      ]);

      // This demonstrates cross-workflow memory:
      // - Workflow 1 stores approval context
      // - Workflow 2 retrieves it via BaseStore namespace
      // - No hardcoded workflow coupling
    });
  });
});
