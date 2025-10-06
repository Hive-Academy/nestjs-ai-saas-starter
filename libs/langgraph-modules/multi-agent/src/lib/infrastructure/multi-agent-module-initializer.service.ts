import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { MULTI_AGENT_MODULE_OPTIONS } from '../constants/multi-agent.constants';
import type { MultiAgentModuleOptions } from '../interfaces/multi-agent.interface';
import { ToolRegistrationService } from '../tools/tool-registration.service';
import { AgentRegistrationService } from '../agent/agent-registration.service';
import { WorkflowManagerService } from '../workflow/workflow-manager.service';

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
    private readonly agentRegistrationService: AgentRegistrationService,
    private readonly workflowManagerService: WorkflowManagerService
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

      // Register workflows if provided
      if (this.options.workflows && this.options.workflows.length > 0) {
        this.workflowManagerService.registerWorkflowProviders(
          this.options.workflows
        );
        const stats = this.workflowManagerService.getWorkflowStats();
        this.logger.log(
          `Registered ${stats.registry.totalWorkflows} workflows`
        );
      } else {
        this.logger.debug('No workflows provided for registration');
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
