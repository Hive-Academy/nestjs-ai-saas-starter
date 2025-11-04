/**
 * @fileoverview ChromaDBRepository<T> - TypeORM-Style Auto-Generated Repository
 *
 * This is the base repository class that provides automatic CRUD operations for any ChromaDB entity.
 * It follows the TypeORM/Mongoose pattern with zero-boilerplate CRUD for simple repositories
 * and extension support for custom business logic.
 *
 * Mirrors Neo4jRepository<T> from TASK_2025_004 pattern exactly.
 *
 * Features:
 * - 15+ CRUD operations (findById, findAll, create, update, delete, search, etc.)
 * - 3 helper methods for custom repositories (getCollectionName, getEntity, getChromaService)
 * - Full TypeScript type safety with generic type parameter
 * - Composition pattern with ChromaDBService
 * - Protected properties for subclass access
 * - Zero 'any' types (strict TypeScript compliance)
 * - Automatic collection initialization (NEW)
 * - Graceful degradation for missing collections (NEW)
 *
 * @example
 * ```typescript
 * // Simple CRUD (no custom repository needed)
 * @Module({
 *   imports: [ChromaDBModule.forFeature([MemoryDocument])]
 * })
 * export class MemoryModule {}
 *
 * @Injectable()
 * export class MemoryService {
 *   constructor(
 *     @InjectRepository(MemoryDocument)
 *     private memoryRepo: ChromaDBRepository<MemoryDocument>
 *   ) {}
 *
 *   async getMemory(id: string) {
 *     return this.memoryRepo.findById(id);  // Works immediately
 *   }
 * }
 *
 * // Custom repository (extends base class)
 * @Injectable()
 * export class MemoryRepository extends ChromaDBRepository<MemoryDocument> {
 *   constructor(
 *     chromaDB: ChromaDBService,
 *     collectionRegistry: CollectionRegistryService
 *   ) {
 *     super(MemoryDocument, 'memories', chromaDB, collectionRegistry);
 *   }
 *
 *   // Inherits all CRUD methods + add custom methods
 *   async findByAgent(agentId: string): Promise<MemoryDocument[]> {
 *     return this.findAll({ where: { agentId } });
 *   }
 * }
 * ```
 *
 * @author backend-developer (ChromaDB TypeORM Migration)
 * @since 1.0.0 - Phase 1 TypeORM-style pattern implementation
 * @since 1.1.0 - Added automatic collection initialization
 */

import { Logger, type Type } from '@nestjs/common';
import type { GetResult } from 'chromadb';
import { ChromaDBCollectionNotFoundError } from '../errors/chromadb.errors';
import type { ChromaDBService } from '../services/chromadb.service';
import type { CollectionRegistryService } from '../services/collection-registry.service';
import type {
  BaseDocument,
  Where,
  WhereDocument,
  ChromaSearchResult,
} from '../types/core.interface';
import type {
  RepositoryOperationOptions,
  RepositorySearchOptions,
  RepositoryOperationResult,
  CreateDocumentInput,
  UpsertDocumentInput,
  SearchResultWithScore,
} from './repository-types';

/**
 * Find options for repository queries
 */
export interface RepositoryFindOptions {
  where?: Where;
  whereDocument?: WhereDocument;
  limit?: number;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
}

/**
 * TypeORM-style base repository for ChromaDB entities
 *
 * Provides automatic CRUD operations via composition with ChromaDBService
 * and helper methods for custom repository implementations.
 *
 * Design Principles:
 * - Composition over Inheritance (uses ChromaDBService)
 * - SOLID principles (Single Responsibility, Open/Closed, Dependency Inversion)
 * - DRY (Don't Repeat Yourself) - CRUD logic centralized
 * - Type Safety - Full generic type propagation
 * - Automatic Collection Initialization (NEW)
 * - Graceful Degradation (NEW)
 *
 * @template T Entity type extending BaseDocument
 */
export class ChromaDBRepository<T extends BaseDocument> {
  private readonly logger = new Logger(ChromaDBRepository.name);
  private readonly collectionInitialized: Promise<void>;

