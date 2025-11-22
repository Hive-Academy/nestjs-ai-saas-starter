# LangGraph Streaming Utilities Guide

## Overview

The `@hive-academy/langgraph-workflow-engine` package provides production-ready utilities for handling LangGraph stream events with comprehensive type safety, defensive parsing, and business logic transformation.

**Problem Solved**: LangGraph's `stream()` API can emit various event structures (empty chunks, system nodes like `__start__`, tool nodes, etc.) that require defensive programming to handle correctly. This library provides battle-tested utilities that follow LangGraph best practices.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   LangGraph Stream                          │
│  (Raw chunks: { nodeName: stateUpdate } | {} | undefined)  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              StreamEventParser                              │
│  ✅ Validates chunk structure                               │
│  ✅ Handles empty/malformed chunks                          │
│  ✅ Type guards (isSystemNode, isToolNode, isEmpty)         │
│  ✅ Returns ParsedStreamEvent or null                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            StreamEventTransformer                           │
│  ✅ Maps to domain-specific events                          │
│  ✅ Routes tool vs workflow events                          │
│  ✅ Adds execution metadata                                 │
│  ✅ Returns WorkflowUpdateEvent | ToolExecutionEvent        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│             Your Business Logic                             │
│  (Controllers, Services, SSE streams, WebSockets, etc.)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Installation

Already included in `@hive-academy/langgraph-workflow-engine`:

```typescript
import { StreamEventParser, StreamEventTransformer } from '@hive-academy/langgraph-workflow-engine';
```

### Basic Usage

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowExecutionService,
  StreamEventParser,
  StreamEventTransformer,
} from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class MyWorkflowService {
  private readonly logger = new Logger(MyWorkflowService.name);

  constructor(private readonly execution: WorkflowExecutionService) {}

  async *streamWorkflow(executionId: string, initialState: any) {
    // 1. Start LangGraph stream
    const stream = this.execution.streamWorkflow(MyWorkflowClass, initialState, {
      configurable: { thread_id: executionId },
      streamMode: 'updates', // IMPORTANT: Use 'updates' mode for node-level events
    });

    // 2. Create parser and transformer
    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    // 3. Parse and transform stream
    for await (const chunk of stream) {
      // Parse chunk with defensive validation
      const parsedEvent = parser.parseChunk(chunk);

      if (!parsedEvent) {
        // Skip invalid/empty chunks
        continue;
      }

      // Skip events that should be filtered (e.g., __start__)
      if (parser.shouldSkipEvent(parsedEvent)) {
        continue;
      }

      // Transform to domain event
      const domainEvent = transformer.transformToDomainEvent(parsedEvent, executionId);

      // Yield to caller
      yield domainEvent;
    }
  }
}
```

---

## API Reference

### StreamEventParser

**Purpose**: Parses and validates LangGraph stream chunks with comprehensive error handling.

#### Methods

##### `parseChunk<TState>(chunk: unknown): ParsedStreamEvent<TState> | null`

Parses a single chunk from LangGraph stream. Returns `null` for invalid/empty chunks.

**Example**:

```typescript
const parser = new StreamEventParser();
const parsedEvent = parser.parseChunk(chunk);

