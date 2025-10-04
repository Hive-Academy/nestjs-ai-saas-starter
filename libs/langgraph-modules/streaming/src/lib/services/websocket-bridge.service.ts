import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Subject, Subscription, filter, merge } from 'rxjs';
import { parseNodeId } from '@hive-academy/langgraph-core';
import {
  StreamUpdate,
  StreamEventType,
} from '../interfaces/streaming.interface';
import { TokenStreamingService } from './token-streaming.service';
import { IInitializableService } from '../interfaces/streaming-manager.interface';
// WorkflowStreamService moved to workflow-engine module to avoid circular dependency

interface WebSocketClient {
  id: string;
  executionId?: string;
  subscriptions: Set<StreamEventType>;
  subject: Subject<StreamUpdate>;
  subscription?: Subscription;
  rooms: Set<string>;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

interface StreamingRoom {
  id: string;
  clients: Set<string>;
  config: {
    maxClients?: number;
    requireAuth?: boolean;
    allowedEventTypes?: StreamEventType[];
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Service for bridging workflow streams to WebSocket connections
 * Enhanced with room-based streaming, token integration, and real-time coordination
 *
 * REFACTORED: Now implements IInitializableService for manual start/stop control
 */
@Injectable()
export class WebSocketBridgeService implements IInitializableService {
  private readonly logger = new Logger(WebSocketBridgeService.name);
  private readonly clients = new Map<string, WebSocketClient>();
  private readonly executionToClients = new Map<string, Set<string>>();
  private readonly rooms = new Map<string, StreamingRoom>();
  private readonly activeSubscriptions = new Set<Subscription>();
  private cleanupInterval?: NodeJS.Timeout;
  private gatewayInstance?: any; // StreamingWebSocketGateway instance

  // Hierarchical sequence counters scoped per execution + node ID
  private readonly sequenceCounters = new Map<string, number>();

  // Service state
  public isStarted = false;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    private readonly tokenStreamingService?: TokenStreamingService // Direct injection - optional for flexibility
  ) {}

  /**
   * Get and increment sequence number for a specific execution + node
   * Uses hierarchical counter key: `${executionId}:${nodeId}`
   */
  private getNodeSequence(executionId: string, nodeId: string): number {
    const counterKey = `${executionId}:${nodeId}`;

    if (!this.sequenceCounters.has(counterKey)) {
      this.sequenceCounters.set(counterKey, 0);
    }

    const currentSequence = this.sequenceCounters.get(counterKey)!;
    this.sequenceCounters.set(counterKey, currentSequence + 1);

    return currentSequence;
  }

  /**
   * Parse node ID components for metadata enrichment
   * Returns domain/phase/activity/detail if node ID is canonical, undefined otherwise
   */
  private parseNodeIdComponents(nodeId: string): {
    domain?: string;
    phase?: string;
    activity?: string;
    detail?: string;
  } {
    try {
      const parts = parseNodeId(nodeId);
      return {
        domain: parts.domain,
        phase: parts.phase,
        activity: parts.activity,
        detail: parts.detail,
      };
    } catch {
      // Non-canonical node ID - return empty object
      return {};
    }
  }

  /**
   * REFACTORED: Remove legacy OnModuleInit pattern
   * All initialization now happens in start() method
   */

  /**
   * REFACTORED: Manual start method - called by AppStreamingManager
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('WebSocketBridgeService already started');
      return;
    }

    try {
      this.logger.log('🚀 Starting WebSocketBridgeService...');

      // Setup all integrations
      this.setupTokenStreamIntegration();
      this.setupWorkflowStreamIntegration();
      this.setupCleanupInterval();

      this.isStarted = true;
      this.logger.log('✅ WebSocketBridgeService started successfully');
    } catch (error) {
      this.logger.error('❌ Failed to start WebSocketBridgeService:', error);
      throw error;
    }
  }

  /**
   * REFACTORED: Manual stop method - called by AppStreamingManager
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn('WebSocketBridgeService not started');
      return;
    }

    try {
      this.logger.log('🛑 Stopping WebSocketBridgeService...');
      this.cleanup();
      this.isStarted = false;
      this.logger.log('✅ WebSocketBridgeService stopped successfully');
    } catch (error) {
      this.logger.error('❌ Error stopping WebSocketBridgeService:', error);
      throw error;
    }
  }

  /**
   * Register a WebSocket client with enhanced configuration
   */
  registerClient(
    clientId: string,
    options: {
      executionId?: string;
      rooms?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Subject<StreamUpdate> {
    if (this.clients.has(clientId)) {
      this.logger.warn(`Client ${clientId} already registered`);
      return this.clients.get(clientId)!.subject;
    }

    const client: WebSocketClient = {
      id: clientId,
      executionId: options.executionId,
      subscriptions: new Set(),
      subject: new Subject<StreamUpdate>(),
      rooms: new Set(options.rooms || []),
      lastActivity: new Date(),
      metadata: options.metadata || {},
    };

    this.clients.set(clientId, client);

    if (options.executionId) {
      this.linkClientToExecution(clientId, options.executionId);
    }

    // Join specified rooms
    options.rooms?.forEach((roomId) => {
      this.joinRoom(clientId, roomId);
    });

    // Setup client stream integration
    this.setupClientStreamIntegration(client);

    this.logger.log(
      `Registered client ${clientId} with rooms: [${Array.from(
        client.rooms
      ).join(', ')}]`
    );
    return client.subject;
  }

  /**
   * Unregister a WebSocket client with enhanced cleanup
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Clean up subscriptions
    if (client.subscription) {
      client.subscription.unsubscribe();
      this.activeSubscriptions.delete(client.subscription);
    }
    client.subject.complete();

    // Remove from execution mapping
    if (client.executionId) {
      const clients = this.executionToClients.get(client.executionId);
      if (clients) {
        clients.delete(clientId);
        if (clients.size === 0) {
          this.executionToClients.delete(client.executionId);
        }
      }
    }

    // Leave all rooms
    client.rooms.forEach((roomId) => {
      this.leaveRoom(clientId, roomId);
    });

    this.clients.delete(clientId);
    this.logger.log(`Unregistered client ${clientId}`);
  }

  /**
   * Subscribe client to specific event types
   */
  subscribeToEvents(clientId: string, eventTypes: StreamEventType[]): void {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    eventTypes.forEach((type) => client.subscriptions.add(type));
    this.logger.debug(
      `Client ${clientId} subscribed to: ${eventTypes.join(', ')}`
    );
  }

  /**
   * Unsubscribe client from event types
   */
  unsubscribeFromEvents(clientId: string, eventTypes: StreamEventType[]): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    eventTypes.forEach((type) => client.subscriptions.delete(type));
    this.logger.debug(
      `Client ${clientId} unsubscribed from: ${eventTypes.join(', ')}`
    );
  }

  /**
   * Link client to execution
   */
  linkClientToExecution(clientId: string, executionId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Update client execution
    client.executionId = executionId;

    // Update execution to clients mapping
    if (!this.executionToClients.has(executionId)) {
      this.executionToClients.set(executionId, new Set());
    }
    this.executionToClients.get(executionId)!.add(clientId);

    this.logger.debug(`Linked client ${clientId} to execution ${executionId}`);
  }

  /**
   * Register WebSocket gateway instance for integration
   */
  registerGateway(gateway: any): void {
    this.gatewayInstance = gateway;
    this.logger.debug('WebSocket gateway registered with bridge service');
  }

  /**
   * Broadcast update to all clients watching an execution
   */
  broadcastToExecution(executionId: string, update: StreamUpdate): void {
    const clientIds = this.executionToClients.get(executionId);
    if (!clientIds) {
      return;
    }

    // Broadcast to registered clients (existing functionality)
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && this.shouldSendToClient(client, update)) {
        client.subject.next(update);
      }
    });

