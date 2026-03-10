# Development Tasks - TASK_2025_060

**Total Tasks**: 18 | **Batches**: 6 | **Status**: 0/6 complete

---

## Plan Validation Summary

**Validation Status**: PASSED WITH RISKS

### Assumptions Verified

- Library is empty placeholder: VERIFIED - `libs/langgraph-angular/src/lib/` is empty, `index.ts` exports only version constant
- Nx project config exists: VERIFIED - `package.json` present with `@hive-academy/langgraph-angular` name
- Zod available in workspace: VERIFIED - `zod@^3.25.76` in root `package.json`
- Angular signal APIs available: VERIFIED - workspace uses Angular 19+ (signal, computed, input, inject all available)
- `makeEnvironmentProviders` available: VERIFIED - Angular 15+ API
- `NgComponentOutlet` input binding: VERIFIED - Angular 17+ supports this natively
- POC patterns exist to generalize: VERIFIED - POC files confirmed in context.md

### Risks Identified

| Risk                                                                                                | Severity | Mitigation                                                                              |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `ng-packagr` barrel export ordering may cause build issues                                          | LOW      | Build verification after Batch 1 and each subsequent batch                              |
| `approvalUrl` composable requires `HttpClient` but `provideHttpClient()` is consumer responsibility | LOW      | Document in TSDoc that consumers must call `provideHttpClient()` if using `approvalUrl` |
| Commit scope in plan says `angular-3d` but should be `langgraph` per task context                   | MED      | Use `langgraph` scope for all commits (corrected in tasks below)                        |
| Stream event type enum has 20+ values - large file (~350 lines)                                     | LOW      | Single responsibility file, well-structured with sections                               |

### Edge Cases to Handle

- [ ] SSE `connect()` called while already connected -> must disconnect first (Task 2.1)
- [ ] `tokenProvider` returns error Observable -> handle gracefully in SSE service (Task 2.1)
- [ ] `nodeIdMapper` returns null -> skip agent tracking for that event (Task 3.1)
- [ ] Malformed JSON in SSE event data -> catch parse error, emit on errors$ (Task 2.1)
- [ ] HITL approval for non-existent approvalId -> no-op or warning (Task 3.1)
- [ ] Gen UI registry `get()` for unregistered component -> return undefined, console.warn (Task 4.2)
- [ ] Composables called outside injection context -> clear error message (Tasks 5.3-5.5)

---

## Batch 1: Foundation Models and Types (Layer 1) -- IN PROGRESS

**Developer**: frontend-developer
**Tasks**: 4 | **Dependencies**: None
**Status**: IN PROGRESS

### Task 1.1: Create config model with LangGraphConfig interface and injection token

**Status**: IN PROGRESS
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\config.model.ts`
**Spec Reference**: implementation-plan.md:98-197
**Pattern to Follow**: POC devbrand-sse.service.ts connection state pattern (generalized)

**Quality Requirements**:

- `LangGraphConfig` interface with: `sseBaseUrl`, `tokenProvider?`, `nodeIdMapper?`, `reconnectOnError?`, `eventTypes?`, `approvalUrl?`
- `ConnectionState` interface with status union type and optional `lastError`
- `DEFAULT_SSE_EVENT_TYPES` const array
- `LANGGRAPH_CONFIG` InjectionToken
- Zero `any` types
- TSDoc comments on all exports

**Implementation Details**:

- Imports: `InjectionToken` from `@angular/core`, `Observable` from `rxjs`
- `tokenProvider` returns `Observable<string>` (matches POC's `getSseTicket()` pattern)
- `DEFAULT_SSE_EVENT_TYPES` = `['workflow-update', 'workflow_complete', 'workflow_error']`
- Estimated ~60 lines

---

### Task 1.2: Create workflow state model with ExecutionState, AgentProgress, and BaseWorkflowState

**Status**: IN PROGRESS
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\workflow-state.model.ts`
**Spec Reference**: implementation-plan.md:202-296
**Pattern to Follow**: POC execution-state.model.ts and agent-progress.model.ts (generalized, no hardcoded values)

**Quality Requirements**:

- `ExecutionStatus` type: `'idle' | 'running' | 'paused' | 'completed' | 'error'`
- `ExecutionState` interface with generic fields (no hardcoded `totalSteps: 3`)
- `AgentStatus` type: `'idle' | 'thinking' | 'executing' | 'waiting' | 'completed' | 'error'`
- `AgentProgress` interface (generic, no hardcoded agent IDs)
- `BaseWorkflowState` interface for consumer extension via `TState`
- `HITLApproval` interface
- `createInitialExecutionState()` factory function
- Zero `any` types
- TSDoc comments on all exports

**Implementation Details**:

- Pure TypeScript interfaces, no Angular imports needed
- Estimated ~80 lines

---

### Task 1.3: Create stream events model with StreamEventType enum, interfaces, Zod schemas, and type guards

**Status**: IN PROGRESS
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\stream-events.model.ts`
**Spec Reference**: implementation-plan.md:298-337
**Pattern to Follow**: POC stream-events.model.ts (all 20 enum values, Zod schemas, type guards)

**Quality Requirements**:

- `StreamEventType` enum with all 20 event type values
- `StreamMetadata`, `StreamUpdate<T>`, `TokenUpdate`, `StreamError` interfaces
- `MessageStreamEvent`, `CustomStreamEvent`, `DebugStreamEvent` interfaces
- Zod schemas: `StreamMetadataSchema`, `StreamUpdateSchema`, `TokenUpdateSchema`, `StreamErrorSchema`, `MessageStreamEventSchema`, `CustomStreamEventSchema`, `DebugStreamEventSchema`
- Type guard functions: `isWorkflowEvent`, `isNodeEvent`, `isProgressEvent`, `isTokenEvent`, `isErrorEvent`, `isStreamDataEvent`, `isAgentEvent`, `isMessageStreamEvent`, `isCustomStreamEvent`, `isDebugStreamEvent`
- `parseNodeId` utility (generic, NO hardcoded mappings)
- Rename POC's `WebSocketError` to `StreamError`, update discriminators from `websocket_error` to `sse_error`
- Remove `extractAgentTypeFromNodeId` (domain-specific, replaced by `nodeIdMapper`)
- Remove `ConnectionState` (lives in config.model.ts)
- Remove `SubscriptionConfirmed` (WebSocket artifact)
- Zero `any` types

**Validation Notes**:

- This is the largest file (~350 lines). All 20 event types from POC must be preserved.
- Zod schemas must use `safeParse()` pattern for runtime validation.

**Implementation Details**:

- Import: `z` from `zod`
- Estimated ~350 lines

---

### Task 1.4: Create models barrel export

**Status**: IN PROGRESS
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\index.ts`
**Spec Reference**: implementation-plan.md:331-338
**Dependencies**: Tasks 1.1, 1.2, 1.3

**Quality Requirements**:

- Re-export all public types from `config.model.ts`, `workflow-state.model.ts`, `stream-events.model.ts`
- No deep import paths required by consumers

**Implementation Details**:

- 3 re-export lines
- Estimated ~5 lines

---

**Batch 1 Verification**:

- All 4 files exist at specified paths
- Build passes: `npx nx build @hive-academy/langgraph-angular`
- code-logic-reviewer approved
- Zero `any` types in all files
- All Zod schemas validate correctly

---

## Batch 2: Core SSE Service (Layer 2)

**Developer**: frontend-developer
**Tasks**: 1 | **Dependencies**: Batch 1
**Status**: PENDING

