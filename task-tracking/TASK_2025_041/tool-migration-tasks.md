# Tool Migration Tasks - Dev-Brand-API

**Task Type**: Backend Migration
**Developer Needed**: backend-developer
**Total Tasks**: 24 atomic tasks
**Estimated Effort**: 10-13 hours
**Decomposed From**:

- FINDINGS_SUMMARY.md (Tool invocation audit)
- tool-invocation-analysis.md (Detailed analysis)
- TASK_2025_042/implementation-plan.md (Target architecture)

---

## Overview

This migration transforms dev-brand-api agents from manual tool invocation to LLM-autonomous tool execution using the TASK_2025_042 automatic tool integration system.

**Current State**:

- GitHubCodeAnalyzerAgent: 3 hardcoded manual tool calls (lines 165, 218, 268)
- PersonalBrandStrategistAgent: Tools declared but not bound to LLM
- ContentCreatorAgent: Tools declared but not bound to LLM
- WorkflowEngineModule: Missing tools registration

**Target State**:

- Module-level tool registration via WorkflowEngineModule.forRootAsync({ tools: [...] })
- LLM-autonomous tool selection via bound tools
- Automatic ToolNode execution with conditional routing
- Streaming visibility via streamMode: 'updates'

---

## Prerequisites

- [x] TASK_2025_042 workflow-engine implementation verified (ToolRegistryService, @Tool decorator, ToolNode injection)
- [x] All tool classes have @Tool decorators (verified: github-integration.tools.ts, brand-strategist.tools.ts, content-creator.tools.ts, web-research.tools.ts)
- [ ] Team understands LLM-autonomous pattern (to be validated)

---

## Task Breakdown

### Phase 1: Module Configuration (1 hour)

**Goal**: Register tool classes with WorkflowEngineModule to enable automatic tool discovery

#### Task 1.1: Check for Existing Work - Inspect Current Module Configuration

- **Task ID**: 1.1
- **Title**: Verify current WorkflowEngineModule.forRootAsync configuration
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\app.module.ts
- **Changes**:
  - Read WorkflowEngineModule.forRootAsync() configuration (line 147)
  - Verify if tools option exists
  - Check if ToolRegistryService is initialized
  - Document current state for comparison
- **Acceptance Criteria**:
  - [ ] Current configuration documented
  - [ ] Verified tools option is missing (as per audit)
  - [ ] Confirmed ToolRegistryService not initialized
- **Estimated Effort**: 5 minutes
- **Dependencies**: None
- **Git Commit Pattern**: N/A (verification only)
- **Testing Steps**: Visual inspection, no changes
- **Rollback Steps**: N/A

#### Task 1.2: Register Tool Classes in WorkflowEngineModule

- **Task ID**: 1.2
- **Title**: Add tools option to WorkflowEngineModule.forRootAsync()
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\app.module.ts
- **Changes**:

  - Import tool classes: GitHubIntegrationTools, BrandStrategistTools, WebResearchTools, ContentCreatorTools
  - Add imports at top: `import { GitHubIntegrationTools } from './business-workflows/core/tools/github-integration.tools';`
  - Add imports: `import { BrandStrategistTools } from './business-workflows/core/tools/brand-strategist.tools';`
  - Add imports: `import { WebResearchTools } from './business-workflows/core/tools/web-research.tools';`
  - Add imports: `import { ContentCreatorTools } from './business-workflows/core/tools/content-creator.tools';`
  - Inject tool classes in useFactory parameters
  - Add tools array to returned WorkflowEngineModuleOptions:

  ```typescript
  WorkflowEngineModule.forRootAsync({
    imports: [BusinessWorkflowsModule],
    useFactory: async (
      githubTools: GitHubIntegrationTools,
      brandTools: BrandStrategistTools,
      webTools: WebResearchTools,
      contentTools: ContentCreatorTools
    ): Promise<WorkflowEngineModuleOptions> => {
      const checkpointer = await getCheckpointSaver();
      return {
        ...getWorkflowEngineConfig(),
        checkpointer,
        tools: [
          GitHubIntegrationTools,
          BrandStrategistTools,
          WebResearchTools,
          ContentCreatorTools,
        ],
      };
    },
    inject: [GitHubIntegrationTools, BrandStrategistTools, WebResearchTools, ContentCreatorTools],
  });
  ```

