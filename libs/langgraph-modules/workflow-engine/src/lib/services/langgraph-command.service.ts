import { Injectable, Logger } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import type { StateSnapshot } from '@langchain/langgraph';
// WorkflowState import removed - using Record<string, unknown> constraint instead

/**
 * LangGraphCommandService
 *
 * Low-level service for LangGraph Command pattern operations.
 * Provides type-safe wrappers for invoking, streaming, and state management
 * using LangGraph's native Command class.
 *
 * RESPONSIBILITY: Pure LangGraph API wrapper - no business logic
 *
 * Architecture Decision (TASK_2025_049):
 * - Separated from WorkflowResumptionService for SRP compliance
 * - Reusable for future Command patterns (time-travel, debugging, etc.)
 * - No graph compilation logic (delegated to consumers)
 *
 * PATTERN: Pure utility service - no state, no business logic, just LangGraph API wrapper
 *
 * @see WorkflowResumptionService for high-level resumption orchestration
 * @see WorkflowExecutionService for workflow execution orchestration
 */
@Injectable()
export class LangGraphCommandService {
  private readonly logger = new Logger(LangGraphCommandService.name);

  /**
   * Invoke a compiled graph with a Command for workflow resumption
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph (from graph.compile())
   * @param command - LangGraph Command instance (e.g., new Command({ resume: value }))
   * @param config - RunnableConfig with thread_id and checkpoint_id
   * @returns Final workflow state after resumption
   *
   * @throws Error if graph invocation fails
   *
   * Evidence: task-description.md:680-696 (Command pattern for resumption)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const command = new Command({ resume: { approved: true } });
   * const config = { configurable: { thread_id: 'thread-123', checkpoint_id: 'ckpt-456' } };
   * const result = await commandService.invokeWithCommand(compiled, command, config);
   * ```
   */
  async invokeWithCommand<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    compiledGraph: any,
    command: Command,
    config: RunnableConfig
  ): Promise<TState> {
    this.logger.debug(
      `Invoking graph with Command for thread: ${config.configurable?.thread_id}`
    );

    try {
      const result = await compiledGraph.invoke(command, config);
      this.logger.log(
        `✅ Command invocation successful for thread: ${config.configurable?.thread_id}`
      );
      return result as TState;
    } catch (error: any) {
      this.logger.error(
        `❌ Command invocation failed for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get current state snapshot from a compiled graph
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph
   * @param config - RunnableConfig with thread_id
   * @returns StateSnapshot with valid next[] and tasks[] arrays
   *
   * @throws Error if state retrieval fails
   *
   * Evidence: task-description.md:199-241 (StateSnapshot API Contract)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const config = { configurable: { thread_id: 'thread-123' } };
   * const snapshot = await commandService.getState(compiled, config);
   * console.log('Next nodes:', snapshot.next); // Real next nodes, not empty array
   * ```
   */
  async getState<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(compiledGraph: any, config: RunnableConfig): Promise<StateSnapshot> {
    this.logger.debug(
      `Retrieving state snapshot for thread: ${config.configurable?.thread_id}`
    );

    try {
      const snapshot = await compiledGraph.getState(config);
      this.logger.log(
        `✅ State snapshot retrieved for thread: ${
          config.configurable?.thread_id
        }, next: [${snapshot.next.join(', ')}]`
      );
      return snapshot;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to retrieve state snapshot for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Update workflow state without resumption (advanced use case)
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph
   * @param updates - Partial state updates to apply
   * @param asNode - Optional node name to attribute update to
   * @param config - RunnableConfig with thread_id
   *
   * @throws Error if state update fails
   *
   * Evidence: task-description.md:651-668 (HITL with State Update - Advanced)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const config = { configurable: { thread_id: 'thread-123' } };
   * await commandService.updateState(
   *   compiled,
   *   { metadata: { customField: 'value' } },
   *   'myNode',
   *   config
   * );
   * ```
   */
  async updateState<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    compiledGraph: any,
    updates: Partial<TState>,
    asNode: string | null | undefined,
    config: RunnableConfig
  ): Promise<void> {
    this.logger.debug(
      `Updating state for thread: ${config.configurable?.thread_id}`
    );

    try {
      await compiledGraph.updateState(config, updates, asNode);
      this.logger.log(
        `✅ State updated for thread: ${config.configurable?.thread_id}`
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to update state for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Stream workflow execution with a Command
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph
   * @param command - LangGraph Command instance
   * @param config - RunnableConfig with stream mode and thread_id
   * @yields State updates from workflow execution
   *
   * @throws Error if streaming fails
   *
   * Evidence: workflow-execution.service.ts:174-238 (Streaming pattern)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const command = new Command({ resume: { approved: true } });
   * const config = {
   *   configurable: { thread_id: 'thread-123' },
   *   streamMode: 'updates'
   * };
   *
   * for await (const chunk of commandService.streamWithCommand(compiled, command, config)) {
   *   console.log('Update:', chunk);
   * }
   * ```
   */
  async *streamWithCommand<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    compiledGraph: any,
    command: Command,
    config: RunnableConfig & {
      streamMode?:
        | 'values'
        | 'updates'
        | 'messages'
        | 'custom'
        | 'debug'
        | string[];
    }
  ): AsyncIterable<unknown> {
    this.logger.debug(
      `Streaming graph with Command for thread: ${config.configurable?.thread_id}`
    );

    try {
      const stream = await compiledGraph.stream(command, config);

      for await (const chunk of stream) {
        yield chunk;
      }

      this.logger.log(
        `✅ Command streaming complete for thread: ${config.configurable?.thread_id}`
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Command streaming failed for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }
}
