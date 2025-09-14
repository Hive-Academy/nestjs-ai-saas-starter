import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { MemoryModule } from '@hive-academy/langgraph-memory';

// Adapters - Keep these as they're essential
import { ChromaVectorAdapter, Neo4jGraphAdapter } from './adapters';

// LangGraph modules with proper streaming integration
import {
  LanggraphModulesCheckpointModule,
  CheckpointManagerService,
  CheckpointManagerAdapter,
} from '@hive-academy/langgraph-checkpoint';
import {
  StreamingModule,
  StreamingServiceAdapter,
} from '@hive-academy/langgraph-streaming';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

// Configuration imports
import { getChromaDBConfig } from './config/chromadb.config';
import { getNeo4jConfig } from './config/neo4j.config';
import { getCheckpointConfig } from './config/checkpoint.config';
import { getStreamingConfig } from './config/streaming.config';
import { getHitlConfig } from './config/hitl.config';
import { getMemoryConfig } from './config/memory.config';
import { getFunctionalApiConfig } from './config/functional-api.config';
import { getMultiAgentConfig } from './config/multi-agent.config';
import { getMonitoringConfig } from './config/monitoring.config';
import { getWorkflowEngineConfig } from './config/workflow-engine.config';

// Health check
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';

// Business modules
import { BusinessWorkflowsModule } from './business-workflows/business-workflows.module';
import { ShowcaseModule } from './showcase/showcase.module';

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

    // HITL module
    HitlModule.forRoot(getHitlConfig()),

    // Workflow engine WITH STREAMING
    WorkflowEngineModule.forRootAsync({
      useFactory: async (streamingAdapter: any) => ({
        ...getWorkflowEngineConfig(),
        streamingAdapter, // Enable streaming!
      }),
      inject: [StreamingServiceAdapter],
    }),

    // Multi-agent module WITH STREAMING
    MultiAgentModule.forRootAsync({
      useFactory: async (
        streamingAdapter: StreamingServiceAdapter,
        checkpointManager: CheckpointManagerService
      ) => ({
        ...getMultiAgentConfig(),
        streamingAdapter, // Enable streaming!
        checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
      }),
      inject: [StreamingServiceAdapter, CheckpointManagerService],
    }),

    // Functional API with checkpoint AND STREAMING
    FunctionalApiModule.forRootAsync({
      useFactory: async (streamingAdapter: any, checkpointManager: any) => ({
        ...getFunctionalApiConfig(),
        streamingAdapter, // Enable streaming!
        checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
      }),
      inject: [StreamingServiceAdapter, CheckpointManagerService],
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
    ShowcaseModule,
  ],
  controllers: [
    HealthController,
    // Business controllers will be added here
  ],
  providers: [
    // Business services will be added here
  ],
})
export class AppModule {}
