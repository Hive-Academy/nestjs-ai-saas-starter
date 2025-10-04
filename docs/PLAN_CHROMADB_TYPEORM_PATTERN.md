# ChromaDB Repository Pattern - TypeORM-Style Implementation Plan

**Status**: 🎯 PLANNED
**Priority**: 🔥 CRITICAL
**Effort**: 2-3 days
**Breaking Change**: ✅ YES (Major version bump required)

---

## 🎯 Objective

Refactor `@hive-academy/nestjs-chromadb` to follow **TypeORM/Mongoose-style repository patterns** with auto-generated repositories for vector collections, eliminating manual boilerplate and matching NestJS ecosystem standards.

---

## 🚨 Current Problems

### Problem 1: Manual Collection Service Usage

**Current approach:**

```typescript
@Injectable()
export class VectorMemoryRepository {
  constructor(
    private readonly chromaDB: ChromaDBService // ❌ Manual injection
  ) {}

  async storeMemory(memory: MemoryEntry) {
    // ❌ Manually call collection methods every time
    return this.chromaDB.addDocuments('memories', {
      documents: [memory.content],
      metadatas: [memory.metadata],
      ids: [memory.id],
    });
  }

  async searchMemories(query: string, limit = 10) {
    // ❌ Manually build query parameters
    return this.chromaDB.queryDocuments('memories', {
      queryTexts: [query],
      nResults: limit,
    });
  }

  async getMemory(id: string) {
    // ❌ Manually call get method
    return this.chromaDB.getDocuments('memories', { ids: [id] });
  }

  async deleteMemory(id: string) {
    // ❌ Manually call delete method
    return this.chromaDB.deleteDocuments('memories', { ids: [id] });
  }

  async updateMemory(id: string, updates: Partial<MemoryEntry>) {
    // ❌ Manually call update method
    return this.chromaDB.updateDocuments('memories', {
      ids: [id],
      documents: updates.content ? [updates.content] : undefined,
      metadatas: updates.metadata ? [updates.metadata] : undefined,
    });
  }
}

// ❌ Manual registration
@Module({
  providers: [VectorMemoryRepository],
  exports: [VectorMemoryRepository],
})
export class MemoryModule {}
```

### Problem 2: No Type Safety for Collections

```typescript
// ❌ Collection name is just a string - typos possible
await chromaDB.addDocuments('memoriess', data); // Typo!

// ❌ No type checking for metadata
await chromaDB.addDocuments('memories', {
  metadatas: [{ invalidField: 123 }], // No validation
});
```

### Problem 3: Repetitive Boilerplate

Every repository that uses ChromaDB must:

1. Inject `ChromaDBService`
2. Manually specify collection name in every method
3. Manually build query parameters
4. Manually handle document/metadata mapping

---

## ✅ Target Solution (TypeORM-Style)

### Example 1: Define Collection Entity

```typescript
/**
 * ChromaDB Collection Entity
 *
 * Defines the schema for a ChromaDB vector collection
 */
@ChromaDBCollection('memories') // ✅ Collection name
export class MemoryDocument {
  @ChromaDBId()
  id: string;

  @ChromaDBDocument() // ✅ Main document content (embedded)
  content: string;

  @ChromaDBMetadata() // ✅ Metadata fields
  userId?: string;

  @ChromaDBMetadata()
  timestamp?: Date;

  @ChromaDBMetadata()
  tags?: string[];

  @ChromaDBMetadata()
  agentId?: string;

  @ChromaDBEmbedding() // ✅ Optional: custom embeddings
  embedding?: number[];
}
```

### Example 2: Auto-Generated Repository (Zero Boilerplate)

