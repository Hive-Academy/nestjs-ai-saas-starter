# Development Tasks - TASK_2025_059

**Total Tasks**: 14 | **Batches**: 4 | **Status**: COMPLETE (Code Reviews Addressed)

---

## Plan Validation Summary

**Validation Status**: PASSED WITH RISKS

### Assumptions Verified

- Backend `DomainStreamEvent` union type confirmed at `devbrand-supervisor.workflow.ts:9` (imported from workflow-engine)
- `JwtAuthGuard` already imported in `devbrand.controller.ts:21` and used on conversation endpoints (lines 330, 404, 502)
- Frontend `AgentStatus` type at `agent-progress.model.ts:33-39` currently lacks `delegated` state - confirmed needs addition
- `StreamEventParser` and `StreamEventTransformer` confirmed at `devbrand-supervisor.workflow.ts:7-8`
- Frontend `subscribeToSseEvents()` at line 419 confirmed to only process `update.type === 'workflow-update'`
- `executeWithStreaming()` yield point confirmed at `devbrand-supervisor.workflow.ts:332` - filtering can be added before this line
- Page layout confirmed at `devbrand-poc-page.component.ts:85-146` with two-column grid that needs replacement
- `models/index.ts` confirmed at line 1-25 - needs timeline.model.ts export added
- No `timeline.model.ts` file exists yet - confirmed needs creation

### Risks Identified

| Risk                                                                                                 | Severity | Mitigation                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| DomainEvent interface may not cover all actual backend event field names                             | MEDIUM   | Task 2.1 includes DomainEvent type; developer must cross-reference with `stream-event.transformer.ts` actual output |
| WorkflowStateService rewrite is large (900+ lines); partial rewrite may break existing functionality | HIGH     | Task 2.3 must preserve existing `_executionState`, `_agentProgress`, `_hitlQueue`, `_eventHistory` signals          |
| Streaming text signal may cause excessive re-renders with high token frequency                       | MEDIUM   | OnPush change detection on all new components; developer should batch if needed                                     |

### Edge Cases to Handle

- [ ] Empty `content` in `message-stream` events (filter on backend, guard on frontend) -> Backend: Task 1.2, Frontend: Task 2.3
- [ ] Unknown/new agent node names not in AGENT_REGISTRY -> Task 2.3 must log warning and not crash
- [ ] `tool_call_chunks` with partial args (streaming tool calls arrive incrementally) -> Task 2.3 handle gracefully
- [ ] SSE reconnection after disconnect (existing behavior, must not break) -> All tasks preserve existing SSE service

---

## Batch 1: Backend Fixes COMPLETE

**Developer**: backend-developer
**Tasks**: 2 | **Dependencies**: None
**Commit**: 946807ff

### Task 1.1: Add auth guard to DevBrand execute endpoint COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\controllers\devbrand.controller.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md Component 3.1 (lines 402-423)
**Pattern to Follow**: Same file, line 330 where `@UseGuards(JwtAuthGuard)` is already used on conversation endpoints

**Quality Requirements**:

- Add `@UseGuards(JwtAuthGuard)` decorator to `executeDevBrand()` method (before `@Post('execute')` at line 153)
- Extract `userId` from `request.user` (the authenticated user) instead of requiring it from the client DTO
- Add `@Req() req: Request` parameter to `executeDevBrand()` method
- Pass `req.user.id` (or `req.user.sub` - check JwtAuthGuard output) as `userId` to the workflow
- Remove requirement for `dto.userId` in the validation logic (lines 190-192) since it comes from auth context now
- Unauthenticated POST to `/devbrand/execute` must return 401

**Validation Notes**:

- Check `JwtAuthGuard` to confirm what field name the user ID is stored under in `request.user`
- The SSE stream endpoint authenticates via ticket mechanism already in frontend - no changes needed there

**Implementation Details**:

- Import: `UseGuards` already imported (line 18), `JwtAuthGuard` already imported (line 21)
- Add `@UseGuards(JwtAuthGuard)` before `@Post('execute')` decorator
- Add `@Req() req: Request` parameter, extract user ID from JWT payload
- Update DTO validation to not require userId from body

---

### Task 1.2: Filter empty message-stream chunks in supervisor workflow COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\workflows\devbrand-supervisor.workflow.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md Component 2.1 (lines 376-399)
**Pattern to Follow**: Existing skip pattern at lines 315-323 (`if (!parsedEvent) continue; if (parser.shouldSkipEvent(parsedEvent)) continue;`)

**Quality Requirements**:

