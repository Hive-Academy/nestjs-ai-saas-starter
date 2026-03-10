# Implementation Plan - TASK_2025_059

## DevBrand Workflow Streaming UI/UX Overhaul

---

## Codebase Investigation Summary

### Libraries and Services Discovered

**Frontend (Angular UI)**:

- `DevBrandSseService` (apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-sse.service.ts)
  - Signal-based connection state, RxJS Subject for workflowUpdates$
  - Listens for SSE event name `workflow-update` and `workflow_complete` only
  - Auth ticket obtained via `AuthService.getSseTicket()` and appended to URL
- `DevBrandWorkflowStateService` (apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-workflow-state.service.ts)
  - Only processes `update.type === 'workflow-update'` (line 419), drops `message-stream`, `tool-execution`, `custom-stream`
  - `extractAgentId()` (line 990) expects `{domain}/{phase}/{activity}/{detail}` format, fails on actual node names like `github-code-analyzer`
  - `mapNodeNameToEventType()` (line 482) produces invalid types like `supervisor:route` that don't exist in StreamEventType enum
- `AuthService` (apps/dev-brand-ui/src/app/core/services/auth.service.ts)
  - Signal-based user state, `isAuthenticated$` computed signal
  - `loadUser()`, `login()`, `logout()`, `getSseTicket()` methods
- `authGuard` (apps/dev-brand-ui/src/app/core/guards/auth.guard.ts)
  - Functional CanActivateFn guard, already applied to `/devbrand-poc` route (app.routes.ts:23)

**Backend (NestJS)**:

- `DevBrandController` (apps/dev-brand-api/src/app/controllers/devbrand.controller.ts)
  - `POST /devbrand/execute` - no auth guard
  - `GET /devbrand/stream/:executionId` - no auth guard
  - Conversation endpoints use `@UseGuards(JwtAuthGuard)` already
  - SSE sends ALL domain events with SSE event type `workflow-update` (line 267-269)
- `StreamEventParser` (libs/langgraph-modules/workflow-engine/src/lib/streaming/parsers/stream-event.parser.ts)
  - Parses all chunk types: standard, subgraph, messages, custom, debug
  - Already filters empty chunks via `shouldSkipEvent()`
- `StreamEventTransformer` (libs/langgraph-modules/workflow-engine/src/lib/streaming/transformers/stream-event.transformer.ts)
  - Transforms parsed events to 5 DomainStreamEvent types: `workflow-update`, `tool-execution`, `message-stream`, `custom-stream`, `debug-stream`
  - `message-stream` events include `content`, `messageChunk` (with `tool_calls`), `nodeName`, `metadata`
- `DevBrandSupervisorWorkflow` (apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts)
  - Streams with `streamMode=['updates','messages','custom']`, `subgraphs=true`
  - Uses `StreamEventParser` + `StreamEventTransformer` pipeline
  - Yields `DomainStreamEvent` objects

### Patterns Identified

**Angular Component Pattern**:

- Standalone components with `inject()` pattern
- Signal-based state with `signal()`, `computed()`, readonly accessors
- Modern control flow (`@if`, `@for`, `@empty`)
- TailwindCSS utility classes
- `takeUntilDestroyed()` for subscription cleanup

**Backend Auth Pattern**:

- `JwtAuthGuard` validates JWT from HTTP-only cookie `access_token`
- Sets `request.user` and CLS context
- Conversation endpoints already guarded (evidence: devbrand.controller.ts:330,404,502)

**SSE Pattern**:

- Backend sends all events as SSE event type `workflow-update`
- Domain event type discrimination is in the JSON payload `type` field
- 4 domain types: `workflow-update`, `tool-execution`, `message-stream`, `custom-stream`

### Root Cause Analysis

1. **Events silently dropped**: `subscribeToSseEvents()` line 419 only processes `update.type === 'workflow-update'`, discarding `message-stream`, `tool-execution`, `custom-stream`
2. **Agent ID extraction broken**: `extractAgentId()` expects `{domain}/{phase}` format but actual node names are flat strings (`github-code-analyzer`, `supervisor`)
3. **Event type mapping broken**: `mapNodeNameToEventType()` produces `supervisor:route`, `agent:start` which are not valid `StreamEventType` enum values
4. **No streaming text accumulation**: No signal or buffer exists for LLM token streaming
5. **No supervisor visibility**: Supervisor events not recognized or displayed
6. **Empty chunks not filtered**: `message-stream` events with `content: ""` pass through

