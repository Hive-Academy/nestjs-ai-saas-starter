import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * TechTrendMetadata - Technology trend analysis metadata
 */
export interface TechTrendMetadata {
  technology: string; // e.g., 'React', 'TypeScript', 'Docker'
  category: string; // 'frontend', 'backend', 'devops', 'ai', 'database'
  popularity: number; // 0-100 score
  growthRate: number; // -100 to +100 percentage change
  demandScore: number; // 0-100 job market demand
  relatedSkills: string[]; // Commonly paired technologies
  industryAdoption: string[]; // Industries using this tech
  futureOutlook: string; // 'declining', 'stable', 'growing', 'emerging'
  [key: string]: unknown;
}

/**
 * TechTrendEntity - ChromaDB Entity for Technology Trend Analysis
 *
 * Purpose: Track and analyze technology trends for content strategy
 * Use Cases:
 * - Identify emerging technologies to focus content on
 * - Analyze technology growth rates and market demand
 * - Generate technology recommendations for developers
 * - Discover related skills and technology combinations
 * - Track industry adoption patterns
 */
@ChromaEntity({
  collection: 'tech-trends',
  description: 'Technology trends and market analysis for content strategy',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class TechTrendEntity extends BaseChromaEntity<TechTrendMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Rich technology trend analysis for semantic search',
    validate: (content: string) => content.length > 30 && content.length < 2000,
  })
  content!: string;

  metadata!: TechTrendMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
