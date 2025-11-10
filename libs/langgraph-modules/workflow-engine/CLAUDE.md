# @hive-academy/langgraph-workflow-engine

## Overview

The **Workflow Engine** is the unified orchestration layer that consolidates three previously separate packages into a single, cohesive solution:

1. **Functional API** - Decorator-driven workflow definitions with task-based and node-based patterns
2. **Multi-Agent** - Sophisticated multi-agent coordination with topology patterns (supervisor, swarm, hierarchical, network)
3. **Workflow Engine Core** - Metadata processing, execution services, and debugging utilities

This library provides a **decorator-first** architecture for building LangGraph workflows in NestJS applications, with zero-config defaults, automatic registration, and intelligent type inference.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│  (Business Workflows, Agents, Custom Implementations)       │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Consumes Decorators
                            │
┌─────────────────────────────────────────────────────────────┐
│              @hive-academy/langgraph-workflow-engine        │
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ Functional API│  │  Multi-Agent  │  │  Core Engine   │  │
│  │               │  │               │  │                │  │
│  │ @Workflow     │  │ @Agent        │  │ Metadata       │  │
│  │ @Node/@Edge   │  │ @MultiAgent   │  │ Processor      │  │
│  │ @Task         │  │ @Tool         │  │ Execution      │  │
│  │ @Entrypoint   │  │               │  │ Services       │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Uses Core Interfaces
                            │
┌─────────────────────────────────────────────────────────────┐
│              @hive-academy/langgraph-core                   │
│  (Shared Interfaces, Types, Constants, Annotations)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Decorator Registration & Consumption

### How Decorators Work

All decorators in the workflow-engine follow a **metadata-driven registration** pattern:

1. **Metadata Storage**: Decorators use `Reflect.defineMetadata()` to attach configuration to classes/methods
2. **NestJS Integration**: Decorators apply `SetMetadata()` for NestJS DI compatibility
3. **Runtime Discovery**: Services (MetadataProcessorService, WorkflowExecutionService) read metadata at runtime
4. **Automatic Registration**: No manual registration required - decorators self-register via reflection

### Module Registration Pattern

```typescript
// App Module
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
        parallelExecution: true,
        maxConcurrency: 10,
      },
      debugging: {
        enabled: true,
        logLevel: 'debug',
        traceExecution: true,
      },
    }),

    // OR: Async configuration with dependency injection
    WorkflowEngineModule.forRootAsync({
      useFactory: (streamingService: StreamingService) => ({
        streamingAdapter: streamingService,
        execution: { streamingEnabled: true },
      }),
      inject: [StreamingService],
    }),
  ],
  providers: [
    // Your workflow classes with decorators
    PersonalBrandStrategistAgent,
    ContentCreatorAgent,
    DevBrandChatWorkflow,
  ],
})
export class AppModule {}
```

**Key Points:**

- `WorkflowEngineModule` is marked as `global: true` - available everywhere
- Exports `MetadataProcessorService` and `WorkflowExecutionService` for runtime use
- Stores configuration in `WORKFLOW_ENGINE_MODULE_OPTIONS` token for decorator access
- No base classes required - pure decorator-driven architecture

---

## Decorator Categories

### 1. Functional API Decorators

#### @FunctionalWorkflow

**Purpose**: Marks a class as a LangGraph workflow with declarative configuration

**Registration**:

- Stores workflow metadata via `WORKFLOW_METADATA_KEY`
- Wraps constructor to apply configuration and enable Time-Travel auto-registration
- Preserves NestJS DI metadata for proper dependency injection

**Consumption**:

```typescript
import { FunctionalWorkflow, Node, Edge } from '@hive-academy/langgraph-workflow-engine';

@FunctionalWorkflow({
  name: 'customer-support',
  description: 'Customer support automation workflow',
  type: WorkflowType.FUNCTIONAL_NODE, // Explicit pattern declaration
  streaming: true,
  cache: true,
  hitl: { enabled: true, timeout: 120000 },
  pattern: 'supervisor',
  interruptNodes: ['human_approval'],
  timeTravel: true, // Auto-register with Time-Travel service
})
@Injectable()
export class CustomerSupportWorkflow {
  // No base class needed - decorator handles everything
  constructor(private llm: LlmProviderService) {}

  @Node({ type: 'llm' })
  async analyzeRequest(state: WorkflowState) {
    // Implementation
  }
}
```

**Configuration Merging**:

1. Module defaults (from `WorkflowEngineModule.forRoot()`)
2. Decorator-level defaults (hardcoded sensible defaults)
3. User-provided options (highest priority)

**Auto-Registration Features**:

- **Time-Travel Integration**: Automatically emits `workflow.auto-register` event when `timeTravel: true`
- **Event-Based Discovery**: Uses global EventEmitter2 for loose coupling
- **Graceful Degradation**: Silently skips if Time-Travel module not available

---

#### @Node

**Purpose**: Marks a method as a workflow node (graph vertex)

**Registration**:

- Stores node metadata in `WORKFLOW_NODES_KEY` array on class
- Stores method-specific metadata via `node:metadata` key
- Wraps method to add node context, approval checks, timeout handling

**Consumption**:

```typescript
@Node({
  id: 'analyze_data',        // Optional - defaults to method name
  name: 'Data Analyzer',
  description: 'Analyzes incoming data',
  type: 'llm',              // standard | tool | llm | human | subgraph | stream | condition | aggregator
  requiresApproval: true,   // Enable HITL approval
  confidenceThreshold: 0.8,
  maxRetries: 3,
  timeout: 30000,
  tags: ['analysis', 'critical']
})
async analyzeData(state: WorkflowState): Promise<Partial<WorkflowState>> {
  // Node logic
  return { analysis: result };
}
```

**Special Node Decorators** (convenience wrappers):

- `@StartNode()` - Entry point (id: 'start')
- `@EndNode()` - Terminal node (id: 'end')
- `@ApprovalNode()` - Human-in-the-loop (type: 'human', requiresApproval: true)
- `@StreamNode()` - Streaming node (type: 'stream')
- `@ConditionNode()` - Routing logic (type: 'condition')
- `@ToolNode()` - Tool execution (type: 'tool')
- `@LLMNode()` - LLM-powered (type: 'llm')
- `@AggregatorNode()` - Result aggregation (type: 'aggregator')
- `@SubgraphNode()` - Subgraph invocation (type: 'subgraph')