---

## Architecture Design

### Design Philosophy

**Chosen Approach**: Domain Event Router Pattern with Signal-Based State Machine

**Rationale**: The backend already emits well-structured domain events (`workflow-update`, `tool-execution`, `message-stream`, `custom-stream`). The frontend needs a proper domain event router that dispatches each type to its handler, instead of the current approach that treats everything as `workflow-update`.

**Evidence**:

- Backend `DomainStreamEvent` union type (stream-event.transformer.ts:109-116) defines exactly 5 event types
- Frontend already has the `MessageStreamEvent` interface (stream-events.model.ts:247-275) but never uses it
- Frontend `StreamEventType` enum (stream-events.model.ts:74-78) already includes `MESSAGE_STREAM`, `CUSTOM_STREAM` values

### Event Flow Architecture

```
Backend (LangGraph)
  |
  v
StreamEventParser.parseChunk() -> StreamEventTransformer.transformToDomainEvent()
  |
  v
DomainStreamEvent { type: 'workflow-update' | 'tool-execution' | 'message-stream' | 'custom-stream' }
  |
  v
SSE (event name: 'workflow-update', data: JSON DomainStreamEvent)
  |
  v
DevBrandSseService.workflowUpdates$ (receives ALL events, parses JSON)
  |
  v
DevBrandWorkflowStateService.processDomainEvent()  <-- NEW: Routes by payload.type
  |
  +-- type === 'workflow-update'  --> handleWorkflowUpdateEvent()  --> Update agent status, extraction
  +-- type === 'message-stream'   --> handleMessageStreamEvent()   --> Accumulate tokens, detect delegation
  +-- type === 'tool-execution'   --> handleToolExecutionEvent()   --> Update agent status, extract errors
  +-- type === 'custom-stream'    --> handleCustomStreamEvent()    --> Update progress percentage
  +-- type === 'workflow_complete' --> handleWorkflowComplete()     --> Set completed status
  |
  v
Signals: executionState, agentProgress, streamingText, timelineEntries, errors
  |
  v
UI Components (read signals reactively)
```

---

## Component Specifications

### Area 1: Event Processing Fixes (Service Layer)

#### Component 1.1: DevBrandWorkflowStateService Overhaul

**Purpose**: Fix event routing to process all 4 domain event types. Replace broken `extractAgentId()` and `mapNodeNameToEventType()` with direct node name matching.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-workflow-state.service.ts` (REWRITE)

**Evidence**:

- Current `subscribeToSseEvents()` line 419 only handles `update.type === 'workflow-update'`
- Current `extractAgentId()` line 990 expects `{domain}/{phase}` format
- Backend `DomainStreamEvent` types defined at stream-event.transformer.ts:109-116

**New State Signals**:

```typescript
// Existing (keep)
private readonly _executionState = signal<ExecutionState>({...});
private readonly _agentProgress = signal<AgentProgressMap>({...});
private readonly _hitlQueue = signal<HITLApproval[]>([]);
private readonly _eventHistory = new BehaviorSubject<StreamUpdate[]>([]);

// NEW: Streaming text buffers (per-agent + supervisor)
private readonly _streamingText = signal<Record<string, string>>({
  'supervisor': '',
  'github-code-analyzer': '',
  'personal-brand-strategist': '',
  'content-creator': '',
});

// NEW: Timeline entries for orchestration narrative
private readonly _timelineEntries = signal<TimelineEntry[]>([]);

