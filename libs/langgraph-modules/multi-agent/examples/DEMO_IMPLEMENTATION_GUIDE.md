# Demo Implementation Guide - Enhanced Multi-Agent Capabilities

## 🎯 How to Maximize Benefits from Enhanced Infrastructure

This guide shows **demo applications** how to leverage the new powerful internal services through the clean public API, including the complete **Workflow System**.

## 🔄 New Workflow System Integration

The Multi-Agent Module now includes a complete **Workflow System** that works seamlessly with agents. Here's how to use it:

### Complete Workflow Example

```typescript
import { Injectable } from '@nestjs/common';
import { Workflow, WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';
import { WorkflowContext, WorkflowResult } from '@hive-academy/langgraph-multi-agent';

@Workflow({
  id: 'enhanced-support-workflow',
  name: 'Enhanced Customer Support Workflow',
  description: 'Orchestrates multi-agent customer support with escalation',
  version: '1.0.0',
  requiredAgents: ['support-executive', 'technical-specialist', 'ai-analyzer'],
  config: {
    timeout: 600000, // 10 minutes
    streaming: true,
    retry: {
      enabled: true,
      maxAttempts: 2,
      backoffMs: 2000,
    },
  },
})
@Injectable()
export class EnhancedSupportWorkflow {
  async execute(input: TicketRequest, context: WorkflowContext): Promise<WorkflowResult> {
    context.logger.log(`Starting enhanced support workflow for ticket: ${input.title}`);

    try {
      // Step 1: Executive triage using hierarchical agents
      const triageResult = await context.coordinator.setupNetwork(
        'triage-hierarchy',
        [
          { id: 'support-executive', type: 'SupportExecutiveAgent' },
          { id: 'technical-specialist', type: 'TechnicalSpecialistAgent' },
        ],
        'hierarchical',
        {
          levels: [['support-executive'], ['technical-specialist']],
          escalationRules: [
            {
              condition: (state) => state.metadata?.priority === 'critical',
              targetLevel: 0,
              message: 'Critical priority - executive attention required',
            },
          ],
        }
      );

      const triageExecution = await context.coordinator.executeSimpleWorkflow(triageResult, `Triage support ticket: ${input.description}`);

      // Step 2: AI analysis with weighted tools
      const analysisResult = await context.coordinator.setupNetwork(
        'analysis-tools',
        [
          { id: 'ai-analyzer', type: 'AIAnalyzerAgent' },
          { id: 'historical-matcher', type: 'HistoricalMatcherAgent' },
        ],
        'supervisor',
        {
          systemPrompt: 'Coordinate AI analysis with weighted confidence merging',
          workers: ['ai-analyzer', 'historical-matcher'],
          enableForwardMessage: true,
        }
      );

      const analysisExecution = await context.coordinator.executeSimpleWorkflow(analysisResult, `Analyze ticket: ${input.description}`);

      // Step 3: Final resolution synthesis
      const resolution = this.synthesizeResolution(triageExecution.finalState, analysisExecution.finalState);

      return {
        success: true,
        data: {
          ticketId: input.id,
          resolution: resolution.solution,
          confidence: resolution.confidence,
          escalationPath: triageExecution.executionPath,
          analysisResults: analysisExecution.finalState.metadata,
        },
        metadata: {
          workflowId: 'enhanced-support-workflow',
          instanceId: context.instanceId,
          totalSteps: 3,
          duration: Date.now() - input.timestamp,
          agentsUsed: [...triageExecution.executionPath, ...analysisExecution.executionPath].filter((v, i, a) => a.indexOf(v) === i), // unique agents
        },
      };
    } catch (error) {
      context.logger.error(`Workflow execution failed: ${error.message}`);
      return {
        success: false,
        error: {
          message: error.message,
          code: 'WORKFLOW_EXECUTION_FAILED',
          details: error,
        },
        metadata: {
          workflowId: 'enhanced-support-workflow',
          instanceId: context.instanceId,
          failedAt: Date.now(),
        },
      };
    }
  }

  private synthesizeResolution(triageState: any, analysisState: any) {
    // Combine results from hierarchical triage and weighted analysis
    const triageConfidence = triageState.metadata?.toolWeight || 0.5;
    const analysisConfidence = analysisState.metadata?.toolWeight || 0.5;

    const totalWeight = triageConfidence + analysisConfidence;
    const combinedConfidence = totalWeight / 2;

    return {
      solution: `Resolution based on ${triageState.messages[0]?.content} and ${analysisState.messages[0]?.content}`,
      confidence: combinedConfidence,
      reasoning: 'Combined hierarchical triage and weighted AI analysis',
    };
  }
}
```

### Service Integration with Workflows

```typescript
@Injectable()
export class EnhancedSupportService {
  constructor(private readonly workflowManager: WorkflowManagerService, private readonly multiAgentCoordinator: MultiAgentCoordinatorService) {}

  /**
   * Execute complete workflow with streaming support
   */
  async processSupportTicket(request: TicketRequest, onProgress?: (event: any) => void): Promise<WorkflowResult> {
    if (onProgress) {
      // Use streaming execution for real-time updates
      return this.workflowManager.executeWorkflowWithStreaming('enhanced-support-workflow', request, onProgress);
    } else {
      // Standard execution
      return this.workflowManager.executeWorkflow('enhanced-support-workflow', request, {
        streaming: false,
        timeout: 300000, // 5 minutes
      });
    }
  }

  /**
   * Get workflow execution status and history
   */
  async getWorkflowStatus(ticketId: string) {
    const instances = this.workflowManager.getActiveInstances();
    const activeInstance = instances.find((i) => i.input?.id === ticketId && i.status === 'running');

    if (activeInstance) {
      return {
        status: 'running',
        instanceId: activeInstance.instanceId,
        progress: this.calculateProgress(activeInstance),
        startedAt: activeInstance.createdAt,
      };
    }

    // Check history
    const history = this.workflowManager.getWorkflowHistory('enhanced-support-workflow');
    const completedInstance = history.find((i) => i.input?.id === ticketId);

    if (completedInstance) {
      return {
        status: completedInstance.status,
        instanceId: completedInstance.instanceId,
        result: completedInstance.result,
        completedAt: completedInstance.updatedAt,
        duration: completedInstance.result?.metadata?.duration,
      };
    }

    return { status: 'not_found' };
  }

  /**
   * Cancel running workflow
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    return this.workflowManager.cancelWorkflow(instanceId);
  }

  private calculateProgress(instance: any): number {
    // Calculate progress based on workflow metadata
    const totalSteps = 3; // triage, analysis, synthesis
    const currentStep = instance.result?.metadata?.currentStep || 0;
    return (currentStep / totalSteps) * 100;
  }
}
```

### Module Registration with Workflows

```typescript
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';

@Module({
  imports: [
    MultiAgentModule.forRoot({
      // Register agents (existing)
      agents: [SupportExecutiveAgent, TechnicalSpecialistAgent, AIAnalyzerAgent, HistoricalMatcherAgent],

      // Register workflows (NEW!)
      workflows: [
        EnhancedSupportWorkflow,
        ContentCreationWorkflow,
        // Add more workflows as needed
      ],

      defaultLlm: {
        provider: 'openai',
        model: 'gpt-4',
        openaiApiKey: process.env.OPENAI_API_KEY,
      },

      // Workflow features work with existing capabilities
      streaming: { enabled: true },
      performance: { tokenOptimization: true },
    }),
  ],
  providers: [EnhancedSupportService, EnhancedCustomerSupportCoordinator],
  exports: [EnhancedSupportService],
})
export class EnhancedSupportModule {}
```

## 🏢 Complete Customer Support Demo

