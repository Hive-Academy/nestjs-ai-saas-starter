/**
 * @fileoverview Multi-Tenant Decorators Integration Examples
 *
 * Comprehensive examples demonstrating the integration of multi-tenant decorators
 * with existing security, entity CRUD, and query builder systems.
 *
 * This file demonstrates:
 * - Multi-tenant decorators usage patterns
 * - Integration with security decorators
 * - Entity CRUD with tenant isolation
 * - Query builder with tenant context
 * - Advanced decorator composition patterns
 */

import { Injectable, Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  TenantIsolated,
  RequireTenantFeatures,
  ValidateTenantLimits,
  MultiTenantQuery,
  TenantAdminOperation,
  CollectTenantMetrics,
  TenantIsolationConfig
} from '../../../index';

// Assuming these exist from other decorator systems
import {
  CypherQuery,
  Authorize,
  AuditLog,
  ValidateInput,
  RateLimit,
  Cache,
  Transform
} from '../../../index';

// ============================================================================
// 1. BASIC MULTI-TENANT DECORATOR USAGE
// ============================================================================

/**
 * Basic service with multi-tenant decorators
 */
@Injectable()
export class BasicTenantDecoratorService {

  /**
   * Simple tenant-isolated query
   */
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    includeTenantMetadata: true
  })
  @MultiTenantQuery({
    query: 'MATCH (u:User) RETURN u ORDER BY u.createdAt DESC LIMIT 10'
  })
  async getRecentUsers(): Promise<any[]> {
    // Method body can be empty - decorator handles execution
    return [];
  }

  /**
   * Feature-gated operation
   */
  @RequireTenantFeatures(['advanced-analytics'])
  @MultiTenantQuery({
    query: `
      MATCH (u:User)-[:CREATED]->(p:Project)
      RETURN u.id as userId, count(p) as projectCount
      ORDER BY projectCount DESC
      LIMIT 5
    `
  })
  async getTopProjectCreators(): Promise<Array<{ userId: string; projectCount: number }>> {
    return [];
  }

  /**
   * Limit-validated operation
   */
  @ValidateTenantLimits({
    nodeLimit: 'maxNodes'
  })
  @MultiTenantQuery({
    query: 'CREATE (u:User $properties) RETURN u',
    validateLimits: true
  })
  async createUser(properties: any): Promise<any> {
    return {};
  }

  /**
   * Metrics collection
   */
  @CollectTenantMetrics({
    operation: 'user-search',
    category: 'read-operations',
    includeResourceUsage: true
  })
  @MultiTenantQuery({
    query: `
      MATCH (u:User)
      WHERE u.firstName CONTAINS $search OR u.lastName CONTAINS $search
      RETURN u LIMIT $limit
    `
  })
  async searchUsers(params: { search: string; limit: number }): Promise<any[]> {
    return [];
  }
}

// ============================================================================
// 2. INTEGRATION WITH SECURITY DECORATORS
// ============================================================================

/**
 * Service demonstrating security + multi-tenancy integration
 */
@Injectable()
export class SecureTenantService {

  /**
   * Secured tenant operation with authorization
   */
  @Authorize({ roles: ['admin', 'manager'] })
  @TenantIsolated({
    enabled: true,
    validateAccess: true
  })
  @AuditLog({
    action: 'VIEW_SENSITIVE_DATA',
    resourceType: 'user-data'
  })
  @MultiTenantQuery({
    query: `
      MATCH (u:User)
      WHERE u.role IN $roles
      RETURN u
      ORDER BY u.lastLoginAt DESC
    `,
    requiredFeatures: ['user-management']
  })
  async getPrivilegedUsers(params: { roles: string[] }): Promise<any[]> {
    return [];
  }

