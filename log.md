NX Successfully ran target build for project dev-brand-api (4s)

npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

> @nestjs-ai-saas-starter/dev-brand-api@0.0.1 start
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
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [NestFactory] Starting Nest application...
📦 Initializing SqliteSaver for development...
Database: ./data/checkpoints.db
✅ Checkpoint: SqliteSaver initialized (development)
[Nest] 26668 - 11/11/2025, 12:45:37 AM DEBUG [CacheStore] CacheStore initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [NeogmaMetricsService] NeogmaMetricsService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [ApprovalHistorySearchService] ApprovalHistorySearchService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [HitlValidationService] ✅ HITL Validation Service initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [HealthCheckService] Health check registered: memory
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [HealthCheckService] Health check registered: cpu
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [HealthCheckService] Health check registered: uptime
[Nest] 26668 - 11/11/2025, 12:45:37 AM DEBUG [HealthCheckService] Default system health checks registered
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM DEBUG [DashboardService] Mock metric data initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [DashboardService] DashboardService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +7ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [AlertingService] AlertingService initialized with 30s evaluation interval. Metrics collection: disabled (fallback mode)
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] TerminusModule dependencies initialized +1ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] DiscoveryModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM DEBUG [HitlNotificationService] Object(1) {
streamingAvailable: false
}
✅ Neo4j configuration validation passed
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [ChromaCacheService] ChromaCacheService initialized with segregated services
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [EmbeddingService] Successfully initialized huggingface embedding provider
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] LanggraphModulesMonitoringModule dependencies initialized +13ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [ChromaDBConnectionService] ChromaDB semaphore initialized: max 5 concurrent operations
[Nest] 26668 - 11/11/2025, 12:45:37 AM DEBUG [LangGraphStoreRepository] LangGraphStoreRepository initialized with collection: langgraph-stores
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [ChromaDBBaseStore] ChromaDBBaseStore initialized with repository pattern
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [WorkflowExecutionService] ✅ Checkpointer: SqliteSaver (LangGraph native)
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [WorkflowExecutionService] ✅ BaseStore available - nodes can access via RunnableConfig.store
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] MemoryModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:37 AM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] NeogmaModule dependencies initialized +176ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: ApprovalChain
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: ApprovalRequest
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: ApprovalResponse
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: InterruptionPoint
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: ConfidencePattern
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: FeedbackEntry
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: Developer
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [NeogmaService] Registered model: Achievement
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [NeogmaConnectionService] NeogmaConnectionService initialized
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] RepositoryModule dependencies initialized +1ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] LangGraphAdaptersModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] LangGraphAdaptersModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [HitlTimeoutService] Object(2) {
storageAvailable: true,
notificationsAvailable: true
}
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [UserInterruptionService] UserInterruptionService initialized with Neo4j storage
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ApprovalChainService] 🔗 Approval Chain Service initialized with adapter-first storage
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [FeedbackProcessorService] 💬 Feedback Processor Service initialized with adapter-first storage
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ConfidenceEvaluatorService] 🧠 Confidence Evaluator Service initialized with adapter-first storage
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [HitlApprovalRequestService] 📝 HITL Approval Request Service initialized
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [HumanApprovalService] 🎯 Human Approval Service initialized with specialized services
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] HitlModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [InstanceLoader] AppModule dependencies initialized +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RoutesResolver] HealthController {/api/health}: +34ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/health, GET} route +2ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +1ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +1ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RoutesResolver] DevBrandController {/api/devbrand}: +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/devbrand/execute, POST} route +1ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RoutesResolver] ResearchChatController {/api/research}: +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/research/chat, POST} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/research/stream/:executionId, GET} route +1ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/research/approve/:executionId, POST} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/research/reports, GET} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [RouterExplorer] Mapped {/api/research/reports/:filename, GET} route +0ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 44ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [UserInterruptionService] ✅ UserInterruptionService initialized (lazy-loading enabled - state loads when workflows resume)
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ApprovalChainService] ✅ ApprovalChainService initialized (lazy-loading enabled - chains load on-demand)
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [FeedbackProcessorService] ✅ FeedbackProcessorService initialized (lazy-loading enabled - feedback loads on-demand)
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [HumanApprovalService] Human Approval Service initializing with specialized services
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ConfidenceEvaluatorService] ✅ ConfidenceEvaluatorService initialized (lazy-loading enabled - patterns load on-demand)
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ToolRegistryService] Registering 5 tool classes
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Processing 4 tools from GitHubIntegrationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: github-analyzer from GitHubIntegrationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: achievement-extractor from GitHubIntegrationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: developer-insights from GitHubIntegrationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: ai-synthesis from GitHubIntegrationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Processing 3 tools from BrandStrategistTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: memory-analysis from BrandStrategistTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: brand-optimization from BrandStrategistTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: strategy-generation from BrandStrategistTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Processing 4 tools from WebResearchTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: web-search from WebResearchTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: news-search from WebResearchTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: social-profile-search from WebResearchTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: research-search from WebResearchTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Processing 5 tools from ContentCreatorTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: linkedin-formatter from ContentCreatorTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: devto-formatter from ContentCreatorTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: content-optimizer from ContentCreatorTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: quality-scorer from ContentCreatorTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: engagement-predictor from ContentCreatorTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Processing 4 tools from FileOperationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: create-report from FileOperationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: save-report from FileOperationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: list-reports from FileOperationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM DEBUG [ToolRegistryService] Registered tool: read-report from FileOperationTools
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [ToolRegistryService] Tool registration completed in 6.1ms - Total tools: 20
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG [NestApplication] Nest application successfully started +7ms
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG 🔌 WebSocket streaming available at: ws://localhost:8080/streaming
[Nest] 26668 - 11/11/2025, 12:45:38 AM LOG 🌊 Frontend should connect to: ws://localhost:8080/streaming
[Nest] 26668 - 11/11/2025, 12:46:07 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:46:37 AM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 26668 - 11/11/2025, 12:46:37 AM WARN [HealthCheckService] System health degraded:
[Nest] 26668 - 11/11/2025, 12:46:37 AM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 26668 - 11/11/2025, 12:46:37 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:47:07 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:47:37 AM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 26668 - 11/11/2025, 12:47:37 AM WARN [HealthCheckService] System health degraded:
[Nest] 26668 - 11/11/2025, 12:47:37 AM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 26668 - 11/11/2025, 12:47:37 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:48:07 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:48:37 AM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 26668 - 11/11/2025, 12:48:37 AM WARN [HealthCheckService] System health degraded:
[Nest] 26668 - 11/11/2025, 12:48:37 AM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 26668 - 11/11/2025, 12:48:37 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:49:07 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 26668 - 11/11/2025, 12:49:13 AM LOG [ResearchChatController] 🚀 Starting research for query: "research angular signal forms and advanced usage for building dynamic formc ontrols and integrating with control value accessor"
[Nest] 26668 - 11/11/2025, 12:49:13 AM LOG [ResearchChatController] ✅ Research workflow started: research-1762814953873 - Connect to /api/research/stream/research-1762814953873
[Nest] 26668 - 11/11/2025, 12:49:13 AM LOG [ResearchChatController] 📡 SSE stream connected for research-1762814953873
[Nest] 26668 - 11/11/2025, 12:49:13 AM LOG [ResearcherAgent] Starting streaming research for query: "research angular signal forms and advanced usage for building dynamic formc ontrols and integrating with control value accessor" (execution: research-1762814953873)  
[Nest] 26668 - 11/11/2025, 12:49:13 AM DEBUG [WorkflowExecutionService] Streaming workflow from class ResearcherAgent
[Nest] 26668 - 11/11/2025, 12:49:13 AM DEBUG [MetadataProcessorService] Extracting workflow definition from ResearcherAgent
[Nest] 26668 - 11/11/2025, 12:49:13 AM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for ResearcherAgent
[Nest] 26668 - 11/11/2025, 12:49:13 AM DEBUG [MetadataProcessorService] Found 4 task-based nodes for workflow researcher-workflow
[Nest] 26668 - 11/11/2025, 12:49:13 AM LOG [MetadataProcessorService] Extracted task-based workflow metadata for researcher-workflow (edges will be built by WorkflowExecutionService)
[Nest] 26668 - 11/11/2025, 12:49:13 AM DEBUG [MetadataProcessorService] Validating workflow definition: researcher-workflow
[Nest] 26668 - 11/11/2025, 12:49:13 AM WARN [MetadataProcessorService] Unreachable nodes found: conductResearch, generateReportDraft, saveReport
[Nest] 26668 - 11/11/2025, 12:49:13 AM LOG [MetadataProcessorService] Workflow definition validation completed for researcher-workflow
[Nest] 26668 - 11/11/2025, 12:49:13 AM DEBUG [WorkflowExecutionService] Building StateGraph for workflow researcher-workflow with 4 nodes
[Nest] 26668 - 11/11/2025, 12:49:13 AM ERROR [ResearchChatController] ❌ Stream error for research-1762814953873:
Invalid StateGraph input. Make sure to pass a valid Annotation.Root or Zod schema.
