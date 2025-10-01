import { Injectable, Logger } from '@nestjs/common';
import type { EmbeddingConfig } from '../interfaces/config/module-options.interface';
import type {
  EmbeddingServiceInterface,
  EmbeddingVector,
} from '../interfaces/embedding-service.interface';
import { EmbeddingProvider } from '../embeddings/base.embedding';
import { OpenAIEmbeddingProvider } from '../embeddings/openai.embedding';
import { HuggingFaceEmbeddingProvider } from '../embeddings/huggingface.embedding';
import { CohereEmbeddingProvider } from '../embeddings/cohere.embedding';
import { CustomEmbeddingProvider } from '../embeddings/custom.embedding';
import {
  ChromaDBEmbeddingNotConfiguredError,
  ChromaDBConfigurationError,
} from '../errors/chromadb.errors';
import {
  ChromaDBErrorHandler,
  getErrorMessage,
} from '../utils/errors/error.utils';

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
      const errorMessage =
        'Embedding provider configuration is required but not provided';
      this.logger.error(errorMessage);
      throw new ChromaDBEmbeddingNotConfiguredError(errorMessage);
    }

    try {
      this.provider = this.createProvider(config);
      this.logger.log(
        `Successfully initialized ${config.provider} embedding provider`
      );
    } catch (error) {
      const errorMessage = `Failed to initialize ${config.provider} embedding provider`;
      this.logger.error(errorMessage, { error: getErrorMessage(error) });
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
  public async embed(
    texts: readonly string[]
  ): Promise<readonly EmbeddingVector[]> {
    if (!this.provider) {
      throw new ChromaDBEmbeddingNotConfiguredError();
    }

    if (texts.length === 0) {
      this.logger.warn('Empty texts array provided to embedding service');
      return [];
    }

    // Validate texts
    const validTexts = texts.filter(
      (text) => text && typeof text === 'string' && text.trim().length > 0
    );
    if (validTexts.length === 0) {
      throw new ChromaDBEmbeddingNotConfiguredError(
        'No valid text content provided for embedding generation'
      );
    }

    if (validTexts.length !== texts.length) {
      this.logger.warn(
        `Filtered out ${
          texts.length - validTexts.length
        } invalid texts from embedding request`
      );
    }

    try {
      return await this.provider.embed(validTexts);
    } catch (error) {
      throw ChromaDBErrorHandler.handleEmbeddingError(
        error,
        this.provider.name,
        { textsCount: validTexts.length }
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
