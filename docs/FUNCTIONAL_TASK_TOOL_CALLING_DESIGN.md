# Functional-Task Tool Calling Design Document

## Problem Statement

Currently, the `functional-task` pattern in our NestJS workflow engine does **NOT** support dynamic LLM-driven tool calling due to an architectural constraint:

```typescript
// Current problematic flow in workflow-execution.service.ts (line 411)
graph.addEdge('tools' as any, definition.entryPoint as any);
```

**Issue**: After tools execute, the flow ALWAYS routes back to the **entrypoint** (first task), not the originating task. This causes:

- Infinite loops (Entrypoint → Task2 → Tools → Entrypoint → Task2 → ...)
- Skipped tasks (Task3, Task4 never execute)
- Broken linear workflow

## Current Architecture Analysis

### How Tool Routing Works Today

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`

**Lines 388-412**: Tool routing logic

```typescript
// 3. Add conditional tool routing if tools present
if (hasTools) {
  definition.nodes.forEach((node) => {
    // For EVERY node: add conditional edge → tools OR next node
    graph.addConditionalEdges(node.id as any, this.shouldExecuteTools.bind(this), {
      tools: 'tools' as any,
      continue: (nextNode || END) as any,
    });
  });

  // ❌ PROBLEM: Tools always return to entrypoint
  graph.addEdge('tools' as any, definition.entryPoint as any);
}
```

**Lines 422-440**: `shouldExecuteTools()` - Checks for `tool_calls` in last message

**Lines 449-461**: `getNextNode()` - Finds next node from explicit edges

### Why It Works for Functional-Node

**Functional-Node Pattern**:

```
LLM Node → (has tool_calls?) → ToolNode → Back to LLM Node
  ↓ (no tool_calls)
Next Node
```

- Single `@Node({ type: 'llm' })` orchestrates tools
- Returning to the **same LLM node** is correct behavior
- LLM node loops until no more tool_calls
- Then routes to next node

### Why It Breaks for Functional-Task

**Functional-Task Pattern**:

```
Entrypoint (Task1) → Task2 (calls LLM+tools) → Task3 → Task4
                      ↓ (has tool_calls)
                    ToolNode
                      ↓ (returns to entrypoint)
                    Task1 ❌ WRONG - should return to Task2
```

- Multiple `@Task` nodes execute sequentially
- Returning to **entrypoint** breaks the linear sequence
- Task2 needs to loop internally, not jump back to Task1

## Proposed Solution

### Option 1: Task-Specific Tool Routing (Recommended)

**Strategy**: Each task that uses tools gets its own tool routing loop back to **itself**, not the entrypoint.

**Changes Required**:

#### 1.1. Add `@LLMTask` Decorator

Create a new decorator that marks a task as containing LLM tool calling logic:

```typescript
// File: libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/llm-task.decorator.ts

/**
 * @LLMTask - Marks a task that performs LLM tool calling
 *
 * Enables automatic tool routing loop for this specific task.
 * The task will loop internally until LLM stops making tool_calls.
 *
 * @example
 * @LLMTask({ tools: ['web-search', 'research-search'], dependsOn: ['initialize'] })
 * async conductResearch(context: TaskExecutionContext) {
 *   // LLM will autonomously call tools
 *   // Framework handles: task → tools → task loop
 *   return { state: updatedState };
 * }
 */
export function LLMTask(options: LLMTaskOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 1. Apply base @Task decorator
    Task({ dependsOn: options.dependsOn })(target, propertyKey, descriptor);

    // 2. Mark as LLM task for special tool routing
    Reflect.defineMetadata('llm:task:marker', true, target, propertyKey);
    Reflect.defineMetadata('llm:task:tools', options.tools, target, propertyKey);

    return descriptor;
  };
}

export interface LLMTaskOptions {
  /**
   * Tools available to this task's LLM
   */
  tools: string[];

  /**
   * Task dependencies (same as @Task)
   */
  dependsOn?: string[];

  /**
   * Optional: Max tool iterations (default: 10)
   */
  maxToolIterations?: number;

