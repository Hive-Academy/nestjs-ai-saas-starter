import { Injectable, Logger } from '@nestjs/common';
import {
  WhereDocument,
  Where,
  GetResult,
  Metadata,
  ChromaClientError,
} from 'chromadb';

// Define Include type locally since it's not exported from chromadb
type Include = ('metadatas' | 'documents' | 'distances' | 'embeddings')[];
import { ChromaDBConnectionService } from './chromadb-connection.service';
import { ChromaDBCollectionService } from './chromadb-collection.service';
import type {
  ChromaWireDocument,
  ChromaSearchResult,
  ChromaSearchOptions,
  ChromaBulkOptions,
  GetDocumentsOptions,
} from '../../types/core.interface';

/**
 * ChromaDB Document Operations Service
 *
 * Handles all document CRUD operations and query operations
 * Following Single Responsibility Principle - only manages document operations
 */
@Injectable()
export class ChromaDBDocumentService {
  private readonly logger = new Logger(ChromaDBDocumentService.name);

  constructor(
    private readonly connectionService: ChromaDBConnectionService,
    private readonly collectionService: ChromaDBCollectionService
  ) {}

  /**
   * Add documents to collection
   */
  async addDocuments(
    collectionName: string,
    documents: ChromaWireDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );
      const batchSize = options?.batchSize || 100;

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const ids = batch.map((doc) => doc.id);
        const docs = batch
          .map((doc) => doc.document)
          .filter(Boolean) as string[];
        const metadatas = batch
          .map((doc) => doc.metadata)
          .filter(Boolean) as Metadata[];
        const embeddings = batch
          .map((doc) => doc.embedding)
          .filter(Boolean) as number[][];

        try {
          await collection.add({
            ids,
            documents: docs.length > 0 ? docs : undefined,
            metadatas: metadatas.length > 0 ? metadatas : undefined,
            embeddings: embeddings.length > 0 ? embeddings : undefined,
          });

          this.logger.debug(
            `Added batch ${Math.floor(i / batchSize) + 1} with ${
              batch.length
            } documents`
          );
        } catch (error) {
          throw new ChromaClientError(
            `Failed to add documents batch ${Math.floor(i / batchSize) + 1}: ${
              error instanceof Error ? error.message : error
            }`
          );
        }
      }

      this.logger.log(
        `Successfully added ${documents.length} documents to collection '${collectionName}'`
      );
    });
  }

  /**
   * Update documents in collection
   */
  async updateDocuments(
    collectionName: string,
    documents: ChromaWireDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );
      const batchSize = options?.batchSize || 100;

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const ids = batch.map((doc) => doc.id);
        const docs = batch
          .map((doc) => doc.document)
          .filter(Boolean) as string[];
        const metadatas = batch
          .map((doc) => doc.metadata)
          .filter(Boolean) as Metadata[];
        const embeddings = batch
          .map((doc) => doc.embedding)
          .filter(Boolean) as number[][];

        try {
          await collection.update({
            ids,
            documents: docs.length > 0 ? docs : undefined,
            metadatas: metadatas.length > 0 ? metadatas : undefined,
            embeddings: embeddings.length > 0 ? embeddings : undefined,
          });

          this.logger.debug(
            `Updated batch ${Math.floor(i / batchSize) + 1} with ${
              batch.length
            } documents`
          );
        } catch (error) {
          throw new ChromaClientError(
            `Failed to update documents batch ${
              Math.floor(i / batchSize) + 1
            }: ${error instanceof Error ? error.message : error}`
          );
        }
      }

      this.logger.log(
        `Successfully updated ${documents.length} documents in collection '${collectionName}'`
      );
    });
  }

  /**
   * Upsert documents in collection
   */
  async upsertDocuments(
    collectionName: string,
    documents: ChromaWireDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );
      const batchSize = options?.batchSize || 100;

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const ids = batch.map((doc) => doc.id);
        const docs = batch
          .map((doc) => doc.document)
          .filter(Boolean) as string[];
        const metadatas = batch
          .map((doc) => doc.metadata)
          .filter(Boolean) as Metadata[];
        const embeddings = batch
          .map((doc) => doc.embedding)
          .filter(Boolean) as number[][];

        try {
          await collection.upsert({
            ids,
            documents: docs.length > 0 ? docs : undefined,
            metadatas: metadatas.length > 0 ? metadatas : undefined,
            embeddings: embeddings.length > 0 ? embeddings : undefined,
          });

          this.logger.debug(
            `Upserted batch ${Math.floor(i / batchSize) + 1} with ${
              batch.length
            } documents`
          );
        } catch (error) {
          throw new ChromaClientError(
            `Failed to upsert documents batch ${
              Math.floor(i / batchSize) + 1
            }: ${error instanceof Error ? error.message : error}`
          );
        }
      }

      this.logger.log(
        `Successfully upserted ${documents.length} documents in collection '${collectionName}'`
      );
    });
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
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );

      try {
        await collection.delete({
          ids,
          where,
          whereDocument,
        });

        const deleteCount = ids ? ids.length : 'filtered';
        this.logger.log(
          `Successfully deleted ${deleteCount} documents from collection '${collectionName}'`
        );
      } catch (error) {
        throw new ChromaClientError(
          `Failed to delete documents from collection '${collectionName}': ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }

  /**
   * Get documents from collection
   */
  async getDocuments(
    collectionName: string,
    options: GetDocumentsOptions = {}
  ): Promise<GetResult> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );

      try {
        const result = await collection.get({
          ids: options.ids,
          where: options.where,
          whereDocument: options.whereDocument as WhereDocument,
          limit: options.limit,
          offset: options.offset,
          include: options.include as Include,
        });

        this.logger.debug(
          `Retrieved ${result.ids.length} documents from collection '${collectionName}'`
        );
        return result;
      } catch (error) {
        throw new ChromaClientError(
          `Failed to get documents from collection '${collectionName}': ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }

  /**
   * Peek documents from collection
   */
  async peekDocuments(collectionName: string, limit = 10): Promise<GetResult> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );

      try {
        const result = await collection.peek({ limit });
        this.logger.debug(
          `Peeked ${result.ids.length} documents from collection '${collectionName}'`
        );
        return result;
      } catch (error) {
        throw new ChromaClientError(
          `Failed to peek documents from collection '${collectionName}': ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
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
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.collectionService.getCollection(
        collectionName
      );

      try {
        const result = await collection.query({
          queryTexts: queryTexts.length > 0 ? queryTexts : undefined,
          queryEmbeddings:
            queryEmbeddings && queryEmbeddings.length > 0
              ? queryEmbeddings
              : undefined,
          nResults: options.nResults || 10,
          where: options.where,
          whereDocument: options.whereDocument as WhereDocument,
          include: [
            'documents',
            'metadatas',
            ...(options.includeDistances ? ['distances'] : []),
          ] as Include,
        });

        const searchResult: ChromaSearchResult = {
          ids: result.ids,
          documents: result.documents,
          metadatas: result.metadatas,
          distances: result.distances,
          embeddings: result.embeddings || [[]],
          include: [
            'documents',
            'metadatas',
            ...(options.includeDistances ? ['distances'] : []),
          ],
          uris: result.uris || [[]],
        } as ChromaSearchResult;

        const resultCount = result.ids.reduce(
          (total, ids) => total + ids.length,
          0
        );
        this.logger.debug(
          `Search returned ${resultCount} results from collection '${collectionName}'`
        );

        return searchResult;
      } catch (error) {
        throw new ChromaClientError(
          `Failed to search documents in collection '${collectionName}': ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }
}
