# LangGraph Core Module

## Overview

**@hive-academy/langgraph-core** is a TypeScript library providing foundational interfaces, state annotations, and adapter patterns for building type-safe LangGraph workflows. This is a **type-only library** with minimal runtime exports.

## Installation

```bash
npm install @hive-academy/langgraph-core
```

**Dependencies:**

- `@langchain/langgraph` ^0.4.3
- `@langchain/core` ^0.3.68
- `@nestjs/common` ^11.0.0
- `reflect-metadata` ^0.1.13

## Quick Start

```typescript
import {
  WorkflowState,
  WorkflowDefinition,
  WorkflowStateAnnotation,
  createCustomStateAnnotation,
} from '@hive-academy/langgraph-core';

// Define your workflow state
interface MyWorkflowState extends WorkflowState {
  userInput: string;
  result?: string;
}

// Create custom state annotation
const MyStateAnnotation = createCustomStateAnnotation({
  userInput: {
    default: '',
    reducer: (current: string, update: string) => update || current,
  },
  result: {
    default: undefined,
    reducer: (current: string | undefined, update: string | undefined) => update || current,
  },
});

// Define workflow
const workflow: WorkflowDefinition<MyWorkflowState> = {
  name: 'my-workflow',
  nodes: [
    {
      id: 'process',
      name: 'Process Input',
      handler: async (state) => ({
        result: `Processed: ${state.userInput}`,
        status: 'completed',
      }),
    },
  ],
  edges: [{ from: 'process', to: 'end' }],
  entryPoint: 'process',
};
```

## Core Exports

### Type-Only Exports

```typescript
// Primary workflow interfaces
export type {
  WorkflowState,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionError,
  WorkflowMetadata,
  Command,
  ConditionalRouting,
  HumanFeedback,
} from '@hive-academy/langgraph-core';

// State management interfaces
export type {
  BaseWorkflowState,
  StateManager,
  StateTransformer,
  StateValidator,
  WorkflowError,
  WorkflowTimestamps,
} from '@hive-academy/langgraph-core';

// Configuration interfaces
export type {
  LangGraphModuleOptions,
  LangGraphModuleAsyncOptions,
  WorkflowNodeConfig,
  WorkflowEdgeConfig,
} from '@hive-academy/langgraph-core';
```

### Runtime Exports

```typescript
// State annotations
export { WorkflowStateAnnotation, createCustomStateAnnotation } from '@hive-academy/langgraph-core';

// Utilities
export { isWorkflow, generateNodeId, generateExecutionId } from '@hive-academy/langgraph-core';

// Constants
export { CommandType } from '@hive-academy/langgraph-core';

// Integration adapters (NoOp implementations)
export {
  NoOpCheckpointAdapter,
  NoOpStreamingService,
  ICheckpointAdapter,
  IStreamingService,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';
```

## Key Interfaces

### WorkflowState

The core state interface for all LangGraph workflows:

```typescript
interface WorkflowState {
  // Core identifiers
  executionId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

  // Execution tracking
  currentNode?: string;
  completedNodes: string[];
  confidence: number;
  retryCount: number;

  // Human oversight
  humanFeedback?: HumanFeedback;
  requiresApproval?: boolean;
  approvalReceived?: boolean;

  // Error handling
  error?: WorkflowExecutionError;
  lastError?: WorkflowExecutionError;

  // Timestamps
  timestamps: { started: Date; updated?: Date; completed?: Date };
  startedAt: Date;
  completedAt?: Date;

  // Communication
  messages?: BaseMessage[];

  // Extensible
  metadata?: Record<string, any>;
  [key: string]: any;
}
```

### WorkflowDefinition

Type-safe workflow structure:

```typescript
interface WorkflowDefinition<TState = WorkflowState> {
  name: string;
  description?: string;
  channels?: StateGraphArgs<TState>['channels'];
  nodes: Array<WorkflowNode<TState>>;
  edges: Array<WorkflowEdge<TState>>;
  entryPoint: string;
  config?: WorkflowNodeConfig;
}
```

### Command

Workflow control flow commands:

```typescript
interface Command<TState = WorkflowState> {
  type?: 'goto' | 'update' | 'end' | 'error' | 'retry' | 'skip' | 'stop';
  goto?: string;
  update?: Partial<TState>;
  error?: Error | WorkflowError;
  reason?: string;
  metadata?: Record<string, any>;
}
```

## State Annotations

### Default Annotation

