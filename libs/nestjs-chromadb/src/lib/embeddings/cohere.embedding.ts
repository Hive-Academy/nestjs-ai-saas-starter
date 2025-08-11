import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import { CohereEmbeddingConfig } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';

/**
 * Cohere embedding provider
 */
@Injectable()
export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly logger = new Logger(CohereEmbeddingProvider.name);
  readonly name = 'cohere';
  readonly dimension = 1024; // embed-english-v2.0 dimension
  readonly batchSize: number;

  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: CohereEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'embed-english-v2.0';
    this.batchSize = config.batchSize || 96; // Cohere's max batch size
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.processBatches(texts, (batch) => this.embedBatch(batch));
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.callCohereAPI(texts);
      const embeddings = response.embeddings;
      
      this.validateDimensions(embeddings, texts.length);
      return embeddings;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(`Cohere embedding failed: ${errorMessage}`, errorStack);
      throw new Error(`Cohere embedding failed: ${errorMessage}`);
    }
  }

  private async callCohereAPI(texts: string[]): Promise<any> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        texts,
        model: this.model,
        truncate: 'END',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere API error: ${error.message || 'Unknown error'}`);
    }

    return response.json();
  }
}