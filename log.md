[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [MetadataProcessorService] Extracting workflow definition from ContentCreatorAgent
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for ContentCreatorAgent
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [MetadataProcessorService] Found 6 nodes for workflow content-creator-workflow
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [MetadataProcessorService] Found 5 edges for workflow content-creator-workflow
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [MetadataProcessorService] Generated node-based workflow definition for content-creator-workflow
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [MetadataProcessorService] Validating workflow definition: content-creator-workflow
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [MetadataProcessorService] Workflow definition validation completed for content-creator-workflow
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [ContentCreatorAgent] Workflow 'content-creator-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [ContentCreatorAgent] Declarative workflow initialized successfully: workflow
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [DevBrandSupervisorWorkflow] Initializing multi-agent workflow: devbrand-supervisor-network (supervisor)
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [DevBrandSupervisorWorkflow] Created 3 agent definitions: github-code-analyzer, personal-brand-strategist, content-creator
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent github-code-analyzer
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent personal-brand-strategist
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent content-creator
[Nest] 5344 - 11/07/2025, 8:28:55 PM WARN [AgentRegistryService] Agent github-code-analyzer is already registered, updating definition
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 5344 - 11/07/2025, 8:28:55 PM WARN [AgentRegistryService] Agent personal-brand-strategist is already registered, updating definition
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 5344 - 11/07/2025, 8:28:55 PM WARN [AgentRegistryService] Agent content-creator is already registered, updating definition
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [NetworkManagerService] LangGraph checkpointer configured for network devbrand-supervisor-network
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [NetworkManagerService] Added checkpointer to network devbrand-supervisor-network compilation options
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [GraphBuilderService] Building supervisor graph with agents:
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [GraphBuilderService] Array(3) [
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
]
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [LlmProviderService] Creating new LLM instance: minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [LlmProviderService] Creating OpenRouter LLM with model: minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [GraphBuilderService] Applied interruptBefore from agent metadata: content-creator
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [NetworkManagerService] [DIAGNOSTIC] Graph compiled successfully for devbrand-supervisor-network:
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [NetworkManagerService] Object(11) {
graphType: 'object',
hasChannels: true,
channelKeys: [
'messages',
'next',
'current',
'scratchpad',
'task',
'threadId',
'userId',
'metadata',
'__start__',
'__pregel_tasks',
'branch:to:supervisor',
'branch:to:github-code-analyzer',
'branch:to:personal-brand-strategist',
'branch:to:content-creator'
],
channelCount: 14,
graphConstructorName: 'CompiledStateGraph',
hasInputChannel: false,
hasBuilder: true,
hasNodes: true,
nodeKeys: [
'__start__',
'supervisor',
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
],
hasStateSchema: false,
hasSpec: false
}
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [NetworkManagerService] Created supervisor network: devbrand-supervisor-network with 3 agents
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [DevBrandSupervisorWorkflow] ✅ Multi-agent network initialized: devbrand-supervisor-network with 3 agents
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [NestApplication] Nest application successfully started +26ms
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG 🚀 Initializing streaming services...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AppStreamingManager] 🚀 Initializing application streaming services...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AppStreamingManager] 📡 Starting TokenStreamingService...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [TokenStreamingService] 🚀 Starting TokenStreamingService...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [TokenStreamingService] ✅ TokenStreamingService started successfully
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AppStreamingManager] 🌉 Starting WebSocketBridgeService...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [WebSocketBridgeService] 🚀 Starting WebSocketBridgeService...
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WebSocketBridgeService] Getting global token stream...
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WebSocketBridgeService] Token stream obtained, subscribing...
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [WebSocketBridgeService] ✅ WebSocketBridgeService started successfully
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AppStreamingManager] 🔌 Starting StreamingWebSocketService...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [StreamingWebSocketService] 🚀 Starting StreamingWebSocketService...
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [StreamingWebSocketService] Setting up Socket.io namespace: /streaming
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WebSocketBridgeService] WebSocket gateway registered with bridge service
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [StreamingWebSocketService] Bridge service integration configured
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [StreamingWebSocketService] ✅ WebSocket service started successfully on port: 8080
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AppStreamingManager] ✅ All streaming services initialized successfully!
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG [AppStreamingManager] 📊 Streaming stats: {"tokensStreamed":0,"activeConnections":0,"errors":0,"uptime":0,"lastActivity":"2025-11-07T18:28:55.685Z"}
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG ✅ Streaming services initialized successfully
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG 🔌 WebSocket streaming available at: ws://localhost:8080/streaming
[Nest] 5344 - 11/07/2025, 8:28:55 PM LOG 🌊 Frontend should connect to: ws://localhost:8080/streaming
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [LlmProviderService] Using cached LLM: minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WebSocketBridgeService] Token stream integration setup completed
[Nest] 5344 - 11/07/2025, 8:28:55 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 5344 - 11/07/2025, 8:28:59 PM LOG [LlmProviderService] LLM connectivity test PASSED for provider=openrouter, model=minimax/minimax-m2:free
[Nest] 5344 - 11/07/2025, 8:28:59 PM LOG [MultiAgentCoordinatorService] LLM connectivity verified
[Nest] 5344 - 11/07/2025, 8:28:59 PM DEBUG [StreamCoordinationService] Setting up agent streaming hooks
[Nest] 5344 - 11/07/2025, 8:29:24 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 5344 - 11/07/2025, 8:29:25 PM LOG [DevBrandController] 🚀 Starting DevBrand workflow for GitHub user: abdallah-khalil (executionId: devbrand-1762540165287)
[Nest] 5344 - 11/07/2025, 8:29:25 PM LOG [WorkflowStreamingOrchestrator] 🚀 Starting workflow with streaming: devbrand-1762540165287
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [EventStreamProcessorService] Processed event events for exec_devbrand-supervisor-network_1762540165288:workflow_start
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] Executing workflow on network devbrand-supervisor-network
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] Object(5) {
type: 'supervisor',
messageCount: 1,
threadId: 'multi-agent|execution:devbrand-supervisor-network:1762540165288',
currentAgent: 'supervisor',
executionId: 'exec_320214fb-0ff9-48b3-bcf0-c17b5d82823a'
}
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] [DIAGNOSTIC] Graph details before invoke:
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] Object(5) {
networkId: 'devbrand-supervisor-network',
graphType: 'object',
hasChannels: true,
channelKeys: [
'messages',
'next',
'current',
'scratchpad',
'task',
'threadId',
'userId',
'metadata',
'__start__',
'__pregel_tasks',
'branch:to:supervisor',
'branch:to:github-code-analyzer',
'branch:to:personal-brand-strategist',
'branch:to:content-creator'
],
graphCompiled: false
}
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] [DIAGNOSTIC] Initial state being passed to invoke:
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] Object(6) {
stateKeys: [
'messages',
'threadId',
'current',
'metadata'
],
messagesCount: 1,
hasThreadId: true,
hasCurrent: true,
hasMetadata: true,
metadataKeys: [
'networkId',
'networkType',
'startTime',
'executionId'
]
}
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] [DIAGNOSTIC] Invoke config:
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] Object(5) {
hasConfig: true,
configKeys: [
'metadata',
'checkpointer',
'configurable',
'tags'
],
configurableKeys: [
'thread_id',
'networkId',
'networkType'
],
hasCheckpointer: false,
hasThreadId: true
}
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [NetworkManagerService] [DIAGNOSTIC] Calling graph.invoke()...
[Nest] 5344 - 11/07/2025, 8:29:25 PM LOG [WebSocketBridgeService] Registered client 8a16027b-74ce-42e7-8f6f-cb73c9ae2b7d with rooms: []
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [StreamingWebSocketService] Client connected: 8a16027b-74ce-42e7-8f6f-cb73c9ae2b7d (::1)
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [WebSocketBridgeService] Linked client 8a16027b-74ce-42e7-8f6f-cb73c9ae2b7d to execution devbrand-1762540165287
[Nest] 5344 - 11/07/2025, 8:29:25 PM DEBUG [StreamingWebSocketService] Client 8a16027b-74ce-42e7-8f6f-cb73c9ae2b7d subscribed to execution: devbrand-1762540165287
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [NodeFactoryService] Supervisor routing to: github-code-analyzer
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [NodeFactoryService] Object(2) {
reasoning: undefined,
task: 'Analyze GitHub profile for abdallah-khalil to extract achievements, technical skills, and project highlights. Focus on repository contributions, technologies used, impact metrics, and standout projects that can be leveraged for personal branding.'
}
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [NodeFactoryService] Executing worker agent: github-code-analyzer
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [NodeFactoryService] Object(2) {
task: 'Analyze GitHub profile for abdallah-khalil to extract achievements, technical skills, and project highlights. Focus on repository contributions, technologies used, impact metrics, and standout projects that can be leveraged for personal branding.',
messageCount: 1
}
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Executing worker agent...
[Nest] 5344 - 11/07/2025, 8:29:40 PM LOG [GitHubCodeAnalyzerAgent] Initializing declarative workflow: workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM LOG [GitHubCodeAnalyzerAgent] Initializing workflow: workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [GitHubCodeAnalyzerAgent] Building graph from decorators for GitHubCodeAnalyzerAgent
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [WorkflowGraphBuilderService] Building workflow graph from decorators: GitHubCodeAnalyzerAgent
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [MetadataProcessorService] Extracting workflow definition from GitHubCodeAnalyzerAgent
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for GitHubCodeAnalyzerAgent
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [MetadataProcessorService] Found 6 task-based nodes for workflow github-analyzer-workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM LOG [MetadataProcessorService] Generated task-based workflow definition for github-analyzer-workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [MetadataProcessorService] Validating workflow definition: github-analyzer-workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM LOG [MetadataProcessorService] Workflow definition validation completed for github-analyzer-workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [WorkflowGraphBuilderService] Workflow 'github-analyzer-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [WorkflowGraphBuilderService] Building workflow graph: github-analyzer-workflow
[Nest] 5344 - 11/07/2025, 8:29:40 PM WARN [AgentMemoryBridgeService] No agent ID found in state, using default-agent
[Nest] 5344 - 11/07/2025, 8:29:40 PM WARN [AgentMemoryBridgeService] No thread identifier found in state, using timestamp-based fallback: thread-1762540180871
[Nest] 5344 - 11/07/2025, 8:29:40 PM WARN [AgentMemoryBridgeService] AgentState missing required properties for memory operations
[Nest] 5344 - 11/07/2025, 8:29:40 PM WARN [AgentMemoryBridgeService] Object(5) {
hasCurrent: false,
hasThreadId: false,
fallbackAgentId: 'default-agent',
fallbackThreadId: 'thread-1762540180871',
metadata: {
agentId: 'workflow-graph-builder',
graphType: 'medium',
nodeCount: 6,
edgeCount: 5
}
}
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [AgentMemoryContextService] Getting memory context for agent default-agent in thread thread-1762540180871
[Nest] 5344 - 11/07/2025, 8:29:40 PM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully generated embeddings for 1 queries
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184925-xaowf0m3w] Semaphore acquired after 3ms wait (active: 1, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184925-xaowf0m3w] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:44.928Z'
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184925-xaowf0m3w] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184929-47luu6hb6] Semaphore acquired after 2ms wait (active: 2, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184929-47luu6hb6] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:44.931Z'
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184929-47luu6hb6] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184929-47luu6hb6] ✅ SUCCESS in 10ms (total: 10ms)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 10
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184929-47luu6hb6] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBDocumentService] Search returned 0 results from collection 'vector-memories'
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184925-xaowf0m3w] ✅ SUCCESS in 29ms (total: 30ms)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 29
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184925-xaowf0m3w] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [CacheOperationsService] Cache set for key: chroma:277324863 (expires in 300000ms)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 5344 - 11/07/2025, 8:29:44 PM WARN [ChromaDBEmbeddingProcessorService] Failed to generate query embeddings: No valid text content provided for embedding generation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] Semaphore acquired after 0ms wait (active: 1, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:44.960Z'
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-6io3qiu0z] Semaphore acquired after 0ms wait (active: 2, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-6io3qiu0z] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:44.960Z'
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-6io3qiu0z] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-6io3qiu0z] ✅ SUCCESS in 4ms (total: 5ms)
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 4
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-6io3qiu0z] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:44 PM ERROR [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] ❌ FAILED on attempt 1/3
[Nest] 5344 - 11/07/2025, 8:29:44 PM ERROR [ChromaDBConnectionService] Object(10) {
duration: 8,
totalTime: 8,
errorType: 'UNKNOWN',
errorMessage: "Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace",
originalError: undefined,
errorCode: undefined,
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: "ChromaClientError: Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace\n at D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:5646:15\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)"
}
[Nest] 5344 - 11/07/2025, 8:29:44 PM WARN [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] ⏳ Waiting 1000ms before retry 2...
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] Attempt 2/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1012
}
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] [op-1762540185972-lbej5nare] Semaphore acquired after 7ms wait (active: 2, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] [op-1762540185972-lbej5nare] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:45.979Z'
}
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] [op-1762540185972-lbej5nare] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] [op-1762540185972-lbej5nare] ✅ SUCCESS in 4ms (total: 5ms)
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 4
}
[Nest] 5344 - 11/07/2025, 8:29:45 PM DEBUG [ChromaDBConnectionService] [op-1762540185972-lbej5nare] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:45 PM ERROR [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] ❌ FAILED on attempt 2/3
[Nest] 5344 - 11/07/2025, 8:29:45 PM ERROR [ChromaDBConnectionService] Object(10) {
duration: 13,
totalTime: 1025,
errorType: 'UNKNOWN',
errorMessage: "Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace",
originalError: undefined,
errorCode: undefined,
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: "ChromaClientError: Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace\n at D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:5646:15\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)"
}
[Nest] 5344 - 11/07/2025, 8:29:45 PM WARN [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] ⏳ Waiting 1000ms before retry 3...
[Nest] 5344 - 11/07/2025, 8:29:46 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] Attempt 3/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:46 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2035
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540186996-mzs0t2tu9] Semaphore acquired after 6ms wait (active: 2, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540186996-mzs0t2tu9] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:47.002Z'
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540186996-mzs0t2tu9] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540186996-mzs0t2tu9] ✅ SUCCESS in 3ms (total: 4ms)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 3
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540186996-mzs0t2tu9] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] ❌ FAILED on attempt 3/3
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [ChromaDBConnectionService] Object(10) {
duration: 12,
totalTime: 2047,
errorType: 'UNKNOWN',
errorMessage: "Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace",
originalError: undefined,
errorCode: undefined,
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: "ChromaClientError: Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace\n at D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:5646:15\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)"
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] 🔴 FINAL FAILURE after 2047ms
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [ChromaDBConnectionService] Object(5) {
totalAttempts: 3,
finalError: "Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace",
originalErrorCode: undefined,
originalErrorMessage: undefined,
connectionConfig: {
host: 'localhost',
port: 8000,
ssl: false
}
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540184960-mvzfwnn3y] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [VectorMemoryRepository] Failed to search memories
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [VectorMemoryRepository] ChromaClientError: Failed to search documents in collection 'vector-memories': Input validation failed: Text at index 0 is empty or only whitespace
at D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:5646:15
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async ChromaDBConnectionService.executeWithRetryInternal (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3606:24)
at async ChromaDBConnectionService.executeWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3570:14)
at async ChromaDBPerformanceService.executeWithMonitoring (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:6699:22)
at async VectorMemoryRepository.searchWithScores (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:1486:20)
at async VectorMemoryRepository.searchMemoriesSimilar (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:4952:23)
at async ChromaVectorAdapter.searchMemoriesSimilar (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:6238:12)
at async AgentMemoryCoreService.searchAgentMemories (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2250:24)
at async AgentMemoryContextService.getAgentMemoryContext (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2363:37) {
cause: undefined
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [AgentMemoryCoreService] Failed to search agent memories: Failed to search memories
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryContextService] Retrieved 0 memories for agent default-agent (confidence: 0.5, time: 6137ms)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [GraphOptimizationService] [enhanceWithOptimizationPatterns] Calling memoryAdapter.search with:
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [GraphOptimizationService] query: "graph optimization patterns" (type: string, length: 27)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [GraphOptimizationService] namespace: ["graphs.compilation.optimizations"]
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [GraphOptimizationService] limit: 10
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryBridgeService] [AgentMemoryBridgeService.search] Incoming search:
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryBridgeService] query: "graph optimization patterns" (type: string, length: 27)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryBridgeService] namespace: ["graphs.compilation.optimizations"]
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryBridgeService] threadId: undefined, userId: undefined, agentId: undefined
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryBridgeService] limit: 10, minRelevance: undefined
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryBridgeService] [AgentMemoryBridgeService.search] Calling store.search with namespace: ["graphs.compilation.optimizations"], query: "graph optimization patterns"
[Nest] 5344 - 11/07/2025, 8:29:47 PM WARN [LangGraphStoreRepository] [searchInNamespace] Empty or invalid query received: ""
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [LangGraphStoreRepository] Failed to search store items with prefix [graphs.compilation.optimizations]
[Nest] 5344 - 11/07/2025, 8:29:47 PM ERROR [LangGraphStoreRepository] Error: Query text cannot be empty or whitespace. Received: "" (type: string)
at LangGraphStoreRepository.searchItems (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5375:15)
at ChromaVectorAdapter.searchStoreItems (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:6345:42)
at StoreStorageService.search (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3269:31)
at StoreService.searchStoreItems (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3649:47)
at Object.search (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2940:34)
at AgentMemoryBridgeService.search (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3114:20)
at GraphOptimizationService.enhanceWithOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1247:57)
at WorkflowGraphBuilderService.buildFromDefinition (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1786:59)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async WorkflowGraphBuilderService.buildFromDecorators (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1833:12)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [StoreService] Found 0 items with prefix [graphs.compilation.optimizations] in collection langgraph-stores
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [GraphOptimizationService] [enhanceWithOptimizationPatterns] Search returned 0 results
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [WorkflowExecutionService] Interrupt configuration will be applied during compilation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [WorkflowExecutionService] Object(1) {
before: []
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [AgentMemoryCoreService] Storing memory from agent workflow_graph_builder: {"graphName":"github-analyzer-workflow","graphType...
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187300-b3mj1gcx3] Semaphore acquired after 1ms wait (active: 1, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187300-b3mj1gcx3] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:47.301Z'
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187300-b3mj1gcx3] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187302-w8824zru1] Semaphore acquired after 10ms wait (active: 2, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187302-w8824zru1] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:47.313Z'
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187302-w8824zru1] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187302-w8824zru1] ✅ SUCCESS in 5ms (total: 5ms)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 5
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187302-w8824zru1] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBDocumentService] Added batch 1 with 1 documents
[Nest] 5344 - 11/07/2025, 8:29:47 PM LOG [ChromaDBDocumentService] Successfully added 1 documents to collection 'vector-memories'
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187300-b3mj1gcx3] ✅ SUCCESS in 55ms (total: 56ms)
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 55
}
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [ChromaDBConnectionService] [op-1762540187300-b3mj1gcx3] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:47 PM DEBUG [VectorMemoryRepository] Stored memory d184fa2b-904f-487e-9930-6974b15edfda for thread agent|memory:workflow-graph-builder:graphs-compilation-optimizations
[Safe] trackMemory - Preprocessing completed in 2ms {
originalArgs: [ '[Object]' ],
transformedArgs: [ '[Object]' ],
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
[Safe] trackMemory - Preprocessing completed in 0ms {
originalArgs: [ '[Object]' ],
transformedArgs: [ '[Object]' ],
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
autoInt: false,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 5344 - 11/07/2025, 8:29:50 PM DEBUG [GraphAgentService] Tracked memory d184fa2b-904f-487e-9930-6974b15edfda in graph
[Safe] trackMemory - Completed successfully in 3457ms
[Safe] trackMemory - Completed successfully in 3460ms
[Nest] 5344 - 11/07/2025, 8:29:50 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: d184fa2b-904f-487e-9930-6974b15edfda
[Nest] 5344 - 11/07/2025, 8:29:50 PM DEBUG [AgentMemoryCoreService] Storing memory from agent workflow-graph-builder: {"timestamp":"2025-11-07T18:29:50.819Z"}...
[Nest] 5344 - 11/07/2025, 8:29:50 PM DEBUG [WorkflowGraphBuilderService] Workflow graph built successfully: github-analyzer-workflow (6142.79ms)
[Nest] 5344 - 11/07/2025, 8:29:50 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 5344 - 11/07/2025, 8:29:50 PM LOG [GitHubCodeAnalyzerAgent] Executing workflow: workflow
💻 GitHub Code Analyzer: Starting developer analysis...
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Node initializeGitHubAnalysis failed:
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'messages')
at Object.initializeGitHubAnalysis (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197976)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3551:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Node analyzeGitHubActivity failed:
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.analyzeGitHubActivity (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:198399)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:183923)
at r.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186287)
at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185703
at CircuitBreakerImpl.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185097)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185689)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186873)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190901)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:191691)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3295:43)
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Node extractAchievements failed:
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.extractAchievements (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199129)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3551:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Node generateDeveloperInsights failed:
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.generateDeveloperInsights (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199767)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3551:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Node synthesizeWithAI failed:
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.synthesizeWithAI (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:200483)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3295:43)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3551:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Node finalizeAnalysis failed:
[Nest] 5344 - 11/07/2025, 8:29:50 PM ERROR [WorkflowExecutionService] Error: ApprovalEvaluatorService not initialized. Ensure HitlModule.forRoot() is imported in your root module.
at getApprovalEvaluatorService (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2622:11)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2707:34)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3551:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[Nest] 5344 - 11/07/2025, 8:29:50 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Worker agent completed
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191030-eipn186tx] Semaphore acquired after 17ms wait (active: 1, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191030-eipn186tx] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:51.047Z'
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191030-eipn186tx] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191048-78dr11o9l] Semaphore acquired after 1ms wait (active: 2, queued: 0)
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191048-78dr11o9l] Starting ChromaDB operation
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-07T18:29:51.049Z'
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191048-78dr11o9l] Attempt 1/3 - executing operation
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191048-78dr11o9l] ✅ SUCCESS in 3ms (total: 3ms)
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 3
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191048-78dr11o9l] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBDocumentService] Added batch 1 with 1 documents
[Nest] 5344 - 11/07/2025, 8:29:51 PM LOG [ChromaDBDocumentService] Successfully added 1 documents to collection 'vector-memories'
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191030-eipn186tx] ✅ SUCCESS in 35ms (total: 35ms)
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 35
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [ChromaDBConnectionService] [op-1762540191030-eipn186tx] Semaphore released
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [VectorMemoryRepository] Stored memory 0a50120a-bede-45a3-a538-6acd763f3ef9 for thread agent|memory:workflow-graph-builder:unknown
[Safe] trackMemory - Preprocessing completed in 0ms {
originalArgs: [ '[Object]' ],
transformedArgs: [ '[Object]' ],
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
[Safe] trackMemory - Preprocessing completed in 0ms {
originalArgs: [ '[Object]' ],
transformedArgs: [ '[Object]' ],
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
autoInt: false,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [GraphAgentService] Tracked memory 0a50120a-bede-45a3-a538-6acd763f3ef9 in graph
[Safe] trackMemory - Completed successfully in 287ms
[Safe] trackMemory - Completed successfully in 288ms
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: 0a50120a-bede-45a3-a538-6acd763f3ef9
[Nest] 5344 - 11/07/2025, 8:29:51 PM DEBUG [WorkflowGraphBuilderService] Stored builder execution for github-analyzer-workflow
