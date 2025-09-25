/**
 * Metadata interfaces for the  decorator framework
 */

/**
 * Base metadata for all Neo4j decorators
 */
export interface BaseDecoratorMetadata {
  /** Unique identifier for this decoration */
  id?: string;
  /** Description for documentation */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Whether this decorator is enabled */
  enabled?: boolean;
}

/**
 * Query execution options
 */
export interface QueryExecutionOptions {
  /** Database to execute against */
  database?: string;
  /** Access mode for the session */
  accessMode?: 'READ' | 'WRITE';
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Enable query profiling */
  profile?: boolean;
  /** Include execution plan */
  explain?: boolean;
  /** Cache configuration */
  cache?: CacheOptions;
  /** Retry configuration */
  retry?: RetryOptions;
  /** Transaction configuration */
  transaction?: TransactionOptions;
}

/**
 * Cache configuration for queries
 */
export interface CacheOptions {
  /** Enable caching */
  enabled: boolean;
  /** Time to live in milliseconds */
  ttl?: number;
  /** Cache key generator function */
  keyGenerator?: (args: any[]) => string;
  /** Custom cache key */
  key?: string;
  /** Cache invalidation patterns */
  invalidateOn?: string[];
  /** Cache storage backend */
  storage?: 'memory' | 'redis' | 'custom';
}

/**
 * Retry configuration for failed operations
 */
export interface RetryOptions {
  /** Enable retry mechanism */
  enabled: boolean;
  /** Maximum number of retry attempts */
  attempts?: number;
  /** Base delay between retries in milliseconds */
  delay?: number;
  /** Backoff strategy */
  backoff?: 'fixed' | 'exponential' | 'linear';
  /** Error types that should trigger retry */
  retryOn?: string[];
}

/**
 * Transaction configuration for  decorators
 */
export interface TransactionOptions {
  /** Transaction timeout */
  timeout?: number;
  /** Transaction metadata */
  metadata?: Record<string, any>;
  /** Isolation level */
  isolationLevel?: 'READ_COMMITTED' | 'SERIALIZABLE';
}

/**
 * Parameter validation configuration
 */
export interface QueryValidationOptions {
  /** Enable parameter validation */
  enabled?: boolean;
  /** Maximum parameter depth */
  maxDepth?: number;
  /** Maximum number of parameters */
  maxParams?: number;
  /** Custom validation functions */
  validators?: Array<(value: any, paramName: string) => void>;
  /** Prevent SQL injection patterns */
  preventInjection?: boolean;
  /** Throw on validation error */
  throwOnError?: boolean;
}

/**
 * Type information for runtime type checking
 */
export interface TypeInfo<T = any> {
  /** Type constructor */
  type: () => T | T[];
  /** Whether the type is an array */
  isArray?: boolean;
  /** Whether the property is optional */
  optional?: boolean;
  /** Type transformation function */
  transform?: (value: any) => T;
  /** Type validation function */
  validate?: (value: any) => boolean;
}

/**
 * Property mapping configuration
 */
export interface PropertyMapping {
  /** Property name in Neo4j */
  neo4jName?: string;
  /** Property name in TypeScript */
  tsName?: string;
  /** Type information */
  type?: TypeInfo;
  /** Whether this property is serialized as JSON */
  serialized?: boolean;
  /** Default value */
  defaultValue?: any;
  /** Property transformation functions */
  transform?: {
    toNeo4j?: (value: any) => any;
    fromNeo4j?: (value: any) => any;
  };
}

/**
 * Relationship mapping configuration
 */
export interface RelationshipMapping {
  /** Relationship type */
  type: string;
  /** Direction of the relationship */
  direction: 'IN' | 'OUT' | 'BOTH';
  /** Target entity type */
  targetType: () => any;
  /** Whether this relationship is optional */
  optional?: boolean;
  /** Whether this is a collection of relationships */
  isArray?: boolean;
  /** Relationship properties type */
  propertiesType?: () => any;
}

/**
 * Repository configuration
 */
export interface RepositoryConfig extends BaseDecoratorMetadata {
  /** Entity type this repository manages */
  entityType: () => any;
  /** Default label for the entity */
  label?: string;
  /** Custom connection name */
  connectionName?: string;
  /** Default query options */
  defaultOptions?: QueryExecutionOptions;
}

/**
 * Entity configuration
 */
export interface EntityConfig extends BaseDecoratorMetadata {
  /** Neo4j label for this entity */
  label: string;
  /** Additional labels */
  additionalLabels?: string[];
  /** Custom ID generation strategy */
  idStrategy?: 'uuid' | 'auto' | 'custom';
  /** ID property name */
  idProperty?: string;
}

/**
 * Query method configuration
 */
export interface QueryMethodConfig extends BaseDecoratorMetadata {
  /** Cypher query template */
  query: string;
  /** Return type information */
  returnType?: TypeInfo;
  /** Query execution options */
  options?: QueryExecutionOptions;
  /** Parameter validation */
  validation?: QueryValidationOptions;
  /** Parameter mapping */
  parameterMapping?: Record<string, PropertyMapping>;
}