- **Acceptance Criteria**:
  - [ ] Tool classes imported correctly
  - [ ] tools option added to WorkflowEngineModuleOptions
  - [ ] inject array includes all 4 tool classes
  - [ ] Application compiles without errors
  - [ ] ToolRegistryService initializes on startup (check logs)
  - [ ] 11+ tools discovered (github-analyzer, achievement-extractor, etc.)
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 1.1 (verification)
- **Git Commit Pattern**: `feat(dev-brand-api): register tools with workflow engine module`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Run `npx nx serve dev-brand-api`
  3. Check startup logs for ToolRegistryService initialization
  4. Verify log message: "Registering 4 tool classes"
  5. Verify log message: "Tool registration completed in Xms - Total tools: 11+"
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`
  2. Remove tool imports
  3. Remove tools option from module config

---

### Phase 2: GitHubCodeAnalyzerAgent Migration (3-4 hours)

**Goal**: Migrate from manual tool invocation to LLM-autonomous tool selection

**CRITICAL**: This agent has the most complex migration - 3 manual tool calls must be removed and replaced with message-based LLM autonomy.

#### Task 2.1: Check for Existing Work - Analyze Current Agent Implementation

- **Task ID**: 2.1
- **Title**: Document current GitHubCodeAnalyzerAgent tool usage patterns
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:
  - Read entire agent file
  - Document 3 manual tool calls (lines 165, 218, 268)
  - Document current @Task methods and dependencies
  - Document current state flow and metadata usage
  - Create migration strategy document
- **Acceptance Criteria**:
  - [ ] All manual tool calls identified and documented
  - [ ] Current workflow graph documented (entrypoint → tasks → dependencies)
  - [ ] State metadata fields documented
  - [ ] Migration strategy documented
- **Estimated Effort**: 15 minutes
- **Dependencies**: Phase 1 complete
- **Git Commit Pattern**: N/A (analysis only)
- **Testing Steps**: Documentation review
- **Rollback Steps**: N/A

#### Task 2.2: Remove GitHubIntegrationTools Constructor Injection

- **Task ID**: 2.2
- **Title**: Remove manual tool service injection from constructor
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Remove `private readonly githubTools: GitHubIntegrationTools` from constructor (line 100)
  - Keep `private readonly llmProvider: LlmProviderService`
  - Update constructor to:

  ```typescript
  constructor(
    private readonly llmProvider: LlmProviderService
  ) {}
  ```

- **Acceptance Criteria**:
  - [ ] GitHubIntegrationTools removed from constructor
  - [ ] LlmProviderService retained
  - [ ] Application compiles (may have errors from removed tool calls - expected)
- **Estimated Effort**: 5 minutes
- **Dependencies**: Task 2.1 (analysis)
- **Git Commit Pattern**: `refactor(dev-brand-api): remove manual tool injection from github analyzer`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api` (expect compilation errors - OK for now)
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`
  2. Restore GitHubIntegrationTools injection

#### Task 2.3: Refactor analyzeGitHubActivity to @Node with Message-Based Flow

- **Task ID**: 2.3
- **Title**: Convert analyzeGitHubActivity from @Task to @Node with LLM autonomy
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Change decorator from `@Task({ dependsOn: ['initializeGitHubAnalysis'] })` to `@Node({ type: 'llm' })`
  - Remove manual tool call: `await this.githubTools.analyzeGitHubActivity({...})`
  - Replace with LLM invocation that lets LLM decide to use tools:

  ```typescript
  @Node({ type: 'llm' })
  @Validate
  @Optimize({
    cache: { ttl: 900000, maxSize: 100 },
    circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
    timeout: 90000,
    metrics: { trackExecutionTime: true, trackErrorRate: true },
  })
  async analyzeGitHubActivity(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): Promise<TypedAgentState<GitHubAnalyzerMetadata>> {
    const githubUsername = state.metadata.githubUsername;
    const timeframe = state.metadata.timeframe;

    console.log(`💻 Analyzing GitHub activity for ${githubUsername}...`);

    // LLM with bound tools decides autonomously to call github-analyzer
    const prompt = `Analyze GitHub activity for user "${githubUsername}" over the last ${timeframe}. Use the github-analyzer tool to fetch repository data, commits, and calculate productivity metrics.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.3,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        currentStep: 'github-activity-analyzed',
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] @Node decorator used instead of @Task
  - [ ] Manual tool call removed
  - [ ] LLM invocation with prompt that triggers tool usage
  - [ ] Returns TypedAgentState (not TaskExecutionResult)
  - [ ] Messages array updated with LLM response
  - [ ] Application compiles
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 2.2 (tool injection removed)
- **Git Commit Pattern**: `refactor(dev-brand-api): convert analyzeGitHubActivity to LLM-autonomous node`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Verify compilation success
  3. Manual test: Run workflow, check logs for tool execution
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`
  2. Restore @Task decorator and manual tool call

#### Task 2.4: Refactor extractAchievements to @Node with Message-Based Flow

- **Task ID**: 2.4
- **Title**: Convert extractAchievements from @Task to @Node with LLM autonomy
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Change decorator from `@Task({ dependsOn: ['analyzeGitHubActivity'] })` to `@Node({ type: 'llm' })`
  - Remove manual tool call: `await this.githubTools.extractAchievements({...})`
  - Replace with LLM invocation:

  ```typescript
  @Node({ type: 'llm' })
  async extractAchievements(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): Promise<TypedAgentState<GitHubAnalyzerMetadata>> {
    console.log('🎯 Extracting meaningful achievements...');

    // LLM decides to use achievement-extractor tool
    const prompt = `Based on the GitHub analysis results, extract meaningful achievements from the code contributions. Use the achievement-extractor tool with detailed analysis depth.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        currentStep: 'achievements-extracted',
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] @Node decorator used instead of @Task
  - [ ] Manual tool call removed
  - [ ] LLM invocation with prompt that triggers achievement-extractor
  - [ ] Returns TypedAgentState
  - [ ] Messages array updated
  - [ ] Application compiles
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 2.3 (analyzeGitHubActivity refactored)
- **Git Commit Pattern**: `refactor(dev-brand-api): convert extractAchievements to LLM-autonomous node`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Verify compilation success
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 2.5: Refactor generateDeveloperInsights to @Node with Message-Based Flow