  /**
   * Optional: Timeout for tool execution (default: 30000ms)
   */
  toolTimeout?: number;
}
```

#### 1.2. Modify Tool Routing Logic

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`

**Change lines 388-412**:

```typescript
// 3. Add conditional tool routing if tools present
if (hasTools) {
  definition.nodes.forEach((node) => {
    // Check if this node is marked as an LLM task
    const isLLMTask = node.metadata?.isLLMTask === true;
    const nodeTools = node.metadata?.llmTools as string[] | undefined;

    if (isLLMTask && nodeTools && nodeTools.length > 0) {
      // ✅ LLM Task: Add task-specific tool routing loop
      const toolNodeId = `tools_${node.id}`; // Unique ToolNode per LLM task

      // Create task-specific ToolNode
      const taskTools = this.toolRegistry.resolveTools(nodeTools);
      const taskToolNode = new ToolNode(taskTools);
      graph.addNode(toolNodeId, taskToolNode as any);

      // Add conditional edge: task → task-specific tools OR next node
      const nextNode = this.getNextNode(node, definition);
      graph.addConditionalEdges(node.id as any, this.shouldExecuteTools.bind(this), {
        tools: toolNodeId as any, // Route to task-specific ToolNode
        continue: (nextNode || END) as any,
      });

      // ✅ KEY FIX: Tools return to the SAME TASK, not entrypoint
      graph.addEdge(toolNodeId as any, node.id as any);

      this.logger.debug(
        `Added LLM task tool routing: ${node.id} ↔ ${toolNodeId} (tools: ${nodeTools.join(', ')})`
      );
    } else {
      // Regular task: no tool routing, just linear flow
      const nextNode = this.getNextNode(node, definition);
      if (nextNode) {
        graph.addEdge(node.id as any, nextNode as any);
      }
    }
  });
}
```

#### 1.3. Update MetadataProcessorService

**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`

**Update `compileTaskBasedWorkflow()` around line 220**:

```typescript
// Check for @LLMTask metadata
const isLLMTask = Reflect.getMetadata('llm:task:marker', prototype, methodName);
const llmTools = Reflect.getMetadata('llm:task:tools', prototype, methodName);

nodes.push({
  id: nodeId,
  type: isLLMTask ? 'llm-task' : 'task',
  handler: this.createNodeHandler(instance, methodName, workflowClass),
  metadata: {
    type: isLLMTask ? 'llm-task' : 'standard',
    description: taskMeta.description,
    timeout: taskMeta.timeout,
    maxRetries: taskMeta.retryCount,
    isLLMTask: isLLMTask || false, // NEW: Flag for LLM task
    llmTools: llmTools || [], // NEW: Tools for this task
  },
});
```

### Option 2: Automatic Tool Loop Wrapper (Alternative)

**Strategy**: Automatically detect when a task invokes an LLM with tools, and wrap the task in a tool execution loop.

**Pros**:

- No new decorator needed
- Works with existing `@Task` decorator
- Automatic detection

**Cons**:

- More complex runtime detection
- Less explicit for developers
- Harder to debug

**Implementation Sketch**:

```typescript
// Wrap task handler to detect tool_calls and loop internally
private wrapTaskHandlerWithToolLoop(
  originalHandler: Function,
  tools: any[]
): Function {
  return async (state: WorkflowState) => {
    let currentState = state;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      // Execute original task handler
      const result = await originalHandler(currentState);

      // Check if LLM returned tool_calls
      const lastMessage = result.messages?.[result.messages.length - 1];
      if (!lastMessage?.tool_calls || lastMessage.tool_calls.length === 0) {
        // No tool calls - task complete
        return result;
      }

      // Execute tools
      const toolNode = new ToolNode(tools);
      const toolResults = await toolNode(result);

      // Merge tool results into state
      currentState = {
        ...result,
        messages: [...result.messages, ...toolResults.messages],
      };

      iterations++;
    }

    throw new Error(`LLM task exceeded max tool iterations (${maxIterations})`);
  };
}
```

## Recommended Approach: Option 1 (@LLMTask Decorator)

**Rationale**:

1. **Explicit**: Developers clearly declare when a task uses LLM tool calling
2. **Type-Safe**: Tools are declared at decorator level, validated at compile time
3. **Debuggable**: Clear graph structure with task-specific ToolNodes
4. **Consistent**: Follows existing decorator pattern (@Entrypoint, @Task, @Node)
5. **Performant**: No runtime detection overhead

**Developer Experience**:

```typescript
@Agent({
  workflow: {
    type: 'functional-task',
    streaming: true,
  },
})
export class ResearchWorkflowAgent {
  @Entrypoint()
  async initialize(context: TaskExecutionContext) {
    return { state: { ...context.state, initialized: true } };
  }

