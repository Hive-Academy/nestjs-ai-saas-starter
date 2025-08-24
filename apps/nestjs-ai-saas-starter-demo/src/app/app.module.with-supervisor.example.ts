import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Feature module imports
import { SupervisorAgentModule } from '@libs/demo/supervisor-agent';

// Module imports
import { DocumentsModule } from '../modules/documents/documents.module';
import { GraphModule } from '../modules/graph/graph.module';
import { HealthModule } from '../modules/health/health.module';

/**
 * Example of how to integrate the SupervisorAgentModule into your main application.
 * 
 * Key points:
 * 1. ChromaDB and Neo4j are configured ONCE in the main app
 * 2. SupervisorAgentModule reuses these existing connections
 * 3. The memory module within SupervisorAgent uses the same ChromaDB/Neo4j instances
 * 4. No duplicate database connections are created
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ===== CORE DATABASE MODULES =====
    // These are configured ONCE and shared by all feature modules
    
    // ChromaDB Module - Vector Database
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

    // Neo4j Module - Graph Database
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

    // ===== FEATURE MODULES =====
    // These modules use the shared database connections configured above
    
    // Standard feature modules
    DocumentsModule,
    GraphModule,
    HealthModule,
    
    // Supervisor Agent Module
    // This module:
    // - Uses the ChromaDB instance configured above for memory storage
    // - Uses the Neo4j instance configured above for graph relationships
    // - Creates its own collections/nodes within these existing databases
    // - Does NOT create new database connections
    SupervisorAgentModule,
  ],
})
export class AppModule {}

/**
 * Environment Variable Usage:
 * 
 * SHARED DATABASE CONNECTIONS (used by all modules):
 * - NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE
 * - CHROMADB_HOST, CHROMADB_PORT, CHROMADB_SSL, CHROMADB_TENANT, CHROMADB_DATABASE
 * 
 * MODULE-SPECIFIC COLLECTIONS (different namespaces within shared DBs):
 * - CHROMADB_DEFAULT_COLLECTION: Main app's document collection
 * - MEMORY_CHROMADB_COLLECTION: Supervisor agent's memory collection
 * 
 * The supervisor agent will:
 * 1. Store memories in ChromaDB collection 'supervisor_memory'
 * 2. Store relationships in Neo4j database 'neo4j' (same as main app)
 * 3. Use OpenRouter for LLM calls (configured via OPENROUTER_* vars)
 */