import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ChromaClient,
  Collection,
  CollectionMetadata,
  EmbeddingFunction,
} from 'chromadb';
import { CHROMADB_CLIENT } from '../constants';
import type { CollectionConfig  } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage } from '../utils/error.utils';
import { EmbeddingService } from './embedding.service';
import {
  ChromaDBCollectionNotFoundError,
} from '../errors/chromadb.errors';
import { safeAsyncOperation } from '../utils/error.utils';
import { validateCollectionName } from '../validation/type-guards';

/**
 * Collection management service
 */
@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);
  private readonly collections = new Map<string, Collection>();

  constructor(
    @Inject(CHROMADB_CLIENT)
    private readonly client: ChromaClient,
    @Inject(EmbeddingService)
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Create a new collection
   */
  public async createCollection(
    name: string,
    options?: {
      metadata?: CollectionMetadata;
      getOrCreate?: boolean;
      embeddingFunction?: EmbeddingFunction | null;
    },
  ): Promise<Collection> {
    validateCollectionName(name, 'createCollection');

    return safeAsyncOperation(
      async () => {
        const embeddingFunction =
          options?.embeddingFunction ??
          (this.embeddingService.getEmbeddingFunction() as
            | EmbeddingFunction
            | undefined);

        let collection: Collection;

        if (options?.getOrCreate) {
          // Use getOrCreateCollection for getOrCreate behavior
          collection = await this.client.getOrCreateCollection({
            name,
            metadata: options.metadata,
            embeddingFunction,
          });
        } else {
          // Use createCollection for strict creation
          collection = await this.client.createCollection({
            name,
            metadata: options?.metadata,
            embeddingFunction,
          });
        }

        this.collections.set(name, collection);
        this.logger.log(`Created collection: ${name}`);
        return collection;
      },
      `Failed to create collection '${name}'`,
      { collectionName: name, getOrCreate: options?.getOrCreate }
    );
  }

  /**
   * Get an existing collection
   */
  public async getCollection(
    name: string,
    embeddingFunction?: EmbeddingFunction,
  ): Promise<Collection> {
    // Check cache first
    const cached = this.collections.get(name);
    if (cached) {return cached;}

    try {
      const collection = await this.client.getCollection({
        name,
        embeddingFunction:
          embeddingFunction ??
          (this.embeddingService.getEmbeddingFunction() as
            | EmbeddingFunction
            | undefined),
      });

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      this.logger.error(
        `Failed to get collection ${name}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get or create a collection
   */
  public async getOrCreateCollection(
    name: string,
    options?: {
  metadata?: CollectionMetadata;
  embeddingFunction?: EmbeddingFunction | undefined;
    },
  ): Promise<Collection> {
    try {
      const embeddingFunction: EmbeddingFunction | null =
        (options?.embeddingFunction as EmbeddingFunction | null | undefined) ??
        (this.embeddingService.getEmbeddingFunction() as EmbeddingFunction | undefined) ??
        null;

      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: options?.metadata,
        embeddingFunction,
      });

      this.collections.set(name, collection);
      this.logger.log(`Ready collection: ${name}`);
      return collection;
    } catch (error) {
      this.logger.error(
        `Failed to getOrCreate collection ${name}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * List all collections
   */
  public async listCollections(): Promise<
    Array<{
      name: string;
      id: string;
  metadata?: CollectionMetadata;
    }>
  > {
    try {
      const collections = await this.client.listCollections();
      return collections.map((collection) => ({
        name: collection.name,
        id: collection.id,
        metadata: collection.metadata,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list collections: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  public async deleteCollection(name: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name });
      this.collections.delete(name);
      this.logger.log(`Deleted collection: ${name}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete collection ${name}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Check if a collection exists
   */
  public async collectionExists(name: string): Promise<boolean> {
    validateCollectionName(name, 'collectionExists');

    try {
      await this.getCollection(name);
      return true;
    } catch (error) {
      // Only return false for collection not found errors
      if (error instanceof ChromaDBCollectionNotFoundError) {
        return false;
      }
      // Re-throw other errors (connection issues, etc.)
      throw error;
    }
  }

  /**
   * Get collection count (number of documents)
   */
  public async getCollectionCount(name: string): Promise<number> {
    try {
      const collection = await this.getCollection(name);
      return collection.count();
    } catch (error) {
      this.logger.error(
        `Failed to count documents in ${name}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Reset collection (delete and recreate)
   */
  public async resetCollection(
    name: string,
  metadata?: CollectionMetadata,
  ): Promise<Collection> {
    try {
      await this.deleteCollection(name);
      return this.createCollection(name, { metadata, getOrCreate: true });
    } catch (error) {
      this.logger.error(
        `Failed to reset collection ${name}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Modify collection metadata
   */
  public async modifyCollection(
    name: string,
  metadata: CollectionMetadata,
  ): Promise<void> {
    try {
      const collection = await this.getCollection(name);
      await collection.modify({ metadata });
      this.logger.log(`Modified collection metadata: ${name}`);
    } catch (error) {
      this.logger.error(
        `Failed to modify collection ${name}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Register collections from configuration
   */
  public async registerCollections(configs: CollectionConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        await this.getOrCreateCollection(config.name, {
          metadata: config.metadata,
          embeddingFunction: config.embeddingFunction,
        });
        this.logger.log(`Registered collection: ${config.name}`);
      } catch (error) {
        this.logger.error(
          `Failed to register collection ${config.name}: ${getErrorMessage(error)}`,
        );
      }
    }
  }

  /**
   * Clear cache for a collection
   */
  public clearCache(name?: string): void {
    if (name) {
      this.collections.delete(name);
    } else {
      this.collections.clear();
    }
  }
}
