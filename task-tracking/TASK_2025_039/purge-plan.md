# Library-by-Library Purge Plan

**Created**: 2025-01-07
**Task**: TASK_2025_039
**Strategy**: Purge first, rebuild second

---

## Purge Strategy

### Phase 1: DELETE Over-Engineered Services (Parallel Execution)

Delete all service layer duplication across all libraries simultaneously.

### Phase 2: REBUILD with Direct LangGraph (Sequential per Library)

After purge complete, rebuild execution layer using LangGraph directly.

---

## Library Purge Tasks (Execute in Parallel)

### 🗑️ Task 1: Purge Functional-API Services

**Library**: `@hive-academy/langgraph-functional-api`

**✅ KEEP** (434 LOC total):

```
libs/langgraph-modules/functional-api/src/lib/
  decorators/                           ✅ KEEP (234 LOC)
    entrypoint.decorator.ts             ✅ 100 LOC
    task.decorator.ts                   ✅ 134 LOC
    node.decorator.ts                   ✅ 358 LOC
    edge.decorator.ts                   ✅ 472 LOC
    workflow.decorator.ts               ✅ 336 LOC

  utils/                                ✅ KEEP (100 LOC)
    decorator-validator.ts              ✅ Validation logic
    functional-api-config.accessor.ts   ✅ Module config

  types/                                ✅ KEEP (100 LOC)
    task-execution-context.ts           ✅ Type definitions
    task-execution-result.ts            ✅ Type definitions
```

**❌ DELETE** (5,077 LOC):

```
libs/langgraph-modules/functional-api/src/lib/
  services/                             ❌ DELETE ENTIRE FOLDER
    functional-workflow.service.ts      ❌ 600 LOC - duplicates entrypoint()
    workflow-registration.service.ts    ❌ 400 LOC - duplicates NestJS DI
    graph-generator.service.ts          ❌ 800 LOC - duplicates StateGraph
    workflow-execution.service.ts       ❌ 700 LOC - duplicates graph.invoke()
    task-orchestrator.service.ts        ❌ 500 LOC - manual task execution
    edge-resolver.service.ts            ❌ 400 LOC - duplicates addEdge()
    state-manager.service.ts            ❌ 450 LOC - duplicates LangGraph state
    workflow-cache.service.ts           ❌ 350 LOC - premature optimization
    validation-engine.service.ts        ❌ 300 LOC - validation should be in decorator
    dependency-resolver.service.ts      ❌ 377 LOC - graph topological sort (LangGraph does this)

  base/                                 ❌ DELETE ENTIRE FOLDER
    functional-workflow.base.ts         ❌ 200 LOC - over-abstraction
```

**Purge Commands**:

```bash
# Delete services folder
rm -rf libs/langgraph-modules/functional-api/src/lib/services

# Delete base folder
rm -rf libs/langgraph-modules/functional-api/src/lib/base

# Update index.ts to remove service exports
```

**Verification**:

- ✅ All decorators remain
- ✅ Type definitions remain
- ✅ Validation utilities remain
- ❌ All services deleted
- ❌ All base classes deleted

**Result**: 5,511 LOC → 434 LOC (92% reduction)

---

### 🗑️ Task 2: Purge Workflow-Engine Services

**Library**: `@hive-academy/langgraph-workflow-engine`

**✅ KEEP** (1,500 LOC total):

```
libs/langgraph-modules/workflow-engine/src/lib/
  core/                                 ⚠️ SIMPLIFY
    metadata-processor.service.ts       ✅ 200 LOC (simplified - extract metadata only)
    central-registry.service.ts         ✅ 100 LOC (NestJS discovery only)

  base/                                 ⚠️ SIMPLIFY (100 LOC)
    workflow.base.ts                    ✅ 50 LOC (DI container only)
    declarative-workflow.base.ts        ✅ 50 LOC (DI container only)

  module/                               ✅ KEEP
    workflow-engine.module.ts           ✅ 100 LOC (NestJS module setup)

  types/                                ✅ KEEP
    workflow-definition.ts              ✅ Type definitions
    workflow-state.ts                   ✅ Type definitions
```

