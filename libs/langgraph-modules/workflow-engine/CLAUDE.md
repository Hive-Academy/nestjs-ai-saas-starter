# Workflow Engine Module - Central Orchestration Hub

## 🚀 LangGraph Ecosystem Integration

**Evidence-Based API Documentation** (verified through source code inspection)

The Workflow Engine serves as the **central orchestration hub** that coordinates all LangGraph modules through a sophisticated registry pattern and comprehensive service architecture.

### 🏛️ Verified Architecture Patterns

**Central Registry Pattern**: Single source of truth for all agents, tools, and workflows

```typescript
// VERIFIED EXPORT: Central coordination service
import { CentralRegistryService } from '@hive-academy/langgraph-workflow-engine';

// Real implementation: Registry maps for all ecosystem components
class CentralRegistryService {
  private readonly agents = new Map<string, AgentProvider>();
  private readonly tools = new Map<string, ToolProvider>();
  private readonly workflows = new Map<string, WorkflowProvider>();
}
```

**Streaming Integration**: Built-in streaming services to avoid circular dependencies

```typescript
// VERIFIED EXPORTS: Streaming services within workflow-engine
import { WorkflowStreamService, WorkflowStreamOrchestrator, TokenProcessingService } from '@hive-academy/langgraph-workflow-engine';
```

### 🎯 Key Consumer Value

**Before Workflow-Engine**: Manual coordination between modules
**With Workflow-Engine**: Central registry coordinates everything automatically

```typescript
// ❌ OLD: Manual module coordination (error-prone)
const agents = new Map();
const tools = new Map();
const workflows = new Map();
// Manual registration and coordination...

// ✅ NEW: Central registry coordination (reliable)
import { CentralRegistryService } from '@hive-academy/langgraph-workflow-engine';
const registry = new CentralRegistryService();
// Automatic registration and coordination
```

## I. Foundation Layer

### ✅ Verified API Exports

**Core Services** (verified from src/index.ts):

```typescript
// VERIFIED EXPORTS: Core workflow services
import {
  WorkflowEngineModule,
  WorkflowExecutionService, // Main execution engine
  WorkflowGraphBuilderService, // Graph compilation
  MetadataProcessorService, // Decorator processing
  CompilationCacheService, // Performance optimization
} from '@hive-academy/langgraph-workflow-engine';

// VERIFIED EXPORTS: Central Registry (Single Source of Truth)
import { CentralRegistryService } from '@hive-academy/langgraph-workflow-engine';

// VERIFIED EXPORTS: Base Classes for Consumers
import {
  UnifiedWorkflowBase, // Primary base class
  DeclarativeWorkflowBase, // Decorator-driven workflows
  StreamingWorkflowBase, // Streaming workflows
  AgentNodeBase, // Agent node implementation
} from '@hive-academy/langgraph-workflow-engine';

// VERIFIED EXPORTS: Integration Services
import {
  DecoratorTranslationService, // Decorator → Graph translation
  MultiAgentTranslationService, // Multi-agent coordination
  AgentWorkflowBridgeService, // Agent-workflow integration
} from '@hive-academy/langgraph-workflow-engine';
```

### Quick Start & Installation

```bash
npm install @hive-academy/langgraph-workflow-engine
```

```typescript
import { Module } from '@nestjs/common';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

@Module({
  imports: [
    WorkflowEngineModule.forRoot({
      // Central registry configuration
      registry: {
        autoRegisterAgents: true,
        autoRegisterTools: true,
        autoRegisterWorkflows: true,
      },

      // Execution configuration
      execution: {
        maxConcurrentWorkflows: 10,
        defaultTimeout: 300000, // 5 minutes
        enableCaching: true,
      },

      // Integration bridges
      bridges: {
        decoratorTranslation: true,
        multiAgentTranslation: true,
        agentWorkflowBridge: true,
      },
    }),
  ],
})
export class AppModule {}
```

### 🏗️ Core Architecture Components

**Central Registry Pattern**: Single source of truth for all ecosystem components

