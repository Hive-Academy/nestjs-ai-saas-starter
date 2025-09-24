import { Logger } from '@nestjs/common';
import type {
  ChromaDBModuleOptions,
  EmbeddingConfig,
  OpenAIEmbeddingConfig,
  CohereEmbeddingConfig,
  CustomEmbeddingConfig,
} from '../interfaces/chromadb-module-options.interface';

const logger = new Logger('ChromaDBConfigValidation');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ChromaDB configuration invalid: ${message}`);
  }
}

function validateEmbeddingConfig(embedding?: EmbeddingConfig): void {
  if (!embedding) return;

  switch (embedding.provider) {
    case 'openai': {
      const cfg = embedding.config as OpenAIEmbeddingConfig;
      assert(
        typeof cfg.apiKey === 'string' && cfg.apiKey.length > 0,
        'OpenAI provider requires apiKey'
      );
      break;
    }
    case 'cohere': {
      const cfg = embedding.config as CohereEmbeddingConfig;
      assert(
        typeof cfg.apiKey === 'string' && cfg.apiKey.length > 0,
        'Cohere provider requires apiKey'
      );
      break;
    }
    case 'huggingface': {
      // apiKey optional; no strict requirement
      break;
    }
    case 'custom': {
      const cfg = embedding.config as CustomEmbeddingConfig;
      assert(
        typeof cfg.embed === 'function',
        'Custom provider requires an embed function'
      );
      assert(
        Number.isInteger(cfg.dimension) && cfg.dimension > 0,
        'Custom provider requires positive dimension'
      );
      break;
    }
    default: {
      // Exhaustive safeguard
      const neverProvider: never = embedding;
      throw new Error(
        `Unsupported embedding provider: ${(neverProvider as any)?.provider}`
      );
    }
  }
}

export function validateChromaDBOptions(options: ChromaDBModuleOptions): void {
  assert(!!options, 'Options object is required');
  assert(!!options.connection, 'connection object is required');

  const { host, port } = options.connection;
  assert(
    typeof host === 'string' && host.length > 0,
    'connection.host is required'
  );
  assert(
    typeof port === 'number' && Number.isInteger(port) && port > 0,
    'connection.port must be a positive integer'
  );

  if (host && !/^https?:\/\//i.test(host)) {
    // Warn but do not fail – aligns with quick fix guidance
    logger.warn('ChromaDB host should include protocol (http:// or https://)');
  }

  if (options.batchSize !== undefined) {
    assert(
      Number.isInteger(options.batchSize) && options.batchSize > 0,
      'batchSize must be a positive integer'
    );
  }
  if (options.maxRetries !== undefined) {
    assert(
      Number.isInteger(options.maxRetries) && options.maxRetries >= 0,
      'maxRetries must be a non-negative integer'
    );
  }
  if (options.retryDelay !== undefined) {
    assert(
      Number.isInteger(options.retryDelay) && options.retryDelay >= 0,
      'retryDelay must be a non-negative integer'
    );
  }

  validateEmbeddingConfig(options.embedding);
}

export type { ChromaDBModuleOptions };
