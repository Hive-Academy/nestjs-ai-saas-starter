// Import the specific checkpoint saver for this demo application
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import * as fs from 'fs';
import * as path from 'path';

import type { CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

/**
 * Checkpoint Configuration for Demo Application
 *
 * This demo uses SQLite for persistent checkpoint storage.
 * The checkpoint library will handle fallback to memory if SQLite fails.
 */
export async function getCheckpointConfig(): Promise<CheckpointModuleOptions> {
  // Configure SQLite checkpoint saver for demo
  const dbPath = process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db';

  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // CRITICAL FIX: await the async SqliteSaver initialization
  const saver = await SqliteSaver.fromConnString(dbPath);

  return {
    // Pass the configured saver to the checkpoint library
    // The library will handle fallback to memory if saver is undefined
    saver,

    cleanup: {
      enabled: process.env.CHECKPOINT_CLEANUP_ENABLED !== 'false',
      maxAge: parseInt(process.env.CHECKPOINT_MAX_AGE || '604800000', 10), // 7 days
      maxPerThread: parseInt(
        process.env.CHECKPOINT_MAX_PER_THREAD || '100',
        10
      ),
      interval: parseInt(
        process.env.CHECKPOINT_CLEANUP_INTERVAL || '3600000',
        10
      ), // 1 hour
    },

    health: {
      enabled: process.env.CHECKPOINT_HEALTH_ENABLED !== 'false',
      checkInterval: parseInt(
        process.env.CHECKPOINT_HEALTH_INTERVAL || '30000',
        10
      ), // 30 seconds
      timeout: parseInt(process.env.CHECKPOINT_HEALTH_TIMEOUT || '5000', 10), // 5 seconds
    },

    metrics: {
      enabled: process.env.CHECKPOINT_METRICS_ENABLED !== 'false',
      collectInterval: parseInt(
        process.env.CHECKPOINT_METRICS_INTERVAL || '60000',
        10
      ), // 1 minute
    },
  };
}
