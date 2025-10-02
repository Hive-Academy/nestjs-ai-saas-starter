/**
 * Cypher Security Validation Module
 *
 * Provides comprehensive security validation for Cypher queries and parameters
 * to prevent injection attacks and other security vulnerabilities.
 */

import { Logger } from '@nestjs/common';

/**
 * Custom exception for Cypher security violations
 */
export class CypherSecurityException extends Error {
  constructor(
    message: string,
    public readonly violationType: string,
    public readonly context: string
  ) {
    super(message);
    this.name = 'CypherSecurityException';
  }
}

const cypherSecurityLogger = new Logger('CypherSecurity');

/**
 * Validates query security to prevent Cypher injection and other attacks
 *
 * @param query - Cypher query string to validate
 * @param params - Query parameters to validate
 * @param methodName - Method name for audit logging
 * @throws CypherSecurityException - When malicious patterns are detected
 */
export function validateQuerySecurity(
  query: string,
  params: Record<string, any>,
  methodName: string
): void {
  try {
    // 1. Validate query structure for dangerous Cypher operations
    const dangerousQueryPatterns = [
      // Administrative operations that should be blocked
      /CALL\s+dbms\.security/i,
      /CALL\s+dbms\.admin/i,
      /CALL\s+dbms\.user/i,
      /CALL\s+dbms\.cluster/i,

      // Dynamic query execution (can bypass validation)
      /CALL\s+apoc\.cypher\.run/i,
      /CALL\s+apoc\.cypher\.doIt/i,
      /CALL\s+apoc\.query/i,

      // File system access
      /LOAD\s+CSV\s+FROM\s+["'](?!file:\/\/\/)/i,
      /CALL\s+apoc\.export/i,
      /CALL\s+apoc\.import/i,

      // Schema manipulation combined with data operations (potential privilege escalation)
      /CREATE.*INDEX.*DROP/i,
      /CREATE.*CONSTRAINT.*DELETE/i,
      /MERGE.*DROP\s+/i,
      /MERGE.*DELETE\s+/i,

      // Suspicious comment patterns that might hide injection
      /\/\*.*?(DROP|DELETE|CREATE|ALTER).*?\*\//i,
      /--.*?(DROP|DELETE|CREATE|ALTER)/i,

      // Multiple statements (statement injection)
      /;\s*(MATCH|CREATE|MERGE|DELETE|DETACH|SET|REMOVE|CALL)/i,

      // Conditional execution that might bypass parameter validation
      /CASE\s+WHEN.*?(DROP|DELETE|CREATE)/i,
    ];

    for (const pattern of dangerousQueryPatterns) {
      if (pattern.test(query)) {
        const errorMessage = `Potentially malicious Cypher pattern detected in ${methodName}`;
        cypherSecurityLogger.error(`${errorMessage}: ${pattern.source}`);
        throw new CypherSecurityException(
          errorMessage,
          pattern.source,
          query.substring(0, 200) // Limit logged query length
        );
      }
    }

    // 2. Validate parameters for injection content
    validateParameterSafety(params, methodName);

    // 3. Additional structural validation
    validateQueryStructure(query, methodName);

    // 4. Log successful validation for audit trail
    cypherSecurityLogger.debug(
      `Query security validation passed for ${methodName}`
    );
  } catch (error) {
    if (error instanceof CypherSecurityException) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    cypherSecurityLogger.error(
      `Query security validation failed for ${methodName}: ${errorMessage}`
    );
    throw new CypherSecurityException(
      `Query security validation failed: ${errorMessage}`,
      'validation_error',
      query.substring(0, 200)
    );
  }
}

/**
 * Validate parameter safety to prevent injection through parameters
 *
 * @param params - Query parameters to validate
 * @param methodName - Method name for logging
 */
function validateParameterSafety(
  params: Record<string, any>,
  methodName: string
): void {
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Check for executable content in string parameters
      const maliciousStringPatterns = [
        // Cypher injection in parameters
        /RETURN\s+/i,
        /MATCH\s+/i,
        /CREATE\s+/i,
        /DELETE\s+/i,
        /MERGE\s+/i,
        /CALL\s+/i,

        // Script injection
        /<script\b/i,
        /javascript:/i,
        /eval\s*\(/i,
        /function\s*\(/i,

        // SQL injection (might be attempted by mistake)
        /UNION\s+SELECT/i,
        /INSERT\s+INTO/i,
        /UPDATE\s+.*SET/i,
        /DROP\s+TABLE/i,
      ];

      for (const pattern of maliciousStringPatterns) {
        if (pattern.test(value)) {
          cypherSecurityLogger.warn(
            `Malicious content detected in parameter '${key}' for ${methodName}`
          );
          throw new CypherSecurityException(
            `Malicious content detected in parameter '${key}'`,
            pattern.source,
            `Parameter: ${key} = ${value.substring(0, 100)}`
          );
        }
      }

      // Check for excessively long strings that might be injection attempts
      if (value.length > 10000) {
        cypherSecurityLogger.warn(
          `Unusually long parameter value in '${key}' for ${methodName}`
        );
        throw new CypherSecurityException(
          `Parameter '${key}' exceeds maximum allowed length`,
          'length_validation',
          `Parameter: ${key} (length: ${value.length})`
        );
      }
    }

    // Validate nested objects/arrays for injection content
    if (typeof value === 'object' && value !== null) {
      validateNestedParameterSafety(value, `${key}`, methodName);
    }
  }
}

/**
 * Recursively validate nested parameter objects for injection content
 *
 * @param obj - Object to validate
 * @param path - Current path for error reporting
 * @param methodName - Method name for logging
 */
function validateNestedParameterSafety(
  obj: any,
  path: string,
  methodName: string
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'string' && containsSuspiciousPatterns(item)) {
        throw new CypherSecurityException(
          `Malicious content detected in parameter array '${path}[${index}]'`,
          'array_injection',
          `Array item: ${item.substring(0, 100)}`
        );
      }
      if (typeof item === 'object' && item !== null) {
        validateNestedParameterSafety(item, `${path}[${index}]`, methodName);
      }
    });
  } else if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && containsSuspiciousPatterns(value)) {
        throw new CypherSecurityException(
          `Malicious content detected in nested parameter '${path}.${key}'`,
          'nested_injection',
          `Nested value: ${value.substring(0, 100)}`
        );
      }
      if (typeof value === 'object' && value !== null) {
        validateNestedParameterSafety(value, `${path}.${key}`, methodName);
      }
    });
  }
}

