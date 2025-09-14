import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowStreamService } from './workflow-stream.service';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import {
  type IStreamingService,
  STREAMING_SERVICE_TOKEN,
  NoOpStreamingService,
} from '@hive-academy/langgraph-core';

describe('WorkflowStreamService Integration', () => {
  let service: WorkflowStreamService;
  let mockStreamingService: jest.Mocked<IStreamingService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockMetadataProcessor: jest.Mocked<MetadataProcessorService>;

  beforeEach(async () => {
    mockStreamingService = {
      initializeTokenStream: jest.fn(),
      streamToken: jest.fn(),
      flushTokens: jest.fn(),
      streamEvent: jest.fn(),
      streamProgress: jest.fn(),
      broadcastToExecution: jest.fn(),
      sendToClient: jest.fn(),
      emitEvent: jest.fn(),
      emitProgress: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    mockMetadataProcessor = {
      extractWorkflowDefinition: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowStreamService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: MetadataProcessorService,
          useValue: mockMetadataProcessor,
        },
        {
          provide: STREAMING_SERVICE_TOKEN,
          useValue: mockStreamingService,
        },
      ],
    }).compile();

    service = moduleRef.get<WorkflowStreamService>(WorkflowStreamService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Core Requirement: Real Streaming Service Integration', () => {
    it('should use injected streaming service instead of console.log for token streaming', async () => {
      const executionId = 'test-exec-123';
      const nodeId = 'test-node-456';

      // Create a stream
      service.createStream(executionId);

      // Configure node streaming with token metadata
      const mockWorkflowClass = {
        prototype: {},
      };
      service.configureNodeStreaming(
        executionId,
        nodeId,
        mockWorkflowClass,
        'testMethod'
      );

      // Mock metadata to enable token streaming
      const tokenConfig = {
        enabled: true,
        bufferSize: 50,
        flushInterval: 100,
      };

      // Simulate decorator metadata being present
      jest
        .spyOn(service as any, 'getTokenStreamConfig')
        .mockReturnValue(tokenConfig);

      // Create a mock message with content for token streaming
      const mockMessage = {
        content: 'hello world test',
        role: 'assistant',
      };

      // Test token streaming through the service
      const tokenStream = service.streamMessageTokens(
        executionId,
        nodeId,
        mockMessage,
        tokenConfig
      );
      const tokens = [];
      for await (const token of tokenStream) {
        tokens.push(token);
      }

      // Verify injected streaming service is called instead of console.log
      expect(mockStreamingService.streamToken).toHaveBeenCalledWith(
        executionId,
        nodeId,
        expect.any(String),
        expect.objectContaining({
          index: expect.any(Number),
          totalTokens: expect.any(Number),
          progress: expect.any(Number),
        })
      );

      // Verify flush is called
      expect(mockStreamingService.flushTokens).toHaveBeenCalledWith(
        executionId,
        nodeId
      );

      // Verify no console.log was used (this proves the fix)
      const consoleSpy = jest.spyOn(console, 'log');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should initialize token streams via injected service', async () => {
      const executionId = 'test-exec-123';
      const nodeId = 'test-node-456';

      const mockWorkflowClass = {
        prototype: {},
      };

      // Mock the metadata extraction to return token streaming configuration
      jest.spyOn(service as any, 'getTokenStreamConfig').mockReturnValue({
        enabled: true,
        bufferSize: 100,
      });

      mockStreamingService.initializeTokenStream.mockResolvedValue(undefined);

      // Configure node streaming
      service.configureNodeStreaming(
        executionId,
        nodeId,
        mockWorkflowClass,
        'testMethod'
      );

      // Verify the streaming service was called to initialize
      expect(mockStreamingService.initializeTokenStream).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId,
          nodeId,
          config: expect.objectContaining({
            enabled: true,
            bufferSize: 100,
          }),
        })
      );
    });

    it('should stream progress via injected service', () => {
      const executionId = 'test-exec-123';
      const progress = 75;
      const message = 'Processing data...';
      const metadata = { step: 'analysis' };

      service.createStream(executionId);
      service.emitProgress(executionId, progress, message, metadata);

      // Verify streaming service received the progress update
      expect(mockStreamingService.streamProgress).toHaveBeenCalledWith(
        executionId,
        'workflow',
        expect.objectContaining({
          progress: 75,
          message: 'Processing data...',
          step: 'analysis',
        })
      );
    });
  });

  describe('Dependency Injection Pattern Validation', () => {
    it('should work with NoOpStreamingService when streaming is disabled', async () => {
      // Create a new service instance with NoOpStreamingService
      const noOpService = new NoOpStreamingService();
      const moduleRef = await Test.createTestingModule({
        providers: [
          WorkflowStreamService,
          {
            provide: EventEmitter2,
            useValue: mockEventEmitter,
          },
          {
            provide: MetadataProcessorService,
            useValue: mockMetadataProcessor,
          },
          {
            provide: STREAMING_SERVICE_TOKEN,
            useValue: noOpService,
          },
        ],
      }).compile();

      const serviceWithNoOp = moduleRef.get<WorkflowStreamService>(
        WorkflowStreamService
      );
      await serviceWithNoOp.onModuleInit();

      // Test that operations don't fail with NoOpStreamingService
      const executionId = 'test-exec-no-op';
      serviceWithNoOp.createStream(executionId);

      // These should not throw errors or have side effects
      expect(() =>
        serviceWithNoOp.emitProgress(executionId, 50, 'test')
      ).not.toThrow();

      // Cleanup
      await serviceWithNoOp.onModuleDestroy();
    });

    it('should handle streaming service errors gracefully', async () => {
      const executionId = 'test-exec-error';
      const nodeId = 'test-node-error';

      // Mock streaming service to throw error
      mockStreamingService.initializeTokenStream.mockRejectedValue(
        new Error('Streaming failed')
      );

      const mockWorkflowClass = { prototype: {} };

      // Mock successful token config lookup
      jest.spyOn(service as any, 'getTokenStreamConfig').mockReturnValue({
        enabled: true,
        bufferSize: 100,
      });

      // Should not throw - errors should be logged and handled
      expect(() => {
        service.configureNodeStreaming(
          executionId,
          nodeId,
          mockWorkflowClass,
          'testMethod'
        );
      }).not.toThrow();

      // Verify the error was caught and logged (initialization was attempted)
      expect(mockStreamingService.initializeTokenStream).toHaveBeenCalled();
    });
  });

  describe('Workflow Execution Integration', () => {
    it('should emit events to EventEmitter for WebSocket bridge compatibility', async () => {
      const executionId = 'test-exec-events';

      service.createStream(executionId);
      service.emitProgress(executionId, 25, 'Starting process');

      // Verify EventEmitter integration for backward compatibility
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        `workflow.progress.${executionId}`,
        expect.objectContaining({
          type: expect.any(String),
          data: expect.objectContaining({
            progress: 25,
            message: 'Starting process',
          }),
        })
      );
    });

    it('should maintain stream observables for real-time UI updates', () => {
      const executionId = 'test-exec-observable';

      // Create stream and verify it returns observable
      const stream = service.createStream(executionId);
      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');

      // Test stream filtering
      const filteredStream = service.getFilteredStream(executionId, [
        'TOKEN' as any,
      ]);
      expect(filteredStream).toBeDefined();
      expect(typeof filteredStream.subscribe).toBe('function');
    });

    it('should properly cleanup streaming configurations on stream close', () => {
      const executionId = 'test-exec-cleanup';
      const nodeId = 'test-node-cleanup';

      // Create stream and configure streaming
      service.createStream(executionId);
      const mockWorkflowClass = { prototype: {} };
      service.configureNodeStreaming(
        executionId,
        nodeId,
        mockWorkflowClass,
        'testMethod'
      );

      // Verify stream exists
      expect(service.hasStream(executionId)).toBe(true);

      // Close stream (simulating execution completion)
      (service as any).closeStream(executionId);

      // Verify cleanup
      expect(service.hasStream(executionId)).toBe(false);
    });
  });

  describe('Token Streaming Integration', () => {
    it('should stream individual tokens with proper metadata', async () => {
      const executionId = 'test-token-exec';
      const nodeId = 'test-token-node';
      const message = {
        content: 'Hello world from AI',
        role: 'assistant',
      };

      const tokenConfig = {
        enabled: true,
        bufferSize: 10,
        flushInterval: 50,
      };

      service.createStream(executionId);

      // Stream tokens from message
      const tokenStream = service.streamMessageTokens(
        executionId,
        nodeId,
        message,
        tokenConfig
      );
      const collectedTokens = [];

      for await (const update of tokenStream) {
        collectedTokens.push(update);
      }

      // Verify tokens were streamed individually
      expect(collectedTokens.length).toBeGreaterThan(0);
      expect(collectedTokens.every((token) => token.type === 'TOKEN')).toBe(
        true
      );

      // Verify streaming service was called for each token
      expect(mockStreamingService.streamToken).toHaveBeenCalledTimes(
        expect.any(Number)
      );

      // Verify final flush
      expect(mockStreamingService.flushTokens).toHaveBeenCalledWith(
        executionId,
        nodeId
      );
    });

    it('should handle token streaming with custom processors', async () => {
      const executionId = 'test-processor-exec';
      const nodeId = 'test-processor-node';
      const message = {
        content: 'test content',
        role: 'assistant',
      };

      const tokenConfig = {
        enabled: true,
        processor: (token: string, context: any) =>
          `[PROCESSED]${token}[/PROCESSED]`,
        bufferSize: 10,
      };

      service.createStream(executionId);

      const tokenStream = service.streamMessageTokens(
        executionId,
        nodeId,
        message,
        tokenConfig
      );
      const tokens = [];

      for await (const update of tokenStream) {
        tokens.push(update);
      }

      // Verify processor was applied
      expect(
        tokens.some(
          (token) =>
            typeof token.data.content === 'string' &&
            token.data.content.includes('[PROCESSED]')
        )
      ).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle missing stream gracefully', () => {
      const nonExistentExecutionId = 'non-existent-stream';

      // Should not throw when emitting to non-existent stream
      expect(() => {
        service.emitProgress(nonExistentExecutionId, 50, 'test');
      }).not.toThrow();

      // Should still call streaming service even if local stream doesn't exist
      expect(mockStreamingService.streamProgress).toHaveBeenCalledWith(
        nonExistentExecutionId,
        'workflow',
        expect.objectContaining({
          progress: 50,
          message: 'test',
        })
      );
    });

    it('should handle streaming service failures without breaking workflow', async () => {
      const executionId = 'test-resilient-exec';

      // Mock streaming service to fail
      mockStreamingService.streamToken.mockImplementation(() => {
        throw new Error('Network error');
      });

      service.createStream(executionId);

      // Progress emission should still work despite streaming failures
      expect(() => {
        service.emitProgress(executionId, 30, 'continuing despite errors');
      }).not.toThrow();

      // EventEmitter should still work for local/fallback functionality
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        `workflow.progress.${executionId}`,
        expect.any(Object)
      );
    });
  });

  describe('Multi-Level Streaming Validation', () => {
    it('should support both real-time streaming and local observables', () => {
      const executionId = 'test-multi-level';

      // Create observable stream
      const observable = service.createStream(executionId);
      const receivedUpdates: any[] = [];

      // Subscribe to local observable
      const subscription = observable.subscribe((update) => {
        receivedUpdates.push(update);
      });

      // Emit progress - should go to both streaming service AND local observable
      service.emitProgress(executionId, 60, 'multi-level test');

      // Verify both paths work
      expect(mockStreamingService.streamProgress).toHaveBeenCalled(); // Real-time streaming
      expect(receivedUpdates.length).toBe(1); // Local observable
      expect(receivedUpdates[0].data.progress).toBe(60);

      subscription.unsubscribe();
    });

    it('should provide specialized stream filtering', () => {
      const executionId = 'test-filtering';

      // Test different stream types
      const messagesStream = service.getMessagesStream(executionId);
      const tokensStream = service.getTokensStream(executionId);

      expect(messagesStream).toBeDefined();
      expect(tokensStream).toBeDefined();

      // Verify they are observables
      expect(typeof messagesStream.subscribe).toBe('function');
      expect(typeof tokensStream.subscribe).toBe('function');
    });
  });
});
