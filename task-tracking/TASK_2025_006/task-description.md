# Task Description - TASK_2025_006

## Title

Split AgentMemoryBridgeService into Focused Services

## Type

Refactoring

## Priority

P1-High

## Estimated Effort

Medium (4-6 hours)

## Objective

Refactor AgentMemoryBridgeService (997 lines) into 5 focused services following Single Responsibility Principle, improving maintainability, testability, and code clarity.

## Current Architecture

**File**: `libs/langgraph-modules/memory/src/lib/services/agent-memory-bridge.service.ts`
**Lines**: 997
**Responsibilities**: 8 major areas (violates SRP)

### Responsibility Breakdown

1. **Memory CRUD** (Lines 196-422):

   - storeAgentMemory() - 65 lines
   - storeAgentMemoriesBatch() - 84 lines
   - searchAgentMemories() - 56 lines
   - clearAgentMemories() - 47 lines

2. **Context Retrieval** (Lines 69-183):

   - getAgentMemoryContext() - 115 lines

3. **Checkpoint Sync** (Lines 428-492):

   - syncWithCheckpoint() - 65 lines
   - linkMemoriesToCheckpoint() - 13 lines

4. **Statistics** (Lines 498-512, 869-900):

   - getAgentMemoryStats() - 15 lines
   - updateAgentStats() - 32 lines

5. **Store Integration** (Lines 591-616):

   - getStore() - 26 lines

6. **IMemoryAdapter Compliance** (Lines 630-851):

   - 9 wrapper methods - 222 lines

7. **Helper Methods** (Lines 920-995):

   - convertToMutableUserPatterns() - 20 lines
   - extractPatternsFromMemories() - 43 lines

8. **Private State** (Lines 39):
   - agentStats Map

## Target Architecture

### Service 1: AgentMemoryCoreService

**File**: `agent-memory-core.service.ts`
**Responsibility**: Agent memory CRUD operations
**Methods**:

- storeAgentMemory(agentId, memory): Promise<MemoryEntry>
- storeAgentMemoriesBatch(agentId, memories): Promise<MemoryEntry[]>
- searchAgentMemories(agentId, query, options): Promise<MemoryEntry[]>
- clearAgentMemories(agentId, threadId): Promise<number>

**Dependencies**:

- IVectorService (direct injection)
- IGraphService (direct injection)

### Service 2: AgentMemoryContextService

**File**: `agent-memory-context.service.ts`
**Responsibility**: Memory context retrieval for agents
**Methods**:

- getAgentMemoryContext(agentId, threadId, query?, userId?): Promise<AgentMemoryContext>
- extractPatternsFromMemories(memories, userId): UserMemoryPatterns (private)

**Dependencies**:

- AgentMemoryCoreService (for searchAgentMemories)
- IVectorService (for direct vector search)

### Service 3: AgentMemoryCheckpointService

**File**: `agent-memory-checkpoint.service.ts`
**Responsibility**: Checkpoint synchronization
**Methods**:

- syncWithCheckpoint(threadId, checkpointId, agentMemories?): Promise<void>
- linkMemoriesToCheckpoint(memories, checkpointId): Promise<void> (private)

**Dependencies**:

- ICheckpointAdapter (optional injection)

### Service 4: AgentMemoryStatsService

**File**: `agent-memory-stats.service.ts`
**Responsibility**: Agent statistics tracking
**Methods**:

- getAgentMemoryStats(agentId): Promise<AgentMemoryStats>
- updateAgentStats(agentId, updates): void
- getStats(): Map<string, AgentMemoryStats> (for testing)

**State**:

- private agentStats: Map<string, AgentMemoryStats>

### Service 5: AgentMemoryBridgeService (Orchestrator)

**File**: `agent-memory-bridge.service.ts`
**Responsibility**: IMemoryAdapter implementation + orchestration
**Methods**:

- getStore(collection?): Store (direct IStoreService delegation)
- IMemoryAdapter compliance methods (9 wrappers):
  - getAgentContext() → delegates to contextService
  - storeAgentExecution() → delegates to coreService
  - storeConversationTurn() → delegates to coreService
  - search() → delegates to coreService
  - store() → delegates to coreService
  - storeBatch() → delegates to coreService
  - getUserPatterns() → delegates to contextService
  - isHealthy() → checks vector + graph adapters
- convertToMutableUserPatterns() (private helper)

**Dependencies**:

- AgentMemoryCoreService
- AgentMemoryContextService
- AgentMemoryCheckpointService
- AgentMemoryStatsService
- IStoreService (for getStore)

**Implements**: IAgentMemoryBridge, IMemoryAdapter

## Implementation Steps

### Step 1: Create AgentMemoryCoreService (1 hour)

1. Create `agent-memory-core.service.ts`
2. Move CRUD methods (lines 196-422)
3. Inject IVectorService, IGraphService
4. Update imports and types
5. Add comprehensive JSDoc

