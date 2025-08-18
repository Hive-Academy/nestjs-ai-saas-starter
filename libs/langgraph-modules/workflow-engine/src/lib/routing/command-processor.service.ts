import { Injectable, Logger } from '@nestjs/common';
import { WorkflowState, Command } from '../interfaces';

/**
 * Service for processing workflow commands and handling command patterns
 * Implements the LangGraph Command pattern for workflow control
 */
@Injectable()
export class CommandProcessorService {
  private readonly logger = new Logger(CommandProcessorService.name);

  /**
   * Process a command and return state updates
   */
  async processCommand<TState extends WorkflowState = WorkflowState>(
    command: Command<TState>,
    currentState: TState,
    options?: {
      sourceNodeId?: string;
      validateCommand?: boolean;
      applyMetadata?: boolean;
    },
  ): Promise<Partial<TState>> {
    const sourceNodeId = options?.sourceNodeId || currentState.currentNodeId || 'unknown';
    const validateCommand = options?.validateCommand ?? true;
    const applyMetadata = options?.applyMetadata ?? true;

    try {
      // Validate command if requested
      if (validateCommand) {
        const validation = this.validateCommand(command);
        if (!validation.valid) {
          throw new Error(`Invalid command: ${validation.errors.join(', ')}`);
        }
      }

      this.logger.log(`Processing command from ${sourceNodeId}:`, {
        type: command.type || 'goto',
        goto: command.goto,
        hasUpdate: Boolean(command.update),
        hasMetadata: Boolean(command.metadata),
      });

      // Build state updates based on command type
      const stateUpdates = await this.buildStateUpdates(command, currentState, sourceNodeId);

      // Apply metadata if requested
      if (applyMetadata && command.metadata) {
        this.applyCommandMetadata(stateUpdates, command.metadata, currentState);
      }

      this.logger.debug(`Command processed successfully, targeting: ${command.goto || 'none'}`);
      return stateUpdates;

    } catch (error) {
      this.logger.error(`Failed to process command from ${sourceNodeId}:`, error);
      return this.createErrorState(error as Error, sourceNodeId, currentState);
    }
  }

  /**
   * Build state updates from command
   */
  private async buildStateUpdates<TState extends WorkflowState>(
    command: Command<TState>,
    currentState: TState,
    sourceNodeId: string,
  ): Promise<Partial<TState>> {
    const type = command.type || 'goto';

    // Base state updates from command
    const baseUpdates = {
      ...(command.update || {}),
      currentNodeId: sourceNodeId,
      completedNodes: [...(currentState.completedNodes || []), sourceNodeId],
    } as unknown as Partial<TState>;

    // Handle different command types
    switch (type) {
      case 'goto':
        return this.handleGotoCommand(command, baseUpdates, currentState);

      case 'retry':
        return this.handleRetryCommand(command, baseUpdates, currentState);

      case 'skip':
        return this.handleSkipCommand(command, baseUpdates, currentState);

      case 'stop':
        return this.handleStopCommand(command, baseUpdates, currentState);

      case 'update':
        return this.handleUpdateCommand(command, baseUpdates, currentState);

      case 'end':
        return this.handleEndCommand(command, baseUpdates, currentState);

      case 'error':
        return this.handleErrorCommand(command, baseUpdates, currentState);

      default:
        // Default to goto behavior
        return this.handleGotoCommand(command, baseUpdates, currentState);
    }
  }

  /**
   * Handle goto command
   */
  private handleGotoCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    const targetNode = String(command.goto);