if (parsedEvent) {
  console.log('Node:', parsedEvent.nodeName);
  console.log('State Update:', parsedEvent.stateUpdate);
  console.log('Is Tool Node:', parsedEvent.isToolNode);
}
```

##### `parseStream<TState>(stream: AsyncIterable<unknown>): AsyncGenerator<ParsedStreamEvent<TState>>`

Parses an entire stream, filtering out invalid chunks automatically.

**Example**:

```typescript
const parser = new StreamEventParser();
for await (const parsed of parser.parseStream(langGraphStream)) {
  // Only valid events
  console.log(parsed.nodeName);
}
```

##### `shouldSkipEvent<TState>(event: ParsedStreamEvent<TState>): boolean`

Utility to check if an event should be skipped (empty updates, `__start__` node).

**Example**:

```typescript
if (!parser.shouldSkipEvent(parsedEvent)) {
  // Process event
}
```

#### ParsedStreamEvent Interface

```typescript
interface ParsedStreamEvent<TState extends WorkflowState = WorkflowState> {
  readonly nodeName: string; // e.g., 'myNode', 'tools', '__start__'
  readonly stateUpdate: Partial<TState>; // Partial state from node
  readonly isSystemNode: boolean; // true for '__start__', '__end__'
  readonly isToolNode: boolean; // true for 'tools'
  readonly isEmpty: boolean; // true if stateUpdate has no keys
  readonly rawChunk: LangGraphStreamChunk<TState>; // Original chunk for debugging
}
```

---

### StreamEventTransformer

**Purpose**: Transforms parsed events into domain-specific business events.

#### Methods

##### `transformToDomainEvent<TState>(parsedEvent: ParsedStreamEvent<TState>, executionId: string): DomainStreamEvent<TState>`

Automatically routes to correct event type based on node type.

**Example**:

```typescript
const transformer = new StreamEventTransformer();
const domainEvent = transformer.transformToDomainEvent(parsedEvent, executionId);

if (domainEvent.type === 'tool-execution') {
  console.log('Tool executed:', domainEvent.toolData);
} else {
  console.log('Workflow update:', domainEvent.state);
}
```

##### `transformToWorkflowUpdate<TState>(parsedEvent: ParsedStreamEvent<TState>, executionId: string): WorkflowUpdateEvent<TState>`

Explicitly transforms to workflow update event.

##### `transformToToolExecution<TState>(parsedEvent: ParsedStreamEvent<TState>, executionId: string): ToolExecutionEvent<TState>`

Explicitly transforms to tool execution event.

##### `transformStream<TState>(parsedStream: AsyncIterable<ParsedStreamEvent<TState>>, executionId: string): AsyncGenerator<DomainStreamEvent<TState>>`

Transforms entire stream of parsed events.

**Example**:

```typescript
const transformer = new StreamEventTransformer();
const parsedStream = parser.parseStream(langGraphStream);
const domainStream = transformer.transformStream(parsedStream, executionId);

for await (const event of domainStream) {
  // Handle domain events
}
```

#### DomainStreamEvent Types

```typescript
type DomainStreamEvent<TState> = WorkflowUpdateEvent<TState> | ToolExecutionEvent<TState>;

interface WorkflowUpdateEvent<TState> {
  readonly type: 'workflow-update';
  readonly executionId: string;
  readonly nodeName: string;
  readonly state: Partial<TState>;
  readonly timestamp: string;
  readonly metadata?: {
    isSystemNode: boolean;
    isToolNode: boolean;
    isEmpty: boolean;
  };
}

interface ToolExecutionEvent<TState> {
  readonly type: 'tool-execution';
  readonly executionId: string;
  readonly toolData: Partial<TState>;
  readonly timestamp: string;
}
```

---

## Type Guards

### Exported Type Guards

```typescript
import {
  isSystemNode,
  isToolNode,
  isValidChunk,
  isEmptyChunk,
} from '@hive-academy/langgraph-workflow-engine';

// Check if node is __start__ or __end__
if (isSystemNode('__start__')) {
  // Handle system node
}

// Check if node is 'tools'
if (isToolNode('tools')) {
  // Handle tool execution
}

// Validate chunk structure
if (isValidChunk(chunk)) {
  // Safe to process
}

// Check if chunk is empty
if (isEmptyChunk(chunk)) {
  // Skip processing
}
```

---

## Real-World Example: Research Agent SSE Stream

See `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`:

```typescript
@Injectable()
export class ResearcherAgent {
  constructor(private readonly workflowExecutionService: WorkflowExecutionService) {}

