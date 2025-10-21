import type { Provider } from '@nestjs/common';
import {
  MEMORY_CONFIG,
  DEFAULT_MEMORY_CONFIG,
} from '../constants/memory.constants';
import type {
  MemoryModuleAsyncOptions,
  MemoryOptionsFactory,
} from '../interfaces/memory-module-options.interface';

/**
 * Memory Async Provider Factory
 *
 * Responsibility: Create async configuration providers
 * Extracted from MemoryModule to follow Single Responsibility Principle
 *
 * Supports three async configuration patterns:
 * - useFactory: Function-based configuration
 * - useExisting: Existing provider-based configuration
 * - useClass: Class-based configuration
 */
export class MemoryAsyncProviderFactory {
  /**
   * Create async providers for different configuration strategies
   */
  static createAsyncProviders(options: MemoryModuleAsyncOptions): Provider[] {
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
   * Create async options provider based on configuration strategy
   */
  private static createAsyncOptionsProvider(
    options: MemoryModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return this.createFactoryProvider(options);
    }

    if (options.useExisting) {
      return this.createExistingProvider(options);
    }

    if (options.useClass) {
      return this.createClassProvider(options);
    }

    throw new Error('Invalid async options provided to MemoryModule');
  }

  /**
   * Create provider using useFactory pattern
   */
  private static createFactoryProvider(
    options: MemoryModuleAsyncOptions
  ): Provider {
    return {
      provide: MEMORY_CONFIG,
      useFactory: async (...args: unknown[]) => {
        const config = await options.useFactory!(...args);
        return { ...DEFAULT_MEMORY_CONFIG, ...config };
      },
      inject: options.inject || [],
    };
  }

  /**
   * Create provider using useExisting pattern
   */
  private static createExistingProvider(
    options: MemoryModuleAsyncOptions
  ): Provider {
    return {
      provide: MEMORY_CONFIG,
      useFactory: async (optionsFactory: MemoryOptionsFactory) => {
        const config = await optionsFactory.createMemoryOptions();
        return { ...DEFAULT_MEMORY_CONFIG, ...config };
      },
      inject: [options.useExisting!],
    };
  }

  /**
   * Create provider using useClass pattern
   */
  private static createClassProvider(
    options: MemoryModuleAsyncOptions
  ): Provider {
    return {
      provide: MEMORY_CONFIG,
      useFactory: async (optionsFactory: MemoryOptionsFactory) => {
        const config = await optionsFactory.createMemoryOptions();
        return { ...DEFAULT_MEMORY_CONFIG, ...config };
      },
      inject: [options.useClass!],
    };
  }
}
