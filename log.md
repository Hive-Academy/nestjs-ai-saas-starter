npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

> @nestjs-ai-saas-starter/source@0.0.0 api
> cd apps/dev-brand-api && npm run build && npm run start

npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

> @nestjs-ai-saas-starter/dev-brand-api@0.0.1 build
> npx nx run dev-brand-api:build

npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

> nx run dev-brand-api:build:production

assets by path \*.json 262 KiB
asset package-lock.json 260 KiB [emitted] [big]
asset package.json 2.41 KiB [emitted]
asset main.js 181 KiB [emitted] [minimized] (name: main)
asset assets/.gitkeep 0 bytes [emitted] [from: src/assets/.gitkeep] [copied]
cacheable modules 373 KiB 37 modules
modules by path external "@hive-academy/ 504 bytes
external "@hive-academy/nestjs-chromadb" 42 bytes [built] [code generated]
external "@hive-academy/nestjs-neo4j" 42 bytes [built] [code generated]
external "@hive-academy/langgraph-memory" 42 bytes [built] [code generated]
external "@hive-academy/langgraph-checkpoint" 42 bytes [built] [code generated]

- 8 modules
  modules by path external "@nestjs/ 210 bytes
  external "@nestjs/common" 42 bytes [built] [code generated]
  external "@nestjs/core" 42 bytes [built] [code generated]
  external "@nestjs/swagger" 42 bytes [built] [code generated]
  external "@nestjs/config" 42 bytes [built] [code generated]
  external "@nestjs/terminus" 42 bytes [built] [code generated]
- 7 modules
  webpack 5.101.3 compiled successfully in 2442 ms

NX Successfully ran target build for project dev-brand-api

npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

> @nestjs-ai-saas-starter/dev-brand-api@0.0.1 start
> node dist/main.js

