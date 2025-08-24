import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Import refactored memory services that use external libraries
import { MemoryConfig } from './lib/interfaces/memory.interface';
import { MemoryCoreService } from './lib/services/memory-core.service';
import { MemoryFacadeService } from './lib/services/memory-facade.service';
import { SemanticSearchService } from './lib/services/semantic-search.service';
import { SummarizationService } from './lib/services/summarization.service';
import { MemoryHealthService } from './lib/health/memory-health.service';

/**
 * Memory module that uses injected ChromaDB and Neo4j services from the main app
 * No longer creates its own database connections
 */
@Module({})
export class AgenticMemoryModule {
  /**
   * Configure memory module WITHOUT database connections
   * Uses existing ChromaDB and Neo4j services via dependency injection
   */
  public static forRoot(config?: Partial<MemoryConfig>): DynamicModule {
    const memoryConfig: MemoryConfig = {
      storage: { type: 'vector', vector: { provider: 'chromadb', config: {} } },
      enableSemanticSearch: true,
      enableAutoSummarization: true,
      ...config,
    };

    const providers: Provider[] = [
      {
        provide: 'MEMORY_CONFIG',
        useValue: memoryConfig,
      },
      // Core memory services that orchestrate external services
      MemoryCoreService,
      MemoryFacadeService,
      SemanticSearchService,
      SummarizationService,
      MemoryHealthService,
    ];

    return {
      module: AgenticMemoryModule,
      imports: [
        ConfigModule,
        HttpModule,
        // NO ChromaDBModule.forRoot() - uses injected service
        // NO Neo4jModule.forRoot() - uses injected service
      ],
      providers,
      exports: [
        MemoryFacadeService,     // Primary high-level memory interface
        MemoryCoreService,        // For MemoryAdapter compatibility
        SemanticSearchService,    // Advanced search capabilities
        SummarizationService,     // LLM-based summarization
        MemoryHealthService,      // Health checks and monitoring
        // Also export with string tokens for MemoryAdapter
        {
          provide: 'MemoryFacadeService',
          useExisting: MemoryFacadeService,
        },
        {
          provide: 'MemoryCoreService',
          useExisting: MemoryCoreService,
        },
      ],
    };
  }

  /**
   * Configure memory module asynchronously WITHOUT database connections
   * Uses existing ChromaDB and Neo4j services via dependency injection
   */
  public static forRootAsync(options: {
    imports?: Array<any>;
    useFactory: (...args: unknown[]) =>
      | Promise<Partial<MemoryConfig>>
      | Partial<MemoryConfig>;
    inject?: Array<any>;
  }): DynamicModule {
    const memoryConfigProvider: Provider = {
      provide: 'MEMORY_CONFIG',
      useFactory: async (...args: unknown[]) => {
        const config = await options.useFactory(...args);
        const memoryConfig: MemoryConfig = {
          storage: {
            type: 'vector',
            vector: { provider: 'chromadb', config: {} },
          },
          enableSemanticSearch: true,
          enableAutoSummarization: true,
          ...config,
        };
        return memoryConfig;
      },
      inject: options.inject ?? [],
    };

    const providers: Provider[] = [
      memoryConfigProvider,
      // Core memory services that use injected database services
      MemoryCoreService,
      MemoryFacadeService,
      SemanticSearchService,
      SummarizationService,
      MemoryHealthService,
    ];

    return {
      module: AgenticMemoryModule,
      imports: [
        ConfigModule,
        HttpModule,
        // NO ChromaDBModule.forRootAsync() - uses injected service
        // NO Neo4jModule.forRootAsync() - uses injected service
        ...(options.imports ?? []),
      ],
      providers,
      exports: [
        MemoryFacadeService,     // Primary high-level memory interface
        MemoryCoreService,        // For MemoryAdapter compatibility
        SemanticSearchService,    // Advanced search capabilities
        SummarizationService,     // LLM-based summarization
        MemoryHealthService,      // Health checks and monitoring
        // Also export with string tokens for MemoryAdapter
        {
          provide: 'MemoryFacadeService',
          useExisting: MemoryFacadeService,
        },
        {
          provide: 'MemoryCoreService',
          useExisting: MemoryCoreService,
        },
      ],
    };
  }
}
