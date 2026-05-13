# Development Tasks - TASK_2025_061

**Total Tasks**: 10 | **Batches**: 4 | **Status**: 4/4 complete

---

## Plan Validation Summary

**Validation Status**: PASSED

### Assumptions Verified

- StreamingTextDisplayComponent is importable from devbrand-poc: VERIFIED - standalone, no service dependencies, uses `input()` signals only
- AgentRegistryEntry interface is importable from devbrand-poc: VERIFIED - generic interface at agent-registry.const.ts:15-20
- Backend SSE event names match documentation: VERIFIED - confirmed from controller source code
- ApprovalModalComponent API unchanged: VERIFIED - `visible` input, `reportDraft` input, `approve`/`reject` outputs
- Models directory does not exist: VERIFIED - needs creation
- Components directory exists with approval-modal only: VERIFIED

### Risks Identified

| Risk                                                                                   | Severity | Mitigation                                                                        |
| -------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| Research agent node names may not match expected patterns for phase detection          | MEDIUM   | Use configurable phase mapping with fallback to 'started' phase for unknown nodes |
| Tool execution events may have varying message structures                              | MEDIUM   | Add null-safe extraction with fallback formatting for unknown tool names          |
| Interruption_request event field `reportDraft` may be nested differently than expected | LOW      | Developer should verify actual payload structure during integration testing       |

### Edge Cases to Handle

- [ ] SSE event with malformed JSON -> log warning, skip event (Task 1.2)
- [ ] Unknown node name in workflow-update -> fallback to generic phase (Task 2.1)
- [ ] Tool execution with no toolData or empty messages array -> graceful handling (Task 2.1)
- [ ] Multiple rapid llm-token events -> efficient signal updates without excessive re-renders (Task 2.1)
- [ ] Approval decision after connection loss -> error handling in component (Task 4.1)

---

## Batch 1: Foundation - Models + SSE Service Fix COMPLETE

**Developer**: frontend-developer
**Tasks**: 3 | **Dependencies**: None
**Status**: COMPLETE
**Commit**: d2d19afc

### Task 1.1: Create research workflow model types -- COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\models\research-workflow.model.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md: Component 2 (lines 242-322)
**Pattern to Follow**: `apps/dev-brand-ui/src/app/features/devbrand-poc/models/agent-registry.const.ts` for AgentRegistryEntry import

**Quality Requirements**:

- All types must be readonly interfaces
- Import AgentRegistryEntry from devbrand-poc models
- Use string literal union types for phases and timeline entry types
- No `any` types

**Implementation Details**:

- Define `ResearchPhase` type (10 phases: idle through error)
- Define `ResearchTimelineEntryType` type (10 types: research-start through error)
- Define `ResearchTimelineEntry` interface with id, type, timestamp, message, detail, status, phase
- Define `ResearchHitlApproval` interface with executionId, reportDraft, message, requestedAt
- Define `ResearchError` interface with message, timestamp, rawError
- Define `ResearchRawEvent` interface with type, timestamp, data
- Define `RESEARCHER_AGENT_REGISTRY` constant using AgentRegistryEntry type
- Estimated: ~80 lines

**Commit**: `feat(langgraph): add research workflow model types and agent registry`

---

### Task 1.2: Create models barrel export -- COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\models\index.ts`
**Action**: CREATE
**Dependencies**: Task 1.1

**Quality Requirements**:

- Single barrel export file for all model types

**Implementation Details**:

- Re-export all types and constants from research-workflow.model.ts
- Estimated: ~5 lines

**Commit**: (combined with Task 1.1)

---

