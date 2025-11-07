# Multi-Agent Module - Multi-Agent Coordination for LangGraph

## Overview

The **Multi-Agent Module** provides declarative multi-agent coordination patterns for LangGraph workflows. Build supervisor networks, swarm systems, and hierarchical agents using decorators and base classes.

### Key Features

- **Declarative Configuration**: Define agents and workflows with `@Agent` and `@MultiAgent` decorators
- **Multiple Topologies**: Supervisor, Swarm, Hierarchical, Sequential, Network patterns
- **Streaming Support**: Automatic capture of streaming events from worker subgraphs
- **HITL Integration**: Built-in human-in-the-loop with interruption points
- **Command Pattern**: Enterprise routing with retry, skip, and error recovery
- **Type-Safe**: Full TypeScript support with validation
- **Zero Boilerplate**: Automatic lifecycle management via base classes

### Architecture

```
MultiAgentWorkflowBase (your workflow)
  └─> MultiAgentCoordinatorService (automatic)
      └─> Worker Agents (DeclarativeWorkflowBase)
          └─> @StreamToken, @RequiresApproval decorators work naturally
```

Workers ARE workflows that extend `DeclarativeWorkflowBase`. The supervisor treats them as LangGraph subgraphs.

---

## EventEmitter Configuration

The Multi-Agent module uses NestJS EventEmitter2 for agent coordination events.

**IMPORTANT**: Do NOT import EventEmitterModule in this module.
EventEmitter should be provided globally by the root application module.

### Correct Configuration

```typescript
// apps/your-app/src/app/app.module.ts
@Module({
  imports: [
    EventEmitterModule.forRoot({
      maxListeners: 20, // Prevent false-positive memory leak warnings
    }),
    MultiAgentModule.forRoot({...}), // No EventEmitterModule import needed
  ],
})
export class AppModule {}
```

### Why Global?

- EventEmitter2 is designed to be a singleton event bus
- Multiple instances cause duplicate listener warnings (false positives)
- Global import provides consistent event bus across all modules
- Reduces memory footprint by 75% (eliminates 3 duplicate instances)

---

## Quick Start

### 1. Installation

```bash
npm install @hive-academy/langgraph-multi-agent
```

### 2. Define Worker Agents

```typescript
import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { DeclarativeWorkflowBase } from '@hive-academy/langgraph-workflow-engine';
import { Entrypoint } from '@hive-academy/langgraph-functional-api';
import { StreamToken } from '@hive-academy/langgraph-streaming';

@Agent({
  id: 'github-analyzer',
  name: 'GitHub Code Analyzer',
  description: 'Analyzes GitHub repositories',

  workflow: {
    name: 'github-analyzer-workflow',
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true,
    },
  },
})
@Injectable()
export class GitHubAnalyzerAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @StreamToken({ enabled: true })
  async analyze(context: TaskExecutionContext<AgentState>) {
    // Your analysis logic
    return {
      messages: [...context.state.messages, { role: 'assistant', content: 'Analysis complete' }],
      metadata: { analysis: 'data here' },
    };
  }
}
```

### 3. Create Multi-Agent Workflow