  async *executeWithStreaming(input: { userId: string; query: string; executionId?: string }) {
    const executionId = input.executionId || `research-${Date.now()}`;

    // Start LangGraph stream
    const stream = this.workflowExecutionService.streamWorkflow(ResearcherAgent, initialState, {
      configurable: { thread_id: executionId },
      streamMode: 'updates',
    });

    // Parse and transform
    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    for await (const chunk of stream) {
      const parsedEvent = parser.parseChunk(chunk);
      if (!parsedEvent || parser.shouldSkipEvent(parsedEvent)) {
        continue;
      }

      const domainEvent = transformer.transformToDomainEvent(parsedEvent, executionId);
      yield domainEvent;
    }
  }
}
```

---

## Best Practices

### 1. Always Use `streamMode: 'updates'`

```typescript
// ✅ CORRECT: 'updates' mode shows node-level events
streamMode: 'updates';

// ❌ WRONG: 'values' mode only shows full state after super-steps
streamMode: 'values';
```

### 2. Use Defensive Parsing

```typescript
// ✅ CORRECT: Parser handles all edge cases
const parsedEvent = parser.parseChunk(chunk);
if (parsedEvent && !parser.shouldSkipEvent(parsedEvent)) {
  // Process
}

// ❌ WRONG: Direct access without validation
const nodeName = Object.keys(chunk)[0]; // Can fail!
const data = chunk[nodeName].metadata; // Can throw!
```

### 3. Filter System Events

```typescript
// ✅ CORRECT: Skip __start__ and empty events
if (parser.shouldSkipEvent(parsedEvent)) {
  continue;
}

// ❌ WRONG: Process all events (clutters stream)
yield domainEvent; // Will include __start__, empty updates, etc.
```

### 4. Separate Tool Events

```typescript
// ✅ CORRECT: Use type discriminator
if (domainEvent.type === 'tool-execution') {
  // Handle tool execution
} else {
  // Handle workflow update
}

// ❌ WRONG: Check node name (fragile)
if (domainEvent.nodeName === 'tools') {
  // What if tools node renamed?
}
```

---

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'metadata')"

**Cause**: Trying to access properties on undefined chunk or nodeData.

**Solution**: Use `StreamEventParser` which handles this defensively:

```typescript
const parsedEvent = parser.parseChunk(chunk);
if (!parsedEvent) {
  continue; // Skip invalid chunk
}
```

### Empty Stream (No Events Emitted)

**Cause**: Using `shouldSkipEvent()` too aggressively or wrong stream mode.

**Solution**:

1. Ensure `streamMode: 'updates'` (not 'values')
2. Check if all events are being filtered:

```typescript
const parsedEvent = parser.parseChunk(chunk);
if (!parsedEvent) {
  this.logger.debug('Skipped invalid chunk');
  continue;
}
if (parser.shouldSkipEvent(parsedEvent)) {
  this.logger.debug(`Skipped event: ${parsedEvent.nodeName}`);
  continue;
}
// If no logs, problem is elsewhere
```

### Type Errors with State

**Cause**: Generic type mismatch.

**Solution**: Specify your state type:

```typescript
interface MyState extends WorkflowState {
  metadata: {
    customField: string;
  };
}

const parsedEvent = parser.parseChunk<MyState>(chunk);
// parsedEvent.stateUpdate is now Partial<MyState>
```

---

## Multi-Agent Subgraph Streaming

### Overview

When using multi-agent supervisor patterns (e.g., `@MultiAgent({ topology: 'supervisor' })`), LangGraph supports **automatic subgraph streaming** to emit events from worker agents.

**Key Benefit**: Get real-time streaming from ALL agents (supervisor + workers) without manual setup.

### Enabling Subgraph Streaming

**Step 1: Enable in Supervisor Workflow**

```typescript
const stream = this.workflowExecution.streamWorkflow(DevBrandSupervisorWorkflow, initialState, {
  configurable: { thread_id: executionId },
  streamMode: 'updates',
  subgraphs: true, // ✅ Enable worker agent event streaming
});
```

**Step 2: Parse Subgraph Events**

The streaming utilities automatically handle both parent and subgraph events:

```typescript
const parser = new StreamEventParser();
const transformer = new StreamEventTransformer();

