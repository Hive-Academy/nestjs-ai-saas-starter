# Agents-Workflow Library Code Examples

This document provides concrete code examples for implementing the new agents-workflow library using modern patterns from @anubis/nestjs-langgraph.

## 1. Base Agent Node Pattern

### File: `src/lib/nodes/base/agent-node.base.ts`

```typescript
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { AgentNodeBase as LangGraphNodeBase, AgentNodeConfig } from '@anubis/nestjs-langgraph';
import { WorkflowState, Command, AgentType } from '@anubis/shared';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredToolInterface } from '@langchain/core/tools';

/**
 * Enhanced base class for all agent nodes in the workflow system
 * Extends the nestjs-langgraph base with agent-specific functionality
 */
@Injectable()
export abstract class AgentNodeBase<TState extends WorkflowState = WorkflowState> 
  extends LangGraphNodeBase<TState> {
  
  protected readonly logger: Logger;
  protected abstract readonly agentType: AgentType;

  constructor(
    @Inject('LLM_SERVICE') protected readonly llmService?: any,
    @Inject('TOOL_REGISTRY') protected readonly toolRegistry?: any,
    @Optional() @Inject('INTELLIGENCE_SERVICE') protected readonly intelligenceService?: any
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Initialize LLM for this agent type
   */
  protected async initializeLLM(): Promise<void> {
    if (this.llmService) {
      this.llm = await this.llmService.getLLMForAgent(this.agentType);
    }
  }

  /**
   * Initialize tools for this agent
   */
  protected async initializeTools(): Promise<StructuredToolInterface[]> {
    if (this.toolRegistry) {
      return this.toolRegistry.getToolsForAgent(this.agentType);
    }
    return [];
  }

  /**
   * Extract typed context for this agent from workflow state
   */
  protected getAgentContext<T = any>(state: TState): T | null {
    return state.agentContext?.[this.agentType] || null;
  }

  /**
   * Update agent context in workflow state
   */
  protected updateAgentContext(state: TState, update: Record<string, any>): Partial<TState> {
    return {
      agentContext: {
        ...state.agentContext,
        [this.agentType]: {
          ...this.getAgentContext(state),
          ...update
        }
      }
    };
  }

  /**
   * Create a tool execution command
   */
  protected createToolCommand(
    toolName: string, 
    params: Record<string, any>, 
    update?: Partial<TState>
  ): Command<TState> {
    return this.createCommand('TOOLS', {
      tools: [{ name: toolName, params }],
      update
    });
  }

  /**
   * Check if we need to route to human approval
   */
  protected shouldRouteToApproval(state: TState): boolean {
    if (this.nodeConfig.requiresApproval) return true;
    if (!this.meetsConfidenceThreshold(state)) return true;
    
    // Check for high-risk operations
    const agentContext = this.getAgentContext(state);
    if (agentContext?.risks?.some((r: any) => r.severity === 'critical')) {
      return true;
    }
    
    return false;
  }

  /**
   * Route to approval with proper context
   */
  protected routeToApproval(nextNode: string, update?: Partial<TState>): Command<TState> {
    return this.createCommand('GOTO', {
      goto: 'human_approval',
      update: {
        previousNode: this.nodeConfig.id,
        nextNode,
        requiresApproval: true,
        ...update
      }
    });
  }
}
```

## 2. Modern Workflow Pattern

### File: `src/lib/workflows/architect/architect.workflow.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { 
  Workflow, 
  StartNode, 
  Node, 
  ConditionalEdge,
  ApprovalNode,
  ToolNode,
  StreamProgress,
  DeclarativeWorkflowBase 
} from '@anubis/nestjs-langgraph';
import { WorkflowState, AgentType, Command } from '@anubis/shared';

// Import business nodes
import { ArchitectureAnalysisNode } from './nodes/architecture-analysis.node';
import { TechnicalDecisionNode } from './nodes/technical-decision.node';
import { ArchitectureValidationNode } from './nodes/architecture-validation.node';
import { SpecGenerationNode } from './nodes/spec-generation.node';
import { TaskDecompositionNode } from './nodes/task-decomposition.node';
import { TechnicalReviewNode } from './nodes/technical-review.node';

// Import services
import { ArchitectContextService } from './services/architect-context.service';
import { ArchitectRoutingService } from './services/architect-routing.service';

@Workflow({
  name: 'architect-workflow',
  description: 'Technical architecture and decision-making workflow',
  streaming: true,
  hitl: { 
    enabled: true, 
    interruptNodes: ['human_approval'],
    approvalTimeout: 300000 
  },
  channels: {
    requirements: null,
    architectureDecision: null,
    technicalSpecs: null,
    validationResults: null,
    decomposedTasks: null,
    reviewResults: null
  },
  confidenceThreshold: 0.75,
  autoApproveThreshold: 0.95,
  pattern: 'supervisor'
})
@Injectable()
export class ArchitectWorkflow extends DeclarativeWorkflowBase<WorkflowState> {
  
  public readonly agentType = AgentType.ARCHITECT;

  constructor(
    private readonly architectureAnalysisNode: ArchitectureAnalysisNode,
    private readonly technicalDecisionNode: TechnicalDecisionNode,
    private readonly architectureValidationNode: ArchitectureValidationNode,
    private readonly specGenerationNode: SpecGenerationNode,
    private readonly taskDecompositionNode: TaskDecompositionNode,
    private readonly technicalReviewNode: TechnicalReviewNode,
    private readonly contextService: ArchitectContextService,
    private readonly routingService: ArchitectRoutingService,
  ) {
    super();
  }

