# Implementation Plan - TASK_2025_060

## Implement @hive-academy/langgraph-angular Shared Angular Library

---

## Codebase Investigation Summary

### Libraries Discovered

- **@hive-academy/langgraph-angular**: Empty placeholder library with Nx project config, ng-packagr build, Jest testing
  - Entry point: `libs/langgraph-angular/src/index.ts` (exports only `LANGGRAPH_ANGULAR_VERSION`)
  - Build: `@nx/angular:package` via ng-packagr
  - TypeScript: Extends `tsconfig-angular.base.json`, `moduleResolution: bundler`, strict Angular templates
  - Source root: `libs/langgraph-angular/src`, `lib/` subfolder is empty

### POC Patterns Extracted (Evidence Sources)

**POC SSE Service** (`apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-sse.service.ts`):

- Pattern: `signal()` for connection state, `Subject` for event streams, `computed()` for derived state
- Auth: Injects `AuthService` directly, calls `getSseTicket()` to get token appended as query param
- Event listeners: `workflow-update`, `workflow_complete`, `workflow_error`, `onopen`, `onerror`
- Lifecycle: `connect(streamUrl)` / `disconnect()`, Subjects NOT completed on disconnect (reusable)
- Anti-pattern to fix: `providedIn: 'root'`, direct `AuthService` coupling, `any` type on workflowUpdates Subject

**POC Workflow State Service** (`apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-workflow-state.service.ts`):

- Pattern: Signal-based state (`_executionState`, `_agentProgress`, `_hitlQueue`), `BehaviorSubject` for event history
- Computed signals: `isExecuting`, `currentAgent`, `workflowProgress`, `hasPendingApprovals`
- Event processing: Switch on `StreamEventType` with dedicated handlers for all 20 event types
- Anti-patterns to fix: Hardcoded 3-agent map, hardcoded `phaseToAgent` mapping, `totalSteps: 3`, `providedIn: 'root'`

**POC Models** (`apps/dev-brand-ui/src/app/features/devbrand-poc/models/`):

- `stream-events.model.ts`: `StreamEventType` enum (20 values), `StreamUpdate<T>`, `TokenUpdate`, `StreamMetadata`, Zod schemas, type guards
- `execution-state.model.ts`: `ExecutionStatus` type, `ExecutionState` interface
- `agent-progress.model.ts`: `AgentStatus` type, `AgentProgress` interface
- Anti-patterns to fix: Domain-specific `extractAgentTypeFromNodeId` with hardcoded DevBrand mappings, WebSocket naming remnants

### Transport Investigation Results

- **SSE is the ONLY active transport**: Backend uses `@Sse()` + `Observable<MessageEvent>` pattern
- **No WebSocket gateway exists** (0 `*.gateway.ts` files)
- **POC SSE service is proven and working** - direct generalization target
- SSE event names from backend: `workflow-update`, `workflow_complete`, `workflow_error`

---

## Architecture Design (Codebase-Aligned)

### Design Philosophy

**Chosen Approach**: Generalize POC patterns into a configurable, generic library with `<TState>` parameterization.

**Rationale**: The POC has proven working patterns for SSE streaming, signal-based state management, and event processing. The library generalizes these by removing domain-specific coupling (hardcoded agents, direct AuthService injection) and adding configurability via `provideLangGraph(config)`.

**Key Architectural Decisions**:

| Decision              | Choice                                                      | Evidence                                                                                       |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| State management      | Angular Signals + computed                                  | POC uses this pattern successfully (devbrand-workflow-state.service.ts:163-315)                |
| Event history         | BehaviorSubject                                             | POC uses this for large event arrays (devbrand-workflow-state.service.ts:225)                  |
| Auth integration      | `tokenProvider` callback in config                          | Generalizes POC's direct AuthService.getSseTicket() injection (devbrand-sse.service.ts:72,184) |
| Node-to-agent mapping | `nodeIdMapper` callback in config                           | Generalizes POC's hardcoded phaseToAgent map (devbrand-workflow-state.service.ts:999-1014)     |
| Service provision     | `provideLangGraph(config)` returning `EnvironmentProviders` | Replaces POC's `providedIn: 'root'` pattern                                                    |
| Runtime validation    | Zod schemas                                                 | POC already uses Zod for stream event validation (stream-events.model.ts:485-560)              |
| Gen UI rendering      | `NgComponentOutlet` with input binding                      | Angular 17+ supports this natively (design doc pattern)                                        |

---

## Dependency Graph

```
Layer 1: Models (Foundation - no dependencies)
    |
    +---> Layer 2: SSE Service (depends on Layer 1 models + config token)
    |         |
    |         +---> Layer 3: State Service (depends on Layer 1 + Layer 2)
    |         |
    |         +---> Layer 4: Streaming Service (depends on Layer 1 + Layer 2)
    |
    +---> Layer 6: Gen UI (depends on Layer 1 models only, independent of streaming)
    |
    +---> Layer 5: Provider Function (depends on ALL services + tokens)
    |
    +---> Layer 7: Composables (depends on Layer 3, Layer 4 services)
    |
    +---> Layer 8: Public API (depends on ALL layers)
```

---

## Component Specifications

### Layer 1: Models and Types (Foundation)

#### File 1.1: `libs/langgraph-angular/src/lib/models/config.model.ts`

**Purpose**: Define the library configuration interface, connection state type, and injection tokens.

**Key Exports**:

- `LangGraphConfig` interface
- `ConnectionState` interface
- `LANGGRAPH_CONFIG` InjectionToken

**Implementation Pattern** (derived from POC connection state at devbrand-sse.service.ts:78-83):

````typescript
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Configuration for the LangGraph Angular integration.
 * Provided via provideLangGraph(config).
 */
export interface LangGraphConfig {
  /** Base URL for SSE stream endpoints (e.g., 'http://localhost:3000/api') */
  sseBaseUrl: string;

