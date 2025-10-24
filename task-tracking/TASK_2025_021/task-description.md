# Requirements Document - TASK_2025_021

## Introduction

### Business Context

TASK_2025_021 focuses on rewriting the composables (Angular inject-pattern functions) and provider configuration sections of the angular-langgraph.md documentation. This task eliminates workflow-specific implementations and creates a fully generic, type-safe API for building custom AI workflows.

**Current State**: The original documentation includes hardcoded composables like `useLangGraphWorkflow(githubUsername: string)` that accept DevBrand-specific parameters. Provider functions already use generic patterns from TASK_2025_019 (`provideLangGraph`, `provideLangGraphWorkflow`), but require documentation updates to emphasize multi-workflow support.

**Value Proposition**:

- **Developer Experience**: Type-safe composables with full IDE autocomplete for custom workflows
- **Flexibility**: Support ANY workflow type through generic type parameters
- **Composability**: RxJS operators that chain seamlessly with existing reactive code
- **Zero Configuration**: Sensible defaults with maximum customization through provider tree
- **Multi-Workflow Applications**: Enable multiple workflows in single application via registry pattern

### Dependencies

**Required Predecessors** (COMPLETED):

- **TASK_2025_019**: WorkflowRegistry, LangGraphConnectionService, Provider functions
- **TASK_2025_020**: Components, directives, template contexts

**Dependency Integration**:

- Composables MUST use WorkflowRegistry from TASK_2025_019 for workflow lookups
- Composables MUST leverage LangGraphProtocolService generic event types from TASK_2025_019
- Providers MUST integrate WorkflowRegistry initialization patterns from TASK_2025_019
- Type guards MUST work with component template contexts from TASK_2025_020

### Scope

This task rewrites **TWO MAIN SECTIONS** of angular-langgraph.md:

1. **Composable Functions** (Lines 849-958, ~110 lines)

   - `useLangGraphWorkflow` - Generic workflow execution
   - `useLangGraphChat` - Generic chat functionality
   - `useLangGraphApproval` - Generic HITL approval handling
   - NEW: Additional utility composables for state management, streaming

2. **Provider Configuration** (Lines 962-1100, ~140 lines)
   - `provideLangGraph()` - Already generic, update docs
   - `provideLangGraphWorkflow()` - Already generic, update docs
   - NEW: Multi-workflow provider patterns
   - NEW: Testing provider utilities

**Estimated Documentation Output**: 800-1,200 lines (expanded from 250 lines with comprehensive examples, RxJS operators, type guards)

---

## Requirements

### Requirement 1: Generic Composable Functions

**User Story**: As an Angular developer building a custom AI workflow, I want type-safe composable functions that accept workflow IDs and generic type parameters, so that I have full IDE autocomplete and compile-time type checking for my workflow input, state, and output types.

#### Acceptance Criteria

1. WHEN developer reads `useLangGraphWorkflow` documentation THEN function signature SHALL accept `workflowId: string` parameter instead of hardcoded workflow-specific parameters
2. WHEN developer uses `useLangGraphWorkflow<TInput, TState, TOutput>()` THEN all returned values (state, result, error) SHALL be typed with provided type parameters
3. WHEN composable executes workflow THEN it SHALL use WorkflowRegistry from TASK_2025_019 to lookup workflow definition by ID
4. WHEN composable documentation shows examples THEN examples SHALL use minimum 3 different workflow domains (e.g., content-generation, data-analysis, code-review)
5. WHEN developer inspects return type THEN IDE autocomplete SHALL show typed properties based on generic type parameters
6. WHEN composable subscribes to events THEN it SHALL use LangGraphProtocolService.events$ from TASK_2025_019 with proper type guards
7. WHEN documentation explains usage THEN it SHALL show type inference examples where type parameters are inferred from WorkflowRegistry
8. WHEN composable handles errors THEN error types SHALL be generic and workflow-agnostic

#### Technical Specifications

**Generic Signature Pattern** (from TASK_2025_018 spec):