// NEW: Error collection with agent attribution
private readonly _errors = signal<AgentError[]>([]);
```

**Agent Registry Map** (replaces broken extractAgentId):

```typescript
// Direct agent name lookup - matches actual LangGraph node names
private readonly AGENT_REGISTRY: Record<string, { id: string; name: string }> = {
  'supervisor': { id: 'supervisor', name: 'Supervisor' },
  'github-code-analyzer': { id: 'github-code-analyzer', name: 'GitHub Code Analyzer' },
  'personal-brand-strategist': { id: 'personal-brand-strategist', name: 'Personal Brand Strategist' },
  'content-creator': { id: 'content-creator', name: 'Content Creator' },
};
```

**Domain Event Router** (replaces current `subscribeToSseEvents`):

```typescript
private processDomainEvent(event: DomainEvent): void {
  switch (event.type) {
    case 'workflow-update':
      this.handleWorkflowUpdateEvent(event);
      break;
    case 'message-stream':
      this.handleMessageStreamEvent(event);
      break;
    case 'tool-execution':
      this.handleToolExecutionEvent(event);
      break;
    case 'custom-stream':
      this.handleCustomStreamEvent(event);
      break;
    case 'workflow_complete':
      this.handleWorkflowComplete(event);
      break;
    default:
      console.warn('Unknown domain event type:', event.type);
  }
}
```

**Key Handler Logic**:

`handleWorkflowUpdateEvent()`:

- Extract `nodeName` from event
- Look up agent in `AGENT_REGISTRY` by exact match on `nodeName` or `metadata.subgraphId`
- If agent found: update agent status to `executing`, set `currentAction`
- If supervisor: add timeline entry for routing decision

`handleMessageStreamEvent()`:

- Extract `nodeName` and `content` from event
- If `content` is non-empty string: append to streaming text buffer for that node
- If `messageChunk.tool_call_chunks` present: supervisor is delegating to an agent
  - Extract agent name from tool call
  - Set that agent's status to `delegated`
  - Add timeline entry: "Supervisor delegating to [Agent Name]"
- If `messageChunk.tool_calls` present (completed tool call): confirm delegation
- Update agent status to `thinking` when receiving content tokens

`handleToolExecutionEvent()`:

- Extract tool result data from `event.toolData`
- Look for `messages[]` array in toolData containing `ToolMessage` results
- If ToolMessage has error content: set agent status to `error`, store error
- If ToolMessage has success content: update agent progress
- Add timeline entry with tool name and success/failure

`handleCustomStreamEvent()`:

- Extract `percentage`, `message`, `agent` from `event.data`
- Update agent progress percentage and currentAction

**Agent ID Resolution** (replaces `extractAgentId`):

```typescript
private resolveAgentId(event: DomainEvent): string | null {
  // 1. Direct nodeName match
  const nodeName = event.nodeName || event.metadata?.langgraph_node;
  if (nodeName && this.AGENT_REGISTRY[nodeName]) {
    return nodeName;
  }

  // 2. Subgraph ID match (from subgraph metadata)
  const subgraphId = event.metadata?.subgraphId;
  if (subgraphId && this.AGENT_REGISTRY[subgraphId]) {
    return subgraphId;
  }

  // 3. Checkpoint namespace extraction (e.g., 'github-code-analyzer:uuid')
  const checkpointNs = event.metadata?.langgraph_checkpoint_ns;
  if (checkpointNs) {
    const agentName = checkpointNs.split(':')[0];
    if (this.AGENT_REGISTRY[agentName]) {
      return agentName;
    }
  }

  return null;
}
```

**Quality Requirements**:

- All 4 domain event types must be routed to handlers
- Zero events silently dropped (log unhandled types as warnings)
- Agent status transitions: idle -> delegated -> thinking -> executing -> completed/error
- Streaming text buffers must accumulate without clearing previous agents
- Timeline entries must preserve chronological order
- Max 10,000 events in history (older entries discarded)

#### Component 1.2: New Type Definitions

**Purpose**: Add types for timeline entries, agent errors, domain events, and extended agent status.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/models/stream-events.model.ts` (MODIFY)

**New interfaces to add**:

```typescript
/** Domain event as received from SSE - the actual JSON payload structure */
export interface DomainEvent {
  readonly type:
    | 'workflow-update'
    | 'tool-execution'
    | 'message-stream'
    | 'custom-stream'
    | 'workflow_complete';
  readonly executionId: string;
  readonly timestamp: string;

  // workflow-update specific
  readonly nodeName?: string;
  readonly state?: Record<string, unknown>;
  readonly metadata?: {
    readonly isSystemNode?: boolean;
    readonly isToolNode?: boolean;
    readonly isEmpty?: boolean;
    readonly isSubgraphEvent?: boolean;
    readonly subgraphId?: string;
    readonly namespacePath?: readonly string[];
    readonly [key: string]: unknown;
  };

  // message-stream specific
  readonly content?: string;
  readonly step?: number;
  readonly messageChunk?: {
    readonly id?: string;
    readonly type?: string;
    readonly content?: string;
    readonly tool_call_chunks?: ReadonlyArray<{
      readonly name?: string;
      readonly args?: string;
      readonly id?: string;
      readonly index?: number;
    }>;
    readonly tool_calls?: ReadonlyArray<{
      readonly name: string;
      readonly args: Record<string, unknown>;
      readonly id: string;
    }>;
    readonly additional_kwargs?: Record<string, unknown>;
    readonly response_metadata?: Record<string, unknown>;
  };

  // tool-execution specific
  readonly toolData?: Record<string, unknown>;

  // custom-stream specific
  readonly data?: Record<string, unknown>;
}
```

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/models/agent-progress.model.ts` (MODIFY)

```typescript
// Add 'delegated' to AgentStatus
export type AgentStatus =
  | 'idle'
  | 'delegated' // NEW: Supervisor has decided to delegate to this agent
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'completed'
  | 'error';