```typescript
// 1. Register collections in module
@Module({
  imports: [
    ChromaDBModule.forFeature([MemoryDocument, KnowledgeDocument]), // ✅ Auto-generates repos
  ],
  providers: [MemoryService],
})
export class MemoryModule {}

// 2. Inject and use repository (WORKS IMMEDIATELY)
@Injectable()
export class MemoryService {
  constructor(
    @InjectCollection(MemoryDocument) // ✅ Auto-injection!
    private memoryRepo: ChromaDBRepository<MemoryDocument> // ✅ Fully functional
  ) {}

  async storeMemory(memory: MemoryDocument) {
    // ✅ Type-safe, works immediately
    return this.memoryRepo.add(memory);
  }

  async searchMemories(query: string, limit = 10) {
    // ✅ Simple, type-safe query
    return this.memoryRepo.query({
      queryTexts: [query],
      nResults: limit,
    });
  }

  async getMemory(id: string) {
    // ✅ Simple get by ID
    return this.memoryRepo.get(id);
  }

  async deleteMemory(id: string) {
    // ✅ Simple delete
    return this.memoryRepo.delete(id);
  }

  async updateMemory(id: string, updates: Partial<MemoryDocument>) {
    // ✅ Type-safe update
    return this.memoryRepo.update(id, updates);
  }

  async filterByUser(userId: string) {
    // ✅ Metadata filtering
    return this.memoryRepo.query({
      where: { userId },
    });
  }
}
```

### Example 3: Custom Repository for Complex Operations

```typescript
/**
 * Custom repository extending base ChromaDB repository
 */
@Injectable()
export class MemoryCustomRepository extends ChromaDBRepository<MemoryDocument> {
  // ✅ Inherits ALL CRUD methods: add, get, update, delete, query, count, etc.

  /**
   * Custom method: Semantic search with re-ranking
   */
  async semanticSearchWithRerank(query: string, userId: string, limit = 10): Promise<MemoryDocument[]> {
    // ✅ Use base query method
    const results = await this.query({
      queryTexts: [query],
      nResults: limit * 2, // Get more for re-ranking
      where: { userId },
    });

    // Custom re-ranking logic
    return this.rerankResults(results, query).slice(0, limit);
  }

  /**
   * Custom method: Get conversation thread
   */
  async getConversationThread(agentId: string, startTime: Date, endTime: Date): Promise<MemoryDocument[]> {
    return this.query({
      where: {
        agentId,
        timestamp: {
          $gte: startTime.toISOString(),
          $lte: endTime.toISOString(),
        },
      },
      nResults: 1000,
    });
  }

  /**
   * Custom method: Batch add with auto-embedding
   */
  async batchAddMemories(memories: MemoryDocument[]): Promise<void> {
    // ✅ Use base batch operations
    await this.addBatch(memories);
  }

  private rerankResults(results: any[], query: string): MemoryDocument[] {
    // Custom re-ranking logic
    return results;
  }
}

// Register custom repository
@Module({
  imports: [ChromaDBModule.forFeature([MemoryDocument])],
  providers: [
    {
      provide: getCollectionToken(MemoryDocument),
      useClass: MemoryCustomRepository, // ✅ Replace default
    },
  ],
})
export class MemoryModule {}
```

---

## 📋 Implementation Plan

### Phase 1: Core Infrastructure (1.5 days)

#### Step 1.1: Create Collection Decorators

**File**: `libs/nestjs-chromadb/src/lib/decorators/collection.decorators.ts`

````typescript
import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for ChromaDB collection entities
 */
export const CHROMADB_COLLECTION_METADATA = 'chromadb:collection';
export const CHROMADB_ID_METADATA = 'chromadb:id';
export const CHROMADB_DOCUMENT_METADATA = 'chromadb:document';
export const CHROMADB_METADATA_FIELD = 'chromadb:metadata';
export const CHROMADB_EMBEDDING_METADATA = 'chromadb:embedding';

/**
 * Mark class as ChromaDB collection entity
 *
 * @example
 * ```typescript
 * @ChromaDBCollection('memories')
 * export class MemoryDocument {
 *   @ChromaDBId() id: string;
 *   @ChromaDBDocument() content: string;
 *   @ChromaDBMetadata() userId: string;
 * }
 * ```
 */
