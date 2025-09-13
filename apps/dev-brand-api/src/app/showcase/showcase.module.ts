import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { StreamingServiceAdapter } from '@hive-academy/langgraph-streaming';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// 🎯 DEVBRAND CHAT STUDIO - Real Business Agents
// Transforms developer code contributions into personal brand content

// Business-Focused Agents
import { GitHubCodeAnalyzerAgent } from './agents/research-showcase.agent'; // Transformed from ResearchShowcaseAgent
import { PersonalBrandStrategistAgent } from './agents/analysis-showcase.agent'; // Transformed from AnalysisShowcaseAgent  
import { ContentCreatorAgent } from './agents/content-showcase.agent'; // Transformed from ContentShowcaseAgent

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

// Controller
import { ShowcaseController } from './controllers/showcase.controller';

@Module({
  imports: [
    // ADVANCED STREAMING AND MEMORY INTEGRATION
    MultiAgentModule.forRootAsync({
      useFactory: async (streamingAdapter: StreamingServiceAdapter) => ({
        streamingAdapter,  // Real-time streaming for DevBrand Chat Studio
        enableStreaming: true,
        enableProgress: true,
        enableTokenStreaming: true,
      }),
      inject: [StreamingServiceAdapter],
    }),
    
    // MEMORY SYSTEM INTEGRATION for Personal Branding
    ChromaDBModule.forRootAsync({
      useFactory: () => ({
        path: process.env.CHROMADB_URL || 'http://localhost:8000',
        // Collections will be created automatically by PersonalBrandMemoryService
      })
    }),
    
    Neo4jModule.forRootAsync({
      useFactory: () => ({
        scheme: 'bolt',
        host: process.env.NEO4J_HOST || 'localhost',
        port: process.env.NEO4J_PORT || 7687,
        username: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password',
        database: process.env.NEO4J_DATABASE || 'neo4j',
      })
    }),
  ],
  providers: [
    // 🤖 BUSINESS-FOCUSED AGENTS - DevBrand Chat Studio
    GitHubCodeAnalyzerAgent,      // Analyzes GitHub repos → achievements  
    PersonalBrandStrategistAgent, // Creates brand strategy from code analysis
    ContentCreatorAgent,          // Generates LinkedIn + Dev.to content
    
    // 🧠 MEMORY & INTELLIGENCE SERVICES
    PersonalBrandMemoryService,   // ChromaDB + Neo4j for personalized branding
    
    // 📊 SUPPORTING SERVICES  
    ShowcaseCoordinatorService,   // Multi-agent workflow coordination
    ShowcaseMetricsService,       // Business metrics and performance tracking
    ShowcaseAnalysisService,      // Advanced analysis capabilities
    ShowcaseContentService,       // Content optimization and management
    ShowcaseQualityService,       // Quality assurance and scoring
    ShowcaseNetworkService,       // Network and integration management
    
    // 🔧 BUSINESS TOOLS
    GitHubIntegrationTools,       // GitHub API analysis and achievement extraction
    ShowcaseSearchTools,          // Tavily search for tech trend research
  ],
  controllers: [ShowcaseController],
  exports: [
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
  ],
})
export class ShowcaseModule {}
