import { z } from 'zod';

/**
 * Auth context schema for workflow execution
 *
 * This schema defines the authentication and authorization context that is passed
 * to workflows and tools via RunnableConfig.context when invoking workflows.
 *
 * @example
 * ```typescript
 * // Pass auth context when invoking workflow
 * await workflow.invoke(input, {
 *   context: {
 *     user: {
 *       id: 'user-123',
 *       email: 'user@example.com',
 *       roles: ['user', 'admin'],
 *       tier: 'pro',
 *       permissions: ['read:data', 'write:data']
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Access in tool via ToolRuntime
 * const myTool = tool(
 *   async (input, runtime: ToolRuntime<any, WorkflowAuthContext>) => {
 *     const user = runtime.context?.user;
 *     if (!user) return { error: 'Authentication required' };
 *     // ... tool logic
 *   },
 *   { name: 'my-tool', schema: z.object({}) }
 * );
 * ```
 */
export const WorkflowAuthContextSchema = z.object({
  /**
   * Authenticated user information
   */
  user: z
    .object({
      /** Unique user identifier */
      id: z.string(),
      /** User email address */
      email: z.string(),
      /** User roles for role-based access control */
      roles: z.array(z.string()),
      /** User subscription tier */
      tier: z.enum(['free', 'pro', 'enterprise']),
      /** User permissions for fine-grained access control */
      permissions: z.array(z.string()),
    })
    .optional(),
  /**
   * Session information
   */
  session: z
    .object({
      /** Session identifier */
      id: z.string(),
      /** Session creation timestamp */
      createdAt: z.date(),
    })
    .optional(),
});

/**
 * TypeScript type for workflow auth context
 * Inferred from WorkflowAuthContextSchema
 */
export type WorkflowAuthContext = z.infer<typeof WorkflowAuthContextSchema>;
