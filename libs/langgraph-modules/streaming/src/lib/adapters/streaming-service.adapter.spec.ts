import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  StreamingServiceAdapter,
  TokenStreamingServiceAdapter,
  EventStreamProcessorServiceAdapter,
  WebSocketBridgeServiceAdapter,
} from './streaming-service.adapter';
import { TokenStreamingService } from '../services/token-streaming.service';
import { EventStreamProcessorService } from '../services/event-stream-processor.service';
import { WebSocketBridgeService } from '../services/websocket-bridge.service';
import { StreamEventType } from '../constants';
import type { StreamUpdate } from '@hive-academy/langgraph-core';

describe('StreamingServiceAdapter', () => {
  let adapter: StreamingServiceAdapter;
  let tokenStreamingService: jest.Mocked<TokenStreamingService>;
  let eventStreamProcessor: jest.Mocked<EventStreamProcessorService>;
  let webSocketBridge: jest.Mocked<WebSocketBridgeService>;

  beforeEach(async () => {
    const mockTokenStreamingService = {
      initializeTokenStream: jest.fn(),
      streamToken: jest.fn(),
      flushTokens: jest.fn(),
      closeTokenStream: jest.fn(),
    };

    const mockEventStreamProcessor = {
      processBatch: jest.fn(),
    };

    const mockWebSocketBridge = {
      broadcastToExecution: jest.fn(),
      sendToClient: jest.fn(),
      linkClientToExecution: jest.fn(),
      unregisterClient: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StreamingServiceAdapter,
        {
          provide: TokenStreamingService,
          useValue: mockTokenStreamingService,
        },
        {
          provide: EventStreamProcessorService,
          useValue: mockEventStreamProcessor,
        },
        {
          provide: WebSocketBridgeService,
          useValue: mockWebSocketBridge,
        },
      ],
    }).compile();

    adapter = moduleRef.get<StreamingServiceAdapter>(StreamingServiceAdapter);
    tokenStreamingService = moduleRef.get(TokenStreamingService);
    eventStreamProcessor = moduleRef.get(EventStreamProcessorService);
    webSocketBridge = moduleRef.get(WebSocketBridgeService);
  });

  describe('Token Streaming Integration', () => {
    it('should initialize token stream successfully', async () => {
      tokenStreamingService.initializeTokenStream.mockResolvedValue(undefined);

      await adapter.initializeTokenStream({
        executionId: 'exec-123',
        nodeId: 'node-456',
        config: {
          enabled: true,
          methodName: 'test-method',
          nodeId: 'node-456',
        },
      });

      expect(tokenStreamingService.initializeTokenStream).toHaveBeenCalledWith({
        executionId: 'exec-123',
        nodeId: 'node-456',
        bufferSize: 100,
        config: {
          enabled: true,
          methodName: 'test-method',
          nodeId: 'node-456',
        },
      });
    });

    it('should stream token through TokenStreamingService', () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';
      const token = 'hello';
      const metadata = { source: 'test' };

      adapter.streamToken(executionId, nodeId, token, metadata);

      expect(tokenStreamingService.streamToken).toHaveBeenCalledWith(
        executionId,
        nodeId,
        token,
        metadata
      );
    });

    it('should handle missing metadata in streamToken', () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';
      const token = 'hello';

      adapter.streamToken(executionId, nodeId, token);

      expect(tokenStreamingService.streamToken).toHaveBeenCalledWith(
        executionId,
        nodeId,
        token,
        {}
      );
    });

    it('should flush tokens successfully', async () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';

      tokenStreamingService.flushTokens.mockResolvedValue(undefined);

      await adapter.flushTokens(executionId, nodeId);

      expect(tokenStreamingService.flushTokens).toHaveBeenCalledWith(
        executionId,
        nodeId
      );
    });

    it('should handle token streaming errors gracefully', () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';
      const token = 'hello';
      const error = new Error('Streaming failed');

      tokenStreamingService.streamToken.mockImplementation(() => {
        throw error;
      });

      expect(() => adapter.streamToken(executionId, nodeId, token)).toThrow(
        'Streaming failed'
      );
    });
  });

  describe('Event Streaming Integration', () => {
    it('should stream event through EventStreamProcessor and WebSocketBridge', () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';
      const event = {
        type: 'progress',
        data: { progress: 50, message: 'Processing...' },
        metadata: { step: 'validation' },
      };

      adapter.streamEvent(executionId, nodeId, event);

      // Should process through event stream processor
      expect(eventStreamProcessor.processBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          type: StreamEventType.PROGRESS,
          data: event.data,
          metadata: expect.objectContaining({
            executionId,
            nodeId,
            step: 'validation',
          }),
        }),
      ]);

      // Should also broadcast directly to WebSocket
      expect(webSocketBridge.broadcastToExecution).toHaveBeenCalledWith(
        executionId,
        expect.objectContaining({
          type: StreamEventType.PROGRESS,
          data: event.data,
        })
      );
    });

    it('should map different event types correctly', () => {
      const testCases = [
        { input: 'progress', expected: StreamEventType.PROGRESS },
        { input: 'token', expected: StreamEventType.TOKEN },
        { input: 'node_start', expected: StreamEventType.NODE_START },
        { input: 'node_complete', expected: StreamEventType.NODE_COMPLETE },
        { input: 'node_error', expected: StreamEventType.ERROR },
        { input: 'unknown_type', expected: StreamEventType.EVENTS },
      ];

      testCases.forEach(({ input, expected }) => {
        const event = {
          type: input,
          data: { test: true },
          metadata: {},
        };

        adapter.streamEvent('exec-123', 'node-456', event);

        expect(eventStreamProcessor.processBatch).toHaveBeenCalledWith([
          expect.objectContaining({
            type: expected,
          }),
        ]);
      });
    });

    it('should handle event streaming errors gracefully', () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';
      const event = {
        type: 'progress',
        data: { progress: 50 },
        metadata: {},
      };
      const error = new Error('Event processing failed');

      eventStreamProcessor.processBatch.mockImplementation(() => {
        throw error;
      });

      expect(() => adapter.streamEvent(executionId, nodeId, event)).toThrow(
        'Event processing failed'
      );
    });
  });

  describe('Progress Streaming Integration', () => {
    it('should stream progress as event with correct metadata', () => {
      const executionId = 'exec-123';
      const nodeId = 'node-456';
      const progress = {
        progress: 75,
        message: 'Almost done',
        details: { currentStep: 'finalization' },
      };

      adapter.streamProgress(executionId, nodeId, progress);

      expect(eventStreamProcessor.processBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          type: StreamEventType.PROGRESS,
          data: progress,
          metadata: expect.objectContaining({
            progressType: 'node_progress',
            progress: 75,
            message: 'Almost done',
            executionId,
            nodeId,
          }),
        }),
      ]);
    });
  });

  describe('WebSocket Broadcasting Integration', () => {
    it('should broadcast StreamUpdate objects directly', async () => {
      const executionId = 'exec-123';
      const streamUpdate: StreamUpdate = {
        type: StreamEventType.TOKEN,
        data: { token: 'hello' },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: 123,
          executionId,
        },
      };

      await adapter.broadcastToExecution(executionId, streamUpdate);

      expect(webSocketBridge.broadcastToExecution).toHaveBeenCalledWith(
        executionId,
        streamUpdate
      );
    });

    it('should convert non-StreamUpdate data to StreamUpdate format', async () => {
      const executionId = 'exec-123';
      const rawData = { message: 'custom data' };

      await adapter.broadcastToExecution(executionId, rawData);

      expect(webSocketBridge.broadcastToExecution).toHaveBeenCalledWith(
        executionId,
        expect.objectContaining({
          type: StreamEventType.EVENTS,
          data: rawData,
          metadata: expect.objectContaining({
            executionId,
            timestamp: expect.any(Date),
            sequenceNumber: expect.any(Number),
          }),
        })
      );
    });

    it('should send to specific client with proper data conversion', async () => {
      const clientId = 'client-789';
      const rawData = { notification: 'task complete' };

      await adapter.sendToClient(clientId, rawData);

      expect(webSocketBridge.sendToClient).toHaveBeenCalledWith(
        clientId,
        expect.objectContaining({
          type: StreamEventType.EVENTS,
          data: rawData,
          metadata: expect.objectContaining({
            executionId: 'direct',
            timestamp: expect.any(Date),
            sequenceNumber: expect.any(Number),
          }),
        })
      );
    });

    it('should handle WebSocket errors gracefully', async () => {
      const executionId = 'exec-123';
      const data = { test: true };
      const error = new Error('WebSocket connection failed');

      webSocketBridge.broadcastToExecution.mockImplementation(() => {
        throw error;
      });

      await expect(
        adapter.broadcastToExecution(executionId, data)
      ).rejects.toThrow('WebSocket connection failed');
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log successful operations at debug level', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

      await adapter.initializeTokenStream({
        executionId: 'exec-123',
        nodeId: 'node-456',
        config: {
          enabled: true,
          methodName: 'test-method',
          nodeId: 'node-456',
        },
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Initialized token stream for exec-123:node-456'
        )
      );

      logSpy.mockRestore();
    });

    it('should log errors at error level', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const error = new Error('Test error');

      tokenStreamingService.initializeTokenStream.mockRejectedValue(error);

      await expect(
        adapter.initializeTokenStream({
          executionId: 'exec-123',
          nodeId: 'node-456',
          config: {
            enabled: true,
            methodName: 'test-method',
            nodeId: 'node-456',
          },
        })
      ).rejects.toThrow('Test error');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize token stream:'),
        error
      );

      logSpy.mockRestore();
    });
  });
});

