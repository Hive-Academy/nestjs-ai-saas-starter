import { Injectable, Logger } from '@nestjs/common';
import type { Checkpoint } from '@langchain/langgraph-checkpoint';
import type {
  ILangGraphCheckpointSaver,
  LangGraphCheckpointTuple,
} from '../interfaces/langgraph-checkpoint.interface';
import type { CheckpointCleanupOptions } from '../interfaces/checkpoint.interface';
import { CheckpointSaverRegistry } from './checkpoint-saver.registry';

/**
 * Simplified checkpoint manager service - thin wrapper around native LangGraph savers
 * Provides only essential operations: getLangGraphSaver(), listCheckpoints(), loadCheckpoint(), cleanupCheckpoints()
 */
@Injectable()
export class CheckpointManagerService {
  private readonly logger = new Logger(CheckpointManagerService.name);

  constructor(private readonly saverRegistry: CheckpointSaverRegistry) {}

  /**
   * CRITICAL: Get native LangGraph saver for use with graph.compile({ checkpointer })
   * This is the most important method - it provides the actual saver for LangGraph
   */
  getLangGraphSaver(saverName?: string): ILangGraphCheckpointSaver | null {
    const saver = saverName
      ? this.saverRegistry.getSaver(saverName)
      : this.saverRegistry.getDefaultSaver();

    return (saver as ILangGraphCheckpointSaver) || null;
  }

  /**
   * List checkpoints for a thread (query helper)
   * Direct delegation to native saver's list() method
   */
  async listCheckpoints(
    threadId: string,
    options?: { limit?: number; offset?: number },
    saverName?: string
  ): Promise<readonly LangGraphCheckpointTuple[]> {
    const saver = this.getLangGraphSaver(saverName);
    if (!saver) {
      this.logger.warn('No checkpoint saver available');
      return [];
    }

    const config = { configurable: { thread_id: threadId } };
    const iterator = saver.list(config, { limit: options?.limit });

    const checkpoints: LangGraphCheckpointTuple[] = [];
    for await (const checkpoint of iterator) {
      checkpoints.push(checkpoint);
      if (options?.limit && checkpoints.length >= options.limit) break;
    }

    return checkpoints;
  }

  /**
   * Load checkpoint for a thread (query helper)
   * Direct delegation to native saver's getTuple() method
   */
  async loadCheckpoint(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<Checkpoint | null> {
    const saver = this.getLangGraphSaver(saverName);
    if (!saver) {
      this.logger.warn('No checkpoint saver available');
      return null;
    }

    const config = {
      configurable: {
        thread_id: threadId,
        ...(checkpointId && { checkpoint_id: checkpointId }),
      },
    };

    const tuple = await saver.getTuple(config);
    return tuple?.checkpoint || null;
  }

  /**
   * Cleanup old checkpoints (maintenance helper)
   * Most LangGraph savers don't expose cleanup - may require direct DB access
   */
  async cleanupCheckpoints(
    options: CheckpointCleanupOptions = {}
  ): Promise<number> {
    this.logger.debug('Checkpoint cleanup requested', options);
    // Cleanup implementation depends on saver capabilities
    // Most native savers don't provide cleanup - implement at DB level if needed
    return 0;
  }
}
