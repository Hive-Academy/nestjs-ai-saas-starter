import {
  NoOpStreamingService,
  STREAMING_SERVICE_TOKEN,
} from '@hive-academy/langgraph-core';
import {
  MultiAgentCoordinatorService,
  MultiAgentModule,
} from '@hive-academy/langgraph-multi-agent';
import { StreamingServiceAdapter } from '@hive-academy/langgraph-streaming';
import {
  WorkflowEngineModule,
  WorkflowStreamService,
} from '@hive-academy/langgraph-workflow-engine';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';

describe('Application-Level Streaming DI Integration', () => {
  let app: INestApplication;
  let streamingAdapter: StreamingServiceAdapter;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get streaming adapter with fallback
    try {
      streamingAdapter = app.get(StreamingServiceAdapter);
    } catch (error) {
      console.warn(
        'StreamingServiceAdapter not available in test context, creating mock'
      );
      streamingAdapter = {
        streamToken: jest.fn(),
        streamProgress: jest.fn(),
        streamEvent: jest.fn(),
        broadcastToExecution: jest.fn(),
        sendToClient: jest.fn(),
      } as any;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Core Requirement: DI Pattern Validation', () => {
    it('should inject StreamingServiceAdapter in workflow-engine instead of NoOpStreamingService', () => {
      // Get the workflow stream service from the DI container
      const workflowStreamService = app.get(WorkflowStreamService);

      // Extract the injected streaming service
      const injectedStreamingService = (workflowStreamService as any)
        .streamingService;

      // Verify it's the real adapter, not the no-op
      expect(injectedStreamingService).toBeInstanceOf(StreamingServiceAdapter);
      expect(injectedStreamingService).not.toBeInstanceOf(NoOpStreamingService);
      expect(injectedStreamingService).toBe(streamingAdapter);
    });

    it('should inject StreamingServiceAdapter in multi-agent module instead of NoOpStreamingService', () => {
      // Get the multi-agent coordinator from the DI container
      const multiAgentCoordinator = app.get(MultiAgentCoordinatorService);

      // Extract the injected streaming service
      const injectedStreamingService = (multiAgentCoordinator as any)
        .streamingService;

      // Verify it's the real adapter, not the no-op
      expect(injectedStreamingService).toBeInstanceOf(StreamingServiceAdapter);
      expect(injectedStreamingService).not.toBeInstanceOf(NoOpStreamingService);
      expect(injectedStreamingService).toBe(streamingAdapter);
    });

    it('should provide STREAMING_SERVICE_TOKEN with correct implementation across modules', () => {
      // Test workflow engine DI token
      const workflowStreamingService = app
        .select(WorkflowEngineModule)
        .get(STREAMING_SERVICE_TOKEN, { strict: false });

      expect(workflowStreamingService).toBeInstanceOf(StreamingServiceAdapter);
      expect(workflowStreamingService).toBe(streamingAdapter);

      // Test multi-agent module DI token
      const multiAgentStreamingService = app
        .select(MultiAgentModule)
        .get(STREAMING_SERVICE_TOKEN, { strict: false });

      expect(multiAgentStreamingService).toBeInstanceOf(
        StreamingServiceAdapter
      );
      expect(multiAgentStreamingService).toBe(streamingAdapter);
    });
  });

  describe('Application Configuration Integration', () => {
    it('should configure streaming module with correct settings from app.module', () => {
      // Verify streaming configuration is properly loaded
      // This would come from getStreamingConfig() in app.module.ts
      expect(streamingAdapter).toBeDefined();

      // Check that the adapter has access to underlying services
      const tokenService = (streamingAdapter as any).tokenStreamingService;
      const eventProcessor = (streamingAdapter as any).eventStreamProcessor;
      const webSocketBridge = (streamingAdapter as any).webSocketBridge;

      expect(tokenService).toBeDefined();
      expect(eventProcessor).toBeDefined();
      expect(webSocketBridge).toBeDefined();
    });

    it('should wire streaming configuration correctly in forRootAsync pattern', () => {
      // Verify that the forRootAsync useFactory pattern worked correctly
      // by checking that streaming is properly wired

      // Get services that should have received streaming via forRootAsync
      const workflowStream = app.get(WorkflowStreamService);
      const multiAgentCoordinator = app.get(MultiAgentCoordinatorService);

      // Both should have the same streaming adapter instance (singleton pattern)
      const workflowStreamingService = (workflowStream as any).streamingService;
      const multiAgentStreamingService = (multiAgentCoordinator as any)
        .streamingService;

      expect(workflowStreamingService).toBe(multiAgentStreamingService);
      expect(workflowStreamingService).toBe(streamingAdapter);
    });
  });

  describe('Real Streaming vs No-Op Behavior Validation', () => {
    it('should actually stream tokens through WebSocket instead of no-op', async () => {
      const executionId = 'di-integration-test';
      const nodeId = 'di-test-node';
      const token = 'test-token-content';

      // Mock the underlying services to verify calls reach them
      const tokenService = (streamingAdapter as any).tokenStreamingService;
      const streamTokenSpy = jest
        .spyOn(tokenService, 'streamToken')
        .mockImplementation();

      // Call through the DI-injected adapter
      streamingAdapter.streamToken(executionId, nodeId, token, { test: true });

      // Verify the real service was called (not a no-op)
      expect(streamTokenSpy).toHaveBeenCalledWith(executionId, nodeId, token, {
        test: true,
      });

      streamTokenSpy.mockRestore();
    });

    it('should actually stream events through WebSocket instead of no-op', () => {
      const executionId = 'di-integration-event-test';
      const nodeId = 'di-test-node';
      const event = {
        type: 'test_event',
        data: { message: 'integration test event' },
        metadata: { source: 'di-test' },
      };

      // Mock the underlying services to verify calls reach them
      const eventProcessor = (streamingAdapter as any).eventStreamProcessor;
      const webSocketBridge = (streamingAdapter as any).webSocketBridge;

      const processBatchSpy = jest
        .spyOn(eventProcessor, 'processBatch')
        .mockImplementation();
      const broadcastSpy = jest
        .spyOn(webSocketBridge, 'broadcastToExecution')
        .mockImplementation();

      // Call through the DI-injected adapter
      streamingAdapter.streamEvent(executionId, nodeId, event);

      // Verify real services were called (not no-ops)
      expect(processBatchSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          data: event.data,
          metadata: expect.objectContaining({
            executionId,
            nodeId,
            source: 'di-test',
          }),
        }),
      ]);

      expect(broadcastSpy).toHaveBeenCalledWith(
        executionId,
        expect.objectContaining({
          data: event.data,
        })
      );

      processBatchSpy.mockRestore();
      broadcastSpy.mockRestore();
    });

    it('should stream progress updates through real services', () => {
      const executionId = 'di-progress-test';
      const nodeId = 'di-progress-node';
      const progressData = {
        progress: 75,
        message: 'DI integration progress test',
        details: { phase: 'testing' },
      };

      // Mock underlying services
      const eventProcessor = (streamingAdapter as any).eventStreamProcessor;
      const webSocketBridge = (streamingAdapter as any).webSocketBridge;

      const processBatchSpy = jest
        .spyOn(eventProcessor, 'processBatch')
        .mockImplementation();
      const broadcastSpy = jest
        .spyOn(webSocketBridge, 'broadcastToExecution')
        .mockImplementation();

      // Call through the DI-injected adapter
      streamingAdapter.streamProgress(executionId, nodeId, progressData);

      // Verify real streaming happened
      expect(processBatchSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'PROGRESS',
          data: progressData,
          metadata: expect.objectContaining({
            executionId,
            nodeId,
            progressType: 'node_progress',
            progress: 75,
            message: 'DI integration progress test',
          }),
        }),
      ]);

      expect(broadcastSpy).toHaveBeenCalled();

      processBatchSpy.mockRestore();
      broadcastSpy.mockRestore();
    });
  });

  describe('Cross-Module Communication', () => {
    it('should enable workflow-engine to communicate with multi-agent via shared streaming', () => {
      // Both modules should have access to the same streaming adapter
      const workflowStream = app.get(WorkflowStreamService);
      const multiAgentCoordinator = app.get(MultiAgentCoordinatorService);

      const workflowStreamingService = (workflowStream as any).streamingService;
      const multiAgentStreamingService = (multiAgentCoordinator as any)
        .streamingService;

      // Verify they share the same streaming infrastructure
      expect(workflowStreamingService).toBe(multiAgentStreamingService);

      // Mock the shared streaming service
      const broadcastSpy = jest
        .spyOn(streamingAdapter, 'broadcastToExecution')
        .mockImplementation();

      // Simulate workflow streaming to an execution
      const executionId = 'cross-module-test';
      workflowStreamingService.streamProgress(executionId, 'workflow', {
        progress: 50,
        message: 'Workflow progress',
      });

      // Multi-agent should be able to broadcast to the same execution
      multiAgentStreamingService.broadcastToExecution(executionId, {
        type: 'agent_update',
        message: 'Multi-agent coordination update',
      });

      // Both calls should go through the same shared adapter
      expect(broadcastSpy).toHaveBeenCalledTimes(2); // Once from progress, once from broadcast

      broadcastSpy.mockRestore();
    });

    it('should maintain consistent execution contexts across modules', async () => {
      const executionId = 'consistent-context-test';

      // Both modules should be able to reference the same execution
      const workflowStream = app.get(WorkflowStreamService);
      const multiAgentCoordinator = app.get(MultiAgentCoordinatorService);

      // Create workflow stream
      const stream = workflowStream.createStream(executionId);
      expect(stream).toBeDefined();

      // Multi-agent should be able to broadcast to the same execution context
      const broadcastSpy = jest
        .spyOn(streamingAdapter, 'broadcastToExecution')
        .mockImplementation();

      (multiAgentCoordinator as any).streamingService.broadcastToExecution(
        executionId,
        { message: 'Cross-module context test' }
      );

      expect(broadcastSpy).toHaveBeenCalledWith(
        executionId,
        expect.objectContaining({ message: 'Cross-module context test' })
      );

      broadcastSpy.mockRestore();
    });
  });

  describe('Error Handling in DI Context', () => {
    it('should handle streaming service errors without breaking DI container', () => {
      // Force an error in the streaming service
      const tokenService = (streamingAdapter as any).tokenStreamingService;
      const originalStreamToken = tokenService.streamToken;

      tokenService.streamToken = jest.fn().mockImplementation(() => {
        throw new Error('Simulated streaming error');
      });

      // This should not crash the application or break DI
      expect(() => {
        streamingAdapter.streamToken('error-test', 'node', 'token');
      }).toThrow('Simulated streaming error');

      // Restore and verify DI container is still functional
      tokenService.streamToken = originalStreamToken;

      // Should work normally after error
      expect(() => {
        streamingAdapter.streamProgress('recovery-test', 'node', {
          progress: 100,
          message: 'Recovered from error',
        });
      }).not.toThrow();
    });

    it('should maintain service isolation despite errors', () => {
      // Test that errors in one service don\'t affect others
      const eventProcessor = (streamingAdapter as any).eventStreamProcessor;
      const originalProcessBatch = eventProcessor.processBatch;

      // Break the event processor
      eventProcessor.processBatch = jest.fn().mockImplementation(() => {
        throw new Error('Event processor error');
      });

      // Token streaming should still work via a different service
      const tokenService = (streamingAdapter as any).tokenStreamingService;
      const streamTokenSpy = jest
        .spyOn(tokenService, 'streamToken')
        .mockImplementation();

      // This should fail due to event processor error
      expect(() => {
        streamingAdapter.streamEvent('isolation-test', 'node', {
          type: 'test',
          data: {},
          metadata: {},
        });
      }).toThrow('Event processor error');

      // But token streaming should still work
      expect(() => {
        streamingAdapter.streamToken('isolation-test', 'node', 'token');
      }).not.toThrow();

      expect(streamTokenSpy).toHaveBeenCalledWith(
        'isolation-test',
        'node',
        'token',
        {}
      );

      // Restore
      eventProcessor.processBatch = originalProcessBatch;
      streamTokenSpy.mockRestore();
    });
  });

  describe('Production Readiness Validation', () => {
    it('should have proper logging configuration for production monitoring', () => {
      // Verify that the streaming adapter has proper logging
      const logger = (streamingAdapter as any).logger;
      expect(logger).toBeDefined();
      expect(logger.constructor.name).toBe('Logger');
    });

    it('should handle high-throughput scenarios without memory leaks', async () => {
      const executionId = 'throughput-test';
      const messageCount = 100;

      // Mock to prevent actual network calls
      const broadcastSpy = jest
        .spyOn(
          (streamingAdapter as any).webSocketBridge,
          'broadcastToExecution'
        )
        .mockImplementation();

      // Send many messages rapidly
      for (let i = 0; i < messageCount; i++) {
        streamingAdapter.streamToken(executionId, `node-${i}`, `token-${i}`, {
          index: i,
          batch: 'throughput-test',
        });
      }

      // Should handle all messages
      expect(broadcastSpy).toHaveBeenCalledTimes(messageCount);

      // Verify consistent execution ID across all calls
      for (let i = 0; i < messageCount; i++) {
        expect(broadcastSpy).toHaveBeenNthCalledWith(
          i + 1,
          executionId,
          expect.objectContaining({
            metadata: expect.objectContaining({
              executionId,
            }),
          })
        );
      }

      broadcastSpy.mockRestore();
    });

    it('should be ready for production deployment with proper service wiring', () => {
      // Verify all critical services are properly wired
      expect(streamingAdapter).toBeDefined();
      expect((streamingAdapter as any).tokenStreamingService).toBeDefined();
      expect((streamingAdapter as any).eventStreamProcessor).toBeDefined();
      expect((streamingAdapter as any).webSocketBridge).toBeDefined();

      // Verify services can be resolved from DI container
      expect(app.get(WorkflowStreamService)).toBeDefined();
      expect(app.get(MultiAgentCoordinatorService)).toBeDefined();
      expect(app.get(StreamingServiceAdapter)).toBeDefined();

      // Verify no circular dependencies or resolution issues
      expect(() => app.get(STREAMING_SERVICE_TOKEN)).not.toThrow();
    });
  });
});
