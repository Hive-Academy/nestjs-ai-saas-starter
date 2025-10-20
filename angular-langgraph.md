# 🚀 Angular LangGraph Integration Library

**Comprehensive Research & Architecture Design**

---

## 📊 Executive Summary

### Research Scope

I've conducted a comprehensive analysis of:

1. ✅ **CopilotKit Ecosystem** - React-based AI agent framework with AG-UI protocol
2. ✅ **Your 12 LangGraph Libraries** - Enterprise NestJS modules for AI workflows
3. ✅ **Current Integration Points** - WebSocket, REST, HITL infrastructure
4. ✅ **AG-UI Protocol Specification** - 16 event types, SSE/WebSocket streaming
5. ✅ **Frontend Integration Guides** - Existing documentation for dev-brand-ui

### Key Finding

**CopilotKit is React-only and doesn't support Angular**. However, we can create a superior Angular-native library that leverages your existing NestJS infrastructure with better TypeScript integration and RxJS-powered reactivity.

---

## 🎯 Proposed Library: `@hive-academy/angular-langgraph`

### Library Architecture Overview

```
@hive-academy/angular-langgraph
├── core/                           # Core services and protocols
│   ├── services/
│   │   ├── langgraph-connection.service.ts    # WebSocket + REST connection
│   │   ├── langgraph-protocol.service.ts      # AG-UI protocol implementation
│   │   ├── langgraph-state.service.ts         # Bi-directional state sync
│   │   └── langgraph-streaming.service.ts     # Token/event streaming
│   ├── models/
│   │   ├── ag-ui-events.model.ts              # AG-UI event types
│   │   ├── langgraph-config.model.ts          # Configuration interfaces
│   │   └── workflow-state.model.ts            # State management types
│   └── interceptors/
│       ├── auth.interceptor.ts                # JWT authentication
│       └── retry.interceptor.ts               # Connection retry logic
│
├── components/                     # Prebuilt UI components
│   ├── chat/
│   │   ├── langgraph-chat.component.ts        # Main chat interface
│   │   ├── langgraph-message.component.ts     # Message bubble
│   │   └── langgraph-input.component.ts       # User input
│   ├── workflow/
│   │   ├── workflow-visualizer.component.ts   # Real-time workflow viz
│   │   ├── workflow-progress.component.ts     # Progress indicators
│   │   └── workflow-timeline.component.ts     # Execution timeline
│   ├── hitl/
│   │   ├── approval-modal.component.ts        # Approval UI
│   │   ├── approval-card.component.ts         # Approval request card
│   │   └── approval-history.component.ts      # Approval history
│   └── shared/
│       ├── typing-indicator.component.ts      # AI typing animation
│       ├── agent-avatar.component.ts          # Agent visualization
│       └── status-badge.component.ts          # Status indicators
│
├── directives/                     # Angular directives
│   ├── ag-stream.directive.ts                 # Streaming text directive
│   ├── ag-state-sync.directive.ts             # State binding directive
│   └── ag-action.directive.ts                 # Action handler directive
│
├── pipes/                          # Data transformation pipes
│   ├── markdown.pipe.ts                       # Markdown rendering
│   ├── token-stream.pipe.ts                   # Token accumulation
│   └── confidence-level.pipe.ts               # Confidence display
│
├── composables/                    # Composable functions (Angular inject pattern)
│   ├── use-langgraph-workflow.ts              # Workflow execution
│   ├── use-langgraph-chat.ts                  # Chat functionality
│   ├── use-langgraph-approval.ts              # HITL approvals
│   └── use-langgraph-streaming.ts             # Real-time streaming
│
└── module/
    ├── langgraph.module.ts                    # Module configuration
    └── langgraph-config.ts                    # Configuration provider
```

---

## 🏗️ Core Architecture Components

### 1. Connection Service (RxJS WebSocket + REST)

**Using RxJS WebSocket** - Native Observable streams with built-in reconnection support. Much cleaner than socket.io-client!

