# Development Tasks - TASK_2025_025

**Task Type**: Frontend - Full-Stack Integration POC
**Developer Needed**: frontend-developer
**Total Tasks**: 10 atomic tasks
**Decomposed From**:

- implementation-plan.md (2334 lines - complete architecture)
- task-description.md (867 lines - requirements specification)

---

## Task Breakdown

### Task 1: Type System & Models (Stream Events) ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\stream-events.model.ts
**Specification Reference**:

- implementation-plan.md:1219-1340 (Type System section)
- research-summary.md:332-366 (StreamEventType enumeration)

**Expected Commit Pattern**: `feat(angular-3d): add complete type system for LangGraph streaming events`
**Git Commit**: 78b0768

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors (strict mode)
- ✅ All 16 StreamEventType enum values defined
- ✅ Zod schemas for runtime validation
- ✅ No 'any' types used

**Verification Results**:

- ✅ File created at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\stream-events.model.ts
- ✅ Git commit verified: 78b0768 - feat(angular-3d): add complete type system for LangGraph streaming events
- ✅ TypeScript strict mode compilation: PASSED (npx tsc --noEmit)
- ✅ Pre-commit hooks: PASSED (lint-staged, typecheck:affected, commitlint)
- ✅ All 16 StreamEventType enum values implemented
- ✅ Zod schemas implemented: StreamMetadataSchema, StreamUpdateSchema, TokenUpdateSchema, WebSocketErrorSchema, ConnectionStateSchema, SubscriptionConfirmedSchema
- ✅ Zero 'any' types used (100% type safety)
- ✅ Comprehensive JSDoc comments (609 lines total, extensive documentation)
- ✅ Type guards implemented: isWorkflowEvent, isNodeEvent, isProgressEvent, isTokenEvent, isErrorEvent, isStreamDataEvent, isAgentEvent, isAgentTypeEvent, hasNodeId
- ✅ Helper functions: extractAgentTypeFromNodeId, parseNodeId

**Implementation Details**:

- **StreamEventType Enum**: 16 event types (workflow:start, workflow:end, node:start, node:end, progress, milestone, token, error, etc.)
- **StreamMetadata Interface**: timestamp, sequenceNumber, executionId, nodeId, agentType, domain/phase/activity/detail
- **StreamUpdate Interface**: type, data, metadata (discriminated union)
- **Zod Schemas**: StreamMetadataSchema, StreamUpdateSchema for runtime validation
- **Additional Interfaces**: TokenUpdate, WebSocketError, ConnectionState, SubscriptionConfirmed
- **Evidence**: libs/langgraph-modules/streaming/src/lib/constants.ts (backend source)

**Quality Requirements**:

- TypeScript strict mode compliance
- 100% type coverage (no any/unknown without guards)
- Zod validation for all runtime-received data
- JSDoc comments for all public interfaces

---

### Task 2: Execution State & Agent Progress Models ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**:

- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\execution-state.model.ts
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\agent-progress.model.ts

**Specification Reference**:

- implementation-plan.md:587-622 (State Type Definitions)
- research-summary.md:148-302 (3-Agent workflow analysis)

**Expected Commit Pattern**: `feat(angular-3d): add execution state and agent progress models`
**Git Commit**: 8c1e3ba

**Verification Requirements**:

- ✅ Both files exist at specified paths
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ All state types defined (ExecutionStatus, ExecutionState, AgentStatus, AgentProgress)

**Verification Results**:

- ✅ Git commit verified: 8c1e3ba - feat(angular-3d): add execution state and agent progress models
- ✅ File 1: execution-state.model.ts (145 lines, comprehensive JSDoc)
- ✅ File 2: agent-progress.model.ts (161 lines, comprehensive JSDoc)
- ✅ TypeScript strict mode compilation: PASSED (no 'any' types)
- ✅ ExecutionStatus: 5 states (idle, running, paused, completed, error)
- ✅ ExecutionState: status, currentStep, totalSteps, startTime, endTime, error
- ✅ AgentStatus: 6 states (idle, thinking, executing, waiting, completed, error)
- ✅ AgentProgress: agentId, agentName, status, progress, currentAction, lastUpdate
- ✅ Comprehensive JSDoc with examples for all interfaces
- ✅ Specification compliance verified

**Implementation Details**:

