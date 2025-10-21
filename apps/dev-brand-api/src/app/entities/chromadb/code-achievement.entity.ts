import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * CodeAchievementMetadata - Type-safe metadata for code achievements
 */
export interface CodeAchievementMetadata {
  userId: string;
  description: string;
  technologies: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  date: string;
  repository: string;
  metrics: {
    linesChanged: number;
    complexity: number;
    testCoverage: number;
    pullRequests: number;
  };
  analysis: {
    innovationScore: number;
    collaborationLevel: 'individual' | 'team' | 'cross-team';
    technicalDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  };
  [key: string]: unknown; // Extensible
}

/**
 * CodeAchievementEntity - ChromaDB Entity for Developer Achievements
 */
@ChromaEntity({
  collection: 'dev-achievements',
  description: 'Developer code achievements and technical contributions',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class CodeAchievementEntity extends BaseChromaEntity<CodeAchievementMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Achievement description for semantic search and embedding',
  })
  content!: string;

  metadata!: CodeAchievementMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
