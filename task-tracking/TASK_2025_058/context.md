# TASK_2025_058 - Context

## User Intent

Refactor the workflow-engine type system to align with LangGraph's native annotation-based state management. The current architecture has three competing state definitions (WorkflowState interface, AgentStateAnnotation, WorkflowStateAnnotation) that don't agree, causing type system lies, `as any` casts, and runtime undefined fields.

## Discovery (Pre-Task Investigation)

Through investigating typecheck errors in `workflow-execution.service.ts`, we discovered:

1. **`WorkflowState` (plain TS interface)** - Used as `TState` generic constraint everywhere but never matches runtime state. Has ~20 fields (executionId, status, confidence, completedNodes, etc.)
2. **`AgentStateAnnotation` (AnnotationRoot)** - Hardcoded in metadata processor as the actual LangGraph annotation. Has 8 completely different fields (messages, next, current, scratchpad, task, etc.)
3. **`WorkflowStateAnnotation` (AnnotationRoot)** - Defined but NEVER USED anywhere (dead code)

The root cause: `StateGraph<TState>` is invalid because LangGraph's `SD` parameter must be a `StateDefinitionInit` (AnnotationRoot, Zod schema), not a plain interface. The code lies about the type to LangGraph, then casts everything with `as any` to paper over the mismatch.

At runtime, node handlers typed as `(state: TState extends WorkflowState)` receive `AgentState` — fields like `executionId`, `confidence`, `completedNodes` are silently undefined.

## Task Type

REFACTORING

## Strategy

Architect -> Team-Leader -> QA

## Complexity

Complex (XL) - Touches core type system across multiple libraries

## Key Files

- `libs/langgraph-modules/workflow-engine/src/lib/interfaces/workflow-engine.interface.ts`
- `libs/langgraph-modules/core/src/lib/annotations/agent-state.annotation.ts`
- `libs/langgraph-modules/core/src/lib/annotations/workflow-state.annotation.ts` (dead code)
- `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/strategies/`
- `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`
- `libs/langgraph-modules/hitl/src/lib/nodes/human-approval.node.ts`

## Branch

ak/implement-work-os-authentication (current)
