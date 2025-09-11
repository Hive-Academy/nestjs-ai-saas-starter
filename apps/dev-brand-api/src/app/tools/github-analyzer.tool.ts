import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import {
  GitHubIntegrationService,
  type GitHubAnalysisResult,
} from '../services/github-integration.service';

/**
 * GitHub Analyzer Tool Schema
 * Defines the input parameters for GitHub profile analysis
 */
const GitHubAnalyzerSchema = z.object({
  username: z.string().describe('GitHub username to analyze'),
  analysisType: z
    .enum(['profile', 'repositories', 'contributions', 'comprehensive'])
    .default('comprehensive')
    .describe('Type of analysis to perform'),
  includePrivate: z
    .boolean()
    .default(false)
    .describe('Include private repositories if accessible'),
  maxRepositories: z
    .number()
    .min(1)
    .max(200)
    .default(50)
    .describe('Maximum number of repositories to analyze'),
  focusAreas: z
    .array(z.string())
    .optional()
    .describe(
      'Specific focus areas for analysis (e.g., "AI", "web development")'
    ),
});

type GitHubAnalyzerInput = z.infer<typeof GitHubAnalyzerSchema>;

/**
 * GitHub Analyzer Tool for Multi-Agent System
 *
 * Provides structured GitHub analysis capabilities as a LangChain tool
 * for integration with the multi-agent personal brand development workflow.
 *
 * Features:
 * - Comprehensive GitHub profile and repository analysis
 * - Technical skill extraction and proficiency assessment
 * - Achievement identification and impact quantification
 * - Contribution pattern analysis and collaboration insights
 * - Industry relevance assessment and trend alignment
 * - Structured output optimized for content creation and strategic planning
 */
@Injectable()
export class GitHubAnalyzerTool extends StructuredTool {
  name = 'github_analyzer';
  description = `Analyze GitHub profiles to extract technical achievements, skills, and contribution patterns.
  
  This tool provides comprehensive analysis of:
  - User profile and professional information
  - Repository portfolio and project highlights
  - Programming languages and technology stack
  - Contribution patterns and collaboration style
  - Technical achievements and impact metrics
  - Industry relevance and trend alignment
  
  Output is structured for easy consumption by content creation and strategic planning agents.`;

  schema = GitHubAnalyzerSchema;

  private readonly logger = new Logger(GitHubAnalyzerTool.name);

  constructor(private readonly githubIntegration: GitHubIntegrationService) {
    super();
  }

  /**
   * Execute GitHub analysis with comprehensive profiling
   */
  protected async _call(input: GitHubAnalyzerInput): Promise<string> {
    this.logger.log(`Executing GitHub analysis for: ${input.username}`);

    try {
      // Perform comprehensive GitHub analysis
      const analysisResult = await this.githubIntegration.analyzeGitHubProfile(
        input.username
      );

      // Process and structure the results based on analysis type
      const structuredOutput = this.structureAnalysisOutput(
        analysisResult,
        input
      );

      // Generate summary insights
      const insights = this.generateInsights(analysisResult, input);

      // Combine structured data with actionable insights
      const finalOutput = {
        analysis: structuredOutput,
        insights,
        metadata: {
          analyzedUser: input.username,
          analysisType: input.analysisType,
          timestamp: new Date().toISOString(),
          dataFreshness: analysisResult.metadata.dataFreshness,
          confidence: analysisResult.metadata.confidence,
        },
      };

      this.logger.log(
        `GitHub analysis completed for ${input.username}: ${analysisResult.repositories.length} repos analyzed`
      );

      return JSON.stringify(finalOutput, null, 2);
    } catch (error) {
      this.logger.error(`GitHub analysis failed for ${input.username}:`, error);

      // Return error with fallback information
      const errorOutput = {
        error: true,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        fallback: {
          user: input.username,
          suggestion:
            'Consider using mock data for demonstration or check GitHub API access',
          timestamp: new Date().toISOString(),
        },
      };

      return JSON.stringify(errorOutput, null, 2);
    }
  }