```

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/models/timeline.model.ts` (CREATE)

```typescript
export type TimelineEntryType =
  | 'delegation' // Supervisor delegating to agent
  | 'agent-start' // Agent begins working
  | 'agent-thinking' // Agent LLM generating
  | 'tool-execution' // Agent tool call
  | 'agent-complete' // Agent finished
  | 'agent-error' // Agent error
  | 'workflow-start' // Workflow began
  | 'workflow-complete'; // Workflow done

export interface TimelineEntry {
  readonly id: string;
  readonly type: TimelineEntryType;
  readonly timestamp: Date;
  readonly agentId?: string;
  readonly agentName?: string;
  readonly message: string;
  readonly detail?: string;
  readonly status: 'active' | 'completed' | 'error';
}

export interface AgentError {
  readonly agentId: string;
  readonly agentName: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly rawError?: unknown;
}
```

**Quality Requirements**:

- All interfaces must be readonly where immutability is expected
- `DomainEvent` must cover all fields from all 4 backend event types
- No `any` types

### Area 2: Backend Changes

#### Component 2.1: Empty Message-Stream Chunk Filtering

**Purpose**: Filter out `message-stream` events with empty `content` field before sending over SSE to reduce noise and network traffic.

**File**: `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts` (MODIFY)

**Pattern**: Add content check in `executeWithStreaming()` before yielding message-stream events.

```typescript
// In executeWithStreaming(), after transformToDomainEvent():
// Filter empty message-stream events
if (domainEvent.type === 'message-stream' && !domainEvent.content) {
  continue; // Skip empty token chunks
}
```

**Evidence**: The `StreamEventTransformer.transformToMessageEvent()` (stream-event.transformer.ts:243-267) extracts `content` from `messageChunk.content`. When LLM generates empty token chunks, `content` will be empty string `""`.

**Quality Requirements**:

- Only filter `message-stream` events with falsy `content`
- Never filter `workflow-update`, `tool-execution`, or `custom-stream` events
- Must not break the stream pipeline

### Area 3: Authentication Guards

#### Component 3.1: Backend Auth Guard on Execute and Stream

**Purpose**: Add `@UseGuards(JwtAuthGuard)` to `executeDevBrand()` and `streamWorkflow()` endpoints to prevent unauthenticated users from starting workflows.

**File**: `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts` (MODIFY)

**Changes**:

1. Add `@UseGuards(JwtAuthGuard)` to `executeDevBrand()` method (line 153)
2. The SSE stream endpoint (`streamWorkflow`) authenticates via the SSE ticket mechanism already in the frontend (`DevBrandSseService` line 184-196 calls `authService.getSseTicket()`). The ticket is appended as a query parameter. The backend needs to validate this ticket in the stream endpoint. If the backend already validates the ticket (check auth middleware), this may already work. If not, add ticket validation.
3. Pass `request.user.id` as `userId` in the `executeDevBrand()` method instead of requiring it from the client.

**Evidence**:

- Conversation endpoints already use `@UseGuards(JwtAuthGuard)` (devbrand.controller.ts:330,404,502)
- `JwtAuthGuard` reads JWT from `request.cookies.access_token` (jwt-auth.guard.ts:34)
- `executeDevBrand()` currently has no auth guard (devbrand.controller.ts:153)

**Quality Requirements**:

- Unauthenticated POST to `/devbrand/execute` must return 401 before workflow starts
- Auth context (userId) must propagate into workflow execution
- Existing SSE ticket mechanism for stream endpoint remains unchanged

#### Component 3.2: Frontend Auth Guard (Already Exists)

**Purpose**: Verify existing auth guard is properly configured.

