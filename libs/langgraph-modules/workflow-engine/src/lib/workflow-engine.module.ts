import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetadataProcessorService } from './core/metadata-processor.service';
import { WorkflowExecutionService } from './execution/workflow-execution.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';
import {
  IStreamingService,
  ICheckpointAdapter,
  IMemoryAdapter,
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

  // Optional adapters for external services
  streamingAdapter?: IStreamingService;
  checkpointAdapter?: ICheckpointAdapter;
  memoryAdapter?: IMemoryAdapter;
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
        MetadataProcessorService,

        // Execution services
        WorkflowExecutionService,
      ],
      exports: [MetadataProcessorService, WorkflowExecutionService],
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
        MetadataProcessorService,

        // Execution services
        WorkflowExecutionService,
      ],
      exports: [MetadataProcessorService, WorkflowExecutionService],
      global: true,
    };
  }
}
