/**
 * LangGraph Native Checkpoint Configuration
 *
 * ARCHITECTURE CHANGE (2025-01-11):
 * - Migrated from custom checkpoint package to LangGraph native
 * - Production: RedisSaver (fast, scalable, existing Docker Compose config)
 * - Development: SqliteSaver (simple, local, no external dependencies)
 * - No custom abstraction layer - direct LangGraph API usage
 *
 * Reference: https://docs.langchain.com/oss/javascript/langgraph/persistence
 */

import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type * as CheckpointMemory from '@langchain/langgraph-checkpoint';
import type * as CheckpointRedis from '@langchain/langgraph-checkpoint-redis';
import type * as CheckpointSqlite from '@langchain/langgraph-checkpoint-sqlite';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Native ESM dynamic import that bypasses webpack's static analyzer.
 *
 * Webpack's `target: 'node'` rewrites both `require()` AND `await import()` into
 * synchronous CJS `require()` calls. That breaks for ESM-only packages
 * (`@langchain/langgraph-checkpoint*`) because Node refuses to `require()` an
 * ESM module — surfaces as `ERR_REQUIRE_ESM` at boot.
 *
 * Using `new Function('return import(...)')()` evaluates the `import()` at
 * runtime through `Function`, which webpack's bundler does not statically
 * analyze. Result: a real native dynamic `import()` survives into the bundle,
 * Node treats it as ESM, and the package loads correctly.
 *
 * @see https://webpack.js.org/api/module-methods/#import-1 (limitations)
 */
function esmImport<T>(specifier: string): Promise<T> {
  return new Function('s', 'return import(s)')(specifier) as Promise<T>;
}

/**
 * Create checkpoint saver for LangGraph workflows
 *
 * Environment-based selection:
 * - PRODUCTION: RedisSaver (recommended for enterprise)
 * - DEVELOPMENT: SqliteSaver (recommended for local workflows)
 * - TEST/FALLBACK: MemorySaver (in-memory, non-persistent)
 *
 * @returns Promise<BaseCheckpointSaver> - LangGraph native checkpoint saver
 */
export async function getCheckpointSaver(): Promise<BaseCheckpointSaver> {
  const env = process.env.NODE_ENV || 'development';

  try {
    // ===================================================================
    // PRODUCTION: RedisSaver (Enterprise-grade, scalable)
    // ===================================================================
    if (env === 'production') {
      const { RedisSaver } = await esmImport<typeof CheckpointRedis>(
        '@langchain/langgraph-checkpoint-redis'
      );
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      console.log(`📦 Initializing RedisSaver for production...`);
      console.log(`   Redis URL: ${redisUrl.replace(/\/\/.*@/, '//***@')}`); // Hide credentials

      const checkpointer = await RedisSaver.fromUrl(redisUrl, {
        // Checkpoint TTL (time-to-live) configuration
        defaultTTL: parseInt(process.env.CHECKPOINT_TTL_MINUTES || '10080', 10), // 7 days default

        // Refresh TTL on read (extend checkpoint lifetime when accessed)
        refreshOnRead: process.env.CHECKPOINT_REFRESH_ON_READ !== 'false',
      });

      console.log('✅ Checkpoint: RedisSaver initialized (production)');
      console.log(
        `   TTL: ${process.env.CHECKPOINT_TTL_MINUTES || '10080'} minutes`
      );
      console.log(
        `   Refresh on read: ${
          process.env.CHECKPOINT_REFRESH_ON_READ !== 'false'
        }`
      );

      return checkpointer as unknown as BaseCheckpointSaver;
    }

    // ===================================================================
    // DEVELOPMENT: SqliteSaver (Local workflows, debugging)
    // ===================================================================
    if (env === 'development') {
      const { SqliteSaver } = await esmImport<typeof CheckpointSqlite>(
        '@langchain/langgraph-checkpoint-sqlite'
      );
      const dbPath =
        process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db';

      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`📁 Created checkpoint directory: ${dbDir}`);
      }

      console.log(`📦 Initializing SqliteSaver for development...`);
      console.log(`   Database: ${dbPath}`);

      const checkpointer = SqliteSaver.fromConnString(dbPath);

      console.log('✅ Checkpoint: SqliteSaver initialized (development)');

      return checkpointer as unknown as BaseCheckpointSaver;
    }

    // ===================================================================
    // TEST/FALLBACK: MemorySaver (Non-persistent, in-memory)
    // ===================================================================
    console.warn(
      '⚠️  No persistent checkpoint configured - using MemorySaver (in-memory)'
    );
    console.warn('   Checkpoints will be lost on restart!');
    console.warn(
      '   For persistence, set NODE_ENV to "production" or "development"'
    );

    const { MemorySaver } = await esmImport<typeof CheckpointMemory>(
      '@langchain/langgraph-checkpoint'
    );
    return new MemorySaver() as unknown as BaseCheckpointSaver;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error('❌ Failed to initialize checkpoint saver:', errorMsg);
    console.error('   Falling back to MemorySaver (non-persistent)');

    // Fallback to in-memory saver (no persistence)
    const { MemorySaver } = await esmImport<typeof CheckpointMemory>(
      '@langchain/langgraph-checkpoint'
    );
    return new MemorySaver() as unknown as BaseCheckpointSaver;
  }
}

/**
 * Validate checkpoint configuration
 * Called during app initialization to ensure checkpoint system is ready
 */
export async function validateCheckpointConfig(): Promise<void> {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // Validate Redis configuration
    if (!process.env.REDIS_URL) {
      console.warn(
        '⚠️  REDIS_URL not configured - using default redis://localhost:6379'
      );
      console.warn(
        '   Set REDIS_URL environment variable for production Redis instance'
      );
    }

    // Validate TTL configuration
    const ttl = parseInt(process.env.CHECKPOINT_TTL_MINUTES || '10080', 10);
    if (ttl < 60) {
      console.warn(`⚠️  Checkpoint TTL is very low (${ttl} minutes)`);
      console.warn(
        '   Consider increasing CHECKPOINT_TTL_MINUTES for production'
      );
    }
  }

  if (env === 'development') {
    // Validate SQLite path
    const dbPath =
      process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db';

    if (!path.isAbsolute(dbPath) && !dbPath.startsWith('./')) {
      console.warn(`⚠️  Checkpoint path is relative: ${dbPath}`);
      console.warn(
        '   Consider using absolute path or "./" prefix for clarity'
      );
    }
  }

  console.log('✅ Checkpoint configuration validated');
}

/**
 * Get checkpoint configuration summary for debugging
 */
export function getCheckpointConfigSummary(): Record<string, any> {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return {
      environment: 'production',
      saver: 'RedisSaver',
      redisUrl: (process.env.REDIS_URL || 'redis://localhost:6379').replace(
        /\/\/.*@/,
        '//***@'
      ),
      ttlMinutes: parseInt(process.env.CHECKPOINT_TTL_MINUTES || '10080', 10),
      refreshOnRead: process.env.CHECKPOINT_REFRESH_ON_READ !== 'false',
      keyPrefix: process.env.CHECKPOINT_KEY_PREFIX || 'langgraph:checkpoint:',
    };
  }

  if (env === 'development') {
    return {
      environment: 'development',
      saver: 'SqliteSaver',
      databasePath:
        process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db',
    };
  }

  return {
    environment: env,
    saver: 'MemorySaver',
    persistent: false,
  };
}
