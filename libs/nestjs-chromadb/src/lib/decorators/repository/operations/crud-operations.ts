/**
 * @fileoverview Repository CRUD Operations
 *
 * Contains all basic Create, Read, Update, Delete operations
 * Following Single Responsibility Principle - handles only CRUD operations
 */

// Logger removed - operations log via parent service
import type { BaseDocument } from '../../../types/core.interface';
import type {
  ChromaRepositoryConfig,
  RepositoryOperationOptions,
  RepositoryOperationResult,
} from '../repository-metadata';
import { RepositoryHelpers } from './repository-helpers';
import {
  repositoryValidator,
  repositoryErrorHandler,
} from '../repository-validator';

/**
 * CRUD Operations Implementation
 * Handles Create, Read, Update, Delete operations for repository pattern
 */
export class CrudOperations<TDocument extends BaseDocument = BaseDocument> {
  // Logger removed - operations log via parent service
  private readonly helpers: RepositoryHelpers<TDocument>;

  constructor(
    private readonly config: ChromaRepositoryConfig,
    private readonly chromaService: any // ChromaDBService interface
  ) {
    this.helpers = new RepositoryHelpers(config);
  }

  // =====================================================================
  // Create Operations
  // =====================================================================

  async create(
    document: Omit<TDocument, 'id'>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument> {
    const startTime = Date.now();

    try {
      repositoryValidator.validateOptions(options);

      const enrichedDocument = this.helpers.enrichDocument(document, options);

      if (this.config.enableValidation && !options?.skipValidation) {
        await repositoryValidator.validateDocument(
          enrichedDocument,
          this.config
        );
      }

      await this.chromaService.addDocuments(
        this.config.collection,
        [this.helpers.documentToChromaWire(enrichedDocument)],
        this.helpers.createBulkOptions(options)
      );

      this.helpers.logOperation('create', Date.now() - startTime, 1);

      return enrichedDocument;
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'create',
          error,
          this.config,
          options
        ) ||
        Promise.reject(
          repositoryErrorHandler.createContextualError('create', error, {
            collection: this.config.collection,
            options,
          })
        )
      );
    }
  }

  async createMany(
    documents: Omit<TDocument, 'id'>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    const startTime = Date.now();

    try {
      repositoryValidator.validateOptions(options);

      const enrichedDocuments = documents.map((doc) =>
        this.helpers.enrichDocument(doc, options)
      );

      if (this.config.enableValidation && !options?.skipValidation) {
        await repositoryValidator.validateDocuments(
          enrichedDocuments,
          this.config
        );
      }

      const chromaDocuments = enrichedDocuments.map((doc) =>
        this.helpers.documentToChromaWire(doc)
      );

      await this.chromaService.addDocuments(
        this.config.collection,
        chromaDocuments,
        this.helpers.createBulkOptions(options)
      );

      const operationTime = Date.now() - startTime;
      this.helpers.logOperation('createMany', operationTime, documents.length);

      return {
        success: true,
        operationTime,
        documentsProcessed: documents.length,
        documents: enrichedDocuments,
      };
    } catch (error) {
      return repositoryErrorHandler.handleBulkError(
        'createMany',
        error,
        documents.length,
        this.config,
        options
      );
    }
  }

  // =====================================================================
  // Read Operations
  // =====================================================================

  async findById(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null> {
    try {
      repositoryValidator.validateOptions(options);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          ids: [id],
          includeMetadata: true,
          includeDocuments: true,
          includeEmbeddings:
            (options?.metadata?.includeEmbeddings as boolean) || false,
        }
      );

      if (!result.ids.length) {
        return null;
      }

      return this.helpers.chromaResultToDocument(result, 0);
    } catch (error) {
      return repositoryErrorHandler.handleError(
        'findById',
        error,
        this.config,
        options
      );
    }
  }

  async findByIds(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          ids,
          includeMetadata: true,
          includeDocuments: true,
          includeEmbeddings:
            (options?.metadata?.includeEmbeddings as boolean) || false,
        }
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'findByIds',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  async findAll(
    options?: RepositoryOperationOptions & { where?: any; whereDocument?: any }
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          where: options?.where,
          whereDocument: options?.whereDocument,
          includeMetadata: true,
          includeDocuments: true,
          includeEmbeddings:
            (options?.metadata?.includeEmbeddings as boolean) || false,
        }
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'findAll',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  // =====================================================================
  // Update Operations
  // =====================================================================

  async update(
    id: string,
    updates: Partial<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null> {
    try {
      repositoryValidator.validateOptions(options);

      // First, get the existing document
      const existing = await this.findById(id, options);
      if (!existing) {
        return null;
      }

      // Merge updates
      const updatedDocument = this.helpers.enrichDocument(
        { ...existing, ...updates } as Omit<TDocument, 'id'>,
        options,
        existing.id
      );

      if (this.config.enableValidation && !options?.skipValidation) {
        await repositoryValidator.validateDocument(
          updatedDocument,
          this.config
        );
      }

      await this.chromaService.updateDocuments(
        this.config.collection,
        [this.helpers.documentToChromaWire(updatedDocument)],
        this.helpers.createBulkOptions(options)
      );

      return updatedDocument;
    } catch (error) {
      return repositoryErrorHandler.handleError(
        'update',
        error,
        this.config,
        options
      );
    }
  }

  async updateMany(
    updates: Array<{ id: string; data: Partial<TDocument> }>,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    const startTime = Date.now();

    try {
      repositoryValidator.validateOptions(options);

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
      return repositoryErrorHandler.handleBulkError(
        'updateMany',
        error,
        updates.length,
        this.config,
        options
      );
    }
  }

  async upsert(
    document: Omit<TDocument, 'toChroma' | 'getCollectionName'> & {
      id: string;
    },
    options?: RepositoryOperationOptions
  ): Promise<TDocument> {
    try {
      repositoryValidator.validateOptions(options);

      const enrichedDocument = this.helpers.enrichDocument(
        document as any,
        options,
        document.id
      );

      if (this.config.enableValidation && !options?.skipValidation) {
        await repositoryValidator.validateDocument(
          enrichedDocument,
          this.config
        );
      }

      await this.chromaService.upsertDocuments(
        this.config.collection,
        [this.helpers.documentToChromaWire(enrichedDocument)],
        this.helpers.createBulkOptions(options)
      );

      return enrichedDocument;
    } catch (error) {
      repositoryErrorHandler.handleError('upsert', error, this.config, options);
      throw repositoryErrorHandler.createContextualError('upsert', error, {
        collection: this.config.collection,
        documentId: document.id,
        options,
      });
    }
  }

  async upsertMany(
    documents: Array<
      Omit<TDocument, 'toChroma' | 'getCollectionName'> & { id: string }
    >,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    const startTime = Date.now();

    try {
      repositoryValidator.validateOptions(options);

      const enrichedDocuments = documents.map((doc) =>
        this.helpers.enrichDocument(doc as any, options, doc.id)
      );

      if (this.config.enableValidation && !options?.skipValidation) {
        await repositoryValidator.validateDocuments(
          enrichedDocuments,
          this.config
        );
      }

      const chromaDocuments = enrichedDocuments.map((doc) =>
        this.helpers.documentToChromaWire(doc)
      );

      await this.chromaService.upsertDocuments(
        this.config.collection,
        chromaDocuments,
        this.helpers.createBulkOptions(options)
      );

      return {
        success: true,
        operationTime: Date.now() - startTime,
        documentsProcessed: documents.length,
        documents: enrichedDocuments,
      };
    } catch (error) {
      return repositoryErrorHandler.handleBulkError(
        'upsertMany',
        error,
        documents.length,
        this.config,
        options
      );
    }
  }

  // =====================================================================
  // Delete Operations
  // =====================================================================

  async delete(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<boolean> {
    try {
      repositoryValidator.validateOptions(options);

      if (this.config.enableSoftDelete && !options?.metadata?.forceDelete) {
        // Soft delete by marking as deleted
        const updated = await this.update(
          id,
          {
            metadata: { deleted: true, deletedAt: new Date().toISOString() },
          } as unknown as Partial<TDocument>,
          options
        );
        return !!updated;
      } else {
        // Hard delete
        await this.chromaService.deleteDocuments(this.config.collection, [id]);
        return true;
      }
    } catch (error) {
      repositoryErrorHandler.handleError('delete', error, this.config, options);
      return false;
    }
  }

  async deleteMany(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult> {
    const startTime = Date.now();

    try {
      repositoryValidator.validateOptions(options);

      if (this.config.enableSoftDelete && !options?.metadata?.forceDelete) {
        // Soft delete by updating
        const updates = ids.map((id) => ({
          id,
          data: {
            metadata: { deleted: true, deletedAt: new Date().toISOString() },
          } as unknown as Partial<TDocument>,
        }));

        return await this.updateMany(updates, options);
      } else {
        // Hard delete
        await this.chromaService.deleteDocuments(this.config.collection, ids);

        return {
          success: true,
          operationTime: Date.now() - startTime,
          documentsProcessed: ids.length,
        };
      }
    } catch (error) {
      return repositoryErrorHandler.handleBulkError(
        'deleteMany',
        error,
        ids.length,
        this.config,
        options
      );
    }
  }

  async deleteByFilter(
    where?: any,
    whereDocument?: any,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult> {
    try {
      repositoryValidator.validateOptions(options);

      await this.chromaService.deleteDocuments(
        this.config.collection,
        [],
        where,
        whereDocument
      );

      return {
        success: true,
        operationTime: 0, // ChromaDB doesn't return timing for this operation
        documentsProcessed: -1, // Unknown count
      };
    } catch (error) {
      return repositoryErrorHandler.handleBulkError(
        'deleteByFilter',
        error,
        -1,
        this.config,
        options
      );
    }
  }
}
