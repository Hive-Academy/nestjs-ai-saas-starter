# @hive-academy/langgraph-core

## Overview

Foundational type definitions, interfaces, and shared constants for LangGraph workflows. This is a **type-only library** that provides the building blocks for workflow state management and annotations.

**Purpose:**

- Define workflow state interfaces
- Provide state annotation utilities (AgentStateAnnotation)
- Shared constants and metadata keys
- Integration adapters

---

## State Annotations (Primary Approach)

State in LangGraph is defined through **annotations** which specify reducers and defaults for each field. This library provides `AgentStateAnnotation` as the canonical annotation.

### AgentStateAnnotation (Recommended)

The primary annotation for all LangGraph workflows. This is what `StateGraph` actually receives at runtime.

```typescript
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

// Use directly as the channels parameter in @FunctionalWorkflow
@FunctionalWorkflow({
  name: 'my-workflow',
  channels: AgentStateAnnotation,
})
```

**Built-in Fields**: `messages`, `next`, `current`, `scratchpad`, `task`, `threadId`, `userId`, `metadata`

### Custom Annotations

Extend `AgentStateAnnotation` with custom fields using `Annotation.Root` from `@langchain/langgraph`:

```typescript
import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

const MyAnnotation = Annotation.Root({
  ...AgentStateAnnotation.spec,

  // Messages accumulate (append)
  customMessages: Annotation<string[]>({
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  }),

  // Counter adds up
  counter: Annotation<number>({
    reducer: (existing, incoming) => existing + incoming,
    default: () => 0,
  }),

  // Latest value wins
  status: Annotation<string>({
    reducer: (existing, incoming) => incoming,
    default: () => 'pending',
  }),
});

// Derive TypeScript type from annotation
type MyState = typeof MyAnnotation.State;
```

You can also use `createCustomAgentStateAnnotation` for a convenience wrapper:

```typescript
import { createCustomAgentStateAnnotation } from '@hive-academy/langgraph-core';

const MyAnnotation = createCustomAgentStateAnnotation({
  customField: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => '',
  }),
});
```

**Reducer Strategies:**

- **Append**: `[...existing, ...incoming]` (for arrays)
- **Add**: `existing + incoming` (for numbers)
- **Replace**: `incoming` (for simple values)
- **Merge**: `{ ...existing, ...incoming }` (for objects)

---

## State Interfaces (Legacy)

### WorkflowState (Deprecated)

`WorkflowState` is a plain TypeScript interface that was historically used as a generic constraint (e.g. `TState extends WorkflowState`). However, **`StateGraph` does not accept plain interfaces** -- it requires annotations (`AnnotationRoot`, `StateSchema`, or `ZodObject`).

**Do not use `WorkflowState` as a generic constraint for `StateGraph` or handler signatures.** It remains exported for backward compatibility but should not be used in new code.

```typescript
// DEPRECATED - do not use in new code
import { WorkflowState } from '@hive-academy/langgraph-core';

// CORRECT - use annotations instead
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';
type AgentState = typeof AgentStateAnnotation.State;
```

### FunctionalWorkflowState

Specialized state for functional workflows (task/node-based). Still available for casting `context.state` in task handlers but prefer annotation-derived types.

---

## Metadata Keys

Constants for metadata storage:

```typescript
import {
  WORKFLOW_METADATA_KEY,
  WORKFLOW_NODES_KEY,
  WORKFLOW_EDGES_KEY,
  WORKFLOW_TOOLS_KEY,
} from '@hive-academy/langgraph-core';

// Used internally by decorators
Reflect.defineMetadata(WORKFLOW_METADATA_KEY, config, target);
```

---

## Best Practices

### 1. Use Annotations for State Definition

```typescript
// CORRECT: Extend AgentStateAnnotation with custom fields
import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

const MyAnnotation = Annotation.Root({
  ...AgentStateAnnotation.spec,
  customField: Annotation<string>({
    reducer: (c, u) => u ?? c,
    default: () => '',
  }),
});

// WRONG: Extending WorkflowState interface (does not work with StateGraph)
interface MyState extends WorkflowState {
  customField: string;
}
```

### 2. Use Type-Safe State via Annotation Types

```typescript
// CORRECT: Derive type from annotation
type MyState = typeof MyAnnotation.State;

@Task()
async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const state = context.state as MyState;
  // TypeScript knows all fields
  return { state: { ...state, processed: true } };
}

// WRONG
@Task()
async process(context: TaskExecutionContext) {
  const state: any = context.state;
  // Lost type safety
}
```

### 3. Define Reducers for Complex Merging

```typescript
// CORRECT: Custom reducer for message accumulation
const annotation = Annotation.Root({
  ...AgentStateAnnotation.spec,
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  }),
});

// WRONG: Plain interface (no reducer, messages get replaced)
interface State {
  messages: BaseMessage[];
}
```

---

## Reference

### Key Exports

```typescript
import {
  // Interfaces (legacy - prefer annotation-derived types)
  WorkflowState, // DEPRECATED - do not use as StateGraph generic constraint
  FunctionalWorkflowState,
  WorkflowDefinition,
  Command,
  HumanFeedback,
  WorkflowError,

  // Annotations (primary state definition approach)
  AgentStateAnnotation,
  createCustomAgentStateAnnotation,

  // Constants
  WORKFLOW_METADATA_KEY,
  WORKFLOW_NODES_KEY,
  WORKFLOW_EDGES_KEY,
  WORKFLOW_TOOLS_KEY,

  // Utils
  isWorkflow,
  generateId,
  NodeHandler,
  CommandType,
} from '@hive-academy/langgraph-core';
```

### Removed Exports

The following were removed as dead code and are no longer available:

- `WorkflowStateAnnotation` -- never used at runtime; use `AgentStateAnnotation` instead
- `createCustomStateAnnotation` -- use `createCustomAgentStateAnnotation` or `Annotation.Root` directly
