import { SetMetadata, UnauthorizedException, Logger } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { DECORATOR_METADATA_KEYS } from '../../interfaces/decorator-metadata.interface';
import type { AuthContext, AuthorizeConfig, RequestUser } from './interfaces';

const securityLogger = new Logger('Neo4jSecurity');

/**
 * Extract real authentication context from NestJS ExecutionContext
 *
 * This function implements enterprise-grade authentication context extraction
 * following the same patterns used in the ChromaDB multi-tenant system.
 *
 * @param instance - The service instance (contains execution context)
 * @returns Promise<AuthContext> - Real user authentication context
 * @throws UnauthorizedException - When authentication context is unavailable
 */
export async function getExecutionContext(
  _instance: any
): Promise<AuthContext> {
  try {
    const cls = ClsServiceManager.getClsService();
    const user = cls.get<RequestUser>('user');

    if (!user) {
      securityLogger.error(
        'No user found in ClsService. Ensure ClsModule is configured and guards set user context.'
      );
      throw new UnauthorizedException(
        'Authentication required. User not found in async context (ClsService).'
      );
    }

    // Build AuthContext from CLS user
    const userId = user.id || user.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID is required for authentication');
    }

    const tenantId = user.tenantId || user.organizationId;
    if (!tenantId) {
      throw new UnauthorizedException(
        'Tenant context is required for authorization'
      );
    }

    const authContext: AuthContext = {
      userId,
      tenantId,
      roles: user.roles || [],
      permissions: await getUserPermissions(user),
      ipAddress: cls.get('ipAddress'), // Optional - set by middleware
      timestamp: new Date(),
      userEmail: user.email,
      organizationName: user.organizationId,
      sessionId: cls.get('sessionId') || `session_${Date.now()}`,
    };

    securityLogger.debug(
      `Authentication context extracted for user ${userId} in tenant ${tenantId}`
    );
    return authContext;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    securityLogger.error(
      `Failed to get authentication context from ClsService: ${errorMessage}`
    );
    throw new UnauthorizedException(
      `Authentication context unavailable. Ensure ClsModule is configured in your application. Error: ${errorMessage}`
    );
  }
}

/**
 * Extract user permissions from roles and direct permissions
 *
 * @param user - Authenticated user object
 * @returns Promise<string[]> - User permissions array
 */
export async function getUserPermissions(user: RequestUser): Promise<string[]> {
  const permissions = new Set<string>();

  // Add direct permissions
  if (Array.isArray(user.permissions)) {
    user.permissions.forEach((permission) => permissions.add(permission));
  }

  // Add role-based permissions
  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      const rolePermissions = getRolePermissions(role);
      rolePermissions.forEach((permission) => permissions.add(permission));
    }
  }

  // Add tier-based permissions
  if (user.tier) {
    const tierPermissions = getTierPermissions(user.tier);
    tierPermissions.forEach((permission) => permissions.add(permission));
  }

  return Array.from(permissions);
}

/**
 * Get permissions associated with a role
 *
 * @param role - User role
 * @returns string[] - Permissions for the role
 */
function getRolePermissions(role: string): string[] {
  const rolePermissionMap: Record<string, string[]> = {
    admin: [
      'read',
      'write',
      'delete',
      'manage_users',
      'manage_tenants',
      'admin',
    ],
    'user-manager': ['read', 'write', 'manage_users'],
    editor: ['read', 'write'],
    viewer: ['read'],
    owner: ['read', 'write', 'delete', 'manage_users', 'admin'],
    member: ['read', 'write'],
    guest: ['read'],
  };

  return rolePermissionMap[role.toLowerCase()] || [];
}

/**
 * Get permissions associated with a subscription tier
 *
 * @param tier - Subscription tier
 * @returns string[] - Permissions for the tier
 */
function getTierPermissions(tier: 'free' | 'pro' | 'enterprise'): string[] {
  const tierPermissionMap: Record<string, string[]> = {
    free: ['read', 'write'],
    pro: ['read', 'write', 'advanced_queries', 'export'],
    enterprise: [
      'read',
      'write',
      'advanced_queries',
      'export',
      'admin',
      'manage_tenants',
    ],
  };

  return tierPermissionMap[tier] || [];
}

// Authorization check
async function checkAuthorization(
  context: any,
  config: AuthorizeConfig,
  methodName: string
): Promise<boolean> {
  // Role-based check
  if (config.roles && config.roles.length > 0) {
    const hasRequiredRole = config.roles.some((role) =>
      context.roles.includes(role)
    );
    if (!hasRequiredRole) return false;
  }

  // Permission-based check
  if (config.permissions && config.permissions.length > 0) {
    const hasRequiredPermission = config.permissions.some((permission) =>
      context.permissions.includes(permission)
    );
    if (!hasRequiredPermission) return false;
  }

  // Custom authorization
  if (config.customAuthorizer) {
    return await config.customAuthorizer(context, config);
  }

  return true;
}

// Inject tenant filter
function injectTenantFilter(
  args: any[],
  context: any,
  tenantConfig: any
): any[] {
  if (!tenantConfig.tenantProperty || !context.tenantId) {
    return args;
  }

  // Add tenant filter to first argument if it's an object
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    args[0][tenantConfig.tenantProperty] = context.tenantId;
  } else {
    // Add as new parameter object
    args.unshift({ [tenantConfig.tenantProperty]: context.tenantId });
  }

  return args;
}

/**
 * Authorization decorator for role-based access control
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Authorize({
 *     roles: ['admin', 'user-manager'],
 *     permissions: ['user:read', 'user:write'],
 *     tenantIsolation: {
 *       enabled: true,
 *       tenantProperty: 'organizationId',
 *       autoInject: true
 *     }
 *   })
 *   @CypherQuery({
 *     query: 'MATCH (u:User) WHERE u.organizationId = $organizationId RETURN u'
 *   })
 *   async getUsers(): Promise<User[]> {
 *     // organizationId automatically injected from user context
 *     // Only executes if user has required roles/permissions
 *   }
 * }
 * ```
 */
export function Authorize(config?: AuthorizeConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    // Store authorization metadata
    const finalConfig = config || {};
    SetMetadata(DECORATOR_METADATA_KEYS.AUTHORIZE || 'AUTHORIZE', finalConfig)(
      target,
      propertyKey,
      descriptor
    );

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        // Get current execution context (user, tenant, etc.)
        const context = await getExecutionContext(this);

        // Perform authorization check
        const isAuthorized = await checkAuthorization(
          context,
          finalConfig,
          methodName
        );

        if (!isAuthorized) {
          const error = new Error(
            `Access denied for ${methodName}: insufficient permissions`
          );
          (error as any).code = 'AUTHORIZATION_FAILED';
          (error as any).requiredRoles = finalConfig.roles;
          (error as any).requiredPermissions = finalConfig.permissions;
          throw error;
        }

        // Auto-inject tenant isolation if configured
        if (
          finalConfig.tenantIsolation?.enabled &&
          finalConfig.tenantIsolation.autoInject
        ) {
          args = injectTenantFilter(args, context, finalConfig.tenantIsolation);
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Log successful authorization
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `✅ Authorized access to ${methodName} for user ${context.userId}`
          );
        }

        return result;
      } catch (error) {
        // Log authorization failure
        console.error(`❌ Authorization failed for ${methodName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
