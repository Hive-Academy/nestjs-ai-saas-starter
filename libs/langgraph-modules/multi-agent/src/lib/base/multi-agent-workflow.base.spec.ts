import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  MultiAgent,
  MultiAgentTopology,
} from '../decorators/multi-agent.decorator';
import { Agent } from '../decorators/agent.decorator';
import { MultiAgentWorkflowBase } from './multi-agent-workflow.base';
import { MultiAgentCoordinatorService } from '../coordination/multi-agent-coordinator.service';
import { AgentState } from '../interfaces/multi-agent.interface';

// Minimal mock agent (no dependencies, just for decorator validation)
@Agent({
  id: 'mock-test-agent',
  name: 'Mock Test Agent',
  description: 'Minimal agent for testing base class',
})
@Injectable()
class MockTestAgent {
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    return { messages: state.messages };
  }
}

// Test multi-agent workflow
@MultiAgent({
  networkId: 'test-streaming-network',
  topology: MultiAgentTopology.SUPERVISOR,
  agents: [MockTestAgent], // Minimal agent to satisfy decorator validation
  config: {
    systemPrompt: 'You coordinate test workers',
    workers: ['mock-test-agent'],
  },
  streaming: true,
  checkpointing: false,
})
@Injectable()
class TestMultiAgentWorkflow extends MultiAgentWorkflowBase {
  async execute(message: string) {
    return await this.executeCoordination(
      { messages: [{ role: 'user', content: message }] },
      { stream: true, streamMode: 'values' }
    );
  }
}