**❌ DELETE** (10,598 LOC):

```
libs/langgraph-modules/workflow-engine/src/lib/
  services/                             ❌ DELETE ENTIRE FOLDER
    workflow-graph-builder.service.ts   ❌ 800 LOC - duplicates StateGraph
    subgraph-manager.service.ts         ❌ 500 LOC - LangGraph has subgraphs
    workflow-execution.service.ts       ❌ 600 LOC - duplicates graph.invoke()
    workflow-compiler.service.ts        ❌ 550 LOC - duplicates builder.compile()
    node-wrapper.service.ts             ❌ 450 LOC - unnecessary wrapping
    edge-builder.service.ts             ❌ 400 LOC - duplicates addEdge()
    state-transformer.service.ts        ❌ 500 LOC - manual state management
    workflow-cache.service.ts           ❌ 350 LOC - premature optimization
    workflow-lifecycle.service.ts       ❌ 300 LOC - LangGraph manages lifecycle

  streaming/                            ❌ DELETE ENTIRE FOLDER
    workflow-stream.service.ts          ❌ 450 LOC - duplicates graph.stream()
    event-stream-processor.service.ts   ❌ 350 LOC - duplicates stream modes
    stream-manager.service.ts           ❌ 350 LOC - manual stream management
    stream-aggregator.service.ts        ❌ 300 LOC - unnecessary aggregation

  execution/                            ❌ DELETE ENTIRE FOLDER
    execution-engine.service.ts         ❌ 700 LOC - duplicates Pregel engine
    execution-context.service.ts        ❌ 400 LOC - duplicates RunnableConfig
    execution-coordinator.service.ts    ❌ 450 LOC - manual coordination

  graph/                                ❌ DELETE ENTIRE FOLDER
    graph-validator.service.ts          ❌ 350 LOC - LangGraph validates
    graph-optimizer.service.ts          ❌ 300 LOC - premature optimization
    graph-analyzer.service.ts           ❌ 250 LOC - unnecessary analysis

  base/ (over-engineered parts)         ❌ SIMPLIFY
    unified-workflow.base.ts            ❌ 350 LOC → 50 LOC (remove all methods except constructor)
    declarative-workflow.base.ts        ❌ 300 LOC → 50 LOC (remove all methods except constructor)
    streaming-workflow.base.ts          ❌ DELETE (250 LOC - streaming via graph.stream())
```

**Purge Commands**:

```bash
# Delete services folders
rm -rf libs/langgraph-modules/workflow-engine/src/lib/services
rm -rf libs/langgraph-modules/workflow-engine/src/lib/streaming
rm -rf libs/langgraph-modules/workflow-engine/src/lib/execution
rm -rf libs/langgraph-modules/workflow-engine/src/lib/graph

# Simplify base classes (manual edit)
# - Keep only constructor with DI
# - Remove all execution methods

# Simplify metadata processor (manual edit)
# - Keep only metadata extraction
# - Remove graph building logic
```

**Verification**:

- ✅ MetadataProcessorService remains (simplified)
- ✅ Base classes remain (DI only)
- ✅ Type definitions remain
- ❌ All graph builders deleted
- ❌ All streaming services deleted
- ❌ All execution services deleted

**Result**: 12,098 LOC → 1,500 LOC (87% reduction)

---

### 🗑️ Task 3: Purge Multi-Agent Network Management

**Library**: `@hive-academy/langgraph-multi-agent`

**✅ KEEP** (4,500 LOC total):

