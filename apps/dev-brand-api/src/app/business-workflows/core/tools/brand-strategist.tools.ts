/**
 * Brand Strategist Tools
 *
 * Reusable tools for personal brand analysis, optimization, and strategy generation.
 * These tools provide brand-related capabilities that can be used by any agent or workflow.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '@hive-academy/langgraph-multi-agent';
import { PersonalBrandMemoryService } from '../memory/personal-brand-memory.service';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { BrandData, BrandAnalysis } from '../../agents/shared/agent.types';

/**
 * Response type for memory analysis tool
 */
export interface MemoryAnalysisResponse {
  success: boolean;
  analysis: {
    devContextInsights: {
      primaryFocus: string;
      experienceLevel: string;
      technicalStrengths: string[];
      workingPatterns: string[];
    };
    brandEvolutionInsights: {
      evolutionStage: string;
      growthIndicators: string[];
      consistencyScore: number;
      timelineHighlights: string[];
    };
    brandVoiceInsights: {
      communicationStyle: string;
      toneCharacteristics: string[];
      uniqueElements: string[];
      authenticity: number;
    };
    overallHealth: {
      score: number;
      status: 'strong' | 'developing' | 'needs-attention';
      keyFindings: string[];
    };
  };
  dataTimestamp: string;
  githubUsername: string;
}

/**
 * Response type for brand optimization tool
 */
export interface BrandOptimizationResponse {
  success: boolean;
  optimizations: {
    amplifyStrengths: {
      strategies: string[];
      quickWins: string[];
      longTermInitiatives: string[];
    };
    thoughtLeadership: {
      contentTopics: string[];
      platforms: string[];
      engagementStrategy: string;
    };
    communityEngagement: {
      targetCommunities: string[];
      contributionOpportunities: string[];
      networkingStrategy: string;
    };
    contentCreation: {
      contentTypes: string[];
      frequency: string;
      distribution: string[];
    };
  };
  implementation: {
    priorityOrder: string[];
    estimatedTimeline: string;
    successMetrics: string[];
  };
  generatedAt: string;
  githubUsername: string;
}

/**
 * Response type for strategy generation tool
 */
export interface StrategyGenerationResponse {
  success: boolean;
  strategy: {
    strategyType: 'optimization' | 'rebuild';
    brandScore: number;
    foundation: {
      portfolioElements: string[];
      onlinePresence: string[];
      coreMessaging: string;
    };
    contentStrategy: {
      themes: string[];
      cadence: string;
      platforms: string[];
      formats: string[];
    };
    networking: {
      communities: string[];
      events: string[];
      collaborationOpportunities: string[];
    };
    skillDevelopment: {
      priorities: string[];
      learningPath: string[];
      certifications: string[];
    };
    timeline: {
      phase1: { duration: string; milestones: string[] };
      phase2: { duration: string; milestones: string[] };
      phase3: { duration: string; milestones: string[] };
    };
  };
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  generatedAt: string;
  githubUsername: string;
}

/**
 * Error response type for all tools
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorType: string;
  timestamp: string;
}

/**
 * Brand Strategist Tools - Injectable class with @Tool decorated methods
 */
@Injectable()
export class BrandStrategistTools {
  private readonly logger = new Logger(BrandStrategistTools.name);

  constructor(
    private readonly memory: PersonalBrandMemoryService,
    private readonly llm: LlmProviderService
  ) {}

