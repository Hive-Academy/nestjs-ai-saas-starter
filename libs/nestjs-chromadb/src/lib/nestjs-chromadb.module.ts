import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import type { ChromaClient } from 'chromadb';
import {
  CHROMADB_CLIENT,
  CHROMADB_OPTIONS,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CHROMA_PORT,
  DEFAULT_CHROMA_SSL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
} from './constants';
import {
  ChromaDBModuleAsyncOptions,
  ChromaDBModuleOptions,
  ChromaDBOptionsFactory,
  CollectionConfig,
} from './interfaces/config';
import type { BaseDocument } from './types/core.interface';
import { ChromaDBRepository } from './repositories/chromadb-repository';
import {
  getRepositoryToken,
  getCollectionName,
} from './decorators/inject-repository.decorator';
import { CacheCleanupService } from './services/caching/cache-cleanup.service';
import { CacheOperationsService } from './services/caching/cache-operations.service';
import { CacheStatisticsService } from './services/caching/cache-statistics.service';
import { CacheStore } from './services/caching/cache-store.service';
import {
  CacheKeyGeneratorService,
  SizeEstimatorService,
  TtlCalculatorService,
} from './services/caching/cache-utilities.service';
import { ChromaCacheService } from './services/caching/chroma-cache.service';
import { VectorCacheService } from './services/caching/vector-cache.service';
import { ChromaAdminService } from './services/chroma-admin.service';
import { ChromaMetricsService } from './services/chroma-metrics.service';
import { ChromaDBService } from './services/chromadb.service';
import { ChromaDBCollectionService } from './services/core/chromadb-collection.service';
import { ChromaDBConnectionService } from './services/core/chromadb-connection.service';
import { ChromaDBDocumentService } from './services/core/chromadb-document.service';
import { ChromaDBOperationsService } from './services/core/chromadb-operations.service';
import { ChromaDBRepositoryService } from './services/core/chromadb-repository.service';
import { ChromaDBValidationService } from './services/core/chromadb-validation.service';
import { DocumentSanitizerService } from './services/core/validation/document-sanitizer.service';
import { DocumentValidatorService } from './services/core/validation/document-validator.service';
import { OptionsValidatorService } from './services/core/validation/options-validator.service';
import { ChromaDBHealthIndicator } from './services/core/health.service';
import { EmbeddingService } from './services/embedding.service';
import { ChromaDBEmbeddingProcessorService } from './services/facade/chromadb-embedding-processor.service';
import { ChromaDBPerformanceService } from './services/facade/chromadb-performance.service';
import { MetadataExtractorService } from './services/metadata-extractor.service';
import { TextSplitterService } from './services/text-splitter.service';
import { setChromaDBConfig } from './utils/config/chromadb-config.accessor';
import { TypeConversionUtils } from './utils/data/type-conversion.utils';
import { validateChromaDBOptions } from './validation/validate-chromadb-options';

