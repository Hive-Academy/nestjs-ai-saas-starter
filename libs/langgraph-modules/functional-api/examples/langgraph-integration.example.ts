import { Injectable } from '@nestjs/common';
import { 
  Entrypoint, 
  Task, 
  TaskExecutionContext, 
  TaskExecutionResult,
  FunctionalWorkflowService 
} from '../src';

/**
 * Example demonstrating LangGraph StateGraph generation from decorators
 * This workflow is automatically converted to a LangGraph StateGraph for execution
 */
@Injectable()
export class DataProcessingWorkflow {
  constructor(
    private readonly workflowService: FunctionalWorkflowService
  ) {}

  /**
   * Entry point that initializes the workflow
   * This becomes the START node in the LangGraph StateGraph
   */
  @Entrypoint({ 
    timeout: 10000,
    metadata: { stage: 'initialization' }
  })
  async initializeProcessing(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log('Initializing data processing workflow');
    
    const { inputData } = context.state;
    
    // Validate input
    if (!inputData || !Array.isArray(inputData)) {
      throw new Error('Invalid input data');
    }
    
    return {
      state: {
        rawData: inputData,
        totalItems: inputData.length,
        processedItems: 0,
        startTime: Date.now()
      }
    };
  }

  /**
   * Validates and cleans the data
   * This becomes a node in the LangGraph StateGraph
   */
  @Task({ 
    dependsOn: ['initializeProcessing'],
    timeout: 15000,
    retryCount: 2,
    metadata: { stage: 'validation' }
  })
  async validateData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log('Validating data');
    
    const { rawData } = context.state;
    
    const validData = rawData.filter((item: any) => {
      // Perform validation logic
      return item && typeof item === 'object' && item.id;
    });
    
    const invalidCount = rawData.length - validData.length;
    
    return {
      state: {
        validatedData: validData,
        validCount: validData.length,
        invalidCount,
        validationCompleted: true
      }
    };
  }

  /**
   * Transforms the validated data
   * Connected via edges based on dependencies
   */
  @Task({ 
    dependsOn: ['validateData'],
    timeout: 20000,
    metadata: { stage: 'transformation' }
  })
  async transformData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log('Transforming data');
    
    const { validatedData } = context.state;
    
    // Pure functional transformation
    const transformedData = validatedData.map((item: any) => ({
      ...item,
      processedAt: new Date().toISOString(),
      transformed: true,
      // Apply transformation logic
      normalizedName: item.name?.toLowerCase().trim(),
      category: this.categorizeItem(item)
    }));
    
    return {
      state: {
        transformedData,
        processedItems: transformedData.length,
        transformationCompleted: true
      }
    };
  }

  /**
   * Generates a summary report
   * This becomes a terminal node connected to END
   */
  @Task({ 
    dependsOn: ['transformData'],
    timeout: 10000,
    metadata: { stage: 'reporting' }
  })
  async generateReport(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log('Generating report');
    
    const { 
      totalItems, 
      validCount, 
      invalidCount, 
      processedItems,
      startTime 
    } = context.state;
    
    const report = {
      summary: {
        totalItems,
        validItems: validCount,
        invalidItems: invalidCount,
        processedItems,
        processingTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    
    return {
      state: {
        report,
        workflowCompleted: true
      },
      // Checkpoint this important state
      shouldCheckpoint: true
    };
  }

  /**
   * Helper method for categorization
   */
  private categorizeItem(item: any): string {
    // Business logic for categorization
    if (item.value > 100) return 'high';
    if (item.value > 50) return 'medium';
    return 'low';
  }
}

/**
 * Example usage showing how to execute the workflow with LangGraph
 */
export class WorkflowExecutionExample {
  constructor(
    private readonly functionalWorkflowService: FunctionalWorkflowService
  ) {}

  async executeWithLangGraph() {
    // Sample input data
    const inputData = [
      { id: 1, name: 'Item One', value: 150 },
      { id: 2, name: 'Item Two', value: 75 },
      { id: 3, name: 'Item Three', value: 25 },
      { id: 4, name: null, value: 0 }, // Invalid item
    ];

    try {
      // Execute using the new LangGraph integration
      const result = await this.functionalWorkflowService.executeWorkflowWithLangGraph(
        'DataProcessingWorkflow',
        {
          initialState: { inputData },
          metadata: { 
            executionType: 'production',
            user: 'system' 
          }
        }
      );

      console.log('Workflow completed successfully');
      console.log('Final state:', result.finalState);
      console.log('Execution path:', result.executionPath);
      console.log('Execution time:', result.executionTime, 'ms');
      console.log('Checkpoints saved:', result.checkpointCount);

      // The workflow has been executed as a LangGraph StateGraph with:
      // - Automatic node creation from @Task decorators
      // - Edge generation from dependencies
      // - State management and merging
      // - Checkpoint integration
      // - Error handling and retries

      return result;

    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Visualize the generated LangGraph structure
   */
  async visualizeGraph() {
    const graphViz = await this.functionalWorkflowService.visualizeWorkflow(
      'DataProcessingWorkflow'
    );
    
    console.log('Generated LangGraph structure:');
    console.log(graphViz);
    
    // Output will be a DOT graph representation showing:
    // START -> initializeProcessing -> validateData -> transformData -> generateReport -> END
  }

  /**
   * Resume from checkpoint using LangGraph
   */
  async resumeFromCheckpoint(executionId: string, checkpointId?: string) {
    const result = await this.functionalWorkflowService.resumeFromCheckpoint(
      executionId,
      checkpointId,
      {
        metadata: { resumeReason: 'system_recovery' }
      }
    );

    console.log('Resumed workflow from checkpoint');
    console.log('Final state:', result.finalState);
    
    return result;
  }
}

/**
 * Key Benefits of LangGraph Integration:
 * 
 * 1. **Automatic Graph Generation**: Decorators are automatically converted to LangGraph StateGraphs
 * 2. **State Management**: LangGraph handles state merging and propagation
 * 3. **Execution Control**: LangGraph manages node execution order and parallelism
 * 4. **Error Handling**: Built-in retry and error recovery mechanisms
 * 5. **Checkpointing**: Native LangGraph checkpoint support
 * 6. **Streaming**: Real-time execution updates via LangGraph streaming
 * 7. **Visualization**: Generate graph visualizations for debugging
 * 8. **Type Safety**: Full TypeScript support throughout
 * 
 * The Functional API module now seamlessly bridges decorator-based workflows
 * with LangGraph's powerful execution engine, providing the best of both worlds.
 */