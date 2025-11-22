---
trigger: always_on
---

# @hive-academy/langgraph-core

## Overview

Foundational type definitions and interfaces for LangGraph workflows. Provides state interfaces, annotations, and shared constants.

---

## State Interface

All workflow states must extend `WorkflowState`.

```typescript
import { WorkflowState } from '@hive-academy/langgraph-core';

export interface MyWorkflowState extends WorkflowState {
  userId: string;
  messages: BaseMessage[];
  data: any;
}
```

For functional workflows, use `FunctionalWorkflowState`:

```typescript
import { FunctionalWorkflowState } from '@hive-academy/langgraph-core';

export interface MyState extends FunctionalWorkflowState {
  customField: string;
}
```

---

## State Annotations

For complex state reducers, use `createCustomStateAnnotation`:

```typescript
import { createCustomStateAnnotation } from '@hive-academy/langgraph-core';

const MyStateAnnotation = createCustomStateAnnotation({
  messages: {
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  },
  counter: {
    reducer: (existing, incoming) => existing + incoming,
    default: () => 0,
  },
});
```

---

## Best Practices

1. Always extend `WorkflowState` or `FunctionalWorkflowState`
2. Use type-safe interfaces (avoid `any`)
3. Use custom annotations for complex state merging logic
