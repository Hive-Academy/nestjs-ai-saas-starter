import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { MULTI_AGENT_MODULE_OPTIONS } from '../constants/multi-agent.constants';
import type { MultiAgentModuleOptions } from '../interfaces/multi-agent.interface';
import { ToolRegistrationService } from './tool-registration.service';
import { AgentRegistrationService } from './agent-registration.service';

/**
 * Service responsible for initializing the MultiAgent module
 * Handles explicit registration of tools, workflows, and agents
 */
@Injectable()
export class MultiAgentModuleInitializer implements OnModuleInit {
  private readonly logger = new Logger(MultiAgentModuleInitializer.name);

  constructor(
    @Inject(MULTI_AGENT_MODULE_OPTIONS)
    private readonly options: MultiAgentModuleOptions,
    private readonly toolRegistrationService: ToolRegistrationService,
    private readonly agentRegistrationService: AgentRegistrationService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Initializing MultiAgent module with explicit registration'
    );

    try {
      // Register tools if provided
      if (this.options.tools && this.options.tools.length > 0) {
        await this.toolRegistrationService.registerTools(this.options.tools);
        const stats = this.toolRegistrationService.getRegistrationStats();
        this.logger.log(
          `Registered ${stats.totalTools} tools from ${stats.totalProviders} providers`
        );
      } else {
        this.logger.debug('No tools provided for registration');
      }

      // Register agents if provided
      if (this.options.agents && this.options.agents.length > 0) {
        await this.agentRegistrationService.registerAgents(this.options.agents);
        const stats = this.agentRegistrationService.getRegistrationStats();
        this.logger.log(
          `Registered ${stats.totalAgents} agents from ${stats.totalProviders} providers`
        );
      } else {
        this.logger.debug('No agents provided for registration');
      }

      // TODO: Register workflows when workflow system is implemented
      if (this.options.workflows && this.options.workflows.length > 0) {
        this.logger.debug(
          `${this.options.workflows.length} workflows provided (registration not implemented yet)`
        );
      }

      this.logger.log(
        'MultiAgent module initialization completed successfully'
      );
    } catch (error) {
      this.logger.error('Failed to initialize MultiAgent module:', error);
      throw error;
    }
  }
}
