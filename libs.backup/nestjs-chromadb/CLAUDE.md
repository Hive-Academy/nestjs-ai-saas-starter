# CLAUDE.md - @hive-academy/nestjs-chromadb

## Business Domain & Purpose

This library provides enterprise-grade vector database integration for semantic search and AI-powered applications. ChromaDB serves as the vector storage backend for embedding-based operations, enabling:

- **Semantic Search**: Find similar documents based on meaning rather than keywords
- **RAG Applications**: Retrieve relevant context for AI language models
- **Document Clustering**: Group similar documents automatically
- **Recommendation Systems**: Find related content based on embeddings
- **Knowledge Management**: Store and query organizational knowledge bases

## Technical Architecture

### Core Design Patterns

1. **Service Orchestration Pattern**

   - `ChromaDBService`: Main facade orchestrating collection, embedding, and admin services
   - `CollectionService`: Manages ChromaDB collections lifecycle
   - `EmbeddingService`: Handles multiple embedding providers via strategy pattern
   - `ChromaAdminService`: Administrative operations and maintenance

2. **Strategy Pattern for Embeddings**

   ```typescript
   BaseEmbeddingProvider (abstract)
   ├── OpenAIEmbeddingProvider
   ├── CohereEmbeddingProvider
   ├── HuggingFaceEmbeddingProvider
   └── CustomEmbeddingProvider
   ```

3. **Dependency Injection Pattern**
   - Custom decorators: `@InjectChromaDB()`, `@InjectCollection()`
   - Token-based injection for flexibility
   - Async factory pattern for configuration

### Module Structure

```
nestjs-chromadb/
├── decorators/          # DI and method decorators
├── embeddings/          # Embedding provider implementations
├── errors/              # Custom error classes
├── health/              # Health check indicators
├── interfaces/          # TypeScript interfaces
├── services/            # Core service implementations
├── utils/               # Utility functions
└── validation/          # Type guards and validators
```

## Best Practices & Guidelines

### 1. Collection Management

```typescript
// GOOD: Use descriptive collection names with environment prefixes
const collectionName = `${env}_user_documents`;

// GOOD: Always sanitize metadata before storage
const sanitized = sanitizeMetadata(userMetadata);

// BAD: Don't create collections in service constructors
// Collections should be created explicitly or via migrations
```

### 2. Embedding Strategy Selection

```typescript
// GOOD: Configure embedding provider based on use case
ChromaDBModule.forRoot({
  embedding: {
    provider: 'openai', // For production quality
    model: 'text-embedding-3-small', // Balance cost/performance
    dimensions: 1536, // Match model output
  },
});

// GOOD: Use custom embeddings for domain-specific models
ChromaDBModule.forRoot({
  embedding: {
    provider: 'custom',
    customFunction: async (texts) => {
      // Your domain-specific embedding logic
    },
  },
});
```

### 3. Batch Operations

```typescript
// GOOD: Use bulk operations for large datasets
await chromaDB.addDocumentsBatch('collection', documents, {
  batchSize: 100, // Optimal batch size
  parallel: true, // Enable parallel processing
});

// BAD: Don't add documents one by one in a loop
for (const doc of documents) {
  await chromaDB.addDocument('collection', doc); // Inefficient
}
```

### 4. Query Optimization

```typescript
// GOOD: Use metadata filtering to reduce search space
const results = await chromaDB.queryDocuments('collection', {
  queryTexts: ['search query'],
  where: { category: 'technical', status: 'published' },
  whereDocument: { $contains: 'NestJS' },
  nResults: 10,
});

// GOOD: Use embedding caching for repeated queries
const cachedEmbedding = await embeddingService.getCachedEmbedding(query);
```

### 5. Error Handling

```typescript
// GOOD: Use specific error types
try {
  await chromaDB.createCollection(name);
} catch (error) {
  if (error instanceof ChromaDBCollectionError) {
    // Handle collection-specific errors
  } else if (error instanceof ChromaDBConnectionError) {
    // Handle connection issues
  }
}

// GOOD: Implement retry logic for transient failures
@Injectable()
export class DocumentService {
  async addWithRetry(doc: Document, retries = 3) {
    return retryAsync(() => this.chromaDB.addDocument('collection', doc), { attempts: retries, delay: 1000 });
  }
}
```

### 6. Metadata Management

```typescript
// GOOD: Define metadata schemas
interface DocumentMetadata {
  source: string;
  timestamp: number;
  author?: string;
  tags?: string[];
}

// GOOD: Validate metadata before storage
const validated = validateMetadataSchema(metadata, schema);

// GOOD: Use metadata utilities
const merged = mergeMetadata(defaultMeta, userMeta);
const filtered = filterMetadata(metadata, allowedKeys);
```

## Core Services

### ChromaDBService

- **Purpose**: Main service facade for all ChromaDB operations
- **Responsibilities**:
  - Document CRUD operations
  - Similarity search and querying
  - Collection management delegation
  - Embedding orchestration

### CollectionService

- **Purpose**: Manages ChromaDB collections lifecycle
- **Responsibilities**:
  - Collection creation/deletion
  - Collection configuration
  - Metadata schema management
  - Collection statistics

