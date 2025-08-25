/**
 * Neo4j Parameter Serializer Utilities
 * Centralizes parameter serialization logic for Neo4j queries
 */

/**
 * Serializes a date value for Neo4j datetime() function
 * Handles Date objects, ISO strings, timestamps, and null values
 */
export function serializeDateForNeo4j(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    // Validate and normalize the date string
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${value}`);
    }
    return date.toISOString();
  }

  if (typeof value === 'number') {
    // Assume it's a timestamp
    return new Date(value).toISOString();
  }

  throw new Error(`Cannot serialize value of type ${typeof value} as date`);
}

/**
 * Serializes parameters for Neo4j queries
 * Automatically handles dates, metadata, and other special types
 * This is the CORE serialization function that ensures Neo4j compatibility
 */
export function serializeNeo4jParams(
  params: Record<string, any>,
  options: {
    dateFields?: string[];
    jsonFields?: string[];
    intFields?: string[];
    deepSerialize?: boolean; // New option for deep serialization
  } = {}
): Record<string, any> {
  const {
    dateFields = [],
    jsonFields = [],
    intFields = [],
    deepSerialize = true, // Default to true for safety
  } = options;

  const serialized: Record<string, any> = {};

  // Common date field names to auto-detect
  const commonDateFields = [
    'startedAt',
    'completedAt',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'timestamp',
    'dateFrom',
    'dateTo',
  ];

  // Common JSON field names to auto-detect
  const commonJsonFields = [
    'metadata',
    'context',
    'config',
    'settings',
    'agentContext',
    'executionState',
    'graphState',
    'workflowContext',
    'initialContext',
    'multiAgentContext',
  ];

  for (const [key, value] of Object.entries(params)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    // Handle null values
    if (value === null) {
      serialized[key] = null;
      continue;
    }

    // Handle date fields
    if (
      dateFields.includes(key) ||
      commonDateFields.includes(key) ||
      key.toLowerCase().includes('date') ||
      key.toLowerCase().endsWith('at')
    ) {
      serialized[key] = serializeDateForNeo4j(value);
    }
    // Handle JSON fields - ALWAYS serialize complex objects
    else if (
      jsonFields.includes(key) ||
      commonJsonFields.includes(key) ||
      (deepSerialize && isComplexObject(value))
    ) {
      // Serialize any complex object to JSON string for Neo4j
      if (typeof value === 'object' && value !== null) {
        try {
          // Check for circular references
          JSON.stringify(value);
          serialized[key] = JSON.stringify(value);
        } catch (error) {
          // If circular reference, create a safe version
          serialized[key] = JSON.stringify(createSafeObject(value));
        }
      } else if (typeof value === 'string') {
        // If it's already a string, keep it as is
        serialized[key] = value;
      } else {
        serialized[key] = value;
      }
    }
    // Handle integer fields
    else if (intFields.includes(key)) {
      serialized[key] = value !== null ? Math.floor(Number(value)) : null;
    }
    // Handle arrays of primitives
    else if (Array.isArray(value) && !containsComplexObjects(value)) {
      serialized[key] = value;
    }
    // Handle primitive values
    else if (isPrimitive(value)) {
      serialized[key] = value;
    }
    // Default: serialize complex objects
    else {
      try {
        serialized[key] = JSON.stringify(value);
      } catch {
        serialized[key] = JSON.stringify(createSafeObject(value));
      }
    }
  }

  return serialized;
}

/**
 * Check if a value is a primitive type that Neo4j can handle
 */
function isPrimitive(value: any): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Check if an object is complex (has nested objects or arrays)
 */
function isComplexObject(obj: any): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  // Arrays of objects are complex
  if (Array.isArray(obj)) {
    return containsComplexObjects(obj);
  }

  // Check if any value is an object or array
  return Object.values(obj).some(
    (value) => value !== null && typeof value === 'object'
  );
}

/**
 * Check if an array contains complex objects
 */
function containsComplexObjects(arr: any[]): boolean {
  return arr.some((item) => item !== null && typeof item === 'object');
}

/**
 * Create a safe object without circular references
 */
function createSafeObject(obj: any, visited = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => createSafeObject(item, visited));
  }

  const safe: any = {};
  for (const [key, value] of Object.entries(obj)) {
    safe[key] = createSafeObject(value, visited);
  }

  return safe;
}

/**
 * Creates a parameter serializer with preset options
 * Useful for creating domain-specific serializers
 */
export function createParameterSerializer(
  defaultOptions: {
    dateFields?: string[];
    jsonFields?: string[];
    intFields?: string[];
  } = {}
) {
  return (
    params: Record<string, any>,
    overrideOptions?: typeof defaultOptions
  ) => {
    const mergedOptions = {
      dateFields: [
        ...(defaultOptions.dateFields || []),
        ...(overrideOptions?.dateFields || []),
      ],
      jsonFields: [
        ...(defaultOptions.jsonFields || []),
        ...(overrideOptions?.jsonFields || []),
      ],
      intFields: [
        ...(defaultOptions.intFields || []),
        ...(overrideOptions?.intFields || []),
      ],
    };
    return serializeNeo4jParams(params, mergedOptions);
  };
}

/**
 * Serializes update parameters for SET clauses
 * Returns both the SET clause string and the serialized parameters
 */
export function serializeUpdateParams(
  updates: Record<string, any>,
  options: {
    excludeFields?: string[];
    dateFields?: string[];
    jsonFields?: string[];
    intFields?: string[];
    deepSerialize?: boolean;
    prefix?: string;
  } = {}
): { setClause: string; params: Record<string, any> } {
  const {
    excludeFields = ['id', 'type'],
    prefix = 'n',
    ...serializerOptions
  } = options;

  const setClauses: string[] = [];
  const params = serializeNeo4jParams(updates, serializerOptions);

  for (const key of Object.keys(params)) {
    if (excludeFields.includes(key)) {
      continue;
    }

    // Special handling for date fields in SET clause
    if (
      serializerOptions.dateFields?.includes(key) ||
      key.toLowerCase().includes('date') ||
      key.toLowerCase().endsWith('at')
    ) {
      setClauses.push(`${prefix}.${key} = datetime($${key})`);
    } else {
      setClauses.push(`${prefix}.${key} = $${key}`);
    }
  }

  return {
    setClause: setClauses.join(', '),
    params,
  };
}