### 1. Properly Decorated Agents (Using Library Features)

**Key Point**: Agents should use the `@Agent` decorator and properly leverage the library's decorators:

```typescript
import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { StreamToken } from '@hive-academy/langgraph-streaming';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import { AIMessage } from '@langchain/core/messages';
import type { AgentState } from '@hive-academy/langgraph-multi-agent';

/**
 * Executive Level Agent - Strategic decisions and escalation management
 * Uses enhanced GraphBuilderService through proper agent registration
 */
@Agent({
  id: 'support-executive',
  name: 'Support Executive',
  description: 'Makes high-level customer service decisions, handles escalations',
  capabilities: ['strategic_planning', 'escalation_management', 'policy_decisions'],
  priority: 'critical',
  tools: ['enterprise-escalation', 'policy-lookup', 'executive-notifications'],
})
@Injectable()
export class SupportExecutiveAgent {
  constructor(private readonly llmProvider: LlmProviderService, private readonly neo4jService: Neo4jService) {}

  /**
   * Executive decision making with weighted metadata for ToolNodeService
   */
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    const priority = await this.assessPriority(state);
    const escalationNeeded = priority === 'critical' || state.metadata?.customerTier === 'enterprise';

    // Get strategic context from Neo4j
    const strategicContext = await this.getStrategicContext(state);

    return {
      messages: [new AIMessage(`Executive review completed. Priority: ${priority}. ${escalationNeeded ? 'Assigning to specialist team.' : 'Routing to standard process.'}`)],
      next: escalationNeeded ? 'technical-specialist' : 'frontline-agent',
      metadata: {
        ...state.metadata,
        executiveReview: true,
        priority,
        escalationReason: escalationNeeded ? 'High priority customer' : null,
        toolWeight: 0.9, // ← High confidence for executive decisions - ToolNodeService uses this
        strategicContext,
      },
    };
  }

  private async assessPriority(state: AgentState): Promise<'low' | 'medium' | 'high' | 'critical'> {
    // Use Neo4j to assess customer strategic importance
    const query = `
      MATCH (c:Customer {id: $customerId})
      RETURN c.tier as tier, c.accountValue as value, c.strategicImportance as importance
    `;

    const result = await this.neo4jService.run(query, {
      customerId: state.metadata?.customerId,
    });

    if (result?.records?.[0]) {
      const record = result.records[0] as any;
      const tier = record.get('tier');
      const importance = record.get('importance');

      if (tier === 'enterprise' || importance === 'strategic') return 'critical';
    }

    return state.metadata?.customerTier === 'enterprise' ? 'critical' : 'medium';
  }

  private async getStrategicContext(state: AgentState) {
    // Executive-level strategic analysis
    return {
      customerStrategicValue: 'high',
      policyImplications: 'review_required',
      executiveActionRequired: true,
    };
  }
}

/**
 * Technical Specialist Agent - Complex problem resolution
 */
@Agent({
  id: 'technical-specialist',
  name: 'Technical Specialist',
  description: 'Provides technical expertise and complex problem resolution',
  capabilities: ['technical_analysis', 'complex_troubleshooting', 'solution_architecture'],
  priority: 'high',
  tools: ['technical-kb-search', 'diagnostic-tools', 'architecture-analysis'],
})
@Injectable()
export class TechnicalSpecialistAgent {
  constructor(private readonly chromaService: ChromaDBService, private readonly llmProvider: LlmProviderService) {}

  /**
   * Technical analysis with weighted decision making for ToolNodeService
   */
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    // Perform semantic search for technical solutions
    const technicalSolutions = await this.findTechnicalSolutions(state);

    const complexity = await this.analyzeComplexity(state);
    const confidence = complexity < 0.7 ? 0.9 : 0.6; // Higher confidence for simpler issues

    return {
      messages: [new AIMessage(`Technical analysis complete. Complexity: ${complexity.toFixed(2)}. Confidence: ${confidence.toFixed(2)}`)],
      next: confidence > 0.8 ? '__end__' : 'frontline-agent',
      metadata: {
        ...state.metadata,
        technicalAnalysis: true,
        complexity,
        confidence,
        technicalSolutions,
        toolWeight: confidence, // ← ToolNodeService uses this for weighted merging!
      },
    };
  }

  private async findTechnicalSolutions(state: AgentState) {
    // Use ChromaDB for semantic search in technical knowledge base
    const query = state.messages[0]?.content.toString() || '';

    const results = await this.chromaService.similaritySearch('technical_solutions', query, {
      limit: 3,
      includeMetadata: true,
      includeDocuments: true,
    });

    return results;
  }

  private async analyzeComplexity(state: AgentState): Promise<number> {
    const messageLength = state.messages[0]?.content.toString().length || 0;
    return Math.min(messageLength / 1000, 1);
  }
}

/**
 * AI Analysis Agent - Sophisticated AI-powered analysis with weighted results
 */
@Agent({
  id: 'ai-analyzer',
  name: 'AI Solution Analyzer',
  description: 'Uses AI to analyze and propose solutions',
  capabilities: ['ai_analysis', 'solution_generation', 'pattern_recognition'],
  priority: 'high',
  tools: ['llm-analysis', 'pattern-matcher', 'solution-generator'],
})
@Injectable()
export class AIAnalyzerAgent {
  constructor(private readonly llmProvider: LlmProviderService, private readonly chromaService: ChromaDBService) {}

  /**
   * AI-powered analysis with confident weighting for ToolNodeService
   */
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    // AI analysis using LLM provider (weight: 0.7 - sophisticated analysis)
    const analysis = await this.performAIAnalysis(state);

    return {
      messages: [new AIMessage(`AI analysis suggests: ${analysis.recommendation}`)],
      metadata: {
        ...state.metadata,
        aiAnalysis: analysis,
        toolWeight: 0.7, // ← ToolNodeService uses this for intelligent merging
        analysisCompleted: true,
        confidence: analysis.confidence,
      },
    };
  }

  private async performAIAnalysis(state: AgentState) {
    const llm = await this.llmProvider.getLLM();

    const prompt = `Analyze this customer support ticket and provide recommendations:
${state.messages[0]?.content.toString()}`;

    const response = await llm.invoke([{ role: 'user', content: prompt }]);

    return {
      recommendation: response.content.toString(),
      confidence: 0.85,
      reasoning: 'Based on AI analysis of ticket content and patterns',
    };
  }
}

/**
 * Historical Pattern Matcher - Proven solutions with highest confidence
 */
@Agent({
  id: 'historical-matcher',
  name: 'Historical Pattern Matcher',
  description: 'Matches against historical successful resolutions',
  capabilities: ['pattern_matching', 'historical_analysis', 'success_prediction'],
  priority: 'high',
  tools: ['historical-search', 'pattern-analysis', 'success-predictor'],
})
@Injectable()
export class HistoricalMatcherAgent {
  constructor(private readonly chromaService: ChromaDBService, private readonly neo4jService: Neo4jService) {}

  /**
   * Historical pattern matching with highest confidence weighting
   */
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    // Historical pattern matching (weight: 0.8 - proven solutions)
    const matches = await this.findHistoricalMatches(state);

    return {
      messages: [new AIMessage(`Found ${matches.length} similar historical cases with proven solutions`)],
      metadata: {
        ...state.metadata,
        historicalMatches: matches,
        toolWeight: 0.8, // ← Highest confidence - ToolNodeService prioritizes proven solutions
        matchingCompleted: true,
        provenSolutions: matches.filter((m) => m.success),
      },
    };
  }

  private async findHistoricalMatches(state: AgentState) {
    // Combine ChromaDB vector search with Neo4j graph relationships
    const query = state.messages[0]?.content.toString() || '';

    // Vector search for similar tickets
    const vectorMatches = await this.chromaService.similaritySearch('resolved_tickets', query, { limit: 5, includeMetadata: true });

    // Neo4j query for relationship-based patterns
    const graphQuery = `
      MATCH (t:Ticket)-[:SIMILAR_TO]->(resolved:Ticket {status: 'resolved'})
      WHERE t.description CONTAINS $keyword
      RETURN resolved.id as id, resolved.resolution as resolution, resolved.satisfactionScore as score
      LIMIT 3
    `;

    const graphMatches = await this.neo4jService.run(graphQuery, {
      keyword: query.split(' ')[0],
    });

    return [
      { caseId: 'CS-2024-001', similarity: 0.9, resolution: 'Successful', success: true },
      { caseId: 'CS-2024-055', similarity: 0.75, resolution: 'Successful', success: true },
    ];
  }
}

/**
 * Enhanced Customer Support Coordinator - Uses properly decorated agents
 */
@Injectable()
export class EnhancedCustomerSupportCoordinator {
  private readonly logger = new Logger(EnhancedCustomerSupportCoordinator.name);

  constructor(
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService,
    // Inject the properly decorated agents
    private readonly executiveAgent: SupportExecutiveAgent,
    private readonly specialistAgent: TechnicalSpecialistAgent,
    private readonly aiAnalyzer: AIAnalyzerAgent,
    private readonly historicalMatcher: HistoricalMatcherAgent
  ) {}

  /**
   * Hierarchical coordination with properly registered agents
   * Uses enhanced GraphBuilderService internally through agent registration
   */
  async processCustomerTicket(request: TicketRequest): Promise<MultiAgentResult> {
    this.logger.log(`🏢 Processing hierarchical support for: ${request.title}`);

    // ✅ CORRECT APPROACH: Use properly decorated and registered agents
    const networkId = await this.multiAgentCoordinator.setupNetwork(
      'customer-support-hierarchy',
      [
        // Agents are automatically discovered through @Agent decorator
        // No need to create nodeFunction manually - the library handles it
        {
          id: 'support-executive',
          type: this.executiveAgent.constructor.name, // Reference the decorated agent class
        },
        {
          id: 'technical-specialist',
          type: this.specialistAgent.constructor.name,
        },
        {
          id: 'ai-analyzer',
          type: this.aiAnalyzer.constructor.name,
        },
        {
          id: 'historical-matcher',
          type: this.historicalMatcher.constructor.name,
        },
      ],
      'hierarchical', // Uses enhanced GraphBuilderService internally!
      {
        levels: [
          ['support-executive'], // Level 0: Executive
          ['technical-specialist'], // Level 1: Specialist
          ['ai-analyzer', 'historical-matcher'], // Level 2: Analysis tools
        ],
        escalationRules: [
          {
            condition: (state) => state.metadata?.priority === 'critical',
            targetLevel: 0, // Escalate to executive
            message: 'Critical priority - executive attention required',
          },
          {
            condition: (state) => state.metadata?.complexity === 'high',
            targetLevel: 1, // Escalate to specialist
            message: 'Technical complexity requires specialist expertise',
          },
        ],
      }
    );

    // Execute the hierarchical workflow - GraphBuilderService handles the rest
    return await this.multiAgentCoordinator.executeSimpleWorkflow(networkId, this.createInitialMessage(request));
  }

  /**
   * Weighted tool coordination using properly decorated agents
   * ToolNodeService automatically handles weighted merging based on toolWeight metadata
   */
  async processWithWeightedTools(request: TicketRequest): Promise<MultiAgentResult> {
    this.logger.log(`⚖️ Processing with weighted tools for: ${request.title}`);

    // ✅ CORRECT APPROACH: Use decorated agents that return weighted metadata
    const networkId = await this.multiAgentCoordinator.setupNetwork(
      'weighted-support-tools',
      [
        {
          id: 'ai-analyzer',
          type: this.aiAnalyzer.constructor.name, // toolWeight: 0.7 set in agent
        },
        {
          id: 'historical-matcher',
          type: this.historicalMatcher.constructor.name, // toolWeight: 0.8 set in agent
        },
      ],
      'supervisor',
      {
        systemPrompt: `Coordinate multiple analysis tools with different confidence levels.
        
Agent weights are automatically handled:
- AI Analyzer: 0.7 (sophisticated analysis)
- Historical Matcher: 0.8 (proven solutions)
        
Route to the most appropriate tool based on problem complexity.`,
        workers: ['ai-analyzer', 'historical-matcher'],
        enableForwardMessage: true,
      }
    );

    // ToolNodeService automatically merges results based on toolWeight metadata
    return await this.multiAgentCoordinator.executeSimpleWorkflow(networkId, this.createInitialMessage(request));
  }

  /**
   * Adaptive strategy coordination demonstration
   * Uses enhanced NodeFactoryService for dynamic pattern selection
   */
  async processWithAdaptiveStrategy(request: TicketRequest): Promise<MultiAgentResult> {
    this.logger.log(`🔄 Processing with adaptive strategy for: ${request.title}`);

    // Determine strategy based on ticket characteristics
    const strategy = this.determineOptimalStrategy(request);

    const networkId = await this.multiAgentCoordinator.setupNetwork(
      `adaptive-support-${strategy}`,
      [
        {
          id: 'rapid-responder',
          name: 'Rapid Response Agent',
          description: 'Provides quick initial responses and basic solutions',
          nodeFunction: this.createRapidResponseAgent(),
          capabilities: ['quick_response', 'basic_solutions'],
        },
        {
          id: 'deep-analyzer',
          name: 'Deep Analysis Agent',
          description: 'Performs thorough analysis for complex issues',
          nodeFunction: this.createDeepAnalysisAgent(),
          capabilities: ['deep_analysis', 'complex_solutions'],
        },
        {
          id: 'quality-controller',
          name: 'Quality Control Agent',
          description: 'Reviews and validates proposed solutions',
          nodeFunction: this.createQualityControlAgent(),
          capabilities: ['quality_control', 'solution_validation'],
        },
      ],
      strategy === 'urgent' ? 'swarm' : 'supervisor', // Dynamic pattern selection
      strategy === 'urgent'
        ? {
            enableDynamicHandoffs: true,
            messageHistory: { removeHandoffMessages: true },
          }
        : {
            systemPrompt: 'Coordinate thorough analysis with quality validation',
            workers: ['deep-analyzer', 'quality-controller'],
          }
    );

    return await this.multiAgentCoordinator.executeSimpleWorkflow(networkId, this.createInitialMessage(request, { strategy, adaptiveMode: true }));
  }

  // Agent Creation Methods - Demonstrate weighted metadata usage

  private createExecutiveAgent() {
    return async (state: AgentState) => {
      const priority = this.assessPriority(state);
      const escalationNeeded = priority === 'critical' || state.metadata?.customerTier === 'enterprise';

      return {
        messages: [new AIMessage(`Executive review completed. Priority: ${priority}. ${escalationNeeded ? 'Assigning to specialist team.' : 'Routing to standard process.'}`)],
        next: escalationNeeded ? 'technical-specialist' : 'frontline-agent',
        metadata: {
          ...state.metadata,
          executiveReview: true,
          priority,
          escalationReason: escalationNeeded ? 'High priority customer' : null,
          // Enhanced: No manual weight needed - GraphBuilderService handles routing
        },
      };
    };
  }

  private createTechnicalSpecialistAgent() {
    return async (state: AgentState) => {
      const complexity = this.analyzeComplexity(state);
      const confidence = complexity < 0.7 ? 0.9 : 0.6;

      return {
        messages: [new AIMessage(`Technical analysis complete. Complexity: ${complexity.toFixed(2)}. Confidence: ${confidence.toFixed(2)}`)],
        next: confidence > 0.8 ? '__end__' : 'frontline-agent',
        metadata: {
          ...state.metadata,
          technicalAnalysis: true,
          complexity,
          confidence,
          toolWeight: confidence, // ← ToolNodeService uses this for weighted merging!
        },
      };
    };
  }

  private createKnowledgeSearchAgent() {
    return async (state: AgentState) => {
      // Knowledge base search (weight: 0.5 - basic lookup)
      const results = await this.searchKnowledgeBase(state);

      return {
        messages: [new AIMessage(`Found ${results.length} knowledge base matches`)],
        metadata: {
          ...state.metadata,
          knowledgeResults: results,
          toolWeight: 0.5, // ← Lower confidence - ToolNodeService handles appropriately
          searchPerformed: true,
        },
      };
    };
  }

  private createAIAnalyzerAgent() {
    return async (state: AgentState) => {
      // AI-powered analysis (weight: 0.7 - sophisticated analysis)
      const analysis = await this.performAIAnalysis(state);

      return {
        messages: [new AIMessage(`AI analysis suggests: ${analysis.recommendation}`)],
        metadata: {
          ...state.metadata,
          aiAnalysis: analysis,
          toolWeight: 0.7, // ← Higher confidence - ToolNodeService weights accordingly
          analysisCompleted: true,
        },
      };
    };
  }

  private createHistoricalMatcherAgent() {
    return async (state: AgentState) => {
      // Historical pattern matching (weight: 0.8 - proven solutions)
      const matches = await this.findHistoricalMatches(state);

      return {
        messages: [new AIMessage(`Found ${matches.length} similar historical cases`)],
        metadata: {
          ...state.metadata,
          historicalMatches: matches,
          toolWeight: 0.8, // ← Highest confidence - ToolNodeService prioritizes this
          matchingCompleted: true,
        },
      };
    };
  }

  // Helper methods

  private determineOptimalStrategy(request: TicketRequest): 'urgent' | 'thorough' {
    return request.priority === 'critical' || request.customerTier === 'enterprise' ? 'urgent' : 'thorough';
  }

  private createInitialMessage(request: TicketRequest, additionalContext?: any): string {
    return `Customer Support Request:
Title: ${request.title}
Description: ${request.description}
Priority: ${request.priority || 'medium'}
Customer Tier: ${request.customerTier || 'standard'}
${additionalContext ? `Context: ${JSON.stringify(additionalContext)}` : ''}`;
  }

  // Mock helper methods (replace with real implementations)
  private assessPriority(state: AgentState): 'low' | 'medium' | 'high' | 'critical' {
    return state.metadata?.customerTier === 'enterprise' ? 'critical' : 'medium';
  }

  private analyzeComplexity(state: AgentState): number {
    const messageLength = state.messages[0]?.content.toString().length || 0;
    return Math.min(messageLength / 1000, 1);
  }

  private async searchKnowledgeBase(state: AgentState) {
    return [
      { id: 'kb1', title: 'Similar Issue Resolution', relevance: 0.8 },
      { id: 'kb2', title: 'Related Documentation', relevance: 0.6 },
    ];
  }

  private async performAIAnalysis(state: AgentState) {
    return {
      recommendation: 'Apply solution pattern #3',
      confidence: 0.85,
      reasoning: 'Based on symptom analysis',
    };
  }

  private async findHistoricalMatches(state: AgentState) {
    return [
      { caseId: 'CS-2024-001', similarity: 0.9, resolution: 'Successful' },
      { caseId: 'CS-2024-055', similarity: 0.75, resolution: 'Successful' },
    ];
  }
}
```

### 2. Workflow-Enhanced Controller

```typescript
import { Controller, Post, Get, Delete, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnhancedSupportService } from '../services/enhanced-support.service';

@ApiTags('Workflow-Enhanced Multi-Agent System')
@Controller('workflow-support')
export class WorkflowSupportController {
  private readonly logger = new Logger(WorkflowSupportController.name);

  constructor(private readonly enhancedSupportService: EnhancedSupportService) {}

  /**
   * Execute complete workflow for ticket processing
   */
  @Post('process-ticket')
  @ApiOperation({
    summary: 'Process support ticket using complete workflow system',
    description: `Executes enhanced support workflow that combines:
    - Workflow orchestration with @Workflow decorator
    - Hierarchical agent coordination (GraphBuilderService)
    - Weighted tool analysis (ToolNodeService)
    - Real-time streaming support
    - Complete error handling and retry logic`,
  })
  async processTicketWithWorkflow(@Body() request: TicketRequest) {
    this.logger.log(`🔄 Processing ticket ${request.id} with complete workflow system`);

    const startTime = Date.now();
    const result = await this.enhancedSupportService.processSupportTicket(request);
    const totalTime = Date.now() - startTime;

    return {
      success: result.success,
      ticketId: request.id,
      workflowResult: result.data,
      execution: {
        workflowId: result.metadata?.workflowId,
        instanceId: result.metadata?.instanceId,
        agentsUsed: result.metadata?.agentsUsed,
        totalSteps: result.metadata?.totalSteps,
        duration: result.metadata?.duration,
        totalProcessingTime: totalTime,
      },
      capabilities: {
        workflowOrchestration: 'Complete @Workflow decorator system with lifecycle management',
        hierarchicalCoordination: 'Enhanced GraphBuilderService with intelligent escalation',
        weightedToolMerging: 'Enhanced ToolNodeService with confidence-based result merging',
        streamingSupport: 'Real-time progress updates and streaming execution',
        errorHandling: 'Comprehensive retry logic and failure recovery',
      },
    };
  }

  /**
   * Process ticket with streaming updates
   */
  @Post('process-ticket/streaming')
  @ApiOperation({
    summary: 'Process ticket with real-time streaming updates',
    description: 'Demonstrates workflow execution with streaming progress updates',
  })
  async processTicketWithStreaming(@Body() request: TicketRequest) {
    this.logger.log(`📡 Processing ticket ${request.id} with streaming workflow`);

    const progressUpdates: any[] = [];

    const result = await this.enhancedSupportService.processSupportTicket(request, (event) => {
      // Capture streaming events
      progressUpdates.push({
        timestamp: Date.now(),
        type: event.type,
        data: event.data,
      });

      // In real application, emit via WebSocket or SSE
      this.logger.log(`Stream update: ${event.type}`, event.data);
    });

    return {
      success: result.success,
      workflowResult: result.data,
      streamingUpdates: progressUpdates,
      features: {
        realTimeUpdates: `Captured ${progressUpdates.length} streaming events`,
        workflowProgress: 'Step-by-step execution visibility',
        agentCoordination: 'Live agent handoff and state updates',
      },
    };
  }

  /**
   * Get workflow execution status
   */
  @Get('workflow-status/:ticketId')
  @ApiOperation({
    summary: 'Get workflow execution status and history',
    description: 'Demonstrates workflow instance management and monitoring',
  })
  async getWorkflowStatus(@Param('ticketId') ticketId: string) {
    const status = await this.enhancedSupportService.getWorkflowStatus(ticketId);

    return {
      ticketId,
      workflowStatus: status,
      capabilities: {
        instanceTracking: 'Real-time workflow instance monitoring',
        historyManagement: 'Complete execution history with metadata',
        progressCalculation: 'Intelligent progress estimation',
      },
    };
  }

  /**
   * Cancel running workflow
   */
  @Delete('workflow/:instanceId')
  @ApiOperation({
    summary: 'Cancel running workflow execution',
    description: 'Demonstrates workflow cancellation and cleanup',
  })
  async cancelWorkflow(@Param('instanceId') instanceId: string) {
    const cancelled = await this.enhancedSupportService.cancelWorkflow(instanceId);

    return {
      instanceId,
      cancelled,
      features: {
        gracefulCancellation: 'Safe workflow termination with cleanup',
        stateManagement: 'Proper instance state transitions',
        resourceCleanup: 'Automatic resource deallocation',
      },
    };
  }

  /**
   * Get comprehensive system capabilities overview
   */
  @Get('system-overview')
  @ApiOperation({
    summary: 'Get complete system capabilities overview',
    description: 'Shows all enhanced features working together',
  })
  getSystemOverview() {
    return {
      workflowSystem: {
        description: 'Complete workflow orchestration system',
        features: ['@Workflow decorator for declarative workflow creation', 'WorkflowManagerService for execution and lifecycle management', 'Streaming execution with real-time progress updates', 'Retry logic and comprehensive error handling', 'Instance management and execution history', 'Integration with hierarchical and weighted agent coordination'],
        endpoints: ['/workflow-support/process-ticket - Execute complete workflow', '/workflow-support/process-ticket/streaming - Streaming execution', '/workflow-support/workflow-status/:ticketId - Status monitoring', '/workflow-support/workflow/:instanceId - Workflow cancellation'],
      },
      agentCoordination: {
        hierarchicalSupport: 'Enhanced GraphBuilderService with multi-level escalation',
        weightedToolMerging: 'Enhanced ToolNodeService with confidence-based merging',
        adaptiveStrategies: 'Dynamic coordination pattern selection',
      },
      integration: {
        streamingSupport: 'Real-time updates throughout workflow execution',
        errorHandling: 'Comprehensive failure recovery and retry mechanisms',
        monitoring: 'Complete observability and health checking',
        scalability: 'Enterprise-ready performance and resource management',
      },
    };
  }
}
```

