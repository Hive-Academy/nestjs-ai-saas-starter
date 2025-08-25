import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { CohereEmbeddingConfig } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';

/**
 * Constants for Cohere embedding provider
 */
const COHERE_EMBEDDING_DIMENSION = 1024 as const; // embed-english-v2.0 dimension
const DEFAULT_BATCH_SIZE = 96 as const; // Cohere API limit

/**
 * Cohere API response interface
 */
interface CohereEmbeddingResponse {
  embeddings: number[][];
  id: string;
  texts: string[];
  meta?: {
    api_version?: {
      version: string;
    };
  };
}

/**
 * Cohere API error response interface
 */
interface CohereErrorResponse {
  message?: string;
  code?: string;
}

/**
 * Cohere embedding provider
 */
@Injectable()
export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
  public readonly name = 'cohere';
  public readonly dimension = COHERE_EMBEDDING_DIMENSION;
  public readonly batchSize: number;

  private readonly logger = new Logger(CohereEmbeddingProvider.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: CohereEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'embed-english-v2.0';
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  public async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.processBatches(texts, async (batch) => this.embedBatch(batch));
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.callCohereAPI(texts);
      const { embeddings } = response;

      this.validateDimensions(embeddings, texts.length);
      return embeddings;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(`Cohere embedding failed: ${errorMessage}`, errorStack);
      throw new Error(`Cohere embedding failed: ${errorMessage}`);
    }
  }

  private async callCohereAPI(texts: string[]): Promise<CohereEmbeddingResponse> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        texts,
        model: this.model,
        truncate: 'END',
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json() as CohereErrorResponse;
        errorMessage = errorData.message ?? errorMessage;
      } catch {
        // Failed to parse error response
      }
      throw new Error(`Cohere API error: ${errorMessage}`);
    }

    const data = await response.json() as CohereEmbeddingResponse;
    return data;
  }
}
