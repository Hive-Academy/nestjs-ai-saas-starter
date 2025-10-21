import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * AudienceAnalysisMetadata - Target audience segmentation and preferences
 */
export interface AudienceAnalysisMetadata {
  targetRole: string; // 'Frontend Dev', 'Backend Dev', 'DevOps', 'Data Scientist'
  industrySegment: string; // 'SaaS', 'FinTech', 'Healthcare', 'E-commerce'
  seniorityLevel: string; // 'Junior', 'Mid', 'Senior', 'Lead'
  interests: string[]; // Topics they care about
  contentPreferences: string[]; // 'tutorials', 'deep-dives', 'news', 'career-advice'
  platforms: string[]; // 'LinkedIn', 'Dev.to', 'Medium', 'Twitter'
  engagementPatterns: {
    bestPostingTimes: string[]; // ['Monday 9AM', 'Wednesday 2PM']
    preferredFormats: string[]; // ['article', 'video', 'infographic']
    topicInterests: string[];
  };
  [key: string]: unknown;
}

/**
 * AudienceAnalysisEntity - ChromaDB Entity for Audience Analysis
 *
 * Purpose: Analyze and segment target audiences for content optimization
 * Use Cases:
 * - Identify content preferences by developer role
 * - Analyze engagement patterns by platform
 * - Generate personalized content strategies
 * - Optimize posting schedules by audience
 * - Track industry-specific content trends
 */
@ChromaEntity({
  collection: 'audience-analysis',
  description: 'Developer audience segmentation and engagement analysis',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class AudienceAnalysisEntity extends BaseChromaEntity<AudienceAnalysisMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Rich audience profile for semantic analysis',
    validate: (content: string) => content.length > 50 && content.length < 3000,
  })
  content!: string;

  metadata!: AudienceAnalysisMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