- **ExecutionStatus**: 'idle' | 'running' | 'paused' | 'completed' | 'error'
- **ExecutionState**: status, currentStep, totalSteps, startTime, endTime, error
- **AgentStatus**: 'idle' | 'thinking' | 'executing' | 'waiting' | 'completed' | 'error'
- **AgentProgress**: agentId, agentName, status, progress, currentAction, lastUpdate
- **AgentProgressMap**: 3 agents (github-code-analyzer, personal-brand-strategist, content-creator)

---

### Task 3: DevBrand API Service (REST Integration) ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-api.service.ts
**Specification Reference**:

- implementation-plan.md:38-96 (DevBrandApiService section)
- research-rest-api.md:45-112 (Backend REST API)

**Expected Commit Pattern**: `feat(angular-3d): add REST API service for workflow execution`
**Git Commit**: 309ec35

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Service uses inject() function (modern Angular)
- ✅ executeWorkflow() method implemented
- ✅ Error handling with retry logic

**Verification Results**:

- ✅ File created at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-api.service.ts
- ✅ Git commit verified: 309ec35 - feat(angular-3d): implement devbrand api service with error handling
- ✅ TypeScript strict mode compilation: PASSED (npx tsc --noEmit)
- ✅ Pre-commit hooks: PASSED (lint-staged, typecheck:affected, commitlint)
- ✅ Service uses modern inject() pattern (line 70)
- ✅ executeWorkflow() returns Observable<ExecuteDevBrandResponse> (line 127-147)
- ✅ Timeout: 30 seconds (line 142)
- ✅ Retry logic: 2 attempts, 1 second delay (line 143)
- ✅ Comprehensive error handling with 4 error types:
  - TimeoutError: "Request timed out after 30 seconds" (line 207-209)
  - Network errors: "Unable to connect to server" (line 213-216)
  - HTTP status errors: 400, 404, 500, 502, 503 with user-friendly messages (line 219-250)
  - Unknown errors: Generic error message with details (line 260-265)
- ✅ Zero 'any' types used (100% type safety with unknown error parameter)
- ✅ Comprehensive JSDoc comments (270 lines total, extensive documentation)

**Additional Files Created**:

- ✅ D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\execute-devbrand-request.model.ts (45 lines)
- ✅ D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\execute-devbrand-response.model.ts (98 lines)
- ✅ D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\models\index.ts (24 lines - central export point)

**Implementation Details**:

- **Pattern**: Angular HttpClient with inject() function (evidence: animation.service.ts:63-65)
- **API URL**: environment.apiUrl (evidence: environment.ts:3-4)
- **Methods**: executeWorkflow(request: ExecuteDevBrandRequest): Observable<ExecuteDevBrandResponse>
- **DTOs**:
  - ExecuteDevBrandRequest: { githubUsername: string, userId?: string }
  - ExecuteDevBrandResponse: { executionId, status, message, websocketUrl, websocketInstructions }
- **Error Handling**: timeout(30000), retry({ count: 2, delay: 1000 }), catchError
- **Backend Evidence**: apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:143-210

**Quality Requirements**:

- providedIn: 'root' decorator
- Modern inject() pattern (not constructor injection)
- Typed observables (RxJS)
- Comprehensive error handling
- JSDoc comments on public methods

---

### Task 4: DevBrand WebSocket Service (Real-time Events) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-websocket.service.ts
**Specification Reference**:

- implementation-plan.md:100-277 (DevBrandWebSocketService section)
- research-websocket.md:65-109 (WebSocket connection flow)

**Expected Commit Pattern**: `feat(angular-3d): add WebSocket service for real-time streaming`

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Socket.io-client integrated (^4.7.0)
- ✅ Connection lifecycle methods (connect, disconnect, subscribeToExecution)
- ✅ Automatic reconnection logic

**Implementation Details**:

- **Pattern**: Service with signal-based connection state
- **Socket.io Config**: transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 3000
- **Signals**: \_connectionState (signal), \_streamUpdates (Subject), \_tokenUpdates (Subject), \_errors (Subject)
- **Events Handled**:
  - 'connection_status' → update connection state
  - 'subscription_confirmed' → log subscription
  - 'stream_update' → validate and emit StreamUpdate
  - 'token_update' → emit TokenUpdate
  - 'error' → emit WebSocketError
  - 'disconnect' → update state
  - 'reconnect_attempt' → update reconnection count
- **Validation**: Zod runtime validation (StreamUpdateSchema.parse)
- **Evidence**: libs/langgraph-modules/streaming/.../streaming-websocket.service.ts:108-121

