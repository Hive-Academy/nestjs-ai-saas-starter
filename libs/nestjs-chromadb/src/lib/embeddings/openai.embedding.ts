import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { OpenAIEmbeddingConfig } from '../interfaces/config/module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';
import { HttpClient, InputValidator } from '../utils/http-client.utils';

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
  private readonly apiEndpoint: string;
  private readonly organization?: string;
  private readonly httpClient: HttpClient;
  private readonly validator: InputValidator;

  constructor(config: OpenAIEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'text-embedding-3-small';
    this.apiEndpoint =
      config.apiEndpoint ?? 'https://api.openai.com/v1/embeddings';
    this.organization = config.organization;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.httpClient = new HttpClient(config.http);
    this.validator = new InputValidator();

    // Validate API key if validation is enabled
    if (config.validation?.validateApiKey) {
      const validation = this.validator.validateApiKey(this.apiKey, 'openai');
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
        'Empty texts array provided to OpenAI embedding provider'
      );
      return [];
    }

    // Comprehensive input validation
    const validation = this.validator.validateTexts(texts, {
      maxTextLength: 8191, // OpenAI's token limit approximation
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
      const response = await this.callOpenAIAPI(texts);
      const embeddings = response.data.map(
        (item: OpenAIEmbeddingData) => item.embedding
      );

      this.validateDimensions(embeddings, texts.length);
      return embeddings;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(`OpenAI embedding failed: ${errorMessage}`, errorStack);
      throw new Error(`OpenAI embedding failed: ${errorMessage}`);
    }
  }

  private async callOpenAIAPI(
    texts: string[]
  ): Promise<OpenAIEmbeddingResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const body = {
      input: texts,
      model: this.model,
    };

    try {
      const data = await this.httpClient.postJson<OpenAIEmbeddingResponse>(
        this.apiEndpoint,
        body,
        headers,
        'OpenAI Embeddings'
      );
      return data;
    } catch (error) {
      // Try to extract OpenAI-specific error message
      const errorMessage = getErrorMessage(error);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }
}
