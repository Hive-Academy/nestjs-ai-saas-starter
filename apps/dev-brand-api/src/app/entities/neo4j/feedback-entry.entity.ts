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
  RangeIndex,
  TextIndex,
  Unique,
  UpdatedAt,
  Validate,
} from '@hive-academy/nestjs-neo4j';

/**
 * FeedbackEntry Entity
 *
 * Purpose: User feedback for AI learning
 * Current Usage: neo4j-feedback-storage.adapter.ts (530 lines)
 *
 * Captures user feedback entries for AI learning and improvement
 * with sentiment analysis and tag classification.
 */
@Neo4jEntity('FeedbackEntry', {
  description: 'User feedback entries for AI learning and improvement',
})
export class FeedbackEntry extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  executionId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    enum: ['positive', 'negative', 'neutral', 'suggestion'],
    message: 'Type must be one of: positive, negative, neutral, suggestion',
  })
  type!: 'positive' | 'negative' | 'neutral' | 'suggestion';

  @Neo4jProp()
  @NotNull()
  @TextIndex()
  content!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  providerId!: string;

  @Neo4jProp()
  providerName!: string;

  @Neo4jProp()
  @PropIndex()
  providerRole!: string;

  @Neo4jProp()
  @JsonProperty()
  metadata!: Record<string, any>;

  @Neo4jProp()
  @PropIndex()
  processed!: boolean;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  @RangeIndex()
  @Validate({
    min: -1,
    max: 1,
    message: 'Sentiment score must be between -1 and 1',
  })
  sentiment?: number;

  @Neo4jProp()
  @JsonProperty()
  tags?: string[];

  @CreatedAt()
  @RangeIndex()
  timestamp!: Date;

  @UpdatedAt()
  processedAt?: Date;

  // Relationships
  @Neo4jRelationship({ type: 'FEEDBACK_FOR', direction: 'OUT' })
  execution?: any; // WorkflowExecution - avoiding circular dependency

  @Neo4jRelationship({ type: 'PROVIDED_BY', direction: 'OUT' })
  provider?: any; // Developer - avoiding circular dependency
}
