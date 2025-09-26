/**
 * @fileoverview Tenant Context Management Examples
 *
 * Comprehensive examples for managing tenant context throughout the application lifecycle.
 * Demonstrates advanced patterns for tenant resolution, validation, and context propagation.
 *
 * This file demonstrates:
 * - TenantContextService usage patterns
 * - Request-scoped tenant resolution
 * - Tenant validation and authorization
 * - Context propagation through service layers
 * - Enterprise-grade tenant management
 */

import { Injectable, Scope, Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import {
  TenantContextService,
  TenantConfig,
  TenantResolutionStrategy,
  DefaultTenantStrategies
} from '../../../index';

// ============================================================================
// 1. BASIC TENANT CONTEXT USAGE PATTERNS
// ============================================================================

/**
 * Basic service demonstrating tenant context usage
 */
@Injectable({ scope: Scope.REQUEST })
export class BasicTenantAwareService {
  constructor(
    private readonly tenantContext: TenantContextService
  ) {}

  /**
   * Get current tenant information
   */
  async getCurrentTenant(): Promise<{
    tenantId: string;
    tenantName: string;
    databaseName: string;
    status: string;
  }> {
    const tenantId = await this.tenantContext.getTenantId();
    const config = await this.tenantContext.getTenantConfig();
    const databaseName = await this.tenantContext.getTenantDatabase();

    return {
      tenantId,
      tenantName: config.name,
      databaseName,
      status: config.status
    };
  }

  /**
   * Check tenant feature availability
   */
  async checkTenantFeatures(): Promise<{
    hasAdvancedAnalytics: boolean;
    hasRealTimeProcessing: boolean;
    hasAuditLogs: boolean;
    allFeatures: string[];
  }> {
    const config = await this.tenantContext.getTenantConfig();

    return {
      hasAdvancedAnalytics: await this.tenantContext.hasFeature('advanced-analytics'),
      hasRealTimeProcessing: await this.tenantContext.hasFeature('real-time-processing'),
      hasAuditLogs: await this.tenantContext.hasFeature('audit-logs'),
      allFeatures: config.config?.features || []
    };
  }

  /**
   * Validate tenant subscription limits
   */
  async validateTenantLimits(): Promise<{
    nodeLimit: { current: number; max: number | undefined; withinLimit: boolean };
    relationshipLimit: { current: number; max: number | undefined; withinLimit: boolean };
    queryLimit: { current: number; max: number | undefined; withinLimit: boolean };
  }> {
    const config = await this.tenantContext.getTenantConfig();
    const limits = config.subscription?.limits;

    // In production, these would come from actual usage metrics
    const currentUsage = {
      nodes: 5000,
      relationships: 25000,
      queries: 500
    };

    return {
      nodeLimit: {
        current: currentUsage.nodes,
        max: limits?.maxNodes,
        withinLimit: await this.tenantContext.checkLimit('maxNodes', currentUsage.nodes)
      },
      relationshipLimit: {
        current: currentUsage.relationships,
        max: limits?.maxRelationships,
        withinLimit: await this.tenantContext.checkLimit('maxRelationships', currentUsage.relationships)
      },
      queryLimit: {
        current: currentUsage.queries,
        max: limits?.maxQueries,
        withinLimit: await this.tenantContext.checkLimit('maxQueries', currentUsage.queries)
      }
    };
  }
}

// ============================================================================
// 2. TENANT CONTEXT GUARD AND MIDDLEWARE
// ============================================================================

/**
 * Guard that ensures tenant context is properly resolved and validated
 */
@Injectable()
export class TenantContextGuard {
  constructor(
    private readonly tenantContext: TenantContextService
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      // Validate tenant access - this will throw if invalid
      await this.tenantContext.validateAccess();

      // Get tenant config to ensure it exists
      const config = await this.tenantContext.getTenantConfig();

      // Additional business logic validation
      if (config.status === 'suspended') {
        throw new ForbiddenException('Tenant account is suspended');
      }

      if (config.status === 'archived') {
        throw new ForbiddenException('Tenant account is archived');
      }

      // Check subscription expiry
      if (config.subscription?.expiresAt && config.subscription.expiresAt < new Date()) {
        throw new ForbiddenException('Tenant subscription has expired');
      }

      return true;
    } catch (error) {
      console.error('Tenant context validation failed:', error);
      return false;
    }
  }
}

/**
 * Decorator for tenant-aware endpoints
 */
export function RequireTenant() {
  return UseGuards(TenantContextGuard);
}

// ============================================================================
// 3. TENANT-AWARE CONTROLLER EXAMPLES
// ============================================================================

/**
 * Controller demonstrating tenant context in REST endpoints
 */
@Controller('tenant-info')
@RequireTenant()
export class TenantInfoController {
  constructor(
    private readonly tenantService: BasicTenantAwareService
  ) {}

