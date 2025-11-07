# LangGraph Checkpoint Module

## Overview

**@hive-academy/langgraph-checkpoint** is a minimal NestJS wrapper around LangGraph's native checkpoint system, providing dependency injection for LangGraph checkpointers.

## Key Principle

**LangGraph handles ALL checkpoint operations automatically when you pass a checkpointer to `compile()`.**

This package provides:

1. Dependency injection bridge for NestJS modules
2. Query interface for checkpoint history
3. That's it. Everything else is LangGraph.

## What This Library Does

The checkpoint package is a **thin dependency injection wrapper** that:

- Registers user-provided LangGraph checkpointers (SqliteSaver, PostgresSaver, etc.)
- Exposes them via NestJS DI as `ICheckpointAdapter`
- Provides helper methods for querying checkpoint history
- **Does NOT create checkpoints** - LangGraph's `compile({ checkpointer })` handles that automatically

## Architecture (Simplified)

### Module Structure

```
@hive-academy/langgraph-checkpoint
├── checkpoint.module.ts              # NestJS module with auto-fallback
├── core/
│   ├── checkpoint-manager.service.ts # Thin facade (95 lines)
│   └── checkpoint-saver.registry.ts  # Saver management
├── adapters/
│   └── checkpoint-manager.adapter.ts # DI bridge to ICheckpointAdapter
└── interfaces/
    └── *.interface.ts                # TypeScript types
```

### Service Architecture

```typescript
// SIMPLIFIED ARCHITECTURE (4 providers total)

CheckpointModule
├── CheckpointSaverRegistry        // Manages user-provided LangGraph savers
├── CheckpointManagerService       // Thin wrapper (4 methods, 95 lines)
│   ├── getLangGraphSaver()       // CRITICAL: Returns native LangGraph saver
│   ├── listCheckpoints()         // Query helper
│   ├── loadCheckpoint()          // Query helper
│   └── cleanupCheckpoints()      // Maintenance helper
└── CheckpointManagerAdapter       // Implements ICheckpointAdapter from core
    └── Provided as 'ICheckpointAdapter' DI token
```

### Key Methods

1. **`getLangGraphSaver()`** - **MOST IMPORTANT**

   - Returns the actual LangGraph saver for `compile({ checkpointer })`
   - This is the only method you need for checkpoint creation

2. **`listCheckpoints()`** - Query helper

   - Thin wrapper around LangGraph's `saver.list()`
   - Used for debugging, UI displays, checkpoint history

3. **`loadCheckpoint()`** - Query helper

   - Thin wrapper around LangGraph's `saver.getTuple()`
   - Used for checkpoint inspection

