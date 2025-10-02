import { Injectable, Logger } from '@nestjs/common';
import { ChromaClientError, Where, WhereDocument } from 'chromadb';
import type { BaseDocument } from '../../types/core.interface';
import { TypeConversionUtils } from '../../utils/data/type-conversion.utils';
import { ChromaDBCollectionService } from './chromadb-collection.service';
import { ChromaDBDocumentService } from './chromadb-document.service';

/**
 * ChromaDB Repository Service
 *
 * Provides high-level, typed repository operations using the facade pattern
 * Following Single Responsibility Principle - only manages repository pattern operations
 */
@Injectable()
export class ChromaDBRepositoryService {
  private readonly logger = new Logger(ChromaDBRepositoryService.name);

  constructor(
    private readonly documentService: ChromaDBDocumentService,
    private readonly collectionService: ChromaDBCollectionService,
    private readonly typeUtils: TypeConversionUtils
  ) {}

  /**
   * Create a single document with type safety
   */
  async create<T extends BaseDocument>(
    collection: string,
    document: T
  ): Promise<T> {
    const chromaDoc = this.typeUtils.toChromaWireDocument(document);
    await this.documentService.addDocuments(collection, [chromaDoc]);
    return document;
  }

  /**
   * Create multiple documents with type safety
   */
  async createMany<T extends BaseDocument>(
    collection: string,
    documents: T[]
  ): Promise<T[]> {
    const chromaDocs = this.typeUtils.toChromaWireDocuments(documents);
    await this.documentService.addDocuments(collection, chromaDocs);
    return documents;
  }

  /**
   * Find a document by ID with type safety
   */
  async findById<T extends BaseDocument>(
    collection: string,
    id: string
  ): Promise<T | null> {
    const result = await this.documentService.getDocuments(collection, {
      ids: [id],
    });

    if (result.ids.length === 0 || !result.documents?.[0]) {
      return null;
    }

    return this.typeUtils.parseDocument<T>(result, 0);
  }

  /**
   * Find multiple documents by IDs with type safety
   */
  async findByIds<T extends BaseDocument>(
    collection: string,
    ids: string[]
  ): Promise<T[]> {
    const result = await this.documentService.getDocuments(collection, { ids });
    return this.typeUtils.parseDocuments<T>(result);
  }

  /**
   * Find all documents with optional filtering
   */
  async findAll<T extends BaseDocument>(
    collection: string,
    options?: {
      where?: Where;
      whereDocument?: WhereDocument;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    const result = await this.documentService.getDocuments(collection, {
      where: options?.where,
      whereDocument: options?.whereDocument,
      limit: options?.limit,
      offset: options?.offset,
    });

    return this.typeUtils.parseDocuments<T>(result);
  }

  /**
   * Update a document by ID
   */
  async update<T extends BaseDocument>(
    collection: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    const existing = await this.findById<T>(collection, id);
    if (!existing) {
      throw new ChromaClientError(
        `Document with ID '${id}' not found in collection '${collection}'`
      );
    }

    const updated = { ...existing, ...updates } as T;
    const chromaDoc = this.typeUtils.toChromaWireDocument(updated);

    await this.documentService.updateDocuments(collection, [chromaDoc]);
    return updated;
  }

  /**
   * Update multiple documents
   */
  async updateMany<T extends BaseDocument>(
    collection: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<T[]> {
    // Get all existing documents
    const ids = updates.map((u) => u.id);
    const existingDocs = await this.findByIds<T>(collection, ids);

    // Create bulk update payload using type utils
    const chromaDocs = this.typeUtils.createBulkUpdatePayloads(
      existingDocs,
      updates
    );

    await this.documentService.updateDocuments(collection, chromaDocs);

    // Return updated documents
    return existingDocs.map((existing) => {
      const update = updates.find((u) => u.id === existing.id);
      return update ? ({ ...existing, ...update.data } as T) : existing;
    });
  }

  /**
   * Delete a document by ID
   */
  async delete(collection: string, id: string): Promise<boolean> {
    try {
      await this.documentService.deleteDocuments(collection, [id]);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete document '${id}' from collection '${collection}': ${error}`
      );
      return false;
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(collection: string, ids: string[]): Promise<boolean> {
    try {
      await this.documentService.deleteDocuments(collection, ids);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete documents from collection '${collection}': ${error}`
      );
      return false;
    }
  }

  /**
   * Search documents using text query
   */
  async search<T extends BaseDocument>(
    collection: string,
    query: string,
    options?: {
      limit?: number;
      where?: Where;
      whereDocument?: WhereDocument;
    }
  ): Promise<T[]> {
    const searchResult = await this.documentService.searchDocuments(
      collection,
      [query],
      undefined,
      {
        nResults: options?.limit || 10,
        where: options?.where,
        whereDocument: options?.whereDocument,
      }
    );

    if (!searchResult.documents?.[0]) {
      return [];
    }

    return this.typeUtils.parseSearchResults<T>(searchResult);
  }

  /**
   * Count documents in collection
   */
  async count(
    collection: string,
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<number> {
    if (!where && !whereDocument) {
      return this.collectionService.countDocuments(collection);
    }

    const result = await this.documentService.getDocuments(collection, {
      where,
      whereDocument,
    });
    return result.ids.length;
  }

  /**
   * Upsert a single document
   */
  async upsert<T extends BaseDocument>(
    collection: string,
    document: T
  ): Promise<T> {
    const chromaDoc = this.typeUtils.toChromaWireDocument(document);
    await this.documentService.upsertDocuments(collection, [chromaDoc]);
    return document;
  }

  /**
   * Upsert multiple documents
   */
  async upsertMany<T extends BaseDocument>(
    collection: string,
    documents: T[]
  ): Promise<T[]> {
    const chromaDocs = this.typeUtils.toChromaWireDocuments(documents);
    await this.documentService.upsertDocuments(collection, chromaDocs);
    return documents;
  }

  /**
   * Check if a document exists by ID
   */
  async exists(collection: string, id: string): Promise<boolean> {
    const document = await this.findById(collection, id);
    return document !== null;
  }

  /**
   * Peek at documents in a collection
   */
  async peek<T extends BaseDocument>(
    collection: string,
    limit = 10
  ): Promise<T[]> {
    const result = await this.documentService.peekDocuments(collection, limit);
    return this.typeUtils.parseDocuments<T>(result);
  }
}
