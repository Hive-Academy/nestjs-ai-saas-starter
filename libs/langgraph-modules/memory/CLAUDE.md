# Memory Module - Dual Storage Orchestration

## 🚀 NEW: Phase 3 & 4 Complete - IMemoryAdapter Compliance

**TASK_2025_005 Phase 3 & 4**: AgentMemoryBridgeService now fully implements IMemoryAdapter interface, providing standardized memory operations for all consuming modules (multi-agent, HITL, workflow-engine, functional-api).

### Key Changes (Phase 3 & 4)

1. **AgentMemoryBridgeService** implements `IMemoryAdapter` interface with 9 wrapper methods
2. **MemoryService** refactored - removed IAgentMemoryService duplication (283 lines), now pure generic facade
3. **MemoryModule** provides global `'IMemoryAdapter'` token via AgentMemoryBridgeService
4. **Architecture**: Clear separation between generic facade (MemoryService) and agent-specific operations (AgentMemoryBridgeService)

### IMemoryAdapter Interface Compliance

AgentMemoryBridgeService implements all 9 required methods:

```typescript
// Core memory retrieval and storage
async getAgentContext(state: AgentState): Promise<AgentMemoryContext>
async storeAgentExecution(state: AgentState, result: Partial<AgentState>, agentId: string): Promise<void>
async storeConversationTurn(threadId: string, humanMessage: string, aiMessage: string, metadata?: Record<string, unknown>): Promise<void>

// LangGraph Store access
getStore(collection?: string): Store

// Generic search and storage
async search(options: { query: string; threadId?: string; userId?: string; agentId?: string; limit?: number; namespace?: string[]; minRelevance?: number; }): Promise<any[]>
async store(threadId: string, content: string, metadata?: Record<string, unknown>): Promise<string>
async storeBatch(threadId: string, entries: Array<{ content: string; metadata?: Record<string, unknown>; }>): Promise<string[]>

// User patterns and health
async getUserPatterns(userId: string, limitDays?: number): Promise<UserMemoryPatterns>
async isHealthy(): Promise<boolean>
```

### Dependency Injection Pattern

```typescript
// Consuming modules inject IMemoryAdapter
@Injectable()
export class NodeFactoryService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  // Memory adapter automatically available if MemoryModule imported
}
```

## ✅ VERIFIED ECOSYSTEM INTEGRATION PATTERNS

**Evidence-Based Documentation**: The following integration patterns are verified through direct source code inspection across all modules that import from `@hive-academy/langgraph-memory`.

### Real Module Integration Table

| Module              | Import Pattern   | Usage Type                         | Integration Service           | Dependency            |
| ------------------- | ---------------- | ---------------------------------- | ----------------------------- | --------------------- |
| **Multi-Agent**     | `IMemoryAdapter` | `@Optional()` graceful degradation | `NodeFactoryService`          | Optional              |
| **Workflow-Engine** | `IMemoryAdapter` | `@Optional()` capability detection | `WorkflowGraphBuilderService` | Optional              |
| **HITL**            | `IMemoryAdapter` | `@Inject()` learning system        | `HitlMemoryLearningService`   | Required for learning |
| **Functional-API**  | `IMemoryAdapter` | `@Optional()` workflow enhancement | `FunctionalWorkflowService`   | Optional              |

### 🔑 Integration Architecture

**Key Discovery**: Memory is NOT a standalone service in the ecosystem—it's an **adapter-based enhancement system** that other modules optionally inject.

```typescript
// VERIFIED PATTERN 1: Multi-Agent Memory Enhancement
// Source: libs/langgraph-modules/multi-agent/src/lib/services/node-factory.service.ts
@Injectable()
export class NodeFactoryService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  private async enhanceAgentWithMemory(agent: AgentDefinition, state: AgentState, agentExecution: () => Promise<Partial<AgentState>>): Promise<Partial<AgentState>> {
    // 1. Retrieve memory context BEFORE agent execution
    if (this.memoryAdapter) {
      const memoryContext = await this.memoryAdapter.getAgentContext(state);
      enhancedState = {
        ...state,
        metadata: {
          ...state.metadata,
          memoryContext: {
            threadMemories: memoryContext.threadMemories.slice(0, 5),
            userMemories: memoryContext.userMemories.slice(0, 3),
          },
        },
      };
    }

    // 2. Execute agent with enhanced state
    const result = await agentExecution();

    // 3. Store agent execution result in memory
    if (this.memoryAdapter && result) {
      await this.memoryAdapter.storeAgentExecution(state, result, agent.id);
    }

    return result;
  }
}
```

