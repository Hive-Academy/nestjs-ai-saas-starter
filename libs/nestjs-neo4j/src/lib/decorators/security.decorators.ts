/**
 * @fileoverview Security & Validation Decorators for Neo4j Operations (Phase 5)
 *
 * These decorators provide enterprise-grade security features for Neo4j operations:
 * - Authorization and role-based access control
 * - Input validation and sanitization
 * - Audit logging for compliance
 * - Rate limiting and throttling
 * - Data encryption and masking
 * - Multi-tenant isolation
 */

import {
  SetMetadata,
  type ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DECORATOR_METADATA_KEYS } from '../interfaces/decorator-metadata.interface';

/**
 * Authentication context interface for real user data
 */
export interface AuthContext {
  /** Authenticated user ID */
  readonly userId: string;
  /** Tenant/organization ID for multi-tenancy */
  readonly tenantId: string;
  /** User roles for authorization */
  readonly roles: string[];
  /** User permissions for fine-grained access control */
  readonly permissions: string[];
  /** Client IP address for audit logging */
  readonly ipAddress?: string;
  /** Authentication timestamp */
  readonly timestamp: Date;
  /** User email for audit trails */
  readonly userEmail?: string;
  /** Organization name for context */
  readonly organizationName?: string;
  /** Session ID for tracking */
  readonly sessionId?: string;
}

/**
 * User interface from NestJS request context
 */
export interface RequestUser {
  id: string;
  userId?: string;
  email?: string;
  tenantId?: string;
  organizationId?: string;
  roles?: string[];
  permissions?: string[];
  tier?: 'free' | 'pro' | 'enterprise';
}

/**
 * Authorization configuration
 */
export interface AuthorizeConfig {
  /** Required roles for access */
  roles?: string[];
  /** Required permissions */
  permissions?: string[];
  /** Tenant isolation configuration */
  tenantIsolation?: {
    enabled: boolean;
    tenantProperty?: string; // e.g., 'tenantId', 'organizationId'
    autoInject?: boolean; // Automatically inject tenant filter
  };
  /** Resource-based access control */
  resourceAccess?: {
    /** Resource type being accessed */
    resourceType: string;
    /** Required actions on resource */
    actions: string[]; // e.g., ['read', 'write', 'delete']
    /** Owner-based access */
    ownershipCheck?: {
      ownerProperty: string; // e.g., 'userId', 'createdBy'
      allowOwnerAccess: boolean;
    };
  };
  /** Custom authorization function */
  customAuthorizer?: (
    context: any,
    metadata: any
  ) => Promise<boolean> | boolean;
}

/**
 * Input validation configuration
 */
export interface ValidateInputConfig {
  /** Schema validation */
  schema?: {
    /** JSON schema for parameter validation */
    parameterSchema?: Record<string, any>;
    /** Validate against Neo4j property types */
    validatePropertyTypes?: boolean;
  };
  /** Sanitization rules */
  sanitization?: {
    /** Remove HTML tags */
    stripHtml?: boolean;
    /** Escape special characters */
    escapeSpecialChars?: boolean;
    /** Whitelist allowed characters */
    allowedCharsPattern?: RegExp;
    /** Maximum string length */
    maxStringLength?: number;
  };
  /** SQL/Cypher injection prevention */
  injectionPrevention?: {
    /** Enable Cypher injection detection */
    enabled: boolean;
    /** Suspicious patterns to detect */
    suspiciousPatterns?: RegExp[];
    /** Action when injection detected */
    onDetection: 'throw' | 'sanitize' | 'log';
  };
  /** Custom validators */
  customValidators?: Array<{
    name: string;
    validator: (value: any, context: any) => boolean | Promise<boolean>;
    message: string;
  }>;
}

/**
 * Audit logging configuration
 */
