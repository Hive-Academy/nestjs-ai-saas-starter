# Migration Plan: LangGraph Architecture Realignment

## Executive Summary

**Goal**: Eliminate over-engineered code, then rebuild correctly using LangGraph's built-in features.

**Approach**: Clean slate migration - remove bad code first, then add good code.

**Timeline**: 4 phases over 3-4 weeks

**Key Principle**: NO versioning (no v1/v2, no "new"/"old", no "simplified"). Direct replacement only.

---

## Phase 1: Elimination (Week 1)

### Goal: Remove Over-Engineered Code

**What Gets Deleted**:

1. `libs/langgraph-modules/checkpoint/` - Entire module (~500 LOC)
2. `libs/langgraph-modules/memory/` - Entire module (~1,500 LOC)
3. `libs/langgraph-modules/multi-agent/src/lib/network/network-manager.service.ts` (~600 LOC)
4. All manual state transformation code in `MultiAgentWorkflowBase`

**Migration Steps**:

### Step 1.1: Identify Dependencies

```bash
# Find all imports of modules to be deleted
npx nx graph --affected
grep -r "@hive-academy/langgraph-checkpoint" apps/ libs/
grep -r "@hive-academy/langgraph-memory" apps/ libs/
grep -r "NetworkManagerService" apps/ libs/
```

**Output**: Document all files that import these modules in `task-tracking/TASK_2025_039/dependencies.md`

### Step 1.2: Create Compatibility Shims (Temporary)

**Purpose**: Allow codebase to compile while we migrate

```typescript
// libs/langgraph-modules/checkpoint/src/index.ts (temporary shim)
// TODO: Remove this entire file after migration
export class CheckpointSaverRegistry {
  constructor() {
    throw new Error('DEPRECATED: Use @hive-academy/langgraph-adapters CheckpointerAdapter instead');
  }
}
```

**Files to Shim**:

- `libs/langgraph-modules/checkpoint/src/index.ts`
- `libs/langgraph-modules/memory/src/index.ts`

### Step 1.3: Update All Import Statements

**Before**:

```typescript
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { MemoryModule } from '@hive-academy/langgraph-memory';
```

**After**:

```typescript
import { LangGraphAdaptersModule } from '@hive-academy/langgraph-adapters';
```

**Tools**:

```bash
# Automated replacement
find apps/ libs/ -name "*.ts" -exec sed -i 's/@hive-academy\/langgraph-checkpoint/@hive-academy\/langgraph-adapters/g' {} \;
find apps/ libs/ -name "*.ts" -exec sed -i 's/@hive-academy\/langgraph-memory/@hive-academy\/langgraph-adapters/g' {} \;
```

### Step 1.4: Delete Over-Engineered Modules

```bash
# ONLY after all imports updated and tests pass
rm -rf libs/langgraph-modules/checkpoint
rm -rf libs/langgraph-modules/memory
git add -A
git commit -m "refactor(langgraph): remove over-engineered checkpoint and memory modules"
```

**Validation**:

```bash
npx nx build --all
npx nx test --all
```

---

## Phase 2: Foundation (Week 2)

### Goal: Build Thin Adapter Layer

**What Gets Created**:

1. `libs/langgraph-modules/adapters/` - Thin NestJS → LangGraph bridge
2. Updated `DeclarativeWorkflowBase` - Use adapters instead of custom logic
3. Updated `MultiAgentWorkflowBase` - Remove state transformation

**File Structure** (NO versioning):

```
libs/langgraph-modules/adapters/
├── src/
│   ├── lib/
│   │   ├── checkpointer.adapter.ts          # ✅ Clean name
│   │   ├── store.adapter.ts                 # ✅ Clean name
│   │   └── adapters.module.ts               # ✅ Clean name
│   └── index.ts
├── project.json
├── tsconfig.json
└── README.md
```

### Step 2.1: Implement Checkpointer Adapter

**File**: `libs/langgraph-modules/adapters/src/lib/checkpointer.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { MemorySaver } from '@langchain/langgraph';

export interface ICheckpointerAdapter {
  get(): MemorySaver;
}

@Injectable()
export class CheckpointerAdapter implements ICheckpointerAdapter {
  private readonly checkpointer: MemorySaver;

  constructor() {
    this.checkpointer = new MemorySaver();
  }

  get(): MemorySaver {
    return this.checkpointer;
  }
}
```

### Step 2.2: Implement Store Adapter

