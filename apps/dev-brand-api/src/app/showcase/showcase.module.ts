import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// 🎯 DEVBRAND CHAT STUDIO - Real Business Agents
// Transforms developer code contributions into personal brand content

// Business-Focused Agents
import { GitHubCodeAnalyzerAgent } from './agents/research-showcase.agent'; // Transformed from ResearchShowcaseAgent
import { PersonalBrandStrategistAgent } from './agents/analysis-showcase.agent'; // Transformed from AnalysisShowcaseAgent
import { ContentCreatorAgent } from './agents/content-showcase.agent'; // Transformed from ContentShowcaseAgent

// Workflow Orchestrators
import { SupervisorShowcaseWorkflow } from './workflows/supervisor-showcase.workflow';
import { SwarmShowcaseWorkflow } from './workflows/swarm-showcase.workflow';

// Business Services
import { PersonalBrandMemoryService } from './services/personal-brand-memory.service';
import { ShowcaseCoordinatorService } from './services/showcase-coordinator.service';
import { ShowcaseMetricsService } from './services/showcase-metrics.service';
import { ShowcaseAnalysisService } from './services/showcase-analysis.service';
import { ShowcaseContentService } from './services/showcase-content.service';
import { ShowcaseQualityService } from './services/showcase-quality.service';
import { ShowcaseNetworkService } from './services/showcase-network.service';

// Business Tools
import { GitHubIntegrationTools } from './tools/github-integration.tools';
import { ShowcaseSearchTools } from './tools/showcase-search.tools';
import { ShowcaseAnalysisTools } from './tools/showcase-analysis.tools';
import { ShowcaseIntegrationTools } from './tools/showcase-integration.tools';

// Controller
import { ShowcaseController } from './controllers/showcase.controller';

@Module({
  imports: [
    // Import modules WITHOUT forRoot() since they're already configured in AppModule
    MultiAgentModule, // Provides LlmProviderService, MultiAgentCoordinatorService
    ChromaDBModule, // Provides ChromaDBService
    Neo4jModule, // Provides Neo4jService
  ],
  providers: [
    // 🤖 BUSINESS-FOCUSED AGENTS - DevBrand Chat Studio
    GitHubCodeAnalyzerAgent, // Analyzes GitHub repos → achievements
    PersonalBrandStrategistAgent, // Creates brand strategy from code analysis
    ContentCreatorAgent, // Generates LinkedIn + Dev.to content

    // 🔀 WORKFLOW ORCHESTRATORS - Now registered as providers after DI fix
    SupervisorShowcaseWorkflow, // Multi-agent supervisor coordination
    SwarmShowcaseWorkflow, // Swarm-based collaborative workflow

    // 🧠 MEMORY & INTELLIGENCE SERVICES
    PersonalBrandMemoryService, // ChromaDB + Neo4j for personalized branding

    // 📊 SUPPORTING SERVICES
    ShowcaseCoordinatorService, // Multi-agent workflow coordination
    ShowcaseMetricsService, // Business metrics and performance tracking
    ShowcaseAnalysisService, // Advanced analysis capabilities
    ShowcaseContentService, // Content optimization and management
    ShowcaseQualityService, // Quality assurance and scoring
    ShowcaseNetworkService, // Network and integration management

    // 🔧 BUSINESS TOOLS
    GitHubIntegrationTools, // GitHub API analysis and achievement extraction
    ShowcaseSearchTools, // Tavily search for tech trend research
    ShowcaseAnalysisTools, // Advanced analysis and processing tools
    ShowcaseIntegrationTools, // Integration and automation tools
  ],
  controllers: [ShowcaseController],
  exports: [
    // Export business agents for use by other modules
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent,
    ContentCreatorAgent,

    // Export workflow orchestrators for use by other modules
    SupervisorShowcaseWorkflow,
    SwarmShowcaseWorkflow,

    // Export business services for use by other modules
    PersonalBrandMemoryService,
    GitHubIntegrationTools,
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
    ShowcaseAnalysisService,
    ShowcaseContentService,
    ShowcaseQualityService,
    ShowcaseNetworkService,
    ShowcaseSearchTools,
    ShowcaseAnalysisTools,
    ShowcaseIntegrationTools,
  ],
})
export class ShowcaseModule {}
