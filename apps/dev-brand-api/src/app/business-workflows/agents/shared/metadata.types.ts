/**
 * Type-Safe Agent Metadata Definitions
 *
 * This file defines strongly-typed metadata interfaces for all workflow agents,
 * eliminating unsafe type assertions and providing compile-time type safety.
 *
 * Each agent has its own metadata interface that extends the base WorkflowAgentMetadata.
 */

import type {
  Achievement,
  GitHubData,
  BrandData,
  BrandAnalysis,
  BrandStrategy,
  BrandVoice,
  DeveloperInsights,
  ContentQualityScore,
  PlatformContent,
  EngagementMetrics,
} from './agent.types';

// ============================================================================
// Base Metadata Interface
// ============================================================================

/**
 * Base metadata interface for all workflow agents
 * Contains common properties shared across all agent workflows
 */
export interface WorkflowAgentMetadata {
  /**
   * Index signature for compatibility with TypedAgentState
   */
  [key: string]: unknown;

  /**
   * Current workflow step identifier
   */
  currentStep?: string;

  /**
   * Workflow completion status
   */
  workflowCompleted?: boolean;

  /**
   * Error information if workflow failed
   */
  error?: string;

  /**
   * Workflow execution mode
   */
  mode?: 'real' | 'demo' | 'test' | 'fallback';

  /**
   * Workflow start timestamp
   */
  workflowStartTime?: Date;

  /**
   * Workflow end timestamp
   */
  workflowEndTime?: Date;
}

// ============================================================================
// GitHub Code Analyzer Metadata
// ============================================================================

/**
 * Type-safe metadata for GitHubCodeAnalyzerAgent
 * Eliminates all type assertions in the GitHub analyzer workflow
 */
export interface GitHubAnalyzerMetadata extends WorkflowAgentMetadata {
  /**
   * GitHub username being analyzed
   */
  githubUsername: string;

  /**
   * Analysis timeframe (e.g., '30d', '90d', '1y')
   */
  timeframe: string;

  /**
   * Complete GitHub data from analysis
   */
  githubData?: GitHubData;

  /**
   * Extracted achievements from GitHub activity
   */
  achievements?: Achievement[];

  /**
   * AI-generated analysis text
   */
  aiAnalysis?: string;

  /**
   * Developer insights from pattern analysis
   */
  developerInsights?: DeveloperInsights;

  /**
   * Quality assessment score for analysis
   */
  qualityScore?: number;

  /**
   * Analysis quality route
   */
  qualityRoute?: 'high-quality' | 'standard' | 'needs-improvement';

  /**
   * Analysis start timestamp
   */
  analysisStartTime?: Date;

  /**
   * Analysis end timestamp
   */
  analysisEndTime?: Date;

  /**
   * Analysis completion timestamp (alias)
   */
  analysisCompleteTime?: Date;

  /**
   * Workflow instance ID
   */
  workflowInstanceId?: string;

  /**
   * Number of repositories analyzed
   */
  repositoriesAnalyzed?: number;

  /**
   * Number of commits analyzed
   */
  commitsAnalyzed?: number;

  /**
   * Productivity score
   */
  productivityScore?: number;

  /**
   * Achievement count
   */
  achievementCount?: number;

  /**
   * Narrative generated flag
   */
  narrativeGenerated?: boolean;

  /**
   * Confidence score
   */
  confidenceScore?: number;

  /**
   * Tools used during analysis
   */
  toolsUsed?: string[];

  /**
   * Total processing time in milliseconds
   */
  totalProcessingTime?: number;

  /**
   * Technical expertise information
   */
  technicalExpertise?: {
    breadth?: string;
    complexity?: string;
  };

  /**
   * Workflow step tracking
   */
  currentStep?:
    | 'initialization'
    | 'github-activity-analyzed'
    | 'achievements-extracted'
    | 'achievement-extraction-error'
    | 'insights-generated'
    | 'insights-error'
    | 'ai-synthesis-complete'
    | 'ai-synthesis-fallback'
    | 'completed'
    | 'repository-analysis'
    | 'achievement-extraction'
    | 'ai-synthesis'
    | 'quality-assessment'
    | 'analysis-complete'
    | 'analysis-failed';

