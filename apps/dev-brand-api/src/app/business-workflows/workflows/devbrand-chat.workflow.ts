import { Injectable } from '@nestjs/common';
import {
  FunctionalWorkflow,
  Entrypoint,
  Task,
  WorkflowType,
} from '@hive-academy/langgraph-workflow-engine';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
  FunctionalWorkflowState,
} from '@hive-academy/langgraph-workflow-engine';
import { LlmProviderService } from '@hive-academy/langgraph-workflow-engine';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';
import { GitHubIntegrationTools } from '../core/tools/github-integration.tools';
import { WebResearchTools } from '../core/tools/web-research.tools';

/**
 * DevBrand Chat Workflow - Simple Functional API Example for Chat Interface
 *
 * This streamlined workflow demonstrates a simple functional-api pattern
 * for the DevBrand Chat Studio MVP. It handles conversational interactions
 * with intelligent routing and memory integration.
 *
 * Flow:
 * 1. Parse user message and extract intent
 * 2. Retrieve relevant context from memory
 * 3. Route to appropriate action (analysis, content, strategy)
 * 4. Execute action with real business logic
 * 5. Generate conversational response
 *
 * Real Business Logic:
 * - ChromaDB: Semantic search for conversation context
 * - Neo4j: User relationship and preference mapping
 * - LLM: Conversational AI and content generation
 * - GitHub API: Real-time repository analysis
 * - Web Search: Social media profile discovery
 */

export interface ChatWorkflowState extends FunctionalWorkflowState {
  // Chat context
  userId: string;
  conversationId: string;
  userMessage: string;
  messageHistory: Array<{ role: string; content: string }>;

  // Intent analysis
  intent:
    | 'analyze-github'
    | 'create-content'
    | 'strategy-advice'
    | 'general-chat';
  entities: { githubUsername?: string; platforms?: string[]; topic?: string };
  confidence: number;

  // Memory context
  relevantMemories: any[];
  userPreferences: any;

  // Response generation
  response: string;
  suggestedActions: string[];
  requiresFollowup: boolean;
}

