# Tool Calls Web Research - LangChain/LangGraph Standards

**Date**: 2025-01-23
**Task**: TASK_2025_025
**Purpose**: Validate tool call streaming patterns against LangChain/LangGraph official documentation

---

## Executive Summary

**Research Question**: Does LangChain/LangGraph provide standard tool call event streaming that our backend should implement?

**Answer**: ✅ **YES** - LangChain provides standard `handleToolStart`/`handleToolEnd` callbacks and `streamEvents()` API for tool call tracking.

**Current Backend Status**: ⚠️ **PARTIAL** - Callbacks exist but only log to console, NOT streamed to frontend.

**Recommendation**: **ENHANCE BACKEND** - Emit tool call events via EventEmitter2 for frontend consumption.

---

## Part 1: LangChain/LangGraph Official Standards

### Stream Modes in LangGraph

**Source**: https://langchain-ai.github.io/langgraph/how-tos/streaming/

LangGraph supports **5 streaming modes**:

1. **`values`** - Full state value after each step
2. **`updates`** - State updates after each step (✅ **includes tool call tracking**)
3. **`custom`** - Custom data from nodes
4. **`messages`** - LLM tokens + metadata (includes `langgraph_node` for filtering)
5. **`debug`** - Maximum information during execution

### Tool Call Event Sequence (updates mode)

**From Official Docs**:

When streaming with `mode="updates"`, tool calls generate distinct events:

1. **AI Message with tool call requests** - LLM decides to use a tool

   ```json
   {
     "type": "ai_message",
     "content": "",
     "tool_calls": [
       { "name": "github-analyzer", "args": { "username": "testuser" }, "id": "call_1" }
     ]
   }
   ```

2. **Tool Message with execution result** - Tool executes and returns result

   ```json
   {
     "type": "tool_message",
     "content": "{ ... github data ... }",
     "tool_call_id": "call_1"
   }
   ```

3. **Final AI response** - LLM processes tool result
   ```json
   {
     "type": "ai_message",
     "content": "Based on the analysis..."
   }
   ```

**Key Insight**: Tool calls are embedded in MESSAGE events, not separate event types.

---

## Part 2: LangChain JS streamEvents() API

**Source**: https://js.langchain.com/docs/how_to/tool_stream_events/

### Event Types for Tool Calls

LangChain JS `streamEvents()` method emits:

- **`on_chat_model_start`** - Model invocation begins
- **`on_chat_model_stream`** - Streaming tokens (may include `ToolCallChunk`)
- **`on_chat_model_end`** - Model completes (includes full `tool_calls` array)
- **`on_tool_start`** - Tool execution begins ⭐
- **`on_tool_end`** - Tool execution completes ⭐

### Event Structure Example

**on_chat_model_end with tool calls**:

```javascript
{
  event: 'on_chat_model_end',
  data: {
    output: {
      content: '',
      tool_calls: [
        { name: 'weather_tool', args: { city: 'NYC' }, id: 'call_abc123' }
      ]
    }
  },
  run_id: '27ac7b2e...',
  name: 'ChatAnthropic',
  metadata: { ... }
}
```

**Critical Requirement**: Must propagate `RunnableConfig` to child runnables for event emission.

---

## Part 3: Tool Call Data Structure (Standard)

**Source**: https://docs.langchain.com/oss/javascript/langchain/models#tool-calling

### Tool Call Object

```typescript
interface ToolCall {
  name: string; // Tool identifier (e.g., 'github-analyzer')
  args: object; // Parameters matching tool schema
  id: string; // Unique ID for correlating results (e.g., 'call_1')
}
```

### Tool Message (Result)

```typescript
interface ToolMessage {
  type: 'tool';
  content: string; // Tool execution result (often JSON stringified)
  tool_call_id: string; // References original ToolCall.id
}
```

### Progressive Streaming

During streaming, tool calls build progressively via **`ToolCallChunk`**:

```javascript
// Chunk 1
{ name: 'github', args: '', id: 'call_1' }

// Chunk 2
{ name: 'github-analyzer', args: '{"user', id: 'call_1' }

// Chunk 3 (complete)
{ name: 'github-analyzer', args: '{"username":"testuser"}', id: 'call_1' }
```

**Frontend Pattern**: Accumulate chunks until complete tool call object received.

---

## Part 4: Current Backend Analysis

### What EXISTS

**File**: `libs/langgraph-modules/monitoring/src/lib/providers/trace.provider.ts:46-59`

```typescript
export class TraceProvider extends BaseCallbackHandler {
  override async handleToolStart(tool: any, input: string, runId: string): Promise<void> {
    this.logger.debug(`Tool Start - Run ID: ${runId}, Tool: ${tool.name}`);
    // ❌ ONLY logs to console
    // ❌ Does NOT emit event to EventEmitter2
    // ❌ Does NOT stream to frontend
  }

  override async handleToolEnd(output: string, runId: string): Promise<void> {
    this.logger.debug(`Tool End - Run ID: ${runId}`);
    // ❌ ONLY logs to console
  }

  override async handleToolError(err: Error, runId: string): Promise<void> {
    this.logger.error(`Tool Error - Run ID: ${runId}`, err);
    // ❌ ONLY logs to console
  }
}
```

**Analysis**:

- ✅ LangChain callbacks **ARE** implemented
- ✅ Tool lifecycle events **ARE** tracked
- ❌ Events **ARE NOT** emitted via EventEmitter2
- ❌ Frontend **CANNOT** receive tool call events

### What DOES NOT EXIST

1. ❌ Tool call events in `StreamEventType` enum
2. ❌ EventEmitter2 integration in TraceProvider
3. ❌ Tool call data in WebSocket streams
4. ❌ Message streaming with `tool_calls` array

---

## Part 5: Recommended Backend Enhancement

### Option A: Enhance TraceProvider to Emit Events (RECOMMENDED)

**File**: `libs/langgraph-modules/monitoring/src/lib/providers/trace.provider.ts`

**Changes Required**:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

@Injectable()
export class TraceProvider extends BaseCallbackHandler {
  private readonly logger = new Logger(TraceProvider.name);

  // ✅ ADD: EventEmitter2 injection
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  override async handleToolStart(tool: any, input: string, runId: string): Promise<void> {
    this.logger.debug(`Tool Start - Run ID: ${runId}, Tool: ${tool.name}`);

    // ✅ ADD: Emit event for streaming
    this.eventEmitter.emit('tool.start', {
      type: 'tool_start',
      data: {
        toolName: tool.name,
        input: input,
        runId: runId,
        timestamp: new Date(),
      },
    });
  }

  override async handleToolEnd(output: string, runId: string): Promise<void> {
    this.logger.debug(`Tool End - Run ID: ${runId}`);

    // ✅ ADD: Emit event for streaming
    this.eventEmitter.emit('tool.end', {
      type: 'tool_end',
      data: {
        output: output,
        runId: runId,
        timestamp: new Date(),
      },
    });
  }

  override async handleToolError(err: Error, runId: string): Promise<void> {
    this.logger.error(`Tool Error - Run ID: ${runId}`, err);

    // ✅ ADD: Emit error event
    this.eventEmitter.emit('tool.error', {
      type: 'tool_error',
      data: {
        error: err.message,
        runId: runId,
        timestamp: new Date(),
      },
    });
  }
}
```

**Integration with WebSocketBridge**:

```typescript
// libs/langgraph-modules/streaming/src/lib/services/websocket-bridge.service.ts