```typescript
export function useLangGraphWorkflow<TInput, TState, TOutput>(
  workflowId: string,
  options?: WorkflowOptions<TInput>
) {
  const registry = inject(WorkflowRegistry);
  const connection = inject(LangGraphConnectionService);

  const workflow = registry.get<TInput, TOutput>(workflowId);

  return {
    execute: (input: TInput) => connection.executeWorkflow(workflow, input),
    state: toSignal(connection.on<StateSnapshot<TState>>('state_snapshot')),
    result: toSignal(connection.on<RunCompletedEvent<TOutput>>('run_finished')),
  };
}
```

**Composables to Document**:

1. **useLangGraphWorkflow<TInput, TState, TOutput>** (~150 lines)

   - Workflow execution management
   - State tracking with typed signals
   - Result handling with typed observables
   - Error state management

2. **useLangGraphChat<TMessage>** (~120 lines)

   - Generic message types
   - Chat history management
   - Typing indicators
   - Message streaming

3. **useLangGraphApproval<TApprovalData>** (~120 lines)

   - Generic approval data types
   - Pending approval state
   - Approval/rejection actions
   - Approval history tracking

4. **useLangGraphStreaming<TToken, TOutput>** (~100 lines) [NEW]

   - Token streaming with buffering
   - Accumulated output tracking
   - Stream completion detection
   - Token rate limiting

5. **useLangGraphState<TState>** (~80 lines) [NEW]
   - State snapshot tracking
   - State delta application
   - Optimistic updates
   - State synchronization

**Total Composables Section**: ~570 lines

---

### Requirement 2: RxJS Operators for Workflow Events

**User Story**: As an Angular developer working with reactive patterns, I want generic RxJS operators that filter, transform, and handle workflow events, so that I can compose complex event processing pipelines without hardcoded workflow logic.

#### Acceptance Criteria

1. WHEN developer reads operator documentation THEN all operators SHALL use generic type parameters (no hardcoded event types)
2. WHEN operator filters events THEN it SHALL support ALL 16 AG-UI event types from TASK_2025_019
3. WHEN operator transforms state THEN it SHALL accept generic TState type parameter
4. WHEN operator handles errors THEN retry logic SHALL be workflow-agnostic
5. WHEN documentation shows operator usage THEN examples SHALL demonstrate operator chaining
6. WHEN operator provides type guards THEN TypeScript SHALL correctly narrow union types
7. WHEN operator buffers tokens THEN buffer size and timing SHALL be configurable
8. WHEN developer chains operators THEN type inference SHALL propagate through pipeline

#### Technical Specifications

**RxJS Operators to Document** (~300 lines total):

1. **filterWorkflowEvents<TEvent extends AGUIEvent>** (~40 lines)

   - Type-safe event filtering
   - Support for event type discrimination
   - TypeScript type guard integration
   - Example: `events$.pipe(filterWorkflowEvents<TokenUpdateEvent>('token_update'))`

2. **mapToWorkflowState<TState>** (~40 lines)

   - Extract state from StateSnapshot events
   - Apply state deltas incrementally
   - Type-safe state transformation
   - Example: `events$.pipe(mapToWorkflowState<MyWorkflowState>())`

3. **retryOnWorkflowError** (~50 lines)

   - Exponential backoff retry strategy
   - Configurable max attempts
   - Error type filtering
   - Example: `executeWorkflow(input).pipe(retryOnWorkflowError({ maxAttempts: 3 }))`

4. **takeUntilWorkflowComplete<TOutput>** (~40 lines)

   - Auto-unsubscribe on workflow completion
   - Extract final output
   - Handle both success and failure
   - Example: `events$.pipe(takeUntilWorkflowComplete<MyOutput>())`

5. **bufferWorkflowTokens<TOutput>** (~60 lines)

   - Buffer token updates by time or count
   - Accumulate tokens into output
   - Configurable buffer strategy (time, count, idle)
   - Example: `tokens$.pipe(bufferWorkflowTokens({ bufferTime: 100 }))`

6. **shareWorkflowExecution** (~30 lines)

   - Share execution observable across subscribers
   - Multicast workflow events
   - Prevent duplicate executions
   - Example: `execute(input).pipe(shareWorkflowExecution())`

