import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  WebSocketGatewayConfig,
  WebSocketConnection,
  WebSocketMessage,
  SubscribeExecutionPayload,
  SubscribeEventsPayload,
  JoinRoomPayload,
  StreamUpdatePayload,
  ConnectionStatusPayload,
  AuthenticationPayload,
  ErrorPayload,
  WebSocketGatewayEvents,
  WebSocketGatewayStats,
} from '../interfaces/websocket-gateway.interface';
import { WebSocketMessageType } from '../interfaces/websocket-gateway.interface';
import type { StreamUpdate } from '../interfaces/streaming.interface';
import { WebSocketBridgeService } from './websocket-bridge.service';

/**
 * Simple UUID v4 generator (to avoid external dependency)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Comprehensive WebSocket Gateway for real-time streaming communication
 *
 * Features:
 * - Real-time bidirectional communication via Socket.io
 * - Automatic integration with WebSocketBridgeService
 * - Comprehensive message handling with type safety
 * - Authentication and authorization support
 * - Room-based broadcasting capabilities
 * - Connection state management and monitoring
 * - Error handling and recovery mechanisms
 * - Performance monitoring and statistics
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class StreamingWebSocketGateway
  implements
    OnModuleInit,
    OnModuleDestroy,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  private readonly logger = new Logger(StreamingWebSocketGateway.name);

  @WebSocketServer()
  server!: Server;

  // Connection management
  private readonly connections = new Map<string, WebSocketConnection>();
  private readonly socketToConnection = new Map<string, string>();

  // Statistics and monitoring
  private stats: WebSocketGatewayStats = {
    activeConnections: 0,
    totalConnections: 0,
    activeSubscriptions: 0,
    activeRooms: 0,
    messages: { received: 0, sent: 0, failed: 0, rate: 0 },
    performance: { avgProcessingTime: 0, memoryUsage: 0, cpuUsage: 0 },
    errors: { connection: 0, authentication: 0, processing: 0, other: 0 },
  };

  // Cleanup intervals
  private statsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('WEBSOCKET_GATEWAY_CONFIG')
    @Optional()
    private readonly config: WebSocketGatewayConfig = {},
    @Optional() private readonly bridgeService?: WebSocketBridgeService
  ) {
    // Apply default configuration
    this.config = {
      enabled: true,
      websocket: {
        maxConnections: 1000,
        connectionTimeout: 30000,
        heartbeatInterval: 25000,
        compression: true,
        namespace: '/streaming',
      },
      auth: { required: false },
      rateLimit: { max: 100, windowMs: 60000 },
      ...this.config,
    };
  }

  /**
   * Initialize the gateway service
   */
  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.log('WebSocket gateway is disabled');
      return;
    }

    this.logger.log('Initializing StreamingWebSocketGateway');

    this.setupServerConfiguration();
    this.setupBridgeServiceIntegration();
    this.setupStatsCollection();
    this.setupCleanupTasks();

    this.logger.log(
      `WebSocket gateway initialized on namespace: ${
        this.config.websocket?.namespace || '/streaming'
      }`
    );
  }

  /**
   * Cleanup when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying StreamingWebSocketGateway');

    // Clear intervals
    if (this.statsInterval) clearInterval(this.statsInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Disconnect all clients
    this.connections.forEach((connection, connectionId) => {
      this.handleDisconnect(connection.socket);
    });

    // Close server
    if (this.server) {
      this.server.close();
    }

    this.logger.log('WebSocket gateway destroyed');
  }

  /**
   * Handle new client connections
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const connectionId = generateUUID();

      // Check connection limits
      if (
        this.config.websocket?.maxConnections &&
        this.connections.size >= this.config.websocket.maxConnections
      ) {
        socket.emit(
          'error',
          this.createErrorMessage(
            'CONNECTION_LIMIT',
            'Maximum number of connections exceeded',
            'connection'
          )
        );
        socket.disconnect();
        return;
      }

      // Create connection object
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

      // Update statistics
      this.stats.activeConnections++;
      this.stats.totalConnections++;

      // Setup socket event handlers
      this.setupSocketHandlers(socket, connection);

      // Update connection state
      connection.state = 'connected';

      // Send connection status
      socket.emit(
        'connection_status',
        this.createConnectionStatusMessage(connection)
      );

      // Emit gateway event
      this.emitGatewayEvent('gateway.client.connected', connection);

      this.logger.debug(
        `Client connected: ${connectionId} (${socket.handshake.address})`
      );
    } catch (error) {
      this.logger.error('Connection handling error:', error);
      this.stats.errors.connection++;
      socket.disconnect();
    }
  }

  /**
   * Handle client disconnections
   */
  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const connectionId = this.socketToConnection.get(socket.id);
      if (!connectionId) return;

      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Update connection state
      connection.state = 'disconnected';

      // Cleanup subscriptions
      this.cleanupConnectionSubscriptions(connection);

      // Remove connection mappings
      this.connections.delete(connectionId);
      this.socketToConnection.delete(socket.id);

      // Update statistics
      this.stats.activeConnections--;

      // Emit gateway event
      this.emitGatewayEvent('gateway.client.disconnected', connectionId);

      this.logger.debug(`Client disconnected: ${connectionId}`);
    } catch (error) {
      this.logger.error('Disconnection handling error:', error);
      this.stats.errors.connection++;
    }
  }

  /**
   * Handle subscription to execution streams
   */
  @SubscribeMessage('subscribe_execution')
  async handleSubscribeExecution(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SubscribeExecutionPayload
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      // Validate payload
      if (!payload.executionId) {
        throw new WsException('Execution ID is required');
      }

      // Add to subscriptions
      connection.subscriptions.executionIds.add(payload.executionId);
      if (payload.eventTypes) {
        payload.eventTypes.forEach((type) =>
          connection.subscriptions.eventTypes.add(type)
        );
      }

      // Update activity
      connection.metadata.lastActivity = new Date();
      this.stats.activeSubscriptions++;

      // Integrate with bridge service
      if (this.bridgeService) {
        this.bridgeService.linkClientToExecution(
          connection.id,
          payload.executionId
        );

        // Subscribe to specific event types if provided
        if (payload.eventTypes) {
          this.bridgeService.subscribeToEvents(
            connection.id,
            payload.eventTypes
          );
        }
      }

      // Emit gateway event
      this.emitGatewayEvent(
        'gateway.subscription.execution',
        connection.id,
        payload.executionId
      );

      // Send confirmation
      socket.emit('subscription_confirmed', {
        type: 'execution',
        executionId: payload.executionId,
        eventTypes: payload.eventTypes,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Client ${connection.id} subscribed to execution: ${payload.executionId}`
      );
    } catch (error) {
      this.handleMessageError(socket, error, 'subscribe_execution');
    } finally {
      this.updateProcessingTime(Date.now() - startTime);
    }
  }

  /**
   * Handle unsubscription from execution streams
   */
  @SubscribeMessage('unsubscribe_execution')
  async handleUnsubscribeExecution(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { executionId: string }
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      // Remove from subscriptions
      connection.subscriptions.executionIds.delete(payload.executionId);
      connection.metadata.lastActivity = new Date();
      this.stats.activeSubscriptions--;

      // Emit gateway event
      this.emitGatewayEvent(
        'gateway.unsubscription.execution',
        connection.id,
        payload.executionId
      );

      // Send confirmation
      socket.emit('unsubscription_confirmed', {
        type: 'execution',
        executionId: payload.executionId,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Client ${connection.id} unsubscribed from execution: ${payload.executionId}`
      );
    } catch (error) {
      this.handleMessageError(socket, error, 'unsubscribe_execution');
    }
  }

  /**
   * Handle subscription to specific event types
   */
  @SubscribeMessage('subscribe_events')
  async handleSubscribeEvents(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SubscribeEventsPayload
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      // Add event types to subscriptions
      payload.eventTypes.forEach((type) =>
        connection.subscriptions.eventTypes.add(type)
      );

      connection.metadata.lastActivity = new Date();

      // Integrate with bridge service
      if (this.bridgeService) {
        this.bridgeService.subscribeToEvents(connection.id, payload.eventTypes);
      }

      // Send confirmation
      socket.emit('events_subscription_confirmed', {
        eventTypes: payload.eventTypes,
        scope: payload.scope,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Client ${
          connection.id
        } subscribed to events: ${payload.eventTypes.join(', ')}`
      );
    } catch (error) {
      this.handleMessageError(socket, error, 'subscribe_events');
    }
  }

  /**
   * Handle joining rooms
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRoomPayload
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      // Join Socket.io room
      socket.join(payload.roomId);
      connection.subscriptions.rooms.add(payload.roomId);
      connection.metadata.lastActivity = new Date();

      // Integrate with bridge service
      if (this.bridgeService) {
        this.bridgeService.joinRoom(
          connection.id,
          payload.roomId,
          payload.options
        );
      }

      // Update stats
      this.updateRoomStats();

      // Emit gateway event
      this.emitGatewayEvent(
        'gateway.room.joined',
        connection.id,
        payload.roomId
      );

      // Send confirmation
      socket.emit('room_joined', {
        roomId: payload.roomId,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Client ${connection.id} joined room: ${payload.roomId}`
      );
    } catch (error) {
      this.handleMessageError(socket, error, 'join_room');
    }
  }

  /**
   * Handle leaving rooms
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string }
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      // Leave Socket.io room
      socket.leave(payload.roomId);
      connection.subscriptions.rooms.delete(payload.roomId);
      connection.metadata.lastActivity = new Date();

      // Integrate with bridge service
      if (this.bridgeService) {
        this.bridgeService.leaveRoom(connection.id, payload.roomId);
      }

      // Update stats
      this.updateRoomStats();

      // Emit gateway event
      this.emitGatewayEvent('gateway.room.left', connection.id, payload.roomId);

      // Send confirmation
      socket.emit('room_left', {
        roomId: payload.roomId,
        timestamp: new Date(),
      });

      this.logger.debug(`Client ${connection.id} left room: ${payload.roomId}`);
    } catch (error) {
      this.handleMessageError(socket, error, 'leave_room');
    }
  }

  /**
   * Handle authentication
   */
  @SubscribeMessage('authentication')
  async handleAuthentication(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: AuthenticationPayload
  ): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      // Perform authentication (simplified - extend based on requirements)
      const authenticated = await this.authenticateConnection(
        connection,
        payload
      );

      if (authenticated) {
        connection.metadata.userId = payload.metadata?.client;
        connection.metadata.lastActivity = new Date();

        socket.emit('authentication_success', {
          connectionId: connection.id,
          timestamp: new Date(),
        });

        this.logger.debug(`Client ${connection.id} authenticated successfully`);
      } else {
        throw new WsException('Authentication failed');
      }
    } catch (error) {
      this.stats.errors.authentication++;
      this.handleMessageError(socket, error, 'authentication');
    }
  }

  /**
   * Handle ping/pong for heartbeat
   */
  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() socket: Socket): Promise<void> {
    const connection = this.getConnection(socket);
    if (connection) {
      connection.metadata.lastActivity = new Date();
    }
    socket.emit('pong', { timestamp: new Date() });
  }

  /**
   * Handle status requests
   */
  @SubscribeMessage('get_status')
  async handleGetStatus(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const connection = this.getConnection(socket);
      if (!connection) throw new WsException('Connection not found');

      const status = this.createConnectionStatusMessage(connection);
      socket.emit('status_response', status);
    } catch (error) {
      this.handleMessageError(socket, error, 'get_status');
    }
  }

  /**
   * Broadcast stream update to all relevant connections
   */
  broadcastStreamUpdate(update: StreamUpdate): void {
    const executionId = update.metadata?.executionId;
    if (!executionId) return;

    const message: WebSocketMessage<StreamUpdatePayload> = {
      type: WebSocketMessageType.STREAM_UPDATE,
      id: generateUUID(),
      data: { update },
      metadata: {
        timestamp: new Date(),
        source: 'streaming_gateway',
        priority: 'medium',
      },
    };

    // Find connections subscribed to this execution
    const targetConnections = Array.from(this.connections.values()).filter(
      (connection) =>
        connection.subscriptions.executionIds.has(executionId) ||
        connection.subscriptions.eventTypes.has(update.type) ||
        connection.subscriptions.eventTypes.size === 0 // Send to clients with no specific event type filters
    );

    // Broadcast to target connections
    targetConnections.forEach((connection) => {
      try {
        connection.socket.emit('stream_update', message);
        connection.metadata.lastActivity = new Date();
        this.stats.messages.sent++;
      } catch (error) {
        this.logger.error(`Failed to send update to ${connection.id}:`, error);
        this.stats.messages.failed++;
      }
    });

    if (targetConnections.length > 0) {
      this.logger.debug(
        `Broadcasted stream update to ${targetConnections.length} connections for execution: ${executionId}`
      );
    }
  }

  /**
   * Broadcast to specific room
   */
  broadcastToRoom(roomId: string, update: StreamUpdate): void {
    const message: WebSocketMessage<StreamUpdatePayload> = {
      type: WebSocketMessageType.STREAM_UPDATE,
      id: generateUUID(),
      data: { update },
      metadata: {
        timestamp: new Date(),
        source: 'streaming_gateway',
        priority: 'medium',
      },
    };

    this.server.to(roomId).emit('stream_update', message);
    this.stats.messages.sent++;

    this.logger.debug(`Broadcasted stream update to room: ${roomId}`);
  }

  /**
   * Get gateway statistics
   */
  getStats(): WebSocketGatewayStats {
    return { ...this.stats };
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnectionById(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  // Private helper methods

  private setupServerConfiguration(): void {
    if (this.server) {
      // Configure server options based on config
      this.server.engine.generateId = () => generateUUID();

      // Setup middleware
      this.server.use((socket, next) => {
        // Rate limiting middleware
        this.applyRateLimit(socket, next);
      });
    }
  }

  private setupBridgeServiceIntegration(): void {
    if (!this.bridgeService) {
      this.logger.warn(
        'WebSocketBridgeService not available - some features will be limited'
      );
      return;
    }

    // Register this gateway instance with the bridge service
    if (typeof this.bridgeService.registerGateway === 'function') {
      this.bridgeService.registerGateway(this);
    }

    // Register the gateway as a client with the bridge service
    const gatewaySubject =
      this.bridgeService.registerClient('streaming_gateway');

    // Subscribe to bridge service updates
    gatewaySubject.subscribe({
      next: (update) => this.broadcastStreamUpdate(update),
      error: (error) =>
        this.logger.error('Bridge service integration error:', error),
    });

    this.logger.debug('Bridge service integration configured');
  }

  private setupSocketHandlers(
    socket: Socket,
    connection: WebSocketConnection
  ): void {
    // Setup error handler
    socket.on('error', (error) => {
      this.logger.error(`Socket error for ${connection.id}:`, error);
      this.stats.errors.other++;
    });

    // Setup heartbeat
    if (this.config.websocket?.heartbeatInterval) {
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', { timestamp: new Date() });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, this.config.websocket.heartbeatInterval);
    }
  }

  private setupStatsCollection(): void {
    // Update statistics every 30 seconds
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 30000);
  }

  private setupCleanupTasks(): void {
    // Cleanup stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 300000);
  }

  private getConnection(socket: Socket): WebSocketConnection | undefined {
    const connectionId = this.socketToConnection.get(socket.id);
    return connectionId ? this.connections.get(connectionId) : undefined;
  }

  private createConnectionStatusMessage(
    connection: WebSocketConnection
  ): ConnectionStatusPayload {
    return {
      status: 'connected',
      connection: {
        id: connection.id,
        serverTime: new Date(),
        subscriptionsCount:
          connection.subscriptions.executionIds.size +
          connection.subscriptions.eventTypes.size +
          connection.subscriptions.rooms.size,
        uptime: Date.now() - connection.metadata.connectedAt.getTime(),
      },
    };
  }

  private createErrorMessage(
    code: string,
    message: string,
    category: ErrorPayload['category'],
    details?: any
  ): WebSocketMessage<ErrorPayload> {
    return {
      type: WebSocketMessageType.ERROR,
      id: generateUUID(),
      data: {
        code,
        message,
        category,
        details,
      },
      metadata: {
        timestamp: new Date(),
        source: 'streaming_gateway',
      },
    };
  }

  private async authenticateConnection(
    connection: WebSocketConnection,
    payload: AuthenticationPayload
  ): Promise<boolean> {
    // Simplified authentication - extend based on requirements
    if (!this.config.auth?.required) {
      return true;
    }

    // Custom authentication handler
    if (this.config.auth?.handler) {
      return this.config.auth.handler(connection.socket, payload.token || '');
    }

    // Basic token validation
    if (payload.token && this.config.auth?.jwtSecret) {
      try {
        // JWT validation logic would go here
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  private applyRateLimit(socket: Socket, next: (error?: any) => void): void {
    if (!this.config.rateLimit) {
      return next();
    }

    // Simplified rate limiting - implement proper rate limiting logic
    const connection = this.getConnection(socket);
    if (connection && this.config.rateLimit.skip?.(socket)) {
      return next();
    }

    // Rate limiting logic would go here
    next();
  }

  private cleanupConnectionSubscriptions(
    connection: WebSocketConnection
  ): void {
    // Remove subscriptions from bridge service
    if (this.bridgeService) {
      connection.subscriptions.executionIds.forEach((executionId) => {
        // Bridge service cleanup handled automatically
      });

      connection.subscriptions.rooms.forEach((roomId) => {
        this.bridgeService!.leaveRoom(connection.id, roomId);
      });
    }
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    const timeout = this.config.websocket?.connectionTimeout || 300000; // 5 minutes

    const staleConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      const lastActivity = connection.metadata.lastActivity.getTime();
      if (now - lastActivity > timeout) {
        staleConnections.push(connectionId);
      }
    });

    staleConnections.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.socket.disconnect();
        this.logger.debug(`Cleaned up stale connection: ${connectionId}`);
      }
    });
  }

  private updateStats(): void {
    // Update performance metrics
    this.stats.performance.memoryUsage = process.memoryUsage().heapUsed;

    // Update message rate (simplified)
    this.stats.messages.rate =
      this.stats.messages.sent /
      Math.max(
        1,
        (Date.now() - (this.stats as any).startTime || Date.now()) / 1000
      );

    // Update room count
    this.updateRoomStats();
  }

  private updateRoomStats(): void {
    // Count unique rooms across all connections
    const uniqueRooms = new Set<string>();
    this.connections.forEach((connection) => {
      connection.subscriptions.rooms.forEach((room) => uniqueRooms.add(room));
    });
    this.stats.activeRooms = uniqueRooms.size;
  }

  private updateProcessingTime(duration: number): void {
    // Update average processing time (simplified moving average)
    this.stats.performance.avgProcessingTime =
      this.stats.performance.avgProcessingTime * 0.9 + duration * 0.1;
  }

  private handleMessageError(
    socket: Socket,
    error: any,
    messageType: string
  ): void {
    this.logger.error(`Message handling error (${messageType}):`, error);
    this.stats.errors.processing++;
    this.stats.messages.received++;

    const errorMessage = this.createErrorMessage(
      'MESSAGE_PROCESSING_ERROR',
      error.message || 'An error occurred while processing your message',
      'internal',
      { messageType, originalError: error.message }
    );

    socket.emit('error', errorMessage);
  }

  private emitGatewayEvent(
    event: keyof WebSocketGatewayEvents,
    ...args: any[]
  ): void {
    try {
      this.eventEmitter.emit(event, ...args);
    } catch (error) {
      this.logger.error(`Gateway event emission error (${event}):`, error);
    }
  }
}