```typescript
@Injectable()
export class MyWorkflowService {
  constructor(private readonly registry: CentralRegistryService, private readonly execution: WorkflowExecutionService) {}

  async registerAndExecute() {
    // Registry automatically manages all agents, tools, workflows
    await this.registry.registerAgent('my-agent', AgentProvider);
    await this.registry.registerTool('my-tool', ToolProvider);

    // Execution service uses registry for component discovery
    const result = await this.execution.executeWorkflow({
      name: 'registry-managed-workflow',
      // Components automatically discovered from registry
    });

    return result;
  }
}
```

### Core Interfaces & Types

**Primary Interfaces:**

```typescript
// Core workflow engine that orchestrates all modules together
interface IWorkflowEngine {
  executeWorkflow<T>(definition: WorkflowDefinition<T>): Promise<WorkflowResult<T>>;
  createAgent(config: AgentConfiguration): Promise<IAgent>;
  streamWorkflow<T>(definition: WorkflowDefinition<T>): AsyncIterable<WorkflowUpdate<T>>;
}

// Configuration interface for workflow engine module
interface WorkflowEngineConfig {
  enabled: boolean;
  execution: ExecutionConfig;
  integrations: IntegrationConfig;
  agentDefaults?: AgentDefaults;
}

// Enhanced agent support types
interface WorkflowEngineAgentConfig {
  type?: 'simple-agent' | 'workflow-agent';
  workflowConfig?: {
    enableOrchestration: boolean;
    enableMultiModuleIntegration: boolean;
    enableAdvancedRouting: boolean;
  };
}
```

### Basic Usage Patterns

**Simple Agent Integration:**

```typescript
@Agent({
  id: 'simple-workflow-agent',
  type: 'simple-agent',
  capabilities: ['workflow-execution'],
})
export class SimpleWorkflowAgent {
  async nodeFunction(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Basic workflow execution usage
    return {
      workflowResult: 'Processing complete',
      status: 'completed',
    };
  }
}
```

**Basic Service Usage:**

```typescript
@Injectable()
export class BasicWorkflowService {
  constructor(private readonly workflowEngine: IWorkflowEngine) {}

  async performBasicWorkflow(): Promise<WorkflowResult> {
    // Demonstrate core workflow functionality
    return await this.workflowEngine.executeWorkflow({
      name: 'basic-workflow',
      nodes: [
        {
          id: 'process',
          handler: async (state) => ({ processed: true }),
        },
      ],
      edges: [],
    });
  }
}
```

### 🔑 Embedded State Management Patterns

**The workflow-engine's key differentiator is embedded Memory and Checkpoint management.**

Instead of managing these as standalone services, they're automatically integrated and coordinated:

```typescript
@Injectable()
export class EmbeddedStateWorkflowService {
  constructor(private readonly workflowEngine: IWorkflowEngine) {}

  async createWorkflowWithEmbeddedState(): Promise<WorkflowResult<AIWorkflowState>> {
    return await this.workflowEngine.executeWorkflow({
      name: 'embedded-state-workflow',
      description: 'Workflow with embedded memory and checkpoint management',

      // 🔑 KEY: Embedded memory configuration (not standalone service)
      memory: {
        strategy: 'embedded',
        contextWindow: 10,
        persistence: 'automatic', // Automatically persisted with checkpoints
        retention: Duration.hours(24),
      },

      // 🔑 KEY: Embedded checkpoint configuration (not standalone service)
      checkpoints: {
        strategy: 'embedded',
        saveAfterEachNode: true,
        compression: true,
        recovery: 'automatic',
      },

      nodes: [
        {
          id: 'initialize-with-memory',
          handler: async (state: AIWorkflowState) => {
            // Memory automatically available - no manual service injection
            const memories = await state.memory.retrieveRelevant(state.userQuery);

            // Checkpoint automatically saved after this node
            return {
              ...state,
              memories,
              phase: 'memory-loaded',
            };
          },
        },

        {
          id: 'process-with-context',
          handler: async (state: AIWorkflowState) => {
            // Use memory context in processing
            const result = await this.processWithContext({
              input: state.userQuery,
              context: state.memories,
            });

            // Memory automatically updated with new context
            await state.memory.store({
              query: state.userQuery,
              result: result.response,
              confidence: result.confidence,
            });

            // Checkpoint automatically saved
            return {
              ...state,
              aiResponse: result.response,
              confidence: result.confidence,
              phase: 'processing-complete',
            };
          },
        },

        {
          id: 'finalize-with-persistence',
          handler: async (state: AIWorkflowState) => {
            // Final state automatically checkpointed
            return {
              ...state,
              status: 'completed',
              finalCheckpoint: state.checkpoint.id, // Automatic checkpoint reference
              memoryEntries: state.memory.count, // Automatic memory tracking
            };
          },
        },
      ],

      edges: [
        { from: 'initialize-with-memory', to: 'process-with-context' },
        { from: 'process-with-context', to: 'finalize-with-persistence' },
      ],

      // Error recovery using embedded checkpoints
      errorRecovery: {
        enabled: true,
        strategy: 'resume-from-last-checkpoint',
        maxRetries: 3,
      },
    });
  }

  async resumeFromCheckpoint(workflowId: string): Promise<WorkflowResult> {
    // Embedded checkpoint recovery
    return await this.workflowEngine.resumeWorkflow({
      workflowId,
      // Memory context automatically restored from checkpoint
      // No manual state reconstruction required
    });
  }
}
```