@FunctionalWorkflow({
  name: 'devbrand-chat-workflow',
  description: 'Conversational interface for DevBrand Chat Studio',
  type: WorkflowType.FUNCTIONAL_TASK, // 🔑 Explicit workflow type: uses @Entrypoint + @Task
  streaming: true,
  confidenceThreshold: 0.6,
})
@Injectable()
export class DevBrandChatWorkflow {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly brandMemory: PersonalBrandMemoryService,
    private readonly githubTools: GitHubIntegrationTools,
    private readonly webTools: WebResearchTools
  ) {}

  /**
   * Entry point - Parse user message and analyze intent
   */
  @Entrypoint({ timeout: 10000 })
  async parseUserMessage(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      // Use LLM to analyze user intent and extract entities
      const llm = await this.llmProvider.getLLM({
        temperature: 0.1,
        maxTokens: 200,
      });

      const intentPrompt = `Analyze this user message and determine intent:
Message: "${chatState.userMessage}"

Classify intent as one of: analyze-github, create-content, strategy-advice, general-chat
Extract entities like GitHub username, platforms (LinkedIn, Dev.to), topics.

Response format:
Intent: [intent]
Entities: {githubUsername: "...", platforms: [...], topic: "..."}
Confidence: [0.0-1.0]`;

      const intentResponse = await llm.invoke([
        { role: 'user', content: intentPrompt },
      ]);
      const intentAnalysis = this.parseIntentResponse(
        intentResponse.content.toString()
      );

      return {
        state: {
          ...chatState,
          intent: intentAnalysis.intent,
          entities: intentAnalysis.entities,
          confidence: intentAnalysis.confidence,
        },
      };
    } catch (error) {
      console.error('Intent analysis failed:', error);
      return {
        state: {
          ...chatState,
          intent: 'general-chat' as const,
          entities: {},
          confidence: 0.3,
        },
      };
    }
  }

  /**
   * Step 2: Retrieve relevant context from personal brand memory
   */
  @Task({ dependsOn: ['parseUserMessage'] })
  async retrieveContext(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      // Search for relevant memories based on user message using ChromaDB similarity search
      const searchResults =
        await this.brandMemory.getPersonalizedContentStrategy(
          chatState.userId,
          chatState.userMessage
        );

      // Get developer context which includes preferences and historical data
      const devContext = await this.brandMemory.getDevContext(chatState.userId);

      return {
        state: {
          ...chatState,
          relevantMemories: devContext.recentAchievements || [],
          userPreferences: searchResults || {},
        },
      };
    } catch (error) {
      console.error('Context retrieval failed:', error);
      return {
        state: {
          ...chatState,
          relevantMemories: [],
          userPreferences: {},
        },
      };
    }
  }

  /**
   * GitHub Analysis Action - Analyze user's GitHub activity
   * Note: Routing logic moved to conditional task dependencies
   */
  @Task({ dependsOn: ['retrieveContext'] })
  async executeGitHubAnalysis(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      const githubUsername = chatState.entities.githubUsername || 'demo-user';

      // Real GitHub analysis using tools
      const analysis = await this.githubTools.analyzeGitHubActivity({
        username: githubUsername,
        timeframe: 'month',
        includePrivate: false,
      });

      const achievements = await this.githubTools.extractAchievements({
        commits: analysis.commits,
        repositories: analysis.repositories,
        analysisDepth: 'detailed',
      });

      // Generate conversational response about GitHub analysis
      const llm = await this.llmProvider.getLLM({
        temperature: 0.7,
        maxTokens: 500,
      });
      const responsePrompt = `Create a conversational response about GitHub analysis results:

User: ${githubUsername}
Recent Activity: ${analysis.summary.totalCommits} commits, ${
        analysis.summary.totalRepositories
      } repositories
Key Achievements: ${achievements
        .slice(0, 3)
        .map((a) => a.description)
        .join(', ')}
Technologies: ${analysis.patterns.primaryLanguages.join(', ')}

Create a friendly, informative response highlighting key insights and suggestions.`;

      const response = await llm.invoke([
        { role: 'user', content: responsePrompt },
      ]);

      return {
        state: {
          ...chatState,
          response: response.content.toString(),
          suggestedActions: [
            'Create LinkedIn post about recent achievements',
            'Write Dev.to article about key technologies',
            'Update GitHub profile with insights',
          ],
          requiresFollowup: true,
        },
      };
    } catch (error) {
      console.error('GitHub analysis action failed:', error);
      return {
        state: {
          ...chatState,
          response:
            "I'd love to analyze your GitHub activity! Could you share your GitHub username?",
          suggestedActions: ['Share GitHub username'],
          requiresFollowup: true,
        },
      };
    }
  }

  /**
   * Content Creation Action - Generate social media content
   */
  @Task({ dependsOn: ['retrieveContext'] })
  async executeContentCreation(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      // Use relevant memories to inform content creation
      const contextInfo = chatState.relevantMemories
        .map((m) => m.content.substring(0, 100))
        .join(' ');

      // Generate platform-specific content using LLM
      const llm = await this.llmProvider.getLLM({
        temperature: 0.8,
        maxTokens: 600,
      });
      const contentPrompt = `Create social media content based on user request and context:

User Message: "${chatState.userMessage}"
User Context: ${contextInfo}
Platforms: ${chatState.entities.platforms?.join(', ') || 'LinkedIn, Dev.to'}

Generate engaging content that showcases technical expertise and personal brand.`;

      const contentResponse = await llm.invoke([
        { role: 'user', content: contentPrompt },
      ]);

      return {
        state: {
          ...chatState,
          response: contentResponse.content.toString(),
          suggestedActions: [
            'Review and edit content',
            'Schedule posts',
            'Analyze performance',
          ],
          requiresFollowup: false,
        },
      };
    } catch (error) {
      console.error('Content creation action failed:', error);
      return {
        state: {
          ...chatState,
          response:
            'I can help you create engaging content! What type of content would you like to focus on?',
          suggestedActions: ['Specify content type', 'Share recent projects'],
          requiresFollowup: true,
        },
      };
    }
  }

  /**
   * Strategy Advice Action - Provide personalized brand strategy guidance
   */
  @Task({ dependsOn: ['retrieveContext'] })
  async executeStrategyAdvice(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      // Analyze user's brand evolution from memory
      const brandHistory = chatState.relevantMemories.filter(
        (m) =>
          m.metadata?.type === 'brand-insight' ||
          m.metadata?.type === 'achievement'
      );

      // Use web research to find competitive insights if username provided
      let competitiveInsights = '';
      if (chatState.entities.githubUsername) {
        try {
          // Use web research tools to analyze social media presence
          const socialProfiles = await this.webTools.searchSocialProfiles({
            query: chatState.entities.githubUsername,
            platforms: ['linkedin', 'twitter', 'dev.to'],
            limit: 5,
          });
          competitiveInsights = `Based on analysis of ${socialProfiles.profiles.length} social profiles, you have opportunities to increase visibility in your core technologies.`;
        } catch (error) {
          competitiveInsights =
            'Based on your current online presence, you have opportunities to increase visibility in your core technologies.';
        }
      }

      // Generate strategic advice using LLM
      const llm = await this.llmProvider.getLLM({
        temperature: 0.6,
        maxTokens: 500,
      });
      const strategyPrompt = `Provide personalized brand strategy advice:

User Question: "${chatState.userMessage}"
Brand History: ${brandHistory.map((m) => m.content.substring(0, 50)).join(', ')}
Competitive Context: ${competitiveInsights}

Provide actionable, specific advice for improving their personal brand as a developer.`;

      const strategyResponse = await llm.invoke([
        { role: 'user', content: strategyPrompt },
      ]);

      return {
        state: {
          ...chatState,
          response: strategyResponse.content.toString(),
          suggestedActions: [
            'Implement recommended strategy',
            'Track progress metrics',
            'Schedule regular content',
          ],
          requiresFollowup: false,
        },
      };
    } catch (error) {
      console.error('Strategy advice action failed:', error);
      return {
        state: {
          ...chatState,
          response:
            "I'd be happy to help with your brand strategy! What specific area would you like to focus on?",
          suggestedActions: ['Define goals', 'Analyze current presence'],
          requiresFollowup: true,
        },
      };
    }
  }

  /**
   * General Chat Action - Handle casual conversation
   */
  @Task({ dependsOn: ['retrieveContext'] })
  async executeGeneralChat(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      // Generate friendly conversational response
      const llm = await this.llmProvider.getLLM({
        temperature: 0.9,
        maxTokens: 300,
      });
      const chatPrompt = `Respond as a friendly personal branding assistant:

User: "${chatState.userMessage}"

Provide a helpful, encouraging response and suggest ways I can help with their developer personal brand.`;

      const chatResponse = await llm.invoke([
        { role: 'user', content: chatPrompt },
      ]);

      return {
        state: {
          ...chatState,
          response: chatResponse.content.toString(),
          suggestedActions: [
            'Analyze your GitHub activity',
            'Create social media content',
            'Get brand strategy advice',
          ],
          requiresFollowup: false,
        },
      };
    } catch (error) {
      console.error('General chat action failed:', error);
      return {
        state: {
          ...chatState,
          response:
            "Hello! I'm here to help you build your personal brand as a developer. How can I assist you today?",
          suggestedActions: [
            'Analyze GitHub activity',
            'Create content',
            'Get strategy advice',
          ],
          requiresFollowup: false,
        },
      };
    }
  }

  /**
   * Final step: Store conversation in memory and prepare response
   */
  @Task({
    dependsOn: [
      'executeGitHubAnalysis',
      'executeContentCreation',
      'executeStrategyAdvice',
      'executeGeneralChat',
    ],
  })
  async finalizeConversation(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const chatState = state as ChatWorkflowState;

    try {
      // Store conversation as content performance for future analysis
      await this.brandMemory.storeContentPerformance(chatState.userId, {
        id: `conv-${chatState.conversationId}-${Date.now()}`,
        platform: 'devbrand-chat' as const,
        content: `User: ${chatState.userMessage}\nAssistant: ${chatState.response}`,
        engagementScore: chatState.confidence,
        metrics: {
          views: 1,
          likes: 0,
          comments: 0,
          shares: 0,
        },
        createdAt: new Date().toISOString(),
        userId: chatState.userId,
      });

      return {
        state: {
          ...chatState,
          messageHistory: [
            ...chatState.messageHistory,
            { role: 'user', content: chatState.userMessage },
            { role: 'assistant', content: chatState.response },
          ],
        },
      };
    } catch (error) {
      console.error('Conversation finalization failed:', error);
      return { state: chatState };
    }
  }

  /**
   * Helper method to parse LLM intent analysis response
   */
  private parseIntentResponse(response: string): {
    intent: ChatWorkflowState['intent'];
    entities: ChatWorkflowState['entities'];
    confidence: number;
  } {
    try {
      // Simple parsing - in production would use structured output
      const intentMatch = response.match(/Intent:\s*([^\n]+)/);
      const entitiesMatch = response.match(/Entities:\s*({[^}]+})/);
      const confidenceMatch = response.match(/Confidence:\s*([0-9.]+)/);

      const intent =
        (intentMatch?.[1]?.trim() as ChatWorkflowState['intent']) ||
        'general-chat';
      const entities = entitiesMatch?.[1] ? JSON.parse(entitiesMatch[1]) : {};
      const confidence = confidenceMatch?.[1]
        ? parseFloat(confidenceMatch[1])
        : 0.5;

      return { intent, entities, confidence };
    } catch (error) {
      return {
        intent: 'general-chat',
        entities: {},
        confidence: 0.3,
      };
    }
  }
}
