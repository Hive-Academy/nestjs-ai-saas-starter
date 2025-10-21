import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * ContentPerformanceMetadata - Type-safe metadata for content analytics
 */
export interface ContentPerformanceMetadata {
  userId: string;
  platform: 'linkedin' | 'devto' | 'twitter' | 'medium' | 'github' | 'blog';
  engagementScore: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks?: number;
  };
  createdAt: string;
  analysis: {
    sentiment: 'positive' | 'neutral' | 'negative';
    topics: string[];
    viralityFactor: number;
    audienceResonance: number;
    technicalDepth: number;
  };
  optimization: {
    bestPostingTime: string;
    suggestedHashtags: string[];
    audienceEngagement: 'high' | 'medium' | 'low';
  };
  [key: string]: unknown;
}

/**
 * ContentPerformanceEntity - ChromaDB Entity for Content Analytics
 */
@ChromaEntity({
  collection: 'content-metrics',
  description: 'Social media and content performance analytics',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class ContentPerformanceEntity extends BaseChromaEntity<ContentPerformanceMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Content text for semantic search and analysis',
  })
  content!: string;

  metadata!: ContentPerformanceMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
