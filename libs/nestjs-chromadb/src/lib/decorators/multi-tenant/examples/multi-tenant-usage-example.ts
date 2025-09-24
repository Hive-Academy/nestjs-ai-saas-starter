/**
 * @fileoverview Multi-Tenant ChromaDB Usage Examples
 *
 * This file demonstrates comprehensive usage patterns for multi-tenant ChromaDB operations,
 * showcasing tenant isolation, security policies, and enterprise-grade features.
 */

import { Controller, Injectable } from '@nestjs/common';
import { ChromaDBService } from '../../../services/chromadb.service';
import {
  BaseDocument,
  toChromaWireDocument,
} from '../../../types/core.interface';
import {
  MultiTenantService,
  TenantAwareRepository,
  TenantContext,
  TenantIsolationConfig,
  TenantRegistration,
} from '../index';

// =====================================================================
// Document Type Definitions
// =====================================================================

export type UserDocument = BaseDocument<{
  name: string;
  email: string;
  role: 'user' | 'admin' | 'manager';
  department: string;
  createdAt: string;
}>;

export type DocumentMetadata = BaseDocument<{
  title: string;
  author: string;
  category: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  tags: string[];
}>;

// =====================================================================
// Basic Tenant-Aware Service
// =====================================================================

@Injectable()
export class UserManagementService {
  constructor(private readonly chromaService: ChromaDBService) {}

  /**
   * Search users within tenant with automatic collection prefixing
   * Collection automatically becomes: 'tenant_{tenantId}_users'
   *
   * @example Usage with TenantAware decorator:
   * @TenantAware(
   *   {
   *     namingStrategy: 'prefix',
   *     tenantExtraction: 'header',
   *     enableTenantCaching: true,
   *     enableAuditLog: true,
   *     strictValidation: true,
   *   },
   *   {
   *     skipTenantValidation: false,
   *     allowCrossTenant: false,
   *   }
   * )
   */
  async searchUsers(query: string, limit = 10): Promise<UserDocument[]> {
    return this.chromaService.searchDocuments('users', [query], undefined, {
      nResults: limit,
      includeMetadata: true,
    }) as any; // Type would be properly handled in real implementation
  }

  /**
   * Create user with automatic tenant metadata enrichment
   *
   * @example Usage with TenantAware decorator:
   * @TenantAware(
   *   {
   *     namingStrategy: 'prefix',
   *     tenantExtraction: 'header',
   *     enableAuditLog: true,
   *   },
   *   {
   *     skipTenantValidation: false,
   *   }
   * )
   */
  async createUser(userData: Omit<UserDocument, 'id'>): Promise<UserDocument> {
    const enrichedUser: UserDocument = {
      ...userData,
      id: `user_${Date.now()}`,
      metadata: {
        ...userData.metadata,
        createdAt: new Date().toISOString(),
      },
    };

    // Convert to wire format for ChromaDB with metadata normalization
    const wireDoc = toChromaWireDocument(enrichedUser);
    await this.chromaService.addDocuments('users', [wireDoc]);
    return enrichedUser;
  }

  /**
   * Batch user operations with tenant isolation
   *
   * @example Usage with TenantAware decorator:
   * @TenantAware(
   *   {
   *     namingStrategy: 'separate',
   *     tenantExtraction: 'jwt',
   *     enableTenantCaching: true,
   *   },
   *   {
   *     skipTenantValidation: false,
   *   }
   * )
   */
  async batchCreateUsers(
    users: Omit<UserDocument, 'id'>[]
  ): Promise<UserDocument[]> {
    const enrichedUsers: UserDocument[] = users.map((user, index) => ({
      ...user,
      id: `user_${Date.now()}_${index}`,
      metadata: {
        ...user.metadata,
        createdAt: new Date().toISOString(),
      },
    }));

    // Convert to wire format for ChromaDB with metadata normalization
    const wireDocs = enrichedUsers.map(toChromaWireDocument);
    await this.chromaService.addDocuments('users', wireDocs, { batchSize: 50 });
    return enrichedUsers;
  }
}

