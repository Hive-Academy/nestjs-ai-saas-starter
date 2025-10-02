import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '@hive-academy/langgraph-multi-agent';
import type {
  GitHubCommit,
  GitHubRepository,
} from '../../agents/shared/agent.types';

interface CodeAchievement {
  id: string;
  type:
    | 'performance'
    | 'feature'
    | 'bug_fix'
    | 'refactor'
    | 'documentation'
    | 'testing';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  technologies: string[];
  date: string;
  repository: string;
  commits: string[];
  metrics?: {
    linesAdded: number;
    linesRemoved: number;
    filesChanged: number;
    complexity?: number;
  };
}

interface GitHubAnalysisResponse {
  username: string;
  timeframe: 'week' | 'month' | 'quarter';
  repositories: GitHubRepository[];
  commits: GitHubCommit[];
  achievements: CodeAchievement[];
  patterns: {
    primaryLanguages: string[];
    commitFrequency: number;
    averageCommitSize: number;
    workingHours: string;
    focusAreas: string[];
  };
  summary: {
    totalCommits: number;
    totalRepositories: number;
    linesOfCode: number;
    productivityScore: number;
  };
}

/**
 * 💻 GITHUB INTEGRATION TOOLS - CODE ANALYSIS & ACHIEVEMENT EXTRACTION
 *
 * Provides comprehensive GitHub analysis for personal branding:
 * ✅ Repository analysis and code contribution tracking
 * ✅ Achievement extraction from commit patterns
 * ✅ Developer productivity metrics and insights
 * ✅ Technology stack analysis and expertise mapping
 * ✅ Real-time streaming of analysis progress
 */
@Injectable()
export class GitHubIntegrationTools {
  private readonly logger = new Logger(GitHubIntegrationTools.name);
  private readonly githubToken = process.env.GITHUB_TOKEN;
  private readonly githubApiBase = 'https://api.github.com';

  @Tool({
    name: 'github-analyzer',
    description: 'Analyzes GitHub repositories for achievements and patterns',
    schema: z.object({
      username: z.string().describe('GitHub username to analyze'),
      timeframe: z
        .enum(['week', 'month', 'quarter'])
        .describe('Analysis timeframe'),
      repositories: z
        .array(z.string())
        .optional()
        .describe('Specific repositories to analyze'),
      includePrivate: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include private repositories if token allows'),
    }),
  })
  async analyzeGitHubActivity({
    username,
    timeframe,
    repositories,
    includePrivate = false,
  }: {
    username: string;
    timeframe: 'week' | 'month' | 'quarter';
    repositories?: string[];
    includePrivate?: boolean;
  }): Promise<GitHubAnalysisResponse> {
    this.logger.log(
      `💻 Analyzing GitHub activity for ${username} (${timeframe})`
    );

    try {
      // Calculate date range for analysis
      const since = this.getDateRange(timeframe);

      // Fetch user repositories
      const userRepos = await this.fetchUserRepositories(
        username,
        includePrivate
      );

      // Filter to specific repositories if provided
      const targetRepos = repositories
        ? userRepos.filter((repo) => repositories.includes(repo.name))
        : userRepos;

      // Fetch commits from target repositories
      const commits = await this.fetchRecentCommits(
        username,
        targetRepos,
        since
      );

      // Analyze patterns and extract achievements
      const patterns = this.analyzeCommitPatterns(commits, targetRepos);
      const achievements = await this.extractAchievements({
        commits,
        repositories: targetRepos,
        analysisDepth: 'detailed',
      });

      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(commits, targetRepos);

      this.logger.log(
        `✅ GitHub analysis completed: ${achievements.length} achievements found`
      );

      return {
        username,
        timeframe,
        repositories: targetRepos,
        commits,
        achievements,
        patterns,
        summary,
      };
    } catch (error: any) {
      this.logger.error(`❌ GitHub analysis failed: ${error.message}`);

      // Return fallback structure for graceful degradation
      return this.createFallbackAnalysis(username, timeframe);
    }
  }

