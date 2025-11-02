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
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [NestFactory] Starting Nest application...
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [CacheStore] CacheStore initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [NeogmaMetricsService] NeogmaMetricsService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentMemoryStatsService] AgentMemoryStatsService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HitlValidationService] ✅ HITL Validation Service initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowMetricsService] WorkflowMetricsService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HealthCheckService] Health check registered: memory
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HealthCheckService] Health check registered: cpu
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HealthCheckService] Health check registered: uptime
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [HealthCheckService] Default system health checks registered
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [DashboardService] Mock metric data initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [DashboardService] DashboardService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [CheckpointSaverRegistry] Set 'primary' as default checkpoint saver
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [CheckpointSaverRegistry] Registered checkpoint saver: primary
✅ Checkpoint saver registered: sqlite (provided by user)
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +3ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +1ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] ConfigHostModule dependencies initialized +2ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] TerminusModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] DiscoveryModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AlertingService] AlertingService initialized with 30s evaluation interval. Metrics collection: disabled (fallback mode)
✅ Neo4j configuration validation passed
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ChromaCacheService] ChromaCacheService initialized with segregated services
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowRegistryService] WorkflowRegistryService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowRegistryService] Agent event listeners setup completed
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [EmbeddingService] Successfully initialized huggingface embedding provider
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] LanggraphModulesMonitoringModule dependencies initialized +10ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HitlCheckpointService] 💾 HITL Checkpoint Service initialized with adapter-first storage
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WorkflowCheckpointService] Workflow checkpoint service initialized. Enabled: true
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] CheckpointModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowStreamingService] WorkflowStreamingService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowStreamingService] Streaming service available for workflow operations
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [HitlNotificationService] Object(1) {
streamingAvailable: true
}
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] StreamingModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] StreamingModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ChromaDBConnectionService] ChromaDB semaphore initialized: max 5 concurrent operations
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LangGraphStoreRepository] LangGraphStoreRepository initialized with collection: langgraph-stores
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ChromaVectorAdapter] ChromaVectorAdapter initialized with VectorMemoryRepository + LangGraphStoreRepository (dual-collection pattern)
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +1ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] NeogmaModule dependencies initialized +145ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: Memory
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: StoreItem
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: ApprovalChain
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: ApprovalRequest
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: InterruptionPoint
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: ConfidencePattern
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: FeedbackEntry
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: Developer
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NeogmaService] Registered model: Achievement
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [NeogmaConnectionService] NeogmaConnectionService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [StoreGraphRepository] StoreGraphRepository initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MemoryGraphRepository] MemoryGraphRepository initialized with composition pattern
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [Neo4jGraphAdapter] Neo4jGraphAdapter initialized with MemoryGraphRepository
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentMemoryCoreService] AgentMemoryCoreService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentMemoryCheckpointService] AgentMemoryCheckpointService initialized with full capabilities (checkpoint + vector + graph)
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] RepositoryModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentMemoryContextService] AgentMemoryContextService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MemoryGraphService] MemoryGraphService initialized with configuration
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MemoryGraphService] Object(2) {
neo4jDatabase: 'neo4j',
enableAutoSummarization: false
}
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] AdaptersModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentMemoryBridgeService] AgentMemoryBridge initialized (orchestrator pattern) with specialized services
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [BackgroundMemoryService] BackgroundMemoryService initialized with automatic flushing
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HitlMemoryLearningService] 🧠 HITL Memory Learning Service initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] MemoryModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MemoryCoordinationService] Memory adapter available - memory superpowers enabled
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MemoryCoordinationService] BackgroundMemoryService available - using batched async writes
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [HitlTimeoutService] Object(2) {
storageAvailable: true,
notificationsAvailable: true
}
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HitlRecoveryService] 🔧 HITL Recovery Service initialized with persistent storage
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [UserInterruptionService] ✅ Memory adapter available for interruption pattern learning
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ApprovalChainService] 🔗 Approval Chain Service initialized with adapter-first storage + IMemoryAdapter.getStore() for hierarchical tracking
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [FeedbackProcessorService] 💬 Feedback Processor Service initialized with adapter-first storage
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ConfidenceEvaluatorService] 🧠 Confidence Evaluator Service initialized with adapter-first storage
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] TimeTravelModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HitlApprovalRequestService] 📝 HITL Approval Request Service initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HumanApprovalService] 🎯 Human Approval Service initialized with specialized services
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] HitlModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [StreamCoordinationService] Streaming service available:
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [StreamCoordinationService] true
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MultiAgentCoordinatorService] Memory adapter available - memory superpowers enabled
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowCheckpointService] WorkflowCheckpointService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WorkflowCheckpointService] Checkpoint adapter available - checkpoint operations enabled
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowInstanceService] WorkflowInstanceService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowInstanceService] Tool registry available with 0 registered tools
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] BusinessWorkflowsModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] AppModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WorkflowExecutionService] Checkpoint service available - automatic checkpointing enabled
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowManagerService] WorkflowManagerService initialized with specialized services
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RoutesResolver] HealthController {/api/health}: +31ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/health, GET} route +2ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +1ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +1ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RoutesResolver] DevBrandController {/api/devbrand}: +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [RouterExplorer] Mapped {/api/devbrand/execute, POST} route +0ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 37ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [CheckpointManagerService] ✅ Checkpoint system initialized with 1 saver(s): primary
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [CheckpointCleanupService] Checkpoint cleanup scheduler started (interval: 3600000ms)
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [CheckpointHealthService] Health monitoring started (interval: 30000ms)
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [CheckpointManagerService] Checkpoint background services started: cleanup, health monitoring
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ApprovalChainService] ✅ Recovered 0 requests and 0 chains
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ApprovalChainService] ✅ Approval Chain Service initialized
[Safe] getAllApprovalPatterns - Completed successfully in 11ms
[Safe] getAllActivePatterns - Completed successfully in 12ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ConfidenceEvaluatorService] ✅ Loaded 0 patterns and 0 history entries from persistent storage
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ConfidenceEvaluatorService] ✅ Confidence Evaluator Service initialized with storage adapter
[Safe] getUnprocessedFeedback - Completed successfully in 11ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [FeedbackProcessorService] 🔄 Starting processing pipeline for 0 unprocessed feedback entries
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [FeedbackProcessorService] ✅ Feedback Processor Service initialized
[Safe] getPendingApprovals - Completed successfully in 204ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HitlRecoveryService] ✅ No pending approvals found to recover
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WorkflowStreamService] Initializing WorkflowStreamService
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WorkflowStreamService] Checkpoint adapter available: true
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MultiAgentCoordinatorService] Multi-agent coordinator service initialized with SOLID architecture
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ToolRegistrationService] Auto-registering 3 tool providers from module config
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ToolRegistrationService] Registering 3 tool providers
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: web-search
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: web-search from WebResearchTools.webSearch
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: news-search
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: news-search from WebResearchTools.newsSearch
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: social-profile-search
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: social-profile-search from WebResearchTools.searchSocialProfiles
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: research-search
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: research-search from WebResearchTools.researchSearch
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: github-analyzer
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: github-analyzer from GitHubIntegrationTools.analyzeGitHubActivity
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: achievement-extractor
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: achievement-extractor from GitHubIntegrationTools.extractAchievements
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: developer-insights
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: developer-insights from GitHubIntegrationTools.generateDeveloperInsights
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: ai-synthesis
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: ai-synthesis from GitHubIntegrationTools.synthesizeInsights
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: memory-analysis
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: memory-analysis from BrandStrategistTools.analyzeMemory
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: brand-optimization
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: brand-optimization from BrandStrategistTools.optimizeBrand
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistryService] Registered tool: strategy-generation
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ToolRegistrationService] Registered tool: strategy-generation from BrandStrategistTools.generateStrategy
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ToolRegistrationService] Successfully registered 3 tool providers
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [FunctionalApiModuleInitializer] Initializing FunctionalApi module with explicit registration
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [FunctionalApiModuleInitializer] No workflows provided for registration
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [FunctionalApiModuleInitializer] FunctionalApi module initialization completed successfully
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [TimeTravelService] ✅ Checkpoint operations delegated to injected checkpoint adapter
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [TimeTravelService] 🚀 Time Travel facade service initialized with focused services
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [GitHubCodeAnalyzerAgent] Initializing declarative workflow: workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [GitHubCodeAnalyzerAgent] Extracting workflow definition from decorators for GitHubCodeAnalyzerAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Extracting workflow definition from GitHubCodeAnalyzerAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for GitHubCodeAnalyzerAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Found 6 task-based nodes for workflow github-analyzer-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetadataProcessorService] Generated task-based workflow definition for github-analyzer-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Validating workflow definition: github-analyzer-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetadataProcessorService] Workflow definition validation completed for github-analyzer-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [GitHubCodeAnalyzerAgent] Workflow 'github-analyzer-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [GitHubCodeAnalyzerAgent] Declarative workflow initialized successfully: workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [PersonalBrandStrategistAgent] Initializing declarative workflow: workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [PersonalBrandStrategistAgent] Extracting workflow definition from decorators for PersonalBrandStrategistAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Extracting workflow definition from PersonalBrandStrategistAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for PersonalBrandStrategistAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Found 7 nodes for workflow brand-strategist-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Found 7 edges for workflow brand-strategist-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetadataProcessorService] Generated node-based workflow definition for brand-strategist-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Validating workflow definition: brand-strategist-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetadataProcessorService] Workflow definition validation completed for brand-strategist-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [PersonalBrandStrategistAgent] Workflow 'brand-strategist-workflow': 7 nodes, 7 edges, 0 approval nodes, 0 streaming nodes
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [PersonalBrandStrategistAgent] Declarative workflow initialized successfully: workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ContentCreatorAgent] Initializing declarative workflow: workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ContentCreatorAgent] Extracting workflow definition from decorators for ContentCreatorAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Extracting workflow definition from ContentCreatorAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for ContentCreatorAgent
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Found 6 nodes for workflow content-creator-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Found 5 edges for workflow content-creator-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetadataProcessorService] Generated node-based workflow definition for content-creator-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [MetadataProcessorService] Validating workflow definition: content-creator-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [MetadataProcessorService] Workflow definition validation completed for content-creator-workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [ContentCreatorAgent] Workflow 'content-creator-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [ContentCreatorAgent] Declarative workflow initialized successfully: workflow
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [DevBrandSupervisorWorkflow] Initializing multi-agent workflow: devbrand-supervisor-network (supervisor)
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [DevBrandSupervisorWorkflow] Created 3 agent definitions: github-code-analyzer, personal-brand-strategist, content-creator
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent github-code-analyzer
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent personal-brand-strategist
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent content-creator
[Nest] 17472 - 11/02/2025, 4:43:48 PM WARN [AgentRegistryService] Agent github-code-analyzer is already registered, updating definition
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 17472 - 11/02/2025, 4:43:48 PM WARN [AgentRegistryService] Agent personal-brand-strategist is already registered, updating definition
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 17472 - 11/02/2025, 4:43:48 PM WARN [AgentRegistryService] Agent content-creator is already registered, updating definition
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NetworkManagerService] LangGraph checkpointer configured for network devbrand-supervisor-network
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [NetworkManagerService] Added checkpointer to network devbrand-supervisor-network compilation options
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [GraphBuilderService] Building supervisor graph with agents:
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [GraphBuilderService] Array(3) [
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
]
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LlmProviderService] Creating new LLM instance: minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LlmProviderService] Creating OpenRouter LLM with model: minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [GraphBuilderService] Applied interruptBefore from agent metadata: content-creator
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [NetworkManagerService] Created supervisor network: devbrand-supervisor-network with 3 agents
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [DevBrandSupervisorWorkflow] ✅ Multi-agent network initialized: devbrand-supervisor-network with 3 agents
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [NestApplication] Nest application successfully started +9ms
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG 🚀 Initializing streaming services...
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AppStreamingManager] 🚀 Initializing application streaming services...
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AppStreamingManager] 📡 Starting TokenStreamingService...
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [TokenStreamingService] 🚀 Starting TokenStreamingService...
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [TokenStreamingService] ✅ TokenStreamingService started successfully
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AppStreamingManager] 🌉 Starting WebSocketBridgeService...
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WebSocketBridgeService] 🚀 Starting WebSocketBridgeService...
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WebSocketBridgeService] Getting global token stream...
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WebSocketBridgeService] Token stream obtained, subscribing...
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [WebSocketBridgeService] ✅ WebSocketBridgeService started successfully
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AppStreamingManager] 🔌 Starting StreamingWebSocketService...
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [StreamingWebSocketService] 🚀 Starting StreamingWebSocketService...
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WebSocketBridgeService] WebSocket gateway registered with bridge service
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [StreamingWebSocketService] Bridge service integration configured
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [StreamingWebSocketService] ✅ WebSocket service started successfully on port: 8080
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AppStreamingManager] ✅ All streaming services initialized successfully!
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG [AppStreamingManager] 📊 Streaming stats: {"tokensStreamed":0,"activeConnections":0,"errors":0,"uptime":0,"lastActivity":"2025-11-02T14:43:48.956Z"}
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG ✅ Streaming services initialized successfully
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG 🔌 WebSocket streaming available at: ws://localhost:3000/streaming
[Nest] 17472 - 11/02/2025, 4:43:48 PM LOG 🌊 Frontend should connect to: ws://localhost:3000/streaming
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [LlmProviderService] Using cached LLM: minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WebSocketBridgeService] Token stream integration setup completed
[Nest] 17472 - 11/02/2025, 4:43:48 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 17472 - 11/02/2025, 4:43:51 PM LOG [LlmProviderService] LLM connectivity test PASSED for provider=openrouter, model=minimax/minimax-m2:free
[Nest] 17472 - 11/02/2025, 4:43:51 PM LOG [MultiAgentCoordinatorService] LLM connectivity verified
[Nest] 17472 - 11/02/2025, 4:43:51 PM DEBUG [StreamCoordinationService] Setting up agent streaming hooks
[Nest] 17472 - 11/02/2025, 4:44:18 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 17472 - 11/02/2025, 4:44:18 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 17472 - 11/02/2025, 4:44:18 PM DEBUG [CheckpointHealthService] Health check for primary: healthy (4ms)
[Nest] 17472 - 11/02/2025, 4:44:30 PM LOG [DevBrandController] 🚀 Starting DevBrand workflow for GitHub user: abdallah-khalil (executionId: devbrand-1762094670027)
[Nest] 17472 - 11/02/2025, 4:44:30 PM LOG [WorkflowStreamingOrchestrator] 🚀 Starting workflow with streaming: devbrand-1762094670027
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [CheckpointMetricsService] Recorded save metrics for primary: 1ms (success)
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [CheckpointPersistenceService] Checkpoint saved for thread multi-agent|network:devbrand-supervisor-network: checkpoint_multi-agent|network:devbrand-supervisor-network_1762094670029 (1ms)
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [WorkflowExecutionCoordinationService] Checkpoint saved for thread multi-agent|network:devbrand-supervisor-network
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [EventStreamProcessorService] Processed event events for exec_devbrand-supervisor-network_1762094670028:workflow_start
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [NetworkManagerService] Executing workflow on network devbrand-supervisor-network
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [NetworkManagerService] Object(5) {
type: 'supervisor',
messageCount: 1,
threadId: 'multi-agent|execution:devbrand-supervisor-network:1762094670033',
currentAgent: 'supervisor',
executionId: 'exec_6b96d66e-1318-4c9a-94b8-a8e619fd084a'
}
[Nest] 17472 - 11/02/2025, 4:44:30 PM ERROR [NetworkManagerService] Workflow execution failed for network devbrand-supervisor-network:
[Nest] 17472 - 11/02/2025, 4:44:30 PM ERROR [NetworkManagerService] TypeError: Cannot read properties of undefined (reading '**input**')
at \_applyWrites (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\algo.cjs:134:39)
at PregelLoop.\_first (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\loop.cjs:811:44)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async PregelLoop.tick (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\loop.cjs:577:13)
at async CompiledStateGraph.\_runLoop (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\index.cjs:1557:20)
at async createAndRunLoop (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\index.cjs:1439:17)
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [AgentMemoryCoreService] Storing memory from agent unknown: {"networkId":"devbrand-supervisor-network","execut...
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 17472 - 11/02/2025, 4:44:30 PM LOG [WebSocketBridgeService] Registered client 1c50a56f-367f-4795-9254-39cbd3342496 with rooms: []
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [StreamingWebSocketService] Client connected: 1c50a56f-367f-4795-9254-39cbd3342496 (::1)
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [WebSocketBridgeService] Linked client 1c50a56f-367f-4795-9254-39cbd3342496 to execution devbrand-1762094670027
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [StreamingWebSocketService] Client 1c50a56f-367f-4795-9254-39cbd3342496 subscribed to execution: devbrand-1762094670027
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] Semaphore acquired after 14ms wait (active: 1, queued: 0)
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] Starting ChromaDB operation
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-02T14:44:30.369Z'
}
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] Attempt 1/3 - executing operation
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] Semaphore acquired after 17ms wait (active: 2, queued: 0)
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] Starting ChromaDB operation
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-02T14:44:30.386Z'
}
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] Attempt 1/3 - executing operation
[Nest] 17472 - 11/02/2025, 4:44:30 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 17472 - 11/02/2025, 4:44:33 PM ERROR [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] ❌ FAILED on attempt 1/3
[Nest] 17472 - 11/02/2025, 4:44:33 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2702,
totalTime: 2702,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 17472 - 11/02/2025, 4:44:33 PM WARN [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] ⏳ Waiting 1000ms before retry 2...
[Nest] 17472 - 11/02/2025, 4:44:34 PM DEBUG [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] Attempt 2/3 - executing operation
[Nest] 17472 - 11/02/2025, 4:44:34 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3708
}
[Nest] 17472 - 11/02/2025, 4:44:36 PM ERROR [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] ❌ FAILED on attempt 2/3
[Nest] 17472 - 11/02/2025, 4:44:36 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2702,
totalTime: 6410,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 17472 - 11/02/2025, 4:44:36 PM WARN [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] ⏳ Waiting 1000ms before retry 3...
[Nest] 17472 - 11/02/2025, 4:44:37 PM DEBUG [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] Attempt 3/3 - executing operation
[Nest] 17472 - 11/02/2025, 4:44:37 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 7424
}
[Nest] 17472 - 11/02/2025, 4:44:40 PM ERROR [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] ❌ FAILED on attempt 1/3
[Nest] 17472 - 11/02/2025, 4:44:40 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 10015,
totalTime: 10015,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 10000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 10000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 17472 - 11/02/2025, 4:44:40 PM WARN [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] Marking connection as unhealthy due to: Operation timed out after 10000ms
[Nest] 17472 - 11/02/2025, 4:44:40 PM WARN [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] ⏳ Waiting 1000ms before retry 2...
[Nest] 17472 - 11/02/2025, 4:44:40 PM ERROR [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] ❌ FAILED on attempt 3/3
[Nest] 17472 - 11/02/2025, 4:44:40 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2683,
totalTime: 10107,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: false,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 17472 - 11/02/2025, 4:44:40 PM ERROR [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] 🔴 FINAL FAILURE after 10109ms
[Nest] 17472 - 11/02/2025, 4:44:40 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 17472 - 11/02/2025, 4:44:40 PM DEBUG [ChromaDBConnectionService] [op-1762094670369-ns0fgf1y4] Semaphore released
[Nest] 17472 - 11/02/2025, 4:44:41 PM WARN [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] Connection not established, reconnecting...
[Nest] 17472 - 11/02/2025, 4:44:41 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 13ms
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] [op-1762094670354-7xnmwt00s] Attempt 2/3 - executing operation
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 11043
}
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] [op-1762094681413-uh80hyt5l] Semaphore acquired after 1ms wait (active: 2, queued: 0)
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] [op-1762094681413-uh80hyt5l] Starting ChromaDB operation
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-02T14:44:41.414Z'
}
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] [op-1762094681413-uh80hyt5l] Attempt 1/3 - executing operation
[Nest] 17472 - 11/02/2025, 4:44:41 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