7. **catchWorkflowError<TError>** (~40 lines)
   - Type-safe error handling
   - Graceful degradation
   - Error transformation
   - Example: `execute(input).pipe(catchWorkflowError<MyError>(err => of(fallback)))`

---

### Requirement 3: Type Guards and Utility Functions

**User Story**: As an Angular developer processing workflow events, I want type guard functions that narrow union types, so that TypeScript provides accurate type checking and IDE autocomplete for event-specific properties.

#### Acceptance Criteria

1. WHEN developer uses type guard THEN TypeScript SHALL narrow union type to specific event type
2. WHEN type guard checks event THEN it SHALL verify both event.type AND runtime properties
3. WHEN documentation shows type guard THEN example SHALL demonstrate TypeScript narrowing
4. WHEN utility function validates state THEN it SHALL support generic TState type
5. WHEN utility extracts output THEN it SHALL handle both success and error cases with proper typing
6. WHEN developer inspects typed event THEN IDE autocomplete SHALL show event-specific properties
7. WHEN type guard returns true THEN TypeScript control flow analysis SHALL recognize narrowing
8. WHEN utility validates input THEN it SHALL use Zod schema from WorkflowDefinition

#### Technical Specifications

**Type Guards to Document** (~200 lines total):

1. **Event Type Guards** (~120 lines)

   ```typescript
   // Run lifecycle guards
   function isRunStartedEvent(event: AGUIEvent): event is RunStartedEvent;
   function isRunFinishedEvent(event: AGUIEvent): event is RunCompletedEvent<any>;

   // State guards
   function isStateSnapshot<TState>(event: AGUIEvent): event is StateSnapshot<TState>;
   function isStateDelta<TState>(event: AGUIEvent): event is StateDelta<TState>;

   // Message guards
   function isTokenUpdate<TOutput>(event: AGUIEvent): event is TokenUpdateEvent<TOutput>;
   function isStreamUpdate(event: AGUIEvent): event is StreamUpdateEvent;

   // HITL guards
   function isInterruptionRequest<TData>(
     event: AGUIEvent
   ): event is InterruptionRequestEvent<TData>;
   function isInterruptionResolved(event: AGUIEvent): event is InterruptionResolvedEvent;

   // Tool guards
   function isToolCallStart(event: AGUIEvent): event is ToolCallStartEvent;
   function isToolCallEnd(event: AGUIEvent): event is ToolCallEndEvent;

   // Error guard
   function isErrorEvent(event: AGUIEvent): event is ErrorEvent;
   ```

2. **Utility Functions** (~80 lines)

   ```typescript
   // Output extraction
   function extractWorkflowOutput<TOutput>(result: WorkflowResult<TOutput>): TOutput | undefined;

   // State validation
   function validateWorkflowState<TState>(state: unknown, schema: ZodSchema<TState>): TState | null;

   // Input validation
   function validateWorkflowInput<TInput>(
     input: unknown,
     workflow: WorkflowDefinition<TInput, any>
   ): TInput | null;

   // Execution ID generation
   function generateExecutionId(): string;

   // Event filtering helpers
   function filterByExecutionId(executionId: string): MonoTypeOperatorFunction<AGUIEvent>;
   function filterByWorkflowId(workflowId: string): MonoTypeOperatorFunction<AGUIEvent>;
   ```

---

### Requirement 4: Provider Configuration Documentation

**User Story**: As an Angular application architect, I want comprehensive provider documentation that shows multi-workflow registration patterns, so that I can configure multiple AI workflows in a single application without conflicts.

#### Acceptance Criteria

1. WHEN developer reads `provideLangGraph` docs THEN configuration options SHALL be fully documented with types
2. WHEN developer registers multiple workflows THEN provider tree SHALL support workflow array registration
3. WHEN documentation shows examples THEN minimum 3 workflows SHALL be registered simultaneously
4. WHEN provider configures services THEN it SHALL initialize WorkflowRegistry from TASK_2025_019
5. WHEN application bootstraps THEN workflows SHALL be available in registry before component initialization
6. WHEN developer provides custom interceptors THEN provider SHALL support interceptor injection
7. WHEN testing setup documented THEN test providers SHALL support workflow mocking
8. WHEN feature modules use library THEN provideLangGraphFeature SHALL enable lazy-loaded workflow registration

