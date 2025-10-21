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
 * Strength Entity
 *
 * Purpose: Developer strengths and competencies tracking
 * Current Usage: personal-brand-memory.service.ts
 *
 * Represents individual developer strengths with evidence tracking
 * and confidence scoring for personal brand development.
 */
@Neo4jEntity('Strength', {
  description: 'Developer strengths and competencies with evidence tracking',
})
export class Strength extends Neo4jBaseEntity {
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
  name!: string;

  @Neo4jProp()
  @PropIndex({ type: 'TEXT' })
  description!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  category!:
    | 'technical'
    | 'leadership'
    | 'communication'
    | 'creative'
    | 'analytical';

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  confidenceLevel!: number;

  @Neo4jProp()
  @JsonProperty()
  evidence!: {
    achievements: string[];
    projects: string[];
    feedback: string[];
    metrics: Record<string, number>;
  };

  @Neo4jProp()
  @JsonProperty()
  development!: {
    currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    actionPlan: string[];
    timeline: string;
  };

  @Neo4jProp()
  @PropIndex()
  isActive!: boolean;

  @CreatedAt()
  identifiedAt!: Date;

  @UpdatedAt()
  lastAssessed!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'HAS_STRENGTH', direction: 'IN' })
  developer!: any; // Developer - avoiding circular dependency

  @Neo4jRelationship({ type: 'DEMONSTRATES_IN', direction: 'OUT' })
  relatedAchievements?: any[]; // Achievement[] - avoiding circular dependency

  @Neo4jRelationship({ type: 'SUPPORTS_STRATEGY', direction: 'OUT' })
  brandStrategies?: any[]; // BrandStrategy[] - avoiding circular dependency
}
