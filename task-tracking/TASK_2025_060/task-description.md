# Requirements Document - TASK_2025_060

## Implement @hive-academy/langgraph-angular Shared Angular Library

## Introduction

The `@hive-academy/langgraph-angular` library provides a shared, generic Angular integration layer for LangGraph workflow streaming, state management, and generative UI. It generalizes the proven patterns from the DevBrand POC (`apps/dev-brand-ui/src/app/features/devbrand-poc/`) into a reusable library that any Angular application in the monorepo can consume.

The library currently exists as an empty placeholder (`libs/langgraph-angular/src/index.ts` exports only a version constant). The Nx project configuration, build targets, and package.json are already in place.

**Business Value**: Eliminates duplicated SSE/streaming/state code across Angular apps, provides a single authoritative implementation for LangGraph frontend integration, and establishes the foundation for generative UI capabilities.

**Source of Truth**: Research design docs at `docs/angular-langgraph.md` and `docs/angular-langgraph-gen-ui.md`, plus the working POC at `apps/dev-brand-ui/src/app/features/devbrand-poc/`.

---

## Architecture Decisions (Pre-Established - Do Not Change)

| Decision             | Choice                                                                | Rationale                                                                                                        |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Transport            | SSE (EventSource API)                                                 | Matches backend `@Sse()` decorator pattern; simpler than WebSocket for unidirectional server-to-client streaming |
| State                | Angular Signals (19+)                                                 | Modern reactive primitives with fine-grained change detection                                                    |
| Generics             | `<TState>` parameterization                                           | All services accept application-specific workflow state types                                                    |
| Angular Style        | Standalone components, `input()`/`output()`, `@if`/`@for`, `inject()` | Modern Angular patterns, no NgModules                                                                            |
| Dependencies         | Zero external beyond Angular + RxJS + zod                             | Minimize bundle size, maximize compatibility                                                                     |
| Replacement Strategy | Direct replacement, single implementation                             | Anti-backward compatibility mandate                                                                              |

---

## Generalization Strategy: POC to Shared Library

The POC contains domain-specific implementations that must be generalized:

| POC (DevBrand-Specific)                | Library (Generic)                                                             | Generalization                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `DevBrandSseService`                   | `LangGraphSseService`                                                         | Remove AuthService coupling; accept `tokenProvider` via config                         |
| `DevBrandWorkflowStateService`         | `LangGraphWorkflowStateService<TState>`                                       | Remove hardcoded 3-agent map; accept `TState` generic; remove DevBrand node-ID mapping |
| `StreamEventType` enum (20 values)     | `StreamEventType` enum (same values, relocated)                               | Move from POC models to library; add Zod schemas                                       |
| `StreamUpdate<T>`, `TokenUpdate`, etc. | Same interfaces, relocated                                                    | Move from POC to library; keep Zod validation                                          |
| Hardcoded `phaseToAgent` map           | Configurable `nodeIdMapper` function in config                                | Allow consumers to provide their own node-to-agent mapping                             |
| `providedIn: 'root'` on all services   | Provider function `provideLangGraph(config)`                                  | Explicit provision via `EnvironmentProviders`                                          |
| No Gen UI                              | `GenerativeUIRegistry` + `LgDynamicComponent`                                 | New capability from design doc                                                         |
| No composables                         | `useLangGraphWorkflow()`, `useLangGraphStreaming()`, `useLangGraphApproval()` | Convenience `inject()`-based composable functions                                      |

---

## Requirements

### Requirement 1: Models and Types (Layer 1)

**User Story:** As a developer consuming `@hive-academy/langgraph-angular`, I want a comprehensive set of TypeScript interfaces, enums, Zod schemas, and type guards for all LangGraph streaming events, so that I have type-safe, runtime-validated event handling.

#### Acceptance Criteria

1. WHEN the library is imported THEN a `StreamEventType` enum SHALL be available containing all event type values currently defined in the POC model (`workflow:start`, `workflow:end`, `workflow:error`, `node:start`, `node:end`, `node:error`, `node:complete`, `values`, `updates`, `messages`, `events`, `debug`, `final`, `progress`, `milestone`, `token`, `error`, `custom`, `message-stream`, `custom-stream`, `debug-stream`).