@Global()
@Module({})
export class ChromaDBModule {
  /**
   * Register ChromaDB module synchronously
   */
  static forRoot(options: ChromaDBModuleOptions): DynamicModule {
    // Validate raw options first to fail fast before merging defaults
    validateChromaDBOptions(options as ChromaDBModuleOptions);
    const optionsWithDefaults = this.mergeWithDefaults(options);
    // Re-validate merged (ensures derived numeric defaults remain valid)
    validateChromaDBOptions(optionsWithDefaults);

    // Store config for decorator access
    setChromaDBConfig(optionsWithDefaults);

    const providers: Provider[] = [
      {
        provide: CHROMADB_OPTIONS,
        useValue: optionsWithDefaults,
      },
      {
        provide: CHROMADB_CLIENT,
        useFactory: async (opts: ChromaDBModuleOptions) => {
          const { ChromaClient } = await import('chromadb');
          return new ChromaClient({
            host: opts.connection.host,
            port: opts.connection.port,
            ssl: opts.connection.ssl,
            tenant: opts.connection.tenant,
            database: opts.connection.database,
          });
        },
        inject: [CHROMADB_OPTIONS],
      },
      {
        provide: EmbeddingService,
        useFactory: (opts: ChromaDBModuleOptions) => {
          const service = new EmbeddingService();
          service.initialize(opts.embedding);
          return service;
        },
        inject: [CHROMADB_OPTIONS],
      },
      {
        provide: ChromaDBCollectionService,
        useFactory: (
          connectionService: ChromaDBConnectionService,
          embeddingService: EmbeddingService
        ) => {
          return new ChromaDBCollectionService(
            connectionService,
            embeddingService
          );
        },
        inject: [ChromaDBConnectionService, EmbeddingService],
      },
      {
        provide: ChromaAdminService,
        useFactory: (client: ChromaClient) => {
          return new ChromaAdminService(client);
        },
        inject: [CHROMADB_CLIENT],
      },
      {
        provide: 'ConnectionConfig',
        useFactory: (opts: ChromaDBModuleOptions) => ({
          host: opts.connection.host,
          port: opts.connection.port ?? DEFAULT_CHROMA_PORT,
          ssl: opts.connection.ssl ?? DEFAULT_CHROMA_SSL,
          timeout: opts.connection.http?.timeout ?? opts.http?.timeout ?? 30000,
          retryAttempts:
            opts.connection.http?.maxRetries ??
            opts.http?.maxRetries ??
            opts.maxRetries ??
            DEFAULT_MAX_RETRIES,
          retryDelay:
            opts.connection.http?.retryDelay ??
            opts.http?.retryDelay ??
            opts.retryDelay ??
            DEFAULT_RETRY_DELAY,
        }),
        inject: [CHROMADB_OPTIONS],
      },
      MetadataExtractorService,
      TextSplitterService,
      TypeConversionUtils,
      ChromaMetricsService,
      ChromaCacheService,
      // Cache utility services and infrastructure
      CacheKeyGeneratorService,
      TtlCalculatorService,
      SizeEstimatorService,
      // Central cache store - owns the Map, config, and stats
      CacheStore,
      // Cache services - now just simple registrations
      CacheOperationsService,
      CacheStatisticsService,
      CacheCleanupService,
      // VectorCacheService - simple registration
      VectorCacheService,
      ChromaDBConnectionService,
      ChromaDBDocumentService,
      ChromaDBRepositoryService,
      ChromaDBOperationsService,
      ChromaDBHealthIndicator,
      DocumentValidatorService,
      OptionsValidatorService,
      DocumentSanitizerService,
      ChromaDBValidationService,
      {
        provide: ChromaDBPerformanceService,
        useFactory: (
          metrics?: ChromaMetricsService,
          cache?: ChromaCacheService
        ) => {
          return new ChromaDBPerformanceService(metrics, cache, {});
        },
        inject: [ChromaMetricsService, ChromaCacheService],
      },
      ChromaDBEmbeddingProcessorService,
      ChromaDBService,
    ];

    return {
      module: ChromaDBModule,
      providers,
      exports: [
        ChromaDBService,
        ChromaDBCollectionService,
        EmbeddingService,
        ChromaAdminService,
        TextSplitterService,
        MetadataExtractorService,
        ChromaDBHealthIndicator,
        CHROMADB_CLIENT,
      ],
      global: true,
    };
  }