```typescript
import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, timer, EMPTY } from 'rxjs';
import { retryWhen, tap, delayWhen, catchError, share } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LANGGRAPH_CONFIG } from './langgraph-config';
import type {
  LangGraphConfig,
  ConnectionState,
  AGUIEventType,
  WorkflowExecution,
  WebSocketMessage,
} from '../models';

@Injectable({ providedIn: 'root' })
export class LangGraphConnectionService {
  private http = inject(HttpClient);
  private config = inject(LANGGRAPH_CONFIG);
  private destroyRef = inject(DestroyRef);

  private socket$!: WebSocketSubject<WebSocketMessage>;
  private messages$ = new Subject<WebSocketMessage>();

  // Signal-based state
  connectionState = signal<ConnectionState>('disconnected');
  isConnected = computed(() => this.connectionState() === 'connected');
  isDisconnected = computed(() => this.connectionState() === 'disconnected');
  isReconnecting = computed(() => this.connectionState() === 'reconnecting');

  // Connect to WebSocket server (ws://localhost:8080/streaming)
  connect(): Observable<WebSocketMessage> {
    const wsUrl = this.config.websocketUrl.replace('http', 'ws') + '/streaming';

    this.socket$ = webSocket<WebSocketMessage>({
      url: wsUrl,
      // Include auth token in query params or headers
      protocol: this.config.authToken ? [`Bearer.${this.config.authToken}`] : undefined,
      openObserver: {
        next: () => {
          console.log('[LangGraph] WebSocket connected');
          this.connectionState.set('connected');
        },
      },
      closeObserver: {
        next: () => {
          console.log('[LangGraph] WebSocket disconnected');
          this.connectionState.set('disconnected');
        },
      },
    });

    // Auto-reconnection with exponential backoff
    this.socket$
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            tap(() => {
              console.log('[LangGraph] Attempting reconnection...');
              this.connectionState.set('reconnecting');
            }),
            delayWhen((_, attempt) => {
              // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
              const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
              return timer(delay);
            })
          )
        ),
        catchError((error) => {
          console.error('[LangGraph] WebSocket error:', error);
          this.connectionState.set('error');
          return EMPTY;
        }),
        share(), // Share the connection among multiple subscribers
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (message) => this.messages$.next(message),
        error: (err) => console.error('[LangGraph] Stream error:', err),
      });

    return this.messages$.asObservable();
  }

  // Subscribe to workflow execution
  subscribeToExecution(executionId: string): void {
    this.socket$.next({
      type: 'subscribe_execution',
      data: { executionId },
    });
  }

  // Listen for specific event types
  on<T>(eventType: AGUIEventType): Observable<T> {
    return new Observable((observer) => {
      const subscription = this.messages$.subscribe((message) => {
        if (message.type === eventType) {
          observer.next(message.data as T);
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  // Send message to server
  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.socket$.next(message);
    } else {
      console.warn('[LangGraph] Cannot send message: WebSocket not connected');
    }
  }

  // Start workflow via REST API (POST /devbrand/execute)
  startWorkflow(githubUsername: string, userId?: string): Observable<WorkflowExecution> {
    return this.http.post<WorkflowExecution>(`${this.config.apiUrl}/devbrand/execute`, {
      githubUsername,
      userId,
    });
  }

  disconnect(): void {
    this.socket$?.complete();
    this.connectionState.set('disconnected');
  }
}
```

### 2. AG-UI Protocol Implementation

**Based on AG-UI spec**: 16 event types with SSE/WebSocket transport

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LangGraphConnectionService } from './langgraph-connection.service';
import type { AGUIEvent, ProcessedEvent } from '../models';

// AG-UI Event Types (matching protocol specification)
export enum AGUIEventType {
  // Lifecycle Events
  RUN_STARTED = 'run_started',
  RUN_FINISHED = 'run_finished',

  // Message Events
  TEXT_MESSAGE_CONTENT = 'stream_update', // Your existing event
  TOKEN_UPDATE = 'token_update', // Your existing event

  // Tool Events
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_ARGS = 'tool_call_args',
  TOOL_CALL_END = 'tool_call_end',

  // State Events
  STATE_SNAPSHOT = 'state_snapshot',
  STATE_DELTA = 'state_delta',

  // HITL Events (your existing events)
  INTERRUPTION_REQUEST = 'interruption_request',
  INTERRUPTION_RESOLVED = 'interruption_resolved',

  // Error Events
  ERROR = 'error',
}

@Injectable({ providedIn: 'root' })
export class LangGraphProtocolService {
  private connection = inject(LangGraphConnectionService);