#### Technical Specifications

**Provider Functions to Document** (~150 lines):

1. **provideLangGraph(config)** (~60 lines)

   - Already generic from TASK_2025_019
   - Update docs to emphasize WorkflowRegistry initialization
   - Show configuration options with defaults
   - Document interceptor configuration
   - Example: Multi-workflow application setup

2. **provideLangGraphWorkflow(workflow)** (~40 lines)

   - Already generic from TASK_2025_019
   - Update docs to show array registration pattern
   - Demonstrate type inference from workflow definitions
   - Show lazy-loaded workflow registration
   - Example: Feature module workflow registration

3. **provideLangGraphFeature(providers)** (~30 lines)

   - Custom feature provider extension
   - Show how to add custom services
   - Demonstrate feature flag patterns
   - Example: Custom visualization service

4. **provideLangGraphTesting(config)** (~20 lines) [NEW]
   - Testing utility providers
   - Mock workflow registry
   - Mock protocol service
   - Example: Unit test setup

**Provider Configuration Examples** (~80 lines):

- Single workflow application
- Multi-workflow application (3+ workflows)
- Lazy-loaded workflow module
- Test environment setup

---

### Requirement 5: Integration Patterns Documentation

**User Story**: As an Angular developer integrating the library, I want comprehensive integration examples that show how composables, operators, components, and providers work together, so that I can implement best practices from the start.

#### Acceptance Criteria

1. WHEN developer reads integration examples THEN minimum 3 complete workflow implementations SHALL be shown
2. WHEN example shows composable usage THEN it SHALL demonstrate integration with components from TASK_2025_020
3. WHEN example shows operator chaining THEN it SHALL demonstrate real-world event processing pipeline
4. WHEN example shows provider setup THEN it SHALL show WorkflowRegistry initialization with type inference
5. WHEN integration pattern documented THEN it SHALL follow Angular best practices (signals, inject, OnPush)
6. WHEN error handling shown THEN it SHALL demonstrate operator-based error recovery
7. WHEN state management shown THEN it SHALL demonstrate signal-based reactivity
8. WHEN testing pattern shown THEN it SHALL use provideLangGraphTesting utilities

#### Technical Specifications

**Integration Examples** (~200 lines):

1. **Complete Workflow Integration** (~80 lines)

   - WorkflowRegistry registration
   - Component with useLangGraphWorkflow composable
   - RxJS operator pipeline for event processing
   - Error handling with catchWorkflowError
   - State tracking with signals

2. **Multi-Workflow Dashboard** (~60 lines)

   - Multiple workflows registered
   - WorkflowVisualizer components from TASK_2025_020
   - Composables for each workflow
   - Shared state management
   - Event aggregation

3. **Streaming Chat Application** (~60 lines)
   - Chat workflow with token streaming
   - useLangGraphChat composable
   - bufferWorkflowTokens operator
   - ApprovalModal component integration
   - HITL approval handling

---

## Non-Functional Requirements

### Performance Requirements

1. **Bundle Size Impact**:

   - RxJS operators: < 5KB additional (tree-shakeable)
   - Composables: < 3KB per composable (code splitting)
   - Type guards: 0KB runtime (TypeScript only)
   - Total library addition: < 15KB gzipped

2. **Runtime Performance**:

   - Type guard execution: < 1ms per check
   - Composable initialization: < 10ms
   - Operator overhead: < 5% vs raw RxJS

3. **Memory Management**:
   - Automatic subscription cleanup via RxJS operators
   - Signal-based reactivity prevents memory leaks
   - Composables use Angular's injection context for lifecycle

### Type Safety Requirements

