# Implementation Plan - FunctionalAPI Module

**Task**: TASK_2025_008
**Module**: FunctionalAPI
**Effort Estimate**: 9 hours
**Related Files**: See implementation-plan-overview.md for shared patterns

---

## Module Overview

**Target Services**:

- `WorkflowRegistrationService` - Workflow composition relationships (5 hours)
- `FunctionalWorkflowService` - Workflows as agents (4 hours)

**Integration Goals**:

- Store workflow composition patterns with hierarchical namespaces
- Track workflow executions as agents for learning
- Enable composition pattern discovery via semantic search
- Apply learned optimizations from agent context

---

## Integration 4.1: Workflow Composition Relationships (5 hours)

### Service Details

**Service**: `WorkflowRegistrationService`
**File**: `libs/langgraph-modules/functional-api/src/lib/services/workflow-registration.service.ts`

### Current State (Evidence)

```typescript
// Line 382, 440, 521, 601, 662, 717 (verified): Generic storage
await this.memoryAdapter.store(workflowRegistrationId, JSON.stringify(workflowMetadata), metadata);
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

@Injectable()
export class WorkflowRegistrationService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Register workflow composition pattern
   * Phase 2: Store-based composition tracking
   */
  async registerWorkflowComposition(
    workflowClass: Type<any>,
    metadata: WorkflowMetadata
  ): Promise<void> {
    // 1. Standard registration (blocking)
    await this.registerWorkflowLogic(workflowClass, metadata);

    // 2. Store composition pattern (non-blocking)
    if (this.memoryAdapter) {
      this.storeCompositionPattern(workflowClass, metadata).catch((error) => {
        this.logger.warn('Failed to store composition pattern:', error);
      });
    }
  }

  /**
   * Store workflow composition in Store
   * Phase 2: Hierarchical namespace for compositions
   */
  private async storeCompositionPattern(
    workflowClass: Type<any>,
    metadata: WorkflowMetadata
  ): Promise<void> {
    const store: Store = this.memoryAdapter!.getStore(
      STORE_COLLECTIONS.FUNCTIONAL_API.COMPOSITIONS
    );

    // Analyze composition structure
    const composition = {
      tasks: metadata.tasks.map((t) => ({
        name: t.name,
        dependencies: t.dependsOn || [],
      })),
      edges: metadata.edges.map((e) => ({
        from: e.from,
        to: e.to,
      })),
      decoratorCount: this.countDecorators(metadata),
      complexity: this.calculateCompositionComplexity(metadata),
    };

    // Store with hierarchical namespace
    await store.put(['compositions', workflowClass.name, 'structure'], composition);

    this.logger.debug(`Stored composition pattern: ${workflowClass.name}`);
  }

  /**
   * Discover similar successful compositions
   * Phase 2: Store semantic search
   */
  async discoverSimilarCompositions(
    taskCount: number,
    dependencyCount: number,
    query: string
  ): Promise<CompositionPattern[]> {
    if (!this.memoryAdapter) {
      return [];
    }

    const store: Store = this.memoryAdapter.getStore(STORE_COLLECTIONS.FUNCTIONAL_API.COMPOSITIONS);

    try {
      const results = await store.search(
        ['compositions'], // Search all compositions
        `${taskCount} tasks ${dependencyCount} dependencies ${query}`
      );

      return results.map((item) => ({
        workflowName: item.key,
        composition: item.value,
        similarity: item.score || 0,
      }));
    } catch (error) {
      this.logger.warn('Failed to discover similar compositions:', error);
      return [];
    }
  }

  /**
   * Get optimal composition pattern for task structure
   */
  async suggestCompositionOptimizations(
    proposedComposition: WorkflowComposition
  ): Promise<CompositionSuggestion[]> {
    const taskCount = proposedComposition.tasks.length;
    const dependencyCount = proposedComposition.edges.length;

    // Find similar successful compositions
    const similar = await this.discoverSimilarCompositions(
      taskCount,
      dependencyCount,
      'successful high-performance'
    );

    if (similar.length === 0) {
      return [];
    }

    // Analyze patterns and generate suggestions
    return this.generateSuggestions(proposedComposition, similar);
  }

  private countDecorators(metadata: WorkflowMetadata): number {
    return metadata.tasks.length + (metadata.edges?.length || 0) + (metadata.nodes?.length || 0);
  }

  private calculateCompositionComplexity(metadata: WorkflowMetadata): number {
    const taskCount = metadata.tasks.length;
    const dependencyCount = metadata.tasks.reduce(
      (sum, task) => sum + (task.dependsOn?.length || 0),
      0
    );

    return dependencyCount / Math.max(taskCount, 1);
  }

  private generateSuggestions(
    proposed: WorkflowComposition,
    similar: CompositionPattern[]
  ): CompositionSuggestion[] {
    const suggestions: CompositionSuggestion[] = [];

    // Find common patterns in successful compositions
    const avgComplexity =
      similar.reduce((sum, p) => sum + p.composition.complexity, 0) / similar.length;

    if (proposed.complexity > avgComplexity * 1.5) {
      suggestions.push({
        type: 'simplify',
        message: `Composition complexity (${proposed.complexity.toFixed(
          2
        )}) is higher than similar successful workflows (${avgComplexity.toFixed(2)})`,
        recommendation: 'Consider breaking into smaller workflows or reducing dependencies',
      });
    }

    return suggestions;
  }
}

/**
 * Supporting interfaces
 */
interface WorkflowComposition {
  tasks: Array<{ name: string; dependencies: string[] }>;
  edges: Array<{ from: string; to: string }>;
  complexity: number;
}

interface CompositionPattern {
  workflowName: string;
  composition: any;
  similarity: number;
}

interface CompositionSuggestion {
  type: 'simplify' | 'optimize' | 'restructure';
  message: string;
  recommendation: string;
}
```

