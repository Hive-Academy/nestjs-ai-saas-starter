 npx nx run dev-brand-api:typecheck

npm warn config cache-max This option has been deprecated in favor of `--prefer-online`

   ⠴  Nx is waiting on 13 dependent project tasks before running tasks from dev-brand-api...

   ⠴  Nx is waiting on 9 dependent project tasks before running tasks from dev-brand-api...

   √  13/13 dependent project tasks succeeded [0 read from cache]

   Hint: you can run the command with --verbose to see the full dependent project outputs

———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

> nx run dev-brand-api:typecheck

> tsc --build --emitDeclarationOnly

../../libs/langgraph-modules/workflow-engine/src/lib/streaming/workflow-stream.service.integration.spec.ts(111,9): error TS2345: Argument of type '{ enabled: boolean; bufferSize: number; flushInterval: number; }' is not assignable to parameter of type 'StreamTokenDecoratorMetadata'.
  Property 'methodName' is missing in type '{ enabled: boolean; bufferSize: number; flushInterval: number; }' but required in type 'StreamTokenDecoratorMetadata'.
../../libs/langgraph-modules/workflow-engine/src/lib/streaming/workflow-stream.service.integration.spec.ts(356,9): error TS2345: Argument of type '{ enabled: boolean; bufferSize: number; flushInterval: number; }' is not assignable to parameter of type 'StreamTokenDecoratorMetadata'.
  Property 'methodName' is missing in type '{ enabled: boolean; bufferSize: number; flushInterval: number; }' but required in type 'StreamTokenDecoratorMetadata'.
../../libs/langgraph-modules/workflow-engine/src/lib/streaming/workflow-stream.service.integration.spec.ts(366,47): error TS2367: This comparison appears to be unintentional because the types 'StreamEventType' and '"TOKEN"' have no overlap.
../../libs/langgraph-modules/workflow-engine/src/lib/streaming/workflow-stream.service.integration.spec.ts(403,9): error TS2345: Argument of type '{ enabled: boolean; processor: (token: string, context: any) => string; bufferSize: number; }' is not assignable to parameter of type 'StreamTokenDecoratorMetadata'.
  Property 'methodName' is missing in type '{ enabled: boolean; processor: (token: string, context: any) => string; bufferSize: number; }' but required in type 'StreamTokenDecoratorMetadata'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(2,1): error TS6133: 'EventEmitter2' is declared but its value is never read.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(17,3): error TS6133: 'AgentNetwork' is declared but its value is never read.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(30,5): error TS2322: Type '{ initializeTokenStream: jest.Mock<any, any, any>; streamToken: jest.Mock<any, any, any>; flushTokens: jest.Mock<any, any, any>; streamEvent: jest.Mock<any, any, any>; streamProgress: jest.Mock<...>; broadcastToExecution: jest.Mock<...>; sendToClient: jest.Mock<...>; }' is not assignable to type 'Mocked<IStreamingService>'.
  Type '{ initializeTokenStream: Mock<any, any, any>; streamToken: Mock<any, any, any>; flushTokens: Mock<any, any, any>; streamEvent: Mock<any, any, any>; streamProgress: Mock<...>; broadcastToExecution: Mock<...>; sendToClient: Mock<...>; }' is missing the following properties from type '{ initializeTokenStream: MockInstance<Promise<void>, [options: TokenStreamOptions], unknown>; streamToken: MockInstance<void, [executionId: string, nodeId: string, token: string, metadata?: Record<...> | undefined], unknown>; ... 6 more ...; sendToClient: MockInstance<...>; }': emitEvent, emitProgress
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(44,7): error TS2353: Object literal may only specify known properties, and 'deleteCheckpoint' does not exist in type 'Mocked<ICheckpointAdapter>'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(111,51): error TS2345: Argument of type '{ size: number; }' is not assignable to parameter of type '{ size: number; keys: string[]; }'.
  Property 'keys' is missing in type '{ size: number; }' but required in type '{ size: number; keys: string[]; }'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(265,11): error TS2353: Object literal may only specify known properties, and 'llmProvider' does not exist in type 'AgentDefinition'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(273,11): error TS2353: Object literal may only specify known properties, and 'llmProvider' does not exist in type 'AgentDefinition'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(316,11): error TS2353: Object literal may only specify known properties, and 'llmProvider' does not exist in type 'AgentDefinition'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(359,53): error TS2345: Argument of type '{ size: number; }' is not assignable to parameter of type '{ size: number; keys: string[]; }'.
  Property 'keys' is missing in type '{ size: number; }' but required in type '{ size: number; keys: string[]; }'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(392,9): error TS2353: Object literal may only specify known properties, and 'agents' does not exist in type '{ healthy: boolean; issues: string[]; agentHealth: Record<string, boolean>; } | Promise<{ healthy: boolean; issues: string[]; agentHealth: Record<string, boolean>; }>'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(400,21): error TS2339: Property 'streaming' does not exist on type '{ healthy: boolean; issues: string[]; agentHealth: Record<string, boolean>; }'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(413,11): error TS2741: Property 'id' is missing in type '{ channel_values: { messages: string[]; }; }' but required in type 'BaseCheckpoint<unknown>'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(414,11): error TS2739: Type '{ timestamp: string; size: number; }' is missing the following properties from type 'BaseCheckpointMetadata': source, step, parents
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(437,9): error TS2353: Object literal may only specify known properties, and 'pending_writes' does not exist in type 'BaseCheckpoint<unknown> | Promise<BaseCheckpoint<unknown> | null>'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(442,34): error TS2322: Type 'string' is not assignable to type 'BaseMessage'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(442,54): error TS2322: Type 'string' is not assignable to type 'BaseMessage'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(485,34): error TS2322: Type 'string' is not assignable to type 'BaseMessage'.
../../libs/langgraph-modules/multi-agent/src/lib/services/multi-agent-coordinator.service.integration.spec.ts(525,54): error TS2345: Argument of type '(id: string) => { id: string; name: string; description: string; systemPrompt: string; capabilities: string[]; llmProvider: string; }' is not assignable to parameter of type '(agentId: string) => AgentDefinition | undefined'.
  Property 'nodeFunction' is missing in type '{ id: string; name: string; description: string; systemPrompt: string; capabilities: string[]; llmProvider: string; }' but required in type 'AgentDefinition'.
