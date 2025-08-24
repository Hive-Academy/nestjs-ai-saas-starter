# CLAUDE.md - Memory Module

This file provides guidance to Claude Code when working with the LangGraph Memory Module, which provides contextual memory capabilities for AI agents and applications.

## Business Domain: Contextual Memory for AI Agents

### Core Purpose

The Memory Module provides sophisticated contextual memory capabilities for AI agents, enabling them to:

- Maintain conversation history and context across sessions
- Perform semantic search over past interactions
- Automatically summarize long conversations
- Store and retrieve user preferences and facts
- Build episodic and semantic memory patterns
- Enable human-like memory retention and recall

### Memory Types

- **Conversational Memory**: Direct conversation turns and exchanges
- **Summary Memory**: Condensed representations of conversation blocks
- **Fact Memory**: Extracted factual information and entity relationships
- **Context Memory**: Environmental and situational context
- **Preference Memory**: User preferences, settings, and behavioral patterns
- **Custom Memory**: Application-specific memory types

### Use Cases

- **Chatbots & Virtual Assistants**: Maintaining context across long conversations
- **Personal AI Assistants**: Learning user preferences and patterns
- **Customer Support**: Tracking customer history and interactions
- **Educational AI**: Adapting to learner progress and preferences
- **Content Recommendation**: Building user profile memories
- **Multi-session Applications**: Preserving state across application restarts

## Architecture: Hybrid Vector-Graph Memory System

### Facade Pattern Implementation

The Memory Module uses the Facade pattern to provide a unified interface over multiple storage backends:

```typescript
// Primary facade service
MemoryFacadeService
├── MemoryCoreService        // Core CRUD operations
├── SemanticSearchService    // Vector-based similarity search
├── SummarizationService     // LLM-based summarization
└── MemoryHealthService      // Health monitoring

// Storage backends
ChromaDB (Vector Store)      // Semantic search & embeddings
Neo4j (Graph Database)       // Relationships & entity modeling
```

### Storage Architecture

- **ChromaDB Integration**: Vector embeddings for semantic similarity
- **Neo4j Integration**: Graph relationships between memories and entities
- **Hybrid Approach**: Combines vector search with graph traversal
- **Collection Strategy**: Single collection with metadata-based filtering

### Service Layer Design

```typescript
// Core services follow SOLID principles
interface MemoryServiceInterface {
  store(threadId: string, content: string, metadata?: Partial<MemoryMetadata>): Promise<MemoryEntry>;
  retrieve(threadId: string, limit?: number): Promise<readonly MemoryEntry[]>;
  search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]>;
  summarize(threadId: string, messages: readonly BaseMessage[], options?: MemorySummarizationOptions): Promise<string>;
  delete(threadId: string, memoryIds?: readonly string[]): Promise<number>;
  clear(threadId: string): Promise<void>;
  getStats(): Promise<MemoryStats>;
  cleanup(): Promise<number>;
}
```

## Memory Entry Lifecycle

### Creation Flow

1. **Input Validation**: Content and metadata validation using Zod schemas
2. **Embedding Generation**: Create vector embeddings for semantic search
3. **Vector Storage**: Store in ChromaDB with metadata and embedding
4. **Graph Storage**: Store relationships and entities in Neo4j
5. **Indexing**: Update search indices and relationship mappings

### Retrieval Patterns

```typescript
// Sequential retrieval (conversation order)
const conversationHistory = await memoryFacade.retrieve(threadId, 50);

// Semantic search (similarity-based)
const relevantMemories = await memoryFacade.search({
  query: 'user preferences about coffee',
  threadIds: [threadId],
  types: ['preference', 'fact'],
  minRelevance: 0.7,
  limit: 10,
});

// Graph-based retrieval (relationship traversal)
const relatedEntities = await semanticSearch.findRelatedEntities(entityId);
```

### Memory Aging and Lifecycle

- **Access Tracking**: Updates `lastAccessedAt` and `accessCount` on retrieval
- **Importance Scoring**: Automatic importance calculation based on access patterns
- **Retention Policies**: Configurable cleanup based on age, access frequency, and importance
- **Summarization Triggers**: Automatic summarization when memory exceeds thresholds

## Memory Patterns and Strategies

### Episodic Memory Pattern

