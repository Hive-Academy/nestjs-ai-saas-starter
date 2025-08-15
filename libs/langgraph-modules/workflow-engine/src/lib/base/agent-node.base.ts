import { Logger, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredToolInterface } from '@langchain/core/tools';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  WorkflowState, 
  Command, 
  CommandType,
  WorkflowError
} from '../interfaces';

/**
 * Configuration for an agent node
 */
export interface AgentNodeConfig {
  /** Unique identifier for the node */
  readonly id: string;
  /** Human-readable name */
  readonly name?: string;
  /** Node description */
  readonly description?: string;
  /** Whether this node requires human approval */
  readonly requiresApproval?: boolean;
  /** Confidence threshold for this node */
  readonly confidenceThreshold?: number;
  /** Maximum retry attempts */
  readonly maxRetries?: number;
  /** Timeout in milliseconds */
  readonly timeout?: number;
}

/**
 * Base class for all agent nodes in a workflow
 * Provides common functionality for LLM interaction, error handling, and state management
 */
export abstract class AgentNodeBase<TState extends WorkflowState = WorkflowState> implements OnModuleInit {
  protected readonly logger: Logger;
  protected readonly eventEmitter?: EventEmitter2;
  
  protected llm?: BaseChatModel;
  protected tools: StructuredToolInterface[] = [];

  /** Node configuration */
  protected abstract readonly nodeConfig: AgentNodeConfig;

