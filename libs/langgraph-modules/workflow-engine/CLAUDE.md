# @hive-academy/langgraph-workflow-engine

## Overview

The **Workflow Engine** is the unified orchestration layer for building LangGraph workflows in NestJS. It consolidates three previously separate concerns into a single, cohesive library:

1. **Functional API** - Decorator-driven workflow definitions with task-based and node-based patterns
2. **Multi-Agent** - Sophisticated multi-agent coordination with topology patterns
3. **Tool Integration** - Automatic tool discovery, binding, and execution

**Architecture Philosophy:**

- **Decorator-First**: Pure decorator-driven architecture, no base classes required
- **Zero-Config Defaults**: Sensible defaults with opt-in customization
- **Type-Safe**: Full TypeScript support with intelligent type inference
- **NestJS Native**: Seamless DI integration and module composition

---

## Quick Start

### Module Registration

```typescript
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

@Module({
  imports: [
    // Zero-config - uses sensible defaults
    WorkflowEngineModule.forRoot(),

    // OR: Custom configuration
    WorkflowEngineModule.forRoot({
      compilation: {
        cacheEnabled: true,
        cacheTTL: 3600,
        optimizeGraphs: true,
      },
      execution: {
        defaultTimeout: 60000,
        streamingEnabled: true,
        maxConcurrency: 10,
      },
    }),
  ],
  providers: [MyWorkflow],
})
export class AppModule {}
```

**Key Points:**

- `WorkflowEngineModule` is `global: true` - available everywhere
- No manual registration needed - decorators handle everything
- Configuration stored in `WORKFLOW_ENGINE_MODULE_OPTIONS` token

---

## Workflow Patterns

### Two Distinct Patterns

The workflow-engine supports two mutually exclusive patterns:

1. **Task-Based** (`FUNCTIONAL_TASK`): Sequential, linear execution
   - Decorators: `@Entrypoint`, `@Task`, `@LLMTask`
   - Use Case: Simple pipelines, sequential workflows
2. **Node-Based** (`FUNCTIONAL_NODE`): Complex graph routing
   - Decorators: `@Node`, `@Edge`
   - Use Case: Conditional branching, dynamic routing

**CRITICAL**: These patterns are mutually exclusive. Mixing `@Task` with `@Node` in the same workflow will throw a validation error.

---

## Pattern 1: Task-Based Workflows

### Basic Example

```typescript
import {
  FunctionalWorkflow,
  Entrypoint,
  Task,
  WorkflowType,
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-workflow-engine';

@FunctionalWorkflow({
  name: 'data-pipeline',
  type: WorkflowType.FUNCTIONAL_TASK, // Explicit pattern declaration
  streaming: true,
})
@Injectable()
export class DataPipelineWorkflow {
  constructor(private llm: LlmProviderService) {}

  @Entrypoint({ timeout: 10000 })
  async ingest(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;

    // Load data from source
    const data = await this.loadData();

    return {
      state: { ...state, data, ingested: true },
    };
  }

  @Task({ dependsOn: ['ingest'] })
  async validate(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;

    // Validate data quality
    const valid = this.validateData(state.data);

    return {
      state: { ...state, validated: valid },
    };
  }

  @Task({ dependsOn: ['validate'] })
  async transform(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;

    // Transform data
    const transformed = this.transformData(state.data);

    return {
      state: { ...state, transformed },
    };
  }
}
```

### Execution Order

Tasks execute in **source code order** (top-to-bottom) by default. You can override this with `dependsOn`:

```typescript
@Task({ dependsOn: ['step1', 'step2'] }) // Waits for both
async step3(context: TaskExecutionContext) { ... }
```

### State Management (Annotation-Based)

State in LangGraph workflows is defined via **annotations**, not plain TypeScript interfaces. Annotations define reducers (how state updates merge) and defaults. The `@FunctionalWorkflow` decorator accepts a `channels` parameter to specify the annotation used by the underlying `StateGraph`.

**Using the Default Annotation:**

By default, workflows use `AgentStateAnnotation` from `@hive-academy/langgraph-core`. This provides fields like `messages`, `next`, `current`, `scratchpad`, `task`, `threadId`, `userId`, and `metadata`.

```typescript
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

// Default - AgentStateAnnotation is used automatically
@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_TASK,
})

// Explicit - same effect, but makes the annotation visible
@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_TASK,
  channels: AgentStateAnnotation,
})
```

