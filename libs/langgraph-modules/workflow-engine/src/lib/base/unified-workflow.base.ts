import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StateGraph,
  END,
} from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { StructuredToolInterface } from '@langchain/core/tools';
import { WorkflowGraphBuilderService } from '../core/workflow-graph-builder.service';
import { SubgraphManagerService } from '../core/subgraph-manager.service';
import { WorkflowStreamService } from '../streaming/workflow-stream.service';
import { EventStreamProcessorService } from '@langgraph-modules/streaming';
import { isWorkflow } from '@langgraph-modules/functional-api';
import {
  WorkflowState,
  Command,
  WorkflowDefinition,
  WorkflowError,
} from '../interfaces';
import { CommandType } from '../constants';

/**
 * Configuration for workflow behavior
 */
export interface WorkflowConfig {
  /** Unique name for the workflow */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Confidence threshold for automatic approval */
  confidenceThreshold?: number;
  /** Whether to require human approval for certain operations */
  requiresHumanApproval?: boolean;
  /** Threshold for automatic approval without human intervention */
  autoApproveThreshold?: number;
  /** Enable streaming for this workflow */
  streaming?: boolean;
  /** Enable caching for compiled graphs */
  cache?: boolean;
  /** Enable metrics collection */
  metrics?: boolean;
  /** Human-in-the-loop configuration */
  hitl?: {
    enabled: boolean;
    timeout?: number;
    fallbackStrategy?: 'auto-approve' | 'reject' | 'retry';
  };
}

/**
 * Base class for all LangGraph workflows
 * Provides common functionality for workflow execution, streaming, and human-in-the-loop
 */
@Injectable()
export abstract class UnifiedWorkflowBase<
  TState extends WorkflowState = WorkflowState
