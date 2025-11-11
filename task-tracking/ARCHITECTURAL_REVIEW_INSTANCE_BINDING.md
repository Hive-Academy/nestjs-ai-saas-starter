# Architectural Review: Instance Binding Pattern in WorkflowExecutionService

**Date**: 2025-01-11
**Reviewer**: Claude (AI Assistant)
**Context**: User discovered instance binding pattern in `executeWorkflow` method and requested evaluation
**Scope**: WorkflowExecutionService.executeWorkflow() vs Multi-Agent Graph Builders

---

## Executive Summary

**Finding**: ❌ **ARCHITECTURAL INCONSISTENCY DETECTED**

The `WorkflowExecutionService.executeWorkflow()` method uses **instance binding** to fix the `this` context for node handlers, while the multi-agent graph builders (`SupervisorGraphBuilder`, `SequentialGraphBuilder`) do **NOT** perform instance binding, causing a critical inconsistency.

**Impact**:

- **HIGH** - Multi-agent workflows with worker agents that use `this` in node handlers will fail with `undefined` errors
- **MEDIUM** - Pattern inconsistency violates Principle of Least Astonishment (POLA)
- **LOW** - No immediate production failures (if agents don't use `this` extensively)

**Recommendation**: **ALIGN PATTERNS** - Add instance binding to multi-agent builders OR remove from executeWorkflow

---

## Pattern Analysis

### Pattern 1: WorkflowExecutionService.executeWorkflow() ✅

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`

**Implementation** (lines 106-147):

```typescript
async executeWorkflow<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  input: TState,
  config?: RunnableConfig
): Promise<TState> {
  // 1. Get workflow instance from NestJS DI (required for bound handlers)
  const workflowInstance = this.moduleRef.get(workflowClass, {
    strict: false,
  });

  // 2. Extract metadata using MetadataProcessorService
  const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

  // 3. ✅ Bind all handlers to instance (fixes 'this' context)
  definition.nodes.forEach((node) => {
    if (node.handler && workflowInstance) {
      // Bind handler to instance so 'this' works inside methods
      node.handler = node.handler.bind(workflowInstance);
    }
  });

  // 4. Validate metadata
  this.metadataProcessor.validateWorkflowDefinition(definition);

  // 5. Build StateGraph from metadata
  const graph = this.buildStateGraph(definition);

  // 6. Compile with checkpointer and store
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  // 7. Execute
  const result = await compiled.invoke(input, config);
  return result as TState;
}
```

**Also in**: `streamWorkflow()` (lines 160-211) - **identical pattern**

**Pattern Summary**:

1. ✅ Get instance from NestJS DI container (`moduleRef.get()`)
2. ✅ Extract metadata from class (decorators)
3. ✅ **Bind all node handlers to instance** (`handler.bind(workflowInstance)`)
4. ✅ Build graph from bound handlers
5. ✅ Compile and execute

**Why This Works**:

- Node handlers can use `this.someService` or `this.someMethod()`
- NestJS DI injects dependencies into the workflow instance
- Binding preserves instance context when LangGraph executes handlers

---

### Pattern 2: SupervisorGraphBuilder.createWorkerTools() ❌

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/supervisor-graph-builder.ts`

**Implementation** (lines 314-419):