**Custom Annotations:**

For workflows that need additional state fields, create a custom annotation using `Annotation.Root`:

```typescript
import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

// Extend AgentStateAnnotation with custom fields
const MyWorkflowAnnotation = Annotation.Root({
  ...AgentStateAnnotation.spec,
  userId: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => '',
  }),
  data: Annotation<Record<string, unknown>[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  processed: Annotation<boolean>({
    reducer: (current, update) => update ?? current,
    default: () => false,
  }),
});

// Pass custom annotation to the workflow
@FunctionalWorkflow({
  name: 'data-pipeline',
  type: WorkflowType.FUNCTIONAL_TASK,
  channels: MyWorkflowAnnotation,
})
```

**For HITL-enabled workflows**, use `HitlAgentStateAnnotation` from `@hive-academy/langgraph-hitl`:

```typescript
import { HitlAgentStateAnnotation } from '@hive-academy/langgraph-hitl';

@FunctionalWorkflow({
  name: 'approval-workflow',
  type: WorkflowType.FUNCTIONAL_NODE,
  channels: HitlAgentStateAnnotation,
})
```

**Access State in Tasks:**

```typescript
@Task()
async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const state = context.state as Record<string, unknown>;

  // Modify state - return a new object
  const data = (state['data'] as Record<string, unknown>[]) ?? [];
  const processed = data.map(item => ({ ...item, processed: true }));

  return {
    state: { ...state, data: processed, processed: true }
  };
}
```

**IMPORTANT**: Always return a new state object. Do not mutate `context.state` directly.

---

## Pattern 2: Node-Based Workflows

### Basic Example

```typescript
import {
  FunctionalWorkflow,
  Node,
  Edge,
  WorkflowType,
} from '@hive-academy/langgraph-workflow-engine';

@FunctionalWorkflow({
  name: 'approval-workflow',
  type: WorkflowType.FUNCTIONAL_NODE,
})
@Injectable()
export class ApprovalWorkflow {
  @Node({ id: 'analyze', type: 'llm' })
  async analyze(state: Record<string, unknown>): Promise<Partial<Record<string, unknown>>> {
    const llm = await this.llm.getLLM({ temperature: 0.1 });
    const analysis = await llm.invoke([...]);

    return { analysis, confidence: analysis.confidence };
  }

  @Edge('analyze', 'approve')
  shouldApprove(state: Record<string, unknown>): boolean {
    return (state['confidence'] as number) >= 0.9 && state['riskLevel'] === 'low';
  }

  @Edge('analyze', 'review')
  needsReview(state: Record<string, unknown>): boolean {
    const confidence = state['confidence'] as number;
    return confidence >= 0.6 && confidence < 0.9;
  }

  @Edge('analyze', 'reject')
  shouldReject(state: Record<string, unknown>): boolean {
    return (state['confidence'] as number) < 0.6;
  }

  @Node({ id: 'approve' })
  async approve(state: Record<string, unknown>): Promise<Partial<Record<string, unknown>>> {
    return { approved: true, status: 'approved' };
  }

  @Node({ id: 'review', type: 'human' })
  async review(state: Record<string, unknown>): Promise<Partial<Record<string, unknown>>> {
    // Human-in-the-loop review
    return { needsHumanReview: true };
  }

  @Node({ id: 'reject' })
  async reject(state: Record<string, unknown>): Promise<Partial<Record<string, unknown>>> {
    return { approved: false, status: 'rejected' };
  }
}
```

### Node Types

- **`standard`**: Default node type
- **`llm`**: LLM-powered node (requires LLM service)
- **`tool`**: Tool execution node
- **`human`**: Human-in-the-loop approval
- **`condition`**: Routing/conditional logic
- **`stream`**: Streaming response node
- **`subgraph`**: Nested subworkflow
- **`aggregator`**: Result aggregation

### Edge Patterns

**1. Simple Edge (Unconditional):**

```typescript
@Edge('step1', 'step2')
simpleTransition() {} // Always true
```

**2. Functional Condition (Method Body):**

```typescript
@Edge('analyze', 'process')
shouldProcess(state: Record<string, unknown>): boolean {
  return (state['score'] as number) > 0.8 && !!state['verified'];
}
```

**3. Inline Condition (Lambda):**

