import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { HuggingFaceEmbeddingConfig  } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';

/**
 * HuggingFace embedding provider
 */
@Injectable()
export class HuggingFaceEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly logger = new Logger(HuggingFaceEmbeddingProvider.name);
  readonly name = 'huggingface';
  readonly dimension = 384; // all-MiniLM-L6-v2 dimension
  readonly batchSize: number;

  private readonly apiKey?: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: HuggingFaceEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
    this.endpoint = config.endpoint || `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`;
    this.batchSize = config.batchSize || 50;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.processBatches(texts, (batch) => this.embedBatch(batch));
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
      this.logger.error(`HuggingFace embedding failed: ${errorMessage}`, errorStack);
      throw new Error(`HuggingFace embedding failed: ${errorMessage}`);
    }
  }

  private async callHuggingFaceAPI(texts: string[]): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
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
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${error}`);
    }

    return response.json();
  }
}