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
  return {
    connection: {
      host: configService.get('CHROMADB_HOST', 'localhost'),
      port: parseInt(configService.get('CHROMADB_PORT', '8000'), 10),
      ssl: configService.get('CHROMADB_SSL', 'false') === 'true',
      tenant: configService.get('CHROMADB_TENANT', 'default_tenant'),
      database: configService.get('CHROMADB_DATABASE', 'default_database'),
    },

    embedding: (() => {
      const provider = configService.get(
        'CHROMADB_EMBEDDING_PROVIDER',
        'huggingface'
      );

      switch (provider) {
        case 'openai':
          return {
            provider: 'openai' as const,
            config: {
              apiKey: configService.get('OPENAI_API_KEY') as string,
              model: configService.get(
                'OPENAI_EMBEDDING_MODEL',
                'text-embedding-ada-002'
              ),
              batchSize: parseInt(
                configService.get('OPENAI_BATCH_SIZE', '100'),
                10
              ),
            },
          };

        case 'cohere':
          return {
            provider: 'cohere' as const,
            config: {
              apiKey: configService.get('COHERE_API_KEY') as string,
              model: configService.get(
                'COHERE_EMBEDDING_MODEL',
                'embed-english-v2.0'
              ),
              batchSize: parseInt(
                configService.get('COHERE_BATCH_SIZE', '100'),
                10
              ),
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
              batchSize: parseInt(
                configService.get('HUGGINGFACE_BATCH_SIZE', '50'),
                10
              ),
            },
          };
      }
    })(),

    defaultCollection: configService.get(
      'CHROMADB_DEFAULT_COLLECTION',
      'documents'
    ),

    batchSize: parseInt(configService.get('CHROMADB_BATCH_SIZE', '100'), 10),

    maxRetries: parseInt(configService.get('CHROMADB_MAX_RETRIES', '3'), 10),

    retryDelay: parseInt(configService.get('CHROMADB_RETRY_DELAY', '1000'), 10),

    enableHealthCheck:
      configService.get('CHROMADB_HEALTH_CHECK', 'true') === 'true',

    logConnection:
      configService.get('CHROMADB_LOG_CONNECTION', 'true') === 'true',
  };
};

/**
 * Environment variables reference for ChromaDB Configuration
 *
 * Connection Configuration:
 * - CHROMADB_HOST: ChromaDB server host (default: 'localhost')
 * - CHROMADB_PORT: ChromaDB server port (default: '8000')
 * - CHROMADB_SSL: Enable SSL connection (default: 'false')
 * - CHROMADB_TENANT: ChromaDB tenant (default: 'default_tenant')
 * - CHROMADB_DATABASE: ChromaDB database (default: 'default_database')
 *
 * Embedding Configuration:
 * - CHROMADB_EMBEDDING_PROVIDER: 'huggingface' | 'openai' | 'cohere' (default: 'huggingface')
 *
 * HuggingFace Embedding (when provider = 'huggingface'):
 * - HUGGINGFACE_MODEL: Model name (default: 'sentence-transformers/all-MiniLM-L6-v2')
 * - HUGGINGFACE_API_KEY: HuggingFace API key (optional for public models)
 * - HUGGINGFACE_BATCH_SIZE: Embedding batch size (default: '50')
 *
 * OpenAI Embedding (when provider = 'openai'):
 * - OPENAI_API_KEY: OpenAI API key (required)
 * - OPENAI_EMBEDDING_MODEL: OpenAI embedding model (default: 'text-embedding-ada-002')
 *
 * Cohere Embedding (when provider = 'cohere'):
 * - COHERE_API_KEY: Cohere API key (required)
 * - COHERE_EMBEDDING_MODEL: Cohere embedding model (default: 'embed-english-v2.0')
 *
 * Collection Configuration:
 * - CHROMADB_DEFAULT_COLLECTION: Default collection name (default: 'documents')
 * - CHROMADB_BATCH_SIZE: Batch size for operations (default: '100')
 *
 * Connection Reliability:
 * - CHROMADB_MAX_RETRIES: Maximum retry attempts (default: '3')
 * - CHROMADB_RETRY_DELAY: Retry delay in ms (default: '1000')
 *
 * Monitoring:
 * - CHROMADB_HEALTH_CHECK: Enable health checks (default: 'true')
 * - CHROMADB_LOG_CONNECTION: Log connection details (default: 'true')
 */