@Injectable()
export class WebSocketBridgeService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly streamingService: StreamingWebSocketService
  ) {
    // Listen for tool events and bridge to WebSocket
    this.eventEmitter.on('tool.start', (data) => this.broadcastToolEvent(data));
    this.eventEmitter.on('tool.end', (data) => this.broadcastToolEvent(data));
    this.eventEmitter.on('tool.error', (data) => this.broadcastToolEvent(data));
  }

  private broadcastToolEvent(event: any): void {
    const streamUpdate: StreamUpdate = {
      type: 'CUSTOM' as StreamEventType, // Use CUSTOM type
      data: event.data,
      metadata: {
        timestamp: event.data.timestamp,
        eventType: event.type, // 'tool_start', 'tool_end', 'tool_error'
      },
    };

    this.streamingService.broadcastToAll('stream_update', streamUpdate);
  }
}
```

### Option B: Add Tool Call Events to StreamEventType Enum

**File**: `libs/langgraph-modules/streaming/src/lib/constants.ts`

```typescript
export enum StreamEventType {
  // Workflow lifecycle
  WORKFLOW_START = 'workflow:start',
  WORKFLOW_END = 'workflow:end',
  WORKFLOW_ERROR = 'workflow:error',

  // Node events
  NODE_START = 'node:start',
  NODE_END = 'node:end',
  NODE_ERROR = 'node:error',
  NODE_COMPLETE = 'node:complete',

  // ✅ ADD: Tool call events
  TOOL_START = 'tool:start',
  TOOL_END = 'tool:end',
  TOOL_ERROR = 'tool:error',

  // Stream data types
  VALUES = 'values',
  UPDATES = 'updates',
  MESSAGES = 'messages',
  EVENTS = 'events',
  DEBUG = 'debug',
  FINAL = 'final',

  // Progress events
  PROGRESS = 'progress',
  MILESTONE = 'milestone',

  // Token events
  TOKEN = 'token',

  // Error events
  ERROR = 'error',

  // Custom events
  CUSTOM = 'custom',
}
```

### Option C: Stream MESSAGES with tool_calls Array (STANDARD LANGCHAIN)

**Most Aligned with LangChain Standards**

Instead of separate tool events, stream AIMessage objects that contain `tool_calls`:

```typescript
// When agent decides to use tool
this.eventEmitter.emit('stream.update', {
  type: StreamEventType.MESSAGES,
  data: {
    messages: [
      {
        type: 'ai',
        content: '',
        tool_calls: [
          {
            name: 'github-analyzer',
            args: { username: 'testuser' },
            id: 'call_abc123',
          },
        ],
      },
    ],
  },
  metadata: { nodeId, timestamp, sequenceNumber },
});

