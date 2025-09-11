import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';

/**
 * Achievement Extractor Tool Schema
 * Defines the input parameters for technical achievement extraction and analysis
 */
const AchievementExtractorSchema = z.object({
  analysisData: z
    .any()
    .describe('GitHub analysis data or technical profile data'),
  extractionFocus: z
    .enum(['technical', 'leadership', 'innovation', 'impact', 'comprehensive'])
    .default('comprehensive')
    .describe('Focus area for achievement extraction'),
  audienceLevel: z
    .enum(['technical', 'business', 'general', 'academic'])
    .default('technical')
    .describe('Target audience level for achievement framing'),
  quantifyImpact: z
    .boolean()
    .default(true)
    .describe('Include quantified impact metrics where possible'),
  includeMetrics: z
    .boolean()
    .default(true)
    .describe('Include specific technical metrics and KPIs'),
  timeframe: z
    .enum(['recent', 'career', 'all'])
    .default('career')
    .describe('Time scope for achievement extraction'),
});

type AchievementExtractorInput = z.infer<typeof AchievementExtractorSchema>;

/**
 * Technical Achievement Categories for Structured Extraction
 */
export interface TechnicalAchievement {
  category:
    | 'architecture'
    | 'innovation'
    | 'scale'
    | 'performance'
    | 'leadership'
    | 'contribution'
    | 'learning';
  title: string;
  description: string;
  impact: {
    quantified: string[];
    qualitative: string[];
  };
  technologies: string[];
  context: string;
  businessValue?: string;
  learningOutcome?: string;
  recognitionReceived?: string;
}

export interface AchievementPortfolio {
  summary: {
    totalAchievements: number;
    primaryStrengths: string[];
    uniqueValueProposition: string;
    careerProgression: string;
  };
  categories: {
    architecture: TechnicalAchievement[];
    innovation: TechnicalAchievement[];
    scale: TechnicalAchievement[];
    performance: TechnicalAchievement[];
    leadership: TechnicalAchievement[];
    contribution: TechnicalAchievement[];
    learning: TechnicalAchievement[];
  };
  highlights: {
    signature: TechnicalAchievement;
    recent: TechnicalAchievement[];
    impactful: TechnicalAchievement[];
  };
  metrics: {
    technicalBreadth: number;
    impactScore: number;
    innovationIndex: number;
    leadershipQuotient: number;
  };
  recommendations: {
    contentThemes: string[];
    positioningStatements: string[];
    thoughtLeadershipAreas: string[];
    networkingOpportunities: string[];
  };
}

/**
 * Achievement Extractor Tool for Multi-Agent System
 *
 * Analyzes technical profiles and project data to extract, categorize, and quantify
 * professional achievements for personal brand development and content creation.
 *
 * Features:
 * - Multi-dimensional achievement categorization
 * - Impact quantification and business value assessment
 * - Audience-specific achievement framing
 * - Career progression narrative development
 * - Competitive differentiation analysis
 * - Content theme recommendation
 * - Strategic positioning insights
 */
@Injectable()
export class AchievementExtractorTool extends StructuredTool {
  name = 'achievement_extractor';
  description = `Extract and analyze technical achievements from profile data for personal brand development.
  
  This tool processes GitHub analysis, project portfolios, and technical profiles to:
  - Categorize achievements by type (architecture, innovation, scale, performance, leadership)
  - Quantify impact with specific metrics and business value
  - Frame achievements for different audience levels
  - Identify signature accomplishments and career highlights
  - Generate positioning statements and content themes
  - Provide strategic recommendations for professional development
  
  Output includes structured achievement portfolio optimized for content creation and strategic planning.`;

  schema = AchievementExtractorSchema;

  private readonly logger = new Logger(AchievementExtractorTool.name);

  constructor() {
    super();
  }

