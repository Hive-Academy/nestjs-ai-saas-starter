/**
 * @fileoverview @ChromaRepository Decorator - Auto-Generation of Repository Methods
 *
 * This decorator automatically generates CRUD operations with type safety,
 * eliminating boilerplate code for standard vector database operations.
 */

import { Injectable, Logger, Type } from '@nestjs/common';
import { Where, WhereDocument, GetResult, QueryResult, Metadata } from 'chromadb';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from './decorator-metadata';
import {
  ChromaWireDocument,
  ChromaSearchResult,
  ChromaSearchOptions,
  ChromaBulkOptions,
  GetDocumentsOptions,

} from '../../interfaces/chromadb-service.interface';
import { BaseDocument, DocumentValidationResult } from '../../types/core.interface';
import { CollectionName } from '../../types/core.interface';
import { ChromaDBService } from '../../services/chromadb.service';

/**
 * Configuration for @ChromaRepository decorator
 */
export interface ChromaRepositoryConfig {
  /** Collection name to operate on */
  readonly collection: string;

  /** Auto-generate embeddings for documents */
  readonly autoEmbed?: boolean;

  /** Enable caching for read operations */
  readonly enableCaching?: boolean;

  /** Enable batch operations */
  readonly enableBatch?: boolean;

  /** Default batch size for bulk operations */
  readonly defaultBatchSize?: number;

  /** Enable validation before operations */
  readonly enableValidation?: boolean;

  /** Auto-generate timestamps */
  readonly autoTimestamp?: boolean;

  /** Auto-generate IDs if not provided */
  readonly autoGenerateIds?: boolean;

  /** Default embedding model to use */
  readonly defaultEmbeddingModel?: string;

  /** Enable soft delete (mark as deleted instead of removing) */
  readonly enableSoftDelete?: boolean;

  /** Error handling strategy */
  readonly errorHandling?: 'throw' | 'log_and_continue' | 'silent';
}

/**
 * Repository operation options
 */
export interface RepositoryOperationOptions {
  /** Skip validation for this operation */
  skipValidation?: boolean;

  /** Skip caching for this operation */
  skipCache?: boolean;

  /** Override batch size */
  batchSize?: number;

  /** Custom embedding model */
  embeddingModel?: string;

  /** Include additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Repository search options
 */
export interface RepositorySearchOptions extends RepositoryOperationOptions {
  /** Number of results to return */
  limit?: number;

  /** Similarity threshold */
  threshold?: number;

  /** Metadata filters */
  where?: Where;

  /** Document content filters */
  whereDocument?: WhereDocument;

