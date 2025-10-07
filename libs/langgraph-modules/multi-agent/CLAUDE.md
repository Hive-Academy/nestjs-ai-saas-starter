# Multi-Agent Module - Agent Coordination and Multi-Agent Workflows

## Overview

The **Multi-Agent Module** enables sophisticated multi-agent coordination patterns in LangGraph workflows. It provides declarative configuration for agent networks, streaming propagation from worker subgraphs, and human-in-the-loop (HITL) integration.

### Key Features

- **Declarative Agent Definition**: Define agents with `@Agent` decorator and metadata-driven configuration
- **Multi-Agent Coordination**: Supervisor, hierarchical, and sequential patterns
- **Streaming from Subgraphs**: Automatic streaming capture from worker agents via LangGraph's `subgraphs: true`
- **HITL Integration**: Configurable interruption points with automatic checkpointer propagation
- **Metadata-Driven Architecture**: Configuration stored in agent metadata, consumed during graph compilation
- **Type-Safe**: Full TypeScript support with strict typing
- **LangGraph 2025 Native**: Built on LangGraph's subgraph and interruption APIs

### Integration Architecture

The multi-agent module integrates with:

- **@hive-academy/langgraph-core**: Core workflow interfaces and state management
- **@hive-academy/langgraph-workflow-engine**: Workflow execution and agent registration
- **@hive-academy/langgraph-streaming**: Token streaming decorators (@StreamToken, @StreamProgress)
- **@hive-academy/langgraph-hitl**: Human approval decorators (@RequiresApproval)

### Bottom-Up Architecture

**Critical Understanding**: Multi-agent workflows are built on top of the decorator system.

- **Workers ARE Workflows**: Each worker extends `DeclarativeWorkflowBase`
- **Decorators Already Work**: @StreamToken, @RequiresApproval execute within worker workflows
- **Multi-Agent IS Subgraph Pattern**: Supervisor treats workers as LangGraph subgraphs
- **No Custom Wiring**: Configuration applies existing LangGraph APIs

**Execution Flow**:

```
SupervisorGraph (StateGraph)
  └─> workerNode (registered in supervisor graph)
      └─> agent.execute() ← Runs worker's internal workflow
          └─> @decorators execute ← Base level functionality (streaming, HITL)
```

---

## Quick Start

### Installation

The multi-agent module is part of the LangGraph modules workspace:

```bash
npm install @hive-academy/langgraph-multi-agent
```

### 1. Define Worker Agents

Create worker agents with the `@Agent` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { DeclarativeWorkflowBase } from '@hive-academy/langgraph-workflow-engine';
import { Entrypoint } from '@hive-academy/langgraph-functional-api';
import { StreamToken } from '@hive-academy/langgraph-streaming';

@Agent({
  id: 'github-analyzer',
  name: 'GitHub Code Analyzer',
  description: 'Analyzes GitHub repositories to extract achievements',
  type: 'workflow-agent',

  // Worker configuration with streaming
  workflow: {
    name: 'github-analyzer-workflow',
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true,
      streamMode: 'values',
    },
  },
})
@Injectable()
export class GitHubAnalyzerAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @StreamToken({ enabled: true })
  async analyze(context: TaskExecutionContext<AgentState>) {
    // Your analysis logic here
    return {
      messages: [...context.state.messages],
      metadata: { analysis: 'complete' },
    };
  }
}
```

### 2. Create Multi-Agent Workflow

Use the `@MultiAgent` decorator to create a supervisor workflow:

```typescript
import { Injectable } from '@nestjs/common';
import { MultiAgent, MultiAgentTopology, MultiAgentWorkflowBase } from '@hive-academy/langgraph-multi-agent';

