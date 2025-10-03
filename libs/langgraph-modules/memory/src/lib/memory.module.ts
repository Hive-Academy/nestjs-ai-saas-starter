import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// NOTE: Removed ChromaDBModule and Neo4jModule imports - adapters handle their own DB dependencies

import { MemoryService } from './services/memory.service';
import { MemoryStorageService } from './services/memory-storage.service';
import { MemoryGraphService } from './services/memory-graph.service';

// Import interfaces only - adapters moved to application layer
import { IVectorService } from './interfaces/vector-service.interface';
import { IGraphService } from './interfaces/graph-service.interface';
import { MemoryManagerAdapter } from './interfaces/memory-adapter.interface';

import type {
  MemoryModuleOptions,
  MemoryModuleAsyncOptions,
  MemoryOptionsFactory,
} from './interfaces/memory-module-options.interface';

import {
  MEMORY_CONFIG,
  DEFAULT_MEMORY_CONFIG,
} from './constants/memory.constants';

/**
 * Enhanced NestJS Memory Module with Adapter Pattern Support
 *
 * Provides:
 * - Adapter-based vector database integration (default: ChromaDB)
 * - Adapter-based graph database integration (default: Neo4j)
 * - Memory orchestration services
 * - 100% backward compatibility with existing configurations
 * - Extensibility through custom adapter injection
 */
@Module({})
export class MemoryModule {
  /**
   * Configure module with synchronous options
   * Supports both legacy configuration (backward compatible) and new adapter injection
   * NEW: Provides global IMemoryAdapter when adapters are available
   */
  static forRoot(options: MemoryModuleOptions = {}): DynamicModule {
    const mergedOptions = this.mergeWithDefaults(options);

    // Validate adapter configuration if provided
    this.validateAdapters(options);

    // NOTE: Removed conditional database imports - adapters are now self-contained
    // Each adapter handles its own database connection and dependencies

    // Create adapter providers
    const adapterProviders = this.createAdapterProviders(options);

    const providers: Provider[] = [
      // Configuration provider
      {
        provide: MEMORY_CONFIG,
        useValue: mergedOptions,
      },
      // Adapter providers (conditional)
      ...adapterProviders,
      // Core services (updated to use adapters)
      MemoryStorageService,
      MemoryGraphService,
      MemoryService,
    ];

    // NEW: Provide IMemoryAdapter globally if adapters are available
    const exports = [
      MemoryService,
      MemoryStorageService,
      MemoryGraphService,
      MEMORY_CONFIG,
      // NOTE: IVectorService and IGraphService are NOT exported here
      // They are provided by the application module via adapter injection
    ];

    if (options.adapters?.vector) {
      providers.push({
        provide: 'IMemoryAdapter',
        useFactory: (
          memoryService: MemoryService,
          vectorAdapter: any,
          graphAdapter?: any
        ) =>
          new MemoryManagerAdapter(memoryService, vectorAdapter, graphAdapter),
        inject: [
          MemoryService,
          IVectorService,
          ...(options.adapters.graph ? [IGraphService] : []),
        ],
      });

      // Export memory adapter globally
      exports.push('IMemoryAdapter');
    }

    return {
      module: MemoryModule,
      imports: [
        ConfigModule,
        // NOTE: No database module imports - pure adapter pattern
      ],
      providers,
      exports,
      global: true, // ← CRITICAL: Make memory global like checkpoint
    };
  }

  /**
   * Configure module with asynchronous options
   * NOTE: Updated to follow adapter pattern - no direct database imports
   */
  static forRootAsync(options: MemoryModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      // Async configuration provider (creates MEMORY_CONFIG with adapters from useFactory)
      ...this.createAsyncProviders(options),
      // Core services
      MemoryStorageService,
      MemoryGraphService,
      MemoryService,
    ];

    const exports: any[] = [
      MemoryService,
      MemoryStorageService,
      MemoryGraphService,
      MEMORY_CONFIG,
    ];

    // Create IMemoryAdapter provider - adapters come from MEMORY_CONFIG (provided by app.module.ts)
    providers.push({
      provide: 'IMemoryAdapter',
      useFactory: (
        memoryService: MemoryService,
        config: MemoryModuleOptions
      ) => {
        if (config.adapters?.vector) {
          return new MemoryManagerAdapter(
            memoryService,
            config.adapters.vector,
            config.adapters.graph
          );
        }
        return null;
      },
      inject: [MemoryService, MEMORY_CONFIG],
    });

    exports.push('IMemoryAdapter');

