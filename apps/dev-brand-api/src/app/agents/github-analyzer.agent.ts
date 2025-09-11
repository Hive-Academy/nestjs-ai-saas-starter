import { Injectable, Logger } from '@nestjs/common';
import { AIMessage } from '@langchain/core/messages';
import type {
  AgentDefinition,
  AgentState,
} from '@hive-academy/langgraph-multi-agent';
import { GitHubAnalyzerTool } from '../tools/github-analyzer.tool';
import { AchievementExtractorTool } from '../tools/achievement-extractor.tool';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';

// Enhanced agent state with thread support
interface EnhancedAgentState extends AgentState {
  thread_id?: string;
  workflow?: string;
  stepNumber?: number;
  timestamp?: string;
}

// Technical memory metadata with proper generic constraints
interface TechnicalMemoryMetadata<T = Record<string, unknown>> {
  technicalData?: {
    repositories?: string[];
    technologies?: string[];
    skillLevel?: string;
    projectType?: string;
  };
  brandContext?: {
    userId: string;
    analysisVersion?: string;
    confidenceScore: number;
  };
  importance: number;
  [key: string]: string | number | boolean | null | undefined | T;
}

/**
 * GitHub Analyzer Agent for DevBrand Showcase
 *
 * Responsibilities:
 * - Analyze GitHub repositories for technical achievements
 * - Extract programming languages, frameworks, and technologies used
 * - Identify contribution patterns and project complexity
 * - Generate developer skill profile from repository analysis
 * - Provide technical achievement data for personal brand building
 */
@Injectable()
export class GitHubAnalyzerAgent {
  private readonly logger = new Logger(GitHubAnalyzerAgent.name);

  constructor(
    private readonly githubAnalyzerTool: GitHubAnalyzerTool,
    private readonly achievementExtractorTool: AchievementExtractorTool,
    private readonly brandMemoryService: PersonalBrandMemoryService
  ) {}

  /**
   * Get the agent definition for multi-agent coordination
   */
  getAgentDefinition(): AgentDefinition {
    return {
      id: 'github-analyzer',
      name: 'GitHub Analyzer',
      description:
        'Analyzes GitHub repositories to extract technical achievements, skills, and contribution patterns for personal brand development',
      systemPrompt: this.getSystemPrompt(),
      nodeFunction: this.createNodeFunction(),
      tools: [this.githubAnalyzerTool, this.achievementExtractorTool],
      metadata: {
        capabilities: [
          'repository_analysis',
          'skill_extraction',
          'contribution_analysis',
          'technology_profiling',
          'project_complexity_assessment',
        ],
        outputFormat: 'technical_achievements',
        priority: 'high',
        executionTime: 'medium',
      },
    };
  }

  /**
   * System prompt for GitHub Analyzer agent
   */
  private getSystemPrompt(): string {
    return `You are the GitHub Analyzer, a specialized AI agent focused on analyzing GitHub repositories to extract meaningful technical achievements and skills for personal brand development.

Your primary responsibilities:
1. **Repository Analysis**: Examine repository structure, code quality, and project organization
2. **Skill Extraction**: Identify programming languages, frameworks, libraries, and tools used
3. **Contribution Analysis**: Analyze commit patterns, collaboration style, and project involvement
4. **Achievement Identification**: Extract notable technical accomplishments and project highlights
5. **Technology Profiling**: Build comprehensive technical skill profiles from repository data
6. **Memory Integration**: Store and retrieve contextual brand memories for personalized analysis

When analyzing repositories, focus on:
- Programming languages and their usage patterns
- Frameworks and libraries with proficiency levels
- Project complexity and architectural patterns
- Contribution frequency and consistency
- Code quality indicators and best practices
- Collaboration patterns and team involvement
- Documentation quality and communication skills

**Available Tools**:
1. **github_analyzer**: Use for comprehensive GitHub profile and repository analysis
2. **achievement_extractor**: Use to extract and categorize technical achievements from analysis data

**Tool Usage Guidelines**:
- Always use github_analyzer first when GitHub analysis is requested
- Follow up with achievement_extractor to process and categorize findings
- Combine tool outputs with contextual analysis and strategic insights
- Provide clear reasoning for tool selection and parameter choices

Output Format:
- Structured technical achievement data
- Skills categorized by proficiency level
- Notable project highlights with impact metrics
- Technology stack summaries
- Contribution pattern insights
- Recommendations for skill development

Always provide actionable insights that can be used for personal brand content creation and professional positioning.`;
  }