@MultiAgent({
  networkId: 'devbrand-supervisor',
  topology: MultiAgentTopology.SUPERVISOR,

  // Explicitly list worker agents
  agents: [GitHubAnalyzerAgent, BrandStrategistAgent, ContentCreatorAgent],

  // Supervisor configuration
  config: {
    systemPrompt: `You are a supervisor coordinating agents for personal branding.

    Available workers:
    1. github-analyzer: Analyzes GitHub activity
    2. brand-strategist: Develops brand strategy
    3. content-creator: Creates platform content

    Execute them in sequence.`,

    workers: ['github-analyzer', 'brand-strategist', 'content-creator'],
    enableForwardMessage: true,
  },

  streaming: true,
  checkpointing: true,
})
@Injectable()
export class DevBrandWorkflow extends MultiAgentWorkflowBase {
  async execute(input: { userId: string; githubUsername: string }) {
    const message = `Create personal brand for ${input.githubUsername}`;

    // Execute multi-agent coordination (automatic)
    const result = await this.executeSimple(message, {
      userId: input.userId,
      githubUsername: input.githubUsername,
    });

    return {
      achievements: result.finalState.metadata?.githubData?.achievements || [],
      strategy: result.finalState.metadata?.brandStrategy || {},
      content: result.finalState.metadata?.generatedContent || {},
    };
  }
}
```

### 3. Register in Module

```typescript
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';

@Module({
  imports: [MultiAgentModule],
  providers: [
    // Register workflow and all agents
    DevBrandWorkflow,
    GitHubAnalyzerAgent,
    BrandStrategistAgent,
    ContentCreatorAgent,
  ],
  exports: [DevBrandWorkflow],
})
export class WorkflowsModule {}
```

### 4. Use in Your Application

```typescript
@Injectable()
export class AppService {
  constructor(private workflow: DevBrandWorkflow) {}

  async createPersonalBrand(userId: string, githubUsername: string) {
    return this.workflow.execute({ userId, githubUsername });
  }
}
```

**That's it!** No manual service injection, no boilerplate setup, just clean declarative configuration.

### Key Benefits

✅ **Zero Boilerplate** - No manual `onModuleInit` or agent registration
✅ **Declarative** - Configuration via decorators
✅ **Type-Safe** - Full TypeScript support with validation
✅ **Clean API** - Internal services hidden from consumers
✅ **Automatic Setup** - Lifecycle managed automatically

---

## Core Concepts

### @Agent Decorator

The `@Agent` decorator defines agent metadata and configuration.

**Basic Usage**:

```typescript
@Agent({
  id: 'agent-id', // Required: Unique agent identifier
  name: 'Agent Name', // Required: Human-readable name
  description: 'Description', // Optional: Agent purpose
  type: 'workflow-agent', // Optional: Agent type

  workflow: {
    name: 'workflow-name', // Workflow identifier
    // ... streaming and HITL config
  },
})
export class MyAgent extends DeclarativeWorkflowBase<State> {}
```

**Configuration Properties**:

| Property      | Type                | Required | Description                         |
| ------------- | ------------------- | -------- | ----------------------------------- |
| `id`          | string              | Yes      | Unique agent identifier             |
| `name`        | string              | Yes      | Human-readable name                 |
| `description` | string              | No       | Agent purpose description           |
| `type`        | string              | No       | Agent type (default: auto-detected) |
| `workflow`    | AgentWorkflowConfig | No       | Workflow configuration              |

### AgentWorkflowConfig

The `workflow` property configures streaming and HITL integration.

```typescript
interface AgentWorkflowConfig {
  name?: string;

  // Streaming configuration (Phase 1)
  multiAgentStreaming?: {
    enabled: boolean;
    captureSubgraphs?: boolean; // Default: true
    streamMode?: 'values' | 'updates' | 'messages'; // Default: 'values'
  };

