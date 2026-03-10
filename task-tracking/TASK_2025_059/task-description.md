# Requirements Document - TASK_2025_059

## DevBrand Workflow Streaming UI/UX Overhaul

---

## Introduction

The DevBrand supervisor workflow executes a 3-agent pipeline (GitHub Code Analyzer, Personal Brand Strategist, Content Creator) coordinated by an LLM supervisor. The backend correctly streams events via SSE, but the frontend is fundamentally disconnected from the actual event types the backend emits. The result is a broken demo: agent cards stuck at IDLE 0%, invisible errors, no streaming text, and a raw JSON event log that shows 6 events out of 20,000+ actual stream events.

**Root Cause**: The backend emits 4 domain event types (`workflow-update`, `tool-execution`, `message-stream`, `custom-stream`) but the frontend SSE service only listens for `workflow-update` and `workflow_complete` SSE event names. The workflow state service then further filters to only process events where `update.type === 'workflow-update'`, silently dropping `message-stream` and `tool-execution` events. Additionally, the `mapNodeNameToEventType()` function produces event types (like `supervisor:route`) that don't exist in the `StreamEventType` enum, causing the switch/case to fall through to the default "unhandled" path.

**Business Value**: This is the primary demo for the DevBrand platform. A broken streaming UI undermines the entire product demonstration and makes the multi-agent orchestration invisible to users.

---

## Problem Statement

### P1: Events Silently Dropped (Critical Data Loss)

The SSE service (`devbrand-sse.service.ts`) only registers listeners for two SSE event names: `workflow-update` and `workflow_complete`. The backend sends ALL domain events (including `message-stream`, `tool-execution`, `custom-stream`) as SSE event type `workflow-update`, which means they arrive at the frontend. However, the workflow state service (`devbrand-workflow-state.service.ts` line 419) only processes events where `update.type === 'workflow-update'`, silently discarding `message-stream`, `tool-execution`, and other domain event types.

**Evidence**: 20,757 log lines in the browser console, but only 6 events reached the Event Stream UI.

### P2: Agent Cards Permanently Stuck at IDLE 0%

The `extractAgentId()` method (line 990) expects node IDs in `{domain}/{phase}/{activity}/{detail}` format and maps phases like `github-analysis` to agent IDs. But the actual `nodeName` values from the supervisor workflow (e.g., `github-code-analyzer`, `personal-brand-strategist`, `supervisor`) don't follow this format. The `mapNodeNameToEventType()` function at line 482 attempts basic string matching but produces types like `supervisor:route` which are not in the `StreamEventType` enum, so the switch/case falls through without updating agent state.

### P3: Empty Token Chunks Flooding the Stream

The backend streams every LLM token chunk, including hundreds of `content: ""` empty chunks. These pass through the parser but contain no useful data, creating noise in the event stream and wasting rendering cycles.

### P4: Errors Invisible to Users

When the `github-code-analyzer` agent fails with "Approval operations require authentication", this arrives as a `tool-execution` event with error data. Since `tool-execution` events are silently dropped (P1), the error is never displayed. The agent card remains at IDLE and the user has no indication of failure.

### P5: No Supervisor Orchestration Visibility

The supervisor LLM's thinking and routing decisions are emitted as `message-stream` events (token streaming) and `workflow-update` events (with supervisor nodeName). Since `message-stream` events are dropped and supervisor nodeNames don't map to any agent ID, the entire orchestration layer is invisible.

### P6: UI Presentation is Debug-Quality

The current UI shows tiny truncated agent cards ("Gi...", "Pe...", "Co..."), raw JSON in the event stream, and no visual connection between the supervisor's decisions and agent activity. It looks like a debug console, not a product demo.

---

## Scope

### In Scope

**Area 1: Event Processing Fixes (Backend + Service Layer)**

- Fix the SSE service to properly route all domain event types to the workflow state service
- Fix the workflow state service to process `message-stream`, `tool-execution`, and `custom-stream` events
- Fix agent ID extraction to handle actual supervisor workflow node names
- Filter empty `message-stream` token chunks (empty `content` field) on the backend before sending
- Wire agent progress from tool execution and message-stream events
- Handle supervisor routing events to track delegation decisions

