/**
 * @fileoverview Multi-Tenant Service Layer Architecture Examples
 *
 * Comprehensive examples for implementing service layer architecture
 * with multi-tenant awareness using MultiTenantNeo4jService.
 *
 * This file demonstrates:
 * - MultiTenantNeo4jService implementation patterns
 * - Automatic tenant filtering in queries
 * - Cross-tenant data access restrictions
 * - Service composition with tenant awareness
 * - Enterprise-grade multi-tenant service patterns
 */

import { Injectable, Scope, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  MultiTenantNeo4jService,
  TenantContextService,
  MultiTenantQueryOptions,
  MultiTenantQueryResult
} from '../../../index';

// ============================================================================
// 1. DOMAIN MODELS AND INTERFACES
// ============================================================================

/**
 * User domain model with tenant isolation
 */
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLoginAt?: Date;
  permissions: string[];
  metadata?: Record<string, any>;
}

/**
 * Organization domain model
 */
export interface TenantOrganization {
  id: string;
  tenantId: string;
  name: string;
  type: 'enterprise' | 'startup' | 'government' | 'nonprofit';
  status: 'active' | 'inactive';
  parentId?: string;
  settings: {
    allowSubOrganizations: boolean;
    maxUsers: number;
    features: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project domain model with tenant relationships
 */
export interface TenantProject {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  visibility: 'private' | 'organization' | 'tenant';
  ownerId: string;
  collaborators: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
}

// ============================================================================
// 2. BASIC MULTI-TENANT SERVICE PATTERNS
// ============================================================================

/**
 * Basic user service with automatic tenant isolation
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantUserService {
  constructor(
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService
  ) {}

  /**
   * Create a new user in the current tenant
   */
  async createUser(userData: Omit<TenantUser, 'id' | 'tenantId' | 'createdAt'>): Promise<TenantUser> {
    const tenantId = await this.tenantContext.getTenantId();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if user already exists by email
    const existingUser = await this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate tenant limits
    await this.validateUserCreationLimits();

    const user: TenantUser = {
      id: userId,
      tenantId,
      createdAt: new Date(),
      ...userData
    };

    const result = await this.multiTenantNeo4j.run(
      `
      CREATE (u:User $properties)
      RETURN u
      `,
      { properties: user },
      {
        accessMode: 'WRITE',
        validateLimits: true,
        trackAnalytics: true
      }
    );

    return result.records[0]?.get('u').properties as TenantUser;
  }

  /**
   * Find user by email within tenant
   */
  async findUserByEmail(email: string): Promise<TenantUser | null> {
    const result = await this.multiTenantNeo4j.run(
      `
      MATCH (u:User {email: $email})
      RETURN u
      `,
      { email },
      { accessMode: 'READ' }
    );

    return result.records[0]?.get('u').properties as TenantUser || null;
  }

  /**
   * Get all users in tenant with pagination
   */
  async findAllUsers(options: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    search?: string;
  } = {}): Promise<{
    users: TenantUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, role, search } = options;
    const skip = (page - 1) * limit;

    // Build dynamic where conditions
    const whereConditions: string[] = [];
    const parameters: Record<string, any> = { skip, limit };

    if (status) {
      whereConditions.push('u.status = $status');
      parameters.status = status;
    }

    if (role) {
      whereConditions.push('u.role = $role');
      parameters.role = role;
    }

