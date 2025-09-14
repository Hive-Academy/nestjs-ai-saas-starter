import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AgentRegistryService } from './services/agent-registry.service';
import { AgentRegistrationService } from './services/agent-registration.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { LlmProviderService } from './services/llm-provider.service';
import { MultiAgentCoordinatorService } from './services/multi-agent-coordinator.service';
import { NetworkManagerService } from './services/network-manager.service';
import { NodeFactoryService } from './services/node-factory.service';
import { ToolRegistrationService } from './services/tool-registration.service';
import { MultiAgentModuleInitializer } from './services/multi-agent-module-initializer.service';
// Workflow services (internal infrastructure)
import { WorkflowRegistryService } from './services/workflow-registry.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { WorkflowManagerService } from './services/workflow-manager.service';
// Tool services
import {
  DEFAULT_MULTI_AGENT_OPTIONS,
  MULTI_AGENT_MODULE_OPTIONS,
  TOOL_REGISTRY,
} from './constants/multi-agent.constants';
import {
  MultiAgentModuleAsyncOptions,
  MultiAgentModuleOptions,
} from './interfaces/multi-agent.interface';
import { ToolBuilderService } from './tools/tool-builder.service';
import { ToolNodeService } from './tools/tool-node.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import {
  CHECKPOINT_ADAPTER_TOKEN,
  NoOpCheckpointAdapter,
  STREAMING_SERVICE_TOKEN,
  NoOpStreamingService,
} from '@hive-academy/langgraph-core';
import { setMultiAgentConfig } from './utils/multi-agent-config.accessor';

/**
 * Multi-Agent module following 2025 LangGraph patterns
 */
@Module({})
export class MultiAgentModule {
  /**
   * Register the module synchronously
   */
  static forRoot(options: MultiAgentModuleOptions = {}): DynamicModule {
    const mergedOptions = this.mergeWithDefaults(options);

    // Store config for decorator access
    setMultiAgentConfig(mergedOptions);

    const providers: Provider[] = [
      {
        provide: MULTI_AGENT_MODULE_OPTIONS,
        useValue: mergedOptions,
      },
      // Checkpoint adapter provider - either provided or no-op
      {
        provide: CHECKPOINT_ADAPTER_TOKEN,
        useValue: options.checkpointAdapter || new NoOpCheckpointAdapter(),
      },
      // Streaming adapter provider - either provided or no-op
      {
        provide: STREAMING_SERVICE_TOKEN,
        useValue: options.streamingAdapter || new NoOpStreamingService(),
      },
      // Core services
      AgentRegistryService,
      LlmProviderService,
      NodeFactoryService,
      GraphBuilderService,
      NetworkManagerService,
      // Tool services
      ToolRegistryService,
      ToolRegistrationService,
      ToolBuilderService,
      ToolNodeService,
      // Agent services
      AgentRegistrationService,
      // Workflow services (internal infrastructure)
      WorkflowRegistryService,
      WorkflowExecutionService,
      WorkflowManagerService,
      // Tool service aliases
      {
        provide: TOOL_REGISTRY,
        useExisting: ToolRegistryService,
      },
      // Facade and examples
      MultiAgentCoordinatorService,

      // Module initializer
      MultiAgentModuleInitializer,
    ];

    return {
      module: MultiAgentModule,
      imports: [EventEmitterModule.forRoot()],
      providers,
      exports: [
        // Main facade service (primary interface)
        MultiAgentCoordinatorService,
        // Individual services for advanced users
        AgentRegistryService,
        NetworkManagerService,
        LlmProviderService,
        // NOTE: GraphBuilderService and ToolNodeService are now internal-only
        // They provide powerful infrastructure but are implementation details
        // Workflow facade service (external interface)
        WorkflowManagerService,
        // NOTE: WorkflowRegistryService and WorkflowExecutionService are internal-only
        // They provide workflow infrastructure but are implementation details
        // Tool services for external use
        ToolRegistryService,
        ToolRegistrationService,
        ToolBuilderService,
        // Agent services
        AgentRegistrationService,
        // Tool service aliases
        TOOL_REGISTRY,
        // DI tokens
        CHECKPOINT_ADAPTER_TOKEN,
        STREAMING_SERVICE_TOKEN,
      ],
      global: true,
    };
  }

