import {
  BaseChromaEntity,
  ChromaEntity,
  ChromaId,
  ChromaProp,
} from '@hive-academy/nestjs-chromadb';

/**
 * Competitor Analysis Metadata
 *
 * Comprehensive competitive intelligence for developer profiles
 */
export interface CompetitorAnalysisMetadata {
  /** Competitor's GitHub username */
  competitorUsername: string;

  /** Competitor's display name */
  name: string;

  /** Competitor's profile category */
  category: 'direct' | 'indirect' | 'aspirational' | 'emerging';

  /** Expertise areas */
  expertise: string[];

  /** Career level */
  careerLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';

  /** Follower metrics */
  followers: {
    github: number;
    twitter: number;
    linkedin: number;
    total: number;
  };

  /** Content metrics */
  contentMetrics: {
    postsPerWeek: number;
    averageEngagement: number;
    totalReach: number;
    viralPosts: number;
  };

  /** Repository metrics */
  repositoryMetrics: {
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    averageStars: number;
    trendingRepos: number;
  };

  /** Engagement quality */
  engagementQuality: {
    commentRate: number; // Comments per post
    shareRate: number; // Shares per post
    discussionDepth: number; // Average thread length
    communityInteraction: number; // 0-100 score
  };

  /** Content strategy */
  contentStrategy: {
    primaryTopics: string[];
    postingFrequency: string; // e.g., "daily", "3x/week"
    bestPerformingFormats: string[]; // e.g., ["tutorial", "case-study"]
    targetAudience: string;
  };

  /** Competitive strengths */
  strengths: string[];

  /** Competitive weaknesses */
  weaknesses: string[];

  /** Opportunities to differentiate */
  opportunities: string[];

  /** Threat assessment */
  threats: string[];

  /** Overall competitiveness score (0-100) */
  competitivenessScore: number;

  /** Market positioning */
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';

  /** Growth velocity (-100 to +100) */
  growthVelocity: number;

  /** Last analyzed timestamp */
  lastAnalyzed: Date;
}

/**
 * Competitor Analysis Entity
 *
 * Stores comprehensive competitive intelligence for developer profiles.
 * Enables market positioning analysis and differentiation strategies.
 *
 * @example
 * ```typescript
 * const competitor = new CompetitorAnalysisEntity();
 * competitor.content = "Dan Abramov - React core team member with strong community engagement";
 * competitor.metadata = {
 *   competitorUsername: "dan_abramov",
 *   name: "Dan Abramov",
 *   category: "aspirational",
 *   competitivenessScore: 95,
 *   marketPosition: "leader",
 *   // ... other metadata
 * };
 * ```
 */
@ChromaEntity({
  collection: 'competitor-analysis',
  description: 'Competitive intelligence for developer profiles',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class CompetitorAnalysisEntity extends BaseChromaEntity<CompetitorAnalysisMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  @ChromaProp()
  metadata!: CompetitorAnalysisMetadata;
}