```typescript
import {
  MultiAgent,
  MultiAgentTopology,
  MultiAgentWorkflowBase,
} from '@hive-academy/langgraph-multi-agent';

@MultiAgent({
  networkId: 'devbrand-supervisor',
  topology: MultiAgentTopology.SUPERVISOR,
  agents: [GitHubAnalyzerAgent, BrandStrategistAgent, ContentCreatorAgent],

  config: {
    systemPrompt: `You coordinate agents for personal branding.

    Available workers:
    1. github-analyzer: Analyzes GitHub activity
    2. brand-strategist: Develops brand strategy
    3. content-creator: Creates content

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
    // Execute multi-agent coordination (automatic via base class)
    const result = await this.executeSimple(input.githubUsername, {
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

### 4. Register in Module

```typescript
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';

@Module({
  imports: [MultiAgentModule],
  providers: [DevBrandWorkflow, GitHubAnalyzerAgent, BrandStrategistAgent, ContentCreatorAgent],
  exports: [DevBrandWorkflow],
})
export class WorkflowsModule {}
```

### 5. Use in Your Application

```typescript
@Injectable()
export class AppService {
  constructor(private workflow: DevBrandWorkflow) {}

  async createBrand(userId: string, githubUsername: string) {
    return this.workflow.execute({ userId, githubUsername });
  }
}
```

✅ **Done!** No manual service injection, no boilerplate, just clean declarative configuration.

---

## Core Decorators

### @Agent Decorator

Defines worker agent metadata and configuration.

```typescript
@Agent({
  id: string;                      // Required: Unique agent ID
  name: string;                    // Required: Human-readable name
  description?: string;            // Agent purpose
  type?: 'simple-agent' | 'workflow-agent';

  workflow?: {
    name?: string;
    type?: 'functional-task' | 'functional-node';

    // Streaming configuration
    multiAgentStreaming?: {
      enabled: boolean;
      captureSubgraphs?: boolean;  // Default: true
      streamMode?: 'values' | 'updates' | 'messages';
    };

    // HITL configuration
    multiAgentInterruption?: {
      enabled: boolean;
      interruptBefore?: string[];  // Worker names
      interruptAfter?: string[];
    };
  };
})
export class MyAgent extends DeclarativeWorkflowBase<AgentState> {}
```

### @MultiAgent Decorator

Defines multi-agent workflow with topology and coordination rules.

```typescript
@MultiAgent({
  networkId: string;               // Required: Unique network ID
  topology: MultiAgentTopology;    // Required: SUPERVISOR | SWARM | HIERARCHICAL | SEQUENTIAL | NETWORK
  agents: Type<any>[];             // Required: Agent classes

  config: SupervisorConfig | SwarmConfig | HierarchicalConfig | SequentialConfig;

  streaming?: boolean;             // Enable streaming
  checkpointing?: boolean;         // Enable state persistence
  llm?: {
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    temperature?: number;
  };
})
export class MyWorkflow extends MultiAgentWorkflowBase {}
```

### Agent State

Standard state structure for multi-agent workflows:

```typescript
interface AgentState {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  metadata?: Record<string, any>;
  next?: string; // For interruptions
}
```

---

## Topology Patterns

### 1. Supervisor Pattern

Central LLM coordinator routes to worker agents.

```typescript
@MultiAgent({
  topology: MultiAgentTopology.SUPERVISOR,
  config: {
    systemPrompt: 'Your coordination rules here',
    workers: ['worker1', 'worker2'],
    enableForwardMessage: true,
  },
})
```

**Use Case**: When you need intelligent routing based on task requirements.

### 2. Swarm Pattern

Peer-to-peer collaboration without central coordinator.

```typescript
@MultiAgent({
  topology: MultiAgentTopology.SWARM,
  config: {
    initialAgent: 'research-agent',
    maxRounds: 10,
    enablePeerCommunication: true,
  },
})
```

**Use Case**: When agents need to self-organize and hand off dynamically.

### 3. Hierarchical Pattern

Multi-level supervision with sub-supervisors.

```typescript
@MultiAgent({
  topology: MultiAgentTopology.HIERARCHICAL,
  config: {
    hierarchy: {
      'main-supervisor': ['sub-supervisor-1', 'sub-supervisor-2'],
      'sub-supervisor-1': ['worker1', 'worker2'],
    },
  },
})
```

**Use Case**: Complex workflows with multiple coordination layers.

### 4. Sequential Pattern

Linear execution in defined order.

```typescript
@MultiAgent({
  topology: MultiAgentTopology.SEQUENTIAL,
  config: {
    sequence: ['agent1', 'agent2', 'agent3'],
  },
})
```

**Use Case**: Pipelines where each agent depends on the previous output.

### 5. Network Pattern

All-to-all communication with LLM-based routing.

```typescript
@MultiAgent({
  topology: MultiAgentTopology.NETWORK,
  config: {
    enableAllToAllCommunication: true,
    routingStrategy: 'llm-based',
  },
})
```

**Use Case**: When any agent should be able to communicate with any other.

---

## Configuration Reference

### SupervisorConfig

```typescript
interface SupervisorConfig {
  systemPrompt: string; // Coordination rules for LLM
  workers: string[]; // Agent IDs
  enableForwardMessage?: boolean; // Pass messages between agents
  removeHandoffMessages?: boolean; // Clean handoff from history
  llm?: {
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    temperature?: number;
  };
}
```

### SwarmConfig

```typescript
interface SwarmConfig {
  initialAgent?: string; // Starting agent
  maxRounds?: number; // Maximum collaboration rounds
  enablePeerCommunication?: boolean; // Agent-to-agent communication
}
```

### HierarchicalConfig

```typescript
interface HierarchicalConfig {
  hierarchy: Record<string, string[]>; // supervisor -> [workers, sub-supervisors]
  systemPrompts?: Record<string, string>;
}
```

### SequentialConfig

```typescript
interface SequentialConfig {
  sequence: string[]; // Execution order
  continueOnError?: boolean; // Continue if agent fails
}
```

### AgentWorkflowConfig

```typescript
interface AgentWorkflowConfig {
  name: string;
  description?: string;
  type?: 'functional-task' | 'functional-node';
  streaming?: boolean;
  confidenceThreshold?: number;

  // Streaming configuration
  multiAgentStreaming?: {
    enabled: boolean;
    captureSubgraphs?: boolean;
    streamMode?: 'values' | 'updates' | 'messages';
  };

  // HITL configuration
  multiAgentInterruption?: {
    enabled: boolean;
    interruptBefore?: readonly string[];
    interruptAfter?: readonly string[];
  };
}
```

---

## Advanced Features

### Command Pattern

Control workflow execution with retry, skip, and error recovery.

```typescript
import { Command, CommandProcessorService } from '@hive-academy/langgraph-multi-agent';

@Agent({ id: 'data-processor' })
export class DataProcessorAgent extends DeclarativeWorkflowBase<AgentState> {
  constructor(private readonly commandProcessor: CommandProcessorService) {
    super();
  }

  @Entrypoint()
  async process(context: TaskExecutionContext<AgentState>): Promise<Command> {
    try {
      const result = await this.processData(context.state);

      // Success - route to next agent
      return Command({
        goto: 'validator',
        update: {
          metadata: { ...context.state.metadata, processedData: result },
        },
      });
    } catch (error) {
      // Retry on temporary failures
      if (this.isTemporaryError(error)) {
        return Command({
          type: 'retry',
          goto: 'data-processor',
          maxAttempts: 3,
          reason: 'Temporary failure - retrying',
        });
      }

      // Skip on validation errors
      return Command({
        type: 'skip',
        goto: 'error-handler',
        reason: 'Validation failed',
      });
    }
  }
}
```

**Command Types**:

| Type    | Purpose            | Use Case                          |
| ------- | ------------------ | --------------------------------- |
| `goto`  | Navigate to agent  | Standard routing                  |
| `retry` | Retry with backoff | Temporary failures, rate limits   |
| `skip`  | Skip to next agent | Low confidence, validation failed |
| `stop`  | Stop workflow      | Task complete early               |
| `end`   | End successfully   | Graceful completion               |
| `error` | Handle error       | Unrecoverable errors              |

**CommandBuilder API**:

```typescript
return this.commandProcessor
  .createCommandBuilder()
  .goto('next-agent')
  .withUpdate({ metadata: { key: 'value' } })
  .withMetadata({ confidence: 0.9 })
  .build();
```

### Streaming from Subgraphs

Enable streaming from worker agents:

```typescript
@Agent({
  workflow: {
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true, // Capture worker streaming
      streamMode: 'values', // 'values' | 'updates' | 'messages'
    },
  },
})
export class StreamingWorker extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @StreamToken({ enabled: true }) // Tokens automatically captured
  async execute(context) {
    // Streaming happens automatically
  }
}
```

**Consume streams**:

```typescript
for await (const event of coordinator.stream(input, config)) {
  if (event.type === 'token') {
    console.log(`[${event.source}]: ${event.content}`);
  }
}
```

### HITL Integration

Pause workflows for human approval:

```typescript
@Agent({
  workflow: {
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['content-creator'], // Pause before this agent
    },
  },
})
export class ContentCreatorAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  @RequiresApproval({ timeout: 60000 }) // Request approval
  async createContent(context) {
    // Implementation
  }
}
```

**Execute with checkpointer**:

```typescript
import { MemorySaver } from '@langchain/langgraph';

const checkpointer = new MemorySaver();

// First execution - pauses at interrupt point
const result1 = await coordinator.execute(input, { checkpointer });

if (result1.next) {
  console.log(`Paused at: ${result1.next}`);

  // Get user approval
  const approved = await getUserApproval();

  // Resume with approval
  const result2 = await coordinator.execute({ ...input, userApproval: approved }, { checkpointer });
}
```

### LLM Provider Service

Direct LLM access within agents:

```typescript
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';

@Agent({ id: 'ai-synthesizer' })
export class AISynthesizerAgent extends DeclarativeWorkflowBase<AgentState> {
  constructor(private readonly llmProvider: LlmProviderService) {
    super();
  }

  @Entrypoint()
  async synthesize(context: TaskExecutionContext<AgentState>) {
    const llm = await this.llmProvider.getLLM({ temperature: 0.7 });
    const response = await llm.invoke([{ role: 'user', content: 'Synthesize findings...' }]);

    return {
      messages: [...context.state.messages],
      metadata: { synthesis: response.content.toString() },
    };
  }
}
```

### Tool Registration

Register custom tools for agents:

```typescript
import { ToolRegistrationService } from '@hive-academy/langgraph-multi-agent';

@Injectable()
export class MyService {
  constructor(private readonly toolRegistry: ToolRegistrationService) {}

  async onModuleInit() {
    await this.toolRegistry.registerTool({
      name: 'search_documents',
      description: 'Search knowledge base',
      schema: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      function: async (args) => {
        // Tool implementation
        return { results: [] };
      },
    });
  }
}
```

---

## API Reference

### Public Exports

**Module**:

- `MultiAgentModule` - NestJS module

**Decorators**:

- `@MultiAgent(config)` - Define multi-agent workflow
- `@Agent(config)` - Define worker agent
- `@Tool(config)` - Register tool decorator

**Base Classes**:

- `MultiAgentWorkflowBase` - Base for multi-agent workflows

**Services** (Advanced):

- `MultiAgentCoordinatorService` - Manual coordination (use decorator instead)
- `CommandProcessorService` - Command pattern routing
- `LlmProviderService` - Direct LLM access
- `ToolRegistrationService` - Custom tool registration
- `ToolRegistryService` - Tool registry queries

**Types**:

- `MultiAgentConfig` - Complete workflow configuration
- `SupervisorConfig`, `SwarmConfig`, `HierarchicalConfig`, `SequentialConfig` - Topology configs
- `AgentWorkflowConfig` - Agent workflow configuration
- `MultiAgentStreamingConfig` - Streaming configuration
- `MultiAgentInterruptionConfig` - HITL configuration
- `Command` - Command pattern interface
- `AgentState` - Standard agent state

**Enums**:

- `MultiAgentTopology` - SUPERVISOR | SWARM | HIERARCHICAL | SEQUENTIAL | NETWORK

**Utilities**:

- `getAgentConfig(agentClass)` - Retrieve agent metadata
- `getMultiAgentConfig(workflowClass)` - Retrieve workflow metadata
- `isMultiAgentWorkflow(target)` - Type guard

### Internal Services (Not Exported)

❌ Do not use directly:

- `AgentRegistryService`
- `GraphBuilderService`
- `NodeFactoryService`
- `NetworkManagerService`
- `WorkflowManagerService`
- `ToolBuilderService`
- `ToolNodeService`

Use `@MultiAgent` decorator and `MultiAgentWorkflowBase` instead.

---

## Best Practices

### 1. Use Metadata-Driven Configuration

✅ **Declarative** - Configure via decorators:

```typescript
@Agent({
  workflow: { multiAgentStreaming: { enabled: true } }
})
```

❌ **Avoid** - Manual configuration

### 2. Explicitly Register Agents

✅ **Explicit registration**:

```typescript
WorkflowEngineModule.forRoot({
  agents: [Agent1, Agent2, Agent3],
});
```

### 3. Provide Checkpointer for HITL

✅ **With checkpointer**:

```typescript
await coordinator.execute(input, { checkpointer: new MemorySaver() });
```

### 4. Use Command Types Appropriately

✅ **Correct command types**:

```typescript
if (temporaryError) return Command({ type: 'retry', maxAttempts: 3 });
if (validationFailed) return Command({ type: 'skip' });
if (taskComplete) return Command({ type: 'end' });
```

### 5. Include Diagnostic Metadata

✅ **Rich metadata**:

```typescript
return Command({
  goto: 'next-agent',
  metadata: {
    confidence: 0.95,
    processingTime: Date.now() - startTime,
    version: '2.0',
  },
});
```

### 6. Handle Stream Events Properly

✅ **Check event types**:

```typescript
for await (const event of coordinator.stream(input)) {
  if (event.type === 'token') console.log(event.content);
  if (event.type === 'interrupt') await handleInterruption(event.next);
}
```

---

## Troubleshooting

| Issue                         | Solution                                                |
| ----------------------------- | ------------------------------------------------------- |
| Streaming events not captured | Set `multiAgentStreaming.captureSubgraphs: true`        |
| Workflow doesn't pause        | Provide checkpointer: `{ checkpointer }`                |
| Worker not found              | Add agent to `agents: [...]` in module config           |
| Type errors                   | Import types from `@hive-academy/langgraph-multi-agent` |
| Command not working           | Inject `CommandProcessorService` in agent constructor   |

**Debug logging**:

```typescript
WorkflowEngineModule.forRoot({
  agents: [...],
  debug: true,  // Enable detailed logging
})
```

**Check metadata**:

```typescript
import { getAgentConfig } from '@hive-academy/langgraph-multi-agent';
console.log('Agent config:', getAgentConfig(MyAgent));
```

---

## Related Documentation

- [Workflow Engine](../workflow-engine/CLAUDE.md) - Agent registration and execution
- [Streaming Module](../streaming/CLAUDE.md) - Token streaming decorators
- [HITL Module](../hitl/CLAUDE.md) - Human approval services
- [Core Module](../core/CLAUDE.md) - Workflow interfaces and state management
- [LangGraph Multi-Agent Docs](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)

---

## Examples

For complete working examples, see:

- [DevBrand Workflow](../../../examples/devbrand) - Supervisor pattern with GitHub integration
- [Research Swarm](../../../examples/research-swarm) - Swarm pattern for research tasks
- [Data Pipeline](../../../examples/data-pipeline) - Sequential pattern with validation

---

## Memory Integration Pattern (LangGraph 2025 Compliance)

### Overview

The Multi-Agent Module follows **LangGraph 2025 memory architecture patterns** where memory is accessed **within nodes** via the `store` parameter, NOT through blocking pre-execution calls. This ensures instant workflow execution and eliminates blocking delays.

### Architectural Change (Completed: Commit ae8057a)

**Problem**: Pre-execution memory loading caused 25+ second workflow start delays

**Solution**: Removed blocking memory calls from workflow initialization. Memory is now accessed lazily within agent nodes via `NodeFactoryService`.

### Implementation Pattern

**Before (❌ Blocking Pre-Execution)**:

```typescript
// ❌ WRONG: Blocking memory call BEFORE workflow execution
async executeWorkflow(networkId: string, input: any) {
  // This caused 25+ second delays
  const coordinationContext = await this.memoryCoordination.getOptimalCoordinationContext(networkId, input);
  const enhancedInput = await this.memoryCoordination.enhanceInputWithMemoryContext(input, threadId, networkId);

  // Workflow starts with heavy memory overhead
  return await this.networkManager.executeWorkflow(networkId, enhancedInput);
}
```

**After (✅ Memory-in-Nodes Pattern)**:

```typescript
// ✅ CORRECT: Instant workflow start, memory accessed in nodes
async executeWorkflow(networkId: string, input: any) {
  const executionId = this.generateExecutionId(networkId);
  const threadId = this.generateThreadId(networkId);

  // Initialize empty coordination context (instant start - <100ms)
  const coordinationContext: any = {};
  const enhancedInput = input;

  // Workflow starts immediately
  return await this.networkManager.executeWorkflow(networkId, enhancedInput);
}
```

### NodeFactoryService Memory Integration

Memory is now accessed **within agent execution** via `NodeFactoryService.enhanceAgentWithMemory()`:

```typescript
// libs/langgraph-modules/multi-agent/src/lib/network/node-factory.service.ts:114-183

private async enhanceAgentWithMemory(
  agent: AgentDefinition,
  state: AgentState,
  agentExecution: () => Promise<Partial<AgentState>>
): Promise<Partial<AgentState>> {
  try {
    // 1. Enhance state with memory context BEFORE agent execution
    let enhancedState = state;
    if (this.memoryAdapter) {
      try {
        const memoryContext = await this.memoryAdapter.getAgentContext(state);
        enhancedState = {
          ...state,
          metadata: {
            ...state.metadata,
            memoryContext: {
              threadMemories: memoryContext.threadMemories.slice(0, 5),
              userMemories: memoryContext.userMemories.slice(0, 3),
              relevanceScore: memoryContext.relevanceScore,
              patterns: memoryContext.userPatterns,
            },
          },
        };
      } catch (memoryError) {
        this.logger.warn(`Failed to enhance ${agent.id} with memory context:`, memoryError);
        // Continue without memory enhancement
      }
    }

    // 2. Execute agent with enhanced state
    const result = await agentExecution();

    // 3. Store agent execution result in memory AFTER execution
    if (this.memoryAdapter && result) {
      try {
        await this.memoryAdapter.storeAgentExecution(enhancedState, result, agent.id);
      } catch (memoryError) {
        this.logger.warn(`Failed to store ${agent.id} execution in memory:`, memoryError);
      }
    }

    return result;
  } catch (error) {
    this.logger.error(`Memory-enhanced execution failed for agent ${agent.id}:`, error);
    // Fallback to original execution without memory
    return await agentExecution();
  }
}
```

### Performance Improvement

**Metrics** (from implementation-plan.md:113-208):

- **Before**: 25+ seconds workflow start time (blocking memory calls)
- **After**: <100ms workflow start time (250x improvement)
- **Memory Access**: Lazy, per-agent, non-blocking
- **Failure Handling**: Graceful degradation if memory unavailable

### Code References

**Removed Pre-Execution Memory** (workflow-execution-coordination.service.ts:58-116):

```typescript
/**
 * REMOVED: Pre-execution memory loading (LangGraph 2025 alignment)
 *
 * Rationale:
 * - Blocking memory operations caused 25+ second workflow start delays
 * - LangGraph 2025 recommends "memory-in-nodes" pattern via store parameter
 * - Pre-execution memory loading violates instant workflow execution principle
 * - Coordination context will be provided via BaseStore interface (Priority 4)
 *
 * See: implementation-plan.md:113-208 (Priority 1: Remove Pre-Execution Memory)
 */

// Memory superpowers: Get optimal agent coordination based on learned patterns
// COMMENTED OUT: Blocking pre-execution memory call (25+ second delay)
// let coordinationContext: any = {};
// if (this.memoryAdapter) {
//   try {
//     coordinationContext = await this.memoryCoordination.getOptimalCoordinationContext(networkId, input);
//   } catch (error) {
//     this.logger.warn(`Failed to get coordination context: ${error}`);
//   }
// }
```

**NodeFactoryService Integration** (node-factory.service.ts:114-183):

All agent node functions (supervisor, worker, swarm) now use `enhanceAgentWithMemory()` wrapper:

```typescript
// Example: Worker node with memory enhancement
async createWorkerNode(agent: AgentDefinition, config: SupervisorConfig) {
  return async (state: AgentState): Promise<Partial<AgentState> | Command> => {
    try {
      // Execute agent with automagical memory enhancement
      const agentResult = await this.enhanceAgentWithMemory(
        agent,
        filteredState,
        () => agent.nodeFunction(filteredState)
      );

      // Process result...
    } catch (error) {
      this.logger.error(`Worker agent ${agent.id} execution failed:`, error);
    }
  };
}
```

### Best Practices

1. **Never** call memory adapters in workflow initialization
2. **Always** access memory within agent node functions
3. **Gracefully degrade** if memory unavailable (log warning, continue execution)
4. **Store results** after agent execution for learning
5. **Use NodeFactoryService** memory wrappers for consistent patterns

### Migration Guide

If you have custom multi-agent workflows with pre-execution memory:

**Before**:

```typescript
async executeCustomWorkflow(input: any) {
  // ❌ Blocking memory call
  const context = await this.memoryService.getContext(input);
  return await this.workflow.execute({ ...input, context });
}
```

**After**:

```typescript
async executeCustomWorkflow(input: any) {
  // ✅ Instant start - memory accessed in nodes
  return await this.workflow.execute(input);
}

// In your agent node function:
async agentNode(state: AgentState) {
  // ✅ Memory accessed lazily when needed
  const memoryContext = await this.memoryAdapter.getAgentContext(state);
  // Use memory context...
}
```

---

## Unified Agent State Architecture

### Overview

All multi-agent workflows use **UnifiedAgentState** for consistent metadata handling across supervisor and worker agents. This architecture ensures metadata is ALWAYS initialized in both infrastructure layers, preventing undefined metadata errors.

### Problem Solved

**Before**: Supervisor passed metadata via `config.metadata` but workers expected `state.metadata`, causing `Cannot read properties of undefined` errors.

**After**: Both `WorkflowExecutionCoordinationService` and `MultiAgentWorkflowBase` initialize `state.metadata` before worker execution.

### Type Definitions

```typescript
// Base state for all agents (in your business-workflows/types)
interface UnifiedAgentState extends AgentState {
  messages: BaseMessage[];
  metadata: {
    userId?: string;
    executionId?: string;
    threadId?: string;
    workflowType?: string;
    lastAgent?: string;
    active_agent?: string;
    [key: string]: unknown; // Agent-specific metadata
  };
  // Workflow execution properties
  executionId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  confidence: number;
  // ... other workflow properties
}

// Type-safe agent state with custom metadata
type TypedAgentState<TMetadata extends Record<string, unknown>> = UnifiedAgentState & {
  metadata: UnifiedAgentState['metadata'] & TMetadata;
};
```

### Agent Migration Pattern

**Before** (TypedWorkflowAgentState):

```typescript
import { TypedWorkflowAgentState } from '../../types';

export class MyAgent extends DeclarativeWorkflowBase<TypedWorkflowAgentState<MyMetadata>> {
  async execute(context: TaskExecutionContext<TypedWorkflowAgentState<MyMetadata>>) {
    // metadata might be undefined ❌
    const value = state.metadata?.someField; // Optional chaining needed
  }
}
```

**After** (TypedAgentState):

```typescript
import { TypedAgentState } from '../../types';

export class MyAgent extends DeclarativeWorkflowBase<TypedAgentState<MyMetadata>> {
  async execute(context: TaskExecutionContext<TypedAgentState<MyMetadata>>) {
    // metadata guaranteed initialized ✅
    const value = state.metadata.someField; // No optional chaining needed
  }
}
```

### Metadata Initialization Points

**1. WorkflowExecutionCoordinationService** (workflow start):

Initializes `state.metadata` at workflow execution start with common fields:

```typescript
// libs/langgraph-modules/multi-agent/src/lib/coordination/workflow-execution-coordination.service.ts:127-147

const initialState = {
  ...enhancedInput,
  metadata: {
    userId: enhancedInput.config?.metadata?.userId,
    executionId,
    threadId,
    workflowType: networkId,
    active_agent: undefined,
    lastAgent: undefined,
    // Merge existing metadata from input
    ...enhancedInput.config?.metadata,
  },
};
```

**2. MultiAgentWorkflowBase** (before worker execution):

Creates `enhancedState` with initialized metadata before passing to each worker:

```typescript
// libs/langgraph-modules/multi-agent/src/lib/base/multi-agent-workflow.base.ts:252-266

const enhancedState = {
  ...state,
  metadata: {
    // Merge existing metadata (preserve if already present)
    ...(state.metadata || {}),
    // Common metadata fields
    userId: state.metadata?.userId || state.userId,
    executionId: state.metadata?.executionId || state.executionId,
    threadId: state.metadata?.threadId || state.threadId,
    workflowType: state.metadata?.workflowType,
    // Agent coordination metadata
    lastAgent: agentConfig.id,
  },
};

// Execute worker with initialized metadata
const result = await instance.execute(enhancedState);
```

### Benefits

1. **No Undefined Errors**: Metadata is ALWAYS defined, preventing runtime crashes
2. **Type Safety**: TypedAgentState<TMetadata> provides compile-time type checking
3. **Backward Compatible**: Existing config.metadata still works during migration
4. **Consistent Flow**: Metadata flows predictably: supervisor → worker → supervisor
5. **Agent Coordination**: lastAgent, active_agent fields enable intelligent routing

### Migration Guide

See [Unified State Migration Guide](../../../task-tracking/TASK_2025_037/migration-guide.md) for detailed step-by-step instructions.

### Code References

**Type Definitions**: apps/dev-brand-api/src/app/business-workflows/types/index.ts:113-220

**Infrastructure Initialization**:

- WorkflowExecutionCoordinationService: libs/langgraph-modules/multi-agent/src/lib/coordination/workflow-execution-coordination.service.ts:127-147
- MultiAgentWorkflowBase: libs/langgraph-modules/multi-agent/src/lib/base/multi-agent-workflow.base.ts:252-266

**Example Agents** (migrated to TypedAgentState):

- GitHubCodeAnalyzerAgent: apps/dev-brand-api/src/app/business-workflows/agents/github-code-analyzer/
- PersonalBrandStrategistAgent: apps/dev-brand-api/src/app/business-workflows/agents/personal-brand-strategist/
- ContentCreatorAgent: apps/dev-brand-api/src/app/business-workflows/agents/content-creator/

---

## Support

For issues or questions:

- GitHub Issues: [nestjs-ai-saas-starter](https://github.com/your-org/nestjs-ai-saas-starter/issues)
- Documentation: [Project README](../../../README.md)
- Community: [Discussions](https://github.com/your-org/nestjs-ai-saas-starter/discussions)