1. **Generic Type Propagation**:

   - All type parameters SHALL propagate through Observable chains
   - TypeScript strict mode compliant (no 'any' types)
   - Generic constraints documented for complex types

2. **Type Inference**:

   - WorkflowRegistry lookups SHALL infer TInput/TOutput from registered workflows
   - Composable return types SHALL be fully inferred
   - RxJS operators SHALL maintain type information through pipelines

3. **IDE Support**:
   - Full JSDoc documentation for all public APIs
   - TypeScript declaration files (.d.ts) accuracy
   - IDE autocomplete for generic type parameters

### Developer Experience Requirements

1. **Documentation Quality**:

   - Every composable has minimum 2 complete examples
   - Every operator has chaining example
   - Every type guard has TypeScript narrowing example
   - Copy-paste ready code snippets

2. **Error Messages**:

   - Clear error messages for missing workflow registrations
   - Type mismatch errors with helpful suggestions
   - Runtime validation errors with context

3. **Migration Path**:
   - Document 1.x to 2.0 migration for composables
   - Breaking changes clearly marked
   - Automated migration patterns where possible

---

## DevBrand Elimination Checklist

### Specific Code to Genericize

#### From Composables Section:

1. **useLangGraphWorkflow**:

   - REMOVE: `githubUsername: string` parameter
   - ADD: `workflowId: string` parameter
   - ADD: Generic type parameters `<TInput, TState, TOutput>`
   - UPDATE: `connection.startWorkflow(githubUsername)` → `connection.executeWorkflow(workflow, input)`

2. **useLangGraphApproval**:

   - REMOVE: Hardcoded `/hitl/approve` endpoint
   - ADD: Generic TApprovalData type parameter
   - UPDATE: Use WorkflowRegistry to get approval configuration

3. **Documentation Examples**:
   - REPLACE: `'DevBrand Workflow'` with generic workflow names
   - REPLACE: GitHub username inputs with generic workflow inputs
   - REPLACE: DevBrand-specific metadata with generic Record<string, any>

### Validation Patterns

After documentation complete, these searches MUST return zero matches in composables/providers sections:

```bash
# Case-insensitive DevBrand search
grep -i "devbrand" task-tracking/TASK_2025_021/*.md

# Hardcoded parameter search
grep "githubUsername" task-tracking/TASK_2025_021/*.md

# Hardcoded endpoint search
grep "/hitl/approve" task-tracking/TASK_2025_021/*.md
```

---

## Dependencies on Prior Tasks

### From TASK_2025_019 (Core Services):

**Required Imports**:

- `WorkflowRegistry` - For workflow lookups in composables
- `WorkflowDefinition<TInput, TOutput>` - Type definitions
- `LangGraphConnectionService` - For workflow execution
- `LangGraphProtocolService` - For event subscriptions
- `AGUIEvent`, `AGUIEventType` - Event type system
- All 16 event type interfaces (RunStartedEvent, TokenUpdateEvent, etc.)

**Required Patterns**:

- Generic type parameter usage: `<TInput, TState, TOutput>`
- WorkflowRegistry.get() type inference
- Event filtering with type guards

### From TASK_2025_020 (Components):

**Required Integration Points**:

- Component template contexts for composable examples
- WorkflowVisualizer component for integration examples
- ApprovalModal component for HITL composable examples
- Signal-based reactivity patterns

**Required Type Definitions**:

- `AgentContext<TAgent>` - For agent-related composables
- Template variable types for content projection examples

---

## Risk Analysis

### Technical Risks

#### Risk: Generic Type Complexity Overwhelms Developers

- **Probability**: Medium
- **Impact**: High (DX degradation)
- **Mitigation**:
  - Provide helper types for common patterns
  - Show type inference examples prominently
  - Document "start simple, add types later" approach
  - Include troubleshooting guide for type errors
- **Contingency**: Create simplified non-generic composables as convenience wrappers

#### Risk: RxJS Operator Performance Overhead

- **Probability**: Low
- **Impact**: Medium (Runtime performance)
- **Mitigation**:
  - Use RxJS's built-in optimizations (share, shareReplay)
  - Document performance characteristics
  - Provide benchmark comparisons
  - Recommend operator usage patterns