- Add content check AFTER `transformer.transformToDomainEvent()` (line 326-329) and BEFORE `yield domainEvent` (line 332)
- Filter condition: `if (domainEvent.type === 'message-stream' && !domainEvent.content) { continue; }`
- Only filter `message-stream` events with falsy `content`
- Never filter `workflow-update`, `tool-execution`, or `custom-stream` events
- Must not break the async generator stream pipeline

**Validation Notes**:

- The `DomainStreamEvent` type from `@hive-academy/langgraph-workflow-engine` includes `content` field for message-stream events
- Empty string `""` is falsy in JavaScript so `!domainEvent.content` handles both `""` and `undefined`

**Implementation Details**:

- No new imports needed
- Add 3-line filter between lines 329 and 332
- Log filtered count at debug level for monitoring

---

**Batch 1 Verification**:

- Both files exist at paths and have real implementations
- Build passes: `npx nx build dev-brand-api`
- code-logic-reviewer approved
- Unauthenticated requests to `/devbrand/execute` return 401
- Empty message-stream chunks no longer yielded

---

## Batch 2: Type Definitions and Service Layer COMPLETE

**Developer**: frontend-developer
**Tasks**: 4 | **Dependencies**: Batch 1 (backend must filter empty chunks first)
**Commit**: afbf5795

### Task 2.1: Create timeline model types COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\timeline.model.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md Component 1.2 (lines 337-368)
**Pattern to Follow**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\agent-progress.model.ts` for readonly interface style

**Quality Requirements**:

- Create `TimelineEntryType` union type with: `delegation`, `agent-start`, `agent-thinking`, `tool-execution`, `agent-complete`, `agent-error`, `workflow-start`, `workflow-complete`
- Create `TimelineEntry` interface with readonly fields: `id`, `type`, `timestamp`, `agentId?`, `agentName?`, `message`, `detail?`, `status`
- Create `AgentError` interface with readonly fields: `agentId`, `agentName`, `message`, `timestamp`, `rawError?`
- All interfaces must use `readonly` where immutability is expected
- No `any` types (use `unknown` for `rawError`)

**Implementation Details**:

- Pure type file, no runtime dependencies
- Export all types for use by service and components

---

### Task 2.2: Add DomainEvent interface and update AgentStatus type COMPLETE

**Files**:

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\stream-events.model.ts` (MODIFY - add DomainEvent interface)
- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\agent-progress.model.ts` (MODIFY - add `delegated` to AgentStatus)
  **Action**: MODIFY
  **Spec Reference**: implementation-plan.md Component 1.2 (lines 265-335)
  **Pattern to Follow**: Existing interfaces in `stream-events.model.ts`

**Quality Requirements**:

- Add `DomainEvent` interface covering all fields from all 4 backend event types plus `workflow_complete`
- `DomainEvent.type` must be: `'workflow-update' | 'tool-execution' | 'message-stream' | 'custom-stream' | 'workflow_complete'`
- Include `nodeName?`, `state?`, `metadata?`, `content?`, `step?`, `messageChunk?`, `toolData?`, `data?` fields
- `messageChunk` must include `tool_call_chunks` and `tool_calls` sub-types
- Add `'delegated'` to `AgentStatus` union type (between `idle` and `thinking`)
- All fields must use `readonly` where appropriate
- No `any` types

**Implementation Details**:

- Add DomainEvent at end of `stream-events.model.ts`
- Modify AgentStatus in `agent-progress.model.ts` to add `delegated`
- Both are type-only changes, no runtime impact

---

### Task 2.3: Update models index to export timeline types COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\index.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md file change list (line 815)
**Pattern to Follow**: Existing exports in same file

**Quality Requirements**:

- Add `export type * from './timeline.model';` to the index file
- Must maintain existing exports unchanged

**Implementation Details**:

- Single line addition after existing exports

---

### Task 2.4: Rewrite DevBrandWorkflowStateService with domain event router COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-workflow-state.service.ts`
**Action**: MODIFY (major rewrite)
**Spec Reference**: implementation-plan.md Component 1.1 (lines 125-263)
**Pattern to Follow**: Current service structure at same file (preserve existing signal patterns)

**Quality Requirements**:

- **PRESERVE** existing signals: `_executionState`, `_agentProgress`, `_hitlQueue`, `_eventHistory` and their public readonly accessors
- **ADD** new signals: `_streamingText` (Record<string, string>), `_timelineEntries` (TimelineEntry[]), `_errors` (AgentError[])
- **ADD** public readonly accessors for new signals: `streamingText`, `timelineEntries`, `errors`
- **ADD** `currentAgent` computed signal (derived from agentProgress - the agent with status !== 'idle' and !== 'completed')
- **ADD** `AGENT_REGISTRY` map: `{ 'supervisor': {...}, 'github-code-analyzer': {...}, 'personal-brand-strategist': {...}, 'content-creator': {...} }`
- **REPLACE** the SSE subscription in `subscribeToSseEvents()` to use `processDomainEvent()` router
- **ADD** `processDomainEvent()` method with switch on `event.type` for all 5 event types
- **ADD** `handleWorkflowUpdateEvent()`: resolve agent from nodeName, update status to `executing`, add timeline entry
- **ADD** `handleMessageStreamEvent()`: accumulate tokens in `_streamingText`, detect supervisor delegation from `tool_call_chunks`, update agent status to `thinking`
- **ADD** `handleToolExecutionEvent()`: extract tool results/errors, update agent status, add timeline entry
- **ADD** `handleCustomStreamEvent()`: update progress percentage from `event.data`
- **ADD** `handleWorkflowComplete()`: set execution status to completed, add timeline entry
- **ADD** `resolveAgentId()`: direct nodeName match, then subgraphId match, then checkpoint namespace extraction
- **REMOVE** broken `extractAgentId()` and `mapNodeNameToEventType()` methods
- All 4 domain event types must be routed (zero silently dropped events)
- Unhandled event types must log a console.warn
- Agent status transitions: idle -> delegated -> thinking -> executing -> completed/error
- Max 10,000 events in history
- Reset all new signals when `resetState()` is called

**Validation Notes**:

- This is the largest and most critical task - it is the foundation for all UI components
- Must import `DomainEvent` from models (Task 2.2), `TimelineEntry` and `AgentError` from timeline model (Task 2.1)
- The existing `subscribeToSseEvents()` at line 419 only checks `update.type === 'workflow-update'` - this must be replaced with the full router
- The existing `extractStreamUpdateFromSseEvent()` and `processStreamUpdate()` methods can be removed or simplified since the new router handles all types directly

**Implementation Details**:

- Import: `DomainEvent` from stream-events model, `TimelineEntry`, `AgentError`, `TimelineEntryType` from timeline model
- Keep: All existing constructor injection, all existing public API methods that other components depend on
- The `_eventHistory` BehaviorSubject should still receive all events for the debug panel

---

**Batch 2 Verification**:

- All files exist and contain real implementations
- Build passes: `npx nx build dev-brand-ui`
- code-logic-reviewer approved
- All 4 domain event types are routed to handlers (verify with code inspection)
- No `any` types in new code
- Existing signals preserved, new signals added

---

## Batch 3: UI Components COMPLETE

**Developer**: frontend-developer
**Tasks**: 4 | **Dependencies**: Batch 2 (service layer must provide signals)
**Commit**: b5ae5803

### Task 3.1: Create StreamingTextDisplay component COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\streaming-text-display.component.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md Component 4.3 (lines 592-620)
**Pattern to Follow**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\execution-control.component.ts` (standalone component with signals)

**Quality Requirements**:

- Standalone component with `changeDetection: ChangeDetectionStrategy.OnPush`
- Input signals: `text: InputSignal<string>`, `isActive: InputSignal<boolean>`, `label: InputSignal<string>`
- Use `input()` or `input.required()` from `@angular/core`
- Show label header when label is provided
- Show streaming text in monospace font with `whitespace-pre-wrap`
- Show pulsing cursor `|` when `isActive()` is true
- Max height with overflow scroll (`max-h-64 overflow-y-auto`)
- Hide entire component when `text()` is empty/falsy
- TailwindCSS only (no custom CSS except `:host { display: block }`)

**Implementation Details**:

- Import: `Component`, `ChangeDetectionStrategy`, `input` from `@angular/core`
- Selector: `app-streaming-text-display`
- This is a reusable "dumb" component - no service injection

---

### Task 3.2: Create OrchestrationTimeline component COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\orchestration-timeline.component.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md Component 4.1 (lines 439-515)
**Pattern to Follow**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\event-stream.component.ts` (signal-based component with service injection)

**Quality Requirements**:

- Standalone component with `OnPush` change detection
- Inject `DevBrandWorkflowStateService` to read: `timelineEntries`, `streamingText`, `agentProgress`, `errors`
- Use `@switch` on `entry.type` to render different card types:
  - `delegation`: Purple left-border card with arrow icon, supervisor label, target agent name
  - `agent-start` / `agent-thinking`: Agent working card with status icon (spinning for active), agent name, current action. Include `<app-streaming-text-display>` for streaming text
  - `tool-execution`: Indented sub-entry with tool name and result/error indicator
  - `agent-error`: Red left-border card with error icon and human-readable message
  - `agent-complete`: Green left-border card with checkmark and agent name
  - `workflow-start` / `workflow-complete`: Workflow lifecycle cards
- `@empty` block showing "Waiting for workflow to start..."
- Auto-scroll to bottom on new entries using `ViewChild` for scroll container and `afterNextRender` or `effect()`
- Import `StreamingTextDisplayComponent` from Task 3.1
- Timeline entries in chronological order (already sorted by service)
- TailwindCSS styling with left-border color coding per entry type

**Validation Notes**:

- Must handle empty `streamingText` gracefully (agent may not have text yet)
- Must handle missing `agentName` in timeline entry (use `agentId` as fallback)

**Implementation Details**:

- Import: `Component`, `ChangeDetectionStrategy`, `inject`, `ViewChild`, `ElementRef`, `effect` from `@angular/core`
- Import: `DevBrandWorkflowStateService` from services
- Import: `StreamingTextDisplayComponent` from same directory
- Selector: `app-orchestration-timeline`

---