    // Also broadcast through WebSocket gateway if available
    if (
      this.gatewayInstance &&
      typeof this.gatewayInstance.broadcastStreamUpdate === 'function'
    ) {
      this.gatewayInstance.broadcastStreamUpdate(update);
    }
  }

  /**
   * Broadcast update to specific client
   */
  sendToClient(clientId: string, update: StreamUpdate): void {
    const client = this.clients.get(clientId);
    if (client && this.shouldSendToClient(client, update)) {
      client.subject.next(update);
    }
  }

  /**
   * Join a streaming room
   */
  joinRoom(
    clientId: string,
    roomId: string,
    config?: {
      requireAuth?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        clients: new Set(),
        config: {
          requireAuth: config?.requireAuth || false,
        },
        metadata: config?.metadata || {},
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }

    const room = this.rooms.get(roomId)!;

    // Check room limits
    if (room.config.maxClients && room.clients.size >= room.config.maxClients) {
      throw new Error(`Room ${roomId} is at maximum capacity`);
    }

    // Add client to room
    client.rooms.add(roomId);
    room.clients.add(clientId);
    room.lastActivity = new Date();

    this.logger.debug(`Client ${clientId} joined room ${roomId}`);

    // Emit room join event
    this.eventEmitter.emit('websocket.room.join', {
      clientId,
      roomId,
      clientCount: room.clients.size,
    });
  }

