import { z } from 'zod';
import type { MemoryMetadata } from '@hive-academy/langgraph-memory';

/**
 * Brand Memory Schema - DevBrand Personal Brand Memory System
 *
 * Extends existing memory patterns to support personal brand intelligence
 * including developer achievements, content metrics, and brand evolution tracking.
 */

/**
 * Personal Brand Memory Types
 */
export type BrandMemoryType =
  | 'dev_achievement' // GitHub analysis results, technical accomplishments
  | 'content_performance' // Generated content metrics and engagement
  | 'brand_strategy' // Strategic recommendations and positioning
  | 'skill_profile' // Technical skills and proficiency evolution
  | 'career_milestone' // Career progression and professional growth
  | 'market_insight' // Industry trends and competitive analysis
  | 'user_feedback' // Human-in-the-loop feedback and corrections
  | 'workflow_learning'; // Agent coordination patterns and optimization

/**
 * Extended Brand Memory Metadata
 * Extends base MemoryMetadata with brand-specific fields
 */
export interface BrandMemoryMetadata extends MemoryMetadata {
  readonly type: BrandMemoryType | MemoryMetadata['type'];
  readonly brandContext?: {
    readonly userId: string;
    readonly analysisId?: string;
    readonly contentId?: string;
    readonly strategyVersion?: string;
    readonly confidenceScore?: number; // 0-1 scale for HITL integration
    readonly validatedByHuman?: boolean;
  };
  readonly technicalData?: {
    readonly githubUsername?: string;
    readonly repositories?: string[];
    readonly technologies?: string[];
    readonly skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    readonly projectComplexity?: 'simple' | 'medium' | 'complex' | 'enterprise';
  };
  readonly contentMetrics?: {
    readonly platform?:
      | 'linkedin'
      | 'twitter'
      | 'blog'
      | 'newsletter'
      | 'github';
    readonly engagement?: number;
    readonly reach?: number;
    readonly conversions?: number;
    readonly generatedAt?: string; // ISO datetime
    readonly approvalStatus?:
      | 'pending'
      | 'approved'
      | 'rejected'
      | 'needs_revision';
  };
  readonly strategicData?: {
    readonly targetAudience?: string[];
    readonly marketSegment?: string;
    readonly competitivePosition?: string;
    readonly brandPillars?: string[];
    readonly careerGoals?: string[];
  };
}

/**
 * Personal Brand Memory Entry
 * Core memory structure for brand intelligence
 */
export interface BrandMemoryEntry {
  readonly id: string;
  readonly threadId: string; // User session or workflow ID
  readonly userId: string; // Developer's unique identifier
  readonly content: string; // Human-readable description of the memory
  readonly structuredData?: Record<string, unknown>; // Machine-readable data
  readonly embedding?: readonly number[]; // Vector embedding for semantic search
  readonly metadata: BrandMemoryMetadata;
  readonly createdAt: Date;
  readonly lastAccessedAt?: Date;
  readonly accessCount: number;
  readonly relevanceScore?: number; // Context-specific relevance
  readonly expiresAt?: Date; // Optional TTL for temporal data
}

/**
 * Brand Memory Collections Configuration
 * ChromaDB collection structure for different memory types
 */
export interface BrandMemoryCollections {
  readonly devAchievements: 'dev_achievements'; // GitHub analysis, coding accomplishments
  readonly contentMetrics: 'content_metrics'; // Generated content performance
  readonly brandHistory: 'brand_history'; // Brand evolution and strategy changes
  readonly skillEvolution: 'skill_evolution'; // Technical skill development over time
  readonly careerMilestones: 'career_milestones'; // Professional growth tracking
  readonly marketIntelligence: 'market_intelligence'; // Industry insights and trends
  readonly userFeedback: 'user_feedback'; // HITL corrections and preferences
  readonly agentLearning: 'agent_learning'; // Multi-agent coordination optimization
}

/**
 * Neo4j Relationship Types for Brand Memory Graph
 */
export type BrandRelationshipType =
  | 'ACHIEVED' // Developer → Achievement
  | 'USED_TECHNOLOGY' // Achievement → Technology
  | 'GENERATED_CONTENT' // Achievement → Content
  | 'TARGETS_AUDIENCE' // Content → Audience
  | 'SUPPORTS_GOAL' // Strategy → Career Goal
  | 'INFLUENCED_BY' // Strategy → Market Trend
  | 'REFINED_BY' // Content → User Feedback
  | 'LEARNED_FROM' // Agent → Workflow Pattern
  | 'EVOLVED_INTO' // Skill → Higher Skill Level
  | 'MEASURED_BY' // Content → Performance Metric
  | 'VALIDATES' // Human Feedback → AI Decision
  | 'OPTIMIZES'; // Strategy → Brand Performance