for await (const chunk of stream) {
  const parsedEvent = parser.parseChunk(chunk);

  if (!parsedEvent) continue;

  // Check if event is from worker agent
  if (parsedEvent.isSubgraphEvent) {
    console.log(`Worker agent: ${parsedEvent.subgraphId}`);
    console.log(`Node: ${parsedEvent.nodeName}`);
    console.log(`Namespace: ${parsedEvent.namespacePath.join(' > ')}`);
  }

  const domainEvent = transformer.transformToDomainEvent(parsedEvent, executionId);
  yield domainEvent;
}
```

### Event Structure

**Parent Graph Events** (supervisor):

```typescript
// Chunk format: [[], 'updates', { nodeName: stateUpdate }]
{
  nodeName: 'supervisor',
  stateUpdate: { ... },
  isSubgraphEvent: false,
  subgraphId: undefined,
  namespacePath: [] // Empty = parent graph
}
```

**Subgraph Events** (worker agents):

```typescript
// Chunk format: [['github-analyzer:uuid'], 'updates', { nodeName: stateUpdate }]
{
  nodeName: 'analyzeRepositories',
  stateUpdate: { ... },
  isSubgraphEvent: true,
  subgraphId: 'github-analyzer', // Worker agent identifier
  namespacePath: ['github-analyzer:e58e5673-a661-ebb0-70d4-e298a7fc28b7']
}
```

**Nested Subgraph Events** (hierarchical multi-agent):

```typescript
// Chunk format: [['supervisor:uuid', 'worker:uuid'], 'updates', { nodeName: stateUpdate }]
{
  nodeName: 'processData',
  stateUpdate: { ... },
  isSubgraphEvent: true,
  subgraphId: 'supervisor', // Top-level subgraph
  namespacePath: ['supervisor:uuid', 'worker:uuid'] // Nested path
}
```

### Complete Example

**Supervisor Workflow** (apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts):

```typescript
async *executeWithStreaming(input: DevBrandWorkflowInput) {
  const executionId = input.executionId || `devbrand-${Date.now()}`;

  // Build initial state...
  const initialState = { ... };

  // Stream with subgraph support
  const stream = this.workflowExecution.streamWorkflow(
    DevBrandSupervisorWorkflow,
    initialState,
    {
      configurable: { thread_id: executionId },
      streamMode: 'updates',
      subgraphs: true, // ✅ Enable worker streaming
    }
  );

  // Parse and transform stream
  const parser = new StreamEventParser();
  const transformer = new StreamEventTransformer();

  for await (const chunk of stream) {
    const parsedEvent = parser.parseChunk(chunk);
    if (!parsedEvent || parser.shouldSkipEvent(parsedEvent)) {
      continue;
    }

    const domainEvent = transformer.transformToDomainEvent(parsedEvent, executionId);

    // Domain event includes subgraph metadata
    // domainEvent.metadata.isSubgraphEvent = true/false
    // domainEvent.metadata.subgraphId = 'github-analyzer' | undefined
    // domainEvent.metadata.namespacePath = ['github-analyzer:uuid']

    yield domainEvent;
  }
}
```

### Best Practices

**1. Always Use `subgraphs: true` for Multi-Agent Workflows**

```typescript
// ✅ CORRECT: Full visibility into worker agents
streamMode: 'updates',
subgraphs: true