Captures specific events and experiences in temporal sequence:

```typescript
await memoryFacade.store(threadId, 'User mentioned they prefer morning coffee at 8 AM', {
  type: 'fact',
  importance: 0.8,
  tags: ['preference', 'routine', 'coffee'],
  source: 'conversation',
});
```

### Semantic Memory Pattern

Stores factual knowledge and relationships:

```typescript
// Store factual information
await memoryFacade.store(threadId, 'User works as a software engineer at TechCorp', {
  type: 'fact',
  importance: 0.9,
  tags: ['personal', 'work', 'identity'],
  persistent: true,
});
```

### Working Memory Pattern

Maintains short-term context for current conversation:

```typescript
// Recent conversation context (auto-summarized when full)
const workingMemory = await memoryFacade.retrieve(threadId, 20);
```

### Memory Consolidation Pattern

Progressive summarization to manage memory size:

```typescript
const summary = await memoryFacade.summarize(threadId, messages, {
  strategy: 'progressive',
  maxMessages: 50,
  preserveImportant: true,
});
```

## Key Services Deep Dive

### MemoryFacadeService

Primary interface for all memory operations:

- **Orchestrates** ChromaDB and Neo4j operations
- **Provides** unified API for memory management
- **Handles** error normalization and logging
- **Manages** memory lifecycle and cleanup

Key Methods:

```typescript
// High-level storage with automatic embedding
async store(threadId: string, content: string, metadata?: Partial<MemoryMetadata>): Promise<MemoryEntry>

// Advanced search with multiple filter options
async search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]>

// Intelligent summarization with configurable strategies
async summarize(threadId: string, messages: readonly BaseMessage[], options?: MemorySummarizationOptions): Promise<string>
```

### SemanticSearchService

Advanced search capabilities with semantic understanding:

- **Vector Similarity**: ChromaDB-based semantic search
- **Entity Recognition**: Extract and track entities across memories
- **Relationship Discovery**: Find connections between memories
- **Contextual Ranking**: Importance and recency-based scoring

Search Patterns:

```typescript
// Semantic similarity search
const similarMemories = await semanticSearch.searchSimilar(query, {
  threshold: 0.75,
  limit: 10,
});

// Entity-based search
const entityMemories = await semanticSearch.findMemoriesWithEntity('TechCorp');

// Temporal context search
const recentContext = await semanticSearch.getTemporalContext(threadId, timeWindow);
```

### SummarizationService

LLM-powered conversation summarization:

- **Progressive Strategy**: Incrementally summarize conversation blocks
- **Batch Strategy**: Summarize entire conversation threads
- **Sliding Window**: Maintain fixed-size context windows
- **Importance Preservation**: Retain high-importance memories during summarization

Summarization Strategies:

```typescript
// Progressive summarization (recommended for long conversations)
await summarization.progressiveSummarize(threadId, {
  maxMessages: 50,
  preserveImportant: true,
  compressionRatio: 0.3,
});

// Sliding window (for real-time applications)
await summarization.slidingWindowSummarize(threadId, {
  windowSize: 20,
  overlap: 5,
});
```

## Memory Retention Policies and Cleanup

### Retention Policy Configuration

```typescript
const retentionPolicy: MemoryRetentionPolicy = {
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  maxPerThread: 1000, // 1000 memories per thread
  maxTotal: 100000, // 100k total memories
  cleanupInterval: 24 * 60 * 60 * 1000, // Daily cleanup
  evictionStrategy: 'importance', // Keep important memories
};
```

### Cleanup Strategies

- **LRU (Least Recently Used)**: Remove oldest accessed memories
- **LFU (Least Frequently Used)**: Remove least accessed memories
- **FIFO (First In, First Out)**: Remove oldest created memories
- **Importance-Based**: Remove low-importance memories first

### Memory Pruning Process

1. **Identify Candidates**: Find memories eligible for removal
2. **Importance Calculation**: Score memories based on access patterns
3. **Summarization**: Create summaries before deletion when applicable
4. **Cleanup Execution**: Remove memories and update indices
5. **Relationship Updates**: Clean up orphaned graph relationships

## Performance Optimization

### Caching Strategies

