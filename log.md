[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [HitlNotificationService] Object(1) {
streamingAvailable: true
}
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] StreamingModule dependencies initialized +1ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] StreamingModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HitlCheckpointService] 💾 HITL Checkpoint Service initialized with adapter-first storage
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WorkflowCheckpointService] Workflow checkpoint service initialized. Enabled: true
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] LanggraphModulesCheckpointModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ChromaDBConnectionService] ChromaDB semaphore initialized: max 5 concurrent operations
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LangGraphStoreRepository] LangGraphStoreRepository initialized with collection: langgraph-stores
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [ChromaVectorAdapter] ChromaVectorAdapter initialized with VectorMemoryRepository + LangGraphStoreRepository (dual-collection pattern)
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +1ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] NeogmaModule dependencies initialized +161ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: Memory
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: StoreItem
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: ApprovalChain
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: ApprovalRequest
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: InterruptionPoint
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: ConfidencePattern
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: FeedbackEntry
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: Developer
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NeogmaService] Registered model: Achievement
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [NeogmaConnectionService] NeogmaConnectionService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [StoreGraphRepository] StoreGraphRepository initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MemoryGraphRepository] MemoryGraphRepository initialized with composition pattern
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [Neo4jGraphAdapter] Neo4jGraphAdapter initialized with MemoryGraphRepository
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentMemoryCoreService] AgentMemoryCoreService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentMemoryCheckpointService] AgentMemoryCheckpointService initialized with full capabilities (checkpoint + vector + graph)
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] RepositoryModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentMemoryContextService] AgentMemoryContextService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MemoryGraphService] MemoryGraphService initialized with configuration
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MemoryGraphService] Object(2) {
neo4jDatabase: 'neo4j',
enableAutoSummarization: false
}
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] AdaptersModule dependencies initialized +1ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentMemoryBridgeService] AgentMemoryBridge initialized (orchestrator pattern) with specialized services
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [BackgroundMemoryService] BackgroundMemoryService initialized with automatic flushing
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HitlMemoryLearningService] 🧠 HITL Memory Learning Service initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] MemoryModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MemoryCoordinationService] Memory adapter available - memory superpowers enabled
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MemoryCoordinationService] BackgroundMemoryService available - using batched async writes
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Initializing centralized registry...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: web-search
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: news-search
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: social-profile-search
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: research-search
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: github-analyzer
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: achievement-extractor
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: developer-insights
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: ai-synthesis
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: memory-analysis
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: brand-optimization
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: strategy-generation
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: linkedin-formatter
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: devto-formatter
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: content-optimizer
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: quality-scorer
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Tool registered: engagement-predictor
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Agent registered: PersonalBrandStrategistAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Agent registered: ContentCreatorAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Agent registered: GitHubCodeAnalyzerAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Workflow registered: DevBrandSupervisorWorkflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Workflow registered: DevBrandChatWorkflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CentralRegistryService] Registry initialized with 3 agents, 16 tools, 2 workflows
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [HitlTimeoutService] Object(2) {
storageAvailable: true,
notificationsAvailable: true
}
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HitlRecoveryService] 🔧 HITL Recovery Service initialized with persistent storage
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [UserInterruptionService] ✅ Memory adapter available for interruption pattern learning
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ApprovalChainService] 🔗 Approval Chain Service initialized with adapter-first storage + IMemoryAdapter.getStore() for hierarchical tracking
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FeedbackProcessorService] 💬 Feedback Processor Service initialized with adapter-first storage
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ConfidenceEvaluatorService] 🧠 Confidence Evaluator Service initialized with adapter-first storage
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] TimeTravelModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HitlApprovalRequestService] 📝 HITL Approval Request Service initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HumanApprovalService] 🎯 Human Approval Service initialized with specialized services
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] HitlModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [StreamCoordinationService] Streaming service available:
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [StreamCoordinationService] true
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MultiAgentCoordinatorService] Memory adapter available - memory superpowers enabled
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowCheckpointService] WorkflowCheckpointService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WorkflowCheckpointService] Checkpoint adapter available - checkpoint operations enabled
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowInstanceService] WorkflowInstanceService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowInstanceService] Tool registry available with 0 registered tools
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] BusinessWorkflowsModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] AppModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WorkflowExecutionService] Checkpoint service available - automatic checkpointing enabled
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowManagerService] WorkflowManagerService initialized with specialized services
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RoutesResolver] HealthController {/api/health}: +33ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/health, GET} route +2ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +1ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +1ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +1ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RoutesResolver] DevBrandController {/api/devbrand}: +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [RouterExplorer] Mapped {/api/devbrand/execute, POST} route +0ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 46ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CheckpointManagerService] ✅ Checkpoint system initialized with 1 saver(s): primary
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CheckpointCleanupService] Checkpoint cleanup scheduler started (interval: 3600000ms)
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CheckpointHealthService] Health monitoring started (interval: 30000ms)
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [CheckpointManagerService] Checkpoint background services started: cleanup, health monitoring
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
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ConfidenceEvaluatorService] Confidence Evaluator Service initializing with persistent storage
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
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ApprovalChainService] Approval Chain Service initializing with persistent storage
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FeedbackProcessorService] Feedback Processor Service initializing with persistent storage
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
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HumanApprovalService] Human Approval Service initializing with specialized services
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HitlRecoveryService] 🔄 Starting recovery of pending approvals from persistent storage
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
[Safe] getAllActiveFeedback - Completed successfully in 126ms
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
[Safe] getAllApprovalPatterns - Completed successfully in 132ms
[Safe] getAllActivePatterns - Completed successfully in 132ms
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
[Safe] getAllActiveInterruptions - Completed successfully in 141ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [UserInterruptionService] ✅ Successfully recovered 0 active interruptions from persistent storage
[Safe] getPendingApprovals - Completed successfully in 134ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HitlRecoveryService] ✅ No pending approvals found to recover
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Safe] getAllExecutionFeedback - Completed successfully in 17ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FeedbackProcessorService] ✅ Recovered 0 feedback entries across 0 executions
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
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ApprovalChainService] ✅ Recovered 0 requests and 0 chains
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ApprovalChainService] ✅ Approval Chain Service initialized
[Safe] getAllApprovalPatterns - Completed successfully in 18ms
[Safe] getAllActivePatterns - Completed successfully in 20ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ConfidenceEvaluatorService] ✅ Loaded 0 patterns and 0 history entries from persistent storage
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ConfidenceEvaluatorService] ✅ Confidence Evaluator Service initialized with storage adapter
[Safe] getUnprocessedFeedback - Completed successfully in 15ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FeedbackProcessorService] 🔄 Starting processing pipeline for 0 unprocessed feedback entries
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FeedbackProcessorService] ✅ Feedback Processor Service initialized
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WorkflowStreamService] Initializing WorkflowStreamService
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WorkflowStreamService] Checkpoint adapter available: true
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MultiAgentCoordinatorService] Multi-agent coordinator service initialized with SOLID architecture
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FunctionalApiModuleInitializer] Initializing FunctionalApi module with explicit registration
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [FunctionalApiModuleInitializer] No workflows provided for registration
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [FunctionalApiModuleInitializer] FunctionalApi module initialization completed successfully
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [TimeTravelService] ✅ Checkpoint operations delegated to injected checkpoint adapter
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [TimeTravelService] 🚀 Time Travel facade service initialized with focused services
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [GitHubCodeAnalyzerAgent] Initializing declarative workflow: workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [GitHubCodeAnalyzerAgent] Extracting workflow definition from decorators for GitHubCodeAnalyzerAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Extracting workflow definition from GitHubCodeAnalyzerAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for GitHubCodeAnalyzerAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Found 6 task-based nodes for workflow github-analyzer-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MetadataProcessorService] Generated task-based workflow definition for github-analyzer-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Validating workflow definition: github-analyzer-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MetadataProcessorService] Workflow definition validation completed for github-analyzer-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [GitHubCodeAnalyzerAgent] Workflow 'github-analyzer-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [GitHubCodeAnalyzerAgent] Declarative workflow initialized successfully: workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [PersonalBrandStrategistAgent] Initializing declarative workflow: workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [PersonalBrandStrategistAgent] Extracting workflow definition from decorators for PersonalBrandStrategistAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Extracting workflow definition from PersonalBrandStrategistAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for PersonalBrandStrategistAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Found 7 nodes for workflow brand-strategist-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Found 7 edges for workflow brand-strategist-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MetadataProcessorService] Generated node-based workflow definition for brand-strategist-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Validating workflow definition: brand-strategist-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MetadataProcessorService] Workflow definition validation completed for brand-strategist-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [PersonalBrandStrategistAgent] Workflow 'brand-strategist-workflow': 7 nodes, 7 edges, 0 approval nodes, 0 streaming nodes
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [PersonalBrandStrategistAgent] Declarative workflow initialized successfully: workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ContentCreatorAgent] Initializing declarative workflow: workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [ContentCreatorAgent] Extracting workflow definition from decorators for ContentCreatorAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Extracting workflow definition from ContentCreatorAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for ContentCreatorAgent
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Found 6 nodes for workflow content-creator-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Found 5 edges for workflow content-creator-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MetadataProcessorService] Generated node-based workflow definition for content-creator-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [MetadataProcessorService] Validating workflow definition: content-creator-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [MetadataProcessorService] Workflow definition validation completed for content-creator-workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [ContentCreatorAgent] Workflow 'content-creator-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [ContentCreatorAgent] Declarative workflow initialized successfully: workflow
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [DevBrandSupervisorWorkflow] Initializing multi-agent workflow: devbrand-supervisor-network (supervisor)
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [DevBrandSupervisorWorkflow] Created 3 agent definitions: github-code-analyzer, personal-brand-strategist, content-creator
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent github-code-analyzer
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent personal-brand-strategist
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent content-creator
[Nest] 19908 - 11/01/2025, 5:01:52 PM WARN [AgentRegistryService] Agent github-code-analyzer is already registered, updating definition
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 19908 - 11/01/2025, 5:01:52 PM WARN [AgentRegistryService] Agent personal-brand-strategist is already registered, updating definition
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 19908 - 11/01/2025, 5:01:52 PM WARN [AgentRegistryService] Agent content-creator is already registered, updating definition
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NetworkManagerService] LangGraph checkpointer configured for network devbrand-supervisor-network
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [NetworkManagerService] Added checkpointer to network devbrand-supervisor-network compilation options
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [GraphBuilderService] Building supervisor graph with agents:
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [GraphBuilderService] Array(3) [
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
]
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LlmProviderService] Creating new LLM instance: minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LlmProviderService] Creating OpenRouter LLM with model: minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [GraphBuilderService] Applied interruptBefore from agent metadata: content-creator
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [NetworkManagerService] Created supervisor network: devbrand-supervisor-network with 3 agents
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [DevBrandSupervisorWorkflow] ✅ Multi-agent network initialized: devbrand-supervisor-network with 3 agents
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [NestApplication] Nest application successfully started +10ms
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG 🚀 Initializing streaming services...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AppStreamingManager] 🚀 Initializing application streaming services...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AppStreamingManager] 📡 Starting TokenStreamingService...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [TokenStreamingService] 🚀 Starting TokenStreamingService...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [TokenStreamingService] ✅ TokenStreamingService started successfully
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AppStreamingManager] 🌉 Starting WebSocketBridgeService...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WebSocketBridgeService] 🚀 Starting WebSocketBridgeService...
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WebSocketBridgeService] Getting global token stream...
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WebSocketBridgeService] Token stream obtained, subscribing...
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [WebSocketBridgeService] ✅ WebSocketBridgeService started successfully
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AppStreamingManager] 🔌 Starting StreamingWebSocketService...
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [StreamingWebSocketService] 🚀 Starting StreamingWebSocketService...
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WebSocketBridgeService] WebSocket gateway registered with bridge service
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [StreamingWebSocketService] Bridge service integration configured
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [StreamingWebSocketService] ✅ WebSocket service started successfully on port: 8080
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AppStreamingManager] ✅ All streaming services initialized successfully!
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG [AppStreamingManager] 📊 Streaming stats: {"tokensStreamed":0,"activeConnections":0,"errors":0,"uptime":0,"lastActivity":"2025-11-01T15:01:52.932Z"}
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG ✅ Streaming services initialized successfully
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG 🔌 WebSocket streaming available at: ws://localhost:3000/streaming
[Nest] 19908 - 11/01/2025, 5:01:52 PM LOG 🌊 Frontend should connect to: ws://localhost:3000/streaming
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [LlmProviderService] Using cached LLM: minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WebSocketBridgeService] Token stream integration setup completed
[Nest] 19908 - 11/01/2025, 5:01:52 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 19908 - 11/01/2025, 5:01:58 PM LOG [LlmProviderService] LLM connectivity test PASSED for provider=openrouter, model=minimax/minimax-m2:free
[Nest] 19908 - 11/01/2025, 5:01:58 PM LOG [MultiAgentCoordinatorService] LLM connectivity verified
[Nest] 19908 - 11/01/2025, 5:01:58 PM DEBUG [StreamCoordinationService] Setting up agent streaming hooks
[Nest] 19908 - 11/01/2025, 5:02:22 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 19908 - 11/01/2025, 5:02:22 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 19908 - 11/01/2025, 5:02:52 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 19908 - 11/01/2025, 5:02:52 PM WARN [HealthCheckService] System health degraded:
[Nest] 19908 - 11/01/2025, 5:02:52 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 19908 - 11/01/2025, 5:02:52 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 19908 - 11/01/2025, 5:02:52 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 19908 - 11/01/2025, 5:03:05 PM LOG [DevBrandController] 🚀 Starting DevBrand workflow for GitHub user: abdallah-khalil (executionId: devbrand-1762009385579)
[Nest] 19908 - 11/01/2025, 5:03:05 PM LOG [WorkflowStreamingOrchestrator] 🚀 Starting workflow with streaming: devbrand-1762009385579
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [CheckpointMetricsService] Recorded save metrics for default: 0ms (error)
[Nest] 19908 - 11/01/2025, 5:03:05 PM ERROR [CheckpointPersistenceService] Failed to save checkpoint for thread multi-agent|network:devbrand-supervisor-network (0ms):
[Nest] 19908 - 11/01/2025, 5:03:05 PM ERROR [CheckpointPersistenceService] Error: No default checkpoint saver available
at CheckpointRegistryService.createError (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1225:19)
at CheckpointRegistryService.getDefaultSaver (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1293:18)
at CheckpointRegistryService.getSaver (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1286:17)
at CheckpointPersistenceService.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1528:42)
at CheckpointManagerService.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:130:36)
at CheckpointManagerAdapter.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:3124:35)
at WorkflowExecutionCoordinationService.saveWorkflowCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:21015:36)
at WorkflowExecutionCoordinationService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:20860:20)
at MultiAgentCoordinatorService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:21121:35)
at DevBrandSupervisorWorkflow.executeCoordination (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:24682:31) {
code: 'NO_DEFAULT_SAVER',
availableSavers: []
}
[Nest] 19908 - 11/01/2025, 5:03:05 PM ERROR [WorkflowExecutionCoordinationService] Failed to save checkpoint for thread multi-agent|network:devbrand-supervisor-network:
[Nest] 19908 - 11/01/2025, 5:03:05 PM ERROR [WorkflowExecutionCoordinationService] Error: Failed to save checkpoint: No default checkpoint saver available
at CheckpointPersistenceService.createSaveError (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1798:23)
at CheckpointPersistenceService.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1551:18)
at CheckpointManagerService.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:130:36)
... 4 lines matching cause stack trace ...
at DevBrandSupervisorWorkflow.executeCoordination (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:24682:31)
at DevBrandSupervisorWorkflow.executeWithStreaming (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:419561)
at executeWithStreaming.next (<anonymous>) {
code: 'CHECKPOINT_SAVE_FAILED',
threadId: 'multi-agent|network:devbrand-supervisor-network',
checkpointId: 'checkpoint_multi-agent|network:devbrand-supervisor-network_1762009385580',
cause: Error: No default checkpoint saver available
at CheckpointRegistryService.createError (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1225:19)
at CheckpointRegistryService.getDefaultSaver (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1293:18)
at CheckpointRegistryService.getSaver (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1286:17)
at CheckpointPersistenceService.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:1528:42)
at CheckpointManagerService.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:130:36)
at CheckpointManagerAdapter.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:3124:35)
at WorkflowExecutionCoordinationService.saveWorkflowCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:21015:36)
at WorkflowExecutionCoordinationService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:20860:20)
at MultiAgentCoordinatorService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:21121:35)
at DevBrandSupervisorWorkflow.executeCoordination (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:24682:31) {
code: 'NO_DEFAULT_SAVER',
availableSavers: []
},
retryable: false
}
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [EventStreamProcessorService] Processed event events for exec_devbrand-supervisor-network_1762009385580:workflow_start
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [NetworkManagerService] Executing workflow on network devbrand-supervisor-network
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [NetworkManagerService] Object(3) {
type: 'supervisor',
messageCount: 1,
executionId: 'exec_ba436182-b3d1-477b-8283-4597b4ffaa1b'
}
[Nest] 19908 - 11/01/2025, 5:03:05 PM LOG [WebSocketBridgeService] Registered client 7231d93b-cb9f-4294-a1a8-ffedc1389ff2 with rooms: []
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [StreamingWebSocketService] Client connected: 7231d93b-cb9f-4294-a1a8-ffedc1389ff2 (::1)
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [WebSocketBridgeService] Linked client 7231d93b-cb9f-4294-a1a8-ffedc1389ff2 to execution devbrand-1762009385579
[Nest] 19908 - 11/01/2025, 5:03:05 PM DEBUG [StreamingWebSocketService] Client 7231d93b-cb9f-4294-a1a8-ffedc1389ff2 subscribed to execution: devbrand-1762009385579
[Nest] 19908 - 11/01/2025, 5:03:12 PM DEBUG [NodeFactoryService] Supervisor routing to: github-code-analyzer
[Nest] 19908 - 11/01/2025, 5:03:12 PM DEBUG [NodeFactoryService] Object(2) {
reasoning: 'Starting with GitHub profile analysis for abdallah-khalil to extract achievements, technologies, and project highlights as the first step in building their personal brand',
task: 'Analyze GitHub profile for abdallah-khalil to extract repository contributions, technologies used, impact metrics, standout projects, and technical skills for personal branding strategy'
}
[Nest] 19908 - 11/01/2025, 5:03:12 PM DEBUG [NodeFactoryService] Executing worker agent: github-code-analyzer
[Nest] 19908 - 11/01/2025, 5:03:12 PM DEBUG [NodeFactoryService] Object(2) {
task: 'Analyze GitHub profile for abdallah-khalil to extract repository contributions, technologies used, impact metrics, standout projects, and technical skills for personal branding strategy',
messageCount: 2
}
[Nest] 19908 - 11/01/2025, 5:03:12 PM DEBUG [AgentMemoryContextService] Getting memory context for agent unknown in thread unknown
[Nest] 19908 - 11/01/2025, 5:03:12 PM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully generated embeddings for 1 queries
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] [op-1762009396490-leil56b9h] Semaphore acquired after 10ms wait (active: 1, queued: 0)
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] [op-1762009396490-leil56b9h] Starting ChromaDB operation
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-01T15:03:16.501Z'
}
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] [op-1762009396490-leil56b9h] Attempt 1/3 - executing operation
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] Semaphore acquired after 14ms wait (active: 2, queued: 0)
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] Starting ChromaDB operation
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-01T15:03:16.516Z'
}
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] Attempt 1/3 - executing operation
[Nest] 19908 - 11/01/2025, 5:03:16 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 19908 - 11/01/2025, 5:03:19 PM ERROR [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] ❌ FAILED on attempt 1/3
[Nest] 19908 - 11/01/2025, 5:03:19 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2692,
totalTime: 2693,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 19908 - 11/01/2025, 5:03:19 PM WARN [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] ⏳ Waiting 1000ms before retry 2...
[Nest] 19908 - 11/01/2025, 5:03:20 PM DEBUG [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] Attempt 2/3 - executing operation
[Nest] 19908 - 11/01/2025, 5:03:20 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3701
}
[Nest] 19908 - 11/01/2025, 5:03:22 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 19908 - 11/01/2025, 5:03:22 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 19908 - 11/01/2025, 5:03:22 PM ERROR [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] ❌ FAILED on attempt 2/3
[Nest] 19908 - 11/01/2025, 5:03:22 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2694,
totalTime: 6395,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 19908 - 11/01/2025, 5:03:22 PM WARN [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] ⏳ Waiting 1000ms before retry 3...
[Nest] 19908 - 11/01/2025, 5:03:23 PM DEBUG [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] Attempt 3/3 - executing operation
[Nest] 19908 - 11/01/2025, 5:03:23 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 7401
}
[Nest] 19908 - 11/01/2025, 5:03:26 PM ERROR [ChromaDBConnectionService] [op-1762009396490-leil56b9h] ❌ FAILED on attempt 1/3
[Nest] 19908 - 11/01/2025, 5:03:26 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 10016,
totalTime: 10016,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 10000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 10000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 19908 - 11/01/2025, 5:03:26 PM WARN [ChromaDBConnectionService] [op-1762009396490-leil56b9h] Marking connection as unhealthy due to: Operation timed out after 10000ms
[Nest] 19908 - 11/01/2025, 5:03:26 PM WARN [ChromaDBConnectionService] [op-1762009396490-leil56b9h] ⏳ Waiting 1000ms before retry 2...
[Nest] 19908 - 11/01/2025, 5:03:26 PM ERROR [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] ❌ FAILED on attempt 3/3
[Nest] 19908 - 11/01/2025, 5:03:26 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2689,
totalTime: 10090,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: false,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 19908 - 11/01/2025, 5:03:26 PM ERROR [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] 🔴 FINAL FAILURE after 10091ms
[Nest] 19908 - 11/01/2025, 5:03:26 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 19908 - 11/01/2025, 5:03:26 PM DEBUG [ChromaDBConnectionService] [op-1762009396502-8wmnze99a] Semaphore released
[Nest] 19908 - 11/01/2025, 5:03:27 PM WARN [ChromaDBConnectionService] [op-1762009396490-leil56b9h] Connection not established, reconnecting...
[Nest] 19908 - 11/01/2025, 5:03:27 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 15ms
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] [op-1762009396490-leil56b9h] Attempt 2/3 - executing operation
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 11035
}
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] [op-1762009407536-elpdse0g4] Semaphore acquired after 0ms wait (active: 2, queued: 0)
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] [op-1762009407536-elpdse0g4] Starting ChromaDB operation
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-01T15:03:27.538Z'
}
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] [op-1762009407536-elpdse0g4] Attempt 1/3 - executing operation
[Nest] 19908 - 11/01/2025, 5:03:27 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
