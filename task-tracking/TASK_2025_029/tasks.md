# Development Tasks - TASK_2025_029

**Task Type**: REFACTORING (Backend Architecture)
**Developer Needed**: backend-developer
**Total Tasks**: 15 atomic tasks
**Decomposed From**: implementation-plan.md (5-Priority Phased Architecture)

**Status**: 0/15 Complete (0%) | 1 In Progress

---

## Task Breakdown

### Priority 1: Remove Pre-Execution Memory Loading (IMMEDIATE - P0-Critical)

#### Task 1: Remove Blocking Pre-Execution Memory Calls [🔄 IN PROGRESS]

**Priority**: 1 (IMMEDIATE)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/coordination/workflow-execution-coordination.service.ts

**Objective**: Eliminate blocking memory operations that prevent workflow execution from starting instantly. This fixes the 25+ second delay caused by pre-execution memory loading.

**Specification Reference**: implementation-plan.md:113-208 (Priority 1: Component 1)

**Implementation Steps**:

1. Read workflow-execution-coordination.service.ts (lines 46-102)
2. Comment out or remove lines 59-80 (getOptimalCoordinationContext call)
3. Comment out or remove lines 84-100 (enhanceInputWithMemoryContext call)
4. Preserve workflow state management and checkpoint config setup
5. Ensure POST-execution memory operations remain intact (lines 172-232)
6. Add code comments explaining removal rationale (LangGraph 2025 alignment)
7. Verify method signature compatibility unchanged

**Verification**:

- [ ] TypeScript compiles without errors (npx nx build @hive-academy/langgraph-multi-agent)
- [ ] Lines 59-100 removed or commented out
- [ ] POST-execution memory storage code preserved (lines 172-232)
- [ ] All existing tests pass (npx nx test @hive-academy/langgraph-multi-agent)
- [ ] Workflow start latency < 100ms (manual verification)
- [ ] Git commit created with message: `refactor(multi-agent): remove pre-execution memory loading to fix cascade failures`

**Dependencies**: None
**Estimated Effort**: 2-3 hours
**Assigned To**: backend-developer
**Status**: [🔄 IN PROGRESS] - Assigned to backend-developer

---

### Priority 2: Implement Operation Queueing (SHORT-TERM - P1-High)

#### Task 2: Add Semaphore-Promise Dependency [ ] NOT STARTED

