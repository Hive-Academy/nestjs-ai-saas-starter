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
  Neo4jConfidenceStorageAdapter,
  Neo4jFeedbackStorageAdapter,
  Neo4jApprovalChainStorageAdapter,
} from './adapters';

// Repositories
import { VectorMemoryRepository } from './repositories/chromadb/vector-memory.repository';

// Remove non-existent entity and repository imports for now

// LangGraph modules with proper streaming integration
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { TimeTravelModule } from '@hive-academy/langgraph-time-travel';
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
import { getTimeTravelConfig } from './config/time-travel.config';
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
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Core database modules - Enhanced with decorator and performance support
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...getChromaDBConfig(configService),
        // Enable new decorator-driven features
        decorators: {
          enabled: true,
          autoGenerate: true,
          typeValidation: true,
        },
        performance: {
          caching: true,
          monitoring: true,
          circuitBreaker: true,
        },
      }),
      inject: [ConfigService],
    }),

    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getNeo4jConfig(configService),
    }),

    // Memory module with enhanced adapters
    MemoryModule.forRoot({
      ...getMemoryConfig(),
      adapters: {
        vector: ChromaVectorAdapter,
        graph: Neo4jGraphAdapter, // Use enhanced adapter
      },
    }),

    // Checkpoint module with new adapter pattern
    LanggraphModulesCheckpointModule.forRootAsync({
      useFactory: async () => {
        const config = await getCheckpointConfig();
        return config;
      },
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

    // HITL module WITH CHECKPOINT AND MEMORY INTEGRATION - adapter injection
    HitlModule.forRootAsync({
      useFactory: async (
        checkpointAdapter: ICheckpointAdapter,
        memoryAdapter: IMemoryAdapter
      ) => ({
        ...getHitlConfig(),
        checkpointAdapter,
        memoryAdapter,
        adapters: {
          storage: Neo4jHitlStorageAdapter,
          interruptionStorage: Neo4jInterruptionStorageAdapter,
          confidenceStorage: Neo4jConfidenceStorageAdapter,
          feedbackStorage: Neo4jFeedbackStorageAdapter,
          approvalChainStorage: Neo4jApprovalChainStorageAdapter,
        },
      }),
      inject: ['ICheckpointAdapter', 'IMemoryAdapter'],
    }),

    // Workflow engine WITH STREAMING, CHECKPOINT, AND MEMORY - adapter injection
    WorkflowEngineModule.forRootAsync({
      useFactory: async (
        streamingAdapter: IStreamingService,
        checkpointAdapter: ICheckpointAdapter,
        memoryAdapter: IMemoryAdapter
      ): Promise<WorkflowEngineModuleOptions> => {
        return {
          ...getWorkflowEngineConfig(),
          streamingAdapter,
          checkpointAdapter,
          memoryAdapter,
        };
      },
      inject: ['IStreamingService', 'ICheckpointAdapter', 'IMemoryAdapter'],
    }),

    // Multi-agent module WITH STREAMING AND MEMORY - adapter injection
    MultiAgentModule.forRootAsync({
      useFactory: async (
        streamingAdapter: IStreamingService,
        checkpointAdapter: ICheckpointAdapter,
        memoryAdapter: IMemoryAdapter
      ) => {
        return {
          ...getMultiAgentConfig(),
          streamingAdapter,
          checkpointAdapter,
          memoryAdapter,
        };
      },
      inject: ['IStreamingService', 'ICheckpointAdapter', 'IMemoryAdapter'],
    }),

    // Functional API with STREAMING, CHECKPOINT, AND MEMORY - adapter injection
    FunctionalApiModule.forRootAsync({
      useFactory: async (
        streamingAdapter: IStreamingService,
        checkpointAdapter: ICheckpointAdapter,
        memoryAdapter: IMemoryAdapter
      ): Promise<any> => {
        return {
          ...getFunctionalApiConfig(),
          streamingAdapter,
          checkpointAdapter,
          memoryAdapter,
        };
      },
      inject: ['IStreamingService', 'ICheckpointAdapter', 'IMemoryAdapter'],
    }),

    // Monitoring module
    MonitoringModule.forRoot(getMonitoringConfig()),

    // Time-Travel module (dev/staging only by default) WITH CHECKPOINT AND MEMORY - adapter injection
    ...(process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_TIME_TRAVEL_PROD === 'true'
      ? [
          TimeTravelModule.forRootAsync({
            useFactory: async (
              checkpointAdapter: ICheckpointAdapter,
              memoryAdapter: IMemoryAdapter
            ) => ({
              ...getTimeTravelConfig(),
              checkpointAdapter,
              memoryAdapter,
            }),
            inject: ['ICheckpointAdapter', 'IMemoryAdapter'],
          }),
        ]
      : []),

    // Health checks
    TerminusModule.forRoot({
      logger: false,
      errorLogStyle: 'pretty',
    }),

    // Business modules
    BusinessWorkflowsModule,
  ],
  controllers: [HealthController],
  providers: [
    AppStreamingManager,

    // HITL Adapters
    Neo4jHitlStorageAdapter,
    Neo4jInterruptionStorageAdapter,
    Neo4jConfidenceStorageAdapter,
    Neo4jFeedbackStorageAdapter,
    Neo4jApprovalChainStorageAdapter,

    // Memory Adapters
    ChromaVectorAdapter,
    Neo4jGraphAdapter,

    // ChromaDB Repositories
    VectorMemoryRepository,
  ],
})
export class AppModule {}
