# Manual Checkpoint Locations Found

## Summary

This document tracks all locations where manual checkpoint creation was found during the systematic cleanup of TASK_2025_032.

**Total Files Found**: 3 files with manual checkpoint patterns
**Total Manual Checkpoint Creations**: 5 instances

---

## ❌ MALFORMED CHECKPOINT PATTERN

All manual checkpoint creations follow this buggy pattern:

```typescript
// ❌ MALFORMED: Missing required fields
const checkpoint = {
  id: `checkpoint_${executionId}_${Date.now()}`,
  channel_values: state, // Missing channel_versions and versions_seen!
};
```

**Required LangGraph Checkpoint Structure**:

```typescript
{
  v: number;
  id: string;
  ts: string;
  channel_values: Record<string, unknown>;
  channel_versions: Record<string, ChannelVersion>; // ✅ Required
  versions_seen: Record<string, Record<string, ChannelVersion>>; // ✅ Required
}
```

---

## File 1: functional-workflow.service.ts

**Location**: `libs/langgraph-modules/functional-api/src/lib/services/functional-workflow.service.ts`

**Lines**: 504-507

**Code**:

```typescript
const checkpoint: BaseCheckpoint<FunctionalWorkflowState> = {
  id: `checkpoint_${executionId}_${Date.now()}`,
  channel_values: state, // ❌ Malformed
};
```

**Context**: `saveCheckpoint()` method (lines 499-539)

**Called From**:

- Line 141: After entrypoint execution
- Line 227: After task execution
- Line 317: After completing workflow

**Status**: ❌ Not yet removed

**Action Required**: Delete entire `saveCheckpoint()` method and remove all calls to it

---

## File 2: hitl-checkpoint.service.ts

**Location**: `libs/langgraph-modules/hitl/src/lib/services/hitl-checkpoint.service.ts`

### Instance 1: Approval Checkpointing

**Lines**: 48-52

**Code**:

```typescript
const checkpointData = {
  id: request.id,
  channel_values: {
    request,
    additionalData,
    timestamp: new Date().toISOString(),
  }, // ❌ Malformed
};
```

**Context**: `saveApprovalCheckpoint()` method (lines 31-88)

**Called From**:

- Approval workflow tracking for HITL

**Status**: ❌ Not yet removed

### Instance 2: Approval Chain Progress

**Lines**: 156-160

**Code**:

```typescript
const chainData = {
  id: `${request.chainId}-${chainLevel}`,
  channel_values: {
    chainId: request.chainId,
    level: chainLevel,
    approvers,
    status: chainStatus,
    requestId: request.id,
    executionId: request.executionId,
    nodeId: request.nodeId,
    timestamp: new Date().toISOString(),
  }, // ❌ Malformed
};
```

**Context**: `saveChainProgress()` method (lines 140-190)

**Called From**:

- Multi-level approval chain tracking

**Status**: ❌ Not yet removed

**Action Required**:

- Evaluate if HITL checkpointing should use LangGraph's checkpointer via dependency injection
- If HITL needs approval state persistence, it should use the checkpoint adapter properly
- Consider if HITL approval tracking belongs in Neo4j (operational data) rather than checkpoint system

---

## File 3: branch-manager.service.ts

**Location**: `libs/langgraph-modules/time-travel/src/lib/services/branch-manager.service.ts`

**Lines**: 77-80

**Code**:

```typescript
const branchCheckpoint = {
  ...checkpoint,
  id: `${checkpoint.id}_branch_${branchOptions.name}`,
  channel_values: branchedState, // ❌ Potentially malformed if spread checkpoint is malformed
};
```

**Context**: `createBranch()` method - creates modified checkpoint for branch

**Called From**:

- Time-travel branch creation for debugging/replay

**Status**: ❌ Not yet removed

**Special Case**: This spreads an existing checkpoint, so if the input `checkpoint` is properly formed (from LangGraph's checkpointer), this might preserve the required fields. However, if the input checkpoint is malformed, this propagates the issue.

**Action Required**:

- Verify if time-travel should use LangGraph's checkpoint system directly
- If branching requires checkpoint modification, ensure all required fields are preserved
- Consider if branch manager should call `checkpointer.getTuple()` instead of manual checkpoint creation

---

## Analysis & Recommendations

### Root Cause

All manual checkpoint creations bypass LangGraph's internal checkpoint management, which is responsible for creating properly structured checkpoints with `channel_versions` and `versions_seen` fields.

### Impact

When these malformed checkpoints are loaded by LangGraph's PregelLoop, it fails at:

```typescript
// node_modules/@langchain/langgraph/dist/pregel/algo.cjs:134
checkpoint.versions_seen[task.name] ??= {};
// TypeError: Cannot read properties of undefined (reading '__input__')
```

### Cleanup Strategy

**Priority 1**: Remove manual checkpoint saves in workflow execution

- ✅ COMPLETED: workflow-execution-coordination.service.ts
- ✅ COMPLETED: stream-coordination.service.ts

**Priority 2**: Remove manual checkpoint saves in functional-api

- ❌ PENDING: functional-workflow.service.ts

**Priority 3**: Evaluate HITL checkpoint usage

- ❌ PENDING: hitl-checkpoint.service.ts
- Decision needed: Should HITL use checkpointer or Neo4j for approval state?

**Priority 4**: Verify time-travel checkpoint handling

- ❌ PENDING: branch-manager.service.ts
- Decision needed: Should branch manager clone checkpoints via checkpointer API?

### Proper Pattern

**LangGraph handles ALL checkpointing internally when you use `compile({ checkpointer })`**:

```typescript
// ✅ CORRECT: LangGraph creates checkpoints automatically
const graph = createGraph();
const checkpointer = new PostgresSaver(pool);
const compiledGraph = graph.compile({ checkpointer });

// LangGraph automatically:
// 1. Creates checkpoints with ALL required fields
// 2. Manages channel_versions tracking
// 3. Maintains versions_seen for replay
// 4. Handles checkpoint lifecycle

const result = await compiledGraph.invoke(input, config);
// Checkpoint created automatically with proper structure
```

**ICheckpointAdapter should only return LangGraph's BaseCheckpointSaver**:

```typescript
// ✅ CORRECT: Return LangGraph's native checkpointer
@Injectable()
export class CheckpointAdapter implements ICheckpointAdapter {
  getCheckpointer(): BaseCheckpointSaver {
    return new PostgresSaver(this.pool); // LangGraph's native implementation
  }
}
```

---

## Next Steps

1. ✅ COMPLETED: Scan all modules for manual checkpoint patterns
2. ✅ COMPLETED: Document all locations found (this file)
3. ❌ PENDING: Remove manual checkpoints from functional-api
4. ❌ PENDING: Evaluate and fix HITL checkpoint usage
5. ❌ PENDING: Verify time-travel checkpoint handling
6. ❌ PENDING: Test all affected modules
7. ❌ PENDING: Document proper checkpoint usage patterns

---

## References

- **TASK_2025_032**: Main task tracking manual checkpoint cleanup
- **langgraph-error-analysis.md**: Original error analysis identifying the issue
- **LangGraph Checkpoint Interface**: `libs/langgraph-modules/checkpoint/src/lib/interfaces/langgraph-checkpoint.interface.ts:25-41`
- **PregelLoop Error Location**: `node_modules/@langchain/langgraph/dist/pregel/algo.cjs:134`