**Priority**: 2 (SHORT-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/package.json

**Objective**: Add semaphore-promise dependency to enable concurrency control for ChromaDB operations.

**Specification Reference**: implementation-plan.md:210-350 (Priority 2: Component 2)

**Implementation Steps**:

1. Add semaphore-promise to dependencies: `"semaphore-promise": "^2.0.5"`
2. Add @types/semaphore-promise to devDependencies if available
3. Run npm install to verify package installs correctly
4. Verify package exports Semaphore class (check node_modules/semaphore-promise)

**Verification**:

- [ ] package.json contains semaphore-promise dependency
- [ ] npm install succeeds without errors
- [ ] Semaphore import works: `import { Semaphore } from 'semaphore-promise';`
- [ ] Git commit created with message: `chore(deps): add semaphore-promise for chromadb concurrency control`

**Dependencies**: None
**Estimated Effort**: 0.5 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 3: Extend ConnectionConfig Interface with Concurrency Settings [ ] NOT STARTED

**Priority**: 2 (SHORT-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/interfaces/core/database-abstractions.interface.ts

**Objective**: Add maxConcurrentOperations configuration option to ConnectionConfig interface.

**Specification Reference**: implementation-plan.md:232-247 (ConnectionConfig extension)

**Implementation Steps**:

1. Read database-abstractions.interface.ts
2. Find ConnectionConfig interface
3. Add optional property: `maxConcurrentOperations?: number; // Default 5`
4. Add JSDoc comment explaining concurrency control purpose
5. Verify interface is exported from index.ts

**Verification**:

- [ ] TypeScript compiles without errors (npx nx build @hive-academy/nestjs-chromadb)
- [ ] ConnectionConfig interface has maxConcurrentOperations property
- [ ] Property is optional (marked with ?)
- [ ] JSDoc documentation added
- [ ] Git commit created with message: `feat(chromadb): add maxConcurrentOperations config for semaphore control`

**Dependencies**: Task 2 (semaphore-promise dependency)
**Estimated Effort**: 1 hour
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 4: Implement Semaphore-Based Queueing in ChromaDBConnectionService [ ] NOT STARTED

**Priority**: 2 (SHORT-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/services/core/chromadb-connection.service.ts

**Objective**: Wrap executeWithRetry() with semaphore to limit concurrent ChromaDB operations to 3-5 (configurable).

**Specification Reference**: implementation-plan.md:232-318 (Semaphore Pattern Implementation)

**Pattern to Follow**: implementation-plan.md:236-318 (semaphore integration pattern)

**Implementation Steps**:

1. Read chromadb-connection.service.ts (lines 172-282 - current executeWithRetry)
2. Import Semaphore from semaphore-promise
3. Add private readonly semaphore: Semaphore property
4. Initialize semaphore in constructor with config.maxConcurrentOperations || 5
5. Wrap executeWithRetry() operation in semaphore.acquire()
6. Extract existing retry logic to private executeWithRetryInternal() method
7. Add getQueueMetrics() method returning available permits, queue depth, max concurrent
8. Add debug logging for semaphore acquisition/release

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] Semaphore initialized in constructor with configurable limit
- [ ] executeWithRetry wraps operation in semaphore.acquire()
- [ ] Existing retry logic preserved (no behavior changes)
- [ ] getQueueMetrics() method implemented
- [ ] Semaphore released on operation completion (success or failure)
- [ ] Unit tests pass for concurrent operations
- [ ] Git commit created with message: `feat(chromadb): implement semaphore-based operation queueing`

**Dependencies**: Task 2, Task 3
**Estimated Effort**: 4-5 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 5: Add Integration Tests for Operation Queueing [ ] NOT STARTED

**Priority**: 2 (SHORT-TERM)
**Type**: TEST
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/services/core/chromadb-connection.service.spec.ts

**Objective**: Verify semaphore correctly limits concurrent operations and releases permits on errors.

**Specification Reference**: implementation-plan.md:1756-1791 (Testing Strategy - Priority 2)

**Implementation Steps**:

1. Create test: 'should limit concurrent operations to configured max'
   - Execute 20 concurrent operations
   - Verify max concurrent never exceeds semaphore limit (5)
2. Create test: 'should handle errors without deadlock'
   - Execute failing operation
   - Verify semaphore permit released (availablePermits = 5)
3. Create test: 'should expose queue metrics'
   - Execute operations
   - Verify getQueueMetrics() returns correct values

**Verification**:

- [ ] All new tests pass (npx nx test @hive-academy/nestjs-chromadb)
- [ ] Test coverage for semaphore logic > 80%
- [ ] No deadlocks detected in concurrent test scenarios
- [ ] Git commit created with message: `test(chromadb): add semaphore queueing integration tests`

**Dependencies**: Task 4
**Estimated Effort**: 2-3 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

### Priority 3: Background Coordination Learning (SHORT-TERM - P1-High)

#### Task 6: Create CoordinationLearningService [ ] NOT STARTED

**Priority**: 3 (SHORT-TERM)
**Type**: CREATE
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/coordination/coordination-learning.service.ts

**Objective**: Create fire-and-forget background service for coordination pattern learning without blocking workflow completion.

**Specification Reference**: implementation-plan.md:352-636 (Priority 3: Component 3)

**Pattern to Follow**: implementation-plan.md:374-575 (CoordinationLearningService implementation)

**Implementation Steps**:

1. Create coordination-learning.service.ts file
2. Define CoordinationEventData interface (networkId, executionId, threadId, input, result, coordinationContext, executionTime, timestamp)
3. Implement @Injectable() CoordinationLearningService class
4. Add constructor with @Optional() @Inject('IMemoryAdapter') memoryAdapter, EventEmitter2
5. Implement storeCoordinationEventAsync() - fire-and-forget queuing
6. Implement private processQueueAsync() - background queue processing
7. Implement private storeCoordinationEventInternal() - existing memory storage logic from MemoryCoordinationService
8. Implement private storeAgentPerformanceData() - agent performance extraction
9. Implement getQueueMetrics() - queue depth, isProcessing, memoryAdapterAvailable
10. Add telemetry event emissions (coordination.learning.queued, stored, failed)

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] Service follows NestJS Injectable pattern
- [ ] storeCoordinationEventAsync() returns immediately (< 5ms)
- [ ] Background processing handles errors gracefully
- [ ] Telemetry events emitted for queue operations
- [ ] Git commit created with message: `feat(multi-agent): add background coordination learning service`

**Dependencies**: Task 1 (pre-execution removal must be complete)
**Estimated Effort**: 8-10 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 7: Integrate CoordinationLearningService with WorkflowExecutionCoordinationService [ ] NOT STARTED

**Priority**: 3 (SHORT-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/coordination/workflow-execution-coordination.service.ts
- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/multi-agent.module.ts
- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/index.ts

**Objective**: Replace blocking POST-execution memory storage with fire-and-forget background learning.

**Specification Reference**: implementation-plan.md:578-605 (Integration Update)

**Implementation Steps**:

1. In multi-agent.module.ts:
   - Import CoordinationLearningService
   - Add to module providers array
2. In workflow-execution-coordination.service.ts:
   - Inject CoordinationLearningService in constructor
   - Replace blocking storeAgentCoordinationEvent() call (lines 172-189) with:
     - coordinationLearning.storeCoordinationEventAsync()
     - Add .catch() for non-blocking error handling
3. In index.ts:
   - Export CoordinationLearningService
4. Remove or deprecate old blocking memory calls

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] Service registered in module providers
- [ ] POST-execution memory storage non-blocking (< 5ms)
- [ ] Workflow completion not delayed by learning operations
- [ ] Existing tests pass
- [ ] Git commit created with message: `feat(multi-agent): integrate fire-and-forget coordination learning`

**Dependencies**: Task 6
**Estimated Effort**: 3-4 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 8: Add Background Learning Tests [ ] NOT STARTED

**Priority**: 3 (SHORT-TERM)
**Type**: TEST
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/coordination/coordination-learning.service.spec.ts

**Objective**: Verify background learning doesn't block workflows and handles errors gracefully.

**Specification Reference**: implementation-plan.md:1793-1833 (Testing Strategy - Priority 3)

**Implementation Steps**:

1. Create test: 'should queue events without blocking'
   - Verify storeCoordinationEventAsync() latency < 5ms
2. Create test: 'should process queue in background'
   - Wait 100ms, verify memoryAdapter.store called
3. Create test: 'should emit telemetry events'
   - Verify coordination.learning.queued event emitted
4. Create test: 'should handle background errors gracefully'
   - Simulate memoryAdapter failure
   - Verify workflow not affected

**Verification**:

- [ ] All tests pass (npx nx test @hive-academy/langgraph-multi-agent)
- [ ] Test coverage > 80% for CoordinationLearningService
- [ ] Fire-and-forget pattern verified (non-blocking)
- [ ] Git commit created with message: `test(multi-agent): add background coordination learning tests`

**Dependencies**: Task 7
**Estimated Effort**: 3-4 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

### Priority 4: Implement LangGraph Store Interface Fully (LONG-TERM - P2-Medium)

#### Task 9: Create BaseStore Interface and Type Definitions [ ] NOT STARTED

**Priority**: 4 (LONG-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/interfaces/multi-agent.interface.ts

**Objective**: Define BaseStore interface matching LangGraph 2025 specification for in-node memory access.

**Specification Reference**: implementation-plan.md:638-962 (Priority 4: Component 4)

**Pattern to Follow**: implementation-plan.md:661-705 (BaseStore interface + LangGraphNodeFunction type)

**Implementation Steps**:

1. Read multi-agent.interface.ts
2. Add BaseStore interface with methods:
   - get<T>(namespace: string, key: string): Promise<T | null>
   - set<T>(namespace: string, key: string, value: T, ttl?: number): Promise<void>
   - delete(namespace: string, key: string): Promise<boolean>
   - search<T>(namespace: string, query: string, options?: SearchOptions): Promise<T[]>
   - list(namespace: string): Promise<string[]>
3. Add SearchOptions interface (limit, minRelevance)
4. Add LangGraphNodeFunction<TState> type with store parameter:
   - (state: TState, config: RunnableConfig, store: BaseStore) => Promise<Partial<TState> | Command>
5. Add JSDoc documentation explaining LangGraph 2025 "memory-in-nodes" pattern

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] BaseStore interface has all required methods
- [ ] LangGraphNodeFunction type includes store parameter
- [ ] Interfaces exported from index.ts
- [ ] Git commit created with message: `feat(multi-agent): add langgraph 2025 basestore interface`

**Dependencies**: None (can implement in parallel with Priority 1-3)
**Estimated Effort**: 3-4 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 10: Create MemoryStoreAdapter Service [ ] NOT STARTED

**Priority**: 4 (LONG-TERM)
**Type**: CREATE
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/coordination/memory-store-adapter.service.ts
- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/multi-agent.module.ts
- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/index.ts

**Objective**: Bridge IMemoryAdapter to BaseStore interface for seamless integration with existing memory system.

**Specification Reference**: implementation-plan.md:706-780 (MemoryStoreAdapter implementation)

**Pattern to Follow**: implementation-plan.md:709-780 (adapter pattern)

**Implementation Steps**:

1. Create memory-store-adapter.service.ts
2. Implement @Injectable() MemoryStoreAdapter class implements BaseStore
3. Add constructor with @Optional() @Inject('IMemoryAdapter') memoryAdapter
4. Implement get<T>(): Convert namespace:key to memory query
5. Implement set<T>(): Store via memoryAdapter.store()
6. Implement search<T>(): Use memoryAdapter.search()
7. Implement delete(): Mark for deletion or no-op (document limitation)
8. Implement list(): Return empty array (document limitation)
9. Register service in multi-agent.module.ts providers
10. Export from index.ts

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] All BaseStore methods implemented
- [ ] Service registered in module
- [ ] Unit tests verify get/set/search functionality
- [ ] Git commit created with message: `feat(multi-agent): add memory store adapter for langgraph 2025 compatibility`