  /**
   * Rate-limited tenant operation
   */
  @RateLimit({
    window: 60000, // 1 minute
    max: 100 // 100 requests per minute per tenant
  })
  @TenantIsolated({
    enabled: true,
    trackAnalytics: true
  })
  @CollectTenantMetrics({
    operation: 'bulk-user-query',
    category: 'intensive-operations'
  })
  @MultiTenantQuery({
    query: `
      MATCH (u:User)
      WHERE u.status = $status
      RETURN u
      ORDER BY u.createdAt DESC
      SKIP $skip LIMIT $limit
    `
  })
  async getBulkUsers(params: {
    status: string;
    skip: number;
    limit: number
  }): Promise<any[]> {
    return [];
  }

  /**
   * Input validation with tenant isolation
   */
  @ValidateInput({
    schema: {
      email: { type: 'string', format: 'email', required: true },
      firstName: { type: 'string', minLength: 2, required: true },
      lastName: { type: 'string', minLength: 2, required: true },
      role: { type: 'string', enum: ['user', 'admin'], required: true }
    }
  })
  @ValidateTenantLimits({
    nodeLimit: 'maxUsers'
  })
  @AuditLog({
    action: 'CREATE_USER',
    includePayload: true
  })
  @MultiTenantQuery({
    query: `
      CREATE (u:User $properties)
      SET u.id = randomUUID(), u.createdAt = datetime()
      RETURN u
    `,
    validateLimits: true
  })
  async createSecureUser(properties: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<any> {
    return {};
  }

  /**
   * Cached tenant operation with TTL
   */
  @Cache({
    ttl: 300, // 5 minutes
    keyGenerator: (args: any[]) => `tenant-stats-${args[0]?.organizationId || 'all'}`
  })
  @RequireTenantFeatures(['reporting'])
  @CollectTenantMetrics({
    operation: 'organization-stats',
    category: 'analytics'
  })
  @MultiTenantQuery({
    query: `
      MATCH (o:Organization)
      WHERE ($organizationId IS NULL OR o.id = $organizationId)
      OPTIONAL MATCH (o)-[:HAS_PROJECT]->(p:Project)
      OPTIONAL MATCH (o)<-[:BELONGS_TO]-(u:User)
      RETURN o, count(DISTINCT p) as projectCount, count(DISTINCT u) as userCount
    `
  })
  async getOrganizationStats(params: { organizationId?: string }): Promise<any[]> {
    return [];
  }
}

// ============================================================================
// 3. ENTITY CRUD WITH TENANT ISOLATION
// ============================================================================

/**
 * Complete CRUD service with tenant isolation
 */
@Injectable()
export class TenantEntityCrudService {