  /**
   * Memory Analysis Tool
   *
   * Analyzes developer's memory data (devContext, brandEvolution, brandVoice)
   * to provide structured insights about their current brand state.
   *
   * @param githubUsername - GitHub username of the developer to analyze
   * @returns Structured analysis of memory data with insights
   */
  @Tool({
    name: 'memory-analysis',
    description:
      'Analyzes developer memory data to extract insights about brand context, evolution, and voice',
  })
  async analyzeMemory({
    githubUsername,
  }: {
    githubUsername: string;
  }): Promise<MemoryAnalysisResponse | ErrorResponse> {
    try {
      this.logger.debug(`Analyzing memory for GitHub user: ${githubUsername}`);

      // Gather memory data
      const [devContext, brandEvolution, brandVoice] = await Promise.all([
        this.memory.getDevContext(githubUsername),
        this.memory.getBrandEvolution(githubUsername),
        this.memory.getBrandVoice(githubUsername),
      ]);

      // Use LLM to analyze the memory data
      const analysisPrompt = `
Analyze the following developer memory data and provide structured insights:

Developer Context:
${JSON.stringify(devContext, null, 2)}

Brand Evolution:
${JSON.stringify(brandEvolution, null, 2)}

Brand Voice:
${JSON.stringify(brandVoice, null, 2)}

Provide analysis in the following JSON structure:
{
  "devContextInsights": {
    "primaryFocus": "main technical focus area",
    "experienceLevel": "junior|mid|senior|expert",
    "technicalStrengths": ["strength1", "strength2"],
    "workingPatterns": ["pattern1", "pattern2"]
  },
  "brandEvolutionInsights": {
    "evolutionStage": "emerging|developing|established|mature",
    "growthIndicators": ["indicator1", "indicator2"],
    "consistencyScore": 0.0-1.0,
    "timelineHighlights": ["highlight1", "highlight2"]
  },
  "brandVoiceInsights": {
    "communicationStyle": "description of style",
    "toneCharacteristics": ["characteristic1", "characteristic2"],
    "uniqueElements": ["element1", "element2"],
    "authenticity": 0.0-1.0
  },
  "overallHealth": {
    "score": 0.0-1.0,
    "status": "strong|developing|needs-attention",
    "keyFindings": ["finding1", "finding2"]
  }
}
`;

      const model = await this.llm.getLLM({
        temperature: 0.3,
        maxTokens: 1500,
      });

      const response = await model.invoke([
        { role: 'user', content: analysisPrompt },
      ]);

      let analysis;
      try {
        analysis = JSON.parse(response.content.toString());
      } catch (parseError) {
        this.logger.warn('LLM response not valid JSON, using fallback', {
          parseError,
        });
        // Fallback analysis
        analysis = {
          devContextInsights: {
            primaryFocus: 'Software Development',
            experienceLevel: 'mid',
            technicalStrengths: ['Problem Solving', 'Code Quality'],
            workingPatterns: ['Active contributor'],
          },
          brandEvolutionInsights: {
            evolutionStage: 'developing',
            growthIndicators: ['Regular activity', 'Portfolio growth'],
            consistencyScore: 0.7,
            timelineHighlights: ['Active development'],
          },
          brandVoiceInsights: {
            communicationStyle: 'Technical and professional',
            toneCharacteristics: ['Clear', 'Informative'],
            uniqueElements: ['Technical expertise'],
            authenticity: 0.8,
          },
          overallHealth: {
            score: 0.7,
            status: 'developing',
            keyFindings: [
              'Solid technical foundation',
              'Room for visibility growth',
            ],
          },
        };
      }

      return {
        success: true,
        analysis,
        dataTimestamp: new Date().toISOString(),
        githubUsername,
      };
    } catch (error: unknown) {
      this.logger.error('Memory analysis failed', {
        error,
        githubUsername,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during memory analysis',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Brand Optimization Tool
   *
   * Generates concrete optimization strategies for developers with established brands.
   * Focuses on amplifying strengths, thought leadership, community engagement, and content.
   *
   * @param githubUsername - GitHub username of the developer
   * @param brandAnalysis - Optional existing brand analysis
   * @returns Structured optimization recommendations
   */
  @Tool({
    name: 'brand-optimization',
    description:
      'Generates optimization strategies for established brands focusing on amplifying strengths and thought leadership',
  })
  async optimizeBrand({
    githubUsername,
    brandAnalysis,
  }: {
    githubUsername: string;
    brandAnalysis?: BrandAnalysis;
  }): Promise<BrandOptimizationResponse | ErrorResponse> {
    try {
      this.logger.debug(`Generating brand optimization for: ${githubUsername}`);

      // If no analysis provided, get memory data for context
      let contextData = '';
      if (!brandAnalysis) {
        const [devContext, brandVoice] = await Promise.all([
          this.memory.getDevContext(githubUsername),
          this.memory.getBrandVoice(githubUsername),
        ]);
        contextData = `
Developer Context: ${JSON.stringify(devContext)}
Brand Voice: ${JSON.stringify(brandVoice)}
`;
      } else {
        contextData = `
Brand Analysis:
- Strengths: ${brandAnalysis.strengths?.join(', ')}
- Positioning: ${brandAnalysis.positioning}
- Score: ${brandAnalysis.score}
`;
      }

      const optimizationPrompt = `
Generate brand optimization strategy for ${githubUsername} (established brand).

${contextData}

Provide comprehensive optimization strategy in the following JSON structure:
{
  "optimizations": {
    "amplifyStrengths": {
      "strategies": ["strategy1", "strategy2"],
      "quickWins": ["win1", "win2"],
      "longTermInitiatives": ["initiative1", "initiative2"]
    },
    "thoughtLeadership": {
      "contentTopics": ["topic1", "topic2"],
      "platforms": ["platform1", "platform2"],
      "engagementStrategy": "description of strategy"
    },
    "communityEngagement": {
      "targetCommunities": ["community1", "community2"],
      "contributionOpportunities": ["opportunity1", "opportunity2"],
      "networkingStrategy": "description of strategy"
    },
    "contentCreation": {
      "contentTypes": ["type1", "type2"],
      "frequency": "description",
      "distribution": ["channel1", "channel2"]
    }
  },
  "implementation": {
    "priorityOrder": ["item1", "item2"],
    "estimatedTimeline": "timeline description",
    "successMetrics": ["metric1", "metric2"]
  }
}
`;

      const model = await this.llm.getLLM({
        temperature: 0.5,
        maxTokens: 2000,
      });

      const response = await model.invoke([
        { role: 'user', content: optimizationPrompt },
      ]);

      let optimizationResult;
      try {
        optimizationResult = JSON.parse(response.content.toString());
      } catch (parseError) {
        this.logger.warn('LLM response not valid JSON, using fallback', {
          parseError,
        });
        // Fallback optimization
        optimizationResult = {
          optimizations: {
            amplifyStrengths: {
              strategies: [
                'Create technical content showcasing expertise',
                'Speak at industry events',
              ],
              quickWins: [
                'Update LinkedIn with recent achievements',
                'Share technical insights on Twitter',
              ],
              longTermInitiatives: [
                'Start a technical blog',
                'Build open source projects',
              ],
            },
            thoughtLeadership: {
              contentTopics: [
                'Best practices',
                'Industry trends',
                'Technical tutorials',
              ],
              platforms: ['LinkedIn', 'Dev.to', 'Medium', 'Personal blog'],
              engagementStrategy:
                'Regular content publication with community interaction',
            },
            communityEngagement: {
              targetCommunities: [
                'GitHub communities',
                'Stack Overflow',
                'Discord channels',
              ],
              contributionOpportunities: [
                'Code reviews',
                'Open source contributions',
                'Mentoring',
              ],
              networkingStrategy:
                'Active participation in technical discussions',
            },
            contentCreation: {
              contentTypes: [
                'Technical articles',
                'Code tutorials',
                'Case studies',
              ],
              frequency: 'Weekly or bi-weekly',
              distribution: ['Blog', 'Social media', 'Developer platforms'],
            },
          },
          implementation: {
            priorityOrder: [
              'Quick wins first',
              'Establish content rhythm',
              'Build community presence',
              'Long-term initiatives',
            ],
            estimatedTimeline:
              '3-6 months for foundation, ongoing optimization',
            successMetrics: [
              'Follower growth',
              'Engagement rates',
              'Content reach',
              'Community contributions',
            ],
          },
        };
      }

      return {
        success: true,
        ...optimizationResult,
        generatedAt: new Date().toISOString(),
        githubUsername,
      };
    } catch (error: unknown) {
      this.logger.error('Brand optimization failed', {
        error,
        githubUsername,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during brand optimization',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Strategy Generation Tool
   *
   * Generates comprehensive brand strategies (optimization or rebuild) with detailed
   * action plans, timelines, and success metrics.
   *
   * @param githubUsername - GitHub username of the developer
   * @param strategyType - Type of strategy: 'optimization' or 'rebuild'
   * @param brandData - Optional brand data for context
   * @param brandScore - Optional brand strength score (0-1)
   * @returns Comprehensive brand strategy with implementation plan
   */
  @Tool({
    name: 'strategy-generation',
    description:
      'Generates comprehensive brand strategies with detailed action plans, timelines, and success metrics',
  })
  async generateStrategy({
    githubUsername,
    strategyType,
    brandData,
    brandScore,
  }: {
    githubUsername: string;
    strategyType: 'optimization' | 'rebuild';
    brandData?: BrandData;
    brandScore?: number;
  }): Promise<StrategyGenerationResponse | ErrorResponse> {
    try {
      this.logger.debug(
        `Generating ${strategyType} strategy for: ${githubUsername}`
      );

      // Get brand context if not provided
      let contextData = '';
      if (brandData) {
        contextData = `
Tech Stack: ${brandData.techStack?.primary || 'Various'}
Repositories: ${brandData.techStack?.repositories || 0}
Achievements: ${brandData.achievements?.length || 0}
Brand Score: ${brandScore || 0.5}
`;
      } else {
        const devContext = await this.memory.getDevContext(githubUsername);
        contextData = `
Developer Context: ${JSON.stringify(devContext)}
Brand Score: ${brandScore || 0.5}
`;
      }

      const strategyPrompt = `
Generate comprehensive ${strategyType} strategy for ${githubUsername}.

${contextData}

Strategy Type: ${strategyType}
${
  strategyType === 'rebuild'
    ? 'Focus on foundation building and systematic growth.'
    : 'Focus on amplifying existing strengths and expanding reach.'
}

Provide strategy in the following JSON structure:
{
  "strategy": {
    "strategyType": "${strategyType}",
    "brandScore": ${brandScore || 0.5},
    "foundation": {
      "portfolioElements": ["element1", "element2"],
      "onlinePresence": ["presence1", "presence2"],
      "coreMessaging": "description of core message"
    },
    "contentStrategy": {
      "themes": ["theme1", "theme2"],
      "cadence": "frequency description",
      "platforms": ["platform1", "platform2"],
      "formats": ["format1", "format2"]
    },
    "networking": {
      "communities": ["community1", "community2"],
      "events": ["event1", "event2"],
      "collaborationOpportunities": ["opportunity1", "opportunity2"]
    },
    "skillDevelopment": {
      "priorities": ["priority1", "priority2"],
      "learningPath": ["step1", "step2"],
      "certifications": ["cert1", "cert2"]
    },
    "timeline": {
      "phase1": {
        "duration": "timeframe",
        "milestones": ["milestone1", "milestone2"]
      },
      "phase2": {
        "duration": "timeframe",
        "milestones": ["milestone1", "milestone2"]
      },
      "phase3": {
        "duration": "timeframe",
        "milestones": ["milestone1", "milestone2"]
      }
    }
  },
  "actionPlan": {
    "immediate": ["action1", "action2"],
    "shortTerm": ["action1", "action2"],
    "longTerm": ["action1", "action2"]
  }
}
`;

      const model = await this.llm.getLLM({
        temperature: 0.6,
        maxTokens: 2500,
      });

      const response = await model.invoke([
        { role: 'user', content: strategyPrompt },
      ]);

      let strategyResult;
      try {
        strategyResult = JSON.parse(response.content.toString());
      } catch (parseError) {
        this.logger.warn('LLM response not valid JSON, using fallback', {
          parseError,
        });
        // Fallback strategy
        strategyResult = {
          strategy: {
            strategyType,
            brandScore: brandScore || 0.5,
            foundation: {
              portfolioElements: [
                'Professional website',
                'GitHub portfolio',
                'Technical blog',
              ],
              onlinePresence: [
                'LinkedIn profile',
                'Twitter/X account',
                'Dev.to profile',
              ],
              coreMessaging:
                'Experienced developer focused on quality and innovation',
            },
            contentStrategy: {
              themes: [
                'Technical tutorials',
                'Best practices',
                'Project showcases',
              ],
              cadence: 'Weekly content publication',
              platforms: ['Personal blog', 'LinkedIn', 'Dev.to'],
              formats: ['Articles', 'Code examples', 'Video tutorials'],
            },
            networking: {
              communities: [
                'GitHub discussions',
                'Stack Overflow',
                'Discord communities',
              ],
              events: ['Local meetups', 'Online conferences', 'Hackathons'],
              collaborationOpportunities: [
                'Open source projects',
                'Pair programming',
                'Code reviews',
              ],
            },
            skillDevelopment: {
              priorities: [
                'Advanced architecture',
                'System design',
                'Leadership skills',
              ],
              learningPath: [
                'Online courses',
                'Books and articles',
                'Hands-on projects',
              ],
              certifications: [
                'Cloud certifications',
                'Platform-specific certs',
              ],
            },
            timeline: {
              phase1: {
                duration: '0-3 months',
                milestones: [
                  'Establish online presence',
                  'Create initial content',
                  'Join key communities',
                ],
              },
              phase2: {
                duration: '3-6 months',
                milestones: [
                  'Regular content publishing',
                  'Build community engagement',
                  'Expand network',
                ],
              },
              phase3: {
                duration: '6-12 months',
                milestones: [
                  'Thought leadership established',
                  'Strong community presence',
                  'Recognized expertise',
                ],
              },
            },
          },
          actionPlan: {
            immediate: [
              'Update all profiles',
              'Create content calendar',
              'Identify key communities',
            ],
            shortTerm: [
              'Publish first articles',
              'Join and participate in communities',
              'Start networking',
            ],
            longTerm: [
              'Establish thought leadership',
              'Build strong network',
              'Create signature content',
            ],
          },
        };
      }

      return {
        success: true,
        ...strategyResult,
        generatedAt: new Date().toISOString(),
        githubUsername,
      };
    } catch (error: unknown) {
      this.logger.error('Strategy generation failed', {
        error,
        githubUsername,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during strategy generation',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
