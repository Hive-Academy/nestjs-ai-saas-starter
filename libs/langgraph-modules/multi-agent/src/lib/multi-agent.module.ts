import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AgentRegistryService } from './agent/agent-registry.service';
// Network services
import { GraphBuilderService } from './network/graph-builder.service';
import { NetworkManagerService } from './network/network-manager.service';
import { NodeFactoryService } from './network/node-factory.service';
// Workflow services (internal infrastructure)
import { WorkflowCanonicalIdService } from './workflow/workflow-canonical-id.service';
import { WorkflowCheckpointService } from './workflow/workflow-checkpoint.service';
import { WorkflowInstanceService } from './workflow/workflow-instance.service';
import { WorkflowManagerService } from './workflow/workflow-manager.service';
import { WorkflowRegistryService } from './workflow/workflow-registry.service';
import { WorkflowMetricsService } from './workflow/workflow-metrics.service';
// Coordination services
import { MultiAgentCoordinatorService } from './coordination/multi-agent-coordinator.service';
import { NetworkSetupService } from './coordination/network-setup.service';
import { WorkflowExecutionCoordinationService } from './coordination/workflow-execution-coordination.service';
import { StreamCoordinationService } from './coordination/stream-coordination.service';
import { MemoryCoordinationService } from './coordination/memory-coordination.service';
// LLM services
import { LlmProviderService } from './llm/llm-provider.service';
// Tool services
import { ToolRegistrationService } from './tools/tool-registration.service';
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
import { WorkflowExecutionService } from './workflow/workflow-execution.service';
import { ToolBuilderService } from './tools/tool-builder.service';
import { ToolNodeService } from './tools/tool-node.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { setMultiAgentConfig } from './utils/multi-agent-config.accessor';
import { WorkflowStreamingService } from './workflow/workflow-streaming.service';

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
      // ============================================
      // MODULE CONFIGURATION
      // ============================================
      {
        provide: MULTI_AGENT_MODULE_OPTIONS,
        useValue: mergedOptions,
      },

      // ============================================
      // CORE COORDINATION SERVICES
      // ============================================
      MultiAgentCoordinatorService,

      // Coordination Services (Internal - used by coordinator)
      NetworkSetupService,
      WorkflowExecutionCoordinationService,
      StreamCoordinationService,
      MemoryCoordinationService,

      // ============================================
      // AGENT MANAGEMENT (Internal)
      // ============================================
      AgentRegistryService,

      // ============================================
      // NETWORK SERVICES (Internal)
      // ============================================
      GraphBuilderService,
      NodeFactoryService,
      NetworkManagerService,

      // ============================================
      // LLM SERVICES (Internal)
      // ============================================
      LlmProviderService,

      // ============================================
      // WORKFLOW SERVICES (Internal Infrastructure)
      // ============================================
      WorkflowRegistryService,
      WorkflowCheckpointService,
      WorkflowInstanceService,
      WorkflowCanonicalIdService,
      WorkflowManagerService,
      WorkflowMetricsService,
      WorkflowExecutionService,
      WorkflowStreamingService,

      // ============================================
      // TOOL SERVICES (Public API)
      // ============================================
      ToolRegistryService,
      ToolRegistrationService,
      ToolBuilderService,
      ToolNodeService,
      {
        provide: TOOL_REGISTRY,
        useExisting: ToolRegistryService,
      },
    ];

    return {
      module: MultiAgentModule,
      imports: [EventEmitterModule.forRoot()],
      providers,
      exports: [
        // ============================================
        // PUBLIC API - These are the ONLY exports
        // ============================================

        // Main facade service (for advanced use cases)
        MultiAgentCoordinatorService,

        // Tool services (public API)
        ToolRegistrationService,
        ToolRegistryService,

        // Tool service alias token
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
      // ============================================
      // MODULE CONFIGURATION (Async Factory)
      // ============================================
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

      // ============================================
      // CORE COORDINATION SERVICES
      // ============================================
      MultiAgentCoordinatorService,

      // Coordination Services (Internal - used by coordinator)
      NetworkSetupService,
      WorkflowExecutionCoordinationService,
      StreamCoordinationService,
      MemoryCoordinationService,

      // ============================================
      // AGENT MANAGEMENT (Internal)
      // ============================================
      AgentRegistryService,

      // ============================================
      // NETWORK SERVICES (Internal)
      // ============================================
      GraphBuilderService,
      NodeFactoryService,
      NetworkManagerService,

      // ============================================
      // LLM SERVICES (Internal)
      // ============================================
      LlmProviderService,

      // ============================================
      // WORKFLOW SERVICES (Internal Infrastructure)
      // ============================================
      WorkflowRegistryService,
      WorkflowCheckpointService,
      WorkflowInstanceService,
      WorkflowCanonicalIdService,
      WorkflowManagerService,
      WorkflowMetricsService,
      WorkflowExecutionService,
      WorkflowStreamingService,

      // ============================================
      // TOOL SERVICES (Public API)
      // ============================================
      ToolRegistryService,
      ToolRegistrationService,
      ToolBuilderService,
      ToolNodeService,
      {
        provide: TOOL_REGISTRY,
        useExisting: ToolRegistryService,
      },
    ];

    return {
      module: MultiAgentModule,
      imports: [EventEmitterModule.forRoot()],
      providers,
      exports: [
        // ============================================
        // PUBLIC API - These are the ONLY exports
        // ============================================

        // Main facade service (for advanced use cases)
        MultiAgentCoordinatorService,

        // Tool services (public API)
        ToolRegistrationService,
        ToolRegistryService,

        // Tool service alias token
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