### Task 2.1: Create LangGraphSseService with EventSource lifecycle, auth, and event parsing

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-sse.service.ts`
**Spec Reference**: implementation-plan.md:342-397
**Pattern to Follow**: POC devbrand-sse.service.ts (generalized: no AuthService coupling, no `providedIn: 'root'`)

**Quality Requirements**:

- `@Injectable()` (NOT `providedIn: 'root'`)
- Inject `LANGGRAPH_CONFIG` token for configuration
- `connectionState` signal (readonly), `workflowUpdates$` Observable (Subject-backed), `errors$` Observable (Subject-backed)
- `isConnected` computed signal
- `connect(streamUrl)`: obtain token via `config.tokenProvider` if provided, append as query param, create EventSource, register listeners
- `disconnect()`: close EventSource, reset state, do NOT complete Subjects (reusable service)
- Event listeners for configurable event types (from `config.eventTypes` or `DEFAULT_SSE_EVENT_TYPES`)
- `onopen` handler: set state to `connected`
- `onerror` handler: set state to `error`, emit on `errors$`, disconnect to prevent loops
- Handle malformed JSON in event data gracefully (catch parse error, emit on errors$)
- Handle `connect()` called while already connected (disconnect first)
- Handle `tokenProvider` returning error Observable
- No `any` types, typed Subject as `Record<string, unknown>`

**Validation Notes**:

- Edge case: connect while already connected -> disconnect first, then reconnect
- Edge case: tokenProvider error -> set connection state to error, emit on errors$
- Edge case: malformed JSON in SSE data -> catch, emit error, do not crash

**Implementation Details**:

- Imports: `Injectable`, `inject`, `signal`, `computed` from `@angular/core`; `Subject` from `rxjs`; `firstValueFrom` from `rxjs`; models from Layer 1
- Estimated ~120 lines

---

**Batch 2 Verification**:

- File exists at specified path
- Build passes: `npx nx build @hive-academy/langgraph-angular`
- code-logic-reviewer approved
- No `providedIn: 'root'`
- No `any` types

---

## Batch 3: State Management and Streaming Services (Layers 3 + 4)

**Developer**: frontend-developer
**Tasks**: 2 | **Dependencies**: Batch 2
**Status**: PENDING

### Task 3.1: Create LangGraphWorkflowStateService with signal-based state and event processing

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-workflow-state.service.ts`
**Spec Reference**: implementation-plan.md:400-475
**Pattern to Follow**: POC devbrand-workflow-state.service.ts (generalized: no hardcoded agents, no hardcoded phaseToAgent map)

**Quality Requirements**:

- `@Injectable()` (NOT `providedIn: 'root'`)
- Inject `LangGraphSseService` and `LANGGRAPH_CONFIG`
- Core state signals: `_executionState` (signal), `_agentProgress` (signal), `_hitlQueue` (signal), `_eventHistory` (BehaviorSubject)
- Public readonly accessors for all state
- Computed signals: `isExecuting`, `currentAgent`, `workflowProgress`, `hasPendingApprovals`
- `startExecution(streamUrl)`: reset state, set running, connect SSE, subscribe to events
- `reset()`: return all signals to initial idle state, clear history
- `resolveApproval(approvalId, status, reason?)`: update HITL queue signal
- `getApprovalExecutionId(approvalId)`: lookup from HITL queue
- `getEventsByType(type)` and `getEventsByAgent(agentId)`: query methods on event history
- All 20+ StreamEventType handlers via switch on event type
- `resolveAgentId(nodeId)`: delegates to `config.nodeIdMapper` or uses nodeId as-is
- Dynamic agent discovery: when new agentId encountered on `node:start`, add to agentProgress
- Event history with sequence number gap detection
- HITL: custom event with `type: 'hitl_approval'` adds to queue, sets status to `paused`
- NO hardcoded agent IDs, node mappings, or domain logic
- Zero `any` types

**Validation Notes**:

- Edge case: nodeIdMapper returns null -> skip agent tracking for that event
- Edge case: resolveApproval for non-existent approvalId -> no-op
- This is the most complex service (~300 lines)

**Implementation Details**:

- Imports: services from Layer 2, models from Layer 1, `BehaviorSubject` from `rxjs`, `Subscription` from `rxjs`
- Must clean up SSE subscription on reset/new execution
- Estimated ~300 lines

---