**File**: `apps/dev-brand-ui/src/app/app.routes.ts` (NO CHANGE NEEDED)

**Evidence**: Route already has `canActivate: [authGuard]` (app.routes.ts:23). The `authGuard` function (core/guards/auth.guard.ts:24-39) checks `authService.isAuthenticated$()` and redirects to `/landing` with returnUrl.

**Status**: Already implemented correctly. No changes needed.

### Area 4: UI/UX Overhaul (Frontend Components)

#### Component 4.1: Orchestration Timeline Component

**Purpose**: Replace the raw JSON event stream with a conversation-thread style timeline showing supervisor decisions, agent activity, streaming text, tool executions, and errors.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/orchestration-timeline.component.ts` (CREATE)

**Responsibilities**:

- Render timeline entries from `_timelineEntries` signal in `DevBrandWorkflowStateService`
- Show supervisor delegation with arrow indicator
- Show agent activity with status icons (spinning for active, checkmark for done, X for error)
- Display streaming text in real-time within agent entries
- Show tool execution results as sub-entries
- Display errors prominently with red styling and readable message
- Auto-scroll to bottom on new entries

**Input Signals** (from state service):

- `timelineEntries: Signal<TimelineEntry[]>`
- `streamingText: Signal<Record<string, string>>`
- `agentProgress: Signal<AgentProgressMap>`
- `errors: Signal<AgentError[]>`

**Template Structure**:

```
<div class="orchestration-timeline">
  @for (entry of timelineEntries(); track entry.id) {
    @switch (entry.type) {
      @case ('delegation') {
        <!-- Supervisor delegation card -->
        <div class="flex items-start gap-3 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg">
          <!-- Arrow icon, supervisor label, agent name -->
        </div>
      }
      @case ('agent-start') / @case ('agent-thinking') {
        <!-- Agent working card -->
        <div class="flex items-start gap-3 p-4 border-l-4 rounded-r-lg" [class]="...">
          <!-- Status icon (spinning/static), agent name, current action -->
          <!-- Streaming text area (if agent has buffered text) -->
          @if (streamingText()[entry.agentId]) {
            <div class="streaming-text-area">{{ streamingText()[entry.agentId] }}</div>
          }
        </div>
      }
      @case ('tool-execution') {
        <!-- Tool sub-entry -->
        <div class="ml-8 p-3 bg-gray-50 border-l-2 border-gray-300 rounded">
          <!-- Tool name, result/error indicator -->
        </div>
      }
      @case ('agent-error') {
        <!-- Error card -->
        <div class="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <!-- Error icon, agent name, error message -->
        </div>
      }
      @case ('agent-complete') {
        <!-- Completion card -->
        <div class="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
          <!-- Checkmark, agent name, "Completed" -->
        </div>
      }
    }
  }
  @empty {
    <div class="text-center text-gray-400 py-8">
      Waiting for workflow to start...
    </div>
  }
</div>
```

**Quality Requirements**:

- Must render within 50ms of signal change (OnPush change detection)
- Streaming text must appear token-by-token without delay
- Auto-scroll to bottom on new entries (ViewChild for scroll container)
- Responsive on mobile (no horizontal scroll)
- Timeline entries must show in chronological order

#### Component 4.2: Agent Activity Panels Component

**Purpose**: Replace tiny truncated agent cards with full-width panels showing agent name, status, streaming text, tool results, and errors.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/agent-activity-panels.component.ts` (CREATE)

**Responsibilities**:

- Display full-width panel for each of the 3 agents
- Show complete agent name (no truncation)
- Status badge with color coding (idle/delegated/thinking/executing/completed/error)
- Active agent visually distinguished (border highlight, background color)
- Streaming text area when agent is generating LLM output
- Tool execution results display (tool name, success/failure)
- Error display with red styling and readable message

**Input Signals** (from state service):

- `agentProgress: Signal<AgentProgressMap>`
- `currentAgent: Signal<string | null>`
- `streamingText: Signal<Record<string, string>>`
- `errors: Signal<AgentError[]>`

**Template Structure**:

```
<div class="space-y-4">
  @for (agent of agents(); track agent.id) {
    <div class="rounded-lg border p-5 transition-all"
         [class.border-indigo-500]="currentAgent() === agent.id"
         [class.bg-indigo-50/50]="currentAgent() === agent.id"
         [class.border-gray-200]="currentAgent() !== agent.id">

      <!-- Header: Icon + Name + Status Badge -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ agent.icon }}</span>
          <div>
            <h4 class="font-semibold text-gray-900">{{ agent.name }}</h4>
            <p class="text-sm text-gray-500">{{ agent.description }}</p>
          </div>
        </div>
        <span class="status-badge">{{ agent.progress.status }}</span>
      </div>

      <!-- Current Action -->
      @if (agent.progress.currentAction) {
        <p class="text-sm text-gray-700 mb-3">{{ agent.progress.currentAction }}</p>
      }

      <!-- Streaming Text -->
      @if (agentStreamingText(agent.id)) {
        <div class="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg max-h-48 overflow-y-auto">
          {{ agentStreamingText(agent.id) }}
          <span class="animate-pulse">|</span>
        </div>
      }

      <!-- Error -->
      @if (agentError(agent.id)) {
        <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800 font-medium">Error</p>
          <p class="text-sm text-red-600">{{ agentError(agent.id).message }}</p>
        </div>
      }
    </div>
  }
</div>
```

**Quality Requirements**:

- Full agent names displayed without truncation
- Active agent panel visually distinct from inactive ones
- Streaming text area scrollable with max-height
- Error messages human-readable (not raw JSON)
- OnPush change detection

#### Component 4.3: Streaming Text Display Component

**Purpose**: Reusable component for displaying streaming LLM text with typing animation.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/streaming-text-display.component.ts` (CREATE)

**Input Properties**:

- `text: InputSignal<string>` - The accumulated text to display
- `isActive: InputSignal<boolean>` - Whether text is still streaming (shows cursor)
- `label: InputSignal<string>` - Label for the text block (e.g., "Supervisor Reasoning")

**Template**:

```
@if (text()) {
  <div class="rounded-lg border border-gray-200 overflow-hidden">
    @if (label()) {
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span class="text-xs font-medium text-gray-500 uppercase">{{ label() }}</span>
      </div>
    }
    <div class="p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
      {{ text() }}
      @if (isActive()) {
        <span class="animate-pulse text-indigo-500">|</span>
      }
    </div>
  </div>
}
```

#### Component 4.4: Debug Panel Component

**Purpose**: Collapsible section at the bottom showing raw event data for developer debugging.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/debug-panel.component.ts` (CREATE)

**Responsibilities**:

- Hidden by default (collapsed)
- Toggle button to expand/collapse
- Shows raw event stream (existing EventStreamComponent functionality)
- Event count badge
- Filter controls

**Template Structure**:

```
<div class="border-t border-gray-200 mt-8">
  <button (click)="toggleExpanded()" class="w-full py-3 flex items-center justify-between">
    <span class="text-sm font-medium text-gray-500">
      Debug Panel
      <span class="badge">{{ eventCount() }} events</span>
    </span>
    <svg [class.rotate-180]="expanded()"><!-- chevron --></svg>
  </button>

  @if (expanded()) {
    <div class="p-4">
      <!-- Reuse existing event stream logic with virtual scroll -->
      <app-event-stream />
    </div>
  }
</div>
```

#### Component 4.5: Page Layout Redesign

**Purpose**: Replace the current two-column Progress+Events split with a single-column orchestration narrative layout.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/pages/devbrand-poc-page.component.ts` (MODIFY)

**New Layout**:

```
Container (max-w-5xl, centered)
+-- Sidebar (280px, conversation list)
+-- Main Content
    +-- Header (title, description)
    +-- Execution Control (workflow trigger form)
    +-- Agent Activity Panels (3 full-width panels, always visible)
    +-- Orchestration Timeline (real-time narrative, primary content area)
    +-- Debug Panel (collapsed by default)
```

**Changes**:

- Remove two-column grid layout
- Replace `<app-progress-visualization />` with `<app-agent-activity-panels />`
- Replace `<app-event-stream />` with `<app-orchestration-timeline />`
- Add `<app-debug-panel />` at bottom (collapsed)
- Single-column main content area
- Import new components, remove old ones from imports array

**Template**:

```html
<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">DevBrand Workflow</h1>
    <p class="mt-2 text-gray-600">Real-time multi-agent workflow orchestration</p>
  </header>

  <div class="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
    <!-- Sidebar -->
    <div>
      <app-conversation-sidebar ... />
    </div>

    <!-- Main Content -->
    <div class="space-y-6">
      <!-- Execution Control -->
      <app-execution-control (executionStarted)="onExecutionStarted($event)" />

      <!-- Agent Activity Panels -->
      <app-agent-activity-panels />

      <!-- Orchestration Timeline (primary content) -->
      <app-orchestration-timeline />

      <!-- Debug Panel (collapsed) -->
      <app-debug-panel />
    </div>
  </div>
