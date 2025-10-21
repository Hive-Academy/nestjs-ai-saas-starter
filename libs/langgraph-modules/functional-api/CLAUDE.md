# Functional API Module - Declarative Workflow System

## 🚀 LangGraph Declarative Workflows

**Evidence-Based API Documentation** (verified through source code inspection)

The Functional API Module provides a comprehensive decorator system for declarative workflow creation, with automatic decorator-to-graph compilation and workflow validation.

## ✅ VERIFIED ECOSYSTEM INTEGRATION PATTERNS

**Source Code Analysis Results** (January 2025)

The functional-api module is the **primary interface** for creating workflows in the LangGraph ecosystem. It provides decorators that are processed by workflow-engine into executable graphs.

### 🔗 Integration Architecture

| Module              | Integration Pattern   | Usage                                                                                                                            | File Reference                                                             |
| ------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **workflow-engine** | Decorator Translation | Uses `getWorkflowMetadata()`, `getWorkflowNodes()`, `getWorkflowEdges()` to extract metadata and compile to `WorkflowDefinition` | `workflow-engine/src/lib/core/metadata-processor.service.ts:14-101`        |
| **workflow-engine** | Central Registry      | Registers `WorkflowClass` from functional-api as `WorkflowProvider`                                                              | `workflow-engine/src/lib/services/central-registry.service.ts:3,16,93-100` |
| **streaming**       | Decorator Integration | `@StreamProgress`, `@StreamToken`, `@StreamEvent` decorators work with functional-api decorators                                 | `devbrand-supervisor.workflow.ts:14,96,120`                                |
| **multi-agent**     | Workflow Coordination | Functional workflows coordinate multiple agents through decorator composition                                                    | `devbrand-supervisor.workflow.ts:15,85-89`                                 |
| **memory**          | Context Integration   | Memory services integrated into functional workflows for persistence                                                             | `devbrand-supervisor.workflow.ts:19,89,361-372`                            |

### 🎯 Key Architectural Insight

**Functional-API is NOT a standalone execution engine**—it's a **metadata provider** for workflow-engine:

```typescript
// ❌ INCORRECT: Functional-API doesn't execute workflows directly
import { FunctionalWorkflowService } from '@hive-academy/langgraph-functional-api';
await functionalWorkflowService.executeWorkflow('my-workflow');

// ✅ CORRECT: Decorators provide metadata, workflow-engine executes
import { getWorkflowMetadata } from '@hive-academy/langgraph-functional-api';
import { MetadataProcessorService } from '@hive-academy/langgraph-workflow-engine';

// 1. Decorators capture metadata
const metadata = getWorkflowMetadata(MyWorkflowClass);

// 2. Workflow-engine processes metadata into executable graph
const definition = metadataProcessor.extractWorkflowDefinition(MyWorkflowClass);

// 3. Workflow-engine executes the compiled graph
await workflowExecutionService.executeWorkflow(definition);
```

### 📊 Real Production Integration

**DevBrand Supervisor Workflow** (verified source: `devbrand-supervisor.workflow.ts:76-428`):

```typescript
// REAL PRODUCTION WORKFLOW using functional-api decorators
import {
  FunctionalWorkflow as Workflow,
  Entrypoint,
  Task,
  Node,
  Edge,
} from '@hive-academy/langgraph-functional-api';
import { StreamProgress, StreamToken } from '@hive-academy/langgraph-streaming';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';

@Workflow({
  name: 'devbrand-supervisor-workflow',
  description: 'Multi-agent coordination for developer personal branding',
  streaming: true,
  confidenceThreshold: 0.7,
})
@Injectable()
export class DevBrandSupervisorWorkflow {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly githubAnalyzer: GitHubCodeAnalyzerAgent,
    private readonly contentCreator: ContentCreatorAgent,
    private readonly brandStrategist: PersonalBrandStrategistAgent,
    private readonly brandMemory: PersonalBrandMemoryService
  ) {}

  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
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
  async analyzeGitHubActivity(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Real GitHub API integration
    const agentState = {
      messages: [
        {
          content: `Analyze GitHub activity for ${workflowState.githubUsername}`,
          role: 'user',
        },
      ],
      metadata: {
        githubUsername: workflowState.githubUsername,
        timeframe: 'month',
      },
    };

    const analysisResult = await this.githubAnalyzer.execute(agentState);
    return { state: { codeAnalysis, currentStep: 2 } };
  }

  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  async developBrandStrategy(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Real brand strategy with memory integration
    const strategyResult = await this.brandStrategist.execute(agentState);
    return { state: { brandStrategy, currentStep: 4 } };
  }

  @Task({ dependsOn: ['developBrandStrategy'] })
  async finalizeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Store results in personal brand memory
    for (const achievement of workflowState.codeAnalysis.achievements) {
      await this.brandMemory.storeCodeAchievement(workflowState.userId, {
        id: achievement.id,
        description: achievement.description,
        technologies: achievement.technologies,
        impact: achievement.impact,
      });
    }
    return { state: { currentStep: 6, currentTask: 'completed' } };
  }

  @Node({ type: 'condition' })
  async routeBasedOnConfidence(context: TaskExecutionContext): Promise<{ route: string }> {
    return workflowState.confidence > 0.8
      ? { route: 'high-confidence' }
      : { route: 'low-confidence' };
  }

  @Edge('routeBasedOnConfidence', 'generateContent')
  routeToContentGeneration(state: DevBrandWorkflowState): boolean {
    return state.confidence > 0.8;
  }
}
```

