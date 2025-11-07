/**
 * ChromaDB Filter Transformation Utilities
 *
 * Purpose: Provide type-safe, compile-time validated transformation
 * from application-level filters to ChromaDB-compliant where clauses.
 *
 * Problem Solved:
 * - ChromaDB's Where type requires explicit $and/$or operators for multiple conditions
 * - Direct object spreading { prop1, prop2, prop3 } violates the Where union type
 * - Runtime errors: "Expected 'where' to have exactly one operator, but got N"
 *
 * Solution:
 * - Type-safe filter builder with compile-time validation
 * - Automatic transformation of multi-property objects to $and clauses
 * - Centralized, reusable utility for all ChromaDB filter operations
 */

/**
 * Application-level filter object (before transformation)
 * Simple key-value pairs that developers naturally want to use
 */
export interface AppFilter {
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | boolean[]
    | undefined;
}

/**
 * ChromaDB Where clause types (imported from chromadb package)
 * These must match chromadb's type definitions exactly
 */
type LiteralValue = string | number | boolean;

type OperatorExpression =
  | { $gt: LiteralValue }
  | { $gte: LiteralValue }
  | { $lt: LiteralValue }
  | { $lte: LiteralValue }
  | { $ne: LiteralValue }
  | { $eq: LiteralValue }
  | { $in: LiteralValue[] }
  | { $nin: LiteralValue[] };

/**
 * ChromaDB Where type (union of three valid forms)
 * Source: chromadb package type definitions
 */
export type ChromaWhere =
  | { [key: string]: LiteralValue | OperatorExpression } // Single operator only!
  | { $and: ChromaWhere[] } // AND combination
  | { $or: ChromaWhere[] }; // OR combination

/**
 * Transform application filter to ChromaDB-compliant where clause
 *
 * Rules:
 * 1. Single property: Return as-is { key: value }
 * 2. Multiple properties: Wrap in $and operator { $and: [{ key1: value1 }, { key2: value2 }] }
 * 3. Undefined/null values: Filter out (don't include in where clause)
 * 4. Array values: Automatically use $in operator
 *
 * @param filter - Application-level filter object
 * @returns ChromaDB-compliant where clause
 *
 * @example
 * // Single property - returns as-is
 * toChromaWhere({ userId: "abc" })
 * // => { userId: "abc" }
 *
 * @example
 * // Multiple properties - wraps in $and
 * toChromaWhere({ threadId: "123", userId: "abc" })
 * // => { $and: [{ threadId: "123" }, { userId: "abc" }] }
 *
 * @example
 * // Array values - uses $in operator
 * toChromaWhere({ type: ["conversation", "agent_action"] })
 * // => { type: { $in: ["conversation", "agent_action"] } }
 *
 * @example
 * // Multiple properties with arrays
 * toChromaWhere({ threadId: "123", type: ["a", "b"] })
 * // => {
 * //      $and: [
 * //        { threadId: "123" },
 * //        { type: { $in: ["a", "b"] } }
 * //      ]
 * //    }
 */
export function toChromaWhere(
  filter: AppFilter | undefined
): ChromaWhere | undefined {
  // Handle empty filter
  if (!filter || Object.keys(filter).length === 0) {
    return undefined;
  }

  // Filter out undefined/null values
  const validEntries = Object.entries(filter).filter(
    ([_, value]) => value !== undefined && value !== null
  );

  if (validEntries.length === 0) {
    return undefined;
  }

  // Convert each entry to a ChromaWhere clause
  const whereClauses: ChromaWhere[] = validEntries.map(([key, value]) => {
    // Handle array values with $in operator
    if (Array.isArray(value)) {
      return { [key]: { $in: value as LiteralValue[] } } as ChromaWhere;
    }

    // Handle primitive values
    return { [key]: value as LiteralValue } as ChromaWhere;
  });

  // Single property: Return directly
  if (whereClauses.length === 1) {
    return whereClauses[0];
  }

  // Multiple properties: Wrap in $and
  return { $and: whereClauses };
}

/**
 * Build complex where clauses with AND/OR logic
 *
 * @example
 * buildWhereClause()
 *   .and({ userId: "abc" })
 *   .and({ type: ["conversation", "action"] })
 *   .or({ priority: "high" })
 *   .build()
 */
export class WhereClauseBuilder {
  private clauses: ChromaWhere[] = [];

  /**
   * Add AND condition
   */
  and(filter: AppFilter): this {
    const where = toChromaWhere(filter);
    if (where) {
      this.clauses.push(where);
    }
    return this;
  }

  /**
   * Add OR condition (combines all previous clauses with this one)
   */
  or(filter: AppFilter): this {
    const where = toChromaWhere(filter);
    if (where && this.clauses.length > 0) {
      // Combine existing clauses with new clause via OR
      this.clauses = [{ $or: [...this.clauses, where] }];
    } else if (where) {
      this.clauses.push(where);
    }
    return this;
  }

  /**
   * Build final ChromaWhere clause
   */
  build(): ChromaWhere | undefined {
    if (this.clauses.length === 0) {
      return undefined;
    }

    if (this.clauses.length === 1) {
      return this.clauses[0];
    }

    return { $and: this.clauses };
  }
}

/**
 * Create a where clause builder
 */
export function buildWhereClause(): WhereClauseBuilder {
  return new WhereClauseBuilder();
}

/**
 * Type guard to validate ChromaWhere structure
 */
export function isValidChromaWhere(value: unknown): value is ChromaWhere {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check for $and operator
  if ('$and' in obj) {
    return Array.isArray(obj.$and) && obj.$and.every(isValidChromaWhere);
  }

  // Check for $or operator
  if ('$or' in obj) {
    return Array.isArray(obj.$or) && obj.$or.every(isValidChromaWhere);
  }

  // Check for single property with value or operator
  const keys = Object.keys(obj);
  return keys.length === 1; // ChromaDB requires exactly one operator at this level
}

/**
 * Assert ChromaWhere validity (throws on invalid structure)
 */
export function assertValidChromaWhere(
  value: unknown,
  errorPrefix = 'Invalid ChromaDB where clause'
): asserts value is ChromaWhere {
  if (!isValidChromaWhere(value)) {
    throw new Error(
      `${errorPrefix}: ChromaDB where clauses must have exactly one operator per level. ` +
        `Use $and/$or for multiple conditions. Received: ${JSON.stringify(
          value
        )}`
    );
  }
}