- **Task ID**: 2.5
- **Title**: Convert generateDeveloperInsights from @Task to @Node with LLM autonomy
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Change decorator from `@Task({ dependsOn: ['extractAchievements'] })` to `@Node({ type: 'llm' })`
  - Remove manual tool call: `await this.githubTools.generateDeveloperInsights({...})`
  - Replace with LLM invocation:

  ```typescript
  @Node({ type: 'llm' })
  async generateDeveloperInsights(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): Promise<TypedAgentState<GitHubAnalyzerMetadata>> {
    const githubUsername = state.metadata.githubUsername;

    console.log('🔍 Generating developer insights...');

    const prompt = `Generate professional developer insights for ${githubUsername} based on their GitHub activity and achievements. Use the developer-insights tool to analyze work patterns, technical expertise, and productivity metrics.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        currentStep: 'insights-generated',
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] @Node decorator used instead of @Task
  - [ ] Manual tool call removed
  - [ ] LLM invocation with prompt that triggers developer-insights
  - [ ] Returns TypedAgentState
  - [ ] Application compiles
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 2.4 (extractAchievements refactored)
- **Git Commit Pattern**: `refactor(dev-brand-api): convert generateDeveloperInsights to LLM-autonomous node`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Verify compilation success
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 2.6: Update synthesizeWithAI to Extract Tool Results from Messages

- **Task ID**: 2.6
- **Title**: Refactor synthesizeWithAI to read tool results from state.messages
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Update synthesizeWithAI method to extract tool results from messages array
  - Parse ToolMessage results to extract githubData, achievements, developerInsights
  - Update prompt building to use extracted data:

  ```typescript
  @Node({ type: 'llm' })
  async synthesizeWithAI(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): Promise<TypedAgentState<GitHubAnalyzerMetadata>> {
    const githubUsername = state.metadata.githubUsername;

    console.log('🚀 Synthesizing analysis with AI...');

    // Extract tool results from messages
    const toolMessages = state.messages.filter(
      (msg) => msg.type === 'tool'
    );

    const githubData = this.extractGitHubData(toolMessages);
    const achievements = this.extractAchievements(toolMessages);
    const developerInsights = this.extractDeveloperInsights(toolMessages);

    // Build synthesis prompt with extracted data
    const analysisPrompt = buildDeveloperAnalysisPrompt(
      githubUsername,
      githubData,
      achievements,
      developerInsights
    );

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2500,
    });

    const aiAnalysisResponse = await llm.invoke([
      ...state.messages,
      { role: 'user', content: analysisPrompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, aiAnalysisResponse],
      metadata: {
        ...state.metadata,
        currentStep: 'ai-synthesis-complete',
        aiAnalysis: aiAnalysisResponse.content.toString(),
        narrativeGenerated: true,
      },
    };
  }

  // Helper methods to extract tool results
  private extractGitHubData(toolMessages: any[]): any {
    const githubToolMsg = toolMessages.find(
      (msg) => msg.name === 'github-analyzer'
    );
    return githubToolMsg ? JSON.parse(githubToolMsg.content) : null;
  }

  private extractAchievements(toolMessages: any[]): any[] {
    const achievementMsg = toolMessages.find(
      (msg) => msg.name === 'achievement-extractor'
    );
    return achievementMsg ? JSON.parse(achievementMsg.content) : [];
  }

  private extractDeveloperInsights(toolMessages: any[]): any {
    const insightsMsg = toolMessages.find(
      (msg) => msg.name === 'developer-insights'
    );
    return insightsMsg ? JSON.parse(insightsMsg.content) : null;
  }
  ```

- **Acceptance Criteria**:
  - [ ] synthesizeWithAI reads tool results from messages
  - [ ] Helper methods extract tool data correctly
  - [ ] Error handling for missing tool results
  - [ ] Application compiles
  - [ ] Existing prompt building logic works with extracted data
- **Estimated Effort**: 45 minutes
- **Dependencies**: Task 2.5 (generateDeveloperInsights refactored)
- **Git Commit Pattern**: `refactor(dev-brand-api): extract tool results from messages in synthesizeWithAI`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Run workflow end-to-end
  3. Verify tool results extracted correctly
  4. Verify AI synthesis receives correct data
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 2.7: Update Agent Decorator with Tool Configuration

- **Task ID**: 2.7
- **Title**: Verify @Agent decorator tools configuration matches available tools
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Verify @Agent decorator tools array (lines 74-79)
  - Ensure tools match available tool names:

  ```typescript
  @Agent({
    id: 'github-code-analyzer',
    name: 'GitHub Code Analyzer',
    description: 'AI-powered GitHub repository analysis and achievement extraction',
    type: 'workflow-agent',
    capabilities: [
      'code-analysis',
      'achievement-extraction',
      'developer-insights',
      'ai-synthesis',
    ],
    tools: [
      'github-analyzer',      // ✅ Matches @Tool name in GitHubIntegrationTools
      'achievement-extractor', // ✅ Matches @Tool name
      'developer-insights',   // ✅ Matches @Tool name
      'ai-synthesis',         // ✅ Matches @Tool name
    ],
    // ... rest of config
  })
  ```

  - Add comments documenting tool names match ToolRegistryService

