import { Inject } from '@nestjs/common';

/**
 * Decorator to inject a specific ChromaDB collection
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @InjectCollection('documents') private readonly docs: Collection,
 *   ) {}
 * }
 * ```
 */
export const InjectCollection = (collectionName: string): ParameterDecorator =>
  Inject(`COLLECTION_${collectionName.toUpperCase()}`);

/**
 * Utility function to get collection from service
 * Use this instead of @WithCollection decorator for better type safety
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly collectionService: CollectionService,
 *   ) {}
 *
 *   async indexProduct(product: Product) {
 *     const collection = await this.withCollection('products');
 *     await collection.add({
 *       ids: [product.id],
 *       documents: [product.description],
 *       metadatas: [{ category: product.category }]
 *     });
 *   }
 *
 *   private async withCollection(name: string) {
 *     return this.collectionService.getCollection(name);
 *   }
 * }
 * ```
 */
export const CollectionHelper = {
  async withCollection<T>(
    collectionService: CollectionAccessor,
    collectionName: string,
    operation: (collection: unknown) => Promise<T>
  ): Promise<T> {
    const collection = await collectionService.getCollection(collectionName);
    return operation(collection);
  }
};

/**
 * Type-safe collection accessor mixin
 * Add this to your service class to get type-safe collection access
 */
export interface CollectionAccessor {
  getCollection: (name: string) => Promise<unknown>;
}

/**
 * Collection operation wrapper for better error handling
 */
export async function withCollection<T>(
  collectionService: CollectionAccessor,
  collectionName: string,
  operation: (collection: unknown) => Promise<T>
): Promise<T> {
  try {
    const collection = await collectionService.getCollection(collectionName);
    return await operation(collection);
  } catch (error) {
    throw new Error(`Collection operation failed for '${collectionName}': ${error instanceof Error ? error.message : String(error)}`);
  }
}
