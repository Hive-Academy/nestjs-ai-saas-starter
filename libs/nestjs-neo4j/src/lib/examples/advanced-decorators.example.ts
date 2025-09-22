/**
 * @fileoverview Advanced Neo4j Decorators Examples
 *
 * This file demonstrates the usage of Phase 5 (Security) and Phase 7 (Type Safety)
 * decorators that enhance Neo4j operations with enterprise-grade capabilities.
 *
 * These decorators complement your existing adapter architecture without competing with it.
 */

import { Injectable } from '@nestjs/common';
import {
  // Phase 7: Type Safety Decorators
  TypedCypherQuery,
  TypedQuery,
  TypedMatch,
  TypedCreate,
  FindNodeByProperty,
  TypedRelationshipQuery,

  // Phase 5: Security Decorators
  Authorize,
  ValidateInput,
  AuditLog,
  RateLimit,
  EncryptSensitive,

  //  decorator from Phase 1
  CypherQuery,

  // Base service integration
  InjectNeo4j,
  Neo4jService
} from '@hive-academy/nestjs-neo4j';

/**
 * Example entity types for type safety
 */
interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  createdAt: Date;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  settings: any;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  customerId: string;
  status: 'pending' | 'completed' | 'failed';
  sensitiveData: {
    cardNumber: string;
    cvv: string;
  };
}

/**
 * Phase 7 Example: Advanced Type Safety with Compile-Time Validation
 */
@Injectable()
export class TypeSafeUserService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  /**
   * ✅ Compile-time validated Cypher query with parameter type checking
   */
  @TypedCypherQuery({
    query: 'MATCH (u:User {id: $userId}) RETURN u.name, u.email, u.createdAt',
    compiletimeValidation: {
      strictParams: true,
      inferReturnType: true,
      validatePropertyPaths: true
    },
    runtime: {
      cache: { ttl: 300000, key: 'user-info' },
      transactionMode: 'READ'
    },
    dev: {
      showQueryInfo: true, // Development logging
      validateSchema: true
    }
  })
  async getUserInfo(params: { userId: string }): Promise<{
    name: string;
    email: string;
    createdAt: Date;
  }> {
    // Implementation provided by decorator
    // ✅ Compile-time errors if:
    // - Query syntax is invalid
    // - Parameters don't match (e.g., missing userId)
    // - Return type doesn't match query structure
    return null as any;
  }

  /**
   * ❌ This would cause compile-time errors:
   */
  /*
  @TypedCypherQuery({
    query: 'INVALID (u:User) RETURN u' // ❌ Invalid Cypher syntax
  })
  async invalidQuery() {}

  @TypedCypherQuery({
    query: 'MATCH (u:User {id: $userId, name: $userName}) RETURN u'
  })
  async missingParam(params: { userId: string }): Promise<User> {
    // ❌ Compile-time error: missing userName parameter
  }
  */

  /**
   * Type-safe node finding with property validation
   */
  @FindNodeByProperty('User', 'email', () => User)
  async findUserByEmail(params: { email: string }): Promise<User> {
    // Automatically generates: MATCH (n:User {email: $email}) RETURN n
    // With full type safety and validation
    return null as any;
  }

  /**
   * Type-safe relationship queries
   */
  @TypedRelationshipQuery('User', 'Organization', 'BELONGS_TO', {
    direction: 'OUT',
    returnType: () => ({ user: User, organization: Organization })
  })
  async getUserOrganization(params: { userId: string }): Promise<{
    user: User;
    organization: Organization;
  }> {
    return null as any;
  }

  /**
   * Simplified typed query for common patterns
   */
  @TypedMatch('MATCH (u:User) WHERE u.organizationId = $orgId RETURN u')
  async getUsersByOrganization(params: { orgId: string }): Promise<User[]> {
    return null as any;
  }

  /**
   * Type-safe CREATE operations
   */
  @TypedCreate('CREATE (u:User $userData) RETURN u', {
    compiletimeValidation: { strictParams: true }
  })
  async createUser(params: { userData: Partial<User> }): Promise<User> {
    return null as any;
  }
}

/**
 * Phase 5 Example: Enterprise Security Features
 */
