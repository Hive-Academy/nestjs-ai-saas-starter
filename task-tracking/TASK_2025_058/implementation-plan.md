# Implementation Plan - TASK_2025_058

## Workflow-Engine Type System Refactoring: Align with LangGraph Annotation-Based State

---

## Codebase Investigation Summary

### The Three Competing State Definitions

**1. `WorkflowState` (Plain TS Interface) - THE LIE**

- **Defined in THREE places** (all identical ~20-field interface):
  - `libs/langgraph-modules/workflow-engine/src/lib/interfaces/workflow-engine.interface.ts:4-41`
  - `libs/langgraph-modules/core/src/lib/interfaces/workflow.interface.ts:5-129`
  - `libs/langgraph-modules/core/src/lib/interfaces/state-management.interface.ts:182-223`
- Fields: `executionId`, `status`, `currentNode`, `completedNodes`, `confidence`, `messages`, `error`, `humanFeedback`, `metadata`, `timestamps`, `retryCount`, `startedAt`, `completedAt`, `previousNode`, `nextNode`, `requiresApproval`, `approvalReceived`, `waitingForApproval`, `rejectionReason`, `lastError`, `risks`
- Used as `TState extends WorkflowState` in **70+ generic signatures** across the codebase
- **PROBLEM**: Never used to construct StateGraph. `StateGraph` requires `StateDefinitionInit` (AnnotationRoot), not a plain interface. This generic is cosmetic theater.

**2. `AgentStateAnnotation` (AnnotationRoot) - THE TRUTH**

- Defined at: `libs/langgraph-modules/core/src/lib/annotations/agent-state.annotation.ts:32-134`
- Fields (8): `messages`, `next`, `current`, `scratchpad`, `task`, `threadId`, `userId`, `metadata`
- Hardcoded in `MetadataProcessorService` (lines 359, 406) as the ACTUAL annotation passed to `WorkflowDefinition.channels`
- This is what `StateGraph` actually receives and what node handlers get at runtime
- **None of the ~20 WorkflowState fields exist in this annotation**

**3. `WorkflowStateAnnotation` (AnnotationRoot) - THE DEAD CODE**

- Defined at: `libs/langgraph-modules/core/src/lib/annotations/workflow-state.annotation.ts:27-99`
- Fields (11): `executionId`, `status`, `currentNode`, `completedNodes`, `confidence`, `messages`, `metadata`, `error`, `humanFeedback`, `timestamps`, `customData`
- Re-exported from `workflow-engine.interface.ts:211`
- **NEVER passed to any StateGraph constructor**. Zero runtime usage.
- Was designed to mirror `WorkflowState` as an annotation but was never wired in.

### How LangGraph StateGraph Actually Works

From `node_modules/@langchain/langgraph/dist/graph/state.d.ts`:

- `StateGraph` constructor accepts `StateDefinitionInit` which is: `AnnotationRoot | StateSchema | ZodObject`
- It does NOT accept plain TypeScript interfaces
- The `SD` type parameter controls what state nodes receive and return
- Annotations define reducers (how updates merge) and defaults

### The Runtime Lie

At runtime, the actual data flow is:

1. `MetadataProcessorService` hardcodes `channels: AgentStateAnnotation` (line 359)
2. Strategy calls `new StateGraph(definition.channels)` - this IS the AgentStateAnnotation
3. Node handlers receive `AgentState` (8 fields) at runtime
4. But handlers are typed as `(state: TState extends WorkflowState)` (20 fields)
5. Accessing `state.executionId`, `state.confidence`, etc. returns `undefined` at runtime

### Consumer Scope

`TState extends WorkflowState` appears in **70+ generic signatures** across:

- `workflow-engine/`: MetadataProcessorService (8), WorkflowExecutionService (4), strategies (12), streaming (15), services (8), interfaces (8)
- `hitl/`: HumanApprovalNode (3), FeedbackProcessorService (6), WorkflowRoutingService (3)
- `core/`: WorkflowDefinition types (indirect via re-export)

---

## Architecture Decisions