  // 🔑 NEW: @LLMTask with tool calling
  @LLMTask({
    tools: ['web-search', 'research-search', 'create-report'],
    dependsOn: ['initialize'],
  })
  async conductResearch(context: TaskExecutionContext) {
    // LLM autonomously calls tools
    // Framework handles: this task → tools_conductResearch → this task loop
    // Returns when LLM stops making tool_calls

    const systemPrompt = `Research agent with tools:
- web-search: Quick (2-5 sources)
- research-search: Comprehensive (5-10 sources)
- create-report: Generate report

Query: "${context.state.metadata.query}"

Choose tools based on query complexity.`;

    return {
      state: {
        ...context.state,
        metadata: {
          ...context.state.metadata,
          systemPrompt,
        },
      },
    };
  }

  @Task({ dependsOn: ['conductResearch'] })
  @RequiresApproval({ confidenceThreshold: 0.8 })
  async approveReport(context: TaskExecutionContext) {
    // Human approval
    return { state: context.state };
  }

  @Task({ dependsOn: ['approveReport'] })
  async saveReport(context: TaskExecutionContext) {
    // Save approved report
    return { state: { ...context.state, saved: true } };
  }
}
```

## Comparison: Before vs After

### Before (No Tool Calling Support)

```typescript
@Task({ dependsOn: ['parseQuery'] })
async conductResearch(context: TaskExecutionContext) {
  // ❌ Manual tool call - no LLM autonomy
  const results = await this.webTools.researchSearch({
    topic: context.state.metadata.query,
    includeAcademic: true,
  });

  return { state: { ...context.state, results } };
}
```

**Issues**:

- LLM never decides which tool to use
- Always uses same tool
- No cost optimization
- Not autonomous

### After (With @LLMTask)

```typescript
@LLMTask({
  tools: ['web-search', 'research-search', 'create-report'],
  dependsOn: ['parseQuery'],
})
async conductResearch(context: TaskExecutionContext) {
  // ✅ LLM autonomously calls tools
  // Framework handles tool execution loop

  const systemPrompt = `Choose tools:
- web-search: Simple queries ($0.01)
- research-search: Complex queries ($0.05)
- create-report: Generate report

Query: "${context.state.metadata.query}"`;

  return {
    state: {
      ...context.state,
      metadata: {
        ...context.state.metadata,
        systemPrompt,
      },
    },
  };
}
```

**Benefits**:

- ✅ LLM chooses optimal tool
- ✅ Cost optimization (cheap vs expensive tools)
- ✅ Autonomous decision-making
- ✅ Seamless developer experience

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 hours)

1. **Create @LLMTask Decorator** (`llm-task.decorator.ts`)

   - Define `LLMTaskOptions` interface
   - Implement decorator with metadata registration
   - Add validation logic

2. **Update MetadataProcessorService** (`metadata-processor.service.ts`)

   - Detect `@LLMTask` metadata in `compileTaskBasedWorkflow()`
   - Add `isLLMTask` and `llmTools` to node metadata
   - Export node metadata for tool routing logic

3. **Update WorkflowExecutionService** (`workflow-execution.service.ts`)
   - Modify `addEdgesFromMetadata()` to handle LLM tasks
   - Create task-specific ToolNodes (`tools_${taskId}`)
   - Add task → task-specific-tools → task loop routing
   - Keep regular tasks with simple linear edges

### Phase 2: Developer Experience (1-2 hours)

4. **Create Example Agent** (`apps/dev-brand-api/src/app/business-workflows/agents/examples/research-workflow.agent.ts`)

   - Demonstrate `@LLMTask` usage
   - Show mixed workflow (regular tasks + LLM tasks)
   - Include HITL approval gate
   - Add comprehensive comments

5. **Update Type Definitions** (`libs/langgraph-modules/workflow-engine/src/lib/interfaces/`)
   - Add `LLMTaskOptions` to exports
   - Update `TaskExecutionContext` if needed
   - Add JSDoc documentation

### Phase 3: Documentation (1 hour)

6. **Update WORKFLOW_PATTERNS_GUIDE.md**

   - Add section: "LLM Tool Calling with Functional-Task"
   - Include before/after examples
   - Update decision matrix
   - Add troubleshooting section

7. **Update CLAUDE.md** (`libs/langgraph-modules/workflow-engine/CLAUDE.md`)
   - Document `@LLMTask` decorator
   - Add to decorator reference
   - Update best practices

### Phase 4: Testing (2 hours)

8. **Unit Tests** (`workflow-execution.service.spec.ts`)

   - Test task-specific tool routing
   - Test tool loop termination
   - Test mixed regular + LLM tasks

9. **Integration Tests** (`research-workflow.agent.spec.ts`)
   - Test end-to-end LLM task execution
   - Test tool selection behavior
   - Test HITL integration

## Open Questions

### Q1: Should @LLMTask support multiple tool groups?

**Example**:

```typescript
@LLMTask({
  tools: ['web-search', 'research-search'],  // Phase 1 tools
  dependsOn: ['initialize'],
})
async gatherData() { }

