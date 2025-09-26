/**
 * @fileoverview Advanced Safe Decorator Examples
 *
 * This file demonstrates comprehensive usage patterns for the @Safe decorator including:
 * - Parameter validation and sanitization strategies
 * - Injection prevention and security patterns
 * - Custom validation rules and business logic integration
 * - Performance optimization with intelligent caching
 * - Production-ready error handling and monitoring
 *
 * Real-world scenarios covered:
 * - User input sanitization for content management
 * - API parameter validation for e-commerce
 * - Financial data validation with strict security
 * - File upload validation and processing
 * - Multi-tenant data isolation validation
 */

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  Safe,
  Transactional,
  CypherQuery,
  InjectNeo4j,
  Neo4jService,
  type SafeConfig,
  type SafeContext,
  SafeValidationError
} from '../../../index';
import type { User, Product, Review, FileUpload, ContentBlock } from '../02-entities-and-relationships/types';

/**
 * Content Management Service demonstrating comprehensive input sanitization
 * and validation patterns for user-generated content
 */
@Injectable()
export class SafeContentManagementService {
  private readonly logger = new Logger(SafeContentManagementService.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  // =============================================================================
  // HTML SANITIZATION AND XSS PREVENTION
  // =============================================================================

  /**
   * Create blog post with comprehensive HTML sanitization and validation
   * Demonstrates advanced sanitization patterns for user content
   */
  @Safe({
    strict: true,
    log: true, // Enable for content monitoring
    rules: {
      maxDepth: 4,
      maxStringLength: 50000, // 50KB max content
      preventInjection: true,
      sanitizeHtml: true,
      escapeSpecialChars: false, // Keep some formatting
      customSanitizers: [
        {
          pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          replacement: '<!-- SCRIPT_REMOVED -->',
          description: 'Remove script tags completely'
        },
        {
          pattern: /javascript:/gi,
          replacement: 'blocked:',
          description: 'Block javascript URLs'
        },
        {
          pattern: /on\w+\s*=/gi,
          replacement: 'data-blocked=',
          description: 'Block event handlers'
        }
      ]
    },
    transforms: {
      autoSerialize: true,
      autoDateTransform: true
    },
    customValidators: [
      {
        name: 'content-quality',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'content' && typeof value === 'string') {
            // Check for minimum content quality
            const wordCount = value.split(/\s+/).length;
            const hasMinimalFormatting = value.includes('\n') || value.includes('<p>');
            return wordCount >= 10 && (wordCount < 50 || hasMinimalFormatting);
          }
          return true;
        },
        message: 'Content must be at least 10 words and well-formatted if longer than 50 words'
      },
      {
        name: 'appropriate-language',
        validator: (value: any, context: SafeContext) => {
          if (typeof value === 'string') {
            // Simple profanity filter (in production, use a proper service)
            const inappropriateWords = ['spam', 'test123', 'lorem ipsum'];
            const lowerContent = value.toLowerCase();
            return !inappropriateWords.some(word => lowerContent.includes(word));
          }
          return true;
        },
        message: 'Content contains inappropriate language or appears to be test content'
      }
    ]
  })
  @Transactional()
  async createBlogPost(postData: {
    userId: number;
    title: string;
    content: string;
    summary?: string;
    tags: string[];
    category: string;
    publishImmediately: boolean;
    seoMetadata?: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string[];
    };
  }): Promise<{
    postId: string;
    sanitizationReport: any;
    validationWarnings: string[];
    status: 'DRAFT' | 'PUBLISHED' | 'PENDING_REVIEW';
  }> {
    this.logger.log(`Creating blog post for user ${postData.userId}: "${postData.title.substring(0, 50)}..."`);

    const sanitizationReport = {
      originalLength: postData.content.length,
      sanitizedLength: 0,
      removedElements: [] as string[],
      securityFlags: [] as string[]
    };

    try {
      // The @Safe decorator has already sanitized the input by this point
      sanitizationReport.sanitizedLength = postData.content.length;

      // Additional business-level validation
      const validationWarnings = [];

      // Check content complexity for auto-publishing
      const contentComplexity = this.assessContentComplexity(postData.content);
      if (contentComplexity.score < 0.6 && postData.publishImmediately) {
        validationWarnings.push('Content may need review before publishing - complexity score too low');
        postData.publishImmediately = false;
      }

      // Check for potential SEO issues
      if (!postData.seoMetadata?.metaTitle && postData.title.length > 60) {
        validationWarnings.push('Title is longer than recommended for SEO - consider adding custom meta title');
      }

      return this.neo4j.write(async (session) => {
        const result = await session.run(`
          MATCH (u:User {id: $userId, active: true})

          CREATE (p:BlogPost {
            id: randomUUID(),
            title: $title,
            content: $content,
            summary: coalesce($summary, substring($content, 0, 200) + '...'),
            category: $category,
            status: CASE
              WHEN $publishImmediately = true AND size($validationWarnings) = 0 THEN 'PUBLISHED'
              WHEN size($validationWarnings) > 0 THEN 'PENDING_REVIEW'
              ELSE 'DRAFT'
            END,
            createdAt: datetime(),
            updatedAt: datetime(),
            contentLength: size($content),
            wordCount: size(split($content, ' ')),
            sanitizationApplied: true,
            validationWarnings: $validationWarnings
          })

          CREATE (u)-[:AUTHORED]->(p)

          // Add tags
          WITH p, u
          UNWIND $tags as tagName
          MERGE (t:Tag {name: tagName})
          CREATE (p)-[:TAGGED_WITH]->(t)

          // Add SEO metadata if provided
          WITH p
          WHERE $seoMetadata IS NOT NULL

          CREATE (seo:SEOMetadata {
            metaTitle: coalesce($seoMetadata.metaTitle, $title),
            metaDescription: coalesce($seoMetadata.metaDescription, substring($content, 0, 160)),
            keywords: coalesce($seoMetadata.keywords, $tags)
          })
          CREATE (p)-[:HAS_SEO]->(seo)

          RETURN p {
            .id,
            .status,
            .createdAt
          } as post
        `, {
          ...postData,
          validationWarnings
        });

        const post = result.records[0].get('post');

        return {
          postId: post.id,
          sanitizationReport,
          validationWarnings,
          status: post.status
        };
      });

    } catch (error) {
      this.logger.error(`Blog post creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user profile with intelligent sanitization
   * Demonstrates context-aware sanitization based on field types
   */
  @Safe({
    strict: true,
    rules: {
      maxDepth: 3,
      preventInjection: true,
      sanitizeHtml: true,
      customSanitizers: [
        {
          pattern: /^\+?[\d\s\-()]+$/,
          replacement: '', // Don't modify valid phone numbers
          description: 'Preserve valid phone number formats'
        },
        {
          pattern: /@[\w.-]+\.\w+$/,
          replacement: '', // Don't modify valid emails
          description: 'Preserve valid email formats'
        }
      ]
    },
    customValidators: [
      {
        name: 'email-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'email' && typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
          }
          return true;
        },
        message: 'Invalid email format'
      },
      {
        name: 'phone-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'phone' && value) {
            const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
            return phoneRegex.test(value.toString());
          }
          return true;
        },
        message: 'Invalid phone number format'
      }
    ]
  })
  async updateUserProfile(userId: number, profileData: {
    displayName?: string;
    email?: string;
    phone?: string;
    bio?: string;
    location?: {
      city: string;
      country: string;
      timezone: string;
    };
    preferences?: {
      theme: 'light' | 'dark' | 'auto';
      language: string;
      notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
      };
    };
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      website?: string;
    };
  }): Promise<{
    userId: number;
    updatedFields: string[];
    validationResults: any;
    sanitizationApplied: boolean;
  }> {
    this.logger.log(`Updating profile for user ${userId}`);

    const updatedFields = Object.keys(profileData).filter(key => profileData[key] !== undefined);

    // Additional field-specific validation
    const validationResults = {
      email: profileData.email ? this.validateEmail(profileData.email) : null,
      phone: profileData.phone ? this.validatePhone(profileData.phone) : null,
      socialLinks: profileData.socialLinks ? this.validateSocialLinks(profileData.socialLinks) : null
    };

    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId})

        SET u.displayName = coalesce($displayName, u.displayName),
            u.email = coalesce($email, u.email),
            u.phone = coalesce($phone, u.phone),
            u.bio = coalesce($bio, u.bio),
            u.location = coalesce($location, u.location),
            u.preferences = coalesce($preferences, u.preferences),
            u.socialLinks = coalesce($socialLinks, u.socialLinks),
            u.updatedAt = datetime(),
            u.profileCompleteness = (
              CASE WHEN $displayName IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN $email IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN $bio IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN $location IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN $socialLinks IS NOT NULL THEN 1 ELSE 0 END
            ) * 20 // Convert to percentage

        RETURN u {
          .id,
          .displayName,
          .profileCompleteness,
          .updatedAt
        } as user
      `, { userId, ...profileData });

      return {
        userId,
        updatedFields,
        validationResults,
        sanitizationApplied: true
      };
    });
  }

  // =============================================================================
  // ADVANCED INJECTION PREVENTION
  // =============================================================================

  /**
   * Product search with advanced injection prevention
   * Demonstrates sophisticated attack pattern detection
   */
  @Safe({
    strict: true,
    log: true,
    rules: {
      preventInjection: true,
      onInjectionDetected: 'throw',
      maxStringLength: 1000,
      customSanitizers: [
        {
          pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
          replacement: '',
          description: 'Remove control characters'
        },
        {
          pattern: /(?:union|select|insert|delete|update|drop|create|alter|exec|execute)\s/gi,
          replacement: '',
          description: 'Remove SQL keywords'
        }
      ]
    },
    customValidators: [
      {
        name: 'search-pattern-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'searchTerm' && typeof value === 'string') {
            // Check for suspicious search patterns
            const suspiciousPatterns = [
              /\s+(and|or)\s+\d+\s*=\s*\d+/i, // SQL injection patterns
              /\s+(and|or)\s+['"]\w+['"]\s*=\s*['"]\w+['"]/i,
              /\$\w+\s*(=|<|>|!=)/i, // Parameter manipulation
              /\{.*\}/i, // JSON injection attempts
            ];

            return !suspiciousPatterns.some(pattern => pattern.test(value));
          }
          return true;
        },
        message: 'Search term contains suspicious patterns'
      }
    ]
  })
  async searchProductsSecurely(searchParams: {
    searchTerm: string;
    category?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    filters?: Record<string, any>;
    sortBy?: string;
    userId?: number; // For personalization
  }): Promise<{
    products: any[];
    totalCount: number;
    searchMetadata: {
      sanitized: boolean;
      originalTerm: string;
      processingTime: number;
      securityFlags: string[];
    };
  }> {
    const startTime = Date.now();
    const securityFlags = [];

    // Additional security checks
    if (searchParams.searchTerm.length > 100) {
      securityFlags.push('LONG_SEARCH_TERM');
    }

    if (searchParams.filters && Object.keys(searchParams.filters).length > 20) {
      securityFlags.push('EXCESSIVE_FILTERS');
      throw new BadRequestException('Too many search filters provided');
    }

    this.logger.log(`Secure product search: "${searchParams.searchTerm}" with ${Object.keys(searchParams.filters || {}).length} filters`);

    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        // Safe parameterized query - injection prevention handled by @Safe decorator
        CALL db.index.fulltext.queryNodes('productSearchIndex', $searchTerm)
        YIELD node as p, score

        WHERE p.active = true
        AND ($category IS NULL OR p.category = $category)
        AND ($minPrice IS NULL OR p.price >= $minPrice)
        AND ($maxPrice IS NULL OR p.price <= $maxPrice)

        // Personalization based on user preferences (if user provided)
        OPTIONAL MATCH (u:User {id: $userId})-[:PREFERS]->(pref)
        WITH p, score,
             CASE WHEN u IS NOT NULL THEN score * 1.1 ELSE score END as personalizedScore

        ORDER BY personalizedScore DESC
        LIMIT 50

        RETURN collect(p {
          .*,
          searchScore: round(personalizedScore * 100) / 100
        }) as products,
        count(p) as totalCount
      `, {
        searchTerm: searchParams.searchTerm,
        category: searchParams.category,
        minPrice: searchParams.priceRange?.min,
        maxPrice: searchParams.priceRange?.max,
        userId: searchParams.userId
      });

      const processingTime = Date.now() - startTime;

      return {
        products: result.records[0].get('products'),
        totalCount: result.records[0].get('totalCount').low,
        searchMetadata: {
          sanitized: true,
          originalTerm: searchParams.searchTerm,
          processingTime,
          securityFlags
        }
      };
    });
  }

  // =============================================================================
  // FINANCIAL DATA VALIDATION
  // =============================================================================

  /**
   * Financial transaction processing with strict validation
   * Demonstrates high-security validation for sensitive operations
   */
  @Safe({
    strict: true,
    log: true,
    rules: {
      maxDepth: 2, // Strict nesting for financial data
      preventInjection: true,
      onInjectionDetected: 'throw',
      maxParams: 10,
      maxStringLength: 500
    },
    transforms: {
      autoInt: false, // Handle financial numbers carefully
      autoDateTransform: true
    },
    customValidators: [
      {
        name: 'amount-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName?.includes('amount') || context.paramName?.includes('price')) {
            const amount = parseFloat(value);
            return !isNaN(amount) && amount >= 0 && amount <= 1000000 &&
                   Number(value.toFixed(2)) === amount; // Ensure max 2 decimal places
          }
          return true;
        },
        message: 'Invalid amount: must be a positive number with maximum 2 decimal places and under $1,000,000'
      },
      {
        name: 'currency-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'currency') {
            const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
            return validCurrencies.includes(value);
          }
          return true;
        },
        message: 'Invalid currency code - must be one of: USD, EUR, GBP, CAD, AUD, JPY'
      },
      {
        name: 'reference-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'reference' && value) {
            // Financial reference must be alphanumeric with dashes/underscores only
            return /^[A-Za-z0-9_-]+$/.test(value);
          }
          return true;
        },
        message: 'Reference must contain only letters, numbers, dashes, and underscores'
      }
    ]
  })
  @Transactional({ timeout: 30000 })
  async processPayment(paymentData: {
    userId: number;
    amount: number;
    currency: string;
    paymentMethodId: string;
    description: string;
    reference?: string;
    metadata?: {
      orderId?: string;
      invoiceId?: string;
    };
  }): Promise<{
    paymentId: string;
    status: string;
    processedAmount: number;
    fees: number;
    validationPassed: boolean;
  }> {
    this.logger.log(`Processing payment: $${paymentData.amount} ${paymentData.currency} for user ${paymentData.userId}`);

    // Additional financial validation
    const financialValidation = await this.performFinancialValidation(paymentData);
    if (!financialValidation.passed) {
      throw new ForbiddenException(`Financial validation failed: ${financialValidation.errors.join(', ')}`);
    }

    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId, active: true})
        MATCH (pm:PaymentMethod {id: $paymentMethodId})-[:BELONGS_TO]->(u)

        WHERE pm.active = true AND pm.verified = true

        CREATE (payment:Payment {
          id: 'pay_' + randomUUID(),
          userId: u.id,
          amount: $amount,
          currency: $currency,
          description: $description,
          reference: $reference,
          status: 'PROCESSING',
          createdAt: datetime(),
          metadata: $metadata,
          validationLevel: 'STRICT',
          securityFlags: []
        })

        CREATE (u)-[:MADE_PAYMENT]->(payment)
        CREATE (payment)-[:USED_METHOD]->(pm)

        // Calculate fees (simplified)
        WITH payment,
             CASE
               WHEN $currency = 'USD' AND $amount <= 100 THEN 2.9
               WHEN $currency = 'USD' THEN $amount * 0.029
               ELSE $amount * 0.035
             END as calculatedFees

        SET payment.fees = round(calculatedFees * 100) / 100,
            payment.processedAmount = round(($amount - calculatedFees) * 100) / 100,
            payment.status = 'COMPLETED',
            payment.completedAt = datetime()

        RETURN payment {
          .id,
          .status,
          .processedAmount,
          .fees
        } as result
      `, paymentData);

      const paymentResult = result.records[0].get('result');

      return {
        paymentId: paymentResult.id,
        status: paymentResult.status,
        processedAmount: paymentResult.processedAmount,
        fees: paymentResult.fees,
        validationPassed: true
      };
    });
  }

  // =============================================================================
  // FILE UPLOAD VALIDATION
  // =============================================================================

  /**
   * File upload processing with comprehensive validation
   * Demonstrates file content validation and security checks
   */
  @Safe({
    strict: true,
    log: true,
    rules: {
      maxDepth: 3,
      preventInjection: true,
      maxStringLength: 500, // For file names and descriptions
    },
    customValidators: [
      {
        name: 'file-type-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'fileType' && value) {
            const allowedTypes = [
              'image/jpeg', 'image/png', 'image/gif', 'image/webp',
              'application/pdf', 'text/plain', 'text/csv',
              'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ];
            return allowedTypes.includes(value);
          }
          return true;
        },
        message: 'Invalid file type - only images, PDFs, text files, and spreadsheets allowed'
      },
      {
        name: 'file-size-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'fileSize' && typeof value === 'number') {
            const maxSize = 10 * 1024 * 1024; // 10MB
            return value <= maxSize && value > 0;
          }
          return true;
        },
        message: 'File size must be between 1 byte and 10MB'
      },
      {
        name: 'filename-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'fileName' && value) {
            // Check for suspicious file names
            const suspiciousPatterns = [
              /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar)$/i,
              /^\./, // Hidden files
              /[<>:"|?*]/, // Invalid characters
              /\.\./  // Directory traversal
            ];
            return !suspiciousPatterns.some(pattern => pattern.test(value));
          }
          return true;
        },
        message: 'Invalid file name - contains suspicious patterns or invalid characters'
      }
    ]
  })
  async processFileUpload(uploadData: {
    userId: number;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileHash: string;
    description?: string;
    category: 'AVATAR' | 'DOCUMENT' | 'ATTACHMENT' | 'CONTENT';
    isPublic: boolean;
    tags?: string[];
  }): Promise<{
    fileId: string;
    uploadUrl: string;
    securityChecks: {
      fileNameSafe: boolean;
      typeSafe: boolean;
      sizeSafe: boolean;
      hashVerified: boolean;
    };
    processingInstructions: string[];
  }> {
    this.logger.log(`Processing file upload: ${uploadData.fileName} (${uploadData.fileSize} bytes) for user ${uploadData.userId}`);

    // Perform additional security checks
    const securityChecks = {
      fileNameSafe: this.validateFileName(uploadData.fileName),
      typeSafe: this.validateFileType(uploadData.fileType, uploadData.fileName),
      sizeSafe: this.validateFileSize(uploadData.fileSize, uploadData.category),
      hashVerified: this.validateFileHash(uploadData.fileHash)
    };

    if (!Object.values(securityChecks).every(check => check === true)) {
      throw new BadRequestException('File failed security validation');
    }

    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId, active: true})

        CREATE (f:FileUpload {
          id: 'file_' + randomUUID(),
          userId: u.id,
          fileName: $fileName,
          fileSize: $fileSize,
          fileType: $fileType,
          fileHash: $fileHash,
          description: $description,
          category: $category,
          isPublic: $isPublic,
          status: 'PROCESSING',
          uploadedAt: datetime(),
          securityChecks: $securityChecks
        })

        CREATE (u)-[:UPLOADED]->(f)

        // Add tags if provided
        WITH f
        WHERE $tags IS NOT NULL
        UNWIND $tags as tagName
        MERGE (t:Tag {name: tagName})
        CREATE (f)-[:TAGGED_WITH]->(t)

        WITH f
        RETURN f {
          .id,
          .fileName,
          .status
        } as file
      `, { ...uploadData, securityChecks });

      const file = result.records[0].get('file');

      // Generate processing instructions based on file type
      const processingInstructions = this.generateProcessingInstructions(
        uploadData.fileType,
        uploadData.category
      );

      return {
        fileId: file.id,
        uploadUrl: `/api/files/${file.id}/upload`, // Generated upload URL
        securityChecks,
        processingInstructions
      };
    });
  }

  // =============================================================================
  // MULTI-TENANT DATA ISOLATION VALIDATION
  // =============================================================================

  /**
   * Multi-tenant data operation with strict isolation validation
   * Demonstrates tenant boundary enforcement with validation
   */
  @Safe({
    strict: true,
    log: true,
    rules: {
      preventInjection: true,
      maxDepth: 4,
      maxParams: 15
    },
    customValidators: [
      {
        name: 'tenant-id-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName === 'tenantId' && value) {
            // Tenant ID must be a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return uuidRegex.test(value);
          }
          return true;
        },
        message: 'Invalid tenant ID format - must be a valid UUID'
      },
      {
        name: 'resource-scope-validation',
        validator: (value: any, context: SafeContext) => {
          if (context.paramName?.includes('resource') && value) {
            // Ensure resource references don't attempt cross-tenant access
            return !value.toString().includes('../') && !value.toString().includes('*');
          }
          return true;
        },
        message: 'Invalid resource reference - potential cross-tenant access attempt'
      }
    ]
  })
  @Transactional()
  async manageTenantResource(operation: {
    tenantId: string;
    userId: number;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    resourceType: string;
    resourceId?: string;
    resourceData?: any;
  }): Promise<{
    success: boolean;
    resourceId: string;
    tenantIsolationVerified: boolean;
    accessGranted: boolean;
  }> {
    this.logger.log(`Managing tenant resource: ${operation.action} ${operation.resourceType} for tenant ${operation.tenantId}`);

    // Verify tenant isolation before proceeding
    const isolationCheck = await this.verifyTenantIsolation(operation.tenantId, operation.userId);
    if (!isolationCheck.isolated) {
      throw new ForbiddenException('Tenant isolation validation failed');
    }

    return this.neo4j.write(async (session) => {
      // All operations are scoped to the tenant
      const result = await session.run(`
        MATCH (t:Tenant {id: $tenantId})
        MATCH (u:User {id: $userId})-[:BELONGS_TO]->(t)

        WITH t, u
        WHERE u.active = true AND t.active = true

        CALL {
          WITH t, u
          ${this.generateTenantScopedQuery(operation.action, operation.resourceType)}
        }

        RETURN result
      `, operation);

      return {
        success: true,
        resourceId: operation.resourceId || `${operation.resourceType}_${Date.now()}`,
        tenantIsolationVerified: true,
        accessGranted: true
      };
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private assessContentComplexity(content: string): { score: number; factors: string[] } {
    const factors = [];
    let score = 0;

    // Word count factor
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 100) { score += 0.3; factors.push('sufficient_length'); }

    // Formatting factor
    if (content.includes('\n') || content.includes('<p>')) { score += 0.2; factors.push('formatted'); }

    // Link factor
    if (content.includes('http') || content.includes('<a')) { score += 0.1; factors.push('has_links'); }

    // Structure factor
    if (content.includes('#') || content.includes('<h')) { score += 0.2; factors.push('structured'); }

    // Image factor
    if (content.includes('<img') || content.includes('![')) { score += 0.2; factors.push('has_media'); }

    return { score: Math.min(score, 1.0), factors };
  }

  private validateEmail(email: string): { valid: boolean; reason?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    const domain = email.split('@')[1];
    const bannedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    if (bannedDomains.includes(domain)) {
      return { valid: false, reason: 'Temporary email domains not allowed' };
    }

    return { valid: true };
  }

  private validatePhone(phone: string): { valid: boolean; reason?: string } {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone)
      ? { valid: true }
      : { valid: false, reason: 'Invalid phone number format' };
  }

  private validateSocialLinks(links: Record<string, string>): { valid: boolean; invalid: string[] } {
    const invalid = [];

    Object.entries(links).forEach(([platform, url]) => {
      if (url) {
        try {
          const parsedUrl = new URL(url);
          const expectedDomains = {
            twitter: ['twitter.com', 'x.com'],
            linkedin: ['linkedin.com'],
            website: [] // Any domain allowed
          };

          if (expectedDomains[platform] && expectedDomains[platform].length > 0) {
            if (!expectedDomains[platform].some(domain => parsedUrl.hostname.includes(domain))) {
              invalid.push(platform);
            }
          }
        } catch {
          invalid.push(platform);
        }
      }
    });

    return { valid: invalid.length === 0, invalid };
  }

  private async performFinancialValidation(data: any): Promise<{ passed: boolean; errors: string[] }> {
    const errors = [];

    if (data.amount > 50000) {
      errors.push('Amount exceeds daily limit');
    }

    if (!data.paymentMethodId) {
      errors.push('Payment method required');
    }

    return { passed: errors.length === 0, errors };
  }

  private validateFileName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar)$/i,
      /^\./,
      /[<>:"|?*]/,
      /\.\./
    ];
    return !suspiciousPatterns.some(pattern => pattern.test(fileName));
  }

  private validateFileType(fileType: string, fileName: string): boolean {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv'
    ];

    // Check MIME type
    if (!allowedTypes.includes(fileType)) return false;

    // Check file extension matches MIME type
    const extension = fileName.toLowerCase().split('.').pop();
    const typeExtensionMap = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'text/csv': ['csv']
    };

    return typeExtensionMap[fileType]?.includes(extension) || false;
  }

  private validateFileSize(fileSize: number, category: string): boolean {
    const limits = {
      'AVATAR': 2 * 1024 * 1024, // 2MB
      'DOCUMENT': 10 * 1024 * 1024, // 10MB
      'ATTACHMENT': 5 * 1024 * 1024, // 5MB
      'CONTENT': 10 * 1024 * 1024 // 10MB
    };

    return fileSize > 0 && fileSize <= limits[category];
  }

  private validateFileHash(hash: string): boolean {
    // Basic hash validation (SHA-256 format)
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }

  private generateProcessingInstructions(fileType: string, category: string): string[] {
    const instructions = [];

    if (fileType.startsWith('image/')) {
      instructions.push('RESIZE_FOR_WEB', 'GENERATE_THUMBNAILS', 'OPTIMIZE_COMPRESSION');
      if (category === 'AVATAR') {
        instructions.push('CROP_SQUARE', 'FACE_DETECTION');
      }
    }

    if (fileType === 'application/pdf') {
      instructions.push('EXTRACT_TEXT', 'GENERATE_PREVIEW', 'VIRUS_SCAN');
    }

    instructions.push('BACKUP_TO_STORAGE', 'UPDATE_SEARCH_INDEX');

    return instructions;
  }

  private async verifyTenantIsolation(tenantId: string, userId: number): Promise<{ isolated: boolean; reason?: string }> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId})-[:BELONGS_TO]->(t:Tenant {id: $tenantId})
        RETURN count(*) as validAssociation
      `, { tenantId, userId });

      const isValid = result.records[0].get('validAssociation').low > 0;
      return {
        isolated: isValid,
        reason: isValid ? undefined : 'User does not belong to specified tenant'
      };
    });
  }

  private generateTenantScopedQuery(action: string, resourceType: string): string {
    // Generate tenant-scoped Cypher based on action and resource type
    switch (action) {
      case 'CREATE':
        return `
          CREATE (r:${resourceType} {
            id: randomUUID(),
            tenantId: t.id,
            createdBy: u.id,
            createdAt: datetime()
          })
          CREATE (t)-[:OWNS]->(r)
          CREATE (u)-[:CREATED]->(r)
          RETURN r as result
        `;
      case 'READ':
        return `
          MATCH (t)-[:OWNS]->(r:${resourceType})
          RETURN r as result
        `;
      default:
        return `RETURN null as result`;
    }
  }
}

// Export the service for use in other modules
export { SafeContentManagementService };

/**
 * Safe Decorator Best Practices Summary:
 *
 * 1. **Validation Strategy**:
 *    - Use strict mode for sensitive operations
 *    - Implement custom validators for business-specific rules
 *    - Layer validation (decorator + business logic)
 *
 * 2. **Sanitization Approach**:
 *    - Enable HTML sanitization for user content
 *    - Use custom sanitizers for specific patterns
 *    - Preserve valid formats (emails, phones, URLs)
 *
 * 3. **Security Considerations**:
 *    - Always prevent injection in user inputs
 *    - Use 'throw' mode for critical security violations
 *    - Log security events for monitoring
 *
 * 4. **Performance Optimization**:
 *    - Set appropriate parameter limits
 *    - Use efficient validation patterns
 *    - Cache validation results when possible
 *
 * 5. **Production Readiness**:
 *    - Include comprehensive error messages
 *    - Implement proper logging and monitoring
 *    - Plan for different user contexts and permissions
 */
