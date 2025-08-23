# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the **@langgraph-modules/functional-api** module.

## Business Domain Overview

### Core Purpose

The functional-api module enables **functional workflow composition** through decorator-driven programming patterns. It provides a declarative approach to defining complex data processing pipelines, ETL workflows, and computational graphs using pure functional principles.

### Key Value Propositions

- **Functional Purity**: Tasks are designed as pure functions with immutable state transformations
- **Declarative Composition**: Define complex workflows through simple decorator annotations
- **Dependency Management**: Automatic resolution and execution ordering based on task dependencies
- **Side Effect Isolation**: Clear separation between pure computation and side effects
- **Pipeline Architecture**: Natural expression of data transformation pipelines

### Target Use Cases

- **Data Processing Pipelines**: ETL workflows, data validation, transformation chains
- **Computational Workflows**: Scientific computing, mathematical operations, data analysis
- **Business Logic Composition**: Domain-specific workflows with clear functional boundaries
- **Integration Pipelines**: API composition, service orchestration, data synchronization
- **Report Generation**: Multi-stage document processing and report compilation

## Functional Programming Architecture

### Core Principles

#### Pure Function Composition

Tasks are designed as **pure functions** that:

- Take immutable input state
- Return new state without side effects
- Are deterministic and predictable
- Enable easy testing and reasoning

```typescript
// ✅ Pure function task - recommended pattern
@Task({ dependsOn: ['extractData'] })
async transformData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { rawData } = context.state;
  
  // Pure transformation - no side effects
  const transformedData = rawData.map(item => ({
    ...item,
    processed: true,
    timestamp: new Date().toISOString()
  }));
  
  return {
    state: { transformedData } // Return new state
  };
}
```

#### Immutable State Management

State flows through the workflow as immutable data:

- Each task receives read-only state
- Tasks return partial state updates
- State transformations create new objects
- No in-place mutations allowed

```typescript
interface WorkflowState extends FunctionalWorkflowState {
  readonly data?: ReadonlyArray<DataItem>;
  readonly processedData?: ReadonlyArray<ProcessedItem>;
  readonly validationResults?: ReadonlyArray<ValidationResult>;
}
```

#### Side Effect Isolation

Side effects are explicitly managed and isolated:

- Pure tasks handle computation
- Dedicated tasks manage I/O operations
- Clear boundaries between pure and impure operations

```typescript
// Pure computation task
@Task({ name: 'calculateMetrics' })
async calculateMetrics(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { data } = context.state;
  const metrics = computeStatistics(data); // Pure function
  return { state: { metrics } };
}

// Side effect task - clearly separated
@Task({ name: 'saveResults', dependsOn: ['calculateMetrics'] })
async saveResults(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { metrics } = context.state;
  await this.databaseService.saveMetrics(metrics); // Side effect
  return { state: { saved: true } };
}
```

## Decorator-Driven Functional Patterns

### @Entrypoint Decorator

Marks the workflow entry point - typically handles input validation and initial state setup:

```typescript
@Entrypoint({ 
  timeout: 10000,
  retryCount: 2,
  metadata: { stage: 'initialization' }
})
async initializeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { input } = context.state;
  
  // Validate and normalize input
  const normalizedInput = validateAndNormalize(input);
  
  return {
    state: { 
      initializedInput: normalizedInput,
      startTime: Date.now()
    }
  };
}
```

### @Task Decorator

Defines computational units with explicit dependencies:

```typescript
@Task({ 
  dependsOn: ['initializeWorkflow'],
  timeout: 15000,
  retryCount: 3,
  metadata: { stage: 'processing', complexity: 'high' }
})
async processComplexData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { initializedInput } = context.state;
  
  // Complex pure computation
  const result = await performComplexCalculation(initializedInput);
  
  return {
    state: { processedResult: result },
    nextTasks: ['validateResults', 'generateReport']
  };
}
```

## Functional Programming Best Practices

### Pure Function Design

Design tasks as pure functions following functional programming principles:

```typescript
// ✅ Excellent: Pure function with clear input/output
@Task({ dependsOn: ['loadData'] })
async transformUserData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { users } = context.state;
  
  // Pure transformation using functional patterns
  const transformedUsers = users
    .filter(user => user.active)
    .map(user => ({
      id: user.id,
      name: user.name.trim().toLowerCase(),
      email: user.email.toLowerCase(),
      metadata: {
        processedAt: new Date().toISOString(),
        version: '2.0'
      }
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return {
    state: { transformedUsers }
  };
}

// ❌ Avoid: Impure function with side effects
@Task()
async badTransformData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { data } = context.state;
  
  // ❌ Side effects in transformation task
  console.log('Processing data...'); // Logging side effect
  await this.metricsService.increment('processed_count'); // Database side effect
  data.forEach(item => item.processed = true); // Mutation
  
  return { state: { data } };
}
```

### Immutability Patterns

Ensure all state transformations preserve immutability:

```typescript
// ✅ Immutable state transformations
@Task({ dependsOn: ['fetchOrders'] })
async enrichOrderData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { orders, customerData } = context.state;
  
  const enrichedOrders = orders.map(order => ({
    ...order, // Spread existing properties
    customer: {
      ...customerData.find(c => c.id === order.customerId),
      lastOrderDate: order.orderDate
    },
    enrichmentMetadata: {
      enrichedAt: new Date().toISOString(),
      dataVersion: '1.2'
    }
  }));
  
  return {
    state: { 
      enrichedOrders,
      originalOrderCount: orders.length // Preserve original data reference
    }
  };
}
```

### Error Handling in Functional Context

Handle errors functionally using Result types or explicit error state:

```typescript
// ✅ Functional error handling with Result type pattern
interface ProcessingResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

@Task({ dependsOn: ['validateInput'] })
async processDataSafely(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { inputData } = context.state;
  
  const results: ProcessingResult<ProcessedData>[] = inputData.map(item => {
    try {
      const processedItem = processItem(item); // Pure processing function
      return { success: true, data: processedItem };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  const successfulResults = results
    .filter(r => r.success)
    .map(r => r.data!);
    
  const errors = results
    .filter(r => !r.success)
    .map(r => r.error!);
  
  return {
    state: { 
      processedData: successfulResults,
      processingErrors: errors,
      successCount: successfulResults.length,
      errorCount: errors.length
    }
  };
}
```

## Key Services Architecture

### FunctionalWorkflowService

Central orchestration service managing workflow execution:

**Core Capabilities:**

- **Dependency Resolution**: Automatically determines task execution order
- **State Management**: Manages immutable state flow between tasks
- **Execution Planning**: Builds efficient execution graphs
- **Error Recovery**: Handles task failures with retry mechanisms
- **Checkpoint Integration**: Supports workflow resumption

**Key Methods:**

```typescript
// Execute complete workflow
await workflowService.executeWorkflow<MyState>('DataProcessingWorkflow', {
  initialState: { inputData: rawData },
  timeout: 30000,
  enableStreaming: true
});

// Resume from checkpoint
await workflowService.resumeFromCheckpoint<MyState>(
  executionId,
  checkpointId,
  { metadata: { resumeReason: 'system_restart' } }
);
```

### WorkflowDiscoveryService

Automatically discovers and registers decorated workflow classes:

**Discovery Process:**

1. Scans all NestJS providers for decorated methods
2. Extracts @Entrypoint and @Task metadata
3. Builds workflow definitions with dependency graphs
4. Validates workflow integrity before registration

**Runtime Registration:**

```typescript
// Service automatically discovers workflows like:
@Injectable()
export class ReportingWorkflow {
  @Entrypoint()
  async startReporting(context: TaskExecutionContext) { /* ... */ }
  
  @Task({ dependsOn: ['startReporting'] })
  async gatherData(context: TaskExecutionContext) { /* ... */ }
}
```

### WorkflowValidator

Ensures workflow integrity and prevents runtime errors:

**Validation Checks:**

- **Single Entrypoint**: Ensures exactly one @Entrypoint per workflow
- **Task References**: Validates all dependencies reference existing tasks
- **Cycle Detection**: Prevents circular dependency chains
- **Execution Order**: Validates topological ordering is possible

## Performance Optimization

### Function Memoization

Implement memoization for expensive pure computations:

```typescript
// ✅ Memoization for expensive pure functions
const memoizedCalculation = new Map<string, CalculationResult>();

@Task({ dependsOn: ['prepareData'] })
async performComplexCalculation(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { dataKey, parameters } = context.state;
  const cacheKey = `${dataKey}_${JSON.stringify(parameters)}`;
  
  // Check memoization cache
  if (memoizedCalculation.has(cacheKey)) {
    return {
      state: { 
        result: memoizedCalculation.get(cacheKey),
        fromCache: true
      }
    };
  }
  
  // Perform expensive calculation
  const result = performExpensiveComputation(parameters);
  
  // Cache result
  memoizedCalculation.set(cacheKey, result);
  
  return {
    state: { result, fromCache: false }
  };
}
```