**Pattern Validation**:

- Enforces `node-based` pattern via `validateDecoratorPattern()`
- Mutually exclusive with `@Entrypoint` and `@Task` decorators
- Validates at decoration time (not runtime)

---

#### @Edge

**Purpose**: Defines edges (transitions) between nodes

**Registration**:

- Stores edge metadata in `WORKFLOW_EDGES_KEY` array on class
- Stores method-specific metadata via `edge:metadata` key
- Supports functional conditions (method body evaluated as boolean)

**Consumption**:

**Simple Edge** (unconditional):

```typescript
@Edge('analyze', 'process')
analyzeToProcess() {} // Empty method - always true
```

**Functional Condition Edge** (method body as condition):

```typescript
@Edge('analyze', 'approve')
shouldApprove(state: WorkflowState): boolean {
  return state.confidence >= 0.9 && state.riskLevel === 'low';
}
```

**Inline Condition Edge** (lambda in options):

```typescript
@Edge('process', 'notify', {
  condition: (state) => state.status === 'completed'
})
notifyOnComplete() {}
```

**Conditional Routing Edge** (dynamic target selection):

```typescript
@Edge('assessment', (state) => {
  if (state.score > 0.9) return 'auto_approve';
  if (state.score > 0.7) return 'human_review';
  return 'reject';
})
routeByScore() {}
```

**Special Edge Decorators** (convenience wrappers):

1. **@ConditionalEdge** - Multi-path routing with named routes:

```typescript
@ConditionalEdge('analyze', {
  'high_confidence': 'auto_process',
  'medium_confidence': 'human_review',
  'low_confidence': 'reject'
}, { default: 'fallback' })
routeByConfidence(state: WorkflowState): string {
  if (state.confidence > 0.9) return 'high_confidence';
  if (state.confidence > 0.6) return 'medium_confidence';
  return 'low_confidence';
}
```

2. **@ConfidenceRoute** - Threshold-based routing:

```typescript
@ConfidenceRoute('evaluate', {
  highConfidence: { threshold: 0.9, target: 'auto_approve' },
  mediumConfidence: { threshold: 0.6, target: 'human_review' },
  lowConfidence: { target: 'reject' },
  default: 'fallback'
})
routeByConfidenceThreshold() {}
```

3. **@FallbackEdge** - Default/catch-all edge:

```typescript
@FallbackEdge('process', 'error_handler')
processFallback() {} // Lower priority than other edges
```

4. **@ErrorEdge** - Error-triggered edge:

```typescript
@ErrorEdge('risky_operation', 'error_recovery')
handleRiskyError() {} // Only traverses if state.error exists
```

**Pattern Validation**:

- Enforces `node-based` pattern via `validateDecoratorPattern()`
- Mutually exclusive with `@Entrypoint` and `@Task` decorators

---

#### @Entrypoint & @Task

**Purpose**: Sequential/linear workflow pattern (alternative to @Node/@Edge)

**Pattern**: Task-based workflows execute in decorator order (top-to-bottom in class)

**Registration**:

- Stores task metadata in `WORKFLOW_NODES_KEY` (tasks are nodes internally)
- Automatically generates linear edges between tasks
- Entrypoint is always first, tasks follow in order

**Consumption**:

```typescript
@FunctionalWorkflow({
  name: 'data-pipeline',
  type: WorkflowType.FUNCTIONAL_TASK, // Explicit task-based pattern
})
@Injectable()
export class DataPipelineWorkflow {
  @Entrypoint({ description: 'Start data ingestion' })
  async ingestData(state: WorkflowState) {
    return { data: loadedData };
  }

  @Task({ description: 'Validate data quality' })
  async validateData(state: WorkflowState) {
    return { validated: true };
  }

  @Task({ description: 'Transform data' })
  async transformData(state: WorkflowState) {
    return { transformed: processedData };
  }

  @Task({ description: 'Store results' })
  async storeResults(state: WorkflowState) {
    return { stored: true };
  }
}
```

**Pattern Validation**:

- Enforces `task-based` pattern via `validateDecoratorPattern()`
- Mutually exclusive with `@Node` and `@Edge` decorators
- Exactly one `@Entrypoint` required per workflow
- Tasks execute in source code order

---

### 2. Multi-Agent Decorators

#### @Agent

**Purpose**: Declarative agent configuration with smart defaults and auto-detection

**Registration**:

- Stores agent metadata via `AGENT_METADATA_KEY`
- Auto-detects agent type by inspecting class hierarchy
- Auto-applies workflow configuration for `workflow-agent` types
- Applies `SetMetadata('agent:marker', true)` for discovery

**Consumption**:

**Minimal Agent** (Smart Defaults):

```typescript
@Agent({
  description: 'Analyzes GitHub repositories for technical achievements',
})
@Injectable()
export class GitHubAnalyzerAgent {
  // ✅ Auto-derived: id = 'git-hub-analyzer'
  // ✅ Auto-generated: name = 'Git Hub Analyzer'
  // ✅ Auto-detected: type = 'simple-agent'
}
```

**Workflow Agent** (Auto-Detection):

```typescript
@Agent({
  description: 'Multi-step brand analysis and strategy generation',
})
@Injectable()
export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase {
  // ✅ Auto-derived: id = 'personal-brand-strategist'
  // ✅ Auto-generated: name = 'Personal Brand Strategist'
  // ✅ Auto-detected: type = 'workflow-agent' (from DeclarativeWorkflowBase)
  // ✅ Auto-applied: workflow = { streaming: true, confidenceThreshold: 0.7, ... }
}
```

**Full Control** (Explicit Config):

