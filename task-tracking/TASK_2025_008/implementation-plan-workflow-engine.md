# Implementation Plan - WorkflowEngine Module

**Task**: TASK_2025_008
**Module**: WorkflowEngine
**Effort Estimate**: 9 hours
**Related Files**: See implementation-plan-overview.md for shared patterns

---

## Module Overview

**Target Services**:

- `GraphOptimizationService` - Workflow pattern Store relationships (5 hours)
- `WorkflowGraphBuilderService` - Workflow builder as agent (4 hours)

**Integration Goals**:

- Store workflow compilation patterns with hierarchical namespaces
- Track workflow builder decisions as agent executions
- Enable workflow pattern discovery via semantic search
- Apply learned optimizations from agent context

---

## Integration 2.1: Workflow Pattern Store Relationships (5 hours)

### Service Details

**Service**: `GraphOptimizationService`
**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/graph-optimization.service.ts`

### Current State (Evidence)

```typescript
// Line 39, 99 (verified): String-based namespace search
const optimizationData = await this.memoryAdapter.search({
  query: 'graph optimization patterns',
  namespace: ['graphs.compilation.optimizations'], // String array, not Store
  limit: 10,
});
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

@Injectable()
export class GraphOptimizationService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Enhance workflow with optimization patterns from Store
   * Phase 2: Store-based pattern discovery
   */
  async enhanceWithOptimizationPatterns(definition: WorkflowDefinition, options: GraphBuilderOptions): Promise<GraphBuilderOptions> {
    if (!this.memoryAdapter) {
      return options; // No enhancement without memory
    }

    try {
      // 1. Classify workflow type
      const workflowType = this.classifyGraphType(definition);

      // 2. Discover patterns from Store
      const patterns = await this.discoverSimilarPatterns(workflowType, definition.nodes.length, definition.edges.length);

      // 3. Apply learned optimizations
      return this.applyOptimizationsFromPatterns(options, patterns);
    } catch (error) {
      this.logger.warn('Failed to enhance with patterns:', error);
      return options; // Graceful degradation
    }
  }

  /**
   * Discover similar workflow patterns using Store search
   * Phase 2: Hierarchical namespace semantic search
   */
  private async discoverSimilarPatterns(workflowType: string, nodeCount: number, edgeCount: number): Promise<WorkflowPattern[]> {
    const store: Store = this.memoryAdapter!.getStore(STORE_COLLECTIONS.WORKFLOW.PATTERNS);

    // Search within workflow type namespace
    const results = await store.search(
      ['workflows', workflowType], // All workflows of this type
      `${nodeCount} nodes ${edgeCount} edges fast compilation`
    );

    return results.map((item) => ({
      workflowName: item.key,
      optimizations: item.value.optimizations,
      performance: item.value.performance,
      similarity: item.score || 0,
    }));
  }

  /**
   * Store workflow compilation pattern
   * Phase 2: Store with hierarchical namespace
   */
  async storeWorkflowPattern(definition: WorkflowDefinition, compilationResult: CompilationResult): Promise<void> {
    if (!this.memoryAdapter) return;

    // Non-blocking storage
    this.storePatternAsync(definition, compilationResult).catch((error) => {
      this.logger.warn('Failed to store workflow pattern:', error);
    });
  }

  private async storePatternAsync(definition: WorkflowDefinition, result: CompilationResult): Promise<void> {
    const store: Store = this.memoryAdapter!.getStore(STORE_COLLECTIONS.WORKFLOW.PATTERNS);

    const workflowType = this.classifyGraphType(definition);

    // Hierarchical namespace: [collection, domain, workflowType, workflowName, subdomain]
    await store.put(['workflows', workflowType, definition.name, 'optimizations'], {
      optimizations: result.appliedOptimizations,
      performance: {
        compilationTime: result.duration,
        graphComplexity: result.complexity,
        nodeCount: definition.nodes.length,
        edgeCount: definition.edges.length,
      },
      timestamp: new Date(),
      success: result.success,
    });

    this.logger.debug(`Stored workflow pattern: ${definition.name}`);
  }

  /**
   * Classify graph type for pattern matching
   */
  private classifyGraphType(definition: WorkflowDefinition): string {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const complexity = edgeCount / Math.max(nodeCount, 1);

    if (nodeCount < 5) return 'simple';
    if (complexity > 2) return 'complex-branching';
    if (nodeCount > 20) return 'large';
    return 'standard';
  }

  /**
   * Apply optimizations from discovered patterns
   */
  private applyOptimizationsFromPatterns(options: GraphBuilderOptions, patterns: WorkflowPattern[]): GraphBuilderOptions {
    if (patterns.length === 0) return options;

    // Find best performing pattern
    const bestPattern = patterns.reduce((best, current) => (current.performance.compilationTime < best.performance.compilationTime ? current : best));

    // Apply optimizations
    return {
      ...options,
      enableCaching: bestPattern.optimizations.includes('caching'),
      parallelExecution: bestPattern.optimizations.includes('parallel'),
      // ... other optimizations
    };
  }
}
```

### Evidence

- Current search usage: `graph-optimization.service.ts:39, 99`
- Store interface: `memory-adapter.interface.ts:60-100`

### Testing Requirements

**Unit Tests**:

- Pattern discovery with various workflow types
- Workflow classification logic (simple, complex-branching, large, standard)
- Optimization application from discovered patterns
- Graceful degradation without memory adapter

**Integration Tests**:

- Store operations with real workflows
- Semantic search for similar workflow patterns
- Pattern storage with hierarchical namespaces
- Performance: Pattern discovery <150ms (95th percentile)

**Test Cases**:

```typescript
describe('GraphOptimizationService - Pattern Discovery', () => {
  let service: GraphOptimizationService;
  let mockMemoryAdapter: Partial<IMemoryAdapter>;
  let mockStore: Partial<Store>;

  beforeEach(() => {
    mockStore = {
      put: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
    };

    mockMemoryAdapter = {
      getStore: jest.fn().mockReturnValue(mockStore),
    };

    service = new GraphOptimizationService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );
  });

  it('should classify workflow types correctly', () => {
    const simpleWorkflow = { nodes: [1, 2, 3], edges: [1, 2] };
    expect(service['classifyGraphType'](simpleWorkflow)).toBe('simple');

    const complexWorkflow = { nodes: Array(10), edges: Array(25) };
    expect(service['classifyGraphType'](complexWorkflow)).toBe('complex-branching');

    const largeWorkflow = { nodes: Array(25), edges: Array(30) };
    expect(service['classifyGraphType'](largeWorkflow)).toBe('large');
  });

  it('should discover similar patterns via Store search', async () => {
    mockStore.search = jest.fn().mockResolvedValue([
      {
        key: 'workflow-1',
        value: {
          optimizations: ['caching', 'parallel'],
          performance: { compilationTime: 500 },
        },
        score: 0.92,
      },
    ]);

    const patterns = await service['discoverSimilarPatterns']('standard', 10, 15);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].workflowName).toBe('workflow-1');
    expect(patterns[0].similarity).toBe(0.92);
  });

  it('should apply optimizations from best pattern', () => {
    const patterns = [
      {
        workflowName: 'slow-workflow',
        optimizations: [],
        performance: { compilationTime: 1000 },
      },
      {
        workflowName: 'fast-workflow',
        optimizations: ['caching', 'parallel'],
        performance: { compilationTime: 300 },
      },
    ];

    const options = service['applyOptimizationsFromPatterns']({}, patterns);

    expect(options.enableCaching).toBe(true);
    expect(options.parallelExecution).toBe(true);
  });

  it('should store workflow pattern with hierarchical namespace', async () => {
    const definition = {
      name: 'test-workflow',
      nodes: Array(10),
      edges: Array(12),
    };

    const result = {
      appliedOptimizations: ['caching'],
      duration: 450,
      complexity: 1.2,
      success: true,
    };

    await service.storeWorkflowPattern(definition, result);

    // Wait for async storage
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockStore.put).toHaveBeenCalledWith(
      ['workflows', 'standard', 'test-workflow', 'optimizations'],
      expect.objectContaining({
        optimizations: ['caching'],
        performance: expect.objectContaining({
          compilationTime: 450,
        }),
      })
    );
  });

  it('should enhance options with discovered patterns', async () => {
    mockStore.search = jest.fn().mockResolvedValue([
      {
        key: 'optimized-workflow',
        value: {
          optimizations: ['caching'],
          performance: { compilationTime: 200 },
        },
      },
    ]);

    const definition = { name: 'new-workflow', nodes: Array(8), edges: Array(10) };
    const options = {};

    const enhanced = await service.enhanceWithOptimizationPatterns(definition, options);

    expect(enhanced.enableCaching).toBe(true);
  });
});
```

---

## Integration 2.2: Workflow Builder as Agent (4 hours)

### Service Details

**Service**: `WorkflowGraphBuilderService`
**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/workflow-graph-builder.service.ts`