  // ===================================================================
  // NODE IMPLEMENTATIONS
  // ===================================================================

  @StartNode({ 
    description: 'Analyze current architecture and requirements',
    timeout: 120000,
    type: 'llm'
  })
  @StreamProgress({ granularity: 'coarse' })
  async architectureAnalysis(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    this.logger.log('Starting architecture analysis');
    return await this.architectureAnalysisNode.executeWithHooks(state);
  }

  @Node({ 
    id: 'technical_decision',
    type: 'llm',
    description: 'Make technical decisions based on analysis',
    requiresApproval: true,
    confidenceThreshold: 0.8,
    timeout: 120000
  })
  @StreamProgress({ granularity: 'coarse' })
  async technicalDecision(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    return await this.technicalDecisionNode.executeWithHooks(state);
  }

  @Node({ 
    id: 'architecture_validation',
    type: 'standard',
    description: 'Validate architecture approach and decisions',
    timeout: 90000
  })
  async architectureValidation(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    return await this.architectureValidationNode.executeWithHooks(state);
  }

  @Node({ 
    id: 'spec_generation',
    type: 'llm',
    description: 'Generate detailed technical specifications',
    timeout: 180000
  })
  @StreamProgress({ granularity: 'fine' })
  async specGeneration(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    return await this.specGenerationNode.executeWithHooks(state);
  }

  @Node({ 
    id: 'task_decomposition',
    type: 'standard',
    description: 'Decompose specifications into executable tasks',
    timeout: 120000
  })
  async taskDecomposition(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    return await this.taskDecompositionNode.executeWithHooks(state);
  }

  @Node({ 
    id: 'technical_review',
    type: 'llm',
    description: 'Conduct comprehensive technical review',
    timeout: 120000
  })
  async technicalReview(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    return await this.technicalReviewNode.executeWithHooks(state);
  }

  @ApprovalNode({
    description: 'Human approval checkpoint for architecture decisions',
    timeout: 300000
  })
  async humanApproval(state: WorkflowState): Promise<Command<WorkflowState>> {
    return this.handleHumanApproval(state);
  }

  @ToolNode({
    description: 'Execute architect-specific tools',
    timeout: 60000
  })
  async tools(state: WorkflowState): Promise<Partial<WorkflowState>> {
    return await this.executeTools(state);
  }

  // ===================================================================
  // ROUTING LOGIC
  // ===================================================================

  @ConditionalEdge('architectureAnalysis', {
    'continue': 'technical_decision',
    'needs_approval': 'human_approval', 
    'needs_tools': 'tools'
  }, { default: 'continue' })
  routeAfterAnalysis(state: WorkflowState): string {
    return this.routingService.routeAfterAnalysis(state);
  }

  @ConditionalEdge('technical_decision', {
    'continue': 'architecture_validation',
    'needs_tools': 'tools'
  }, { default: 'continue' })
  routeAfterDecision(state: WorkflowState): string {
    return this.routingService.needsTools(state) ? 'needs_tools' : 'continue';
  }

  @ConditionalEdge('architecture_validation', {
    'continue': 'spec_generation',
    'needs_tools': 'tools',
    'needs_revision': 'technical_decision'
  }, { default: 'continue' })
  routeAfterValidation(state: WorkflowState): string {
    return this.routingService.routeAfterValidation(state);
  }

  @ConditionalEdge('spec_generation', {
    'continue': 'task_decomposition',
    'needs_tools': 'tools'
  }, { default: 'continue' })
  routeAfterSpecGeneration(state: WorkflowState): string {
    return this.routingService.needsTools(state) ? 'needs_tools' : 'continue';
  }

  @ConditionalEdge('task_decomposition', {
    'continue': 'technical_review',
    'needs_tools': 'tools'
  }, { default: 'continue' })
  routeAfterDecomposition(state: WorkflowState): string {
    return this.routingService.needsTools(state) ? 'needs_tools' : 'continue';
  }

  @ConditionalEdge('technical_review', {
    'approved': '__end__',
    'needs_approval': 'human_approval',
    'needs_revision': 'spec_generation'
  }, { default: 'needs_approval' })
  routeAfterReview(state: WorkflowState): string {
    return this.routingService.routeAfterReview(state);
  }

  @ConditionalEdge('human_approval', {
    'approved': 'technical_decision',
    'rejected': '__end__',
    'retry': 'architectureAnalysis'
  }, { default: 'retry' })
  routeAfterApproval(state: WorkflowState): string {
    return this.routingService.routeAfterApproval(state);
  }

