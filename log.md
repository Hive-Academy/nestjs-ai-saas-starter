[Nest] 25964 - 10/13/2025, 1:47:56 AM ERROR [HuggingFaceEmbeddingProvider] HuggingFace embedding failed: HuggingFace API error: Request timeout after 3000ms: <https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5>
Error: HuggingFace API error: Request timeout after 3000ms: <https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5>
at HuggingFaceEmbeddingProvider.callHuggingFaceAPI (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3854:13)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async HuggingFaceEmbeddingProvider.embedBatch (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3811:24)
at async HuggingFaceEmbeddingProvider.processBatches (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3392:28)
at async EmbeddingService.embed (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:4045:14)
at async ChromaDBEmbeddingProcessorService.generateEmbeddingsBatch (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:6250:26)
at async ChromaDBEmbeddingProcessorService.processQueryEmbeddings (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:6229:26)
at async ChromaDBService.searchDocuments (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:6550:38)
at async VectorMemoryRepository.searchWithScores (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:544:20)
at async VectorMemoryRepository.searchMemoriesSimilar (D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:16039)
[Nest] 25964 - 10/13/2025, 1:47:56 AM WARN [ChromaDBEmbeddingProcessorService] Failed to generate query embeddings: HuggingFace embedding failed: HuggingFace API error: Request timeout after 3000ms: <https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5>
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 0,
timeout: 3000,
timestamp: '2025-10-12T22:47:56.139Z'
}
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:47:56.140Z'
}
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:47:56 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:47:58 AM ERROR [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:47:58 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2697,
totalTime: 2697,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:47:58 AM WARN [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:47:58 AM DEBUG [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:47:58 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2712
}
[Nest] 25964 - 10/13/2025, 1:47:59 AM ERROR [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:47:59 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3011,
totalTime: 3011,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:47:59 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:47:59 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:47:59 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Connection not established, reconnecting...
[Nest] 25964 - 10/13/2025, 1:47:59 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 8ms
[Nest] 25964 - 10/13/2025, 1:47:59 AM DEBUG [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:47:59 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3021
}
[Nest] 25964 - 10/13/2025, 1:47:59 AM DEBUG [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:47:59 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:47:59.161Z'
}
[Nest] 25964 - 10/13/2025, 1:47:59 AM DEBUG [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:47:59 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:48:01 AM ERROR [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:01 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2272,
totalTime: 4983,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:01 AM WARN [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:01 AM DEBUG [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:01 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 4998
}
[Nest] 25964 - 10/13/2025, 1:48:01 AM ERROR [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:48:01 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2264,
totalTime: 2264,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:01 AM WARN [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:48:01 AM DEBUG [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:01 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2278
}
[Nest] 25964 - 10/13/2025, 1:48:02 AM ERROR [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:02 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3015,
totalTime: 6028,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:02 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:02 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:02 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Connection not established, reconnecting...
[Nest] 25964 - 10/13/2025, 1:48:02 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 4ms
[Nest] 25964 - 10/13/2025, 1:48:02 AM DEBUG [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:02 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6048
}
[Nest] 25964 - 10/13/2025, 1:48:02 AM DEBUG [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:48:02 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:48:02.187Z'
}
[Nest] 25964 - 10/13/2025, 1:48:02 AM DEBUG [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:02 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:48:03 AM ERROR [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] ❌ FAILED on attempt 3/3
[Nest] 25964 - 10/13/2025, 1:48:03 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2264,
totalTime: 7262,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:03 AM ERROR [ChromaDBConnectionService] [op-1760309276140-r42iktdnq] 🔴 FINAL FAILURE after 7263ms
[Nest] 25964 - 10/13/2025, 1:48:03 AM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 25964 - 10/13/2025, 1:48:03 AM ERROR [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:03 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2280,
totalTime: 4558,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:03 AM WARN [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:03 AM DEBUG [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:03 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 4572
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3001,
totalTime: 3001,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM WARN [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:05 AM WARN [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] ❌ FAILED on attempt 3/3
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3007,
totalTime: 9050,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM WARN [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaDBConnectionService] [op-1760309276139-izpnsllq1] 🔴 FINAL FAILURE after 9051ms
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM WARN [ChromaMetricsService] Slow operation detected: searchDocuments took 9051ms
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [VectorMemoryRepository] Failed to search memories
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [VectorMemoryRepository] ChromaDBTimeoutError: Operation timed out after 3000ms
at Timeout.\_onTimeout (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3304:31)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7) {
timestamp: 2025-10-12T22:48:05.189Z,
context: {
timeoutMs: undefined
},
timeoutMs: undefined,
code: 'CHROMADB_TIMEOUT_ERROR'
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM ERROR [AgentMemoryCoreService] Failed to search agent memories: Failed to search memories
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBEmbeddingProcessorService] Generating embeddings for 1 query texts
[Nest] 25964 - 10/13/2025, 1:48:05 AM WARN [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] Connection not established, reconnecting...
[Nest] 25964 - 10/13/2025, 1:48:05 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3008
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBEmbeddingProcessorService] Successfully generated embeddings for 1 queries
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:48:05.920Z'
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 1
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:48:05.921Z'
}
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:05 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:48:06 AM ERROR [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] ❌ FAILED on attempt 3/3
[Nest] 25964 - 10/13/2025, 1:48:06 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2283,
totalTime: 6855,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:06 AM ERROR [ChromaDBConnectionService] [op-1760309279161-9drcim8dx] 🔴 FINAL FAILURE after 6857ms
[Nest] 25964 - 10/13/2025, 1:48:06 AM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 25964 - 10/13/2025, 1:48:07 AM ERROR [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:07 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2759,
totalTime: 5765,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:07 AM WARN [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:07 AM DEBUG [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:07 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 5780
}
[Nest] 25964 - 10/13/2025, 1:48:08 AM ERROR [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:48:08 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2354,
totalTime: 2354,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:08 AM WARN [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2363
}
[Nest] 25964 - 10/13/2025, 1:48:08 AM ERROR [ChromaDBConnectionService] [op-1760309285920-fddq589fs] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:48:08 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3007,
totalTime: 3008,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:08 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:08 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:48:08 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Connection not established, reconnecting...
[Nest] 25964 - 10/13/2025, 1:48:08 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 2ms
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3019
}
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:48:08.939Z'
}
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:08 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:48:10 AM ERROR [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] ❌ FAILED on attempt 3/3
[Nest] 25964 - 10/13/2025, 1:48:10 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2262,
totalTime: 8042,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:10 AM ERROR [ChromaDBConnectionService] [op-1760309282187-fd32g3nsw] 🔴 FINAL FAILURE after 8043ms
[Nest] 25964 - 10/13/2025, 1:48:10 AM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 25964 - 10/13/2025, 1:48:10 AM ERROR [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:10 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2272,
totalTime: 4635,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:10 AM WARN [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:10 AM DEBUG [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:10 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 4639
}
[Nest] 25964 - 10/13/2025, 1:48:11 AM ERROR [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:48:11 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3002,
totalTime: 3002,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:11 AM WARN [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:11 AM WARN [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:48:11 AM ERROR [ChromaDBConnectionService] [op-1760309285920-fddq589fs] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:11 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3007,
totalTime: 6022,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: false,
willRetry: true,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:11 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:11 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:11 AM WARN [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] Connection not established, reconnecting...
[Nest] 25964 - 10/13/2025, 1:48:11 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Connection not established, reconnecting...
[Nest] 25964 - 10/13/2025, 1:48:11 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 4ms
[Nest] 25964 - 10/13/2025, 1:48:11 AM DEBUG [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:11 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 3016
}
[Nest] 25964 - 10/13/2025, 1:48:12 AM LOG [ChromaDBConnectionService] Connected to ChromaDB in 564ms
[Nest] 25964 - 10/13/2025, 1:48:12 AM DEBUG [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:12 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 6596
}
[Nest] 25964 - 10/13/2025, 1:48:12 AM DEBUG [ChromaDBConnectionService] [op-1760309292517-856whr53z] Starting ChromaDB operation
[Nest] 25964 - 10/13/2025, 1:48:12 AM DEBUG [ChromaDBConnectionService] Object(4) {
isConnected: true,
maxRetries: 3,
timeout: 3000,
timestamp: '2025-10-12T22:48:12.517Z'
}
[Nest] 25964 - 10/13/2025, 1:48:12 AM DEBUG [ChromaDBConnectionService] [op-1760309292517-856whr53z] Attempt 1/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:12 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 0
}
[Nest] 25964 - 10/13/2025, 1:48:12 AM ERROR [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] ❌ FAILED on attempt 3/3
[Nest] 25964 - 10/13/2025, 1:48:12 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2286,
totalTime: 6925,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: false,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:12 AM ERROR [ChromaDBConnectionService] [op-1760309285921-2dtv2m9a9] 🔴 FINAL FAILURE after 6925ms
[Nest] 25964 - 10/13/2025, 1:48:12 AM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.'
}
[Nest] 25964 - 10/13/2025, 1:48:14 AM ERROR [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] ❌ FAILED on attempt 2/3
[Nest] 25964 - 10/13/2025, 1:48:14 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2824,
totalTime: 5836,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:14 AM WARN [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] ⏳ Waiting 0ms before retry 3...
[Nest] 25964 - 10/13/2025, 1:48:14 AM DEBUG [ChromaDBConnectionService] [op-1760309288939-j9irj4l2v] Attempt 3/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:14 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 5837
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaDBConnectionService] [op-1760309292517-856whr53z] ❌ FAILED on attempt 1/3
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 2602,
totalTime: 2602,
errorType: 'UNKNOWN',
errorMessage: 'Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.',
isConnectionError: false,
wasConnected: true,
willRetry: true,
stack: 'ChromaConnectionError: Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable.\n at chromaFetch (file:///D:/projects/nestjs-ai-saas-starter/node_modules/chromadb/dist/chromadb.mjs:1710:13)\n at process.processTicksAndRejections (node:internal/process/task_queues:105:5)'
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM WARN [ChromaDBConnectionService] [op-1760309292517-856whr53z] ⏳ Waiting 0ms before retry 2...
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [ChromaDBConnectionService] [op-1760309292517-856whr53z] Attempt 2/3 - executing operation
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [ChromaDBConnectionService] Object(1) {
timeElapsed: 2608
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaDBConnectionService] [op-1760309285920-fddq589fs] ❌ FAILED on attempt 3/3
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaDBConnectionService] Object(8) {
duration: 3566,
totalTime: 9598,
errorType: 'TIMEOUT',
errorMessage: 'Operation timed out after 3000ms',
isConnectionError: true,
wasConnected: true,
willRetry: false,
stack: 'ChromaDBTimeoutError: Operation timed out after 3000ms\n at Timeout.\_onTimeout (D:\\projects\\nestjs-ai-saas-starter\\node_modules\\@hive-academy\\nestjs-chromadb\\index.cjs.js:3304:31)\n at listOnTimeout (node:internal/timers:588:17)'
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM WARN [ChromaDBConnectionService] [op-1760309285920-fddq589fs] Marking connection as unhealthy due to: Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaDBConnectionService] [op-1760309285920-fddq589fs] 🔴 FINAL FAILURE after 9599ms
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaDBConnectionService] Object(2) {
totalAttempts: 3,
finalError: 'Operation timed out after 3000ms'
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM WARN [ChromaMetricsService] Slow operation detected: searchDocuments took 9600ms
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [ChromaMetricsService] Operation failed: searchDocuments - Operation timed out after 3000ms
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [VectorMemoryRepository] Failed to search memories
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [VectorMemoryRepository] ChromaDBTimeoutError: Operation timed out after 3000ms
at Timeout.\_onTimeout (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\nestjs-chromadb\index.cjs.js:3304:31)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7) {
timestamp: 2025-10-12T22:48:15.518Z,
context: {
timeoutMs: undefined
},
timeoutMs: undefined,
code: 'CHROMADB_TIMEOUT_ERROR'
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [AgentMemoryCoreService] Failed to search agent memories: Failed to search memories
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [NetworkSetupService] Retrieved network optimizations for devbrand-supervisor-network
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [NetworkSetupService] Object(3) {
agentOrderOptimized: true,
topologyOptimized: false,
performanceTuned: false
}
[Nest] 25964 - 10/13/2025, 1:48:15 AM WARN [AgentRegistryService] Agent github-code-analyzer is already registered, updating definition
[Nest] 25964 - 10/13/2025, 1:48:15 AM LOG [AgentRegistryService] Registered agent: github-code-analyzer (GitHub Code Analyzer)
[Nest] 25964 - 10/13/2025, 1:48:15 AM WARN [AgentRegistryService] Agent personal-brand-strategist is already registered, updating definition
[Nest] 25964 - 10/13/2025, 1:48:15 AM LOG [AgentRegistryService] Registered agent: personal-brand-strategist (Personal Brand Strategist)
[Nest] 25964 - 10/13/2025, 1:48:15 AM WARN [AgentRegistryService] Agent content-creator is already registered, updating definition
[Nest] 25964 - 10/13/2025, 1:48:15 AM LOG [AgentRegistryService] Registered agent: content-creator (Content Creator)
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [NetworkManagerService] CheckpointManager not available - checkpointing disabled
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [GraphBuilderService] Building supervisor graph with agents:
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [GraphBuilderService] Array(3) [
'github-code-analyzer',
'personal-brand-strategist',
'content-creator'
]
[Nest] 25964 - 10/13/2025, 1:48:15 AM DEBUG [LlmProviderService] Using cached LLM: moonshotai/kimi-k2:free
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [NetworkManagerService] Failed to create network devbrand-supervisor-network:
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [NetworkManagerService] TypeError
at Reflect.getMetadata (D:\projects\nestjs-ai-saas-starter\node_modules\reflect-metadata\Reflect.js:354:23)
at getAgentConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:2824:18)
at D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:2876:46
at Array.map (<anonymous>)
at GraphBuilderService.buildSupervisorGraph (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:2874:38)
at async NetworkManagerService.createNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:17249:19)
at async NetworkSetupService.setupNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:23116:30)
at async DevBrandSupervisorWorkflow.onModuleInit (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:27569:24)
at async Promise.all (index 3)
at async callModuleInitHook (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\hooks\on-module-init.hook.js:43:5)
[Nest] 25964 - 10/13/2025, 1:48:15 AM ERROR [DevBrandSupervisorWorkflow] Failed to initialize multi-agent workflow: Failed to create network:
D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:17276
throw new NetworkConfigurationError(`Failed to create network: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
^

NetworkConfigurationError: Failed to create network:
at NetworkManagerService.createNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:17276:13)
at async NetworkSetupService.setupNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:23116:30)
at async DevBrandSupervisorWorkflow.onModuleInit (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:27569:24)
at async Promise.all (index 3)
at async callModuleInitHook (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\hooks\on-module-init.hook.js:43:5)
at async NestApplication.callInitHook (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\nest-application-context.js:242:13)
at async NestApplication.init (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\nest-application.js:103:9)
at async D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\dist\main.js:1:456887 {
code: 'NETWORK_CONFIGURATION_ERROR',
details: TypeError
at Reflect.getMetadata (D:\projects\nestjs-ai-saas-starter\node_modules\reflect-metadata\Reflect.js:354:23)
at getAgentConfig (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:2824:18)
at D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:2876:46
at Array.map (<anonymous>)
at GraphBuilderService.buildSupervisorGraph (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:2874:38)
at async NetworkManagerService.createNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:17249:19)
at async NetworkSetupService.setupNetwork (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:23116:30)
at async DevBrandSupervisorWorkflow.onModuleInit (D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\langgraph-multi-agent\index.cjs.js:27569:24)
at async Promise.all (index 3)
at async callModuleInitHook (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\hooks\on-module-init.hook.js:43:5)
}
