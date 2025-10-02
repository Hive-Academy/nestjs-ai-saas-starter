import { Injectable } from '@nestjs/common';
import {
  Collection,
  CollectionMetadata,
  GetResult,
  Where,
  WhereDocument,
} from 'chromadb';
import {
  ChromaBulkOptions,
  ChromaCollectionInfo,
  ChromaDocument,
  ChromaSearchResult,
} from '../../interfaces/chromadb-service.interface';
import { IChromaOperations } from '../../interfaces/core/database-abstractions.interface';
import type {
  BaseDocument,
  ChromaSearchOptions,
  GetDocumentsOptions,
} from '../../types/core.interface';
import { ChromaDBCollectionService } from './chromadb-collection.service';
import { ChromaDBDocumentService } from './chromadb-document.service';
import { ChromaDBRepositoryService } from './chromadb-repository.service';

/**
 * ChromaDB Operations Service - Facade Pattern
 *
 * Coordinates specialized services to provide the complete IChromaOperations interface
 * Following Facade Pattern - delegates to focused services while maintaining interface compatibility
 */
@Injectable()
export class ChromaDBOperationsService implements IChromaOperations {
  constructor(
    private readonly collectionService: ChromaDBCollectionService,
    private readonly documentService: ChromaDBDocumentService,
    private readonly repositoryService: ChromaDBRepositoryService
  ) {}

  // ========================================
  // Collection Management Operations
  // ========================================

  /**
   * List all collections
   */
  async listCollections(): Promise<ChromaCollectionInfo[]> {
    return this.collectionService.listCollections();
  }

  /**
   * Create a new collection
   */
  async createCollection(
    name: string,
    metadata?: CollectionMetadata,
    embeddingFunction?: unknown,
    getOrCreate = true
  ): Promise<Collection> {
    return this.collectionService.createCollection(
      name,
      metadata,
      embeddingFunction,
      getOrCreate
    );
  }

  /**
   * Get an existing collection
   */
  async getCollection(
    name: string,
    embeddingFunction?: unknown
  ): Promise<Collection> {
    return this.collectionService.getCollection(name, embeddingFunction);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    return this.collectionService.deleteCollection(name);
  }

  /**
   * Check if collection exists
   */
  async collectionExists(name: string): Promise<boolean> {
    return this.collectionService.collectionExists(name);
  }

  // ========================================
  // Document CRUD Operations
  // ========================================

  /**
   * Add documents to collection
   */
  async addDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    return this.documentService.addDocuments(
      collectionName,
      documents,
      options
    );
  }

  /**
   * Update documents in collection
   */
  async updateDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    return this.documentService.updateDocuments(
      collectionName,
      documents,
      options
    );
  }

  /**
   * Upsert documents in collection
   */
  async upsertDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    return this.documentService.upsertDocuments(
      collectionName,
      documents,
      options
    );
  }

  /**
   * Delete documents from collection
   */
  async deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<void> {
    return this.documentService.deleteDocuments(
      collectionName,
      ids,
      where,
      whereDocument
    );
  }

  // ========================================
  // Document Query Operations
  // ========================================

  /**
   * Get documents from collection
   */
  async getDocuments(
    collectionName: string,
    options: GetDocumentsOptions = {}
  ): Promise<GetResult> {
    return this.documentService.getDocuments(collectionName, options);
  }

  /**
   * Count documents in collection
   */
  async countDocuments(collectionName: string): Promise<number> {
    return this.collectionService.countDocuments(collectionName);
  }

  /**
   * Peek documents from collection
   */
  async peekDocuments(collectionName: string, limit = 10): Promise<GetResult> {
    return this.documentService.peekDocuments(collectionName, limit);
  }

  /**
   * Search documents in collection
   */
  async searchDocuments(
    collectionName: string,
    queryTexts: string[],
    queryEmbeddings?: number[][],
    options: ChromaSearchOptions = {}
  ): Promise<ChromaSearchResult> {
    return this.documentService.searchDocuments(
      collectionName,
      queryTexts,
      queryEmbeddings,
      options
    );
  }

  // ========================================
  // Collection Metadata Operations
  // ========================================

  /**
   * Get collection metadata
   */
  async getCollectionMetadata(
    name: string
  ): Promise<Record<string, any> | null> {
    return this.collectionService.getCollectionMetadata(name);
  }

  /**
   * Update collection metadata
   */
  async updateCollectionMetadata(
    name: string,
    metadata: Record<string, any>
  ): Promise<void> {
    return this.collectionService.updateCollectionMetadata(name, metadata);
  }

  // ========================================
  // Administrative Operations
  // ========================================

  /**
   * Reset the entire ChromaDB instance
   */
  async reset(): Promise<boolean> {
    return this.collectionService.reset();
  }

  // ========================================
  // High-Level Generic Operations (Repository Pattern)
  // ========================================

  /**
   * Create a single document with type safety
   */
  async create<T extends BaseDocument>(
    collection: string,
    document: T
  ): Promise<T> {
    return this.repositoryService.create(collection, document);
  }

  /**
   * Create multiple documents with type safety
   */
  async createMany<T extends BaseDocument>(
    collection: string,
    documents: T[]
  ): Promise<T[]> {
    return this.repositoryService.createMany(collection, documents);
  }

  /**
   * Find a document by ID with type safety
   */
  async findById<T extends BaseDocument>(
    collection: string,
    id: string
  ): Promise<T | null> {
    return this.repositoryService.findById(collection, id);
  }

  /**
   * Find multiple documents by IDs with type safety
   */
  async findByIds<T extends BaseDocument>(
    collection: string,
    ids: string[]
  ): Promise<T[]> {
    return this.repositoryService.findByIds(collection, ids);
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
    return this.repositoryService.findAll(collection, options);
  }

  /**
   * Update a document by ID
   */
  async update<T extends BaseDocument>(
    collection: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    return this.repositoryService.update(collection, id, updates);
  }

  /**
   * Update multiple documents
   */
  async updateMany<T extends BaseDocument>(
    collection: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<T[]> {
    return this.repositoryService.updateMany(collection, updates);
  }

  /**
   * Delete a document by ID
   */
  async delete(collection: string, id: string): Promise<boolean> {
    return this.repositoryService.delete(collection, id);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(collection: string, ids: string[]): Promise<boolean> {
    return this.repositoryService.deleteMany(collection, ids);
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
    return this.repositoryService.search(collection, query, options);
  }

  /**
   * Count documents in collection
   */
  async count(
    collection: string,
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<number> {
    return this.repositoryService.count(collection, where, whereDocument);
  }
}
