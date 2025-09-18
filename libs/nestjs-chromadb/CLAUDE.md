# ChromaDB Module - User Manual

## Overview

The **@hive-academy/nestjs-chromadb** module provides enterprise-grade ChromaDB integration for NestJS applications, enabling semantic search, RAG systems, and AI-powered document management with advanced text processing and multiple embedding providers.

**Key Features (updated):**

- **Multi-Provider Embeddings** (OpenAI, HuggingFace, Cohere, Custom)
- **Deterministic Chunking** with parent/child relationship tracking
- **Strict Error Propagation** (embedding helpers throw; no silent skips)
- **Startup Config Validation** (host, port, provider requirements)
- **Metadata Relationship Docs** (stored without embeddings to save cost)
- **Health Monitoring & Diagnostics**
- **Batch-Oriented Operations** (encouraged over single-item API)
- **Strict Type Safety** (no silent null fallbacks)

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/nestjs-chromadb
```

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: 'localhost',
        port: 8000,
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: 'text-embedding-3-small',
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### ChromaDBService - Current Public API

```typescript
listCollections(): Promise<ChromaCollectionInfo[]>
createCollection(...): Promise<Collection>
getCollection(...): Promise<Collection>
deleteCollection(name: string): Promise<void>
collectionExists(name: string): Promise<boolean>
addDocuments(collectionName: string, docs: ChromaDocument[], options?: ChromaBulkOptions): Promise<void>
updateDocuments(...): Promise<void>
upsertDocuments(...): Promise<void>
deleteDocuments(...): Promise<void>
getDocuments(...): Promise<GetResult>
countDocuments(...): Promise<number>
peekDocuments(...): Promise<GetResult>
getCollectionMetadata(name: string): Promise<Record<string, any> | null>
updateCollectionMetadata(...): Promise<void>
searchDocuments(...): Promise<ChromaSearchResult>
similaritySearch(...): Promise<{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[] }>
```

Removed legacy single-item or semantic convenience methods from docs to reduce ambiguity.

### CollectionService - Collection Management

```typescript
// Collection lifecycle
createCollection(name: string, metadata?: ChromaMetadata): Promise<void>
deleteCollection(name: string): Promise<void>
collectionExists(name: string): Promise<boolean>
listCollections(): Promise<readonly string[]>

// Collection information
getCollectionInfo(name: string): Promise<CollectionInfo>
getCollectionCount(name: string): Promise<number>
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaDBService, ChromaDocument, ChromaBulkOptions } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class KnowledgeService {
  constructor(private readonly chromaDB: ChromaDBService) {}

  async indexKnowledgeBase(documents: Array<{ content: string; source: string }>) {
    const chromaDocs: ChromaDocument[] = documents.map((doc, idx) => ({
      id: `kb-${idx}`,
      document: doc.content,
      metadata: {
        source: doc.source,
        indexed_at: new Date().toISOString(),
        type: 'knowledge',
      },
    }));

    const bulkOptions: ChromaBulkOptions = {
      batchSize: 100,
      autoChunk: true,
      chunkingStrategy: 'smart',
      extractMetadata: true,
      preserveChunkRelationships: true,
    };

    return this.chromaDB.addDocuments('knowledge', chromaDocs, bulkOptions);
  }

  async searchKnowledge(query: string, filters?: any) {
    return this.chromaDB.searchDocuments('knowledge', [query], undefined, {
      nResults: 10,
      where: filters,
      includeMetadata: true,
      includeDistances: true,
    });
  }

  async getRAGContext(query: string, maxTokens: number = 4000) {
    const results = await this.chromaDB.similaritySearch('knowledge', query, {
      limit: 15,
    });

    // Truncate to token limit for RAG context
    return this.truncateToTokenLimit(results, maxTokens);
  }
}
```

## Configuration

### Basic Configuration

```typescript
ChromaDBModule.forRoot({
  connection: {
    host: 'http://localhost',
    port: 8000,
    ssl: false,
  },
  embedding: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    },
  },
  defaultCollection: 'documents',
  batchSize: 100,
});
```

### Async Configuration

```typescript
ChromaDBModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    connection: {
      host: configService.get('CHROMA_HOST', 'localhost'),
      port: configService.get('CHROMA_PORT', 8000),
    },
    embedding: {
      provider: configService.get('EMBEDDING_PROVIDER', 'openai'),
      config: {
        apiKey: configService.get('OPENAI_API_KEY'),
        model: configService.get('EMBEDDING_MODEL', 'text-embedding-3-small'),
      },
    },
  }),
  inject: [ConfigService],
});
```

### Embedding Provider Configurations

```typescript
// OpenAI Configuration
embedding: {
  provider: 'openai',
  config: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
    dimensions: 1536
  }
}

