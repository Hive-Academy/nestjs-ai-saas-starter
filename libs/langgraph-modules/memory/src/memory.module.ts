import {
  ChromaDBModule,
  ChromaDBModuleOptions,
} from '@hive-academy/nestjs-chromadb';
import { Neo4jModule, Neo4jModuleOptions } from '@hive-academy/nestjs-neo4j';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Import refactored memory services that use external libraries
import { MemoryConfig } from './lib/interfaces/memory.interface';
import { MemoryCoreService } from './lib/services/memory-core.service';
import { MemoryFacadeService } from './lib/services/memory-facade.service';
import { SemanticSearchService } from './lib/services/semantic-search.service';
import { SummarizationService } from './lib/services/summarization.service';
import { MemoryHealthService } from './lib/health/memory-health.service';

/**
 * Memory module that orchestrates ChromaDB vector storage and Neo4j graph relationships
 * Provides comprehensive memory capabilities for LangGraph applications
 */
@Module({})
export class LanggraphModulesMemoryModule {
  /**
   * Configure memory module with required ChromaDB and Neo4j dependencies
   */
  public static forRoot(config: {
    chromadb: ChromaDBModuleOptions;
    neo4j: Neo4jModuleOptions;
    memory?: Partial<MemoryConfig>;
  }): DynamicModule {
    const memoryConfig: MemoryConfig = {
      storage: { type: 'vector', vector: { provider: 'chromadb', config: {} } },
      enableSemanticSearch: true,
      enableAutoSummarization: true,
      ...config.memory,
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
      module: LanggraphModulesMemoryModule,
      imports: [
        ConfigModule,
        HttpModule,
        ChromaDBModule.forRoot(config.chromadb),
        Neo4jModule.forRoot(config.neo4j),
      ],
      providers,
      exports: [
        MemoryFacadeService, // Primary high-level memory interface
        SemanticSearchService, // Advanced search capabilities
        SummarizationService, // LLM-based summarization
        MemoryHealthService, // Health checks and monitoring
      ],
    };
  }

  /**
   * Configure memory module asynchronously with required ChromaDB and Neo4j dependencies
   */
  public static forRootAsync(options: {
    imports?: Array<Type | DynamicModule>;
    useFactory: (...args: unknown[]) =>
      | Promise<{
          chromadb: ChromaDBModuleOptions;
          neo4j: Neo4jModuleOptions;
          memory?: Partial<MemoryConfig>;
        }>
      | {
          chromadb: ChromaDBModuleOptions;
          neo4j: Neo4jModuleOptions;
          memory?: Partial<MemoryConfig>;
        };
    inject?: Array<Type | string | symbol>;
  }): DynamicModule {
    const configProvider: Provider = {
      provide: 'MEMORY_MODULE_CONFIG',
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    const memoryConfigProvider: Provider = {
      provide: 'MEMORY_CONFIG',
      useFactory: (moduleConfig: {
        chromadb: ChromaDBModuleOptions;
        neo4j: Neo4jModuleOptions;
        memory?: Partial<MemoryConfig>;
      }) => {
        const memoryConfig: MemoryConfig = {
          storage: {
            type: 'vector',
            vector: { provider: 'chromadb', config: {} },
          },
          enableSemanticSearch: true,
          enableAutoSummarization: true,
          ...moduleConfig.memory,
        };
        return memoryConfig;
      },
      inject: ['MEMORY_MODULE_CONFIG'],
    };

    const providers: Provider[] = [
      configProvider,
      memoryConfigProvider,
      // Core memory services that orchestrate external services
      MemoryCoreService,
      MemoryFacadeService,
      SemanticSearchService,
      SummarizationService,
      MemoryHealthService,
    ];

    return {
      module: LanggraphModulesMemoryModule,
      imports: [
        ConfigModule,
        HttpModule,
        ChromaDBModule.forRootAsync({
          useFactory: (...args: unknown[]) => {
            const moduleConfig = args[0] as {
              chromadb: ChromaDBModuleOptions;
              neo4j: Neo4jModuleOptions;
              memory?: Partial<MemoryConfig>;
            };
            return moduleConfig.chromadb;
          },
          inject: ['MEMORY_MODULE_CONFIG'],
        }),
        Neo4jModule.forRootAsync({
          useFactory: (...args: unknown[]) => {
            const moduleConfig = args[0] as {
              chromadb: ChromaDBModuleOptions;
              neo4j: Neo4jModuleOptions;
              memory?: Partial<MemoryConfig>;
            };
            return moduleConfig.neo4j;
          },
          inject: ['MEMORY_MODULE_CONFIG'],
        }),
        ...(options.imports ?? []),
      ],
      providers,
      exports: [
        MemoryFacadeService, // Primary high-level memory interface
        SemanticSearchService, // Advanced search capabilities
        SummarizationService, // LLM-based summarization
        MemoryHealthService, // Health checks and monitoring
      ],
    };
  }
}
