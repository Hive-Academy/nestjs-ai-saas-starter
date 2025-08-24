import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Module imports
import { DocumentsModule } from '../modules/documents/documents.module';
import { GraphModule } from '../modules/graph/graph.module';
import { HealthModule } from '../modules/health/health.module';

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

    // Memory Module - Now at app level, uses injected services
    AgenticMemoryModule.forRoot({
      enableSemanticSearch: true,
      enableAutoSummarization: true,
      retention: {
        maxEntries: 10000,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    }),

    // Feature Modules
    DocumentsModule,
    GraphModule,

    HealthModule,
  ],
  exports: [
    // Export AgenticMemoryModule so other modules can use it
    AgenticMemoryModule,
  ],
})
export class AppModule {}