// When tool completes
this.eventEmitter.emit('stream.update', {
  type: StreamEventType.MESSAGES,
  data: {
    messages: [
      {
        type: 'tool',
        content: '{ "repos": 42, "stars": 1234 }',
        tool_call_id: 'call_abc123',
      },
    ],
  },
  metadata: { nodeId, timestamp, sequenceNumber },
});
```

**Pros**:

- ✅ Standard LangChain pattern
- ✅ Already using MESSAGES event type
- ✅ Frontend can parse `tool_calls` array from messages
- ✅ No new event types needed

**Cons**:

- ⚠️ Requires agents to emit AIMessage with tool_calls
- ⚠️ More complex frontend parsing

---

## Part 6: Recommendation Matrix

| Approach                               | Effort | Standards Compliance | Backend Changes                    | Frontend Impact                |
| -------------------------------------- | ------ | -------------------- | ---------------------------------- | ------------------------------ |
| **A: Enhance TraceProvider**           | Medium | Partial              | Add EventEmitter2 to TraceProvider | Add tool event handlers        |
| **B: Add TOOL\_\* to StreamEventType** | Low    | Good                 | Enum + event emission              | Straightforward parsing        |
| **C: Stream MESSAGES with tool_calls** | High   | ✅ **Best**          | Agent-level changes                | Parse tool_calls from messages |

---

## Part 7: POC Implementation Strategy

### For TASK_2025_025 POC

**Recommended Approach**: **Option A (Enhance TraceProvider) + Use CUSTOM event type**

**Rationale**:

1. ✅ Minimal backend changes (single file: trace.provider.ts)
2. ✅ No enum modifications (uses existing CUSTOM type)
3. ✅ Fast implementation (2-3 hours backend, 2 hours frontend)
4. ✅ Validates tool call streaming for POC
5. ✅ Can upgrade to Option C later for production library

**Implementation Steps**:

**Backend (2-3 hours)**:

1. Inject EventEmitter2 into TraceProvider constructor
2. Emit 'tool.start', 'tool.end', 'tool.error' events from callbacks
3. Add WebSocketBridge listeners for tool events
4. Broadcast as CUSTOM stream updates

**Frontend (2 hours)**:

1. Listen for CUSTOM stream updates with eventType: 'tool_start'/'tool_end'
2. Track tool calls in DevBrandWorkflowStateService
3. Display in ToolCallTrackerComponent
4. Show tool timeline in EventStreamComponent

**Testing (1 hour)**:

1. Run dev-brand workflow
2. Verify tool events stream to frontend
3. Validate tool call timeline accuracy

---

## Part 8: Future Work (For @hive-academy/langgraph-angular Library)

**Recommended for Production Library**:

1. **Implement Option C**: Stream MESSAGES with tool_calls array

   - Fully compliant with LangChain standards
   - Best developer experience
   - Standard frontend parsing patterns

2. **Add streamEvents() Integration**:

   - Implement `.streamEvents()` API in workflow execution
   - Emit full LangChain event suite (on*chat_model*_, on*tool*_, on*chain*\*)

3. **Progressive Tool Call Chunks**:

   - Stream ToolCallChunk objects during LLM generation
   - Frontend displays "thinking: calling github-analyzer..." before full call

4. **Tool Call Metadata Enrichment**:
   - Include tool schema, parameter validation
   - Add execution duration, error details
   - Link tool calls to agent nodes

---

## Conclusion

### Key Findings

1. ✅ **LangChain HAS standard tool call patterns** - `handleToolStart`/`handleToolEnd` callbacks
2. ✅ **Backend HAS callbacks implemented** - TraceProvider in monitoring module
3. ❌ **Backend DOES NOT stream tool events** - Only logs to console
4. ⚠️ **POC can enhance TraceProvider** - Emit events via EventEmitter2
5. ✅ **Production library should use MESSAGES** - Stream tool_calls in AIMessage objects

### Recommendations

**For POC (TASK_2025_025)**:

- Enhance TraceProvider to emit tool events (Option A)
- Use CUSTOM StreamEventType for tool tracking
- Frontend tracks tool calls from CUSTOM events
- **Estimated Effort**: 4-5 hours total (backend + frontend)

**For Production Library (@hive-academy/langgraph-angular)**:

- Implement Option C (MESSAGES with tool_calls)
- Add streamEvents() API integration
- Progressive ToolCallChunk streaming
- Full LangChain standards compliance

### Updated Architecture Decision

**APPROVED APPROACH**: Hybrid Strategy

1. **POC**: Quick TraceProvider enhancement (validates concept)
2. **Library**: Full LangChain MESSAGES integration (production-grade)

---

## References

**LangChain/LangGraph Documentation**:

- https://langchain-ai.github.io/langgraph/how-tos/streaming/
- https://js.langchain.com/docs/how_to/tool_stream_events/
- https://docs.langchain.com/oss/javascript/langchain/models#tool-calling
- https://langchain-ai.github.io/langgraph/concepts/streaming/

**Codebase Evidence**:

- `libs/langgraph-modules/monitoring/src/lib/providers/trace.provider.ts:46-59`
- `libs/langgraph-modules/streaming/src/lib/constants.ts:8-40`

**Web Search**:

- Query: "LangGraph tool calls streaming events 2025"
- Date: 2025-01-23