/**
 * Phase 7: Type Safety Configurations
 */

/**
 * Phase 5: Security Configurations
 */

/**
 * Authorization configuration
 */
export interface AuthorizeConfig extends BaseDecoratorMetadata {
  /** Required roles for access */
  roles?: string[];
  /** Required permissions */
  permissions?: string[];
  /** Tenant isolation configuration */
  tenantIsolation?: {
    enabled: boolean;
    tenantProperty?: string;
    autoInject?: boolean;
  };
  /** Resource-based access control */
  resourceAccess?: {
    resourceType: string;
    actions: string[];
    ownershipCheck?: {
      ownerProperty: string;
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
export interface ValidateInputConfig extends BaseDecoratorMetadata {
  /** Schema validation */
  schema?: {
    parameterSchema?: Record<string, any>;
    validatePropertyTypes?: boolean;
  };
  /** Sanitization rules */
  sanitization?: {
    stripHtml?: boolean;
    escapeSpecialChars?: boolean;
    allowedCharsPattern?: RegExp;
    maxStringLength?: number;
  };
  /** SQL/Cypher injection prevention */
  injectionPrevention?: {
    enabled: boolean;
    suspiciousPatterns?: RegExp[];
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
export interface AuditLogConfig extends BaseDecoratorMetadata {
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
    storeInNeo4j?: boolean;
    externalService?: string;
    retentionDays?: number;
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig extends BaseDecoratorMetadata {
  /** Maximum requests per window */
  requests: number;
  /** Time window (e.g., '1m', '1h', '1d') */
  window: string;
  /** Rate limiting strategy */
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket';
  /** Key generation for rate limiting */
  keyGenerator?: {
    includeUserId?: boolean;
    includeTenantId?: boolean;
    includeIpAddress?: boolean;
    customKey?: (context: any) => string;
  };
  /** Action when limit exceeded */
  onLimitExceeded?: {
    response: 'throw' | 'queue' | 'reject';
    message?: string;
    retryAfter?: number;
  };
}

/**
 * Data encryption configuration
 */
export interface EncryptSensitiveConfig extends BaseDecoratorMetadata {
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
 * Decorator composition metadata for conflict resolution
 */
export interface DecoratorCompositionMetadata {
  /** Decorator type category */
  type: 'query' | 'security' | 'validation' | 'type-safety' | 'workflow';
  /** Execution priority (higher = earlier) */
  priority: number;
  /** Conflicting decorators */
  conflicts: string[];
  /** Required dependencies */
  dependencies: string[];
  /** Performance impact level */
  performanceImpact: 'low' | 'medium' | 'high';
  /** Decorator version */
  version: string;
}

/**
 * Metadata keys for storing decorator information
 */
export const DECORATOR_METADATA_KEYS = {
  //  decorators (Phase 1)
  CYPHER_QUERY: Symbol('cypher-query'),
  REPOSITORY: Symbol('repository'),
  ENTITY: Symbol('entity'),
  PROPERTY: Symbol('property'),
  RELATIONSHIP: Symbol('relationship'),
  VALIDATION: Symbol('validation'),
  CACHE: Symbol('cache'),
  RETRY: Symbol('retry'),
  TRANSACTION: Symbol('transaction'),
  PROFILING: Symbol('profiling'),
  METRICS: Symbol('metrics'),

  // Phase 7: Advanced Type Safety decorators
  TYPED_CYPHER_QUERY: Symbol('typed-cypher-query'),
  TYPE_VALIDATION: Symbol('type-validation'),
  COMPILE_TIME_CHECK: Symbol('compile-time-check'),

  // Phase 5: Security & Validation decorators
  AUTHORIZE: Symbol('authorize'),
  VALIDATE_INPUT: Symbol('validate-input'),
  AUDIT_LOG: Symbol('audit-log'),
  RATE_LIMIT: Symbol('rate-limit'),
  ENCRYPT_SENSITIVE: Symbol('encrypt-sensitive'),
  TENANT_ISOLATION: Symbol('tenant-isolation'),

  // Decorator composition metadata
  DECORATOR_COMPOSITION: Symbol('decorator-composition'),
} as const;

/**
 * Utility type for decorator metadata values
 */
export type DecoratorMetadataValue<
  T extends keyof typeof DECORATOR_METADATA_KEYS
> = T extends 'CYPHER_QUERY'
  ? QueryMethodConfig
  : T extends 'REPOSITORY'
  ? RepositoryConfig
  : T extends 'ENTITY'
  ? EntityConfig
  : T extends 'PROPERTY'
  ? PropertyMapping
  : T extends 'RELATIONSHIP'
  ? RelationshipMapping
  : T extends 'VALIDATION'
  ? QueryValidationOptions
  : T extends 'CACHE'
  ? CacheOptions
  : T extends 'RETRY'
  ? RetryOptions
  : T extends 'TRANSACTION'
  ? TransactionOptions
  : any;
