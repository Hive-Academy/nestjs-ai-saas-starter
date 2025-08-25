import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MultiAgentCoordinatorService } from './services/multi-agent-coordinator.service';
import { AgentExamplesService } from './services/agent-examples.service';
import { AgentRegistryService } from './services/agent-registry.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { NodeFactoryService } from './services/node-factory.service';
import { LlmProviderService } from './services/llm-provider.service';
import { NetworkManagerService } from './services/network-manager.service';
// Tool services
import { ToolRegistryService } from './tools/tool-registry.service';
import { ToolDiscoveryService } from './tools/tool-discovery.service';
import { ToolBuilderService } from './tools/tool-builder.service';
import { ToolNodeService } from './tools/tool-node.service';
import {
  MultiAgentModuleOptions,
  MultiAgentModuleAsyncOptions,
} from './interfaces/multi-agent.interface';
import {
  MULTI_AGENT_MODULE_OPTIONS,
  DEFAULT_MULTI_AGENT_OPTIONS,
  TOOL_REGISTRY,
} from './constants/multi-agent.constants';

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
      // Core services
      AgentRegistryService,
      LlmProviderService,
      NodeFactoryService,
      GraphBuilderService,
      NetworkManagerService,
      // Tool services
      ToolRegistryService,
      ToolDiscoveryService,
      ToolBuilderService,
      ToolNodeService,
      // Tool service aliases
      {
        provide: TOOL_REGISTRY,
        useExisting: ToolRegistryService,
      },
      // Facade and examples
      MultiAgentCoordinatorService,
      AgentExamplesService,
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
        ToolDiscoveryService,
        ToolBuilderService,
        ToolNodeService,
        // Tool service aliases
        TOOL_REGISTRY,
        // Examples service
        AgentExamplesService,
      ],
      global: false,
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
      // Core services
      AgentRegistryService,
      LlmProviderService,
      NodeFactoryService,
      GraphBuilderService,
      NetworkManagerService,
      // Tool services
      ToolRegistryService,
      ToolDiscoveryService,
      ToolBuilderService,
      ToolNodeService,
      // Tool service aliases
      {
        provide: TOOL_REGISTRY,
        useExisting: ToolRegistryService,
      },
      // Facade and examples
      MultiAgentCoordinatorService,
      AgentExamplesService,
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
        ToolDiscoveryService,
        ToolBuilderService,
        ToolNodeService,
        // Tool service aliases
        TOOL_REGISTRY,
        // Examples service
        AgentExamplesService,
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
    };
  }
}

/**
 * Async configuration interface
 */
