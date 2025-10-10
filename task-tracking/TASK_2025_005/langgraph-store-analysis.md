# LangGraph Store Architecture Analysis

**Date**: 2025-10-10
**Task**: TASK_2025_005
**Phase**: Phase 1.4 (NEW - Prerequisite for Phase 2)

---

## 🔴 CRITICAL ISSUE IDENTIFIED

### Current Implementation Problem

The `ChromaLangGraphStore` implementation has a **critical architectural flaw** that prevents it from working correctly:

**Location**: `apps/dev-brand-api/src/app/adapters/memory/chroma-vector.adapter.ts:590`

```typescript
getLangGraphStore(collection = 'langgraph_store'): ChromaLangGraphStore {
  return new ChromaLangGraphStore(this, collection);
}
```

**The Problem**:

1. `ChromaLangGraphStore` calls `this.vectorService.store(this.collection, ...)` with collection='langgraph_store'
2. BUT `ChromaVectorAdapter` **IGNORES** the collection parameter (all operations go to 'vector-memories')
3. **Result**: LangGraph Store data gets incorrectly stored in 'vector-memories' collection
4. **Impact**: Data corruption, cross-thread memory sharing broken, namespace isolation violated

---

## 📊 Understanding the Two Storage Systems

### System 1: vector-memories (Thread-Specific Memory)

**Purpose**: Store per-thread conversation memories for context continuity

**Data Model**:

```typescript
interface VectorMemoryMetadata {
  threadId: string;
  userId: string;
  agentId: string;
  importance: number;
  classification: string;
  timestamp: string;
}

interface MemoryEntry {
  id: string;
  threadId: string;
  content: string;
  metadata: MemoryMetadata;
  createdAt: Date;
  accessCount: number;
}
```

**Use Cases**:

- Store: "User asked about pricing in thread-123"
- Retrieve: Get last 10 messages from current thread
- Search: Find similar conversations in this thread
- Lifecycle: Tied to specific conversation threads

**Current Entity**: `VectorMemoryEntity` → Collection: 'vector-memories'

---

### System 2: langgraph-store (Cross-Thread Persistent Data)

**Purpose**: Store data that persists across threads and agents (LangGraph 2025 Store API)

**Data Model**:

```typescript
interface LangGraphStoreMetadata {
  namespace: string; // 'user/user-123/preferences'
  key: string; // 'theme'
  full_key: string; // 'user/user-123/preferences/theme'
  created_at: string;
  updated_at: string;
  type: 'store_item';
  namespace_depth: number;
  namespace_root: string;
  value_type: string;
  serialized_length: number;
}

interface Item {
  value: unknown; // Arbitrary JSON data
  key: string;
  namespace: string[];
  created_at: string;
  updated_at: string;
}
```

**Use Cases**:

- Store: User preferences accessible from any thread
  ```typescript
  await store.put(['user', 'user-123', 'preferences'], 'theme', { mode: 'dark', fontSize: 14 });
  ```
- Retrieve: Get user settings in new conversation
  ```typescript
  const theme = await store.get(['user', 'user-123', 'preferences'], 'theme');
  ```
- Search: Find all user preferences semantically
  ```typescript
  const results = await store.search(['user', 'user-123'], 'dark mode settings');
  ```
- Lifecycle: Long-term persistent, cross-thread, cross-agent

**Current Entity**: ❌ **MISSING** → Should be: 'langgraph-store'

---

## ✅ RECOMMENDED SOLUTION

### Architecture: Multi-Collection Repository Pattern

**Approach**: Create dedicated entity and repository for LangGraph Store, following the established pattern from VectorMemoryRepository.

---

### Implementation Plan

#### Step 1: Create LangGraphStoreEntity

**File**: `apps/dev-brand-api/src/app/entities/chromadb/langgraph-store.entity.ts`