  /**
   * Create entity with full validation and auditing
   */
  @Authorize({ roles: ['admin', 'user'] })
  @ValidateInput({
    schema: {
      name: { type: 'string', minLength: 3, maxLength: 100, required: true },
      description: { type: 'string', maxLength: 500 },
      type: { type: 'string', enum: ['project', 'task', 'milestone'], required: true },
      priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
      dueDate: { type: 'string', format: 'date-time' }
    }
  })
  @ValidateTenantLimits({
    nodeLimit: 'maxNodes',
    storageLimit: 'maxStorage'
  })
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    trackAnalytics: true
  })
  @AuditLog({
    action: 'CREATE_ENTITY',
    resourceType: 'business-entity',
    includePayload: true
  })
  @CollectTenantMetrics({
    operation: 'entity-creation',
    category: 'write-operations',
    includeResourceUsage: true
  })
  @MultiTenantQuery({
    query: `
      CREATE (e:Entity $properties)
      SET e.id = randomUUID(),
          e.createdAt = datetime(),
          e.updatedAt = datetime(),
          e.version = 1
      RETURN e
    `,
    validateLimits: true,
    tenantIsolation: {
      enabled: true,
      validateAccess: true,
      trackAnalytics: true
    }
  })
  async createEntity(properties: {
    name: string;
    description?: string;
    type: 'project' | 'task' | 'milestone';
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
  }): Promise<any> {
    return {};
  }

  /**
   * Read entity with caching and feature validation
   */
  @Cache({
    ttl: 120, // 2 minutes
    keyGenerator: (args: any[]) => `entity-${args[0]}`
  })
  @RequireTenantFeatures(['entity-management'])
  @TenantIsolated({
    enabled: true,
    includeTenantMetadata: true
  })
  @CollectTenantMetrics({
    operation: 'entity-read',
    category: 'read-operations'
  })
  @MultiTenantQuery({
    query: `
      MATCH (e:Entity {id: $entityId})
      OPTIONAL MATCH (e)-[r]-(related)
      RETURN e, collect({relationship: type(r), node: related}) as relationships
    `
  })
  async getEntity(entityId: string): Promise<any> {
    return {};
  }

  /**
   * Update entity with optimistic locking
   */
  @Authorize({ roles: ['admin', 'user'] })
  @ValidateInput({
    schema: {
      name: { type: 'string', minLength: 3, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      dueDate: { type: 'string', format: 'date-time' },
      version: { type: 'number', required: true }
    }
  })
  @TenantIsolated({
    enabled: true,
    validateAccess: true
  })
  @AuditLog({
    action: 'UPDATE_ENTITY',
    resourceType: 'business-entity',
    includePayload: true
  })
  @CollectTenantMetrics({
    operation: 'entity-update',
    category: 'write-operations'
  })
  @MultiTenantQuery({
    query: `
      MATCH (e:Entity {id: $entityId})
      WHERE e.version = $currentVersion
      SET e += $updates,
          e.updatedAt = datetime(),
          e.version = e.version + 1
      RETURN e
    `
  })
  async updateEntity(
    entityId: string,
    updates: Partial<{
      name: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      dueDate: string;
    }>,
    currentVersion: number
  ): Promise<any> {
    return {};
  }

  /**
   * Delete entity with cascade and validation
   */
  @Authorize({ roles: ['admin'] })
  @TenantIsolated({
    enabled: true,
    validateAccess: true
  })
  @AuditLog({
    action: 'DELETE_ENTITY',
    resourceType: 'business-entity',
    severity: 'high'
  })
  @CollectTenantMetrics({
    operation: 'entity-deletion',
    category: 'write-operations'
  })
  @MultiTenantQuery({
    query: `
      MATCH (e:Entity {id: $entityId})
      OPTIONAL MATCH (e)-[r]-()
      DELETE r, e
      RETURN count(e) as deletedCount
    `
  })
  async deleteEntity(entityId: string): Promise<{ success: boolean; deletedCount: number }> {
    return { success: true, deletedCount: 0 };
  }

  /**
   * List entities with advanced filtering and pagination
   */
  @RequireTenantFeatures(['entity-listing'])
  @Cache({
    ttl: 60, // 1 minute
    keyGenerator: (args: any[]) => `entities-list-${JSON.stringify(args[0])}`
  })
  @TenantIsolated({
    enabled: true,
    includeTenantMetadata: true
  })
  @CollectTenantMetrics({
    operation: 'entity-listing',
    category: 'read-operations'
  })
  @MultiTenantQuery({
    query: `
      MATCH (e:Entity)
      WHERE ($type IS NULL OR e.type = $type)
        AND ($priority IS NULL OR e.priority = $priority)
        AND ($search IS NULL OR
             e.name CONTAINS $search OR
             e.description CONTAINS $search)
      RETURN e
      ORDER BY
        CASE $sortBy
          WHEN 'name' THEN e.name
          WHEN 'createdAt' THEN e.createdAt
          WHEN 'priority' THEN e.priority
          ELSE e.updatedAt
        END
      SKIP $skip LIMIT $limit
    `
  })
  async listEntities(params: {
    type?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
    skip: number;
    limit: number;
  }): Promise<any[]> {
    return [];
  }
}

// ============================================================================
// 4. QUERY BUILDER INTEGRATION WITH TENANT CONTEXT
// ============================================================================

