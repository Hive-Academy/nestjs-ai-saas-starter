# Streaming Events Not Reaching Frontend - Analysis

**Date**: 2025-11-01
**Issue**: Workflow executes but no streaming events reach WebSocket clients
**Status**: ROOT CAUSE IDENTIFIED 🔍

---

## Problem Statement

### What We Observe

1. **Backend executing correctly**:

   - WebSocket client connects ✅ (line 559-562 in log.md)
   - Supervisor routes to agents ✅ (line 563-568)
   - Agents execute ✅ (line 569-573)

2. **Frontend receives NOTHING**:

   - No stream_update events
   - No token_update events
   - No progress events
   - Complete radio silence

3. **Expected behavior**:
   - Real-time events via WebSocket
   - Token-by-token streaming
   - Progress updates

---

## Root Cause Analysis

### The Streaming Architecture Gap

The system has **two execution paths**:

#### Path 1: Workflow-Engine Execution (WORKS)

```
Workflow.executeWithStreaming()
  ↓
WorkflowStreamService (workflow-engine)
  ↓
EventEmitter2 emits:
  - workflow.stream.${executionId}
  - workflow.token.${executionId}
  ↓
WebSocketBridgeService (@OnEvent listeners)
  ↓
Frontend receives events ✅
```

#### Path 2: Multi-Agent Execution (BROKEN)

```
DevBrandSupervisorWorkflow.executeWithStreaming()
  ↓
MultiAgentWorkflowBase.executeCoordination()
  ↓
NetworkManagerService.executeWorkflow()
  ↓
LangGraph.stream() (supervisor network)
  ↓
❌ Events consumed but NOT emitted to EventEmitter2
  ↓
Frontend receives NOTHING ❌
```

### The Smoking Gun

**File**: `libs/langgraph-modules/streaming/src/lib/services/workflow-streaming-orchestrator.service.ts:289-306`

```typescript
// Consume the stream - events are automatically broadcast via EventEmitter2
// We just need to iterate to keep the stream alive
for await (const event of stream) {
  // Events are automatically emitted by WorkflowStreamService via:
  // - workflow.stream.${executionId}
  // - workflow.token.${executionId}
  //
  // WebSocketBridgeService listens via @OnEvent decorators
  // NO MANUAL EVENT EMISSION NEEDED HERE!
}
```

**The Problem**: This comment assumes `WorkflowStreamService` is emitting events, but `WorkflowStreamService` is part of **workflow-engine** module. When using **multi-agent** module's `executeCoordination()`, there's no WorkflowStreamService in the execution path!

### Execution Flow (Current - BROKEN)

```
1. DevBrandController.executeDevBrand()
     ↓
2. WorkflowStreamingOrchestrator.startWorkflowWithStreaming()
     ↓
3. consumeWorkflowStream() calls workflow.executeWithStreaming()
     ↓
4. DevBrandSupervisorWorkflow.executeWithStreaming()
     ↓
5. this.executeCoordination() (MultiAgentWorkflowBase method)
     ↓
6. MultiAgentCoordinatorService.executeWorkflow()
     ↓
7. NetworkManagerService.executeWorkflow()
     ↓
8. LangGraph.stream() returns async generator
     ↓
9. Events yielded to WorkflowStreamingOrchestrator
     ↓
10. WorkflowStreamingOrchestrator iterates (line 291-313)
     ↓
11. ❌ BUT: No EventEmitter2.emit() calls!
     ↓
12. WebSocketBridgeService never receives events
     ↓
13. Frontend gets NOTHING
```

---

## Evidence from Log Files

### Log.md Line 507-508

```
[LOG] [WorkflowStreamingOrchestrator] 🚀 Starting workflow with streaming: devbrand-1762009385579
```

This shows orchestrator starting the workflow correctly.

### Log.md Line 553-562

