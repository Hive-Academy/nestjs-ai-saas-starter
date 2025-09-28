# Memory Module - Dual Storage Orchestration

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

### Workflow-Engine Integration

```typescript
import { WorkflowExecutionService, WorkflowDefinition } from '@hive-academy/langgraph-workflow-engine';
import { MemoryService, MemoryEntry } from '@hive-academy/langgraph-memory';

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

### Multi-Agent Integration

```typescript
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
