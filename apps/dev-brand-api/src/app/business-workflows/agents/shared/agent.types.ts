/**
 * Shared Agent Type Definitions
 *
 * This file contains type definitions shared across multiple agents
 * to ensure type safety and eliminate 'any' types.
 */

// ============================================================================
// Brand-Related Types
// ============================================================================

export interface BrandVoice {
  tone: string;
  style: string;
  personality?: string[];
  keywords?: string[];
}

export interface BrandStrategy {
  positioning?: string;
  strategyType?: 'optimization' | 'rebuild';
  score?: number;
  strengths?: string[];
  improvements?: string[];
  createdAt?: string;
  userId?: string;
  strategy?: string;
  analysis?: BrandAnalysis;
}

export interface BrandData {
  devContext?: DevContext;
  brandEvolution?: BrandEvolution;
  brandVoice?: BrandVoice;
  techStack?: TechStack;
  achievements?: Achievement[];
  dataGatheredAt?: string;
}

export interface BrandAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  positioning: string;
  analyzedAt?: string;
}

export interface DevContext {
  role?: string;
  expertise?: string[];
  experience?: string;
  interests?: string[];
  [key: string]: unknown;
}

export interface BrandEvolution {
  timeline?: Array<{
    date: string;
    milestone: string;
    impact: string;
  }>;
  trajectory?: 'growing' | 'stable' | 'emerging';
  [key: string]: unknown;
}

export interface TechStack {
  primary: string;
  repositories: number;
  contributions: number;
  followers: number;
  languages?: string[];
}

// ============================================================================
// Achievement Types
// ============================================================================

export interface Achievement {
  id?: string;
  title?: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  technologies?: string[];
  date?: string;
  category?: 'code' | 'architecture' | 'leadership' | 'innovation';
  metrics?: {
    linesOfCode?: number;
    performanceGain?: string;
    userImpact?: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// GitHub-Related Types
// ============================================================================

export interface GitHubData {
  summary: GitHubSummary;
  patterns: GitHubPatterns;
  commits?: GitHubCommit[];
  repositories?: GitHubRepository[];
  stats?: GitHubStats;
  timeframe?: string;
}

export interface GitHubSummary {
  totalRepositories: number;
  totalCommits: number;
  linesOfCode: number;
  productivityScore: number;
  activeRepositories?: number;
  contributionStreak?: number;
}

export interface GitHubPatterns {
  primaryLanguages: string[];
  workingHours: string;
  focusAreas: string[];
  commitFrequency?: string | number;
  collaborationLevel?: 'solo' | 'team' | 'community';
}

export interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  author?: string;
  repository?: string;
  commit: {
    author: { name: string; email: string; date: string };
    message: string;
  };
  stats?: {
    additions: number;
    deletions: number;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  language?: string;
  stars: number;
  stargazers_count: number;
  forks: number;
  forks_count: number;
  isPrivate: boolean;
  private?: boolean; // GitHub API field
  lastUpdated: string;
  created_at?: string; // GitHub API field
  updated_at?: string; // GitHub API field
  pushed_at?: string; // GitHub API field
  topics?: string[];
  size?: number;
}

export interface GitHubStats {
  totalRepos: number;
  followers: number;
  following: number;
  publicGists?: number;
  totalContributions?: number;
}

export interface DeveloperInsights {
  technicalExpertise: {
    breadth: string;
    complexity: string;
    specializations?: string[];
  };
  workPatterns?: {
    consistency: 'high' | 'medium' | 'low';
    peakProductivity: string;
    collaborationStyle: string;
  };
  recommendations?: string[];
  growthAreas?: string[];
}

// ============================================================================
// Content Creation Types
// ============================================================================

export interface ContentQualityScore {
  overall: number;
  hasSubstantialContent: boolean;
  hasAchievements: boolean;
  linkedinEngagement: number;
  devtoEngagement: number;
  contentLength: number;
}

export interface PlatformContent {
  linkedin: string;
  devto: string;
  linkedinEngagement?: number;
  devtoEngagement?: number;
}

export interface EngagementMetrics {
  score: number;
  factors: {
    contentLength: boolean;
    hasQuestions: boolean;
    hasEmojis: boolean;
    hasCallToAction: boolean;
    technicalRelevance: boolean;
  };
}

// ============================================================================
// Workflow Context Types
// ============================================================================

export interface WorkflowContext {
  githubUsername: string;
  timeframe?: string;
  achievements?: Achievement[];
  brandVoice?: BrandVoice;
  brandStrategy?: BrandStrategy;
  githubData?: GitHubData;
  brandData?: BrandData;
  [key: string]: unknown;
}

// ============================================================================
// Quality Assessment Types
// ============================================================================

export interface QualityAssessment {
  score: number;
  route: 'high-quality' | 'standard' | 'needs-improvement';
  confidence: number;
  factors: {
    dataCompleteness: number;
    aiQuality: number;
    technicalDepth: number;
  };
}

// ============================================================================
// Prompt Building Types
// ============================================================================

export interface PromptContext {
  username: string;
  brandVoice?: BrandVoice;
  brandStrategy?: BrandStrategy;
  achievements?: Achievement[];
  githubData?: GitHubData;
  additionalContext?: Record<string, unknown>;
}