@Injectable()
export class SecurePaymentService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  /**
   * Multi-layered security with authorization, validation, audit, and encryption
   */
  @Authorize({
    roles: ['payment-processor', 'admin'],
    permissions: ['payment:process', 'financial:write'],
    tenantIsolation: {
      enabled: true,
      tenantProperty: 'organizationId',
      autoInject: true // Automatically adds WHERE organizationId = $organizationId
    },
    resourceAccess: {
      resourceType: 'payment',
      actions: ['create', 'read'],
      ownershipCheck: {
        ownerProperty: 'customerId',
        allowOwnerAccess: true
      }
    }
  })
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', minimum: 0.01, maximum: 100000 },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
          customerId: { type: 'string', minLength: 1 },
          paymentMethod: {
            type: 'object',
            properties: {
              cardNumber: { type: 'string', pattern: '^[0-9]{16}$' },
              cvv: { type: 'string', pattern: '^[0-9]{3,4}$' }
            },
            required: ['cardNumber', 'cvv']
          }
        },
        required: ['amount', 'currency', 'customerId', 'paymentMethod']
      }
    },
    sanitization: {
      stripHtml: true,
      maxStringLength: 1000
    },
    injectionPrevention: {
      enabled: true,
      onDetection: 'throw'
    },
    customValidators: [{
      name: 'payment-amount-limits',
      validator: (value, context) => {
        if (value.amount > 10000 && !context.user.roles.includes('high-value-processor')) {
          return false;
        }
        return true;
      },
      message: 'High value payments require special authorization'
    }]
  })
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    includeSensitiveData: false, // Don't log card numbers
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'payment_processing',
      riskLevel: 'high',
      complianceRequired: true
    },
    storage: {
      storeInNeo4j: true,
      retentionDays: 2555 // 7 years for financial compliance
    }
  })
  @RateLimit({
    requests: 10, // 10 payments per minute
    window: '1m',
    strategy: 'sliding-window',
    keyGenerator: {
      includeUserId: true,
      includeTenantId: true
    },
    onLimitExceeded: {
      response: 'throw',
      message: 'Payment processing rate limit exceeded',
      retryAfter: 60
    }
  })
  @EncryptSensitive({
    encryptFields: ['paymentMethod.cardNumber', 'paymentMethod.cvv'],
    maskFields: ['paymentMethod.cardNumber'],
    algorithm: 'aes-256-gcm',
    auditEncryption: true
  })
  @CypherQuery({
    query: `
      CREATE (p:Payment {
        id: $id,
        amount: $amount,
        currency: $currency,
        customerId: $customerId,
        organizationId: $organizationId,
        paymentMethod: $paymentMethod,
        status: 'pending',
        createdAt: timestamp(),
        processedBy: $userId
      })
      RETURN p
    `,
    options: {
      accessMode: 'WRITE',
      cache: { enabled: false }, // Never cache payment operations
      retry: { enabled: false }   // Never retry payment operations
    }
  })
  async processPayment(paymentData: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethod: {
      cardNumber: string;
      cvv: string;
    };
  }): Promise<PaymentTransaction> {
    // This method benefits from:
    // ✅ Role-based authorization (payment-processor role required)
    // ✅ Input validation (amount limits, card format validation)
    // ✅ Automatic tenant isolation (organizationId injected)
    // ✅ Comprehensive audit logging (7-year retention)
    // ✅ Rate limiting (10 payments/minute per user per tenant)
    // ✅ Data encryption (card details encrypted before storage)
    // ✅ Compliance logging (detailed audit trail)

    return null as any;
  }

  /**
   * Rate-limited search with authorization
   */
  @Authorize({
    roles: ['payment-viewer', 'admin'],
    permissions: ['payment:read']
  })
  @RateLimit({
    requests: 100,
    window: '1m',
    strategy: 'sliding-window'
  })
  @CypherQuery({
    query: `
      MATCH (p:Payment)
      WHERE p.organizationId = $organizationId
        AND p.customerId = $customerId
      RETURN p
      ORDER BY p.createdAt DESC
      LIMIT 50
    `
  })
  async getCustomerPayments(params: {
    customerId: string;
    organizationId: string;
  }): Promise<PaymentTransaction[]> {
    return null as any;
  }
}

/**
 * Combined Example: Type Safety + Security for User Management
 */
@Injectable()
export class EnterpriseUserService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  /**
   * Combines TypeScript compile-time validation with runtime security
   */
  @TypedCypherQuery({
    query: 'MATCH (u:User {organizationId: $organizationId}) RETURN u.id, u.name, u.email, u.role',
    compiletimeValidation: {
      strictParams: true,
      inferReturnType: true
    },
    runtime: {
      cache: { ttl: 300000 },
      transactionMode: 'READ'
    }
  })
  @Authorize({
    roles: ['user-manager', 'admin'],
    tenantIsolation: {
      enabled: true,
      tenantProperty: 'organizationId',
      autoInject: true
    }
  })
  @RateLimit({
    requests: 200,
    window: '1m',
    strategy: 'sliding-window'
  })
  @AuditLog({
    enabled: true,
    logLevel: 'standard',
    customFields: { operation: 'user_listing' }
  })
  async listOrganizationUsers(params: {
    organizationId: string
  }): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>> {
    // Benefits from both type safety AND security:
    // ✅ Compile-time query validation
    // ✅ Parameter type checking
    // ✅ Return type inference
    // ✅ Role-based authorization
    // ✅ Automatic tenant isolation
    // ✅ Rate limiting protection
    // ✅ Audit trail logging
    return null as any;
  }

  /**
   * Secure user creation with comprehensive validation
   */
  @TypedCreate('CREATE (u:User $userData) RETURN u', {
    compiletimeValidation: { strictParams: true }
  })
  @Authorize({
    roles: ['user-manager', 'admin'],
    permissions: ['user:create']
  })
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          userData: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              name: { type: 'string', minLength: 2, maxLength: 100 },
              role: { type: 'string', enum: ['user', 'manager', 'admin'] }
            },
            required: ['email', 'name', 'role']
          }
        },
        required: ['userData']
      }
    },
    injectionPrevention: { enabled: true, onDetection: 'throw' }
  })
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    customFields: { operation: 'user_creation', riskLevel: 'medium' }
  })
  @RateLimit({
    requests: 20,
    window: '1h', // Limit user creation to 20 per hour
    strategy: 'fixed-window'
  })
  async createUser(params: {
    userData: {
      email: string;
      name: string;
      role: 'user' | 'manager' | 'admin';
      organizationId: string;
    };
  }): Promise<User> {
    return null as any;
  }
}

