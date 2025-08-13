import { Injectable, Logger } from '@nestjs/common';
import type { EmbeddingConfig } from '../interfaces/chromadb-module-options.interface';
import type { EmbeddingServiceInterface } from '../interfaces/embedding-service.interface';
import { EmbeddingProvider } from '../embeddings/base.embedding';
import { OpenAIEmbeddingProvider } from '../embeddings/openai.embedding';
import { HuggingFaceEmbeddingProvider } from '../embeddings/huggingface.embedding';
import { CohereEmbeddingProvider } from '../embeddings/cohere.embedding';
import { CustomEmbeddingProvider } from '../embeddings/custom.embedding';
import {
  ChromaDBEmbeddingNotConfiguredError,
  ChromaDBConfigurationError,
} from '../errors/chromadb.errors';
import { ChromaDBErrorHandler } from '../utils/error.utils';

/**
 * Embedding service that manages different embedding providers
 */
@Injectable()
export class EmbeddingService implements EmbeddingServiceInterface {
  private readonly logger = new Logger(EmbeddingService.name);
  private provider?: EmbeddingProvider;

  /**
   * Initialize embedding provider
   */
  public initialize(config?: EmbeddingConfig): void {
    if (!config) {
      this.logger.warn('No embedding provider configured');
      return;
    }

    try {
      this.provider = this.createProvider(config);
      this.logger.log(`Initialized ${config.provider} embedding provider`);
    } catch (error) {
      throw ChromaDBErrorHandler.handleConfigurationError(
        error,
        'embedding.provider',
        { provider: config.provider }
      );
    }
  }

  /**
   * Generate embeddings for texts
   */
  public async embed(texts: string[]): Promise<number[][]> {
    if (!this.provider) {
      throw new ChromaDBEmbeddingNotConfiguredError();
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      return await this.provider.embed(texts);
    } catch (error) {
      throw ChromaDBErrorHandler.handleEmbeddingError(
        error,
        this.provider.name,
        { textsCount: texts.length }
      );
    }
  }

  /**
   * Generate embedding for a single text
   */
  public async embedSingle(text: string): Promise<number[]> {
    if (!this.provider) {
      throw new ChromaDBEmbeddingNotConfiguredError();
    }

    try {
      return await this.provider.embedSingle(text);
    } catch (error) {
      throw ChromaDBErrorHandler.handleEmbeddingError(
        error,
        this.provider.name,
        { textLength: text.length }
      );
    }
  }

  /**
   * Get provider information
   */
  public getProviderInfo(): {
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
  public isConfigured(): boolean {
    return Boolean(this.provider);
  }

  /**
   * Get the embedding function for ChromaDB collections
   */
  public getEmbeddingFunction():
    | { generate: (texts: string[]) => Promise<number[][]> }
    | undefined {
    if (!this.provider) {
      return undefined;
    }

    // Return a function that ChromaDB can use
    return {
      generate: async (texts: string[]) => {
        if (!this.provider) {
          throw new ChromaDBEmbeddingNotConfiguredError();
        }
        try {
          return await this.provider.embed(texts);
        } catch (error) {
          throw ChromaDBErrorHandler.handleEmbeddingError(
            error,
            this.provider.name,
            { textsCount: texts.length }
          );
        }
      },
    };
  }

  /**
   * Get the dimension of embeddings produced
   */
  public getDimension(): number {
    if (!this.provider) {
      throw new ChromaDBEmbeddingNotConfiguredError();
    }
    return this.provider.dimension;
  }

  /**
   * Get the model name being used
   */
  public getModel(): string {
    if (!this.provider) {
      throw new ChromaDBEmbeddingNotConfiguredError();
    }
    return this.provider.name;
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
        const _exhaustive: never = config;
        throw new ChromaDBConfigurationError(
          `Unsupported embedding provider: ${JSON.stringify(_exhaustive)}`,
          'provider'
        );
      }
    }
  }
}