```
[DEBUG] [NetworkManagerService] Executing workflow on network devbrand-supervisor-network
[DEBUG] [NetworkManagerService] Object(3) {
  type: 'supervisor',
  messageCount: 1,
  executionId: 'exec_ba436182-b3d1-477b-8283-4597b4ffaa1b'
}
```

This shows multi-agent network executing, but execution ID mismatch:

- Orchestrator uses: `devbrand-1762009385579`
- Multi-agent uses: `exec_ba436182-b3d1-477b-8283-4597b4ffaa1b`

This ID mismatch means even if events were emitted, WebSocketBridge wouldn't route them to the correct client!

### Log.md Line 563-573

```
[DEBUG] [NodeFactoryService] Supervisor routing to: github-code-analyzer
[DEBUG] [NodeFactoryService] Executing worker agent: github-code-analyzer
```

Workflow is executing agents, but we see ZERO streaming event logs like:

- ❌ No `[DEBUG] [WebSocketBridgeService] Broadcasting stream update`
- ❌ No `[DEBUG] [TokenStreamingService] Emitting tokens`
- ❌ No `[DEBUG] [StreamingWebSocketService] Sending to client`

---

## Why This Happened

### Architectural Assumption

The streaming architecture was designed with the assumption that **WorkflowStreamService** (from workflow-engine) would handle event emission. This works for:

1. **Functional-API workflows** (using @Task, @Entrypoint)
2. **Workflow-Engine workflows** (using WorkflowDefinition)

But **multi-agent workflows** use a different execution path:

1. They don't go through WorkflowStreamService
2. They use `executeCoordination()` from MultiAgentWorkflowBase
3. This calls NetworkManagerService which uses raw LangGraph.stream()
4. The raw stream is yielded back but never broadcast via EventEmitter2

### Missing Integration

The MultiAgentCoordinatorService needs to integrate with EventEmitter2 to emit streaming events, similar to how WorkflowStreamService does.

---

## Solutions

### Option 1: Add EventEmitter2 to MultiAgentCoordinatorService (RECOMMENDED)

**Modify**: `libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.ts`

```typescript
@Injectable()
export class MultiAgentCoordinatorService {
  constructor(
    private readonly eventEmitter: EventEmitter2, // Add this
    private readonly networkManager: NetworkManagerService // ... other services
  ) {}

  async executeWorkflow(networkId: string, input: any): Promise<MultiAgentResult> {
    const executionId = input.executionId || `exec_${Date.now()}`;
    const threadId = this.generateThreadId(networkId);

    // Enable streaming
    const stream = await this.networkManager.executeWorkflow(networkId, input, {
      configurable: { thread_id: threadId },
      streamMode: 'values',
    });

    // ✅ NEW: Emit events to EventEmitter2
    for await (const event of stream) {
      // Emit to execution-specific stream
      this.eventEmitter.emit(`workflow.stream.${executionId}`, {
        type: 'agent_update',
        executionId,
        data: event,
        timestamp: new Date(),
      });

      // Log for debugging
      this.logger.debug(`Streaming event for ${executionId}`, event);
    }

    return result;
  }
}
```

**Pros**:

- Minimal code change
- Uses existing EventEmitter2 infrastructure
- WebSocketBridgeService already listens to `workflow.stream.*` events
- Consistent with workflow-engine pattern

**Cons**:

- Adds coupling to EventEmitter2 in multi-agent module

### Option 2: Create StreamingMultiAgentCoordinator Wrapper

**Create new service**: `libs/langgraph-modules/multi-agent/src/lib/services/streaming-multi-agent-coordinator.service.ts`

```typescript
@Injectable()
export class StreamingMultiAgentCoordinator {
  constructor(
    private readonly baseCoordinator: MultiAgentCoordinatorService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async executeWorkflowWithStreaming(networkId: string, input: any) {
    const executionId = input.executionId;

    // Wrap base coordinator execution
    const stream = this.baseCoordinator.executeWorkflow(networkId, input);

    for await (const event of stream) {
      // Emit to EventEmitter2
      this.eventEmitter.emit(`workflow.stream.${executionId}`, {
        type: 'agent_update',
        executionId,
        data: event,
        timestamp: new Date(),
      });
    }
  }
}
```