### 🚀 Complete Ecosystem Integration Example

**Workflow-Engine coordinating all 13 libraries with embedded state management:**

```typescript
@Injectable()
export class CompleteEcosystemWorkflowService {
  async createProductionAIWorkflow(): Promise<WorkflowResult<ProductionAIState>> {
    return await this.workflowEngine.executeWorkflow({
      name: 'production-ai-ecosystem',
      description: 'Complete AI workflow using all 13 LangGraph libraries',

      // Embedded state management (Memory + Checkpoint)
      embeddedModules: {
        memory: {
          contextWindow: 20,
          semanticSearch: true, // Integration with ChromaDB
          graphContext: true, // Integration with Neo4j
        },
        checkpoint: {
          saveEvery: Duration.seconds(10),
          compression: true,
          versioning: true,
        },
      },

      // Multi-module integrations
      integrations: {
        streaming: { enabled: true, memorySync: true },
        multiAgent: { coordination: 'embedded-state' },
        functionalAPI: { pureStateFunctions: true },
        hitl: { checkpointBeforeApproval: true },
        monitoring: { stateMetrics: true },
        platform: { cloudDeployment: true },
        timeTravel: { stateHistory: true },
      },

      nodes: [
        {
          id: 'ecosystem-initialization',
          handler: async (state: ProductionAIState) => {
            // Initialize with database connections (ChromaDB + Neo4j)
            const vectorContext = await state.chromadb.initialize();
            const graphContext = await state.neo4j.initialize();

            // Memory automatically tracks database context
            await state.memory.storeContext({
              vectorDB: vectorContext,
              graphDB: graphContext,
            });

            return { ...state, ecosystem: 'initialized' };
          },
        },

        {
          id: 'multi-agent-coordination',
          handler: async (state: ProductionAIState) => {
            // Multi-agent with embedded memory sharing
            const agentResults = await state.multiAgent.coordinate({
              agents: ['analyzer', 'processor', 'validator'],
              sharedMemory: state.memory, // Embedded memory shared across agents
              functionalComposition: state.functionalAPI.compose([validateInput, enrichWithMemory, processWithAgents]),
            });

            // HITL approval with checkpoint before decision
            if (agentResults.confidence < 0.8) {
              await state.checkpoint.save('before-hitl-approval');

              const approval = await state.hitl.requestApproval({
                results: agentResults,
                context: state.memory.getRecentContext(),
                timeout: Duration.minutes(5),
              });

              if (!approval.approved) {
                // Resume from checkpoint if rejected
                return await state.checkpoint.restore('before-hitl-approval');
              }
            }

            return { ...state, agentResults, approved: true };
          },
        },

        {
          id: 'streaming-with-state-persistence',
          handler: async (state: ProductionAIState) => {
            // Streaming with embedded memory and checkpoint sync
            const streamResult = await state.streaming.processWithPersistence({
              input: state.agentResults,
              memorySync: true, // Memory automatically updated during streaming
              checkpointSync: true, // Checkpoint saved during streaming
              monitoring: state.monitoring, // Production monitoring enabled
            });

            return { ...state, streamResult };
          },
        },

        {
          id: 'production-deployment',
          handler: async (state: ProductionAIState) => {
            // Platform deployment with time-travel debugging
            const deployment = await state.platform.deploy({
              workflow: state,
              monitoring: {
                stateMetrics: true,
                memoryUsage: true,
                checkpointFrequency: true,
              },
              debugging: {
                timeTravel: state.timeTravel.enableForProduction(),
                stateHistory: state.checkpoint.getHistory(),
              },
            });

            return {
              ...state,
              deployment,
              status: 'production-ready',
            };
          },
        },
      ],

      edges: [
        { from: 'ecosystem-initialization', to: 'multi-agent-coordination' },
        { from: 'multi-agent-coordination', to: 'streaming-with-state-persistence' },
        { from: 'streaming-with-state-persistence', to: 'production-deployment' },
      ],
    });
  }
}
```

