/**
 * @fileoverview Input Validation Security Examples (Phase 5A)
 * 
 * Comprehensive examples demonstrating enterprise-grade input validation and sanitization
 * with the @ValidateInput decorator for schema validation, injection prevention, and custom validation.
 * 
 * Features demonstrated:
 * - JSON Schema validation
 * - Cypher injection prevention
 * - HTML sanitization and XSS protection
 * - Custom business logic validation
 * - Real-world security scenarios
 * 
 * Target: Enterprise customers requiring bulletproof input security
 */

import { Injectable, Logger } from '@nestjs/common';
import { ValidateInput, ValidateInputConfig } from '../../decorators/security.decorators';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { Repository } from '../../decorators/index';
import type { BaseEntity } from '../../types/neo4j-types';

/**
 * User Registration DTO with validation
 */
interface UserRegistrationDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  organizationId: string;
}

/**
 * Financial Transaction DTO
 */
interface FinancialTransactionDto {
  amount: number;
  currency: string;
  description: string;
  accountFrom: string;
  accountTo: string;
  reference?: string;
  metadata?: Record<string, any>;
}

/**
 * Document Upload DTO
 */
interface DocumentUploadDto {
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'secret';
  ownerId: string;
}

/**
 * Search Query DTO
 */
interface SearchQueryDto {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * EXAMPLE 1: BASIC JSON SCHEMA VALIDATION
 * 
 * Demonstrates comprehensive schema validation for user registration
 */
@Injectable()
@Repository(() => ({ username: '', email: '', firstName: '', lastName: '', organizationId: '' } as BaseEntity & UserRegistrationDto))
export class BasicValidationService {
  private readonly logger = new Logger(BasicValidationService.name);

  /**
   * User registration with comprehensive validation
   */
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9_]+$' // Alphanumeric and underscore only
          },
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255
          },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 128,
            // Strong password requirements
            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+'
          },
          firstName: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            pattern: '^[a-zA-Z\\s\\-\']+$' // Letters, spaces, hyphens, apostrophes
          },
          lastName: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            pattern: '^[a-zA-Z\\s\\-\']+$'
          },
          phone: {
            type: 'string',
            pattern: '^\\+?[1-9]\\d{1,14}$', // E.164 format
            nullable: true
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            nullable: true
          },
          organizationId: {
            type: 'string',
            format: 'uuid'
          }
        },
        required: ['username', 'email', 'password', 'firstName', 'lastName', 'organizationId'],
        additionalProperties: false
      },
      validatePropertyTypes: true
    },
    sanitization: {
      stripHtml: true,
      escapeSpecialChars: true,
      maxStringLength: 1000,
      allowedCharsPattern: /^[a-zA-Z0-9\s@$!%*?&._\-']+$/
    },
    injectionPrevention: {
      enabled: true,
      onDetection: 'throw'
    }
  })
  async registerUser(userData: UserRegistrationDto): Promise<any> {
    this.logger.log(`Registering user: ${userData.username}`);
    // Input is fully validated and sanitized before reaching this point
    const newUser = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.create(newUser);
  }

  /**
   * Financial transaction with strict numeric validation
   */
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 1000000,
            multipleOf: 0.01 // Ensures proper decimal precision
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'], // ISO 4217 subset
            minLength: 3,
            maxLength: 3
          },
          description: {
            type: 'string',
            minLength: 5,
            maxLength: 500
          },
          accountFrom: {
            type: 'string',
            format: 'uuid'
          },
          accountTo: {
            type: 'string',
            format: 'uuid'
          },
          reference: {
            type: 'string',
            maxLength: 100,
            nullable: true
          },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true
          }
        },
        required: ['amount', 'currency', 'description', 'accountFrom', 'accountTo']
      }
    },
    injectionPrevention: {
      enabled: true,
      suspiciousPatterns: [
        /\$\{.*\}/i,           // Template injection
        /javascript:/i,         // JavaScript protocol
        /data:/i,              // Data protocol
        /vbscript:/i,          // VBScript protocol
        /file:/i               // File protocol
      ],
      onDetection: 'throw'
    }
  })
  @CypherQuery({
    query: `
      CREATE (t:Transaction {
        id: $id,
        amount: $amount,
        currency: $currency,
        description: $description,
        accountFrom: $accountFrom,
        accountTo: $accountTo,
        reference: $reference,
        metadata: $metadata,
        createdAt: datetime(),
        status: 'pending'
      })
      RETURN t
    `,
    mode: 'WRITE',
    description: 'Create financial transaction with validation'
  })
  async createTransaction(transactionData: FinancialTransactionDto): Promise<any> {
    this.logger.log(`Creating transaction: ${transactionData.amount} ${transactionData.currency}`);
    return {};
  }
}

