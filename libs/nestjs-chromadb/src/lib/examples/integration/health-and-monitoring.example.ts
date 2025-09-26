import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBFacadeService,
  ChromaMetricsService,
  ChromaDBHealthIndicator,
  HealthCheckError,
  ChromaCacheService,
} from '../../../index';

@Injectable()
export class HealthAndMonitoringExampleService implements OnModuleInit {
  private readonly logger = new Logger(HealthAndMonitoringExampleService.name);

  constructor(
    private readonly chroma: ChromaDBFacadeService,
    private readonly metrics: ChromaMetricsService,
    private readonly health: ChromaDBHealthIndicator,
    private readonly cache: ChromaCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Minimal deterministic bootstrap
    const collection = 'health-demo';
    await this.chroma.createCollection(collection, { example: true }).catch(() => void 0);
    await this.chroma
      .upsertDocuments(collection, [
        { id: 'h-1', document: 'health demo doc', metadata: { kind: 'health' } },
      ] as any)
      .catch(() => void 0);

    // Health check (detailed)
    try {
      const detailed = await this.health.isHealthyDetailed('chromadb');
      this.logger.log(`health(detailed): ${JSON.stringify(detailed)}`);
    } catch (e) {
      if (e instanceof HealthCheckError) {
        this.logger.warn(`health(detailed) down: ${JSON.stringify(e.causes)}`);
      } else {
        this.logger.error(`health(detailed) error: ${(e as Error).message}`);
      }
    }

    // Collection-specific health
    try {
      const cstatus = await this.health.isCollectionHealthy('chromadb_collection', collection);
      this.logger.log(`health(collection): ${JSON.stringify(cstatus)}`);
    } catch (e) {
      if (e instanceof HealthCheckError) {
        this.logger.warn(`health(collection) down: ${JSON.stringify(e.causes)}`);
      } else {
        this.logger.error(`health(collection) error: ${(e as Error).message}`);
      }
    }

    // Performance summary from metrics service (last 60 minutes)
    const perfSummary = this.metrics.getPerformanceSummary?.(60);
    this.logger.log(`performance(summary): ${JSON.stringify(perfSummary)}`);

    // Cache statistics and health from cache service
    const cacheStats = this.cache.getStatistics?.();
    this.logger.log(`cache(stats): ${JSON.stringify(cacheStats)}`);
    const cacheHealth = this.cache.getHealthStatus?.();
    this.logger.log(`cache(health): ${JSON.stringify(cacheHealth)}`);

    // Module-level metrics summary (service-local metrics aggregation)
    const healthSummary = this.metrics.getHealthStatus();
    this.logger.log(`metrics(healthStatus): ${JSON.stringify(healthSummary)}`);
  }
}

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: { host: 'localhost', port: 8000 },
      defaultCollection: 'health-demo',
      enableHealthCheck: false,
    }),
  ],
  providers: [HealthAndMonitoringExampleService, ChromaDBHealthIndicator],
  exports: [HealthAndMonitoringExampleService],
})
export class HealthAndMonitoringExampleModule {}
