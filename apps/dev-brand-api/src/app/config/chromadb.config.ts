import type { ConfigService } from '@nestjs/config';
import type { ChromaDBModuleOptions } from '@hive-academy/nestjs-chromadb';

/**
 * ChromaDB Configuration Factory
 *
 * Provides centralized configuration for ChromaDB connections and settings
 */
export const getChromaDBConfig = (
  ...args: unknown[]
): ChromaDBModuleOptions => {
  const configService = args[0] as ConfigService;

  // Validate required configuration
  const host = configService.get('CHROMADB_HOST');
  if (!host) {
    throw new Error(
      'CHROMADB_HOST is required. Please set this environment variable. ' +
        'For development use "localhost", for production specify your ChromaDB server host.'
    );
  }

  return {
    connection: {
      host,
      port: parseInt(configService.get('CHROMADB_PORT', '8000'), 10),
      ssl: configService.get('CHROMADB_SSL', 'false') === 'true',
      tenant: configService.get('CHROMADB_TENANT', 'default_tenant'),
      database: configService.get('CHROMADB_DATABASE', 'default_database'),
      http: {
        timeout: parseInt(configService.get('CHROMADB_TIMEOUT', '30000'), 10),
        maxRetries: parseInt(
          configService.get('CHROMADB_MAX_RETRIES', '3'),
          10
        ),
        retryDelay: parseInt(
          configService.get('CHROMADB_RETRY_DELAY', '1000'),
          10
        ),
        retryBackoffFactor: parseInt(
          configService.get('CHROMADB_RETRY_BACKOFF_FACTOR', '2'),
          10
        ),
      },
    },

    embedding: (() => {
      const provider = configService.get('EMBEDDING_PROVIDER', 'openai');

      switch (provider) {
        case 'openai':
          return {
            provider: 'openai' as const,
            config: {
              apiKey: configService.get('OPENAI_API_KEY') as string,
              model: configService.get(
                'OPENAI_EMBEDDING_MODEL',
                'text-embedding-3-small'
              ),
              apiEndpoint: configService.get('OPENAI_API_ENDPOINT'),
              organization: configService.get('OPENAI_ORGANIZATION'),
              dimensions: parseInt(
                configService.get('OPENAI_EMBEDDING_DIMENSIONS', '1536'),
                10
              ),
              batchSize: parseInt(
                configService.get('OPENAI_BATCH_SIZE', '100'),
                10
              ),
              maxInputTokens: parseInt(
                configService.get('OPENAI_MAX_INPUT_TOKENS', '8191'),
                10
              ),
              http: {
                timeout: parseInt(
                  configService.get('CHROMADB_TIMEOUT', '30000'),
                  10
                ),
                maxRetries: parseInt(
                  configService.get('CHROMADB_MAX_RETRIES', '3'),
                  10
                ),
                retryDelay: parseInt(
                  configService.get('CHROMADB_RETRY_DELAY', '1000'),
                  10
                ),
                retryBackoffFactor: parseInt(
                  configService.get('CHROMADB_RETRY_BACKOFF_FACTOR', '2'),
                  10
                ),
              },
              validation: {
                validateApiKey: configService.get('NODE_ENV') === 'production',
                maxTextLength: parseInt(
                  configService.get('TEXT_MAX_LENGTH', '8000'),
                  10
                ),
                maxBatchSize: parseInt(
                  configService.get('OPENAI_BATCH_SIZE', '100'),
                  10
                ),
                estimateTokens: true,
              },
            },
          };

        case 'cohere':
          return {
            provider: 'cohere' as const,
            config: {
              apiKey: configService.get('COHERE_API_KEY') as string,
              model: configService.get('COHERE_MODEL', 'embed-english-v3.0'),
              apiEndpoint: configService.get('COHERE_API_ENDPOINT'),
              dimensions: parseInt(
                configService.get('COHERE_DIMENSIONS', '1024'),
                10
              ),
              batchSize: parseInt(
                configService.get('COHERE_BATCH_SIZE', '96'),
                10
              ),
              http: {
                timeout: parseInt(
                  configService.get('CHROMADB_TIMEOUT', '30000'),
                  10
                ),
                maxRetries: parseInt(
                  configService.get('CHROMADB_MAX_RETRIES', '3'),
                  10
                ),
                retryDelay: parseInt(
                  configService.get('CHROMADB_RETRY_DELAY', '1000'),
                  10
                ),
                retryBackoffFactor: parseInt(
                  configService.get('CHROMADB_RETRY_BACKOFF_FACTOR', '2'),
                  10
                ),
              },
              validation: {
                validateApiKey: configService.get('NODE_ENV') === 'production',
                maxTextLength: parseInt(
                  configService.get('TEXT_MAX_LENGTH', '8000'),
                  10
                ),
                maxBatchSize: parseInt(
                  configService.get('COHERE_BATCH_SIZE', '96'),
                  10
                ),
              },
            },
          };

        case 'huggingface':
        default:
          return {
            provider: 'huggingface' as const,
            config: {
              apiKey: configService.get('HUGGINGFACE_API_KEY'),
              model: configService.get(
                'HUGGINGFACE_MODEL',
                'sentence-transformers/all-MiniLM-L6-v2'
              ),
              apiEndpoint: configService.get('HUGGINGFACE_API_ENDPOINT'),
              dimensions: parseInt(
                configService.get('HUGGINGFACE_DIMENSIONS', '384'),
                10
              ),
              batchSize: parseInt(
                configService.get('HUGGINGFACE_BATCH_SIZE', '50'),
                10
              ),
              http: {
                timeout: parseInt(
                  configService.get('CHROMADB_TIMEOUT', '30000'),
                  10
                ),
                maxRetries: parseInt(
                  configService.get('CHROMADB_MAX_RETRIES', '3'),
                  10
                ),
                retryDelay: parseInt(
                  configService.get('CHROMADB_RETRY_DELAY', '1000'),
                  10
                ),
                retryBackoffFactor: parseInt(
                  configService.get('CHROMADB_RETRY_BACKOFF_FACTOR', '2'),
                  10
                ),
              },
              validation: {
                validateApiKey:
                  configService.get('NODE_ENV') === 'production' &&
                  Boolean(configService.get('HUGGINGFACE_API_KEY')),
                maxTextLength: parseInt(
                  configService.get('TEXT_MAX_LENGTH', '8000'),
                  10
                ),
                maxBatchSize: parseInt(
                  configService.get('HUGGINGFACE_BATCH_SIZE', '50'),
                  10
                ),
              },
            },
          };
      }
    })(),

    defaultCollection: configService.get(
      'DEFAULT_COLLECTION_NAME',
      'documents'
    ),

    batchSize: parseInt(configService.get('DEFAULT_BATCH_SIZE', '100'), 10),

    // Legacy support - these are now handled by connection.http
    maxRetries: parseInt(configService.get('CHROMADB_MAX_RETRIES', '3'), 10),
    retryDelay: parseInt(configService.get('CHROMADB_RETRY_DELAY', '1000'), 10),

    enableHealthCheck:
      configService.get('HEALTH_CHECK_ENABLED', 'true') === 'true',

    healthCheckInterval: parseInt(
      configService.get('HEALTH_CHECK_INTERVAL', '30000'),
      10
    ),

    logConnection:
      configService.get('LOG_CONNECTION_DETAILS', 'true') === 'true',

    logEmbeddingOperations:
      configService.get('LOG_EMBEDDING_OPERATIONS', 'false') === 'true',

    textProcessing: {
      chunkSize: parseInt(configService.get('TEXT_CHUNK_SIZE', '1000'), 10),
      chunkOverlap: parseInt(
        configService.get('TEXT_CHUNK_OVERLAP', '200'),
        10
      ),
      maxTextLength: parseInt(configService.get('TEXT_MAX_LENGTH', '8000'), 10),
    },

    http: {
      timeout: parseInt(configService.get('CHROMADB_TIMEOUT', '30000'), 10),
      maxRetries: parseInt(configService.get('CHROMADB_MAX_RETRIES', '3'), 10),
      retryDelay: parseInt(
        configService.get('CHROMADB_RETRY_DELAY', '1000'),
        10
      ),
      retryBackoffFactor: parseInt(
        configService.get('CHROMADB_RETRY_BACKOFF_FACTOR', '2'),
        10
      ),
    },

    validation: {
      maxTextLength: parseInt(configService.get('TEXT_MAX_LENGTH', '8000'), 10),
      maxBatchSize: parseInt(
        configService.get('DEFAULT_BATCH_SIZE', '100'),
        10
      ),
      validateApiKey: configService.get('NODE_ENV') === 'production',
      estimateTokens: false,
    },
  };
};

