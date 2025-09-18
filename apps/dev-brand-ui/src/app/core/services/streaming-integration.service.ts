import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, filter, map } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { WebSocketService, ConnectionStatus } from './websocket.service';
import {
  SubscribeExecutionPayload,
  JoinRoomPayload,
  ConnectionStatusPayload,
} from '../interfaces/agent-state.interface';
import { environment } from '../../../environments/environment';

// Enhanced streaming event types for gateway integration
export interface StreamingUpdate {
  type:
    | 'token'
    | 'event'
    | 'progress'
    | 'workflow:start'
    | 'workflow:end'
    | 'node:start'
    | 'node:end';
  executionId: string;
  nodeId?: string;
  data: any;
  metadata?: {
    timestamp: Date;
    sequenceNumber: number;
    executionId: string;
    nodeId?: string;
    agentType?: string;
    [key: string]: any;
  };
  // Legacy support
  timestamp?: number;
}

export interface TokenStreamUpdate {
  token: string;
  metadata?: {
    wordIndex?: number;
    tokenIndex?: number;
    sectionProgress?: number;
    agentId?: string;
  };
}

export interface EventStreamUpdate {
  eventType: string;
  data: any;
  nodeId?: string;
}

export interface ProgressStreamUpdate {
  percentage: number;
  eta?: string;
  milestone?: number;
  stage?: string;
}

/**
 * 🌊 ENHANCED STREAMING INTEGRATION SERVICE
 *
 * Integrates with StreamingWebSocketGateway for comprehensive real-time streaming
 * Bridges WebSocket service with sophisticated streaming decorators
 * Handles token streaming, event streaming, progress streaming, and room-based messaging
 */
@Injectable({
  providedIn: 'root',
})
export class StreamingIntegrationService {
  private readonly webSocket = inject(WebSocketService);

  // Enhanced streaming state
  private readonly isStreaming = signal(false);
  private readonly activeExecutions = signal<Set<string>>(new Set());
  private readonly activeRooms = signal<Set<string>>(new Set());
  private readonly connectionStatus = signal<ConnectionStatusPayload | null>(
    null
  );

  // Enhanced stream subjects for different types
  private readonly tokenStream = new BehaviorSubject<TokenStreamUpdate | null>(
    null
  );
  private readonly eventStream = new BehaviorSubject<EventStreamUpdate | null>(
    null
  );
  private readonly progressStream =
    new BehaviorSubject<ProgressStreamUpdate | null>(null);
  private readonly workflowStream = new BehaviorSubject<StreamingUpdate | null>(
    null
  );

  // Enhanced public observables
  readonly tokens$ = this.tokenStream.asObservable().pipe(filter(Boolean));
  readonly events$ = this.eventStream.asObservable().pipe(filter(Boolean));
  readonly progress$ = this.progressStream.asObservable().pipe(filter(Boolean));
  readonly workflows$ = this.workflowStream
    .asObservable()
    .pipe(filter(Boolean));
  readonly streaming = this.isStreaming.asReadonly();
  readonly executions = this.activeExecutions.asReadonly();
  readonly rooms = this.activeRooms.asReadonly();
  readonly connection = this.connectionStatus.asReadonly();

  constructor() {
    this.initializeGatewayIntegration();
  }

