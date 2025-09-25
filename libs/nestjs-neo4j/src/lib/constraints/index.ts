/**
 * @fileoverview Neo4j Constraint System - Main Export Index
 *
 * This module provides a comprehensive constraint system for Neo4j entities
 * with hybrid decorator support (both class-level and property-level constraints).
 *
 * Features:
 * - NODE KEY constraints for compound uniqueness
 * - UNIQUE constraints (single and compound)
 * - NOT NULL constraints for required properties
 * - INDEX constraints for performance optimization
 * - VALIDATION constraints for data integrity
 * - Automatic constraint creation and management
 * - Runtime validation before database operations
 */

// Constraint metadata interfaces and types
export * from '../interfaces/constraint-metadata.interface';

// Constraint decorators
export * from './node-key.decorator';
export * from './unique.decorator';
export * from './not-null.decorator';
export * from './index.decorator';
export * from './validate.decorator';

// Re-export commonly used types for convenience
export type {
  ConstraintMetadata,
  ConstraintType,
  ConstraintTarget,
  ConstraintOptions,
  ConstraintCreationStatus,
  ConstraintValidationResult,
  ValidationError,
  NodeKeyConstraintMetadata,
  UniqueConstraintMetadata,
  NotNullConstraintMetadata,
  IndexConstraintMetadata,
  ValidationConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';

// Re-export constraint decorator configuration types
export type { NodeKeyConfig } from './node-key.decorator';
export type { UniqueConfig } from './unique.decorator';
export type { NotNullConfig } from './not-null.decorator';
export type { IndexDecoratorConfig as IndexConfig } from './index.decorator';
export type { ValidateConfig } from './validate.decorator';

// Re-export utility functions
export {
  getNodeKeyConstraints,
  hasNodeKeyConstraints,
  generateNodeKeyConstraintQuery,
} from './node-key.decorator';

export {
  getUniqueConstraints,
  hasUniqueConstraints,
  generateUniqueConstraintQuery,
} from './unique.decorator';

export {
  getNotNullConstraints,
  hasNotNullConstraints,
  generateNotNullConstraintQuery,
} from './not-null.decorator';

export {
  getIndexConstraints,
  hasIndexConstraints,
  generateIndexQuery,
} from './index.decorator';

export {
  getValidationConstraints,
  hasValidationConstraints,
} from './validate.decorator';

// Re-export metadata keys
export { CONSTRAINT_METADATA_KEYS } from '../interfaces/constraint-metadata.interface';
