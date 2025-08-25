import type {
  CheckpointConfig,
  EnhancedCheckpointMetadata,
  EnhancedCheckpoint,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
  CheckpointStats,
  CheckpointCleanupOptions,
  EnhancedBaseCheckpointSaver,
} from './checkpoint.interface';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Factory service for creating different types of checkpoint savers
 */
export interface ICheckpointSaverFactory {
  /**
   * Create a checkpoint saver based on configuration
   */
  createCheckpointSaver: (
    config: CheckpointConfig
  ) => Promise<EnhancedBaseCheckpointSaver>;
}

/**
 * Registry service for managing multiple checkpoint savers
 */
export interface ICheckpointRegistryService {
  /**
   * Register a checkpoint saver
   */
  registerSaver: (
    name: string,
    saver: EnhancedBaseCheckpointSaver,
    isDefault?: boolean
  ) => void;

  /**
   * Get a checkpoint saver by name
   */
  getSaver: (name?: string) => EnhancedBaseCheckpointSaver;

  /**
   * Get the default checkpoint saver
   */
  getDefaultSaver: () => EnhancedBaseCheckpointSaver;

  /**
   * Get all available saver names
   */
  getAvailableSavers: () => string[];

  /**
   * Check if a saver exists
   */
  hasSaver: (name: string) => boolean;

  /**
   * Remove a saver from the registry
   */
  removeSaver: (name: string) => boolean;

  /**
   * Clear all savers
   */
  clearSavers: () => void;

  /**
   * Get default saver name
   */
  getDefaultSaverName: () => string | null;

  /**
   * Get saver info
   */
  getSaverInfo: (name?: string) => {
    name: string;
    isDefault: boolean;
    type: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  };

  /**
   * Get all savers info
   */
  getAllSaversInfo: () => Array<{
    name: string;
    isDefault: boolean;
    type: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  }>;

  /**
   * Get registry statistics
   */
  getRegistryStats: () => {
    totalSavers: number;
    defaultSaver: string | null;
    saverTypes: Record<string, number>;
    availableSavers: string[];
  };

  /**
   * Validate all savers configuration
   */
  validateSavers: () => {
    valid: boolean;
    issues: string[];
    warnings: string[];
  };
}

/**
 * Core persistence service for checkpoint operations
 */
export interface ICheckpointPersistenceService {
  /**
   * Save checkpoint with metadata enrichment
   */
  saveCheckpoint: <
    _T extends Record<string, unknown> = Record<string, unknown>
  >(
    threadId: string,
    checkpoint: unknown, // Checkpoint<T> type
    metadata?: EnhancedCheckpointMetadata,
    saverName?: string
  ) => Promise<void>;

  /**
   * Load checkpoint with version support
   */
  loadCheckpoint: <T extends Record<string, unknown> = Record<string, unknown>>(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ) => Promise<EnhancedCheckpoint<T> | null>;

  /**
   * List checkpoints for time travel with enhanced filtering
   */
  listCheckpoints: (
    threadId: string,
    options?: ListCheckpointsOptions,
    saverName?: string
  ) => Promise<EnhancedCheckpointTuple[]>;

  /**
   * Enrich metadata with additional information
   */
  enrichMetadata: (
    threadId: string,
    metadata?: EnhancedCheckpointMetadata
  ) => EnhancedCheckpointMetadata;

  /**
   * Create enhanced checkpoint with size and checksum
   */
  createEnhancedCheckpoint: <
    T extends Record<string, unknown> = Record<string, unknown>
  >(
    checkpoint: unknown, // Checkpoint<T> type
    metadata: EnhancedCheckpointMetadata
  ) => Promise<EnhancedCheckpoint<T>>;
}

/**
 * Metrics collection service for checkpoint operations
 */
export interface ICheckpointMetricsService {
  /**
   * Record save operation metrics
   */
  recordSaveMetrics: (
    saverName: string,
    duration: number,
    success: boolean
  ) => void;

  /**
   * Record load operation metrics
   */
  recordLoadMetrics: (
    saverName: string,
    duration: number,
    success: boolean
  ) => void;

  /**
   * Get metrics for a specific saver
   */
  getMetrics: (saverName: string) => {
    save: {
      totalTime: number;
      count: number;
      successCount: number;
      errorCount: number;
    };
    load: {
      totalTime: number;
      count: number;
      successCount: number;
      errorCount: number;
    };
  };

  /**
   * Get aggregated metrics across all savers
   */
  getAggregatedMetrics: () => {
    totalOperations: number;
    averageSaveTime: number;
    averageLoadTime: number;
    errorRate: number;
    saverMetrics: Record<
      string,
      {
        save: {
          totalTime: number;
          count: number;
          successCount: number;
          errorCount: number;
        };
        load: {
          totalTime: number;
          count: number;
          successCount: number;
          errorCount: number;
        };
      }
    >;
  };

  /**
   * Reset metrics for a specific saver
   */
  resetMetrics: (saverName?: string) => void;

  /**
   * Get performance insights
   */
  getPerformanceInsights: () => {
    slowestSavers: Array<{ name: string; averageTime: number }>;
    errorProneSavers: Array<{ name: string; errorRate: number }>;
    recommendations: string[];
  };
}

/**
 * Cleanup service with scheduling and policies
 */
export interface ICheckpointCleanupService {
  /**
   * Perform cleanup on a specific saver
   */
  cleanup: (
    options?: CheckpointCleanupOptions,
    saverName?: string
  ) => Promise<number>;

  /**
   * Perform cleanup across all savers
   */
  cleanupAll: (options?: CheckpointCleanupOptions) => Promise<number>;

