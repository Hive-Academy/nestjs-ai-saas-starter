---
trigger: always_on
---

# @hive-academy/nestjs-chromadb

## Overview

Enterprise-grade ChromaDB integration for NestJS with a TypeORM-style repository pattern. Provides semantic search, declarative decorators, and multi-tenancy support.

**Key Features:**

- Repository pattern (`ChromaDBRepository<T>`)
- Declarative decorators (`@VectorQuery`, `@Cached`, `@Profiled`)
- Multi-tenancy support (`@TenantAware`)
- Type-safe vector operations
- Automatic collection initialization

---

## Module Setup

```typescript
@Module({
  imports: [
    ChromaDBModule.forRoot({
      url: process.env.CHROMADB_URL,
      auth: { provider: 'token', credentials: process.env.CHROMADB_TOKEN },
    }),
  ],
})
export class AppModule {}
```

---

## Repository Pattern

### Basic Repository

```typescript
@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  constructor(chromaDB: ChromaDBService, collectionRegistry: CollectionRegistryService) {
    super(TechTrendEntity, 'tech-trends', chromaDB, collectionRegistry);
  }

  // Custom methods
  async findByPopularity(minScore: number): Promise<TechTrendEntity[]> {
    return this.findAll({
      where: { popularity: { $gte: minScore } },
      limit: 10,
    });
  }
}
```

### Available Methods

**CRUD Operations:**

- `findById(id: string)`: Retrieve document by ID
- `findAll(options?: RepositoryFindOptions)`: Query with filtering
- `create(data: CreateDocumentInput<T>)`: Create new document
- `update(id: string, data: Partial<T>)`: Update existing document
- `delete(id: string)`: Remove document
- `upsert(data: UpsertDocumentInput<T>)`: Create or update

**Vector Operations:**

- `search(query: string, options?: RepositorySearchOptions)`: Semantic search

---

## Decorators

### @Cached

Caches method results (Redis/Memory).

```typescript
@Cached({ ttl: 3600000 }) // 1 hour
async analyzeEmergingTechnologies(technologies: string[]) {
  // Expensive operation cached for 1 hour
}
```

### @Profiled

Logs performance metrics.

```typescript
@Profiled({ slowQueryThreshold: 200 })
async complexQuery() {
  // Logs execution time if > 200ms
}
```

### @Retry

Retries failed operations.

```typescript
@Retry({ maxAttempts: 3, strategy: 'exponential' })
async unreliableOperation() {
  // Automatically retries up to 3 times
}
```

### @VectorQuery

Auto-embeds query text for semantic search.

```typescript
@VectorQuery({ collection: 'knowledge-base' })
async searchDocuments(query: string) {
  // Automatically generates embeddings for query
}
```

---

## Entity Definition

```typescript
import { ChromaEntity, ChromaId, ChromaProp } from '@hive-academy/nestjs-chromadb';

@ChromaEntity({ collection: 'tech-trends' })
export class TechTrendEntity extends BaseDocument {
  @ChromaId()
  id!: string;

  @ChromaProp()
  name!: string;

  @ChromaProp()
  category!: string;

  @ChromaProp()
  popularity!: number;
}
```

---

## Real-World Example

From `apps/dev-brand-api/src/app/repositories/chromadb/tech-trends.repository.ts`:

```typescript
@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  @Cached({ ttl: 3600000 })
  @Profiled({ slowQueryThreshold: 200 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeEmergingTechnologies(technologies: string[]): Promise<TrendAnalysis> {
    // Search for similar technologies in vector DB
    const searchResults = await this.search(technologies.join(' '), {
      nResults: 20,
      where: { category: 'emerging' },
    });

    // Analyze trends from results
    const analysis = searchResults.map((result) => ({
      technology: result.document.name,
      similarity: result.score,
      category: result.document.category,
    }));

    return { trends: analysis };
  }

  async findByCategory(category: string): Promise<TechTrendEntity[]> {
    return this.findAll({
      where: { category },
      limit: 50,
    });
  }
}
```

---

## Best Practices

1. **Repository Pattern**: Always extend `ChromaDBRepository<T>` for data access
2. **Type Safety**: Entities must extend `BaseDocument`
3. **Decorators**: Use for cross-cutting concerns (caching, profiling, retry)
4. **Collection Names**: Use kebab-case (`tech-trends`, not `TechTrends`)
5. **Search Optimization**: Set appropriate `nResults` limits

---

## Common Tasks

**Semantic Search:**

```typescript
const results = await repository.search('AI and machine learning', {
  nResults: 10,
  where: { category: 'AI' },
});
```

**Filtering:**

```typescript
const trending = await repository.findAll({
  where: { popularity: { $gte: 80 } },
  limit: 10,
});
```

**Batch Operations:**

```typescript
const documents = [...];
await Promise.all(documents.map(doc => repository.create(doc)));
```