/**
 * Example Integration with Your Existing Adapter Pattern
 */
@Injectable()
export class AdapterIntegratedService {
  constructor(
    @InjectNeo4j() private neo4j: Neo4jService,
    // Your existing adapters continue to work unchanged
    private hitlAdapter: any, // Your Neo4jHitlStorageAdapter
    private memoryAdapter: any // Your Neo4jGraphAdapter
  ) {}

  /**
   * Example showing how decorators enhance operations while adapters handle data
   */
  @TypedCypherQuery({
    query: 'MATCH (u:User {id: $userId})-[:BELONGS_TO]->(org:Organization) RETURN u, org',
    compiletimeValidation: { strictParams: true }
  })
  @Authorize({ roles: ['user'], tenantIsolation: { enabled: true } })
  @AuditLog({ enabled: true, logLevel: 'standard' })
  async getUserWithOrganization(params: { userId: string }): Promise<{
    user: User;
    organization: Organization;
  }> {
    // Decorators provide:
    // - Compile-time type safety
    // - Runtime authorization
    // - Audit logging
    // - Parameter validation

    // Your adapters continue to handle:
    // - Integration with LangGraph modules
    // - Memory relationship management
    // - HITL workflow storage
    // - Cross-module data consistency

    return null as any;
  }

  /**
   * Example of decorator working alongside adapter operations
   */
  async complexWorkflow(userId: string): Promise<void> {
    // 1. Use decorated method for type-safe, secure query
    const userInfo = await this.getUserWithOrganization({ userId });

    // 2. Use existing memory adapter for LangGraph integration
    await this.memoryAdapter.createMemoryEntry({
      agentId: userId,
      content: { userAccess: userInfo },
      context: { operation: 'user-lookup' }
    });

    // 3. Use existing HITL adapter for approval workflows
    await this.hitlAdapter.storeApprovalRequest({
      id: `user-access-${userId}`,
      type: 'user_data_access',
      data: userInfo,
      status: 'pending'
    });

    // Perfect harmony: decorators add capabilities, adapters handle integration
  }
}

/**
 * Example Usage in Your Application
 */
export class UsageExamples {
  static readonly examples = {
    /**
     * Phase 7 Benefits: Compile-Time Safety
     */
    typeSafety: `
      // ✅ Catches errors at build time, not runtime
      @TypedCypherQuery({
        query: 'MATCH (u:User {id: $userId}) RETURN u'
      })
      async findUser(params: { userId: string }) {
        // TypeScript ensures parameter match
        // IntelliSense provides property completion
        // Compile-time validation prevents errors
      }
    `,

    /**
     * Phase 5 Benefits: Enterprise Security
     */
    security: `
      // ✅ Comprehensive security layers
      @Authorize({ roles: ['admin'] })
      @ValidateInput({ injectionPrevention: { enabled: true } })
      @AuditLog({ enabled: true, logLevel: 'detailed' })
      @RateLimit({ requests: 10, window: '1m' })
      async sensitiveOperation() {
        // Automatic authorization checks
        // Input sanitization and validation
        // Comprehensive audit logging
        // Rate limiting protection
      }
    `,

    /**
     * Integration with Your Existing Architecture
     */
    integration: `
      // ✅ Decorators enhance, adapters integrate
      class MyService {
        constructor(
          private neo4j: Neo4jService,
          private hitlAdapter: Neo4jHitlStorageAdapter,    // Unchanged
          private memoryAdapter: Neo4jGraphAdapter         // Unchanged
        ) {}

        @TypedCypherQuery({ /* type safety */ })
        @Authorize({ /* security */ })
        @AuditLog({ /* compliance */ })
        async myMethod() {
          // Decorators provide type safety + security
          // Adapters handle LangGraph integration
          // No competing systems - perfect harmony
        }
      }
    `
  };
}

/**
 * Performance and Compatibility Notes
 */
export namespace PerformanceNotes {
  export const typeSystem = {
    impact: 'Zero runtime overhead - all validation happens at compile time',
    benefits: [
      'Catches errors before deployment',
      'Better IDE support with IntelliSense',
      'Self-documenting APIs',
      'Refactoring safety'
    ]
  };

  export const security = {
    impact: 'Minimal runtime overhead - efficient authorization caching',
    benefits: [
      'Enterprise-grade security',
      'Compliance audit trails',
      'Rate limiting protection',
      'Input validation and sanitization'
    ]
  };

  export const compatibility = {
    adapters: 'Full backward compatibility with existing adapter pattern',
    langgraph: 'Zero impact on LangGraph module integrations',
    migration: 'Gradual adoption - can be added incrementally'
  };
}
