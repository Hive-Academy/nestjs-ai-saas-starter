import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { LangGraphModule } from '@hive-academy/nestjs-langgraph';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Module imports
import { DocumentsModule } from '../modules/documents/documents.module';
import { GraphModule } from '../modules/graph/graph.module';
import { HealthModule } from '../modules/health/health.module';
import { WorkflowsModule } from '../modules/workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ChromaDB Module
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('CHROMADB_HOST', 'localhost'),
          port: parseInt(configService.get('CHROMADB_PORT', '8000')),
          ssl: configService.get('CHROMADB_SSL', 'false') === 'true',
          tenant: configService.get('CHROMADB_TENANT', 'default_tenant'),
          database: configService.get('CHROMADB_DATABASE', 'default_database'),
        },
        embedding: {
          provider: 'huggingface',
          config: {
            model: configService.get(
              'HUGGINGFACE_MODEL',
              'sentence-transformers/all-MiniLM-L6-v2'
            ),
            apiKey: configService.get('HUGGINGFACE_API_KEY', ''),
            batchSize: parseInt(
              configService.get('HUGGINGFACE_BATCH_SIZE', '50')
            ),
          },
        },
        defaultCollection: configService.get(
          'CHROMADB_DEFAULT_COLLECTION',
          'documents'
        ),
        batchSize: parseInt(configService.get('CHROMADB_BATCH_SIZE', '100')),
        maxRetries: parseInt(configService.get('CHROMADB_MAX_RETRIES', '3')),
        retryDelay: parseInt(configService.get('CHROMADB_RETRY_DELAY', '1000')),
        enableHealthCheck:
          configService.get('CHROMADB_HEALTH_CHECK', 'true') === 'true',
        logConnection:
          configService.get('CHROMADB_LOG_CONNECTION', 'true') === 'true',
      }),
      inject: [ConfigService],
    }),

    // Neo4j Module
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('NEO4J_URI', 'bolt://localhost:7687'),
        username: configService.get('NEO4J_USERNAME', 'neo4j'),
        password: configService.get('NEO4J_PASSWORD', 'password'),
        database: configService.get('NEO4J_DATABASE', 'neo4j'),
        config: {
          maxConnectionPoolSize: parseInt(
            configService.get('NEO4J_MAX_POOL_SIZE', '100')
          ),
          connectionAcquisitionTimeout: parseInt(
            configService.get('NEO4J_CONNECTION_TIMEOUT', '60000')
          ),
        },
        healthCheck: configService.get('NEO4J_HEALTH_CHECK', 'true') === 'true',
        retryAttempts: parseInt(configService.get('NEO4J_RETRY_ATTEMPTS', '5')),
        retryDelay: parseInt(configService.get('NEO4J_RETRY_DELAY', '5000')),
      }),
    }),

    // LangGraph Module
    LangGraphModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const llmProvider = configService.get('LLM_PROVIDER', 'openrouter');

        // Configure based on selected provider
        let llmConfig: any = {};

        if (llmProvider === 'openrouter') {
          // OpenRouter configuration (default)
          llmConfig = {
            provider: 'openai', // OpenRouter uses OpenAI-compatible API
            apiKey: configService.get('OPENROUTER_API_KEY'),
            baseUrl: configService.get(
              'OPENROUTER_BASE_URL',
              'https://openrouter.ai/api/v1'
            ),
            model: configService.get(
              'OPENROUTER_MODEL',
              'openai/gpt-3.5-turbo'
            ),
            options: {
              temperature: parseFloat(
                configService.get('OPENROUTER_TEMPERATURE', '0.7')
              ),
              maxTokens: parseInt(
                configService.get('OPENROUTER_MAX_TOKENS', '2048')
              ),
              topP: parseFloat(configService.get('OPENROUTER_TOP_P', '0.9')),
              headers: {
                'HTTP-Referer': configService.get(
                  'OPENROUTER_SITE_URL',
                  'http://localhost:3000'
                ),
                'X-Title': configService.get(
                  'OPENROUTER_APP_NAME',
                  'NestJS AI SaaS Starter'
                ),
              },
            },
          };
        } else if (llmProvider === 'ollama') {
          // Ollama configuration (local)
          llmConfig = {
            provider: 'ollama',
            baseUrl: configService.get(
              'OLLAMA_BASE_URL',
              'http://localhost:11434'
            ),
            model: configService.get('OLLAMA_MODEL', 'llama2'),
            options: {
              temperature: parseFloat(
                configService.get('OLLAMA_TEMPERATURE', '0.7')
              ),
              numPredict: parseInt(
                configService.get('OLLAMA_NUM_PREDICT', '256')
              ),
              topK: parseInt(configService.get('OLLAMA_TOP_K', '40')),
              topP: parseFloat(configService.get('OLLAMA_TOP_P', '0.9')),
            },
          };
        }

        return {
          llm: llmConfig,
          debug: configService.get('LANGGRAPH_DEBUG', 'false') === 'true',
          streaming: {
            enabled: true,
            returnIntermediateSteps: true,
          },
          hitl: {
            enabled: true,
            timeout: 30000,
          },
        };
      },
      inject: [ConfigService],
    }),

    // Feature Modules
    DocumentsModule,
    GraphModule,
    WorkflowsModule,
    HealthModule,
  ],
})
export class AppModule {}