  // Process AG-UI events with type safety
  processEvent<T>(event: AGUIEvent<T>): Observable<ProcessedEvent<T>> {
    return new Observable((observer) => {
      switch (event.type) {
        case AGUIEventType.TEXT_MESSAGE_CONTENT:
          observer.next(this.processStreamUpdate(event.data));
          break;
        case AGUIEventType.TOKEN_UPDATE:
          observer.next(this.processTokenUpdate(event.data));
          break;
        case AGUIEventType.INTERRUPTION_REQUEST:
          observer.next(this.processApprovalRequest(event.data));
          break;
        // ... other event handlers
      }
    });
  }

  private processStreamUpdate(data: any): ProcessedEvent<any> {
    return { type: 'stream_update', data, timestamp: new Date() };
  }

  private processTokenUpdate(data: any): ProcessedEvent<any> {
    return { type: 'token_update', data, timestamp: new Date() };
  }

  private processApprovalRequest(data: any): ProcessedEvent<any> {
    return { type: 'approval_request', data, timestamp: new Date() };
  }
}
```

### 3. Streaming Service (RxJS-Powered)

**Leveraging your streaming module**: RxJS observables with token buffering

```typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { LangGraphConnectionService } from './langgraph-connection.service';
import { AGUIEventType } from './langgraph-protocol.service';
import type { TokenData, TokenUpdate } from '../models';

@Injectable({ providedIn: 'root' })
export class LangGraphStreamingService {
  private connection = inject(LangGraphConnectionService);

  private tokenSubject = new Subject<TokenData>();
  private bufferedTokens = new BehaviorSubject<string>('');

  // Signal-based state
  tokens = toSignal(this.bufferedTokens.asObservable(), { initialValue: '' });
  hasTokens = computed(() => this.tokens().length > 0);

  constructor() {
    this.setupTokenStreaming();
  }

  private setupTokenStreaming(): void {
    this.connection
      .on<TokenUpdate>(AGUIEventType.TOKEN_UPDATE)
      .pipe(
        map((update) => update.data.token),
        scan((acc, token) => acc + token, '') // Accumulate tokens
      )
      .subscribe((accumulated) => {
        this.bufferedTokens.next(accumulated);
      });
  }

  // Get accumulated token stream (typewriter effect)
  getTokenStream(): Observable<string> {
    return this.bufferedTokens.asObservable();
  }

  // Get individual tokens for custom handling
  getTokenEvents(): Observable<TokenData> {
    return this.tokenSubject.asObservable();
  }