```typescript
@Agent({
  id: 'github-analyzer',
  name: 'GitHub Analyzer',
  description: 'Analyzes GitHub repositories for technical achievements',
  type: 'workflow-agent', // Explicit override
  tools: ['github_analyzer', 'achievement_extractor'],
  capabilities: ['repository_analysis', 'skill_extraction'],
  priority: 'high',
  executionTime: 'medium',
  outputFormat: 'json',
  workflow: {
    name: 'github-analysis-workflow',
    type: 'functional-node', // 🔑 Explicit node-based workflow
    confidenceThreshold: 0.9,
    streaming: true,
    multiAgentStreaming: {
      enabled: true,
      captureSubgraphs: true,
      streamMode: 'values',
    },
    multiAgentInterruption: {
      enabled: true,
      interruptBefore: ['critical_analysis'],
      interruptAfter: ['final_report'],
    },
  },
})
@Injectable()
export class GitHubAnalyzerAgent {
  @Node() async step1() {}
  @Node() async step2() {}
  @Edge('step1', 'step2') connectSteps() {}
}
```

**Smart Defaults**:

- `deriveIdFromClassName()` - Converts `GitHubAnalyzerAgent` → `github-analyzer`
- `humanizeClassName()` - Converts `GitHubAnalyzerAgent` → `GitHub Analyzer`
- `detectAgentType()` - Inspects prototype chain for `DeclarativeWorkflowBase`, `StreamingWorkflowBase`, `UnifiedWorkflowBase`
- `createDefaultWorkflowConfig()` - Applies module config + sensible defaults for workflow-agent types

**Unified Workflow Configuration**:

- **workflow-agent** type auto-applies `@Workflow` metadata internally
- Eliminates need for separate `@Workflow` decorator on agent classes
- `workflow.type` determines decorator pattern ('functional-task' or 'functional-node')
- `workflow.multiAgentStreaming` controls subgraph streaming behavior
- `workflow.multiAgentInterruption` controls HITL interruption points

**Pattern Validation**:

- Agent's `workflow.type` enforces decorator pattern validation
- `functional-task` → only `@Entrypoint` + `@Task` allowed
- `functional-node` → only `@Node` + `@Edge` allowed

---

#### @MultiAgent

**Purpose**: Configures multi-agent coordination topology (supervisor, swarm, hierarchical, network)

**Registration**:

- Stores topology configuration via `MULTI_AGENT_METADATA_KEY`
- Validates topology schema using Zod schemas
- Applies `SetMetadata('multi-agent:marker', true)` for discovery

**Consumption**:

**Supervisor Topology**:

```typescript
@MultiAgent({
  type: 'supervisor',
  supervisor: {
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3,
    },
    workers: ['github-analyzer', 'personal-brand-strategist', 'content-creator'],
    routingStrategy: 'llm-based',
    maxIterations: 10,
    systemPrompt: 'You are a workflow supervisor...',
  },
})
@Injectable()
export class DevBrandSupervisorWorkflow {
  // Supervisor coordinates worker agents
}
```

**Swarm Topology**:

```typescript
@MultiAgent({
  type: 'swarm',
  swarm: {
    workers: [
      { agentId: 'researcher', capabilities: ['research', 'analysis'] },
      { agentId: 'writer', capabilities: ['content-creation'] },
    ],
    communicationProtocol: 'broadcast',
    handoffStrategy: 'capability-based',
  },
})
@Injectable()
export class ResearchSwarmWorkflow {}
```

**Hierarchical Topology**:

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

**Network Topology**:

```typescript
@MultiAgent({
  type: 'network',
  network: {
    nodes: ['agent-1', 'agent-2', 'agent-3'],
    edges: [
      { from: 'agent-1', to: 'agent-2', condition: (state) => state.confidence > 0.8 },
      { from: 'agent-2', to: 'agent-3' },
    ],
    communicationMode: 'message-passing',
  },
})
@Injectable()
export class NetworkCollaborationWorkflow {}
```

**Helper Functions**:

- `getMultiAgentConfig(target)` - Retrieve topology configuration
- `getSupervisorConfig(target)` - Extract supervisor-specific config
- `getSwarmConfig(target)` - Extract swarm-specific config
- `getHierarchicalConfig(target)` - Extract hierarchical-specific config

---

#### @Tool

**Purpose**: Registers tools for agent use (LangChain-compatible tools)

**Registration**:

- Stores tool metadata via `TOOL_METADATA_KEY`
- Marks method as tool via `tool:marker` metadata
- Validates tool signature and return type

**Consumption**:

```typescript
@Injectable()
export class GitHubToolsProvider {
  @Tool({
    name: 'github_analyzer',
    description: 'Analyzes GitHub profile for achievements',
    schema: {
      username: { type: 'string', required: true },
      includeRepos: { type: 'boolean', default: true },
    },
  })
  async analyzeGitHubProfile(username: string, includeRepos = true): Promise<GitHubAnalysis> {
    // Tool implementation
    return analysis;
  }

  @Tool({
    name: 'achievement_extractor',
    description: 'Extracts achievements from commit history',
  })
  async extractAchievements(commits: Commit[]): Promise<Achievement[]> {
    return achievements;
  }
}
```

**Tool Discovery**:

- Tools referenced by name in `@Agent({ tools: ['github_analyzer'] })`
- Resolved from NestJS DI container at runtime
- Auto-converted to LangChain StructuredTool format

---

## Tool Integration System

### Overview

The workflow-engine module provides automatic tool discovery and binding for LangGraph agents. Tools decorated with @Tool are automatically:

- **Discovered** from registered tool classes via ToolRegistryService
- **Bound** to LLM instances using `llm.bindTools()` during graph compilation
- **Executed** autonomously via LangGraph's ToolNode with conditional routing
- **Streamed** in real-time using 'updates' mode for complete tool visibility

This zero-config approach eliminates manual tool wiring, enabling agents to use tools with just decorator configuration.

---

### Quick Start

**Step 1: Create Tool Class**

Create a tool provider class with methods decorated with @Tool:

```typescript
import { Injectable } from '@nestjs/common';
import { Tool } from '@hive-academy/langgraph-workflow-engine';
import { z } from 'zod';

@Injectable()
export class CalculatorTools {
  @Tool({
    name: 'calculator',
    description: 'Performs mathematical calculations on two numbers',
    schema: z.object({
      operation: z
        .enum(['add', 'subtract', 'multiply', 'divide'])
        .describe('Mathematical operation to perform'),
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
  })
  async calculate({ operation, a, b }: { operation: string; a: number; b: number }) {
    switch (operation) {
      case 'add':
        return { result: a + b };
      case 'subtract':
        return { result: a - b };
      case 'multiply':
        return { result: a * b };
      case 'divide':
        if (b === 0) return { error: 'Cannot divide by zero' };
        return { result: a / b };
      default:
        return { error: 'Unknown operation' };
    }
  }
}
```