  /**
   * Unique analysis ID
   */
  analysisId?: string;

  /**
   * GitHub analysis completion flag
   */
  githubAnalysisCompleted?: boolean;
}

// ============================================================================
// Personal Brand Strategist Metadata
// ============================================================================

/**
 * Type-safe metadata for PersonalBrandStrategistAgent
 * Eliminates all type assertions in the brand strategist workflow
 */
export interface BrandStrategistMetadata extends WorkflowAgentMetadata {
  /**
   * GitHub username for brand analysis
   */
  githubUsername: string;

  /**
   * Achievements to incorporate in brand strategy
   */
  achievements?: Achievement[];

  /**
   * GitHub data for technical profile
   */
  githubData?: GitHubData;

  /**
   * Comprehensive brand data gathered from memory
   */
  brandData?: BrandData;

  /**
   * Brand analysis results
   */
  brandAnalysis?: BrandAnalysis;

  /**
   * Brand strength score (0-1)
   */
  brandScore?: number;

  /**
   * Strategy type determined by brand assessment
   */
  strategyType?: 'optimization' | 'rebuild';

  /**
   * Final brand strategy output
   */
  finalStrategy?: string;

  /**
   * Complete brand strategy object
   */
  brandStrategy?: BrandStrategy;

  /**
   * Workflow step tracking
   */
  currentStep?:
    | 'initialization'
    | 'data-gathered'
    | 'data-gathering-failed'
    | 'positioning-analyzed'
    | 'analysis-failed'
    | 'optimization-complete'
    | 'optimization-failed'
    | 'rebuild-complete'
    | 'rebuild-failed'
    | 'workflow-complete';

  /**
   * Unique brand analysis ID
   */
  brandAnalysisId?: string;

  /**
   * Brand strategy completion flag
   */
  brandStrategyCompleted?: boolean;
}

// ============================================================================
// Content Creator Metadata
// ============================================================================

/**
 * Type-safe metadata for ContentCreatorAgent
 * Eliminates all type assertions in the content creator workflow
 */
export interface ContentCreatorMetadata extends WorkflowAgentMetadata {
  /**
   * GitHub username for content personalization
   */
  githubUsername: string;

  /**
   * Unique workflow instance identifier
   */
  workflowInstanceId?: string;

  /**
   * Achievements to feature in content
   */
  achievements?: Achievement[];

  /**
   * Brand strategy to align content with
   */
  brandStrategy?: BrandStrategy;

  /**
   * Brand voice for content tone
   */
  brandVoice?: BrandVoice;

  /**
   * Brand positioning statement
   */
  positioning?: string;

  /**
   * GitHub data for technical context
   */
  githubData?: GitHubData;

  /**
   * Generated content for different platforms
   */
  platformContent?: PlatformContent;

  /**
   * Raw LinkedIn content before optimization
   */
  rawLinkedinContent?: string;

  /**
   * Raw Dev.to content before optimization
   */
  rawDevtoContent?: string;

  /**
   * LinkedIn post content (optimized)
   */
  linkedinContent?: string;

  /**
   * Dev.to article content (optimized)
   */
  devtoContent?: string;

  /**
   * LinkedIn engagement score
   */
  linkedinEngagement?: number;

  /**
   * Dev.to engagement score
   */
  devtoEngagement?: number;

  /**
   * Content start timestamp
   */
  contentStartTime?: Date;

  /**
   * Content quality assessment
   */
  qualityScore?: ContentQualityScore;

  /**
   * Engagement score prediction
   */
  engagementScore?: number;

  /**
   * Engagement metrics breakdown
   */
  engagementMetrics?: EngagementMetrics;

  /**
   * Content quality route
   */
  contentRoute?: 'high-quality' | 'needs-refinement';

  /**
   * Workflow step tracking
   */
  currentStep?:
    | 'initialization'
    | 'brand-context-gathered'
    | 'brand-context-fallback'
    | 'content-generated'
    | 'content-optimized'
    | 'optimization-fallback'
    | 'completed'
    | 'content-generation-failed'
    | 'quality-assessed'
    | 'quality-assessment-failed'
    | 'content-refined'
    | 'content-refinement-failed'
    | 'engagement-predicted'
    | 'engagement-prediction-failed'
    | 'workflow-complete';