**🎯 What This Demonstrates:**

- **Embedded Memory**: No manual memory service management - automatically available in workflow state
- **Embedded Checkpoint**: Automatic state persistence without manual checkpoint service calls
- **All 13 Libraries**: Complete ecosystem integration through workflow-engine coordination
- **Consumer Simplicity**: Complex state management handled automatically, not manually
- **Production Ready**: Full observability, deployment, and debugging capabilities

## II. Integration Layer

### Enhanced Agent Architecture Usage

**Workflow Agent with Internal Steps:**

```typescript
@Agent({
  id: 'workflow-orchestration-agent',
  type: 'workflow-agent',
  capabilities: ['advanced-workflow-operations'],
  workflowConfig: {
    enableOrchestration: true,
    enableInternalCheckpointing: true,
    enableStepProgress: true,
    maxInternalRetries: 3,
  },
})
export class WorkflowOrchestrationAgent {
  @Entrypoint()
  async initialize(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Entry point with workflow orchestration initialization
    return {
      status: 'initialized',
      orchestrationContext: await this.setupOrchestrationContext(),
    };
  }

  @Task({ dependsOn: ['initialize'] })
  async processMultiModuleIntegration(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Core orchestration step integrating multiple modules
    const result = await this.workflowEngine.orchestrateModules({
      modules: ['streaming', 'multi-agent', 'memory'],
      context: context.state,
    });

    return {
      integrationResult: result,
      confidence: result.metadata.confidence,
    };
  }

  @Node({ type: 'condition' })
  async evaluateWorkflowCondition(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Decision node using workflow-specific logic
    const shouldContinueOrchestration = await this.checkWorkflowHealth(context.state);
    return {
      shouldContinueOrchestration,
      evaluationReason: 'Workflow health check',
    };
  }

  @Edge('evaluateWorkflowCondition', 'finalize', {
    condition: (state) => state.shouldContinueOrchestration,
  })
  routeToFinalize() {}

  @Task({ dependsOn: ['evaluateWorkflowCondition'] })
  async finalize(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Final orchestration processing step
    return {
      status: 'completed',
      workflowOutput: await this.generateWorkflowOutput(context.state),
    };
  }
}
```

### Cross-Module Integration Examples

**Integration with All LangGraph Modules:**

