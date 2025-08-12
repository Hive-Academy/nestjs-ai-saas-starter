import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentType } from '@internal/shared';

import {
  ToolMetadata,
  getClassTools,
  getToolMetadata,
} from '../decorators/tool.decorator';
import { ToolRegistryService } from './tool-registry.service';
import { MetadataProcessorService } from '../core/metadata-processor.service';

/**
 * Statistics about discovered tools
 */
export interface ToolDiscoveryStats {
  totalTools: number;
  providersScanned: number;
  agentToolMappings: Record<string, number>;
  toolsByTag: Record<string, number>;
  toolsByVersion: Record<string, number>;
  composedTools: number;
  universalTools: number;
  failedDiscoveries: Array<{
    providerName: string;
    error: string;
    timestamp: Date;
  }>;
}

/**
 * Tool discovery configuration options
 */
export interface ToolDiscoveryOptions {
  /** Whether to enable automatic discovery on module init */
  autoDiscover?: boolean;
  /** Whether to validate tool schemas during discovery */
  validateSchemas?: boolean;
  /** Maximum number of providers to scan concurrently */
  maxConcurrency?: number;
  /** Tags to filter tools during discovery */
  includeOnlyTags?: string[];
  /** Tags to exclude during discovery */
  excludeTags?: string[];
  /** Whether to discover composed tools */
  discoverComposedTools?: boolean;
  /** Whether to log detailed discovery information */
  verbose?: boolean;
}

/**
 * Tool discovery result for a single provider
 */
interface ProviderDiscoveryResult {
  providerName: string;
  toolsFound: ToolMetadata[];
  errors: string[];
  scanTime: number;
}

/**
 * Enhanced tool discovery service that extends the basic autodiscovery
 * capabilities of ToolRegistryService with additional features
 */