```typescript
// VERIFIED PATTERN 2: HITL Memory Learning
// Source: libs/langgraph-modules/hitl/src/lib/services/hitl-memory-learning.service.ts
@Injectable()
export class HitlMemoryLearningService implements IHitlMemoryLearningService {
  constructor(
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter: IMemoryAdapter
  ) {}

  async learnFromHumanFeedback(request: HumanApprovalRequest, response: HumanApprovalResponse): Promise<void> {
    if (!this.memoryAdapter) return;

    const learningThreadId = `hitl-learning-${request.executionId}`;

    // Store rich feedback memory with metadata for learning
    await this.memoryAdapter.store(learningThreadId, JSON.stringify(feedbackMemory), {
      type: 'human_feedback',
      subtype: 'approval_decision',
      decision: response.decision,
      confidence: request.confidence.current,
      importance: this.calculateFeedbackImportance(request, response),
      // ... rich metadata for pattern recognition
    });
  }
}
```

```typescript
// VERIFIED PATTERN 3: Workflow-Engine Memory Enhancement
// Source: libs/langgraph-modules/workflow-engine/src/lib/core/workflow-graph-builder.service.ts
@Injectable()
export class WorkflowGraphBuilderService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  async buildFromDefinition<TState extends WorkflowState>(definition: WorkflowDefinition<TState>, options: GraphBuilderOptions = {}): Promise<StateGraph<TState>> {
    // Apply optimization patterns if memory adapter is available
    const optimizedOptions = await this.graphOptimization.enhanceWithOptimizationPatterns(definition, options);
    // Memory-aware graph compilation...
  }
}
```

```typescript
// VERIFIED PATTERN 4: Functional-API Memory Integration
// Source: libs/langgraph-modules/functional-api/src/lib/services/functional-workflow.service.ts
@Injectable()
export class FunctionalWorkflowService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  async executeWorkflow<TState>(workflowName: string, options: WorkflowExecutionOptions = {}): Promise<WorkflowExecutionResult<TState>> {
    // Memory adapter optionally enhances workflow execution
    // with context retrieval and result storage
  }
}
```

## Real API Surface (Source Code Verified)

**Evidence-Based Documentation**: The following exports are verified through direct source code inspection.

### Core Service Exports

```typescript
// NestJS Module
export { MemoryModule } from '@hive-academy/langgraph-memory';

// Core Services (Facade Pattern)
export { MemoryService } from '@hive-academy/langgraph-memory'; // Main orchestrator
export { MemoryStorageService } from '@hive-academy/langgraph-memory'; // Vector operations (ChromaDB)
export { MemoryGraphService } from '@hive-academy/langgraph-memory'; // Graph operations (Neo4j)
```

### Interface Exports (Type-only)

```typescript
// Core Memory Types
export type { MemoryEntry, MemoryMetadata, MemorySearchOptions, MemorySummarizationOptions, MemoryConfig, MemoryRetentionPolicy, MemoryStats, MemoryServiceInterface, MemoryOperationMetrics, SerializableValue, SerializableArray, SerializableObject, MetadataValue } from '@hive-academy/langgraph-memory';

// Configuration Types
export type { MemoryModuleOptions, MemoryModuleAsyncOptions, MemoryOptionsFactory } from '@hive-academy/langgraph-memory';

// Adapter Pattern Interfaces
export { IVectorService } from '@hive-academy/langgraph-memory';
export { IGraphService } from '@hive-academy/langgraph-memory';

// Vector Service Types
export type { VectorStoreData, VectorSearchQuery, VectorSearchResult, VectorStats, VectorGetOptions, VectorGetResult } from '@hive-academy/langgraph-memory';

// Graph Service Types
export type { GraphNodeData, GraphRelationshipData, TraversalSpec, GraphTraversalResult, GraphQueryResult, GraphStats, GraphOperation, GraphBatchResult, GraphFindCriteria, GraphNode, GraphRelationship, GraphPath } from '@hive-academy/langgraph-memory';
```