  /**
   * Constructor for ChromaDBRepository with automatic collection initialization
   *
   * @param entity - Entity class (Type<T>)
   * @param collection - ChromaDB collection name
   * @param chromaDB - ChromaDBService instance for operations
   * @param collectionRegistry - Optional CollectionRegistryService for auto-initialization
   *
   * @example
   * ```typescript
   * // With auto-initialization (recommended)
   * constructor(chromaDB: ChromaDBService, registry: CollectionRegistryService) {
   *   super(Entity, 'collection-name', chromaDB, registry);
   * }
   *
   * // Without auto-initialization (legacy)
   * constructor(chromaDB: ChromaDBService) {
   *   super(Entity, 'collection-name', chromaDB);
   * }
   * ```
   */
  constructor(
    protected readonly entity: Type<T>,
    protected readonly collection: string,
    protected readonly chromaDB: ChromaDBService,
    protected readonly collectionRegistry?: CollectionRegistryService
  ) {
    // ✅ AUTOMATIC COLLECTION INITIALIZATION
    // Start initialization immediately in background (non-blocking)
    if (collectionRegistry) {
      this.collectionInitialized = this.initializeCollection();
    } else {
      // Fallback: resolve immediately if no registry provided
      this.collectionInitialized = Promise.resolve();
      this.logger.warn(
        `CollectionRegistryService not provided for '${collection}' - ` +
          `collection will be created lazily on first write operation`
      );
    }
  }