### Current State (Evidence)

```typescript
// No agent tracking - builder decisions not stored
async buildFromDefinition<TState extends WorkflowState>(
  definition: WorkflowDefinition<TState>,
  options: GraphBuilderOptions
): Promise<StateGraph<TState>>
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, AgentState, AgentMemoryContext } from '@hive-academy/langgraph-core';

@Injectable()
export class WorkflowGraphBuilderService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter,
    private readonly graphOptimization: GraphOptimizationService // ... other dependencies
  ) {}

  /**
   * Build workflow graph with agent context and tracking
   * Phase 2: Builder tracked as agent
   */
  async buildFromDefinition<TState extends WorkflowState>(definition: WorkflowDefinition<TState>, options: GraphBuilderOptions = {}): Promise<StateGraph<TState>> {
    // 1. Get builder's learned patterns (non-blocking on failure)
    const builderContext = await this.getBuilderContext(definition).catch((error) => {
      this.logger.debug('No builder context available:', error);
      return null;
    });

    // 2. Enhance options with learned patterns
    const enhancedOptions = builderContext ? this.applyBuilderContext(options, builderContext) : options;

    // 3. Build graph (core operation)
    const startTime = Date.now();
    const graph = await this.buildGraphLogic(definition, enhancedOptions);
    const compilationTime = Date.now() - startTime;

    // 4. Store builder execution (non-blocking)
    if (this.memoryAdapter) {
      this.storeBuilderExecution(definition, compilationTime, enhancedOptions).catch((error) => {
        this.logger.warn('Failed to store builder execution:', error);
      });
    }

    return graph;
  }

  /**
   * Get workflow builder agent context
   * Phase 2: Retrieve builder's learned compilation strategies
   */
  private async getBuilderContext(definition: WorkflowDefinition): Promise<AgentMemoryContext | null> {
    if (!this.memoryAdapter) return null;

    const state: AgentState = {
      messages: [],
      agentId: 'workflow-graph-builder',
      metadata: {
        graphType: this.classifyGraphType(definition),
        nodeCount: definition.nodes.length,
        edgeCount: definition.edges.length,
      },
    };

    return await this.memoryAdapter.getAgentContext(state);
  }

  /**
   * Apply builder context to options
   */
  private applyBuilderContext(options: GraphBuilderOptions, context: AgentMemoryContext): GraphBuilderOptions {
    // Extract learned preferences from agent memories
    const learnedOptimizations = context.agentMemories
      .filter((m) => m.type === 'builder_execution')
      .filter((m) => m.success)
      .slice(0, 5); // Top 5 successful compilations

    // Apply common optimizations
    return {
      ...options,
      // Use learned preferences if available
      enableCaching: learnedOptimizations.some((m) => m.optimizations?.includes('caching')),
      parallelExecution: learnedOptimizations.some((m) => m.optimizations?.includes('parallel')),
    };
  }

  /**
   * Store builder agent execution
   * Phase 2: Track builder decisions for learning
   */
  private async storeBuilderExecution(definition: WorkflowDefinition, compilationTime: number, options: GraphBuilderOptions): Promise<void> {
    const state: AgentState = {
      messages: [],
      metadata: {
        graphType: this.classifyGraphType(definition),
        workflowName: definition.name,
      },
    };

    const result = {
      graphComplexity: this.calculateComplexity(definition),
      compilationTime,
      optimizationsApplied: this.extractAppliedOptimizations(options),
      success: compilationTime < 1000, // Success if <1 second
      performance: {
        nodeCount: definition.nodes.length,
        edgeCount: definition.edges.length,
        avgNodeComplexity: this.calculateAvgNodeComplexity(definition),
      },
    };

    await this.memoryAdapter!.storeAgentExecution(state, result, 'workflow-graph-builder');

    this.logger.debug(`Stored builder execution for ${definition.name}`);
  }

  private classifyGraphType(definition: WorkflowDefinition): string {
    // Reuse from GraphOptimizationService or implement here
    return 'standard'; // Simplified
  }

  private calculateComplexity(definition: WorkflowDefinition): number {
    return definition.edges.length / Math.max(definition.nodes.length, 1);
  }

  private extractAppliedOptimizations(options: GraphBuilderOptions): string[] {
    const optimizations: string[] = [];
    if (options.enableCaching) optimizations.push('caching');
    if (options.parallelExecution) optimizations.push('parallel');
    return optimizations;
  }

  private calculateAvgNodeComplexity(definition: WorkflowDefinition): number {
    // Simplified complexity calculation
    return (
      definition.nodes.reduce((sum, node) => {
        const hasConditions = !!node.conditional;
        const hasValidation = !!node.validator;
        return sum + (hasConditions ? 2 : 1) + (hasValidation ? 1 : 0);
      }, 0) / definition.nodes.length
    );
  }
}
```

