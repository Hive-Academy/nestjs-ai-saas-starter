/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable } from '@nestjs/common';
import { DeclarativeWorkflowBase } from '../base/declarative-workflow.base';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import { Workflow } from '../decorators/workflow.decorator';
import { Node, StartNode, EndNode } from '../decorators/node.decorator';
import { Edge, ConditionalEdge } from '../decorators/edge.decorator';
import { Command, CommandType, WorkflowState } from '../interfaces';

/**
 * Extended state for the simple test workflow
 */
interface SimpleTestState extends WorkflowState {
  userQuery?: string;
  analysis?: {
    complexity: 'low' | 'medium' | 'high';
    confidence: number;
  };
  response?: string;
}

/**
 * Simple test workflow demonstrating basic decorator features
 */
@Workflow({
  name: 'simple-test-workflow',
  description: 'Simple test workflow demonstrating basic decorator features',
  streaming: false,
  hitl: { 
    enabled: true, 
    timeout: 30000
  },
  confidenceThreshold: 0.7,
  cache: false,
  metrics: true,
})
@Injectable()
export class SimpleTestWorkflow extends DeclarativeWorkflowBase<SimpleTestState> {
  
  protected readonly workflowConfig = {
    name: 'simple-test-workflow',
    description: 'Simple test workflow demonstrating basic decorator features'
  };
  
  constructor(
    protected override readonly metadataProcessor: MetadataProcessorService,
  ) {
    super(metadataProcessor);
  }

  /**
   * Start node - initializes the workflow
   */
  @StartNode({ 
    description: 'Initialize the simple test workflow with user input'
  })
  async start(state: SimpleTestState): Promise<Partial<SimpleTestState>> {
    this.logger.log('Starting simple test workflow');
    
    return {
      currentNode: 'start',
      status: 'active',
      startedAt: new Date(),
    };
  }

  /**
   * Analysis node
   */
  @Node({
    description: 'Analyze user query to determine complexity',
    type: 'standard'
  })
  async analyze(state: SimpleTestState): Promise<Partial<SimpleTestState>> {
    this.logger.log('Analyzing user query');
    
    // Simple mock analysis
    const analysis = {
      complexity: state.userQuery?.includes('complex') ? 'high' as const : 'low' as const,
      confidence: state.userQuery?.includes('uncertain') ? 0.5 : 0.85,
    };

    return {
      analysis,
      confidence: analysis.confidence,
      currentNode: 'analyze',
    };
  }

  /**
   * Simple response generation
   */
  @Node({
    description: 'Generate response based on analysis',
    type: 'standard'
  })
  async generateResponse(state: SimpleTestState): Promise<Partial<SimpleTestState>> {
    this.logger.log('Generating response');
    
    const response = `Analysis complete. Complexity: ${state.analysis?.complexity}, Confidence: ${state.confidence}`;

    return {
      response,
      currentNode: 'generateResponse',
    };
  }

  /**
   * End node - finalizes the workflow
   */
  @EndNode({
    description: 'Complete the simple test workflow'
  })
  async end(state: SimpleTestState): Promise<Partial<SimpleTestState>> {
    this.logger.log('Completing simple test workflow');
    
    return {
      currentNode: 'end',
      status: 'completed',
      completedAt: new Date(),
    };
  }

  // Edge definitions using decorators

  @Edge('start', 'analyze')
  startToAnalyze() {}

  @ConditionalEdge('analyze', {
    'high_confidence': 'generateResponse',
    'low_confidence': 'end'
  })
  routeAfterAnalysis(state: SimpleTestState): string {
    return (state.confidence || 0) >= 0.7 ? 'high_confidence' : 'low_confidence';
  }

  @Edge('generateResponse', 'end')
  responseToEnd() {}

  /**
   * Custom method to validate the decorator setup
   */
  validateDecoratorSetup(): boolean {
    try {
      const definition = this.getWorkflowDefinition();
      
      // Check that we have the expected nodes
      const expectedNodes = ['start', 'analyze', 'generateResponse', 'end'];
      const actualNodes = definition.nodes.map(node => node.id);
      const missingNodes = expectedNodes.filter(node => !actualNodes.includes(node));
      
      if (missingNodes.length > 0) {
        this.logger.error(`Missing nodes: ${missingNodes.join(', ')}`);
        return false;
      }

      // Check that we have edges
      if (definition.edges.length === 0) {
        this.logger.error('No edges found in workflow definition');
        return false;
      }

      this.logger.log(`Workflow validation successful: ${actualNodes.length} nodes, ${definition.edges.length} edges`);
      return true;
    } catch (error) {
      this.logger.error('Workflow validation failed', error);
      return false;
    }
  }

  /**
   * Method to get workflow statistics
   */
  getTestStats() {
    const stats = this.getWorkflowStats();
    return {
      ...stats,
      decoratorValidation: this.validateDecoratorSetup(),
      testFeatures: {
        hasStreaming: stats.hasStreaming,
        hasHITL: stats.hasHITL,
        hasConditionalRouting: true,
        hasBasicNodes: true,
      }
    };
  }
}