### 3. Enhanced Coordination Controller

```typescript
import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnhancedCustomerSupportCoordinator } from '../coordinators/enhanced-customer-support.coordinator';

/**
 * Controller demonstrating all enhanced capabilities
 * Shows how demo applications can maximize benefit from internal services
 */
@ApiTags('Enhanced Multi-Agent Coordination')
@Controller('enhanced-coordination')
export class EnhancedCoordinationController {
  private readonly logger = new Logger(EnhancedCoordinationController.name);

  constructor(private readonly enhancedCoordinator: EnhancedCustomerSupportCoordinator) {}

  /**
   * Demonstrate hierarchical multi-agent coordination
   * Showcases: Enhanced GraphBuilderService capabilities
   */
  @Post('hierarchical-support')
  @ApiOperation({
    summary: 'Process ticket with hierarchical multi-agent coordination',
    description: `Demonstrates true multi-level hierarchical coordination with:
    - Executive level strategic decisions
    - Specialist level technical expertise  
    - Operational level direct customer interaction
    - Intelligent escalation based on rules
    - Leverages enhanced GraphBuilderService internally`,
  })
  async processHierarchicalSupport(@Body() request: TicketRequest) {
    this.logger.log(`🏢 Processing hierarchical support for: ${request.title}`);

    const startTime = Date.now();
    const result = await this.enhancedCoordinator.processCustomerTicket(request);
    const processingTime = Date.now() - startTime;

    return {
      success: result.success,
      executionPath: result.executionPath,
      finalState: result.finalState,
      metadata: {
        hierarchicalLevels: 3, // Executive → Specialist → Operational
        escalations: this.countEscalations(result),
        totalAgents: result.executionPath.length,
        processingTime,
        demonstratesCapability: 'True multi-level hierarchical coordination with intelligent escalation',
      },
    };
  }

  /**
   * Demonstrate weighted tool coordination
   * Showcases: Enhanced ToolNodeService capabilities
   */
  @Post('weighted-tools')
  @ApiOperation({
    summary: 'Process ticket with weighted tool coordination',
    description: `Demonstrates sophisticated weighted tool coordination with:
    - AI Analyzer (weight: 0.7) - sophisticated analysis
    - Historical Matcher (weight: 0.8) - proven solutions  
    - Knowledge Searcher (weight: 0.5) - basic lookup
    - Results merged using weighted averages and confidence-based selection
    - Leverages enhanced ToolNodeService internally`,
  })
  async processWithWeightedTools(@Body() request: TicketRequest) {
    this.logger.log(`⚖️ Processing with weighted tools for: ${request.title}`);

    const result = await this.enhancedCoordinator.processWithWeightedTools(request);

    // Extract tool results from final state - ToolNodeService merged them intelligently
    const toolResults = {
      aiAnalysis: result.finalState.metadata?.aiAnalysis,
      historicalMatches: result.finalState.metadata?.historicalMatches,
      knowledgeResults: result.finalState.metadata?.knowledgeResults,
    };

    // Calculate weighted confidence based on internal merging
    const confidenceScore = this.calculateWeightedConfidence(result.finalState);

    return {
      success: result.success,
      toolResults,
      weightedDecision: {
        recommendation: this.deriveWeightedRecommendation(toolResults),
        reasoning: 'Based on weighted analysis of all tool contributions',
        primarySource: this.identifyPrimarySource(toolResults),
      },
      confidenceScore,
      metadata: {
        toolsUsed: Object.keys(toolResults).filter((k) => toolResults[k]).length,
        weightingStrategy: 'Confidence-based weighted merging with numeric averaging',
        demonstratesCapability: 'Sophisticated weighted tool coordination with intelligent result merging',
      },
    };
  }

  /**
   * Demonstrate adaptive coordination strategy selection
   * Showcases: Enhanced NodeFactoryService capabilities
   */
  @Post('adaptive-strategy')
  @ApiOperation({
    summary: 'Process ticket with adaptive coordination strategy',
    description: `Demonstrates adaptive coordination with dynamic strategy selection:
    - Analyzes ticket characteristics in real-time
    - Chooses optimal coordination pattern (swarm vs supervisor)
    - Adjusts agent priorities based on urgency
    - Uses different tool weights based on context
    - Showcases both GraphBuilderService and ToolNodeService working together`,
  })
  async processWithAdaptiveStrategy(@Body() request: TicketRequest) {
    this.logger.log(`🔄 Processing with adaptive strategy for: ${request.title}`);

    const startTime = Date.now();
    const result = await this.enhancedCoordinator.processWithAdaptiveStrategy(request);
    const responseTime = Date.now() - startTime;

    const strategyUsed = this.determineStrategyFromResult(result);
    const ticketCharacteristics = this.analyzeTicketCharacteristics(request);

    return {
      success: result.success,
      strategyUsed,
      adaptationReasoning: this.explainStrategyChoice(request, strategyUsed),
      executionMetrics: {
        responseTime,
        thoroughnessScore: this.calculateThoroughnessScore(result),
        adaptationAccuracy: this.calculateAdaptationAccuracy(request, strategyUsed),
      },
      metadata: {
        ticketCharacteristics,
        strategySelectionFactors: this.getStrategyFactors(request),
        demonstratesCapability: 'Dynamic strategy selection with real-time adaptation based on context analysis',
      },
    };
  }

  /**
   * Get comprehensive demonstration overview
   * Shows: All enhanced capabilities in a single overview
   */
  @Get('capabilities-overview')
  @ApiOperation({
    summary: 'Get overview of enhanced multi-agent capabilities',
    description: 'Provides comprehensive overview of all enhanced coordination capabilities',
  })
  getCapabilitiesOverview() {
    return {
      enhancedCapabilities: {
        hierarchicalCoordination: {
          description: 'True multi-level hierarchical coordination with intelligent escalation',
          levels: ['Executive', 'Specialist', 'Operational'],
          features: ['Intelligent escalation rules', 'Level-specific prompt engineering', 'Cross-level state management', 'Dynamic level routing'],
          internalService: 'GraphBuilderService - Enhanced buildHierarchicalGraph()',
          endpoint: '/enhanced-coordination/hierarchical-support',
        },
        weightedToolMerging: {
          description: 'Sophisticated tool result merging based on confidence and importance',
          mergingStrategies: ['Weighted averages for numeric values', 'Confidence-based selection for strings', 'Priority-based array merging', 'Recursive object merging'],
          features: ['Tool confidence tracking', 'Dynamic weight adjustment', 'Multi-type value handling', 'Cumulative weight accumulation'],
          internalService: 'ToolNodeService - Enhanced applyWeightedMerge()',
          endpoint: '/enhanced-coordination/weighted-tools',
        },
        adaptiveStrategySelection: {
          description: 'Dynamic coordination pattern selection based on real-time analysis',
          strategies: ['Urgent Swarm', 'Thorough Supervisor'],
          adaptationFactors: ['Ticket priority level', 'Customer tier status', 'Complexity assessment', 'Historical success patterns'],
          features: ['Real-time context analysis', 'Strategy performance tracking', 'Automatic pattern switching', 'Feedback-driven optimization'],
          internalServices: 'Both GraphBuilderService and ToolNodeService',
          endpoint: '/enhanced-coordination/adaptive-strategy',
        },
        internalInfrastructure: {
          description: 'Powerful internal services driving sophisticated coordination',
          services: {
            GraphBuilderService: {
              status: 'Internal-only (not exported)',
              enhancements: ['True multi-level hierarchical graphs', 'Dynamic escalation routing', 'Level-specific coordination logic'],
            },
            ToolNodeService: {
              status: 'Internal-only (not exported)',
              enhancements: ['Sophisticated weighted merging algorithms', 'Multi-type value handling', 'Confidence-based selection logic'],
            },
            NodeFactoryService: {
              status: 'Internal integration',
              newMethods: ['createToolEnhancedAgentNode()', 'createAdaptiveCoordinatorNode()', 'Advanced coordination patterns'],
            },
          },
        },
      },
      demoEndpoints: [
        {
          method: 'POST',
          path: '/enhanced-coordination/hierarchical-support',
          description: 'Hierarchical multi-agent coordination demo',
          showcases: 'GraphBuilderService enhancements',
        },
        {
          method: 'POST',
          path: '/enhanced-coordination/weighted-tools',
          description: 'Weighted tool coordination demo',
          showcases: 'ToolNodeService enhancements',
        },
        {
          method: 'POST',
          path: '/enhanced-coordination/adaptive-strategy',
          description: 'Adaptive strategy selection demo',
          showcases: 'Both services working together',
        },
        {
          method: 'GET',
          path: '/enhanced-coordination/capabilities-overview',
          description: 'Complete capabilities overview',
          showcases: 'All enhanced capabilities',
        },
      ],
      usage: {
        libraryPattern: 'Consumers use MultiAgentCoordinatorService facade',
        internalInnovation: 'Sophisticated infrastructure services work behind the scenes',
        publicAPI: 'Clean, simple interfaces hide complex coordination logic',
        valueProposition: 'Enterprise-grade multi-agent capabilities through simple API calls',
      },
    };
  }

  // Helper methods for demonstration

  private countEscalations(result: any): number {
    return result.executionPath.filter((step) => step.includes('executive') || step.includes('specialist')).length;
  }

  private calculateWeightedConfidence(finalState: any): number {
    const weights = finalState.metadata?.__weights || {};
    const values = Object.values(weights) as number[];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0.7;
  }

  private deriveWeightedRecommendation(toolResults: any): string {
    const tools = Object.keys(toolResults).filter((k) => toolResults[k]);
    return `Recommendation based on ${tools.length} weighted tool analyses`;
  }

  private identifyPrimarySource(toolResults: any): string {
    if (toolResults.historicalMatches) return 'Historical Pattern Matching (highest weight: 0.8)';
    if (toolResults.aiAnalysis) return 'AI Analysis (weight: 0.7)';
    if (toolResults.knowledgeResults) return 'Knowledge Base Search (weight: 0.5)';
    return 'No primary source identified';
  }
}
```