/**
 * Advanced query builder with tenant-aware dynamic queries
 */
@Injectable()
export class TenantQueryBuilderService {

  /**
   * Dynamic relationship query with tenant isolation
   */
  @RequireTenantFeatures(['advanced-queries'])
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    trackAnalytics: true
  })
  @CollectTenantMetrics({
    operation: 'dynamic-relationship-query',
    category: 'complex-queries',
    includeResourceUsage: true
  })
  async findRelatedEntities(params: {
    sourceId: string;
    relationshipTypes: string[];
    targetLabels: string[];
    depth: number;
    filters?: Record<string, any>;
  }): Promise<any[]> {
    const { sourceId, relationshipTypes, targetLabels, depth, filters } = params;

    // Build dynamic query parts
    const relationshipPattern = relationshipTypes.length > 0
      ? `[r:${relationshipTypes.join('|')}*1..${depth}]`
      : `[r*1..${depth}]`;

    const targetPattern = targetLabels.length > 0
      ? `:${targetLabels.join(':')}`
      : '';

    // Build filter conditions
    const filterConditions = filters ?
      Object.keys(filters).map(key => `target.${key} = $${key}`).join(' AND ')
      : '';

    const whereClause = filterConditions ? `WHERE ${filterConditions}` : '';

    const query = `
      MATCH (source {id: $sourceId})${relationshipPattern}(target${targetPattern})
      ${whereClause}
      RETURN DISTINCT target,
             [rel in relationships(path) | {type: type(rel), properties: properties(rel)}] as relationships
      ORDER BY target.createdAt DESC
      LIMIT 100
    `;

    // This would use the actual MultiTenantNeo4jService
    return []; // Placeholder return
  }

  /**
   * Aggregation query with tenant metrics
   */
  @RequireTenantFeatures(['reporting', 'analytics'])
  @RateLimit({
    window: 300000, // 5 minutes
    max: 10 // 10 requests per 5 minutes
  })
  @Cache({
    ttl: 600, // 10 minutes
    keyGenerator: (args: any[]) => `aggregation-${JSON.stringify(args[0])}`
  })
  @TenantIsolated({
    enabled: true,
    includeTenantMetadata: true,
    trackAnalytics: true
  })
  @CollectTenantMetrics({
    operation: 'aggregation-query',
    category: 'analytics',
    includeResourceUsage: true
  })
  async getAggregatedStats(params: {
    groupBy: string[];
    metrics: Array<{
      field: string;
      operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
      alias: string;
    }>;
    filters?: Record<string, any>;
    dateRange?: { from: string; to: string };
  }): Promise<any[]> {
    const { groupBy, metrics, filters, dateRange } = params;

    // Build dynamic aggregation query
    const groupByClause = groupBy.map(field => `n.${field}`).join(', ');
    const metricsClause = metrics.map(metric => {
      switch (metric.operation) {
        case 'count':
          return `count(n.${metric.field}) as ${metric.alias}`;
        case 'sum':
          return `sum(n.${metric.field}) as ${metric.alias}`;
        case 'avg':
          return `avg(n.${metric.field}) as ${metric.alias}`;
        case 'min':
          return `min(n.${metric.field}) as ${metric.alias}`;
        case 'max':
          return `max(n.${metric.field}) as ${metric.alias}`;
        default:
          return `count(n.${metric.field}) as ${metric.alias}`;
      }
    }).join(', ');

    // Build filter conditions
    const filterConditions = [];
    if (filters) {
      filterConditions.push(
        ...Object.keys(filters).map(key => `n.${key} = $${key}`)
      );
    }

    if (dateRange) {
      filterConditions.push(
        'n.createdAt >= datetime($dateFrom) AND n.createdAt <= datetime($dateTo)'
      );
    }

    const whereClause = filterConditions.length > 0
      ? `WHERE ${filterConditions.join(' AND ')}`
      : '';

    const query = `
      MATCH (n)
      ${whereClause}
      RETURN ${groupByClause}, ${metricsClause}
      ORDER BY ${groupBy.map(field => `n.${field}`).join(', ')}
    `;

    // This would use the actual MultiTenantNeo4jService
    return []; // Placeholder return
  }

  /**
   * Full-text search with tenant isolation
   */
  @RequireTenantFeatures(['search'])
  @RateLimit({ window: 60000, max: 50 })
  @TenantIsolated({
    enabled: true,
    trackAnalytics: true
  })
  @CollectTenantMetrics({
    operation: 'fulltext-search',
    category: 'search-operations'
  })
  @Transform({
    responseTransformer: (results: any[]) => {
      return results.map(result => ({
        ...result,
        score: Math.random(), // Would be actual relevance score
        highlights: [] // Would be actual text highlights
      }));
    }
  })
  async fullTextSearch(params: {
    query: string;
    labels?: string[];
    fields?: string[];
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { query, labels = [], fields = ['name', 'description'], limit = 20, offset = 0 } = params;

    // Build full-text search query
    const labelFilter = labels.length > 0 ? `:${labels.join(':')}` : '';
    const fieldConditions = fields.map(field =>
      `n.${field} CONTAINS $query`
    ).join(' OR ');

    const searchQuery = `
      MATCH (n${labelFilter})
      WHERE ${fieldConditions}
      RETURN n,
             CASE
               WHEN n.name CONTAINS $query THEN 2.0
               WHEN n.description CONTAINS $query THEN 1.0
               ELSE 0.5
             END as score
      ORDER BY score DESC, n.createdAt DESC
      SKIP $offset LIMIT $limit
    `;

    // This would use the actual MultiTenantNeo4jService
    return []; // Placeholder return
  }
}

