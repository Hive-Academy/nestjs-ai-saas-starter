/**
 * @fileoverview Relationship Repository Facade
 *
 * This facade provides a unified interface over the split relationship services
 * for backward compatibility while delegating to the modern QueryBuilder-based services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { RelationshipCoreRepository } from './relationship-core.repository';
import { RelationshipBulkOperationsService } from './relationship-bulk.service';
import type {
  RelationshipQueryOptions,
  CreateRelationshipData,
  RelationshipResult,
  BatchRelationshipOperation,
  RepositoryQueryOptions,
} from './base-relationship.service';
import type { Neo4jQueryParams } from '../../types/neo4j-types';

/**
 * Relationship Repository Facade
 *
 * This class provides a unified interface over the split relationship services:
 * - RelationshipCoreRepository: Essential CRUD operations
 * - RelationshipBulkOperationsService: Batch and bulk operations
 *
 * RECOMMENDED: Use RelationshipCoreRepository and RelationshipBulkOperationsService directly
 * for new development. This facade is maintained for backward compatibility.
 *
 * Migration Guide:
 * - Core operations → RelationshipCoreRepository
 * - Bulk operations → RelationshipBulkOperationsService
 * - All operations use modern QueryBuilder patterns for type safety
 *
 * @template TRel The relationship type this repository manages
 * @template TSource The source node type
 * @template TTarget The target node type
 */
@Injectable()
export class RelationshipRepository<TRel = any, TSource = any, TTarget = any> {
  protected readonly logger = new Logger(RelationshipRepository.name);

  constructor(
    private readonly coreRepository: RelationshipCoreRepository<
      TRel,
      TSource,
      TTarget
    >,
    private readonly bulkOperations: RelationshipBulkOperationsService<
      TRel,
      TSource,
      TTarget
    >
  ) {
    this.logger.warn(
      'RelationshipRepository is deprecated. Use RelationshipCoreRepository and RelationshipBulkOperationsService directly.'
    );
  }

  // =============================================================================
  // CORE RELATIONSHIP OPERATIONS (Delegated to RelationshipCoreRepository)
  // =============================================================================

  /**
   * Create a new relationship between two nodes
   */
  async createRelationship(
    data: CreateRelationshipData<TRel>,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>> {
    return this.coreRepository.createRelationship(data, options);
  }

  /**
   * Find relationships by source node
   */
  async findBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    return this.coreRepository.findBySource(sourceId, options);
  }

  /**
   * Find relationships by target node
   */
  async findByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    return this.coreRepository.findByTarget(targetId, options);
  }

  /**
   * Find relationship between specific source and target
   */
  async findBetween(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget> | null> {
    return this.coreRepository.findBetween(sourceId, targetId, options);
  }

  /**
   * Update relationship properties
   */
  async updateRelationship(
    sourceId: string,
    targetId: string,
    updates: Partial<TRel>,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget> | null> {
    return this.coreRepository.updateRelationship(
      sourceId,
      targetId,
      updates,
      options
    );
  }

  /**
   * Delete relationship between specific nodes
   */
  async deleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<boolean> {
    return this.coreRepository.deleteRelationship(sourceId, targetId, options);
  }

  /**
   * Soft delete relationship
   */
  async softDeleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    return this.coreRepository.softDeleteRelationship(
      sourceId,
      targetId,
      options
    );
  }

  /**
   * Hard delete relationship
   */
  async hardDeleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    return this.coreRepository.hardDeleteRelationship(
      sourceId,
      targetId,
      options
    );
  }

  /**
   * Count relationships by source
   */
  async countBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    return this.coreRepository.countBySource(sourceId, options);
  }

  /**
   * Count relationships by target
   */
  async countByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    return this.coreRepository.countByTarget(targetId, options);
  }

  /**
   * Check if relationship exists between nodes
   */
  async relationshipExists(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    return this.coreRepository.relationshipExists(sourceId, targetId, options);
  }

  // =============================================================================
  // BULK OPERATIONS (Delegated to RelationshipBulkOperationsService)
  // =============================================================================

  /**
   * Delete all relationships from a source node
   */
  async deleteAllFromSource(
    sourceId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<number> {
    return this.bulkOperations.deleteAllFromSource(sourceId, options);
  }

  /**
   * Delete all relationships to a target node
   */
  async deleteAllToTarget(
    targetId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<number> {
    return this.bulkOperations.deleteAllToTarget(targetId, options);
  }

  /**
   * Batch relationship operations
   */
  async batchOperations(
    operations: BatchRelationshipOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<{
    success: boolean;
    results: Array<{ success: boolean; error?: string }>;
  }> {
    return this.bulkOperations.batchOperations(operations, options);
  }

  /**
   * Optimized batch create using UNWIND
   */
  async batchCreateOptimized(
    operations: CreateRelationshipData<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    return this.bulkOperations.batchCreateOptimized(operations, options);
  }

  // =============================================================================
  // LEGACY COMPATIBILITY METHODS
  // =============================================================================

  /**
   * Execute a query (legacy compatibility)
   * @deprecated Use QueryRunner services directly
   */
  protected async query<R = any>(
    cypher: string,
    params?: Neo4jQueryParams,
    options?: RepositoryQueryOptions
  ): Promise<R[]> {
    this.logger.warn(
      'Legacy query method used. Consider migrating to QueryBuilder patterns.'
    );
    return this.coreRepository['query']<R>(cypher, params, options);
  }

  /**
   * Execute a query (alias for backward compatibility)
   * @deprecated Use QueryRunner services directly
   */
  protected async executeQuery<R = any>(
    cypher: string,
    params?: Neo4jQueryParams,
    options?: RepositoryQueryOptions
  ): Promise<R[]> {
    return this.query<R>(cypher, params, options);
  }

  /**
   * Map data to Neo4j compatible format
   * @deprecated Use services directly
   */
  protected mapToNeo4j(data: any): { [key: string]: unknown } {
    return this.coreRepository['mapToNeo4j'](data);
  }

  /**
   * Map Neo4j result to entity
   * @deprecated Use services directly
   */
  protected mapFromNeo4j(record: any): any {
    return this.coreRepository['mapFromNeo4j'](record);
  }

  /**
   * Default query options
   * @deprecated Use services directly
   */
  protected get defaultOptions(): RepositoryQueryOptions {
    return this.coreRepository['defaultOptions'];
  }

  /**
   * Build relationship result object
   * @deprecated Use services directly
   */
  protected buildRelationshipResult(
    record: any,
    options?: RelationshipQueryOptions
  ): RelationshipResult<TRel, TSource, TTarget> {
    return this.coreRepository['buildRelationshipResult'](record, options);
  }

  /**
   * Build soft delete filter for relationships
   * @deprecated Use services directly
   */
  protected buildSoftDeleteFilter(
    options?: RelationshipQueryOptions,
    relVariable = 'rel'
  ): string {
    return this.coreRepository['buildSoftDeleteFilter'](options, relVariable);
  }
}

// Export types for backward compatibility
export type {
  RelationshipQueryOptions,
  CreateRelationshipData,
  RelationshipResult,
  BatchRelationshipOperation,
  RepositoryQueryOptions,
};