  /** Include options */
  include?: {
    metadata?: boolean;
    documents?: boolean;
    distances?: boolean;
    embeddings?: boolean;
  };
}

/**
 * Repository operation result
 */
export interface RepositoryOperationResult<TDocument extends BaseDocument = BaseDocument> {
  readonly success: boolean;
  readonly operationTime: number;
  readonly documentsProcessed: number;
  readonly errors?: string[];
  readonly documents?: TDocument[];
}

/**
 * Base repository interface that will be implemented by the decorator
 */
export interface ChromaRepository<TDocument extends BaseDocument = BaseDocument> {
  // CRUD Operations
  create(document: Omit<TDocument, 'id'>, options?: RepositoryOperationOptions): Promise<TDocument>;
  createMany(documents: Omit<TDocument, 'id'>[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>>;

  findById(id: string, options?: RepositoryOperationOptions): Promise<TDocument | null>;
  findByIds(ids: string[], options?: RepositoryOperationOptions): Promise<TDocument[]>;
  findAll(options?: RepositoryOperationOptions): Promise<TDocument[]>;

  update(id: string, updates: Partial<TDocument>, options?: RepositoryOperationOptions): Promise<TDocument | null>;
  updateMany(updates: Array<{ id: string; data: Partial<TDocument> }>, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>>;

  upsert(document: TDocument, options?: RepositoryOperationOptions): Promise<TDocument>;
  upsertMany(documents: TDocument[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>>;

  delete(id: string, options?: RepositoryOperationOptions): Promise<boolean>;
  deleteMany(ids: string[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult>;
  deleteByFilter(where?: Where, whereDocument?: WhereDocument, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult>;

  // Search Operations
  search(query: string, options?: RepositorySearchOptions): Promise<TDocument[]>;
  searchWithScores(query: string, options?: RepositorySearchOptions): Promise<Array<{ document: TDocument; score: number }>>;
  searchSimilar(embedding: number[], options?: RepositorySearchOptions): Promise<TDocument[]>;

  // Aggregation Operations
  count(where?: Where, whereDocument?: WhereDocument): Promise<number>;
  exists(id: string): Promise<boolean>;
  peek(limit?: number): Promise<TDocument[]>;

  // Collection Operations
  clear(): Promise<void>;
  getCollectionInfo(): Promise<{ name: string; count: number; metadata?: Record<string, unknown> }>;
}

/**
 * Type constraint for repository constructor parameters
 */
interface RepositoryConstructor<TDocument extends BaseDocument = BaseDocument> {
  new (...args: [ChromaDBService, ...unknown[]]): ChromaRepository<TDocument>;
}

/**
 * Type-safe repository instance interface
 */
interface RepositoryInstance<TDocument extends BaseDocument = BaseDocument> 
  extends ChromaRepository<TDocument> {
  readonly chromaService: ChromaDBService;
}

/**
 * @ChromaRepository decorator for auto-generating repository methods
 *
 * @example
 * ```typescript
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 *   age: number;
 * }> {}
 *
 * @Injectable()
 * @ChromaRepository({
 *   collection: 'users',
 *   autoEmbed: true,
 *   enableCaching: true,
 *   enableValidation: true,
 *   autoTimestamp: true,
 * })
 * export class UserRepository implements ChromaRepository<UserDocument> {
 *   constructor(private readonly chromaService: ChromaDBService) {}
 *
 *   // All CRUD methods are auto-generated by the decorator
 *
 *   // You can still add custom methods
 *   async findByEmail(email: string): Promise<UserDocument | null> {
 *     const results = await this.findAll({ where: { email } });
 *     return results[0] || null;
 *   }
 *
 *   async findAdults(): Promise<UserDocument[]> {
 *     return this.findAll({ where: { age: { $gte: 18 } } });
 *   }
 * }
 *
 * // Usage with proper injection
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly userRepo: UserRepository) {}
 *
 *   async createUser(data: Omit<UserDocument, 'id'>): Promise<UserDocument> {
 *     return this.userRepo.create(data);
 *   }
 * }
 * ```
 */
export function ChromaRepository<TDocument extends BaseDocument = BaseDocument>(
  config: ChromaRepositoryConfig
): <T extends RepositoryConstructor<TDocument>>(constructor: T) => T {
  return function <T extends RepositoryConstructor<TDocument>>(constructor: T): T {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'ChromaRepository',
      'class',
      config as unknown as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(constructor, [], metadata);

    // Create enhanced class with auto-generated methods
    class Repository extends constructor implements ChromaRepository<TDocument> {
      private readonly logger = new Logger(constructor.name);
      private readonly chromaService: ChromaDBService;

      constructor(chromaService: ChromaDBService, ...args: unknown[]) {
        super(chromaService, ...args);

        // Type-safe service discovery - expect ChromaDBService as first argument
        this.chromaService = chromaService;
      }

      // =====================================================================
      // CRUD Operations - Auto-Generated
      // =====================================================================

      override async create(document: Omit<TDocument, 'id'>, options?: RepositoryOperationOptions): Promise<TDocument> {
        const startTime = Date.now();

        try {
          const enrichedDocument = await this.enrichDocument(document, options);

          if (config.enableValidation && !options?.skipValidation) {
            await this.validateDocument(enrichedDocument);
          }

          await this.chromaService.addDocuments(
            config.collection,
            [this.documentToChromaWireDocument(enrichedDocument)],
            this.createBulkOptions(options)
          );

          this.logOperation('create', Date.now() - startTime, 1);

          return enrichedDocument;
        } catch (error) {
          this.handleError('create', error, options); throw error;
        }
      }

      override async createMany(documents: Omit<TDocument, 'id'>[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>> {
        const startTime = Date.now();

        try {
          const enrichedDocuments = await Promise.all(
            documents.map(doc => this.enrichDocument(doc, options))
          );

          if (config.enableValidation && !options?.skipValidation) {
            await Promise.all(enrichedDocuments.map(doc => this.validateDocument(doc)));
          }

          const chromaDocuments = enrichedDocuments.map(doc => this.documentToChromaWireDocument(doc));

          await this.chromaService.addDocuments(
            config.collection,
            chromaDocuments,
            this.createBulkOptions(options)
          );

          const operationTime = Date.now() - startTime;
          this.logOperation('createMany', operationTime, documents.length);

          return {
            success: true,
            operationTime,
            documentsProcessed: documents.length,
            documents: enrichedDocuments,
          };
        } catch (error) {
          return this.handleBulkError('createMany', error, documents.length, options);
        }
      }

      override async findById(id: string, options?: RepositoryOperationOptions): Promise<TDocument | null> {
        try {
          const result = await this.chromaService.getDocuments(config.collection, {
            ids: [id],
            includeMetadata: true,
            includeDocuments: true,
          });

          if (!result.ids.length) {
            return null;
          }

          return this.chromaResultToDocument(result, 0);
        } catch (error) {
          return this.handleError('findById', error, options);
        }
      }

      override async findByIds(ids: string[], options?: RepositoryOperationOptions): Promise<TDocument[]> {
        try {
          const result = await this.chromaService.getDocuments(config.collection, {
            ids,
            includeMetadata: true,
            includeDocuments: true,
          });

          return this.chromaResultToDocuments(result);
        } catch (error) {
          return this.handleError('findByIds', error, options) || [];
        }
      }

      override async findAll(options?: RepositoryOperationOptions & { where?: Where; whereDocument?: WhereDocument }): Promise<TDocument[]> {
        try {
          const result = await this.chromaService.getDocuments(config.collection, {
            where: options?.where,
            whereDocument: options?.whereDocument,
            includeMetadata: true,
            includeDocuments: true,
          });

          return this.chromaResultToDocuments(result);
        } catch (error) {
          return this.handleError('findAll', error, options) || [];
        }
      }

      override async update(id: string, updates: Partial<TDocument>, options?: RepositoryOperationOptions): Promise<TDocument | null> {
        try {
          // First, get the existing document
          const existing = await this.findById(id, options);
          if (!existing) {
            return null;
          }

          // Merge updates
          const updatedDocument = await this.enrichDocument(
            { ...existing, ...updates } as Omit<TDocument, 'id'>,
            options,
            existing.id
          );

          if (config.enableValidation && !options?.skipValidation) {
            await this.validateDocument(updatedDocument);
          }

          await this.chromaService.updateDocuments(
            config.collection,
            [this.documentToChromaWireDocument(updatedDocument)],
            this.createBulkOptions(options)
          );

          return updatedDocument;
        } catch (error) {
          return this.handleError('update', error, options);
        }
      }

      override async updateMany(updates: Array<{ id: string; data: Partial<TDocument> }>, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>> {
        const startTime = Date.now();

        try {
          const updatedDocuments: TDocument[] = [];

          for (const update of updates) {
            const updated = await this.update(update.id, update.data, options);
            if (updated) {
              updatedDocuments.push(updated);
            }
          }

          return {
            success: true,
            operationTime: Date.now() - startTime,
            documentsProcessed: updatedDocuments.length,
            documents: updatedDocuments,
          };
        } catch (error) {
          return this.handleBulkError('updateMany', error, updates.length, options);
        }
      }

      override async upsert(document: TDocument, options?: RepositoryOperationOptions): Promise<TDocument> {
        try {
          const enrichedDocument = await this.enrichDocument(document, options, document.id);

          if (config.enableValidation && !options?.skipValidation) {
            await this.validateDocument(enrichedDocument);
          }

          await this.chromaService.upsertDocuments(
            config.collection,
            [this.documentToChromaWireDocument(enrichedDocument)],
            this.createBulkOptions(options)
          );

          return enrichedDocument;
        } catch (error) {
          this.handleError('upsert', error, options); throw error;
        }
      }

      override async upsertMany(documents: TDocument[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>> {
        const startTime = Date.now();

        try {
          const enrichedDocuments = await Promise.all(
            documents.map(doc => this.enrichDocument(doc, options, doc.id))
          );

          if (config.enableValidation && !options?.skipValidation) {
            await Promise.all(enrichedDocuments.map(doc => this.validateDocument(doc)));
          }

          const chromaDocuments = enrichedDocuments.map(doc => this.documentToChromaWireDocument(doc));

          await this.chromaService.upsertDocuments(
            config.collection,
            chromaDocuments,
            this.createBulkOptions(options)
          );

          return {
            success: true,
            operationTime: Date.now() - startTime,
            documentsProcessed: documents.length,
            documents: enrichedDocuments,
          };
        } catch (error) {
          return this.handleBulkError('upsertMany', error, documents.length, options);
        }
      }

      override async delete(id: string, options?: RepositoryOperationOptions): Promise<boolean> {
        try {
          if (config.enableSoftDelete && !options?.metadata?.forceDelete) {
            // Soft delete by marking as deleted
            const updated = await this.update(id, {
              metadata: { deleted: true, deletedAt: new Date().toISOString() }
            } as unknown as Partial<TDocument>, options);
            return !!updated;
          } else {
            // Hard delete
            await this.chromaService.deleteDocuments(config.collection, [id]);
            return true;
          }
        } catch (error) {
          this.handleError('delete', error, options);
          return false;
        }
      }

      override async deleteMany(ids: string[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult> {
        const startTime = Date.now();

        try {
          if (config.enableSoftDelete && !options?.metadata?.forceDelete) {
            // Soft delete by updating
            const updates = ids.map(id => ({
              id,
              data: {
                metadata: { deleted: true, deletedAt: new Date().toISOString() }
              } as unknown as Partial<TDocument>
            }));

            return await this.updateMany(updates, options);
          } else {
            // Hard delete
            await this.chromaService.deleteDocuments(config.collection, ids);

            return {
              success: true,
              operationTime: Date.now() - startTime,
              documentsProcessed: ids.length,
            };
          }
        } catch (error) {
          return this.handleBulkError('deleteMany', error, ids.length, options);
        }
      }

      override async deleteByFilter(where?: Where, whereDocument?: WhereDocument, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult> {
        try {
          await this.chromaService.deleteDocuments(config.collection, [], where, whereDocument);

          return {
            success: true,
            operationTime: 0, // ChromaDB doesn't return timing for this operation
            documentsProcessed: -1, // Unknown count
          };
        } catch (error) {
          return this.handleBulkError('deleteByFilter', error, -1, options);
        }
      }

      // =====================================================================
      // Search Operations - Auto-Generated
      // =====================================================================

      override async search(query: string, options?: RepositorySearchOptions): Promise<TDocument[]> {
        try {
          const searchOptions = this.createSearchOptions(options);
          const result = await this.chromaService.searchDocuments(
            config.collection,
            [query],
            [],
            searchOptions
          );

          return this.chromaResultToDocuments(result);
        } catch (error) {
          return this.handleError('search', error, options) || [];
        }
      }

      override async searchWithScores(query: string, options?: RepositorySearchOptions): Promise<Array<{ document: TDocument; score: number }>> {
        try {
          const searchOptions = {
            ...this.createSearchOptions(options),
            includeDistances: true,
          };

          const result = await this.chromaService.searchDocuments(
            config.collection,
            [query],
            [],
            searchOptions
          );

          const documents = this.chromaResultToDocuments(result);
          const distances = result.distances[0] || [];

          return documents.map((document, index) => ({
            document,
            score: 1 - (distances[index] || 0), // Convert distance to similarity score
          }));
        } catch (error) {
          return this.handleError('searchWithScores', error, options) || [];
        }
      }

      override async searchSimilar(embedding: number[], options?: RepositorySearchOptions): Promise<TDocument[]> {
        try {
          const searchOptions = this.createSearchOptions(options);
          const result = await this.chromaService.searchDocuments(
            config.collection,
            [],
            [embedding],
            searchOptions
          );

          return this.chromaResultToDocuments(result);
        } catch (error) {
          return this.handleError('searchSimilar', error, options) || [];
        }
      }

      // =====================================================================
      // Aggregation Operations - Auto-Generated
      // =====================================================================

      override async count(where?: Where, whereDocument?: WhereDocument): Promise<number> {
        try {
          if (!where && !whereDocument) {
            return await this.chromaService.countDocuments(config.collection);
          } else {
            const result = await this.chromaService.getDocuments(config.collection, {
              where,
              whereDocument,
              includeMetadata: false,
              includeDocuments: false,
            });
            return result.ids.length;
          }
        } catch (error) {
          this.handleError('count', error);
          return 0;
        }
      }

      override async exists(id: string): Promise<boolean> {
        try {
          const document = await this.findById(id);
          return !!document;
        } catch (error) {
          this.handleError('exists', error);
          return false;
        }
      }

      override async peek(limit = 10): Promise<TDocument[]> {
        try {
          const result = await this.chromaService.peekDocuments(config.collection, limit);
          return this.chromaResultToDocuments(result);
        } catch (error) {
          return this.handleError('peek', error) || [];
        }
      }

      // =====================================================================
      // Collection Operations - Auto-Generated
      // =====================================================================

      override async clear(): Promise<void> {
        try {
          await this.chromaService.deleteCollection(config.collection);
          await this.chromaService.createCollection(config.collection);
        } catch (error) {
          this.handleError('clear', error);
        }
      }

      override async getCollectionInfo(): Promise<{ name: string; count: number; metadata?: Record<string, unknown> }> {
        try {
          const count = await this.count();
          const metadata = await this.chromaService.getCollectionMetadata(config.collection);

          return {
            name: config.collection,
            count,
            metadata: metadata || [],
          };
        } catch (error) {
          this.handleError('getCollectionInfo', error);
          return { name: config.collection, count: 0 };
        }
      }

      // =====================================================================
      // Helper Methods
      // =====================================================================

      private findChromaService(args: [ChromaDBService, ...unknown[]]): ChromaDBService {
        const [firstArg] = args;
        
        // Validate first argument is ChromaDBService
        if (this.isChromaDBService(firstArg)) {
          return firstArg;
        }

        // Fallback: Look for ChromaDB service in constructor arguments
        for (const arg of args) {
          if (this.isChromaDBService(arg)) {
            return arg;
          }
        }

        throw new Error(
          'ChromaDBService not found. Please inject ChromaDBService as the first constructor argument.'
        );
      }

      private isChromaDBService(value: unknown): value is ChromaDBService {
        return (
          typeof value === 'object' &&
          value !== null &&
          'searchDocuments' in value &&
          'addDocuments' in value &&
          'getDocuments' in value &&
          typeof (value as ChromaDBService).searchDocuments === 'function' &&
          typeof (value as ChromaDBService).addDocuments === 'function' &&
          typeof (value as ChromaDBService).getDocuments === 'function'
        );
      }

      private async enrichDocument(
        document: Omit<TDocument, 'id'> | TDocument,
        options?: RepositoryOperationOptions,
        existingId?: string
      ): Promise<TDocument> {
        // Use type assertion with proper validation
        // Create new object with all required properties
        const enrichedData: any = { ...document };

        // Generate ID if needed
        if (config.autoGenerateIds && !existingId && !("id" in document)) {
          enrichedData.id = this.generateId();
        } else if (existingId) {
          enrichedData.id = existingId;
        } else if ("id" in document) {
          enrichedData.id = (document as any).id;
        }

        // Add timestamps
        if (config.autoTimestamp) {
          const now = new Date().toISOString();
          if (!("createdAt" in document)) {
            enrichedData.createdAt = now;
          }
          enrichedData.updatedAt = now;

          if (!("version" in document)) {
            enrichedData.version = 1;
          } else if (existingId) {
            const currentVersion = enrichedData.version || 0;
            enrichedData.version = currentVersion + 1;
          }
        }

        // Add custom metadata from options
        if (options?.metadata) {
          enrichedData.metadata = {
            ...enrichedData.metadata,
            ...options.metadata,
          };
        }

        return enrichedData as TDocument;
      }
      private async validateDocument(document: TDocument): Promise<void> {
        // Basic validation - can be extended
        if (!document.id) {
          throw new Error('Document ID is required');
        }

        if (!document.content && document.content !== '') {
          throw new Error('Document content is required');
        }

        if (!document.metadata || typeof document.metadata !== 'object') {
          throw new Error('Document metadata is required and must be an object');
        }
      }

      private documentToChromaWireDocument(document: TDocument): ChromaWireDocument {
        return {
          id: document.id,
          document: document.content,
          metadata: this.sanitizeMetadataForChroma(document.metadata),
          embedding: document.embedding,
        };
      }

      private sanitizeMetadataForChroma(metadata: Record<string, unknown>): Record<string, string | number | boolean | null> {
        const sanitized: Record<string, string | number | boolean | null> = {};
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
            sanitized[key] = value as string | number | boolean | null;
          } else if (value !== undefined) {
            // Convert complex types to string
            try {
              sanitized[key] = JSON.stringify(value);
            } catch (error) {
              // If JSON.stringify fails, convert to string representation
              sanitized[key] = String(value);
            }
          }
        }
        return sanitized;
      }

      private chromaResultToDocument(result: GetResult<Metadata> | QueryResult<Metadata>, index: number): TDocument {
        if (!result.ids || !result.documents || !result.metadatas) {
          throw new Error('Invalid ChromaDB result: missing required fields');
        }

        if (index >= result.ids.length) {
          throw new Error(`Index ${index} out of bounds for result with ${result.ids.length} documents`);
        }

        const id = result.ids[index];
        const content = result.documents[index];
        const metadata = result.metadatas[index];

        if (!id || !content || !metadata) {
          throw new Error(`Document at index ${index} is missing required fields`);
        }
        return {
          id,
          document: content,
          metadata: metadata as TDocument["metadata"],
          embedding: result.embeddings?.[index],
        } as unknown as TDocument;
      }

      private chromaResultToDocuments(result: GetResult<Metadata> | QueryResult<Metadata>): TDocument[] {
        if (!result.ids || !Array.isArray(result.ids)) {
          return [];
        }

        const documents: TDocument[] = [];

        for (let i = 0; i < result.ids.length; i++) {
          try {
            documents.push(this.chromaResultToDocument(result, i));
          } catch (error) {
            this.logger.warn(`Failed to convert document at index ${i}: ${error}`);
            // Continue processing other documents
          }
        }

        return documents;
      }

      private createBulkOptions(options?: RepositoryOperationOptions): ChromaBulkOptions {
        return {
          batchSize: options?.batchSize || config.defaultBatchSize || 100,
        };
      }

      private createSearchOptions(options?: RepositorySearchOptions): ChromaSearchOptions {
        return {
          nResults: options?.limit || 10,
          where: options?.where,
          whereDocument: options?.whereDocument,
          includeMetadata: options?.include?.metadata ?? true,
          includeDocuments: options?.include?.documents ?? true,
          includeDistances: options?.include?.distances ?? false,
          includeEmbeddings: options?.include?.embeddings ?? false,
        };
      }

      private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      private logOperation(operation: string, duration: number, count: number): void {
        this.logger.debug(`${operation} completed in ${duration}ms for ${count} document(s)`);
      }

      private handleError<T>(operation: string, error: unknown, options?: RepositoryOperationOptions): T | null {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const message = `Repository operation '${operation}' failed: ${errorMessage}`;

        switch (config.errorHandling) {
          case 'silent':
            break;
          case 'log_and_continue':
            this.logger.error(message, error instanceof Error ? error.stack : undefined);
            break;
          case 'throw':
          default:
            this.logger.error(message, error instanceof Error ? error.stack : undefined);
            throw error instanceof Error ? error : new Error(message);
        }

        return null;
      }

      private handleBulkError(operation: string, error: unknown, count: number, options?: RepositoryOperationOptions): RepositoryOperationResult<TDocument> {
        this.handleError(operation, error, options);

        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          success: false,
          operationTime: 0,
          documentsProcessed: 0,
          errors: [errorMessage],
          documents: [],
        };
      }
    }

    return Repository as T;
  };
}

/**
 * Type-safe repository factory function
 */
export function createRepository<TDocument extends BaseDocument>(
  config: ChromaRepositoryConfig,
  chromaService: ChromaDBService
): ChromaRepository<TDocument> {
  @Injectable()
  @ChromaRepository<TDocument>(config)
  class RepositoryImpl implements ChromaRepository<TDocument> {
    constructor(public readonly chromaService: ChromaDBService) {}

    // Type placeholders - these will be implemented by the decorator
    create!: ChromaRepository<TDocument>['create'];
    createMany!: ChromaRepository<TDocument>['createMany'];
    findById!: ChromaRepository<TDocument>['findById'];
    findByIds!: ChromaRepository<TDocument>['findByIds'];
    findAll!: ChromaRepository<TDocument>['findAll'];
    update!: ChromaRepository<TDocument>['update'];
    updateMany!: ChromaRepository<TDocument>['updateMany'];
    upsert!: ChromaRepository<TDocument>['upsert'];
    upsertMany!: ChromaRepository<TDocument>['upsertMany'];
    delete!: ChromaRepository<TDocument>['delete'];
    deleteMany!: ChromaRepository<TDocument>['deleteMany'];
    deleteByFilter!: ChromaRepository<TDocument>['deleteByFilter'];
    search!: ChromaRepository<TDocument>['search'];
    searchWithScores!: ChromaRepository<TDocument>['searchWithScores'];
    searchSimilar!: ChromaRepository<TDocument>['searchSimilar'];
    count!: ChromaRepository<TDocument>['count'];
    exists!: ChromaRepository<TDocument>['exists'];
    peek!: ChromaRepository<TDocument>['peek'];
    clear!: ChromaRepository<TDocument>['clear'];
    getCollectionInfo!: ChromaRepository<TDocument>['getCollectionInfo'];
  }

  return new RepositoryImpl(chromaService);
}

/**
 * Example usage:
 *
 * @example Complete repository with custom methods
 * ```typescript
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 *   age: number;
 *   role: 'user' | 'admin';
 * }> {}
 *
 * @Injectable()
 * @ChromaRepository({
 *   collection: 'users',
 *   autoEmbed: true,
 *   enableCaching: true,
 *   enableValidation: true,
 *   autoTimestamp: true,
 *   autoGenerateIds: true,
 * })
 * export class UserRepository implements ChromaRepository<UserDocument> {
 *   constructor(private chromaService: ChromaDBService) {}
 *
 *   // Custom business logic methods
 *   async findByEmail(email: string): Promise<UserDocument | null> {
 *     const users = await this.findAll({ where: { email } });
 *     return users[0] || null;
 *   }
 *
 *   async findAdults(): Promise<UserDocument[]> {
 *     return this.findAll({ where: { age: { $gte: 18 } } });
 *   }
 *
 *   async searchByRole(query: string, role: 'user' | 'admin'): Promise<UserDocument[]> {
 *     return this.search(query, { where: { role }, limit: 20 });
 *   }
 * }
 * ```
 */