- **Contingency**: Provide direct service access for performance-critical paths

#### Risk: Type Guard False Positives

- **Probability**: Low
- **Impact**: High (Runtime errors)
- **Mitigation**:
  - Implement runtime property validation in guards
  - Test guards with malformed events
  - Document guard limitations
  - Provide strict mode option
- **Contingency**: Add runtime schema validation with Zod

### Integration Risks

#### Risk: Composable Lifecycle Conflicts with Components

- **Probability**: Medium
- **Impact**: Medium (Memory leaks or broken subscriptions)
- **Mitigation**:
  - Use Angular's inject() in injection context only
  - Document lifecycle best practices
  - Show DestroyRef usage for manual cleanup
  - Test composables in various component lifecycles
- **Contingency**: Provide class-based service alternatives

#### Risk: Multi-Workflow State Conflicts

- **Probability**: Medium
- **Impact**: High (State corruption)
- **Mitigation**:
  - Namespace state by executionId
  - Document isolation patterns
  - Provide workflow-scoped signal utilities
  - Test concurrent workflow execution
- **Contingency**: Add workflow execution isolation service

---

## Stakeholder Analysis

### Primary Stakeholders

#### Angular Developers (Custom Workflow Builders)

- **Needs**: Type-safe, composable API for custom workflows
- **Pain Points**: Complex generic signatures, unclear type propagation
- **Success Criteria**:
  - Can build custom workflow in < 100 lines
  - IDE autocomplete works for workflow types
  - Error messages are clear and actionable
- **Involvement**: Documentation consumers, example users

#### Library Maintainers

- **Needs**: Maintainable, extensible composable architecture
- **Pain Points**: Breaking changes management, type complexity
- **Success Criteria**:
  - Composables are independently testable
  - Type system prevents runtime errors
  - API surface is stable and versioned
- **Involvement**: Documentation writers, code reviewers

### Secondary Stakeholders

#### Quality Assurance Engineers

- **Needs**: Testable composables, mockable dependencies
- **Pain Points**: Integration testing complexity, type mocking
- **Success Criteria**:
  - provideLangGraphTesting utilities work
  - Composables can be tested in isolation
  - Example tests demonstrate patterns
- **Involvement**: Testing utility design, test pattern documentation

#### Technical Writers

- **Needs**: Clear, consistent API documentation
- **Pain Points**: Generic type explanation, complex examples
- **Success Criteria**:
  - Documentation follows consistent format
  - Examples are self-contained and runnable
  - Type signatures are explained clearly
- **Involvement**: Documentation structure, example creation

---

## Success Metrics

### Quantitative Metrics

1. **Documentation Completeness**:

   - 5 composables fully documented
   - 7 RxJS operators documented
   - 12+ type guards documented
   - 4 provider functions documented
   - 3+ integration examples
   - Target: 800-1,200 lines total

2. **Type Safety**:

   - Zero 'any' types in composable signatures
   - 100% generic type parameter coverage
   - All return types fully inferred
   - TypeScript strict mode compliant

3. **Code Quality**:
   - Zero DevBrand references (automated validation)
   - All examples runnable without modification
   - All code snippets syntax-highlighted
   - All JSDoc comments complete

### Qualitative Metrics

1. **Developer Experience**:

   - Composable usage requires < 5 lines of code
   - Type inference works without manual annotation
   - Error messages provide actionable guidance
   - IDE autocomplete shows relevant suggestions

2. **Integration Quality**:

   - Examples demonstrate real-world patterns
   - Composables integrate seamlessly with components from TASK_2025_020
   - Operators chain naturally with RxJS
   - Provider configuration is intuitive

3. **Documentation Clarity**:
   - Generic concepts explained with concrete examples
   - Type parameters purpose is clear
   - Integration patterns are easy to follow
   - Migration path from 1.x is documented

---

## Quality Gates (BDD Format)

### Gate 1: Composable Genericization