2. WHEN a developer defines workflow state THEN the library SHALL export a `BaseWorkflowState` interface with common fields (`executionId`, `status`, `startTime`, `endTime`, `error`) that consumers extend with `TState`.

3. WHEN raw SSE event data is received THEN Zod schemas (`StreamUpdateSchema`, `StreamMetadataSchema`, `TokenUpdateSchema`, `MessageStreamEventSchema`, `CustomStreamEventSchema`, `DebugStreamEventSchema`) SHALL validate the data at runtime and return typed results.

4. WHEN a developer needs to narrow event types THEN type guard functions (`isWorkflowEvent`, `isNodeEvent`, `isProgressEvent`, `isTokenEvent`, `isErrorEvent`, `isStreamDataEvent`, `isAgentEvent`, `isMessageStreamEvent`, `isCustomStreamEvent`, `isDebugStreamEvent`) SHALL be available and return proper TypeScript type predicates.

5. WHEN the library exports types THEN zero `any` types SHALL exist in the public API surface.

6. WHEN a `LangGraphConfig` interface is needed THEN it SHALL define: `sseBaseUrl: string`, `tokenProvider?: () => Observable<string>`, `nodeIdMapper?: (nodeId: string) => string | null`, `reconnectOnError?: boolean`, `eventTypes?: string[]` (SSE event names to listen for).

7. WHEN a `ConnectionState` type is needed THEN it SHALL define status as `'disconnected' | 'connecting' | 'connected' | 'error'` with optional `lastError: string`.

#### Files to Create

- `libs/langgraph-angular/src/lib/models/stream-events.model.ts` - StreamEventType enum, interfaces, Zod schemas, type guards
- `libs/langgraph-angular/src/lib/models/config.model.ts` - LangGraphConfig, ConnectionState, injection tokens
- `libs/langgraph-angular/src/lib/models/workflow-state.model.ts` - BaseWorkflowState, ExecutionStatus
- `libs/langgraph-angular/src/lib/models/index.ts` - Barrel export

---

### Requirement 2: Core SSE Service (Layer 2)

**User Story:** As a developer building a LangGraph-powered Angular app, I want a generic SSE connection service that handles EventSource lifecycle, authentication, event parsing, and error management, so that I do not need to implement raw SSE handling in every application.

#### Acceptance Criteria

1. WHEN `connect(streamUrl: string)` is called THEN the service SHALL obtain an authentication token via the configured `tokenProvider` (if provided), append it as a query parameter, create an `EventSource` instance, and register event listeners for all configured event types.

2. WHEN the EventSource `onopen` fires THEN `connectionState` signal SHALL update to `{ status: 'connected' }`.

3. WHEN a named SSE event (e.g., `workflow-update`, `workflow_complete`, `workflow_error`) is received THEN the service SHALL parse the JSON data, validate it, and emit on the `workflowUpdates$` Subject.

4. WHEN an SSE connection error occurs THEN the service SHALL update `connectionState` to `{ status: 'error', lastError: message }`, emit on `errors$` Subject, and call `disconnect()` to prevent reconnect loops.

5. WHEN `disconnect()` is called THEN the service SHALL close the EventSource, clear the instance reference, reset connection state to `disconnected`, and NOT complete the Subjects (service is reusable across multiple connections).

6. WHEN no `tokenProvider` is configured THEN `connect()` SHALL proceed without authentication (direct EventSource creation).

7. WHEN the service is provided THEN it SHALL NOT use `providedIn: 'root'`; it SHALL be provided via the `provideLangGraph()` provider function.

#### Files to Create

- `libs/langgraph-angular/src/lib/services/langgraph-sse.service.ts`

---

### Requirement 3: State Management Service (Layer 3)

**User Story:** As a developer tracking LangGraph workflow execution, I want a generic signal-based state management service parameterized with `<TState>`, so that I can maintain execution state, agent progress, HITL queue, and event history with full type safety.

#### Acceptance Criteria

1. WHEN `LangGraphWorkflowStateService<TState>` is instantiated THEN it SHALL expose readonly signals: `executionState`, `agentProgress` (generic `Record<string, AgentProgress>`), `hitlQueue`, and computed signals: `isExecuting`, `currentAgent`, `workflowProgress`, `hasPendingApprovals`.