- **Acceptance Criteria**:
  - [ ] All tool names in @Agent match @Tool names in tool classes
  - [ ] Comments added for clarity
  - [ ] Application compiles
- **Estimated Effort**: 10 minutes
- **Dependencies**: Task 2.6 (synthesizeWithAI updated)
- **Git Commit Pattern**: `docs(dev-brand-api): verify github analyzer tool names match registry`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Check startup logs for tool binding confirmation
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 2.8: Add Conditional Routing for Tool Execution

- **Task ID**: 2.8
- **Title**: Implement conditional edges for ToolNode routing
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts
- **Changes**:

  - Add @Edge decorators for conditional tool routing after each @Node
  - Implement shouldExecuteTools condition method:

  ```typescript
  @Edge('analyzeGitHubActivity', 'extractAchievements')
  shouldContinueAfterAnalysis(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): boolean {
    const lastMsg = state.messages[state.messages.length - 1];
    // Continue if no tool calls pending
    return !lastMsg?.tool_calls || lastMsg.tool_calls.length === 0;
  }

  @Edge('extractAchievements', 'generateDeveloperInsights')
  shouldContinueAfterExtraction(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): boolean {
    const lastMsg = state.messages[state.messages.length - 1];
    return !lastMsg?.tool_calls || lastMsg.tool_calls.length === 0;
  }

  @Edge('generateDeveloperInsights', 'synthesizeWithAI')
  shouldContinueAfterInsights(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): boolean {
    const lastMsg = state.messages[state.messages.length - 1];
    return !lastMsg?.tool_calls || lastMsg.tool_calls.length === 0;
  }
  ```

- **Acceptance Criteria**:
  - [ ] @Edge decorators added for node transitions
  - [ ] Conditional routing checks for tool_calls
  - [ ] ToolNode automatically injected by buildStateGraph (no manual wiring)
  - [ ] Application compiles
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 2.7 (tool names verified)
- **Git Commit Pattern**: `feat(dev-brand-api): add conditional routing for github analyzer tool execution`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Verify tools execute via ToolNode
  3. Check logs for tool routing decisions
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

---

### Phase 3: PersonalBrandStrategistAgent Migration (2-3 hours)

**Goal**: Enable LLM-autonomous tool usage for brand analysis and strategy generation

#### Task 3.1: Check for Existing Work - Analyze Agent Tool Usage

- **Task ID**: 3.1
- **Title**: Verify PersonalBrandStrategistAgent tool declarations
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\personal-brand-strategist\personal-brand-strategist.agent.ts
- **Changes**:
  - Read agent file completely
  - Verify @Agent decorator tools array (expected: memory-analysis, brand-optimization, strategy-generation)
  - Check if tools are used in LLM invocations
  - Document current state
- **Acceptance Criteria**:
  - [ ] Tool declarations documented
  - [ ] LLM invocations identified
  - [ ] Migration strategy documented
- **Estimated Effort**: 10 minutes
- **Dependencies**: Phase 2 complete
- **Git Commit Pattern**: N/A (analysis only)
- **Testing Steps**: Documentation review
- **Rollback Steps**: N/A

#### Task 3.2: Verify BrandStrategistTools Has @Tool Decorators

- **Task ID**: 3.2
- **Title**: Confirm all BrandStrategistTools methods have @Tool decorators
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\core\tools\brand-strategist.tools.ts
- **Changes**:
  - Read tool class file
  - Verify @Tool decorators on methods: memoryAnalysis, brandOptimization, strategyGeneration
  - Verify tool names match agent configuration
  - Document any missing decorators
- **Acceptance Criteria**:
  - [ ] All 3 tool methods have @Tool decorators
  - [ ] Tool names match agent tools array
  - [ ] Schemas are properly defined with z.object()
- **Estimated Effort**: 10 minutes
- **Dependencies**: Task 3.1 (agent analyzed)
- **Git Commit Pattern**: N/A (verification only, or fix if decorators missing)
- **Testing Steps**: Visual inspection
- **Rollback Steps**: N/A

#### Task 3.3: Update analyzeBrandPositioning to Use Bound Tools

- **Task ID**: 3.3
- **Title**: Enable LLM tool autonomy in analyzeBrandPositioning node
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\personal-brand-strategist\personal-brand-strategist.agent.ts
- **Changes**:

  - Update LLM invocation to include tools prompt:

  ```typescript
  @Node({ type: 'llm' })
  async analyzeBrandPositioning(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<TypedAgentState<BrandStrategistMetadata>> {
    const brandData = state.metadata.brandData;

    // LLM with bound tools can autonomously use memory-analysis, brand-optimization
    const prompt = `Analyze brand positioning based on the provided data. Use memory-analysis to retrieve historical brand context and brand-optimization to get strategic recommendations.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.3,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        brandAnalysis: this.extractBrandAnalysisFromMessages(state.messages),
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] LLM invocation includes prompt triggering tool usage
  - [ ] Tools automatically bound (via agent decorator)
  - [ ] Messages array updated with LLM response
  - [ ] Application compiles
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 3.2 (tools verified)
- **Git Commit Pattern**: `feat(dev-brand-api): enable LLM tool autonomy in brand strategist analyzeBrandPositioning`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Check logs for memory-analysis tool execution
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 3.4: Update generateBrandStrategy to Use Bound Tools

