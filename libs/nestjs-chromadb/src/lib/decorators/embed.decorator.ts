import { SetMetadata } from '@nestjs/common';
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
    } catch (_error) {
      // Log error to proper logging service if available
      // For now, just return documents without embeddings
      return documents;
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
    } catch (_error) {
      // Log error to proper logging service if available
      // For now, just return object without embedding
      return obj;
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
  } catch (_error) {
    // Failed to generate embedding, returning original object
    return obj;
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

    let embeddingIndex = 0;
    return objects.map((obj) => {
      if (obj[textField] && !obj[embeddingField]) {
        const embedding = embeddings[embeddingIndex];
        embeddingIndex += 1;
        return { ...obj, [embeddingField]: embedding };
      }
      return obj;
    });
  } catch (_error) {
    // Log error to proper logging service if available
    // For now, just return objects without embeddings
    return objects;
  }
}