```typescript
@Injectable()
export class ComprehensiveWorkflowService {
  async createIntegratedWorkflow(): Promise<WorkflowDefinition<ComprehensiveWorkflowState>> {
    return {
      name: 'comprehensive-integrated-workflow',
      description: 'Workflow orchestrating all LangGraph modules together',
      channels: ComprehensiveWorkflowStateAnnotation,

      nodes: [
        {
          id: 'memory-retrieval',
          handler: async (state) => {
            // Memory module integration
            return await this.memoryService.retrieveContext(state);
          },
        },
        {
          id: 'streaming-processing',
          handler: async (state) => {
            // Streaming module integration
            return await this.streamingService.processWithContext(state);
          },
        },
        {
          id: 'multi-agent-coordination',
          handler: async (state) => {
            // Multi-agent module integration
            return await this.multiAgentService.coordinateAgents(state);
          },
        },
      ],

      edges: [
        { from: 'memory-retrieval', to: 'streaming-processing' },
        { from: 'streaming-processing', to: 'multi-agent-coordination' },
      ],
    };
  }
}
```

**Integration with Specific Module Combinations:**

```typescript
// Example: Streaming + Multi-Agent Integration
@Injectable()
export class StreamingMultiAgentWorkflowService {
  constructor(private readonly workflowEngine: IWorkflowEngine, private readonly streamingService: IStreamingService, private readonly multiAgentService: IMultiAgentService) {}

  async processWithStreamingAndAgents(input: WorkflowInput): Promise<WorkflowOutput> {
    // Create coordinated workflow with streaming and multi-agent capabilities
    const workflow = await this.workflowEngine.executeWorkflow({
      name: 'streaming-multi-agent-workflow',
      nodes: [
        {
          id: 'stream-coordination',
          handler: async (state) => {
            // Coordinate streaming across multiple agents
            const agents = await this.multiAgentService.getActiveAgents();
            const streams = await Promise.all(agents.map((agent) => this.streamingService.createAgentStream(agent.id, state)));
            return { coordinatedStreams: streams };
          },
        },
      ],
      edges: [],
    });

    return workflow.result;
  }
}
```

## III. Advanced Layer

### Production Configuration

```typescript
WorkflowEngineModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    // Production-grade configuration
    execution: {
      enabled: configService.get('WORKFLOW_ENGINE_ENABLED', true),
      maxConcurrentWorkflows: configService.get('WORKFLOW_MAX_CONCURRENT', 10),
      defaultTimeout: configService.get('WORKFLOW_DEFAULT_TIMEOUT', 300000),
    },

    // Performance configuration
    performance: {
      enableCaching: configService.get('WORKFLOW_ENABLE_CACHING', true),
      cacheSize: configService.get('WORKFLOW_CACHE_SIZE', 1000),
      enableParallelExecution: configService.get('WORKFLOW_PARALLEL_EXECUTION', true),
    },

    // Error handling configuration
    errorHandling: {
      enableRecovery: configService.get('WORKFLOW_ERROR_RECOVERY', true),
      maxRetries: configService.get('WORKFLOW_MAX_RETRIES', 3),
      backoffStrategy: configService.get('WORKFLOW_BACKOFF', 'exponential'),
    },

    // Enhanced agent configuration
    agentDefaults: {
      workflowConfig: {
        enableOrchestration: true,
        enableMultiModuleIntegration: true,
        enableAdvancedRouting: true,
      },
    },
  }),
  inject: [ConfigService],
});
```

### Advanced Usage Patterns

**Enterprise Workflow Integration:**

```typescript
@Injectable()
export class EnterpriseWorkflowService {
  async createEnterpriseWorkflow(): Promise<WorkflowDefinition<EnterpriseWorkflowState>> {
    return {
      name: 'enterprise-orchestration-workflow',
      description: 'Production-grade workflow engine with full enterprise features',
      channels: EnterpriseWorkflowStateAnnotation,

      nodes: [
        {
          id: 'validate-enterprise-workflow',
          handler: async (state) => {
            // Enterprise validation with compliance checks
            return await this.validateEnterpriseWorkflow(state);
          },
          config: {
            timeout: 30000,
            retry: { maxAttempts: 3, delay: 2000 },
            workflowValidation: true,
          },
        },

        {
          id: 'workflow-enterprise-processing',
          handler: async (state) => {
            // Advanced workflow orchestration with enterprise features
            return await this.processEnterpriseWorkflow(state);
          },
          config: {
            streaming: true,
            requiresApproval: true,
            approval: {
              threshold: 0.8,
              condition: (state) => state.workflowRisk > 0.7,
            },
          },
        },
      ],

      edges: [
        {
          from: 'validate-enterprise-workflow',
          to: {
            condition: (state) => {
              // Enterprise routing logic using workflow validation
              return state.workflowValidated ? 'approved-path' : 'review-path';
            },
            routes: {
              'approved-path': 'workflow-enterprise-processing',
              'review-path': 'human-review',
            },
          },
        },
      ],
    };
  }
}
```

