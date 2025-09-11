import {
  Injectable,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject, timer, NEVER } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import {
  catchError,
  filter,
  switchMap,
  distinctUntilChanged,
} from 'rxjs/operators';
import { WebSocketMessage } from '../interfaces/agent-state.interface';

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
}

/**
 * WebSocket Service for real-time agent communication
 * Supports the DevBrand Chat Studio MVP with reliable connection management
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private readonly destroyRef = inject(DestroyRef);

  // Connection management
  private websocket$: WebSocketSubject<unknown> | null = null;
  private readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  private readonly reconnectAttempts = signal(0);
  private readonly lastError = signal<string | null>(null);

  // Message streams
  private readonly messageSubject = new Subject<WebSocketMessage>();

  // Configuration
  private readonly defaultConfig: WebSocketConfig = {
    url: this.getWebSocketUrl(),
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  };

  // Public reactive state
  readonly status = this.connectionStatus.asReadonly();
  readonly isConnected = computed(
    () => this.connectionStatus() === 'connected'
  );
  readonly error = this.lastError.asReadonly();
  readonly attempts = this.reconnectAttempts.asReadonly();

  // Public message stream
  readonly messages$ = this.messageSubject.asObservable();

  constructor() {
    this.initializeHeartbeat();
  }

  /**
   * Connect to WebSocket server
   */
  connect(config?: Partial<WebSocketConfig>): void {
    const wsConfig = { ...this.defaultConfig, ...config };

    if (this.websocket$ && !this.websocket$.closed) {
      console.warn('WebSocket already connected or connecting');
      return;
    }

    this.connectionStatus.set('connecting');
    this.lastError.set(null);

    this.websocket$ = webSocket({
      url: wsConfig.url,
      openObserver: {
        next: () => {
          console.log('WebSocket connected');
          this.connectionStatus.set('connected');
          this.reconnectAttempts.set(0);
          this.lastError.set(null);
        },
      },
      closeObserver: {
        next: (event) => {
          console.log('WebSocket disconnected:', event);
          this.connectionStatus.set('disconnected');
          this.attemptReconnect(wsConfig);
        },
      },
    });

    // Subscribe to incoming messages
    this.websocket$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((message): message is WebSocketMessage =>
          this.isValidMessage(message)
        ),
        catchError((error) => {
          console.error('WebSocket error:', error);
          this.lastError.set(error.message || 'Connection error');
          this.connectionStatus.set('error');
          return NEVER;
        })
      )
      .subscribe({
        next: (message) => {
          this.messageSubject.next(message);
        },
        error: (error) => {
          console.error('WebSocket stream error:', error);
          this.lastError.set(error.message || 'Stream error');
          this.connectionStatus.set('error');
        },
      });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.websocket$) {
      this.websocket$.complete();
      this.websocket$ = null;
    }
    this.connectionStatus.set('disconnected');
    this.reconnectAttempts.set(0);
  }

  /**
   * Send message to server
   */
  send<T = unknown>(message: T): void {
    if (!this.websocket$ || this.connectionStatus() !== 'connected') {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.websocket$.next(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      this.lastError.set(error instanceof Error ? error.message : 'Send error');
    }
  }

  /**
   * Get messages filtered by type
   */
  getMessagesByType<T extends WebSocketMessage>(
    type: T['type']
  ): Observable<T> {
    return this.messages$.pipe(
      filter((message): message is T => message.type === type)
    );
  }

  /**
   * Send heartbeat ping
   */
  sendHeartbeat(): void {
    this.send({ type: 'ping', timestamp: new Date() });
  }

  /**
   * Get WebSocket URL from environment
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.hostname === 'localhost' ? ':3001' : '';
    return `${protocol}//${host}${port}`;
  }

  /**
   * Initialize heartbeat mechanism
   */
  private initializeHeartbeat(): void {
    // Send heartbeat when connected
    toObservable(this.status)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(),
        switchMap((status) =>
          status === 'connected'
            ? timer(0, this.defaultConfig.heartbeatInterval)
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
      `Attempting reconnection ${attempts + 1}/${
        config.maxReconnectAttempts
      } in ${backoffDelay}ms`
    );

    timer(backoffDelay)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.connect(config);
      });
  }

  /**
   * Validate incoming message format
   */
  private isValidMessage(message: unknown): message is WebSocketMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      'timestamp' in message &&
      'data' in message
    );
  }
}