- **Task ID**: 3.4
- **Title**: Enable LLM tool autonomy in generateBrandStrategy node
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\personal-brand-strategist\personal-brand-strategist.agent.ts
- **Changes**:

  - Update LLM invocation to trigger strategy-generation tool:

  ```typescript
  @Node({ type: 'llm' })
  async generateBrandStrategy(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<TypedAgentState<BrandStrategistMetadata>> {
    const prompt = `Generate a comprehensive brand strategy based on the analysis. Use the strategy-generation tool to create actionable recommendations.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2500,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        brandStrategy: this.extractStrategyFromMessages(state.messages),
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] LLM invocation triggers strategy-generation tool
  - [ ] Messages array updated
  - [ ] Application compiles
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 3.3 (analyzeBrandPositioning updated)
- **Git Commit Pattern**: `feat(dev-brand-api): enable LLM tool autonomy in brand strategist generateBrandStrategy`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Verify strategy-generation tool execution
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 3.5: Add Message Parsing Helper Methods

- **Task ID**: 3.5
- **Title**: Implement helper methods to extract tool results from messages
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\personal-brand-strategist\personal-brand-strategist.agent.ts
- **Changes**:

  - Add helper methods to parse tool results from messages:

  ```typescript
  private extractBrandAnalysisFromMessages(messages: any[]): any {
    const toolMessages = messages.filter((msg) => msg.type === 'tool');
    const analysisMsg = toolMessages.find(
      (msg) => msg.name === 'memory-analysis' || msg.name === 'brand-optimization'
    );
    return analysisMsg ? JSON.parse(analysisMsg.content) : null;
  }

  private extractStrategyFromMessages(messages: any[]): any {
    const toolMessages = messages.filter((msg) => msg.type === 'tool');
    const strategyMsg = toolMessages.find(
      (msg) => msg.name === 'strategy-generation'
    );
    return strategyMsg ? JSON.parse(strategyMsg.content) : null;
  }
  ```

- **Acceptance Criteria**:
  - [ ] Helper methods extract tool results correctly
  - [ ] Error handling for missing results
  - [ ] Application compiles
- **Estimated Effort**: 20 minutes
- **Dependencies**: Task 3.4 (generateBrandStrategy updated)
- **Git Commit Pattern**: `refactor(dev-brand-api): add message parsing helpers to brand strategist`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Unit test helper methods if time permits
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

---

### Phase 4: ContentCreatorAgent Migration (2-3 hours)

**Goal**: Enable LLM-autonomous tool usage for content formatting and optimization

#### Task 4.1: Check for Existing Work - Analyze Agent Tool Usage

- **Task ID**: 4.1
- **Title**: Verify ContentCreatorAgent tool declarations
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\content-creator\content-creator.agent.ts
- **Changes**:
  - Read agent file completely
  - Verify @Agent decorator tools array (expected: linkedin-formatter, devto-formatter, content-optimizer, quality-scorer, engagement-predictor)
  - Check current tool usage patterns
  - Document migration needs
- **Acceptance Criteria**:
  - [ ] 5 tools declared in @Agent decorator
  - [ ] Current usage patterns documented
  - [ ] Migration strategy documented
- **Estimated Effort**: 10 minutes
- **Dependencies**: Phase 3 complete
- **Git Commit Pattern**: N/A (analysis only)
- **Testing Steps**: Documentation review
- **Rollback Steps**: N/A

#### Task 4.2: Verify ContentCreatorTools Has @Tool Decorators

- **Task ID**: 4.2
- **Title**: Confirm all ContentCreatorTools methods have @Tool decorators
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\core\tools\content-creator.tools.ts
- **Changes**:
  - Read tool class file
  - Verify @Tool decorators on methods: formatForLinkedIn, formatForDevTo, optimizeContent, assessQuality, predictEngagement
  - Verify tool names match agent configuration
  - Add decorators if missing
- **Acceptance Criteria**:
  - [ ] All 5 tool methods have @Tool decorators
  - [ ] Tool names match agent tools array
  - [ ] Schemas properly defined
- **Estimated Effort**: 15 minutes (may need to add decorators)
- **Dependencies**: Task 4.1 (agent analyzed)
- **Git Commit Pattern**: `feat(dev-brand-api): add @Tool decorators to ContentCreatorTools methods` (if decorators missing)
- **Testing Steps**:
  1. Visual inspection
  2. Run `npx nx build dev-brand-api` if changes made
- **Rollback Steps**:
  1. Revert commit if changes made: `git revert HEAD`

#### Task 4.3: Update formatContent Node to Use Bound Tools

- **Task ID**: 4.3
- **Title**: Enable LLM tool autonomy in formatContent node
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\content-creator\content-creator.agent.ts
- **Changes**:

  - Update LLM invocation to trigger formatting tools:

  ```typescript
  @Node({ type: 'llm' })
  async formatContent(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<TypedAgentState<ContentCreatorMetadata>> {
    const platform = state.metadata.platform || 'linkedin';

    const prompt = `Format the content for ${platform}. Use the ${platform}-formatter tool to apply platform-specific formatting, hashtags, and structure.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.3,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        formattedContent: this.extractFormattedContent(state.messages),
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] LLM triggers linkedin-formatter or devto-formatter based on platform
  - [ ] Messages array updated
  - [ ] Application compiles
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 4.2 (tools verified)
- **Git Commit Pattern**: `feat(dev-brand-api): enable LLM tool autonomy in content creator formatContent`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Verify formatter tool execution
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 4.4: Update optimizeContent Node to Use Bound Tools

