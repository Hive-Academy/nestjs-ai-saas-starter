import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { DynamicModule, InjectionToken, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetadataProcessorService } from './core/metadata-processor.service';
import {
  FunctionalNodeGraphStrategy,
  FunctionalTaskGraphStrategy,
} from './execution/strategies';
import { WorkflowExecutionService } from './execution/workflow-execution.service';
import type { LlmModuleOptions } from './interfaces/llm-config.interface';
import { LlmProviderService } from './services/llm/llm-provider.service';
import { SequentialGraphBuilder } from './services/multi-agent/builders/sequential-graph-builder';
import { SupervisorGraphBuilder } from './services/multi-agent/builders/supervisor-graph-builder';
import { MultiAgentGraphBuilderService } from './services/multi-agent/multi-agent-graph-builder.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';

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

  /**
   * LangGraph native checkpoint saver (RedisSaver, SqliteSaver, PostgresSaver, etc.)
   * Replaces ICheckpointAdapter - uses LangGraph's BaseCheckpointSaver directly
   *
   * @example
   * // Production with Redis
   * checkpointer: await RedisSaver.fromUrl('redis://localhost:6379')
   *
   * // Development with SQLite
   * checkpointer: SqliteSaver.fromConnString('./data/checkpoints.db')
   *
   * // Testing with in-memory
   * checkpointer: new MemorySaver()
   */
  checkpointer?: BaseCheckpointSaver;

  /**
   * Tool classes to register with the workflow engine.
   * These tools will be automatically discovered and made available to agents.
   * @example
   * tools: [GithubToolsService, SearchToolsService]
   */
  tools?: any[];

  /**
   * LLM configuration for LlmProviderService
   * Required for agents that use LLM functionality
   */
  llm?: LlmModuleOptions;
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
        {
          provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
          useValue: options.tools || [],
        },
        {
          provide: 'LLM_MODULE_OPTIONS',
          useValue: options.llm || {}, // Provide LLM config or empty object
        },
        // Core services
        MetadataProcessorService,

        // Graph Building Strategies (Strategy Pattern - NEW!)
        FunctionalTaskGraphStrategy,
        FunctionalNodeGraphStrategy,

        // Execution services
        WorkflowExecutionService,

        // Multi-Agent Graph Builders (Strategy Pattern)
        MultiAgentGraphBuilderService,
        SupervisorGraphBuilder,
        SequentialGraphBuilder,

        // Tool registry service
        ToolRegistryService,
        LlmProviderService,
      ],
      exports: [
        MetadataProcessorService,
        WorkflowExecutionService,
        MultiAgentGraphBuilderService,
        ToolRegistryService,
        LlmProviderService,
        // Export strategies for potential external use
        FunctionalTaskGraphStrategy,
        FunctionalNodeGraphStrategy,
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
        {
          provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
          useFactory: (opts: WorkflowEngineModuleOptions) => opts.tools || [],
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        {
          provide: 'LLM_MODULE_OPTIONS',
          useFactory: (opts: WorkflowEngineModuleOptions) => opts.llm || {}, // Extract LLM config from options
          inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
        },
        // Core services
        MetadataProcessorService,

        // Execution services
        WorkflowExecutionService,

        // Multi-Agent Graph Builders (Strategy Pattern)
        MultiAgentGraphBuilderService,
        SupervisorGraphBuilder,
        SequentialGraphBuilder,

        FunctionalTaskGraphStrategy,
        FunctionalNodeGraphStrategy,

        ToolRegistryService,
        LlmProviderService,
      ],
      exports: [
        MetadataProcessorService,
        WorkflowExecutionService,
        MultiAgentGraphBuilderService,
        ToolRegistryService,
        LlmProviderService,
        FunctionalTaskGraphStrategy,
        FunctionalNodeGraphStrategy,
      ],
      global: true,
    };
  }
}
