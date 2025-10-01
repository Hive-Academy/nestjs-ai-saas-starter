/**
 * @fileoverview Repository Search Operations
 *
 * Contains all search and similarity operations
 * Following Single Responsibility Principle - handles only search operations
 */

import type { ChromaDBService } from '../../../services/chromadb.service';
import type { BaseDocument } from '../../../types/core.interface';
import type {
  ChromaRepositoryConfig,
  RepositorySearchOptions,
  RepositorySearchResultWithScore,
} from '../repository-metadata';
import {
  repositoryErrorHandler,
  repositoryValidator,
} from '../repository-validator';
import { RepositoryHelpers } from './repository-helpers';

/**
 * Search Operations Implementation
 * Handles semantic search, similarity search, and vector operations
 */
export class SearchOperations<TDocument extends BaseDocument = BaseDocument> {
  private readonly helpers: RepositoryHelpers<TDocument>;

  constructor(
    private readonly config: ChromaRepositoryConfig,
    private readonly chromaService: ChromaDBService // ChromaDBService interface
  ) {
    this.helpers = new RepositoryHelpers(config);
  }

  // =====================================================================
  // Search Operations
  // =====================================================================

  async search(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const searchOptions = this.helpers.createSearchOptions(options);
      const result = await this.chromaService.searchDocuments(
        this.config.collection,
        [query],
        [],
        searchOptions
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'search',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  async searchWithScores(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<RepositorySearchResultWithScore<TDocument>[]> {
    try {
      repositoryValidator.validateOptions(options);

      const searchOptions = {
        ...this.helpers.createSearchOptions(options),
        includeDistances: true,
      };

      const result = await this.chromaService.searchDocuments(
        this.config.collection,
        [query],
        [],
        searchOptions
      );

      const documents = this.helpers.chromaResultToDocuments(result);
      const distances = result.distances?.[0] || [];

      return documents.map((document, index) => ({
        document,
        score: 1 - (distances[index] || 0), // Convert distance to similarity score
        distance: distances[index] || undefined,
      }));
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'searchWithScores',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  async searchSimilar(
    embedding: number[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const searchOptions = this.helpers.createSearchOptions(options);
      const result = await this.chromaService.searchDocuments(
        this.config.collection,
        [],
        [embedding],
        searchOptions
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'searchSimilar',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  async searchBatch(
    queries: string[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[][]> {
    try {
      repositoryValidator.validateOptions(options);

      const searchOptions = this.helpers.createSearchOptions(options);
      const result = await this.chromaService.searchDocuments(
        this.config.collection,
        queries,
        [],
        searchOptions
      );

      // Handle batch results - ChromaDB returns results for each query
      if (!result.ids || !Array.isArray(result.ids[0])) {
        // Single result set
        return [this.helpers.chromaResultToDocuments(result)];
      } else {
        // Multiple result sets
        const batchResults: TDocument[][] = [];
        for (let i = 0; i < queries.length; i++) {
          const queryResult = {
            ids: result.ids[i] || [],
            documents: result.documents?.[i] || [],
            metadatas: result.metadatas?.[i] || [],
            embeddings: result.embeddings?.[i] || [],
          };
          batchResults.push(
            this.helpers.chromaResultToDocuments(queryResult as any)
          );
        }
        return batchResults;
      }
    } catch (error) {
      repositoryErrorHandler.handleError(
        'searchBatch',
        error,
        this.config,
        options
      );
      return Array(queries.length).fill([]);
    }
  }

  async searchSimilarBatch(
    embeddings: number[][],
    options?: RepositorySearchOptions
  ): Promise<TDocument[][]> {
    try {
      repositoryValidator.validateOptions(options);

      const searchOptions = this.helpers.createSearchOptions(options);
      const result = await this.chromaService.searchDocuments(
        this.config.collection,
        [],
        embeddings,
        searchOptions
      );

      // Handle batch results
      if (!result.ids || !Array.isArray(result.ids[0])) {
        return [this.helpers.chromaResultToDocuments(result)];
      } else {
        const batchResults: TDocument[][] = [];
        for (let i = 0; i < embeddings.length; i++) {
          const queryResult = {
            ids: result.ids[i] || [],
            documents: result.documents?.[i] || [],
            metadatas: result.metadatas?.[i] || [],
            embeddings: result.embeddings?.[i] || [],
          };
          batchResults.push(
            this.helpers.chromaResultToDocuments(queryResult as any)
          );
        }
        return batchResults;
      }
    } catch (error) {
      repositoryErrorHandler.handleError(
        'searchSimilarBatch',
        error,
        this.config,
        options
      );
      return Array(embeddings.length).fill([]);
    }
  }

  // =====================================================================
  // Advanced Search Operations
  // =====================================================================

  async searchByMetadata(
    where: any,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          where,
          includeMetadata: true,
          includeDocuments: true,
          includeEmbeddings: options?.include?.embeddings ?? false,
        }
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'searchByMetadata',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  async searchByDocument(
    whereDocument: any,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const result = await this.chromaService.getDocuments(
        this.config.collection,
        {
          whereDocument,
          includeMetadata: true,
          includeDocuments: true,
          includeEmbeddings: options?.include?.embeddings ?? false,
        }
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'searchByDocument',
          error,
          this.config,
          options
        ) || []
      );
    }
  }

  async searchCombined(
    query: string,
    where?: any,
    whereDocument?: any,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    try {
      repositoryValidator.validateOptions(options);

      const searchOptions = {
        ...this.helpers.createSearchOptions(options),
        where,
        whereDocument,
      };

      const result = await this.chromaService.searchDocuments(
        this.config.collection,
        [query],
        [],
        searchOptions
      );

      return this.helpers.chromaResultToDocuments(result);
    } catch (error) {
      return (
        repositoryErrorHandler.handleError(
          'searchCombined',
          error,
          this.config,
          options
        ) || []
      );
    }
  }
}