  // HITL configuration (Phase 1)
  multiAgentInterruption?: {
    enabled: boolean;
    interruptBefore?: readonly string[]; // Worker names to interrupt before
    interruptAfter?: readonly string[]; // Worker names to interrupt after
  };
}
```

### Agent State

Agents work with a shared state structure:

```typescript
interface AgentState {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  metadata?: Record<string, any>;
  next?: string; // For interruptions - which node to execute next
}
```

---

## Streaming Integration

### Overview

Multi-agent workflows support streaming from worker subgraphs via LangGraph's native `subgraphs: true` option. Workers are subgraphs, and their streaming output (via @StreamToken, @StreamProgress decorators) is automatically captured.

### How It Works

1. **Worker Defines Streaming**: Use @StreamToken, @StreamProgress decorators on worker methods
2. **Metadata Storage**: `multiAgentStreaming` config stored in agent metadata (Phase 1)
3. **Graph Execution**: `NetworkManagerService` reads metadata and applies `subgraphs: true` (Phase 2)
4. **LangGraph Captures**: Worker subgraph streaming output automatically propagated
5. **No Custom Wiring**: Uses native LangGraph 2025 API

### Configuration

**Step 1: Configure Worker Agent**

```typescript
@Agent({
  id: 'streaming-worker',
  workflow: {
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true, // Captures streaming from worker internal workflow
      streamMode: 'values', // 'values' | 'updates' | 'messages'
    },
  },
})
export class StreamingWorkerAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @StreamToken({ enabled: true }) // Streaming decorator works naturally
  async processTask(context: TaskExecutionContext<AgentState>) {
    // Streams tokens as workflow executes
    await this.performLongRunningTask();

    return {
      messages: [
        ...context.state.messages,
        {
          role: 'assistant',
          content: 'Task completed',
        },
      ],
    };
  }
}
```

**Step 2: Execute with Streaming**

```typescript
const coordinator = new MultiAgentCoordinator();

// Stream captures events from worker subgraphs
for await (const event of coordinator.stream(input, config)) {
  if (event.type === 'token') {
    console.log(`[${event.source}]: ${event.content}`);
  }

  if (event.type === 'progress') {
    console.log(`Progress: ${event.percentage}%`);
  }
}
```

### Metadata Aggregation

When multiple workers define streaming configuration, the system uses the **first enabled configuration**:

```typescript
// Worker 1
multiAgentStreaming: {
  enabled: true,
  captureSubgraphs: true,
  streamMode: 'values'  // ← This config used
}

// Worker 2
multiAgentStreaming: {
  enabled: true,
  streamMode: 'updates'  // Ignored (Worker 1 config takes precedence)
}
```

### Stream Mode Options

| Mode       | Description                  | Use Case                 |
| ---------- | ---------------------------- | ------------------------ |
| `values`   | Full state after each update | Complete state snapshots |
| `updates`  | Only state changes           | Minimal data transfer    |
| `messages` | Message updates only         | Chat-style workflows     |

### API Reference

**MultiAgentStreamingConfig**

```typescript
interface MultiAgentStreamingConfig {
  enabled: boolean; // Enable streaming capture
  captureSubgraphs?: boolean; // Capture worker subgraph streaming (default: true)
  streamMode?: 'values' | 'updates' | 'messages'; // Stream mode (default: 'values')
}
```

**Usage in @Agent decorator**

```typescript
@Agent({
  workflow: {
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true,
      streamMode: 'values'
    }
  }
})
```

---

## HITL (Human-in-the-Loop) Integration

### Overview

Multi-agent workflows support interruptions at worker nodes via LangGraph's `interruptBefore`/`interruptAfter` compilation options. Workers can trigger approval requests naturally via @RequiresApproval decorators.

### How It Works

1. **Worker Defines HITL**: Use @RequiresApproval decorator on worker methods
2. **Metadata Storage**: `multiAgentInterruption` config stored in agent metadata (Phase 1)
3. **Graph Compilation**: `GraphBuilderService` aggregates interrupt points and applies to `.compile()` (Phase 2)
4. **LangGraph Triggers**: Workflow pauses at configured worker nodes
5. **Checkpointer Propagates**: Automatically to worker subgraphs

### Configuration

**Step 1: Configure Worker Agent**

```typescript
@Agent({
  id: 'content-creator',
  workflow: {
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['content-creator'], // Pause before this worker
    },
  },
})
export class ContentCreatorAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @RequiresApproval({ timeout: 60000 }) // Approval decorator works naturally
  async createContent(context: TaskExecutionContext<AgentState>) {
    // Requests approval naturally via decorator
    const content = await this.generateContent(context.state);

    return {
      messages: [
        ...context.state.messages,
        {
          role: 'assistant',
          content: `Created: ${content.title}`,
        },
      ],
      metadata: { content },
    };
  }
}
```

**Step 2: Execute with Checkpointer**

```typescript
import { MemorySaver } from '@langchain/langgraph';