### Task 3.3: Create AgentActivityPanels component COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\agent-activity-panels.component.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md Component 4.2 (lines 517-590)
**Pattern to Follow**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\progress-visualization.component.ts` (agent card rendering)

**Quality Requirements**:

- Standalone component with `OnPush` change detection
- Inject `DevBrandWorkflowStateService` to read: `agentProgress`, `currentAgent`, `streamingText`, `errors`
- Define agent metadata array: `[{ id, name, icon, description }]` for the 3 agents + supervisor
- Full-width panel for each agent (no truncation of names)
- Active agent distinguished with `border-indigo-500` and `bg-indigo-50/50`
- Status badge with color coding: idle=gray, delegated=yellow, thinking=blue, executing=indigo, completed=green, error=red
- Streaming text area when agent has buffered text (use `<app-streaming-text-display>`)
- Error display with red styling when agent has error
- Current action text when available
- Import `StreamingTextDisplayComponent` from Task 3.1

**Validation Notes**:

- `agentProgress` signal returns `AgentProgressMap` (Record<string, AgentProgress>) - need to iterate over known agent IDs
- `streamingText` signal returns `Record<string, string>` - access by agent ID
- `errors` signal returns `AgentError[]` - filter by agent ID

**Implementation Details**:

- Import: `Component`, `ChangeDetectionStrategy`, `inject`, `computed` from `@angular/core`
- Import: `DevBrandWorkflowStateService` from services
- Import: `StreamingTextDisplayComponent` from same directory
- Selector: `app-agent-activity-panels`
- Create computed signals for each agent's streaming text and error for efficient rendering

---

### Task 3.4: Create DebugPanel component COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\debug-panel.component.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md Component 4.4 (lines 625-655)
**Pattern to Follow**: Collapsible pattern with `signal(false)` for expanded state

**Quality Requirements**:

- Standalone component with `OnPush` change detection
- Toggle button to expand/collapse (hidden by default)
- Event count badge from `DevBrandWorkflowStateService.eventHistory$`
- When expanded, embed `<app-event-stream />` component
- Import `EventStreamComponent` for embedding
- Chevron icon rotates on expand/collapse
- Border-top separator styling
- TailwindCSS only

**Validation Notes**:

- `EventStreamComponent` already works for displaying raw events - just embed it
- May need to also modify `EventStreamComponent` to remove its outer card wrapper (h3 title, shadow) since it lives inside debug panel now. If the current wrapper is acceptable inside the debug panel, skip the modification.

**Implementation Details**:

- Import: `Component`, `ChangeDetectionStrategy`, `inject`, `signal` from `@angular/core`
- Import: `DevBrandWorkflowStateService` from services
- Import: `EventStreamComponent` from same directory
- Selector: `app-debug-panel`
- `expanded = signal(false)`, `toggleExpanded()` flips the signal

---

**Batch 3 Verification**:

- All 4 new component files exist with real implementations
- Build passes: `npx nx build dev-brand-ui`
- code-logic-reviewer approved
- All components are standalone with OnPush change detection
- No `any` types
- StreamingTextDisplay is reusable (no service injection)
- OrchestrationTimeline renders all entry types
- AgentActivityPanels shows full agent names without truncation
- DebugPanel is collapsed by default

---

## Batch 4: Page Layout Integration COMPLETE

**Developer**: frontend-developer
**Tasks**: 4 | **Dependencies**: Batch 3 (all components must exist)
**Commit**: 878d5155

### Task 4.1: Modify EventStream component for debug panel embedding COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\event-stream.component.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md Component 4.6 (lines 718-728)
**Pattern to Follow**: Current component structure

**Quality Requirements**:

- Remove the outer card wrapper (h3 title "Event Stream", shadow container) since it now lives inside DebugPanel
- Keep all internal functionality: virtual scrolling, filtering, event display, event count badge, auto-scroll
- The component should render its content directly without a card shell
- Must still work standalone if needed (no hard dependency on DebugPanel parent)

**Implementation Details**:

- Remove outer `<div class="bg-white rounded-lg shadow-md ...">` wrapper and `<h3>` title
- Keep filter controls and virtual scroll viewport

---

### Task 4.2: Add delegated status styling to ProgressVisualization component COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\progress-visualization.component.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md file change list (line 818)
**Pattern to Follow**: Existing status styling in same component

**Quality Requirements**:

- Add `delegated` status to any status-to-color/icon mapping in the component
- Use yellow/amber color for delegated status (consistent with AgentActivityPanels)
- Must not break existing status rendering

**Implementation Details**:

- Find status switch/if-else blocks and add `delegated` case
- Delegated = "Delegated by supervisor" or similar display text

---

### Task 4.3: Redesign page layout in DevbrandPocPageComponent COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\pages\devbrand-poc-page.component.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md Component 4.5 (lines 657-715)
**Pattern to Follow**: Current page structure at same file

**Quality Requirements**:

- **REPLACE** imports array: remove `ProgressVisualizationComponent`, add `AgentActivityPanelsComponent`, `OrchestrationTimelineComponent`, `DebugPanelComponent`
- Keep `ExecutionControlComponent`, `ConversationSidebarComponent` in imports
- Keep `EventStreamComponent` in imports ONLY if DebugPanel does not import it itself (check Task 3.4 - it does import EventStreamComponent, so remove from page imports)
- **REPLACE** template two-column grid layout (lines 125-140) with single-column layout:
  1. `<app-execution-control>` (workflow trigger)
  2. `<app-agent-activity-panels />` (full-width agent panels)
  3. `<app-orchestration-timeline />` (real-time narrative, primary content)
  4. `<app-debug-panel />` (collapsed by default)
- Keep sidebar grid layout (`grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]`)
- Keep page header
- Remove the two inner `<h2>` section headers ("Agent Progress", "Event Stream") - the new components are self-descriptive
- Keep all existing class properties and methods (onExecutionStarted, onConversationSelected, etc.)
- Update page description text to match new design

**Validation Notes**:

- All imported components must exist (from Batch 3)
- Existing `userId`, `currentThreadId`, `conversationService` properties must remain

**Implementation Details**:

- Import: `AgentActivityPanelsComponent` from `../components/agent-activity-panels.component`
- Import: `OrchestrationTimelineComponent` from `../components/orchestration-timeline.component`
- Import: `DebugPanelComponent` from `../components/debug-panel.component`
- Remove import: `ProgressVisualizationComponent`, `EventStreamComponent`

---

### Task 4.4: Final integration wiring and reset logic COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-workflow-state.service.ts`
**Action**: MODIFY (minor)
**Spec Reference**: implementation-plan.md (lines 256-262, quality requirements)
**Dependencies**: Task 2.4 (service rewrite must be complete)

**Quality Requirements**:

- Verify `resetState()` method clears ALL new signals: `_streamingText`, `_timelineEntries`, `_errors`
- Verify `_streamingText` is reset to `{ 'supervisor': '', 'github-code-analyzer': '', 'personal-brand-strategist': '', 'content-creator': '' }`
- Verify `_timelineEntries` is reset to `[]`
- Verify `_errors` is reset to `[]`
- Verify event history cap at 10,000 entries
- Verify all public signal accessors are exposed correctly for components
- If any of these are missing from Task 2.4 implementation, add them now

**Implementation Details**:

- This is a verification and fix-up task
- Should be quick if Task 2.4 was implemented correctly
- Ensures end-to-end signal flow works

---

**Batch 4 Verification**:

- All files modified correctly
- Build passes: `npx nx build dev-brand-ui`
- code-logic-reviewer approved
- Page loads with new layout (single-column, no two-column split)
- Agent panels visible with full names
- Timeline visible as primary content area
- Debug panel collapsed by default, expandable
- Reset/new execution clears all state

---
