import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, START, END } from '@langchain/langgraph';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { WorkflowState } from '../interfaces/workflow.interface';
import { CompilationCacheService } from './compilation-cache.service';
import { WorkflowStateAnnotation } from './workflow-state-annotation';

export interface SubgraphOptions {
  /**
   * Enable caching for compiled subgraph
   */
  cache?: boolean;

  /**
   * Cache key for the subgraph
   */
  cacheKey?: string;

  /**
   * Transform functions for input/output
   */
  transforms?: {
    input?: (state: any) => any;
    output?: (state: any) => any;
  };

  /**
   * Streaming configuration
   */
  streaming?: {
    /**
     * Pass-through streaming from subgraph
     */
    passthrough?: boolean;

    /**
     * Prefix for stream events
     */
    prefix?: string;
  };

  /**
   * Checkpointing configuration
   */
  checkpoint?: {
    /**
     * Enable checkpointing
     */
    enabled?: boolean;

    /**
     * Checkpoint namespace
     */
    namespace?: string;
  };

  /**
   * Interrupt configuration
   */
  interrupt?: {
    /**
     * Nodes to interrupt before
     */
    before?: string[];

    /**
     * Nodes to interrupt after
     */
    after?: string[];
  };
}

export interface SubgraphContext {
  /**
   * Parent workflow ID
   */
  parentWorkflow: string;

  /**
   * Parent execution ID
   */
  parentExecutionId: string;

  /**
   * Subgraph entry time
   */
  entryTime: Date;

  /**
   * Source node that invoked the subgraph
   */
  sourceNode?: string;

  /**
   * Subgraph metadata
   */
  metadata?: Record<string, any>;
}

export interface CompiledSubgraph<TState = WorkflowState> {
  /**
   * Invoke the subgraph
   */
  invoke: (state: TState, config?: any) => Promise<TState>;

  /**
   * Stream the subgraph execution
   */
  stream?: (state: TState, config?: any) => AsyncIterableIterator<TState>;

  /**
   * Get subgraph metadata
   */
  getMetadata: () => SubgraphMetadata;
}

export interface SubgraphMetadata {
  /**
   * Subgraph ID
   */
  id: string;

  /**
   * Subgraph name
   */
  name: string;

  /**
   * Compilation timestamp
   */
  compiledAt: Date;

  /**
   * Cache key if cached
   */
  cacheKey?: string;

  /**
   * Options used for compilation
   */
  options: SubgraphOptions;
}

@Injectable()
export class SubgraphManagerService {
  private readonly logger = new Logger(SubgraphManagerService.name);
  private readonly subgraphs = new Map<string, CompiledSubgraph>();
  private readonly activeSubgraphs = new Map<string, SubgraphContext>();

  constructor(private readonly cacheService: CompilationCacheService) {}

  /**
   * Compile a subgraph with caching support
   */
  async compileSubgraph<TState extends WorkflowState = WorkflowState>(
    id: string,
    graph: StateGraph<TState>,
    options: SubgraphOptions = {}
  ): Promise<CompiledSubgraph<TState>> {
    const cacheKey = options.cacheKey || this.generateCacheKey(id, options);

    // Check cache if enabled
    if (options.cache) {
      const cached = await this.cacheService.get<CompiledSubgraph<TState>>(
        cacheKey
      );
      if (cached) {
        this.logger.debug(`Using cached subgraph: ${id}`);
        return cached;
      }
    }

    this.logger.debug(`Compiling subgraph: ${id}`);

    // Compile the graph
    const checkpointer = options.checkpoint?.enabled
      ? await this.getCheckpointer(options.checkpoint)
      : undefined;
    const compiledGraph = graph.compile({
      checkpointer: checkpointer as any, // Type cast to handle version compatibility
      interruptBefore: options.interrupt?.before as any,
      interruptAfter: options.interrupt?.after as any,
    });

    // Create compiled subgraph wrapper
    const compiledSubgraph: CompiledSubgraph<TState> = {
      invoke: async (state: TState, config?: any) => {
        return this.invokeSubgraph(id, compiledGraph, state, options, config);
      },
      stream: options.streaming?.passthrough
        ? ((async (state: TState, config?: any) => {
            return this.streamSubgraph(
              id,
              compiledGraph,
              state,
              options,
              config
            );
          }) as any)
        : undefined,
      getMetadata: () => ({
        id,
        name: id,
        compiledAt: new Date(),
        cacheKey: options.cache ? cacheKey : undefined,
        options,
      }),
    };

    // Cache if enabled
    if (options.cache) {
      await this.cacheService.set(cacheKey, compiledSubgraph);
    }

    // Store in memory
    this.subgraphs.set(id, compiledSubgraph);

    return compiledSubgraph;
  }