  /**
   * Get current tenant information
   * GET /tenant-info
   */
  @Get()
  async getTenantInfo() {
    return await this.tenantService.getCurrentTenant();
  }

  /**
   * Get tenant features
   * GET /tenant-info/features
   */
  @Get('features')
  async getTenantFeatures() {
    return await this.tenantService.checkTenantFeatures();
  }

  /**
   * Get tenant subscription limits and usage
   * GET /tenant-info/limits
   */
  @Get('limits')
  async getTenantLimits() {
    return await this.tenantService.validateTenantLimits();
  }

  /**
   * Get tenant metadata for analytics
   * GET /tenant-info/metadata
   */
  @Get('metadata')
  async getTenantMetadata(@Req() request: Request) {
    const tenantContext = request['tenantContext'] as TenantContextService;
    if (!tenantContext) {
      throw new Error('Tenant context not available');
    }

    return await tenantContext.getTenantMetadata();
  }
}

// ============================================================================
// 4. ADVANCED TENANT RESOLUTION STRATEGIES
// ============================================================================

/**
 * Healthcare-specific tenant resolution with department isolation
 */
export class HealthcareTenantStrategy implements TenantResolutionStrategy {
  extractTenantId(request: any): string | null {
    // Healthcare: Hospital-Department structure
    const hospitalId = request.headers['x-hospital-id'] as string;
    const departmentId = request.headers['x-department-id'] as string;

    if (hospitalId && departmentId) {
      return `${hospitalId}-${departmentId}`;
    }

    // Fallback to hospital level
    if (hospitalId) {
      return hospitalId;
    }

    return null;
  }

  async validateAccess(request: any, tenantId: string): Promise<boolean> {
    const [hospitalId, departmentId] = tenantId.split('-');

    // Validate hospital access
    if (!await this.validateHospitalAccess(request.user, hospitalId)) {
      return false;
    }

    // If department specified, validate department access
    if (departmentId && !await this.validateDepartmentAccess(request.user, hospitalId, departmentId)) {
      return false;
    }

    // Validate medical license for healthcare data access
    return await this.validateMedicalLicense(request.user);
  }

  private async validateHospitalAccess(user: any, hospitalId: string): Promise<boolean> {
    // Check user hospital affiliations
    return user?.hospitals?.includes(hospitalId) || false;
  }

  private async validateDepartmentAccess(user: any, hospitalId: string, departmentId: string): Promise<boolean> {
    // Check user department permissions
    const userDepartments = user?.departments?.[hospitalId] || [];
    return userDepartments.includes(departmentId);
  }

  private async validateMedicalLicense(user: any): Promise<boolean> {
    // Validate medical professional license
    return user?.license?.status === 'active' &&
           user?.license?.expiresAt > new Date();
  }
}

/**
 * Financial services tenant resolution with branch isolation
 */
export class FinancialServicesTenantStrategy implements TenantResolutionStrategy {
  extractTenantId(request: any): string | null {
    // Financial: Bank-Branch-Region structure
    const bankId = request.headers['x-bank-id'] as string;
    const branchId = request.headers['x-branch-id'] as string;
    const regionId = request.headers['x-region-id'] as string;

    // Build hierarchical tenant ID
    const parts = [bankId, regionId, branchId].filter(Boolean);
    return parts.length > 0 ? parts.join('-') : null;
  }

  async validateAccess(request: any, tenantId: string): Promise<boolean> {
    const [bankId, regionId, branchId] = tenantId.split('-');

    // Validate banking license
    if (!await this.validateBankingLicense(request.user, bankId)) {
      return false;
    }

    // Validate regional compliance
    if (regionId && !await this.validateRegionalCompliance(request.user, regionId)) {
      return false;
    }

    // Validate branch authorization
    if (branchId && !await this.validateBranchAuthorization(request.user, branchId)) {
      return false;
    }

    // Additional regulatory checks
    return await this.validateRegulatoryCompliance(request.user, tenantId);
  }

  private async validateBankingLicense(user: any, bankId: string): Promise<boolean> {
    return user?.banking?.licenses?.includes(bankId) || false;
  }

  private async validateRegionalCompliance(user: any, regionId: string): Promise<boolean> {
    // Check regional compliance certifications
    return user?.compliance?.regions?.includes(regionId) || false;
  }

  private async validateBranchAuthorization(user: any, branchId: string): Promise<boolean> {
    // Check branch-level authorizations
    return user?.authorizations?.branches?.includes(branchId) || false;
  }

  private async validateRegulatoryCompliance(user: any, tenantId: string): Promise<boolean> {
    // Perform regulatory compliance checks
    return user?.compliance?.status === 'active';
  }
}

/**
 * Educational platform tenant resolution with multi-level hierarchy
 */