### Decision 1: Remove `TState extends WorkflowState` Generics from Internal Engine

**Chosen Approach**: Drop the phantom generic parameter entirely from internal code

**Rationale**:

- The `TState` generic is NEVER used to construct `StateGraph`. The graph is always built from `definition.channels` (an AnnotationRoot)
- The generic provides zero type safety because:
  - Handlers are cast through `node.handler as (state: TState) => ...` at metadata-processor.service.ts:459
  - Strategies return `StateGraph<any, any, any, string>` already (every strategy)
  - WorkflowExecutionService casts results as `result as TState` (line 162)
- Removing it eliminates the false impression that `TState` controls graph typing

**Evidence**:

- functional-task-graph.strategy.ts:63: `const graph = new StateGraph(definition.channels)` - TState is unused
- functional-node-graph.strategy.ts:68: `const graph = new StateGraph(definition.channels)` - TState is unused
- Every strategy returns `StateGraph<any, any, any, string>` - TState has no effect

**What Replaces It**:

- Internal engine code: no generic (or `Record<string, unknown>` where a constraint is structurally needed)
- Public API (`executeWorkflow`, `streamWorkflow`): generic constrained to `Record<string, unknown>` for caller flexibility
- `WorkflowDefinition`: drops TState, handlers typed as `(state: Record<string, unknown>) => Promise<Record<string, unknown>>`

### Decision 2: Annotation Passthrough (User-Defined State)

**Chosen Approach**: Let `@FunctionalWorkflow({ channels })` pass a user-provided annotation through to StateGraph construction

**Rationale**:

- `WorkflowOptions.channels` already exists (workflow.decorator.ts:58) but is currently ignored by MetadataProcessorService which hardcodes AgentStateAnnotation
- The decorator should respect user-provided annotations
- Default remains `AgentStateAnnotation` when no `channels` specified

**Evidence**:

- workflow.decorator.ts:58: `channels?: typeof WorkflowStateAnnotation | any` - the option EXISTS
- metadata-processor.service.ts:359: `channels: AgentStateAnnotation` - HARDCODED, ignoring user input
- metadata-processor.service.ts:406: `channels: AgentStateAnnotation` - HARDCODED again

**Implementation**:

```typescript
// MetadataProcessorService - use annotation from options, default to AgentStateAnnotation
channels: workflowOptions.channels || AgentStateAnnotation,
```

### Decision 3: Keep Strategy Pattern, Drop TState from Signatures

**Chosen Approach**: Strategies remain structurally identical but signatures simplify

**Rationale**:

- Strategies already work correctly: `new StateGraph(definition.channels)` uses the annotation
- The `TState` on strategy methods is purely cosmetic - it doesn't affect graph construction
- Return type `StateGraph<any, any, any, string>` is already the actual type used

**Evidence**:

- All strategy `buildStateGraph` methods already return `StateGraph<any, any, any, string>`
- The `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments on every strategy method prove the generic was always a fiction

### Decision 4: Redesign HITL to Use Structural Typing

**Chosen Approach**: HITL services use structural typing (pick the fields they need) instead of constraining on the full `WorkflowState` interface

**Rationale**:

- `HumanApprovalNode.execute()` accesses: `executionId`, `confidence`, `currentNode`, `risks`, `metadata`, `humanFeedback`
- None of these exist in `AgentStateAnnotation` (the actual runtime state)
- HITL should declare what it NEEDS as a structural type, not demand the entire WorkflowState
- Callers can extend their annotation to include HITL fields when they use HITL features

**Evidence**:

- human-approval.node.ts:177: `const { executionId } = state` - undefined at runtime with AgentStateAnnotation
- human-approval.node.ts:207: `state.confidence || 0` - undefined at runtime
- human-approval.node.ts:258-259: `state.currentNode`, `state.risks` - undefined at runtime

**Implementation**:

```typescript
// HITL declares what fields it needs structurally
interface HitlRequiredState {
  executionId?: string;
  confidence?: number;
  currentNode?: string;
  metadata?: Record<string, unknown>;
  risks?: Array<{ severity: string; type: string; description: string }>;
}