@Injectable()
export class ToolDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ToolDiscoveryService.name);
  private discoveryStats: ToolDiscoveryStats = {
    totalTools: 0,
    providersScanned: 0,
    agentToolMappings: {},
    toolsByTag: {},
    toolsByVersion: {},
    composedTools: 0,
    universalTools: 0,
    failedDiscoveries: [],
  };
  private discoveryOptions: ToolDiscoveryOptions = {
    autoDiscover: true,
    validateSchemas: true,
    maxConcurrency: 10,
    discoverComposedTools: true,
    verbose: false,
  };

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly toolRegistry: ToolRegistryService,
    private readonly metadataProcessor: MetadataProcessorService
  ) {}

  async onModuleInit() {
    if (this.discoveryOptions.autoDiscover) {
      await this.performFullDiscovery();
    }
  }

  /**
   * Configure tool discovery options
   */
  configure(options: Partial<ToolDiscoveryOptions>): void {
    this.discoveryOptions = { ...this.discoveryOptions, ...options };
    this.logger.debug('Tool discovery configured', this.discoveryOptions);
  }

  /**
   * Perform a comprehensive tool discovery scan
   */
  async performFullDiscovery(): Promise<ToolDiscoveryStats> {
    const startTime = Date.now();
    this.logger.log('Starting comprehensive tool discovery');

    try {
      // Reset stats
      this.resetDiscoveryStats();

      // Discover tools from all providers
      const discoveryResults = await this.discoverFromAllProviders();

      // Process discovery results
      await this.processDiscoveryResults(discoveryResults);

      // Build agent tool mappings
      await this.buildAgentToolMappings();

      // Generate statistics
      this.generateDiscoveryStats();

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `Tool discovery completed in ${totalTime}ms: ` +
          `${this.discoveryStats.totalTools} tools from ${this.discoveryStats.providersScanned} providers`
      );

      return { ...this.discoveryStats };
    } catch (error) {
      this.logger.error('Full discovery failed:', error);
      throw error;
    }
  }

  /**
   * Discover tools from a specific provider class
   */
  async discoverFromProvider(
    providerClass: any
  ): Promise<ProviderDiscoveryResult> {
    const startTime = Date.now();
    const providerName = providerClass.name;

    this.logger.debug(`Discovering tools from provider: ${providerName}`);

    try {
      // Get provider instance
      let providerInstance: any;
      try {
        providerInstance = await this.moduleRef.get(providerClass, {
          strict: false,
        });
      } catch (error) {
        // If provider is not injectable, try to create instance
        providerInstance = new providerClass();
      }

      // Get tools from class metadata
      const toolsMetadata = getClassTools(providerClass);

      // Validate and filter tools
      const validTools: ToolMetadata[] = [];
      const errors: string[] = [];

      for (const toolMeta of toolsMetadata) {
        try {
          // Validate tool metadata
          await this.validateToolMetadata(toolMeta, providerInstance);

          // Apply filters
          if (this.shouldIncludeTool(toolMeta)) {
            validTools.push(toolMeta);
          }
        } catch (error) {
          const errorMsg = `Tool ${toolMeta.name} validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
          this.logger.warn(errorMsg);
        }
      }

      const scanTime = Date.now() - startTime;

      if (this.discoveryOptions.verbose) {
        this.logger.debug(
          `Provider ${providerName}: ${validTools.length} valid tools, ` +
            `${errors.length} errors, ${scanTime}ms`
        );
      }

      return {
        providerName,
        toolsFound: validTools,
        errors,
        scanTime,
      };
    } catch (error) {
      const scanTime = Date.now() - startTime;
      const errorMsg = `Failed to discover from ${providerName}: ${
        error instanceof Error ? error.message : String(error)
      }`;

      this.logger.error(errorMsg, error);

      return {
        providerName,
        toolsFound: [],
        errors: [errorMsg],
        scanTime,
      };
    }
  }

  /**
   * Discover tools by specific criteria
   */
  async discoverByTag(tags: string[]): Promise<ToolMetadata[]> {
    this.logger.debug(`Discovering tools by tags: ${tags.join(', ')}`);

    const allTools = this.toolRegistry.getAllTools();
    const matchingTools: ToolMetadata[] = [];

    for (const tool of allTools) {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (metadata?.tags?.some((tag) => tags.includes(tag))) {
        matchingTools.push(metadata);
      }
    }

    this.logger.debug(
      `Found ${matchingTools.length} tools matching tags: ${tags.join(', ')}`
    );
    return matchingTools;
  }

  /**
   * Discover tools available for specific agents
   */
  async discoverForAgent(
    agentType: AgentType | string
  ): Promise<ToolMetadata[]> {
    this.logger.debug(`Discovering tools for agent: ${agentType}`);

    const tools = this.toolRegistry.getToolsForAgent(agentType);
    const toolsMetadata: ToolMetadata[] = [];

    for (const tool of tools) {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (metadata) {
        toolsMetadata.push(metadata);
      }
    }

    this.logger.debug(
      `Found ${toolsMetadata.length} tools for agent: ${agentType}`
    );
    return toolsMetadata;
  }

  /**
   * Analyze tool dependencies and relationships
   */
  async analyzeToolDependencies(): Promise<{
    dependencies: Record<string, string[]>;
    conflicts: Array<{ tool1: string; tool2: string; reason: string }>;
    orphanedTools: string[];
    composedToolChains: Array<{ parentTool: string; componentTools: string[] }>;
  }> {
    this.logger.debug('Analyzing tool dependencies and relationships');

    const allTools = this.toolRegistry.getAllTools();
    const dependencies: Record<string, string[]> = {};
    const conflicts: Array<{ tool1: string; tool2: string; reason: string }> =
      [];
    const orphanedTools: string[] = [];
    const composedToolChains: Array<{
      parentTool: string;
      componentTools: string[];
    }> = [];

    // Analyze each tool
    for (const tool of allTools) {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (!metadata) continue;

      // Check for composed tools
      if (metadata.tags?.includes('composed')) {
        const componentTools = this.extractComponentTools(metadata);
        if (componentTools.length > 0) {
          composedToolChains.push({
            parentTool: tool.name,
            componentTools,
          });
          dependencies[tool.name] = componentTools;
        }
      }

      // Check for potential conflicts (same name, different schemas)
      for (const otherTool of allTools) {
        if (tool.name === otherTool.name && tool !== otherTool) {
          conflicts.push({
            tool1: tool.name,
            tool2: otherTool.name,
            reason: 'Duplicate tool names',
          });
        }
      }

      // Check for orphaned tools (tools with no assigned agents)
      const agents = metadata.agents;
      if (!agents || (Array.isArray(agents) && agents.length === 0)) {
        orphanedTools.push(tool.name);
      }
    }

    const analysis = {
      dependencies,
      conflicts,
      orphanedTools,
      composedToolChains,
    };

    this.logger.debug(
      `Tool dependency analysis complete: ` +
        `${Object.keys(dependencies).length} dependencies, ` +
        `${conflicts.length} conflicts, ` +
        `${orphanedTools.length} orphaned tools, ` +
        `${composedToolChains.length} composed tool chains`
    );

    return analysis;
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): ToolDiscoveryStats {
    return { ...this.discoveryStats };
  }

  /**
   * Refresh tool discovery for a specific provider
   */
  async refreshProvider(providerClass: any): Promise<void> {
    this.logger.debug(`Refreshing tools from provider: ${providerClass.name}`);

    try {
      // Remove existing tools from this provider
      await this.removeProviderTools(providerClass);

      // Rediscover tools
      const result = await this.discoverFromProvider(providerClass);

      // Register discovered tools
      for (const toolMeta of result.toolsFound) {
        const instance = await this.moduleRef.get(providerClass, {
          strict: false,
        });
        await this.registerToolWithRegistry(toolMeta, instance);
      }

      this.logger.log(
        `Refreshed ${result.toolsFound.length} tools from ${providerClass.name}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh provider ${providerClass.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate tool configuration and schema
   */
  async validateToolConfiguration(): Promise<{
    valid: string[];
    invalid: Array<{ toolName: string; errors: string[] }>;
  }> {
    this.logger.debug('Validating tool configurations');

    const valid: string[] = [];
    const invalid: Array<{ toolName: string; errors: string[] }> = [];

    const allTools = this.toolRegistry.getAllTools();

    for (const tool of allTools) {
      const errors: string[] = [];

      try {
        // Validate tool name
        if (!tool.name || tool.name.trim().length === 0) {
          errors.push('Tool name is required');
        }

        // Validate description
        if (!tool.description || tool.description.trim().length === 0) {
          errors.push('Tool description is required');
        }

        // Validate schema if present
        const metadata = this.toolRegistry.getToolMetadata(tool.name);
        if (metadata?.schema) {
          try {
            // Test schema with empty object
            metadata.schema.parse({});
          } catch (schemaError) {
            // This is expected for required fields, just check it's a valid Zod schema
            if (!(schemaError instanceof z.ZodError)) {
              errors.push(`Invalid Zod schema: ${schemaError}`);
            }
          }
        }

        // Validate agent assignments
        if (metadata?.agents && Array.isArray(metadata.agents)) {
          const validAgentTypes = Object.values(AgentType);
          for (const agent of metadata.agents) {
            if (!validAgentTypes.includes(agent as AgentType)) {
              errors.push(`Invalid agent type: ${agent}`);
            }
          }
        }

        if (errors.length === 0) {
          valid.push(tool.name);
        } else {
          invalid.push({ toolName: tool.name, errors });
        }
      } catch (error) {
        invalid.push({
          toolName: tool.name,
          errors: [
            `Validation error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        });
      }
    }

    this.logger.debug(
      `Tool validation complete: ${valid.length} valid, ${invalid.length} invalid`
    );
    return { valid, invalid };
  }

  /**
   * Get detailed tool information for debugging
   */
  getToolDetails(toolName: string): {
    tool: DynamicStructuredTool | null;
    metadata: ToolMetadata | null;
    agentAssignments: string[];
    usageStats?: {
      callCount: number;
      averageExecutionTime: number;
      lastUsed: Date;
    };
  } | null {
    const tool = this.toolRegistry.getTool(toolName);
    const metadata = this.toolRegistry.getToolMetadata(toolName);

    if (!tool || !metadata) {
      return null;
    }

    // Find which agents have access to this tool
    const agentAssignments: string[] = [];
    if (metadata.agents === '*') {
      agentAssignments.push('*');
    } else if (Array.isArray(metadata.agents)) {
      agentAssignments.push(...metadata.agents);
    }

    return {
      tool,
      metadata,
      agentAssignments,
      // Usage stats would be populated by a monitoring service
      usageStats: undefined,
    };
  }

  // Private helper methods

  private async discoverFromAllProviders(): Promise<ProviderDiscoveryResult[]> {
    const providers = this.discoveryService.getProviders();
    const results: ProviderDiscoveryResult[] = [];

    // Process providers in batches to respect concurrency limits
    const batchSize = this.discoveryOptions.maxConcurrency || 10;

    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((wrapper) => {
          if (wrapper.instance && typeof wrapper.instance === 'object') {
            return this.discoverFromProvider(wrapper.instance.constructor);
          }
          return Promise.resolve({
            providerName: 'unknown',
            toolsFound: [],
            errors: ['No valid instance'],
            scanTime: 0,
          });
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error('Provider discovery failed:', result.reason);
        }
      }
    }

    return results;
  }

  private async processDiscoveryResults(
    results: ProviderDiscoveryResult[]
  ): Promise<void> {
    for (const result of results) {
      this.discoveryStats.providersScanned++;

      // Track failed discoveries
      for (const error of result.errors) {
        this.discoveryStats.failedDiscoveries.push({
          providerName: result.providerName,
          error,
          timestamp: new Date(),
        });
      }

      // Register tools
      for (const toolMeta of result.toolsFound) {
        try {
          const instance = await this.moduleRef.get(toolMeta.className as any, {
            strict: false,
          });
          await this.registerToolWithRegistry(toolMeta, instance);
        } catch (error) {
          this.logger.warn(`Failed to register tool ${toolMeta.name}:`, error);
        }
      }
    }
  }

  private async buildAgentToolMappings(): Promise<void> {
    const agents = Object.values(AgentType);

    for (const agent of agents) {
      const tools = this.toolRegistry.getToolsForAgent(agent);
      this.discoveryStats.agentToolMappings[agent] = tools.length;
    }

    // Count universal tools
    const universalTools = this.toolRegistry.getToolsForAgent('*');
    this.discoveryStats.universalTools = universalTools.length;
  }

  private generateDiscoveryStats(): void {
    const allTools = this.toolRegistry.getAllTools();
    this.discoveryStats.totalTools = allTools.length;

    // Count by tags and versions
    for (const tool of allTools) {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (metadata) {
        // Count by tags
        if (metadata.tags) {
          for (const tag of metadata.tags) {
            this.discoveryStats.toolsByTag[tag] =
              (this.discoveryStats.toolsByTag[tag] || 0) + 1;
          }
        }

        // Count by version
        const version = metadata.version || 'unknown';
        this.discoveryStats.toolsByVersion[version] =
          (this.discoveryStats.toolsByVersion[version] || 0) + 1;

        // Count composed tools
        if (metadata.tags?.includes('composed')) {
          this.discoveryStats.composedTools++;
        }
      }
    }
  }

  private resetDiscoveryStats(): void {
    this.discoveryStats = {
      totalTools: 0,
      providersScanned: 0,
      agentToolMappings: {},
      toolsByTag: {},
      toolsByVersion: {},
      composedTools: 0,
      universalTools: 0,
      failedDiscoveries: [],
    };
  }

  private async validateToolMetadata(
    toolMeta: ToolMetadata,
    instance: any
  ): Promise<void> {
    if (!this.discoveryOptions.validateSchemas) {
      return;
    }

    // Validate required fields
    if (!toolMeta.name || toolMeta.name.trim().length === 0) {
      throw new Error('Tool name is required');
    }

    if (!toolMeta.description || toolMeta.description.trim().length === 0) {
      throw new Error('Tool description is required');
    }

    // Validate method exists
    if (!instance[toolMeta.methodName]) {
      throw new Error(`Method ${toolMeta.methodName} not found on instance`);
    }

    // Validate schema if present
    if (toolMeta.schema) {
      try {
        // Try to validate with empty object to check schema validity
        toolMeta.schema.parse({});
      } catch (error) {
        // ZodError is expected for required fields, other errors are problems
        if (!(error instanceof z.ZodError)) {
          throw new Error(`Invalid Zod schema: ${error}`);
        }
      }
    }
  }

  private shouldIncludeTool(toolMeta: ToolMetadata): boolean {
    // Filter by included tags
    if (this.discoveryOptions.includeOnlyTags) {
      const hasIncludedTag = toolMeta.tags?.some((tag) =>
        this.discoveryOptions.includeOnlyTags!.includes(tag)
      );
      if (!hasIncludedTag) {
        return false;
      }
    }

    // Filter by excluded tags
    if (this.discoveryOptions.excludeTags) {
      const hasExcludedTag = toolMeta.tags?.some((tag) =>
        this.discoveryOptions.excludeTags!.includes(tag)
      );
      if (hasExcludedTag) {
        return false;
      }
    }

    // Filter composed tools
    if (
      !this.discoveryOptions.discoverComposedTools &&
      toolMeta.tags?.includes('composed')
    ) {
      return false;
    }

    return true;
  }

  private extractComponentTools(metadata: ToolMetadata): string[] {
    // For composed tools, component tools might be stored in metadata
    // This would be enhanced based on the actual ComposedTool implementation
    return []; // Placeholder
  }

  private async removeProviderTools(providerClass: any): Promise<void> {
    const allTools = this.toolRegistry.getAllTools();

    for (const tool of allTools) {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (metadata?.className === providerClass.name) {
        this.toolRegistry.removeTool(tool.name);
      }
    }
  }

  private async registerToolWithRegistry(
    metadata: ToolMetadata,
    instance: any
  ): Promise<void> {
    // The ToolRegistryService handles the actual registration logic
    // This is a placeholder for any additional processing needed
  }
}