  /**
   * Content generation timestamp
   */
  contentGeneratedAt?: Date;

  /**
   * Unique content ID
   */
  contentId?: string;

  /**
   * Content generation flag
   */
  contentGenerated?: boolean;

  /**
   * Content optimized flag
   */
  contentOptimized?: boolean;

  /**
   * Content created flag
   */
  contentCreated?: boolean;

  /**
   * Content creation completion flag
   */
  contentCreationCompleted?: boolean;

  /**
   * Whether content needs refinement
   */
  needsRefinement?: boolean;

  /**
   * Content end time
   */
  contentEndTime?: Date;

  /**
   * Total processing time
   */
  totalProcessingTime?: number;

  /**
   * Final stage flag
   */
  finalStage?: boolean;

  /**
   * Target platforms
   */
  targetPlatforms?: string[];
}

// ============================================================================
// Researcher Agent Metadata
// ============================================================================

/**
 * Type-safe metadata for ResearcherAgent
 * Autonomous web research and report generation workflow
 */
export interface ResearcherMetadata extends WorkflowAgentMetadata {
  /**
   * User ID for the research request
   */
  userId: string;

  /**
   * User's research query
   */
  query: string;

  /**
   * Research depth level
   */
  researchDepth: 'summary' | 'detailed' | 'comprehensive';

  /**
   * Extracted research topic
   */
  researchTopic?: string;

  /**
   * Research scope description
   */
  researchScope?: string;

  /**
   * Search results from web research
   */
  searchResults?: any[];

  /**
   * Research synthesis
   */
  synthesis?: string;

  /**
   * Total sources analyzed
   */
  totalSources?: number;

  /**
   * Generated report draft
   */
  reportDraft?: string;

  /**
   * Report title
   */
  reportTitle?: string;

  /**
   * User approval status
   */
  userApproval?: 'pending' | 'approved' | 'rejected';

  /**
   * User feedback on approval
   */
  approvalFeedback?: string;

  /**
   * Saved report file path
   */
  savedReportPath?: string;

  /**
   * Saved report filename
   */
  savedReportFilename?: string;

  /**
   * Final report content
   */
  finalReport?: string;

  /**
   * Workflow instance ID
   */
  workflowInstanceId?: string;

  /**
   * Analysis start time
   */
  analysisStartTime?: Date;

  /**
   * Analysis end time
   */
  analysisEndTime?: Date;

  /**
   * Total processing time in milliseconds
   */
  totalProcessingTime?: number;

  /**
   * Tools used in workflow
   */
  toolsUsed?: string[];
}

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Union type of all agent-specific metadata types
 * Useful for generic functions that work with any agent metadata
 */
export type AgentMetadata =
  | GitHubAnalyzerMetadata
  | BrandStrategistMetadata
  | ContentCreatorMetadata
  | ResearcherMetadata;

/**
 * Type guard to check if metadata is GitHubAnalyzerMetadata
 */
export function isGitHubAnalyzerMetadata(
  metadata: WorkflowAgentMetadata
): metadata is GitHubAnalyzerMetadata {
  return 'githubData' in metadata || 'analysisId' in metadata;
}

/**
 * Type guard to check if metadata is BrandStrategistMetadata
 */
export function isBrandStrategistMetadata(
  metadata: WorkflowAgentMetadata
): metadata is BrandStrategistMetadata {
  return 'brandAnalysis' in metadata || 'brandAnalysisId' in metadata;
}

/**
 * Type guard to check if metadata is ContentCreatorMetadata
 */
export function isContentCreatorMetadata(
  metadata: WorkflowAgentMetadata
): metadata is ContentCreatorMetadata {
  return 'platformContent' in metadata || 'contentId' in metadata;
}

/**
 * Type guard to check if metadata is ResearcherMetadata
 */
export function isResearcherMetadata(
  metadata: WorkflowAgentMetadata
): metadata is ResearcherMetadata {
  return 'query' in metadata || 'researchTopic' in metadata;
}
