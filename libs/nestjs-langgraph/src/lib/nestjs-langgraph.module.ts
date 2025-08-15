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

// Provider factories
import {
  createCoreProviders,
  CORE_EXPORTS,
  createStreamingProviders,
  STREAMING_EXPORTS,
  createToolProviders,
  TOOL_EXPORTS,
  createRoutingProviders,
  ROUTING_EXPORTS,
  createHITLProviders,
  HITL_EXPORTS,
  createLLMProviders,
  LLM_EXPORTS,
  createInfrastructureProviders,
  createInfrastructureProvidersAsync,
  INFRASTRUCTURE_EXPORTS,
} from './providers';

@Global()
@Module({})
export class NestjsLanggraphModule {
  static forRoot(options: LangGraphModuleOptions = {}): DynamicModule {
    const moduleId = randomUUID();

    const optionsProvider: Provider = {
      provide: LANGGRAPH_MODULE_OPTIONS,
      useValue: options,
    };

    const moduleIdProvider: Provider = {
      provide: LANGGRAPH_MODULE_ID,
      useValue: moduleId,
    };

    const providers = [
      optionsProvider,
      moduleIdProvider,
      ...createCoreProviders(),
      ...createStreamingProviders(),
      ...createToolProviders(),
      ...createRoutingProviders(),
      ...createHITLProviders(),
      ...createLLMProviders(options),
      ...createInfrastructureProviders(options),
    ];

    const exports = [
      LANGGRAPH_MODULE_OPTIONS,
      DEFAULT_LLM,
      TOOL_REGISTRY,
      STREAM_MANAGER,
      ...CORE_EXPORTS,
      ...STREAMING_EXPORTS,
      ...TOOL_EXPORTS,
      ...ROUTING_EXPORTS,
      ...HITL_EXPORTS,
      ...LLM_EXPORTS,
      ...INFRASTRUCTURE_EXPORTS,
    ];

    return {
      module: NestjsLanggraphModule,
      imports: [
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

    const moduleIdProvider: Provider = {
      provide: LANGGRAPH_MODULE_ID,
      useValue: moduleId,
    };

    const asyncProviders = this.createAsyncProviders(options);

    const providers = [
      moduleIdProvider,
      ...asyncProviders,
      ...createCoreProviders(),
      ...createStreamingProviders(),
      ...createToolProviders(),
      ...createRoutingProviders(),
      ...createHITLProviders(),
      ...createLLMProviders(
        options.defaultLLM ? { defaultLLM: options.defaultLLM } : {}
      ),
      ...createInfrastructureProvidersAsync(),
    ];

    const exports = [
      LANGGRAPH_MODULE_OPTIONS,
      DEFAULT_LLM,
      TOOL_REGISTRY,
      STREAM_MANAGER,
      ...CORE_EXPORTS,
      ...STREAMING_EXPORTS,
      ...TOOL_EXPORTS,
      ...ROUTING_EXPORTS,
      ...HITL_EXPORTS,
      ...LLM_EXPORTS,
      ...INFRASTRUCTURE_EXPORTS,
    ];

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