// ============================================================================
// 5. CONTROLLER WITH MULTI-TENANT DECORATORS
// ============================================================================

/**
 * REST controller demonstrating multi-tenant decorators in HTTP endpoints
 */
@Controller('tenant-data')
export class TenantDataController {
  constructor(
    private readonly entityService: TenantEntityCrudService,
    private readonly queryService: TenantQueryBuilderService
  ) {}

  /**
   * Get tenant dashboard data
   */
  @Get('dashboard')
  @Authorize({ roles: ['admin', 'manager', 'user'] })
  @RequireTenantFeatures(['dashboard'])
  @Cache({ ttl: 300 })
  @CollectTenantMetrics({
    operation: 'dashboard-view',
    category: 'user-interface'
  })
  async getDashboard(@Req() request: Request) {
    // Dashboard data aggregation would happen here
    return {
      summary: {},
      recentActivity: [],
      metrics: {}
    };
  }

  /**
   * Create new entity
   */
  @Post('entities')
  @Authorize({ roles: ['admin', 'user'] })
  @ValidateInput({
    schema: {
      name: { type: 'string', required: true },
      type: { type: 'string', required: true }
    }
  })
  @AuditLog({
    action: 'CREATE_ENTITY_VIA_API',
    includePayload: true
  })
  async createEntity(@Body() entityData: any) {
    return await this.entityService.createEntity(entityData);
  }

  /**
   * Get entity by ID
   */
  @Get('entities/:id')
  @Authorize({ roles: ['admin', 'user', 'viewer'] })
  @Cache({ ttl: 120 })
  async getEntity(@Param('id') id: string) {
    return await this.entityService.getEntity(id);
  }

  /**
   * Advanced search endpoint
   */
  @Get('search')
  @Authorize({ roles: ['admin', 'user'] })
  @RequireTenantFeatures(['search'])
  @RateLimit({ window: 60000, max: 30 })
  @CollectTenantMetrics({
    operation: 'api-search',
    category: 'user-interface'
  })
  async search(
    @Query('q') query: string,
    @Query('labels') labels?: string,
    @Query('limit') limit = 20
  ) {
    const labelArray = labels ? labels.split(',') : [];

    return await this.queryService.fullTextSearch({
      query,
      labels: labelArray,
      limit: Number(limit)
    });
  }

