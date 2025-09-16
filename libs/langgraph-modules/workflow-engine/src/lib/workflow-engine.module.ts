import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkflowGraphBuilderService } from './core/workflow-graph-builder.service';
import { CompilationCacheService } from './core/compilation-cache.service';
import { MetadataProcessorService } from './core/metadata-processor.service';
import { SubgraphManagerService } from './core/subgraph-manager.service';
import { WorkflowStreamService } from './streaming/workflow-stream.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';
import {
  IStreamingService,
  NoOpStreamingService,
} from '@hive-academy/langgraph-core';

export interface WorkflowEngineModuleOptions {
  compilation?: {
    cacheEnabled?: boolean;
    cacheTTL?: number;
    optimizeGraphs?: boolean;
  };
  execution?: {
    defaultTimeout?: number;
    streamingEnabled?: boolean;
    parallelExecution?: boolean;
    maxConcurrency?: number;
  };
  debugging?: {
    enabled?: boolean;
    logLevel?: string;
    traceExecution?: boolean;
  };

  // Optional streaming adapter - this is the key part!
  streamingAdapter?: IStreamingService;
}

@Module({})
export class WorkflowEngineModule {
  /**
   * Configure the workflow engine module with options
   */
  public static forRoot(
    options: WorkflowEngineModuleOptions = {}
  ): DynamicModule {
    // Store config for decorator access
    setWorkflowEngineConfig(options);

    return {
      module: WorkflowEngineModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'WORKFLOW_ENGINE_MODULE_OPTIONS',
          useValue: options,
        },
        // Core services
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        WorkflowStreamService,

        // Streaming adapter - use provided adapter or default to no-op
        {
          provide: 'IStreamingService',
          useValue: options.streamingAdapter || new NoOpStreamingService(),
        },
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        WorkflowStreamService,
        'IStreamingService', // Export string token for adapter
      ],
      global: true,
    };
  }

  /**
   * Configure the workflow engine module asynchronously with streaming injection
   */
  public static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) => Promise<WorkflowEngineModuleOptions> | WorkflowEngineModuleOptions;
    inject?: InjectionToken[];
  }): DynamicModule {
    return {
      module: WorkflowEngineModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'WORKFLOW_ENGINE_MODULE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        // Core services
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        WorkflowStreamService,

        // Streaming adapter - injected via factory
        {
          provide: 'IStreamingService',
          useFactory: async (...args: unknown[]) => {
            const moduleOptions = await options.useFactory(...args);
            return moduleOptions.streamingAdapter || new NoOpStreamingService();
          },
          inject: options.inject ?? [],
        },
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        WorkflowStreamService,
        'IStreamingService', // Export string token for adapter
      ],
      global: true,
    };
  }
}
