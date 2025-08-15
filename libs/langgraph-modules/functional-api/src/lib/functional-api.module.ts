import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { LanggraphModulesCheckpointModule } from '@langgraph-modules/checkpoint';
import {
  FunctionalApiModuleOptions,
  FunctionalApiModuleAsyncOptions,
  FunctionalApiOptionsFactory,
} from './interfaces/module-options.interface';
import { FunctionalWorkflowService } from './services/functional-workflow.service';
import { WorkflowDiscoveryService } from './services/workflow-discovery.service';
import { GraphGeneratorService } from './services/graph-generator.service';
import { WorkflowValidator } from './validation/workflow-validator';

/**
 * Module options injection token
 */
export const FUNCTIONAL_API_MODULE_OPTIONS = 'FUNCTIONAL_API_MODULE_OPTIONS';

/**
 * Functional API module for NestJS LangGraph integration
 */
@Global()
@Module({})
export class FunctionalApiModule {
  /**
   * Configures the module synchronously
   */
  static forRoot(options: FunctionalApiModuleOptions = {}): DynamicModule {
    const optionsProvider: Provider = {
      provide: FUNCTIONAL_API_MODULE_OPTIONS,
      useValue: this.normalizeOptions(options),
    };

    return {
      module: FunctionalApiModule,
      imports: [
        DiscoveryModule,
        LanggraphModulesCheckpointModule.forRoot({
          checkpoint: {
            savers: [
              {
                name: 'memory',
                type: 'memory',
                default: true,
              },
            ],
          },
        }),
      ],
      providers: [
        optionsProvider,
        WorkflowValidator,
        WorkflowDiscoveryService,
        GraphGeneratorService,
        FunctionalWorkflowService,
      ],
      exports: [
        FunctionalWorkflowService,
        WorkflowDiscoveryService,
        GraphGeneratorService,
        WorkflowValidator,
        FUNCTIONAL_API_MODULE_OPTIONS,
      ],
    };
  }

  /**
   * Configures the module asynchronously
   */
  static forRootAsync(options: FunctionalApiModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: FunctionalApiModule,
      imports: [
        DiscoveryModule,
        LanggraphModulesCheckpointModule.forRoot({
          checkpoint: {
            savers: [
              {
                name: 'memory',
                type: 'memory',
                default: true,
              },
            ],
          },
        }),
        ...(options.imports || []),
      ],
      providers: [
        ...asyncProviders,
        WorkflowValidator,
        WorkflowDiscoveryService,
        GraphGeneratorService,
        FunctionalWorkflowService,
      ],
      exports: [
        FunctionalWorkflowService,
        WorkflowDiscoveryService,
        GraphGeneratorService,
        WorkflowValidator,
        FUNCTIONAL_API_MODULE_OPTIONS,
      ],
    };
  }

  /**
   * Creates async providers for module configuration
   */
  private static createAsyncProviders(options: FunctionalApiModuleAsyncOptions): Provider[] {
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

    throw new Error('Invalid async module configuration');
  }

  /**
   * Creates async options provider
   */
  private static createAsyncOptionsProvider(options: FunctionalApiModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: FUNCTIONAL_API_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) => {
          const opts = await options.useFactory!(...args);
          return this.normalizeOptions(opts);
        },
        inject: options.inject || [],
      };
    }

    if (options.useExisting) {
      return {
        provide: FUNCTIONAL_API_MODULE_OPTIONS,
        useFactory: async (optionsFactory: FunctionalApiOptionsFactory) => {
          const opts = await optionsFactory.createFunctionalApiOptions();
          return this.normalizeOptions(opts);
        },
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: FUNCTIONAL_API_MODULE_OPTIONS,
        useFactory: async (optionsFactory: FunctionalApiOptionsFactory) => {
          const opts = await optionsFactory.createFunctionalApiOptions();
          return this.normalizeOptions(opts);
        },
        inject: [options.useClass],
      };
    }

    throw new Error('Invalid async options configuration');
  }

  /**
   * Normalizes and validates module options
   */
  private static normalizeOptions(options: FunctionalApiModuleOptions): Required<FunctionalApiModuleOptions> {
    return {
      defaultTimeout: options.defaultTimeout ?? 30000,
      defaultRetryCount: options.defaultRetryCount ?? 3,
      enableCheckpointing: options.enableCheckpointing ?? true,
      checkpointInterval: options.checkpointInterval ?? 5000,
      enableStreaming: options.enableStreaming ?? false,
      maxConcurrentTasks: options.maxConcurrentTasks ?? 10,
      enableCycleDetection: options.enableCycleDetection ?? true,
      globalMetadata: options.globalMetadata ?? {},
    };
  }
}
