/**
 * @fileoverview Vector Query Builder - Fluent API for building vector queries
 */

import type { Where, WhereDocument } from 'chromadb';
import type { BaseDocument } from '../../types/core.interface';
import type { VectorQueryParams } from './vector-query-types';

/**
 * Fluent builder for constructing vector queries
 */
export class VectorQueryBuilder<TDocument extends BaseDocument = BaseDocument> {
  private params: Partial<VectorQueryParams> = {};

  /**
   * Set text queries for auto-embedding
   */
  queries(texts: string[]): this {
    this.params.queries = texts;
    return this;
  }

  /**
   * Set single text query for auto-embedding
   */
  query(text: string): this {
    this.params.queries = [text];
    return this;
  }

  /**
   * Set pre-computed embedding vectors
   */
  embeddings(vectors: number[][]): this {
    this.params.queries = vectors;
    return this;
  }

  /**
   * Set single pre-computed embedding vector
   */
  embedding(vector: number[]): this {
    this.params.queries = [vector];
    return this;
  }

  /**
   * Set result limit
   */
  limit(count: number): this {
    this.params.nResults = count;
    return this;
  }

  /**
   * Add metadata filter
   */
  where(filters: Where): this {
    this.params.where = filters;
    return this;
  }

  /**
   * Add field-specific metadata filter
   */
  whereField(field: keyof TDocument['metadata'], value: any): this {
    if (!this.params.where) {
      this.params.where = {} as Where;
    }
    (this.params.where as any)[field as string] = value;
    return this;
  }

  /**
   * Add metadata filter with $in operator
   */
  whereIn(field: keyof TDocument['metadata'], values: any[]): this {
    if (!this.params.where) {
      this.params.where = {} as Where;
    }
    (this.params.where as any)[field as string] = { $in: values };
    return this;
  }

  /**
   * Add metadata filter with $ne operator
   */
  whereNot(field: keyof TDocument['metadata'], value: any): this {
    if (!this.params.where) {
      this.params.where = {} as Where;
    }
    (this.params.where as any)[field as string] = { $ne: value };
    return this;
  }

  /**
   * Add document content filter
   */
  whereDocument(filters: WhereDocument): this {
    this.params.whereDocument = filters;
    return this;
  }

  /**
   * Add document content contains filter
   */
  containsText(text: string): this {
    this.params.whereDocument = { $contains: text };
    return this;
  }

  /**
   * Specify what to include in results
   */
  include(
    items: Array<'metadatas' | 'documents' | 'distances' | 'embeddings'>
  ): this {
    this.params.include = items;
    return this;
  }

  /**
   * Include metadata in results
   */
  includeMetadata(): this {
    if (!this.params.include) {
      this.params.include = [];
    }
    if (!this.params.include.includes('metadatas')) {
      this.params.include.push('metadatas');
    }
    return this;
  }

  /**
   * Include documents in results
   */
  includeDocuments(): this {
    if (!this.params.include) {
      this.params.include = [];
    }
    if (!this.params.include.includes('documents')) {
      this.params.include.push('documents');
    }
    return this;
  }

  /**
   * Include distances in results
   */
  includeDistances(): this {
    if (!this.params.include) {
      this.params.include = [];
    }
    if (!this.params.include.includes('distances')) {
      this.params.include.push('distances');
    }
    return this;
  }

  /**
   * Include embeddings in results
   */
  includeEmbeddings(): this {
    if (!this.params.include) {
      this.params.include = [];
    }
    if (!this.params.include.includes('embeddings')) {
      this.params.include.push('embeddings');
    }
    return this;
  }

  /**
   * Add custom options
   */
  options(opts: Record<string, any>): this {
    this.params.options = { ...this.params.options, ...opts };
    return this;
  }

  /**
   * Force cache bypass
   */
  bypassCache(): this {
    this.params.bypassCache = true;
    return this;
  }

  /**
   * Build the final query parameters
   */
  build(): VectorQueryParams {
    if (!this.params.queries) {
      throw new Error('Query text or embedding vector is required');
    }

    return {
      queries: this.params.queries,
      nResults: this.params.nResults,
      where: this.params.where,
      whereDocument: this.params.whereDocument,
      include: this.params.include,
      options: this.params.options,
      bypassCache: this.params.bypassCache,
    };
  }

  /**
   * Reset builder to initial state
   */
  reset(): this {
    this.params = {};
    return this;
  }
}

/**
 * Create a new vector query builder
 */
export function createVectorQueryBuilder<
  TDocument extends BaseDocument = BaseDocument
>(): VectorQueryBuilder<TDocument> {
  return new VectorQueryBuilder<TDocument>();
}