```typescript
@Edge('process', 'notify', {
  condition: (state) => state.status === 'completed'
})
notifyOnComplete() {}
```

**4. Dynamic Routing (Return Target):**

```typescript
@Edge('assess', (state) => {
  if (state.score > 0.9) return 'auto_approve';
  if (state.score > 0.7) return 'human_review';
  return 'reject';
})
routeByScore() {}
```

---

## Advanced: LLM Task Decorator

The `@LLMTask` decorator enables **autonomous tool calling** in task-based workflows without converting to node-based patterns.

### Problem It Solves

Traditional task workflows execute linearly. If an LLM needs to call tools, you'd have to:

1. Convert to node-based pattern
2. Implement complex routing logic
3. Manage tool loops manually

`@LLMTask` automates this while keeping sequential workflow simplicity.

### How It Works

```typescript
@FunctionalWorkflow({
  type: WorkflowType.FUNCTIONAL_TASK,
})
@Injectable()
export class ResearchAgent {
  @Entrypoint()
  async init(context: TaskExecutionContext) {
    return { state: { ...context.state, initialized: true } };
  }

  @LLMTask({
    tools: ['web-search', 'extract-content'],
    maxToolIterations: 5,
    toolTimeout: 30000,
    dependsOn: ['init'],
  })
  async research(context: TaskExecutionContext) {
    // LLM autonomously calls tools
    // Framework creates: research ↔ tools_research loop
    // Continues to next task when LLM stops generating tool_calls
    return { state: context.state };
  }

  @Task({ dependsOn: ['research'] })
  async analyze(context: TaskExecutionContext) {
    // Standard task - no tool calling
    return { state: context.state };
  }
}
```

### Generated Graph Structure

```
init → research ↔ tools_research
          ↓ (when no tool_calls)
       analyze → END
```

### Key Features

- **Task-Specific Tools**: Each `@LLMTask` can have different tools
- **Automatic Binding**: Tools resolved from `ToolRegistry` and bound to LLM
- **Iteration Limits**: `maxToolIterations` prevents infinite loops (default: 10)
- **Timeout Control**: `toolTimeout` for each tool call (default: 30s)
- **Auto-Continuation**: Workflow continues when LLM stops calling tools

### Real-World Example

From `apps/dev-brand-api/src/app/business-workflows/agents/examples/research-workflow.agent.ts`:

```typescript
@Agent({
  description: 'Research assistant with autonomous tool calling',
  workflow: {
    type: 'functional-task',
    streaming: true,
  },
})
@Injectable()
export class ResearchWorkflowAgent {
  @Entrypoint()
  async initializeResearch(context: TaskExecutionContext) {
    return { state: { ...context.state, initialized: true } };
  }

  @LLMTask({
    description: 'Search the web for information',
    tools: ['web-search', 'extract-content'],
    maxToolIterations: 5,
    dependsOn: ['initializeResearch'],
  })
  async gatherInformation(context: TaskExecutionContext) {
    return { state: context.state };
  }

  @LLMTask({
    description: 'Analyze research findings',
    tools: ['summarize-content', 'extract-citations'],
    maxToolIterations: 3,
    dependsOn: ['gatherInformation'],
  })
  async analyzeFindings(context: TaskExecutionContext) {
    return { state: context.state };
  }

  @Task({ dependsOn: ['analyzeFindings'] })
  @RequiresApproval({
    message: (state) => `Research complete. Review findings.`,
    timeoutMs: 180000,
  })
  async approveReport(context: TaskExecutionContext) {
    return { state: context.state };
  }
}
```

---

## Multi-Agent Patterns

### @Agent Decorator

Declarative agent configuration with smart defaults.

```typescript
import { Agent } from '@hive-academy/langgraph-workflow-engine';

@Agent({
  description: 'Analyzes GitHub repositories for achievements',
  tools: ['github_analyzer', 'achievement_extractor'],
  workflow: {
    type: 'functional-task',
    streaming: true,
  },
})
@Injectable()
export class GitHubAnalyzerAgent {
  // Auto-derived: id = 'git-hub-analyzer'
  // Auto-generated: name = 'Git Hub Analyzer'

  @Entrypoint()
  async start(context: TaskExecutionContext) { ... }
}
```

**Auto-Derivation:**

- `id`: Converts `GitHubAnalyzerAgent` → `git-hub-analyzer`
- `name`: Converts `GitHubAnalyzerAgent` → `Git Hub Analyzer`
- `type`: Auto-detects based on class hierarchy

