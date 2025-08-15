import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DiscoveryModule } from '@nestjs/core';
import {
  LangGraphModuleOptions,
  LangGraphModuleAsyncOptions,
  LangGraphOptionsFactory,
} from './interfaces/module-options.interface';
import {
  LANGGRAPH_MODULE_OPTIONS,
  LANGGRAPH_MODULE_ID,
  DEFAULT_LLM,
  TOOL_REGISTRY,
  STREAM_MANAGER,
} from './constants';
import { randomUUID } from 'crypto';

// Organized provider factories
import {
  createModuleProviders,
  createModuleProvidersAsync,
  createModuleExports,
  ChildModuleImportFactory,
} from './providers';

@Global()
@Module({})
export class NestjsLanggraphModule {
  static forRoot(options: LangGraphModuleOptions = {}): DynamicModule {
    const moduleId = randomUUID();

    // Create child module imports dynamically based on configuration
    const childModuleImports = ChildModuleImportFactory.createChildModuleImports(options);

    // Use organized provider factories
    const providers = createModuleProviders(options, moduleId);
    const exports = createModuleExports();

    return {
      module: NestjsLanggraphModule,
      imports: [
        ...childModuleImports,
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          maxListeners: 100,
          verboseMemoryLeak: true,
        }),
        DiscoveryModule,
      ],
      providers,
      exports,
    };
  }

  static forRootAsync(options: LangGraphModuleAsyncOptions): DynamicModule {
    const moduleId = randomUUID();
    const asyncProviders = this.createAsyncProviders(options);

    // Use organized provider factories
    const providers = createModuleProvidersAsync(
      asyncProviders,
      moduleId,
      options.defaultLLM ? { defaultLLM: options.defaultLLM } : {}
    );
    const exports = createModuleExports();

    return {
      module: NestjsLanggraphModule,
      imports: [
        ...(options.imports || []),
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          maxListeners: 100,
          verboseMemoryLeak: true,
        }),
        DiscoveryModule,
      ],
      providers,
      exports,
    };
  }

  static forFeature(workflows: Array<Type<unknown>>): DynamicModule {
    const providers = workflows.map((workflow) => ({
      provide: workflow,
      useClass: workflow,
    }));

    return {
      module: NestjsLanggraphModule,
      providers,
      exports: providers,
    };
  }


  private static createAsyncProviders(
    options: LangGraphModuleAsyncOptions
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: LANGGRAPH_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    const useClass = options.useClass || options.useExisting;
    if (!useClass) {
      throw new Error('Invalid LangGraphModuleAsyncOptions');
    }

    const providers: Provider[] = [
      {
        provide: LANGGRAPH_MODULE_OPTIONS,
        useFactory: async (optionsFactory: LangGraphOptionsFactory) =>
          await optionsFactory.createLangGraphOptions(),
        inject: [useClass],
      },
    ];

    if (options.useClass) {
      providers.push({
        provide: useClass,
        useClass,
      });
    }

    return providers;
  }
}
