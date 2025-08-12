import { Injectable, Logger } from '@nestjs/common';
import type { EmbeddingConfig } from '../interfaces/chromadb-module-options.interface';
import { EmbeddingProvider } from '../embeddings/base.embedding';
import { OpenAIEmbeddingProvider } from '../embeddings/openai.embedding';
import { HuggingFaceEmbeddingProvider } from '../embeddings/huggingface.embedding';
import { CohereEmbeddingProvider } from '../embeddings/cohere.embedding';
import { CustomEmbeddingProvider } from '../embeddings/custom.embedding';

/**
 * Embedding service that manages different embedding providers
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private provider?: EmbeddingProvider;

  /**
   * Initialize embedding provider
   */
  initialize(config?: EmbeddingConfig): void {
    if (!config) {
      this.logger.warn('No embedding provider configured');
      return;
    }

    this.provider = this.createProvider(config);
    this.logger.log(`Initialized ${config.provider} embedding provider`);
  }

  /**
   * Create embedding provider based on configuration
   */
  private createProvider(config: EmbeddingConfig): EmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config.config);
      case 'huggingface':
        return new HuggingFaceEmbeddingProvider(config.config);
      case 'cohere':
        return new CohereEmbeddingProvider(config.config);
      case 'custom':
        return new CustomEmbeddingProvider(config.config);
      default: {
        // Using exhaustive check to keep type safety if union expands
        const _exhaustive: never = config as never;
        throw new Error(
          `Unsupported embedding provider: ${JSON.stringify(_exhaustive)}`
        );
      }
    }
  }

  /**
   * Generate embeddings for texts
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.provider) {
      throw new Error('No embedding provider configured');
    }

    if (texts.length === 0) {
      return [];
    }

    return this.provider.embed(texts);
  }

  /**
   * Generate embedding for a single text
   */
  async embedSingle(text: string): Promise<number[]> {
    if (!this.provider) {
      throw new Error('No embedding provider configured');
    }

    return this.provider.embedSingle(text);
  }

  /**
   * Get provider information
   */
  getProviderInfo(): {
    name: string;
    dimension: number;
    batchSize: number;
  } | null {
    if (!this.provider) {
      return null;
    }

    return {
      name: this.provider.name,
      dimension: this.provider.dimension,
      batchSize: this.provider.batchSize,
    };
  }

  /**
   * Check if embedding provider is configured
   */
  isConfigured(): boolean {
    return !!this.provider;
  }

  /**
   * Get the embedding function for ChromaDB collections
   */
  getEmbeddingFunction():
    | { generate: (texts: string[]) => Promise<number[][]> }
    | undefined {
    if (!this.provider) {
      return undefined;
    }

    // Return a function that ChromaDB can use
    return {
      generate: async (texts: string[]) => {
        if (!this.provider) {
          throw new Error('No embedding provider configured');
        }
        return this.provider.embed(texts);
      },
    };
  }
}