### Step 2: Create AgentMemoryContextService (45 min)

1. Create `agent-memory-context.service.ts`
2. Move getAgentMemoryContext() (lines 69-183)
3. Move extractPatternsFromMemories() (lines 955-995)
4. Inject AgentMemoryCoreService, IVectorService
5. Add comprehensive JSDoc

### Step 3: Create AgentMemoryCheckpointService (30 min)

1. Create `agent-memory-checkpoint.service.ts`
2. Move checkpoint methods (lines 428-492, 920-929)
3. Inject ICheckpointAdapter (optional)
4. Add comprehensive JSDoc

### Step 4: Create AgentMemoryStatsService (30 min)

1. Create `agent-memory-stats.service.ts`
2. Move stats methods (lines 498-512, 869-900)
3. Move agentStats Map (line 39)
4. Add comprehensive JSDoc

### Step 5: Refactor AgentMemoryBridgeService (1.5 hours)

1. Inject 4 specialized services
2. Update IMemoryAdapter methods to delegate
3. Keep getStore() (direct IStoreService delegation)
4. Keep convertToMutableUserPatterns() helper
5. Remove all moved code
6. Update constructor
7. Update imports

### Step 6: Update Module Registration (30 min)

1. Add 4 new services to MemoryModule providers
2. Export services from index.ts
3. Update IAgentMemoryBridge interface if needed
4. Verify dependency injection chain

### Step 7: Testing & Validation (45 min)

1. Run typecheck: `npx nx run @hive-academy/langgraph-memory:typecheck`
2. Run build: `npx nx build @hive-academy/langgraph-memory`
3. Run app build: `npx nx build dev-brand-api`
4. Verify no breaking changes
5. Update tests if needed

## Acceptance Criteria

### Code Quality

- [ ] AgentMemoryBridgeService reduced from 997 lines to ~200 lines (80% reduction)
- [ ] Each service has single, clear responsibility
- [ ] Zero TypeScript errors
- [ ] All imports use @hive-academy/\* aliases
- [ ] No 'any' types (except where required by interfaces)
- [ ] Comprehensive JSDoc for all public methods

### Functional Requirements

- [ ] All existing functionality preserved (zero breaking changes)
- [ ] IMemoryAdapter compliance maintained
- [ ] IAgentMemoryBridge interface unchanged
- [ ] Dependency injection works correctly
- [ ] Library builds successfully
- [ ] Application builds successfully

### Architecture

- [ ] Services follow Single Responsibility Principle
- [ ] Clear dependency hierarchy (no circular dependencies)
- [ ] Orchestrator pattern: AgentMemoryBridgeService delegates to specialized services
- [ ] Each service testable in isolation

## Files to Create

1. `libs/langgraph-modules/memory/src/lib/services/agent-memory-core.service.ts`
2. `libs/langgraph-modules/memory/src/lib/services/agent-memory-context.service.ts`
3. `libs/langgraph-modules/memory/src/lib/services/agent-memory-checkpoint.service.ts`
4. `libs/langgraph-modules/memory/src/lib/services/agent-memory-stats.service.ts`

## Files to Modify

1. `libs/langgraph-modules/memory/src/lib/services/agent-memory-bridge.service.ts` (refactor to orchestrator)
2. `libs/langgraph-modules/memory/src/lib/memory.module.ts` (add providers)
3. `libs/langgraph-modules/memory/src/index.ts` (export services)

## Testing Strategy

### Unit Tests (Future)

- Test each service in isolation
- Mock dependencies
- Cover edge cases

### Integration Tests (Future)

- Test service coordination
- Verify IMemoryAdapter compliance
- Test checkpoint sync flows

### Build Verification (Immediate)

```bash
npx nx run @hive-academy/langgraph-memory:typecheck
npx nx build @hive-academy/langgraph-memory
npx nx build dev-brand-api
```

## Success Metrics

- **Code Reduction**: 997 lines → ~500 lines total (5 services × ~100 lines each)
- **Maintainability**: Each service < 200 lines
- **Testability**: Services testable in isolation
- **Clarity**: Clear responsibility per service
- **Zero Regressions**: All existing functionality works

## Dependencies

**Prerequisite Tasks**:

- ✅ TASK_2025_005 Phase 3 & 4 (IMemoryAdapter compliance complete)

**Blocked Tasks**: None

**Related Work**:

- Future: Add unit tests for split services
- Future: Add integration tests for orchestration

## Agent Assignment

**Assigned To**: backend-developer
**Estimated Duration**: 4-6 hours
**Branch**: feature/006

## Notes

- Preserve all existing functionality (zero breaking changes)
- Follow existing code patterns from TASK_2025_005
- Each service should have comprehensive JSDoc
- Use factory pattern for dependency injection
- Maintain backward compatibility with IAgentMemoryBridge