### Enhanced Memory Adapters (New)

```typescript
// Memory Adapter Extensions
export { ExtendedMemoryAdapter, MemoryManagerAdapter, MemoryAdapterFactory } from '@hive-academy/langgraph-memory';

// Core Re-exports
export { IMemoryAdapter, isMemoryAdapter } from '@hive-academy/langgraph-memory';

export type { AgentState, AgentMemoryContext, UserMemoryPatterns, Store } from '@hive-academy/langgraph-memory';
```

### LangGraph Store Integration (2025 Compliance)

```typescript
// LangGraph Store Interface
export type { Item, Store as MemoryStore } from '@hive-academy/langgraph-memory';

export { ChromaLangGraphStore, LangGraphStoreFactory, NamespaceUtils, isValidItem } from '@hive-academy/langgraph-memory';
```

### Agent Integration Types

```typescript
// Agent Memory Interfaces
export type { IAgentMemoryService, AgentMemory, AgentMemoryConfig, AgentMemoryStats, IAgentMemoryBridge } from '@hive-academy/langgraph-memory';
```

### Error Handling

```typescript
// Memory-specific Error Types
export { MemoryException, MemoryNotFoundException, MemoryStorageException, MemoryValidationException, MemoryQuotaExceededException, MemoryConfigurationException, extractErrorMessage, wrapMemoryError } from '@hive-academy/langgraph-memory';

// Vector Service Errors
export { InvalidCollectionError, InvalidInputError, VectorOperationError } from '@hive-academy/langgraph-memory';

// Graph Service Errors
export { InvalidNodeError, InvalidInputError as GraphInvalidInputError, SecurityError, GraphOperationError, TransactionError } from '@hive-academy/langgraph-memory';
```

### Constants and Configuration

```typescript
// Configuration Constants
export { MEMORY_CONFIG, MEMORY_SERVICE, DEFAULT_MEMORY_CONFIG, MEMORY_TYPES, EVICTION_STRATEGIES, SUMMARIZATION_STRATEGIES, DEFAULT_AGENTIC_CONFIG, DEFAULT_RAG_CONFIG, DEFAULT_AGENT_MEMORY_CONFIG, DEFAULT_STORE_CONFIG } from '@hive-academy/langgraph-memory';

// Validation Schemas
export { MemoryEntrySchema, MemorySearchOptionsSchema } from '@hive-academy/langgraph-memory';
```

## Architecture Pattern: Dual Storage Coordination

**Real Implementation Pattern (from source code analysis)**:

```typescript
// MemoryService orchestrates both vector and graph storage
@Injectable()
export class MemoryService implements MemoryServiceInterface {
  constructor(
    private readonly storageService: MemoryStorageService, // ChromaDB operations
    private readonly graphService: MemoryGraphService // Neo4j operations
  ) {}

  async storeEntry(entry: MemoryEntry): Promise<void> {
    // Coordinate both vector and graph storage
    await Promise.all([
      this.storageService.store(entry), // Vector storage (ChromaDB)
      this.graphService.createNode(entry), // Graph storage (Neo4j)
    ]);
  }
}
```

## Quick Start (Real Configuration)

### Installation & Setup

```bash
npm install @hive-academy/langgraph-memory
```

### Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { MemoryModule, MemoryModuleOptions, DEFAULT_MEMORY_CONFIG, EVICTION_STRATEGIES } from '@hive-academy/langgraph-memory';