**Dependencies**: Task 9
**Estimated Effort**: 8-10 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 11: Update NodeFactoryService to Inject Store Parameter [ ] NOT STARTED

**Priority**: 4 (LONG-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/network/node-factory.service.ts

**Objective**: Enhance all node creation methods (supervisor, worker, swarm) to inject store parameter into node functions.

**Specification Reference**: implementation-plan.md:782-926 (NodeFactoryService enhancement)

**Pattern to Follow**: implementation-plan.md:785-924 (store parameter injection)

**Implementation Steps**:

1. Read node-factory.service.ts
2. Inject MemoryStoreAdapter in constructor
3. Update createSupervisorNode() (lines 188-268):
   - Add store parameter to returned function signature
   - Pass store to supervisor logic for coordination context access
   - Example: await store.get('coordination', `network.${state.metadata?.networkId}`)
4. Update createWorkerNode() (lines 274-361):
   - Add store parameter to function signature
   - Enable in-node memory access via store.search()
   - Pass store to agent.nodeFunction()
5. Update createSwarmNode() (lines 367-497):
   - Add store parameter to function signature
   - Enable peer coordination history via store.search()
6. Update createNodeWrapper() to pass store through execution chain
7. Add JSDoc examples of in-node memory access patterns

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] All node creation methods have store parameter
- [ ] Store passed through to underlying agent functions
- [ ] Existing tests pass (backward compatibility)
- [ ] Git commit created with message: `feat(multi-agent): inject langgraph store parameter in node factory`