**File**: `libs/langgraph-modules/adapters/src/lib/store.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '@langchain/langgraph';

export interface IStoreAdapter {
  get(): InMemoryStore;
}

@Injectable()
export class StoreAdapter implements IStoreAdapter {
  private readonly store: InMemoryStore;

  constructor() {
    this.store = new InMemoryStore();
  }

  get(): InMemoryStore {
    return this.store;
  }
}
```

### Step 2.3: Create Adapters Module

**File**: `libs/langgraph-modules/adapters/src/lib/adapters.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CheckpointerAdapter } from './checkpointer.adapter.js';
import { StoreAdapter } from './store.adapter.js';

@Module({
  providers: [
    { provide: 'CHECKPOINTER_ADAPTER', useClass: CheckpointerAdapter },
    { provide: 'STORE_ADAPTER', useClass: StoreAdapter },
  ],
  exports: ['CHECKPOINTER_ADAPTER', 'STORE_ADAPTER'],
})
export class LangGraphAdaptersModule {}
```

**Validation**:

```bash
npx nx build @hive-academy/langgraph-adapters
npx nx test @hive-academy/langgraph-adapters
```

---

## Phase 3: Core Refactoring (Week 3)

### Goal: Update Workflow Base Classes to Use LangGraph Correctly

### Step 3.1: Update DeclarativeWorkflowBase (Direct Replacement)

**File**: `libs/langgraph-modules/workflow-engine/src/lib/base/declarative-workflow.base.ts`

**Strategy**: Replace entire implementation, keep same file name

**Before** (Complex):

```typescript
// 300 LOC with manual graph building, state transformation, etc.
export class DeclarativeWorkflowBase<TState> extends UnifiedWorkflowBase<TState> {
  // Complex constructor with 6 dependencies
  // Manual graph building
  // Manual state transformation
}
```

**After** (Simple):

```typescript
import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ICheckpointerAdapter, IStoreAdapter } from '@hive-academy/langgraph-adapters';

@Injectable()
export abstract class DeclarativeWorkflowBase<TState> implements OnModuleInit {
  protected readonly logger: Logger;
  private compiledGraph?: ReturnType<StateGraph<TState>['compile']>;

  constructor(
    @Inject('CHECKPOINTER_ADAPTER') protected readonly checkpointer: ICheckpointerAdapter,
    @Inject('STORE_ADAPTER') protected readonly store: IStoreAdapter
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async onModuleInit(): Promise<void> {
    const builder = new StateGraph<TState>(this.getStateAnnotation());

    // Extract entrypoints from decorators
    const entrypoints = this.getEntrypoints();
    entrypoints.forEach((ep) => {
      builder.addNode(ep.name, this[ep.methodName].bind(this));
    });

    // Set entry point
    builder.addEdge('__start__', entrypoints[0].name);

    // ✅ Compile with LangGraph's built-ins
    this.compiledGraph = builder.compile({
      checkpointer: this.checkpointer.get(),
      store: this.store.get(),
    });
  }

  async execute(input: TState, config?: RunnableConfig): Promise<TState> {
    if (!this.compiledGraph) {
      throw new Error('Workflow not initialized');
    }

    // ✅ Pure LangGraph invocation
    return await this.compiledGraph.invoke(input, config);
  }

  protected abstract getStateAnnotation(): any;
  protected abstract getEntrypoints(): Array<{ name: string; methodName: string }>;
}
```

**LOC Reduction**: 300 LOC → 80 LOC

### Step 3.2: Update MultiAgentWorkflowBase (Direct Replacement)

**File**: `libs/langgraph-modules/multi-agent/src/lib/base/multi-agent-workflow.base.ts`

**Key Changes**:

1. Remove `enhancedState` pattern
2. Remove manual `metadata` mixing into state
3. Use `RunnableConfig` for configuration
4. Remove `NetworkManagerService` dependency

**Before**:

```typescript
async executeWorkflow(state: any) {
  // ❌ Manual state transformation
  const enhancedState = {
    ...state,
    metadata: {
      executionId: this.generateId(),
      threadId: this.generateThreadId(),
      networkId: this.networkId
    }
  };

  return await this.networkManager.executeWorkflow(this.networkId, enhancedState);
}
```

**After**:

```typescript
async executeWorkflow(input: TState, userId: string) {
  if (!this.compiledGraph) {
    throw new Error('Workflow not initialized');
  }

  // ✅ Pure state, config separate
  return await this.compiledGraph.invoke(
    input,  // ✅ Pure domain state only
    {
      configurable: {
        thread_id: `user:${userId}`,
        user_id: userId
      }
    }
  );
}
```

### Step 3.3: Remove NetworkManagerService

**File to Delete**: `libs/langgraph-modules/multi-agent/src/lib/network/network-manager.service.ts`