```typescript
private async createWorkerTools(
  agentClasses: Type<any>[]
): Promise<DynamicStructuredTool[]> {
  const tools: DynamicStructuredTool[] = [];

  for (const AgentClass of agentClasses) {
    // 1. Extract agent metadata from @Agent decorator
    const agentConfig = getAgentConfig(AgentClass);

    // 2. Create DynamicStructuredTool wrapping agent execution
    const tool = new DynamicStructuredTool({
      name: agentConfig.id,
      description: this.generateToolDescription(agentConfig),
      schema: toolSchema,
      func: async (input: { task: string; context?: Record<string, any> }) => {
        try {
          // 3. ❌ Build agent graph WITHOUT instance binding
          const agentDefinition = this.metadataProcessor.extractWorkflowDefinition(AgentClass);
          const agentGraph = this.buildAgentSubgraph(agentDefinition);
          const compiledAgent = agentGraph.compile();

          // 4. Execute agent with task input
          const initialState = {
            messages: [{ role: 'user', content: input.task }],
            metadata: { ...(input.context || {}) },
          };

          const result = await compiledAgent.invoke(initialState);

          // 5. Return result
          const lastMessage = result.messages?.[result.messages.length - 1];
          return lastMessage?.content || JSON.stringify(result.metadata);
        } catch (error) {
          return JSON.stringify({ error: true, message: error.message });
        }
      },
    });

    tools.push(tool);
  }

  return tools;
}
```

**buildAgentSubgraph()** (lines 466-490):

```typescript
private buildAgentSubgraph(definition: any): StateGraph<any> {
  const graph = new StateGraph(definition.channels);

  // ❌ Add nodes WITHOUT binding handlers to instance
  definition.nodes.forEach((node: any) => {
    graph.addNode(node.id, node.handler); // NO .bind() call
  });

  // Add edges
  definition.edges.forEach((edge: any) => {
    if (typeof edge.to === 'string') {
      graph.addEdge(edge.from, edge.to);
    } else {
      graph.addConditionalEdges(edge.from, edge.to.condition, edge.to.routes);
    }
  });

  graph.setEntryPoint(definition.entryPoint);
  return graph;
}
```

**Pattern Summary**:

1. ❌ **NO** instance retrieval from DI container
2. ❌ Extract metadata from class (decorators)
3. ❌ **NO** binding of node handlers to instance
4. ❌ Build graph from **unbound** handlers
5. ❌ Compile and execute

**Problem**:

- Worker agent node handlers are **NOT** bound to agent instance
- If handler uses `this.someService`, it will be `undefined`
- If handler calls `this.someMethod()`, it will throw `TypeError: this.someMethod is not a function`

---

### Pattern 3: SequentialGraphBuilder.buildAgentSubgraphs() ❌

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent/builders/sequential-graph-builder.ts`

**Implementation** (lines 308-371):

```typescript
private buildAgentSubgraphs(
  agentClasses: Type<any>[],
  sequentialConfig: SequentialConfig
): { id: string; compiledGraph: any }[] {
  const subgraphs: { id: string; compiledGraph: any }[] = [];

  for (let i = 0; i < agentClasses.length; i++) {
    const AgentClass = agentClasses[i];

    // 1. Extract agent metadata
    const agentConfig = getAgentConfig(AgentClass);

    // 2. ❌ Extract workflow definition WITHOUT instance binding
    const agentDefinition = this.metadataProcessor.extractWorkflowDefinition(AgentClass);

    // 3. ❌ Build subgraph WITHOUT instance binding
    const agentGraph = this.buildAgentSubgraph(agentDefinition);
    const compiledGraph = agentGraph.compile();

    subgraphs.push({ id: agentConfig.id, compiledGraph });
  }

  return subgraphs;
}
```

**buildAgentSubgraph()** (lines 398-422) - **IDENTICAL to SupervisorGraphBuilder**:

```typescript
private buildAgentSubgraph(definition: any): StateGraph<any> {
  const graph = new StateGraph(definition.channels);

  // ❌ Add nodes WITHOUT binding handlers to instance
  definition.nodes.forEach((node: any) => {
    graph.addNode(node.id, node.handler); // NO .bind() call
  });

  // ... edges ...

  graph.setEntryPoint(definition.entryPoint);
  return graph;
}
```

**Same Problem**: Worker agents in sequential workflows will have `this` context issues.

---

## Root Cause Analysis

### Why executeWorkflow() Has Instance Binding

**Historical Context** (based on comment in code):

> "1. Get workflow instance from NestJS DI (required for bound handlers)"

This pattern was implemented to **fix** the `this` context issue when node handlers are class methods that use:

- `this.injectedService` - Access NestJS-injected dependencies
- `this.classProperty` - Access class properties
- `this.helperMethod()` - Call class methods

**Example Use Case**:

```typescript
@FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_NODE })
@Injectable()
export class MyWorkflow {
  constructor(private readonly llm: LlmProviderService) {}

