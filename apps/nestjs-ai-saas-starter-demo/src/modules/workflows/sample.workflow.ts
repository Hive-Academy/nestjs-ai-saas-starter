import { Injectable } from '@nestjs/common';
import {
  Workflow,
  Node,
  Edge,
  WorkflowState,
} from '@hive-academy/nestjs-langgraph';

interface SampleWorkflowState extends WorkflowState {
  input: string;
  processedData?: string;
  reviewResult?: boolean;
  finalOutput?: string;
  metadata?: Record<string, any>; // Explicitly declare metadata
}

@Injectable()
@Workflow({
  name: 'sample-workflow',
  description: 'A sample workflow demonstrating basic capabilities',
})
export class SampleWorkflow {
  @Node({
    name: 'start',
    description: 'Initial workflow node',
  })
  async startNode(
    state: SampleWorkflowState
  ): Promise<Partial<SampleWorkflowState>> {
    console.log('Starting workflow with input:', state.input);
    return {
      metadata: {
        ...state.metadata,
        startTime: new Date().toISOString(),
      },
    };
  }

  @Node({
    name: 'process',
    description: 'Process the input data',
  })
  async processNode(
    state: SampleWorkflowState
  ): Promise<Partial<SampleWorkflowState>> {
    // Simulate data processing
    const processed = `Processed: ${state.input.toUpperCase()}`;

    return {
      processedData: processed,
      metadata: {
        ...state.metadata,
        processTime: new Date().toISOString(),
      },
    };
  }

  @Node({
    name: 'review',
    description: 'Review the processed data',
  })
  async reviewNode(
    state: SampleWorkflowState
  ): Promise<Partial<SampleWorkflowState>> {
    // Simulate review logic
    const isValid = Boolean(state.processedData && state.processedData.length > 0);

    return {
      reviewResult: isValid,
      metadata: {
        ...state.metadata,
        reviewTime: new Date().toISOString(),
        reviewPassed: isValid,
      },
    };
  }

  @Node({
    name: 'complete',
    description: 'Complete the workflow',
  })
  async completeNode(
    state: SampleWorkflowState
  ): Promise<Partial<SampleWorkflowState>> {
    const output = state.reviewResult
      ? `Success: ${state.processedData}`
      : 'Failed: Review did not pass';

    return {
      finalOutput: output,
      metadata: {
        ...state.metadata,
        endTime: new Date().toISOString(),
        status: state.reviewResult ? 'completed' : 'failed',
      },
    };
  }

  @Edge({ from: 'start', to: 'process' })
  startToProcess(state: SampleWorkflowState): boolean {
    return true;
  }

  @Edge({ from: 'process', to: 'review' })
  processToReview(state: SampleWorkflowState): boolean {
    return Boolean(state.processedData);
  }

  @Edge({ from: 'review', to: 'complete' })
  reviewToComplete(state: SampleWorkflowState): boolean {
    return state.reviewResult !== undefined;
  }
}
