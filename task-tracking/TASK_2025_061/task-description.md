# Requirements Document - TASK_2025_061

## Researcher Pages Streaming UI/UX Enhancement

---

## Introduction

The researcher workflow provides an autonomous AI research agent that performs web searches, reads sources, synthesizes information, and generates a research report. The backend correctly streams events via SSE, but the frontend has critical gaps: it misses 2 of the 5 SSE event types the backend emits, uses a monolithic 605-line component with plain class properties instead of Angular signals, has no research workflow timeline visualization, and no streaming text display for LLM reasoning.

This task applies the proven patterns from TASK_2025_059 (DevBrand workflow overhaul) to the researcher pages, **adapted for a single-agent workflow** rather than a multi-agent supervisor.

**Business Value**: The researcher is a key product feature. Users currently cannot see the agent thinking, searching, or reading sources in real-time. They see only static status messages and miss tool execution details. Fixing this makes the research process transparent and engaging.

---

## Problem Statement

### P1: Missing SSE Event Types (Critical Data Loss)

The frontend `research.service.ts` registers listeners for 4 SSE event names: `workflow-update`, `tool-execution`, `interruption_request`, `workflow_complete`. The backend `research-chat.controller.ts` emits 5 event types: `workflow-update`, `tool-execution`, `llm-token` (remapped from `message-stream`), `custom-progress` (remapped from `custom-stream`), and `debug-trace`. The `llm-token` and `custom-progress` events are silently dropped by the frontend because no EventSource listener exists for them.