export class EducationalTenantStrategy implements TenantResolutionStrategy {
  extractTenantId(request: any): string | null {
    // Education: University-School-Department-Course structure
    const universityId = request.headers['x-university-id'] as string;
    const schoolId = request.headers['x-school-id'] as string;
    const departmentId = request.headers['x-department-id'] as string;
    const courseId = request.headers['x-course-id'] as string;

    // Build tenant ID from most specific to most general
    if (courseId) return `${universityId}-${schoolId}-${departmentId}-${courseId}`;
    if (departmentId) return `${universityId}-${schoolId}-${departmentId}`;
    if (schoolId) return `${universityId}-${schoolId}`;
    return universityId;
  }

  async validateAccess(request: any, tenantId: string): Promise<boolean> {
    const parts = tenantId.split('-');
    const [universityId, schoolId, departmentId, courseId] = parts;

    const user = request.user;
    const userRole = user?.role; // student, teacher, admin, parent

    // Role-based access validation
    switch (userRole) {
      case 'student':
        return await this.validateStudentAccess(user, tenantId);
      case 'teacher':
        return await this.validateTeacherAccess(user, tenantId);
      case 'parent':
        return await this.validateParentAccess(user, tenantId);
      case 'admin':
        return await this.validateAdminAccess(user, tenantId);
      default:
        return false;
    }
  }

  private async validateStudentAccess(user: any, tenantId: string): Promise<boolean> {
    // Students can only access their enrolled courses/departments
    return user?.enrollments?.includes(tenantId) || false;
  }

  private async validateTeacherAccess(user: any, tenantId: string): Promise<boolean> {
    // Teachers can access courses they teach and departments they belong to
    const teachings = user?.teachings || [];
    const departments = user?.departments || [];

    return teachings.includes(tenantId) ||
           departments.some((dept: string) => tenantId.startsWith(dept));
  }

  private async validateParentAccess(user: any, tenantId: string): Promise<boolean> {
    // Parents can only access their children's educational contexts
    const childrenTenants = user?.children?.flatMap((child: any) => child.enrollments) || [];
    return childrenTenants.includes(tenantId);
  }

  private async validateAdminAccess(user: any, tenantId: string): Promise<boolean> {
    // Admins have broader access within their administrative scope
    const adminScope = user?.adminScope || [];
    return adminScope.some((scope: string) => tenantId.startsWith(scope));
  }
}

// ============================================================================
// 5. TENANT CONTEXT MIDDLEWARE FOR EXPRESS
// ============================================================================

/**
 * Middleware to inject tenant context into request object
 */
export function tenantContextMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      // Extract tenant context service from DI container
      // This would be properly injected in a real NestJS application
      const tenantContext = req.tenantContext as TenantContextService;

      if (tenantContext) {
        // Pre-resolve tenant information for performance
        const tenantId = await tenantContext.getTenantId().catch(() => null);
        const config = tenantId ? await tenantContext.getTenantConfig().catch(() => null) : null;

        // Add tenant information to request for easy access
        req.tenant = {
          id: tenantId,
          config,
          database: config?.databaseName,
          features: config?.config?.features || [],
          limits: config?.subscription?.limits
        };

        // Add helper methods
        req.tenant.hasFeature = (feature: string) => req.tenant.features.includes(feature);
        req.tenant.checkLimit = async (limitType: string, current: number) => {
          return tenantContext.checkLimit(limitType as any, current);
        };
      }

      next();
    } catch (error) {
      console.error('Tenant context middleware error:', error);
      next(error);
    }
  };
}

// ============================================================================
// 6. TENANT-AWARE SERVICE COMPOSITION
// ============================================================================

/**
 * Service that composes multiple tenant-aware services
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantServiceOrchestrator {
  constructor(
    private readonly tenantContext: TenantContextService
  ) {}

  /**
   * Execute multiple operations with tenant context
   */
  async executeTenantOperations<T>(
    operations: Array<(tenantId: string, config: TenantConfig) => Promise<T>>
  ): Promise<T[]> {
    const tenantId = await this.tenantContext.getTenantId();
    const config = await this.tenantContext.getTenantConfig();

    // Validate access once for all operations
    await this.tenantContext.validateAccess();

    // Execute all operations in parallel with tenant context
    const results = await Promise.allSettled(
      operations.map(operation => operation(tenantId, config))
    );

    // Filter successful results and log failures
    const successfulResults: T[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        console.error(`Tenant operation ${index} failed:`, result.reason);
      }
    });

    return successfulResults;
  }

  /**
   * Execute operation with tenant feature validation
   */
  async executeWithFeatureCheck<T>(
    requiredFeatures: string[],
    operation: (tenantId: string, config: TenantConfig) => Promise<T>
  ): Promise<T> {
    // Validate all required features
    for (const feature of requiredFeatures) {
      const hasFeature = await this.tenantContext.hasFeature(feature);
      if (!hasFeature) {
        throw new Error(`Required feature '${feature}' not available for tenant`);
      }
    }

    const tenantId = await this.tenantContext.getTenantId();
    const config = await this.tenantContext.getTenantConfig();

    return await operation(tenantId, config);
  }

  /**
   * Execute operation with limit validation
   */
  async executeWithLimitCheck<T>(
    limitChecks: Array<{ type: keyof NonNullable<TenantConfig['subscription']>['limits']; current: number }>,
    operation: (tenantId: string, config: TenantConfig) => Promise<T>
  ): Promise<T> {
    // Validate all limits
    for (const check of limitChecks) {
      const withinLimit = await this.tenantContext.checkLimit(check.type, check.current);
      if (!withinLimit) {
        throw new Error(`Tenant limit exceeded for ${check.type}: ${check.current}`);
      }
    }

    const tenantId = await this.tenantContext.getTenantId();
    const config = await this.tenantContext.getTenantConfig();

    return await operation(tenantId, config);
  }
}