**Source Reference**: `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`

### 🔄 Workflow-Engine Metadata Processing

**MetadataProcessorService Integration** (verified source: `metadata-processor.service.ts:1-456`):

```typescript
// REAL WORKFLOW-ENGINE INTEGRATION
import {
  getWorkflowMetadata,
  getWorkflowNodes,
  getWorkflowEdges,
  getAllStreamingMetadata,
} from '@hive-academy/langgraph-functional-api';
import type { NodeMetadata, EdgeMetadata } from '@hive-academy/langgraph-functional-api';

@Injectable()
export class MetadataProcessorService {
  /**
   * Extract WorkflowDefinition from decorator metadata
   */
  extractWorkflowDefinition<TState extends WorkflowState>(
    workflowClass: any
  ): WorkflowDefinition<TState> {
    // 1. Get workflow metadata from @Workflow decorator
    const workflowOptions = getWorkflowMetadata(workflowClass);
    if (!workflowOptions) {
      throw new Error(`No @Workflow decorator found on ${workflowClass.name}`);
    }

    // 2. Get node metadata from @Node, @Entrypoint, @Task decorators
    const nodeMetadata = getWorkflowNodes(workflowClass);
    this.logger.debug(`Found ${nodeMetadata.length} nodes for workflow ${workflowOptions.name}`);

    // 3. Get edge metadata from @Edge decorators
    const edgeMetadata = getWorkflowEdges(workflowClass);
    this.logger.debug(`Found ${edgeMetadata.length} edges for workflow ${workflowOptions.name}`);

    // 4. Convert to WorkflowDefinition
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
        },
      },
    };

    return definition;
  }

  /**
   * Extract streaming metadata for workflow nodes
   */
  private extractStreamingMetadata(
    nodeMetadata: NodeMetadata[],
    methodName: string
  ): {
    token?: StreamTokenMetadata;
    event?: StreamEventMetadata;
    progress?: StreamProgressMetadata;
  } {
    const node = nodeMetadata.find((n) => n.methodName === methodName);
    if (!node?.handler) return {};

    // Get streaming metadata from the handler function
    const target = node.handler as object;
    return getAllStreamingMetadata(target, methodName);
  }
}
```

**Source Reference**: `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`

### 🏗️ Complete Ecosystem Integration Example

**Full Integration Pattern** (all modules working together):

```typescript
// COMPLETE ECOSYSTEM INTEGRATION
import { Module } from '@nestjs/common';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MemoryModule } from '@hive-academy/langgraph-memory';
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    // 1. Functional-API provides decorator system
    FunctionalApiModule.forRoot({
      enableCheckpointing: true,
      enableStreaming: true,
      defaultTimeout: 30000,
    }),

    // 2. Workflow-Engine processes decorators into graphs
    WorkflowEngineModule.forRoot({
      registry: {
        autoRegisterAgents: true,
        autoRegisterWorkflows: true,
      },
    }),

    // 3. Streaming enhances workflows with real-time updates
    StreamingModule.forRoot({
      enableTokenStreaming: true,
      enableEventStreaming: true,
    }),

    // 4. Multi-Agent coordinates workflow agents
    MultiAgentModule.forRoot({
      coordination: 'centralized',
    }),

    // 5. Memory provides context persistence
    MemoryModule.forRoot({
      chromaDb: { url: process.env.CHROMADB_URL },
      neo4j: {
        uri: process.env.NEO4J_URI,
        username: process.env.NEO4J_USERNAME,
        password: process.env.NEO4J_PASSWORD,
      },
    }),

    // 6. Checkpoint enables state recovery
    CheckpointModule.forRoot({
      storage: 'redis',
      redis: { url: process.env.REDIS_URL },
    }),
  ],
  providers: [
    // Register workflows (decorated with @Workflow)
    DevBrandSupervisorWorkflow,
    GitHubCodeAnalyzerAgent,
    ContentCreatorAgent,
    PersonalBrandStrategistAgent,
  ],
})
export class DevBrandModule {}
```

### 🎯 Consumer Value Proposition

**Before Functional-API**: Manual graph construction with imperative code
**With Functional-API**: Declarative workflows with decorator-based composition

