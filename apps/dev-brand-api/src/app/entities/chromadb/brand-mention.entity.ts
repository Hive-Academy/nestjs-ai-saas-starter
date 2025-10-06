import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * BrandMentionMetadata - Real-time brand mention data across social platforms
 */
export interface BrandMentionMetadata {
  userId: string;
  platform: 'twitter' | 'linkedin' | 'reddit' | 'dev.to' | 'medium';
  mentionType: 'direct' | 'indirect' | 'hashtag';
  sentiment: 'positive' | 'neutral' | 'negative';
  reach: number; // Estimated audience reach
  engagement: number; // Likes, shares, comments combined
  influencerScore: number; // 0-100 score of the mentioner's influence
  context: string; // Surrounding text context
  topics: string[]; // Extracted topics/keywords
  [key: string]: unknown;
}

/**
 * BrandMentionEntity - ChromaDB Entity for Brand Mentions
 *
 * Purpose: Monitor and analyze brand mentions across social platforms
 * Use Cases:
 * - Real-time brand monitoring
 * - Sentiment analysis
 * - Influencer identification
 * - Trending topic detection
 * - Viral potential alerts
 */
@ChromaEntity({
  collection: 'brand-mentions',
  description: 'Real-time brand mentions with sentiment and reach analysis',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class BrandMentionEntity extends BaseChromaEntity<BrandMentionMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Full mention content for semantic analysis',
    validate: (content: string) => content.length > 10 && content.length < 10000,
  })
  content!: string;

  metadata!: BrandMentionMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