```
libs/langgraph-modules/multi-agent/src/lib/
  decorators/                           ✅ KEEP (1,251 LOC)
    agent.decorator.ts                  ✅ 534 LOC (excellent design)
    multi-agent.decorator.ts            ✅ 422 LOC (topology patterns)
    tool.decorator.ts                   ✅ 295 LOC (advanced features)

  services/                             ✅ KEEP UNIQUE VALUE (1,200 LOC)
    llm-provider.service.ts             ✅ 800 LOC (unified LLM interface)
    command-processor.service.ts        ✅ 400 LOC (command pattern)

  coordination/                         ⚠️ SIMPLIFY (100 LOC)
    workflow-execution-coordination.service.ts  ⚠️ 400 LOC → 100 LOC (remove pre-execution memory)

  base/                                 ⚠️ SIMPLIFY (150 LOC)
    multi-agent-workflow.base.ts        ⚠️ 300 LOC → 150 LOC (keep executeSimple helper)

  types/                                ✅ KEEP
    agent-state.ts                      ✅ Type definitions
    multi-agent-config.ts               ✅ Type definitions
```

**❌ DELETE** (14,595 LOC):

```
libs/langgraph-modules/multi-agent/src/lib/
  network/                              ❌ DELETE ENTIRE FOLDER
    network-manager.service.ts          ❌ 1,200 LOC - stores graphs externally (wrong)
    node-factory.service.ts             ❌ 800 LOC - custom node wrappers
    graph-builder.service.ts            ❌ 600 LOC - duplicates StateGraph
    network-registry.service.ts         ❌ 500 LOC - external registry (wrong)
    topology-builder.service.ts         ❌ 700 LOC - manual topology building

  agents/                               ❌ DELETE ENTIRE FOLDER
    agent-executor.service.ts           ❌ 600 LOC - duplicates graph.invoke()
    agent-registry.service.ts           ❌ 500 LOC - NestJS DI does this
    agent-factory.service.ts            ❌ 450 LOC - unnecessary factory
    agent-coordinator.service.ts        ❌ 550 LOC - manual coordination

  state/                                ❌ DELETE ENTIRE FOLDER
    state-transformer.service.ts        ❌ 400 LOC - enhanced state pattern (wrong)
    state-manager.service.ts            ❌ 350 LOC - duplicates LangGraph state
    state-synchronizer.service.ts       ❌ 300 LOC - manual sync

  execution/                            ❌ DELETE ENTIRE FOLDER
    execution-orchestrator.service.ts   ❌ 650 LOC - manual orchestration
    execution-tracker.service.ts        ❌ 400 LOC - unnecessary tracking
    execution-monitor.service.ts        ❌ 350 LOC - premature monitoring

  memory/                               ❌ DELETE ENTIRE FOLDER
    memory-coordination.service.ts      ❌ 800 LOC - pre-execution loading (wrong)
    memory-adapter.service.ts           ❌ 450 LOC - unnecessary adapter

  tools/                                ❌ DELETE MOST
    tool-registry.service.ts            ❌ 400 LOC - over-engineered registry
    tool-builder.service.ts             ❌ 350 LOC - unnecessary builder
    tool-node.service.ts                ❌ 300 LOC - manual tool nodes
    tool-registration.service.ts        ✅ KEEP (simplified registration)

  routing/                              ❌ DELETE ENTIRE FOLDER
    supervisor-router.service.ts        ❌ 500 LOC - manual routing
    swarm-coordinator.service.ts        ❌ 450 LOC - manual swarm
    hierarchical-router.service.ts      ❌ 400 LOC - manual hierarchy
```

**Purge Commands**:

```bash
# Delete network management
rm -rf libs/langgraph-modules/multi-agent/src/lib/network

# Delete agent management
rm -rf libs/langgraph-modules/multi-agent/src/lib/agents

# Delete state management
rm -rf libs/langgraph-modules/multi-agent/src/lib/state

# Delete execution services
rm -rf libs/langgraph-modules/multi-agent/src/lib/execution

# Delete memory coordination
rm -rf libs/langgraph-modules/multi-agent/src/lib/memory

# Delete routing services
rm -rf libs/langgraph-modules/multi-agent/src/lib/routing

# Delete most tool services (keep tool-registration.service.ts)
rm libs/langgraph-modules/multi-agent/src/lib/tools/tool-registry.service.ts
rm libs/langgraph-modules/multi-agent/src/lib/tools/tool-builder.service.ts
rm libs/langgraph-modules/multi-agent/src/lib/tools/tool-node.service.ts

# Simplify coordination service (manual edit)
# - Remove pre-execution memory loading (lines 58-116)
# - Keep only basic orchestration

# Simplify base class (manual edit)
# - Keep executeSimple() helper
# - Remove all manual graph building
```

