import 'reflect-metadata';
import type { z } from 'zod';
import { WORKFLOW_TOOLS_KEY } from './workflow.decorator';

/**
 * Options for @Tool decorator
 */
export interface ToolOptions {
  /** Tool name */
  name: string;
  /** Tool description for LLM */
  description: string;
  /** Zod schema for input validation */
  schema?: z.ZodSchema;
  /** Which agents/nodes can use this tool */
  agents?: string[] | '*';
  /** Rate limiting */
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
  /** Examples for few-shot learning */
  examples?: Array<{
    input: any;
    output: any;
    description?: string;
  }>;
  /** Whether tool supports streaming */
  streaming?: boolean;
  /** Tags for categorization */
  tags?: string[];
  /** Tool version */
  version?: string;
}

/**
 * Metadata stored for each tool
 */
export interface ToolMetadata extends ToolOptions {
  methodName: string;
  handler: () => Promise<any>;
  className?: string;
}

/**
 * Decorator to mark a method as a LangGraph tool
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class SearchTools {
 *   
 *   @Tool({
 *     name: 'search_knowledge_base',
 *     description: 'Search the knowledge base for relevant information',
 *     schema: z.object({
 *       query: z.string().describe('The search query'),
 *       limit: z.number().optional().default(10).describe('Max results'),
 *       filters: z.object({
 *         category: z.string().optional(),
 *         dateRange: z.object({
 *           start: z.date().optional(),
 *           end: z.date().optional()
 *         }).optional()
 *       }).optional()
 *     }),
 *     agents: ['researcher', 'analyst'],
 *     examples: [
 *       {
 *         input: { query: 'TypeScript decorators', limit: 5 },
 *         output: [{ title: 'Understanding Decorators', content: '...' }]
 *       }
 *     ]
 *   })
 *   async searchKnowledgeBase({ query, limit, filters }: {
 *     query: string;
 *     limit?: number;
 *     filters?: any;
 *   }) {
 *     // Tool implementation
 *     return this.vectorStore.search(query, { limit, filters });
 *   }
 *   
 *   @Tool({
 *     name: 'stream_search',
 *     description: 'Stream search results as they are found',
 *     streaming: true,
 *     agents: '*' // Available to all agents
 *   })
 *   async *streamSearch(query: string): AsyncIterableIterator<any> {
 *     // Streaming tool implementation
 *     yield* this.vectorStore.streamSearch(query);
 *   }
 * }
 * ```
 */
export function Tool(options: ToolOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Create tool metadata
    const toolMetadata: ToolMetadata = {
      ...options,
      methodName: String(propertyKey),
      handler: descriptor.value,
      className: target.constructor.name,
    };
    
    // Get existing tools or initialize
    const existingTools = Reflect.getMetadata(WORKFLOW_TOOLS_KEY, target.constructor) || [];
    
    // Add this tool
    existingTools.push(toolMetadata);
    
    // Store updated tools
    Reflect.defineMetadata(WORKFLOW_TOOLS_KEY, existingTools, target.constructor);
    
    // Also store on the method itself for direct access
    Reflect.defineMetadata('tool:metadata', toolMetadata, target, propertyKey);
    
    // Wrap the original method to add validation and rate limiting
    const originalMethod = descriptor.value;
    const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
    
    descriptor.value = async function(this: any, ...args: any[]) {
      // Validate input with Zod schema if provided
      if (options.schema) {
        try {
          const validated = options.schema.parse(args[0]);
          args[0] = validated; // Use validated/transformed input
        } catch (error) {
          if (this.logger) {
            this.logger.error(`Tool ${options.name} validation failed:`, error);
          }
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Invalid input for tool ${options.name}: ${errorMessage}`);
        }
      }
      
      // Check rate limiting
      if (options.rateLimit) {
        const now = Date.now();
        const key = `${toolMetadata.className}:${options.name}`;
        const limit = rateLimitMap.get(key);
        
        if (limit && limit.resetTime > now) {
          if (limit.count >= options.rateLimit.requests) {
            const waitTime = Math.ceil((limit.resetTime - now) / 1000);
            throw new Error(`Rate limit exceeded for tool ${options.name}. Try again in ${waitTime} seconds.`);
          }
          limit.count++;
        } else {
          rateLimitMap.set(key, {
            count: 1,
            resetTime: now + options.rateLimit.window,
          });
        }
      }
      
      // Log tool execution
      if (this.logger) {
        this.logger.debug(`Executing tool: ${options.name}`);
      }
      
      // Execute the original method
      try {
        const result = await originalMethod.apply(this, args);
        
        // Log success
        if (this.logger) {
          this.logger.debug(`Tool ${options.name} executed successfully`);
        }
        
        return result;
      } catch (error) {
        // Log error
        if (this.logger) {
          this.logger.error(`Tool ${options.name} failed:`, error);
        }
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Get all tools from a class
 */
export function getClassTools(target: any): ToolMetadata[] {
  return Reflect.getMetadata(WORKFLOW_TOOLS_KEY, target) || [];
}

/**
 * Get tool metadata from a method
 */
export function getToolMetadata(target: any, propertyKey: string | symbol): ToolMetadata | undefined {
  return Reflect.getMetadata('tool:metadata', target, propertyKey);
}

/**
 * Decorator for composed tools that orchestrate multiple tools
 */
export interface ComposedToolOptions extends ToolOptions {
  /** Component tools to orchestrate */
  components: string[];
  /** Orchestration strategy */
  strategy?: 'sequential' | 'parallel' | 'conditional';
}

/**
 * Decorator for tools that compose multiple other tools
 * 
 * @example
 * ```typescript
 * @ComposedTool({
 *   name: 'analyze_and_fix',
 *   description: 'Analyze code and automatically fix issues',
 *   components: ['analyze_code', 'generate_fix', 'apply_fix', 'run_tests'],
 *   strategy: 'sequential'
 * })
 * async analyzeAndFix(filePath: string) {
 *   const analysis = await this.executeTool('analyze_code', { filePath });
 *   if (analysis.issues.length > 0) {
 *     const fix = await this.executeTool('generate_fix', { issues: analysis.issues });
 *     await this.executeTool('apply_fix', { filePath, fix });
 *     return this.executeTool('run_tests', { filePath });
 *   }
 *   return { success: true, message: 'No issues found' };
 * }
 * ```
 */
export function ComposedTool(options: ComposedToolOptions): MethodDecorator {
  return Tool({
    ...options,
    tags: [...(options.tags || []), 'composed', options.strategy || 'sequential'],
  });
}

/**
 * Mark a tool as deprecated
 */
export function DeprecatedTool(reason: string, alternative?: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(this: any, ...args: any[]) {
      if (this.logger) {
        this.logger.warn(
          `Tool ${String(propertyKey)} is deprecated: ${reason}${ 
          alternative ? ` Use ${alternative} instead.` : ''}`
        );
      }
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}