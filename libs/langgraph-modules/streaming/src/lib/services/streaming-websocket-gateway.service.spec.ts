import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsException } from '@nestjs/websockets';
import { StreamingWebSocketGateway } from './streaming-websocket-gateway.service';
import { WebSocketBridgeService } from './websocket-bridge.service';
import {
  type WebSocketGatewayConfig,
  WebSocketMessageType,
  type SubscribeExecutionPayload,
  type JoinRoomPayload,
  type AuthenticationPayload,
} from '../interfaces/websocket-gateway.interface';
import {
  type StreamUpdate,
  StreamEventType,
} from '../interfaces/streaming.interface';

// Mock Socket.io
const createMockSocket = (id = 'test-socket-id') => ({
  id,
  handshake: {
    address: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
    },
  },
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  on: jest.fn(),
});

const mockServer = {
  to: jest.fn(() => ({ emit: jest.fn() })),
  emit: jest.fn(),
  engine: { generateId: jest.fn() },
  use: jest.fn(),
  close: jest.fn(),
};

describe('StreamingWebSocketGateway', () => {
  let gateway: StreamingWebSocketGateway;
  let eventEmitter: EventEmitter2;
  let bridgeService: WebSocketBridgeService;
  let module: TestingModule;

  const mockConfig: WebSocketGatewayConfig = {
    enabled: true,
    websocket: {
      maxConnections: 100,
      connectionTimeout: 30000,
      heartbeatInterval: 25000,
      compression: true,
    },
    auth: { required: false },
  };

  beforeEach(async () => {
    const mockBridgeService = {
      registerGateway: jest.fn(),
      registerClient: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
      linkClientToExecution: jest.fn(),
      subscribeToEvents: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      broadcastToExecution: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        StreamingWebSocketGateway,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: 'WEBSOCKET_GATEWAY_CONFIG',
          useValue: mockConfig,
        },
        {
          provide: WebSocketBridgeService,
          useValue: mockBridgeService,
        },
      ],
    }).compile();

    gateway = module.get<StreamingWebSocketGateway>(StreamingWebSocketGateway);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    bridgeService = module.get<WebSocketBridgeService>(WebSocketBridgeService);

    // Mock the server property
    (gateway as any).server = mockServer;
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should initialize with default configuration', async () => {
      await gateway.onModuleInit();
      expect(bridgeService.registerGateway).toHaveBeenCalledWith(gateway);
    });

    it('should skip initialization when disabled', async () => {
      const disabledGateway = new StreamingWebSocketGateway(
        eventEmitter,
        { enabled: false },
        bridgeService
      );

      const logSpy = jest.spyOn((disabledGateway as any).logger, 'log');
      await disabledGateway.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith('WebSocket gateway is disabled');
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await gateway.onModuleInit();
    });

    it('should handle new connections', async () => {
      const mockSocket = createMockSocket();
      await gateway.handleConnection(mockSocket as any);

      const connections = gateway.getActiveConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].metadata.ip).toBe('127.0.0.1');
      expect(connections[0].state).toBe('connected');
    });

    it('should reject connections when at maximum limit', async () => {
      const mockSocket = createMockSocket();

      // Set a low connection limit
      const limitedConfig = { ...mockConfig, websocket: { maxConnections: 0 } };
      const limitedGateway = new StreamingWebSocketGateway(
        eventEmitter,
        limitedConfig,
        bridgeService
      );
      (limitedGateway as any).server = mockServer;
      await limitedGateway.onModuleInit();

      await limitedGateway.handleConnection(mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'CONNECTION_LIMIT',
            category: 'connection',
          }),
        })
      );
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnections', async () => {
      await gateway.handleConnection(mockSocket as any);
      expect(gateway.getActiveConnections()).toHaveLength(1);

      await gateway.handleDisconnect(mockSocket as any);
      expect(gateway.getActiveConnections()).toHaveLength(0);
    });

    it('should handle connection errors gracefully', async () => {
      const errorSocket = {
        ...mockSocket,
        handshake: null, // This should cause an error
      };

      await gateway.handleConnection(errorSocket as any);
      expect(gateway.getActiveConnections()).toHaveLength(0);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await gateway.onModuleInit();
      await gateway.handleConnection(mockSocket as any);
    });

    describe('Subscribe to Execution', () => {
      it('should handle execution subscription', async () => {
        const payload: SubscribeExecutionPayload = {
          executionId: 'test-execution-id',
          eventTypes: [StreamEventType.TOKEN, StreamEventType.PROGRESS],
        };

        await gateway.handleSubscribeExecution(mockSocket as any, payload);

        expect(bridgeService.linkClientToExecution).toHaveBeenCalled();
        expect(bridgeService.subscribeToEvents).toHaveBeenCalledWith(
          expect.any(String),
          payload.eventTypes
        );
        expect(mockSocket.emit).toHaveBeenCalledWith(
          'subscription_confirmed',
          expect.objectContaining({
            type: 'execution',
            executionId: payload.executionId,
            eventTypes: payload.eventTypes,
          })
        );
      });

      it('should reject subscription without execution ID', async () => {
        const payload = { executionId: '' };

        await gateway.handleSubscribeExecution(mockSocket as any, payload);

        expect(mockSocket.emit).toHaveBeenCalledWith(
          'error',
          expect.objectContaining({
            data: expect.objectContaining({
              message: 'Execution ID is required',
            }),
          })
        );
      });
    });

    describe('Join Room', () => {
      it('should handle room joining', async () => {
        const payload: JoinRoomPayload = {
          roomId: 'test-room',
          options: { requireAuth: false },
        };

        await gateway.handleJoinRoom(mockSocket as any, payload);

        expect(mockSocket.join).toHaveBeenCalledWith('test-room');
        expect(bridgeService.joinRoom).toHaveBeenCalledWith(
          expect.any(String),
          'test-room',
          payload.options
        );
        expect(mockSocket.emit).toHaveBeenCalledWith(
          'room_joined',
          expect.objectContaining({
            roomId: 'test-room',
          })
        );
      });
    });

    describe('Authentication', () => {
      it('should handle successful authentication when not required', async () => {
        const payload: AuthenticationPayload = {
          token: 'test-token',
          metadata: { client: 'test-client' },
        };

        await gateway.handleAuthentication(mockSocket as any, payload);

        expect(mockSocket.emit).toHaveBeenCalledWith(
          'authentication_success',
          expect.objectContaining({
            connectionId: expect.any(String),
          })
        );
      });

      it('should handle authentication when required', async () => {
        const authGateway = new StreamingWebSocketGateway(
          eventEmitter,
          { ...mockConfig, auth: { required: true } },
          bridgeService
        );
        (authGateway as any).server = mockServer;
        await authGateway.onModuleInit();
        await authGateway.handleConnection(mockSocket as any);

        const payload: AuthenticationPayload = {
          token: 'invalid-token',
        };

        await authGateway.handleAuthentication(mockSocket as any, payload);

        expect(mockSocket.emit).toHaveBeenCalledWith(
          'error',
          expect.objectContaining({
            data: expect.objectContaining({
              message: 'Authentication failed',
            }),
          })
        );
      });
    });

    describe('Ping/Pong', () => {
      it('should handle ping with pong response', async () => {
        await gateway.handlePing(mockSocket as any);

        expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
          timestamp: expect.any(Date),
        });
      });
    });

    describe('Status Request', () => {
      it('should handle status requests', async () => {
        await gateway.handleGetStatus(mockSocket as any);

        expect(mockSocket.emit).toHaveBeenCalledWith(
          'status_response',
          expect.objectContaining({
            status: 'connected',
            connection: expect.objectContaining({
              id: expect.any(String),
              uptime: expect.any(Number),
            }),
          })
        );
      });
    });
  });

  describe('Broadcasting', () => {
    beforeEach(async () => {
      await gateway.onModuleInit();
      await gateway.handleConnection(mockSocket as any);
    });

    it('should broadcast stream updates to subscribed clients', async () => {
      // Subscribe to execution
      const executionId = 'test-execution';
      await gateway.handleSubscribeExecution(mockSocket as any, {
        executionId,
        eventTypes: [StreamEventType.TOKEN],
      });

      // Clear previous emit calls
      mockSocket.emit.mockClear();

      // Broadcast update
      const update: StreamUpdate = {
        type: StreamEventType.TOKEN,
        data: { content: 'test token' },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: 1,
          executionId,
        },
      };

      gateway.broadcastStreamUpdate(update);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'stream_update',
        expect.objectContaining({
          type: WebSocketMessageType.STREAM_UPDATE,
          data: { update },
        })
      );
    });

    it('should broadcast to rooms', async () => {
      const roomId = 'test-room';
      const update: StreamUpdate = {
        type: StreamEventType.EVENTS,
        data: { message: 'test event' },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: 1,
          executionId: 'test',
        },
      };

      gateway.broadcastToRoom(roomId, update);

      expect(mockServer.to).toHaveBeenCalledWith(roomId);
    });

    it('should not broadcast to unsubscribed clients', async () => {
      // Don't subscribe to this execution
      const update: StreamUpdate = {
        type: StreamEventType.TOKEN,
        data: { content: 'test token' },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: 1,
          executionId: 'different-execution',
        },
      };

      mockSocket.emit.mockClear();
      gateway.broadcastStreamUpdate(update);

      // Should not receive the update since not subscribed
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'stream_update',
        expect.anything()
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await gateway.onModuleInit();
    });

    it('should track connection statistics', async () => {
      await gateway.handleConnection(mockSocket as any);

      const stats = gateway.getStats();
      expect(stats.activeConnections).toBe(1);
      expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
    });

    it('should update statistics on disconnection', async () => {
      await gateway.handleConnection(mockSocket as any);
      await gateway.handleDisconnect(mockSocket as any);

      const stats = gateway.getStats();
      expect(stats.activeConnections).toBe(0);
    });

    it('should track message statistics', async () => {
      await gateway.handleConnection(mockSocket as any);

      const update: StreamUpdate = {
        type: StreamEventType.TOKEN,
        data: { content: 'test' },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: 1,
          executionId: 'test',
        },
      };

      const initialStats = gateway.getStats();
      gateway.broadcastStreamUpdate(update);
      const finalStats = gateway.getStats();

      expect(finalStats.messages.sent).toBeGreaterThanOrEqual(
        initialStats.messages.sent
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await gateway.onModuleInit();
      await gateway.handleConnection(mockSocket as any);
    });

    it('should handle malformed subscription payloads', async () => {
      const malformedPayload = null;

      await gateway.handleSubscribeExecution(
        mockSocket as any,
        malformedPayload as any
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'internal',
          }),
        })
      );
    });

    it('should handle bridge service errors gracefully', async () => {
      // Mock bridge service to throw error
      bridgeService.linkClientToExecution = jest.fn(() => {
        throw new Error('Bridge service error');
      });

      const payload: SubscribeExecutionPayload = {
        executionId: 'test-execution-id',
      };

      await gateway.handleSubscribeExecution(mockSocket as any, payload);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('Bridge service error'),
          }),
        })
      );
    });

    it('should track error statistics', async () => {
      const initialStats = gateway.getStats();

      // Trigger an authentication error
      const authGateway = new StreamingWebSocketGateway(
        eventEmitter,
        { ...mockConfig, auth: { required: true } },
        bridgeService
      );
      (authGateway as any).server = mockServer;
      await authGateway.onModuleInit();
      await authGateway.handleConnection(mockSocket as any);

      await authGateway.handleAuthentication(mockSocket as any, {
        token: 'invalid',
      });

      const finalStats = authGateway.getStats();
      expect(finalStats.errors.authentication).toBeGreaterThan(
        initialStats.errors.authentication
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on module destroy', async () => {
      await gateway.onModuleInit();
      await gateway.handleConnection(mockSocket as any);

      expect(gateway.getActiveConnections()).toHaveLength(1);

      await gateway.onModuleDestroy();

      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should cleanup stale connections', async () => {
      await gateway.onModuleInit();
      await gateway.handleConnection(mockSocket as any);

      // Mock a stale connection by setting old lastActivity
      const connections = gateway.getActiveConnections();
      connections[0].metadata.lastActivity = new Date(Date.now() - 400000); // 6+ minutes ago

      // Manually trigger cleanup (normally done by interval)
      (gateway as any).cleanupStaleConnections();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should apply custom configuration', () => {
      const customConfig: WebSocketGatewayConfig = {
        enabled: true,
        websocket: {
          maxConnections: 500,
          connectionTimeout: 60000,
          heartbeatInterval: 30000,
        },
        auth: { required: true },
      };

      const customGateway = new StreamingWebSocketGateway(
        eventEmitter,
        customConfig,
        bridgeService
      );

      expect((customGateway as any).config.websocket.maxConnections).toBe(500);
      expect((customGateway as any).config.auth.required).toBe(true);
    });

    it('should use default configuration when none provided', () => {
      const defaultGateway = new StreamingWebSocketGateway(
        eventEmitter,
        undefined,
        bridgeService
      );

      expect((defaultGateway as any).config.enabled).toBe(true);
      expect((defaultGateway as any).config.websocket.maxConnections).toBe(
        1000
      );
    });
  });
});