**Verification**:

- ✅ All decorators remain
- ✅ LlmProviderService remains
- ✅ CommandProcessorService remains
- ✅ ToolRegistrationService remains (simplified)
- ❌ NetworkManagerService deleted
- ❌ All state transformers deleted
- ❌ All routing services deleted

**Result**: 19,095 LOC → 4,500 LOC (76% reduction)

---

### 🗑️ Task 4: Purge Memory Pre-Execution Loading

**Library**: `@hive-academy/langgraph-memory`

**✅ KEEP** (400 LOC total):

```
libs/langgraph-modules/memory/src/lib/
  storage/                              ✅ KEEP (ChromaDB integration)
    memory-storage.service.ts           ✅ Vector storage

  graph/                                ✅ KEEP (Neo4j integration)
    memory-graph.service.ts             ✅ Graph relationships

  core/                                 ⚠️ SIMPLIFY
    memory-bridge.service.ts            ✅ 100 LOC (simplified - no pre-loading)

  types/                                ✅ KEEP
    memory-entry.ts                     ✅ Type definitions
```

**❌ DELETE** (800 LOC):

```
libs/langgraph-modules/memory/src/lib/
  coordination/                         ❌ DELETE ENTIRE FOLDER
    memory-coordination.service.ts      ❌ 400 LOC - pre-execution loading (25+ second delay)
    optimal-coordination.service.ts     ❌ 250 LOC - premature optimization

  enhancement/                          ❌ DELETE ENTIRE FOLDER
    input-enhancer.service.ts           ❌ 200 LOC - manual state enhancement
    context-builder.service.ts          ❌ 150 LOC - manual context building

  aggregation/                          ❌ DELETE ENTIRE FOLDER
    memory-aggregator.service.ts        ❌ 200 LOC - unnecessary aggregation
```

**Purge Commands**:

```bash
# Delete coordination folder
rm -rf libs/langgraph-modules/memory/src/lib/coordination

# Delete enhancement folder
rm -rf libs/langgraph-modules/memory/src/lib/enhancement

# Delete aggregation folder
rm -rf libs/langgraph-modules/memory/src/lib/aggregation

# Simplify memory bridge (manual edit)
# - Remove pre-execution loading
# - Keep only lazy retrieval methods
```

**Verification**:

- ✅ ChromaDB storage remains
- ✅ Neo4j graph remains
- ✅ Dual storage pattern remains
- ❌ Pre-execution loading deleted
- ❌ State enhancement deleted

**Result**: 1,200 LOC → 400 LOC (67% reduction)

---

### ✅ Task 5: Verify Checkpoint Module (No Purge Needed)

**Library**: `@hive-academy/langgraph-checkpoint`

**Status**: ✅ Already minimal (400 LOC)

**No Purge Required** - This module is already correctly implemented as a thin NestJS DI bridge.

**Files**:

```
libs/langgraph-modules/checkpoint/src/lib/
  core/
    checkpoint-manager.service.ts       ✅ 98 LOC (thin wrapper)
    checkpoint-saver-registry.ts        ✅ 100 LOC (DI registry)
  types/
    checkpoint.types.ts                 ✅ Type definitions
```

**Verification**:

- ✅ Already follows thin layer pattern
- ✅ Returns native LangGraph savers
- ✅ Provides NestJS DI bridge only

**Result**: 400 LOC → 400 LOC (0% change - already optimal)

---

## Purge Execution Plan

### Stage 1: Parallel Purge (All Libraries Simultaneously)

Execute these tasks in parallel using separate git branches:

```bash
# Create purge branches
git checkout -b purge/functional-api
git checkout -b purge/workflow-engine
git checkout -b purge/multi-agent
git checkout -b purge/memory

# Assign tasks
Task 1: Purge functional-api services    → Branch: purge/functional-api
Task 2: Purge workflow-engine services   → Branch: purge/workflow-engine
Task 3: Purge multi-agent network        → Branch: purge/multi-agent
Task 4: Purge memory pre-execution       → Branch: purge/memory
Task 5: Verify checkpoint (no changes)   → No branch needed
```