**Step 2: Register Tools in Module**

Register tool classes in WorkflowEngineModule.forRoot():

```typescript
import { Module } from '@nestjs/common';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { CalculatorTools } from './tools/calculator.tools';
import { GitHubTools } from './tools/github.tools';
import { WebResearchTools } from './tools/web-research.tools';

@Module({
  imports: [
    WorkflowEngineModule.forRoot({
      tools: [CalculatorTools, GitHubTools, WebResearchTools],
      execution: {
        streamingEnabled: true,
      },
    }),
  ],
})
export class AppModule {}
```

**Step 3: Configure Agent Tools**

Specify tools in @Agent decorator - they're automatically bound to the LLM:

```typescript
import { Agent, Node, Edge } from '@hive-academy/langgraph-workflow-engine';
import { Injectable } from '@nestjs/common';

@Agent({
  description: 'Mathematical assistant that can perform calculations',
  tools: ['calculator'], // Automatically bound to LLM, zero manual wiring
  workflow: {
    type: 'functional-node',
  },
})
@Injectable()
export class MathAssistantAgent {
  @Node({ type: 'llm' })
  async processQuery(state: WorkflowState) {
    // LLM automatically has calculator tool bound
    // If user asks "What is 5 + 3?", LLM will call calculator tool
    return state;
  }

  @Edge('processQuery', '__end__')
  finish() {
    return true;
  }
}
```

**Step 4: Execute Workflow and Stream Tool Events**

Execute the workflow with streaming to see tool execution in real-time:

```typescript
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class WorkflowOrchestrator {
  constructor(private readonly execution: WorkflowExecutionService) {}

  async runMathAssistant(query: string) {
    const stream = await this.execution.streamWorkflow(
      MathAssistantAgent,
      { messages: [{ role: 'user', content: query }] },
      { streamMode: 'updates' } // 'updates' mode shows tool execution events
    );

    for await (const event of stream) {
      if (event.node === 'tools') {
        // Tool execution event
        console.log('Tool executed:', event.data);
      } else if (event.node === 'processQuery') {
        // Agent node event
        console.log('Agent response:', event.data);
      }
    }
  }
}

// Example usage:
// User: "What is 15 multiplied by 7?"
// Output:
// Tool executed: { operation: 'multiply', a: 15, b: 7, result: 105 }
// Agent response: { content: "The result is 105" }
```

---

### Tool Execution Flow

The tool execution flow demonstrates how agents autonomously discover, route to, and execute tools:

```
┌─────────────────┐
│   User Query    │
│ "What is 5+3?"  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Agent Node (LLM with bound tools)  │
│  - Receives query                   │
│  - LLM has access to 'calculator'   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  LLM Decision                       │
│  - Decides to use calculator tool   │
│  - Returns tool_calls in message    │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Conditional Routing                 │
│  shouldExecuteTools() checks for:    │
│  - tool_calls present? → 'tools'     │
│  - no tool_calls? → 'continue'       │
└────────┬─────────────────────────────┘
         │
         ├─────────────┐
         │             │
    'tools'       'continue'
         │             │
         ▼             ▼
┌─────────────┐  ┌──────────┐
│  ToolNode   │  │ Next Node│
│  Executes   │  │ or END   │
│  calculator │  └──────────┘
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Tool Result                    │
│  - Appended to state.messages   │
│  - Returns to Agent Node        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Agent Node (with tool result)  │
│  - Synthesizes final response   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Final Response  │
│ "The result is 8"│
└─────────────────┘
```

**Key Decision Points**:

- **shouldExecuteTools()**: Checks `lastMessage.tool_calls` array length
- **Routing**: 'tools' → ToolNode execution, 'continue' → next node or END
- **Tool Loop**: Tools → Agent → (if more tool_calls) → Tools → Agent → ...

---

### Best Practices

**Schema Design**:

- Use `.describe()` on each schema field for better LLM understanding
- Keep schemas simple - avoid deep nesting (max 2-3 levels)
- Use enums for constrained choices (e.g., `z.enum(['option1', 'option2'])`)
- Provide clear, specific descriptions that explain what the field is for

```typescript
// ✅ GOOD: Clear, simple schema with descriptions
schema: z.object({
  username: z.string().describe('GitHub username to analyze'),
  includePrivate: z.boolean().describe('Whether to include private repos'),
});

// ❌ BAD: No descriptions, complex nested structure
schema: z.object({
  user: z.object({
    profile: z.object({
      data: z.object({
        name: z.string(),
      }),
    }),
  }),
});
```

**Tool Naming**:

- Use kebab-case (e.g., 'github-analyzer', not 'GitHubAnalyzer')
- Be specific about what the tool does (e.g., 'extract-code-snippets' not 'tool1')
- Keep names concise but descriptive (2-4 words ideal)
- Tool names must be unique across all registered tools

```typescript
// ✅ GOOD: Specific, kebab-case names
@Tool({ name: 'github-profile-analyzer', ... })
@Tool({ name: 'code-snippet-extractor', ... })

// ❌ BAD: Generic, unclear names
@Tool({ name: 'tool1', ... })
@Tool({ name: 'DoStuff', ... })
```

**Error Handling**:

