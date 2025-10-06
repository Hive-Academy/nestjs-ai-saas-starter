# 🏗️ Multi-Agent Decorator Architecture Design

## Executive Summary

**Problem**: Current multi-agent supervisor implementation violates the decorator pattern by requiring manual imperative setup in `onModuleInit()`, breaking architectural consistency with our declarative decorator system.

**Solution**: Introduce `@MultiAgent` class decorator that transforms a workflow into a LangGraph-compliant supervisor pattern with automatic network setup, agent registration, and routing.

**Status**: Design proposal based on:

- LangGraph official supervisor pattern (2025)
- Existing decorator architecture analysis
- Real-world production requirements

---

## 📚 Background: LangGraph Supervisor Pattern

### Official LangGraph Implementation

Based on [LangGraph Multi-Agent Supervisor Tutorial](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/):

**Key Architecture Principles:**

1. **Supervisor IS a StateGraph Node**
   - The supervisor is implemented as a node within a StateGraph
   - Uses an LLM to make routing decisions
   - Supervisor's "tools" are the worker agents

2. **Worker Agents ARE Graph Nodes**
   - Each worker agent is added as a node to the supervisor's StateGraph
   - Workers have explicit edges back to the supervisor
   - Workers guarantee to return control to supervisor

3. **Routing Mechanism**
   - Supervisor uses handoff tools to route to workers
   - LLM decides which worker to invoke based on task context
   - Uses `Command` to route execution to appropriate agent node

4. **State Management**
   - Shared state (typically `MessagesState`) passed between all agents
   - Supervisor maintains message history and context
   - Workers add their results to shared state

### LangGraph Supervisor Structure

```python
# LangGraph official pattern (Python)
from langgraph.graph import StateGraph, MessagesState
from langgraph_supervisor import create_supervisor

# 1. Create worker agents (as nodes)
research_agent = create_react_agent(
    model="gpt-4",
    tools=[web_search],
    name="research_agent"
)

math_agent = create_react_agent(
    model="gpt-4",
    tools=[add, multiply, divide],
    name="math_agent"
)

# 2. Create supervisor (combines everything into StateGraph)
supervisor = create_supervisor(
    model="gpt-4",
    agents=[research_agent, math_agent],  # Worker agents
    prompt="You are a supervisor managing two agents..."
).compile()

# Result: StateGraph with structure:
# - supervisor_node (LLM router)
# - research_agent_node (worker)
# - math_agent_node (worker)
# - Edges: supervisor → workers → supervisor
```

**Graph Structure:**

```
┌─────────────────────────────────────────────────────────┐
│                    StateGraph                           │
│                                                          │
│  ┌────────────────────┐                                 │
│  │  Supervisor Node   │                                 │
│  │  (LLM Router)      │                                 │
│  └────────┬───────────┘                                 │
│           │                                              │
│           ├──────────┬──────────────┬─────────────┐     │
│           ▼          ▼              ▼             ▼     │
│     ┌─────────┐ ┌─────────┐  ┌─────────┐   ┌────────┐ │
│     │Research │ │  Math   │  │ Writer  │   │ END    │ │
│     │ Agent   │ │ Agent   │  │ Agent   │   │        │ │
│     └────┬────┘ └────┬────┘  └────┬────┘   └────────┘ │
│          │           │            │                     │
│          └───────────┴────────────┘                     │
│                      │                                  │
│          ┌───────────▼──────────┐                      │
│          │  Back to Supervisor  │                      │
│          └──────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Current Architecture Analysis

### ❌ Current Implementation (Imperative)

**File**: `devbrand-supervisor.workflow.ts`

```typescript
@Workflow({
  name: 'devbrand-supervisor-workflow-transformed',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
})
@Injectable()
export class DevBrandSupervisorWorkflowTransformed implements OnModuleInit {
  private networkId: string | null = null;

  constructor(
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly llmProvider: LlmProviderService,
    private readonly githubAnalyzer: GitHubCodeAnalyzerAgent,
    private readonly contentCreator: ContentCreatorAgent,
    private readonly brandStrategist: PersonalBrandStrategistAgent,
    private readonly brandMemory: PersonalBrandMemoryService
  ) {}

  // ❌ PROBLEM: Manual imperative setup
  async onModuleInit(): Promise<void> {
    const agents: AgentDefinition[] = [
      this.createAgentDefinition(
        this.githubAnalyzer,
        'github-code-analyzer',
        'GitHub Code Analyzer',
        'Analyzes GitHub repositories...'
      ),
      this.createAgentDefinition(
        this.brandStrategist,
        'personal-brand-strategist',
        'Personal Brand Strategist',
        'Develops personal brand strategy...'
      ),
      this.createAgentDefinition(
        this.contentCreator,
        'content-creator',
        'Content Creator',
        'Creates platform-specific content...'
      ),
    ];

    this.networkId = await this.coordinator.setupNetwork(
      'devbrand-supervisor-network',
      agents,
      'supervisor',
      {
        systemPrompt: `You are the supervisor coordinator...`,
        workers: ['github-code-analyzer', 'personal-brand-strategist', 'content-creator'],
        enableForwardMessage: true,
        removeHandoffMessages: true,
      }
    );
  }

  // ❌ PROBLEM: Boilerplate agent definition conversion
  private createAgentDefinition(
    agentInstance: any,
    id: string,
    name: string,
    description: string
  ): AgentDefinition {
    return {
      id,
      name,
      description,
      nodeFunction: async (state: AgentState) => {
        const result = await agentInstance.execute(state);
        return {
          messages: result.messages || state.messages,
          metadata: {
            ...state.metadata,
            ...result.metadata,
            lastAgent: id,
            lastAgentResult: result,
          },
        };
      },
      metadata: {
        type: 'workflow-agent',
        capabilities: this.getAgentCapabilities(id),
        priority: 'high',
      },
    };
  }