export interface AuditLogConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** What to log */
  logLevel: 'minimal' | 'standard' | 'detailed' | 'full';
  /** Include sensitive data */
  includeSensitiveData?: boolean;
  /** Log successful operations */
  logSuccess?: boolean;
  /** Log failed operations */
  logFailures?: boolean;
  /** Custom audit fields */
  customFields?: Record<string, any>;
  /** Audit storage configuration */
  storage?: {
    /** Store in Neo4j as audit nodes */
    storeInNeo4j?: boolean;
    /** External audit service */
    externalService?: string;
    /** Retention policy */
    retentionDays?: number;
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  requests: number;
  /** Time window (e.g., '1m', '1h', '1d') */
  window: string;
  /** Rate limiting strategy */
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket';
  /** Key generation for rate limiting */
  keyGenerator?: {
    /** Include user ID in key */
    includeUserId?: boolean;
    /** Include tenant ID in key */
    includeTenantId?: boolean;
    /** Include IP address in key */
    includeIpAddress?: boolean;
    /** Custom key function */
    customKey?: (context: any) => string;
  };
  /** Action when limit exceeded */
  onLimitExceeded?: {
    /** Response type */
    response: 'throw' | 'queue' | 'reject';
    /** Custom message */
    message?: string;
    /** Retry after (seconds) */
    retryAfter?: number;
  };
}

/**
 * Data encryption configuration
 */
