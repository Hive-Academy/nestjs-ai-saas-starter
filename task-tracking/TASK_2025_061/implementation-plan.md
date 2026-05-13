# Implementation Plan - TASK_2025_061

## Researcher Pages Streaming UI/UX Enhancement

---

## Codebase Investigation Summary

### Libraries and Patterns Discovered

**DevBrand POC Reference Pattern** (TASK_2025_059):

- `DevBrandSseService` (devbrand-poc/services/devbrand-sse.service.ts): SSE connection management with EventSource, auth ticket, Subject-based event streams
- `DevBrandWorkflowStateService` (devbrand-poc/services/devbrand-workflow-state.service.ts:104-991): 900+ line signal-based state management with domain event routing for multi-agent supervisor
- `AGENT_REGISTRY` (devbrand-poc/models/agent-registry.const.ts): AgentRegistryEntry interface for node name mapping
- `TimelineEntry` / `TimelineEntryType` (devbrand-poc/models/timeline.model.ts): Timeline model with types like delegation, agent-start, tool-execution, etc.
- `DomainEvent` (devbrand-poc/models/stream-events.model.ts:480-542): Unified SSE payload interface covering all domain event types
- `StreamingTextDisplayComponent` (devbrand-poc/components/streaming-text-display.component.ts): Pure presentational component with `text`, `isActive`, `label` inputs
- `OrchestrationTimelineComponent` (devbrand-poc/components/orchestration-timeline.component.ts): Timeline UI with @switch on entry.type
- `DebugPanelComponent` (devbrand-poc/components/debug-panel.component.ts): Collapsible debug panel using EventStreamComponent

**Current Research Chat** (what needs to change):

- `ResearchService` (research-chat/services/research.service.ts:88-208): Handles SSE via direct EventSource in Observable, registers 4 of 6 event types (missing `llm-token` and `custom-progress`)
- `ResearchChatComponent` (research-chat/research-chat.component.ts:1-605): Monolithic 605-line component with plain class properties, event handling, tool formatting, all in one file
- `ApprovalModalComponent` (research-chat/components/approval-modal.component.ts): Working HITL modal with `visible` and `reportDraft` inputs, `approve`/`reject` outputs - MUST PRESERVE
- `ConversationSidebarComponent`: Shared component, already imported - MUST PRESERVE

**Backend SSE Events** (research-chat.controller.ts:240-363):
The backend emits these SSE event names (type field in EventSource addEventListener):

1. `workflow-update` (line 248) - node execution updates, also checks for HITL interrupt and completion
2. `tool-execution` (line 306) - tool call results
3. `llm-token` (line 313) - remapped from `message-stream`, contains `{type, executionId, nodeName, token, step, messageChunk, timestamp}`
4. `custom-progress` (line 330) - remapped from `custom-stream`, contains `{type, executionId, progress: {agent, stage, message, percentage}, timestamp}`
5. `debug-trace` (line 348) - debug events in dev mode, contains `{type, executionId, eventType, taskName, payload, timestamp}`
6. `interruption_request` (line 270) - HITL approval request, contains `{type, executionId, message, reportDraft, approvalRequest, timestamp}`
7. `workflow_complete` (line 291) - completion, contains `{type, executionId, finalState, timestamp}`

### Key Differences: DevBrand Multi-Agent vs Research Single-Agent

| Aspect         | DevBrand (Multi-Agent)                                                               | Research (Single-Agent)                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Agents         | supervisor + 3 worker agents                                                         | 1 researcher agent                                                                                                                |
| State service  | 900+ lines, multi-agent progress map, delegation detection                           | ~300-400 lines, single agent phase tracking                                                                                       |
| Timeline types | delegation, agent-start, agent-thinking, tool-execution, agent-complete, agent-error | research-start, searching, reading-source, synthesizing, report-draft, approval-waiting, research-complete, tool-execution, error |
| SSE service    | Dedicated DevBrandSseService with auth, connection management                        | Currently inline in ResearchService Observable                                                                                    |
| Streaming text | Per-agent buffers (Record<string, string>)                                           | Single buffer (string)                                                                                                            |
| HITL           | Not implemented                                                                      | Already working (approval modal)                                                                                                  |

---

## Architecture Design

### Design Philosophy

**Chosen Approach**: Adapted DevBrand signal-based state pattern for single-agent research workflow.

**Rationale**: The DevBrand pattern is proven and working in the codebase. The research adaptation is simpler because there is only one agent with tool calls, no supervisor delegation, and no multi-agent coordination. The state service will be ~300-400 lines instead of 900+.

