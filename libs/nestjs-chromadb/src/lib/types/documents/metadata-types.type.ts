/**
 * Metadata-focused types following Interface Segregation Principle
 * Handles metadata validation, normalization and type safety
 */

import type { Metadata } from 'chromadb';

/**
 * Safely normalize metadata to ChromaDB Metadata type
 */
export function normalizeMetadata(metadata: any): Metadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  const normalized: Metadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    // ChromaDB only supports string, number, and boolean values
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      normalized[key] = value;
    } else if (Array.isArray(value)) {
      // Convert arrays to comma-separated strings
      normalized[key] = value.join(',');
    } else if (value != null) {
      // Convert other types to strings
      try {
        normalized[key] = String(value);
      } catch (error) {
        // Skip invalid values
      }
    }
    // Skip null and undefined values
  }

  return normalized;
}

/**
 * Document validation schema
 */
export interface DocumentValidationSchema {
  readonly requireId?: boolean;
  readonly requireDocument?: boolean;
  readonly requireMetadata?: boolean;
  readonly maxDocumentLength?: number;
  readonly required?: readonly string[];
  readonly optional?: readonly string[];
  readonly types?: Record<
    string,
    'string' | 'number' | 'boolean' | 'object' | 'array'
  >;
  readonly patterns?: Record<string, RegExp>;
  readonly ranges?: Record<
    string,
    { readonly min?: number; readonly max?: number }
  >;
  readonly forbiddenMetadataKeys?: readonly string[];
  readonly metadataValidation?: Record<string, unknown>;
}

/**
 * Validation result for metadata and document validation
 */
export interface MetadataValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly validatedData?: any;
  readonly details?: Record<string, unknown>;
}

/**
 * Mutable validation result for internal use during validation
 */
export interface MutableMetadataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedData?: any;
}

/**
 * Type guard for valid collection names
 * Uses ChromaDB's strict naming requirements
 */
export function isValidCollectionName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 63 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(value)
  );
}
