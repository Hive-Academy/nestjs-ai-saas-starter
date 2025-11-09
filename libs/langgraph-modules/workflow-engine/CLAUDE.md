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
- **Streaming Module**: `libs/langgraph-modules/streaming/CLAUDE.md` - Real-time streaming
- **Checkpoint Module**: `libs/langgraph-modules/checkpoint/CLAUDE.md` - State persistence
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