**Reason**: LangGraph's `compile()` handles what NetworkManagerService was trying to do

**Replacement**: Each workflow service compiles its own graph once during initialization

---

## Phase 4: Integration & Testing (Week 4)

### Goal: Update All Workflows to Use New Pattern

### Step 4.1: Update DevBrand Workflows

**Files to Update**:

1. `apps/dev-brand-api/src/app/business-workflows/agents/github-code-analyzer/github-code-analyzer.agent.ts`
2. `apps/dev-brand-api/src/app/business-workflows/agents/personal-brand-strategist/personal-brand-strategist.agent.ts`
3. `apps/dev-brand-api/src/app/business-workflows/agents/content-creator/content-creator.agent.ts`
4. `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`

**Pattern** (Same for all):

**Before**:

```typescript
@Agent({ id: 'github-code-analyzer' })
export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase<AgentState> {
  constructor(
    private readonly llmProvider: LlmProviderService // ... 6+ other dependencies
  ) {
    super(
      eventEmitter,
      graphBuilder,
      subgraphManager,
      metadataProcessor,
      streamService,
      eventProcessor
    );
  }
}
```

**After**:

```typescript
@Agent({ id: 'github-code-analyzer' })
export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase<AgentState> {
  constructor(
    @Inject('CHECKPOINTER_ADAPTER') checkpointer: ICheckpointerAdapter,
    @Inject('STORE_ADAPTER') store: IStoreAdapter,
    private readonly llmProvider: LlmProviderService // ... business logic dependencies
  ) {
    super(checkpointer, store);
  }

  @Entrypoint()
  async analyze(state: AgentState): Promise<Partial<AgentState>> {
    // ✅ Pure business logic - NO metadata handling
    const analysis = await this.analyzeGitHub(state);
    return { messages: [...state.messages, analysis] };
  }

  protected getStateAnnotation() {
    return AgentStateAnnotation;
  }

  protected getEntrypoints() {
    return [{ name: 'analyze', methodName: 'analyze' }];
  }
}
```

### Step 4.2: Update Module Imports

**File**: `apps/dev-brand-api/src/app/app.module.ts`

**Before**:

```typescript
@Module({
  imports: [
    CheckpointModule.forRoot({ storage: 'redis' }),
    MemoryModule.forRoot({ chromaDb: { url: process.env.CHROMADB_URL } }),
    MultiAgentModule.forRoot(getMultiAgentConfig()),
    WorkflowEngineModule.forRoot(getWorkflowEngineConfig()),
  ]
})
```

**After**:

```typescript
@Module({
  imports: [
    LangGraphAdaptersModule,  // ✅ Thin adapters only
    MultiAgentModule.forRoot(getMultiAgentConfig()),
    WorkflowEngineModule.forRoot(getWorkflowEngineConfig()),
  ]
})
```

### Step 4.3: Integration Testing

**Test File**: `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.integration.spec.ts`

```typescript
describe('DevBrand Supervisor Workflow (After Migration)', () => {
  it('should execute without checkpointer undefined errors', async () => {
    const result = await workflow.execute(
      { messages: [{ role: 'user', content: 'test' }] },
      { configurable: { thread_id: 'test-thread', user_id: 'test-user' } }
    );

    expect(result).toBeDefined();
    expect(result.messages).toBeDefined();
    expect(result.metadata).toBeUndefined(); // ✅ No metadata in state
  });

  it('should have checkpointer available', async () => {
    const checkpoints = await workflow.getCheckpoints('test-thread');
    expect(checkpoints).toBeDefined();
  });
});
```

---

## File Naming Convention (NO VERSIONING)

### ✅ CORRECT (Clean Names):

```
checkpointer.adapter.ts        # Not checkpointer-adapter-v2.ts
store.adapter.ts               # Not store-adapter-new.ts
declarative-workflow.base.ts   # Not declarative-workflow-simplified.base.ts
multi-agent-workflow.base.ts   # Not multi-agent-workflow-v2.base.ts
```

### ❌ FORBIDDEN (Versioned Names):

```
checkpointer.adapter.v1.ts
checkpointer.adapter.v2.ts
checkpointer.adapter.new.ts
checkpointer.adapter.simplified.ts
checkpointer.adapter.legacy.ts
```

### Migration Strategy for File Names:

1. **Delete old file completely**
2. **Create new file with SAME name**
3. **New implementation replaces old**

**Example**:

```bash
# Step 1: Delete old implementation
git rm libs/langgraph-modules/workflow-engine/src/lib/base/declarative-workflow.base.ts

# Step 2: Create new implementation with SAME name
# (Write new code to declarative-workflow.base.ts)

# Step 3: Commit as replacement
git add libs/langgraph-modules/workflow-engine/src/lib/base/declarative-workflow.base.ts
git commit -m "refactor(workflow-engine): replace DeclarativeWorkflowBase with LangGraph-aligned implementation"
```