    return {
      module: MemoryModule,
      imports: [ConfigModule, ...(options.imports || [])],
      providers,
      exports,
      global: true,
    };
  }

  /**
   * Create async providers for different configuration strategies
   */
  private static createAsyncProviders(
    options: MemoryModuleAsyncOptions
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

    return [];
  }

  /**
   * Create async options provider
   */
  private static createAsyncOptionsProvider(
    options: MemoryModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: MEMORY_CONFIG,
        useFactory: async (...args: unknown[]) => {
          const config = await options.useFactory!(...args);
          return { ...DEFAULT_MEMORY_CONFIG, ...config };
        },
        inject: options.inject || ([] as any[]),
      };
    }

    if (options.useExisting) {
      return {
        provide: MEMORY_CONFIG,
        useFactory: async (optionsFactory: MemoryOptionsFactory) => {
          const config = await optionsFactory.createMemoryOptions();
          return { ...DEFAULT_MEMORY_CONFIG, ...config };
        },
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: MEMORY_CONFIG,
        useFactory: async (optionsFactory: MemoryOptionsFactory) => {
          const config = await optionsFactory.createMemoryOptions();
          return { ...DEFAULT_MEMORY_CONFIG, ...config };
        },
        inject: [options.useClass],
      };
    }

    throw new Error('Invalid async options provided to MemoryModule');
  }

  /**
   * Merge options with enhanced defaults including agentic configuration
   */
  private static mergeWithDefaults(
    options: MemoryModuleOptions
  ): MemoryModuleOptions {
    return {
      collection: 'agentic_memory',
      enableAutoSummarization: true,

      // NEW: Agentic superpowers config
      agentic: {
        enabled: true,
        ragMode: 'enhanced',
        contextWindow: 10,
        learnFromConversations: true,
        personalizeResponses: true,
        crossThreadMemory: true,
      },

      // NEW: RAG configuration
      rag: {
        semanticSearch: {
          enabled: true,
          similarity: 0.7,
          maxResults: 5,
        },
        graphTraversal: {
          enabled: true,
          depth: 2,
          strength: 0.5,
        },
        hybridSearch: {
          vectorWeight: 0.7,
          graphWeight: 0.3,
        },
      },

      // NEW: Agent memory patterns
      agentMemory: {
        storeExecutions: true,
        storeFailures: true,
        contextualLearning: true,
        memoryTypes: ['conversation', 'preference', 'fact', 'pattern'],
      },

      // NEW: LangGraph Store compliance
      store: {
        enabled: true,
        namespaceStrategy: 'user',
        crossThreadSharing: true,
      },

      ...options,
    };
  }

  /**
   * Create adapter providers based on options
   * Handles both default adapters and custom adapter injection
   */
  private static createAdapterProviders(
    options: MemoryModuleOptions
  ): Provider[] {
    const providers: Provider[] = [];

    // Vector service adapter provider
    const vectorAdapter = options.adapters?.vector;
    if (vectorAdapter) {
      // Custom adapter provided
      if (typeof vectorAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: IVectorService,
          useClass: vectorAdapter as Type<IVectorService>,
        });
      } else {
        // It's an instance
        providers.push({
          provide: IVectorService,
          useValue: vectorAdapter,
        });
      }
    } else {
      // No default adapter - applications must provide their own adapters
      throw new Error(
        'MemoryModule requires a vector adapter. Please provide options.adapters.vector or import adapters in your application module.'
      );
    }

    // Graph service adapter provider (optional)
    const graphAdapter = options.adapters?.graph;
    if (graphAdapter) {
      // Custom adapter provided
      if (typeof graphAdapter === 'function') {
        // It's a class type
        providers.push({
          provide: IGraphService,
          useClass: graphAdapter as Type<IGraphService>,
        });
      } else {
        // It's an instance
        providers.push({
          provide: IGraphService,
          useValue: graphAdapter,
        });
      }
    }
    // NOTE: Graph adapter is now optional - graceful degradation

    return providers;
  }

  /**
   * Create adapter providers for async configuration
   * For async configuration, adapters are provided through the useFactory inject mechanism
   * This method returns empty array since adapters come from factory dependencies
   */
  private static createAdapterProvidersAsync(
    options: MemoryModuleAsyncOptions
  ): Provider[] {
    // For async configuration, adapters are provided via useFactory inject[]
    // No additional providers needed here
    return [];
  }

  /**
   * Validate adapter configuration
   * Ensures provided adapters implement the required interfaces
   */
  private static validateAdapters(options: MemoryModuleOptions): void {
    if (options.adapters?.vector) {
      const vectorAdapter = options.adapters.vector;
      if (typeof vectorAdapter === 'function') {
        // For class types, we can't validate at runtime easily
        // NestJS will handle this during injection
      } else {
        // For instances, check if it has required methods
        const requiredMethods = [
          'store',
          'storeBatch',
          'search',
          'delete',
          'getStats',
        ];
        for (const method of requiredMethods) {
          if (typeof (vectorAdapter as any)[method] !== 'function') {
            throw new Error(
              `Custom vector adapter must implement IVectorService.${method}() method`
            );
          }
        }
      }
    }

    if (options.adapters?.graph) {
      const graphAdapter = options.adapters.graph;
      if (typeof graphAdapter === 'function') {
        // For class types, we can't validate at runtime easily
        // NestJS will handle this during injection
      } else {
        // For instances, check if it has required methods
        const requiredMethods = [
          'createNode',
          'createRelationship',
          'traverse',
          'executeCypher',
          'getStats',
        ];
        for (const method of requiredMethods) {
          if (typeof (graphAdapter as any)[method] !== 'function') {
            throw new Error(
              `Custom graph adapter must implement IGraphService.${method}() method`
            );
          }
        }
      }
    }
  }
}