</div>
```

#### Component 4.6: Event Stream Component Refactor

**Purpose**: Keep existing `EventStreamComponent` for reuse inside the debug panel, but it is no longer the primary view.

**File**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/event-stream.component.ts` (KEEP - minor modifications)

**Changes**:

- No major changes needed - component already works for displaying raw events
- Remove the outer card wrapper (h3 title, shadow) since it will live inside debug panel
- Keep virtual scrolling, filtering, and event display logic

---

## Integration Architecture

### State Service to Component Data Flow

```
DevBrandWorkflowStateService (root service)
  |
  +-- executionState signal --> ExecutionControlComponent (isExecuting)
  +-- agentProgress signal --> AgentActivityPanelsComponent (agent panels)
  +-- currentAgent signal  --> AgentActivityPanelsComponent (active highlight)
  +-- streamingText signal --> OrchestrationTimelineComponent, AgentActivityPanelsComponent
  +-- timelineEntries signal -> OrchestrationTimelineComponent (narrative)
  +-- errors signal         --> OrchestrationTimelineComponent, AgentActivityPanelsComponent
  +-- eventHistory$         --> DebugPanelComponent -> EventStreamComponent (raw view)
```

### Message-Stream Event Detection for Supervisor Delegation

When the supervisor LLM decides to delegate to an agent, the `message-stream` event contains:

```json
{
  "type": "message-stream",
  "nodeName": "supervisor",
  "content": "",
  "messageChunk": {
    "tool_call_chunks": [{ "name": "github-code-analyzer", "args": "...", "id": "call_xxx" }]
  }
}
```

The `handleMessageStreamEvent()` handler must:

1. Check if `nodeName === 'supervisor'` and `messageChunk.tool_call_chunks` is non-empty
2. Extract agent name from `tool_call_chunks[0].name`
3. Set that agent's status to `delegated`
4. Add a timeline entry: "Supervisor: Delegating to GitHub Code Analyzer"

When the agent itself starts generating tokens, subsequent `message-stream` events come with the agent's own `nodeName` (via checkpoint namespace). These tokens accumulate in the agent's streaming text buffer.

### Tool Execution Error Detection

When a tool execution fails (e.g., "Approval operations require authentication"), the event looks like:

```json
{
  "type": "tool-execution",
  "toolData": {
    "messages": [{ "content": "Error: Approval operations require authentication", "type": "tool" }]
  }
}
```

The `handleToolExecutionEvent()` handler must:

1. Extract `toolData.messages` array
2. Check message content for error patterns
3. Determine agent attribution from context (most recent active agent)
4. Set agent status to `error`
5. Store error in `_errors` signal
6. Add error timeline entry

---

## File Change List

### CREATE (New Files)