  /**
   * Enhanced workflow subscription with gateway integration
   * Connects to StreamingWebSocketGateway for comprehensive streaming
   */
  subscribeToWorkflow(
    executionId: string,
    options?: {
      eventTypes?: string[];
      rooms?: string[];
      includeHistory?: boolean;
    }
  ): Observable<StreamingUpdate> {
    console.log(
      `🌊 Subscribing to workflow streaming via gateway: ${executionId}`
    );

    // Connect WebSocket if not connected
    if (!this.webSocket.isConnected()) {
      this.webSocket.connect();
    }

    const eventTypes = options?.eventTypes || [
      'token',
      'event',
      'progress',
      'workflow:start',
      'workflow:end',
      'node:start',
      'node:end',
    ];
    const rooms = options?.rooms || [
      'showcase-demo',
      'supervisor-pattern',
      'devbrand-streaming',
    ];

    // Subscribe to execution using gateway message format
    const subscriptionPayload: SubscribeExecutionPayload = {
      executionId,
      eventTypes,
      options: {
        includeHistory: options?.includeHistory || false,
        bufferSize: 100,
      },
    };

    this.webSocket.subscribeToExecution(subscriptionPayload);

    // Join relevant rooms for targeted messaging
    rooms.forEach((roomId) => {
      this.joinRoom(roomId);
    });

    // Add to active executions
    const current = new Set(this.activeExecutions());
    current.add(executionId);
    this.activeExecutions.set(current);
    this.isStreaming.set(true);

    // Return enhanced message stream from gateway
    return this.webSocket.streamUpdates$.pipe(
      filter(
        (streamUpdate) =>
          streamUpdate.update.metadata?.executionId === executionId
      ),
      map(
        (streamUpdate) =>
          ({
            type: streamUpdate.update.type as any,
            executionId:
              streamUpdate.update.metadata?.executionId || executionId,
            nodeId: streamUpdate.update.metadata?.nodeId,
            data: streamUpdate.update.data,
            metadata: streamUpdate.update.metadata,
            timestamp: streamUpdate.update.metadata?.timestamp?.getTime(),
          } as StreamingUpdate)
      )
    );
  }

  /**
   * Join a room for targeted messaging
   */
  joinRoom(
    roomId: string,
    options?: { requireAuth?: boolean; metadata?: any }
  ): void {
    const payload: JoinRoomPayload = {
      roomId,
      options: options || {},
    };

    this.webSocket.joinRoom(payload);

    // Track active rooms
    const currentRooms = new Set(this.activeRooms());
    currentRooms.add(roomId);
    this.activeRooms.set(currentRooms);

    console.log(`📬 Joined room: ${roomId}`);
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.webSocket.leaveRoom(roomId);

    // Remove from active rooms
    const currentRooms = new Set(this.activeRooms());
    currentRooms.delete(roomId);
    this.activeRooms.set(currentRooms);

    console.log(`🚪 Left room: ${roomId}`);
  }