// Then uses: <TState extends HitlRequiredState>
// Callers must ensure their annotation includes these fields
```

### Decision 5: Delete Dead Code

**Chosen Approach**: Remove `WorkflowStateAnnotation` and consolidate `WorkflowState` definitions

**Rationale**:

- `WorkflowStateAnnotation` is defined but NEVER used anywhere in the codebase
- Three identical `WorkflowState` interfaces exist across core and workflow-engine
- Re-exports from `workflow-engine.interface.ts:211` violate the no re-export rule

**Evidence**:

- Grep for `WorkflowStateAnnotation` usage: only its definition and re-export appear, zero consumption
- workflow-engine.interface.ts:204-213: re-exports `WorkflowStateAnnotation`, `createCustomStateAnnotation`, `isWorkflow` from core (violates CLAUDE.md rule)

---

## Phased Implementation Plan

### Phase 1: Delete Dead Code and Consolidate Definitions

**Goal**: Remove unused code and stop the bleeding of multiple competing definitions.

#### Phase 1.1: Delete `WorkflowStateAnnotation` (Dead Code)

**File**: `libs/langgraph-modules/core/src/lib/annotations/workflow-state.annotation.ts`

- **Action**: DELETE entire file (197 lines)
- **Rationale**: Never used by any StateGraph constructor. Zero runtime usage. Dead code.

**File**: `libs/langgraph-modules/core/src/index.ts`

- **Action**: MODIFY - Remove lines 83-85 that export `WorkflowStateAnnotation` and `createCustomStateAnnotation`
- Remove: `export { WorkflowStateAnnotation, createCustomStateAnnotation } from './lib/annotations/workflow-state.annotation';`

**File**: `libs/langgraph-modules/core/src/lib/annotations/index.ts` (if exists)

- **Action**: MODIFY - Remove barrel export of workflow-state.annotation

#### Phase 1.2: Remove Re-Exports from workflow-engine.interface.ts

**File**: `libs/langgraph-modules/workflow-engine/src/lib/interfaces/workflow-engine.interface.ts`

- **Action**: MODIFY
- Remove lines 203-213 (the import from core and re-exports):
  ```typescript
  // DELETE these lines:
  import { WorkflowStateAnnotation as CoreWorkflowStateAnnotation, ... } from '@hive-academy/langgraph-core';
  export const WorkflowStateAnnotation = CoreWorkflowStateAnnotation;
  export const createCustomStateAnnotation = coreCreateCustomStateAnnotation;
  export const isWorkflow = coreIsWorkflow;
  ```
- **Rationale**: Violates CLAUDE.md no-re-export rule. Consumers should import from `@hive-academy/langgraph-core` directly.

#### Phase 1.3: Remove Duplicate `WorkflowState` from workflow-engine.interface.ts

**File**: `libs/langgraph-modules/workflow-engine/src/lib/interfaces/workflow-engine.interface.ts`

- **Action**: MODIFY
- Remove the local `WorkflowState` interface (lines 4-41)
- Remove local `WorkflowError` interface (lines 43-53) - duplicate of core
- Remove local `HumanFeedback` interface (lines 55-68) - duplicate of core
- Add import: `import type { WorkflowState, WorkflowError, HumanFeedback } from '@hive-academy/langgraph-core';`
- Keep all other interfaces (`WorkflowDefinition`, `WorkflowNode`, etc.) that are workflow-engine specific
- **Rationale**: Single source of truth for `WorkflowState` in `@hive-academy/langgraph-core`

**Affected Consumers**: Any file importing `WorkflowState` from the workflow-engine interface will still get it via the re-import. No consumer changes needed for this step.

---

### Phase 2: Remove Phantom TState Generic from Engine Internals

**Goal**: Eliminate the `TState extends WorkflowState` generic from all internal engine code where it provides no real type safety.

#### Phase 2.1: Simplify `WorkflowDefinition` and Related Interfaces

**File**: `libs/langgraph-modules/workflow-engine/src/lib/interfaces/workflow-engine.interface.ts`

- **Action**: MODIFY
- Change `WorkflowDefinition<TState = WorkflowState>` to `WorkflowDefinition` (no generic)
- Change `WorkflowNode<TState = WorkflowState>` to `WorkflowNode` (no generic)
- Change `WorkflowEdge<TState = WorkflowState>` to `WorkflowEdge` (no generic)
- Change `ConditionalRouting<TState = WorkflowState>` to `ConditionalRouting` (no generic)
- Change `Command<TState = WorkflowState>` to `Command` (no generic)
- Handler type becomes: `handler: (state: Record<string, unknown>) => Promise<Record<string, unknown>>`
- Condition type becomes: `condition: (state: Record<string, unknown>) => string`
- The `channels` field on `WorkflowDefinition` gets proper typing: `channels: AnnotationRoot<any>` (import from `@langchain/langgraph`)
- `WorkflowNodeConfig.approval.condition` and `WorkflowEdgeConfig.condition` become `(state: Record<string, unknown>) => boolean`

#### Phase 2.2: Simplify MetadataProcessorService

**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`

