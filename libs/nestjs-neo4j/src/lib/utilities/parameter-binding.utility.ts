import type { BindParam } from 'neogma';

/**
 * Standardized utility for Neo4j parameter binding using Neogma's BindParam
 *
 * CRITICAL: This utility encapsulates the correct usage of Neogma's BindParam API
 * to prevent "key already in bind param" constraint errors.
 *
 * **Why This Matters:**
 * - Neogma's `bindParam.add(value)` expects an object `{ key: value }` and returns `this` for chaining
 * - Passing raw values causes implicit type coercion to objects with numeric keys ("0", "1", "2")
 * - Multiple parameters reuse keys → NeogmaConstraintError: "key 0 already in bind param"
 *
 * **Correct API:**
 * - `bindParam.getUniqueNameAndAdd(suffix, value)` generates unique parameter names
 * - Returns the generated parameter name for use in Cypher queries
 * - Prevents all key collision errors
 *
 * @see {@link https://github.com/danstarns/neogma/blob/main/src/Queries/BindParam/BindParam.ts BindParam Source}
 *
 * @example
 * ```typescript
 * // Using this utility (CORRECT)
 * const bindParam = new BindParam();
 * const nameParam = ParameterBindingUtility.addParam(bindParam, 'name', 'John');
 * const ageParam = ParameterBindingUtility.addParam(bindParam, 'age', 30);
 * const query = `MATCH (u:User {name: $${nameParam}, age: $${ageParam}}) RETURN u`;
 * // Result: MATCH (u:User {name: $name, age: $age}) RETURN u
 *
 * // Using raw API incorrectly (WRONG - DO NOT DO THIS)
 * const nameParam = bindParam.add('John'); // ❌ Returns BindParam, not string
 * const ageParam = bindParam.add(30);      // ❌ Throws "key 0 already in bind param"
 * ```
 *
 * @packageDocumentation
 */
export class ParameterBindingUtility {
  /**
   * Add a single parameter with unique name generation
   *
   * This method encapsulates Neogma's `getUniqueNameAndAdd()` API which:
   * - Generates a unique parameter name based on the provided key suffix
   * - Adds the value to the BindParam instance
   * - Returns the generated parameter name (NOT the BindParam instance)
   *
   * The returned parameter name can be used directly in Cypher queries with the `$` prefix.
   *
   * @param bindParam - Neogma BindParam instance
   * @param key - Parameter key used as suffix for unique naming (e.g., 'userId', 'name')
   * @param value - Parameter value (any valid Neo4j type)
   * @returns Unique parameter name (without $ prefix) - e.g., 'userId', 'userId__a', 'userId__b'
   *
   * @example
   * ```typescript
   * const bindParam = new BindParam();
   * const userIdParam = ParameterBindingUtility.addParam(bindParam, 'userId', '123');
   * const query = `MATCH (u:User {id: $${userIdParam}}) RETURN u`;
   * // query = "MATCH (u:User {id: $userId}) RETURN u"
   * // bindParam.get() = { userId: '123' }
   * ```
   */
  static addParam(bindParam: BindParam, key: string, value: any): string {
    return bindParam.getUniqueNameAndAdd(key, value);
  }

  /**
   * Add multiple parameters at once and return mapping of keys to parameter names
   *
   * This method iterates through an object of key-value pairs and adds each as a
   * unique parameter. Undefined values are automatically skipped.
   *
   * Useful for dynamic property objects where you want to bind all properties at once.
   *
   * @param bindParam - Neogma BindParam instance
   * @param params - Object with key-value pairs to add as parameters
   * @returns Object mapping original keys to unique parameter names
   *
   * @example
   * ```typescript
   * const bindParam = new BindParam();
   * const params = { name: 'John', age: 30, city: 'NYC' };
   * const paramNames = ParameterBindingUtility.addParams(bindParam, params);
   * // paramNames = { name: 'name', age: 'age', city: 'city' }
   *
   * const setParts = Object.entries(paramNames).map(
   *   ([key, paramName]) => `${key}: $${paramName}`
   * );
   * const query = `CREATE (u:User {${setParts.join(', ')}}) RETURN u`;
   * // query = "CREATE (u:User {name: $name, age: $age, city: $city}) RETURN u"
   * ```
   *
   * @example
   * ```typescript
   * // With undefined values (automatically skipped)
   * const bindParam = new BindParam();
   * const params = { name: 'John', age: undefined, city: 'NYC' };
   * const paramNames = ParameterBindingUtility.addParams(bindParam, params);
   * // paramNames = { name: 'name', city: 'city' } (age skipped)
   * ```
   */
  static addParams(
    bindParam: BindParam,
    params: Record<string, any>
  ): Record<string, string> {
    const paramNames: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        paramNames[key] = bindParam.getUniqueNameAndAdd(key, value);
      }
    }
    return paramNames;
  }

  /**
   * Add optional parameter (skip if undefined or null)
   *
   * This method handles optional parameters gracefully by returning `null` if the
   * value is undefined or null, allowing conditional query building.
   *
   * @param bindParam - Neogma BindParam instance
   * @param key - Parameter key used as suffix for unique naming
   * @param value - Parameter value (can be undefined or null)
   * @returns Unique parameter name if value exists, null otherwise
   *
   * @example
   * ```typescript
   * const bindParam = new BindParam();
   * const whereClauses: string[] = [];
   *
   * const nameParam = ParameterBindingUtility.addOptionalParam(bindParam, 'name', 'John');
   * if (nameParam) {
   *   whereClauses.push(`u.name = $${nameParam}`);
   * }
   *
   * const ageParam = ParameterBindingUtility.addOptionalParam(bindParam, 'age', undefined);
   * if (ageParam) {
   *   whereClauses.push(`u.age = $${ageParam}`); // Not added (age is undefined)
   * }
   *
   * const query = `MATCH (u:User) WHERE ${whereClauses.join(' AND ')} RETURN u`;
   * // query = "MATCH (u:User) WHERE u.name = $name RETURN u"
   * ```
   */
  static addOptionalParam(
    bindParam: BindParam,
    key: string,
    value: any
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    return bindParam.getUniqueNameAndAdd(key, value);
  }
}