export function ChromaDBCollection(collectionName: string): ClassDecorator {
  return (target: Function) => {
    SetMetadata(CHROMADB_COLLECTION_METADATA, collectionName)(target);
  };
}

/**
 * Mark property as ID field
 */
export function ChromaDBId(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(CHROMADB_ID_METADATA, true, target, propertyKey);
  };
}

/**
 * Mark property as document content field
 */
export function ChromaDBDocument(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(CHROMADB_DOCUMENT_METADATA, true, target, propertyKey);
  };
}

/**
 * Mark property as metadata field
 */
export function ChromaDBMetadata(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const existingMetadata = Reflect.getMetadata(CHROMADB_METADATA_FIELD, target) || [];
    Reflect.defineMetadata(CHROMADB_METADATA_FIELD, [...existingMetadata, propertyKey], target);
  };
}

/**
 * Mark property as embedding field (optional)
 */
export function ChromaDBEmbedding(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(CHROMADB_EMBEDDING_METADATA, true, target, propertyKey);
  };
}
````

#### Step 1.2: Create Base Repository Class

**File**: `libs/nestjs-chromadb/src/lib/repositories/chromadb-repository.ts`

````typescript
import { Type } from '@nestjs/common';
import { ChromaDBService } from '../services/chromadb.service';
import { CHROMADB_COLLECTION_METADATA, CHROMADB_ID_METADATA, CHROMADB_DOCUMENT_METADATA, CHROMADB_METADATA_FIELD, CHROMADB_EMBEDDING_METADATA } from '../decorators/collection.decorators';

export interface ChromaDBQueryOptions {
  queryTexts?: string[];
  queryEmbeddings?: number[][];
  nResults?: number;
  where?: Record<string, any>;
  whereDocument?: Record<string, any>;
  include?: ('documents' | 'metadatas' | 'embeddings' | 'distances')[];
}

export interface ChromaDBGetOptions {
  ids?: string[];
  where?: Record<string, any>;
  whereDocument?: Record<string, any>;
  limit?: number;
  offset?: number;
  include?: ('documents' | 'metadatas' | 'embeddings')[];
}

/**
 * Base ChromaDB Repository
 *
 * Provides ALL vector operations automatically for any ChromaDB collection entity.
 * Extend this class to add custom semantic search logic.
 *
 * @example Simple Usage (Auto-injected)
 * ```typescript
 * @Module({
 *   imports: [ChromaDBModule.forFeature([MemoryDocument])]
 * })
 * class MemoryModule {}
 *
 * @Injectable()
 * class MemoryService {
 *   constructor(
 *     @InjectCollection(MemoryDocument)
 *     private memoryRepo: ChromaDBRepository<MemoryDocument>
 *   ) {}
 *
 *   async storeMemory(memory: MemoryDocument) {
 *     return this.memoryRepo.add(memory);  // ✅ Works immediately
 *   }
 * }
 * ```
 *
 * @example Custom Repository (Extend Base)
 * ```typescript
 * @Injectable()
 * class MemoryCustomRepository extends ChromaDBRepository<MemoryDocument> {
 *   async semanticSearch(query: string, userId: string) {
 *     return this.query({
 *       queryTexts: [query],
 *       where: { userId },
 *       nResults: 10
 *     });
 *   }
 * }
 * ```
 */
export class ChromaDBRepository<T> {
  protected readonly collectionName: string;
  protected readonly idField: string;
  protected readonly documentField: string;
  protected readonly metadataFields: string[];
  protected readonly embeddingField?: string;

