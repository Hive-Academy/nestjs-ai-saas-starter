/**
 * Interface for ChromaDB embedding functions
 */
export interface EmbeddingFunction {
  /**
   * Generate embeddings for multiple texts
   */
  embed(texts: string[]): Promise<number[][]>;
  
  /**
   * Generate embedding for a single text
   */
  embedSingle?(text: string): Promise<number[]>;
  
  /**
   * The dimension of the embeddings
   */
  dimension?: number;
  
  /**
   * The name/identifier of the embedding function
   */
  name?: string;
}

/**
 * Type for embedding function parameters in method calls
 */
export type EmbeddingFunctionParameter = EmbeddingFunction | undefined;