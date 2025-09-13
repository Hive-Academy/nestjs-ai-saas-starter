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
} from '@hive-academy/langgraph-core';

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
        GraphBuilderService,
        NodeFactoryService,
        // Tool services
        ToolRegistryService,
        ToolRegistrationService,
        ToolBuilderService,
        ToolNodeService,
        // Agent services
        AgentRegistrationService,
        // Tool service aliases
        TOOL_REGISTRY,
        // Examples service

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
          return this.mergeWithDefaults(moduleOptions);
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
        GraphBuilderService,
        NodeFactoryService,
        // Tool services
        ToolRegistryService,
        ToolRegistrationService,
        ToolBuilderService,
        ToolNodeService,
        // Agent services
        AgentRegistrationService,
        // Tool service aliases
        TOOL_REGISTRY,
        // Examples service

      ],
      global: false,
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
      // Preserve checkpoint adapter if provided
      checkpointAdapter: options.checkpointAdapter,
    };
  }
}

/**
 * Async configuration interface
 */
