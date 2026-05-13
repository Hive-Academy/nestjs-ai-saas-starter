# LangGraph `__input__` Error - Root Cause Analysis

## Error Summary

**Error**: `Cannot read properties of undefined (reading '__input__')`
**Location**: LangGraph internal code `@langchain/langgraph/dist/pregel/algo.cjs:134:39`
**Context**: Graph execution fails in `PregelLoop._first()` during first tick

## Root Cause

**File**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\multi-agent\src\lib\network\graph-builder.service.ts`
**Lines**: 52-54 (supervisor graph), 155-157 (swarm graph), 220-232 (hierarchical graph)

### The Bug

```typescript
// ❌ INCORRECT: Passing options object instead of channels directly
const graph = new (StateGraph as any)({
  channels: this.createDefaultStateChannels(),
});
```

**Problem**: The LangGraph `StateGraph` constructor expects:

- **Modern API**: A state annotation object (preferred)
- **Legacy API**: Channels object directly (not wrapped in options)

The code is passing `{ channels: {...} }` which creates an **options object**, but LangGraph expects the channels object **directly** or a state annotation.

### Why This Causes `__input__` Error

When LangGraph compiles the graph:

1. It expects `channels` to be defined during graph construction
2. The `__input__` channel is a special internal channel that should ALWAYS exist
3. Because we pass an invalid object shape, LangGraph's graph compilation doesn't properly initialize the channels map
4. During execution, `_applyWrites()` tries to access `channels['__input__']` but `channels` is undefined
5. Error: `Cannot read properties of undefined (reading '__input__')`

## Evidence from Codebase

### ✅ Working Pattern (workflow-engine)

**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/workflow-graph-builder.service.ts:105`

```typescript
const stateAnnotation =
  optimizedOptions.stateAnnotation || definition.channels || WorkflowStateAnnotation;

const graph = new StateGraph<TState>(stateAnnotation);
```

**Why it works**: Passes state annotation directly (modern API)

### ✅ Working Pattern (functional-api)

**File**: `libs/langgraph-modules/functional-api/src/lib/services/graph-generator.service.ts:31-33`

```typescript
const workflow = new StateGraph<TState>({
  channels: this.createStateChannels<TState>(),
} as any);
```

**Why it works**: The `as any` casting FORCES TypeScript to accept the object shape, and internally LangGraph MAY handle this via options destructuring in older versions

### ❌ Broken Pattern (multi-agent)

**File**: `libs/langgraph-modules/multi-agent/src/lib/network/graph-builder.service.ts:52-54`

```typescript
const graph = new (StateGraph as any)({
  channels: this.createDefaultStateChannels(),
});
```

**Why it fails**:

- Casts `StateGraph` class itself to `any` (not just the argument)
- Passes options object instead of state annotation
- LangGraph's internal initialization fails to set up channels properly

## Verification Trail

### Search Results

**StateGraph instantiation patterns** (searched all langgraph-modules):

| Pattern                                   | File                                  | Status    |
| ----------------------------------------- | ------------------------------------- | --------- |
| `new StateGraph<TState>(stateAnnotation)` | workflow-engine (multiple files)      | ✅ Works  |
| `new StateGraph(SwarmState)`              | swarm-network-builder.service.ts:125  | ✅ Works  |
| `new (StateGraph as any)({ channels })`   | graph-builder.service.ts:52, 155, 220 | ❌ Broken |

### Channel Definition

**File**: `libs/langgraph-modules/multi-agent/src/lib/network/graph-builder.service.ts:362-395`

```typescript
private createDefaultStateChannels() {
  return {
    messages: {
      reducer: (current: any[], update: any[]) => [...current, ...update],
      default: () => [],
    },
    next: {
      reducer: (current: string | undefined, update: string | undefined) =>
        update ?? current,
      default: () => undefined,
    },
    current: {
      reducer: (current: string | undefined, update: string | undefined) =>
        update ?? current,
      default: () => undefined,
    },
    scratchpad: {
      reducer: (current: string, update: string) => update ?? current,
      default: () => '',
    },
    task: {
      reducer: (current: string | undefined, update: string | undefined) =>
        update ?? current,
      default: () => undefined,
    },
    metadata: {
      reducer: (
        current: Record<string, unknown>,
        update: Record<string, unknown>
      ) => ({ ...current, ...update }),
      default: () => ({}),
    },
  };
}
```

