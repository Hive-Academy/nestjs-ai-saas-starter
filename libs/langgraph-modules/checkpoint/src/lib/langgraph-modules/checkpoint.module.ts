import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CheckpointManagerService } from '../core/checkpoint-manager.service';
import { StateTransformerService } from '../core/state-transformer.service';
import { CheckpointConfig } from '../interfaces/checkpoint.interface';

export interface CheckpointModuleOptions {
  /**
   * Checkpoint configuration
   */
  checkpoint?: {
    /**
     * Array of checkpoint saver configurations
     */
    savers?: CheckpointConfig[];

    /**
     * Cleanup interval in milliseconds
     */
    cleanupInterval?: number;

    /**
     * Maximum age of checkpoints to keep (in milliseconds)
     */
    maxAge?: number;

    /**
     * Maximum number of checkpoints per thread
     */
    maxPerThread?: number;
  };
}

@Module({})
export class LanggraphModulesCheckpointModule {
  /**
   * Configure the checkpoint module with options
   */
  static forRoot(options: CheckpointModuleOptions = {}): DynamicModule {
    return {
      module: LanggraphModulesCheckpointModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'CHECKPOINT_MODULE_OPTIONS',
          useValue: options,
        },
        CheckpointManagerService,
        StateTransformerService,
      ],
      exports: [CheckpointManagerService, StateTransformerService],
      global: true,
    };
  }

  /**
   * Configure the checkpoint module asynchronously
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) => Promise<CheckpointModuleOptions> | CheckpointModuleOptions;
    inject?: unknown[];
  }): DynamicModule {
    return {
      module: LanggraphModulesCheckpointModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'CHECKPOINT_MODULE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        CheckpointManagerService,
        StateTransformerService,
      ],
      exports: [CheckpointManagerService, StateTransformerService],
      global: true,
    };
  }
}
