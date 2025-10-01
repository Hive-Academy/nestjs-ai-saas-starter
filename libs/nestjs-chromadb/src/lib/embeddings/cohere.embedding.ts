import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { CohereEmbeddingConfig } from '../interfaces/config/module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/errors/error.utils';
import { HttpClient, InputValidator } from '../utils/http/http-client.utils';

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
  private readonly apiEndpoint: string;
  private readonly httpClient: HttpClient;
  private readonly validator: InputValidator;

  constructor(config: CohereEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'embed-english-v3.0';
    this.apiEndpoint = config.apiEndpoint ?? 'https://api.cohere.ai/v1/embed';
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.httpClient = new HttpClient(config.http);
    this.validator = new InputValidator();

    // Validate API key if validation is enabled
    if (config.validation?.validateApiKey) {
      const validation = this.validator.validateApiKey(this.apiKey, 'cohere');
      if (!validation.isValid) {
        this.logger.warn(
          `API key validation failed: ${validation.errors.join(', ')}`
        );
      }
    }
  }

  public async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      this.logger.warn(
        'Empty texts array provided to Cohere embedding provider'
      );
      return [];
    }

    // Comprehensive input validation
    const validation = this.validator.validateTexts(texts, {
      maxTextLength: 512 * 1000, // Cohere's character limit
      maxBatchSize: this.batchSize,
      allowEmpty: false,
    });

    if (!validation.isValid) {
      throw new Error(
        `Input validation failed: ${validation.errors.join(', ')}`
      );
    }

    // Filter valid texts
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

    return this.processBatches(validTexts, async (batch) =>
      this.embedBatch(batch)
    );
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

  private async callCohereAPI(
    texts: string[]
  ): Promise<CohereEmbeddingResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    const body = {
      texts,
      model: this.model,
      truncate: 'END',
    };

    try {
      const data = await this.httpClient.postJson<CohereEmbeddingResponse>(
        this.apiEndpoint,
        body,
        headers,
        'Cohere Embeddings'
      );
      return data;
    } catch (error) {
      // Try to extract Cohere-specific error message
      const errorMessage = getErrorMessage(error);
      throw new Error(`Cohere API error: ${errorMessage}`);
    }
  }
}