- **Action**: MODIFY
- Remove all `<TState extends WorkflowState = WorkflowState>` generics from methods:
  - `extractWorkflowDefinition()` - drop `<TState>`
  - `compileTaskBasedWorkflow()` - drop `<TState>`
  - `compileNodeBasedWorkflow()` - drop `<TState>`
  - `convertNodesToDefinition()` - drop `<TState>`
  - `convertEdgesToDefinition()` - drop `<TState>`
  - `validateWorkflowDefinition()` - drop `<TState>`
  - `getWorkflowSummary()` - drop `<TState>`
  - `getStreamingSummary()` - drop `<TState>`
  - `hasStreamingCapabilities()` - drop `<TState>`
- Remove import of `WorkflowState` from interfaces (no longer needed as generic bound)
- **CRITICAL FIX**: Replace hardcoded `AgentStateAnnotation` with annotation passthrough:

  ```typescript
  // Line 359 and 406 - BEFORE:
  channels: AgentStateAnnotation,

  // AFTER:
  channels: workflowOptions.channels || AgentStateAnnotation,
  ```

- Return types become `WorkflowDefinition` (no generic)

#### Phase 2.3: Simplify Strategy Pattern

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/graph-building.strategy.interface.ts`

- **Action**: MODIFY
- Change: `buildStateGraph<TState extends WorkflowState = WorkflowState>(definition: WorkflowDefinition<TState>): StateGraph<any, any, any, string>`
- To: `buildStateGraph(definition: WorkflowDefinition): StateGraph<any, any, any, string>`

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/base-graph-building.strategy.ts`

- **Action**: MODIFY
- Remove all `<TState extends WorkflowState = WorkflowState>` from:
  - `buildStateGraph()` abstract method
  - `addNodesToGraph()`
  - `getNextNode()`
  - `hasTools()`
  - `shouldExecuteTools()` - change param from `state: WorkflowState` to `state: Record<string, unknown>`
- Remove import of `WorkflowState`

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/functional-task-graph.strategy.ts`

- **Action**: MODIFY
- Remove all `<TState extends WorkflowState = WorkflowState>` from:
  - `buildStateGraph()`
  - `addTaskEdges()`
  - `addLLMTaskToolRouting()`
  - `getNextTaskId()`
- Remove import of `WorkflowState`

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/functional-node-graph.strategy.ts`

- **Action**: MODIFY
- Remove all `<TState extends WorkflowState = WorkflowState>` from:
  - `buildStateGraph()`
  - `addToolNode()`
  - `addNodeEdges()`
  - `addNodeToolRouting()`
- Remove import of `WorkflowState`

