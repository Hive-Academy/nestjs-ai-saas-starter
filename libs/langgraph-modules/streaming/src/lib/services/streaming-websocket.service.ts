import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { StreamUpdate } from '../interfaces/streaming.interface';
import { IInitializableService } from '../interfaces/streaming-manager.interface';
import { WebSocketBridgeService } from './websocket-bridge.service';

interface WebSocketConnection {
  id: string;
  socket: Socket;
  metadata: {
    ip: string;
    userAgent?: string;
    connectedAt: Date;
    lastActivity: Date;
    userId?: string;
  };
  subscriptions: {
    executionIds: Set<string>;
    eventTypes: Set<string>;
    rooms: Set<string>;
  };
  state: 'connecting' | 'connected' | 'disconnected';
}

interface WebSocketConfig {
  enabled?: boolean;
  websocket?: {
    port?: number;
    namespace?: string;
  };
  cors?: {
    origin?: boolean | string | string[];
    credentials?: boolean;
  };
}

/**
 * Clean WebSocket Service for real-time streaming communication
 *
 * Features:
 * - Manual Socket.io server creation and lifecycle control (NO @WebSocketGateway decorator)
 * - Real-time bidirectional communication via Socket.io
 * - Integration with WebSocketBridgeService
 * - Connection state management and monitoring
 * - Broadcasting capabilities for streaming updates
 * - User interruption support for interactive workflows
 */
@Injectable()
export class StreamingWebSocketService implements IInitializableService {
  private readonly logger = new Logger(StreamingWebSocketService.name);

  // Manual Socket.io server management
  private server?: Server;
  private namespace?: any; // Socket.io Namespace instance
  private httpServer?: ReturnType<typeof createServer>;
  public isStarted = false;

  // Connection management
  private readonly connections = new Map<string, WebSocketConnection>();
  private readonly socketToConnection = new Map<string, string>();

  // Statistics
  private stats = {
    activeConnections: 0,
    totalConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('WEBSOCKET_GATEWAY_CONFIG')
    @Optional()
    private readonly config: WebSocketConfig = {},
    @Optional() private readonly bridgeService?: WebSocketBridgeService
  ) {
    // Apply defaults
    this.config = {
      enabled: true,
      websocket: { port: 8080, namespace: '/streaming' },
      cors: { origin: true, credentials: true },
      ...this.config,
    };
  }

