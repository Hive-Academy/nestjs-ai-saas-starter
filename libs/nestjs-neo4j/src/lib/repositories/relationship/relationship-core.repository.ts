/**
 * @fileoverview Core Relationship Repository
 *
 * Provides essential CRUD operations for relationships using QueryBuilder patterns.
 * This service focuses on core relationship management operations.
 */

import { Injectable } from '@nestjs/common';
import {
  BaseRelationshipService,
  RelationshipQueryOptions,
  CreateRelationshipData,
  RelationshipResult,
} from './base-relationship.service';
import { NeogmaQueryRunnerService } from '../../query-builder/neogma-query-runner.service';
import { NeogmaQueryBuilderService } from '../../query-builder/neogma-query-builder.service';
import { NeogmaService } from '../../services/neogma.service';
import { ParameterBindingUtility } from '../../utilities/parameter-binding.utility';

/**
 * Core relationship repository for essential CRUD operations
 *
 * This repository provides the fundamental relationship management operations:
 * - Create relationships between nodes
 * - Find relationships by source/target nodes
 * - Update relationship properties
 * - Delete relationships (soft/hard)
 * - Check relationship existence
 * - Count relationships
 *
 * For bulk operations, use RelationshipBulkOperationsService instead.
 *
 * @template TRel The relationship type this repository manages
 * @template TSource The source node type
 * @template TTarget The target node type
 */
@Injectable()
export class RelationshipCoreRepository<
  TRel = any,
  TSource = any,
  TTarget = any
> extends BaseRelationshipService<TRel, TSource, TTarget> {
  constructor(
    neogmaService: NeogmaService,
    queryBuilder: NeogmaQueryBuilderService,
    queryRunner: NeogmaQueryRunnerService,
    relationshipType?: string,
    sourceLabel?: string,
    targetLabel?: string
  ) {
    super(
      neogmaService,
      queryBuilder,
      queryRunner,
      relationshipType,
      sourceLabel,
      targetLabel
    );
  }
  /**
   * Create a new relationship between two nodes
   */
  async createRelationship(
    data: CreateRelationshipData<TRel>,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>> {
    const sourceLabel = data.sourceLabel || this.sourceLabel;
    const targetLabel = data.targetLabel || this.targetLabel;
    const relationshipData = this.mapToNeo4j(data.properties || {});

    // Add timestamps
    const now = new Date().toISOString();
    relationshipData.createdAt = relationshipData.createdAt || now;
    relationshipData.updatedAt = now;

    // Build return clause based on options
    const returnVars = this.buildReturnVars(options);

    // Build query with inline Cypher
    const cypher = `
      MATCH (source:${sourceLabel} {id: $sourceId})
      MATCH (target:${targetLabel} {id: $targetId})
      CREATE (source)-[rel:${this.relationshipType} $properties]->(target)
      RETURN ${returnVars.join(', ')}
    `;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId: data.sourceId,
        targetId: data.targetId,
        properties: relationshipData,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    if (!queryResult.records || queryResult.records.length === 0) {
      throw new Error(`Failed to create relationship ${this.relationshipType}`);
    }

    const record = queryResult.records[0];
    return this.buildRelationshipResult(record, options);
  }

  /**
   * Find relationships by source node
   */
  async findBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    const returnVars = this.buildReturnVars(options);

    // Build query with inline Cypher
    let cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel})
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ` RETURN ${returnVars.join(', ')}`;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return queryResult.records.map((record) =>
      this.buildRelationshipResult(record, options)
    );
  }

  /**
   * Find relationships by target node
   */
  async findByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    const returnVars = this.buildReturnVars(options);

    // Build query with inline Cypher
    let cypher = `
      MATCH (source:${this.sourceLabel})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ` RETURN ${returnVars.join(', ')}`;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        targetId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return queryResult.records.map((record) =>
      this.buildRelationshipResult(record, options)
    );
  }

  /**
   * Find relationship between specific source and target
   */
  async findBetween(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget> | null> {
    const returnVars = this.buildReturnVars(options);

    // Build query with inline Cypher
    let cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ` RETURN ${returnVars.join(', ')} LIMIT 1`;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
        targetId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    if (!queryResult.records || queryResult.records.length === 0) {
      return null;
    }

    return this.buildRelationshipResult(queryResult.records[0], options);
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
    const updateData = this.mapToNeo4j(updates);
    updateData.updatedAt = new Date().toISOString();

    // Build return clause based on options
    const returnVars = this.buildReturnVars(options);

    // Create SET clause for updates
    const setClause = Object.keys(updateData)
      .map((key) => `rel.${key} = $${key}`)
      .join(', ');

    // Build query with inline Cypher
    let cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ` SET ${setClause} RETURN ${returnVars.join(', ')}`;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
        targetId,
        ...updateData,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    if (!queryResult.records || queryResult.records.length === 0) {
      return null;
    }

    return this.buildRelationshipResult(queryResult.records[0], options);
  }

  /**
   * Delete relationship between specific nodes
   */
  async deleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<boolean> {
    if (options?.hard) {
      return this.hardDeleteRelationship(sourceId, targetId, options);
    } else {
      return this.softDeleteRelationship(sourceId, targetId, options);
    }
  }

  /**
   * Soft delete relationship
   */
  async softDeleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    // Build query with inline Cypher
    const cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
      WHERE rel.deletedAt IS NULL
      SET rel.deletedAt = $deletedAt
      RETURN count(rel) > 0 as deleted
    `;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
        targetId,
        deletedAt: new Date().toISOString(),
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return (queryResult.records?.[0]?.get('deleted') as boolean) || false;
  }

  /**
   * Hard delete relationship
   */
  async hardDeleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    // Build query with inline Cypher
    const cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
      DELETE rel
      RETURN count(rel) > 0 as deleted
    `;

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
        targetId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return (queryResult.records?.[0]?.get('deleted') as boolean) || false;
  }

  /**
   * Count relationships by source
   */
  async countBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    // Build query with inline Cypher
    let cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->()
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ' RETURN count(rel) as count';

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return (queryResult.records?.[0]?.get('count')?.toInt() as number) || 0;
  }

  /**
   * Count relationships by target
   */
  async countByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    // Build query with inline Cypher
    let cypher = `
      MATCH ()-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ' RETURN count(rel) as count';

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        targetId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return (queryResult.records?.[0]?.get('count')?.toInt() as number) || 0;
  }

  /**
   * Check if relationship exists between nodes
   */
  async relationshipExists(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    // Build query with inline Cypher
    let cypher = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
    `;

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      cypher += ' WHERE rel.deletedAt IS NULL';
    }

    cypher += ' RETURN count(rel) > 0 as exists';

    // Use autoBind for parameter binding
    const { query: finalQuery, params } = ParameterBindingUtility.autoBind(
      cypher,
      {
        sourceId,
        targetId,
      }
    );

    const queryResult = await this.queryRunner.executeRaw(finalQuery, params);

    return (queryResult.records?.[0]?.get('exists') as boolean) || false;
  }
}