4. **`cleanupCheckpoints()`** - Maintenance helper
   - Placeholder for cleanup logic (most savers don't expose this)

## Installation

```bash
npm install @hive-academy/langgraph-checkpoint
```

**Choose a LangGraph checkpoint saver:**

```bash
# For local development/testing
npm install @langchain/langgraph-checkpoint        # MemorySaver (auto-fallback)

# For production
npm install @langchain/langgraph-checkpoint-sqlite    # SQLite
npm install @langchain/langgraph-checkpoint-postgres  # PostgreSQL
npm install @langchain/langgraph-checkpoint-redis     # Redis
```

## Quick Start

### Zero-Config Development

```typescript
import { Module } from '@nestjs/common';
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    CheckpointModule.forRoot(), // Auto-fallback to MemorySaver
  ],
})
export class AppModule {}

// Console: "⚠️ No checkpoint saver provided - falling back to in-memory storage"
```

### Production Setup

```typescript
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

@Module({
  imports: [
    CheckpointModule.forRoot({
      saver: SqliteSaver.fromConnString('./data/checkpoints.db'),
    }),
  ],
})
export class ProductionModule {}

// Console: "✅ Checkpoint saver registered: sqlite (provided by user)"
```

### Async Configuration

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

@Module({
  imports: [
    CheckpointModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        saver: await PostgresSaver.fromConnString(config.get('DATABASE_URL')),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Usage Patterns

### ✅ CORRECT: Use LangGraph's Native Checkpointing

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ICheckpointAdapter } from '@hive-academy/langgraph-core';
import { StateGraph } from '@langchain/langgraph';

@Injectable()
export class WorkflowService {
  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter
  ) {}

  async createCheckpointedWorkflow() {
    // 1. Get native LangGraph saver from adapter
    const checkpointer = this.checkpointAdapter.getLangGraphSaver();

    // 2. Create your graph
    const graph = new StateGraph({
      /* ... */
    });
    // ... add nodes and edges ...

    // 3. Pass checkpointer to compile() - LangGraph handles everything
    const compiledGraph = graph.compile({ checkpointer });

    // 4. Execute with thread_id - checkpoints created automatically
    const result = await compiledGraph.invoke(
      { input: 'data' },
      { configurable: { thread_id: 'my-thread-123' } }
    );

    // LangGraph automatically:
    // - Creates checkpoints with ALL required fields
    // - Manages channel_versions tracking
    // - Maintains versions_seen for replay
    // - Handles checkpoint lifecycle

    return result;
  }

  async queryCheckpointHistory(threadId: string) {
    // 4. Query checkpoints using adapter helpers
    const history = await this.checkpointAdapter.listCheckpoints(threadId, {
      limit: 10,
    });

    const latestCheckpoint = await this.checkpointAdapter.loadCheckpoint(threadId);

    return { history, latestCheckpoint };
  }
}
```

### ❌ WRONG: Manual Checkpoint Creation

```typescript
// ❌ NEVER DO THIS - Creates malformed checkpoints
const checkpoint = {
  id: `checkpoint_${Date.now()}`,
  channel_values: state,
  // ❌ Missing channel_versions and versions_seen fields!
};
await checkpointAdapter.saveCheckpoint(threadId, checkpoint);
```

**Why This Is Wrong:**

- Missing required fields (`channel_versions`, `versions_seen`)
- Breaks LangGraph's replay mechanism
- Causes runtime errors in PregelLoop: `TypeError: Cannot read properties of undefined (reading '__input__')`

## Ecosystem Integration

### Multi-Agent Module

```typescript
// Multi-agent has WorkflowCheckpointService that wraps ICheckpointAdapter
@Injectable()
export class MultiAgentCoordinatorService {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async executeWorkflow(networkId: string, input: any) {
    const threadId = this.generateThreadId(networkId);

    // Get native saver for LangGraph
    const checkpointer = this.checkpointAdapter?.getLangGraphSaver();

    // Compile graph with checkpointer
    const graph = this.networkManager.createGraph(networkId);
    const compiledGraph = graph.compile({ checkpointer });

    // Execute - checkpoints automatic
    const config = {
      configurable: { thread_id: threadId },
    };

    return await compiledGraph.invoke(input, config);
  }

  async getCheckpointHistory(networkId: string) {
    const threadId = this.generateThreadId(networkId);

    // Query checkpoint history for debugging/UI
    return await this.checkpointAdapter?.listCheckpoints(threadId, {
      limit: 10,
    });
  }
}
```

### HITL Module

```typescript
// HITL module uses Neo4j for approval state storage (operational data)
// Checkpoints are for workflow state recovery only
@Injectable()
export class HitlApprovalService {
  constructor(
    @Inject('IHitlStorageAdapter')
    private readonly storage: IHitlStorageAdapter, // Neo4j storage

    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async saveApprovalState(request: HumanApprovalRequest) {
    // ✅ CORRECT: Store approval state in Neo4j (operational data)
    await this.storage.saveApprovalRequest(request);

    // LangGraph's automatic checkpointing handles workflow state
    // No manual checkpoint creation needed
  }
}
```

### Workflow Engine Module

```typescript
// Workflow-engine can provide OR consume checkpoint adapter
@Injectable()
export class WorkflowExecutionService {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async executeWorkflow(definition: WorkflowDefinition) {
    const checkpointer = this.checkpointAdapter?.getLangGraphSaver();

    // Build graph from definition
    const graph = this.buildGraph(definition);
    const compiledGraph = graph.compile({ checkpointer });

    // Execute with automatic checkpointing
    return await compiledGraph.invoke(definition.input, {
      configurable: {
        thread_id: this.generateThreadId(definition.id),
      },
    });
  }
}
```

## Storage Backends

Any LangGraph checkpoint saver works automatically:

| Storage    | Package                                    | Use Case          | Auto-Detection   |
| ---------- | ------------------------------------------ | ----------------- | ---------------- |
| Memory     | `@langchain/langgraph-checkpoint`          | Development/Tests | ✅ Auto-fallback |
| SQLite     | `@langchain/langgraph-checkpoint-sqlite`   | Local/Single-node | ✅ Auto-detected |
| PostgreSQL | `@langchain/langgraph-checkpoint-postgres` | Production        | ✅ Auto-detected |
| Redis      | `@langchain/langgraph-checkpoint-redis`    | High-performance  | ✅ Auto-detected |

## Migration from Previous Version

If you were using the old checkpoint package with manual checkpoint creation:

### Before (Manual Checkpoints - BROKEN)

```typescript
// ❌ OLD PATTERN: Manual checkpoint creation (malformed)
const checkpointManager = new CheckpointManagerService(
  registry,
  persistence,
  metrics,
  cleanup,
  health,
  transformer
);

await checkpointManager.saveCheckpoint(threadId, {
  id: `checkpoint_${Date.now()}`,
  channel_values: state,
  // Missing channel_versions and versions_seen!
});
```

### After (LangGraph Automatic - CORRECT)

```typescript
// ✅ NEW PATTERN: LangGraph automatic checkpointing
const checkpointer = checkpointAdapter.getLangGraphSaver();
const compiledGraph = graph.compile({ checkpointer });

// Execute with thread_id - checkpoints created automatically
await compiledGraph.invoke(input, {
  configurable: { thread_id: 'my-thread' },
});

// Query checkpoints using adapter helpers
const history = await checkpointAdapter.listCheckpoints('my-thread');
```

### Migration Steps

1. **Remove all manual `saveCheckpoint()` calls**

   - Delete any code that manually creates checkpoint objects
   - Remove calls to `checkpointManager.saveCheckpoint()`

2. **Pass checkpointer to `compile()`**

   - Get native saver: `const checkpointer = checkpointAdapter.getLangGraphSaver()`
   - Compile with checkpointer: `graph.compile({ checkpointer })`

3. **Use thread_id in config**

   - Execute with: `compiledGraph.invoke(input, { configurable: { thread_id: 'thread-123' } })`

4. **Query checkpoints using helpers**
   - List: `await checkpointAdapter.listCheckpoints(threadId)`
   - Load: `await checkpointAdapter.loadCheckpoint(threadId)`

## What Was Removed

From the original checkpoint package, we removed:

- **5 unused services** (90% of code):

  - `CheckpointPersistenceService` - Redundant wrapper around native saver
  - `CheckpointMetricsService` - No consumers
  - `CheckpointCleanupService` - No evidence of scheduled cleanup
  - `CheckpointHealthService` - No health check consumers
  - `StateTransformerService` - No transformation consumers

- **Manual checkpoint creation methods**:

  - All `saveCheckpoint()` implementations removed from consuming code
  - Manual checkpoint object creation eliminated

- **Complex type conversion logic**:
  - Removed "enhanced" vs "base" checkpoint type conversions
  - Direct use of LangGraph types

### Size Reduction

- **Before**: ~2000+ lines, 8 services, 40+ methods
- **After**: ~400 lines, 2 services, 4 methods
- **Reduction**: 80% code reduction, 75% service reduction

### What Remains

- **CheckpointSaverRegistry**: Manages user-provided LangGraph savers
- **CheckpointManagerService**: Thin wrapper (4 methods, 95 lines)
- **CheckpointManagerAdapter**: DI bridge to `ICheckpointAdapter` interface
- **Clean, simple API**: Direct exposure of LangGraph functionality

## Testing

```typescript
import { Test } from '@nestjs/testing';
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';

describe('Checkpoint Integration', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CheckpointModule.forRoot(), // Auto-fallback to MemorySaver
      ],
    }).compile();
  });

  it('should auto-fallback to memory storage', () => {
    // Tests automatically use in-memory storage
    // No external dependencies needed
  });
});
```

## Best Practices

1. **Development**: Use `CheckpointModule.forRoot()` for auto-fallback to MemorySaver
2. **Production**: Provide real saver with `CheckpointModule.forRootAsync()`
3. **Workflow Creation**: Always use `graph.compile({ checkpointer })` pattern
4. **Never** manually create checkpoint objects - let LangGraph handle it
5. **Querying**: Use `listCheckpoints()` and `loadCheckpoint()` for history/debugging
6. **HITL Approvals**: Store in Neo4j (operational data), not checkpoints (workflow state)

## Common Mistakes to Avoid

1. ❌ **Manual Checkpoint Creation**

   - Don't create checkpoint objects manually
   - Let `compile({ checkpointer })` handle it

2. ❌ **Mixing Operational and Workflow State**

   - Operational data (approvals, audit logs) → Neo4j/database
   - Workflow state (recovery points) → LangGraph checkpoints

3. ❌ **Ignoring `thread_id`**

   - Always include `configurable: { thread_id }` in invoke config
   - Without it, checkpoints won't be created

4. ❌ **Using Checkpoint System for Analytics**
   - Checkpoints are for recovery, not analytics
   - Use dedicated analytics/metrics storage

## Documentation Links

- [LangGraph Checkpointer Documentation](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [LangGraph Checkpoint Libraries](https://langchain-ai.github.io/langgraphjs/reference/checkpoint/)
- [Core Module ICheckpointAdapter Interface](../core/CLAUDE.md)
- [Multi-Agent Module Integration](../multi-agent/CLAUDE.md)
- [HITL Module Integration](../hitl/CLAUDE.md)

## Version

**v0.0.1** - Minimal NestJS wrapper around LangGraph's native checkpoint system

---

**Remember**: This package is a **dependency injection bridge**, not a checkpoint implementation. LangGraph does all the checkpoint work automatically.
