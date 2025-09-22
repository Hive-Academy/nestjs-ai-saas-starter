/**
 * @fileoverview Model Services Export Index
 * 
 * This file provides centralized exports for all Neo4j model services.
 * It includes the base model service and specialized node/relationship services.
 */

// Base model service
export * from './base-model.service';

// Specialized model services
export * from './node-model.service';
export * from './relationship-model.service';

// Type definitions and interfaces
export type {
  BaseEntity,
  EntityMetadata,
  ModelQueryOptions,
  EntityHooks
} from './base-model.service';

export type {
  NodeEntity,
  CreateRelationshipOptions,
  RelationshipQueryOptions,
  TraversalOptions,
  GraphPath,
  NodeStatistics
} from './node-model.service';

export type {
  RelationshipEntity,
  CreateRelationshipOptions as RelCreateOptions,
  RelationshipQueryOptions as RelQueryOptions,
  RelationshipPattern,
  RelationshipAnalytics,
  BidirectionalRelationship
} from './relationship-model.service';