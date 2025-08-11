import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UnifiedWorkflowBase, WorkflowConfig } from './unified-workflow.base';
import { WorkflowDefinition, WorkflowState } from '../interfaces/workflow.interface';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import { getWorkflowMetadata, isWorkflow } from '../decorators/workflow.decorator';

/**
 * Base class for declarative workflows that use decorators
 * 
 * This class extends UnifiedWorkflowBase and provides automatic workflow
 * definition generation from @Workflow, @Node, and @Edge decorators.
 * 
 * @example
 * ```typescript
 * @Workflow({
 *   name: 'customer-support',
 *   description: 'Customer support automation workflow',
 *   streaming: true,
 *   hitl: { enabled: true },
 * })
 * export class CustomerSupportWorkflow extends DeclarativeWorkflowBase<CustomerState> {
 *   
 *   @StartNode({ description: 'Initialize customer support session' })
 *   async start(state: CustomerState): Promise<Partial<CustomerState>> {
 *     return {
 *       sessionId: `session_${Date.now()}`,
 *       status: 'active'
 *     };
 *   }
 *   
 *   @Node({
 *     type: 'llm',
 *     requiresApproval: true,
 *     confidenceThreshold: 0.8
 *   })
 *   async analyzeRequest(state: CustomerState): Promise<Partial<CustomerState>> {
 *     const analysis = await this.llm.analyze(state.customerMessage);
 *     return {
 *       analysis,
 *       confidence: analysis.confidence
 *     };
 *   }
 *   
 *   @Node('generate_response')
 *   @StreamToken()
 *   async generateResponse(state: CustomerState): AsyncIterableIterator<string> {
 *     yield* this.llm.streamResponse(state.analysis);
 *   }
 *   
 *   @Edge('start', 'analyzeRequest')
 *   startToAnalyze() {}
 *   
 *   @ConditionalEdge('analyzeRequest', {
 *     'high_confidence': 'generate_response',
 *     'low_confidence': 'human_approval'
 *   }, { default: 'generate_response' })
 *   routeAfterAnalysis(state: CustomerState): string {
 *     return state.confidence > 0.8 ? 'high_confidence' : 'low_confidence';
 *   }
 *   
 *   @ApprovalNode({ timeout: 300000 })
 *   async humanApproval(state: CustomerState): Promise<Command<CustomerState>> {
 *     return this.handleHumanApproval(state);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class DeclarativeWorkflowBase<TState extends WorkflowState = WorkflowState> 
  extends UnifiedWorkflowBase<TState> implements OnModuleInit {

  protected override readonly logger: Logger;
  protected cachedWorkflowDefinition?: WorkflowDefinition<TState>;

  constructor(
    protected readonly metadataProcessor: MetadataProcessorService,
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Initialize the declarative workflow on module init
   */
  async onModuleInit(): Promise<void> {
    // Validate that the class is decorated with @Workflow
    if (!isWorkflow(this.constructor)) {
      throw new Error(
        `${this.constructor.name} must be decorated with @Workflow decorator`
      );
    }

    // Extract workflow configuration from decorator
    const workflowOptions = getWorkflowMetadata(this.constructor);
    if (workflowOptions && !this.workflowConfig) {
      // Apply decorator configuration to the workflow config
      (this as any).workflowConfig = {
        name: workflowOptions.name || this.constructor.name,
        description: workflowOptions.description,
        confidenceThreshold: workflowOptions.confidenceThreshold || 0.7,
        requiresHumanApproval: workflowOptions.requiresHumanApproval || false,
        autoApproveThreshold: workflowOptions.autoApproveThreshold || 0.95,
        streaming: workflowOptions.streaming || false,
        cache: workflowOptions.cache || false,
        metrics: workflowOptions.metrics || false,
        hitl: workflowOptions.hitl,
      };
    }

    this.logger.log(`Initializing declarative workflow: ${this.workflowConfig.name}`);
    
    // Pre-generate the workflow definition for validation
    try {
      this.getWorkflowDefinition();
      this.logger.log(`Declarative workflow initialized successfully: ${this.workflowConfig.name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to initialize declarative workflow: ${errorMsg}`, errorStack);
      throw error;
    }
  }

  /**
   * Get the workflow definition from decorator metadata
   * This overrides the abstract method from UnifiedWorkflowBase
   */
  protected override getWorkflowDefinition(): WorkflowDefinition<TState> {
    return this.getDecoratorWorkflowDefinition();
  }

  /**
   * Get workflow definition for decorator-based workflows
   * This overrides the method from UnifiedWorkflowBase
   */
  protected override getDecoratorWorkflowDefinition(): WorkflowDefinition<TState> {
    // Return cached definition if available
    if (this.cachedWorkflowDefinition) {
      return this.cachedWorkflowDefinition;
    }

    this.logger.debug(`Extracting workflow definition from decorators for ${this.constructor.name}`);

    // Extract definition from decorator metadata
    const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(this.constructor);
    
    // Validate the definition
    this.metadataProcessor.validateWorkflowDefinition(definition);
    
    // Log summary for debugging
    const summary = this.metadataProcessor.getWorkflowSummary(definition);
    this.logger.debug(summary);

    // Cache the definition for performance
    this.cachedWorkflowDefinition = definition;
    
    return definition;
  }

  /**
   * Clear the cached workflow definition
   * Useful for testing or dynamic workflow updates
   */
  protected clearDefinitionCache(): void {
    this.cachedWorkflowDefinition = undefined;
    this.logger.debug('Workflow definition cache cleared');
  }

  /**
   * Get workflow metadata from decorators
   */
  getDecoratorMetadata(): any {
    return {
      workflow: getWorkflowMetadata(this.constructor),
      nodes: this.metadataProcessor.extractWorkflowDefinition(this.constructor).nodes,
      edges: this.metadataProcessor.extractWorkflowDefinition(this.constructor).edges,
    };
  }

  /**
   * Validate that all decorator-defined nodes have implementations
   */
  protected validateNodeImplementations(): void {
    const definition = this.getWorkflowDefinition();
    const missingImplementations: string[] = [];

    for (const node of definition.nodes) {
      // Check if the method exists on this instance
      const methodName = node.config?.metadata?.['methodName'];
      const method = (this as any)[methodName];
      if (!method || typeof method !== 'function') {
        missingImplementations.push(`${node.id} (method: ${methodName})`);
      }
    }

    if (missingImplementations.length > 0) {
      throw new Error(
        `Missing node implementations in ${this.constructor.name}: ${missingImplementations.join(', ')}`
      );
    }
  }

  /**
   * Get a specific node's configuration
   */
  protected getNodeConfig(nodeId: string): any {
    const definition = this.getWorkflowDefinition();
    const node = definition.nodes.find(n => n.id === nodeId);
    return node?.config;
  }

  /**
   * Get workflow statistics for monitoring
   */
  getWorkflowStats(): {
    name: string;
    nodeCount: number;
    edgeCount: number;
    approvalNodes: number;
    streamingNodes: number;
    toolNodes: number;
    hasHITL: boolean;
    hasStreaming: boolean;
  } {
    const definition = this.getWorkflowDefinition();
    
    return {
      name: definition.name,
      nodeCount: definition.nodes.length,
      edgeCount: definition.edges.length,
      approvalNodes: definition.nodes.filter(n => n.requiresApproval).length,
      streamingNodes: definition.nodes.filter(n => n.config?.streaming).length,
      toolNodes: definition.nodes.filter(n => n.config?.metadata?.['type'] === 'tool').length,
      hasHITL: this.workflowConfig.hitl?.enabled || false,
      hasStreaming: this.workflowConfig.streaming || false,
    };
  }

  /**
   * Override initialize to use declarative approach
   */
  override async initialize(): Promise<void> {
    this.logger.log(`Initializing declarative workflow: ${this.workflowConfig.name}`);
    
    // Validate node implementations before building
    this.validateNodeImplementations();
    
    // Use the parent implementation which will call getWorkflowDefinition()
    await super.initialize();
  }

  /**
   * Debug method to inspect the generated workflow structure
   */
  debugWorkflowStructure(): void {
    const definition = this.getWorkflowDefinition();
    
    console.log('\n=== Workflow Structure Debug ===');
    console.log(`Name: ${definition.name}`);
    console.log(`Description: ${definition.description}`);
    console.log(`Entry Point: ${definition.entryPoint}`);
    
    console.log('\nNodes:');
    definition.nodes.forEach(node => {
      console.log(`  - ${node.id} (${node.config?.metadata?.['type'] || 'standard'})`);
      console.log(`    Method: ${node.config?.metadata?.['methodName']}`);
      console.log(`    Requires Approval: ${node.requiresApproval || false}`);
      console.log(`    Streaming: ${node.config?.streaming || false}`);
    });
    
    console.log('\nEdges:');
    definition.edges.forEach((edge, index) => {
      const toDescription = typeof edge.to === 'string' 
        ? edge.to 
        : 'conditional routing';
      console.log(`  ${index + 1}. ${edge.from} → ${toDescription}`);
      if (edge.config?.metadata?.['type']) {
        console.log(`     Type: ${edge.config.metadata['type']}`);
      }
    });
    
    console.log('\nConfiguration:');
    console.log(`  HITL Enabled: ${this.workflowConfig.hitl?.enabled || false}`);
    console.log(`  Streaming: ${this.workflowConfig.streaming || false}`);
    console.log(`  Caching: ${this.workflowConfig.cache || false}`);
    console.log(`  Metrics: ${this.workflowConfig.metrics || false}`);
    
    console.log('=== End Debug ===\n');
  }
}