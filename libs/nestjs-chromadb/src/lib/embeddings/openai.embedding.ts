import { Injectable, Logger } from '@nestjs/common';
import { BaseEmbeddingProvider } from './base.embedding';
import type { OpenAIEmbeddingConfig  } from '../interfaces/chromadb-module-options.interface';
import { getErrorMessage, getErrorStack } from '../utils/error.utils';

/**
 * OpenAI embedding provider
 */
@Injectable()
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);
  readonly name = 'openai';
  readonly dimension = 1536; // text-embedding-ada-002 dimension
  readonly batchSize: number;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly organization?: string;

  constructor(config: OpenAIEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-ada-002';
    this.organization = config.organization;
    this.batchSize = config.batchSize || 100;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.processBatches(texts, (batch) => this.embedBatch(batch));
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.callOpenAIAPI(texts);
      const embeddings = response.data.map((item: any) => item.embedding);
      
      this.validateDimensions(embeddings, texts.length);
      return embeddings;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(`OpenAI embedding failed: ${errorMessage}`, errorStack);
      throw new Error(`OpenAI embedding failed: ${errorMessage}`);
    }
  }

  private async callOpenAIAPI(texts: string[]): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
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
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }
}