---

## Git Commit Strategy

### Commit Message Format:

```
refactor(<scope>): <action> <component>

<details>

Breaking Changes: <if any>
Migration: <migration notes>
```

### Example Commits:

```bash
# Phase 1
git commit -m "refactor(checkpoint): remove over-engineered checkpoint module

Deleted libs/langgraph-modules/checkpoint (~500 LOC)
Replaced with thin CheckpointerAdapter in langgraph-adapters

Breaking Changes: CheckpointModule.forRoot() no longer exists
Migration: Import LangGraphAdaptersModule instead"

# Phase 2
git commit -m "feat(adapters): add thin LangGraph adapter layer

Created libs/langgraph-modules/adapters with:
- CheckpointerAdapter (wraps MemorySaver)
- StoreAdapter (wraps InMemoryStore)
- LangGraphAdaptersModule (NestJS DI bridge)

Migration: Use @Inject('CHECKPOINTER_ADAPTER') instead of manual checkpoint management"

# Phase 3
git commit -m "refactor(workflow-engine): replace DeclarativeWorkflowBase with LangGraph-aligned implementation

Replaced 300 LOC implementation with 80 LOC using LangGraph correctly
- Removed manual state transformation
- Removed manual checkpointer management
- Use StateGraph.compile({ checkpointer, store })

Breaking Changes: Constructor signature changed
Migration: Pass ICheckpointerAdapter and IStoreAdapter via DI"
```

---

## Validation Checklist

### After Phase 1 (Elimination):

- [ ] All tests pass: `npx nx test --all`
- [ ] All builds succeed: `npx nx build --all`
- [ ] No imports of deleted modules: `grep -r "@hive-academy/langgraph-checkpoint" apps/ libs/`
- [ ] Codebase compiles with TypeScript strict mode

### After Phase 2 (Foundation):

- [ ] Adapters module builds: `npx nx build @hive-academy/langgraph-adapters`
- [ ] Adapters have 100% test coverage
- [ ] Integration with NestJS DI verified

### After Phase 3 (Core Refactoring):

- [ ] DeclarativeWorkflowBase updated and tested
- [ ] MultiAgentWorkflowBase updated and tested
- [ ] NetworkManagerService deleted
- [ ] All workflow-engine tests pass

### After Phase 4 (Integration):

- [ ] All workflows updated to new pattern
- [ ] All integration tests pass
- [ ] No "checkpointer undefined" errors
- [ ] No "state.messages undefined" errors
- [ ] No "state.metadata undefined" errors
- [ ] Production-ready validation

---

## Rollback Strategy

### If Migration Fails:

**DO NOT create v1/v2 versions**

Instead:

1. Revert commits: `git revert <commit-hash>`
2. Fix issues
3. Re-apply migration

**Example**:

```bash
# If Phase 3 fails
git revert HEAD~5..HEAD  # Revert last 5 commits
git log --oneline  # Verify clean state
# Fix issues
# Re-run Phase 3 with fixes
```

---

## Success Metrics

### Quantitative:

- **LOC Reduction**: -2,850 LOC (from ~5,000 to ~2,150)
- **Bug Resolution**: 5/5 critical bugs resolved (100%)
- **Test Coverage**: Maintain 80%+ coverage
- **Build Time**: <5 minutes for full build

### Qualitative:

- ✅ Zero "checkpointer undefined" errors
- ✅ Zero "state.messages undefined" errors
- ✅ Zero "state.metadata undefined" errors
- ✅ Codebase aligns with LangGraph architecture
- ✅ Developer API unchanged (same decorators)

---

## Timeline Summary

| Week | Phase            | Goal                        | Deliverable                       |
| ---- | ---------------- | --------------------------- | --------------------------------- |
| 1    | Elimination      | Remove over-engineered code | Deleted checkpoint/memory modules |
| 2    | Foundation       | Build thin adapters         | Working adapters module           |
| 3    | Core Refactoring | Update base classes         | Updated workflow-engine           |
| 4    | Integration      | Migrate all workflows       | Production-ready system           |

**Total**: 4 weeks, -2,850 LOC, 100% bug resolution

---

## Next Steps

1. **Review this migration plan**
2. **Approve approach** (no versioning, direct replacement)
3. **Begin Phase 1** (Elimination)
4. **Track progress** in `task-tracking/TASK_2025_039/`

**Ready to proceed with Phase 1?**
