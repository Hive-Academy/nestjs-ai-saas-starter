import {
  DynamicModule,
  Global,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
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
} from './interfaces/chromadb-module-options.interface';
import { ChromaAdminService } from './services/chroma-admin.service';
import { ChromaDBService } from './services/chromadb.service';
import { ChromaDBCollectionService } from './services/core/chromadb-collection.service';
import { EmbeddingService } from './services/embedding.service';
import { TextSplitterService } from './services/text-splitter.service';
import { MetadataExtractorService } from './services/metadata-extractor.service';
import { setChromaDBConfig } from './utils/chromadb-config.accessor';
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
          client: ChromaClient,
          embeddingService: EmbeddingService
        ) => {
          return new ChromaDBCollectionService(client, embeddingService);
        },
        inject: [CHROMADB_CLIENT, EmbeddingService],
      },
      {
        provide: ChromaAdminService,
        useFactory: (client: ChromaClient) => {
          return new ChromaAdminService(client);
        },
        inject: [CHROMADB_CLIENT],
      },
      MetadataExtractorService,
      TextSplitterService,
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
          client: ChromaClient,
          embeddingService: EmbeddingService
        ) => {
          return new ChromaDBCollectionService(client, embeddingService);
        },
        inject: [CHROMADB_CLIENT, EmbeddingService],
      },
      {
        provide: ChromaAdminService,
        useFactory: (client: ChromaClient) => {
          return new ChromaAdminService(client);
        },
        inject: [CHROMADB_CLIENT],
      },
      MetadataExtractorService,
      TextSplitterService,
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
      ],
      global: true,
    };
  }

  /**
   * Register specific collections for injection
   */
  static forFeature(collections: CollectionConfig[]): DynamicModule {
    const providers: Provider[] = collections.map((config) => ({
      provide: `COLLECTION_${config.name.toUpperCase()}`,
      useFactory: async (
        collectionService: ChromaDBCollectionService,
        embeddingService: EmbeddingService
      ) => {
        const embeddingFn =
          config.embeddingFunction ?? embeddingService.getEmbeddingFunction();
        return collectionService.getOrCreateCollection(config.name, {
          metadata: config.metadata,
          embeddingFunction: embeddingFn,
        });
      },
      inject: [ChromaDBCollectionService, EmbeddingService],
    }));

    return {
      module: ChromaDBModule,
      providers,
      exports: providers,
    };
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
