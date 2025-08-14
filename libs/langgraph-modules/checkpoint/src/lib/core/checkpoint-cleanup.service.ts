import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CheckpointCleanupOptions } from '../interfaces/checkpoint.interface';
import type {
  ICheckpointCleanupService,
  ICheckpointRegistryService,
} from '../interfaces/checkpoint-services.interface';
import { BaseCheckpointService } from '../interfaces/checkpoint-services.interface';

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
    @Inject('ICheckpointRegistryService')
    private readonly registryService: ICheckpointRegistryService,
    private readonly configService: ConfigService
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
      this.logger.debug(`Starting cleanup for saver: ${saverName || 'default'}`);

      const saver = this.registryService.getSaver(saverName);
      const actualSaverName = saverName ?? this.registryService.getDefaultSaverName() ?? 'default';

      // Merge options with policies
      const cleanupOptions = this.mergeCleanupOptions(options);

      if (saver.cleanup) {
        deletedCount = await saver.cleanup(cleanupOptions);
        this.logger.log(`Cleanup completed for ${actualSaverName}: ${deletedCount} checkpoints removed`);
      } else {
        this.logger.warn(`Cleanup not supported for saver: ${actualSaverName}`);
      }

      this.totalCleanedCheckpoints += deletedCount;
      this.lastCleanupTime = new Date();

    } catch (err) {
      error = (err as Error).message;
      this.logger.error(`Cleanup failed for saver ${saverName ?? 'default'}:`, err);
      throw err;
    } finally {
      // Record cleanup attempt
      this.recordCleanup({
        timestamp: new Date(),
        saverName: saverName ?? this.registryService.getDefaultSaverName() ?? 'default',
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
  public async cleanupAll(options: CheckpointCleanupOptions = {}): Promise<number> {
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

    this.logger.log(`Cleanup completed across all savers: ${totalDeleted} total checkpoints removed`);
    return totalDeleted;
  }

  /**
   * Start scheduled cleanup
   */
  public startScheduledCleanup(intervalMs?: number): void {
    const interval = intervalMs ?? this.cleanupPolicies.cleanupInterval;

    if (this.cleanupInterval) {
      this.logger.warn('Scheduled cleanup is already running. Stopping existing schedule.');
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

    this.logger.log(`Checkpoint cleanup scheduler started (interval: ${interval}ms)`);
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
    const intervalHours = this.cleanupPolicies.cleanupInterval / (1000 * 60 * 60);
    
    if (intervalHours > 24) {
      recommendations.push('Consider more frequent cleanup (current interval > 24 hours)');
    } else if (intervalHours < 1) {
      warnings.push('Very frequent cleanup may impact performance (current interval < 1 hour)');
    }

    // Check max age policy
    const maxAgeDays = this.cleanupPolicies.maxAge / (1000 * 60 * 60 * 24);
    if (maxAgeDays > 30) {
      recommendations.push('Consider shorter retention period (current max age > 30 days)');
    } else if (maxAgeDays < 1) {
      warnings.push('Very short retention period may cause data loss (current max age < 1 day)');
    }

    // Check cleanup effectiveness
    const recentCleanups = this.cleanupHistory.slice(-5);
    const avgDeleted = recentCleanups.reduce((sum, record) => sum + record.deletedCount, 0) / Math.max(recentCleanups.length, 1);
    
    if (avgDeleted === 0 && recentCleanups.length > 0) {
      recommendations.push('No checkpoints cleaned recently - consider adjusting cleanup policies');
    } else if (avgDeleted > 100) {
      warnings.push('High number of checkpoints being cleaned - may indicate inefficient retention');
    }

    // Check for errors
    const recentErrors = recentCleanups.filter(record => record.error).length;
    if (recentErrors > 0) {
      warnings.push(`${recentErrors} cleanup errors in recent history`);
    }

    // Calculate next scheduled cleanup
    let nextScheduledCleanup: Date | null = null;
    if (this.lastCleanupTime && this.cleanupInterval) {
      nextScheduledCleanup = new Date(this.lastCleanupTime.getTime() + this.cleanupPolicies.cleanupInterval);
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
    const dryRunOptions = { ...options, dryRun: true };
    const deletedCount = await this.cleanup(dryRunOptions, saverName);

    // Note: This is a simplified implementation
    // Real implementation would need better integration with checkpoint savers
    return {
      wouldDelete: deletedCount,
      affectedThreads: [], // Would need to be implemented in checkpoint savers
      estimatedSpaceSaved: deletedCount * 1024, // Rough estimate
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
    return {
      maxAge: this.configService.get<number>(
        'checkpoint.maxAge',
        7 * 24 * 60 * 60 * 1000 // 7 days
      ),
      maxPerThread: this.configService.get<number>(
        'checkpoint.maxPerThread',
        100
      ),
      cleanupInterval: this.configService.get<number>(
        'checkpoint.cleanupInterval',
        3600000 // 1 hour
      ),
      excludeThreads: this.configService.get<string[]>(
        'checkpoint.excludeThreads',
        []
      ),
    };
  }

  /**
   * Merge cleanup options with policies
   */
  private mergeCleanupOptions(options: CheckpointCleanupOptions): CheckpointCleanupOptions {
    return {
      maxAge: options.maxAge ?? this.cleanupPolicies.maxAge,
      maxPerThread: options.maxPerThread ?? this.cleanupPolicies.maxPerThread,
      excludeThreads: options.excludeThreads ?? this.cleanupPolicies.excludeThreads,
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
      this.logger.log(`Scheduled cleanup completed: ${totalCleaned} checkpoints removed`);
    } else {
      this.logger.debug('Scheduled cleanup completed: no checkpoints to remove');
    }
  }

  /**
   * Record cleanup operation
   */
  private recordCleanup(record: CleanupRecord): void {
    this.cleanupHistory.push(record);

    // Trim history if it gets too large
    if (this.cleanupHistory.length > this.maxHistorySize) {
      this.cleanupHistory.splice(0, this.cleanupHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Calculate average cleanup duration
   */
  private calculateAverageCleanupDuration(): number {
    if (this.cleanupHistory.length === 0) {return 0;}

    const totalDuration = this.cleanupHistory.reduce(
      (sum, record) => sum + record.duration,
      0
    );
    
    return totalDuration / this.cleanupHistory.length;
  }

  /**
   * Validate cleanup options
   */
  private validateCleanupOptions(_options: CheckpointCleanupOptions): void {
    if (_options.maxAge !== undefined && _options.maxAge < 0) {
      throw this.createError(
        'maxAge must be non-negative',
        'INVALID_MAX_AGE'
      );
    }

    if (_options.maxPerThread !== undefined && _options.maxPerThread < 1) {
      throw this.createError(
        'maxPerThread must be positive',
        'INVALID_MAX_PER_THREAD'
      );
    }

    if (_options.excludeThreads && !Array.isArray(_options.excludeThreads)) {
      throw this.createError(
        'excludeThreads must be an array',
        'INVALID_EXCLUDE_THREADS'
      );
    }
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
    if (this.cleanupPolicies.maxAge < 3600000) { // Less than 1 hour
      warnings.push('Very short maxAge may cause premature data loss');
    }

    if (this.cleanupPolicies.cleanupInterval > 24 * 3600000) { // More than 24 hours
      warnings.push('Long cleanup interval may allow excessive storage usage');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }
}