**Dependencies**: Task 10
**Estimated Effort**: 12-15 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 12: Add Store Interface Integration Tests [ ] NOT STARTED

**Priority**: 4 (LONG-TERM)
**Type**: TEST
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/network/node-factory.service.spec.ts
- D:/projects/nestjs-ai-saas-starter/libs/langgraph-modules/multi-agent/src/lib/coordination/memory-store-adapter.service.spec.ts

**Objective**: Verify store parameter properly passed to node functions and in-node memory access works.

**Specification Reference**: implementation-plan.md:1836-1872 (Testing Strategy - Priority 4)

**Implementation Steps**:

1. Create test: 'should pass store parameter to node functions'
   - Verify node functions receive (state, config, store)
2. Create test: 'should allow in-node memory access via store'
   - Test store.get(), store.set(), store.search()
3. Create test: 'should bridge IMemoryAdapter to BaseStore'
   - Verify MemoryStoreAdapter correctly translates operations
4. Create E2E test: workflow with in-node memory access
   - Verify end-to-end store usage

**Verification**:

- [ ] All tests pass
- [ ] Test coverage > 80% for store-related code
- [ ] Type inference works correctly (TypeScript type checks)
- [ ] Git commit created with message: `test(multi-agent): add langgraph store interface integration tests`