### Task 1.3: Modify ResearchService to add missing SSE event listeners -- COMPLETE

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\services\research.service.ts`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md: Component 1 (lines 193-240)
**Pattern to Follow**: Existing addEventListener pattern in the same file (lines 98-192)

**Quality Requirements**:

- Replace `ResearchWorkflowEvent` interface with `ResearchDomainEvent` interface
- Add listeners for all 7 SSE event types
- All event listeners must have try/catch with console.warn for malformed JSON
- Stop re-mapping event types (emit backend's native type names)
- Keep all HTTP methods unchanged (startResearch, approveReport, listReports, readReport)
- No `any` types - use `Record<string, unknown>` instead

**Validation Notes**:

- Backend SSE event names are: workflow-update, tool-execution, llm-token, custom-progress, debug-trace, interruption_request, workflow_complete
- The current service re-maps types (e.g., workflow-update -> state_update). The new version should emit the backend's native type names.

**Implementation Details**:

- Replace `ResearchWorkflowEvent` with new `ResearchDomainEvent` interface covering all 7 event types
- Add `addEventListener('llm-token', ...)` - parse and emit with token, step, messageChunk fields
- Add `addEventListener('custom-progress', ...)` - parse and emit with progress object
- Add `addEventListener('debug-trace', ...)` - parse and emit with eventType, taskName, payload
- Update existing listeners to emit native backend type names instead of re-mapped names
- Update `streamWorkflow()` return type to `Observable<ResearchDomainEvent>`
- Remove the old `ResearchWorkflowEvent` interface
- Remove `any` types from `ResearchReport` interface (use `Record<string, unknown>`)
- Estimated: ~250 lines (up from 254 due to added listeners)

**Commit**: `feat(langgraph): add missing sse event listeners to research service`

---

**Batch 1 Verification**:

- [ ] All files exist at specified paths
- [ ] Models file exports all required types
- [ ] ResearchService has 7 addEventListener calls
- [ ] ResearchDomainEvent interface covers all event types
- [ ] No `any` types in modified/created files
- [ ] Build passes: `npx nx build dev-brand-ui`
- [ ] code-logic-reviewer approved

---

## Batch 2: State Management Service IN PROGRESS

**Developer**: frontend-developer
**Tasks**: 1 | **Dependencies**: Batch 1
**Status**: IMPLEMENTED

### Task 2.1: Create ResearchWorkflowStateService -- IMPLEMENTED

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\services\research-workflow-state.service.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md: Component 3 (lines 324-415)
**Pattern to Follow**: `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-workflow-state.service.ts` (simplified for single-agent)

**Quality Requirements**:

- All state as Angular signals with private writables and public readonly
- Computed signals for derived state (isExecuting, hasPendingApproval, hasErrors, eventCount)
- Injectable with providedIn: 'root'
- Cap event history at 5,000 entries, timeline at 500 entries
- Clean subscription management (unsubscribe on reset/destroy)
- No `any` types

**Validation Notes**:

- RISK: Node name to phase mapping is heuristic-based. Use contains() checks with fallback to 'started'.
- RISK: Tool name extraction from toolData.messages may vary. Add null-safe checks.
- Edge case: Multiple rapid llm-token events - signals batch updates naturally, OnPush handles this.

**Implementation Details**:

- Import ResearchService for SSE subscription
- Import all model types from models barrel export
- Private writable signals: \_executionStatus, \_currentPhase, \_streamingText, \_isStreaming, \_timelineEntries, \_hitlApproval, \_errors, \_progress, \_eventHistory
- Public readonly signals: executionStatus, currentPhase, streamingText, isStreaming, timelineEntries, hitlApproval, errors, progress, eventHistory
- Computed signals: isExecuting, hasPendingApproval, hasErrors, eventCount
- `processDomainEvent(event)` - switch/case router for all 7 event types
- `handleWorkflowUpdate(event)` - detect phase from nodeName using contains() heuristics
- `handleLlmToken(event)` - append token to streamingText buffer, set isStreaming true
- `handleToolExecution(event)` - extract tool name from messages array, map to phase, add timeline entry
- `handleCustomProgress(event)` - update progress signal
- `handleInterruptionRequest(event)` - set hitlApproval, set phase to 'approval', add timeline entry
- `handleWorkflowComplete(event)` - set completed, add timeline entry, cleanup subscription
- `startExecution(executionId)` - reset all signals, subscribe to ResearchService.streamWorkflow()
- `reset()` - clear all state
- `clearApproval()` - clear hitlApproval signal
- Helper: `addTimelineEntry(type, message, detail?, status?)` - generates id, caps at 500
- Helper: `addToEventHistory(event)` - caps at 5,000
- Estimated: ~350 lines

**Commit**: `feat(langgraph): add signal-based research workflow state service`

---

**Batch 2 Verification**:

- [ ] File exists at specified path
- [ ] All signals are properly typed (no any)
- [ ] processDomainEvent handles all 7 event types
- [ ] Event history capped at 5,000
- [ ] Timeline entries capped at 500
- [ ] startExecution resets all state before subscribing
- [ ] Build passes: `npx nx build dev-brand-ui`
- [ ] code-logic-reviewer approved

---

## Batch 3: UI Components - Timeline + Debug Panel

**Developer**: frontend-developer
**Tasks**: 2 | **Dependencies**: Batch 2
**Status**: IMPLEMENTED

### Task 3.1: Create ResearchTimelineComponent -- IMPLEMENTED

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\components\research-timeline.component.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md: Component 4 (lines 417-451)
**Pattern to Follow**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/orchestration-timeline.component.ts`