2. WHEN `startExecution(streamUrl: string)` is called THEN the service SHALL reset all state, set status to `running`, connect to SSE via `LangGraphSseService`, and begin processing events.

3. WHEN a `workflow-update` SSE event is received THEN the service SHALL extract a `StreamUpdate` from the event data and route it to the appropriate handler based on `StreamEventType` (all 20+ event types handled).

4. WHEN a `node:start` event is received THEN the service SHALL use the configured `nodeIdMapper` (from `LangGraphConfig`) to resolve the agent ID and update the corresponding agent's status to `executing`.

5. WHEN the service processes events THEN it SHALL NOT contain any hardcoded agent IDs, node-to-agent mappings, or domain-specific logic; all mapping SHALL be delegated to the consumer-provided `nodeIdMapper`.

6. WHEN event history is needed THEN a `BehaviorSubject<StreamUpdate[]>` SHALL maintain the complete event log with sequence number gap detection.

7. WHEN a HITL approval event is received (custom event with `type: 'hitl_approval'`) THEN the service SHALL add it to the `_hitlQueue` signal and set execution status to `paused`.

8. WHEN `reset()` is called THEN all signals SHALL return to their initial idle state and event history SHALL be cleared.

#### Files to Create

- `libs/langgraph-angular/src/lib/services/langgraph-workflow-state.service.ts`

---

### Requirement 4: Streaming Service (Layer 4)

**User Story:** As a developer displaying real-time LLM output, I want a streaming service that handles token accumulation, message buffering, and streaming text display, so that I can show progressive AI responses to users.

#### Acceptance Criteria

1. WHEN token events are received from the SSE stream THEN `LangGraphStreamingService` SHALL accumulate tokens into a `currentStreamingText` signal that updates in real-time.

2. WHEN a message-stream event is received THEN the service SHALL buffer the content and expose it via `streamingMessages` signal (array of accumulated messages per node).

3. WHEN streaming completes (workflow end or node end) THEN the accumulated text SHALL be finalized and the streaming buffer cleared for the next node.

4. WHEN the consumer needs streaming state THEN the service SHALL expose: `isStreaming` (computed signal), `currentStreamingText` (signal), `streamingMessages` (signal), `tokenCount` (computed signal).

5. WHEN high-frequency token events arrive (10-100+ per second) THEN the service SHALL batch updates to prevent excessive change detection cycles (configurable batch interval, default 50ms).

#### Files to Create

- `libs/langgraph-angular/src/lib/services/langgraph-streaming.service.ts`

---

### Requirement 5: Provider Function (Layer 5)

**User Story:** As a developer bootstrapping an Angular application with LangGraph integration, I want a `provideLangGraph(config)` function that sets up all required services and injection tokens, so that I can configure the library in one place without manually providing each service.

#### Acceptance Criteria

1. WHEN `provideLangGraph(config: LangGraphConfig)` is called in the application's `providers` array THEN it SHALL return `EnvironmentProviders` that include: `LANGGRAPH_CONFIG` injection token, `LangGraphSseService`, `LangGraphWorkflowStateService`, `LangGraphStreamingService`.

2. WHEN the `LANGGRAPH_CONFIG` injection token is injected THEN it SHALL provide the `LangGraphConfig` object passed to `provideLangGraph()`.

3. WHEN `provideLangGraph` is not called THEN attempting to inject any library service SHALL produce a clear error message indicating that `provideLangGraph()` must be called first.

4. WHEN a consumer needs to override a service THEN the provider function SHALL NOT prevent standard Angular DI overriding.

5. WHEN the provider is used THEN the function signature SHALL be: `provideLangGraph(config: LangGraphConfig): EnvironmentProviders`.

#### Files to Create

- `libs/langgraph-angular/src/lib/providers/provide-langgraph.ts`
- `libs/langgraph-angular/src/lib/tokens/langgraph-config.token.ts`

---

### Requirement 6: Generative UI (Layer 6)