  /**
   * Admin operation endpoint
   */
  @Post('admin/migrate-tenant')
  @Authorize({ roles: ['super-admin'] })
  @TenantAdminOperation()
  @AuditLog({
    action: 'TENANT_MIGRATION',
    severity: 'critical'
  })
  async migrateTenant(@Body() migrationData: {
    fromTenant: string;
    toTenant: string;
    entityTypes: string[];
  }) {
    // Admin operation that bypasses normal tenant isolation
    return { success: true, message: 'Migration completed' };
  }

  /**
   * Bulk operations with limit validation
   */
  @Post('entities/bulk')
  @Authorize({ roles: ['admin'] })
  @ValidateTenantLimits({
    nodeLimit: 'maxNodes',
    storageLimit: 'maxStorage'
  })
  @AuditLog({
    action: 'BULK_CREATE_ENTITIES',
    includePayload: false // Too large for audit log
  })
  @CollectTenantMetrics({
    operation: 'bulk-entity-creation',
    category: 'bulk-operations',
    includeResourceUsage: true
  })
  async createBulkEntities(@Body() entities: any[]) {
    const results = [];

    for (const entityData of entities) {
      try {
        const entity = await this.entityService.createEntity(entityData);
        results.push({ success: true, entity });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      total: entities.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

// ============================================================================
// 6. ADVANCED DECORATOR COMPOSITION PATTERNS
// ============================================================================

/**
 * Service demonstrating advanced decorator composition
 */
@Injectable()
export class AdvancedDecoratorCompositionService {

  /**
   * Complete enterprise operation with all decorators
   */
  @Authorize({
    roles: ['admin'],
    permissions: ['entity.create', 'entity.manage']
  })
  @RequireTenantFeatures(['advanced-entity-management', 'audit-logging'])
  @ValidateTenantLimits({
    nodeLimit: 'maxNodes',
    relationshipLimit: 'maxRelationships',
    storageLimit: 'maxStorage'
  })
  @ValidateInput({
    schema: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            type: { type: 'string', required: true }
          }
        },
        maxItems: 100,
        required: true
      },
      relationships: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', required: true },
            to: { type: 'string', required: true },
            type: { type: 'string', required: true }
          }
        }
      }
    }
  })
  @RateLimit({
    window: 3600000, // 1 hour
    max: 5 // 5 complex operations per hour
  })
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    trackAnalytics: true,
    includeTenantMetadata: true
  })
  @AuditLog({
    action: 'CREATE_COMPLEX_ENTITY_GRAPH',
    resourceType: 'entity-graph',
    severity: 'high',
    includePayload: false // Too large, will use custom logging
  })
  @CollectTenantMetrics({
    operation: 'complex-entity-creation',
    category: 'enterprise-operations',
    includeResourceUsage: true
  })
  @Transform({
    requestTransformer: (data: any) => {
      // Pre-process the complex data
      return {
        ...data,
        processedAt: new Date().toISOString(),
        batchId: `batch_${Date.now()}`
      };
    },
    responseTransformer: (result: any) => {
      // Post-process the result
      return {
        ...result,
        completedAt: new Date().toISOString(),
        summary: {
          entitiesCreated: result.entities?.length || 0,
          relationshipsCreated: result.relationships?.length || 0
        }
      };
    }
  })
  async createComplexEntityGraph(data: {
    entities: Array<{ name: string; type: string; properties?: any }>;
    relationships: Array<{ from: string; to: string; type: string; properties?: any }>;
  }): Promise<{
    success: boolean;
    entities: any[];
    relationships: any[];
    metadata: {
      batchId: string;
      tenantId: string;
      executionTime: number;
      resourceUsage: any;
    };
  }> {
    // Complex operation implementation would be here
    return {
      success: true,
      entities: [],
      relationships: [],
      metadata: {
        batchId: '',
        tenantId: '',
        executionTime: 0,
        resourceUsage: {}
      }
    };
  }

  /**
   * Multi-tenant analytics operation
   */
  @Authorize({ roles: ['admin', 'analyst'] })
  @RequireTenantFeatures(['advanced-analytics', 'cross-tenant-reporting'])
  @Cache({
    ttl: 1800, // 30 minutes
    keyGenerator: (args: any[]) => {
      const { timeRange, metrics, dimensions } = args[0];
      return `analytics-${timeRange}-${metrics.join(',')}-${dimensions.join(',')}`;
    }
  })
  @RateLimit({
    window: 900000, // 15 minutes
    max: 3 // 3 analytics queries per 15 minutes
  })
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    trackAnalytics: true,
    includeTenantMetadata: true
  })
  @CollectTenantMetrics({
    operation: 'advanced-analytics',
    category: 'analytics-heavy',
    includeResourceUsage: true
  })
  @MultiTenantQuery({
    query: '', // Would be dynamically generated
    tenantIsolation: {
      enabled: true,
      validateAccess: true,
      trackAnalytics: true,
      includeTenantMetadata: true
    }
  })
  async generateAdvancedAnalytics(params: {
    timeRange: { from: string; to: string };
    metrics: string[];
    dimensions: string[];
    filters?: Record<string, any>;
    aggregations?: Array<{
      field: string;
      operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    }>;
  }): Promise<{
    data: any[];
    summary: {
      totalRecords: number;
      executionTime: number;
      cacheHit: boolean;
    };
    metadata: {
      tenantId: string;
      generatedAt: string;
      parameters: any;
    };
  }> {
    // Advanced analytics implementation would be here
    return {
      data: [],
      summary: {
        totalRecords: 0,
        executionTime: 0,
        cacheHit: false
      },
      metadata: {
        tenantId: '',
        generatedAt: new Date().toISOString(),
        parameters: params
      }
    };
  }
}

