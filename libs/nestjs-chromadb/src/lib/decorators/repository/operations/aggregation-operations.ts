/**
 * @fileoverview Repository Aggregation Operations
 *
 * Contains aggregation, counting, and collection management operations
 * Following Single Responsibility Principle - handles only aggregation and statistics
 */

import { Logger } from '@nestjs/common';
import type { Where, WhereDocument } from 'chromadb';
import type { BaseDocument } from '../../../types/core.interface';
import type { ChromaRepositoryConfig } from '../repository-metadata';
import { RepositoryHelpers } from './repository-helpers';
import { repositoryErrorHandler } from '../repository-validator';

/**
 * Aggregation Operations Implementation
 * Handles counting, statistics, and collection management
 */
export class AggregationOperations<
  TDocument extends BaseDocument = BaseDocument
> {
  private readonly logger = new Logger(AggregationOperations.name);
  private readonly helpers: RepositoryHelpers<TDocument>;

  constructor(
    private readonly config: ChromaRepositoryConfig,
    private readonly chromaService: any // ChromaDBService interface
  ) {
    this.helpers = new RepositoryHelpers(config, chromaService);
  }

  // =====================================================================
  // Counting Operations
  // =====================================================================

  async count(where?: Where, whereDocument?: WhereDocument): Promise<number> {
    try {
      if (!where && !whereDocument) {
        return await this.chromaService.countDocuments(this.config.collection);
      } else {
        const result = await this.chromaService.getDocuments(
          this.config.collection,
          {
            where,
            whereDocument,
            includeMetadata: false,
            includeDocuments: false,
          }
        );
        return result.ids.length;
      }
    } catch (error) {
      repositoryErrorHandler.handleError('count', error, this.config);
      return 0;
    }
  }

  async countByMetadata(where: Where): Promise<number> {
    try {
      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          where,
          includeMetadata: false,
          includeDocuments: false,
        }
      );
      return result.ids.length;
    } catch (error) {
      repositoryErrorHandler.handleError('countByMetadata', error, this.config);
      return 0;
    }
  }

  async countByDocument(whereDocument: WhereDocument): Promise<number> {
    try {
      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          whereDocument,
          includeMetadata: false,
          includeDocuments: false,
        }
      );
      return result.ids.length;
    } catch (error) {
      repositoryErrorHandler.handleError('countByDocument', error, this.config);
      return 0;
    }
  }

  // =====================================================================
  // Existence Operations
  // =====================================================================

  async exists(id: string): Promise<boolean> {
    try {
      this.helpers.validateDocumentId(id);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          ids: [id],
          includeMetadata: false,
          includeDocuments: false,
        }
      );

      return result.ids.length > 0;
    } catch (error) {
      repositoryErrorHandler.handleError('exists', error, this.config);
      return false;
    }
  }

  async existsMany(ids: string[]): Promise<Record<string, boolean>> {
    try {
      this.helpers.validateDocumentIds(ids);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          ids,
          includeMetadata: false,
          includeDocuments: false,
        }
      );

      const existingIds = new Set(result.ids);
      const existenceMap: Record<string, boolean> = {};

      ids.forEach((id) => {
        existenceMap[id] = existingIds.has(id);
      });

      return existenceMap;
    } catch (error) {
      repositoryErrorHandler.handleError('existsMany', error, this.config);
      return ids.reduce((map, id) => ({ ...map, [id]: false }), {});
    }
  }

  async existsByMetadata(where: Where): Promise<boolean> {
    try {
      const count = await this.countByMetadata(where);
      return count > 0;
    } catch (error) {
      repositoryErrorHandler.handleError(
        'existsByMetadata',
        error,
        this.config
      );
      return false;
    }
  }

  // =====================================================================
  // Sampling Operations
  // =====================================================================

  async peek(limit = 10): Promise<TDocument[]> {
    try {
      if (limit <= 0) {
        throw new Error('Limit must be a positive number');
      }

      const result = await this.chromaService.peekDocuments(
        this.config.collection,
        limit
      );
      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError('peek', error, this.config) || []
      );
    }
  }

  async sample(
    count: number,
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<TDocument[]> {
    try {
      if (count <= 0) {
        throw new Error('Count must be a positive number');
      }

      // Get all matching documents first
      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          where,
          whereDocument,
          includeMetadata: true,
          includeDocuments: true,
        }
      );

      if (result.ids.length === 0) {
        return [];
      }

      // Sample from the results
      const documents = this.helpers.chromaResultToDocuments(result);

      if (documents.length <= count) {
        return documents;
      }

      // Random sampling
      const sampled: TDocument[] = [];
      const indices = new Set<number>();

      while (indices.size < count) {
        const randomIndex = Math.floor(Math.random() * documents.length);
        if (!indices.has(randomIndex)) {
          indices.add(randomIndex);
          sampled.push(documents[randomIndex]);
        }
      }

      return sampled;
    } catch (error) {
      return (
        repositoryErrorHandler.handleError('sample', error, this.config) || []
      );
    }
  }

  // =====================================================================
  // Statistics Operations
  // =====================================================================

  async getStatistics(): Promise<{
    totalDocuments: number;
    collectionName: string;
    hasEmbeddings: boolean;
    averageContentLength?: number;
    metadataKeys: string[];
  }> {
    try {
      const totalDocuments = await this.count();

      if (totalDocuments === 0) {
        return {
          totalDocuments: 0,
          collectionName: this.config.collection,
          hasEmbeddings: false,
          metadataKeys: [],
        };
      }

      // Sample a few documents to analyze structure
      const sampleDocs = await this.peek(Math.min(10, totalDocuments));

      const hasEmbeddings = sampleDocs.some(
        (doc) => doc.embedding && doc.embedding.length > 0
      );
      const averageContentLength =
        sampleDocs.length > 0
          ? Math.round(
              sampleDocs.reduce(
                (sum, doc) => sum + (doc.content?.length || 0),
                0
              ) / sampleDocs.length
            )
          : undefined;

      // Extract metadata keys
      const metadataKeysSet = new Set<string>();
      sampleDocs.forEach((doc) => {
        if (doc.metadata && typeof doc.metadata === 'object') {
          Object.keys(doc.metadata).forEach((key) => metadataKeysSet.add(key));
        }
      });

      return {
        totalDocuments,
        collectionName: this.config.collection,
        hasEmbeddings,
        averageContentLength,
        metadataKeys: Array.from(metadataKeysSet).sort(),
      };
    } catch (error) {
      repositoryErrorHandler.handleError('getStatistics', error, this.config);
      return {
        totalDocuments: 0,
        collectionName: this.config.collection,
        hasEmbeddings: false,
        metadataKeys: [],
      };
    }
  }

  // =====================================================================
  // Collection Operations
  // =====================================================================

  async clear(): Promise<void> {
    try {
      await this.chromaService.deleteCollection(this.config.collection);
      await this.chromaService.createCollection(this.config.collection);
    } catch (error) {
      repositoryErrorHandler.handleError('clear', error, this.config);
    }
  }

  async getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata?: Record<string, unknown>;
    size?: number;
    lastModified?: string;
  }> {
    try {
      const count = await this.count();
      const metadata = await this.chromaService.getCollectionMetadata(
        this.config.collection
      );

      // Try to get additional collection info if available
      let size: number | undefined;
      let lastModified: string | undefined;

      try {
        const stats = await this.getStatistics();
        size = stats.totalDocuments;
        lastModified = new Date().toISOString(); // Fallback to current time
      } catch {
        // Ignore errors getting extended info
      }

      return {
        name: this.config.collection,
        count,
        metadata: metadata || {},
        size,
        lastModified,
      };
    } catch (error) {
      repositoryErrorHandler.handleError(
        'getCollectionInfo',
        error,
        this.config
      );
      return {
        name: this.config.collection,
        count: 0,
        size: 0,
        lastModified: new Date().toISOString(),
      };
    }
  }

  async isEmpty(): Promise<boolean> {
    try {
      const count = await this.count();
      return count === 0;
    } catch (error) {
      repositoryErrorHandler.handleError('isEmpty', error, this.config);
      return true; // Assume empty on error
    }
  }

  // =====================================================================
  // Batch Information Operations
  // =====================================================================

  async getBatchInfo(batchSize = 100): Promise<{
    totalBatches: number;
    lastBatchSize: number;
    recommendedBatchSize: number;
  }> {
    try {
      const totalCount = await this.count();

      if (totalCount === 0) {
        return {
          totalBatches: 0,
          lastBatchSize: 0,
          recommendedBatchSize: batchSize,
        };
      }

      const totalBatches = Math.ceil(totalCount / batchSize);
      const lastBatchSize = totalCount % batchSize || batchSize;

      // Calculate recommended batch size based on collection size
      let recommendedBatchSize = batchSize;
      if (totalCount < 100) {
        recommendedBatchSize = Math.max(10, totalCount);
      } else if (totalCount > 10000) {
        recommendedBatchSize = Math.min(500, batchSize * 2);
      }

      return {
        totalBatches,
        lastBatchSize,
        recommendedBatchSize,
      };
    } catch (error) {
      repositoryErrorHandler.handleError('getBatchInfo', error, this.config);
      return {
        totalBatches: 0,
        lastBatchSize: 0,
        recommendedBatchSize: batchSize,
      };
    }
  }
}