```typescript
import { ChromaEntity, ChromaId, ChromaProp, BaseChromaEntity } from '@hive-academy/nestjs-chromadb';

/**
 * Metadata structure for LangGraph Store items
 * Compliant with LangGraph 2025 Store specification
 */
export interface LangGraphStoreMetadata {
  /** Hierarchical namespace (e.g., 'user/user-123/preferences') */
  namespace: string;

  /** Item key within namespace */
  key: string;

  /** Full key including namespace (used as document ID) */
  full_key: string;

  /** ISO timestamp when item was created */
  created_at: string;

  /** ISO timestamp when item was last updated */
  updated_at: string;

  /** Type discriminator (always 'store_item') */
  type: 'store_item';

  /** Namespace depth for optimization */
  namespace_depth: number;

  /** Root namespace segment for indexing */
  namespace_root: string;

  /** JavaScript typeof the stored value */
  value_type: string;

  /** Length of serialized JSON value */
  serialized_length: number;
}

/**
 * LangGraph Store Entity - ChromaDB representation
 *
 * Purpose: Cross-thread persistent data storage with namespace organization
 * Collection: 'langgraph-store'
 *
 * Key Differences from VectorMemoryEntity:
 * - Content is JSON.stringify(arbitrary value) vs structured memory text
 * - ID is namespace/key combination vs generated UUID
 * - Metadata tracks namespace hierarchy vs thread/user/agent
 * - Lifecycle is persistent vs thread-bound
 */
@ChromaEntity({
  collection: 'langgraph-store',
  autoEmbed: true, // Enable semantic search within namespaces
  autoTimestamp: false, // Manual timestamp management (created_at/updated_at)
})
export class LangGraphStoreEntity extends BaseChromaEntity<LangGraphStoreMetadata> {
  @ChromaId()
  id!: string; // full_key: 'user/user-123/preferences/theme'

  @ChromaProp()
  content!: string; // JSON.stringify(value)

  metadata!: LangGraphStoreMetadata;

  embedding?: readonly number[]; // Auto-generated for semantic search
}
```

---

#### Step 2: Create LangGraphStoreRepository