**Impact**: All LLM token streaming (the agent's reasoning as it generates the report) is invisible. All custom progress events (search progress, source reading progress) are invisible.

### P2: Monolithic Component with No Signal-Based State

`research-chat.component.ts` is 605 lines with all state management, event handling, tool formatting, and UI logic in a single component using plain class properties (`isResearching`, `messages`, `reportDraft`). This violates Angular signal patterns and makes the component hard to maintain and test.

### P3: No Research Workflow Timeline

Users cannot see the progression of the research workflow. There is no visual timeline showing: query received -> searching -> reading sources -> synthesizing -> report draft -> HITL approval -> saved. Tool executions (web searches, report generation) appear as flat chat messages rather than a structured timeline.

### P4: No Streaming Text Display

When the researcher agent generates its report via LLM, the token-by-token output is invisible because `llm-token` events are dropped (P1). Even the existing `handleMessageStream` method in the component relies on the old `message-stream` type guard which does not match the backend's remapped `llm-token` SSE event name.

---

## Scope

### In Scope

**Area 1: SSE Service Fix (research.service.ts)**

- Add EventSource listeners for `llm-token` and `custom-progress` SSE event types
- Implement domain event routing pattern (switch/case on event type) instead of ad-hoc handlers
- Define typed interfaces for all research workflow events
- Create a RESEARCHER_AGENT_REGISTRY constant for the single research agent node name mapping

**Area 2: Signal-Based State Management Service (NEW: research-workflow-state.service.ts)**

- Extract all state from the component into a dedicated signal-based service
- Signals for: execution status, research phase, streaming text buffer, timeline entries, errors, HITL state
- Computed signals for: isExecuting, currentPhase, hasErrors, hasPendingApproval
- Domain event router that processes all 5 event types
- Reset method for new workflow executions

**Area 3: Component Refactoring (research-chat.component.ts)**

- Reduce from 605 lines to a lean orchestration component
- Replace all plain class properties with signal reads from the state service
- Remove all event handling logic (moved to state service)
- Remove all tool formatting logic (moved to state service or utility)
- Use the existing streaming-text-display component for LLM output
- Use the existing debug-panel component pattern for raw event inspection

**Area 4: Research Workflow Timeline UI**

- Create a research-specific timeline component showing single-agent workflow progression
- Timeline phases: Started -> Searching -> Reading Sources -> Synthesizing -> Report Draft -> Approval -> Saved
- Each tool execution (web-search, read-source, etc.) appears as a sub-entry under the current phase
- Reuse the TimelineEntry and TimelineEntryType models from devbrand-poc (or create research-specific variants)

**Area 5: Template and Layout Update (research-chat.component.html)**

- Replace flat chat message list with timeline-based visualization
- Integrate streaming-text-display component for LLM token output
- Add collapsible debug panel (hidden by default) for raw events
- Keep the HITL approval modal (already works)
- Keep the conversation sidebar (already works)
- Remove the AgentStatusPanelComponent (designed for multi-agent, not applicable to single-agent)

### Out of Scope

- Backend workflow logic changes (agent implementation, tool definitions)
- Backend SSE event format changes (frontend adapts to existing backend output)
- HITL approval flow changes (already functional)
- Conversation sidebar changes (already functional)
- New agent additions or workflow topology changes
- WebSocket migration (staying with SSE)
- Multi-agent supervisor patterns (researcher is single-agent)

---

## Requirements

### Requirement 1: Complete SSE Event Registration

**User Story:** As a user watching a research workflow, I want all backend events to be received and processed by the frontend, so that I can see the full research process in real-time.

#### Acceptance Criteria

1. WHEN the backend sends an `llm-token` SSE event THEN the research SSE service SHALL receive it and route it to the state service for streaming text accumulation
2. WHEN the backend sends a `custom-progress` SSE event THEN the research SSE service SHALL receive it and route it to the state service for progress tracking
3. WHEN the backend sends a `workflow-update` SSE event THEN the research SSE service SHALL receive it and route it to the state service for phase tracking
4. WHEN the backend sends a `tool-execution` SSE event THEN the research SSE service SHALL receive it and route it to the state service for tool activity display
5. WHEN the backend sends a `workflow_complete` SSE event THEN the research SSE service SHALL close the connection and notify the state service of completion
6. WHEN the backend sends an `interruption_request` SSE event THEN the research SSE service SHALL route it to the state service for HITL approval handling
7. WHEN any SSE event has malformed JSON data THEN the service SHALL log a warning and skip the event without crashing

### Requirement 2: Research Workflow State Service

**User Story:** As a developer maintaining the researcher feature, I want centralized signal-based state management, so that the component is lean and the state logic is testable and reusable.

#### Acceptance Criteria

1. WHEN the service is created THEN it SHALL expose Angular signals for: executionStatus, currentPhase, streamingText, timelineEntries, errors, hitlApproval
2. WHEN a `workflow-update` event arrives with a researcher node name THEN the service SHALL update the currentPhase signal based on the node's activity (searching, reading, synthesizing, etc.)
3. WHEN an `llm-token` event arrives THEN the service SHALL accumulate the token content into the streamingText signal buffer
4. WHEN a `tool-execution` event arrives THEN the service SHALL add a timeline entry with the tool name and result, and update the current phase appropriately
5. WHEN a `custom-progress` event arrives THEN the service SHALL update the progress percentage for the current phase
6. WHEN a `workflow_complete` event arrives THEN the service SHALL set executionStatus to 'completed' and add a completion timeline entry
7. WHEN an `interruption_request` event arrives THEN the service SHALL set hitlApproval signal with the report draft data
8. WHEN an error event arrives THEN the service SHALL add the error to the errors signal and update executionStatus
9. WHEN `startExecution()` is called THEN all signals SHALL be reset to initial state
10. WHEN the service processes events THEN it SHALL maintain an event history (capped at 5,000 entries) for the debug panel

### Requirement 3: Research Agent Registry

**User Story:** As a developer, I want a single source of truth for research agent node name mapping, so that event routing works correctly without hardcoded string comparisons.

#### Acceptance Criteria

1. WHEN the registry is defined THEN it SHALL contain an entry for the researcher agent node name with: id, display name, icon, description
2. WHEN a domain event arrives with a nodeName THEN the state service SHALL look up the nodeName in the registry for display metadata
3. WHEN the registry is exported THEN it SHALL follow the same AgentRegistryEntry interface used by the devbrand AGENT_REGISTRY

### Requirement 4: Research Workflow Timeline

**User Story:** As a user watching a research workflow, I want a visual timeline showing the research phases and tool executions, so that I can follow the research process step by step.

#### Acceptance Criteria

1. WHEN the workflow starts THEN the timeline SHALL show a "Research Started" entry with the query text
2. WHEN the researcher agent performs a web search tool call THEN the timeline SHALL show a "Searching" entry with the search query
3. WHEN the researcher agent reads a source THEN the timeline SHALL show a "Reading Source" entry with the source URL or title
4. WHEN the researcher agent begins synthesizing THEN the timeline SHALL show a "Synthesizing Report" entry
5. WHEN the researcher agent completes the report draft THEN the timeline SHALL show a "Report Draft Ready" entry
6. WHEN the workflow is interrupted for HITL approval THEN the timeline SHALL show a "Waiting for Approval" entry
7. WHEN the workflow completes THEN the timeline SHALL show a "Research Complete" entry with final status
8. WHEN an error occurs THEN the timeline SHALL show an error entry with red styling and the error message
9. WHEN each timeline entry is rendered THEN it SHALL have a timestamp, status indicator (active/completed/error), and descriptive message

### Requirement 5: Streaming Text Display Integration

**User Story:** As a user, I want to see the researcher agent's LLM output streaming in real-time, so that I can follow the reasoning and report generation process.

#### Acceptance Criteria

1. WHEN `llm-token` events arrive THEN the existing `streaming-text-display` component SHALL be used to render the accumulated text
2. WHEN tokens are actively streaming THEN the component SHALL show a blinking cursor animation
3. WHEN the workflow completes THEN the streaming text SHALL remain visible for review
4. WHEN a new workflow starts THEN the streaming text buffer SHALL be cleared
5. WHEN the streaming text display is rendered THEN it SHALL be labeled "Research Report" or "Agent Reasoning" depending on the phase

### Requirement 6: Component Refactoring

**User Story:** As a developer, I want the research-chat component to be lean and signal-based, so that it is maintainable and follows modern Angular patterns.

#### Acceptance Criteria

1. WHEN the component is refactored THEN it SHALL inject ResearchWorkflowStateService and read all display state from signals
2. WHEN the component is refactored THEN it SHALL NOT contain event handling logic (all moved to state service)
3. WHEN the component is refactored THEN it SHALL NOT contain tool formatting logic (moved to service or utility)
4. WHEN the component renders THEN it SHALL use the `@if` and `@for` control flow syntax
5. WHEN the component is refactored THEN it SHALL remove the AgentStatusPanelComponent import (not applicable to single-agent)
6. WHEN the component handles user input (send query, approval decision) THEN it SHALL delegate to service methods
7. WHEN the component is refactored THEN it SHALL be under 200 lines (down from 605)

### Requirement 7: Debug Panel

**User Story:** As a developer debugging the research workflow, I want a collapsible debug panel showing raw events, so that I can inspect the event stream when needed.

#### Acceptance Criteria

1. WHEN the page loads THEN the debug panel SHALL be hidden by default
2. WHEN the user clicks the debug toggle THEN the panel SHALL expand to show raw event history
3. WHEN events are received THEN the debug panel SHALL display them with type, timestamp, and JSON data
4. WHEN the debug panel is open THEN it SHALL support scrolling through the event history

---

## Non-Functional Requirements

### Performance Requirements

- **Token Streaming Latency**: Token text SHALL appear in the UI within 50ms of SSE event receipt
- **Event Processing**: The system SHALL handle 50+ events per second without frame drops (researcher generates fewer events than multi-agent supervisor)
- **Memory**: Event history SHALL not exceed 5,000 entries to prevent memory growth

### Code Quality Requirements

- **Type Safety**: No `any` types in new or modified code; all event payloads SHALL have typed interfaces
- **Angular Patterns**: All components SHALL be standalone, use signals, use modern control flow (`@if`, `@for`), and use `inject()` pattern
- **TailwindCSS**: All new styling SHALL use TailwindCSS utility classes
- **Reuse**: SHALL reuse existing shared components (streaming-text-display, conversation-sidebar) rather than creating duplicates

### Reliability Requirements

- **Graceful Degradation**: If an SSE event has malformed data, the system SHALL log a warning and skip it
- **Connection Loss**: If SSE connection drops, the UI SHALL show a disconnected state and retain previously received data
- **Error Recovery**: All error states SHALL be clearable via new workflow execution

---

## Technical Constraints

1. **Single-Agent Workflow**: The researcher is ONE agent with tool calls - NOT a multi-agent supervisor. There is no delegation, no supervisor routing. The timeline shows phases of a single agent's work, not agent-to-agent handoffs.
2. **Backend SSE Event Names**: The backend remaps domain types before sending SSE. It sends: `workflow-update` (SSE name) for workflow-update events, `tool-execution` for tool events, `llm-token` for message-stream events, `custom-progress` for custom-stream events, `workflow_complete` for completion, `interruption_request` for HITL. The frontend must register listeners for these exact SSE event names.
3. **Angular Signals**: All new state must use Angular signals and computed signals.
4. **Standalone Components**: All components must be standalone.
5. **TailwindCSS**: All styling via Tailwind utility classes.
6. **Existing Components to Reuse**: `streaming-text-display.component.ts` (from devbrand-poc/components), `conversation-sidebar` (from shared/components). The debug-panel pattern from devbrand-poc should be followed but a research-specific instance created.
7. **Models to Reuse**: The `DomainEvent` interface, `TimelineEntry`/`TimelineEntryType` types, and `AgentRegistryEntry` interface from devbrand-poc/models can be imported or used as reference. Research-specific timeline entry types may be needed (e.g., 'searching', 'reading-source', 'synthesizing').
8. **Auth Guards**: Already in place on both frontend route (`canActivate: [authGuard]`) and backend endpoints (`@UseGuards(JwtAuthGuard)` and `@UseGuards(QueryTokenAuthGuard)`). No auth changes needed.

---

## Stakeholder Analysis

### Primary Stakeholders

| Stakeholder            | Impact | Involvement    | Success Criteria                                                              |
| ---------------------- | ------ | -------------- | ----------------------------------------------------------------------------- |
| End Users              | High   | Observers      | Can follow the research process in real-time (searching, reading, generating) |
| Product Owner          | High   | Requirements   | Research feature feels polished and showcases autonomous AI research          |
| Developer (maintainer) | Medium | Implementation | Code is clean, typed, signal-based, follows existing devbrand patterns        |

### Secondary Stakeholders

| Stakeholder       | Impact | Involvement | Success Criteria                                       |
| ----------------- | ------ | ----------- | ------------------------------------------------------ |
| QA/Tester         | Medium | Validation  | Can verify all event types are processed and displayed |
| Future Developers | Low    | Maintenance | Architecture matches devbrand pattern for consistency  |

---

## Risk Assessment

| Risk                                                    | Probability | Impact | Mitigation                                                          |
| ------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------- |
| Backend SSE event names differ from documented          | Low         | High   | Already confirmed by reading research-chat.controller.ts source     |
| Research agent node names not in expected format        | Medium      | Medium | Create configurable agent registry; test with live workflow         |
| Tool execution events don't contain expected tool names | Medium      | Medium | Add fallback formatting for unknown tool names                      |
| Streaming text creates excessive re-renders             | Low         | Medium | Use OnPush change detection; signals batch updates naturally        |
| Existing approval modal breaks after refactoring        | Low         | High   | Keep approval modal component unchanged; only change how it's wired |

---

## Success Criteria

1. **Zero dropped events**: Every `workflow-update`, `tool-execution`, `llm-token`, `custom-progress`, `workflow_complete`, and `interruption_request` event from the backend is processed by the frontend
2. **Streaming text visible**: When the researcher agent generates text via LLM, users see it streaming in real-time
3. **Research timeline visible**: Users can follow the research process through a visual timeline showing search -> read -> synthesize -> report phases
4. **Tool executions visible**: When the agent calls web-search or other tools, the tool name and result appear in the timeline
5. **HITL still works**: The approval modal still functions correctly for report review
6. **Component size reduction**: research-chat.component.ts reduced from 605 lines to under 200 lines
7. **Signal-based state**: All component state reads from signals, no plain class properties for workflow state
8. **Debug panel available**: Developers can toggle a debug panel to inspect raw events

---

## Dependencies

- Backend research controller must continue emitting SSE events in current format (no backend changes needed)
- TailwindCSS must be configured in the Angular project (already is)
- Existing shared components (streaming-text-display, conversation-sidebar) must remain available
- DevBrand POC models (DomainEvent, TimelineEntry, AgentRegistryEntry) available for import or reference