### Task 3.2: Create LangGraphStreamingService with token batching and message buffering

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-streaming.service.ts`
**Spec Reference**: implementation-plan.md:479-537
**Pattern to Follow**: New service based on design doc streaming patterns

**Quality Requirements**:

- `@Injectable()` (NOT `providedIn: 'root'`)
- Inject `LangGraphSseService`
- State signals: `_currentStreamingText`, `_streamingMessages`, `_isStreaming`
- Token buffer with configurable batch interval (default 50ms)
- Computed signals: `isStreaming`, `tokenCount`
- `startStreaming()`: subscribe to `sseService.workflowUpdates$`, filter for token/message-stream events
- `stopStreaming()`: clear timer, flush remaining tokens, mark messages complete
- `reset()`: clear all state
- `processTokenEvent()`: accumulate in buffer, flush on timer
- `processMessageStreamEvent()`: buffer by nodeId
- `StreamingMessage` interface exported
- Zero `any` types

**Validation Notes**:

- Token batching prevents excessive change detection (10-100+ tokens/sec)
- Must use `setInterval`/`clearInterval` for batch timer, not RxJS (simpler, no subscription management)

**Implementation Details**:

- Imports: services from Layer 2, `StreamEventType` from Layer 1
- Estimated ~150 lines

---

**Batch 3 Verification**:

- Both files exist at specified paths
- Build passes: `npx nx build @hive-academy/langgraph-angular`
- code-logic-reviewer approved
- No hardcoded agent IDs or domain logic in state service
- Token batching implemented with configurable interval
- All 20+ event type handlers present

---

## Batch 4: Generative UI (Layer 6)

**Developer**: frontend-developer
**Tasks**: 4 | **Dependencies**: Batch 1 (models only, independent of Batches 2-3)
**Status**: PENDING

### Task 4.1: Create gen-ui models with GeneratedComponent and GenerativeUIState interfaces

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\gen-ui.models.ts`
**Spec Reference**: implementation-plan.md:601-641
**Pattern to Follow**: Design doc generative UI patterns

**Quality Requirements**:

- `GeneratedComponent` interface: `id`, `component` (Type<unknown>), `inputs`, `outputs?`
- `GenerativeUIState` interface: `components` array with `id`, `type`, `props`, `events?`
- Zero `any` types (use `unknown` instead)
- TSDoc comments

**Implementation Details**:

- Import: `Type` from `@angular/core`
- Estimated ~30 lines

---

### Task 4.2: Create GenerativeUIRegistry service for component registration

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui-registry.service.ts`
**Spec Reference**: implementation-plan.md:645-691
**Pattern to Follow**: Simple Map-based registry

**Quality Requirements**:

- `@Injectable()` (NOT `providedIn: 'root'`)
- `register(name, component)`: add to registry
- `get(name)`: return component or undefined
- `has(name)`: boolean check
- `getRegisteredNames()`: list all registered names
- Private `Map<string, Type<unknown>>` backing store
- TSDoc comments

**Implementation Details**:

- Import: `Injectable`, `Type` from `@angular/core`
- Estimated ~40 lines

---

### Task 4.3: Create LangGraphGenerativeUIService for bulk registration and state-to-component rendering

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui.service.ts`
**Spec Reference**: implementation-plan.md:698-761
**Dependencies**: Task 4.1, Task 4.2
**Pattern to Follow**: Design doc generative UI service

**Quality Requirements**:

- `@Injectable()` (NOT `providedIn: 'root'`)
- Inject `GenerativeUIRegistry`
- `registerComponents(components: Record<string, Type<unknown>>)`: bulk register
- `renderFromAgentState(state: unknown)`: extract `generativeUI` field, map to `GeneratedComponent[]`
- Skip unregistered components with `console.warn` (no runtime error)
- Private `extractUIState()` helper
- Zero `any` types

**Validation Notes**:

- Edge case: unregistered component name -> console.warn, skip, no crash
- Edge case: state has no `generativeUI` field -> return empty array

**Implementation Details**:

- Import: `Injectable`, `Type`, `inject` from `@angular/core`; registry and models
- Estimated ~60 lines

---