// HuggingFace Configuration
embedding: {
  provider: 'huggingface',
  config: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: 'sentence-transformers/all-MiniLM-L6-v2'
  }
}

// Cohere Configuration
embedding: {
  provider: 'cohere',
  config: {
    apiKey: process.env.COHERE_API_KEY,
    model: 'embed-english-v3.0'
  }
}
```

## Advanced Features

### Intelligent Document Chunking (embedding-safe)

```typescript
// Smart chunking with relationship preservation
const options: ChromaBulkOptions = {
  autoChunk: true,
  chunkingStrategy: 'smart', // 'recursive' | 'token' | 'semantic' | 'smart'
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveChunkRelationships: true,
  extractMetadata: true,
};

await this.chromaDB.addDocuments('documents', docs, options);

// Notes:
// - Each chunk gets its own embedding (no parent reuse)
// - Relationship summary docs are stored without embeddings
// - autoChunk without TextSplitterService logs a warning
```

### Advanced Search Operations

```typescript
// Hybrid search with multiple filters
const results = await this.chromaDB.searchDocuments('documents', ['AI development'], undefined, {
  nResults: 20,
  where: {
    category: 'technical',
    status: 'published',
    author: { $in: ['john', 'jane'] },
  },
  whereDocument: {
    $and: [{ $contains: 'NestJS' }, { $not_contains: 'deprecated' }],
  },
  includeMetadata: true,
  includeDistances: true,
});

// Semantic similarity with threshold filtering
const similarDocs = await this.chromaDB.findSimilarDocuments('documents', 'doc-123', 10);
const filteredResults = similarDocs.documents?.filter(
  (_, idx) => (similarDocs.distances?.[0][idx] || 0) < 0.8 // similarity threshold
);
```

### Embedding Error Handling

Embedding utilities throw on failure; wrap bulk operations in try/catch when graceful degradation is desired.

### Metadata Management

```typescript
import { sanitizeMetadata, validateMetadata, validateMetadataSchema } from '@hive-academy/nestjs-chromadb';

// Sanitize metadata for ChromaDB compatibility
const sanitized = sanitizeMetadata({
  tags: ['ai', 'ml'],
  score: 0.95,
  nested: { invalid: 'object' }, // Will be JSON stringified
});

// Validate with schema
const schema = {
  category: { type: 'string', required: true, enum: ['tech', 'business'] },
  score: { type: 'number', min: 0, max: 1 },
};
const validation = validateMetadataSchema(metadata, schema);
```

## Dependency Injection

```typescript
import { InjectChromaDB, InjectChromaDBClient, InjectCollection } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(@InjectChromaDB() private chromaDB: ChromaDBService, @InjectChromaDBClient() private client: ChromaApi, @InjectCollection('documents') private collection: Collection) {}
}
```

## Core Interfaces

### ChromaDocument Structure

```typescript
interface ChromaDocument {
  readonly id: string;
  readonly document?: string;
  readonly metadata?: ChromaMetadata;
  readonly embedding?: readonly number[];
}