@Module({
  imports: [
    MemoryModule.forRoot({
      // Vector service adapter (consumer must implement)
      vectorService: ChromaDBAdapter, // implements IVectorService
      // Graph service adapter (consumer must implement)
      graphService: Neo4jAdapter, // implements IGraphService

      // Memory configuration (actual interface)
      config: {
        collection: 'memory_store',
        enableAutoSummarization: true,
        summarization: {
          maxMessages: 20,
          strategy: 'balanced',
        },
        retention: {
          maxEntries: 10000,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          evictionStrategy: EVICTION_STRATEGIES.LRU,
        },
      } satisfies MemoryConfig,
    } satisfies MemoryModuleOptions),
  ],
})
export class AppModule {}
```

### Adapter Implementation Requirements

```typescript
// Consumer must implement these adapters
import { IVectorService, IGraphService } from '@hive-academy/langgraph-memory';

@Injectable()
export class ChromaDBAdapter implements IVectorService {
  async store(data: VectorStoreData): Promise<void> {
    // Implementation using ChromaDB
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult> {
    // Implementation using ChromaDB
  }

  async get(options: VectorGetOptions): Promise<VectorGetResult> {
    // Implementation using ChromaDB
  }

  async delete(ids: string[]): Promise<void> {
    // Implementation using ChromaDB
  }

  async getStats(): Promise<VectorStats> {
    // Implementation using ChromaDB
  }
}

@Injectable()
export class Neo4jAdapter implements IGraphService {
  async createNode(data: GraphNodeData): Promise<GraphNode> {
    // Implementation using Neo4j
  }

  async createRelationship(data: GraphRelationshipData): Promise<GraphRelationship> {
    // Implementation using Neo4j
  }

  async traverse(spec: TraversalSpec): Promise<GraphTraversalResult> {
    // Implementation using Neo4j
  }

  async query(cypher: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    // Implementation using Neo4j
  }

  async getStats(): Promise<GraphStats> {
    // Implementation using Neo4j
  }
}
```

## Real Usage Patterns

### Basic Memory Operations

```typescript
import { MemoryService, MemoryEntry, MemorySearchOptions, MemoryMetadata } from '@hive-academy/langgraph-memory';

@Injectable()
export class ApplicationMemoryService {
  constructor(private readonly memory: MemoryService) {}

  async storeUserInteraction(userId: string, content: string): Promise<void> {
    const memoryEntry: MemoryEntry = {
      content,
      metadata: {
        type: 'conversation',
        importance: 0.7,
        tags: ['user-interaction'],
        userId,
        timestamp: new Date(),
      } as MemoryMetadata,
    };

    await this.memory.storeEntry(memoryEntry);
  }

  async findRelevantMemories(query: string, userId: string): Promise<any> {
    const searchOptions: MemorySearchOptions = {
      query,
      userId,
      limit: 10,
      threshold: 0.6,
      includeMetadata: true,
    };

    return await this.memory.search(searchOptions);
  }
}
```

### 🚀 Real Multi-Agent Memory Enhancement

**VERIFIED INTEGRATION**: Multi-agent module uses memory adapter to enhance agent execution

```typescript
// Multi-Agent uses IMemoryAdapter, NOT MemoryService
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';

@Module({
  imports: [
    MemoryModule.forRoot({
      vectorService: ChromaDBAdapter,
      graphService: Neo4jAdapter,
      config: { collection: 'agent-memory' },
    }),
    MultiAgentModule.forRootAsync({
      useFactory: async (memoryAdapter: IMemoryAdapter) => ({
        // Memory adapter auto-injected and used to enhance agents
        memoryAdapter, // Optional enhancement
      }),
      inject: ['IMemoryAdapter'], // Provided by MemoryModule
    }),
  ],
})
export class AppModule {}

// Real usage: Memory automatically enhances agent execution
@Agent({ id: 'memory-enhanced-agent' })
export class MemoryEnhancedAgent {
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    // Memory context automatically added to state.metadata.memoryContext
    // by NodeFactoryService before this executes
    const relevantMemories = state.metadata?.memoryContext?.threadMemories || [];

    // Use memory context in agent processing
    const response = await this.processWithMemory(state.messages, relevantMemories);

