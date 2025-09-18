import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CheckpointManagerService } from '../core/checkpoint-manager.service';
import { StateTransformerService } from '../core/state-transformer.service';
import { CheckpointSaverRegistry } from '../core/checkpoint-saver.registry';
import { CheckpointRegistryService } from '../core/checkpoint-registry.service';
import { CheckpointPersistenceService } from '../core/checkpoint-persistence.service';
import { CheckpointMetricsService } from '../core/checkpoint-metrics.service';
import { CheckpointCleanupService } from '../core/checkpoint-cleanup.service';
import { CheckpointHealthService } from '../core/checkpoint-health.service';
import { CheckpointModuleConfig } from '../interfaces/checkpoint-saver-registry.interface';
import { CheckpointManagerAdapter } from '../adapters/checkpoint-manager.adapter';

export type CheckpointModuleOptions = CheckpointModuleConfig;

@Module({})
export class LanggraphModulesCheckpointModule {
  /**
   * Get shared providers configuration
   */
  private static getProviders(): any[] {
    return [
      // Core services following SOLID principles
      CheckpointSaverRegistry,
      CheckpointRegistryService,
      CheckpointMetricsService,
      CheckpointCleanupService,
      CheckpointHealthService,
      CheckpointPersistenceService,

      // Interface tokens for dependency injection
      {
        provide: 'ICheckpointSaverRegistry',
        useExisting: CheckpointSaverRegistry,
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

      // Facade service
      CheckpointManagerService,

      // Checkpoint adapter - bridges checkpoint module to core interface
      CheckpointManagerAdapter,
      {
        provide: 'ICheckpointAdapter',
        useExisting: CheckpointManagerAdapter,
      },

      // State transformer service
      StateTransformerService,
    ];
  }

  /**
   * Get shared exports configuration
   */
  private static getExports(): any[] {
    return [
      CheckpointManagerService,
      StateTransformerService,
      // Export focused services for advanced usage
      CheckpointSaverRegistry,
      CheckpointRegistryService,
      CheckpointPersistenceService,
      CheckpointMetricsService,
      CheckpointCleanupService,
      CheckpointHealthService,
      // Export interface tokens
      'ICheckpointSaverRegistry',
      'ICheckpointRegistryService',
      'ICheckpointPersistenceService',
      'ICheckpointMetricsService',
      'ICheckpointCleanupService',
      'ICheckpointHealthService',
      // Export checkpoint adapter
      'ICheckpointAdapter',
    ];
  }

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
        ...this.getProviders(),
        // Initialize checkpoint savers registry with single saver
        {
          provide: 'CHECKPOINT_SAVERS_INIT',
          useFactory: (registry: CheckpointSaverRegistry) => {
            return LanggraphModulesCheckpointModule.initializeCheckpointSaver(
              registry,
              options
            );
          },
          inject: [CheckpointSaverRegistry],
        },
      ],
      exports: this.getExports(),
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
        ...this.getProviders(),
        // Initialize checkpoint savers registry asynchronously
        {
          provide: 'CHECKPOINT_SAVERS_INIT',
          useFactory: async (
            moduleOptions: CheckpointModuleOptions,
            registry: CheckpointSaverRegistry
          ) => {
            return LanggraphModulesCheckpointModule.initializeCheckpointSaver(
              registry,
              moduleOptions
            );
          },
          inject: ['CHECKPOINT_MODULE_OPTIONS', CheckpointSaverRegistry],
        },
      ],
      exports: this.getExports(),
      global: true,
    };
  }

  /**
   * Initialize checkpoint saver with validation and fallback logic
   */
  private static initializeCheckpointSaver(
    registry: CheckpointSaverRegistry,
    options: CheckpointModuleOptions
  ): CheckpointSaverRegistry {
    if (options.saver) {
      // User provided a saver - register it
      const saverType = LanggraphModulesCheckpointModule.detectSaverType(
        options.saver
      );

      registry.registerSaver({
        name: 'primary',
        saver: options.saver,
        default: true,
        metadata: {
          type: saverType,
          description: `${saverType} checkpoint storage`,
          persistent: saverType !== 'memory',
          supportsStreaming: true,
        },
      });

      console.log(
        `✅ Checkpoint saver registered: ${saverType} (provided by user)`
      );
    } else {
      // No saver provided - fallback to in-memory
      import('@langchain/langgraph-checkpoint').then(({ MemorySaver }) => {
        registry.registerSaver({
          name: 'fallback',
          saver: new MemorySaver(),
          default: true,
          metadata: {
            type: 'memory',
            description: 'In-memory checkpoint storage (fallback)',
            persistent: false,
            supportsStreaming: true,
          },
        });

        console.log(
          '⚠️  No checkpoint saver provided - falling back to in-memory storage'
        );
      });
    }

    return registry;
  }

  /**
   * Detect the type of checkpoint saver based on its constructor name
   */
  private static detectSaverType(saver: any): string {
    const constructorName = saver.constructor.name;

    if (constructorName.includes('Memory')) return 'memory';
    if (
      constructorName.includes('Sqlite') ||
      constructorName.includes('SQLite')
    )
      return 'sqlite';
    if (constructorName.includes('Redis')) return 'redis';
    if (constructorName.includes('Postgres')) return 'postgres';

    return 'custom';
  }
}