  /**
   * Structure analysis output based on requested analysis type
   */
  private structureAnalysisOutput(
    result: GitHubAnalysisResult,
    input: GitHubAnalyzerInput
  ) {
    const baseOutput = {
      profile: this.extractProfileSummary(result.user),
      technicalSkills: result.achievements.technicalSkills,
      contributionStats: result.contributionStats,
    };

    switch (input.analysisType) {
      case 'profile':
        return {
          ...baseOutput,
          summary: `GitHub profile analysis for ${result.user.login}`,
          keyMetrics: {
            repositories: result.user.publicRepos,
            followers: result.user.followers,
            contributions: result.contributionStats.contributionsLastYear,
          },
        };

      case 'repositories':
        return {
          ...baseOutput,
          repositories: result.repositories
            .slice(0, input.maxRepositories)
            .map((repo) => ({
              name: repo.name,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazersCount,
              forks: repo.forksCount,
              topics: repo.topics,
              lastUpdated: repo.updatedAt,
            })),
          projectHighlights: result.achievements.projectHighlights,
        };

      case 'contributions':
        return {
          ...baseOutput,
          contributionAnalysis: {
            patterns: result.achievements.contributionPatterns,
            activity: {
              totalCommits: result.contributionStats.totalCommits,
              averagePerWeek: result.contributionStats.averageCommitsPerWeek,
              streak: result.contributionStats.currentStreak,
              consistency:
                result.achievements.contributionPatterns.consistencyScore,
            },
            collaboration: {
              style:
                result.achievements.contributionPatterns.collaborationStyle,
              pullRequests: result.contributionStats.totalPullRequests,
              reviews: result.contributionStats.totalReviews,
            },
          },
        };

      case 'comprehensive':
      default:
        return {
          ...baseOutput,
          repositories: result.repositories.slice(0, input.maxRepositories),
          achievements: result.achievements,
          industryRelevance: result.achievements.industryRelevance,
          careerInsights: this.generateCareerInsights(result),
        };
    }
  }

  /**
   * Generate actionable insights from analysis results
   */
  private generateInsights(
    result: GitHubAnalysisResult,
    input: GitHubAnalyzerInput
  ): {
    strengths: string[];
    opportunities: string[];
    recommendations: string[];
    brandingTips: string[];
  } {
    const insights = {
      strengths: [] as string[],
      opportunities: [] as string[],
      recommendations: [] as string[],
      brandingTips: [] as string[],
    };

    // Analyze strengths
    const topLanguages = Object.entries(result.achievements.technicalSkills)
      .filter(([, level]) => level === 'expert' || level === 'advanced')
      .map(([lang]) => lang);

    if (topLanguages.length > 0) {
      insights.strengths.push(`Strong expertise in ${topLanguages.join(', ')}`);
    }

    if (result.contributionStats.averageCommitsPerWeek > 10) {
      insights.strengths.push(
        'Consistent and active development contributions'
      );
    }

    if (
      result.achievements.contributionPatterns.collaborationStyle === 'leader'
    ) {
      insights.strengths.push(
        'Leadership qualities evident in project management and collaboration'
      );
    }

    // Identify opportunities
    if (result.achievements.industryRelevance.trending.length > 0) {
      insights.opportunities.push(
        `Trending technologies: ${result.achievements.industryRelevance.trending.join(
          ', '
        )}`
      );
    }

    if (result.user.followers < result.user.publicRepos * 2) {
      insights.opportunities.push(
        'GitHub visibility could be improved relative to project portfolio'
      );
    }

    // Generate recommendations
    if (result.repositories.filter((r) => r.stargazersCount > 10).length < 3) {
      insights.recommendations.push(
        'Consider developing signature projects to showcase expertise'
      );
    }

    if (!result.user.bio || result.user.bio.length < 50) {
      insights.recommendations.push(
        'Enhance GitHub bio with clear professional positioning'
      );
    }

    if (result.achievements.contributionPatterns.bestPractices.length < 3) {
      insights.recommendations.push(
        'Expand visible adoption of development best practices'
      );
    }

    // Branding tips
    insights.brandingTips.push(
      `Position as ${this.generatePositioning(result)}`
    );

    if (result.achievements.projectHighlights.length > 0) {
      insights.brandingTips.push(
        `Highlight key project: ${result.achievements.projectHighlights[0].repository}`
      );
    }

    const topSkill = Object.entries(result.achievements.technicalSkills).find(
      ([, level]) => level === 'expert'
    )?.[0];

    if (topSkill) {
      insights.brandingTips.push(
        `Leverage ${topSkill} expertise for thought leadership content`
      );
    }

    return insights;
  }

  /**
   * Extract concise profile summary
   */
  private extractProfileSummary(user: any) {
    return {
      username: user.login,
      name: user.name,
      bio: user.bio,
      company: user.company,
      location: user.location,
      blog: user.blog,
      publicRepos: user.publicRepos,
      followers: user.followers,
      following: user.following,
      memberSince: new Date(user.createdAt).getFullYear(),
      profileCompleteness: this.assessProfileCompleteness(user),
    };
  }