  /**
   * Optional token provider for authenticated SSE connections.
   * Returns an Observable that emits the auth token string.
   * The token is appended as ?token=<value> query parameter.
   *
   * @example
   * ```typescript
   * tokenProvider: () => inject(AuthService).getSseTicket()
   * ```
   */
  tokenProvider?: () => Observable<string>;

  /**
   * Optional mapper from LangGraph node IDs to application-specific agent IDs.
   * Returns the mapped agent ID, or null to skip the event.
   *
   * @example
   * ```typescript
   * nodeIdMapper: (nodeId) => {
   *   const phase = nodeId.split('/')[1];
   *   const map: Record<string, string> = {
   *     'github-analysis': 'github-code-analyzer',
   *     'brand-strategy': 'personal-brand-strategist',
   *   };
   *   return map[phase] ?? null;
   * }
   * ```
   */
  nodeIdMapper?: (nodeId: string) => string | null;

  /** Whether to reconnect on SSE error. Default: false (prevents reconnect loops). */
  reconnectOnError?: boolean;

  /**
   * SSE event names to listen for. Default: ['workflow-update', 'workflow_complete', 'workflow_error'].
   * These map to addEventListener(eventName, ...) on the EventSource.
   */
  eventTypes?: string[];

  /**
   * Optional base URL for HITL approval REST endpoints.
   * When provided, useLangGraphApproval() composable will POST approve/reject
   * decisions to the backend to resume interrupted workflows via Command({ resume: value }).
   *
   * The library will POST to:
   *   - `${approvalUrl}/${executionId}` with body { action: 'approve' | 'reject', feedback?: string }
   *
   * Pattern matches backend: POST /api/research/approve/:executionId
   * which calls WorkflowResumptionService.resumeWorkflow() with Command({ resume: value }).
   *
   * @example
   * ```typescript
   * approvalUrl: '/api/research/approve'
   * ```
   */
  approvalUrl?: string;
}

/** Connection state for SSE transport */
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError?: string;
}

/** Default SSE event types matching backend @Sse() pattern */
export const DEFAULT_SSE_EVENT_TYPES = [
  'workflow-update',
  'workflow_complete',
  'workflow_error',
] as const;

/** Injection token for LangGraph configuration */
export const LANGGRAPH_CONFIG = new InjectionToken<LangGraphConfig>('LANGGRAPH_CONFIG');
````

**Lines of Code Estimate**: ~60 lines
**Dependencies**: `@angular/core` (InjectionToken), `rxjs` (Observable)

---

#### File 1.2: `libs/langgraph-angular/src/lib/models/workflow-state.model.ts`

**Purpose**: Define the base workflow state interface, execution status, and agent progress types - all generic, no domain-specific content.

**Key Exports**:

- `ExecutionStatus` type
- `ExecutionState` interface (generalized from POC execution-state.model.ts)
- `AgentStatus` type
- `AgentProgress` interface (generalized from POC agent-progress.model.ts)
- `BaseWorkflowState` interface
- `HITLApproval` interface

**Implementation Pattern** (derived from POC execution-state.model.ts:29-144 and agent-progress.model.ts:33-160):

```typescript
/**
 * Possible execution statuses for a LangGraph workflow.
 */
export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/**
 * Execution state for tracking workflow lifecycle.
 * Generalized from POC - no hardcoded totalSteps or domain values.
 */
export interface ExecutionState {
  status: ExecutionStatus;
  executionId?: string;
  currentStep: number;
  totalSteps: number;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
}

/**
 * Possible agent statuses within a workflow.
 */
export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting' | 'completed' | 'error';

/**
 * Progress tracking for an individual agent/node in the workflow.
 * Generic - no hardcoded agent IDs or names.
 */
export interface AgentProgress {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  progress: number;
  currentAction: string | null;
  lastUpdate: Date;
}

/**
 * Base workflow state that consumers extend with TState.
 * Contains common fields present in any LangGraph workflow execution.
 */
export interface BaseWorkflowState {
  executionId: string;
  status: ExecutionStatus;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
}

/**
 * Human-in-the-loop approval request.
 */
export interface HITLApproval {
  id: string;
  executionId: string;
  agentId: string;
  message: string;
  context: unknown;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

/** Initial idle execution state factory */
export function createInitialExecutionState(): ExecutionState {
  return {
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
    startTime: null,
    endTime: null,
    error: null,
  };
}
```

**Lines of Code Estimate**: ~80 lines
**Dependencies**: None (pure TypeScript interfaces)

---

#### File 1.3: `libs/langgraph-angular/src/lib/models/stream-events.model.ts`

**Purpose**: Relocate and generalize the POC's StreamEventType enum, StreamUpdate/TokenUpdate interfaces, Zod schemas, and type guards. Remove all DevBrand-specific content (extractAgentTypeFromNodeId with hardcoded maps, WebSocket naming).

**Key Exports**:

- `StreamEventType` enum (all 20 values from POC)
- `StreamMetadata` interface
- `StreamUpdate<T>` interface
- `TokenUpdate` interface
- `MessageStreamEvent`, `CustomStreamEvent`, `DebugStreamEvent` interfaces
- `StreamError` interface (renamed from WebSocketError, updated error types)
- Zod schemas: `StreamMetadataSchema`, `StreamUpdateSchema`, `TokenUpdateSchema`, `StreamErrorSchema`, `MessageStreamEventSchema`, `CustomStreamEventSchema`, `DebugStreamEventSchema`
- Type guard functions: `isWorkflowEvent`, `isNodeEvent`, `isProgressEvent`, `isTokenEvent`, `isErrorEvent`, `isStreamDataEvent`, `isAgentEvent`, `isMessageStreamEvent`, `isCustomStreamEvent`, `isDebugStreamEvent`
- `parseNodeId` utility (generic, no hardcoded mappings)