**Quality Requirements**:

- Signal-based state (modern Angular)
- Readonly signal accessors (asReadonly())
- Comprehensive event listeners
- Zod runtime validation
- Automatic cleanup on disconnect

---

### Task 5: DevBrand Workflow State Service (State Management) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-workflow-state.service.ts
**Specification Reference**:

- implementation-plan.md:307-584 (DevBrandWorkflowStateService section)
- implementation-plan.md:1344-1403 (State Management Strategy)

**Expected Commit Pattern**: `feat(angular-3d): add workflow state service with signal-based state management`

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Integrates with DevBrandWebSocketService
- ✅ Signal-based state management
- ✅ Event processing logic for all 16 event types

**Implementation Details**:

- **Pattern**: RxJS BehaviorSubjects + Angular Signals hybrid
- **State Signals**:
  - \_executionState (signal): status, executionId, timestamps, error
  - \_agentProgress (signal): AgentProgressMap for 3 agents
  - \_hitlQueue (signal): HITLApproval[]
  - \_eventHistory (BehaviorSubject): StreamUpdate[] with virtual scrolling support
- **Computed Properties**: isExecuting, currentAgent, workflowProgress, hasPendingApprovals
- **Methods**:
  - startExecution(executionId)
  - processStreamUpdate(update) → handles all StreamEventType values
  - addToEventHistory(update) → sequence validation
  - getEventsByType(type)
  - getEventsByAgent(agentId)
  - reset()
- **Agent Mapping**: Extract agent ID from canonical node IDs (devbrand/github-analysis → github-code-analyzer)
- **Evidence**: animation.service.ts:71-84 (signal pattern), animation.service.ts:97-116 (computed properties)

**Quality Requirements**:

- Signal-based state (signal + asReadonly)
- Computed signals for derived state
- BehaviorSubject for event history (optimized for large arrays)
- Comprehensive event processing (all 16 types)
- Sequence number gap detection

---

### Task 6: Execution Control Component (Workflow Trigger) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\execution-control.component.ts
**Specification Reference**:

- implementation-plan.md:647-818 (ExecutionControlComponent section)
- task-description.md:196-220 (Workflow Execution & Trigger Components)

**Expected Commit Pattern**: `feat(angular-3d): add execution control component with reactive form`

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Standalone component pattern
- ✅ Reactive form with validation
- ✅ Integrates with DevBrandApiService and DevBrandWorkflowStateService

**Implementation Details**:

- **Pattern**: Standalone component with reactive forms (evidence: chromadb-section.component.ts:31-41)
- **Imports**: CommonModule, ReactiveFormsModule
- **Form Controls**: githubUsername (required, minLength: 1), userId (optional)
- **Signals**: \_executionId (signal), \_error (signal)
- **Readonly Signals**: executionId, error, isExecuting (from stateService)
- **Outputs**: executionStarted (output<string>())
- **Template**:
  - GitHub username input with validation
  - User ID input (optional)
  - Execute button with loading state (disabled when executing or invalid)
  - Success message with execution ID
  - Error display with retry
- **Styling**: Tailwind CSS (bg-white, rounded-lg, shadow-sm, border-gray-200, etc.)
- **Modern Angular**: @if/@else control flow (NOT \*ngIf)

**Quality Requirements**:

- Standalone component (standalone: true)
- Signals for state (NOT ngOnInit)
- Modern control flow (@if, NOT \*ngIf)
- Typed reactive forms
- Tailwind CSS styling
- Output events for parent coordination

---

### Task 7: Progress Visualization Component (Agent Tracking) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\progress-visualization.component.ts
**Specification Reference**:

- implementation-plan.md:822-1010 (ProgressVisualizationComponent section)
- task-description.md:249-275 (Agent Activity Monitoring)

**Expected Commit Pattern**: `feat(angular-3d): add progress visualization component with 3-agent tracking`

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Standalone component pattern
- ✅ Displays 3 agents (github-code-analyzer, personal-brand-strategist, content-creator)
- ✅ Real-time progress updates

**Implementation Details**:

- **Pattern**: Standalone component with computed state
- **Imports**: CommonModule
- **State**: Computed signals from DevBrandWorkflowStateService
  - workflowProgress (computed): Overall progress percentage
  - currentAgent (computed): Active agent ID
  - agentProgress (signal): AgentProgressMap