  /**
   * Execute achievement extraction and analysis
   */
  protected async _call(input: AchievementExtractorInput): Promise<string> {
    this.logger.log('Executing achievement extraction and analysis');

    try {
      // Process input data and extract achievements
      const achievements = await this.extractAchievements(
        input.analysisData,
        input
      );

      // Categorize and structure achievements
      const portfolio = this.buildAchievementPortfolio(achievements, input);

      // Generate strategic recommendations
      const recommendations = this.generateRecommendations(portfolio, input);

      // Create final structured output
      const finalOutput = {
        ...portfolio,
        recommendations,
        extraction: {
          focus: input.extractionFocus,
          audienceLevel: input.audienceLevel,
          timeframe: input.timeframe,
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.log(
        `Achievement extraction completed: ${portfolio.summary.totalAchievements} achievements identified`
      );

      return JSON.stringify(finalOutput, null, 2);
    } catch (error) {
      this.logger.error('Achievement extraction failed:', error);

      // Return error with guidance
      const errorOutput = {
        error: true,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        guidance: {
          suggestion:
            'Ensure analysis data contains project information and technical details',
          fallback:
            'Consider using template achievements for demonstration purposes',
          timestamp: new Date().toISOString(),
        },
      };

      return JSON.stringify(errorOutput, null, 2);
    }
  }

  /**
   * Extract achievements from analysis data
   */
  private async extractAchievements(
    analysisData: any,
    input: AchievementExtractorInput
  ): Promise<TechnicalAchievement[]> {
    const achievements: TechnicalAchievement[] = [];

    // Extract from GitHub analysis data if available
    if (analysisData?.repositories) {
      achievements.push(
        ...this.extractRepositoryAchievements(analysisData, input)
      );
    }

    if (analysisData?.contributionStats) {
      achievements.push(
        ...this.extractContributionAchievements(analysisData, input)
      );
    }

    if (analysisData?.achievements) {
      achievements.push(...this.extractSkillAchievements(analysisData, input));
    }

    // Generate template achievements if no data available
    if (achievements.length === 0) {
      achievements.push(...this.generateTemplateAchievements(input));
    }

    // Filter by focus and timeframe
    return this.filterAchievements(achievements, input);
  }

  /**
   * Extract achievements from repository data
   */
  private extractRepositoryAchievements(
    data: any,
    input: AchievementExtractorInput
  ): TechnicalAchievement[] {
    const achievements: TechnicalAchievement[] = [];

    for (const repo of data.repositories || []) {
      // Architecture achievements
      if (repo.size > 10000 || Object.keys(repo.languages || {}).length > 3) {
        achievements.push({
          category: 'architecture',
          title: `Complex ${repo.language || 'Multi-language'} Architecture`,
          description: `Designed and implemented ${
            repo.name
          }, a comprehensive ${
            repo.language || 'multi-technology'
          } project demonstrating scalable architecture patterns`,
          impact: {
            quantified: [
              `${Math.floor(repo.size / 1000)}k+ lines of code`,
              `${
                Object.keys(repo.languages || {}).length
              } programming languages`,
              ...(repo.stargazersCount > 0
                ? [`${repo.stargazersCount} GitHub stars`]
                : []),
            ],
            qualitative: [
              'Scalable system design',
              'Multi-technology integration',
              'Production-ready architecture',
            ],
          },
          technologies: Object.keys(repo.languages || {}),
          context:
            repo.description || `Full-stack ${repo.language} application`,
          businessValue: this.assessBusinessValue(repo),
          recognitionReceived:
            repo.stargazersCount > 10
              ? `${repo.stargazersCount} stars from developer community`
              : undefined,
        });
      }

      // Innovation achievements
      if (
        repo.topics?.some((topic: string) =>
          ['ai', 'ml', 'blockchain', 'web3', 'quantum'].includes(
            topic.toLowerCase()
          )
        )
      ) {
        achievements.push({
          category: 'innovation',
          title: `Cutting-edge Technology Implementation`,
          description: `Pioneered ${repo.topics
            .filter((t: string) =>
              ['ai', 'ml', 'blockchain', 'web3', 'quantum'].includes(
                t.toLowerCase()
              )
            )
            .join(' and ')} integration in ${repo.name}`,
          impact: {
            quantified: [
              `${repo.topics.length} advanced technology domains`,
              ...(repo.forksCount > 0
                ? [`${repo.forksCount} community forks`]
                : []),
            ],
            qualitative: [
              'Technology innovation leadership',
              'Early adopter of emerging technologies',
              'Research and development contribution',
            ],
          },
          technologies: repo.topics || [],
          context: 'Emerging technology exploration and implementation',
          learningOutcome: `Advanced expertise in ${
            repo.topics?.join(', ') || 'emerging technologies'
          }`,
        });
      }

      // Scale achievements
      if (repo.stargazersCount > 50 || repo.forksCount > 20) {
        achievements.push({
          category: 'scale',
          title: 'High-Impact Open Source Project',
          description: `Developed ${repo.name}, achieving significant community adoption and engagement`,
          impact: {
            quantified: [
              `${repo.stargazersCount} stars`,
              `${repo.forksCount} forks`,
              'Community-driven development',
            ],
            qualitative: [
              'Open source leadership',
              'Community building',
              'Knowledge sharing contribution',
            ],
          },
          technologies: Object.keys(repo.languages || {}),
          context: 'Open source ecosystem contribution',
          recognitionReceived: `Recognized by ${
            repo.stargazersCount + repo.forksCount
          } developers globally`,
        });
      }
    }

    return achievements;
  }

  /**
   * Extract achievements from contribution statistics
   */
  private extractContributionAchievements(
    data: any,
    input: AchievementExtractorInput
  ): TechnicalAchievement[] {
    const achievements: TechnicalAchievement[] = [];
    const stats = data.contributionStats;

    // Performance/productivity achievements
    if (stats.averageCommitsPerWeek > 15) {
      achievements.push({
        category: 'performance',
        title: 'High-Velocity Development Consistency',
        description:
          'Maintained exceptionally high development velocity with consistent, quality contributions',
        impact: {
          quantified: [
            `${stats.totalCommits} total commits`,
            `${stats.averageCommitsPerWeek} commits per week average`,
            `${stats.currentStreak} day current streak`,
          ],
          qualitative: [
            'Exceptional productivity',
            'Consistent delivery',
            'Reliable development partner',
          ],
        },
        technologies: Object.keys(stats.languages || {}),
        context: 'Sustained high-performance development practices',
        businessValue: 'Reliable delivery and rapid feature development',
      });
    }

    // Leadership achievements
    if (
      data.achievements?.contributionPatterns?.collaborationStyle === 'leader'
    ) {
      achievements.push({
        category: 'leadership',
        title: 'Technical Leadership and Mentorship',
        description:
          'Demonstrated technical leadership through code reviews, architecture decisions, and team collaboration',
        impact: {
          quantified: [
            `${stats.totalPullRequests} pull requests`,
            `${stats.totalReviews} code reviews`,
            'Leadership collaboration pattern',
          ],
          qualitative: [
            'Technical leadership',
            'Code quality advocacy',
            'Team collaboration excellence',
          ],
        },
        technologies: Object.keys(stats.languages || {}),
        context: 'Technical team leadership and mentorship',
        businessValue: 'Improved team productivity and code quality',
      });
    }

    // Learning achievements
    if (Object.keys(stats.languages || {}).length > 5) {
      achievements.push({
        category: 'learning',
        title: 'Multi-Language Technical Mastery',
        description:
          'Demonstrated proficiency across diverse programming languages and technology stacks',
        impact: {
          quantified: [
            `${Object.keys(stats.languages).length} programming languages`,
            `${stats.frameworks?.length || 0} frameworks/libraries`,
            'Polyglot developer profile',
          ],
          qualitative: [
            'Rapid technology adoption',
            'Versatile problem solving',
            'Continuous learning mindset',
          ],
        },
        technologies: Object.keys(stats.languages || {}),
        context: 'Continuous learning and skill development',
        learningOutcome: 'Broad technical expertise and adaptability',
      });
    }

    return achievements;
  }

  /**
   * Extract achievements from skill assessments
   */
  private extractSkillAchievements(
    data: any,
    input: AchievementExtractorInput
  ): TechnicalAchievement[] {
    const achievements: TechnicalAchievement[] = [];
    const skillData = data.achievements;

    // Expert-level skill achievements
    const expertSkills = Object.entries(skillData.technicalSkills || {})
      .filter(([, level]) => level === 'expert')
      .map(([skill]) => skill);

    if (expertSkills.length > 0) {
      achievements.push({
        category: 'architecture',
        title: `${expertSkills.join('/')} Technical Expertise`,
        description: `Achieved expert-level proficiency in ${expertSkills.join(
          ' and '
        )}, enabling complex system design and implementation`,
        impact: {
          quantified: [
            `${expertSkills.length} expert-level technologies`,
            'Production system implementations',
            'Advanced architecture patterns',
          ],
          qualitative: [
            'Deep technical expertise',
            'Complex problem solving',
            'Architecture decision leadership',
          ],
        },
        technologies: expertSkills,
        context: 'Advanced technical skill development and application',
        businessValue:
          'Capable of handling complex technical challenges independently',
      });
    }

    // Industry relevance achievements
    if (skillData.industryRelevance?.trending?.length > 0) {
      achievements.push({
        category: 'innovation',
        title: 'Emerging Technology Adoption',
        description: `Early adoption and implementation of trending technologies: ${skillData.industryRelevance.trending.join(
          ', '
        )}`,
        impact: {
          quantified: [
            `${skillData.industryRelevance.trending.length} trending technologies`,
            'Early adopter status',
            'Industry trend alignment',
          ],
          qualitative: [
            'Innovation leadership',
            'Market trend awareness',
            'Future-oriented development',
          ],
        },
        technologies: skillData.industryRelevance.trending,
        context: 'Emerging technology research and implementation',
        businessValue:
          'Competitive advantage through early technology adoption',
      });
    }

    return achievements;
  }

  /**
   * Generate template achievements for demonstration
   */
  private generateTemplateAchievements(
    input: AchievementExtractorInput
  ): TechnicalAchievement[] {
    return [
      {
        category: 'architecture',
        title: 'Enterprise-Scale System Architecture',
        description:
          'Designed and implemented scalable enterprise architecture supporting high-availability requirements',
        impact: {
          quantified: [
            '99.9% uptime',
            '10k+ concurrent users',
            '50+ microservices',
          ],
          qualitative: [
            'Scalable design',
            'High availability',
            'Performance optimization',
          ],
        },
        technologies: ['TypeScript', 'NestJS', 'PostgreSQL', 'Redis', 'Docker'],
        context: 'Enterprise application development',
        businessValue:
          'Reduced infrastructure costs by 30% while improving performance',
      },
      {
        category: 'innovation',
        title: 'AI-Powered Development Tools',
        description:
          'Pioneered integration of AI/ML capabilities into development workflows and business processes',
        impact: {
          quantified: [
            '3 AI models deployed',
            '40% productivity increase',
            '15+ automation workflows',
          ],
          qualitative: [
            'Innovation leadership',
            'Process automation',
            'Efficiency improvements',
          ],
        },
        technologies: ['Python', 'TensorFlow', 'LangChain', 'OpenAI API'],
        context: 'AI integration and automation',
        learningOutcome: 'Advanced AI/ML implementation expertise',
      },
    ];
  }

  /**
   * Filter achievements based on input criteria
   */
  private filterAchievements(
    achievements: TechnicalAchievement[],
    input: AchievementExtractorInput
  ): TechnicalAchievement[] {
    let filtered = achievements;

    // Filter by extraction focus
    if (input.extractionFocus !== 'comprehensive') {
      filtered = filtered.filter(
        (achievement) => achievement.category === input.extractionFocus
      );
    }

    // Sort by impact and relevance
    filtered.sort((a, b) => {
      const scoreA = this.calculateAchievementScore(a);
      const scoreB = this.calculateAchievementScore(b);
      return scoreB - scoreA;
    });

    return filtered;
  }

  /**
   * Build comprehensive achievement portfolio
   */
  private buildAchievementPortfolio(
    achievements: TechnicalAchievement[],
    input: AchievementExtractorInput
  ): AchievementPortfolio {
    // Categorize achievements
    const categories = {
      architecture: achievements.filter((a) => a.category === 'architecture'),
      innovation: achievements.filter((a) => a.category === 'innovation'),
      scale: achievements.filter((a) => a.category === 'scale'),
      performance: achievements.filter((a) => a.category === 'performance'),
      leadership: achievements.filter((a) => a.category === 'leadership'),
      contribution: achievements.filter((a) => a.category === 'contribution'),
      learning: achievements.filter((a) => a.category === 'learning'),
    };

    // Identify highlights
    const sortedByScore = [...achievements].sort(
      (a, b) =>
        this.calculateAchievementScore(b) - this.calculateAchievementScore(a)
    );

    const highlights = {
      signature: sortedByScore[0],
      recent: sortedByScore.slice(0, 3),
      impactful: sortedByScore
        .filter((a) => a.impact.quantified.length > 2)
        .slice(0, 3),
    };

    // Calculate metrics
    const metrics = {
      technicalBreadth: this.calculateTechnicalBreadth(achievements),
      impactScore: this.calculateImpactScore(achievements),
      innovationIndex: this.calculateInnovationIndex(achievements),
      leadershipQuotient: this.calculateLeadershipQuotient(achievements),
    };

    // Generate summary
    const primaryStrengths = this.identifyPrimaryStrengths(categories);
    const uniqueValueProposition = this.generateValueProposition(
      achievements,
      metrics
    );
    const careerProgression = this.assessCareerProgression(achievements);

    return {
      summary: {
        totalAchievements: achievements.length,
        primaryStrengths,
        uniqueValueProposition,
        careerProgression,
      },
      categories,
      highlights,
      metrics,
      recommendations: {
        contentThemes: [],
        positioningStatements: [],
        thoughtLeadershipAreas: [],
        networkingOpportunities: [],
      }, // Will be populated separately
    };
  }

  /**
   * Generate strategic recommendations
   */
  private generateRecommendations(
    portfolio: AchievementPortfolio,
    input: AchievementExtractorInput
  ) {
    const contentThemes = this.generateContentThemes(portfolio);
    const positioningStatements = this.generatePositioningStatements(portfolio);
    const thoughtLeadershipAreas =
      this.identifyThoughtLeadershipAreas(portfolio);
    const networkingOpportunities =
      this.identifyNetworkingOpportunities(portfolio);

    return {
      contentThemes,
      positioningStatements,
      thoughtLeadershipAreas,
      networkingOpportunities,
      careerDevelopment: {
        nextLevelSkills: this.identifyNextLevelSkills(portfolio),
        visibilityStrategies: this.generateVisibilityStrategies(portfolio),
        industryPositioning: this.generateIndustryPositioning(portfolio),
      },
    };
  }

  /**
   * Utility methods for analysis calculations
   */
  private assessBusinessValue(repo: any): string {
    if (repo.stargazersCount > 100) {
      return 'High community value and industry recognition';
    } else if (repo.size > 50000) {
      return 'Enterprise-scale complexity and business impact';
    } else if (repo.topics?.includes('ai') || repo.topics?.includes('ml')) {
      return 'Strategic technology investment and innovation';
    }
    return 'Technical skill demonstration and professional development';
  }

  private calculateAchievementScore(achievement: TechnicalAchievement): number {
    let score = 0;
    score += achievement.impact.quantified.length * 2;
    score += achievement.impact.qualitative.length;
    score += achievement.technologies.length * 0.5;
    if (achievement.businessValue) score += 3;
    if (achievement.recognitionReceived) score += 2;
    return score;
  }

  private calculateTechnicalBreadth(
    achievements: TechnicalAchievement[]
  ): number {
    const allTechnologies = new Set();
    achievements.forEach((a) =>
      a.technologies.forEach((tech) => allTechnologies.add(tech))
    );
    return Math.min(allTechnologies.size / 10, 1);
  }

  private calculateImpactScore(achievements: TechnicalAchievement[]): number {
    const totalQuantified = achievements.reduce(
      (sum, a) => sum + a.impact.quantified.length,
      0
    );
    return Math.min(totalQuantified / achievements.length / 3, 1);
  }

  private calculateInnovationIndex(
    achievements: TechnicalAchievement[]
  ): number {
    const innovationAchievements = achievements.filter(
      (a) => a.category === 'innovation'
    ).length;
    return Math.min((innovationAchievements / achievements.length) * 2, 1);
  }

  private calculateLeadershipQuotient(
    achievements: TechnicalAchievement[]
  ): number {
    const leadershipAchievements = achievements.filter(
      (a) => a.category === 'leadership'
    ).length;
    return Math.min((leadershipAchievements / achievements.length) * 3, 1);
  }

  private identifyPrimaryStrengths(categories: any): string[] {
    return Object.entries(categories)
      .filter(([, achievements]: [string, any[]]) => achievements.length > 0)
      .sort(
        ([, a]: [string, any[]], [, b]: [string, any[]]) => b.length - a.length
      )
      .slice(0, 3)
      .map(([category]) => category);
  }

  private generateValueProposition(
    achievements: TechnicalAchievement[],
    metrics: any
  ): string {
    const topCategory = achievements.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryStrength =
      Object.entries(topCategory).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'technical';

    const strengthDescriptions = {
      architecture: 'scalable system design and enterprise architecture',
      innovation: 'cutting-edge technology adoption and innovation',
      scale: 'high-impact project development and community building',
      performance: 'high-velocity development and optimization',
      leadership: 'technical leadership and team collaboration',
      contribution: 'open source contribution and knowledge sharing',
      learning: 'rapid technology adoption and continuous learning',
    };

    return `Expert in ${
      strengthDescriptions[
        primaryStrength as keyof typeof strengthDescriptions
      ] || 'software development'
    } with proven track record of delivering business value`;
  }

  private assessCareerProgression(
    achievements: TechnicalAchievement[]
  ): string {
    const hasLeadership = achievements.some((a) => a.category === 'leadership');
    const hasInnovation = achievements.some((a) => a.category === 'innovation');
    const hasScale = achievements.some((a) => a.category === 'scale');

    if (hasLeadership && hasInnovation && hasScale) {
      return 'Senior/Principal level with leadership and innovation experience';
    } else if (hasLeadership || hasInnovation) {
      return 'Mid-to-Senior level with specialization potential';
    } else {
      return 'Growing technical expertise with advancement opportunities';
    }
  }

  private generateContentThemes(portfolio: AchievementPortfolio): string[] {
    const themes = [];
    const { categories } = portfolio;

    if (categories.architecture.length > 0)
      themes.push('System Architecture & Design Patterns');
    if (categories.innovation.length > 0)
      themes.push('Emerging Technology Adoption');
    if (categories.scale.length > 0)
      themes.push('Building High-Impact Projects');
    if (categories.performance.length > 0)
      themes.push('Development Productivity & Best Practices');
    if (categories.leadership.length > 0)
      themes.push('Technical Leadership & Mentorship');

    return themes;
  }

  private generatePositioningStatements(
    portfolio: AchievementPortfolio
  ): string[] {
    return [
      portfolio.summary.uniqueValueProposition,
      `${
        portfolio.summary.careerProgression
      } focused on ${portfolio.summary.primaryStrengths.join(' and ')}`,
      `Technical innovator with ${portfolio.summary.totalAchievements} documented achievements across ${portfolio.summary.primaryStrengths.length} key areas`,
    ];
  }

  private identifyThoughtLeadershipAreas(
    portfolio: AchievementPortfolio
  ): string[] {
    const areas = [];
    if (portfolio.categories.innovation.length > 0)
      areas.push('Technology Innovation & Adoption');
    if (portfolio.categories.architecture.length > 0)
      areas.push('Enterprise Architecture & System Design');
    if (portfolio.categories.leadership.length > 0)
      areas.push('Technical Leadership & Team Development');
    return areas;
  }

  private identifyNetworkingOpportunities(
    portfolio: AchievementPortfolio
  ): string[] {
    return [
      'Technical conferences and speaking opportunities',
      'Industry meetups and developer communities',
      'Open source project collaboration',
      'Mentorship and knowledge sharing platforms',
    ];
  }

  private identifyNextLevelSkills(portfolio: AchievementPortfolio): string[] {
    const skills = [];
    if (portfolio.categories.leadership.length === 0)
      skills.push('Technical leadership and mentorship');
    if (portfolio.categories.innovation.length === 0)
      skills.push('Emerging technology exploration');
    if (portfolio.categories.scale.length === 0)
      skills.push('Large-scale system design');
    return skills;
  }

  private generateVisibilityStrategies(
    portfolio: AchievementPortfolio
  ): string[] {
    return [
      'Regular technical blog posts showcasing achievements',
      'Conference speaking on areas of expertise',
      'Open source project leadership and contribution',
      'Industry community participation and networking',
    ];
  }

  private generateIndustryPositioning(portfolio: AchievementPortfolio): string {
    return `Position as ${portfolio.summary.uniqueValueProposition.toLowerCase()} with focus on ${portfolio.summary.primaryStrengths.join(
      ', '
    )} to establish thought leadership in the developer community`;
  }
}