/**
 * EXAMPLE 2: CYPHER INJECTION PREVENTION
 * 
 * Advanced protection against Cypher query injection attacks
 */
@Injectable()
@Repository(() => ({ name: '', description: '', properties: {} } as BaseEntity & { name: string; description: string; properties: Record<string, any> }))
export class CypherInjectionPreventionService {
  private readonly logger = new Logger(CypherInjectionPreventionService.name);

  /**
   * Search with comprehensive injection prevention
   */
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            minLength: 1,
            maxLength: 500
          },
          filters: {
            type: 'object',
            nullable: true,
            additionalProperties: {
              type: ['string', 'number', 'boolean']
            }
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'createdAt', 'updatedAt', 'relevance'],
            nullable: true
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            nullable: true
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            nullable: true
          },
          offset: {
            type: 'integer',
            minimum: 0,
            nullable: true
          }
        },
        required: ['query']
      }
    },
    sanitization: {
      stripHtml: true,
      escapeSpecialChars: true,
      maxStringLength: 500
    },
    injectionPrevention: {
      enabled: true,
      suspiciousPatterns: [
        // Cypher-specific injection patterns
        /DROP\s+/i,
        /DELETE\s+/i,
        /CREATE\s+/i,
        /MERGE\s+/i,
        /SET\s+/i,
        /REMOVE\s+/i,
        /DETACH\s+DELETE/i,
        /CALL\s+/i,
        /LOAD\s+CSV/i,
        /UNWIND\s+/i,
        
        // Neo4j procedure calls
        /apoc\./i,
        /dbms\./i,
        /db\./i,
        
        // Parameter manipulation
        /\$[a-zA-Z0-9_]+\s*[=><]/i,
        
        // Comment injection
        /\/\*/,
        /\/\//,
        
        // Union-style attacks
        /UNION\s+/i,
        
        // Administrative functions
        /SHOW\s+/i,
        /ALTER\s+/i,
        /DENY\s+/i,
        /GRANT\s+/i,
        /REVOKE\s+/i
      ],
      onDetection: 'throw'
    },
    customValidators: [
      {
        name: 'cypherSafeQuery',
        validator: (value: any) => {
          if (typeof value.query !== 'string') return false;
          
          // Additional custom checks for Cypher safety
          const query = value.query.toLowerCase();
          
          // Ensure no dangerous keywords in query
          const dangerousKeywords = [
            'drop', 'delete', 'create', 'merge', 'set', 'remove',
            'detach', 'call', 'load', 'unwind', 'union'
          ];
          
          return !dangerousKeywords.some(keyword => 
            query.includes(keyword.toLowerCase())
          );
        },
        message: 'Query contains potentially dangerous Cypher keywords'
      }
    ]
  })
  @CypherQuery({
    query: `
      MATCH (n)
      WHERE n.name CONTAINS $query
      AND ($filters IS NULL OR all(key IN keys($filters) WHERE n[key] = $filters[key]))
      RETURN n
      ORDER BY 
        CASE WHEN $sortBy = 'name' THEN n.name END ASC,
        CASE WHEN $sortBy = 'createdAt' THEN n.createdAt END DESC
      SKIP $offset
      LIMIT $limit
    `,
    mode: 'READ',
    description: 'Safe search with injection prevention'
  })
  async safeSearch(searchData: SearchQueryDto): Promise<any[]> {
    this.logger.log(`Safe search for: ${searchData.query}`);
    return [];
  }

  /**
   * Dynamic property update with injection protection
   */
  @ValidateInput({
    injectionPrevention: {
      enabled: true,
      suspiciousPatterns: [
        // Property manipulation attacks
        /\.\s*[a-zA-Z_]\w*\s*[=><]/i,
        /\[\s*['"][^'"]*['"]\s*\]\s*=/i,
        
        // Function injection
        /\w+\s*\(/i,
        
        // Neo4j internal properties
        /^(_|__)/,
        /id\s*\(/i,
        /labels\s*\(/i,
        /type\s*\(/i,
        /keys\s*\(/i,
        /properties\s*\(/i
      ],
      onDetection: 'sanitize' // Sanitize instead of throwing for property updates
    },
    customValidators: [
      {
        name: 'safePropertyNames',
        validator: (value: any) => {
          if (value.updates && typeof value.updates === 'object') {
            // Ensure all property names are safe
            const propertyNames = Object.keys(value.updates);
            return propertyNames.every(name => 
              /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) && // Valid identifier
              !name.startsWith('_') && // No internal properties
              name.length <= 50 // Reasonable length limit
            );
          }
          return true;
        },
        message: 'Property names must be valid identifiers'
      }
    ]
  })
  async updateEntityProperties(entityId: string, updates: Record<string, any>): Promise<any> {
    this.logger.log(`Updating entity ${entityId} with safe property validation`);
    const result = await this.update(entityId, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    if (!result) {
      throw new Error(`Entity ${entityId} not found`);
    }
    return result;
  }
}

/**
 * EXAMPLE 3: CUSTOM BUSINESS VALIDATION
 * 
 * Complex business logic validation with custom validators
 */
@Injectable()
@Repository(() => ({ name: '', description: '', properties: {} } as BaseEntity & { name: string; description: string; properties: Record<string, any> }))
export class BusinessValidationService {
  private readonly logger = new Logger(BusinessValidationService.name);

  /**
   * Document upload with business logic validation
   */
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 5,
            maxLength: 200
          },
          content: {
            type: 'string',
            minLength: 10,
            maxLength: 100000
          },
          category: {
            type: 'string',
            enum: ['financial', 'legal', 'hr', 'technical', 'marketing', 'operations']
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              pattern: '^[a-zA-Z0-9_-]+$'
            },
            maxItems: 10,
            uniqueItems: true
          },
          confidentialityLevel: {
            type: 'string',
            enum: ['public', 'internal', 'confidential', 'secret']
          },
          ownerId: {
            type: 'string',
            format: 'uuid'
          }
        },
        required: ['title', 'content', 'category', 'confidentialityLevel', 'ownerId']
      }
    },
    sanitization: {
      stripHtml: true, // Remove HTML tags for security
      escapeSpecialChars: false, // Keep special chars for document content
      maxStringLength: 100000
    },
    customValidators: [
      {
        name: 'businessCategoryValidation',
        validator: async (value: any, context: any) => {
          const { category, confidentialityLevel } = value;
          
          // Business rule: Financial documents must be at least 'internal'
          if (category === 'financial' && confidentialityLevel === 'public') {
            return false;
          }
          
          // Business rule: Legal documents must be 'confidential' or higher
          if (category === 'legal' && !['confidential', 'secret'].includes(confidentialityLevel)) {
            return false;
          }
          
          // Business rule: HR documents must be at least 'internal'
          if (category === 'hr' && confidentialityLevel === 'public') {
            return false;
          }
          
          return true;
        },
        message: 'Document category and confidentiality level combination is not allowed'
      },
      {
        name: 'contentSecurityValidation',
        validator: async (value: any) => {
          const { content } = value;
          
          // Check for potential sensitive information patterns
          const sensitivePatterns = [
            /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,  // Credit card patterns
            /\b\d{3}-\d{2}-\d{4}\b/,                       // SSN patterns
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email patterns in sensitive docs
            /password\s*[:=]\s*\S+/i,                      // Password patterns
            /api[_\s]*key\s*[:=]\s*\S+/i,                 // API key patterns
            /secret\s*[:=]\s*\S+/i,                        // Secret patterns
            /token\s*[:=]\s*\S+/i                          // Token patterns
          ];
          
          const hasSensitiveData = sensitivePatterns.some(pattern => pattern.test(content));
          
          // If sensitive data detected, require higher confidentiality
          if (hasSensitiveData && !['confidential', 'secret'].includes(value.confidentialityLevel)) {
            return false;
          }
          
          return true;
        },
        message: 'Content contains sensitive information requiring higher confidentiality level'
      },
      {
        name: 'ownershipValidation',
        validator: async (value: any, context: any) => {
          const { ownerId } = value;
          
          // Validate owner exists and is active (simplified for example)
          // In real implementation, would check database
          if (!ownerId || ownerId.length !== 36) { // UUID length check
            return false;
          }
          
          // Additional business logic: Check if user can own documents of this category
          const userRole = context?.roles?.[0];
          const category = value.category;
          
          const categoryPermissions = {
            'financial': ['financial_manager', 'admin'],
            'legal': ['legal_counsel', 'admin'],
            'hr': ['hr_manager', 'admin'],
            'technical': ['developer', 'tech_lead', 'admin'],
            'marketing': ['marketing_manager', 'admin'],
            'operations': ['operations_manager', 'admin']
          };
          
          const allowedRoles = categoryPermissions[category as keyof typeof categoryPermissions] || [];
          return allowedRoles.includes(userRole) || userRole === 'admin';
        },
        message: 'User does not have permission to create documents in this category'
      }
    ]
  })
  async uploadDocument(documentData: DocumentUploadDto): Promise<any> {
    this.logger.log(`Uploading document: ${documentData.title}`);
    // All business validations passed
    const newDocument = {
      ...documentData,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.create(newDocument);
  }

  /**
   * Financial approval workflow with complex validation
   */
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            minimum: 0,
            maximum: 10000000
          },
          purpose: {
            type: 'string',
            minLength: 10,
            maxLength: 500
          },
          departmentId: {
            type: 'string',
            format: 'uuid'
          },
          requesterId: {
            type: 'string',
            format: 'uuid'
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical']
          },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                filename: { type: 'string', maxLength: 255 },
                size: { type: 'number', maximum: 10000000 }, // 10MB max
                type: { type: 'string', enum: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg'] }
              },
              required: ['filename', 'size', 'type']
            },
            maxItems: 5
          }
        },
        required: ['amount', 'purpose', 'departmentId', 'requesterId', 'urgency']
      }
    },
    customValidators: [
      {
        name: 'approvalWorkflowValidation',
        validator: async (value: any, context: any) => {
          const { amount, urgency, departmentId } = value;
          const userRole = context?.roles?.[0];
          
          // Multi-level approval requirements based on amount
          if (amount > 10000 && !['manager', 'director', 'admin'].includes(userRole)) {
            return false; // Requires manager approval for >$10k
          }
          
          if (amount > 50000 && !['director', 'admin'].includes(userRole)) {
            return false; // Requires director approval for >$50k
          }
          
          if (amount > 100000 && userRole !== 'admin') {
            return false; // Requires admin approval for >$100k
          }
          
          // Critical urgency requires special authorization
          if (urgency === 'critical' && !context?.emergencyAuthorized) {
            return false;
          }
          
          return true;
        },
        message: 'User does not have sufficient authorization for this approval request'
      },
      {
        name: 'departmentBudgetValidation',
        validator: async (value: any) => {
          const { amount, departmentId } = value;
          
          // Simplified budget check (in real implementation, would query database)
          const departmentBudgets = {
            'dept_001': 50000,
            'dept_002': 100000,
            'dept_003': 25000
          };
          
          const availableBudget = departmentBudgets[departmentId as keyof typeof departmentBudgets] || 0;
          return amount <= availableBudget;
        },
        message: 'Request amount exceeds available department budget'
      }
    ]
  })
  @CypherQuery({
    query: `
      CREATE (a:ApprovalRequest {
        id: $id,
        amount: $amount,
        purpose: $purpose,
        departmentId: $departmentId,
        requesterId: $requesterId,
        urgency: $urgency,
        status: 'pending',
        createdAt: datetime(),
        attachments: $attachments
      })
      RETURN a
    `,
    mode: 'WRITE',
    description: 'Create financial approval request with validation'
  })
  async createApprovalRequest(requestData: any): Promise<any> {
    this.logger.log(`Creating approval request for amount: ${requestData.amount}`);
    return {};
  }
}

