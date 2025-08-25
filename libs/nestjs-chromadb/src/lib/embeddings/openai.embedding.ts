import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { OpenAIEmbeddingConfig } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';

/**
 * Constants for OpenAI embedding provider
 */
const OPENAI_EMBEDDING_DIMENSION = 1536 as const; // text-embedding-ada-002 dimension
const DEFAULT_BATCH_SIZE = 100 as const;

/**
 * OpenAI API response interfaces
 */
interface OpenAIEmbeddingData {
  object: 'embedding';
  embedding: number[];
  index: number;
}

interface OpenAIEmbeddingResponse {
  object: 'list';
  data: OpenAIEmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API error response interface
 */
interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * OpenAI embedding provider
 */
@Injectable()
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  public readonly name = 'openai';
  public readonly dimension = OPENAI_EMBEDDING_DIMENSION;
  public readonly batchSize: number;

  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly organization?: string;

  constructor(config: OpenAIEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'text-embedding-ada-002';
    this.organization = config.organization;
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
      const response = await this.callOpenAIAPI(texts);
      const embeddings = response.data.map((item: OpenAIEmbeddingData) => item.embedding);

      this.validateDimensions(embeddings, texts.length);
      return embeddings;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(`OpenAI embedding failed: ${errorMessage}`, errorStack);
      throw new Error(`OpenAI embedding failed: ${errorMessage}`);
    }
  }

  private async callOpenAIAPI(texts: string[]): Promise<OpenAIEmbeddingResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json() as OpenAIErrorResponse;
        errorMessage = errorData.error?.message ?? errorMessage;
      } catch {
        // Failed to parse error response
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json() as OpenAIEmbeddingResponse;
    return data;
  }
}