- Return error objects from tools (don't throw exceptions)
- Include context in error messages for LLM understanding
- Let the LLM see errors so it can retry or adjust strategy
- Use structured error objects with `error` field

```typescript
// ✅ GOOD: Return error object with context
@Tool({ name: 'fetch-data', ... })
async fetchData({ url }: { url: string }) {
  try {
    const response = await fetch(url);
    return { data: await response.json() };
  } catch (error) {
    // Return error object - LLM sees this and can adjust
    return {
      error: 'Failed to fetch data',
      reason: error.message,
      url: url,
    };
  }
}

// ❌ BAD: Throw exception (breaks tool execution flow)
@Tool({ name: 'fetch-data', ... })
async fetchData({ url }: { url: string }) {
  const response = await fetch(url); // Throws if fails
  return { data: await response.json() };
}
```

---

### Troubleshooting

**Error: "Tool Not Found: [tool-name]"**

**Cause**: Tool name mismatch between @Agent configuration and @Tool registration

**Solution**:

1. Verify tool class is registered in `WorkflowEngineModule.forRoot({ tools: [...] })`
2. Check tool name in @Tool decorator matches name in @Agent tools array
3. Ensure tool name is kebab-case and unique

```typescript
// Check tool registration
@Tool({ name: 'github-analyzer' }) // Must match exactly
async analyzeGitHub() {}

// Check agent configuration
@Agent({ tools: ['github-analyzer'] }) // Must match @Tool name
```

**Error: "Duplicate Tool Name: [tool-name]"**

**Cause**: Multiple tools registered with the same name

**Solution**:

1. Search codebase for all @Tool decorators with the same name
2. Rename duplicate tools to be unique and descriptive
3. Update @Agent tools arrays to use new unique names

```typescript
// ❌ BAD: Duplicate tool names
// File: calculator.tools.ts
@Tool({ name: 'calculate' })
async add() {}

// File: advanced-calculator.tools.ts
@Tool({ name: 'calculate' }) // Duplicate!
async scientificCalculate() {}

// ✅ GOOD: Unique tool names
// File: calculator.tools.ts
@Tool({ name: 'basic-calculator' })
async add() {}

// File: advanced-calculator.tools.ts
@Tool({ name: 'scientific-calculator' })
async scientificCalculate() {}
```

---

### 3. Workflow Engine Core

#### MetadataProcessorService

**Purpose**: Processes decorator metadata and builds LangGraph graphs

**Registration**: Auto-registered by `WorkflowEngineModule.forRoot()`

**Usage**:

```typescript
@Injectable()
export class CustomWorkflowService {
  constructor(private metadata: MetadataProcessorService) {}

  async processWorkflow(workflowClass: Type<any>) {
    const metadata = this.metadata.extractWorkflowMetadata(workflowClass);
    const graph = this.metadata.buildGraphFromMetadata(metadata);
    return graph;
  }
}
```

---

#### WorkflowExecutionService

**Purpose**: Executes workflows with streaming, checkpointing, and error handling

**Registration**: Auto-registered by `WorkflowEngineModule.forRoot()`

**Usage**:

```typescript
@Injectable()
export class WorkflowOrchestrator {
  constructor(private execution: WorkflowExecutionService) {}

  async runWorkflow(workflowClass: Type<any>, input: WorkflowState) {
    const result = await this.execution.execute(workflowClass, {
      input,
      streaming: true,
      checkpoint: true,
      threadId: 'user-session-123',
    });
    return result;
  }
}
```

---

## Decorator Pattern Validation

### Pattern Enforcement Rules

The workflow-engine enforces **mutually exclusive decorator patterns** to prevent mixing incompatible workflow styles:

1. **Task-Based Pattern** (`@Entrypoint` + `@Task`)

   - ❌ Cannot use `@Node` or `@Edge`
   - ✅ Linear execution, sequential tasks
   - ✅ Declared via `WorkflowType.FUNCTIONAL_TASK` or `workflow.type: 'functional-task'`

2. **Node-Based Pattern** (`@Node` + `@Edge`)
   - ❌ Cannot use `@Entrypoint` or `@Task`
   - ✅ Graph-based, conditional routing, complex flows
   - ✅ Declared via `WorkflowType.FUNCTIONAL_NODE` or `workflow.type: 'functional-node'`

### Validation Implementation

**Location**: `libs/langgraph-modules/workflow-engine/src/lib/utils/functional/decorator-validator.ts`

**Validation Logic**:

```typescript
export function validateDecoratorPattern(
  target: any,
  requiredPattern: 'task-based' | 'node-based',
  decoratorName: string,
  workflowName: string
): void {
  const workflowMetadata = getWorkflowMetadata(target);
  const declaredType = workflowMetadata?.type;

  // Check for conflicting decorators
  const hasEntrypointOrTask =
    Reflect.getMetadata(WORKFLOW_ENTRYPOINT_KEY, target) ||
    Reflect.getMetadata(WORKFLOW_TASKS_KEY, target);
  const hasNodeOrEdge =
    Reflect.getMetadata(WORKFLOW_NODES_KEY, target) ||
    Reflect.getMetadata(WORKFLOW_EDGES_KEY, target);

  if (requiredPattern === 'node-based' && hasEntrypointOrTask) {
    throw new FunctionalWorkflowError(
      `Cannot use @${decoratorName} with @Entrypoint/@Task in ${workflowName}. Declare workflow type as 'functional-node'.`
    );
  }

  if (requiredPattern === 'task-based' && hasNodeOrEdge) {
    throw new FunctionalWorkflowError(
      `Cannot use @${decoratorName} with @Node/@Edge in ${workflowName}. Declare workflow type as 'functional-task'.`
    );
  }
}
```

**Enforcement Points**:

- `@Entrypoint` decorator validates no `@Node`/`@Edge` present
- `@Task` decorator validates no `@Node`/`@Edge` present
- `@Node` decorator validates no `@Entrypoint`/`@Task` present
- `@Edge` decorator validates no `@Entrypoint`/`@Task` present

**Error Messages**:

```
❌ FunctionalWorkflowError: Cannot use @Node with @Entrypoint/@Task in CustomerSupportWorkflow.
   Workflows must use EITHER @Entrypoint + @Task (task-based, linear)
   OR @Node + @Edge (node-based, graph).
   Declare workflow type as 'functional-node' if using @Node/@Edge.
```

---

## State Management

### Standard Pattern: AgentStateAnnotation + Metadata

All agents use the default `AgentStateAnnotation` with metadata nesting for custom state fields.

**AgentStateAnnotation Fields** (provided by @hive-academy/langgraph-core):

- `messages: BaseMessage[]` - LangGraph message history (concatenates)
- `metadata: Record<string, unknown>` - **Extensible custom state** (shallow merge)
- `next: string | undefined` - Multi-agent routing target
- `current: string | undefined` - Current agent identifier
- `scratchpad: string` - Collaboration notes (append)
- `task: string | undefined` - Task description
- `threadId: string | undefined` - Memory context
- `userId: string | undefined` - User identifier

### How to Add Custom State

**Step 1: Define Metadata Interface**

Create a metadata interface in `apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts`:

```typescript
export interface MyAgentMetadata extends WorkflowAgentMetadata {
  /**
   * User's research query
   */
  query: string;

  /**
   * Search results from web research
   */
  searchResults?: any[];

  /**
   * Generated report draft
   */
  reportDraft?: string;

  /**
   * User approval status
   */
  userApproval?: 'pending' | 'approved' | 'rejected';
}
```

**Step 2: Use TypedAgentState in Methods**

```typescript
import {
  TypedAgentState,
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-workflow-engine';
import type { MyAgentMetadata } from './shared/metadata.types';

@Agent({
  description: 'My workflow agent',
  workflow: {
    type: 'functional-task',
    // NO channels field - always uses default AgentStateAnnotation
  },
})
@Injectable()
export class MyAgent {
  @Entrypoint()
  async startTask(
    context: TaskExecutionContext<TypedAgentState<MyAgentMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<MyAgentMetadata>>> {
    const state = context.state;

    // ✅ Access custom state via state.metadata
    this.logger.log(`Processing query: ${state.metadata.query}`);

    // ✅ Return partial state update
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          searchResults: fetchedResults,
          reportDraft: generatedDraft,
        },
      },
    };
  }

  @Task({ dependsOn: ['startTask'] })
  async processResults(
    context: TaskExecutionContext<TypedAgentState<MyAgentMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<MyAgentMetadata>>> {
    const state = context.state;

    // ✅ Access results from previous task
    const results = state.metadata.searchResults;

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          userApproval: 'pending',
        },
      },
    };
  }
}
```

**Step 3: Initialize State When Executing**

```typescript
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class MyService {
  constructor(private readonly execution: WorkflowExecutionService) {}

  async runWorkflow(userId: string, query: string) {
    const initialState: TypedAgentState<MyAgentMetadata> = {
      messages: [],
      metadata: {
        userId,
        query,
        userApproval: 'pending',
        // Initialize other metadata fields as needed
      },
    };

    const result = await this.execution.execute(MyAgent, initialState, {
      threadId: `workflow-${Date.now()}`,
    });

    return result;
  }
}
```

### Why This Pattern?

✅ **Consistency**: All agents use the same pattern
✅ **Type Safety**: Compile-time type checking via metadata interfaces
✅ **Compatible**: Works seamlessly with multi-agent supervisor workflows
✅ **Extensible**: Add custom fields via metadata interfaces
✅ **No Schema Mismatches**: State access pattern matches StateGraph schema

### ❌ What NOT to Do

**Don't specify custom `channels` in workflow config:**

```typescript
❌ @Agent({
     workflow: {
       channels: CustomStateAnnotation, // REMOVED - causes schema mismatches
     },
   })
```

**Don't access state at root level:**

```typescript
❌ const value = state.customField; // Wrong - field doesn't exist at root
✅ const value = state.metadata.customField; // Correct - access via metadata
```

**Don't create root-level state fields:**

```typescript
❌ const StateAnnotation = Annotation.Root({
     customField: Annotation<string>(), // Creates state.customField
   });

✅ interface MyMetadata {
     customField: string; // Creates state.metadata.customField
   }
```

### Reference Documentation

- **AgentStateAnnotation**: `libs/langgraph-modules/core/src/lib/annotations/agent-state.annotation.ts`
- **TypedAgentState**: `libs/langgraph-modules/core/src/lib/types/agent.types.ts`
- **Metadata Examples**: `apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts`
- **Architectural Decision**: `LANGGRAPH_CHANNELS_DECISION.md`

---

## Configuration System

### Configuration Hierarchy (Priority Order)

1. **User-Provided Options** (highest priority)

   - Explicit decorator options (`@FunctionalWorkflow({ streaming: false })`)
   - Explicit `WorkflowEngineModule.forRoot()` options

2. **Module-Level Defaults**

   - Configured via `WorkflowEngineModule.forRoot(options)`
   - Applied to all workflows unless overridden

3. **Decorator-Level Defaults** (lowest priority)
   - Hardcoded sensible defaults in decorator implementations
   - `streaming: true`, `cache: true`, `confidenceThreshold: 0.7`, etc.

### Configuration Accessors

**Functional API Config**:

```typescript
import { getFunctionalApiConfigWithDefaults } from '@hive-academy/langgraph-workflow-engine';

const config = getFunctionalApiConfigWithDefaults();
// Returns: { enableStreaming, enableCheckpointing, defaultTimeout, defaultRetryCount }
```

**Multi-Agent Config**:

```typescript
import { getMultiAgentConfigWithDefaults } from '@hive-academy/langgraph-workflow-engine';

const config = getMultiAgentConfigWithDefaults();
// Returns: { streaming, checkpointing, llm, defaultTopology }
```

**Workflow Engine Config**:

```typescript
import { getWorkflowEngineConfigWithDefaults } from '@hive-academy/langgraph-workflow-engine';

const config = getWorkflowEngineConfigWithDefaults();
// Returns: { compilation, execution, debugging }
```

---

## Real-World Example: Personal Brand Strategist Agent

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/personal-brand-strategist/personal-brand-strategist.agent.ts`

```typescript
import { Edge, Node, Agent, LlmProviderService } from '@hive-academy/langgraph-workflow-engine';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import { Injectable } from '@nestjs/common';

/**
 * Unified @Agent decorator with workflow configuration
 * - Smart defaults: id, name auto-derived from class name
 * - Auto-detection: type = 'workflow-agent' (detected from class hierarchy)
 * - Workflow config: Eliminates separate @Workflow decorator
 */
@Agent({
  id: 'personal-brand-strategist',
  name: 'Personal Brand Strategist',
  description: 'Enhanced Personal Brand Strategist with internal multi-step workflow',
  type: 'workflow-agent',
  capabilities: ['brand-analysis', 'strategic-positioning', 'career-guidance'],
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  priority: 'high',
  executionTime: 'medium',
  workflow: {
    name: 'brand-strategist-workflow',
    type: 'functional-node', // 🔑 Explicit node-based workflow type
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateFinalStrategy'], // HITL after strategy generation
    },
  },
})
@Injectable()
export class PersonalBrandStrategistAgent {
  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService
  ) {}

  /**
   * Nodes: Workflow steps
   */
  @Node({ type: 'standard' })
  async initializeBrandAnalysis(state: TypedAgentState) {
    return { metadata: { currentStep: 'initialization' } };
  }

  @Node({ type: 'standard' })
  async gatherBrandData(state: TypedAgentState) {
    const [devContext, brandEvolution] = await Promise.all([
      this.memory.getDevContext(state.metadata.githubUsername),
      this.memory.getBrandEvolution(state.metadata.githubUsername),
    ]);
    return { metadata: { brandData: { devContext, brandEvolution } } };
  }

  @Node({ type: 'standard' })
  async analyzeBrandPositioning(state: TypedAgentState) {
    const model = await this.llm.getLLM({ temperature: 0.3 });
    const response = await model.invoke([{ role: 'user', content: analysisPrompt }]);
    const analysis = JSON.parse(response.content.toString());
    return { metadata: { brandAnalysis: analysis, brandScore: analysis.score } };
  }

  @Node({ type: 'condition' })
  async assessBrandStrength(state: TypedAgentState) {
    const route = state.metadata.brandScore > 0.7 ? 'optimize' : 'rebuild';
    return { route };
  }

  @Node({ type: 'standard' })
  async optimizeBrand(state: TypedAgentState) {
    // Optimization strategy for strong brands
    return { metadata: { strategyType: 'optimization', finalStrategy: strategy } };
  }

  @Node({ type: 'standard' })
  async rebuildStrategy(state: TypedAgentState) {
    // Rebuild strategy for weak brands
    return { metadata: { strategyType: 'rebuild', finalStrategy: strategy } };
  }

  /**
   * Final node with HITL approval requirement
   * - @RequiresApproval triggers human-in-the-loop flow
   * - Configured via workflow.multiAgentInterruption.interruptAfter
   */
  @Node({ type: 'standard' })
  @RequiresApproval({
    confidenceThreshold: 0.7,
    timeoutMs: 180000,
    message: (state) => `Brand strategy complete. Please review and approve.`,
    onTimeout: 'escalate',
  })
  async generateFinalStrategy(state: TypedAgentState) {
    const consolidatedStrategy = {
      userId: state.metadata.githubUsername,
      strategyType: state.metadata.strategyType,
      brandScore: state.metadata.brandScore,
      strategy: state.metadata.finalStrategy,
    };
    return {
      messages: [new AIMessage(consolidatedStrategy.strategy)],
      metadata: { brandStrategyCompleted: true },
      next: 'content-creator', // Hand off to next agent
      task: 'Create content from brand strategy',
    };
  }

  /**
   * Edges: Workflow transitions
   * - Simple edges: Empty methods (always true)
   * - Functional edges: Method body evaluated as boolean
   */
  @Edge('initializeBrandAnalysis', 'gatherBrandData')
  initToGather() {
    return true;
  }

  @Edge('gatherBrandData', 'analyzeBrandPositioning')
  gatherToAnalyze() {
    return true;
  }

  @Edge('analyzeBrandPositioning', 'assessBrandStrength')
  analyzeToAssess() {
    return true;
  }

  /**
   * Conditional edges: Route based on state
   */
  @Edge('assessBrandStrength', 'optimizeBrand')
  shouldOptimizeBrand(state: TypedAgentState): boolean {
    return state.metadata.brandScore > 0.7;
  }

  @Edge('assessBrandStrength', 'rebuildStrategy')
  shouldRebuildBrand(state: TypedAgentState): boolean {
    return state.metadata.brandScore <= 0.7;
  }

  @Edge('optimizeBrand', 'generateFinalStrategy')
  optimizeToFinal() {
    return true;
  }

  @Edge('rebuildStrategy', 'generateFinalStrategy')
  rebuildToFinal() {
    return true;
  }
}
```

**How It Works**:

1. **Module Registration**: Agent class registered in NestJS module providers
2. **Decorator Metadata**: `@Agent` stores agent config, `@Node` stores nodes, `@Edge` stores edges
3. **Runtime Discovery**: `MetadataProcessorService` reads metadata from class
4. **Graph Building**: Nodes and edges converted to LangGraph graph structure
5. **Execution**: `WorkflowExecutionService` compiles and executes graph
6. **HITL Integration**: `@RequiresApproval` triggers interruption flow at `generateFinalStrategy`
7. **Multi-Agent Handoff**: `next: 'content-creator'` routes to next agent in supervisor workflow

---

## Best Practices

### ✅ DO

1. **Use Explicit Workflow Types**:

   ```typescript
   @FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_NODE })
   // OR
   @Agent({ workflow: { type: 'functional-node' } })
   ```

2. **Leverage Smart Defaults for Agents**:

   ```typescript
   @Agent({ description: 'Analyzes GitHub repos' }) // id, name, type auto-derived
   ```

3. **Use Functional Condition Edges**:

   ```typescript
   @Edge('analyze', 'approve')
   shouldApprove(state: WorkflowState): boolean {
     return state.confidence >= 0.9;
   }
   ```

4. **Configure Module Once, Apply Everywhere**:

   ```typescript
   WorkflowEngineModule.forRoot({
     execution: { streamingEnabled: true, defaultTimeout: 60000 },
   });
   ```

5. **Use Specialized Node Decorators**:

   ```typescript
   @LLMNode() async analyze() {}      // Instead of @Node({ type: 'llm' })
   @ApprovalNode() async approve() {} // Instead of @Node({ type: 'human', requiresApproval: true })
   ```

6. **Enable Time-Travel for Debugging**:

   ```typescript
   @FunctionalWorkflow({ timeTravel: true })
   ```

### ❌ DON'T

1. **Don't Mix Decorator Patterns**:

   ```typescript
   ❌ @Entrypoint() async start() {}
   ❌ @Node() async process() {}  // ERROR: Cannot mix task-based and node-based
   ```

2. **Don't Skip Workflow Type Declaration**:

   ```typescript
   ❌ @FunctionalWorkflow({ name: 'workflow' }) // Missing type!
   ✅ @FunctionalWorkflow({ name: 'workflow', type: WorkflowType.FUNCTIONAL_NODE })
   ```

3. **Don't Manually Register Workflows**:

   ```typescript
   ❌ MetadataProcessorService.register(MyWorkflow) // Not needed!
   ✅ Just use decorators - auto-registration handles it
   ```

4. **Don't Duplicate @Workflow for Agents**:

   ```typescript
   ❌ @Agent({ type: 'workflow-agent' })
   ❌ @Workflow({ name: 'my-workflow' }) // Redundant!
   ✅ @Agent({ type: 'workflow-agent', workflow: { name: 'my-workflow' } })
   ```

5. **Don't Hardcode Defaults in Every Decorator**:

   ```typescript
   ❌ @Node({ maxRetries: 3, timeout: 30000 }) // Everywhere!
   ✅ WorkflowEngineModule.forRoot({ execution: { defaultTimeout: 30000 } })
   ```

---

## Troubleshooting

### "Cannot use @Node with @Entrypoint/@Task"

**Cause**: Mixing task-based and node-based decorators

**Solution**: Declare explicit workflow type:

```typescript
@FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_NODE })
// OR
@Agent({ workflow: { type: 'functional-node' } })
```

### "Workflow metadata not found"

**Cause**: Missing `@FunctionalWorkflow` or `@Agent` decorator

**Solution**: Add decorator to class:

```typescript
@FunctionalWorkflow({ name: 'my-workflow', type: WorkflowType.FUNCTIONAL_NODE })
@Injectable()
export class MyWorkflow {}
```

### "NestJS cannot resolve dependencies"

**Cause**: Decorator wrapper broke DI metadata

**Solution**: Ensure decorators preserve `design:paramtypes`:

- This is handled automatically by decorators
- Check `@Injectable()` is applied AFTER `@Agent` or `@FunctionalWorkflow`

### "Time-Travel auto-registration not working"

**Cause**: EventEmitter2 not available or Time-Travel module not imported

**Solution**: Import Time-Travel module:

```typescript
@Module({
  imports: [
    WorkflowEngineModule.forRoot(),
    TimeTravelModule.forRoot() // Required for auto-registration
  ]
})
```

---

## API Reference

### Exports

```typescript
// Module
export { WorkflowEngineModule } from './lib/workflow-engine.module';