src/app/app.module.ts(89,9): error TS2353: Object literal may only specify known properties, and 'namespace' does not exist in type '{ enabled: boolean; port?: number | undefined; }'.
src/app/app.module.ts(93,9): error TS2559: Type 'true' has no properties in common with type '{ origin?: string | boolean | string[] | undefined; credentials?: boolean | undefined; methods?: string[] | undefined; allowedHeaders?: string[] | undefined; }'.
src/app/app.module.ts(105,7): error TS2322: Type '(streamingAdapter: StreamingServiceAdapter) => Promise<{ streamingAdapter: StreamingServiceAdapter; compilation?: { cacheEnabled?: boolean; cacheTTL?: number; optimizeGraphs?: boolean; }; execution?: { defaultTimeout?: number; streamingEnabled?: boolean; parallelExecution?: boolean; maxConcurrency?: number; }; debug...' is not assignable to type '(...args: unknown[]) => WorkflowEngineModuleOptions | Promise<WorkflowEngineModuleOptions>'.
  Types of parameters 'streamingAdapter' and 'args' are incompatible.
    Type 'unknown' is not assignable to type 'StreamingServiceAdapter'.
src/app/app.module.ts(127,7): error TS2322: Type '(streamingAdapter: StreamingServiceAdapter, checkpointManager: CheckpointManagerService) => Promise<{ streamingAdapter: StreamingServiceAdapter; checkpointAdapter: CheckpointManagerAdapter; ... 8 more ...; globalMetadata?: Record<string, unknown>; }>' is not assignable to type 'AsyncModuleFactory<FunctionalApiModuleOptions>'.
  Types of parameters 'streamingAdapter' and 'deps' are incompatible.
    Type 'unknown' is not assignable to type 'StreamingServiceAdapter'.
