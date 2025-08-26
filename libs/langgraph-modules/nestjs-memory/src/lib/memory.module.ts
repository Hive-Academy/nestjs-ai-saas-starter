import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// NOTE: Removed ChromaDBModule and Neo4jModule imports - adapters handle their own DB dependencies

import { MemoryService } from './services/memory.service';
import { MemoryStorageService } from './services/memory-storage.service';
import { MemoryGraphService } from './services/memory-graph.service';

// Import adapters and interfaces
import { ChromaVectorAdapter } from './adapters/chroma-vector.adapter';
import { Neo4jGraphAdapter } from './adapters/neo4j-graph.adapter';
import { IVectorService } from './interfaces/vector-service.interface';
import { IGraphService } from './interfaces/graph-service.interface';

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
   */
  static forRoot(options: MemoryModuleOptions = {}): DynamicModule {
    const config = { ...DEFAULT_MEMORY_CONFIG, ...options };

    // Validate adapter configuration if provided
    this.validateAdapters(options);

    // Determine if custom adapters are provided
    const hasCustomVectorAdapter = !!options.adapters?.vector;
    const hasCustomGraphAdapter = !!options.adapters?.graph;

    // NOTE: Removed conditional database imports - adapters are now self-contained
    // Each adapter handles its own database connection and dependencies

    // Create adapter providers
    const adapterProviders = this.createAdapterProviders(options);

    return {
      module: MemoryModule,
      imports: [
        ConfigModule,
        // NOTE: No database module imports - pure adapter pattern
      ],
      providers: [
        // Configuration provider
        {
          provide: MEMORY_CONFIG,
          useValue: config,
        },
        // Adapter providers (conditional)
        ...adapterProviders,
        // Core services (updated to use adapters)
        MemoryStorageService,
        MemoryGraphService,
        MemoryService,
      ],
      exports: [
        MemoryService,
        MemoryStorageService,
        MemoryGraphService,
        MEMORY_CONFIG,
        // Export adapter interfaces for external use
        IVectorService,
        IGraphService,
      ],
      global: false,
    };
  }

  /**
   * Configure module with asynchronous options
   * NOTE: Updated to follow adapter pattern - no direct database imports
   */
  static forRootAsync(options: MemoryModuleAsyncOptions): DynamicModule {
    // Apply same adapter pattern as forRoot
    const adapterProviders = this.createAdapterProvidersAsync(options);

    return {
      module: MemoryModule,
      imports: [
        ConfigModule,
        // NOTE: No database module imports - adapters handle their own connections
        ...(options.imports || []),
      ],
      providers: [
        // Async configuration provider
        ...this.createAsyncProviders(options),
        // Adapter providers (self-contained)
        ...adapterProviders,
        // Core services
        MemoryStorageService,
        MemoryGraphService,
        MemoryService,
      ],
      exports: [
        MemoryService,
        MemoryStorageService,
        MemoryGraphService,
        MEMORY_CONFIG,
        // Export adapter interfaces for external use
        IVectorService,
        IGraphService,
      ],
      global: false,
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
   * Create adapter providers based on options
   * Handles both default adapters and custom adapter injection
   */
  private static createAdapterProviders(options: MemoryModuleOptions): Provider[] {
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
      // Use default ChromaDB adapter
      providers.push({
        provide: IVectorService,
        useClass: ChromaVectorAdapter,
      });
    }

    // Graph service adapter provider
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
    } else {
      // Use default Neo4j adapter
      providers.push({
        provide: IGraphService,
        useClass: Neo4jGraphAdapter,
      });
    }

    return providers;
  }

  /**
   * Create adapter providers for async configuration
   * Uses default adapters if none specified
   */
  private static createAdapterProvidersAsync(options: MemoryModuleAsyncOptions): Provider[] {
    const providers: Provider[] = [];

    // For async configuration, use default adapters since we don't have adapter options yet
    // TODO: Extend MemoryModuleAsyncOptions to support adapter configuration if needed
    providers.push(
      {
        provide: IVectorService,
        useClass: ChromaVectorAdapter,
      },
      {
        provide: IGraphService,
        useClass: Neo4jGraphAdapter,
      }
    );

    return providers;
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
        const requiredMethods = ['store', 'storeBatch', 'search', 'delete', 'getStats'];
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
        const requiredMethods = ['createNode', 'createRelationship', 'traverse', 'executeCypher', 'getStats'];
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
