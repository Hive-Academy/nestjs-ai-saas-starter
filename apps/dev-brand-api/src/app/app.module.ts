import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core library imports
import {
  IGraphService,
  IVectorService,
  MemoryModule,
  MemoryModuleOptions,
} from '@hive-academy/langgraph-memory';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Adapters Module - Generic adapters from shared package
import { LangGraphAdaptersModule } from '@hive-academy/langgraph-adapters';

// Application-specific repositories
import { RepositoryModule } from './repositories/repository.module';

// Remove non-existent entity and repository imports for now

// LangGraph modules with proper streaming integration
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
import {
  HitlModule,
  HitlModuleOptions,
  IHitlStorageService,
  IUserInterruptionStorageService,
  IConfidenceStorageService,
  IFeedbackStorageService,
  IApprovalChainStorageService,
} from '@hive-academy/langgraph-hitl';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { TimeTravelModule } from '@hive-academy/langgraph-time-travel';
import {
  WorkflowEngineModule,
  WorkflowEngineModuleOptions,
} from '@hive-academy/langgraph-workflow-engine';

import { getCheckpointConfig } from './config/checkpoint.config';
import { getChromaDBConfig } from './config/chromadb.config';
import { getHitlConfig } from './config/hitl.config';
import { getMemoryConfig } from './config/memory.config';
import { getMonitoringConfig } from './config/monitoring.config';
import { getNeo4jConfig } from './config/neo4j.config';
import { getStreamingConfig } from './config/streaming.config';
import { getTimeTravelConfig } from './config/time-travel.config';
import { getWorkflowEngineConfig } from './config/workflow-engine.config';

// Health check
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { PerformanceController } from './controllers/performance.controller';
import { DevBrandController } from './controllers/devbrand.controller';

// Performance monitoring
import { PerformanceDashboardService } from './services/performance-dashboard.service';

// Brand monitoring
import { BrandMonitoringService } from './services/brand-monitoring.service';

// Content Strategy Intelligence
import { ContentStrategyEngine } from './services/content-strategy-engine.service';

// Competitive Intelligence
import { CompetitiveIntelligenceService } from './services/competitive-intelligence.service';

// Business modules
import { BusinessWorkflowsModule } from './business-workflows/business-workflows.module';

// App streaming manager
import { AppStreamingManager } from './services/app-streaming-manager.service';

// Core interface for adapter pattern
import {
  ICheckpointAdapter,
  IMemoryAdapter,
  IStreamingService,
} from '@hive-academy/langgraph-core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // CRITICAL: Global EventEmitter - provided once for entire app
    // Increased maxListeners from 10 to 20 to prevent false-positive warnings
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
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

    // Generic adapters from shared package
    LangGraphAdaptersModule.forRoot(),

    // Application-specific repositories (analytics and business domain)
    RepositoryModule,

    // Memory module with adapters - injects tokens from LangGraphAdaptersModule
    MemoryModule.forRootAsync({
      imports: [LangGraphAdaptersModule], // Import to access exported adapter tokens
      useFactory: async (
        vectorAdapter: IVectorService,
        graphAdapter: IGraphService
      ): Promise<MemoryModuleOptions> => ({
        ...getMemoryConfig(),
        adapters: {
          vector: vectorAdapter,
          graph: graphAdapter,
        },
      }),
      inject: ['IVectorService', 'IGraphService'],
    }),

    // Checkpoint module with new adapter pattern
    CheckpointModule.forRootAsync({
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
      imports: [LangGraphAdaptersModule], // Import to access HITL adapter tokens
      useFactory: async (
        checkpointAdapter: ICheckpointAdapter,
        memoryAdapter: IMemoryAdapter,
        hitlStorage: IHitlStorageService,
        interruptionStorage: IUserInterruptionStorageService,
        confidenceStorage: IConfidenceStorageService,
        feedbackStorage: IFeedbackStorageService,
        approvalChainStorage: IApprovalChainStorageService
      ): Promise<HitlModuleOptions> => ({
        ...getHitlConfig(),
        checkpointAdapter,
        memoryAdapter,
        adapters: {
          storage: hitlStorage,
          interruptionStorage: interruptionStorage,
          confidenceStorage: confidenceStorage,
          feedbackStorage: feedbackStorage,
          approvalChainStorage: approvalChainStorage,
        },
      }),
      inject: [
        'ICheckpointAdapter',
        'IMemoryAdapter',
        'HITL_STORAGE',
        'HITL_INTERRUPTION_STORAGE',
        'HITL_CONFIDENCE_STORAGE',
        'HITL_FEEDBACK_STORAGE',
        'HITL_APPROVAL_CHAIN_STORAGE',
      ],
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
    // MultiAgentModule.forRootAsync({
    //   useFactory: async (
    //     streamingAdapter: IStreamingService,
    //     checkpointAdapter: ICheckpointAdapter,
    //     memoryAdapter: IMemoryAdapter
    //   ) => {
    //     return {
    //       ...getMultiAgentConfig(),
    //       streamingAdapter,
    //       checkpointAdapter,
    //       memoryAdapter,
    //     };
    //   },
    //   inject: ['IStreamingService', 'ICheckpointAdapter', 'IMemoryAdapter'],
    // }),

    // Functional API with STREAMING, CHECKPOINT, AND MEMORY - adapter injection
    // FunctionalApiModule.forRootAsync({
    //   useFactory: async (
    //     streamingAdapter: IStreamingService,
    //     checkpointAdapter: ICheckpointAdapter,
    //     memoryAdapter: IMemoryAdapter
    //   ): Promise<any> => {
    //     return {
    //       ...getFunctionalApiConfig(),
    //       streamingAdapter,
    //       checkpointAdapter,
    //       memoryAdapter,
    //     };
    //   },
    //   inject: ['IStreamingService', 'ICheckpointAdapter', 'IMemoryAdapter'],
    // }),

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
  controllers: [HealthController, PerformanceController, DevBrandController],
  providers: [
    AppStreamingManager,
    PerformanceDashboardService,
    BrandMonitoringService,
    ContentStrategyEngine,
    CompetitiveIntelligenceService,
    // All adapters are now provided by AdaptersModule
  ],
})
export class AppModule {}
