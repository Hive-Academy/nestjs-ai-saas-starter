> node dist/main.js

```bash
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
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [NestFactory] Starting Nest application...
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [CacheStore] CacheStore initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [NeogmaMetricsService] NeogmaMetricsService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [AgentMemoryStatsService] AgentMemoryStatsService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HitlValidationService] ✅ HITL Validation Service initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowMetricsService] WorkflowMetricsService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HealthCheckService] Health check registered: memory
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HealthCheckService] Health check registered: cpu
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HealthCheckService] Health check registered: uptime
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [HealthCheckService] Default system health checks registered
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [DashboardService] Mock metric data initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [DashboardService] DashboardService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CheckpointSaverRegistry] Set 'primary' as default checkpoint saver
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CheckpointSaverRegistry] Registered checkpoint saver: primary
✅ Checkpoint saver registered: sqlite (provided by user)
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +8ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowRegistryService] WorkflowRegistryService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowRegistryService] Agent event listeners setup completed
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] TerminusModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] DiscoveryModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [AlertingService] AlertingService initialized with 30s evaluation interval. Metrics collection: disabled (fallback mode)
✅ Neo4j configuration validation passed
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [ChromaCacheService] ChromaCacheService initialized with segregated services
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [WorkflowCheckpointService] Workflow checkpoint service initialized. Enabled: true
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HitlCheckpointService] 💾 HITL Checkpoint Service initialized with adapter-first storage
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] EventEmitterModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [EmbeddingService] Successfully initialized huggingface embedding provider
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] LanggraphModulesCheckpointModule dependencies initialized +19ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] LanggraphModulesMonitoringModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowStreamingService] WorkflowStreamingService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowStreamingService] Streaming service available for workflow operations
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [HitlNotificationService] Object(1) {
streamingAvailable: true
}
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] StreamingModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] StreamingModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [LangGraphStoreRepository] LangGraphStoreRepository initialized with collection: langgraph-stores
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [ChromaVectorAdapter] ChromaVectorAdapter initialized with VectorMemoryRepository + LangGraphStoreRepository (dual-collection pattern)
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] AppModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] NeogmaModule dependencies initialized +67ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: Memory
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: StoreItem
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: ApprovalChain
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: ApprovalRequest
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: InterruptionPoint
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: ConfidencePattern
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: FeedbackEntry
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: Developer
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaService] Registered model: Achievement
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [NeogmaConnectionService] NeogmaConnectionService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [NeogmaConnectionService] Starting periodic health checks every 30000ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [StoreGraphRepository] StoreGraphRepository initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [MemoryGraphRepository] MemoryGraphRepository initialized with composition pattern
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [Neo4jGraphAdapter] Neo4jGraphAdapter initialized with MemoryGraphRepository
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [AgentMemoryCoreService] AgentMemoryCoreService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [AgentMemoryCheckpointService] AgentMemoryCheckpointService initialized with full capabilities (checkpoint + vector + graph)
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] RepositoryModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [AgentMemoryContextService] AgentMemoryContextService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [MemoryGraphService] MemoryGraphService initialized with configuration
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [MemoryGraphService] Object(2) {
neo4jDatabase: 'neo4j',
enableAutoSummarization: false
}
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] AdaptersModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [AgentMemoryBridgeService] AgentMemoryBridge initialized (orchestrator pattern) with specialized services
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [MemoryCoordinationService] Memory adapter available - memory superpowers enabled
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HitlMemoryLearningService] 🧠 HITL Memory Learning Service initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] MemoryModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Initializing centralized registry...
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: web-search
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: news-search
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: social-profile-search
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: research-search
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: github-analyzer
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: achievement-extractor
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: developer-insights
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: ai-synthesis
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: memory-analysis
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: brand-optimization
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: strategy-generation
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: linkedin-formatter
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: devto-formatter
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: content-optimizer
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: quality-scorer
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Tool registered: engagement-predictor
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Agent registered: PersonalBrandStrategistAgent
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Agent registered: ContentCreatorAgent
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Agent registered: GitHubCodeAnalyzerAgent
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Workflow registered: DevBrandSupervisorWorkflow
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Workflow registered: DevBrandChatWorkflow
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [CentralRegistryService] Registry initialized with 3 agents, 16 tools, 2 workflows
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [HitlTimeoutService] Object(2) {
storageAvailable: true,
notificationsAvailable: true
}
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HitlRecoveryService] 🔧 HITL Recovery Service initialized with persistent storage
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [UserInterruptionService] ✅ Memory adapter available for interruption pattern learning
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [ApprovalChainService] 🔗 Approval Chain Service initialized with adapter-first storage + IMemoryAdapter.getStore() for hierarchical tracking
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [FeedbackProcessorService] 💬 Feedback Processor Service initialized with adapter-first storage
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [ConfidenceEvaluatorService] 🧠 Confidence Evaluator Service initialized with adapter-first storage
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] TimeTravelModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HitlApprovalRequestService] 📝 HITL Approval Request Service initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [HumanApprovalService] 🎯 Human Approval Service initialized with specialized services
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] HitlModule dependencies initialized +1ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [StreamCoordinationService] Streaming service available:
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [StreamCoordinationService] true
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [MultiAgentCoordinatorService] Memory adapter available - memory superpowers enabled
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowCheckpointService] WorkflowCheckpointService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [WorkflowCheckpointService] Checkpoint adapter available - checkpoint operations enabled
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowInstanceService] WorkflowInstanceService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowInstanceService] Tool registry available with 0 registered tools
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] BusinessWorkflowsModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [WorkflowExecutionService] Checkpoint service available - automatic checkpointing enabled
[Nest] 17920 - 10/12/2025, 3:54:48 PM DEBUG [WorkflowManagerService] WorkflowManagerService initialized with specialized services
[Nest] 17920 - 10/12/2025, 3:54:48 PM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RoutesResolver] HealthController {/api/health}: +334ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/health, GET} route +5ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +1ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +1ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +0ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +1ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +0ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +1ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 28ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [CheckpointManagerService] ✅ Checkpoint system initialized with 1 saver(s): primary
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [CheckpointCleanupService] Checkpoint cleanup scheduler started (interval: 3600000ms)
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [CheckpointHealthService] Health monitoring started (interval: 30000ms)
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [CheckpointManagerService] Checkpoint background services started: cleanup, health monitoring
[Safe] getAllActiveInterruptions - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ConfidenceEvaluatorService] Confidence Evaluator Service initializing with persistent storage
[Safe] getAllActivePatterns - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Safe] getAllApprovalPatterns - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ApprovalChainService] Approval Chain Service initializing with persistent storage
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [FeedbackProcessorService] Feedback Processor Service initializing with persistent storage
[Safe] getAllActiveFeedback - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [HumanApprovalService] Human Approval Service initializing with specialized services
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [HitlRecoveryService] 🔄 Starting recovery of pending approvals from persistent storage
[Safe] getPendingApprovals - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Safe] getAllActiveInterruptions - Completed successfully in 53ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [UserInterruptionService] ✅ Successfully recovered 0 active interruptions from persistent storage
[Safe] getAllActiveFeedback - Completed successfully in 105ms
[Safe] getAllExecutionFeedback - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Safe] getAllApprovalPatterns - Completed successfully in 117ms
[Safe] getAllActivePatterns - Completed successfully in 119ms
[Safe] getAllActivePatterns - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Safe] getAllApprovalPatterns - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Safe] getAllExecutionFeedback - Completed successfully in 21ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [FeedbackProcessorService] ✅ Recovered 0 feedback entries across 0 executions
[Safe] getUnprocessedFeedback - Preprocessing completed in 0ms {
originalArgs: [],
transformedArgs: [],
config: {
strict: true,
log: true,
rules: {
maxDepth: 10,
maxParams: 20,
maxProperties: 1000,
maxArrayLength: 10000,
maxStringLength: 1000000,
preventInjection: true,
onInjectionDetected: 'throw',
sanitizeHtml: false,
escapeSpecialChars: false,
customSanitizers: []
},
transforms: {
autoSerialize: true,
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Safe] getPendingApprovals - Completed successfully in 135ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [HitlRecoveryService] ✅ No pending approvals found to recover
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Safe] getAllApprovalPatterns - Completed successfully in 26ms
[Safe] getAllActivePatterns - Completed successfully in 28ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ConfidenceEvaluatorService] ✅ Loaded 0 patterns and 0 history entries from persistent storage
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ConfidenceEvaluatorService] ✅ Confidence Evaluator Service initialized with storage adapter
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ApprovalChainService] ✅ Recovered 0 requests and 0 chains
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ApprovalChainService] ✅ Approval Chain Service initialized
[Safe] getUnprocessedFeedback - Completed successfully in 31ms
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [FeedbackProcessorService] 🔄 Starting processing pipeline for 0 unprocessed feedback entries
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [FeedbackProcessorService] ✅ Feedback Processor Service initialized
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [WorkflowStreamOrchestratorService] WorkflowStreamOrchestratorService initializing
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MultiAgentCoordinatorService] Multi-agent coordinator service initialized with SOLID architecture
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [FunctionalApiModuleInitializer] Initializing FunctionalApi module with explicit registration
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [FunctionalApiModuleInitializer] No workflows provided for registration
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [FunctionalApiModuleInitializer] FunctionalApi module initialization completed successfully
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [TimeTravelService] ✅ Checkpoint operations delegated to injected checkpoint adapter
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [TimeTravelService] 🚀 Time Travel facade service initialized with focused services
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [GitHubCodeAnalyzerAgent] Initializing declarative workflow: workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [GitHubCodeAnalyzerAgent] Extracting workflow definition from decorators for GitHubCodeAnalyzerAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Extracting workflow definition from GitHubCodeAnalyzerAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for GitHubCodeAnalyzerAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Found 6 task-based nodes for workflow github-analyzer-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MetadataProcessorService] Generated task-based workflow definition for github-analyzer-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Validating workflow definition: github-analyzer-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MetadataProcessorService] Workflow definition validation completed for github-analyzer-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [GitHubCodeAnalyzerAgent] Workflow 'github-analyzer-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [GitHubCodeAnalyzerAgent] Declarative workflow initialized successfully: workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [PersonalBrandStrategistAgent] Initializing declarative workflow: workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [PersonalBrandStrategistAgent] Extracting workflow definition from decorators for PersonalBrandStrategistAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Extracting workflow definition from PersonalBrandStrategistAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for PersonalBrandStrategistAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Found 7 nodes for workflow brand-strategist-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Found 7 edges for workflow brand-strategist-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MetadataProcessorService] Generated node-based workflow definition for brand-strategist-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Validating workflow definition: brand-strategist-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MetadataProcessorService] Workflow definition validation completed for brand-strategist-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [PersonalBrandStrategistAgent] Workflow 'brand-strategist-workflow': 7 nodes, 7 edges, 0 approval nodes, 0 streaming nodes
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [PersonalBrandStrategistAgent] Declarative workflow initialized successfully: workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ContentCreatorAgent] Initializing declarative workflow: workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [ContentCreatorAgent] Extracting workflow definition from decorators for ContentCreatorAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Extracting workflow definition from ContentCreatorAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for ContentCreatorAgent
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Found 6 nodes for workflow content-creator-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Found 5 edges for workflow content-creator-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MetadataProcessorService] Generated node-based workflow definition for content-creator-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [MetadataProcessorService] Validating workflow definition: content-creator-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [MetadataProcessorService] Workflow definition validation completed for content-creator-workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [ContentCreatorAgent] Workflow 'content-creator-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [ContentCreatorAgent] Declarative workflow initialized successfully: workflow
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [DevBrandSupervisorWorkflow] Initializing multi-agent workflow: devbrand-supervisor-network (supervisor)
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [DevBrandSupervisorWorkflow] Created 3 agent definitions: github-code-analyzer, personal-brand-strategist, content-creator
[Nest] 17920 - 10/12/2025, 3:54:49 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent github-code-analyzer
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [AgentMemoryCoreService] Storing memory from agent github-code-analyzer: {"agentId":"github-code-analyzer","name":"GitHub C...
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [LlmProviderService] Creating new LLM instance: moonshotai/kimi-k2:free
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [LlmProviderService] Creating OpenRouter LLM with model: moonshotai/kimi-k2:free
[Nest] 17920 - 10/12/2025, 3:54:49 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 17920 - 10/12/2025, 3:54:52 PM LOG [LlmProviderService] LLM connectivity test PASSED for provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 17920 - 10/12/2025, 3:54:52 PM LOG [MultiAgentCoordinatorService] LLM connectivity verified
[Nest] 17920 - 10/12/2025, 3:54:52 PM DEBUG [StreamCoordinationService] Setting up agent streaming hooks
[Nest] 17920 - 10/12/2025, 3:54:53 PM WARN [ChromaDBConnectionService] Connection retry attempt 1 after error: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.
[Nest] 17920 - 10/12/2025, 3:54:57 PM WARN [ChromaDBConnectionService] Connection retry attempt 2 after error: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.
[Nest] 17920 - 10/12/2025, 3:55:00 PM WARN [ChromaDBConnectionService] Connection retry attempt 1 after error: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.
```
