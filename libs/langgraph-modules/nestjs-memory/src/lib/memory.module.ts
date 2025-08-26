import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

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

    // Build conditional imports based on adapter configuration
    const conditionalImports = [];

    // Import ChromaDB module only if not using custom vector adapter
    if (!hasCustomVectorAdapter) {
      conditionalImports.push(
        ChromaDBModule.forRoot({
          connection: {
            host: process.env.CHROMADB_HOST || 'localhost',
            port: parseInt(process.env.CHROMADB_PORT || '8000'),
          },
        })
      );
    }

    // Import Neo4j module only if not using custom graph adapter
    if (!hasCustomGraphAdapter) {
      conditionalImports.push(
        Neo4jModule.forRoot({
          uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
          username: process.env.NEO4J_USERNAME || 'neo4j',
          password: process.env.NEO4J_PASSWORD || 'password',
          database: config.neo4j?.database || 'neo4j',
        })
      );
    }

    // Create adapter providers
    const adapterProviders = this.createAdapterProviders(options);

    return {
      module: MemoryModule,
      imports: [
        ConfigModule,
        ...conditionalImports,
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
   */
  static forRootAsync(options: MemoryModuleAsyncOptions): DynamicModule {
    return {
      module: MemoryModule,
      imports: [
        ConfigModule,
        ChromaDBModule.forRoot({
          connection: {
            host: process.env.CHROMADB_HOST || 'localhost',
            port: parseInt(process.env.CHROMADB_PORT || '8000'),
          },
        }),
        Neo4jModule.forRoot({
          uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
          username: process.env.NEO4J_USERNAME || 'neo4j',
          password: process.env.NEO4J_PASSWORD || 'password',
          database: process.env.NEO4J_DATABASE || 'neo4j',
        }),
        ...(options.imports || []),
      ],
      providers: [
        // Async configuration provider
        ...this.createAsyncProviders(options),
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