- **Agent Metadata**:
  - github-code-analyzer: "GitHub Code Analyzer" - "Analyzes repositories and extracts achievements"
  - personal-brand-strategist: "Personal Brand Strategist" - "Develops brand strategy and positioning"
  - content-creator: "Content Creator" - "Generates platform-specific content"
- **Template**:
  - Overall progress bar with percentage
  - 3 agent progress cards (loop with @for)
  - Status badges (pending, active, completed)
  - Status icons (clock, spinner, checkmark)
  - Current step display
  - Completed steps count
  - Active agent indicator
- **Styling**: Tailwind CSS with dynamic classes based on status

**Quality Requirements**:

- Standalone component
- Computed signals from service
- Modern control flow (@for, @if)
- No direct service state mutation
- Responsive design

---

### Task 8: Event Stream Component (Real-time Feed) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\components\event-stream.component.ts
**Specification Reference**:

- implementation-plan.md:1014-1213 (EventStreamComponent section)
- task-description.md:304-334 (Comprehensive Event Logging)

**Expected Commit Pattern**: `feat(angular-3d): add event stream component with virtual scrolling and filtering`

**Verification Requirements**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Virtual scrolling implemented (CDK)
- ✅ Event filtering by type
- ✅ Export to JSON functionality

**Implementation Details**:

- **Pattern**: Virtual scrolling for performance
- **Imports**: CommonModule, FormsModule, ScrollingModule (@angular/cdk/scrolling)
- **State Signals**:
  - \_selectedTypes (signal): StreamEventType[] for filtering
  - \_expandedEvents (signal): number[] for expandable event details
- **Computed Signals**: filteredEvents (from eventHistory$ with type filters)
- **Template**:
  - Filter controls (checkboxes for each StreamEventType)
  - Clear filters button
  - Virtual scroll viewport (cdk-virtual-scroll-viewport) with itemSize="80" and height="600px"
  - Event items with: type badge, timestamp (HH:mm:ss.SSS), node ID, sequence number
  - Expandable raw JSON data
  - Export to JSON button
- **Event Type Badge Colors**:
  - WORKFLOW_START: bg-blue-100 text-blue-800
  - WORKFLOW_END: bg-green-100 text-green-800
  - NODE_START: bg-indigo-100 text-indigo-800
  - NODE_END: bg-purple-100 text-purple-800
  - PROGRESS: bg-yellow-100 text-yellow-800
  - TOKEN: bg-pink-100 text-pink-800
  - ERROR: bg-red-100 text-red-800
- **Performance**: trackBySequence function for ngFor optimization

**Quality Requirements**:

- Virtual scrolling (performance for 10k+ events)
- Filter state management with signals
- Export functionality (JSON blob download)
- Color-coded event types
- Expandable event details
- Sequence-based tracking

---

### Task 9: DevBrand POC Page Container & Routing ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**:

- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\pages\devbrand-poc-page.component.ts
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\devbrand-poc.routes.ts

**Specification Reference**:

- implementation-plan.md:626-642 (Component Hierarchy)
- implementation-plan.md:1530-1557 (Route Configuration)

**Expected Commit Pattern**: `feat(angular-3d): add POC page container and route configuration`

**Verification Requirements**:

- ✅ Both files exist at specified paths
- ✅ Git commit matches pattern
- ✅ TypeScript compiles without errors
- ✅ Page component orchestrates all child components
- ✅ Routes configured with lazy loading

**Implementation Details**:

- **DevBrandPOCPageComponent**:
  - Smart container component
  - Imports: ExecutionControlComponent, ProgressVisualizationComponent, EventStreamComponent
  - Services: DevBrandWebSocketService, DevBrandWorkflowStateService
  - Event Handler: onExecutionStarted(executionId) → connect WebSocket + subscribe
  - Cleanup: ngOnDestroy() → disconnect WebSocket
  - Template: Grid layout with ExecutionControl, ProgressVisualization, EventStream
- **devbrand-poc.routes.ts**:
  - Lazy-loaded route: path: '', loadComponent: () => import('./pages/devbrand-poc-page.component')
- **app.routes.ts Integration**:
  - Add route: path: 'devbrand-poc', loadChildren: () => import('./features/devbrand-poc/devbrand-poc.routes')

**Quality Requirements**:

- Smart container pattern (orchestration, not presentation)
- Lazy-loaded routing
- WebSocket lifecycle management
- Service coordination
- Responsive grid layout

---

