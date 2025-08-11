import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DiscoveryModule } from '@nestjs/core';
import {
  LangGraphModuleOptions,
  LangGraphModuleAsyncOptions,
  LangGraphOptionsFactory,
} from './interfaces/module-options.interface';
import {
  LANGGRAPH_MODULE_OPTIONS,
  LANGGRAPH_MODULE_ID,
  DEFAULT_LLM,
  TOOL_REGISTRY,
  WORKFLOW_REGISTRY,
  CHECKPOINT_SAVER,
  STREAM_MANAGER,
  HITL_MANAGER,
  LLM_PROVIDER_PREFIX,
} from './constants';
import { randomUUID } from 'crypto';

// Core services
import { WorkflowGraphBuilderService } from './core/workflow-graph-builder.service';
import { SubgraphManagerService } from './core/subgraph-manager.service';
import { CompilationCacheService } from './core/compilation-cache.service';
import { MetadataProcessorService } from './core/metadata-processor.service';
// TODO: Re-enable these imports when services are implemented
// import { StateTransformerService } from './core/state-transformer.service';
// import { WorkflowRegistryService } from './core/workflow-registry.service';

// Streaming services
import { WorkflowStreamService } from './streaming/workflow-stream.service';
import { TokenStreamingService } from './streaming/token-streaming.service';
// import { StreamTransformerService } from './streaming/stream-transformer.service';
import { WebSocketBridgeService } from './streaming/websocket-bridge.service';
// import { StreamBufferService } from './streaming/stream-buffer.service';

// Tool services
import { ToolRegistryService } from './tools/tool-registry.service';
import { ToolNodeService } from './tools/tool-node.service';
import { ToolBuilderService } from './tools/tool-builder.service';
import { ToolDiscoveryService } from './tools/tool-discovery.service';

// Routing services
import { CommandProcessorService } from './routing/command-processor.service';
import { AgentHandoffService } from './routing/agent-handoff.service';
import { WorkflowRoutingService } from './routing/workflow-routing.service';
// TODO: Re-enable these imports when services are implemented
// import { ConditionalRouterService } from './routing/conditional-router.service';
// import { RecoveryStrategyService } from './routing/recovery-strategy.service';
// import { PriorityRouterService } from './routing/priority-router.service';

// HITL services
import { HumanApprovalNode } from './hitl/human-approval.node';
import { HumanApprovalService } from './hitl/human-approval.service';
import { ConfidenceEvaluatorService } from './hitl/confidence-evaluator.service';
import { FeedbackProcessorService } from './hitl/feedback-processor.service';
import { ApprovalChainService } from './hitl/approval-chain.service';
import { 
  HUMAN_APPROVAL_SERVICE, 
  CONFIDENCE_EVALUATOR_SERVICE, 
  APPROVAL_CHAIN_SERVICE, 
  FEEDBACK_PROCESSOR_SERVICE 
} from './hitl/constants';

// Provider factories
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { CheckpointProvider } from './providers/checkpoint.provider';
import { MemoryProvider } from './providers/memory.provider';
import { TraceProvider } from './providers/trace.provider';
import { MetricsProvider } from './providers/metrics.provider';

// Testing utilities (conditionally loaded)
import { WorkflowTestBuilder } from './testing/workflow-test.builder';
import { MockAgentFactory } from './testing/mock-agent.factory';