    // Result automatically stored in memory by NodeFactoryService after execution
    return {
      messages: [new AIMessage(response)],
      metadata: { ...state.metadata, memoryEnhanced: true },
    };
  }
}
```

### 🎯 Real HITL Memory Learning

**VERIFIED INTEGRATION**: HITL module uses memory for learning from human feedback

```typescript
import { HumanApprovalService } from '@hive-academy/langgraph-hitl';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';

@Module({
  imports: [
    MemoryModule.forRoot({
      vectorService: ChromaDBAdapter,
      graphService: Neo4jAdapter,
      config: { collection: 'hitl-learning' },
    }),
    HitlModule.forRoot({
      // Memory adapter auto-injected for learning
    }),
  ],
})
export class AppModule {}

// Real usage: HITL automatically stores approval patterns in memory
@Injectable()
export class ApprovalWorkflowService {
  constructor(private readonly hitl: HumanApprovalService) {}

  async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    const approvalId = await this.hitl.requestApproval('exec-123', {
      message: 'Deploy to production?',
      confidence: { current: 0.7, threshold: 0.8 },
      // ... other approval data
    });

    // When human responds, HITL automatically stores learning in memory:
    // - Approval decision (approved/rejected)
    // - Confidence gap (system confidence vs human decision)
    // - Response time patterns
    // - Approver experience level
    // - Contextual factors for future pattern recognition

    return await this.hitl.processApprovalResponse(approvalId, response);
  }
}
```

### 🛠️ Real Workflow-Engine Memory Integration

**VERIFIED INTEGRATION**: Workflow-engine optionally uses memory for workflow enhancement

```typescript
import { WorkflowExecutionService, WorkflowDefinition } from '@hive-academy/langgraph-workflow-engine';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';

@Injectable()
export class MemoryAwareWorkflowService {
  constructor(private readonly workflowExecution: WorkflowExecutionService, private readonly memory: MemoryService) {}

  async createMemoryAwareWorkflow(): Promise<WorkflowDefinition> {
    return {
      name: 'memory-aware-customer-service',
      description: 'Customer service workflow with memory integration',

      nodes: [
        {
          id: 'retrieve_customer_context',
          handler: async (state) => {
            const searchOptions: MemorySearchOptions = {
              query: state.input.message,
              userId: `customer-${state.input.customerId}`,
              limit: 5,
              threshold: 0.6,
            };

            const customerContext = await this.memory.search(searchOptions);

            return {
              ...state,
              customerContext,
            };
          },
        },

        {
          id: 'store_interaction',
          handler: async (state) => {
            const interactionEntry: MemoryEntry = {
              content: state.response,
              metadata: {
                type: 'customer-interaction',
                importance: 0.8,
                tags: ['customer-service', 'resolution'],
                userId: `customer-${state.input.customerId}`,
                timestamp: new Date(),
              },
            };

            await this.memory.storeEntry(interactionEntry);

            return state;
          },
        },
      ],

      edges: [{ from: 'retrieve_customer_context', to: 'store_interaction' }],
    };
  }
}
```

### 📊 Real Functional-API Memory Integration

**VERIFIED INTEGRATION**: Functional-API optionally uses memory for workflow context

```typescript
import { FunctionalWorkflowService } from '@hive-academy/langgraph-functional-api';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';

@Module({
  imports: [
    MemoryModule.forRoot({
      vectorService: ChromaDBAdapter,
      graphService: Neo4jAdapter,
      config: { collection: 'workflow-memory' },
    }),
    FunctionalApiModule.forRoot({
      // Memory adapter optionally enhances workflows
    }),
  ],
})
export class AppModule {}

// Real usage: Functional workflows optionally use memory
@Workflow({ name: 'memory-aware-workflow' })
export class MemoryAwareWorkflow {
  @Entrypoint()
  async initialize(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Memory adapter available in context if provided
    return {
      state: { initialized: true },
    };
  }

  @Task({ dependsOn: ['initialize'] })
  async process(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    // Memory enhancement happens automatically if adapter available
    return {
      state: { processed: true },
    };
  }
}
```

### 🔗 Complete Ecosystem Integration Example

**Real production example combining all verified integrations:**

```typescript
import { Module } from '@nestjs/common';
import { MemoryModule } from '@hive-academy/langgraph-memory';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';

