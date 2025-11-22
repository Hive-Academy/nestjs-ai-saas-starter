# @hive-academy/langgraph-core

## Overview

Foundational type definitions, interfaces, and shared constants for LangGraph workflows. This is a **type-only library** that provides the building blocks for workflow state management and annotations.

**Purpose:**

- Define workflow state interfaces
- Provide state annotation utilities
- Shared constants and metadata keys
- Integration adapters

---

## State Interfaces

### WorkflowState

Base interface for all LangGraph workflows.

```typescript
import { WorkflowState } from '@hive-academy/langgraph-core';

export interface MyWorkflowState extends WorkflowState {
  userId: string;
  messages: BaseMessage[];
  data: any;
  processed: boolean;
}
```

### FunctionalWorkflowState

Specialized state for functional workflows (task/node-based).

```typescript
import { FunctionalWorkflowState } from '@hive-academy/langgraph-core';

export interface ChatWorkflowState extends FunctionalWorkflowState {
  userId: string;
  conversationId: string;
  userMessage: string;
  intent: 'analyze-github' | 'create-content' | 'strategy-advice';
  response: string;
}
```

**When to Use:**

- `WorkflowState`: Generic workflows, multi-agent patterns
- `FunctionalWorkflowState`: Functional API workflows (task/node-based)

---

## State Annotations

### Built-in Annotations

```typescript
import { WorkflowStateAnnotation } from '@hive-academy/langgraph-core';

// Use the default annotation for simple state merging
const channels = WorkflowStateAnnotation;
```

### Custom State Annotations

For complex state reducers:

```typescript
import { createCustomStateAnnotation } from '@hive-academy/langgraph-core';

const MyStateAnnotation = createCustomStateAnnotation({
  // Messages accumulate (append)
  messages: {
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  },

  // Counter adds up
  counter: {
    reducer: (existing, incoming) => existing + incoming,
    default: () => 0,
  },

  // Latest value wins
  status: {
    reducer: (existing, incoming) => incoming,
    default: () => 'pending',
  },
});
```

**Reducer Strategies:**

- **Append**: `[...existing, ...incoming]` (for arrays)
- **Add**: `existing + incoming` (for numbers)
- **Replace**: `incoming` (for simple values)
- **Merge**: `{ ...existing, ...incoming }` (for objects)

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

### 1. Always Extend Base Interfaces

```typescript
// ✅ CORRECT
interface MyState extends FunctionalWorkflowState {
  customField: string;
}

// ❌ WRONG
interface MyState {
  customField: string;
}
```

### 2. Use Type-Safe State

```typescript
// ✅ CORRECT
@Task()
async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const state = context.state as MyWorkflowState;
  // TypeScript knows all fields
  return { state: { ...state, processed: true } };
}

// ❌ WRONG
@Task()
async process(context: TaskExecutionContext) {
  const state: any = context.state;
  // Lost type safety
}
```

### 3. Define Reducers for Complex Merging

```typescript
// ✅ CORRECT: Custom reducer for message accumulation
const annotation = createCustomStateAnnotation({
  messages: {
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  },
});

// ❌ WRONG: Simple merge (messages get replaced, not accumulated)
interface State {
  messages: BaseMessage[];
}
```

---

## Reference

### Key Exports

```typescript
import {
  // Interfaces
  WorkflowState,
  FunctionalWorkflowState,
  WorkflowDefinition,
  Command,

  // Annotations
  WorkflowStateAnnotation,
  createCustomStateAnnotation,

  // Constants
  WORKFLOW_METADATA_KEY,
  WORKFLOW_NODES_KEY,
  WORKFLOW_EDGES_KEY,
  WORKFLOW_TOOLS_KEY,
} from '@hive-academy/langgraph-core';
```
