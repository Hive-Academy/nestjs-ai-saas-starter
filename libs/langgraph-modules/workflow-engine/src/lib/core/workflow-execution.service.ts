import { Injectable, Logger } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import type {
  WorkflowState,
  WorkflowNode,
  Command,
} from '../interfaces';
// Removed unused import: WorkflowDefinition
import { WorkflowCommandType } from '../constants';

/**
 * Service responsible for workflow execution logic and command processing
 * Extracted from WorkflowGraphBuilderService for better separation of concerns
 */
@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  /**
   * Wrap a node handler to support command pattern and state tracking
   */
  wrapNodeHandler<TState extends WorkflowState = WorkflowState>(
    node: WorkflowNode<TState>,
    options: any = {}
  ): (state: TState) => Promise<any> {
    return async (state: TState): Promise<any> => {
      try {
        // Add node tracking
        const updatedState: Partial<TState> = {
          currentNode: node.id,
          completedNodes: [...(state.completedNodes || []), node.id],
        } as unknown as Partial<TState>;

        // Execute node handler with timeout
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
  isCommand<TState>(result: any): boolean {
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
  processCommand<TState extends WorkflowState = WorkflowState>(
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

      default:
        return command?.update || {};
    }
  }

  /**
   * Handle node execution errors
   */
  handleNodeError<TState extends WorkflowState = WorkflowState>(
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
  async executeWithTimeout<T>(
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
   * Safe method to add a node to the graph
   */
  safeAddNode<TState>(
    graph: StateGraph<TState>,
    nodeId: string,
    handler: (state: TState) => any
  ): void {
    const nodeAction = (() => handler) as any;
    (graph as any).addNode(nodeId, nodeAction());
  }

  /**
   * Configure interrupt points for a graph
   */
  configureInterrupts<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    interrupt: { before?: string[]; after?: string[] }
  ): void {
    // This will be handled during compilation with interruptBefore/interruptAfter options
    this.logger.debug(
      'Interrupt configuration will be applied during compilation',
      interrupt
    );
  }
}