// ❌ WRONG: Only supervisor events, no worker visibility
streamMode: 'updates'
```

**2. Filter Events by Subgraph ID**

```typescript
for await (const event of stream) {
  const parsed = parser.parseChunk(event);

  if (parsed?.subgraphId === 'github-analyzer') {
    // Handle GitHub analyzer events
  } else if (parsed?.subgraphId === 'content-creator') {
    // Handle content creator events
  } else if (!parsed?.isSubgraphEvent) {
    // Handle supervisor events
  }
}
```

**3. Use Namespace Path for Nested Hierarchies**

```typescript
// Nested multi-agent: [['level1:uuid', 'level2:uuid'], 'updates', chunk]
const depth = parsed.namespacePath.length;
const topLevelAgent = extractSubgraphId(parsed.namespacePath); // 'level1'
```

### Troubleshooting

**Error: "No worker agent events in stream"**

**Cause**: `subgraphs: true` not set or worker agents not configured

**Solution**:

1. Verify `subgraphs: true` in stream config
2. Check `@MultiAgent({ agents: [Worker1, Worker2, Worker3] })` has workers registered
3. Ensure worker agents are properly decorated with `@Agent`

**Error: "Cannot extract subgraph ID from namespace"**

**Cause**: Namespace path format changed or empty

**Solution**:

- Namespace path format: `['agent-id:uuid']`
- If empty `[]`, it's a parent graph event (not an error)
- Use `extractSubgraphId(namespacePath)` utility function

---

## LangGraph Stream Modes Comparison

| Mode          | Output Structure                 | Use Case                           | Our Utilities Support |
| ------------- | -------------------------------- | ---------------------------------- | --------------------- |
| **updates**   | `{ nodeName: stateUpdate }`      | Node-level events (RECOMMENDED)    | ✅ Full Support       |
| **values**    | Full state after each super-step | Full state snapshots               | ✅ Full Support       |
| **messages**  | `[message, metadata]` tuples     | LLM token streaming                | ✅ Full Support       |
| **custom**    | User-defined custom data         | Custom event streaming             | ✅ Full Support       |
| **debug**     | Detailed execution traces        | Debugging                          | ✅ Full Support       |
| **subgraphs** | `[namespace[], mode, chunk]`     | Multi-agent worker event streaming | ✅ Full Support       |
| **Multiple**  | `[mode, data]` tuples            | Combined streaming modes           | ✅ Full Support       |

---

## Messages Mode (LLM Token Streaming)

### Overview

Messages mode (`streamMode: 'messages'`) provides **token-level streaming** from LLM nodes, enabling real-time chat UI updates as the LLM generates responses.

**Output Format**: `[messageChunk, metadata]` tuples

### When to Use

- ✅ Building chat interfaces that need real-time token streaming
- ✅ Showing LLM "thinking" progress to users
- ✅ Streaming assistant responses character-by-character
- ✅ Monitoring LLM token usage and metadata in real-time

### Example: Chat UI with Token Streaming

```typescript
@Injectable()
export class ChatService {
  constructor(private readonly execution: WorkflowExecutionService) {}

  async *streamChatResponse(userId: string, query: string) {
    const executionId = `chat-${Date.now()}`;

    // Enable messages mode for token streaming
    const stream = this.execution.streamWorkflow(
      ChatWorkflow,
      { messages: [{ role: 'user', content: query }] },
      {
        configurable: { thread_id: executionId },
        streamMode: 'messages', // ✅ Token-level streaming
      }
    );

    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    for await (const chunk of stream) {
      const parsedEvent = parser.parseChunk(chunk);
      if (!parsedEvent) continue;

      const domainEvent = transformer.transformToDomainEvent(parsedEvent, executionId);

      // Check for message stream events
      if (domainEvent.type === 'message-stream') {
        // Stream individual tokens to client
        yield {
          type: 'token',
          content: domainEvent.content, // Individual token or chunk
          nodeName: domainEvent.nodeName,
          metadata: {
            step: domainEvent.step,
            hasToolCalls: domainEvent.messageChunk.tool_calls?.length > 0,
          },
        };
      }
    }
  }
}
```

### MessageStreamEvent Interface

```typescript
interface MessageStreamEvent {
  readonly type: 'message-stream';
  readonly executionId: string;
  readonly nodeName: string;
  readonly step: number;
  readonly messageChunk: AIMessageChunk; // LangChain message chunk
  readonly content: string; // Extracted content (string or stringified)
  readonly timestamp: string;
  readonly metadata: MessagesStreamMetadata; // LangGraph metadata
}

