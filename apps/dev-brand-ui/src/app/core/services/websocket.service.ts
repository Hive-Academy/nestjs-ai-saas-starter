import {
  Injectable,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject, timer, NEVER, BehaviorSubject } from 'rxjs';
import { filter, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import {
  WebSocketMessage,
  WebSocketMessageType,
  SubscribeExecutionPayload,
  JoinRoomPayload,
  ConnectionStatusPayload,
  StreamUpdatePayload,
  ErrorPayload,
} from '../interfaces/agent-state.interface';
import { environment } from '../../../environments/environment';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  userId?: string;
  sessionId?: string;
  // Socket.io specific options
  transports?: string[];
  upgrade?: boolean;
  rememberUpgrade?: boolean;
  auth?: Record<string, any>;
  query?: Record<string, any>;
}

/**
 * Enhanced WebSocket Service with Socket.io Gateway Integration
 * Supports the DevBrand Chat Studio MVP with reliable connection management
 * Integrates with StreamingWebSocketGateway for comprehensive streaming features
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private readonly destroyRef = inject(DestroyRef);

  // Connection management with Socket.io
  private socket: Socket | null = null;
  private readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  private readonly reconnectAttempts = signal(0);
  private readonly lastError = signal<string | null>(null);
  private readonly connectionId = signal<string | null>(null);

  // Message streams
  private readonly messageSubject = new Subject<WebSocketMessage>();
  private readonly connectionStatusSubject =
    new BehaviorSubject<ConnectionStatusPayload | null>(null);
  private readonly streamUpdateSubject = new Subject<StreamUpdatePayload>();
  private readonly errorSubject = new Subject<ErrorPayload>();

  // Enhanced configuration for Socket.io
  private readonly defaultConfig: WebSocketConfig = {
    url: environment.websocketUrl || this.getWebSocketUrl(),
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
  };

  // Public reactive state
  readonly status = this.connectionStatus.asReadonly();
  readonly isConnected = computed(
    () => this.connectionStatus() === 'connected'
  );
  readonly error = this.lastError.asReadonly();
  readonly attempts = this.reconnectAttempts.asReadonly();
  readonly connectionDetails = this.connectionId.asReadonly();

  // Public message streams
  readonly messages$ = this.messageSubject.asObservable();
  readonly connectionStatus$ = this.connectionStatusSubject
    .asObservable()
    .pipe(filter(Boolean));
  readonly streamUpdates$ = this.streamUpdateSubject.asObservable();
  readonly errors$ = this.errorSubject.asObservable();

  constructor() {
    this.initializeHeartbeat();
  }

  /**
   * Connect to Socket.io WebSocket Gateway
   */
  connect(config?: Partial<WebSocketConfig>): void {
    const wsConfig = { ...this.defaultConfig, ...config };

    if (this.socket && this.socket.connected) {
      console.warn('Socket.io already connected');
      return;
    }

    this.connectionStatus.set('connecting');
    this.lastError.set(null);

    // Create Socket.io connection
    this.socket = io(wsConfig.url, {
      transports: wsConfig.transports || ['websocket', 'polling'],
      upgrade: wsConfig.upgrade ?? true,
      rememberUpgrade: wsConfig.rememberUpgrade ?? true,
      auth: wsConfig.auth || {},
      query: wsConfig.query || {},
      autoConnect: true,
    });

    this.setupSocketEventHandlers(wsConfig);
  }

  /**
   * Disconnect Socket.io connection
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus.set('disconnected');
    this.reconnectAttempts.set(0);
    this.connectionId.set(null);
  }

  /**
   * Send message to server via Socket.io
   */
  send<T = unknown>(messageType: string, data: T): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot send message: Socket.io not connected');
      return;
    }

    try {
      this.socket.emit(messageType, data);
    } catch (error) {
      console.error('Failed to send message:', error);
      this.lastError.set(error instanceof Error ? error.message : 'Send error');
    }
  }

  /**
   * Send message with legacy format for backward compatibility
   */
  sendLegacy<T = unknown>(message: T): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot send message: Socket.io not connected');
      return;
    }

    try {
      // Emit as generic message for backward compatibility
      this.socket.emit('message', message);
    } catch (error) {
      console.error('Failed to send legacy message:', error);
      this.lastError.set(error instanceof Error ? error.message : 'Send error');
    }
  }

  /**
   * Get messages filtered by type (enhanced for gateway)
   */
  getMessagesByType<T extends WebSocketMessage>(
    type: WebSocketMessageType | string
  ): Observable<T> {
    return this.messages$.pipe(
      filter((message): message is T => message.type === type)
    );
  }

  /**
   * Get stream updates for a specific execution
   */
  getStreamUpdatesForExecution(
    executionId: string
  ): Observable<StreamUpdatePayload> {
    return this.streamUpdates$.pipe(
      filter((update) => update.update.metadata?.executionId === executionId)
    );
  }

  /**
   * Get connection status updates
   */
  getConnectionStatusUpdates(): Observable<ConnectionStatusPayload> {
    return this.connectionStatus$;
  }

  /**
   * Get error messages
   */
  getErrorMessages(): Observable<ErrorPayload> {
    return this.errors$;
  }

  /**
   * Send heartbeat ping
   */
  sendHeartbeat(): void {
    this.send(WebSocketMessageType.PING, { timestamp: new Date() });
  }

  /**
   * Subscribe to execution stream
   */
  subscribeToExecution(payload: SubscribeExecutionPayload): void {
    this.send(WebSocketMessageType.SUBSCRIBE_EXECUTION, payload);
  }

  /**
   * Unsubscribe from execution stream
   */
  unsubscribeFromExecution(executionId: string): void {
    this.send(WebSocketMessageType.UNSUBSCRIBE_EXECUTION, { executionId });
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToEvents(eventTypes: string[], scope?: any): void {
    this.send(WebSocketMessageType.SUBSCRIBE_EVENTS, { eventTypes, scope });
  }

  /**
   * Join a room for targeted messaging
   */
  joinRoom(payload: JoinRoomPayload): void {
    this.send(WebSocketMessageType.JOIN_ROOM, payload);
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.send(WebSocketMessageType.LEAVE_ROOM, { roomId });
  }

  /**
   * Request current connection status
   */
  requestStatus(): void {
    this.send(WebSocketMessageType.GET_STATUS, {});
  }

  /**
   * Authenticate connection (if required)
   */
  authenticate(token?: string, metadata?: any): void {
    this.send(WebSocketMessageType.AUTHENTICATION, {
      token,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Setup Socket.io event handlers for gateway integration
   */
  private setupSocketEventHandlers(config: WebSocketConfig): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket.io connected to gateway');
      this.connectionStatus.set('connected');
      this.reconnectAttempts.set(0);
      this.lastError.set(null);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket.io disconnected:', reason);
      this.connectionStatus.set('disconnected');
      this.connectionId.set(null);

      if (reason === 'io server disconnect') {
        // Server disconnected the client, reconnect manually
        this.attemptReconnect(config);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.io connection error:', error);
      this.lastError.set(error.message || 'Connection error');
      this.connectionStatus.set('error');
      this.attemptReconnect(config);
    });

    // Gateway-specific event handlers
    this.socket.on(
      WebSocketMessageType.CONNECTION_STATUS,
      (data: ConnectionStatusPayload) => {
        console.log('Connection status received:', data);
        if (data.connection?.id) {
          this.connectionId.set(data.connection.id);
        }
        this.connectionStatusSubject.next(data);
      }
    );

    this.socket.on(
      WebSocketMessageType.STREAM_UPDATE,
      (message: WebSocketMessage<StreamUpdatePayload>) => {
        this.streamUpdateSubject.next(message.data);
        this.messageSubject.next({
          type: WebSocketMessageType.STREAM_UPDATE,
          data: message.data.update,
          metadata: message.metadata,
        });
      }
    );

    this.socket.on(
      WebSocketMessageType.ERROR,
      (message: WebSocketMessage<ErrorPayload>) => {
        console.error('Gateway error received:', message.data);
        this.errorSubject.next(message.data);
        this.lastError.set(message.data.message);
      }
    );

    this.socket.on(WebSocketMessageType.PONG, (data: any) => {
      // Handle pong response
      console.debug('Pong received:', data);
    });

    // Subscription confirmations
    this.socket.on('subscription_confirmed', (data: any) => {
      console.log('Subscription confirmed:', data);
    });

    this.socket.on('unsubscription_confirmed', (data: any) => {
      console.log('Unsubscription confirmed:', data);
    });

    this.socket.on('room_joined', (data: any) => {
      console.log('Room joined:', data);
    });

    this.socket.on('room_left', (data: any) => {
      console.log('Room left:', data);
    });

    this.socket.on('authentication_success', (data: any) => {
      console.log('Authentication successful:', data);
    });

    // Legacy message handling for backward compatibility
    this.socket.on('message', (message: WebSocketMessage) => {
      if (this.isValidMessage(message)) {
        this.messageSubject.next(message);
      }
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('Socket.io error:', error);
      this.lastError.set(error.message || 'Socket error');
      this.connectionStatus.set('error');
    });
  }

  /**
   * Get WebSocket URL from environment
   * Updated to connect to streaming backend with correct port and namespace
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // Connect to streaming backend on port 3000 (to match API server)
    const port = window.location.hostname === 'localhost' ? ':3000' : '';
    // Use streaming namespace to match backend gateway configuration
    return `${protocol}//${host}${port}/streaming`;
  }

  /**
   * Initialize heartbeat mechanism for Socket.io
   */
  private initializeHeartbeat(): void {
    // Send heartbeat when connected
    toObservable(this.status)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(),
        switchMap((status) =>
          status === 'connected'
            ? timer(
                this.defaultConfig.heartbeatInterval,
                this.defaultConfig.heartbeatInterval
              )
            : NEVER
        )
      )
      .subscribe(() => {
        this.sendHeartbeat();
      });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(config: WebSocketConfig): void {
    const attempts = this.reconnectAttempts();

    if (attempts >= config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus.set('error');
      this.lastError.set('Max reconnection attempts exceeded');
      return;
    }

    this.connectionStatus.set('reconnecting');
    this.reconnectAttempts.set(attempts + 1);

    const backoffDelay = Math.min(
      config.reconnectInterval * Math.pow(2, attempts),
      30000 // Max 30 seconds
    );

    console.log(
      `Attempting Socket.io reconnection ${attempts + 1}/${
        config.maxReconnectAttempts
      } in ${backoffDelay}ms`
    );

    timer(backoffDelay)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.socket) {
          this.socket.connect();
        } else {
          this.connect(config);
        }
      });
  }

  /**
   * Validate incoming message format (enhanced for gateway)
   */
  private isValidMessage(message: unknown): message is WebSocketMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const msg = message as Record<string, any>;
    const hasBasicProperties = 'type' in msg && 'data' in msg;
    const hasTimestamp = 'timestamp' in msg;
    const hasMetadataWithTimestamp =
      'metadata' in msg &&
      msg['metadata'] &&
      typeof msg['metadata'] === 'object' &&
      'timestamp' in msg['metadata'];

    return hasBasicProperties && (hasTimestamp || hasMetadataWithTimestamp);
  }
}