### @MultiAgent Topologies

#### 1. Supervisor Pattern

```typescript
@MultiAgent({
  type: 'supervisor',
  supervisor: {
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3,
    },
    workers: ['github-analyzer', 'content-creator', 'brand-strategist'],
    routingStrategy: 'llm-based',
    maxIterations: 10,
    systemPrompt: `You are a workflow supervisor coordinating specialized agents...`,
  },
})
@Injectable()
export class DevBrandSupervisorWorkflow {}
```

**How It Works:**

- Supervisor LLM decides which worker to invoke
- Workers execute and return results to supervisor
- Supervisor continues until task complete or max iterations reached

#### 2. Swarm Pattern

```typescript
@MultiAgent({
  type: 'swarm',
  swarm: {
    workers: [
      { agentId: 'researcher', capabilities: ['research', 'analysis'] },
      { agentId: 'writer', capabilities: ['content-creation'] },
      { agentId: 'reviewer', capabilities: ['quality-check'] },
    ],
    communicationProtocol: 'broadcast',
    handoffStrategy: 'capability-based',
  },
})
@Injectable()
export class ResearchSwarmWorkflow {}
```

**How It Works:**

- Agents communicate via broadcast or direct messaging
- Handoff based on capabilities or explicit routing
- Emergent behavior from agent interactions

#### 3. Hierarchical Pattern

```typescript
@MultiAgent({
  type: 'hierarchical',
  hierarchical: {
    layers: [
      {
        level: 0,
        supervisorId: 'chief-strategist',
        workers: ['brand-strategist', 'market-analyst'],
      },
      {
        level: 1,
        supervisorId: 'brand-strategist',
        workers: ['content-creator', 'social-media-manager'],
      },
    ],
  },
})
@Injectable()
export class HierarchicalStrategyWorkflow {}
```

**How It Works:**

- Multi-level supervision hierarchy
- Each level's supervisor coordinates its workers
- Results bubble up through levels

---

## Tool Integration

### Registering Tools

```typescript
import { Tool } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class GitHubToolsProvider {
  @Tool({
    name: 'github_analyzer',
    description: 'Analyzes GitHub profile for technical achievements',
    schema: {
      username: { type: 'string', required: true },
      includeRepos: { type: 'boolean', default: true },
    },
  })
  async analyzeGitHub(username: string, includeRepos = true): Promise<Analysis> {
    // Tool implementation
    const profile = await this.github.getProfile(username);
    const repos = includeRepos ? await this.github.getRepos(username) : [];

    return {
      profile,
      repos,
      achievements: this.extractAchievements(repos),
    };
  }

  @Tool({
    name: 'achievement_extractor',
    description: 'Extracts achievements from commit history',
  })
  async extractAchievements(commits: Commit[]): Promise<Achievement[]> {
    return commits.filter((c) => this.isSignificant(c)).map((c) => this.toAchievement(c));
  }
}
```

### Tool Registration in Module

```typescript
@Module({
  imports: [
    WorkflowEngineModule.forRoot({
      tools: {
        providers: [GitHubToolsProvider],
      },
    }),
  ],
})
export class AppModule {}
```

### Tool Discovery

Tools are automatically:

1. **Discovered** from registered provider classes via `ToolRegistryService`
2. **Validated** at graph compilation time
3. **Bound** to LLM instances using `llm.bindTools()`
4. **Executed** via LangGraph's `ToolNode` with conditional routing

---

## Real-World Example: Chat Workflow

From `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-chat.workflow.ts`:

```typescript
@FunctionalWorkflow({
  name: 'devbrand-chat-workflow',
  description: 'Conversational interface for DevBrand Chat Studio',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
  confidenceThreshold: 0.6,
})
@Injectable()
export class DevBrandChatWorkflow {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly brandMemory: PersonalBrandMemoryService,
    private readonly githubTools: GitHubIntegrationTools,
    private readonly webTools: WebResearchTools
  ) {}

  @Entrypoint({ timeout: 10000 })
  async parseUserMessage(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    // Use LLM to analyze user intent
    const llm = await this.llmProvider.getLLM({
      temperature: 0.1,
      maxTokens: 200,
    });

    const intentPrompt = `Analyze this user message and determine intent:
Message: "${chatState.userMessage}"