  @ConditionalEdge('tools', {
    'architecture_analysis': 'architectureAnalysis',
    'technical_decision': 'technical_decision',
    'architecture_validation': 'architecture_validation',
    'spec_generation': 'spec_generation',
    'task_decomposition': 'task_decomposition',
    'technical_review': 'technical_review'
  })
  routeAfterTools(state: WorkflowState): string {
    return this.routingService.routeAfterTools(state);
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private async handleHumanApproval(state: WorkflowState): Promise<Command<WorkflowState>> {
    if (!state.humanFeedback) {
      return this.createCommand('PAUSE', {
        message: 'Architecture decisions require human approval',
        context: this.contextService.buildApprovalContext(state)
      });
    }

    return this.createCommand('UPDATE', {
      update: {
        humanApprovalProcessed: true,
        lastApprovalDecision: {
          status: state.humanFeedback.status,
          timestamp: new Date(),
          feedback: state.humanFeedback.feedback
        }
      }
    });
  }

  private async executeTools(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const toolCalls = state.pendingToolCalls || [];
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall.name, toolCall.params);
        results.push({ name: toolCall.name, result });
      } catch (error) {
        results.push({ name: toolCall.name, error: error.message });
      }
    }

    return {
      toolResults: results,
      pendingToolCalls: [],
      lastToolExecution: new Date()
    };
  }

  /**
   * Create initial state for the workflow
   */
  protected createInitialState(input: Record<string, unknown>): WorkflowState {
    return {
      executionId: input.executionId as string,
      workflowType: this.agentType,
      userRequest: input.userRequest as string,
      agentType: this.agentType,
      currentAgentType: this.agentType,
      currentNodeId: 'start',
      workflowStatus: 'active',
      confidence: 0.5,
      completedNodes: [],
      agentContext: this.contextService.createInitialContext(input),
      workflowContext: {
        projectPath: input.projectPath as string || process.cwd(),
        outputDirectory: input.outputDirectory as string || '.anubis/output'
      },
      messages: [],
      retryCount: 0,
      attemptNumber: 1
    };
  }

  /**
   * Extract final output from completed workflow
   */
  public extractOutput(state: WorkflowState): Record<string, unknown> {
    const context = this.contextService.getArchitectContext(state);
    
    return {
      architecture: context?.architectureAnalysis,
      technicalDecisions: context?.technicalDecisions,
      specifications: context?.technicalSpecs,
      tasks: context?.decomposedTasks,
      validation: context?.architectureValidation,
      confidence: state.confidence,
      completedAt: new Date()
    };
  }

  /**
   * Suggest next agent in the workflow
   */
  public suggestNextAgent(state: WorkflowState): AgentType | null {
    const context = this.contextService.getArchitectContext(state);
    
    if (context?.technicalSpecs && context?.architectureValidation) {
      return AgentType.SENIOR_DEVELOPER;
    }
    
    return null;
  }
}
```

## 3. Individual Node Implementation

### File: `src/lib/workflows/architect/nodes/architecture-analysis.node.ts`

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { WorkflowState, AgentType, Command } from '@anubis/shared';
import { AgentNodeConfig } from '@anubis/nestjs-langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

// Import the base class from our library
import { AgentNodeBase } from '../../../nodes/base/agent-node.base';

// Import intelligence services
import { 
  TreeSitterAnalyzerService,
  CodebaseGraphService,
  EnhancedRAGService 
} from '@anubis/intelligence/backend';

interface ArchitectureAnalysisResult {
  currentArchitecture: {
    patterns: string[];
    technologies: string[];
    principles: string[];
    constraints: string[];
  };
  proposedChanges: {
    newPatterns: string[];
    newTechnologies: string[];
    impacts: string[];
    risks: string[];
  };
  recommendations: {
    designPatterns: string[];
    techStack: string[];
    bestPractices: string[];
  };
  clarity: number;
  complexity: number;
  confidence: number;
  needsTools: boolean;
  requiredTools?: Array<{ name: string; params: any }>;
}

@Injectable()
export class ArchitectureAnalysisNode extends AgentNodeBase<WorkflowState> {
  
  protected readonly logger = new Logger(ArchitectureAnalysisNode.name);
  protected readonly agentType = AgentType.ARCHITECT;
  
  protected readonly nodeConfig: AgentNodeConfig = {
    id: 'architecture_analysis',
    name: 'Architecture Analysis',
    description: 'Analyze current architecture and requirements to inform design decisions',
    requiresApproval: false,
    confidenceThreshold: 0.7,
    maxRetries: 3,
    timeout: 120000,
    type: 'llm'
  };

  constructor(
    @Inject('LLM_SERVICE') llmService: any,
    @Inject('TOOL_REGISTRY') toolRegistry: any,
    private readonly treeService: TreeSitterAnalyzerService,
    private readonly graphService: CodebaseGraphService,
    private readonly ragService: EnhancedRAGService,
  ) {
    super(llmService, toolRegistry);
  }

  protected requiresLLM(): boolean {
    return true;
  }

  /**
   * Execute architecture analysis
   */
  async execute(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    try {
      // Check if we're returning from tool execution
      if (this.isReturningFromTools(state)) {
        return this.processToolResults(state);
      }

      // Analyze current codebase structure
      const projectPath = state.workflowContext?.projectPath || process.cwd();
      const codebaseStructure = await this.analyzeCodebaseStructure(projectPath);
      
      // Get relevant context using RAG
      const relevantContext = await this.getRelevantArchitecturalContext(state.userRequest);

      // Determine if we need additional tool execution
      const needsDetailedAnalysis = this.needsDetailedCodeAnalysis(codebaseStructure, state);
      
      if (needsDetailedAnalysis) {
        return this.createToolCommand('analyze_detailed_structure', {
          projectPath,
          analysisType: 'deep',
          focusAreas: this.determineAnalysisFocusAreas(state.userRequest)
        });
      }

      // Perform LLM-based analysis
      const analysis = await this.performLLMAnalysis(state, codebaseStructure, relevantContext);

      // Update workflow state with results
      return this.updateAgentContext(state, {
        architectureAnalysis: analysis,
        codebaseStructure,
        analysisTimestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`Architecture analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze current codebase structure using intelligence services
   */
  private async analyzeCodebaseStructure(projectPath: string) {
    try {
      // Use Tree-sitter for code structure analysis
      const structureAnalysis = await this.treeService.analyzeProject(projectPath);
      
      // Use graph service for dependency analysis
      const dependencyGraph = await this.graphService.analyzeDependencies(projectPath);
      
      // Calculate complexity metrics
      const metrics = await this.graphService.calculateMetrics(dependencyGraph);

      return {
        structure: structureAnalysis,
        dependencies: dependencyGraph,
        metrics,
        analyzedAt: new Date()
      };
    } catch (error) {
      this.logger.warn(`Codebase structure analysis failed: ${error.message}`);
      return {
        structure: null,
        dependencies: null,
        metrics: null,
        error: error.message,
        analyzedAt: new Date()
      };
    }
  }

  /**
   * Get relevant architectural context using RAG
   */
  private async getRelevantArchitecturalContext(userRequest: string) {
    try {
      const searchResults = await this.ragService.search({
        query: `architecture patterns design decisions: ${userRequest}`,
        limit: 5,
        threshold: 0.7
      });

      return {
        relevantPatterns: searchResults.documents,
        searchQuery: searchResults.query,
        relevanceScores: searchResults.distances,
        searchedAt: new Date()
      };
    } catch (error) {
      this.logger.warn(`RAG context retrieval failed: ${error.message}`);
      return {
        relevantPatterns: [],
        error: error.message,
        searchedAt: new Date()
      };
    }
  }

  /**
   * Perform LLM-based architecture analysis
   */
  private async performLLMAnalysis(
    state: WorkflowState, 
    codebaseStructure: any, 
    relevantContext: any
  ): Promise<ArchitectureAnalysisResult> {
    const messages = [
      new SystemMessage(`You are a senior software architect analyzing a codebase for architectural improvements.

Context:
- User Request: ${state.userRequest}
- Current Codebase Structure: ${JSON.stringify(codebaseStructure, null, 2)}
- Relevant Patterns: ${JSON.stringify(relevantContext, null, 2)}

Analyze the current architecture and provide structured recommendations for the requested changes.
Focus on:
1. Current architectural patterns and their effectiveness
2. Proposed changes and their impacts
3. Risk assessment and mitigation strategies
4. Specific recommendations for implementation

Respond with a JSON object matching the ArchitectureAnalysisResult interface.`),
      new HumanMessage(`Please analyze the architecture for: ${state.userRequest}`)
    ];

    const response = await this.llm.invoke(messages);
    
    try {
      const analysisResult = JSON.parse(response.content as string) as ArchitectureAnalysisResult;
      
      // Validate and enhance the result
      return {
        ...analysisResult,
        confidence: this.calculateConfidence(analysisResult, codebaseStructure),
        needsTools: this.determineIfToolsNeeded(analysisResult),
        requiredTools: this.identifyRequiredTools(analysisResult)
      };
    } catch (parseError) {
      this.logger.warn('Failed to parse LLM response, using fallback analysis');
      return this.createFallbackAnalysis(state, codebaseStructure);
    }
  }

  /**
   * Check if detailed code analysis is needed
   */
  private needsDetailedCodeAnalysis(codebaseStructure: any, state: WorkflowState): boolean {
    // If structure analysis failed, we need tools
    if (!codebaseStructure.structure) return true;
    
    // If request involves complex architectural changes, we need detailed analysis
    const complexityIndicators = [
      'refactor', 'redesign', 'microservices', 'modular', 'decouple'
    ];
    
    return complexityIndicators.some(indicator => 
      state.userRequest.toLowerCase().includes(indicator)
    );
  }

  /**
   * Determine analysis focus areas based on user request
   */
  private determineAnalysisFocusAreas(userRequest: string): string[] {
    const focusMap = {
      'performance': ['hot-paths', 'bottlenecks', 'optimization'],
      'scalability': ['load-patterns', 'resource-usage', 'concurrency'],
      'maintainability': ['complexity-metrics', 'coupling', 'cohesion'],
      'security': ['data-flow', 'access-patterns', 'vulnerabilities']
    };

    const focusAreas: string[] = [];
    Object.entries(focusMap).forEach(([key, areas]) => {
      if (userRequest.toLowerCase().includes(key)) {
        focusAreas.push(...areas);
      }
    });

    return focusAreas.length > 0 ? focusAreas : ['general-analysis'];
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(result: ArchitectureAnalysisResult, codebaseStructure: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have good codebase data
    if (codebaseStructure.structure && codebaseStructure.metrics) {
      confidence += 0.2;
    }

    // Increase confidence if analysis seems comprehensive
    if (result.currentArchitecture.patterns.length > 0 && 
        result.recommendations.designPatterns.length > 0) {
      confidence += 0.2;
    }

    // Decrease confidence if analysis indicates high complexity or risks
    if (result.complexity > 0.8 || result.proposedChanges.risks.length > 3) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Determine if additional tools are needed
   */
  private determineIfToolsNeeded(result: ArchitectureAnalysisResult): boolean {
    // Tools needed if we have insufficient data for recommendations
    return result.currentArchitecture.patterns.length === 0 ||
           result.recommendations.designPatterns.length === 0 ||
           result.proposedChanges.impacts.length === 0;
  }

  /**
   * Identify specific tools required
   */
  private identifyRequiredTools(result: ArchitectureAnalysisResult): Array<{ name: string; params: any }> {
    const tools = [];

    if (result.currentArchitecture.patterns.length === 0) {
      tools.push({
        name: 'analyze_design_patterns',
        params: { analysisType: 'patterns', depth: 'comprehensive' }
      });
    }

    if (result.proposedChanges.impacts.length === 0) {
      tools.push({
        name: 'analyze_change_impact',
        params: { changeType: 'architectural', scope: 'full' }
      });
    }

    return tools;
  }

  /**
   * Create fallback analysis when LLM parsing fails
   */
  private createFallbackAnalysis(state: WorkflowState, codebaseStructure: any): ArchitectureAnalysisResult {
    return {
      currentArchitecture: {
        patterns: codebaseStructure.structure ? ['layered-architecture'] : [],
        technologies: ['typescript', 'nestjs'],
        principles: ['separation-of-concerns'],
        constraints: ['existing-codebase', 'backward-compatibility']
      },
      proposedChanges: {
        newPatterns: [],
        newTechnologies: [],
        impacts: ['requires-analysis'],
        risks: ['insufficient-analysis-data']
      },
      recommendations: {
        designPatterns: ['repository-pattern', 'dependency-injection'],
        techStack: ['maintain-current'],
        bestPractices: ['code-review', 'testing']
      },
      clarity: 0.3,
      complexity: 0.7,
      confidence: 0.3,
      needsTools: true,
      requiredTools: [
        { name: 'comprehensive_code_analysis', params: { projectPath: state.workflowContext?.projectPath } }
      ]
    };
  }

  /**
   * Process results from tool execution
   */
  private async processToolResults(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const toolResults = state.toolResults || [];
    const enhancedAnalysis = this.getAgentContext(state);

    // Process each tool result and enhance our analysis
    for (const toolResult of toolResults) {
      if (toolResult.name === 'analyze_detailed_structure') {
        enhancedAnalysis.detailedStructure = toolResult.result;
      } else if (toolResult.name === 'analyze_design_patterns') {
        enhancedAnalysis.detectedPatterns = toolResult.result;
      }
    }

    // Re-run LLM analysis with enhanced data
    const finalAnalysis = await this.performEnhancedLLMAnalysis(state, enhancedAnalysis);

    return this.updateAgentContext(state, {
      architectureAnalysis: finalAnalysis,
      toolResultsProcessed: true,
      enhancedDataAvailable: true
    });
  }

  /**
   * Enhanced LLM analysis with tool results
   */
  private async performEnhancedLLMAnalysis(state: WorkflowState, enhancedData: any) {
    const messages = [
      new SystemMessage(`You are a senior software architect with comprehensive analysis data.
      
Enhanced Data: ${JSON.stringify(enhancedData, null, 2)}

Provide a definitive architectural analysis and recommendations based on this comprehensive data.`),
      new HumanMessage(`Based on the enhanced analysis data, provide final recommendations for: ${state.userRequest}`)
    ];

    const response = await this.llm.invoke(messages);
    
    try {
      return JSON.parse(response.content as string);
    } catch (error) {
      this.logger.error('Enhanced LLM analysis parsing failed', error);
      throw new Error('Failed to generate enhanced architecture analysis');
    }
  }

  /**
   * Check if we're returning from tool execution
   */
  private isReturningFromTools(state: WorkflowState): boolean {
    return !!(state.toolResults && state.toolResults.length > 0 && state.currentNodeId === this.nodeConfig.id);
  }
}
```

## 4. Service Implementation Pattern

### File: `src/lib/workflows/architect/services/architect-context.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { WorkflowState, AgentType } from '@anubis/shared';
import { extractTypedContext } from '@anubis/agent-system/shared';

export interface ArchitectContext {
  architectureAnalysis?: any;
  technicalDecisions?: any;
  architectureValidation?: any;
  technicalSpecs?: any;
  decomposedTasks?: any;
  reviewResults?: any;
  codebaseStructure?: any;
  relevantPatterns?: any;
  detailedAnalysis?: any;
  risks?: any[];
  recommendations?: any;
  confidence?: number;
  lastUpdated?: Date;
}

@Injectable()
export class ArchitectContextService {
  private readonly logger = new Logger(ArchitectContextService.name);

  /**
   * Create initial architect context
   */
  createInitialContext(input: Record<string, unknown>): Record<string, any> {
    const architectContext: ArchitectContext = {
      lastUpdated: new Date(),
      confidence: 0.5,
      risks: [],
      recommendations: {}
    };

    return {
      [AgentType.ARCHITECT]: architectContext
    };
  }

  /**
   * Get architect context from workflow state
   */
  getArchitectContext(state: WorkflowState): ArchitectContext | null {
    return state.agentContext?.[AgentType.ARCHITECT] || null;
  }

  /**
   * Update architect context
   */
  updateContext(state: WorkflowState, update: Partial<ArchitectContext>): Partial<WorkflowState> {
    const currentContext = this.getArchitectContext(state) || {};
    
    return {
      agentContext: {
        ...state.agentContext,
        [AgentType.ARCHITECT]: {
          ...currentContext,
          ...update,
          lastUpdated: new Date()
        }
      }
    };
  }

  /**
   * Build context for human approval
   */
  buildApprovalContext(state: WorkflowState): Record<string, any> {
    const context = this.getArchitectContext(state);
    
    return {
      agentType: AgentType.ARCHITECT,
      currentNode: state.currentNodeId,
      analysis: context?.architectureAnalysis,
      decisions: context?.technicalDecisions,
      risks: context?.risks || [],
      confidence: context?.confidence || 0,
      recommendations: context?.recommendations,
      userRequest: state.userRequest,
      executionId: state.executionId
    };
  }

  /**
   * Extract deliverables from context
   */
  extractDeliverables(state: WorkflowState): Record<string, any> {
    const context = this.getArchitectContext(state);
    
    if (!context) {
      return {};
    }

    return {
      architectureAnalysis: context.architectureAnalysis,
      technicalDecisions: context.technicalDecisions,
      specifications: context.technicalSpecs,
      validationResults: context.architectureValidation,
      tasks: context.decomposedTasks,
      reviewResults: context.reviewResults
    };
  }

  /**
   * Check if architect work is complete
   */
  isWorkComplete(state: WorkflowState): boolean {
    const context = this.getArchitectContext(state);
    
    if (!context) return false;

    return !!(
      context.architectureAnalysis &&
      context.technicalDecisions &&
      context.technicalSpecs &&
      context.architectureValidation &&
      context.decomposedTasks
    );
  }

  /**
   * Calculate overall confidence
   */
  calculateOverallConfidence(state: WorkflowState): number {
    const context = this.getArchitectContext(state);
    
    if (!context) return 0.0;

    const weights = {
      architectureAnalysis: 0.2,
      technicalDecisions: 0.2,
      architectureValidation: 0.2,
      technicalSpecs: 0.2,
      decomposedTasks: 0.1,
      reviewResults: 0.1
    };

    let totalConfidence = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
      if (context[key as keyof ArchitectContext]) {
        totalConfidence += (context[key as keyof ArchitectContext]?.confidence || 0.5) * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalConfidence / totalWeight : 0;
  }

  /**
   * Get high-priority risks
   */
  getHighPriorityRisks(state: WorkflowState): any[] {
    const context = this.getArchitectContext(state);
    const risks = context?.risks || [];
    
    return risks.filter(risk => risk.severity === 'critical' || risk.probability > 0.7);
  }

  /**
   * Check if ready for next agent
   */
  isReadyForNextAgent(state: WorkflowState): boolean {
    return this.isWorkComplete(state) && 
           this.calculateOverallConfidence(state) >= 0.7 &&
           this.getHighPriorityRisks(state).length === 0;
  }
}
```

## 5. Tool Implementation Pattern

### File: `src/lib/tools/architect/codebase-structure-analysis.tool.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Tool } from '@anubis/nestjs-langgraph';
import { z } from 'zod';
import { 
  TreeSitterAnalyzerService,
  CodebaseGraphService,
  EnhancedRAGService 
} from '@anubis/intelligence/backend';

const CodebaseStructureAnalysisSchema = z.object({
  projectPath: z.string().describe('Path to the project root'),
  analysisDepth: z.enum(['shallow', 'deep']).default('shallow').describe('Depth of analysis to perform'),
  focusAreas: z.array(z.string()).optional().describe('Specific areas to focus the analysis on'),
  includeMetrics: z.boolean().default(true).describe('Whether to include complexity metrics'),
  includeDependencies: z.boolean().default(true).describe('Whether to analyze dependencies')
});

type CodebaseStructureAnalysisParams = z.infer<typeof CodebaseStructureAnalysisSchema>;

@Tool({
  name: 'analyze_codebase_structure',
  description: 'Analyze the structure, patterns, and metrics of a codebase to inform architectural decisions',
  schema: CodebaseStructureAnalysisSchema
})
@Injectable()
export class CodebaseStructureAnalysisTool {
  
  constructor(
    private readonly treeService: TreeSitterAnalyzerService,
    private readonly graphService: CodebaseGraphService,
    private readonly ragService: EnhancedRAGService
  ) {}

  async execute(params: CodebaseStructureAnalysisParams) {
    const { projectPath, analysisDepth, focusAreas = [], includeMetrics, includeDependencies } = params;

    try {
      const results: any = {
        projectPath,
        analysisDepth,
        timestamp: new Date(),
        structure: null,
        dependencies: null,
        metrics: null,
        patterns: [],
        recommendations: []
      };

      // 1. Analyze code structure using Tree-sitter
      if (analysisDepth === 'deep' || focusAreas.length > 0) {
        results.structure = await this.performDeepStructureAnalysis(projectPath, focusAreas);
      } else {
        results.structure = await this.performShallowStructureAnalysis(projectPath);
      }

      // 2. Analyze dependencies if requested
      if (includeDependencies) {
        results.dependencies = await this.analyzeDependencies(projectPath);
      }

      // 3. Calculate metrics if requested
      if (includeMetrics && results.dependencies) {
        results.metrics = await this.calculateMetrics(results.dependencies);
      }

      // 4. Detect architectural patterns
      results.patterns = await this.detectArchitecturalPatterns(results.structure, results.dependencies);

      // 5. Generate recommendations
      results.recommendations = await this.generateRecommendations(results);

      return {
        success: true,
        data: results,
        confidence: this.calculateAnalysisConfidence(results),
        executionTime: Date.now() - results.timestamp.getTime()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
        confidence: 0,
        executionTime: 0
      };
    }
  }

  private async performDeepStructureAnalysis(projectPath: string, focusAreas: string[]) {
    const analysis = await this.treeService.analyzeProject(projectPath, {
      includeAST: true,
      analyzeFunctions: true,
      analyzeClasses: true,
      analyzeImports: true,
      focusAreas
    });

    return {
      ...analysis,
      depth: 'deep',
      focusAreas,
      detailLevel: 'comprehensive'
    };
  }

  private async performShallowStructureAnalysis(projectPath: string) {
    const analysis = await this.treeService.analyzeProject(projectPath, {
      includeAST: false,
      analyzeFunctions: false,
      analyzeClasses: true,
      analyzeImports: true
    });

    return {
      ...analysis,
      depth: 'shallow',
      detailLevel: 'overview'
    };
  }

  private async analyzeDependencies(projectPath: string) {
    try {
      return await this.graphService.analyzeDependencies(projectPath, {
        includeExternal: true,
        includeInternal: true,
        analyzeCircular: true,
        calculateCoupling: true
      });
    } catch (error) {
      return {
        error: error.message,
        dependencies: [],
        circularDependencies: [],
        couplingMetrics: null
      };
    }
  }

  private async calculateMetrics(dependencies: any) {
    try {
      return await this.graphService.calculateMetrics(dependencies, {
        includeComplexity: true,
        includeCohesion: true,
        includeCoupling: true,
        includeInstability: true
      });
    } catch (error) {
      return {
        error: error.message,
        complexity: null,
        cohesion: null,
        coupling: null,
        instability: null
      };
    }
  }

  private async detectArchitecturalPatterns(structure: any, dependencies: any) {
    const patterns = [];

    try {
      // Detect common architectural patterns
      if (this.hasLayeredArchitecture(structure, dependencies)) {
        patterns.push({
          name: 'Layered Architecture',
          confidence: 0.8,
          description: 'Clear separation of concerns with layered structure'
        });
      }

      if (this.hasRepositoryPattern(structure)) {
        patterns.push({
          name: 'Repository Pattern',
          confidence: 0.7,
          description: 'Data access abstraction through repository interfaces'
        });
      }

      if (this.hasDependencyInjection(structure)) {
        patterns.push({
          name: 'Dependency Injection',
          confidence: 0.9,
          description: 'Inversion of control through dependency injection'
        });
      }

      if (this.hasMicroservicesPattern(structure, dependencies)) {
        patterns.push({
          name: 'Microservices',
          confidence: 0.6,
          description: 'Distributed architecture with service boundaries'
        });
      }

    } catch (error) {
      patterns.push({
        name: 'Pattern Detection Error',
        confidence: 0.0,
        description: error.message
      });
    }

    return patterns;
  }

  private async generateRecommendations(analysisResults: any) {
    const recommendations = [];

    try {
      // Use RAG to find relevant architectural recommendations
      const searchQuery = `architectural improvements ${analysisResults.patterns.map((p: any) => p.name).join(' ')}`;
      const ragResults = await this.ragService.search({
        query: searchQuery,
        limit: 3,
        threshold: 0.6
      });

      // Add RAG-based recommendations
      ragResults.documents.forEach((doc, index) => {
        recommendations.push({
          type: 'knowledge-based',
          priority: 'medium',
          description: doc.content,
          confidence: 1 - ragResults.distances[index],
          source: 'knowledge-base'
        });
      });

      // Add metric-based recommendations
      if (analysisResults.metrics) {
        if (analysisResults.metrics.complexity > 0.7) {
          recommendations.push({
            type: 'complexity-reduction',
            priority: 'high',
            description: 'Consider refactoring complex components to improve maintainability',
            confidence: 0.8,
            source: 'metrics-analysis'
          });
        }

        if (analysisResults.metrics.coupling > 0.6) {
          recommendations.push({
            type: 'decoupling',
            priority: 'medium',
            description: 'Reduce coupling between modules through better abstraction',
            confidence: 0.7,
            source: 'metrics-analysis'
          });
        }
      }

      // Add dependency-based recommendations
      if (analysisResults.dependencies?.circularDependencies?.length > 0) {
        recommendations.push({
          type: 'circular-dependency-resolution',
          priority: 'high',
          description: 'Resolve circular dependencies to improve modularity',
          confidence: 0.9,
          source: 'dependency-analysis'
        });
      }

    } catch (error) {
      recommendations.push({
        type: 'error',
        priority: 'low',
        description: `Recommendation generation failed: ${error.message}`,
        confidence: 0.0,
        source: 'error-handler'
      });
    }

    return recommendations;
  }

  // Pattern detection helper methods
  private hasLayeredArchitecture(structure: any, dependencies: any): boolean {
    // Look for typical layered structure patterns
    const layerKeywords = ['controller', 'service', 'repository', 'entity', 'dto'];
    const directories = structure?.directories || [];
    
    return layerKeywords.filter(keyword => 
      directories.some((dir: string) => dir.toLowerCase().includes(keyword))
    ).length >= 3;
  }

  private hasRepositoryPattern(structure: any): boolean {
    const files = structure?.files || [];
    return files.some((file: string) => 
      file.toLowerCase().includes('repository') || 
      file.toLowerCase().includes('repo')
    );
  }

  private hasDependencyInjection(structure: any): boolean {
    // Look for DI decorators or patterns
    const content = structure?.content || '';
    return content.includes('@Injectable') || 
           content.includes('@Inject') || 
           content.includes('constructor(');
  }

  private hasMicroservicesPattern(structure: any, dependencies: any): boolean {
    // Look for service boundaries and distributed patterns
    const hasServiceBoundaries = structure?.directories?.some((dir: string) => 
      dir.includes('service') || dir.includes('api') || dir.includes('gateway')
    );
    
    const hasDistributedPatterns = dependencies?.external?.some((dep: any) => 
      dep.name.includes('express') || dep.name.includes('fastify') || 
      dep.name.includes('grpc') || dep.name.includes('kafka')
    );
    
    return hasServiceBoundaries && hasDistributedPatterns;
  }

  private calculateAnalysisConfidence(results: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on successful analyses
    if (results.structure && !results.structure.error) confidence += 0.2;
    if (results.dependencies && !results.dependencies.error) confidence += 0.2;
    if (results.metrics && !results.metrics.error) confidence += 0.1;
    if (results.patterns && results.patterns.length > 0) confidence += 0.1;
    if (results.recommendations && results.recommendations.length > 0) confidence += 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}
```

## 6. Main Module

### File: `src/lib/agents-workflow.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { NestJSLangGraphModule } from '@anubis/nestjs-langgraph';

// Import workflows
import { ArchitectWorkflow } from './workflows/architect/architect.workflow';
import { ProductManagerWorkflow } from './workflows/product-manager/product-manager.workflow';
import { SeniorDeveloperWorkflow } from './workflows/senior-developer/senior-developer.workflow';
import { QAEngineerWorkflow } from './workflows/qa-engineer/qa-engineer.workflow';
import { TechLeadWorkflow } from './workflows/tech-lead/tech-lead.workflow';

// Import nodes
import { ArchitectureAnalysisNode } from './workflows/architect/nodes/architecture-analysis.node';
import { TechnicalDecisionNode } from './workflows/architect/nodes/technical-decision.node';
import { ArchitectureValidationNode } from './workflows/architect/nodes/architecture-validation.node';
// ... other nodes

// Import services
import { ArchitectContextService } from './workflows/architect/services/architect-context.service';
import { ArchitectRoutingService } from './workflows/architect/services/architect-routing.service';
// ... other services

// Import tools
import { CodebaseStructureAnalysisTool } from './tools/architect/codebase-structure-analysis.tool';
// ... other tools

@Module({
  imports: [
    NestJSLangGraphModule.forFeature({
      workflows: [
        ArchitectWorkflow,
        ProductManagerWorkflow,
        SeniorDeveloperWorkflow,
        QAEngineerWorkflow,
        TechLeadWorkflow
      ],
      enableStreaming: true,
      enableHITL: true,
      enableMetrics: true,
      enableCaching: true
    })
  ],
  providers: [
    // Workflows
    ArchitectWorkflow,
    ProductManagerWorkflow,
    SeniorDeveloperWorkflow,
    QAEngineerWorkflow,
    TechLeadWorkflow,

    // Nodes
    ArchitectureAnalysisNode,
    TechnicalDecisionNode,
    ArchitectureValidationNode,
    // ... other nodes

    // Services
    ArchitectContextService,
    ArchitectRoutingService,
    // ... other services

    // Tools
    CodebaseStructureAnalysisTool,
    // ... other tools
  ],
  exports: [
    // Export workflows for external use
    ArchitectWorkflow,
    ProductManagerWorkflow,
    SeniorDeveloperWorkflow,
    QAEngineerWorkflow,
    TechLeadWorkflow,

    // Export services for external use
    ArchitectContextService,
    ArchitectRoutingService,
    // ... other services
  ]
})
export class AgentsWorkflowModule {}
```

## 7. Public API

### File: `src/index.ts`

```typescript
// Export main module
export { AgentsWorkflowModule } from './lib/agents-workflow.module';

// Export workflows
export { ArchitectWorkflow } from './lib/workflows/architect/architect.workflow';
export { ProductManagerWorkflow } from './lib/workflows/product-manager/product-manager.workflow';
export { SeniorDeveloperWorkflow } from './lib/workflows/senior-developer/senior-developer.workflow';
export { QAEngineerWorkflow } from './lib/workflows/qa-engineer/qa-engineer.workflow';
export { TechLeadWorkflow } from './lib/workflows/tech-lead/tech-lead.workflow';

// Export base classes
export { AgentNodeBase } from './lib/nodes/base/agent-node.base';

// Export services
export { ArchitectContextService } from './lib/workflows/architect/services/architect-context.service';
export { ArchitectRoutingService } from './lib/workflows/architect/services/architect-routing.service';

// Export tools
export { CodebaseStructureAnalysisTool } from './lib/tools/architect/codebase-structure-analysis.tool';

// Export types
export interface { ArchitectContext } from './lib/workflows/architect/services/architect-context.service';

// Re-export commonly used types from dependencies
export type { WorkflowState, AgentType, Command } from '@anubis/shared';
export type { AgentNodeConfig } from '@anubis/nestjs-langgraph';
```

These code examples provide a comprehensive foundation for implementing the new agents-workflow library using modern patterns. The examples show:

1. **Proper inheritance** from @anubis/nestjs-langgraph base classes
2. **Decorator usage** for defining workflows, nodes, edges, and tools
3. **Type safety** throughout the implementation
4. **Service integration** with intelligence domain services
5. **Error handling** and robust failure scenarios
6. **Tool integration** with proper schemas and validation
7. **Context management** for agent-specific state
8. **Module organization** following NestJS best practices

Each pattern can be replicated across all agent types while preserving the specific business logic for each domain.