**Generalization from POC** (stream-events.model.ts):

- Keep: All 20 `StreamEventType` enum values (lines 17-79)
- Keep: `StreamMetadata`, `StreamUpdate<T>`, `TokenUpdate` interfaces (lines 112-206)
- Keep: All Zod schemas (lines 485-662)
- Keep: All type guards (lines 683-984) EXCEPT `extractAgentTypeFromNodeId` (hardcoded DevBrand)
- Keep: `parseNodeId` utility (generic, lines 876-890)
- Rename: `WebSocketError` to `StreamError`, update type discriminators from `websocket_error` to `sse_error`
- Remove: `extractAgentTypeFromNodeId` (domain-specific, replaced by `nodeIdMapper` in config)
- Remove: `ConnectionState` (moved to config.model.ts with simplified shape)
- Remove: `SubscriptionConfirmed` (WebSocket artifact, not applicable to SSE)

**Lines of Code Estimate**: ~350 lines (large file but mostly type definitions and schemas)
**Dependencies**: `zod`

---

#### File 1.4: `libs/langgraph-angular/src/lib/models/index.ts`

**Purpose**: Barrel export for all models.

**Key Exports**: Re-exports from `config.model.ts`, `workflow-state.model.ts`, `stream-events.model.ts`

**Lines of Code Estimate**: ~5 lines
**Dependencies**: All model files

---

### Layer 2: Core SSE Service

#### File 2.1: `libs/langgraph-angular/src/lib/services/langgraph-sse.service.ts`

**Purpose**: Generic SSE connection service that handles EventSource lifecycle, authentication via configurable tokenProvider, event parsing, and error management.

**Key Exports**:

- `LangGraphSseService` class (Injectable, NOT providedIn: 'root')

**Generalization from POC** (devbrand-sse.service.ts):

- Replace `inject(AuthService)` with `inject(LANGGRAPH_CONFIG).tokenProvider` (config.model.ts)
- Replace hardcoded event names with `config.eventTypes ?? DEFAULT_SSE_EVENT_TYPES`
- Replace `providedIn: 'root'` with explicit provider via `provideLangGraph()`
- Type the `_workflowUpdates` Subject properly (no `any`)
- Remove excessive console.log emoji debugging (use structured logging)
- Keep: Signal-based connection state, Subject-based event streams, connect/disconnect lifecycle

**Public API**:

```typescript
@Injectable()
export class LangGraphSseService {
  // Injected config
  private readonly config = inject(LANGGRAPH_CONFIG);

  // State
  private eventSource?: EventSource;
  private readonly _connectionState = signal<ConnectionState>({ status: 'disconnected' });
  private readonly _workflowUpdates = new Subject<Record<string, unknown>>();
  private readonly _errors = new Subject<{ message: string; timestamp: Date }>();

  // Public readonly accessors
  readonly connectionState = this._connectionState.asReadonly();
  readonly workflowUpdates$ = this._workflowUpdates.asObservable();
  readonly errors$ = this._errors.asObservable();
  readonly isConnected = computed(() => this.connectionState().status === 'connected');

  // Methods
  connect(streamUrl: string): void { ... }
  disconnect(): void { ... }
  private registerEventListeners(): void { ... }
}
```

**Implementation Details**:

- `connect()`: If `tokenProvider` exists in config, subscribe to it and append token as query param; otherwise create EventSource directly
- `registerEventListeners()`: Loop over `config.eventTypes` (or defaults) and `addEventListener` for each, plus `onopen`/`onerror`
- `disconnect()`: Close EventSource, reset state, do NOT complete Subjects (service is reusable)
- Connection error handling: Set state to error, emit on errors$, disconnect to prevent reconnect loops (matching POC behavior at line 381-403)

**Lines of Code Estimate**: ~120 lines
**Dependencies**: Layer 1 (LANGGRAPH_CONFIG, ConnectionState, DEFAULT_SSE_EVENT_TYPES)

---

### Layer 3: State Management Service

#### File 3.1: `libs/langgraph-angular/src/lib/services/langgraph-workflow-state.service.ts`

**Purpose**: Generic signal-based state management service parameterized with `<TState>`. Maintains execution state, agent progress, HITL queue, and event history. Delegates node-to-agent mapping to consumer-provided `nodeIdMapper`.

**Key Exports**:

- `LangGraphWorkflowStateService` class (Injectable, NOT providedIn: 'root')

**Generalization from POC** (devbrand-workflow-state.service.ts):

- Remove hardcoded 3-agent initialization (lines 180-205): Start with empty `Record<string, AgentProgress>` - agents are dynamically discovered from events
- Remove hardcoded `phaseToAgent` map (lines 999-1014): Use `config.nodeIdMapper` instead
- Remove `totalSteps: 3` hardcoding: Let `totalSteps` be set dynamically or via `startExecution(streamUrl, options?)`
- Remove `providedIn: 'root'`
- Keep: All event processing handlers (workflow start/end/error, node start/end/error, progress, milestone, custom/HITL, stream data)
- Keep: Computed signals (isExecuting, currentAgent, workflowProgress, hasPendingApprovals)
- Keep: Event history with sequence gap detection
- Keep: `getEventsByType()`, `getEventsByAgent()` query methods

**Public API**:

```typescript
@Injectable()
export class LangGraphWorkflowStateService {
  // Injected dependencies
  private readonly sseService = inject(LangGraphSseService);
  private readonly config = inject(LANGGRAPH_CONFIG);

  // Core state signals
  private readonly _executionState = signal<ExecutionState>(createInitialExecutionState());
  private readonly _agentProgress = signal<Record<string, AgentProgress>>({});
  private readonly _hitlQueue = signal<HITLApproval[]>([]);
  private readonly _eventHistory = new BehaviorSubject<StreamUpdate[]>([]);

  // Public readonly accessors
  readonly executionState = this._executionState.asReadonly();
  readonly agentProgress = this._agentProgress.asReadonly();
  readonly hitlQueue = this._hitlQueue.asReadonly();
  readonly eventHistory$ = this._eventHistory.asObservable();

  // Computed signals
  readonly isExecuting = computed(() => this.executionState().status === 'running');
  readonly currentAgent = computed(() => { /* find first active agent */ });
  readonly workflowProgress = computed(() => { /* completed/total * 100 */ });
  readonly hasPendingApprovals = computed(() => this.hitlQueue().length > 0);

  // Methods
  startExecution(streamUrl: string): void { ... }
  reset(): void { ... }
  getEventsByType(type: StreamEventType): StreamUpdate[] { ... }
  getEventsByAgent(agentId: string): StreamUpdate[] { ... }

  // Private event handlers
  private subscribeToSseEvents(): void { ... }
  private processStreamUpdate(update: StreamUpdate): void { ... }
  private resolveAgentId(nodeId?: string): string | null { ... }  // Uses config.nodeIdMapper
  private handleWorkflowStart/End/Error(update): void { ... }
  private handleNodeStart/End/Error(update): void { ... }
  private handleProgressUpdate/Milestone(update): void { ... }
  private handleCustomEvent(update): void { ... }
  private handleStreamData(update): void { ... }
  private addToEventHistory(update): void { ... }
}
```

**Key Generalization Points**:

- `resolveAgentId(nodeId)`: Calls `this.config.nodeIdMapper?.(nodeId) ?? nodeId` - if no mapper provided, uses nodeId as-is
- `handleNodeStart()`: When a new agentId is encountered that doesn't exist in `_agentProgress`, dynamically adds it with default values (idle status)
- `startExecution()`: Accepts `streamUrl`, resets state, connects SSE - does NOT hardcode agent count or names
- `workflowProgress`: Computes from `Object.values(agentProgress())` dynamically regardless of agent count

**Lines of Code Estimate**: ~300 lines
**Dependencies**: Layer 1 (all models), Layer 2 (LangGraphSseService)

---

### Layer 4: Streaming Service

#### File 4.1: `libs/langgraph-angular/src/lib/services/langgraph-streaming.service.ts`

**Purpose**: Handles token accumulation, message buffering, and streaming text display for real-time LLM output. Batches high-frequency token updates to prevent excessive change detection.

**Key Exports**:

- `LangGraphStreamingService` class (Injectable, NOT providedIn: 'root')

**Public API**:

```typescript
@Injectable()
export class LangGraphStreamingService {
  private readonly sseService = inject(LangGraphSseService);

  // Internal state
  private readonly _currentStreamingText = signal<string>('');
  private readonly _streamingMessages = signal<StreamingMessage[]>([]);
  private readonly _isStreaming = signal<boolean>(false);
  private tokenBuffer: string[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;

  // Public readonly accessors
  readonly currentStreamingText = this._currentStreamingText.asReadonly();
  readonly streamingMessages = this._streamingMessages.asReadonly();
  readonly isStreaming = computed(() => this._isStreaming());
  readonly tokenCount = computed(() => this._currentStreamingText().length);

  // Methods
  startStreaming(): void { ... }
  stopStreaming(): void { ... }
  reset(): void { ... }

  // Private
  private processTokenEvent(data: Record<string, unknown>): void { ... }
  private processMessageStreamEvent(data: Record<string, unknown>): void { ... }
  private flushTokenBuffer(): void { ... }
}

/** A buffered streaming message from a specific node */
export interface StreamingMessage {
  nodeId: string;
  content: string;
  timestamp: Date;
  isComplete: boolean;
}
```

**Implementation Details**:

- Subscribes to `sseService.workflowUpdates$` and filters for token/message-stream events
- Token batching: Accumulates tokens in `tokenBuffer`, flushes every 50ms (configurable) to signal
- `processMessageStreamEvent()`: Buffers messages by nodeId, marks as complete on node:end
- `stopStreaming()`: Clears batch timer, flushes remaining tokens, marks all messages complete

**Lines of Code Estimate**: ~150 lines
**Dependencies**: Layer 1 (StreamEventType, TokenUpdate), Layer 2 (LangGraphSseService)

---

### Layer 5: Provider Function

#### File 5.1: `libs/langgraph-angular/src/lib/providers/provide-langgraph.ts`

**Purpose**: Single `provideLangGraph(config)` function that returns `EnvironmentProviders` with all services and the config injection token.

**Key Exports**:

- `provideLangGraph(config: LangGraphConfig): EnvironmentProviders`

**Implementation Pattern**:

````typescript
import { makeEnvironmentProviders, EnvironmentProviders } from '@angular/core';
import { LANGGRAPH_CONFIG, LangGraphConfig } from '../models/config.model';
import { LangGraphSseService } from '../services/langgraph-sse.service';
import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';
import { LangGraphStreamingService } from '../services/langgraph-streaming.service';
import { GenerativeUIRegistry } from '../gen-ui/generative-ui-registry.service';
import { LangGraphGenerativeUIService } from '../gen-ui/generative-ui.service';

/**
 * Provides all LangGraph Angular services and configuration.
 *
 * @param config - LangGraph configuration object
 * @returns EnvironmentProviders to add to application's providers array
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideLangGraph({
 *       sseBaseUrl: '/api',
 *       tokenProvider: () => inject(AuthService).getSseTicket(),
 *       nodeIdMapper: (nodeId) => nodeId.split('/')[1] ?? null,
 *     }),
 *   ],
 * };
 * ```
 */
export function provideLangGraph(config: LangGraphConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LANGGRAPH_CONFIG, useValue: config },
    LangGraphSseService,
    LangGraphWorkflowStateService,
    LangGraphStreamingService,
    GenerativeUIRegistry,
    LangGraphGenerativeUIService,
  ]);
}
````

