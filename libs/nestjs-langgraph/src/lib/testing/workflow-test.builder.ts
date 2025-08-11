import { Injectable } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import { WorkflowState } from '../interfaces/workflow.interface';
import { WorkflowStateAnnotation } from '../core/workflow-state-annotation';

export interface TestWorkflowOptions {
  mockLLM?: boolean;
  mockTools?: string[];
  recordEvents?: boolean;
  timeout?: number;
}

/**
 * Builder for creating test workflows
 */
@Injectable()
export class WorkflowTestBuilder {
  private events: any[] = [];
  private mockResponses = new Map<string, any>();

  /**
   * Create a test workflow
   */
  createTestWorkflow<TState extends WorkflowState = WorkflowState>(
    name: string,
    options: TestWorkflowOptions = {},
  ): StateGraph<TState> {
    const graph = new StateGraph<TState>(WorkflowStateAnnotation as any);

    if (options.recordEvents) {
      this.events = [];
    }

    return graph;
  }

  /**
   * Add a mock response for a node
   */
  addMockResponse(nodeId: string, response: any): void {
    this.mockResponses.set(nodeId, response);
  }

  /**
   * Get mock response for a node
   */
  getMockResponse(nodeId: string): any {
    return this.mockResponses.get(nodeId);
  }

  /**
   * Get recorded events
   */
  getEvents(): any[] {
    return [...this.events];
  }

  /**
   * Clear recorded events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Create a test state
   */
  createTestState(overrides: Partial<WorkflowState> = {}): WorkflowState {
    return {
      executionId: 'test-exec-123',
      status: 'active',
      currentNode: 'start',
      completedNodes: [],
      confidence: 1.0,
      messages: [],
      metadata: {},
      timestamps: {
        started: new Date(),
      },
      ...overrides,
    } as WorkflowState;
  }

  /**
   * Execute a workflow with test configuration
   */
  async executeTest<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    initialState: TState,
    options: TestWorkflowOptions = {},
  ): Promise<TState> {
    const compiled = graph.compile();
    
    if (options.timeout) {
      return Promise.race([
        compiled.invoke(initialState) as Promise<TState>,
        new Promise<TState>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), options.timeout)
        ),
      ]);
    }

    return compiled.invoke(initialState) as Promise<TState>;
  }

  /**
   * Record an event
   */
  recordEvent(event: any): void {
    if (this.events) {
      this.events.push({
        ...event,
        timestamp: new Date(),
      });
    }
  }
}