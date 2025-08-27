import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly metadataProcessor: MetadataProcessorService) {}

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
   * Build a workflow graph from a definition
   */
  buildFromDefinition<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>,
    options: GraphBuilderOptions = {}
  ): StateGraph<TState> {
    this.logger.debug(`Building workflow graph: ${definition.name}`);

    // Create state graph with appropriate annotation
    const stateAnnotation =
      options.stateAnnotation || definition.channels || WorkflowStateAnnotation;

    const graph = new StateGraph<TState>(stateAnnotation);

    // Add nodes
    for (const node of definition.nodes) {
      this.addNode(graph, node, options);
    }

    // Add edges
    for (const edge of definition.edges) {
      this.addEdge(graph, edge);
    }

    // Set entry point
    graph.setEntryPoint(definition.entryPoint as any);

    // Set interrupt points if configured
    if (options.interrupt) {
      this.configureInterrupts(graph, options.interrupt);
    }

    this.logger.debug(`Workflow graph built successfully: ${definition.name}`);
    return graph;
  }

  /**
   * Build a workflow graph from decorator metadata
   */
  buildFromDecorators<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    options: GraphBuilderOptions = {}
  ): StateGraph<TState> {
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

    // Build the graph using the existing buildFromDefinition method
    return this.buildFromDefinition(definition, options);
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
   * Compile the graph with options
   */
  compileGraph<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    options: GraphBuilderOptions = {}
  ): any {
    const compileOptions: any = {};

    if (options.checkpointer) {
      compileOptions.checkpointer = options.checkpointer;
    }

    if (options.interrupt?.before) {
      compileOptions.interruptBefore = options.interrupt.before;
    }

    if (options.interrupt?.after) {
      compileOptions.interruptAfter = options.interrupt.after;
    }

    return graph.compile(compileOptions);
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
}
