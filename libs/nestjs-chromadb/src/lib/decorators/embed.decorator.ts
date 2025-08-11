import { SetMetadata } from '@nestjs/common';

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
 */
export class EmbeddingHelper {
  /**
   * Add embeddings to documents that need them
   */
  static async embedDocuments(
    embeddingService: any,
    documents: Array<{ document?: string; embedding?: number[] }>,
    options: { field?: string; target?: string } = {}
  ): Promise<Array<{ document?: string; embedding?: number[] }>> {
    const { field = 'document', target = 'embedding' } = options;
    
    if (!embeddingService?.isConfigured()) {
      return documents;
    }

    const documentsNeedingEmbeddings = documents.filter(doc => 
      !doc[target as keyof typeof doc] && doc[field as keyof typeof doc]
    );
    
    if (documentsNeedingEmbeddings.length === 0) {
      return documents;
    }

    const textsToEmbed = documentsNeedingEmbeddings.map(doc => 
      doc[field as keyof typeof doc] as string
    );
    
    try {
      const embeddings = await embeddingService.embed(textsToEmbed);
      
      let embeddingIndex = 0;
      return documents.map(doc => {
        if (!doc[target as keyof typeof doc] && doc[field as keyof typeof doc]) {
          return { ...doc, [target]: embeddings[embeddingIndex++] };
        }
        return doc;
      });
    } catch (error) {
      console.warn(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
      return documents;
    }
  }

  /**
   * Add embedding to a single object
   */
  static async embedObject<T extends Record<string, any>>(
    embeddingService: any,
    obj: T,
    options: { field?: string; target?: string } = {}
  ): Promise<T> {
    const { field = 'document', target = 'embedding' } = options;
    
    if (!embeddingService?.isConfigured() || !obj[field] || obj[target]) {
      return obj;
    }

    try {
      const embedding = await embeddingService.embedSingle(obj[field]);
      return { ...obj, [target]: embedding };
    } catch (error) {
      console.warn(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
      return obj;
    }
  }
}

/**
 * Interface for services that support embedding
 */
export interface EmbeddingSupport {
  embedSingle(text: string): Promise<number[]>;
  embed(texts: string[]): Promise<number[][]>;
  isConfigured(): boolean;
}

/**
 * Type-safe embedding utility functions
 */
export async function withEmbedding<T extends Record<string, any>>(
  embeddingService: EmbeddingSupport,
  obj: T,
  textField: keyof T,
  embeddingField: keyof T = 'embedding' as keyof T
): Promise<T> {
  if (!obj[textField] || obj[embeddingField]) {
    return obj;
  }

  try {
    const embedding = await embeddingService.embedSingle(String(obj[textField]));
    return { ...obj, [embeddingField]: embedding };
  } catch (error) {
    console.warn(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    return obj;
  }
}

/**
 * Batch embedding utility
 */
export async function withBatchEmbeddings<T extends Record<string, any>>(
  embeddingService: EmbeddingSupport,
  objects: T[],
  textField: keyof T,
  embeddingField: keyof T = 'embedding' as keyof T
): Promise<T[]> {
  const objectsNeedingEmbeddings = objects.filter(obj => 
    obj[textField] && !obj[embeddingField]
  );
  
  if (objectsNeedingEmbeddings.length === 0) {
    return objects;
  }

  try {
    const texts = objectsNeedingEmbeddings.map(obj => String(obj[textField]));
    const embeddings = await embeddingService.embed(texts);
    
    let embeddingIndex = 0;
    return objects.map(obj => {
      if (obj[textField] && !obj[embeddingField]) {
        return { ...obj, [embeddingField]: embeddings[embeddingIndex++] };
      }
      return obj;
    });
  } catch (error) {
    console.warn(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`);
    return objects;
  }
}