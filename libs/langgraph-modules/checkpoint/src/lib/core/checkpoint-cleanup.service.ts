import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ICheckpointCleanupService } from '../interfaces/checkpoint-services.interface';
import { BaseCheckpointService } from '../interfaces/checkpoint-services.interface';
import type { CheckpointCleanupOptions } from '../interfaces/checkpoint.interface';
import type { CheckpointModuleOptions } from '../checkpoint.module';
import { CheckpointSaverRegistry } from './checkpoint-saver.registry';

interface CleanupPolicies {
  maxAge: number;
  maxPerThread: number;
  cleanupInterval: number;
  excludeThreads: string[];
}

interface CleanupRecord {
  timestamp: Date;
  saverName: string;
  deletedCount: number;
  duration: number;
  error?: string;
}

/**
 * Cleanup service with scheduling and configurable policies
 * Handles automated and manual cleanup of old checkpoints
 */
@Injectable()
export class CheckpointCleanupService
  extends BaseCheckpointService
  implements ICheckpointCleanupService, OnModuleDestroy
{
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupPolicies: CleanupPolicies;
  private readonly cleanupHistory: CleanupRecord[] = [];
  private totalCleanedCheckpoints = 0;
  private lastCleanupTime: Date | null = null;
  private readonly maxHistorySize = 100;

  constructor(
    private readonly registryService: CheckpointSaverRegistry,
    @Inject('CHECKPOINT_MODULE_OPTIONS')
    private readonly moduleOptions: CheckpointModuleOptions = {}
  ) {
    super(CheckpointCleanupService.name);

    this.cleanupPolicies = this.loadCleanupPolicies();
  }

  public onModuleDestroy(): void {
    this.stopScheduledCleanup();
  }

  /**
   * Perform cleanup on a specific saver
   */
  public async cleanup(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<number> {
    const startTime = Date.now();
    let deletedCount = 0;
    let error: string | undefined;

    try {
      this.logger.debug(
        `Starting cleanup for saver: ${saverName || 'default'}`
      );

      const saver = this.registryService.getSaver(saverName);
      const actualSaverName =
        saverName ?? this.registryService.getDefaultSaverName() ?? 'default';

      if (!saver) {
        throw this.createError(
          `Checkpoint saver not found: ${actualSaverName}`,
          'SAVER_NOT_FOUND'
        );
      }

      // Merge options with policies
      const cleanupOptions = this.mergeCleanupOptions(options);

      // Type guard: check if saver has cleanup method
      if ('cleanup' in saver && typeof (saver as any).cleanup === 'function') {
        deletedCount = await (saver as any).cleanup(cleanupOptions);
        this.logger.log(
          `Cleanup completed for ${actualSaverName}: ${deletedCount} checkpoints removed`
        );
      } else {
        this.logger.warn(`Cleanup not supported for saver: ${actualSaverName}`);
      }

      this.totalCleanedCheckpoints += deletedCount;
      this.lastCleanupTime = new Date();
    } catch (err) {
      error = (err as Error).message;
      this.logger.error(
        `Cleanup failed for saver ${saverName ?? 'default'}:`,
        err
      );
      throw err;
    } finally {
      // Record cleanup attempt
      this.recordCleanup({
        timestamp: new Date(),
        saverName:
          saverName ?? this.registryService.getDefaultSaverName() ?? 'default',
        deletedCount,
        duration: Date.now() - startTime,
        error,
      });
    }

    return deletedCount;
  }

  /**
   * Perform cleanup across all savers
   */
  public async cleanupAll(
    options: CheckpointCleanupOptions = {}
  ): Promise<number> {
    this.logger.log('Starting cleanup across all savers');

    const availableSavers = this.registryService.getAvailableSavers();
    let totalDeleted = 0;

    for (const saverName of availableSavers) {
      try {
        const deleted = await this.cleanup(options, saverName);
        totalDeleted += deleted;
      } catch (error) {
        this.logger.error(`Cleanup failed for saver ${saverName}:`, error);
        // Continue with other savers even if one fails
      }
    }

    this.logger.log(
      `Cleanup completed across all savers: ${totalDeleted} total checkpoints removed`
    );
    return totalDeleted;
  }

  /**
   * Start scheduled cleanup
   */
  public startScheduledCleanup(intervalMs?: number): void {
    const interval = intervalMs ?? this.cleanupPolicies.cleanupInterval;

    if (this.cleanupInterval) {
      this.logger.warn(
        'Scheduled cleanup is already running. Stopping existing schedule.'
      );
      this.stopScheduledCleanup();
    }

    if (interval <= 0) {
      this.logger.log('Scheduled cleanup disabled (interval <= 0)');
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performScheduledCleanup();
      } catch (error) {
        this.logger.error('Scheduled cleanup failed:', error);
      }
    }, interval);

    this.logger.log(
      `Checkpoint cleanup scheduler started (interval: ${interval}ms)`
    );
  }

  /**
   * Stop scheduled cleanup
   */
  public stopScheduledCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('Checkpoint cleanup scheduler stopped');
    }
  }

  /**
   * Get cleanup policies
   */
  public getCleanupPolicies(): CleanupPolicies {
    return { ...this.cleanupPolicies };
  }

  /**
   * Update cleanup policies
   */
  public updateCleanupPolicies(policies: Partial<CleanupPolicies>): void {
    const oldPolicies = { ...this.cleanupPolicies };
    this.cleanupPolicies = { ...this.cleanupPolicies, ...policies };

    this.logger.log('Updated cleanup policies:', {
      old: oldPolicies,
      new: this.cleanupPolicies,
    });

    // Restart scheduler if interval changed
    if (policies.cleanupInterval !== undefined && this.cleanupInterval) {
      this.startScheduledCleanup(policies.cleanupInterval);
    }
  }

  /**
   * Get cleanup statistics
   */
  public getCleanupStats(): {
    lastCleanupTime: Date | null;
    totalCleanedCheckpoints: number;
    averageCleanupDuration: number;
    cleanupHistory: CleanupRecord[];
  } {
    const recentHistory = this.cleanupHistory.slice(-10); // Last 10 cleanups
    const averageDuration = this.calculateAverageCleanupDuration();

    return {
      lastCleanupTime: this.lastCleanupTime,
      totalCleanedCheckpoints: this.totalCleanedCheckpoints,
      averageCleanupDuration: averageDuration,
      cleanupHistory: recentHistory,
    };
  }

  /**
   * Get cleanup recommendations
   */
  public getCleanupRecommendations(): {
    recommendations: string[];
    warnings: string[];
    nextScheduledCleanup: Date | null;
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Check if cleanup is enabled
    if (!this.cleanupInterval) {
      warnings.push('Scheduled cleanup is not enabled');
    }

    // Check cleanup frequency
    const intervalHours =
      this.cleanupPolicies.cleanupInterval / (1000 * 60 * 60);

    if (intervalHours > 24) {
      recommendations.push(
        'Consider more frequent cleanup (current interval > 24 hours)'
      );
    } else if (intervalHours < 1) {
      warnings.push(
        'Very frequent cleanup may impact performance (current interval < 1 hour)'
      );
    }

    // Check max age policy
    const maxAgeDays = this.cleanupPolicies.maxAge / (1000 * 60 * 60 * 24);
    if (maxAgeDays > 30) {
      recommendations.push(
        'Consider shorter retention period (current max age > 30 days)'
      );
    } else if (maxAgeDays < 1) {
      warnings.push(
        'Very short retention period may cause data loss (current max age < 1 day)'
      );
    }

    // Check cleanup effectiveness
    const recentCleanups = this.cleanupHistory.slice(-5);
    const avgDeleted =
      recentCleanups.reduce((sum, record) => sum + record.deletedCount, 0) /
      Math.max(recentCleanups.length, 1);

    if (avgDeleted === 0 && recentCleanups.length > 0) {
      recommendations.push(
        'No checkpoints cleaned recently - consider adjusting cleanup policies'
      );
    } else if (avgDeleted > 100) {
      warnings.push(
        'High number of checkpoints being cleaned - may indicate inefficient retention'
      );
    }

    // Check for errors
    const recentErrors = recentCleanups.filter((record) => record.error).length;
    if (recentErrors > 0) {
      warnings.push(`${recentErrors} cleanup errors in recent history`);
    }

    // Calculate next scheduled cleanup
    let nextScheduledCleanup: Date | null = null;
    if (this.lastCleanupTime && this.cleanupInterval) {
      nextScheduledCleanup = new Date(
        this.lastCleanupTime.getTime() + this.cleanupPolicies.cleanupInterval
      );
    }

    return {
      recommendations,
      warnings,
      nextScheduledCleanup,
    };
  }

  /**
   * Perform a dry run to see what would be cleaned
   */
  public async dryRunCleanup(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<{
    wouldDelete: number;
    affectedThreads: string[];
    estimatedSpaceSaved: number;
  }> {
    const mergedOptions = this.mergeCleanupOptions(options);
    const saver = this.registryService.getSaver(saverName);

    if (!saver) {
      throw new Error(`Checkpoint saver not found: ${saverName || 'default'}`);
    }

    const affectedThreads = new Set<string>();
    let checkpointCount = 0;
    let totalSize = 0;
    const averageCheckpointSize = 2048; // Average size in bytes (more realistic than 1024)

    try {
      // Get all threads to analyze
      const threadMap = new Map<
        string,
        { checkpoints: any[]; oldestTs: string }
      >();

      // Iterate through all checkpoints to collect data
      const listOptions = { limit: 1000 }; // Get a reasonable batch
      for await (const checkpoint of saver.list({}, listOptions)) {
        if (checkpoint && checkpoint.config?.configurable?.thread_id) {
          const threadId = checkpoint.config.configurable.thread_id;
          const checkpointData = checkpoint.checkpoint || checkpoint;

          if (!threadMap.has(threadId)) {
            threadMap.set(threadId, {
              checkpoints: [],
              oldestTs: checkpointData.ts || '',
            });
          }

          const threadData = threadMap.get(threadId)!;
          threadData.checkpoints.push(checkpointData);

          // Track oldest timestamp
          if (checkpointData.ts && checkpointData.ts < threadData.oldestTs) {
            threadData.oldestTs = checkpointData.ts;
          }
        }
      }

      // Analyze what would be deleted based on policies
      const now = Date.now();
      const maxAgeMs = mergedOptions.maxAge || this.cleanupPolicies.maxAge;
      const maxPerThread =
        mergedOptions.maxPerThread || this.cleanupPolicies.maxPerThread;
      const excludeThreads = mergedOptions.excludeThreads || [];

      for (const [threadId, threadData] of threadMap.entries()) {
        // Skip excluded threads
        if (excludeThreads.includes(threadId)) {
          continue;
        }

        let threadCheckpointsToDelete = 0;
        const sortedCheckpoints = threadData.checkpoints.sort((a, b) => {
          const tsA = new Date(a.ts || 0).getTime();
          const tsB = new Date(b.ts || 0).getTime();
          return tsB - tsA; // Newest first
        });

        // Check age-based deletion
        for (const checkpoint of sortedCheckpoints) {
          const checkpointAge = now - new Date(checkpoint.ts || 0).getTime();
          if (checkpointAge > maxAgeMs) {
            threadCheckpointsToDelete++;
          }
        }

        // Check count-based deletion (keep only maxPerThread newest)
        if (sortedCheckpoints.length > maxPerThread) {
          const countBasedDeletions = sortedCheckpoints.length - maxPerThread;
          threadCheckpointsToDelete = Math.max(
            threadCheckpointsToDelete,
            countBasedDeletions
          );
        }

        if (threadCheckpointsToDelete > 0) {
          affectedThreads.add(threadId);
          checkpointCount += threadCheckpointsToDelete;

          // Estimate size based on checkpoint data
          const firstCheckpoint = sortedCheckpoints[0];
          const checkpointSize =
            firstCheckpoint?.size ||
            JSON.stringify(firstCheckpoint).length * 1.5 || // Account for storage overhead
            averageCheckpointSize;
          totalSize += threadCheckpointsToDelete * checkpointSize;
        }
      }
    } catch (error) {
      this.logger.error('Error during dry run cleanup analysis:', error);
      throw error;
    }

    return {
      wouldDelete: checkpointCount,
      affectedThreads: Array.from(affectedThreads),
      estimatedSpaceSaved: totalSize || checkpointCount * averageCheckpointSize,
    };
  }

  /**
   * Force cleanup with aggressive options
   */
  public async forceCleanup(saverName?: string): Promise<number> {
    this.logger.warn('Performing force cleanup with aggressive settings');

    const aggressiveOptions: CheckpointCleanupOptions = {
      maxAge: 1000 * 60 * 60, // 1 hour
      maxPerThread: 10,
      excludeThreads: [], // Don't exclude any threads
    };

    return this.cleanup(aggressiveOptions, saverName);
  }

  /**
   * Load cleanup policies from configuration
   */
  private loadCleanupPolicies(): CleanupPolicies {
    const cleanupConfig = this.moduleOptions.cleanup || {};

    return {
      maxAge: cleanupConfig.maxAge || 7 * 24 * 60 * 60 * 1000, // 7 days default
      maxPerThread: cleanupConfig.maxPerThread || 100,
      cleanupInterval: cleanupConfig.interval || 3600000, // 1 hour default
      excludeThreads: cleanupConfig.excludeThreads || [],
    };
  }

  /**
   * Merge cleanup options with policies
   */
  private mergeCleanupOptions(
    options: CheckpointCleanupOptions
  ): CheckpointCleanupOptions {
    return {
      maxAge: options.maxAge ?? this.cleanupPolicies.maxAge,
      maxPerThread: options.maxPerThread ?? this.cleanupPolicies.maxPerThread,
      excludeThreads:
        options.excludeThreads ?? this.cleanupPolicies.excludeThreads,
      dryRun: options.dryRun ?? false,
      onDelete: options.onDelete,
    };
  }

  /**
   * Perform scheduled cleanup
   */
  private async performScheduledCleanup(): Promise<void> {
    this.logger.debug('Performing scheduled cleanup');

    const options: CheckpointCleanupOptions = {
      maxAge: this.cleanupPolicies.maxAge,
      maxPerThread: this.cleanupPolicies.maxPerThread,
      excludeThreads: this.cleanupPolicies.excludeThreads,
    };

    const totalCleaned = await this.cleanupAll(options);

    if (totalCleaned > 0) {
      this.logger.log(
        `Scheduled cleanup completed: ${totalCleaned} checkpoints removed`
      );
    } else {
      this.logger.debug(
        'Scheduled cleanup completed: no checkpoints to remove'
      );
    }
  }

  /**
   * Record cleanup operation
   */
  private recordCleanup(record: CleanupRecord): void {
    this.cleanupHistory.push(record);

    // Trim history if it gets too large
    if (this.cleanupHistory.length > this.maxHistorySize) {
      this.cleanupHistory.splice(
        0,
        this.cleanupHistory.length - this.maxHistorySize
      );
    }
  }

  /**
   * Calculate average cleanup duration
   */
  private calculateAverageCleanupDuration(): number {
    if (this.cleanupHistory.length === 0) {
      return 0;
    }

    const totalDuration = this.cleanupHistory.reduce(
      (sum, record) => sum + record.duration,
      0
    );

    return totalDuration / this.cleanupHistory.length;
  }

  /**
   * Get cleanup policies validation
   */
  public validatePolicies(): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (this.cleanupPolicies.maxAge <= 0) {
      issues.push('maxAge must be positive');
    }

    if (this.cleanupPolicies.maxPerThread <= 0) {
      issues.push('maxPerThread must be positive');
    }

    if (this.cleanupPolicies.cleanupInterval < 0) {
      issues.push('cleanupInterval must be non-negative');
    }

    // Warnings
    if (this.cleanupPolicies.maxAge < 3600000) {
      // Less than 1 hour
      warnings.push('Very short maxAge may cause premature data loss');
    }

    if (this.cleanupPolicies.cleanupInterval > 24 * 3600000) {
      // More than 24 hours
      warnings.push('Long cleanup interval may allow excessive storage usage');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }
}