**File**: `apps/dev-brand-api/src/app/repositories/chromadb/langgraph-store.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaDBRepository, ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { LangGraphStoreEntity } from '../../entities/chromadb/langgraph-store.entity';
import type { Item } from '@hive-academy/langgraph-memory';

/**
 * LangGraphStoreRepository - ChromaDB Repository for LangGraph Store API
 *
 * Purpose: Type-safe repository for cross-thread persistent data storage
 * Pattern: TypeORM-Style Repository with explicit constructor-based DI
 *
 * Follows the same pattern as VectorMemoryRepository:
 * - Extends ChromaDBRepository<T> for automatic CRUD operations
 * - Explicit 3-parameter constructor (entity, collection, chromaDB)
 * - NO decorator magic - clear dependency injection
 * - Full type safety with LangGraphStoreEntity
 *
 * Inherited CRUD Methods (from ChromaDBRepository):
 * - create, createMany, findById, findByIds, findAll
 * - search, searchWithScores, searchSimilar
 * - update, updateMany, upsert, upsertMany
 * - delete, deleteMany, deleteByFilter, clear
 * - count, exists, peek, getCollectionInfo
 */
@Injectable()
export class LangGraphStoreRepository extends ChromaDBRepository<LangGraphStoreEntity> {
  /**
   * Explicit constructor with proper DI
   *
   * @param chromaDB - ChromaDBService injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(LangGraphStoreEntity, 'langgraph-store', chromaDB);
  }

  // ============================================
  // Custom Business Methods for Store API
  // ============================================

  /**
   * Put item in store (create or update)
   * Implements LangGraph Store.put() semantics
   */
  async putItem(namespace: string[], key: string, value: unknown): Promise<void> {
    const namespaceKey = namespace.join('/');
    const fullKey = `${namespaceKey}/${key}`;
    const now = new Date().toISOString();

    // Check if item exists to preserve created_at
    const existing = await this.findById(fullKey);
    const createdAt = existing?.metadata.created_at || now;

    await this.upsert({
      id: fullKey,
      content: JSON.stringify(value),
      metadata: {
        namespace: namespaceKey,
        key,
        full_key: fullKey,
        created_at: createdAt,
        updated_at: now,
        type: 'store_item',
        namespace_depth: namespace.length,
        namespace_root: namespace[0] || 'default',
        value_type: typeof value,
        serialized_length: JSON.stringify(value).length,
      },
    });
  }

  /**
   * Get item from store
   * Implements LangGraph Store.get() semantics
   */
  async getItem(namespace: string[], key: string): Promise<Item | null> {
    const fullKey = `${namespace.join('/')}/${key}`;
    const entity = await this.findById(fullKey);

    if (!entity) return null;

    return {
      value: JSON.parse(entity.content),
      key: entity.metadata.key,
      namespace: entity.metadata.namespace.split('/'),
      created_at: entity.metadata.created_at,
      updated_at: entity.metadata.updated_at,
    };
  }

  /**
   * Delete item from store
   * Implements LangGraph Store.delete() semantics
   */
  async deleteItem(namespace: string[], key: string): Promise<void> {
    const fullKey = `${namespace.join('/')}/${key}`;
    await this.delete(fullKey);
  }

  /**
   * List all items in namespace
   * Implements LangGraph Store.list() semantics
   */
  async listItems(namespace: string[]): Promise<Item[]> {
    const namespaceKey = namespace.join('/');

    const entities = await this.findAll({
      where: { namespace: namespaceKey, type: 'store_item' } as any,
      limit: 1000,
    });

    return entities.map((entity) => ({
      value: JSON.parse(entity.content),
      key: entity.metadata.key,
      namespace: entity.metadata.namespace.split('/'),
      created_at: entity.metadata.created_at,
      updated_at: entity.metadata.updated_at,
    }));
  }

  /**
   * Search items in namespace with semantic query
   * Implements LangGraph Store.search() semantics
   */
  async searchItems(namespace: string[], query: string): Promise<Item[]> {
    const namespaceKey = namespace.join('/');

    const results = await this.searchWithScores(query, {
      where: { namespace: namespaceKey, type: 'store_item' } as any,
      limit: 50,
    });

    return results.map((result) => ({
      value: JSON.parse(result.document.content),
      key: result.document.metadata.key,
      namespace: result.document.metadata.namespace.split('/'),
      created_at: result.document.metadata.created_at,
      updated_at: result.document.metadata.updated_at,
    }));
  }
}
```

---

#### Step 3: Register Entity and Repository

**File**: `apps/dev-brand-api/src/app/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { LangGraphStoreEntity } from './entities/chromadb/langgraph-store.entity';
import { LangGraphStoreRepository } from './repositories/chromadb/langgraph-store.repository';
import { VectorMemoryEntity } from './entities/chromadb/vector-memory.entity';

@Module({
  imports: [
    // Register BOTH entities for proper collection management
    ChromaDBModule.forFeature([
      VectorMemoryEntity, // 'vector-memories' collection
      LangGraphStoreEntity, // 'langgraph-store' collection
    ]),
  ],
  providers: [
    LangGraphStoreRepository, // Make available for injection
    // ... other providers
  ],
  exports: [LangGraphStoreRepository],
})
export class AppModule {}
```

---

#### Step 4: Update ChromaVectorAdapter to Support LangGraph Store

**Option A: Multi-Collection Adapter (RECOMMENDED)**

**File**: `apps/dev-brand-api/src/app/adapters/memory/chroma-vector.adapter.ts`

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getRepositoryToken as getChromaRepositoryToken } from '@hive-academy/nestjs-chromadb';
import { VectorMemoryEntity } from '../../entities/chromadb/vector-memory.entity';
import { LangGraphStoreEntity } from '../../entities/chromadb/langgraph-store.entity';
import { VectorMemoryRepository } from '../../repositories/chromadb/vector-memory.repository';
import { LangGraphStoreRepository } from '../../repositories/chromadb/langgraph-store.repository';

