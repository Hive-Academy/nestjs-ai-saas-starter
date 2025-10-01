/**
 * @fileoverview Repository Implementation Orchestrator
 *
 * Orchestrates specialized operation classes following Composition Pattern
 * Reduced from 696 LOC to ~150 LOC by delegating to focused operation classes
 */

import { Logger } from '@nestjs/common';
import type { Where, WhereDocument } from 'chromadb';
import type { BaseDocument } from '../../types/core.interface';
import type { ChromaDBService } from '../../services/chromadb.service';
import type {
  ChromaRepositoryConfig,
  ChromaRepository,
  RepositoryOperationOptions,
  RepositoryOperationResult,
  RepositorySearchOptions,
  RepositorySearchResultWithScore,
} from './repository-metadata';
import { repositoryValidator } from './repository-validator';

// Import specialized operation classes
import { CrudOperations } from './operations/crud-operations';
import { SearchOperations } from './operations/search-operations';
import { AggregationOperations } from './operations/aggregation-operations';

/**
 * Repository Implementation Orchestrator
 *
 * Coordinates specialized operation classes rather than implementing everything inline
 * Following Composition Pattern and Single Responsibility Principle
 */
export class RepositoryImplementation<
  TDocument extends BaseDocument = BaseDocument
> implements ChromaRepository<TDocument>
{
  private readonly logger = new Logger(RepositoryImplementation.name);

  // Specialized operation handlers
  private readonly crudOps: CrudOperations<TDocument>;
  private readonly searchOps: SearchOperations<TDocument>;
  private readonly aggregationOps: AggregationOperations<TDocument>;

  constructor(
    private readonly config: ChromaRepositoryConfig,
    private readonly _chromaService: ChromaDBService
  ) {
    // Validate configuration
    repositoryValidator.validateCollection(config.collection);

    // Initialize specialized operation handlers
    this.crudOps = new CrudOperations(config, _chromaService);
    this.searchOps = new SearchOperations(config, _chromaService);
    this.aggregationOps = new AggregationOperations(config, _chromaService);
  }

  // =====================================================================
  // CRUD Operations - Delegated to CrudOperations
  // =====================================================================

  async create(
    document: Omit<TDocument, 'id'>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument> {
    return this.crudOps.create(document, options);
  }

  async createMany(
    documents: Omit<TDocument, 'id'>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    return this.crudOps.createMany(documents, options);
  }

  async findById(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null> {
    return this.crudOps.findById(id, options);
  }

  async findByIds(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<TDocument[]> {
    return this.crudOps.findByIds(ids, options);
  }

  async findAll(
    options?: RepositoryOperationOptions & {
      where?: Where;
      whereDocument?: WhereDocument;
    }
  ): Promise<TDocument[]> {
    return this.crudOps.findAll(options);
  }

  async update(
    id: string,
    updates: Partial<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null> {
    return this.crudOps.update(id, updates, options);
  }

  async updateMany(
    updates: Array<{ id: string; data: Partial<TDocument> }>,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    return this.crudOps.updateMany(updates, options);
  }

  async upsert(
    document: TDocument,
    options?: RepositoryOperationOptions
  ): Promise<TDocument> {
    return this.crudOps.upsert(document, options);
  }

  async upsertMany(
    documents: TDocument[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    return this.crudOps.upsertMany(documents, options);
  }

  async delete(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<boolean> {
    return this.crudOps.delete(id, options);
  }

  async deleteMany(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult> {
    return this.crudOps.deleteMany(ids, options);
  }

  async deleteByFilter(
    where?: Where,
    whereDocument?: WhereDocument,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult> {
    return this.crudOps.deleteByFilter(where, whereDocument, options);
  }

  // =====================================================================
  // Search Operations - Delegated to SearchOperations
  // =====================================================================

  async search(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    return this.searchOps.search(query, options);
  }

  async searchWithScores(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<RepositorySearchResultWithScore<TDocument>[]> {
    return this.searchOps.searchWithScores(query, options);
  }

  async searchSimilar(
    embedding: number[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    return this.searchOps.searchSimilar(embedding, options);
  }

  // =====================================================================
  // Aggregation Operations - Delegated to AggregationOperations
  // =====================================================================

  async count(where?: Where, whereDocument?: WhereDocument): Promise<number> {
    return this.aggregationOps.count(where, whereDocument);
  }

  async exists(id: string): Promise<boolean> {
    return this.aggregationOps.exists(id);
  }

  async peek(limit = 10): Promise<TDocument[]> {
    return this.aggregationOps.peek(limit);
  }

  async clear(): Promise<void> {
    return this.aggregationOps.clear();
  }

  async getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata?: Record<string, unknown>;
  }> {
    return this.aggregationOps.getCollectionInfo();
  }

  // =====================================================================
  // Extended Operations (exposed from specialized classes)
  // =====================================================================

  // Extended search operations
  async searchBatch(
    queries: string[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[][]> {
    return this.searchOps.searchBatch(queries, options);
  }

  async searchByMetadata(
    where: Where,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    return this.searchOps.searchByMetadata(where, options);
  }

  async searchCombined(
    query: string,
    where?: Where,
    whereDocument?: WhereDocument,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    return this.searchOps.searchCombined(query, where, whereDocument, options);
  }

  // Extended aggregation operations
  async getStatistics(): Promise<{
    totalDocuments: number;
    collectionName: string;
    hasEmbeddings: boolean;
    averageContentLength?: number;
    metadataKeys: string[];
  }> {
    return this.aggregationOps.getStatistics();
  }

  async existsMany(ids: string[]): Promise<Record<string, boolean>> {
    return this.aggregationOps.existsMany(ids);
  }

  async sample(count: number, where?: Where): Promise<TDocument[]> {
    return this.aggregationOps.sample(count, where);
  }

  // =====================================================================
  // Health and Diagnostics
  // =====================================================================

  async healthCheck(): Promise<{
    healthy: boolean;
    collection: string;
    accessible: boolean;
    documentCount?: number;
    error?: string;
  }> {
    try {
      const count = await this.count();

      return {
        healthy: true,
        collection: this.config.collection,
        accessible: true,
        documentCount: count,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Health check failed for collection ${this.config.collection}`,
        {
          error: errorMessage,
          collection: this.config.collection,
        }
      );

      return {
        healthy: false,
        collection: this.config.collection,
        accessible: false,
        error: errorMessage,
      };
    }
  }
}
