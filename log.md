npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

> @nestjs-ai-saas-starter/dev-brand-api@0.0.1 start
> node dist/main.js

🔧 Encapsulated environment loaded: {
  loadedFiles: [
    '.env.app',
    '.env.platform',
    '.env.llm',
    '.env.neo4j',
    '.env.chromadb'
  ],
  errors: []
}
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [NestFactory] Starting Nest application...
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [AlertingService] AlertingService initialized with 30s evaluation interval
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [HealthCheckService] Health check registered: memory
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [HealthCheckService] Health check registered: cpu  
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [HealthCheckService] Health check registered: uptime
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [HealthCheckService] Default system health checks registered
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [DashboardService] Mock metric data initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [DashboardService] DashboardService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [WorkflowRegistryService] WorkflowRegistryService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +5ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] TerminusModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] DiscoveryModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +22ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] LanggraphModulesMonitoringModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [EmbeddingService] Initialized huggingface embedding provider
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] AppModule dependencies initialized +10ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [Neo4jGraphAdapter] Neo4jGraphAdapter initialized with Neo4jService
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with Neo4jService
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] Neo4jModule dependencies initialized +3ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [StreamingServiceAdapter] StreamingServiceAdapter initialized with full DI integration
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] LanggraphModulesCheckpointModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [HitlNotificationService] Object(1) {
  streamingAvailable: true
}
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] StreamingModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [HitlTimeoutService] Object(2) {
  storageAvailable: true,
  notificationsAvailable: true
}
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] FunctionalApiModule dependencies initialized +2ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] HitlModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [MultiAgentCoordinatorService] Streaming service available:
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [MultiAgentCoordinatorService] true
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [WorkflowManagerService] WorkflowManagerService initialized
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] MultiAgentModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [ChromaVectorAdapter] ChromaVectorAdapter initialized with ChromaDBService
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] ChromaDBModule dependencies initialized +4ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [MemoryGraphService] MemoryGraphService initialized with configuration
[Nest] 10100  - 09/15/2025, 9:04:00 PM   DEBUG [MemoryGraphService] Object(2) {
  neo4jDatabase: 'neo4j',
  enableAutoSummarization: false
}
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] MemoryModule dependencies initialized +7ms
[Nest] 10100  - 09/15/2025, 9:04:00 PM     LOG [InstanceLoader] BusinessWorkflowsModule dependencies initialized +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RoutesResolver] HealthController {/api/health}: +420ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/health, GET} route +3ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RoutesResolver] CustomerSupportController {/api/customer-support}: +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/tickets, POST} route +2ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/tickets/streaming, POST} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/tickets/:ticketId, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/workflows/status/:ticketId, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/tickets/:ticketId/stream, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/tickets/:ticketId/approve, PUT} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/admin/tickets, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/interruptions/question, POST} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/interruptions/clarification, POST} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/interruptions/:interruptionId/respond, PUT} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/interruptions/:executionId, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/interruptions/:interruptionId/cancel, PUT} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/interruptions/dynamic, POST} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/workflows/:executionId/inject-input, POST} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/metrics, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/metrics/business-impact, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/customers/:customerId/metrics, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/metrics/stream, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/analytics/dashboard, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/analytics/trends, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/analytics/agents, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/search, POST} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/analytics, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/articles/:articleId/feedback, PUT} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/admin/knowledge-base/seed, POST} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/stats, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/popular, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/review-queue, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/suggestions, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/knowledge-base/content-gaps, GET} route +1ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [RouterExplorer] Mapped {/api/customer-support/agents, GET} route +0ms
[Nest] 10100  - 09/15/2025, 9:04:01 PM     LOG [Neo4jConnectionService] Successfully connected to Neo4j database
[Nest] 10100  - 09/15/2025, 9:04:01 PM   DEBUG [CheckpointSaverFactory] Creating checkpoint saver of type: memory
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [CheckpointSaverFactory] Memory checkpoint saver created successfully
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointRegistryService] Set default checkpoint saver: default
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointRegistryService] Registered checkpoint saver: default (default)
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointManagerService] Initialized memory checkpoint saver: default
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointManagerService] Checkpoint system initialized with 1 saver(s)
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointCleanupService] Checkpoint cleanup scheduler started (interval: 300000ms)
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointHealthService] Health monitoring started (interval: 30000ms)
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [CheckpointManagerService] Checkpoint background services started: cleanup, health monitoring
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [TokenStreamingService] Initializing TokenStreamingService
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [WebSocketBridgeService] Initializing WebSocketBridgeService
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [ConfidenceEvaluatorService] Confidence Evaluator Service initialized
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ConfidenceEvaluatorService] Loaded 2 historical patterns
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [HumanApprovalService] Human Approval Service initialized
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [WorkflowStreamService] Initializing WorkflowStreamService
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [MultiAgentCoordinatorService] Multi-agent coordinator service initialized with SOLID architecture
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [LlmProviderService] Creating new LLM instance: moonshotai/kimi-k2:free
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [LlmProviderService] Creating OpenRouter LLM with model: moonshotai/kimi-k2:free
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [MultiAgentModuleInitializer] Initializing MultiAgent module with explicit registration
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [ToolRegistrationService] Registering 2 tool providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistryService] Registered tool: summarizeDocument
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistrationService] Registered tool: summarizeDocument from DocumentProcessingTools.summarizeDocument
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistryService] Registered tool: extractEntities
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistrationService] Registered tool: extractEntities from DocumentProcessingTools.extractEntities
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistryService] Registered tool: webSearch
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistrationService] Registered tool: webSearch from WebResearchTools.webSearch
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistryService] Registered tool: newsSearch  
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistrationService] Registered tool: newsSearch from WebResearchTools.newsSearch
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistryService] Registered tool: researchSearch
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [ToolRegistrationService] Registered tool: researchSearch from WebResearchTools.researchSearch
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [ToolRegistrationService] Successfully registered 2 tool providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [MultiAgentModuleInitializer] Registered 5 tools from 2 providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [AgentRegistrationService] Registering 4 agent providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [AgentRegistrationService] Registered agent: personal-brand-strategist (Personal Brand Strategist) from PersonalBrandStrategistAgent
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [AgentRegistrationService] Registered agent: content-creator (Content Creator) from ContentCreatorAgent
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [AgentRegistrationService] Registered agent: github-code-analyzer (GitHub Code Analyzer) from GitHubCodeAnalyzerAgent
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [AgentRegistryService] Registered agent: customer-support-specialist (Customer Support AI Specialist)
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [AgentRegistrationService] Registered agent: customer-support-specialist (Customer Support AI Specialist) from CustomerSupportAgent
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [AgentRegistrationService] Successfully registered 4 agent providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [MultiAgentModuleInitializer] Registered 4 agents from 4 providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [WorkflowManagerService] Registering 1 workflow providers
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [WorkflowRegistryService] Workflow definition 'enhanced-support-orchestration' validated successfully
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [WorkflowRegistryService] Workflow 'enhanced-support-orchestration' (Enhanced Support Orchestration) registered successfully
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [WorkflowRegistryService] Workflow provider for 'enhanced-support-orchestration' registered successfully
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [WorkflowManagerService] Workflow provider registration completed: 1 successful, 0 failed
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [WorkflowManagerService] Total workflows available: 1 (enhanced-support-orchestration)
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [MultiAgentModuleInitializer] Registered 1 workflows
[Nest] 10100  - 09/15/2025, 9:04:02 PM     LOG [MultiAgentModuleInitializer] MultiAgent module initialization completed successfully
[Nest] 10100  - 09/15/2025, 9:04:02 PM   DEBUG [WebSocketBridgeService] Token stream integration setup completed
[Nest] 10100  - 09/15/2025, 9:04:30 PM   DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 10100  - 09/15/2025, 9:04:32 PM   DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 10100  - 09/15/2025, 9:04:32 PM   DEBUG [CheckpointHealthService] Health check for default: healthy (2ms)
[Nest] 10100  - 09/15/2025, 9:05:00 PM   DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 10100  - 09/15/2025, 9:05:00 PM   DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 10100  - 09/15/2025, 9:05:00 PM    WARN [HealthCheckService] System health degraded:
[Nest] 10100  - 09/15/2025, 9:05:00 PM    WARN [HealthCheckService] Object(2) {
  overall: 'unhealthy',
  unhealthyServices: [
    {
      name: 'memory',
      state: 'unhealthy',
      error: undefined
    }
  ]
}
[Nest] 10100  - 09/15/2025, 9:05:02 PM   DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 10100  - 09/15/2025, 9:05:02 PM   DEBUG [CheckpointHealthService] Health check for default: healthy (1ms)