- **In-Memory Cache**: Recently accessed memories cached locally
- **Embedding Cache**: Cache generated embeddings to avoid regeneration
- **Search Result Cache**: Cache frequent search patterns
- **Relationship Cache**: Cache Neo4j relationship queries

### Indexing Strategies

```typescript
// ChromaDB indexing for semantic search
await chromaDB.createIndex('memory-entries', {
  vectorIndex: 'hnsw',
  metadataIndex: ['threadId', 'type', 'importance', 'createdAt'],
});

// Neo4j indexing for relationship queries
await neo4j.createIndex('Memory', ['threadId', 'type']);
await neo4j.createConstraint('Memory', 'id', 'UNIQUE');
```

### Batch Operations

```typescript
// Batch memory storage for efficiency
await memoryFacade.storeBatch(threadId, [
  { content: 'First memory', metadata: { type: 'conversation' } },
  { content: 'Second memory', metadata: { type: 'fact' } },
]);
```

### Memory Size Optimization

- **Content Compression**: Compress large memory content
- **Embedding Quantization**: Reduce embedding precision for storage
- **Metadata Optimization**: Minimize metadata overhead
- **Lazy Loading**: Load embeddings only when needed

## Integration with LangGraph Workflows

### Memory-Aware Workflow Nodes

```typescript
@Node('memory-enhanced-response')
async generateResponse(state: WorkflowState): Promise<WorkflowState> {
  // Retrieve relevant context
  const context = await this.memoryFacade.search({
    query: state.userMessage,
    threadIds: [state.threadId],
    limit: 5
  });

  // Generate response with memory context
  const response = await this.llm.invoke({
    messages: [
      ...context.map(m => new HumanMessage(m.content)),
      new HumanMessage(state.userMessage)
    ]
  });

  // Store the interaction
  await this.memoryFacade.store(state.threadId, state.userMessage, {
    type: 'conversation',
    importance: 0.7
  });

  return { ...state, response: response.content };
}
```

### Memory-Driven Workflow Decisions

```typescript
@Edge('check-user-context')
async routeBasedOnMemory(state: WorkflowState): Promise<string> {
  const userPatterns = await this.memoryFacade.search({
    threadIds: [state.threadId],
    types: ['preference'],
    tags: ['interaction-style']
  });

  return userPatterns.length > 0 ? 'personalized-response' : 'generic-response';
}
```

### Context Window Management

```typescript
// Automatic context window management in workflows
@Node('context-aware-processing')
async manageContext(state: WorkflowState): Promise<WorkflowState> {
  const contextWindow = await this.memoryFacade.retrieve(state.threadId, 20);

  if (contextWindow.length >= 20) {
    // Trigger summarization to maintain context window
    await this.memoryFacade.summarize(state.threadId, contextWindow, {
      strategy: 'sliding-window',
      preserveImportant: true
    });
  }

  return state;
}
```

## Privacy and Data Retention

### Data Protection Patterns

- **User Consent**: Explicit consent for memory storage and processing
- **Data Minimization**: Store only necessary information
- **Purpose Limitation**: Use memories only for intended purposes
- **Anonymization**: Remove personally identifiable information when possible

### Compliance Features

```typescript
// GDPR-compliant data deletion
async deleteUserData(userId: string): Promise<void> {
  const userThreads = await this.findUserThreads(userId);
  for (const threadId of userThreads) {
    await this.memoryFacade.clear(threadId);
    await this.removeGraphRelationships(threadId);
  }
}

// Data export for portability
async exportUserMemories(userId: string): Promise<MemoryExport> {
  const userThreads = await this.findUserThreads(userId);
  const memories = await Promise.all(
    userThreads.map(threadId => this.memoryFacade.retrieve(threadId))
  );

  return {
    exportDate: new Date(),
    memories: memories.flat(),
    format: 'json'
  };
}
```

### Encryption and Security

- **At-Rest Encryption**: Encrypt sensitive memory content
- **In-Transit Encryption**: Secure communication with storage backends
- **Access Control**: Role-based access to memory data
- **Audit Logging**: Track memory access and modifications

## Testing Memory Systems

### Unit Testing Patterns