```typescript
// ❌ BEFORE: Manual graph construction (imperative)
const graph = new StateGraph({
  channels: MyStateAnnotation,
});

graph.addNode('start', async (state) => {
  // Node logic
});

graph.addNode('process', async (state) => {
  // Node logic
});

graph.addEdge('start', 'process');

const workflow = graph.compile();

// ✅ WITH FUNCTIONAL-API: Declarative workflow (declarative)
@Workflow({ name: 'my-workflow' })
class MyWorkflow {
  @Entrypoint()
  async start(context: TaskExecutionContext) {
    // Node logic
  }

  @Task({ dependsOn: ['start'] })
  async process(context: TaskExecutionContext) {
    // Node logic
  }
}

// Workflow-engine automatically compiles decorators to graph
```

### ✅ Verified Architecture Patterns

**Decorator System**: Complete decorator suite for declarative workflows

```typescript
// VERIFIED EXPORTS: Core workflow decorators
import {
  Workflow, // Class-level workflow decorator
  Node, // Method-level node decorator
  Edge, // Method-level edge decorator
  Entrypoint, // Entry point decorator
  Task, // Task decorator
} from '@hive-academy/langgraph-functional-api';

// Usage patterns verified in source
@Workflow({ name: 'my-workflow', description: 'Declarative workflow' })
class MyWorkflow {
  @Entrypoint()
  @Node({ type: 'start' })
  async initialize() {
    /* entry point */
  }

  @Task({ dependsOn: ['initialize'] })
  @Node({ type: 'process' })
  async process() {
    /* processing step */
  }

  @Edge('initialize', 'process')
  route() {
    /* edge definition */
  }
}
```

**Decorator-to-Graph Compilation**: Real compilation from decorators to executable graphs

```typescript
// VERIFIED EXPORTS: Compilation services
import {
  FunctionalWorkflowService, // Functional workflow execution
  WorkflowRegistrationService, // Workflow discovery & registration
  GraphGeneratorService, // Decorator → Graph compilation
  WorkflowValidator, // Workflow structure validation
} from '@hive-academy/langgraph-functional-api';

// Real compilation process
class GraphGeneratorService {
  // Converts decorator metadata to executable LangGraph structures
  async compileToGraph(workflowClass: WorkflowClass): Promise<CompiledGraph>;
}
```

**Metadata Extraction**: Real metadata extraction from decorators

```typescript
// VERIFIED EXPORTS: Metadata extraction functions
import {
  getWorkflowMetadata, // Extract @Workflow metadata
  getWorkflowNodes, // Extract @Node metadata
  getWorkflowEdges, // Extract @Edge metadata
  getAllStreamingMetadata, // Extract streaming metadata
} from '@hive-academy/langgraph-functional-api';

// Type-safe metadata extraction
const workflowMeta = getWorkflowMetadata(MyWorkflowClass);
const nodeMeta = getWorkflowNodes(MyWorkflowClass);
const edgeMeta = getWorkflowEdges(MyWorkflowClass);
```

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-modules-functional-api
```

```typescript
import { Module } from '@nestjs/common';
import { FunctionalApiModule } from '@hive-academy/langgraph-modules-functional-api';

@Module({
  imports: [
    FunctionalApiModule.forRoot({
      enableCheckpointing: true,
      enableStreaming: true,
      defaultTimeout: 30000,
      defaultRetryCount: 3,
    }),
  ],
})
export class AppModule {}
```

## Functional Workflows

### Core Decorators

#### @Entrypoint - METHOD-LEVEL

**Required**: Exactly one per workflow, marks the entry point.

```typescript
@Entrypoint({
  timeout?: number;        // Task timeout in milliseconds (default: 30000)
  retryCount?: number;     // Retry attempts on failure (default: 3)
  errorHandler?: string;   // Error handler method name
  metadata?: Record<string, unknown>; // Custom metadata
})
```

#### @Task - METHOD-LEVEL

Defines workflow tasks with explicit dependencies.

```typescript
@Task({
  dependsOn: readonly string[];    // Task dependencies
  timeout?: number;                // Task timeout
  retryCount?: number;            // Retry attempts
  errorHandler?: string;          // Error handler method
  metadata?: Record<string, unknown>; // Custom metadata
})
```

### Complete Example

```typescript
import { Injectable } from '@nestjs/common';
import {
  Entrypoint,
  Task,
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-modules-functional-api';

@Injectable()
export class DataProcessingWorkflow {
  // METHOD-LEVEL: Entry point decorator
  @Entrypoint({ timeout: 10000 })
  async initializeProcessing(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { input } = context.state;
    return {
      state: {
        rawData: input,
        startTime: Date.now(),
      },
    };
  }

  // METHOD-LEVEL: Task decorator with dependencies
  @Task({ dependsOn: ['initializeProcessing'] })
  async validateData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { rawData } = context.state;
    const validData = rawData.filter((item) => item.isValid);

    return {
      state: {
        validatedData: validData,
        validationComplete: true,
      },
    };
  }

  // METHOD-LEVEL: Sequential task
  @Task({ dependsOn: ['validateData'] })
  async transformData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { validatedData } = context.state;
    const transformedData = validatedData.map((item) => ({
      ...item,
      processedAt: new Date(),
      transformed: true,
    }));

    return {
      state: {
        finalData: transformedData,
        processingComplete: true,
      },
    };
  }
}
```

### Execution

```typescript
import { FunctionalWorkflowService } from '@hive-academy/langgraph-modules-functional-api';