**User Story:** As a developer building AI-driven dashboards, I want a component registry and dynamic rendering system, so that LangGraph agents can declaratively specify which Angular components to render with what inputs.

#### Acceptance Criteria

1. WHEN `GenerativeUIRegistry` is injected THEN it SHALL provide `register(name: string, component: Type<unknown>)` and `get(name: string): Type<unknown> | undefined` methods for managing a component registry.

2. WHEN `LangGraphGenerativeUIService` is injected THEN it SHALL provide `registerComponents(components: Record<string, Type<unknown>>)` for bulk registration and `renderFromAgentState(state: unknown): GeneratedComponent[]` that maps workflow state to renderable components using the registry.

3. WHEN `LgDynamicComponent` is used in a template THEN it SHALL accept a `components` input signal of type `GeneratedComponent[]` and render each component dynamically using `NgComponentOutlet` with input binding.

4. WHEN a registered component name is not found in the registry THEN `get()` SHALL return `undefined` and the dynamic renderer SHALL skip that component with a console warning (no runtime error).

5. WHEN a `GeneratedComponent` interface is defined THEN it SHALL contain: `id: string`, `component: Type<unknown>`, `inputs: Record<string, unknown>`, `outputs?: Record<string, unknown>`.

6. WHEN the GenerativeUI services are used THEN they SHALL be provided via `provideLangGraph()` alongside core services.

#### Files to Create

- `libs/langgraph-angular/src/lib/gen-ui/generative-ui-registry.service.ts`
- `libs/langgraph-angular/src/lib/gen-ui/generative-ui.service.ts`
- `libs/langgraph-angular/src/lib/gen-ui/lg-dynamic.component.ts`
- `libs/langgraph-angular/src/lib/gen-ui/gen-ui.models.ts`

---

### Requirement 7: Composables (Layer 7)

**User Story:** As a developer writing Angular components, I want convenience composable functions (inject-based) that bundle common LangGraph patterns, so that I can integrate workflow execution, streaming, and HITL approvals with minimal boilerplate.

#### Acceptance Criteria

1. WHEN `useLangGraphWorkflow<TState>()` is called inside an injection context THEN it SHALL return an object with: `executionState` (readonly signal), `agentProgress` (readonly signal), `isExecuting` (computed signal), `currentAgent` (computed signal), `workflowProgress` (computed signal), `startExecution(streamUrl: string)` method, `reset()` method.

2. WHEN `useLangGraphStreaming()` is called inside an injection context THEN it SHALL return: `isStreaming` (computed signal), `currentStreamingText` (signal), `streamingMessages` (signal), `tokenCount` (computed signal).

3. WHEN `useLangGraphApproval()` is called inside an injection context THEN it SHALL return: `hasPendingApprovals` (computed signal), `hitlQueue` (readonly signal), `approve(approvalId: string)` method, `reject(approvalId: string, reason?: string)` method.

4. WHEN a composable is called outside an injection context THEN it SHALL throw a clear error message indicating it must be used within `inject()` or a constructor.

5. WHEN composables are used THEN they SHALL internally use `inject()` to obtain the library services, acting purely as facade functions with no additional state.

#### Files to Create

- `libs/langgraph-angular/src/lib/composables/use-langgraph-workflow.ts`
- `libs/langgraph-angular/src/lib/composables/use-langgraph-streaming.ts`
- `libs/langgraph-angular/src/lib/composables/use-langgraph-approval.ts`

---

### Requirement 8: Public API and Barrel Exports

**User Story:** As a developer importing from `@hive-academy/langgraph-angular`, I want a clean public API that exports all models, services, components, composables, and the provider function through the library entry point.

#### Acceptance Criteria

1. WHEN the library is imported via `@hive-academy/langgraph-angular` THEN all public types, services, components, composables, and the provider function SHALL be accessible.

2. WHEN the `index.ts` entry point is updated THEN it SHALL replace the current version-only placeholder with comprehensive exports organized by category (models, services, gen-ui, composables, providers).

3. WHEN a consumer uses the library THEN no deep imports into internal paths SHALL be required; everything SHALL be available from the package root.

#### Files to Modify

- `libs/langgraph-angular/src/index.ts` - Replace placeholder with full public API exports
- `libs/langgraph-angular/src/lib/index.ts` - Internal barrel (if needed)