const checkpointer = new MemorySaver();
const coordinator = new MultiAgentCoordinator();

// First execution - pauses at interrupt point
const result1 = await coordinator.execute(input, { checkpointer });

if (result1.next) {
  console.log(`Paused for approval at: ${result1.next}`);

  // Request user approval
  const approved = await getUserApproval();

  // Resume with approval
  const approvedInput = { ...input, userApproval: approved };
  const result2 = await coordinator.execute(approvedInput, { checkpointer });

  console.log('Workflow completed:', result2);
}
```

### Metadata Aggregation

Multiple workers can define interruption points. The system **aggregates and deduplicates**:

```typescript
// Worker 1
multiAgentInterruption: {
  enabled: true,
  interruptBefore: ['worker1', 'shared-checkpoint']
}

// Worker 2
multiAgentInterruption: {
  enabled: true,
  interruptBefore: ['worker2', 'shared-checkpoint']
}

// Compiled graph automatically gets:
// interruptBefore: ['worker1', 'worker2', 'shared-checkpoint']  ← Deduplicated
```

### Execution Flow

```
┌─────────────────────────────────────┐
│ Execute workflow with checkpointer  │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│ Graph executes until interrupt node │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│ State saved to checkpointer         │
│ result.next = 'content-creator'     │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│ Request user approval               │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│ Resume with approved input          │
│ Workflow continues from checkpoint  │
└─────────────────────────────────────┘
```

### API Reference

**MultiAgentInterruptionConfig**

```typescript
interface MultiAgentInterruptionConfig {
  enabled: boolean; // Enable interruptions
  interruptBefore?: readonly string[]; // Worker names to interrupt before
  interruptAfter?: readonly string[]; // Worker names to interrupt after
}
```

**Usage in @Agent decorator**

```typescript
@Agent({
  workflow: {
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['worker1', 'worker2'],
      interruptAfter: ['worker3']
    }
  }
})
```

---

## Architecture Notes

### Metadata-Driven Configuration (Phase 1 & 2)

The multi-agent module uses a **metadata-driven architecture**:

1. **Phase 1 (Decorator Enhancement)**:

   - Developers define configuration in `@Agent` decorator
   - Metadata stored via Reflection API
   - Configuration includes streaming and HITL options

2. **Phase 2 (Graph Configuration)**:
   - `GraphBuilderService` reads metadata during compilation
   - `NetworkManagerService` reads metadata during execution
   - Configuration applied to LangGraph native APIs

**Benefits**:

- Declarative configuration (no imperative setup code)
- Type-safe configuration interfaces
- Single source of truth (agent class metadata)
- Automatic aggregation from multiple workers

### LangGraph Native Integration

The implementation uses LangGraph 2025 native APIs:

**Streaming from Subgraphs**:

```typescript
// Applied in NetworkManagerService (Phase 2)
const streamOptions = {
  ...config,
  subgraphs: streamingConfig.captureSubgraphs, // ← LangGraph native option
  streamMode: streamingConfig.streamMode,
};