  @Tool({
    name: 'achievement-extractor',
    description: 'Extracts meaningful achievements from code analysis',
    schema: z.object({
      commits: z.array(z.any()).describe('Array of commit objects to analyze'),
      repositories: z
        .array(z.any())
        .describe('Repositories associated with the commits'),
      analysisDepth: z
        .enum(['basic', 'detailed', 'comprehensive'])
        .optional()
        .default('detailed'),
    }),
  })
  async extractAchievements({
    commits,
    repositories,
    analysisDepth = 'detailed',
  }: {
    commits: GitHubCommit[];
    repositories: GitHubRepository[];
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  }): Promise<CodeAchievement[]> {
    this.logger.log(
      `🎯 Extracting achievements from ${commits.length} commits`
    );

    const achievements: CodeAchievement[] = [];

    // Performance improvements
    const performanceCommits = commits.filter((commit) =>
      this.isPerformanceCommit(commit.commit.message)
    );

    if (performanceCommits.length > 0) {
      achievements.push({
        id: `perf_${Date.now()}`,
        type: 'performance',
        description: `Implemented ${
          performanceCommits.length
        } performance optimization${performanceCommits.length > 1 ? 's' : ''}`,
        impact: performanceCommits.length > 3 ? 'high' : 'medium',
        technologies: this.extractTechnologiesFromRepos(repositories),
        date: performanceCommits[0].commit.author.date,
        repository: repositories[0]?.name || 'multiple',
        commits: performanceCommits.map((c) => c.sha),
        metrics: {
          linesAdded: performanceCommits.reduce(
            (sum, c) => sum + (c.stats?.additions || 0),
            0
          ),
          linesRemoved: performanceCommits.reduce(
            (sum, c) => sum + (c.stats?.deletions || 0),
            0
          ),
          filesChanged: performanceCommits.length,
        },
      });
    }

    // New feature implementations
    const featureCommits = commits.filter((commit) =>
      this.isFeatureCommit(commit.commit.message)
    );

    if (featureCommits.length > 1) {
      achievements.push({
        id: `feature_${Date.now()}`,
        type: 'feature',
        description: `Delivered ${featureCommits.length} new feature${
          featureCommits.length > 1 ? 's' : ''
        } with modern implementation`,
        impact: featureCommits.length > 5 ? 'high' : 'medium',
        technologies: this.extractTechnologiesFromRepos(repositories),
        date: featureCommits[0].commit.author.date,
        repository: repositories[0]?.name || 'multiple',
        commits: featureCommits.map((c) => c.sha),
        metrics: {
          linesAdded: featureCommits.reduce(
            (sum, c) => sum + (c.stats?.additions || 0),
            0
          ),
          linesRemoved: featureCommits.reduce(
            (sum, c) => sum + (c.stats?.deletions || 0),
            0
          ),
          filesChanged: featureCommits.length,
        },
      });
    }

    // Bug fixes
    const bugFixCommits = commits.filter((commit) =>
      this.isBugFixCommit(commit.commit.message)
    );

    if (bugFixCommits.length > 2) {
      achievements.push({
        id: `bugfix_${Date.now()}`,
        type: 'bug_fix',
        description: `Resolved ${bugFixCommits.length} critical issues improving system stability`,
        impact: bugFixCommits.length > 5 ? 'high' : 'medium',
        technologies: this.extractTechnologiesFromRepos(repositories),
        date: bugFixCommits[0].commit.author.date,
        repository: repositories[0]?.name || 'multiple',
        commits: bugFixCommits.map((c) => c.sha),
        metrics: {
          linesAdded: bugFixCommits.reduce(
            (sum, c) => sum + (c.stats?.additions || 0),
            0
          ),
          linesRemoved: bugFixCommits.reduce(
            (sum, c) => sum + (c.stats?.deletions || 0),
            0
          ),
          filesChanged: bugFixCommits.length,
        },
      });
    }

    // Testing improvements
    const testCommits = commits.filter((commit) =>
      this.isTestCommit(commit.commit.message)
    );

    if (testCommits.length > 0) {
      achievements.push({
        id: `testing_${Date.now()}`,
        type: 'testing',
        description: `Enhanced test coverage and quality assurance with ${
          testCommits.length
        } test improvement${testCommits.length > 1 ? 's' : ''}`,
        impact: testCommits.length > 3 ? 'medium' : 'low',
        technologies: this.extractTechnologiesFromRepos(repositories),
        date: testCommits[0].commit.author.date,
        repository: repositories[0]?.name || 'multiple',
        commits: testCommits.map((c) => c.sha),
      });
    }

    this.logger.log(`✅ Extracted ${achievements.length} achievements`);
    return achievements;
  }