---

## Non-Functional Requirements

### Dependencies

- Zero external dependencies beyond Angular (19+), RxJS (7+), and zod (3+)
- No socket.io-client, no ngx-\* packages, no additional HTTP libraries
- zod is already a workspace dependency used by the POC models

### Type Safety

- Zero `any` types in the public API surface
- All services parameterized with `<TState>` where applicable
- Full TypeScript strict mode compliance
- Zod schemas for all runtime validation

### Angular Patterns

- All components are standalone (no NgModules)
- Use `input()` / `output()` signal-based APIs (not `@Input()` / `@Output()` decorators)
- Use `@if` / `@for` control flow (not `*ngIf` / `*ngFor`)
- Use `inject()` pattern (not constructor injection)
- Use `signal()` / `computed()` for state (not BehaviorSubjects for simple state)
- Use `BehaviorSubject` only where appropriate (large arrays, observable streams)

### Performance

- Token streaming batching: configurable interval (default 50ms) to prevent excessive change detection
- Event history: BehaviorSubject for large arrays (10k+ events with virtual scrolling support)
- Signal granularity: separate signals for different state slices to minimize recomputation

### Bundle Size

- Library should add less than 15KB gzipped to consuming applications
- Tree-shakeable: unused services and components should be excluded from production builds

### Testing

- 80% minimum test coverage
- Unit tests for all services, type guards, and Zod schemas
- Integration tests for SSE connection lifecycle
- Component tests for `LgDynamicComponent` using Angular TestBed

### Documentation

- TSDoc comments on all public exports
- Usage examples in code comments for services and composables

---

## Stakeholder Analysis

### Primary Stakeholders

| Stakeholder            | Impact Level | Involvement                      | Success Criteria                                                  |
| ---------------------- | ------------ | -------------------------------- | ----------------------------------------------------------------- |
| Angular App Developers | High         | Consumers of the library         | Can integrate LangGraph streaming in < 30 minutes setup time      |
| DevBrand UI Team       | High         | First adopter / migration target | POC services replaced by library equivalents with zero regression |
| Library Maintainers    | Medium       | Implementation and maintenance   | Clean architecture, testable, documented                          |

### Secondary Stakeholders

| Stakeholder         | Impact Level | Involvement             | Success Criteria                          |
| ------------------- | ------------ | ----------------------- | ----------------------------------------- |
| Backend Team        | Low          | API contract compliance | SSE event format compatibility maintained |
| Future Angular Apps | Medium       | Future consumers        | Generic enough for any LangGraph workflow |

---

## Risk Assessment

| Risk                                            | Probability | Impact | Score | Mitigation                                                                         |
| ----------------------------------------------- | ----------- | ------ | ----- | ---------------------------------------------------------------------------------- |
| SSE EventSource limitations (no custom headers) | Medium      | Medium | 4     | Token-via-query-parameter pattern (already proven in POC)                          |
| Generic TState complexity for consumers         | Medium      | Low    | 3     | Provide BaseWorkflowState as sensible default; document extension pattern          |
| Signal/RxJS interop complexity                  | Low         | Medium | 3     | Use `toSignal()` / `toObservable()` from `@angular/core/rxjs-interop` where needed |
| Angular version compatibility (19+ signals)     | Low         | High   | 4     | Document minimum Angular 19 requirement in package.json peerDependencies           |
| Gen UI ComponentOutlet input binding            | Low         | Medium | 3     | Angular 17+ supports input binding on NgComponentOutlet natively                   |
| Bundle size exceeding target                    | Low         | Low    | 2     | Tree-shakeable architecture; no heavy dependencies                                 |

---

## Recommended Next Delegation

**Next Agent**: software-architect

**Rationale**: Research is complete (design docs exist), requirements are now defined. The architect should create the implementation plan with:

- Detailed file-by-file specifications for each layer
- Dependency graph between layers (Layer 1 first, then 2+3 can parallel, etc.)
- Interface contracts between services
- Testing strategy per layer

**Success Criteria**: An implementation-plan.md that enables the team-leader to decompose into atomic, independently committable tasks.