- **Task ID**: 4.4
- **Title**: Enable LLM tool autonomy in optimizeContent node
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\content-creator\content-creator.agent.ts
- **Changes**:

  - Update LLM invocation to trigger content-optimizer tool:

  ```typescript
  @Node({ type: 'llm' })
  async optimizeContent(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<TypedAgentState<ContentCreatorMetadata>> {
    const prompt = `Optimize the formatted content for maximum engagement. Use the content-optimizer tool to improve readability, keyword density, and sentiment.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        optimizedContent: this.extractOptimizedContent(state.messages),
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] LLM triggers content-optimizer tool
  - [ ] Messages array updated
  - [ ] Application compiles
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 4.3 (formatContent updated)
- **Git Commit Pattern**: `feat(dev-brand-api): enable LLM tool autonomy in content creator optimizeContent`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Verify content-optimizer execution
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 4.5: Update assessQuality Node to Use Bound Tools

- **Task ID**: 4.5
- **Title**: Enable LLM tool autonomy in assessQuality node
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\content-creator\content-creator.agent.ts
- **Changes**:

  - Update LLM invocation to trigger quality-scorer and engagement-predictor:

  ```typescript
  @Node({ type: 'llm' })
  async assessQuality(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<TypedAgentState<ContentCreatorMetadata>> {
    const prompt = `Assess the quality of the optimized content. Use the quality-scorer tool to evaluate content quality and the engagement-predictor tool to forecast expected engagement metrics.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.3,
      maxTokens: 1500,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      ...state,
      messages: [...state.messages, response],
      metadata: {
        ...state.metadata,
        qualityScore: this.extractQualityScore(state.messages),
        engagementPrediction: this.extractEngagementPrediction(state.messages),
      },
    };
  }
  ```

- **Acceptance Criteria**:
  - [ ] LLM triggers quality-scorer and engagement-predictor tools
  - [ ] Messages array updated
  - [ ] Application compiles
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 4.4 (optimizeContent updated)
- **Git Commit Pattern**: `feat(dev-brand-api): enable LLM tool autonomy in content creator assessQuality`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Manual test: Verify quality-scorer and engagement-predictor execution
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

#### Task 4.6: Add Message Parsing Helper Methods

- **Task ID**: 4.6
- **Title**: Implement helper methods to extract tool results from messages
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\content-creator\content-creator.agent.ts
- **Changes**:

  - Add helper methods to parse tool results:

  ```typescript
  private extractFormattedContent(messages: any[]): string {
    const toolMessages = messages.filter((msg) => msg.type === 'tool');
    const formatMsg = toolMessages.find(
      (msg) => msg.name === 'linkedin-formatter' || msg.name === 'devto-formatter'
    );
    return formatMsg ? JSON.parse(formatMsg.content).formattedContent : '';
  }

  private extractOptimizedContent(messages: any[]): string {
    const toolMessages = messages.filter((msg) => msg.type === 'tool');
    const optimizeMsg = toolMessages.find((msg) => msg.name === 'content-optimizer');
    return optimizeMsg ? JSON.parse(optimizeMsg.content).optimizedContent : '';
  }

  private extractQualityScore(messages: any[]): number {
    const toolMessages = messages.filter((msg) => msg.type === 'tool');
    const qualityMsg = toolMessages.find((msg) => msg.name === 'quality-scorer');
    return qualityMsg ? JSON.parse(qualityMsg.content).qualityScore : 0;
  }

  private extractEngagementPrediction(messages: any[]): any {
    const toolMessages = messages.filter((msg) => msg.type === 'tool');
    const engagementMsg = toolMessages.find((msg) => msg.name === 'engagement-predictor');
    return engagementMsg ? JSON.parse(engagementMsg.content) : null;
  }
  ```

- **Acceptance Criteria**:
  - [ ] Helper methods extract tool results correctly
  - [ ] Error handling for missing results
  - [ ] Application compiles
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 4.5 (assessQuality updated)
- **Git Commit Pattern**: `refactor(dev-brand-api): add message parsing helpers to content creator`
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api`
  2. Unit test helper methods if time permits
- **Rollback Steps**:
  1. Revert commit: `git revert HEAD`

---

### Phase 5: Integration Testing & Validation (2 hours)

**Goal**: Verify end-to-end tool integration with real workflow execution

#### Task 5.1: Verify Tool Discovery at Startup

- **Task ID**: 5.1
- **Title**: Test application startup and verify all tools registered
- **File Paths**: N/A (runtime testing)
- **Changes**: None (testing only)
- **Acceptance Criteria**:
  - [ ] Application starts without errors
  - [ ] ToolRegistryService logs "Registering 4 tool classes"
  - [ ] ToolRegistryService logs "Tool registration completed in Xms - Total tools: 11+"
  - [ ] 11+ tools discovered: github-analyzer, achievement-extractor, developer-insights, ai-synthesis, memory-analysis, brand-optimization, strategy-generation, linkedin-formatter, devto-formatter, content-optimizer, quality-scorer, engagement-predictor
