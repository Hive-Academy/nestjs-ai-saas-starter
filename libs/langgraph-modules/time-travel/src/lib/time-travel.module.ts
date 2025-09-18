import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TimeTravelService } from './services/time-travel.service';
import { BranchManagerService } from './services/branch-manager.service';
import { WorkflowReplayService } from './services/workflow-replay.service';
import { ExecutionHistoryService } from './services/execution-history.service';
import { WorkflowRegistryService } from './services/workflow-registry.service';
import {
  TimeTravelConfig,
  TimeTravelModuleAsyncOptions,
} from './interfaces/time-travel.interface';
/**
 * Time travel module for workflow replay and debugging capabilities
 * Now provides focused services with proper separation of concerns
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
          maxBranchesPerThread: 10,
        },
      },
      {
        provide: 'WORKFLOW_REGISTRY',
        useValue: new Map<string, unknown>(),
      },
      // Provide checkpoint adapter from config to services (consistent with other modules)
      {
        provide: 'ICheckpointAdapter',
        useFactory: (config: TimeTravelConfig) => {
          if (!config.checkpointAdapter) {
            throw new Error(
              'TimeTravelModule: checkpointAdapter is required but not provided in configuration'
            );
          }
          return config.checkpointAdapter;
        },
        inject: ['TIME_TRAVEL_CONFIG'],
      },
      // Core focused services
      WorkflowRegistryService,
      ExecutionHistoryService,
      BranchManagerService,
      WorkflowReplayService,
      // Facade service that coordinates the others
      TimeTravelService,
    ];

    return {
      module: TimeTravelModule,
      imports: [ConfigModule],
      providers,
      exports: [
        TimeTravelService,
        BranchManagerService,
        WorkflowReplayService,
        ExecutionHistoryService,
        WorkflowRegistryService,
      ],
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
      {
        provide: 'WORKFLOW_REGISTRY',
        useValue: new Map<string, unknown>(),
      },
      // Provide checkpoint adapter from config to services (consistent with other modules)
      {
        provide: 'ICheckpointAdapter',
        useFactory: async (config: TimeTravelConfig) => {
          if (!config.checkpointAdapter) {
            throw new Error(
              'TimeTravelModule: checkpointAdapter is required but not provided in configuration'
            );
          }
          return config.checkpointAdapter;
        },
        inject: ['TIME_TRAVEL_CONFIG'],
      },
      // Core focused services - all required for facade to work
      WorkflowRegistryService,
      ExecutionHistoryService,
      BranchManagerService,
      WorkflowReplayService,
      // Facade service that coordinates the others
      TimeTravelService,
    ];

    return {
      module: TimeTravelModule,
      imports: [ConfigModule, ...(options.imports ?? [])],
      providers,
      exports: [
        TimeTravelService,
        BranchManagerService,
        WorkflowReplayService,
        ExecutionHistoryService,
        WorkflowRegistryService,
      ],
    };
  }
}