**Dependencies**: Task 11
**Estimated Effort**: 6-8 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

### Priority 5: Implement Memory Caching (LONG-TERM - P2-Medium)

#### Task 13: Add ioredis Dependency and Create EmbeddingCacheService [ ] NOT STARTED

**Priority**: 5 (LONG-TERM)
**Type**: CREATE + MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/package.json
- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/services/caching/chromadb-embedding-cache.service.ts

**Objective**: Create Redis-backed embedding cache service to reduce ChromaDB load by 70-80%.

**Specification Reference**: implementation-plan.md:964-1375 (Priority 5: Component 5)

**Pattern to Follow**: implementation-plan.md:987-1225 (ChromaDBEmbeddingCacheService)

**Implementation Steps**:

1. Add ioredis to package.json dependencies: `"ioredis": "^5.3.2"`
2. Add @types/ioredis to devDependencies
3. Run npm install
4. Create chromadb-embedding-cache.service.ts
5. Define EmbeddingCacheConfig interface (ttl, maxTtl, keyPrefix, enableWarming, warmingStrategy)
6. Define CacheMetrics interface (hits, misses, hitRate, totalRequests, cacheSize, evictions)
7. Implement @Injectable() ChromaDBEmbeddingCacheService class implements OnModuleDestroy
8. Implement get(content: string): Promise<readonly number[] | null> - cache lookup
9. Implement set(content, embedding, ttl): Promise<void> - cache storage
10. Implement getMany(contents: string[]): Promise<Map<...>> - batch cache lookup
11. Implement setMany(entries: Array<...>, ttl): Promise<void> - batch cache storage
12. Implement warmCache(contents, embeddings): Promise<void> - cache warming
13. Implement getMetrics(): CacheMetrics
14. Implement clear(): Promise<void> - cache invalidation
15. Implement private generateKey(content: string): string - SHA-256 content hash
16. Implement onModuleDestroy(): Close Redis connection

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] ioredis dependency installed successfully
- [ ] All cache methods implemented (get, set, getMany, setMany, warmCache)
- [ ] Cache key generation uses SHA-256 hash
- [ ] Redis connection cleanup on module destroy
- [ ] Git commit created with message: `feat(chromadb): add redis-backed embedding cache service`

**Dependencies**: None (can implement in parallel)
**Estimated Effort**: 10-12 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 14: Integrate EmbeddingCacheService with EmbeddingService and Module [ ] NOT STARTED

**Priority**: 5 (LONG-TERM)
**Type**: MODIFY
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/services/embedding.service.ts
- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/nestjs-chromadb.module.ts
- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/interfaces/chromadb-module-options.interface.ts
- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/index.ts

**Objective**: Wire embedding cache into embedding generation pipeline with 4-phase caching strategy.

**Specification Reference**: implementation-plan.md:1228-1306 (EmbeddingService integration)

**Pattern to Follow**: implementation-plan.md:1233-1305 (4-phase caching)

**Implementation Steps**:

1. In chromadb-module-options.interface.ts:
   - Add redis?: RedisConfig (host, port, password, db)
   - Add embeddingCache?: EmbeddingCacheConfig
