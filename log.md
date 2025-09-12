Hint: you can run the command with --verbose to see the full dependent project outputs

———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

> nx run dev-brand-api:typecheck

> tsc --build --emitDeclarationOnly

src/app/adapters/memory/chroma-vector.adapter.ts(2,33): error TS2307: Cannot find module '@hive-academy/nestjs-chromadb' or its corresponding type declarations.
src/app/adapters/memory/neo4j-graph.adapter.ts(2,30): error TS2307: Cannot find module '@hive-academy/nestjs-neo4j' or its corresponding type declarations.
src/app/adapters/memory/neo4j-graph.adapter.ts(220,10): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/agents/brand-strategist.agent.ts(127,11): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/agents/brand-strategist.agent.ts(142,13): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/agents/content-creator.agent.ts(119,11): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/agents/content-creator.agent.ts(134,13): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/agents/content-creator.agent.ts(245,15): error TS2345: Argument of type 'object' is not assignable to parameter of type 'Record<string, unknown>'.
Index signature for type 'string' is missing in type '{}'.
src/app/agents/content-creator.agent.ts(323,11): error TS6133: 'recentContentCount' is declared but its value is never read.
src/app/agents/content-creator.agent.ts(327,11): error TS6133: 'strategyContext' is declared but its value is never read.
src/app/agents/github-analyzer.agent.ts(129,11): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/agents/github-analyzer.agent.ts(144,13): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/app.module.ts(6,32): error TS2307: Cannot find module '@hive-academy/nestjs-chromadb' or its corresponding type declarations.
src/app/app.module.ts(7,29): error TS2307: Cannot find module '@hive-academy/nestjs-neo4j' or its corresponding type declarations.
src/app/app.module.ts(130,7): error TS2353: Object literal may only specify known properties, and 'imports' does not exist in type '{ useFactory: (...args: unknown[]) => CheckpointModuleOptions | Promise<CheckpointModuleOptions>; inject?: InjectionToken[] | undefined; }'.
src/app/app.module.ts(150,7): error TS2322: Type '(checkpointManager: CheckpointManagerService) => Promise<{ checkpointAdapter: CheckpointManagerAdapter; defaultTimeout?: number; defaultRetryCount?: number; ... 5 more ...; globalMetadata?: Record<string, unknown>; }>' is not assignable to type 'AsyncModuleFactory<FunctionalApiModuleOptions>'.
Types of parameters 'checkpointManager' and 'deps' are incompatible.
Type 'unknown' is not assignable to type 'CheckpointManagerService'.
src/app/app.module.ts(170,7): error TS2322: Type '(checkpointManager: CheckpointManagerService) => Promise<{ checkpointAdapter: CheckpointManagerAdapter; maxCheckpointsPerThread?: number; maxCheckpointAge?: number; ... 4 more ...; storage?: { type: "memory" | "redis" | "postgres" | "sqlite"; config?: Record<string, unknown>; }; }>' is not assignable to type 'AsyncModuleFactory<TimeTravelConfig>'.
Types of parameters 'checkpointManager' and 'deps' are incompatible.
Type 'unknown' is not assignable to type 'CheckpointManagerService'.
src/app/config/chromadb.config.ts(2,44): error TS2307: Cannot find module '@hive-academy/nestjs-chromadb' or its corresponding type declarations.
src/app/config/monitoring.config.ts(53,11): error TS2353: Object literal may only specify known properties, and 'description' does not exist in type 'EscalationPolicy'.
src/app/config/monitoring.config.ts(97,9): error TS2353: Object literal may only specify known properties, and 'from' does not exist in type 'TimeRange'.
src/app/config/neo4j.config.ts(1,41): error TS2307: Cannot find module '@hive-academy/nestjs-neo4j' or its corresponding type declarations.
src/app/controllers/devbrand.controller.ts(123,13): error TS2304: Cannot find name 'EnhancedWorkflowResult'.
src/app/controllers/devbrand.controller.ts(447,9): error TS2554: Expected 1 arguments, but got 3.
src/app/controllers/devbrand.controller.ts(461,9): error TS4104: The type 'readonly BrandMemoryEntry[]' is 'readonly' and cannot be assigned to the mutable type 'MemoryResultDto[]'.
src/app/controllers/devbrand.controller.ts(462,9): error TS2739: Type 'BrandMemoryAnalytics' is missing the following properties from type 'BrandAnalyticsDto': contentMetrics, skillProgress
src/app/controllers/devbrand.controller.ts(536,9): error TS2345: Argument of type '"brand_strategy" | "conversation" | "github_analysis" | "content_generation"' is not assignable to parameter of type 'BrandMemoryType'.
Type '"conversation"' is not assignable to type 'BrandMemoryType'.
src/app/gateways/devbrand-websocket.gateway.ts(52,3): error TS2564: Property 'server' has no initializer and is not definitely assigned in the constructor.
src/app/gateways/devbrand-websocket.gateway.ts(138,11): error TS2554: Expected 1 arguments, but got 3.
src/app/gateways/devbrand-websocket.gateway.ts(296,16): error TS18046: 'error' is of type 'unknown'.
src/app/gateways/devbrand-websocket.gateway.ts(333,9): error TS2554: Expected 1 arguments, but got 3.
src/app/services/checkpoint-examples.service.ts(54,11): error TS2353: Object literal may only specify known properties, and 'enableCheckpointing' does not exist in type 'WorkflowExecutionOptions'.
src/app/services/checkpoint-examples.service.ts(89,51): error TS2339: Property 'trackWorkflow' does not exist on type 'MonitoringFacadeService'.
src/app/services/checkpoint-examples.service.ts(127,51): error TS2339: Property 'executeNetwork' does not exist on type 'MultiAgentCoordinatorService'.
src/app/services/checkpoint-examples.service.ts(158,13): error TS6133: 'workflowState' is declared but its value is never read.
src/app/services/github-integration.service.ts(1,30): error TS6133: 'HttpException' is declared but its value is never read.
src/app/services/github-integration.service.ts(1,45): error TS6133: 'HttpStatus' is declared but its value is never read.
src/app/services/personal-brand-memory.service.ts(7,3): error TS6196: 'UserMemoryPatterns' is declared but never used.
src/app/services/personal-brand-memory.service.ts(18,3): error TS6133: 'BRAND_GRAPH_LABELS' is declared but its value is never read.
src/app/services/personal-brand-memory.service.ts(20,3): error TS6133: 'BrandMemoryEntrySchema' is declared but its value is never read.
src/app/services/personal-brand-memory.service.ts(42,14): error TS2415: Class 'PersonalBrandMemoryService' incorrectly extends base class 'MemoryService'.
Property 'logger' is private in type 'MemoryService' but not in type 'PersonalBrandMemoryService'.
src/app/services/personal-brand-memory.service.ts(76,9): error TS2345: Argument of type 'BrandMemoryMetadata' is not assignable to parameter of type 'Partial<MemoryMetadata>'.
Types of property 'type' are incompatible.
Type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | BrandMemoryType' is not assignable to type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | undefined'.
Type '"dev_achievement"' is not assignable to type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | undefined'.
src/app/services/personal-brand-memory.service.ts(148,9): error TS2345: Argument of type '{ content: string; metadata: BrandMemoryMetadata; }[]' is not assignable to parameter of type 'readonly { content: string; metadata?: Partial<MemoryMetadata> | undefined; }[]'.
Type '{ content: string; metadata: BrandMemoryMetadata; }' is not assignable to type '{ content: string; metadata?: Partial<MemoryMetadata> | undefined; }'.
The types of 'metadata.type' are incompatible between these types.
Type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | BrandMemoryType' is not assignable to type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | undefined'.
Type '"dev_achievement"' is not assignable to type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | undefined'.
src/app/services/personal-brand-memory.service.ts(223,7): error TS4104: The type 'readonly MemoryEntry[]' is 'readonly' and cannot be assigned to the mutable type 'MemoryEntry[]'.
src/app/services/personal-brand-memory.service.ts(555,9): error TS2322: Type '{ structuredDataFor: string; type: BrandMemoryType | MemoryMetadata["type"]; brandContext?: { readonly userId: string; readonly analysisId?: string; readonly contentId?: string; readonly strategyVersion?: string; readonly confidenceScore?: number; readonly validatedByHuman?: boolean; }; technicalData?: { readonly gi...' is not assignable to type 'Partial<MemoryMetadata>'.
Types of property 'type' are incompatible.
Type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | BrandMemoryType' is not assignable to type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | undefined'.
Type '"dev_achievement"' is not assignable to type '"custom" | "conversation" | "fact" | "preference" | "summary" | "context" | undefined'.
src/app/services/personal-brand-memory.service.ts(700,32): error TS2365: Operator '>' cannot be applied to types 'string | number | boolean | SerializableArray | SerializableObject' and 'number'.
src/app/services/personal-brand-memory.service.ts(960,11): error TS7034: Variable 'relationships' implicitly has type 'any[]' in some locations where its type cannot be determined.
src/app/services/personal-brand-memory.service.ts(977,12): error TS7005: Variable 'relationships' implicitly has an 'any[]' type.
src/app/workflows/devbrand-supervisor.workflow.ts(2,1): error TS6133: 'HumanMessage' is declared but its value is never read.
src/app/workflows/devbrand-supervisor.workflow.ts(227,6): error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
src/app/workflows/devbrand-supervisor.workflow.spec.ts(2,44): error TS6305: Output file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/dist/app/workflows/devbrand-supervisor.workflow.d.ts' has not been built from source file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/workflows/devbrand-supervisor.workflow.ts'.
src/app/workflows/devbrand-supervisor.workflow.spec.ts(4,37): error TS6305: Output file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/dist/app/agents/github-analyzer.agent.d.ts' has not been built from source file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/agents/github-analyzer.agent.ts'.
src/app/workflows/devbrand-supervisor.workflow.spec.ts(5,37): error TS6305: Output file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/dist/app/agents/content-creator.agent.d.ts' has not been built from source file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/agents/content-creator.agent.ts'.
src/app/workflows/devbrand-supervisor.workflow.spec.ts(6,38): error TS6305: Output file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/dist/app/agents/brand-strategist.agent.d.ts' has not been built from source file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/agents/brand-strategist.agent.ts'.
Warning: command "tsc --build --emitDeclarationOnly" exited with non-zero status code
————————————————————————————————————————————————————————————————————————————————————————————————
