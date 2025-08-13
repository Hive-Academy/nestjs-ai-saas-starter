/**
 * Metadata utility functions for ChromaDB operations
 */

/**
 * Sanitize metadata to ensure ChromaDB compatibility
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip null or undefined values
    if (value === null || value === undefined) {
      continue;
    }

    // Sanitize key (remove invalid characters)
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Convert value to supported types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (typeof value === 'object') {
      // Convert objects to JSON strings
      sanitized[sanitizedKey] = JSON.stringify(value);
    } else {
      // Convert other types to strings
      sanitized[sanitizedKey] = String(value);
    }
  }

  return sanitized;
}

/**
 * Validate metadata for ChromaDB compatibility
 */
export function validateMetadata(
  metadata: Record<string, unknown>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof metadata !== 'object') {
    return { isValid: false, errors: ['Metadata must be an object'] };
  }

  for (const [key, value] of Object.entries(metadata)) {
    // Check key format
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      errors.push(`Invalid metadata key "${key}": only alphanumeric, underscore, and dash characters are allowed`);
    }

    // Check value types
    if (value !== null && value !== undefined) {
      const valueType = typeof value;
      if (!['string', 'number', 'boolean'].includes(valueType)) {
        errors.push(`Invalid metadata value type for "${key}": ${valueType}. Only string, number, and boolean are supported`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple metadata objects with conflict resolution
 */
export function mergeMetadata(
  ...metadataObjects: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const metadata of metadataObjects) {
    if (metadata && typeof metadata === 'object') {
      Object.assign(result, metadata);
    }
  }

  return result;
}

/**
 * Filter metadata based on allowed keys
 */
export function filterMetadata(
  metadata: Record<string, unknown>,
  allowedKeys: string[]
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (key in metadata) {
      filtered[key] = metadata[key];
    }
  }

  return filtered;
}

/**
 * Extract specific fields from metadata
 */
export function extractMetadataFields<T extends Record<string, unknown>>(
  metadata: Record<string, unknown>,
  fields: Array<keyof T>
): Partial<T> {
  const extracted: Partial<T> = {};

  for (const field of fields) {
    if (field in metadata) {
      extracted[field] = metadata[field as string];
    }
  }

  return extracted;
}

/**
 * Convert metadata to ChromaDB where clause
 */
export function metadataToWhereClause(
  metadata: Record<string, unknown>,
  operator: 'and' | 'or' = 'and'
): Record<string, unknown> {
  const conditions: Array<Record<string, unknown>> = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      // Array values become $in conditions
      conditions.push({ [key]: { $in: value } });
    } else if (typeof value === 'object' && value.constructor === Object) {
      // Object values are treated as operators
      conditions.push({ [key]: value });
    } else {
      // Primitive values become equality conditions
      conditions.push({ [key]: { $eq: value } });
    }
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    [`$${operator}`]: conditions,
  };
}

/**
 * Add default metadata fields
 */
export function addDefaultMetadata(
  metadata: Record<string, unknown> = {},
  defaults: {
    timestamp?: boolean;
    version?: string;
    source?: string;
    [key: string]: unknown;
  } = {}
): Record<string, unknown> {
  const result = { ...metadata };

  // Add timestamp if requested
  if (defaults.timestamp) {
    result.created_at = result.created_at ?? new Date().toISOString();
  }

  // Add version if provided
  if (defaults.version) {
    result.version = result.version ?? defaults.version;
  }

  // Add source if provided
  if (defaults.source) {
    result.source = result.source ?? defaults.source;
  }

  // Add any other default fields
  for (const [key, value] of Object.entries(defaults)) {
    if (!['timestamp', 'version', 'source'].includes(key)) {
      result[key] = result[key] ?? value;
    }
  }

  return result;
}

/**
 * Convert metadata for display purposes
 */
export function formatMetadataForDisplay(
  metadata: Record<string, unknown>,
  options: {
    maxStringLength?: number;
    parseJsonStrings?: boolean;
    formatDates?: boolean;
  } = {}
): Record<string, unknown> {
  const {
    maxStringLength = 100,
    parseJsonStrings = true,
    formatDates = true,
  } = options;

  const formatted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    let formattedValue = value;

    if (typeof value === 'string') {
      // Try to parse JSON strings if requested
      if (parseJsonStrings && (value.startsWith('{') || value.startsWith('['))) {
        try {
          formattedValue = JSON.parse(value);
        } catch {
          // Keep as string if parsing fails
        }
      }

      // Format dates if requested
      if (formatDates && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        try {
          formattedValue = new Date(value).toLocaleString();
        } catch {
          // Keep as string if date parsing fails
        }
      }

      // Truncate long strings
      if (typeof formattedValue === 'string' && formattedValue.length > maxStringLength) {
        formattedValue = `${formattedValue.substring(0, maxStringLength)  }...`;
      }
    }

    formatted[key] = formattedValue;
  }

  return formatted;
}

/**
 * Create metadata schema for validation
 */
export interface MetadataSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    enum?: unknown[];
    min?: number;
    max?: number;
    pattern?: RegExp;
    description?: string;
  };
}

/**
 * Validate metadata against a schema
 */
export function validateMetadataSchema(
  metadata: Record<string, unknown>,
  schema: MetadataSchema
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const [field, config] of Object.entries(schema)) {
    if (config.required && !(field in metadata)) {
      errors.push(`Required field "${field}" is missing`);
    }
  }

  // Validate existing fields
  for (const [field, value] of Object.entries(metadata)) {
    const config = schema[field];
    if (config === undefined) {
      // Allow additional fields not in schema
      continue;
    }

    // Type validation
    if (typeof value !== config.type) {
      errors.push(`Field "${field}" should be of type ${config.type}, got ${typeof value}`);
      continue;
    }

    // Enum validation
    if (config.enum && !config.enum.includes(value)) {
      errors.push(`Field "${field}" should be one of [${config.enum.join(', ')}], got "${String(value)}"`);
    }

    // Number range validation
    if (config.type === 'number') {
      if (config.min !== undefined && value < config.min) {
        errors.push(`Field "${field}" should be >= ${config.min}, got ${String(value)}`);
      }
      if (config.max !== undefined && value > config.max) {
        errors.push(`Field "${field}" should be <= ${config.max}, got ${String(value)}`);
      }
    }

    // String pattern validation
    if (config.type === 'string' && config.pattern && !config.pattern.test(value)) {
      errors.push(`Field "${field}" does not match required pattern`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
