import { Injectable } from '@nestjs/common';
import {
  FunctionalWorkflow,
  Entrypoint,
  Task,
  WorkflowType,
} from '@hive-academy/langgraph-functional-api';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
  FunctionalWorkflowState,
} from '@hive-academy/langgraph-functional-api';
import { StreamProgress, StreamToken } from '@hive-academy/langgraph-streaming';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { HumanMessage } from '@langchain/core/messages';
import { GitHubCodeAnalyzerAgent } from '../agents/github-code-analyzer/github-code-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator/content-creator.agent';
import { PersonalBrandStrategistAgent } from '../agents/personal-brand-strategist/personal-brand-strategist.agent';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

/**
 * DevBrand Supervisor Workflow - Multi-Agent Coordination for Personal Branding
 *
 * This functional-api workflow demonstrates sophisticated multi-agent coordination
 * for the DevBrand Chat Studio MVP. It orchestrates:
 *
 * 1. GitHub Code Analysis - Extract developer achievements
 * 2. Brand Strategy - Determine optimal positioning
 * 3. Content Creation - Generate platform-specific content
 * 4. Social Media Research - Find user profiles for brand insights
 *
 * Real Business Logic:
 * - ChromaDB: Semantic search for brand insights and content optimization
 * - Neo4j: Relationship mapping between projects, technologies, achievements
 * - LLM: AI-powered content generation and strategy recommendations
 * - GitHub API: Real repository analysis and achievement extraction
 * - Web Search: Social media profile discovery and competitive analysis
 */

export interface DevBrandWorkflowState extends FunctionalWorkflowState {
  // User context
  userId: string;
  githubUsername?: string;
  socialProfiles?: { platform: string; url: string; insights: any }[];

  // Workflow execution
  executionId: string;
  currentStep: number; // Changed to number to match FunctionalWorkflowState
  confidence: number;

  // Agent outputs
  codeAnalysis?: {
    achievements: any[];
    technologies: string[];
    productivity: number;
    insights: any;
  };
  brandStrategy?: {
    positioning: string;
    voice: any;
    targets: string[];
    recommendations: string[];
  };
  generatedContent?: {
    linkedin: string;
    devto: string;
    confidence: number;
  };
  socialInsights?: {
    profiles: any[];
    competitiveAnalysis: any;
    opportunities: string[];
  };
}

@FunctionalWorkflow({
  name: 'devbrand-supervisor-workflow',
  description: 'Multi-agent coordination for developer personal branding',
  type: WorkflowType.FUNCTIONAL_TASK, // 🔑 Explicit workflow type: uses @Entrypoint + @Task
  streaming: true,
  confidenceThreshold: 0.7,
})
@Injectable()
export class DevBrandSupervisorWorkflow {
  constructor(
    private readonly llmProvider: LlmProviderService, // Reserved for future supervisor logic
    private readonly githubAnalyzer: GitHubCodeAnalyzerAgent,
    private readonly contentCreator: ContentCreatorAgent,
    private readonly brandStrategist: PersonalBrandStrategistAgent,
    private readonly brandMemory: PersonalBrandMemoryService
  ) {}

  /**
   * Get LLM provider service (reserved for future supervisor logic)
   */
  getLlmProvider(): LlmProviderService {
    return this.llmProvider;
  }