  /**
   * Register ChromaDB module asynchronously
   */
  static forRootAsync(options: ChromaDBModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.createAsyncProviders(options),
      {
        provide: CHROMADB_CLIENT,
        useFactory: async (opts: ChromaDBModuleOptions) => {
          const { ChromaClient } = await import('chromadb');
          return new ChromaClient({
            host: opts.connection.host,
            port: opts.connection.port,
            ssl: opts.connection.ssl,
            tenant: opts.connection.tenant,
            database: opts.connection.database,
          });
        },
        inject: [CHROMADB_OPTIONS],
      },
      {
        provide: EmbeddingService,
        useFactory: (opts: ChromaDBModuleOptions) => {
          const service = new EmbeddingService();
          service.initialize(opts.embedding);
          return service;
        },
        inject: [CHROMADB_OPTIONS],
      },
      {
        provide: ChromaDBCollectionService,
        useFactory: (
          connectionService: ChromaDBConnectionService,
          embeddingService: EmbeddingService
        ) => {
          return new ChromaDBCollectionService(
            connectionService,
            embeddingService
          );
        },
        inject: [ChromaDBConnectionService, EmbeddingService],
      },
      {
        provide: ChromaAdminService,
        useFactory: (client: ChromaClient) => {
          return new ChromaAdminService(client);
        },
        inject: [CHROMADB_CLIENT],
      },
      {
        provide: 'ConnectionConfig',
        useFactory: (opts: ChromaDBModuleOptions) => ({
          host: opts.connection.host,
          port: opts.connection.port ?? DEFAULT_CHROMA_PORT,
          ssl: opts.connection.ssl ?? DEFAULT_CHROMA_SSL,
          timeout: opts.connection.http?.timeout ?? opts.http?.timeout ?? 30000,
          retryAttempts:
            opts.connection.http?.maxRetries ??
            opts.http?.maxRetries ??
            opts.maxRetries ??
            DEFAULT_MAX_RETRIES,
          retryDelay:
            opts.connection.http?.retryDelay ??
            opts.http?.retryDelay ??
            opts.retryDelay ??
            DEFAULT_RETRY_DELAY,
        }),
        inject: [CHROMADB_OPTIONS],
      },
      MetadataExtractorService,
      TextSplitterService,
      TypeConversionUtils,
      ChromaMetricsService,
      ChromaCacheService,
      // Cache utility services and infrastructure
      CacheKeyGeneratorService,
      TtlCalculatorService,
      SizeEstimatorService,
      // Central cache store - owns the Map, config, and stats
      CacheStore,
      // Cache services - now just simple registrations
      CacheOperationsService,
      CacheStatisticsService,
      CacheCleanupService,
      // VectorCacheService - simple registration
      VectorCacheService,
      ChromaDBConnectionService,
      ChromaDBDocumentService,
      ChromaDBRepositoryService,
      ChromaDBOperationsService,
      DocumentValidatorService,
      OptionsValidatorService,
      DocumentSanitizerService,
      ChromaDBValidationService,
      ChromaDBHealthIndicator,
      {
        provide: ChromaDBPerformanceService,
        useFactory: (
          metrics?: ChromaMetricsService,
          cache?: ChromaCacheService
        ) => {
          return new ChromaDBPerformanceService(metrics, cache, {});
        },
        inject: [ChromaMetricsService, ChromaCacheService],
      },
      ChromaDBEmbeddingProcessorService,
      ChromaDBService,
    ];

