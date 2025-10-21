import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import type {
  MemoryModuleOptions,
  MemoryModuleAsyncOptions,
} from './interfaces/memory-module-options.interface';

import {
  MemoryConfigFactory,
  MemoryAdapterFactory,
  MemoryProviderFactory,
  MemoryAsyncProviderFactory,
} from './factories';

/**
 * Enhanced NestJS Memory Module with Adapter Pattern Support
 *
 * REFACTORED: Extracted responsibilities into focused factories
 * - MemoryConfigFactory: Configuration merging
 * - MemoryAdapterFactory: Adapter validation and provider creation
 * - MemoryProviderFactory: Service provider creation
 * - MemoryAsyncProviderFactory: Async configuration provider creation
 *
 * Benefits:
 * - Single Responsibility Principle (SRP)
 * - DRY: No duplication between forRoot and forRootAsync
 * - Testable: Each factory can be unit tested independently
 * - Maintainable: Easy to extend and modify
 *
 * Provides:
 * - Adapter-based vector database integration (required)
 * - Adapter-based graph database integration (optional)
 * - Memory orchestration services
 * - Store services for cross-thread memory
 * - Agent memory services
 * - Global IMemoryAdapter for consuming modules
 */
@Module({})
export class MemoryModule {
  /**
   * Configure module with synchronous options
   *
   * REFACTORED: Now uses factories for clean separation of concerns
   */
  static forRoot(options: MemoryModuleOptions = {}): DynamicModule {
    // 1. Merge options with defaults
    const mergedOptions = MemoryConfigFactory.mergeWithDefaults(options);

    // 2. Validate adapters
    MemoryAdapterFactory.validateAdapters(options);

    // 3. Build providers
    const providers: Provider[] = [
      // Configuration
      MemoryProviderFactory.createConfigProvider(mergedOptions),

      // Adapters (IVectorService, IGraphService)
      ...MemoryAdapterFactory.createAdapterProviders(options),

      // Core services (Store, Memory, Agent services)
      ...MemoryProviderFactory.createCoreProviders(),
    ];

    // 4. Add IMemoryAdapter provider if vector adapter available
    const hasVectorAdapter = !!options.adapters?.vector;
    if (hasVectorAdapter) {
      providers.push(MemoryProviderFactory.createMemoryAdapterProvider());
    }

    // 5. Build exports
    const exports = MemoryProviderFactory.getExports(hasVectorAdapter);

    return {
      module: MemoryModule,
      imports: [ConfigModule],
      providers,
      exports,
      global: true, // ← CRITICAL: Make memory global like checkpoint
    };
  }

  /**
   * Configure module with asynchronous options
   *
   * REFACTORED: Now uses factories for clean separation of concerns
   */
  static forRootAsync(options: MemoryModuleAsyncOptions): DynamicModule {
    // 1. Build providers
    const providers: Provider[] = [
      // Async configuration
      ...MemoryAsyncProviderFactory.createAsyncProviders(options),

      // Core services (Store, Memory, Agent services)
      ...MemoryProviderFactory.createCoreProviders(),

      // IMemoryAdapter (always provided in async mode)
      MemoryProviderFactory.createMemoryAdapterProvider(),
    ];

    // 2. Build exports (always include IMemoryAdapter in async mode)
    const exports = MemoryProviderFactory.getExports(true);

    return {
      module: MemoryModule,
      imports: [ConfigModule, ...(options.imports || [])],
      providers,
      exports,
      global: true,
    };
  }
}