1. WHEN developer reads useLangGraphWorkflow documentation THEN signature SHALL accept workflowId parameter AND generic type parameters
2. WHEN composable executes workflow THEN it SHALL use WorkflowRegistry for lookup AND not hardcode any workflow IDs
3. WHEN documentation shows examples THEN minimum 3 different workflow domains SHALL be demonstrated
4. WHEN developer uses composable THEN IDE autocomplete SHALL provide typed suggestions for input/state/output
5. WHEN composable returns values THEN all values SHALL be typed with generic type parameters

### Gate 2: RxJS Operators

6. WHEN operator filters events THEN it SHALL support ALL 16 AG-UI event types from TASK_2025_019
7. WHEN operator documentation includes examples THEN operator chaining SHALL be demonstrated
8. WHEN operator provides type guard THEN TypeScript SHALL correctly narrow union types
9. WHEN operator handles errors THEN retry logic SHALL be workflow-agnostic AND configurable
10. WHEN developer chains operators THEN type inference SHALL propagate through entire pipeline

### Gate 3: Type Guards

11. WHEN type guard returns true THEN TypeScript control flow analysis SHALL recognize type narrowing
12. WHEN type guard validates event THEN it SHALL check both event.type AND runtime properties
13. WHEN documentation shows type guard usage THEN example SHALL demonstrate TypeScript narrowing with IDE screenshot
14. WHEN developer uses type guard THEN IDE autocomplete SHALL show event-specific properties after guard

### Gate 4: Provider Configuration

15. WHEN developer reads provideLangGraph docs THEN all configuration options SHALL be documented with JSDoc types
16. WHEN documentation shows multi-workflow setup THEN minimum 3 workflows SHALL be registered in example
17. WHEN provider configures services THEN WorkflowRegistry SHALL be initialized before components
18. WHEN testing setup documented THEN provideLangGraphTesting SHALL enable workflow mocking

### Gate 5: Integration Examples

19. WHEN integration example shown THEN it SHALL demonstrate composable + component + operator integration
20. WHEN example shows error handling THEN it SHALL use catchWorkflowError operator
21. WHEN example shows state management THEN it SHALL use signal-based reactivity from Angular
22. WHEN example shows HITL workflow THEN it SHALL integrate useLangGraphApproval with ApprovalModal component

### Gate 6: DevBrand Elimination

23. WHEN automated search runs THEN zero "devbrand" matches SHALL exist in documentation (case-insensitive)
24. WHEN composable signatures reviewed THEN zero hardcoded workflow-specific parameters SHALL exist
25. WHEN examples reviewed THEN all workflow references SHALL use generic placeholder names

### Gate 7: Type Safety

26. WHEN TypeScript compiles documentation examples THEN zero type errors SHALL occur in strict mode
27. WHEN generic type parameters used THEN all type constraints SHALL be documented
28. WHEN utility function validates input THEN it SHALL use Zod schema from WorkflowDefinition
29. WHEN operator transforms state THEN type parameter SHALL propagate to output Observable

### Gate 8: Documentation Quality

30. WHEN developer copies example code THEN code SHALL run without modification after proper imports
31. WHEN developer reads composable docs THEN minimum 2 complete examples SHALL be provided per composable
32. WHEN developer encounters error THEN troubleshooting section SHALL provide guidance for common issues

---

## Architect Invocation Recommendation

### DECISION: SKIP ARCHITECT - Proceed Directly to frontend-developer

**Rationale**:

1. **Existing Patterns Sufficient**:

   - TASK_2025_019 established WorkflowRegistry pattern - reuse directly
   - TASK_2025_019 defined generic type system - apply consistently
   - TASK_2025_020 demonstrated content projection - extend pattern to composables
   - No NEW architectural patterns required

2. **Composables = Service Wrappers**:

   - Composables are thin wrappers around LangGraphConnectionService (TASK_2025_019)
   - RxJS operators use standard reactive patterns (filter, map, retry)
   - Type guards are straightforward TypeScript predicates
   - Providers follow Angular's standard dependency injection

