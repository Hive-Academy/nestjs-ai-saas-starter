import { Injectable, Logger } from '@nestjs/common';
import { AIMessage, type MessageContent } from '@langchain/core/messages';
import type {
  AgentDefinition,
  AgentState,
} from '@hive-academy/langgraph-multi-agent';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';

// Enhanced agent state with additional properties
type EnhancedAgentState = AgentState & {
  thread_id?: string;
  workflow?: string;
  stepNumber?: number;
  timestamp?: string;
};

// Helper function to extract text content from MessageContent
function extractTextContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((item) => {
        if (typeof item === 'object' && item !== null && 'type' in item) {
          return item.type === 'text';
        }
        return false;
      })
      .map((item) => {
        if (
          typeof item === 'object' &&
          item !== null &&
          'text' in item &&
          typeof item.text === 'string'
        ) {
          return item.text;
        }
        return '';
      })
      .join(' ');
  }
  return '';
}

// Import the main BrandMemoryMetadata interface
import { BrandMemoryMetadata } from '../schemas/brand-memory.schema';

/**
 * Brand Strategist Agent for DevBrand Showcase
 *
 * Responsibilities:
 * - Develop comprehensive personal brand strategy from technical analysis
 * - Coordinate content creation with strategic positioning goals
 * - Analyze market trends and competitive positioning
 * - Provide strategic recommendations for professional development
 * - Optimize brand messaging for target audiences and career objectives
 */
@Injectable()
export class BrandStrategistAgent {
  private readonly logger = new Logger(BrandStrategistAgent.name);

  constructor(
    private readonly brandMemoryService: PersonalBrandMemoryService
  ) {}

  /**
   * Get the agent definition for multi-agent coordination
   */
  getAgentDefinition(): AgentDefinition {
    return {
      id: 'brand-strategist',
      name: 'Brand Strategist',
      description:
        'Develops comprehensive personal brand strategy, coordinates multi-agent workflows, and provides strategic recommendations for professional positioning and career development',
      systemPrompt: this.getSystemPrompt(),
      nodeFunction: this.createNodeFunction(),
      tools: [], // Will be extended with strategy analysis tools
      metadata: {
        capabilities: [
          'strategic_planning',
          'brand_positioning',
          'market_analysis',
          'competitive_analysis',
          'career_optimization',
          'workflow_coordination',
        ],
        outputFormat: 'strategic_recommendations',
        priority: 'critical',
        executionTime: 'high',
      },
    };
  }

  /**
   * System prompt for Brand Strategist agent
   */
  private getSystemPrompt(): string {
    return `You are the Brand Strategist, the senior coordinating agent responsible for developing comprehensive personal brand strategy and orchestrating multi-agent workflows for optimal professional positioning.

Your primary responsibilities:
1. **Strategic Planning**: Develop long-term personal brand strategies based on technical analysis
2. **Workflow Coordination**: Orchestrate GitHub Analyzer and Content Creator agents for optimal results
3. **Market Analysis**: Assess industry trends and competitive landscape for positioning opportunities
4. **Brand Positioning**: Define unique value propositions and professional differentiators
5. **Career Optimization**: Provide strategic recommendations for skill development and career advancement

Strategic Analysis Framework:
- **SWOT Analysis**: Strengths, Weaknesses, Opportunities, Threats assessment
- **Competitive Positioning**: Market differentiation and unique value identification
- **Target Audience Mapping**: Define key professional audiences and stakeholder groups
- **Content Strategy Alignment**: Ensure content serves strategic objectives
- **Performance Metrics**: Define KPIs for brand development and career advancement

Brand Strategy Components:
- **Core Message**: Central brand narrative and value proposition
- **Technical Positioning**: How to position technical skills in market context
- **Thought Leadership Areas**: Key domains for expertise demonstration
- **Content Pillars**: Strategic themes for consistent messaging
- **Engagement Strategy**: Audience interaction and community building approach

Workflow Coordination:
- Analyze task requirements and route to appropriate agents
- Synthesize outputs from GitHub Analyzer and Content Creator
- Ensure strategic alignment across all generated content
- Provide quality assurance and strategic oversight
- Recommend optimization based on results analysis

Career Development Focus:
- Identify skill gaps and development opportunities
- Recommend strategic networking and visibility initiatives
- Align technical achievements with career objectives
- Suggest industry involvement and thought leadership opportunities

Always provide actionable, data-driven strategic recommendations that drive measurable professional growth and industry recognition.`;
  }