2. In nestjs-chromadb.module.ts:
   - Add REDIS_CLIENT provider with ioredis factory
   - Add EMBEDDING_CACHE_CONFIG provider
   - Register ChromaDBEmbeddingCacheService
   - Export ChromaDBEmbeddingCacheService
3. In embedding.service.ts:
   - Inject ChromaDBEmbeddingCacheService in constructor
   - Update generateEmbeddings() with 4-phase caching:
     - Phase 1: Check cache (getMany)
     - Phase 2: Generate uncached embeddings
     - Phase 3: Store new embeddings in cache (setMany)
     - Phase 4: Combine cached + new (preserve order)
   - Update generateEmbedding() with single-item caching
4. In index.ts:
   - Export ChromaDBEmbeddingCacheService
   - Export EmbeddingCacheConfig, CacheMetrics

**Verification**:

- [ ] TypeScript compiles without errors
- [ ] Redis client provider registered in module
- [ ] EmbeddingService uses cache for all embedding operations
- [ ] Cache hit/miss tracked via metrics
- [ ] Graceful fallback on Redis failures (embeddings still generated)
- [ ] Git commit created with message: `feat(chromadb): integrate redis embedding cache with embedding service`

**Dependencies**: Task 13
**Estimated Effort**: 6-8 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

#### Task 15: Add Cache Performance Tests and Documentation [ ] NOT STARTED

**Priority**: 5 (LONG-TERM)
**Type**: TEST + DOCUMENT
**Files**:

- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/src/lib/services/caching/chromadb-embedding-cache.service.spec.ts
- D:/projects/nestjs-ai-saas-starter/libs/nestjs-chromadb/CLAUDE.md

**Objective**: Verify cache achieves 75%+ hit rate and document Redis configuration.

**Specification Reference**: implementation-plan.md:1875-1920 (Testing Strategy - Priority 5)

**Implementation Steps**:

1. Create test: 'should cache embeddings with correct TTL'
   - Verify cache.set() stores with configured TTL
   - Verify cache.get() retrieves cached embeddings
2. Create test: 'should achieve 75%+ cache hit rate after warm-up'
   - Warm cache with 100 embeddings
   - Simulate 100 requests (80 cached, 20 new)
   - Verify hitRate > 0.75
3. Create test: 'should fall back to direct generation on Redis failure'
   - Simulate Redis connection failure
   - Verify embeddings still generated via provider
4. Create test: 'should support batch operations'
   - Test getMany(), setMany()
   - Verify order preservation
5. Update CLAUDE.md:
   - Add "Embedding Cache" section
   - Document Redis configuration (environment variables)
   - Document cache warming strategies
   - Document cache metrics monitoring
   - Add examples of cache usage

**Verification**:

- [ ] All tests pass
- [ ] Cache hit rate test verifies > 75%
- [ ] Graceful degradation test passes (Redis failure handling)
- [ ] CLAUDE.md updated with cache documentation
- [ ] Git commit created with message: `test(chromadb): add embedding cache performance tests and docs`

**Dependencies**: Task 14
**Estimated Effort**: 6-8 hours
**Assigned To**: (Will be assigned during ASSIGNMENT mode)
**Status**: [ ] NOT STARTED

---

## Dependency Graph

```
Priority 1 (IMMEDIATE):
  Task 1 (Remove Pre-Exec Memory)
    └─ No dependencies

Priority 2 (SHORT-TERM):
  Task 2 (Add Semaphore Dependency)
    └─ No dependencies
  Task 3 (Extend ConnectionConfig)
    └─ Depends on: Task 2
  Task 4 (Implement Semaphore Queueing)
    └─ Depends on: Task 2, Task 3
  Task 5 (Queueing Tests)
    └─ Depends on: Task 4

Priority 3 (SHORT-TERM):
  Task 6 (Create CoordinationLearningService)
    └─ Depends on: Task 1 (pre-exec removal)
  Task 7 (Integrate Background Learning)
    └─ Depends on: Task 6
  Task 8 (Background Learning Tests)
    └─ Depends on: Task 7

Priority 4 (LONG-TERM):
  Task 9 (Create BaseStore Interface)
    └─ No dependencies (parallel with P1-P3)
  Task 10 (Create MemoryStoreAdapter)
    └─ Depends on: Task 9
  Task 11 (Update NodeFactoryService)
    └─ Depends on: Task 10
  Task 12 (Store Interface Tests)
    └─ Depends on: Task 11

Priority 5 (LONG-TERM):
  Task 13 (Create EmbeddingCacheService)
    └─ No dependencies (parallel with P1-P4)
  Task 14 (Integrate Cache with EmbeddingService)
    └─ Depends on: Task 13
  Task 15 (Cache Tests and Docs)
    └─ Depends on: Task 14
```