  /**
   * REFACTORED: Manual start method - creates Socket.io server manually
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('StreamingWebSocketService already started');
      return;
    }

    if (!this.config.enabled) {
      this.logger.log('WebSocket service is disabled - skipping start');
      return;
    }

    try {
      this.logger.log('🚀 Starting StreamingWebSocketService...');

      // Create HTTP server for Socket.io
      this.httpServer = createServer();

      // Create Socket.io server manually
      this.server = new Server(this.httpServer, {
        cors: this.config.cors || { origin: true, credentials: true },
        transports: ['websocket', 'polling'],
        path: '/socket.io/',
      });

      // Setup namespace (defaults to '/streaming')
      const namespacePath = this.config.websocket?.namespace || '/streaming';
      this.namespace = this.server.of(namespacePath);

      this.logger.log(`Setting up Socket.io namespace: ${namespacePath}`);

      // Setup all Socket.io event handlers on the namespace
      this.setupSocketIOHandlers(this.namespace);

      // Setup bridge service integration
      this.setupBridgeServiceIntegration();

      // Start listening on configured port
      const port = this.config.websocket?.port || 8080;
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(port, (error?: Error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      this.isStarted = true;

      this.logger.log(
        `✅ WebSocket service started successfully on port: ${port}`
      );
    } catch (error) {
      this.logger.error('❌ Failed to start StreamingWebSocketService:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * REFACTORED: Manual stop method - closes Socket.io server manually
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn('StreamingWebSocketService not started');
      return;
    }

    try {
      this.logger.log('🛑 Stopping StreamingWebSocketService...');
      await this.cleanup();
      this.isStarted = false;
      this.logger.log('✅ StreamingWebSocketService stopped successfully');
    } catch (error) {
      this.logger.error('❌ Error stopping StreamingWebSocketService:', error);
      throw error;
    }
  }

  /**
   * Setup Socket.io event handlers manually
   */
  private setupSocketIOHandlers(namespace: any): void {
    if (!namespace) return;

    namespace.on('connection', (socket: Socket) => {
      this.handleConnection(socket);

      // Setup message handlers for this socket
      socket.on('subscribe_execution', (payload) =>
        this.handleSubscribeExecution(socket, payload)
      );
      socket.on('ping', () => socket.emit('pong', { timestamp: new Date() }));
      socket.on('get_status', () => this.handleGetStatus(socket));

      // User interruption handlers
      socket.on('interrupt_agent', (payload) =>
        this.handleInterruptAgent(socket, payload)
      );
      socket.on('inject_input', (payload) =>
        this.handleInjectInput(socket, payload)
      );

      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * Handle new client connections
   */
  private async handleConnection(socket: Socket): Promise<void> {
    try {
      const connectionId = this.generateUUID();

      const connection: WebSocketConnection = {
        id: connectionId,
        socket,
        metadata: {
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
          connectedAt: new Date(),
          lastActivity: new Date(),
        },
        subscriptions: {
          executionIds: new Set(),
          eventTypes: new Set(),
          rooms: new Set(),
        },
        state: 'connecting',
      };

      // Store connection mapping
      this.connections.set(connectionId, connection);
      this.socketToConnection.set(socket.id, connectionId);

      // Register with bridge service
      if (this.bridgeService) {
        this.bridgeService.registerClient(connectionId, {
          metadata: connection.metadata,
        });
      }

      // Update statistics
      this.stats.activeConnections++;
      this.stats.totalConnections++;

      // Update connection state
      connection.state = 'connected';

      // Send connection status
      socket.emit('connection_status', {
        connectionId,
        status: 'connected',
        serverTime: new Date(),
      });

      this.logger.debug(
        `Client connected: ${connectionId} (${socket.handshake.address})`
      );
    } catch (error) {
      this.logger.error('Connection handling error:', error);
      socket.disconnect();
    }
  }

  /**
   * Handle client disconnections
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const connectionId = this.socketToConnection.get(socket.id);
      if (!connectionId) return;

      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Update connection state
      connection.state = 'disconnected';

      // Unregister from bridge service
      if (this.bridgeService) {
        this.bridgeService.unregisterClient(connectionId);
      }

      // Remove connection mappings
      this.connections.delete(connectionId);
      this.socketToConnection.delete(socket.id);

      // Update statistics
      this.stats.activeConnections--;

      this.logger.debug(`Client disconnected: ${connectionId}`);
    } catch (error) {
      this.logger.error('Disconnection handling error:', error);
    }
  }

  /**
   * Handle subscription to execution streams
   */
  private async handleSubscribeExecution(
    socket: Socket,
    payload: any
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new Error('Connection not found');

      if (!payload.executionId) {
        throw new Error('Execution ID is required');
      }

      // Add to subscriptions
      connection.subscriptions.executionIds.add(payload.executionId);
      connection.metadata.lastActivity = new Date();

      // Link with bridge service
      if (this.bridgeService) {
        this.bridgeService.linkClientToExecution(
          connection.id,
          payload.executionId
        );
      }

      // Send confirmation
      socket.emit('subscription_confirmed', {
        type: 'execution',
        executionId: payload.executionId,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Client ${connection.id} subscribed to execution: ${payload.executionId}`
      );
    } catch (error) {
      this.logger.error('Subscribe execution error:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle status requests
   */
  private handleGetStatus(socket: Socket): void {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new Error('Connection not found');

      socket.emit('status_response', {
        connectionId: connection.id,
        status: 'connected',
        serverTime: new Date(),
        subscriptions: connection.subscriptions.executionIds.size,
        uptime: Date.now() - connection.metadata.connectedAt.getTime(),
      });
    } catch (error) {
      this.logger.error('Get status error:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle user interruption requests
   */
  private async handleInterruptAgent(
    socket: Socket,
    payload: any
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new Error('Connection not found');

      // Emit interruption request event
      this.eventEmitter.emit('user.interruption.requested', {
        executionId: payload.executionId,
        nodeId: payload.nodeId || 'current',
        type: 'question',
        message: payload.question,
        userId: payload.userId || connection.id,
        socketId: socket.id,
        connectionId: connection.id,
        metadata: payload.metadata,
      });

      // Send acknowledgment
      socket.emit('interrupt_agent_ack', {
        success: true,
        executionId: payload.executionId,
        message: 'Interruption request sent to agent',
        timestamp: new Date(),
      });

      this.stats.messagesReceived++;
      this.stats.messagesSent++;
    } catch (error) {
      this.logger.error('Interrupt agent error:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle user input injection
   */
  private async handleInjectInput(socket: Socket, payload: any): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new Error('Connection not found');

      // Emit input injection event
      this.eventEmitter.emit('user.input.injected', {
        executionId: payload.executionId,
        input: payload.input,
        continueExecution: payload.continueExecution ?? true,
        userId: connection.id,
        socketId: socket.id,
        connectionId: connection.id,
        metadata: payload.metadata,
      });

      // Send acknowledgment
      socket.emit('inject_input_ack', {
        success: true,
        executionId: payload.executionId,
        message: 'User input injected successfully',
        timestamp: new Date(),
      });

      this.stats.messagesReceived++;
      this.stats.messagesSent++;
    } catch (error) {
      this.logger.error('Inject input error:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Broadcast stream update to all relevant connections
   */
  broadcastStreamUpdate(update: StreamUpdate): void {
    const executionId = update.metadata?.executionId;
    if (!executionId) return;

    // Find connections subscribed to this execution
    const targetConnections = Array.from(this.connections.values()).filter(
      (connection) => connection.subscriptions.executionIds.has(executionId)
    );

    // Broadcast to target connections
    targetConnections.forEach((connection) => {
      try {
        connection.socket.emit('stream_update', {
          type: 'stream_update',
          data: { update },
          timestamp: new Date(),
        });
        connection.metadata.lastActivity = new Date();
        this.stats.messagesSent++;
      } catch (error) {
        this.logger.error(`Failed to send update to ${connection.id}:`, error);
      }
    });

    if (targetConnections.length > 0) {
      this.logger.debug(
        `Broadcasted stream update to ${targetConnections.length} connections for execution: ${executionId}`
      );
    }
  }

  /**
   * Emit token update to all connected clients
   */
  emitTokenUpdate(token: string, executionId?: string, nodeId?: string): void {
    const message = {
      type: 'token_update',
      data: { token, executionId, nodeId },
      timestamp: new Date(),
    };

    // Emit to all connected clients via namespace
    if (this.namespace) {
      this.namespace.emit('token_update', message);
      this.stats.messagesSent += this.connections.size;
    }

    this.logger.debug(
      `Emitted token update to ${
        this.connections.size
      } connections: ${token.substring(0, 50)}...`
    );
  }

  /**
   * Get service statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  // Private helper methods

  private getConnection(socket: Socket): WebSocketConnection | undefined {
    const connectionId = this.socketToConnection.get(socket.id);
    return connectionId ? this.connections.get(connectionId) : undefined;
  }

  private setupBridgeServiceIntegration(): void {
    if (!this.bridgeService) {
      this.logger.warn(
        'WebSocketBridgeService not available - some features will be limited'
      );
      return;
    }

    // Register this service instance with the bridge service
    if (typeof this.bridgeService.registerGateway === 'function') {
      this.bridgeService.registerGateway(this);
    }

    this.logger.debug('Bridge service integration configured');
  }

  private async cleanup(): Promise<void> {
    // Disconnect all clients
    this.connections.forEach((connection) => {
      connection.socket.disconnect();
    });
    this.connections.clear();
    this.socketToConnection.clear();

    // Clear namespace reference
    if (this.namespace) {
      this.namespace.removeAllListeners();
      this.namespace = undefined;
    }

    // Close Socket.io server
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = undefined;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
