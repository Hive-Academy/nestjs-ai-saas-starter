e of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 7386,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:04.824Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
} | Context: {
"method": "trackMemory",
"executionTime": 7392,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:04.826Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: bfc656a9-cab0-4fe5-a8dd-af6aea56c5a2
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [WorkflowExecutionCoordinationService] Stored coordination event for learning: exec_devbrand-supervisor-network_1762465133134
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [EventStreamProcessorService] Processed event events for exec_devbrand-supervisor-network_1762465133134:workflow_complete
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [WorkflowExecutionCoordinationService] Stored conversation turn in memory for execution exec_devbrand-supervisor-network_1762465133134
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762465133133: unknown
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762465133133: unknown
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [NeogmaService] Error in run(
MERGE (t:Thread {id: $threadId})
        SET t.lastActivity = datetime()
        MERGE (m:Memory {id: $memoryId})
        SET m.content = $content,
            m.type = $type,
            m.importance = $importance,
            m.createdAt = datetime($createdAt),
m.accessCount = $accessCount
MERGE (t)-[:CONTAINS]->(m)

        RETURN m.id as memoryId
      ):

Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}.
[Nest] 7788 - 11/06/2025, 11:39:04 PM WARN [GraphAgentService] Failed to track memory f124c93a-ba9d-4e04-a064-69081cb79100 in graph
[Nest] 7788 - 11/06/2025, 11:39:04 PM WARN [GraphAgentService] Neo4jError: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}.

    at captureStacktrace (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\result.js:624:17)
    at new Result (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\result.js:112:23)
    at Session._run (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\session.js:224:16)
    at Session.run (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\session.js:188:27)
    at D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Queries\QueryRunner\QueryRunner.js:207:28
    at getSession (D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Sessions\Sessions.js:14:30)
    at getRunnable (D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Sessions\Sessions.js:52:35)
    at QueryRunner.run (D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Queries\QueryRunner\QueryRunner.js:188:43)
    at NeogmaService.run (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:349:52)
    at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1145:25) {

constructor: [Function: Neo4jError] {
isRetriable: [Function (anonymous)]
},
gqlStatus: '22G03',
gqlStatusDescription: 'error: data exception - invalid value type',
diagnosticRecord: {
OPERATION: '',
OPERATION_CODE: '0',
CURRENT_SCHEMA: '/'
},
classification: 'UNKNOWN',
rawClassification: undefined,
code: 'Neo.ClientError.Statement.TypeError',
retriable: false,
[cause]: GQLError: 22N01: Expected the value Map{low -> Long(0), high -> Long(0)} to be of type BOOLEAN, STRING, INTEGER, FLOAT, DATE, LOCAL TIME, ZONED TIME, LOCAL DATETIME, ZONED DATETIME, DURATION, POINT, NODE or RELATIONSHIP, but was of type MAP NOT NULL.
at new GQLError (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\error.js:117:24)
at newGQLError (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\error.js:281:12)
at ResponseHandler.\_handleErrorCause (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\response-handler.js:199:57)
at ResponseHandler.\_handleErrorPayload (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\response-handler.js:193:50)
at ResponseHandler.handleResponse (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\response-handler.js:116:49)
at dechunker.onmessage (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\create.js:74:33)
at Dechunker.\_onHeader (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\channel\chunking.js:196:18)
at Dechunker.AWAITING_CHUNK (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\channel\chunking.js:149:25)
at Dechunker.write (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\channel\chunking.js:206:32)
at channel.onmessage (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\create.js:70:63) {
constructor: [Function: GQLError],
cause: undefined,
gqlStatus: '22N01',
gqlStatusDescription: 'error: data exception - invalid type. Expected the value Map{low -> Long(0), high -> Long(0)} to be of type BOOLEAN, STRING, INTEGER, FLOAT, DATE, LOCAL TIME, ZONED TIME, LOCAL DATETIME, ZONED DATETIME, DURATION, POINT, NODE or RELATIONSHIP, but was of type MAP NOT NULL.',
diagnosticRecord: {
OPERATION: '',
OPERATION_CODE: '0',
CURRENT_SCHEMA: '/',
\_classification: 'CLIENT_ERROR'
},
classification: 'CLIENT_ERROR',
rawClassification: 'CLIENT_ERROR'
}
}
[Safe] trackMemory - Failed after 4419ms: Error: [Safe] Failed to track memory: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 4419,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:04.830Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1149:13)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:9)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.store (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3144:20)
at async GraphOptimizationService.storeOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1380:7)
at async WorkflowGraphBuilderService.buildFromDefinition (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1809:7)
at async WorkflowGraphBuilderService.buildFromDecorators (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1833:12)
[Safe] trackMemory - Failed after 4422ms: Error: [Safe] Failed to track memory: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 4419,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:04.830Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1149:13)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:9)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.store (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3144:20)
at async GraphOptimizationService.storeOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1380:7)
at async WorkflowGraphBuilderService.buildFromDefinition (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1809:7)
at async WorkflowGraphBuilderService.buildFromDecorators (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1833:12)
[Nest] 7788 - 11/06/2025, 11:39:04 PM WARN [AgentMemoryCoreService] Graph tracking failed (graceful degradation): [Safe] [Safe] Failed to track memory: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 4419,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:04.830Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
} | Context: {
"method": "trackMemory",
"executionTime": 4422,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:04.831Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: f124c93a-ba9d-4e04-a064-69081cb79100
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [AgentMemoryCoreService] Storing memory from agent workflow-graph-builder: {"timestamp":"2025-11-06T21:39:04.832Z"}...
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [WorkflowGraphBuilderService] Workflow graph built successfully: github-analyzer-workflow (2324.91ms)
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 7788 - 11/06/2025, 11:39:04 PM LOG [GitHubCodeAnalyzerAgent] Executing workflow: workflow
💻 GitHub Code Analyzer: Starting developer analysis...
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Node initializeGitHubAnalysis failed:
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'messages')
at Object.initializeGitHubAnalysis (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197976)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Node analyzeGitHubActivity failed:
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.analyzeGitHubActivity (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:198399)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:183923)
at r.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186287)
at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185703
at CircuitBreakerImpl.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185097)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185689)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186873)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190901)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:191691)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Node extractAchievements failed:
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.extractAchievements (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199129)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Node generateDeveloperInsights failed:
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.generateDeveloperInsights (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199767)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Node synthesizeWithAI failed:
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.synthesizeWithAI (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:200483)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Node finalizeAnalysis failed:
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [WorkflowExecutionService] Error: ApprovalEvaluatorService not injected into GitHubCodeAnalyzerAgent. Classes using @RequiresApproval must inject ApprovalEvaluatorService.
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2661:17)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Worker agent completed
[Nest] 7788 - 11/06/2025, 11:39:04 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762465133133: unknown
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145145-g17xqlkj0] Semaphore acquired after 0ms wait (active: 1, queued: 0)
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145145-g17xqlkj0] Starting ChromaDB operation
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-06T21:39:05.145Z'
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145145-g17xqlkj0] Attempt 1/3 - executing operation
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145146-o5kb15g8m] Semaphore acquired after 6ms wait (active: 2, queued: 0)
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145146-o5kb15g8m] Starting ChromaDB operation
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-06T21:39:05.152Z'
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145146-o5kb15g8m] Attempt 1/3 - executing operation
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145146-o5kb15g8m] ✅ SUCCESS in 7ms (total: 8ms)
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 7
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145146-o5kb15g8m] Semaphore released
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBDocumentService] Added batch 1 with 1 documents
[Nest] 7788 - 11/06/2025, 11:39:05 PM LOG [ChromaDBDocumentService] Successfully added 1 documents to collection 'vector-memories'
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145145-g17xqlkj0] ✅ SUCCESS in 56ms (total: 56ms)
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 56
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [ChromaDBConnectionService] [op-1762465145145-g17xqlkj0] Semaphore released
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [VectorMemoryRepository] Stored memory 2213ffc1-bd5e-4420-a9f2-4a7c38a035df for thread agent|memory:workflow-graph-builder:unknown
[Safe] trackMemory - Preprocessing completed in 1ms {
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
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM ERROR [NeogmaService] Error in run(
MERGE (t:Thread {id: $threadId})
        SET t.lastActivity = datetime()
        MERGE (m:Memory {id: $memoryId})
        SET m.content = $content,
            m.type = $type,
            m.importance = $importance,
            m.createdAt = datetime($createdAt),
m.accessCount = $accessCount
MERGE (t)-[:CONTAINS]->(m)

        RETURN m.id as memoryId
      ):

Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}.
[Nest] 7788 - 11/06/2025, 11:39:05 PM WARN [GraphAgentService] Failed to track memory 2213ffc1-bd5e-4420-a9f2-4a7c38a035df in graph
[Nest] 7788 - 11/06/2025, 11:39:05 PM WARN [GraphAgentService] Neo4jError: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}.

    at captureStacktrace (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\result.js:624:17)
    at new Result (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\result.js:112:23)
    at Session._run (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\session.js:224:16)
    at Session.run (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\session.js:188:27)
    at D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Queries\QueryRunner\QueryRunner.js:207:28
    at getSession (D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Sessions\Sessions.js:14:30)
    at getRunnable (D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Sessions\Sessions.js:52:35)
    at QueryRunner.run (D:\projects\nestjs-ai-saas-starter\node_modules\neogma\dist\Queries\QueryRunner\QueryRunner.js:188:43)
    at NeogmaService.run (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:349:52)
    at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1145:25) {

constructor: [Function: Neo4jError] {
isRetriable: [Function (anonymous)]
},
gqlStatus: '22G03',
gqlStatusDescription: 'error: data exception - invalid value type',
diagnosticRecord: {
OPERATION: '',
OPERATION_CODE: '0',
CURRENT_SCHEMA: '/'
},
classification: 'UNKNOWN',
rawClassification: undefined,
code: 'Neo.ClientError.Statement.TypeError',
retriable: false,
[cause]: GQLError: 22N01: Expected the value Map{low -> Long(0), high -> Long(0)} to be of type BOOLEAN, STRING, INTEGER, FLOAT, DATE, LOCAL TIME, ZONED TIME, LOCAL DATETIME, ZONED DATETIME, DURATION, POINT, NODE or RELATIONSHIP, but was of type MAP NOT NULL.
at new GQLError (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\error.js:117:24)
at newGQLError (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-core\lib\error.js:281:12)
at ResponseHandler.\_handleErrorCause (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\response-handler.js:199:57)
at ResponseHandler.\_handleErrorPayload (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\response-handler.js:193:50)
at ResponseHandler.handleResponse (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\response-handler.js:116:49)
at dechunker.onmessage (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\create.js:74:33)
at Dechunker.\_onHeader (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\channel\chunking.js:196:18)
at Dechunker.AWAITING_CHUNK (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\channel\chunking.js:149:25)
at Dechunker.write (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\channel\chunking.js:206:32)
at channel.onmessage (D:\projects\nestjs-ai-saas-starter\node_modules\neo4j-driver-bolt-connection\lib\bolt\create.js:70:63) {
constructor: [Function: GQLError],
cause: undefined,
gqlStatus: '22N01',
gqlStatusDescription: 'error: data exception - invalid type. Expected the value Map{low -> Long(0), high -> Long(0)} to be of type BOOLEAN, STRING, INTEGER, FLOAT, DATE, LOCAL TIME, ZONED TIME, LOCAL DATETIME, ZONED DATETIME, DURATION, POINT, NODE or RELATIONSHIP, but was of type MAP NOT NULL.',
diagnosticRecord: {
OPERATION: '',
OPERATION_CODE: '0',
CURRENT_SCHEMA: '/',
\_classification: 'CLIENT_ERROR'
},
classification: 'CLIENT_ERROR',
rawClassification: 'CLIENT_ERROR'
}
}
[Safe] trackMemory - Failed after 340ms: Error: [Safe] Failed to track memory: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 340,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:05.542Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1149:13)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:9)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.storeAgentExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3058:5)
at async WorkflowGraphBuilderService.storeBuilderExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2070:5)
[Safe] trackMemory - Failed after 342ms: Error: [Safe] Failed to track memory: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 340,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:05.542Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1149:13)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:22)
at async AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:9)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.storeAgentExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3058:5)
at async WorkflowGraphBuilderService.storeBuilderExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2070:5)
[Nest] 7788 - 11/06/2025, 11:39:05 PM WARN [AgentMemoryCoreService] Graph tracking failed (graceful degradation): [Safe] [Safe] Failed to track memory: Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}. | Context: {
"method": "trackMemory",
"executionTime": 340,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:05.542Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
} | Context: {
"method": "trackMemory",
"executionTime": 342,
"args": [
"[Object]"
],
"timestamp": "2025-11-06T21:39:05.543Z",
"config": {
"strict": true,
"log": true,
"rules": {
"maxDepth": 10,
"maxParams": 20,
"maxProperties": 1000,
"maxArrayLength": 10000,
"maxStringLength": 1000000,
"preventInjection": true,
"onInjectionDetected": "throw",
"sanitizeHtml": false,
"escapeSpecialChars": false,
"customSanitizers": []
},
"transforms": {
"autoSerialize": true,
"autoInt": true,
"autoDateTransform": true,
"autoDeserialize": true
},
"customValidators": []
}
}
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: 2213ffc1-bd5e-4420-a9f2-4a7c38a035df
[Nest] 7788 - 11/06/2025, 11:39:05 PM DEBUG [WorkflowGraphBuilderService] Stored builder execution for github-analyzer-workflow
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [NodeFactoryService] Supervisor routing to: github-code-analyzer
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [NodeFactoryService] Object(2) {
reasoning: 'User provided GitHub username "abdallah-khalil" - starting with Step 1 of the workflow to analyze GitHub profile and extract achievements and technical skills for personal branding.',
task: 'Analyze GitHub profile for abdallah-khalil to extract achievements, technical skills, and project highlights. Extract repository contributions, technologies used, impact metrics, and identify standout projects and technical competencies.'
}
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762465133133: unknown
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [NodeFactoryService] Executing worker agent: github-code-analyzer
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [NodeFactoryService] Object(2) {
task: 'Analyze GitHub profile for abdallah-khalil to extract achievements, technical skills, and project highlights. Extract repository contributions, technologies used, impact metrics, and identify standout projects and technical competencies.',
messageCount: 2
}
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Executing worker agent...
[Nest] 7788 - 11/06/2025, 11:39:09 PM LOG [GitHubCodeAnalyzerAgent] Executing workflow: workflow
💻 GitHub Code Analyzer: Starting developer analysis...
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Node initializeGitHubAnalysis failed:
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'messages')
at Object.initializeGitHubAnalysis (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197976)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Node analyzeGitHubActivity failed:
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.analyzeGitHubActivity (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:198399)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:183923)
at r.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186287)
at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185703
at CircuitBreakerImpl.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185097)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185689)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186873)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190901)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:191691)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Node extractAchievements failed:
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.extractAchievements (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199129)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Node generateDeveloperInsights failed:
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.generateDeveloperInsights (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199767)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Node synthesizeWithAI failed:
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.synthesizeWithAI (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:200483)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Node finalizeAnalysis failed:
[Nest] 7788 - 11/06/2025, 11:39:09 PM ERROR [WorkflowExecutionService] Error: ApprovalEvaluatorService not injected into GitHubCodeAnalyzerAgent. Classes using @RequiresApproval must inject ApprovalEvaluatorService.
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2661:17)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1602:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Worker agent completed
[Nest] 7788 - 11/06/2025, 11:39:09 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762465133133: unknown
