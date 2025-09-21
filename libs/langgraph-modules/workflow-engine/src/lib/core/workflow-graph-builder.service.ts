import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { StateGraph, StateGraphArgs } from '@langchain/langgraph';
import type {
  WorkflowState,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
} from '../interfaces';
import type { IMemoryAdapter, ICheckpointAdapter } from '@hive-academy/langgraph-core';
import { WorkflowStateAnnotation } from '@hive-academy/langgraph-core';
import { MetadataProcessorService } from './metadata-processor.service';
import { DecoratorTranslationService } from '../services/decorator-translation.service';
import { GraphPatternsService } from './graph-patterns.service';
import { GraphOptimizationService } from './graph-optimization.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import type {
  DecoratorDefinition,
  DecoratorBridgeConfig,
} from '../interfaces/decorator-bridge.interface';

export interface GraphBuilderOptions {
  checkpointer?: ICheckpointAdapter;
  interrupt?: {
    before?: string[];
    after?: string[];
  };
  debug?: boolean;
  channels?: StateGraphArgs<any>['channels'];
  stateAnnotation?: any;
  bridgeConfig?: DecoratorBridgeConfig;
}

export type NodeHandler<TState = WorkflowState> = (
  state: TState
) => Promise<Partial<TState>>;

export type EdgeCondition<TState = WorkflowState> = (
  state: TState
) => string | null;

/**
 * Lean WorkflowGraphBuilderService that delegates to specialized services
 * This is the refactored version that eliminates code duplication
 */
@Injectable()
export class WorkflowGraphBuilderService {
  private readonly logger = new Logger(WorkflowGraphBuilderService.name);
  private readonly graphs = new Map<string, StateGraph<any>>();

  constructor(
    private readonly metadataProcessor: MetadataProcessorService,
    private readonly graphPatterns: GraphPatternsService,
    private readonly graphOptimization: GraphOptimizationService,
    private readonly workflowExecution: WorkflowExecutionService,
    @Optional()
    @Inject('DecoratorTranslationService')
    private readonly decoratorTranslation?: DecoratorTranslationService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Build a workflow graph from a definition
   */
  async buildFromDefinition<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>,
    options: GraphBuilderOptions = {}
  ): Promise<StateGraph<TState>> {
    const startTime = performance.now();
    this.logger.debug(`Building workflow graph: ${definition.name}`);

    // Apply optimization patterns if memory adapter is available
    const optimizedOptions = await this.graphOptimization.enhanceWithOptimizationPatterns(
      definition,
      options
    );

    // Create state graph with appropriate annotation
    const stateAnnotation =
      optimizedOptions.stateAnnotation ||
      definition.channels ||
      WorkflowStateAnnotation;

    const graph = new StateGraph<TState>(stateAnnotation);

    // Analyze graph complexity for optimization
    const graphComplexity = this.graphOptimization.analyzeGraphComplexity(definition);

    // Add nodes
    for (const node of definition.nodes) {
      this.addNode(graph, node, optimizedOptions);
    }

    // Add edges
    for (const edge of definition.edges) {
      this.addEdge(graph, edge);
    }

    // Set entry point
    graph.setEntryPoint(definition.entryPoint as any);

    // Set interrupt points if configured
    if (optimizedOptions.interrupt) {
      this.configureInterrupts(graph, optimizedOptions.interrupt);
    }

    const buildTime = performance.now() - startTime;

    // Store optimization patterns for future learning
    if (this.memoryAdapter) {
      await this.graphOptimization.storeOptimizationPatterns(
        definition,
        graphComplexity,
        buildTime,
        optimizedOptions
      );
    }

    this.logger.debug(
      `Workflow graph built successfully: ${definition.name} (${buildTime.toFixed(2)}ms)`
    );
    
    return graph;
  }