🔧 Encapsulated environment loaded: {
loadedFiles: [
'.env.app',
'.env.platform',
'.env.llm',
'.env.neo4j',
'.env.chromadb'
],
errors: []
}
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[NestFactory] [39m[32mStarting Nest application...[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[MetricsCollectorService] [39m[32mMetricsCollectorService initialized with batch processing[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[AlertingService] [39m[32mAlertingService initialized with 30s evaluation interval[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[HealthCheckService] [39m[32mHealth check registered: memory[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[HealthCheckService] [39m[32mHealth check registered: cpu[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[HealthCheckService] [39m[32mHealth check registered: uptime[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [95m DEBUG[39m [38;5;3m[HealthCheckService] [39m[95mDefault system health checks registered[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[HealthCheckService] [39m[32mHealthCheckService initialized with 60s monitoring interval[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[PerformanceTrackerService] [39m[32mPerformanceTrackerService initialized[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [95m DEBUG[39m [38;5;3m[DashboardService] [39m[95mMock metric data initialized[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[DashboardService] [39m[32mDashboardService initialized[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[MonitoringFacadeService] [39m[32mMonitoringFacadeService initialized[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mConfigHostModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mHttpModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mTerminusModule dependencies initialized[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mDiscoveryModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mConfigModule dependencies initialized[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mConfigModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mLanggraphModulesMonitoringModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mEventEmitterModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mEventEmitterModule dependencies initialized[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mWorkflowEngineModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mHitlModule dependencies initialized[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mShowcaseModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[EmbeddingService] [39m[32mInitialized huggingface embedding provider[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mPlatformModule dependencies initialized[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mStreamingModule dependencies initialized[39m[38;5;3m +0ms[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [95m DEBUG[39m [38;5;3m[Neo4jGraphAdapter] [39m[95mNeo4jGraphAdapter initialized with Neo4jService[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mNeo4jModule dependencies initialized[39m[38;5;3m +0ms[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [95m DEBUG[39m [38;5;3m[MemoryGraphService] [39m[95mMemoryGraphService initialized with configuration[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [95m DEBUG[39m [38;5;3m[MemoryGraphService] [39mObject(2) {
neo4jDatabase: [32m'neo4j'[39m,
enableAutoSummarization: [33mfalse[39m
}
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mLanggraphModulesCheckpointModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mFunctionalApiModule dependencies initialized[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mTimeTravelModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mMultiAgentModule dependencies initialized[39m[38;5;3m +1ms[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [95m DEBUG[39m [38;5;3m[ChromaVectorAdapter] [39m[95mChromaVectorAdapter initialized with ChromaDBService[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mChromaDBModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[AdapterTestService] [39m[32m✅ 10/10 child module services injected successfully![39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[AdapterTestService] [39m[32mAvailable services: checkpoint, memory, multiAgent, hitl, streaming, functionalApi, platform, timeTravel, monitoring, workflowEngine[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mMemoryModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:36 AM [32m LOG[39m [38;5;3m[InstanceLoader] [39m[32mAppModule dependencies initialized[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "subscribe_execution" message[39m[38;5;3m +227ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "unsubscribe_execution" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "subscribe_events" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "join_room" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "leave_room" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "authentication" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "ping" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketsController] [39m[32mStreamingWebSocketGateway subscribed to the "get_status" message[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RoutesResolver] [39m[32mAdapterTestController {/api/test/modules}:[39m[38;5;3m +2ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/test/modules/health, GET} route[39m[38;5;3m +2ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/test/modules/comprehensive, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/test/modules/injection, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/test/modules/memory, GET} route[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/test/modules/checkpoint, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RoutesResolver] [39m[32mCheckpointExamplesController {/api/checkpoint-demo}:[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/enabled, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/disabled, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/multi-agent, POST} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/time-travel, POST} route[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/comparison, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/health, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/checkpoint-demo/info, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RoutesResolver] [39m[32mHealthController {/api/health}:[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/health, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/health/detailed, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/health/libraries, GET} route[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RoutesResolver] [39m[32mShowcaseController {/api/v1/showcase}:[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/workflows/supervisor, POST} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/workflows/swarm, POST} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/status, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/agents/:agentId/demo, GET} route[39m[38;5;3m +1ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/metrics/:executionId, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/capabilities, GET} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[RouterExplorer] [39m[32mMapped {/api/v1/showcase/explore/pattern/:pattern, POST} route[39m[38;5;3m +0ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[Neo4jConnectionService] [39m[32mSuccessfully connected to Neo4j database[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[CheckpointSaverFactory] [39m[95mCreating checkpoint saver of type: memory[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[CheckpointSaverFactory] [39m[95mMemory checkpoint saver created successfully[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointRegistryService] [39m[32mSet default checkpoint saver: default[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointRegistryService] [39m[32mRegistered checkpoint saver: default (default)[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointManagerService] [39m[32mInitialized memory checkpoint saver: default[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointManagerService] [39m[32mCheckpoint system initialized with 1 saver(s)[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointCleanupService] [39m[32mCheckpoint cleanup scheduler started (interval: 300000ms)[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointHealthService] [39m[32mHealth monitoring started (interval: 30000ms)[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[CheckpointManagerService] [39m[32mCheckpoint background services started: cleanup, health monitoring[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[FunctionalApiModuleInitializer] [39m[32mInitializing FunctionalApi module with explicit registration[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WorkflowRegistrationService] [39m[32mRegistering 2 workflow providers[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[WorkflowRegistrationService] [39m[95mRegistered workflow: supervisor-showcase (newConstructor) with 5 tasks[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[WorkflowRegistrationService] [39m[95mRegistered workflow: swarm-showcase (newConstructor) with 3 tasks[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WorkflowRegistrationService] [39m[32mSuccessfully registered 2 workflow providers[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[FunctionalApiModuleInitializer] [39m[32mRegistered 2 workflows with 10 total tasks[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[FunctionalApiModuleInitializer] [39m[32mFunctionalApi module initialization completed successfully[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[TokenStreamingService] [39m[32mInitializing TokenStreamingService[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketBridgeService] [39m[32mInitializing WebSocketBridgeService[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[WebSocketBridgeService] [39m[95mToken stream integration setup completed[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[WebSocketBridgeService] [39m[95mWorkflow stream integration setup completed[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[StreamingWebSocketGateway] [39m[32mInitializing StreamingWebSocketGateway[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[WebSocketBridgeService] [39m[95mWebSocket gateway registered with bridge service[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[WebSocketBridgeService] [39m[32mRegistered client streaming_gateway with rooms: [][39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[StreamingWebSocketGateway] [39m[95mBridge service integration configured[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[StreamingWebSocketGateway] [39m[32mWebSocket gateway initialized on namespace: /streaming[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[HumanApprovalService] [39m[32mHuman Approval Service initialized[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[ConfidenceEvaluatorService] [39m[32mConfidence Evaluator Service initialized[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ConfidenceEvaluatorService] [39m[95mLoaded 2 historical patterns[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[MultiAgentCoordinatorService] [39m[32mMulti-agent coordinator service initialized with SOLID architecture[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[LlmProviderService] [39m[95mModel configuration validated: provider=openrouter, model=moonshotai/kimi-k2:free[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[LlmProviderService] [39m[95mTesting LLM connectivity: provider=openrouter, model=moonshotai/kimi-k2:free[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[LlmProviderService] [39m[95mCreating new LLM instance: moonshotai/kimi-k2:free[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[LlmProviderService] [39m[95mCreating LLM instance: provider=openrouter, model=moonshotai/kimi-k2:free[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[LlmProviderService] [39m[95mCreating OpenRouter LLM with model: moonshotai/kimi-k2:free[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[MultiAgentModuleInitializer] [39m[32mInitializing MultiAgent module with explicit registration[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[ToolRegistrationService] [39m[32mRegistering 2 tool providers[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: analyze_text_content[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: analyze_text_content from ShowcaseAnalysisTools.analyzeTextContent[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: generate_improvement_suggestions[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: generate_improvement_suggestions from ShowcaseAnalysisTools.generateImprovementSuggestions[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: stream_analysis_progress[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: stream_analysis_progress from ShowcaseAnalysisTools.streamAnalysisProgress[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: fetch_external_data[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: fetch_external_data from ShowcaseIntegrationTools.fetchExternalData[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: validate_json_schema[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: validate_json_schema from ShowcaseIntegrationTools.validateJsonSchema[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: fetch_and_validate_data[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: fetch_and_validate_data from ShowcaseIntegrationTools.fetchAndValidateData[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistryService] [39m[95mRegistered tool: simulate_webhook_processing[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[ToolRegistrationService] [39m[95mRegistered tool: simulate_webhook_processing from ShowcaseIntegrationTools.simulateWebhookProcessing[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[ToolRegistrationService] [39m[32mSuccessfully registered 2 tool providers[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[MultiAgentModuleInitializer] [39m[32mRegistered 7 tools from 2 providers[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistrationService] [39m[32mRegistering 5 agent providers[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistryService] [39m[32mRegistered agent: demo-showcase (Demo Showcase Agent)[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[AgentRegistrationService] [39m[95mRegistered agent: demo-showcase (Demo Showcase Agent) from DemoShowcaseAgent[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistryService] [39m[32mRegistered agent: advanced-showcase (Advanced Showcase Agent)[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[AgentRegistrationService] [39m[95mRegistered agent: advanced-showcase (Advanced Showcase Agent) from AdvancedShowcaseAgent[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistryService] [39m[32mRegistered agent: specialist-showcase (Specialist Showcase Agent)[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[AgentRegistrationService] [39m[95mRegistered agent: specialist-showcase (Specialist Showcase Agent) from SpecialistShowcaseAgent[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistryService] [39m[32mRegistered agent: streaming-showcase (Streaming Showcase Agent)[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[AgentRegistrationService] [39m[95mRegistered agent: streaming-showcase (Streaming Showcase Agent) from StreamingShowcaseAgent[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistryService] [39m[32mRegistered agent: hitl-showcase (HITL Showcase Agent)[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [95m DEBUG[39m [38;5;3m[AgentRegistrationService] [39m[95mRegistered agent: hitl-showcase (HITL Showcase Agent) from HitlShowcaseAgent[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[AgentRegistrationService] [39m[32mSuccessfully registered 5 agent providers[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[MultiAgentModuleInitializer] [39m[32mRegistered 5 agents from 5 providers[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:37 AM [32m LOG[39m [38;5;3m[MultiAgentModuleInitializer] [39m[32mMultiAgent module initialization completed successfully[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [38;5;3m[LlmProviderService] [39m[32mLLM connectivity test PASSED for provider=openrouter, model=moonshotai/kimi-k2:free[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [38;5;3m[MultiAgentCoordinatorService] [39m[32mLLM connectivity verified[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [38;5;3m[TimeTravelService] [39m[32mBranch management enabled for time travel[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [38;5;3m[TimeTravelService] [39m[32mAuto-checkpoint enabled with interval: 60000ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [38;5;3m[TimeTravelService] [39m[32mTime travel service initialized[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [38;5;3m[NestApplication] [39m[32mNest application successfully started[39m[38;5;3m +8ms[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [32m🚀 Application is running on: http://localhost:3000/api[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [32m📚 API Documentation available at: http://localhost:3000/docs[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [32m🔧 Health check available at: http://localhost:3000/api/health[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [32m🔌 WebSocket streaming available at: ws://localhost:3000/streaming[39m
[32m[Nest] 59408 - [39m09/13/2025, 12:29:39 AM [32m LOG[39m [32m🌊 Frontend should connect to: ws://localhost:3000/streaming[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:30:06 AM [95m DEBUG[39m [38;5;3m[AlertingService] [39m[95mEvaluating 0 active alert rules[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:30:07 AM [95m DEBUG[39m [38;5;3m[CheckpointHealthService] [39m[95mPerforming scheduled health checks[39m
[95m[Nest] 59408 - [39m09/13/2025, 12:30:07 AM [95m DEBUG[39m [38;5;3m[CheckpointHealthService] [39m[95mHealth check for default: healthy (1ms)[39m