### Task 4.4: Create LgDynamicComponent for dynamic rendering via NgComponentOutlet

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\lg-dynamic.component.ts`
**Spec Reference**: implementation-plan.md:769-808
**Dependencies**: Task 4.1
**Pattern to Follow**: Angular 17+ NgComponentOutlet with input binding

**Quality Requirements**:

- Standalone component with `lg-dynamic` selector
- `components` input using `input.required<GeneratedComponent[]>()` (signal-based input)
- `@for` control flow with `track item.id`
- `NgComponentOutlet` with `inputs` binding
- Imports: `NgComponentOutlet` from `@angular/common`
- TSDoc with usage example

**Implementation Details**:

- Import: `Component`, `input` from `@angular/core`; `NgComponentOutlet` from `@angular/common`
- Estimated ~25 lines

---

**Batch 4 Verification**:

- All 4 files exist at specified paths
- Build passes: `npx nx build @hive-academy/langgraph-angular`
- code-logic-reviewer approved
- Component is standalone with signal-based input
- Registry handles missing components gracefully

---

## Batch 5: Provider Function, Composables, and Public API (Layers 5, 7, 8)

**Developer**: frontend-developer
**Tasks**: 5 | **Dependencies**: Batches 1-4
**Status**: PENDING

### Task 5.1: Create provideLangGraph() provider function

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\providers\provide-langgraph.ts`
**Spec Reference**: implementation-plan.md:541-596
**Pattern to Follow**: Angular `makeEnvironmentProviders` pattern

**Quality Requirements**:

- `provideLangGraph(config: LangGraphConfig): EnvironmentProviders`
- Uses `makeEnvironmentProviders()` to provide: `LANGGRAPH_CONFIG` token, `LangGraphSseService`, `LangGraphWorkflowStateService`, `LangGraphStreamingService`, `GenerativeUIRegistry`, `LangGraphGenerativeUIService`
- TSDoc with usage example showing `app.config.ts` pattern

**Implementation Details**:

- Import: `makeEnvironmentProviders`, `EnvironmentProviders` from `@angular/core`; all services and token
- Estimated ~30 lines

---

### Task 5.2: Create useLangGraphWorkflow composable

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-workflow.ts`
**Spec Reference**: implementation-plan.md:814-858
**Pattern to Follow**: Angular `inject()`-based composable function

**Quality Requirements**:

- Returns object with: `executionState`, `agentProgress`, `isExecuting`, `currentAgent`, `workflowProgress`, `startExecution()`, `reset()`
- Internally uses `inject(LangGraphWorkflowStateService)`
- Pure facade, no additional state
- `as const` return type
- TSDoc with usage example

**Implementation Details**:

- Import: `inject` from `@angular/core`; `LangGraphWorkflowStateService`
- Estimated ~30 lines

---

### Task 5.3: Create useLangGraphStreaming composable

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-streaming.ts`
**Spec Reference**: implementation-plan.md:862-891
**Pattern to Follow**: Angular `inject()`-based composable function

**Quality Requirements**:

- Returns object with: `isStreaming`, `currentStreamingText`, `streamingMessages`, `tokenCount`
- Internally uses `inject(LangGraphStreamingService)`
- Pure facade, no additional state
- `as const` return type
- TSDoc with usage example

**Implementation Details**:

- Import: `inject` from `@angular/core`; `LangGraphStreamingService`
- Estimated ~20 lines

---

### Task 5.4: Create useLangGraphApproval composable

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-approval.ts`
**Spec Reference**: implementation-plan.md:895-965
**Pattern to Follow**: Angular `inject()`-based composable function

**Quality Requirements**:

- Returns object with: `hasPendingApprovals`, `hitlQueue`, `approve()`, `reject()`
- `approve(approvalId, feedback?)` and `reject(approvalId, reason?)` return `Observable<void>`
- If `config.approvalUrl` is set, POST to backend; otherwise return `of(undefined)`
- Internally uses `inject(LangGraphWorkflowStateService)`, `inject(LANGGRAPH_CONFIG)`, `inject(HttpClient)`
- TSDoc noting that `provideHttpClient()` is required if using `approvalUrl`

**Validation Notes**:

- HttpClient injection requires consumers to have `provideHttpClient()` in providers
- Document this requirement clearly in TSDoc

**Implementation Details**:

- Import: `inject` from `@angular/core`; `HttpClient` from `@angular/common/http`; `of`, `Observable` from `rxjs`
- Estimated ~45 lines

---

### Task 5.5: Update public API barrel exports in index.ts

**Status**: PENDING
**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\index.ts`
**Spec Reference**: implementation-plan.md:969-1013
**Dependencies**: All previous tasks
**Action**: MODIFY existing file

