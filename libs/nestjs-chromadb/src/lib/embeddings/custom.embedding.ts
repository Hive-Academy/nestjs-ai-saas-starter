import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { CustomEmbeddingConfig } from '../interfaces/config/module-options.interface';

/**
 * Constants for custom embedding provider
 */
const DEFAULT_BATCH_SIZE = 100 as const;

/**
 * Custom embedding provider
 */
@Injectable()
export class CustomEmbeddingProvider extends BaseEmbeddingProvider {
  public readonly name = 'custom';
  public readonly dimension: number;
  public readonly batchSize: number;

  private readonly logger = new Logger(CustomEmbeddingProvider.name);
  private readonly embedFunction: (texts: string[]) => Promise<number[][]>;

  constructor(config: CustomEmbeddingConfig) {
    super();
    this.embedFunction = config.embed;
    this.dimension = config.dimension;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  public async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      this.logger.warn(
        'Empty texts array provided to custom embedding provider'
      );
      return [];
    }

    // Validate texts
    const validTexts = texts.filter(
      (text) => text && typeof text === 'string' && text.trim().length > 0
    );
    if (validTexts.length === 0) {
      throw new Error(
        'No valid text content provided for embedding generation'
      );
    }

    if (validTexts.length !== texts.length) {
      this.logger.warn(
        `Filtered out ${
          texts.length - validTexts.length
        } invalid texts from batch`
      );
    }

    const embeddings = await this.embedFunction(validTexts);
    this.validateDimensions(embeddings, validTexts.length);
    return embeddings;
  }
}
