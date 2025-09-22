/**
 * @fileoverview Constraint metadata interfaces for Neo4j constraint system
 * 
 * Defines the type system for constraint decorators and metadata collection.
 * Supports both class-level compound constraints and property-level single constraints.
 */

/**
 * Base constraint metadata interface
 */
export interface BaseConstraintMetadata {
  /** Unique identifier for this constraint */
  id?: string;
  /** Constraint type */
  type: ConstraintType;
  /** Target level (class or property) */
  target: ConstraintTarget;
  /** Properties involved in the constraint */
  properties: string[];
  /** Neo4j label for the constraint */
  label?: string;
  /** Options specific to constraint type */
  options?: ConstraintOptions;
  /** Description for documentation */
  description?: string;
  /** Whether this constraint is enabled */
  enabled?: boolean;
  /** Creation timestamp */
  createdAt?: Date;
  /** Priority for conflict resolution */
  priority?: number;
}

/**
 * Constraint types supported by the system
 */
export type ConstraintType = 
  | 'NODE_KEY'
  | 'UNIQUE'
  | 'NOT_NULL'
  | 'INDEX'
  | 'VALIDATION'
  | 'CUSTOM';

/**
 * Target level for constraints
 */
export type ConstraintTarget = 'class' | 'property';

/**
 * General constraint options
 */
export interface ConstraintOptions {
  /** Custom constraint name */
  name?: string;
  /** Error message for constraint violations */
  errorMessage?: string;
  /** Whether to create constraint on startup */
  createOnStartup?: boolean;
  /** Validation options */
  validation?: ValidationConfig;
  /** Index configuration */
  indexConfig?: IndexConfig;
  /** Custom constraint configuration */
  customConfig?: Record<string, any>;
}

/**
 * NODE KEY constraint metadata
 */
export interface NodeKeyConstraintMetadata extends BaseConstraintMetadata {
  type: 'NODE_KEY';
  target: 'class';
  /** Properties that form the node key */
  properties: string[];
  /** Options specific to node key constraints */
  options?: NodeKeyOptions;
}

/**
 * NODE KEY constraint options
 */
export interface NodeKeyOptions extends ConstraintOptions {
  /** Whether to allow partial keys */
  allowPartial?: boolean;
  /** Index provider */
  provider?: string;
}

/**
 * UNIQUE constraint metadata
 */
export interface UniqueConstraintMetadata extends BaseConstraintMetadata {
  type: 'UNIQUE';
  target: 'class' | 'property';
  /** Properties that must be unique */
  properties: string[];
  /** Options specific to unique constraints */
  options?: UniqueOptions;
}

/**
 * UNIQUE constraint options
 */
export interface UniqueOptions extends ConstraintOptions {
  /** Whether null values are considered unique */
  nullsDistinct?: boolean;
  /** Index provider */
  provider?: string;
  /** Case sensitivity for string comparisons */
  caseSensitive?: boolean;
}

/**
 * NOT NULL constraint metadata
 */
export interface NotNullConstraintMetadata extends BaseConstraintMetadata {
  type: 'NOT_NULL';
  target: 'property';
  /** Single property that cannot be null */
  properties: [string];
  /** Options specific to not null constraints */
  options?: NotNullOptions;
}

/**
 * NOT NULL constraint options
 */
export interface NotNullOptions extends ConstraintOptions {
  /** Whether empty strings are considered null */
  treatEmptyAsNull?: boolean;
  /** Default value to use instead of null */
  defaultValue?: any;
}

/**
 * INDEX constraint metadata
 */
export interface IndexConstraintMetadata extends BaseConstraintMetadata {
  type: 'INDEX';
  target: 'class' | 'property';
  /** Properties to index */
  properties: string[];
  /** Options specific to index constraints */
  options?: IndexOptions;
}

/**
 * INDEX constraint options
 */
export interface IndexOptions extends ConstraintOptions {
  /** Index configuration */
  indexConfig?: IndexConfig;
}

/**
 * Index configuration
 */
export interface IndexConfig {
  /** Index type */
  type?: 'BTREE' | 'TEXT' | 'RANGE' | 'POINT' | 'LOOKUP';
  /** Index provider */
  provider?: string;
  /** Index configuration options */
  config?: Record<string, any>;
  /** Whether to create unique index */
  unique?: boolean;
  /** Index name */
  name?: string;
}

/**
 * VALIDATION constraint metadata
 */
export interface ValidationConstraintMetadata extends BaseConstraintMetadata {
  type: 'VALIDATION';
  target: 'property';
  /** Single property to validate */
  properties: [string];
  /** Validation configuration */
  options: ValidationOptions;
}

/**
 * Validation options for property constraints
 */
export interface ValidationOptions extends ConstraintOptions {
  /** Validation configuration */
  validation: ValidationConfig;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Format validation */
  format?: ValidationFormat;
  /** Range validation for numeric values */
  range?: RangeValidation;
  /** Length validation for strings */
  length?: LengthValidation;
  /** Custom validation function */
  custom?: CustomValidation;
  /** Whether field is required */
  required?: boolean;
}

/**
 * Format validation options
 */
