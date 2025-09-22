/**
 * @fileoverview @ChromaRepository Decorator - Auto-Generation of Repository Methods
 *
 * This decorator automatically generates CRUD operations with type safety,
 * eliminating boilerplate code for standard vector database operations.
 */

import { Injectable, Logger, Type } from '@nestjs/common';
import { Where, WhereDocument } from 'chromadb';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from './decorator-metadata';
import {
  ChromaDocument,
  ChromaSearchResult,
  ChromaSearchOptions,
  ChromaBulkOptions,
  GetDocumentsOptions,
} from '../../interfaces/chromadb-service.interface';
import { BaseDocument, DocumentValidationResult } from '../../types/document-types.interface';
import { CollectionName } from '../../types/collection-names.type';
import { ChromaDBService } from 'src/lib/services/chromadb.service';

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
 * // Usage
 * const userRepo = new UserRepository();
 *
 * const user = await userRepo.create({
 *   content: 'User profile',
 *   metadata: { name: 'John', email: 'john@example.com', age: 30 }
 * });
 *
 * const users = await userRepo.search('software engineer', { limit: 10 });
 * const adult = await userRepo.findAdults();
 * ```
 */
export function ChromaRepository<TDocument extends BaseDocument = BaseDocument>(
  config: ChromaRepositoryConfig
): ClassDecorator {
  return function <T extends new (...args: any[]) => {}>(constructor: T) {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'ChromaRepository',
      'class',
      config
    );

    DecoratorMetadataRegistry.setMetadata(constructor, undefined, metadata);

    // Create  class with auto-generated methods
    class Repository extends constructor implements ChromaRepository<TDocument> {
      private readonly logger = new Logger(constructor.name);
      private chromaService!: ChromaDBService;

      constructor(...args: any[]) {
        super(...args);

        // Try to find ChromaDB service in constructor args or class properties
        this.chromaService = this.findChromaService(args);
      }

      // =====================================================================
      // CRUD Operations - Auto-Generated
      // =====================================================================

      async create(document: Omit<TDocument, 'id'>, options?: RepositoryOperationOptions): Promise<TDocument> {
        const startTime = Date.now();

        try {
          const enrichedDocument = await this.enrichDocument(document, options);

          if (config.enableValidation && !options?.skipValidation) {
            await this.validateDocument(enrichedDocument);
          }

          await this.chromaService.addDocuments(
            config.collection,
            [this.documentToChromaDocument(enrichedDocument)],
            this.createBulkOptions(options)
          );

          this.logOperation('create', Date.now() - startTime, 1);

          return enrichedDocument;
        } catch (error) {
          return this.handleError('create', error, options);
        }
      }

      async createMany(documents: Omit<TDocument, 'id'>[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>> {
        const startTime = Date.now();

        try {
          const enrichedDocuments = await Promise.all(
            documents.map(doc => this.enrichDocument(doc, options))
          );

          if (config.enableValidation && !options?.skipValidation) {
            await Promise.all(enrichedDocuments.map(doc => this.validateDocument(doc)));
          }

          const chromaDocuments = enrichedDocuments.map(doc => this.documentToChromaDocument(doc));

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

      async findById(id: string, options?: RepositoryOperationOptions): Promise<TDocument | null> {
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

      async findByIds(ids: string[], options?: RepositoryOperationOptions): Promise<TDocument[]> {
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

      async findAll(options?: RepositoryOperationOptions & { where?: Where; whereDocument?: WhereDocument }): Promise<TDocument[]> {
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

      async update(id: string, updates: Partial<TDocument>, options?: RepositoryOperationOptions): Promise<TDocument | null> {
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
            [this.documentToChromaDocument(updatedDocument)],
            this.createBulkOptions(options)
          );

          return updatedDocument;
        } catch (error) {
          return this.handleError('update', error, options);
        }
      }

      async updateMany(updates: Array<{ id: string; data: Partial<TDocument> }>, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>> {
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

      async upsert(document: TDocument, options?: RepositoryOperationOptions): Promise<TDocument> {
        try {
          const enrichedDocument = await this.enrichDocument(document, options, document.id);

          if (config.enableValidation && !options?.skipValidation) {
            await this.validateDocument(enrichedDocument);
          }

          await this.chromaService.upsertDocuments(
            config.collection,
            [this.documentToChromaDocument(enrichedDocument)],
            this.createBulkOptions(options)
          );

          return enrichedDocument;
        } catch (error) {
          return this.handleError('upsert', error, options);
        }
      }

      async upsertMany(documents: TDocument[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>> {
        const startTime = Date.now();

        try {
          const enrichedDocuments = await Promise.all(
            documents.map(doc => this.enrichDocument(doc, options, doc.id))
          );

          if (config.enableValidation && !options?.skipValidation) {
            await Promise.all(enrichedDocuments.map(doc => this.validateDocument(doc)));
          }

          const chromaDocuments = enrichedDocuments.map(doc => this.documentToChromaDocument(doc));

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

      async delete(id: string, options?: RepositoryOperationOptions): Promise<boolean> {
        try {
          if (config.enableSoftDelete && !options?.metadata?.forceDelete) {
            // Soft delete by marking as deleted
            const updated = await this.update(id, {
              metadata: { ...{}, deleted: true, deletedAt: new Date().toISOString() }
            } as Partial<TDocument>, options);
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

      async deleteMany(ids: string[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult> {
        const startTime = Date.now();

        try {
          if (config.enableSoftDelete && !options?.metadata?.forceDelete) {
            // Soft delete by updating
            const updates = ids.map(id => ({
              id,
              data: {
                metadata: { deleted: true, deletedAt: new Date().toISOString() }
              } as Partial<TDocument>
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

      async deleteByFilter(where?: Where, whereDocument?: WhereDocument, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult> {
        try {
          await this.chromaService.deleteDocuments(config.collection, undefined, where, whereDocument);

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

      async search(query: string, options?: RepositorySearchOptions): Promise<TDocument[]> {
        try {
          const searchOptions = this.createSearchOptions(options);
          const result = await this.chromaService.searchDocuments(
            config.collection,
            [query],
            undefined,
            searchOptions
          );

          return this.chromaResultToDocuments(result);
        } catch (error) {
          return this.handleError('search', error, options) || [];
        }
      }

      async searchWithScores(query: string, options?: RepositorySearchOptions): Promise<Array<{ document: TDocument; score: number }>> {
        try {
          const searchOptions = {
            ...this.createSearchOptions(options),
            includeDistances: true,
          };

          const result = await this.chromaService.searchDocuments(
            config.collection,
            [query],
            undefined,
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

      async searchSimilar(embedding: number[], options?: RepositorySearchOptions): Promise<TDocument[]> {
        try {
          const searchOptions = this.createSearchOptions(options);
          const result = await this.chromaService.searchDocuments(
            config.collection,
            undefined,
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

      async count(where?: Where, whereDocument?: WhereDocument): Promise<number> {
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

      async exists(id: string): Promise<boolean> {
        try {
          const document = await this.findById(id);
          return !!document;
        } catch (error) {
          this.handleError('exists', error);
          return false;
        }
      }

      async peek(limit = 10): Promise<TDocument[]> {
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

      async clear(): Promise<void> {
        try {
          await this.chromaService.deleteCollection(config.collection);
          await this.chromaService.createCollection(config.collection);
        } catch (error) {
          this.handleError('clear', error);
        }
      }

      async getCollectionInfo(): Promise<{ name: string; count: number; metadata?: Record<string, unknown> }> {
        try {
          const count = await this.count();
          const metadata = await this.chromaService.getCollectionMetadata(config.collection);

          return {
            name: config.collection,
            count,
            metadata: metadata || undefined,
          };
        } catch (error) {
          this.handleError('getCollectionInfo', error);
          return { name: config.collection, count: 0 };
        }
      }

      // =====================================================================
      // Helper Methods
      // =====================================================================

      private findChromaService(args: any[]): ChromaDBService {
        // Look for ChromaDB service in constructor arguments
        for (const arg of args) {
          if (arg && typeof arg.searchDocuments === 'function') {
            return arg;
          }
        }

        // Look for injected service in class instance
        const instance = this as any;
        if (instance.chromaService) {
          return instance.chromaService;
        }

        if (instance.chromaDBService) {
          return instance.chromaDBService;
        }

        throw new Error(
          'ChromaDBService not found. Please inject it in the constructor or as a class property.'
        );
      }

      private async enrichDocument(
        document: Omit<TDocument, 'id'> | TDocument,
        options?: RepositoryOperationOptions,
        existingId?: string
      ): Promise<TDocument> {
        const enriched = { ...document } as any;

        // Generate ID if needed
        if (config.autoGenerateIds && !existingId && !('id' in document)) {
          enriched.id = this.generateId();
        } else if (existingId) {
          enriched.id = existingId;
        }

        // Add timestamps
        if (config.autoTimestamp) {
          const now = new Date().toISOString();
          if (!('createdAt' in document)) {
            enriched.createdAt = now;
          }
          enriched.updatedAt = now;

          if (!('version' in document)) {
            enriched.version = 1;
          } else if (existingId) {
            enriched.version = (enriched.version || 0) + 1;
          }
        }

        // Add custom metadata from options
        if (options?.metadata) {
          enriched.metadata = {
            ...enriched.metadata,
            ...options.metadata,
          };
        }

        return enriched as TDocument;
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

      private documentToChromaDocument(document: TDocument): ChromaDocument {
        return {
          id: document.id,
          content: document.content,
          metadata: document.metadata,
          embedding: document.embedding,
        };
      }

      private chromaResultToDocument(result: any, index: number): TDocument {
        return {
          id: result.ids[index],
          content: result.documents[index],
          metadata: result.metadatas[index],
          embedding: result.embeddings?.[index],
          createdAt: result.metadatas[index]?.createdAt,
          updatedAt: result.metadatas[index]?.updatedAt,
          version: result.metadatas[index]?.version,
        } as TDocument;
      }

      private chromaResultToDocuments(result: any): TDocument[] {
        const documents: TDocument[] = [];

        for (let i = 0; i < result.ids.length; i++) {
          documents.push(this.chromaResultToDocument(result, i));
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

      private handleError(operation: string, error: any, options?: RepositoryOperationOptions): any {
        const message = `Repository operation '${operation}' failed: ${error.message}`;

        switch (config.errorHandling) {
          case 'silent':
            break;
          case 'log_and_continue':
            this.logger.error(message, error.stack);
            break;
          case 'throw':
          default:
            this.logger.error(message, error.stack);
            throw error;
        }

        return null;
      }

      private handleBulkError(operation: string, error: any, count: number, options?: RepositoryOperationOptions): RepositoryOperationResult {
        this.handleError(operation, error, options);

        return {
          success: false,
          operationTime: 0,
          documentsProcessed: 0,
          errors: [error.message],
        };
      }
    }

    return Repository as any;
  };
}

/**
 * Type-safe repository factory
 */
export function createRepository<TDocument extends BaseDocument>(
  config: ChromaRepositoryConfig,
  chromaService: ChromaDBService
): ChromaRepository<TDocument> {
  @ChromaRepository(config)
  class Repository {
    constructor(public chromaService: ChromaDBService) {}
  }

  return new Repository(chromaService) as any;
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