// =====================================================================
// Document Management with Advanced Security
// =====================================================================

@Injectable()
export class DocumentManagementService {
  constructor(private readonly chromaService: ChromaDBService) {}

  /**
   * Search documents with classification-based filtering
   * Collection: '{tenantId}:documents'
   *
   * @example Usage with TenantAware decorator:
   * @TenantAware(
   *   {
   *     namingStrategy: 'separate',
   *     tenantExtraction: 'jwt',
   *     enableTenantCaching: true,
   *     cacheTtl: 600000, // 10 minutes
   *     enableAuditLog: true,
   *   },
   *   {
   *     skipTenantValidation: false,
   *   }
   * )
   */
  async searchDocuments(
    query: string,
    classification?: 'public' | 'internal' | 'confidential' | 'restricted'
  ): Promise<DocumentMetadata[]> {
    const searchOptions: any = {
      nResults: 20,
      includeMetadata: true,
      includeDistances: true,
    };

    // Add classification filter if specified
    if (classification) {
      searchOptions.where = { classification };
    }

    return this.chromaService.searchDocuments(
      'documents',
      [query],
      undefined,
      searchOptions
    ) as any;
  }

  /**
   * Create document with automatic classification validation
   *
   * @example Usage with TenantAware decorator:
   * @TenantAware(
   *   {
   *     namingStrategy: 'separate',
   *     tenantExtraction: 'jwt',
   *     strictValidation: true,
   *     enableAuditLog: true,
   *   },
   *   {
   *     skipTenantValidation: false,
   *   }
   * )
   */
  async createDocument(
    document: Omit<DocumentMetadata, 'id'>
  ): Promise<DocumentMetadata> {
    // Validate classification level based on tenant permissions
    await this.validateDocumentClassification(document.metadata.classification);

    const enrichedDocument: DocumentMetadata = {
      ...document,
      id: `doc_${Date.now()}`,
      metadata: {
        ...document.metadata,
        // createdBy: 'current-user', // Would come from JWT in real implementation
      },
    };

    // Convert to wire format for ChromaDB with metadata normalization
    const wireDoc = toChromaWireDocument(enrichedDocument);
    await this.chromaService.addDocuments('documents', [wireDoc]);
    return enrichedDocument;
  }

  private async validateDocumentClassification(
    classification: string
  ): Promise<void> {
    // In real implementation, this would check user permissions
    if (classification === 'restricted') {
      throw new Error(
        'Insufficient permissions to create restricted documents'
      );
    }
  }
}

// =====================================================================
// Administrative Cross-Tenant Operations
// =====================================================================

@Injectable()
export class AdminService {
  constructor(private readonly multiTenantService: MultiTenantService) {}

  /**
   * Create tenant collection
   */
  async createTenantCollection(
    tenantId: string,
    baseCollection: string,
    metadata: Record<string, unknown> = {}
  ): Promise<any> {
    const tenantContext: TenantContext = {
      tenantId,
      tier: 'enterprise',
    };
    return this.multiTenantService.createTenantCollection(
      tenantContext,
      baseCollection,
      metadata
    );
  }

  /**
   * Search across multiple tenants (admin operation)
   */
  async searchAcrossTenants(
    adminTenantId: string,
    query: string,
    baseCollection: string,
    tenantIds: string[]
  ): Promise<any[]> {
    const adminContext: TenantContext = {
      tenantId: adminTenantId,
      tier: 'enterprise',
    };
    return this.multiTenantService.searchAcrossTenants(
      adminContext,
      query,
      baseCollection,
      tenantIds
    );
  }

