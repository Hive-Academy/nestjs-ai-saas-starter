import { Logger } from '@nestjs/common';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

/**
 * Workflow Replay Helper
 *
 * Simplified replay functionality that delegates to LangGraph's native checkpoint system.
 * NO custom execution engines - use LangGraph's graph.invoke() with thread_id for replay.
 */

const logger = new Logger('WorkflowReplayHelper');

/**
 * Replay options for checkpoint-based workflow replay
 */
export interface ReplayOptions<T = Record<string, unknown>> {
  /**
   * Optional new thread ID for isolated replay
   * If not provided, replays in the same thread
   */
  newThreadId?: string;

  /**
   * Optional state modifications to apply before replay
   */
  stateModifications?: Partial<T>;

  /**
   * Preserves original timestamps from checkpoint
   * @default false
   */
  preserveTimestamps?: boolean;
}

/**
 * Checkpoint replay result
 */
export interface CheckpointReplayResult<T = Record<string, unknown>> {
  /**
   * The checkpoint ID that was replayed from
   */
  checkpointId: string;

  /**
   * The thread ID used for replay
   */
  threadId: string;

  /**
   * The restored state from the checkpoint
   */
  state: T;

  /**
   * Checkpoint timestamp
   */
  timestamp: Date;

  /**
   * Whether the checkpoint was found and loaded successfully
   */
  success: boolean;

  /**
   * Optional error if replay failed
   */
  error?: Error;
}

/**
 * Validation result for replay capability
 */
export interface CanReplayResult {
  /**
   * Whether the checkpoint can be replayed
   */
  canReplay: boolean;

  /**
   * Reason why replay cannot be performed (if applicable)
   */
  reason?: string;

  /**
   * Workflow name extracted from checkpoint state
   */
  workflowName?: string;
}

/**
 * Replay workflow from specific checkpoint using LangGraph's native checkpoint system
 *
 * PATTERN:
 * 1. Load checkpoint state from checkpoint adapter
 * 2. Apply optional state modifications
 * 3. Return state for replay via LangGraph's graph.invoke()
 *
 * NOTE: This helper does NOT execute the workflow. It prepares the state for replay.
 * Actual replay execution should use LangGraph's native graph.invoke() with thread_id:
 *
 * @example
 * ```typescript
 * const replayResult = await replayFromCheckpoint(checkpointAdapter, 'thread-123', 'checkpoint-456');
 *
 * // Use LangGraph's native replay:
 * const output = await graph.invoke(replayResult.state, {
 *   configurable: {
 *     thread_id: replayResult.threadId,
 *   },
 * });
 * ```
 *
 * @param checkpointAdapter - The checkpoint adapter for loading checkpoints
 * @param threadId - The thread ID containing the checkpoint
 * @param checkpointId - The checkpoint ID to replay from
 * @param options - Optional replay configuration
 * @returns Checkpoint replay result with restored state
 */
export async function replayFromCheckpoint<T extends Record<string, unknown>>(
  checkpointAdapter: BaseCheckpointSaver,
  threadId: string,
  checkpointId: string,
  options: ReplayOptions<T> = {}
): Promise<CheckpointReplayResult<T>> {
  try {
    logger.log(
      `Replaying workflow from checkpoint ${checkpointId} for thread ${threadId}`
    );

    // 1. Load checkpoint using checkpoint adapter's getTuple() method
    const checkpointTuple = await checkpointAdapter.getTuple({
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpointId,
      },
    });

    if (!checkpointTuple) {
      const error = new Error(
        `Checkpoint ${checkpointId} not found for thread ${threadId}`
      );
      logger.error(error.message);

      return {
        checkpointId,
        threadId,
        state: {} as T,
        timestamp: new Date(),
        success: false,
        error,
      };
    }

    const { checkpoint } = checkpointTuple;

    // 2. Extract channel values (workflow state)
    let replayState = checkpoint.channel_values as T;

    // 3. Apply state modifications if provided
    if (options.stateModifications) {
      replayState = {
        ...replayState,
        ...options.stateModifications,
      };

      logger.debug(
        `Applied state modifications for replay: ${Object.keys(
          options.stateModifications
        ).join(', ')}`
      );
    }

    // 4. Determine thread ID for replay
    const replayThreadId = options.newThreadId ?? threadId;

    logger.log(
      `Checkpoint loaded successfully. Use graph.invoke() with thread_id="${replayThreadId}" to replay execution.`
    );

    return {
      checkpointId,
      threadId: replayThreadId,
      state: replayState,
      timestamp: new Date(checkpoint.ts), // Use checkpoint timestamp
      success: true,
    };
  } catch (error) {
    logger.error(
      `Failed to replay from checkpoint ${checkpointId}:`,
      error instanceof Error ? error.message : String(error)
    );

    return {
      checkpointId,
      threadId,
      state: {} as T,
      timestamp: new Date(),
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Validate if a checkpoint can be replayed
 *
 * Checks if:
 * - Checkpoint exists in storage
 * - Checkpoint contains valid state
 * - Checkpoint metadata is accessible
 *
 * @param checkpointAdapter - The checkpoint adapter for loading checkpoints
 * @param threadId - The thread ID containing the checkpoint
 * @param checkpointId - The checkpoint ID to validate
 * @returns Validation result indicating if replay is possible
 */
export async function canReplayCheckpoint(
  checkpointAdapter: BaseCheckpointSaver,
  threadId: string,
  checkpointId: string
): Promise<CanReplayResult> {
  try {
    // Load checkpoint to validate it exists and is accessible
    const checkpointTuple = await checkpointAdapter.getTuple({
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpointId,
      },
    });

    if (!checkpointTuple) {
      return {
        canReplay: false,
        reason: `Checkpoint ${checkpointId} not found for thread ${threadId}`,
      };
    }

    const { checkpoint } = checkpointTuple;

    // Validate checkpoint has channel values (state)
    if (!checkpoint.channel_values) {
      return {
        canReplay: false,
        reason: 'Checkpoint missing channel_values (state)',
      };
    }

    // Extract workflow name from checkpoint metadata if available
    const workflowName = (checkpoint.channel_values as Record<string, unknown>)
      ?.workflowName as string | undefined;

    return {
      canReplay: true,
      workflowName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      canReplay: false,
      reason: `Error validating checkpoint: ${errorMessage}`,
    };
  }
}

/**
 * Get checkpoint state without replay execution
 *
 * Useful for inspecting checkpoint state before deciding to replay
 *
 * @param checkpointAdapter - The checkpoint adapter for loading checkpoints
 * @param threadId - The thread ID containing the checkpoint
 * @param checkpointId - The checkpoint ID to inspect
 * @returns Checkpoint state or null if not found
 */
export async function getCheckpointState<T extends Record<string, unknown>>(
  checkpointAdapter: BaseCheckpointSaver,
  threadId: string,
  checkpointId: string
): Promise<T | null> {
  try {
    const checkpointTuple = await checkpointAdapter.getTuple({
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpointId,
      },
    });

    return checkpointTuple
      ? (checkpointTuple.checkpoint.channel_values as T)
      : null;
  } catch (error) {
    logger.error(
      `Failed to get checkpoint state for ${checkpointId}:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}
