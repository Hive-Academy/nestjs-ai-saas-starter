[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426248-113zbhnkd] ✅ SUCCESS in 4ms (total: 5ms)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 4
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426248-113zbhnkd] Semaphore released
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [ChromaDBConnectionService] [op-1762371424201-9wjovadqe] ❌ FAILED on attempt 3/3
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [ChromaDBConnectionService] Object(10) {
duration: 24,
totalTime: 2070,
errorType: 'UNKNOWN',
errorMessage: "Failed to search documents in collection 'langgraph-stores': Input validation failed: Text at index 0 is empty or only whitespace",
originalError: undefined,
errorCode: undefined,
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: "ChromaClientError: Failed to search documents in collection 'langgraph-stores': Input validation failed: Text at index 0 is empty or only whitespace\n at D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:5463:15\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)"
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [ChromaDBConnectionService] [op-1762371424201-9wjovadqe] 🔴 FINAL FAILURE after 2071ms
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [ChromaDBConnectionService] Object(5) {
totalAttempts: 3,
finalError: "Failed to search documents in collection 'langgraph-stores': Input validation failed: Text at index 0 is empty or only whitespace",
originalErrorCode: undefined,
originalErrorMessage: undefined,
connectionConfig: {
host: 'localhost',
port: 8000,
ssl: false
}
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371424201-9wjovadqe] Semaphore released
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Failed to search documents in collection 'langgraph-stores': Input validation failed: Text at index 0 is empty or only whitespace
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [LangGraphStoreRepository] Failed to search store items with prefix [graphs.compilation.optimizations]
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [LangGraphStoreRepository] ChromaClientError: Failed to search documents in collection 'langgraph-stores': Input validation failed: Text at index 0 is empty or only whitespace
at D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:5463:15
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async ChromaDBConnectionService.executeWithRetryInternal (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3423:24)
at async ChromaDBConnectionService.executeWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3387:14)
at async ChromaDBPerformanceService.executeWithMonitoring (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:6516:22)
at async LangGraphStoreRepository.searchWithScores (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:1348:20)
at async LangGraphStoreRepository.searchItems (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5324:23)
at async ChromaVectorAdapter.searchStoreItems (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:6277:12)
at async StoreService.searchStoreItems (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3642:21)
at async GraphOptimizationService.enhanceWithOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1241:32) {
cause: undefined
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [StoreService] Found 0 items with prefix [graphs.compilation.optimizations] in collection langgraph-stores
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [WorkflowExecutionService] Interrupt configuration will be applied during compilation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [WorkflowExecutionService] Object(1) {
before: []
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [AgentMemoryCoreService] Storing memory from agent workflow_graph_builder: {"graphName":"github-analyzer-workflow","graphType...
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426553-q64tprsn6] Semaphore acquired after 4ms wait (active: 1, queued: 0)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426553-q64tprsn6] Starting ChromaDB operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-05T19:37:06.558Z'
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426553-q64tprsn6] Attempt 1/3 - executing operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426558-o3nxi9qyp] Semaphore acquired after 10ms wait (active: 2, queued: 0)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426558-o3nxi9qyp] Starting ChromaDB operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-05T19:37:06.568Z'
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426558-o3nxi9qyp] Attempt 1/3 - executing operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426558-o3nxi9qyp] ✅ SUCCESS in 4ms (total: 5ms)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 4
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426558-o3nxi9qyp] Semaphore released
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBDocumentService] Added batch 1 with 1 documents
[Nest] 8068 - 11/05/2025, 9:37:06 PM LOG [ChromaDBDocumentService] Successfully added 1 documents to collection 'vector-memories'
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426553-q64tprsn6] ✅ SUCCESS in 60ms (total: 60ms)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 60
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426553-q64tprsn6] Semaphore released
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [VectorMemoryRepository] Stored memory 149c8d9c-e4a6-4984-95f0-74f3bad5edd2 for thread agent|memory:workflow-graph-builder:graphs-compilation-optimizations
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
[Nest] 8068 - 11/05/2025, 9:37:06 PM WARN [GraphAgentService] Failed to track memory 149c8d9c-e4a6-4984-95f0-74f3bad5edd2 in graph
[Nest] 8068 - 11/05/2025, 9:37:06 PM WARN [GraphAgentService] TypeError: createdAtDate.toISOString is not a function
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1114:34)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at MemoryGraphRepository.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1888:30)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at Neo4jGraphAdapter.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5562:33)
at AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:33)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.store (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3137:20)
at async GraphOptimizationService.storeOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1373:7)
[Safe] trackMemory - Failed after 2ms: Error: [Safe] Failed to track memory: createdAtDate.toISOString is not a function | Context: {
"method": "trackMemory",
"executionTime": 2,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.621Z",
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
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1122:13)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at MemoryGraphRepository.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1888:30)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at Neo4jGraphAdapter.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5562:33)
at AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:33)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.store (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3137:20)
at async GraphOptimizationService.storeOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1373:7)
[Safe] trackMemory - Failed after 2ms: Error: [Safe] Failed to track memory: createdAtDate.toISOString is not a function | Context: {
"method": "trackMemory",
"executionTime": 2,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.621Z",
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
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1122:13)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at MemoryGraphRepository.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1888:30)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at Neo4jGraphAdapter.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5562:33)
at AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:33)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.store (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3137:20)
at async GraphOptimizationService.storeOptimizationPatterns (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1373:7)
[Nest] 8068 - 11/05/2025, 9:37:06 PM WARN [AgentMemoryCoreService] Graph tracking failed (graceful degradation): [Safe] [Safe] Failed to track memory: createdAtDate.toISOString is not a function | Context: {
"method": "trackMemory",
"executionTime": 2,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.621Z",
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
"executionTime": 2,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.621Z",
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
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: 149c8d9c-e4a6-4984-95f0-74f3bad5edd2
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [AgentMemoryCoreService] Storing memory from agent workflow-graph-builder: {"timestamp":"2025-11-05T19:37:06.625Z"}...
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [WorkflowGraphBuilderService] Workflow graph built successfully: github-analyzer-workflow (4393.33ms)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBEmbeddingProcessorService] Processing embeddings for 1 documents
[Nest] 8068 - 11/05/2025, 9:37:06 PM LOG [GitHubCodeAnalyzerAgent] Executing workflow: workflow
💻 GitHub Code Analyzer: Starting developer analysis...
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] Node initializeGitHubAnalysis failed:
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'messages')
at Object.initializeGitHubAnalysis (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197237)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] Node analyzeGitHubActivity failed:
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.analyzeGitHubActivity (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197660)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:183184)
at r.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185548)
at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:184964
at CircuitBreakerImpl.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:184358)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:184950)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186134)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190162)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190952)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] Node extractAchievements failed:
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.extractAchievements (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:198390)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] Node generateDeveloperInsights failed:
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.generateDeveloperInsights (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199028)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] Node synthesizeWithAI failed:
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.synthesizeWithAI (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199744)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] Node finalizeAnalysis failed:
[Nest] 8068 - 11/05/2025, 9:37:06 PM ERROR [WorkflowExecutionService] TypeError: this.evaluateSkipConditions is not a function
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2667:39)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Worker agent completed
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762371416092: unknown
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully processed embeddings for 1 documents
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426848-bsr0mmv00] Semaphore acquired after 3ms wait (active: 1, queued: 0)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426848-bsr0mmv00] Starting ChromaDB operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-05T19:37:06.851Z'
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426848-bsr0mmv00] Attempt 1/3 - executing operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426852-if6p5egb8] Semaphore acquired after 7ms wait (active: 2, queued: 0)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426852-if6p5egb8] Starting ChromaDB operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 10000,
timestamp: '2025-11-05T19:37:06.859Z'
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426852-if6p5egb8] Attempt 1/3 - executing operation
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426852-if6p5egb8] ✅ SUCCESS in 4ms (total: 4ms)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 4
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426852-if6p5egb8] Semaphore released
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBDocumentService] Added batch 1 with 1 documents
[Nest] 8068 - 11/05/2025, 9:37:06 PM LOG [ChromaDBDocumentService] Successfully added 1 documents to collection 'vector-memories'
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426848-bsr0mmv00] ✅ SUCCESS in 50ms (total: 50ms)
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] Object(2) {
attempt: 1,
duration: 50
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [ChromaDBConnectionService] [op-1762371426848-bsr0mmv00] Semaphore released
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [VectorMemoryRepository] Stored memory ceadfd99-fd00-4426-ad57-2d9a070c6cea for thread agent|memory:workflow-graph-builder:unknown
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
autoInt: true,
autoDateTransform: true,
autoDeserialize: true
},
customValidators: []
}
}
[Nest] 8068 - 11/05/2025, 9:37:06 PM WARN [GraphAgentService] Failed to track memory ceadfd99-fd00-4426-ad57-2d9a070c6cea in graph
[Nest] 8068 - 11/05/2025, 9:37:06 PM WARN [GraphAgentService] TypeError: createdAtDate.toISOString is not a function
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1114:34)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at MemoryGraphRepository.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1888:30)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at Neo4jGraphAdapter.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5562:33)
at AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:33)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.storeAgentExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3058:5)
at async WorkflowGraphBuilderService.storeBuilderExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2063:5)
[Safe] trackMemory - Failed after 1ms: Error: [Safe] Failed to track memory: createdAtDate.toISOString is not a function | Context: {
"method": "trackMemory",
"executionTime": 1,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.903Z",
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
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1122:13)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at MemoryGraphRepository.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1888:30)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at Neo4jGraphAdapter.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5562:33)
at AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:33)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.storeAgentExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3058:5)
at async WorkflowGraphBuilderService.storeBuilderExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2063:5)
[Safe] trackMemory - Failed after 3ms: Error: [Safe] Failed to track memory: createdAtDate.toISOString is not a function | Context: {
"method": "trackMemory",
"executionTime": 1,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.903Z",
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
at GraphAgentService.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1122:13)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at MemoryGraphRepository.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:1888:30)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-neo4j\index.cjs.js:4830:43)
at Neo4jGraphAdapter.trackMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-adapters\index.cjs.js:5562:33)
at AgentMemoryCoreService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2151:33)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async AgentMemoryBridgeService.storeAgentMemory (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:2855:26)
at async AgentMemoryBridgeService.storeAgentExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-memory\index.cjs.js:3058:5)
at async WorkflowGraphBuilderService.storeBuilderExecution (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:2063:5)
[Nest] 8068 - 11/05/2025, 9:37:06 PM WARN [AgentMemoryCoreService] Graph tracking failed (graceful degradation): [Safe] [Safe] Failed to track memory: createdAtDate.toISOString is not a function | Context: {
"method": "trackMemory",
"executionTime": 1,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.903Z",
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
"executionTime": 3,
"args": [
"[Object]"
],
"timestamp": "2025-11-05T19:37:06.904Z",
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
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [AgentMemoryCoreService] ✅ Agent memory stored: ceadfd99-fd00-4426-ad57-2d9a070c6cea
[Nest] 8068 - 11/05/2025, 9:37:06 PM DEBUG [WorkflowGraphBuilderService] Stored builder execution for github-analyzer-workflow
[Nest] 8068 - 11/05/2025, 9:37:08 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 8068 - 11/05/2025, 9:37:09 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 8068 - 11/05/2025, 9:37:09 PM DEBUG [CheckpointHealthService] Health check for primary: healthy (1ms)
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [NodeFactoryService] Supervisor routing to: undefined
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [NodeFactoryService] Object(2) {
reasoning: undefined,
task: undefined
}
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762371416092: unknown
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [NodeFactoryService] Executing worker agent: github-code-analyzer
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [NodeFactoryService] Object(2) {
task: 'Analyze GitHub profile for abdallah-khalil to extract repository contributions, technologies used, impact metrics, standout projects, and technical skills for personal branding purposes.',
messageCount: 2
}
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Executing worker agent...
[Nest] 8068 - 11/05/2025, 9:37:10 PM LOG [GitHubCodeAnalyzerAgent] Executing workflow: workflow
💻 GitHub Code Analyzer: Starting developer analysis...
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] Node initializeGitHubAnalysis failed:
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'messages')
at Object.initializeGitHubAnalysis (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197237)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] Node analyzeGitHubActivity failed:
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.analyzeGitHubActivity (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:197660)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:183184)
at r.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:185548)
at D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:184964
at CircuitBreakerImpl.execute (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:184358)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:184950)
at a.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:186134)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190162)
at n.value (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:190952)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] Node extractAchievements failed:
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.extractAchievements (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:198390)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] Node generateDeveloperInsights failed:
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.generateDeveloperInsights (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199028)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] Node synthesizeWithAI failed:
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] TypeError: Cannot read properties of undefined (reading 'metadata')
at Object.synthesizeWithAI (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:199744)
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3280:43)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] Node finalizeAnalysis failed:
[Nest] 8068 - 11/05/2025, 9:37:10 PM ERROR [WorkflowExecutionService] TypeError: this.evaluateSkipConditions is not a function
at descriptor.value (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-hitl\index.cjs.js:2667:39)
at descriptor.value [as handler] (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-streaming\index.cjs.js:3536:45)
at RunnableCallable.func (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-workflow-engine\index.cjs.js:1595:59)
at D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:126
at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
at AsyncLocalStorageProvider.runWithConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\singletons\async_local_storage\index.cjs:60:24)
at RunnableCallable.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\utils.cjs:88:81)
at RunnableSequence.invoke (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\core\dist\runnables\base.cjs:1318:38)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async \_runWithRetry (D:\projects\nestjs-ai-saas-starter\node_modules\@langchain\langgraph\dist\pregel\retry.cjs:76:22)
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [DevBrandSupervisorWorkflow] [github-code-analyzer] Worker agent completed
[Nest] 8068 - 11/05/2025, 9:37:10 PM DEBUG [WorkflowStreamingOrchestrator] Event processed for devbrand-1762371416092: unknown

abdal@Abdallah:/d/projects/nestjs-ai-saas-starter$ ^C
abdal@Abdallah:/d/projects/nestjs-ai-saas-starter$