  /**
   * Register the module asynchronously
   */
  static forRootAsync(options: MultiAgentModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: MULTI_AGENT_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) => {
          const moduleOptions = await options.useFactory!(...args);
          const mergedOptions = this.mergeWithDefaults(moduleOptions);
          // Store config for decorator access
          setMultiAgentConfig(mergedOptions);
          return mergedOptions;
        },
        inject: options.inject || [],
      },
      // Checkpoint adapter provider - async factory
      {
        provide: CHECKPOINT_ADAPTER_TOKEN,
        useFactory: async (...args: unknown[]) => {
          const moduleOptions = await options.useFactory!(...args);
          return moduleOptions.checkpointAdapter || new NoOpCheckpointAdapter();
        },
        inject: options.inject || [],
      },
      // Streaming adapter provider - async factory
      {
        provide: STREAMING_SERVICE_TOKEN,
        useFactory: async (...args: unknown[]) => {
          const moduleOptions = await options.useFactory!(...args);
          return moduleOptions.streamingAdapter || new NoOpStreamingService();
        },
        inject: options.inject || [],
      },
      // Core services
      AgentRegistryService,
      LlmProviderService,
      NodeFactoryService,
      GraphBuilderService,
      NetworkManagerService,
      // Tool services
      ToolRegistryService,
      ToolRegistrationService,
      ToolBuilderService,
      ToolNodeService,
      // Agent services
      AgentRegistrationService,
      // Workflow services (internal infrastructure)
      WorkflowRegistryService,
      WorkflowExecutionService,
      WorkflowManagerService,
      // Tool service aliases
      {
        provide: TOOL_REGISTRY,
        useExisting: ToolRegistryService,
      },
      // Facade and examples
      MultiAgentCoordinatorService,

      // Module initializer
      MultiAgentModuleInitializer,
    ];

    const imports = [EventEmitterModule.forRoot()];

    if (options.imports) {
      imports.push(...options.imports);
    }

    return {
      module: MultiAgentModule,
      imports,
      providers,
      exports: [
        // Main facade service (primary interface)
        MultiAgentCoordinatorService,
        // Individual services for advanced users
        AgentRegistryService,
        NetworkManagerService,
        LlmProviderService,
        // NOTE: GraphBuilderService and ToolNodeService are now internal-only
        // They provide powerful infrastructure but are implementation details
        // Workflow facade service (external interface)
        WorkflowManagerService,
        // NOTE: WorkflowRegistryService and WorkflowExecutionService are internal-only
        // They provide workflow infrastructure but are implementation details
        // Tool services for external use
        ToolRegistryService,
        ToolRegistrationService,
        ToolBuilderService,
        // Agent services
        AgentRegistrationService,
        // Tool service aliases
        TOOL_REGISTRY,
        // DI tokens
        CHECKPOINT_ADAPTER_TOKEN,
        STREAMING_SERVICE_TOKEN,
      ],
      global: true,
    };
  }

  /**
   * Merge user options with defaults
   */
  private static mergeWithDefaults(
    options: MultiAgentModuleOptions
  ): MultiAgentModuleOptions {
    return {
      defaultLlm: {
        ...DEFAULT_MULTI_AGENT_OPTIONS.defaultLlm,
        ...options.defaultLlm,
      },
      messageHistory: {
        ...DEFAULT_MULTI_AGENT_OPTIONS.messageHistory,
        ...options.messageHistory,
      },
      streaming: {
        ...DEFAULT_MULTI_AGENT_OPTIONS.streaming,
        ...options.streaming,
      },
      debug: {
        ...DEFAULT_MULTI_AGENT_OPTIONS.debug,
        ...options.debug,
      },
      performance: {
        ...DEFAULT_MULTI_AGENT_OPTIONS.performance,
        ...options.performance,
      },
      checkpointing: {
        ...DEFAULT_MULTI_AGENT_OPTIONS.checkpointing,
        ...options.checkpointing,
      },
      // Preserve tools, agents, workflows arrays - critical for explicit registration
      tools: options.tools || [],
      agents: options.agents || [],
      workflows: options.workflows || [],
      // Preserve adapters if provided
      checkpointAdapter: options.checkpointAdapter,
      streamingAdapter: options.streamingAdapter,
    };
  }
}

/**
 * Async configuration interface
 */
