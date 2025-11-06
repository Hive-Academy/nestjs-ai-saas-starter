# @hive-academy/langgraph-checkpoint

> **Minimal NestJS Wrapper for LangGraph's Native Checkpoint System**

Provides dependency injection for LangGraph checkpointers with automatic fallback to in-memory storage. This package is a thin bridge that lets you use LangGraph's native checkpoint functionality in NestJS applications.

## Key Principle

**LangGraph handles ALL checkpoint operations automatically.**
This package provides dependency injection - nothing more, nothing less.

## What This Package Does

- Registers user-provided LangGraph checkpointers (SqliteSaver, PostgresSaver, etc.)
- Exposes them via NestJS DI as `ICheckpointAdapter`
- Provides helper methods for querying checkpoint history
- **Does NOT create checkpoints** - LangGraph's `compile({ checkpointer })` handles that

## Installation

```bash
npm install @hive-academy/langgraph-checkpoint

# Choose a LangGraph checkpoint saver
npm install @langchain/langgraph-checkpoint-sqlite    # SQLite (recommended for local)
npm install @langchain/langgraph-checkpoint-postgres  # PostgreSQL (recommended for production)
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
```

## Usage

### Create Checkpointed Workflow

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

  async createWorkflow() {
    // 1. Get native LangGraph saver
    const checkpointer = this.checkpointAdapter.getLangGraphSaver();

    // 2. Create and compile graph with checkpointer
    const graph = new StateGraph({
      /* ... */
    });
    const compiledGraph = graph.compile({ checkpointer });

    // 3. Execute with thread_id - checkpoints created automatically
    return await compiledGraph.invoke(
      { input: 'data' },
      { configurable: { thread_id: 'my-thread-123' } }
    );
  }

  async getHistory(threadId: string) {
    // Query checkpoint history
    return await this.checkpointAdapter.listCheckpoints(threadId, {
      limit: 10,
    });
  }
}
```

### What NOT to Do

```typescript
// ❌ WRONG: Manual checkpoint creation
const checkpoint = {
  id: `checkpoint_${Date.now()}`,
  channel_values: state,
  // Missing required fields - this will break LangGraph!
};
await checkpointAdapter.saveCheckpoint(threadId, checkpoint);

// ✅ CORRECT: Let LangGraph handle it
const checkpointer = checkpointAdapter.getLangGraphSaver();
const compiledGraph = graph.compile({ checkpointer });
await compiledGraph.invoke(input, { configurable: { thread_id } });
```

## Architecture

### Simplified Structure (4 providers)

```
CheckpointModule
├── CheckpointSaverRegistry        # Manages user-provided LangGraph savers
├── CheckpointManagerService       # Thin wrapper (4 methods, 95 lines)
│   ├── getLangGraphSaver()       # Returns native LangGraph saver
│   ├── listCheckpoints()         # Query helper
│   ├── loadCheckpoint()          # Query helper
│   └── cleanupCheckpoints()      # Maintenance helper
└── CheckpointManagerAdapter       # DI bridge to ICheckpointAdapter
```

### Key Methods

1. **`getLangGraphSaver()`** - Returns native LangGraph saver for `compile({ checkpointer })`
2. **`listCheckpoints()`** - Query checkpoint history
3. **`loadCheckpoint()`** - Load specific checkpoint
4. **`cleanupCheckpoints()`** - Maintenance helper

## Storage Backends

Any LangGraph checkpoint saver works automatically:

| Storage    | Package                                    | Use Case          |
| ---------- | ------------------------------------------ | ----------------- |
| Memory     | `@langchain/langgraph-checkpoint`          | Development/Tests |
| SQLite     | `@langchain/langgraph-checkpoint-sqlite`   | Local/Single-node |
| PostgreSQL | `@langchain/langgraph-checkpoint-postgres` | Production        |
| Redis      | `@langchain/langgraph-checkpoint-redis`    | High-performance  |

## Ecosystem Integration

### Multi-Agent Module

```typescript
@Injectable()
export class MultiAgentService {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async executeNetwork(networkId: string, input: any) {
    const checkpointer = this.checkpointAdapter?.getLangGraphSaver();
    const graph = this.createGraph(networkId);
    const compiled = graph.compile({ checkpointer });

    return await compiled.invoke(input, {
      configurable: { thread_id: this.generateThreadId(networkId) },
    });
  }
}
```

### HITL Module

HITL module stores approval state in Neo4j (operational data), not checkpoints (workflow state).

```typescript
@Injectable()
export class HitlApprovalService {
  constructor(
    @Inject('IHitlStorageAdapter')
    private readonly storage: IHitlStorageAdapter // Neo4j for approvals
  ) {}

  async saveApprovalState(request: HumanApprovalRequest) {
    // Store in Neo4j, not checkpoints
    await this.storage.saveApprovalRequest(request);
  }
}
```

### Workflow Engine Module

```typescript
@Injectable()
export class WorkflowEngine {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async execute(definition: WorkflowDefinition) {
    const checkpointer = this.checkpointAdapter?.getLangGraphSaver();
    const graph = this.buildGraph(definition);
    const compiled = graph.compile({ checkpointer });

    return await compiled.invoke(definition.input, {
      configurable: { thread_id: definition.id },
    });
  }
}
```

## Migration from Previous Version

### What Was Removed (90% of code)

- 5 unused services: Persistence, Metrics, Cleanup, Health, StateTransformer
- Manual checkpoint creation methods
- Complex type conversion logic
- 80% code reduction: ~2000 lines → ~400 lines

### Migration Steps

1. **Remove manual `saveCheckpoint()` calls**
2. **Use `compile({ checkpointer })` pattern**
3. **Query checkpoints using helpers**

```typescript
// Before (BROKEN)
await checkpointManager.saveCheckpoint(threadId, {
  id: Date.now(),
  channel_values: state,
});

// After (CORRECT)
const checkpointer = checkpointAdapter.getLangGraphSaver();
const compiled = graph.compile({ checkpointer });
await compiled.invoke(input, { configurable: { thread_id } });
```

## Best Practices

1. Always use `graph.compile({ checkpointer })` pattern
2. Never manually create checkpoint objects
3. Always include `configurable: { thread_id }` in invoke config
4. Store operational data (approvals, audit logs) in Neo4j, not checkpoints
5. Use checkpoints for workflow state recovery only

## Common Mistakes

- ❌ Manual checkpoint creation (creates malformed checkpoints)
- ❌ Missing `thread_id` in config (checkpoints won't be created)
- ❌ Using checkpoints for operational data (use Neo4j/database instead)
- ❌ Mixing workflow state with analytics (use dedicated storage)

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

  it('should work with automatic fallback', () => {
    // Tests use in-memory storage automatically
  });
});
```

## Documentation

- [Complete Implementation Guide](./CLAUDE.md) - Detailed technical documentation
- [LangGraph Checkpointer Docs](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [Core Module Integration](../core/CLAUDE.md)
- [Multi-Agent Integration](../multi-agent/CLAUDE.md)
- [HITL Integration](../hitl/CLAUDE.md)

## Version

**v0.0.1** - Minimal NestJS wrapper around LangGraph's native checkpoint system

---

**Remember**: This package is a **dependency injection bridge**, not a checkpoint implementation.
LangGraph does all the checkpoint work automatically when you use `compile({ checkpointer })`.
