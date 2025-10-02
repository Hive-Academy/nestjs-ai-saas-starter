import { Injectable, Logger } from '@nestjs/common';
import {
  ChromaClientError,
  Collection,
  CollectionMetadata,
  EmbeddingFunction,
} from 'chromadb';
import { ChromaDBConnectionService } from './chromadb-connection.service';
import { ChromaCollectionInfo } from '../../interfaces/chromadb-service.interface';
import {
  ChromaDBCollectionNotFoundError,
} from '../../errors/chromadb.errors';

/**
 * ChromaDB Collection Management Service
 *
 * Handles all collection lifecycle operations and metadata management
 * Following Single Responsibility Principle - only manages collections
 */
@Injectable()
export class ChromaDBCollectionService {
  private readonly logger = new Logger(ChromaDBCollectionService.name);

  constructor(private readonly connectionService: ChromaDBConnectionService) {}

  /**
   * List all collections
   */
  async listCollections(): Promise<ChromaCollectionInfo[]> {
    return this.connectionService.executeWithRetry(async () => {
      const client = this.connectionService.getClient();
      const collections = await client.listCollections();

      return collections.map((collection) => ({
        name: collection.name,
        id: collection.id || collection.name,
        metadata: collection.metadata,
      }));
    });
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
    return this.connectionService.executeWithRetry(async () => {
      const client = this.connectionService.getClient();

      if (getOrCreate) {
        return await client.getOrCreateCollection({
          name,
          metadata,
          embeddingFunction: embeddingFunction as EmbeddingFunction,
        });
      } else {
        return await client.createCollection({
          name,
          metadata,
          embeddingFunction: embeddingFunction as EmbeddingFunction,
        });
      }
    });
  }

  /**
   * Get an existing collection
   */
  async getCollection(
    name: string,
    embeddingFunction?: unknown
  ): Promise<Collection> {
    return this.connectionService.executeWithRetry(async () => {
      const client = this.connectionService.getClient();

      try {
        return await client.getCollection({
          name,
          embeddingFunction: embeddingFunction as EmbeddingFunction,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ChromaDBCollectionNotFoundError(
            `Collection '${name}' not found`
          );
        }
        throw error;
      }
    });
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    return this.connectionService.executeWithRetry(async () => {
      const client = this.connectionService.getClient();

      try {
        await client.deleteCollection({ name });
        this.logger.log(`Collection '${name}' deleted successfully`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ChromaDBCollectionNotFoundError(
            `Collection '${name}' not found`
          );
        }
        throw error;
      }
    });
  }

  /**
   * Check if collection exists
   */
  async collectionExists(name: string): Promise<boolean> {
    try {
      await this.getCollection(name);
      return true;
    } catch (error) {
      if (error instanceof ChromaDBCollectionNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get collection metadata
   */
  async getCollectionMetadata(
    name: string
  ): Promise<Record<string, any> | null> {
    return this.connectionService.executeWithRetry(async () => {
      try {
        const collection = await this.getCollection(name);
        return collection.metadata || null;
      } catch (error) {
        if (error instanceof ChromaDBCollectionNotFoundError) {
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Update collection metadata
   */
  async updateCollectionMetadata(
    name: string,
    metadata: Record<string, any>
  ): Promise<void> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.getCollection(name);

      try {
        await collection.modify({ metadata });
        this.logger.log(`Updated metadata for collection '${name}'`);
      } catch (error) {
        throw new ChromaClientError(
          `Failed to update metadata for collection '${name}': ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }

  /**
   * Count documents in collection
   */
  async countDocuments(collectionName: string): Promise<number> {
    return this.connectionService.executeWithRetry(async () => {
      const collection = await this.getCollection(collectionName);

      try {
        const count = await collection.count();
        this.logger.debug(
          `Collection '${collectionName}' contains ${count} documents`
        );
        return count;
      } catch (error) {
        throw new ChromaClientError(
          `Failed to count documents in collection '${collectionName}': ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }

  /**
   * Reset the entire ChromaDB instance
   */
  async reset(): Promise<boolean> {
    return this.connectionService.executeWithRetry(async () => {
      const client = this.connectionService.getClient();

      try {
        await client.reset();
        this.logger.warn('ChromaDB instance has been reset - all data deleted');
        return true;
      } catch (error) {
        throw new ChromaClientError(
          `Failed to reset ChromaDB: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }
}