### Task 10: Integration Testing & Validation ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: N/A (Testing & validation phase)
**Specification Reference**:

- implementation-plan.md:2109-2140 (Phase E: Integration Testing)
- task-description.md:721-797 (Acceptance Testing Scenarios)

**Expected Commit Pattern**: `test(angular-3d): add integration tests and validate POC functionality`

**Verification Requirements**:

- ✅ End-to-end workflow execution tested
- ✅ All 16 event types received and displayed
- ✅ 3 agents tracked through complete execution
- ✅ Sequence numbers validate no event loss
- ✅ Performance metrics verified (60fps, <100ms latency)
- ✅ WebSocket reconnection tested
- ✅ Error scenarios validated

**Implementation Details**:

- **E2E Flow Testing**:
  - Start workflow via ExecutionControlComponent
  - Verify executionId returned
  - Verify WebSocket connection established
  - Verify events stream in real-time
  - Verify agent progress updates
  - Verify workflow completion
- **Performance Validation**:
  - Chrome DevTools performance profiling
  - Frame rate monitoring (target: 60fps)
  - Memory profiling (target: <50MB growth for 10k events)
  - Event latency measurement (target: <100ms)
  - Virtual scrolling performance with 10k+ events
- **Error Scenario Testing**:
  - WebSocket disconnection/reconnection
  - REST API failures (400, 500)
  - Invalid event structures (Zod validation)
  - Sequence number gaps detection
  - CORS issues validation
- **Test Execution**:
  - Backend dev-brand-api running on localhost:3000
  - GitHub username: Use test account or real GitHub username
  - Manual verification with browser DevTools
  - Document all findings in test-report.md

**Quality Requirements**:

- Complete workflow execution validated
- Performance benchmarks met
- Error handling verified
- All edge cases documented
- Results documented in TASK_2025_025/test-report.md

---

## Verification Protocol

**After Each Task Completion**:

1. Developer updates task status from "⏸️ PENDING" to "✅ COMPLETE"
2. Developer adds git commit SHA to task entry
3. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms file exists and compiles
   - Build passes (npx nx build dev-brand-ui)
4. If verification passes: Assign next task
5. If verification fails: Mark task as "❌ FAILED", escalate to user

---

## Task Dependencies

**Sequential Dependencies**:

- Task 2 depends on Task 1 (needs stream-events.model.ts types)
- Task 3 depends on Task 1 (needs ExecuteDevBrandRequest/Response types)
- Task 4 depends on Task 1 (needs StreamUpdate types)
- Task 5 depends on Tasks 1, 2, 4 (needs all models + WebSocket service)
- Task 6 depends on Tasks 1, 3, 5 (needs API service + state service)
- Task 7 depends on Tasks 2, 5 (needs agent models + state service)
- Task 8 depends on Tasks 1, 5 (needs event types + state service)
- Task 9 depends on Tasks 6, 7, 8 (needs all components)
- Task 10 depends on Task 9 (needs complete POC)

**Critical Path**: Task 1 → Task 2 → Task 5 → Task 6/7/8 → Task 9 → Task 10

---

## Completion Criteria

**All tasks complete when**:

- All task statuses are "✅ COMPLETE"
- All 10 git commits verified
- All files exist and TypeScript compiles (strict mode)
- Build passes (npx nx build dev-brand-ui)
- Integration testing complete with all scenarios validated
- test-report.md created with findings

**Return to orchestrator with**: "All 10 tasks completed and verified ✅"

---

## Notes

**Implementation Order Recommendation**:

1. Start with Task 1 (types foundation)
2. Task 2 (state models)
3. Tasks 3, 4 in parallel (independent services)
4. Task 5 (state orchestration)
5. Tasks 6, 7, 8 in parallel (independent components)
6. Task 9 (integration)
7. Task 10 (validation)

**Prerequisites Before Starting**:

- Backend dev-brand-api running on localhost:3000
- WebSocket server accessible on localhost:8080
- Socket.io-client installed (npm install socket.io-client@^4.7.0)
- Zod installed (npm install zod@^3.23.0)
- @angular/cdk installed (npm install @angular/cdk)

**Quality Gates**:

- TypeScript strict mode: Zero errors
- No 'any' types anywhere
- All services: >80% test coverage
- All components: Standalone pattern
- All state: Signal-based (no ngOnInit)
- All control flow: Modern (@if/@for, NOT *ngIf/*ngFor)
