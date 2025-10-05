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
  Validate,
} from '@hive-academy/nestjs-neo4j';

/**
 * ConfidencePattern Entity
 *
 * Purpose: ML patterns for confidence evaluation
 * Current Usage: neo4j-confidence-storage.adapter.ts (789 lines)
 *
 * Stores machine learning confidence patterns for approval prediction
 * with training metrics and feature weight analysis.
 */
@Neo4jEntity('ConfidencePattern', {
  description: 'ML confidence patterns for approval prediction',
})
export class ConfidencePattern extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  nodeId!: string;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  approvalRate!: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  averageConfidence!: number;

  @Neo4jProp()
  @JsonProperty()
  commonRejectionReasons!: string[];

  @Neo4jProp()
  @JsonProperty()
  riskFactors!: string[];

  @Neo4jProp()
  successfulExecutions!: number;

  @Neo4jProp()
  failedExecutions!: number;

  @Neo4jProp()
  @JsonProperty()
  featureWeights!: Record<string, number>;

  @Neo4jProp()
  @JsonProperty()
  @Validate({
    validation: {
      custom: {
        validator: (value: any) => {
          if (!value) return false;
          return (
            value.accuracy >= 0 &&
            value.accuracy <= 1 &&
            value.precision >= 0 &&
            value.precision <= 1 &&
            value.recall >= 0 &&
            value.recall <= 1 &&
            value.f1Score >= 0 &&
            value.f1Score <= 1
          );
        },
        message: 'Training metrics must all be between 0 and 1',
      },
    },
  })
  trainingMetrics!: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  lastUpdated!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'PREDICTS_FOR', direction: 'OUT' })
  targetNodes?: any[]; // Memory[] - avoiding circular dependency
}
