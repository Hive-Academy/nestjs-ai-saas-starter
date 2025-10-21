import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * BrandStrategyMetadata - Type-safe metadata for brand strategies
 */
export interface BrandStrategyMetadata {
  userId: string;
  positioning: string;
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
  targetAudience: string;
  confidenceScore: number;
  createdAt: string;
  evolution: {
    previousStrategyId?: string;
    changeTrigger: string;
    improvementScore: number;
    marketContext: string[];
  };
  metrics: {
    implementationProgress: number;
    marketResonance: number;
    competitorDifferentiation: number;
  };
  [key: string]: unknown;
}

/**
 * BrandStrategyEntity - ChromaDB Entity for Brand Strategy Evolution
 */
@ChromaEntity({
  collection: 'brand-evolution',
  description: 'Personal brand strategy evolution and positioning tracking',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class BrandStrategyEntity extends BaseChromaEntity<BrandStrategyMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Brand strategy summary for semantic search',
  })
  content!: string;

  metadata!: BrandStrategyMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