  @Node()
  async processNode(state: WorkflowState) {
    // ✅ With instance binding: this.llm works
    // ❌ Without instance binding: this.llm is undefined
    const response = await this.llm.getLLM({ temperature: 0.3 });
    return { result: response };
  }
}
```

**The Fix**: Bind handlers to instance so `this` refers to the NestJS-managed instance with all injected dependencies.

---

### Why Multi-Agent Builders DON'T Have Instance Binding

**Hypothesis 1: Oversight**

- Multi-agent builders were implemented separately from `executeWorkflow()`
- Developers didn't realize instance binding was needed
- Tests passed because agents didn't use `this` extensively

**Hypothesis 2: Metadata-Only Approach**

- Multi-agent builders use `extractWorkflowDefinition()` which returns metadata
- Metadata contains **unbound** handler references
- Builders assumed handlers were pure functions (no `this` usage)

**Hypothesis 3: Code Duplication**

- `buildAgentSubgraph()` duplicates logic from `buildStateGraph()` (MetadataProcessorService)
- Comment in code acknowledges this:
  > "NOTE: This is a temporary implementation. The MetadataProcessorService should expose a buildStateGraph() method for reuse."
- Duplication led to missing the instance binding step

---

## Impact Assessment

### Severity: **HIGH for Worker Agents Using `this`**

**Affected Code Paths**:

1. ✅ **Single Workflow Execution** - WORKS (has instance binding)

   - `WorkflowExecutionService.executeWorkflow()`
   - `WorkflowExecutionService.streamWorkflow()`

2. ❌ **Multi-Agent Supervisor Workflows** - BROKEN (no instance binding)

   - Worker agents executed via `SupervisorGraphBuilder.createWorkerTools()`
   - Worker node handlers using `this` will fail

3. ❌ **Multi-Agent Sequential Workflows** - BROKEN (no instance binding)
   - Agents executed via `SequentialGraphBuilder.buildAgentSubgraphs()`
   - Agent node handlers using `this` will fail

**Failure Symptoms**:

```typescript
// Worker Agent Code:
@Agent({
  description: 'GitHub analyzer',
  workflow: { type: 'functional-node' },
})
@Injectable()
export class GitHubAnalyzerAgent {
  constructor(private readonly githubService: GitHubService) {}

  @Node()
  async analyzeRepo(state: TypedAgentState) {
    // ❌ RUNTIME ERROR: Cannot read property 'getRepo' of undefined
    const repo = await this.githubService.getRepo(state.metadata.repoUrl);
    return { metadata: { analysis: repo } };
  }
}
```

**Error Message**:

```
TypeError: Cannot read property 'getRepo' of undefined
  at GitHubAnalyzerAgent.analyzeRepo (github-analyzer.agent.ts:15:32)
