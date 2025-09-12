import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import {
  FunctionalApiModuleOptions,
  FunctionalApiModuleAsyncOptions,
  FunctionalApiOptionsFactory,
} from './interfaces/module-options.interface';
import { FunctionalWorkflowService } from './services/functional-workflow.service';
import { WorkflowRegistrationService } from './services/workflow-registration.service';
import { GraphGeneratorService } from './services/graph-generator.service';
import { WorkflowValidator } from './validation/workflow-validator';
import { FunctionalApiModuleInitializer } from './services/functional-api-module-initializer.service';
import {
  CHECKPOINT_ADAPTER_TOKEN,
  NoOpCheckpointAdapter,
} from '@hive-academy/langgraph-core';
import { FUNCTIONAL_API_MODULE_OPTIONS } from './constants/module.constants';

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
    const normalizedOptions = this.normalizeOptions(options);
    const optionsProvider: Provider = {
      provide: FUNCTIONAL_API_MODULE_OPTIONS,
      useValue: normalizedOptions,
    };

    return {
      module: FunctionalApiModule,
      imports: [],
      providers: [
        optionsProvider,
        // Checkpoint adapter provider - either provided or no-op
        {
          provide: CHECKPOINT_ADAPTER_TOKEN,
          useValue:
            normalizedOptions.checkpointAdapter || new NoOpCheckpointAdapter(),
        },
        WorkflowValidator,
        WorkflowRegistrationService,
        GraphGeneratorService,
        FunctionalWorkflowService,
        FunctionalApiModuleInitializer,
      ],
      exports: [
        FunctionalWorkflowService,
        WorkflowRegistrationService,
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
      imports: [...(options.imports || [])],
      providers: [
        ...asyncProviders,
        // Checkpoint adapter provider - async factory
        {
          provide: CHECKPOINT_ADAPTER_TOKEN,
          useFactory: async (...args: unknown[]) => {
            const opts = await options.useFactory!(...args);
            const normalizedOpts = this.normalizeOptions(opts);
            return (
              normalizedOpts.checkpointAdapter || new NoOpCheckpointAdapter()
            );
          },
          inject: options.inject || [],
        },
        WorkflowValidator,
        WorkflowRegistrationService,
        GraphGeneratorService,
        FunctionalWorkflowService,
        FunctionalApiModuleInitializer,
      ],
      exports: [
        FunctionalWorkflowService,
        WorkflowRegistrationService,
        GraphGeneratorService,
        WorkflowValidator,
        FUNCTIONAL_API_MODULE_OPTIONS,
      ],
    };
  }

  /**
   * Creates async providers for module configuration
   */
  private static createAsyncProviders(
    options: FunctionalApiModuleAsyncOptions
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

    throw new Error('Invalid async module configuration');
  }

  /**
   * Creates async options provider
   */
  private static createAsyncOptionsProvider(
    options: FunctionalApiModuleAsyncOptions
  ): Provider {
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
  private static normalizeOptions(
    options: FunctionalApiModuleOptions
  ): Required<Omit<FunctionalApiModuleOptions, 'checkpointAdapter'>> &
    Pick<FunctionalApiModuleOptions, 'checkpointAdapter'> {
    return {
      workflows: options.workflows ?? [],
      defaultTimeout: options.defaultTimeout ?? 30000,
      defaultRetryCount: options.defaultRetryCount ?? 3,
      enableCheckpointing: options.enableCheckpointing ?? true,
      checkpointInterval: options.checkpointInterval ?? 5000,
      enableStreaming: options.enableStreaming ?? false,
      maxConcurrentTasks: options.maxConcurrentTasks ?? 10,
      enableCycleDetection: options.enableCycleDetection ?? true,
      globalMetadata: options.globalMetadata ?? {},
      checkpointAdapter: options.checkpointAdapter,
    };
  }
}
