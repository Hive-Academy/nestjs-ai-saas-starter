import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
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
    @Optional() private readonly configService?: ConfigService,
    @Inject('ICheckpointSaverFactory')
    private readonly saverFactory?: ICheckpointSaverFactory,
    @Inject('ICheckpointRegistryService')
    private readonly registryService?: ICheckpointRegistryService,
    @Inject('ICheckpointPersistenceService')
    private readonly persistenceService?: ICheckpointPersistenceService,
    @Inject('ICheckpointMetricsService')
    private readonly metricsService?: ICheckpointMetricsService,
    @Inject('ICheckpointCleanupService')
    private readonly cleanupService?: ICheckpointCleanupService,
    @Inject('ICheckpointHealthService')
    private readonly healthService?: ICheckpointHealthService
  ) {}

  // ========================================
  // Capability Detection Methods
  // ========================================

  /**
   * Check if configuration service is available for enhanced features
   */
  public isConfigServiceAvailable(): boolean {
    return !!this.configService;
  }

  /**
   * Check if all core services are available
   */
  public isCoreServicesAvailable(): boolean {
    return !!(
      this.saverFactory &&
      this.registryService &&
      this.persistenceService
    );
  }

  /**
   * Check if monitoring services are available
   */
  public isMonitoringAvailable(): boolean {
    return !!(this.metricsService && this.healthService);
  }

  /**
   * Check if cleanup services are available
   */
  public isCleanupAvailable(): boolean {
    return !!this.cleanupService;
  }

  /**
   * Get available capabilities summary
   */
  public getCapabilities(): {
    configService: boolean;
    coreServices: boolean;
    monitoring: boolean;
    cleanup: boolean;
    summary: string[];
  } {
    const configService = this.isConfigServiceAvailable();
    const coreServices = this.isCoreServicesAvailable();
    const monitoring = this.isMonitoringAvailable();
    const cleanup = this.isCleanupAvailable();

    const summary: string[] = [];
    if (configService) summary.push('Enhanced configuration');
    if (coreServices) summary.push('Full checkpoint operations');
    if (monitoring) summary.push('Metrics and health monitoring');
    if (cleanup) summary.push('Automated cleanup');

    if (summary.length === 0) {
      summary.push('Limited standalone mode - basic operations only');
    }

    return { configService, coreServices, monitoring, cleanup, summary };
  }

  public async onModuleInit(): Promise<void> {
    if (this.isCoreServicesAvailable()) {
      await this.initializeCheckpointSavers();
      this.startServices();
    } else {
      this.logger.warn(
        'Core services not available - running in limited standalone mode'
      );
    }
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
   * Returns early with warning if core services not available
   */
  public async saveCheckpoint<
    T extends Record<string, unknown> = Record<string, unknown>
  >(
    threadId: string,
    checkpoint: unknown,
    metadata?: EnhancedCheckpointMetadata,
    saverName?: string
  ): Promise<void> {
    if (!this.persistenceService) {
      this.logger.warn(
        'Persistence service not available - checkpoint save skipped'
      );
      return;
    }

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
   * Returns null if core services not available
   */
  public async loadCheckpoint<
    T extends Record<string, unknown> = Record<string, unknown>
  >(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<EnhancedCheckpoint<T> | null> {
    if (!this.persistenceService) {
      this.logger.warn('Persistence service not available - returning null');
      return null;
    }

    return this.persistenceService.loadCheckpoint<T>(
      threadId,
      checkpointId,
      saverName
    );
  }

  /**
   * List checkpoints for time travel with enhanced filtering
   * Delegates to persistence service for actual list operation
   * Returns empty array if persistence service not available
   */
  public async listCheckpoints(
    threadId: string,
    options: ListCheckpointsOptions = {},
    saverName?: string
  ): Promise<EnhancedCheckpointTuple[]> {
    if (!this.persistenceService) {
      this.logger.warn(
        'Persistence service not available - returning empty array'
      );
      return [];
    }

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
   * Returns empty array if registry service not available
   */
  getAvailableSavers(): string[] {
    if (!this.registryService) {
      this.logger.warn(
        'Registry service not available - returning empty array'
      );
      return [];
    }
    return this.registryService.getAvailableSavers();
  }

  /**
   * Get default saver name
   * Returns null if registry service not available
   */
  getDefaultSaverName(): string | null {
    if (!this.registryService) {
      return null;
    }
    return this.registryService.getDefaultSaverName();
  }

  /**
   * Get saver information
   * Returns null if registry service not available
   */
  getSaverInfo(saverName?: string) {
    if (!this.registryService) {
      return null;
    }
    return this.registryService.getSaverInfo(saverName);
  }

  /**
   * Get all savers information
   * Returns empty array if registry service not available
   */
  getAllSaversInfo() {
    if (!this.registryService) {
      return [];
    }
    return this.registryService.getAllSaversInfo();
  }

  /**
   * Get registry statistics
   * Returns default stats if registry service not available
   */
  getRegistryStats() {
    if (!this.registryService) {
      return { totalSavers: 0, defaultSaver: null, healthySavers: 0 };
    }
    return this.registryService.getRegistryStats();
  }

  // ========================================
  // Metrics and Performance (Facade API)
  // ========================================

  /**
   * Get checkpoint statistics for monitoring
   * Combines metrics from multiple services
   * Returns basic stats if health service not available
   */
  async getCheckpointStats(saverName?: string): Promise<CheckpointStats> {
    if (!this.healthService) {
      // Return basic stats structure when health service unavailable
      return {
        overall: {
          totalSavers: 0,
          healthySavers: 0,
          degradedSavers: 0,
          unhealthySavers: 0,
        },
        savers: {},
        recommendations: [
          'Health service not available - install checkpoint module with health monitoring',
        ],
      } as any;
    }
    return this.healthService.getHealthStats();
  }

  /**
   * Get performance metrics for a specific saver
   * Returns null if metrics service not available
   */
  getMetrics(saverName?: string) {
    if (!this.metricsService) {
      return null;
    }
    const actualSaverName =
      saverName || this.registryService?.getDefaultSaverName() || 'default';
    return this.metricsService.getMetrics(actualSaverName);
  }

  /**
   * Get aggregated metrics across all savers
   * Returns null if metrics service not available
   */
  getAggregatedMetrics() {
    if (!this.metricsService) {
      return null;
    }
    return this.metricsService.getAggregatedMetrics();
  }

  /**
   * Get performance insights and recommendations
   * Returns empty insights if metrics service not available
   */
  getPerformanceInsights() {
    if (!this.metricsService) {
      return {
        recommendations: [
          'Metrics service not available - install checkpoint module with metrics monitoring',
        ],
        slowestSavers: [],
        errorProneSavers: [],
      };
    }
    return this.metricsService.getPerformanceInsights();
  }

  /**
   * Reset metrics for a specific saver or all savers
   * Does nothing if metrics service not available
   */
  resetMetrics(saverName?: string): void {
    if (!this.metricsService) {
      this.logger.warn('Metrics service not available - cannot reset metrics');
      return;
    }
    this.metricsService.resetMetrics(saverName);
  }

  // ========================================
  // Cleanup Operations (Facade API)
  // ========================================

  /**
   * Cleanup old checkpoints
   * Delegates to cleanup service
   * Returns 0 if cleanup service not available
   */
  async cleanupCheckpoints(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<number> {
    if (!this.cleanupService) {
      this.logger.warn('Cleanup service not available - no cleanup performed');
      return 0;
    }
    return this.cleanupService.cleanup(options, saverName);
  }

  /**
   * Cleanup checkpoints across all savers
   * Returns 0 if cleanup service not available
   */
  async cleanupAllCheckpoints(
    options: CheckpointCleanupOptions = {}
  ): Promise<number> {
    if (!this.cleanupService) {
      this.logger.warn('Cleanup service not available - no cleanup performed');
      return 0;
    }
    return this.cleanupService.cleanupAll(options);
  }

  /**
   * Get cleanup statistics
   * Returns empty stats if cleanup service not available
   */
  getCleanupStats() {
    if (!this.cleanupService) {
      return { totalCleanupRuns: 0, lastCleanup: null };
    }
    return this.cleanupService.getCleanupStats();
  }

  /**
   * Get cleanup policies
   * Returns empty policies if cleanup service not available
   */
  getCleanupPolicies() {
    if (!this.cleanupService) {
      return [];
    }
    return this.cleanupService.getCleanupPolicies();
  }

  /**
   * Update cleanup policies
   * Does nothing if cleanup service not available
   */
  updateCleanupPolicies(policies: any): void {
    if (!this.cleanupService) {
      this.logger.warn(
        'Cleanup service not available - cannot update policies'
      );
      return;
    }
    this.cleanupService.updateCleanupPolicies(policies);
  }

  /**
   * Perform dry run cleanup to see what would be cleaned
   * Returns empty result if cleanup service not available
   */
  async dryRunCleanup(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<any> {
    if (!this.cleanupService) {
      this.logger.warn(
        'Cleanup service not available - returning empty dry run result'
      );
      return { wouldDelete: 0, items: [] };
    }
    return this.cleanupService.dryRunCleanup(options, saverName);
  }

  // ========================================
  // Health Monitoring (Facade API)
  // ========================================

  /**
   * Health check for checkpoint storage
   * Delegates to health service
   * Returns false if health service not available
   */
  async healthCheck(saverName?: string): Promise<boolean> {
    if (!this.healthService) {
      this.logger.warn('Health service not available - returning false');
      return false;
    }
    return this.healthService.healthCheck(saverName);
  }

  /**
   * Perform health checks on all savers
   * Returns empty record if health service not available
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    if (!this.healthService) {
      this.logger.warn('Health service not available - returning empty record');
      return {};
    }
    return this.healthService.healthCheckAll();
  }

  /**
   * Get detailed health status
   * Returns null if health service not available
   */
  async getHealthStatus(saverName?: string): Promise<any> {
    if (!this.healthService) {
      return null;
    }
    return this.healthService.getHealthStatus(saverName);
  }

  /**
   * Get health summary report
   * Returns basic summary if health service not available
   */
  getHealthSummary() {
    if (!this.healthService) {
      return {
        overall: {
          totalSavers: 0,
          healthySavers: 0,
          degradedSavers: 0,
          unhealthySavers: 0,
        },
        recommendations: [
          'Health service not available - install checkpoint module with health monitoring',
        ],
      };
    }
    return this.healthService.getHealthSummary();
  }

  /**
   * Get health history
   * Returns empty array if health service not available
   */
  getHealthHistory(saverName?: string) {
    if (!this.healthService) {
      return [];
    }
    return this.healthService.getHealthHistory(saverName);
  }

  /**
   * Get diagnostic information
   * Returns null if health service not available
   */
  async getDiagnosticInfo(saverName?: string): Promise<any> {
    if (!this.healthService) {
      return null;
    }
    return this.healthService.getDiagnosticInfo(saverName);
  }

  // ========================================
  // Advanced Features (Facade API)
  // ========================================

  /**
   * Get comprehensive system report
   * Combines data from all services
   */
  getSystemReport(): any {
    const timestamp = new Date();
    const registry = this.getRegistryStats();
    const metrics = this.getAggregatedMetrics();
    const health = this.getHealthSummary();
    const cleanup = this.getCleanupStats();
    const performance = this.getPerformanceInsights();

    // Combine recommendations from all services
    const recommendations = [
      ...(performance.recommendations || []),
      ...(health.recommendations || []),
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
   * Uses available services, gracefully handles missing services
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

    // Validate registry if available
    let registryValidation: {
      valid: boolean;
      issues: string[];
      warnings: string[];
    } = { valid: true, issues: [], warnings: [] };
    if (this.registryService) {
      registryValidation = this.registryService.validateSavers();
      issues.push(...registryValidation.issues);
      warnings.push(...registryValidation.warnings);
    } else {
      warnings.push('Registry service not available - cannot validate savers');
    }

    // Validate cleanup policies if available
    let cleanupValidation: {
      valid: boolean;
      issues: string[];
      warnings: string[];
    } = { valid: true, issues: [], warnings: [] };
    if (this.cleanupService) {
      cleanupValidation = this.cleanupService.validatePolicies();
      issues.push(...cleanupValidation.issues);
      warnings.push(...cleanupValidation.warnings);
    } else {
      warnings.push('Cleanup service not available - cannot validate policies');
    }

    // Check health status if available
    const healthSummary = this.getHealthSummary();
    if (healthSummary.overall && typeof healthSummary.overall === 'object') {
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
    }

    // Check performance if available
    const performance = this.getPerformanceInsights();
    if (
      performance &&
      performance.slowestSavers &&
      performance.slowestSavers.length > 0
    ) {
      warnings.push(
        `Slow performance detected in ${performance.slowestSavers.length} saver(s)`
      );
    }
    if (
      performance &&
      performance.errorProneSavers &&
      performance.errorProneSavers.length > 0
    ) {
      issues.push(
        `High error rates detected in ${performance.errorProneSavers.length} saver(s)`
      );
    }

    const summary = {
      totalSavers:
        (healthSummary.overall && healthSummary.overall.totalSavers) || 0,
      healthySavers:
        (healthSummary.overall && healthSummary.overall.healthySavers) || 0,
      configurationValid: registryValidation.valid && cleanupValidation.valid,
      performanceAcceptable:
        !performance ||
        (performance.slowestSavers?.length === 0 &&
          performance.errorProneSavers?.length === 0),
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
   * Falls back to default configuration if ConfigService not available
   */
  private async initializeCheckpointSavers(): Promise<void> {
    const configs =
      this.configService?.get<CheckpointConfig[]>('checkpoint.savers', []) ??
      [];

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
        // Check if factory and registry services are available
        if (!this.saverFactory || !this.registryService) {
          this.logger.warn(
            `Cannot initialize ${config.type} saver - required services not available`
          );
          continue;
        }

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

    // Validate that we have at least one saver if registry service is available
    if (this.registryService) {
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
    } else {
      this.logger.warn(
        'Registry service not available - cannot validate initialization'
      );
    }
  }

  /**
   * Start background services
   * Only starts services that are available
   */
  private startServices(): void {
    const startedServices: string[] = [];

    // Start cleanup scheduler if available
    if (this.cleanupService) {
      this.cleanupService.startScheduledCleanup();
      startedServices.push('cleanup');
    }

    // Start health monitoring if available
    if (this.healthService) {
      this.healthService.startHealthMonitoring();
      startedServices.push('health monitoring');
    }

    if (startedServices.length > 0) {
      this.logger.log(
        `Checkpoint background services started: ${startedServices.join(', ')}`
      );
    } else {
      this.logger.warn('No background services available to start');
    }
  }

  /**
   * Stop background services
   * Only stops services that are available
   */
  private stopServices(): void {
    const stoppedServices: string[] = [];

    // Stop cleanup scheduler if available
    if (this.cleanupService) {
      this.cleanupService.stopScheduledCleanup();
      stoppedServices.push('cleanup');
    }

    // Stop health monitoring if available
    if (this.healthService) {
      this.healthService.stopHealthMonitoring();
      stoppedServices.push('health monitoring');
    }

    if (stoppedServices.length > 0) {
      this.logger.log(
        `Checkpoint background services stopped: ${stoppedServices.join(', ')}`
      );
    }
  }
}