```

**Current Workarounds** (why it might not fail in production):

1. **Agents Use External Services via Parameters** (not `this`)

   ```typescript
   @Node()
   async analyzeRepo(state: TypedAgentState) {
     // ✅ Works: State contains service references
     const githubService = state.metadata.services.github;
     return { result: await githubService.getRepo() };
   }
   ```

2. **Agents Are Pure Functions** (no `this` usage)

   ```typescript
   @Node()
   async analyzeRepo(state: TypedAgentState) {
     // ✅ Works: No this usage
     return { result: processData(state.metadata.data) };
   }
   ```

3. **Services Injected via Global Module** (accessed via static import)

   ```typescript
   import { getGitHubService } from './services';

   @Node()
   async analyzeRepo(state: TypedAgentState) {
     // ✅ Works: Service from global scope
     const githubService = getGitHubService();
     return { result: await githubService.getRepo() };
   }
   ```

---

## Architecture Evaluation

### Is Instance Binding a Good Pattern?

**Arguments FOR Instance Binding** (✅):

1. **NestJS Idiomatic** - Leverages DI container properly
2. **Developer Ergonomics** - Natural class-based syntax (`this.service`)
3. **Type Safety** - TypeScript knows about injected properties
4. **Testability** - Can mock injected dependencies easily
5. **Consistency with NestJS** - Matches how controllers/services work

**Arguments AGAINST Instance Binding** (❌):

1. **Tight Coupling** - Handler methods coupled to class instance
2. **Hidden Dependencies** - Harder to see what a handler needs
3. **Functional Purity** - Breaks functional programming principles
4. **Complexity** - Extra step (get instance, bind handlers)
5. **Performance** - Minor overhead from `.bind()` calls

### Industry Best Practices

**LangGraph Official Examples** - Use **pure functions** (no `this`):

```typescript
// LangGraph Pattern: Pure functions with explicit dependencies
const myNode = async (state: State, config: RunnableConfig) => {
  // Dependencies passed via config or state
  const llm = config.metadata.llm;
  return { result: await llm.invoke(state.messages) };
};

graph.addNode('myNode', myNode);
```

**NestJS Official Examples** - Use **class methods with `this`**:

```typescript
// NestJS Pattern: Class methods with injected dependencies
@Injectable()
export class MyService {
  constructor(private readonly db: Database) {}

