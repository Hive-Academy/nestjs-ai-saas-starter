/**
 * @fileoverview Neo4j Constraint Service
 *
 * This service manages the lifecycle of Neo4j constraints including:
 * - Automatic constraint discovery from decorated entities
 * - Constraint creation and management
 * - Runtime validation
 * - Constraint conflict resolution
 * - Performance monitoring
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { ModuleRef } from '@nestjs/core'; // TODO: Future use for dependency resolution
import type { Session, Record } from 'neo4j-driver';
import { Neo4jService } from '../services/neo4j.service';
import {
  ConstraintMetadata,
  ConstraintCreationStatus,
  ConstraintValidationResult,
  ConstraintStatistics,
  ConstraintConflict,
  isNodeKeyConstraint,
  isUniqueConstraint,
  isNotNullConstraint,
  isIndexConstraint,
  isValidationConstraint,
  NodeKeyConstraintMetadata,
  UniqueConstraintMetadata,
  NotNullConstraintMetadata,
  IndexConstraintMetadata,
  ValidationConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';
import {
  generateNodeKeyConstraintQuery,
  getNodeKeyConstraints,
} from './node-key.decorator';
import {
  generateUniqueConstraintQuery,
  getUniqueConstraints,
} from './unique.decorator';
import {
  generateNotNullConstraintQuery,
  getNotNullConstraints,
} from './not-null.decorator';
import { generateIndexQuery, getIndexConstraints } from './index.decorator';
import { getValidationConstraints } from './validate.decorator';

/**
 * Configuration for the constraint service
 */
export interface ConstraintServiceConfig {
  /** Whether to automatically create constraints on startup */
  autoCreateConstraints?: boolean;
  /** Whether to validate constraints before operations */
  enableValidation?: boolean;
  /** Maximum time to wait for constraint creation (ms) */
  creationTimeout?: number;
  /** Whether to log constraint operations */
  enableLogging?: boolean;
  /** Strategy for handling constraint conflicts */
  conflictResolution?: 'skip' | 'merge' | 'override' | 'error';
  /** Whether to collect constraint statistics */
  collectStatistics?: boolean;
}

/**
 * Constraint operation result
 */
export interface ConstraintOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Number of constraints processed */
  processed: number;
  /** Number of constraints created successfully */
  created: number;
  /** Number of constraints that failed */
  failed: number;
  /** Detailed results for each constraint */
  results: ConstraintCreationStatus[];
  /** Any conflicts that were resolved */
  conflicts: ConstraintConflict[];
  /** Operation duration in milliseconds */
  duration: number;
}

/**
 * Entity constraint information
 */
export interface EntityConstraintInfo {
  /** Entity constructor */
  entityClass: any;
  /** Entity label */
  label: string;
  /** All constraints for this entity */
  constraints: ConstraintMetadata[];
  /** Constraints by type */
  constraintsByType: {
    nodeKey: NodeKeyConstraintMetadata[];
    unique: UniqueConstraintMetadata[];
    notNull: NotNullConstraintMetadata[];
    index: IndexConstraintMetadata[];
    validation: ValidationConstraintMetadata[];
  };
}

@Injectable()
export class ConstraintService implements OnModuleInit {
  private readonly logger = new Logger(ConstraintService.name);
  private readonly entityRegistry = new Map<string, EntityConstraintInfo>();
  private readonly constraintCache = new Map<
    string,
    ConstraintCreationStatus
  >();
  private statistics: ConstraintStatistics = {
    total: 0,
    byType: {
      NODE_KEY: 0,
      UNIQUE: 0,
      NOT_NULL: 0,
      INDEX: 0,
      VALIDATION: 0,
      CUSTOM: 0,
    },
    byTarget: {
      class: 0,
      property: 0,
    },
    successRate: 0,
    lastUpdated: new Date(),
  };

  constructor(
    private readonly neo4j: Neo4jService,
    // private readonly moduleRef: ModuleRef, // TODO: Future use for dependency resolution
    private readonly config: ConstraintServiceConfig = {}
  ) {
    // Set default configuration
    this.config = {
      autoCreateConstraints: true,
      enableValidation: true,
      creationTimeout: 30000,
      enableLogging: true,
      conflictResolution: 'merge',
      collectStatistics: true,
      ...config,
    };
  }

