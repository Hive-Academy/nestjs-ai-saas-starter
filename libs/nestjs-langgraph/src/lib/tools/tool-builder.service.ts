import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolRegistryService } from './tool-registry.service';

/**
 * Fluent builder for creating tools programmatically
 */
export class ToolBuilder {
  private name = '';
  private description = '';
  private schema?: z.ZodSchema<any>;
  private func?: (input: any) => Promise<any>;
  private agents?: string[] | '*';
  private tags?: string[];
  private examples?: Array<{ input: any; output: any; description?: string }>;

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  setSchema(schema: z.ZodSchema<any>): this {
    this.schema = schema;
    return this;
  }

  setFunction(func: (input: any) => Promise<any>): this {
    this.func = func;
    return this;
  }

  setAgents(agents: string[] | '*'): this {
    this.agents = agents;
    return this;
  }

  setTags(tags: string[]): this {
    this.tags = tags;
    return this;
  }

  addExample(example: { input: any; output: any; description?: string }): this {
    if (!this.examples) {
      this.examples = [];
    }
    this.examples.push(example);
    return this;
  }

  build(): DynamicStructuredTool {
    if (!this.name || !this.description || !this.func) {
      throw new Error('Tool requires name, description, and function');
    }

    return new DynamicStructuredTool({
      name: this.name,
      description: this.description,
      schema: this.schema || z.object({}).describe('No input required'),
      func: this.func,
    });
  }

  buildWithMetadata(): { tool: DynamicStructuredTool; metadata: any } {
    const tool = this.build();
    return {
      tool,
      metadata: {
        name: this.name,
        description: this.description,
        agents: this.agents,
        tags: this.tags,
        examples: this.examples,
      },
    };
  }
}

/**
 * Service for building tools programmatically
 */
@Injectable()
export class ToolBuilderService {
  constructor(private readonly toolRegistry: ToolRegistryService) {}

  /**
   * Create a new tool builder
   */
  createBuilder(): ToolBuilder {
    return new ToolBuilder();
  }

  /**
   * Create a simple tool without schema
   */
  createSimpleTool(
    name: string,
    description: string,
    func: () => Promise<string>,
  ): DynamicTool {
    return new DynamicTool({
      name,
      description,
      func,
    });
  }

  /**
   * Create a file operation tool
   */
  createFileTool(operation: 'read' | 'write' | 'delete'): DynamicStructuredTool {
    const schemas = {
      read: z.object({
        path: z.string().describe('File path to read'),
      }),
      write: z.object({
        path: z.string().describe('File path to write'),
        content: z.string().describe('Content to write'),
        createDirs: z.boolean().optional().describe('Create parent directories if needed'),
      }),
      delete: z.object({
        path: z.string().describe('File path to delete'),
      }),
    };

    return new DynamicStructuredTool({
      name: `file_${operation}`,
      description: `${operation.charAt(0).toUpperCase() + operation.slice(1)} a file`,
      schema: schemas[operation],
      func: async (input) => {
        // This would be implemented with actual file operations
        return `File ${operation} operation completed for: ${input.path}`;
      },
    });
  }

  /**
   * Create an HTTP request tool
   */
  createHttpTool(
    name: string,
    description: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  ): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name,
      description,
      schema: z.object({
        params: z.record(z.string(), z.any()).optional().describe('Query parameters'),
        body: z.any().optional().describe('Request body'),
        headers: z.record(z.string(), z.string()).optional().describe('Request headers'),
      }),
      func: async ({ params, body, headers }) => {
        // This would make actual HTTP requests
        return {
          endpoint,
          method,
          params,
          body,
          headers,
          response: 'Mock response',
        };
      },
    });
  }

  /**
   * Create a database query tool
   */
  createDatabaseTool(
    name: string,
    description: string,
    queryBuilder: (params: any) => string,
  ): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name,
      description,
      schema: z.object({
        table: z.string().describe('Table name'),
        filters: z.record(z.string(), z.any()).optional().describe('Query filters'),
        limit: z.number().optional().describe('Result limit'),
        orderBy: z.string().optional().describe('Order by field'),
      }),
      func: async (params) => {
        const query = queryBuilder(params);
        // This would execute actual database queries
        return {
          query,
          results: [],
          count: 0,
        };
      },
    });
  }

  /**
   * Create a tool that composes multiple other tools
   */
  createComposedTool(
    name: string,
    description: string,
    tools: string[],
    orchestrator: (tools: Map<string, DynamicStructuredTool>, input: any) => Promise<any>,
  ): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name,
      description,
      schema: z.object({
        input: z.any().describe('Input for the composed operation'),
      }),
      func: async ({ input }) => {
        // Get the component tools
        const toolMap = new Map<string, DynamicStructuredTool>();
        for (const toolName of tools) {
          const tool = this.toolRegistry.getTool(toolName);
          if (tool) {
            toolMap.set(toolName, tool);
          }
        }

        // Execute the orchestrator
        return orchestrator(toolMap, input);
      },
    });
  }

  /**
   * Create a conditional tool that executes based on conditions
   */
  createConditionalTool(
    name: string,
    description: string,
    conditions: Array<{
      condition: (input: any) => boolean;
      tool: string;
    }>,
    defaultTool?: string,
  ): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name,
      description,
      schema: z.object({
        input: z.any().describe('Input for conditional execution'),
      }),
      func: async ({ input }) => {
        // Check conditions and execute appropriate tool
        for (const { condition, tool: toolName } of conditions) {
          if (condition(input)) {
            const tool = this.toolRegistry.getTool(toolName);
            if (tool) {
              return tool.func(input);
            }
          }
        }

        // Execute default tool if no conditions match
        if (defaultTool) {
          const tool = this.toolRegistry.getTool(defaultTool);
          if (tool) {
            return tool.func(input);
          }
        }

        return { message: 'No conditions matched and no default tool specified' };
      },
    });
  }

  /**
   * Create a batch processing tool
   */
  createBatchTool(
    name: string,
    description: string,
    itemTool: string,
    options?: {
      concurrency?: number;
      continueOnError?: boolean;
    },
  ): DynamicStructuredTool {
    const concurrency = options?.concurrency || 5;
    const continueOnError = options?.continueOnError || false;

    return new DynamicStructuredTool({
      name,
      description,
      schema: z.object({
        items: z.array(z.any()).describe('Items to process'),
      }),
      func: async ({ items }) => {
        const tool = this.toolRegistry.getTool(itemTool);
        if (!tool) {
          throw new Error(`Tool ${itemTool} not found`);
        }

        const results = [];
        const errors = [];

        // Process in batches
        for (let i = 0; i < items.length; i += concurrency) {
          const batch = items.slice(i, i + concurrency);
          const batchPromises = batch.map(async (item: any, index: number) => {
            try {
              const result = await tool.func(item);
              return { index: i + index, success: true, result };
            } catch (error) {
              const errorResult = { 
                index: i + index, 
                success: false, 
                error: error instanceof Error ? error.message : String(error),
              };
              if (!continueOnError) {
                throw error;
              }
              return errorResult;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(r => r.success));
          errors.push(...batchResults.filter(r => !r.success));
        }

        return {
          processed: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        };
      },
    });
  }

  /**
   * Register a built tool with the registry
   */
  async registerTool(
    tool: DynamicStructuredTool,
    metadata?: {
      agents?: string[] | '*';
      tags?: string[];
    },
  ): Promise<void> {
    this.toolRegistry.registerDynamicTool(tool, metadata);
  }
}