### Evidence

- Current usage: `workflow-registration.service.ts:382, 440, 521, 601, 662, 717`
- Store interface: `memory-adapter.interface.ts:60-100`

### Testing Requirements

**Unit Tests**:

- Composition pattern storage and discovery
- Composition complexity calculation
- Suggestion generation accuracy
- Graceful degradation without memory adapter

**Integration Tests**:

- Similarity search with various compositions
- Real Store operations with composition patterns
- Performance: Composition discovery <200ms

**Test Cases** (see implementation-plan-hitl.md for similar test structure)

---

## Integration 4.2: Workflows as Agents (4 hours)

### Service Details

**Service**: `FunctionalWorkflowService`
**File**: `libs/langgraph-modules/functional-api/src/lib/services/functional-workflow.service.ts`

### Current State (Evidence)

```typescript
// Workflows executed without agent tracking
async executeWorkflow<TState>(
  workflowName: string,
  options: WorkflowExecutionOptions
): Promise<WorkflowExecutionResult<TState>>
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, AgentState, AgentMemoryContext } from '@hive-academy/langgraph-core';

@Injectable()
export class FunctionalWorkflowService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Execute workflow with agent tracking
   * Phase 2: Workflows tracked as agents
   */
  async executeWorkflow<TState>(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    // 1. Get workflow's learned patterns (non-blocking on failure)
    const workflowContext = await this.getWorkflowContext(workflowName, options).catch((error) => {
      this.logger.debug('No workflow context available:', error);
      return null;
    });

    // 2. Execute workflow (core operation)
    const startTime = Date.now();
    const result = await this.executeWorkflowLogic<TState>(workflowName, options, workflowContext);
    const executionTime = Date.now() - startTime;

    // 3. Store workflow execution as agent (non-blocking)
    if (this.memoryAdapter) {
      this.storeWorkflowExecution(workflowName, result, executionTime).catch((error) => {
        this.logger.warn('Failed to store workflow execution:', error);
      });
    }

    return result;
  }

  /**
   * Get workflow agent context
   * Phase 2: Retrieve workflow's learned patterns
   */
  private async getWorkflowContext(
    workflowName: string,
    options: WorkflowExecutionOptions
  ): Promise<AgentMemoryContext | null> {
    if (!this.memoryAdapter) return null;

    const state: AgentState = {
      messages: [],
      agentId: `workflow-${workflowName}`,
      metadata: {
        workflowType: 'functional',
        inputSize: JSON.stringify(options.initialState || {}).length,
      },
    };

    return await this.memoryAdapter.getAgentContext(state);
  }

  /**
   * Execute workflow with learned optimizations
   */
  private async executeWorkflowLogic<TState>(
    workflowName: string,
    options: WorkflowExecutionOptions,
    context: AgentMemoryContext | null
  ): Promise<WorkflowExecutionResult<TState>> {
    // Apply learned optimizations from context
    const enhancedOptions = context ? this.applyLearnedOptimizations(options, context) : options;

    // Execute workflow
    return await this.internalExecute<TState>(workflowName, enhancedOptions);
  }

  /**
   * Apply learned optimizations from agent context
   */
  private applyLearnedOptimizations(
    options: WorkflowExecutionOptions,
    context: AgentMemoryContext
  ): WorkflowExecutionOptions {
    // Extract successful patterns
    const successfulExecutions = context.agentMemories
      .filter((m) => m.success === true)
      .slice(0, 5);

    if (successfulExecutions.length === 0) {
      return options;
    }

    // Apply common optimizations
    return {
      ...options,
      // Example: Use learned timeout values
      timeout: this.calculateOptimalTimeout(successfulExecutions),
    };
  }

  private calculateOptimalTimeout(executions: any[]): number {
    const avgExecutionTime =
      executions.reduce((sum, exec) => sum + (exec.executionTime || 5000), 0) / executions.length;

    // Set timeout to 2x average execution time
    return Math.ceil(avgExecutionTime * 2);
  }

  /**
   * Store workflow execution as agent
   * Phase 2: storeAgentExecution for workflows
   */
  private async storeWorkflowExecution(
    workflowName: string,
    result: WorkflowExecutionResult<any>,
    executionTime: number
  ): Promise<void> {
    const state: AgentState = {
      messages: [],
      metadata: {
        workflowType: 'functional',
        workflowName,
      },
    };

    const agentResult = {
      executionTime,
      success: result.success,
      taskResults: result.taskResults || {},
      errorCount: result.errors?.length || 0,
      completionRate: this.calculateCompletionRate(result),
    };

    await this.memoryAdapter!.storeAgentExecution(state, agentResult, `workflow-${workflowName}`);

    this.logger.debug(`Stored workflow execution: ${workflowName}`);
  }

  private calculateCompletionRate(result: WorkflowExecutionResult<any>): number {
    if (!result.taskResults) return 0;

    const totalTasks = Object.keys(result.taskResults).length;
    const completedTasks = Object.values(result.taskResults).filter((r) => r.success).length;

    return totalTasks > 0 ? completedTasks / totalTasks : 0;
  }
}
```

