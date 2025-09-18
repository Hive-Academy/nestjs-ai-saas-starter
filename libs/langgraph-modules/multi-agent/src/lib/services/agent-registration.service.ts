import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getAgentConfig } from '../decorators/agent.decorator';
import { AgentRegistryService } from './agent-registry.service';
import type {
  AgentProvider,
  AgentDefinition,
} from '../interfaces/multi-agent.interface';

/**
 * Service for explicit agent registration (similar to ToolRegistrationService)
 *
 * This service handles compile-time safe registration of agent providers
 * without runtime discovery overhead or module context issues.
 */
@Injectable()
export class AgentRegistrationService {
  private readonly logger = new Logger(AgentRegistrationService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly agentRegistry: AgentRegistryService
  ) {}

  /**
   * Register agents from explicitly provided agent providers
   */
  async registerAgents(agentProviders: AgentProvider[]): Promise<void> {
    if (!agentProviders || agentProviders.length === 0) {
      this.logger.debug('No agent providers to register');
      return;
    }

    this.logger.log(`Registering ${agentProviders.length} agent providers`);

    for (const AgentClass of agentProviders) {
      try {
        await this.registerAgentProvider(AgentClass);
      } catch (error) {
        this.logger.error(
          `Failed to register agent provider ${AgentClass.name}:`,
          error
        );
        throw error;
      }
    }

    this.logger.log(
      `Successfully registered ${agentProviders.length} agent providers`
    );
  }

  /**
   * Register a single agent provider
   */
  private async registerAgentProvider(
    AgentClass: AgentProvider
  ): Promise<void> {
    const className = AgentClass.name;

    // Get agent metadata from decorator
    const agentConfig = getAgentConfig(AgentClass);

    if (!agentConfig) {
      this.logger.warn(`Agent provider ${className} has no @Agent decorator`);
      return;
    }

    // Get provider instance from module context
    let instance: any;
    try {
      instance = await this.moduleRef.get(AgentClass, { strict: false });
    } catch (error) {
      throw new Error(
        `Failed to get instance of agent provider ${className}. ` +
          `Ensure it's registered as a provider in the module. Error: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    }

    // Verify the agent has a nodeFunction method
    if (typeof instance.nodeFunction !== 'function') {
      throw new Error(
        `Agent ${className} must implement a nodeFunction method. ` +
          `This method should have the signature: async nodeFunction(state: AgentState): Promise<Partial<AgentState>>`
      );
    }

    // Create agent definition
    const agentDefinition: AgentDefinition = {
      id: agentConfig.id,
      name: agentConfig.name,
      description: agentConfig.description,
      nodeFunction: instance.nodeFunction.bind(instance),
      capabilities: agentConfig.capabilities,
      metadata: {
        ...agentConfig.metadata,
        className,
        systemPrompt: agentConfig.systemPrompt,
        tools: agentConfig.tools,
        priority: agentConfig.priority,
        executionTime: agentConfig.executionTime,
        outputFormat: agentConfig.outputFormat,
      },
    };

    // Register with the agent registry
    this.agentRegistry.registerAgent(agentDefinition);

    this.logger.debug(
      `Registered agent: ${agentConfig.id} (${agentConfig.name}) from ${className}`
    );
  }

  /**
   * Get registration statistics
   */
  getRegistrationStats(): { totalAgents: number; totalProviders: number } {
    const agents = this.agentRegistry.getAllAgents();
    return {
      totalAgents: agents.length,
      totalProviders: agents.length, // In this implementation, each agent is from a unique provider
    };
  }
}
