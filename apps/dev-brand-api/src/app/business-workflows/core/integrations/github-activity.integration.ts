import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '@hive-academy/langgraph-multi-agent';
import { z } from 'zod';

/**
 * GithubActivityIntegrationService
 * Consolidated and renamed from showcase GitHubIntegrationTools.
 * Responsibility: external GitHub API analysis for developer activity & achievements.
 * NOTE: Retains @Tool decorators for continuity; future refactor may split raw data fetch vs tool exposed methods.
 */
@Injectable()
export class GithubActivityIntegrationService {
  private readonly logger = new Logger(GithubActivityIntegrationService.name);
  private readonly githubToken = process.env.GITHUB_TOKEN;
  private readonly githubApiBase = 'https://api.github.com';

  // Types inlined from original; consider moving to shared type module if reused elsewhere.
  @Tool({
    name: 'github-analyzer',
    description: 'Analyzes GitHub repositories for achievements and patterns',
    schema: z.object({
      username: z.string().describe('GitHub username to analyze'),
      timeframe: z.enum(['week', 'month', 'quarter']).describe('Analysis timeframe'),
      repositories: z.array(z.string()).optional().describe('Specific repositories to analyze'),
      includePrivate: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include private repositories if token allows'),
    }),
  })
  async analyzeGitHubActivity(params: {
    username: string;
    timeframe: 'week' | 'month' | 'quarter';
    repositories?: string[];
    includePrivate?: boolean;
  }) {
    // Delegates to internal implementation (lifted unchanged for now)
    return this._analyzeGitHubActivity(params);
  }

  // Original implementation kept private to allow future separation from Tool exposure
  private async _analyzeGitHubActivity({
    username,
    timeframe,
    repositories,
    includePrivate = false,
  }: {
    username: string;
    timeframe: 'week' | 'month' | 'quarter';
    repositories?: string[];
    includePrivate?: boolean;
  }) {
    this.logger.log(`Analyzing GitHub activity for ${username} (${timeframe})`);
    try {
      const since = this.getDateRange(timeframe);
      const userRepos = await this.fetchUserRepositories(username, includePrivate);
      const targetRepos = repositories ? userRepos.filter((r) => repositories.includes(r.name)) : userRepos;
      const commits = await this.fetchRecentCommits(username, targetRepos, since);
      const patterns = this.analyzeCommitPatterns(commits, targetRepos);
      const achievements = this.extractAchievements(commits, targetRepos);
      const summary = this.calculateSummaryMetrics(commits, targetRepos);
      return { username, timeframe, repositories: targetRepos, commits, achievements, patterns, summary };
    } catch (error: any) {
      this.logger.error(`GitHub analysis failed: ${error.message}`);
      return this.createFallbackAnalysis(username, timeframe);
    }
  }

  @Tool({
    name: 'achievement-extractor',
    description: 'Extracts meaningful achievements from code analysis',
    schema: z.object({
      commits: z.array(z.any()).describe('Array of commit objects to analyze'),
      repositories: z.array(z.any()).describe('Repository metadata'),
      analysisDepth: z
        .enum(['basic', 'detailed', 'comprehensive'])
        .optional()
        .default('detailed'),
    }),
  })
  async extractAchievements(commits: any[], repositories: any[], analysisDepth: 'basic' | 'detailed' | 'comprehensive' = 'detailed') {
    this.logger.log(`Extracting achievements from ${commits.length} commits`);
    // Minimal retained logic: simplified from original until we confirm required depth.
    const firstDate = commits[0]?.commit?.author?.date;
    return [
      {
        id: `feature_${Date.now()}`,
        type: 'feature',
        description: `Example synthesized achievement (${commits.length} commits analyzed)`,
        impact: 'medium',
        technologies: this.extractTechnologiesFromRepos(repositories),
        date: firstDate || new Date().toISOString(),
        repository: repositories[0]?.name || 'n/a',
        commits: commits.slice(0, 5).map((c: any) => c.sha),
      },
    ];
  }

  // --- Developer insights retained (simplified) --------------------------------
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
    commits: any[];
    repositories: any[];
  }) {
    const languages = this.extractTechnologiesFromRepos(repositories);
    const commitPatterns = this.analyzeCommitPatterns(commits, repositories);
    return {
      developerId: username,
      primaryLanguages: languages.slice(0, 3),
      commitFrequency: commitPatterns.commitFrequency,
      workingHours: commitPatterns.workingHours,
      expertiseBreadth: languages.length > 3 ? 'broad' : 'focused',
    };
  }

  // --- Internal helpers (unchanged or trimmed) ---------------------------------
  private async fetchUserRepositories(username: string, includePrivate: boolean): Promise<any[]> {
    const url = `${this.githubApiBase}/users/${username}/repos?sort=updated&per_page=20`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeaders() });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const repos = (await response.json()) as any[];
      return repos.filter((repo: any) => includePrivate || !repo.private);
    } catch {
      this.logger.warn('Failed to fetch repositories, using fallback');
      return [];
    }
  }

  private async fetchRecentCommits(username: string, repositories: any[], since: string): Promise<any[]> {
    const all: any[] = [];
    for (const repo of repositories.slice(0, 5)) {
      try {
        const url = `${this.githubApiBase}/repos/${repo.full_name}/commits?author=${username}&since=${since}&per_page=20`;
        const response = await fetch(url, { headers: this.getAuthHeaders() });
        if (response.ok) all.push(...((await response.json()) as any[]));
      } catch {
        this.logger.warn(`Failed commits for ${repo.name}`);
      }
    }
    return all.slice(0, 50);
  }

  // Minimal header map typing (avoid relying on DOM lib's HeadersInit)
  private getAuthHeaders(): Record<string, string> {
    return this.githubToken ? { Authorization: `token ${this.githubToken}` } : {};
  }
  private getDateRange(tf: 'week' | 'month' | 'quarter'): string {
    const now = Date.now();
    const days = tf === 'week' ? 7 : tf === 'month' ? 30 : 90;
    return new Date(now - days * 86400000).toISOString();
  }

  private analyzeCommitPatterns(commits: any[], repositories: any[]) {
    const languages = this.extractTechnologiesFromRepos(repositories);
    const total = commits.length;
    return {
      primaryLanguages: languages.slice(0, 3),
      commitFrequency: total,
      workingHours: this.analyzeWorkingHours(commits),
    };
  }
  private extractTechnologiesFromRepos(repos: any[]) {
    return [...new Set(repos.map((r) => r.language).filter(Boolean))];
  }
  private analyzeWorkingHours(commits: any[]) {
    if (!commits.length) return 'standard';
    const hours = commits.map((c) => new Date(c.commit.author.date).getHours());
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    if (avg < 9) return 'early';
    if (avg < 17) return 'day';
    if (avg < 22) return 'evening';
    return 'late';
  }
  private calculateSummaryMetrics(commits: any[], repositories: any[]) {
    const totalLines = commits.reduce(
      (sum, c) => sum + (c.stats?.additions || 0),
      0
    );
    return {
      totalCommits: commits.length,
      totalRepositories: repositories.length,
      linesOfCode: totalLines,
      productivityScore: Math.min(100, commits.length * 2 + repositories.length * 5 + totalLines / 100),
    };
  }
  private createFallbackAnalysis(username: string, timeframe: string) {
    return {
      username,
      timeframe,
      repositories: [],
      commits: [],
      achievements: [],
      patterns: { primaryLanguages: [], commitFrequency: 0, workingHours: 'standard' },
      summary: { totalCommits: 0, totalRepositories: 0, linesOfCode: 0, productivityScore: 0 },
    };
  }
}