  constructor(protected readonly entity: Type<T>, protected readonly chromaDB: ChromaDBService) {
    this.collectionName = this.getCollectionName();
    this.idField = this.getIdField();
    this.documentField = this.getDocumentField();
    this.metadataFields = this.getMetadataFields();
    this.embeddingField = this.getEmbeddingField();
  }

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  /**
   * Add single document to collection
   */
  async add(document: T): Promise<void> {
    const doc = this.mapEntityToChroma(document);
    await this.chromaDB.addDocuments(this.collectionName, {
      ids: [doc.id],
      documents: [doc.document],
      metadatas: [doc.metadata],
      embeddings: doc.embedding ? [doc.embedding] : undefined,
    });
  }

  /**
   * Add multiple documents in batch
   */
  async addBatch(documents: T[]): Promise<void> {
    const mapped = documents.map((d) => this.mapEntityToChroma(d));
    await this.chromaDB.addDocuments(this.collectionName, {
      ids: mapped.map((d) => d.id),
      documents: mapped.map((d) => d.document),
      metadatas: mapped.map((d) => d.metadata),
      embeddings: mapped[0]?.embedding ? mapped.map((d) => d.embedding!) : undefined,
    });
  }

  /**
   * Get document by ID
   */
  async get(id: string): Promise<T | null> {
    const result = await this.chromaDB.getDocuments(this.collectionName, {
      ids: [id],
      include: ['documents', 'metadatas', 'embeddings'],
    });

    if (!result.ids || result.ids.length === 0) {
      return null;
    }

    return this.mapChromaToEntity({
      id: result.ids[0],
      document: result.documents?.[0] || '',
      metadata: result.metadatas?.[0] || {},
      embedding: result.embeddings?.[0],
    });
  }

  /**
   * Get multiple documents
   */
  async getMany(options?: ChromaDBGetOptions): Promise<T[]> {
    const result = await this.chromaDB.getDocuments(this.collectionName, {
      ids: options?.ids,
      where: options?.where,
      whereDocument: options?.whereDocument,
      limit: options?.limit,
      offset: options?.offset,
      include: options?.include || ['documents', 'metadatas', 'embeddings'],
    });

    if (!result.ids) return [];

    return result.ids.map((id, index) =>
      this.mapChromaToEntity({
        id,
        document: result.documents?.[index] || '',
        metadata: result.metadatas?.[index] || {},
        embedding: result.embeddings?.[index],
      })
    );
  }

  /**
   * Update document by ID
   */
  async update(id: string, updates: Partial<T>): Promise<void> {
    const mapped = this.mapEntityToChroma(updates as T, id);
    await this.chromaDB.updateDocuments(this.collectionName, {
      ids: [id],
      documents: mapped.document ? [mapped.document] : undefined,
      metadatas: Object.keys(mapped.metadata).length > 0 ? [mapped.metadata] : undefined,
      embeddings: mapped.embedding ? [mapped.embedding] : undefined,
    });
  }

  /**
   * Delete document by ID
   */
  async delete(id: string): Promise<void> {
    await this.chromaDB.deleteDocuments(this.collectionName, { ids: [id] });
  }

  /**
   * Delete multiple documents
   */
  async deleteBatch(ids: string[]): Promise<void> {
    await this.chromaDB.deleteDocuments(this.collectionName, { ids });
  }

  /**
   * Delete documents matching criteria
   */
  async deleteWhere(where: Record<string, any>): Promise<void> {
    await this.chromaDB.deleteDocuments(this.collectionName, { where });
  }

  // ============================================================================
  // VECTOR SEARCH OPERATIONS
  // ============================================================================

  /**
   * Semantic search with query text
   */
  async query(options: ChromaDBQueryOptions): Promise<T[]> {
    const result = await this.chromaDB.queryDocuments(this.collectionName, {
      queryTexts: options.queryTexts,
      queryEmbeddings: options.queryEmbeddings,
      nResults: options.nResults || 10,
      where: options.where,
      whereDocument: options.whereDocument,
      include: options.include || ['documents', 'metadatas', 'embeddings', 'distances'],
    });

    if (!result.ids || !result.ids[0]) return [];

    return result.ids[0].map((id, index) =>
      this.mapChromaToEntity({
        id,
        document: result.documents?.[0]?.[index] || '',
        metadata: result.metadatas?.[0]?.[index] || {},
        embedding: result.embeddings?.[0]?.[index],
      })
    );
  }