interface AIMessageChunk {
  readonly content: string | unknown[]; // Token(s)
  readonly additional_kwargs?: Record<string, unknown>;
  readonly response_metadata?: Record<string, unknown>; // Token counts, model info
  readonly tool_calls?: unknown[]; // Function calls
  readonly id?: string;
}
```

### Best Practices

**1. Combine with Updates Mode for Full Visibility**

```typescript
// Stream both tokens AND node updates
streamMode: ['messages', 'updates'];
// Output: [mode, data] tuples
// - ['messages', [messageChunk, metadata]] for LLM tokens
// - ['updates', { nodeName: stateUpdate }] for node execution
```

**2. Handle Tool Calls in Message Chunks**

```typescript
if (domainEvent.type === 'message-stream') {
  if (domainEvent.messageChunk.tool_calls?.length > 0) {
    // LLM is generating tool calls
    yield {
      type: 'tool-call-generation',
      toolCalls: domainEvent.messageChunk.tool_calls,
    };
  }
}
```

**3. Accumulate Chunks for Complete Response**

```typescript
let accumulatedContent = '';

for await (const event of stream) {
  if (event.type === 'message-stream') {
    accumulatedContent += event.content;
    // Send incremental update to client
  }
}

// Final complete response
console.log('Complete response:', accumulatedContent);
```

---

## Custom Mode (User-Defined Progress/Metrics)

### Overview

Custom mode (`streamMode: 'custom'`) allows you to emit **custom progress updates, metrics, or any user-defined data** from your workflow nodes.

**Output Format**: Any data you emit from nodes

### When to Use

- ✅ Tracking workflow progress percentages
- ✅ Emitting real-time metrics (e.g., processing speed, item counts)
- ✅ Sending intermediate results to UI
- ✅ Progress indicators for long-running tasks

### Example: Progress Tracking Workflow

```typescript
@Agent({
  description: 'Data processing workflow with progress tracking',
  workflow: {
    type: 'functional-task',
  },
})
@Injectable()
export class DataProcessingWorkflow {
  @Entrypoint()
  async loadData(context: TaskExecutionContext) {
    // Emit custom progress event
    return {
      state: {
        ...context.state,
        customProgress: {
          stage: 'loading',
          percentage: 10,
          itemsProcessed: 0,
          totalItems: 1000,
        },
      },
    };
  }

  @Task({ dependsOn: ['loadData'] })
  async processData(context: TaskExecutionContext) {
    for (let i = 0; i < 1000; i++) {
      // Process item...

      // Emit progress every 100 items
      if (i % 100 === 0) {
        return {
          state: {
            ...context.state,
            customProgress: {
              stage: 'processing',
              percentage: Math.floor((i / 1000) * 100),
              itemsProcessed: i,
              totalItems: 1000,
            },
          },
        };
      }
    }

    return { state: context.state };
  }
}
```

**Stream Custom Events**:

```typescript
const stream = this.execution.streamWorkflow(DataProcessingWorkflow, initialState, {
  streamMode: 'custom', // ✅ Emit custom data
});

const parser = new StreamEventParser();
const transformer = new StreamEventTransformer();

for await (const chunk of stream) {
  const parsed = parser.parseChunk(chunk);
  if (!parsed) continue;

  const domainEvent = transformer.transformToDomainEvent(parsed, executionId);

  if (domainEvent.type === 'custom-stream') {
    // domainEvent.data contains your custom progress object
    const progress = domainEvent.data as any;
    console.log(
      `Progress: ${progress.percentage}% (${progress.itemsProcessed}/${progress.totalItems})`
    );
  }
}
```

### CustomStreamEvent Interface

```typescript
interface CustomStreamEvent {
  readonly type: 'custom-stream';
  readonly executionId: string;
  readonly data: unknown; // Your custom data (any structure)
  readonly timestamp: string;
}
```

### Best Practices

**1. Use Type Guards for Custom Data**

```typescript
interface CustomProgressData {
  stage: string;
  percentage: number;
  itemsProcessed: number;
  totalItems: number;
}

function isCustomProgress(data: unknown): data is CustomProgressData {
  return data !== null && typeof data === 'object' && 'stage' in data && 'percentage' in data;
}