  /**
   * Create tenant registration example (simplified)
   */
  createTenantRegistration(
    tenantId: string,
    config?: Partial<TenantRegistration>
  ): TenantRegistration {
    const now = new Date();
    const registration: TenantRegistration = {
      tenantId,
      name: `Tenant ${tenantId}`,
      status: 'active',
      tier: 'pro',
      resourceLimits: {
        maxCollections: 100,
        maxDocumentsPerCollection: 10000,
        maxTotalDocuments: 100000,
        maxStorageBytes: 1024 * 1024 * 1024, // 1GB
        maxRequestsPerMinute: 1000,
        maxConcurrentOperations: 10,
        maxEmbeddingOperationsPerDay: 10000,
      },
      securityPolicies: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
      collections: [],
      ...config,
    };
    return registration;
  }

  /**
   * Cleanup tenant resources
   */
  async cleanupTenant(adminTenantId: string, tenantId: string): Promise<void> {
    const adminContext: TenantContext = {
      tenantId: adminTenantId,
      tier: 'enterprise',
    };
    await this.multiTenantService.deleteTenant(adminContext, tenantId);
  }
}

// =====================================================================
// Tenant-Aware Repository Pattern
// =====================================================================

export class UserRepository extends TenantAwareRepository<UserDocument> {
  constructor(private readonly chromaService: ChromaDBService) {
    super();
  }

  /**
   * Find users by department with tenant isolation
   */
  async findByDepartment(department: string): Promise<UserDocument[]> {
    const collection = this.getTenantCollection('users');

    return this.chromaService.getDocuments(collection, {
      where: { department },
      includeMetadata: true,
    }) as any;
  }

  /**
   * Create user with tenant validation
   */
  async createUser(userData: Omit<UserDocument, 'id'>): Promise<UserDocument> {
    const enrichedUser = this.enrichDocumentWithTenant(userData);
    this.validateTenantAccess(enrichedUser);

    const collection = this.getTenantCollection('users');
    // Convert to wire format and add to ChromaDB
    const wireDoc = toChromaWireDocument(enrichedUser);
    await this.chromaService.addDocuments(collection, [wireDoc]);

    return enrichedUser;
  }

  /**
   * Search similar users within tenant
   */
  async findSimilarUsers(
    user: UserDocument,
    limit = 5
  ): Promise<UserDocument[]> {
    this.validateTenantAccess(user);

    const collection = this.getTenantCollection('users');
    const query = `${user.metadata.name} ${user.metadata.department} ${user.metadata.role}`;

    return this.chromaService.searchDocuments(collection, [query], undefined, {
      nResults: limit,
      where: { id: { $ne: user.id } }, // Exclude the user itself
    }) as any;
  }
}

// =====================================================================
// REST API Controller with Multi-Tenancy
// =====================================================================

