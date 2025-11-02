import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { WorkflowGraphBuilderService } from './core/workflow-graph-builder.service';
import { CompilationCacheService } from './core/compilation-cache.service';
import { MetadataProcessorService } from './core/metadata-processor.service';
import { SubgraphManagerService } from './core/subgraph-manager.service';
import { WorkflowStreamService } from './streaming/workflow-stream.service';
import { StreamManagementService } from './streaming/stream-management.service';
import { TokenProcessingService } from './streaming/token-processing.service';
import { StreamEventProcessorService } from './streaming/stream-event-processor.service';
import { WorkflowCheckpointService } from './core/workflow-checkpoint.service';
import { WorkflowExecutionService } from './core/workflow-execution.service';
import { DecoratorTranslationService } from './services/decorator-translation.service';
import { MultiAgentTranslationService } from './services/multi-agent-translation.service';
import { GraphPatternsService } from './core/graph-patterns.service';
import { GraphOptimizationService } from './core/graph-optimization.service';
import { CommandProcessorService } from './routing/command-processor.service';
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
      imports: [ConfigModule, StreamingModule],
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

        // Split streaming services
        StreamManagementService,
        TokenProcessingService,
        StreamEventProcessorService,
        WorkflowStreamService,

        WorkflowCheckpointService,
        WorkflowExecutionService,

        // Decorator translation services
        DecoratorTranslationService,
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        // Command processing service
        CommandProcessorService,
        {
          provide: 'DecoratorTranslationService',
          useClass: DecoratorTranslationService,
        },
        {
          provide: 'MultiAgentTranslationService',
          useClass: MultiAgentTranslationService,
        },
        // Don't re-provide ICheckpointAdapter - it's injected from CheckpointModule
        // Services will inject it directly via @Inject('ICheckpointAdapter')

        // Note: IStreamingService is provided by StreamingModule via adapter pattern
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        // Streaming services
        WorkflowStreamService,
        StreamManagementService,
        TokenProcessingService,
        StreamEventProcessorService,
        WorkflowCheckpointService,
        WorkflowExecutionService,
        DecoratorTranslationService,
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        // Command processing service
        CommandProcessorService,
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
      imports: [
        ConfigModule,
        StreamingModule.forRoot({
          websocket: { enabled: false }, // Default disabled, can be overridden by app module
          defaultBufferSize: 50,
        }),
      ],
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

        // Split streaming services
        StreamManagementService,
        TokenProcessingService,
        StreamEventProcessorService,
        WorkflowStreamService,

        WorkflowCheckpointService,
        WorkflowExecutionService,

        // Decorator translation services
        DecoratorTranslationService,
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        // Command processing service
        CommandProcessorService,
        {
          provide: 'DecoratorTranslationService',
          useClass: DecoratorTranslationService,
        },
        {
          provide: 'MultiAgentTranslationService',
          useClass: MultiAgentTranslationService,
        },
        // Don't re-provide ICheckpointAdapter - it's injected from CheckpointModule
        // Services will inject it directly via @Inject('ICheckpointAdapter')

        // Note: IStreamingService is provided by StreamingModule via adapter pattern
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        // Streaming services
        WorkflowStreamService,
        StreamManagementService,
        TokenProcessingService,
        StreamEventProcessorService,
        WorkflowCheckpointService,
        WorkflowExecutionService,
        DecoratorTranslationService,
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        // Command processing service
        CommandProcessorService,
      ],
      global: true,
    };
  }
}
