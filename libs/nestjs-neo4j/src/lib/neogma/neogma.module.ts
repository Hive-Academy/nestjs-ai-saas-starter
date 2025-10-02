/**
 * @fileoverview Neogma NestJS module with dependency injection support
 */

import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { Neogma } from 'neogma';
import { NEOGMA_TOKEN, NEOGMA_OPTIONS_TOKEN } from './neogma.constants';
import type {
  NeogmaModuleOptions,
  NeogmaModuleAsyncOptions,
  NeogmaOptionsFactory,
} from './neogma.interfaces';

@Global()
@Module({})
export class NeogmaModule {
  /**
   * Create Neogma module with synchronous configuration
   */
  static forRoot(options: NeogmaModuleOptions): DynamicModule {
    const neogmaProvider: Provider = {
      provide: NEOGMA_TOKEN,
      useFactory: async (): Promise<Neogma> => {
        const neogma = new Neogma(
          {
            url: options.url,
            username: options.username,
            password: options.password,
            database: options.database,
          },
          options.config
        );

        // Verify connectivity on startup
        await neogma.verifyConnectivity();
        return neogma;
      },
    };

    return {
      module: NeogmaModule,
      providers: [neogmaProvider],
      exports: [neogmaProvider],
    };
  }

  /**
   * Create Neogma module with asynchronous configuration
   */
  static forRootAsync(options: NeogmaModuleAsyncOptions): DynamicModule {
    const neogmaProvider: Provider = {
      provide: NEOGMA_TOKEN,
      useFactory: async (
        neogmaOptions: NeogmaModuleOptions
      ): Promise<Neogma> => {
        const neogma = new Neogma(
          {
            url: neogmaOptions.url,
            username: neogmaOptions.username,
            password: neogmaOptions.password,
            database: neogmaOptions.database,
          },
          neogmaOptions.config
        );

        await neogma.verifyConnectivity();
        return neogma;
      },
      inject: [NEOGMA_OPTIONS_TOKEN],
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: NeogmaModule,
      imports: options.imports || [],
      providers: [...asyncProviders, neogmaProvider],
      exports: [neogmaProvider],
    };
  }

  private static createAsyncProviders(
    options: NeogmaModuleAsyncOptions
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

  private static createAsyncOptionsProvider(
    options: NeogmaModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: NEOGMA_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useExisting) {
      return {
        provide: NEOGMA_OPTIONS_TOKEN,
        useFactory: async (optionsFactory: NeogmaOptionsFactory) =>
          optionsFactory.createNeogmaOptions(),
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: NEOGMA_OPTIONS_TOKEN,
        useFactory: async (optionsFactory: NeogmaOptionsFactory) =>
          optionsFactory.createNeogmaOptions(),
        inject: [options.useClass],
      };
    }

    throw new Error('Invalid async options configuration');
  }
}
