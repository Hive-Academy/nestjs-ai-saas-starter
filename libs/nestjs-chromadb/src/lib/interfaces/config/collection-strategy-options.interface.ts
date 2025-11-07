/**
 * Collection initialization strategy configuration
 *
 * Controls when and how ChromaDB collections are initialized during application lifecycle.
 * This configuration allows fine-tuning of startup performance and resource allocation.
 */

/**
 * Collection initialization mode
 *
 * - 'eager': Initialize all collections during module bootstrap (default for backward compatibility)
 * - 'lazy': Initialize collections on first use (recommended for production - faster startup)
 * - 'manual': Require explicit initialization via CollectionRegistryService
 */
export type CollectionInitMode = 'eager' | 'lazy' | 'manual';

/**
 * Collection initialization strategy configuration options
 *
 * @example
 * ```typescript
 * // Production-optimized configuration
 * collectionStrategy: {
 *   mode: 'lazy',              // Defer initialization until first use
 *   enableBatching: true,       // Batch-initialize collections when possible
 *   waitForConnection: true,    // Wait for ChromaDB connection before initializing
 *   maxParallelInit: 3,         // Limit concurrent initializations during startup
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Development-friendly configuration
 * collectionStrategy: {
 *   mode: 'eager',              // Initialize immediately for debugging visibility
 *   enableBatching: false,      // Individual initialization for clearer logs
 *   waitForConnection: true,    // Prevent race conditions
 *   maxParallelInit: 5,         // Default semaphore limit
 * }
 * ```
 */
export interface CollectionStrategyOptions {
  /**
   * When to initialize collections
   *
   * @default 'eager' - Current behavior (initialize during module bootstrap)
   *
   * **Performance Impact**:
   * - 'eager': +150ms startup time (all collections initialized upfront)
   * - 'lazy': -150ms startup time (collections initialized on-demand)
   * - 'manual': No automatic initialization (application-controlled)
   */
  mode?: CollectionInitMode;

  /**
   * Whether to batch-initialize collections in a single transaction
   *
   * @default false
   *
   * **Benefits**:
   * - Better semaphore utilization (controlled batch vs random arrival)
   * - Cleaner logging (single log line instead of per-collection)
   * - Easier performance monitoring
   *
   * **When to enable**:
   * - Production environments with many collections (>5)
   * - Applications with strict startup time requirements
   */
  enableBatching?: boolean;

  /**
   * Wait for ChromaDB connection before initializing collections
   *
   * @default true (recommended to prevent race conditions)
   *
   * **Benefits**:
   * - Eliminates retry waste (no failed connection attempts)
   * - Faster overall initialization (no 24ms connection delay per operation)
   * - Cleaner logs (no "Connection not established" warnings)
   *
   * **Trade-offs**:
   * - Slightly slower first operation (waits for connection)
   * - Sequential dependency (connection -> initialization)
   */
  waitForConnection?: boolean;

  /**
   * Maximum number of collections to initialize in parallel
   *
   * @default undefined (uses global maxConcurrentOperations from connection config)
   *
   * **When to customize**:
   * - Lower values (2-3): Conservative startup, resource-limited environments
   * - Higher values (8-10): High-throughput production, powerful ChromaDB server
   * - Match to ChromaDB server capacity and available resources
   *
   * **Note**: This overrides the global semaphore limit specifically for startup initialization.
   * After startup, normal operation uses the global maxConcurrentOperations setting.
   */
  maxParallelInit?: number;

  /**
   * Enable detailed initialization logging
   *
   * @default false (production mode - minimal logging)
   *
   * **Logs enabled when true**:
   * - Collection initialization start/completion
   * - Semaphore queue metrics (active/queued operations)
   * - Connection establishment timing
   * - Batch initialization summaries
   */
  enableVerboseLogging?: boolean;
}

/**
 * Default collection strategy configuration (backward-compatible defaults)
 */
export const DEFAULT_COLLECTION_STRATEGY: Required<CollectionStrategyOptions> =
  {
    mode: 'eager', // Preserve existing behavior
    enableBatching: false, // Individual initialization for compatibility
    waitForConnection: true, // Prevent race conditions (safe default)
    maxParallelInit: 5, // Match default semaphore limit
    enableVerboseLogging: false, // Minimal logging for production
  };

/**
 * Production-optimized collection strategy preset
 *
 * Optimizes for:
 * - Fast startup time (lazy initialization)
 * - Efficient resource utilization (batching enabled)
 * - Stability (connection-aware initialization)
 * - Conservative concurrency (lower parallel limit)
 */
export const PRODUCTION_COLLECTION_STRATEGY: Required<CollectionStrategyOptions> =
  {
    mode: 'lazy', // ✅ Defer initialization (150ms faster startup)
    enableBatching: true, // ✅ Batch operations for efficiency
    waitForConnection: true, // ✅ Prevent retry waste
    maxParallelInit: 3, // ✅ Conservative for stability
    enableVerboseLogging: false, // ✅ Minimal logging
  };

/**
 * Development-friendly collection strategy preset
 *
 * Optimizes for:
 * - Visibility (eager initialization with verbose logging)
 * - Debugging (individual operations, detailed logs)
 * - Quick iteration (higher concurrency for faster bootstrapping)
 */
export const DEVELOPMENT_COLLECTION_STRATEGY: Required<CollectionStrategyOptions> =
  {
    mode: 'eager', // ✅ Immediate initialization for visibility
    enableBatching: false, // ✅ Individual ops for clearer logs
    waitForConnection: true, // ✅ Prevent race conditions
    maxParallelInit: 5, // ✅ Higher concurrency for speed
    enableVerboseLogging: true, // ✅ Detailed logging for debugging
  };

/**
 * High-performance collection strategy preset
 *
 * Optimizes for:
 * - Maximum throughput (lazy + batching + high concurrency)
 * - Resource efficiency (aggressive batching)
 * - Scalability (handles large numbers of collections)
 */
export const HIGHPERF_COLLECTION_STRATEGY: Required<CollectionStrategyOptions> =
  {
    mode: 'lazy', // ✅ On-demand initialization
    enableBatching: true, // ✅ Aggressive batching
    waitForConnection: true, // ✅ Eliminate retries
    maxParallelInit: 10, // ✅ High concurrency for throughput
    enableVerboseLogging: false, // ✅ Minimal logging overhead
  };