  /**
   * Initialize the constraint service
   */
  async onModuleInit(): Promise<void> {
    if (this.config.enableLogging) {
      this.logger.log('Initializing Neo4j Constraint Service...');
    }

    // Discover entities with constraints
    await this.discoverConstraints();

    // Create constraints if enabled
    if (this.config.autoCreateConstraints) {
      await this.createAllConstraints();
    }

    // Update statistics
    if (this.config.collectStatistics) {
      this.updateStatistics();
    }

    if (this.config.enableLogging) {
      this.logger.log(
        `Constraint service initialized with ${this.statistics.total} constraints`
      );
    }
  }

  /**
   * Register an entity with its constraints
   */
  registerEntity(entityClass: any, label?: string): EntityConstraintInfo {
    const entityLabel = label || entityClass.name;

    // Extract all constraints from the entity
    const nodeKeyConstraints = getNodeKeyConstraints(entityClass);
    const uniqueConstraints = getUniqueConstraints(entityClass);
    const notNullConstraints = getNotNullConstraints(entityClass);
    const indexConstraints = getIndexConstraints(entityClass);
    const validationConstraints = getValidationConstraints(entityClass);

    const allConstraints: ConstraintMetadata[] = [
      ...nodeKeyConstraints,
      ...uniqueConstraints,
      ...notNullConstraints,
      ...indexConstraints,
      ...validationConstraints,
    ];

    const entityInfo: EntityConstraintInfo = {
      entityClass,
      label: entityLabel,
      constraints: allConstraints,
      constraintsByType: {
        nodeKey: nodeKeyConstraints,
        unique: uniqueConstraints,
        notNull: notNullConstraints,
        index: indexConstraints,
        validation: validationConstraints,
      },
    };

    this.entityRegistry.set(entityLabel, entityInfo);

    if (this.config.enableLogging && allConstraints.length > 0) {
      this.logger.log(
        `Registered entity ${entityLabel} with ${allConstraints.length} constraints`
      );
    }

    return entityInfo;
  }