```typescript
describe('MemoryFacadeService', () => {
  beforeEach(async () => {
    // Mock ChromaDB and Neo4j services
    const module = await Test.createTestingModule({
      providers: [MemoryFacadeService, { provide: ChromaDBService, useValue: mockChromaDB }, { provide: Neo4jService, useValue: mockNeo4j }],
    }).compile();
  });

  it('should store and retrieve memories correctly', async () => {
    const memory = await service.store(threadId, content, metadata);
    const retrieved = await service.retrieve(threadId);
    expect(retrieved).toContain(memory);
  });
});
```

### Integration Testing

```typescript
// Test with real ChromaDB and Neo4j instances
describe('Memory Integration Tests', () => {
  beforeAll(async () => {
    // Start test containers
    await startTestContainers();
  });

  it('should perform end-to-end memory operations', async () => {
    await service.store(threadId, 'Test memory');
    const results = await service.search({ query: 'Test' });
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### Performance Testing

```typescript
// Memory performance benchmarks
describe('Memory Performance', () => {
  it('should handle large memory datasets efficiently', async () => {
    const start = Date.now();

    // Store 1000 memories
    const promises = Array.from({ length: 1000 }, (_, i) => service.store(threadId, `Memory ${i}`));
    await Promise.all(promises);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000); // Under 10 seconds
  });
});
```

## Error Handling and Resilience

### Memory-Specific Error Types

- **MemoryStorageError**: ChromaDB vector storage failures
- **MemoryRelationshipError**: Neo4j graph operation failures
- **MemoryEmbeddingError**: Embedding generation failures
- **MemorySummarizationError**: LLM summarization failures
- **MemoryTimeoutError**: Operation timeout failures

### Error Recovery Patterns

```typescript
try {
  await memoryFacade.store(threadId, content, metadata);
} catch (error) {
  if (error instanceof MemoryStorageError) {
    // Retry with exponential backoff
    await this.retryWithBackoff(() => memoryFacade.store(threadId, content, metadata));
  } else if (error instanceof MemoryEmbeddingError) {
    // Store without embedding, generate later
    await memoryFacade.store(threadId, content, {
      ...metadata,
      needsEmbedding: true,
    });
  }
}
```

### Circuit Breaker Pattern

```typescript
@Injectable()
export class MemoryCircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Best Practices

### Memory Management Guidelines

1. **Importance Scoring**: Always set appropriate importance scores
2. **Metadata Enrichment**: Include relevant tags and metadata
3. **Batch Operations**: Use batch operations for bulk memory storage
4. **Cleanup Scheduling**: Implement regular cleanup processes
5. **Error Handling**: Always handle memory operation failures gracefully

### Performance Best Practices

1. **Lazy Loading**: Load embeddings only when needed for search
2. **Connection Pooling**: Reuse database connections efficiently
3. **Caching Strategy**: Cache frequently accessed memories
4. **Index Optimization**: Maintain proper database indices
5. **Memory Monitoring**: Monitor memory usage and performance metrics

### Security Best Practices

1. **Data Encryption**: Encrypt sensitive memory content
2. **Access Control**: Implement proper authentication and authorization
3. **Audit Logging**: Log all memory access and modifications
4. **Data Retention**: Implement compliant data retention policies
5. **Privacy Protection**: Anonymize or remove PII when possible

### Development Workflow

```bash
# Memory-specific commands
npx nx test langgraph-modules-memory           # Run memory tests
npx nx test langgraph-modules-memory --watch   # Watch mode for development
npx nx build langgraph-modules-memory          # Build memory module

# Integration testing with real services
npm run dev:services                           # Start ChromaDB and Neo4j
npx nx test langgraph-modules-memory --testPathPattern=integration

# Performance testing
npx nx test langgraph-modules-memory --testPathPattern=performance
```

### Configuration Management

```typescript
// Memory module configuration
const memoryConfig: MemoryConfig = {
  storage: {
    type: 'vector',
    vector: {
      provider: 'chromadb',
      config: { collection: 'memories' },
    },
  },
  summarization: {
    strategy: 'progressive',
    maxMessages: 50,
    preserveImportant: true,
  },
  retention: {
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    evictionStrategy: 'importance',
  },
  enableSemanticSearch: true,
  enableAutoSummarization: true,
};
```

This Memory Module provides the foundation for building AI agents with sophisticated contextual memory capabilities, enabling more natural and personalized interactions while maintaining high performance and compliance with data protection requirements.