### Evidence

- `getAgentContext` interface: `memory-adapter.interface.ts:115`
- `storeAgentExecution` interface: `memory-adapter.interface.ts:121-125`
- Pattern verified: Multi-agent `node-factory.service.ts:124, 157`

### Testing Requirements

**Unit Tests**:

- Builder context retrieval and application
- Agent execution tracking with compilation metrics
- Learned optimizations extraction and application
- Graceful degradation without memory adapter

**Integration Tests**:

- Agent execution tracking with real workflows
- Agent context retrieval with multiple executions
- Performance: Context retrieval doesn't slow compilation >10%

**Test Cases**:

```typescript
describe('WorkflowGraphBuilderService - Agent Tracking', () => {
  let service: WorkflowGraphBuilderService;
  let mockMemoryAdapter: Partial<IMemoryAdapter>;

  beforeEach(() => {
    mockMemoryAdapter = {
      getAgentContext: jest.fn().mockResolvedValue(null),
      storeAgentExecution: jest.fn().mockResolvedValue(undefined),
    };

    service = new WorkflowGraphBuilderService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );
  });

  it('should retrieve builder agent context', async () => {
    const context = {
      agentMemories: [
        { type: 'builder_execution', success: true, optimizations: ['caching'] },
        { type: 'builder_execution', success: true, optimizations: ['parallel'] },
      ],
    };

    mockMemoryAdapter.getAgentContext = jest.fn().mockResolvedValue(context);

    const definition = { name: 'test-workflow', nodes: [], edges: [] };
    const builderContext = await service['getBuilderContext'](definition);

    expect(builderContext).toEqual(context);
    expect(mockMemoryAdapter.getAgentContext).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'workflow-graph-builder',
      })
    );
  });

  it('should apply learned optimizations from context', () => {
    const context = {
      agentMemories: [
        { type: 'builder_execution', success: true, optimizations: ['caching'] },
        { type: 'builder_execution', success: true, optimizations: ['caching', 'parallel'] },
      ],
    };

    const options = service['applyBuilderContext']({}, context);

    expect(options.enableCaching).toBe(true);
    expect(options.parallelExecution).toBe(true);
  });

  it('should store builder execution as agent', async () => {
    const definition = {
      name: 'test-workflow',
      nodes: Array(8),
      edges: Array(10),
    };

    await service['storeBuilderExecution'](definition, 450, { enableCaching: true });

    expect(mockMemoryAdapter.storeAgentExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          workflowName: 'test-workflow',
        }),
      }),
      expect.objectContaining({
        compilationTime: 450,
        optimizationsApplied: ['caching'],
        success: true, // <1000ms
      }),
      'workflow-graph-builder'
    );
  });

  it('should not slow compilation when retrieving context', async () => {
    mockMemoryAdapter.getAgentContext = jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(null), 100)));

    const definition = { name: 'test', nodes: [], edges: [] };
    const startTime = Date.now();

    await service.buildFromDefinition(definition, {});

    const totalTime = Date.now() - startTime;

    // Context retrieval (100ms) should not add >10% to compilation
    expect(totalTime).toBeLessThan(200); // Assuming fast compilation
  });
});
```