**Quality Requirements**:

- Standalone component with OnPush change detection
- Inject ResearchWorkflowStateService to read signals
- Use @switch on entry.type for type-specific rendering
- Import StreamingTextDisplayComponent from devbrand-poc for LLM output display
- TailwindCSS utility classes for all styling
- Auto-scroll to bottom on new entries (viewChild + effect)
- Inline template

**Validation Notes**:

- StreamingTextDisplayComponent import: `../../devbrand-poc/components/streaming-text-display.component`
- Must handle @empty case for timeline with no entries

**Implementation Details**:

- Inject ResearchWorkflowStateService
- Template: scrollable container (max-h-[600px]), @for loop with @switch
- Entry types with distinct styling:
  - research-start: Blue card, rocket icon, query text
  - searching: Amber card, search icon, spinner when active
  - reading-source: Cyan card, book icon, source info
  - synthesizing: Indigo card, brain icon, includes StreamingTextDisplayComponent
  - tool-execution: Gray indented sub-entry, tool name + result
  - report-draft: Purple card, document icon
  - approval-waiting: Yellow card, pause icon
  - approval-decision: Green/Red card based on approval result
  - research-complete: Blue card, flag icon
  - error: Red card, error icon
- @empty block: "Start a research query to see the timeline..."
- Auto-scroll effect using viewChild for scroll container
- Estimated: ~250 lines

**Commit**: `feat(langgraph): add research timeline component with phase visualization`

---

### Task 3.2: Create ResearchDebugPanelComponent -- IMPLEMENTED

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\components\research-debug-panel.component.ts`
**Action**: CREATE
**Spec Reference**: implementation-plan.md: Component 5 (lines 453-474)
**Pattern to Follow**: `apps/dev-brand-ui/src/app/features/devbrand-poc/components/debug-panel.component.ts`

**Quality Requirements**:

- Standalone component with OnPush change detection
- Inject ResearchWorkflowStateService to read eventHistory signal
- Collapsible with local signal for expanded state
- Hidden by default
- TailwindCSS utility classes
- Inline template

**Implementation Details**:

- Local signal: `expanded = signal(false)`
- Toggle button: "Debug Panel" label + event count badge from stateService.eventCount()
- @if (expanded()) block: scrollable container (max-h-96)
- @for loop over stateService.eventHistory(), display: type badge, timestamp, JSON.stringify(data)
- Estimated: ~90 lines

**Commit**: `feat(langgraph): add collapsible research debug panel component`

---

**Batch 3 Verification**:

- [ ] Both component files exist
- [ ] ResearchTimelineComponent imports StreamingTextDisplayComponent
- [ ] ResearchTimelineComponent handles all 10 timeline entry types
- [ ] ResearchDebugPanelComponent is hidden by default
- [ ] Both components are standalone with OnPush
- [ ] Build passes: `npx nx build dev-brand-ui`
- [ ] code-logic-reviewer approved

---

## Batch 4: Integration - Component Rewrite + SCSS Update

**Developer**: frontend-developer
**Tasks**: 3 | **Dependencies**: Batch 3
**Status**: IMPLEMENTED

### Task 4.1: Rewrite ResearchChatComponent -- IMPLEMENTED

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.ts`
**Action**: REWRITE
**Spec Reference**: implementation-plan.md: Component 6 (lines 476-556)
**Pattern to Follow**: `apps/dev-brand-ui/src/app/features/devbrand-poc/pages/devbrand-poc-page.component.ts`

**Quality Requirements**:

- Under 200 lines (down from 605)
- All display state read from ResearchWorkflowStateService signals
- No event handling logic in component (all in state service)
- No tool formatting logic in component
- Preserve HITL approval modal integration (rewired to signals)
- Preserve conversation sidebar integration
- Remove AgentStatusPanelComponent import
- Remove MarkdownModule import
- Remove all stream event type guard imports
- Use @if/@for control flow
- Standalone with OnPush change detection

**Validation Notes**:

- CRITICAL: Preserve userId, currentThreadId, conversation sidebar event handlers
- CRITICAL: Preserve approval flow - call researchService.approveReport() then stateService.clearApproval()
- The HTML template file (research-chat.component.html) will be replaced by inline template

