# @hive-academy/nestjs-chromadb

## Overview

Enterprise-grade ChromaDB integration for NestJS with a TypeORM-style repository pattern. Provides vector database capabilities for semantic search, document similarity, and embedding-based retrieval.

**Key Features:**

- **Repository Pattern**: TypeORM-style API (`ChromaDBRepository<T>`)
- **Declarative Decorators**: `@Cached`, `@Profiled`, `@Retry`, `@VectorQuery`
- **Multi-Tenancy**: Tenant isolation via `@TenantAware`
- **Type Safety**: Strict TypeScript typing with generics
- **Auto-Initialization**: Automatic collection creation and management

**Use Cases:**

- Semantic search over documents
- RAG (Retrieval-Augmented Generation) systems
- Document similarity and clustering
- Knowledge base retrieval
- Memory systems for AI agents

---

## Module Setup

### Basic Configuration

```typescript
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRoot({
      url: process.env.CHROMADB_URL || 'http://localhost:8000',
      auth: {
        provider: 'token',
        credentials: process.env.CHROMADB_TOKEN,
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
ChromaDBModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    url: configService.get('CHROMADB_URL'),
    auth: {
      provider: 'token',
      credentials: configService.get('CHROMADB_TOKEN'),
    },
    defaultEmbeddingFunction: 'openai', // or 'transformer'
  }),
  inject: [ConfigService],
});
```

---

## Entity Definition

### Basic Entity

```typescript
import { BaseDocument, ChromaEntity, ChromaId, ChromaProp } from '@hive-academy/nestjs-chromadb';

@ChromaEntity({ collection: 'tech-trends' })
export class TechTrendEntity extends BaseDocument {
  @ChromaId()
  id!: string;

  @ChromaProp()
  name!: string;

  @ChromaProp()
  category!: string;

  @ChromaProp()
  description!: string;

  @ChromaProp()
  popularity!: number;

  @ChromaProp()
  tags!: string[];

  // Embedding is handled automatically
  // Metadata is stored as flat key-value pairs
}
```

### Entity Decorators

- **`@ChromaEntity({ collection: string })`**: Marks class as ChromaDB entity
- **`@ChromaId()`**: Marks field as document ID
- **`@ChromaProp()`**: Marks field as document property (stored in metadata)

**IMPORTANT**: All properties marked with `@ChromaProp()` are stored as **metadata** in ChromaDB, not as document content. The actual document content is typically derived from key fields during embedding.

---

## Repository Pattern

### Creating a Repository

```typescript
import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
} from '@hive-academy/nestjs-chromadb';

@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  constructor(chromaDB: ChromaDBService, collectionRegistry: CollectionRegistryService) {
    super(
      TechTrendEntity, // Entity class
      'tech-trends', // Collection name
      chromaDB, // ChromaDB service
      collectionRegistry // Collection registry
    );
  }

  // Custom methods below
}
```

### Available CRUD Methods

#### findById(id: string)

```typescript
const trend = await repository.findById('trend-123');
if (trend) {
  console.log(trend.name, trend.popularity);
}
```

#### findAll(options?: RepositoryFindOptions)

```typescript
// Get all documents
const all = await repository.findAll();

// With filtering
const emerging = await repository.findAll({
  where: {
    category: 'AI',
    popularity: { $gte: 80 },
  },
  limit: 10,
});

// With pagination
const page = await repository.findAll({
  limit: 20,
  offset: 40, // Skip first 40
});
```

**Filter Operators:**

- `$eq`: Equals (default if no operator)
- `$ne`: Not equals
- `$gt`: Greater than
- `$gte`: Greater than or equal
- `$lt`: Less than
- `$lte`: Less than or equal
- `$in`: In array
- `$nin`: Not in array

#### create(data: CreateDocumentInput<T>)