**Key Decisions**:

1. **REUSE StreamingTextDisplayComponent directly** - import from devbrand-poc/components (Evidence: streaming-text-display.component.ts is a pure presentational component with no service dependencies)
2. **REUSE AgentRegistryEntry interface** - import from devbrand-poc/models/agent-registry.const.ts (Evidence: interface is generic enough)
3. **CREATE research-specific timeline types** - DevBrand timeline types are multi-agent focused (delegation, agent-start). Research needs phase-focused types (searching, reading-source, synthesizing)
4. **CREATE research-specific SSE service** - Unlike DevBrand which has a dedicated SSE service, the research SSE logic is embedded in ResearchService. We need to add the missing event listeners.
5. **CREATE research-specific workflow state service** - Simpler version of DevBrandWorkflowStateService for single-agent
6. **CREATE research-specific timeline component** - Different entry types require different template
7. **CREATE research-specific debug panel** - Follows DebugPanelComponent pattern but works with research state service
8. **PRESERVE ApprovalModalComponent** - Already works, just change how it's wired (read from signals)
9. **PRESERVE ConversationSidebarComponent** - Already works, no changes needed

### Event Flow Diagram

```
Backend (research-chat.controller.ts)
  |
  | SSE Events via EventSource
  |
  v
ResearchService (research.service.ts) - MODIFIED
  |-- addEventListener('workflow-update', ...)     [EXISTING]
  |-- addEventListener('tool-execution', ...)      [EXISTING]
  |-- addEventListener('llm-token', ...)           [NEW]
  |-- addEventListener('custom-progress', ...)     [NEW]
  |-- addEventListener('debug-trace', ...)         [NEW]
  |-- addEventListener('interruption_request', ...) [EXISTING]
  |-- addEventListener('workflow_complete', ...)    [EXISTING]
  |
  | Observable<ResearchDomainEvent>
  |
  v
ResearchWorkflowStateService (NEW)
  |-- processDomainEvent(event) - switch/case router
  |     |-- 'workflow-update' -> updatePhase, addTimelineEntry
  |     |-- 'llm-token' -> accumulate streamingText
  |     |-- 'tool-execution' -> addToolTimelineEntry, updatePhase
  |     |-- 'custom-progress' -> update progress
  |     |-- 'interruption_request' -> set hitlApproval
  |     |-- 'workflow_complete' -> set completed, addTimelineEntry
  |     |-- 'debug-trace' -> store in eventHistory
  |
  | Signals (readonly)
  |
  v
ResearchChatComponent (REWRITTEN ~180 lines)
  |-- reads signals from state service
  |-- delegates user actions to service methods
  |
  +-- ConversationSidebarComponent (PRESERVED)
  +-- ResearchTimelineComponent (NEW) - reads timelineEntries signal
  |     +-- StreamingTextDisplayComponent (REUSED from devbrand-poc)
  +-- ResearchDebugPanelComponent (NEW) - reads eventHistory
  +-- ApprovalModalComponent (PRESERVED) - reads hitlApproval signal
  +-- Input area (inline in template)
```

### Signal Architecture

#### ResearchWorkflowStateService Signals

```typescript
// --- Primary State Signals ---

/** Execution lifecycle: 'idle' | 'running' | 'completed' | 'error' */
private readonly _executionStatus = signal<'idle' | 'running' | 'completed' | 'error'>('idle');

/** Current research phase: 'idle' | 'started' | 'searching' | 'reading' | 'synthesizing' | 'report-draft' | 'approval' | 'saving' | 'completed' | 'error' */
private readonly _currentPhase = signal<ResearchPhase>('idle');

/** Accumulated LLM streaming text (single buffer - one agent) */
private readonly _streamingText = signal<string>('');

/** Whether tokens are actively being received */
private readonly _isStreaming = signal<boolean>(false);

/** Timeline entries array (capped at 500) */
private readonly _timelineEntries = signal<ResearchTimelineEntry[]>([]);

/** HITL approval state (null when no pending approval) */
private readonly _hitlApproval = signal<ResearchHitlApproval | null>(null);

/** Error collection */
private readonly _errors = signal<ResearchError[]>([]);

/** Custom progress (percentage + message) */
private readonly _progress = signal<{ percentage: number; message: string } | null>(null);

/** Raw event history for debug panel (capped at 5000) */
private readonly _eventHistory = signal<ResearchRawEvent[]>([]);

// --- Computed Signals ---

readonly isExecuting = computed(() => this._executionStatus() === 'running');
readonly hasPendingApproval = computed(() => this._hitlApproval() !== null);
readonly hasErrors = computed(() => this._errors().length > 0);
readonly eventCount = computed(() => this._eventHistory().length);
```