@Global()
@Module({})
export class NestjsLanggraphModule {
  static forRoot(options: LangGraphModuleOptions = {}): DynamicModule {
    const moduleId = randomUUID();
    
    const optionsProvider: Provider = {
      provide: LANGGRAPH_MODULE_OPTIONS,
      useValue: options,
    };

    const moduleIdProvider: Provider = {
      provide: LANGGRAPH_MODULE_ID,
      useValue: moduleId,
    };

    const providers = [
      optionsProvider,
      moduleIdProvider,
      ...this.createCoreProviders(),
      ...this.createStreamingProviders(),
      ...this.createToolProviders(),
      ...this.createRoutingProviders(),
      ...this.createHITLProviders(),
      ...this.createLLMProviders(options),
      ...this.createInfrastructureProviders(options),
    ];

    const exports = [
      LANGGRAPH_MODULE_OPTIONS,
      DEFAULT_LLM,
      TOOL_REGISTRY,
      STREAM_MANAGER,
      // WORKFLOW_REGISTRY,
      WorkflowGraphBuilderService,
      SubgraphManagerService,
      CompilationCacheService,
      MetadataProcessorService,
      WorkflowStreamService,
      TokenStreamingService,
      WebSocketBridgeService,
      ToolRegistryService,
      ToolNodeService,
      ToolBuilderService,
      ToolDiscoveryService,
      CommandProcessorService,
      AgentHandoffService,
      WorkflowRoutingService,
      HumanApprovalNode,
      HumanApprovalService,
      ConfidenceEvaluatorService,
      FeedbackProcessorService,
      ApprovalChainService,
      WorkflowTestBuilder,
      MockAgentFactory,
    ];

    return {
      module: NestjsLanggraphModule,
      imports: [
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          maxListeners: 100,
          verboseMemoryLeak: true,
        }),
        DiscoveryModule,
      ],
      providers,
      exports,
    };
  }

  static forRootAsync(options: LangGraphModuleAsyncOptions): DynamicModule {
    const moduleId = randomUUID();
    
    const moduleIdProvider: Provider = {
      provide: LANGGRAPH_MODULE_ID,
      useValue: moduleId,
    };

    const asyncProviders = this.createAsyncProviders(options);

    const providers = [
      moduleIdProvider,
      ...asyncProviders,
      ...this.createCoreProviders(),
      ...this.createStreamingProviders(),
      ...this.createToolProviders(),
      ...this.createRoutingProviders(),
      ...this.createHITLProviders(),
      {
        provide: DEFAULT_LLM,
        useFactory: async (
          factory: LLMProviderFactory,
          opts: LangGraphModuleOptions,
        ) => {
          if (opts.defaultLLM) {
            return factory.create(opts.defaultLLM);
          }
          return null;
        },
        inject: [LLMProviderFactory, LANGGRAPH_MODULE_OPTIONS],
      },
      LLMProviderFactory,
      ...this.createInfrastructureProvidersAsync(),
    ];

    const exports = [
      LANGGRAPH_MODULE_OPTIONS,
      DEFAULT_LLM,
      TOOL_REGISTRY,
      STREAM_MANAGER,
      // WORKFLOW_REGISTRY,
      WorkflowGraphBuilderService,
      SubgraphManagerService,
      CompilationCacheService,
      MetadataProcessorService,
      WorkflowStreamService,
      TokenStreamingService,
      WebSocketBridgeService,
      ToolRegistryService,
      ToolNodeService,
      ToolBuilderService,
      ToolDiscoveryService,
      CommandProcessorService,
      AgentHandoffService,
      WorkflowRoutingService,
      HumanApprovalNode,
      HumanApprovalService,
      ConfidenceEvaluatorService,
      FeedbackProcessorService,
      ApprovalChainService,
      WorkflowTestBuilder,
      MockAgentFactory,
    ];

    return {
      module: NestjsLanggraphModule,
      imports: [
        ...(options.imports || []),
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          maxListeners: 100,
          verboseMemoryLeak: true,
        }),
        DiscoveryModule,
      ],
      providers,
      exports,
    };
  }

  static forFeature(workflows: Type<any>[]): DynamicModule {
    const providers = workflows.map((workflow) => ({
      provide: workflow,
      useClass: workflow,
    }));

    return {
      module: NestjsLanggraphModule,
      providers,
      exports: providers,
    };
  }

  private static createAsyncProviders(
    options: LangGraphModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: LANGGRAPH_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    const useClass = options.useClass || options.useExisting;
    if (!useClass) {
      throw new Error('Invalid LangGraphModuleAsyncOptions');
    }

    const providers: Provider[] = [
      {
        provide: LANGGRAPH_MODULE_OPTIONS,
        useFactory: async (optionsFactory: LangGraphOptionsFactory) =>
          await optionsFactory.createLangGraphOptions(),
        inject: [useClass],
      },
    ];

    if (options.useClass) {
      providers.push({
        provide: useClass,
        useClass,
      });
    }

    return providers;
  }

  private static createCoreProviders(): Provider[] {
    return [
      WorkflowGraphBuilderService,
      SubgraphManagerService,
      CompilationCacheService,
      MetadataProcessorService,
      // TODO: Re-enable when services are implemented
      // StateTransformerService,
      // WorkflowRegistryService,
    ];
  }

  private static createStreamingProviders(): Provider[] {
    return [
      WorkflowStreamService,
      TokenStreamingService,
      // StreamTransformerService,
      WebSocketBridgeService,
      // StreamBufferService,
      {
        provide: STREAM_MANAGER,
        useClass: WorkflowStreamService,
      },
    ];
  }

  private static createToolProviders(): Provider[] {
    return [
      ToolRegistryService,
      ToolNodeService,
      ToolBuilderService,
      ToolDiscoveryService,
      {
        provide: TOOL_REGISTRY,
        useClass: ToolRegistryService,
      },
    ];
  }

  private static createRoutingProviders(): Provider[] {
    return [
      CommandProcessorService,
      AgentHandoffService,
      WorkflowRoutingService,
      // TODO: Re-enable when services are implemented
      // ConditionalRouterService,
      // RecoveryStrategyService,
      // PriorityRouterService,
    ];
  }

  private static createHITLProviders(): Provider[] {
    return [
      HumanApprovalNode,
      HumanApprovalService,
      ConfidenceEvaluatorService,
      FeedbackProcessorService,
      ApprovalChainService,
      {
        provide: HITL_MANAGER,
        useClass: HumanApprovalService,
      },
      {
        provide: HUMAN_APPROVAL_SERVICE,
        useClass: HumanApprovalService,
      },
      {
        provide: CONFIDENCE_EVALUATOR_SERVICE,
        useClass: ConfidenceEvaluatorService,
      },
      {
        provide: APPROVAL_CHAIN_SERVICE,
        useClass: ApprovalChainService,
      },
      {
        provide: FEEDBACK_PROCESSOR_SERVICE,
        useClass: FeedbackProcessorService,
      },
    ];
  }

  private static createLLMProviders(
    options: LangGraphModuleOptions,
  ): Provider[] {
    const providers: Provider[] = [LLMProviderFactory];

    // Create default LLM provider
    if (options.defaultLLM) {
      providers.push({
        provide: DEFAULT_LLM,
        useFactory: (factory: LLMProviderFactory) => {
          return factory.create(options.defaultLLM!);
        },
        inject: [LLMProviderFactory],
      });
    }

    // Create named LLM providers
    if (options.providers) {
      Object.entries(options.providers).forEach(([name, config]) => {
        providers.push({
          provide: `${LLM_PROVIDER_PREFIX}${name.toUpperCase()}`,
          useFactory: (factory: LLMProviderFactory) => {
            return factory.create(config);
          },
          inject: [LLMProviderFactory],
        });
      });
    }

    return providers;
  }

  private static createInfrastructureProviders(
    options: LangGraphModuleOptions,
  ): Provider[] {
    const providers: Provider[] = [
      CheckpointProvider,
      MemoryProvider,
      TraceProvider,
      MetricsProvider,
      WorkflowTestBuilder,
      MockAgentFactory,
    ];

    // Create checkpoint saver if configured
    if (options.checkpoint?.enabled) {
      providers.push({
        provide: CHECKPOINT_SAVER,
        useFactory: async () => {
          const provider = new CheckpointProvider();
          return await provider.create(options.checkpoint!);
        },
      });
    }

    // Create workflow registry
    // TODO: Re-enable when WorkflowRegistryService is implemented
    // providers.push({
    //   provide: WORKFLOW_REGISTRY,
    //   useClass: WorkflowRegistryService,
    // });

    return providers;
  }

  private static createInfrastructureProvidersAsync(): Provider[] {
    return [
      CheckpointProvider,
      MemoryProvider,
      TraceProvider,
      MetricsProvider,
      WorkflowTestBuilder,
      MockAgentFactory,
      {
        provide: CHECKPOINT_SAVER,
        useFactory: async (
          provider: CheckpointProvider,
          options: LangGraphModuleOptions,
        ) => {
          if (options.checkpoint?.enabled) {
            return provider.create(options.checkpoint);
          }
          return null;
        },
        inject: [CheckpointProvider, LANGGRAPH_MODULE_OPTIONS],
      },
      // TODO: Re-enable when WorkflowRegistryService is implemented
      // {
      //   provide: WORKFLOW_REGISTRY,
      //   useClass: WorkflowRegistryService,
      // },
    ];
  }
}