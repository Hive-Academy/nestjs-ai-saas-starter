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
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [NestFactory] Starting Nest application...
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CacheStore] CacheStore initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [NeogmaMetricsService] NeogmaMetricsService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [AgentMemoryStatsService] AgentMemoryStatsService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [HitlValidationService] ✅ HITL Validation Service initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [WorkflowMetricsService] WorkflowMetricsService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [HealthCheckService] Health check registered: memory
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [HealthCheckService] Health check registered: cpu
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [HealthCheckService] Health check registered: uptime
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [HealthCheckService] Default system health checks registered
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [DashboardService] Mock metric data initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [DashboardService] DashboardService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [CheckpointSaverRegistry] Set 'primary' as default checkpoint saver
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [CheckpointSaverRegistry] Registered checkpoint saver: primary
✅ Checkpoint saver registered: sqlite (provided by user)
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +8ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +1ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] TerminusModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] DiscoveryModule dependencies initialized +1ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [AlertingService] AlertingService initialized with 30s evaluation interval. Metrics collection: disabled (fallback mode)
✅ Neo4j configuration validation passed
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaCacheService] ChromaCacheService initialized with segregated services
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] EventEmitterModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [WorkflowRegistryService] WorkflowRegistryService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [WorkflowRegistryService] Agent event listeners setup completed
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [EmbeddingService] Successfully initialized huggingface embedding provider
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] LanggraphModulesMonitoringModule dependencies initialized +9ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [HitlCheckpointService] 💾 HITL Checkpoint Service initialized with adapter-first storage
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [WorkflowCheckpointService] Workflow checkpoint service initialized. Enabled: true
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] CheckpointModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [WorkflowStreamingService] WorkflowStreamingService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [WorkflowStreamingService] Streaming service available for workflow operations
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [HitlNotificationService] HitlNotificationService initialized
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [HitlNotificationService] Object(1) {
streamingAvailable: true
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] StreamingModule dependencies initialized +1ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] StreamingModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaDBConnectionService] ChromaDB semaphore initialized: max 5 concurrent operations
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: vector-memories (metadata: {"source":"entity-decorator","entityName":"VectorMemoryEntity","collection":"vector-memories","description":"Vector-based memory storage for AI agent interactions","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: langgraph-stores (metadata: {"source":"entity-decorator","entityName":"LangGraphStoreEntity","collection":"langgraph-stores","description":"Hierarchical namespace-based storage for LangGraph Store","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":false,"idStrategy":"custom"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: dev-achievements (metadata: {"source":"entity-decorator","entityName":"CodeAchievementEntity","collection":"dev-achievements","description":"Developer code achievements and technical contributions","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: brand-evolution (metadata: {"source":"entity-decorator","entityName":"BrandStrategyEntity","collection":"brand-evolution","description":"Personal brand strategy evolution and positioning tracking","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: content-metrics (metadata: {"source":"entity-decorator","entityName":"ContentPerformanceEntity","collection":"content-metrics","description":"Social media and content performance analytics","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: developer-profiles (metadata: {"source":"entity-decorator","entityName":"DeveloperProfileEntity","collection":"developer-profiles","description":"Comprehensive developer profiles with GitHub analysis","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: brand-mentions (metadata: {"source":"entity-decorator","entityName":"BrandMentionEntity","collection":"brand-mentions","description":"Real-time brand mentions with sentiment and reach analysis","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})  
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: tech-trends (metadata: {"source":"entity-decorator","entityName":"TechTrendEntity","collection":"tech-trends","description":"Technology trends and market analysis for content strategy","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: audience-analysis (metadata: {"source":"entity-decorator","entityName":"AudienceAnalysisEntity","collection":"audience-analysis","description":"Developer audience segmentation and engagement analysis","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] 🔄 Initializing collection: competitor-analysis (metadata: {"source":"entity-decorator","entityName":"CompetitorAnalysisEntity","collection":"competitor-analysis","description":"Competitive intelligence for developer profiles","autoEmbed":true,"embeddingFields":["content"],"autoTimestamp":true,"autoGenerateIds":true,"idStrategy":"uuid"})
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'vector-memories' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'langgraph-stores' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [LangGraphStoreRepository] LangGraphStoreRepository initialized with collection: langgraph-stores
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'dev-achievements' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'brand-evolution' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'content-metrics' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'developer-profiles' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'brand-mentions' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'tech-trends' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'audience-analysis' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [CollectionRegistryService] Collection 'competitor-analysis' already initialized or in progress - reusing existing promise
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaVectorAdapter] ChromaVectorAdapter initialized with VectorMemoryRepository + LangGraphStoreRepository (dual-collection pattern)
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [InstanceLoader] ChromaDBModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-g59xmwd69] Semaphore acquired after 5ms wait (active: 1, queued: 9)
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-g59xmwd69] Starting ChromaDB operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: false,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-03T09:53:20.456Z'
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM WARN [ChromaDBConnectionService] [op-1762163600451-g59xmwd69] Connection not established, reconnecting...
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-fhgasc3x4] Semaphore acquired after 12ms wait (active: 2, queued: 8)
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-fhgasc3x4] Starting ChromaDB operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: false,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-03T09:53:20.463Z'
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM WARN [ChromaDBConnectionService] [op-1762163600451-fhgasc3x4] Connection not established, reconnecting...
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-ky3j6y91b] Semaphore acquired after 13ms wait (active: 3, queued: 7)
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-ky3j6y91b] Starting ChromaDB operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: false,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-03T09:53:20.464Z'
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM WARN [ChromaDBConnectionService] [op-1762163600451-ky3j6y91b] Connection not established, reconnecting...
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] Semaphore acquired after 14ms wait (active: 4, queued: 6)
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] Starting ChromaDB operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: false,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-03T09:53:20.466Z'
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM WARN [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] Connection not established, reconnecting...
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] Semaphore acquired after 15ms wait (active: 5, queued: 5)
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] Starting ChromaDB operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: false,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-03T09:53:20.466Z'
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM WARN [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] Connection not established, reconnecting...
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 42ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] Attempt 1/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 43
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 50ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] Attempt 1/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 52
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 54ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-ky3j6y91b] Attempt 1/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 55
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 59ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-fhgasc3x4] Attempt 1/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 59
}
[Nest] 30928 - 11/03/2025, 11:53:20 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 68ms
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-g59xmwd69] Attempt 1/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:20 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 70
}
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] NeogmaModule dependencies initialized +799ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: Memory
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: StoreItem
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: ApprovalChain
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: ApprovalRequest
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: InterruptionPoint
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: ConfidencePattern
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: FeedbackEntry
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: Developer
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [NeogmaService] Registered model: Achievement
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [NeogmaConnectionService] NeogmaConnectionService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [StoreGraphRepository] StoreGraphRepository initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [FeedbackRepository] FeedbackRepository initialized with base class pattern
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [MemoryGraphRepository] MemoryGraphRepository initialized with composition pattern
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [Neo4jHitlStorageAdapter] Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [Neo4jInterruptionStorageAdapter] Neo4jInterruptionStorageAdapter initialized with InterruptionRepository
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [Neo4jFeedbackStorageAdapter] Neo4jFeedbackStorageAdapter initialized with FeedbackRepository
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [Neo4jConfidenceStorageAdapter] 🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [Neo4jGraphAdapter] Neo4jGraphAdapter initialized with MemoryGraphRepository
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] Neo4jModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [Neo4jApprovalChainStorageAdapter] Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [AgentMemoryCoreService] AgentMemoryCoreService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [AgentMemoryCheckpointService] AgentMemoryCheckpointService initialized with full capabilities (checkpoint + vector + graph)
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] RepositoryModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [AgentMemoryContextService] AgentMemoryContextService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [MemoryGraphService] MemoryGraphService initialized with configuration
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [MemoryGraphService] Object(2) {
neo4jDatabase: 'neo4j',
enableAutoSummarization: false
}
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] AdaptersModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [AgentMemoryBridgeService] AgentMemoryBridge initialized (orchestrator pattern) with specialized services
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [BackgroundMemoryService] BackgroundMemoryService initialized with automatic flushing
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [MemoryAccessTools] ✅ Memory Access Tools initialized with IMemoryAdapter
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [HitlMemoryLearningService] 🧠 HITL Memory Learning Service initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] MemoryModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [MemoryCoordinationService] Memory adapter available - memory superpowers enabled
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [MemoryCoordinationService] BackgroundMemoryService available - using batched async writes
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [HitlTimeoutService] HitlTimeoutService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [HitlTimeoutService] Object(2) {
storageAvailable: true,
notificationsAvailable: true
}
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [HitlRecoveryService] 🔧 HITL Recovery Service initialized with persistent storage
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [UserInterruptionService] ✅ Memory adapter available for interruption pattern learning
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [ApprovalChainService] 🔗 Approval Chain Service initialized with adapter-first storage + IMemoryAdapter.getStore() for hierarchical tracking
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [FeedbackProcessorService] 💬 Feedback Processor Service initialized with adapter-first storage
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [ConfidenceEvaluatorService] 🧠 Confidence Evaluator Service initialized with adapter-first storage
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] TimeTravelModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] WorkflowEngineModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] FunctionalApiModule dependencies initialized +1ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [HitlApprovalRequestService] 📝 HITL Approval Request Service initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [HumanApprovalService] 🎯 Human Approval Service initialized with specialized services
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] HitlModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [StreamCoordinationService] Streaming service available:
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [StreamCoordinationService] true
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [MultiAgentCoordinatorService] Memory adapter available - memory superpowers enabled
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [WorkflowCheckpointService] WorkflowCheckpointService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [WorkflowCheckpointService] Checkpoint adapter available - checkpoint operations enabled
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [WorkflowInstanceService] WorkflowInstanceService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [WorkflowInstanceService] Tool registry available with 0 registered tools
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] BusinessWorkflowsModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] AppModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [WorkflowExecutionService] WorkflowExecutionService initialized
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [WorkflowExecutionService] Checkpoint service available - automatic checkpointing enabled
[Nest] 30928 - 11/03/2025, 11:53:21 AM DEBUG [WorkflowManagerService] WorkflowManagerService initialized with specialized services
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [InstanceLoader] MultiAgentModule dependencies initialized +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RoutesResolver] HealthController {/api/health}: +41ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/health, GET} route +2ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +1ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RoutesResolver] DevBrandController {/api/devbrand}: +0ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [RouterExplorer] Mapped {/api/devbrand/execute, POST} route +1ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [CheckpointManagerService] ✅ Checkpoint system initialized with 1 saver(s): primary
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [CheckpointCleanupService] Checkpoint cleanup scheduler started (interval: 3600000ms)
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [CheckpointHealthService] Health monitoring started (interval: 30000ms)
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [CheckpointManagerService] Checkpoint background services started: cleanup, health monitoring
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [UserInterruptionService] ✅ UserInterruptionService initialized (lazy-loading enabled - state loads when workflows resume)
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [ApprovalChainService] ✅ ApprovalChainService initialized (lazy-loading enabled - chains load on-demand)
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [FeedbackProcessorService] ✅ FeedbackProcessorService initialized (lazy-loading enabled - feedback loads on-demand)
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [HumanApprovalService] Human Approval Service initializing with specialized services
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [HitlRecoveryService] 🔄 Starting recovery of ALL pending approvals from persistent storage
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
[Nest] 30928 - 11/03/2025, 11:53:21 AM LOG [ConfidenceEvaluatorService] ✅ ConfidenceEvaluatorService initialized (lazy-loading enabled - patterns load on-demand)
[Nest] 30928 - 11/03/2025, 11:53:23 AM ERROR [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] ❌ FAILED on attempt 1/3
[Nest] 30928 - 11/03/2025, 11:53:23 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2743,
totalTime: 2744,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 30928 - 11/03/2025, 11:53:23 AM WARN [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] ⏳ Waiting 1000ms before retry 2...
[Nest] 30928 - 11/03/2025, 11:53:23 AM ERROR [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] ❌ FAILED on attempt 1/3
[Nest] 30928 - 11/03/2025, 11:53:23 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2747,
totalTime: 2748,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 30928 - 11/03/2025, 11:53:23 AM WARN [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] ⏳ Waiting 1000ms before retry 2...
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-3cws5eb0l] Attempt 2/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3757
}
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ChromaDBConnectionService] [op-1762163600451-jxl5t7zp5] Attempt 2/3 - executing operation
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3760
}
[Safe] getPendingApprovals - Completed successfully in 3576ms
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [HitlRecoveryService] ✅ No pending approvals found to recover
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [WorkflowStreamService] Initializing WorkflowStreamService
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [WorkflowStreamService] Checkpoint adapter available: true
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MultiAgentCoordinatorService] Multi-agent coordinator service initialized with SOLID architecture
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [ToolRegistrationService] Auto-registering 4 tool providers from module config
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [ToolRegistrationService] Registering 4 tool providers
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: search-memory
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: search-memory from MemoryAccessTools.searchMemory
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: get-user-patterns
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: get-user-patterns from MemoryAccessTools.getUserPatterns
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: store-memory
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: store-memory from MemoryAccessTools.storeMemory
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: web-search
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: web-search from WebResearchTools.webSearch
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: news-search
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: news-search from WebResearchTools.newsSearch
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: social-profile-search
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: social-profile-search from WebResearchTools.searchSocialProfiles
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: research-search
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: research-search from WebResearchTools.researchSearch
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: github-analyzer
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: github-analyzer from GitHubIntegrationTools.analyzeGitHubActivity
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: achievement-extractor
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: achievement-extractor from GitHubIntegrationTools.extractAchievements
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: developer-insights
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: developer-insights from GitHubIntegrationTools.generateDeveloperInsights
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: ai-synthesis
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: ai-synthesis from GitHubIntegrationTools.synthesizeInsights
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: memory-analysis
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: memory-analysis from BrandStrategistTools.analyzeMemory
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: brand-optimization
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: brand-optimization from BrandStrategistTools.optimizeBrand
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistryService] Registered tool: strategy-generation
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ToolRegistrationService] Registered tool: strategy-generation from BrandStrategistTools.generateStrategy
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [ToolRegistrationService] Successfully registered 4 tool providers
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [FunctionalApiModuleInitializer] Initializing FunctionalApi module with explicit registration
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [FunctionalApiModuleInitializer] No workflows provided for registration
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [FunctionalApiModuleInitializer] FunctionalApi module initialization completed successfully
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [TimeTravelService] ✅ Checkpoint operations delegated to injected checkpoint adapter
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [TimeTravelService] 🚀 Time Travel facade service initialized with focused services
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [GitHubCodeAnalyzerAgent] Initializing declarative workflow: workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [GitHubCodeAnalyzerAgent] Extracting workflow definition from decorators for GitHubCodeAnalyzerAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Extracting workflow definition from GitHubCodeAnalyzerAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for GitHubCodeAnalyzerAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Found 6 task-based nodes for workflow github-analyzer-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MetadataProcessorService] Generated task-based workflow definition for github-analyzer-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Validating workflow definition: github-analyzer-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MetadataProcessorService] Workflow definition validation completed for github-analyzer-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [GitHubCodeAnalyzerAgent] Workflow 'github-analyzer-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [GitHubCodeAnalyzerAgent] Declarative workflow initialized successfully: workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [PersonalBrandStrategistAgent] Initializing declarative workflow: workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [PersonalBrandStrategistAgent] Extracting workflow definition from decorators for PersonalBrandStrategistAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Extracting workflow definition from PersonalBrandStrategistAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for PersonalBrandStrategistAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Found 7 nodes for workflow brand-strategist-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Found 7 edges for workflow brand-strategist-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MetadataProcessorService] Generated node-based workflow definition for brand-strategist-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Validating workflow definition: brand-strategist-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MetadataProcessorService] Workflow definition validation completed for brand-strategist-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [PersonalBrandStrategistAgent] Workflow 'brand-strategist-workflow': 7 nodes, 7 edges, 0 approval nodes, 0 streaming nodes
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [PersonalBrandStrategistAgent] Declarative workflow initialized successfully: workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [ContentCreatorAgent] Initializing declarative workflow: workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ContentCreatorAgent] Extracting workflow definition from decorators for ContentCreatorAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Extracting workflow definition from ContentCreatorAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for ContentCreatorAgent
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Found 6 nodes for workflow content-creator-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Found 5 edges for workflow content-creator-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MetadataProcessorService] Generated node-based workflow definition for content-creator-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [MetadataProcessorService] Validating workflow definition: content-creator-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [MetadataProcessorService] Workflow definition validation completed for content-creator-workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [ContentCreatorAgent] Workflow 'content-creator-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [ContentCreatorAgent] Declarative workflow initialized successfully: workflow
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [DevBrandSupervisorWorkflow] Initializing multi-agent workflow: devbrand-supervisor-network (supervisor)
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [DevBrandSupervisorWorkflow] Created 3 agent definitions: github-code-analyzer, personal-brand-strategist, content-creator
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [WorkflowRegistryService] Initialized status tracking for agent github-code-analyzer
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [WorkflowRegistryService] Initialized status tracking for agent personal-brand-strategist
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [WorkflowRegistryService] Initialized status tracking for agent content-creator
[Nest] 30928 - 11/03/2025, 11:53:24 AM WARN [AgentRegistryService] Agent github-code-analyzer is already registered, updating definition
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 30928 - 11/03/2025, 11:53:24 AM WARN [AgentRegistryService] Agent personal-brand-strategist is already registered, updating definition
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 30928 - 11/03/2025, 11:53:24 AM WARN [AgentRegistryService] Agent content-creator is already registered, updating definition
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [NetworkManagerService] LangGraph checkpointer configured for network devbrand-supervisor-network
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [NetworkManagerService] Added checkpointer to network devbrand-supervisor-network compilation options
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [GraphBuilderService] Building supervisor graph with agents:
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [GraphBuilderService] Array(3) [
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
]
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [LlmProviderService] Creating new LLM instance: minimax/minimax-m2:free
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [LlmProviderService] Creating OpenRouter LLM with model: minimax/minimax-m2:free
[Nest] 30928 - 11/03/2025, 11:53:24 AM DEBUG [GraphBuilderService] Applied interruptBefore from agent metadata: content-creator
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [NetworkManagerService] Created supervisor network: devbrand-supervisor-network with 3 agents
[Nest] 30928 - 11/03/2025, 11:53:24 AM LOG [DevBrandSupervisorWorkflow] ✅ Multi-agent network initialized: devbrand-supervisor-network with 3 agents
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [NestApplication] Nest application successfully started +8ms
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG 🚀 Initializing streaming services...
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [AppStreamingManager] 🚀 Initializing application streaming services...
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [AppStreamingManager] 📡 Starting TokenStreamingService...
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [TokenStreamingService] 🚀 Starting TokenStreamingService...
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [TokenStreamingService] ✅ TokenStreamingService started successfully
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [AppStreamingManager] 🌉 Starting WebSocketBridgeService...
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [WebSocketBridgeService] 🚀 Starting WebSocketBridgeService...
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [WebSocketBridgeService] Getting global token stream...
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [WebSocketBridgeService] Token stream obtained, subscribing...
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [WebSocketBridgeService] ✅ WebSocketBridgeService started successfully
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [AppStreamingManager] 🔌 Starting StreamingWebSocketService...
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [StreamingWebSocketService] 🚀 Starting StreamingWebSocketService...
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [WebSocketBridgeService] WebSocket gateway registered with bridge service
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [StreamingWebSocketService] Bridge service integration configured
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [StreamingWebSocketService] ✅ WebSocket service started successfully on port: 8080
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [AppStreamingManager] ✅ All streaming services initialized successfully!
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG [AppStreamingManager] 📊 Streaming stats: {"tokensStreamed":0,"activeConnections":0,"errors":0,"uptime":0,"lastActivity":"2025-11-03T09:53:25.006Z"}
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG ✅ Streaming services initialized successfully
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG 🔌 WebSocket streaming available at: ws://localhost:3000/streaming
[Nest] 30928 - 11/03/2025, 11:53:25 AM LOG 🌊 Frontend should connect to: ws://localhost:3000/streaming
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [LlmProviderService] Using cached LLM: minimax/minimax-m2:free
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [WebSocketBridgeService] Token stream integration setup completed
[Nest] 30928 - 11/03/2025, 11:53:25 AM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