**Lines of Code Estimate**: ~30 lines
**Dependencies**: All services, LANGGRAPH_CONFIG token

---

### Layer 6: Generative UI

#### File 6.1: `libs/langgraph-angular/src/lib/gen-ui/gen-ui.models.ts`

**Purpose**: Define interfaces for the generative UI component system.

**Key Exports**:

- `GeneratedComponent` interface
- `GenerativeUIState` interface

```typescript
import { Type } from '@angular/core';

/**
 * A dynamically generated component to be rendered via NgComponentOutlet.
 */
export interface GeneratedComponent {
  /** Unique identifier for tracking */
  id: string;
  /** Angular component class to render */
  component: Type<unknown>;
  /** Input bindings to pass to the component */
  inputs: Record<string, unknown>;
  /** Optional output event handlers */
  outputs?: Record<string, unknown>;
}

/**
 * State shape for generative UI within workflow state.
 */
export interface GenerativeUIState {
  components: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    events?: Record<string, unknown>;
  }>;
}
```

**Lines of Code Estimate**: ~30 lines
**Dependencies**: `@angular/core` (Type)

---

#### File 6.2: `libs/langgraph-angular/src/lib/gen-ui/generative-ui-registry.service.ts`

**Purpose**: Component registry for mapping string names to Angular component types. Used by agents to declaratively specify which components to render.

**Key Exports**:

- `GenerativeUIRegistry` class (Injectable, NOT providedIn: 'root')

```typescript
import { Injectable, Type } from '@angular/core';

/**
 * Registry for Angular components that can be dynamically rendered
 * by LangGraph agents via generative UI.
 */
@Injectable()
export class GenerativeUIRegistry {
  private readonly registry = new Map<string, Type<unknown>>();

  /**
   * Register a component by name.
   * @param name - Unique component identifier (used by agents)
   * @param component - Angular component class
   */
  register(name: string, component: Type<unknown>): void {
    this.registry.set(name, component);
  }

  /**
   * Retrieve a registered component by name.
   * @returns The component class, or undefined if not registered
   */
  get(name: string): Type<unknown> | undefined {
    return this.registry.get(name);
  }

  /** Check if a component is registered */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /** Get all registered component names */
  getRegisteredNames(): string[] {
    return Array.from(this.registry.keys());
  }
}
```

**Lines of Code Estimate**: ~40 lines
**Dependencies**: `@angular/core`

---

#### File 6.3: `libs/langgraph-angular/src/lib/gen-ui/generative-ui.service.ts`

**Purpose**: High-level service for bulk component registration and rendering components from agent workflow state.

**Key Exports**:

- `LangGraphGenerativeUIService` class (Injectable, NOT providedIn: 'root')

```typescript
import { Injectable, Type, inject } from '@angular/core';
import { GenerativeUIRegistry } from './generative-ui-registry.service';
import { GeneratedComponent, GenerativeUIState } from './gen-ui.models';

@Injectable()
export class LangGraphGenerativeUIService {
  private readonly registry = inject(GenerativeUIRegistry);

  /**
   * Bulk register multiple components.
   * @param components - Map of name to component class
   */
  registerComponents(components: Record<string, Type<unknown>>): void {
    for (const [name, component] of Object.entries(components)) {
      this.registry.register(name, component);
    }
  }

  /**
   * Map workflow state to renderable components using the registry.
   * Components not found in registry are skipped with a console warning.
   *
   * @param state - Workflow state containing generativeUI field
   * @returns Array of GeneratedComponent ready for LgDynamicComponent
   */
  renderFromAgentState(state: unknown): GeneratedComponent[] {
    const uiState = this.extractUIState(state);
    if (!uiState) return [];

    return uiState.components
      .map((def) => {
        const component = this.registry.get(def.type);
        if (!component) {
          console.warn(
            `[LangGraphGenerativeUI] Component "${def.type}" not found in registry. Skipping.`
          );
          return null;
        }
        return {
          id: def.id,
          component,
          inputs: def.props,
          outputs: def.events,
        } satisfies GeneratedComponent;
      })
      .filter((c): c is GeneratedComponent => c !== null);
  }

  private extractUIState(state: unknown): GenerativeUIState | null {
    if (typeof state === 'object' && state !== null && 'generativeUI' in state) {
      return (state as Record<string, unknown>)['generativeUI'] as GenerativeUIState;
    }
    return null;
  }
}
```

**Lines of Code Estimate**: ~60 lines
**Dependencies**: GenerativeUIRegistry, gen-ui.models

---

#### File 6.4: `libs/langgraph-angular/src/lib/gen-ui/lg-dynamic.component.ts`

**Purpose**: Standalone Angular component that dynamically renders an array of `GeneratedComponent` using `NgComponentOutlet`.

**Key Exports**:

- `LgDynamicComponent` (standalone component)