## 🎯 Key Implementation Patterns

### 1. **Leverage Internal Services Through Public API**

```typescript
// ✅ GOOD: Use clean public interface
const result = await coordinator.setupNetwork(
  networkId,
  agents,
  'hierarchical', // GraphBuilderService handles complexity internally
  config
);

// ❌ BAD: Try to access internal services directly (not possible)
// const graphBuilder = new GraphBuilderService(); // Not exported!
```

### 2. **Optimize Agent Metadata for Weighted Coordination**

```typescript
// ✅ GOOD: Provide meaningful weights for ToolNodeService
return {
  messages: [new AIMessage(response)],
  metadata: {
    ...state.metadata,
    analysis: result,
    toolWeight: 0.8, // ToolNodeService uses this for intelligent merging
    confidence: 0.92, // Additional context for decision making
    dataQuality: 'high', // Qualitative confidence indicators
  },
};

// ❌ BAD: No weight information loses optimization benefits
return {
  messages: [new AIMessage(response)],
  metadata: { analysis: result }, // Missing weight optimization
};
```

### 3. **Design Effective Hierarchical Escalation**

```typescript
// ✅ GOOD: Clear escalation rules with meaningful conditions
escalationRules: [
  {
    condition: (state) => state.metadata?.customerTier === 'enterprise',
    targetLevel: 0, // Executive handles enterprise customers
    message: 'Enterprise customer - executive attention required',
  },
  {
    condition: (state) => state.metadata?.technicalComplexity > 0.8,
    targetLevel: 1, // Specialist handles complex technical issues
    message: 'High technical complexity - specialist expertise needed',
  },
];

// ❌ BAD: Vague or always-true conditions
escalationRules: [
  {
    condition: (state) => true, // Always escalates - defeats the purpose
    targetLevel: 0,
    message: 'Escalated', // No useful context
  },
];
```

## 🔧 Integration with @Tool and Streaming Decorators

### Complete Integration Pattern

The enhanced capabilities work seamlessly with all library decorators:

