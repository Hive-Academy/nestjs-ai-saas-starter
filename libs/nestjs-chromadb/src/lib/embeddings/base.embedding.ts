/**
 * Base embedding provider interface
 */
export interface EmbeddingProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Embedding dimension
   */
  readonly dimension: number;

  /**
   * Maximum batch size
   */
  readonly batchSize: number;

  /**
   * Generate embeddings for texts
   */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Generate embedding for a single text
   */
  embedSingle(text: string): Promise<number[]>;
}

/**
 * Abstract base class for embedding providers
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract readonly name: string;
  abstract readonly dimension: number;
  abstract readonly batchSize: number;

  abstract embed(texts: string[]): Promise<number[][]>;

  async embedSingle(text: string): Promise<number[]> {
    const embeddings = await this.embed([text]);
    return embeddings[0];
  }

  /**
   * Process texts in batches
   */
  protected async processBatches(
    texts: string[],
    processor: (batch: string[]) => Promise<number[][]>
  ): Promise<number[][]> {
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Validate embedding dimensions
   */
  protected validateDimensions(embeddings: number[][], expectedCount: number): void {
    if (embeddings.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} embeddings, got ${embeddings.length}`
      );
    }

    for (let i = 0; i < embeddings.length; i++) {
      if (embeddings[i].length !== this.dimension) {
        throw new Error(
          `Embedding ${i} has dimension ${embeddings[i].length}, expected ${this.dimension}`
        );
      }
    }
  }
}