```typescript
const newTrend = await repository.create({
  id: 'trend-456',
  name: 'Edge Computing',
  category: 'Infrastructure',
  description: 'Computing at the network edge...',
  popularity: 85,
  tags: ['edge', 'distributed', 'iot'],
});
```

**Automatic Embedding**: The repository automatically generates embeddings from the document content (typically concatenating key fields).

#### update(id: string, updates: Partial<T>)

```typescript
const updated = await repository.update('trend-456', {
  popularity: 90,
  tags: ['edge', 'distributed', 'iot', 'serverless'],
});
```

**Re-Embedding**: Updates trigger re-embedding if content fields change.

#### delete(id: string)

```typescript
const deleted = await repository.delete('trend-456');
console.log(deleted); // true if successful
```

#### upsert(data: UpsertDocumentInput<T>)

```typescript
const trend = await repository.upsert({
  id: 'trend-789',
  name: 'Quantum ML',
  category: 'AI',
  description: 'Quantum computing for ML...',
  popularity: 95,
  tags: ['quantum', 'ml', 'ai'],
});
// Creates if doesn't exist, updates if exists
```

#### search(query: string, options?: RepositorySearchOptions)

**Semantic Search** - The core feature of vector databases:

```typescript
const results = await repository.search('AI and machine learning trends', {
  nResults: 10,
  where: { category: 'AI' },
});

// Results include similarity scores
for (const result of results) {
  console.log(
    result.document.name,
    result.score // Cosine similarity (0-1)
  );
}
```

**Search Options:**