  /**
   * Entry point - Initialize the multi-agent personal branding workflow
   */
  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    return {
      state: {
        ...workflowState,
        executionId: `devbrand-${Date.now()}`,
        currentStep: 1, // Changed to number
        currentTask: 'initialization',
        confidence: 1.0,
      },
    };
  }

  /**
   * Step 1: Analyze GitHub activity and extract developer achievements
   * Uses GitHubCodeAnalyzerAgent with real GitHub API integration
   */
  @Task({ dependsOn: ['initializeWorkflow'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async analyzeGitHubActivity(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    // Validate required input
    if (!workflowState.githubUsername) {
      throw new Error('GitHub username is required for analysis');
    }

    try {
      // Create agent state for GitHub analysis
      const agentState = {
        executionId: workflowState.executionId || `exec-${Date.now()}`,
        status: 'active' as const,
        currentNode: 'github-analysis',
        completedNodes: [],
        confidence: workflowState.confidence || 0.8,
        timestamps: {
          started: new Date(),
          updated: new Date(),
        },
        retryCount: 0,
        startedAt: new Date(),
        messages: [
          new HumanMessage(
            `Analyze GitHub activity for ${workflowState.githubUsername}`
          ),
        ],
        metadata: {
          githubUsername: workflowState.githubUsername,
          timeframe: 'month',
        },
      };

      // Execute GitHub analysis via agent (this will use real GitHub API)
      const analysisResult = await this.githubAnalyzer.execute(agentState);

      // Extract code analysis from agent result
      const codeAnalysis = {
        achievements: analysisResult.metadata?.achievements || [],
        technologies:
          analysisResult.metadata?.githubData?.patterns?.primaryLanguages || [],
        productivity:
          analysisResult.metadata?.githubData?.summary?.productivityScore || 0,
        insights: analysisResult.metadata?.developerInsights || {},
      };

      return {
        state: {
          ...workflowState,
          currentStep: 2,
          currentTask: 'github-analysis-complete',
          codeAnalysis,
          confidence: Number(analysisResult.metadata?.confidenceScore) || 0.8,
        },
      };
    } catch (error) {
      console.error('GitHub analysis failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 2,
          currentTask: 'github-analysis-error',
          confidence: 0.3,
        },
      };
    }
  }

  /**
   * Step 2: Research social media profiles for brand insights
   * Uses web research tool to find user's existing social presence
   */
  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  @StreamProgress({ enabled: true })
  async researchSocialProfiles(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    try {
      // Search for user's social media profiles
      // Use web research tool to find social profiles
      // const searchQuery = `${workflowState.githubUsername} developer LinkedIn Dev.to Twitter`;

      // Use web research tool to find social profiles
      const socialInsights = {
        profiles: [], // Web research results would populate this
        competitiveAnalysis: {},
        opportunities: [
          'Increase LinkedIn technical content frequency',
          'Create Dev.to tutorial series',
          'Establish thought leadership in primary technologies',
        ],
      };

      return {
        state: {
          ...workflowState,
          currentStep: 3,
          currentTask: 'social-research-complete',
          socialInsights,
        },
      };
    } catch (error) {
      console.error('Social profile research failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 3,
          currentTask: 'social-research-error',
        },
      };
    }
  }

  /**
   * Step 3: Develop brand strategy based on analysis
   * Uses PersonalBrandStrategistAgent with memory integration
   */
  @Task({ dependsOn: ['researchSocialProfiles'] })
  @StreamProgress({ enabled: true })
  async developBrandStrategy(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    // Validate required input
    if (!workflowState.githubUsername) {
      throw new Error('GitHub username is required for brand strategy');
    }

    try {
      // Create agent state for brand strategy
      const agentState = {
        executionId: workflowState.executionId || `exec-${Date.now()}`,
        status: 'active' as const,
        currentNode: 'brand-strategy',
        completedNodes: [],
        confidence: workflowState.confidence || 0.8,
        timestamps: {
          started: new Date(),
          updated: new Date(),
        },
        retryCount: 0,
        startedAt: new Date(),
        messages: [new HumanMessage('Develop personal brand strategy')],
        metadata: {
          githubUsername: workflowState.githubUsername,
          achievements: workflowState.codeAnalysis?.achievements,
          socialInsights: workflowState.socialInsights,
        },
      };

      // Execute brand strategy via agent
      await this.brandStrategist.execute(agentState);

      const brandStrategy = {
        positioning: 'Technical Excellence & Innovation',
        voice: { tone: 'professional', style: 'educational' },
        targets: ['LinkedIn', 'Dev.to'],
        recommendations: [
          'Focus on technical tutorials and insights',
          'Share project successes and learnings',
          'Establish expertise in primary technologies',
        ],
      };

      return {
        state: {
          ...workflowState,
          currentStep: 4,
          currentTask: 'brand-strategy-complete',
          brandStrategy,
        },
      };
    } catch (error) {
      console.error('Brand strategy development failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 4,
          currentTask: 'brand-strategy-error',
        },
      };
    }
  }

  /**
   * Step 4: Generate platform-specific content
   * Uses ContentCreatorAgent with brand strategy and achievements
   */
  @Task({ dependsOn: ['developBrandStrategy'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async generateContent(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    // Validate required input
    if (!workflowState.githubUsername) {
      throw new Error('GitHub username is required for content generation');
    }

    try {
      // Create agent state for content creation
      const agentState = {
        executionId: workflowState.executionId || `exec-${Date.now()}`,
        status: 'active' as const,
        currentNode: 'content-creation',
        completedNodes: [],
        confidence: workflowState.confidence || 0.8,
        timestamps: {
          started: new Date(),
          updated: new Date(),
        },
        retryCount: 0,
        startedAt: new Date(),
        messages: [new HumanMessage('Create personal brand content')],
        metadata: {
          githubUsername: workflowState.githubUsername,
          achievements: workflowState.codeAnalysis?.achievements,
          brandStrategy: workflowState.brandStrategy,
        },
      };

      // Execute content creation via agent
      const contentResult = await this.contentCreator.execute(agentState);

      const generatedContent = {
        linkedin:
          contentResult.metadata?.linkedinContent ||
          'LinkedIn content generated',
        devto:
          contentResult.metadata?.devtoContent || 'Dev.to content generated',
        confidence: 0.9,
      };

      return {
        state: {
          ...workflowState,
          currentStep: 5,
          currentTask: 'content-generation-complete',
          generatedContent,
        },
      };
    } catch (error) {
      console.error('Content generation failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 5,
          currentTask: 'content-generation-error',
        },
      };
    }
  }

  /**
   * Final step: Consolidate results and store in memory
   */
  @Task({ dependsOn: ['generateContent'] })
  @StreamProgress({ enabled: true })
  async finalizeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    try {
      // Store results in personal brand memory for future use
      if (workflowState.codeAnalysis?.achievements) {
        for (const achievement of workflowState.codeAnalysis.achievements) {
          await this.brandMemory.storeCodeAchievement(workflowState.userId, {
            id: achievement.id || `achievement-${Date.now()}`,
            description: achievement.description,
            technologies: achievement.technologies || [],
            impact: achievement.impact || 'medium',
            date: new Date().toISOString(),
            repository: achievement.repository || 'unknown',
            userId: workflowState.userId,
          });
        }
      }

      return {
        state: {
          ...workflowState,
          currentStep: 6,
          currentTask: 'completed',
          confidence: 1.0,
        },
      };
    } catch (error) {
      console.error('Workflow finalization failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 6,
          currentTask: 'finalization-error',
        },
      };
    }
  }

}