  async handleRequest() {
    return await this.db.query();
  }
}
```

**Hybrid Approach** (Our Current Pattern):

- Decorators define graph structure (LangGraph-style)
- Handlers are class methods (NestJS-style)
- Instance binding bridges the two (our innovation)

**Verdict**: ✅ **Instance binding is a SOLID pattern** for this use case because:

- We're building **NestJS applications** (not pure LangGraph apps)
- Developers expect NestJS conventions (DI, class methods)
- Instance binding enables both paradigms to coexist

---

## Recommendations

### Option 1: Add Instance Binding to Multi-Agent Builders (RECOMMENDED ✅)

**Approach**: Align multi-agent builders with `executeWorkflow()` pattern

**Implementation**:

**Step 1**: Update `SupervisorGraphBuilder.createWorkerTools()`:

```typescript
private async createWorkerTools(
  agentClasses: Type<any>[]
): Promise<DynamicStructuredTool[]> {
  const tools: DynamicStructuredTool[] = [];

  for (const AgentClass of agentClasses) {
    const agentConfig = getAgentConfig(AgentClass);

    const tool = new DynamicStructuredTool({
      name: agentConfig.id,
      description: this.generateToolDescription(agentConfig),
      schema: toolSchema,
      func: async (input: { task: string; context?: Record<string, any> }) => {
        try {
          // ✅ FIX 1: Get agent instance from NestJS DI
          const agentInstance = this.moduleRef.get(AgentClass, { strict: false });

          // ✅ FIX 2: Extract workflow definition
          const agentDefinition = this.metadataProcessor.extractWorkflowDefinition(AgentClass);

          // ✅ FIX 3: Bind all node handlers to instance
          agentDefinition.nodes.forEach((node: any) => {
            if (node.handler && agentInstance) {
              node.handler = node.handler.bind(agentInstance);
            }
          });

          // Build, compile, execute (unchanged)
          const agentGraph = this.buildAgentSubgraph(agentDefinition);
          const compiledAgent = agentGraph.compile();

          const initialState = {
            messages: [{ role: 'user', content: input.task }],
            metadata: { ...(input.context || {}) },
          };

          const result = await compiledAgent.invoke(initialState);
          const lastMessage = result.messages?.[result.messages.length - 1];
          return lastMessage?.content || JSON.stringify(result.metadata);
        } catch (error) {
          return JSON.stringify({ error: true, message: error.message });
        }
      },
    });

    tools.push(tool);
  }

  return tools;
}
```

**Step 2**: Update `SequentialGraphBuilder.buildAgentSubgraphs()`:

```typescript
private buildAgentSubgraphs(
  agentClasses: Type<any>[],
  sequentialConfig: SequentialConfig
): { id: string; compiledGraph: any }[] {
  const subgraphs: { id: string; compiledGraph: any }[] = [];

  for (let i = 0; i < agentClasses.length; i++) {
    const AgentClass = agentClasses[i];
    const agentConfig = getAgentConfig(AgentClass);

    // ✅ FIX 1: Get agent instance from NestJS DI
    const agentInstance = this.moduleRef.get(AgentClass, { strict: false });

    // ✅ FIX 2: Extract workflow definition
    const agentDefinition = this.metadataProcessor.extractWorkflowDefinition(AgentClass);

    // ✅ FIX 3: Bind all node handlers to instance
    agentDefinition.nodes.forEach((node: any) => {
      if (node.handler && agentInstance) {
        node.handler = node.handler.bind(agentInstance);
      }
    });

    // Build, compile (unchanged)
    const agentGraph = this.buildAgentSubgraph(agentDefinition);
    const compiledGraph = agentGraph.compile();

    subgraphs.push({ id: agentConfig.id, compiledGraph });
  }

  return subgraphs;
}
```

**Pros**:

- ✅ Fixes `this` context issues in worker agents
- ✅ Aligns all execution paths (single + multi-agent)
- ✅ Maintains NestJS DI conventions
- ✅ No breaking changes to public API
- ✅ Minimal code changes (add 3 lines per builder)

**Cons**:

- ❌ Minor performance overhead (`.bind()` calls)
- ❌ Increases coupling between builders and DI container

---

### Option 2: Remove Instance Binding from executeWorkflow() (NOT RECOMMENDED ❌)

**Approach**: Make all handlers pure functions (no `this`)

**Implementation**:

1. Remove `moduleRef.get()` and `.bind()` from `executeWorkflow()`
2. Update all workflow classes to use pure function handlers
3. Pass dependencies via `state.metadata` or `RunnableConfig`

**Example Migration**:

**Before**:

```typescript
@FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_NODE })
@Injectable()
export class MyWorkflow {
  constructor(private readonly llm: LlmProviderService) {}

  @Node()
  async processNode(state: WorkflowState) {
    const response = await this.llm.getLLM({ temperature: 0.3 });
    return { result: response };
  }
}
```

**After**:

```typescript
@FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_NODE })
export class MyWorkflow {
  @Node()
  async processNode(state: WorkflowState, config: RunnableConfig) {
    // Access services via config.metadata
    const llm = config.metadata.llm;
    const response = await llm.getLLM({ temperature: 0.3 });
    return { result: response };
  }
}
```

**Pros**:

- ✅ Functional purity (no side effects)
- ✅ Explicit dependencies (visible in handler signature)
- ✅ Aligns with LangGraph official patterns

**Cons**:

- ❌ **BREAKING CHANGE** - All existing workflows break
- ❌ Less ergonomic (verbose dependency passing)
- ❌ Violates NestJS conventions
- ❌ Harder to test (need to mock config.metadata)
- ❌ Loses type safety (config.metadata is `any`)

---

### Option 3: Extract Shared buildStateGraph() Method (FUTURE ENHANCEMENT 🔮)

**Approach**: Eliminate code duplication by extracting common logic

**Current Duplication**:

- `WorkflowExecutionService.buildStateGraph()` (lines 279-324)
- `SupervisorGraphBuilder.buildAgentSubgraph()` (lines 466-490)
- `SequentialGraphBuilder.buildAgentSubgraph()` (lines 398-422)

**All three do the same thing**:

1. Create StateGraph with channels
2. Add nodes from definition
3. Add edges from definition
4. Set entry point

**Proposed Refactoring**:

**Create**: `MetadataProcessorService.buildStateGraph()`

```typescript
// libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts

/**
 * Build StateGraph from workflow definition with instance binding
 *
 * PATTERN: Centralized graph construction with instance binding support
 *
 * @param definition - Workflow definition from extractWorkflowDefinition()
 * @param workflowClass - Workflow class (for instance retrieval)
 * @param bindToInstance - Whether to bind handlers to class instance (default: true)
 * @returns StateGraph ready for compilation
 */
public buildStateGraph<TState extends WorkflowState = WorkflowState>(
  definition: WorkflowDefinition<TState>,
  workflowClass: Type<any>,
  bindToInstance = true
): StateGraph<TState> {
  // 1. Get instance if binding enabled
  const workflowInstance = bindToInstance
    ? this.moduleRef.get(workflowClass, { strict: false })
    : null;

  // 2. Bind handlers to instance
  if (bindToInstance && workflowInstance) {
    definition.nodes.forEach((node) => {
      if (node.handler) {
        node.handler = node.handler.bind(workflowInstance);
      }
    });
  }

  // 3. Create StateGraph
  const graph = new StateGraph<TState>(definition.channels);

  // 4. Add nodes
  definition.nodes.forEach((node) => {
    graph.addNode(node.id, node.handler);
  });

  // 5. Add edges
  definition.edges.forEach((edge) => {
    if (typeof edge.to === 'string') {
      graph.addEdge(edge.from, edge.to);
    } else {
      graph.addConditionalEdges(edge.from, edge.to.condition, edge.to.routes);
    }
  });

  // 6. Set entry point
  graph.setEntryPoint(definition.entryPoint);

  return graph;
}
```

**Usage in executeWorkflow()**:

```typescript
async executeWorkflow<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  input: TState,
  config?: RunnableConfig
): Promise<TState> {
  // Extract definition
  const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

  // Validate
  this.metadataProcessor.validateWorkflowDefinition(definition);

  // ✅ Use centralized buildStateGraph (with instance binding)
  const graph = this.metadataProcessor.buildStateGraph(definition, workflowClass, true);

  // Compile and execute
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  return await compiled.invoke(input, config) as TState;
}
```

**Usage in SupervisorGraphBuilder**:

```typescript
private async createWorkerTools(agentClasses: Type<any>[]): Promise<DynamicStructuredTool[]> {
  const tools: DynamicStructuredTool[] = [];

  for (const AgentClass of agentClasses) {
    const agentConfig = getAgentConfig(AgentClass);

    const tool = new DynamicStructuredTool({
      name: agentConfig.id,
      description: this.generateToolDescription(agentConfig),
      schema: toolSchema,
      func: async (input: { task: string; context?: Record<string, any> }) => {
        // Extract definition
        const agentDefinition = this.metadataProcessor.extractWorkflowDefinition(AgentClass);

        // ✅ Use centralized buildStateGraph (with instance binding)
        const agentGraph = this.metadataProcessor.buildStateGraph(agentDefinition, AgentClass, true);
        const compiledAgent = agentGraph.compile();

        // Execute
        const result = await compiledAgent.invoke(initialState);
        return lastMessage?.content || JSON.stringify(result.metadata);
      },
    });

    tools.push(tool);
  }

  return tools;
}
```

**Pros**:

- ✅ Eliminates code duplication (DRY principle)
- ✅ Single source of truth for graph building
- ✅ Centralized instance binding logic
- ✅ Easier to maintain and test
- ✅ Can toggle instance binding via parameter

**Cons**:

- ❌ Larger refactoring scope
- ❌ Requires changes to MetadataProcessorService (public API change)
- ❌ Need to update all callers

---

## Final Recommendation

### Immediate Action (Short-Term Fix)

**IMPLEMENT OPTION 1**: Add instance binding to multi-agent builders

**Priority**: **HIGH**
**Effort**: **LOW** (2-3 hours)
**Risk**: **LOW** (no breaking changes)

**Tasks**:

1. Update `SupervisorGraphBuilder.createWorkerTools()` to bind handlers
2. Update `SequentialGraphBuilder.buildAgentSubgraphs()` to bind handlers
3. Add test cases for worker agents using `this`
4. Document instance binding pattern in CLAUDE.md

---

### Future Enhancement (Long-Term Refactoring)

**IMPLEMENT OPTION 3**: Extract shared `buildStateGraph()` method

**Priority**: **MEDIUM**
**Effort**: **MEDIUM** (4-6 hours)
**Risk**: **MEDIUM** (refactoring risk)

**Tasks**:

1. Create `MetadataProcessorService.buildStateGraph()` public method
2. Refactor `WorkflowExecutionService.buildStateGraph()` to use new method
3. Refactor `SupervisorGraphBuilder.buildAgentSubgraph()` to use new method
4. Refactor `SequentialGraphBuilder.buildAgentSubgraph()` to use new method
5. Delete duplicated `buildAgentSubgraph()` private methods
6. Add comprehensive tests for centralized method

---

## Test Cases

### Test Case 1: Worker Agent Using `this` (Instance Binding)

```typescript
// Test: Worker agent with NestJS DI can access injected services
@Agent({
  description: 'Test agent with service injection',
  workflow: { type: 'functional-node' },
})
@Injectable()
export class TestWorkerAgent {
  constructor(private readonly testService: TestService) {}

