import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core library imports
import { MemoryModule } from '@hive-academy/langgraph-memory';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Adapters Module - Generic adapters from shared package
import { LangGraphAdaptersModule } from '@hive-academy/langgraph-adapters';

// Application-specific repositories
import { RepositoryModule } from './repositories/repository.module';

// Remove non-existent entity and repository imports for now

// LangGraph modules with proper streaming integration
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
import {
  WorkflowEngineModule,
  WorkflowEngineModuleOptions,
} from '@hive-academy/langgraph-workflow-engine';

import { getCheckpointSaver } from './config/checkpoint.config';
import { getChromaDBConfig } from './config/chromadb.config';
import { getHitlConfig } from './config/hitl.config';
import { getMemoryConfig } from './config/memory.config';
import { getMonitoringConfig } from './config/monitoring.config';
import { getNeo4jConfig } from './config/neo4j.config';
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

// Tool classes for WorkflowEngineModule
import { GitHubIntegrationTools } from './business-workflows/core/tools/github-integration.tools';
import { BrandStrategistTools } from './business-workflows/core/tools/brand-strategist.tools';
import { WebResearchTools } from './business-workflows/core/tools/web-research.tools';
import { ContentCreatorTools } from './business-workflows/core/tools/content-creator.tools';

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

    // Memory module with BaseStore pattern (ChromaDBBaseStore injected internally)
    MemoryModule.forRoot(getMemoryConfig()),

    // HITL module - Neo4j storage adapters (NO checkpoint injection needed)
    HitlModule.forRootAsync({
      imports: [LangGraphAdaptersModule],
      useFactory: async (
        hitlStorage: IHitlStorageService,
        interruptionStorage: IUserInterruptionStorageService,
        confidenceStorage: IConfidenceStorageService,
        feedbackStorage: IFeedbackStorageService,
        approvalChainStorage: IApprovalChainStorageService
      ): Promise<HitlModuleOptions> => ({
        ...getHitlConfig(),
        adapters: {
          storage: hitlStorage,
          interruptionStorage: interruptionStorage,
          confidenceStorage: confidenceStorage,
          feedbackStorage: feedbackStorage,
          approvalChainStorage: approvalChainStorage,
        },
      }),
      inject: [
        'HITL_STORAGE',
        'HITL_INTERRUPTION_STORAGE',
        'HITL_CONFIDENCE_STORAGE',
        'HITL_FEEDBACK_STORAGE',
        'HITL_APPROVAL_CHAIN_STORAGE',
      ],
    }),

    // Workflow engine with LangGraph native checkpoint (RedisSaver for production)
    WorkflowEngineModule.forRootAsync({
      useFactory: async (): Promise<WorkflowEngineModuleOptions> => {
        // Create LangGraph native checkpointer (RedisSaver/SqliteSaver/MemorySaver)
        const checkpointer = await getCheckpointSaver();

        return {
          ...getWorkflowEngineConfig(), // Includes LLM config from .env.llm
          checkpointer, // LangGraph BaseCheckpointSaver (not ICheckpointAdapter)
          tools: [
            GitHubIntegrationTools,
            BrandStrategistTools,
            WebResearchTools,
            ContentCreatorTools,
          ], // Register 4 tool class TYPES (not instances)
        };
      },
      inject: [], // No injection needed - we're passing class types directly
    }),

    // Monitoring module
    MonitoringModule.forRoot(getMonitoringConfig()),

    // NOTE: CheckpointModule removed - migrated to LangGraph native (RedisSaver/SqliteSaver)
    // NOTE: TimeTravelModule removed - package deleted in consolidation

    // Health checks
    TerminusModule.forRoot({
      logger: false,
      errorLogStyle: 'pretty',
    }),
  ],
  controllers: [HealthController, PerformanceController, DevBrandController],
  providers: [
    PerformanceDashboardService,
    BrandMonitoringService,
    ContentStrategyEngine,
    CompetitiveIntelligenceService,
    // All adapters are now provided by AdaptersModule
  ],
})
export class AppModule {}
