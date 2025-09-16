import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkflowGraphBuilderService } from './core/workflow-graph-builder.service';
import { CompilationCacheService } from './core/compilation-cache.service';
import { MetadataProcessorService } from './core/metadata-processor.service';
import { SubgraphManagerService } from './core/subgraph-manager.service';
import { WorkflowStreamService } from './streaming/workflow-stream.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';
import { IStreamingService } from '@hive-academy/langgraph-core';

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

        // Note: IStreamingService should be provided by the app module via adapter pattern
        // No local provider needed as it will be injected globally
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        WorkflowStreamService,
      ],
      global: true,
    };
  }

  /**
   * Configure the workflow engine module asynchronously with streaming injection
   */
  public static forRootAsync(options: {
    useFactory: (
      ...args: any[]
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

        // Note: IStreamingService should be provided by the app module via adapter pattern
        // No local provider needed as it will be injected globally
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        WorkflowStreamService,
      ],
      global: true,
    };
  }
}