/**
 * Environment variables reference for ChromaDB Configuration
 * Updated for Production Readiness
 *
 * Connection Configuration (REQUIRED):
 * - CHROMADB_HOST: ChromaDB server host (REQUIRED - no default)
 * - CHROMADB_PORT: ChromaDB server port (default: '8000')
 * - CHROMADB_SSL: Enable SSL connection (default: 'false')
 * - CHROMADB_TENANT: ChromaDB tenant (default: 'default_tenant')
 * - CHROMADB_DATABASE: ChromaDB database (default: 'default_database')
 *
 * HTTP Configuration:
 * - CHROMADB_TIMEOUT: Request timeout in ms (default: '30000')
 * - CHROMADB_MAX_RETRIES: Maximum retry attempts (default: '3')
 * - CHROMADB_RETRY_DELAY: Initial retry delay in ms (default: '1000')
 * - CHROMADB_RETRY_BACKOFF_FACTOR: Exponential backoff factor (default: '2')
 *
 * Embedding Provider Selection:
 * - EMBEDDING_PROVIDER: 'openai' | 'huggingface' | 'cohere' | 'custom' (default: 'openai')
 *
 * OpenAI Embedding Configuration (when provider = 'openai'):
 * - OPENAI_API_KEY: OpenAI API key (REQUIRED)
 * - OPENAI_EMBEDDING_MODEL: OpenAI model (default: 'text-embedding-3-small')
 * - OPENAI_API_ENDPOINT: Custom API endpoint (optional)
 * - OPENAI_ORGANIZATION: Organization ID (optional)
 * - OPENAI_EMBEDDING_DIMENSIONS: Embedding dimensions (default: '1536')
 * - OPENAI_BATCH_SIZE: Batch size (default: '100')
 * - OPENAI_MAX_INPUT_TOKENS: Maximum input tokens (default: '8191')
 *
 * HuggingFace Embedding Configuration (when provider = 'huggingface'):
 * - HUGGINGFACE_API_KEY: HuggingFace API key (optional)
 * - HUGGINGFACE_MODEL: Model name (default: 'sentence-transformers/all-MiniLM-L6-v2')
 * - HUGGINGFACE_API_ENDPOINT: Custom API endpoint (optional)
 * - HUGGINGFACE_DIMENSIONS: Embedding dimensions (default: '384')
 * - HUGGINGFACE_BATCH_SIZE: Batch size (default: '50')
 *
 * Cohere Embedding Configuration (when provider = 'cohere'):
 * - COHERE_API_KEY: Cohere API key (REQUIRED)
 * - COHERE_MODEL: Cohere model (default: 'embed-english-v3.0')
 * - COHERE_API_ENDPOINT: Custom API endpoint (optional)
 * - COHERE_DIMENSIONS: Embedding dimensions (default: '1024')
 * - COHERE_BATCH_SIZE: Batch size (default: '96')
 *
 * Text Processing Configuration:
 * - TEXT_CHUNK_SIZE: Default chunk size (default: '1000')
 * - TEXT_CHUNK_OVERLAP: Default chunk overlap (default: '200')
 * - TEXT_MAX_LENGTH: Maximum text length (default: '8000')
 *
 * Collection Configuration:
 * - DEFAULT_COLLECTION_NAME: Default collection name (default: 'documents')
 * - DEFAULT_BATCH_SIZE: Default batch size (default: '100')
 *
 * Health Check & Monitoring:
 * - HEALTH_CHECK_ENABLED: Enable health checks (default: 'true')
 * - HEALTH_CHECK_INTERVAL: Health check interval in ms (default: '30000')
 * - LOG_CONNECTION_DETAILS: Log connection details (default: 'true')
 * - LOG_EMBEDDING_OPERATIONS: Log embedding operations (default: 'false')
 *
 * Production Notes:
 * - API key validation is automatically enabled in production (NODE_ENV=production)
 * - CHROMADB_HOST is REQUIRED and has no default value
 * - All HTTP requests include timeout and retry logic
 * - Input validation is comprehensive with configurable limits
 */
