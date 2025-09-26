/**
 * Neo4jService - Modern facade service for backward compatibility
 *
 * This service provides a compatibility layer that delegates to the new
 * NeogmaService while maintaining the existing interface for gradual migration.
 *
 * RECOMMENDED: Use NeogmaService directly for new code.
 */

import { Injectable, Logger } from '@nestjs/common';
import { NeogmaService, FindOptions } from './neogma.service';
import { NeogmaMetricsService, SystemHealth } from './neogma-metrics.service';
import {
  NeogmaConnectionService,
  ConnectionStatus,
} from './neogma-connection.service';
import type {
  Neo4jCompatibleEntity,
  Neo4jQueryParams,
} from '../types/neo4j-types';
import type { Neogma, NeogmaModel } from 'neogma';

/**
 * Legacy interface for backward compatibility
 */
export interface QueryResult<T = any> {
  records: T[];
  summary: {
    query: string;
    parameters: Neo4jQueryParams;
    resultAvailableAfter: number;
    resultConsumedAfter: number;
  };
}

/**
 * Neo4jService - Facade that delegates to modern Neogma services
 *
 * This service maintains backward compatibility while encouraging
 * migration to the new NeogmaService architecture.
 */
@Injectable()
export class Neo4jService {
  private readonly logger = new Logger(Neo4jService.name);

  constructor(
    private readonly neogmaService: NeogmaService,
    private readonly metricsService: NeogmaMetricsService,
    private readonly connectionService: NeogmaConnectionService
  ) {
    this.logger.log(
      'Neo4jService facade initialized - delegates to NeogmaService'
    );
  }

  // ==================== MODERN API (RECOMMENDED) ====================

  /**
   * Find a single entity by ID (RECOMMENDED)
   */
  async findOne<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    id: string
  ): Promise<T | null> {
    return this.neogmaService.findOne<T>(model, id);
  }

  /**
   * Find multiple entities (RECOMMENDED)
   */
  async findMany<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    options?: FindOptions<T>
  ): Promise<T[]> {
    return this.neogmaService.findMany<T>(model, options);
  }

  /**
   * Create a new entity (RECOMMENDED)
   */
  async create<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    data: Partial<T>
  ): Promise<T> {
    return this.neogmaService.create<T>(model, data);
  }

  /**
   * Update an existing entity (RECOMMENDED)
   */
  async update<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    return this.neogmaService.update<T>(model, id, updates);
  }

  /**
   * Delete an entity (RECOMMENDED)
   */
  async delete(model: NeogmaModel, id: string): Promise<boolean> {
    return this.neogmaService.delete(model, id);
  }

  /**
   * Count entities (RECOMMENDED)
   */
  async count(model: NeogmaModel, where?: any): Promise<number> {
    return this.neogmaService.count(model, where);
  }

  /**
   * Execute Cypher query (RECOMMENDED)
   */
  async query<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<T[]> {
    return this.neogmaService.query<T>(cypher, params);
  }

  /**
   * Execute Cypher query for single result (RECOMMENDED)
   */
  async queryOne<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<T | null> {
    return this.neogmaService.queryOne<T>(cypher, params);
  }

  /**
   * Execute operations in transaction (RECOMMENDED)
   */
  async transaction<T>(work: (runner: any) => Promise<T>): Promise<T> {
    return this.neogmaService.transaction<T>(work);
  }

  // ==================== COMPATIBILITY API ====================

  /**
   * Legacy run method - converts to modern query format
   * @deprecated Use query() or queryOne() instead
   */
  async run<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const records = await this.neogmaService.query<T>(cypher, params);
    const endTime = Date.now();

    // Convert to legacy format
    return {
      records,
      summary: {
        query: cypher,
        parameters: params || {},
        resultAvailableAfter: endTime - startTime,
        resultConsumedAfter: endTime - startTime,
      },
    };
  }

  /**
   * Legacy runInTransaction method
   * @deprecated Use transaction() instead
   */
  async runInTransaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    this.logger.warn(
      'runInTransaction is deprecated, use transaction() instead'
    );
    return this.neogmaService.transaction<T>(work);
  }

  /**
   * Legacy runQuery method
   * @deprecated Use query() instead
   */
  async runQuery<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<T[]> {
    this.logger.warn('runQuery is deprecated, use query() instead');
    return this.neogmaService.query<T>(cypher, params);
  }

  /**
   * Legacy runNeogmaQuery method
   * @deprecated Use query() instead
   */
  async runNeogmaQuery<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<T[]> {
    this.logger.warn('runNeogmaQuery is deprecated, use query() instead');
    return this.neogmaService.query<T>(cypher, params);
  }

  // ==================== HEALTH & METRICS ====================

  /**
   * Verify connectivity
   */
  async verifyConnectivity(): Promise<ConnectionStatus> {
    return this.connectionService.verifyConnectivity();
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return this.metricsService.getQueryMetrics();
  }

  /**
   * Get connection pool metrics
   */
  getConnectionPoolMetrics() {
    return this.connectionService.getConnectionInfo();
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics() {
    return this.metricsService.getQueryMetrics();
  }

  /**
   * Clear metrics data
   */
  clearMetrics(): void {
    this.metricsService.clearMetrics();
  }

  /**
   * Get comprehensive health information
   */
  async getHealth(): Promise<SystemHealth> {
    return this.metricsService.getSystemHealth();
  }

  /**
   * Get the underlying Neogma instance
   */
  getNeogma(): Neogma {
    return this.neogmaService.getNeogma();
  }

  // ==================== DEPRECATED METHODS ====================

  /**
   * @deprecated Use NeogmaService.findOne() directly
   */
  async read<T>(operation: any): Promise<T> {
    throw new Error(
      'read() method is deprecated. Use NeogmaService.findOne() or query() instead.'
    );
  }

  /**
   * @deprecated Use NeogmaService.create() or NeogmaService.update() directly
   */
  async write<T>(operation: any): Promise<T> {
    throw new Error(
      'write() method is deprecated. Use NeogmaService.create(), update(), or delete() instead.'
    );
  }

  /**
   * @deprecated Use NeogmaConnectionService directly
   */
  getDriver(): never {
    throw new Error(
      'getDriver() is deprecated. Use NeogmaService methods instead.'
    );
  }

  /**
   * @deprecated Use NeogmaConnectionService directly
   */
  getSession(): never {
    throw new Error(
      'getSession() is deprecated. Use NeogmaService methods instead.'
    );
  }

  /**
   * @deprecated Bulk operations are handled automatically by NeogmaService
   */
  async bulkOperation(): Promise<never> {
    throw new Error(
      'bulkOperation() is deprecated. Use multiple create/update/delete calls instead.'
    );
  }

  /**
   * @deprecated Use NeogmaService.transaction() instead
   */
  async runInReadTransaction<T>(): Promise<never> {
    throw new Error(
      'runInReadTransaction() is deprecated. Use transaction() instead.'
    );
  }

  /**
   * @deprecated Use NeogmaService.query() with QueryBuilder patterns
   */
  createQueryBuilder(): never {
    throw new Error(
      'createQueryBuilder() is deprecated. Use direct Cypher queries with query() instead.'
    );
  }
}