@LLMTask({
  tools: ['create-report', 'save-report'],   // Phase 2 tools
  dependsOn: ['gatherData'],
})
async generateReport() { }
```

**Answer**: YES - Each `@LLMTask` can have its own tool group. This provides fine-grained control over which tools are available at each workflow stage.

### Q2: How to handle tool execution errors?

**Options**:

1. **Fail task immediately** - Throw error, workflow stops
2. **Retry with backoff** - Retry tool execution N times
3. **Return error to LLM** - Let LLM see error and decide next step

**Recommendation**: Option 3 (Return error to LLM) - Most resilient, allows LLM to adapt strategy.

### Q3: Should we support tool iteration limits?

**Example**:

```typescript
@LLMTask({
  tools: ['web-search'],
  maxToolIterations: 5,  // Stop after 5 tool calls
})
```

**Answer**: YES - Add `maxToolIterations` option (default: 10) to prevent infinite loops if LLM gets stuck.

### Q4: Compatibility with existing agents?

**Impact**: Existing agents using `@Task` without `@LLMTask` continue to work unchanged. This is a **pure addition**, not a breaking change.

## Success Criteria

✅ Developers can use `@LLMTask` to enable LLM-driven tool calling in functional-task workflows
✅ Tool routing loops back to the correct task, not the entrypoint
✅ Mixed workflows (regular tasks + LLM tasks) work correctly
✅ HITL interruption works with LLM tasks
✅ Example agent demonstrates the pattern clearly
✅ Documentation is comprehensive and accurate
✅ Zero breaking changes to existing agents

## Timeline

- **Phase 1 (Core)**: 2-3 hours
- **Phase 2 (DX)**: 1-2 hours
- **Phase 3 (Docs)**: 1 hour
- **Phase 4 (Tests)**: 2 hours

**Total**: ~6-8 hours

## Next Steps

1. Get approval on Option 1 (@LLMTask decorator) approach
2. Start with Phase 1: Implement `@LLMTask` decorator
3. Update `WorkflowExecutionService` for task-specific tool routing
4. Create proof-of-concept example agent
5. Iterate based on testing feedback

---

**Status**: Design Complete - Awaiting Implementation Approval
**Author**: NestJS AI SaaS Starter Team
**Date**: 2025-01-12