#### Phase 2.4: Simplify WorkflowExecutionService

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`

- **Action**: MODIFY
- `executeWorkflow<TState extends WorkflowState>` becomes `executeWorkflow<TState extends Record<string, unknown> = Record<string, unknown>>`
- `streamWorkflow<TState extends WorkflowState>` becomes `streamWorkflow<TState extends Record<string, unknown> = Record<string, unknown>>`
- `executeMultiAgentWorkflow<TState extends WorkflowState>` becomes `executeMultiAgentWorkflow<TState extends Record<string, unknown> = Record<string, unknown>>`
- `buildStateGraph()` - drop TState generic entirely (private method)
- Remove `WorkflowState` import from interfaces
- Note: The public API keeps a generic for caller ergonomics (they can specify their state type for input/output typing) but the constraint is `Record<string, unknown>` not `WorkflowState`

#### Phase 2.5: Simplify Streaming Types

**File**: `libs/langgraph-modules/workflow-engine/src/lib/streaming/types/stream-event.types.ts`

- **Action**: MODIFY - Replace all `TState extends WorkflowState = WorkflowState` with `TState extends Record<string, unknown> = Record<string, unknown>`

**File**: `libs/langgraph-modules/workflow-engine/src/lib/streaming/parsers/stream-event.parser.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/streaming/transformers/stream-event.transformer.ts`

- **Action**: MODIFY - Same replacement

#### Phase 2.6: Simplify Other Services

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts`

- **Action**: MODIFY - Replace `TState extends WorkflowState` with `TState extends Record<string, unknown>`

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/langgraph-command.service.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/multi-agent-graph-builder.service.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/supervisor-graph-builder.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/sequential-graph-builder.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/i-multi-agent-graph-builder.interface.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/base/agent-node.base.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/interfaces/decorator-bridge.interface.ts`

- **Action**: MODIFY - Same replacement for all generic signatures

**File**: `libs/langgraph-modules/workflow-engine/src/lib/interfaces/multi-agent-bridge.interface.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/interfaces/multi-agent/agent.types.ts`

- **Action**: MODIFY - `AgentState extends WorkflowState` becomes `AgentState extends Record<string, unknown>`

**File**: `libs/langgraph-modules/workflow-engine/src/lib/utils/multi-agent/agent-state-validator.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/utils/functional/decorator-validator.ts`

- **Action**: MODIFY - Same replacement

**File**: `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/node.decorator.ts`

- **Action**: MODIFY - Same replacement if applicable

**File**: `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/edge.decorator.ts`

- **Action**: MODIFY - Same replacement if applicable

---

### Phase 3: Fix HITL to Use Structural Typing

**Goal**: HITL services declare what state fields they need structurally, not via the full WorkflowState interface.

#### Phase 3.1: Create HITL State Requirements Interface

**File**: `libs/langgraph-modules/hitl/src/lib/interfaces/hitl-state.interface.ts`

- **Action**: CREATE
- Define minimal structural types for what HITL actually needs:

```typescript
import type { BaseMessage } from '@langchain/core/messages';

/**
 * Minimal state shape required by HumanApprovalNode.
 * Workflows using HITL must ensure their annotation includes these fields.
 * All fields are optional to support graceful degradation.
 */