src/app/business-workflows/agents/customer-support.agent.ts(2,10): error TS2305: Module '"@hive-academy/langgraph-streaming"' has no exported member 'Agent'.
src/app/business-workflows/agents/customer-support.agent.ts(10,3): error TS6133: 'KnowledgeSearchResult' is declared but its value is never read.
src/app/business-workflows/agents/customer-support.agent.ts(11,3): error TS6133: 'SuggestedAction' is declared but its value is never read.
src/app/business-workflows/agents/customer-support.agent.ts(40,29): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/agents/customer-support.agent.ts(69,9): error TS2353: Object literal may only specify known properties, and 'error' does not exist in type 'Partial<CustomerSupportState>'.  
src/app/business-workflows/agents/customer-support.agent.ts(69,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/agents/customer-support.agent.ts(83,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/business-workflows/agents/customer-support.agent.ts(90,28): error TS2339: Property 'map' does not exist on type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }'.
src/app/business-workflows/agents/customer-support.agent.ts(90,32): error TS7006: Parameter 'result' implicitly has an 'any' type.
src/app/business-workflows/agents/customer-support.agent.ts(132,31): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/agents/customer-support.agent.ts(136,28): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/agents/customer-support.agent.ts(297,9): error TS18048: 'customerContext.accountValue' is possibly 'undefined'.
src/app/business-workflows/agents/customer-support.agent.ts(387,9): error TS18048: 'customerContext.satisfactionScore' is possibly 'undefined'.
src/app/business-workflows/agents/customer-support.agent.ts(399,51): error TS18048: 'customerContext.accountValue' is possibly 'undefined'.
src/app/business-workflows/controllers/customer-support.controller.ts(13,1): error TS6133: 'map' is declared but its value is never read.
src/app/business-workflows/controllers/customer-support.controller.ts(19,3): error TS6133: 'TicketResponse' is declared but its value is never read.
src/app/business-workflows/controllers/customer-support.controller.ts(22,3): error TS6133: 'ApprovalRequest' is declared but its value is never read.
src/app/business-workflows/controllers/customer-support.controller.ts(46,22): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/controllers/customer-support.controller.ts(74,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/controllers/customer-support.controller.ts(101,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/controllers/customer-support.controller.ts(183,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/controllers/customer-support.controller.ts(220,44): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/controllers/customer-support.controller.ts(234,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/controllers/customer-support.controller.ts(255,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/controllers/customer-support.controller.ts(280,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/controllers/customer-support.controller.ts(362,16): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/dto/customer-support.dto.ts(12,3): error TS6133: 'IsEmail' is declared but its value is never read.
src/app/business-workflows/dto/customer-support.dto.ts(13,3): error TS6133: 'ValidateNested' is declared but its value is never read.
src/app/business-workflows/dto/customer-support.dto.ts(26,3): error TS2564: Property 'customerId' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(31,3): error TS2564: Property 'title' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(36,3): error TS2564: Property 'description' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(63,3): error TS2564: Property 'status' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(77,3): error TS2564: Property 'approved' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(82,3): error TS2564: Property 'approvedBy' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(98,3): error TS2564: Property 'query' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(123,3): error TS2564: Property 'helpful' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(139,3): error TS2564: Property 'id' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(144,3): error TS2564: Property 'title' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(148,3): error TS2564: Property 'content' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(152,3): error TS2564: Property 'category' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(206,3): error TS2564: Property 'ticketId' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(207,3): error TS2564: Property 'response' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(208,3): error TS2564: Property 'confidence' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(209,3): error TS2564: Property 'suggestedActions' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(210,3): error TS2564: Property 'escalationRequired' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(211,3): error TS2564: Property 'estimatedResolutionTime' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(212,3): error TS2564: Property 'similarTickets' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(217,3): error TS2564: Property 'nextSteps' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(221,3): error TS2564: Property 'success' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(227,3): error TS2564: Property 'executionId' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(228,3): error TS2564: Property 'streaming' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(233,3): error TS2564: Property 'totalTickets' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(234,3): error TS2564: Property 'resolvedTickets' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(235,3): error TS2564: Property 'avgResolutionTime' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(236,3): error TS2564: Property 'avgSatisfactionScore' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(237,3): error TS2564: Property 'escalationRate' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(238,3): error TS2564: Property 'automationRate' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(239,3): error TS2564: Property 'costSavings' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(240,3): error TS2564: Property 'responseTime' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(241,3): error TS2564: Property 'firstContactResolution' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(242,3): error TS2564: Property 'customerSatisfactionTrend' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(246,3): error TS2564: Property 'avgResolutionTime' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(247,3): error TS2564: Property 'ticketsResolved' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(248,3): error TS2564: Property 'escalationRate' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(249,3): error TS2564: Property 'customerSatisfaction' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(250,3): error TS2564: Property 'costSavings' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(251,3): error TS2564: Property 'timeToResolution' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(252,3): error TS2564: Property 'agentProductivity' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(253,3): error TS2564: Property 'customerRetention' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(257,3): error TS2564: Property 'success' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(258,3): error TS2564: Property 'data' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(268,3): error TS2564: Property 'total' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(269,3): error TS2564: Property 'query' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(273,3): error TS2564: Property 'totalArticles' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(274,3): error TS2564: Property 'totalTickets' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(275,3): error TS2564: Property 'topCategories' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(280,3): error TS2564: Property 'mostUsedArticles' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(286,3): error TS2564: Property 'resolutionPatterns' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(294,3): error TS2564: Property 'data' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(306,3): error TS2564: Property 'total' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(307,3): error TS2564: Property 'page' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(308,3): error TS2564: Property 'limit' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(309,3): error TS2564: Property 'hasNext' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/dto/customer-support.dto.ts(310,3): error TS2564: Property 'hasPrev' has no initializer and is not definitely assigned in the constructor.
src/app/business-workflows/services/business-metrics.service.ts(8,3): error TS6133: 'WorkflowExecutionState' is declared but its value is never read.
src/app/business-workflows/services/business-metrics.service.ts(71,22): error TS2339: Property 'broadcastMetric' does not exist on type 'StreamingServiceAdapter'.
src/app/business-workflows/services/business-metrics.service.ts(125,31): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(129,20): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(176,31): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(180,20): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(221,30): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(221,44): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(222,16): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(253,31): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(257,20): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/business-metrics.service.ts(277,20): error TS2339: Property 'broadcastMetric' does not exist on type 'StreamingServiceAdapter'.
src/app/business-workflows/services/knowledge-base.service.ts(31,49): error TS2345: Argument of type '{ name: string; metadata: { description: string; version: string; }; }' is not assignable to parameter of type 'string'.
src/app/business-workflows/services/knowledge-base.service.ts(40,49): error TS2345: Argument of type '{ name: string; metadata: { description: string; version: string; }; }' is not assignable to parameter of type 'string'.
src/app/business-workflows/services/knowledge-base.service.ts(64,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/business-workflows/services/knowledge-base.service.ts(73,28): error TS2488: Type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' must have a '[Symbol.iterator]()' method that returns an iterator.
src/app/business-workflows/services/knowledge-base.service.ts(117,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/business-workflows/services/knowledge-base.service.ts(124,28): error TS2339: Property 'map' does not exist on type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }'.
src/app/business-workflows/services/knowledge-base.service.ts(124,33): error TS7006: Parameter 'result' implicitly has an 'any' type.
src/app/business-workflows/services/knowledge-base.service.ts(154,32): error TS2554: Expected 2-3 arguments, but got 1.
src/app/business-workflows/services/knowledge-base.service.ts(227,32): error TS2554: Expected 2-3 arguments, but got 1.
src/app/business-workflows/services/knowledge-base.service.ts(340,30): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/services/knowledge-base.service.ts(341,16): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/business-workflows/workflows/customer-support.workflow.ts(11,3): error TS6133: 'StreamingServiceAdapter' is declared but its value is never read.
src/app/business-workflows/workflows/customer-support.workflow.ts(19,3): error TS6133: 'TicketResponse' is declared but its value is never read.
src/app/business-workflows/workflows/customer-support.workflow.ts(20,3): error TS6133: 'ApprovalRequest' is declared but its value is never read.
src/app/business-workflows/workflows/customer-support.workflow.ts(21,3): error TS6133: 'WorkflowExecutionState' is declared but its value is never read.
src/app/business-workflows/workflows/customer-support.workflow.ts(39,40): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/workflows/customer-support.workflow.ts(51,32): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/workflows/customer-support.workflow.ts(95,30): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/workflows/customer-support.workflow.ts(145,24): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/workflows/customer-support.workflow.ts(152,26): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/workflows/customer-support.workflow.ts(162,27): error TS2322: Type '"solution_found"' is not assignable to type 'StreamEventType'.
src/app/business-workflows/workflows/customer-support.workflow.ts(162,45): error TS2322: Type '"escalation_required"' is not assignable to type 'StreamEventType'.
src/app/business-workflows/workflows/customer-support.workflow.ts(163,33): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/workflows/customer-support.workflow.ts(215,24): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/workflows/customer-support.workflow.ts(222,26): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/workflows/customer-support.workflow.ts(232,23): error TS2353: Object literal may only specify known properties, and 'riskLevel' does not exist in type 'RequiresApprovalOptions'.
src/app/business-workflows/workflows/customer-support.workflow.ts(233,29): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/business-workflows/workflows/customer-support.workflow.ts(280,24): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/workflows/customer-support.workflow.ts(287,22): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/workflows/customer-support.workflow.ts(402,9): error TS18048: 'state.analysis.sentiment' is possibly 'undefined'.
src/app/business-workflows/workflows/customer-support.workflow.ts(414,9): error TS18048: 'state.analysis.sentiment' is possibly 'undefined'.
src/app/business-workflows/workflows/customer-support.workflow.ts(442,11): error TS2353: Object literal may only specify known properties, and 'currentStep' does not exist in type 'ProgressData'.
src/app/config/multi-agent.config.ts(8,10): error TS2305: Module '"../showcase/agents/analysis-showcase.agent"' has no exported member 'AnalysisShowcaseAgent'.
src/app/config/multi-agent.config.ts(9,10): error TS2305: Module '"../showcase/agents/content-showcase.agent"' has no exported member 'ContentShowcaseAgent'.
src/app/config/multi-agent.config.ts(10,10): error TS2305: Module '"../showcase/agents/research-showcase.agent"' has no exported member 'ResearchShowcaseAgent'.
src/app/config/workflow-engine.config.ts(9,5): error TS2353: Object literal may only specify known properties, and 'cache' does not exist in type 'WorkflowEngineModuleOptions'.
src/app/showcase/agents/analysis-showcase.agent.ts(25,3): error TS2322: Type '"moderate"' is not assignable to type '"medium" | "fast" | "slow" | undefined'.
src/app/showcase/agents/analysis-showcase.agent.ts(39,29): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/showcase/agents/analysis-showcase.agent.ts(51,71): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/analysis-showcase.agent.ts(55,79): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/analysis-showcase.agent.ts(59,71): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/analysis-showcase.agent.ts(63,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/analysis-showcase.agent.ts(72,52): error TS2339: Property 'generateResponse' does not exist on type 'LlmProviderService'.
src/app/showcase/agents/analysis-showcase.agent.ts(81,73): error TS2345: Argument of type '{}' is not assignable to parameter of type 'any[]'.
  Type '{}' is missing the following properties from type 'any[]': length, pop, push, concat, and 29 more.
src/app/showcase/agents/analysis-showcase.agent.ts(95,57): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/analysis-showcase.agent.ts(115,50): error TS7006: Parameter 'o' implicitly has an 'any' type.
src/app/showcase/agents/analysis-showcase.agent.ts(118,52): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/app/showcase/agents/analysis-showcase.agent.ts(144,16): error TS2488: Type '{}' must have a '[Symbol.iterator]()' method that returns an iterator.
src/app/showcase/agents/analysis-showcase.agent.ts(159,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(25,3): error TS2322: Type '"moderate"' is not assignable to type '"medium" | "fast" | "slow" | undefined'.
src/app/showcase/agents/content-showcase.agent.ts(39,29): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/showcase/agents/content-showcase.agent.ts(52,71): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(57,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(58,24): error TS2339: Property 'positioning' does not exist on type '{}'.
src/app/showcase/agents/content-showcase.agent.ts(64,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(74,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(87,64): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(105,39): error TS2339: Property 'positioning' does not exist on type '{}'.
src/app/showcase/agents/content-showcase.agent.ts(123,43): error TS2339: Property 'engagementLevel' does not exist on type '{ wordCount: number; qualityScore: number; engagementLevel: string; professionalQuality: string; hasPersonalStory: boolean; hasHashtags: boolean; hasCallToAction: boolean; } | { wordCount: number; ... 5 more ...; hasLessonsLearned: boolean; }'.
  Property 'engagementLevel' does not exist on type '{ wordCount: number; qualityScore: number; technicalDepth: string; educationalValue: string; hasStructure: boolean; hasPracticalExample: boolean; hasLessonsLearned: boolean; }'.
src/app/showcase/agents/content-showcase.agent.ts(124,45): error TS2339: Property 'professionalQuality' does not exist on type '{ wordCount: number; qualityScore: number; engagementLevel: string; professionalQuality: string; hasPersonalStory: boolean; hasHashtags: boolean; hasCallToAction: boolean; } | { wordCount: number; ... 5 more ...; hasLessonsLearned: boolean; }'.
  Property 'professionalQuality' does not exist on type '{ wordCount: number; qualityScore: number; technicalDepth: string; educationalValue: string; hasStructure: boolean; hasPracticalExample: boolean; hasLessonsLearned: boolean; }'.
src/app/showcase/agents/content-showcase.agent.ts(128,35): error TS2339: Property 'technicalDepth' does not exist on type '{ wordCount: number; qualityScore: number; engagementLevel: string; professionalQuality: string; hasPersonalStory: boolean; hasHashtags: boolean; hasCallToAction: boolean; } | { wordCount: number; ... 5 more ...; hasLessonsLearned: boolean; }'.
  Property 'technicalDepth' does not exist on type '{ wordCount: number; qualityScore: number; engagementLevel: string; professionalQuality: string; hasPersonalStory: boolean; hasHashtags: boolean; hasCallToAction: boolean; }'.
src/app/showcase/agents/content-showcase.agent.ts(129,37): error TS2339: Property 'educationalValue' does not exist on type '{ wordCount: number; qualityScore: number; engagementLevel: string; professionalQuality: string; hasPersonalStory: boolean; hasHashtags: boolean; hasCallToAction: boolean; } | { wordCount: number; ... 5 more ...; hasLessonsLearned: boolean; }'.
  Property 'educationalValue' does not exist on type '{ wordCount: number; qualityScore: number; engagementLevel: string; professionalQuality: string; hasPersonalStory: boolean; hasHashtags: boolean; hasCallToAction: boolean; }'.
src/app/showcase/agents/content-showcase.agent.ts(143,35): error TS2339: Property 'positioning' does not exist on type '{}'.
src/app/showcase/agents/content-showcase.agent.ts(157,16): error TS2488: Type '{}' must have a '[Symbol.iterator]()' method that returns an iterator.
src/app/showcase/agents/content-showcase.agent.ts(173,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/content-showcase.agent.ts(237,51): error TS2339: Property 'generateResponse' does not exist on type 'LlmProviderService'.
src/app/showcase/agents/content-showcase.agent.ts(293,51): error TS2339: Property 'generateResponse' does not exist on type 'LlmProviderService'.
src/app/showcase/agents/research-showcase.agent.ts(39,29): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/app/showcase/agents/research-showcase.agent.ts(56,9): error TS2322: Type '{}' is not assignable to type 'string'.
src/app/showcase/agents/research-showcase.agent.ts(72,9): error TS2322: Type '{}' is not assignable to type 'string'.
src/app/showcase/agents/research-showcase.agent.ts(79,9): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/agents/research-showcase.agent.ts(85,49): error TS2339: Property 'generateResponse' does not exist on type 'LlmProviderService'.
src/app/showcase/agents/research-showcase.agent.ts(150,68): error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.
src/app/showcase/services/personal-brand-memory.service.ts(93,13): error TS2322: Type 'string[]' is not assignable to type 'string | number | boolean | null'.
src/app/showcase/services/personal-brand-memory.service.ts(134,57): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(194,60): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(226,65): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(242,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/showcase/services/personal-brand-memory.service.ts(252,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/showcase/services/personal-brand-memory.service.ts(262,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/showcase/services/personal-brand-memory.service.ts(280,69): error TS18046: 'record.get' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(286,52): error TS2345: Argument of type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is not assignable to parameter of type 'any[]'.
  Type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is missing the following properties from type 'any[]': length, pop, push, concat, and 29 more.
src/app/showcase/services/personal-brand-memory.service.ts(287,51): error TS2345: Argument of type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is not assignable to parameter of type 'any[]'.
  Type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is missing the following properties from type 'any[]': length, pop, push, concat, and 29 more.
src/app/showcase/services/personal-brand-memory.service.ts(288,54): error TS2345: Argument of type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is not assignable to parameter of type 'any[]'.
  Type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is missing the following properties from type 'any[]': length, pop, push, concat, and 29 more.
src/app/showcase/services/personal-brand-memory.service.ts(292,61): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(306,9): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/showcase/services/personal-brand-memory.service.ts(333,42): error TS2345: Argument of type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is not assignable to parameter of type 'any[]'.
  Type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is missing the following properties from type 'any[]': length, pop, push, concat, and 29 more.
src/app/showcase/services/personal-brand-memory.service.ts(336,73): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(337,23): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(352,11): error TS2353: Object literal may only specify known properties, and 'collection' does not exist in type 'number[]'.
src/app/showcase/services/personal-brand-memory.service.ts(359,52): error TS2345: Argument of type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is not assignable to parameter of type 'any[]'.
  Type '{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[]; }' is missing the following properties from type 'any[]': length, pop, push, concat, and 29 more.
src/app/showcase/services/personal-brand-memory.service.ts(363,59): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(386,24): error TS18046: 'record.get' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(387,23): error TS18046: 'record.get' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(388,17): error TS18046: 'record.get' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(393,61): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/personal-brand-memory.service.ts(444,61): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/app/showcase/services/showcase-analysis.service.ts(66,38): error TS2339: Property 'agentsUsed' does not exist on type 'MultiAgentResult'.
src/app/showcase/services/showcase-analysis.service.ts(67,40): error TS2339: Property 'toolsInvoked' does not exist on type 'MultiAgentResult'.
src/app/showcase/services/showcase-analysis.service.ts(68,41): error TS2339: Property 'duration' does not exist on type 'MultiAgentResult'.
src/app/showcase/services/showcase-analysis.service.ts(75,9): error TS2322: Type 'MessageContent' is not assignable to type 'string'.
  Type 'MessageContentComplex[]' is not assignable to type 'string'.
src/app/showcase/services/showcase-analysis.service.ts(166,9): error TS2322: Type '{ memoryAccesses: number; toolInvocations: any; tokensStreamed: any; totalDuration?: number | undefined; agentSwitches?: number | undefined; averageResponseTime?: number | undefined; ... 6 more ...; connectionStability?: number | undefined; }' is not assignable to type 'ShowcaseMetrics'.
  Types of property 'totalDuration' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/app/showcase/services/showcase-analysis.service.ts(193,9): error TS2322: Type '{ memoryAccesses: number; totalDuration?: number | undefined; agentSwitches?: number | undefined; toolInvocations?: number | undefined; averageResponseTime?: number | undefined; ... 7 more ...; connectionStability?: number | undefined; }' is not assignable to type 'ShowcaseMetrics'.
  Types of property 'totalDuration' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/app/showcase/services/showcase-content.service.ts(202,7): error TS2322: Type '{ tokensStreamed: number; totalDuration?: number | undefined; agentSwitches?: number | undefined; toolInvocations?: number | undefined; memoryAccesses?: number | undefined; averageResponseTime?: number | undefined; ... 6 more ...; connectionStability?: number | undefined; }' is not assignable to type 'ShowcaseMetrics'.
  Types of property 'totalDuration' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/app/showcase/services/showcase-network.service.ts(267,27): error TS18046: 'error' is of type 'unknown'.
src/app/showcase/services/showcase-quality.service.ts(59,11): error TS2353: Object literal may only specify known properties, and 'contentSections' does not exist in type 'Partial<ShowcaseAgentState>'.
src/app/showcase/services/showcase-quality.service.ts(278,7): error TS2322: Type '(ShowcaseApprovalHistory | { approvalId: string; response: "reject" | "approve" | "revise"; timestamp: number; reviewer: string; comments: string; })[]' is not assignable to type 'ShowcaseApprovalHistory[]'.
  Type 'ShowcaseApprovalHistory | { approvalId: string; response: "reject" | "approve" | "revise"; timestamp: number; reviewer: string; comments: string; }' is not assignable to type 'ShowcaseApprovalHistory'.
    Type '{ approvalId: string; response: "reject" | "approve" | "revise"; timestamp: number; reviewer: string; comments: string; }' is missing the following properties from type 'ShowcaseApprovalHistory': decision, decidedBy, decidedAt
src/app/showcase/showcase.module.ts(46,7): error TS2322: Type '() => { path: string; }' is not assignable to type '(...args: any[]) => ChromaDBModuleOptions | Promise<ChromaDBModuleOptions>'.
  Type '{ path: string; }' is not assignable to type 'ChromaDBModuleOptions | Promise<ChromaDBModuleOptions>'.
src/app/showcase/showcase.module.ts(53,7): error TS2322: Type '() => { scheme: string; host: string; port: string | number; username: string; password: string; database: string; }' is not assignable to type '(...args: any[]) => Neo4jModuleOptions | Promise<Neo4jModuleOptions>'.
  Type '{ scheme: string; host: string; port: string | number; username: string; password: string; database: string; }' is not assignable to type 'Neo4jModuleOptions | Promise<Neo4jModuleOptions>'.
    Property 'uri' is missing in type '{ scheme: string; host: string; port: string | number; username: string; password: string; database: string; }' but required in type 'Neo4jModuleOptions'.
src/app/showcase/tools/github-integration.tools.ts(133,62): error TS2554: Expected 1 arguments, but got 2.
src/app/showcase/tools/github-integration.tools.ts(138,68): error TS2339: Property 'length' does not exist on type 'Promise<CodeAchievement[]>'.
src/app/showcase/tools/github-integration.tools.ts(145,9): error TS2740: Type 'Promise<CodeAchievement[]>' is missing the following properties from type 'CodeAchievement[]': length, pop, push, concat, and 29 more.
src/app/showcase/tools/github-integration.tools.ts(311,9): error TS2322: Type '{ Authorization: string; } | { Authorization?: undefined; }' is not assignable to type 'HeadersInit | undefined'.
  Type '{ Authorization?: undefined; }' is not assignable to type 'HeadersInit | undefined'.
    Type '{ Authorization?: undefined; }' is not assignable to type 'Record<string, string | readonly string[]>'.
      Property 'Authorization' is incompatible with index signature.
        Type 'undefined' is not assignable to type 'string | readonly string[]'.
src/app/showcase/tools/github-integration.tools.ts(319,14): error TS18046: 'repos' is of type 'unknown'.
src/app/showcase/tools/github-integration.tools.ts(334,11): error TS2322: Type '{ Authorization: string; } | { Authorization?: undefined; }' is not assignable to type 'HeadersInit | undefined'.
  Type '{ Authorization?: undefined; }' is not assignable to type 'HeadersInit | undefined'.
    Type '{ Authorization?: undefined; }' is not assignable to type 'Record<string, string | readonly string[]>'.
      Property 'Authorization' is incompatible with index signature.
        Type 'undefined' is not assignable to type 'string | readonly string[]'.
src/app/showcase/tools/github-integration.tools.ts(339,30): error TS2488: Type 'unknown' must have a '[Symbol.iterator]()' method that returns an iterator.
src/app/showcase/tools/showcase-document.tools.ts(76,9): error TS7053: Element implicitly has an 'any' type because expression of type '"metadata"' can't be used to index type '{ url: string; title: string; content: string; wordCount: number; extractedAt: string; contentType: "text" | "structured" | "markdown"; }'.
  Property 'metadata' does not exist on type '{ url: string; title: string; content: string; wordCount: number; extractedAt: string; contentType: "text" | "structured" | "markdown"; }'.
src/app/showcase/tools/showcase-document.tools.ts(159,9): error TS7053: Element implicitly has an 'any' type because expression of type '"keyQuotes"' can't be used to index type '{ summary: string; keyPoints: string[]; summaryStyle: "technical" | "executive" | "bullet-points" | "narrative"; length: "medium" | "short" | "long"; confidence: number; readingTime: string; ... 4 more ...; generatedAt: string; }'.
  Property 'keyQuotes' does not exist on type '{ summary: string; keyPoints: string[]; summaryStyle: "technical" | "executive" | "bullet-points" | "narrative"; length: "medium" | "short" | "long"; confidence: number; readingTime: string; ... 4 more ...; generatedAt: string; }'.
src/app/showcase/tools/showcase-document.tools.ts(302,9): error TS7053: Element implicitly has an 'any' type because expression of type '"recommendations"' can't be used to index type '{ overallScore: number; grade: string; dimensionScores: Record<string, number>; qualityDimensions: string[]; targetAudience: "technical" | "business" | "general" | "academic"; contentStats: { ...; }; assessedAt: string; }'.
  Property 'recommendations' does not exist on type '{ overallScore: number; grade: string; dimensionScores: Record<string, number>; qualityDimensions: string[]; targetAudience: "technical" | "business" | "general" | "academic"; contentStats: { ...; }; assessedAt: string; }'.
src/app/showcase/tools/showcase-document.tools.ts(303,9): error TS7053: Element implicitly has an 'any' type because expression of type '"improvementPotential"' can't be used to index type '{ overallScore: number; grade: string; dimensionScores: Record<string, number>; qualityDimensions: string[]; targetAudience: "technical" | "business" | "general" | "academic"; contentStats: { ...; }; assessedAt: string; }'.
  Property 'improvementPotential' does not exist on type '{ overallScore: number; grade: string; dimensionScores: Record<string, number>; qualityDimensions: string[]; targetAudience: "technical" | "business" | "general" | "academic"; contentStats: { ...; }; assessedAt: string; }'.
src/app/showcase/workflows/supervisor-showcase.workflow.ts(12,3): error TS6133: 'ApprovalRiskLevel' is declared but its value is never read.
src/app/showcase/workflows/supervisor-showcase.workflow.ts(13,3): error TS6133: 'EscalationStrategy' is declared but its value is never read.
src/app/integration/streaming-di-integration.spec.ts(4,27): error TS6305: Output file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/dist/app/app.module.d.ts' has not been built from source file 'D:/projects/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/app.module.ts'.
src/app/integration/streaming-di-integration.spec.ts(7,3): error TS6133: 'StreamingModule' is declared but its value is never read.
src/app/integration/streaming-di-integration.spec.ts(13,3): error TS6133: 'IStreamingService' is declared but its value is never read.
src/app/integration/streaming-di-integration.spec.ts(106,13): error TS6133: 'configService' is declared but its value is never read.
src/app/streaming/websocket-integration.e2e.spec.ts(18,7): error TS6133: 'gateway' is declared but its value is never read.
src/app/streaming/websocket-integration.e2e.spec.ts(28,13): error TS2353: Object literal may only specify known properties, and 'cors' does not exist in type '{ enabled: boolean; port?: number | undefined; }'.
src/app/streaming/websocket-integration.e2e.spec.ts(54,13): error TS2353: Object literal may only specify known properties, and 'realTimeUpdates' does not exist in type '{ enabled: boolean; modes?: ("values" | "updates" | "messages")[] | undefined; }'.
src/app/streaming/websocket-integration.e2e.spec.ts(67,22): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ WEBSOCKET_PORT: number; STREAMING_ENABLED: boolean; }'.
  No index signature with a parameter of type 'string' was found on type '{ WEBSOCKET_PORT: number; STREAMING_ENABLED: boolean; }'.
src/app/streaming/websocket-integration.e2e.spec.ts(91,9): error TS18046: 'error' is of type 'unknown'.
src/app/streaming/websocket-integration.e2e.spec.ts(342,43): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
Warning: command "tsc --build --emitDeclarationOnly" exited with non-zero status code
