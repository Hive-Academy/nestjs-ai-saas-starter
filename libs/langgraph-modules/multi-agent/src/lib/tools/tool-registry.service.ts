import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolMetadata, getClassTools } from '../decorators/tool.decorator';

/**
 * Tool registration and discovery service
 * Automatically discovers and registers tools decorated with @Tool
 */
@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, DynamicStructuredTool>();
  private readonly toolMetadata = new Map<string, ToolMetadata>();
  private readonly agentTools = new Map<string, Set<string>>();

  constructor(private readonly discoveryService: DiscoveryService) {}

  async onModuleInit() {
    await this.discoverTools();
  }

  /**
   * Discover all tools in the application
   */
  private async discoverTools() {
    // Import the discovery filter utility
    const { DiscoveryFilterUtil } = await import('../utils/discovery-filter.util');
    
    // Use intelligent filtering to only scan providers with @Tool decorated methods
    const providers = await this.discoveryService.providers(
      DiscoveryFilterUtil.createToolFilter(['ToolRegistryService'])
    );

    this.logger.debug(`Scanning ${providers.length} tool providers (filtered from all available providers)`);

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      // Get tools from class metadata
      const tools = getClassTools(instance.constructor);

      for (const toolMeta of tools) {
        await this.registerTool(toolMeta, instance);
      }
    }

    this.logger.log(`Discovered and registered ${this.tools.size} tools from ${providers.length} providers`);
  }

  /**
   * Register a tool
   */
  private async registerTool(metadata: ToolMetadata, instance: any) {
    const { name, description, schema, agents, methodName } = metadata;

    // Create LangGraph DynamicStructuredTool
    const tool = new DynamicStructuredTool({
      name,
      description,
      schema: schema || z.object({}).describe('No input required'),
      func: async (input: any) => {
        // Get the method from the instance
        const method = instance[methodName];
        if (!method) {
          throw new Error(`Method ${methodName} not found on instance`);
        }

        // Execute the tool
        try {
          const result = await method.call(instance, input);
          return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error) {
          this.logger.error(`Tool ${name} execution failed:`, error);
          throw error;
        }
      },
    });

    // Register the tool
    this.tools.set(name, tool);
    this.toolMetadata.set(name, metadata);

    // Register agent associations
    if (agents) {
      if (agents === '*') {
        // Available to all agents
        this.agentTools.set(
          '*',
          (this.agentTools.get('*') || new Set()).add(name)
        );
      } else if (Array.isArray(agents)) {
        // Available to specific agents
        for (const agent of agents) {
          const agentToolSet = this.agentTools.get(agent) || new Set();
          agentToolSet.add(name);
          this.agentTools.set(agent, agentToolSet);
        }
      }
    }

    this.logger.debug(`Registered tool: ${name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): DynamicStructuredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get tools for a specific agent
   */
  getToolsForAgent(agentId: string): DynamicStructuredTool[] {
    const tools: DynamicStructuredTool[] = [];

    // Get agent-specific tools
    const agentToolNames = this.agentTools.get(agentId) || new Set();
    for (const toolName of agentToolNames) {
      const tool = this.tools.get(toolName);
      if (tool) {
        tools.push(tool);
      }
    }

    // Get universal tools (available to all agents)
    const universalTools = this.agentTools.get('*') || new Set();
    for (const toolName of universalTools) {
      const tool = this.tools.get(toolName);
      if (tool && !agentToolNames.has(toolName)) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): DynamicStructuredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(name: string): ToolMetadata | undefined {
    return this.toolMetadata.get(name);
  }

  /**
   * Register a tool dynamically at runtime
   */
  registerDynamicTool(
    tool: DynamicStructuredTool,
    metadata?: Partial<ToolMetadata>
  ): void {
    const { name } = tool;
    this.tools.set(name, tool);

    if (metadata) {
      this.toolMetadata.set(name, {
        name,
        description: tool.description,
        methodName: 'dynamic',
        handler: async () => tool.func({}),
        ...metadata,
      });

      // Register agent associations
      if (metadata.agents) {
        if (metadata.agents === '*') {
          this.agentTools.set(
            '*',
            (this.agentTools.get('*') || new Set()).add(name)
          );
        } else if (Array.isArray(metadata.agents)) {
          for (const agent of metadata.agents) {
            const agentToolSet = this.agentTools.get(agent) || new Set();
            agentToolSet.add(name);
            this.agentTools.set(agent, agentToolSet);
          }
        }
      }
    }

    this.logger.debug(`Dynamically registered tool: ${name}`);
  }

  /**
   * Remove a tool
   */
  removeTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    this.toolMetadata.delete(name);

    // Remove from agent associations
    for (const [, toolSet] of this.agentTools.entries()) {
      toolSet.delete(name);
    }

    if (deleted) {
      this.logger.debug(`Removed tool: ${name}`);
    }

    return deleted;
  }

  /**
   * Get tools by tags
   */
  getToolsByTags(tags: string[]): DynamicStructuredTool[] {
    const tools: DynamicStructuredTool[] = [];

    for (const [name, metadata] of this.toolMetadata.entries()) {
      if (metadata.tags && tags.some((tag) => metadata.tags?.includes(tag))) {
        const tool = this.tools.get(name);
        if (tool) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  /**
   * Clear all tools
   */
  clearTools(): void {
    this.tools.clear();
    this.toolMetadata.clear();
    this.agentTools.clear();
    this.logger.debug('Cleared all tools');
  }
}
