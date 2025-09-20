import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { StateGraph, StateGraphArgs, END } from '@langchain/langgraph';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import type {
  WorkflowState,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
  Command,
} from '../interfaces';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import { WorkflowCommandType } from '../constants';
import {
  WorkflowStateAnnotation,
  // createCustomStateAnnotation, // Currently unused
} from '@hive-academy/langgraph-core';
import { MetadataProcessorService } from './metadata-processor.service';

export interface GraphBuilderOptions {
  /**
   * Checkpoint saver for the workflow
   */
  checkpointer?: BaseCheckpointSaver;

  /**
   * Interrupt configuration
   */
  interrupt?: {
    before?: string[];
    after?: string[];
  };

  /**
   * Enable debugging
   */
  debug?: boolean;

  /**
   * Custom state channels
   */
  channels?: StateGraphArgs<any>['channels'];

  /**
   * Use custom state annotation
   */
  stateAnnotation?: any;
}

export type NodeHandler<TState = WorkflowState> = (
  state: TState
) => Promise<Partial<TState> | Command<TState>>;

export type EdgeCondition<TState = WorkflowState> = (
  state: TState
) => string | null;

@Injectable()
export class WorkflowGraphBuilderService {
  private readonly logger = new Logger(WorkflowGraphBuilderService.name);
  private readonly graphs = new Map<string, StateGraph<any>>();

  constructor(
    private readonly metadataProcessor: MetadataProcessorService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Helper to safely add a node to the graph without triggering TypeScript's excessive stack depth
   */
  private safeAddNode<TState>(
    graph: StateGraph<TState>,
    nodeId: string,
    handler: (state: TState) => any
  ): void {
    // Use a type assertion function to avoid deep type comparison
    const nodeAction = (() => handler) as any;
    (graph as any).addNode(nodeId, nodeAction());
  }

  /**
   * Build a workflow graph from a definition - Enhanced with 2025 Memory Learning
   */
  async buildFromDefinition<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>,
    options: GraphBuilderOptions = {}
  ): Promise<StateGraph<TState>> {
    const startTime = performance.now();
    this.logger.debug(`Building workflow graph: ${definition.name}`);

    // 🧠 MEMORY INTELLIGENCE: Apply learned optimization patterns
    const optimizedOptions = await this.enhanceWithOptimizationPatterns(
      definition,
      options
    );

    // Create state graph with appropriate annotation
    const stateAnnotation =
      optimizedOptions.stateAnnotation ||
      definition.channels ||
      WorkflowStateAnnotation;

    const graph = new StateGraph<TState>(stateAnnotation);

    // 🧠 MEMORY INTELLIGENCE: Track graph complexity for learning
    const graphComplexity = this.analyzeGraphComplexity(definition);

    // Add nodes with performance tracking
    for (const node of definition.nodes) {
      const nodeStartTime = performance.now();
      this.addNode(graph, node, optimizedOptions);
      const nodeTime = performance.now() - nodeStartTime;

      // Store node performance data
      await this.storeNodePerformanceData(
        definition.name,
        node,
        nodeTime,
        graphComplexity
      );
    }

    // Add edges with routing intelligence
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

    // 🧠 MEMORY LEARNING: Store compilation performance and patterns
    await this.storeGraphCompilationData(
      definition,
      buildTime,
      graphComplexity,
      optimizedOptions
    );

    this.logger.debug(
      `Workflow graph built successfully: ${
        definition.name
      } (${buildTime.toFixed(2)}ms)`
    );
    return graph;
  }