- `nResults`: Number of results (default: 10)
- `where`: Metadata filtering (same as findAll)
- `whereDocument`: Filter by document content (uses ChromaDB's where_document)

**Advanced Search:**

```typescript
// Combine vector similarity with metadata filtering
const techResults = await repository.search('distributed systems', {
  nResults: 5,
  where: {
    category: 'Infrastructure',
    popularity: { $gte: 75 },
  },
});

// Search within specific document content
const results = await repository.search('kubernetes', {
  whereDocument: { $contains: 'container orchestration' },
});
```

---

## Decorators for Cross-Cutting Concerns

### @Cached

Caches method results in Redis or memory.

```typescript
import { Cached } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  @Cached({ ttl: 3600000 }) // Cache for 1 hour
  async findPopularTrends(): Promise<TechTrendEntity[]> {
    return this.findAll({
      where: { popularity: { $gte: 80 } },
      limit: 10,
    });
  }
}
```

**Options:**

- `ttl`: Time to live in milliseconds
- `key`: Custom cache key (optional, auto-generated by default)
- `namespace`: Cache namespace for organization

### @Profiled

Logs execution time and performance metrics.

```typescript
import { Profiled } from '@hive-academy/nestjs-chromadb';

@Profiled({ slowQueryThreshold: 200 })
async analyzeEmergingTechnologies(technologies: string[]): Promise<Analysis> {
  // Logs warning if execution > 200ms
  const results = await this.search(technologies.join(' '), {
    nResults: 20
  });

  return this.analyzeResults(results);
}
```

**Options:**

- `slowQueryThreshold`: Log warning if exceeded (ms)
- `logLevel`: 'debug' | 'info' | 'warn' | 'error'
- `includeArgs`: Include method arguments in logs

### @Retry

Automatically retries failed operations.

```typescript
import { Retry } from '@hive-academy/nestjs-chromadb';

@Retry({ maxAttempts: 3, strategy: 'exponential' })
async unreliableOperation(): Promise<void> {
  // Retries up to 3 times with exponential backoff
  await this.externalService.call();
}
```

**Options:**

- `maxAttempts`: Max retry attempts (default: 3)
- `strategy`: 'fixed' | 'exponential' | 'linear'
- `delay`: Initial delay in ms (default: 1000)
- `maxDelay`: Max delay for exponential backoff

### @VectorQuery

Auto-generates embeddings for query text in semantic search.

```typescript
import { VectorQuery } from '@hive-academy/nestjs-chromadb';

@VectorQuery({ collection: 'knowledge-base' })
async searchKnowledge(query: string): Promise<SearchResult[]> {
  // Query is automatically embedded before search
  return this.search(query, { nResults: 5 });
}
```

---

## Real-World Example

From `apps/dev-brand-api/src/app/repositories/chromadb/tech-trends.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  Cached,
  Profiled,
  Retry,
} from '@hive-academy/nestjs-chromadb';
import { TechTrendEntity } from '../entities/tech-trend.entity';

@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  constructor(chromaDB: ChromaDBService, collectionRegistry: CollectionRegistryService) {
    super(TechTrendEntity, 'tech-trends', chromaDB, collectionRegistry);
  }

  /**
   * Analyze emerging technologies using semantic search
   * Cache results for 1 hour, log if > 200ms, retry up to 3 times
   */
  @Cached({ ttl: 3600000 })
  @Profiled({ slowQueryThreshold: 200 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeEmergingTechnologies(technologies: string[]): Promise<TrendAnalysis> {
    // Search for similar technologies using vector similarity
    const searchResults = await this.search(technologies.join(' '), {
      nResults: 20,
      where: { category: 'emerging' },
    });

    // Analyze patterns from search results
    const patterns = this.extractPatterns(searchResults);

    // Find related trending topics
    const related = await this.findRelatedTrends(searchResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, related);

    return {
      trends: searchResults.map((r) => ({
        technology: r.document.name,
        similarity: r.score,
        category: r.document.category,
        popularity: r.document.popularity,
      })),
      patterns,
      recommendations,
      metadata: {
        totalAnalyzed: technologies.length,
        resultsFound: searchResults.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Find popular technologies by category
   */
  async findPopularByCategory(category: string): Promise<TechTrendEntity[]> {
    return this.findAll({
      where: {
        category,
        popularity: { $gte: 70 },
      },
      limit: 10,
    });
  }

  /**
   * Find technologies by multiple tags
   */
  async findByTags(tags: string[]): Promise<TechTrendEntity[]> {
    // Use semantic search for better tag matching
    const results = await this.search(tags.join(' '), {
      nResults: 15,
      where: {
        tags: { $in: tags },
      },
    });

    return results.map((r) => r.document);
  }

  /**
   * Get trending technologies (high growth rate)
   */
  async getTrendingTechnologies(limit = 10): Promise<TechTrendEntity[]> {
    return this.findAll({
      where: {
        popularity: { $gte: 80 },
      },
      limit,
    });
  }

  private extractPatterns(results: SearchResultWithScore<TechTrendEntity>[]) {
    // Group by category
    const byCategory = results.reduce((acc, r) => {
      const cat = r.document.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {} as Record<string, typeof results>);

    // Find dominant categories
    const categoryScores = Object.entries(byCategory).map(([category, items]) => ({
      category,
      count: items.length,
      avgSimilarity: items.reduce((sum, item) => sum + item.score, 0) / items.length,
    }));

    return {
      byCategory,
      dominantCategories: categoryScores.sort((a, b) => b.count - a.count).slice(0, 3),
    };
  }

  private async findRelatedTrends(
    results: SearchResultWithScore<TechTrendEntity>[]
  ): Promise<TechTrendEntity[]> {
    // Extract tags from top results
    const topTags = results.slice(0, 5).flatMap((r) => r.document.tags);

    // Find other technologies with similar tags
    return this.findByTags([...new Set(topTags)]);
  }

  private generateRecommendations(patterns: any, related: TechTrendEntity[]) {
    return {
      explore: related.slice(0, 5).map((t) => t.name),
      focusAreas: patterns.dominantCategories.map((c: any) => c.category),
      nextSteps: [
        'Deep dive into dominant categories',
        'Research emerging patterns',
        'Monitor related technologies',
      ],
    };
  }
}

interface TrendAnalysis {
  trends: Array<{
    technology: string;
    similarity: number;
    category: string;
    popularity: number;
  }>;
  patterns: any;
  recommendations: any;
  metadata: any;
}
```

---

## Collection Initialization

### Automatic Initialization

Collections are automatically created on first use:

```typescript
@Injectable()
export class MyRepository extends ChromaDBRepository<MyEntity> {
  constructor(chromaDB: ChromaDBService, registry: CollectionRegistryService) {
    super(
      MyEntity,
      'my-collection',
      chromaDB,
      registry,
      { initializationStrategy: 'eager' } // Options: eager, lazy, manual
    );
  }
}
```

**Strategies:**

- **`eager`**: Creates collection immediately on repository instantiation
- **`lazy`** (default): Creates collection on first operation
- **`manual`**: You must call `ensureInitialized()` manually

### Manual Initialization

```typescript
await repository.ensureInitialized();
// Collection is now guaranteed to exist
```

### Graceful Degradation

The repository handles missing collections gracefully:

```typescript
try {
  const results = await repository.findAll();
} catch (error) {
  if (repository.isCollectionNotFoundError(error)) {
    // Collection doesn't exist, initialize it
    await repository.ensureInitialized();
    const results = await repository.findAll();
  }
}
```

---

## Multi-Tenancy

### @TenantAware Decorator

Automatically isolates data by tenant:

```typescript
import { TenantAware } from '@hive-academy/nestjs-chromadb';

@Injectable()
@TenantAware()
export class UserDataRepository extends ChromaDBRepository<UserDataEntity> {
  // All operations automatically scoped to current tenant

  async findUserData(userId: string): Promise<UserDataEntity[]> {
    // Automatically filters by tenant
    return this.findAll({ where: { userId } });
  }
}
```

**How It Works:**

- Tenant ID is extracted from request context
- Automatically added to all queries as metadata filter
- Prevents cross-tenant data leakage

### Tenant Context

Set tenant context in your application:

```typescript
import { TenantContext } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    TenantContext.setTenant(tenantId);
    next();
  }
}
```

---

## Best Practices

### 1. Repository Pattern

**✅ CORRECT**: Always extend `ChromaDBRepository<T>`

```typescript
@Injectable()
export class MyRepository extends ChromaDBRepository<MyEntity> {
  // Custom methods here
}
```

**❌ WRONG**: Using `ChromaDBService` directly for CRUD

```typescript
@Injectable()
export class MyService {
  constructor(private chromaDB: ChromaDBService) {}

  async getData() {
    // Don't do this - use repository instead
    return this.chromaDB.queryCollection(...);
  }
}
```

### 2. Semantic Search Optimization

**Set appropriate `nResults`:**

```typescript
// ✅ CORRECT: Reasonable limit
const results = await repository.search(query, { nResults: 10 });

// ❌ WRONG: Too many results, slow
const results = await repository.search(query, { nResults: 1000 });
```

**Combine with metadata filtering:**

```typescript
// ✅ CORRECT: Filter before vector search
const results = await repository.search(query, {
  nResults: 10,
  where: { category: 'relevant-category' },
});
```

### 3. Collection Naming

Use kebab-case for collection names:

```typescript
// ✅ CORRECT
@ChromaEntity({ collection: 'tech-trends' })

// ❌ WRONG
@ChromaEntity({ collection: 'TechTrends' })
@ChromaEntity({ collection: 'tech_trends' })
```

### 4. Type Safety

Extend `BaseDocument` for type safety:

```typescript
// ✅ CORRECT
export class MyEntity extends BaseDocument {
  @ChromaId() id!: string;
  @ChromaProp() name!: string;
}

// ❌ WRONG
export class MyEntity {
  id?: string; // Missing proper typing
  name?: string;
}
```

### 5. Error Handling

Handle collection-not-found errors:

```typescript
try {
  const data = await repository.findAll();
} catch (error) {
  if (repository.isCollectionNotFoundError(error)) {
    await repository.ensureInitialized();
    return repository.findAll();
  }
  throw error;
}
```

---

## Common Patterns

### RAG (Retrieval-Augmented Generation)

```typescript
async generateAnswer(question: string, userId: string): Promise<string> {
  // 1. Retrieve relevant context from vector DB
  const context = await this.knowledgeBase.search(question, {
    nResults: 5,
    where: { userId }
  });

  // 2. Format context for LLM
  const contextText = context
    .map(r => r.document.content)
    .join('\n\n');

  // 3. Generate answer with LLM
  const llm = await this.llmProvider.getLLM();
  const answer = await llm.invoke([
    {
      role: 'system',
      content: `Answer based on this context:\n${contextText}`
    },
    {
      role: 'user',
      content: question
    }
  ]);

  return answer.content;
}
```

### Batch Operations

```typescript
async batchInsert(entities: TechTrendEntity[]): Promise<void> {
  // Use Promise.all for parallel inserts
  await Promise.all(
    entities.map(entity => this.create(entity))
  );
}

// Or chunk for rate limiting
async batchInsertChunked(entities: TechTrendEntity[], chunkSize = 10): Promise<void> {
  for (let i = 0; i < entities.length; i += chunkSize) {
    const chunk = entities.slice(i, i + chunkSize);
    await Promise.all(chunk.map(e => this.create(e)));

    // Optional: Add delay between chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### Similarity Threshold Filtering

```typescript
async findSimilarDocuments(query: string, threshold = 0.7): Promise<TechTrendEntity[]> {
  const results = await this.search(query, { nResults: 20 });

  // Filter by similarity threshold
  return results
    .filter(r => r.score >= threshold)
    .map(r => r.document);
}
```

---

## Performance Tips

1. **Use Caching**: Apply `@Cached()` for expensive searches
2. **Limit Results**: Set appropriate `nResults` to avoid excessive data transfer
3. **Filter First**: Use `where` clauses to filter before vector search
4. **Batch Operations**: Use `Promise.all()` for parallel operations
5. **Index Optimization**: ChromaDB automatically indexes, but consider collection design

---

## Troubleshooting

### Connection Issues

```typescript
// Check ChromaDB is running
$ docker ps | grep chromadb

// Test connection
const health = await chromaDBService.heartbeat();
console.log('ChromaDB health:', health);
```

### Collection Not Found

```typescript
// Manually initialize collection
await repository.ensureInitialized();

// Or set eager initialization
super(Entity, 'collection', chromaDB, registry, {
  initializationStrategy: 'eager',
});
```

### Poor Search Results

```typescript
// Increase nResults
const results = await repository.search(query, { nResults: 20 });

// Check embedding quality
console.log('Document content:', document.content);
// Ensure content is meaningful for embedding

// Try different query phrasing
const results1 = await repository.search('machine learning AI');
const results2 = await repository.search('artificial intelligence ML models');
```

---

## Migration Guide

### From Plain ChromaDB Client

**Before:**

```typescript
const collection = await client.getCollection('my-data');
const results = await collection.query({
  queryTexts: ['search query'],
  nResults: 10,
});
```

**After:**

```typescript
@Injectable()
export class MyRepository extends ChromaDBRepository<MyEntity> {
  async searchData(query: string) {
    return this.search(query, { nResults: 10 });
  }
}
```

---

## Reference

### Key Exports

```typescript
import {
  // Core
  ChromaDBModule,
  ChromaDBService,
  ChromaDBRepository,
  CollectionRegistryService,

  // Decorators
  ChromaEntity,
  ChromaId,
  ChromaProp,
  Cached,
  Profiled,
  Retry,
  VectorQuery,
  TenantAware,

  // Types
  BaseDocument,
  CreateDocumentInput,
  UpsertDocumentInput,
  RepositoryFindOptions,
  RepositorySearchOptions,
  SearchResultWithScore,
} from '@hive-academy/nestjs-chromadb';
```