```typescript
import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { Tool } from '@hive-academy/langgraph-multi-agent';
import { StreamToken, StreamProgress, StreamEvent } from '@hive-academy/langgraph-streaming';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';

/**
 * Complete agent with all decorator integrations
 * Shows how enhanced capabilities work with tools and streaming
 */
@Agent({
  id: 'advanced-support-agent',
  name: 'Advanced Support Agent',
  description: 'Comprehensive support with tools and streaming',
  capabilities: ['analysis', 'escalation', 'tool_usage'],
  tools: ['knowledge-search', 'ticket-classifier', 'escalation-router'], // ← References @Tool decorated methods
  priority: 'high',
})
@Injectable()
export class AdvancedSupportAgent {
  constructor(private readonly chromaService: ChromaDBService, private readonly llmProvider: LlmProviderService) {}

  /**
   * Main agent function with streaming and tool integration
   */
  @StreamToken({ enabled: true, format: 'structured' })
  @StreamProgress({ enabled: true, includeETA: true })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Step 1: Use knowledge search tool with streaming
      const knowledgeResults = await this.knowledgeSearchTool(state.messages[0]?.content.toString() || '');

      // Step 2: Classify ticket with streaming progress
      const classification = await this.ticketClassifierTool(state);

      // Step 3: Check if escalation needed
      const escalationDecision = await this.escalationRouterTool(state, classification);

      return {
        messages: [new AIMessage(`Analysis complete. Classification: ${classification.category}`)],
        metadata: {
          ...state.metadata,
          knowledgeResults,
          classification,
          escalationDecision,
          toolWeight: classification.confidence, // ← ToolNodeService uses this for merging
          requiresApproval: escalationDecision.needsApproval,
        },
      };
    } catch (error) {
      return {
        metadata: { ...state.metadata, error: error.message },
      };
    }
  }

  /**
   * Knowledge search tool with ChromaDB integration
   */
  @Tool({
    name: 'knowledge-search',
    description: 'Search knowledge base for relevant solutions',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Optional category filter' },
      },
      required: ['query'],
    },
  })
  @StreamToken({ enabled: true, format: 'structured' })
  async knowledgeSearchTool(query: string, category?: string): Promise<any[]> {
    // Tool automatically gets weighted metadata handling from ToolNodeService
    const results = await this.chromaService.similaritySearch('knowledge_base', query, {
      limit: 5,
      filter: category ? { category } : undefined,
      includeMetadata: true,
      includeDocuments: true,
    });

    // Return results with confidence for ToolNodeService weighting
    return {
      results: results.documents || [],
      confidence: 0.6, // Tool confidence level
      source: 'knowledge_base',
      toolWeight: 0.6, // ← ToolNodeService uses this for intelligent merging
    };
  }

  /**
   * Ticket classification tool with AI analysis
   */
  @Tool({
    name: 'ticket-classifier',
    description: 'Classify support tickets using AI analysis',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Ticket content to classify' },
      },
      required: ['content'],
    },
  })
  @StreamEvent({ events: ['classification_start', 'classification_complete'] })
  async ticketClassifierTool(state: AgentState): Promise<any> {
    const content = state.messages[0]?.content.toString() || '';

    // Use LLM for classification
    const llm = await this.llmProvider.getLLM();
    const prompt = `Classify this support ticket: ${content}`;

    const response = await llm.invoke([{ role: 'user', content: prompt }]);

    return {
      category: 'technical', // Extracted from LLM response
      priority: 'high',
      complexity: 'moderate',
      confidence: 0.85,
      toolWeight: 0.85, // ← High confidence classification
    };
  }

  /**
   * Escalation routing tool with approval requirements
   */
  @Tool({
    name: 'escalation-router',
    description: 'Determine if ticket needs escalation',
    schema: {
      type: 'object',
      properties: {
        classification: { type: 'object', description: 'Ticket classification' },
        customerTier: { type: 'string', description: 'Customer tier level' },
      },
      required: ['classification'],
    },
  })
  @RequiresApproval({ timeoutMs: 300000 }) // 5 minutes for approval
  async escalationRouterTool(state: AgentState, classification: any): Promise<any> {
    const needsEscalation = classification.priority === 'critical' || state.metadata?.customerTier === 'enterprise';

    return {
      needsEscalation,
      escalationLevel: needsEscalation ? 'executive' : 'none',
      needsApproval: needsEscalation,
      reasoning: needsEscalation ? 'High priority or enterprise customer' : 'Standard handling',
      toolWeight: 0.9, // ← High confidence routing decision
    };
  }
}

/**
 * Streaming-focused agent showing real-time progress
 */
@Agent({
  id: 'streaming-analyst',
  name: 'Real-time Streaming Analyst',
  description: 'Provides real-time analysis with streaming feedback',
  capabilities: ['real_time_analysis', 'progress_tracking'],
  tools: ['stream-analyzer'],
})
@Injectable()
export class StreamingAnalystAgent {
  constructor(private readonly llmProvider: LlmProviderService, private readonly chromaService: ChromaDBService) {}

  /**
   * Streaming analysis with progress updates
   */
  @StreamToken({ enabled: true, format: 'structured', batchSize: 5 })
  @StreamProgress({ enabled: true, includeETA: true, updateInterval: 1000 })
  @StreamEvent({ events: ['analysis_start', 'progress_update', 'analysis_complete'] })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    const query = state.messages[0]?.content.toString() || '';

    // Step 1: Start analysis with event
    // StreamEvent decorator automatically emits 'analysis_start'

    // Step 2: Multi-step analysis with progress tracking
    let progress = 0;

    // Semantic search (25% progress)
    progress = 25;
    const semanticResults = await this.streamAnalyzerTool(query, 'semantic');

    // Pattern analysis (50% progress)
    progress = 50;
    const patternResults = await this.streamAnalyzerTool(query, 'pattern');

    // Final synthesis (100% progress)
    progress = 100;
    const synthesis = await this.synthesizeResults(semanticResults, patternResults);

    return {
      messages: [new AIMessage(`Analysis complete: ${synthesis.summary}`)],
      metadata: {
        ...state.metadata,
        analysis: synthesis,
        toolWeight: synthesis.confidence, // ← ToolNodeService merging
        streamingComplete: true,
      },
    };
  }

  /**
   * Streaming analysis tool with token-level streaming
   */
  @Tool({
    name: 'stream-analyzer',
    description: 'Perform streaming analysis with real-time feedback',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        analysisType: { type: 'string', enum: ['semantic', 'pattern', 'sentiment'] },
      },
    },
  })
  @StreamToken({ enabled: true, format: 'structured', batchSize: 3 })
  async streamAnalyzerTool(query: string, analysisType: string): Promise<any> {
    if (analysisType === 'semantic') {
      // Vector search with streaming results
      return await this.chromaService.similaritySearch('analysis_data', query, { limit: 10, includeMetadata: true });
    } else if (analysisType === 'pattern') {
      // Pattern matching analysis
      const llm = await this.llmProvider.getLLM();
      const response = await llm.invoke([{ role: 'user', content: `Analyze patterns in: ${query}` }]);

      return {
        patterns: response.content,
        confidence: 0.8,
        toolWeight: 0.8,
      };
    }

    return { results: [], confidence: 0.5, toolWeight: 0.5 };
  }

  private async synthesizeResults(semantic: any, pattern: any) {
    return {
      summary: 'Combined semantic and pattern analysis',
      confidence: Math.max(semantic.confidence || 0, pattern.confidence || 0),
      details: { semantic, pattern },
    };
  }
}
```

### Module Registration with All Features

```typescript
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { HitlModule } from '@hive-academy/langgraph-hitl';

@Module({
  imports: [
    // Register multi-agent module with enhanced capabilities
    MultiAgentModule.forRoot({
      // Register all decorated agents - they're automatically discovered
      agents: [AdvancedSupportAgent, StreamingAnalystAgent, SupportExecutiveAgent, TechnicalSpecialistAgent],

      defaultLlm: {
        provider: 'openai',
        model: 'gpt-4',
        openaiApiKey: process.env.OPENAI_API_KEY,
      },

      // Enhanced capabilities automatically work with streaming
      streaming: { enabled: true },
      performance: { tokenOptimization: true },
    }),

    // Streaming integration
    StreamingModule.forRoot({
      websocket: { enabled: true },
      tokenStreaming: { batchSize: 5 },
    }),

    // HITL integration
    HitlModule.forRoot({
      approvalTimeout: 300000,
      autoApproval: { enabled: false },
    }),
  ],
  providers: [
    // Coordinator that uses all the decorated agents
    EnhancedCustomerSupportCoordinator,
  ],
  exports: [EnhancedCustomerSupportCoordinator],
})
export class EnhancedSupportModule {}
```

### Usage in Controllers

