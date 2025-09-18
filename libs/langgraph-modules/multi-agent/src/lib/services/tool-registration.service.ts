import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getClassTools } from '../decorators/tool.decorator';
import { ToolRegistryService } from '../tools/tool-registry.service';
import type { ToolProvider } from '../interfaces/multi-agent.interface';

/**
 * Service for explicit tool registration (replaces ToolDiscoveryService)
 *
 * This service handles compile-time safe registration of tool providers
 * without runtime discovery overhead or module context issues.
 */
@Injectable()
export class ToolRegistrationService {
  private readonly logger = new Logger(ToolRegistrationService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly toolRegistry: ToolRegistryService
  ) {}

  /**
   * Register tools from explicitly provided tool providers
   */
  async registerTools(toolProviders: ToolProvider[]): Promise<void> {
    if (!toolProviders || toolProviders.length === 0) {
      this.logger.debug('No tool providers to register');
      return;
    }

    this.logger.log(`Registering ${toolProviders.length} tool providers`);

    for (const ToolClass of toolProviders) {
      try {
        await this.registerToolProvider(ToolClass);
      } catch (error) {
        this.logger.error(
          `Failed to register tool provider ${ToolClass.name}:`,
          error
        );
        throw error;
      }
    }

    this.logger.log(
      `Successfully registered ${toolProviders.length} tool providers`
    );
  }

  /**
   * Register a single tool provider
   */
  private async registerToolProvider(ToolClass: ToolProvider): Promise<void> {
    const className = ToolClass.name;

    // Get tool metadata from decorator
    const toolMetadata = getClassTools(ToolClass);

    if (toolMetadata.length === 0) {
      this.logger.warn(
        `Tool provider ${className} has no @Tool decorated methods`
      );
      return;
    }

    // Get provider instance from module context
    let instance: any;
    try {
      instance = await this.moduleRef.get(ToolClass, { strict: false });
    } catch (error) {
      throw new Error(
        `Failed to get instance of tool provider ${className}. ` +
          `Ensure it's registered as a provider in the module. Error: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    }

    // Register each tool from the provider
    for (const toolMeta of toolMetadata) {
      try {
        await this.toolRegistry.registerToolFromMetadata(toolMeta, instance);

        this.logger.debug(
          `Registered tool: ${toolMeta.name} from ${className}.${toolMeta.methodName}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to register tool ${toolMeta.name} from ${className}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Get registration statistics
   */
  getRegistrationStats() {
    const allTools = this.toolRegistry.getAllTools();
    const toolsByProvider = new Map<string, number>();

    for (const tool of allTools) {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (metadata?.className) {
        const count = toolsByProvider.get(metadata.className) || 0;
        toolsByProvider.set(metadata.className, count + 1);
      }
    }

    return {
      totalTools: allTools.length,
      totalProviders: toolsByProvider.size,
      toolsByProvider: Object.fromEntries(toolsByProvider),
    };
  }
}