    if (search) {
      whereConditions.push('(u.firstName CONTAINS $search OR u.lastName CONTAINS $search OR u.email CONTAINS $search)');
      parameters.search = search;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.multiTenantNeo4j.run(
      `MATCH (u:User) ${whereClause} RETURN count(u) as total`,
      parameters,
      { accessMode: 'READ' }
    );

    const total = countResult.records[0]?.get('total').toNumber() || 0;

    // Get paginated results
    const usersResult = await this.multiTenantNeo4j.run(
      `
      MATCH (u:User)
      ${whereClause}
      ORDER BY u.createdAt DESC
      SKIP $skip LIMIT $limit
      RETURN u
      `,
      parameters,
      {
        accessMode: 'READ',
        includeTenantMetadata: true
      }
    );

    const users = usersResult.records.map(record => record.get('u').properties as TenantUser);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update user with tenant validation
   */
  async updateUser(userId: string, updates: Partial<TenantUser>): Promise<TenantUser> {
    // Ensure user exists and belongs to tenant
    const existingUser = await this.findUserById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Remove fields that shouldn't be updated
    const { id, tenantId, createdAt, ...allowedUpdates } = updates;

    const result = await this.multiTenantNeo4j.run(
      `
      MATCH (u:User {id: $userId})
      SET u += $updates, u.updatedAt = datetime()
      RETURN u
      `,
      { userId, updates: allowedUpdates },
      {
        accessMode: 'WRITE',
        trackAnalytics: true
      }
    );

    return result.records[0]?.get('u').properties as TenantUser;
  }

  /**
   * Delete user (soft delete with tenant validation)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.multiTenantNeo4j.run(
      `
      MATCH (u:User {id: $userId})
      SET u.status = 'inactive', u.deletedAt = datetime()
      `,
      { userId },
      {
        accessMode: 'WRITE',
        trackAnalytics: true
      }
    );
  }

  /**
   * Find user by ID with tenant isolation
   */
  async findUserById(userId: string): Promise<TenantUser | null> {
    const result = await this.multiTenantNeo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u`,
      { userId },
      { accessMode: 'READ' }
    );

    return result.records[0]?.get('u').properties as TenantUser || null;
  }

  /**
   * Validate user creation against tenant limits
   */
  private async validateUserCreationLimits(): Promise<void> {
    const stats = await this.multiTenantNeo4j.getTenantStats();
    const hasUsers = await this.tenantContext.checkLimit('maxUsers' as any, stats.nodeCount);

    if (!hasUsers) {
      throw new BadRequestException('Tenant user limit exceeded');
    }
  }
}

// ============================================================================
// 3. ORGANIZATION SERVICE WITH HIERARCHICAL RELATIONSHIPS
// ============================================================================

/**
 * Organization service with tenant-aware hierarchical relationships
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantOrganizationService {
  constructor(
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService
  ) {}

  /**
   * Create root organization for tenant
   */
  async createRootOrganization(orgData: Omit<TenantOrganization, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<TenantOrganization> {
    const tenantId = await this.tenantContext.getTenantId();
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const organization: TenantOrganization = {
      id: orgId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...orgData
    };

    const result = await this.multiTenantNeo4j.run(
      `
      CREATE (o:Organization:RootOrganization $properties)
      RETURN o
      `,
      { properties: organization },
      {
        accessMode: 'WRITE',
        validateLimits: true
      }
    );

    return result.records[0]?.get('o').properties as TenantOrganization;
  }

  /**
   * Create sub-organization with parent relationship
   */
  async createSubOrganization(
    parentId: string,
    orgData: Omit<TenantOrganization, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'parentId'>
  ): Promise<TenantOrganization> {
    // Validate parent exists and allows sub-organizations
    const parent = await this.findOrganizationById(parentId);
    if (!parent) {
      throw new NotFoundException('Parent organization not found');
    }

    if (!parent.settings.allowSubOrganizations) {
      throw new ForbiddenException('Parent organization does not allow sub-organizations');
    }

    const tenantId = await this.tenantContext.getTenantId();
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const organization: TenantOrganization = {
      id: orgId,
      tenantId,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...orgData
    };

    const result = await this.multiTenantNeo4j.runInTransaction(async (tx) => {
      // Create organization
      const orgResult = await tx.run(
        `CREATE (o:Organization:SubOrganization $properties) RETURN o`,
        { properties: organization }
      );

      // Create parent relationship
      await tx.run(
        `
        MATCH (parent:Organization {id: $parentId})
        MATCH (child:Organization {id: $childId})
        CREATE (parent)-[:HAS_CHILD_ORGANIZATION]->(child)
        CREATE (child)-[:BELONGS_TO_PARENT]->(parent)
        `,
        { parentId, childId: orgId }
      );

      return orgResult;
    });

    return result.records[0]?.get('o').properties as TenantOrganization;
  }

  /**
   * Get organization hierarchy tree
   */
  async getOrganizationHierarchy(rootId?: string): Promise<{
    organization: TenantOrganization;
    children: Array<{
      organization: TenantOrganization;
      children: TenantOrganization[];
    }>;
  }> {
    const rootFilter = rootId ? '{id: $rootId}' : '';
    const params = rootId ? { rootId } : {};

    const result = await this.multiTenantNeo4j.run(
      `
      MATCH (root:Organization${rootFilter})
      WHERE NOT (root)-[:BELONGS_TO_PARENT]->()
      OPTIONAL MATCH (root)-[:HAS_CHILD_ORGANIZATION*1..2]->(child:Organization)
      RETURN root,
             collect(DISTINCT child) as children
      `,
      params,
      { accessMode: 'READ' }
    );

    if (result.records.length === 0) {
      throw new NotFoundException('Root organization not found');
    }

    const record = result.records[0];
    const root = record.get('root').properties as TenantOrganization;
    const children = record.get('children').map((child: any) => child.properties as TenantOrganization);

    // Group children by parent
    const childrenGrouped = children.reduce((acc: any, child) => {
      if (child.parentId === root.id) {
        acc.push({
          organization: child,
          children: children.filter(grandchild => grandchild.parentId === child.id)
        });
      }
      return acc;
    }, []);

    return {
      organization: root,
      children: childrenGrouped
    };
  }

  /**
   * Find organization by ID
   */
  async findOrganizationById(organizationId: string): Promise<TenantOrganization | null> {
    const result = await this.multiTenantNeo4j.run(
      `MATCH (o:Organization {id: $organizationId}) RETURN o`,
      { organizationId },
      { accessMode: 'READ' }
    );

    return result.records[0]?.get('o').properties as TenantOrganization || null;
  }

  /**
   * Get organizations by type
   */
  async findOrganizationsByType(type: TenantOrganization['type']): Promise<TenantOrganization[]> {
    const result = await this.multiTenantNeo4j.run(
      `MATCH (o:Organization {type: $type}) RETURN o ORDER BY o.name`,
      { type },
      { accessMode: 'READ' }
    );

    return result.records.map(record => record.get('o').properties as TenantOrganization);
  }
}

// ============================================================================
// 4. PROJECT SERVICE WITH COMPLEX RELATIONSHIPS
// ============================================================================

/**
 * Project service with tenant-aware complex relationships
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantProjectService {
  constructor(
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService
  ) {}

  /**
   * Create project with organization and user relationships
   */
  async createProject(projectData: Omit<TenantProject, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<TenantProject> {
    const tenantId = await this.tenantContext.getTenantId();
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate organization exists
    const orgExists = await this.validateOrganizationExists(projectData.organizationId);
    if (!orgExists) {
      throw new BadRequestException('Organization not found');
    }

    // Validate owner exists
    const ownerExists = await this.validateUserExists(projectData.ownerId);
    if (!ownerExists) {
      throw new BadRequestException('Project owner not found');
    }

    const project: TenantProject = {
      id: projectId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...projectData
    };

    const result = await this.multiTenantNeo4j.runInTransaction(async (tx) => {
      // Create project
      const projectResult = await tx.run(
        `CREATE (p:Project $properties) RETURN p`,
        { properties: project }
      );

      // Create organization relationship
      await tx.run(
        `
        MATCH (o:Organization {id: $organizationId})
        MATCH (p:Project {id: $projectId})
        CREATE (o)-[:HAS_PROJECT]->(p)
        CREATE (p)-[:BELONGS_TO_ORGANIZATION]->(o)
        `,
        { organizationId: projectData.organizationId, projectId }
      );

      // Create owner relationship
      await tx.run(
        `
        MATCH (u:User {id: $ownerId})
        MATCH (p:Project {id: $projectId})
        CREATE (u)-[:OWNS_PROJECT]->(p)
        CREATE (p)-[:OWNED_BY]->(u)
        `,
        { ownerId: projectData.ownerId, projectId }
      );

      // Create collaborator relationships
      if (projectData.collaborators.length > 0) {
        await tx.run(
          `
          MATCH (u:User) WHERE u.id IN $collaborators
          MATCH (p:Project {id: $projectId})
          CREATE (u)-[:COLLABORATES_ON]->(p)
          CREATE (p)-[:HAS_COLLABORATOR]->(u)
          `,
          { collaborators: projectData.collaborators, projectId }
        );
      }

      return projectResult;
    });

    return result.records[0]?.get('p').properties as TenantProject;
  }

  /**
   * Find projects accessible to user
   */
  async findUserProjects(userId: string, options: {
    status?: TenantProject['status'];
    visibility?: TenantProject['visibility'];
    organizationId?: string;
  } = {}): Promise<TenantProject[]> {
    const { status, visibility, organizationId } = options;

    // Build dynamic where conditions
    const whereConditions: string[] = [];
    const parameters: Record<string, any> = { userId };

    if (status) {
      whereConditions.push('p.status = $status');
      parameters.status = status;
    }

    if (visibility) {
      whereConditions.push('p.visibility = $visibility');
      parameters.visibility = visibility;
    }

    if (organizationId) {
      whereConditions.push('p.organizationId = $organizationId');
      parameters.organizationId = organizationId;
    }

    const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

    const result = await this.multiTenantNeo4j.run(
      `
      MATCH (u:User {id: $userId})
      MATCH (p:Project)
      WHERE (
        (u)-[:OWNS_PROJECT]->(p) OR
        (u)-[:COLLABORATES_ON]->(p) OR
        (p.visibility = 'tenant')
      ) ${whereClause}
      RETURN DISTINCT p
      ORDER BY p.updatedAt DESC
      `,
      parameters,
      { accessMode: 'READ' }
    );

    return result.records.map(record => record.get('p').properties as TenantProject);
  }

  /**
   * Get project with full relationship details
   */
  async getProjectDetails(projectId: string): Promise<{
    project: TenantProject;
    organization: TenantOrganization;
    owner: TenantUser;
    collaborators: TenantUser[];
    statistics: {
      taskCount?: number;
      completionRate?: number;
      lastActivity?: Date;
    };
  } | null> {
    const result = await this.multiTenantNeo4j.run(
      `
      MATCH (p:Project {id: $projectId})
      MATCH (p)-[:BELONGS_TO_ORGANIZATION]->(org:Organization)
      MATCH (p)-[:OWNED_BY]->(owner:User)
      OPTIONAL MATCH (p)<-[:COLLABORATES_ON]-(collab:User)
      RETURN p, org, owner, collect(collab) as collaborators
      `,
      { projectId },
      {
        accessMode: 'READ',
        includeTenantMetadata: true
      }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const project = record.get('p').properties as TenantProject;
    const organization = record.get('org').properties as TenantOrganization;
    const owner = record.get('owner').properties as TenantUser;
    const collaborators = record.get('collaborators')
      .filter((collab: any) => collab !== null)
      .map((collab: any) => collab.properties as TenantUser);

    // Get additional statistics (would be more complex in production)
    const statistics = {
      taskCount: 0,
      completionRate: 0,
      lastActivity: project.updatedAt
    };

    return {
      project,
      organization,
      owner,
      collaborators,
      statistics
    };
  }

  /**
   * Update project with relationship management
   */
  async updateProject(
    projectId: string,
    updates: Partial<TenantProject>,
    relationshipUpdates?: {
      addCollaborators?: string[];
      removeCollaborators?: string[];
    }
  ): Promise<TenantProject> {
    return await this.multiTenantNeo4j.runInTransaction(async (tx) => {
      // Update project properties
      const { id, tenantId, createdAt, ...allowedUpdates } = updates;

      const projectResult = await tx.run(
        `
        MATCH (p:Project {id: $projectId})
        SET p += $updates, p.updatedAt = datetime()
        RETURN p
        `,
        {
          projectId,
          updates: { ...allowedUpdates, updatedAt: new Date() }
        }
      );

      // Handle collaborator updates
      if (relationshipUpdates?.addCollaborators?.length) {
        await tx.run(
          `
          MATCH (u:User) WHERE u.id IN $collaborators
          MATCH (p:Project {id: $projectId})
          WHERE NOT (u)-[:COLLABORATES_ON]->(p)
          CREATE (u)-[:COLLABORATES_ON]->(p)
          CREATE (p)-[:HAS_COLLABORATOR]->(u)
          `,
          {
            collaborators: relationshipUpdates.addCollaborators,
            projectId
          }
        );
      }

      if (relationshipUpdates?.removeCollaborators?.length) {
        await tx.run(
          `
          MATCH (u:User)-[r1:COLLABORATES_ON]->(p:Project {id: $projectId})
          MATCH (p)-[r2:HAS_COLLABORATOR]->(u)
          WHERE u.id IN $collaborators
          DELETE r1, r2
          `,
          {
            collaborators: relationshipUpdates.removeCollaborators,
            projectId
          }
        );
      }

      return projectResult;
    });

  }

  private async validateOrganizationExists(organizationId: string): Promise<boolean> {
    const result = await this.multiTenantNeo4j.run(
      `MATCH (o:Organization {id: $organizationId}) RETURN count(o) as count`,
      { organizationId },
      { accessMode: 'READ' }
    );

    return result.records[0]?.get('count').toNumber() > 0;
  }

  private async validateUserExists(userId: string): Promise<boolean> {
    const result = await this.multiTenantNeo4j.run(
      `MATCH (u:User {id: $userId}) RETURN count(u) as count`,
      { userId },
      { accessMode: 'READ' }
    );

    return result.records[0]?.get('count').toNumber() > 0;
  }
}

// ============================================================================
// 5. COMPOSITE SERVICE WITH CROSS-ENTITY OPERATIONS
// ============================================================================

/**
 * Composite service demonstrating complex multi-tenant operations
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantDashboardService {
  constructor(
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService,
    private readonly userService: TenantUserService,
    private readonly organizationService: TenantOrganizationService,
    private readonly projectService: TenantProjectService
  ) {}

  /**
   * Get comprehensive tenant dashboard data
   */
  async getTenantDashboard(): Promise<{
    summary: {
      totalUsers: number;
      activeUsers: number;
      totalOrganizations: number;
      totalProjects: number;
      activeProjects: number;
    };
    recentActivity: Array<{
      type: 'user_created' | 'project_created' | 'organization_created';
      entity: any;
      timestamp: Date;
    }>;
    tenantMetrics: {
      storageUsed: number;
      queryCount: number;
      performance: Record<string, number>;
    };
    limits: {
      users: { current: number; max: number | undefined; percentage: number };
      organizations: { current: number; max: number | undefined; percentage: number };
      projects: { current: number; max: number | undefined; percentage: number };
    };
  }> {
    // Get comprehensive stats in single query
    const statsResult = await this.multiTenantNeo4j.run(
      `
      MATCH (u:User) WHERE u.status <> 'inactive'
      MATCH (activeU:User) WHERE activeU.status = 'active'
      MATCH (o:Organization)
      MATCH (p:Project)
      MATCH (activeP:Project) WHERE activeP.status IN ['planning', 'active']

      RETURN
        count(DISTINCT u) as totalUsers,
        count(DISTINCT activeU) as activeUsers,
        count(DISTINCT o) as totalOrganizations,
        count(DISTINCT p) as totalProjects,
        count(DISTINCT activeP) as activeProjects
      `,
      {},
      {
        accessMode: 'READ',
        includeTenantMetadata: true
      }
    );

    // Get recent activity
    const activityResult = await this.multiTenantNeo4j.run(
      `
      (MATCH (u:User) RETURN 'user_created' as type, u as entity, u.createdAt as timestamp)
      UNION
      (MATCH (o:Organization) RETURN 'organization_created' as type, o as entity, o.createdAt as timestamp)
      UNION
      (MATCH (p:Project) RETURN 'project_created' as type, p as entity, p.createdAt as timestamp)
      ORDER BY timestamp DESC
      LIMIT 10
      `,
      {},
      { accessMode: 'READ' }
    );

    // Parse results
    const stats = statsResult.records[0];
    const summary = {
      totalUsers: stats?.get('totalUsers').toNumber() || 0,
      activeUsers: stats?.get('activeUsers').toNumber() || 0,
      totalOrganizations: stats?.get('totalOrganizations').toNumber() || 0,
      totalProjects: stats?.get('totalProjects').toNumber() || 0,
      activeProjects: stats?.get('activeProjects').toNumber() || 0
    };

    const recentActivity = activityResult.records.map(record => ({
      type: record.get('type') as 'user_created' | 'project_created' | 'organization_created',
      entity: record.get('entity').properties,
      timestamp: record.get('timestamp')
    }));

    // Get tenant metrics
    const tenantStats = await this.multiTenantNeo4j.getTenantStats();
    const tenantConfig = await this.tenantContext.getTenantConfig();
    const limits = tenantConfig.subscription?.limits;

    return {
      summary,
      recentActivity,
      tenantMetrics: {
        storageUsed: tenantStats.databaseSize,
        queryCount: 0, // Would track from analytics
        performance: {
          avgQueryTime: 25, // Would come from monitoring
          cacheHitRate: 85,
          connectionPoolUsage: 60
        }
      },
      limits: {
        users: {
          current: summary.totalUsers,
          max: limits?.maxNodes,
          percentage: limits?.maxNodes ? (summary.totalUsers / limits.maxNodes) * 100 : 0
        },
        organizations: {
          current: summary.totalOrganizations,
          max: limits?.maxNodes ? Math.floor(limits.maxNodes / 10) : undefined,
          percentage: limits?.maxNodes ? (summary.totalOrganizations / Math.floor(limits.maxNodes / 10)) * 100 : 0
        },
        projects: {
          current: summary.totalProjects,
          max: limits?.maxNodes ? Math.floor(limits.maxNodes / 5) : undefined,
          percentage: limits?.maxNodes ? (summary.totalProjects / Math.floor(limits.maxNodes / 5)) * 100 : 0
        }
      }
    };
  }

  /**
   * Perform tenant-wide search across entities
   */
  async searchTenantEntities(query: string, options: {
    entityTypes?: Array<'users' | 'organizations' | 'projects'>;
    limit?: number;
  } = {}): Promise<{
    users: TenantUser[];
    organizations: TenantOrganization[];
    projects: TenantProject[];
    totalResults: number;
  }> {
    const { entityTypes = ['users', 'organizations', 'projects'], limit = 50 } = options;

    const results = {
      users: [] as TenantUser[],
      organizations: [] as TenantOrganization[],
      projects: [] as TenantProject[],
      totalResults: 0
    };

    // Search users if included
    if (entityTypes.includes('users')) {
      const userResults = await this.userService.findAllUsers({
        search: query,
        limit: Math.floor(limit / entityTypes.length)
      });
      results.users = userResults.users;
    }

    // Search organizations
    if (entityTypes.includes('organizations')) {
      const orgResult = await this.multiTenantNeo4j.run(
        `
        MATCH (o:Organization)
        WHERE o.name CONTAINS $query OR o.type CONTAINS $query
        RETURN o
        LIMIT $limit
        `,
        { query, limit: Math.floor(limit / entityTypes.length) },
        { accessMode: 'READ' }
      );
      results.organizations = orgResult.records.map(r => r.get('o').properties as TenantOrganization);
    }

    // Search projects
    if (entityTypes.includes('projects')) {
      const projectResult = await this.multiTenantNeo4j.run(
        `
        MATCH (p:Project)
        WHERE p.name CONTAINS $query OR p.description CONTAINS $query OR any(tag IN p.tags WHERE tag CONTAINS $query)
        RETURN p
        LIMIT $limit
        `,
        { query, limit: Math.floor(limit / entityTypes.length) },
        { accessMode: 'READ' }
      );
      results.projects = projectResult.records.map(r => r.get('p').properties as TenantProject);
    }

    results.totalResults = results.users.length + results.organizations.length + results.projects.length;

    return results;
  }

  /**
   * Get tenant analytics and insights
   */
  async getTenantAnalytics(dateRange: { from: Date; to: Date }): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    projectActivity: Array<{ date: string; created: number; completed: number }>;
    organizationDistribution: Array<{ type: string; count: number }>;
    topCollaborators: Array<{ user: TenantUser; projectCount: number }>;
  }> {
    const { from, to } = dateRange;

    // This would involve complex temporal queries in production
    // Simplified example:

    const analyticsResult = await this.multiTenantNeo4j.run(
      `
      // User growth over time
      MATCH (u:User)
      WHERE u.createdAt >= $from AND u.createdAt <= $to
      WITH u, date(u.createdAt) as createdDate

      // Project activity
      MATCH (p:Project)
      WHERE p.createdAt >= $from AND p.createdAt <= $to

      // Organization distribution
      MATCH (o:Organization)
      WITH o.type as orgType, count(o) as orgCount

      RETURN
        collect({date: toString(createdDate), count: count(u)}) as userGrowth,
        orgType,
        orgCount
      `,
      { from, to },
      { accessMode: 'READ' }
    );

    // Simplified return - would be more complex in production
    return {
      userGrowth: [],
      projectActivity: [],
      organizationDistribution: [],
      topCollaborators: []
    };
  }
}

// ============================================================================
// USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

/*
MULTI-TENANT SERVICE BEST PRACTICES:

1. Service Design:
   - Use request-scoped services for tenant isolation
   - Inject MultiTenantNeo4jService for automatic tenant routing
   - Always validate tenant access in service methods
   - Use transactions for multi-step operations

2. Query Patterns:
   - Tenant isolation is automatic via database selection
   - Use includeTenantMetadata for monitoring
   - Enable trackAnalytics for usage tracking
   - Use validateLimits to enforce subscription limits

3. Error Handling:
   - Handle tenant-specific errors gracefully
   - Provide clear error messages without exposing tenant IDs
   - Log tenant context in all error logs
   - Validate relationships within tenant boundaries

4. Performance:
   - Use pagination for large result sets
   - Implement caching at the service layer
   - Use read/write access modes appropriately
   - Monitor query performance per tenant

5. Security:
   - Never expose cross-tenant data
   - Validate all entity relationships within tenant
   - Implement proper authorization at service level
   - Use transactions to maintain data consistency

6. Testing:
   - Mock tenant context for unit tests
   - Test tenant isolation in integration tests
   - Validate limit enforcement
   - Test cross-tenant data access prevention
*/
