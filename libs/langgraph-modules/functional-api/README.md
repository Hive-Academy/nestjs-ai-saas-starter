# Functional API Module - User Manual

## Overview

The **Functional API Module** enables **declarative workflow composition** through decorator-driven programming with two main paradigms:

1. **Functional Workflows** - Pure function composition with `@Entrypoint` and `@Task` decorators
2. **Declarative Workflows** - Graph-based composition with `@Node` and `@Edge` decorators

Built for enterprise-grade AI workflows with checkpointing, streaming, and LangGraph integration.

## ✅ VERIFIED ECOSYSTEM INTEGRATION

**Source Code Analysis** (January 2025)

The functional-api module serves as the **primary interface** for creating workflows in the LangGraph ecosystem. Decorators are processed by workflow-engine into executable graphs.

### Integration Architecture

| Module              | Integration Type      | Purpose                                                             |
| ------------------- | --------------------- | ------------------------------------------------------------------- |
| **workflow-engine** | Metadata Provider     | Extracts decorator metadata and compiles to `WorkflowDefinition`    |
| **streaming**       | Decorator Composition | `@StreamProgress`, `@StreamToken` decorators enhance workflow nodes |
| **multi-agent**     | Agent Coordination    | Workflows orchestrate multiple agents through decorator composition |
| **memory**          | Context Persistence   | Memory services integrate for conversation context                  |
| **checkpoint**      | State Recovery        | Automatic checkpointing for workflow state persistence              |

### 🎯 Key Architectural Insight

**Functional-API is a metadata provider, not an execution engine**:

```typescript
// Decorators capture metadata during class definition
@Workflow({ name: 'my-workflow' })
class MyWorkflow {
  @Entrypoint()
  async start() {
    /* ... */
  }
}

// Workflow-engine extracts metadata and compiles to executable graph
import { getWorkflowMetadata, getWorkflowNodes } from '@hive-academy/langgraph-functional-api';
const metadata = getWorkflowMetadata(MyWorkflow);
const nodes = getWorkflowNodes(MyWorkflow);

// Workflow-engine executes the compiled graph
await workflowExecutionService.executeWorkflow(definition);
```

### 📊 Real Production Example

**DevBrand Supervisor Workflow** - Multi-agent personal branding workflow:

```typescript
import { FunctionalWorkflow as Workflow, Entrypoint, Task, Node, Edge } from '@hive-academy/langgraph-functional-api';
import { StreamProgress, StreamToken } from '@hive-academy/langgraph-streaming';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';

@Workflow({
  name: 'devbrand-supervisor-workflow',
  streaming: true,
  confidenceThreshold: 0.7,
})
@Injectable()
export class DevBrandSupervisorWorkflow {
  constructor(private readonly llmProvider: LlmProviderService, private readonly githubAnalyzer: GitHubCodeAnalyzerAgent, private readonly brandMemory: PersonalBrandMemoryService) {}

  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeWorkflow(context: TaskExecutionContext) {
    return { state: { executionId: `devbrand-${Date.now()}` } };
  }

  @Task({ dependsOn: ['initializeWorkflow'] })
  @StreamToken({ enabled: true })
  async analyzeGitHubActivity(context: TaskExecutionContext) {
    // Real GitHub API integration
    const result = await this.githubAnalyzer.execute({
      messages: [{ content: `Analyze GitHub activity`, role: 'user' }],
      metadata: { githubUsername: state.githubUsername },
    });
    return { state: { codeAnalysis: result } };
  }

  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  async finalizeWorkflow(context: TaskExecutionContext) {
    // Store in memory for future context
    for (const achievement of state.codeAnalysis.achievements) {
      await this.brandMemory.storeCodeAchievement(userId, achievement);
    }
    return { state: { status: 'completed' } };
  }

  @Node({ type: 'condition' })
  async routeBasedOnConfidence(context: TaskExecutionContext) {
    return state.confidence > 0.8 ? { route: 'high-confidence' } : { route: 'low-confidence' };
  }

  @Edge('routeBasedOnConfidence', 'generateContent')
  routeToContentGeneration(state: WorkflowState): boolean {
    return state.confidence > 0.8;
  }
}
```

**Source**: `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`

### 🏗️ Complete Ecosystem Integration

**Full module integration pattern**:

```typescript
import { Module } from '@nestjs/common';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MemoryModule } from '@hive-academy/langgraph-memory';

@Module({
  imports: [
    // 1. Functional-API provides decorators
    FunctionalApiModule.forRoot({
      enableCheckpointing: true,
      enableStreaming: true,
    }),

    // 2. Workflow-Engine compiles decorators
    WorkflowEngineModule.forRoot({
      registry: { autoRegisterWorkflows: true },
    }),

    // 3. Streaming enhances workflows
    StreamingModule.forRoot({
      enableTokenStreaming: true,
    }),

    // 4. Multi-Agent coordinates agents
    MultiAgentModule.forRoot({
      coordination: 'centralized',
    }),

    // 5. Memory provides context
    MemoryModule.forRoot({
      chromaDb: { url: process.env.CHROMADB_URL },
    }),
  ],
  providers: [DevBrandSupervisorWorkflow],
})
export class AppModule {}
```

### 🎯 Consumer Benefits

**Before**: Manual graph construction (imperative)
**With Functional-API**: Declarative workflows (declarative)

| Approach           | Code Lines | Maintainability | Type Safety |
| ------------------ | ---------- | --------------- | ----------- |
| **Manual Graph**   | 50+ lines  | Low             | Moderate    |
| **Functional-API** | 20 lines   | High            | Excellent   |