### Lazy Evaluation Strategies

Implement lazy evaluation for optional or conditional computations:

```typescript
// ✅ Lazy evaluation pattern
@Task({ dependsOn: ['analyzeRequirements'] })
async conditionalProcessing(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { requirements, processingLevel } = context.state;
  
  // Lazy evaluation - only compute when needed
  const lazyResults = {
    basic: () => performBasicProcessing(requirements),
    advanced: () => performAdvancedProcessing(requirements),
    complete: () => performCompleteProcessing(requirements)
  };
  
  // Execute only the required level
  const result = lazyResults[processingLevel]();
  
  return {
    state: { 
      processedResult: result,
      processingLevel,
      computationTime: Date.now() - context.state.startTime
    }
  };
}
```

## Validation and Type Safety

### Compile-time Type Safety

Leverage TypeScript for comprehensive type checking:

```typescript
// ✅ Strong typing for workflow state
interface DataPipelineState extends FunctionalWorkflowState {
  readonly rawData?: ReadonlyArray<RawDataItem>;
  readonly cleanedData?: ReadonlyArray<CleanedDataItem>;
  readonly analyzedData?: ReadonlyArray<AnalyzedDataItem>;
  readonly reportData?: ReportSummary;
}

@Injectable()
export class DataPipelineWorkflow {
  @Entrypoint()
  async initializePipeline(
    context: TaskExecutionContext<DataPipelineState>
  ): Promise<TaskExecutionResult<DataPipelineState>> {
    // TypeScript ensures type safety
    return {
      state: { 
        rawData: context.state.inputData as RawDataItem[]
      }
    };
  }
}
```

### Runtime Validation

Implement validation for workflow inputs and state transitions:

```typescript
// ✅ Runtime validation with functional patterns
@Task({ dependsOn: ['loadData'] })
async validateAndCleanData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { rawData } = context.state;
  
  // Functional validation pipeline
  const validationResults = rawData.map(item => ({
    item,
    isValid: validateDataItem(item),
    errors: getValidationErrors(item)
  }));
  
  const validData = validationResults
    .filter(result => result.isValid)
    .map(result => result.item);
    
  const invalidData = validationResults
    .filter(result => !result.isValid)
    .map(result => ({ 
      item: result.item, 
      errors: result.errors 
    }));
  
  return {
    state: {
      cleanedData: validData,
      invalidData,
      validationSummary: {
        totalItems: rawData.length,
        validItems: validData.length,
        invalidItems: invalidData.length
      }
    }
  };
}
```

## Integration with Imperative Workflows

### Hybrid Workflow Patterns

Combine functional and imperative patterns when appropriate:

```typescript
// Functional workflow that can be embedded in imperative graphs
@Injectable()
export class DataTransformationWorkflow {
  @Entrypoint()
  async startTransformation(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Pure functional processing
    const { inputData } = context.state;
    const transformedData = this.transformDataFunctionally(inputData);
    
    return {
      state: { transformedData },
      // Signal that this can integrate with imperative workflows
      nextTasks: ['continueWithImperativeLogic']
    };
  }
  
  private transformDataFunctionally(data: unknown[]): unknown[] {
    return data
      .filter(item => this.isValidItem(item))
      .map(item => this.transformItem(item))
      .sort((a, b) => this.compareItems(a, b));
  }
}
```

### Service Integration

Integrate functional workflows with other services:

```typescript
// Integration with other NestJS services
@Injectable()
export class IntegratedWorkflow {
  constructor(
    private readonly functionalWorkflowService: FunctionalWorkflowService,
    private readonly streamingWorkflowService: StreamingWorkflowService
  ) {}
  
  async executeHybridWorkflow(data: unknown[]) {
    // Execute functional pipeline first
    const functionalResult = await this.functionalWorkflowService.executeWorkflow(
      'DataProcessingWorkflow',
      { initialState: { inputData: data } }
    );
    
    // Continue with imperative workflow if needed
    if (functionalResult.finalState.requiresImperativeProcessing) {
      return await this.streamingWorkflowService.executeWorkflow(
        'PostProcessingWorkflow',
        { initialState: functionalResult.finalState }
      );
    }
    
    return functionalResult;
  }
}
```