  /**
   * Create all constraints for all registered entities
   */
  async createAllConstraints(): Promise<ConstraintOperationResult> {
    const startTime = Date.now();
    const results: ConstraintCreationStatus[] = [];
    const conflicts: ConstraintConflict[] = [];

    let processed = 0;
    let created = 0;
    let failed = 0;

    for (const entityInfo of Array.from(this.entityRegistry.values())) {
      for (const constraint of entityInfo.constraints) {
        processed++;

        try {
          const result = await this.createConstraint(constraint);
          results.push(result);

          if (result.success) {
            created++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          results.push({
            constraint,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            createdAt: new Date(),
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: failed === 0,
      processed,
      created,
      failed,
      results,
      conflicts,
      duration,
    };
  }

  /**
   * Create a single constraint
   */
  async createConstraint(
    constraint: ConstraintMetadata
  ): Promise<ConstraintCreationStatus> {
    const constraintId = this.getConstraintId(constraint);

    // Check if constraint already exists in cache
    const cached = this.constraintCache.get(constraintId);
    if (cached && cached.success) {
      return cached;
    }

    try {
      let queryInfo: { query: string; name: string };

      // Generate appropriate constraint query based on type
      if (isNodeKeyConstraint(constraint)) {
        queryInfo = generateNodeKeyConstraintQuery(constraint);
      } else if (isUniqueConstraint(constraint)) {
        queryInfo = generateUniqueConstraintQuery(constraint);
      } else if (isNotNullConstraint(constraint)) {
        queryInfo = generateNotNullConstraintQuery(constraint);
      } else if (isIndexConstraint(constraint)) {
        queryInfo = generateIndexQuery(constraint);
      } else {
        throw new Error(`Unsupported constraint type: ${constraint.type}`);
      }

      // Execute constraint creation
      await this.neo4j.write(async (session: Session) => {
        await session.run(queryInfo.query);
      });

      const result: ConstraintCreationStatus = {
        constraint,
        success: true,
        neo4jName: queryInfo.name,
        createdAt: new Date(),
      };

      // Cache the result
      this.constraintCache.set(constraintId, result);

      if (this.config.enableLogging) {
        this.logger.log(
          `Created ${constraint.type} constraint: ${queryInfo.name}`
        );
      }

      return result;
    } catch (error) {
      const result: ConstraintCreationStatus = {
        constraint,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      };

      // Cache the failed result
      this.constraintCache.set(constraintId, result);

      if (this.config.enableLogging) {
        this.logger.error(
          `Failed to create ${constraint.type} constraint: ${result.error}`
        );
      }

      return result;
    }
  }

  /**
   * Validate an entity against its constraints
   */
  async validateEntity(
    entity: any,
    entityClass?: any
  ): Promise<ConstraintValidationResult> {
    const entityType = entityClass || entity.constructor;
    const entityInfo = this.getEntityInfo(entityType);

    if (!entityInfo) {
      return { valid: true, errors: [] };
    }

    const errors: any[] = [];

    // Validate each constraint type
    for (const constraint of entityInfo.constraints) {
      if (isValidationConstraint(constraint)) {
        // Runtime validation is handled by the validate decorator
        continue;
      }

      // Validate constraint requirements
      if (isNodeKeyConstraint(constraint) || isUniqueConstraint(constraint)) {
        for (const property of constraint.properties) {
          const value = entity[property];

          if (value === null || value === undefined) {
            const allowPartial = isNodeKeyConstraint(constraint)
              ? constraint.options?.allowPartial
              : false;
            if (!allowPartial) {
              errors.push({
                property,
                message: `${constraint.type} constraint requires property '${property}' to have a value`,
                constraint: constraint.type,
                value,
                expected: 'non-null value',
              });
            }
          }
        }
      } else if (isNotNullConstraint(constraint)) {
        const property = constraint.properties[0];
        const value = entity[property];

        if (value === null || value === undefined) {
          errors.push({
            property,
            message: `Property '${property}' cannot be null`,
            constraint: constraint.type,
            value,
            expected: 'non-null value',
          });
        }

        // Check for empty strings if configured
        if (
          constraint.options?.treatEmptyAsNull &&
          typeof value === 'string' &&
          value.trim() === ''
        ) {
          errors.push({
            property,
            message: `Property '${property}' cannot be empty`,
            constraint: constraint.type,
            value,
            expected: 'non-empty value',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get constraint statistics
   */
  getStatistics(): ConstraintStatistics {
    return { ...this.statistics };
  }

  /**
   * Get all registered entities
   */
  getRegisteredEntities(): EntityConstraintInfo[] {
    return Array.from(this.entityRegistry.values());
  }

  /**
   * Get entity constraint information
   */
  getEntityInfo(entityClass: any): EntityConstraintInfo | undefined {
    const label = entityClass.name;
    return this.entityRegistry.get(label);
  }

  /**
   * Check if constraints exist for an entity
   */
  hasConstraints(entityClass: any): boolean {
    const entityInfo = this.getEntityInfo(entityClass);
    return entityInfo ? entityInfo.constraints.length > 0 : false;
  }

  /**
   * Drop a constraint
   */
  async dropConstraint(constraintName: string): Promise<boolean> {
    try {
      await this.neo4j.write(async (session: Session) => {
        await session.run(`DROP CONSTRAINT ${constraintName}`);
      });

      if (this.config.enableLogging) {
        this.logger.log(`Dropped constraint: ${constraintName}`);
      }

      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        this.logger.error(
          `Failed to drop constraint ${constraintName}: ${error}`
        );
      }
      return false;
    }
  }

  /**
   * List all constraints in the database
   */
  async listDatabaseConstraints(): Promise<any[]> {
    return this.neo4j.read(async (session: Session) => {
      const result = await session.run('SHOW CONSTRAINTS');
      return result.records.map((record: Record) => record.toObject());
    });
  }

  /**
   * Discover constraints from all entities
   */
  private async discoverConstraints(): Promise<void> {
    // This would typically integrate with a module discovery service
    // For now, entities need to be manually registered
    if (this.config.enableLogging) {
      this.logger.log('Constraint discovery completed');
    }
  }

  /**
   * Update constraint statistics
   */
  private updateStatistics(): void {
    let total = 0;
    const byType = {
      NODE_KEY: 0,
      UNIQUE: 0,
      NOT_NULL: 0,
      INDEX: 0,
      VALIDATION: 0,
      CUSTOM: 0,
    };
    const byTarget = {
      class: 0,
      property: 0,
    };

    for (const entityInfo of Array.from(this.entityRegistry.values())) {
      for (const constraint of entityInfo.constraints) {
        total++;
        byType[constraint.type]++;
        byTarget[constraint.target]++;
      }
    }

    const successfulConstraints = Array.from(
      this.constraintCache.values()
    ).filter((status) => status.success).length;

    this.statistics = {
      total,
      byType,
      byTarget,
      successRate: total > 0 ? successfulConstraints / total : 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate a unique ID for a constraint
   */
  private getConstraintId(constraint: ConstraintMetadata): string {
    return `${constraint.type}_${constraint.label}_${constraint.properties.join(
      '_'
    )}_${constraint.target}`;
  }
}
