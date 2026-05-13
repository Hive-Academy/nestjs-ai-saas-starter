---
trigger: always_on
---

# @hive-academy/langgraph-workflow-engine

## Overview

The **Workflow Engine** is a unified orchestration layer providing decorator-driven workflow definitions with zero-config defaults. It consolidates functional API (task/node patterns), multi-agent coordination, and execution services into a single cohesive solution.

**Key Features:**

- Decorator-first architecture (`@FunctionalWorkflow`, `@Node`, `@Task`, `@Agent`)
- Two workflow patterns: Task-based (sequential) and Node-based (graph)
- Automatic tool binding and LLM integration
- Multi-agent topologies (supervisor, swarm, hierarchical)
- Time-Travel debugging integration

---

## Architecture

```
┌─────────────────────────────────────────┐
│       APPLICATION LAYER                 │
│   (Business Workflows & Agents)         │
└─────────────────────────────────────────┘
                ▲
                │ Consumes Decorators
                │
┌─────────────────────────────────────────┐
│    @hive-academy/langgraph-workflow-    │
│              engine                     │
│                                          │
│  Functional API | Multi-Agent | Core    │
│  @Workflow      | @Agent      | Metadata│
│  @Node/@Edge    | @MultiAgent | Executor│
│  @Task/@Entry   | @Tool       |         │
└─────────────────────────────────────────┘
```

---

## Module Setup

### Zero-Config

```typescript
@Module({
  imports: [
    WorkflowEngineModule.forRoot(), // Uses sensible defaults
  ],
  providers: [DevBrandChatWorkflow],
})
export class AppModule {}
```

### Custom Configuration

```typescript
WorkflowEngineModule.forRoot({
  compilation: {
    cacheEnabled: true,
    optimizeGraphs: true,
  },
  execution: {
    streamingEnabled: true,
    maxConcurrency: 10,
  },
});
```

---

## Decorator Patterns

### 1. Functional Workflows

#### @FunctionalWorkflow

Marks a class as a LangGraph workflow.

```typescript
@FunctionalWorkflow({
  name: 'chat-workflow',
  type: WorkflowType.FUNCTIONAL_TASK, // or FUNCTIONAL_NODE
  streaming: true,
  timeTravel: true, // Auto-register with Time-Travel
})
@Injectable()
export class ChatWorkflow {
  constructor(private llm: LlmProviderService) {}
}
```

**Options:**

- `type`: `FUNCTIONAL_TASK` (sequential) or `FUNCTIONAL_NODE` (graph)
- `streaming`: Enable streaming responses
- `hitl`: Human-in-the-loop configuration
- `timeTravel`: Auto-register with debugging service

---

### 2. Task-Based Pattern (Sequential)

Use `@Entrypoint` for the starting point and `@Task` for subsequent steps.

```typescript
@FunctionalWorkflow({
  type: WorkflowType.FUNCTIONAL_TASK,
})
@Injectable()
export class DataPipelineWorkflow {
  @Entrypoint()
  async start(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    return { state: { ...context.state, initialized: true } };
  }

  @Task({ dependsOn: ['start'] })
  async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Business logic
    return { state: { ...context.state, processed: true } };
  }
}
```

**Key Points:**

- Tasks execute in decorator order (top-to-bottom)
- State flows through `TaskExecutionContext`
- Return `TaskExecutionResult` with updated state

---

### 3. Node-Based Pattern (Graph)

Use `@Node` for workflow steps and `@Edge` for transitions.

```typescript
@FunctionalWorkflow({
  type: WorkflowType.FUNCTIONAL_NODE,
})
@Injectable()
export class ApprovalWorkflow {
  @Node({ type: 'llm' })
  async analyze(state: WorkflowState): Promise<Partial<WorkflowState>> {
    return { analysis: result };
  }

  @Edge('analyze', 'approve')
  shouldApprove(state: WorkflowState): boolean {
    return state.confidence >= 0.9;
  }

  @Edge('analyze', 'reject')
  shouldReject(state: WorkflowState): boolean {
    return state.confidence < 0.9;
  }
}
```

**Node Types:**

- `standard`: Default node
- `llm`: LLM-powered node
- `tool`: Tool execution
- `human`: Human-in-the-loop
- `condition`: Routing logic

---

### 4. LLM Task Decorator

`@LLMTask` enables autonomous tool calling in sequential workflows.

```typescript
@FunctionalWorkflow({
  type: WorkflowType.FUNCTIONAL_TASK,
})
@Injectable()
export class ResearchAgent {
  @Entrypoint()
  async init(context: TaskExecutionContext) {
    return { state: { ...context.state, ready: true } };
  }

  @LLMTask({
    tools: ['web-search', 'extract-content'],
    maxToolIterations: 5,
    dependsOn: ['init'],
  })
  async research(context: TaskExecutionContext) {
    // LLM autonomously calls tools
    // Creates: research ↔ tools_research loop
    return { state: context.state };
  }
}
```

