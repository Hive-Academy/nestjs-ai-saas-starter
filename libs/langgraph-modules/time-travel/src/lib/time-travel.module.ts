import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TimeTravelService } from './services/time-travel.service';
import { BranchManagerService } from './services/branch-manager.service';
import {
  TimeTravelConfig,
  TimeTravelModuleAsyncOptions,
} from './interfaces/time-travel.interface';
import {
  CHECKPOINT_ADAPTER_TOKEN,
  NoOpCheckpointAdapter,
  ICheckpointAdapter,
} from '@hive-academy/langgraph-core';
/**
 * Time travel module for workflow replay and debugging capabilities
 */
@Module({})
export class TimeTravelModule {
  /**
   * Configure time travel module with options
   */
  static forRoot(config?: TimeTravelConfig): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'TIME_TRAVEL_CONFIG',
        useValue: config ?? {
          enableBranching: true,
          enableAutoCheckpoint: false,
          maxCheckpointsPerThread: 100,
          maxBranchesPerThread: 10,
        },
      },
      // Checkpoint adapter provider - either provided or no-op
      {
        provide: CHECKPOINT_ADAPTER_TOKEN,
        useValue: config?.checkpointAdapter || new NoOpCheckpointAdapter(),
      },
      TimeTravelService,
    ];

    // Add optional services based on configuration
    if (config?.enableBranching) {
      providers.push(BranchManagerService);
    }

    const exports: Array<Type | Provider> = [TimeTravelService];

    // Only export BranchManagerService if it's included in providers
    if (config?.enableBranching) {
      exports.push(BranchManagerService);
    }

    return {
      module: TimeTravelModule,
      imports: [ConfigModule],
      providers,
      exports,
    };
  }

  /**
   * Configure time travel module asynchronously
   */
  static forRootAsync(options: TimeTravelModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'TIME_TRAVEL_CONFIG',
        useFactory: options.useFactory!,
        inject: options.inject ?? [],
      },
      // Checkpoint adapter provider - async factory
      {
        provide: CHECKPOINT_ADAPTER_TOKEN,
        useFactory: async (...args: unknown[]) => {
          const timeTravelConfig = await options.useFactory!(...args);
          return (
            timeTravelConfig?.checkpointAdapter || new NoOpCheckpointAdapter()
          );
        },
        inject: options.inject || [],
      },
      {
        provide: TimeTravelService,
        useFactory: (
          configService: ConfigService,
          timeTravelConfig: TimeTravelConfig,
          checkpointAdapter: ICheckpointAdapter
        ) => {
          // Merge config service values with provided config
          const mergedConfig = {
            ...configService.get<TimeTravelConfig>('timeTravel', {}),
            ...timeTravelConfig,
          };

          // Store merged config back in ConfigService
          configService.set('timeTravel', mergedConfig);

          return new TimeTravelService(configService, checkpointAdapter);
        },
        inject: [ConfigService, 'TIME_TRAVEL_CONFIG', CHECKPOINT_ADAPTER_TOKEN],
      },
      {
        provide: BranchManagerService,
        useFactory: (timeTravelService: TimeTravelService) => {
          return new BranchManagerService(timeTravelService);
        },
        inject: [TimeTravelService],
      },
    ];

    return {
      module: TimeTravelModule,
      imports: [ConfigModule, ...(options.imports ?? [])],
      providers,
      exports: providers, // Export all providers that were created
    };
  }
}