  /**
   * Enhanced supervisor showcase streaming with gateway integration
   * Now uses real backend executionId from customer-support API
   */
  startSupervisorShowcase(request: {
    input: string;
    demonstrationMode: 'basic' | 'advanced' | 'enterprise';
    enableStreaming: boolean;
  }): Observable<StreamingUpdate> {
    console.log(`🚀 Starting enhanced supervisor showcase`);

    // Create ticket request for customer-support API
    const ticketRequest = {
      customerId: 'demo-user',
      title: request.input.slice(0, 60) || 'Supervisor Pattern Demo',
      description: request.input,
      priority: request.demonstrationMode === 'enterprise' ? 'high' : 'medium',
      category: 'demo-supervisor',
      customerTier: request.demonstrationMode === 'enterprise' ? 'enterprise' : 'premium',
      metadata: {
        pattern: 'supervisor',
        enableStreaming: request.enableStreaming,
        demonstrationMode: request.demonstrationMode
      }
    };

    // Initiate workflow via customer-support API and get real executionId
    const apiUrl = `${environment.apiUrl}/api/customer-support/tickets`;
    return new Observable<StreamingUpdate>((observer) => {
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketRequest),
      })
        .then((response) => response.json())
        .then((result) => {
          const executionId = result.executionId;
          console.log(`✅ Supervisor workflow initiated with executionId: ${executionId}`);

          // Join supervisor-specific rooms for targeted messaging
          this.joinRoom('supervisor-showcase', { metadata: { executionId } });
          this.joinRoom('devbrand-streaming', { metadata: { type: 'supervisor' } });

          // Subscribe to workflow streaming with real executionId
          const streamObservable = this.subscribeToWorkflow(executionId, {
            eventTypes: [
              'token',
              'event',
              'progress',
              'workflow:start',
              'workflow:end',
              'node:start',
              'node:end',
            ],
            rooms: ['supervisor-showcase', 'devbrand-streaming'],
            includeHistory: false,
          });

          // Forward all stream updates to the observer
          streamObservable.subscribe({
            next: (update) => observer.next(update),
            error: (error) => observer.error(error),
            complete: () => observer.complete()
          });
        })
        .catch((error) => {
          console.error(`❌ Supervisor workflow initiation error:`, error);
          observer.error(error);
        });
    });
  }

  /**
   * Enhanced swarm showcase streaming with gateway integration
   * Now uses real backend executionId from customer-support API
   */
  startSwarmShowcase(request: {
    input: string;
    demonstrationMode: 'basic' | 'advanced' | 'enterprise';
    enableStreaming: boolean;
  }): Observable<StreamingUpdate> {
    console.log(`🐝 Starting enhanced swarm showcase`);

    // Create ticket request for customer-support API
    const ticketRequest = {
      customerId: 'demo-user',
      title: request.input.slice(0, 60) || 'Swarm Pattern Demo',
      description: request.input,
      priority: request.demonstrationMode === 'enterprise' ? 'high' : 'medium',
      category: 'demo-swarm',
      customerTier: request.demonstrationMode === 'enterprise' ? 'enterprise' : 'premium',
      metadata: {
        pattern: 'swarm',
        enableStreaming: request.enableStreaming,
        demonstrationMode: request.demonstrationMode
      }
    };

    // Initiate workflow via customer-support API and get real executionId
    const apiUrl = `${environment.apiUrl}/api/customer-support/tickets`;
    return new Observable<StreamingUpdate>((observer) => {
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketRequest),
      })
        .then((response) => response.json())
        .then((result) => {
          const executionId = result.executionId;
          console.log(`✅ Swarm workflow initiated with executionId: ${executionId}`);

          // Join swarm-specific rooms for targeted messaging
          this.joinRoom('swarm-showcase', { metadata: { executionId } });
          this.joinRoom('devbrand-streaming', { metadata: { type: 'swarm' } });
          this.joinRoom('multi-agent-coordination', {
            metadata: { pattern: 'swarm' },
          });

          // Subscribe to workflow streaming with real executionId
          const streamObservable = this.subscribeToWorkflow(executionId, {
            eventTypes: [
              'token',
              'event',
              'progress',
              'workflow:start',
              'workflow:end',
              'node:start',
              'node:end',
            ],
            rooms: [
              'swarm-showcase',
              'devbrand-streaming',
              'multi-agent-coordination',
            ],
            includeHistory: false,
          });

          // Forward all stream updates to the observer
          streamObservable.subscribe({
            next: (update) => observer.next(update),
            error: (error) => observer.error(error),
            complete: () => observer.complete()
          });
        })
        .catch((error) => {
          console.error(`❌ Swarm workflow initiation error:`, error);
          observer.error(error);
        });
    });
  }

  /**
   * Get token stream for specific execution
   * Real-time tokens from your @StreamToken decorators
   */
  getTokenStream(executionId: string): Observable<TokenStreamUpdate> {
    return this.subscribeToWorkflow(executionId).pipe(
      filter((update) => update.type === 'token'),
      map(
        (update) =>
          ({
            token: update.data.token,
            metadata: update.metadata,
          } as TokenStreamUpdate)
      )
    );
  }

  /**
   * Get event stream for specific execution
   * Events from your @StreamEvent decorators
   */
  getEventStream(executionId: string): Observable<EventStreamUpdate> {
    return this.subscribeToWorkflow(executionId).pipe(
      filter((update) => update.type === 'event'),
      map(
        (update) =>
          ({
            eventType: update.data.eventType,
            data: update.data,
            nodeId: update.nodeId,
          } as EventStreamUpdate)
      )
    );
  }

  /**
   * Get progress stream for specific execution
   * Progress from your @StreamProgress decorators
   */
  getProgressStream(executionId: string): Observable<ProgressStreamUpdate> {
    return this.subscribeToWorkflow(executionId).pipe(
      filter((update) => update.type === 'progress'),
      map(
        (update) =>
          ({
            percentage: update.data.percentage,
            eta: update.data.eta,
            milestone: update.data.milestone,
            stage: update.data.stage,
          } as ProgressStreamUpdate)
      )
    );
  }

  /**
   * Enhanced unsubscribe with gateway cleanup
   */
  unsubscribeFromWorkflow(executionId: string): void {
    console.log(`🛑 Unsubscribing from workflow via gateway: ${executionId}`);

    // Unsubscribe from execution using gateway message format
    this.webSocket.unsubscribeFromExecution(executionId);

    // Leave associated rooms
    const roomsToLeave = [
      'supervisor-showcase',
      'swarm-showcase',
      'devbrand-streaming',
      'multi-agent-coordination',
    ];
    roomsToLeave.forEach((roomId) => {
      if (this.activeRooms().has(roomId)) {
        this.leaveRoom(roomId);
      }
    });

    // Remove from active executions
    const current = new Set(this.activeExecutions());
    current.delete(executionId);
    this.activeExecutions.set(current);

    if (current.size === 0) {
      this.isStreaming.set(false);
    }
  }

  /**
   * Unsubscribe from all active workflows
   */
  unsubscribeFromAll(): void {
    console.log(`🛑 Unsubscribing from all workflows`);

    // Unsubscribe from all active executions
    this.activeExecutions().forEach((executionId) => {
      this.webSocket.unsubscribeFromExecution(executionId);
    });

    // Leave all rooms
    this.activeRooms().forEach((roomId) => {
      this.webSocket.leaveRoom(roomId);
    });

    // Reset state
    this.activeExecutions.set(new Set());
    this.activeRooms.set(new Set());
    this.isStreaming.set(false);
  }

  /**
   * Enhanced gateway integration initialization
   */
  private initializeGatewayIntegration(): void {
    // Process stream updates from gateway
    this.webSocket.streamUpdates$.subscribe((streamUpdate) => {
      const update: StreamingUpdate = {
        type: streamUpdate.update.type as any,
        executionId: streamUpdate.update.metadata?.executionId || '',
        nodeId: streamUpdate.update.metadata?.nodeId,
        data: streamUpdate.update.data,
        metadata: streamUpdate.update.metadata,
        timestamp: streamUpdate.update.metadata?.timestamp?.getTime(),
      };

      // Route to appropriate stream
      switch (update.type) {
        case 'token':
          this.tokenStream.next({
            token: update.data.content || update.data.token,
            metadata: {
              wordIndex: update.data.index,
              tokenIndex: update.metadata?.sequenceNumber,
              sectionProgress: update.data.progress,
              agentId: update.metadata?.agentType,
            },
          });
          break;

        case 'event':
          this.eventStream.next({
            eventType: update.data.eventType || update.type,
            data: update.data,
            nodeId: update.nodeId,
          });
          break;

        case 'progress':
          this.progressStream.next({
            percentage: update.data.progress || update.data.percentage || 0,
            eta: update.data.eta,
            milestone: update.data.milestone,
            stage: update.data.stage || update.metadata?.['stage'],
          });
          break;

        case 'workflow:start':
        case 'workflow:end':
        case 'node:start':
        case 'node:end':
          this.workflowStream.next(update);
          break;
      }
    });

    // Handle connection status updates from gateway
    this.webSocket.getConnectionStatusUpdates().subscribe((status) => {
      console.log('🔌 Gateway connection status:', status);
      this.connectionStatus.set(status);

      if (status.status === 'connected') {
        console.log(
          `✅ Connected to gateway with ID: ${status.connection?.id}`
        );
      }
    });

    // Handle gateway errors
    this.webSocket.getErrorMessages().subscribe((error) => {
      console.error('❌ Gateway error:', error);

      // Handle specific error types
      if (error.category === 'connection') {
        console.warn(
          '⚠️ Connection error during streaming, attempting recovery...'
        );
      } else if (error.category === 'authentication') {
        console.error('🔒 Authentication error, please check credentials');
      }
    });

    // Handle connection status changes
    toObservable(this.webSocket.status).subscribe(
      (status: ConnectionStatus) => {
        if (status === 'disconnected' && this.isStreaming()) {
          console.warn('⚠️ Gateway disconnected during streaming');
        } else if (status === 'connected' && this.isStreaming()) {
          console.log('✅ Gateway reconnected, streaming can continue');
        }
      }
    );

    // Setup heartbeat monitoring
    toObservable(this.webSocket.status)
      .pipe(filter((status) => status === 'connected'))
      .subscribe(() => {
        // Request initial status when connected
        this.webSocket.requestStatus();
      });
  }
}