/**
 * Brand Memory Search Options
 * Extended search parameters for brand-specific queries
 */
export interface BrandMemorySearchOptions {
  readonly query?: string;
  readonly userId: string; // Required for brand memories
  readonly threadId?: string;
  readonly memoryTypes?: BrandMemoryType[];
  readonly limit?: number;
  readonly offset?: number;
  readonly minRelevance?: number;
  readonly timeRange?: {
    readonly start?: Date;
    readonly end?: Date;
  };
  readonly brandContext?: {
    readonly analysisId?: string;
    readonly contentId?: string;
    readonly strategyVersion?: string;
    readonly includeExpired?: boolean;
  };
  readonly technicalFilter?: {
    readonly technologies?: string[];
    readonly skillLevels?: Array<
      'beginner' | 'intermediate' | 'advanced' | 'expert'
    >;
    readonly platforms?: Array<
      'linkedin' | 'twitter' | 'blog' | 'newsletter' | 'github'
    >;
  };
  readonly strategicFilter?: {
    readonly targetAudiences?: string[];
    readonly marketSegments?: string[];
    readonly brandPillars?: string[];
  };
  readonly validationStatus?: {
    readonly humanValidated?: boolean;
    readonly minConfidence?: number;
    readonly approvalStatus?: Array<
      'pending' | 'approved' | 'rejected' | 'needs_revision'
    >;
  };
}

/**
 * Brand Memory Analytics
 * Aggregated insights about personal brand development
 */
export interface BrandMemoryAnalytics {
  readonly userId: string;
  readonly totalMemories: number;
  readonly memoryDistribution: Record<BrandMemoryType, number>;
  readonly skillProgression: {
    readonly currentLevel: Record<
      string,
      'beginner' | 'intermediate' | 'advanced' | 'expert'
    >;
    readonly recentImprovements: string[];
    readonly recommendedAreas: string[];
  };
  readonly contentPerformance: {
    readonly totalGenerated: number;
    readonly approvalRate: number;
    readonly averageEngagement: number;
    readonly topPerformingPlatforms: string[];
  };
  readonly brandEvolution: {
    readonly strategicChanges: number;
    readonly positioningUpdates: string[];
    readonly marketAdaptations: string[];
  };
  readonly agentLearning: {
    readonly workflowOptimizations: number;
    readonly coordinationImprovements: string[];
    readonly hitlIntegrationScore: number;
  };
  readonly recommendedActions: {
    readonly contentOpportunities: string[];
    readonly skillDevelopmentAreas: string[];
    readonly strategicAdjustments: string[];
    readonly networkingTargets: string[];
  };
  readonly confidenceMetrics: {
    readonly averageConfidence: number;
    readonly humanValidationRate: number;
    readonly predictionAccuracy: number;
  };
}

/**
 * Brand Memory Hybrid Search Result
 * Combines vector similarity with graph relationship context
 */
export interface BrandMemoryHybridResult {
  readonly vectorResults: Array<{
    readonly memory: BrandMemoryEntry;
    readonly relevanceScore: number;
    readonly semanticContext: string[];
  }>;
  readonly graphContext: Array<{
    readonly relationship: BrandRelationshipType;
    readonly connectedMemories: BrandMemoryEntry[];
    readonly pathRelevance: number;
  }>;
  readonly hybridScore: number;
  readonly contextualInsights: {
    readonly patterns: string[];
    readonly trends: string[];
    readonly recommendations: string[];
  };
}

/**
 * Validation Schemas
 */
export const BrandMemoryTypeSchema = z.enum([
  'dev_achievement',
  'content_performance',
  'brand_strategy',
  'skill_profile',
  'career_milestone',
  'market_insight',
  'user_feedback',
  'workflow_learning',
]);

export const BrandMemoryMetadataSchema = z.object({
  type: z.union([
    BrandMemoryTypeSchema,
    z.enum([
      'conversation',
      'fact',
      'preference',
      'summary',
      'context',
      'custom',
    ]),
  ]),
  source: z.string().optional(),
  tags: z.string().optional(),
  importance: z.number().min(0).max(1).optional(),
  persistent: z.boolean().optional(),
  userId: z.string().optional(),
  brandContext: z
    .object({
      userId: z.string(),
      analysisId: z.string().optional(),
      contentId: z.string().optional(),
      strategyVersion: z.string().optional(),
      confidenceScore: z.number().min(0).max(1).optional(),
      validatedByHuman: z.boolean().optional(),
    })
    .optional(),
  technicalData: z
    .object({
      githubUsername: z.string().optional(),
      repositories: z.array(z.string()).optional(),
      technologies: z.array(z.string()).optional(),
      skillLevel: z
        .enum(['beginner', 'intermediate', 'advanced', 'expert'])
        .optional(),
      projectComplexity: z
        .enum(['simple', 'medium', 'complex', 'enterprise'])
        .optional(),
    })
    .optional(),
  contentMetrics: z
    .object({
      platform: z
        .enum(['linkedin', 'twitter', 'blog', 'newsletter', 'github'])
        .optional(),
      engagement: z.number().optional(),
      reach: z.number().optional(),
      conversions: z.number().optional(),
      generatedAt: z.string().optional(),
      approvalStatus: z
        .enum(['pending', 'approved', 'rejected', 'needs_revision'])
        .optional(),
    })
    .optional(),
  strategicData: z
    .object({
      targetAudience: z.array(z.string()).optional(),
      marketSegment: z.string().optional(),
      competitivePosition: z.string().optional(),
      brandPillars: z.array(z.string()).optional(),
      careerGoals: z.array(z.string()).optional(),
    })
    .optional(),
});