// ============================================================================
// 7. TENANT CONTEXT TESTING UTILITIES
// ============================================================================

/**
 * Mock tenant context for testing
 */
export class MockTenantContext {
  private mockTenantId = 'test-tenant';
  private mockConfig: TenantConfig = {
    tenantId: 'test-tenant',
    name: 'Test Tenant',
    databaseName: 'test_tenant_db',
    status: 'active',
    config: {
      features: ['advanced-analytics', 'real-time-processing']
    },
    subscription: {
      plan: 'enterprise',
      limits: {
        maxNodes: 100000,
        maxRelationships: 500000,
        maxQueries: 5000
      }
    },
    metadata: {
      createdAt: new Date(),
      createdBy: 'test-system'
    }
  };

  async getTenantId(): Promise<string> {
    return this.mockTenantId;
  }

  async getTenantConfig(): Promise<TenantConfig> {
    return this.mockConfig;
  }

  async getTenantDatabase(): Promise<string> {
    return this.mockConfig.databaseName;
  }

  async hasFeature(feature: string): Promise<boolean> {
    return this.mockConfig.config?.features?.includes(feature) || false;
  }

  async checkLimit(limitType: string, currentValue: number): Promise<boolean> {
    const limit = (this.mockConfig.subscription?.limits as any)?.[limitType];
    return limit ? currentValue <= limit : true;
  }

  async validateAccess(): Promise<void> {
    if (this.mockConfig.status !== 'active') {
      throw new Error('Mock tenant not active');
    }
  }

  async getTenantMetadata(): Promise<Record<string, any>> {
    return {
      tenantId: this.mockConfig.tenantId,
      tenantName: this.mockConfig.name,
      plan: this.mockConfig.subscription?.plan,
      features: this.mockConfig.config?.features || [],
      status: this.mockConfig.status
    };
  }

  // Test utilities
  setTenantId(tenantId: string): void {
    this.mockTenantId = tenantId;
    this.mockConfig.tenantId = tenantId;
  }

  setTenantStatus(status: TenantConfig['status']): void {
    this.mockConfig.status = status;
  }

  addFeature(feature: string): void {
    if (!this.mockConfig.config?.features) {
      this.mockConfig.config = { features: [] };
    }
    this.mockConfig.config.features.push(feature);
  }

  setLimit(limitType: string, value: number): void {
    if (!this.mockConfig.subscription?.limits) {
      this.mockConfig.subscription = { plan: 'test', limits: {} };
    }
    (this.mockConfig.subscription.limits as any)[limitType] = value;
  }
}

// ============================================================================
// USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

/*
TENANT CONTEXT BEST PRACTICES:

1. Request Scoping:
   - Always use Scope.REQUEST for tenant-aware services
   - Inject TenantContextService in request-scoped services
   - Avoid storing tenant context in singleton services

2. Validation Strategy:
   - Validate tenant access early in request lifecycle
   - Use guards to enforce tenant validation
   - Implement custom validation logic for business requirements

3. Performance Optimization:
   - Cache tenant configuration where appropriate
   - Pre-resolve tenant information in middleware
   - Use lazy loading for expensive tenant operations

4. Error Handling:
   - Provide clear error messages for tenant issues
   - Log tenant context in all error logs
   - Handle tenant suspension/expiration gracefully

5. Security Considerations:
   - Never expose tenant IDs in client-side code
   - Validate all tenant access at the service layer
   - Implement audit logging for tenant operations
   - Use encrypted connections for tenant data

6. Testing:
   - Use mock tenant context for unit tests
   - Test all tenant resolution strategies
   - Validate multi-tenant isolation in integration tests
   - Test tenant limit enforcement

7. Monitoring:
   - Track tenant context resolution performance
   - Monitor tenant access patterns
   - Alert on tenant validation failures
   - Track tenant feature usage
*/
