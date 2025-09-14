import { SetMetadata, Logger } from '@nestjs/common';
import type {
  EmbeddingServiceInterface,
  EmbeddableDocument,
  EmbeddingOperationOptions,
} from '../interfaces/embedding-service.interface';
import {
  getChromaDBConfig,
  getChromaDBConfigWithDefaults,
} from '../utils/chromadb-config.accessor';

export const EMBED_METADATA_KEY = 'embed:metadata';

export interface EmbedOptions {
  /**
   * Field name to embed from the input parameter
   */
  field?: string;

  /**
   * Target field to store embedding in
   */
  target?: string;

  /**
   * Whether to include the embedding in the result
   */
  includeEmbedding?: boolean;
}

/**
 * Marker decorator for methods that should have embedding support
 * This is now just a metadata marker - actual embedding should be done explicitly
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly embeddingService: EmbeddingService,
 *   ) {}
 *
 *   @EmbedMarker({ field: 'description', target: 'embedding' })
 *   async indexProduct(product: Product) {
 *     // Manually add embedding if needed
 *     if (!product.embedding && product.description) {
 *       product.embedding = await this.embeddingService.embedSingle(product.description);
 *     }
 *
 *     return this.chromaService.addDocuments('products', [{
 *       id: product.id,
 *       document: product.description,
 *       embedding: product.embedding,
 *       metadata: { category: product.category }
 *     }]);
 *   }
 * }
 * ```
 */
export const EmbedMarker = (options: EmbedOptions = {}): MethodDecorator => {
  return SetMetadata(EMBED_METADATA_KEY, options);
};

/**
 * Utility class for embedding operations
 * Use this instead of decorator magic for better type safety
 * Automatically inherits configuration from module setup
 */
export const EmbeddingHelper = {
  _logger: new Logger('EmbeddingHelper'),
  /**
   * Add embeddings to documents that need them
   */
  async embedDocuments(
    embeddingService: EmbeddingServiceInterface,
    documents: EmbeddableDocument[],
    options: EmbeddingOperationOptions = {}
  ): Promise<EmbeddableDocument[]> {
    const { field = 'document', target = 'embedding' } = options;

    if (!embeddingService.isConfigured()) {
      return documents;
    }

    const documentsNeedingEmbeddings = documents.filter(
      (doc) =>
        !doc[target as keyof typeof doc] && doc[field as keyof typeof doc]
    );

    if (documentsNeedingEmbeddings.length === 0) {
      return documents;
    }

    const textsToEmbed = documentsNeedingEmbeddings.map(
      (doc) => doc[field as keyof typeof doc] as string
    );

    try {
      const embeddings = await embeddingService.embed(textsToEmbed);
      if (
        !Array.isArray(embeddings) ||
        embeddings.length !== textsToEmbed.length
      ) {
        throw new Error(
          `Embedding service returned mismatched embeddings count. Expected ${textsToEmbed.length}, received ${embeddings?.length}`
        );
      }

      let embeddingIndex = 0;
      return documents.map((doc) => {
        if (
          !doc[target as keyof typeof doc] &&
          doc[field as keyof typeof doc]
        ) {
          const embedding = embeddings[embeddingIndex];
          embeddingIndex += 1;
          return { ...doc, [target]: embedding };
        }
        return doc;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      EmbeddingHelper._logger.error(`Failed to embed documents: ${message}`);
      throw new Error(`Failed to embed documents: ${message}`);
    }
  },

  /**
   * Add embedding to a single object
   */
  async embedObject<T extends Record<string, unknown>>(
    embeddingService: EmbeddingServiceInterface,
    obj: T,
    options: EmbeddingOperationOptions = {}
  ): Promise<T> {
    const { field = 'document', target = 'embedding' } = options;

    if (!embeddingService.isConfigured() || !obj[field] || obj[target]) {
      return obj;
    }

    try {
      const embedding = await embeddingService.embedSingle(String(obj[field]));
      return { ...obj, [target]: embedding };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      EmbeddingHelper._logger.error(`Failed to embed object: ${message}`);
      throw new Error(`Failed to embed object: ${message}`);
    }
  },
};

// Use IEmbeddingService from interfaces/embedding-service.interface.ts instead

/**
 * Type-safe embedding utility functions
 */
export async function withEmbedding<T extends Record<string, unknown>>(
  embeddingService: EmbeddingServiceInterface,
  obj: T,
  textField: keyof T,
  embeddingField: keyof T = 'embedding' as keyof T
): Promise<T> {
  if (!obj[textField] || obj[embeddingField]) {
    return obj;
  }

  try {
    const embedding = await embeddingService.embedSingle(
      String(obj[textField])
    );
    return { ...obj, [embeddingField]: embedding };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    new Logger('EmbeddingHelper').error(
      `Failed to embed object (withEmbedding): ${message}`
    );
    throw new Error(`Failed to embed object: ${message}`);
  }
}

/**
 * Batch embedding utility
 */
export async function withBatchEmbeddings<T extends Record<string, unknown>>(
  embeddingService: EmbeddingServiceInterface,
  objects: T[],
  textField: keyof T,
  embeddingField: keyof T = 'embedding' as keyof T
): Promise<T[]> {
  const objectsNeedingEmbeddings = objects.filter(
    (obj) => obj[textField] && !obj[embeddingField]
  );

  if (objectsNeedingEmbeddings.length === 0) {
    return objects;
  }

  try {
    const texts = objectsNeedingEmbeddings.map((obj) => String(obj[textField]));
    const embeddings = await embeddingService.embed(texts);
    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
      throw new Error(
        `Embedding service returned mismatched embeddings count. Expected ${texts.length}, received ${embeddings?.length}`
      );
    }

    let embeddingIndex = 0;
    return objects.map((obj) => {
      if (obj[textField] && !obj[embeddingField]) {
        const embedding = embeddings[embeddingIndex];
        embeddingIndex += 1;
        return { ...obj, [embeddingField]: embedding };
      }
      return obj;
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    new Logger('EmbeddingHelper').error(
      `Failed to batch embed objects: ${message}`
    );
    throw new Error(`Failed to batch embed: ${message}`);
  }
}