  /**
   * Execute a subgraph as part of a parent workflow
   */
  async executeAsSubgraph<TState extends WorkflowState = WorkflowState>(
    parentWorkflow: string,
    parentExecutionId: string,
    subgraphId: string,
    graph: StateGraph<TState>,
    state: TState,
    options: SubgraphOptions = {}
  ): Promise<TState> {
    // Create subgraph context
    const context: SubgraphContext = {
      parentWorkflow,
      parentExecutionId,
      entryTime: new Date(),
      sourceNode: state.currentNode,
      metadata: options.transforms ? { hasTransforms: true } : {},
    };

    // Register active subgraph
    const contextKey = `${parentExecutionId}:${subgraphId}`;
    this.activeSubgraphs.set(contextKey, context);

    try {
      // Compile subgraph
      const compiled = await this.compileSubgraph(subgraphId, graph, options);

      // Transform input if needed
      const inputState = options.transforms?.input
        ? options.transforms.input(state)
        : state;

      // Add subgraph context to state
      const enrichedState = {
        ...inputState,
        subgraphContext: context,
      };

      // Execute subgraph
      const result = await compiled.invoke(enrichedState, {
        configurable: {
          thread_id: `${parentExecutionId}:${subgraphId}`,
          checkpoint_ns: options.checkpoint?.namespace,
        },
      });

      // Transform output if needed
      const outputState = options.transforms?.output
        ? options.transforms.output(result)
        : result;

      // Clean up subgraph context from output
      delete outputState.subgraphContext;

      return outputState;
    } finally {
      // Unregister active subgraph
      this.activeSubgraphs.delete(contextKey);
    }
  }

  /**
   * Check if a workflow is running as a subgraph
   */
  isRunningAsSubgraph(state: WorkflowState): boolean {
    return Boolean((state as any).subgraphContext);
  }

  /**
   * Get subgraph context from state
   */
  getSubgraphContext(state: WorkflowState): SubgraphContext | undefined {
    return (state as any).subgraphContext;
  }

  /**
   * Create a subgraph from a workflow definition
   */
  async createSubgraphFromNodes<TState extends WorkflowState = WorkflowState>(
    id: string,
    nodes: Array<{
      id: string;
      handler: (state: TState) => Promise<Partial<TState>>;
    }>,
    edges: Array<{
      from: string;
      to: string;
      condition?: (state: TState) => boolean;
    }>,
    options: SubgraphOptions = {}
  ): Promise<CompiledSubgraph<TState>> {
    // Create a new state graph with the standard annotation
    const graph = new StateGraph<TState>(WorkflowStateAnnotation as any);

    // Add nodes with proper type adapters
    for (const node of nodes) {
      // Wrap handler to ensure LangGraph compatibility
      const wrappedHandler = async (state: TState): Promise<any> => {
        const result = await node.handler(state);
        // Return result directly since LangGraph handles partial state merging
        return result;
      };
      graph.addNode(node.id, wrappedHandler);
    }

    // Add edges
    for (const edge of edges) {
      if (edge.condition) {
        graph.addConditionalEdges(
          edge.from as any, // Type cast for LangGraph compatibility
          (state: any) => (edge.condition!(state) ? edge.to : END),
          [edge.to, END] as any // Use array instead of object
        );
      } else {
        graph.addEdge(edge.from as any, edge.to as any);
      }
    }

    // Set entry point
    if (nodes.length > 0) {
      graph.setEntryPoint(nodes[0].id as any); // Type cast for LangGraph compatibility
    }

    // Compile and return
    return await this.compileSubgraphSync(id, graph, options);
  }

  /**
   * Get all active subgraphs
   */
  getActiveSubgraphs(): Map<string, SubgraphContext> {
    return new Map(this.activeSubgraphs);
  }

