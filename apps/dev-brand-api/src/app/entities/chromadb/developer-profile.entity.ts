import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * DeveloperProfileMetadata - Comprehensive GitHub-based developer profile
 */
export interface DeveloperProfileMetadata {
  githubUsername: string;
  name: string;
  email: string;
  expertise: string[];
  experience: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
  specializations: string[];
  topLanguages: string[];
  contributionScore: number;
  repositories: {
    total: number;
    stars: number;
    forks: number;
  };
  activity: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
  analysis: {
    codingPatterns: string[];
    leadershipIndicators: string[];
    collaborationStyle: string;
    technicalBreadth: number;
    technicalDepth: number;
  };
  [key: string]: unknown;
}

/**
 * DeveloperProfileEntity - ChromaDB Entity for Developer GitHub Profiles
 *
 * Purpose: Store and analyze comprehensive developer profiles from GitHub
 * Use Cases:
 * - Automatic experience level classification
 * - Coding pattern recognition
 * - Leadership indicator detection
 * - Contribution metrics tracking
 * - Semantic search for similar developers
 */
@ChromaEntity({
  collection: 'developer-profiles',
  description: 'Comprehensive developer profiles with GitHub analysis',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class DeveloperProfileEntity extends BaseChromaEntity<DeveloperProfileMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Rich developer profile for semantic analysis',
    validate: (content: string) => content.length > 50 && content.length < 5000,
  })
  content!: string;

  metadata!: DeveloperProfileMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
