[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [MetadataProcessorService] Detected workflow pattern: functional-node for GitHubCodeAnalyzerAgent
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [MetadataProcessorService] Found 2 nodes for workflow github-analyzer-workflow
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [MetadataProcessorService] Found 2 edges for workflow github-analyzer-workflow
[Nest] 22220 - 03/10/2026, 8:38:58 PM LOG [MetadataProcessorService] Generated node-based workflow definition for github-analyzer-workflow
💻 Starting autonomous GitHub analysis for: profile
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [StreamEventParser] Parsed subgraph event: node="analyzeGitHubProfile", subgraph="tools", namespace=["tools:067fb0e8-5e1a-5b9d-a4d4-3638429d28ee"], mode=updates
[Nest] 22220 - 03/10/2026, 8:38:58 PM ERROR [SupervisorGraphBuilder] Worker tool github-code-analyzer failed: Approval operations require authentication
UnauthorizedException: Approval operations require authentication
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2099:17)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:38:135  
 at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:43:18)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:38:90)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:936:121)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async Object.\_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:48:13)
at async PregelRunner.\_executeTasksWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\runner.cjs:140:24)
at async PregelRunner.tick (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\runner.cjs:61:49)
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [StreamEventParser] Parsed messages event: node="tools", step=2
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [StreamEventTransformer] Message stream event for node: tools, step: 2
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [StreamEventParser] Parsed subgraph event: node="tools", subgraph="parent", namespace=[], mode=updates
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [StreamEventTransformer] Tool execution event for execution: devbrand-1773167925446
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [StreamEventTransformer] {"messages":[{"lc":1,"type":"constructor","id":["langchain_core","messages","ToolMessage"],"kwargs":{"status":"success","content":"{\"error\":true,\"message\":\"Worker github-code-analyzer failed: Approval operations require authentication\",\"agent\":\"github-code-analyzer\",\"timestamp\":\"2026-03-10T18:38:58.215Z\"}","tool_call_id":"call_7a92e6039f534b2b9e8de572","name":"github-code-analyzer","metadata":{},"additional_kwargs":{},"response_metadata":{},"id":"run-019cd90b-8a7e-7eea-a0dc-5b5dc1786e99-tool-call_7a92e6039f534b2b9e8de572"}}]}
[Nest] 22220 - 03/10/2026, 8:38:58 PM DEBUG [SupervisorGraphBuilder] Supervisor node invoked  
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:10 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:12 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:13 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:15 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed messages event: node="supervisor", step=3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventTransformer] Message stream event for node: supervisor, step: 3
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [SupervisorGraphBuilder] Supervisor finalized (no tool calls)
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [SupervisorGraphBuilder] No tool calls detected, workflow complete
[Nest] 22220 - 03/10/2026, 8:39:16 PM DEBUG [StreamEventParser] Parsed subgraph event: node="supervisor", subgraph="parent", namespace=[], mode=updates
[Nest] 22220 - 03/10/2026, 8:39:16 PM LOG [WorkflowExecutionService] Multi-agent streaming completed: DevBrandSupervisorWorkflow
[Nest] 22220 - 03/10/2026, 8:39:16 PM LOG [DevBrandSupervisorWorkflow] Streaming execution completed for devbrand-1773167925446