export const BrandMemoryEntrySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  userId: z.string(),
  content: z.string(),
  structuredData: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
  metadata: BrandMemoryMetadataSchema,
  createdAt: z.date(),
  lastAccessedAt: z.date().optional(),
  accessCount: z.number().min(0),
  relevanceScore: z.number().min(0).max(1).optional(),
  expiresAt: z.date().optional(),
});

export const BrandMemorySearchOptionsSchema = z.object({
  query: z.string().optional(),
  userId: z.string(),
  threadId: z.string().optional(),
  memoryTypes: z.array(BrandMemoryTypeSchema).optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  minRelevance: z.number().min(0).max(1).optional(),
  timeRange: z
    .object({
      start: z.date().optional(),
      end: z.date().optional(),
    })
    .optional(),
  brandContext: z
    .object({
      analysisId: z.string().optional(),
      contentId: z.string().optional(),
      strategyVersion: z.string().optional(),
      includeExpired: z.boolean().optional(),
    })
    .optional(),
  technicalFilter: z
    .object({
      technologies: z.array(z.string()).optional(),
      skillLevels: z
        .array(z.enum(['beginner', 'intermediate', 'advanced', 'expert']))
        .optional(),
      platforms: z
        .array(z.enum(['linkedin', 'twitter', 'blog', 'newsletter', 'github']))
        .optional(),
    })
    .optional(),
  strategicFilter: z
    .object({
      targetAudiences: z.array(z.string()).optional(),
      marketSegments: z.array(z.string()).optional(),
      brandPillars: z.array(z.string()).optional(),
    })
    .optional(),
  validationStatus: z
    .object({
      humanValidated: z.boolean().optional(),
      minConfidence: z.number().min(0).max(1).optional(),
      approvalStatus: z
        .array(z.enum(['pending', 'approved', 'rejected', 'needs_revision']))
        .optional(),
    })
    .optional(),
});

/**
 * Brand Memory Collections Constants
 */
export const BRAND_MEMORY_COLLECTIONS: BrandMemoryCollections = {
  devAchievements: 'dev_achievements',
  contentMetrics: 'content_metrics',
  brandHistory: 'brand_history',
  skillEvolution: 'skill_evolution',
  careerMilestones: 'career_milestones',
  marketIntelligence: 'market_intelligence',
  userFeedback: 'user_feedback',
  agentLearning: 'agent_learning',
} as const;

/**
 * Brand Memory Graph Node Labels for Neo4j
 */
export const BRAND_GRAPH_LABELS = {
  DEVELOPER: 'Developer',
  ACHIEVEMENT: 'Achievement',
  TECHNOLOGY: 'Technology',
  CONTENT: 'Content',
  AUDIENCE: 'Audience',
  STRATEGY: 'Strategy',
  CAREER_GOAL: 'CareerGoal',
  MARKET_TREND: 'MarketTrend',
  SKILL: 'Skill',
  FEEDBACK: 'Feedback',
  WORKFLOW: 'Workflow',
  AGENT: 'Agent',
} as const;

/**
 * Collection Utility Functions
 */
export const getCollectionForMemoryType = (
  memoryType: BrandMemoryType
): keyof BrandMemoryCollections => {
  const collectionMap: Record<BrandMemoryType, keyof BrandMemoryCollections> = {
    dev_achievement: 'devAchievements',
    content_performance: 'contentMetrics',
    brand_strategy: 'brandHistory',
    skill_profile: 'skillEvolution',
    career_milestone: 'careerMilestones',
    market_insight: 'marketIntelligence',
    user_feedback: 'userFeedback',
    workflow_learning: 'agentLearning',
  };

  return collectionMap[memoryType];
};

export const isValidBrandMemoryType = (
  type: string
): type is BrandMemoryType => {
  return Object.keys(getCollectionForMemoryType).includes(
    type as BrandMemoryType
  );
};
