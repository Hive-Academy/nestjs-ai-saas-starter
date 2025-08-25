import { Module, DynamicModule, Provider } from '@nestjs/common';
import { DatabaseProviderFactory } from './database-provider.factory';
import {
  IDatabaseProviderFactory,
  MemoryDetectionResult,
} from '../interfaces/database-provider.interface';

/**
 * Token for the memory database detector provider
 */
export const MEMORY_DATABASE_DETECTOR = 'MEMORY_DATABASE_DETECTOR';

/**
 * Token for database provider factory
 */
export const DATABASE_PROVIDER_FACTORY = 'DATABASE_PROVIDER_FACTORY';

/**
 * Memory Provider Module
 *
 * Configures auto-detection providers for database services and exports
 * necessary providers for use by other modules in the memory system.
 *
 * This module automatically detects available ChromaDB and Neo4j services
 * and provides a factory pattern for creating database connections.
 */
@Module({})
export class MemoryProviderModule {
  /**
   * Configure the memory provider module synchronously
   */
  static forRoot(): DynamicModule {
    const providers = this.createProviders();

    return {
      module: MemoryProviderModule,
      providers,
      exports: providers,
      global: false, // Not global to avoid conflicts
    };
  }

  /**
   * Configure the memory provider module asynchronously
   * Useful when you need to perform async initialization
   */
  static forRootAsync(): DynamicModule {
    const providers = this.createAsyncProviders();

    return {
      module: MemoryProviderModule,
      providers,
      exports: providers,
      global: false,
    };
  }

  /**
   * Create synchronous providers
   */
  private static createProviders(): Provider[] {
    return [
      // Main database provider factory
      {
        provide: DATABASE_PROVIDER_FACTORY,
        useClass: DatabaseProviderFactory,
      },

      // Interface-based provider for dependency injection
      {
        provide: 'IDatabaseProviderFactory',
        useExisting: DATABASE_PROVIDER_FACTORY,
      },

      // Memory database detector - provides detection results on demand
      {
        provide: MEMORY_DATABASE_DETECTOR,
        useFactory: async (
          factory: DatabaseProviderFactory
        ): Promise<MemoryDetectionResult> => {
          return await factory.detectMemoryCapabilities();
        },
        inject: [DATABASE_PROVIDER_FACTORY],
      },

      // Direct export of the factory class
      DatabaseProviderFactory,
    ];
  }

  /**
   * Create asynchronous providers
   */
  private static createAsyncProviders(): Provider[] {
    return [
      // Async factory for database provider factory
      {
        provide: DATABASE_PROVIDER_FACTORY,
        useFactory: async (): Promise<DatabaseProviderFactory> => {
          const factory = new DatabaseProviderFactory();

          // Perform any async initialization here if needed
          await factory.getAvailableProviders(); // Prime the factory

          return factory;
        },
      },

      // Interface-based provider
      {
        provide: 'IDatabaseProviderFactory',
        useExisting: DATABASE_PROVIDER_FACTORY,
      },

      // Async memory detector
      {
        provide: MEMORY_DATABASE_DETECTOR,
        useFactory: async (
          factory: IDatabaseProviderFactory
        ): Promise<MemoryDetectionResult> => {
          if (factory instanceof DatabaseProviderFactory) {
            return await factory.detectMemoryCapabilities();
          }

          // Fallback if factory is different implementation
          const providers = await factory.getAvailableProviders();
          return {
            hasProviders: providers.length > 0,
            vectorProviders: providers.filter((p) => p.type === 'chromadb'),
            graphProviders: providers.filter((p) => p.type === 'neo4j'),
            customProviders: providers.filter((p) => p.type === 'custom'),
            recommendedConfig: null,
            features: {
              semanticSearch: providers.some((p) => p.type === 'chromadb'),
              graphTraversal: providers.some((p) => p.type === 'neo4j'),
              persistentMemory: providers.length > 0,
              crossThreadMemory:
                providers.some((p) => p.type === 'chromadb') &&
                providers.some((p) => p.type === 'neo4j'),
            },
          };
        },
        inject: [DATABASE_PROVIDER_FACTORY],
      },

      // Direct class export
      DatabaseProviderFactory,
    ];
  }

  /**
   * Create feature flag providers based on available database services
   * These can be injected to enable/disable features based on available databases
   */
  static createFeatureFlagProviders(): Provider[] {
    return [
      {
        provide: 'MEMORY_FEATURES_SEMANTIC_SEARCH',
        useFactory: async (
          detector: MemoryDetectionResult
        ): Promise<boolean> => {
          return detector.features.semanticSearch;
        },
        inject: [MEMORY_DATABASE_DETECTOR],
      },

      {
        provide: 'MEMORY_FEATURES_GRAPH_TRAVERSAL',
        useFactory: async (
          detector: MemoryDetectionResult
        ): Promise<boolean> => {
          return detector.features.graphTraversal;
        },
        inject: [MEMORY_DATABASE_DETECTOR],
      },

      {
        provide: 'MEMORY_FEATURES_PERSISTENT_MEMORY',
        useFactory: async (
          detector: MemoryDetectionResult
        ): Promise<boolean> => {
          return detector.features.persistentMemory;
        },
        inject: [MEMORY_DATABASE_DETECTOR],
      },

      {
        provide: 'MEMORY_FEATURES_CROSS_THREAD_MEMORY',
        useFactory: async (
          detector: MemoryDetectionResult
        ): Promise<boolean> => {
          return detector.features.crossThreadMemory;
        },
        inject: [MEMORY_DATABASE_DETECTOR],
      },
    ];
  }

  /**
   * Create providers with feature flags included
   */
  static forRootWithFeatures(): DynamicModule {
    const baseProviders = this.createProviders();
    const featureProviders = this.createFeatureFlagProviders();
    const allProviders = [...baseProviders, ...featureProviders];

    return {
      module: MemoryProviderModule,
      providers: allProviders,
      exports: allProviders,
      global: false,
    };
  }
}

/**
 * Export tokens for use in other modules
 */
export const MEMORY_PROVIDER_TOKENS = {
  DATABASE_PROVIDER_FACTORY,
  MEMORY_DATABASE_DETECTOR,
  FEATURES: {
    SEMANTIC_SEARCH: 'MEMORY_FEATURES_SEMANTIC_SEARCH',
    GRAPH_TRAVERSAL: 'MEMORY_FEATURES_GRAPH_TRAVERSAL',
    PERSISTENT_MEMORY: 'MEMORY_FEATURES_PERSISTENT_MEMORY',
    CROSS_THREAD_MEMORY: 'MEMORY_FEATURES_CROSS_THREAD_MEMORY',
  },
} as const;