@Module({
  imports: [
    // 1. Memory Module provides IMemoryAdapter
    MemoryModule.forRoot({
      vectorService: ChromaDBAdapter,
      graphService: Neo4jAdapter,
      config: {
        collection: 'ecosystem-memory',
        enableAutoSummarization: true,
        retention: { maxAge: 7 * 24 * 60 * 60 * 1000 },
      },
    }),

    // 2. Multi-Agent injects memory for agent enhancement
    MultiAgentModule.forRootAsync({
      useFactory: async (memoryAdapter: IMemoryAdapter) => ({
        memoryAdapter, // Agents auto-enhanced with memory
      }),
      inject: ['IMemoryAdapter'],
    }),

    // 3. HITL uses memory for learning
    HitlModule.forRoot({
      // Memory adapter auto-injected for approval learning
      confidenceThreshold: 0.8,
    }),

    // 4. Workflow-Engine uses memory for optimization
    WorkflowEngineModule.forRoot({
      // Memory adapter auto-injected for workflow enhancement
      execution: { maxConcurrentWorkflows: 10 },
    }),

    // 5. Functional-API uses memory for context
    FunctionalApiModule.forRoot({
      // Memory adapter auto-injected for workflow context
      enableCheckpointing: true,
    }),
  ],
})
export class ProductionEcosystemModule {}

// Real usage: All modules automatically benefit from shared memory
@Injectable()
export class ProductionWorkflowService {
  constructor(private readonly multiAgent: MultiAgentCoordinatorService, private readonly hitl: HumanApprovalService, private readonly functionalWorkflow: FunctionalWorkflowService) {}

  async executeIntelligentWorkflow(input: any): Promise<any> {
    // 1. Multi-agent automatically uses memory for context
    const agentResult = await this.multiAgent.executeSimpleWorkflow('agent-network', input.message);

    // 2. HITL automatically learns from approval patterns
    if (agentResult.confidence < 0.8) {
      const approval = await this.hitl.requestApproval('exec-123', {
        message: 'Approve agent result?',
        confidence: { current: agentResult.confidence, threshold: 0.8 },
      });
      // Approval patterns automatically stored in memory for learning
    }

    // 3. Functional workflow automatically enhanced with memory
    return await this.functionalWorkflow.executeWorkflow('MemoryAwareWorkflow', { initialState: { agentResult } });
  }
}
```

### Previous Example (Not Accurate)

```typescript
// ❌ OLD EXAMPLE (NOT VERIFIED): Multi-agent using MemoryService directly
import { MultiAgentCoordinatorService, AgentDefinition } from '@hive-academy/langgraph-multi-agent';
import { MemoryService, ExtendedMemoryAdapter, MemoryEntry, MemorySearchOptions } from '@hive-academy/langgraph-memory';

@Injectable()
export class SharedMemoryAgentSystem {
  constructor(private readonly multiAgent: MultiAgentCoordinatorService, private readonly sharedMemory: MemoryService) {}

  async createMemoryAwareAgentNetwork(): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [
      {
        id: 'analyzer-agent',
        type: 'analyzer',
        capabilities: ['text-analysis', 'pattern-recognition'],
        memoryConfig: {
          sharedMemory: true,
          privateMemory: false,
        },
      },
      {
        id: 'synthesizer-agent',
        type: 'synthesizer',
        capabilities: ['content-generation', 'summarization'],
        memoryConfig: {
          sharedMemory: true,
          privateMemory: true,
        },
      },
    ];

    const sharedAdapter = new ExtendedMemoryAdapter({
      enableSharedAccess: true,
      enableCrossAgentLearning: true,
      memoryService: this.sharedMemory,
    });

    await this.multiAgent.registerAgents(agents, {
      sharedMemoryAdapter: sharedAdapter,
      enableCollectiveIntelligence: true,
    });

