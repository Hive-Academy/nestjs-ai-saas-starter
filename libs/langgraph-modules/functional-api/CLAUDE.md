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
import { FunctionalWorkflow as Workflow, Entrypoint, Task, Node, Edge } from '@hive-academy/langgraph-functional-api';
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
  constructor(private readonly llmProvider: LlmProviderService, private readonly githubAnalyzer: GitHubCodeAnalyzerAgent, private readonly contentCreator: ContentCreatorAgent, private readonly brandStrategist: PersonalBrandStrategistAgent, private readonly brandMemory: PersonalBrandMemoryService) {}

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
    return workflowState.confidence > 0.8 ? { route: 'high-confidence' } : { route: 'low-confidence' };
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
import { getWorkflowMetadata, getWorkflowNodes, getWorkflowEdges, getAllStreamingMetadata } from '@hive-academy/langgraph-functional-api';
import type { NodeMetadata, EdgeMetadata } from '@hive-academy/langgraph-functional-api';

@Injectable()
export class MetadataProcessorService {
  /**
   * Extract WorkflowDefinition from decorator metadata
   */
  extractWorkflowDefinition<TState extends WorkflowState>(workflowClass: any): WorkflowDefinition<TState> {
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
import { Entrypoint, Task, TaskExecutionContext, TaskExecutionResult } from '@hive-academy/langgraph-modules-functional-api';

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
import { Node, Edge, ConditionalEdge, DeclarativeWorkflowBase } from '@hive-academy/langgraph-modules-functional-api';

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
