import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

/**
 * State field definition for automatic annotation building
 */
export interface StateFieldDefinition<T = any> {
  /**
   * TypeScript type (for documentation purposes)
   * Not used in runtime, but helps with IDE autocomplete
   */
  type?: string;

  /**
   * Default value or factory function
   */
  default: T | (() => T);

  /**
   * Optional custom reducer function
   * If not provided, uses sensible defaults based on the type
   */
  reducer?: (current: T, update: T) => T;

  /**
   * Optional description for documentation
   */
  description?: string;
}

/**
 * State schema definition - simple object mapping field names to definitions
 */
export interface StateSchema {
  [fieldName: string]: StateFieldDefinition;
}

/**
 * Default reducer strategies based on value type
 */
const DEFAULT_REDUCERS = {
  /**
   * For primitives (string, number, boolean), latest value wins
   */
  primitive: <T>(current: T, update: T) =>
    update !== undefined ? update : current,

  /**
   * For arrays, concatenate (for message-like behavior)
   */
  array: <T>(current: T[], update: T[]) => [...current, ...update],

  /**
   * For objects, shallow merge
   */
  object: <T extends Record<string, any>>(current: T, update: T) => ({
    ...current,
    ...update,
  }),
};

/**
 * Infer appropriate reducer based on default value
 */
function inferReducer<T>(
  defaultValue: T | (() => T)
): (current: T, update: T) => T {
  const actualDefault =
    typeof defaultValue === 'function'
      ? (defaultValue as () => T)()
      : defaultValue;

  if (Array.isArray(actualDefault)) {
    return DEFAULT_REDUCERS.array as any;
  }

  if (actualDefault !== null && typeof actualDefault === 'object') {
    return DEFAULT_REDUCERS.object as any;
  }

  return DEFAULT_REDUCERS.primitive;
}

/**
 * 🔑 BUILD STATE ANNOTATION FROM SIMPLE SCHEMA
 *
 * Converts a simple object schema into a LangGraph Annotation.Root() object.
 * This standardizes state annotation creation across all agents and workflows.
 *
 * **Benefits**:
 * - ✅ Simple object syntax instead of verbose Annotation calls
 * - ✅ Automatic reducer inference based on default values
 * - ✅ Extends AgentStateAnnotation automatically (includes messages, metadata, etc.)
 * - ✅ Type-safe with TypeScript inference
 * - ✅ Consistent pattern across all workflows
 *
 * **Usage in @Agent decorator**:
 * ```typescript
 * import { buildStateAnnotation } from '@hive-academy/langgraph-workflow-engine';
 *
 * @Agent({
 *   workflow: {
 *     channels: buildStateAnnotation({
 *       userId: { default: '' },
 *       query: { default: '' },
 *       results: { default: [] }, // Arrays auto-concat
 *       metadata: { default: {} }, // Objects auto-merge
 *       confidence: { default: 0.0, reducer: (_, update) => update }, // Custom reducer
 *     }),
 *   },
 * })
 * ```
 *
 * **Automatic reducer strategies**:
 * - Primitives (string, number, boolean): Latest value wins
 * - Arrays: Concatenate (like messages)
 * - Objects: Shallow merge (like metadata)
 * - Custom: Provide explicit reducer function
 *
 * @param schema - Object mapping field names to StateFieldDefinition
 * @param extendAgentState - Whether to include base AgentState fields (default: true)
 * @returns Annotation.Root() object ready for StateGraph initialization
 *
 * @example Simple state
 * ```typescript
 * const StateAnnotation = buildStateAnnotation({
 *   query: { default: '' },
 *   result: { default: '' },
 * });
 * ```
 *
 * @example Complex state with custom reducers
 * ```typescript
 * const StateAnnotation = buildStateAnnotation({
 *   userId: { default: '', description: 'User identifier' },
 *   searchResults: { default: [] }, // Auto-concat
 *   config: { default: {} }, // Auto-merge
 *   score: {
 *     default: 0,
 *     reducer: (current, update) => Math.max(current, update), // Keep highest score
 *   },
 * });
 * ```
 */
export function buildStateAnnotation(
  schema: StateSchema,
  options: {
    /**
     * Whether to extend AgentStateAnnotation (includes messages, metadata, etc.)
     * Default: true
     */
    extendAgentState?: boolean;
  } = {}
) {
  const { extendAgentState = true } = options;

  // Convert schema to Annotation fields
  const annotationFields: Record<string, any> = {};

  for (const [fieldName, fieldDef] of Object.entries(schema)) {
    const { default: defaultValue, reducer: customReducer } = fieldDef;

    annotationFields[fieldName] = Annotation({
      reducer: customReducer || inferReducer(defaultValue),
      default:
        typeof defaultValue === 'function' ? defaultValue : () => defaultValue,
    });
  }

  // Build final annotation
  if (extendAgentState) {
    // Extend AgentStateAnnotation (includes messages, metadata, next, etc.)
    return Annotation.Root({
      ...AgentStateAnnotation.spec,
      ...annotationFields,
    });
  } else {
    // Standalone annotation
    return Annotation.Root(annotationFields);
  }
}

/**
 * Type helper to derive TypeScript type from state schema
 * Use this with buildStateAnnotation to get proper type inference
 *
 * @example
 * ```typescript
 * const StateAnnotation = buildStateAnnotation({
 *   userId: { default: '' },
 *   score: { default: 0 },
 * });
 *
 * type MyState = InferStateType<typeof StateAnnotation>;
 * // MyState = AgentState & { userId: string; score: number; }
 * ```
 */
export type InferStateType<T> = T extends { State: infer S } ? S : never;
