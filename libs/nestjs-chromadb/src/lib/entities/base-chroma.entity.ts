/**
 * Base Entity Class for ChromaDB Entities
 *
 * Entities can extend this class to get proper TypeScript support for decorator-generated methods.
 * The @ChromaEntity decorator will override these placeholder methods at runtime.
 *
 * This pattern eliminates the need for `!` assertions and provides better developer experience.
 */

import type { BaseDocument } from '../types/core.interface';
import type { ChromaWireDocument } from '../types/core.interface';

/**
 * Abstract base entity class that entities can extend
 *
 * @example
 * ```typescript
 * interface ProductMetadata {
 *   name: string;
 *   price: number;
 *   category: string;
 * }
 *
 * @ChromaEntity({ collection: 'products', autoEmbed: true })
 * export class ProductEntity extends BaseChromaEntity<ProductMetadata> {
 *   @ChromaId()
 *   declare id: string;
 *
 *   @ChromaProp()
 *   declare content: string;
 *
 *   declare metadata: ProductMetadata;
 * }
 * ```
 */
export abstract class BaseChromaEntity<
  TMetadata extends Record<string, any> = Record<string, any>
> implements BaseDocument<TMetadata>
{
  // Properties are defined in subclasses with decorators
  // No need to declare them here - the interface provides the contract
  abstract readonly id: string;
  abstract readonly content: string;
  abstract readonly metadata: TMetadata;
  abstract readonly embedding?: readonly number[];

  /**
   * Converts entity to ChromaDB wire format
   * This method is implemented by the @ChromaEntity decorator at runtime
   *
   * @returns ChromaDB-compatible document with flexible metadata type
   */
  toChroma(): {
    id: string;
    document?: string;
    metadata?: Record<string, any>;
    embedding?: readonly number[];
  } {
    throw new Error(
      'toChroma() method must be implemented by @ChromaEntity decorator'
    );
  }

  /**
   * Gets the collection name for this entity
   * This method is implemented by the @ChromaEntity decorator at runtime
   *
   * @returns Collection name
   */
  getCollectionName(): string {
    throw new Error(
      'getCollectionName() method must be implemented by @ChromaEntity decorator'
    );
  }

  /**
   * Creates an entity instance from ChromaDB wire data
   * This static method is implemented by the @ChromaEntity decorator at runtime
   *
   * @param data - Raw ChromaDB document data
   * @returns Typed entity instance
   */
  static fromChroma<T extends BaseChromaEntity>(
    this: new () => T,
    data: ChromaWireDocument | Record<string, any>
  ): T {
    throw new Error(
      'fromChroma() method must be implemented by @ChromaEntity decorator'
    );
  }
}