### Performance Optimization Patterns

```typescript
@Injectable()
export class OptimizedWorkflowService {
  async optimizedWorkflowProcessing(workflows: WorkflowDefinition[]): Promise<WorkflowResult[]> {
    // Batch workflow processing for optimal performance
    const batches = this.createBatches(workflows, this.optimalBatchSize);

    const results = await Promise.allSettled(
      batches.map((batch) =>
        this.workflowEngine.processBatch(batch, {
          // Performance optimization options
          enableCaching: true,
          enableParallelExecution: true,
          enableResourcePooling: true,
        })
      )
    );

    return this.consolidateResults(results);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    // Intelligent batching logic for workflow orchestration
    return items.reduce((batches, item, index) => {
      const batchIndex = Math.floor(index / batchSize);
      if (!batches[batchIndex]) batches[batchIndex] = [];
      batches[batchIndex].push(item);
      return batches;
    }, [] as T[][]);
  }
}
```

## IV. Consumer Journey

### Learning Path Progression

**Beginner (0-30 minutes)**

1. ✅ Complete Quick Start installation
2. ✅ Run basic workflow orchestration example
3. ✅ Understand core workflow engine interfaces and module integration
4. 🎯 **Success Milestone**: Successfully orchestrate simple workflow with multiple modules

**Intermediate (30 minutes - 2 hours)**

1. ✅ Implement enhanced agent architecture (workflow agent with orchestration)
2. ✅ Configure production workflow settings
3. ✅ Integrate with specific module combinations (streaming + multi-agent)
4. 🎯 **Success Milestone**: Build multi-step workflow using full orchestration features

**Advanced (2+ hours)**

1. ✅ Implement enterprise patterns and error handling
2. ✅ Optimize workflow performance for production workloads
3. ✅ Create custom orchestration patterns and advanced integrations
4. 🎯 **Success Milestone**: Deploy production-ready system with full workflow engine capabilities

### Feature Discovery Guide

**Essential Features (Start Here)**

- Workflow orchestration with IWorkflowEngine
- Basic module integration (core + one other module)
- Simple workflow definitions
- Basic agent coordination

**Productivity Features (Next Step)**

- Enhanced agent architecture with workflow agents
- Advanced module combinations and routing
- Production configuration patterns
- Error recovery and monitoring

**Advanced Features (Power Users)**

- Custom orchestration patterns
- Enterprise compliance and workflow validation
- Advanced error recovery mechanisms
- Multi-workflow coordination

**Enterprise Features (Production)**

- High-availability workflow infrastructure
- Advanced security and audit logging
- Performance monitoring and optimization
- Scalable multi-module coordination

### Next Steps & Related Modules

**Recommended Learning Path:**

1. Master core workflow orchestration concepts
2. Explore specific module integrations (start with streaming or multi-agent)
3. Add Memory and Checkpoint modules for persistent workflows
4. Consider HITL and Platform modules for production deployments

**Common Integration Patterns:**

- **Workflow Engine + Streaming**: Real-time workflow execution with streaming updates
- **Workflow Engine + Multi-Agent**: Coordinated multi-agent workflows
- **Workflow Engine + Memory**: Context-aware workflow orchestration

## V. Reference & Troubleshooting

### Complete Interface Reference