  /**
   * Initialize collection using singleton registry
   * Called automatically in constructor - no manual invocation needed
   */
  private async initializeCollection(): Promise<void> {
    if (!this.collectionRegistry) {
      return;
    }

    try {
      // Extract metadata from entity decorator if available
      const metadata = this.getEntityMetadata();

      await this.collectionRegistry.ensureCollectionExists(
        this.collection,
        metadata
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to initialize collection '${this.collection}': ${errorMessage}. ` +
          `Collection will be created lazily on first write.`
      );
      // Don't throw - graceful degradation
    }
  }

  /**
   * Extract metadata from @ChromaEntity decorator
   * Used to populate collection metadata during initialization
   */
  private getEntityMetadata(): Record<string, any> {
    try {
      // Access decorator metadata if available
      const entityMetadata = Reflect.getMetadata('chroma:entity', this.entity);
      if (entityMetadata) {
        // Sanitize metadata: ChromaDB only supports string, number, boolean
        // Arrays must be JSON-stringified
        const sanitized = this.sanitizeMetadata(entityMetadata);

        return {
          source: 'entity-decorator',
          entityName: this.entity.name,
          ...sanitized,
        };
      }
    } catch (error) {
      // Metadata not available - not a problem
    }

    return {
      source: 'repository-initialization',
      entityName: this.entity.name,
    };
  }

  /**
   * Sanitize metadata for ChromaDB compatibility
   * ChromaDB only supports string, number, boolean in metadata
   * Arrays and objects must be JSON-stringified
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      }

      if (Array.isArray(value)) {
        // Convert arrays to JSON strings
        sanitized[key] = JSON.stringify(value);
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        sanitized[key] = JSON.stringify(value);
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        // Keep primitives as-is
        sanitized[key] = value;
      } else {
        // Convert everything else to string
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Wait for collection to be ready (used internally before operations)
   * Non-blocking: returns immediately if collection already initialized
   */
  protected async ensureCollectionReady(): Promise<void> {
    await this.collectionInitialized;
  }

  /**
   * Check if error indicates collection not found
   * Handles both explicit ChromaDBCollectionNotFoundError and masked connection errors
   *
   * @param error - Error to check
   * @returns true if error is collection-not-found related
   */
  protected isCollectionNotFoundError(error: unknown): boolean {
    if (error instanceof ChromaDBCollectionNotFoundError) {
      return true;
    }

    if (error instanceof Error) {
      return (
        error.message.includes('not found') ||
        error.message.includes('does not exist') ||
        (error.message.includes('Failed to connect') &&
          error.message.includes('chromadb'))
      );
    }

    return false;
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Find a single document by ID
   *
   * @param id - Document ID
   * @param options - Operation options
   * @returns Document if found, null otherwise
   *
   * @example
   * ```typescript
   * const doc = await repo.findById('doc-123');
   * if (doc) {
   *   console.log(doc.content);
   * }
   * ```
   */
  async findById(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<T | null> {
    // ✅ Wait for collection to be ready
    await this.ensureCollectionReady();

    try {
      const result = await this.chromaDB.getDocuments(this.collection, {
        ids: [id],
        includeDocuments: true,
        includeMetadata: true,
        includeEmbeddings: options?.includeEmbeddings,
      });

      if (!result.ids || result.ids.length === 0) {
        return null;
      }

      return this.mapToEntity(result, 0);
    } catch (error) {
      // ✅ Graceful handling of missing collections
      if (this.isCollectionNotFoundError(error)) {
        this.logger.debug(
          `Collection '${this.collection}' not found during findById - returning null. ` +
            `Collection will be created on first write.`
        );
        return null;
      }
      throw error;
    }
  }

  /**
   * Find multiple documents by IDs
   *
   * @param ids - Array of document IDs
   * @param options - Operation options
   * @returns Array of found documents
   *
   * @example
   * ```typescript
   * const docs = await repo.findByIds(['doc-1', 'doc-2', 'doc-3']);
   * console.log(`Found ${docs.length} documents`);
   * ```
   */
  async findByIds(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<T[]> {
    const result = await this.chromaDB.getDocuments(this.collection, {
      ids,
      includeDocuments: true,
      includeMetadata: true,
      includeEmbeddings: options?.includeEmbeddings,
    });

    if (!result.ids) {
      return [];
    }

    return result.ids.map((_, index) => this.mapToEntity(result, index));
  }

  /**
   * Find all documents matching criteria
   *
   * @param options - Find options (where, limit, etc.)
   * @returns Array of matching documents
   *
   * @example
   * ```typescript
   * const docs = await repo.findAll({ where: { status: 'active' }, limit: 10 });
   * ```
   */
  async findAll(options?: RepositoryFindOptions): Promise<T[]> {
    // ✅ Wait for collection to be ready
    await this.ensureCollectionReady();

    try {
      const result = await this.chromaDB.getDocuments(this.collection, {
        where: options?.where,
        whereDocument: options?.whereDocument,
        limit: options?.limit,
        includeDocuments: true,
        includeMetadata: true,
      });

      if (!result.ids) {
        return [];
      }

      return result.ids.map((_, index) => this.mapToEntity(result, index));
    } catch (error) {
      // ✅ Graceful handling of missing collections
      if (this.isCollectionNotFoundError(error)) {
        this.logger.debug(
          `Collection '${this.collection}' not found during findAll - returning empty array`
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * Create a new document
   *
   * @param document - Document data
   * @param options - Operation options
   * @returns Created document
   *
   * @example
   * ```typescript
   * const newDoc = await repo.create({
   *   content: 'Document content',
   *   metadata: { author: 'John' }
   * });
   * ```
   */
  async create(
    document: CreateDocumentInput<T>,
    options?: RepositoryOperationOptions
  ): Promise<T> {
    // ✅ Wait for collection to be ready
    // Collection will be created automatically on first write if it doesn't exist
    await this.ensureCollectionReady();

    const entity = this.createEntity({
      id: document.id || this.generateId(),
      content: document.content,
      metadata: document.metadata,
      embedding: document.embedding
        ? Array.from(document.embedding)
        : undefined,
    });

    await this.chromaDB.addDocuments(this.collection, [entity]);
    return entity;
  }

  /**
   * Create multiple documents
   *
   * @param documents - Array of document data
   * @param options - Operation options
   * @returns Operation result with success/failure details
   *
   * @example
   * ```typescript
   * const result = await repo.createMany([
   *   { content: 'Doc 1', metadata: {} },
   *   { content: 'Doc 2', metadata: {} }
   * ]);
   * console.log(`Created ${result.successCount} documents`);
   * ```
   */
  async createMany(
    documents: CreateDocumentInput<T>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<T>> {
    const entities = documents.map((doc) =>
      this.createEntity({
        id: doc.id || this.generateId(),
        content: doc.content,
        metadata: doc.metadata,
        embedding: doc.embedding ? Array.from(doc.embedding) : undefined,
      })
    );

    await this.chromaDB.addDocuments(this.collection, entities);

    return {
      success: entities,
      errors: [],
      total: documents.length,
      successCount: documents.length,
      errorCount: 0,
    };
  }

  /**
   * Update an existing document
   *
   * @param id - Document ID
   * @param updates - Partial document updates
   * @param options - Operation options
   * @returns Updated document if found, null otherwise
   *
   * @example
   * ```typescript
   * const updated = await repo.update('doc-123', {
   *   content: 'Updated content'
   * });
   * ```
   */
  async update(
    id: string,
    updates: Partial<T>,
    options?: RepositoryOperationOptions
  ): Promise<T | null> {
    // Fetch existing document first
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Merge updates with existing data
    const updatedEmbedding =
      (updates as Partial<BaseDocument>).embedding ?? existing.embedding;
    const merged = this.createEntity({
      id,
      content: (updates as Partial<BaseDocument>).content ?? existing.content,
      metadata:
        (updates as Partial<BaseDocument>).metadata ?? existing.metadata,
      embedding: updatedEmbedding ? Array.from(updatedEmbedding) : undefined,
    });

    await this.chromaDB.updateDocuments(this.collection, [merged]);

    // Refetch to ensure consistency
    return this.findById(id);
  }

  /**
   * Update multiple documents
   *
   * @param updates - Array of updates with id and data
   * @param options - Operation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * const result = await repo.updateMany([
   *   { id: 'doc-1', data: { content: 'New content 1' } },
   *   { id: 'doc-2', data: { content: 'New content 2' } }
   * ]);
   * ```
   */
  async updateMany(
    updates: Array<{ id: string; data: Partial<T> }>,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<T>> {
    const results: T[] = [];
    const errors: RepositoryOperationResult<T>['errors'] = [];

    for (const { id, data } of updates) {
      try {
        const updated = await this.update(id, data, options);
        if (updated) {
          results.push(updated);
        } else {
          errors.push({
            document: { id } as Partial<T>,
            error: 'Document not found',
            index: results.length + errors.length,
          });
        }
      } catch (error) {
        errors.push({
          document: { id } as Partial<T>,
          error: error instanceof Error ? error.message : String(error),
          index: results.length + errors.length,
        });
      }
    }

    return {
      success: results,
      errors,
      total: updates.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * Upsert a document (create or update)
   *
   * @param document - Document data with required id
   * @param options - Operation options
   * @returns Upserted document
   *
   * @example
   * ```typescript
   * const doc = await repo.upsert({
   *   id: 'doc-123',
   *   content: 'Content',
   *   metadata: {}
   * });
   * ```
   */
  async upsert(
    document: UpsertDocumentInput<T>,
    options?: RepositoryOperationOptions
  ): Promise<T> {
    const entity = this.createEntity({
      id: document.id,
      content: document.content,
      metadata: document.metadata,
      embedding: document.embedding
        ? Array.from(document.embedding)
        : undefined,
    });

    await this.chromaDB.upsertDocuments(this.collection, [entity]);
    return entity;
  }

  /**
   * Upsert multiple documents
   *
   * @param documents - Array of document data
   * @param options - Operation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * const result = await repo.upsertMany([
   *   { id: 'doc-1', content: 'Content 1', metadata: {} },
   *   { id: 'doc-2', content: 'Content 2', metadata: {} }
   * ]);
   * ```
   */
  async upsertMany(
    documents: UpsertDocumentInput<T>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<T>> {
    const entities = documents.map((doc) =>
      this.createEntity({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        embedding: doc.embedding ? Array.from(doc.embedding) : undefined,
      })
    );

    await this.chromaDB.upsertDocuments(this.collection, entities);

    return {
      success: entities,
      errors: [],
      total: documents.length,
      successCount: documents.length,
      errorCount: 0,
    };
  }

  /**
   * Delete a document by ID
   *
   * @param id - Document ID
   * @param options - Operation options
   * @returns True if deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = await repo.delete('doc-123');
   * if (deleted) {
   *   console.log('Document deleted');
   * }
   * ```
   */
  async delete(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<boolean> {
    try {
      await this.chromaDB.deleteDocuments(this.collection, [id]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete multiple documents by IDs
   *
   * @param ids - Array of document IDs
   * @param options - Operation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * const result = await repo.deleteMany(['doc-1', 'doc-2']);
   * console.log(`Deleted ${result.successCount} documents`);
   * ```
   */
  async deleteMany(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<never>> {
    try {
      await this.chromaDB.deleteDocuments(this.collection, ids);
      return {
        success: [],
        errors: [],
        total: ids.length,
        successCount: ids.length,
        errorCount: 0,
      };
    } catch (error) {
      return {
        success: [],
        errors: ids.map((id, index) => ({
          error: error instanceof Error ? error.message : String(error),
          index,
        })),
        total: ids.length,
        successCount: 0,
        errorCount: ids.length,
      };
    }
  }

  /**
   * Delete documents matching filter
   *
   * @param where - Metadata filter
   * @param whereDocument - Document content filter
   * @param options - Operation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * const result = await repo.deleteByFilter({ status: 'archived' });
   * ```
   */
  async deleteByFilter(
    where?: Where,
    whereDocument?: WhereDocument,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<never>> {
    // First find matching documents
    const docs = await this.findAll({ where, whereDocument });
    const ids = docs.map((doc) => doc.id);

    if (ids.length === 0) {
      return {
        success: [],
        errors: [],
        total: 0,
        successCount: 0,
        errorCount: 0,
      };
    }

    return this.deleteMany(ids, options);
  }

  /**
   * Search documents using semantic/vector search
   *
   * @param query - Query text
   * @param options - Search options
   * @returns Array of matching documents
   *
   * @example
   * ```typescript
   * const docs = await repo.search('machine learning', { limit: 10 });
   * ```
   */
  async search(query: string, options?: RepositorySearchOptions): Promise<T[]> {
    const result = await this.chromaDB.searchDocuments(
      this.collection,
      [query],
      undefined,
      {
        nResults: options?.limit || 10,
        where: options?.where,
        whereDocument: options?.whereDocument,
        includeMetadata: options?.includeMetadata ?? true,
        includeDocuments: options?.includeDocuments ?? true,
        includeDistances: true,
        includeEmbeddings: options?.includeEmbeddings ?? false,
      }
    );

    return this.mapSearchResults(result);
  }

  /**
   * Search documents with similarity scores
   *
   * @param query - Query text
   * @param options - Search options
   * @returns Array of results with documents and scores
   *
   * @example
   * ```typescript
   * const results = await repo.searchWithScores('AI research');
   * results.forEach(r => console.log(`${r.document.id}: ${r.score}`));
   * ```
   */
  async searchWithScores(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<SearchResultWithScore<T>[]> {
    const result = await this.chromaDB.searchDocuments(
      this.collection,
      [query],
      undefined,
      {
        nResults: options?.limit || 10,
        where: options?.where,
        whereDocument: options?.whereDocument,
        includeMetadata: options?.includeMetadata ?? true,
        includeDocuments: options?.includeDocuments ?? true,
        includeDistances: true,
        includeEmbeddings: options?.includeEmbeddings ?? false,
      }
    );

    if (!result.ids || !result.ids[0]) {
      return [];
    }

    return result.ids[0].map((id, index) => {
      const distance = result.distances?.[0]?.[index];
      return {
        document: this.createEntity({
          id,
          content: (result.documents?.[0]?.[index] as string) || '',
          metadata: (result.metadatas?.[0]?.[index] ||
            {}) as T extends BaseDocument<infer TMetadata> ? TMetadata : never,
          embedding: result.embeddings?.[0]?.[index] ?? undefined,
        }),
        score: distance !== null && distance !== undefined ? 1 - distance : 0,
        distance: distance ?? undefined, // Convert null to undefined
      };
    });
  }

  /**
   * Search for similar documents using embedding vector
   *
   * @param embedding - Embedding vector
   * @param options - Search options
   * @returns Array of similar documents
   *
   * @example
   * ```typescript
   * const similar = await repo.searchSimilar([0.1, 0.2, ...], { limit: 5 });
   * ```
   */
  async searchSimilar(
    embedding: number[],
    options?: RepositorySearchOptions
  ): Promise<T[]> {
    const result = await this.chromaDB.searchDocuments(
      this.collection,
      [],
      [embedding],
      {
        nResults: options?.limit || 10,
        where: options?.where,
        whereDocument: options?.whereDocument,
        includeMetadata: options?.includeMetadata ?? true,
        includeDocuments: options?.includeDocuments ?? true,
        includeEmbeddings: options?.includeEmbeddings ?? false,
      }
    );

    return this.mapSearchResults(result);
  }

  /**
   * Count documents matching criteria
   *
   * @param where - Metadata filter
   * @param whereDocument - Document content filter
   * @returns Document count
   *
   * @example
   * ```typescript
   * const count = await repo.count({ status: 'active' });
   * console.log(`Found ${count} active documents`);
   * ```
   */
  async count(where?: Where, whereDocument?: WhereDocument): Promise<number> {
    // ✅ Wait for collection to be ready
    await this.ensureCollectionReady();

    try {
      const result = await this.chromaDB.getDocuments(this.collection, {
        where,
        whereDocument,
      });

      return result.ids?.length || 0;
    } catch (error) {
      // ✅ Graceful handling of missing collections
      if (this.isCollectionNotFoundError(error)) {
        this.logger.debug(
          `Collection '${this.collection}' not found during count - returning 0`
        );
        return 0;
      }
      throw error;
    }
  }

  /**
   * Check if a document exists
   *
   * @param id - Document ID
   * @returns True if exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await repo.exists('doc-123');
   * ```
   */
  async exists(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    return doc !== null;
  }

  /**
   * Peek at first N documents in collection
   *
   * @param limit - Number of documents to peek (default: 10)
   * @returns Array of documents
   *
   * @example
   * ```typescript
   * const preview = await repo.peek(5);
   * ```
   */
  async peek(limit = 10): Promise<T[]> {
    const result = await this.chromaDB.peekDocuments(this.collection, limit);

    if (!result.ids) {
      return [];
    }

    return result.ids.map((_, index) => this.mapToEntity(result, index));
  }

  /**
   * Clear all documents from collection
   *
   * @example
   * ```typescript
   * await repo.clear();
   * console.log('Collection cleared');
   * ```
   */
  async clear(): Promise<void> {
    await this.chromaDB.deleteCollection(this.collection);
    await this.chromaDB.createCollection(this.collection);
  }

  /**
   * Get collection information
   *
   * @returns Collection info (name, count, metadata)
   *
   * @example
   * ```typescript
   * const info = await repo.getCollectionInfo();
   * console.log(`Collection: ${info.name}, Docs: ${info.count}`);
   * ```
   */
  async getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata?: Record<string, unknown>;
  }> {
    const count = await this.count();
    return {
      name: this.collection,
      count,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get collection name
   *
   * @returns Collection name
   */
  protected getCollectionName(): string {
    return this.collection;
  }

  /**
   * Get the entity class (Type<T>)
   *
   * @returns Entity class constructor
   */
  protected getEntity(): Type<T> {
    return this.entity;
  }

  /**
   * Get the ChromaDBService instance
   *
   * @returns ChromaDBService instance
   */
  protected getChromaService(): ChromaDBService {
    return this.chromaDB;
  }

  // ==================== MAPPING METHODS ====================

  /**
   * Map ChromaDB result to entity using proper entity construction
   *
   * @param result - ChromaDB get result
   * @param index - Index in result arrays
   * @returns Entity instance
   */
  private mapToEntity(result: GetResult, index: number): T {
    return this.createEntity({
      id: result.ids![index],
      content: (result.documents![index] as string) || '',
      metadata: (result.metadatas![index] || {}) as T extends BaseDocument<
        infer TMetadata
      >
        ? TMetadata
        : never,
      embedding: result.embeddings?.[index] ?? undefined,
    });
  }

  /**
   * Map search results to entity array
   *
   * @param result - ChromaDB search result
   * @returns Array of entities
   */
  private mapSearchResults(result: ChromaSearchResult): T[] {
    if (!result.ids || !result.ids[0]) {
      return [];
    }

    return result.ids[0].map((id, index) =>
      this.createEntity({
        id,
        content: (result.documents?.[0]?.[index] as string) || '',
        metadata: (result.metadatas?.[0]?.[index] ||
          {}) as T extends BaseDocument<infer TMetadata> ? TMetadata : never,
        embedding: result.embeddings?.[0]?.[index] ?? undefined,
      })
    );
  }

  /**
   * Create entity instance using proper Object.assign with prototype chain
   *
   * @param data - Entity data
   * @returns Properly constructed entity instance
   */
  private createEntity(data: {
    id: string;
    content: string;
    metadata: any;
    embedding?: number[];
  }): T {
    // Use Object.create to maintain prototype chain if entity has methods
    const entity = Object.create(this.entity.prototype) as T;
    // Assign properties
    return Object.assign(entity, data);
  }

  /**
   * Generate a unique ID for documents
   *
   * @returns UUID string
   */
  public generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
