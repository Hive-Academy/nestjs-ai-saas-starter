import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CheckpointManagerService } from '../core/checkpoint-manager.service';
import { StateTransformerService } from '../core/state-transformer.service';
import { CheckpointSaverFactory } from '../core/checkpoint-saver.factory';
import { CheckpointRegistryService } from '../core/checkpoint-registry.service';
import { CheckpointPersistenceService } from '../core/checkpoint-persistence.service';
import { CheckpointMetricsService } from '../core/checkpoint-metrics.service';
import { CheckpointCleanupService } from '../core/checkpoint-cleanup.service';
import { CheckpointHealthService } from '../core/checkpoint-health.service';
import { LangGraphCheckpointProvider } from '../providers/langgraph-checkpoint.provider';
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

    /**
     * Health monitoring configuration
     */
    health?: {
      /**
       * Health check interval in milliseconds
       */
      checkInterval?: number;

      /**
       * Response time threshold for degraded status (ms)
       */
      degradedThreshold?: number;

      /**
       * Response time threshold for unhealthy status (ms)
       */
      unhealthyThreshold?: number;
    };
  };
}

@Module({})
export class LanggraphModulesCheckpointModule {
  /**
   * Configure the checkpoint module with options
   */
  public static forRoot(options: CheckpointModuleOptions = {}): DynamicModule {
    return {
      module: LanggraphModulesCheckpointModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'CHECKPOINT_MODULE_OPTIONS',
          useValue: options,
        },
        // Core services following SOLID principles
        CheckpointSaverFactory,
        CheckpointRegistryService,
        CheckpointMetricsService,
        CheckpointCleanupService,
        CheckpointHealthService,
        CheckpointPersistenceService,

        // Official LangGraph checkpoint provider
        LangGraphCheckpointProvider,

        // Interface tokens for dependency injection
        {
          provide: 'ICheckpointSaverFactory',
          useExisting: CheckpointSaverFactory,
        },
        {
          provide: 'ICheckpointRegistryService',
          useExisting: CheckpointRegistryService,
        },
        {
          provide: 'ICheckpointPersistenceService',
          useExisting: CheckpointPersistenceService,
        },
        {
          provide: 'ICheckpointMetricsService',
          useExisting: CheckpointMetricsService,
        },
        {
          provide: 'ICheckpointCleanupService',
          useExisting: CheckpointCleanupService,
        },
        {
          provide: 'ICheckpointHealthService',
          useExisting: CheckpointHealthService,
        },
        {
          provide: 'ILangGraphCheckpointProvider',
          useExisting: LangGraphCheckpointProvider,
        },

        // Facade service
        CheckpointManagerService,

        // Legacy service
        StateTransformerService,
      ],
      exports: [
        CheckpointManagerService,
        StateTransformerService,
        // Export focused services for advanced usage
        CheckpointSaverFactory,
        CheckpointRegistryService,
        CheckpointPersistenceService,
        CheckpointMetricsService,
        CheckpointCleanupService,
        CheckpointHealthService,
        // Export official LangGraph provider
        LangGraphCheckpointProvider,
        // Export interface tokens
        'ICheckpointSaverFactory',
        'ICheckpointRegistryService',
        'ICheckpointPersistenceService',
        'ICheckpointMetricsService',
        'ICheckpointCleanupService',
        'ICheckpointHealthService',
        'ILangGraphCheckpointProvider',
      ],
      global: true,
    };
  }

  /**
   * Configure the checkpoint module asynchronously
   */
  public static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) => Promise<CheckpointModuleOptions> | CheckpointModuleOptions;
    inject?: InjectionToken[];
  }): DynamicModule {
    return {
      module: LanggraphModulesCheckpointModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'CHECKPOINT_MODULE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        // Core services following SOLID principles
        CheckpointSaverFactory,
        CheckpointRegistryService,
        CheckpointMetricsService,
        CheckpointCleanupService,
        CheckpointHealthService,
        CheckpointPersistenceService,

        // Official LangGraph checkpoint provider
        LangGraphCheckpointProvider,

        // Interface tokens for dependency injection
        {
          provide: 'ICheckpointSaverFactory',
          useExisting: CheckpointSaverFactory,
        },
        {
          provide: 'ICheckpointRegistryService',
          useExisting: CheckpointRegistryService,
        },
        {
          provide: 'ICheckpointPersistenceService',
          useExisting: CheckpointPersistenceService,
        },
        {
          provide: 'ICheckpointMetricsService',
          useExisting: CheckpointMetricsService,
        },
        {
          provide: 'ICheckpointCleanupService',
          useExisting: CheckpointCleanupService,
        },
        {
          provide: 'ICheckpointHealthService',
          useExisting: CheckpointHealthService,
        },
        {
          provide: 'ILangGraphCheckpointProvider',
          useExisting: LangGraphCheckpointProvider,
        },

        // Facade service
        CheckpointManagerService,

        // Legacy service
        StateTransformerService,
      ],
      exports: [
        CheckpointManagerService,
        StateTransformerService,
        // Export focused services for advanced usage
        CheckpointSaverFactory,
        CheckpointRegistryService,
        CheckpointPersistenceService,
        CheckpointMetricsService,
        CheckpointCleanupService,
        CheckpointHealthService,
        // Export official LangGraph provider
        LangGraphCheckpointProvider,
        // Export interface tokens
        'ICheckpointSaverFactory',
        'ICheckpointRegistryService',
        'ICheckpointPersistenceService',
        'ICheckpointMetricsService',
        'ICheckpointCleanupService',
        'ICheckpointHealthService',
        'ILangGraphCheckpointProvider',
      ],
      global: true,
    };
  }
}
