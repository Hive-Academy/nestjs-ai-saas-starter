import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { DevbrandBackendFeatureModule } from '@devbrand/backend-feature';
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';

// Configuration imports
import { getNestLanggraphConfig } from './config/nestjs-langgraph.config';
import { getChromaDBConfig } from './config/chromadb.config';
import { getNeo4jConfig } from './config/neo4j.config';

// Test services and controllers for Phase 1 verification
import { AdapterTestService } from './services/adapter-test.service';
import { AdapterTestController } from './controllers/adapter-test.controller';

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



    // LangGraph Module with simplified configuration
    NestjsLanggraphModule.forRoot(getNestLanggraphConfig()),
    DevbrandBackendFeatureModule,
  ],
  providers: [
    // Phase 1 test service to verify adapter injection
    AdapterTestService,
  ],
  controllers: [
    // Phase 1 test controller to expose verification endpoints
    AdapterTestController,
  ],
  exports: [
    // Export AgenticMemoryModule so other modules can use it

  ],
})
export class AppModule {}