describe('MultiAgentWorkflowBase', () => {
  let moduleRef: TestingModule;
  let workflow: TestMultiAgentWorkflow;
  let coordinator: MultiAgentCoordinatorService;

  beforeEach(async () => {
    // Create mock coordinator with streaming support
    const mockCoordinator = {
      executeWorkflow: jest
        .fn()
        .mockImplementation(async function* (networkId: string, input: any) {
          // Simulate async iterable when streamMode is provided
          if (input.streamMode) {
            yield {
              messages: [{ role: 'assistant', content: 'Chunk 1' }],
              metadata: { step: 1 },
            };
            yield {
              messages: [{ role: 'assistant', content: 'Chunk 2' }],
              metadata: { step: 2 },
            };
            yield {
              messages: [{ role: 'assistant', content: 'Final result' }],
              metadata: { step: 3 },
            };
          } else {
            // Non-streaming mode returns final result
            return {
              messages: [{ role: 'assistant', content: 'Final result' }],
              metadata: { completed: true },
            };
          }
        }),
      setupNetwork: jest.fn().mockResolvedValue('test-streaming-network'),
      registerWorkflow: jest.fn(),
      getWorkflow: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        TestMultiAgentWorkflow,
        {
          provide: MultiAgentCoordinatorService,
          useValue: mockCoordinator,
        },
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    workflow = moduleRef.get<TestMultiAgentWorkflow>(TestMultiAgentWorkflow);
    coordinator = moduleRef.get<MultiAgentCoordinatorService>(
      MultiAgentCoordinatorService
    );

    // Initialize workflow
    await workflow.onModuleInit();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('executeCoordination streaming', () => {
    it('should return async iterable when stream option provided', async () => {
      // Execute with streaming enabled
      const stream = await workflow.executeCoordination(
        { messages: [{ role: 'user', content: 'test message' }] },
        { stream: true, streamMode: 'values' }
      );

      // Verify it's async iterable
      expect(stream[Symbol.asyncIterator]).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');

      // Verify we can iterate
      let chunkCount = 0;
      const chunks: any[] = [];

      for await (const chunk of stream) {
        chunkCount++;
        chunks.push(chunk);
        expect(chunk).toBeDefined();
        expect(chunk.messages).toBeDefined();
      }

      // Verify streaming produced multiple chunks
      expect(chunkCount).toBeGreaterThan(0);
      expect(chunkCount).toBe(3); // Our mock produces 3 chunks

      // Verify coordinator.executeWorkflow was called with streamMode
      expect(coordinator.executeWorkflow).toHaveBeenCalledWith(
        'test-streaming-network',
        expect.objectContaining({
          messages: [{ role: 'user', content: 'test message' }],
          streamMode: 'values',
          config: expect.any(Object),
        })
      );
    });

    it('should delegate streaming to coordinator without await wrapping', async () => {
      // Execute with streaming
      const stream = await workflow.executeCoordination(
        { messages: [{ role: 'user', content: 'test' }] },
        { stream: true, streamMode: 'values' }
      );

      // The stream should be the direct return from coordinator.executeWorkflow
      // Not wrapped in Promise.resolve() or awaited
      expect(stream[Symbol.asyncIterator]).toBeDefined();

      // Verify coordinator was called exactly once
      expect(coordinator.executeWorkflow).toHaveBeenCalledTimes(1);

      // Verify the returned stream is functional
      const firstChunk = await stream[Symbol.asyncIterator]().next();
      expect(firstChunk.done).toBe(false);
      expect(firstChunk.value).toBeDefined();
      expect(firstChunk.value.messages).toBeDefined();
    });

    it('should pass correct streamMode parameter to coordinator', async () => {
      // Test with 'updates' mode
      await workflow.executeCoordination(
        { messages: [{ role: 'user', content: 'test' }] },
        { stream: true, streamMode: 'updates' }
      );

      expect(coordinator.executeWorkflow).toHaveBeenCalledWith(
        'test-streaming-network',
        expect.objectContaining({
          streamMode: 'updates',
        })
      );

      // Clear mock
      (coordinator.executeWorkflow as jest.Mock).mockClear();

      // Test with 'messages' mode
      await workflow.executeCoordination(
        { messages: [{ role: 'user', content: 'test' }] },
        { stream: true, streamMode: 'messages' }
      );

      expect(coordinator.executeWorkflow).toHaveBeenCalledWith(
        'test-streaming-network',
        expect.objectContaining({
          streamMode: 'messages',
        })
      );
    });

    it('should not throw "a is not async iterable" error', async () => {
      // This was the original bug: executeCoordination was using invoke()
      // which returned a non-iterable value, causing "a is not async iterable"
      await expect(async () => {
        const stream = await workflow.executeCoordination(
          { messages: [{ role: 'user', content: 'test' }] },
          { stream: true, streamMode: 'values' }
        );

        // Should be able to iterate without error
        for await (const chunk of stream) {
          expect(chunk).toBeDefined();
          break; // Stop after first chunk
        }
      }).resolves.not.toThrow();
    });

    it('should respect workflow streaming config', async () => {
      // Execute without streaming option
      // Note: Test workflow has streaming: true in decorator,
      // so it will always stream unless explicitly overridden
      const result = await workflow.executeCoordination(
        { messages: [{ role: 'user', content: 'test' }] },
        { stream: false } // This won't disable streaming because multiAgentConfig.streaming is true
      );

      // Result should be defined (async iterable because streaming is enabled in config)
      expect(result).toBeDefined();
      expect(result[Symbol.asyncIterator]).toBeDefined();

      // Verify coordinator was called WITH streamMode (because multiAgentConfig.streaming is true)
      expect(coordinator.executeWorkflow).toHaveBeenCalledWith(
        'test-streaming-network',
        expect.objectContaining({
          messages: [{ role: 'user', content: 'test' }],
          streamMode: 'values', // Default value
          config: expect.any(Object),
        })
      );
    });

    it('should use default streamMode "values" when not specified', async () => {
      // Execute with stream: true but no streamMode
      await workflow.executeCoordination(
        { messages: [{ role: 'user', content: 'test' }] },
        { stream: true }
      );

      // Should default to 'values' mode
      expect(coordinator.executeWorkflow).toHaveBeenCalledWith(
        'test-streaming-network',
        expect.objectContaining({
          streamMode: 'values',
        })
      );
    });
  });

  describe('workflow initialization', () => {
    it('should initialize network ID during onModuleInit', async () => {
      // Create a fresh workflow instance that hasn't been initialized yet
      const TestModule = await Test.createTestingModule({
        providers: [
          TestMultiAgentWorkflow,
          {
            provide: MultiAgentCoordinatorService,
            useValue: coordinator,
          },
          {
            provide: ModuleRef,
            useValue: moduleRef.get(ModuleRef),
          },
        ],
      }).compile();

      const uninitializedWorkflow = TestModule.get<TestMultiAgentWorkflow>(
        TestMultiAgentWorkflow
      );

      // Before init - networkId should be null
      expect((uninitializedWorkflow as any).networkId).toBeNull();

      // After init - networkId should be set
      await uninitializedWorkflow.onModuleInit();
      expect((uninitializedWorkflow as any).networkId).toBe(
        'test-streaming-network'
      );

      await TestModule.close();
    });

    it('should throw error when executeCoordination called before init', async () => {
      const uninitializedWorkflow = new TestMultiAgentWorkflow();
      (uninitializedWorkflow as any).coordinator = coordinator;

      await expect(
        uninitializedWorkflow.executeCoordination(
          { messages: [{ role: 'user', content: 'test' }] },
          { stream: true }
        )
      ).rejects.toThrow('Network not initialized');
    });
  });
});