@Injectable()
export class ChromaVectorAdapter extends IVectorService {
  private readonly logger = new Logger(ChromaVectorAdapter.name);

  constructor(
    @Inject(getChromaRepositoryToken(VectorMemoryEntity))
    private readonly vectorMemoryRepo: VectorMemoryRepository,

    @Inject(getChromaRepositoryToken(LangGraphStoreEntity))
    private readonly langGraphStoreRepo: LangGraphStoreRepository
  ) {
    super();
  }

  /**
   * Store document - routes to correct repository based on collection
   */
  override async store(collection: string, data: VectorStoreData): Promise<string> {
    // Route to LangGraph Store repository
    if (collection === 'langgraph-store' || collection === 'langgraph_store') {
      return this.storeLangGraphItem(data);
    }

    // Default to vector-memories repository
    return this.storeVectorMemory(data);
  }

  /**
   * Store in vector-memories collection
   */
  private async storeVectorMemory(data: VectorStoreData): Promise<string> {
    // Existing implementation (unchanged)
    // ...
  }

  /**
   * Store in langgraph-store collection
   */
  private async storeLangGraphItem(data: VectorStoreData): Promise<string> {
    const entity = await this.langGraphStoreRepo.create({
      id: data.id,
      content: data.document,
      embedding: data.embedding ? [...data.embedding] : undefined,
      metadata: data.metadata as any,
    });

    this.logger.debug(`Stored LangGraph Store item ${entity.id}`);
    return entity.id;
  }

  /**
   * Search - routes to correct repository based on collection
   */
  override async search(collection: string, query: VectorSearchQuery): Promise<readonly VectorSearchResult[]> {
    // Route to LangGraph Store repository
    if (collection === 'langgraph-store' || collection === 'langgraph_store') {
      return this.searchLangGraphStore(query);
    }

    // Default to vector-memories repository
    return this.searchVectorMemories(query);
  }

  // ... implement routing for all IVectorService methods

  /**
   * Get LangGraph Store interface - now properly configured
   */
  getLangGraphStore(collection = 'langgraph_store'): ChromaLangGraphStore {
    // Now this will work correctly because adapter routes by collection
    return new ChromaLangGraphStore(this, collection);
  }
}
```

**Benefits**:

- ✅ Single adapter handles both collections
- ✅ Preserves library purity (no changes to library code)
- ✅ ChromaLangGraphStore works without modification
- ✅ Follows established repository pattern
- ✅ Clean separation at entity/repository level

---

**Option B: Separate Adapter (Alternative)**

Create a dedicated `LangGraphStoreAdapter` that only handles 'langgraph-store' collection.

**Pros**: Total separation, simpler logic per adapter
**Cons**: More files, duplication of routing logic
**Verdict**: Option A is better for this use case

---

## 🔄 Integration with TASK_2025_005 Phases

### Current Status

- ✅ **Phase 1**: Remove library business logic (COMPLETED)
- ⏳ **Phase 2**: Refactor AgentMemoryBridgeService (PENDING)

### Required Addition

**NEW: Phase 1.4 - LangGraph Store Architecture** (PREREQUISITE FOR PHASE 2)

**Why Critical for Phase 2**:

Phase 2, Subtask 3.2 requires implementing `IMemoryAdapter` interface, which includes:

```typescript
interface IMemoryAdapter {
  // ... other methods