@Injectable()
export class AppService {
  constructor(private readonly workflowService: FunctionalWorkflowService) {}

  async processData(inputData: any[]) {
    const result = await this.workflowService.executeWorkflow('DataProcessingWorkflow', {
      initialState: { input: inputData },
      timeout: 60000,
    });

    return result.finalState.finalData;
  }
}
```

## Declarative Workflows

### Core Decorators

#### @Node - METHOD-LEVEL

Defines workflow nodes with rich configuration.

```typescript
@Node({
  type?: 'standard' | 'tool' | 'llm' | 'human' | 'condition'; // Node type
  timeout?: number;              // Node timeout
  requiresApproval?: boolean;    // Human-in-the-loop
  description?: string;          // Node description
})
```

#### @Edge - METHOD-LEVEL

Defines connections between nodes.

```typescript
@Edge(fromNode, toNode, {
  condition?: (state: any) => boolean; // Custom condition
  description?: string;                // Edge description
})
```

### Example

```typescript
import { Injectable } from '@nestjs/common';
import {
  Node,
  Edge,
  ConditionalEdge,
  DeclarativeWorkflowBase,
} from '@hive-academy/langgraph-modules-functional-api';

@Injectable()
export class ApprovalWorkflow extends DeclarativeWorkflowBase {
  // METHOD-LEVEL: Node decorator
  @Node({ type: 'standard', description: 'Process request' })
  async processRequest(state: WorkflowState) {
    const { request } = state;
    const analysis = await this.analyzeRequest(request);

    return {
      analysis,
      confidence: analysis.confidence,
    };
  }

  // METHOD-LEVEL: Conditional node
  @Node({ type: 'condition', description: 'Route based on confidence' })
  async routeDecision(state: WorkflowState) {
    const { confidence } = state;

    if (confidence >= 0.9) {
      return { route: 'auto_approve' };
    } else {
      return { route: 'human_review' };
    }
  }

  // METHOD-LEVEL: Human approval node
  @Node({ type: 'human', requiresApproval: true })
  async humanReview(state: WorkflowState) {
    return {
      requiresApproval: true,
      reviewContext: state.analysis,
    };
  }

  // METHOD-LEVEL: Edge definitions
  @Edge('processRequest', 'routeDecision')
  processToRoute() {}

  @ConditionalEdge('routeDecision', {
    auto_approve: 'finalizeApproval',
    human_review: 'humanReview',
  })
  routeByDecision(state: WorkflowState): string {
    return state.route;
  }
}
```

## Core Interfaces

### TaskExecutionContext

```typescript
interface TaskExecutionContext<TState = FunctionalWorkflowState> {
  readonly state: TState; // Current workflow state
  readonly taskName: string; // Current task name
  readonly workflowId: string; // Workflow identifier
  readonly executionId: string; // Unique execution ID
  readonly metadata: Record<string, unknown>; // Execution metadata
}
```

### TaskExecutionResult

```typescript
interface TaskExecutionResult<TState = FunctionalWorkflowState> {
  readonly state: Partial<TState>; // State updates to apply
  readonly nextTasks?: readonly string[]; // Override next tasks
  readonly metadata?: Record<string, unknown>; // Task metadata
  readonly shouldCheckpoint?: boolean; // Force checkpoint
  readonly error?: Error; // Task error
}
```

## Service APIs

### FunctionalWorkflowService

```typescript
// Execute workflow
async executeWorkflow<TState>(
  workflowName: string,
  options?: WorkflowExecutionOptions
): Promise<WorkflowExecutionResult<TState>>

// Stream workflow events
streamWorkflow<TState>(
  workflowName: string,
  options?: WorkflowExecutionOptions
): Observable<WorkflowStreamEvent<TState>>

// Resume from checkpoint
async resumeFromCheckpoint<TState>(
  executionId: string,
  checkpointId?: string,
  options?: WorkflowExecutionOptions
): Promise<WorkflowExecutionResult<TState>>

