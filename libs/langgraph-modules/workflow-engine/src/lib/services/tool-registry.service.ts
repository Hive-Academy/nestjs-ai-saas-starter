import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  DynamicStructuredTool,
  tool,
  ToolRuntime,
} from '@langchain/core/tools';
import { z } from 'zod';
import {
  getClassTools,
  ToolMetadata,
} from '../decorators/multi-agent/tool.decorator';
import { WorkflowAuthContext } from '../interfaces/auth-context.interface';

/**
 * ToolRegistryService
 *
 * Global singleton service for discovering and managing tools from @Tool decorated methods.
 *
 * ARCHITECTURE:
 * - Singleton scope with OnModuleInit lifecycle for eager tool discovery
 * - Tools registered via WorkflowEngineModule.forRoot({ tools: [...] })
 * - Uses ModuleRef for dynamic DI resolution of tool class instances
 * - Converts @Tool metadata to LangChain DynamicStructuredTool format
 * - Validates schemas and handles errors gracefully
 *
 * PERFORMANCE:
 * - Eager extraction at module init (< 50ms for 100 tools)
 * - In-memory Map caching for O(1) lookups
 * - Performance logging with warnings if > 100ms
 *
 * USAGE:
 * @example
 * // 1. Register tool classes in module
 * WorkflowEngineModule.forRoot({
 *   tools: [GitHubIntegrationTools, WebResearchTools]
 * })
 *
 * // 2. Query tools from registry
 * const tools = toolRegistry.getTools(['github-analyzer', 'web-search']);
 *
 * // 3. Bind to LLM
 * const llmWithTools = llm.bindTools(tools);
 */
