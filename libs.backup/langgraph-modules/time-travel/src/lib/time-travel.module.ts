import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TimeTravelService } from './services/time-travel.service';
import { BranchManagerService } from './services/branch-manager.service';
import { TimeTravelConfig } from './interfaces/time-travel.interface';
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
      TimeTravelService,
    ];

    // Add optional services based on configuration
    if (config?.enableBranching) {
      providers.push(BranchManagerService);
    }

    return {
      module: TimeTravelModule,
      imports: [ConfigModule],
      providers,
      exports: [TimeTravelService, BranchManagerService],
    };
  }

  /**
   * Configure time travel module asynchronously
   */
  static forRootAsync(options: {
    imports?: Array<Type | DynamicModule>;
    useFactory: (
      ...args: unknown[]
    ) => Promise<TimeTravelConfig> | TimeTravelConfig;
    inject?: Array<Type | string | symbol>;
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'TIME_TRAVEL_CONFIG',
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: TimeTravelService,
        useFactory: (
          configService: ConfigService,
          timeTravelConfig: TimeTravelConfig
        ) => {
          // Merge config service values with provided config
          const mergedConfig = {
            ...configService.get<TimeTravelConfig>('timeTravel', {}),
            ...timeTravelConfig,
          };

          // Store merged config back in ConfigService
          configService.set('timeTravel', mergedConfig);

          // Create service with dependencies
          const checkpointManager = configService.get('checkpointManager');
          return new TimeTravelService(configService, checkpointManager);
        },
        inject: [ConfigService, 'TIME_TRAVEL_CONFIG'],
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
      exports: [TimeTravelService, BranchManagerService],
    };
  }
}
