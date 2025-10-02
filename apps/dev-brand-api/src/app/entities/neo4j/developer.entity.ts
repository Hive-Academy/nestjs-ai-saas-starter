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
 * Developer Entity
 *
 * Purpose: Developer profiles with skills and brand context
 * Current Usage: personal-brand-memory.service.ts (1,271 lines)
 *
 * Central entity representing developers in the personal brand system
 * with comprehensive analytics, skill tracking, and career goal management.
 */
@Neo4jEntity('Developer', {
  description: 'Developer profiles with skills and personal brand context',
})
export class Developer extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @Unique()
  @PropIndex()
  email!: string;

  @Neo4jProp()
  @NotNull()
  name!: string;

  @Neo4jProp()
  @JsonProperty()
  currentSkills!: string[];

  @Neo4jProp()
  @JsonProperty()
  careerGoals!: string[];

  @Neo4jProp()
  @JsonProperty()
  analytics!: {
    achievementTrend: 'improving' | 'stable' | 'declining';
    brandEvolutionScore: number;
    contentEngagementTrend: 'growing' | 'stable' | 'declining';
    influenceMetrics: {
      reach: number;
      engagement: number;
      authority: number;
    };
  };

  @Neo4jProp()
  @PropIndex()
  isActive!: boolean;

  @CreatedAt()
  joinedAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'ACHIEVED', direction: 'OUT' })
  achievements?: any[]; // Achievement[] - avoiding circular dependency

  @Neo4jRelationship({ type: 'HAS_BRAND_STRATEGY', direction: 'OUT' })
  brandStrategies?: any[]; // BrandStrategy[] - avoiding circular dependency

  @Neo4jRelationship({ type: 'EXPERIENCED_WITH', direction: 'OUT' })
  technologies?: any[]; // Technology[] - avoiding circular dependency

  @Neo4jRelationship({ type: 'REQUESTED_APPROVAL', direction: 'OUT' })
  approvalRequests?: any[]; // ApprovalRequest[] - avoiding circular dependency
}
