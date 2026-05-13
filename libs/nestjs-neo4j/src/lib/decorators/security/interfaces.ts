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
