[Nest] 23796 - 11/13/2025, 1:16:49 AM LOG [HealthCheckService] Service 'memory' state changed: unknown -> degraded
[Nest] 23796 - 11/13/2025, 1:16:49 AM LOG [HealthCheckService] Object(1) {
metadata: {
checkName: 'memory',
executionTime: 0,
healthy: false,
degraded: true,
unhealthy: false,
usagePercent: 93.67,
heapUsedMB: 47,
heapTotalMB: 50,
rssUsedMB: 99
}
}
[Nest] 23796 - 11/13/2025, 1:16:49 AM LOG [HealthCheckService] Service 'cpu' state changed: unknown -> healthy
[Nest] 23796 - 11/13/2025, 1:16:49 AM LOG [HealthCheckService] Object(1) {
metadata: {
checkName: 'cpu',
executionTime: 0
}
}
[Nest] 23796 - 11/13/2025, 1:16:49 AM LOG [HealthCheckService] Service 'uptime' state changed: unknown -> healthy
[Nest] 23796 - 11/13/2025, 1:16:49 AM LOG [HealthCheckService] Object(1) {
metadata: {
checkName: 'uptime',
executionTime: 0
}
}
[Nest] 23796 - 11/13/2025, 1:17:19 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23796 - 11/13/2025, 1:17:49 AM DEBUG [HealthCheckService] Performing scheduled health check...
[Nest] 23796 - 11/13/2025, 1:17:49 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [ResearchChatController] 🚀 Starting research for query: "search angular signal forms and provide basic and advanced usages and how it could be used to generate advanced form elements"
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [ResearchChatController] ✅ Research workflow started: research-1762989499288 - Connect to /api/research/stream/research-1762989499288
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [ResearchChatController] 📡 SSE stream connected for research-1762989499288
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [ResearcherAgent] Starting streaming research for query: "search angular signal forms and provide basic and advanced usages and how it could be used to generate advanced form elements" (execution: research-1762989499288)
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [WorkflowExecutionService] Streaming workflow from class ResearcherAgent
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [MetadataProcessorService] Extracting workflow definition from ResearcherAgent
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-task for ResearcherAgent
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [MetadataProcessorService] Found 3 task-based nodes for workflow researcher-workflow
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [MetadataProcessorService] Extracted task-based workflow metadata for researcher-workflow (edges will be built by WorkflowExecutionService)
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [MetadataProcessorService] Validating workflow definition: researcher-workflow
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [MetadataProcessorService] Workflow definition validation completed for researcher-workflow
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [WorkflowExecutionService] Building StateGraph for researcher-workflow using functional-task-based strategy
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Building functional-task graph for researcher-workflow with 3 tasks
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Adding node: initializeResearch
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Adding node: conductAutonomousResearch
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Adding node: saveApprovedReport
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Building linear edges from taskDependencies for 3 tasks
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Adding dependency edge: initializeResearch → conductAutonomousResearch
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Adding dependency edge: conductAutonomousResearch → saveApprovedReport
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Adding tool routing for 1 LLM tasks: conductAutonomousResearch
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Binding 3 tools to LLM task conductAutonomousResearch: web-search, research-search, create-report
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Tool routing added for conductAutonomousResearch: conductAutonomousResearch ↔ tools_conductAutonomousResearch (max 10 iterations)
[Nest] 23796 - 11/13/2025, 1:18:19 AM LOG [FunctionalTaskGraphStrategy] LLM task tool routing configured for 1 tasks
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Setting entry point: initializeResearch
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [FunctionalTaskGraphStrategy] Functional-task graph built successfully for researcher-workflow
[Nest] 23796 - 11/13/2025, 1:18:19 AM DEBUG [WorkflowExecutionService] Streaming mode: updates
[Nest] 23796 - 11/13/2025, 1:18:19 AM ERROR [ResearchChatController] ❌ Stream error for research-1762989499288:
Cannot read properties of undefined (reading 'metadata')