/**
 * Validate overall query structure for suspicious patterns
 *
 * @param query - Query string to validate
 * @param methodName - Method name for logging
 */
function validateQueryStructure(query: string, methodName: string): void {
  // Check for balanced parentheses and quotes (injection might unbalance these)
  const openParens = (query.match(/\(/g) || []).length;
  const closeParens = (query.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    cypherSecurityLogger.warn(
      `Unbalanced parentheses in query for ${methodName}`
    );
    throw new CypherSecurityException(
      'Query contains unbalanced parentheses',
      'structure_validation',
      `Open: ${openParens}, Close: ${closeParens}`
    );
  }

  // Check for suspicious character sequences
  const suspiciousSequences = [
    /['"]["']/, // Empty string concatenation
    /\\x[0-9a-fA-F]{2}/, // Hex encoding
    /\\u[0-9a-fA-F]{4}/, // Unicode encoding
    /\\\\/, // Escaped backslashes
  ];

  for (const sequence of suspiciousSequences) {
    if (sequence.test(query)) {
      cypherSecurityLogger.warn(
        `Suspicious character sequence in query for ${methodName}`
      );
      throw new CypherSecurityException(
        'Query contains suspicious character encoding',
        sequence.source,
        query.substring(0, 200)
      );
    }
  }
}

/**
 * Check for suspicious patterns that might indicate injection attempts
 */
function containsSuspiciousPatterns(value: string): boolean {
  const suspiciousPatterns = [
    /\b(DROP|DELETE|CREATE|ALTER|TRUNCATE)\s+/i,
    /;\s*(DROP|DELETE|CREATE|ALTER)/i,
    /UNION\s+SELECT/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(value));
}
