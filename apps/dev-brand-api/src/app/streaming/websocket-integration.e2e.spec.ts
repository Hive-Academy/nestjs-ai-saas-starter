import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { io, type Socket } from 'socket.io-client';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import {
  StreamingServiceAdapter,
  StreamingWebSocketGateway,
} from '@hive-academy/langgraph-streaming';

describe('WebSocket Streaming Integration E2E', () => {
  let app: INestApplication;
  let client: Socket;
  let streamingAdapter: StreamingServiceAdapter;
  let gateway: StreamingWebSocketGateway;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        // Configure streaming module with WebSocket enabled
        StreamingModule.forRoot({
          websocket: {
            enabled: true,
            port: 8081, // Use different port for testing
            cors: {
              origin: '*',
              credentials: true,
            },
          },
          gateway: {
            enabled: true,
            websocket: {
              maxConnections: 100,
              heartbeatInterval: 5000,
            },
          },
          defaultBufferSize: 100,
        }),

        // Configure workflow engine with streaming
        WorkflowEngineModule.forRoot({
          execution: {
            streamingEnabled: true,
          },
        }),

        // Configure multi-agent with streaming
        MultiAgentModule.forRoot({
          streaming: {
            enabled: true,
            realTimeUpdates: true,
          },
        }),
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                WEBSOCKET_PORT: 8081,
                STREAMING_ENABLED: true,
              };
              return config[key];
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Get service instances - use try/catch to handle missing services gracefully
    try {
      streamingAdapter = app.get(StreamingServiceAdapter);
      gateway = app.get(StreamingWebSocketGateway);
    } catch (error) {
      console.warn(
        'Warning: Some streaming services not available in test context:',
        error.message
      );
      // Create mock services for testing
      streamingAdapter = {
        streamToken: jest.fn(),
        streamProgress: jest.fn(),
        streamEvent: jest.fn(),
        broadcastToExecution: jest.fn(),
        sendToClient: jest.fn(),
      } as any;
      gateway = {
        handleConnection: jest.fn(),
        handleDisconnect: jest.fn(),
      } as any;
    }

    await app.listen(3001);

    // Wait a moment for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    // Create WebSocket client
    client = io('http://localhost:8081', {
      transports: ['websocket'],
      timeout: 5000,
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (error) => reject(error));
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  afterEach(() => {
    if (client && client.connected) {
      client.disconnect();
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Core Requirement: WebSocket Real-time Updates', () => {
    it('should establish WebSocket connection successfully', () => {
      expect(client.connected).toBe(true);
      expect(client.id).toBeDefined();
    });

    it('should receive token streaming updates in real-time', async () => {
      const executionId = 'test-token-execution';
      const nodeId = 'test-token-node';
      const testTokens = ['Hello', ' world', ' from', ' streaming'];

      const receivedTokens: string[] = [];

      // Listen for token updates
      client.on('stream-update', (data) => {
        if (data.type === 'TOKEN') {
          receivedTokens.push(data.data.content);
        }
      });

      // Register client for this execution
      client.emit('join-execution', { executionId });

      // Wait for join confirmation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stream tokens via the adapter
      for (let i = 0; i < testTokens.length; i++) {
        const token = testTokens[i];
        streamingAdapter.streamToken(executionId, nodeId, token, {
          index: i,
          totalTokens: testTokens.length,
        });

        // Small delay between tokens to simulate real streaming
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Wait for all tokens to be received
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify all tokens were received in real-time
      expect(receivedTokens).toEqual(testTokens);
    });

    it('should receive progress updates via WebSocket', async () => {
      const executionId = 'test-progress-execution';
      const progressUpdates = [25, 50, 75, 100];

      const receivedProgress: number[] = [];

      // Listen for progress updates
      client.on('stream-update', (data) => {
        if (data.type === 'PROGRESS') {
          receivedProgress.push(data.data.progress);
        }
      });

      // Register for execution
      client.emit('join-execution', { executionId });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send progress updates
      for (const progress of progressUpdates) {
        streamingAdapter.streamProgress(executionId, 'workflow', {
          progress,
          message: `Processing... ${progress}%`,
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Wait for all updates
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedProgress).toEqual(progressUpdates);
    });

    it('should handle event streaming for multi-agent coordination', async () => {
      const executionId = 'test-agent-coordination';
      const agentEvents = [
        { type: 'agent_start', data: { agentId: 'agent1', task: 'research' } },
        {
          type: 'agent_message',
          data: { agentId: 'agent1', message: 'Starting research' },
        },
        { type: 'agent_handoff', data: { from: 'agent1', to: 'agent2' } },
        {
          type: 'agent_complete',
          data: { agentId: 'agent2', result: 'task completed' },
        },
      ];

      const receivedEvents: any[] = [];

      // Listen for agent coordination events
      client.on('stream-update', (data) => {
        if (data.type === 'EVENTS') {
          receivedEvents.push(data.data);
        }
      });

      // Register for execution
      client.emit('join-execution', { executionId });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stream coordination events
      for (const event of agentEvents) {
        streamingAdapter.streamEvent(executionId, 'coordinator', {
          type: event.type,
          data: event.data,
          metadata: { timestamp: new Date().toISOString() },
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Wait for all events
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedEvents).toHaveLength(agentEvents.length);
      expect(receivedEvents[0]).toMatchObject(agentEvents[0].data);
      expect(receivedEvents[3]).toMatchObject(agentEvents[3].data);
    });
  });

  describe('WebSocket Connection Management', () => {
    it('should handle multiple clients connected to same execution', async () => {
      const executionId = 'test-multi-client-execution';

      // Create second client
      const client2 = io('http://localhost:8081', {
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        client2.on('connect', () => resolve());
        client2.on('connect_error', reject);
        setTimeout(() => reject(new Error('Client 2 timeout')), 3000);
      });

      const client1Messages: any[] = [];
      const client2Messages: any[] = [];

      // Setup listeners
      client.on('stream-update', (data) => client1Messages.push(data));
      client2.on('stream-update', (data) => client2Messages.push(data));

      // Both clients join the same execution
      client.emit('join-execution', { executionId });
      client2.emit('join-execution', { executionId });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send a broadcast message
      await streamingAdapter.broadcastToExecution(executionId, {
        type: 'broadcast',
        message: 'Message to all clients',
        timestamp: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Both clients should receive the message
      expect(client1Messages).toHaveLength(1);
      expect(client2Messages).toHaveLength(1);
      expect(client1Messages[0].data.message).toBe('Message to all clients');
      expect(client2Messages[0].data.message).toBe('Message to all clients');

      client2.disconnect();
    });

    it('should handle client disconnection gracefully', async () => {
      const executionId = 'test-disconnect-execution';

      // Join execution
      client.emit('join-execution', { executionId });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Disconnect client
      client.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to send message to disconnected client
      expect(() => {
        streamingAdapter.broadcastToExecution(executionId, {
          message: 'Message after disconnect',
        });
      }).not.toThrow();
    });

    it('should support direct client messaging', async () => {
      const testMessage = {
        type: 'direct',
        data: { notification: 'Direct message to client' },
        timestamp: new Date().toISOString(),
      };

      const receivedMessages: any[] = [];
      client.on('stream-update', (data) => receivedMessages.push(data));

      // Send direct message to specific client
      await streamingAdapter.sendToClient(client.id, testMessage);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].data.notification).toBe(
        'Direct message to client'
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed messages gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Send malformed join message
      client.emit('join-execution', { invalid: 'data' });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should not crash the server
      expect(client.connected).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should continue streaming even if some clients have errors', async () => {
      const executionId = 'test-error-resilience';

      // Create a client that will cause errors
      const errorClient = io('http://localhost:8081', {
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        errorClient.on('connect', () => resolve());
      });

      // Setup listeners
      const normalMessages: any[] = [];
      client.on('stream-update', (data) => normalMessages.push(data));

      // Simulate error in one client by disconnecting it immediately after joining
      errorClient.emit('join-execution', { executionId });
      errorClient.disconnect();

      // Normal client joins
      client.emit('join-execution', { executionId });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send broadcast - should reach normal client despite error client
      await streamingAdapter.broadcastToExecution(executionId, {
        message: 'Resilient streaming test',
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(normalMessages).toHaveLength(1);
      expect(normalMessages[0].data.message).toBe('Resilient streaming test');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle rapid token streaming without losing messages', async () => {
      const executionId = 'test-rapid-streaming';
      const nodeId = 'rapid-node';
      const tokenCount = 50;

      const receivedTokens: any[] = [];
      client.on('stream-update', (data) => {
        if (data.type === 'TOKEN') {
          receivedTokens.push(data);
        }
      });

      client.emit('join-execution', { executionId });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stream many tokens rapidly
      for (let i = 0; i < tokenCount; i++) {
        streamingAdapter.streamToken(executionId, nodeId, `token-${i}`, {
          index: i,
          totalTokens: tokenCount,
        });
      }

      // Wait for all tokens
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should receive all tokens
      expect(receivedTokens).toHaveLength(tokenCount);

      // Check ordering is preserved
      for (let i = 0; i < tokenCount; i++) {
        expect(receivedTokens[i].data.content).toBe(`token-${i}`);
        expect(receivedTokens[i].data.index).toBe(i);
      }
    });

    it('should handle concurrent executions without cross-contamination', async () => {
      const execution1 = 'concurrent-exec-1';
      const execution2 = 'concurrent-exec-2';

      const exec1Messages: any[] = [];
      const exec2Messages: any[] = [];

      // Create second client for second execution
      const client2 = io('http://localhost:8081', {
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', () => resolve());
      });

      // Setup separate listeners
      client.on('stream-update', (data) => exec1Messages.push(data));
      client2.on('stream-update', (data) => exec2Messages.push(data));

      // Join different executions
      client.emit('join-execution', { executionId: execution1 });
      client2.emit('join-execution', { executionId: execution2 });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send messages to each execution
      await streamingAdapter.broadcastToExecution(execution1, {
        message: 'Message for execution 1',
      });

      await streamingAdapter.broadcastToExecution(execution2, {
        message: 'Message for execution 2',
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Each client should only receive their execution's messages
      expect(exec1Messages).toHaveLength(1);
      expect(exec2Messages).toHaveLength(1);
      expect(exec1Messages[0].data.message).toBe('Message for execution 1');
      expect(exec2Messages[0].data.message).toBe('Message for execution 2');

      client2.disconnect();
    });
  });
});