// Usage
if (domainEvent.type === 'custom-stream' && isCustomProgress(domainEvent.data)) {
  // Type-safe access
  console.log(`Stage: ${domainEvent.data.stage}, Progress: ${domainEvent.data.percentage}%`);
}
```

**2. Combine with Updates Mode**

```typescript
streamMode: ['updates', 'custom'];
// Get both node updates AND custom progress
```

---

## Debug Mode (Execution Traces)

### Overview

Debug mode (`streamMode: 'debug'`) provides **detailed execution traces** including task start/end, inputs/outputs, and errors for troubleshooting.

**Output Format**: `{ type, timestamp, step, payload }` objects

### When to Use

- ✅ Debugging workflow execution issues
- ✅ Monitoring task inputs/outputs in production
- ✅ Performance profiling (task durations)
- ✅ Error tracking and diagnostics

### Example: Workflow Debugging

```typescript
@Injectable()
export class WorkflowDebugger {
  constructor(private readonly execution: WorkflowExecutionService) {}

  async *debugWorkflow(workflowClass: any, input: any) {
    const executionId = `debug-${Date.now()}`;

    const stream = this.execution.streamWorkflow(workflowClass, input, {
      configurable: { thread_id: executionId },
      streamMode: 'debug', // ✅ Detailed execution traces
    });

    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    for await (const chunk of stream) {
      const parsed = parser.parseChunk(chunk);
      if (!parsed) continue;

      const domainEvent = transformer.transformToDomainEvent(parsed, executionId);

      if (domainEvent.type === 'debug-stream') {
        switch (domainEvent.eventType) {
          case 'task':
            console.log(`[TASK START] ${domainEvent.taskName}`, {
              input: domainEvent.payload.input,
              timestamp: domainEvent.timestamp,
            });
            break;

          case 'task_result':
            console.log(`[TASK END] ${domainEvent.taskName}`, {
              output: domainEvent.payload.output,
              duration: /* calculate from timestamps */,
            });
            break;

          case 'checkpoint':
            console.log(`[CHECKPOINT] Step ${domainEvent.step}`, domainEvent.payload);
            break;
        }

        yield domainEvent;
      }
    }
  }
}
```

### DebugStreamEvent Interface

```typescript
interface DebugStreamEvent {
  readonly type: 'debug-stream';
  readonly executionId: string;
  readonly eventType: 'task' | 'task_result' | 'checkpoint';
  readonly timestamp: string;
  readonly step: number;
  readonly taskId: string;
  readonly taskName: string;
  readonly payload: {
    readonly id: string;
    readonly name: string;
    readonly input?: unknown; // Task input
    readonly output?: unknown; // Task output
    readonly error?: unknown; // Error if task failed
    readonly [key: string]: unknown;
  };
}
```

### Best Practices

**1. Production Monitoring with Debug Mode**

```typescript
// Collect debug traces for production monitoring
const debugTraces: DebugStreamEvent[] = [];

for await (const event of debugStream) {
  if (event.type === 'debug-stream') {
    debugTraces.push(event);

    // Alert on errors
    if (event.payload.error) {
      this.alertService.sendAlert({
        severity: 'error',
        message: `Task ${event.taskName} failed`,
        error: event.payload.error,
      });
    }
  }
}

// Store traces for analysis
await this.db.saveDebugTraces(executionId, debugTraces);
```

**2. Performance Profiling**

```typescript
const taskDurations = new Map<string, number>();

for await (const event of debugStream) {
  if (event.type === 'debug-stream') {
    if (event.eventType === 'task') {
      taskDurations.set(event.taskId, Date.parse(event.timestamp));
    } else if (event.eventType === 'task_result') {
      const startTime = taskDurations.get(event.taskId);
      if (startTime) {
        const duration = Date.parse(event.timestamp) - startTime;
        console.log(`Task ${event.taskName} took ${duration}ms`);
      }
    }
  }
}
```

---

## Multiple Modes (Combined Streaming)

### Overview

You can combine **multiple stream modes** by passing an array to `streamMode`. LangGraph will emit tuples in the format `[mode, data]`.

**Output Format**: `[mode, data]` tuples

### When to Use

- ✅ Need both token streaming AND workflow updates
- ✅ Want progress tracking alongside execution traces
- ✅ Building comprehensive monitoring dashboards
- ✅ Debugging while maintaining real-time UI updates

### Example: Combined Chat + Updates

```typescript
@Injectable()
export class ChatWithProgressService {
  constructor(private readonly execution: WorkflowExecutionService) {}