for await (const chunk of graph.stream(input, streamOptions)) {
  // Events from worker subgraphs automatically captured
}
```

**Interruptions**:

```typescript
// Applied in GraphBuilderService (Phase 2)
const compiledGraph = graph.compile({
  checkpointer,
  interruptBefore: aggregatedInterruptBefore, // ← LangGraph native option
  interruptAfter: aggregatedInterruptAfter,
});
```

### Why No Custom Wiring?

Because workers ARE workflows that extend `DeclarativeWorkflowBase`:

- Workers already use @StreamToken, @StreamProgress decorators
- Workers already use @RequiresApproval decorators
- Supervisor graph treats workers as subgraphs
- LangGraph natively supports subgraph streaming and interruptions

**Result**: Configuration, not implementation. Just tell LangGraph to capture subgraph output.

---

## Configuration

### Complete Agent Configuration

```typescript
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { DeclarativeWorkflowBase } from '@hive-academy/langgraph-workflow-engine';
import { Entrypoint, Task } from '@hive-academy/langgraph-workflow-engine';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';

@Agent({
  // Basic configuration
  id: 'complete-agent',
  name: 'Complete Agent Example',
  description: 'Demonstrates all configuration options',
  type: 'workflow-agent',

  // Workflow configuration
  workflow: {
    name: 'complete-agent-workflow',

    // Streaming configuration
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true,
      streamMode: 'values',
    },

    // HITL configuration
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['complete-agent'],
      interruptAfter: [],
    },
  },
})
export class CompleteAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @StreamToken({ enabled: true })
  @StreamProgress({ enabled: true })
  @RequiresApproval({ timeout: 60000 })
  async processTask(context: TaskExecutionContext<AgentState>) {
    // All decorators work naturally within worker workflow

    return {
      messages: [
        ...context.state.messages,
        {
          role: 'assistant',
          content: 'Task completed with streaming and approval',
        },
      ],
    };
  }
}
```

### Module Configuration

```typescript
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

WorkflowEngineModule.forRoot({
  // Explicitly register agents
  agents: [Agent1, Agent2, Agent3],

  // LLM configuration
  llm: {
    provider: 'openai',
    model: 'gpt-4-turbo',
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
  },

  // Optional: Checkpointing for HITL
  checkpointing: {
    enabled: true,
    provider: 'redis', // or 'memory' for testing
    config: {
      url: process.env.REDIS_URL,
    },
  },
});
```

### LLM Provider Configuration

**OpenAI**:

```typescript
llm: {
  provider: 'openai',
  model: 'gpt-4-turbo',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  maxTokens: 4096,
}
```

**Azure OpenAI**:

```typescript
llm: {
  provider: 'azure-openai',
  model: 'gpt-4',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deployment: 'gpt-4-deployment',
}
```

**Anthropic**:

```typescript
llm: {
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxTokens: 4096,
}
```

---

## API Reference

### Public API (Recommended)

**Decorators** (✅ Use These):

- `@MultiAgent` - Define multi-agent workflows declaratively
- `@Agent` - Define worker agent metadata and configuration
- `MultiAgentWorkflowBase` - Base class for multi-agent workflows

**Configuration Types**:

- `MultiAgentConfig` - Complete multi-agent workflow configuration
- `MultiAgentTopology` - Topology types (SUPERVISOR, SWARM, HIERARCHICAL, SEQUENTIAL)
- `SupervisorConfig` - Supervisor-specific configuration
- `SwarmConfig` - Swarm-specific configuration
- `HierarchicalConfig` - Hierarchical-specific configuration
- `SequentialConfig` - Sequential-specific configuration
- `AgentWorkflowConfig` - Worker agent workflow configuration
- `MultiAgentStreamingConfig` - Streaming configuration interface
- `MultiAgentInterruptionConfig` - HITL interruption configuration interface

**Tool Registration** (Advanced):

- `ToolRegistrationService` - Register custom tools
- `ToolRegistryService` - Query registered tools

### Advanced API (For Power Users)

⚠️ **WARNING**: The following service is for advanced use cases only. Most users should use `@MultiAgent` decorator instead.

**MultiAgentCoordinatorService**:

```typescript
/**
 * ⚠️ Use @MultiAgent decorator instead for 99% of use cases
 *
 * This service is for advanced scenarios requiring manual coordination control.
 * It is automatically injected into MultiAgentWorkflowBase internally.
 */
