import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { LangGraphModule } from '@hive-academy/nestjs-langgraph';

// Module imports
import { DocumentsModule } from '../modules/documents/documents.module';
import { GraphModule } from '../modules/graph/graph.module';
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
      useFactory: (configService: ConfigService) => ({
        url: configService.get('CHROMADB_URL', 'http://localhost:8000'),
        auth: configService.get('CHROMADB_API_KEY') ? {
          provider: 'token',
          credentials: configService.get('CHROMADB_API_KEY'),
        } : undefined,
      }),
      inject: [ConfigService],
    }),
    
    // Neo4j Module
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('NEO4J_URI', 'bolt://localhost:7687'),
        username: configService.get('NEO4J_USERNAME', 'neo4j'),
        password: configService.get('NEO4J_PASSWORD', 'password'),
        database: configService.get('NEO4J_DATABASE', 'neo4j'),
      }),
      inject: [ConfigService],
    }),
    
    // LangGraph Module
    LangGraphModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        openAIApiKey: configService.get('OPENAI_API_KEY'),
        debug: configService.get('LANGGRAPH_DEBUG', 'false') === 'true',
        streaming: {
          enabled: true,
          returnIntermediateSteps: true,
        },
        hitl: {
          enabled: true,
          timeout: 30000,
        },
      }),
      inject: [ConfigService],
    }),
    
    // Feature Modules
    DocumentsModule,
    GraphModule,
    WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}