describe('Individual Service Adapters', () => {
  describe('TokenStreamingServiceAdapter', () => {
    let adapter: TokenStreamingServiceAdapter;
    let tokenStreamingService: jest.Mocked<TokenStreamingService>;

    beforeEach(async () => {
      const mockTokenStreamingService = {
        initializeTokenStream: jest.fn(),
        streamToken: jest.fn(),
        flushTokens: jest.fn(),
        closeTokenStream: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          TokenStreamingServiceAdapter,
          {
            provide: TokenStreamingService,
            useValue: mockTokenStreamingService,
          },
        ],
      }).compile();

      adapter = moduleRef.get<TokenStreamingServiceAdapter>(
        TokenStreamingServiceAdapter
      );
      tokenStreamingService = moduleRef.get(TokenStreamingService);
    });

    it('should delegate all operations to TokenStreamingService', async () => {
      const options = {
        executionId: 'exec-123',
        nodeId: 'node-456',
        config: {
          enabled: true,
          methodName: 'test-method',
          nodeId: 'node-456',
        },
      };

      // Test all methods
      await adapter.initializeTokenStream(options);
      adapter.streamToken('exec-123', 'node-456', 'token', { test: true });
      await adapter.flushTokens('exec-123', 'node-456');
      adapter.closeTokenStream('exec-123', 'node-456');

      expect(tokenStreamingService.initializeTokenStream).toHaveBeenCalledWith(
        options
      );
      expect(tokenStreamingService.streamToken).toHaveBeenCalledWith(
        'exec-123',
        'node-456',
        'token',
        { test: true }
      );
      expect(tokenStreamingService.flushTokens).toHaveBeenCalledWith(
        'exec-123',
        'node-456'
      );
      expect(tokenStreamingService.closeTokenStream).toHaveBeenCalledWith(
        'exec-123',
        'node-456'
      );
    });
  });

  describe('EventStreamProcessorServiceAdapter', () => {
    let adapter: EventStreamProcessorServiceAdapter;
    let eventStreamProcessor: jest.Mocked<EventStreamProcessorService>;

    beforeEach(async () => {
      const mockEventStreamProcessor = {
        processBatch: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          EventStreamProcessorServiceAdapter,
          {
            provide: EventStreamProcessorService,
            useValue: mockEventStreamProcessor,
          },
        ],
      }).compile();

      adapter = moduleRef.get<EventStreamProcessorServiceAdapter>(
        EventStreamProcessorServiceAdapter
      );
      eventStreamProcessor = moduleRef.get(EventStreamProcessorService);
    });

    it('should convert and process events correctly', () => {
      const event = {
        type: 'node_start',
        data: { nodeId: 'test-node' },
        metadata: { workflow: 'test-workflow' },
      };

      adapter.streamEvent('exec-123', 'node-456', event);

      expect(eventStreamProcessor.processBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          type: StreamEventType.NODE_START,
          data: event.data,
          metadata: expect.objectContaining({
            executionId: 'exec-123',
            nodeId: 'node-456',
            workflow: 'test-workflow',
          }),
        }),
      ]);
    });
  });

  describe('WebSocketBridgeServiceAdapter', () => {
    let adapter: WebSocketBridgeServiceAdapter;
    let webSocketBridge: jest.Mocked<WebSocketBridgeService>;

    beforeEach(async () => {
      const mockWebSocketBridge = {
        broadcastToExecution: jest.fn(),
        sendToClient: jest.fn(),
        linkClientToExecution: jest.fn(),
        unregisterClient: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          WebSocketBridgeServiceAdapter,
          {
            provide: WebSocketBridgeService,
            useValue: mockWebSocketBridge,
          },
        ],
      }).compile();

      adapter = moduleRef.get<WebSocketBridgeServiceAdapter>(
        WebSocketBridgeServiceAdapter
      );
      webSocketBridge = moduleRef.get(WebSocketBridgeService);
    });

    it('should manage client connections correctly', () => {
      adapter.registerClient('client-123', 'exec-456');
      adapter.unregisterClient('client-123');

      expect(webSocketBridge.linkClientToExecution).toHaveBeenCalledWith(
        'client-123',
        'exec-456'
      );
      expect(webSocketBridge.unregisterClient).toHaveBeenCalledWith(
        'client-123'
      );
    });
  });
});
