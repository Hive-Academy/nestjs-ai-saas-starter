import { Logger } from '@nestjs/common';
import type {
  BaseCheckpointSaver,
  CheckpointTuple,
  CheckpointMetadata,
} from '@langchain/langgraph-checkpoint';

/**
 * Checkpoint Timeline Helper
 *
 * Simplified timeline visualization that delegates to LangGraph's checkpoint system.
 * NO custom history storage - use checkpoint adapter's listCheckpoints().
 */

const logger = new Logger('CheckpointTimelineHelper');

/**
 * Checkpoint event for timeline visualization
 */
export interface CheckpointEvent {
  /**
   * The checkpoint ID
   */
  checkpointId: string;

  /**
   * The thread ID this checkpoint belongs to
   */
  threadId: string;

  /**
   * Node ID or step identifier
   */
  nodeId: string;

  /**
   * When the checkpoint was created
   */
  timestamp: Date;

  /**
   * Checkpoint metadata (if available)
   */
  metadata?: CheckpointMetadata;

  /**
   * Step number in the execution sequence
   */
  step?: number;
}

/**
 * Get checkpoint timeline for a thread
 *
 * Returns a chronological list of checkpoints for timeline visualization.
 * Uses the checkpoint adapter's native listCheckpoints() method.
 *
 * @example
 * ```typescript
 * const timeline = await getCheckpointTimeline(checkpointAdapter, 'thread-123');
 *
 * console.log(`Found ${timeline.length} checkpoints`);
 * timeline.forEach(event => {
 *   console.log(`${event.timestamp.toISOString()} - ${event.nodeId} (${event.checkpointId})`);
 * });
 * ```
 *
 * @param checkpointAdapter - The checkpoint adapter for listing checkpoints
 * @param threadId - The thread ID to get timeline for
 * @param options - Optional filtering and pagination options
 * @returns Array of checkpoint events in chronological order
 */