  @Entrypoint({ timeout: 15000 })
  async initializeWorkflow(context: TaskExecutionContext) { ... }

  // ❌ PROBLEM: Manual coordination call
  @Task({ dependsOn: ['initializeWorkflow'] })
  async executeMultiAgentCoordination(context: TaskExecutionContext) {
    const result = await this.coordinator.executeSimpleWorkflow(
      this.networkId,
      supervisorMessage,
      { streamMode: 'values', config: { metadata: { ... } } }
    );
    // Extract results manually
    const agentResults = {
      githubAnalysis: result.finalState.metadata?.githubData || {},
      brandStrategy: result.finalState.metadata?.brandStrategy || {},
      contentCreation: result.finalState.metadata?.generatedContent || {},
    };
    return { state: { agentResults } };
  }
}
```

### Issues with Current Approach

1. ❌ **Breaks Decorator Pattern**: Manual `onModuleInit()` setup is imperative, not declarative
2. ❌ **Inconsistent with Ecosystem**: We have `@Workflow`, `@Agent`, `@Node`, `@Tool` but NO `@MultiAgent`
3. ❌ **Boilerplate Code**: `createAgentDefinition()` repeated for every supervisor workflow
4. ❌ **Manual Lifecycle Management**: Developer responsible for network setup/teardown
5. ❌ **Unclear Separation of Concerns**: Workflow shouldn't know about low-level agent coordination
6. ❌ **Not LangGraph-Compliant**: Doesn't match official supervisor pattern structure
7. ❌ **Manual Dependency Injection**: Must inject all agents into constructor

---

## ✅ Proposed Solution: `@MultiAgent` Decorator

### Architecture Vision

The `@MultiAgent` decorator transforms a workflow class into a LangGraph-compliant supervisor pattern by:

1. **Creating a StateGraph** with supervisor + worker nodes
2. **Automatically registering agents** from decorator metadata
3. **Setting up routing logic** based on supervisor configuration
4. **Managing lifecycle** (setup, execution, teardown) automatically
5. **Providing clean API** for accessing coordination results

### Design Principles

1. **Fully Declarative** - No imperative setup code
2. **LangGraph-Compliant** - Matches official supervisor pattern
3. **Zero Boilerplate** - Automatic agent registration and network setup
4. **Type-Safe** - Full TypeScript type safety with enhanced context
5. **Consistent Pattern** - Matches existing `@Workflow`, `@Agent`, `@Node` decorators
6. **Separation of Concerns** - Workflow focuses on business logic, decorator handles coordination

---

## 📐 Proposed API Design

### Option 1: Class-Level `@MultiAgent` (Recommended)

```typescript
@Workflow({
  name: 'devbrand-supervisor',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
})
@MultiAgent({
  networkId: 'devbrand-supervisor-network',
  type: 'supervisor',
  agents: [
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent,
    ContentCreatorAgent
  ],
  config: {
    systemPrompt: `You are the supervisor coordinator for a personal branding workflow.

Your role is to orchestrate three specialized agents:
1. github-code-analyzer: Analyzes GitHub activity to extract achievements
2. personal-brand-strategist: Develops brand strategy and positioning
3. content-creator: Creates optimized content for multiple platforms

WORKFLOW SEQUENCE (always follow this order):
Step 1: First, call github-code-analyzer to analyze the developer's GitHub profile
Step 2: Then, call personal-brand-strategist to develop brand strategy based on achievements
Step 3: Finally, call content-creator to generate platform-specific content

ROUTING RULES:
- If user provides GitHub username → Start with github-code-analyzer
- If analysis is complete → Route to personal-brand-strategist
- If strategy is complete → Route to content-creator
- If all steps done → Return control to workflow`,
    workers: ['github-code-analyzer', 'personal-brand-strategist', 'content-creator'],
    enableForwardMessage: true,
    removeHandoffMessages: true,
  }
})
@Injectable()
export class DevBrandSupervisorWorkflow {
  // ✅ Clean! No manual setup, no onModuleInit, no boilerplate

  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    return {
      state: {
        executionId: `devbrand-${Date.now()}`,
        currentStep: 1,
        currentTask: 'initialization',
        confidence: 1.0,
      },
    };
  }

  @Task({ dependsOn: ['initializeWorkflow'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async executeMultiAgentCoordination(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    // ✅ Coordination happens automatically via @MultiAgent decorator
    // ✅ Results available via enhanced context
    const { multiAgent } = context;

    const agentResults = {
      githubAnalysis: multiAgent.results.githubData || {},
      brandStrategy: multiAgent.results.brandStrategy || {},
      contentCreation: multiAgent.results.generatedContent || {},
    };

    return {
      state: {
        currentStep: 2,
        currentTask: 'multi-agent-coordination-complete',
        agentResults,
        confidence: multiAgent.results.confidence || 0.8,
      },
    };
  }

  @Task({ dependsOn: ['executeMultiAgentCoordination'] })
  async finalizeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    // Final step: Store results in memory
    return {
      state: {
        currentStep: 3,
        currentTask: 'completed',
        confidence: 1.0,
      },
    };
  }
}
```

### Option 2: Method-Level `@CoordinateAgents` (Alternative)

```typescript
@Workflow({ name: 'devbrand-supervisor', type: WorkflowType.FUNCTIONAL_TASK })
@Injectable()
export class DevBrandSupervisorWorkflow {
  @Entrypoint()
  async initializeWorkflow(context: TaskExecutionContext) { ... }

  // ✅ Method-level decorator for specific coordination tasks
  @Task({ dependsOn: ['initializeWorkflow'] })
  @CoordinateAgents({
    type: 'supervisor',
    agents: [GitHubCodeAnalyzerAgent, PersonalBrandStrategistAgent, ContentCreatorAgent],
    config: { systemPrompt: '...', workers: [...] }
  })
  async coordinateTeam(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    // Coordination happens automatically
    // Results injected into context
    const { agentResults } = context.multiAgent;
    return { state: { agentResults } };
  }

  @Task({ dependsOn: ['coordinateTeam'] })
  async finalizeWorkflow(context: TaskExecutionContext) { ... }
}
```

**Comparison:**

| Aspect | Class-Level `@MultiAgent` | Method-Level `@CoordinateAgents` |
|--------|---------------------------|-----------------------------------|
| **Scope** | Workflow-wide coordination | Task-specific coordination |
| **Use Case** | Entire workflow IS a supervisor | Workflow contains coordination step |
| **Flexibility** | Single network per workflow | Multiple networks per workflow |
| **Complexity** | Simpler (one network) | More complex (multiple networks) |
| **LangGraph Match** | Closer to official pattern | Custom extension |

**Recommendation**: **Class-Level `@MultiAgent`** because:

- ✅ Matches LangGraph supervisor pattern (supervisor IS the workflow)
- ✅ Simpler API with less complexity
- ✅ Single network lifecycle management
- ✅ Consistent with `@Workflow` class-level pattern

---

## 🔧 Implementation Architecture

### 1. `@MultiAgent` Decorator Implementation

**Location**: `libs/langgraph-modules/multi-agent/src/lib/decorators/multi-agent.decorator.ts`

```typescript
import { SetMetadata, Type } from '@nestjs/common';
import 'reflect-metadata';

/**
 * Multi-agent network configuration
 */
export interface MultiAgentConfig {
  /**
   * Unique network identifier
   */
  networkId: string;

  /**
   * Network coordination pattern
   */
  type: 'supervisor' | 'swarm' | 'hierarchical';

  /**
   * Worker agent classes to coordinate
   * These will be automatically registered and converted to nodes
   */
  agents: Type<any>[];

  /**
   * Pattern-specific configuration
   */
  config?: SupervisorConfig | SwarmConfig | HierarchicalConfig;

  /**
   * Enable automatic streaming for coordination
   */
  streaming?: boolean;

  /**
   * Enable automatic checkpointing
   */
  checkpointing?: boolean;
}

/**
 * Supervisor-specific configuration
 */
export interface SupervisorConfig {
  /**
   * System prompt for the supervisor LLM
   * Defines routing logic and coordination rules
   */
  systemPrompt: string;

  /**
   * Worker agent IDs (derived from agent classes)
   */
  workers: string[];

  /**
   * Forward messages between agents
   */
  enableForwardMessage?: boolean;

  /**
   * Remove handoff messages from history
   */
  removeHandoffMessages?: boolean;

  /**
   * LLM configuration for supervisor
   */
  llm?: {
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    temperature?: number;
  };
}

/**
 * Metadata key for multi-agent configuration
 */
export const MULTI_AGENT_METADATA_KEY = 'multi-agent:config';

/**
 * @MultiAgent Decorator
 *
 * Transforms a workflow into a LangGraph-compliant multi-agent supervisor pattern.
 *
 * This decorator:
 * 1. Automatically registers worker agents from the agents array
 * 2. Creates a StateGraph with supervisor + worker nodes
 * 3. Sets up routing logic based on configuration
 * 4. Manages network lifecycle (setup, execution, teardown)
 * 5. Enhances TaskExecutionContext with coordination results
 *
 * @example
 * ```typescript
 * @Workflow({ name: 'my-supervisor', type: WorkflowType.FUNCTIONAL_TASK })
 * @MultiAgent({
 *   networkId: 'my-network',
 *   type: 'supervisor',
 *   agents: [Agent1, Agent2, Agent3],
 *   config: {
 *     systemPrompt: 'You are a supervisor managing three agents...',
 *     workers: ['agent1', 'agent2', 'agent3']
 *   }
 * })
 * export class MySupervisorWorkflow {
 *   @Entrypoint()
 *   async start(context: TaskExecutionContext) {
 *     // Coordination results available via context.multiAgent
 *     return { state: { initialized: true } };
 *   }
 * }
 * ```
 */
export function MultiAgent(config: MultiAgentConfig): ClassDecorator {
  return (target: any) => {
    // Validate configuration
    if (!config.networkId) {
      throw new Error(`@MultiAgent requires a networkId. Class: ${target.name}`);
    }

    if (!config.agents || config.agents.length === 0) {
      throw new Error(`@MultiAgent requires at least one agent. Class: ${target.name}`);
    }

    if (!config.type) {
      throw new Error(`@MultiAgent requires a type (supervisor|swarm|hierarchical). Class: ${target.name}`);
    }

    // Store multi-agent metadata for workflow-engine to process
    Reflect.defineMetadata(MULTI_AGENT_METADATA_KEY, config, target);
    SetMetadata(MULTI_AGENT_METADATA_KEY, config)(target);

    // Mark class as multi-agent workflow
    SetMetadata('multi-agent:marker', true)(target);

    return target;
  };
}

/**
 * Get multi-agent configuration from a class
 */
export function getMultiAgentMetadata(target: any): MultiAgentConfig | undefined {
  return Reflect.getMetadata(MULTI_AGENT_METADATA_KEY, target);
}

/**
 * Check if a class is decorated with @MultiAgent
 */
export function isMultiAgentWorkflow(target: any): boolean {
  return Reflect.getMetadata('multi-agent:marker', target) === true;
}
```

### 2. Workflow-Engine Integration

**Update**: `MetadataProcessorService` to extract and process `@MultiAgent` metadata

**Location**: `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`

```typescript
import { getMultiAgentMetadata, isMultiAgentWorkflow, MultiAgentConfig } from '@hive-academy/langgraph-multi-agent';
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class MetadataProcessorService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly multiAgentTranslation: MultiAgentTranslationService
  ) {}

  /**
   * Extract WorkflowDefinition from decorator metadata
   * Now includes @MultiAgent processing
   */
  extractWorkflowDefinition<TState extends WorkflowState>(
    workflowClass: any
  ): WorkflowDefinition<TState> {
    // 1. Extract @Workflow metadata
    const workflowOptions = getWorkflowMetadata(workflowClass);
    if (!workflowOptions) {
      throw new Error(`No @Workflow decorator found on ${workflowClass.name}`);
    }

    // 2. Extract @Node/@Edge metadata
    const nodeMetadata = getWorkflowNodes(workflowClass);
    const edgeMetadata = getWorkflowEdges(workflowClass);

    // 3. 🆕 NEW: Extract @MultiAgent metadata
    const multiAgentConfig = getMultiAgentMetadata(workflowClass);

    // 4. 🆕 NEW: If @MultiAgent present, setup network automatically
    if (multiAgentConfig) {
      this.logger.log(
        `@MultiAgent detected on ${workflowClass.name}, setting up network: ${multiAgentConfig.networkId}`
      );

      // Setup network during workflow compilation
      this.setupMultiAgentNetwork(workflowClass, multiAgentConfig);
    }

    // 5. Convert to WorkflowDefinition
    const definition: WorkflowDefinition<TState> = {
      name: workflowOptions.name || workflowClass.name,
      description: workflowOptions.description,
      channels: workflowOptions.channels,
      nodes: this.convertNodesToDefinition<TState>(nodeMetadata),
      edges: this.convertEdgesToDefinition<TState>(edgeMetadata, nodeMetadata),
      entryPoint: this.determineEntryPoint(nodeMetadata, edgeMetadata),
      config: {
        requiresApproval: workflowOptions.requiresHumanApproval,
        streaming: workflowOptions.streaming,
        metadata: {
          pattern: workflowOptions.pattern,
          tags: workflowOptions.tags,
          interruptNodes: workflowOptions.interruptNodes,
          // 🆕 Include multi-agent network info
          multiAgent: multiAgentConfig ? {
            networkId: multiAgentConfig.networkId,
            type: multiAgentConfig.type,
            agentCount: multiAgentConfig.agents.length,
          } : undefined,
        },
      },
    };

    return definition;
  }

  /**
   * Setup multi-agent network from @MultiAgent decorator
   */
  private async setupMultiAgentNetwork(
    workflowClass: any,
    config: MultiAgentConfig
  ): Promise<void> {
    try {
      // 1. Get agent instances from DI container
      const agentInstances = await Promise.all(
        config.agents.map(AgentClass => this.moduleRef.get(AgentClass, { strict: false }))
      );

      this.logger.debug(
        `Retrieved ${agentInstances.length} agent instances from DI container`
      );

      // 2. Convert workflow-agents to AgentDefinition objects
      const agentDefinitions = agentInstances.map((instance, index) => {
        const AgentClass = config.agents[index];
        return this.multiAgentTranslation.convertWorkflowAgentToDefinition(
          instance,
          AgentClass
        );
      });

      this.logger.debug(
        `Converted ${agentDefinitions.length} agents to AgentDefinition objects`
      );

      // 3. Setup network automatically via coordinator
      await this.coordinator.setupNetwork(
        config.networkId,
        agentDefinitions,
        config.type,
        config.config
      );

      this.logger.log(
        `✅ Multi-agent network setup complete: ${config.networkId} (${config.type})`
      );

      // 4. Store network ID for workflow execution
      Reflect.defineMetadata(
        'multi-agent:networkId',
        config.networkId,
        workflowClass
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to setup multi-agent network for ${workflowClass.name}: ${errorMessage}`
      );
      throw new Error(
        `@MultiAgent network setup failed for ${workflowClass.name}: ${errorMessage}`
      );
    }
  }
}
```

### 3. Enhanced TaskExecutionContext

**Update**: `TaskExecutionContext` to include multi-agent coordination results

**Location**: `libs/langgraph-modules/functional-api/src/lib/interfaces/task-execution.interface.ts`

```typescript
/**
 * Multi-agent coordination results
 */
export interface MultiAgentCoordinationResults {
  /**
   * Network ID that was executed
   */
  networkId: string;

  /**
   * Full coordination result from MultiAgentCoordinatorService
   */
  results: MultiAgentResult;

  /**
   * Agent-specific results (extracted from results.finalState.metadata)
   */
  agentResults: Record<string, any>;

  /**
   * Execution path (sequence of agents called)
   */
  executionPath: string[];

  /**
   * Overall coordination confidence
   */
  confidence: number;

  /**
   * Coordination execution time
   */
  executionTime: number;
}

/**
 * Enhanced TaskExecutionContext with multi-agent support
 */
export interface TaskExecutionContext<TState = FunctionalWorkflowState> {
  /**
   * Current workflow state
   */
  readonly state: TState;

  /**
   * Current task name
   */
  readonly taskName: string;

  /**
   * Workflow identifier
   */
  readonly workflowId: string;

  /**
   * Unique execution ID
   */
  readonly executionId: string;

  /**
   * Execution metadata
   */
  readonly metadata: Record<string, unknown>;

  /**
   * 🆕 NEW: Multi-agent coordination results
   * Only present if workflow is decorated with @MultiAgent
   */
  readonly multiAgent?: MultiAgentCoordinationResults;
}
```

### 4. Automatic Coordination Execution

**Update**: `FunctionalWorkflowService` to execute multi-agent coordination automatically

**Location**: `libs/langgraph-modules/functional-api/src/lib/services/functional-workflow.service.ts`

```typescript
@Injectable()
export class FunctionalWorkflowService {
  constructor(
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly metadataProcessor: MetadataProcessorService
  ) {}

  async executeWorkflow<TState = FunctionalWorkflowState>(
    workflowName: string,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowExecutionResult<TState>> {
    // 1. Get workflow class from registry
    const workflowClass = this.registry.getWorkflow(workflowName);

    // 2. Check if workflow has @MultiAgent decorator
    const multiAgentConfig = getMultiAgentMetadata(workflowClass);

    // 3. Execute workflow tasks
    let currentContext: TaskExecutionContext<TState> = {
      state: options?.initialState || {},
      taskName: '',
      workflowId: workflowName,
      executionId: generateId('exec'),
      metadata: {},
    };

    // 4. For each task in workflow
    for (const task of workflowTasks) {
      // 4a. Execute task
      const result = await this.executeTask(task, currentContext);

      // 4b. 🆕 NEW: If this is a multi-agent coordination task, execute coordination
      if (multiAgentConfig && this.isCoordinationTask(task)) {
        const coordinationResults = await this.executeMultiAgentCoordination(
          multiAgentConfig,
          currentContext
        );

        // Enhance context with coordination results
        currentContext = {
          ...currentContext,
          multiAgent: coordinationResults,
          state: {
            ...currentContext.state,
            ...result.state,
          },
        };
      } else {
        // Regular task execution
        currentContext = {
          ...currentContext,
          state: {
            ...currentContext.state,
            ...result.state,
          },
        };
      }
    }

    return {
      finalState: currentContext.state,
      executionPath: workflowTasks.map(t => t.name),
      success: true,
    };
  }

  /**
   * Execute multi-agent coordination
   */
  private async executeMultiAgentCoordination<TState>(
    config: MultiAgentConfig,
    context: TaskExecutionContext<TState>
  ): Promise<MultiAgentCoordinationResults> {
    const startTime = Date.now();

    // Prepare supervisor message from context
    const supervisorMessage = this.buildSupervisorMessage(context);

    // Execute coordination via coordinator
    const result = await this.coordinator.executeSimpleWorkflow(
      config.networkId,
      supervisorMessage,
      {
        streamMode: 'values',
        config: {
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId,
            taskName: context.taskName,
          },
        },
      }
    );

    // Extract agent results from final state
    const agentResults = this.extractAgentResults(result.finalState.metadata);

    return {
      networkId: config.networkId,
      results: result,
      agentResults,
      executionPath: result.executionPath || [],
      confidence: result.finalState.metadata?.confidence || 0.8,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Build supervisor message from context
   */
  private buildSupervisorMessage(context: TaskExecutionContext): string {
    // Extract relevant information from context state
    const { state, workflowId, executionId } = context;

    return `Workflow: ${workflowId}
Execution: ${executionId}
Task: ${context.taskName}

State: ${JSON.stringify(state, null, 2)}

Please coordinate the available agents to complete this task.`;
  }

  /**
   * Extract agent results from coordination metadata
   */
  private extractAgentResults(metadata: any): Record<string, any> {
    // Extract results based on common patterns
    return {
      githubAnalysis: metadata?.githubData || metadata?.analysisResult || {},
      brandStrategy: metadata?.brandStrategy || metadata?.strategyResult || {},
      contentCreation: metadata?.generatedContent || metadata?.contentResult || {},
      // Generic extraction
      ...metadata,
    };
  }

  /**
   * Check if a task should trigger multi-agent coordination
   */
  private isCoordinationTask(task: any): boolean {
    // Coordination happens when task depends on initialization
    // and is not the finalization step
    return (
      task.metadata?.triggersCoordination === true ||
      (task.dependsOn?.includes('initializeWorkflow') &&
       !task.name.includes('finalize'))
    );
  }
}
```

---

## 🎯 Complete Usage Example

### DevBrand Supervisor Workflow (Transformed)

```typescript
import { Injectable } from '@nestjs/common';
import {
  Workflow,
  Entrypoint,
  Task,
  WorkflowType,
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-functional-api';
import { MultiAgent } from '@hive-academy/langgraph-multi-agent';
import { StreamProgress, StreamToken } from '@hive-academy/langgraph-streaming';
import { GitHubCodeAnalyzerAgent } from '../agents/github-code-analyzer/github-code-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator/content-creator.agent';
import { PersonalBrandStrategistAgent } from '../agents/personal-brand-strategist/personal-brand-strategist.agent';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

/**
 * DevBrand Supervisor Workflow - Declarative Multi-Agent Coordination
 *
 * ✅ FULLY DECLARATIVE: Uses @MultiAgent decorator for automatic setup
 * ✅ ZERO BOILERPLATE: No onModuleInit, no createAgentDefinition
 * ✅ LANGGRAPH-COMPLIANT: Matches official supervisor pattern
 * ✅ TYPE-SAFE: Enhanced context with coordination results
 *
 * This workflow coordinates three specialized agents:
 * 1. GitHub Code Analyzer - Extracts developer achievements
 * 2. Personal Brand Strategist - Develops brand strategy
 * 3. Content Creator - Generates platform-specific content
 */
@Workflow({
  name: 'devbrand-supervisor-workflow',
  description: 'Multi-agent coordination for developer personal branding',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
  confidenceThreshold: 0.7,
})
@MultiAgent({
  networkId: 'devbrand-supervisor-network',
  type: 'supervisor',
  agents: [
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent,
    ContentCreatorAgent,
  ],
  config: {
    systemPrompt: `You are the supervisor coordinator for a personal branding workflow.

Your role is to orchestrate three specialized agents to help developers build their personal brand:

1. github-code-analyzer: Analyzes GitHub activity to extract achievements
2. personal-brand-strategist: Develops brand strategy and positioning
3. content-creator: Creates optimized content for multiple platforms

WORKFLOW SEQUENCE (always follow this order):
Step 1: First, call github-code-analyzer to analyze the developer's GitHub profile
Step 2: Then, call personal-brand-strategist to develop brand strategy based on achievements
Step 3: Finally, call content-creator to generate platform-specific content

ROUTING RULES:
- If user provides GitHub username → Start with github-code-analyzer
- If analysis is complete → Route to personal-brand-strategist
- If strategy is complete → Route to content-creator
- If all steps done → Return control to workflow

Always maintain context between agents by passing previous results in metadata.`,
    workers: [
      'github-code-analyzer',
      'personal-brand-strategist',
      'content-creator',
    ],
    enableForwardMessage: true,
    removeHandoffMessages: true,
  },
  streaming: true,
})
@Injectable()
export class DevBrandSupervisorWorkflow {
  constructor(
    private readonly brandMemory: PersonalBrandMemoryService
  ) {}
  // ✅ NO onModuleInit needed!
  // ✅ NO manual network setup!
  // ✅ NO createAgentDefinition boilerplate!

  /**
   * Entry point - Initialize the workflow
   */
  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;

    return {
      state: {
        executionId: `devbrand-${Date.now()}`,
        currentStep: 1,
        currentTask: 'initialization',
        confidence: 1.0,
        // Pass GitHub username and user ID to coordination
        githubUsername: state.githubUsername,
        userId: state.userId,
      },
    };
  }

  /**
   * Execute multi-agent coordination
   *
   * ✅ Coordination happens AUTOMATICALLY via @MultiAgent decorator
   * ✅ Results available via context.multiAgent
   * ✅ No manual coordinator.executeSimpleWorkflow() call needed
   */
  @Task({ dependsOn: ['initializeWorkflow'], triggersCoordination: true })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async executeMultiAgentCoordination(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state, multiAgent } = context;

    // ✅ Coordination results automatically available
    if (!multiAgent) {
      throw new Error('Multi-agent coordination results not available');
    }

    // Extract results from coordination
    const agentResults = {
      githubAnalysis: multiAgent.agentResults.githubData || {},
      brandStrategy: multiAgent.agentResults.brandStrategy || {},
      contentCreation: multiAgent.agentResults.generatedContent || {},
    };

    console.log(
      `✅ Multi-agent coordination completed. Execution path: ${multiAgent.executionPath.join(' → ')}`
    );

    return {
      state: {
        ...state,
        currentStep: 2,
        currentTask: 'multi-agent-coordination-complete',
        agentResults,
        confidence: multiAgent.confidence,
        executionPath: multiAgent.executionPath,
      },
    };
  }

  /**
   * Final step: Consolidate results and store in memory
   */
  @Task({ dependsOn: ['executeMultiAgentCoordination'] })
  @StreamProgress({ enabled: true })
  async finalizeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;

    try {
      const results = state.agentResults || {};

      // Extract achievements from GitHub analysis
      const achievements =
        results.githubAnalysis?.achievements ||
        results.githubAnalysis?.data?.achievements ||
        [];

      // Store achievements in personal brand memory
      if (achievements.length > 0) {
        for (const achievement of achievements) {
          await this.brandMemory.storeCodeAchievement(state.userId, {
            id: achievement.id || `achievement-${Date.now()}`,
            description: achievement.description,
            technologies: achievement.technologies || [],
            impact: achievement.impact || 'medium',
            date: new Date().toISOString(),
            repository: achievement.repository || 'unknown',
            userId: state.userId,
          });
        }
      }

      // Consolidate final result
      const finalResult = {
        achievements,
        strategy: results.brandStrategy,
        content: results.contentCreation,
        confidence: state.confidence,
      };

      return {
        state: {
          ...state,
          currentStep: 3,
          currentTask: 'completed',
          finalResult,
          confidence: 1.0,
        },
      };
    } catch (error) {
      console.error('Workflow finalization failed:', error);
      return {
        state: {
          ...state,
          currentStep: 3,
          currentTask: 'finalization-error',
        },
      };
    }
  }
}
```

---

## 📊 Benefits Comparison

### Code Metrics

| Metric | Before (Imperative) | After (@MultiAgent) | Improvement |
|--------|---------------------|---------------------|-------------|
| **Lines of Code** | ~450 LOC | ~180 LOC | **-60%** |
| **Boilerplate Methods** | 3 (onModuleInit, createAgentDefinition, getAgentCapabilities) | 0 | **-100%** |
| **Manual Setup Steps** | 5 steps | 0 steps | **-100%** |
| **Decorator Consistency** | ❌ Mixed imperative/declarative | ✅ Fully declarative | **Perfect** |
| **LangGraph Compliance** | ⚠️ Custom implementation | ✅ Matches official pattern | **Perfect** |
| **Type Safety** | ⚠️ Manual type assertions | ✅ Full type inference | **Perfect** |

### Architecture Comparison

| Aspect | Before | After | Benefit |
|--------|--------|-------|---------|
| **Pattern** | Imperative setup | Declarative decorator | ✅ Consistent with ecosystem |
| **Lifecycle** | Manual (onModuleInit) | Automatic (decorator) | ✅ Zero maintenance |
| **Agent Registration** | Manual injection + conversion | Automatic from decorator | ✅ No boilerplate |
| **Network Setup** | Manual coordinator calls | Automatic during compilation | ✅ Declarative |
| **Results Access** | Manual extraction | Enhanced context | ✅ Type-safe |
| **Testing** | Mock coordinator + agents | Mock decorator metadata | ✅ Simpler |
| **LangGraph Compliance** | Custom approach | Official pattern | ✅ Standards-compliant |

---

## 🚀 Implementation Roadmap

### Phase 1: Core Decorator Implementation (Week 1)

**Files to Create:**

1. `libs/langgraph-modules/multi-agent/src/lib/decorators/multi-agent.decorator.ts`
   - Implement `@MultiAgent` decorator
   - Implement metadata storage/retrieval functions
   - Add validation logic

2. `libs/langgraph-modules/multi-agent/src/index.ts`
   - Export `@MultiAgent` decorator
   - Export `MultiAgentConfig` interface
   - Export helper functions

**Tests to Create:**

1. `multi-agent.decorator.spec.ts`
   - Test decorator application
   - Test metadata storage
   - Test validation errors

### Phase 2: Workflow-Engine Integration (Week 2)

**Files to Update:**

1. `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`
   - Add `setupMultiAgentNetwork()` method
   - Update `extractWorkflowDefinition()` to process @MultiAgent
   - Add agent instance retrieval from DI

2. `libs/langgraph-modules/workflow-engine/src/lib/services/multi-agent-translation.service.ts`
   - Add `convertWorkflowAgentToDefinition()` method
   - Extract agent metadata automatically

**Tests to Create:**

1. `metadata-processor.multi-agent.spec.ts`
   - Test @MultiAgent metadata extraction
   - Test automatic network setup
   - Test error handling

### Phase 3: Context Enhancement (Week 2)

**Files to Update:**

1. `libs/langgraph-modules/functional-api/src/lib/interfaces/task-execution.interface.ts`
   - Add `MultiAgentCoordinationResults` interface
   - Update `TaskExecutionContext` with multiAgent field

2. `libs/langgraph-modules/functional-api/src/lib/services/functional-workflow.service.ts`
   - Implement `executeMultiAgentCoordination()`
   - Implement `isCoordinationTask()`
   - Implement `buildSupervisorMessage()`

**Tests to Create:**

1. `functional-workflow.multi-agent.spec.ts`
   - Test automatic coordination execution
   - Test context enhancement
   - Test coordination task detection

### Phase 4: DevBrand Transformation (Week 3)

**Files to Transform:**

1. `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`
   - Apply `@MultiAgent` decorator
   - Remove `onModuleInit()`
   - Remove `createAgentDefinition()`
   - Update task to use `context.multiAgent`

2. `apps/dev-brand-api/src/app/config/workflow-engine.config.ts`
   - Verify workflow registration still works

**Tests to Create:**

1. `devbrand-supervisor.workflow.spec.ts`
   - Test workflow compilation
   - Test automatic network setup
   - Test coordination execution

### Phase 5: Documentation & Examples (Week 3)

**Files to Create:**

1. `libs/langgraph-modules/multi-agent/MULTI_AGENT_DECORATOR.md`
   - Complete API documentation
   - Usage examples
   - Migration guide

2. `task-tracking/MULTI_AGENT_MIGRATION_GUIDE.md`
   - Step-by-step migration instructions
   - Before/after code examples
   - Common pitfalls

---

## 🔍 Design Decisions & Rationale

### 1. Class-Level vs Method-Level Decorator

**Decision**: Class-level `@MultiAgent`

**Rationale**:

- ✅ Matches LangGraph pattern (supervisor IS the workflow)
- ✅ Simpler lifecycle management (one network per workflow)
- ✅ Consistent with `@Workflow` pattern
- ✅ Cleaner separation of concerns

**Alternative Considered**: Method-level `@CoordinateAgents`

- ⚠️ More complex (multiple networks per workflow)
- ⚠️ Doesn't match LangGraph official pattern
- ⚠️ Lifecycle management more complex

### 2. Automatic vs Manual Agent Injection

**Decision**: Automatic agent injection from decorator metadata

**Rationale**:

- ✅ Zero boilerplate (no constructor injection needed)
- ✅ Fully declarative (just list agent classes)
- ✅ Workflow-engine handles DI automatically
- ✅ Consistent with decorator philosophy

**Alternative Considered**: Manual constructor injection

- ⚠️ Requires constructor boilerplate
- ⚠️ Developer must inject all agents manually
- ⚠️ Not fully declarative

### 3. Coordination Execution Timing

**Decision**: Automatic coordination when coordination task executes

**Rationale**:

- ✅ Transparent to developer (just decorate and execute)
- ✅ Results automatically injected into context
- ✅ No manual coordinator service calls
- ✅ Clean separation of concerns

**Alternative Considered**: Explicit coordination trigger

- ⚠️ Requires manual `@CoordinateNow` decorator or method call
- ⚠️ More complex API
- ⚠️ Less transparent

### 4. Results Access Pattern

**Decision**: Enhanced `TaskExecutionContext` with `multiAgent` field

**Rationale**:

- ✅ Explicit and clear where results come from
- ✅ Type-safe via interface
- ✅ Doesn't pollute workflow state
- ✅ Optional (only present for multi-agent workflows)

**Alternative Considered**: Implicit state update

- ⚠️ Less explicit where results come from
- ⚠️ Pollutes workflow state namespace
- ⚠️ Harder to type-check

---

## 🎓 Migration Guide

### From Current Implementation to @MultiAgent

**Step 1: Add @MultiAgent decorator**

```typescript
// Before
@Workflow({ name: 'my-supervisor', type: WorkflowType.FUNCTIONAL_TASK })
export class MySupervisorWorkflow implements OnModuleInit {
  // ...
}

// After
@Workflow({ name: 'my-supervisor', type: WorkflowType.FUNCTIONAL_TASK })
@MultiAgent({
  networkId: 'my-network',
  type: 'supervisor',
  agents: [Agent1, Agent2, Agent3],
  config: { systemPrompt: '...', workers: [...] }
})
export class MySupervisorWorkflow {
  // NO implements OnModuleInit!
}
```

**Step 2: Remove onModuleInit and helper methods**

```typescript
// Before: Delete these
async onModuleInit() { ... }
private createAgentDefinition() { ... }
private getAgentCapabilities() { ... }

// After: Gone! 🎉
```

**Step 3: Update coordination task**

```typescript
// Before
@Task({ dependsOn: ['init'] })
async coordinateAgents(context: TaskExecutionContext) {
  const result = await this.coordinator.executeSimpleWorkflow(
    this.networkId,
    message,
    config
  );

  const agentResults = {
    analysis: result.finalState.metadata?.data,
    // Manual extraction...
  };

  return { state: { agentResults } };
}

// After
@Task({ dependsOn: ['init'], triggersCoordination: true })
async coordinateAgents(context: TaskExecutionContext) {
  const { multiAgent } = context;

  const agentResults = {
    analysis: multiAgent.agentResults.data,
    // Automatic extraction!
  };

  return { state: { agentResults } };
}
```

**Step 4: Remove agent constructor injection (optional)**

```typescript
// Before: Manual injection
constructor(
  private readonly coordinator: MultiAgentCoordinatorService,
  private readonly agent1: Agent1,
  private readonly agent2: Agent2,
  private readonly agent3: Agent3
) {}

// After: Optional (agents auto-injected)
constructor(
  // Keep only services you actually use in workflow logic
  private readonly memoryService: MemoryService
) {}
```

---

## ✅ Validation Checklist

### Implementation Quality Gates

- [ ] `@MultiAgent` decorator implemented with full TypeScript types
- [ ] Metadata storage/retrieval functions working
- [ ] Validation logic prevents invalid configurations
- [ ] MetadataProcessorService extracts @MultiAgent metadata
- [ ] Automatic network setup during workflow compilation
- [ ] Agent instances retrieved from DI container automatically
- [ ] TaskExecutionContext enhanced with multiAgent field
- [ ] Automatic coordination execution for coordination tasks
- [ ] Results properly extracted and injected into context
- [ ] DevBrand workflow transformed and working
- [ ] Full test coverage (unit + integration)
- [ ] Documentation complete with examples
- [ ] Migration guide written

### Architecture Validation

- [ ] Fully declarative (no imperative setup code)
- [ ] LangGraph-compliant (matches official supervisor pattern)
- [ ] Zero boilerplate (no onModuleInit, createAgentDefinition)
- [ ] Type-safe (full TypeScript type inference)
- [ ] Consistent pattern (matches @Workflow, @Agent, @Node)
- [ ] Separation of concerns (workflow focuses on business logic)
- [ ] Automatic lifecycle management (setup, execution, teardown)
- [ ] Clean API (simple and intuitive)

---

## 📖 References

### LangGraph Official Documentation

1. [Multi-Agent Supervisor Tutorial](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/)
2. [LangGraph Multi-Agent Systems Overview](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
3. [GitHub: langgraph-supervisor-py](https://github.com/langchain-ai/langgraph-supervisor-py)
4. [LangGraph Blog: Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/)

### Internal Documentation

1. [Decorator Patterns Analysis](./DECORATOR_PATTERNS_ANALYSIS.md)
2. [Decorator Taxonomy](./DECORATOR_TAXONOMY.md)
3. [Multi-Agent Integration Complete](./DECORATOR_MULTI_AGENT_INTEGRATION_COMPLETE.md)
4. [Supervisor Transformation Comparison](./SUPERVISOR_TRANSFORMATION_COMPARISON.md)

---

## 🎯 Next Steps

1. **Review & Approve Design**: Validate @MultiAgent architecture with team
2. **Phase 1 Implementation**: Create @MultiAgent decorator (Week 1)
3. **Phase 2 Integration**: Integrate with workflow-engine (Week 2)
4. **Phase 3 Enhancement**: Enhance TaskExecutionContext (Week 2)
5. **Phase 4 Transformation**: Transform DevBrand workflow (Week 3)
6. **Phase 5 Documentation**: Complete docs and examples (Week 3)
7. **Testing & Validation**: Full test suite and quality gates
8. **Production Deployment**: Roll out to production workloads

---

## 📝 Open Questions

1. **Should we support multiple networks per workflow?**
   - Current design: One network per workflow (class-level decorator)
   - Alternative: Multiple networks (method-level decorators)
   - **Recommendation**: Start with one network, add multiple if needed

2. **How to handle agent failures during coordination?**
   - Current design: Return error in coordination results
   - Alternative: Automatic retry with exponential backoff
   - **Recommendation**: Return error, let workflow decide retry strategy

3. **Should coordination be lazy or eager?**
   - Lazy: Setup network on first coordination task execution
   - Eager: Setup network during workflow compilation (current)
   - **Recommendation**: Eager (faster execution, fail-fast validation)

4. **How to handle dynamic agent selection?**
   - Current design: Static agent list in decorator
   - Alternative: Dynamic agent selection based on runtime conditions
   - **Recommendation**: Start with static, add dynamic if needed

---

**Document Version**: 1.0
**Last Updated**: 2025-01-07
**Status**: Design Proposal
**Authors**: Development Team