Classify intent as one of: analyze-github, create-content, strategy-advice, general-chat
Extract entities like GitHub username, platforms (LinkedIn, Dev.to), topics.`;

    const intentResponse = await llm.invoke([{ role: 'user', content: intentPrompt }]);
    const intentAnalysis = this.parseIntentResponse(intentResponse.content.toString());

    return {
      state: {
        ...chatState,
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        confidence: intentAnalysis.confidence,
      },
    };
  }

  @Task({ dependsOn: ['parseUserMessage'] })
  async retrieveContext(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    // Search for relevant memories using ChromaDB semantic search
    const searchResults = await this.brandMemory.getPersonalizedContentStrategy(
      chatState.userId,
      chatState.userMessage
    );

    // Get developer context from Neo4j
    const devContext = await this.brandMemory.getDevContext(chatState.userId);

    return {
      state: {
        ...chatState,
        relevantMemories: devContext.recentAchievements || [],
        userPreferences: searchResults || {},
      },
    };
  }

  @Task({ dependsOn: ['retrieveContext'] })
  async executeAction(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    // Route based on intent (simplified - real version has separate tasks)
    switch (chatState.intent) {
      case 'analyze-github':
        return this.analyzeGitHub(chatState);
      case 'create-content':
        return this.createContent(chatState);
      case 'strategy-advice':
        return this.provideStrategy(chatState);
      default:
        return this.generalChat(chatState);
    }
  }

  @Task({ dependsOn: ['executeAction'] })
  async finalizeConversation(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    // Store conversation in ChromaDB for future context
    await this.brandMemory.storeContentPerformance(chatState.userId, {
      id: `conv-${chatState.conversationId}-${Date.now()}`,
      platform: 'devbrand-chat' as const,
      content: `User: ${chatState.userMessage}\nAssistant: ${chatState.response}`,
      engagementScore: chatState.confidence,
      metrics: { views: 1, likes: 0, comments: 0, shares: 0 },
      createdAt: new Date().toISOString(),
      userId: chatState.userId,
    });

    return {
      state: {
        ...chatState,
        messageHistory: [
          ...chatState.messageHistory,
          { role: 'user', content: chatState.userMessage },
          { role: 'assistant', content: chatState.response },
        ],
      },
    };
  }
}
```

---

## Best Practices

### 1. Choose the Right Pattern

**Use Task-Based When:**

- Sequential execution is sufficient
- Simple pipeline or waterfall flow
- Each step processes previous step's output
- Linear dependencies

**Use Node-Based When:**

- Complex conditional routing needed
- Dynamic branching based on state
- Parallel execution paths
- Fan-out/fan-in patterns

### 2. State Management

```typescript
// ✅ CORRECT: Return new state
@Task()
async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  return {
    state: { ...context.state, processed: true }
  };
}

// ❌ WRONG: Mutating state
@Task()
async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  context.state.processed = true; // Don't do this
  return { state: context.state };
}
```

### 3. Type Safety

```typescript
// ✅ CORRECT: Use annotation-derived types for type safety
import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

const MyAnnotation = Annotation.Root({
  ...AgentStateAnnotation.spec,
  userId: Annotation<string>({ reducer: (c, u) => u ?? c, default: () => '' }),
  data: Annotation<unknown[]>({ reducer: (c, u) => u ?? c, default: () => [] }),
});

type MyState = typeof MyAnnotation.State;

@Task()
async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const state = context.state as MyState;
  // TypeScript knows state.userId exists
}

// ❌ WRONG: Using any
@Task()
async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const state: any = context.state; // Lose type safety
}
```

### 4. Error Handling

```typescript
@Task()
async riskyOperation(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  try {
    const result = await this.externalService.call();
    return { state: { ...context.state, result } };
  } catch (error) {
    console.error('Operation failed:', error);
    return {
      state: {
        ...context.state,
        error: error.message,
        failed: true
      }
    };
  }
}
```

### 5. Tool Validation

```typescript
// ✅ CORRECT: Use registered tools
@LLMTask({
  tools: ['web-search', 'extract-content'], // These must exist in ToolRegistry
})

// ❌ WRONG: Referencing non-existent tools
@LLMTask({
  tools: ['fake-tool'], // Will fail at compilation
})
```

### 6. Streaming

Enable streaming for real-time UX:

```typescript
@FunctionalWorkflow({
  streaming: true, // Enable streaming
})
```