export async function getCheckpointTimeline(
  checkpointAdapter: BaseCheckpointSaver,
  threadId: string,
  options?: {
    /**
     * Maximum number of checkpoints to return
     * @default 100
     */
    limit?: number;

    /**
     * Offset for pagination
     * @default 0
     */
    offset?: number;
  }
): Promise<CheckpointEvent[]> {
  try {
    logger.debug(
      `Retrieving checkpoint timeline for thread ${threadId} (limit: ${
        options?.limit || 100
      }, offset: ${options?.offset || 0})`
    );

    // Use checkpoint adapter's native list() method (async generator)
    const checkpointsGenerator = checkpointAdapter.list(
      { configurable: { thread_id: threadId } },
      {
        limit: options?.limit || 100,
      }
    );

    // Collect checkpoints from async generator
    const checkpoints: CheckpointTuple[] = [];
    for await (const tuple of checkpointsGenerator) {
      checkpoints.push(tuple);
    }

    // Transform checkpoint tuples into timeline events
    const events: CheckpointEvent[] = checkpoints.map((tuple) => {
      const { config, checkpoint, metadata } = tuple;

      // Extract thread_id from config if available
      const configThreadId = (config as any)?.configurable?.thread_id as
        | string
        | undefined;

      return {
        checkpointId: checkpoint.id,
        threadId: configThreadId ?? threadId,
        nodeId: String(metadata?.step ?? 'unknown'),
        timestamp: new Date(checkpoint.ts),
        metadata,
        step: metadata?.step,
      };
    });

    // Sort by timestamp (ascending - chronological order)
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    logger.debug(
      `Retrieved ${events.length} checkpoint events for thread ${threadId}`
    );

    return events;
  } catch (error) {
    logger.error(
      `Failed to get checkpoint timeline for thread ${threadId}:`,
      error instanceof Error ? error.message : String(error)
    );

    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Visualize execution path as ASCII timeline
 *
 * Creates a simple ASCII visualization of the checkpoint timeline.
 * Useful for debugging and understanding execution flow.
 *
 * @example
 * ```typescript
 * const visualization = await visualizeExecutionPath(checkpointAdapter, 'thread-123');
 * console.log(visualization);
 * // Output:
 * // Execution Timeline for thread-123
 * // =====================================
 * // 1. [2025-01-08T14:00:00.000Z] start (ckpt_abc123)
 * // 2. [2025-01-08T14:00:01.500Z] process (ckpt_def456)
 * // 3. [2025-01-08T14:00:03.200Z] end (ckpt_ghi789)
 * ```
 *
 * @param checkpointAdapter - The checkpoint adapter for listing checkpoints
 * @param threadId - The thread ID to visualize
 * @param options - Optional visualization options
 * @returns ASCII string visualization of the execution timeline
 */
export async function visualizeExecutionPath(
  checkpointAdapter: BaseCheckpointSaver,
  threadId: string,
  options?: {
    /**
     * Maximum number of events to visualize
     * @default 50
     */
    limit?: number;

    /**
     * Show full checkpoint IDs (default: abbreviated)
     * @default false
     */
    fullCheckpointIds?: boolean;

    /**
     * Show metadata in visualization
     * @default false
     */
    showMetadata?: boolean;
  }
): Promise<string> {
  try {
    logger.debug(
      `Generating execution path visualization for thread ${threadId}`
    );

    // Get checkpoint timeline
    const timeline = await getCheckpointTimeline(checkpointAdapter, threadId, {
      limit: options?.limit || 50,
    });

    if (timeline.length === 0) {
      return `No checkpoints found for thread ${threadId}`;
    }

    // Build ASCII visualization
    const lines: string[] = [];

    // Header
    lines.push(`Execution Timeline for ${threadId}`);
    lines.push('='.repeat(60));
    lines.push('');

    // Timeline events
    timeline.forEach((event, index) => {
      // Format checkpoint ID (abbreviated or full)
      const checkpointDisplay = options?.fullCheckpointIds
        ? event.checkpointId
        : abbreviateCheckpointId(event.checkpointId);

      // Basic event line
      const eventLine = `${(index + 1)
        .toString()
        .padStart(3, ' ')}. [${event.timestamp.toISOString()}] ${
        event.nodeId
      } (${checkpointDisplay})`;

      lines.push(eventLine);

      // Add metadata if requested
      if (options?.showMetadata && event.metadata) {
        const metadataKeys = Object.keys(event.metadata).filter(
          (key) => key !== 'timestamp' && key !== 'step'
        );

        if (metadataKeys.length > 0) {
          lines.push(
            `     Metadata: ${JSON.stringify(
              Object.fromEntries(
                metadataKeys.map((key) => [key, (event.metadata as any)[key]])
              ),
              null,
              2
            )
              .split('\n')
              .map((line, i) => (i === 0 ? line : `     ${line}`))
              .join('\n')}`
          );
        }
      }
    });

    // Footer
    lines.push('');
    lines.push('='.repeat(60));
    lines.push(`Total checkpoints: ${timeline.length}`);

    if (timeline.length > 0) {
      const duration =
        timeline[timeline.length - 1].timestamp.getTime() -
        timeline[0].timestamp.getTime();
      lines.push(`Execution duration: ${(duration / 1000).toFixed(2)}s`);
    }

    const visualization = lines.join('\n');

    logger.debug(
      `Generated visualization with ${timeline.length} events for thread ${threadId}`
    );

    return visualization;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      `Failed to visualize execution path for thread ${threadId}:`,
      errorMessage
    );

    return `Error visualizing execution path: ${errorMessage}`;
  }
}

/**
 * Abbreviate checkpoint ID for compact display
 *
 * @param checkpointId - Full checkpoint ID
 * @returns Abbreviated checkpoint ID (first 8 characters)
 */
function abbreviateCheckpointId(checkpointId: string): string {
  return checkpointId.length > 12
    ? `${checkpointId.slice(0, 8)}...`
    : checkpointId;
}

/**
 * Get checkpoint count for a thread
 *
 * Utility function to quickly check how many checkpoints exist for a thread.
 *
 * @param checkpointAdapter - The checkpoint adapter for listing checkpoints
 * @param threadId - The thread ID to count checkpoints for
 * @returns Number of checkpoints for the thread
 */
export async function getCheckpointCount(
  checkpointAdapter: BaseCheckpointSaver,
  threadId: string
): Promise<number> {
  try {
    // Use checkpoint adapter's native list() method (async generator)
    const checkpointsGenerator = checkpointAdapter.list(
      { configurable: { thread_id: threadId } },
      {
        limit: 1000, // High limit to get accurate count
      }
    );

    // Count checkpoints from async generator
    let count = 0;
    for await (const _ of checkpointsGenerator) {
      count++;
    }

    return count;
  } catch (error) {
    logger.error(
      `Failed to get checkpoint count for thread ${threadId}:`,
      error instanceof Error ? error.message : String(error)
    );

    return 0;
  }
}