**Area 2: UI/UX Overhaul (Frontend Components)**

- Replace the current event-stream component with a conversation-thread style orchestration timeline
- Replace the current progress-visualization agent cards with full-width agent activity panels
- Add streaming text display for both supervisor reasoning and agent LLM output
- Add error display with clear attribution to the failing agent
- Add supervisor delegation visualization (supervisor thinking -> delegates to Agent X)
- Add agent status transitions (idle -> delegated -> working -> complete/error)
- Redesign the page layout to prioritize the orchestration narrative over raw data

**Area 3: Authentication Guards (Frontend + Backend)**

- Frontend Angular route guard on DevBrand POC page: redirect to landing/login if user is not authenticated
- Backend NestJS route guard on DevBrand API endpoints: reject unauthenticated requests before workflow starts (prevents mid-execution auth failures inside LangGraph tools)
- Ensure JWT/auth context is properly propagated through SSE connection and into the workflow execution context

### Out of Scope

- Backend workflow logic changes (agent implementations, supervisor prompts, agent topology)
- HITL approval flow (existing infrastructure, not broken)
- WebSocket migration (staying with SSE)
- Conversation history/sidebar changes
- New agent additions or workflow topology changes

---

## Requirements

### Requirement 1: Complete SSE Event Processing

**User Story:** As a developer watching the DevBrand workflow, I want all backend events to be processed by the frontend, so that I can see the full picture of what the agents are doing.

#### Acceptance Criteria

1. WHEN the backend sends a `message-stream` SSE event THEN the workflow state service SHALL process it and update the appropriate agent's streaming text buffer
2. WHEN the backend sends a `tool-execution` SSE event THEN the workflow state service SHALL extract the tool name and result/error and update the corresponding agent's status and current action
3. WHEN the backend sends a `custom-stream` SSE event THEN the workflow state service SHALL process progress data and update the relevant agent's progress percentage
4. WHEN a `message-stream` event arrives with empty `content` ("") THEN the backend SHALL filter it before sending over SSE, preventing unnecessary network traffic and rendering
5. WHEN a `workflow-update` event arrives with a supervisor nodeName THEN the workflow state service SHALL recognize it as a supervisor routing decision and extract the delegation target
6. WHEN a `workflow-update` event arrives with an agent nodeName (e.g., `github-code-analyzer`) THEN `extractAgentId()` SHALL correctly identify the agent using direct name matching (not just phase-based extraction from canonical node IDs)

### Requirement 2: Agent Status State Machine

**User Story:** As a user watching agents work, I want to see each agent's status change in real-time, so that I understand the workflow progression.

#### Acceptance Criteria

1. WHEN the supervisor delegates to an agent THEN the agent's status SHALL transition from `idle` to `delegated`
2. WHEN a `message-stream` event arrives for an agent THEN the agent's status SHALL transition to `thinking`
3. WHEN a `tool-execution` event arrives for an agent THEN the agent's status SHALL transition to `executing`
4. WHEN a `workflow-update` event indicates agent completion THEN the agent's status SHALL transition to `completed` with progress 100%
5. WHEN a `tool-execution` event contains an error THEN the agent's status SHALL transition to `error` and the error message SHALL be stored for display
6. WHEN the agent status type is extended with `delegated` THEN the `AgentStatus` type SHALL include it as a valid state

### Requirement 3: Streaming Text Accumulation

**User Story:** As a user, I want to see the LLM-generated text streaming in real-time from both the supervisor and individual agents, so that I can follow the AI reasoning process.

#### Acceptance Criteria

1. WHEN `message-stream` events arrive for the supervisor node THEN tokens SHALL be accumulated into a supervisor text buffer signal and displayed in the UI
2. WHEN `message-stream` events arrive for an agent node THEN tokens SHALL be accumulated into that agent's text buffer signal and displayed in the agent's activity panel
3. WHEN a new agent begins receiving tokens THEN the previous agent's text buffer SHALL remain visible (not cleared)
4. WHEN the workflow completes or errors THEN all accumulated text SHALL remain visible for review
5. WHEN the user starts a new workflow execution THEN all text buffers SHALL be cleared

