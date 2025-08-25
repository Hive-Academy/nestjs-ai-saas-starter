import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { AgenticMemoryModule } from '@devbrand/backend-data-access';
import { DevbrandBackendFeatureModule } from '@devbrand/backend-feature';
import {
  NestjsLanggraphModule,
  configureMemoryIntegration,
} from '@hive-academy/nestjs-langgraph';

// Configuration imports
import { getNestLanggraphConfig } from './config/nestjs-langgraph.config';
import { getChromaDBConfig } from './config/chromadb.config';
import { getNeo4jConfig } from './config/neo4j.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ChromaDB Module with extracted configuration
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        getChromaDBConfig(configService),
      inject: [ConfigService],
    }),

    // Neo4j Module with extracted configuration
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getNeo4jConfig(configService),
    }),

    // Memory Module - Simplified agent configuration
    AgenticMemoryModule.forAgent({
      enableSemanticSearch: true,
      enableAutoSummarization: true,
      collection: 'agent-memory',
    }),

    // LangGraph Module with Memory Integration
    NestjsLanggraphModule.forRoot({
      ...getNestLanggraphConfig(),

      // Memory integration using contract interface
      memory: configureMemoryIntegration({
        enabled: true,
        memoryModule: AgenticMemoryModule.forAgent({
          enableSemanticSearch: true,
          enableAutoSummarization: true,
          collection: 'agent-memory',
        }),
        config: {
          useEnterpriseMemory: true,
          defaultMemoryType: 'enterprise',
        },
      }),
    }),
    DevbrandBackendFeatureModule,
  ],
  exports: [
    // Export AgenticMemoryModule so other modules can use it
    AgenticMemoryModule,
  ],
})
export class AppModule {}