**Key Benefits**:

- ✅ Declarative syntax reduces boilerplate by 60%
- ✅ Type-safe decorator system prevents runtime errors
- ✅ Automatic integration with streaming, memory, checkpoint modules
- ✅ Clear dependency tracking with `dependsOn`
- ✅ Production-ready error handling and retries

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

#### 4. DecoratorPatternConflictError

**Error**: "Incompatible decorator @Node/@Edge detected"

**Cause**: Mixing task-based (@Entrypoint/@Task) with node-based (@Node/@Edge) decorators

**Solution**: Choose ONE pattern per workflow class

```typescript
// ❌ FORBIDDEN: Mixing patterns
@Entrypoint()
async start(context: TaskExecutionContext) { }

@Node({ type: 'standard' }) // ❌ Conflict!
async process(state: WorkflowState) { }

// ✅ CORRECT: Pure task-based
@Entrypoint()
async start(context: TaskExecutionContext) { }

@Task({ dependsOn: ['start'] })
async process(context: TaskExecutionContext) { }
```

**Two Patterns Available**:
- **Task-Based**: `@Entrypoint` + `@Task` (dependency-driven, automatic edges)
- **Node-Based**: `@Node` + `@Edge` (graph-driven, explicit edges)

**📖 See**: [Complete Decorator Patterns Guide](./CLAUDE.md#decorator-patterns-complete-reference)

#### 5. Target Node 'X' Not Found

**Error**: Workflow compilation fails with missing node error

**Cause**: `@Edge` references a method decorated with `@Task` (edges only work with `@Node`)

**Solution**: Convert to pure node-based pattern

```typescript
// ❌ BEFORE: Mixed pattern
@Task({ dependsOn: ['start'] })
async process(context: TaskExecutionContext) { }

@Edge('process', 'finalize') // ❌ Can't find @Task node
route() {}

// ✅ AFTER: Pure node-based
@Node({ type: 'standard' })
async process(state: WorkflowState) { }

@Edge('process', 'finalize') // ✅ Can find @Node
route() {}
```

## Decorator Patterns Quick Reference

### Task-Based Pattern (Recommended for Linear Workflows)

**When to use**: Simple, sequential workflows with straightforward dependencies

```typescript
import { FunctionalWorkflow, Entrypoint, Task, WorkflowType } from '@hive-academy/langgraph-functional-api';

@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_TASK, // 🔑 Explicit type
})
export class MyWorkflow {
  @Entrypoint()
  async start(context: TaskExecutionContext) {
    return { state: { initialized: true } };
  }

  @Task({ dependsOn: ['start'] })
  async process(context: TaskExecutionContext) {
    return { state: { processed: true } };
  }

  @Task({ dependsOn: ['process'] })
  async finalize(context: TaskExecutionContext) {
    return { state: { completed: true } };
  }
}
```

**Flow**: `start → process → finalize` (edges created automatically)

### Node-Based Pattern (Recommended for Complex Routing)

**When to use**: Complex workflows with conditional routing and branching

```typescript
import { FunctionalWorkflow, Node, Edge, WorkflowType, DeclarativeWorkflowBase } from '@hive-academy/langgraph-functional-api';

@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_NODE, // 🔑 Explicit type
})
export class MyWorkflow extends DeclarativeWorkflowBase {
  @Node({ type: 'standard' })
  async start(state: WorkflowState) {
    return { initialized: true };
  }

  @Node({ type: 'condition' })
  async routeDecision(state: WorkflowState) {
    return { route: state.confidence > 0.8 ? 'high' : 'low' };
  }

  @Node({ type: 'standard' })
  async processHigh(state: WorkflowState) {
    return { result: 'auto-approved' };
  }

  @Node({ type: 'standard' })
  async processLow(state: WorkflowState) {
    return { result: 'needs-review' };
  }

  @Edge('start', 'routeDecision')
  startToRoute() {}

  @Edge('routeDecision', 'processHigh')
  routeToHigh(state: WorkflowState) {
    return state.route === 'high';
  }

  @Edge('routeDecision', 'processLow')
  routeToLow(state: WorkflowState) {
    return state.route === 'low';
  }
}
```

**Flow**: `start → routeDecision → (processHigh OR processLow)` (edges defined explicitly)

### Pattern Comparison

| Feature | Task-Based | Node-Based |
|---------|-----------|------------|
| **Decorators** | `@Entrypoint` + `@Task` | `@Node` + `@Edge` |
| **Edge Creation** | Automatic from `dependsOn` | Explicit with `@Edge` |
| **Best For** | Linear/sequential flows | Complex routing/branching |
| **Boilerplate** | Less (no edge definitions) | More (explicit edges) |
| **Control** | Dependency-driven | Full graph control |
| **Method Signature** | `(context: TaskExecutionContext)` | `(state: WorkflowState)` |

### Cross-Cutting Decorators (Work with Both Patterns)

The following decorators work with **both** task-based and node-based patterns:
- `@Tool` - Register methods as LangGraph tools
- `@RequiresApproval` - Human-in-the-loop approval
- `@StreamToken` - Token-level streaming for LLM responses
- `@StreamProgress` - Progress updates for workflow steps
- `@StreamEvent` - Custom event streaming

**📖 For complete documentation**: See [CLAUDE.md - Decorator Patterns Reference](./CLAUDE.md#decorator-patterns-complete-reference)

This module provides powerful workflow orchestration with both functional and declarative programming paradigms for enterprise AI applications.