  /**
   * Clear a cached subgraph
   */
  async clearCachedSubgraph(id: string): Promise<void> {
    const subgraph = this.subgraphs.get(id);
    if (subgraph) {
      const metadata = subgraph.getMetadata();
      if (metadata.cacheKey) {
        await this.cacheService.delete(metadata.cacheKey);
      }
      this.subgraphs.delete(id);
    }
  }

  /**
   * Clear all cached subgraphs
   */
  async clearAllCachedSubgraphs(): Promise<void> {
    for (const [id, subgraph] of this.subgraphs) {
      const metadata = subgraph.getMetadata();
      if (metadata.cacheKey) {
        await this.cacheService.delete(metadata.cacheKey);
      }
    }
    this.subgraphs.clear();
  }

  /**
   * Private: Invoke a compiled subgraph
   */
  private async invokeSubgraph<TState extends WorkflowState>(
    id: string,
    compiledGraph: any,
    state: TState,
    options: SubgraphOptions,
    config?: any
  ): Promise<TState> {
    this.logger.debug(`Invoking subgraph: ${id}`);

    // Transform input if needed
    const inputState = options.transforms?.input
      ? options.transforms.input(state)
      : state;

    // Execute the compiled graph
    const result = await compiledGraph.invoke(inputState, config);

    // Transform output if needed
    return options.transforms?.output
      ? options.transforms.output(result)
      : result;
  }

  /**
   * Private: Stream a compiled subgraph
   */
  private async *streamSubgraph<TState extends WorkflowState>(
    id: string,
    compiledGraph: any,
    state: TState,
    options: SubgraphOptions,
    config?: any
  ): AsyncIterableIterator<TState> {
    this.logger.debug(`Streaming subgraph: ${id}`);

    // Transform input if needed
    const inputState = options.transforms?.input
      ? options.transforms.input(state)
      : state;

    // Stream the compiled graph
    const stream = compiledGraph.stream(inputState, config);

    for await (const chunk of stream) {
      // Transform output if needed
      const outputChunk = options.transforms?.output
        ? options.transforms.output(chunk)
        : chunk;

      // Add prefix to events if configured
      if (options.streaming?.prefix) {
        (outputChunk).__streamPrefix = options.streaming.prefix;
      }

      yield outputChunk;
    }
  }

  /**
   * Private: Synchronous compilation (for immediate use)
   */
  private async compileSubgraphSync<TState extends WorkflowState>(
    id: string,
    graph: StateGraph<TState>,
    options: SubgraphOptions
  ): Promise<CompiledSubgraph<TState>> {
    const checkpointer = options.checkpoint?.enabled
      ? await this.getCheckpointer(options.checkpoint)
      : undefined;
    const compiledGraph = graph.compile({
      checkpointer: checkpointer as any, // Type cast to handle version compatibility
      interruptBefore: options.interrupt?.before as any,
      interruptAfter: options.interrupt?.after as any,
    });

    const compiledSubgraph: CompiledSubgraph<TState> = {
      invoke: async (state: TState, config?: any) => {
        return this.invokeSubgraph(id, compiledGraph, state, options, config);
      },
      stream: options.streaming?.passthrough
        ? ((async (state: TState, config?: any) => {
            return this.streamSubgraph(
              id,
              compiledGraph,
              state,
              options,
              config
            );
          }) as any)
        : undefined,
      getMetadata: () => ({
        id,
        name: id,
        compiledAt: new Date(),
        options,
      }),
    };

    this.subgraphs.set(id, compiledSubgraph);
    return compiledSubgraph;
  }

  /**
   * Private: Generate cache key
   */
  private generateCacheKey(id: string, options: SubgraphOptions): string {
    const optionsHash = this.hashOptions(options);
    return `subgraph:${id}:${optionsHash}`;
  }

  /**
   * Private: Hash options for cache key
   */
  private hashOptions(options: SubgraphOptions): string {
    // Simple hash implementation - in production, use a proper hash function
    const str = JSON.stringify(options, (key, value) => {
      if (typeof value === 'function') {
        return value.toString();
      }
      return value;
    });

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Private: Get checkpointer
   */
  private async getCheckpointer(config: any): Promise<BaseCheckpointSaver> {
    // Use SQLite in-memory checkpointer for better performance
    if (config.type === 'sqlite' && config.path) {
      return SqliteSaver.fromConnString(config.path);
    }

    // Default to in-memory SQLite
    return SqliteSaver.fromConnString(':memory:');
  }
}
