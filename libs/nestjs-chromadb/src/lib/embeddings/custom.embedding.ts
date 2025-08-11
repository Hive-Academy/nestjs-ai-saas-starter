import { Injectable } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { CustomEmbeddingConfig  } from '../interfaces/chromadb-module-options.interface';

/**
 * Custom embedding provider
 */
@Injectable()
export class CustomEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'custom';
  readonly dimension: number;
  readonly batchSize: number;

  private readonly embedFunction: (texts: string[]) => Promise<number[][]>;

  constructor(config: CustomEmbeddingConfig) {
    super();
    this.embedFunction = config.embed;
    this.dimension = config.dimension;
    this.batchSize = config.batchSize || 100;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const embeddings = await this.embedFunction(texts);
    this.validateDimensions(embeddings, texts.length);
    return embeddings;
  }
}