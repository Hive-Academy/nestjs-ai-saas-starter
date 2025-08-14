import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdvancedMemoryService } from './lib/services/advanced-memory.service';
import { MemoryConfig } from './lib/interfaces/memory.interface';

/**
 * Memory module for advanced memory management with semantic search and summarization
 */
@Module({})
export class LanggraphModulesMemoryModule {
  /**
   * Configure memory module with options
   */
  static forRoot(config?: MemoryConfig): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'MEMORY_CONFIG',
        useValue: config ?? {
          storage: { type: 'memory' },
          enableSemanticSearch: false,
          enableAutoSummarization: false,
        },
      },
      AdvancedMemoryService,
    ];

    return {
      module: LanggraphModulesMemoryModule,
      imports: [ConfigModule],
      providers,
      exports: [AdvancedMemoryService],
    };
  }

  /**
   * Configure memory module asynchronously
   */
  static forRootAsync(options: {
    imports?: Array<Type | DynamicModule>;
    useFactory: (...args: unknown[]) => Promise<MemoryConfig> | MemoryConfig;
    inject?: Array<Type | string | symbol>;
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'MEMORY_CONFIG',
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: AdvancedMemoryService,
        useFactory: (configService: ConfigService, memoryConfig: MemoryConfig) => {
          // Merge config service values with provided config
          const mergedConfig = {
            ...configService.get<MemoryConfig>('memory', {
              storage: { type: 'memory' },
              enableSemanticSearch: false,
              enableAutoSummarization: false,
            }),
            ...memoryConfig,
          };

          // Store merged config back in ConfigService
          configService.set('memory', mergedConfig);

          return new AdvancedMemoryService(configService);
        },
        inject: [ConfigService, 'MEMORY_CONFIG'],
      },
    ];

    return {
      module: LanggraphModulesMemoryModule,
      imports: [ConfigModule, ...(options.imports ?? [])],
      providers,
      exports: [AdvancedMemoryService],
    };
  }
}