---

## Verification Protocol

**After Each Task Completion**:

1. Developer updates task status to "✅ COMPLETE"
2. Developer adds git commit SHA in task section
3. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms file exists/modified
   - Build passes: `npx nx build [affected-library]`
   - Tests pass: `npx nx test [affected-library]`
4. If verification passes: Assign next task
5. If verification fails: Mark task as "❌ FAILED", escalate to user

---

## Completion Criteria

**All tasks complete when**:

- All 15 task statuses are "✅ COMPLETE"
- All git commits verified (15 total commits)
- All files exist/modified as specified
- All builds pass (npx nx build affected)
- All tests pass (npx nx test affected)
- Performance targets met:
  - Priority 1: Workflow start < 100ms
  - Priority 2: Max 5 concurrent ChromaDB ops
  - Priority 3: Background learning < 5ms queue insertion
  - Priority 4: Store parameter exposed to all nodes
  - Priority 5: Cache hit rate > 75%

**Return to orchestrator with**: "All 15 tasks completed and verified ✅"

---

## Sequential Execution Order

**IMMEDIATE (Priority 1 - 2-3 hours)**:

1. Task 1 → Instant workflow start

**SHORT-TERM Phase 1 (Priority 2 - 8-10 hours)**: 2. Task 2 → Add dependency 3. Task 3 → Extend config 4. Task 4 → Implement queueing 5. Task 5 → Test queueing

**SHORT-TERM Phase 2 (Priority 3 - 15-18 hours)**: 6. Task 6 → Create background service 7. Task 7 → Integrate background learning 8. Task 8 → Test background learning

**LONG-TERM Phase 1 (Priority 4 - 30-37 hours)**: 9. Task 9 → Create BaseStore interface 10. Task 10 → Create MemoryStoreAdapter 11. Task 11 → Update NodeFactoryService 12. Task 12 → Test store interface

**LONG-TERM Phase 2 (Priority 5 - 22-28 hours)**: 13. Task 13 → Create cache service 14. Task 14 → Integrate cache 15. Task 15 → Test and document cache

**Total Estimated Effort**: 77-96 hours (approximately 2-2.5 weeks for one developer)

---

## Notes for Developer

**CRITICAL REMINDERS**:

1. **Commit After EVERY Task**: Each task must have its own git commit
2. **Follow Commit Message Format**: All commits must pass commitlint hooks
3. **Type Safety**: NO 'any' types allowed - use strict TypeScript
4. **Pattern Compliance**: Follow existing NestJS patterns (constructor DI, Injectable, etc.)
5. **Anti-Backward Compatibility**: NO versioned services (ServiceV1, ServiceV2)
6. **Testing**: Write tests for each task - 80% coverage minimum
7. **Documentation**: Update CLAUDE.md files as specified in Task 15

**Commit Message Format**:

```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore, perf
Scopes: multi-agent, chromadb, langgraph, deps
Description: lowercase, 3-72 chars, no period at end
```

**Example Valid Commits**:

- `refactor(multi-agent): remove pre-execution memory loading to fix cascade failures`
- `feat(chromadb): add maxConcurrentOperations config for semaphore control`
- `test(multi-agent): add background coordination learning tests`

**Before Starting ANY Task**:

1. Read implementation-plan.md section for your task
2. Read library-specific CLAUDE.md (libs/[library]/CLAUDE.md)
3. Verify all imports exist in codebase
4. Check example files mentioned in implementation plan
5. Ask team-leader if ANY uncertainty exists
