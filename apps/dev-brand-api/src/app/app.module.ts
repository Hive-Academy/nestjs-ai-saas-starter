import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core library imports
import {
  MemoryModule,
  MemoryModuleOptions,
  IThreadRegistryStore,
} from '@hive-academy/langgraph-memory';
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
  IApprovalChainStorageService,
  IConfidenceStorageService,
  IFeedbackStorageService,
  IHitlStorageService,
  IUserInterruptionStorageService,
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
import { AuthModule } from './auth/auth.module';
import { DevBrandController } from './controllers/devbrand.controller';
import { HealthController } from './controllers/health.controller';
import { PerformanceController } from './controllers/performance.controller';

// Performance monitoring
import { PerformanceDashboardService } from './services/performance-dashboard.service';

// Brand monitoring
import { BrandMonitoringService } from './services/brand-monitoring.service';

// Content Strategy Intelligence
import { ContentStrategyEngine } from './services/content-strategy-engine.service';

// Competitive Intelligence
import { CompetitiveIntelligenceService } from './services/competitive-intelligence.service';

// Tool classes for WorkflowEngineModule
import { ContentCreatorAgent } from './business-workflows/agents/content-creator/content-creator.agent';
import { GitHubCodeAnalyzerAgent } from './business-workflows/agents/github-code-analyzer/github-code-analyzer.agent';
import { PersonalBrandStrategistAgent } from './business-workflows/agents/personal-brand-strategist/personal-brand-strategist.agent';
import { ResearcherAgent } from './business-workflows/agents/researcher.agent';
import { PremiumStrategyAgent } from './business-workflows/agents/premium-strategy.agent';
import { PersonalBrandMemoryService } from './business-workflows/core';
import { BrandStrategistTools } from './business-workflows/core/tools/brand-strategist.tools';
import { ContentCreatorTools } from './business-workflows/core/tools/content-creator.tools';
import { FileOperationTools } from './business-workflows/core/tools/file-operation.tools';
import { GitHubIntegrationTools } from './business-workflows/core/tools/github-integration.tools';
import { WebResearchTools } from './business-workflows/core/tools/web-research.tools';
import { PremiumAnalyticsTool } from './business-workflows/tools/premium-analytics.tool';
import { ResearchChatController } from './business-workflows/controllers/research-chat.controller';

import { DevBrandChatWorkflow } from './business-workflows/workflows/devbrand-chat.workflow';
import { DevBrandSupervisorWorkflow } from './business-workflows/workflows/devbrand-supervisor.workflow';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Authentication Module - JWT with WorkOS
    AuthModule,

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

    // Memory module with BaseStore pattern and thread registry adapter
    MemoryModule.forRootAsync({
      imports: [LangGraphAdaptersModule],
      useFactory: async (
        threadRegistryAdapter: IThreadRegistryStore
      ): Promise<MemoryModuleOptions> => {
        return {
          ...getMemoryConfig(),
          threadRegistry: {
            adapter: threadRegistryAdapter, // Inject adapter instance via token
            defaultLimit: 50,
          },
        };
      },
      inject: ['THREAD_REGISTRY_ADAPTER'], // Inject via token from LangGraphAdaptersModule
    }),

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
            FileOperationTools,
            PremiumAnalyticsTool,
          ], // Register 6 tool class TYPES (not instances)
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
  controllers: [
    HealthController,
    PerformanceController,
    DevBrandController,
    ResearchChatController,
  ],
  providers: [
    PerformanceDashboardService,
    BrandMonitoringService,
    ContentStrategyEngine,
    CompetitiveIntelligenceService,

    // MVP Core Agents - Using new decorator architecture
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent, // Reference implementation with workflow-agent type
    ContentCreatorAgent,
    ResearcherAgent, // Standalone research agent with HITL
    PremiumStrategyAgent, // Premium tier agent

    // MVP Functional-API Workflows
    DevBrandSupervisorWorkflow, // Multi-agent coordination
    DevBrandChatWorkflow, // Chat interface workflow

    // Core Business Services
    PersonalBrandMemoryService, // ChromaDB + Neo4j integration (repositories injected from RepositoryModule)

    // MVP Tools - Kept per user request
    WebResearchTools, // Social media profile searching
    GitHubIntegrationTools, // GitHub API integration
    BrandStrategistTools, // Brand strategy and optimization tools
    ContentCreatorTools,
    FileOperationTools, // Local report management
    PremiumAnalyticsTool, // Premium tier tool
  ],
})
export class AppModule {}
