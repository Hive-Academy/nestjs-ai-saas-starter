import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AgentRegistrationService } from './services/agent-registration.service';
import { AgentRegistryService } from './services/agent-registry.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { LlmProviderService } from './services/llm-provider.service';
import { MultiAgentCoordinatorService } from './services/multi-agent-coordinator.service';
import { MultiAgentModuleInitializer } from './services/multi-agent-module-initializer.service';
import { NetworkManagerService } from './services/network-manager.service';
import { NodeFactoryService } from './services/node-factory.service';
import { ToolRegistrationService } from './services/tool-registration.service';
// Workflow services (internal infrastructure)
import { WorkflowCanonicalIdService } from './services/workflow-canonical-id.service';
import { WorkflowCheckpointService } from './services/workflow-checkpoint.service';
import { WorkflowInstanceService } from './services/workflow-instance.service';
import { WorkflowManagerService } from './services/workflow-manager.service';
import { WorkflowRegistryService } from './services/workflow-registry.service';
// Specialized workflow services (extracted from god services)
import { AgentStatusTrackingService } from './services/agent-status-tracking.service';
import { WorkflowMetricsService } from './services/workflow-metrics.service';
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
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { ToolBuilderService } from './tools/tool-builder.service';
import { ToolNodeService } from './tools/tool-node.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { setMultiAgentConfig } from './utils/multi-agent-config.accessor';
import { WorkflowStreamingService } from './services/workflow-streaming.service';

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
      // Note: ICheckpointAdapter, IStreamingService, and IMemoryAdapter should be provided by the app module via adapter pattern
      // No local providers needed as they will be injected globally
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
      WorkflowCheckpointService,
      WorkflowInstanceService,
      WorkflowCanonicalIdService,
      WorkflowManagerService,
      // Specialized workflow services (SRP-compliant)
      WorkflowMetricsService,
      AgentStatusTrackingService,
      WorkflowExecutionService,
      WorkflowStreamingService,
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
        // NOTE: WorkflowRegistryService and internal services delegate to workflow-engine
        // WorkflowManagerService provides the external facade for workflow operations
        // Tool services for external use
        ToolRegistryService,
        ToolRegistrationService,
        ToolBuilderService,
        WorkflowExecutionService,
        WorkflowStreamingService,
        // Agent services
        AgentRegistrationService,
        // Tool service aliases
        TOOL_REGISTRY,
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
      // Note: ICheckpointAdapter and IStreamingService should be provided by the app module via adapter pattern
      // No local providers needed as they will be injected globally
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
      WorkflowCheckpointService,
      WorkflowInstanceService,
      WorkflowCanonicalIdService,
      WorkflowManagerService,
      // Specialized workflow services (SRP-compliant)
      WorkflowMetricsService,
      AgentStatusTrackingService,
      WorkflowExecutionService,
      WorkflowStreamingService,
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
        WorkflowManagerService,
        ToolRegistryService,
        ToolRegistrationService,
        ToolBuilderService,
        WorkflowExecutionService,
        // Agent services
        AgentRegistrationService,

        // Tool service aliases
        TOOL_REGISTRY,
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
      // NOTE: No registration arrays - WorkflowEngineModule handles all registration
      // Preserve adapters if provided
      checkpointAdapter: options.checkpointAdapter,
      streamingAdapter: options.streamingAdapter,
    };
  }
}

/**
 * Async configuration interface
 */
