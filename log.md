}
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [NestFactory] Starting Nest application...
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [MetricsCollectorService] MetricsCollectorService initialized with batch processing
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [AlertingService] AlertingService initialized with 30s evaluation interval
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [HealthCheckService] Health check registered: memory  
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [HealthCheckService] Health check registered: cpu
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [HealthCheckService] Health check registered: uptime  
[Nest] 18160 - 09/14/2025, 4:32:28 AM DEBUG [HealthCheckService] Default system health checks registered
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [HealthCheckService] HealthCheckService initialized with 60s monitoring interval
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [PerformanceTrackerService] PerformanceTrackerService initialized
[Nest] 18160 - 09/14/2025, 4:32:28 AM DEBUG [DashboardService] Mock metric data initialized
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [DashboardService] DashboardService initialized
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [MonitoringFacadeService] MonitoringFacadeService initialized
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [InstanceLoader] TerminusModule dependencies initialized +0ms
[Nest] 18160 - 09/14/2025, 4:32:28 AM LOG [InstanceLoader] DiscoveryModule dependencies initialized +0ms
[Nest] 18160 - 09/14/2025, 4:32:28 AM ERROR [ExceptionHandler] UnknownDependenciesException [Error]: Nest can't resolve dependencies of the newConstructor (?, STREAMING_SERVICE_TOKEN). Please make sure that the argument Object at index [0] is available in the BusinessWorkflowsModule context.

Potential solutions:

- Is BusinessWorkflowsModule a valid NestJS module?
- If Object is a provider, is it part of the current BusinessWorkflowsModule?
- If Object is exported from a separate @Module, is that module imported within BusinessWorkflowsModule?
  @Module({
  imports: [ /*the Module containing Object*/ ]
  })

      at Injector.lookupComponentInParentModules (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\injector.js:286:19)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async resolveParam (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\injector.js:141:38)
      at async Promise.all (index 0)
      at async Injector.resolveConstructorParams (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\injector.js:169:27)
      at async Injector.loadInstance (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\injector.js:75:13)
      at async Injector.loadProvider (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\injector.js:103:9)
      at async D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\instance-loader.js:56:13
      at async Promise.all (index 4)
      at async InstanceLoader.createInstancesOfProviders (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\instance-loader.js:55:9) {

  type: 'newConstructor',
  context: {
  index: 0,
  dependencies: [
  [Function: Object],
  'STREAMING_SERVICE_TOKEN'
  ],
  name: [Function: Object]
  },
  metadata: {
  id: 'abea6057a10d5a657552a'
  },
  moduleRef: {
  id: '27bf12b52721a9106c8ef'
  }
  }
