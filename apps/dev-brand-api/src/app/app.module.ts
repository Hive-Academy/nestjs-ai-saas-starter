import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { MemoryModule } from '@hive-academy/langgraph-memory';

// Adapters - Keep these as they're essential
import {
  ChromaVectorAdapter,
  Neo4jGraphAdapter,
  Neo4jHitlStorageAdapter,
  Neo4jInterruptionStorageAdapter,
} from './adapters';

// LangGraph modules with proper streaming integration
import {
  LanggraphModulesCheckpointModule,
  CheckpointManagerService,
  CheckpointManagerAdapter,
} from '@hive-academy/langgraph-checkpoint';
import {
  StreamingModule,
  StreamingServiceAdapter
} from '@hive-academy/langgraph-streaming';
import {
  IStreamingService,
} from '@hive-academy/langgraph-core';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { WorkflowEngineModule, WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

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

    // Workflow engine WITH STREAMING
    WorkflowEngineModule.forRootAsync({
      useFactory: async (...deps: unknown[]): Promise<WorkflowEngineModuleOptions> => {
        const streamingAdapter = deps[0] as IStreamingService;
        return {
          ...getWorkflowEngineConfig(),
          streamingAdapter, // Enable streaming via interface token
        };
      },
      inject: [StreamingServiceAdapter], // Inject the actual adapter class
    }),

    // Multi-agent module WITH STREAMING
    MultiAgentModule.forRootAsync({
      useFactory: async (...deps: unknown[]) => {
        const streamingAdapter = deps[0] as IStreamingService;
        const checkpointManager = deps[1] as CheckpointManagerService;
        return {
          ...getMultiAgentConfig(),
          streamingAdapter, // Enable streaming via interface token
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
        };
      },
      inject: [StreamingServiceAdapter, CheckpointManagerService], // Use the actual adapter class
    }),

    // Functional API with checkpoint AND STREAMING
    FunctionalApiModule.forRootAsync({
      useFactory: async (...deps: unknown[]): Promise<any> => {
        const streamingAdapter = deps[0] as IStreamingService;
        const checkpointManager = deps[1] as CheckpointManagerService;
        return {
          ...getFunctionalApiConfig(),
          streamingAdapter, // Enable streaming via interface token
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
        };
      },
      inject: [StreamingServiceAdapter, CheckpointManagerService], // Use the actual adapter class
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
  controllers: [
    HealthController,
    // Business controllers will be added here
  ],
  providers: [
    // Business services will be added here
  ],
  exports: [
    // Export modules so their services are available to child modules
    HitlModule,
    StreamingModule,
  ],
})
export class AppModule {}
