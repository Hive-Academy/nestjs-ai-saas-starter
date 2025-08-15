import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type {
  CheckpointConfig,
  EnhancedCheckpointMetadata,
  EnhancedCheckpoint,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
  CheckpointStats,
  CheckpointCleanupOptions,
} from '../interfaces/checkpoint.interface';
import type {
  ICheckpointSaverFactory,
  ICheckpointRegistryService,
  ICheckpointPersistenceService,
  ICheckpointMetricsService,
  ICheckpointCleanupService,
  ICheckpointHealthService,
} from '../interfaces/checkpoint-services.interface';

/**
 * Facade service for managing checkpoint persistence across multiple storage backends
 * Orchestrates the focused services using the Facade pattern for simplified API
 *
 * This service provides a unified interface to all checkpoint operations while
 * delegating responsibilities to specialized services following SOLID principles.
 */
@Injectable()
export class CheckpointManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckpointManagerService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('ICheckpointSaverFactory')
    private readonly saverFactory: ICheckpointSaverFactory,
    @Inject('ICheckpointRegistryService')
    private readonly registryService: ICheckpointRegistryService,
    @Inject('ICheckpointPersistenceService')
    private readonly persistenceService: ICheckpointPersistenceService,
    @Inject('ICheckpointMetricsService')
    private readonly metricsService: ICheckpointMetricsService,
    @Inject('ICheckpointCleanupService')
    private readonly cleanupService: ICheckpointCleanupService,
    @Inject('ICheckpointHealthService')
    private readonly healthService: ICheckpointHealthService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initializeCheckpointSavers();
    this.startServices();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.stopServices();
  }

  // ========================================
  // Checkpoint CRUD Operations (Facade API)
  // ========================================

  /**
   * Save checkpoint with metadata and thread management
   * Delegates to persistence service for actual save operation
   */
  public async saveCheckpoint<
    T extends Record<string, unknown> = Record<string, unknown>
  >(
    threadId: string,
    checkpoint: unknown,
    metadata?: EnhancedCheckpointMetadata,
    saverName?: string
  ): Promise<void> {
    return this.persistenceService.saveCheckpoint<T>(
      threadId,
      checkpoint,
      metadata,
      saverName
    );
  }

  /**
   * Load checkpoint with version support
   * Delegates to persistence service for actual load operation
   */
  public async loadCheckpoint<
    T extends Record<string, unknown> = Record<string, unknown>
  >(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<EnhancedCheckpoint<T> | null> {
    return this.persistenceService.loadCheckpoint<T>(
      threadId,
      checkpointId,
      saverName
    );
  }

  /**
   * List checkpoints for time travel with enhanced filtering
   * Delegates to persistence service for actual list operation
   */
  public async listCheckpoints(
    threadId: string,
    options: ListCheckpointsOptions = {},
    saverName?: string
  ): Promise<EnhancedCheckpointTuple[]> {
    return this.persistenceService.listCheckpoints(
      threadId,
      options,
      saverName
    );
  }

  // ========================================
  // Registry Management (Facade API)
  // ========================================

  /**
   * Get available checkpoint savers
   * Delegates to registry service
   */
  getAvailableSavers(): string[] {
    return this.registryService.getAvailableSavers();
  }

  /**
   * Get default saver name
   */
  getDefaultSaverName(): string | null {
    return this.registryService.getDefaultSaverName();
  }

  /**
   * Get saver information
   */
  getSaverInfo(
    saverName?: string
  ): ReturnType<typeof this.registryService.getSaverInfo> {
    return this.registryService.getSaverInfo(saverName);
  }

  /**
   * Get all savers information
   */
  getAllSaversInfo(): ReturnType<typeof this.registryService.getAllSaversInfo> {
    return this.registryService.getAllSaversInfo();
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): ReturnType<typeof this.registryService.getRegistryStats> {
    return this.registryService.getRegistryStats();
  }

  // ========================================
  // Metrics and Performance (Facade API)
  // ========================================

  /**
   * Get checkpoint statistics for monitoring
   * Combines metrics from multiple services
   */
  async getCheckpointStats(saverName?: string): Promise<CheckpointStats> {
    return this.healthService.getHealthStats();
  }

  /**
   * Get performance metrics for a specific saver
   */
  getMetrics(
    saverName?: string
  ): ReturnType<typeof this.metricsService.getMetrics> {
    const actualSaverName =
      saverName || this.registryService.getDefaultSaverName() || 'default';
    return this.metricsService.getMetrics(actualSaverName);
  }

  /**
   * Get aggregated metrics across all savers
   */
  getAggregatedMetrics(): ReturnType<
    typeof this.metricsService.getAggregatedMetrics
  > {
    return this.metricsService.getAggregatedMetrics();
  }

  /**
   * Get performance insights and recommendations
   */
  getPerformanceInsights(): ReturnType<
    typeof this.metricsService.getPerformanceInsights
  > {
    return this.metricsService.getPerformanceInsights();
  }

  /**
   * Reset metrics for a specific saver or all savers
   */
  resetMetrics(saverName?: string): void {
    this.metricsService.resetMetrics(saverName);
  }

  // ========================================
  // Cleanup Operations (Facade API)
  // ========================================

  /**
   * Cleanup old checkpoints
   * Delegates to cleanup service
   */
  async cleanupCheckpoints(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<number> {
    return this.cleanupService.cleanup(options, saverName);
  }

  /**
   * Cleanup checkpoints across all savers
   */
  async cleanupAllCheckpoints(
    options: CheckpointCleanupOptions = {}
  ): Promise<number> {
    return this.cleanupService.cleanupAll(options);
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): ReturnType<typeof this.cleanupService.getCleanupStats> {
    return this.cleanupService.getCleanupStats();
  }

  /**
   * Get cleanup policies
   */
  getCleanupPolicies(): ReturnType<
    typeof this.cleanupService.getCleanupPolicies
  > {
    return this.cleanupService.getCleanupPolicies();
  }

  /**
   * Update cleanup policies
   */
  updateCleanupPolicies(
    policies: Parameters<typeof this.cleanupService.updateCleanupPolicies>[0]
  ): void {
    this.cleanupService.updateCleanupPolicies(policies);
  }

  /**
   * Perform dry run cleanup to see what would be cleaned
   */
  async dryRunCleanup(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<ReturnType<typeof this.cleanupService.dryRunCleanup>> {
    return this.cleanupService.dryRunCleanup(options, saverName);
  }

  // ========================================
  // Health Monitoring (Facade API)
  // ========================================

  /**
   * Health check for checkpoint storage
   * Delegates to health service
   */
  async healthCheck(saverName?: string): Promise<boolean> {
    return this.healthService.healthCheck(saverName);
  }

  /**
   * Perform health checks on all savers
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    return this.healthService.healthCheckAll();
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(
    saverName?: string
  ): Promise<ReturnType<typeof this.healthService.getHealthStatus>> {
    return this.healthService.getHealthStatus(saverName);
  }

  /**
   * Get health summary report
   */
  getHealthSummary(): ReturnType<typeof this.healthService.getHealthSummary> {
    return this.healthService.getHealthSummary();
  }

  /**
   * Get health history
   */
  getHealthHistory(
    saverName?: string
  ): ReturnType<typeof this.healthService.getHealthHistory> {
    return this.healthService.getHealthHistory(saverName);
  }

  /**
   * Get diagnostic information
   */
  async getDiagnosticInfo(
    saverName?: string
  ): Promise<ReturnType<typeof this.healthService.getDiagnosticInfo>> {
    return this.healthService.getDiagnosticInfo(saverName);
  }

  // ========================================
  // Advanced Features (Facade API)
  // ========================================

  /**
   * Get comprehensive system report
   * Combines data from all services
   */
  getSystemReport(): {
    timestamp: Date;
    registry: ReturnType<ICheckpointRegistryService['getRegistryStats']>;
    metrics: ReturnType<ICheckpointMetricsService['getAggregatedMetrics']>;
    health: ReturnType<ICheckpointHealthService['getHealthSummary']>;
    cleanup: ReturnType<ICheckpointCleanupService['getCleanupStats']>;
    performance: ReturnType<
      ICheckpointMetricsService['getPerformanceInsights']
    >;
    recommendations: string[];
  } {
    const timestamp = new Date();
    const registry = this.registryService.getRegistryStats();
    const metrics = this.metricsService.getAggregatedMetrics();
    const health = this.healthService.getHealthSummary();
    const cleanup = this.cleanupService.getCleanupStats();
    const performance = this.metricsService.getPerformanceInsights();

    // Combine recommendations from all services
    const recommendations = [
      ...performance.recommendations,
      ...health.recommendations,
    ];

    return {
      timestamp,
      registry,
      metrics,
      health,
      cleanup,
      performance,
      recommendations,
    };
  }

  /**
   * Validate entire system configuration and health
   */
  validateSystem(): {
    valid: boolean;
    issues: string[];
    warnings: string[];
    summary: {
      totalSavers: number;
      healthySavers: number;
      configurationValid: boolean;
      performanceAcceptable: boolean;
    };
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Validate registry
    const registryValidation = this.registryService.validateSavers();
    issues.push(...registryValidation.issues);
    warnings.push(...registryValidation.warnings);

    // Validate cleanup policies
    const cleanupValidation = this.cleanupService.validatePolicies();
    issues.push(...cleanupValidation.issues);
    warnings.push(...cleanupValidation.warnings);

    // Check health status
    const healthSummary = this.healthService.getHealthSummary();
    if (healthSummary.overall.unhealthySavers > 0) {
      issues.push(
        `${healthSummary.overall.unhealthySavers} saver(s) are unhealthy`
      );
    }
    if (healthSummary.overall.degradedSavers > 0) {
      warnings.push(
        `${healthSummary.overall.degradedSavers} saver(s) show degraded performance`
      );
    }

    // Check performance
    const performance = this.metricsService.getPerformanceInsights();
    if (performance.slowestSavers.length > 0) {
      warnings.push(
        `Slow performance detected in ${performance.slowestSavers.length} saver(s)`
      );
    }
    if (performance.errorProneSavers.length > 0) {
      issues.push(
        `High error rates detected in ${performance.errorProneSavers.length} saver(s)`
      );
    }

    const summary = {
      totalSavers: healthSummary.overall.totalSavers,
      healthySavers: healthSummary.overall.healthySavers,
      configurationValid: registryValidation.valid && cleanupValidation.valid,
      performanceAcceptable:
        performance.slowestSavers.length === 0 &&
        performance.errorProneSavers.length === 0,
    };

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      summary,
    };
  }

  // ========================================
  // Private Implementation Methods
  // ========================================

  /**
   * Initialize checkpoint savers from configuration
   * Uses factory and registry services for setup
   */
  private async initializeCheckpointSavers(): Promise<void> {
    const configs = this.configService.get<CheckpointConfig[]>(
      'checkpoint.savers',
      []
    );

    if (configs.length === 0) {
      // Create default memory saver if no configuration provided
      const defaultConfig: CheckpointConfig = {
        type: 'memory',
        name: 'default',
        default: true,
      };
      configs.push(defaultConfig);
    }

    for (const config of configs) {
      try {
        // Create saver using factory

        // Create saver using factory
        const saver = await this.saverFactory.createCheckpointSaver(config);
        const name = config.name || config.type;

        // Register saver in registry
        this.registryService.registerSaver(name, saver, config.default);

        this.logger.log(`Initialized ${config.type} checkpoint saver: ${name}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize checkpoint saver ${
            config.name || config.type
          }:`,
          error
        );
      }
    }

    // Validate that we have at least one saver
    const validation = this.registryService.validateSavers();
    if (!validation.valid) {
      throw new Error(
        `Checkpoint saver initialization failed: ${validation.issues.join(
          ', '
        )}`
      );
    }

    this.logger.log(
      `Checkpoint system initialized with ${
        this.registryService.getAvailableSavers().length
      } saver(s)`
    );
  }

  /**
   * Start background services
   */
  private startServices(): void {
    // Start cleanup scheduler
    this.cleanupService.startScheduledCleanup();

    // Start health monitoring
    this.healthService.startHealthMonitoring();

    this.logger.log('Checkpoint background services started');
  }

  /**
   * Stop background services
   */
  private stopServices(): void {
    // Stop cleanup scheduler
    this.cleanupService.stopScheduledCleanup();

    // Stop health monitoring
    this.healthService.stopHealthMonitoring();

    this.logger.log('Checkpoint background services stopped');
  }
}