- **Estimated Effort**: 15 minutes
- **Dependencies**: All previous phases complete
- **Git Commit Pattern**: N/A (testing only)
- **Testing Steps**:
  1. Run `npx nx serve dev-brand-api`
  2. Check startup logs for ToolRegistryService output
  3. Verify tool count and names
  4. Stop application
- **Rollback Steps**: N/A

#### Task 5.2: End-to-End GitHubCodeAnalyzerAgent Test

- **Task ID**: 5.2
- **Title**: Execute full GitHub analyzer workflow and verify tool autonomy
- **File Paths**: N/A (runtime testing)
- **Changes**: None (testing only)
- **Acceptance Criteria**:
  - [ ] Workflow executes without errors
  - [ ] LLM autonomously calls github-analyzer tool
  - [ ] LLM autonomously calls achievement-extractor tool
  - [ ] LLM autonomously calls developer-insights tool
  - [ ] ToolNode executes tools successfully
  - [ ] Tool results flow back to agent via messages
  - [ ] Final synthesis uses tool results
  - [ ] No manual tool calls executed
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 5.1 (startup verified)
- **Git Commit Pattern**: N/A (testing only)
- **Testing Steps**:
  1. Run `npx nx serve dev-brand-api`
  2. Trigger GitHub analyzer workflow via API or test script
  3. Monitor logs for tool execution
  4. Verify ToolNode logs: "Executing tool: github-analyzer"
  5. Verify ToolNode logs: "Executing tool: achievement-extractor"
  6. Verify ToolNode logs: "Executing tool: developer-insights"
  7. Verify final response includes tool results
  8. Stop application
- **Rollback Steps**: Revert to previous working commit if critical issues found

#### Task 5.3: Verify Streaming Mode Shows Tool Visibility

- **Task ID**: 5.3
- **Title**: Test streaming output includes tool execution events
- **File Paths**: N/A (runtime testing)
- **Changes**: None (testing only)
- **Acceptance Criteria**:
  - [ ] Streaming enabled (streamMode: 'updates')
  - [ ] Tool execution events visible in stream
  - [ ] Events include tool name, inputs, outputs
  - [ ] Events arrive in real-time (< 50ms latency)
- **Estimated Effort**: 20 minutes
- **Dependencies**: Task 5.2 (workflow tested)
- **Git Commit Pattern**: N/A (testing only)
- **Testing Steps**:
  1. Run `npx nx serve dev-brand-api`
  2. Execute workflow with streaming enabled
  3. Monitor streaming output for tool events
  4. Verify event structure matches LangGraph 'updates' mode
  5. Stop application
- **Rollback Steps**: N/A

#### Task 5.4: Performance Validation and Regression Testing

- **Task ID**: 5.4
- **Title**: Verify migration doesn't degrade performance
- **File Paths**: N/A (runtime testing)
- **Changes**: None (testing only)
- **Acceptance Criteria**:
  - [ ] Tool registration < 50ms for 11 tools
  - [ ] Workflow execution time comparable to pre-migration baseline (±10%)
  - [ ] No memory leaks detected
  - [ ] ToolNode overhead < 10ms per tool call
  - [ ] Build time unchanged
- **Estimated Effort**: 30 minutes
- **Dependencies**: Task 5.3 (streaming verified)
- **Git Commit Pattern**: N/A (testing only)
- **Testing Steps**:
  1. Run `npx nx build dev-brand-api` - measure build time
  2. Run `npx nx serve dev-brand-api` - measure startup time
  3. Execute workflow 10 times - measure average execution time
  4. Monitor memory usage during execution
  5. Compare to pre-migration baseline (if available)
  6. Document performance metrics
- **Rollback Steps**: Escalate if performance degrades > 20%

#### Task 5.5: Create Migration Validation Report

- **Task ID**: 5.5
- **Title**: Document migration results and create test report
- **File Paths**:
  - D:\projects\nestjs-ai-saas-starter\task-tracking\TASK_2025_041\tool-migration-validation-report.md
- **Changes**:
  - Create validation report documenting:
    - All tools registered successfully
    - All agents migrated successfully
    - Tool discovery metrics
    - Performance metrics
    - Issues encountered and resolutions
    - Remaining work (if any)
- **Acceptance Criteria**:
  - [ ] Validation report created
  - [ ] All test results documented
  - [ ] Performance metrics captured
  - [ ] Known issues documented
  - [ ] Rollback instructions included
- **Estimated Effort**: 25 minutes
- **Dependencies**: Task 5.4 (performance tested)
- **Git Commit Pattern**: `docs(dev-brand-api): add tool migration validation report`
- **Testing Steps**: Document review
- **Rollback Steps**: N/A

---

## Verification Protocol

**After Each Task Completion**:

1. Developer updates task status in this document (mark checkbox complete)
2. Developer creates git commit matching expected commit pattern
3. Developer runs `npx nx build dev-brand-api` to verify compilation
4. Developer tests changes according to "Testing Steps"
5. If verification passes: Move to next task
6. If verification fails: Execute rollback steps, escalate to team-leader