  // Clear accumulated tokens
  clearTokens(): void {
    this.bufferedTokens.next('');
  }
}
```

### 4. State Synchronization (Bi-directional)

**AG-UI STATE_SNAPSHOT/STATE_DELTA pattern**:

```typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { withLatestFrom, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { LangGraphConnectionService } from './langgraph-connection.service';
import { AGUIEventType } from './langgraph-protocol.service';
import type { WorkflowState, StateSnapshot, StateDelta } from '../models';

@Injectable({ providedIn: 'root' })
export class LangGraphStateService {
  private connection = inject(LangGraphConnectionService);

  private workflowState$ = new BehaviorSubject<WorkflowState | null>(null);

  // Signal-based state
  workflowState = toSignal(this.workflowState$.asObservable(), { initialValue: null });
  currentAgent = computed(() => this.workflowState()?.currentAgent);
  currentStep = computed(() => this.workflowState()?.currentStep);
  isComplete = computed(() => this.workflowState()?.status === 'completed');

  constructor() {
    this.setupStateSyncing();
  }

  private setupStateSyncing(): void {
    // Receive state snapshots from backend
    this.connection.on<StateSnapshot>(AGUIEventType.STATE_SNAPSHOT).subscribe((snapshot) => {
      this.workflowState$.next(snapshot.state);
    });

    // Receive state deltas (incremental updates)
    this.connection
      .on<StateDelta>(AGUIEventType.STATE_DELTA)
      .pipe(
        withLatestFrom(this.workflowState$),
        map(([delta, currentState]) => this.applyDelta(currentState, delta))
      )
      .subscribe((newState) => {
        this.workflowState$.next(newState);
      });
  }

  private applyDelta(currentState: WorkflowState | null, delta: StateDelta): WorkflowState {
    if (!currentState) return delta.state;
    return { ...currentState, ...delta.state };
  }

  // Get current workflow state
  getState(): Observable<WorkflowState | null> {
    return this.workflowState$.asObservable();
  }

  // Update state (sends to backend)
  updateState(delta: Partial<WorkflowState>): void {
    this.connection['socket'].emit('state_update', delta);
  }
}
```

---

## 🎨 Prebuilt Angular Components

### 1. LangGraph Chat Component

**Similar to CopilotKit's `<CopilotChat />`** - Updated with latest Angular syntax:

```typescript
import {
  Component,
  OnInit,
  OnDestroy,
  input,
  output,
  signal,
  computed,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import type { WorkflowExecution, WorkflowResult, ApprovalRequest, Message } from '../../models';

@Component({
  selector: 'lg-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lg-chat-container" [class.lg-chat-sidebar]="placement() === 'sidebar'">
      <div class="lg-chat-header">
        <lg-agent-avatar [agent]="currentAgent()" />
        <h3>{{ title() }}</h3>
        <lg-status-badge [status]="connectionState()" />
      </div>

      <div class="lg-chat-messages" #messageContainer>
        @for (message of messages(); track message.id) {
        <lg-message [message]="message" [showAvatar]="true" [showTimestamp]="true" />
        } @if (isTyping()) {
        <lg-typing-indicator />
        }
      </div>

      <lg-input [disabled]="!isConnected()" (messageSent)="sendMessage($event)" />
    </div>
  `,
  styleUrls: ['./langgraph-chat.component.scss'],
})
export class LangGraphChatComponent implements OnInit, OnDestroy {
  private chat = inject(LangGraphChatService);
  private connection = inject(LangGraphConnectionService);
  private state = inject(LangGraphStateService);
  private streaming = inject(LangGraphStreamingService);

  // Inputs (signal-based)
  executionId = input<string>();
  title = input('DevBrand Workflow');
  placement = input<'popup' | 'sidebar' | 'fullscreen'>('popup');
  autoConnect = input(true);

  // Outputs
  workflowStarted = output<WorkflowExecution>();
  workflowCompleted = output<WorkflowResult>();
  approvalRequired = output<ApprovalRequest>();

  // ViewChild
  messageContainer = viewChild<ElementRef>('messageContainer');

  // Signal-based state
  messages = toSignal(this.chat.messages$, { initialValue: [] });
  connectionState = this.connection.connectionState;
  isConnected = this.connection.isConnected;
  currentAgent = this.state.currentAgent;
  isTyping = computed(() => this.streaming.hasTokens());

  constructor() {
    // Auto-scroll effect when messages change
    effect(() => {
      const container = this.messageContainer();
      const messagesCount = this.messages().length;

      if (container && messagesCount > 0) {
        container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      }
    });
  }

  ngOnInit(): void {
    if (this.autoConnect()) {
      this.connection.connect().subscribe();
    }

    const execId = this.executionId();
    if (execId) {
      this.connection.subscribeToExecution(execId);
    }
  }

  ngOnDestroy(): void {
    this.connection.disconnect();
  }

  sendMessage(content: string): void {
    this.chat.sendMessage({ role: 'user', content });
  }
}
```

### 2. Workflow Visualizer Component

**Real-time workflow execution visualization**:

```typescript
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import type { AgentInfo, WorkflowEvent } from '../../models';

@Component({
  selector: 'lg-workflow-visualizer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lg-workflow-visualizer">
      <div class="workflow-pipeline">
        @for (agent of agents(); track agent.id; let i = $index) {
        <div
          class="agent-node"
          [class.active]="currentAgent() === agent.id"
          [class.completed]="agent.status === 'completed'"
          [class.pending]="agent.status === 'pending'"
        >
          <div class="agent-icon">
            @switch (agent.status) { @case ('completed') {
            <span>✅</span>
            } @case ('in_progress') {
            <span>⏳</span>
            } @default {
            <span>⏸️</span>
            } }
          </div>

          <div class="agent-name">{{ agent.name }}</div>
          <div class="agent-status">{{ agent.status }}</div>

          @if (i < agents().length - 1) {
          <div class="connector"></div>
          }
        </div>
        }
      </div>

      <lg-workflow-timeline [events]="events()" />
    </div>
  `,
  styleUrls: ['./workflow-visualizer.component.scss'],
})
export class LangGraphWorkflowVisualizerComponent {
  private state = inject(LangGraphStateService);
  private protocol = inject(LangGraphProtocolService);

  // Inputs
  agents = input<AgentInfo[]>([
    { id: 'github-analyzer', name: 'GitHub Analyzer', status: 'pending' },
    { id: 'brand-strategist', name: 'Brand Strategist', status: 'pending' },
    { id: 'content-creator', name: 'Content Creator', status: 'pending' },
  ]);

  // Computed state
  currentAgent = this.state.currentAgent;
  events = toSignal(this.protocol.events$, { initialValue: [] });
}
```

### 3. HITL Approval Component

**Based on your `hitl-frontend-guide.md`**:

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import type { ApprovalRequest } from '../../models';

@Component({
  selector: 'lg-approval-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pendingApproval(); as approval) {
    <div class="lg-approval-overlay">
      <div class="lg-approval-modal">
        <div class="modal-header">
          <h2>🤔 Approval Required</h2>
          <span class="agent-badge">{{ approval.agentId }}</span>
        </div>

        <div class="modal-content">
          <p class="approval-message">{{ approval.message }}</p>

          @if (approval.metadata) {
          <div class="metadata">
            @switch (approval.agentId) { @case ('github-code-analyzer') {
            <p>✅ Achievements Found: {{ approval.metadata.achievementCount }}</p>
            <p>📂 Repositories: {{ approval.metadata.repositoriesAnalyzed }}</p>
            <p>🎯 Confidence: {{ approval.metadata.confidenceScore * 100 | number : '1.0-0' }}%</p>
            } @case ('personal-brand-strategist') {
            <p>📊 Strategy Type: {{ approval.metadata.strategyType }}</p>
            <p>⭐ Brand Score: {{ approval.metadata.brandScore * 100 | number : '1.0-0' }}%</p>
            } @case ('content-creator') {
            <p>💼 LinkedIn: {{ approval.metadata.linkedinLength }} characters</p>
            <p>📝 Dev.to: {{ approval.metadata.devtoLength }} characters</p>
            <p>
              📈 Engagement: {{ approval.metadata.linkedinEngagement * 100 | number : '1.0-0' }}%
            </p>
            } }
          </div>
          }

          <div class="timeout-indicator">
            ⏱️ Timeout: {{ approval.timeout / 60000 | number : '1.0-0' }} minutes
          </div>

          <textarea
            [(ngModel)]="feedback"
            placeholder="Optional feedback or modification request..."
            rows="3"
          >
          </textarea>
        </div>

        <div class="modal-actions">
          <button class="btn-approve" (click)="approve(approval, feedback())">✅ Approve</button>
          <button class="btn-modify" (click)="requestModification(approval, feedback())">
            ✏️ Request Changes
          </button>
          <button class="btn-reject" (click)="reject(approval, feedback())">❌ Reject</button>
        </div>
      </div>
    </div>
    }
  `,
  styleUrls: ['./approval-modal.component.scss'],
})
export class LangGraphApprovalModalComponent {
  private hitl = inject(LangGraphHITLService);