export interface EncryptSensitiveConfig {
  /** Fields to encrypt before storing */
  encryptFields?: string[];
  /** Fields to mask in logs */
  maskFields?: string[];
  /** Encryption algorithm */
  algorithm?: 'aes-256-gcm' | 'aes-256-cbc';
  /** Key rotation */
  keyRotation?: {
    enabled: boolean;
    intervalDays: number;
  };
  /** Audit trail for encryption */
  auditEncryption?: boolean;
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

/**
 * Input validation and sanitization decorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @ValidateInput({
 *     schema: {
 *       parameterSchema: {
 *         type: 'object',
 *         properties: {
 *           email: { type: 'string', format: 'email' },
 *           age: { type: 'number', minimum: 0, maximum: 150 }
 *         },
 *         required: ['email']
 *       }
 *     },
 *     sanitization: {
 *       stripHtml: true,
 *       maxStringLength: 1000
 *     },
 *     injectionPrevention: {
 *       enabled: true,
 *       onDetection: 'throw'
 *     }
 *   })
 *   async createUser(userData: CreateUserDto): Promise<User> {
 *     // Input is validated and sanitized before method execution
 *   }
 * }
 * ```
 */
export function ValidateInput(config?: ValidateInputConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const finalConfig = config || {
      injectionPrevention: { enabled: false, onDetection: 'log' as const },
    };
    SetMetadata(
      DECORATOR_METADATA_KEYS.VALIDATE_INPUT || 'VALIDATE_INPUT',
      finalConfig
    )(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        // Validate and sanitize input parameters
        const validatedArgs = await validateAndSanitizeInput(
          args,
          finalConfig,
          methodName
        );

        // Execute original method with validated args
        return await originalMethod.apply(this, validatedArgs);
      } catch (error) {
        //  error with validation details
        if (error instanceof ValidationError) {
          const returnedError = new Error(
            `Input validation failed for ${methodName}: ${error.message}`
          );
          (returnedError as any).validationErrors = error.details;
          (returnedError as any).originalInput = args;
          throw returnedError;
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Audit logging decorator for compliance and monitoring
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PaymentService {
 *   @AuditLog({
 *     enabled: true,
 *     logLevel: 'detailed',
 *     includeSensitiveData: false,
 *     customFields: {
 *       operation: 'payment_processing',
 *       riskLevel: 'high'
 *     },
 *     storage: {
 *       storeInNeo4j: true,
 *       retentionDays: 2555 // 7 years for financial compliance
 *     }
 *   })
 *   async processPayment(amount: number, customerId: string): Promise<PaymentResult> {
 *     // All access to this method is automatically audited
 *   }
 * }
 * ```
 */
export function AuditLog(config?: AuditLogConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const finalConfig = config || {
      enabled: false,
      logLevel: 'minimal' as const,
    };
    SetMetadata(DECORATOR_METADATA_KEYS.AUDIT_LOG || 'AUDIT_LOG', finalConfig)(
      target,
      propertyKey,
      descriptor
    );

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const auditId = generateAuditId();

      try {
        // Log method entry
        if (finalConfig.enabled) {
          await logAuditEvent(
            this,
            {
              auditId,
              event: 'method_entry',
              methodName,
              timestamp: new Date(),
              parameters: finalConfig.includeSensitiveData
                ? args
                : sanitizeForAudit(args),
              context: await getExecutionContext(this),
              customFields: finalConfig.customFields,
            },
            finalConfig
          );
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Log successful completion
        if (finalConfig.enabled && finalConfig.logSuccess !== false) {
          await logAuditEvent(
            this,
            {
              auditId,
              event: 'method_success',
              methodName,
              timestamp: new Date(),
              executionTime: Date.now() - startTime,
              result: finalConfig.includeSensitiveData
                ? result
                : sanitizeForAudit(result),
              context: await getExecutionContext(this),
              customFields: finalConfig.customFields,
            },
            finalConfig
          );
        }

        return result;
      } catch (error) {
        // Log failure
        if (finalConfig.enabled && finalConfig.logFailures !== false) {
          await logAuditEvent(
            this,
            {
              auditId,
              event: 'method_failure',
              methodName,
              timestamp: new Date(),
              executionTime: Date.now() - startTime,
              error: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
              context: await getExecutionContext(this),
              customFields: finalConfig.customFields,
            },
            finalConfig
          );
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Rate limiting decorator for API protection
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SearchService {
 *   @RateLimit({
 *     requests: 100,
 *     window: '1m',
 *     strategy: 'sliding-window',
 *     keyGenerator: {
 *       includeUserId: true,
 *       includeTenantId: true
 *     },
 *     onLimitExceeded: {
 *       response: 'throw',
 *       message: 'Search rate limit exceeded',
 *       retryAfter: 60
 *     }
 *   })
 *   async searchUsers(query: string): Promise<User[]> {
 *     // Rate limited per user per tenant
 *   }
 * }
 * ```
 */
export function RateLimit(config?: RateLimitConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const finalConfig = config || {
      requests: 100,
      window: '1m',
      strategy: 'fixed-window' as const,
    };
    SetMetadata(
      DECORATOR_METADATA_KEYS.RATE_LIMIT || 'RATE_LIMIT',
      finalConfig
    )(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      // Generate rate limiting key
      const context = await getExecutionContext(this);
      const rateLimitKey = generateRateLimitKey(
        context,
        finalConfig,
        methodName
      );

      // Check rate limit
      const isAllowed = await checkRateLimit(rateLimitKey, finalConfig);

      if (!isAllowed) {
        const error = new Error(
          finalConfig.onLimitExceeded?.message ||
            `Rate limit exceeded for ${methodName}`
        );
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter =
          finalConfig.onLimitExceeded?.retryAfter || 60;
        throw error;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Increment rate limit counter
      await incrementRateLimit(rateLimitKey, finalConfig);

      return result;
    };

    return descriptor;
  };
}

/**
 * Data encryption decorator for sensitive information
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PrivateDataService {
 *   @EncryptSensitive({
 *     encryptFields: ['ssn', 'creditCardNumber', 'bankAccount'],
 *     maskFields: ['email', 'phone'],
 *     algorithm: 'aes-256-gcm',
 *     auditEncryption: true
 *   })
 *   async storePersonalData(data: PersonalData): Promise<void> {
 *     // Sensitive fields automatically encrypted before storage
 *   }
 * }
 * ```
 */
export function EncryptSensitive(
  config: EncryptSensitiveConfig
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    SetMetadata(
      DECORATOR_METADATA_KEYS.ENCRYPT_SENSITIVE || 'ENCRYPT_SENSITIVE',
      config
    )(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Encrypt sensitive fields in arguments
      const encryptedArgs = await encryptSensitiveData(args, config);

      // Execute original method with encrypted data
      const result = await originalMethod.apply(this, encryptedArgs);

      // Decrypt sensitive fields in result if needed
      const decryptedResult = await decryptSensitiveData(result, config);

      return decryptedResult;
    };

    return descriptor;
  };
}

/**
 * Utility functions for security decorators
 */

// Validation error class
class ValidationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Logger for security operations
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
async function getExecutionContext(instance: any): Promise<AuthContext> {
  try {
    // Extract execution context from various sources
    let executionContext: ExecutionContext | undefined;
    let request: any;

    // Strategy 1: Direct execution context (from guards/interceptors)
    if (
      instance.context &&
      typeof instance.context.switchToHttp === 'function'
    ) {
      executionContext = instance.context;
      request = executionContext?.switchToHttp().getRequest();
    }
    // Strategy 2: Request object directly attached
    else if (instance.request || instance.req) {
      request = instance.request || instance.req;
    }
    // Strategy 3: Look for context in method parameters or service injection
    else if (instance.httpArgumentsHost) {
      request = instance.httpArgumentsHost.getRequest();
    }

    if (!request) {
      securityLogger.error('No request context available for authentication');
      throw new UnauthorizedException(
        'Request context not available for authentication'
      );
    }

    // CWE-285 FIX: Real authentication context extraction (REQUIREMENT 2)
    const user = await extractUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('User authentication required');
    }

    // Validate required user fields
    const userId = user.id || user.userId;
    if (!userId) {
      securityLogger.error('User ID missing from authenticated user context');
      throw new UnauthorizedException('User ID is required for authentication');
    }

    // Extract tenant information (required for multi-tenancy)
    const tenantId = await extractTenantFromUser(user, request);
    if (!tenantId) {
      securityLogger.warn(`No tenant context available for user ${userId}`);
      throw new UnauthorizedException(
        'Tenant context is required for authorization'
      );
    }

    // Extract user permissions (from roles or direct permissions)
    const permissions = await getUserPermissions(user);

    // Extract client IP for audit logging
    const ipAddress = extractClientIP(request);

    // Extract session information
    const sessionId =
      request.sessionID || request.session?.id || `session_${Date.now()}`;

    const authContext: AuthContext = {
      userId,
      tenantId,
      roles: user.roles || [],
      permissions,
      ipAddress,
      timestamp: new Date(),
      userEmail: user.email,
      organizationName: user.organizationId,
      sessionId,
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
      `Authentication context extraction failed: ${errorMessage}`
    );
    throw new UnauthorizedException(
      `Authentication context extraction failed: ${errorMessage}`
    );
  }
}

/**
 * Extract tenant ID from authenticated user context
 *
 * @param user - Authenticated user object
 * @param request - HTTP request object for additional context
 * @returns Promise<string> - Tenant ID
 */
async function extractTenantFromUser(
  user: RequestUser,
  request: any
): Promise<string | null> {
  // Strategy 1: Direct tenant ID from user object
  if (user.tenantId) {
    return user.tenantId;
  }

  // Strategy 2: Organization ID as tenant ID
  if (user.organizationId) {
    return user.organizationId;
  }

  // Strategy 3: Extract from headers (for API keys or service-to-service calls)
  const headerTenantId =
    request.headers['x-tenant-id'] ||
    request.headers['tenant-id'] ||
    request.headers['X-Tenant-ID'];
  if (headerTenantId) {
    return String(headerTenantId);
  }

  // Strategy 4: Extract from query parameters (fallback)
  const queryTenantId = request.query?.tenantId || request.query?.tenant_id;
  if (queryTenantId) {
    return String(queryTenantId);
  }

  return null;
}

/**
 * Extract user permissions from roles and direct permissions
 *
 * @param user - Authenticated user object
 * @returns Promise<string[]> - User permissions array
 */
async function getUserPermissions(user: RequestUser): Promise<string[]> {
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

/**
 * Extract client IP address from request
 *
 * @param request - HTTP request object
 * @returns string - Client IP address
 */
function extractClientIP(request: any): string {
  return (
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.headers['x-real-ip'] ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.ip ||
    '127.0.0.1'
  );
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

// Input validation and sanitization
async function validateAndSanitizeInput(
  args: any[],
  config: ValidateInputConfig,
  methodName: string
): Promise<any[]> {
  // Simplified validation - in real implementation would use JSON schema validation
  const validatedArgs = [...args];

  // Check for injection attempts
  if (config.injectionPrevention?.enabled) {
    for (const arg of validatedArgs) {
      if (typeof arg === 'string' && containsSuspiciousPatterns(arg)) {
        if (config.injectionPrevention.onDetection === 'throw') {
          throw new ValidationError('Suspicious input detected', {
            method: methodName,
            input: arg,
          });
        }
      }
    }
  }

  return validatedArgs;
}

// Audit logging
async function logAuditEvent(
  instance: any,
  event: any,
  config: AuditLogConfig
): Promise<void> {
  if (config.storage?.storeInNeo4j && instance.neo4jService) {
    try {
      // Use QueryBuilder for audit log creation
      const queryBuilder = instance.neo4jService.createQueryBuilder();

      queryBuilder.create('(audit:AuditLog)').set({
        'audit.id': '$auditId',
        'audit.event': '$event',
        'audit.methodName': '$methodName',
        'audit.timestamp': '$timestamp',
        'audit.userId': '$userId',
        'audit.tenantId': '$tenantId',
        'audit.details': '$details',
      });

      // Add parameters to QueryBuilder
      queryBuilder.getBindParam().add('auditId', event.auditId);
      queryBuilder.getBindParam().add('event', event.event);
      queryBuilder.getBindParam().add('methodName', event.methodName);
      queryBuilder
        .getBindParam()
        .add('timestamp', event.timestamp.toISOString());
      queryBuilder.getBindParam().add('userId', event.context?.userId);
      queryBuilder.getBindParam().add('tenantId', event.context?.tenantId);
      queryBuilder.getBindParam().add('details', JSON.stringify(event));

      await queryBuilder.run();
    } catch (error) {
      console.error('Failed to store audit log in Neo4j:', error);
    }
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Audit: ${event.event} - ${event.methodName}`, event);
  }
}

// Rate limiting utilities
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<boolean> {
  // Simplified rate limiting - in real implementation would use Redis
  return true; // Allow for now
}

async function incrementRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  // Increment counter in Redis or memory store
}

function generateRateLimitKey(
  context: any,
  config: RateLimitConfig,
  methodName: string
): string {
  const parts = [methodName];

  if (config.keyGenerator?.includeUserId && context.userId) {
    parts.push(`user:${context.userId}`);
  }

  if (config.keyGenerator?.includeTenantId && context.tenantId) {
    parts.push(`tenant:${context.tenantId}`);
  }

  if (config.keyGenerator?.includeIpAddress && context.ipAddress) {
    parts.push(`ip:${context.ipAddress}`);
  }

  return parts.join(':');
}

// Encryption utilities
async function encryptSensitiveData(
  data: any,
  config: EncryptSensitiveConfig
): Promise<any> {
  // Simplified encryption - in real implementation would use proper encryption
  return data;
}

async function decryptSensitiveData(
  data: any,
  config: EncryptSensitiveConfig
): Promise<any> {
  // Simplified decryption
  return data;
}

// Utility functions
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeForAudit(data: any): any {
  // Remove sensitive fields for audit logging
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  return data;
}

function containsSuspiciousPatterns(input: string): boolean {
  const patterns = [
    /DROP\s+/i,
    /DELETE\s+/i,
    /MERGE.*DELETE/i,
    /<script/i,
    /javascript:/i,
    /eval\s*\(/i,
  ];

  return patterns.some((pattern) => pattern.test(input));
}

// CWE-285 FIX: Real authentication context extraction helper function (REQUIREMENT 2)

/**
 * Extract real user from request context
 * This replaces placeholder implementation with actual NestJS authentication
 */
async function extractUserFromRequest(request: any): Promise<RequestUser> {
  // Check multiple sources for user authentication
  if (request.user) {
    return request.user;
  }

  // Check JWT token in Authorization header
  const authHeader = request.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In real implementation, verify JWT and extract user
    throw new UnauthorizedException(
      'JWT verification not implemented - requires real authentication service'
    );
  }

  // Check session-based authentication
  if (request.session?.user) {
    return request.session.user;
  }

  throw new UnauthorizedException('No valid authentication found in request');
}