  async *streamChatWithProgress(query: string) {
    const executionId = `chat-progress-${Date.now()}`;

    // Combine messages (tokens) and updates (node execution)
    const stream = this.execution.streamWorkflow(
      ChatWorkflow,
      { messages: [{ role: 'user', content: query }] },
      {
        configurable: { thread_id: executionId },
        streamMode: ['messages', 'updates'], // ✅ Array of modes
      }
    );

    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    for await (const chunk of stream) {
      const parsed = parser.parseChunk(chunk);
      if (!parsed) continue;

      const domainEvent = transformer.transformToDomainEvent(parsed, executionId);

      // Handle different event types
      if (domainEvent.type === 'message-stream') {
        // Real-time LLM tokens
        yield {
          channel: 'llm-tokens',
          content: domainEvent.content,
        };
      } else if (domainEvent.type === 'workflow-update') {
        // Node execution updates
        yield {
          channel: 'workflow-progress',
          nodeName: domainEvent.nodeName,
          state: domainEvent.state,
        };
      }
    }
  }
}
```

### Supported Combinations

```typescript
// Chat UI with workflow progress
streamMode: ['messages', 'updates'];

// Debugging with custom metrics
streamMode: ['debug', 'custom'];

// Full monitoring (all modes)
streamMode: ['messages', 'updates', 'custom', 'debug'];

// State snapshots with custom progress
streamMode: ['values', 'custom'];
```

### Best Practices

**1. Use Mode Discriminators**

```typescript
for await (const chunk of stream) {
  const parsed = parser.parseChunk(chunk);
  if (!parsed) continue;

  const domainEvent = transformer.transformToDomainEvent(parsed, executionId);

  // TypeScript discriminated unions work perfectly
  switch (domainEvent.type) {
    case 'message-stream':
      handleTokens(domainEvent);
      break;

    case 'workflow-update':
      handleWorkflowUpdate(domainEvent);
      break;

    case 'custom-stream':
      handleCustomData(domainEvent);
      break;

    case 'debug-stream':
      handleDebugTrace(domainEvent);
      break;

    case 'tool-execution':
      handleToolExecution(domainEvent);
      break;
  }
}
```

**2. Separate Channels for Different Event Types**

```typescript
// WebSocket example
for await (const event of stream) {
  if (event.type === 'message-stream') {
    socket.emit('llm:token', { content: event.content });
  } else if (event.type === 'workflow-update') {
    socket.emit('workflow:progress', { node: event.nodeName });
  } else if (event.type === 'custom-stream') {
    socket.emit('custom:metrics', event.data);
  }
}
```

---

## Further Reading

- [LangGraph Streaming Documentation](https://docs.langchain.com/oss/javascript/langgraph/streaming)
- [Workflow Engine CLAUDE.md](./CLAUDE.md) - Complete workflow-engine documentation
- [ResearcherAgent Example](../../../apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts) - Real-world implementation

---

## Summary

The LangGraph Streaming Utilities provide:

✅ **Type-Safe** - Full TypeScript support with generic state types
✅ **Defensive** - Handles empty, malformed, and edge-case chunks
✅ **Production-Ready** - Comprehensive logging and error handling
✅ **Best Practices** - Follows official LangGraph documentation patterns
✅ **Extensible** - Easy to add custom event types and transformations
✅ **Zero Config** - Works out-of-the-box with sensible defaults

**Use these utilities instead of manual chunk parsing to avoid common pitfalls and follow LangGraph best practices.**
