import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { HuggingFaceEmbeddingConfig } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';

/**
 * Constants for HuggingFace embedding provider
 */
const HUGGINGFACE_EMBEDDING_DIMENSION = 384 as const; // all-MiniLM-L6-v2 dimension
const DEFAULT_BATCH_SIZE = 50 as const;

/**
 * HuggingFace API response types
 */
type HuggingFaceSingleResponse = number[];
type HuggingFaceBatchResponse = number[][];
type HuggingFaceResponse = HuggingFaceSingleResponse | HuggingFaceBatchResponse;

/**
 * HuggingFace embedding provider
 */
@Injectable()
export class HuggingFaceEmbeddingProvider extends BaseEmbeddingProvider {
  public readonly name = 'huggingface';
  public readonly dimension = HUGGINGFACE_EMBEDDING_DIMENSION;
  public readonly batchSize: number;

  private readonly logger = new Logger(HuggingFaceEmbeddingProvider.name);
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: HuggingFaceEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'sentence-transformers/all-MiniLM-L6-v2';
    this.endpoint =
      config.endpoint ??
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`;
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
      const response = await this.callHuggingFaceAPI(texts);

      // HuggingFace API returns different formats depending on batch size
      let embeddings: number[][];
      if (texts.length === 1) {
        // Single text returns array of numbers
        embeddings = [Array.isArray(response[0]) ? response[0] : response];
      } else {
        // Multiple texts return array of arrays
        embeddings = response;
      }

      this.validateDimensions(embeddings, texts.length);
      return embeddings;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(
        `HuggingFace embedding failed: ${errorMessage}`,
        errorStack
      );
      throw new Error(`HuggingFace embedding failed: ${errorMessage}`);
    }
  }

  private async callHuggingFaceAPI(texts: string[]): Promise<HuggingFaceResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: texts.length === 1 ? texts[0] : texts,
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        errorMessage = await response.text();
      } catch {
        // Failed to read error response
      }
      throw new Error(`HuggingFace API error: ${errorMessage}`);
    }

    const data = await response.json() as HuggingFaceResponse;
    return data;
  }
}