/**
 * EXAMPLE 4: FILE UPLOAD VALIDATION
 * 
 * Secure file upload validation with type and content checking
 */
@Injectable()
@Repository(() => ({ title: '', content: '', category: '', confidentialityLevel: 'public', ownerId: '' } as BaseEntity & DocumentUploadDto))
export class FileUploadValidationService {
  private readonly logger = new Logger(FileUploadValidationService.name);

  /**
   * Secure file upload with comprehensive validation
   */
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            pattern: '^[a-zA-Z0-9._-]+$' // Safe filename characters only
          },
          size: {
            type: 'number',
            minimum: 1,
            maximum: 50000000 // 50MB max
          },
          mimeType: {
            type: 'string',
            enum: [
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'image/png',
              'image/jpeg',
              'text/plain'
            ]
          },
          content: {
            type: 'string', // Base64 encoded content
            pattern: '^[A-Za-z0-9+/]*={0,2}$' // Valid base64 pattern
          },
          uploadPath: {
            type: 'string',
            pattern: '^[a-zA-Z0-9/._-]+$' // Safe path characters
          },
          metadata: {
            type: 'object',
            properties: {
              description: { type: 'string', maxLength: 500 },
              category: { type: 'string', maxLength: 100 },
              tags: {
                type: 'array',
                items: { type: 'string', maxLength: 50 },
                maxItems: 10
              }
            }
          }
        },
        required: ['filename', 'size', 'mimeType', 'content', 'uploadPath']
      }
    },
    sanitization: {
      stripHtml: true,
      escapeSpecialChars: true,
      maxStringLength: 100000000 // Large for file content
    },
    customValidators: [
      {
        name: 'fileExtensionValidation',
        validator: (value: any) => {
          const { filename, mimeType } = value;
          const extension = filename.split('.').pop()?.toLowerCase();
          
          // Validate extension matches MIME type
          const mimeExtensionMap = {
            'application/pdf': ['pdf'],
            'application/msword': ['doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
            'application/vnd.ms-excel': ['xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
            'image/png': ['png'],
            'image/jpeg': ['jpg', 'jpeg'],
            'text/plain': ['txt']
          };
          
          const allowedExtensions = mimeExtensionMap[mimeType as keyof typeof mimeExtensionMap] || [];
          return allowedExtensions.includes(extension || '');
        },
        message: 'File extension does not match MIME type'
      },
      {
        name: 'pathTraversalValidation',
        validator: (value: any) => {
          const { uploadPath } = value;
          
          // Prevent path traversal attacks
          const dangerousPatterns = [
            /\.\./,           // Directory traversal
            /\/\.\./,         // Unix traversal
            /\\\.\./,         // Windows traversal
            /^\/root/i,       // Root directory access
            /^\/etc/i,        // System directory access
            /^\/var/i,        // Variable directory access
            /^\/tmp/i,        // Temporary directory access
            /^\/usr/i,        // User directory access
            /^c:\\/i,         // Windows system drive
            /^%[a-z]/i        // Environment variables
          ];
          
          return !dangerousPatterns.some(pattern => pattern.test(uploadPath));
        },
        message: 'Upload path contains potentially dangerous patterns'
      },
      {
        name: 'fileSizeBusinessRules',
        validator: (value: any) => {
          const { size, mimeType, metadata } = value;
          
          // Different size limits based on file type and category
          const sizeLimits = {
            'image/png': 5000000,      // 5MB for images
            'image/jpeg': 5000000,     // 5MB for images
            'application/pdf': 20000000, // 20MB for PDFs
            'text/plain': 1000000      // 1MB for text files
          };
          
          const limit = sizeLimits[mimeType as keyof typeof sizeLimits] || 10000000; // Default 10MB
          
          // Special handling for financial documents
          if (metadata?.category === 'financial' && size > 50000000) {
            return false; // Max 50MB for financial documents
          }
          
          return size <= limit;
        },
        message: 'File size exceeds limits for this file type and category'
      }
    ]
  })
  @CypherQuery({
    query: `
      CREATE (f:FileUpload {
        id: $id,
        filename: $filename,
        size: $size,
        mimeType: $mimeType,
        uploadPath: $uploadPath,
        metadata: $metadata,
        uploadedAt: datetime(),
        status: 'uploaded',
        checksum: $checksum
      })
      RETURN f
    `,
    mode: 'WRITE',
    description: 'Store file upload metadata with validation'
  })
  async uploadFile(fileData: any): Promise<any> {
    this.logger.log(`Uploading file: ${fileData.filename} (${fileData.size} bytes)`);
    // File has passed all security validations
    return {};
  }
}

/**
 * EXPORT ALL INPUT VALIDATION EXAMPLES
 * 
 * These services demonstrate:
 * ✓ JSON Schema validation with comprehensive constraints
 * ✓ Cypher injection prevention with pattern detection
 * ✓ HTML sanitization and XSS protection
 * ✓ Custom business logic validation
 * ✓ File upload security validation
 * ✓ Property name sanitization
 * ✓ Content security validation
 * 
 * Security features covered:
 * ✓ Schema-based input validation
 * ✓ Injection attack prevention (Cypher, SQL, XSS)
 * ✓ Data sanitization and escaping
 * ✓ Business rule enforcement
 * ✓ File type and size validation  
 * ✓ Path traversal prevention
 * ✓ Content pattern detection
 * ✓ Custom validator integration
 */
export type { UserRegistrationDto, FinancialTransactionDto, DocumentUploadDto, SearchQueryDto };
export { BasicValidationService, CypherInjectionPreventionService, BusinessValidationService, FileUploadValidationService };