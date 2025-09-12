# Functional API Module - User Manual

## Overview

The **Functional API Module** enables **declarative workflow composition** through decorator-driven programming with two main paradigms:

1. **Functional Workflows** - Pure function composition with `@Entrypoint` and `@Task` decorators
2. **Declarative Workflows** - Graph-based composition with `@Node` and `@Edge` decorators

Built for enterprise-grade AI workflows with checkpointing, streaming, and LangGraph integration.

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