export interface HitlCapableState {
  executionId?: string;
  confidence?: number;
  currentNode?: string;
  metadata?: Record<string, unknown>;
  risks?: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    mitigation?: string;
  }>;
  // HITL output fields
  humanFeedback?: {
    approved: boolean;
    status: string;
    approver: { id: string; name?: string; role?: string };
    message?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  };
  approvalReceived?: boolean;
  waitingForApproval?: boolean;
  rejectionReason?: string;
}
```

#### Phase 3.2: Update HumanApprovalNode

**File**: `libs/langgraph-modules/hitl/src/lib/nodes/human-approval.node.ts`

- **Action**: MODIFY
- Replace `import type { WorkflowState, HumanFeedback } from '@hive-academy/langgraph-core'`
- With: `import type { HitlCapableState } from '../interfaces/hitl-state.interface'`
- Change `execute<TState extends WorkflowState>` to `execute<TState extends HitlCapableState>`
- Change `processHumanFeedback<TState extends WorkflowState>` to `processHumanFeedback<TState extends HitlCapableState>`
- Change `extractDefaultActions<TState extends WorkflowState>` to `extractDefaultActions<TState extends HitlCapableState>`
- Use optional chaining for all field accesses (already partially done, needs full audit):
  - `state.executionId ?? 'unknown'` (instead of destructuring)
  - `state.confidence ?? 0`
  - `state.currentNode` (already optional)

#### Phase 3.3: Update Other HITL Services

**File**: `libs/langgraph-modules/hitl/src/lib/services/feedback-processor.service.ts`

- **Action**: MODIFY - Replace `TState extends WorkflowState` with `TState extends HitlCapableState`

**File**: `libs/langgraph-modules/hitl/src/lib/routing/workflow-routing.service.ts`

- **Action**: MODIFY - Replace `TState extends WorkflowState` with `TState extends Record<string, unknown>`

**File**: `libs/langgraph-modules/hitl/src/lib/decorators/approval.decorator.ts`

- **Action**: MODIFY - Replace any `WorkflowState` references with `Record<string, unknown>` or `HitlCapableState`

**File**: `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-processing.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/hitl-approval-request.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-evaluator.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/confidence-evaluator.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-timeout.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/hitl-validation.service.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/interfaces/user-interruption.interface.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-workflow.types.ts`

- **Action**: MODIFY - Replace `WorkflowState` references

#### Phase 3.4: Create HITL Annotation Extension Helper

**File**: `libs/langgraph-modules/hitl/src/lib/annotations/hitl-state.annotation.ts`

- **Action**: CREATE
- Provide a helper to extend any annotation with HITL-required fields:

````typescript
import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

/**
 * Additional annotation fields required for HITL workflows.
 * Extend your base annotation with these when using HumanApprovalNode.
 */
export const HitlFields = {
  executionId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  confidence: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 1.0,
  }),
  currentNode: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  risks: Annotation<Array<{ severity: string; type: string; description: string }>>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  humanFeedback: Annotation<Record<string, unknown> | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  approvalReceived: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  waitingForApproval: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  rejectionReason: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
};

/**
 * AgentStateAnnotation extended with HITL fields.
 * Use this as the annotation for workflows that need human approval.
 *
 * @example
 * ```typescript
 * @FunctionalWorkflow({ channels: HitlAgentStateAnnotation })
 * class MyApprovalWorkflow { ... }
 * ```
 */
export const HitlAgentStateAnnotation = Annotation.Root({
  ...AgentStateAnnotation.spec,
  ...HitlFields,
});

export type HitlAgentState = typeof HitlAgentStateAnnotation.State;
````

---

### Phase 4: Clean Up Core Library

**Goal**: Remove `WorkflowState` from core's redundant definitions and update exports.

#### Phase 4.1: Consolidate WorkflowState in Core

**File**: `libs/langgraph-modules/core/src/lib/interfaces/state-management.interface.ts`

- **Action**: MODIFY
- Keep `WorkflowState` here as the SINGLE canonical definition (for any consumer that still needs the interface type, e.g., documentation, testing)
- But add a deprecation comment:

```typescript
/**
 * @deprecated Do not use as a generic constraint for StateGraph-related code.
 * StateGraph requires AnnotationRoot, not a plain interface.
 * Use `typeof YourAnnotation.State` for state typing.
 * Use `Record<string, unknown>` for generic state constraints.
 * This interface is retained for documentation and migration reference only.
 */