  @Node()
  async processTask(state: TypedAgentState) {
    // Should NOT throw: this.testService should be defined
    const result = await this.testService.doSomething();
    return { metadata: { result } };
  }
}

it('should bind worker agent handlers to instance', async () => {
  const supervisor = await executionService.executeMultiAgentWorkflow(
    TestSupervisor,
    [TestWorkerAgent],
    { messages: [{ role: 'user', content: 'test task' }] }
  );

  // Verify: Worker agent executed successfully (no undefined errors)
  expect(supervisor.metadata.result).toBeDefined();
});
```

### Test Case 2: Sequential Agent Using `this` (Instance Binding)

```typescript
// Test: Sequential agent with NestJS DI can access injected services
@Agent({
  description: 'Test sequential agent',
  workflow: { type: 'functional-node' },
})
@Injectable()
export class TestSequentialAgent {
  constructor(private readonly logger: Logger) {}

  @Node()
  async logTask(state: TypedAgentState) {
    // Should NOT throw: this.logger should be defined
    this.logger.log('Processing task');
    return { metadata: { logged: true } };
  }
}

it('should bind sequential agent handlers to instance', async () => {
  const result = await executionService.executeMultiAgentWorkflow(
    TestSequentialWorkflow,
    [TestSequentialAgent],
    { messages: [] }
  );

  // Verify: Agent executed successfully (no undefined errors)
  expect(result.metadata.logged).toBe(true);
});
```

---

## Conclusion

The current implementation has an **architectural inconsistency** where:

- ✅ Single workflows use instance binding
- ❌ Multi-agent workflows do NOT use instance binding

This violates the **Principle of Least Astonishment** and can cause subtle runtime errors when worker agents use `this` to access injected services.

**Recommended Fix**: Add instance binding to multi-agent builders (Option 1) as an immediate fix, then refactor to centralized `buildStateGraph()` method (Option 3) as a long-term improvement.

**Impact**: This fix ensures all execution paths (single + multi-agent) have consistent behavior and enables worker agents to use NestJS DI patterns naturally.

---

**Next Steps**:

1. User approval to proceed with Option 1 implementation
2. Create TASK for adding instance binding to multi-agent builders
3. Create TASK for future refactoring to centralized buildStateGraph()
