import { DynamicModule, InjectionToken, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetadataProcessorService } from './core/metadata-processor.service';
import {
  FunctionalNodeGraphStrategy,
  FunctionalTaskGraphStrategy,
} from './execution/strategies';
import { WorkflowExecutionService } from './execution/workflow-execution.service';
import { WorkflowEngineModuleOptions } from './interfaces/functional/module-options.interface';
import { LangGraphCommandService } from './services/langgraph-command.service';
import { LlmProviderService } from './services/llm/llm-provider.service';
import { SequentialGraphBuilder } from './services/multi-agent/builders/sequential-graph-builder';
import { SupervisorGraphBuilder } from './services/multi-agent/builders/supervisor-graph-builder';
import { MultiAgentGraphBuilderService } from './services/multi-agent/multi-agent-graph-builder.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { WorkflowResumptionService } from './services/workflow-resumption.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';
import { WorkflowAuthContextService } from './services/auth-context.service';

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

        // Resumption services (TASK_2025_049)
        LangGraphCommandService,
        WorkflowResumptionService,

        // Multi-Agent Graph Builders (Strategy Pattern)
        MultiAgentGraphBuilderService,
        SupervisorGraphBuilder,
        SequentialGraphBuilder,

        // Tool registry service
        ToolRegistryService,
        LlmProviderService,

        WorkflowAuthContextService,
      ],
      exports: [
        MetadataProcessorService,
        WorkflowExecutionService,
        WorkflowResumptionService, // Export for HITL integration (TASK_2025_049)
        LangGraphCommandService,
        MultiAgentGraphBuilderService,
        ToolRegistryService,
        LlmProviderService,
        WorkflowAuthContextService,
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

        // Resumption services (TASK_2025_049)
        LangGraphCommandService,
        WorkflowResumptionService,

        // Multi-Agent Graph Builders (Strategy Pattern)
        MultiAgentGraphBuilderService,
        SupervisorGraphBuilder,
        SequentialGraphBuilder,

        FunctionalTaskGraphStrategy,
        FunctionalNodeGraphStrategy,

        ToolRegistryService,
        LlmProviderService,
        WorkflowAuthContextService,
      ],
      exports: [
        MetadataProcessorService,
        WorkflowExecutionService,
        WorkflowResumptionService, // Export for HITL integration (TASK_2025_049)
        LangGraphCommandService,
        MultiAgentGraphBuilderService,
        ToolRegistryService,
        LlmProviderService,
        FunctionalTaskGraphStrategy,
        FunctionalNodeGraphStrategy,
        WorkflowAuthContextService,
      ],
      global: true,
    };
  }
}