  /**
   * Start scheduled cleanup
   */
  startScheduledCleanup: (intervalMs?: number) => void;

  /**
   * Stop scheduled cleanup
   */
  stopScheduledCleanup: () => void;

  /**
   * Get cleanup policies
   */
  getCleanupPolicies: () => {
    maxAge: number;
    maxPerThread: number;
    cleanupInterval: number;
    excludeThreads: string[];
  };

  /**
   * Update cleanup policies
   */
  updateCleanupPolicies: (
    policies: Partial<{
      maxAge: number;
      maxPerThread: number;
      cleanupInterval: number;
      excludeThreads: string[];
    }>
  ) => void;

  /**
   * Get cleanup statistics
   */
  getCleanupStats: () => {
    lastCleanupTime: Date | null;
    totalCleanedCheckpoints: number;
    averageCleanupDuration: number;
    cleanupHistory: Array<{
      timestamp: Date;
      saverName: string;
      deletedCount: number;
      duration: number;
    }>;
  };

  /**
   * Perform dry run cleanup to see what would be cleaned
   */
  dryRunCleanup: (
    options?: CheckpointCleanupOptions,
    saverName?: string
  ) => Promise<{
    wouldDelete: number;
    affectedThreads: string[];
    estimatedSpaceSaved: number;
  }>;

  /**
   * Validate cleanup policies
   */
  validatePolicies: () => {
    valid: boolean;
    issues: string[];
    warnings: string[];
  };
}

/**
 * Health monitoring service for checkpoint storage backends
 */
export interface ICheckpointHealthService {
  /**
   * Perform health check on a specific saver
   */
  healthCheck: (saverName?: string) => Promise<boolean>;

  /**
   * Perform health checks on all savers
   */
  healthCheckAll: () => Promise<Record<string, boolean>>;

  /**
   * Get detailed health status
   */
  getHealthStatus: (saverName?: string) => Promise<{
    healthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    responseTime: number;
    error?: string;
    details?: Record<string, unknown>;
  }>;

  /**
   * Get health statistics
   */
  getHealthStats: () => Promise<CheckpointStats>;

  /**
   * Start health monitoring
   */
  startHealthMonitoring: (intervalMs?: number) => void;

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring: () => void;

  /**
   * Get health monitoring configuration
   */
  getHealthConfig: () => {
    checkInterval: number;
    unhealthyThreshold: number;
    degradedThreshold: number;
  };

  /**
   * Update health monitoring configuration
   */
  updateHealthConfig: (
    config: Partial<{
      checkInterval: number;
      unhealthyThreshold: number;
      degradedThreshold: number;
    }>
  ) => void;

  /**
   * Get health history
   */
  getHealthHistory: (saverName?: string) => Array<{
    timestamp: Date;
    saverName: string;
    healthy: boolean;
    responseTime: number;
    error?: string;
  }>;

  /**
   * Get health summary report
   */
  getHealthSummary: () => {
    overall: {
      healthy: boolean;
      totalSavers: number;
      healthySavers: number;
      degradedSavers: number;
      unhealthySavers: number;
    };
    savers: Record<
      string,
      {
        status: {
          healthy: boolean;
          status: 'healthy' | 'degraded' | 'unhealthy';
          lastCheck: Date;
          responseTime: number;
          error?: string;
          details?: Record<string, unknown>;
        };
        uptime: number;
        averageResponseTime: number;
        recentErrors: number;
      }
    >;
    trends: {
      healthTrend: 'improving' | 'stable' | 'degrading';
      responseTimeTrend: 'improving' | 'stable' | 'degrading';
      errorTrend: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  };

  /**
   * Get detailed diagnostic information
   */
  getDiagnosticInfo: (saverName?: string) => Promise<{
    saver: string;
    status: {
      healthy: boolean;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: Date;
      responseTime: number;
      error?: string;
      details?: Record<string, unknown>;
    };
    storageInfo?: {
      type: string;
      version?: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: Record<string, unknown>;
    };
    metrics: {
      operations: {
        save: {
          totalTime: number;
          count: number;
          successCount: number;
          errorCount: number;
        };
        load: {
          totalTime: number;
          count: number;
          successCount: number;
          errorCount: number;
        };
      };
      performance: {
        averageSaveTime: number;
        averageLoadTime: number;
      };
    };
    issues: string[];
    suggestions: string[];
  }>;
}

/**
 * Abstract base class for checkpoint services
 */
@Injectable()
export abstract class BaseCheckpointService {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Calculate checkpoint size for monitoring
   */
  protected calculateCheckpointSize(checkpoint: unknown): number {
    try {
      return JSON.stringify(checkpoint).length;
    } catch (error) {
      this.logger.warn('Failed to calculate checkpoint size:', error);
      return 0;
    }
  }

  /**
   * Calculate checksum for integrity verification
   */
  protected async calculateChecksum(checkpoint: unknown): Promise<string> {
    try {
      const crypto = await import('crypto');
      const data = JSON.stringify(checkpoint);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.logger.warn('Failed to calculate checkpoint checksum:', error);
      return '';
    }
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /temporary/i,
      /busy/i,
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Create standardized error
   */
  protected createError(
    message: string,
    code: string,
    originalError?: Error,
    additionalData?: Record<string, unknown>
  ): Error & { code: string } {
    const error = new Error(message) as Error & { code: string };
    error.code = code;

    if (originalError) {
      (error as Error & { cause?: Error }).cause = originalError;
    }

    if (additionalData) {
      Object.assign(error, additionalData);
    }

    return error;
  }
}
