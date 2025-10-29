[Nest] 16900 - 10/28/2025, 7:07:02 PM ERROR [ChromaDBConnectionService] [op-1761667614785-g862vxbog] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:02 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2694,
totalTime: 8096,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:02 PM ERROR [ChromaDBConnectionService] [op-1761667614785-g862vxbog] 🔴 FINAL FAILURE after 8097ms
[Nest] 16900 - 10/28/2025, 7:07:02 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] [op-1761667617815-lhmb340q0] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2686,
totalTime: 5406,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM WARN [ChromaDBConnectionService] [op-1761667617815-lhmb340q0] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:03 PM DEBUG [ChromaDBConnectionService] [op-1761667617815-lhmb340q0] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:03 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 5414
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] [op-1761667620848-hvme47631] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3004,
totalTime: 3004,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:03 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] [op-1761667614784-q0nyf5vza] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3011,
totalTime: 9069,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM WARN [ChromaDBConnectionService] [op-1761667614784-q0nyf5vza] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] [op-1761667614784-q0nyf5vza] 🔴 FINAL FAILURE after 9069ms
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM WARN [ChromaMetricsService] Slow operation detected: searchDocuments took 9070ms
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [VectorMemoryRepository] Failed to search memories
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [VectorMemoryRepository] ChromaDBTimeoutError: Operation timed out after 3000ms
at Timeout.\_onTimeout (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3303:31)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7) {
timestamp: 2025-10-28T16:07:03.853Z,
context: {
timeoutMs: undefined
},
timeoutMs: undefined,
code: 'CHROMADB_TIMEOUT_ERROR'
}
[Nest] 16900 - 10/28/2025, 7:07:03 PM ERROR [AgentMemoryCoreService] Failed to search agent memories: Failed to search memories
[Nest] 16900 - 10/28/2025, 7:07:03 PM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 16900 - 10/28/2025, 7:07:03 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:03 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 16900 - 10/28/2025, 7:07:03 PM DEBUG [ChromaDBConnectionService] [op-1761667620848-hvme47631] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:03 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3011
}
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully generated embeddings for 1 queries
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:05.878Z'
}
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:05.878Z'
}
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:05 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 16900 - 10/28/2025, 7:07:05 PM ERROR [ChromaDBConnectionService] [op-1761667617815-lhmb340q0] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:05 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2691,
totalTime: 8105,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:05 PM ERROR [ChromaDBConnectionService] [op-1761667617815-lhmb340q0] 🔴 FINAL FAILURE after 8105ms
[Nest] 16900 - 10/28/2025, 7:07:05 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 16900 - 10/28/2025, 7:07:06 PM ERROR [ChromaDBConnectionService] [op-1761667620848-hvme47631] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:06 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3002,
totalTime: 6011,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:06 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:06 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:06 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:06 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:06 PM DEBUG [ChromaDBConnectionService] [op-1761667620848-hvme47631] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:06 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6031
}
[Nest] 16900 - 10/28/2025, 7:07:08 PM ERROR [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:08 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2735,
totalTime: 2736,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:08 PM WARN [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2737
}
[Nest] 16900 - 10/28/2025, 7:07:08 PM ERROR [ChromaDBConnectionService] [op-1761667625878-2r22prph6] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:08 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3001,
totalTime: 3001,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:08 PM WARN [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:08 PM WARN [ChromaDBConnectionService] [op-1761667625878-2r22prph6] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:08 PM WARN [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:08 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3011
}
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:08.889Z'
}
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:08 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 16900 - 10/28/2025, 7:07:09 PM ERROR [ChromaDBConnectionService] [op-1761667620848-hvme47631] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:09 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3021,
totalTime: 9048,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:09 PM WARN [ChromaDBConnectionService] [op-1761667620848-hvme47631] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:09 PM ERROR [ChromaDBConnectionService] [op-1761667620848-hvme47631] 🔴 FINAL FAILURE after 9049ms
[Nest] 16900 - 10/28/2025, 7:07:09 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM ERROR [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:11 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2688,
totalTime: 5425,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: false,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:11 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 5442
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM ERROR [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:11 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3001,
totalTime: 3002,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:11 PM ERROR [ChromaDBConnectionService] [op-1761667625878-2r22prph6] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:11 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3005,
totalTime: 6014,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667625878-2r22prph6] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:11 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:11 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3007
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6020
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:11.898Z'
}
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:11 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2780,
totalTime: 8219,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] [op-1761667625878-0rsfd60v1] 🔴 FINAL FAILURE after 8220ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3009,
totalTime: 6013,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3004,
totalTime: 3005,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] [op-1761667625878-2r22prph6] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3006,
totalTime: 9026,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667625878-2r22prph6] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] [op-1761667625878-2r22prph6] 🔴 FINAL FAILURE after 9026ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaMetricsService] Slow operation detected: searchDocuments took 9026ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [VectorMemoryRepository] Failed to search memories
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [VectorMemoryRepository] ChromaDBTimeoutError: Operation timed out after 3000ms
at Timeout.\_onTimeout (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3303:31)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7) {
timestamp: 2025-10-28T16:07:14.904Z,
context: {
timeoutMs: undefined
},
timeoutMs: undefined,
code: 'CHROMADB_TIMEOUT_ERROR'
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM ERROR [AgentMemoryCoreService] Failed to search agent memories: Failed to search memories
[Nest] 16900 - 10/28/2025, 7:07:14 PM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:14 PM WARN [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:14 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 1ms
[Nest] 16900 - 10/28/2025, 7:07:14 PM DEBUG [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:14 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6019
}
[Nest] 16900 - 10/28/2025, 7:07:14 PM DEBUG [AlertingService] Evaluating 0 active alert rules
[Nest] 16900 - 10/28/2025, 7:07:15 PM DEBUG [CheckpointHealthService] Performing scheduled health checks
[Nest] 16900 - 10/28/2025, 7:07:16 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 1414ms
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 4424
}
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully generated embeddings for 1 queries
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:16.663Z'
}
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:16.663Z'
}
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:16 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 16900 - 10/28/2025, 7:07:17 PM ERROR [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:17 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3002,
totalTime: 9020,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:17 PM WARN [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:17 PM ERROR [ChromaDBConnectionService] [op-1761667628889-qwxt9ayg3] 🔴 FINAL FAILURE after 9021ms
[Nest] 16900 - 10/28/2025, 7:07:17 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM ERROR [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:19 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 4417,
totalTime: 7426,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:19 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 139ms
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 7582
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM ERROR [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:19 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3005,
totalTime: 3006,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:19 PM ERROR [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:19 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3007,
totalTime: 3007,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:19 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:19 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3011
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3013
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:19.676Z'
}
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:19 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2842,
totalTime: 10283,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1735:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] [op-1761667631898-1echxn1ld] 🔴 FINAL FAILURE after 10284ms
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3008,
totalTime: 6016,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3004,
totalTime: 3004,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:22 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3009,
totalTime: 6018,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:22 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:22 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:22 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:22 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6036
}
[Nest] 16900 - 10/28/2025, 7:07:22 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 4ms
[Nest] 16900 - 10/28/2025, 7:07:22 PM DEBUG [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:22 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3024
}
[Nest] 16900 - 10/28/2025, 7:07:24 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 1729ms
[Nest] 16900 - 10/28/2025, 7:07:24 PM DEBUG [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:24 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 7763
}
[Nest] 16900 - 10/28/2025, 7:07:24 PM DEBUG [ChromaDBConnectionService] [op-1761667644427-schps49ue] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:24 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:24.427Z'
}
[Nest] 16900 - 10/28/2025, 7:07:24 PM DEBUG [ChromaDBConnectionService] [op-1761667644427-schps49ue] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:24 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 16900 - 10/28/2025, 7:07:25 PM ERROR [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:25 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3008,
totalTime: 9039,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:25 PM WARN [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:25 PM ERROR [ChromaDBConnectionService] [op-1761667636663-cdvkc8t1u] 🔴 FINAL FAILURE after 9040ms
[Nest] 16900 - 10/28/2025, 7:07:25 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:25 PM ERROR [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:25 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3008,
totalTime: 6028,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:25 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:25 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:25 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:25 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 16900 - 10/28/2025, 7:07:25 PM DEBUG [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:25 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6045
}
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaDBConnectionService] [op-1761667644427-schps49ue] ❌ FAILED on attempt 1/3
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3001,
totalTime: 3001,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:27 PM WARN [ChromaDBConnectionService] [op-1761667644427-schps49ue] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:27 PM WARN [ChromaDBConnectionService] [op-1761667644427-schps49ue] ⏳ Waiting 0ms before retry 2...
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 4733,
totalTime: 10767,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:27 PM WARN [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaDBConnectionService] [op-1761667636663-n0v4zpmlr] 🔴 FINAL FAILURE after 10768ms
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:27 PM WARN [ChromaMetricsService] Slow operation detected: searchDocuments took 10768ms
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [VectorMemoryRepository] Failed to search memories
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [VectorMemoryRepository] ChromaDBTimeoutError: Operation timed out after 3000ms
at Timeout.\_onTimeout (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3303:31)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7) {
timestamp: 2025-10-28T16:07:27.430Z,
context: {
timeoutMs: undefined
},
timeoutMs: undefined,
code: 'CHROMADB_TIMEOUT_ERROR'
}
[Nest] 16900 - 10/28/2025, 7:07:27 PM ERROR [AgentMemoryCoreService] Failed to search agent memories: Failed to search memories
[Nest] 16900 - 10/28/2025, 7:07:27 PM DEBUG [WorkflowExecutionCoordinationService] Retrieved coordination context for network devbrand-supervisor-network
[Nest] 16900 - 10/28/2025, 7:07:27 PM DEBUG [WorkflowExecutionCoordinationService] Object(3) {
agentCompatibility: 0,
networkOptimizations: 0,
performancePatterns: 0
}
[Nest] 16900 - 10/28/2025, 7:07:27 PM DEBUG [AgentMemoryContextService] Getting memory context for agent devbrand-supervisor-network in thread multi-agent|network:devbrand-supervisor-network
[Nest] 16900 - 10/28/2025, 7:07:27 PM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 16900 - 10/28/2025, 7:07:27 PM WARN [ChromaDBConnectionService] [op-1761667644427-schps49ue] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:27 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:27 PM DEBUG [ChromaDBConnectionService] [op-1761667644427-schps49ue] Attempt 2/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:27 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3012
}
[Nest] 16900 - 10/28/2025, 7:07:28 PM ERROR [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] ❌ FAILED on attempt 3/3
[Nest] 16900 - 10/28/2025, 7:07:28 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3009,
totalTime: 9051,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:28 PM WARN [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:28 PM ERROR [ChromaDBConnectionService] [op-1761667639676-xqjvym9cn] 🔴 FINAL FAILURE after 9052ms
[Nest] 16900 - 10/28/2025, 7:07:28 PM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBEmbeddingProcessorService] Successfully generated embeddings for 1 queries
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] [op-1761667650063-zlocmtvqr] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: false,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:30.063Z'
}
[Nest] 16900 - 10/28/2025, 7:07:30 PM WARN [ChromaDBConnectionService] [op-1761667650063-zlocmtvqr] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:30 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] [op-1761667650063-zlocmtvqr] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 4
}
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] [op-1761667650068-a8d6y5vxs] Starting ChromaDB operation
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-28T16:07:30.068Z'
}
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] [op-1761667650068-a8d6y5vxs] Attempt 1/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 16900 - 10/28/2025, 7:07:30 PM ERROR [ChromaDBConnectionService] [op-1761667644427-schps49ue] ❌ FAILED on attempt 2/3
[Nest] 16900 - 10/28/2025, 7:07:30 PM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3010,
totalTime: 6019,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3303:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 16900 - 10/28/2025, 7:07:30 PM WARN [ChromaDBConnectionService] [op-1761667644427-schps49ue] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 16900 - 10/28/2025, 7:07:30 PM WARN [ChromaDBConnectionService] [op-1761667644427-schps49ue] ⏳ Waiting 0ms before retry 3...
[Nest] 16900 - 10/28/2025, 7:07:30 PM WARN [ChromaDBConnectionService] [op-1761667644427-schps49ue] Connection not established, reconnecting...
[Nest] 16900 - 10/28/2025, 7:07:30 PM LOG [ChromaDBConnectionService] Connected to ChromaDB in 3ms
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] [op-1761667644427-schps49ue] Attempt 3/3 - executing operation
[Nest] 16900 - 10/28/2025, 7:07:30 PM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6045
}

abdal@Abdallah:/d/projects/nestjs-ai-saas-starter$
