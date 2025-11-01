/**
 * Core tool provider interface
 * All tool implementations must conform to this interface
 *
 * This interface enables the central registry to manage tools
 * without depending on specific tool implementations.
 */
export interface IToolProvider {
  name: string;
  description: string;
  schema?: any; // Zod schema or JSON schema
  function: (args: any) => Promise<any>;
  metadata?: Record<string, any>;
}
