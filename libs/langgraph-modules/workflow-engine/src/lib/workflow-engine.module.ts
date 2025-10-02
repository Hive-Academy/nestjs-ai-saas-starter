import { Module, DynamicModule, InjectionToken } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { WorkflowGraphBuilderService } from './core/workflow-graph-builder.service';
import { CompilationCacheService } from './core/compilation-cache.service';
import { MetadataProcessorService } from './core/metadata-processor.service';
import { SubgraphManagerService } from './core/subgraph-manager.service';
import { WorkflowStreamService } from './streaming/workflow-stream.service';
import { WorkflowStreamOrchestratorService } from './streaming/workflow-stream-orchestrator.service';
import { StreamManagementService } from './streaming/stream-management.service';
import { TokenProcessingService } from './streaming/token-processing.service';
import { StreamEventProcessorService } from './streaming/stream-event-processor.service';
import { WorkflowCheckpointService } from './core/workflow-checkpoint.service';
import { WorkflowExecutionService } from './core/workflow-execution.service';
import { DecoratorTranslationService } from './services/decorator-translation.service';
import { EnhancedDecoratorOrchestratorService } from './services/enhanced-decorator-orchestrator.service';
import { EnhancedExecutionContextService } from './services/enhanced-execution-context.service';
import { MultiAgentTranslationService } from './services/multi-agent-translation.service';
import { GraphPatternsService } from './core/graph-patterns.service';
import { GraphOptimizationService } from './core/graph-optimization.service';
import { AgentWorkflowBridgeService } from './services/agent-workflow-bridge.service';
import { CentralRegistryService } from './services/central-registry.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';
import {
  IStreamingService,
  ICheckpointAdapter,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';
import type {
  AgentProvider,
  ToolProvider,
  WorkflowProvider,
} from '@hive-academy/langgraph-multi-agent';
// Removed WorkflowClass import - not available after cleanup

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

  // CENTRALIZED REGISTRATION: Only WorkflowEngineModule accepts these
  agents?: AgentProvider[];
  tools?: ToolProvider[];
  workflows?: WorkflowProvider[];

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
        WorkflowStreamOrchestratorService,
        // Backward compatibility alias
        {
          provide: WorkflowStreamService,
          useExisting: WorkflowStreamOrchestratorService,
        },

        WorkflowCheckpointService,
        WorkflowExecutionService,

        // Split decorator translation services
        // EnhancedMetadataProcessorService removed
        EnhancedExecutionContextService,
        // EnhancedNodeProcessorService removed
        EnhancedDecoratorOrchestratorService,
        // Backward compatibility removed

        // New services for decorator support and optimization
        DecoratorTranslationService,
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        AgentWorkflowBridgeService,
        // CENTRALIZED REGISTRATION: Provider arrays for central registry
        {
          provide: 'WORKFLOW_ENGINE_AGENTS',
          useFactory: (options: WorkflowEngineModuleOptions) =>
            options.agents || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        {
          provide: 'WORKFLOW_ENGINE_TOOLS',
          useFactory: (options: WorkflowEngineModuleOptions) =>
            options.tools || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        {
          provide: 'WORKFLOW_ENGINE_WORKFLOWS',
          useFactory: (options: WorkflowEngineModuleOptions) =>
            options.workflows || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        // Central registry service for all registration
        CentralRegistryService,
        {
          provide: 'DecoratorTranslationService',
          useClass: DecoratorTranslationService,
        },
        {
          provide: 'EnhancedDecoratorTranslationService',
          useClass: EnhancedDecoratorOrchestratorService,
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
        WorkflowStreamOrchestratorService,
        // Streaming services
        StreamManagementService,
        TokenProcessingService,
        StreamEventProcessorService,
        WorkflowCheckpointService,
        WorkflowExecutionService,
        DecoratorTranslationService,
        EnhancedDecoratorOrchestratorService,
        // Enhanced decorator services
        // EnhancedMetadataProcessorService removed
        EnhancedExecutionContextService,
        // EnhancedNodeProcessorService removed
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        AgentWorkflowBridgeService,
        CentralRegistryService,
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
        WorkflowStreamOrchestratorService,
        // Backward compatibility alias
        {
          provide: WorkflowStreamService,
          useExisting: WorkflowStreamOrchestratorService,
        },

        WorkflowCheckpointService,
        WorkflowExecutionService,

        // Split decorator translation services
        // EnhancedMetadataProcessorService removed
        EnhancedExecutionContextService,
        // EnhancedNodeProcessorService removed
        EnhancedDecoratorOrchestratorService,
        // Backward compatibility removed

        // New services for decorator support and optimization
        DecoratorTranslationService,
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        AgentWorkflowBridgeService,
        // CENTRALIZED REGISTRATION: Provider arrays for central registry
        {
          provide: 'WORKFLOW_ENGINE_AGENTS',
          useFactory: (options: WorkflowEngineModuleOptions) =>
            options.agents || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        {
          provide: 'WORKFLOW_ENGINE_TOOLS',
          useFactory: (options: WorkflowEngineModuleOptions) =>
            options.tools || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        {
          provide: 'WORKFLOW_ENGINE_WORKFLOWS',
          useFactory: (options: WorkflowEngineModuleOptions) =>
            options.workflows || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        // Central registry service for all registration
        CentralRegistryService,
        {
          provide: 'DecoratorTranslationService',
          useClass: DecoratorTranslationService,
        },
        {
          provide: 'EnhancedDecoratorTranslationService',
          useClass: EnhancedDecoratorOrchestratorService,
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
        WorkflowStreamOrchestratorService,
        // Streaming services
        StreamManagementService,
        TokenProcessingService,
        StreamEventProcessorService,
        WorkflowCheckpointService,
        WorkflowExecutionService,
        DecoratorTranslationService,
        EnhancedDecoratorOrchestratorService,
        // Enhanced decorator services
        // EnhancedMetadataProcessorService removed
        EnhancedExecutionContextService,
        // EnhancedNodeProcessorService removed
        MultiAgentTranslationService,
        GraphPatternsService,
        GraphOptimizationService,
        AgentWorkflowBridgeService,
        CentralRegistryService,
      ],
      global: true,
    };
  }
}