**Quality Requirements**:

- Replace version-only placeholder with comprehensive exports
- Organized by category: Version, Models, Services, Gen UI, Composables, Provider
- All public types accessible from `@hive-academy/langgraph-angular` package root
- No deep imports required by consumers

**Implementation Details**:

- Keep `LANGGRAPH_ANGULAR_VERSION` export
- Add barrel exports for all 14 new files
- Estimated ~30 lines

---

**Batch 5 Verification**:

- All 5 files exist/modified at specified paths
- Build passes: `npx nx build @hive-academy/langgraph-angular`
- code-logic-reviewer approved
- All exports accessible from package root
- `provideLangGraph()` provides all services

---

## Batch 6: Unit Tests

**Developer**: frontend-developer
**Tasks**: 2 (grouped into logical test groups) | **Dependencies**: Batches 1-5
**Status**: PENDING

### Task 6.1: Create unit tests for models, SSE service, and streaming service

**Status**: PENDING
**Files**:

- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\models\stream-events.model.spec.ts`
- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-sse.service.spec.ts`
- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-streaming.service.spec.ts`
  **Spec Reference**: implementation-plan.md:1197-1248
  **Dependencies**: Batches 1-3

**Quality Requirements**:

- **stream-events.model.spec.ts**: Test all type guards with valid/invalid data, test Zod schemas with `safeParse()` for valid/invalid/edge cases, test `parseNodeId` utility
- **langgraph-sse.service.spec.ts**: Mock EventSource, test connect/disconnect lifecycle, test token provider integration, test error handling, test JSON parse errors, test double-connect guard
- **langgraph-streaming.service.spec.ts**: Test token batching with flush interval, test message buffering by nodeId, test start/stop lifecycle, test signal updates
- Use Angular TestBed for service tests
- Mock `LANGGRAPH_CONFIG` injection token
- 80% minimum coverage target

**Implementation Details**:

- Create mock EventSource class for SSE tests
- Use `fakeAsync`/`tick` for timer-based tests (token batching)
- Estimated ~300 lines across 3 files

---

### Task 6.2: Create unit tests for workflow state service, gen-ui, and composables

**Status**: PENDING
**Files**:

- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\services\langgraph-workflow-state.service.spec.ts`
- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui-registry.service.spec.ts`
- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\generative-ui.service.spec.ts`
- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\gen-ui\lg-dynamic.component.spec.ts`
- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-angular\src\lib\composables\use-langgraph-workflow.spec.ts`
  **Spec Reference**: implementation-plan.md:1197-1248
  **Dependencies**: Batches 1-5

**Quality Requirements**:

- **langgraph-workflow-state.service.spec.ts**: Test all 20 event type handlers, test dynamic agent discovery, test nodeIdMapper delegation, test computed signals, test event history gap detection, test HITL queue management, test reset
- **generative-ui-registry.service.spec.ts**: Test register/get/has/getRegisteredNames
- **generative-ui.service.spec.ts**: Test bulk registerComponents, test renderFromAgentState with valid/invalid/missing components
- **lg-dynamic.component.spec.ts**: TestBed component test with NgComponentOutlet rendering
- **use-langgraph-workflow.spec.ts**: Test composable returns correct facade shape, test delegation to underlying service
- Use Angular TestBed for all tests
- Mock services appropriately
- 80% minimum coverage target

**Implementation Details**:

- Workflow state service tests will be the most extensive (all event handlers)
- Use `TestBed.runInInjectionContext` for composable tests
- Estimated ~500 lines across 5 files

---

**Batch 6 Verification**:

- All 8 test files exist at specified paths
- Tests pass: `npx nx test @hive-academy/langgraph-angular`
- code-logic-reviewer approved
- Coverage meets 80% minimum