  /**
   * Search with multiple query texts (batch)
   */
  async queryBatch(queries: string[], nResults = 10): Promise<T[][]> {
    const result = await this.chromaDB.queryDocuments(this.collectionName, {
      queryTexts: queries,
      nResults,
      include: ['documents', 'metadatas', 'embeddings'],
    });

    if (!result.ids) return [];

    return result.ids.map((ids, queryIndex) =>
      ids.map((id, docIndex) =>
        this.mapChromaToEntity({
          id,
          document: result.documents?.[queryIndex]?.[docIndex] || '',
          metadata: result.metadatas?.[queryIndex]?.[docIndex] || {},
          embedding: result.embeddings?.[queryIndex]?.[docIndex],
        })
      )
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Count documents in collection
   */
  async count(where?: Record<string, any>): Promise<number> {
    const result = await this.chromaDB.getDocuments(this.collectionName, {
      where,
      include: [], // Don't fetch data, just count
    });
    return result.ids?.length || 0;
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    const doc = await this.get(id);
    return doc !== null;
  }

  /**
   * Get collection name
   */
  getCollectionName(): string {
    return Reflect.getMetadata(CHROMADB_COLLECTION_METADATA, this.entity) || 'default';
  }

  /**
   * Peek at first N documents
   */
  async peek(limit = 10): Promise<T[]> {
    const result = await this.chromaDB.peekDocuments(this.collectionName, limit);

    if (!result.ids) return [];

    return result.ids.map((id, index) =>
      this.mapChromaToEntity({
        id,
        document: result.documents?.[index] || '',
        metadata: result.metadatas?.[index] || {},
        embedding: result.embeddings?.[index],
      })
    );
  }

  // ============================================================================
  // PRIVATE MAPPING METHODS
  // ============================================================================

  private getIdField(): string {
    const prototype = this.entity.prototype;
    const properties = Object.getOwnPropertyNames(prototype);

    for (const prop of properties) {
      if (Reflect.getMetadata(CHROMADB_ID_METADATA, prototype, prop)) {
        return prop;
      }
    }

    return 'id'; // Default
  }

  private getDocumentField(): string {
    const prototype = this.entity.prototype;
    const properties = Object.getOwnPropertyNames(prototype);

    for (const prop of properties) {
      if (Reflect.getMetadata(CHROMADB_DOCUMENT_METADATA, prototype, prop)) {
        return prop;
      }
    }

    return 'content'; // Default
  }

  private getMetadataFields(): string[] {
    const prototype = this.entity.prototype;
    return Reflect.getMetadata(CHROMADB_METADATA_FIELD, prototype) || [];
  }

  private getEmbeddingField(): string | undefined {
    const prototype = this.entity.prototype;
    const properties = Object.getOwnPropertyNames(prototype);

    for (const prop of properties) {
      if (Reflect.getMetadata(CHROMADB_EMBEDDING_METADATA, prototype, prop)) {
        return prop;
      }
    }

    return undefined;
  }

  private mapEntityToChroma(
    entity: T,
    overrideId?: string
  ): {
    id: string;
    document: string;
    metadata: Record<string, any>;
    embedding?: number[];
  } {
    const obj = entity as any;

    return {
      id: overrideId || obj[this.idField],
      document: obj[this.documentField] || '',
      metadata: this.metadataFields.reduce((acc, field) => {
        if (obj[field] !== undefined) {
          acc[field] = obj[field];
        }
        return acc;
      }, {} as Record<string, any>),
      embedding: this.embeddingField ? obj[this.embeddingField] : undefined,
    };
  }

  private mapChromaToEntity(data: { id: string; document: string; metadata: Record<string, any>; embedding?: number[] }): T {
    const entity: any = {};

    entity[this.idField] = data.id;
    entity[this.documentField] = data.document;

    for (const field of this.metadataFields) {
      if (data.metadata[field] !== undefined) {
        entity[field] = data.metadata[field];
      }
    }

    if (this.embeddingField && data.embedding) {
      entity[this.embeddingField] = data.embedding;
    }

    return entity as T;
  }
}
````

#### Step 1.3: Create Injection Decorators

**File**: `libs/nestjs-chromadb/src/lib/decorators/inject-collection.decorator.ts`

````typescript
import { Inject, Type } from '@nestjs/common';
import { CHROMADB_COLLECTION_METADATA } from './collection.decorators';

/**
 * Get collection injection token for entity
 */
export function getCollectionToken(entity: Type<any>): string {
  const collectionName = Reflect.getMetadata(CHROMADB_COLLECTION_METADATA, entity) || 'default';
  return `${collectionName}Collection`;
}

/**
 * Inject ChromaDB repository for collection entity
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MemoryService {
 *   constructor(
 *     @InjectCollection(MemoryDocument)
 *     private memoryRepo: ChromaDBRepository<MemoryDocument>
 *   ) {}
 * }
 * ```
 */
export function InjectCollection(entity: Type<any>): ParameterDecorator {
  return Inject(getCollectionToken(entity));
}
````

#### Step 1.4: Update ChromaDBModule with forFeature()

**File**: `libs/nestjs-chromadb/src/lib/chromadb.module.ts`

````typescript
import { DynamicModule, Module, Type, Provider } from '@nestjs/common';
import { ChromaDBService } from './services/chromadb.service';
import { ChromaDBRepository } from './repositories/chromadb-repository';
import { getCollectionToken } from './decorators/inject-collection.decorator';
import { ChromaDBModuleOptions, ChromaDBModuleAsyncOptions } from './interfaces';

@Module({})
export class ChromaDBModule {
  /**
   * Register ChromaDB module globally with configuration
   */
  static forRoot(options: ChromaDBModuleOptions): DynamicModule {
    return {
      module: ChromaDBModule,
      global: true,
      providers: [
        {
          provide: 'CHROMADB_OPTIONS',
          useValue: options,
        },
        ChromaDBService,
      ],
      exports: [ChromaDBService],
    };
  }

  /**
   * Register ChromaDB module with async configuration
   */
  static forRootAsync(options: ChromaDBModuleAsyncOptions): DynamicModule {
    return {
      module: ChromaDBModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: 'CHROMADB_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        ChromaDBService,
      ],
      exports: [ChromaDBService],
    };
  }

  /**
   * Register collection repositories (TypeORM-style)
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     ChromaDBModule.forFeature([MemoryDocument, KnowledgeDocument])
   *   ]
   * })
   * export class MemoryModule {}
   * ```
   */
  static forFeature(entities: Type<any>[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => {
      const token = getCollectionToken(entity);

      return {
        provide: token,
        useFactory: (chromaDB: ChromaDBService) => {
          // ✅ Auto-generate repository instance
          return new ChromaDBRepository(entity, chromaDB);
        },
        inject: [ChromaDBService],
      };
    });

    return {
      module: ChromaDBModule,
      providers,
      exports: providers,
    };
  }
}
````

### Phase 2: Migration & Examples (1 day)

#### Step 2.1: Update VectorMemoryRepository

**File**: `apps/dev-brand-api/src/app/entities/chromadb/memory-document.entity.ts`

```typescript
import { ChromaDBCollection, ChromaDBId, ChromaDBDocument, ChromaDBMetadata } from '@hive-academy/nestjs-chromadb';

@ChromaDBCollection('memories')
export class MemoryDocument {
  @ChromaDBId()
  id: string;

  @ChromaDBDocument()
  content: string;

  @ChromaDBMetadata()
  userId?: string;

  @ChromaDBMetadata()
  agentId?: string;

  @ChromaDBMetadata()
  executionId?: string;

  @ChromaDBMetadata()
  timestamp?: string;

  @ChromaDBMetadata()
  tags?: string[];

  @ChromaDBMetadata()
  type?: string;
}
```

**File**: `apps/dev-brand-api/src/app/repositories/chromadb/vector-memory.repository.ts`

```typescript
// BEFORE (current)
@Injectable()
export class VectorMemoryRepository {
  constructor(private readonly chromaDB: ChromaDBService) {}

  async storeMemory(memory: MemoryEntry) {
    return this.chromaDB.addDocuments('memories', {
      documents: [memory.content],
      metadatas: [memory.metadata],
      ids: [memory.id],
    });
  }
  // ... 200+ lines of manual methods
}

// AFTER (TypeORM-style)
@Injectable()
export class VectorMemoryRepository extends ChromaDBRepository<MemoryDocument> {
  // ✅ Inherits ALL CRUD methods

  // ✅ Add ONLY custom semantic search logic
  async semanticSearchWithContext(query: string, userId: string, limit = 10): Promise<MemoryDocument[]> {
    return this.query({
      queryTexts: [query],
      where: { userId },
      nResults: limit,
    });
  }

  async getConversationHistory(agentId: string, limit = 50): Promise<MemoryDocument[]> {
    return this.getMany({
      where: { agentId },
      limit,
      include: ['documents', 'metadatas'],
    });
  }
}
```

#### Step 2.2: Update Module Registration

**File**: `apps/dev-brand-api/src/app/repositories/repository.module.ts`

```typescript
// BEFORE
@Module({
  providers: [VectorMemoryRepository],
  exports: [VectorMemoryRepository],
})
export class RepositoryModule {}

// AFTER
@Module({
  imports: [ChromaDBModule.forFeature([MemoryDocument, KnowledgeDocument])],
  providers: [
    {
      provide: getCollectionToken(MemoryDocument),
      useClass: VectorMemoryRepository, // ✅ Custom repository
    },
  ],
  exports: [getCollectionToken(MemoryDocument)],
})
export class RepositoryModule {}
```

### Phase 3: Documentation & Testing (0.5 days)

#### Step 3.1: Update CLAUDE.md

Add section on TypeORM-style repository pattern with collection entities, decorators, and auto-injection examples.

#### Step 3.2: Add Integration Tests

Test auto-generated repositories, custom repositories, and collection entity mapping.

---

## 📊 Success Metrics

### Code Reduction

- **Before**: 200+ lines per repository (manual ChromaDB calls)
- **After**: ~50 lines per repository (custom logic only)
- **Savings**: 150 lines per repository

### Type Safety

- ✅ Collection names are type-safe (no typos)
- ✅ Metadata fields are validated
- ✅ Document structure is enforced

### Developer Experience

- ✅ Zero boilerplate for basic operations
- ✅ Matches TypeORM/Mongoose patterns
- ✅ Auto-injection with `@InjectCollection()`
- ✅ Full TypeScript type safety

---

## 🚀 Rollout Plan

### Week 1: Implementation

- Days 1-1.5: Phase 1 (Core Infrastructure)
- Day 2: Phase 2 (Migration & Examples)
- Day 2.5: Phase 3 (Documentation & Testing)

### Week 2: Release

- Day 3: Beta testing
- Day 4: v2.0.0 release

---

## ⚠️ Breaking Changes Checklist

- [ ] Major version bump: v1.x → v2.0.0
- [ ] Migration guide published
- [ ] Deprecation warnings in v1.x
- [ ] Example applications updated
- [ ] Documentation reflects new patterns
