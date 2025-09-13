# Memory Module - User Manual

## Overview

The **@hive-academy/langgraph-memory** module provides intelligent memory management for AI-powered applications, combining vector storage for semantic search with graph storage for relationship tracking. It enables sophisticated memory retrieval, summarization, and pattern analysis.

**Key Features:**

- **Hybrid Storage** - Vector storage (ChromaDB) + graph relationships (Neo4j)
- **Adapter Pattern** - Pluggable database backends through abstraction interfaces
- **Semantic Memory** - Automatic embedding generation and similarity search
- **Graph Relationships** - Memory-to-memory connections and conversation flow analysis
- **Type Safety** - Comprehensive TypeScript interfaces with Zod validation
- **Production Features** - Error handling, retention policies, and graceful degradation

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-memory
```

```typescript
import { Module } from '@nestjs/common';
import { MemoryModule } from '@hive-academy/langgraph-memory';

@Module({
  imports: [
    MemoryModule.forRoot({
      collection: 'memory_store',
      enableAutoSummarization: true,
      summarization: {
        maxMessages: 20,
        strategy: 'balanced',
      },
      retention: {
        maxEntries: 10000,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        evictionStrategy: 'lru',
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### MemoryService - Main Orchestrator

**Primary interface** coordinating all memory operations:

```typescript
// Storage operations
store(threadId: string, content: string, metadata?: Partial<MemoryMetadata>, userId?: string): Promise<MemoryEntry>
storeBatch(threadId: string, entries: readonly BatchEntry[], userId?: string): Promise<readonly MemoryEntry[]>

// Retrieval operations
retrieve(threadId: string, limit?: number): Promise<readonly MemoryEntry[]>
search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]>
searchForContext(query: string, threadId: string, userId?: string): Promise<ContextSearchResult>

// Analysis operations
summarize(threadId: string, messages: readonly BaseMessage[], options?: MemorySummarizationOptions): Promise<string>
getUserPatterns(userId: string): Promise<UserMemoryPatterns>
getConversationFlow(threadId: string): Promise<ReadonlyArray<FlowStep>>

// Maintenance operations
delete(threadId: string, memoryIds?: readonly string[]): Promise<number>
clear(threadId: string): Promise<void>
buildSemanticRelationships(): Promise<void>
getStats(): Promise<MemoryStats>
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { MemoryService, MemoryEntry, MemorySearchOptions } from '@hive-academy/langgraph-memory';

@Injectable()
export class ConversationService {
  constructor(private readonly memory: MemoryService) {}

  async handleUserMessage(threadId: string, message: string, userId?: string): Promise<any> {
    // Store the user message
    const entry = await this.memory.store(
      threadId,
      message,
      {
        type: 'conversation',
        importance: 0.8,
        tags: JSON.stringify(['user-input', 'chat']),
        source: 'user',
      },
      userId
    );

    // Find relevant context from memory
    const context = await this.memory.searchForContext(message, threadId, userId);

    // Use context for AI response generation
    const response = await this.generateResponse(message, context);

    // Store AI response
    await this.memory.store(
      threadId,
      response,
      {
        type: 'conversation',
        importance: 0.6,
        tags: JSON.stringify(['ai-response', 'chat']),
        source: 'assistant',
      },
      userId
    );

    return { entry, context, response };
  }

  async analyzeUserBehavior(userId: string): Promise<UserAnalysis> {
    const patterns = await this.memory.getUserPatterns(userId);

    const memories = await this.memory.search({
      userId,
      limit: 100,
      type: 'preference',
    });

    return {
      patterns,
      totalMemories: memories.length,
      preferences: this.extractPreferences(memories),
      engagementScore: this.calculateEngagement(patterns),
    };
  }
}
```

## Configuration

### Basic Configuration

```typescript
MemoryModule.forRoot({
  collection: 'memory_store',
  enableAutoSummarization: true,
  summarization: {
    maxMessages: 20,
    strategy: 'balanced', // 'recent' | 'important' | 'balanced'
  },
  retention: {
    maxEntries: 10000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    evictionStrategy: 'lru', // 'lru' | 'fifo' | 'importance'
    importance: {
      threshold: 0.7,
      strategy: 'keep_above',
    },
  },
});
```

### Async Configuration

```typescript
MemoryModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    collection: configService.get('MEMORY_COLLECTION', 'memory_store'),
    enableAutoSummarization: configService.get('MEMORY_AUTO_SUMMARY', true),
    retention: {
      maxEntries: configService.get('MEMORY_MAX_ENTRIES', 10000),
      maxAge: configService.get('MEMORY_MAX_AGE', 7 * 24 * 60 * 60 * 1000),
    },
    adapters: {
      vector: configService.get('MEMORY_VECTOR_ADAPTER'),
      graph: configService.get('MEMORY_GRAPH_ADAPTER'),
    },
  }),
  inject: [ConfigService],
});
```

### Custom Adapter Configuration

```typescript
// Using custom storage adapters
MemoryModule.forRoot({
  collection: 'ai_memory',
  adapters: {
    vector: CustomVectorService,
    graph: CustomGraphService,
  },
});
```

## Advanced Features

### Semantic Memory Operations

```typescript
// Store memories with rich metadata
await this.memory.store(threadId, content, {
  type: 'fact',
  importance: 0.9,
  tags: JSON.stringify(['technical', 'api']),
  source: 'documentation',
  userId: 'user123',
  persistent: true,
});

// Search with complex filters
const results = await this.memory.search({
  query: 'API authentication',
  threadId: 'conversation-456',
  userId: 'user123',
  limit: 10,
  minRelevance: 0.7,
  tags: ['technical', 'security'],
  type: 'fact',
  startDate: new Date(Date.now() - 86400000),
  endDate: new Date(),
});
```

### Batch Operations

```typescript
// Efficient batch memory storage
const memories = [
  { content: 'User prefers dark mode', metadata: { type: 'preference' } },
  { content: 'User is experienced developer', metadata: { type: 'fact' } },
  { content: 'User works with React', metadata: { type: 'context' } },
];

const stored = await this.memory.storeBatch(threadId, memories, userId);
```

### Memory Summarization

```typescript
// Automatic conversation summarization
const messages = [
  new HumanMessage('How do I implement authentication?'),
  new AIMessage('Here are several approaches...'),
  // ... more messages
];

const summary = await this.memory.summarize(threadId, messages, {
  maxMessages: 20,
  strategy: 'important', // Focus on important messages
  includeMetadata: true,
});
```

### Graph Relationship Building

```typescript
// Build semantic relationships between memories
await this.memory.buildSemanticRelationships();

// Get conversation flow analysis
const flow = await this.memory.getConversationFlow(threadId);
console.log('Conversation flow:', flow);
// Returns sequence of interactions with relationship strengths
```

## Core Interfaces

### MemoryEntry Structure

```typescript
interface MemoryEntry {
  readonly id: string;
  readonly threadId: string;
  readonly content: string;
  readonly embedding?: readonly number[];
  readonly metadata: MemoryMetadata;
  readonly createdAt: Date;
  readonly lastAccessedAt?: Date;
  readonly accessCount: number;
  readonly relevanceScore?: number;
}

interface MemoryMetadata {
  readonly type: 'conversation' | 'fact' | 'preference' | 'summary' | 'context' | 'custom';
  readonly source?: string;
  readonly tags?: string; // JSON string for ChromaDB compatibility
  readonly importance?: number; // 0-1 scale
  readonly persistent?: boolean;
  readonly userId?: string;
  readonly [key: string]: MetadataValue;
}
```

### Search and Analysis Types

```typescript
interface MemorySearchOptions {
  readonly query?: string;
  readonly threadId?: string;
  readonly userId?: string;
  readonly limit?: number;
  readonly minRelevance?: number;
  readonly tags?: string[];
  readonly type?: MemoryMetadata['type'];
  readonly startDate?: Date;
  readonly endDate?: Date;
}

interface UserMemoryPatterns {
  readonly userId: string;
  readonly commonTopics: readonly string[];
  readonly interactionFrequency: Record<string, number>;
  readonly preferredMemoryTypes: ReadonlyArray<MemoryMetadata['type']>;
  readonly averageSessionLength: number;
  readonly totalSessions: number;
}
```

## Adapter Pattern Integration

### Vector Service Interface

```typescript
export abstract class IVectorService {
  abstract store(collection: string, data: VectorStoreData): Promise<string>;
  abstract search(collection: string, query: VectorSearchQuery): Promise<readonly VectorSearchResult[]>;
  abstract delete(collection: string, ids: readonly string[]): Promise<number>;
  abstract clear(collection: string): Promise<void>;
  abstract getStats(collection: string): Promise<VectorStats>;
}
```

### Graph Service Interface

```typescript
export abstract class IGraphService {
  abstract createNode(data: GraphNodeData): Promise<string>;
  abstract createRelationship(fromNodeId: string, toNodeId: string, data: GraphRelationshipData): Promise<string>;
  abstract executeCypher(query: string, params?: Record<string, unknown>): Promise<GraphQueryResult>;
  abstract deleteNodes(nodeIds: readonly string[]): Promise<number>;
  abstract getStats(): Promise<GraphStats>;
}
```

## Memory Analytics

### User Pattern Analysis

```typescript
async analyzeUserInteractions(userId: string): Promise<UserInsights> {
  const patterns = await this.memory.getUserPatterns(userId);

  return {
    topicsOfInterest: patterns.commonTopics,
    engagementMetrics: {
      averageSessionLength: patterns.averageSessionLength,
      totalSessions: patterns.totalSessions,
      interactionFrequency: patterns.interactionFrequency
    },
    memoryDistribution: patterns.preferredMemoryTypes,
    recommendations: this.generateRecommendations(patterns)
  };
}
```

### Memory Statistics

```typescript
async getMemorySystemStats(): Promise<SystemStats> {
  const stats = await this.memory.getStats();

  return {
    performance: {
      totalMemories: stats.totalMemories,
      activeThreads: stats.activeThreads,
      averageSearchTime: stats.averageSearchTime,
      cacheHitRate: stats.cacheHitRate
    },
    storage: {
      averageMemorySize: stats.averageMemorySize,
      totalStorageUsed: stats.totalStorageUsed
    },
    usage: {
      searchCount: stats.searchCount,
      storageOperations: stats.storageOperations
    }
  };
}
```

## Error Handling

```typescript
import { MemoryStorageError, MemoryRetrievalError, MemoryConfigurationError } from '@hive-academy/langgraph-memory';

@Injectable()
export class RobustMemoryService {
  constructor(private memory: MemoryService) {}

  async safeMemoryOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof MemoryStorageError) {
        this.logger.error('Memory storage failed', error.message);
        // Graceful degradation - continue without memory
        return null;
      } else if (error instanceof MemoryRetrievalError) {
        this.logger.warn('Memory retrieval failed', error.message);
        // Return empty results rather than failing
        return null;
      } else if (error instanceof MemoryConfigurationError) {
        this.logger.error('Memory configuration invalid', error.message);
        throw new BadRequestException('Memory system misconfigured');
      }
      throw error;
    }
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { MemoryModule, MemoryService } from '@hive-academy/langgraph-memory';

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        MemoryModule.forRoot({
          collection: 'test_memory',
          enableAutoSummarization: false,
        }),
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
  });

  it('should store and retrieve memories', async () => {
    const threadId = 'test-thread';
    const content = 'Test memory content';

    const stored = await service.store(threadId, content, {
      type: 'fact',
      importance: 0.8,
    });

    const retrieved = await service.retrieve(threadId);

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].content).toBe(content);
    expect(retrieved[0].metadata.type).toBe('fact');
  });

  it('should find relevant context', async () => {
    await service.store('thread-1', 'User likes JavaScript', {
      type: 'preference',
    });

    const context = await service.searchForContext('What programming languages do you know?', 'thread-1');

    expect(context.relevantMemories).toBeTruthy();
    expect(context.relevantMemories.length).toBeGreaterThan(0);
  });
});
```

## Performance Optimization

### Memory Retention Strategies

```typescript
// Configure intelligent memory retention
const config = {
  retention: {
    maxEntries: 50000,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    evictionStrategy: 'importance', // Keep high-importance memories
    importance: {
      threshold: 0.5, // Keep memories above 0.5 importance
      strategy: 'keep_above',
    },
    patterns: {
      preserveUserPreferences: true,
      keepConversationSummaries: true,
      archiveOldFacts: true,
    },
  },
};
```

### Search Optimization

```typescript
// Efficient memory search patterns
async searchWithOptimization(query: string, threadId: string): Promise<MemoryEntry[]> {
  // First try exact thread search
  let results = await this.memory.search({
    query,
    threadId,
    limit: 5,
    minRelevance: 0.8
  });

  // If not enough results, expand search
  if (results.length < 3) {
    results = await this.memory.search({
      query,
      limit: 10,
      minRelevance: 0.6, // Lower threshold
      type: 'fact' // Focus on facts
    });
  }

  return results;
}
```

## Troubleshooting

### Common Issues

#### 1. Vector Service Not Available

```typescript
// Memory service gracefully degrades when vector service is unavailable
// Graph operations continue to work independently
// Enable fallback mode in configuration
{
  fallbackMode: {
    enabled: true,
    vectorServiceDown: 'continue', // 'continue' | 'fail' | 'cache'
    graphServiceDown: 'continue'
  }
}
```

#### 2. Memory Retrieval Performance

```typescript
// Solution: Optimize search parameters and indexing
const optimizedSearch = {
  limit: 10, // Reduce result count
  minRelevance: 0.7, // Higher threshold
  tags: ['important'], // Use specific tags
  type: 'fact', // Filter by type
};
```

#### 3. Storage Space Management

```typescript
// Solution: Implement cleanup strategies
async cleanupOldMemories(): Promise<void> {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const oldMemories = await this.memory.search({
    endDate: cutoffDate,
    limit: 1000
  });

  const lowImportance = oldMemories.filter(m =>
    (m.metadata.importance || 0) < 0.3 && !m.metadata.persistent
  );

  for (const memory of lowImportance) {
    await this.memory.delete(memory.threadId, [memory.id]);
  }
}
```

This comprehensive memory module provides sophisticated memory management capabilities for AI applications, enabling semantic search, relationship tracking, and intelligent memory retention for enhanced conversational AI experiences.