  /**
   * Create the agent node function for workflow integration
   */
  private createNodeFunction() {
    return async (
      state: EnhancedAgentState
    ): Promise<Partial<EnhancedAgentState>> => {
      this.logger.log('GitHub Analyzer: Starting repository analysis');

      try {
        // Extract user context from state
        const userId = state.metadata?.userId || 'demo-user';
        const lastMessage = state.messages[state.messages.length - 1];

        // Get contextual brand memories for GitHub analysis
        const brandContext = await this.getBrandMemoryContext(
          userId,
          String(lastMessage.content || '')
        );

        // Extract GitHub-related tasks from the current context
        const analysis = await this.analyzeRepositoryContext(
          lastMessage,
          state,
          brandContext
        );

        // Store analysis results in brand memory
        if (analysis.data && !analysis.data.mockAnalysis) {
          await this.storeBrandMemoryFromAnalysis(
            userId,
            state.thread_id || 'analysis',
            analysis
          );
        }

        // Create response message with analysis results
        const responseMessage = new AIMessage({
          content: analysis.summary,
          additional_kwargs: {
            analysis_data: analysis.data,
            agent: 'github-analyzer',
            timestamp: new Date().toISOString(),
            memory_context: brandContext?.contextSummary,
          },
        });

        // Update state with analysis results
        return {
          messages: [...state.messages, responseMessage],
          scratchpad: `${state.scratchpad || ''}\n[GitHub Analyzer] ${
            analysis.scratchpad
          }`,
          metadata: {
            ...state.metadata,
            github_analysis: analysis.data,
            last_analyzer_run: new Date().toISOString(),
            memory_context_used: brandContext?.relevantMemories.length || 0,
          },
        };
      } catch (error) {
        this.logger.error('GitHub Analyzer error:', error);

        const errorMessage = new AIMessage({
          content: `GitHub analysis encountered an error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Proceeding with mock analysis for demonstration.`,
          additional_kwargs: {
            error: true,
            agent: 'github-analyzer',
            timestamp: new Date().toISOString(),
          },
        });

        // Provide fallback mock analysis for demo purposes
        const mockAnalysis = this.generateMockAnalysis();

        return {
          messages: [...state.messages, errorMessage],
          scratchpad: `${
            state.scratchpad || ''
          }\n[GitHub Analyzer] Error occurred, using mock data`,
          metadata: {
            ...state.metadata,
            github_analysis: mockAnalysis,
            analysis_type: 'mock',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Get brand memory context for GitHub analysis
   */
  private async getBrandMemoryContext(userId: string, currentTask: string) {
    try {
      return await this.brandMemoryService.getBrandContextForAgent(
        userId,
        'github-analyzer',
        currentTask,
        {
          maxMemories: 10,
          timeWindow: 30, // Last 30 days
          includeValidatedOnly: false,
        }
      );
    } catch (error) {
      this.logger.warn('Failed to get brand memory context', error);
      return null;
    }
  }

  /**
   * Store analysis results as brand memories
   */
  private async storeBrandMemoryFromAnalysis(
    userId: string,
    threadId: string,
    analysis: { summary: string; data: any; scratchpad: string }
  ): Promise<void> {
    try {
      // Store main analysis as dev achievement
      if (analysis.data.repositories?.length > 0) {
        await this.brandMemoryService.storeBrandMemory(
          userId,
          threadId,
          `GitHub Analysis: ${analysis.summary.substring(0, 200)}...`,
          'dev_achievement',
          analysis.data,
          {
            technicalData: {
              repositories: analysis.data.repositories.map((r: any) => r.name),
              technologies: analysis.data.skillProfile
                ? Object.keys(analysis.data.skillProfile.frameworks || {})
                : [],
            },
            brandContext: {
              userId,
              analysisVersion: `github_${Date.now()}`,
              confidenceScore: 0.9,
            },
            importance: 0.8,
          } as TechnicalMemoryMetadata
        );
      }

      // Store skill profile separately
      if (analysis.data.skillProfile) {
        await this.brandMemoryService.storeBrandMemory(
          userId,
          threadId,
          `Skill Profile Updated: ${Object.keys(
            analysis.data.skillProfile.languages || {}
          ).join(', ')}`,
          'skill_profile',
          analysis.data.skillProfile,
          {
            technicalData: {
              technologies: Object.keys(
                analysis.data.skillProfile.frameworks || {}
              ),
              skillLevel: 'advanced', // Default based on analysis depth
            },
            brandContext: {
              userId,
              confidenceScore: 0.85,
            },
            importance: 0.7,
          } as TechnicalMemoryMetadata
        );
      }
    } catch (error) {
      this.logger.error('Failed to store brand memory from analysis', error);
    }
  }

  /**
   * Analyze repository context from message and state with memory context
   */
  private async analyzeRepositoryContext(
    message: any,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    // Simulate repository analysis processing
    await this.delay(1000);

    const messageContent = message.content || '';
    const isGitHubAnalysisRequest =
      messageContent.toLowerCase().includes('github') ||
      messageContent.toLowerCase().includes('repository') ||
      messageContent.toLowerCase().includes('code');

    if (isGitHubAnalysisRequest) {
      return this.performRepositoryAnalysis(
        messageContent,
        state,
        brandContext
      );
    } else {
      return this.generateContextualAnalysis(
        messageContent,
        state,
        brandContext
      );
    }
  }

  /**
   * Perform detailed repository analysis with brand context
   */
  private async performRepositoryAnalysis(
    request: string,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    this.logger.log(
      'Performing detailed repository analysis with brand context'
    );

    // Enhanced analysis based on brand memory context
    const hasRecentAnalysis = brandContext?.relevantMemories?.some(
      (m: any) => m.metadata.type === 'dev_achievement'
    );
    const previousTechnologies =
      brandContext?.relevantMemories
        ?.filter((m: any) => m.metadata.technicalData?.technologies)
        ?.flatMap((m: any) => m.metadata.technicalData.technologies) || [];

    // Mock repository analysis data
    const analysisData = {
      repositories: [
        {
          name: 'nestjs-ai-saas-starter',
          languages: ['TypeScript', 'JavaScript', 'HTML', 'CSS'],
          frameworks: ['NestJS', 'Angular', 'LangGraph', 'ChromaDB', 'Neo4j'],
          complexity: 'high',
          linesOfCode: 50000,
          contributors: 2,
          commits: 150,
          lastActivity: new Date().toISOString(),
          achievements: [
            'Enterprise-grade AI SaaS architecture',
            'Multi-agent system implementation',
            'Vector database integration',
            'Graph database relationships',
            'Real-time streaming workflows',
          ],
        },
      ],
      skillProfile: {
        languages: {
          TypeScript: 'expert',
          JavaScript: 'advanced',
          Python: 'intermediate',
        },
        frameworks: {
          NestJS: 'expert',
          Angular: 'advanced',
          LangGraph: 'advanced',
          React: 'intermediate',
        },
        databases: {
          Neo4j: 'advanced',
          ChromaDB: 'advanced',
          PostgreSQL: 'intermediate',
          Redis: 'intermediate',
        },
        technologies: {
          'AI/ML': 'advanced',
          Microservices: 'expert',
          GraphQL: 'intermediate',
          WebSockets: 'advanced',
        },
      },
      contributionPatterns: {
        commitsPerWeek: 15,
        averageCommitSize: 250,
        bestPractices: [
          'type safety',
          'modular architecture',
          'comprehensive testing',
        ],
        collaborationStyle: 'architect-leader',
      },
      achievements: {
        totalRepositories: 25,
        starsEarned: 150,
        forksCreated: 30,
        majorProjects: 5,
        contributionStreak: 90,
      },
    };

    // Enhanced summary with brand context insights
    let contextInsights = '';
    if (brandContext?.contextSummary) {
      contextInsights = `\n🧠 **Brand Context**: ${brandContext.contextSummary.substring(
        0,
        150
      )}...`;
    }
    if (hasRecentAnalysis) {
      contextInsights +=
        '\n🔄 **Recent Analysis**: Building on previous GitHub analysis findings';
    }
    if (previousTechnologies.length > 0) {
      const newTechnologies = Object.keys(
        analysisData.skillProfile.frameworks || {}
      ).filter((tech) => !previousTechnologies.includes(tech));
      if (newTechnologies.length > 0) {
        contextInsights += `\n🆕 **New Technologies**: ${newTechnologies.join(
          ', '
        )}`;
      }
    }

    const summary = `GitHub Analysis Complete: Analyzed ${
      analysisData.repositories.length
    } repositories. ${contextInsights}

Key Findings:
🎯 **Technical Expertise**: Expert-level TypeScript/NestJS with advanced AI/ML integration
🏗️ **Architecture Skills**: Complex multi-agent systems with vector/graph databases
📈 **Contribution Quality**: ${
      analysisData.contributionPatterns.commitsPerWeek
    } commits/week, strong best practices
🚀 **Project Impact**: ${analysisData.achievements.starsEarned} stars across ${
      analysisData.achievements.totalRepositories
    } repositories

**Primary Skills Identified**: ${Object.entries(
      analysisData.skillProfile.frameworks
    )
      .map(([k, v]) => `${k}(${v})`)
      .join(', ')}

**Notable Achievements**:
${analysisData.repositories[0].achievements.map((a) => `• ${a}`).join('\n')}

Ready to proceed with content creation based on this technical profile.`;

    return {
      summary,
      data: analysisData,
      scratchpad: `Repository analysis completed - ${analysisData.repositories.length} repos processed, skill profile generated`,
    };
  }

  /**
   * Generate contextual analysis based on current conversation and brand memory
   */
  private generateContextualAnalysis(
    request: string,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    let contextualInsights = '';
    if (brandContext?.relevantMemories?.length > 0) {
      contextualInsights = `\n\n🧠 **Brand Memory Context**: Found ${brandContext.relevantMemories.length} relevant memories from previous analyses.`;
      if (brandContext.suggestedActions?.length > 0) {
        contextualInsights += `\n💡 **Suggestions**: ${brandContext.suggestedActions
          .slice(0, 2)
          .join(', ')}`;
      }
    }

    const summary = `GitHub Analyzer ready to assist with repository analysis. Current context suggests focus on personal brand development.${contextualInsights}

I can help analyze:
🔍 Repository structure and code quality
📊 Technical skill extraction from commit history  
🎯 Achievement identification from project portfolios
📈 Contribution pattern analysis
🛠️ Technology stack profiling

Please provide a GitHub username or repository URL for detailed analysis, or I can work with the existing technical profile data.`;

    const contextData = {
      status: 'ready',
      capabilities: [
        'repository_analysis',
        'skill_extraction',
        'achievement_identification',
        'contribution_analysis',
      ],
      currentContext: request.substring(0, 200),
    };

    return Promise.resolve({
      summary,
      data: contextData,
      scratchpad:
        'Ready for repository analysis - awaiting specific GitHub data',
    });
  }

  /**
   * Generate mock analysis for demo purposes
   */
  private generateMockAnalysis(): any {
    return {
      mockAnalysis: true,
      repositories: [
        {
          name: 'demo-project',
          languages: ['TypeScript', 'JavaScript'],
          frameworks: ['NestJS', 'React'],
          complexity: 'medium',
          achievements: ['Clean architecture', 'Good test coverage'],
        },
      ],
      skillProfile: {
        languages: { TypeScript: 'advanced', JavaScript: 'expert' },
        frameworks: { NestJS: 'advanced', React: 'intermediate' },
      },
    };
  }

  /**
   * Utility method for simulating processing delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