    return agents;
  }

  async coordinateWithSharedMemory(task: string): Promise<any> {
    const contextSearch: MemorySearchOptions = {
      query: task,
      includeMetadata: true,
      crossAgentMemory: true,
      limit: 20,
    };

    const collectiveContext = await this.sharedMemory.search(contextSearch);

    const result = await this.multiAgent.coordinate({
      task,
      context: collectiveContext,
      enableMemorySharing: true,
    });

    const coordinationEntry: MemoryEntry = {
      content: JSON.stringify(result),
      metadata: {
        type: 'agent-coordination',
        importance: 0.9,
        tags: ['multi-agent', 'coordination'],
        agentsInvolved: result.agentsUsed,
        timestamp: new Date(),
      },
    };

    await this.sharedMemory.storeEntry(coordinationEntry);

    return result;
  }
}
```

### LangGraph Store Integration (2025 Compliance)

```typescript
import { ChromaLangGraphStore, Item, MemoryStore, isValidItem } from '@hive-academy/langgraph-memory';

@Injectable()
export class LangGraphStoreService {
  constructor(private readonly chromaStore: ChromaLangGraphStore) {}

  async storeLangGraphItem(namespace: string, item: Item): Promise<void> {
    if (!isValidItem(item)) {
      throw new Error('Invalid LangGraph item format');
    }

    await this.chromaStore.put(namespace, item);
  }

  async searchLangGraphStore(namespace: string, query: any): Promise<Item[]> {
    return await this.chromaStore.search(namespace, query);
  }
}
```

## Testing (Real Integration)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MemoryModule, MemoryService, MemoryEntry, MemorySearchOptions } from '@hive-academy/langgraph-memory';

describe('Memory Module Integration', () => {
  let memoryService: MemoryService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        MemoryModule.forRoot({
          vectorService: MockVectorService,
          graphService: MockGraphService,
          config: {
            collection: 'test-memory',
            enableAutoSummarization: false,
          },
        }),
      ],
    }).compile();

    memoryService = module.get<MemoryService>(MemoryService);
  });

  it('should store and retrieve memory entries', async () => {
    const entry: MemoryEntry = {
      content: 'Test memory content',
      metadata: {
        type: 'test',
        importance: 0.5,
        tags: ['unit-test'],
        timestamp: new Date(),
      },
    };

    await memoryService.storeEntry(entry);

    const searchOptions: MemorySearchOptions = {
      query: 'Test memory',
      limit: 5,
      threshold: 0.3,
    };

    const results = await memoryService.search(searchOptions);

    expect(results).toBeDefined();
    expect(results.results).toHaveLength(1);
    expect(results.results[0].content).toBe('Test memory content');
  });
});
```

## Configuration Reference

```typescript
interface MemoryModuleOptions {
  vectorService: Type<IVectorService>;
  graphService: Type<IGraphService>;
  config: MemoryConfig;
}

interface MemoryConfig {
  collection: string;
  enableAutoSummarization?: boolean;
  summarization?: MemorySummarizationOptions;
  retention?: MemoryRetentionPolicy;
}

interface MemoryEntry {
  content: string;
  metadata: MemoryMetadata;
}

interface MemoryMetadata {
  type: string;
  importance: number;
  tags: string[];
  userId?: string;
  timestamp: Date;
  [key: string]: SerializableValue;
}

interface MemorySearchOptions {
  query: string;
  userId?: string;
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  crossAgentMemory?: boolean;
}
```

## Navigation

- **Foundation**: [Core](../core/CLAUDE.md)
- **Database Integration**: [ChromaDB](../../nestjs-chromadb/CLAUDE.md) | [Neo4j](../../nestjs-neo4j/CLAUDE.md)
- **Orchestration**: [Workflow-Engine](../workflow-engine/CLAUDE.md) | [Streaming](../streaming/CLAUDE.md)
- **Agent Systems**: [Multi-Agent](../multi-agent/CLAUDE.md) | [HITL](../hitl/CLAUDE.md)
- **Production**: [Monitoring](../monitoring/CLAUDE.md) | [Platform](../platform/CLAUDE.md) | [Checkpoint](../checkpoint/CLAUDE.md)
