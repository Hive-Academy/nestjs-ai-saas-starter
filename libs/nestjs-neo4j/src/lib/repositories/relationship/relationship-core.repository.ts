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

    // Use QueryBuilder for type-safe relationship creation
    const builder = this.queryBuilder.createBuilder();

    builder
      .match(`(source:${sourceLabel} {id: $sourceId})`)
      .match(`(target:${targetLabel} {id: $targetId})`)
      .create(`(source)-[rel:${this.relationshipType} $properties]->(target)`)
      .return(returnVars.join(', '));

    // Add parameters using BindParam
    const bindParam = builder.getBindParam();
    bindParam.add(data.sourceId, 'sourceId');
    bindParam.add(data.targetId, 'targetId');
    bindParam.add(relationshipData, 'properties');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

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

    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel})`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.return(returnVars.join(', '));

    // Add parameters
    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');

    return this.executeRelationshipQuery(builder, options);
  }

  /**
   * Find relationships by target node
   */
  async findByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    const returnVars = this.buildReturnVars(options);

    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.return(returnVars.join(', '));

    // Add parameters
    const bindParam = builder.getBindParam();
    bindParam.add(targetId, 'targetId');

    return this.executeRelationshipQuery(builder, options);
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

    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.return(returnVars.join(', ')).limit(1);

    // Add parameters
    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');
    bindParam.add(targetId, 'targetId');

    return this.executeRelationshipQuerySingle(builder, options);
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

    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.raw(`SET ${setClause}`).return(returnVars.join(', '));

    // Add parameters
    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');
    bindParam.add(targetId, 'targetId');

    // Add update parameters
    Object.entries(updateData).forEach(([key, value]) => {
      bindParam.add(value, key);
    });

    return this.executeRelationshipQuerySingle(builder, options);
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
    const builder = this.queryBuilder.createBuilder();
    builder
      .match(
        `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
      )
      .raw('WHERE rel.deletedAt IS NULL')
      .raw('SET rel.deletedAt = $deletedAt')
      .return('count(rel) > 0 as deleted');

    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');
    bindParam.add(targetId, 'targetId');
    bindParam.add(new Date().toISOString(), 'deletedAt');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

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
    const builder = this.queryBuilder.createBuilder();
    builder
      .match(
        `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
      )
      .raw('DELETE rel')
      .return('count(rel) > 0 as deleted');

    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');
    bindParam.add(targetId, 'targetId');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

    return (queryResult.records?.[0]?.get('deleted') as boolean) || false;
  }

  /**
   * Count relationships by source
   */
  async countBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->()`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.return('count(rel) as count');

    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

    return (queryResult.records?.[0]?.get('count')?.toInt() as number) || 0;
  }

  /**
   * Count relationships by target
   */
  async countByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `()-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.return('count(rel) as count');

    const bindParam = builder.getBindParam();
    bindParam.add(targetId, 'targetId');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

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
    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    this.addSoftDeleteFilter(builder, options);

    builder.return('count(rel) > 0 as exists');

    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');
    bindParam.add(targetId, 'targetId');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

    return (queryResult.records?.[0]?.get('exists') as boolean) || false;
  }
}
