import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

import { MemoryService } from './services/memory.service';
import { MemoryStorageService } from './services/memory-storage.service';
import { MemoryGraphService } from './services/memory-graph.service';

import type {
  MemoryModuleOptions,
  MemoryModuleAsyncOptions,
  MemoryOptionsFactory,
} from './interfaces/memory-module-options.interface';

import { MEMORY_CONFIG, DEFAULT_MEMORY_CONFIG } from './constants/memory.constants';

/**
 * Standalone NestJS Memory Module
 * 
 * Provides:
 * - Direct ChromaDB integration for vector storage
 * - Direct Neo4j integration for graph relationships
 * - Memory orchestration services
 * - Standard NestJS module patterns
 */
@Module({})
export class MemoryModule {
  /**
   * Configure module with synchronous options
   */
  static forRoot(options: MemoryModuleOptions = {}): DynamicModule {
    const config = { ...DEFAULT_MEMORY_CONFIG, ...options };
    
    return {
      module: MemoryModule,
      imports: [
        ConfigModule,
        // Import ChromaDB module if not already available
        ChromaDBModule.forRoot({
          connection: {
            host: process.env.CHROMADB_HOST || 'localhost',
            port: parseInt(process.env.CHROMADB_PORT || '8000'),
          },
        }),
        // Import Neo4j module if not already available  
        Neo4jModule.forRoot({
          uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
          username: process.env.NEO4J_USERNAME || 'neo4j',
          password: process.env.NEO4J_PASSWORD || 'password',
          database: config.neo4j?.database || 'neo4j',
        }),
      ],
      providers: [
        // Configuration provider
        {
          provide: MEMORY_CONFIG,
          useValue: config,
        },
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
  private static createAsyncProviders(options: MemoryModuleAsyncOptions): Provider[] {
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
  private static createAsyncOptionsProvider(options: MemoryModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: MEMORY_CONFIG,
        useFactory: async (...args: unknown[]) => {
          const config = await options.useFactory!(...args);
          return { ...DEFAULT_MEMORY_CONFIG, ...config };
        },
        inject: options.inject || [] as any[],
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
}