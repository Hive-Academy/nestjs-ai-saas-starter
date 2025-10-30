[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [UserInterruptionService] ✅ Successfully recovered 0 active interruptions from persistent storage
[Safe] getPendingApprovals - Completed successfully in 3474ms
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [HitlRecoveryService] ✅ No pending approvals found to recover
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Safe] getAllApprovalPatterns - Completed successfully in 3481ms
[Safe] getAllActivePatterns - Completed successfully in 3483ms
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
[Safe] getAllApprovalPatterns - Completed successfully in 31ms
[Safe] getAllActivePatterns - Completed successfully in 31ms
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [ConfidenceEvaluatorService] ✅ Loaded 0 patterns and 0 history entries from persistent storage
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [ConfidenceEvaluatorService] ✅ Confidence Evaluator Service initialized with storage adapter
[Safe] getAllExecutionFeedback - Completed successfully in 281ms
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [FeedbackProcessorService] ✅ Recovered 0 feedback entries across 0 executions
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
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [ApprovalChainService] ✅ Recovered 0 requests and 0 chains
[Nest] 27600 - 10/29/2025, 7:43:33 PM LOG [ApprovalChainService] ✅ Approval Chain Service initialized
[Safe] getUnprocessedFeedback - Completed successfully in 166ms
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [FeedbackProcessorService] 🔄 Starting processing pipeline for 0 unprocessed feedback entries
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [FeedbackProcessorService] ✅ Feedback Processor Service initialized
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [WorkflowStreamService] Initializing WorkflowStreamService
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [WorkflowStreamService] Checkpoint adapter available: true
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MultiAgentCoordinatorService] Multi-agent coordinator service initialized with SOLID architecture
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [FunctionalApiModuleInitializer] Initializing FunctionalApi module with explicit registration
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [FunctionalApiModuleInitializer] No workflows provided for registration
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [FunctionalApiModuleInitializer] FunctionalApi module initialization completed successfully
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [TimeTravelService] ✅ Checkpoint operations delegated to injected checkpoint adapter
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [TimeTravelService] 🚀 Time Travel facade service initialized with focused services
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [GitHubCodeAnalyzerAgent] Initializing declarative workflow: workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [GitHubCodeAnalyzerAgent] Extracting workflow definition from decorators for GitHubCodeAnalyzerAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Extracting workflow definition from GitHubCodeAnalyzerAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for GitHubCodeAnalyzerAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Found 6 task-based nodes for workflow github-analyzer-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MetadataProcessorService] Generated task-based workflow definition for github-analyzer-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Validating workflow definition: github-analyzer-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MetadataProcessorService] Workflow definition validation completed for github-analyzer-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [GitHubCodeAnalyzerAgent] Workflow 'github-analyzer-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [GitHubCodeAnalyzerAgent] Declarative workflow initialized successfully: workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [PersonalBrandStrategistAgent] Initializing declarative workflow: workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [PersonalBrandStrategistAgent] Extracting workflow definition from decorators for PersonalBrandStrategistAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Extracting workflow definition from PersonalBrandStrategistAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for PersonalBrandStrategistAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Found 7 nodes for workflow brand-strategist-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Found 7 edges for workflow brand-strategist-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MetadataProcessorService] Generated node-based workflow definition for brand-strategist-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Validating workflow definition: brand-strategist-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MetadataProcessorService] Workflow definition validation completed for brand-strategist-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [PersonalBrandStrategistAgent] Workflow 'brand-strategist-workflow': 7 nodes, 7 edges, 0 approval nodes, 0 streaming nodes
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [PersonalBrandStrategistAgent] Declarative workflow initialized successfully: workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [ContentCreatorAgent] Initializing declarative workflow: workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [ContentCreatorAgent] Extracting workflow definition from decorators for ContentCreatorAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Extracting workflow definition from ContentCreatorAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for ContentCreatorAgent
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Found 6 nodes for workflow content-creator-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Found 5 edges for workflow content-creator-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MetadataProcessorService] Generated node-based workflow definition for content-creator-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [MetadataProcessorService] Validating workflow definition: content-creator-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [MetadataProcessorService] Workflow definition validation completed for content-creator-workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [ContentCreatorAgent] Workflow 'content-creator-workflow': 6 nodes, 5 edges, 0 approval nodes, 0 streaming nodes
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [ContentCreatorAgent] Declarative workflow initialized successfully: workflow
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [DevBrandSupervisorWorkflow] Initializing multi-agent workflow: devbrand-supervisor-network (supervisor)
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [DevBrandSupervisorWorkflow] Created 3 agent definitions: github-code-analyzer, personal-brand-strategist, content-creator
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent github-code-analyzer
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent personal-brand-strategist
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WorkflowRegistryService] Initialized status tracking for agent content-creator
[Nest] 27600 - 10/29/2025, 7:43:34 PM WARN [AgentRegistryService] Agent github-code-analyzer is already registered, updating definition
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 27600 - 10/29/2025, 7:43:34 PM WARN [AgentRegistryService] Agent personal-brand-strategist is already registered, updating definition
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 27600 - 10/29/2025, 7:43:34 PM WARN [AgentRegistryService] Agent content-creator is already registered, updating definition
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
Health check failed: TypeError: Cannot read properties of undefined (reading 'getHealthSummary')
at CheckpointManagerAdapter.isHealthy (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:3131:52)
at NetworkManagerService.createCheckpointerForNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:3622:54)
at NetworkManagerService.prepareCompilationOptions (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:3645:39)
at NetworkManagerService.createNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:3264:45)
at NetworkSetupService.setupNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:18621:56)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async DevBrandSupervisorWorkflow.onModuleInit (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:23210:24)
at async Promise.all (index 3)
at async callModuleInitHook (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\hooks\on-module-init.hook.js:43:5)
at async NestApplication.callInitHook (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\nest-application-context.js:242:13)
[Nest] 27600 - 10/29/2025, 7:43:34 PM WARN [NetworkManagerService] Checkpoint adapter not healthy - using in-memory fallback
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [GraphBuilderService] Building supervisor graph with agents:
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [GraphBuilderService] Array(3) [
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
]
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [LlmProviderService] Creating new LLM instance: moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [LlmProviderService] Creating LLM instance: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [LlmProviderService] Creating OpenRouter LLM with model: moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [GraphBuilderService] Applied interruptBefore from agent metadata: content-creator
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [NetworkManagerService] Created supervisor network: devbrand-supervisor-network with 3 agents
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [DevBrandSupervisorWorkflow] ✅ Multi-agent network initialized: devbrand-supervisor-network with 3 agents
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [NestApplication] Nest application successfully started +22ms
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG 🚀 Initializing streaming services...
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AppStreamingManager] 🚀 Initializing application streaming services...
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AppStreamingManager] 📡 Starting TokenStreamingService...
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [TokenStreamingService] 🚀 Starting TokenStreamingService...
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [TokenStreamingService] ✅ TokenStreamingService started successfully
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AppStreamingManager] 🌉 Starting WebSocketBridgeService...
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [WebSocketBridgeService] 🚀 Starting WebSocketBridgeService...
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WebSocketBridgeService] Getting global token stream...
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WebSocketBridgeService] Token stream obtained, subscribing...
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [WebSocketBridgeService] ✅ WebSocketBridgeService started successfully
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AppStreamingManager] 🔌 Starting StreamingWebSocketService...
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [StreamingWebSocketService] 🚀 Starting StreamingWebSocketService...
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WebSocketBridgeService] WebSocket gateway registered with bridge service
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [StreamingWebSocketService] Bridge service integration configured
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [StreamingWebSocketService] ✅ WebSocket service started successfully on port: 8080
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AppStreamingManager] ✅ All streaming services initialized successfully!
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG [AppStreamingManager] 📊 Streaming stats: {"tokensStreamed":0,"activeConnections":0,"errors":0,"uptime":0,"lastActivity":"2025-10-29T16:43:34.148Z"}
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG ✅ Streaming services initialized successfully
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG 🔌 WebSocket streaming available at: ws://localhost:3000/streaming
[Nest] 27600 - 10/29/2025, 7:43:34 PM LOG 🌊 Frontend should connect to: ws://localhost:3000/streaming
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [LlmProviderService] Model configuration validated: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [LlmProviderService] Testing LLM connectivity: provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [LlmProviderService] Using cached LLM: moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WebSocketBridgeService] Token stream integration setup completed
[Nest] 27600 - 10/29/2025, 7:43:34 PM DEBUG [WebSocketBridgeService] Workflow stream integration setup completed
[Nest] 27600 - 10/29/2025, 7:43:38 PM LOG [LlmProviderService] LLM connectivity test PASSED for provider=openrouter, model=moonshotai/kimi-k2:free
[Nest] 27600 - 10/29/2025, 7:43:38 PM LOG [MultiAgentCoordinatorService] LLM connectivity verified
[Nest] 27600 - 10/29/2025, 7:43:38 PM DEBUG [StreamCoordinationService] Setting up agent streaming hooks
[Nest] 27600 - 10/29/2025, 7:43:59 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 27600 - 10/29/2025, 7:44:00 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 27600 - 10/29/2025, 7:44:29 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 27600 - 10/29/2025, 7:44:29 PM WARN [HealthCheckService] System health degraded:
[Nest] 27600 - 10/29/2025, 7:44:29 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 27600 - 10/29/2025, 7:44:29 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 27600 - 10/29/2025, 7:44:30 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 27600 - 10/29/2025, 7:44:59 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 27600 - 10/29/2025, 7:45:00 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 27600 - 10/29/2025, 7:45:29 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 27600 - 10/29/2025, 7:45:29 PM WARN [HealthCheckService] System health degraded:
[Nest] 27600 - 10/29/2025, 7:45:29 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 27600 - 10/29/2025, 7:45:29 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 27600 - 10/29/2025, 7:45:30 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 27600 - 10/29/2025, 7:45:59 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 27600 - 10/29/2025, 7:46:00 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 27600 - 10/29/2025, 7:46:25 PM LOG [DevBrandController] 🚀 Starting DevBrand workflow for GitHub user: abdallah-khalil (executionId: devbrand-1761756385935)
[Nest] 27600 - 10/29/2025, 7:46:25 PM LOG [WorkflowStreamingOrchestrator] 🚀 Starting workflow with streaming: devbrand-1761756385935
[Nest] 27600 - 10/29/2025, 7:46:25 PM ERROR [WorkflowExecutionCoordinationService] Failed to save checkpoint for thread multi-agent|network:devbrand-supervisor-network:
[Nest] 27600 - 10/29/2025, 7:46:25 PM ERROR [WorkflowExecutionCoordinationService] TypeError: Cannot read properties of undefined (reading 'saveCheckpoint')
at CheckpointManagerAdapter.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:3097:35)
at WorkflowExecutionCoordinationService.saveWorkflowCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:19570:36)
at WorkflowExecutionCoordinationService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:19415:20)
at MultiAgentCoordinatorService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:19676:35)
at DevBrandSupervisorWorkflow.executeCoordination (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:23234:31)
at DevBrandSupervisorWorkflow.executeWithStreaming (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:419476)
at executeWithStreaming.next (<anonymous>)
at WorkflowStreamingOrchestrator.consumeWorkflowStream (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3018:24)
at WorkflowStreamingOrchestrator.startWorkflowWithStreaming (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:2891:10)
at DevBrandController.executeDevBrand (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:440013)
[Nest] 27600 - 10/29/2025, 7:46:25 PM DEBUG [EventStreamProcessorService] Processed event events for exec_devbrand-supervisor-network_1761756385936:workflow_start
[Nest] 27600 - 10/29/2025, 7:46:25 PM DEBUG [NetworkManagerService] Executing workflow on network devbrand-supervisor-network
[Nest] 27600 - 10/29/2025, 7:46:25 PM DEBUG [NetworkManagerService] Object(3) {
type: 'supervisor',
messageCount: 1,
executionId: 'exec_6adefc82-a7f1-4ccb-9cfd-33522a4efa6c'
}
[Nest] 27600 - 10/29/2025, 7:46:25 PM LOG [WebSocketBridgeService] Registered client e1e90ce6-9c87-4998-ae80-db8b5c325147 with rooms: []
[Nest] 27600 - 10/29/2025, 7:46:25 PM DEBUG [StreamingWebSocketService] Client connected: e1e90ce6-9c87-4998-ae80-db8b5c325147 (::1)
[Nest] 27600 - 10/29/2025, 7:46:25 PM DEBUG [WebSocketBridgeService] Linked client e1e90ce6-9c87-4998-ae80-db8b5c325147 to execution devbrand-1761756385935
[Nest] 27600 - 10/29/2025, 7:46:25 PM DEBUG [StreamingWebSocketService] Client e1e90ce6-9c87-4998-ae80-db8b5c325147 subscribed to execution: devbrand-1761756385935
[Nest] 27600 - 10/29/2025, 7:46:28 PM ERROR [NodeFactoryService] Supervisor node execution failed:
[Nest] 27600 - 10/29/2025, 7:46:28 PM ERROR [NodeFactoryService] NotFoundError: 404 No endpoints found that support tool use. To learn more about provider routing, visit: <https://openrouter.ai/docs/provider-routing>