### EmbeddingService

- **Purpose**: Handles text-to-vector conversions
- **Responsibilities**:
  - Provider strategy selection
  - Embedding generation
  - Batch embedding operations
  - Embedding caching

### ChromaAdminService

- **Purpose**: Administrative and maintenance operations
- **Responsibilities**:
  - Database health checks
  - Performance metrics
  - Cleanup operations
  - Migration support

## Testing Strategies

### Unit Testing

```typescript
describe('ChromaDBService', () => {
  let service: ChromaDBService;
  let mockClient: jest.Mocked<ChromaClient>;

  beforeEach(() => {
    mockClient = createMockChromaClient();
    service = new ChromaDBService(mockClient, ...);
  });

  it('should handle collection not found', async () => {
    mockClient.getCollection.mockRejectedValue(new Error('Not found'));
    await expect(service.queryDocuments('missing', {}))
      .rejects.toThrow(ChromaDBCollectionError);
  });
});
```

### Integration Testing

```typescript
// Test with real ChromaDB instance
describe('ChromaDB Integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ChromaDBModule.forRoot({
          connection: { host: 'localhost', port: 8000 },
          testMode: true, // Use test database
        }),
      ],
    }).compile();
  });
});
```

## Performance Considerations

1. **Embedding Caching**: Cache frequently used embeddings to reduce API calls
2. **Batch Processing**: Process documents in batches of 100-500
3. **Connection Pooling**: Reuse HTTP connections to ChromaDB
4. **Metadata Indexing**: Keep metadata fields minimal and indexed
5. **Async Operations**: Use async/await properly, avoid blocking operations
6. **Memory Management**: Stream large datasets instead of loading in memory

## Common Use Cases

### 1. Document Search System

```typescript
@Injectable()
export class SearchService {
  async semanticSearch(query: string, filters?: SearchFilters) {
    const results = await this.chromaDB.queryDocuments('docs', {
      queryTexts: [query],
      where: this.buildWhereClause(filters),
      nResults: 20,
      include: ['metadatas', 'documents', 'distances'],
    });
    return this.rankResults(results);
  }
}
```

### 2. RAG Context Retrieval

```typescript
@Injectable()
export class RAGService {
  async getContext(query: string, maxTokens: number) {
    const similar = await this.chromaDB.queryDocuments('knowledge', {
      queryTexts: [query],
      nResults: 10,
    });
    return this.truncateToTokenLimit(similar, maxTokens);
  }
}
```

### 3. Document Deduplication

```typescript
@Injectable()
export class DeduplicationService {
  async findDuplicates(document: string, threshold = 0.95) {
    const results = await this.chromaDB.queryDocuments('docs', {
      queryTexts: [document],
      where: { distance: { $lt: 1 - threshold } },
    });
    return results.filter((r) => r.distance > threshold);
  }
}
```

## Security Considerations

1. **API Key Management**: Store embedding API keys in secure vaults
2. **Data Sanitization**: Always sanitize user-provided metadata
3. **Access Control**: Implement collection-level access controls
4. **Rate Limiting**: Implement rate limiting for embedding APIs
5. **Data Encryption**: Enable TLS for ChromaDB connections
6. **PII Handling**: Implement PII detection and masking

## Integration Patterns

### With LangGraph Workflows

```typescript
@Node('retrieve-context')
async retrieveContext(state: WorkflowState) {
  const context = await this.chromaDB.queryDocuments('knowledge', {
    queryTexts: [state.query],
    nResults: 5
  });
  return { ...state, context: context.documents };
}
```

### With Neo4j Graph Database

```typescript
// Store embeddings in ChromaDB, relationships in Neo4j
async storeDocument(doc: Document) {
  // Store embedding in ChromaDB
  const embedding = await this.chromaDB.addDocument('docs', doc);

  // Store relationships in Neo4j
  await this.neo4j.run(`
    CREATE (d:Document {id: $id, embeddingId: $embeddingId})
  `, { id: doc.id, embeddingId: embedding.id });
}
```

## Troubleshooting Guide

### Common Issues

1. **Connection Refused**

   - Check ChromaDB is running: `docker ps | grep chromadb`
   - Verify port 8000 is accessible
   - Check firewall rules

2. **Embedding Dimension Mismatch**

   - Ensure collection dimension matches embedding model output
   - Recreate collection if dimensions changed

3. **Slow Query Performance**

   - Reduce result count (`nResults`)
   - Add metadata filters to reduce search space
   - Consider using approximate search

4. **Memory Issues with Large Datasets**
   - Use batch processing
   - Enable streaming for large results
   - Increase Node.js memory: `--max-old-space-size=4096`

## Development Guidelines

- Always use TypeScript strict mode
- Implement proper error boundaries
- Add comprehensive logging for debugging
- Write unit tests for new features
- Document breaking changes in CHANGELOG
- Follow NestJS naming conventions
- Use dependency injection for all services
- Implement health checks for production

## Future Enhancements

- Hybrid search (keyword + semantic)
- Multi-modal embeddings (text + image)
- Distributed ChromaDB cluster support
- Advanced caching strategies
- Real-time index updates
- Custom similarity metrics
- Embedding fine-tuning support