**Pros**:

- Doesn't modify existing multi-agent code
- Cleaner separation of concerns
- Easier to test

**Cons**:

- Adds another layer of abstraction
- DevBrandWorkflow would need to call this instead

### Option 3: Fix WorkflowStreamingOrchestrator to Emit Events Manually

**Modify**: `libs/langgraph-modules/streaming/src/lib/services/workflow-streaming-orchestrator.service.ts:275-340`

```typescript
private async consumeWorkflowStream<TInput, TOutput>(
  workflow: StreamableWorkflow<TInput, TOutput>,
  input: TInput,
  executionId: string
): Promise<void> {
  try {
    const stream = workflow.executeWithStreaming({ ...input, executionId });

    for await (const event of stream) {
      if (execution) {
        execution.lastActivity = new Date();
      }

      // ✅ NEW: Manually emit events if workflow doesn't
      this.eventEmitter.emit(`workflow.stream.${executionId}`, {
        type: this.detectEventType(event),
        executionId,
        data: event,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Event emitted for ${executionId}: ${(event as any)?.type || 'unknown'}`
      );
    }

    // ... rest of completion logic
  } catch (error) {
    // ... error handling
  }
}
```

**Pros**:

- Works for ALL workflows (multi-agent, functional, workflow-engine)
- Single fix point
- No changes needed in multi-agent module

**Cons**:

- Might cause duplicate events if WorkflowStreamService also emits
- Need to detect and prevent double emission

---

## Recommended Solution

**Use Option 1 (Add EventEmitter2 to MultiAgentCoordinatorService)** because:

1. ✅ Minimal code change (10-15 lines)
2. ✅ Consistent with existing architecture
3. ✅ WebSocketBridgeService already listens correctly
4. ✅ Doesn't break existing workflows
5. ✅ Easy to test and verify

---

## Execution ID Mismatch Issue

**Secondary bug discovered**: The execution IDs don't match:

- Controller/Orchestrator: `devbrand-1762009385579`
- Multi-agent network: `exec_ba436182-b3d1-477b-8283-4597b4ffaa1b`

### Root Cause

**File**: `libs/langgraph-modules/multi-agent/src/lib/base/multi-agent-workflow.base.ts`

The `executeCoordination()` method generates its own execution ID instead of using the one passed in `input.executionId`.

### Fix

Ensure `executeCoordination()` respects `config.metadata.executionId`:

```typescript
async executeCoordination(input: any, options: any) {
  const executionId = options.config?.metadata?.executionId || input.executionId || `exec_${uuid()}`;

  // Use this executionId consistently throughout execution
}
```

---

## Testing Plan

1. **Apply Option 1 fix** to MultiAgentCoordinatorService
2. **Fix execution ID mismatch** in executeCoordination
3. **Restart dev-brand-api** server
4. **Execute DevBrand workflow** via API
5. **Monitor logs** for:
   - `[DEBUG] [MultiAgentCoordinatorService] Streaming event for devbrand-XXX`
   - `[DEBUG] [WebSocketBridgeService] Broadcasting stream update`
   - `[DEBUG] [StreamingWebSocketService] Sending to client`
6. **Verify frontend** receives events in browser console

---

## Impact

**Before Fix**:

- ❌ Frontend gets no real-time updates
- ❌ Users see loading spinner forever
- ❌ No visibility into workflow progress
- ❌ Poor user experience

**After Fix**:

- ✅ Real-time token streaming
- ✅ Progress updates
- ✅ Agent status changes
- ✅ Rich user experience matching the logs

---

**Status**: Analysis complete, solution identified
**Next Step**: Apply Option 1 fix to multi-agent module
**Priority**: HIGH (user-facing feature completely broken)
