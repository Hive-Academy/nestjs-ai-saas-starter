> node dist/main.js

🔧 Encapsulated environment loaded: {
loadedFiles: [
'.env.chromadb',
'.env.neo4j',
'.env.llm',
'.env.platform',
'.env.app'
],
errors: []
}
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [NestFactory] Starting Nest application...
📦 Initializing SqliteSaver for development...
Database: ./data/checkpoints.db
✅ Checkpoint: SqliteSaver initialized (development)
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [CacheStore] CacheStore initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [NeogmaMetricsService] NeogmaMetricsService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ApprovalHistorySearchService] ApprovalHistorySearchService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HitlValidationService] ✅ HITL Validation Service initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HealthCheckService] Health check registered: memory
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HealthCheckService] Health check registered: cpu
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HealthCheckService] Health check registered: uptime
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [HealthCheckService] Default system health checks registered
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [DashboardService] Mock metric data initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [DashboardService] DashboardService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +8ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +1ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [AlertingService] AlertingService initialized with 30s evaluation interval. Metrics collection: disabled (fallback mode)
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] TerminusModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] DiscoveryModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [HitlNotificationService] Object(1) {
streamingAvailable: false
}
✅ Neo4j configuration validation passed
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ChromaCacheService] ChromaCacheService initialized with segregated services
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [EmbeddingService] Successfully initialized huggingface embedding provider
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] LanggraphModulesMonitoringModule dependencies initialized +11ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ChromaDBConnectionService] ChromaDB semaphore initialized: max 5 concurrent operations
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [LangGraphStoreRepository] LangGraphStoreRepository initialized with collection: langgraph-stores
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ChromaDBBaseStore] ChromaDBBaseStore initialized with repository pattern
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [WorkflowExecutionService] ✅ Checkpointer: SqliteSaver (LangGraph native)
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [WorkflowExecutionService] ✅ BaseStore available - nodes can access via RunnableConfig.store
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] MemoryModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] NeogmaModule dependencies initialized +89ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: ApprovalChain
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: ApprovalRequest
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: ApprovalResponse
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: InterruptionPoint
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: ConfidencePattern
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: FeedbackEntry
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: Developer
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [NeogmaService] Registered model: Achievement
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [NeogmaConnectionService] NeogmaConnectionService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +1ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] RepositoryModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] LangGraphAdaptersModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] LangGraphAdaptersModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [HitlTimeoutService] Object(2) {
storageAvailable: true,
notificationsAvailable: true
}
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [UserInterruptionService] UserInterruptionService initialized with Neo4j storage
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ApprovalChainService] 🔗 Approval Chain Service initialized with adapter-first storage
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [FeedbackProcessorService] 💬 Feedback Processor Service initialized with adapter-first storage
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ConfidenceEvaluatorService] 🧠 Confidence Evaluator Service initialized with adapter-first storage
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HitlApprovalRequestService] 📝 HITL Approval Request Service initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HumanApprovalService] 🎯 Human Approval Service initialized with specialized services
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] HitlModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [InstanceLoader] AppModule dependencies initialized +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RoutesResolver] HealthController {/api/health}: +40ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/health, GET} route +2ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +1ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +1ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +1ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RoutesResolver] DevBrandController {/api/devbrand}: +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [RouterExplorer] Mapped {/api/devbrand/execute, POST} route +0ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 24ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [UserInterruptionService] ✅ UserInterruptionService initialized (lazy-loading enabled - state loads when workflows resume)
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ApprovalChainService] ✅ ApprovalChainService initialized (lazy-loading enabled - chains load on-demand)
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [FeedbackProcessorService] ✅ FeedbackProcessorService initialized (lazy-loading enabled - feedback loads on-demand)
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HumanApprovalService] Human Approval Service initializing with specialized services
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ConfidenceEvaluatorService] ✅ ConfidenceEvaluatorService initialized (lazy-loading enabled - patterns load on-demand)
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ToolRegistryService] Registering 4 tool classes
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Processing 4 tools from GitHubIntegrationTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: github-analyzer from GitHubIntegrationTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: achievement-extractor from GitHubIntegrationTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: developer-insights from GitHubIntegrationTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: ai-synthesis from GitHubIntegrationTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Processing 3 tools from BrandStrategistTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: memory-analysis from BrandStrategistTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: brand-optimization from BrandStrategistTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: strategy-generation from BrandStrategistTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Processing 4 tools from WebResearchTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: web-search from WebResearchTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: news-search from WebResearchTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: social-profile-search from WebResearchTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: research-search from WebResearchTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Processing 5 tools from ContentCreatorTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: linkedin-formatter from ContentCreatorTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: devto-formatter from ContentCreatorTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: content-optimizer from ContentCreatorTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: quality-scorer from ContentCreatorTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM DEBUG [ToolRegistryService] Registered tool: engagement-predictor from ContentCreatorTools
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [ToolRegistryService] Tool registration completed in 6.8ms - Total tools: 16
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG [NestApplication] Nest application successfully started +10ms
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG 🔌 WebSocket streaming available at: ws://localhost:8080/streaming
[Nest] 30480 - 11/10/2025, 9:16:12 PM LOG 🌊 Frontend should connect to: ws://localhost:8080/streaming
[Nest] 30480 - 11/10/2025, 9:16:42 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 30480 - 11/10/2025, 9:17:12 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 30480 - 11/10/2025, 9:17:12 PM WARN [HealthCheckService] System health degraded:
[Nest] 30480 - 11/10/2025, 9:17:12 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 30480 - 11/10/2025, 9:17:12 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 30480 - 11/10/2025, 9:17:42 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 30480 - 11/10/2025, 9:18:12 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 30480 - 11/10/2025, 9:18:12 PM WARN [HealthCheckService] System health degraded:
[Nest] 30480 - 11/10/2025, 9:18:12 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 30480 - 11/10/2025, 9:18:12 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 30480 - 11/10/2025, 9:18:32 PM LOG [DevBrandController] 🚀 Starting DevBrand workflow for GitHub user: abdallah-khalil (executionId: devbrand-1762802312307)
[Nest] 30480 - 11/10/2025, 9:18:32 PM LOG [DevBrandSupervisorWorkflow] 🚀 Starting DevBrand workflow for user: anonymous, GitHub: abdallah-khalil
[Nest] 30480 - 11/10/2025, 9:18:32 PM DEBUG [WorkflowExecutionService] Executing multi-agent workflow with supervisor DevBrandSupervisorWorkflow and 3 agents
[Nest] 30480 - 11/10/2025, 9:18:32 PM DEBUG [MetadataProcessorService] Extracting workflow definition from DevBrandSupervisorWorkflow
[Nest] 30480 - 11/10/2025, 9:18:32 PM ERROR [DevBrandSupervisorWorkflow] Multi-agent coordination failed:
[Nest] 30480 - 11/10/2025, 9:18:32 PM ERROR [DevBrandSupervisorWorkflow] Error: No @Workflow decorator found on DevBrandSupervisorWorkflow
at MetadataProcessorService.extractWorkflowDefinition (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1168:13)
at WorkflowExecutionService.executeMultiAgentWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2858:50)
at DevBrandSupervisorWorkflow.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:101764)
at DevBrandController.startWorkflowInBackground (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:99271)
at DevBrandController.executeDevBrand (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:98488)
at D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\router\router-execution-context.js:38:29
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\router\router-execution-context.js:46:28
at async D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\router\router-proxy.js:9:17
[Nest] 30480 - 11/10/2025, 9:18:32 PM ERROR [DevBrandController] Workflow devbrand-1762802312307 failed:
[Nest] 30480 - 11/10/2025, 9:18:32 PM ERROR [DevBrandController] Error: DevBrand workflow failed: No @Workflow decorator found on DevBrandSupervisorWorkflow
at DevBrandSupervisorWorkflow.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:102767)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async DevBrandController.startWorkflowInBackground (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:99243)
