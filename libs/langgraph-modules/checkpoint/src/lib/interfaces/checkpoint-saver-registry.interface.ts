import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

/**
 * Configuration for checkpoint saver instances
 * Users provide the actual checkpoint saver instances they want to use
 */
export interface CheckpointSaverConfig {
  /**
   * The actual checkpoint saver instance
   * Users import and create their own from @langchain/langgraph-checkpoint-* packages
   */
  saver: BaseCheckpointSaver;

  /**
   * Unique name for this saver instance
   */
  name: string;

  /**
   * Whether this is the default saver
   */
  default?: boolean;

  /**
   * Optional metadata about the saver
   */
  metadata?: CheckpointSaverMetadata;
}

/**
 * Metadata about a checkpoint saver
 */
export interface CheckpointSaverMetadata {
  type: string; // e.g., 'memory', 'redis', 'postgres', 'sqlite'
  description?: string;
  persistent: boolean;
  supportsStreaming?: boolean;
  supportsTransactions?: boolean;
  requiresCleanup?: boolean;
}

/**
 * Registry for managing multiple checkpoint savers
 */
export interface ICheckpointSaverRegistry {
  /**
   * Register a checkpoint saver
   */
  registerSaver(config: CheckpointSaverConfig): void;

  /**
   * Get a checkpoint saver by name
   */
  getSaver(name?: string): BaseCheckpointSaver | undefined;

  /**
   * Get the default checkpoint saver
   */
  getDefaultSaver(): BaseCheckpointSaver | undefined;

  /**
   * Get all registered saver names
   */
  getAvailableSavers(): string[];

  /**
   * Get metadata for a saver
   */
  getSaverMetadata(name: string): CheckpointSaverMetadata | undefined;

  /**
   * Check if a saver is registered
   */
  hasSaver(name: string): boolean;

  /**
   * Remove a saver from the registry
   */
  removeSaver(name: string): boolean;
}

/**
 * Configuration for the checkpoint module
 * Users provide pre-configured checkpoint savers
 */
export interface CheckpointModuleConfig {
  /**
   * Array of checkpoint saver configurations
   */
  savers?: CheckpointSaverConfig[];

  /**
   * Global checkpoint settings
   */
  cleanup?: {
    enabled?: boolean;
    maxAge?: number; // milliseconds
    maxPerThread?: number;
    interval?: number; // milliseconds
    excludeThreads?: string[];
  };

  /**
   * Health check settings
   */
  health?: {
    enabled?: boolean;
    checkInterval?: number; // milliseconds
    timeout?: number; // milliseconds
    degradedThreshold?: number; // milliseconds
    unhealthyThreshold?: number; // milliseconds
  };

  /**
   * Metrics collection settings
   */
  metrics?: {
    enabled?: boolean;
    collectInterval?: number; // milliseconds
  };
}