// Functional API Decorators
export { FunctionalWorkflow, WorkflowType } from './lib/decorators/functional/workflow.decorator';
export {
  Node,
  StartNode,
  EndNode,
  ApprovalNode,
  StreamNode,
  ConditionNode,
  ToolNode,
  LLMNode,
  AggregatorNode,
  SubgraphNode,
} from './lib/decorators/functional/node.decorator';
export {
  Edge,
  ConditionalEdge,
  ConfidenceRoute,
  FallbackEdge,
  ErrorEdge,
} from './lib/decorators/functional/edge.decorator';
export { Entrypoint } from './lib/decorators/functional/entrypoint.decorator';
export { Task } from './lib/decorators/functional/task.decorator';

// Multi-Agent Decorators
export { Agent } from './lib/decorators/multi-agent/agent.decorator';
export { MultiAgent } from './lib/decorators/multi-agent/multi-agent.decorator';
export { Tool } from './lib/decorators/multi-agent/tool.decorator';

// Services
export { MetadataProcessorService } from './lib/core/metadata-processor.service';
export { WorkflowExecutionService } from './lib/execution/workflow-execution.service';
export { LlmProviderService } from './lib/services/llm/llm-provider.service';

// Utilities
export { validateDecoratorPattern } from './lib/utils/functional/decorator-validator';
export { getFunctionalApiConfigWithDefaults } from './lib/utils/functional/functional-api-config.accessor';
export { getMultiAgentConfigWithDefaults } from './lib/utils/multi-agent/multi-agent-config.accessor';
export { getWorkflowEngineConfigWithDefaults } from './lib/utils/workflow-engine-config.accessor';