## Testing Strategies for Functional Code

### Pure Function Testing

Test pure functions in isolation:

```typescript
// ✅ Testing pure task functions
describe('DataTransformationWorkflow', () => {
  let workflow: DataTransformationWorkflow;
  
  beforeEach(() => {
    workflow = new DataTransformationWorkflow();
  });
  
  describe('transformData task', () => {
    it('should transform data without side effects', async () => {
      // Arrange
      const inputState = {
        rawData: [
          { id: 1, name: 'Test', active: true },
          { id: 2, name: 'Test2', active: false }
        ]
      };
      
      const context: TaskExecutionContext = {
        state: inputState,
        taskName: 'transformData',
        workflowId: 'test-workflow',
        executionId: 'test-exec',
        metadata: {}
      };
      
      // Act
      const result = await workflow.transformData(context);
      
      // Assert
      expect(result.state.transformedData).toEqual([
        { id: 1, name: 'test', active: true, processed: true }
      ]);
      
      // Verify no side effects - original state unchanged
      expect(inputState.rawData).toEqual([
        { id: 1, name: 'Test', active: true },
        { id: 2, name: 'Test2', active: false }
      ]);
    });
  });
});
```

### Property-Based Testing

Use property-based testing for functional workflows:

```typescript
// ✅ Property-based testing example
import { fc } from 'fast-check';

describe('Data validation properties', () => {
  it('should maintain data count through transformations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.integer(), name: fc.string() })),
        async (inputData) => {
          const context: TaskExecutionContext = {
            state: { inputData },
            taskName: 'processData',
            workflowId: 'test',
            executionId: 'test',
            metadata: {}
          };
          
          const result = await workflow.processData(context);
          
          // Property: total processed + rejected should equal input
          const totalOutput = 
            (result.state.processedData?.length || 0) + 
            (result.state.rejectedData?.length || 0);
            
          expect(totalOutput).toBe(inputData.length);
        }
      )
    );
  });
});
```

### Integration Testing

Test complete functional workflows:

```typescript
// ✅ Integration testing for workflows
describe('Complete Workflow Integration', () => {
  let workflowService: FunctionalWorkflowService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [FunctionalApiModule.forRoot()],
      providers: [TestDataWorkflow]
    }).compile();
    
    workflowService = module.get<FunctionalWorkflowService>(FunctionalWorkflowService);
  });
  
  it('should execute complete data processing pipeline', async () => {
    // Arrange
    const inputData = generateTestData(100);
    
    // Act
    const result = await workflowService.executeWorkflow('TestDataWorkflow', {
      initialState: { inputData },
      timeout: 30000
    });
    
    // Assert
    expect(result.finalState.processedData).toBeDefined();
    expect(result.finalState.validationResults).toBeDefined();
    expect(result.executionPath).toEqual([
      'initializeWorkflow',
      'validateData', 
      'transformData',
      'generateReport'
    ]);
  });
});
```

## Common Anti-patterns to Avoid

### State Mutation

```typescript
// ❌ Avoid mutating state
@Task()
async badTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const data = context.state.data;
  data.forEach(item => item.processed = true); // Mutation!
  return { state: { data } };
}

// ✅ Create new state
@Task()
async goodTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const { data } = context.state;
  const processedData = data.map(item => ({ ...item, processed: true }));
  return { state: { processedData } };
}
```

### Hidden Side Effects

```typescript
// ❌ Avoid hidden side effects in pure tasks
@Task()
async badTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const result = processData(context.state.data);
  
  // Hidden side effects
  console.log('Processing complete'); // Logging
  await this.notificationService.notify('Done'); // I/O
  this.metrics.increment('processed'); // State change
  
  return { state: { result } };
}

// ✅ Separate pure computation from side effects
@Task({ name: 'computeResult' })
async computeResult(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  const result = processData(context.state.data); // Pure
  return { state: { result } };
}

@Task({ name: 'handleSideEffects', dependsOn: ['computeResult'] })
async handleSideEffects(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  await this.notificationService.notify('Processing complete');
  this.metrics.increment('processed');
  return { state: { sideEffectsHandled: true } };
}
```

This module enables sophisticated functional workflow composition with strong typing, automatic dependency resolution, and comprehensive validation - ideal for building robust data processing pipelines and computational workflows.