```typescript
@ApiTags('Enhanced Multi-Agent with Streaming')
@Controller('enhanced-support')
export class EnhancedSupportController {
  constructor(private readonly coordinator: EnhancedCustomerSupportCoordinator) {}

  /**
   * Endpoint showing full integration:
   * - @Agent decorated agents with @Tool methods
   * - @StreamToken, @StreamProgress, @StreamEvent decorators
   * - @RequiresApproval HITL integration
   * - Enhanced GraphBuilderService & ToolNodeService working behind scenes
   */
  @Post('full-integration')
  @ApiOperation({
    summary: 'Complete integration demo',
    description: `Demonstrates full integration of all library features:
    - Agents with @Agent, @Tool, @StreamToken decorators
    - Real-time streaming with progress tracking
    - HITL approval workflows with @RequiresApproval
    - Enhanced internal services (GraphBuilder, ToolNode) 
    - Weighted tool coordination with automatic merging`,
  })
  async processWithFullIntegration(@Body() request: TicketRequest) {
    // All the complexity is handled by the decorated agents and internal services
    const result = await this.coordinator.processCustomerTicket(request);

    return {
      success: result.success,
      executionPath: result.executionPath,

      // ToolNodeService automatically merged all tool results with weights
      mergedResults: result.finalState.metadata,

      // Enhanced capabilities working seamlessly together
      demonstratedFeatures: ['Agent decoration and auto-discovery', 'Tool integration with @Tool decorator', 'Real-time streaming with multiple decorators', 'HITL approval workflows', 'Enhanced GraphBuilderService hierarchical routing', 'Enhanced ToolNodeService weighted merging', 'Seamless integration of all library modules'],
    };
  }
}
```

## 🎯 Key Integration Benefits

### 1. **Automatic Service Integration**

```typescript
// ✅ CORRECT: Decorators work seamlessly with enhanced services
@Agent({ tools: ['my-tool'] })  // GraphBuilderService auto-discovers
@Tool({ name: 'my-tool' })      // ToolNodeService auto-handles weighting
@StreamToken()                  // Streaming works with both services
async nodeFunction() {
  return {
    toolWeight: 0.8  // ← ToolNodeService automatically uses this
  };
}
```

### 2. **Enhanced Capabilities Are Transparent**

- **GraphBuilderService** handles hierarchical routing automatically when you use decorated agents
- **ToolNodeService** merges tool results based on `toolWeight` metadata from decorated tools
- **NodeFactoryService** orchestrates enhanced coordination patterns
- All through the clean `@Agent`, `@Tool`, `@StreamToken` decorator interfaces

### 3. **Full Feature Compatibility**

- **Streaming decorators** work with enhanced coordination
- **HITL decorators** integrate with hierarchical escalation
- **Tool decorators** provide weighted results for intelligent merging
- **Agent decorators** enable all enhanced routing capabilities

This shows how the enhanced internal infrastructure works seamlessly with ALL library decorators and features, providing enterprise-grade capabilities through simple, familiar decorator patterns.

## 🎯 Complete Integration Summary

### What's New: Workflow System Integration

The Multi-Agent Module now provides a **complete enterprise solution** combining:

1. **@Workflow Decorator System** - Declarative workflow creation with full lifecycle management
2. **WorkflowManagerService** - Public facade for workflow execution, streaming, and monitoring
3. **Internal Workflow Infrastructure** - Registry, execution engine, and instance management (internal-only)
4. **Seamless Agent Integration** - Workflows orchestrate existing @Agent decorated classes
5. **Enhanced Coordination** - Works with hierarchical, weighted, and streaming capabilities

### Key Integration Benefits

```typescript
// ✅ Complete System Integration Example
@Module({
  imports: [
    MultiAgentModule.forRoot({
      // Agents with @Agent decorator
      agents: [SupportExecutiveAgent, TechnicalSpecialistAgent],

      // Workflows with @Workflow decorator (NEW!)
      workflows: [EnhancedSupportWorkflow],

      // All existing features work together
      defaultLlm: { provider: 'openai', model: 'gpt-4' },
      streaming: { enabled: true },
    }),
  ],
})
export class CompleteSystemModule {}

// Service usage combines everything
@Injectable()
export class CompleteService {
  constructor(
    // Agent coordination (existing)
    private coordinator: MultiAgentCoordinatorService,

    // Workflow orchestration (NEW!)
    private workflowManager: WorkflowManagerService
  ) {}

  async processComplex(input: any) {
    // Option 1: Direct agent coordination
    const agentResult = await this.coordinator.executeSimpleWorkflow(networkId, input);

    // Option 2: Workflow orchestration (combines multiple agent networks)
    const workflowResult = await this.workflowManager.executeWorkflow('my-workflow', input);

    return { agent: agentResult, workflow: workflowResult };
  }
}
```

### Architecture Overview

```
┌─ User Application ─────────────────────────────────────────┐
│                                                            │
│  Controllers ← Services ← WorkflowManagerService (PUBLIC)  │
│                      ↑                                     │
│              MultiAgentCoordinatorService (PUBLIC)        │
│                                                            │
└────────────────────────────────────────────────────────────┘
                              │
┌─ Multi-Agent Library ──────────────────────────────────────┐
│                              │                            │
│  ┌─ PUBLIC API ─────────┐    ├─ INTERNAL INFRASTRUCTURE   │
│  │ @Workflow decorator  │    │                            │
│  │ @Agent decorator     │────┼─ WorkflowRegistryService   │
│  │ @Tool decorator      │    │ WorkflowExecutionService   │
│  │ WorkflowManager      │    │ GraphBuilderService        │
│  │ MultiAgentCoord.     │────┼─ ToolNodeService          │
│  └─────────────────────┘     │ NodeFactoryService         │
│                              │                            │
└──────────────────────────────────────────────────────────┘
```

### Feature Compatibility Matrix

| Feature              | Agents                    | Workflows                            | Integration                       |
| -------------------- | ------------------------- | ------------------------------------ | --------------------------------- |
| **Streaming**        | ✅ @StreamToken           | ✅ executeWorkflowWithStreaming      | ✅ Works seamlessly               |
| **HITL**             | ✅ @RequiresApproval      | ✅ Workflow-level approvals          | ✅ Step-by-step approval          |
| **Tools**            | ✅ @Tool decorator        | ✅ Workflow can use agent tools      | ✅ Weighted tool coordination     |
| **Hierarchical**     | ✅ Multi-level escalation | ✅ Workflow orchestrates hierarchies | ✅ Enhanced GraphBuilder          |
| **Weighted Merging** | ✅ toolWeight metadata    | ✅ Cross-workflow result merging     | ✅ Enhanced ToolNodeService       |
| **Error Handling**   | ✅ Agent-level retry      | ✅ Workflow-level retry/recovery     | ✅ Comprehensive error management |
| **Monitoring**       | ✅ Agent health tracking  | ✅ Workflow instance monitoring      | ✅ Complete observability         |

### Development Workflow

1. **Create Agents** with `@Agent` decorator for specific capabilities
2. **Create Workflows** with `@Workflow` decorator that orchestrate multiple agent networks
3. **Register Both** in `MultiAgentModule.forRoot({ agents: [...], workflows: [...] })`
4. **Use Services** - `MultiAgentCoordinatorService` for agents, `WorkflowManagerService` for workflows
5. **Enjoy Integration** - Streaming, HITL, tools, and enhanced coordination work across both

### Production Benefits

- **Scalability**: Workflow system handles complex multi-step processes efficiently
- **Reliability**: Built-in retry, error handling, and instance management
- **Observability**: Complete tracking of workflow execution and agent coordination
- **Maintainability**: Clean separation between agents (individual tasks) and workflows (orchestration)
- **Performance**: Enhanced internal services optimize execution automatically
- **Flexibility**: Mix and match agent coordination patterns within workflows

The Multi-Agent Module now provides a **complete enterprise AI platform** where simple decorators unlock sophisticated capabilities through powerful internal infrastructure.
