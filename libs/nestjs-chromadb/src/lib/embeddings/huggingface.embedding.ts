import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { HuggingFaceEmbeddingConfig } from '../interfaces/config/module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/errors/error.utils';
import { HttpClient, InputValidator } from '../utils/http-client.utils';

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
  private readonly apiEndpoint: string;
  private readonly httpClient: HttpClient;
  private readonly validator: InputValidator;

  constructor(config: HuggingFaceEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'sentence-transformers/all-MiniLM-L6-v2';
    this.apiEndpoint =
      config.apiEndpoint ??
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.httpClient = new HttpClient(config.http);
    this.validator = new InputValidator();

    // Validate API key if validation is enabled and key is provided
    if (config.validation?.validateApiKey && this.apiKey) {
      const validation = this.validator.validateApiKey(
        this.apiKey,
        'huggingface'
      );
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
        'Empty texts array provided to HuggingFace embedding provider'
      );
      return [];
    }

    // Comprehensive input validation
    const validation = this.validator.validateTexts(texts, {
      maxTextLength: 512 * 1000, // Most models have token limits
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
      const response = await this.callHuggingFaceAPI(texts);

      // HuggingFace API returns different formats depending on batch size
      let embeddings: number[][];
      if (texts.length === 1) {
        // Single text returns array of numbers
        if (Array.isArray(response[0])) {
          // Response is already a batch response
          embeddings = response as HuggingFaceBatchResponse;
        } else {
          // Response is a single response, wrap it
          embeddings = [response as HuggingFaceSingleResponse];
        }
      } else {
        // Multiple texts return array of arrays
        embeddings = response as HuggingFaceBatchResponse;
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

  private async callHuggingFaceAPI(
    texts: string[]
  ): Promise<HuggingFaceResponse> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const body = {
      inputs: texts.length === 1 ? texts[0] : texts,
      options: {
        wait_for_model: true,
      },
    };

    try {
      const data = await this.httpClient.postJson<HuggingFaceResponse>(
        this.apiEndpoint,
        body,
        headers,
        'HuggingFace Embeddings'
      );
      return data;
    } catch (error) {
      // Try to extract HuggingFace-specific error message
      const errorMessage = getErrorMessage(error);
      throw new Error(`HuggingFace API error: ${errorMessage}`);
    }
  }
}
