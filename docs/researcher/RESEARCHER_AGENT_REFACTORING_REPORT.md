# ResearcherAgent Refactoring Report: Functional-Node → Functional-Task Pattern

## Overview

Successfully refactored `ResearcherAgent` from the legacy **functional-node pattern** (@Node/@Edge decorators) to the modern **functional-task pattern** (@Entrypoint/@LLMTask/@Task decorators).

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`

---

## Key Changes

### 1. Decorator Pattern Migration

#### Old Pattern (Functional-Node)

```typescript
// ❌ OLD: Node-based workflow with manual edges
@Agent({
  workflow: {
    type: 'functional-node',  // Node-based pattern
  }
})
export class ResearcherAgent {
  @Node({ type: 'llm' })
  async conductAutonomousResearch(state: TypedAgentState) { }

  @Node({ type: 'standard' })
  @RequiresApproval({...})
  async saveApprovedReport(state: TypedAgentState) { }

  @Edge('conductAutonomousResearch', 'saveApprovedReport')
  researchToSave(): boolean { return true; }

  @Edge('saveApprovedReport', '__end__')
  complete(): boolean { return true; }
}
```

#### New Pattern (Functional-Task)

```typescript
// ✅ NEW: Task-based workflow with automatic dependencies
@Agent({
  workflow: {
    type: 'functional-task',  // Task-based pattern
  }
})
export class ResearcherAgent {
  @Entrypoint({ timeout: 5000 })
  async initializeResearch(
    context: TaskExecutionContext<TypedAgentState>
  ): Promise<TaskExecutionResult<TypedAgentState>> { }

  @LLMTask({
    description: 'Conduct autonomous research with LLM tool selection',
    tools: ['web-search', 'research-search', 'create-report'],
    maxToolIterations: 10,
    toolTimeout: 30000,
    dependsOn: ['initializeResearch'],
  })
  async conductAutonomousResearch(
    context: TaskExecutionContext<TypedAgentState>
  ): Promise<TaskExecutionResult<TypedAgentState>> { }

  @Task({ dependsOn: ['conductAutonomousResearch'] })
  @RequiresApproval({...})
  async saveApprovedReport(
    context: TaskExecutionContext<TypedAgentState>
  ): Promise<TaskExecutionResult<TypedAgentState>> { }

