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

import { DynamicModule, Module, Type } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBService,
  CollectionRegistryService,
} from '@hive-academy/nestjs-chromadb';
import { ChromaDBBaseStore } from './stores/chromadb-base-store';
import { LangGraphStoreRepository } from './repositories/langgraph-store.repository';
import { LangGraphStoreEntity } from './entities/langgraph-store.entity';
import { BASE_STORE_TOKEN } from './tokens/base-store.token';
import { THREAD_REGISTRY_TOKEN } from './tokens/thread-registry.token';
import type { IThreadRegistryStore } from './interfaces/thread-registry-store.interface';

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

  /**
   * Thread registry configuration for thread metadata storage
   *
   * Enables conversation list functionality by providing thread metadata storage.
   * Supports both class-based adapters (Neo4jThreadRegistryAdapter) and instance-based
   * adapters for maximum flexibility.
   *
   * @example
   * ```typescript
   * // Class-based adapter
   * MemoryModule.forRoot({
   *   threadRegistry: {
   *     adapter: Neo4jThreadRegistryAdapter,
   *     defaultLimit: 20
   *   }
   * })
   *
   * // Instance-based adapter
   * MemoryModule.forRoot({
   *   threadRegistry: {
   *     adapter: new ChromaDBThreadRegistryAdapter(chromaService),
   *     defaultLimit: 50
   *   }
   * })
   * ```
   */
  threadRegistry?: {
    /**
     * Thread registry storage adapter (class or instance)
     */
    adapter: Type<IThreadRegistryStore> | IThreadRegistryStore;

    /**
     * Default limit for thread listing pagination
     *
     * @default 20
     */
    defaultLimit?: number;
  };
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
    const providers: any[] = [
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
    ];

    // Build exports array - conditionally include THREAD_REGISTRY_TOKEN
    const exports: any[] = [BASE_STORE_TOKEN, LangGraphStoreRepository];

    // Conditionally add ThreadRegistryStore provider
    if (options.threadRegistry) {
      const adapterConfig = options.threadRegistry;

      // Support both class-based and instance-based adapters
      if (typeof adapterConfig.adapter === 'function') {
        // Class-based adapter (Neo4jThreadRegistryAdapter)
        providers.push({
          provide: THREAD_REGISTRY_TOKEN,
          useClass: adapterConfig.adapter,
        });
      } else {
        // Instance-based adapter (new ChromaDBThreadRegistryAdapter(...))
        providers.push({
          provide: THREAD_REGISTRY_TOKEN,
          useValue: adapterConfig.adapter,
        });
      }
      // Only export THREAD_REGISTRY_TOKEN when it's provided
      exports.push(THREAD_REGISTRY_TOKEN);
    } else {
      // Log warning when threadRegistry not configured
      console.warn(
        '[MemoryModule] Thread registry not configured - thread listing unavailable'
      );
    }

    return {
      module: MemoryModule,
      imports: [
        // Import ChromaDBModule to get ChromaDBService and CollectionRegistryService
        ChromaDBModule,
        // Register LangGraphStoreEntity with ChromaDB collection system
        ChromaDBModule.forFeature([LangGraphStoreEntity]),
      ],
      providers,
      exports,
      global: true, // Make BaseStore and ThreadRegistry available globally
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
    const providers: any[] = [
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
      // ThreadRegistryStore provider (async factory) - ALWAYS created to check config
      {
        provide: THREAD_REGISTRY_TOKEN,
        useFactory: (moduleOptions: MemoryModuleOptions) => {
          if (moduleOptions.threadRegistry) {
            const adapterConfig = moduleOptions.threadRegistry;

            // Support both class-based and instance-based adapters
            if (typeof adapterConfig.adapter === 'function') {
              // Class-based adapter - instantiate
              return new adapterConfig.adapter();
            } else {
              // Instance-based adapter - return as-is
              return adapterConfig.adapter;
            }
          } else {
            // Log warning when threadRegistry not configured
            console.warn(
              '[MemoryModule] Thread registry not configured - thread listing unavailable'
            );
            return null;
          }
        },
        inject: ['MEMORY_MODULE_OPTIONS'],
      },
    ];

    // Build exports array - BASE_STORE_TOKEN and LangGraphStoreRepository always exported
    // THREAD_REGISTRY_TOKEN always exported in async mode since provider always exists
    // (returns null when not configured)
    const exports: any[] = [
      BASE_STORE_TOKEN,
      THREAD_REGISTRY_TOKEN,
      LangGraphStoreRepository,
    ];

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
      providers,
      exports,
      global: true, // Make BaseStore and ThreadRegistry available globally
    };
  }
}