  /**
   * Get LangGraph Store instance for cross-thread memory
   * REQUIRED by multi-agent and HITL modules
   */
  getStore(collection?: string): Store;
}
```

**Problem**: Without Phase 1.4, `getStore()` will return a broken ChromaLangGraphStore that corrupts data.

**Solution**: Complete Phase 1.4 BEFORE starting Phase 2.

---

### Updated Phase Plan

```
Phase 1.1 ✅ Remove MemoryStorageService hardcoded logic
Phase 1.2 ✅ Remove MemoryGraphService hardcoded Cypher
Phase 1.3 ✅ Remove config.collection usage
Phase 1.4 🔴 FIX LangGraph Store architecture (NEW - CRITICAL)
  ├── Subtask 1.4.1: Create LangGraphStoreEntity
  ├── Subtask 1.4.2: Create LangGraphStoreRepository
  ├── Subtask 1.4.3: Update ChromaVectorAdapter with routing
  ├── Subtask 1.4.4: Register entity in AppModule
  └── Subtask 1.4.5: Verify collection isolation
Phase 2   ⏳ Refactor AgentMemoryBridgeService (can now proceed)
Phase 3   ⏳ Integrate with IMemoryAdapter
```

---

## 📋 Acceptance Criteria

### Phase 1.4 Completion Checklist

- [ ] LangGraphStoreEntity created with proper metadata structure
- [ ] LangGraphStoreRepository created following VectorMemoryRepository pattern
- [ ] ChromaVectorAdapter updated to route by collection parameter
- [ ] Both repositories registered in AppModule
- [ ] Build succeeds for both library and application
- [ ] Manual testing confirms data isolation:
  - Vector memories go to 'vector-memories' collection
  - LangGraph Store items go to 'langgraph-store' collection
  - No cross-contamination between collections

### Integration Test

```typescript
// Verify proper collection isolation
describe('ChromaDB Collection Isolation', () => {
  it('should store vector memories in correct collection', async () => {
    await vectorAdapter.store('vector-memories', memoryData);

    const memories = await chromaDB.getCollection('vector-memories');
    expect(memories.count).toBeGreaterThan(0);

    const store = await chromaDB.getCollection('langgraph-store');
    expect(store.count).toBe(0); // Should be empty
  });

  it('should store LangGraph items in correct collection', async () => {
    const store = vectorAdapter.getLangGraphStore();
    await store.put(['user', 'u1'], 'theme', { mode: 'dark' });

    const storeCollection = await chromaDB.getCollection('langgraph-store');
    expect(storeCollection.count).toBeGreaterThan(0);

    const memories = await chromaDB.getCollection('vector-memories');
    const storeItems = memories.documents.filter((d) => d.metadata.type === 'store_item');
    expect(storeItems.length).toBe(0); // Should have no store items
  });
});
```

---

## ⏱️ Estimated Effort

**Total Time**: ~2-3 hours

- Subtask 1.4.1 (Entity): 20 minutes
- Subtask 1.4.2 (Repository): 30 minutes
- Subtask 1.4.3 (Adapter routing): 45 minutes
- Subtask 1.4.4 (Registration): 15 minutes
- Subtask 1.4.5 (Testing): 30 minutes

---

## 🎯 Success Metrics

1. ✅ Two distinct ChromaDB collections exist and remain isolated
2. ✅ ChromaLangGraphStore.put() stores in 'langgraph-store'
3. ✅ VectorMemoryRepository.create() stores in 'vector-memories'
4. ✅ getLangGraphStore() returns functional Store instance
5. ✅ Phase 2 can proceed with confidence
6. ✅ Multi-agent cross-thread memory sharing works correctly

---

## 📚 References

- **LangGraph Store Spec**: `libs/langgraph-modules/memory/src/lib/interfaces/langgraph-store.interface.ts`
- **VectorMemoryRepository Pattern**: `apps/dev-brand-api/src/app/repositories/chromadb/vector-memory.repository.ts`
- **Current ChromaVectorAdapter**: `apps/dev-brand-api/src/app/adapters/memory/chroma-vector.adapter.ts`
- **TASK_2025_005 Progress**: `task-tracking/TASK_2025_005/progress.md`

---

**Generated with Claude Code - Analysis Tool**
**Task ID**: TASK_2025_005
**Phase**: 1.4 (NEW - CRITICAL PREREQUISITE)
**Priority**: 🔴 HIGH - Blocking Phase 2
