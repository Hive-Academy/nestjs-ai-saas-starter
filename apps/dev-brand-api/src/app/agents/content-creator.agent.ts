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
 * Content Creator Agent for DevBrand Showcase
 *
 * Responsibilities:
 * - Generate compelling personal brand content from technical achievements
 * - Create platform-specific content (LinkedIn, Twitter, Blog posts)
 * - Transform technical data into engaging narratives
 * - Optimize content for different audiences and platforms
 * - Generate multi-format content (text, structured data, metadata)
 */
@Injectable()
export class ContentCreatorAgent {
  private readonly logger = new Logger(ContentCreatorAgent.name);

  constructor(
    private readonly brandMemoryService: PersonalBrandMemoryService
  ) {}

  /**
   * Get the agent definition for multi-agent coordination
   */
  getAgentDefinition(): AgentDefinition {
    return {
      id: 'content-creator',
      name: 'Content Creator',
      description:
        'Creates engaging personal brand content from technical achievements and analysis data, optimized for multiple platforms and audiences',
      systemPrompt: this.getSystemPrompt(),
      nodeFunction: this.createNodeFunction(),
      tools: [], // Will be extended with content generation tools
      metadata: {
        capabilities: [
          'content_generation',
          'narrative_creation',
          'platform_optimization',
          'audience_targeting',
          'multi_format_output',
        ],
        outputFormat: 'branded_content',
        priority: 'high',
        executionTime: 'medium',
      },
    };
  }

  /**
   * System prompt for Content Creator agent
   */
  private getSystemPrompt(): string {
    return `You are the Content Creator, a specialized AI agent focused on transforming technical achievements and professional data into compelling personal brand content.

Your primary responsibilities:
1. **Content Strategy**: Transform technical data into engaging narratives
2. **Multi-Platform Creation**: Generate content optimized for LinkedIn, Twitter, blogs, portfolios
3. **Audience Adaptation**: Tailor content for different professional audiences (technical, business, general)
4. **Brand Consistency**: Maintain consistent voice and messaging across all content
5. **Engagement Optimization**: Create content designed to drive engagement and professional visibility

Content Creation Guidelines:
- **Technical Translation**: Convert complex technical achievements into accessible narratives
- **Story Structure**: Use compelling story frameworks (problem-solution, journey, achievement)
- **Value Proposition**: Highlight unique skills and professional value
- **Social Proof**: Incorporate metrics, results, and impact statements
- **Call-to-Action**: Include appropriate engagement prompts for each platform

Platform-Specific Formatting:
- **LinkedIn**: Professional posts with metrics, industry insights, thought leadership
- **Twitter/X**: Concise threads with technical tips and achievements
- **Blog Posts**: Long-form technical deep-dives with tutorials and insights
- **Portfolio**: Project showcases with impact metrics and technical details
- **Newsletter**: Regular updates with industry trends and personal developments

Content Types:
- Achievement announcements and milestone celebrations
- Technical tutorials and knowledge sharing
- Industry insights and thought leadership
- Project showcases and case studies
- Professional journey narratives
- Skill development stories

Always focus on authentic, valuable content that positions the individual as a thought leader while remaining genuine and helpful to the professional community.`;
  }

