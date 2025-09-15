import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HitlModule } from '@hive-academy/langgraph-hitl';

// Customer Support System Components
import { CustomerSupportAgent } from './agents/customer-support.agent';
import { GitHubCodeAnalyzerAgent } from './agents/github-code-analyzer.agent';
import { PersonalBrandStrategistAgent } from './agents/personal-brand-strategist.agent';
import { ContentCreatorAgent } from './agents/content-creator.agent';
import { CustomerSupportWorkflow } from './workflows/customer-support.workflow';
import { EnhancedSupportWorkflow } from './workflows/enhanced-support.workflow';
import { CustomerSupportController } from './controllers/customer-support.controller';
import { BusinessMetricsService } from './services/business-metrics.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { CustomerSupportWorkflowService } from './services/customer-support-workflow.service';
import { TicketManagementService } from './services/ticket-management.service';
import { UserInterruptionManagementService } from './services/user-interruption-management.service';
import { MetricsAnalyticsService } from './services/metrics-analytics.service';
import { KnowledgeBaseManagementService } from './services/knowledge-base-management.service';
import { AgentRegistryService } from './core/agent-registry.service';
import { GithubActivityIntegrationService } from './core/integrations/github-activity.integration';
import { ContentAnalysisService } from './core/analysis/content-analysis.service';
import { PersonalBrandMemoryService } from './core/memory/personal-brand-memory.service';
import { DocumentProcessingTools } from './core/tools/document-processing.tools';
import { WebResearchTools } from './core/tools/web-research.tools';
// Showcase module fully removed; above imports are consolidated production equivalents

/**
 * Business Workflows Module
 * Uses services configured in the main app module
 * No duplicate configuration - follows proper NestJS module patterns
 */
@Module({
  imports: [
    // Only import ConfigModule for configuration access
    ConfigModule,
    // Import HitlModule to make HumanApprovalService available (no configuration needed as it's already configured in AppModule)
    HitlModule,
  ],
  providers: [
    // Core AI Agents
    CustomerSupportAgent,
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent,
    ContentCreatorAgent,

    // Workflow Orchestrators
    CustomerSupportWorkflow,
    EnhancedSupportWorkflow,

    // Business Services
    BusinessMetricsService,
    KnowledgeBaseService,
    CustomerSupportWorkflowService,

    // Controller Delegate Services - Added for SRP compliance
    TicketManagementService,
    UserInterruptionManagementService,
    MetricsAnalyticsService,
    KnowledgeBaseManagementService,
    AgentRegistryService,
    // Migrated services/tools formerly under showcase
    GithubActivityIntegrationService,
    ContentAnalysisService,
    PersonalBrandMemoryService,
    DocumentProcessingTools,
    WebResearchTools,

    // Configuration providers using proper config pattern
    {
      provide: 'CUSTOMER_SUPPORT_CONFIG',
      useFactory: (configService: ConfigService) => ({
        maxSimilarTickets: configService.get(
          'CUSTOMER_SUPPORT_MAX_SIMILAR_TICKETS',
          5
        ),
        sentimentThreshold: configService.get(
          'CUSTOMER_SUPPORT_SENTIMENT_THRESHOLD',
          -0.3
        ),
        escalationThreshold: configService.get(
          'CUSTOMER_SUPPORT_ESCALATION_THRESHOLD',
          0.8
        ),
        approvalRequired: {
          enterpriseCustomers: configService.get(
            'CUSTOMER_SUPPORT_APPROVAL_ENTERPRISE',
            true
          ),
          highValueTickets: configService.get(
            'CUSTOMER_SUPPORT_APPROVAL_HIGH_VALUE',
            true
          ),
          sentimentThreshold: configService.get(
            'CUSTOMER_SUPPORT_APPROVAL_SENTIMENT_THRESHOLD',
            -0.5
          ),
        },
        llmConfig: {
          model: configService.get('LLM_MODEL', 'gpt-4'),
          temperature: configService.get('LLM_TEMPERATURE', 0.7),
          maxTokens: configService.get('LLM_MAX_TOKENS', 1000),
          streaming: configService.get('LLM_STREAMING', true),
        },
        vectorSearch: {
          collection: 'support_knowledge_base',
          similarityThreshold: configService.get(
            'VECTOR_SIMILARITY_THRESHOLD',
            0.7
          ),
          maxResults: configService.get('VECTOR_MAX_RESULTS', 5),
        },
      }),
      inject: [ConfigService],
    },
  ],
  controllers: [
    // REST API Controllers - RE-ENABLED AFTER DI METADATA FIX
    CustomerSupportController,
  ],
  exports: [
    // Export key services for use in other modules
    CustomerSupportAgent, // RE-ENABLED AFTER DI METADATA FIX
    CustomerSupportWorkflow, // Functional-API pattern
    EnhancedSupportWorkflow, // Multi-agent orchestration pattern
    BusinessMetricsService,
    KnowledgeBaseService,
    CustomerSupportWorkflowService,
  ],
})
export class BusinessWorkflowsModule {
  // Module will be initialized automatically by NestJS
  // Services will initialize themselves as needed
}