// List registered workflows
listWorkflows(): string[]
```

## Configuration

### Basic Configuration

```typescript
FunctionalApiModule.forRoot({
  // Workflow execution settings
  defaultTimeout: 30000, // Default task timeout
  defaultRetryCount: 3, // Default retry attempts
  maxConcurrentTasks: 10, // Max parallel tasks

  // Checkpointing
  enableCheckpointing: true, // Enable state persistence
  checkpointInterval: 5000, // Auto-checkpoint interval

  // Streaming
  enableStreaming: false, // Enable event streaming

  // Validation
  enableCycleDetection: true, // Detect circular dependencies
});
```

### Advanced Configuration

```typescript
FunctionalApiModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    defaultTimeout: configService.get('WORKFLOW_TIMEOUT', 30000),
    enableCheckpointing: configService.get('ENABLE_CHECKPOINTS', true),

    // Custom checkpoint adapter
    checkpointAdapter: new CustomCheckpointAdapter({
      connectionString: configService.get('CHECKPOINT_DB_URL'),
    }),

    // Workflow-specific configurations
    workflows: [
      {
        name: 'DataProcessingWorkflow',
        timeout: 60000,
        retryCount: 5,
      },
    ],
  }),
  inject: [ConfigService],
});
```

## Error Handling

### Custom Error Handlers

```typescript
@Injectable()
export class RobustWorkflow {
  @Entrypoint({ errorHandler: 'handleInitError' })
  async initialize(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const data = await this.loadCriticalData();
    return { state: { data } };
  }

  // Error handler method (no decorator)
  async handleInitError(context: TaskExecutionContext, error: Error): Promise<TaskExecutionResult> {
    this.logger.error('Initialization failed, using fallback data', error);
    return {
      state: {
        data: this.getFallbackData(),
        usedFallback: true,
      },
    };
  }
}
```

## Streaming & Real-time Updates

```typescript
// Enable streaming
FunctionalApiModule.forRoot({
  enableStreaming: true,
});

// Stream workflow execution
@Injectable()
export class WorkflowService {
  async streamWorkflowExecution(workflowName: string, input: any) {
    const eventStream = this.functionalWorkflowService.getEventStream();

    eventStream.subscribe((event: WorkflowStreamEvent) => {
      switch (event.type) {
        case 'workflow_start':
          console.log('Workflow started:', event.metadata);
          break;
        case 'task_complete':
          console.log(`Task completed: ${event.taskName}`, event.state);
          break;
        case 'workflow_complete':
          console.log('Workflow completed:', event.state);
          break;
      }
    });

    return await this.functionalWorkflowService.executeWorkflow(workflowName, {
      initialState: { input },
      enableStreaming: true,
    });
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { FunctionalApiModule } from '@hive-academy/langgraph-modules-functional-api';

describe('DataProcessingWorkflow', () => {
  let workflow: DataProcessingWorkflow;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        FunctionalApiModule.forRoot({
          enableCheckpointing: false,
          enableStreaming: false,
        }),
      ],
      providers: [DataProcessingWorkflow],
    }).compile();