    return {
      ...baseUpdates,
      nextAvailableNodes: [targetNode],
      lastCommand: {
        type: 'goto',
        payload: {
          goto: command.goto,
          update: command.update,
        },
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Handle retry command
   */
  private handleRetryCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    const retryCount = (currentState.retryCount || 0) + 1;
    const maxAttempts = command.maxAttempts || 3;

    if (retryCount > maxAttempts) {
      this.logger.warn(`Max retry attempts (${maxAttempts}) exceeded`);
      return {
        ...baseUpdates,
        workflowStatus: 'failed',
        error: `Max retry attempts (${maxAttempts}) exceeded`,
        retryCount,
      } as Partial<TState>;
    }

    return {
      ...baseUpdates,
      nextAvailableNodes: [String(command.goto)],
      retryCount,
      lastCommand: {
        type: 'retry',
        payload: {
          goto: command.goto,
          maxAttempts,
          attempt: retryCount,
        },
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Handle skip command
   */
  private handleSkipCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    return {
      ...baseUpdates,
      nextAvailableNodes: [String(command.goto)],
      lastCommand: {
        type: 'skip',
        payload: {
          goto: command.goto,
          reason: command.reason,
        },
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Handle stop command
   */
  private handleStopCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    return {
      ...baseUpdates,
      workflowStatus: 'completed',
      nextAvailableNodes: [],
      lastCommand: {
        type: 'stop',
        payload: {
          reason: command.reason,
        },
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Handle update command
   */
  private handleUpdateCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    return {
      ...baseUpdates,
      ...command.update,
      lastCommand: {
        type: 'update',
        payload: command.update,
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Handle end command
   */
  private handleEndCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    return {
      ...baseUpdates,
      workflowStatus: 'completed',
      nextAvailableNodes: [],
      lastCommand: {
        type: 'end',
        payload: {},
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Handle error command
   */
  private handleErrorCommand<TState extends WorkflowState>(
    command: Command<TState>,
    baseUpdates: Partial<TState>,
    currentState: TState,
  ): Partial<TState> {
    return {
      ...baseUpdates,
      workflowStatus: 'failed',
      error: command.error,
      nextAvailableNodes: [],
      lastCommand: {
        type: 'error',
        payload: {
          error: command.error,
        },
        metadata: command.metadata as Record<string, unknown>,
        timestamp: new Date(),
      },
    } as Partial<TState>;
  }

  /**
   * Apply command metadata to state updates
   */
  private applyCommandMetadata<TState extends WorkflowState>(
    stateUpdates: Partial<TState>,
    metadata: Record<string, unknown>,
    currentState: TState,
  ): void {
    // Handle human approval requirement
    if (metadata.requiresApproval) {
      (stateUpdates as any).humanFeedback = {
        status: 'pending',
        timestamp: new Date(),
        metadata: {
          commandReason: metadata.reason,
          sourceNode: metadata.sourceNode,
          targetNode: metadata.targetNode,
        },
      };
    }

    // Handle priority
    if (metadata.priority) {
      (stateUpdates as any).priority = metadata.priority;
    }

    // Handle confidence updates
    if (typeof metadata.confidence === 'number') {
      (stateUpdates as any).confidence = metadata.confidence;
    }

    // Store metadata in context
    (stateUpdates as any).commandMetadata = metadata;
  }

  /**
   * Create error state for failed command processing
   */
  private createErrorState<TState extends WorkflowState>(
    error: Error,
    sourceNodeId: string,
    currentState: TState,
  ): Partial<TState> {
    return {
      workflowStatus: 'failed',
      error: error.message,
      lastError: {
        id: `cmd-error-${Date.now()}`,
        nodeId: sourceNodeId,
        type: 'command_processing',
        message: error.message,
        timestamp: new Date(),
        isRecoverable: this.isRecoverableError(error),
        suggestedRecovery: this.getSuggestedRecovery(error),
      },
      retryCount: (currentState.retryCount || 0) + 1,
    } as unknown as Partial<TState>;
  }

  /**
   * Validate a command
   */
  validateCommand<TState extends WorkflowState>(
    command: Command<TState>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields based on command type
    const type = command.type || 'goto';
    if ((type === 'goto' || type === 'skip') && !command.goto) {
      errors.push(`Command type '${type}' must have a goto target`);
    }

    // Validate command type
    const validTypes = ['goto', 'retry', 'skip', 'stop'];
    if (command.type && !validTypes.includes(command.type)) {
      errors.push(`Invalid command type: ${command.type}`);
    }

    // Validate retry command
    if (command.type === 'retry' && command.maxAttempts && command.maxAttempts < 1) {
      errors.push('Max attempts must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a value is a valid command
   */
  isCommand<TState extends WorkflowState>(value: unknown): value is Command<TState> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'goto' in value &&
      (typeof (value as Command<TState>).goto === 'string' ||
        typeof (value as Command<TState>).goto === 'object')
    );
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    const recoverablePatterns = [
      /timeout/i,
      /network/i,
      /rate limit/i,
      /temporary/i,
    ];

    return recoverablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Get suggested recovery for error
   */
  private getSuggestedRecovery(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return 'Increase timeout and retry';
    }
    if (message.includes('validation')) {
      return 'Check command parameters';
    }
    if (message.includes('not found')) {
      return 'Verify target node exists';
    }

    return 'Review error and adjust command';
  }

  /**
   * Create a command builder for fluent API
   */
  createCommandBuilder<TState extends WorkflowState = WorkflowState>() {
    return new CommandBuilder<TState>();
  }
}

/**
 * Fluent builder for creating commands
 */
export class CommandBuilder<TState extends WorkflowState = WorkflowState> {
  private readonly command: Partial<Command<TState>> = {};

  goto(target: string): this {
    this.command.goto = target;
    return this;
  }

  withUpdate(update: Partial<TState>): this {
    this.command.update = update;
    return this;
  }

  withType(type: 'goto' | 'retry' | 'skip' | 'stop'): this {
    this.command.type = type as any;
    return this;
  }

  withReason(reason: string): this {
    this.command.reason = reason;
    return this;
  }

  withMaxAttempts(maxAttempts: number): this {
    this.command.maxAttempts = maxAttempts;
    return this;
  }

  withParams(params: Record<string, unknown>): this {
    this.command.params = params;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.command.metadata = metadata;
    return this;
  }

  build(): Command<TState> {
    if (!this.command.goto) {
      throw new Error('Command must have a goto target');
    }

    return {
      type: this.command.type || 'goto',
      goto: this.command.goto,
      update: this.command.update,
      reason: this.command.reason,
      maxAttempts: this.command.maxAttempts,
      params: this.command.params,
      metadata: this.command.metadata,
      timestamp: new Date(),
    } as Command<TState>;
  }
}