@Controller('api/users')
export class UserController {
  constructor(
    private readonly userService: UserManagementService,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Search users endpoint with tenant context from headers
   * Headers: { 'x-tenant-id': 'company-123' }
   *
   * @example Usage with decorators:
   * @Get('search')
   * async searchUsers(
   *   @Headers('x-tenant-id') tenantId: string,
   *   @Headers('query') query: string
   * )
   */
  async searchUsers(tenantId: string, query: string): Promise<UserDocument[]> {
    // Tenant context is automatically extracted by @TenantAware decorator
    return this.userService.searchUsers(query, 10);
  }

  /**
   * Create user with tenant validation
   *
   * @example Usage with decorators:
   * @Post()
   * async createUser(
   *   @Headers('x-tenant-id') tenantId: string,
   *   @Body() userData: Omit<UserDocument, 'id'>
   * )
   */
  async createUser(
    tenantId: string,
    userData: Omit<UserDocument, 'id'>
  ): Promise<UserDocument> {
    // Set tenant context for repository
    this.userRepository.setTenantContext({
      tenantId,
      tier: 'pro', // Would come from JWT in real implementation
    });

    return this.userRepository.createUser(userData);
  }

  /**
   * Find similar users within tenant
   *
   * @example Usage with decorators:
   * @Post('similar')
   * async findSimilarUsers(
   *   @Headers('x-tenant-id') tenantId: string,
   *   @Body() user: UserDocument
   * )
   */
  async findSimilarUsers(
    tenantId: string,
    user: UserDocument
  ): Promise<UserDocument[]> {
    this.userRepository.setTenantContext({
      tenantId,
      tier: 'pro',
    });

    return this.userRepository.findSimilarUsers(user);
  }
}

// =====================================================================
// Configuration Examples
// =====================================================================

/**
 * Basic tenant configuration for small businesses
 */
export const BASIC_TENANT_CONFIG: TenantIsolationConfig = {
  namingStrategy: 'prefix',
  tenantExtraction: 'header',
  strictValidation: false,
  enableTenantCaching: true,
  cacheTtl: 300000, // 5 minutes
  enableAuditLog: false,
  defaultTenant: 'default',
  allowCrossTenant: false,
};

/**
 * Enterprise tenant configuration with full security
 */
export const ENTERPRISE_TENANT_CONFIG: TenantIsolationConfig = {
  namingStrategy: 'separate',
  tenantExtraction: 'jwt',
  strictValidation: true,
  enableTenantCaching: true,
  cacheTtl: 600000, // 10 minutes
  enableAuditLog: true,
  allowCrossTenant: false, // Disabled by default, enabled only for admin operations
};

/**
 * Custom tenant extraction example
 */
export const CUSTOM_TENANT_CONFIG: TenantIsolationConfig = {
  namingStrategy: 'custom',
  customNaming: (collection: string, tenantId: string) => {
    // Custom naming: environment_tenant_collection
    const env = process.env.NODE_ENV || 'dev';
    return `${env}_${tenantId}_${collection}`;
  },
  tenantExtraction: 'custom',
  customExtraction: async (context) => {
    // Extract tenant from custom logic
    const request = context.switchToHttp().getRequest();
    const subdomain = request.headers.host?.split('.')[0];

    if (!subdomain) {
      throw new Error('Tenant subdomain not found');
    }

    return subdomain;
  },
  strictValidation: true,
  enableTenantCaching: true,
  enableAuditLog: true,
};

// =====================================================================
// Usage Summary
// =====================================================================

/**
 * Multi-Tenant ChromaDB Usage Summary:
 *
 * 1. **@TenantAware Decorator**:
 *    - Automatic collection name transformation based on tenant ID
 *    - Multiple naming strategies (prefix, suffix, separate, custom)
 *    - Flexible tenant extraction (header, query, JWT, custom)
 *    - Intelligent caching with tenant isolation
 *    - Comprehensive audit logging
 *
 * 2. **@CrossTenant Decorator**:
 *    - Admin operations across multiple tenants
 *    - Permission-based access control
 *    - Enhanced audit logging for compliance
 *    - Resource limits and safety controls
 *
 * 3. **TenantAwareRepository**:
 *    - Base class for tenant-isolated repositories
 *    - Automatic tenant validation
 *    - Tenant metadata enrichment
 *    - Type-safe operations with tenant context
 *
 * 4. **MultiTenantChromaService**:
 *    - Enterprise-grade multi-tenancy management
 *    - Tenant registry and lifecycle management
 *    - Resource limits and security policies
 *    - Cross-tenant administrative operations
 *
 * 5. **Security Features**:
 *    - Data isolation by tenant
 *    - Role-based access control
 *    - Compliance with GDPR, HIPAA, SOC2
 *    - Encryption and audit logging
 *    - Data residency requirements
 *
 * 6. **Performance Features**:
 *    - Tenant-aware caching
 *    - Resource monitoring and limits
 *    - Optimized collection strategies
 *    - Background cache refresh
 *
 * This implementation provides enterprise-grade multi-tenancy for ChromaDB
 * with zero configuration required for basic use cases, while offering
 * extensive customization for complex enterprise requirements.
 */