export type ValidationFormat = 
  | 'email'
  | 'url'
  | 'uuid'
  | 'date'
  | 'datetime'
  | 'time'
  | 'phone'
  | 'creditcard'
  | 'json'
  | { pattern: RegExp; flags?: string }
  | { regex: string; flags?: string };

/**
 * Range validation for numeric values
 */
export interface RangeValidation {
  /** Minimum value (inclusive) */
  min?: number;
  /** Maximum value (inclusive) */
  max?: number;
  /** Whether bounds are exclusive */
  exclusive?: boolean;
}

/**
 * Length validation for strings and arrays
 */
export interface LengthValidation {
  /** Minimum length */
  min?: number;
  /** Maximum length */
  max?: number;
  /** Exact length */
  exact?: number;
}

/**
 * Custom validation function
 */
export interface CustomValidation {
  /** Validation function */
  validator: (value: any, entity?: any) => boolean | string | Promise<boolean | string>;
  /** Error message for validation failure */
  message?: string;
  /** Whether validation is async */
  async?: boolean;
}

/**
 * Union type for all constraint metadata
 */
export type ConstraintMetadata = 
  | NodeKeyConstraintMetadata
  | UniqueConstraintMetadata
  | NotNullConstraintMetadata
  | IndexConstraintMetadata
  | ValidationConstraintMetadata;

/**
 * Constraint creation status
 */
export interface ConstraintCreationStatus {
  /** Constraint metadata */
  constraint: ConstraintMetadata;
  /** Whether creation was successful */
  success: boolean;
  /** Error message if creation failed */
  error?: string;
  /** Neo4j constraint name */
  neo4jName?: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Constraint validation result
 */
export interface ConstraintValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validated property values */
  values?: Record<string, any>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Property that failed validation */
  property: string;
  /** Error message */
  message: string;
  /** Constraint that was violated */
  constraint: ConstraintType;
  /** Actual value that failed validation */
  value?: any;
  /** Expected format or range */
  expected?: string;
}

/**
 * Constraint conflict resolution
 */
export interface ConstraintConflict {
  /** Conflicting constraints */
  constraints: ConstraintMetadata[];
  /** Conflict type */
  type: 'duplicate' | 'incompatible' | 'redundant';
  /** Resolution strategy */
  resolution: 'skip' | 'merge' | 'override' | 'error';
  /** Resolved constraint */
  resolved?: ConstraintMetadata;
}

/**
 * Constraint statistics
 */
export interface ConstraintStatistics {
  /** Total number of constraints */
  total: number;
  /** Constraints by type */
  byType: Record<ConstraintType, number>;
  /** Constraints by target */
  byTarget: Record<ConstraintTarget, number>;
  /** Creation success rate */
  successRate: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Metadata keys for storing constraint information
 */
export const CONSTRAINT_METADATA_KEYS = {
  NODE_KEY: Symbol('constraint-node-key'),
  UNIQUE: Symbol('constraint-unique'),
  NOT_NULL: Symbol('constraint-not-null'),
  INDEX: Symbol('constraint-index'),
  VALIDATION: Symbol('constraint-validation'),
  CUSTOM: Symbol('constraint-custom'),
  
  // Collection keys for multiple constraints
  CLASS_CONSTRAINTS: Symbol('class-constraints'),
  PROPERTY_CONSTRAINTS: Symbol('property-constraints'),
  ALL_CONSTRAINTS: Symbol('all-constraints'),
} as const;

/**
 * Utility type for constraint metadata values
 */
export type ConstraintMetadataValue<T extends keyof typeof CONSTRAINT_METADATA_KEYS> = 
  T extends 'NODE_KEY' ? NodeKeyConstraintMetadata :
  T extends 'UNIQUE' ? UniqueConstraintMetadata :
  T extends 'NOT_NULL' ? NotNullConstraintMetadata :
  T extends 'INDEX' ? IndexConstraintMetadata :
  T extends 'VALIDATION' ? ValidationConstraintMetadata :
  ConstraintMetadata;

/**
 * Type guard functions for constraint metadata
 */
export function isNodeKeyConstraint(constraint: ConstraintMetadata): constraint is NodeKeyConstraintMetadata {
  return constraint.type === 'NODE_KEY';
}

export function isUniqueConstraint(constraint: ConstraintMetadata): constraint is UniqueConstraintMetadata {
  return constraint.type === 'UNIQUE';
}

export function isNotNullConstraint(constraint: ConstraintMetadata): constraint is NotNullConstraintMetadata {
  return constraint.type === 'NOT_NULL';
}

export function isIndexConstraint(constraint: ConstraintMetadata): constraint is IndexConstraintMetadata {
  return constraint.type === 'INDEX';
}

export function isValidationConstraint(constraint: ConstraintMetadata): constraint is ValidationConstraintMetadata {
  return constraint.type === 'VALIDATION';
}

/**
 * Helper function to create constraint metadata with defaults
 */
export function createConstraintMetadata<T extends ConstraintMetadata>(
  base: Omit<T, 'id' | 'enabled' | 'createdAt' | 'priority'>
): T {
  return {
    ...base,
    id: `${base.type}_${base.label || 'unknown'}_${Date.now()}`,
    enabled: true,
    createdAt: new Date(),
    priority: 100,
  } as T;
}