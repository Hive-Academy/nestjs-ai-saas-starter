/**
 * @fileoverview NestJS Memory Module - BaseStore DI Bridge
 *
 * Provides LangGraph BaseStore implementation via ChromaDBBaseStore.
 * Thin dependency injection layer enabling workflow nodes to access
 * persistent memory storage through LangGraph's standard Store interface.
 *
 * Key Features:
 * - BaseStore provider via factory pattern
 * - ChromaDBService integration
 * - forRoot() and forRootAsync() configuration
 * - Global module pattern for cross-module availability
 *
 * Consumer Usage:
 * ```typescript
 * // 1. Module Import
 * @Module({
 *   imports: [
 *     ChromaDBModule.forRoot({ url: 'http://localhost:8000' }),
 *     MemoryModule.forRoot({ collection: 'langgraph_store' }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 2. Service Injection (with typed token)
 * @Injectable()
 * export class WorkflowService {
 *   constructor(
 *     @Optional()
 *     @Inject(BASE_STORE_TOKEN) private readonly store?: BaseStore
 *   ) {}
 *
 *   async compileGraph() {
 *     return builder.compile({
 *       checkpointer: this.checkpointer,
 *       store: this.store, // Store available to all nodes
 *     });
 *   }
 * }
 *
 * // 3. Node Access (LangGraph Nodes - with type-safe helpers)
 * import { RunnableConfigStoreHelpers } from '@hive-academy/langgraph-memory';
 *
 * async function myNode(state: State, config: RunnableConfig): Promise<Partial<State>> {
 *   // Store automatically available via config - use helper for type safety
 *   const store = RunnableConfigStoreHelpers.getStore(config);
 *
 *   if (store) {
 *     // Use LangGraph BaseStore methods
 *     await store.put(['memories', userId], 'context', { query, result });
 *     const memories = await store.search(['memories', userId], { query, limit: 5 });
 *   }
 *
 *   return { memories, processed: true };
 * }
 * ```
 *
 * @module MemoryModule
 */

import { DynamicModule, Module } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBService,
  CollectionRegistryService,
} from '@hive-academy/nestjs-chromadb';
import { ChromaDBBaseStore } from './stores/chromadb-base-store';
import { LangGraphStoreRepository } from './repositories/langgraph-store.repository';
import { LangGraphStoreEntity } from './entities/langgraph-store.entity';
import { BASE_STORE_TOKEN } from './tokens/base-store.token';

/**
 * Memory module configuration options
 *
 * Minimal configuration for BaseStore provider with optional future enhancements.
 *
 * @interface MemoryModuleOptions
 */
export interface MemoryModuleOptions {
  /**
   * ChromaDB collection name for storing LangGraph items
   *
   * @default 'langgraph_store'
   */
  collection?: string;

  /**
   * Enable semantic search capabilities (future enhancement)
   *
   * When enabled, BaseStore search operations will use vector similarity
   * in addition to metadata filtering.
   *
   * @default false
   */
  enableSemanticSearch?: boolean;
}

/**
 * Async configuration options for MemoryModule
 *
 * Supports dynamic configuration loading from external sources
 * (ConfigService, database, etc.)
 *
 * @interface MemoryModuleAsyncOptions
 */
export interface MemoryModuleAsyncOptions {
  /**
   * Modules to import for async configuration dependencies
   */
  imports?: any[];

  /**
   * Factory function to create module options asynchronously
   *
   * @param args - Injected dependencies
   * @returns Module options or promise resolving to options
   */
  useFactory: (
    ...args: any[]
  ) => Promise<MemoryModuleOptions> | MemoryModuleOptions;

  /**
   * Dependencies to inject into useFactory function
   */
  inject?: any[];
}

/**
 * Memory Module - BaseStore DI Bridge
 *
 * Provides LangGraph BaseStore implementation for persistent memory storage.
 * Designed as a thin dependency injection layer connecting ChromaDB to LangGraph's
 * store interface.
 *
 * Architecture:
 * - Single responsibility: Provide BaseStore implementation
 * - Zero business logic: Pure DI configuration
 * - Global availability: All modules can inject BaseStore
 *
 * @class MemoryModule
 */