### Requirement 4: Orchestration Timeline UI

**User Story:** As a user watching the DevBrand workflow, I want to see a conversation-thread style timeline showing the supervisor's decisions and agent activity, so that the experience feels like watching a team collaborate.

#### Acceptance Criteria

1. WHEN the supervisor makes a routing decision THEN a timeline entry SHALL appear showing "Supervisor: Delegating to [Agent Name]" with a delegation arrow or visual indicator
2. WHEN an agent begins working THEN a timeline entry SHALL appear showing the agent's name, current action, and a visual status indicator (spinning for active, checkmark for done, X for error)
3. WHEN an agent streams LLM text THEN the text SHALL appear in real-time within that agent's timeline entry, with a typing/streaming animation
4. WHEN a tool execution occurs THEN the tool name and outcome SHALL appear as a sub-entry within the agent's timeline section
5. WHEN an agent encounters an error THEN the error SHALL appear prominently in the timeline with red styling and the error message SHALL be human-readable (not raw JSON)
6. WHEN the workflow completes THEN the timeline SHALL show a completion entry with final status

### Requirement 5: Agent Activity Panels (Replace Progress Cards)

**User Story:** As a user, I want full-width agent activity panels instead of tiny truncated cards, so that I can see useful information about each agent.

#### Acceptance Criteria

1. WHEN agent panels are rendered THEN each panel SHALL display the full agent name, current status badge, and current action description without truncation
2. WHEN an agent is actively working THEN its panel SHALL be visually distinguished (border highlight, subtle background color) from idle and completed agents
3. WHEN an agent has streaming text THEN the text SHALL be displayed within the agent panel in a readable, formatted area
4. WHEN an agent has tool execution results THEN key details (tool name, success/failure) SHALL be displayed in the panel
5. WHEN an agent errors THEN its panel SHALL display the error with red styling and an error icon

### Requirement 6: Page Layout Redesign

**User Story:** As a user, I want the page to prioritize the orchestration narrative over raw debug data, so that the experience is intuitive and informative.

#### Acceptance Criteria

1. WHEN the page loads THEN the layout SHALL use a single-column main content area (no side-by-side split of progress and events)
2. WHEN execution is running THEN the primary content area SHALL show the orchestration timeline with integrated agent panels
3. WHEN the user wants to see raw event data THEN there SHALL be a collapsible/expandable debug section at the bottom (hidden by default)
4. WHEN the page is viewed on mobile THEN the layout SHALL be responsive and usable (no horizontal scroll, readable text)

### Requirement 7: Authentication Guards

**User Story:** As a user, I want unauthenticated access to be blocked before the workflow starts, so that I don't encounter cryptic mid-execution auth errors like "Approval operations require authentication".

#### Acceptance Criteria

1. WHEN a user navigates to the DevBrand POC page without being authenticated THEN the frontend route guard SHALL redirect them to the landing/login page
2. WHEN an unauthenticated request hits a DevBrand API endpoint THEN the backend guard SHALL return 401 Unauthorized before the workflow starts (not fail inside a LangGraph tool mid-execution)
3. WHEN the SSE stream is established THEN the auth token/context SHALL be propagated through to the workflow execution so that agent tools (like HITL approval) have valid auth context
4. WHEN the auth token expires during a workflow execution THEN the UI SHALL show a clear "session expired" message (not a cryptic tool error)

---

## Non-Functional Requirements

### Performance Requirements

- **Token Streaming Latency**: Token text SHALL appear in the UI within 50ms of SSE event receipt (no batching delay)
- **Event Processing**: The system SHALL handle 100+ events per second without frame drops or UI lag
- **Memory**: Event history SHALL not exceed 10,000 entries (older entries discarded) to prevent memory growth during long-running workflows

### Reliability Requirements

- **Graceful Degradation**: If a `message-stream` event has malformed data, the system SHALL log a warning and skip the event (not crash)
- **Connection Loss**: If SSE connection drops during execution, the UI SHALL show a disconnected state and retain all previously received data
- **Error Recovery**: All error states SHALL be clearable via the reset/new-execution flow