```typescript
// Comprehensive interface documentation
interface IWorkflowEngine {
  executeWorkflow<T>(definition: WorkflowDefinition<T>): Promise<WorkflowResult<T>>;
  createAgent(config: AgentConfiguration): Promise<IAgent>;
  streamWorkflow<T>(definition: WorkflowDefinition<T>): AsyncIterable<WorkflowUpdate<T>>;
  orchestrateModules(config: ModuleOrchestrationConfig): Promise<OrchestrationResult>;
}

interface WorkflowDefinition<T> {
  name: string;
  description?: string;
  channels: StateAnnotation<T>;
  nodes: WorkflowNode<T>[];
  edges: WorkflowEdge<T>[];
  config?: WorkflowConfig;
}

interface WorkflowEngineConfig {
  enabled: boolean;
  execution: ExecutionConfig;
  integrations: IntegrationConfig;
  performance?: PerformanceConfig;
  errorHandling?: ErrorHandlingConfig;
}

// Enhanced agent architecture interfaces
interface WorkflowEngineAgentConfig extends AgentConfig {
  workflowConfig?: {
    enableOrchestration: boolean;
    enableMultiModuleIntegration: boolean;
    enableAdvancedRouting: boolean;
    enableStepProgress: boolean;
  };
}
```

### Testing Examples

```typescript
describe('WorkflowEngineService', () => {
  let service: IWorkflowEngine;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        WorkflowEngineModule.forRoot({
          // Test configuration
          execution: { maxConcurrentWorkflows: 5 },
          integrations: { enableStreaming: false },
        }),
      ],
    }).compile();

    service = module.get<IWorkflowEngine>(IWorkflowEngine);
  });

  describe('basic functionality', () => {
    it('should handle basic workflow orchestration', async () => {
      // Test basic functionality
      const result = await service.executeWorkflow({
        name: 'test-workflow',
        channels: TestStateAnnotation,
        nodes: [
          {
            id: 'test-node',
            handler: async (state) => ({ processed: true }),
          },
        ],
        edges: [],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });

  describe('enhanced agent integration', () => {
    it('should support workflow agents', async () => {
      // Test workflow agent integration
      const agent = new WorkflowOrchestrationAgent();
      const result = await agent.initialize({
        // Test context
      });

      expect(result.status).toBe('initialized');
    });
  });
});
```

### Common Issues & Solutions

#### Issue 1: Module Integration Conflicts

```typescript
// Problem: Modules conflicting during workflow orchestration
// Solution: Ensure proper module import order and configuration
WorkflowEngineModule.forRoot({
  integrations: {
    enableStreaming: true,
    enableMultiAgent: true,
    conflictResolution: 'latest-wins', // or 'merge', 'fail-fast'
  },
});
```

#### Issue 2: Workflow Performance Issues

```typescript
// Problem: Slow workflow execution with multiple modules
// Solution: Enable parallel execution and optimize batch processing
WorkflowEngineModule.forRoot({
  performance: {
    enableParallelExecution: true,
    maxConcurrentNodes: 5,
    enableCaching: true,
    cacheStrategy: 'lru',
  },
});
```

#### Issue 3: Agent Coordination Issues

```typescript
// Problem: Agents not coordinating properly in workflows
// Solution: Ensure proper agent configuration and state sharing
@Module({
  imports: [
    CoreModule.forRoot({
      /* config */
    }), // Import foundation first
    MultiAgentModule.forRoot({
      /* config */
    }), // Then coordination
    WorkflowEngineModule.forRoot({
      /* config */
    }), // Finally orchestration
  ],
})
export class CorrectWorkflowIntegration {}
```

### Environment Variables Reference

```bash
# Essential configuration
WORKFLOW_ENGINE_ENABLED=true
WORKFLOW_MAX_CONCURRENT=10

# Performance tuning
WORKFLOW_ENABLE_CACHING=true
WORKFLOW_CACHE_SIZE=1000
WORKFLOW_PARALLEL_EXECUTION=true

# Error handling
WORKFLOW_ERROR_RECOVERY=true
WORKFLOW_MAX_RETRIES=3
WORKFLOW_BACKOFF=exponential

# Enhanced agent defaults
WORKFLOW_ENABLE_ORCHESTRATION=true
WORKFLOW_ENABLE_MULTI_MODULE_INTEGRATION=true
```