  /**
   * Generate career development insights
   */
  private generateCareerInsights(result: GitHubAnalysisResult) {
    return {
      experienceLevel: this.assessExperienceLevel(result),
      specialization: this.identifySpecialization(result),
      marketPosition: this.assessMarketPosition(result),
      growthAreas: this.identifyGrowthAreas(result),
      networkingOpportunities: this.identifyNetworkingOpportunities(result),
    };
  }

  /**
   * Generate professional positioning suggestion
   */
  private generatePositioning(result: GitHubAnalysisResult): string {
    const topSkills = Object.entries(result.achievements.technicalSkills)
      .filter(([, level]) => level === 'expert')
      .map(([skill]) => skill)
      .slice(0, 2);

    const domains = result.achievements.industryRelevance.trending
      .concat(result.achievements.industryRelevance.established)
      .slice(0, 2);

    if (topSkills.length > 0 && domains.length > 0) {
      return `${topSkills.join('/')} expert specializing in ${domains.join(
        ' and '
      )}`;
    } else if (topSkills.length > 0) {
      return `${topSkills.join('/')} specialist`;
    } else {
      return 'Full-stack developer';
    }
  }

  /**
   * Assess profile completeness
   */
  private assessProfileCompleteness(user: any): number {
    let score = 0;
    const fields = ['name', 'bio', 'company', 'location', 'blog'];
    const weights = [0.2, 0.3, 0.2, 0.15, 0.15];

    fields.forEach((field, index) => {
      if (user[field] && user[field].trim().length > 0) {
        score += weights[index];
      }
    });

    return Math.round(score * 100);
  }

  /**
   * Assess experience level based on GitHub activity
   */
  private assessExperienceLevel(result: GitHubAnalysisResult): string {
    const years =
      new Date().getFullYear() - new Date(result.user.createdAt).getFullYear();
    const commits = result.contributionStats.totalCommits;
    const repos = result.repositories.length;

    if (years > 5 && commits > 1000 && repos > 20) {
      return 'Senior/Expert';
    } else if (years > 3 && commits > 500 && repos > 10) {
      return 'Mid-level';
    } else if (years > 1 && commits > 100) {
      return 'Junior/Intermediate';
    } else {
      return 'Entry-level';
    }
  }

  /**
   * Identify technical specialization
   */
  private identifySpecialization(result: GitHubAnalysisResult): string {
    const languages = Object.entries(result.contributionStats.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([lang]) => lang);

    const frameworks = result.contributionStats.frameworks.slice(0, 2);

    return `${languages.join('/')} with ${frameworks.join(' and ')} experience`;
  }

  /**
   * Assess market position
   */
  private assessMarketPosition(result: GitHubAnalysisResult): string {
    const visibility =
      result.user.followers +
      result.repositories.reduce((sum, repo) => sum + repo.stargazersCount, 0);

    if (visibility > 500) {
      return 'High visibility in developer community';
    } else if (visibility > 100) {
      return 'Moderate visibility with growth potential';
    } else {
      return 'Building visibility and recognition';
    }
  }

  /**
   * Identify areas for professional growth
   */
  private identifyGrowthAreas(result: GitHubAnalysisResult): string[] {
    const areas = [];

    if (result.user.followers < 100) {
      areas.push('Community engagement and networking');
    }

    if (result.repositories.filter((r) => r.hasWiki || r.hasPages).length < 3) {
      areas.push('Documentation and knowledge sharing');
    }

    if (result.achievements.industryRelevance.emerging.length === 0) {
      areas.push('Exploration of emerging technologies');
    }

    if (
      result.contributionStats.totalPullRequests <
      result.contributionStats.totalCommits * 0.2
    ) {
      areas.push('Open source collaboration and contribution');
    }

    return areas;
  }

  /**
   * Identify networking opportunities
   */
  private identifyNetworkingOpportunities(
    result: GitHubAnalysisResult
  ): string[] {
    const opportunities = [];

    if (result.achievements.technicalSkills.TypeScript === 'expert') {
      opportunities.push('TypeScript community and conferences');
    }

    if (result.contributionStats.frameworks.includes('React')) {
      opportunities.push('React developer communities and meetups');
    }

    if (result.achievements.industryRelevance.trending.includes('AI/ML')) {
      opportunities.push('AI/ML research and development networks');
    }

    opportunities.push('Local developer meetups and tech conferences');

    return opportunities;
  }
}