````typescript
import { Component, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { GeneratedComponent } from './gen-ui.models';

/**
 * Renders an array of dynamically generated components.
 * Uses Angular's NgComponentOutlet with input binding (Angular 17+).
 *
 * @example
 * ```html
 * <lg-dynamic [components]="generatedComponents()" />
 * ```
 */
@Component({
  selector: 'lg-dynamic',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @for (item of components(); track item.id) {
    <ng-container *ngComponentOutlet="item.component; inputs: item.inputs" />
    }
  `,
})
export class LgDynamicComponent {
  /** Array of generated components to render */
  readonly components = input.required<GeneratedComponent[]>();
}
````

**Lines of Code Estimate**: ~25 lines
**Dependencies**: `@angular/common` (NgComponentOutlet), gen-ui.models

---

### Layer 7: Composables

#### File 7.1: `libs/langgraph-angular/src/lib/composables/use-langgraph-workflow.ts`

**Purpose**: Convenience inject()-based composable that bundles workflow execution state signals and methods.

**Key Exports**:

- `useLangGraphWorkflow()` function

````typescript
import { inject } from '@angular/core';
import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';

/**
 * Composable for LangGraph workflow execution state.
 * Must be called within an injection context (constructor, inject(), or field initializer).
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class MyComponent {
 *   private readonly workflow = useLangGraphWorkflow();
 *
 *   start() {
 *     this.workflow.startExecution('/api/stream/exec-123');
 *   }
 * }
 * ```
 */
export function useLangGraphWorkflow() {
  const stateService = inject(LangGraphWorkflowStateService);

  return {
    executionState: stateService.executionState,
    agentProgress: stateService.agentProgress,
    isExecuting: stateService.isExecuting,
    currentAgent: stateService.currentAgent,
    workflowProgress: stateService.workflowProgress,
    startExecution: (streamUrl: string) => stateService.startExecution(streamUrl),
    reset: () => stateService.reset(),
  } as const;
}
````

**Lines of Code Estimate**: ~30 lines
**Dependencies**: Layer 3 (LangGraphWorkflowStateService)

---

#### File 7.2: `libs/langgraph-angular/src/lib/composables/use-langgraph-streaming.ts`

**Purpose**: Composable for real-time LLM streaming state.

**Key Exports**:

- `useLangGraphStreaming()` function

```typescript
import { inject } from '@angular/core';
import { LangGraphStreamingService } from '../services/langgraph-streaming.service';

/**
 * Composable for LangGraph token/message streaming state.
 * Must be called within an injection context.
 */
export function useLangGraphStreaming() {
  const streamingService = inject(LangGraphStreamingService);

  return {
    isStreaming: streamingService.isStreaming,
    currentStreamingText: streamingService.currentStreamingText,
    streamingMessages: streamingService.streamingMessages,
    tokenCount: streamingService.tokenCount,
  } as const;
}
```

**Lines of Code Estimate**: ~20 lines
**Dependencies**: Layer 4 (LangGraphStreamingService)

---

#### File 7.3: `libs/langgraph-angular/src/lib/composables/use-langgraph-approval.ts`

**Purpose**: Composable for HITL approval workflow.

**Key Exports**:

- `useLangGraphApproval()` function

```typescript
import { inject } from '@angular/core';
import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';

/**
 * Composable for HITL approval queue management.
 * Must be called within an injection context.
 */
export function useLangGraphApproval() {
  const stateService = inject(LangGraphWorkflowStateService);
  const config = inject(LANGGRAPH_CONFIG);
  const http = inject(HttpClient);

  return {
    hasPendingApprovals: stateService.hasPendingApprovals,
    hitlQueue: stateService.hitlQueue,

    /**
     * Approve a pending HITL request.
     * Updates local signal state AND posts to backend if approvalUrl is configured.
     * Backend resumes workflow via WorkflowResumptionService.resumeWorkflow() with Command({ resume: value }).
     */
    approve: (approvalId: string, feedback?: string): Observable<void> => {
      stateService.resolveApproval(approvalId, 'approved');

      if (config.approvalUrl) {
        const executionId = stateService.getApprovalExecutionId(approvalId);
        return http.post<void>(`${config.approvalUrl}/${executionId}`, {
          action: 'approve',
          feedback,
        });
      }
      return of(undefined);
    },

    /**
     * Reject a pending HITL request.
     * Updates local signal state AND posts to backend if approvalUrl is configured.
     */
    reject: (approvalId: string, reason?: string): Observable<void> => {
      stateService.resolveApproval(approvalId, 'rejected', reason);

      if (config.approvalUrl) {
        const executionId = stateService.getApprovalExecutionId(approvalId);
        return http.post<void>(`${config.approvalUrl}/${executionId}`, {
          action: 'reject',
          feedback: reason,
        });
      }
      return of(undefined);
    },
  } as const;
}
```

**Note**: This requires:

1. `resolveApproval(id, status, reason?)` method on `LangGraphWorkflowStateService` to update HITL queue signal
2. `getApprovalExecutionId(approvalId)` method on `LangGraphWorkflowStateService` to look up executionId from approval
3. `HttpClient` injection - consumers must have `provideHttpClient()` in their providers if using `approvalUrl`
4. Returns `Observable<void>` - consumers subscribe to handle success/error of backend call

**Lines of Code Estimate**: ~45 lines
**Dependencies**: Layer 3 (LangGraphWorkflowStateService), Layer 1 (LANGGRAPH_CONFIG), `@angular/common/http` (HttpClient), `rxjs` (of)

---

### Layer 8: Public API and Barrel Exports

#### File 8.1: `libs/langgraph-angular/src/index.ts` (MODIFY)

**Purpose**: Replace the version-only placeholder with comprehensive public API exports.

```typescript
/**
 * @hive-academy/langgraph-angular
 *
 * Angular integration library for LangGraph workflow streaming,
 * state management, and generative UI.
 */

// Version
export const LANGGRAPH_ANGULAR_VERSION = '0.0.1';

// Models
export * from './lib/models/index';

// Services
export { LangGraphSseService } from './lib/services/langgraph-sse.service';
export { LangGraphWorkflowStateService } from './lib/services/langgraph-workflow-state.service';
export {
  LangGraphStreamingService,
  StreamingMessage,
} from './lib/services/langgraph-streaming.service';

// Gen UI
export { GenerativeUIRegistry } from './lib/gen-ui/generative-ui-registry.service';
export { LangGraphGenerativeUIService } from './lib/gen-ui/generative-ui.service';
export { LgDynamicComponent } from './lib/gen-ui/lg-dynamic.component';
export * from './lib/gen-ui/gen-ui.models';

// Composables
export { useLangGraphWorkflow } from './lib/composables/use-langgraph-workflow';
export { useLangGraphStreaming } from './lib/composables/use-langgraph-streaming';
export { useLangGraphApproval } from './lib/composables/use-langgraph-approval';

// Provider
export { provideLangGraph } from './lib/providers/provide-langgraph';
```

**Lines of Code Estimate**: ~30 lines

---

## Interface Contracts Summary

### LangGraphConfig

```typescript
interface LangGraphConfig {
  sseBaseUrl: string;
  tokenProvider?: () => Observable<string>;
  nodeIdMapper?: (nodeId: string) => string | null;
  reconnectOnError?: boolean;
  eventTypes?: string[];
  approvalUrl?: string; // REST endpoint for HITL approve/reject (e.g., '/api/research/approve')
}
```

### BaseWorkflowState

```typescript
interface BaseWorkflowState {
  executionId: string;
  status: ExecutionStatus;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
}
// Consumer extends: interface MyWorkflowState extends BaseWorkflowState { myField: string; }
```

### AgentProgress (Generic)

```typescript
interface AgentProgress {
  agentId: string;
  agentName: string;
  status: AgentStatus; // 'idle' | 'thinking' | 'executing' | 'waiting' | 'completed' | 'error'
  progress: number; // 0-100
  currentAction: string | null;
  lastUpdate: Date;
}
```

### ExecutionState

```typescript
interface ExecutionState {
  status: ExecutionStatus; // 'idle' | 'running' | 'paused' | 'completed' | 'error'
  executionId?: string;
  currentStep: number;
  totalSteps: number;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
}
```

### GeneratedComponent

```typescript
interface GeneratedComponent {
  id: string;
  component: Type<unknown>;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}
```

### Service Public APIs

**LangGraphSseService**:

- `connectionState: Signal<ConnectionState>` (readonly)
- `workflowUpdates$: Observable<Record<string, unknown>>`
- `errors$: Observable<{ message: string; timestamp: Date }>`
- `isConnected: Signal<boolean>` (computed)
- `connect(streamUrl: string): void`
- `disconnect(): void`

**LangGraphWorkflowStateService**:

- `executionState: Signal<ExecutionState>` (readonly)
- `agentProgress: Signal<Record<string, AgentProgress>>` (readonly)
- `hitlQueue: Signal<HITLApproval[]>` (readonly)
- `eventHistory$: Observable<StreamUpdate[]>`
- `isExecuting: Signal<boolean>` (computed)
- `currentAgent: Signal<string | null>` (computed)
- `workflowProgress: Signal<number>` (computed)
- `hasPendingApprovals: Signal<boolean>` (computed)
- `startExecution(streamUrl: string): void`
- `reset(): void`
- `resolveApproval(approvalId: string, status: 'approved' | 'rejected', reason?: string): void`
- `getApprovalExecutionId(approvalId: string): string` (lookup executionId from HITL queue)
- `getEventsByType(type: StreamEventType): StreamUpdate[]`
- `getEventsByAgent(agentId: string): StreamUpdate[]`

**LangGraphStreamingService**:

- `currentStreamingText: Signal<string>` (readonly)
- `streamingMessages: Signal<StreamingMessage[]>` (readonly)
- `isStreaming: Signal<boolean>` (computed)
- `tokenCount: Signal<number>` (computed)
- `startStreaming(): void`
- `stopStreaming(): void`
- `reset(): void`

---

## Implementation Order

### Batch 1: Foundation (Layer 1 - Models)

Implement all model files first as they have zero dependencies.

**Files** (implement in order):

1. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\config.model.ts`
2. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\workflow-state.model.ts`
3. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\stream-events.model.ts`
4. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\index.ts`

**Commit**: `feat(angular-3d): add langgraph-angular models, types, and zod schemas`

**Estimated LOC**: ~515 lines

---

### Batch 2: Core SSE Service (Layer 2)

Implement the SSE service that depends on Layer 1 models.

**Files**: 5. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-sse.service.ts`

**Commit**: `feat(angular-3d): add langgraph-angular sse service`

**Estimated LOC**: ~120 lines

---

### Batch 3: State + Streaming Services (Layers 3 + 4)

These both depend on Layer 2 and can be implemented in sequence.

**Files**: 6. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-workflow-state.service.ts` 7. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-streaming.service.ts`

**Commit**: `feat(angular-3d): add langgraph-angular state and streaming services`

**Estimated LOC**: ~450 lines

---

### Batch 4: Gen UI (Layer 6)

Independent of streaming layers, can be done in parallel conceptually but ordered here for clarity.

**Files**: 8. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\gen-ui.models.ts` 9. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui-registry.service.ts` 10. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui.service.ts` 11. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\lg-dynamic.component.ts`

**Commit**: `feat(angular-3d): add langgraph-angular generative ui system`

**Estimated LOC**: ~155 lines

---

### Batch 5: Provider + Composables + Public API (Layers 5, 7, 8)

These depend on all services being complete.

**Files**: 12. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\providers\provide-langgraph.ts` 13. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-workflow.ts` 14. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-streaming.ts` 15. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-approval.ts` 16. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\index.ts` (MODIFY)

**Commit**: `feat(angular-3d): add langgraph-angular providers, composables, and public api`

**Estimated LOC**: ~135 lines

---

### Batch 6: Unit Tests

**Files**: 17. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\stream-events.model.spec.ts` 18. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-sse.service.spec.ts` 19. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-workflow-state.service.spec.ts` 20. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-streaming.service.spec.ts` 21. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui-registry.service.spec.ts` 22. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui.service.spec.ts` 23. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\lg-dynamic.component.spec.ts` 24. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-workflow.spec.ts`

**Commit**: `test(angular-3d): add langgraph-angular unit tests`

---

## Testing Strategy

### Layer 1: Models

- **Type guards**: Test each type guard with valid/invalid event data
- **Zod schemas**: Test `safeParse()` with valid data, invalid data, edge cases (missing fields, extra fields, type coercion)
- **parseNodeId**: Test with various node ID formats
- **No mocking needed**: Pure functions, no dependencies

### Layer 2: SSE Service

- **EventSource mock**: Create a mock EventSource class that simulates events
- **Connection lifecycle**: Test connect -> onopen -> connected state, disconnect -> disconnected state
- **Token provider**: Test with and without tokenProvider in config
- **Error handling**: Test onerror, workflow_error events
- **Event parsing**: Test JSON parsing of event data, malformed data handling
- **Guard clauses**: Test double-connect, disconnect without connect

### Layer 3: State Service

- **TestBed setup**: Provide mock LangGraphSseService and LANGGRAPH_CONFIG
- **Event processing**: Test each of the 20 StreamEventType handlers
- **Agent discovery**: Test dynamic agent creation on first node:start event
- **nodeIdMapper**: Test with custom mapper, default behavior (null mapper)
- **Computed signals**: Test isExecuting, currentAgent, workflowProgress, hasPendingApprovals
- **Event history**: Test sequence gap detection, getEventsByType, getEventsByAgent
- **HITL**: Test approval queue management (add, resolve)
- **Reset**: Test full state reset

### Layer 4: Streaming Service

- **Token batching**: Test that tokens are accumulated and flushed at batch interval
- **Message buffering**: Test message-stream event buffering by nodeId
- **Stream lifecycle**: Test startStreaming/stopStreaming state transitions
- **Signal updates**: Test currentStreamingText, tokenCount computed signals

### Layer 5: Provider Function

- **Integration test**: Call provideLangGraph(config), verify all services are injectable
- **Config injection**: Verify LANGGRAPH_CONFIG token provides correct config
- **Missing provider**: Test that services throw clear errors when provideLangGraph not called

### Layer 6: Gen UI

- **Registry**: Test register/get/has/getRegisteredNames
- **Service**: Test registerComponents bulk, renderFromAgentState with valid/invalid/missing components
- **Component**: TestBed component test with NgComponentOutlet rendering, track-by behavior

### Layer 7: Composables

- **Injection context**: Test that composables correctly delegate to underlying services
- **Return shape**: Verify returned object has all expected signals/methods

---

## Files Affected Summary

### CREATE (16 source files + 8 test files)

**Source Files**:

1. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\config.model.ts`
2. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\workflow-state.model.ts`
3. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\stream-events.model.ts`
4. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\index.ts`
5. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-sse.service.ts`
6. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-workflow-state.service.ts`
7. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-streaming.service.ts`
8. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\gen-ui.models.ts`
9. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui-registry.service.ts`
10. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui.service.ts`
11. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\lg-dynamic.component.ts`
12. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\providers\provide-langgraph.ts`
13. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-workflow.ts`
14. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-streaming.ts`
15. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-approval.ts`

**Test Files**: 16. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\stream-events.model.spec.ts` 17. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-sse.service.spec.ts` 18. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-workflow-state.service.spec.ts` 19. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-streaming.service.spec.ts` 20. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui-registry.service.spec.ts` 21. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui.service.spec.ts` 22. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\lg-dynamic.component.spec.ts` 23. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-workflow.spec.ts`

### MODIFY (1 file)

24. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\index.ts` - Replace placeholder with full public API

---

## Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: frontend-developer

**Rationale**:

- All work is Angular-based (services, components, signals, RxJS)
- Requires Angular DI knowledge (InjectionToken, makeEnvironmentProviders, inject())
- Requires Angular component patterns (standalone, NgComponentOutlet, input())
- Requires RxJS knowledge (Subject, BehaviorSubject, Observable)
- No NestJS/backend work involved

### Complexity Assessment

**Complexity**: MEDIUM-HIGH
**Estimated Effort**: 6-10 hours

**Breakdown**:

- Batch 1 (Models): ~1.5 hours - Mostly type definitions and Zod schemas, relocated from POC
- Batch 2 (SSE Service): ~1 hour - Generalize POC pattern, straightforward
- Batch 3 (State + Streaming): ~2 hours - Most complex batch, event processing logic
- Batch 4 (Gen UI): ~1 hour - New code but well-defined from design doc
- Batch 5 (Provider + Composables + API): ~0.5 hours - Thin wrappers
- Batch 6 (Tests): ~2-3 hours - Comprehensive test coverage

### Critical Verification Points

**Before Implementation, Developer Must Verify**:

1. **All Angular APIs exist**:

   - `makeEnvironmentProviders` from `@angular/core` (Angular 15+)
   - `input()` signal-based input from `@angular/core` (Angular 17.1+)
   - `NgComponentOutlet` input binding from `@angular/common` (Angular 17+)
   - `signal()`, `computed()`, `inject()` from `@angular/core` (Angular 16+)

2. **Zod is available**:

   - Verify `zod` is in workspace dependencies (used by POC at stream-events.model.ts:1)

3. **Build system**:

   - Verify `ng-packagr` handles barrel exports correctly
   - Run `npx nx build @hive-academy/langgraph-angular` after each batch

4. **No circular dependencies**:
   - Models -> Services -> Provider (one-way dependency flow)
   - Composables -> Services (one-way)
   - Gen UI is independent of streaming services

### Architecture Delivery Checklist

- [x] All components specified with evidence (POC file:line citations)
- [x] All patterns verified from codebase (POC services analyzed)
- [x] All imports/decorators verified as existing (Angular core APIs)
- [x] Quality requirements defined (80% test coverage, zero any types)
- [x] Integration points documented (SSE EventSource, tokenProvider callback)
- [x] Files affected list complete (15 source + 8 test + 1 modify)
- [x] Developer type recommended (frontend-developer)
- [x] Complexity assessed (MEDIUM-HIGH, 6-10 hours)
- [x] Implementation order defined (6 batches respecting dependency graph)
- [x] No step-by-step implementation (team-leader decomposes into tasks)