**Analysis**: Channel definitions are correct. The problem is HOW they're passed to StateGraph constructor.

## The Fix

### Solution 1: Use State Annotation (Recommended)

```typescript
// Create state annotation from channels
const stateAnnotation = {
  channels: this.createDefaultStateChannels(),
};

const graph = new StateGraph(stateAnnotation);
```

### Solution 2: Pass Channels Directly (Legacy)

```typescript
// Pass channels directly, not wrapped in object
const graph = new StateGraph(this.createDefaultStateChannels());
```

### Solution 3: Follow Workflow-Engine Pattern (Best Practice)

```typescript
import { Annotation } from '@langchain/langgraph';

// Define state annotation using LangGraph's Annotation API
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  next: Annotation<string | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  current: Annotation<string | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  // ... other channels
});

const graph = new StateGraph(AgentStateAnnotation);
```

## Impact Analysis

### Affected Functions

1. `buildSupervisorGraph()` (line 31-140)
2. `buildSwarmGraph()` (line 144-176)
3. `buildMultiLevelHierarchy()` (line 215-288)

### Why It Worked Before

The graph **compiles successfully** (line 251 in log shows "Created supervisor network"), but **fails during execution** because:

1. Compilation doesn't deeply validate channel structure
2. The error only surfaces when `_applyWrites()` tries to access the channels map
3. Checkpoint saves work because they don't need the channels map
4. First execution tick (`PregelLoop._first()`) is when channels are actually used

## Testing Verification

### Before Fix

```bash
# Expected error
ERROR [NetworkManagerService] TypeError: Cannot read properties of undefined (reading '__input__')
    at _applyWrites (@langchain/langgraph/dist/pregel/algo.cjs:134:39)
```

### After Fix

```bash
# Expected success
LOG [NetworkManagerService] Executing workflow on network devbrand-supervisor-network
DEBUG [NetworkManagerService] Workflow execution started
LOG [NetworkManagerService] Workflow execution completed successfully
```

## Related Issues

- **None found** - This is the first occurrence of this specific error
- **Similar pattern** - Functional-API uses similar `as any` casting but works because it casts the argument, not the class

## Commit Message

```
fix(multi-agent): correct StateGraph constructor usage to prevent __input__ error

- Change StateGraph instantiation from options object to direct state annotation
- Align with LangGraph 2025 API and workflow-engine patterns
- Fix supervisor, swarm, and hierarchical graph builders
- Prevents "Cannot read properties of undefined (reading '__input__')" error

BREAKING: Graph initialization now uses state annotation instead of options object

Refs: TASK_2025_032
```

## Files to Modify

1. `libs/langgraph-modules/multi-agent/src/lib/network/graph-builder.service.ts`
   - Line 52-54 (buildSupervisorGraph)
   - Line 155-157 (buildSwarmGraph)
   - Line 220-232 (buildMultiLevelHierarchy)

## Verification Steps

1. Fix graph construction patterns
2. Rebuild multi-agent library: `npx nx build @hive-academy/langgraph-multi-agent`
3. Run dev-brand-api: `npx nx serve dev-brand-api`
4. Test workflow execution: Trigger supervisor network
5. Verify no `__input__` error in logs
6. Verify checkpoint saves still work
7. Verify graph execution completes successfully

## Additional Notes

- The `interruptBefore` configuration (line 78-131) is correct and not related to this bug
- Checkpoint integration (line 134-139) is correct
- The bug is purely in graph construction, not in node factory or execution logic
- ThreadId and currentAgent initialization (network-manager.service.ts:210-220) are correct