interface ChromaMetadata {
  [key: string]: string | number | boolean;
}
```

### Search Options

```typescript
interface ChromaSearchOptions {
  nResults?: number;
  where?: Where;
  whereDocument?: WhereDocument;
  includeMetadata?: boolean;
  includeDocuments?: boolean;
  includeDistances?: boolean;
}

interface ChromaBulkOptions {
  batchSize?: number;
  upsert?: boolean;
  validateIds?: boolean;
  autoChunk?: boolean;
  chunkingStrategy?: 'recursive' | 'token' | 'character' | 'markdown' | 'semantic' | 'smart';
  chunkSize?: number;
  chunkOverlap?: number;
  preserveChunkRelationships?: boolean;
  extractMetadata?: boolean;
  extractTopics?: boolean;
  extractKeywords?: boolean;
  analyzeComplexity?: boolean;
  calculateReadingTime?: boolean;
  detectCrossReferences?: boolean;
  extractCodeMetadata?: boolean;
}
```

## Health Monitoring

```typescript
import { ChromaDBHealthIndicator } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class HealthService {
  constructor(private chromaHealth: ChromaDBHealthIndicator) {}

  async checkHealth() {
    const basic = await this.chromaHealth.isHealthy('chromadb');
    const detailed = await this.chromaHealth.isHealthyDetailed('chromadb');

    return {
      basic,
      detailed: {
        connection: detailed.connection,
        collections: detailed.collections,
        embedding: detailed.embedding,
      },
    };
  }
}
```

## Error Handling

```typescript
import { ChromaDBConnectionError, ChromaDBCollectionNotFoundError, ChromaDBEmbeddingNotConfiguredError } from '@hive-academy/nestjs-chromadb';

try {
  await this.chromaDB.addDocuments('collection', [document]);
} catch (error) {
  if (error instanceof ChromaDBConnectionError) {
    // Handle connection issues
    this.logger.error('ChromaDB connection failed', error.message);
  } else if (error instanceof ChromaDBCollectionNotFoundError) {
    this.logger.error('Collection not found', error.message);
  } else if (error instanceof ChromaDBEmbeddingNotConfiguredError) {
    // Handle missing embedding configuration
    this.logger.error('Embedding provider not configured', error.message);
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { ChromaDBModule, ChromaDBService } from '@hive-academy/nestjs-chromadb';

describe('DocumentService', () => {
  let service: DocumentService;
  let chromaDB: ChromaDBService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ChromaDBModule.forRoot({
          connection: { host: 'localhost', port: 8000 },
          embedding: { provider: 'openai', config: { apiKey: 'test-key' } },
        }),
      ],
      providers: [DocumentService],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    chromaDB = module.get<ChromaDBService>(ChromaDBService);
  });

  it('should index documents with metadata', async () => {
    const documents = [{ content: 'Test document', source: 'test' }];

    await service.indexKnowledgeBase(documents);
    const results = await chromaDB.getCollectionCount('knowledge');

    expect(results).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeouts

```typescript
// Solution: Increase timeout values
connection: {
  host: 'localhost',
  port: 8000,
  timeout: 60000, // Increase timeout
  retries: 5      // Increase retries
}
```

#### 2. Embedding Rate Limits

```typescript
// Solution: Implement batch processing with delays
const options: ChromaBulkOptions = {
  batchSize: 50, // Reduce batch size
  delayBetweenBatches: 1000, // Add delay between batches
};
```

#### 3. Memory Usage

```typescript
// Solution: Process documents in smaller chunks
const chunkSize = 100;
for (let i = 0; i < documents.length; i += chunkSize) {
  const chunk = documents.slice(i, i + chunkSize);
  await this.chromaDB.addDocuments('collection', chunk);
}
```

This comprehensive module provides production-ready ChromaDB integration with advanced features for building sophisticated AI-powered applications with semantic search capabilities.
