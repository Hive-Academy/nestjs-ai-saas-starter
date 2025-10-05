import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { Neo4jCrudService } from '@hive-academy/nestjs-neo4j';

// DevBrand Chat Studio MVP Components (Post-Legacy Cleanup)
import { GitHubCodeAnalyzerAgent } from './agents/github-code-analyzer/github-code-analyzer.agent';
import { PersonalBrandStrategistAgent } from './agents/personal-brand-strategist/personal-brand-strategist.agent';
import { ContentCreatorAgent } from './agents/content-creator/content-creator.agent';
import { DevBrandSupervisorWorkflow } from './workflows/devbrand-supervisor.workflow';
import { DevBrandChatWorkflow } from './workflows/devbrand-chat.workflow';
import { PersonalBrandMemoryService } from './core/memory/personal-brand-memory.service';
import { RepositoryModule } from '../repositories/repository.module';
import { WebResearchTools } from './core/tools/web-research.tools';
import { GitHubIntegrationTools } from './core/tools/github-integration.tools';

/**
 * DevBrand Chat Studio MVP Module - Post-Legacy Cleanup
 *
 * Streamlined module focused on DevBrand Chat Studio MVP requirements:
 * - 3 core agents (GitHub Analysis, Brand Strategy, Content Creation)
 * - 2 functional-api workflows (Supervisor, Chat)
 * - Real business logic with ChromaDB + Neo4j + LLM integration
 * - Web research tool for social media profile discovery
 */
@Module({
  imports: [
    ConfigModule, // For environment configuration
    WorkflowEngineModule, // Required for DeclarativeWorkflowBase services
    MultiAgentModule, // Required for Agent decorator services
    RepositoryModule, // Provides all repositories (ChromaDB + Neo4j)
  ],
  providers: [
    // Neo4j CRUD Service (Composition Pattern for Repositories)
    Neo4jCrudService,

    // MVP Core Agents - Using new decorator architecture
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent, // Reference implementation with workflow-agent type
    ContentCreatorAgent,

    // MVP Functional-API Workflows
    DevBrandSupervisorWorkflow, // Multi-agent coordination
    DevBrandChatWorkflow, // Chat interface workflow

    // Core Business Services
    PersonalBrandMemoryService, // ChromaDB + Neo4j integration (repositories injected from RepositoryModule)

    // MVP Tools - Kept per user request
    WebResearchTools, // Social media profile searching
    GitHubIntegrationTools, // GitHub API integration

    // DevBrand Configuration
    {
      provide: 'DEVBRAND_CONFIG',
      useFactory: (configService: ConfigService) => ({
        platforms: {
          linkedin: {
            enabled: configService.get('DEVBRAND_LINKEDIN_ENABLED', true),
            contentTypes: [
              'technical-insights',
              'career-updates',
              'thought-leadership',
            ],
          },
          devto: {
            enabled: configService.get('DEVBRAND_DEVTO_ENABLED', true),
            contentTypes: ['tutorials', 'case-studies', 'technology-reviews'],
          },
        },
        github: {
          analysisDepth: configService.get(
            'DEVBRAND_GITHUB_ANALYSIS_DEPTH',
            'detailed'
          ),
          timeframe: configService.get('DEVBRAND_GITHUB_TIMEFRAME', 'month'),
          includePrivate: configService.get(
            'DEVBRAND_GITHUB_INCLUDE_PRIVATE',
            false
          ),
        },
        memory: {
          namespace: 'devbrand-chat-studio',
          retentionDays: configService.get(
            'DEVBRAND_MEMORY_RETENTION_DAYS',
            90
          ),
          vectorCollection: 'personal_brand_knowledge',
        },
        llm: {
          model: configService.get('LLM_MODEL', 'gpt-4'),
          temperature: configService.get('LLM_TEMPERATURE', 0.7),
          maxTokens: configService.get('LLM_MAX_TOKENS', 1000),
          streaming: configService.get('LLM_STREAMING', true),
        },
      }),
      inject: [ConfigService],
    },
  ],
  controllers: [
    // No controllers in MVP - workflows are triggered via LangGraph
  ],
  exports: [
    // Export MVP components for other modules
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent,
    ContentCreatorAgent,
    DevBrandSupervisorWorkflow,
    DevBrandChatWorkflow,
    PersonalBrandMemoryService,
    WebResearchTools,
    GitHubIntegrationTools,
  ],
})
export class BusinessWorkflowsModule {
  // Module will be initialized automatically by NestJS
  // Services will initialize themselves as needed
}
