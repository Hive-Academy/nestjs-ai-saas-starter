import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core library imports
import { MemoryModule } from '@hive-academy/langgraph-memory';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Adapters - Keep these as they're essential
import {
  ChromaVectorAdapter,
  Neo4jGraphAdapter,
  Neo4jHitlStorageAdapter,
  Neo4jInterruptionStorageAdapter,
} from './adapters';

// LangGraph modules with proper streaming integration
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import {
  WorkflowEngineModule,
  WorkflowEngineModuleOptions,
} from '@hive-academy/langgraph-workflow-engine';

import { getCheckpointConfig } from './config/checkpoint.config';
import { getChromaDBConfig } from './config/chromadb.config';
import { getFunctionalApiConfig } from './config/functional-api.config';
import { getHitlConfig } from './config/hitl.config';
import { getMemoryConfig } from './config/memory.config';
import { getMonitoringConfig } from './config/monitoring.config';
import { getMultiAgentConfig } from './config/multi-agent.config';
import { getNeo4jConfig } from './config/neo4j.config';
import { getStreamingConfig } from './config/streaming.config';
import { getWorkflowEngineConfig } from './config/workflow-engine.config';

// Health check
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';

// Business modules
import { BusinessWorkflowsModule } from './business-workflows/business-workflows.module';

// App streaming manager
import { AppStreamingManager } from './services/app-streaming-manager.service';

// Core interface for adapter pattern
import {
  ICheckpointAdapter,
  IStreamingService,
} from '@hive-academy/langgraph-core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Core database modules
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        getChromaDBConfig(configService),
      inject: [ConfigService],
    }),

    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getNeo4jConfig(configService),
    }),

    // Memory module with adapters
    MemoryModule.forRoot({
      ...getMemoryConfig(),
      adapters: {
        vector: ChromaVectorAdapter,
        graph: Neo4jGraphAdapter,
      },
    }),

    // Checkpoint module
    LanggraphModulesCheckpointModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => getCheckpointConfig(),
    }),

    // PROPERLY CONFIGURED STREAMING MODULE
    StreamingModule.forRoot({
      ...getStreamingConfig(),
      websocket: {
        enabled: true,
        port: 3000, // Using main server port
      },
      gateway: {
        enabled: true,
        cors: {
          origin: true,
          credentials: true,
        },
      },
    }),

    // HITL module with storage adapters
    HitlModule.forRoot({
      ...getHitlConfig(),
      adapters: {
        storage: Neo4jHitlStorageAdapter,
        interruptionStorage: Neo4jInterruptionStorageAdapter,
      },
    }),

    // Workflow engine WITH STREAMING - adapter injection
    WorkflowEngineModule.forRootAsync({
      useFactory: async (
        streamingAdapter: IStreamingService
      ): Promise<WorkflowEngineModuleOptions> => {
        return {
          ...getWorkflowEngineConfig(),
          streamingAdapter,
        };
      },
      inject: ['IStreamingService'],
    }),

    // Multi-agent module WITH STREAMING - adapter injection
    MultiAgentModule.forRootAsync({
      useFactory: async (
        streamingAdapter: IStreamingService,
        checkpointAdapter: ICheckpointAdapter
      ) => {
        return {
          ...getMultiAgentConfig(),
          streamingAdapter,
          checkpointAdapter,
        };
      },
      inject: ['IStreamingService', 'ICheckpointAdapter'],
    }),

    // Functional API with checkpoint AND STREAMING - adapter injection
    FunctionalApiModule.forRootAsync({
      useFactory: async (
        streamingAdapter: IStreamingService,
        checkpointAdapter: ICheckpointAdapter
      ): Promise<any> => {
        return {
          ...getFunctionalApiConfig(),
          streamingAdapter,
          checkpointAdapter,
        };
      },
      inject: ['IStreamingService', 'ICheckpointAdapter'], // Inject adapter via string token
    }),

    // Monitoring module
    MonitoringModule.forRoot(getMonitoringConfig()),

    // Health checks
    TerminusModule.forRoot({
      logger: false,
      errorLogStyle: 'pretty',
    }),

    // Business modules
    BusinessWorkflowsModule,
  ],
  controllers: [HealthController],
  providers: [AppStreamingManager],
})
export class AppModule {}