  constructor(
    @Optional()
    @Inject(EventEmitter2)
    eventEmitter?: EventEmitter2
  ) {
    this.eventEmitter = eventEmitter;
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Initialize the node
   */
  public async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing node: ${this.nodeConfig.id}`);
    
    // Initialize LLM if needed
    if (this.requiresLLM()) {
      await this.initializeLLM();
    }
    
    // Initialize tools
    this.tools = await this.initializeTools();
    
    // Custom initialization
    await this.initialize();
  }

  /**
   * Execute the node logic
   * Nodes can return either a state update or a Command for control flow
   */
  public abstract execute(state: TState): Promise<Partial<TState> | Command<TState>>;

  /**
   * Execute with hooks and error handling
   */
  public async executeWithHooks(state: TState): Promise<Partial<TState> | Command<TState>> {
    try {
      // Pre-execution
      await this.preExecute(state);
      
      // Apply timeout if configured
      const executePromise = this.execute(state);
      const result = this.nodeConfig.timeout
        ? await this.withTimeout(executePromise, this.nodeConfig.timeout)
        : await executePromise;
      
      // Post-execution
      await this.postExecute(state, result);
      
      return result;
    } catch (error) {
      return this.handleError(error as Error, state);
    }
  }

  /**
   * Get node metadata
   */
  public getMetadata(): AgentNodeConfig {
    return this.nodeConfig;
  }

  /**
   * Get node ID
   */
  public getId(): string {
    return this.nodeConfig.id;
  }

  /**
   * Custom initialization logic
   * Override in subclasses for specific initialization
   */
  protected async initialize(): Promise<void> {
    // Override in subclasses
    return Promise.resolve();
  }

  /**
   * Check if this node requires an LLM
   */
  protected requiresLLM(): boolean {
    // Override in subclasses that need LLM
    return false;
  }

  /**
   * Initialize the LLM for this node
   */
  protected async initializeLLM(): Promise<void> {
    // Override in subclasses to provide LLM initialization
    // This is where you'd inject your LLM provider service
    this.logger.warn('LLM required but not initialized - override initializeLLM()');
    return Promise.resolve();
  }

  /**
   * Initialize tools for this node
   */
  protected async initializeTools(): Promise<StructuredToolInterface[]> {
    // Override in subclasses to provide tools
    return Promise.resolve([]);
  }

  /**
   * Pre-execution hook
   */
  protected async preExecute(state: TState): Promise<void> {
    this.logger.debug(`Pre-executing node ${this.nodeConfig.id}`);
    
    // Emit node start event
    if (this.eventEmitter) {
      this.eventEmitter.emit('node.start', {
        nodeId: this.nodeConfig.id,
        executionId: state.executionId,
        state,
      });
    }
    
    return Promise.resolve();
  }

  /**
   * Post-execution hook
   */
  protected async postExecute(
    state: TState,
    result: Partial<TState> | Command<TState>,
  ): Promise<void> {
    this.logger.debug(`Post-executing node ${this.nodeConfig.id}`);
    
    // Emit node complete event
    if (this.eventEmitter) {
      this.eventEmitter.emit('node.complete', {
        nodeId: this.nodeConfig.id,
        executionId: state.executionId,
        result,
      });
    }
    
    return Promise.resolve();
  }

  /**
   * Apply timeout to a promise
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(
          () => { reject(new Error(`Node timeout after ${timeoutMs}ms`)); },
          timeoutMs,
        );
      }),
    ]);
  }

  /**
   * Handle node errors
   */
  protected async handleError(
    error: Error,
    state: TState,
  ): Promise<Command<TState>> {
    this.logger.error(
      `Error in node ${this.nodeConfig.id}: ${error.message}`,
      error.stack,
    );

    const workflowError: WorkflowError = {
      id: `error_${Date.now()}`,
      nodeId: this.nodeConfig.id,
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

    // Emit error event
    if (this.eventEmitter) {
      this.eventEmitter.emit('node.error', {
        nodeId: this.nodeConfig.id,
        executionId: state.executionId,
        error: workflowError,
      });
    }

    // Check retry policy
    const maxRetries = this.nodeConfig.maxRetries ?? 3;
    if (state.retryCount < maxRetries && workflowError.isRecoverable) {
      return {
        type: CommandType.RETRY,
        retry: {
          node: this.nodeConfig.id,
          delay: Math.pow(2, state.retryCount) * 1000, // Exponential backoff
        },
        update: {
          retryCount: state.retryCount + 1,
          lastError: workflowError,
          confidence: Math.max((state.confidence ?? 1) - 0.1, 0),
        } as unknown as Partial<TState>,
      };
    }

    // Non-recoverable or max retries reached
    return {
      type: CommandType.ERROR,
      error: workflowError,
      update: {
        status: 'failed',
        error: workflowError,
      } as unknown as Partial<TState>,
    };
  }

  /**
   * Check if error is recoverable
   */
  protected isErrorRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    const recoverableKeywords = [
      'timeout',
      'rate limit',
      'network',
      'temporary',
      'retry',
      'econnrefused',
      'etimedout',
    ];
    return recoverableKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Get suggested recovery action
   */
  protected getSuggestedRecovery(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return 'Increase timeout or retry with smaller payload';
    }
    
    if (message.includes('rate limit')) {
      return 'Wait and retry with exponential backoff';
    }
    
    if (message.includes('network') || message.includes('econnrefused')) {
      return 'Check service availability and network connection';
    }
    
    if (message.includes('validation')) {
      return 'Review input data and ensure it meets requirements';
    }
    
    return 'Review error details and consider manual intervention';
  }

  /**
   * Create a command for workflow control
   */
  protected createCommand(
    type: CommandType,
    options: Partial<Command<TState>> = {},
  ): Command<TState> {
    return {
      type,
      ...options,
      metadata: {
        nodeId: this.nodeConfig.id,
        timestamp: new Date(),
        ...options.metadata,
      },
    };
  }

  /**
   * Create a goto command
   */
  protected goto(
    target: string,
    update?: Partial<TState>,
  ): Command<TState> {
    return this.createCommand(CommandType.GOTO, {
      goto: target,
      update,
    });
  }

  /**
   * Create an update command
   */
  protected update(update: Partial<TState>): Command<TState> {
    return this.createCommand(CommandType.UPDATE, {
      update,
    });
  }

  /**
   * Create an end command
   */
  protected end(update?: Partial<TState>): Command<TState> {
    return this.createCommand(CommandType.END, {
      update,
    });
  }

  /**
   * Check if confidence meets threshold
   */
  protected meetsConfidenceThreshold(state: TState): boolean {
    const threshold = this.nodeConfig.confidenceThreshold ?? 0.7;
    return (state.confidence ?? 1) >= threshold;
  }

  /**
   * Check if node requires approval
   */
  protected requiresApproval(state: TState): boolean {
    // Check node configuration
    if (this.nodeConfig.requiresApproval) {
      return true;
    }
    
    // Check confidence threshold
    if (!this.meetsConfidenceThreshold(state)) {
      return true;
    }
    
    // Check for high-risk operations
    const risks = state.risks as Array<{ severity: string }> | undefined;
    if (risks?.some((r) => r.severity === 'critical')) {
      return true;
    }
    
    return false;
  }

  /**
   * Route to approval if needed
   */
  protected async checkApproval(
    state: TState,
    nextNode: string,
  ): Promise<Command<TState>> {
    if (this.requiresApproval(state)) {
      this.logger.log('Routing to human approval');
      return this.goto('human_approval', {
        previousNode: this.nodeConfig.id,
        nextNode,
        requiresApproval: true,
      } as unknown as Partial<TState>);
    }
    
    return this.goto(nextNode);
  }
}