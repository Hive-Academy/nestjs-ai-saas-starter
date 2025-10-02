import {
  CreatedAt,
  Id,
  JsonProperty,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  NotNull,
  PropIndex,
  Unique,
  UpdatedAt,
} from '@hive-academy/nestjs-neo4j';

/**
 * BrandStrategy Entity
 *
 * Purpose: Personal brand positioning strategies
 * Current Usage: personal-brand-memory.service.ts
 *
 * Manages personal brand strategies with evolution tracking,
 * market positioning, and performance metrics.
 */
@Neo4jEntity('BrandStrategy', {
  description: 'Personal brand positioning strategies with evolution tracking',
})
export class BrandStrategy extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  userId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ type: 'TEXT' })
  positioning!: string;

  @Neo4jProp()
  @JsonProperty()
  strengths!: string[];

  @Neo4jProp()
  @JsonProperty()
  opportunities!: string[];

  @Neo4jProp()
  @JsonProperty()
  recommendations!: string[];

  @Neo4jProp()
  @NotNull()
  targetAudience!: string;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  confidenceScore!: number;

  @Neo4jProp()
  @JsonProperty()
  evolution!: {
    previousStrategyId?: string;
    changeTrigger: string;
    improvementScore: number;
    marketContext: string[];
  };

  @Neo4jProp()
  @JsonProperty()
  metrics!: {
    implementationProgress: number;
    marketResonance: number;
    competitorDifferentiation: number;
  };

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'HAS_BRAND_STRATEGY', direction: 'IN' })
  developer!: any; // Developer - avoiding circular dependency

  @Neo4jRelationship({ type: 'EVOLVED_FROM', direction: 'OUT' })
  previousStrategy?: any; // BrandStrategy - avoiding circular dependency
}