export interface WorkflowState extends BaseWorkflowState { ... }
```

**File**: `libs/langgraph-modules/core/src/lib/interfaces/workflow.interface.ts`

- **Action**: MODIFY
- Remove the duplicate `WorkflowState` interface definition (lines 5-129)
- Import from state-management.interface.ts if still referenced by other types in this file
- Remove `HumanFeedback` and `WorkflowExecutionError` if duplicated (import from state-management.interface.ts)

**File**: `libs/langgraph-modules/core/src/index.ts`

- **Action**: MODIFY
- Remove `WorkflowStateAnnotation` and `createCustomStateAnnotation` exports (deleted in Phase 1)
- Keep `AgentStateAnnotation` and `createCustomAgentStateAnnotation` exports
- Ensure `WorkflowState` export comes from single source (state-management.interface.ts)

#### Phase 4.2: Update Workflow Decorator Type

**File**: `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/workflow.decorator.ts`

- **Action**: MODIFY
- Change `channels?: typeof WorkflowStateAnnotation | any` to proper type:

  ```typescript
  import type { AnnotationRoot } from '@langchain/langgraph';

  channels?: AnnotationRoot<any>;
  ```

- Remove import of `WorkflowStateAnnotation` from `@hive-academy/langgraph-core`

---

### Phase 5: Verification and Documentation

#### Phase 5.1: Type-Check Verification

Run `npx nx run-many --target=typecheck --projects=@hive-academy/langgraph-workflow-engine,@hive-academy/langgraph-hitl,@hive-academy/langgraph-core` after each phase to catch breakages early.

#### Phase 5.2: Update CLAUDE.md Files

**File**: `libs/langgraph-modules/workflow-engine/CLAUDE.md`

- **Action**: MODIFY
- Update "State Management" section to describe annotation-based state
- Remove references to `WorkflowState` as base interface for handlers
- Document `channels` parameter on `@FunctionalWorkflow`
- Add annotation extension examples

**File**: `libs/langgraph-modules/core/CLAUDE.md`

- **Action**: MODIFY
- Update state interface documentation
- Deprecate `WorkflowState` guidance
- Promote `AgentStateAnnotation` and custom annotations as the state definition approach

**File**: `libs/langgraph-modules/hitl/CLAUDE.md`

- **Action**: MODIFY
- Document `HitlCapableState` and `HitlAgentStateAnnotation`
- Update integration examples to show annotation-based HITL usage

---

## Files Affected Summary

### DELETE (1 file)

- `libs/langgraph-modules/core/src/lib/annotations/workflow-state.annotation.ts` (197 lines - dead code)

### CREATE (2 files)

- `libs/langgraph-modules/hitl/src/lib/interfaces/hitl-state.interface.ts`
- `libs/langgraph-modules/hitl/src/lib/annotations/hitl-state.annotation.ts`

### MODIFY (35+ files)

**Core Library** (4 files):

- `libs/langgraph-modules/core/src/lib/interfaces/state-management.interface.ts`
- `libs/langgraph-modules/core/src/lib/interfaces/workflow.interface.ts`
- `libs/langgraph-modules/core/src/index.ts`
- `libs/langgraph-modules/core/CLAUDE.md`

**Workflow Engine** (20+ files):

- `libs/langgraph-modules/workflow-engine/src/lib/interfaces/workflow-engine.interface.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/graph-building.strategy.interface.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/base-graph-building.strategy.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/functional-task-graph.strategy.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/functional-node-graph.strategy.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/streaming/types/stream-event.types.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/streaming/parsers/stream-event.parser.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/streaming/transformers/stream-event.transformer.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/langgraph-command.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/multi-agent-graph-builder.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/supervisor-graph-builder.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/sequential-graph-builder.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/i-multi-agent-graph-builder.interface.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/base/agent-node.base.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/interfaces/decorator-bridge.interface.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/interfaces/multi-agent-bridge.interface.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/interfaces/multi-agent/agent.types.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/utils/multi-agent/agent-state-validator.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/utils/functional/decorator-validator.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/workflow.decorator.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/node.decorator.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/edge.decorator.ts`
- `libs/langgraph-modules/workflow-engine/CLAUDE.md`

**HITL Library** (12+ files):

- `libs/langgraph-modules/hitl/src/lib/nodes/human-approval.node.ts`
- `libs/langgraph-modules/hitl/src/lib/services/feedback-processor.service.ts`
- `libs/langgraph-modules/hitl/src/lib/routing/workflow-routing.service.ts`
- `libs/langgraph-modules/hitl/src/lib/decorators/approval.decorator.ts`
- `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/approval-processing.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/approval-evaluator.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/confidence-evaluator.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/approval-timeout.service.ts`
- `libs/langgraph-modules/hitl/src/lib/services/hitl-validation.service.ts`
- `libs/langgraph-modules/hitl/src/lib/interfaces/user-interruption.interface.ts`
- `libs/langgraph-modules/hitl/src/lib/services/approval-workflow.types.ts`
- `libs/langgraph-modules/hitl/CLAUDE.md`

---

## Risk Assessment

### High Risk

- **Scope**: 35+ files across 3 libraries. Mechanical but requires careful find-replace.
- **Mitigation**: Phase by phase with typecheck after each phase. Phase 1 (dead code removal) is zero-risk. Phase 2 (generic removal) is mechanical. Phase 3 (HITL) is the most complex.

### Medium Risk

- **HITL Runtime Behavior**: HumanApprovalNode currently accesses `state.executionId` which is `undefined` at runtime with AgentStateAnnotation. Changing the constraint doesn't fix the runtime issue - that requires callers to use `HitlAgentStateAnnotation`.
- **Mitigation**: Phase 3.4 provides the `HitlAgentStateAnnotation` helper. Documentation must clearly state: "If using HITL, pass `HitlAgentStateAnnotation` (or a custom annotation with HITL fields) as `channels`."

### Low Risk

- **Consumer Test Files**: Test files importing `WorkflowState` as a type constraint may need updates.
- **Mitigation**: `Record<string, unknown>` is a more permissive constraint than `WorkflowState`, so tests should pass with less strict typing.

### Breaking Changes

- `WorkflowStateAnnotation` is removed (was dead code - no actual consumers)
- Re-exports removed from `workflow-engine.interface.ts` (consumers must import from core)
- `WorkflowDefinition<TState>` becomes `WorkflowDefinition` (no generic) - callers passing explicit type args will get compile errors
- `WorkflowNode<TState>` becomes `WorkflowNode` - same
- `executeWorkflow<TState extends WorkflowState>` constraint changes to `Record<string, unknown>` - callers passing `WorkflowState` as explicit type arg will still compile (it extends Record)

---

## Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: backend-developer

**Rationale**:

- Pure TypeScript type system work across NestJS libraries
- No UI components, no browser APIs
- Deep understanding of TypeScript generics and LangGraph required
- NestJS DI and decorator system knowledge helpful

### Complexity Assessment

**Complexity**: HIGH (XL)
**Estimated Effort**: 8-12 hours

**Breakdown**:

- Phase 1 (Dead code + consolidation): 1-2 hours (mechanical deletion)
- Phase 2 (Remove TState generics): 3-4 hours (35+ files, mechanical but careful)
- Phase 3 (HITL redesign): 2-3 hours (structural type design + 12+ file updates)
- Phase 4 (Core cleanup): 1 hour
- Phase 5 (Verification + docs): 1-2 hours

### Critical Verification Points

**After Each Phase, Developer Must Verify**:

1. `npx nx run-many --target=typecheck --projects=@hive-academy/langgraph-workflow-engine,@hive-academy/langgraph-hitl,@hive-academy/langgraph-core` passes
2. No `as any` casts were introduced (the goal is to REMOVE them)
3. `StateGraph` constructor calls use `definition.channels` (an annotation), never TState

**After Phase 2 (Critical)**:

- Verify `MetadataProcessorService` passes `workflowOptions.channels || AgentStateAnnotation` to `definition.channels`
- Verify all strategy files construct `new StateGraph(definition.channels)` (not changed - just confirm)

**After Phase 3 (Critical)**:

- Verify `HumanApprovalNode` uses optional chaining for all state field access
- Verify `HitlAgentStateAnnotation` is exported from hitl package

### Architecture Delivery Checklist

- [x] All components specified with evidence (file:line citations throughout)
- [x] All patterns verified from codebase (LangGraph StateGraph signature confirmed)
- [x] All imports/decorators verified as existing
- [x] Quality requirements defined (no `as any`, typecheck must pass)
- [x] Integration points documented
- [x] Files affected list complete (35+ files)
- [x] Developer type recommended (backend-developer)
- [x] Complexity assessed (HIGH / XL / 8-12 hours)
- [x] No step-by-step implementation (team-leader will decompose into atomic tasks)