### Evidence

- `getAgentContext` interface: `memory-adapter.interface.ts:115`
- `storeAgentExecution` interface: `memory-adapter.interface.ts:121-125`
- Current execution: `functional-workflow.service.ts:978, 987, 995`

### Testing Requirements

**Unit Tests**:

- Workflow context retrieval and optimization application
- Agent execution tracking with completion metrics
- Learned timeout calculation
- Graceful degradation without memory adapter

**Integration Tests**:

- Agent execution tracking with real workflows
- Workflow context retrieval with multiple executions
- Performance: Context retrieval doesn't add >50ms to execution

**Test Cases** (see implementation-plan-workflow-engine.md for agent tracking test structure)

---

## Quality Gates

### Pre-Implementation Checklist

- [ ] Read implementation-plan-overview.md for shared patterns
- [ ] Verify WorkflowRegistrationService current state (lines 382, 440, 521, 601, 662, 717)
- [ ] Review agent execution pattern from workflow-engine module
- [ ] Check FunctionalAPI module CLAUDE.md for module conventions

### Implementation Checklist

- [ ] WorkflowRegistrationService composition tracking implemented
- [ ] FunctionalWorkflowService agent tracking implemented
- [ ] Optional injection pattern used (`@Optional() @Inject('IMemoryAdapter')`)
- [ ] Graceful degradation tested (works without memory adapter)
- [ ] Error handling tested (memory failures don't break workflow execution)
- [ ] Async non-blocking pattern used for memory operations
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written (real Store operations)
- [ ] Performance benchmarks met (composition discovery <200ms, context <50ms)
- [ ] JSDoc comments added (service + method level)
- [ ] Module CLAUDE.md updated with Phase 2 integration section

### Validation Checklist

- [ ] Build passes: `npx nx build @hive-academy/langgraph-functional-api`
- [ ] Tests pass: `npx nx test @hive-academy/langgraph-functional-api`
- [ ] Lint passes: `npx nx lint @hive-academy/langgraph-functional-api`
- [ ] Coverage: 80%+ maintained or improved
- [ ] No architectural violations detected
- [ ] Composition analysis accuracy validated

---

**Document Status**: COMPLETE ✅
**Next Module**: implementation-plan-time-travel.md