    return {
      module: ChromaDBModule,
      imports: options.imports || [],
      providers,
      exports: [
        ChromaDBService,
        ChromaDBCollectionService,
        EmbeddingService,
        ChromaAdminService,
        TextSplitterService,
        MetadataExtractorService,
        CHROMADB_CLIENT,
        ChromaDBHealthIndicator,
      ],
      global: true,
    };
  }

  /**
   * Register entity repositories (TypeORM-style) - NEW PATTERN
   *
   * Auto-generates ChromaDBRepository<T> for each entity class.
   * Custom repositories can override via provider replacement pattern.
   *
   * @param entities - Array of entity classes decorated with @ChromaEntity
   *
   * @example Auto-generated repositories
   * @Module({
   *   imports: [
   *     ChromaDBModule.forFeature([MemoryDocument, KnowledgeDocument])
   *   ]
   * })
   * export class MemoryModule {}
   *
   * @example Custom repository override
   * @Module({
   *   imports: [ChromaDBModule.forFeature([MemoryDocument])],
   *   providers: [
   *     {
   *       provide: getRepositoryToken(MemoryDocument),
   *       useClass: MemoryCustomRepository
   *     }
   *   ]
   * })
   * export class MemoryModule {}
   */
  static forFeature(entities: Type<unknown>[]): DynamicModule;

  /**
   * Register specific collections for injection
   */
  static forFeature(collections: CollectionConfig[]): DynamicModule;

  // Implementation handles both signatures
  static forFeature(
    entitiesOrCollections: Type<unknown>[] | CollectionConfig[]
  ): DynamicModule {
    // Check if first element is an entity class or collection config
    const isEntityBased =
      entitiesOrCollections.length > 0 &&
      typeof entitiesOrCollections[0] === 'function';

    if (isEntityBased) {
      // NEW PATTERN: Entity-based auto-generated repositories
      const entities = entitiesOrCollections as Type<unknown>[];
      const providers: Provider[] = entities.map((entity) => {
        const token = getRepositoryToken(entity);
        const collection = getCollectionName(entity);

        return {
          provide: token,
          useFactory: (chromaDB: ChromaDBService) => {
            // Auto-generate repository instance
            return new ChromaDBRepository(
              entity as Type<BaseDocument>,
              collection,
              chromaDB
            );
          },
          inject: [ChromaDBService],
        };
      });

      return {
        module: ChromaDBModule,
        providers,
        exports: providers,
      };
    } else {
      // OLD PATTERN: Collection-based (legacy)
      const collections = entitiesOrCollections as CollectionConfig[];
      const providers: Provider[] = collections.map((config) => ({
        provide: `COLLECTION_${config.name.toUpperCase()}`,
        useFactory: async (
          collectionService: ChromaDBCollectionService,
          embeddingService: EmbeddingService
        ) => {
          const embeddingFn =
            config.embeddingFunction ?? embeddingService.getEmbeddingFunction();
          return collectionService.createCollection(
            config.name,
            config.metadata,
            embeddingFn
          );
        },
        inject: [ChromaDBCollectionService, EmbeddingService],
      }));

      return {
        module: ChromaDBModule,
        providers,
        exports: providers,
      };
    }
  }

  private static createAsyncProviders(
    options: ChromaDBModuleAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    // Fallback: only options provider; consumer misconfigured if reaches here
    return [this.createAsyncOptionsProvider(options)];
  }

  private static createAsyncOptionsProvider(
    options: ChromaDBModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: CHROMADB_OPTIONS,
        useFactory: async (...args) => {
          const factory = options.useFactory as (
            ...args: any[]
          ) => Promise<ChromaDBModuleOptions> | ChromaDBModuleOptions;
          const config = await factory(...args);
          validateChromaDBOptions(config as ChromaDBModuleOptions);
          const configWithDefaults = this.mergeWithDefaults(config);
          validateChromaDBOptions(configWithDefaults);
          // Store config for decorator access
          setChromaDBConfig(configWithDefaults);
          return configWithDefaults;
        },
        inject: options.inject ?? [],
      };
    }

    return {
      provide: CHROMADB_OPTIONS,
      useFactory: async (optionsFactory: ChromaDBOptionsFactory) => {
        const config = await optionsFactory.createChromaDBOptions();
        validateChromaDBOptions(config as ChromaDBModuleOptions);
        const configWithDefaults = this.mergeWithDefaults(config);
        validateChromaDBOptions(configWithDefaults);
        // Store config for decorator access
        setChromaDBConfig(configWithDefaults);
        return configWithDefaults;
      },
      inject: options.useExisting
        ? [options.useExisting]
        : options.useClass
        ? [options.useClass]
        : [],
    };
  }

  private static mergeWithDefaults(
    options: ChromaDBModuleOptions
  ): ChromaDBModuleOptions {
    const defaults = {
      batchSize: DEFAULT_BATCH_SIZE,
      maxRetries: DEFAULT_MAX_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
      enableHealthCheck: true,
      healthCheckInterval: 30000,
      logConnection: true,
      connection: {
        port: DEFAULT_CHROMA_PORT,
        ssl: DEFAULT_CHROMA_SSL,
      },
    };

    return {
      ...defaults,
      ...options,
      connection: {
        ...defaults.connection,
        ...options.connection,
      },
    };
  }
}