**Implementation Details**:

- Imports: FormsModule, ApprovalModalComponent, ConversationSidebarComponent, ResearchTimelineComponent, ResearchDebugPanelComponent
- Inject: ResearchWorkflowStateService (as stateService), ResearchService, ConversationApiService
- Properties: userId (string), currentThreadId (string | undefined), currentQuery = signal('')
- Methods:
  - sendMessage(): validate input, call researchService.startResearch(), on success call stateService.startExecution()
  - onApprovalDecision(approved, feedback?): call researchService.approveReport(), stateService.clearApproval(), if approved resume streaming
  - onConversationSelected(threadId): load history or navigate
  - onNewConversation(threadId): stateService.reset(), set currentThreadId
- Inline template (~120 lines): conversation sidebar, research timeline, input area, debug panel, approval modal
- Use styleUrls pointing to existing SCSS file
- Estimated: ~180 lines

**Commit**: `refactor(langgraph): rewrite research-chat component with signal-based state`

---

### Task 4.2: Update research-chat SCSS -- IMPLEMENTED

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss`
**Action**: MODIFY
**Spec Reference**: implementation-plan.md: Component 7 (lines 558-573)

**Quality Requirements**:

- Change grid from 3-column to 2-column (remove agent status panel column)
- Remove obsolete styles for chat messages, message types, markdown rendering
- Keep conversation-sidebar-column, chat-input-container, chat-input-form, chat-input, send-button styles
- Add .main-content styles (flex column)
- Keep responsive breakpoints but update for 2-column layout

**Implementation Details**:

- Change grid-template-columns from `280px 320px 1fr` to `280px 1fr`
- Remove .sidebar styles (agent status panel)
- Remove .chat-messages styles
- Remove all .message-\* styles
- Remove .message-content markdown rendering styles (entire block ~240 lines)
- Remove .streaming-cursor styles
- Remove .loading-indicator styles
- Add .main-content: flex column, flex 1, min-width 0, overflow hidden
- Keep .chat-area renamed to .main-content
- Update responsive breakpoint to hide only conversation-sidebar-column
- Estimated: ~150 lines (down from 719)

**Commit**: `refactor(langgraph): simplify research-chat scss for timeline-based layout`

---

### Task 4.3: Delete research-chat.component.html (replaced by inline template) -- IMPLEMENTED

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.html`
**Action**: DELETE
**Dependencies**: Task 4.1 (component rewrite uses inline template)

**Quality Requirements**:

- File must be deleted since the rewritten component uses inline template
- Verify the component no longer references templateUrl

**Commit**: (combined with Task 4.1 commit)

---

**Batch 4 Verification**:

- [ ] ResearchChatComponent is under 200 lines
- [ ] Component uses inline template (no templateUrl)
- [ ] research-chat.component.html is deleted
- [ ] SCSS file updated with 2-column grid
- [ ] Approval modal still wired correctly (visible from signal, reportDraft from signal)
- [ ] Conversation sidebar still wired correctly
- [ ] No AgentStatusPanelComponent, MarkdownModule, or stream event type guard imports
- [ ] Build passes: `npx nx build dev-brand-ui`
- [ ] code-logic-reviewer approved

---

## Summary

| Batch | Name                                   | Tasks | Developer          | Dependencies |
| ----- | -------------------------------------- | ----- | ------------------ | ------------ |
| 1     | Foundation - Models + SSE Service Fix  | 3     | frontend-developer | None         |
| 2     | State Management Service               | 1     | frontend-developer | Batch 1      |
| 3     | UI Components - Timeline + Debug Panel | 2     | frontend-developer | Batch 2      |
| 4     | Integration - Component Rewrite + SCSS | 3     | frontend-developer | Batch 3      |

### Files Created (5)

- `apps/dev-brand-ui/src/app/features/research-chat/models/research-workflow.model.ts`
- `apps/dev-brand-ui/src/app/features/research-chat/models/index.ts`
- `apps/dev-brand-ui/src/app/features/research-chat/services/research-workflow-state.service.ts`
- `apps/dev-brand-ui/src/app/features/research-chat/components/research-timeline.component.ts`
- `apps/dev-brand-ui/src/app/features/research-chat/components/research-debug-panel.component.ts`

### Files Modified (2)

- `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts`
- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss`

### Files Rewritten (1)

- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`

### Files Deleted (1)

- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html`

### Files Preserved (1)

- `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts`