  /**
   * Build a workflow graph from decorator metadata
   */
  async buildFromDecorators<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    options: GraphBuilderOptions = {}
  ): Promise<StateGraph<TState>> {
    this.logger.debug(`Building workflow graph from decorators: ${workflowClass.name}`);

    // Extract workflow definition from decorator metadata
    const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // Validate the definition
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // Log summary for debugging
    const summary = this.metadataProcessor.getWorkflowSummary(definition);
    this.logger.debug(summary);

    // Build the graph using the existing buildFromDefinition method
    return await this.buildFromDefinition(definition, options);
  }

  /**
   * Build from functional-api decorator definition
   */
  async buildFromDecoratorDefinition<TState extends WorkflowState = WorkflowState>(
    definition: DecoratorDefinition<TState>,
    instance: object,
    options: GraphBuilderOptions = {}
  ): Promise<StateGraph<TState>> {
    if (!this.decoratorTranslation) {
      throw new Error(
        'DecoratorTranslationService not available. Ensure workflow-engine module is properly configured.'
      );
    }

    this.logger.debug(`Building graph from functional-api decorator definition`);
    
    // Translate the decorator definition to workflow-engine format
    const translationResult = await this.decoratorTranslation.translateDecoratorDefinition(
      definition,
      instance,
      options.bridgeConfig
    );
    
    // Validate the translation
    const validation = this.decoratorTranslation.validateTranslation(translationResult);
    if (!validation.valid) {
      this.logger.error('Translation validation failed:', validation.errors);
      throw new Error(`Invalid decorator translation: ${validation.errors.join(', ')}`);
    }
    
    // Optimize the translation
    const optimizedTranslation = this.decoratorTranslation.optimizeTranslation(translationResult);
    
    // Create workflow definition from translation
    const workflowDef = this.decoratorTranslation.createWorkflowDefinition(
      optimizedTranslation,
      this.getDefinitionName(definition),
      `Workflow translated from ${optimizedTranslation.metadata.source} decorators`
    );
    
    // Build the graph using the translated definition
    return await this.buildFromDefinition<TState>(workflowDef, options);
  }

  /**
   * Build with streaming configuration for multi-agent
   */
  async buildWithStreamingConfig<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>,
    streamingOptions: {
      tokenStreaming?: boolean;
      progressStreaming?: boolean;
      eventStreaming?: boolean;
      multiAgentMode?: boolean;
      streamCallback?: (event: any) => void;
    },
    options: GraphBuilderOptions = {}
  ): Promise<StateGraph<TState>> {
    this.logger.debug(`Building workflow graph with streaming config: ${definition.name}`);
    
    // Enhance options with streaming configuration
    const enhancedOptions: GraphBuilderOptions = {
      ...options,
      // Note: streamingConfig is attached to the compiled graph, not to channels
      // channels are for StateGraph configuration, not streaming options
      channels: options.channels,
    };
    
    // Build the graph with enhanced options
    const graph = await this.buildFromDefinition(definition, enhancedOptions);
    
    // Attach streaming metadata to the graph for runtime use
    (graph as any).__streamingMetadata = {
      streamingEnabled: true,
      streamingOptions,
      multiAgentMode: streamingOptions.multiAgentMode || false,
    };
    
    return graph;
  }

  /**
   * Create a new workflow graph
   */
  createGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    options: GraphBuilderOptions = {}
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation || WorkflowStateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);
    this.graphs.set(name, graph);
    return graph;
  }

  /**
   * Add a node to the graph (delegates to WorkflowExecutionService)
   */
  addNode<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    node: WorkflowNode<TState>,
    options: GraphBuilderOptions = {}
  ): void {
    const wrappedHandler = this.workflowExecution.wrapNodeHandler(node, options);
    this.workflowExecution.safeAddNode(graph, node.id, wrappedHandler);
  }

  /**
   * Add an edge to the graph
   */
  addEdge<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    edge: WorkflowEdge<TState>
  ): void {
    if (typeof edge.to === 'string') {
      // Simple edge
      graph.addEdge(edge.from as any, edge.to as any);
    } else {
      // Conditional edge
      const routing = edge.to;
      graph.addConditionalEdges(
        edge.from as any,
        routing.condition as any,
        routing.routes as any
      );
    }
  }

  /**
   * Add a conditional edge with multiple routes
   */
  addConditionalEdge<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    from: string,
    condition: EdgeCondition<TState>,
    routes: Record<string, string>,
    defaultRoute?: string
  ): void {
    const enhancedCondition = (state: TState) => {
      const result = condition(state);
      if (result === null && defaultRoute) {
        return defaultRoute;
      }
      return result;
    };

    graph.addConditionalEdges(
      from as any,
      enhancedCondition as any,
      routes as any
    );
  }

  /**
   * Compile the graph with options
   */
  async compileGraph<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    options: GraphBuilderOptions = {}
  ): Promise<any> {
    const startTime = performance.now();

    // Get optimized compile options from learning service
    const optimizedCompileOptions = await this.graphOptimization.getOptimizedCompileOptions(options);

    const compileOptions: any = { ...optimizedCompileOptions };

    if (options.checkpointer) {
      compileOptions.checkpointer = options.checkpointer;
    }

    if (options.interrupt?.before) {
      compileOptions.interruptBefore = options.interrupt.before;
    }

    if (options.interrupt?.after) {
      compileOptions.interruptAfter = options.interrupt.after;
    }

    const compiledGraph = graph.compile(compileOptions);
    const compileTime = performance.now() - startTime;

    this.logger.debug(`Graph compiled successfully (${compileTime.toFixed(2)}ms)`);
    return compiledGraph;
  }

  /**
   * Configure interrupt points for a graph (delegates to WorkflowExecutionService)
   */
  configureInterrupts<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    interrupt: { before?: string[]; after?: string[] }
  ): void {
    this.workflowExecution.configureInterrupts(graph, interrupt);
  }

  /**
   * Delegate pattern creation to GraphPatternsService
   */
  
  buildWithHITL<TState extends WorkflowState = WorkflowState>(
    name: string,
    options: any
  ): StateGraph<TState> {
    return this.graphPatterns.buildWithHITL(name, options);
  }

  buildSupervisorGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    supervisor: NodeHandler<TState>,
    workers: Record<string, NodeHandler<TState>>,
    options?: any
  ): StateGraph<TState> {
    return this.graphPatterns.buildSupervisorGraph(name, supervisor, workers, options);
  }

  buildPipelineGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    stages: any[],
    options?: any
  ): StateGraph<TState> {
    return this.graphPatterns.buildPipelineGraph(name, stages, options);
  }

  /**
   * Get a stored graph
   */
  getGraph(name: string): StateGraph<any> | undefined {
    return this.graphs.get(name);
  }

  /**
   * Clear all stored graphs
   */
  clearGraphs(): void {
    this.graphs.clear();
  }

  // Private helper methods

  private getDefinitionName(definition: any): string {
    if (typeof definition === 'object') {
      if ('name' in definition) {
        return definition.name;
      }
      if ('className' in definition) {
        return definition.className;
      }
    }
    return 'unknown_definition';
  }
}