---

## Completion Criteria

**All tasks complete when**:

- All 24 task checkboxes marked complete
- All git commits created matching commit patterns
- Application builds successfully
- All integration tests pass
- Performance metrics within acceptable range
- Validation report created and reviewed

**Return to orchestrator with**: "All 24 tasks completed and verified. Tool migration successful. Ready for production deployment."

---

## Effort Summary

| Phase                            | Tasks  | Estimated Effort | Critical Path |
| -------------------------------- | ------ | ---------------- | ------------- |
| Phase 1: Module Config           | 2      | 35 minutes       | No            |
| Phase 2: GitHubCodeAnalyzer      | 8      | 3-4 hours        | Yes           |
| Phase 3: PersonalBrandStrategist | 5      | 2-3 hours        | No            |
| Phase 4: ContentCreator          | 6      | 2-3 hours        | No            |
| Phase 5: Testing & Validation    | 5      | 2 hours          | Yes           |
| **TOTAL**                        | **26** | **10-13 hours**  | -             |

**Critical Path**: Phase 2 (GitHubCodeAnalyzer) and Phase 5 (Testing) are blocking - must complete sequentially. Phases 3 and 4 can be executed in parallel after Phase 2.

---

## Rollback Plan

**If migration fails at any phase**:

1. **Stop immediately** - Do not proceed to next phase
2. **Identify failure point** - Document specific task that failed
3. **Execute rollback steps** - Revert commits for failed task and dependent tasks
4. **Restore working state**:

   ```bash
   # Find last working commit before migration
   git log --oneline | grep -E "feat|refactor|docs" | head -1

   # Create rollback branch
   git checkout -b rollback/tool-migration-TASK_2025_041

   # Revert to last working state
   git revert <commit-range>

   # Test application
   npx nx build dev-brand-api
   npx nx serve dev-brand-api
   ```

5. **Document failure** - Update validation report with failure details
6. **Escalate to team-leader** - Request guidance on resolution

**Complete Rollback** (if migration fundamentally flawed):

```bash
# Revert all migration commits
git revert $(git log --oneline --grep="feat(dev-brand-api)" --grep="refactor(dev-brand-api)" --since="2025-11-09" --format="%H" | tac)

# Verify application works
npx nx build dev-brand-api
npx nx serve dev-brand-api

# Create rollback PR
gh pr create --title "rollback(dev-brand-api): revert tool migration due to [reason]"
```

---

## Testing Checklist

**Pre-Migration Baseline** (capture before starting):

- [ ] Application builds successfully: `npx nx build dev-brand-api`
- [ ] Application starts successfully: `npx nx serve dev-brand-api`
- [ ] GitHub analyzer workflow executes (baseline timing)
- [ ] Brand strategist workflow executes (baseline timing)
- [ ] Content creator workflow executes (baseline timing)

**Post-Migration Validation** (verify after completion):

- [ ] Application builds successfully
- [ ] Application starts successfully
- [ ] ToolRegistryService initializes (11+ tools)
- [ ] GitHub analyzer uses LLM-autonomous tools (no manual calls)
- [ ] Brand strategist uses LLM-autonomous tools
- [ ] Content creator uses LLM-autonomous tools
- [ ] Tool execution visible in streaming output
- [ ] Performance within acceptable range (±10% baseline)
- [ ] No console errors during execution
- [ ] All tool results flow correctly via messages

**Regression Testing**:

- [ ] Existing workflows still work (no breaking changes)
- [ ] HITL integration still works (@RequiresApproval)
- [ ] Memory integration still works (PersonalBrandMemoryService)
- [ ] ChromaDB integration still works (BrandStrategyRepository)
- [ ] Neo4j integration still works (if used)

---

## Success Criteria

**Quantitative**:

- Tool discovery: 100% (11/11 tools registered)
- Tool execution: ≥95% success rate
- Performance overhead: <10ms per tool call
- Build time: No degradation
- Startup time: <50ms overhead for tool registration

**Qualitative**:

- LLM autonomously selects appropriate tools
- Tool results flow correctly via messages
- No manual tool invocations remain
- Streaming shows tool visibility
- Code maintainability improved (zero boilerplate)

---

## Next Steps After Completion

1. **Update documentation**:

   - Add migration notes to TASK_2025_041/FINDINGS_SUMMARY.md
   - Update agent documentation with LLM-autonomous patterns
   - Document tool usage best practices

2. **Monitor production**:

   - Track tool execution success rates
   - Monitor LLM tool selection quality
   - Collect user feedback on tool autonomy

3. **Optimize if needed**:
   - Fine-tune tool descriptions for better LLM selection
   - Optimize tool schemas for clarity
   - Add tool usage analytics

---

**CRITICAL REQUIREMENTS**:

- Use MODE 1 (DECOMPOSITION) - task creation only, no assignment or execution
- Based on audit findings from tool-invocation-analysis.md and FINDINGS_SUMMARY.md
- Aligned with TASK_2025_042 automatic tool integration system
- Provides actionable, verifiable, git-trackable atomic tasks
- Includes comprehensive rollback plans and testing checklists
- Uses complete absolute Windows paths (D:\projects\nestjs-ai-saas-starter\...)

---

**Task Decomposition Complete** - Ready for assignment and execution.