### Stage 2: Merge Purge Branches

After all purge tasks complete:

```bash
# Merge all purge branches to main
git checkout main
git merge purge/functional-api
git merge purge/workflow-engine
git merge purge/multi-agent
git merge purge/memory

# Verify compilation
npm run build:libs

# Expected: Compilation will FAIL (services deleted but still referenced)
# This is EXPECTED - we'll fix in rebuild phase
```

### Stage 3: Fix Compilation (Remove Dead Imports)

```bash
# Remove service imports from index.ts files
# Remove service providers from module files
# Update CLAUDE.md documentation

# Verify decorators still work
npm run test -- --testPathPattern="decorator"
```

### Stage 4: Create Rebuild Tasks

After purge complete, create sequential rebuild tasks:

1. Rebuild functional-api execution (use StateGraph directly)
2. Rebuild workflow-engine execution (use graph.invoke() directly)
3. Rebuild multi-agent execution (use subgraphs directly)
4. Rebuild memory integration (lazy loading via store parameter)

---

## Purge Metrics

| Library             | Before         | After         | Deleted        | Reduction |
| ------------------- | -------------- | ------------- | -------------- | --------- |
| **Functional-API**  | 5,511 LOC      | 434 LOC       | 5,077 LOC      | 92%       |
| **Workflow-Engine** | 12,098 LOC     | 1,500 LOC     | 10,598 LOC     | 87%       |
| **Multi-Agent**     | 19,095 LOC     | 4,500 LOC     | 14,595 LOC     | 76%       |
| **Memory**          | 1,200 LOC      | 400 LOC       | 800 LOC        | 67%       |
| **Checkpoint**      | 400 LOC        | 400 LOC       | 0 LOC          | 0%        |
| **TOTAL**           | **38,304 LOC** | **7,234 LOC** | **31,070 LOC** | **81%**   |

---

## Post-Purge State

### What Remains:

- ✅ All decorators (@Workflow, @Agent, @MultiAgent, @Node, @Edge, @Tool)
- ✅ Decorator validation and metadata collection
- ✅ Type definitions
- ✅ NestJS module setup
- ✅ Checkpoint thin layer
- ✅ Memory dual storage (ChromaDB + Neo4j)
- ✅ LLM provider abstraction
- ✅ Command processor

### What's Deleted:

- ❌ All graph builders (use StateGraph directly)
- ❌ All execution engines (use graph.invoke() directly)
- ❌ All streaming services (use graph.stream() directly)
- ❌ All state transformers (use RunnableConfig pattern)
- ❌ All network managers (use subgraphs directly)
- ❌ All pre-execution memory loading (use lazy loading)

### What's Broken (Expected):

- ❌ Workflow execution (will rebuild with StateGraph)
- ❌ Multi-agent execution (will rebuild with subgraphs)
- ❌ Streaming (will rebuild with graph.stream())
- ❌ Memory integration (will rebuild with lazy loading)

---

## Next Steps After Purge

1. **Verify Purge Complete**: All targeted files deleted, decorators remain
2. **Update Exports**: Remove deleted services from index.ts
3. **Update Documentation**: Mark purged services as deleted in CLAUDE.md
4. **Commit Purge**: Commit all deletions with message: `chore(langgraph): purge over-engineered service layer`
5. **Create Rebuild Plan**: Sequential rebuild tasks using direct LangGraph APIs

---

## Success Criteria

- ✅ 31,070 LOC deleted (81% reduction)
- ✅ All decorators still present and functional
- ✅ Type definitions preserved
- ✅ Metadata collection intact
- ✅ NestJS DI setup intact
- ⚠️ Compilation fails (expected - services deleted but referenced)
- ⚠️ Tests fail (expected - will fix in rebuild)

**Status**: Ready for parallel purge execution