Troubleshooting URL: <https://js.langchain.com/docs/troubleshooting/errors/MODEL_NOT_FOUND/>

    at APIError.generate (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\openai\node_modules\openai\core\error.js:54:20)
    at OpenAI.makeStatusError (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\openai\node_modules\openai\client.js:159:32)
    at OpenAI.makeRequest (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\openai\node_modules\openai\client.js:304:30)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\openai\dist\chat_models.cjs:2023:28
    at async RetryOperation._fn (D:\projects\nestjs-ai-saas-starter\node_modules\p-retry\index.js:50:12) {

status: 404,
headers: Headers {
date: 'Wed, 29 Oct 2025 16:46:28 GMT',
'content-type': 'application/json',
'transfer-encoding': 'chunked',
connection: 'keep-alive',
'content-encoding': 'gzip',
'access-control-allow-origin': '_',
vary: 'Accept-Encoding',
'permissions-policy': 'payment=(self "<https://checkout.stripe.com>" "<https://connect-js.stripe.com>" "<https://js.stripe.com>" "https://_.js.stripe.com" "<https://hooks.stripe.com>")',
'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
'x-content-type-options': 'nosniff',
server: 'cloudflare',
'cf-ray': '99642625cb92361c-MRS'
},
requestID: null,
error: {
message: 'No endpoints found that support tool use. To learn more about provider routing, visit: <https://openrouter.ai/docs/provider-routing>',
code: 404
},
code: 404,
param: undefined,
type: undefined,
lc_error_code: 'MODEL_NOT_FOUND',
attemptNumber: 1,
retriesLeft: 6
}
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [AgentMemoryCoreService] Storing memory from agent unknown: {"networkId":"devbrand-supervisor-network","execut...
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Semaphore acquired after 7ms wait (active: 1, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 0,
timeout: 3000,
timestamp: '2025-10-29T16:46:28.902Z'
}
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] Semaphore acquired after 14ms wait (active: 2, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-29T16:46:28.918Z'
}
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:28 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 27600 - 10/29/2025, 7:46:29 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 27600 - 10/29/2025, 7:46:29 PM WARN [HealthCheckService] System health degraded:
[Nest] 27600 - 10/29/2025, 7:46:29 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 27600 - 10/29/2025, 7:46:29 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 27600 - 10/29/2025, 7:46:30 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 27600 - 10/29/2025, 7:46:31 PM ERROR [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] ❌ FAILED on attempt 1/3
[Nest] 27600 - 10/29/2025, 7:46:31 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2699,
totalTime: 2699,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:31 PM WARN [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] ⏳ Waiting 0ms before retry 2...
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] Attempt 2/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2710
}
[Nest] 27600 - 10/29/2025, 7:46:31 PM ERROR [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] ❌ FAILED on attempt 1/3
[Nest] 27600 - 10/29/2025, 7:46:31 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3010,
totalTime: 3011,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 27600 - 10/29/2025, 7:46:31 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:31 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] ⏳ Waiting 0ms before retry 2...
[Nest] 27600 - 10/29/2025, 7:46:31 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Connection not established, reconnecting...
[Nest] 27600 - 10/29/2025, 7:46:31 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 6ms
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Attempt 2/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3019
}
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] Semaphore acquired after 3ms wait (active: 3, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-29T16:46:31.924Z'
}
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:31 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM ERROR [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] ❌ FAILED on attempt 2/3
[Nest] 27600 - 10/29/2025, 7:46:34 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2688,
totalTime: 5398,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM WARN [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] ⏳ Waiting 0ms before retry 3...
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] Attempt 3/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 5413
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM ERROR [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] ❌ FAILED on attempt 1/3
[Nest] 27600 - 10/29/2025, 7:46:34 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2689,
totalTime: 2690,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM WARN [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] ⏳ Waiting 0ms before retry 2...
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] Attempt 2/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2703
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM ERROR [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] ❌ FAILED on attempt 2/3
[Nest] 27600 - 10/29/2025, 7:46:34 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3009,
totalTime: 6022,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:34 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] ⏳ Waiting 0ms before retry 3...
[Nest] 27600 - 10/29/2025, 7:46:34 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Connection not established, reconnecting...
[Nest] 27600 - 10/29/2025, 7:46:34 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Attempt 3/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6040
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Semaphore acquired after 11ms wait (active: 4, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-29T16:46:34.953Z'
}
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:34 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] ❌ FAILED on attempt 3/3
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2673,
totalTime: 8086,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] 🔴 FINAL FAILURE after 8087ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBConnectionService] [op-1761756388903-szjdws4jo] Semaphore released
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] ❌ FAILED on attempt 2/3
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2708,
totalTime: 5411,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] ⏳ Waiting 0ms before retry 3...
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] Attempt 3/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 5418
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] ❌ FAILED on attempt 3/3
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3008,
totalTime: 9045,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] 🔴 FINAL FAILURE after 9046ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBConnectionService] [op-1761756388894-084lpy6tx] Semaphore released
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [ChromaMetricsService] Slow operation detected: addDocuments took 9054ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaMetricsService] Operation failed: addDocuments - Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [VectorMemoryRepository] Failed to store memory for thread agent|memory:unknown:agents-coordination-events-devbrand-supervisor-network
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [VectorMemoryRepository] ChromaDBTimeoutError: Operation timed out after 3000ms
at Timeout.\_onTimeout (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3334:31)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7) {
timestamp: 2025-10-29T16:46:37.947Z,
context: {
timeoutMs: undefined
},
timeoutMs: undefined,
code: 'CHROMADB_TIMEOUT_ERROR'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [AgentMemoryCoreService] Failed to store agent memory: Failed to store memory for thread agent|memory:unknown:agents-coordination-events-devbrand-supervisor-network
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [MemoryCoordinationService] Failed to store coordination event: MemoryStorageException: Memory storage operation failed: storeAgentMemory: Failed to store memory for thread agent|memory:unknown:agents-coordination-events-devbrand-supervisor-network
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [WorkflowExecutionCoordinationService] Stored coordination event for learning: exec_devbrand-supervisor-network_1761756385936
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [WorkflowExecutionCoordinationService] Failed to save checkpoint for thread multi-agent|network:devbrand-supervisor-network:
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [WorkflowExecutionCoordinationService] TypeError: Cannot read properties of undefined (reading 'saveCheckpoint')
at CheckpointManagerAdapter.saveCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-checkpoint\index.cjs.js:3097:35)
at WorkflowExecutionCoordinationService.saveWorkflowCheckpoint (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:19570:36)
at WorkflowExecutionCoordinationService.executeWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:19469:20)
at async DevBrandSupervisorWorkflow.executeWithStreaming (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:419465)
at async WorkflowStreamingOrchestrator.consumeWorkflowStream (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3018:24)
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [AgentMemoryCoreService] Batch storing 2 memories from agent conversation-agent
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 2 documents
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] ❌ FAILED on attempt 1/3
[Nest] 27600 - 10/29/2025, 7:46:37 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3011,
totalTime: 3012,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] ⏳ Waiting 0ms before retry 2...
[Nest] 27600 - 10/29/2025, 7:46:37 PM WARN [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Connection not established, reconnecting...
[Nest] 27600 - 10/29/2025, 7:46:37 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Attempt 2/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:37 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3030
}
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 2 documents
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] Semaphore acquired after 6ms wait (active: 3, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-29T16:46:39.937Z'
}
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] [op-1761756399937-s51ham4rx] Semaphore acquired after 11ms wait (active: 4, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] [op-1761756399937-s51ham4rx] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-29T16:46:39.948Z'
}
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] [op-1761756399937-s51ham4rx] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:39 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 27600 - 10/29/2025, 7:46:40 PM ERROR [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] ❌ FAILED on attempt 3/3
[Nest] 27600 - 10/29/2025, 7:46:40 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2679,
totalTime: 8097,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:40 PM ERROR [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] 🔴 FINAL FAILURE after 8097ms
[Nest] 27600 - 10/29/2025, 7:46:40 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 27600 - 10/29/2025, 7:46:40 PM DEBUG [ChromaDBConnectionService] [op-1761756391921-v144bzbqr] Semaphore released
[Nest] 27600 - 10/29/2025, 7:46:40 PM ERROR [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] ❌ FAILED on attempt 2/3
[Nest] 27600 - 10/29/2025, 7:46:40 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3005,
totalTime: 6032,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 27600 - 10/29/2025, 7:46:40 PM WARN [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:40 PM WARN [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] ⏳ Waiting 0ms before retry 3...
[Nest] 27600 - 10/29/2025, 7:46:40 PM WARN [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Connection not established, reconnecting...
[Nest] 27600 - 10/29/2025, 7:46:40 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 27600 - 10/29/2025, 7:46:41 PM DEBUG [ChromaDBConnectionService] [op-1761756394942-z9v3s02zb] Attempt 3/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:41 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6047
}
[Nest] 27600 - 10/29/2025, 7:46:42 PM ERROR [ChromaDBConnectionService] [op-1761756399937-s51ham4rx] ❌ FAILED on attempt 1/3
[Nest] 27600 - 10/29/2025, 7:46:42 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2755,
totalTime: 2756,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 27600 - 10/29/2025, 7:46:42 PM WARN [ChromaDBConnectionService] [op-1761756399937-s51ham4rx] ⏳ Waiting 0ms before retry 2...
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] [op-1761756399937-s51ham4rx] Attempt 2/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2765
}
[Nest] 27600 - 10/29/2025, 7:46:42 PM ERROR [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] ❌ FAILED on attempt 1/3
[Nest] 27600 - 10/29/2025, 7:46:42 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3010,
totalTime: 3010,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3334:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 27600 - 10/29/2025, 7:46:42 PM WARN [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 27600 - 10/29/2025, 7:46:42 PM WARN [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] ⏳ Waiting 0ms before retry 2...
[Nest] 27600 - 10/29/2025, 7:46:42 PM WARN [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] Connection not established, reconnecting...
[Nest] 27600 - 10/29/2025, 7:46:42 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] [op-1761756399931-pmjg0kifd] Attempt 2/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3024
}
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] [op-1761756402961-e8b52tomd] Semaphore acquired after 3ms wait (active: 4, queued: 0)
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] [op-1761756402961-e8b52tomd] Starting ChromaDB operation
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-29T16:46:42.964Z'
}
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] [op-1761756402961-e8b52tomd] Attempt 1/3 - executing operation
[Nest] 27600 - 10/29/2025, 7:46:42 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