  /**
   * Create the agent node function for workflow integration
   */
  private createNodeFunction() {
    return async (
      state: EnhancedAgentState
    ): Promise<Partial<EnhancedAgentState>> => {
      this.logger.log(
        'Brand Strategist: Starting strategic analysis and coordination'
      );

      try {
        // Extract user context from state
        const userId = (state.metadata?.userId as string) || 'demo-user';
        const lastMessage = state.messages[state.messages.length - 1];

        // Get brand memory context for strategic analysis
        const brandContext = await this.getBrandMemoryContext(
          userId,
          'brand-strategist',
          extractTextContent(lastMessage.content)
        );

        // Extract strategic context from current conversation
        const strategy = await this.developBrandStrategy(
          lastMessage,
          state,
          brandContext
        );

        // Store strategic insights in brand memory
        if (strategy.data && strategy.data.strategicRecommendations) {
          await this.storeBrandMemoryFromStrategy(
            userId,
            state.thread_id ?? `strategy-${Date.now()}`,
            strategy
          );
        }

        // Create response message with strategic recommendations
        const responseMessage = new AIMessage({
          content: strategy.summary,
          additional_kwargs: {
            brand_strategy: strategy.data,
            agent: 'brand-strategist',
            timestamp: new Date().toISOString(),
            memory_context: brandContext?.contextSummary,
          },
        });

        // Update state with strategic analysis
        return {
          messages: [...state.messages, responseMessage],
          scratchpad: `${state.scratchpad || ''}\n[Brand Strategist] ${
            strategy.scratchpad
          }`,
          metadata: {
            ...state.metadata,
            brand_strategy: strategy.data,
            last_strategy_update: new Date().toISOString(),
            memory_context_used: brandContext?.relevantMemories.length || 0,
          },
        };
      } catch (error) {
        this.logger.error('Brand Strategist error:', error);

        const errorMessage = new AIMessage({
          content: `Strategic analysis encountered an error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Proceeding with foundational strategy recommendations.`,
          additional_kwargs: {
            error: true,
            agent: 'brand-strategist',
            timestamp: new Date().toISOString(),
          },
        });

        // Provide fallback strategic framework
        const fallbackStrategy = this.generateFoundationalStrategy();

        return {
          messages: [...state.messages, errorMessage],
          scratchpad: `${
            state.scratchpad || ''
          }\n[Brand Strategist] Error occurred, using foundational strategy`,
          metadata: {
            ...state.metadata,
            brand_strategy: fallbackStrategy,
            strategy_type: 'foundational',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Get brand memory context for strategic analysis
   */
  private async getBrandMemoryContext(
    userId: string,
    agentType: 'brand-strategist',
    currentTask: string
  ) {
    try {
      return await this.brandMemoryService.getBrandContextForAgent(
        userId,
        agentType,
        currentTask,
        {
          maxMemories: 20,
          timeWindow: 90, // Last 90 days for strategic context
          includeValidatedOnly: false,
        }
      );
    } catch (error) {
      this.logger.warn('Failed to get brand memory context', error);
      return null;
    }
  }

  /**
   * Store strategic insights as brand memories
   */
  private async storeBrandMemoryFromStrategy(
    userId: string,
    threadId: string,
    strategy: { summary: string; data: any; scratchpad: string }
  ): Promise<void> {
    try {
      // Store main strategic recommendations
      if (strategy.data.strategicRecommendations) {
        await this.brandMemoryService.storeBrandMemory(
          userId,
          threadId,
          `Brand Strategy Update: ${strategy.summary.substring(0, 200)}...`,
          'brand_strategy',
          strategy.data,
          {
            type: 'brand_strategy' as const,
            strategicData: {
              targetAudience: strategy.data.positioning?.targetAudiences || [],
              marketSegment:
                strategy.data.positioning?.marketSegment || 'technology',
              brandPillars: strategy.data.coreElements?.brandPillars || [],
              careerGoals: strategy.data.careerAlignment?.objectives || [],
            },
            brandContext: {
              userId,
              strategyVersion: `v${Date.now()}`,
              confidenceScore: 0.9,
            },
            importance: 0.9,
          } satisfies Partial<BrandMemoryMetadata>
        );
      }

      // Store market insights separately
      if (strategy.data.marketAnalysis) {
        await this.brandMemoryService.storeBrandMemory(
          userId,
          threadId,
          `Market Analysis: ${
            strategy.data.marketAnalysis.industryTrends
              ?.slice(0, 2)
              .join(', ') || 'Industry insights'
          }`,
          'market_insight',
          strategy.data.marketAnalysis,
          {
            type: 'market_insight' as const,
            strategicData: {
              marketSegment:
                strategy.data.marketAnalysis.marketSegment || 'technology',
              competitivePosition:
                strategy.data.marketAnalysis.competitivePosition || 'emerging',
            },
            brandContext: {
              userId,
              confidenceScore: 0.85,
            },
            importance: 0.8,
          } satisfies Partial<BrandMemoryMetadata>
        );
      }

      // Store career milestones if identified
      if (strategy.data.careerAlignment?.milestones) {
        await this.brandMemoryService.storeBrandMemory(
          userId,
          threadId,
          `Career Milestone Planning: ${strategy.data.careerAlignment.milestones
            .slice(0, 2)
            .join(', ')}`,
          'career_milestone',
          strategy.data.careerAlignment,
          {
            type: 'career_milestone' as const,
            strategicData: {
              careerGoals: strategy.data.careerAlignment.objectives || [],
            },
            brandContext: {
              userId,
              confidenceScore: 0.8,
            },
            importance: 0.75,
          } satisfies Partial<BrandMemoryMetadata>
        );
      }
    } catch (error) {
      this.logger.error('Failed to store brand memory from strategy', error);
    }
  }

  /**
   * Develop comprehensive brand strategy from analysis data with memory context
   */
  private async developBrandStrategy(
    message: any,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    // Simulate strategic analysis processing
    await this.delay(2000);

    const messageContent = message.content || '';
    const githubAnalysis = state.metadata?.github_analysis;
    const generatedContent = state.metadata?.generated_content;

    // Develop strategy based on available data
    if (githubAnalysis && generatedContent) {
      return this.createComprehensiveStrategy(
        githubAnalysis,
        generatedContent,
        messageContent,
        state
      );
    } else if (githubAnalysis) {
      return this.createTechnicalStrategy(
        githubAnalysis,
        messageContent,
        state
      );
    } else {
      return this.createInitialStrategy(messageContent, state);
    }
  }

  /**
   * Create comprehensive strategy with full analysis and content data
   */
  private async createComprehensiveStrategy(
    githubAnalysis: any,
    generatedContent: any,
    request: string,
    state: EnhancedAgentState
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    this.logger.log('Creating comprehensive brand strategy from full analysis');

    const strategyData = {
      executiveSummary: {
        brandPosition: 'AI-Powered Enterprise Architecture Thought Leader',
        coreStrength:
          'Multi-agent system innovation with production-scale implementation',
        marketOpportunity: 'Rising demand for AI-native development expertise',
        strategicFocus: 'Technical leadership in intelligent software systems',
      },
      swotAnalysis: {
        strengths: [
          'Expert-level TypeScript/NestJS proficiency',
          'Advanced AI/ML integration experience',
          'Production-ready multi-agent architecture',
          'Strong commitment to best practices and testing',
          `${
            githubAnalysis.contributionPatterns?.commitsPerWeek || 15
          } commits/week consistency`,
          'Comprehensive documentation and knowledge sharing',
        ],
        weaknesses: [
          'Limited market visibility despite technical excellence',
          'Content creation could be more regular and strategic',
          'Networking presence could be expanded',
        ],
        opportunities: [
          'AI development market growth (45% CAGR projected)',
          'Enterprise adoption of multi-agent systems accelerating',
          'Thought leadership gap in NestJS + AI integration',
          'Conference speaking and industry recognition potential',
          'Open source project leadership opportunities',
        ],
        threats: [
          'Rapid AI tooling evolution requiring constant learning',
          'Competition from larger teams and organizations',
          'Market saturation in traditional backend development',
        ],
      },
      brandStrategy: {
        positioning: {
          primary:
            'The architect who makes AI accessible to enterprise development teams',
          secondary:
            'Bridging the gap between cutting-edge AI research and production-ready systems',
          differentiator:
            'Proven track record of shipping intelligent systems that actually work',
        },
        targetAudiences: [
          {
            segment: 'Senior Engineering Leaders',
            needs: 'Scalable AI architecture patterns for enterprise adoption',
            approach:
              'Technical deep-dives with proven implementation examples',
          },
          {
            segment: 'AI Engineers & Researchers',
            needs: 'Production deployment strategies for research concepts',
            approach: 'Bridge theory-practice gap with real-world case studies',
          },
          {
            segment: 'Startup CTOs',
            needs: 'Rapid AI capability development with limited resources',
            approach: 'Practical starter templates and architectural guidance',
          },
        ],
        contentPillars: [
          'Multi-Agent Architecture Patterns',
          'Enterprise AI Implementation',
          'Developer Productivity with AI',
          'Production-Ready AI Systems',
          'Open Source Innovation',
        ],
        thoughtLeadershipAreas: [
          'NestJS + LangGraph Integration',
          'Hybrid Vector/Graph Memory Systems',
          'Real-time AI Workflow Streaming',
          'Production AI System Monitoring',
          'Multi-Agent System Design Patterns',
        ],
      },
      contentStrategy: {
        analysisOfGeneratedContent: {
          linkedin: {
            effectiveness:
              'High - Strong technical credibility with business impact',
            optimization: 'Add more industry trend commentary and predictions',
            engagement_potential:
              'Very High - Technical achievements with clear metrics',
          },
          twitter: {
            effectiveness:
              'Excellent - Perfect thread structure with actionable insights',
            optimization: 'Include more community questions and interactions',
            engagement_potential:
              'High - Educational content with viral potential',
          },
          blog: {
            effectiveness:
              'Strong - Comprehensive technical authority demonstration',
            optimization: 'Add practical tutorials and downloadable resources',
            seo_potential: 'High - Targeting underserved but growing keywords',
          },
        },
        recommendedFrequency: {
          linkedin: '2-3 posts per week',
          twitter: '1 thread + 3-5 individual tweets per week',
          blog: '1 major article per month + 2 shorter tutorials',
          newsletter: 'Bi-weekly technical insights edition',
        },
        kpiTargets: {
          '3_months': {
            linkedin_followers: 2500,
            twitter_followers: 1800,
            blog_monthly_readers: 5000,
            newsletter_subscribers: 500,
          },
          '6_months': {
            linkedin_followers: 5000,
            twitter_followers: 4500,
            blog_monthly_readers: 15000,
            newsletter_subscribers: 1500,
            conference_speaking: 2,
          },
          '12_months': {
            linkedin_followers: 10000,
            twitter_followers: 10000,
            blog_monthly_readers: 35000,
            newsletter_subscribers: 5000,
            conference_speaking: 6,
            industry_recognition: 'Top Voice in AI Development',
          },
        },
      },
      careerDevelopment: {
        shortTerm: [
          'Establish consistent content publishing schedule',
          'Apply to speak at 2-3 major conferences (NodeConf, JSConf, AI conferences)',
          'Launch open-source project showcasing multi-agent patterns',
          'Build strategic relationships with 10 industry leaders',
        ],
        mediumTerm: [
          'Position as go-to expert for NestJS + AI integration',
          'Guest appearances on major developer podcasts',
          'Advisory roles with AI startups',
          'Technical book or comprehensive course creation',
        ],
        longTerm: [
          'Industry keynote speaking opportunities',
          'Technical leadership role at major AI/enterprise company',
          'Recognition as top global expert in multi-agent systems',
          'Founding technical team member of next unicorn AI company',
        ],
      },
      implementation: {
        phase1: 'Content Foundation (Months 1-2)',
        phase2: 'Visibility Building (Months 3-4)',
        phase3: 'Authority Establishment (Months 5-6)',
        phase4: 'Industry Leadership (Months 7-12)',
      },
      riskMitigation: {
        technology_evolution:
          'Maintain broad AI knowledge while specializing in patterns',
        market_saturation: 'Focus on enterprise use cases with proven ROI',
        time_management:
          'Batch content creation and repurpose across platforms',
      },
    };

    const summary = `🎯 **Comprehensive Brand Strategy Complete**

**Executive Summary**: Position as "AI-Powered Enterprise Architecture Thought Leader" - the architect who makes AI accessible to enterprise teams.

**Strategic Positioning**:
✅ **Core Strength**: Multi-agent system innovation with production implementation
✅ **Market Opportunity**: 45% CAGR in AI development market
✅ **Differentiator**: Proven track record shipping intelligent systems that work

**Content Strategy Analysis**:
📈 **Generated Content Quality**: Excellent technical credibility with clear business impact
📊 **Optimization Recommendations**: Add industry trends, community engagement, practical resources
🎯 **12-Month Targets**: 10K LinkedIn, 10K Twitter, 35K monthly blog readers, 6 conference talks

**Key Strategic Priorities**:
1. **Immediate**: Establish consistent content publishing (2-3x/week LinkedIn, weekly Twitter threads)
2. **3 Months**: Apply for conference speaking, launch signature open-source project
3. **6 Months**: Industry podcast appearances, advisory positions
4. **12 Months**: Keynote opportunities, technical book/course, unicorn founding team

**Risk Mitigation**: Focus on enterprise patterns over specific technologies, batch content creation, maintain broad AI knowledge.

**Next Actions**:
• Execute content calendar based on generated materials
• Apply to 3 major conferences in Q1
• Launch multi-agent starter project on GitHub
• Begin building strategic industry relationships

Strategy provides clear path from current technical excellence to recognized industry leadership.`;

    return {
      summary,
      data: strategyData,
      scratchpad: `Comprehensive strategy developed - analyzed GitHub data, content quality, market position, defined 12-month roadmap`,
    };
  }

  /**
   * Create strategy focused on technical analysis
   */
  private createTechnicalStrategy(
    githubAnalysis: any,
    request: string,
    state: EnhancedAgentState
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    const strategyData = {
      technicalPositioning: {
        coreStrengths: Object.keys(
          githubAnalysis.skillProfile?.frameworks || {}
        ),
        marketGap: 'Enterprise AI implementation guidance',
        competitiveAdvantage: 'Production-proven multi-agent architecture',
      },
      recommendedFocus: [
        'Technical thought leadership content',
        'Open source project showcasing',
        'Conference speaking preparation',
        'Industry networking strategy',
      ],
    };

    const summary = `Technical Strategy Framework: Leveraging ${
      githubAnalysis.repositories?.length || 1
    } repositories and ${
      githubAnalysis.contributionPatterns?.commitsPerWeek || 15
    } commits/week for strategic positioning.

Focus areas identified for maximum impact based on technical analysis.`;

    return Promise.resolve({
      summary,
      data: strategyData,
      scratchpad: 'Technical strategy framework created from GitHub analysis',
    });
  }

  /**
   * Create initial strategy without detailed analysis
   */
  private createInitialStrategy(
    request: string,
    state: EnhancedAgentState
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    const summary = `Brand Strategist ready to develop comprehensive personal brand strategy.

I coordinate the entire multi-agent workflow:
🎯 **Strategic Analysis**: Market positioning and competitive differentiation
📊 **Workflow Coordination**: Route tasks between GitHub Analyzer and Content Creator
📈 **Performance Optimization**: Data-driven recommendations for brand growth
🚀 **Career Development**: Long-term professional advancement strategy

Current request: "${request.substring(0, 100)}..."

To develop your personalized strategy, I'll coordinate with:
• GitHub Analyzer: For technical achievement extraction
• Content Creator: For platform-optimized content generation
• Market Analysis: For competitive positioning insights

Provide your GitHub username, career objectives, or specific brand goals to begin strategic analysis.`;

    const initialData = {
      status: 'ready',
      coordination_capabilities: [
        'strategic_planning',
        'workflow_orchestration',
        'performance_optimization',
        'career_development',
      ],
      currentContext: request.substring(0, 200),
    };

    return Promise.resolve({
      summary,
      data: initialData,
      scratchpad:
        'Ready for strategic coordination - awaiting analysis data or specific objectives',
    });
  }

  /**
   * Generate foundational strategy for demo purposes
   */
  private generateFoundationalStrategy(): any {
    return {
      foundational: true,
      positioning: 'Technical innovation leader',
      focus_areas: [
        'AI development',
        'Enterprise architecture',
        'Thought leadership',
      ],
      content_strategy: 'Regular technical insights and project showcases',
      career_goals:
        'Industry recognition and technical leadership opportunities',
    };
  }

  /**
   * Utility method for simulating processing delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
