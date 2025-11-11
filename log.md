ized +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RoutesResolver] HealthController {/api/health}: +40ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/health, GET} route +2ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/health/detailed, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/health/libraries, GET} route +1ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RoutesResolver] PerformanceController {/api/performance}: +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/performance/dashboard, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/performance/repositories, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/performance/recommendations, GET} route +1ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/performance/summary, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RoutesResolver] DevBrandController {/api/devbrand}: +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/devbrand/execute, POST} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RoutesResolver] ResearchChatController {/api/research}: +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/research/chat, POST} route +1ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/research/stream/:executionId, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/research/approve/:executionId, POST} route +1ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/research/reports, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [RouterExplorer] Mapped {/api/research/reports/:filename, GET} route +0ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 18ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [ChromaDBConnectionService] ChromaDB connection initialized successfully
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [UserInterruptionService] ✅ UserInterruptionService initialized (lazy-loading enabled - state loads when workflows resume)
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [ApprovalChainService] ✅ ApprovalChainService initialized (lazy-loading enabled - chains load on-demand)
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [FeedbackProcessorService] ✅ FeedbackProcessorService initialized (lazy-loading enabled - feedback loads on-demand)
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [HumanApprovalService] Human Approval Service initializing with specialized services
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [HumanApprovalService] ✅ Human Approval Service initialized
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [ConfidenceEvaluatorService] ✅ ConfidenceEvaluatorService initialized (lazy-loading enabled - patterns load on-demand)
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [ToolRegistryService] Registering 5 tool classes
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Processing 4 tools from GitHubIntegrationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: github-analyzer from GitHubIntegrationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: achievement-extractor from GitHubIntegrationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: developer-insights from GitHubIntegrationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: ai-synthesis from GitHubIntegrationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Processing 3 tools from BrandStrategistTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: memory-analysis from BrandStrategistTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: brand-optimization from BrandStrategistTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: strategy-generation from BrandStrategistTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Processing 4 tools from WebResearchTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: web-search from WebResearchTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: news-search from WebResearchTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: social-profile-search from WebResearchTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: research-search from WebResearchTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Processing 5 tools from ContentCreatorTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: linkedin-formatter from ContentCreatorTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: devto-formatter from ContentCreatorTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: content-optimizer from ContentCreatorTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: quality-scorer from ContentCreatorTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: engagement-predictor from ContentCreatorTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Processing 4 tools from FileOperationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: create-report from FileOperationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: save-report from FileOperationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: list-reports from FileOperationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM DEBUG [ToolRegistryService] Registered tool: read-report from FileOperationTools
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [ToolRegistryService] Tool registration completed in 5.9ms - Total tools: 20
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG [NestApplication] Nest application successfully started +6ms
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG 🚀 Application is running on: <http://localhost:3000/api>
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG 📚 API Documentation available at: <http://localhost:3000/docs>
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG 🔧 Health check available at: <http://localhost:3000/api/health>
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG 🔌 WebSocket streaming available at: ws://localhost:8080/streaming
[Nest] 23268 - 11/11/2025, 9:56:45 PM LOG 🌊 Frontend should connect to: ws://localhost:8080/streaming
[Nest] 23268 - 11/11/2025, 9:57:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 9:57:45 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23268 - 11/11/2025, 9:57:45 PM WARN [HealthCheckService] System health degraded:
[Nest] 23268 - 11/11/2025, 9:57:45 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 23268 - 11/11/2025, 9:57:45 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 9:58:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 9:58:45 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23268 - 11/11/2025, 9:58:45 PM WARN [HealthCheckService] System health degraded:
[Nest] 23268 - 11/11/2025, 9:58:45 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 23268 - 11/11/2025, 9:58:45 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 9:59:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 9:59:45 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23268 - 11/11/2025, 9:59:45 PM WARN [HealthCheckService] System health degraded:
[Nest] 23268 - 11/11/2025, 9:59:45 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 23268 - 11/11/2025, 9:59:45 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:00:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:00:45 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23268 - 11/11/2025, 10:00:45 PM WARN [HealthCheckService] System health degraded:
[Nest] 23268 - 11/11/2025, 10:00:45 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 23268 - 11/11/2025, 10:00:45 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:01:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:01:45 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23268 - 11/11/2025, 10:01:45 PM WARN [HealthCheckService] System health degraded:
[Nest] 23268 - 11/11/2025, 10:01:45 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 23268 - 11/11/2025, 10:01:45 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:02:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:02:45 PM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23268 - 11/11/2025, 10:02:45 PM WARN [HealthCheckService] System health degraded:
[Nest] 23268 - 11/11/2025, 10:02:45 PM WARN [HealthCheckService] Object(2) {
overall: 'unhealthy',
unhealthyServices: [
{
name: 'memory',
state: 'unhealthy',
error: undefined
}
]
}
[Nest] 23268 - 11/11/2025, 10:02:45 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:03:15 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23268 - 11/11/2025, 10:03:17 PM LOG [DevBrandController] 🚀 Starting DevBrand workflow for GitHub user: abdallah-khalil (executionId: devbrand-1762891397092)
[Nest] 23268 - 11/11/2025, 10:03:17 PM LOG [DevBrandSupervisorWorkflow] 🚀 Starting DevBrand workflow for user: anonymous, GitHub: abdallah-khalil
[Nest] 23268 - 11/11/2025, 10:03:17 PM LOG [WorkflowExecutionService] Executing multi-agent workflow: DevBrandSupervisorWorkflow with 3 agents
[Nest] 23268 - 11/11/2025, 10:03:17 PM DEBUG [MultiAgentGraphBuilderService] Building multi-agent graph for DevBrandSupervisorWorkflow
[Nest] 23268 - 11/11/2025, 10:03:17 PM DEBUG [MultiAgentGraphBuilderService] Extracted config: topology=supervisor, agents=3
[Nest] 23268 - 11/11/2025, 10:03:17 PM ERROR [WorkflowExecutionService] Multi-agent workflow DevBrandSupervisorWorkflow failed:
No builder registered for topology: supervisor. Available topologies: none. Ensure the corresponding builder is created and registered in the builders Map.
[Nest] 23268 - 11/11/2025, 10:03:17 PM ERROR [DevBrandSupervisorWorkflow] Multi-agent coordination failed:
[Nest] 23268 - 11/11/2025, 10:03:17 PM ERROR [DevBrandSupervisorWorkflow] MultiAgentGraphBuilderError: No builder registered for topology: supervisor. Available topologies: none. Ensure the corresponding builder is created and registered in the builders Map.
at MultiAgentGraphBuilderService.buildGraph (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2144:13)
at WorkflowExecutionService.executeMultiAgentWorkflow (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2382:55)
at DevBrandSupervisorWorkflow.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:101873)
at DevBrandController.startWorkflowInBackground (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:99380)
at DevBrandController.executeDevBrand (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:98597)
at D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\router\router-execution-context.js:38:29
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\router\router-execution-context.js:46:28
at async D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
cause: undefined
}
[Nest] 23268 - 11/11/2025, 10:03:17 PM ERROR [DevBrandController] Workflow devbrand-1762891397092 failed:
[Nest] 23268 - 11/11/2025, 10:03:17 PM ERROR [DevBrandController] Error: DevBrand workflow failed: No builder registered for topology: supervisor. Available topologies: none. Ensure the corresponding builder is created and registered in the builders Map.
at DevBrandSupervisorWorkflow.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:102876)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async DevBrandController.startWorkflowInBackground (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:99352)