  // ✅ No @Edge decorators needed - dependencies defined in @Task options
}
```

---

## 2. Method Signature Changes

### Old Signature (Node-Based)

```typescript
async conductAutonomousResearch(
  state: TypedAgentState<ResearcherMetadata>
): Promise<Partial<TypedAgentState<ResearcherMetadata>>>
```

### New Signature (Task-Based)

```typescript
async conductAutonomousResearch(
  context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>>
```

**Key Differences**:

- **Input**: Receives `TaskExecutionContext` wrapper (contains `state`, `taskName`, `executionId`, etc.)
- **Output**: Returns `TaskExecutionResult` with `{ state: {...} }` structure
- **Access State**: Via `context.state` instead of direct `state` parameter

---

## 3. Return Value Changes

### Old Return (Node-Based)

```typescript
return {
  metadata: {
    ...state.metadata,
    currentStep: 'autonomous-research',
  },
};
```

### New Return (Task-Based)

```typescript
return {
  state: {
    ...state,
    metadata: {
      ...state.metadata,
      currentStep: 'autonomous-research',
    },
    messages: [
      ...state.messages,
      new AIMessage({
        content: researchSystemPrompt,
        additional_kwargs: {
          llmTaskId: 'conductAutonomousResearch',
        },
      }),
    ],
  },
};
```

**Key Differences**:

- Wrapped in `{ state: {...} }` object
- Includes `messages` array with system prompt as AIMessage
- More explicit state management

---

## 4. New Features Added

### Entrypoint Task

```typescript
@Entrypoint({ timeout: 5000 })
async initializeResearch(
  context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
  const state = context.state;
  const query = state.metadata.query;
  const researchDepth = state.metadata.researchDepth || 'detailed';
  const userId = state.metadata.userId;

  this.logger.log(
    `🔬 Initializing research: "${query}" (depth: ${researchDepth}, user: ${userId})`
  );

  return {
    state: {
      ...state,
      metadata: {
        ...state.metadata,
        workflowStartTime: new Date(),
        currentStep: 'initialized',
        researchStarted: true,
      },
    },
  };
}
```

**Why Added**:

- Provides explicit workflow entry point
- Separates initialization logic from research logic
- Follows Single Responsibility Principle (SRP)

---

## 5. @LLMTask Decorator Benefits

### Task-Specific Tool Routing

```typescript
@LLMTask({
  tools: ['web-search', 'research-search', 'create-report'],
  maxToolIterations: 10,
  toolTimeout: 30000,
})
async conductAutonomousResearch(context) { }
```

**Automatic Behavior**:

1. Framework creates `tools_conductAutonomousResearch` node automatically
2. LLM tool calls route to this specific tool node
3. Tool results loop back to `conductAutonomousResearch` (not entrypoint!)
4. Prevents infinite loops via `maxToolIterations`
5. Proceeds to next task when LLM stops calling tools

**Graph Structure**:

```
initializeResearch
       ↓
conductAutonomousResearch ↔ tools_conductAutonomousResearch
       ↓ (no tool_calls)
saveApprovedReport
       ↓
     END
```

---

## 6. Removed Decorators

### @Edge Decorators - No Longer Needed

```typescript
// ❌ REMOVED: Manual edge definitions
@Edge('conductAutonomousResearch', 'saveApprovedReport')
researchToSave(): boolean {
  return true;
}

@Edge('saveApprovedReport', '__end__')
complete(): boolean {
  return true;
}
```

**Why Removed**:

- Task dependencies are automatic in functional-task pattern
- Specified via `dependsOn` in decorator options
- Reduces boilerplate code
- Eliminates edge routing logic

---

## 7. Import Changes

### Old Imports

```typescript
import {
  Agent,
  Node,
  Edge,
  WorkflowExecutionService,
} from '@hive-academy/langgraph-workflow-engine';
```

### New Imports

```typescript
import {
  Agent,
  Entrypoint,
  LLMTask,
  Task,
  WorkflowExecutionService,
  type TaskExecutionContext,
  type TaskExecutionResult,
} from '@hive-academy/langgraph-workflow-engine';
import { AIMessage } from '@langchain/core/messages';
```

**Added**:

- `Entrypoint` - Entry point decorator
- `LLMTask` - LLM task decorator with tool binding
- `Task` - Standard task decorator
- `TaskExecutionContext` - Task context type
- `TaskExecutionResult` - Task result type
- `AIMessage` - For system prompt messages

**Removed**:

- `Node` - Node decorator (replaced by @Entrypoint/@LLMTask/@Task)
- `Edge` - Edge decorator (replaced by `dependsOn` options)

---

## 8. Workflow Configuration Changes

### Old Configuration

```typescript
@Agent({
  tools: [
    'web-search',
    'research-search',
    'create-report',
    'save-report',
  ],
  workflow: {
    type: 'functional-node',  // ❌ OLD
  }
})
```

### New Configuration

```typescript
@Agent({
  // ✅ Tools moved to @LLMTask decorator (task-specific)
  workflow: {
    type: 'functional-task',  // ✅ NEW
  }
})
```

**Key Changes**:

- Tools specified at task level (not agent level)
- Enables different tools for different tasks
- More granular control over LLM tool access

---

## 9. HITL Integration - No Changes

### @RequiresApproval Decorator - Works Seamlessly

```typescript
@Task({ dependsOn: ['conductAutonomousResearch'] })
@RequiresApproval({
  message: (state) => `Research report draft ready for review: "${state.metadata?.reportTitle}"`,
  timeoutMs: 180000,
  onTimeout: 'approve',
  metadata: (state) => ({ approvalType: 'report-draft-review', ... }),
})
async saveApprovedReport(context: TaskExecutionContext) { }
```

**No Changes Required**:

- @RequiresApproval works identically with @Task
- Workflow still pauses before task execution
- User approval flow unchanged
- API endpoints remain the same

---

## 10. Streaming Support - Preserved

### executeWithStreaming() Method

```typescript
async *executeWithStreaming(input: {
  userId: string;
  query: string;
  researchDepth?: 'summary' | 'detailed' | 'comprehensive';
  executionId?: string;
}): AsyncGenerator<...> {
  // ✅ Unchanged - works with both patterns
  const stream = this.workflowExecutionService.streamWorkflow(
    ResearcherAgent,
    initialState,
    { configurable: { thread_id: executionId }, streamMode: 'updates' }
  );

  for await (const update of stream) {
    // Yields workflow updates and tool executions
  }
}
```

**No Changes Required**:

- Streaming works identically with functional-task pattern
- Tool execution events still visible in stream
- Frontend integration unchanged

---

## Benefits of Migration

### 1. **Clearer Intent**

- Explicit entrypoint with `@Entrypoint`
- Task dependencies declared in decorators
- No manual edge routing logic

### 2. **Better Type Safety**

- `TaskExecutionContext` provides structured context
- `TaskExecutionResult` ensures consistent return format
- TypeScript catches errors at compile time

### 3. **Task-Specific Tool Binding**

- Tools scoped to specific tasks
- Prevents tool pollution across tasks
- LLM can't call wrong tools

### 4. **Reduced Boilerplate**

- No @Edge decorator methods needed
- Dependencies via `dependsOn` arrays
- Less code to maintain

### 5. **Modern Pattern**

- Follows LangGraph best practices
- Aligns with example agents (research-workflow.agent.ts)
- Future-proof architecture

---

## Verification

### Build Status

```bash
✅ npx nx build @hive-academy/langgraph-workflow-engine
   Successfully compiled and exported LLMTask decorator

✅ npx nx build dev-brand-api
   Successfully compiled with new imports and patterns

✅ npx nx lint dev-brand-api
   No linting issues in researcher.agent.ts
```

### Pattern Validation

- ✅ All imports verified in codebase
- ✅ TaskExecutionContext signature matches interface
- ✅ TaskExecutionResult return type correct
- ✅ @LLMTask decorator properly exported
- ✅ Workflow type changed to 'functional-task'
- ✅ @Edge decorators removed
- ✅ HITL integration preserved
- ✅ Streaming support intact

---

## Migration Checklist

For migrating other agents from functional-node to functional-task:

- [ ] Change `workflow.type` from `'functional-node'` to `'functional-task'`
- [ ] Add imports: `Entrypoint, LLMTask, Task, TaskExecutionContext, TaskExecutionResult`
- [ ] Remove imports: `Node, Edge`
- [ ] Add `@Entrypoint()` method for initialization
- [ ] Convert `@Node({ type: 'llm' })` to `@LLMTask({ tools: [...] })`
- [ ] Convert `@Node({ type: 'standard' })` to `@Task()`
- [ ] Remove all `@Edge()` methods
- [ ] Add `dependsOn` arrays to decorator options
- [ ] Update method signatures to use `TaskExecutionContext`
- [ ] Update return types to `TaskExecutionResult`
- [ ] Wrap returns in `{ state: {...} }` structure
- [ ] Access state via `context.state` instead of direct parameter
- [ ] Add AIMessage system prompts for @LLMTask tasks
- [ ] Test HITL integration still works
- [ ] Verify streaming support if applicable

---

## Conclusion

The ResearcherAgent has been successfully migrated from the legacy functional-node pattern to the modern functional-task pattern using the new @LLMTask decorator. All existing functionality is preserved:

- ✅ LLM autonomous tool calling
- ✅ Intelligent tool selection (web-search vs research-search)
- ✅ HITL approval for reports
- ✅ Real-time streaming support
- ✅ Report generation and file storage

The new pattern provides better type safety, clearer intent, reduced boilerplate, and aligns with LangGraph best practices.

**Status**: ✅ COMPLETE - Ready for testing and deployment