class MultiAgentCoordinatorService {
  // Internal methods - use MultiAgentWorkflowBase instead
}
```

### Internal Services (DO NOT USE)

The following services are internal implementation details and are **NOT exported**:

❌ `AgentRegistryService` - Internal agent registration
❌ `GraphBuilderService` - Internal graph compilation
❌ `NetworkManagerService` - Internal network execution
❌ `NodeFactoryService` - Internal node creation
❌ `LlmProviderService` - Internal LLM management
❌ `WorkflowManagerService` - Internal workflow orchestration
❌ `ToolBuilderService` - Internal tool compilation
❌ `ToolNodeService` - Internal tool node creation

**These services are used internally by `MultiAgentWorkflowBase` and should never be injected or used directly by consumers.**

### Utilities

- `getAgentConfig(agentClass)` - Retrieves agent metadata from decorator
- `getMultiAgentConfig(workflowClass)` - Retrieves multi-agent metadata from decorator
- `isMultiAgentWorkflow(target)` - Type guard for multi-agent workflows

### Stream Event Types

```typescript
interface StreamEvent {
  type: 'token' | 'progress' | 'state' | 'error' | 'interrupt';
  source?: string; // Worker agent ID
  content?: string; // For token events
  percentage?: number; // For progress events
  state?: any; // For state events
  next?: string; // For interrupt events - which node to execute next
}
```

---

## Troubleshooting

### Common Issues

| Issue                         | Cause                           | Solution                                                           |
| ----------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Streaming events not captured | `captureSubgraphs` not enabled  | Set `multiAgentStreaming.captureSubgraphs: true` in agent metadata |
| Workflow doesn't pause        | Missing checkpointer            | Provide checkpointer in execute config: `{ checkpointer }`         |
| Worker not found              | Agent not registered            | Add agent to `WorkflowEngineModule.forRoot({ agents: [...] })`     |
| Metadata not available        | Using instance instead of class | Use `getAgentConfig(AgentClass)`, not `getAgentConfig(instance)`   |
| Type errors                   | Missing imports                 | Import types from `@hive-academy/langgraph-multi-agent`            |

### Debugging Tips

**Enable debug logging**:

```typescript
WorkflowEngineModule.forRoot({
  agents: [...],
  debug: true,  // Enables detailed logging
})
```

**Check metadata storage**:

```typescript
import { getAgentConfig } from '@hive-academy/langgraph-multi-agent';

const config = getAgentConfig(MyAgent);
console.log('Agent metadata:', config);
```

**Verify streaming configuration**:

```typescript
const config = getAgentConfig(MyAgent);
console.log('Streaming config:', config?.workflow?.multiAgentStreaming);
```

**Verify interruption configuration**:

```typescript
const config = getAgentConfig(MyAgent);
console.log('Interruption config:', config?.workflow?.multiAgentInterruption);
```

---

## Best Practices

### 1. Use Metadata-Driven Configuration

✅ **Good** - Declarative configuration in @Agent decorator:

```typescript
@Agent({
  id: 'worker',
  workflow: {
    multiAgentStreaming: { enabled: true, captureSubgraphs: true }
  }
})
```

❌ **Avoid** - Manual configuration:

```typescript
// Don't do this - use metadata instead
const graph = new StateGraph();
graph.compile({
  /* manual config */
});
```

### 2. Explicitly Register Agents

✅ **Good** - Explicit registration:

```typescript
WorkflowEngineModule.forRoot({
  agents: [Agent1, Agent2, Agent3],
});
```

❌ **Avoid** - Auto-discovery (not supported):

```typescript
// Don't do this - not supported
WorkflowEngineModule.forRoot({
  autoRegister: true, // Does not exist
});
```

### 3. Use Checkpointer for HITL

✅ **Good** - Provide checkpointer for interruptions:

```typescript
const checkpointer = new MemorySaver();
await coordinator.execute(input, { checkpointer });
```

❌ **Avoid** - HITL without checkpointer:

```typescript
// Won't work - no state persistence
await coordinator.execute(input); // Missing checkpointer
```

### 4. Aggregate Interruption Points

✅ **Good** - Configure interruptions on workers:

```typescript
@Agent({
  workflow: {
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['this-worker']
    }
  }
})
```

System automatically aggregates from all workers.

### 5. Handle Stream Events Properly

✅ **Good** - Check event types:

```typescript
for await (const event of coordinator.stream(input)) {
  if (event.type === 'token') {
    console.log(event.content);
  }
  if (event.type === 'interrupt') {
    await handleInterruption(event.next);
  }
}
```

---

## Advanced Topics

### Custom State Schemas

Define custom state beyond AgentState:

```typescript
interface CustomState extends AgentState {
  customField: string;
  metadata: {
    repositoryUrl: string;
    analysisResult: AnalysisResult;
  };
}