  /**
   * Leave a streaming room
   */
  leaveRoom(clientId: string, roomId: string): void {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomId);

    if (!client || !room) {
      return;
    }

    client.rooms.delete(roomId);
    room.clients.delete(clientId);
    room.lastActivity = new Date();

    // Remove room if empty
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      this.logger.debug(`Removed empty room ${roomId}`);
    }

    this.logger.debug(`Client ${clientId} left room ${roomId}`);

    // Emit room leave event
    this.eventEmitter.emit('websocket.room.leave', {
      clientId,
      roomId,
      clientCount: room.clients.size,
    });
  }

  /**
   * Broadcast update to a specific room
   */
  broadcastToRoom(roomId: string, update: StreamUpdate): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.clients.forEach((clientId) => {
      this.sendToClient(clientId, update);
    });

    room.lastActivity = new Date();
  }

  /**
   * Check if update should be sent to client
   */
  private shouldSendToClient(
    client: WebSocketClient,
    update: StreamUpdate
  ): boolean {
    // Update client activity
    client.lastActivity = new Date();

    // If client has no subscriptions, send all
    if (client.subscriptions.size === 0) {
      return true;
    }

    // Check if client subscribed to this event type
    return client.subscriptions.has(update.type);
  }

  /**
   * Handle stream processed events
   */
  @OnEvent('stream.processed')
  handleStreamProcessed(data: any): void {
    const { executionId } = data;
    if (!executionId) {
      return;
    }

    const nodeId = data.nodeId || 'stream-processed';
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const update: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data: data.data,
      metadata: {
        timestamp: data.timestamp || new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        executionId,
        nodeId,
        ...nodeIdParts,
      },
    };

    this.broadcastToExecution(executionId, update);
  }

  /**
   * Handle client progress events
   */
  @OnEvent('client.progress')
  handleClientProgress(data: any): void {
    const { executionId, progress, message } = data;
    const nodeId = data.nodeId || 'client-progress';
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const update: StreamUpdate = {
      type: StreamEventType.PROGRESS,
      data: { progress, message },
      metadata: {
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        executionId,
        nodeId,
        ...nodeIdParts,
      },
    };

    this.broadcastToExecution(executionId, update);
  }

  /**
   * Handle client milestone events
   */
  @OnEvent('client.milestone')
  handleClientMilestone(data: any): void {
    const { executionId, milestone, timestamp } = data;
    const nodeId = data.nodeId || 'client-milestone';
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const update: StreamUpdate = {
      type: StreamEventType.MILESTONE,
      data: { milestone },
      metadata: {
        timestamp: timestamp || new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        executionId,
        nodeId,
        ...nodeIdParts,
      },
    };

    this.broadcastToExecution(executionId, update);
  }

  /**
   * Handle aggregated tokens
   */
  @OnEvent('tokens.aggregated')
  handleAggregatedTokens(data: any): void {
    const { executionId, tokens, totalCount } = data;
    const nodeId = data.nodeId || 'tokens-aggregated';
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const update: StreamUpdate = {
      type: StreamEventType.TOKEN,
      data: {
        tokens,
        totalCount,
        aggregated: true,
      },
      metadata: {
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        executionId,
        nodeId,
        ...nodeIdParts,
      },
    };

    this.broadcastToExecution(executionId, update);
  }

  /**
   * Handle token batch processed events
   */
  @OnEvent('token.batch.processed')
  handleTokenBatchProcessed(data: any): void {
    const { streamKey, tokenCount, timestamp } = data;
    const [executionId] = streamKey.split(':');
    const nodeId = data.nodeId || 'token-batch';
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const update: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data: {
        event: 'token_batch_processed',
        streamKey,
        tokenCount,
      },
      metadata: {
        timestamp: timestamp || new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        executionId,
        nodeId,
        ...nodeIdParts,
      },
    };

    this.broadcastToExecution(executionId, update);
  }

  /**
   * Handle workflow streaming events
   */
  @OnEvent('workflow.stream.*')
  handleWorkflowStreamEvent(data: any, event: string): void {
    // Extract execution ID from event name
    const parts = event.split('.');
    const executionId = parts[parts.length - 1];

    if (!executionId || executionId === '*') {
      return;
    }

    const nodeId = data.nodeId || 'workflow-stream';
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const update: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data,
      metadata: {
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        executionId,
        nodeId,
        event,
        ...nodeIdParts,
      },
    };

    this.broadcastToExecution(executionId, update);
  }

  /**
   * Get client info
   */
  getClientInfo(clientId: string): {
    id: string;
    executionId?: string;
    subscriptions: StreamEventType[];
  } | null {
    const client = this.clients.get(clientId);
    if (!client) {
      return null;
    }

    return {
      id: client.id,
      executionId: client.executionId,
      subscriptions: Array.from(client.subscriptions),
    };
  }

  /**
   * Get execution clients
   */
  getExecutionClients(executionId: string): string[] {
    const clientIds = this.executionToClients.get(executionId);
    return clientIds ? Array.from(clientIds) : [];
  }

  /**
   * Get all active clients
   */
  getActiveClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get execution count
   */
  getExecutionCount(): number {
    return this.executionToClients.size;
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get room info
   */
  getRoomInfo(roomId: string): {
    id: string;
    clientCount: number;
    config: any;
    metadata: Record<string, unknown>;
    createdAt: Date;
    lastActivity: Date;
  } | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    return {
      id: room.id,
      clientCount: room.clients.size,
      config: room.config,
      metadata: room.metadata,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }

  /**
   * Get all rooms info
   */
  getAllRoomsInfo(): Array<{
    id: string;
    clientCount: number;
    lastActivity: Date;
  }> {
    return Array.from(this.rooms.values()).map((room) => ({
      id: room.id,
      clientCount: room.clients.size,
      lastActivity: room.lastActivity,
    }));
  }

  /**
   * Setup token stream integration with timeout and error handling
   */
  private setupTokenStreamIntegration(): void {
    if (!this.tokenStreamingService) {
      this.logger.debug(
        'Token streaming service not available - skipping integration'
      );
      return;
    }

    try {
      const svc = this.tokenStreamingService as any;
      if (svc && typeof svc.getGlobalTokenStream === 'function') {
        // Add timeout to prevent hanging on subscription
        const setupTimeout = setTimeout(() => {
          this.logger.warn(
            'Token stream integration setup timeout - proceeding without token streaming'
          );
        }, 5000);

        try {
          this.logger.debug('Getting global token stream...');
          const tokenStream = svc.getGlobalTokenStream();

          this.logger.debug('Token stream obtained, subscribing...');

          // Make subscription completely asynchronous and non-blocking
          setImmediate(() => {
            try {
              const tokenSubscription = tokenStream.subscribe({
                next: (update: StreamUpdate) => {
                  // Handle updates asynchronously to prevent blocking
                  setImmediate(() => this.handleTokenStreamUpdate(update));
                },
                error: (error: unknown) => {
                  this.logger.error('Token stream integration error:', error);
                  // Don't crash the service on token stream errors
                },
                complete: () => {
                  this.logger.debug('Token stream completed');
                },
              });

              this.activeSubscriptions.add(tokenSubscription);
              this.logger.debug('Token stream integration setup completed');

              // Ensure workflow stream integration runs after token stream setup
              setImmediate(() => {
                this.logger.debug(
                  'Workflow stream integration setup completed'
                );
              });
            } catch (asyncSubscriptionError) {
              this.logger.warn(
                'Failed to subscribe to token stream asynchronously:',
                asyncSubscriptionError
              );
            }
          });

          // Clear timeout immediately since we got the stream
          clearTimeout(setupTimeout);
        } catch (subscriptionError) {
          clearTimeout(setupTimeout);
          this.logger.warn('Failed to get token stream:', subscriptionError);
          this.logger.debug(
            'WebSocket bridge will continue without token streaming'
          );
        }
      } else {
        this.logger.debug(
          'Token streaming service does not have getGlobalTokenStream method'
        );
      }
    } catch (error) {
      this.logger.error('Error during token stream integration setup:', error);
      this.logger.debug(
        'WebSocket bridge will continue without token streaming'
      );
    }
  }

  /**
   * Setup workflow stream integration
   */
  private setupWorkflowStreamIntegration(): void {
    // This would integrate with WorkflowStreamService if needed
    // For now, we rely on event-based communication
    this.logger.debug('Workflow stream integration setup completed');
  }

  /**
   * Handle token stream updates
   */
  private handleTokenStreamUpdate(update: StreamUpdate): void {
    if (update.metadata?.executionId) {
      this.broadcastToExecution(update.metadata.executionId, update);
    }

    // Also broadcast to token-specific rooms
    const tokenRoomId = `tokens:${update.metadata?.executionId || 'global'}`;
    this.broadcastToRoom(tokenRoomId, update);
  }

  /**
   * Setup client stream integration
   */
  private setupClientStreamIntegration(client: WebSocketClient): void {
    // Create merged stream for the client combining multiple sources
    const streams: any[] = [];

    // Add token stream if available and client is interested
    if (
      this.tokenStreamingService &&
      client.subscriptions.has(StreamEventType.TOKEN)
    ) {
      const svc = this.tokenStreamingService as any;
      if (typeof svc.getGlobalTokenStream === 'function') {
        streams.push(
          svc
            .getGlobalTokenStream()
            .pipe(
              filter(
                (update: StreamUpdate) =>
                  !client.executionId ||
                  update.metadata?.executionId === client.executionId
              )
            )
        );
      }
    }

    // Add workflow stream if available
    // This would be enhanced with WorkflowStreamService integration

    if (streams.length > 0) {
      const mergedStream = merge(...streams);

      const subscription = mergedStream.subscribe({
        next: (value: unknown) => {
          const update = value as StreamUpdate; // runtime contract
          if (this.shouldSendToClient(client, update)) {
            client.subject.next(update);
          }
        },
        error: (error: unknown) => {
          this.logger.error(`Client stream error for ${client.id}:`, error);
          client.subject.error(error as any);
        },
      });

      client.subscription = subscription;
      this.activeSubscriptions.add(subscription);
    }
  }

  /**
   * Setup cleanup interval
   */
  private setupCleanupInterval(): void {
    // Cleanup disconnected clients and stale rooms every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupDisconnectedClients();
      this.cleanupStaleRooms();
    }, 60000);
  }

  /**
   * Cleanup disconnected clients
   */
  cleanupDisconnectedClients(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const disconnected: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (client.subject.closed) {
        disconnected.push(clientId);
      } else if (now - client.lastActivity.getTime() > staleThreshold) {
        // Consider stale clients as disconnected
        disconnected.push(clientId);
      }
    });

    disconnected.forEach((clientId) => {
      this.unregisterClient(clientId);
    });

    if (disconnected.length > 0) {
      this.logger.log(`Cleaned up ${disconnected.length} disconnected clients`);
    }
  }

  /**
   * Cleanup stale rooms
   */
  private cleanupStaleRooms(): void {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    const staleRooms: string[] = [];

    this.rooms.forEach((room, roomId) => {
      if (
        room.clients.size === 0 &&
        now - room.lastActivity.getTime() > staleThreshold
      ) {
        staleRooms.push(roomId);
      }
    });

    staleRooms.forEach((roomId) => {
      this.rooms.delete(roomId);
    });

    if (staleRooms.length > 0) {
      this.logger.log(`Cleaned up ${staleRooms.length} stale rooms`);
    }
  }

  /**
   * Complete cleanup on service destruction
   */
  private cleanup(): void {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Unregister all clients
    const clientIds = Array.from(this.clients.keys());
    clientIds.forEach((clientId) => {
      this.unregisterClient(clientId);
    });

    // Unsubscribe from all subscriptions
    this.activeSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.activeSubscriptions.clear();

    // Clear all maps
    this.clients.clear();
    this.executionToClients.clear();
    this.rooms.clear();

    // Clear sequence counters
    this.sequenceCounters.clear();

    this.logger.log('WebSocketBridgeService cleanup completed');
  }
}
