# @hive-academy/nestjs-memory

A standalone NestJS Memory Module providing direct ChromaDB and Neo4j integration for AI-powered applications.

## Features

- **Direct Database Integration**: No complex adapters - direct @hive-academy/nestjs-chromadb and @hive-academy/nestjs-neo4j integration
- **Vector Search**: Semantic similarity search powered by ChromaDB
- **Graph Relationships**: Memory connections and conversation flow via Neo4j
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **NestJS Patterns**: Standard forRoot()/forRootAsync() module configuration
- **Lightweight**: ~80% smaller than including full nestjs-langgraph library
- **Production Ready**: Error handling, logging, graceful degradation

## Installation

```bash
npm install @hive-academy/nestjs-memory
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { MemoryModule } from '@hive-academy/nestjs-memory';

@Module({
  imports: [
    MemoryModule.forRoot({
      collection: 'my_memories',
      retention: {
        maxEntries: 10000,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  ],
})
export class AppModule {}
```

## Usage

```typescript
import { Injectable } from '@nestjs/common';
import { MemoryService } from '@hive-academy/nestjs-memory';

@Injectable()
export class ChatService {
  constructor(private readonly memory: MemoryService) {}

  async handleMessage(threadId: string, message: string, userId?: string) {
    // Store the message
    await this.memory.store(threadId, message, {
      type: 'conversation',
      importance: 0.8,
      tags: ['chat', 'user-input'],
    }, userId);

    // Search for relevant context
    const { relevantMemories, confidence } = await this.memory.searchForContext(
      message, 
      threadId, 
      userId
    );

    // Get conversation flow
    const flow = await this.memory.getConversationFlow(threadId);
    
    return { memories: relevantMemories, confidence, flow };
  }
}
```

## Configuration

### Synchronous Configuration

```typescript
MemoryModule.forRoot({
  collection: 'memory_store',
  enableAutoSummarization: true,
  retention: {
    maxEntries: 10000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    evictionStrategy: 'lru',
  },
  chromadb: {
    collection: 'vectors',
  },
  neo4j: {
    database: 'neo4j',
  },
})
```

### Asynchronous Configuration

```typescript
MemoryModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    collection: configService.get('MEMORY_COLLECTION'),
    retention: {
      maxEntries: configService.get('MEMORY_MAX_ENTRIES'),
    },
  }),
  inject: [ConfigService],
})
```

## API Reference

### MemoryService Methods

- `store(threadId, content, metadata?, userId?)` - Store a memory
- `storeBatch(threadId, entries, userId?)` - Store multiple memories
- `retrieve(threadId, limit?)` - Get memories by thread
- `search(options)` - Search with filters
- `searchForContext(query, threadId, userId?)` - Contextual search
- `delete(threadId, memoryIds?)` - Delete memories
- `clear(threadId)` - Clear thread memories
- `getStats()` - Get statistics
- `buildSemanticRelationships()` - Build memory connections

## Environment Variables

```bash
# ChromaDB
CHROMADB_URL=http://localhost:8000

# Neo4j
NEO4J_HOST=localhost
NEO4J_PORT=7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
```

## Bundle Size Comparison

- **nestjs-langgraph** (full): ~59.8MB
- **@hive-academy/nestjs-memory**: ~5-10MB (80-90% reduction)

## Requirements

- Node.js >= 16
- NestJS >= 10
- ChromaDB instance
- Neo4j instance (optional, graceful degradation)

## License

MIT