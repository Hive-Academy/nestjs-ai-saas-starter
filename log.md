```bash
> tsc --build --emitDeclarationOnly

src/app/adapters/hitl/neo4j-approval-chain-storage.adapter.ts(69,13): error TS6133: 'result' is declared but its value is never read.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(30,22): error TS6138: Property 'options' is declared but its value is never read.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(90,18): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(94,22): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(129,21): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(129,26): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(162,21): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(162,26): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(226,18): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(246,28): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(319,21): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(319,26): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(348,28): error TS2488: Type 'QueryResult<Record<string, unknown>>' must have a '[Symbol.iterator]()' method that returns an iterator.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(432,58): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(432,63): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(444,60): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(444,65): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(453,56): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(453,61): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(518,21): error TS2339: Property 'map' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(518,26): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(620,22): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(685,24): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(750,28): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(767,21): error TS2339: Property 'length' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(767,35): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-confidence-storage.adapter.ts(790,22): error TS7053: Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'QueryResult<Record<string, unknown>>'.
  Property '0' does not exist on type 'QueryResult<Record<string, unknown>>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(4,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'IFeedbackStorageService'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(5,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'FeedbackEntry'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(6,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'FeedbackType'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(7,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'ProcessingResult'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(8,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'FeedbackAnalytics'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(9,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'InvalidFeedbackDataError'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(9,3): error TS6133: 'InvalidFeedbackDataError' is declared but its value is never read.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(10,3): error TS2305: Module '"@hive-academy/langgraph-hitl"' has no exported member 'FeedbackStorageError'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(38,10): error TS2339: Property 'validateFeedbackData' does not exist on type 'Neo4jFeedbackStorageAdapter'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(79,37): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(104,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(106,11): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(110,22): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(137,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(139,14): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(139,34): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(180,52): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(182,11): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(213,52): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(215,9): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(242,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(244,14): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(244,34): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(272,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(274,14): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(274,34): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(305,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(307,14): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(307,34): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(338,57): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(361,59): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(364,7): error TS18046: 'providerResult' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(364,39): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(382,57): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(383,28): error TS18046: 'trendsResult' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(396,41): error TS18046: 'countsResult' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(436,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(438,14): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(438,34): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(464,51): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(467,7): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(467,31): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(505,52): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(510,9): error TS18046: 'result' is of type 'unknown'.
src/app/adapters/hitl/neo4j-feedback-storage.adapter.ts(530,36): error TS2345: Argument of type 'string' is not assignable to parameter of type '(session: Session) => Promise<unknown>'.
src/app/app.module.ts(118,7): error TS2322: Type '(checkpointAdapter: ICheckpointAdapter, memoryAdapter: IMemoryAdapter) => Promise<{ checkpointAdapter: ICheckpointAdapter; memoryAdapter: IMemoryAdapter; adapters: { ...; }; defaultTimeout?: number; confidenceThreshold?: number; enabled?: boolean; }>' is not assignable to type '(...args: any[]) => HitlModuleOptions | Promise<HitlModuleOptions>'.
  Type 'Promise<{ checkpointAdapter: ICheckpointAdapter; memoryAdapter: IMemoryAdapter; adapters: { storage: typeof Neo4jHitlStorageAdapter; interruptionStorage: typeof Neo4jInterruptionStorageAdapter; confidenceStorage: typeof Neo4jConfidenceStorageAdapter; feedbackStorage: typeof Neo4jFeedbackStorageAdapter; approvalChain...' is not assignable to type 'HitlModuleOptions | Promise<HitlModuleOptions>'.
    Type 'Promise<{ checkpointAdapter: ICheckpointAdapter; memoryAdapter: IMemoryAdapter; adapters: { storage: typeof Neo4jHitlStorageAdapter; interruptionStorage: typeof Neo4jInterruptionStorageAdapter; confidenceStorage: typeof Neo4jConfidenceStorageAdapter; feedbackStorage: typeof Neo4jFeedbackStorageAdapter; approvalChain...' is not assignable to type 'Promise<HitlModuleOptions>'.
      Type '{ checkpointAdapter: ICheckpointAdapter; memoryAdapter: IMemoryAdapter; adapters: { storage: typeof Neo4jHitlStorageAdapter; interruptionStorage: typeof Neo4jInterruptionStorageAdapter; confidenceStorage: typeof Neo4jConfidenceStorageAdapter; feedbackStorage: typeof Neo4jFeedbackStorageAdapter; approvalChainStorage:...' is not assignable to type 'HitlModuleOptions'.
        The types of 'adapters.feedbackStorage' are incompatible between these types.
          Type 'typeof Neo4jFeedbackStorageAdapter' is not assignable to type 'IFeedbackStorageService | Type<IFeedbackStorageService> | undefined'.
            Type 'typeof Neo4jFeedbackStorageAdapter' is not assignable to type 'Type<IFeedbackStorageService>'.
              Type 'Neo4jFeedbackStorageAdapter' is missing the following properties from type 'IFeedbackStorageService': validateFeedbackData, validateProcessingResult
src/app/business-workflows/agents/content-creator.agent.ts(17,10): error TS6133: 'AgentExecutionError' is declared but its value is never read.
src/app/business-workflows/agents/content-creator.agent.ts(17,31): error TS6133: 'MemoryServiceError' is declared but its value is never read.
src/app/business-workflows/agents/content-creator.agent.ts(18,30): error TS6133: 'IsContentType' is declared but its value is never read.
src/app/business-workflows/agents/content-creator.agent.ts(18,45): error TS6133: 'IsPlatform' is declared but its value is never read.
src/app/business-workflows/agents/content-creator.agent.ts(71,2): error TS2304: Cannot find name 'Workflow'.
src/app/business-workflows/agents/content-creator.agent.ts(94,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(95,43): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(101,11): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(122,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(123,11): error TS6133: 'achievements' is declared but its value is never read.
src/app/business-workflows/agents/content-creator.agent.ts(123,43): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(128,21): error TS2551: Property 'getBrandStrategy' does not exist on type 'PersonalBrandMemoryService'. Did you mean 'storeBrandStrategy'?
src/app/business-workflows/agents/content-creator.agent.ts(128,75): error TS2339: Property 'brandStrategy' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(136,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(152,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(156,20): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/agents/content-creator.agent.ts(181,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(182,43): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(183,40): error TS2339: Property 'brandVoice' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(184,43): error TS2339: Property 'brandStrategy' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(224,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(258,48): error TS2339: Property 'rawLinkedinContent' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(259,45): error TS2339: Property 'rawDevtoContent' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(260,43): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(275,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(291,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(295,20): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/agents/content-creator.agent.ts(308,45): error TS2339: Property 'linkedinContent' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(309,42): error TS2339: Property 'devtoContent' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(310,43): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(315,48): error TS2339: Property 'linkedinEngagement' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(316,45): error TS2339: Property 'devtoEngagement' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(338,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(339,45): error TS2339: Property 'linkedinContent' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(340,42): error TS2339: Property 'devtoContent' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(341,48): error TS2339: Property 'linkedinEngagement' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(342,45): error TS2339: Property 'devtoEngagement' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(343,34): error TS2339: Property 'mode' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(361,11): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/content-creator.agent.ts(366,62): error TS2339: Property 'contentStartTime' does not exist on type '{}'.
src/app/business-workflows/agents/content-creator.agent.ts(383,28): error TS2532: Object is possibly 'undefined'.
src/app/business-workflows/agents/content-creator.agent.ts(396,10): error TS2339: Property 'logger' does not exist on type 'ContentCreatorAgent'.
src/app/business-workflows/agents/content-creator.agent.ts(407,28): error TS2532: Object is possibly 'undefined'.
src/app/business-workflows/agents/content-creator.agent.ts(420,10): error TS2339: Property 'logger' does not exist on type 'ContentCreatorAgent'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(27,34): error TS6133: 'AgentExecutionError' is declared but its value is never read.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(28,20): error TS6133: 'IsGitHubUsername' is declared but its value is never read.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(88,19): error TS2416: Property 'workflowConfig' in type 'GitHubCodeAnalyzerAgent' is not assignable to the same property in base type 'DeclarativeWorkflowBase<WorkflowAgentState>'.
  Property 'name' is missing in type '{ enableInternalStreaming: boolean; enableInternalCheckpointing: boolean; internalTimeout: number; enableErrorRecovery: boolean; maxInternalRetries: number; enableStepProgress: boolean; stateKey: string; }' but required in type 'WorkflowExecutionConfig'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(128,25): error TS18046: 'state.messages' is of type 'unknown'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(128,40): error TS18046: 'state.messages' is of type 'unknown'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(134,31): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(135,26): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(140,30): error TS2339: Property 'timeframe' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(141,26): error TS2339: Property 'timeframe' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(148,11): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(178,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(179,39): error TS2339: Property 'timeframe' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(193,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(226,40): error TS2339: Property 'githubData' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(240,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(253,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(256,20): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(271,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(272,40): error TS2339: Property 'githubData' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(286,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(299,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(302,20): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(318,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(319,40): error TS2339: Property 'githubData' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(320,42): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(321,47): error TS2339: Property 'developerInsights' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(345,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(354,100): error TS2339: Property 'timeframe' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(359,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(363,20): error TS18046: 'error' is of type 'unknown'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(376,40): error TS2339: Property 'githubData' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(377,42): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(379,43): error TS2339: Property 'aiAnalysis' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(379,72): error TS2339: Property 'aiAnalysis' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(395,44): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(396,39): error TS2339: Property 'timeframe' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(397,40): error TS2339: Property 'githubData' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(398,42): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(399,40): error TS2339: Property 'aiAnalysis' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(400,34): error TS2339: Property 'mode' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(416,11): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(421,62): error TS2339: Property 'analysisStartTime' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(436,52): error TS2339: Property 'summary' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(436,76): error TS2339: Property 'length' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(437,85): error TS2339: Property 'length' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(451,52): error TS2339: Property 'summary' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(451,76): error TS2339: Property 'length' does not exist on type '{}'.
src/app/business-workflows/agents/github-code-analyzer.agent.ts(452,85): error TS2339: Property 'length' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(13,25): error TS6133: 'Workflow' is declared but its value is never read.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(72,14): error TS2515: Non-abstract class 'PersonalBrandStrategistAgent' does not implement inherited abstract member workflowConfig from class 'DeclarativeWorkflowBase<WorkflowAgentState>'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(105,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(111,11): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(129,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(130,43): error TS2339: Property 'achievements' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(131,40): error TS2339: Property 'githubData' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(159,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(177,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(193,39): error TS2339: Property 'brandData' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(194,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(235,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(250,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(266,40): error TS2339: Property 'brandScore' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(300,43): error TS2339: Property 'brandAnalysis' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(301,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(327,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(339,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(354,43): error TS2339: Property 'brandAnalysis' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(355,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(356,39): error TS2339: Property 'brandData' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(362,34): error TS2339: Property 'brandScore' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(386,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(398,13): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(414,45): error TS2339: Property 'githubUsername' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(415,42): error TS2339: Property 'strategyType' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(416,43): error TS2339: Property 'finalStrategy' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(417,39): error TS2339: Property 'brandData' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(423,35): error TS2339: Property 'brandScore' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(425,33): error TS2339: Property 'brandAnalysis' does not exist on type '{}'.
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(431,32): error TS2551: Property 'previousSteps' does not exist on type 'TaskExecutionContext<FunctionalWorkflowState>'. Did you mean 'previousTask'?
src/app/business-workflows/agents/personal-brand-strategist.agent.ts(441,11): error TS2698: Spread types may only be created from object types.
src/app/business-workflows/core/errors/business-workflow.errors.ts(18,23): error TS2323: Cannot redeclare exported variable 'BusinessWorkflowError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(82,14): error TS2323: Cannot redeclare exported variable 'AgentInitializationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(108,14): error TS2323: Cannot redeclare exported variable 'AgentExecutionError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(135,14): error TS2323: Cannot redeclare exported variable 'AgentTimeoutError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(166,14): error TS2323: Cannot redeclare exported variable 'WorkflowConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(191,14): error TS2323: Cannot redeclare exported variable 'WorkflowStateError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(218,14): error TS2323: Cannot redeclare exported variable 'WorkflowTransitionError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(250,14): error TS2323: Cannot redeclare exported variable 'ExternalServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(278,14): error TS2323: Cannot redeclare exported variable 'GitHubIntegrationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(293,10): error TS2540: Cannot assign to 'errorCode' because it is a read-only property.
src/app/business-workflows/core/errors/business-workflow.errors.ts(296,3): error TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'ExternalServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(305,14): error TS2323: Cannot redeclare exported variable 'MemoryServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(332,14): error TS2323: Cannot redeclare exported variable 'LLMProviderError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(363,14): error TS2323: Cannot redeclare exported variable 'InputValidationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(389,14): error TS2323: Cannot redeclare exported variable 'StateValidationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(421,14): error TS2323: Cannot redeclare exported variable 'MissingConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(446,14): error TS2323: Cannot redeclare exported variable 'InvalidConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(475,14): error TS2323: Cannot redeclare exported variable 'BusinessWorkflowErrorFactory'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(666,3): error TS2323: Cannot redeclare exported variable 'BusinessWorkflowError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(666,3): error TS2484: Export declaration conflicts with exported declaration of 'BusinessWorkflowError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(667,3): error TS2323: Cannot redeclare exported variable 'AgentInitializationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(667,3): error TS2484: Export declaration conflicts with exported declaration of 'AgentInitializationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(668,3): error TS2323: Cannot redeclare exported variable 'AgentExecutionError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(668,3): error TS2484: Export declaration conflicts with exported declaration of 'AgentExecutionError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(669,3): error TS2323: Cannot redeclare exported variable 'AgentTimeoutError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(669,3): error TS2484: Export declaration conflicts with exported declaration of 'AgentTimeoutError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(670,3): error TS2323: Cannot redeclare exported variable 'WorkflowConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(670,3): error TS2484: Export declaration conflicts with exported declaration of 'WorkflowConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(671,3): error TS2323: Cannot redeclare exported variable 'WorkflowStateError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(671,3): error TS2484: Export declaration conflicts with exported declaration of 'WorkflowStateError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(672,3): error TS2323: Cannot redeclare exported variable 'WorkflowTransitionError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(672,3): error TS2484: Export declaration conflicts with exported declaration of 'WorkflowTransitionError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(673,3): error TS2323: Cannot redeclare exported variable 'ExternalServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(673,3): error TS2484: Export declaration conflicts with exported declaration of 'ExternalServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(674,3): error TS2323: Cannot redeclare exported variable 'GitHubIntegrationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(674,3): error TS2484: Export declaration conflicts with exported declaration of 'GitHubIntegrationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(675,3): error TS2323: Cannot redeclare exported variable 'MemoryServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(675,3): error TS2484: Export declaration conflicts with exported declaration of 'MemoryServiceError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(676,3): error TS2323: Cannot redeclare exported variable 'LLMProviderError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(676,3): error TS2484: Export declaration conflicts with exported declaration of 'LLMProviderError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(677,3): error TS2323: Cannot redeclare exported variable 'InputValidationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(677,3): error TS2484: Export declaration conflicts with exported declaration of 'InputValidationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(678,3): error TS2323: Cannot redeclare exported variable 'StateValidationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(678,3): error TS2484: Export declaration conflicts with exported declaration of 'StateValidationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(679,3): error TS2323: Cannot redeclare exported variable 'MissingConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(679,3): error TS2484: Export declaration conflicts with exported declaration of 'MissingConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(680,3): error TS2323: Cannot redeclare exported variable 'InvalidConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(680,3): error TS2484: Export declaration conflicts with exported declaration of 'InvalidConfigurationError'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(681,3): error TS2323: Cannot redeclare exported variable 'BusinessWorkflowErrorFactory'.
src/app/business-workflows/core/errors/business-workflow.errors.ts(681,3): error TS2484: Export declaration conflicts with exported declaration of 'BusinessWorkflowErrorFactory'.
src/app/business-workflows/core/index.ts(76,3): error TS2459: Module '"./validation/workflow.validators"' declares 'validateValue' locally, but it is not exported.
src/app/business-workflows/core/index.ts(152,3): error TS2693: 'Required' only refers to a type, but is being used as a value here.
src/app/business-workflows/core/index.ts(153,3): error TS18004: No value exists in scope for the shorthand property 'IsGitHubUsername'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(154,3): error TS18004: No value exists in scope for the shorthand property 'IsPlatform'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(155,3): error TS18004: No value exists in scope for the shorthand property 'IsContentType'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(156,3): error TS18004: No value exists in scope for the shorthand property 'IsWorkflowState'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(157,3): error TS18004: No value exists in scope for the shorthand property 'Validate'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(165,33): error TS2304: Cannot find name 'Cache'.
src/app/business-workflows/core/index.ts(168,33): error TS2304: Cannot find name 'CircuitBreakerDecorator'.
src/app/business-workflows/core/index.ts(174,23): error TS2304: Cannot find name 'Metrics'.
src/app/business-workflows/core/index.ts(180,38): error TS2304: Cannot find name 'Optimize'.
src/app/business-workflows/core/index.ts(192,3): error TS18004: No value exists in scope for the shorthand property 'GitHubIntegrationError'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(193,3): error TS18004: No value exists in scope for the shorthand property 'LLMProviderError'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(194,3): error TS18004: No value exists in scope for the shorthand property 'MemoryServiceError'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(195,3): error TS18004: No value exists in scope for the shorthand property 'AgentExecutionError'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(196,3): error TS18004: No value exists in scope for the shorthand property 'InputValidationError'. Either declare one or provide an initializer.
src/app/business-workflows/core/index.ts(197,3): error TS18004: No value exists in scope for the shorthand property 'BusinessWorkflowErrorFactory'. Either declare one or provide an initializer.
src/app/business-workflows/core/performance/optimization.decorators.ts(62,25): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/app/business-workflows/core/performance/optimization.decorators.ts(268,11): error TS6133: 'lastFailureTime' is declared but its value is never read.
src/app/business-workflows/core/validation/workflow.validators.ts(21,7): error TS6133: 'STATE_METADATA_KEY' is declared but its value is never read.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(85,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(133,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(170,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(192,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(256,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(308,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(321,54): error TS2339: Property 'searchSocialProfiles' does not exist on type 'WebResearchTools'.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(376,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(425,23): error TS2352: Conversion of type 'FunctionalWorkflowState' to type 'ChatWorkflowState' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'FunctionalWorkflowState' is missing the following properties from type 'ChatWorkflowState': userId, conversationId, userMessage, messageHistory, and 8 more.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(431,9): error TS2322: Type '"devbrand-chat"' is not assignable to type '"medium" | "linkedin" | "devto" | "twitter"'.
src/app/business-workflows/workflows/devbrand-chat.workflow.ts(456,16): error TS2322: Type 'ChatWorkflowState' is not assignable to type 'Partial<FunctionalWorkflowState>'.
  Index signature for type 'string' is missing in type 'ChatWorkflowState'.
src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts(85,22): error TS6138: Property 'llmProvider' is declared but its value is never read.
src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts(235,13): error TS6133: 'strategyResult' is declared but its value is never read.
Warning: command "tsc --build --emitDeclarationOnly" exited with non-zero status code
```