3. **Clear Implementation Path**:

   - Genericize composable signatures by adding type parameters
   - Replace hardcoded workflow IDs with registry lookups
   - Create RxJS operators using standard RxJS composition
   - Document provider tree using patterns from TASK_2025_019

4. **Low Complexity**:
   - No complex state management (signals handle reactivity)
   - No novel reactive patterns (standard RxJS operators)
   - No architectural decisions needed (follow TASK_2025_019/020 patterns)

**Conditions That Would Require Architect**:

- If custom RxJS operator scheduler needed (performance optimization)
- If multi-workflow state isolation requires complex architecture
- If provider tree conflicts with Angular DI system
- If type system complexity requires advanced TypeScript patterns

**Since none of these conditions exist, proceed directly to frontend-developer.**

---

## Delegation Package

### Next Agent: frontend-developer

**Agent Profile**: Frontend developer specializing in Angular, RxJS, and TypeScript

**Delegation Context**:

**Task**: Rewrite composables and providers sections of angular-langgraph.md (800-1,200 lines) to eliminate DevBrand-specific implementations and create fully generic, type-safe API.

**Input Artifacts**:

1. This requirements document (task-description.md)
2. TASK_2025_019/angular-langgraph-services-REWRITE.md (WorkflowRegistry, services, models)
3. TASK_2025_020/angular-langgraph-components-REWRITE.md (Components, directives, contexts)
4. Original angular-langgraph.md lines 849-1100 (current composables/providers)

**Expected Deliverables**:

1. `angular-langgraph-composables-REWRITE.md` (800-1,200 lines)
   - 5 generic composable functions with examples
   - 7 RxJS operators with chaining examples
   - 12+ type guards with TypeScript narrowing examples
   - 4 provider functions with multi-workflow examples
   - 3+ integration examples
2. Validation report proving zero DevBrand references
3. Test examples demonstrating provideLangGraphTesting utilities

**Success Criteria**:

- All 32 BDD acceptance criteria met
- Zero DevBrand references (automated validation)
- TypeScript strict mode compliance
- All code examples runnable without modification
- Type inference demonstrated for all generic APIs

**Quality Bar**:

- JSDoc documentation for all public APIs
- Minimum 2 examples per composable
- Operator chaining demonstrated for RxJS operators
- Type guard examples show TypeScript narrowing
- Integration examples demonstrate real-world patterns

**Time Budget**: M effort (6-8 hours)

- Composables documentation: 2h
- RxJS operators documentation: 2h
- Type guards documentation: 1h
- Provider configuration updates: 1h
- Integration examples: 1.5h
- Validation and quality checks: 0.5h

---

## Appendix: Reference Patterns from Dependencies

### From TASK_2025_019: WorkflowRegistry Usage

```typescript
// Pattern: Registry lookup with type inference
const registry = inject(WorkflowRegistry);
const workflow = registry.get<ContentInput, ContentOutput>('content-generation');

// Pattern: Generic event subscription
const protocol = inject(LangGraphProtocolService);
protocol.events$
  .pipe(filter((event): event is StateSnapshot<MyState> => event.type === 'state_snapshot'))
  .subscribe((snapshot) => {
    // TypeScript knows snapshot.state is MyState
  });
```

### From TASK_2025_020: Component Integration

```typescript
// Pattern: Component with composable
@Component({
  selector: 'app-workflow-page',
  template: `
    <lg-workflow-visualizer [workflowId]="workflowId()" [executionId]="execution()?.id" />
  `,
})
export class WorkflowPageComponent {
  workflowId = input.required<string>();

  // Composable usage
  workflow = useLangGraphWorkflow<MyInput, MyState, MyOutput>(this.workflowId());

  execution = this.workflow.state;
}
```

### Generic Type Parameter Conventions

```typescript
// Standard naming conventions
TInput    - Workflow input type
TState    - Workflow state type (LangGraph state)
TOutput   - Workflow output type
TMessage  - Chat message type
TApprovalData - HITL approval data type
TToken    - Token streaming type
TEvent    - AG-UI event type
TAgent    - Agent metadata type
```

---

**END OF REQUIREMENTS DOCUMENT**