  @Tool({
    name: 'developer-insights',
    description: 'Generates insights about developer patterns and expertise',
    schema: z.object({
      username: z.string(),
      commits: z.array(z.any()),
      repositories: z.array(z.any()),
    }),
  })
  async generateDeveloperInsights({
    username,
    commits,
    repositories,
  }: {
    username: string;
    commits: GitHubCommit[];
    repositories: GitHubRepository[];
  }) {
    this.logger.log(`🔍 Generating developer insights for ${username}`);

    const languages = this.extractTechnologiesFromRepos(repositories);
    const commitPatterns = this.analyzeCommitPatterns(commits, repositories);
    const expertise = this.assessTechnicalExpertise(commits, repositories);

    return {
      developerId: username,
      technicalExpertise: expertise,
      workingPatterns: commitPatterns,
      strengthAreas: languages.slice(0, 3),
      recommendations: this.generateGrowthRecommendations(
        commitPatterns,
        expertise
      ),
      brandingOpportunities: this.identifyBrandingOpportunities(
        commits,
        repositories
      ),
    };
  }

  // Private helper methods
  private async fetchUserRepositories(
    username: string,
    includePrivate: boolean
  ): Promise<GitHubRepository[]> {
    const url = `${this.githubApiBase}/users/${username}/repos?sort=updated&per_page=20`;

    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = (await response.json()) as GitHubRepository[];
      return repos.filter((repo) => includePrivate || !repo.private);
    } catch (error) {
      this.logger.warn(`Failed to fetch repositories, using fallback`);
      return [];
    }
  }

  private async fetchRecentCommits(
    username: string,
    repositories: GitHubRepository[],
    since: string
  ): Promise<GitHubCommit[]> {
    const allCommits: GitHubCommit[] = [];

    for (const repo of repositories.slice(0, 5)) {
      // Limit to 5 repos to avoid rate limits
      try {
        const url = `${this.githubApiBase}/repos/${repo.full_name}/commits?author=${username}&since=${since}&per_page=20`;

        const response = await fetch(url, {
          headers: this.getAuthHeaders(),
        });

        if (response.ok) {
          const commits = (await response.json()) as GitHubCommit[];
          allCommits.push(...commits);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch commits for ${repo.name}`);
      }
    }

    return allCommits.slice(0, 50); // Limit total commits
  }

  private getAuthHeaders(): Record<string, string> {
    return this.githubToken
      ? { Authorization: `token ${this.githubToken}` }
      : {};
  }

  private getDateRange(timeframe: 'week' | 'month' | 'quarter'): string {
    const now = new Date();
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return since.toISOString();
  }

  private analyzeCommitPatterns(
    commits: GitHubCommit[],
    repositories: GitHubRepository[]
  ) {
    const languages = this.extractTechnologiesFromRepos(repositories);
    const totalCommits = commits.length;
    const avgCommitSize =
      commits.reduce(
        (sum, c) => sum + (c.stats?.additions || 0) + (c.stats?.deletions || 0),
        0
      ) / Math.max(totalCommits, 1);

    return {
      primaryLanguages: languages.slice(0, 3),
      commitFrequency: totalCommits,
      averageCommitSize: Math.round(avgCommitSize),
      workingHours: this.analyzeWorkingHours(commits),
      focusAreas: this.extractFocusAreas(commits),
    };
  }

  private calculateSummaryMetrics(
    commits: GitHubCommit[],
    repositories: GitHubRepository[]
  ) {
    const totalLinesOfCode = commits.reduce(
      (sum, c) => sum + (c.stats?.additions || 0),
      0
    );

    const productivityScore = Math.min(
      100,
      commits.length * 2 + repositories.length * 5 + totalLinesOfCode / 100
    );

    return {
      totalCommits: commits.length,
      totalRepositories: repositories.length,
      linesOfCode: totalLinesOfCode,
      productivityScore: Math.round(productivityScore),
    };
  }

  private extractTechnologiesFromRepos(
    repositories: GitHubRepository[]
  ): string[] {
    return [
      ...new Set(
        repositories
          .map((repo) => repo.language)
          .filter((lang): lang is string => lang !== null)
      ),
    ];
  }

  private isPerformanceCommit(message: string): boolean {
    const performanceKeywords = [
      'perf',
      'performance',
      'optimize',
      'speed',
      'faster',
      'cache',
      'memory',
    ];
    return performanceKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  private isFeatureCommit(message: string): boolean {
    const featureKeywords = ['feat', 'feature', 'add', 'implement', 'new'];
    return featureKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  private isBugFixCommit(message: string): boolean {
    const bugKeywords = ['fix', 'bug', 'issue', 'error', 'resolve'];
    return bugKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  private isTestCommit(message: string): boolean {
    const testKeywords = ['test', 'spec', 'coverage', 'unit', 'integration'];
    return testKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  private analyzeWorkingHours(commits: GitHubCommit[]): string {
    if (commits.length === 0) return 'Standard hours';

    const hours = commits.map((c) => new Date(c.commit.author.date).getHours());
    const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;

    if (avgHour < 9) return 'Early morning';
    if (avgHour < 17) return 'Standard hours';
    if (avgHour < 22) return 'Evening';
    return 'Night owl';
  }

  private extractFocusAreas(commits: GitHubCommit[]): string[] {
    const keywords = commits.flatMap((c) =>
      c.commit.message.toLowerCase().split(/\s+/)
    );

    const focusWords = [
      'api',
      'frontend',
      'backend',
      'ui',
      'database',
      'auth',
      'test',
    ];
    return focusWords.filter(
      (word) => keywords.filter((k) => k.includes(word)).length > 1
    );
  }

  private assessTechnicalExpertise(
    commits: GitHubCommit[],
    repositories: GitHubRepository[]
  ) {
    const languages = this.extractTechnologiesFromRepos(repositories);
    const commitComplexity =
      commits.reduce(
        (sum, c) => sum + (c.stats?.additions || 0) + (c.stats?.deletions || 0),
        0
      ) / Math.max(commits.length, 1);

    return {
      languages: languages.map((lang) => ({
        name: lang,
        level:
          repositories.filter((r) => r.language === lang).length > 2
            ? 'expert'
            : 'proficient',
      })),
      complexity:
        commitComplexity > 100
          ? 'high'
          : commitComplexity > 50
          ? 'medium'
          : 'basic',
      breadth: languages.length > 3 ? 'full-stack' : 'specialized',
    };
  }

  private generateGrowthRecommendations(
    patterns: any,
    expertise: any
  ): string[] {
    const recommendations = [];

    if (patterns.commitFrequency < 10) {
      recommendations.push(
        'Increase development consistency with more regular commits'
      );
    }

    if (patterns.primaryLanguages.length < 2) {
      recommendations.push(
        'Explore additional programming languages to expand skill set'
      );
    }

    if (!patterns.focusAreas.includes('test')) {
      recommendations.push(
        'Strengthen testing practices and test-driven development'
      );
    }

    return recommendations;
  }

  private identifyBrandingOpportunities(
    commits: GitHubCommit[],
    repositories: GitHubRepository[]
  ): string[] {
    const opportunities = [];

    if (repositories.some((r) => r.stargazers_count > 10)) {
      opportunities.push('Highlight popular open source contributions');
    }

    if (commits.some((c) => this.isPerformanceCommit(c.commit.message))) {
      opportunities.push('Showcase performance optimization expertise');
    }

    const languages = this.extractTechnologiesFromRepos(repositories);
    if (languages.includes('TypeScript') || languages.includes('JavaScript')) {
      opportunities.push('Position as modern web development expert');
    }

    return opportunities;
  }

  private createFallbackAnalysis(
    username: string,
    timeframe: 'week' | 'month' | 'quarter'
  ): GitHubAnalysisResponse {
    return {
      username,
      timeframe,
      repositories: [],
      commits: [],
      achievements: [],
      patterns: {
        primaryLanguages: [],
        commitFrequency: 0,
        averageCommitSize: 0,
        workingHours: 'Standard hours',
        focusAreas: [],
      },
      summary: {
        totalCommits: 0,
        totalRepositories: 0,
        linesOfCode: 0,
        productivityScore: 0,
      },
    };
  }
}