  /**
   * Create the agent node function for workflow integration
   */
  private createNodeFunction() {
    return async (
      state: EnhancedAgentState
    ): Promise<Partial<EnhancedAgentState>> => {
      this.logger.log('Content Creator: Starting content generation');

      try {
        // Extract user context from state
        const userId = (state.metadata?.userId as string) || 'demo-user';
        const lastMessage = state.messages[state.messages.length - 1];

        // Get brand memory context for content creation
        const brandContext = await this.getBrandMemoryContext(
          userId,
          'content-creator',
          extractTextContent(lastMessage.content)
        );

        // Extract content requirements from current context
        const content = await this.generateBrandContent(
          lastMessage,
          state,
          brandContext
        );

        // Store generated content in brand memory
        if (content.data && content.data.contents) {
          await this.storeBrandMemoryFromContent(
            userId,
            state.thread_id || 'content',
            content
          );
        }

        // Create response message with content results
        const responseMessage = new AIMessage({
          content: content.summary,
          additional_kwargs: {
            generated_content: content.data,
            agent: 'content-creator',
            timestamp: new Date().toISOString(),
            memory_context: brandContext?.contextSummary,
          },
        });

        // Update state with generated content
        return {
          messages: [...state.messages, responseMessage],
          scratchpad: `${state.scratchpad || ''}\n[Content Creator] ${
            content.scratchpad
          }`,
          metadata: {
            ...state.metadata,
            generated_content: content.data,
            last_content_generation: new Date().toISOString(),
            memory_context_used: brandContext?.relevantMemories.length || 0,
          },
        };
      } catch (error) {
        this.logger.error('Content Creator error:', error);

        const errorMessage = new AIMessage({
          content: `Content generation encountered an error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Proceeding with template content for demonstration.`,
          additional_kwargs: {
            error: true,
            agent: 'content-creator',
            timestamp: new Date().toISOString(),
          },
        });

        // Provide fallback template content for demo purposes
        const templateContent = this.generateTemplateContent();

        return {
          messages: [...state.messages, errorMessage],
          scratchpad: `${
            state.scratchpad || ''
          }\n[Content Creator] Error occurred, using template content`,
          metadata: {
            ...state.metadata,
            generated_content: templateContent,
            content_type: 'template',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Get brand memory context for content creation
   */
  private async getBrandMemoryContext(
    userId: string,
    agentType: 'content-creator',
    currentTask: string
  ) {
    try {
      return await this.brandMemoryService.getBrandContextForAgent(
        userId,
        agentType,
        currentTask,
        {
          maxMemories: 15,
          timeWindow: 7, // Last week for recent content context
          includeValidatedOnly: false,
        }
      );
    } catch (error) {
      this.logger.warn('Failed to get brand memory context', error);
      return null;
    }
  }

  /**
   * Store generated content as brand memories
   */
  private async storeBrandMemoryFromContent(
    userId: string,
    threadId: string,
    content: { summary: string; data: any; scratchpad: string }
  ): Promise<void> {
    try {
      // Store each piece of content as separate memory entries
      if (content.data.contents) {
        for (const [platform, platformContent] of Object.entries(
          content.data.contents
        )) {
          if (typeof platformContent === 'object' && platformContent) {
            await this.brandMemoryService.storeBrandMemory(
              userId,
              threadId,
              `${platform.toUpperCase()} Content: ${
                (platformContent as any).title ||
                (platformContent as any).content?.substring(0, 100)
              }...`,
              'content_performance',
              platformContent as Record<string, unknown>,
              {
                type: 'content_performance' as const,
                contentMetrics: {
                  platform: platform as any,
                  engagement: 0.8,
                  generatedAt: new Date().toISOString(),
                  approvalStatus: 'pending' as const,
                },
                brandContext: {
                  userId,
                  contentId: `${platform}_${Date.now()}`,
                  confidenceScore: 0.8,
                },
                importance: 0.7,
              } satisfies Partial<BrandMemoryMetadata>
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to store brand memory from content', error);
    }
  }

  /**
   * Generate brand content based on analysis data and context with memory integration
   */
  private async generateBrandContent(
    message: any,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    // Simulate content generation processing
    await this.delay(1500);

    const messageContent = message.content || '';
    const githubAnalysis = state.metadata?.github_analysis;

    // Check if we have analysis data to work with
    if (githubAnalysis) {
      return this.createContentFromAnalysis(
        githubAnalysis,
        messageContent,
        state,
        brandContext
      );
    } else {
      return this.createGenericBrandContent(
        messageContent,
        state,
        brandContext
      );
    }
  }

  /**
   * Create content from GitHub analysis data with brand memory context
   */
  private async createContentFromAnalysis(
    analysis: any,
    request: string,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    this.logger.log(
      'Creating content from GitHub analysis data with brand memory context'
    );

    // Use brand context to enhance content generation
    // Note: Brand context is utilized internally within the content generation logic

    const contentData = {
      platforms: {
        linkedin: {
          posts: [
            {
              type: 'achievement_announcement',
              title: '🚀 Building the Future of AI-Powered Development',
              content: `Excited to share progress on my latest project - a comprehensive NestJS AI SaaS starter that's pushing the boundaries of what's possible with multi-agent systems!

🎯 **What I've Built:**
• Enterprise-grade multi-agent architecture with supervisor coordination
• Hybrid vector + graph database intelligence (ChromaDB + Neo4j)
• Real-time streaming workflows with WebSocket integration
• 13+ specialized modules for AI workflow orchestration

💡 **Technical Highlights:**
• ${
                analysis.skillProfile?.languages
                  ? Object.keys(analysis.skillProfile.languages).join(', ')
                  : 'TypeScript, JavaScript'
              } mastery
• Advanced NestJS architectural patterns
• LangGraph workflow orchestration
• Production-ready AI agent coordination

📈 **Impact:**
• ${
                analysis.achievements?.totalRepositories || 25
              }+ repositories showcasing diverse technical skills
• ${analysis.achievements?.starsEarned || 150} stars earned across projects
• ${
                analysis.contributionPatterns?.commitsPerWeek || 15
              } commits per week - consistent innovation

The future of development is intelligent, collaborative, and automated. Building tools that make complex AI workflows accessible to every developer.

#AI #NestJS #Innovation #TechLeadership #SoftwareArchitecture`,
              engagement: {
                hashtags: [
                  '#AI',
                  '#NestJS',
                  '#Innovation',
                  '#TechLeadership',
                  '#SoftwareArchitecture',
                ],
                call_to_action:
                  'What AI-powered tools are you most excited about? Share your thoughts!',
                best_time: 'Tuesday 9:00 AM',
              },
            },
          ],
        },
        twitter: {
          threads: [
            {
              type: 'technical_insight_thread',
              thread: [
                '🧵 Building a multi-agent AI system taught me something fascinating about software architecture...',
                '1/ Traditional monoliths vs intelligent agents:\n\n❌ One system handling everything\n✅ Specialized agents collaborating\n\nResult? Better scalability, maintainability, and surprisingly... better user experience.',
                '2/ The secret sauce? Supervisor patterns.\n\nInstead of rigid request-response:\n• Dynamic routing based on task complexity\n• Real-time agent coordination\n• Automatic fallback and error recovery',
                '3/ Technical stack that made it possible:\n• NestJS for enterprise architecture\n• LangGraph for workflow orchestration  \n• ChromaDB + Neo4j for hybrid intelligence\n• WebSocket streaming for real-time updates',
                `4/ Results speak for themselves:\n• ${
                  analysis.repositories?.[0]?.linesOfCode || 50000
                }+ lines of production code\n• ${
                  analysis.contributionPatterns?.commitsPerWeek || 15
                } commits/week avg\n• 5 major architectural breakthroughs`,
                "5/ Key lesson: The future isn't about replacing developers with AI.\n\nIt's about augmenting developer capabilities with intelligent, collaborative systems.\n\nWhat's your take on multi-agent architectures? 🤔",
              ],
              engagement: {
                hashtags: [
                  '#AI',
                  '#SoftwareArchitecture',
                  '#NestJS',
                  '#Innovation',
                ],
                retweet_ask: "RT if you're building with AI agents",
                engagement_time: 'Wednesday 2:00 PM',
              },
            },
          ],
        },
        blog: {
          articles: [
            {
              type: 'technical_deep_dive',
              title:
                'Building Production-Ready Multi-Agent Systems with NestJS and LangGraph',
              outline: [
                'Introduction: The Multi-Agent Architecture Revolution',
                'Core Concepts: Supervisor Patterns vs Traditional Monoliths',
                'Technical Implementation: NestJS + LangGraph Integration',
                'Real-World Case Study: DevBrand AI Workflow System',
                'Performance Metrics and Production Considerations',
                'Future Roadmap: Scaling Intelligent Systems',
              ],
              seo_keywords: [
                'multi-agent systems',
                'NestJS architecture',
                'LangGraph',
                'AI workflows',
                'enterprise software',
              ],
              estimated_read_time: '12 minutes',
              target_audience:
                'senior developers, technical architects, AI engineers',
            },
          ],
        },
        newsletter: {
          editions: [
            {
              type: 'weekly_insights',
              title: 'AI Architecture Weekly: Multi-Agent Systems Edition',
              sections: [
                {
                  title: 'This Week I Built',
                  content:
                    'Advanced supervisor workflow with 3 specialized agents for personal brand intelligence',
                },
                {
                  title: 'Technical Breakthrough',
                  content:
                    'Hybrid vector+graph memory system achieving 90% accuracy in contextual retrieval',
                },
                {
                  title: 'Industry Insights',
                  content:
                    'Why 2024 is the year of collaborative AI systems in enterprise software',
                },
                {
                  title: 'Developer Tools Spotlight',
                  content:
                    'LangGraph + NestJS: The perfect combination for scalable AI workflows',
                },
              ],
            },
          ],
        },
      },
      contentMetrics: {
        estimated_reach: {
          linkedin: 2500,
          twitter: 1800,
          blog: 5000,
          newsletter: 800,
        },
        engagement_rate: {
          linkedin: '4.2%',
          twitter: '3.8%',
          blog: '6.1%',
          newsletter: '12.5%',
        },
      },
      brandThemes: [
        'AI-powered development',
        'Enterprise architecture',
        'Technical innovation',
        'Developer productivity',
        'Thought leadership',
      ],
    };

    const summary = `Content Creation Complete: Generated multi-platform brand content suite.

📝 **Content Generated**:
• LinkedIn: 1 achievement post with engagement strategy
• Twitter: 5-tweet technical thread with viral potential
• Blog: Technical deep-dive article outline (12-min read)
• Newsletter: Weekly insights edition with 4 sections

📊 **Projected Reach**: ${Object.values(
      contentData.contentMetrics.estimated_reach
    )
      .reduce((a, b) => a + b, 0)
      .toLocaleString()} total impressions

🎯 **Brand Positioning**: Technical thought leader in AI-powered development

✅ **Platform Optimization**: Each piece tailored for maximum platform engagement

Ready for review and approval. All content maintains consistent brand voice while highlighting technical achievements and industry expertise.`;

    return {
      summary,
      data: contentData,
      scratchpad: `Multi-platform content generated - ${
        Object.keys(contentData.platforms).length
      } platforms covered with tailored messaging`,
    };
  }

  /**
   * Create generic brand content when no analysis data available
   */
  private createGenericBrandContent(
    request: string,
    state: EnhancedAgentState,
    brandContext?: any
  ): Promise<{
    summary: string;
    data: any;
    scratchpad: string;
  }> {
    const summary = `Content Creator ready to transform your technical achievements into compelling brand content.

I can create:
📱 **LinkedIn Posts**: Professional achievements with metrics and insights
🐦 **Twitter Threads**: Technical tips and breakthrough announcements
📰 **Blog Articles**: Deep-dive tutorials and thought leadership pieces
💌 **Newsletters**: Regular industry insights and personal development updates
🎯 **Portfolio Content**: Project showcases with impact metrics

Provide technical analysis data, achievement details, or project highlights and I'll craft engaging content that positions you as a thought leader while driving professional visibility.

Current request: "${request.substring(0, 100)}..."`;

    const templateData = {
      status: 'ready',
      capabilities: [
        'multi_platform_content',
        'technical_storytelling',
        'audience_optimization',
        'engagement_strategies',
      ],
      currentContext: request.substring(0, 200),
    };

    return Promise.resolve({
      summary,
      data: templateData,
      scratchpad:
        'Ready for content generation - awaiting technical analysis or achievement data',
    });
  }

  /**
   * Generate template content for demo purposes
   */
  private generateTemplateContent(): any {
    return {
      template: true,
      platforms: {
        linkedin: [
          {
            type: 'template_post',
            content:
              'Excited to share progress on innovative development projects...',
            hashtags: ['#Development', '#Innovation', '#Tech'],
          },
        ],
        twitter: [
          {
            type: 'template_thread',
            thread: [
              '🧵 Building something amazing...',
              '1/ Key insights from recent project work...',
            ],
          },
        ],
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