// Interfaces
export type {
  WorkflowOptions,
  AgentConfig,
  NodeOptions,
  EdgeOptions,
  WorkflowState,
  WorkflowDefinition,
} from './lib/interfaces';
```

---

## Migration Guide

### From Standalone Packages

**Before** (separate packages):

```typescript
import { FunctionalWorkflow } from '@hive-academy/langgraph-functional-api';
import { Agent } from '@hive-academy/langgraph-multi-agent';
```

**After** (unified package):

```typescript
import { FunctionalWorkflow, Agent } from '@hive-academy/langgraph-workflow-engine';
```

### From Base Classes to Decorators

**Before** (inheritance-driven):

```typescript
export class MyWorkflow extends DeclarativeWorkflowBase {
  constructor(llm, memory, metadata, emitter, graphBuilder, subgraph, stream) {
    super(llm, memory, metadata, emitter, graphBuilder, subgraph, stream);
  }
}
```

**After** (decorator-driven):

```typescript
@FunctionalWorkflow({ type: WorkflowType.FUNCTIONAL_NODE })
@Injectable()
export class MyWorkflow {
  constructor(private llm: LlmProviderService, private memory: MemoryService) {}
}
```

---

## Related Documentation

- **Core Package**: `libs/langgraph-modules/core/CLAUDE.md` - Shared interfaces and types
- **HITL Module**: `libs/langgraph-modules/hitl/CLAUDE.md` - Human-in-the-loop integration

- **Memory Module**: `libs/langgraph-modules/memory/CLAUDE.md` - Contextual memory

---

## Summary

The **Workflow Engine** provides a **decorator-first**, **zero-config** approach to building LangGraph workflows:

✅ **Unified Package** - Functional API + Multi-Agent + Core Engine consolidated
✅ **Smart Defaults** - Auto-detection, auto-registration, convention-based configuration
✅ **Pattern Validation** - Enforces task-based vs node-based patterns at decoration time
✅ **NestJS Integration** - Seamless DI, global module, metadata-driven discovery
✅ **Type-Safe** - Full TypeScript support with type inference
✅ **Production-Ready** - Streaming, checkpointing, HITL, error handling, debugging

**Start building workflows with decorators - no base classes, no boilerplate, just clean, declarative code.**