Then consume via streaming API:

```typescript
const stream = await workflowExecutor.stream(workflow, initialState);
for await (const event of stream) {
  console.log('Event:', event);
}
```

---

## Common Pitfalls

### 1. Mixing Patterns

```typescript
// ❌ WRONG: Mixing @Task and @Node
@FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_TASK })
export class BadWorkflow {
  @Entrypoint()
  async start() {}

  @Node() // ERROR: Can't mix with @Entrypoint/@Task
  async wrongNode() {}
}
```

### 2. Forgetting dependsOn

```typescript
// ❌ WRONG: Tasks may execute out of order
@Task()
async step1() { }

@Task() // No dependsOn - may run before step1
async step2() { }

// ✅ CORRECT: Explicit dependency
@Task({ dependsOn: ['step1'] })
async step2() { }
```

### 3. Not Setting Workflow Type

```typescript
// ❌ WRONG: Ambiguous pattern
@FunctionalWorkflow({ name: 'my-workflow' }) // Missing type

// ✅ CORRECT: Explicit pattern
@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_TASK
})
```

---

## Debugging

### Time-Travel Integration

Enable automatic Time-Travel registration:

```typescript
@FunctionalWorkflow({
  timeTravel: true, // Auto-register with Time-Travel service
})
```

Or with custom config:

```typescript
@FunctionalWorkflow({
  timeTravel: {
    enabled: true,
    domain: 'chat-workflows',
    metadata: { version: '1.0' },
  },
})
```

### Logging

The workflow-engine provides detailed logging:

```typescript
WorkflowEngineModule.forRoot({
  debugging: {
    enabled: true,
    logLevel: 'debug',
    traceExecution: true,
  },
});
```

---

## Performance Tips

1. **Enable Caching**: Compiled graphs are cached by default
2. **Optimize LLM Calls**: Set appropriate `temperature` and `maxTokens`
3. **Limit Tool Iterations**: Set realistic `maxToolIterations` to prevent runaway loops
4. **Use Streaming**: For long-running workflows, enable streaming for better UX
5. **Parallelize When Possible**: Use node-based patterns for parallel execution

---

## Migration Guide

### From Legacy Patterns

If migrating from older workflow patterns:

1. **Remove base classes**: No need to extend `UnifiedWorkflowBase`
2. **Add explicit type**: Set `type: WorkflowType.FUNCTIONAL_TASK` or `FUNCTIONAL_NODE`
3. **Use annotation-based state**: Define custom annotations instead of extending `WorkflowState`/`FunctionalWorkflowState` interfaces. Use the `channels` parameter on `@FunctionalWorkflow` to pass your annotation.
4. **Apply `@Injectable()`**: Workflows must be NestJS providers
5. **Update handler signatures**: Node/edge handlers use `Record<string, unknown>` instead of `WorkflowState`

**Before:**

```typescript
export class MyWorkflow extends UnifiedWorkflowBase {
  execute() { ... }
}
```

**After:**

```typescript
@FunctionalWorkflow({
  type: WorkflowType.FUNCTIONAL_TASK,
})
@Injectable()
export class MyWorkflow {
  @Entrypoint()
  async start(context: TaskExecutionContext) { ... }
}
```

---

## Reference

### Decorator Quick Reference

| Decorator             | Pattern     | Purpose                |
| --------------------- | ----------- | ---------------------- |
| `@FunctionalWorkflow` | Both        | Mark class as workflow |
| `@Entrypoint`         | Task        | Starting point         |
| `@Task`               | Task        | Sequential step        |
| `@LLMTask`            | Task        | LLM + tools step       |
| `@Node`               | Node        | Graph vertex           |
| `@Edge`               | Node        | Graph edge/transition  |
| `@Agent`              | Multi-Agent | Agent configuration    |
| `@MultiAgent`         | Multi-Agent | Topology configuration |
| `@Tool`               | Tool        | Tool registration      |

### Key Exports

```typescript
import {
  // Decorators
  FunctionalWorkflow,
  Entrypoint,
  Task,
  LLMTask,
  Node,
  Edge,
  Agent,
  MultiAgent,
  Tool,

  // Types
  WorkflowType,
  TaskExecutionContext,
  TaskExecutionResult,

  // Services
  WorkflowExecutionService,
  LlmProviderService,
} from '@hive-academy/langgraph-workflow-engine';
```