### Component Hierarchy

```
ResearchChatComponent (container, ~180 lines)
  |
  +-- ConversationSidebarComponent [PRESERVED, shared component]
  |     workflowType="researcher"
  |     [userId], [currentThreadId]
  |     (conversationSelected), (newConversationCreated)
  |
  +-- Main Content Area
  |   |
  |   +-- ResearchTimelineComponent [NEW]
  |   |     Reads: stateService.timelineEntries()
  |   |     Reads: stateService.streamingText()
  |   |     Reads: stateService.isStreaming()
  |   |     Contains: StreamingTextDisplayComponent [REUSED from devbrand-poc]
  |   |
  |   +-- Input Area [inline in component template]
  |   |     (submit)="sendMessage()"
  |   |     [disabled]="stateService.isExecuting()"
  |   |
  |   +-- ResearchDebugPanelComponent [NEW]
  |   |     Reads: stateService.eventHistory()
  |   |     Reads: stateService.eventCount()
  |   |
  |   +-- ApprovalModalComponent [PRESERVED]
  |         [visible]="stateService.hasPendingApproval()"
  |         [reportDraft]="stateService.hitlApproval()?.reportDraft || ''"
  |         (approve)="onApprovalDecision(true)"
  |         (reject)="onApprovalDecision(false)"
```

---

## Component Specifications

### Component 1: ResearchService (MODIFY)

**Purpose**: Add missing SSE event listeners for `llm-token`, `custom-progress`, and `debug-trace`. Change the Observable to emit a unified `ResearchDomainEvent` type instead of the current `ResearchWorkflowEvent`.

**File**: `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts`
**Action**: MODIFY

**Pattern**: Follows the existing addEventListener pattern already in the file (lines 98-192), adding 3 more listeners.

**Changes**:

1. Replace `ResearchWorkflowEvent` interface with `ResearchDomainEvent` interface that covers all 7 SSE event types
2. Add `addEventListener('llm-token', ...)` handler that parses the event and emits `{ type: 'llm-token', ... }`
3. Add `addEventListener('custom-progress', ...)` handler that parses the event and emits `{ type: 'custom-progress', ... }`
4. Add `addEventListener('debug-trace', ...)` handler that parses the event and emits `{ type: 'debug-trace', ... }`
5. Update existing event handlers to use the new event type structure (use the backend's native field names instead of re-mapping to `state_update`, `task_complete`, etc.)
6. Remove the old `ResearchWorkflowEvent` interface entirely
7. Keep `startResearch()`, `approveReport()`, `listReports()`, `readReport()` methods unchanged

**New Interface**:

```typescript
/** Unified domain event from SSE - matches backend event structure */
export interface ResearchDomainEvent {
  readonly type:
    | 'workflow-update'
    | 'tool-execution'
    | 'llm-token'
    | 'custom-progress'
    | 'debug-trace'
    | 'interruption_request'
    | 'workflow_complete';
  readonly timestamp: string;
  readonly executionId: string;
  // workflow-update fields
  readonly nodeName?: string;
  readonly state?: Record<string, unknown>;
  // tool-execution fields
  readonly toolData?: { messages?: unknown[] };
  // llm-token fields
  readonly token?: string;
  readonly step?: number;
  readonly messageChunk?: Record<string, unknown>;
  // custom-progress fields
  readonly progress?: { agent?: string; stage?: string; message?: string; percentage?: number };
  // debug-trace fields
  readonly eventType?: string;
  readonly taskName?: string;
  readonly payload?: Record<string, unknown>;
  // interruption_request fields
  readonly message?: string;
  readonly reportDraft?: string;
  readonly approvalRequest?: Record<string, unknown>;
  // workflow_complete fields
  readonly finalState?: Record<string, unknown>;
}
```

### Component 2: Research Models (CREATE)

**Purpose**: Define research-specific types for timeline entries, phases, errors, and agent registry.

**File**: `apps/dev-brand-ui/src/app/features/research-chat/models/research-workflow.model.ts`
**Action**: CREATE

**Types to Define**:

```typescript
import { AgentRegistryEntry } from '../../devbrand-poc/models/agent-registry.const';

/** Research workflow phases (single-agent progression) */
export type ResearchPhase =
  | 'idle'
  | 'started'
  | 'searching'
  | 'reading'
  | 'synthesizing'
  | 'report-draft'
  | 'approval'
  | 'saving'
  | 'completed'
  | 'error';

/** Research timeline entry types */
export type ResearchTimelineEntryType =
  | 'research-start'
  | 'searching'
  | 'reading-source'
  | 'synthesizing'
  | 'tool-execution'
  | 'report-draft'
  | 'approval-waiting'
  | 'approval-decision'
  | 'research-complete'
  | 'error';

/** Research timeline entry */
export interface ResearchTimelineEntry {
  readonly id: string;
  readonly type: ResearchTimelineEntryType;
  readonly timestamp: Date;
  readonly message: string;
  readonly detail?: string;
  readonly status: 'active' | 'completed' | 'error';
  readonly phase?: ResearchPhase;
}

/** HITL approval state for researcher */
export interface ResearchHitlApproval {
  readonly executionId: string;
  readonly reportDraft: string;
  readonly message: string;
  readonly requestedAt: Date;
}

/** Research error */
export interface ResearchError {
  readonly message: string;
  readonly timestamp: Date;
  readonly rawError?: unknown;
}

/** Raw event for debug panel */
export interface ResearchRawEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly data: unknown;
}

/** Researcher agent registry - single agent */
export const RESEARCHER_AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  researcher: {
    id: 'researcher',
    name: 'Researcher Agent',
    icon: '\u{1F52C}', // microscope
    description: 'Autonomous research agent that searches, reads, and synthesizes information',
  },
};
```

### Component 3: ResearchWorkflowStateService (CREATE)

**Purpose**: Centralized signal-based state management for the research workflow. This is the simplified single-agent version of DevBrandWorkflowStateService.

**File**: `apps/dev-brand-ui/src/app/features/research-chat/services/research-workflow-state.service.ts`
**Action**: CREATE

**Pattern Source**: DevBrandWorkflowStateService (devbrand-poc/services/devbrand-workflow-state.service.ts) - simplified for single-agent

**Estimated Size**: ~300-400 lines (vs 991 lines for multi-agent)

**Responsibilities**:

1. Subscribe to `ResearchService.streamWorkflow()` Observable
2. Route all 7 domain event types through `processDomainEvent()` switch/case
3. Maintain all state as Angular signals
4. Provide `startExecution(executionId: string)` method that resets state and subscribes to SSE stream
5. Provide `reset()` method for cleanup
6. Provide `processApproval(approved: boolean, feedback?: string)` to handle HITL decisions
7. Cap event history at 5,000 entries and timeline at 500 entries

**Domain Event Router** (core logic):

```typescript
private processDomainEvent(event: ResearchDomainEvent): void {
  // Add to raw event history (for debug panel)
  this.addToEventHistory(event);

  switch (event.type) {
    case 'workflow-update':
      this.handleWorkflowUpdate(event);
      break;
    case 'llm-token':
      this.handleLlmToken(event);
      break;
    case 'tool-execution':
      this.handleToolExecution(event);
      break;
    case 'custom-progress':
      this.handleCustomProgress(event);
      break;
    case 'interruption_request':
      this.handleInterruptionRequest(event);
      break;
    case 'workflow_complete':
      this.handleWorkflowComplete(event);
      break;
    case 'debug-trace':
      // Already added to event history above, no additional processing
      break;
    default:
      console.warn('[ResearchState] Unknown event type:', (event as Record<string, unknown>)['type']);
  }
}
```

**Event Handlers**:

- `handleWorkflowUpdate(event)`: Extract nodeName, detect research phase from node name, add timeline entry. If nodeName contains 'search' -> phase = 'searching'. If contains 'read' -> 'reading'. If contains 'synth' or 'generate' or 'report' -> 'synthesizing'. Update `_currentPhase` signal.

- `handleLlmToken(event)`: Append `event.token` to `_streamingText` buffer, set `_isStreaming` to true. If first token, add 'synthesizing' timeline entry (Report generation started).

- `handleToolExecution(event)`: Extract tool name from `event.toolData.messages` array (same extraction logic as current component lines 126-144). Map tool name to phase: 'web-search'/'research-search' -> 'searching', 'read-source'/'read-url' -> 'reading', 'create-report'/'save-report' -> 'saving'. Add timeline entry with tool name and result. Update `_currentPhase`.

- `handleCustomProgress(event)`: Update `_progress` signal with `event.progress.percentage` and `event.progress.message`.

- `handleInterruptionRequest(event)`: Set `_hitlApproval` signal with report draft and message. Set `_currentPhase` to 'approval'. Set `_isStreaming` to false. Add 'approval-waiting' timeline entry.

- `handleWorkflowComplete(event)`: Set `_executionStatus` to 'completed'. Set `_currentPhase` to 'completed'. Set `_isStreaming` to false. Add 'research-complete' timeline entry. Clean up subscription.

**Public API**:

```typescript
// Signals (readonly)
readonly executionStatus: Signal<string>;
readonly currentPhase: Signal<ResearchPhase>;
readonly streamingText: Signal<string>;
readonly isStreaming: Signal<boolean>;
readonly timelineEntries: Signal<ResearchTimelineEntry[]>;
readonly hitlApproval: Signal<ResearchHitlApproval | null>;
readonly errors: Signal<ResearchError[]>;
readonly progress: Signal<{percentage: number; message: string} | null>;
readonly eventHistory: Signal<ResearchRawEvent[]>;

// Computed
readonly isExecuting: Signal<boolean>;
readonly hasPendingApproval: Signal<boolean>;
readonly hasErrors: Signal<boolean>;
readonly eventCount: Signal<number>;

// Methods
startExecution(executionId: string): void;  // Reset + subscribe to SSE
reset(): void;                               // Clear all state
clearApproval(): void;                       // Clear HITL state after decision
```

### Component 4: ResearchTimelineComponent (CREATE)

**Purpose**: Research-specific timeline visualization showing single-agent workflow progression with phases and tool executions.

**File**: `apps/dev-brand-ui/src/app/features/research-chat/components/research-timeline.component.ts`
**Action**: CREATE

**Pattern Source**: OrchestrationTimelineComponent (devbrand-poc/components/orchestration-timeline.component.ts) - adapted for research phases

**Design**: Standalone component with OnPush change detection. Injects ResearchWorkflowStateService to read timeline signals. Uses `@switch` on entry.type for type-specific rendering.

**Template Structure**:

```
Timeline Container (white bg, rounded, scrollable max-h-[600px])
  @for (entry of stateService.timelineEntries(); track entry.id)
    @switch (entry.type)
      'research-start'    -> Blue card with rocket icon, query text
      'searching'         -> Amber card with search icon, search query, spinner when active
      'reading-source'    -> Cyan card with book icon, source URL/title
      'synthesizing'      -> Indigo card with brain icon, includes StreamingTextDisplayComponent
      'tool-execution'    -> Gray indented sub-entry (same as devbrand), tool name + result
      'report-draft'      -> Purple card with document icon
      'approval-waiting'  -> Yellow card with pause icon
      'approval-decision' -> Green (approved) or Red (rejected) card
      'research-complete' -> Blue card with flag icon
      'error'             -> Red card with error icon
    @empty
      Empty state: "Start a research query to see the timeline..."
```

**Imports**: `StreamingTextDisplayComponent` from `../../devbrand-poc/components/streaming-text-display.component`

**Key Computed Signals** (same pattern as OrchestrationTimelineComponent):

- `formattedTimestamps` - Pre-computed timestamp map keyed by entry.id
- Auto-scroll effect on new entries (using viewChild + effect)

### Component 5: ResearchDebugPanelComponent (CREATE)

**Purpose**: Collapsible debug panel for raw event inspection, following the DebugPanelComponent pattern.

**File**: `apps/dev-brand-ui/src/app/features/research-chat/components/research-debug-panel.component.ts`
**Action**: CREATE

**Pattern Source**: DebugPanelComponent (devbrand-poc/components/debug-panel.component.ts)

**Design**: Unlike DevBrand's debug panel which uses EventStreamComponent (which depends on DevBrandWorkflowStateService), this component reads directly from `ResearchWorkflowStateService.eventHistory()` signal and renders a simple JSON list.

**Template Structure**:

```
Border-top separator
  Toggle button with "Debug Panel" label + event count badge
  @if (expanded())
    Scrollable container (max-h-96)
      @for (event of stateService.eventHistory(); track $index)
        Event card: type badge + timestamp + JSON.stringify(data) in monospace
```

**Estimated Size**: ~80-100 lines

### Component 6: ResearchChatComponent (REWRITE)

**Purpose**: Lean orchestration component that reads all state from ResearchWorkflowStateService signals. Reduced from 605 lines to ~180 lines.

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`
**Action**: REWRITE

**What Gets Removed**:

- All plain class properties for state (`messages`, `isResearching`, `showApprovalModal`, `reportDraft`, `currentStreamingMessage`) - replaced by signal reads from state service
- All event handling methods (`handleStreamEvent`, `handleMessageStream`, `handleCustomProgress`, `handleDebugTrace`, `handleToolExecution`, `handleWorkflowComplete`) - moved to state service
- All tool formatting methods (`formatToolName`, `formatToolInput`, `formatToolOutput`) - moved to state service or timeline component
- All message helper methods (`addMessage`, `addStatusMessage`, `addErrorMessage`, `addSuccessMessage`, `addSystemMessage`) - no longer needed (timeline replaces chat messages for workflow events)
- `getMessageClass`, `formatTimestamp` template helpers - no longer needed
- `scrollToBottom` - handled by timeline component's auto-scroll
- `AgentStatusPanelComponent` import - not applicable to single-agent
- `MarkdownModule` import - markdown rendering no longer needed for status messages (timeline handles display)
- Stream event type guard imports (`isMessageStreamEvent`, `isCustomStreamEvent`, `isDebugStreamEvent`)

**What Gets Added**:

- Inject `ResearchWorkflowStateService`
- Inject `ResearchService` (for HTTP calls: startResearch, approveReport)
- Read all display state from signals
- `sendMessage()` method: validates input, calls `researchService.startResearch()`, on success calls `stateService.startExecution(executionId)`
- `onApprovalDecision(approved, feedback?)` method: calls `researchService.approveReport()`, calls `stateService.clearApproval()`. If approved, calls `stateService.startExecution()` again to resume streaming.
- `onConversationSelected(threadId)` / `onNewConversation(threadId)` - preserved from current implementation
- Query input state kept as local signal: `currentQuery = signal('')`

**What Gets Preserved**:

- `userId` property
- `currentThreadId` property
- Conversation sidebar integration
- Approval modal integration (rewired to signals)
- Input area UI

**Imports**:

```typescript
imports: [
  FormsModule,
  ApprovalModalComponent,
  ConversationSidebarComponent,
  ResearchTimelineComponent,
  ResearchDebugPanelComponent,
];
```

**Template Structure** (~120 lines):

```html
<div class="research-chat-container">
  <!-- Conversation Sidebar (PRESERVED) -->
  <div class="conversation-sidebar-column">
    <app-conversation-sidebar ... />
  </div>

  <!-- Main Content Area (replaces sidebar + chat-area grid) -->
  <div class="main-content">
    <!-- Research Timeline (replaces chat messages) -->
    <app-research-timeline />

    <!-- Input Area (PRESERVED, rewired to signals) -->
    <div class="chat-input-container">
      <form (submit)="sendMessage()" ...>
        <input [(ngModel)]="currentQuery" [disabled]="stateService.isExecuting()" ... />
        <button type="submit" [disabled]="!currentQuery().trim() || stateService.isExecuting()" ...>
          @if (stateService.isExecuting()) { ... } @else { ... }
        </button>
      </form>
    </div>

    <!-- Debug Panel -->
    <app-research-debug-panel />

    <!-- Approval Modal (PRESERVED, rewired to signals) -->
    <app-approval-modal
      [visible]="stateService.hasPendingApproval()"
      [reportDraft]="stateService.hitlApproval()?.reportDraft ?? ''"
      (approve)="onApprovalDecision(true)"
      (reject)="onApprovalDecision(false)"
    />
  </div>
</div>
```

### Component 7: Research Chat SCSS (MODIFY)

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss`
**Action**: MODIFY

**Changes**:

1. Change grid from 3-column (`280px 320px 1fr`) to 2-column (`280px 1fr`) - removing the agent status panel sidebar column
2. Remove `.sidebar` styles (agent status panel column no longer exists)
3. Keep `.conversation-sidebar-column` styles
4. Keep `.chat-input-container`, `.chat-input-form`, `.chat-input`, `.send-button` styles
5. Remove `.chat-messages` and all `.message-*` styles (timeline replaces the chat message list)
6. Remove `.message-content` markdown rendering styles (timeline component handles display)
7. Remove `.streaming-cursor` styles (StreamingTextDisplayComponent handles cursor)
8. Remove `.loading-indicator` styles (timeline shows loading state)
9. Add `.main-content` styles (flex column layout for timeline + input + debug)

---

## Reuse Strategy

### Components Reused Directly (import from devbrand-poc)

| Component                       | Path                                                          | How Used                                                       |
| ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `StreamingTextDisplayComponent` | `devbrand-poc/components/streaming-text-display.component.ts` | Imported into ResearchTimelineComponent for LLM output display |

### Interfaces Reused (import from devbrand-poc)

| Interface            | Path                                                | How Used                                           |
| -------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `AgentRegistryEntry` | `devbrand-poc/models/agent-registry.const.ts:15-20` | Used as type for RESEARCHER_AGENT_REGISTRY entries |

### Patterns Reused (adapted, not imported)

| Pattern                           | Source                               | Adaptation                                                                                                      |
| --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Signal-based state service        | DevBrandWorkflowStateService         | Simplified for single-agent: no multi-agent progress map, no delegation detection, single streaming text buffer |
| Domain event router (switch/case) | DevBrandWorkflowStateService:440-463 | Same pattern, different event types (llm-token vs message-stream, custom-progress vs custom-stream)             |
| Timeline component with @switch   | OrchestrationTimelineComponent       | Different entry types for research phases instead of agent delegations                                          |
| Debug panel toggle                | DebugPanelComponent                  | Simpler version without EventStreamComponent dependency                                                         |
| EventSource SSE listeners         | DevBrandSseService                   | Pattern for addEventListener with JSON parse + error handling                                                   |

### Components NOT Reused (research-specific needed)

| Component                        | Reason                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `OrchestrationTimelineComponent` | Hard-depends on DevBrandWorkflowStateService; timeline entry types are agent-delegation focused, not research-phase focused             |
| `DebugPanelComponent`            | Hard-depends on DevBrandWorkflowStateService.eventHistory$ (BehaviorSubject); embeds EventStreamComponent which also hard-depends on it |
| `AgentActivityPanelsComponent`   | Multi-agent specific, not applicable                                                                                                    |
| `AgentStatusPanelComponent`      | Multi-agent specific, being removed from research                                                                                       |

---

## Migration Strategy: HITL and Sidebar Preservation

### HITL Approval Flow (Before -> After)

**Before** (current):

```
Component state: showApprovalModal (boolean), reportDraft (string)
Event handling: in handleStreamEvent() case 'interrupt'
  -> sets this.reportDraft = event.state?.metadata?.reportDraft
  -> sets this.showApprovalModal = true
  -> sets this.isResearching = false
Approval: onApprovalDecision(approved)
  -> sets this.showApprovalModal = false
  -> calls researchService.approveReport()
  -> on success, calls this.streamWorkflow() again
```

**After** (new):

```
State service: _hitlApproval signal (ResearchHitlApproval | null)
Event handling: in state service handleInterruptionRequest()
  -> sets _hitlApproval with {executionId, reportDraft, message, requestedAt}
  -> sets _currentPhase to 'approval'
  -> adds 'approval-waiting' timeline entry
Component reads: stateService.hasPendingApproval() for modal visibility
Component reads: stateService.hitlApproval()?.reportDraft for modal content
Approval: component calls researchService.approveReport() then stateService.clearApproval()
  -> if approved, component calls stateService to resume streaming
```

**Key**: The ApprovalModalComponent itself is unchanged. Only the wiring changes: `[visible]` reads from signal, `[reportDraft]` reads from signal.

### Conversation Sidebar Flow (Before -> After)

**Before** (current):

```
Component state: currentThreadId (string), messages (ChatMessage[])
onConversationSelected: calls conversationApi, maps response to messages array
onNewConversation: clears messages, sets currentThreadId
```

**After** (new):

```
Component state: currentThreadId (local property - NOT in state service)
onConversationSelected: calls conversationApi, sets timeline entries from history
  OR: simply navigates (conversation history display is future enhancement)
onNewConversation: calls stateService.reset(), sets currentThreadId
```

**Key**: Conversation sidebar integration stays in the component, not the state service. The sidebar is about navigation, not workflow execution state.

---

## Files Affected Summary

### CREATE (5 files)

| File                                                                                            | Purpose                                                                    | Estimated Lines |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| `apps/dev-brand-ui/src/app/features/research-chat/models/research-workflow.model.ts`            | Research-specific types (phases, timeline entries, errors, agent registry) | ~80             |
| `apps/dev-brand-ui/src/app/features/research-chat/services/research-workflow-state.service.ts`  | Signal-based state management with domain event routing                    | ~350            |
| `apps/dev-brand-ui/src/app/features/research-chat/components/research-timeline.component.ts`    | Timeline visualization for research phases and tool executions             | ~250            |
| `apps/dev-brand-ui/src/app/features/research-chat/components/research-debug-panel.component.ts` | Collapsible raw event debug panel                                          | ~90             |
| `apps/dev-brand-ui/src/app/features/research-chat/models/index.ts`                              | Barrel export for models                                                   | ~5              |

### MODIFY (2 files)

| File                                                                            | Changes                                                                                                               | Impact                    |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts` | Replace ResearchWorkflowEvent interface with ResearchDomainEvent, add llm-token/custom-progress/debug-trace listeners | Fixes P1 (missing events) |
| `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss` | Change grid layout from 3-col to 2-col, remove message styles, add main-content styles                                | Layout update             |

### REWRITE (1 file)

| File                                                                          | Before                                  | After                                                |
| ----------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts` | 605 lines, monolithic, plain properties | ~180 lines, signal-based, delegates to state service |

### PRESERVED (2 files, no changes)

| File                                                                                      | Reason                                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts` | Already works, only wiring changes (in parent component)                                    |
| `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html`           | Will be replaced with inline template in the rewritten component (SCSS file stays external) |

**Note on template**: The current component uses `templateUrl: './research-chat.component.html'`. After rewrite, the component can either keep an external template file OR move to inline template. Given the template will be ~120 lines (similar to DevBrand POC page component at ~40 lines template), keeping it as an external `.html` file is acceptable. If the team-leader prefers inline, the HTML file can be deleted.

---

## Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: frontend-developer

**Rationale**:

- All changes are Angular UI code (components, services, models)
- No backend changes required
- Requires understanding of Angular signals, standalone components, TailwindCSS
- Requires understanding of EventSource SSE API
- Pattern adaptation from existing DevBrand components

### Complexity Assessment

**Complexity**: MEDIUM
**Estimated Effort**: 6-10 hours

**Breakdown**:

- Research models (types/interfaces): 1 hour
- ResearchService modification (add SSE listeners): 1 hour
- ResearchWorkflowStateService (new state service): 2-3 hours
- ResearchTimelineComponent (new timeline): 2 hours
- ResearchDebugPanelComponent (new debug panel): 0.5 hours
- ResearchChatComponent rewrite: 1.5-2 hours
- SCSS update: 0.5 hours
- Integration testing / verification: 1 hour

### Critical Verification Points

**Before Implementation, Developer Must Verify**:

1. **StreamingTextDisplayComponent is importable from devbrand-poc**:

   - Source: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/streaming-text-display.component.ts`
   - It's standalone, has no service dependencies, uses `input()` signals only
   - Import path: `../../devbrand-poc/components/streaming-text-display.component`

2. **AgentRegistryEntry interface is importable from devbrand-poc**:

   - Source: `apps/dev-brand-ui/src/app/features/devbrand-poc/models/agent-registry.const.ts:15-20`
   - Import path: `../../devbrand-poc/models/agent-registry.const`

3. **Backend SSE event names match exactly**:

   - `workflow-update` (controller line 248)
   - `tool-execution` (controller line 306)
   - `llm-token` (controller line 322)
   - `custom-progress` (controller line 334)
   - `debug-trace` (controller line 349)
   - `interruption_request` (controller line 278)
   - `workflow_complete` (controller line 297)

4. **Backend event payload structures**:

   - `llm-token` payload: `{type, executionId, nodeName, token, step, messageChunk, timestamp}` (controller line 315-322)
   - `custom-progress` payload: `{type, executionId, progress: customEvent.data, timestamp}` (controller line 330-334)
   - `interruption_request` payload: `{type, executionId, message, reportDraft, approvalRequest, timestamp}` (controller line 271-278)
   - `workflow_complete` payload: `{type, executionId, finalState, timestamp}` (controller line 292-297)

5. **ApprovalModalComponent API**:
   - Inputs: `visible: input<boolean>(false)`, `reportDraft: input<string>('')` (approval-modal.component.ts:255-256)
   - Outputs: `approve: EventEmitter<void>`, `reject: EventEmitter<void>` (lines 257-258)

### Architecture Delivery Checklist

- [x] All components specified with evidence (file:line citations throughout)
- [x] All patterns verified from codebase (DevBrand POC reference pattern)
- [x] All imports/decorators verified as existing
- [x] Quality requirements defined (signal-based, standalone, TailwindCSS, <200 lines component)
- [x] Integration points documented (SSE events, signals, component composition)
- [x] Files affected list complete (5 CREATE, 2 MODIFY, 1 REWRITE)
- [x] Developer type recommended (frontend-developer)
- [x] Complexity assessed (MEDIUM, 6-10 hours)
- [x] Reuse strategy documented (StreamingTextDisplayComponent, AgentRegistryEntry, patterns)
- [x] Migration strategy documented (HITL and sidebar preservation)
- [x] No step-by-step implementation (that's team-leader's job)