> {
  protected readonly logger: Logger;

  // Workflow configuration
  protected abstract readonly workflowConfig: WorkflowConfig;

  // Graph definition
  protected graph?: StateGraph<TState>;
  protected compiledGraph?: any; // CompiledStateGraph has complex generics

  constructor(
    @Inject(EventEmitter2)
    protected readonly eventEmitter: EventEmitter2,
    @Inject(WorkflowGraphBuilderService)
    protected readonly graphBuilder: WorkflowGraphBuilderService,
    @Inject(SubgraphManagerService)
    protected readonly subgraphManager: SubgraphManagerService,
    @Optional()
    @Inject(WorkflowStreamService)
    protected readonly streamService?: WorkflowStreamService,
    @Optional()
    @Inject(EventStreamProcessorService)
    protected readonly eventProcessor?: EventStreamProcessorService
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Initialize the workflow
   */
  async initialize(): Promise<void> {
    this.logger.log(`Initializing workflow: ${this.workflowConfig.name}`);
    this.graph = await this.buildGraph();
    this.compiledGraph = await this.compileGraph();
  }

  /**
   * Build the workflow graph
   */
  protected async buildGraph(): Promise<StateGraph<TState>> {
    // Check if this class uses decorators and route to appropriate builder
    if (this.isDecoratorBasedWorkflow()) {
      this.logger.debug(
        `Building graph from decorators for ${this.constructor.name}`
      );
      return this.graphBuilder.buildFromDecorators<TState>(this.constructor, {
        interrupt: {
          before: this.getInterruptNodes(),
        },
      });
    }
      this.logger.debug(
        `Building graph from definition for ${this.constructor.name}`
      );
      const definition = this.getWorkflowDefinition();
      return this.graphBuilder.buildFromDefinition<TState>(definition, {
        interrupt: {
          before: this.getInterruptNodes(),
        },
      });

  }

  /**
   * Check if this workflow class uses decorators
   */
  protected isDecoratorBasedWorkflow(): boolean {
    return isWorkflow(this.constructor);
  }

  /**
   * Compile the workflow graph
   */
  protected async compileGraph(): Promise<any> {
    if (!this.graph) {
      throw new Error('Graph must be built before compilation');
    }

    // TODO: Implement checkpointer creation in SubgraphManagerService
    const checkpointer = undefined; // this.workflowConfig.cache
    // ? await this.subgraphManager.createCheckpointer({ type: 'sqlite', dbPath: ':memory:' })
    // : undefined;

    return this.graph.compile({ checkpointer });
  }

  /**
   * Get the workflow definition
   * Override this to define your workflow structure
   */
  protected abstract getWorkflowDefinition(): WorkflowDefinition<TState>;

  /**
   * Execute the workflow
   */
  async execute(
    input: Partial<TState>,
    config?: RunnableConfig
  ): Promise<TState> {
    if (!this.compiledGraph) {
      await this.initialize();
    }

    this.logger.log(`Executing workflow: ${this.workflowConfig.name}`);

    try {
      // Create initial state
      const initialState = this.createInitialState(input);

      // Emit start event
      this.eventEmitter.emit('workflow.start', {
        workflowName: this.workflowConfig.name,
        executionId: initialState.executionId,
        input: initialState,
      });

      // Execute workflow
      const result = await this.compiledGraph!.invoke(initialState, config);

      // Emit completion event
      this.eventEmitter.emit('workflow.complete', {
        workflowName: this.workflowConfig.name,
        executionId: result.executionId,
        result,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Workflow execution failed: ${errorMessage}`,
        errorStack
      );

      // Emit error event
      this.eventEmitter.emit('workflow.error', {
        workflowName: this.workflowConfig.name,
        error,
      });

      throw error;
    }
  }

  /**
   * Stream workflow execution
   */
  async *stream(
    input: Partial<TState>,
    config?: RunnableConfig
  ): AsyncGenerator<any> {
    if (!this.compiledGraph) {
      await this.initialize();
    }

    if (!this.streamService) {
      throw new Error('Streaming service not available');
    }

    const initialState = this.createInitialState(input);
    const {executionId} = initialState;

    // Create stream
    this.streamService.createStream(executionId);

    try {
      // Stream execution
      yield* this.streamService.streamExecution(
        this.compiledGraph,
        initialState,
        config,
        executionId
      );
    } finally {
      // Cleanup is handled by streamService
    }
  }

  /**
   * Create initial state from input
   */
  protected createInitialState(input: Partial<TState>): TState {
    const baseState: Partial<WorkflowState> = {
      executionId: `exec_${Date.now()}`,
      status: 'active',
      currentNode: 'start',
      confidence: 1.0,
      retryCount: 0,
      startedAt: new Date(),
      metadata: {},
      ...input,
    };

    return baseState as TState;
  }

  /**
   * Get nodes that should interrupt for human approval
   */
  protected getInterruptNodes(): string[] {
    if (!this.workflowConfig.hitl?.enabled) {
      return [];
    }

    // Default interrupt nodes
    const nodes = ['human_approval'];

    // Add custom interrupt nodes from workflow definition
    // Handle both decorator-based and imperative workflows
    try {
      const definition = this.isDecoratorBasedWorkflow()
        ? this.getDecoratorWorkflowDefinition()
        : this.getWorkflowDefinition();

      definition.nodes.forEach((node) => {
        if (node.requiresApproval) {
          nodes.push(node.id);
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        'Could not extract interrupt nodes from workflow definition',
        errorMsg
      );
    }

    return nodes;
  }

  /**
   * Get workflow definition for decorator-based workflows
   */
  protected getDecoratorWorkflowDefinition(): WorkflowDefinition<TState> {
    // This should be overridden by DeclarativeWorkflowBase
    // For now, we'll try to get the definition normally
    return this.getWorkflowDefinition();
  }

  /**
   * Common start node
   */
  protected async startNode(state: TState): Promise<Partial<TState>> {
    this.logger.log(`Starting workflow: ${this.workflowConfig.name}`);

    return {
      currentNode: 'start',
      status: 'active',
      startedAt: new Date(),
    } as Partial<TState>;
  }

  /**
   * Common end node
   */
  protected async endNode(state: TState): Promise<Partial<TState>> {
    this.logger.log(`Completing workflow: ${this.workflowConfig.name}`);

    return {
      currentNode: 'end',
      status: 'completed',
      completedAt: new Date(),
    } as Partial<TState>;
  }

  /**
   * Handle human approval
   */
  protected async handleHumanApproval(state: TState): Promise<Command<TState>> {
    this.logger.log('Waiting for human approval');

    // Check if approval already received
    if (state.humanFeedback) {
      if (state.humanFeedback.approved) {
        return {
          type: CommandType.GOTO,
          goto: this.getPostApprovalNode(state),
          update: {
            approvalReceived: true,
          } as Partial<TState>,
        };
      }
        return {
          type: CommandType.END,
          update: {
            status: 'rejected',
            rejectionReason: state.humanFeedback.reason,
          } as unknown as Partial<TState>,
        };

    }

    // Wait for approval (will be interrupted)
    return {
      type: CommandType.UPDATE,
      update: {
        waitingForApproval: true,
      } as Partial<TState>,
    };
  }

  /**
   * Get the node to go to after approval
   */
  protected getPostApprovalNode(state: TState): string {
    // Override in subclasses for custom routing
    return state.previousNode || 'continue';
  }

  /**
   * Route based on confidence
   */
  protected routeBasedOnConfidence(state: TState, defaultNext: string): string {
    const threshold = this.workflowConfig.confidenceThreshold || 0.7;

    if (state.confidence < threshold) {
      this.logger.log(
        `Low confidence (${state.confidence}), routing to human approval`
      );
      return 'human_approval';
    }

    const autoApproveThreshold =
      this.workflowConfig.autoApproveThreshold || 0.95;
    if (state.confidence >= autoApproveThreshold) {
      this.logger.log(`High confidence (${state.confidence}), auto-approving`);
      return defaultNext;
    }

    // Check for risks
    if (state.risks?.some((r) => r.severity === 'critical')) {
      this.logger.log('Critical risk detected, routing to human approval');
      return 'human_approval';
    }

    return defaultNext;
  }

  /**
   * Handle workflow errors
   */
  protected async handleError(
    error: Error,
    state: TState,
    nodeId: string
  ): Promise<Command<TState>> {
    this.logger.error(`Error in node ${nodeId}: ${error.message}`, error.stack);

    const workflowError: WorkflowError = {
      id: `error_${Date.now()}`,
      nodeId,
      type: 'execution',
      message: error.message,
      stackTrace: error.stack,
      context: {
        state: state.currentNode,
        executionId: state.executionId,
      },
      timestamp: new Date(),
      isRecoverable: this.isErrorRecoverable(error),
      suggestedRecovery: this.getSuggestedRecovery(error),
    };

    // Check retry policy
    const maxRetries = 3;
    if (state.retryCount < maxRetries && workflowError.isRecoverable) {
      return {
        type: CommandType.RETRY,
        retry: {
          node: nodeId,
          delay: Math.pow(2, state.retryCount) * 1000, // Exponential backoff
        },
        update: {
          retryCount: state.retryCount + 1,
          lastError: workflowError,
        } as Partial<TState>,
      };
    }

    // Non-recoverable or max retries reached
    return {
      type: CommandType.ERROR,
      error: workflowError,
      update: {
        status: 'failed',
        error: workflowError,
      } as Partial<TState>,
    };
  }

  /**
   * Check if error is recoverable
   */
  protected isErrorRecoverable(error: Error): boolean {
    // Network errors are usually recoverable
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return true;
    }

    // Rate limit errors are recoverable
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return true;
    }

    return false;
  }

  /**
   * Get suggested recovery action
   */
  protected getSuggestedRecovery(error: Error): string {
    if (error.message.includes('rate limit')) {
      return 'Wait and retry with exponential backoff';
    }

    if (error.message.includes('ECONNREFUSED')) {
      return 'Check service availability and retry';
    }

    return 'Review error and consider manual intervention';
  }

  /**
   * Get available tools for this workflow
   */
  protected getTools(): StructuredToolInterface[] {
    // Override in subclasses to provide workflow-specific tools
    return [];
  }

  /**
   * Transform state for subgraph input
   */
  protected transformSubgraphInput(state: TState): Partial<TState> {
    // Override in subclasses for custom transformations
    return state;
  }

  /**
   * Transform subgraph output back to main state
   */
  protected transformSubgraphOutput(
    subgraphState: TState,
    parentState: TState
  ): Partial<TState> {
    // Override in subclasses for custom transformations
    return {
      ...subgraphState,
      parentExecutionId: parentState.executionId,
    } as Partial<TState>;
  }

  /**
   * Compile this workflow as a subgraph
   */
  async compileAsSubgraph(options: any = {}): Promise<any> {
    const definition = this.getWorkflowDefinition();

    // TODO: Implement createSubgraph in SubgraphManagerService
    throw new Error('Subgraph creation not implemented yet');
    // return this.subgraphManager.createSubgraph(
    //   this.workflowConfig.name,
    //   definition,
    //   {
    //     ...options,
    //     transforms: {
    //       input: this.transformSubgraphInput.bind(this),
    //       output: this.transformSubgraphOutput.bind(this),
    //     },
    //   },
    // );
  }

  /**
   * Get workflow metadata
   */
  getMetadata(): WorkflowConfig {
    return this.workflowConfig;
  }

  /**
   * Get workflow name
   */
  getName(): string {
    return this.workflowConfig.name;
  }
}