@Agent({ id: 'custom-agent' })
export class CustomAgent extends DeclarativeWorkflowBase<CustomState> {
  @Entrypoint()
  async process(context: TaskExecutionContext<CustomState>) {
    // Access custom state fields
    const repo = context.state.metadata.repositoryUrl;
    return { ...context.state, customField: 'updated' };
  }
}
```

### Multiple Streaming Modes

Different workers can have different streaming configurations:

```typescript
// Worker 1 - Full state snapshots
@Agent({
  id: 'worker1',
  workflow: {
    multiAgentStreaming: {
      enabled: true,
      streamMode: 'values'  // Full state after each update
    }
  }
})

// Worker 2 - Only changes
@Agent({
  id: 'worker2',
  workflow: {
    multiAgentStreaming: {
      enabled: true,
      streamMode: 'updates'  // Only state changes
    }
  }
})
```

Note: First enabled configuration takes precedence during execution.

### Conditional Interruptions

Workers can conditionally trigger interruptions:

```typescript
@Agent({
  id: 'conditional-worker',
  workflow: {
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['conditional-worker'],
    },
  },
})
export class ConditionalWorkerAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @RequiresApproval({
    condition: (state) => state.metadata.requiresReview, // Conditional approval
    timeout: 60000,
  })
  async process(context: TaskExecutionContext<AgentState>) {
    // Approval only requested if condition true
    return context.state;
  }
}
```

---

## Additional Resources

### Documentation

- [Phase 1 Implementation Summary](../../../docs/PHASE_1_IMPLEMENTATION_SUMMARY.md)
- [Phase 2 Multi-Agent HITL & Streaming](../../../docs/PHASE_2_MULTI_AGENT_HITL_STREAMING.md)
- [Configuration Flow Example](../../../docs/PHASE_2_CONFIGURATION_FLOW_EXAMPLE.md)
- [Implementation Plan](../../../task-tracking/MULTI_AGENT_HITL_STREAMING_IMPLEMENTATION_PLAN.md)

### Related Modules

- [@hive-academy/langgraph-core](../core/CLAUDE.md) - Core workflow interfaces
- [@hive-academy/langgraph-workflow-engine](../workflow-engine/CLAUDE.md) - Workflow execution
- [@hive-academy/langgraph-streaming](../streaming/CLAUDE.md) - Streaming decorators
- [@hive-academy/langgraph-hitl](../hitl/CLAUDE.md) - Human approval decorators

### LangGraph Documentation

- [Multi-Agent Systems](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [Streaming](https://langchain-ai.github.io/langgraph/concepts/streaming/)
- [Checkpoints & Interruptions](https://langchain-ai.github.io/langgraph/concepts/persistence/)

---

## Support

For issues, questions, or feature requests:

- GitHub Issues: [nestjs-ai-saas-starter](https://github.com/your-org/nestjs-ai-saas-starter/issues)
- Documentation: [Project README](../../../README.md)
- Community: [Discussions](https://github.com/your-org/nestjs-ai-saas-starter/discussions)