**Key Features:**

- Task-specific tool sets
- Automatic tool binding
- Max iteration limits (prevents infinite loops)
- Tool timeout control

**Graph Structure:**

```
init → research ↔ tools_research → next_task
```

---

### 5. Multi-Agent Decorators

#### @Agent

Declarative agent configuration with smart defaults.

```typescript
@Agent({
  description: 'Analyzes GitHub repositories',
  tools: ['github_analyzer'],
  workflow: {
    type: 'functional-task',
    streaming: true,
  },
})
@Injectable()
export class GitHubAnalyzerAgent {
  // Auto-derived: id = 'git-hub-analyzer'
  // Auto-generated: name = 'Git Hub Analyzer'
}
```

#### @MultiAgent

Configures multi-agent coordination topology.

**Supervisor Pattern:**

```typescript
@MultiAgent({
  type: 'supervisor',
  supervisor: {
    model: { provider: 'openai', model: 'gpt-4' },
    workers: ['github-analyzer', 'content-creator'],
    routingStrategy: 'llm-based',
  },
})
@Injectable()
export class SupervisorWorkflow {}
```

#### @Tool

Registers tools for agent use.

```typescript
@Injectable()
export class GitHubTools {
  @Tool({
    name: 'github_analyzer',
    description: 'Analyzes GitHub profile',
  })
  async analyze(username: string): Promise<Analysis> {
    return analysis;
  }
}
```

---

## Real-World Example

From `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-chat.workflow.ts`:

```typescript
@FunctionalWorkflow({
  name: 'devbrand-chat-workflow',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
})
@Injectable()
export class DevBrandChatWorkflow {
  constructor(
    private llm: LlmProviderService,
    private memory: PersonalBrandMemoryService,
  ) {}

  @Entrypoint({ timeout: 10000 })
  async parseUserMessage(context: TaskExecutionContext) {
    const { state } = context;
    const llm = await this.llm.getLLM({ temperature: 0.1 });

    const intent = await llm.invoke([
      { role: 'user', content: `Analyze: ${state.userMessage}` }
    ]);

    return {
      state: { ...state, intent: intentAnalysis.intent }
    };
  }

  @Task({ dependsOn: ['parseUserMessage'] })
  async retrieveContext(context: TaskExecutionContext) {
    const memories = await this.memory.getPersonalizedContentStrategy(
      context.state.userId,
      context.state.userMessage
    );

    return {
      state: { ...context.state, relevantMemories: memories }
    };
  }

  @Task({ dependsOn: ['retrieveContext'] })
  async generateResponse(context: TaskExecutionContext) {
    const llm = await this.llm.getLLM({ temperature: 0.7 });
    const response = await llm.invoke([...]);

    return {
      state: { ...context.state, response: response.content }
    };
  }
}
```

---

## Common Patterns

### Pattern Validation

The workflow-engine enforces mutually exclusive decorator patterns:

- **Task-based**: Only `@Entrypoint` + `@Task` + `@LLMTask`
- **Node-based**: Only `@Node` + `@Edge`

Mixing patterns in the same workflow class will throw a validation error.

### State Management

**Task-Based State:**

```typescript
interface MyState extends FunctionalWorkflowState {
  userId: string;
  data: any;
}
```

**Access in Methods:**

```typescript
async myTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const state = context.state as MyState;
  // Modify state
  return { state: { ...state, updated: true } };
}
```

### Tool Integration

Tools are automatically bound to LLMs during graph compilation:

1. Tools registered with `@Tool` decorator
2. Referenced in `@LLMTask({ tools: ['tool-name'] })`
3. Resolved from `ToolRegistry` at runtime
4. Bound to LLM using `llm.bindTools()`

---

## Best Practices

1. **Choose Pattern Early**: Decide between task-based (sequential) or node-based (complex routing)
2. **Explicit Type**: Always set `type: WorkflowType.FUNCTIONAL_TASK` or `FUNCTIONAL_NODE`
3. **State Typing**: Extend `FunctionalWorkflowState` for type safety
4. **Tool Validation**: Ensure tools exist in registry before referencing
5. **Iteration Limits**: Set appropriate `maxToolIterations` to prevent infinite loops
6. **Streaming**: Enable for real-time UX (`streaming: true`)

---

## Reference

**Task-Based Execution Order:**

- Methods execute top-to-bottom in source code
- `dependsOn` can override default order

**Node-Based Execution:**

- Edges determine execution flow
- Conditional edges enable dynamic routing

**Tool Binding:**

- Auto-discovery from `@Tool` decorated methods
- Validation at graph compilation
- Execution via LangGraph's `ToolNode`