| File                                                                                             | Purpose                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/models/timeline.model.ts`                       | Timeline entry and error interfaces |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/components/orchestration-timeline.component.ts` | Orchestration narrative timeline    |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/components/agent-activity-panels.component.ts`  | Full-width agent panels             |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/components/streaming-text-display.component.ts` | Reusable streaming text with cursor |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/components/debug-panel.component.ts`            | Collapsible raw event debug view    |

### MODIFY (Existing Files)

| File                                                                                             | Purpose                                                                          |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-workflow-state.service.ts`    | Complete event routing overhaul - domain event router, new signals, new handlers |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/models/stream-events.model.ts`                  | Add `DomainEvent` interface                                                      |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/models/agent-progress.model.ts`                 | Add `delegated` to `AgentStatus` type                                            |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/models/index.ts`                                | Export new model files                                                           |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/pages/devbrand-poc-page.component.ts`           | New page layout with new components                                              |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/components/event-stream.component.ts`           | Remove outer card wrapper for embedding in debug panel                           |
| `apps/dev-brand-ui/src/app/features/devbrand-poc/components/progress-visualization.component.ts` | Add `delegated` status styling                                                   |
| `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`                                  | Add `@UseGuards(JwtAuthGuard)` to execute and use authenticated userId           |
| `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`        | Filter empty message-stream chunks                                               |

---

## Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: Both frontend-developer and backend-developer

**Rationale**:

- Primary work is Angular frontend (80%): service overhaul, 5 new components, page layout redesign
- Minor backend work (20%): auth guard addition, empty chunk filtering
- Backend changes are straightforward (adding decorator, adding if-condition)
- Frontend changes require deep Angular signals knowledge and UX sense

**Recommended execution**:

1. Backend tasks first (auth guard + empty chunk filter) - quick, unblocks frontend
2. Frontend service layer (event routing overhaul, new types) - foundation for all UI
3. Frontend components (timeline, panels, streaming text, debug panel) - depends on service
4. Frontend page layout integration - final assembly

### Complexity Assessment

**Complexity**: HIGH
**Estimated Effort**: 12-18 hours

**Breakdown**:

- Type definitions (DomainEvent, TimelineEntry, AgentError, AgentStatus update): 1 hour
- WorkflowStateService rewrite (domain event router, all handlers, new signals): 4-5 hours
- Backend changes (auth guard, empty chunk filter): 1 hour
- OrchestrationTimelineComponent: 3-4 hours
- AgentActivityPanelsComponent: 2-3 hours
- StreamingTextDisplayComponent: 0.5 hours
- DebugPanelComponent: 1 hour
- Page layout redesign: 1-2 hours

### Files Affected Summary

**CREATE (5 files)**:

- `apps/dev-brand-ui/src/app/features/devbrand-poc/models/timeline.model.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/orchestration-timeline.component.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/agent-activity-panels.component.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/streaming-text-display.component.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/debug-panel.component.ts`

**MODIFY (9 files)**:

- `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-workflow-state.service.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/models/stream-events.model.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/models/agent-progress.model.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/models/index.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/pages/devbrand-poc-page.component.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/event-stream.component.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/progress-visualization.component.ts`
- `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`
- `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`

### Critical Verification Points

**Before Implementation, Team-Leader Must Ensure Developer Verifies**:

1. **All imports exist in codebase**:

   - `DomainStreamEvent` from `@hive-academy/langgraph-workflow-engine` (stream-event.transformer.ts:109)
   - `JwtAuthGuard` from `../auth/guards/jwt-auth.guard` (devbrand.controller.ts:21)
   - `authGuard` from `../../core/guards/auth.guard` (app.routes.ts:2)
   - `StreamEventParser` from `@hive-academy/langgraph-workflow-engine` (devbrand-supervisor.workflow.ts:7)
   - `signal`, `computed`, `inject` from `@angular/core`
   - `ScrollingModule` from `@angular/cdk/scrolling` (already imported in event-stream.component.ts:4)

2. **All patterns verified from examples**:

   - Signal-based service: devbrand-workflow-state.service.ts (lines 163-215)
   - Standalone component: execution-control.component.ts (line 76: `standalone: true`)
   - Functional guard: core/guards/auth.guard.ts (line 24: `CanActivateFn`)
   - Backend guard: devbrand.controller.ts (line 330: `@UseGuards(JwtAuthGuard)`)

3. **Library documentation consulted**:

   - `apps/dev-brand-ui/CLAUDE.md` (Angular patterns)
   - `apps/dev-brand-api/CLAUDE.md` (NestJS patterns)
   - `libs/langgraph-modules/workflow-engine/CLAUDE.md` (streaming patterns)

4. **No hallucinated APIs**:
   - All Angular APIs: `signal()`, `computed()`, `inject()`, `output()` - verified from existing components
   - All backend decorators: `@UseGuards()`, `@Injectable()`, `@Controller()` - verified from devbrand.controller.ts
   - `DomainStreamEvent` type: verified at stream-event.transformer.ts:109-116
   - `StreamEventParser.shouldSkipEvent()`: verified at stream-event.parser.ts:324-352

### Architecture Delivery Checklist

- [x] All components specified with evidence
- [x] All patterns verified from codebase
- [x] All imports/decorators verified as existing
- [x] Quality requirements defined
- [x] Integration points documented
- [x] Files affected list complete (14 files total)
- [x] Developer type recommended (both frontend + backend)
- [x] Complexity assessed (HIGH, 12-18 hours)
- [x] Event flow architecture documented
- [x] Agent ID resolution strategy documented
- [x] Supervisor delegation detection logic specified
- [x] Error attribution strategy specified
- [x] No step-by-step implementation (that's team-leader's job)
