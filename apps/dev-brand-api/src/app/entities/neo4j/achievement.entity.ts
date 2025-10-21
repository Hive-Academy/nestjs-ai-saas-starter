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
  Validate,
} from '@hive-academy/nestjs-neo4j';

/**
 * Achievement Entity
 *
 * Purpose: Code achievements with innovation metrics
 * Current Usage: personal-brand-memory.service.ts
 *
 * Tracks developer achievements with comprehensive metrics including
 * innovation scoring, collaboration levels, and technical depth analysis.
 */
@Neo4jEntity('Achievement', {
  description: 'Code achievements with innovation and impact metrics',
})
export class Achievement extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  userId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  description!: string;

  @Neo4jProp()
  @JsonProperty()
  technologies!: string[];

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    validation: {
      custom: {
        validator(value, entity) {
          const validImpacts = ['low', 'medium', 'high', 'critical'];
          return validImpacts.includes(value);
        },
        message: 'Impact must be one of: low, medium, high, critical',
      },
    },
  })
  impact!: 'low' | 'medium' | 'high' | 'critical';

  @Neo4jProp()
  @NotNull()
  @PropIndex({ type: 'RANGE' })
  @Validate({
    validation: {
      custom: {
        validator(value: Date) {
          return value <= new Date();
        },
        message: 'Achievement date cannot be in the future',
      },
    },
  })
  date!: Date;

  @Neo4jProp()
  @PropIndex()
  repository!: string;

  @Neo4jProp()
  @JsonProperty()
  metrics!: {
    linesChanged: number;
    complexity: number;
    testCoverage: number;
    pullRequests: number;
  };

  @Neo4jProp()
  @JsonProperty()
  @Validate({
    validation: {
      custom: {
        validator(value, entity) {
          const validCollabLevels = ['individual', 'team', 'cross-team'];
          const validTechDepths = [
            'basic',
            'intermediate',
            'advanced',
            'expert',
          ];
          return (
            value.innovationScore >= 0 &&
            value.innovationScore <= 1 &&
            validCollabLevels.includes(value.collaborationLevel) &&
            validTechDepths.includes(value.technicalDepth)
          );
        },
        message:
          'Invalid analysis: innovationScore must be 0-1, valid collaboration and technical depth required',
      },
    },
  })
  analysis!: {
    innovationScore: number;
    collaborationLevel: 'individual' | 'team' | 'cross-team';
    technicalDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  };

  @CreatedAt()
  createdAt!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'ACHIEVED_BY', direction: 'IN' })
  developer!: any; // Developer - avoiding circular dependency

  @Neo4jRelationship({ type: 'USES_TECHNOLOGY', direction: 'OUT' })
  usedTechnologies?: any[]; // Technology[] - avoiding circular dependency
}
