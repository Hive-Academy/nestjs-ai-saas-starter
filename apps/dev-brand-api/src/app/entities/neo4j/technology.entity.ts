import {
  CreatedAt,
  Id,
  JsonProperty,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  PropIndex,
  Unique,
  UpdatedAt,
} from '@hive-academy/nestjs-neo4j';

/**
 * Technology Entity
 *
 * Purpose: Technology nodes with proficiency tracking
 * Current Usage: personal-brand-memory.service.ts
 *
 * Represents technologies with popularity metrics and usage tracking,
 * enabling skill assessment and technology trend analysis.
 */
@Neo4jEntity('Technology', {
  description: 'Technology nodes with proficiency and usage tracking',
})
export class Technology extends Neo4jBaseEntity {
  @Id()
  @Unique()
  name!: string;

  @Neo4jProp()
  @PropIndex()
  category!: string;

  @Neo4jProp()
  @PropIndex({ type: 'TEXT' })
  description?: string;

  @Neo4jProp()
  @JsonProperty()
  popularityMetrics!: {
    githubStars?: number;
    npmDownloads?: number;
    stackOverflowQuestions?: number;
  };

  @CreatedAt()
  firstUsed!: Date;

  @UpdatedAt()
  lastUsed!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'EXPERIENCED_WITH', direction: 'IN' })
  developers?: any[]; // Developer[] - avoiding circular dependency

  @Neo4jRelationship({ type: 'USES_TECHNOLOGY', direction: 'IN' })
  achievements?: any[]; // Achievement[] - avoiding circular dependency
}