@Module({})
export class MemoryModule {
  /**
   * Configure module with synchronous options
   *
   * Creates BaseStore provider using ChromaDBService factory injection.
   * Suitable for static configuration values.
   *
   * @param options - Memory module configuration
   * @returns Dynamic module configuration
   *
   * @example
   * ```typescript
   * MemoryModule.forRoot({
   *   collection: 'langgraph_store',
   *   enableSemanticSearch: false,
   * })
   * ```
   */
  static forRoot(options: MemoryModuleOptions = {}): DynamicModule {
    return {
      module: MemoryModule,
      imports: [
        // Import ChromaDBModule to get ChromaDBService and CollectionRegistryService
        ChromaDBModule,
        // Register LangGraphStoreEntity with ChromaDB collection system
        ChromaDBModule.forFeature([LangGraphStoreEntity]),
      ],
      providers: [
        // Repository provider with proper DI
        {
          provide: LangGraphStoreRepository,
          useFactory: (
            chromaDB: ChromaDBService,
            collectionRegistry: CollectionRegistryService
          ) => {
            return new LangGraphStoreRepository(chromaDB, collectionRegistry);
          },
          inject: [ChromaDBService, CollectionRegistryService],
        },
        // BaseStore provider using typed token and repository pattern
        {
          provide: BASE_STORE_TOKEN,
          useFactory: (repository: LangGraphStoreRepository) => {
            // Create ChromaDBBaseStore with repository delegation
            return new ChromaDBBaseStore(repository);
          },
          inject: [LangGraphStoreRepository],
        },
      ],
      exports: [BASE_STORE_TOKEN, LangGraphStoreRepository],
      global: true, // Make BaseStore available globally
    };
  }

  /**
   * Configure module with asynchronous options
   *
   * Creates BaseStore provider using async factory for dynamic configuration.
   * Suitable for loading configuration from external sources (ConfigService,
   * database, environment variables, etc.)
   *
   * @param options - Async module configuration
   * @returns Dynamic module configuration
   *
   * @example
   * ```typescript
   * MemoryModule.forRootAsync({
   *   imports: [ConfigModule],
   *   useFactory: async (configService: ConfigService) => ({
   *     collection: configService.get('LANGGRAPH_STORE_COLLECTION'),
   *     enableSemanticSearch: configService.get('ENABLE_SEMANTIC_SEARCH'),
   *   }),
   *   inject: [ConfigService],
   * })
   * ```
   */
  static forRootAsync(options: MemoryModuleAsyncOptions): DynamicModule {
    return {
      module: MemoryModule,
      imports: [
        // Import ChromaDBModule for ChromaDBService and CollectionRegistryService
        ChromaDBModule,
        // Register LangGraphStoreEntity with ChromaDB collection system
        ChromaDBModule.forFeature([LangGraphStoreEntity]),
        // Import user-provided modules for async configuration
        ...(options.imports || []),
      ],
      providers: [
        // Provider for async module options
        {
          provide: 'MEMORY_MODULE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        // Repository provider with proper DI
        {
          provide: LangGraphStoreRepository,
          useFactory: (
            chromaDB: ChromaDBService,
            collectionRegistry: CollectionRegistryService
          ) => {
            return new LangGraphStoreRepository(chromaDB, collectionRegistry);
          },
          inject: [ChromaDBService, CollectionRegistryService],
        },
        // BaseStore provider using typed token and repository pattern
        {
          provide: BASE_STORE_TOKEN,
          useFactory: (repository: LangGraphStoreRepository) => {
            // Create ChromaDBBaseStore with repository delegation
            return new ChromaDBBaseStore(repository);
          },
          inject: [LangGraphStoreRepository],
        },
      ],
      exports: [BASE_STORE_TOKEN, LangGraphStoreRepository],
      global: true, // Make BaseStore available globally
    };
  }
}