    workflow = module.get<DataProcessingWorkflow>(DataProcessingWorkflow);
  });

  it('should initialize with valid input', async () => {
    const context: TaskExecutionContext = {
      state: { input: [{ id: 1, value: 'test' }] },
      taskName: 'initializeProcessing',
      workflowId: 'test-workflow',
      executionId: 'test-exec-1',
      metadata: {},
    };

    const result = await workflow.initializeProcessing(context);

    expect(result.state.rawData).toEqual(context.state.input);
    expect(result.state.startTime).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Missing @Entrypoint

```typescript
// Error: Workflow provider has no @Entrypoint decorated method
// Solution: Add @Entrypoint decorator to exactly one method
@Entrypoint()
async startWorkflow(context: TaskExecutionContext) {
  // Entry point logic
}
```

#### 2. Circular Dependencies

```typescript
// Error: Circular dependency detected
// Solution: Review and fix task dependencies
@Task({ dependsOn: ['taskB'] })  // Remove circular reference
async taskA() { }

@Task({ dependsOn: ['taskA'] })
async taskB() { }
```

#### 3. Task Timeouts

```typescript
// Solution: Increase timeout for long-running tasks
@Task({
  dependsOn: ['loadData'],
  timeout: 120000 // 2 minutes instead of default 30 seconds
})
async longRunningTask(context: TaskExecutionContext) {
  // Long processing...
}
```

This module provides powerful workflow orchestration with both functional and declarative programming paradigms for enterprise AI applications.

---

## 🔍 Decorator Patterns - Complete Reference

### Overview: Two Mutually Exclusive Patterns

The Functional API Module supports **two workflow patterns** that **cannot be mixed**:

1. **Task-Based Pattern** (Dependency-Driven)

   - Uses `@Entrypoint` + `@Task` decorators
   - Edges automatically created from `dependsOn` relationships
   - Best for: Linear/sequential workflows with straightforward dependencies
   - Method signature: `(context: TaskExecutionContext) => Promise<TaskExecutionResult>`

2. **Node-Based Pattern** (Graph-Driven)
   - Uses `@Node` + `@Edge` decorators
   - Edges explicitly defined with `@Edge` decorators
   - Best for: Complex routing, conditional logic, branching workflows
   - Method signature: `(state: WorkflowState) => Promise<Partial<WorkflowState>>`

**⚠️ CRITICAL RULE**: You **CANNOT** mix these patterns within a single workflow class.

### Pattern Selection Guide

**Choose Task-Based Pattern When:**

- ✅ Workflow is mostly linear/sequential
- ✅ Dependencies are straightforward (A → B → C)
- ✅ You want automatic edge creation from `dependsOn`
- ✅ Simpler implementation with less boilerplate

**Choose Node-Based Pattern When:**

- ✅ Complex conditional routing required
- ✅ Multiple branching paths with dynamic routing
- ✅ Need explicit control over graph structure
- ✅ Advanced control flow (loops, dynamic routing)

### Pattern 1: Task-Based Workflow (Functional)

**Architecture**: Dependency-driven execution with implicit edges

```typescript
import {
  Entrypoint,
  Task,
  TaskExecutionContext,
  TaskExecutionResult,
  WorkflowType,
} from '@hive-academy/langgraph-functional-api';

@FunctionalWorkflow({
  name: 'task-workflow',
  type: WorkflowType.FUNCTIONAL_TASK, // 🔑 Explicit type declaration
  description: 'Linear workflow with task dependencies',
})
@Injectable()
export class TaskBasedWorkflow {
  @Entrypoint({ timeout: 15000 })
  async initializeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    return {
      state: {
        initialized: true,
        startTime: Date.now(),
      },
    };
  }

  @Task({ dependsOn: ['initializeWorkflow'] })
  async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    // Process data
    return {
      state: {
        processed: true,
        results: processedData,
      },
    };
  }

  @Task({ dependsOn: ['processData'] })
  async validateResults(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    // Validate results
    return {
      state: {
        validated: true,
        confidence: 0.95,
      },
    };
  }

  @Task({ dependsOn: ['validateResults'] })
  async finalizeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    return {
      state: {
        completed: true,
        endTime: Date.now(),
      },
    };
  }
}
```

**Execution Flow** (implicit edges):

```
initializeWorkflow → processData → validateResults → finalizeWorkflow
```

**Key Features**:

- ✅ `dependsOn` automatically creates edges
- ✅ Parallel execution when dependencies allow: `@Task({ dependsOn: ['A', 'B'] })`
- ✅ Type-safe context with `TaskExecutionContext`
- ✅ Immutable state updates with `TaskExecutionResult`

### Pattern 2: Node-Based Workflow (Declarative)

**Architecture**: Graph-driven execution with explicit edges

```typescript
import { Node, Edge, WorkflowState, WorkflowType } from '@hive-academy/langgraph-functional-api';

@FunctionalWorkflow({
  name: 'node-workflow',
  type: WorkflowType.FUNCTIONAL_NODE, // 🔑 Explicit type declaration
  description: 'Graph workflow with conditional routing',
})
@Injectable()
export class NodeBasedWorkflow extends DeclarativeWorkflowBase {
  @Node({ type: 'standard' })
  async initializeWorkflow(state: WorkflowState) {
    return {
      initialized: true,
      startTime: Date.now(),
    };
  }

  @Node({ type: 'standard' })
  async processData(state: WorkflowState) {
    // Process data
    return {
      processed: true,
      confidence: 0.85,
    };
  }

  @Node({ type: 'condition' })
  async routeBasedOnConfidence(state: WorkflowState): Promise<{ route: string }> {
    return {
      route: state.confidence > 0.8 ? 'high-confidence' : 'low-confidence',
    };
  }

  @Node({ type: 'standard' })
  async processHighConfidence(state: WorkflowState) {
    return { result: 'auto-approved' };
  }

  @Node({ type: 'human', requiresApproval: true })
  async processLowConfidence(state: WorkflowState) {
    return { result: 'requires-review' };
  }

  @Node({ type: 'standard' })
  async finalizeWorkflow(state: WorkflowState) {
    return {
      completed: true,
      endTime: Date.now(),
    };
  }

  // Define all edges explicitly
  @Edge('initializeWorkflow', 'processData')
  initToProcess() {}

  @Edge('processData', 'routeBasedOnConfidence')
  processToRoute() {}

  @Edge('routeBasedOnConfidence', 'processHighConfidence')
  routeToHigh(state: WorkflowState): boolean {
    return state.route === 'high-confidence';
  }

  @Edge('routeBasedOnConfidence', 'processLowConfidence')
  routeToLow(state: WorkflowState): boolean {
    return state.route === 'low-confidence';
  }

  @Edge('processHighConfidence', 'finalizeWorkflow')
  highToFinalize() {}

  @Edge('processLowConfidence', 'finalizeWorkflow')
  lowToFinalize() {}
}
```

**Execution Flow** (explicit edges):

```
                                      ┌─> processHighConfidence ─┐
initializeWorkflow → processData → routeBasedOnConfidence           → finalizeWorkflow
                                      └─> processLowConfidence ──┘
```

**Key Features**:

- ✅ Explicit edge declarations for full control
- ✅ Conditional routing with `@Node({ type: 'condition' })`
- ✅ Dynamic branching based on state
- ✅ Complex graph structures (loops, diamonds, etc.)

### Cross-Cutting Decorators (Work with BOTH Patterns)

The following decorators are **pattern-agnostic** and work with both task-based and node-based workflows:

```typescript
// ✅ ALLOWED: Cross-cutting decorators with task-based pattern
@Entrypoint()
@StreamProgress({ enabled: true })
@RequiresApproval({ threshold: 0.8 })
async start(context: TaskExecutionContext) { }

@Task({ dependsOn: ['start'] })
@Tool({ name: 'process_data' })
@StreamToken({ enabled: true })
async processData(context: TaskExecutionContext) { }

// ✅ ALLOWED: Cross-cutting decorators with node-based pattern
@Node({ type: 'standard' })
@StreamProgress({ enabled: true })
@RequiresApproval({ threshold: 0.9 })
async analyze(state: WorkflowState) { }

@Node({ type: 'tool' })
@Tool({ name: 'search' })
async searchData(state: WorkflowState) { }
```

**Cross-Cutting Decorators List**:

- `@Tool` - Register methods as LangGraph tools
- `@RequiresApproval` - Human-in-the-loop approval
- `@StreamToken` - Token-level streaming for LLM responses
- `@StreamProgress` - Progress updates for workflow steps
- `@StreamEvent` - Custom event streaming

### Explicit Workflow Type Declaration

**Best Practice**: Always declare workflow type explicitly to prevent accidental mixing:

```typescript
// ✅ RECOMMENDED: Explicit type declaration
@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_TASK, // Enforces task-based pattern
})
export class MyWorkflow {
  @Entrypoint() // ✅ Allowed
  async start(context: TaskExecutionContext) {}

  @Task({ dependsOn: ['start'] }) // ✅ Allowed
  async process(context: TaskExecutionContext) {}

  @Node({ type: 'standard' }) // ❌ ERROR! Type mismatch
  async invalid(state: WorkflowState) {}
}
```

**Validation Flow**:

1. First decorator sets the pattern (task-based or node-based)
2. Subsequent decorators must match the established pattern
3. Explicit `type` in `@FunctionalWorkflow` enforces pattern from the start
4. Runtime validation throws `DecoratorPatternConflictError` if patterns conflict

### Pattern Validation Rules

| Decorator Category  | Task-Based    | Node-Based    | Class-Level | Notes                  |
| ------------------- | ------------- | ------------- | ----------- | ---------------------- |
| @Entrypoint         | ✅ PRIMARY    | ❌ FORBIDDEN  | ❌          | Task-based entry point |
| @Task               | ✅ PRIMARY    | ❌ FORBIDDEN  | ❌          | Task-based node        |
| @Node               | ❌ FORBIDDEN  | ✅ PRIMARY    | ❌          | Node-based node        |
| @Edge               | ❌ FORBIDDEN  | ✅ PRIMARY    | ❌          | Node-based connection  |
| @FunctionalWorkflow | ✅ Compatible | ✅ Compatible | ✅          | Class-level config     |
| @Tool               | ✅ Compatible | ✅ Compatible | ❌          | Cross-cutting          |
| @RequiresApproval   | ✅ Compatible | ✅ Compatible | ❌          | Cross-cutting          |
| @Stream\*           | ✅ Compatible | ✅ Compatible | ❌          | Cross-cutting          |

### Anti-Pattern: Mixing Decorators (FORBIDDEN)

```typescript
// ❌ FORBIDDEN: Mixing patterns - THIS WILL FAIL!
@FunctionalWorkflow({ name: 'bad-workflow' })
export class MixedPatternWorkflow {
  @Entrypoint() // Sets pattern to 'task-based'
  async start(context: TaskExecutionContext) {}

  @Task({ dependsOn: ['start'] }) // ✅ Task-based - OK
  async step1(context: TaskExecutionContext) {}

  @Node({ type: 'standard' }) // ❌ ERROR! Attempting node-based in task-based workflow
  async step2(state: WorkflowState) {}

  @Edge('step1', 'step2') // ❌ ERROR! Attempting node-based in task-based workflow
  route() {}
}
```

**Error Thrown**:

```
╔════════════════════════════════════════════════════════════════════════╗
║ DECORATOR PATTERN CONFLICT                                             ║
╚════════════════════════════════════════════════════════════════════════╝

Incompatible decorator @Node detected in "MixedPatternWorkflow"

📊 Pattern Status:
   Current pattern:   task-based
   Attempted pattern: node-based

🚫 You cannot mix decorator patterns:
   • Task-based:  @Entrypoint + @Task (dependency-driven)
   • Node-based:  @Node + @Edge (graph-driven)

📖 See: libs/langgraph-modules/functional-api/CLAUDE.md#decorator-patterns
```

### Common Migration Scenarios

#### Migrating Task-Based → Node-Based

**Before (Task-Based)**:

```typescript
@Entrypoint()
async start(context: TaskExecutionContext) { }

@Task({ dependsOn: ['start'] })
async process(context: TaskExecutionContext) { }

@Task({ dependsOn: ['process'] })
async finalize(context: TaskExecutionContext) { }
```

**After (Node-Based)**:

```typescript
@Node({ type: 'standard' })
async start(state: WorkflowState) { }

@Node({ type: 'standard' })
async process(state: WorkflowState) { }

@Node({ type: 'standard' })
async finalize(state: WorkflowState) { }

@Edge('start', 'process')
startToProcess() {}

@Edge('process', 'finalize')
processToFinalize() {}
```

**Changes Required**:

1. Replace `@Entrypoint` with `@Node({ type: 'standard' })`
2. Replace all `@Task` with `@Node`
3. Add explicit `@Edge` decorators for all connections
4. Change method signatures from `TaskExecutionContext` to `WorkflowState`
5. Update return types from `TaskExecutionResult` to `Partial<WorkflowState>`
6. Update `@FunctionalWorkflow.type` from `FUNCTIONAL_TASK` to `FUNCTIONAL_NODE`

#### Migrating Node-Based → Task-Based

**Before (Node-Based)**:

```typescript
@Node({ type: 'standard' })
async start(state: WorkflowState) { }

@Node({ type: 'standard' })
async process(state: WorkflowState) { }

@Edge('start', 'process')
startToProcess() {}
```

**After (Task-Based)**:

```typescript
@Entrypoint()
async start(context: TaskExecutionContext) { }

@Task({ dependsOn: ['start'] })
async process(context: TaskExecutionContext) { }
```

**Changes Required**:

1. Replace first `@Node` with `@Entrypoint`
2. Replace remaining `@Node` decorators with `@Task({ dependsOn: [...] })`
3. Remove all `@Edge` decorators (dependencies now expressed via `dependsOn`)
4. Change method signatures from `WorkflowState` to `TaskExecutionContext`
5. Update return types to `TaskExecutionResult`
6. Update `@FunctionalWorkflow.type` from `FUNCTIONAL_NODE` to `FUNCTIONAL_TASK`

### Runtime Validation Implementation

The functional-api module includes **compile-time validation** that prevents pattern mixing:

**Validator Location**: `libs/langgraph-modules/functional-api/src/lib/utils/decorator-validator.ts`

**Validation Flow**:

```typescript
// When @Entrypoint is applied
validateDecoratorPattern(target, 'task-based', 'Entrypoint');
// ✅ Sets pattern to 'task-based'

// When @Task is applied
validateDecoratorPattern(target, 'task-based', 'Task');
// ✅ Matches existing 'task-based' pattern

// When @Node is applied (in task-based workflow)
validateDecoratorPattern(target, 'node-based', 'Node');
// ❌ Throws DecoratorPatternConflictError
```

**Validation Triggers**:

- ✅ During TypeScript compilation when decorators are applied
- ✅ When `@Entrypoint`, `@Task`, `@Node`, or `@Edge` are used
- ✅ When explicit `@FunctionalWorkflow.type` is declared
- ✅ When explicit `@Agent.workflow.type` is declared

### Troubleshooting Decorator Conflicts

#### Error: "Target node 'X' not found"

**Symptom**: Workflow compilation fails with missing node error

**Cause**: Mixing `@Task` with `@Node`/`@Edge` - `getWorkflowNodes()` only finds `@Node` decorators

**Solution**: Choose one pattern and stick to it

```typescript
// ❌ BEFORE: Mixed pattern
@Task({ dependsOn: ['start'] })
async process(context) { }

@Edge('process', 'finalize') // ❌ Edge references @Task node
route() {}

// ✅ AFTER: Pure node-based
@Node({ type: 'standard' })
async process(state) { }

@Edge('process', 'finalize') // ✅ Edge references @Node
route() {}
```

#### Error: "DecoratorPatternConflictError"

**Symptom**: Compile-time error when applying decorators

**Cause**: Attempting to mix task-based and node-based decorators

**Solution**: Remove conflicting decorators and use single pattern

```typescript
// ❌ BEFORE: Conflict
@Entrypoint()
async start(context) { }

@Node({ type: 'standard' }) // ❌ Conflicts with @Entrypoint
async process(state) { }

// ✅ AFTER: Pure task-based
@Entrypoint()
async start(context) { }

@Task({ dependsOn: ['start'] })
async process(context) { }
```

### Key Takeaways

1. **Two Patterns Only**: Task-based (@Entrypoint/@Task) OR Node-based (@Node/@Edge)
2. **Pattern Exclusivity**: Never mix patterns in a single workflow
3. **Explicit Types**: Always declare `@FunctionalWorkflow.type` for clarity
4. **Cross-Cutting Freedom**: @Tool, @RequiresApproval, @Stream\* work with both patterns
5. **Validation Timing**: Errors caught at compile-time during TypeScript decoration
6. **Pattern Selection**: Task-based for simple flows, node-based for complex routing