Use the built-in `WorkflowStateAnnotation`:

```typescript
import { WorkflowStateAnnotation } from '@hive-academy/langgraph-core';

// This provides all standard workflow state fields with intelligent reducers
const workflow = {
  channels: WorkflowStateAnnotation,
  // ... rest of workflow
};
```

### Custom Annotations

Create custom state annotations with specific reducers:

```typescript
import { createCustomStateAnnotation } from '@hive-academy/langgraph-core';

const CustomState = createCustomStateAnnotation({
  // Simple field
  userQuery: {
    default: '',
    reducer: (current: string, update: string) => update || current,
  },

  // Array with deduplication
  tags: {
    default: [],
    reducer: (current: string[], update: string[]) => {
      return [...new Set([...current, ...update])];
    },
  },

  // Complex object with deep merge
  context: {
    default: () => ({ settings: {}, history: [] }),
    reducer: (current: any, update: any) => ({
      ...current,
      ...update,
      history: [...(current.history || []), ...(update.history || [])],
      settings: { ...current.settings, ...update.settings },
    }),
  },
});
```

## Integration Adapters

The core module provides abstract interfaces and NoOp implementations for optional integrations:

### Checkpoint Integration

```typescript
import {
  ICheckpointAdapter,
  NoOpCheckpointAdapter,
  createCheckpointIntegration,
} from '@hive-academy/langgraph-core';

// Use NoOp when checkpointing is disabled
const adapter = new NoOpCheckpointAdapter();

// Create integration helper
const integration = createCheckpointIntegration({
  adapter,
  config: {
    enabled: false,
    autoCheckpoint: { enabled: false },
  },
});
```

### Streaming Integration

```typescript
import {
  IStreamingService,
  NoOpStreamingService,
  StreamEventType,
} from '@hive-academy/langgraph-core';

// NoOp implementation when streaming is disabled
const streamingService = new NoOpStreamingService();

// Check if streaming is enabled
const isEnabled = !(streamingService instanceof NoOpStreamingService);
```

### Memory Integration

```typescript
import { IMemoryAdapter, isMemoryAdapter } from '@hive-academy/langgraph-core';

// Validate memory adapter
const adapter = { store: async () => {}, retrieve: async () => [] };
const isValid = isMemoryAdapter(adapter); // true
```

## Utilities

### ID Generation

```typescript
import { generateNodeId, generateExecutionId } from '@hive-academy/langgraph-core';

const executionId = generateExecutionId(); // 'exec_1703123456789_abc123'
const nodeId = generateNodeId('process'); // 'process_1703123456789_def456'
```

### Workflow Validation

```typescript
import { isWorkflow } from '@hive-academy/langgraph-core';

const workflow = {
  /* workflow definition */
};
const valid = isWorkflow(workflow); // boolean
```

## Command Patterns

Use commands for sophisticated control flow:

```typescript
async function smartHandler(state: WorkflowState): Promise<Partial<WorkflowState> | Command> {
  // Navigate to different node
  if (state.confidence < 0.5) {
    return {
      type: 'goto',
      goto: 'human-review',
      reason: 'Low confidence requires review',
    };
  }

  // Update state and continue
  if (state.confidence > 0.8) {
    return {
      type: 'update',
      update: { status: 'validated' },
      reason: 'High confidence validation',
    };
  }

  // End workflow
  return {
    type: 'end',
    reason: 'Processing complete',
  };
}
```

## Integration with Other Modules

This core module is designed to be used with other LangGraph modules:

```typescript
// Use with workflow-engine for execution
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';
import { WorkflowDefinition } from '@hive-academy/langgraph-core';

// Use with streaming for real-time processing
import { TokenStreamingService } from '@hive-academy/langgraph-streaming';
import { IStreamingService } from '@hive-academy/langgraph-core';

// Use with memory for context management
import { MemoryService } from '@hive-academy/langgraph-memory';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';
```

## Best Practices

1. **Always extend WorkflowState** for custom state interfaces
2. **Use createCustomStateAnnotation** for additional fields with proper reducers
3. **Implement proper error handling** in node handlers
4. **Use commands for complex control flow** instead of just state updates
5. **Validate workflows** with `isWorkflow()` utility
6. **Use NoOp adapters** when optional features are disabled

## TypeScript Configuration

Ensure proper TypeScript configuration:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

This core module provides the foundation for building sophisticated, type-safe LangGraph workflows with proper state management and integration patterns.