// ============================================================================
// USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

/*
MULTI-TENANT DECORATOR BEST PRACTICES:

1. Decorator Ordering:
   - Authorization decorators first (@Authorize)
   - Tenant decorators (@TenantIsolated, @RequireTenantFeatures)
   - Validation decorators (@ValidateInput, @ValidateTenantLimits)
   - Performance decorators (@RateLimit, @Cache)
   - Monitoring decorators (@AuditLog, @CollectTenantMetrics)
   - Query decorators (@MultiTenantQuery) last

2. Feature Requirements:
   - Use @RequireTenantFeatures for premium features
   - Combine with @Authorize for role-based access
   - Cache feature checks when possible
   - Provide clear error messages for missing features

3. Limit Validation:
   - Use @ValidateTenantLimits before expensive operations
   - Check multiple limits when appropriate (nodes, relationships, storage)
   - Provide clear feedback on limit violations
   - Allow admins to override limits when necessary

4. Metrics Collection:
   - Use @CollectTenantMetrics for important operations
   - Categorize operations consistently
   - Include resource usage for expensive operations
   - Use appropriate operation names for analytics

5. Performance:
   - Combine @Cache with tenant-aware key generation
   - Use @RateLimit to prevent abuse
   - Apply @Transform for data optimization
   - Monitor decorator overhead in production

6. Security:
   - Always combine tenant decorators with authorization
   - Use @AuditLog for sensitive operations
   - Validate all inputs at decorator level
   - Never trust client-provided tenant information

7. Error Handling:
   - Provide meaningful error messages
   - Log tenant context in all errors
   - Handle decorator failures gracefully
   - Implement proper fallback strategies

8. Testing:
   - Mock tenant context for unit tests
   - Test decorator combinations thoroughly
   - Validate tenant isolation in integration tests
   - Test limit enforcement and feature validation
*/