@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, DynamicStructuredTool>();
  private readonly toolClasses = new Map<string, any>();

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject('WORKFLOW_ENGINE_TOOL_CLASSES')
    private readonly registeredToolClasses: any[]
  ) {}

  /**
   * OnModuleInit lifecycle hook - extracts tools from registered classes
   *
   * CRITICAL: Eager initialization ensures tools available before workflow execution
   */
  async onModuleInit(): Promise<void> {
    const startTime = performance.now();
    this.logger.log(
      `Registering ${this.registeredToolClasses.length} tool classes`
    );

    for (const ToolClass of this.registeredToolClasses) {
      await this.registerToolClass(ToolClass);
    }

    const duration = performance.now() - startTime;
    this.logger.log(
      `Tool registration completed in ${duration.toFixed(1)}ms - Total tools: ${
        this.tools.size
      }`
    );

    if (duration > 100) {
      this.logger.warn(
        `Tool registration took ${duration.toFixed(
          1
        )}ms - consider reducing tool count or optimizing schema validation`
      );
    }
  }

  /**
   * Register all @Tool methods from a tool class
   *
   * PROCESS:
   * 1. Get DI instance via ModuleRef (with injected dependencies)
   * 2. Extract @Tool metadata via getClassTools()
   * 3. Convert each tool to LangChain DynamicStructuredTool
   * 4. Store in registry with duplicate detection
   *
   * @param ToolClass - Tool provider class with @Tool decorated methods
   */
  private async registerToolClass(ToolClass: any): Promise<void> {
    try {
      // 1. Get DI instance (with injected dependencies like repositories, services)
      const toolInstance = this.moduleRef.get(ToolClass, { strict: false });

      // 2. Extract @Tool metadata (already stored by decorator via Reflect API)
      const toolsMetadata: ToolMetadata[] = getClassTools(ToolClass);

      if (toolsMetadata.length === 0) {
        this.logger.warn(
          `No @Tool decorated methods found in ${ToolClass.name} - verify decorator usage`
        );
        return;
      }

      this.logger.debug(
        `Processing ${toolsMetadata.length} tools from ${ToolClass.name}`
      );

      // 3. Convert each tool to LangChain DynamicStructuredTool
      for (const toolMeta of toolsMetadata) {
        this.validateToolSchema(toolMeta);

        const langchainTool = this.convertToLangChainTool(
          toolMeta,
          toolInstance
        );

        // 4. Store in registry with duplicate detection
        if (this.tools.has(toolMeta.name)) {
          const existingClass = this.toolClasses.get(toolMeta.name);
          throw new Error(
            `Duplicate tool name "${toolMeta.name}" found in ${ToolClass.name}. ` +
              `Already registered from ${existingClass?.name}. ` +
              `Tool names must be unique across all registered classes.`
          );
        }

        this.tools.set(toolMeta.name, langchainTool);
        this.toolClasses.set(toolMeta.name, ToolClass);

        this.logger.debug(
          `Registered tool: ${toolMeta.name} from ${ToolClass.name}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to register tool class ${ToolClass.name}: ${errorMessage}`,
        errorStack
      );
      throw error; // Fail fast during module initialization
    }
  }

  /**
   * Convert @Tool metadata to LangChain DynamicStructuredTool
   *
   * PATTERN: Wraps tool method in LangChain-compatible format
   * ERROR HANDLING: Returns error object (not throw) so LLM sees errors as tool output
   *
   * @param metadata - Tool metadata from @Tool decorator
   * @param instance - DI instance of tool class with method
   * @returns LangChain DynamicStructuredTool ready for llm.bindTools()
   */
  private convertToLangChainTool(
    metadata: ToolMetadata,
    instance: any
  ): DynamicStructuredTool {
    // Use tool() helper to get ToolRuntime support for auth context
    return tool(
      async (input: any, runtime: ToolRuntime<any, WorkflowAuthContext>) => {
        // AUTH ENFORCEMENT
        if (metadata.auth?.required) {
          const user = runtime.context?.user;

          if (!user) {
            return {
              error: true,
              message: 'Authentication required',
              tool: metadata.name,
              timestamp: new Date().toISOString(),
            };
          }

          // Role validation
          if (metadata.auth.roles?.length) {
            const hasRole = metadata.auth.roles.some((r) =>
              user.roles.includes(r)
            );
            if (!hasRole) {
              return {
                error: true,
                message: `Requires role: ${metadata.auth.roles.join(' or ')}`,
                tool: metadata.name,
                timestamp: new Date().toISOString(),
              };
            }
          }

          // Tier validation
          if (metadata.auth.tiers?.length) {
            if (!metadata.auth.tiers.includes(user.tier)) {
              return {
                error: true,
                message: `Requires ${metadata.auth.tiers.join(' or ')} tier`,
                tool: metadata.name,
                timestamp: new Date().toISOString(),
              };
            }
          }

          // Permission validation
          if (metadata.auth.permissions?.length) {
            const hasAllPerms = metadata.auth.permissions.every((p) =>
              user.permissions.includes(p)
            );
            if (!hasAllPerms) {
              return {
                error: true,
                message: `Missing permissions: ${metadata.auth.permissions.join(
                  ', '
                )}`,
                tool: metadata.name,
                timestamp: new Date().toISOString(),
              };
            }
          }
        }

        try {
          // Bind instance context when invoking tool method
          const result = await instance[metadata.methodName](input);
          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Tool ${metadata.name} execution failed: ${errorMessage}`,
            errorStack
          );

          // Return error as tool output (LLM will see this as ToolMessage content)
          // CRITICAL: Don't throw - let workflow continue with error context
          return {
            error: true,
            message: errorMessage,
            tool: metadata.name,
            timestamp: new Date().toISOString(),
          };
        }
      },
      {
        name: metadata.name,
        description: metadata.description,
        schema: metadata.schema || z.object({}),
      }
    ) as any as DynamicStructuredTool;
  }

  /**
   * Validate tool schema for LLM compatibility
   *
   * VALIDATION:
   * - Tool name required (used for LLM function calling)
   * - Description recommended (helps LLM understand when to use tool)
   * - Schema must be valid Zod schema (test with safeParse)
   *
   * @param metadata - Tool metadata to validate
   * @throws Error if validation fails (fail fast during registration)
   */
  private validateToolSchema(metadata: ToolMetadata): void {
    if (!metadata.name) {
      throw new Error(
        `Tool missing name in method ${metadata.methodName} - name is required for LLM function calling`
      );
    }

    if (!metadata.description) {
      this.logger.warn(
        `Tool ${metadata.name} missing description - LLM effectiveness will be reduced. ` +
          `Add description to help LLM understand when to use this tool.`
      );
    }

    if (metadata.schema) {
      try {
        // Basic schema validation - test with empty object
        metadata.schema.safeParse({});
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Tool ${metadata.name} has invalid schema: ${errorMessage}. ` +
            `Ensure schema is a valid Zod schema.`
        );
      }
    }
  }

  /**
   * Query tools by names or return all tools
   *
   * PATTERNS:
   * - toolNames undefined/empty → return all tools
   * - toolNames includes '*' → return all tools (wildcard)
   * - toolNames = ['tool1', 'tool2'] → return specific tools
   * - Missing tools logged as warnings (not errors)
   *
   * @param toolNames - Optional array of tool names to filter
   * @returns Array of LangChain DynamicStructuredTool instances
   */
  getTools(toolNames?: string[]): DynamicStructuredTool[] {
    // Wildcard or no filter → return all tools
    if (!toolNames || toolNames.length === 0 || toolNames.includes('*')) {
      return Array.from(this.tools.values());
    }

    // Filter by specific tool names
    const selectedTools = toolNames
      .map((name) => {
        const tool = this.tools.get(name);
        if (!tool) {
          this.logger.warn(
            `Tool not found: ${name} - Available: ${Array.from(
              this.tools.keys()
            ).join(', ')}`
          );
        }
        return tool;
      })
      .filter((tool): tool is DynamicStructuredTool => tool !== undefined);

    return selectedTools;
  }

  /**
   * Get registry statistics for monitoring and debugging
   *
   * @returns Object with registry stats (total tools, names, memory estimate)
   */
  getStats(): {
    totalTools: number;
    toolClasses: number;
    toolNames: string[];
    memoryEstimate: string;
  } {
    return {
      totalTools: this.tools.size,
      toolClasses: this.toolClasses.size,
      toolNames: Array.from(this.tools.keys()),
      memoryEstimate: `~${this.tools.size * 50}KB`, // Rough estimate
    };
  }
}