---

## Quality Gates

### Pre-Implementation Checklist

- [ ] Read implementation-plan-overview.md for shared patterns
- [ ] Verify GraphOptimizationService current state (line 39, 99)
- [ ] Review agent execution pattern from multi-agent module
- [ ] Check WorkflowEngine module CLAUDE.md for module conventions

### Implementation Checklist

- [ ] GraphOptimizationService Store integration implemented
- [ ] WorkflowGraphBuilderService agent tracking implemented
- [ ] Optional injection pattern used (`@Optional() @Inject('IMemoryAdapter')`)
- [ ] Graceful degradation tested (works without memory adapter)
- [ ] Error handling tested (memory failures don't break compilation)
- [ ] Async non-blocking pattern used for memory operations
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written (real Store operations)
- [ ] Performance benchmarks met (pattern discovery <150ms, context <100ms)
- [ ] JSDoc comments added (service + method level)
- [ ] Module CLAUDE.md updated with Phase 2 integration section

### Validation Checklist

- [ ] Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`
- [ ] Tests pass: `npx nx test @hive-academy/langgraph-workflow-engine`
- [ ] Lint passes: `npx nx lint @hive-academy/langgraph-workflow-engine`
- [ ] Coverage: 80%+ maintained or improved
- [ ] No architectural violations detected
- [ ] Pattern discovery doesn't slow compilation >10%

---

**Document Status**: COMPLETE ✅
**Next Module**: implementation-plan-multi-agent.md