### Code Quality Requirements

- **Type Safety**: No `any` types in new or modified code; all event payloads SHALL have typed interfaces
- **Angular Patterns**: All components SHALL be standalone, use signals (not BehaviorSubjects for new state), use modern control flow (`@if`, `@for`), and use `inject()` pattern
- **TailwindCSS**: All styling SHALL use TailwindCSS utility classes (no custom CSS except `:host` display block)

---

## Technical Constraints

1. **Angular Signals**: All new component state must use Angular signals and computed signals
2. **Standalone Components**: All components must be standalone (no NgModules)
3. **TailwindCSS**: All styling via Tailwind utility classes
4. **SSE Streaming**: Must use existing EventSource-based SSE pattern (no WebSocket migration)
5. **Existing Service Architecture**: Must work within the existing DevBrandSseService -> DevBrandWorkflowStateService -> Component signal hierarchy
6. **Backend Domain Events**: The backend emits 4 domain event types: `workflow-update`, `tool-execution`, `message-stream`, `custom-stream`. All are sent as SSE event type `workflow-update`. The frontend must discriminate by the `type` field in the parsed JSON data.
7. **Agent Node Names**: The supervisor workflow uses direct agent IDs as node names (`github-code-analyzer`, `personal-brand-strategist`, `content-creator`, `supervisor`) - not canonical path-style IDs.

---

## Stakeholder Analysis

### Primary Stakeholders

| Stakeholder            | Impact | Involvement    | Success Criteria                                                   |
| ---------------------- | ------ | -------------- | ------------------------------------------------------------------ |
| Demo Audience          | High   | Observers      | Can follow the multi-agent workflow in real-time without confusion |
| Product Owner          | High   | Requirements   | Demo feels polished and showcases the multi-agent architecture     |
| Developer (maintainer) | Medium | Implementation | Code is clean, typed, follows existing patterns                    |

### Secondary Stakeholders

| Stakeholder       | Impact | Involvement | Success Criteria                                         |
| ----------------- | ------ | ----------- | -------------------------------------------------------- |
| QA/Tester         | Medium | Validation  | Can verify all event types are processed and displayed   |
| Future Developers | Low    | Maintenance | Architecture is extensible for new agents or event types |

---

## Risk Assessment

| Risk                                                       | Probability | Impact | Mitigation                                                             |
| ---------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------- |
| Backend event format differs from expected structure       | Medium      | High   | Read actual backend log data; validate with live test early            |
| Token streaming creates excessive re-renders               | Medium      | Medium | Use OnPush change detection; batch token updates if needed             |
| Agent name mapping breaks for new agents                   | Low         | Medium | Use a configurable agent registry map, not hardcoded if/else           |
| SSE event parsing fails silently                           | Medium      | High   | Add explicit error logging for every event type; add debug mode toggle |
| Timeline UI becomes too long for multi-iteration workflows | Low         | Medium | Implement collapsible sections per agent delegation cycle              |

---

## Success Criteria

1. **Zero dropped events**: Every `workflow-update`, `message-stream`, `tool-execution`, and `custom-stream` event from the backend is processed by the frontend
2. **Agent status transitions**: All 3 agent cards show correct status transitions (idle -> delegated -> thinking/executing -> completed/error) during a live workflow run
3. **Streaming text visible**: Supervisor reasoning and agent LLM output are displayed in real-time as streaming text
4. **Errors visible**: When the github-code-analyzer fails with auth error, the error message is clearly displayed in the UI with agent attribution
5. **Orchestration narrative**: A non-technical observer can follow the supervisor's delegation decisions and understand which agent is doing what
6. **No raw JSON**: The default view shows human-readable orchestration timeline, not raw JSON event data (debug view available but hidden by default)

---

## Dependencies

- Backend supervisor workflow must continue emitting `DomainStreamEvent` types via SSE (no backend changes needed except empty chunk filtering)
- TailwindCSS must be configured in the Angular project (already is)
- Angular CDK ScrollingModule available (already imported)