  /**
   * Build a workflow graph from decorator metadata - Enhanced with 2025 Memory Learning
   */
  async buildFromDecorators<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    options: GraphBuilderOptions = {}
  ): Promise<StateGraph<TState>> {
    this.logger.debug(
      `Building workflow graph from decorators: ${workflowClass.name}`
    );

    // Extract workflow definition from decorator metadata
    const definition =
      this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // Validate the definition
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // Log summary for debugging
    const summary = this.metadataProcessor.getWorkflowSummary(definition);
    this.logger.debug(summary);

    // 🧠 MEMORY LEARNING: Store decorator pattern usage for optimization learning
    await this.storeDecoratorPatternData(workflowClass, definition);

    // Build the graph using the existing buildFromDefinition method
    return await this.buildFromDefinition(definition, options);
  }

  /**
   * Create a new workflow graph with default configuration
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
   * Add a node to the graph with command support
   */
  addNode<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    node: WorkflowNode<TState>,
    options: GraphBuilderOptions = {}
  ): void {
    const wrappedHandler = this.wrapNodeHandler(node, options);
    this.safeAddNode(graph, node.id, wrappedHandler);
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
   * Add a tool node with automatic routing
   */
  addToolNode<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    nodeId: string,
    tools: any[],
    returnTo?: string
  ): void {
    const toolNode = new ToolNode(tools);
    this.safeAddNode(graph, nodeId, async (state: TState) =>
      toolNode.invoke(state)
    );

    // Add routing back to the calling node
    if (returnTo) {
      graph.addEdge(nodeId as any, returnTo as any);
    }
  }

  /**
   * Add a subgraph as a node
   */
  addSubgraph<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    nodeId: string,
    subgraph: StateGraph<any> | (() => StateGraph<any>),
    transforms?: {
      input?: (state: TState) => any;
      output?: (state: any) => Partial<TState>;
    }
  ): void {
    const subgraphHandler = async (state: TState) => {
      const sg = typeof subgraph === 'function' ? subgraph() : subgraph;
      const compiled = sg.compile();

      // Transform input if needed
      const input = transforms?.input ? transforms.input(state) : state;

      // Execute subgraph
      const result = await compiled.invoke(input);

      // Transform output if needed
      return transforms?.output ? transforms.output(result) : result;
    };

    this.safeAddNode(graph, nodeId, subgraphHandler);
  }

  /**
   * Build a graph with human-in-the-loop support
   */
  buildWithHITL<TState extends WorkflowState = WorkflowState>(
    name: string,
    options: GraphBuilderOptions & {
      approvalNode: NodeHandler<TState>;
      approvalRouting: EdgeCondition<TState>;
    }
  ): StateGraph<TState> {
    const graph = this.createGraph<TState>(name, options);

    // Add human approval node
    this.safeAddNode(graph, 'human_approval', options.approvalNode);

    // Add conditional routing for approval
    graph.addConditionalEdges(
      'human_approval' as any,
      options.approvalRouting as any,
      {
        approved: 'continue',
        rejected: 'end',
        retry: 'human_approval',
      } as any
    );

    return graph;
  }

  /**
   * Create a supervisor pattern graph
   */
  buildSupervisorGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    supervisor: NodeHandler<TState>,
    workers: Record<string, NodeHandler<TState>>,
    options: GraphBuilderOptions = {}
  ): StateGraph<TState> {
    const graph = this.createGraph<TState>(name, options);

    // Add supervisor node
    this.safeAddNode(graph, 'supervisor', supervisor);
    graph.setEntryPoint('supervisor' as any);

    // Add worker nodes
    for (const [workerId, worker] of Object.entries(workers)) {
      this.safeAddNode(graph, workerId, worker);
      // Workers report back to supervisor
      graph.addEdge(workerId as any, 'supervisor' as any);
    }

    // Supervisor routes to workers or ends
    graph.addConditionalEdges(
      'supervisor' as any,
      ((state: TState) => {
        // Check if a specific worker should be called
        const { nextWorker } = state as any;
        if (nextWorker && workers[nextWorker]) {
          return nextWorker;
        }
        // Otherwise end
        return END;
      }) as any,
      {
        ...Object.keys(workers).reduce<Record<string, string>>((acc, key) => {
          acc[key] = key;
          return acc;
        }, {}),
        [END]: END,
      } as any
    );

    return graph;
  }

  /**
   * Create a pipeline pattern graph
   */
  buildPipelineGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    stages: Array<{
      id: string;
      handler: NodeHandler<TState>;
      condition?: EdgeCondition<TState>;
    }>,
    options: GraphBuilderOptions = {}
  ): StateGraph<TState> {
    const graph = this.createGraph<TState>(name, options);

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const nextStage = stages[i + 1];

      // Add stage node
      this.safeAddNode(graph, stage.id, stage.handler);

      // Add edge to next stage or end
      if (stage.condition) {
        // Conditional routing
        graph.addConditionalEdges(
          stage.id as any,
          stage.condition as any,
          {
            continue: nextStage ? nextStage.id : END,
            skip: stages[i + 2]?.id || END,
            end: END,
          } as any
        );
      } else if (nextStage) {
        // Simple edge to next stage
        graph.addEdge(stage.id as any, nextStage.id as any);
      } else {
        // Last stage goes to END
        graph.addEdge(stage.id as any, END as any);
      }
    }

    // Set entry point to first stage
    if (stages.length > 0) {
      graph.setEntryPoint(stages[0].id as any);
    }

    return graph;
  }

  /**
   * Wrap a node handler to support command pattern
   */
  private wrapNodeHandler<TState extends WorkflowState = WorkflowState>(
    node: WorkflowNode<TState>,
    options: GraphBuilderOptions = {}
  ): (state: TState) => Promise<any> {
    return async (state: TState): Promise<any> => {
      try {
        // Add node tracking
        const updatedState: Partial<TState> = {
          currentNode: node.id,
          completedNodes: [...(state.completedNodes || []), node.id],
        } as unknown as Partial<TState>;

        // Execute node handler
        const result = await this.executeWithTimeout(
          node.handler(state),
          node.config?.timeout
        );

        // Handle command pattern
        if (this.isCommand(result)) {
          return this.processCommand(result as Command<TState>, state, node);
        }

        // Merge state updates
        return {
          ...updatedState,
          ...result,
        };
      } catch (error) {
        return this.handleNodeError(error, state, node);
      }
    };
  }

  /**
   * Check if result is a command
   */
  private isCommand<TState>(result: any): boolean {
    return (
      result &&
      typeof result === 'object' &&
      'type' in result &&
      Object.values(WorkflowCommandType).includes(result.type)
    );
  }

  /**
   * Process a command returned from a node
   */
  private processCommand<TState extends WorkflowState = WorkflowState>(
    command: Command<TState>,
    state: TState,
    node: WorkflowNode<TState>
  ): Partial<TState> {
    this.logger.debug(`Processing command from node ${node.id}:`, command);

    switch (command.type) {
      case WorkflowCommandType.GOTO:
        return {
          ...command.update,
          currentNode: command.goto,
          metadata: {
            ...state.metadata,
            lastCommand: command,
          },
        } as unknown as Partial<TState>;

      case WorkflowCommandType.UPDATE:
        return {
          ...command.update,
          metadata: {
            ...state.metadata,
            lastCommand: command,
          },
        } as unknown as Partial<TState>;

      case WorkflowCommandType.END:
        return {
          ...command.update,
          status: 'completed',
          metadata: {
            ...state.metadata,
            lastCommand: command,
          },
        } as unknown as Partial<TState>;

      case WorkflowCommandType.ERROR:
        return {
          ...command.update,
          status: 'failed',
          error: command.error,
          metadata: {
            ...state.metadata,
            lastCommand: command,
          },
        } as unknown as Partial<TState>;

      case WorkflowCommandType.RETRY:
        return {
          ...command.update,
          currentNode: command.retry?.node || node.id,
          metadata: {
            ...state.metadata,
            lastCommand: command,
            retryCount: ((state.metadata as any)?.retryCount || 0) + 1,
          },
        } as unknown as Partial<TState>;

      case WorkflowCommandType.SKIP:
        return {
          ...command.update,
          metadata: {
            ...state.metadata,
            lastCommand: command,
            skipped: true,
          },
        } as unknown as Partial<TState>;

      case WorkflowCommandType.STOP:
        return {
          ...command.update,
          status: 'stopped',
          metadata: {
            ...state.metadata,
            lastCommand: command,
          },
        } as unknown as Partial<TState>;

      case undefined:
      default:
        return command?.update || {};
    }
  }

  /**
   * Handle node execution errors
   */
  private handleNodeError<TState extends WorkflowState = WorkflowState>(
    error: any,
    state: TState,
    node: WorkflowNode<TState>
  ): Partial<TState> {
    this.logger.error(`Node ${node.id} failed:`, error);

    const workflowError = {
      id: `error-${Date.now()}`,
      nodeId: node.id,
      type: 'execution' as const,
      message: error.message || 'Unknown error',
      stackTrace: error.stack,
      context: {
        state: state.currentNode,
        executionId: state.executionId,
      },
      isRecoverable: Boolean(node.config?.retry?.maxAttempts),
      suggestedRecovery: 'Retry the node or check error details',
      timestamp: new Date(),
    };

    // Check if we should retry
    const retryCount = (state.metadata as any)?.retryCount || 0;
    const maxRetries = node.config?.retry?.maxAttempts || 0;

    if (retryCount < maxRetries) {
      this.logger.debug(
        `Retrying node ${node.id} (attempt ${retryCount + 1}/${maxRetries})`
      );
      return {
        currentNode: node.id,
        metadata: {
          ...state.metadata,
          retryCount: retryCount + 1,
          lastError: workflowError,
        },
      } as unknown as Partial<TState>;
    }

    return {
      status: 'failed',
      error: workflowError,
      metadata: {
        ...state.metadata,
        failedNode: node.id,
      },
    } as unknown as Partial<TState>;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout?: number
  ): Promise<T> {
    if (!timeout) {
      return promise;
    }

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          reject(new Error('Execution timeout'));
        }, timeout)
      ),
    ]);
  }

  /**
   * Compile the graph with options - Enhanced with 2025 Memory Learning
   */
  async compileGraph<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    options: GraphBuilderOptions = {}
  ): Promise<any> {
    const startTime = performance.now();

    // 🧠 MEMORY INTELLIGENCE: Apply learned compilation optimizations
    const optimizedCompileOptions = await this.getOptimizedCompileOptions(
      options
    );

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

    // Execute compilation with performance tracking
    const compiledGraph = graph.compile(compileOptions);
    const compileTime = performance.now() - startTime;

    // 🧠 MEMORY LEARNING: Store compilation performance data
    await this.storeCompilationPerformance(compileOptions, compileTime);

    this.logger.debug(
      `Graph compiled successfully (${compileTime.toFixed(2)}ms)`
    );
    return compiledGraph;
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

  /**
   * Configure interrupt points
   */
  private configureInterrupts<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    interrupt: { before?: string[]; after?: string[] }
  ): void {
    // This will be handled during compilation with interruptBefore/interruptAfter options
    // The actual implementation is done in the compileGraph method
    this.logger.debug(
      'Interrupt configuration will be applied during compilation',
      interrupt
    );
  }

  // ============================================================================
  // MEMORY LEARNING INTEGRATION - 2025 LangGraph Graph Intelligence Patterns
  // ============================================================================

  /**
   * Enhance graph building options with learned optimization patterns
   *
   * This follows the 2025 LangGraph pattern for graph compilation intelligence,
   * where previous compilation performance and patterns inform future optimizations.
   */
  private async enhanceWithOptimizationPatterns<
    TState extends WorkflowState = WorkflowState
  >(
    definition: WorkflowDefinition<TState>,
    options: GraphBuilderOptions
  ): Promise<GraphBuilderOptions> {
    if (!this.memoryAdapter) {
      // Graceful degradation - optimization learning is optional
      return options;
    }

    try {
      const namespace = `graphs.compilation.optimizations`;

      // Retrieve learned optimization patterns for this graph type
      const optimizationData = await this.memoryAdapter.search({
        query: 'graph optimization patterns',
        namespace: [namespace],
        limit: 10,
      });

      if (!optimizationData || optimizationData.length === 0) {
        return options;
      }

      // Apply learned optimizations
      const enhancedOptions = { ...options };

      for (const memory of optimizationData) {
        try {
          const optimization = JSON.parse(memory.content);

          // Apply interrupt optimizations based on learned patterns
          if (optimization.optimalInterrupts && !enhancedOptions.interrupt) {
            enhancedOptions.interrupt = optimization.optimalInterrupts;
          }

          // Apply debug mode based on success patterns
          if (
            optimization.debugRecommendation !== undefined &&
            enhancedOptions.debug === undefined
          ) {
            enhancedOptions.debug = optimization.debugRecommendation;
          }

          // Apply channel optimizations
          if (optimization.channelOptimizations && !enhancedOptions.channels) {
            enhancedOptions.channels = optimization.channelOptimizations;
          }
        } catch (parseError) {
          this.logger.debug('Failed to parse optimization memory:', parseError);
        }
      }

      this.logger.debug(
        `Applied ${optimizationData.length} optimization patterns to graph ${definition.name}`
      );
      return enhancedOptions;
    } catch (error) {
      this.logger.error('Failed to enhance with optimization patterns:', error);
      return options;
    }
  }

  /**
   * Analyze graph complexity for performance learning
   */
  private analyzeGraphComplexity<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): {
    nodeCount: number;
    edgeCount: number;
    conditionalEdgeCount: number;
    averageNodeComplexity: number;
    hasToolNodes: boolean;
    hasSubgraphs: boolean;
    maxDepth: number;
    complexity: 'low' | 'medium' | 'high' | 'very_high';
  } {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const conditionalEdgeCount = definition.edges.filter(
      (edge) => typeof edge.to !== 'string'
    ).length;

    // Estimate node complexity based on configuration
    const nodeComplexities = definition.nodes.map((node) => {
      let complexity = 1;
      if (node.config?.timeout) complexity += 1;
      if (node.config?.retry) complexity += 1;
      if (node.config?.tools && node.config.tools.length > 0) complexity += 2;
      return complexity;
    });

    const averageNodeComplexity =
      nodeComplexities.reduce((a, b) => a + b, 0) / nodeCount || 0;

    // Detect special node types (inferred from node ID and tools configuration)
    const hasToolNodes = definition.nodes.some(
      (node) =>
        node.id.toLowerCase().includes('tool') ||
        (node.config?.tools && node.config.tools.length > 0)
    );

    const hasSubgraphs = definition.nodes.some(
      (node) =>
        node.id.toLowerCase().includes('subgraph') ||
        node.id.toLowerCase().includes('workflow')
    );

    // Calculate max depth (simplified - would need proper graph traversal)
    const maxDepth = Math.max(nodeCount, 1);

    // Overall complexity assessment
    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'low';
    const complexityScore =
      nodeCount +
      edgeCount * 0.5 +
      conditionalEdgeCount * 2 +
      averageNodeComplexity * nodeCount;

    if (complexityScore > 50) complexity = 'very_high';
    else if (complexityScore > 25) complexity = 'high';
    else if (complexityScore > 10) complexity = 'medium';

    return {
      nodeCount,
      edgeCount,
      conditionalEdgeCount,
      averageNodeComplexity,
      hasToolNodes,
      hasSubgraphs,
      maxDepth,
      complexity,
    };
  }

  /**
   * Store node performance data for learning
   */
  private async storeNodePerformanceData<
    TState extends WorkflowState = WorkflowState
  >(
    graphName: string,
    node: WorkflowNode<TState>,
    executionTime: number,
    graphComplexity: any
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const namespace = `graphs.compilation.nodes.${node.id}`;

      const nodePerformanceData = {
        graphName,
        nodeId: node.id,
        executionTime,
        timestamp: new Date().toISOString(),

        // Node configuration context
        nodeConfig: {
          hasTimeout: !!node.config?.timeout,
          hasRetry: !!node.config?.retry,
          hasTools: !!(node.config?.tools && node.config.tools.length > 0),
          timeoutValue: node.config?.timeout,
          retryAttempts: node.config?.retry?.maxAttempts,
          toolsCount: node.config?.tools?.length || 0,
        },

        // Graph context for performance correlation
        graphContext: {
          complexity: graphComplexity.complexity,
          nodeCount: graphComplexity.nodeCount,
          totalEdges: graphComplexity.edgeCount,
          hasToolNodes: graphComplexity.hasToolNodes,
        },

        // Performance metrics
        performance: {
          isSlowNode: executionTime > 10, // > 10ms considered slow for node setup
          relativeSpeed: this.categorizeNodeSpeed(executionTime),
          optimizationNeeded: executionTime > 50, // > 50ms needs optimization
        },
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(nodePerformanceData),
        {
          type: 'fact',
          source: 'graph_node_performance',
          agentId: 'workflow_graph_builder',
          importance: executionTime > 20 ? 0.8 : 0.6, // Slow nodes are more important to remember
          persistent: true,
          tags: JSON.stringify([
            'node_performance',
            'graph_optimization',
            node.id,
            graphComplexity.complexity,
            this.categorizeNodeSpeed(executionTime),
          ]),
        }
      );
    } catch (error) {
      this.logger.error('Failed to store node performance data:', error);
    }
  }

  /**
   * Store graph compilation performance and patterns
   */
  private async storeGraphCompilationData<
    TState extends WorkflowState = WorkflowState
  >(
    definition: WorkflowDefinition<TState>,
    buildTime: number,
    graphComplexity: any,
    options: GraphBuilderOptions
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const namespace = `graphs.compilation.events.${definition.name}`;

      const compilationData = {
        graphName: definition.name,
        buildTime,
        timestamp: new Date().toISOString(),

        // Graph structure data
        structure: {
          nodeCount: graphComplexity.nodeCount,
          edgeCount: graphComplexity.edgeCount,
          conditionalEdges: graphComplexity.conditionalEdgeCount,
          complexity: graphComplexity.complexity,
          entryPoint: definition.entryPoint,
        },

        // Build configuration
        buildConfig: {
          hasCheckpointer: !!options.checkpointer,
          hasInterrupts: !!options.interrupt,
          interruptPoints: options.interrupt
            ? (options.interrupt.before?.length || 0) +
              (options.interrupt.after?.length || 0)
            : 0,
          debugMode: !!options.debug,
          hasCustomChannels: !!options.channels,
        },

        // Performance analysis
        performance: {
          buildTimeMs: buildTime,
          efficiency: this.categorizeGraphEfficiency(
            buildTime,
            graphComplexity
          ),
          needsOptimization: buildTime > 100, // > 100ms compilation time
          scalabilityScore: this.calculateScalabilityScore(
            graphComplexity,
            buildTime
          ),
        },

        // Learning signals for future optimizations
        optimizationSignals: {
          slowCompilation: buildTime > 100,
          complexGraph:
            graphComplexity.complexity === 'high' ||
            graphComplexity.complexity === 'very_high',
          manyConditionalEdges: graphComplexity.conditionalEdgeCount > 5,
          largeNodeCount: graphComplexity.nodeCount > 20,
          suggestedOptimizations: this.generateOptimizationSuggestions(
            graphComplexity,
            buildTime,
            options
          ),
        },
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(compilationData),
        {
          type: 'fact',
          source: 'graph_compilation',
          agentId: 'workflow_graph_builder',
          importance: buildTime > 50 ? 0.9 : 0.7, // Slow compilations are more important
          persistent: true,
          tags: JSON.stringify([
            'graph_compilation',
            'performance_data',
            definition.name,
            graphComplexity.complexity,
            this.categorizeGraphEfficiency(buildTime, graphComplexity),
          ]),
        }
      );

      // Also store optimization patterns separately for future reuse
      await this.storeOptimizationPatterns(
        definition,
        graphComplexity,
        buildTime,
        options
      );
    } catch (error) {
      this.logger.error('Failed to store graph compilation data:', error);
    }
  }

  /**
   * Store compilation performance data for learning
   */
  private async storeCompilationPerformance(
    compileOptions: any,
    compileTime: number
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const namespace = `graphs.compilation.performance`;

      const performanceData = {
        compileTime,
        timestamp: new Date().toISOString(),

        // Compile configuration analysis
        configuration: {
          hasCheckpointer: !!compileOptions.checkpointer,
          hasInterruptBefore: !!compileOptions.interruptBefore,
          hasInterruptAfter: !!compileOptions.interruptAfter,
          interruptCount:
            (compileOptions.interruptBefore?.length || 0) +
            (compileOptions.interruptAfter?.length || 0),
        },

        // Performance metrics
        performance: {
          isSlowCompilation: compileTime > 50,
          efficiency: this.categorizeCompilationSpeed(compileTime),
          optimizationOpportunity: compileTime > 100,
        },

        // Optimization learning
        learningSignals: {
          checkpointerImpact: !!compileOptions.checkpointer,
          interruptImpact:
            compileOptions.interruptBefore || compileOptions.interruptAfter,
          baselinePerformance:
            !compileOptions.checkpointer &&
            !compileOptions.interruptBefore &&
            !compileOptions.interruptAfter,
        },
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(performanceData),
        {
          type: 'fact',
          source: 'compilation_performance',
          agentId: 'workflow_graph_builder',
          importance: compileTime > 30 ? 0.8 : 0.6,
          persistent: true,
          tags: JSON.stringify([
            'compilation_performance',
            'optimization_data',
            this.categorizeCompilationSpeed(compileTime),
          ]),
        }
      );
    } catch (error) {
      this.logger.error('Failed to store compilation performance:', error);
    }
  }

  /**
   * Get optimized compile options based on learned patterns
   */
  private async getOptimizedCompileOptions(
    baseOptions: GraphBuilderOptions
  ): Promise<Partial<any>> {
    if (!this.memoryAdapter) return {};

    try {
      const namespace = `graphs.compilation.performance`;

      const performanceData = await this.memoryAdapter.search({
        query: 'compilation performance optimization data',
        namespace: [namespace],
        limit: 20,
      });

      if (!performanceData || performanceData.length === 0) {
        return {};
      }

      // Analyze performance patterns to determine optimal settings
      const optimizations: any = {};

      let fastCompilations = 0;
      let slowCompilations = 0;
      let checkpointerBenefit = 0;
      let interruptBenefit = 0;

      for (const memory of performanceData) {
        try {
          const data = JSON.parse(memory.content);

          if (
            data.performance.efficiency === 'fast' ||
            data.performance.efficiency === 'very_fast'
          ) {
            fastCompilations++;

            // Learn from fast compilations
            if (data.configuration.hasCheckpointer) checkpointerBenefit++;
            if (
              data.configuration.hasInterruptBefore ||
              data.configuration.hasInterruptAfter
            )
              interruptBenefit++;
          } else {
            slowCompilations++;
          }
        } catch (parseError) {
          this.logger.debug(
            'Failed to parse compilation performance memory:',
            parseError
          );
        }
      }

      // Apply learned optimizations only if we have enough data
      if (performanceData.length >= 5) {
        const totalCompilations = fastCompilations + slowCompilations;

        // If checkpointer generally helps performance, suggest its use
        if (checkpointerBenefit / totalCompilations > 0.6) {
          optimizations.recommendCheckpointer = true;
        }

        // If interrupts don't significantly impact performance, they're safe to use
        if (interruptBenefit / totalCompilations > 0.4) {
          optimizations.interruptsSafe = true;
        }
      }

      this.logger.debug(
        'Applied compilation optimizations based on learned patterns',
        {
          dataPoints: performanceData.length,
          optimizations,
        }
      );

      return optimizations;
    } catch (error) {
      this.logger.error('Failed to get optimized compile options:', error);
      return {};
    }
  }

  /**
   * Store optimization patterns for future graph building
   */
  private async storeOptimizationPatterns<
    TState extends WorkflowState = WorkflowState
  >(
    definition: WorkflowDefinition<TState>,
    graphComplexity: any,
    buildTime: number,
    options: GraphBuilderOptions
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const namespace = `graphs.compilation.optimizations`;

      const optimizationPattern = {
        graphName: definition.name,
        graphType: this.classifyGraphType(definition),
        complexity: graphComplexity.complexity,
        buildTime,
        timestamp: new Date().toISOString(),

        // Configuration that worked well (or poorly)
        configuration: {
          debugMode: options.debug,
          hasInterrupts: !!options.interrupt,
          interruptConfig: options.interrupt,
          hasCustomChannels: !!options.channels,
          hasCheckpointer: !!options.checkpointer,
        },

        // Performance outcome
        outcome: {
          efficiency: this.categorizeGraphEfficiency(
            buildTime,
            graphComplexity
          ),
          successful: buildTime < 200, // Consider successful if < 200ms
          scalable: graphComplexity.nodeCount < 50 || buildTime < 500,
        },

        // Recommendations for similar graphs
        recommendations: {
          optimalInterrupts:
            this.generateInterruptRecommendations(graphComplexity),
          debugRecommendation: buildTime > 100 ? true : false, // Debug mode for slow graphs
          channelOptimizations:
            this.generateChannelOptimizations(graphComplexity),
        },
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(optimizationPattern),
        {
          type: 'preference', // Optimization patterns are preferences for future builds
          source: 'graph_optimization_pattern',
          agentId: 'workflow_graph_builder',
          importance: 0.8,
          persistent: true,
          tags: JSON.stringify([
            'graph_optimization',
            'performance_pattern',
            definition.name,
            graphComplexity.complexity,
            this.classifyGraphType(definition),
          ]),
        }
      );
    } catch (error) {
      this.logger.error('Failed to store optimization patterns:', error);
    }
  }

  // ============================================================================
  // ANALYSIS UTILITY METHODS
  // ============================================================================

  /**
   * Categorize node execution speed for learning
   */
  private categorizeNodeSpeed(executionTime: number): string {
    if (executionTime < 5) return 'very_fast';
    if (executionTime < 15) return 'fast';
    if (executionTime < 30) return 'moderate';
    if (executionTime < 60) return 'slow';
    return 'very_slow';
  }

  /**
   * Categorize graph compilation efficiency
   */
  private categorizeGraphEfficiency(
    buildTime: number,
    complexity: any
  ): string {
    const complexityMultiplier =
      complexity.nodeCount * 2 + complexity.edgeCount;
    const efficiencyRatio = buildTime / Math.max(complexityMultiplier, 1);

    if (efficiencyRatio < 2) return 'very_efficient';
    if (efficiencyRatio < 5) return 'efficient';
    if (efficiencyRatio < 10) return 'moderate';
    if (efficiencyRatio < 20) return 'inefficient';
    return 'very_inefficient';
  }

  /**
   * Categorize compilation speed
   */
  private categorizeCompilationSpeed(compileTime: number): string {
    if (compileTime < 10) return 'very_fast';
    if (compileTime < 25) return 'fast';
    if (compileTime < 50) return 'moderate';
    if (compileTime < 100) return 'slow';
    return 'very_slow';
  }

  /**
   * Calculate scalability score for graph
   */
  private calculateScalabilityScore(
    complexity: any,
    buildTime: number
  ): number {
    const baseScore = 100;
    const complexityPenalty = complexity.nodeCount * 2 + complexity.edgeCount;
    const timePenalty = buildTime / 10;

    return Math.max(
      0,
      Math.min(100, baseScore - complexityPenalty - timePenalty)
    );
  }

  /**
   * Generate optimization suggestions based on analysis
   */
  private generateOptimizationSuggestions(
    complexity: any,
    buildTime: number,
    options: GraphBuilderOptions
  ): string[] {
    const suggestions: string[] = [];

    if (buildTime > 100) {
      suggestions.push('Consider enabling debug mode for performance analysis');
    }

    if (complexity.conditionalEdgeCount > 5) {
      suggestions.push(
        'High conditional edge count - consider simplifying routing logic'
      );
    }

    if (complexity.nodeCount > 20 && !options.interrupt) {
      suggestions.push(
        'Large graph detected - consider adding interrupt points for better control'
      );
    }

    if (complexity.complexity === 'very_high' && !options.checkpointer) {
      suggestions.push(
        'Complex graph - checkpointing recommended for reliability'
      );
    }

    return suggestions;
  }

  /**
   * Classify graph type for pattern recognition
   */
  private classifyGraphType<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): string {
    const nodeIds = definition.nodes.map((n) => n.id.toLowerCase());

    if (nodeIds.some((id) => id.includes('supervisor'))) return 'supervisor';
    if (nodeIds.some((id) => id.includes('pipeline'))) return 'pipeline';
    if (nodeIds.some((id) => id.includes('approval') || id.includes('human')))
      return 'hitl';
    if (nodeIds.some((id) => id.includes('tool'))) return 'tool_calling';
    if (definition.edges.filter((e) => typeof e.to !== 'string').length > 3)
      return 'conditional_heavy';

    return 'standard';
  }

  /**
   * Generate interrupt recommendations based on complexity
   */
  private generateInterruptRecommendations(
    complexity: any
  ): { before?: string[]; after?: string[] } | null {
    if (complexity.nodeCount < 5) return null;

    const recommendations: { before?: string[]; after?: string[] } = {};

    if (complexity.hasToolNodes) {
      recommendations.before = ['tool_execution'];
    }

    if (
      complexity.complexity === 'high' ||
      complexity.complexity === 'very_high'
    ) {
      recommendations.after = ['validation', 'checkpoint'];
    }

    return Object.keys(recommendations).length > 0 ? recommendations : null;
  }

  /**
   * Generate channel optimizations
   */
  private generateChannelOptimizations(complexity: any): any | null {
    if (complexity.complexity === 'low') return null;

    // For complex graphs, suggest optimized channel configuration
    return {
      optimizedForComplexity: true,
      bufferSize: complexity.nodeCount > 20 ? 'large' : 'standard',
      parallelization: complexity.nodeCount > 10,
    };
  }

  /**
   * Store decorator pattern usage data for optimization learning
   */
  private async storeDecoratorPatternData<
    TState extends WorkflowState = WorkflowState
  >(workflowClass: any, definition: WorkflowDefinition<TState>): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const namespace = `graphs.compilation.decorator_patterns`;

      const decoratorData = {
        className: workflowClass.name,
        graphName: definition.name,
        timestamp: new Date().toISOString(),

        // Decorator pattern analysis
        decoratorMetadata: {
          nodeCount: definition.nodes.length,
          edgeCount: definition.edges.length,
          hasEntryPoint: !!definition.entryPoint,
          hasChannels: !!definition.channels,
          complexity: this.analyzeGraphComplexity(definition).complexity,
        },

        // Class metadata analysis
        classMetadata: {
          hasConstructor: !!workflowClass.constructor,
          methodCount: Object.getOwnPropertyNames(workflowClass.prototype)
            .length,
          className: workflowClass.name,
        },

        // Pattern recognition for optimization
        patterns: {
          decoratorComplexity: this.assessDecoratorComplexity(definition),
          usagePattern: this.identifyDecoratorUsagePattern(definition),
          optimizationPotential:
            this.assessDecoratorOptimizationPotential(definition),
        },
      };

      await this.memoryAdapter.store(namespace, JSON.stringify(decoratorData), {
        type: 'fact',
        source: 'decorator_pattern_analysis',
        agentId: 'workflow_graph_builder',
        importance: 0.7,
        persistent: true,
        tags: JSON.stringify([
          'decorator_pattern',
          'graph_metadata',
          workflowClass.name,
          definition.name,
          this.analyzeGraphComplexity(definition).complexity,
        ]),
      });
    } catch (error) {
      this.logger.error('Failed to store decorator pattern data:', error);
    }
  }

  /**
   * Assess decorator complexity for learning
   */
  private assessDecoratorComplexity<
    TState extends WorkflowState = WorkflowState
  >(definition: WorkflowDefinition<TState>): 'simple' | 'moderate' | 'complex' {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const conditionalEdges = definition.edges.filter(
      (e) => typeof e.to !== 'string'
    ).length;

    const complexityScore = nodeCount + edgeCount * 0.5 + conditionalEdges * 2;

    if (complexityScore < 5) return 'simple';
    if (complexityScore < 15) return 'moderate';
    return 'complex';
  }

  /**
   * Identify decorator usage patterns
   */
  private identifyDecoratorUsagePattern<
    TState extends WorkflowState = WorkflowState
  >(definition: WorkflowDefinition<TState>): string {
    const nodeIds = definition.nodes.map((n) => n.id.toLowerCase());

    if (nodeIds.some((id) => id.includes('start') && id.includes('end')))
      return 'linear';
    if (
      definition.edges.filter((e) => typeof e.to !== 'string').length >
      nodeIds.length * 0.5
    )
      return 'branching';
    if (nodeIds.some((id) => id.includes('parallel'))) return 'parallel';
    if (nodeIds.some((id) => id.includes('loop') || id.includes('retry')))
      return 'iterative';

    return 'standard';
  }

  /**
   * Assess optimization potential for decorator patterns
   */
  private assessDecoratorOptimizationPotential<
    TState extends WorkflowState = WorkflowState
  >(definition: WorkflowDefinition<TState>): 'low' | 'medium' | 'high' {
    const complexity = this.analyzeGraphComplexity(definition);

    if (complexity.complexity === 'very_high' || complexity.nodeCount > 20)
      return 'high';
    if (complexity.complexity === 'high' || complexity.conditionalEdgeCount > 3)
      return 'medium';
    return 'low';
  }
}