  // Signal-based state
  pendingApproval = toSignal(this.hitl.pendingApproval$);
  feedback = signal('');

  approve(approval: ApprovalRequest, feedback: string): void {
    this.hitl.approve(approval.interruptionId, feedback).subscribe();
    this.feedback.set('');
  }

  reject(approval: ApprovalRequest, reason: string): void {
    this.hitl.reject(approval.interruptionId, reason).subscribe();
    this.feedback.set('');
  }

  requestModification(approval: ApprovalRequest, request: string): void {
    this.hitl.requestModification(approval.interruptionId, request).subscribe();
    this.feedback.set('');
  }
}
```

---

## 🔧 Composable Functions (inject pattern)

**Angular's modern composable pattern for hook-like functionality**:

### 1. useLangGraphWorkflow

```typescript
import { inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

export function useLangGraphWorkflow(githubUsername: string) {
  const connection = inject(LangGraphConnectionService);
  const state = inject(LangGraphStateService);
  const streaming = inject(LangGraphStreamingService);

  const executionId = signal<string | null>(null);
  const workflowState = state.workflowState;
  const tokens = streaming.tokens;
  const isConnected = connection.isConnected;

  const startWorkflow = () => {
    connection.startWorkflow(githubUsername).subscribe((execution) => {
      executionId.set(execution.executionId);
      connection.subscribeToExecution(execution.executionId);
    });
  };

  return {
    executionId: executionId.asReadonly(),
    workflowState,
    tokens,
    isConnected,
    startWorkflow,
  };
}
```

### 2. useLangGraphChat

```typescript
export function useLangGraphChat() {
  const chat = inject(LangGraphChatService);
  const connection = inject(LangGraphConnectionService);

  const messages = toSignal(chat.messages$, { initialValue: [] });
  const isTyping = toSignal(chat.isTyping$, { initialValue: false });
  const connectionState = connection.connectionState;

  const sendMessage = (content: string) => {
    chat.sendMessage({ role: 'user', content });
  };

  const clearMessages = () => {
    chat.clearMessages();
  };

  return {
    messages,
    isTyping,
    connectionState,
    sendMessage,
    clearMessages,
  };
}
```

### 3. useLangGraphApproval

```typescript
export function useLangGraphApproval() {
  const hitl = inject(LangGraphHITLService);
  const http = inject(HttpClient);

  const pendingApproval = toSignal(hitl.pendingApproval$);
  const approvalHistory = toSignal(hitl.approvalHistory$, { initialValue: [] });

  const approve = (interruptionId: string, feedback?: string) => {
    return http.post('/hitl/approve', {
      interruptionId,
      decision: 'approved',
      feedback,
    });
  };

  const reject = (interruptionId: string, reason?: string) => {
    return http.post('/hitl/approve', {
      interruptionId,
      decision: 'rejected',
      feedback: reason,
    });
  };

  const requestModification = (interruptionId: string, request: string) => {
    return http.post('/hitl/approve', {
      interruptionId,
      decision: 'modified',
      feedback: request,
    });
  };

  return {
    pendingApproval,
    approvalHistory,
    approve,
    reject,
    requestModification,
  };
}
```

---

## 📦 Module Configuration

**Angular module with forRoot/forFeature pattern**:

```typescript
import { NgModule, ModuleWithProviders, Type, InjectionToken, Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const LANGGRAPH_CONFIG = new InjectionToken<LangGraphConfig>('LANGGRAPH_CONFIG');

@NgModule({
  providers: [
    LangGraphConnectionService,
    LangGraphProtocolService,
    LangGraphStateService,
    LangGraphStreamingService,
    LangGraphChatService,
    LangGraphHITLService,
  ],
})
export class LangGraphModule {
  static forRoot(config: LangGraphConfig): ModuleWithProviders<LangGraphModule> {
    return {
      ngModule: LangGraphModule,
      providers: [
        {
          provide: LANGGRAPH_CONFIG,
          useValue: config,
        },
        provideHttpClient(withInterceptors([authInterceptor, retryInterceptor])),
      ],
    };
  }

  static forFeature(components: Type<any>[]): ModuleWithProviders<LangGraphModule> {
    return {
      ngModule: LangGraphModule,
      providers: components,
    };
  }
}

// Configuration interface
export interface LangGraphConfig {
  apiUrl: string; // REST API base URL (http://localhost:3000)
  websocketUrl: string; // WebSocket URL (ws://localhost:8080/streaming)
  authToken?: string; // JWT token for authentication
  autoConnect?: boolean; // Auto-connect on initialization
  reconnection?: boolean; // Enable automatic reconnection
  reconnectionAttempts?: number; // Number of reconnection attempts
  reconnectionDelay?: number; // Delay between reconnection attempts (ms)
  enableLogging?: boolean; // Enable debug logging
  defaultTimeout?: number; // Default timeout for requests (ms)
}
```

**Usage in application**:

```typescript
// app.config.ts (Angular standalone - RECOMMENDED)
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LangGraphModule } from '@hive-academy/angular-langgraph';

export const appConfig: ApplicationConfig = {
  providers: [
    ...LangGraphModule.forRoot({
      apiUrl: environment.apiUrl,
      websocketUrl: environment.websocketUrl,
      authToken: environment.authToken,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      enableLogging: !environment.production,
    }).providers!,
    provideRouter(routes),
    provideAnimations(),
  ],
};
```

---

## 🚀 Quick Start Example

**Complete working example with latest Angular syntax**:

```typescript
// 1. Install library
// npm install @hive-academy/angular-langgraph socket.io-client

// 2. Configure in app.config.ts
import { ApplicationConfig } from '@angular/core';
import { LangGraphModule } from '@hive-academy/angular-langgraph';

export const appConfig: ApplicationConfig = {
  providers: [
    ...LangGraphModule.forRoot({
      apiUrl: 'http://localhost:3000',
      websocketUrl: 'ws://localhost:8080/streaming',
      autoConnect: true,
    }).providers!,
  ],
};

// 3. Use in component (Standalone API)
import { Component } from '@angular/core';
import { LangGraphChatComponent } from '@hive-academy/angular-langgraph';

@Component({
  selector: 'app-devbrand-workflow',
  standalone: true,
  imports: [LangGraphChatComponent],
  template: `
    <lg-chat
      [title]="'DevBrand AI Assistant'"
      [placement]="'sidebar'"
      (workflowStarted)="onWorkflowStarted($event)"
      (approvalRequired)="onApprovalRequired($event)"
    />
  `,
})
export class DevBrandWorkflowComponent {
  onWorkflowStarted(execution: WorkflowExecution) {
    console.log('Workflow started:', execution.executionId);
  }

  onApprovalRequired(approval: ApprovalRequest) {
    console.log('Approval required:', approval);
  }
}

// 4. Or use composables (functional approach)
import { Component, signal } from '@angular/core';
import { useLangGraphWorkflow } from '@hive-academy/angular-langgraph';

@Component({
  selector: 'app-devbrand-simple',
  standalone: true,
  template: `
    <div>
      <button (click)="workflow.startWorkflow()" [disabled]="!workflow.isConnected()">
        Start DevBrand Workflow
      </button>

      @if (workflow.workflowState(); as state) {
      <div>Current Agent: {{ state.currentAgent }}</div>
      }

      <div class="tokens">
        {{ workflow.tokens() }}
      </div>
    </div>
  `,
})
export class DevBrandSimpleComponent {
  githubUsername = signal('yourGithubUsername');
  workflow = useLangGraphWorkflow(this.githubUsername());
}
```

---

## 🎯 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Core services and connection infrastructure

- [ ] Create library structure with Nx
- [ ] Implement `LangGraphConnectionService` (WebSocket + REST)
- [ ] Implement `LangGraphProtocolService` (AG-UI events)
- [ ] Implement `LangGraphStateService` (bi-directional sync)
- [ ] Implement `LangGraphStreamingService` (RxJS token streaming)
- [ ] Create configuration module with `forRoot` pattern
- [ ] Unit tests for all core services (80% coverage)

**Deliverables**:

- `@hive-academy/angular-langgraph` NPM package
- Core services functional
- Basic WebSocket connection established
- Token streaming operational

---

### Phase 2: Components (Weeks 3-4)

**Goal**: Prebuilt UI components library

- [ ] `LangGraphChatComponent` (main chat interface)
- [ ] `LangGraphMessageComponent` (message bubbles)
- [ ] `LangGraphInputComponent` (user input)
- [ ] `LangGraphApprovalModalComponent` (HITL approvals)
- [ ] `LangGraphWorkflowVisualizerComponent` (workflow viz)
- [ ] `LangGraphWorkflowProgressComponent` (progress indicators)
- [ ] Shared components (typing indicator, avatars, badges)
- [ ] Component theming system (CSS variables)
- [ ] Storybook documentation for all components

**Deliverables**:

- Complete component library
- Storybook documentation
- Component unit tests (80% coverage)
- Accessibility compliance (WCAG 2.1 AA)

---

### Phase 3: Composables (Week 5)

**Goal**: Hook-like functional API

- [ ] `useLangGraphWorkflow` composable
- [ ] `useLangGraphChat` composable
- [ ] `useLangGraphApproval` composable
- [ ] `useLangGraphStreaming` composable
- [ ] `useLangGraphState` composable
- [ ] Integration examples for each composable
- [ ] Documentation with code examples

**Deliverables**:

- 5 composables
- Integration examples
- API documentation

---

### Phase 4: Directives & Pipes (Week 6)

**Goal**: Enhanced DX with Angular primitives

- [ ] `agStream` directive (streaming text binding)
- [ ] `agStateSync` directive (state synchronization)
- [ ] `agAction` directive (action handling)
- [ ] `markdown` pipe (markdown rendering)
- [ ] `tokenStream` pipe (token accumulation)
- [ ] `confidenceLevel` pipe (confidence display)
- [ ] `timeAgo` pipe (relative timestamps)
- [ ] Directive/pipe documentation

**Deliverables**:

- 3 directives + 4 pipes
- Usage examples
- Unit tests

---

### Phase 5: Integration & Documentation (Week 7)

**Goal**: Production-ready library

- [ ] Integration with dev-brand-ui (real-world testing)
- [ ] E2E tests with Playwright
- [ ] Performance optimization (bundle size, lazy loading)
- [ ] Comprehensive documentation site
- [ ] Migration guide from manual integration
- [ ] Best practices guide
- [ ] Troubleshooting guide
- [ ] Video tutorials

**Deliverables**:

- Working integration in dev-brand-ui
- Documentation site (Docusaurus/VitePress)
- E2E test suite
- Migration guide

---

### Phase 6: Advanced Features (Weeks 8-9)

**Goal**: Enterprise features

- [ ] Offline support with service worker
- [ ] State persistence (IndexedDB)
- [ ] Advanced error recovery
- [ ] Performance monitoring integration
- [ ] Analytics integration
- [ ] Multi-language support (i18n)
- [ ] Theme customization system
- [ ] Advanced caching strategies

**Deliverables**:

- Enterprise feature set
- Performance benchmarks
- Analytics dashboard
- Customization guide

---

## 📊 Comparison: CopilotKit vs Angular LangGraph

| Feature          | CopilotKit (React) | @hive-academy/angular-langgraph    |
| ---------------- | ------------------ | ---------------------------------- |
| **Framework**    | React only         | Angular only                       |
| **Backend**      | Generic LangGraph  | Your NestJS LangGraph ecosystem    |
| **Protocol**     | AG-UI (generic)    | AG-UI + custom NestJS events       |
| **Streaming**    | SSE/WebSocket      | WebSocket (Socket.io) + REST       |
| **State Mgmt**   | React hooks        | RxJS observables + Angular signals |
| **TypeScript**   | Good               | Excellent (full generic support)   |
| **HITL Support** | Basic              | Advanced (16-service HITL module)  |
| **Components**   | React components   | Angular standalone components      |
| **Directives**   | N/A                | Angular directives + pipes         |
| **Offline**      | Limited            | Built-in (Phase 6)                 |
| **Real-time**    | SSE (default)      | WebSocket (faster)                 |
| **Integration**  | Generic            | Tailored to your ecosystem         |

---

## 🎯 Key Differentiators

### 1. **Tighter Integration**

- Direct integration with your 12 LangGraph modules
- Optimized for your NestJS backend architecture
- Leverages your existing WebSocket infrastructure

### 2. **Superior TypeScript Support**

- Full generic type propagation
- Better IDE autocomplete
- Compile-time type safety for all events

### 3. **RxJS-Powered Reactivity**

- More powerful stream composition
- Better memory management
- Advanced operators for complex workflows

### 4. **Angular-Native DX**

- Signals for reactive state
- Directives for declarative templates
- Pipes for data transformation
- Dependency injection throughout

### 5. **Enterprise Features**

- Advanced HITL with 16 specialized services
- Multi-level approval chains
- ML confidence scoring
- Comprehensive audit logging

---

## 📝 Next Steps

1. **Review & Approval** - Review this architecture with your team
2. **Create Library Scaffold** - Set up Nx library structure
3. **Phase 1 Implementation** - Start with core services (2 weeks)
4. **Iterative Development** - Build, test, iterate on feedback
5. **Documentation** - Comprehensive docs as you build
6. **Community Feedback** - Beta testing with dev-brand-ui

---

## 🔗 Resources & References

### Your Ecosystem

- `frontend-integration-guide.md` - WebSocket + REST integration
- `hitl-frontend-guide.md` - HITL approval system
- Your 12 LangGraph modules - Full backend capabilities

### External References

- **AG-UI Protocol**: https://docs.ag-ui.com/introduction
- **CopilotKit**: https://github.com/CopilotKit/CopilotKit
- **Angular Signals**: https://angular.dev/guide/signals
- **Angular Standalone**: https://angular.dev/guide/standalone-components
- **RxJS**: https://rxjs.dev/
- **Socket.io Client**: https://socket.io/docs/v4/client-api/

---

## 📊 Conclusion

You have a **unique opportunity** to create the **first Angular-native LangGraph integration library** that:

1. ✅ Fills the gap left by CopilotKit (React-only)
2. ✅ Leverages your enterprise-grade NestJS ecosystem
3. ✅ Provides superior TypeScript + RxJS integration
4. ✅ Offers prebuilt components for rapid development
5. ✅ Includes advanced HITL and workflow visualization
6. ✅ Delivers production-ready, performant, accessible UI

**Estimated Timeline**: 9 weeks for complete library with all phases

**Estimated Effort**: 1-2 developers full-time

**Impact**: Game-changing developer experience for Angular + LangGraph applications
