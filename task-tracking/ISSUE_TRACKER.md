# Issue Tracker - Systematic Bug Fixes

**Date**: 2025-11-05
**Execution ID**: devbrand-1762369464007
**Source**: log.md analysis

---

## Issue Classification

### 🔴 CRITICAL (Blocking Execution)

Issues that prevent workflows from completing successfully.

### 🟡 HIGH (Data Integrity)

Issues that cause data corruption or inconsistent state.

### 🟠 MEDIUM (Graceful Degradation Failures)

Issues where graceful degradation is failing and should be compile-time errors.

### 🟢 LOW (Performance/UX)

Issues that don't block functionality but impact user experience.

---

## 🔴 CRITICAL ISSUES

### CRITICAL-001: ChromaDB Query Syntax Error - Vector Memories

**Status**: 🔴 OPEN
**Priority**: P0
**Severity**: BLOCKING

**Description**:
ChromaDB query failing with "Expected 'where' to have exactly one operator, but got 3"

**Evidence**:

```
log.md:409 - Expected 'where' to have exactly one operator, but got 3
log.md:445 - Failed after 3 retry attempts
log.md:502 - Operation failed: searchDocuments
```

**Stack Trace**:

```
VectorMemoryRepository.searchMemoriesSimilar()
  → ChromaVectorAdapter.searchMemoriesSimilar()
  → AgentMemoryContextService.getAgentMemoryContext()
```

**Root Cause**:
Invalid ChromaDB where clause construction - multiple operators in a single where object instead of nested $and/$or operators.

**Impact**:

- Blocks memory retrieval for agents
- Prevents context-aware agent execution
- Falls back to execution without memory (suboptimal results)

**Expected Behavior**:
Should be caught at **compile time** via TypeScript type validation, not runtime.

**Fix Required**:

1. Identify where clause construction in `VectorMemoryRepository.searchWithScores()`
2. Fix operator nesting to use `$and: [{ operator1 }, { operator2 }, { operator3 }]`
3. Add TypeScript types to enforce valid where clause structure
4. Add compile-time validation tests

**Files Affected**:

- `libs/nestjs-chromadb/src/lib/repositories/vector-memory.repository.ts`
- `libs/langgraph-modules/langgraph-adapters/src/lib/vector/chroma-vector.adapter.ts`

---

### CRITICAL-002: ChromaDB Query Syntax Error - LangGraph Stores

**Status**: 🔴 OPEN
**Priority**: P0
**Severity**: BLOCKING

**Description**:
ChromaDB query failing with "Expected 'where' to have exactly one operator, but got 2"

**Evidence**:

```
log.md:555 - Expected 'where' to have exactly one operator, but got 2
log.md:627 - Failed after 3 retry attempts
log.md:648 - Operation failed: searchDocuments
```

**Stack Trace**:

```
LangGraphStoreRepository.searchItems()
  → ChromaVectorAdapter.searchStoreItems()
  → StoreService.searchStoreItems()
  → GraphOptimizationService.enhanceWithOptimizationPatterns()
```

**Root Cause**:
Same as CRITICAL-001 - invalid where clause construction with multiple operators.

**Impact**:

- Blocks graph optimization pattern retrieval
- Prevents workflow enhancement with learned optimizations
- Falls back to non-optimized execution

**Expected Behavior**:
Should be caught at **compile time** via TypeScript type validation.

**Fix Required**:

1. Fix where clause construction in `LangGraphStoreRepository.searchWithScores()`
2. Ensure consistent pattern with CRITICAL-001 fix
3. Add TypeScript types for where clause validation
4. Add integration tests

**Files Affected**:

- `libs/nestjs-chromadb/src/lib/repositories/langgraph-store.repository.ts`
- `libs/langgraph-modules/langgraph-adapters/src/lib/vector/chroma-vector.adapter.ts`

---

## 🟡 HIGH PRIORITY ISSUES

### HIGH-001: Checkpointer Configuration Not Applied at Runtime

**Status**: 🟡 PARTIALLY FIXED
**Priority**: P1
**Severity**: DATA INTEGRITY

**Description**:
Checkpointer is configured in `compilationOptions` but NOT passed to runtime `invokeConfig`, preventing state persistence.

**Evidence**:

```
log.md:68 - hasCheckpointer: false (in diagnostic log)
network-manager.service.ts:330-350 - invokeConfig missing checkpointer
```

**Root Cause**:
TASK_2025_032 fixed compile-time checkpointer but missed runtime configuration. Our fix added it, but needs verification.

**Impact**:

- State persistence not working
- Interruptions won't work properly
- Can't resume workflows after pause
- Thread continuity broken

**Fix Applied**:

```typescript
// network-manager.service.ts:330-350
const invokeConfig = {
  ...input.config,
  checkpointer: networkConfig.compilationOptions?.checkpointer, // ✅ Added
  configurable: {
    ...input.config?.configurable,
    thread_id: threadId, // ✅ Added
    networkId,
    networkType: networkConfig.type,
  },
};
```

**Verification Required**:

1. Confirm checkpointer is being used at runtime
2. Test workflow interruption and resume
3. Verify thread_id persistence across executions
4. Add integration tests

**Files Affected**:

- `libs/langgraph-modules/multi-agent/src/lib/network/network-manager.service.ts:330-350`

---

### HIGH-002: Date Serialization Error in Graph Memory Tracking

**Status**: 🟡 OPEN
**Priority**: P1
**Severity**: DATA CORRUPTION

**Description**:
`memory.createdAt.toISOString is not a function` error when storing memory in Neo4j graph.

**Evidence**:

```
log.md:173 - TypeError: memory.createdAt.toISOString is not a function
log.md:174 - GraphAgentService.trackMemory()
```

**Stack Trace**:

```
GraphAgentService.trackMemory()
  → MemoryGraphRepository.trackMemory()
  → Neo4jGraphAdapter.trackMemory()
  → AgentMemoryCoreService.storeAgentMemory()
```

**Root Cause**:
`memory.createdAt` is a number (timestamp) but code expects a Date object with `.toISOString()` method.

**Impact**:

- Memory tracking in Neo4j graph fails
- Relationship metadata incomplete
- Graph queries may return incomplete results
- Graceful degradation works, but data is lost

**Expected Behavior**:
Should have TypeScript types enforcing Date objects, or handle both Date and number timestamps.

**Fix Required**:

1. Identify where `memory.createdAt` is set
2. Either enforce Date object creation OR add runtime conversion: `new Date(memory.createdAt).toISOString()`
3. Add TypeScript types to enforce Date objects
4. Add validation tests

**Files Affected**:

- `libs/langgraph-modules/langgraph-adapters/src/lib/graph/graph-agent.service.ts:1112`
- Memory creation location (needs investigation)

---

## 🟠 MEDIUM PRIORITY ISSUES

### MEDIUM-001: Event Type Shows as 'unknown' in Streaming

**Status**: 🟠 OPEN
**Priority**: P2
**Severity**: UX DEGRADATION

**Description**:
WorkflowStreamingOrchestrator logs event type as 'unknown' because LangGraph raw chunks don't have a standardized type field.

**Evidence**:

```
log.md:331 - Event processed for devbrand-1762369464007: unknown
log.md:337 - Event processed for devbrand-1762369464007: unknown
```

**Code Reference**:

```typescript
// workflow-streaming-orchestrator.service.ts:308-312
this.logger.debug(`Event processed for ${executionId}: ${(event as any)?.type || 'unknown'}`);
```

**Root Cause**:
LangGraph's `graph.stream()` returns raw state chunks without a `type` field. Our streaming fix emits proper StreamUpdate events via EventEmitter2, but the orchestrator is logging the raw chunks.

**Impact**:

- Confusing debug logs
- Harder to trace workflow execution
- No functional impact (events still work)

**Fix Required**:

1. Update logging to use a different event property (e.g., chunk keys)
2. OR add event type detection based on chunk structure
3. Update diagnostic logging format

**Files Affected**:

- `libs/langgraph-modules/streaming/src/lib/services/workflow-streaming-orchestrator.service.ts:308-312`

---

### MEDIUM-002: Frontend Not Displaying WebSocket Events

**Status**: 🟠 OPEN
**Priority**: P2
**Severity**: UX BLOCKER

**Description**:
Frontend WebSocket connection established and subscribed, but no events displayed in UI.

**Evidence**:

```
log.md:74-77 - WebSocket client connected and subscribed
User report - "frontend doesn't show any events"
```

**Possible Causes**:

1. Frontend not receiving events (check browser DevTools Network tab)
2. Frontend receiving events but validation failing (StreamUpdateSchema)
3. Frontend receiving events but not rendering them
4. Event format mismatch after our streaming fix

**Fix Required**:

1. Check browser DevTools WebSocket messages
2. Verify StreamUpdate events match frontend schema
3. Check frontend event-stream.component.ts rendering logic
4. Add frontend error logging

**Files Affected**:

- `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-websocket.service.ts`
- `apps/dev-brand-ui/src/app/features/devbrand-poc/components/event-stream.component.ts`

**Verification Steps**:

```
1. Open browser DevTools → Network → WS tab
2. Start workflow
3. Check WebSocket messages
4. Verify message structure matches StreamUpdateSchema
5. Check console for validation errors
```

---

## 🟢 LOW PRIORITY ISSUES

### LOW-001: AgentState Missing Required Properties Warning

**Status**: 🟢 OPEN
**Priority**: P3
**Severity**: WARNING

**Description**:
AgentMemoryBridgeService warns about missing `current` and `threadId` properties.

**Evidence**:

```
log.md:356-370 - AgentState missing required properties for memory operations
log.md:360 - hasCurrent: false
log.md:361 - hasThreadId: false
```

**Impact**:

- Fallback to default values works
- No functional impact
- Suboptimal memory context (less specific)

**Fix Required**:
Ensure AgentState always includes `current` and `threadId` when invoking memory operations.

---

## Fix Priority Order

### Phase 1: Critical Blockers (P0)

1. **CRITICAL-001**: ChromaDB Vector Memories where clause
2. **CRITICAL-002**: ChromaDB LangGraph Stores where clause

### Phase 2: Data Integrity (P1)

3. **HIGH-001**: Verify checkpointer runtime configuration
4. **HIGH-002**: Date serialization in graph memory

### Phase 3: UX Issues (P2)

5. **MEDIUM-001**: Event type logging improvement
6. **MEDIUM-002**: Frontend WebSocket event display

### Phase 4: Warnings (P3)

7. **LOW-001**: AgentState property warnings

---

## Tracking

**Total Issues**: 7
**Critical**: 2
**High**: 2
**Medium**: 2
**Low**: 1

**Status**:

- 🔴 Open: 6
- 🟡 Partially Fixed: 1
- 🟢 Verified: 0

---

## Next Actions

1. **Immediate**: Fix CRITICAL-001 and CRITICAL-002 (ChromaDB where clauses)
2. **Today**: Verify HIGH-001 (checkpointer) and fix HIGH-002 (date serialization)
3. **This Week**: Address MEDIUM-001 and MEDIUM-002 (UX issues)
4. **Backlog**: LOW-001 (warnings)
